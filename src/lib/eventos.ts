import type { CategoriaDeEvento, EscopoDeEvento, EventoRow } from '@/types/database'

/**
 * Espalha eventos de vários dias por todos os dias que eles ocupam.
 *
 * Uma feira de 10 a 12/01 precisa aparecer em TRÊS células da grade, não só na
 * do dia 10 — quem olha o dia 11 tem de ver que a feira está rolando. O banco
 * guarda o intervalo (`data` + `data_fim`) porque é a verdade; a grade precisa
 * do mapa dia a dia, e é esta função que faz a ponte.
 */
export function eventosPorDia(eventos: EventoRow[]): Map<string, EventoRow[]> {
  const mapa = new Map<string, EventoRow[]>()

  for (const evento of eventos) {
    for (const dia of diasDoEvento(evento)) {
      const lista = mapa.get(dia)
      if (lista) lista.push(evento)
      else mapa.set(dia, [evento])
    }
  }

  // Dentro do dia, a ordem é a da importância para quem vende: data comercial
  // primeiro, feriado por último.
  for (const lista of mapa.values()) lista.sort((a, b) => PESO[a.categoria] - PESO[b.categoria])
  return mapa
}

const PESO: Record<CategoriaDeEvento, number> = {
  comercial: 0,
  sazonal: 1,
  setorial: 2,
  feriado: 3,
}

/** Todos os dias que o evento ocupa, inclusive. */
export function diasDoEvento(evento: Pick<EventoRow, 'data' | 'data_fim'>): string[] {
  const fim = evento.data_fim ?? evento.data
  if (fim <= evento.data) return [evento.data]

  const dias: string[] = []
  const atual = new Date(`${evento.data}T00:00:00Z`)
  const limite = new Date(`${fim}T00:00:00Z`)
  /*
   * Teto de segurança. Um `data_fim` digitado com o ano errado (2037 em vez de
   * 2027) geraria quatro mil entradas e travaria a grade. Melhor cortar e
   * mostrar o começo do que pendurar a tela.
   */
  while (atual <= limite && dias.length < 400) {
    dias.push(atual.toISOString().slice(0, 10))
    atual.setUTCDate(atual.getUTCDate() + 1)
  }
  return dias
}

export const ROTULO_DE_CATEGORIA: Record<CategoriaDeEvento, string> = {
  comercial: 'Data comercial',
  sazonal: 'Sazonal',
  setorial: 'Evento do setor',
  feriado: 'Feriado',
}

export const ROTULO_DE_ESCOPO: Record<EscopoDeEvento, string> = {
  brasil: 'Brasil',
  global: 'Global',
  eua: 'EUA',
  europa: 'Europa',
  china: 'China',
}

/**
 * Cor por categoria.
 *
 * Quatro famílias bem separadas no círculo cromático, e nenhuma delas é a cor
 * primária do app — a célula do dia já usa o primário para "hoje" e para o
 * estado de arrastar, e repetir a cor faria o evento competir com a
 * sinalização que o calendário já tinha.
 */
export const COR_DE_CATEGORIA: Record<CategoriaDeEvento, string> = {
  comercial: 'bg-amber-500',
  sazonal: 'bg-teal-500',
  setorial: 'bg-fuchsia-500',
  feriado: 'bg-slate-400',
}

export const COR_DE_TEXTO: Record<CategoriaDeEvento, string> = {
  comercial: 'text-amber-700 dark:text-amber-300',
  sazonal: 'text-teal-700 dark:text-teal-300',
  setorial: 'text-fuchsia-700 dark:text-fuchsia-300',
  feriado: 'text-slate-600 dark:text-slate-300',
}

/**
 * O briefing que nasce de um evento.
 *
 * Isto é o ponto do recurso inteiro: a data não serve para decorar a grade,
 * serve para virar item de conteúdo. O texto entra no campo de briefing com o
 * título na primeira linha porque é dali que o app tira o nome do item.
 */
export function briefingDoEvento(evento: EventoRow): string {
  const partes = [evento.titulo]
  if (evento.por_que_importa) partes.push('', `Por que importa: ${evento.por_que_importa}`)
  if (evento.ideia_de_post) partes.push('', evento.ideia_de_post)
  if (evento.fonte_url) partes.push('', `Fonte: ${evento.fonte_url}`)
  return partes.join('\n')
}
