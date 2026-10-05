import * as React from 'react'
import { Check, FileText, Loader2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { EditorDeNota, type EditorDeNotaRef } from '@/components/notas/EditorDeNota'
import { DesenhoDaNota } from '@/components/notas/DesenhoDaNota'
import { PainelDeLigacoes, SeletorDeLigacao } from '@/components/notas/PainelDeLigacoes'
import { useAuth } from '@/components/auth/AuthProvider'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  useCriarNota,
  useExcluirNota,
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
  const excluir = useExcluirNota()
  const salvar = useSalvarNota()

  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  const [busca, setBusca] = React.useState('')
  const [estado, setEstado] = React.useState<Estado>('ocioso')
  const [seletorAberto, setSeletorAberto] = React.useState(false)

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
  const visiveis = chave
    ? notas.filter((n) => chaveDoTitulo(n.titulo || 'Nota sem título').includes(chave))
    : notas

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
                  {busca ? 'Nenhuma nota com esse título.' : 'Nenhuma nota ainda.'}
                </p>
              </li>
            )}

            {visiveis.map((item) => (
              <li key={item.id}>
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
                    aria-label={`Excluir ${item.titulo || 'nota sem título'}`}
                    onClick={() => void removerNota(item.id, item.titulo)}
                    className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
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
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
