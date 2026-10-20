import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { StorySequenciaRow } from '@/types/database'

interface Props {
  sequencia: StorySequenciaRow
  onClick?: () => void
  draggable?: boolean
}

/**
 * A sequência como card arrastável.
 *
 * Era um `<span>` dentro da célula. Virou card para poder ser arrastada até a
 * gaveta de ideias soltas e de volta para um dia — o mesmo gesto que o
 * calendário editorial já tinha, agora aqui.
 */
export function CartaoDeSequencia({ sequencia, onClick, draggable = true }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sequencia.id,
    disabled: !draggable,
    data: { sequencia },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(evento) => {
        // A célula inteira abre o dia; o card abre a sequência. Sem parar a
        // propagação, um clique no card dispararia os dois.
        evento.stopPropagation()
        onClick?.()
      }}
      title={sequencia.titulo || 'Sem título'}
      className={cn(
        'cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[0.62rem] font-medium leading-tight transition-colors',
        sequencia.publicado
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-primary/15 text-primary',
        isDragging && 'opacity-40',
      )}
    >
      {/* O número de stories é o que diz se dá tempo de gravar hoje. */}
      {sequencia.stories.length}· {sequencia.titulo || 'Sem título'}
    </div>
  )
}
