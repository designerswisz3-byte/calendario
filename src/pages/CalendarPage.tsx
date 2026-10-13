import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { AgendaView } from '@/components/calendar/AgendaView'
import { CalendarItemCard } from '@/components/calendar/CalendarItemCard'
import { DayPanel } from '@/components/calendar/DayPanel'
import { EMPTY_FILTERS, FiltersBar, type CalendarFilters } from '@/components/calendar/FiltersBar'
import { ListView } from '@/components/calendar/ListView'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { MonthProgress } from '@/components/calendar/MonthProgress'
import { LegendaDeEventos } from '@/components/calendar/LegendaDeEventos'
import { Teleprompter } from '@/components/calendar/Teleprompter'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import {
  addMonths,
  buildMonthGrid,
  endOfMonth,
  formatMonthTitle,
  formatShortDate,
  startOfMonth,
  toDateKey,
  todayKey,
} from '@/lib/date'
import { useCalendarItems, useMoveCalendarItem } from '@/hooks/useCalendarItems'
import { TYPE_LABEL } from '@/lib/constants'
import { useTags } from '@/hooks/useTags'
import { useEventos, useImportarCatalogo } from '@/hooks/useEventos'
import { eventosPorDia } from '@/lib/eventos'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { CalendarItemWithRelations } from '@/types/database'

type ViewMode = 'calendario' | 'lista'

