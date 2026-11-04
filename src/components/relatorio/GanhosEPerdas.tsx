import * as React from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ContainerDeGrafico,
  ConteudoDoTooltip,
  LegendaDoGrafico,
  TooltipDoGrafico,
  type ConfiguracaoDoGrafico,
} from '@/components/ui/chart'
import { numero, type MetricaDiaria } from '@/lib/relatorio'

interface Props {
  dias: MetricaDiaria[]
  de: string
  ate: string
}

const CONFIG: ConfiguracaoDoGrafico = {
  ganhos: { rotulo: 'Seguiu', cor: 'var(--viz-1)' },
  perdas: { rotulo: 'Deixou de seguir', cor: 'var(--viz-2)' },
}

function curto(dia: string) {
  const [, mes, d] = dia.split('-')
  return `${d}/${mes}`
}

/**
 * Quem entrou e quem saiu, no mesmo eixo, espelhados pelo zero.
 *
 * Duas barras lado a lado diriam a mesma coisa pior: espelhado, a altura acima
 * do zero contra a altura abaixo É o saldo, lido sem fazer conta. Um dia que
 * ganhou 4 e perdeu 4 fica visivelmente simétrico, e é exatamente o dia que
 * passa despercebido num gráfico só de ganhos.
 *
 * Perda entra NEGATIVA no dado e volta positiva no rótulo: o eixo precisa do
 * sinal para espelhar, a pessoa não precisa ver "-4 perdidos".
 *
 * A cor não é verde-e-vermelho. Esse par falha o teste de daltonismo
 * (ΔE 5,8 em deuteranopia, abaixo do piso); índigo contra vermelho passa com
 * folga nos dois temas, e continua lendo como opostos.
 */
export function GanhosEPerdas({ dias, de, ate }: Props) {
  const serie = React.useMemo(() => {
    const porData = new Map(dias.map((linha) => [linha.dia, linha]))
    const pontos: {
      dia: string
      rotulo: string
      ganhos: number | null
      perdas: number | null
    }[] = []
    const fim = new Date(`${ate}T00:00:00Z`)
    for (let d = new Date(`${de}T00:00:00Z`); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
      const chave = d.toISOString().slice(0, 10)
      const linha = porData.get(chave)
      const g = linha?.seguidores_ganhos
      const p = linha?.seguidores_perdidos
      pontos.push({
        dia: chave,
        rotulo: curto(chave),
        ganhos: typeof g === 'number' ? g : null,
        perdas: typeof p === 'number' ? -p : null,
      })
    }
    return pontos
  }, [dias, de, ate])

  const temDado = serie.some((p) => p.ganhos !== null || p.perdas !== null)
  const totais = React.useMemo(() => {
    const g = serie.reduce((s, p) => s + (p.ganhos ?? 0), 0)
    const p = serie.reduce((s, x) => s + (x.perdas ?? 0), 0)
    return { ganhos: g, perdas: -p, liquido: g + p }
  }, [serie])

  if (!temDado) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        A série de ganhos e perdas ainda não foi coletada para este período.
      </p>
    )
  }

  const passo = Math.max(1, Math.ceil(serie.length / 9))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="tabular-nums" style={{ color: 'var(--viz-1)' }}>
          <strong>+{numero(totais.ganhos)}</strong> seguiram
        </span>
        <span className="tabular-nums" style={{ color: 'var(--viz-2)' }}>
          <strong>−{numero(totais.perdas)}</strong> saíram
        </span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          saldo{' '}
          <strong className="text-foreground">
            {totais.liquido > 0 ? '+' : ''}
            {numero(totais.liquido)}
          </strong>
        </span>
      </div>

      <ContainerDeGrafico config={CONFIG} className="h-48">
        <BarChart data={serie} margin={{ left: 4, right: 8, top: 4 }} stackOffset="sign" accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            interval={passo - 1}
            minTickGap={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v: number) => String(Math.abs(v))}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <TooltipDoGrafico
            cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
            content={
              <ConteudoDoTooltip
                // Perda volta positiva: o eixo precisa do sinal, a leitura não.
                formatarValor={(v) => numero(Math.abs(v))}
              />
            }
          />
          {/* 2px de respiro entre as duas pilhas — sem isso elas encostam e
              viram um bloco só na virada do zero. */}
          <Bar dataKey="ganhos" stackId="s" fill="var(--viz-1)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="perdas" stackId="s" fill="var(--viz-2)" radius={[0, 0, 3, 3]} maxBarSize={22} />
        </BarChart>
      </ContainerDeGrafico>
      <LegendaDoGrafico chaves={['ganhos', 'perdas']} />
    </div>
  )
}
