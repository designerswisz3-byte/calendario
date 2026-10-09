import * as React from 'react'
import { numero, type MetricaDeFluxo, type Periodo } from '@/lib/relatorio'
import { cn } from '@/lib/utils'

interface Props {
  periodos: Periodo[]
  metrica: MetricaDeFluxo
  /** Período em foco, destacado no gráfico. */
  selecionado: string
  onSelecionar: (chave: string) => void
}

/**
 * Barras em SVG, escritas à mão.
 *
 * Nenhuma biblioteca de gráfico: o que esta tela precisa desenhar é uma barra
 * por período com um rótulo embaixo. Recharts ou Chart.js custariam de 90 KB a
 * 180 KB no bundle para fazer isso, e o Relatório já carrega sob demanda por
 * causa do peso da aba. Barra é `<rect>`.
 *
 * Período sem dado nenhum (null) não vira barra de altura zero — vira uma
 * marca tracejada. Barra zerada se leria como queda real.
 */
export function GraficoDePeriodos({ periodos, metrica, selecionado, onSelecionar }: Props) {
  const maximo = React.useMemo(
    () => Math.max(1, ...periodos.map((p) => p.fluxos[metrica] ?? 0)),
    [periodos, metrica],
  )

  if (periodos.length === 0) return null

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {periodos.map((periodo) => {
        const valor = periodo.fluxos[metrica]
        const altura = valor === null ? 0 : Math.max(2, (valor / maximo) * 100)
        const ativo = periodo.chave === selecionado
        const parcial = periodo.diasComDado < periodo.diasNoPeriodo

        return (
          <button
            key={periodo.chave}
            type="button"
            onClick={() => onSelecionar(periodo.chave)}
            className="group flex min-w-[2.75rem] flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-1 transition-colors hover:bg-foreground/5"
            title={`${periodo.rotulo}: ${numero(valor)} — ${periodo.diasComDado} de ${periodo.diasNoPeriodo} dias com dado`}
            aria-label={`${periodo.rotulo}: ${numero(valor)}`}
            aria-pressed={ativo}
          >
            <span
              className={cn(
                'text-[10px] font-medium tabular-nums transition-colors',
                ativo ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {valor === null ? '—' : numero(valor)}
            </span>

            <span className="flex h-28 w-full items-end justify-center">
              {valor === null ? (
                // Sem dado: traço vazado, nunca uma barra de altura zero.
                <span className="h-1.5 w-full rounded border border-dashed border-muted-foreground/50" />
              ) : (
                <span
                  className={cn(
                    'w-full rounded-t transition-colors',
                    ativo ? 'bg-primary' : 'bg-primary/35 group-hover:bg-primary/60',
                    // Período incompleto fica listrado: a barra é menor porque
                    // faltam dias, não porque a performance caiu.
                    parcial &&
                      'bg-[repeating-linear-gradient(45deg,currentColor_0_3px,transparent_3px_6px)] text-primary/70',
                  )}
                  style={{ height: `${altura}%` }}
                />
              )}
            </span>

            <span
              className={cn(
                'whitespace-nowrap text-[10px] transition-colors',
                ativo ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {periodo.rotulo}
            </span>
            {parcial && (
              <span className="text-[9px] leading-none text-amber-600 dark:text-amber-400">
                {periodo.diasComDado}/{periodo.diasNoPeriodo}d
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
