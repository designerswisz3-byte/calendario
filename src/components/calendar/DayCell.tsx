import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { CalendarItemCard } from '@/components/calendar/CalendarItemCard'
import { isPast, isToday, isSameMonth, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  date: Date
  reference: Date
  items: CalendarItemWithRelations[]
  onOpenDay: (dateKey: string) => void
}

const MAX_VISIBLE = 3

export function DayCell({ date, reference, items, onOpenDay }: Props) {
  const dateKey = toDateKey(date)
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}`, data: { dateKey } })

  const outsideMonth = !isSameMonth(date, reference)
  const today = isToday(date)
  const passado = isPast(date)
  const visible = items.slice(0, MAX_VISIBLE)
  const hidden = items.length - visible.length

  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpenDay(dateKey)}
      role="button"
      tabIndex={0}
      aria-label={`Dia ${date.getDate()}${today ? ' (hoje)' : passado ? ' (já passou)' : ''}, ${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDay(dateKey)
        }
      }}
      className={cn(
        'group relative flex min-h-[7rem] cursor-pointer flex-col gap-1 rounded-lg border border-white/25 bg-white/40 p-1.5 transition-all duration-250 hover:border-primary/40 hover:bg-white/65 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]',
        /*
         * Três estados, do mais apagado ao mais forte: passado, futuro (o
         * padrão) e hoje. O escurecido do passado fica no FUNDO da célula, não
         * nos cards dentro dela — um item atrasado tem que continuar legível,
         * senão a sinalização esconde justamente o que precisa de atenção.
         */
        passado && 'border-slate-900/10 bg-slate-900/[0.07] dark:border-white/[0.06] dark:bg-black/35',
        today && 'border-primary/50 bg-white/75 ring-1 ring-primary/25 dark:bg-white/[0.10]',
        outsideMonth && 'opacity-45',
        isOver && 'border-primary bg-accent/70 ring-2 ring-primary/40 dark:bg-accent/40',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums transition-colors',
            today && 'bg-primary text-primary-foreground shadow-glass',
            !today && passado && 'text-muted-foreground/60',
            !today && !passado && 'text-muted-foreground',
          )}
        >
          {date.getDate()}
        </span>

        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <span className="rounded-full bg-foreground/10 px-1.5 text-[0.62rem] font-semibold tabular-nums text-muted-foreground">
              {items.length}
            </span>
          )}
          <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {visible.map((item) => (
          <div key={item.id} onClick={(event) => event.stopPropagation()}>
            <CalendarItemCard item={item} onClick={() => onOpenDay(dateKey)} />
          </div>
        ))}
        {hidden > 0 && (
          <span className="pl-1 text-[0.62rem] font-medium text-muted-foreground">
            +{hidden} {hidden === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>
    </div>
  )
}
