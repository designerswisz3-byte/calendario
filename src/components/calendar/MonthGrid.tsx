import { DayCell } from '@/components/calendar/DayCell'
import { Skeleton } from '@/components/ui/skeleton'
import { WEEKDAYS_SHORT } from '@/lib/constants'
import { buildMonthGrid, toDateKey } from '@/lib/date'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  reference: Date
  itemsByDay: Map<string, CalendarItemWithRelations[]>
  loading?: boolean
  onOpenDay: (dateKey: string) => void
}

export function MonthGrid({ reference, itemsByDay, loading, onOpenDay }: Props) {
  const weeks = buildMonthGrid(reference)

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS_SHORT.map((day) => (
            <span key={day} className="weekday-label text-center">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, index) => (
            <Skeleton key={index} className="min-h-[7rem] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS_SHORT.map((day) => (
          <span key={day} className="weekday-label text-center">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weeks.flat().map((date) => {
          const key = toDateKey(date)
          return (
            <DayCell
              key={key}
              date={date}
              reference={reference}
              items={itemsByDay.get(key) ?? []}
              onOpenDay={onOpenDay}
            />
          )
        })}
      </div>
    </div>
  )
}
