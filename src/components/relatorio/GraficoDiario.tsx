import * as React from 'react'
import { numero, type MetricaDeFluxo, type MetricaDiaria, type Periodo } from '@/lib/relatorio'
import { ROTULOS } from '@/lib/relatorio'

interface Props {
  dias: MetricaDiaria[]
  de: string
  ate: string
  metrica: MetricaDeFluxo
  /** A janela anterior, para a linha de média. Null = sem base. */
  anterior: Periodo | null
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Uma barra por DIA da janela escolhida.
 *
 * O gráfico de períodos responde "qual mês foi melhor". Este responde o que
 * um dono de operação pergunta depois: "o que aconteceu no dia 14?". É onde
 * um pico de alcance encontra a publicação que o causou.
 *
 * Dia sem coleta não vira barra zerada — vira falha visível na série. Barra de
 * altura zero se lê como "não aconteceu nada", e a diferença entre isso e
 * "não medimos" é a diferença entre decidir e achar.
 *
 * A linha tracejada é a MÉDIA DIÁRIA da janela anterior: é o comparativo que
 * cabe num gráfico diário sem virar sopa de duas séries sobrepostas.
 */
export function GraficoDiario({ dias, de, ate, metrica, anterior }: Props) {
  const serie = React.useMemo(() => {
    const porDia = new Map(dias.map((linha) => [linha.dia, linha]))
    const pontos: { dia: string; valor: number | null }[] = []
    const fim = new Date(`${ate}T00:00:00Z`)
    for (let data = new Date(`${de}T00:00:00Z`); data <= fim; data.setUTCDate(data.getUTCDate() + 1)) {
      const chave = data.toISOString().slice(0, 10)
      pontos.push({ dia: chave, valor: porDia.get(chave)?.[metrica] ?? null })
    }
    return pontos
  }, [dias, de, ate, metrica])

  const maximo = Math.max(1, ...serie.map((ponto) => ponto.valor ?? 0))

  const mediaAnterior = React.useMemo(() => {
    if (!anterior || anterior.diasComDado === 0) return null
    const total = anterior.fluxos[metrica]
    return total === null ? null : total / anterior.diasComDado
  }, [anterior, metrica])

  const alturaDaMedia = mediaAnterior === null ? null : (mediaAnterior / maximo) * 100

  // Com muitos dias na tela, rotular todos vira borrão: mostra um a cada N.
  const passoDoRotulo = Math.ceil(serie.length / 12)

  return (
    <div className="space-y-1.5">
      <div className="relative flex h-40 items-end gap-[2px]">
        {alturaDaMedia !== null && alturaDaMedia <= 100 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-500/70"
            style={{ bottom: `${alturaDaMedia}%` }}
          >
            <span className="absolute -top-4 right-0 text-[0.6rem] text-amber-600 dark:text-amber-400">
              média anterior: {numero(Math.round(mediaAnterior as number))}/dia
            </span>
          </div>
        )}

        {serie.map((ponto) => {
          const altura = ponto.valor === null ? 0 : Math.max(2, (ponto.valor / maximo) * 100)
          const [, mes, dia] = ponto.dia.split('-')
          const titulo =
            ponto.valor === null
              ? `${dia}/${mes} — sem coleta`
              : `${dia}/${mes} — ${numero(ponto.valor)} ${ROTULOS[metrica].toLowerCase()}`

          return (
            <div key={ponto.dia} className="group relative flex h-full flex-1 items-end" title={titulo}>
              {ponto.valor === null ? (
                <div className="h-[3px] w-full rounded-sm border-t border-dashed border-muted-foreground/60" />
              ) : (
                <div
                  className="w-full rounded-t-[3px] bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${altura}%` }}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-[2px]">
        {serie.map((ponto, indice) => {
          const data = new Date(`${ponto.dia}T00:00:00Z`)
          const mostrar = indice % passoDoRotulo === 0
          return (
            <span
              key={ponto.dia}
              className="flex-1 truncate text-center text-[0.55rem] leading-tight text-muted-foreground"
            >
              {mostrar ? `${ponto.dia.slice(8)}/${ponto.dia.slice(5, 7)}` : ''}
              {mostrar && serie.length <= 31 && (
                <span className="block text-[0.5rem] opacity-70">
                  {DIAS_DA_SEMANA[data.getUTCDay()]}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
