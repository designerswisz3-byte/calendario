import type { NoticiaEntrada, NoticiaRow } from '@/types/database'

export class ErroDeColeta extends Error {}

/** Só http(s): `javascript:` num href é execução de script na própria página. */
function urlValida(valor: unknown): string | null {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  try {
    const url = new URL(texto)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function dia(valor: unknown): string | null {
  const texto = String(valor ?? '').trim()
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

export interface LeituraDeColeta {
  noticias: NoticiaEntrada[]
  /** Quantas vieram repetidas na mesma coleta (mesma URL). */
  repetidas: number
  avisos: string[]
}

/**
 * Lê a coleta do dia.
 *
 * Formato: lista de objetos JSON com `titulo` e `url` obrigatórios. Os dois são
 * obrigatórios por motivos diferentes: sem título não há o que ler na lista, e
 * sem URL não há como conferir a fonte — e notícia que não dá para conferir não
 * entra num painel que vai pautar decisão.
 */
export function lerColeta(texto: string): LeituraDeColeta {
  const limpo = texto.trim()
  if (!limpo) throw new ErroDeColeta('Cole a coleta antes de importar.')

  let bruto: unknown
  try {
    bruto = JSON.parse(limpo)
  } catch {
    throw new ErroDeColeta('O JSON não é válido. Confira vírgulas e chaves.')
  }

  let lista: unknown[]
  if (Array.isArray(bruto)) lista = bruto
  else if (bruto && typeof bruto === 'object' && Array.isArray((bruto as Record<string, unknown>).noticias)) {
    lista = (bruto as Record<string, unknown>).noticias as unknown[]
  } else {
    throw new ErroDeColeta('O JSON precisa ser uma lista de notícias, ou um objeto com a lista em "noticias".')
  }

  const avisos: string[] = []
  const porUrl = new Map<string, NoticiaEntrada>()
  let repetidas = 0
  let semUrl = 0
  let semTitulo = 0

  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const campo = item as Record<string, unknown>

    const url = urlValida(campo.url ?? campo.link)
    const titulo = String(campo.titulo ?? campo.title ?? '').trim()
    if (!url) {
      semUrl++
      continue
    }
    if (!titulo) {
      semTitulo++
      continue
    }

    const relevanciaBruta = Number(campo.relevancia ?? campo.relevance ?? 3)
    /*
     * Fora da faixa vira 3, e não erro: uma coleta inteira perdida porque um
     * item veio com relevância 7 seria pior do que um item no meio da lista.
     * Mas o aviso aparece, para a régua não se corromper em silêncio.
     */
    const dentroDaFaixa = Number.isFinite(relevanciaBruta) && relevanciaBruta >= 1 && relevanciaBruta <= 5
    if (!dentroDaFaixa) avisos.push(`"${titulo.slice(0, 40)}…" veio sem relevância válida — entrou como 3.`)

    const tagsBrutas = campo.tags
    const tags = Array.isArray(tagsBrutas)
      ? tagsBrutas.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
      : []

    const entrada: NoticiaEntrada = {
      titulo,
      resumo: String(campo.resumo ?? campo.summary ?? '').trim(),
      por_que_importa: String(campo.por_que_importa ?? campo.porQueImporta ?? '').trim(),
      url,
      fonte: String(campo.fonte ?? campo.source ?? '').trim(),
      publicado_em: dia(campo.publicado_em ?? campo.publicadoEm ?? campo.data ?? campo.date),
      relevancia: dentroDaFaixa ? Math.round(relevanciaBruta) : 3,
      tags,
    }

    // A mesma URL duas vezes na mesma importação quebraria o upsert: o
    // Postgres recusa um ON CONFLICT que atinge a mesma linha duas vezes.
    if (porUrl.has(url)) repetidas++
    porUrl.set(url, entrada)
  }

  if (porUrl.size === 0) {
    throw new ErroDeColeta(
      'Nenhuma notícia válida na coleta. Cada item precisa de "titulo" e de "url" começando com http.',
    )
  }
  if (semUrl > 0) avisos.push(`${semUrl} item(ns) sem URL válida foram ignorados.`)
  if (semTitulo > 0) avisos.push(`${semTitulo} item(ns) sem título foram ignorados.`)
  if (repetidas > 0) avisos.push(`${repetidas} URL(s) repetida(s) na coleta — ficou a última de cada.`)

  return { noticias: [...porUrl.values()], repetidas, avisos }
}

/** O briefing que nasce de uma notícia. Primeira linha = título do item. */
export function briefingDaNoticia(noticia: NoticiaRow): string {
  const partes = [noticia.titulo]
  if (noticia.resumo) partes.push('', noticia.resumo)
  if (noticia.por_que_importa) partes.push('', `Por que importa: ${noticia.por_que_importa}`)
  partes.push('', `Fonte: ${noticia.fonte || 'não informada'} — ${noticia.url}`)
  return partes.join('\n')
}

/* --------------------------------------------------------------- editoria -- */

/**
 * As quatro frentes que ele precisa acompanhar.
 *
 * A coleta começou só em moda e cresceu para economia, política e
 * empreendedorismo — porque decisão de estoque e de preço não é tomada só com
 * notícia do setor: juros, câmbio, tributação e regra nova de marketplace
 * mudam a conta antes de qualquer tendência de moda.
 *
 * A editoria não virou coluna no banco de propósito: ela é a primeira etiqueta
 * da notícia. Coluna nova exigiria migração e, mais importante, obrigaria a
 * reclassificar as notícias que já estão lá — que são todas de moda e
 * continuam certas sem tocar em nada.
 */
export const EDITORIAS = ['moda', 'economia', 'politica', 'empreendedorismo'] as const

export type Editoria = (typeof EDITORIAS)[number]

export const ROTULO_DE_EDITORIA: Record<Editoria, string> = {
  moda: 'Moda e e-commerce',
  economia: 'Economia',
  politica: 'Política',
  empreendedorismo: 'Empreendedorismo',
}

const semAcento = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/**
 * Em qual frente a notícia entra.
 *
 * Procura a editoria entre as etiquetas; sem nenhuma, cai em "moda". O padrão
 * não é chute: a coleta era só de moda até agora, então toda notícia sem
 * editoria É de moda.
 */
export function editoriaDe(noticia: Pick<NoticiaRow, 'tags'>): Editoria {
  for (const tag of noticia.tags) {
    const limpa = semAcento(tag)
    const achada = EDITORIAS.find((editoria) => editoria === limpa)
    if (achada) return achada
  }
  return 'moda'
}

export const ROTULO_DE_RELEVANCIA: Record<number, string> = {
  1: 'Ruído',
  2: 'Contexto',
  3: 'Vale saber',
  4: 'Mexe no plano',
  5: 'Decide esta semana',
}
