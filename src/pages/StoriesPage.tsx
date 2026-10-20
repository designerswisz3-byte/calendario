import * as React from 'react'
import { ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
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
  useCriarSequencia,
  useExcluirSequencia,
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
    </div>
  )
}
