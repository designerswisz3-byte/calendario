import { TYPE_LABEL } from '@/lib/constants'
import type { CalendarItemWithRelations } from '@/types/database'

/**
 * A postagem do calendário vista pela aba Stories.
 *
 * As duas abas falavam de conteúdo e não se olhavam: dava para ter um post
 * sobre ruptura de estoque no dia 12 e uma sequência de stories sobre
 * embalagem no mesmo dia 12. Quem assiste vê as duas coisas na mesma tarde e
 * não lembra de nenhuma. Aqui o story passa a nascer sabendo o que o feed já
 * vai dizer naquele dia.
 */
export interface PautaDoDia {
  id: string
  /** O assunto em uma linha — vai para o botão e para o título da sequência. */
  assunto: string
  /** Tudo que o motor pode ler para escolher o ângulo: briefing, roteiro, etiquetas. */
  texto: string
  rotuloDoTipo: string
  horario: string | null
}

const LIMITE = 80

/**
 * O assunto da postagem em uma linha.
 *
 * `calendar_items` não tem título: o que existe é o briefing (`notas`), o
 * roteiro e as etiquetas. A primeira linha do briefing é, na prática, o
 * assunto — é assim que ele escreve. Quando não há briefing, o roteiro serve;
 * quando não há nem isso, as etiquetas dizem do que se trata.
 */
export function assuntoDaPostagem(item: CalendarItemWithRelations): string {
  const primeiraLinha = (texto: string | null) =>
    (texto ?? '')
      .split('\n')
      .map((linha) => linha.replace(/^[\s*\-–—#>]+/, '').trim())
      .find((linha) => linha !== '') ?? ''

  const bruto =
    primeiraLinha(item.notas) ||
    primeiraLinha(item.roteiro) ||
    item.tags.map((tag) => tag.nome).join(', ')

  if (!bruto) return `${TYPE_LABEL[item.tipo]} sem briefing`
  return bruto.length <= LIMITE ? bruto : `${bruto.slice(0, LIMITE - 1).trimEnd()}…`
}

export function pautaDaPostagem(item: CalendarItemWithRelations): PautaDoDia {
  return {
    id: item.id,
    assunto: assuntoDaPostagem(item),
    // O texto que o motor lê é o conteúdo inteiro, não só a primeira linha: o
    // ângulo costuma estar no meio do briefing, não no começo.
    texto: [item.notas ?? '', item.roteiro ?? '', ...item.tags.map((t) => t.nome)]
      .join(' · ')
      .trim(),
    rotuloDoTipo: TYPE_LABEL[item.tipo],
    horario: item.horario,
  }
}
