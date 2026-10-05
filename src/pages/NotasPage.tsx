import * as React from 'react'
import {
  Check,
  FileDown,
  FileText,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { EditorDeNota, type EditorDeNotaRef } from '@/components/notas/EditorDeNota'
import { DesenhoDaNota } from '@/components/notas/DesenhoDaNota'
import { PainelDeLigacoes, SeletorDeLigacao } from '@/components/notas/PainelDeLigacoes'
import {
  ImpressaoDaNota,
  type ConteudoParaImprimir,
} from '@/components/notas/ImpressaoDaNota'
import { useAuth } from '@/components/auth/AuthProvider'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  useCriarNota,
  useExcluirNota,
  useFixarNota,
  useLigacoesDoCaderno,
  useNota,
  useNotas,
  useSalvarNota,
} from '@/hooks/useNotas'
import { paraArmazenamento, paraExibicao, subirAnexo, urlAssinada } from '@/lib/notasAnexos'
import { chaveDoTitulo, ligacoesDe, tituloDoConteudo } from '@/lib/notasLinks'
import type { CanvasDados } from '@/types/database'

type Estado = 'ocioso' | 'salvando' | 'salvo' | 'erro'
const ESPERA_DO_AUTOSAVE = 1200

function useTemaDoDocumento() {
  const [escuro, setEscuro] = React.useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  React.useEffect(() => {
    const alvo = document.documentElement
    const observador = new MutationObserver(() => setEscuro(alvo.classList.contains('dark')))
    observador.observe(alvo, { attributes: true, attributeFilter: ['class'] })
    return () => observador.disconnect()
  }, [])
  return escuro ? ('dark' as const) : ('light' as const)
}

