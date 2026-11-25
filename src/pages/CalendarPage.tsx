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
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  MonitorPlay,
  Plus,
  ScrollText,
} from 'lucide-react'
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
import { Gaveta } from '@/components/gaveta/Gaveta'
import { VisorDaGaveta } from '@/components/gaveta/VisorDaGaveta'
import { EditorDoItemGuardado } from '@/components/gaveta/EditorDoItemGuardado'
import { ConteudoDoItem } from '@/components/calendar/ConteudoDoItem'
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
import {
  useCalendarItems,
  useGavetaDoCalendario,
  useGuardarNaGaveta,
  useMoveCalendarItem,
  useUpdateCalendarItem,
} from '@/hooks/useCalendarItems'
import { TYPE_LABEL } from '@/lib/constants'
import { resumoDoRoteiro, tituloDoItem } from '@/lib/texto'
import { cn } from '@/lib/utils'
import { useTags } from '@/hooks/useTags'
import { useEventos, useImportarCatalogo } from '@/hooks/useEventos'
import { eventosPorDia } from '@/lib/eventos'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { CalendarItemWithRelations, TipoDeGaveta } from '@/types/database'

type ViewMode = 'calendario' | 'lista'

export default function CalendarPage() {
  const [reference, setReference] = React.useState(() => startOfMonth(new Date()))
  const [view, setView] = React.useState<ViewMode>('calendario')
  const [filters, setFilters] = React.useState<CalendarFilters>(EMPTY_FILTERS)
  const [openDayKey, setOpenDayKey] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState<CalendarItemWithRelations | null>(null)
  const [prompter, setPrompter] = React.useState<CalendarItemWithRelations | null>(null)
  /*
   * A ideia aberta para leitura, guardada por ID e não por objeto.
   *
   * Pelo objeto, o modal mostraria a cópia congelada no clique: devolver a
   * ideia para hoje enquanto ela está aberta atualizaria a gaveta e não o que
   * está na tela. Pelo id, o conteúdo sai sempre da lista atual.
   */
  const [ideiaAberta, setIdeiaAberta] = React.useState<string | null>(null)
  /*
   * Editando o item aberto, em vez de só lendo.
   *
   * "Há alteração não salva" fica numa ref e não em estado: quem precisa saber
   * é só o gesto de fechar, e um estado redesenharia a página do calendário
   * inteira a cada tecla digitada no roteiro.
   */
  const [editandoGuardado, setEditandoGuardado] = React.useState(false)
  const edicaoSuja = React.useRef(false)
  const marcarEdicao = React.useCallback((haAlteracao: boolean) => {
    edicaoSuja.current = haAlteracao
  }, [])
  const formDaEdicao = React.useId()
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

  const { data: gaveta = [] } = useGavetaDoCalendario()
  /*
   * Uma busca, duas listas.
   *
   * As duas gavetas saem da mesma consulta (tudo que tem `na_gaveta`) e são
   * separadas aqui. Duas consultas dobrariam as idas ao banco e criariam um
   * instante, a cada arrasto entre elas, em que o item estaria nas duas ou em
   * nenhuma.
   *
   * `gaveta` ausente vale ideias: é o que acontece com tudo que foi guardado
   * antes de a segunda gaveta existir, e num banco que ainda não rodou a
   * migração.
   */
  const ideiasSoltas = React.useMemo(
    () => gaveta.filter((item) => (item.gaveta ?? 'ideias') === 'ideias'),
    [gaveta],
  )
  const roteirosProntos = React.useMemo(
    () => gaveta.filter((item) => item.gaveta === 'roteiros'),
    [gaveta],
  )
  const guardar = useGuardarNaGaveta()
  const atualizarGuardado = useUpdateCalendarItem()

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

  /**
   * A volta sem arrastar.
   *
   * Existe por dois motivos: no celular a grade vira agenda e não tem
   * arrasto nenhum, e mesmo no desktop arrastar da gaveta até um dia
   * específico é um gesto chato quando a resposta é "é para hoje".
   */
  /*
   * O item aberto sai da gaveta ATUAL, a cada render.
   *
   * Some sozinho quando a ideia deixa a gaveta — devolvida aqui, arrastada
   * para um dia, ou apagada noutra aba. Guardar o objeto no estado deixaria o
   * modal aberto mostrando uma ideia que não está mais lá.
   */
  const itemDaGavetaAberto = gaveta.find((item) => item.id === ideiaAberta) ?? null

  /*
   * Sem item aberto, não há edição em curso.
   *
   * Cobre o caso em que o item some por baixo do visor (apagado noutra aba,
   * devolvido para a grade): sem isto, o próximo card clicado abriria direto
   * no modo de edição, herdado de um item que nem existe mais.
   */
  const temItemAberto = itemDaGavetaAberto !== null
  React.useEffect(() => {
    if (temItemAberto) return
    setEditandoGuardado(false)
    edicaoSuja.current = false
  }, [temItemAberto])

  /** Texto digitado e não salvo não some num clique fora da janela. */
  function podeDescartarEdicao() {
    return (
      !editandoGuardado ||
      !edicaoSuja.current ||
      window.confirm('Descartar as alterações que você ainda não salvou?')
    )
  }

  function fecharVisor() {
    if (!podeDescartarEdicao()) return
    setEditandoGuardado(false)
    edicaoSuja.current = false
    setIdeiaAberta(null)
  }

  function cancelarEdicao() {
    if (!podeDescartarEdicao()) return
    setEditandoGuardado(false)
    edicaoSuja.current = false
  }

  async function salvarEdicao(id: string, texto: { notas: string; roteiro: string }) {
    try {
      await atualizarGuardado.mutateAsync({ id, input: texto })
      // Volta para a leitura, com o texto novo: é a confirmação de que salvou
      // — e deixa o teleprompter a um clique, que é o passo seguinte natural.
      edicaoSuja.current = false
      setEditandoGuardado(false)
      toast({ variant: 'success', title: 'Roteiro salvo', description: 'O item continua guardado na gaveta.' })
    } catch (mutationError) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: errorMessage(mutationError),
      })
    }
  }

  async function devolverParaHoje(item: CalendarItemWithRelations) {
    try {
      await guardar.mutateAsync({ id: item.id, guardar: false, data: todayKey() })
      toast({ title: 'Devolvido para hoje' })
    } catch (mutationError) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível devolver o item',
        description: errorMessage(mutationError),
      })
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const item = dragging
    setDragging(null)
    if (!item) return

    const alvo = event.over?.data.current
    const targetKey = alvo?.dateKey as string | undefined
    const paraGaveta = alvo?.gaveta === true
    const destino: TipoDeGaveta = alvo?.tipo === 'roteiros' ? 'roteiros' : 'ideias'
    const origem: TipoDeGaveta = item.gaveta ?? 'ideias'

    /*
     * Três destinos possíveis, e os dois que importam são os de ida e volta:
     * soltar na gaveta guarda, soltar num dia devolve para aquele dia. Soltar
     * no mesmo dia não faz nada — e sair de dentro da gaveta para a gaveta
     * também não, senão um arrasto sem querer reescreveria `atualizado_em` e
     * embaralharia a ordem da lista.
     */
    if (paraGaveta) {
      // Soltar na MESMA gaveta de onde saiu não faz nada. Entre as duas, move:
      // é assim que a ideia que ganhou roteiro muda de lugar sem passar pela
      // grade.
      if (item.na_gaveta && origem === destino) return
      try {
        await guardar.mutateAsync({
          id: item.id,
          guardar: true,
          // O campo só viaja quando é necessário: indo para os roteiros, ou
          // voltando de lá para as ideias. Ver o porquê em useGuardarNaGaveta.
          gaveta: destino === 'roteiros' || origem === 'roteiros' ? destino : undefined,
        })
        toast(
          destino === 'roteiros'
            ? {
                title: 'Guardado em roteiros prontos',
                description: item.roteiro?.trim()
                  ? 'Fica aqui até o dia de gravar. Clique para ler ou abrir no teleprompter.'
                  : 'Este item ainda não tem roteiro escrito — só o briefing foi junto.',
              }
            : {
                title: 'Guardado nas ideias soltas',
                description: 'Sai da grade e continua com briefing, roteiro e etiquetas.',
              },
        )
      } catch (mutationError) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível guardar o item',
          description: errorMessage(mutationError),
        })
      }
      return
    }

    if (!targetKey) return

    if (item.na_gaveta) {
      try {
        await guardar.mutateAsync({ id: item.id, guardar: false, data: targetKey })
        toast({
          title: `Devolvido para ${formatShortDate(targetKey)}`,
        })
      } catch (mutationError) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível devolver o item',
          description: errorMessage(mutationError),
        })
      }
      return
    }

    if (targetKey === item.data) return

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
      ) : (
        /*
         * O DndContext envolve as duas vistas, não só a grade.
         *
         * No celular não existe arrasto (a agenda não tem card arrastável),
         * mas a GAVETA existe nas duas — e ela precisa do contexto para o alvo
         * de soltura funcionar. Sem isso, a pessoa no celular não teria como
         * nem ver o que guardou.
         */
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              {isCompact ? (
                isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <AgendaView
                    dayKeys={agendaDayKeys}
                    itemsByDay={itemsByDay}
                    onOpenDay={setOpenDayKey}
                  />
                )
              ) : (
                <MonthGrid
                  reference={reference}
                  itemsByDay={itemsByDay}
                  eventosPorDia={eventosDoDia}
                  loading={isLoading}
                  onOpenDay={setOpenDayKey}
                />
              )}
            </div>

            {/*
              As duas gavetas, lado a lado.

              Ideias soltas guarda o que ainda NÃO está pronto; roteiros prontos
              guarda o que só espera o dia de gravar. Juntas na mesma lista,
              elas estragariam as duas perguntas que respondem: "o que eu gravo
              hoje, se sobrar uma hora?" exigiria caçar os prontos no meio dos
              rascunhos.

              Abaixo de `xl` a grade já ocupa a largura toda, e as duas ficam
              em duas colunas embaixo dela. De `xl` para cima viram uma faixa
              lateral de largura fixa — mais estreita por gaveta do que a
              gaveta única era, para a grade do mês não pagar a conta inteira.
            */}
            <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[24rem] xl:items-start 2xl:w-[28rem]">
              <Gaveta
                id="gaveta-calendario"
                titulo="Ideias soltas"
                explicacao="Arraste para cá o item que você não vai usar no dia. Ele sai da grade e fica guardado com briefing, roteiro e etiquetas. Para usar depois, arraste de volta para um dia."
                quantidade={ideiasSoltas.length}
                className="xl:w-full"
              >
                {ideiasSoltas.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    {/*
                      * O clique ABRE a leitura, não o painel do dia.
                      *
                      * O painel do dia seria a escolha errada e por um motivo
                      * concreto: ele mostra um dia, e este item não está em
                      * dia nenhum — saiu da grade quando foi guardado. Abriria
                      * um dia antigo sem o item dentro.
                      *
                      * O visor mostra o que está escrito e deixa a decisão
                      * para depois da leitura. A gaveta continua sendo guarda:
                      * para EDITAR, a ideia volta para um dia.
                      */}
                    <CalendarItemCard item={item} onClick={() => setIdeiaAberta(item.id)} />
                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-[0.6rem] text-muted-foreground">
                        de {formatShortDate(item.data)}
                      </span>
                      <button
                        type="button"
                        className="ml-auto rounded px-1 text-[0.6rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={() => devolverParaHoje(item)}
                      >
                        usar hoje
                      </button>
                    </div>
                  </div>
                ))}
              </Gaveta>

              <Gaveta
                id="gaveta-roteiros"
                tipo="roteiros"
                icone={ScrollText}
                unidade={['roteiro', 'roteiros']}
                titulo="Roteiros prontos"
                explicacao="Arraste para cá o item que já tem roteiro escrito e só espera o dia de gravar. Ele sai da grade e fica à mão. No dia, arraste de volta — ou abra direto no teleprompter."
                quantidade={roteirosProntos.length}
                className="xl:w-full"
              >
                {roteirosProntos.map((item) => {
                  const resumo = resumoDoRoteiro(item.roteiro)
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <CalendarItemCard item={item} onClick={() => setIdeiaAberta(item.id)} />
                      <div className="flex items-center gap-1 pl-1">
                        {/*
                          * O tamanho do roteiro no lugar da data de origem.
                          *
                          * Na gaveta de ideias a pergunta é "de quando é
                          * isto?". Aqui é "cabe na hora que eu tenho hoje?" —
                          * e quem responde é a duração, não a data.
                          *
                          * Sem roteiro, a linha diz isso em vez de ficar
                          * vazia: nada impede guardar aqui um item só com
                          * briefing, mas ele não pode se passar por pronto.
                          */}
                        <span
                          className={cn(
                            'truncate text-[0.6rem] text-muted-foreground',
                            !resumo && 'text-amber-600 dark:text-amber-500',
                          )}
                        >
                          {resumo || 'sem roteiro escrito'}
                        </span>
                        <button
                          type="button"
                          className="ml-auto shrink-0 rounded px-1 text-[0.6rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          onClick={() => devolverParaHoje(item)}
                        >
                          gravar hoje
                        </button>
                      </div>
                    </div>
                  )
                })}
              </Gaveta>
            </div>
          </div>
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

      {/* ---------- Leitura de uma ideia guardada ---------- */}
      {itemDaGavetaAberto && (
        <VisorDaGaveta
          aberto
          onFechar={fecharVisor}
          onEditar={() => setEditandoGuardado(true)}
          rodape={
            editandoGuardado ? (
              <>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Ctrl + Enter salva. O item continua na gaveta.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelarEdicao}
                    disabled={atualizarGuardado.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    form={formDaEdicao}
                    disabled={atualizarGuardado.isPending}
                  >
                    {atualizarGuardado.isPending ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </>
            ) : undefined
          }
          titulo={tituloDoItem(itemDaGavetaAberto, TYPE_LABEL[itemDaGavetaAberto.tipo])}
          guardadaDe={itemDaGavetaAberto.data}
          gaveta={itemDaGavetaAberto.gaveta === 'roteiros' ? 'roteiros prontos' : 'ideias soltas'}
          acoes={
            /*
             * Teleprompter direto da gaveta, sem devolver o item para a grade.
             *
             * É o caso de uso inteiro dos roteiros prontos: sobrou meia hora,
             * abre a gaveta, escolhe pelo tempo de fala e grava. Obrigar a
             * arrastar para um dia antes de ler no teleprompter poria três
             * passos entre a decisão e a gravação.
             */
            itemDaGavetaAberto.roteiro?.trim() ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const item = itemDaGavetaAberto
                  // O teleprompter é tela cheia; o visor aberto por baixo
                  // seguraria os cliques dos controles dele.
                  setIdeiaAberta(null)
                  diaAntesDoPrompter.current = null
                  setPrompter(item)
                }}
              >
                <MonitorPlay className="mr-1.5 h-3.5 w-3.5" />
                Teleprompter
              </Button>
            ) : undefined
          }
          onUsarHoje={() => {
            // Fecha ANTES de devolver: a ideia sai da gaveta e o visor
            // perderia o item debaixo de si, piscando vazio por um quadro.
            setIdeiaAberta(null)
            void devolverParaHoje(itemDaGavetaAberto)
          }}
        >
          {editandoGuardado ? (
            <EditorDoItemGuardado
              // Um editor por item: trocar de item não pode herdar o texto
              // digitado para o anterior.
              key={itemDaGavetaAberto.id}
              item={itemDaGavetaAberto}
              formId={formDaEdicao}
              salvando={atualizarGuardado.isPending}
              onMudou={marcarEdicao}
              onSalvar={(texto) => void salvarEdicao(itemDaGavetaAberto.id, texto)}
            />
          ) : (
            <ConteudoDoItem item={itemDaGavetaAberto} />
          )}
        </VisorDaGaveta>
      )}
    </div>
  )
}
