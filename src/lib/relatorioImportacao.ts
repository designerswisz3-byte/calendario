/**
 * Leitura do que a pessoa cola na importação do Relatório.
 *
 * Por que existe uma importação em vez de a tela chamar a API da rede: o app
 * roda no navegador, e puxar métricas da Meta exige um token de página que não
 * pode viver no bundle — quem abrisse o DevTools teria acesso à conta. Então o
 * caminho é: alguém com o dado (coletor, planilha, export) entrega os dias, e
 * o Supabase passa a ser a única fonte que a tela lê.
 *
 * Aceita JSON e CSV porque são as duas formas em que o dado realmente chega:
 * JSON do que sai de uma API, CSV do que sai de uma planilha.
 */

import type { RelatorioMetricaEntrada } from '@/types/database'

/** Coluna canônica -> nomes que aparecem na vida real. */
const APELIDOS: Record<keyof Omit<RelatorioMetricaEntrada, 'dia'>, string[]> = {
  seguidores: ['seguidores', 'followers', 'follower_count', 'total_subs', 'inscritos'],
  seguidores_ganhos: ['seguidores_ganhos', 'follows', 'sub_increase_24h', 'novos_seguidores'],
  alcance: ['alcance', 'reach', 'accounts_reached'],
  views: ['views', 'visualizacoes', 'impressions', 'impressoes'],
  likes: ['likes', 'curtidas'],
  comentarios: ['comentarios', 'comments'],
  salvamentos: ['salvamentos', 'saves', 'saved'],
  compartilhamentos: ['compartilhamentos', 'shares'],
  interacoes: ['interacoes', 'total_interactions', 'engajamento'],
  cliques_no_link: ['cliques_no_link', 'profile_links_taps', 'link_clicks'],
  publicacoes: ['publicacoes', 'posts', 'midias', 'media', 'total_videos'],
}

const COLUNAS_DE_DIA = ['dia', 'data', 'date', 'day']

/** Sem acento, sem espaço, minúsculo — para casar "Comentários" com "comentarios". */
function normalizar(nome: string) {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_')
}

function colunaCanonica(nome: string): keyof RelatorioMetricaEntrada | null {
  const chave = normalizar(nome)
  if (COLUNAS_DE_DIA.includes(chave)) return 'dia'
  for (const [canonica, apelidos] of Object.entries(APELIDOS)) {
    if (apelidos.includes(chave)) return canonica as keyof RelatorioMetricaEntrada
  }
  return null
}

/**
 * Converte para número preservando a diferença entre "zero" e "não temos".
 *
 * Vazio e null viram null; "0" vira 0. É a regra que o resto do Relatório
 * depende para não desenhar queda onde houve só falta de coleta.
 */
function paraNumero(valor: unknown): number | null | undefined {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  const texto = String(valor).trim()
  if (texto === '' || texto === '-' || texto === '—') return null
  // Planilha brasileira: "1.234" é mil duzentos e trinta e quatro, e "12,5"
  // tem vírgula decimal.
  const limpo = texto.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  /*
   * A limpeza acima arranca tudo que não é dígito — e `Number('')` é 0, não
   * NaN. Sem este guarda, "muitas" e "n/d" entravam no banco como ZERO: um
   * dia inventado, que a agregação somaria como coleta real e puxaria o mês
   * para baixo. Se não sobrou dígito, não era número.
   */
  if (!/\d/.test(limpo)) return undefined
  const n = Number(limpo)
  return Number.isFinite(n) ? n : undefined
}

