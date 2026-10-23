#!/usr/bin/env python3
"""Publica no Instagram o que está na fila do app e já venceu o horário.

Roda na sessão agendada, que não tem o repositório clonado — por isso este
arquivo é copiado INTEIRO para dentro do prompt da rotina por
`scripts/gerar-prompt-publicacao.mjs`. Edite aqui, nunca lá: o prompt é gerado.

POR QUE ISTO EXISTE. A API do Instagram não agenda: ela monta um container e
publica, as duas coisas imediatas. Não há `scheduled_publish_time`. Então quem
guarda o horário é a tabela `publicacoes_agendadas`, e quem acorda e publica é
este script.

AS TRÊS TRAVAS, e nenhuma delas é decoração:

1. IDENTIDADE. Só a marca 6366 (Swisz) e só o handle que a própria linha da
   fila manda. O workspace tem contas de terceiros; publicar na conta errada
   não tem desfazer.
2. NÃO DUPLICAR. `publicacoes_para_publicar` já devolve a linha marcada como
   `publicando`, numa sentença atômica. Duas corridas sobrepostas: a segunda
   recebe lista vazia. A ferramenta avisa que publicar "makes exactly one POST
   and never retries" — não há repetição automática, mas também não há
   proteção contra chamar duas vezes.
3. JANELA. O que perdeu a hora não vai ao ar de madrugada: vira `falhou` com o
   motivo escrito, antes de qualquer publicação.
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

MARCA = int(os.environ.get("BRAND_ID", "6366"))
ATRASO_MAXIMO_MINUTOS = int(os.environ.get("ATRASO_MAXIMO_MINUTOS", "120"))

URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]
TOKEN = os.environ["INGESTAO_TOKEN"]

# Só monta o container; não publica nada. Serve para a primeira corrida provar
# que a sessão agendada tem permissão de escrita, sem nada ir ao ar.
SO_TESTAR = os.environ.get("SO_TESTAR_PERMISSAO") == "1"

MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
}

# O nome do formato no app -> o `container_kind` da ferramenta.
KIND = {
    "post": "feed",
    "carrossel": "carousel",
    "reels": "reels",
    "story": "story",
}


def cli(args, escrita=False):
    comando = ["insightfulpipe", "action" if escrita else "query", "instagram", *args]
    if escrita:
        comando.append("--yes")
    saida = subprocess.run(comando, capture_output=True, text=True, timeout=300)
    try:
        resposta = json.loads(saida.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(
            f"CLI não devolveu JSON (código {saida.returncode}): "
            f"{(saida.stdout + saida.stderr).strip()[:400]}"
        )
    if resposta.get("status") != "success":
        raise RuntimeError(resposta.get("message") or json.dumps(resposta)[:400])
    return resposta


def contas():
    saida = subprocess.run(
        ["insightfulpipe", "accounts", "--platform", "instagram"],
        capture_output=True, text=True, timeout=120,
    )
    dados = json.loads(saida.stdout)
    return [
        c for c in dados.get("sources", [])
        if c.get("brand_id") == MARCA and c.get("status") == "active"
    ]


def rpc(funcao, corpo):
    pedido = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{funcao}",
        data=json.dumps(corpo).encode(),
        headers={
            "apikey": ANON,
            "Authorization": f"Bearer {ANON}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(pedido, timeout=60) as resposta:
            return json.loads(resposta.read().decode() or "null")
    except urllib.error.HTTPError as erro:
        raise SystemExit(f"Supabase recusou ({erro.code}): {erro.read().decode()[:300]}")


def extensao(url):
    caminho = url.split("?")[0].split("#")[0]
    return caminho.rsplit(".", 1)[-1].lower() if "." in caminho else ""


def tamanho_e_tipo(url):
    """HEAD no arquivo: a Meta exige `size_bytes`, e chutar não é opção.

    O bucket é público, então um HEAD basta — e de quebra prova que a URL
    responde ANTES de montar o container. Mídia inacessível é a falha mais
    comum da publicação por API, e falhar aqui é mais barato.
    """
    pedido = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(pedido, timeout=60) as resposta:
        tamanho = resposta.headers.get("Content-Length")
        tipo = resposta.headers.get("Content-Type")
    if not tamanho:
        raise RuntimeError(f"a URL não informou o tamanho do arquivo: {url}")
    return int(tamanho), (tipo or MIME.get(extensao(url), "application/octet-stream"))


def montar_container(base, midia, kind, legenda=None, filho=False):
    corpo = {**base, "action": "create_media_container", "container_kind": kind}
    tamanho, tipo = tamanho_e_tipo(midia["url"])
    campo = "video_url" if midia["tipo"] == "video" else "image_url"
    corpo[campo] = midia["url"]
    corpo["mime_type"] = tipo
    corpo["size_bytes"] = tamanho
    if filho:
        corpo["is_carousel_item"] = True
    if legenda is not None:
        corpo["caption"] = legenda
    resposta = cli(["-b", json.dumps(corpo)], escrita=True)
    dados = resposta.get("data") or {}
    referencia = dados.get("container_id") or dados.get("id") or dados.get("creation_id")
    if not referencia:
        raise RuntimeError(f"container sem referência na resposta: {json.dumps(dados)[:300]}")
    return referencia


def esperar_ficar_pronto(base, container, tentativas=20, intervalo=6):
    """Vídeo não fica pronto na hora: a Meta transcodifica antes.

    Publicar um container ainda em `IN_PROGRESS` devolve erro e queima a linha
    da fila. Por isso espera — e desiste com o motivo escrito, em vez de
    publicar no escuro.
    """
    ultimo = None
    for _ in range(tentativas):
        resposta = cli([
            "-b", json.dumps({**base, "action": "get_media_container_status", "container_id": container})
        ])
        dados = resposta.get("data") or {}
        ultimo = (dados.get("status_code") or dados.get("status") or "").upper()
        if ultimo in ("FINISHED", "PUBLISHED", "READY"):
            return
        if ultimo in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"a Meta recusou o container: {json.dumps(dados)[:300]}")
        time.sleep(intervalo)
    raise RuntimeError(f"o container não ficou pronto a tempo (último status: {ultimo})")


def publicar(base, linha):
    formato = linha["formato"]
    midias = linha["midias"] or []
    kind = KIND.get(formato)
    if not kind:
        raise RuntimeError(f"formato sem container_kind: {formato}")
    if not midias:
        raise RuntimeError("a linha da fila não tem mídia")

    # Story não leva legenda: a API ignora, e mandar sugere que foi.
    legenda = "" if formato == "story" else (linha.get("legenda") or "")

    if formato == "carrossel":
        filhos = [montar_container(base, m, "feed", filho=True) for m in midias]
        for filho in filhos:
            esperar_ficar_pronto(base, filho)
        container = cli(["-b", json.dumps({
            **base, "action": "create_media_container", "container_kind": kind,
            "children": filhos, "caption": legenda,
        })], escrita=True)
        dados = container.get("data") or {}
        referencia = dados.get("container_id") or dados.get("id") or dados.get("creation_id")
        if not referencia:
            raise RuntimeError(f"carrossel sem referência: {json.dumps(dados)[:300]}")
    else:
        referencia = montar_container(base, midias[0], kind, legenda=legenda)

    esperar_ficar_pronto(base, referencia)

    if SO_TESTAR:
        # O container existe e expira sozinho em 24 h. Nada foi ao ar.
        raise RuntimeError(
            f"TESTE: container {referencia} montado com sucesso, publicação NÃO chamada"
        )

    resposta = cli(["-b", json.dumps({
        **base, "action": "publish_media", "creation_id": referencia,
    })], escrita=True)
    dados = resposta.get("data") or {}
    permalink = dados.get("permalink")
    if not permalink:
        # Publicou mas não devolveu o link: melhor registrar sem prova do que
        # marcar como falha e arriscar alguém republicar o mesmo post.
        permalink = f"https://www.instagram.com/{base['handle']}/"
    return referencia, permalink


def main():
    expiradas = rpc("expirar_publicacoes", {"token": TOKEN, "atraso_maximo_minutos": ATRASO_MAXIMO_MINUTOS})
    fila = rpc("publicacoes_para_publicar", {"token": TOKEN, "atraso_maximo_minutos": ATRASO_MAXIMO_MINUTOS}) or []

    if not fila:
        print(f"Nada para publicar agora." + (f" {expiradas} perderam a janela." if expiradas else ""))
        return

    disponiveis = {c["username"]: c for c in contas()}
    linhas_de_saida = []

    for linha in fila:
        handle = linha["handle"]
        conta = disponiveis.get(handle)
        try:
            # Trava de identidade: se a conta não está na marca 6366, para aqui.
            if not conta:
                raise RuntimeError(
                    f"@{handle} não é uma conta ativa da marca {MARCA}. Nada foi publicado."
                )
            base = {
                "platform": "instagram",
                "workspace_id": conta["workspace_id"],
                "brand_id": conta["brand_id"],
                "account_id": conta["account_id"],
                "instagram_account_id": conta["account_id"],
                "handle": handle,
            }
            perfil = cli(["-b", json.dumps({
                **{k: v for k, v in base.items() if k != "handle"},
                "action": "get_profile", "fields": ["id", "username"],
            })])["data"]
            if perfil["username"] != handle:
                raise RuntimeError(
                    f"a conta responde como @{perfil['username']}, e não @{handle}."
                )

            referencia, permalink = publicar(base, linha)
            rpc("concluir_publicacao", {
                "token": TOKEN, "publicacao": linha["id"], "novo_status": "publicada",
                "creation": referencia, "link": permalink,
            })
            linhas_de_saida.append(f"PUBLICADO {linha['formato']} em @{handle} — {permalink}")
        except Exception as erro:  # noqa: BLE001 — a falha de um post não derruba a fila
            mensagem = str(erro)[:400]
            rpc("concluir_publicacao", {
                "token": TOKEN, "publicacao": linha["id"], "novo_status": "falhou",
                "mensagem_de_erro": mensagem,
            })
            linhas_de_saida.append(f"FALHOU {linha['formato']} em @{handle} — {mensagem}")

    if expiradas:
        linhas_de_saida.append(f"{expiradas} perderam a janela de {ATRASO_MAXIMO_MINUTOS} min.")
    for saida in linhas_de_saida:
        print(saida)


if __name__ == "__main__":
    sys.exit(main())
