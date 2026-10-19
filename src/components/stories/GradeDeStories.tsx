import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { WEEKDAYS_SHORT } from '@/lib/constants'
import { buildMonthGrid, isPast, isSameMonth, isToday, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { StorySequenciaRow } from '@/types/database'

interface Props {
  reference: Date
  porDia: Map<string, StorySequenciaRow[]>
  loading?: boolean
  onAbrirDia: (dia: string) => void
}

/**
 * A grade dos stories.
 *
 * Deliberadamente mais leve que a do calendário editorial: sem arrastar, sem
 * tags, sem status. Story se decide no dia e se grava no dia — a célula só
 * precisa responder "tem sequência pronta aqui?" e, se tiver, qual é o
 * assunto.
 */
export function GradeDeStories({ reference, porDia, loading, onAbrirDia }: Props) {
  const semanas = buildMonthGrid(reference)

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[6.5rem] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS_SHORT.map((dia) => (
          <span key={dia} className="weekday-label text-center">
            {dia}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {semanas.flat().map((data) => {
          const chave = toDateKey(data)
          const sequencias = porDia.get(chave) ?? []
          const hoje = isToday(data)
          const passado = isPast(data)
          const foraDoMes = !isSameMonth(data, reference)

          return (
            <button
              key={chave}
              type="button"
              onClick={() => onAbrirDia(chave)}
              aria-label={`Dia ${data.getDate()}${hoje ? ' (hoje)' : ''}, ${sequencias.length} sequência(s)`}
              className={cn(
                'group flex min-h-[6.5rem] flex-col gap-1 rounded-lg border border-white/25 bg-white/40 p-1.5 text-left transition-all duration-250 hover:border-primary/40 hover:bg-white/65 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]',
                passado && 'border-slate-900/10 bg-slate-900/[0.07] dark:border-white/[0.06] dark:bg-black/35',
                hoje && 'border-primary/50 bg-white/75 ring-1 ring-primary/25 dark:bg-white/[0.10]',
                foraDoMes && 'opacity-45',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                    hoje && 'bg-primary text-primary-foreground shadow-glass',
                    !hoje && passado && 'text-muted-foreground/60',
                    !hoje && !passado && 'text-muted-foreground',
                  )}
                >
                  {data.getDate()}
                </span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="flex flex-col gap-1">
                {sequencias.slice(0, 2).map((sequencia) => (
                  <span
                    key={sequencia.id}
                    className={cn(
                      'truncate rounded-md px-1.5 py-1 text-[0.62rem] font-medium leading-tight',
                      sequencia.publicado
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-primary/15 text-primary',
                    )}
                    title={sequencia.titulo}
                  >
                    {/* O número de stories é o que diz se dá tempo de gravar hoje. */}
                    {sequencia.stories.length}· {sequencia.titulo || 'Sem título'}
                  </span>
                ))}
                {sequencias.length > 2 && (
                  <span className="pl-1 text-[0.6rem] text-muted-foreground">
                    +{sequencias.length - 2}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