/** Aceita 2026-09-01, 01/09/2026 e 2026-09-01T03:00:00Z. */
function paraDia(valor: unknown): string | null {
  const texto = String(valor ?? '').trim()
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

export interface Leitura {
  dias: RelatorioMetricaEntrada[]
  /** Colunas reconhecidas, para a tela dizer o que vai entrar. */
  metricas: string[]
  de: string
  ate: string
  /** Problemas que não impedem a importação, mas a pessoa deve saber. */
  avisos: string[]
}

export class ErroDeImportacao extends Error {}

function separador(linha: string) {
  // Conta fora de aspas não importa aqui: cabeçalho de métrica não tem vírgula
  // dentro. Ganha quem aparecer mais.
  const ponto = (linha.match(/;/g) ?? []).length
  const virgula = (linha.match(/,/g) ?? []).length
  const tab = (linha.match(/\t/g) ?? []).length
  if (tab >= ponto && tab >= virgula && tab > 0) return '\t'
  return ponto >= virgula ? ';' : ','
}

function lerCsv(texto: string): Record<string, unknown>[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (linhas.length < 2) {
    throw new ErroDeImportacao('O CSV precisa de uma linha de cabeçalho e ao menos um dia.')
  }
  const sep = separador(linhas[0])
  const cabecalho = linhas[0].split(sep).map((c) => c.replace(/^"|"$/g, '').trim())
  return linhas.slice(1).map((linha) => {
    const celulas = linha.split(sep)
    const objeto: Record<string, unknown> = {}
    cabecalho.forEach((coluna, i) => {
      objeto[coluna] = celulas[i]?.replace(/^"|"$/g, '')
    })
    return objeto
  })
}

function lerJson(texto: string): Record<string, unknown>[] {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new ErroDeImportacao('O JSON não é válido. Confira vírgulas e chaves.')
  }
  if (Array.isArray(bruto)) return bruto as Record<string, unknown>[]
  // Resposta de API costuma embrulhar a lista em alguma chave.
  if (bruto && typeof bruto === 'object') {
    for (const chave of ['dias', 'serie', 'data', 'days', 'rows', 'result']) {
      const dentro = (bruto as Record<string, unknown>)[chave]
      if (Array.isArray(dentro)) return dentro as Record<string, unknown>[]
    }
  }
  throw new ErroDeImportacao(
    'O JSON precisa ser uma lista de dias — ou um objeto com a lista em "dias", ' +
      '"serie" ou "data".',
  )
}

/**
 * Lê o texto colado e devolve os dias prontos para gravar.
 *
 * Não grava nada: a tela mostra o resultado desta função para confirmação
 * antes de tocar no banco. Importar em cima do mês errado é reversível, mas
 * ninguém descobre o erro depois — descobre na próxima decisão.
 */
export function lerMetricas(texto: string): Leitura {
  const limpo = texto.trim()
  if (!limpo) throw new ErroDeImportacao('Cole os dados antes de importar.')

  const brutos = limpo.startsWith('[') || limpo.startsWith('{') ? lerJson(limpo) : lerCsv(limpo)
  if (brutos.length === 0) throw new ErroDeImportacao('Não encontrei nenhum dia nos dados colados.')

  const avisos: string[] = []
  const reconhecidas = new Set<string>()
  const ignoradas = new Set<string>()
  // Chave por dia: o último valor de um dia repetido é o que vale, e um
  // upsert com dois registros do mesmo dia na mesma chamada falha no Postgres.
  const porDia = new Map<string, RelatorioMetricaEntrada>()
  let semData = 0

  for (const bruto of brutos) {
    let dia: string | null = null
    const linha: Record<string, number | null> = {}

    for (const [nome, valor] of Object.entries(bruto)) {
      const coluna = colunaCanonica(nome)
      if (!coluna) {
        if (String(nome).trim()) ignoradas.add(nome)
        continue
      }
      if (coluna === 'dia') {
        dia = paraDia(valor)
        continue
      }
      const n = paraNumero(valor)
      if (n === undefined) {
        avisos.push(`"${String(valor)}" em ${nome} não é número — o dia entrou sem essa métrica.`)
        continue
      }
      linha[coluna] = n
      if (n !== null) reconhecidas.add(coluna)
    }

    if (!dia) {
      semData++
      continue
    }
    // Merge: a mesma data vinda em dois blocos (uma métrica por bloco) se junta.
    porDia.set(dia, { ...(porDia.get(dia) ?? {}), ...linha, dia })
  }

  if (porDia.size === 0) {
    throw new ErroDeImportacao(
      'Nenhuma linha tinha data reconhecível. A coluna precisa se chamar "dia", ' +
        '"data" ou "date", no formato AAAA-MM-DD ou DD/MM/AAAA.',
    )
  }
  if (reconhecidas.size === 0) {
    throw new ErroDeImportacao(
      'Achei as datas, mas nenhuma coluna de métrica. Reconheço: seguidores, ' +
        'alcance, views, likes, comentarios, salvamentos, compartilhamentos, ' +
        'interacoes, cliques_no_link, publicacoes.',
    )
  }

  if (semData > 0) avisos.push(`${semData} linha(s) sem data foram ignoradas.`)
  if (ignoradas.size > 0) {
    avisos.push(`Colunas não reconhecidas, ignoradas: ${[...ignoradas].join(', ')}.`)
  }

  const dias = [...porDia.values()].sort((a, b) => (a.dia < b.dia ? -1 : 1))
  return {
    dias,
    metricas: [...reconhecidas],
    de: dias[0].dia,
    ate: dias[dias.length - 1].dia,
    avisos,
  }
}
