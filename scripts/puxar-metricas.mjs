#!/usr/bin/env node
/**
 * Puxa as métricas diárias do Instagram do Raphael para a aba Relatório.
 *
 * Por que um script e não a tela: o app roda no navegador e puxar métricas da
 * Meta exige credencial que não pode viver no bundle — quem abrisse o DevTools
 * teria a conta. Então a coleta roda FORA do app, por quem tem a credencial, e
 * o Supabase continua sendo a única fonte que a tela lê.
 *
 * A credencial aqui é a da CLI da InsightfulPipe, guardada por ela no chaveiro
 * do sistema (`insightfulpipe auth`). Este arquivo nunca vê a chave: ele só
 * chama a CLI já autenticada. Chave de API em arquivo versionado é chave
 * vazada.
 *
 * Uso:
 *   node scripts/puxar-metricas.mjs                 # últimos 30 dias
 *   node scripts/puxar-metricas.mjs --dias 14
 *   node scripts/puxar-metricas.mjs --de 2026-09-22 --ate 2026-10-21
 *   node scripts/puxar-metricas.mjs --saida metricas.json
 *
 * A saída é o JSON que a aba Relatório importa (Relatório → Importar).
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

/**
 * A ÚNICA conta que este script toca.
 *
 * O workspace tem outras contas conectadas (outra marca, contas de anúncio de
 * terceiros). Nada aqui as alcança: os ids abaixo são fixos, toda chamada é de
 * leitura (`query`, nunca `action`), e a primeira coisa que o script faz é
 * conferir que o perfil devolvido é mesmo o esperado — se a conta trocar de id
 * do outro lado, ele para em vez de coletar o dado de outra pessoa.
 *
 * Nenhum destes números é segredo: são identificadores públicos de conta.
 */
const CONTA = {
  workspace_id: 704,
  brand_id: 6366,
  account_id: '17841464961662661',
  username: 'euraphaelaraujo',
}

/**
 * O que a API devolve por dia, e para onde vai na tabela.
 *
 * `reach` e `follower_count` são os únicos que aceitam série temporal — os
 * outros só vêm como total de um intervalo, por isso o laço dia a dia.
 */
const METRICAS_DO_DIA = [
  'views',
  'likes',
  'comments',
  'shares',
  'total_interactions',
  'profile_links_taps',
]

function argumento(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : padrao
}

function morrer(mensagem) {
  console.error(`erro: ${mensagem}`)
  process.exit(1)
}