function quando(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const mesmoDia =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function NotasPage() {
  const { user } = useAuth()
  const tema = useTemaDoDocumento()
  const temDuasColunas = useMediaQuery('(min-width: 768px)')

  const { data: notas = [], isLoading: carregandoLista, error: erroLista } = useNotas()
  const { data: caderno = [] } = useLigacoesDoCaderno()
  const criar = useCriarNota()
  const fixar = useFixarNota()
  const excluir = useExcluirNota()
  const salvar = useSalvarNota()

  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  const [busca, setBusca] = React.useState('')
  const [soFixadas, setSoFixadas] = React.useState(false)
  const [estado, setEstado] = React.useState<Estado>('ocioso')
  const [seletorAberto, setSeletorAberto] = React.useState(false)
  const [paraImprimir, setParaImprimir] = React.useState<ConteudoParaImprimir | null>(null)
  const [preparandoPdf, setPreparandoPdf] = React.useState(false)

  const { data: nota, isFetching: carregandoNota } = useNota(selecionada)

  /*
   * Conteúdo pronto para o editor, SEMPRE carimbado com o id da nota de onde
   * veio. Sem o carimbo, trocar de nota montava o editor com o HTML da nota
   * anterior: o estado já tinha valor (não era null), a busca já tinha
   * terminado, e a resolução dos anexos — que é um efeito — só rodava depois
   * do render. O editor nascia com o conteúdo errado e não era refeito.
   */
  const [preparado, setPreparado] = React.useState<{ id: string; html: string } | null>(null)
  const [ligacoesCitadas, setLigacoesCitadas] = React.useState<string[]>([])
  const editorRef = React.useRef<EditorDeNotaRef>(null)

  // Rascunho em ref: o editor dispara a cada tecla, e re-renderizar a página
  // inteira por isso devolveria a lentidão que o canvas já teve.
  const rascunhoRef = React.useRef<{ conteudo: string; desenho: CanvasDados | null }>({
    conteudo: '',
    desenho: null,
  })
  const salvoRef = React.useRef('')
  const salvandoRef = React.useRef(false)
  const falhouRef = React.useRef<string | null>(null)
  const montadoRef = React.useRef(true)
  React.useEffect(() => () => void (montadoRef.current = false), [])

  // Seleciona a primeira nota ao abrir a tela.
  React.useEffect(() => {
    if (selecionada || notas.length === 0) return
    setSelecionada(notas[0].id)
  }, [notas, selecionada])

  // Quando a nota muda, resolve os anexos antes de montar o editor.
  React.useEffect(() => {
    let valido = true
    // Enquanto a busca estiver em andamento, `nota` ainda pode ser a resposta
    // anterior: preparar o conteúdo agora seria preparar o da nota errada.
    if (!nota || carregandoNota) {
      if (!nota) setPreparado(null)
      return
    }
    void paraExibicao(nota.conteudo).then((html) => {
      if (!valido) return
      setPreparado({ id: nota.id, html })
      setLigacoesCitadas(ligacoesDe(nota.conteudo))
      rascunhoRef.current = { conteudo: nota.conteudo, desenho: nota.desenho }
      salvoRef.current = ''
      falhouRef.current = null
      setEstado('ocioso')
    })
    return () => {
      valido = false
    }
  }, [nota, carregandoNota])

  const gravar = React.useCallback(async () => {
    const atual = nota
    if (!atual) return

    const conteudo = paraArmazenamento(rascunhoRef.current.conteudo)
    const desenho = rascunhoRef.current.desenho
    const assinatura = `${conteudo}::${JSON.stringify(desenho?.elements?.length ?? 0)}`

    if (assinatura === salvoRef.current) return
    if (salvandoRef.current) return
    if (assinatura === falhouRef.current) return

    salvandoRef.current = true
    if (montadoRef.current) setEstado('salvando')
    try {
      await salvar.mutateAsync({
        id: atual.id,
        titulo: tituloDoConteudo(conteudo, ''),
        conteudo,
        desenho,
      })
      salvoRef.current = assinatura
      falhouRef.current = null
      if (montadoRef.current) {
        setLigacoesCitadas(ligacoesDe(conteudo))
        setEstado('salvo')
      }
    } catch (erro) {
      falhouRef.current = assinatura
      if (montadoRef.current) setEstado('erro')
      toast({
        variant: 'destructive',
        title: 'Não consegui salvar a nota',
        description: errorMessage(erro),
      })
    } finally {
      salvandoRef.current = false
    }
  }, [nota, salvar])

  const gravarRef = React.useRef(gravar)
  gravarRef.current = gravar

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const agendar = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void gravarRef.current(), ESPERA_DO_AUTOSAVE)
  }, [])

  // Salva ao sair da tela e ao fechar a aba. Sem dependências: a limpeza do
  // efeito não pode disparar a cada troca de identidade do callback — foi
  // exatamente assim que o canvas entrou em laço e ficou com a tela preta.
  React.useEffect(() => {
    const aoSair = () => void gravarRef.current()
    window.addEventListener('pagehide', aoSair)
    return () => {
      window.removeEventListener('pagehide', aoSair)
      if (timerRef.current) clearTimeout(timerRef.current)
      aoSair()
    }
  }, [])

  const aoMudarTexto = React.useCallback(
    (html: string) => {
      rascunhoRef.current = { ...rascunhoRef.current, conteudo: html }
      setEstado((atual) => (atual === 'salvando' ? atual : 'ocioso'))
      agendar()
    },
    [agendar],
  )

  const aoMudarDesenho = React.useCallback(
    (desenho: CanvasDados) => {
      rascunhoRef.current = { ...rascunhoRef.current, desenho }
      agendar()
    },
    [agendar],
  )

  const subirImagem = React.useCallback(
    async (arquivo: File) => {
      const caminho = await subirAnexo(user!.id, arquivo)
      const url = (await urlAssinada(caminho)) ?? ''
      return { caminho, url }
    },
    [user],
  )

  async function trocarDeNota(id: string) {
    if (id === selecionada) return
    // Grava o que está na tela antes de trocar: nada de perder o parágrafo
    // recém-escrito porque a pessoa clicou na nota ao lado.
    await gravarRef.current()
    setSelecionada(id)
  }

  async function novaNota(titulo = '') {
    try {
      await gravarRef.current()
      const criada = await criar.mutateAsync(titulo)
      setSelecionada(criada.id)
    } catch (erro) {
      toast({ variant: 'destructive', title: 'Não consegui criar a nota', description: errorMessage(erro) })
    }
  }

  /**
   * Monta a nota para impressão e abre o diálogo do navegador.
   *
   * Usa o rascunho (o que está na tela agora), não o que está no banco: quem
   * acabou de escrever um parágrafo espera vê-lo no PDF, sem ter que esperar
   * o autosave. O desenho entra como SVG, em resolução de vetor.
   */
  async function exportarPdf() {
    if (!nota) return
    setPreparandoPdf(true)
    try {
      const elementos = (rascunhoRef.current.desenho?.elements ?? []) as unknown[]
      let desenho: string | null = null

      if (elementos.length > 0) {
        // Import dinâmico: o Excalidraw é o bundle mais pesado do app e não
        // pode ser baixado por quem só abriu uma nota de texto.
        const { exportToSvg } = await import('@excalidraw/excalidraw')
        const svg = await exportToSvg({
          elements: elementos as never,
          appState: { exportBackground: false, exportWithDarkMode: false },
          files: null,
        })
        desenho = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          new XMLSerializer().serializeToString(svg),
        )}`
      }

      setParaImprimir({
        titulo: tituloDoConteudo(rascunhoRef.current.conteudo, nota.titulo),
        html: rascunhoRef.current.conteudo,
        desenho,
        atualizadoEm: nota.atualizado_em,
      })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não consegui preparar o PDF',
        description: errorMessage(erro),
      })
    } finally {
      setPreparandoPdf(false)
    }
  }

  async function alternarFixada(item: { id: string; fixada: boolean; titulo: string }) {
    try {
      await fixar.mutateAsync({ id: item.id, fixada: !item.fixada })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não consegui fixar a nota',
        description: errorMessage(erro),
      })
    }
  }

  async function removerNota(id: string, titulo: string) {
    if (!window.confirm(`Excluir “${titulo || 'Nota sem título'}”? Não dá para desfazer.`)) return
    try {
      await excluir.mutateAsync(id)
      if (selecionada === id) setSelecionada(null)
      toast({ variant: 'success', title: 'Nota excluída' })
    } catch (erro) {
      toast({ variant: 'destructive', title: 'Não consegui excluir', description: errorMessage(erro) })
    }
  }

  const chave = chaveDoTitulo(busca)
  const visiveis = notas
    .filter((n) => !soFixadas || n.fixada)
    .filter((n) => !chave || chaveDoTitulo(n.titulo || 'Nota sem título').includes(chave))

  const quantidadeFixada = notas.filter((n) => n.fixada).length
  // A lista já vem ordenada do banco: fixadas primeiro. O índice da primeira
  // não-fixada é onde entra o separador das seções.
  const inicioDasOutras = visiveis.findIndex((n) => !n.fixada)

  if (erroLista) {
    return (
      <div className="glass mx-auto mt-10 max-w-md space-y-2 rounded-xl p-6 text-center">
        <TriangleAlert className="mx-auto h-6 w-6 text-destructive" />
        <p className="text-sm font-medium">Não consegui abrir as notas</p>
        <p className="text-xs text-muted-foreground">{errorMessage(erroLista)}</p>
      </div>
    )
  }

  const mostrarLista = temDuasColunas || !selecionada
  const mostrarEditor = temDuasColunas || Boolean(selecionada)

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 sm:p-6">
      {mostrarLista && (
        <aside
          className={cn(
            'glass flex min-h-0 flex-col rounded-xl',
            temDuasColunas ? 'w-72 shrink-0' : 'w-full',
          )}
        >
          <div className="space-y-2 border-b border-border/60 p-3">
            <div className="flex items-center gap-2">
              <h1 className="flex-1 text-sm font-semibold">Notas</h1>
              <Button size="sm" onClick={() => void novaNota()} loading={criar.isPending}>
                <Plus className="h-4 w-4" />
                Nova
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar por título"
                className="h-8 pl-8 text-sm"
              />
            </div>

            {/* O filtro só aparece quando existe algo para filtrar. */}
            {quantidadeFixada > 0 && (
              <Button
                variant={soFixadas ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-full justify-center text-xs"
                aria-pressed={soFixadas}
                onClick={() => setSoFixadas((v) => !v)}
              >
                <Pin className={cn('h-3.5 w-3.5', soFixadas && 'fill-current')} />
                {soFixadas ? 'Mostrando só fixadas' : `Só fixadas (${quantidadeFixada})`}
              </Button>
            )}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            {carregandoLista && (
              <li className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </li>
            )}

            {!carregandoLista && visiveis.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {soFixadas
                    ? 'Nenhuma nota fixada com esse filtro.'
                    : busca
                      ? 'Nenhuma nota com esse título.'
                      : 'Nenhuma nota ainda.'}
                </p>
              </li>
            )}

            {visiveis.map((item, indice) => (
              <React.Fragment key={item.id}>
                {/* Cabeçalho da seção fixada, só quando as duas seções convivem. */}
                {indice === 0 && item.fixada && (
                  <li className="px-2 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fixadas
                  </li>
                )}
                {indice === inicioDasOutras && inicioDasOutras > 0 && (
                  <li className="mt-2 border-t border-border/60 px-2 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Outras notas
                  </li>
                )}
              <li>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-lg px-2 py-2 transition-colors',
                    item.id === selecionada ? 'bg-primary/15' : 'hover:bg-foreground/5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void trocarDeNota(item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    {/* Fechada, a nota é só o título — é por ele que se navega. */}
                    <span
                      className={cn(
                        'block truncate text-sm',
                        item.titulo ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {item.titulo || 'Nota sem título'}
                    </span>
                    <span className="block text-[0.68rem] tabular-nums text-muted-foreground">
                      {quando(item.atualizado_em)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      item.fixada
                        ? `Soltar ${item.titulo || 'nota sem título'}`
                        : `Fixar ${item.titulo || 'nota sem título'} no topo`
                    }
                    title={item.fixada ? 'Soltar do topo' : 'Fixar no topo'}
                    onClick={() => void alternarFixada(item)}
                    className={cn(
                      'transition-opacity',
                      // Fixada: o pino fica sempre à vista, é o estado dela.
                      // Solta: aparece no hover, para não poluir a lista.
                      item.fixada
                        ? 'text-primary'
                        : 'opacity-0 focus:opacity-100 group-hover:opacity-100',
                    )}
                  >
                    {item.fixada ? (
                      <Pin className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Excluir ${item.titulo || 'nota sem título'}`}
                    onClick={() => void removerNota(item.id, item.titulo)}
                    className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
              </React.Fragment>
            ))}
          </ul>
        </aside>
      )}

      {mostrarEditor && (
        <section className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          {!selecionada ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Escolha uma nota à esquerda ou crie a primeira.
              </p>
              <Button size="sm" onClick={() => void novaNota()}>
                <Plus className="h-4 w-4" />
                Nova nota
              </Button>
            </div>
          ) : carregandoNota || !nota || preparado?.id !== nota.id ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 pt-2">
                {!temDuasColunas && (
                  <Button variant="ghost" size="sm" onClick={() => setSelecionada(null)}>
                    Voltar
                  </Button>
                )}
                {/* Fixar sem precisar voltar para a lista: quem acabou de
                    escrever algo importante decide isso aqui. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() =>
                    void alternarFixada({
                      id: nota.id,
                      fixada: nota.fixada,
                      titulo: nota.titulo,
                    })
                  }
                  title={nota.fixada ? 'Soltar do topo' : 'Fixar no topo'}
                >
                  {nota.fixada ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{nota.fixada ? 'Soltar' : 'Fixar'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void exportarPdf()}
                  loading={preparandoPdf}
                  title="Exportar esta nota em PDF"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  {estado === 'salvando' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {estado === 'salvo' && <Check className="h-3 w-3" />}
                  {estado === 'erro' && <TriangleAlert className="h-3 w-3 text-destructive" />}
                  {{ ocioso: '', salvando: 'Salvando…', salvo: 'Salvo', erro: 'Falha ao salvar' }[estado]}
                </span>
              </div>

              <EditorDeNota
                /* key, e não prop: o editor tem que nascer de novo por nota.
                   Ver o comentário em EditorDeNota. */
                key={nota.id}
                ref={editorRef}
                conteudoInicial={preparado.html}
                onChange={aoMudarTexto}
                onSubirImagem={subirImagem}
                onInserirLigacao={() => setSeletorAberto(true)}
              />

              <PainelDeLigacoes
                notaId={nota.id}
                titulo={nota.titulo}
                conteudo={preparado.html}
                caderno={caderno}
                ligacoesCitadas={ligacoesCitadas}
                onAbrirNota={(id) => void trocarDeNota(id)}
                onCriarNota={(titulo) => void novaNota(titulo)}
              />

              <DesenhoDaNota
                notaId={nota.id}
                desenho={nota.desenho}
                onChange={aoMudarDesenho}
                tema={tema}
              />
            </>
          )}
        </section>
      )}

      <ImpressaoDaNota conteudo={paraImprimir} onConcluido={() => setParaImprimir(null)} />

      <SeletorDeLigacao
        aberto={seletorAberto}
        onOpenChange={setSeletorAberto}
        caderno={notas}
        notaId={selecionada ?? ''}
        onEscolher={(titulo) => editorRef.current?.inserirTexto(`[[${titulo}]]`)}
      />
    </div>
  )
}
