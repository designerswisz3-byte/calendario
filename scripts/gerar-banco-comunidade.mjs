#!/usr/bin/env node
/**
 * Lê o banco de temas da comunidade (Markdown) e gera o arquivo que o app usa.
 *
 *   node scripts/gerar-banco-comunidade.mjs
 *
 * Entrada:  scripts/comunidade/banco-temas.md      — o banco, do jeito que ele escreve
 *           scripts/comunidade/importancia.json    — o nível de importância de cada assunto
 * Saída:    src/lib/comunidadeBanco.ts             — GERADO. Edite o .md, não a saída.
 *
 * Por que gerar em vez de digitar: são 138 assuntos com prova e pergunta. Copiar
 * à mão para dentro do código é o caminho certo para uma pergunta trocada de
 * linha, que ninguém perceberia até ela aparecer no grupo. Aqui o texto do app
 * é o texto do documento, e atualizar o banco é trocar o .md e rodar de novo.
 *
 * O script PARA em vez de adivinhar: seção que sumiu, linha com coluna a mais
 * ou a menos, identificador repetido — tudo isso é erro, não aviso.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const md = readFileSync(join(raiz, 'scripts/comunidade/banco-temas.md'), 'utf8')
const importancia = JSON.parse(readFileSync(join(raiz, 'scripts/comunidade/importancia.json'), 'utf8'))

function falhar(mensagem) {
  console.error(`[banco] ${mensagem}`)
  process.exit(1)
}

/** As linhas de dados da tabela que vem logo depois de um título `## …`. */
function tabelaDe(tituloComecaCom, colunas) {
  const linhas = md.split('\n')
  const inicio = linhas.findIndex((l) => l.startsWith('## ') && l.slice(3).trim().startsWith(tituloComecaCom))
  if (inicio < 0) falhar(`seção não encontrada: "${tituloComecaCom}"`)
  const dados = []
  for (let i = inicio + 1; i < linhas.length && !linhas[i].startsWith('## '); i++) {
    const linha = linhas[i].trim()
    if (!linha.startsWith('|')) continue
    const celulas = linha.slice(1, -1).split('|').map((c) => c.trim())
    // Cabeçalho e a régua `|---|---|` não são dado.
    if (celulas.every((c) => /^-+$/.test(c))) continue
    if (dados.length === 0 && !dados.cabecalhoVisto) { dados.cabecalhoVisto = true; continue }
    if (celulas.length !== colunas) {
      falhar(`"${tituloComecaCom}": esperava ${colunas} colunas e a linha tem ${celulas.length}:\n  ${linha}`)
    }
    dados.push(celulas)
  }
  if (dados.length === 0) falhar(`"${tituloComecaCom}": tabela vazia`)
  return [...dados]
}

// ---------------------------------------------------------------------------
// Os sete pilares, um por dia da semana
// ---------------------------------------------------------------------------
// `dia` segue o getUTCDay do JavaScript: domingo = 0.
const PILARES = [
  { secao: 'SEGUNDA', letra: 'N', dia: 1 },
  { secao: 'TERÇA', letra: 'P', dia: 2 },
  { secao: 'QUARTA', letra: 'M', dia: 3 },
  { secao: 'QUINTA', letra: 'C', dia: 4 },
  { secao: 'SEXTA', letra: 'O', dia: 5 },
  { secao: 'SÁBADO', letra: 'G', dia: 6 },
  { secao: 'DOMINGO', letra: 'V', dia: 0 },
]

const rotacao = tabelaDe('Rotação semanal', 3)
const ids = new Set()
const pilares = PILARES.map(({ secao, letra, dia }) => {
  const titulo = md.split('\n').find((l) => l.startsWith(`## ${secao} · `))
  if (!titulo) falhar(`seção do pilar não encontrada: ${secao}`)
  const nome = titulo.replace(`## ${secao} · `, '').replace(/\s*\([A-Z]\)\s*$/, '').trim()
  const linhaDaRotacao = rotacao.find(([, pilar]) => pilar === nome)
  if (!linhaDaRotacao) falhar(`o pilar "${nome}" não está na tabela de rotação semanal`)

  const assuntos = tabelaDe(`${secao} · `, 5).map(([idBruto, tema, assunto, prova, pergunta]) => {
    const recorrente = idBruto.includes('♻')
    const id = idBruto.replace('♻', '').trim()
    if (!new RegExp(`^${letra}\\d{2}$`).test(id)) falhar(`identificador fora do padrão em ${secao}: "${idBruto}"`)
    if (ids.has(id)) falhar(`identificador repetido: ${id}`)
    ids.add(id)
    return { id, tema, assunto, prova, pergunta, recorrente, importancia: importancia[id] ?? 4 }
  })
  return { letra, dia, nome, papel: linhaDaRotacao[2], assuntos }
})

