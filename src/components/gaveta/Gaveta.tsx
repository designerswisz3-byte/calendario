import { useDroppable } from '@dnd-kit/core'
import { Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Id do alvo de soltura. O `handleDragEnd` da página decide o que fazer. */
  id: string
  titulo: string
  /** O que cabe aqui, em uma linha. Aparece quando a gaveta está vazia. */
  explicacao: string
  quantidade: number
  children: React.ReactNode
}

/**
 * A gaveta de ideias soltas.
 *
 * O caso que ela resolve: a ideia nasceu com data, o dia chegou e ela não foi
 * usada. Sem gaveta, as duas saídas eram apagar (perde a ideia) ou deixar o
 * item morto na grade (suja o mês e estraga a contagem de progresso). Guardar
 * é a terceira saída, e é a que a pessoa realmente quer.
 *
 * Fica ao LADO da grade, não numa tela separada, porque o movimento é de ida e
 * volta: a ideia guardada em novembro é a pauta de janeiro, e isso só acontece
 * se ela estiver visível enquanto o mês é planejado. Gaveta em outra aba é
 * gaveta que ninguém abre.
 */
export function Gaveta({ id, titulo, explicacao, quantidade, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { gaveta: true } })

  return (
    <aside
      ref={setNodeRef}
      aria-label={`${titulo}, ${quantidade} ${quantidade === 1 ? 'ideia' : 'ideias'}`}
      className={cn(
        'flex w-full shrink-0 flex-col gap-2 rounded-lg border border-dashed border-border/70 bg-white/30 p-2.5 transition-all duration-200 xl:w-56 dark:bg-white/[0.03]',
        isOver && 'border-solid border-primary bg-accent/70 ring-2 ring-primary/40 dark:bg-accent/40',
      )}
    >
      <header className="flex items-center gap-1.5">
        <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h3>
        {quantidade > 0 && (
          <span className="ml-auto rounded-full bg-foreground/10 px-1.5 text-[0.62rem] font-semibold tabular-nums text-muted-foreground">
            {quantidade}
          </span>
        )}
      </header>

      {quantidade === 0 ? (
        /*
         * A gaveta vazia explica o gesto em vez de só dizer "vazio".
         * Alvo de arrastar que não diz o que aceita não é descoberto: a pessoa
         * não vai tentar arrastar para ver o que acontece.
         */
        <p className="rounded-md border border-dashed border-border/60 p-3 text-[0.68rem] leading-relaxed text-muted-foreground">
          {explicacao}
        </p>
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-1.5 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      )}
    </aside>
  )
}
