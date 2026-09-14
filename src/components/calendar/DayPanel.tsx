import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  ImageIcon,
  Pencil,
  PenSquare,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CalendarItemForm } from '@/components/calendar/CalendarItemForm'
import { StatusBadge } from '@/components/calendar/StatusBadge'
import { TypeIcon } from '@/components/calendar/TypeIcon'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { TYPE_LABEL } from '@/lib/constants'
import { formatFullDay, formatTime, parseDateKey } from '@/lib/date'
import {
  useCreateCalendarItem,
  useDeleteCalendarItem,
  useUpdateCalendarItem,
  type CalendarItemInput,
} from '@/hooks/useCalendarItems'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  dateKey: string | null
  items: CalendarItemWithRelations[]
  onOpenChange: (open: boolean) => void
}

/**
 * Painel do dia (drawer).
 *
 * Contém APENAS planejamento. A criação do conteúdo em si sai daqui para
 * /criar?calendar_item_id=<id> — nunca duplicamos legenda/upload/expert.
 */
export function DayPanel({ dateKey, items, onOpenChange }: Props) {
  const navigate = useNavigate()
  const createItem = useCreateCalendarItem()
  const updateItem = useUpdateCalendarItem()
  const deleteItem = useDeleteCalendarItem()

  const [adding, setAdding] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  // Ao trocar de dia, fecha qualquer formulário aberto.
  React.useEffect(() => {
    setAdding(false)
    setEditingId(null)
  }, [dateKey])

  const date = dateKey ? parseDateKey(dateKey) : null

  async function handleCreate(input: CalendarItemInput) {
    try {
      await createItem.mutateAsync(input)
      setAdding(false)
      toast({ variant: 'success', title: 'Item adicionado ao planejamento' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível adicionar', description: errorMessage(error) })
    }
  }

  async function handleUpdate(id: string, input: CalendarItemInput) {
    try {
      await updateItem.mutateAsync({ id, input })
      setEditingId(null)
      toast({ variant: 'success', title: 'Item atualizado' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível salvar', description: errorMessage(error) })
    }
  }

  async function handleDelete(item: CalendarItemWithRelations) {
    const confirmed = window.confirm(
      item.preview
        ? 'Excluir este item? O conteúdo criado continua existindo, mas perde o vínculo com o calendário.'
        : 'Excluir este item do planejamento?',
    )
    if (!confirmed) return

    try {
      await deleteItem.mutateAsync(item.id)
      toast({ variant: 'success', title: 'Item excluído' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: errorMessage(error) })
    }
  }

  /** Integração Parte 2 -> Parte 1. */
  function goToContent(item: CalendarItemWithRelations) {
    navigate(`/criar?calendar_item_id=${item.id}`)
  }

  return (
    <Sheet open={Boolean(dateKey)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{date ? formatFullDay(date) : ''}</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Nenhum item planejado ainda.'
              : `${items.length} ${items.length === 1 ? 'item planejado' : 'itens planejados'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-5 scrollbar-thin">
          {items.length === 0 && !adding && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarPlus className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">Dia livre</p>
                <p className="text-xs text-muted-foreground">
                  Comece pelo planejamento: tipo, status e a ideia central.
                </p>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            </div>
          )}

          {items.map((item) =>
            editingId === item.id ? (
              <CalendarItemForm
                key={item.id}
                dateKey={item.data}
                item={item}
                saving={updateItem.isPending}
                onCancel={() => setEditingId(null)}
                onSubmit={(input) => handleUpdate(item.id, input)}
              />
            ) : (
              <article key={item.id} className="glass space-y-3 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <TypeIcon tipo={item.tipo} />
                    {TYPE_LABEL[item.tipo]}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.horario && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.horario)}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingId(item.id)}
                      aria-label="Editar planejamento"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void handleDelete(item)}
                      aria-label="Excluir item"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        style={{ borderColor: `${tag.cor}55`, color: tag.cor }}
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.notas?.trim() && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.notas}</p>
                )}

                <Separator />

                {/* --- Conteúdo vinculado (Parte 1) --- */}
                {item.preview ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {item.preview.media_assets[0]?.tipo === 'imagem' ? (
                        <img
                          src={item.preview.media_assets[0].url_arquivo}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.preview.nome_expert}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {TYPE_LABEL[item.preview.tipo]} ·{' '}
                          {item.preview.media_assets.length}{' '}
                          {item.preview.media_assets.length === 1 ? 'mídia' : 'mídias'}
                        </p>
                      </div>
                      <Button variant="outline" size="icon-sm" asChild aria-label="Abrir preview público">
                        <a href={`/preview/${item.preview.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={() => goToContent(item)}>
                      <PenSquare className="h-4 w-4" />
                      Editar conteúdo
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => goToContent(item)}>
                    <Sparkles className="h-4 w-4" />
                    Criar conteúdo
                  </Button>
                )}
              </article>
            ),
          )}

          {adding && dateKey && (
            <CalendarItemForm
              dateKey={dateKey}
              saving={createItem.isPending}
              onCancel={() => setAdding(false)}
              onSubmit={handleCreate}
            />
          )}

          {!adding && items.length > 0 && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Adicionar item
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