// ---------------------------------------------------------------------------
// A sequência de largada: datas fixas, que valem mais que a rotação
// ---------------------------------------------------------------------------
const largada = tabelaDe('Sequência de largada', 4).map(([quando, assunto, prova, pergunta]) => {
  const m = quando.match(/(\d{2})\/(\d{2})$/)
  if (!m) falhar(`data ilegível na largada: "${quando}"`)
  // A largada é a semana da Black Friday de 2026 e termina em 01/12/2026.
  const data = `2026-${m[2]}-${m[1]}`
  const id = `L-${data}`
  return { id, data, assunto, prova, pergunta, importancia: importancia[id] ?? 4 }
})

// ---------------------------------------------------------------------------
// Coringas, dinâmicas e calendário sazonal
// ---------------------------------------------------------------------------
// Identificadores escritos à mão, na ordem do documento: o texto do gatilho
// pode ser reescrito sem que a marcação antiga perca o vínculo.
const IDS_DOS_CORINGAS = [
  'coringa-recorde', 'coringa-crise', 'coringa-aquisicao', 'coringa-regra-de-marketplace',
  'coringa-noticia', 'coringa-data-comercial', 'coringa-pergunta-de-membro', 'coringa-mentorado',
]
const linhasDosCoringas = tabelaDe('Coringas', 3)
if (linhasDosCoringas.length !== IDS_DOS_CORINGAS.length) {
  falhar(`o documento tem ${linhasDosCoringas.length} coringas e o script conhece ${IDS_DOS_CORINGAS.length}. Atualize IDS_DOS_CORINGAS.`)
}
const coringas = linhasDosCoringas.map(([gatilho, angulo, pergunta], i) => ({ id: IDS_DOS_CORINGAS[i], gatilho, angulo, pergunta }))

const dinamicas = tabelaDe('Dinâmicas fixas', 3).map(([quando, nome, como]) => ({ quando, nome, como }))

const MESES = { Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06', Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12' }
const sazonal = Object.fromEntries(
  tabelaDe('Calendário sazonal', 3).map(([mes, gancho, assuntos]) => {
    const m = mes.match(/^([A-Za-z]{3})\/(\d{2})$/)
    if (!m || !MESES[m[1]]) falhar(`mês ilegível no calendário sazonal: "${mes}"`)
    return [`20${m[2]}-${MESES[m[1]]}`, { gancho, assuntos: assuntos.split(';').map((a) => a.trim()).filter(Boolean) }]
  }),
)

const total = pilares.reduce((soma, p) => soma + p.assuntos.length, 0)
const semNivel = [...ids, ...largada.map((l) => l.id)].filter((id) => !(id in importancia))
if (semNivel.length) console.warn(`[banco] sem nível em importancia.json (entraram como 4): ${semNivel.join(', ')}`)

const saida = `/*
 * GERADO por scripts/gerar-banco-comunidade.mjs — não edite à mão.
 *
 * A fonte é scripts/comunidade/banco-temas.md (o texto) e
 * scripts/comunidade/importancia.json (o nível de cada assunto). Para mudar
 * um assunto, edite lá e rode o script: o que for digitado aqui some na
 * próxima geração.
 */

export type Importancia = 3 | 4 | 5

export interface AssuntoDoBanco {
  /** Estável: é o que fica gravado quando ele marca "falei sobre esse tema". */
  id: string
  /** A categoria dentro do pilar (ex.: "Fechamento", "Curva ABC"). */
  tema: string
  assunto: string
  /** O que ele precisa trazer para o post: print, foto, conta, caso. */
  prova: string
  pergunta: string
  /** O dado muda toda semana, então o assunto se renova sozinho. */
  recorrente: boolean
  importancia: Importancia
}

export interface Pilar {
  letra: string
  /** Dia da semana, como em Date.getUTCDay(): domingo = 0. */
  dia: number
  nome: string
  /** O papel do pilar na semana do grupo. */
  papel: string
  assuntos: AssuntoDoBanco[]
}

export interface AssuntoDaLargada {
  id: string
  data: string
  assunto: string
  prova: string
  pergunta: string
  importancia: Importancia
}

export interface Coringa {
  id: string
  gatilho: string
  angulo: string
  pergunta: string
}

export interface Dinamica {
  quando: string
  nome: string
  como: string
}

export interface GanchoDoMes {
  gancho: string
  assuntos: string[]
}

/** ${total} assuntos em ${pilares.length} pilares. */
export const PILARES: Pilar[] = ${JSON.stringify(pilares, null, 2)}

export const LARGADA: AssuntoDaLargada[] = ${JSON.stringify(largada, null, 2)}

export const CORINGAS: Coringa[] = ${JSON.stringify(coringas, null, 2)}

export const DINAMICAS: Dinamica[] = ${JSON.stringify(dinamicas, null, 2)}

/** Chave \`AAAA-MM\`. */
export const SAZONAL: Record<string, GanchoDoMes> = ${JSON.stringify(sazonal, null, 2)}
`
writeFileSync(join(raiz, 'src/lib/comunidadeBanco.ts'), saida)
console.log(`[banco] ${total} assuntos em ${pilares.length} pilares (${pilares.map((p) => `${p.letra}:${p.assuntos.length}`).join(' ')}) · largada: ${largada.length} · coringas: ${coringas.length} · dinâmicas: ${dinamicas.length} · meses: ${Object.keys(sazonal).length}`)
