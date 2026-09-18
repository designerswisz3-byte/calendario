/**
 * Helpers de data.
 *
 * REGRA: todas as datas do app respeitam o timezone LOCAL do navegador.
 * `calendar_items.data` é um `date` puro no Postgres (sem timezone), então
 * nunca usamos `new Date('2026-09-14')` — o JS interpretaria como UTC e o dia
 * "voltaria" um dia em fusos negativos (ex.: America/Sao_Paulo). Sempre
 * convertemos manualmente de/para "YYYY-MM-DD" em horário local.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Date (local) -> "YYYY-MM-DD" */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "YYYY-MM-DD" -> Date à meia-noite LOCAL */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function isSameDayKey(a: string, b: string) {
  return a === b
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

/**
 * Matriz de 6 semanas x 7 dias cobrindo o mês (domingo como primeiro dia),
 * incluindo dias vizinhos para completar as bordas.
 */
export function buildMonthGrid(reference: Date): Date[][] {
  const first = startOfMonth(reference)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())

  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

export function formatMonthTitle(date: Date) {
  const label = MONTH_FORMATTER.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatFullDay(date: Date) {
  const label = DAY_FORMATTER.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatShortDate(key: string) {
  return SHORT_DATE_FORMATTER.format(parseDateKey(key))
}

/** "14:30:00" -> "14:30" (vazio quando não houver horário) */
export function formatTime(time: string | null | undefined) {
  if (!time) return ''
  return time.slice(0, 5)
}

/** "14:30" -> "14:30:00" para o tipo `time` do Postgres */
export function toDbTime(value: string | null | undefined) {
  if (!value) return null
  return value.length === 5 ? `${value}:00` : value
}

export function isToday(date: Date) {
  return toDateKey(date) === todayKey()
}

/**
 * Dia anterior a hoje. A comparação é de STRING "YYYY-MM-DD", não de Date:
 * o formato é ordenável lexicograficamente e a conta não passa por fuso
 * nenhum — que é a regra deste arquivo.
 */
export function isPast(date: Date) {
  return toDateKey(date) < todayKey()
}

export function isSameMonth(date: Date, reference: Date) {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear()
}
