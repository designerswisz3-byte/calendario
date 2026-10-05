import * as React from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { cn } from '@/lib/utils'

/**
 * Imagem da nota com alças de redimensionar.
 *
 * Só a LARGURA é guardada; a altura fica `auto`. É o que mantém a proporção
 * sem precisar guardá-la: arrastar de lado escala a imagem inteira, que é o
 * comportamento do Notas da Apple e o que as pessoas esperam.
 *
 * A largura vai para o atributo `width` do HTML — não para um style inline —
 * porque é ele que sobrevive ao salvar, ao reabrir e à impressão em PDF.
 */

const LARGURA_MINIMA = 80

interface Arrasto {
  xInicial: number
  larguraInicial: number
  /** -1 quando a alça puxa pela esquerda: o movimento inverte. */
  sentido: 1 | -1
}

export function ImagemRedimensionavel({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const imagemRef = React.useRef<HTMLImageElement>(null)
  const arrastoRef = React.useRef<Arrasto | null>(null)
  const [arrastando, setArrastando] = React.useState(false)
  const [larguraAoVivo, setLarguraAoVivo] = React.useState<number | null>(null)

  const largura = Number(node.attrs.largura) || null
  const editavel = editor.isEditable

  const aoSegurar = React.useCallback(
    (evento: React.PointerEvent, sentido: 1 | -1) => {
      evento.preventDefault()
      evento.stopPropagation()

      const imagem = imagemRef.current
      if (!imagem) return

      arrastoRef.current = {
        xInicial: evento.clientX,
        larguraInicial: imagem.getBoundingClientRect().width,
        sentido,
      }
      setArrastando(true)

      const maxima = imagem.parentElement?.parentElement?.getBoundingClientRect().width ?? Infinity

      const mover = (e: PointerEvent) => {
        const arrasto = arrastoRef.current
        if (!arrasto) return
        const delta = (e.clientX - arrasto.xInicial) * arrasto.sentido
        const nova = Math.round(
          Math.min(maxima, Math.max(LARGURA_MINIMA, arrasto.larguraInicial + delta)),
        )
        setLarguraAoVivo(nova)
      }

      const soltar = () => {
        document.removeEventListener('pointermove', mover)
        document.removeEventListener('pointerup', soltar)
        document.body.style.removeProperty('user-select')
        document.body.style.removeProperty('cursor')
        setArrastando(false)
        setLarguraAoVivo((atual) => {
          // Grava uma vez só, no fim: um updateAttributes por pixel encheria
          // o histórico de desfazer e dispararia o autosave a cada quadro.
          if (atual) updateAttributes({ largura: atual })
          return null
        })
        arrastoRef.current = null
      }

      // Sem isto, arrastar seleciona o texto em volta da imagem.
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'
      document.addEventListener('pointermove', mover)
      document.addEventListener('pointerup', soltar)
    },
    [updateAttributes],
  )

  const larguraVisivel = larguraAoVivo ?? largura

  return (
    <NodeViewWrapper
      as="div"
      className={cn('nota-imagem relative my-3 inline-block max-w-full', selected && 'is-selected')}
      data-drag-handle
    >
      <img
        ref={imagemRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ''}
        data-anexo={node.attrs.anexo ?? undefined}
        width={larguraVisivel ?? undefined}
        className={cn(
          'block h-auto max-w-full rounded-lg border border-border/60',
          selected && 'ring-2 ring-primary',
        )}
        style={larguraVisivel ? { width: larguraVisivel } : undefined}
        draggable={false}
      />

      {editavel && (selected || arrastando) && (
        <>
          {/* Duas alças: a da direita é a natural; a da esquerda ajuda quando a
              imagem está encostada na borda do editor. */}
          <span
            role="separator"
            aria-label="Arraste para redimensionar a imagem"
            onPointerDown={(evento) => aoSegurar(evento, 1)}
            className="absolute -right-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-background bg-primary"
          />
          <span
            role="separator"
            aria-label="Arraste para redimensionar a imagem"
            onPointerDown={(evento) => aoSegurar(evento, -1)}
            className="absolute -left-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-background bg-primary"
          />

          <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-foreground/75 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-background">
            {Math.round(larguraVisivel ?? imagemRef.current?.getBoundingClientRect().width ?? 0)} px
          </span>

          {largura && (
            <button
              type="button"
              onClick={() => updateAttributes({ largura: null })}
              className="absolute left-1.5 top-1.5 rounded bg-foreground/75 px-1.5 py-0.5 text-[0.65rem] font-semibold text-background"
            >
              Tamanho original
            </button>
          )}
        </>
      )}
    </NodeViewWrapper>
  )
}
