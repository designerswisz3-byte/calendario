import * as React from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ContainerDeGrafico,
  ConteudoDoTooltip,
  TooltipDoGrafico,
  type ConfiguracaoDoGrafico,
} from '@/components/ui/chart'
import { numero, ROTULOS, type MetricaDeFluxo, type MetricaDiaria, type Periodo } from '@/lib/relatorio'
import { porDia, rotuloDeFormato, tituloDaPublicacao } from '@/lib/relatorioPublicacoes'
import type { RelatorioPublicacaoRow } from '@/types/database'

interface Props {
  dias: MetricaDiaria[]
  de: string
  ate: string
  metrica: MetricaDeFluxo
  anterior: Periodo | null
  publicacoes?: RelatorioPublicacaoRow[]
  /** Clicar num ponto abre o dia embaixo do gráfico. */
  onSelecionarDia?: (dia: string | null) => void
  diaSelecionado?: string | null
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function curto(dia: string) {
  const [, mes, d] = dia.split('-')
  return `${d}/${mes}`
}

/**
 * A série principal do Relatório, dia a dia.
 *
 * Uma série só — então sem legenda: o título do cartão já diz o que é. O
 * comparativo entra como uma LINHA DE REFERÊNCIA (a média diária do período
 * anterior), e não como segunda área: duas áreas sobrepostas disputam a mesma
 * leitura e nenhuma das duas sobrevive.
 *
 * Dia sem coleta vira buraco de verdade (`null`, com `connectNulls` desligado),
 * nunca zero. Zero se lê como "não aconteceu nada", e a diferença entre isso e
 * "não medimos" é a diferença entre decidir e achar.
 */
export function PainelDeAlcance({
  dias,
  de,
  ate,
  metrica,
  anterior,
  publicacoes = [],
  onSelecionarDia,
  diaSelecionado = null,
}: Props) {
  const posts = React.useMemo(() => porDia(publicacoes), [publicacoes])

  const serie = React.useMemo(() => {
    const porData = new Map(dias.map((linha) => [linha.dia, linha]))
    const pontos: { dia: string; rotulo: string; valor: number | null; posts: number }[] = []
    const fim = new Date(`${ate}T00:00:00Z`)
    for (let d = new Date(`${de}T00:00:00Z`); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
      const chave = d.toISOString().slice(0, 10)
      const valor = porData.get(chave)?.[metrica]
      pontos.push({
        dia: chave,
        rotulo: curto(chave),
        valor: typeof valor === 'number' ? valor : null,
        posts: (posts.get(chave) ?? []).length,
      })
    }
    return pontos
  }, [dias, de, ate, metrica, posts])

  const mediaAnterior = React.useMemo(() => {
    if (!anterior || anterior.diasComDado === 0) return null
    const total = anterior.fluxos[metrica]
    return total === null ? null : Math.round(total / anterior.diasComDado)
  }, [anterior, metrica])

  const config: ConfiguracaoDoGrafico = {
    valor: { rotulo: ROTULOS[metrica], cor: 'var(--viz-1)' },
  }

  // Com muitos dias, rotular todos vira borrão. Um a cada N, sempre inteiro.
  const passo = Math.max(1, Math.ceil(serie.length / 10))

  return (
    <ContainerDeGrafico config={config} className="h-[17rem]">
      <AreaChart
        data={serie}
        margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
        accessibilityLayer
        onClick={(estado) => {
          if (!onSelecionarDia) return
          const ponto = estado?.activePayload?.[0]?.payload as { dia?: string } | undefined
          if (!ponto?.dia) return
          onSelecionarDia(ponto.dia === diaSelecionado ? null : ponto.dia)
        }}
        className={onSelecionarDia ? 'cursor-pointer' : undefined}
      >
        <defs>
          <linearGradient id="gradienteDoAlcance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="rotulo"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={passo - 1}
          minTickGap={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          /* Só abrevia acima de 10 mil. Abaixo disso, `Math.round(v/1000)`
             transformava 1.550 e 2.041 no mesmo "2k" — dois rótulos iguais em
             alturas diferentes, que é pior do que número comprido. */
          tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : numero(v))}
        />

        {mediaAnterior !== null && (
          <ReferenceLine
            y={mediaAnterior}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 4"
            strokeWidth={1}
            label={{
              value: `média anterior ${numero(mediaAnterior)}/dia`,
              position: 'insideTopRight',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 10,
            }}
          />
        )}

        <TooltipDoGrafico
          cursor={{ strokeDasharray: '3 3' }}
          /* O balão não pode receber ponteiro: ele segue o cursor e, perto da
             borda direita, acaba POR CIMA do ponto — e aí engole o clique que
             abriria o dia. Encontrado no teste de navegador, não na leitura. */
          wrapperStyle={{ pointerEvents: 'none' }}
          content={
            <ConteudoDoTooltip
              formatarRotulo={(_, payload) => {
                const ponto = payload?.[0]?.payload as { dia?: string } | undefined
                if (!ponto?.dia) return ''
                const data = new Date(`${ponto.dia}T00:00:00Z`)
                return `${curto(ponto.dia)} · ${DIAS_DA_SEMANA[data.getUTCDay()]}`
              }}
              formatarValor={(v) => numero(v)}
              rodape={(payload) => {
                /* O que saiu naquele dia, dentro do balão: é a pergunta que
                   vem logo depois de ver o pico, e exige zero cliques. */
                const ponto = payload?.[0]?.payload as { dia?: string } | undefined
                const doDia = ponto?.dia ? (posts.get(ponto.dia) ?? []) : []
                if (doDia.length === 0) return null
                return (
                  <ul className="mt-1 space-y-0.5 border-t border-border/60 pt-1.5">
                    {doDia.slice(0, 2).map((p) => (
                      <li key={p.midia_id} className="max-w-[16rem] text-[0.7rem] leading-snug">
                        <span className="font-medium" style={{ color: 'var(--viz-1)' }}>
                          {rotuloDeFormato(p)}
                        </span>{' '}
                        <span className="text-muted-foreground">{tituloDaPublicacao(p, 46)}</span>
                      </li>
                    ))}
                    {doDia.length > 2 && (
                      <li className="text-[0.7rem] text-muted-foreground">
                        e mais {doDia.length - 2}
                      </li>
                    )}
                  </ul>
                )
              }}
            />
          }
        />

        {diaSelecionado && (
          <ReferenceLine x={curto(diaSelecionado)} stroke="var(--viz-1)" strokeWidth={1.5} />
        )}

        <Area
          dataKey="valor"
          type="monotone"
          stroke="var(--viz-1)"
          strokeWidth={2}
          fill="url(#gradienteDoAlcance)"
          connectNulls={false}
          dot={false}
          /*
           * `pointerEvents: none` no ponto destacado.
           *
           * Ele aparece EXATAMENTE onde o cursor está, e sendo um <circle> do
           * SVG ele recebia o clique em vez de deixar passar para o gráfico —
           * clicar ao lado do ponto abria o dia, clicar no ponto não fazia
           * nada. O lugar mais natural para clicar era o único que não
           * funcionava. Achado no teste de navegador.
           */
          activeDot={{
            r: 4,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))',
            style: { pointerEvents: 'none' },
          }}
        />
      </AreaChart>
    </ContainerDeGrafico>
  )
}