/** Chama a CLI em modo LEITURA. `action` (escrita) não existe neste arquivo. */
function consultar(corpo) {
  let bruto
  try {
    bruto = execFileSync('insightfulpipe', ['query', 'instagram', '-b', JSON.stringify(corpo)], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch (erro) {
    morrer(
      `a CLI falhou (${erro.message}). Rode "insightfulpipe doctor" — provavelmente falta autenticar.`,
    )
  }
  const resposta = JSON.parse(bruto)
  if (resposta.status !== 'success') morrer(JSON.stringify(resposta))
  return resposta
}

const base = {
  platform: 'instagram',
  workspace_id: CONTA.workspace_id,
  brand_id: CONTA.brand_id,
  account_id: CONTA.account_id,
  instagram_account_id: CONTA.account_id,
}

const diaISO = (data) => data.toISOString().slice(0, 10)
const somarDias = (data, n) => new Date(data.getTime() + n * 86_400_000)

/* ------------------------------------------------------------- janela -- */

const hoje = new Date(`${diaISO(new Date())}T00:00:00Z`)
const dias = Number(argumento('dias', 30))
if (!Number.isFinite(dias) || dias < 1 || dias > 30) {
  // 30 é o limite da Meta para insights de conta: pedir mais devolve erro, e
  // pedir em pedaços escondendo isso daria a impressão de histórico completo.
  morrer('--dias precisa estar entre 1 e 30 (limite da API da Meta para insights de conta)')
}

const ate = argumento('ate') ? new Date(`${argumento('ate')}T00:00:00Z`) : somarDias(hoje, -1)
const de = argumento('de') ? new Date(`${argumento('de')}T00:00:00Z`) : somarDias(ate, -(dias - 1))
if (de > ate) morrer('--de é depois de --ate')

/* -------------------------------------------------------------- perfil -- */

const perfil = consultar({
  ...base,
  action: 'get_profile',
  fields: ['id', 'username', 'name', 'followers_count', 'media_count'],
}).data

if (perfil.username !== CONTA.username) {
  morrer(
    `a conta ${CONTA.account_id} responde como @${perfil.username}, e este script só coleta ` +
      `@${CONTA.username}. Nada foi coletado.`,
  )
}

console.error(`@${perfil.username} — ${perfil.followers_count} seguidores, ${perfil.media_count} publicações`)
console.error(`janela: ${diaISO(de)} a ${diaISO(ate)}`)

/* --------------------------------------------------------- série diária -- */

/*
 * `until` é exclusivo do lado da Meta: para incluir o último dia, pede-se o
 * dia seguinte. Conferido contra o total de um dia só — o balde carimbado com
 * end_time 19/10 é o dia 19/10, e não o 18.
 */
const serie = consultar({
  ...base,
  action: 'get_account_insights',
  metrics: ['reach', 'follower_count'],
  period: 'day',
  metric_type: 'time_series',
  since: diaISO(de),
  until: diaISO(somarDias(ate, 1)),
}).data

const porDia = new Map()
const linha = (dia) => {
  if (!porDia.has(dia)) porDia.set(dia, { dia })
  return porDia.get(dia)
}

for (const metrica of serie) {
  for (const ponto of metrica.values ?? []) {
    const dia = String(ponto.end_time).slice(0, 10)
    /*
     * `follower_count` da Meta é quantos ENTRARAM no dia, não o total. O nome
     * engana (o total é `followers_count`, com s), então aqui ele sai com o
     * nome que não deixa dúvida.
     */
    linha(dia)[metrica.name === 'reach' ? 'reach' : 'novos_seguidores'] = ponto.value
  }
}

/* ------------------------------------------------- o resto, dia a dia -- */

for (let data = new Date(de); data <= ate; data = somarDias(data, 1)) {
  const dia = diaISO(data)
  const totais = consultar({
    ...base,
    action: 'get_account_insights',
    metrics: METRICAS_DO_DIA,
    period: 'day',
    metric_type: 'total_value',
    since: dia,
    until: diaISO(somarDias(data, 1)),
  }).data

  for (const metrica of totais) {
    linha(dia)[metrica.name] = metrica.total_value?.value ?? null
  }
  process.stderr.write('.')
}
process.stderr.write('\n')

/* ------------------------------------------------------- publicações -- */

const midias = consultar({
  ...base,
  action: 'get_media',
  fields: ['id', 'timestamp'],
  auto_paginate: true,
  since: diaISO(de),
  until: diaISO(somarDias(ate, 1)),
}).data

const publicadas = new Map()
for (const midia of midias ?? []) {
  const dia = String(midia.timestamp).slice(0, 10)
  publicadas.set(dia, (publicadas.get(dia) ?? 0) + 1)
}
for (const [dia, quantas] of publicadas) {
  if (porDia.has(dia)) linha(dia).posts = quantas
}
// Dia sem publicação é zero de verdade, não "não sei": a lista de mídias do
// período é completa. Só os dias DENTRO da janela recebem o zero.
for (const [dia, valores] of porDia) {
  if (valores.posts === undefined) valores.posts = 0
}

/* ------------------------------------------------------------- saída -- */

/*
 * `saved` (salvamentos) fica de fora de propósito: a API de conta não entrega
 * salvamento por dia — só por publicação. Preencher com zero seria inventar
 * queda; a tela trata ausente como "não temos este dia" e mostra a cobertura.
 */
const linhas = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia))

/*
 * O TOTAL de seguidores só existe para agora: a API não devolve histórico do
 * total, só o ganho de cada dia. Então ele entra uma vez, no último dia da
 * janela, e os outros dias ficam sem — que é diferente de ficar com zero. A
 * tela mostra cobertura em vez de interpolar, então um dia sem total é um dia
 * honesto; trinta dias com total inventado seria um gráfico mentindo.
 */
const ultimo = linhas[linhas.length - 1]
if (ultimo && ultimo.dia === diaISO(somarDias(hoje, -1))) {
  ultimo.seguidores = perfil.followers_count
}

const json = JSON.stringify(linhas, null, 2)
const saida = argumento('saida')
if (saida) {
  writeFileSync(saida, json)
  console.error(`${linhas.length} dia(s) em ${saida}`)
} else {
  console.log(json)
}
