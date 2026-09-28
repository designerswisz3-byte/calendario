import * as React from 'react'
import {
  Excalidraw,
  convertToExcalidrawElements,
  getSceneVersion,
  viewportCoordsToSceneCoords,
  FONT_FAMILY,
} from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, BinaryFiles, AppState } from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { Check, Loader2, StickyNote, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  useCanvasBoard,
  useSalvamentoAdiado,
  useSalvarCanvas,
  type CenaDoCanvas,
} from '@/hooks/useCanvas'
import type { CanvasImagens } from '@/types/database'
import '@excalidraw/excalidraw/index.css'

/**
 * Onde o Excalidraw busca as fontes. `scripts/copiar-fontes-excalidraw.mjs`
 * coloca elas em public/fonts; sem isto, ele cai num CDN externo e o canvas
 * passa a depender de um domínio de terceiro para desenhar texto.
 */
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}
if (typeof window !== 'undefined') window.EXCALIDRAW_ASSET_PATH = '/'

type Estado = 'ocioso' | 'salvando' | 'salvo' | 'erro'

/**
 * Tema atual lido do <html>.
 *
 * Não dá para usar useTheme() aqui: o hook guarda estado próprio por
 * instância, então uma segunda chamada criaria um tema paralelo que não
 * acompanha o botão do cabeçalho. A classe no <html> é a fonte da verdade.
 */
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

/**
 * A nota é DUAS caixas empilhadas: a de cima é o título, a de baixo o
 * conteúdo. Não é enfeite — é o que faz o texto quebrar em vez de vazar.
 *
 * Texto solto no Excalidraw cresce para a direita, e `convertToExcalidrawElements`
 * recalcula a largura pelo conteúdo, ignorando a que a gente pede. Texto
 * VINCULADO a um container quebra na largura dele e empurra a altura — é o
 * comportamento nativo, e o único que sobrevive a alguém digitar um parágrafo.
 */
const NOTA = {
  fundoTitulo: '#ffe8a3',
  fundoCorpo: '#fff9db',
  borda: '#e6a817',
  texto: '#1f2933',
  largura: 300,
  alturaTitulo: 46,
  alturaCorpo: 160,
}

