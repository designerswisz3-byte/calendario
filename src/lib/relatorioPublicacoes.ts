/**
 * O que o Relatório precisa saber sobre uma publicação para mostrá-la ao lado
 * do dia dela.
 *
 * Fica fora de `relatorio.ts` de propósito: lá é agregação de números e tudo é
 * função pura sobre dias. Aqui é apresentação de texto, que muda por outro
 * motivo e com outra frequência.
 */
import type { RelatorioPublicacaoRow } from '@/types/database'

/** 'REELS' -> 'Reels'. O que muda a leitura de alcance é o formato, não o tipo. */
export function rotuloDeFormato(publicacao: RelatorioPublicacaoRow): string {
  const formato = (publicacao.formato || '').toUpperCase()
  if (formato === 'REELS') return 'Reels'
  if (formato === 'STORY') return 'Story'
  if (formato === 'AD') return 'Anúncio'

  const tipo = (publicacao.tipo || '').toUpperCase()
  if (tipo === 'CAROUSEL_ALBUM') return 'Carrossel'
  if (tipo === 'VIDEO') return 'Vídeo'
  if (tipo === 'IMAGE') return 'Foto'
  return 'Publicação'
}

/**
 * O gancho da legenda, que é o que serve para comparar um post com outro.
 *
 * A primeira linha NÃO VAZIA, e não os primeiros 70 caracteres: legenda de
 * Instagram costuma abrir com emoji solto ou quebra de linha, e cortar no
 * caractere produziria títulos como "🔥" ou " ". Quem lê o painel quer
 * reconhecer o post, então o critério é a primeira linha que tem palavra.
 */
export function tituloDaPublicacao(publicacao: RelatorioPublicacaoRow, limite = 80): string {
  const linha = (publicacao.legenda || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /\p{L}/u.test(l))

  if (!linha) return `${rotuloDeFormato(publicacao)} sem legenda`
  if (linha.length <= limite) return linha

  // Corta na palavra, não no meio dela.
  const pedaco = linha.slice(0, limite)
  const espaco = pedaco.lastIndexOf(' ')
  return `${(espaco > limite * 0.6 ? pedaco.slice(0, espaco) : pedaco).trimEnd()}…`
}

/** As publicações de cada dia, na ordem em que saíram. */
export function porDia(
  publicacoes: RelatorioPublicacaoRow[],
): Map<string, RelatorioPublicacaoRow[]> {
  const mapa = new Map<string, RelatorioPublicacaoRow[]>()
  for (const publicacao of publicacoes) {
    const lista = mapa.get(publicacao.dia)
    if (lista) lista.push(publicacao)
    else mapa.set(publicacao.dia, [publicacao])
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (a.publicado_em < b.publicado_em ? -1 : 1))
  }
  return mapa
}

/** 20/10 às 18h — o horário importa: reels da noite e da manhã não rendem igual. */
export function quandoSaiu(publicacao: RelatorioPublicacaoRow): string {
  const data = new Date(publicacao.publicado_em)
  if (Number.isNaN(data.getTime())) return publicacao.dia
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}
