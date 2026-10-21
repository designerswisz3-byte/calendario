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
          <tr className="border-b border-border/40">
            <td className="py-2 pr-3">Seguidores ganhos</td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {comparativo.seguidoresGanhos.atual === null
                ? '—'
                : comSinal(comparativo.seguidoresGanhos.atual)}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
              {comparativo.seguidoresGanhos.anterior === null
                ? '—'
                : comSinal(comparativo.seguidoresGanhos.anterior)}
            </td>
            <td className="py-2 text-right tabular-nums">
              <Variacao variacao={comparativo.seguidoresGanhos} />
            </td>
          </tr>

          {/*
            * `seguidores_ganhos` sai da lista: ele já tem a linha acima, e as
            * duas podem divergir de propósito. A de cima prefere a diferença
            * entre dois snapshots de total (que inclui quem saiu); esta seria
            * a soma das entradas do dia. Mostrar as duas lado a lado, com o
            * mesmo nome e números diferentes, é como se desconfia de um painel.
            */}
          {METRICAS_DE_FLUXO.filter((metrica) => metrica !== 'seguidores_ganhos').map((metrica) => (
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

function Variacao({ variacao }: { variacao: Comparativo['seguidoresGanhos'] }) {
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
