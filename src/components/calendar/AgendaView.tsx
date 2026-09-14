import { CalendarDays, Plus } from 'lucide-react'
import { CalendarItemCard } from '@/components/calendar/CalendarItemCard'
import { formatFullDay, isToday, parseDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  dayKeys: string[]
  itemsByDay: Map<string, CalendarItemWithRelations[]>
  onOpenDay: (dateKey: string) => void
}

/**
 * Fallback do grid mensal em telas pequenas: o mês vira uma agenda vertical,
 * dia a dia, mostrando apenas os dias que têm algo planejado (+ hoje).
 */
export function AgendaView({ dayKeys, itemsByDay, onOpenDay }: Props) {
  if (dayKeys.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Nenhum item neste mês</p>
          <p className="text-sm text-muted-foreground">Toque em um dia para começar o planejamento.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {dayKeys.map((dayKey) => {
        const items = itemsByDay.get(dayKey) ?? []
        const date = parseDateKey(dayKey)
        return (
          <li key={dayKey} className="glass-panel overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenDay(dayKey)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-foreground/[0.04]"
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-semibold tabular-nums',
                  isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-foreground/5',
                )}
              >
                {date.getDate()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{formatFullDay(date)}</span>
                <span className="block text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {items.length > 0 && (
              <div className="space-y-1.5 border-t border-white/20 p-3">
                {items.map((item) => (
                  <CalendarItemCard
                    key={item.id}
                    item={item}
                    compact={false}
                    draggable={false}
                    onClick={() => onOpenDay(dayKey)}
                  />
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
