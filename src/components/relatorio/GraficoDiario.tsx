import * as React from 'react'
import { numero, type MetricaDeFluxo, type MetricaDiaria, type Periodo } from '@/lib/relatorio'
import { ROTULOS } from '@/lib/relatorio'
import { porDia, rotuloDeFormato, tituloDaPublicacao } from '@/lib/relatorioPublicacoes'
import { cn } from '@/lib/utils'
import type { RelatorioPublicacaoRow } from '@/types/database'

interface Props {
  dias: MetricaDiaria[]
  de: string
  ate: string
  metrica: MetricaDeFluxo
  /** A janela anterior, para a linha de média. Null = sem base. */
  anterior: Periodo | null
  /** O que foi publicado em cada dia. Vazio enquanto a coleta não passou. */
  publicacoes?: RelatorioPublicacaoRow[]
  /** O dia aberto no painel de baixo. */
  diaSelecionado?: string | null
  onSelecionarDia?: (dia: string | null) => void
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Uma barra por DIA da janela escolhida.
 *
 * O gráfico de períodos responde "qual mês foi melhor". Este responde o que
 * um dono de operação pergunta depois: "o que aconteceu no dia 14?". É onde
 * um pico de alcance encontra a publicação que o causou — literalmente: o
 * ponto em cima da barra marca o dia que teve post, e o cursor mostra qual.
 *
 * Dia sem coleta não vira barra zerada — vira falha visível na série. Barra de
 * altura zero se lê como "não aconteceu nada", e a diferença entre isso e
 * "não medimos" é a diferença entre decidir e achar.
 *
 * A linha tracejada é a MÉDIA DIÁRIA da janela anterior: é o comparativo que
 * cabe num gráfico diário sem virar sopa de duas séries sobrepostas.
 */
export function GraficoDiario({
  dias,
  de,
  ate,
  metrica,
  anterior,
  publicacoes = [],
  diaSelecionado = null,
  onSelecionarDia,
}: Props) {
  const serie = React.useMemo(() => {
    const porData = new Map(dias.map((linha) => [linha.dia, linha]))
    const pontos: { dia: string; valor: number | null }[] = []
    const fim = new Date(`${ate}T00:00:00Z`)
    for (let data = new Date(`${de}T00:00:00Z`); data <= fim; data.setUTCDate(data.getUTCDate() + 1)) {
      const chave = data.toISOString().slice(0, 10)
      const linha = porData.get(chave)
      const valor = linha?.[metrica]
      pontos.push({ dia: chave, valor: typeof valor === 'number' ? valor : null })
    }
    return pontos
  }, [dias, de, ate, metrica])

  const posts = React.useMemo(() => porDia(publicacoes), [publicacoes])

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

        {serie.map((ponto, indice) => {
          const altura = ponto.valor === null ? 0 : Math.max(2, (ponto.valor / maximo) * 100)
          const [, mes, dia] = ponto.dia.split('-')
          const doDia = posts.get(ponto.dia) ?? []
          const selecionado = diaSelecionado === ponto.dia
          /* O balão abre para o lado que tem espaço: nos últimos dias da
             janela ele sairia da tela se abrisse sempre para a direita. */
          const paraEsquerda = indice > serie.length / 2

          return (
            <button
              type="button"
              key={ponto.dia}
              onClick={() => onSelecionarDia?.(selecionado ? null : ponto.dia)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={`${dia}/${mes}`}
            >
              {ponto.valor === null ? (
                <div className="h-[3px] w-full rounded-sm border-t border-dashed border-muted-foreground/60" />
              ) : (
                <div
                  className={cn(
                    'w-full rounded-t-[3px] transition-colors',
                    selecionado ? 'bg-primary' : 'bg-primary/70 group-hover:bg-primary',
                  )}
                  style={{ height: `${altura}%` }}
                />
              )}

              {/* O ponto marca o dia que teve publicação — é o que deixa olhar
                  o gráfico e ver que o pico caiu num dia de post, antes de
                  passar o cursor em dia nenhum. */}
              {doDia.length > 0 && (
                <span className="pointer-events-none absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-500 ring-1 ring-background" />
              )}

              <div
                className={cn(
                  'pointer-events-none absolute bottom-full z-20 mb-2 hidden w-56 rounded-lg border border-border bg-popover p-2.5 text-left shadow-md group-hover:block group-focus-visible:block',
                  paraEsquerda ? 'right-0' : 'left-0',
                )}
              >
                <p className="text-xs font-semibold">
                  {dia}/{mes}
                  <span className="ml-1 font-normal text-muted-foreground">
                    {DIAS_DA_SEMANA[new Date(`${ponto.dia}T00:00:00Z`).getUTCDay()]}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ponto.valor === null
                    ? 'sem coleta'
                    : `${numero(ponto.valor)} ${ROTULOS[metrica].toLowerCase()}`}
                </p>

                {doDia.length === 0 ? (
                  <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[0.7rem] text-muted-foreground">
                    Nenhuma publicação neste dia.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5">
                    {doDia.slice(0, 3).map((publicacao) => (
                      <li key={publicacao.midia_id} className="text-[0.7rem] leading-snug">
                        <span className="font-medium text-sky-600 dark:text-sky-400">
                          {rotuloDeFormato(publicacao)}
                        </span>{' '}
                        {tituloDaPublicacao(publicacao, 60)}
                      </li>
                    ))}
                    {doDia.length > 3 && (
                      <li className="text-[0.7rem] text-muted-foreground">
                        e mais {doDia.length - 3}
                      </li>
                    )}
                  </ul>
                )}
                {onSelecionarDia && (
                  <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                    Clique para abrir o dia.
                  </p>
                )}
              </div>
            </button>
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
              className={cn(
                'flex-1 truncate text-center text-[0.55rem] leading-tight',
                diaSelecionado === ponto.dia
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
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
