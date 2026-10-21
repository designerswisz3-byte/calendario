#!/usr/bin/env python3
"""Traz o histórico do Instagram para o Relatório, de uma vez.

A coleta diária cuida do presente (7 dias até hoje). Este aqui é o mutirão
inicial: varre meses para trás e preenche o arquivo, para o "mês a mês" ter
mais de um mês e o comparativo significar alguma coisa.

    python3 scripts/rotina-metricas/historico.py --meses 13

Precisa das mesmas variáveis do coletor (SUPABASE_URL, SUPABASE_ANON_KEY,
INGESTAO_TOKEN) e da CLI da InsightfulPipe autenticada.

DUAS CAMADAS, e a razão é o custo de requisição:

- Até 60 dias atrás: tudo. Alcance, novos seguidores, views, likes,
  comentários, compartilhamentos, interações, cliques e publicações. As seis
  últimas só existem como total de um intervalo na API da Meta, então cada DIA
  é uma requisição — 30 por mês.
- Antes disso: o que vem em série temporal (alcance e novos seguidores) mais a
  contagem de publicações. Dois pedidos por mês em vez de trinta e dois.

A alternativa seria mil requisições para encher um ano, estourar o limite da
Meta e derrubar a coleta do dia. O que fica de fora fica NULO, nunca zero — a
tela mostra "—" e conta como dia sem aquele dado, em vez de desenhar queda.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

MARCA = int(os.environ.get("BRAND_ID", "6366"))
MESES = 13
DETALHE_ATE_DIAS = int(os.environ.get("DETALHE_ATE_DIAS", "60"))

URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_ANON_KEY"]
TOKEN = os.environ["INGESTAO_TOKEN"]

METRICAS_DO_DIA = ["views", "likes", "comments", "shares", "total_interactions", "profile_links_taps"]
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


def argumento(nome, padrao):
    if f"--{nome}" in sys.argv:
        return sys.argv[sys.argv.index(f"--{nome}") + 1]
    return padrao


def cli(args):
    saida = subprocess.run(["insightfulpipe", *args], capture_output=True, text=True, timeout=240)
    if saida.returncode != 0:
        raise SystemExit(f"CLI falhou: {saida.stderr.strip()[:400]}")
    resposta = json.loads(saida.stdout)
    if resposta.get("status") != "success":
        raise SystemExit(f"CLI respondeu erro: {json.dumps(resposta)[:400]}")
    return resposta


def consultar(corpo):
    return cli(["query", "instagram", "-b", json.dumps(corpo)])


def rpc(funcao, corpo):
    pedido = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{funcao}",
        data=json.dumps(corpo).encode(),
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(pedido, timeout=90) as resposta:
            return json.loads(resposta.read().decode() or "null")
    except urllib.error.HTTPError as erro:
        raise SystemExit(f"Supabase recusou ({erro.code}): {erro.read().decode()[:300]}")


def pedaco(base, de, ate, detalhado, com_seguidores):
    por_dia = {}

    def linha(dia):
        return por_dia.setdefault(dia, {"dia": dia})

    # `follower_count` SÓ existe nos últimos 30 dias — a Meta recusa a janela
    # inteira se ele for pedido para trás disso, e aí nem o alcance vem. Para o
    # passado, pede-se só o alcance: o ganho de seguidores de meses atrás fica
    # nulo, que é a verdade (não temos), e não zero.
    metricas = ["reach", "follower_count"] if com_seguidores else ["reach"]

    serie = consultar({
        **base,
        "action": "get_account_insights",
        "metrics": metricas,
        "period": "day",
        "metric_type": "time_series",
        "since": de.isoformat(),
        "until": (ate + timedelta(days=1)).isoformat(),
    })["data"]
    for metrica in serie:
        for ponto in metrica.get("values", []):
            linha(ponto["end_time"][:10])[COLUNA[metrica["name"]]] = ponto["value"]

    if detalhado:
        dia = de
        while dia <= ate:
            totais = consultar({
                **base,
                "action": "get_account_insights",
                "metrics": METRICAS_DO_DIA,
                "period": "day",
                "metric_type": "total_value",
                "since": dia.isoformat(),
                "until": (dia + timedelta(days=1)).isoformat(),
            })["data"]
            for metrica in totais:
                linha(dia.isoformat())[COLUNA[metrica["name"]]] = (metrica.get("total_value") or {}).get("value")
            dia += timedelta(days=1)
            sys.stderr.write(".")

    midias = consultar({
        **base,
        "action": "get_media",
        "fields": ["id", "timestamp"],
        "auto_paginate": True,
        "since": de.isoformat(),
        "until": (ate + timedelta(days=1)).isoformat(),
    })["data"]
    publicadas = {}
    for midia in midias or []:
        d = str(midia.get("timestamp", ""))[:10]
        publicadas[d] = publicadas.get(d, 0) + 1
    for d, valores in por_dia.items():
        valores["publicacoes"] = publicadas.get(d, 0)

    return sorted(por_dia.values(), key=lambda x: x["dia"])


def main():
    meses = int(argumento("meses", MESES))
    hoje = date.today()

    contas = [
        c for c in cli(["accounts", "--platform", "instagram"])["sources"]
        if c.get("brand_id") == MARCA and c.get("status") == "active"
    ]
    if not contas:
        raise SystemExit(f"nenhuma conta de Instagram ativa na marca {MARCA}")

    for conta in contas:
        base = {
            "platform": "instagram",
            "workspace_id": conta["workspace_id"],
            "brand_id": conta["brand_id"],
            "account_id": conta["account_id"],
            "instagram_account_id": conta["account_id"],
        }
        perfil = consultar({**base, "action": "get_profile", "fields": ["id", "username", "name", "followers_count"]})["data"]
        if perfil["username"] != conta["username"]:
            raise SystemExit(f"a conta responde como @{perfil['username']}, e não @{conta['username']}")

        print(f"@{perfil['username']} — varrendo {meses} meses", file=sys.stderr)
        total = 0
        # Do mais antigo para o mais novo: se a cota acabar no meio, o que
        # sobrou é o passado distante, e não o mês que ele está olhando.
        for passo in range(meses - 1, -1, -1):
            ate = hoje - timedelta(days=30 * passo)
            de = ate - timedelta(days=29)
            detalhado = (hoje - de).days <= DETALHE_ATE_DIAS
            linhas = pedaco(base, de, ate, detalhado, com_seguidores=(hoje - de).days <= 29)
            if not linhas:
                continue
            gravados = rpc("ingerir_metricas", {
                "token": TOKEN,
                "rede_do_perfil": "instagram",
                "handle_do_perfil": perfil["username"],
                "nome_do_perfil": perfil.get("name") or "",
                "linhas": linhas,
            })
            total += gravados or 0
            print(f"  {de} a {ate} · {gravados} dia(s){' · completo' if detalhado else ''}", file=sys.stderr)

        # O total de seguidores vale para hoje, e só.
        rpc("ingerir_metricas", {
            "token": TOKEN,
            "rede_do_perfil": "instagram",
            "handle_do_perfil": perfil["username"],
            "nome_do_perfil": perfil.get("name") or "",
            "linhas": [{"dia": hoje.isoformat(), "seguidores": perfil["followers_count"]}],
        })
        print(f"@{perfil['username']}: {total} dia(s) no arquivo · {perfil['followers_count']} seguidores")


if __name__ == "__main__":
    sys.exit(main())
