import * as React from 'react'
import { Excalidraw, getSceneVersion } from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { ChevronDown, PenLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CanvasDados } from '@/types/database'
import '@excalidraw/excalidraw/index.css'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}
if (typeof window !== 'undefined') window.EXCALIDRAW_ASSET_PATH = '/'

/** Fora do componente: props recriadas re-renderizam o Excalidraw à toa. */
const UI_OPTIONS = { canvasActions: { loadScene: false, saveToActiveFile: false } } as const

/** Só estes campos do appState voltam ao reabrir. O resto é estado de UI. */
const CAMPOS_DE_VISUALIZACAO = ['viewBackgroundColor', 'scrollX', 'scrollY', 'zoom'] as const

interface Props {
  /** Id da nota: troca de nota tem que refazer o quadro do zero. */
  notaId: string
  desenho: CanvasDados | null
  onChange: (desenho: CanvasDados) => void
  tema: 'light' | 'dark'
}

function filtrarAppState(appState: AppState) {
  const saida: Record<string, unknown> = {}
  for (const campo of CAMPOS_DE_VISUALIZACAO) {
    const valor = (appState as unknown as Record<string, unknown>)[campo]
    if (valor !== undefined) saida[campo] = valor
  }
  return saida
}

/**
 * O desenho da nota.
 *
 * Fica fechado por padrão e só monta o Excalidraw quando aberto: é o bundle
 * mais pesado do app, e a maioria das notas é só texto.
 */
export function DesenhoDaNota({ notaId, desenho, onChange, tema }: Props) {
  const [aberto, setAberto] = React.useState(() => (desenho?.elements?.length ?? 0) > 0)

  // Ao trocar de nota, o painel volta ao estado da nota nova.
  React.useEffect(() => {
    setAberto((desenho?.elements?.length ?? 0) > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notaId])

  const versaoRef = React.useRef<number | null>(null)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  const dadosIniciais = React.useMemo(
    () => ({
      elements: (desenho?.elements ?? []) as never,
      appState: { ...(desenho?.appState ?? {}), theme: tema },
      scrollToContent: true,
    }),
    // Só na montagem (e ao trocar de nota) — o Excalidraw ignora mudanças
    // posteriores em initialData de qualquer forma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notaId],
  )

  const aoMudar = React.useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, _files: BinaryFiles) => {
      const versao = getSceneVersion(elements)
      if (versao === versaoRef.current) return
      versaoRef.current = versao
      onChangeRef.current({
        elements: elements.filter((el) => !el.isDeleted) as unknown[],
        appState: filtrarAppState(appState),
      })
    },
    [],
  )

  const temConteudo = (desenho?.elements?.length ?? 0) > 0

  return (
    <section className="border-t border-border/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAberto((v) => !v)}
          className="gap-2"
        >
          <PenLine className="h-4 w-4" />
          Desenho
          {temConteudo && !aberto && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[0.65rem] font-semibold text-primary">
              {desenho?.elements?.length}
            </span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
        </Button>

        {aberto && temConteudo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (!window.confirm('Apagar o desenho desta nota?')) return
              versaoRef.current = null
              onChangeRef.current({ elements: [], appState: {} })
              setAberto(false)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {aberto && (
        <div className="h-[26rem] w-full border-t border-border/60">
          <Excalidraw
            key={notaId}
            theme={tema}
            langCode="pt-BR"
            onChange={aoMudar}
            initialData={dadosIniciais}
            UIOptions={UI_OPTIONS}
          />
        </div>
      )}
    </section>
  )
}
