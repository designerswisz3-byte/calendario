import { useDroppable } from '@dnd-kit/core'
import { FileText, Plus } from 'lucide-react'
import { CartaoDeSequencia } from '@/components/stories/CartaoDeSequencia'
import { Skeleton } from '@/components/ui/skeleton'
import { WEEKDAYS_SHORT } from '@/lib/constants'
import { buildMonthGrid, isPast, isSameMonth, isToday, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { StorySequenciaRow } from '@/types/database'
import type { PautaDoDia } from '@/lib/stories/pautas'

interface Props {
  reference: Date
  porDia: Map<string, StorySequenciaRow[]>
  /**
   * As postagens já marcadas em cada dia, vindas da aba Calendário.
   *
   * Aparecem na célula para a decisão de gravar não exigir abrir dia por dia:
   * o dia que já tem post é o dia em que o story tem mais o que sustentar.
   */
  pautasPorDia: Map<string, PautaDoDia[]>
  loading?: boolean
  onAbrirDia: (dia: string) => void
}

/**
 * A célula do dia.
 *
 * Virou componente próprio por causa do arrasto: `useDroppable` é um hook, e
 * hook não roda dentro de um `.map`.
 */
function CelulaDoDia({
  data,
  chave,
  sequencias,
  pautas,
  hoje,
  passado,
  foraDoMes,
  onAbrirDia,
}: {
  data: Date
  chave: string
  sequencias: StorySequenciaRow[]
  pautas: PautaDoDia[]
  hoje: boolean
  passado: boolean
  foraDoMes: boolean
  onAbrirDia: (dia: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia-${chave}`, data: { dateKey: chave } })

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onAbrirDia(chave)}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onAbrirDia(chave)
        }
      }}
      aria-label={`Dia ${data.getDate()}${hoje ? ' (hoje)' : ''}, ${sequencias.length} sequência(s), ${pautas.length} postagem(ns) no calendário`}
      className={cn(
        'group flex min-h-[6.5rem] cursor-pointer flex-col gap-1 rounded-lg border border-white/25 bg-white/40 p-1.5 text-left transition-all duration-250 hover:border-primary/40 hover:bg-white/65 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]',
        passado && 'border-slate-900/10 bg-slate-900/[0.07] dark:border-white/[0.06] dark:bg-black/35',
        hoje && 'border-primary/50 bg-white/75 ring-1 ring-primary/25 dark:bg-white/[0.10]',
        foraDoMes && 'opacity-45',
        isOver && 'border-primary bg-accent/70 ring-2 ring-primary/40 dark:bg-accent/40',
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
          <CartaoDeSequencia
            key={sequencia.id}
            sequencia={sequencia}
            onClick={() => onAbrirDia(chave)}
          />
        ))}
        {sequencias.length > 2 && (
          <span className="pl-1 text-[0.6rem] text-muted-foreground">
            +{sequencias.length - 2}
          </span>
        )}

        {pautas.length > 0 && (
          <span
            className="flex items-center gap-1 truncate pl-0.5 text-[0.6rem] leading-tight text-muted-foreground"
            title={pautas.map((pauta) => pauta.assunto).join(' · ')}
          >
            <FileText className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">
              {pautas.length > 1 ? `${pautas.length} posts · ` : ''}
              {pautas[0].assunto}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * A grade dos stories.
 *
 * Deliberadamente mais leve que a do calendário editorial: sem arrastar, sem
 * tags, sem status. Story se decide no dia e se grava no dia — a célula só
 * precisa responder "tem sequência pronta aqui?" e, se tiver, qual é o
 * assunto.
 */
export function GradeDeStories({
  reference,
  porDia,
  pautasPorDia,
  loading,
  onAbrirDia,
}: Props) {
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
          return (
            <CelulaDoDia
              key={chave}
              data={data}
              chave={chave}
              sequencias={porDia.get(chave) ?? []}
              pautas={pautasPorDia.get(chave) ?? []}
              hoje={isToday(data)}
              passado={isPast(data)}
              foraDoMes={!isSameMonth(data, reference)}
              onAbrirDia={onAbrirDia}
            />
          )
        })}
      </div>
    </div>
  )
}
