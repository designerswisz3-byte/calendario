#!/usr/bin/env node
/**
 * Ingestão de eventos e notícias a partir de um arquivo JSON.
 *
 * Existe para o lado que o navegador não pode fazer. A aba Notícias lê do
 * Supabase e só; quem COLETA tem de rodar em algum lugar com credencial — uma
 * sessão agendada, um cron, um servidor — porque chave com permissão de
 * escrita dentro do bundle é chave pública, e o `anon` sozinho não grava em
 * nome de outro usuário.
 *
 * Uso:
 *   node scripts/importar.mjs --tabela noticias --arquivo coleta.json
 *   node scripts/importar.mjs --tabela eventos  --arquivo eventos.json
 *   node scripts/importar.mjs --tabela noticias --listar 60
 *
 * `--listar N` não grava nada: imprime as URLs já guardadas nos últimos N dias.
 * É o que permite a coleta diária pular o que já entrou ontem, em vez de
 * depender só do upsert para não repetir.
 *
 * Hoje a coleta diária NÃO usa mais este caminho: ela grava pela porta estreita
 * (`supabase/porta-de-ingestao.sql`), com um token que só sabe inserir notícia
 * e evento. Este script continua aqui para uso manual de quem tem o checkout e
 * a chave de serviço — e para o `--listar`, que é útil na mão.
 *
 * Variáveis de ambiente (NUNCA no repositório):
 *   SUPABASE_URL                → https://<projeto>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   → chave de serviço. Ela IGNORA a RLS: só pode
 *                                 existir como segredo de ambiente do servidor
 *                                 ou do agendador. Nunca em .env versionado,
 *                                 nunca no front, nunca colada numa conversa.
 *   SUPABASE_USER_ID            → uuid do dono das linhas. Fica no ambiente
 *                                 junto com a chave porque quem agenda não
 *                                 deveria precisar decorar um uuid para
 *                                 montar a linha de comando todo dia.
 */

import { readFileSync } from 'node:fs'

const TABELAS = {
  noticias: { conflito: 'user_id,url', obrigatorios: ['titulo', 'url'] },
  eventos: { conflito: 'user_id,data,titulo', obrigatorios: ['data', 'titulo'] },
}

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function morrer(mensagem) {
  console.error(`erro: ${mensagem}`)
  process.exit(1)
}

const tabela = argumento('tabela')
const arquivo = argumento('arquivo')
const listar = argumento('listar')
const usuario = argumento('usuario') ?? process.env.SUPABASE_USER_ID

if (!TABELAS[tabela]) morrer(`--tabela precisa ser ${Object.keys(TABELAS).join(' ou ')}`)
if (!listar && !arquivo) morrer('--arquivo é obrigatório (ou use --listar N)')
if (!/^[0-9a-f-]{36}$/i.test(usuario ?? '')) {
  morrer('informe o dono das linhas em --usuario <uuid> ou na variável SUPABASE_USER_ID')
}

const url = process.env.SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !chave) {
  morrer(
    'defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.\n' +
      '       A chave de serviço ignora a RLS: guarde-a como segredo do ambiente,\n' +
      '       nunca em arquivo versionado.',
  )
}

const base = `${url.replace(/\/$/, '')}/rest/v1`
const cabecalhos = {
  apikey: chave,
  Authorization: `Bearer ${chave}`,
  'Content-Type': 'application/json',
}

/* -------------------------------------------------------------- --listar -- */

if (listar) {
  const dias = Number(listar)
  if (!Number.isFinite(dias) || dias < 1) morrer('--listar precisa de um número de dias')

  const desde = new Date(Date.now() - dias * 86400000).toISOString()
  const campo = tabela === 'noticias' ? 'url' : 'data,titulo'
  const resposta = await fetch(
    `${base}/${tabela}?select=${campo}&user_id=eq.${usuario}&coletado_em=gte.${desde}`.replace(
      // `eventos` não tem coletado_em: nessa tabela a janela é por criado_em.
      'coletado_em',
      tabela === 'noticias' ? 'coletado_em' : 'criado_em',
    ),
    { headers: cabecalhos },
  )
  if (!resposta.ok) morrer(`${resposta.status} ${resposta.statusText}\n${await resposta.text()}`)

  const linhas = await resposta.json()
  for (const linha of linhas) {
    console.log(tabela === 'noticias' ? linha.url : `${linha.data} ${linha.titulo}`)
  }
  console.error(`[importar] ${linhas.length} já guardada(s) nos últimos ${dias} dia(s)`)
  process.exit(0)
}

const bruto = JSON.parse(readFileSync(arquivo, 'utf8'))
const lista = Array.isArray(bruto) ? bruto : (bruto.noticias ?? bruto.eventos ?? bruto.dados)
if (!Array.isArray(lista)) morrer('o arquivo precisa conter uma lista JSON')

const { conflito, obrigatorios } = TABELAS[tabela]

/*
 * Duas linhas com a mesma chave na MESMA requisição fazem o Postgres recusar o
 * ON CONFLICT inteiro ("cannot affect row a second time"). Deduplicar aqui é o
 * que permite rodar a coleta sem medo de a fonte repetir um link.
 */
const porChave = new Map()
for (const [i, item] of lista.entries()) {
  for (const campo of obrigatorios) {
    if (!item?.[campo]) morrer(`item ${i + 1} está sem "${campo}"`)
  }
  const chaveDaLinha = tabela === 'noticias' ? item.url : `${item.data}|${item.titulo}`
  porChave.set(chaveDaLinha, { ...item, user_id: usuario })
}

/*
 * Todas as linhas precisam ter EXATAMENTE as mesmas chaves.
 *
 * O PostgREST recusa um insert em lote com objetos de formatos diferentes
 * ("All object keys must match", PGRST102): ele monta um único comando a
 * partir das chaves do primeiro objeto. O supabase-js normaliza isso por
 * dentro, então o mesmo JSON que entra pela tela quebrava aqui — e quebrava
 * só quando um item da coleta vinha sem data de publicação, que é o caso
 * normal e não o excepcional.
 */
const chaves = [...new Set([...porChave.values()].flatMap((linha) => Object.keys(linha)))]
const linhas = [...porChave.values()].map((linha) =>
  Object.fromEntries(chaves.map((chave) => [chave, linha[chave] ?? null])),
)
const descartadas = lista.length - linhas.length

const resposta = await fetch(
  `${base}/${tabela}?on_conflict=${encodeURIComponent(conflito)}&select=id`,
  {
    method: 'POST',
    headers: {
      ...cabecalhos,
      // merge-duplicates = upsert. Sem isso, a segunda coleta do dia falharia
      // inteira por causa de um link repetido de ontem.
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(linhas),
  },
)

if (!resposta.ok) {
  morrer(`${resposta.status} ${resposta.statusText}\n${await resposta.text()}`)
}

const gravadas = await resposta.json()
// Um POST que não acerta linha nenhuma volta 201 com lista vazia: sem esta
// checagem o agendador reportaria sucesso com o banco intacto.
if (!Array.isArray(gravadas) || gravadas.length === 0) {
  morrer('o banco aceitou a requisição mas não gravou nenhuma linha')
}

console.log(
  `[importar] ${gravadas.length} linha(s) em ${tabela}` +
    (descartadas > 0 ? ` (${descartadas} repetida(s) no arquivo, mantida a última)` : ''),
)