export default function CanvasPage() {
  const tema = useTemaDoDocumento()
  const { data: cena, isLoading, error } = useCanvasBoard()
  const salvar = useSalvarCanvas()

  const [api, setApi] = React.useState<ExcalidrawImperativeAPI | null>(null)
  const [estado, setEstado] = React.useState<Estado>('ocioso')

  // Refs, e não estado: o onChange do Excalidraw dispara a cada movimento de
  // ponteiro, e re-renderizar a página inteira a cada traço travaria o
  // desenho. Nada aqui precisa aparecer na tela.
  const imagensRef = React.useRef<CanvasImagens>({})
  const versaoSalvaRef = React.useRef<number | null>(null)
  const cenaRef = React.useRef<{
    elements: readonly OrderedExcalidrawElement[]
    appState: AppState
    files: BinaryFiles
  } | null>(null)

  React.useEffect(() => {
    if (!cena) return
    imagensRef.current = cena.imagens
    versaoSalvaRef.current = getSceneVersion(cena.elements as OrderedExcalidrawElement[])
  }, [cena])

  const gravar = React.useCallback(async () => {
    const atual = cenaRef.current
    if (!cena || !atual) return

    const versao = getSceneVersion(atual.elements)
    if (versao === versaoSalvaRef.current) return

    setEstado('salvando')
    try {
      const imagens = await salvar.mutateAsync({
        boardId: cena.boardId,
        // Elemento apagado continua na cena marcado como isDeleted para o
        // undo funcionar. No banco ele é só peso morto que nunca encolhe.
        elements: atual.elements.filter((el) => !el.isDeleted),
        appState: atual.appState as unknown as Record<string, unknown>,
        arquivos: paraArquivos(atual.files),
        imagensConhecidas: imagensRef.current,
      })
      imagensRef.current = imagens
      versaoSalvaRef.current = versao
      setEstado('salvo')
    } catch (erro) {
      setEstado('erro')
      toast({
        variant: 'destructive',
        title: 'Não consegui salvar o canvas',
        description: errorMessage(erro),
      })
    }
  }, [cena, salvar])

  const { agendar, agoraMesmo } = useSalvamentoAdiado(() => void gravar())

  // Fechar a aba no meio de um autosave pendente perderia o último trecho.
  React.useEffect(() => {
    const aoSair = () => {
      if (versaoSalvaRef.current !== null && cenaRef.current) void gravar()
    }
    window.addEventListener('pagehide', aoSair)
    return () => {
      window.removeEventListener('pagehide', aoSair)
      aoSair()
    }
  }, [gravar])

  const aoMudar = React.useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      cenaRef.current = { elements, appState, files }
      if (getSceneVersion(elements) !== versaoSalvaRef.current) {
        setEstado((atual) => (atual === 'salvando' ? atual : 'ocioso'))
        agendar()
      }
    },
    [agendar],
  )

  /** Nota com título e conteúdo, no centro do que está à vista. */
  const adicionarNota = React.useCallback(() => {
    if (!api) return

    const appState = api.getAppState()
    const { x, y } = viewportCoordsToSceneCoords(
      {
        clientX: appState.offsetLeft + appState.width / 2 - NOTA.largura / 2,
        clientY:
          appState.offsetTop + appState.height / 2 - (NOTA.alturaTitulo + NOTA.alturaCorpo) / 2,
      },
      appState,
    )

    // Um grupo só: a nota se move, copia e apaga como uma peça única.
    const grupo = crypto.randomUUID()
    const novos = convertToExcalidrawElements([
      {
        type: 'rectangle',
        x,
        y,
        width: NOTA.largura,
        height: NOTA.alturaTitulo,
        backgroundColor: NOTA.fundoTitulo,
        strokeColor: NOTA.borda,
        fillStyle: 'solid',
        strokeWidth: 1,
        groupIds: [grupo],
        label: {
          text: 'Título da nota',
          fontSize: 20,
          fontFamily: FONT_FAMILY.Helvetica,
          strokeColor: NOTA.texto,
          textAlign: 'left',
          verticalAlign: 'middle',
        },
      },
      {
        type: 'rectangle',
        x,
        y: y + NOTA.alturaTitulo,
        width: NOTA.largura,
        height: NOTA.alturaCorpo,
        backgroundColor: NOTA.fundoCorpo,
        strokeColor: NOTA.borda,
        fillStyle: 'solid',
        strokeWidth: 1,
        groupIds: [grupo],
        label: {
          text: 'Conteúdo — clique duas vezes para editar.',
          fontSize: 16,
          fontFamily: FONT_FAMILY.Helvetica,
          strokeColor: NOTA.texto,
          textAlign: 'left',
          verticalAlign: 'top',
        },
      },
    ])

    api.updateScene({ elements: [...api.getSceneElements(), ...novos] })
  }, [api])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="glass max-w-md space-y-2 rounded-xl p-6 text-center">
          <TriangleAlert className="mx-auto h-6 w-6 text-destructive" />
          <p className="text-sm font-medium">Não consegui abrir o canvas</p>
          <p className="text-xs text-muted-foreground">{errorMessage(error)}</p>
        </div>
      </div>
    )
  }

  if (isLoading || !cena) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Abrindo o canvas…</span>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Barra própria, por cima do canvas: o "Nova nota" e o estado do
          salvamento são nossos, não do Excalidraw. */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2">
        <IndicadorDeSalvamento estado={estado} />
        <Button
          size="sm"
          onClick={adicionarNota}
          className="pointer-events-auto shadow-glass"
          title="Adicionar nota com título e conteúdo"
        >
          <StickyNote className="h-4 w-4" />
          Nova nota
        </Button>
      </div>

      <Excalidraw
        excalidrawAPI={setApi}
        theme={tema}
        langCode="pt-BR"
        onChange={aoMudar}
        onPointerUp={() => agoraMesmo()}
        initialData={montarDadosIniciais(cena, tema)}
        UIOptions={{ canvasActions: { loadScene: false } }}
      />
    </div>
  )
}

function IndicadorDeSalvamento({ estado }: { estado: Estado }) {
  if (estado === 'ocioso') return null

  const conteudo = {
    salvando: { icone: <Loader2 className="h-3 w-3 animate-spin" />, texto: 'Salvando…' },
    salvo: { icone: <Check className="h-3 w-3" />, texto: 'Salvo' },
    erro: { icone: <TriangleAlert className="h-3 w-3" />, texto: 'Falha ao salvar' },
  }[estado]

  return (
    <span
      role="status"
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        estado === 'erro' && 'text-destructive',
        estado !== 'erro' && 'text-muted-foreground',
      )}
    >
      {conteudo.icone}
      {conteudo.texto}
    </span>
  )
}

function montarDadosIniciais(cena: CenaDoCanvas, tema: 'light' | 'dark') {
  return {
    elements: cena.elements as never,
    appState: { ...cena.appState, theme: tema },
    files: Object.fromEntries(
      Object.entries(cena.arquivos).map(([fileId, arquivo]) => [
        fileId,
        {
          id: fileId,
          dataURL: arquivo.dataURL,
          mimeType: arquivo.mimeType,
          created: Date.now(),
        },
      ]),
    ) as never,
    scrollToContent: cena.appState.scrollX === undefined,
  }
}

function paraArquivos(files: BinaryFiles) {
  return Object.fromEntries(
    Object.entries(files).map(([fileId, arquivo]) => [
      fileId,
      { dataURL: String(arquivo.dataURL), mimeType: String(arquivo.mimeType) },
    ]),
  )
}