export default function CalendarPage() {
  const [reference, setReference] = React.useState(() => startOfMonth(new Date()))
  const [view, setView] = React.useState<ViewMode>('calendario')
  const [filters, setFilters] = React.useState<CalendarFilters>(EMPTY_FILTERS)
  const [openDayKey, setOpenDayKey] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState<CalendarItemWithRelations | null>(null)
  const [prompter, setPrompter] = React.useState<CalendarItemWithRelations | null>(null)
  // De onde o teleprompter foi aberto, para devolver o painel ao fechar.
  const diaAntesDoPrompter = React.useRef<string | null>(null)

  /*
   * A janela de eventos é a da GRADE, não a do mês: as células das pontas são
   * dias do mês vizinho, e uma Black Friday que cai numa delas tem de aparecer
   * ali também. Buscar só o mês deixaria buraco visível na primeira e na
   * última linha.
   */
  const grade = React.useMemo(() => buildMonthGrid(reference), [reference])
  const janela = React.useMemo(() => {
    const dias = grade.flat()
    return { de: toDateKey(dias[0]), ate: toDateKey(dias[dias.length - 1]) }
  }, [grade])

  const { data: items = [], isLoading, isError, error } = useCalendarItems(reference)
  const { data: eventos = [] } = useEventos(janela.de, janela.ate)
  const importarCatalogo = useImportarCatalogo()
  const { data: tags = [] } = useTags()
  const moveItem = useMoveCalendarItem()
  const isCompact = useMediaQuery('(max-width: 767px)')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  React.useEffect(() => {
    if (isError) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível carregar o calendário',
        description: errorMessage(error),
      })
    }
  }, [isError, error])

  // Itens do mês de referência (sem os dias vizinhos), para progresso e lista.
  const monthStartKey = toDateKey(startOfMonth(reference))
  const monthEndKey = toDateKey(endOfMonth(reference))
  const monthItems = React.useMemo(
    () => items.filter((item) => item.data >= monthStartKey && item.data <= monthEndKey),
    [items, monthStartKey, monthEndKey],
  )

  const filtered = React.useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return items.filter((item) => {
      if (filters.tipos.length && !filters.tipos.includes(item.tipo)) return false
      if (filters.statuses.length && !filters.statuses.includes(item.status)) return false
      if (filters.tagIds.length && !item.tags.some((tag) => filters.tagIds.includes(tag.id))) {
        return false
      }
      if (term) {
        const haystack = [item.preview?.nome_expert ?? '', item.notas ?? '', item.roteiro ?? '']
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [items, filters])

  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarItemWithRelations[]>()
    filtered.forEach((item) => {
      const list = map.get(item.data)
      if (list) list.push(item)
      else map.set(item.data, [item])
    })
    return map
  }, [filtered])

  const filteredMonthItems = React.useMemo(
    () => filtered.filter((item) => item.data >= monthStartKey && item.data <= monthEndKey),
    [filtered, monthStartKey, monthEndKey],
  )

  // Agenda (mobile): dias do mês com algo + o dia de hoje, em ordem.
  const agendaDayKeys = React.useMemo(() => {
    const keys = new Set(filteredMonthItems.map((item) => item.data))
    const today = todayKey()
    if (today >= monthStartKey && today <= monthEndKey) keys.add(today)
    return [...keys].sort()
  }, [filteredMonthItems, monthStartKey, monthEndKey])

  const eventosDoDia = React.useMemo(() => eventosPorDia(eventos), [eventos])

  // Para a legenda: só as datas do mês de referência, sem as pontas da grade.
  const eventosDoMes = React.useMemo(
    () => eventos.filter((evento) => evento.data <= monthEndKey && (evento.data_fim ?? evento.data) >= monthStartKey),
    [eventos, monthStartKey, monthEndKey],
  )

  const openDayItems = openDayKey ? (itemsByDay.get(openDayKey) ?? []) : []
  const openDayEventos = openDayKey ? (eventosDoDia.get(openDayKey) ?? []) : []

  async function handleImportarCatalogo() {
    try {
      const total = await importarCatalogo.mutateAsync()
      toast({ variant: 'success', title: `${total} datas no calendário` })
    } catch (importError) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível carregar o catálogo',
        description: errorMessage(importError),
      })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current?.item as CalendarItemWithRelations) ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const item = dragging
    setDragging(null)

    const targetKey = event.over?.data.current?.dateKey as string | undefined
    if (!item || !targetKey || targetKey === item.data) return

    try {
      // Só a data muda: o vínculo com o conteúdo criado vai junto.
      await moveItem.mutateAsync({ id: item.id, data: targetKey })
    } catch (mutationError) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível mover o item',
        description: errorMessage(mutationError),
      })
    }
  }

  return (
    <div className="space-y-5">
      {/* ---------- Cabeçalho do mês ---------- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReference((current) => addMonths(current, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReference((current) => addMonths(current, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {formatMonthTitle(reference)}
        </h1>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setReference(startOfMonth(new Date()))}
          className="hidden sm:inline-flex"
        >
          Hoje
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="calendario">
                <CalendarDays />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="lista">
                <List />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" onClick={() => setOpenDayKey(todayKey())}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo item</span>
          </Button>
        </div>
      </div>

      {/* ---------- Progresso do mês ---------- */}
      {isLoading ? <Skeleton className="h-[5.5rem] rounded-xl" /> : <MonthProgress items={monthItems} />}

      {/* ---------- Datas do setor e do calendário comercial ---------- */}
      <LegendaDeEventos
        total={eventosDoMes.length}
        importando={importarCatalogo.isPending}
        onImportar={handleImportarCatalogo}
      />

      {/* ---------- Filtros ---------- */}
      <FiltersBar filters={filters} onChange={setFilters} tags={tags} />

      {/* ---------- Conteúdo ---------- */}
      {view === 'lista' ? (
        isLoading ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <ListView items={filteredMonthItems} onOpenDay={setOpenDayKey} />
        )
      ) : isCompact ? (
        isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <AgendaView dayKeys={agendaDayKeys} itemsByDay={itemsByDay} onOpenDay={setOpenDayKey} />
        )
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <MonthGrid
            reference={reference}
            itemsByDay={itemsByDay}
            eventosPorDia={eventosDoDia}
            loading={isLoading}
            onOpenDay={setOpenDayKey}
          />
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="w-44 rotate-2 opacity-95">
                <CalendarItemCard item={dragging} draggable={false} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ---------- Painel do dia ---------- */}
      <DayPanel
        dateKey={openDayKey}
        items={openDayItems}
        eventos={openDayEventos}
        onOpenChange={(open) => {
          if (!open) setOpenDayKey(null)
        }}
        onAbrirTeleprompter={(item) => {
          // Fecha o painel: o teleprompter é tela cheia, e o overlay modal do
          // Sheet bloquearia os cliques nos controles dele.
          diaAntesDoPrompter.current = openDayKey
          setOpenDayKey(null)
          setPrompter(item)
        }}
      />

      <Teleprompter
        aberto={Boolean(prompter)}
        onOpenChange={(aberto) => {
          if (aberto) return
          setPrompter(null)
          // Devolve o painel do dia de onde o roteiro veio.
          setOpenDayKey(diaAntesDoPrompter.current)
          diaAntesDoPrompter.current = null
        }}
        roteiro={prompter?.roteiro ?? ''}
        titulo={
          prompter
            ? `${TYPE_LABEL[prompter.tipo]} · ${formatShortDate(prompter.data)}`
            : undefined
        }
      />
    </div>
  )
}
