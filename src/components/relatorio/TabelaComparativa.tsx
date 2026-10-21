import { METRICAS_DE_FLUXO, ROTULOS, comSinal, numero, percentual, type Comparativo } from '@/lib/relatorio'
import { cn } from '@/lib/utils'

interface Props {
  comparativo: Comparativo
}

/**
 * Métrica a métrica: o período, o anterior e a diferença.
 *
 * O cartão grande responde "como foi o alcance". Esta tabela responde "como
 * foi tudo", que é a pergunta de quem está fechando o mês — e é o que alguém
 * relê numa reunião, onde gráfico de barra não ajuda.
 *
 * A variação some quando a cobertura dos dois períodos é diferente: comparar
 * 30 dias medidos com 12 dias medidos produz um percentual que mistura
 * performance com falta de coleta. O absoluto continua lá, porque ele é
 * verdade; o percentual é que mentiria.
 */
export function TabelaComparativa({ comparativo }: Props) {
  const { atual, anterior, fluxos } = comparativo

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Métrica</th>
            <th className="py-2 pr-3 text-right font-medium">{atual.rotulo}</th>
            <th className="py-2 pr-3 text-right font-medium">
              {anterior ? anterior.rotulo : 'anterior'}
            </th>
            <th className="py-2 text-right font-medium">Variação</th>
          </tr>
        </thead>
        <tbody>
          {/*
            * A primeira linha é o crescimento LÍQUIDO, com nome próprio.
            *
            * Mais abaixo vêm "Seguidores ganhos" e "Seguidores perdidos", que
            * são as duas parcelas dele. Três linhas em vez de uma porque as
            * três decidem coisas diferentes: ganhar 154 diz se o conteúdo
            * atrai, perder 82 diz se ele sustenta, e crescer 72 é o que sobra.
            */}
          <tr className="border-b border-border/40">
            <td className="py-2 pr-3 font-medium">Crescimento líquido</td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {comparativo.ganhoLiquido.atual === null
                ? '—'
                : comSinal(comparativo.ganhoLiquido.atual)}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
              {comparativo.ganhoLiquido.anterior === null
                ? '—'
                : comSinal(comparativo.ganhoLiquido.anterior)}
            </td>
            <td className="py-2 text-right tabular-nums">
              <Variacao variacao={comparativo.ganhoLiquido} />
            </td>
          </tr>

          {METRICAS_DE_FLUXO.map((metrica) => (
            <tr key={metrica} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3">{ROTULOS[metrica]}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {fluxos[metrica].atual === null ? '—' : numero(fluxos[metrica].atual as number)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                {fluxos[metrica].anterior === null
                  ? '—'
                  : numero(fluxos[metrica].anterior as number)}
              </td>
              <td className="py-2 text-right tabular-nums">
                <Variacao variacao={fluxos[metrica]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Variacao({ variacao }: { variacao: Comparativo['ganhoLiquido'] }) {
  if (variacao.percentual === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <span
      className={cn(
        'text-xs',
        !variacao.comparavel
          ? 'text-muted-foreground'
          : variacao.percentual > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : variacao.percentual < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground',
      )}
      title={variacao.comparavel ? undefined : 'Cobertura diferente entre os períodos'}
    >
      {percentual(variacao.percentual)}
      {variacao.diferenca !== null && (
        <span className="ml-1 opacity-70">({comSinal(variacao.diferenca)})</span>
      )}
    </span>
  )
}
