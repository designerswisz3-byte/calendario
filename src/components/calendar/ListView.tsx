import { ExternalLink, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/calendar/StatusBadge'
import { TypeIcon } from '@/components/calendar/TypeIcon'
import { tituloDoItem } from '@/lib/texto'
import { cn } from '@/lib/utils'
import { TYPE_LABEL } from '@/lib/constants'
import { formatShortDate, formatTime } from '@/lib/date'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  items: CalendarItemWithRelations[]
  onOpenDay: (dateKey: string) => void
}

/** Visualização em tabela de todos os itens do mês, ordenados por data. */
export function ListView({ items, onOpenDay }: Props) {
  if (items.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Inbox className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Nenhum item encontrado</p>
          <p className="text-sm text-muted-foreground">
            Ajuste os filtros ou adicione conteúdo ao planejamento do mês.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left">
              <th className="weekday-label px-4 py-3">Data</th>
              <th className="weekday-label px-4 py-3">Tipo</th>
              <th className="weekday-label px-4 py-3">Conteúdo</th>
              <th className="weekday-label px-4 py-3">Status</th>
              <th className="weekday-label px-4 py-3">Tags</th>
              <th className="weekday-label px-4 py-3 text-right">Preview</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onOpenDay(item.data)}
                className="cursor-pointer border-b border-white/10 transition-colors duration-200 last:border-0 hover:bg-foreground/[0.04]"
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {formatShortDate(item.data)}
                  {item.horario && (
                    <span className="ml-2 text-xs text-muted-foreground">{formatTime(item.horario)}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <TypeIcon tipo={item.tipo} />
                    {TYPE_LABEL[item.tipo]}
                  </span>
                </td>
                <td className="max-w-[18rem] px-4 py-3">
                  <span className="flex items-center gap-2">
                    {item.preview?.media_assets[0]?.tipo === 'imagem' && (
                      <img
                        src={item.preview.media_assets[0].url_arquivo}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded object-cover"
                      />
                    )}
                    <span
                      className={cn(
                        'truncate',
                        item.notas?.trim() ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {tituloDoItem(item, 'Sem briefing')}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        style={{ borderColor: `${tag.cor}55`, color: tag.cor }}
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {item.preview ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      asChild
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Abrir link de preview"
                    >
                      <a href={`/preview/${item.preview.id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
