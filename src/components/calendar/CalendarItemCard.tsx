import { useDraggable } from '@dnd-kit/core'
import { Clock, ImageIcon } from 'lucide-react'
import { TypeIcon } from '@/components/calendar/TypeIcon'
import { STATUS_DOT, TYPE_LABEL } from '@/lib/constants'
import { formatTime } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  item: CalendarItemWithRelations
  onClick?: () => void
  /** Compacto = dentro da célula do dia no grid mensal. */
  compact?: boolean
  draggable?: boolean
}

export function CalendarItemCard({ item, onClick, compact = true, draggable = true }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: !draggable,
    data: { item },
  })

  const thumb = item.preview?.media_assets.find((asset) => asset.tipo === 'imagem')?.url_arquivo
  const time = formatTime(item.horario)

  // O ícone e a linha de meta já mostram o tipo — o título prioriza o que
  // identifica o item: o expert do conteúdo criado ou a ideia anotada.
  const title =
    item.preview?.nome_expert ?? item.notas?.trim().split('\n')[0] ?? TYPE_LABEL[item.tipo]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group w-full cursor-pointer rounded-md border border-white/25 bg-white/55 text-left transition-all duration-200 hover:border-primary/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10',
        isDragging && 'opacity-40',
        compact ? 'p-1.5' : 'p-2.5',
      )}
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className={cn('shrink-0 rounded object-cover', compact ? 'h-5 w-5' : 'h-9 w-9')}
          />
        ) : item.preview ? (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded bg-foreground/10 text-muted-foreground',
              compact ? 'h-5 w-5' : 'h-9 w-9',
            )}
          >
            <ImageIcon className="h-3 w-3" />
          </span>
        ) : (
          <TypeIcon tipo={item.tipo} className="shrink-0 text-muted-foreground" />
        )}

        <span className={cn('min-w-0 flex-1 truncate font-medium', compact ? 'text-[0.7rem]' : 'text-sm')}>
          {title}
        </span>

        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[item.status])}
          aria-hidden
        />
      </div>

      {!compact && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TypeIcon tipo={item.tipo} />
            {TYPE_LABEL[item.tipo]}
          </span>
          {time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          )}
        </div>
      )}

      {compact && time && (
        <span className="mt-0.5 block text-[0.62rem] tabular-nums text-muted-foreground">{time}</span>
      )}
    </div>
  )
}
