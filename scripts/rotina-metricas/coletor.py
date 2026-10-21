#!/usr/bin/env python3
"""Coleta as métricas diárias do Instagram e grava no Relatório.

Roda na sessão agendada, que não tem o repositório clonado — por isso este
arquivo é copiado INTEIRO para dentro do prompt da rotina por
`scripts/gerar-prompt-metricas.mjs`. Edite aqui, nunca lá: o prompt é gerado.

Só a biblioteca padrão. A credencial da InsightfulPipe não aparece aqui: quem
a guarda é a CLI, já autenticada pelo passo anterior do prompt.

Três séries saem daqui, e elas respondem perguntas diferentes:

- o DIA (alcance, views, salvamentos, interações…), que diz como foi o dia;
- GANHOS e PERDAS de seguidores, separados, porque ganho bruto não é
  crescimento — dá para ganhar 154 num mês e crescer 72;
- a PUBLICAÇÃO, uma linha por post, que é o que liga um pico de alcance ao
  conteúdo que o causou.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

# A marca do Raphael. O workspace tem outra marca, com contas de terceiros —
# filtrar por aqui é o que garante que a coleta nunca as toque.
MARCA = int(os.environ.get("BRAND_ID", "6366"))

# Quantos dias repuxar a cada corrida. Mais que um porque o número do dia
# anterior ainda muda depois da meia-noite: a Meta fecha a janela com atraso, e
# quem grava só "ontem" congela um valor provisório para sempre.
DIAS = int(os.environ.get("DIAS", "7"))

# Limite da Meta para insights de conta.
MAX_DIAS = 30

# Brasília. Fixo em -3 de propósito: o Brasil não tem horário de verão desde
# 2019, e é este fuso que decide a que DIA um post das 22h pertence.
BRT = timezone(timedelta(hours=-3))

URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]
TOKEN = os.environ["INGESTAO_TOKEN"]

# Métricas de conta que só existem como total de um intervalo: um pedido por
# dia. `saves` entrou aqui — a conta responde por ele, e era o número que
# faltava no painel (a coluna existia e vinha sempre vazia).
METRICAS_DO_DIA = [
    "views",
    "likes",
    "comments",
    "shares",
    "total_interactions",
    "profile_links_taps",
    "saves",
]

# Nome na API da Meta -> coluna da tabela.
COLUNA = {
    "reach": "alcance",
    "views": "views",
    "likes": "likes",
    "comments": "comentarios",
    "shares": "compartilhamentos",
    "saves": "salvamentos",
    "total_interactions": "interacoes",
    "profile_links_taps": "cliques_no_link",
}

# Métricas de uma publicação. No nível da mídia o salvamento se chama `saved`,
# no nível da conta `saves`. Uma letra, duas APIs.
METRICAS_DA_MIDIA = [
    "reach",
    "likes",
    "comments",
    "shares",
    "saved",
    "total_interactions",
    "views",
]

COLUNA_DA_MIDIA = {
    "reach": "alcance",
    "views": "views",
    "likes": "likes",
    "comments": "comentarios",
    "shares": "compartilhamentos",
    "saved": "salvamentos",
    "total_interactions": "interacoes",
}


def cli(args):
    saida = subprocess.run(
        ["insightfulpipe", *args], capture_output=True, text=True, timeout=180
    )
    if saida.returncode != 0:
        raise SystemExit(f"CLI falhou: {saida.stderr.strip()[:400]}")
    resposta = json.loads(saida.stdout)
    if resposta.get("status") != "success":
        raise SystemExit(f"CLI respondeu erro: {json.dumps(resposta)[:400]}")
    return resposta


def consultar(corpo):
    """Leitura. `action` (escrita) não existe neste arquivo, de propósito."""
    return cli(["query", "instagram", "-b", json.dumps(corpo)])


def tentar(corpo):
    """Como `consultar`, mas devolve None em vez de abortar a corrida.

    Serve para o que é por publicação: uma mídia que a Meta recusa (story
    expirado, post apagado no meio da coleta) não pode derrubar o dia inteiro.
    """
    saida = subprocess.run(
        ["insightfulpipe", "query", "instagram", "-b", json.dumps(corpo)],
        capture_output=True,
        text=True,
        timeout=180,
    )
    try:
        resposta = json.loads(saida.stdout)
    except json.JSONDecodeError:
        return None
    return resposta.get("data") if resposta.get("status") == "success" else None


def rpc(funcao, corpo, opcional=False):
    """Chama uma função do Supabase.

    `opcional=True` serve ao que depende de uma migração que pode ainda não ter
    rodado: a função não existir vira AVISO, não fim de corrida. Sem isso, o dia
    de métrica — que já foi gravado — seria perdido porque a tabela nova de
    publicações não existe ainda.
    """
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
        detalhe = erro.read().decode()[:300]
        if opcional and ("PGRST202" in detalhe or erro.code == 404):
            print(
                f"AVISO: {funcao} não existe no banco — rode "
                f"supabase/relatorio-publicacoes.sql. Nada foi perdido do resto.",
                file=sys.stderr,
            )
            return None
        raise SystemExit(f"Supabase recusou ({erro.code}): {detalhe}")


def dia_em_brasilia(carimbo: str) -> str:
    """'2026-10-20T23:40:00+0000' -> '2026-10-20' (20h40 em Brasília).

    Cortar os dez primeiros caracteres do UTC parece igual e não é: um post das
    22h de Brasília é 01h do dia seguinte em UTC, e cairia no dia errado do
    gráfico. Ele publica à noite — então esse erro aconteceria quase sempre.
    """
    texto = carimbo.replace("Z", "+00:00")
    # A Meta manda +0000; fromisoformat só aceita +00:00 antes do 3.11.
    if len(texto) >= 5 and texto[-5] in "+-" and ":" not in texto[-5:]:
        texto = f"{texto[:-2]}:{texto[-2:]}"
    return datetime.fromisoformat(texto).astimezone(BRT).date().isoformat()


def seguidores_do_dia(base, dia):
    """Quantos seguiram e quantos deixaram de seguir, no dia.

    `follows_and_unfollows` com `breakdown=follow_type` devolve FOLLOWER e
    NON_FOLLOWER. Conferido contra `follower_count` em 12 dias seguidos:
    FOLLOWER bate exatamente, dia a dia — e, diferente de `follower_count`,
    este responde para muito antes dos últimos 30 dias, o que é o que permite
    preencher o histórico para trás.
    """
    dados = tentar(
        {
            **base,
            "action": "get_account_insights",
            "metrics": ["follows_and_unfollows"],
            "period": "day",
            "metric_type": "total_value",
            "breakdown": "follow_type",
            "since": dia.isoformat(),
            "until": (dia + timedelta(days=1)).isoformat(),
        }
    )
    if not dados:
        return None, None
    total = dados[0].get("total_value") or {}
    ganhos = perdidos = None
    for grupo in total.get("breakdowns", []):
        for resultado in grupo.get("results", []):
            valores = resultado.get("dimension_values") or []
            if valores[:1] == ["FOLLOWER"]:
                ganhos = resultado.get("value")
            elif valores[:1] == ["NON_FOLLOWER"]:
                perdidos = resultado.get("value")
    return ganhos, perdidos


def publicacoes_do_periodo(base, de, ate, com_metricas=True):
    """Uma linha por publicação, com as métricas dela."""
    midias = consultar(
        {
            **base,
            "action": "get_media",
            "fields": [
                "id",
                "timestamp",
                "media_type",
                "media_product_type",
                "caption",
                "permalink",
            ],
            "auto_paginate": True,
            "since": de.isoformat(),
            "until": (ate + timedelta(days=1)).isoformat(),
        }
    )["data"]

    linhas = []
    for midia in midias or []:
        carimbo = str(midia.get("timestamp") or "")
        if not carimbo:
            continue
        linha = {
            "midia_id": str(midia["id"]),
            "publicado_em": carimbo,
            "dia": dia_em_brasilia(carimbo),
            "tipo": midia.get("media_type") or "",
            "formato": midia.get("media_product_type") or "",
            # A legenda inteira não serve a ninguém num painel, e o primeiro
            # parágrafo é o gancho — que é justamente o que se quer comparar
            # entre os posts que foram bem e os que não foram.
            "legenda": (midia.get("caption") or "")[:600],
            "permalink": midia.get("permalink") or "",
        }
        if com_metricas:
            insights = tentar(
                {
                    **base,
                    "action": "get_media_insights",
                    "media_id": midia["id"],
                    "metrics": METRICAS_DA_MIDIA,
                }
            )
            for metrica in insights or []:
                coluna = COLUNA_DA_MIDIA.get(metrica.get("name"))
                valores = metrica.get("values") or []
                if coluna and valores:
                    linha[coluna] = valores[0].get("value")
        linhas.append(linha)
    return linhas


def coletar(conta, de, ate):
    base = {
        "platform": "instagram",
        "workspace_id": conta["workspace_id"],
        "brand_id": conta["brand_id"],
        "account_id": conta["account_id"],
        "instagram_account_id": conta["account_id"],
    }

    perfil = consultar(
        {**base, "action": "get_profile", "fields": ["id", "username", "name", "followers_count"]}
    )["data"]

    # Trava de identidade: se o id responder como outra conta, para aqui.
    if perfil["username"] != conta["username"]:
        raise SystemExit(
            f"a conta {conta['account_id']} responde como @{perfil['username']}, "
            f"e não @{conta['username']}. Nada foi coletado."
        )

    por_dia = {}

    def linha(dia):
        return por_dia.setdefault(dia, {"dia": dia})

    # `reach` é o único que interessa em série temporal: um pedido para a
    # janela toda. `until` é exclusivo — para incluir o último dia, pede-se o
    # seguinte.
    serie = consultar(
        {
            **base,
            "action": "get_account_insights",
            "metrics": ["reach"],
            "period": "day",
            "metric_type": "time_series",
            "since": de.isoformat(),
            "until": (ate + timedelta(days=1)).isoformat(),
        }
    )["data"]
    for metrica in serie:
        for ponto in metrica.get("values", []):
            linha(ponto["end_time"][:10])[COLUNA[metrica["name"]]] = ponto["value"]

    # O resto só vem como total de um intervalo: dois pedidos por dia — um para
    # as métricas de conteúdo, outro para seguidores (o breakdown não convive
    # com as outras métricas no mesmo pedido).
    dia = de
    while dia <= ate:
        totais = consultar(
            {
                **base,
                "action": "get_account_insights",
                "metrics": METRICAS_DO_DIA,
                "period": "day",
                "metric_type": "total_value",
                "since": dia.isoformat(),
                "until": (dia + timedelta(days=1)).isoformat(),
            }
        )["data"]
        for metrica in totais:
            valor = (metrica.get("total_value") or {}).get("value")
            linha(dia.isoformat())[COLUNA[metrica["name"]]] = valor

        ganhos, perdidos = seguidores_do_dia(base, dia)
        linha(dia.isoformat())["seguidores_ganhos"] = ganhos
        linha(dia.isoformat())["seguidores_perdidos"] = perdidos
        dia += timedelta(days=1)

    publicacoes = publicacoes_do_periodo(base, de, ate)
    contagem = {}
    for pub in publicacoes:
        contagem[pub["dia"]] = contagem.get(pub["dia"], 0) + 1
    for d, valores in por_dia.items():
        # A lista do período é completa, então dia sem publicação é zero de
        # verdade — e não "não sei".
        valores["publicacoes"] = contagem.get(d, 0)

    # O TOTAL de seguidores só existe para agora: a API não dá histórico dele.
    # Entra uma vez, no último dia. Repetir nos outros seria inventar linha reta.
    ultimo = ate.isoformat()
    if ultimo in por_dia:
        por_dia[ultimo]["seguidores"] = perfil["followers_count"]

    return perfil, sorted(por_dia.values(), key=lambda x: x["dia"]), publicacoes


def main():
    if DIAS < 1 or DIAS > MAX_DIAS:
        raise SystemExit(f"DIAS precisa estar entre 1 e {MAX_DIAS} (limite da Meta)")

    # Vai até HOJE, não até ontem.
    #
    # A Meta devolve o dia corrente parcial, e é isso que faz valer rodar
    # algumas vezes ao dia: o painel acompanha o dia crescendo em vez de ficar
    # parado até a manhã seguinte. O upsert por (perfil, dia) cuida do resto —
    # a corrida das 19h sobrescreve a das 13h, e a de amanhã fecha o número.
    ate = date.today()
    de = ate - timedelta(days=DIAS - 1)

    contas = [
        c
        for c in cli(["accounts", "--platform", "instagram"])["sources"]
        if c.get("brand_id") == MARCA and c.get("status") == "active"
    ]
    if not contas:
        raise SystemExit(f"nenhuma conta de Instagram ativa na marca {MARCA}")

    resumo = []
    for conta in contas:
        perfil, linhas, publicacoes = coletar(conta, de, ate)
        gravados = rpc(
            "ingerir_metricas",
            {
                "token": TOKEN,
                "rede_do_perfil": "instagram",
                "handle_do_perfil": perfil["username"],
                "nome_do_perfil": perfil.get("name") or "",
                "linhas": linhas,
            },
        )
        # Depois das métricas, sempre: é `ingerir_metricas` que cria o perfil, e
        # `ingerir_publicacoes` recusa publicação de perfil que não existe.
        posts = 0
        if publicacoes:
            posts = rpc(
                "ingerir_publicacoes",
                {
                    "token": TOKEN,
                    "rede_do_perfil": "instagram",
                    "handle_do_perfil": perfil["username"],
                    "linhas": publicacoes,
                },
                opcional=True,
            ) or 0
        alcance = sum(l.get("alcance") or 0 for l in linhas)
        ganhos = sum(l.get("seguidores_ganhos") or 0 for l in linhas)
        perdidos = sum(l.get("seguidores_perdidos") or 0 for l in linhas)
        resumo.append(
            f"@{perfil['username']}: {gravados} dia(s) · {posts} publicação(ões) · "
            f"{perfil['followers_count']} seguidores "
            f"(+{ganhos} / -{perdidos} = {ganhos - perdidos:+d} no período) · "
            f"{alcance} de alcance"
        )

    print(f"{de.isoformat()} a {ate.isoformat()}")
    for linha_resumo in resumo:
        print(linha_resumo)


if __name__ == "__main__":
    sys.exit(main())
