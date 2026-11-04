import * as React from 'react'
import { cn } from '@/lib/utils'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  /** 0 a 100. Fora da faixa é grampeado — barra de 140% não existe. */
  value: number
  /** A cor da barra. Default: a cor primária do app. */
  corDaBarra?: string
}

/**
 * Barra de proporção.
 *
 * Sem Radix de propósito: o componente é uma div com `role="progressbar"` e os
 * `aria-*` que o leitor de tela precisa. Trazer um pacote para isso custaria
 * mais bytes do que o arquivo inteiro.
 */
export const Progress = React.forwardRef<HTMLDivElement, Props>(
  ({ className, value, corDaBarra, ...props }, ref) => {
    const preenchido = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(preenchido)}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-foreground/10', className)}
        {...props}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${preenchido}%`, backgroundColor: corDaBarra ?? 'hsl(var(--primary))' }}
        />
      </div>
    )
  },
)
Progress.displayName = 'Progress'
