import { STATUS_LABEL } from '@/lib/constants'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  items: CalendarItemWithRelations[]
}

/** "12 publicados / 20 planejados" + barra de progresso do mês. */
export function MonthProgress({ items }: Props) {
  const total = items.length
  const publicados = items.filter((item) => item.status === 'publicado').length
  const aprovados = items.filter((item) => item.status === 'aprovado' || item.status === 'agendado').length
  const percent = total === 0 ? 0 : Math.round((publicados / total) * 100)

  return (
    <div className="glass-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">
            <span className="text-lg font-semibold tabular-nums text-primary">{publicados}</span>{' '}
            <span className="text-muted-foreground">publicados</span>{' '}
            <span className="text-muted-foreground">/</span>{' '}
            <span className="text-lg font-semibold tabular-nums">{total}</span>{' '}
            <span className="text-muted-foreground">planejados</span>
          </p>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-foreground/10"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do mês"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <dl className="flex shrink-0 gap-4 text-xs">
        <div>
          <dt className="text-muted-foreground">{STATUS_LABEL.aprovado} / {STATUS_LABEL.agendado}</dt>
          <dd className="text-base font-semibold tabular-nums">{aprovados}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Com conteúdo</dt>
          <dd className="text-base font-semibold tabular-nums">
            {items.filter((item) => item.preview).length}
          </dd>
        </div>
      </dl>
    </div>
  )
}
