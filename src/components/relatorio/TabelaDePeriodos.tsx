import { METRICAS_DE_FLUXO, ROTULOS, numero, type Periodo } from '@/lib/relatorio'
import { cn } from '@/lib/utils'

interface Props {
  periodos: Periodo[]
  selecionado: string
  onSelecionar: (chave: string) => void
}

/** Ordem de leitura: do topo do funil para o fundo. */
const COLUNAS = [
  'alcance',
  'views',
  'interacoes',
  'likes',
  'comentarios',
  'salvamentos',
  'compartilhamentos',
  'cliques_no_link',
  'publicacoes',
] as const satisfies readonly (typeof METRICAS_DE_FLUXO)[number][]

/**
 * O arquivo: todos os períodos, do mais recente para o mais antigo.
 *
 * A coluna "dias" não é enfeite — é a única forma de ler o resto da linha sem
 * se enganar. Um mês com 15 dias coletados tem metade do alcance por falta de
 * coleta, e sem essa coluna a linha parece performance.
 */
export function TabelaDePeriodos({ periodos, selecionado, onSelecionar }: Props) {
  const maisRecentePrimeiro = [...periodos].reverse()

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="sticky left-0 bg-background px-2 py-2 text-left font-medium">Período</th>
            <th className="px-2 py-2 text-right font-medium">Dias</th>
            <th className="px-2 py-2 text-right font-medium">Seguidores</th>
            <th className="px-2 py-2 text-right font-medium">Ganho</th>
            {COLUNAS.map((coluna) => (
              <th key={coluna} className="px-2 py-2 text-right font-medium">
                {ROTULOS[coluna]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {maisRecentePrimeiro.map((periodo) => {
            const parcial = periodo.diasComDado < periodo.diasNoPeriodo
            const ganho =
              periodo.seguidoresInicio !== null && periodo.seguidoresFim !== null
                ? periodo.seguidoresFim - periodo.seguidoresInicio
                : periodo.fluxos.seguidores_ganhos

            return (
              <tr
                key={periodo.chave}
                onClick={() => onSelecionar(periodo.chave)}
                className={cn(
                  'cursor-pointer border-b border-border/50 tabular-nums transition-colors hover:bg-foreground/5',
                  periodo.chave === selecionado && 'bg-primary/10 hover:bg-primary/15',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 whitespace-nowrap bg-background px-2 py-2 text-left font-medium',
                    periodo.chave === selecionado && 'bg-primary/10',
                  )}
                >
                  {periodo.rotulo}
                </th>
                <td
                  className={cn(
                    'px-2 py-2 text-right text-xs',
                    parcial ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                  )}
                  title={parcial ? 'Período com dias sem coleta' : 'Período completo'}
                >
                  {periodo.diasComDado}/{periodo.diasNoPeriodo}
                </td>
                <td className="px-2 py-2 text-right">{numero(periodo.seguidoresFim)}</td>
                <td className="px-2 py-2 text-right">
                  {ganho === null ? '—' : `${ganho > 0 ? '+' : ''}${numero(ganho)}`}
                </td>
                {COLUNAS.map((coluna) => (
                  <td key={coluna} className="px-2 py-2 text-right">
                    {numero(periodo.fluxos[coluna])}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
