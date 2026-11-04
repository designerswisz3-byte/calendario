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

  const daRotina = sequencia.origem === 'rotina'

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
      title={
        daRotina
          ? `Sugestão da rotina: ${sequencia.titulo || 'Sem título'}`
          : sequencia.titulo || 'Sem título'
      }
      className={cn(
        'cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[0.62rem] font-medium leading-tight transition-colors',
        sequencia.publicado
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-primary/15 text-primary',
        // Sugestão da rotina é tracejada enquanto ele não mexeu nela.
        //
        // Ela aparece de madrugada, sem ele ter pedido. Se parecer igual ao
        // que ele mesmo escreveu, mais cedo ou mais tarde ele grava de olho
        // fechado uma frase que não é dele — e é o perfil dele que paga.
        // Assim que ele salva uma edição, a origem passa a `manual` e o
        // tracejado some: a sequência virou dele.
        daRotina && !sequencia.publicado && 'border border-dashed border-primary/50 bg-primary/5',
        isDragging && 'opacity-40',
      )}
    >
      {/* O número de stories é o que diz se dá tempo de gravar hoje. */}
      {daRotina && !sequencia.publicado && <span aria-hidden>✦ </span>}
      {sequencia.stories.length}· {sequencia.titulo || 'Sem título'}
    </div>
  )
}
