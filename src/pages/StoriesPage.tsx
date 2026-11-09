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
import { Check, ChevronLeft, ChevronRight, Clapperboard, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { CartaoDeSequencia } from '@/components/stories/CartaoDeSequencia'
import { ConteudoDaSequencia } from '@/components/stories/ConteudoDaSequencia'
import { BancoDeReferencias } from '@/components/stories/BancoDeReferencias'
import { sequenciaSalvaEmTexto } from '@/lib/stories/texto'
import { VisorDaGaveta } from '@/components/gaveta/VisorDaGaveta'
import { Gaveta } from '@/components/gaveta/Gaveta'
import { GradeDeStories } from '@/components/stories/GradeDeStories'
import {
  PainelDeStories,
  type RascunhoDeSequencia,
} from '@/components/stories/PainelDeStories'
import { subirAnexo, urlAssinada } from '@/lib/notasAnexos'
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
import { pautaDaPostagem, type PautaDoDia } from '@/lib/stories/pautas'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCalendarItems } from '@/hooks/useCalendarItems'
import { useEventos } from '@/hooks/useEventos'
import { useNoticias } from '@/hooks/useNoticias'
import {
  useExcluirReferencia,
  useReferencias,
  useSalvarLegendaDaReferencia,
  useSubirReferencia,
} from '@/hooks/useReferencias'
import {
  useCriarSequencia,
  useExcluirSequencia,
  useGavetaDeStories,
  useGuardarSequencia,
  useSalvarSequencia,
  useStoriesDoMes,
} from '@/hooks/useStories'
import type { StorySequenciaRow } from '@/types/database'

