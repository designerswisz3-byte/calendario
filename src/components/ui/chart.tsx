import * as React from 'react'
import { ResponsiveContainer, Tooltip as TooltipRecharts } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * O mínimo do shadcn/chart que este app usa.
 *
 * A versão original carrega tema claro/escuro por CSS injetado. Aqui não
 * precisa: o app já tem variáveis de tema no `:root`, e as séries leem
 * `hsl(var(--...))` direto. Menos código e uma fonte de verdade só para cor.
 */

export interface ConfiguracaoDeSerie {
  rotulo: string
  cor?: string
}

export type ConfiguracaoDoGrafico = Record<string, ConfiguracaoDeSerie>

const ContextoDoGrafico = React.createContext<ConfiguracaoDoGrafico>({})

export function useConfiguracaoDoGrafico() {
  return React.useContext(ContextoDoGrafico)
}

/**
 * Embrulho responsivo + as regras de estilo que o Recharts não cobre sozinho:
 * eixo e grade recuam para o fundo, o texto usa as cores de texto do app (e
 * nunca a cor da série), e o foco não desenha contorno preto no SVG.
 */
export function ContainerDeGrafico({
  config,
  className,
  children,
}: {
  config: ConfiguracaoDoGrafico
  className?: string
  children: React.ComponentProps<typeof ResponsiveContainer>['children']
}) {
  return (
    <ContextoDoGrafico.Provider value={config}>
      <div
        className={cn(
          'w-full text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          '[&_.recharts-cartesian-grid_line]:stroke-border/60',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-foreground/5',
          '[&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ContextoDoGrafico.Provider>
  )
}

export const TooltipDoGrafico = TooltipRecharts

interface ConteudoProps {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>
  label?: string | number
  /** Formata o rótulo do topo. Sem isto, sai a chave crua do eixo. */
  formatarRotulo?: (valor: string | number, payload?: ConteudoProps['payload']) => React.ReactNode
  formatarValor?: (valor: number, chave: string) => string
  /** Linha extra embaixo — serve para dizer o que saiu naquele dia. */
  rodape?: (payload: ConteudoProps['payload']) => React.ReactNode
}

/**
 * O balão do gráfico.
 *
 * O valor usa tipografia tabular e cor de TEXTO, não a da série: o quadradinho
 * colorido ao lado já carrega a identidade, e número colorido fica ilegível
 * contra o fundo do balão em um dos dois temas.
 */
export function ConteudoDoTooltip({
  active,
  payload,
  label,
  formatarRotulo,
  formatarValor,
  rodape,
}: ConteudoProps) {
  const config = useConfiguracaoDoGrafico()
  if (!active || !payload?.length) return null

  return (
    <div className="grid min-w-[9rem] gap-1.5 rounded-lg border border-border/60 bg-popover px-2.5 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <p className="font-medium text-popover-foreground">
          {formatarRotulo ? formatarRotulo(label, payload) : label}
        </p>
      )}
      <div className="grid gap-1">
        {payload.map((item) => {
          const chave = String(item.dataKey ?? item.name ?? '')
          const serie = config[chave]
          return (
            <div key={chave} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: serie?.cor ?? item.color }}
              />
              <span className="mr-auto text-muted-foreground">{serie?.rotulo ?? chave}</span>
              <span className="font-medium tabular-nums text-popover-foreground">
                {typeof item.value === 'number'
                  ? formatarValor
                    ? formatarValor(item.value, chave)
                    : item.value.toLocaleString('pt-BR')
                  : '—'}
              </span>
            </div>
          )
        })}
      </div>
      {rodape?.(payload)}
    </div>
  )
}

/** Legenda: some quando há uma série só — o título já diz o que é. */
export function LegendaDoGrafico({ chaves }: { chaves: string[] }) {
  const config = useConfiguracaoDoGrafico()
  if (chaves.length < 2) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {chaves.map((chave) => (
        <span key={chave} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: config[chave]?.cor }}
          />
          {config[chave]?.rotulo ?? chave}
        </span>
      ))}
    </div>
  )
}
