#!/usr/bin/env python3
"""Coleta as métricas diárias do Instagram e grava no Relatório.

Roda na sessão agendada, que não tem o repositório clonado — por isso este
arquivo é copiado INTEIRO para dentro do prompt da rotina por
`scripts/gerar-prompt-metricas.mjs`. Edite aqui, nunca lá: o prompt é gerado.

Só a biblioteca padrão. A credencial da InsightfulPipe não aparece aqui: quem
a guarda é a CLI, já autenticada pelo passo anterior do prompt.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

# A marca do Raphael. O workspace tem outra marca, com contas de terceiros —
# filtrar por aqui é o que garante que a coleta nunca as toque.
MARCA = int(os.environ.get("BRAND_ID", "6366"))

# Quantos dias repuxar a cada corrida. Mais que um porque o número do dia
# anterior ainda muda depois da meia-noite: a Meta fecha a janela com atraso, e
# quem grava só "ontem" congela um valor provisório para sempre.
DIAS = int(os.environ.get("DIAS", "7"))

# Limite da Meta para insights de conta.
MAX_DIAS = 30

URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]
TOKEN = os.environ["INGESTAO_TOKEN"]

METRICAS_DO_DIA = [
    "views",
    "likes",
    "comments",
    "shares",
    "total_interactions",
    "profile_links_taps",
]

# Nome na API da Meta -> coluna da tabela.
COLUNA = {
    "reach": "alcance",
    "follower_count": "seguidores_ganhos",
    "views": "views",
    "likes": "likes",
    "comments": "comentarios",
    "shares": "compartilhamentos",
    "total_interactions": "interacoes",
    "profile_links_taps": "cliques_no_link",
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
        detalhe = erro.read().decode()[:300]
        raise SystemExit(f"Supabase recusou ({erro.code}): {detalhe}")


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

    # `reach` e `follower_count` são os únicos que aceitam série temporal.
    # `until` é exclusivo: para incluir o último dia, pede-se o seguinte.
    serie = consultar(
        {
            **base,
            "action": "get_account_insights",
            "metrics": ["reach", "follower_count"],
            "period": "day",
            "metric_type": "time_series",
            "since": de.isoformat(),
            "until": (ate + timedelta(days=1)).isoformat(),
        }
    )["data"]
    for metrica in serie:
        for ponto in metrica.get("values", []):
            linha(ponto["end_time"][:10])[COLUNA[metrica["name"]]] = ponto["value"]

    # O resto só vem como total de um intervalo: um pedido por dia.
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
        dia += timedelta(days=1)

    # Publicações do período, contadas por dia.
    midias = consultar(
        {
            **base,
            "action": "get_media",
            "fields": ["id", "timestamp"],
            "auto_paginate": True,
            "since": de.isoformat(),
            "until": (ate + timedelta(days=1)).isoformat(),
        }
    )["data"]
    publicadas = {}
    for midia in midias or []:
        d = str(midia.get("timestamp", ""))[:10]
        publicadas[d] = publicadas.get(d, 0) + 1
    for d, valores in por_dia.items():
        # A lista do período é completa, então dia sem publicação é zero de
        # verdade — e não "não sei".
        valores["publicacoes"] = publicadas.get(d, 0)

    # O TOTAL de seguidores só existe para agora: a API não dá histórico dele.
    # Entra uma vez, no último dia. Repetir nos outros seria inventar linha reta.
    ultimo = ate.isoformat()
    if ultimo in por_dia:
        por_dia[ultimo]["seguidores"] = perfil["followers_count"]

    return perfil, sorted(por_dia.values(), key=lambda x: x["dia"])


def main():
    if DIAS < 1 or DIAS > MAX_DIAS:
        raise SystemExit(f"DIAS precisa estar entre 1 e {MAX_DIAS} (limite da Meta)")

    ate = date.today() - timedelta(days=1)
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
        perfil, linhas = coletar(conta, de, ate)
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
        alcance = sum(l.get("alcance") or 0 for l in linhas)
        ganhos = sum(l.get("seguidores_ganhos") or 0 for l in linhas)
        resumo.append(
            f"@{perfil['username']}: {gravados} dia(s) · {perfil['followers_count']} seguidores "
            f"({ganhos:+d} no período) · {alcance} de alcance"
        )

    print(f"{de.isoformat()} a {ate.isoformat()}")
    for linha_resumo in resumo:
        print(linha_resumo)


if __name__ == "__main__":
    sys.exit(main())