export default function StoriesPage() {
  const { user } = useAuth()
  const [referencia, setReferencia] = React.useState(() => startOfMonth(new Date()))
  const [diaAberto, setDiaAberto] = React.useState<string | null>(null)
  const [rascunho, setRascunho] = React.useState<RascunhoDeSequencia | null>(null)
  const [urlDaImagem, setUrlDaImagem] = React.useState<string | null>(null)
  const [subindoImagem, setSubindoImagem] = React.useState(false)

  const janela = React.useMemo(() => {
    const dias = buildMonthGrid(referencia).flat()
    return { de: toDateKey(dias[0]), ate: toDateKey(dias[dias.length - 1]) }
  }, [referencia])

  const { data: sequencias = [], isLoading } = useStoriesDoMes(janela.de, janela.ate)
  const { data: eventos = [] } = useEventos(janela.de, janela.ate)
  const { data: noticias = [] } = useNoticias()
  // A mesma query do calendário editorial — o cache é compartilhado por mês,
  // então abrir Stories depois do Calendário não vai ao banco de novo.
  const { data: postagens = [] } = useCalendarItems(referencia)
  const { data: gaveta = [] } = useGavetaDeStories()
  /*
   * A sequência aberta para leitura, guardada por ID e não por objeto: pelo
   * objeto, o modal mostraria a cópia congelada no clique, e devolver a ideia
   * para hoje enquanto ela está aberta não se refletiria na tela.
   */
  const [sequenciaAberta, setSequenciaAberta] = React.useState<string | null>(null)
  // Sai da gaveta ATUAL: some sozinha quando a sequência deixa a gaveta.
  const daGavetaAberta = gaveta.find((s) => s.id === sequenciaAberta) ?? null
  const [copiada, setCopiada] = React.useState(false)

  /* ---------------------------------------------------- referências ------ */
  /*
   * `banco`, e não `referencias`: neste arquivo `referencia` já é o MÊS de
   * referência da grade, e duas coisas com nomes a uma letra de distância no
   * mesmo componente é uma troca esperando acontecer na próxima edição.
   */
  const { data: banco = [], isLoading: carregandoBanco } = useReferencias()
  const subirReferencia = useSubirReferencia()
  const legendaDaReferencia = useSalvarLegendaDaReferencia()
  const excluirReferencia = useExcluirReferencia()

  async function aoSubirReferencias(arquivos: File[]) {
    /*
     * Uma imagem que falha não derruba as outras do mesmo lote.
     *
     * Colar três prints e perder os três porque o segundo estourou o limite do
     * bucket é o pior desfecho: dois já tinham subido. Cada um é tratado por
     * si, e o que não entrou vira um aviso nomeando o problema.
     */
    for (const arquivo of arquivos) {
      try {
        await subirReferencia.mutateAsync({ arquivo })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Não consegui salvar a referência',
          description: errorMessage(error),
        })
      }
    }
  }

  async function copiarSequencia(sequencia: StorySequenciaRow) {
    try {
      await navigator.clipboard.writeText(
        sequenciaSalvaEmTexto(sequencia.titulo, sequencia.stories ?? [], sequencia.observacao),
      )
      setCopiada(true)
      setTimeout(() => setCopiada(false), 1800)
    } catch {
      // Área de transferência bloqueada pelo navegador. O texto continua à
      // vista no visor, então falhar aqui não impede ninguém de nada.
      toast({
        variant: 'destructive',
        title: 'Não consegui copiar',
        description: 'O navegador bloqueou o acesso à área de transferência.',
      })
    }
  }
  const guardar = useGuardarSequencia()
  const [arrastando, setArrastando] = React.useState<StorySequenciaRow | null>(null)
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const criar = useCriarSequencia()
  const salvar = useSalvarSequencia()
  const excluir = useExcluirSequencia()

  const pautasPorDia = React.useMemo(() => {
    const mapa = new Map<string, PautaDoDia[]>()
    for (const item of postagens) {
      const lista = mapa.get(item.data)
      const pauta = pautaDaPostagem(item)
      if (lista) lista.push(pauta)
      else mapa.set(item.data, [pauta])
    }
    return mapa
  }, [postagens])

  const pautasDoDia = React.useMemo(
    () => (diaAberto ? (pautasPorDia.get(diaAberto) ?? []) : []),
    [pautasPorDia, diaAberto],
  )

  const porDia = React.useMemo(() => {
    const mapa = new Map<string, StorySequenciaRow[]>()
    for (const sequencia of sequencias) {
      const lista = mapa.get(sequencia.data)
      if (lista) lista.push(sequencia)
      else mapa.set(sequencia.data, [sequencia])
    }
    return mapa
  }, [sequencias])

  /*
   * O contexto que alimenta as sugestões.
   *
   * São as datas do mês e as notícias que já estão no app — nada é buscado de
   * novo. É isso que faz a sugestão de uma terça de novembro falar de estoque
   * e margem: o calendário já sabe que a Black Friday está chegando, e a aba
   * Notícias já sabe o que mudou no marketplace esta semana.
   */
  const contexto = React.useMemo(() => {
    /*
     * Só o que está PERTO do dia aberto.
     *
     * Antes entravam os eventos da janela inteira do mês, então clicar no dia 3
     * e no dia 28 dava o mesmo contexto — e a frase "puxado pelo que está no
     * seu calendário" ficava falsa para uma data a cinco semanas de distância.
     */
    const referencia = diaAberto ? Date.parse(`${diaAberto}T00:00:00Z`) : Date.now()
    const PERTO = 21 * 86_400_000

    return {
      eventos: eventos
        .filter((evento) => {
          const inicio = Date.parse(`${evento.data}T00:00:00Z`)
          const fim = Date.parse(`${evento.data_fim ?? evento.data}T00:00:00Z`)
          return Math.min(Math.abs(inicio - referencia), Math.abs(fim - referencia)) <= PERTO
        })
        .map((evento) => evento.titulo),
      // As notícias já vêm da mais recente para a mais antiga.
      noticias: noticias.slice(0, 10).flatMap((noticia) => [noticia.titulo, ...noticia.tags]),
      /*
       * Só as postagens DO DIA ABERTO, não as da semana.
       *
       * Diferente de evento e notícia, que valem por uma janela: o post do dia
       * 12 manda nos stories do dia 12 e em mais nenhum outro. É isso que faz
       * a vaga da pauta ser confiável — se ela puxasse a semana, o motivo
       * "puxado da postagem deste dia" seria mentira em quatro dias de cinco.
       */
      pautas: pautasDoDia.map((pauta) => pauta.texto || pauta.assunto),
    }
  }, [eventos, noticias, diaAberto, pautasDoDia])

  /* Busca a URL assinada sempre que o rascunho aponta para outra imagem. */
  React.useEffect(() => {
    const caminho = rascunho?.imagemCaminho
    if (!caminho) {
      setUrlDaImagem(null)
      return
    }
    let cancelado = false
    void urlAssinada(caminho).then((url) => {
      if (!cancelado) setUrlDaImagem(url)
    })
    return () => {
      cancelado = true
    }
  }, [rascunho?.imagemCaminho])

  /**
   * Guardar e devolver, pelo arrasto.
   *
   * Mesma regra do calendário: soltar na gaveta guarda, soltar num dia
   * devolve. A sequência guardada mantém os stories escritos, o tema, o arco e
   * a imagem — é a mesma linha, só fora da grade.
   */
  async function aoSoltar(evento: DragEndEvent) {
    const sequencia = arrastando
    setArrastando(null)
    if (!sequencia) return

    const alvo = evento.over?.data.current
    const paraGaveta = alvo?.gaveta === true
    const dia = alvo?.dateKey as string | undefined

    try {
      if (paraGaveta) {
        if (sequencia.na_gaveta) return
        await guardar.mutateAsync({ id: sequencia.id, guardar: true })
        toast({ title: 'Guardada nas ideias soltas' })
        return
      }
      if (!dia) return
      if (sequencia.na_gaveta) {
        await guardar.mutateAsync({ id: sequencia.id, guardar: false, data: dia })
        toast({ title: `Devolvida para ${formatShortDate(dia)}` })
        return
      }
      if (dia === sequencia.data) return
      await salvar.mutateAsync({ id: sequencia.id, data: dia })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível mover a sequência',
        description: errorMessage(erro),
      })
    }
  }

  async function guardarSequencia(id: string) {
    try {
      await guardar.mutateAsync({ id, guardar: true })
      toast({ variant: 'success', title: 'Guardada nas ideias soltas' })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível guardar',
        description: errorMessage(erro),
      })
    }
  }

  async function devolverParaHoje(id: string) {
    try {
      await guardar.mutateAsync({ id, guardar: false, data: todayKey() })
      toast({ title: 'Devolvida para hoje' })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível devolver',
        description: errorMessage(erro),
      })
    }
  }

  function fechar() {
    setDiaAberto(null)
    setRascunho(null)
    setUrlDaImagem(null)
  }

  function alterar(campos: Partial<RascunhoDeSequencia>) {
    setRascunho((atual) => (atual ? { ...atual, ...campos } : atual))
  }

  async function aoSubirImagem(arquivo: File) {
    if (!user) return
    setSubindoImagem(true)
    try {
      const caminho = await subirAnexo(user.id, arquivo, 'stories')
      alterar({ imagemCaminho: caminho })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível subir a imagem',
        description: errorMessage(error),
      })
    } finally {
      setSubindoImagem(false)
    }
  }

  async function aoSalvar() {
    if (!rascunho) return
    const entrada = {
      data: rascunho.data,
      titulo: rascunho.titulo,
      tema_id: rascunho.temaId,
      arco_id: rascunho.arcoId,
      stories: rascunho.stories,
      observacao: rascunho.observacao,
      imagem_caminho: rascunho.imagemCaminho,
      imagem_descricao: rascunho.imagemDescricao,
      publicado: rascunho.publicado,
    }
    try {
      if (rascunho.id) {
        await salvar.mutateAsync({ id: rascunho.id, ...entrada })
        toast({ variant: 'success', title: 'Sequência salva' })
      } else {
        const nova = await criar.mutateAsync(entrada)
        // Guarda o id devolvido: sem isso, salvar de novo criaria uma segunda
        // sequência igual em vez de atualizar a que acabou de nascer.
        alterar({ id: nova.id })
        toast({ variant: 'success', title: 'Sequência criada' })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: errorMessage(error),
      })
    }
  }

  const noMes = sequencias.filter(
    (s) => s.data >= toDateKey(startOfMonth(referencia)) && s.data <= toDateKey(endOfMonth(referencia)),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReferencia((atual) => addMonths(atual, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReferencia((atual) => addMonths(atual, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {formatMonthTitle(referencia)}
        </h1>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setReferencia(startOfMonth(new Date()))}
          className="hidden sm:inline-flex"
        >
          Hoje
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {noMes.length} {noMes.length === 1 ? 'sequência' : 'sequências'} no mês ·{' '}
            {noMes.filter((s) => s.publicado).length} publicadas
          </span>
          <Button size="sm" onClick={() => setDiaAberto(todayKey())}>
            <Clapperboard className="h-4 w-4" />
            <span className="hidden sm:inline">Stories de hoje</span>
          </Button>
        </div>
      </div>

      {noMes.length === 0 && !isLoading && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Como esta aba funciona</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Clique num dia. A aba sugere três assuntos, escolhidos pelo que está no seu
            calendário e nas suas notícias — não por sorteio. São dezesseis formatos de
            sequência: uns abrem na promessa, outros no dado cru, no bastidor, numa crença do
            mercado ou numa pergunta da caixinha; uns fecham pedindo resposta, outros só
            prometendo o próximo. O formato e a redação mudam de um dia para o outro, e apertar
            "gerar" de novo escreve diferente. Tudo editável, porque quem grava é você.
          </p>
        </Card>
      )}

      <DndContext
        sensors={sensores}
        collisionDetection={pointerWithin}
        onDragStart={(evento: DragStartEvent) =>
          setArrastando((evento.active.data.current?.sequencia as StorySequenciaRow) ?? null)
        }
        onDragEnd={aoSoltar}
        onDragCancel={() => setArrastando(null)}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <GradeDeStories
              reference={referencia}
              porDia={porDia}
              pautasPorDia={pautasPorDia}
              loading={isLoading}
              onAbrirDia={(dia) => {
                setDiaAberto(dia)
                setRascunho(null)
              }}
            />
          </div>

          {/*
            Gaveta e Referências empilham numa coluna só.

            Soltas como irmãs do container, elas viravam a segunda e a terceira
            COLUNA do `xl:flex-row` — ficavam lado a lado, e a grade do mês
            encolhia para caber as duas. Aqui elas dividem a mesma faixa
            lateral, uma embaixo da outra, e a largura fixa sai desta coluna em
            vez de cada painel carregar a sua.
          */}
          <div className="flex w-full shrink-0 flex-col gap-3 xl:w-56">
          <Gaveta
            id="gaveta-stories"
            titulo="Ideias soltas"
            explicacao="Arraste para cá a sequência que você não vai gravar no dia. Ela sai da grade e fica guardada com os stories escritos, o tema e a imagem. Para usar depois, arraste de volta para um dia."
            quantidade={gaveta.length}
          >
            {gaveta.map((sequencia) => (
              <div key={sequencia.id} className="space-y-0.5">
                {/*
                  * O clique abre a LEITURA, não o painel do dia.
                  *
                  * O painel mostra um dia, e esta sequência não está em dia
                  * nenhum — saiu da grade ao ser guardada. O visor mostra o
                  * que está escrito e deixa a decisão para depois de ler.
                  */}
                <CartaoDeSequencia
                  sequencia={sequencia}
                  onClick={() => setSequenciaAberta(sequencia.id)}
                />
                <div className="flex items-center gap-1 pl-1">
                  <span className="text-[0.6rem] text-muted-foreground">
                    de {formatShortDate(sequencia.data)}
                  </span>
                  <button
                    type="button"
                    className="ml-auto rounded px-1 text-[0.6rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => void devolverParaHoje(sequencia.id)}
                  >
                    usar hoje
                  </button>
                </div>
              </div>
            ))}
          </Gaveta>

          {/*
            Referências ficam embaixo da gaveta, na mesma coluna.
            São o outro insumo de quem grava story: a gaveta guarda o que
            ESCREVER, isto guarda o que OLHAR enquanto escreve.
          */}
          <BancoDeReferencias
            referencias={banco}
            carregando={carregandoBanco}
            subindo={subirReferencia.isPending}
            onSubir={(arquivos) => void aoSubirReferencias(arquivos)}
            onLegenda={(id, legenda) =>
              legendaDaReferencia.mutate(
                { id, legenda },
                {
                  onError: (erro: unknown) =>
                    toast({
                      variant: 'destructive',
                      title: 'Não consegui salvar a legenda',
                      description: errorMessage(erro),
                    }),
                },
              )
            }
            onExcluir={(referencia) =>
              excluirReferencia.mutate(referencia, {
                onError: (erro: unknown) =>
                  toast({
                    variant: 'destructive',
                    title: 'Não consegui excluir a referência',
                    description: errorMessage(erro),
                  }),
              })
            }
          />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {arrastando && (
            <div className="w-44 rotate-2 opacity-95">
              <CartaoDeSequencia sequencia={arrastando} draggable={false} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <PainelDeStories
        dia={diaAberto}
        sequencias={diaAberto ? (porDia.get(diaAberto) ?? []) : []}
        contexto={contexto}
        pautas={pautasDoDia}
        rascunho={rascunho}
        urlDaImagem={urlDaImagem}
        subindoImagem={subindoImagem}
        salvando={criar.isPending || salvar.isPending}
        onFechar={fechar}
        onAbrirRascunho={setRascunho}
        onAlterarRascunho={alterar}
        onSalvar={aoSalvar}
        onGuardar={(id) => void guardarSequencia(id)}
        onExcluir={async (id) => {
          try {
            await excluir.mutateAsync(id)
            toast({ variant: 'success', title: 'Sequência excluída' })
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Não foi possível excluir',
              description: errorMessage(error),
            })
          }
        }}
        onImagem={aoSubirImagem}
        onRemoverImagem={() => alterar({ imagemCaminho: null, imagemDescricao: '' })}
      />

      {/* ---------- Leitura de uma sequência guardada ---------- */}
      {daGavetaAberta && (
        <VisorDaGaveta
          aberto
          onFechar={() => setSequenciaAberta(null)}
          titulo={daGavetaAberta.titulo || 'Sequência sem título'}
          guardadaDe={daGavetaAberta.data}
          onUsarHoje={() => {
            // Fecha ANTES de devolver: a sequência sai da gaveta e o visor
            // perderia o conteúdo debaixo de si, piscando vazio por um quadro.
            setSequenciaAberta(null)
            void devolverParaHoje(daGavetaAberta.id)
          }}
          acoes={
            <Button size="sm" variant="ghost" onClick={() => void copiarSequencia(daGavetaAberta)}>
              {copiada ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copiada ? 'Copiada' : 'Copiar'}
            </Button>
          }
        >
          <ConteudoDaSequencia sequencia={daGavetaAberta} />
        </VisorDaGaveta>
      )}
    </div>
  )
}
