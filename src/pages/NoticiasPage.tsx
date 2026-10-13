import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Newspaper, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { CartaoDeNoticia } from '@/components/noticias/CartaoDeNoticia'
import { ImportarColeta } from '@/components/noticias/ImportarColeta'
import { briefingDaNoticia } from '@/lib/noticias'
import { errorMessage } from '@/lib/supabase'
import { formatShortDate, todayKey } from '@/lib/date'
import {
  useAtualizarNoticia,
  useExcluirNoticia,
  useImportarNoticias,
  useNoticias,
} from '@/hooks/useNoticias'
import { useCreateCalendarItem } from '@/hooks/useCalendarItems'
import type { NoticiaEntrada, NoticiaRow } from '@/types/database'

type Filtro = 'relevantes' | 'nao_lidas' | 'todas'

export default function NoticiasPage() {
  const navigate = useNavigate()
  const { data: noticias = [], isLoading } = useNoticias()
  const importar = useImportarNoticias()
  const atualizar = useAtualizarNoticia()
  const excluir = useExcluirNoticia()
  const criarItem = useCreateCalendarItem()

  /*
   * O filtro abre em "relevantes", não em "todas".
   *
   * A aba existe para ele estar atualizado em 5 minutos, não para ele ler
   * tudo. Abrir numa lista completa devolveria o problema que a curadoria veio
   * resolver — e é exatamente assim que um leitor de notícias vira culpa.
   */
  const [filtro, setFiltro] = React.useState<Filtro>('relevantes')
  const [abrindoImportacao, setAbrindoImportacao] = React.useState(false)
  const [criandoPauta, setCriandoPauta] = React.useState<string | null>(null)

  const visiveis = React.useMemo(() => {
    if (filtro === 'todas') return noticias
    if (filtro === 'nao_lidas') return noticias.filter((n) => !n.lida)
    return noticias.filter((n) => n.relevancia >= 4)
  }, [noticias, filtro])

  /** Agrupadas por dia de publicação, do mais recente para o mais antigo. */
  const porDia = React.useMemo(() => {
    const mapa = new Map<string, NoticiaRow[]>()
    for (const noticia of visiveis) {
      const chave = noticia.publicado_em ?? 'sem-data'
      const lista = mapa.get(chave)
      if (lista) lista.push(noticia)
      else mapa.set(chave, [noticia])
    }
    return [...mapa.entries()]
  }, [visiveis])

  const naoLidas = noticias.filter((n) => !n.lida).length
  const relevantes = noticias.filter((n) => n.relevancia >= 4).length

  async function aoImportar(entradas: NoticiaEntrada[]) {
    try {
      const total = await importar.mutateAsync(entradas)
      toast({ variant: 'success', title: `${total} notícia(s) na lista` })
      setAbrindoImportacao(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível importar',
        description: errorMessage(error),
      })
    }
  }

  /**
   * Notícia vira item de HOJE, marcado como ideia.
   *
   * Hoje e não "algum dia": pauta que nasce de notícia tem prazo de validade —
   * jogá-la para uma data futura vazia é o jeito mais rápido de ela morrer na
   * lista. Se for para outro dia, arrasta-se no calendário.
   */
  async function virarPauta(noticia: NoticiaRow) {
    setCriandoPauta(noticia.id)
    try {
      await criarItem.mutateAsync({
        data: todayKey(),
        horario: null,
        tipo: 'ideia',
        status: 'ideia',
        notas: briefingDaNoticia(noticia),
        roteiro: '',
        tagIds: [],
      })
      await atualizar.mutateAsync({ id: noticia.id, virou_pauta: true, lida: true })
      toast({
        variant: 'success',
        title: 'Pauta criada para hoje',
        description: 'Abra o calendário para ajustar a data.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível criar a pauta',
        description: errorMessage(error),
      })
    } finally {
      setCriandoPauta(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notícias</h1>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {noticias.length} na base · {naoLidas} não lidas
        </p>

        <div className="ml-auto flex items-center gap-2">
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <TabsList>
              <TabsTrigger value="relevantes">Relevantes ({relevantes})</TabsTrigger>
              <TabsTrigger value="nao_lidas">Não lidas ({naoLidas})</TabsTrigger>
              <TabsTrigger value="todas">Todas ({noticias.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" onClick={() => setAbrindoImportacao(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar coleta
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : noticias.length === 0 ? (
        <Card className="p-8 text-center">
          <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Nenhuma notícia ainda</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            A coleta entra por aqui em JSON. Cada item precisa de título, URL e — o que
            realmente importa — uma linha dizendo o que aquilo muda para quem vende moda.
          </p>
          <Button className="mt-4" onClick={() => setAbrindoImportacao(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar coleta
          </Button>
        </Card>
      ) : visiveis.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-base font-semibold">Nada neste filtro</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtro === 'relevantes'
              ? 'Nenhuma notícia com relevância 4 ou 5 na base. Isso é uma resposta: o dia foi calmo.'
              : 'Tudo lido.'}
          </p>
          <Button variant="ghost" className="mt-3" onClick={() => setFiltro('todas')}>
            Ver todas
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {porDia.map(([data, lista]) => (
            <section key={data} className="space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {data === 'sem-data' ? 'Sem data de publicação' : formatShortDate(data)}
                {data === todayKey() && ' · hoje'}
              </h2>
              {lista.map((noticia) => (
                <CartaoDeNoticia
                  key={noticia.id}
                  noticia={noticia}
                  criandoPauta={criandoPauta === noticia.id}
                  onAlternarLida={() =>
                    atualizar.mutate({ id: noticia.id, lida: !noticia.lida })
                  }
                  onVirarPauta={() => virarPauta(noticia)}
                  onExcluir={() => {
                    if (window.confirm(`Excluir "${noticia.titulo}"?`)) excluir.mutate(noticia.id)
                  }}
                />
              ))}
            </section>
          ))}

          <Button variant="ghost" className="w-full" onClick={() => navigate('/calendario')}>
            Ver o calendário
          </Button>
        </div>
      )}

      <ImportarColeta
        aberto={abrindoImportacao}
        onFechar={() => setAbrindoImportacao(false)}
        salvando={importar.isPending}
        onImportar={aoImportar}
      />
    </div>
  )
}
