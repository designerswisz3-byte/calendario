#!/usr/bin/env python3
"""Traz o histórico do Instagram para o Relatório, de uma vez.

A coleta da rotina cuida do presente (7 dias até hoje). Este aqui é o mutirão:
varre meses para trás e preenche o arquivo, para o "mês a mês" ter mais de um
mês e o comparativo significar alguma coisa.

    python3 scripts/rotina-metricas/historico.py --meses 13
    python3 scripts/rotina-metricas/historico.py --de 2025-09-01 --ate 2025-12-31

Precisa das mesmas variáveis do coletor (SUPABASE_URL, SUPABASE_ANON_KEY,
INGESTAO_TOKEN) e da CLI da InsightfulPipe autenticada. As funções vêm de
`coletor.py`, ao lado: uma regra de coleta em dois arquivos é uma regra que vai
divergir.

POR QUE NÃO TEM MAIS DUAS CAMADAS. A versão anterior pulava as métricas de
conteúdo no passado distante para economizar requisição, e pedia
`follower_count`, que a Meta só responde para os últimos 30 dias — se pedido
para trás disso, ela recusa a JANELA INTEIRA e nem o alcance vinha. Com
`follows_and_unfollows` isso cai: ele responde para todo o histórico. Então o
passado passou a ser preenchível por inteiro, e o custo virou tempo, não dado
faltando. Daí `--dormir` e `--de/--ate`: dá para rodar em pedaços.
"""

import os
import sys
import time
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from coletor import (  # noqa: E402
    MARCA,
    cli,
    consultar,
    publicacoes_do_periodo,
    rpc,
    seguidores_do_dia,
    COLUNA,
    METRICAS_DO_DIA,
)

# A janela que a Meta aceita num pedido de série temporal.
PASSO = 30


def argumento(nome, padrao=None):
    bandeira = f"--{nome}"
    if bandeira in sys.argv:
        i = sys.argv.index(bandeira)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return padrao


def pedaco(base, de, ate, dormir, com_publicacoes):
    por_dia = {}

    def linha(dia):
        return por_dia.setdefault(dia, {"dia": dia})

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
            linha(dia.isoformat())[COLUNA[metrica["name"]]] = (
                metrica.get("total_value") or {}
            ).get("value")

        ganhos, perdidos = seguidores_do_dia(base, dia)
        linha(dia.isoformat())["seguidores_ganhos"] = ganhos
        linha(dia.isoformat())["seguidores_perdidos"] = perdidos

        sys.stderr.write(".")
        sys.stderr.flush()
        dia += timedelta(days=1)
        if dormir:
            time.sleep(dormir)

    publicacoes = (
        publicacoes_do_periodo(base, de, ate) if com_publicacoes else []
    )
    contagem = {}
    for pub in publicacoes:
        contagem[pub["dia"]] = contagem.get(pub["dia"], 0) + 1
    if com_publicacoes:
        for d, valores in por_dia.items():
            valores["publicacoes"] = contagem.get(d, 0)

    return sorted(por_dia.values(), key=lambda x: x["dia"]), publicacoes


def main():
    hoje = date.today()
    com_publicacoes = "--sem-publicacoes" not in sys.argv
    dormir = float(argumento("dormir", "0") or 0)

    if argumento("de"):
        de_total = date.fromisoformat(argumento("de"))
        ate_total = date.fromisoformat(argumento("ate", hoje.isoformat()))
    else:
        meses = int(argumento("meses", "13"))
        ate_total = hoje
        de_total = hoje - timedelta(days=30 * meses - 1)

    if de_total > ate_total:
        raise SystemExit("--de precisa ser anterior a --ate")

    contas = [
        c
        for c in cli(["accounts", "--platform", "instagram"])["sources"]
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
        perfil = consultar(
            {**base, "action": "get_profile", "fields": ["id", "username", "name", "followers_count"]}
        )["data"]
        if perfil["username"] != conta["username"]:
            raise SystemExit(
                f"a conta responde como @{perfil['username']}, e não @{conta['username']}"
            )

        print(
            f"@{perfil['username']} — {de_total} a {ate_total}",
            file=sys.stderr,
        )
        dias_gravados = posts_gravados = 0

        # Do mais antigo para o mais novo: se a cota da Meta acabar no meio, o
        # que sobrou é o passado distante, e não o mês que ele está olhando.
        inicio = de_total
        while inicio <= ate_total:
            fim = min(inicio + timedelta(days=PASSO - 1), ate_total)
            linhas, publicacoes = pedaco(base, inicio, fim, dormir, com_publicacoes)
            if linhas:
                gravados = rpc(
                    "ingerir_metricas",
                    {
                        "token": os.environ["INGESTAO_TOKEN"],
                        "rede_do_perfil": "instagram",
                        "handle_do_perfil": perfil["username"],
                        "nome_do_perfil": perfil.get("name") or "",
                        "linhas": linhas,
                    },
                )
                dias_gravados += gravados or 0
            if publicacoes:
                posts = rpc(
                    "ingerir_publicacoes",
                    {
                        "token": os.environ["INGESTAO_TOKEN"],
                        "rede_do_perfil": "instagram",
                        "handle_do_perfil": perfil["username"],
                        "linhas": publicacoes,
                    },
                )
                posts_gravados += posts or 0
            print(
                f"\n  {inicio} a {fim} · {len(linhas)} dia(s) · {len(publicacoes)} post(s)",
                file=sys.stderr,
            )
            inicio = fim + timedelta(days=1)

        # O total de seguidores vale para hoje, e só.
        rpc(
            "ingerir_metricas",
            {
                "token": os.environ["INGESTAO_TOKEN"],
                "rede_do_perfil": "instagram",
                "handle_do_perfil": perfil["username"],
                "nome_do_perfil": perfil.get("name") or "",
                "linhas": [{"dia": hoje.isoformat(), "seguidores": perfil["followers_count"]}],
            },
        )
        print(
            f"@{perfil['username']}: {dias_gravados} dia(s) e {posts_gravados} "
            f"publicação(ões) no arquivo · {perfil['followers_count']} seguidores"
        )


if __name__ == "__main__":
    sys.exit(main())
