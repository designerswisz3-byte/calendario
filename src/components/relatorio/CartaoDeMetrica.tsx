import { ArrowDownRight, ArrowRight, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { comSinal, numero, percentual, type Variacao } from '@/lib/relatorio'
import { cn } from '@/lib/utils'

interface Props {
  titulo: string
  variacao: Variacao
  /** Nome do período anterior, para o comparativo dizer contra o quê. */
  rotuloAnterior: string | null
  /**
   * Métrica em que cair é bom? Nenhuma aqui é, mas deixa a decisão explícita
   * em vez de assumir que verde = subiu para sempre.
   */
  menorEhMelhor?: boolean
}

/**
 * Um número e a variação dele contra o período anterior.
 *
 * O cartão só pinta a variação de verde ou vermelho quando a comparação é
 * honesta — mesmo número de dias coletados nos dois lados. Quando não é, o
 * percentual aparece em cinza com um aviso: um mês de 15 dias contra um de 30
 * "cai 50%" sem nada ter piorado, e é esse número que viraria decisão errada.
 */
export function CartaoDeMetrica({ titulo, variacao, rotuloAnterior, menorEhMelhor }: Props) {
  const { atual, diferenca, percentual: pct, comparavel } = variacao
  const subiu = diferenca !== null && diferenca > 0
  const desceu = diferenca !== null && diferenca < 0
  const bom = menorEhMelhor ? desceu : subiu
  const ruim = menorEhMelhor ? subiu : desceu

  const Icone = subiu ? ArrowUpRight : desceu ? ArrowDownRight : ArrowRight

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{numero(atual)}</p>

      {diferenca === null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {/*
            Três ausências diferentes, três frases diferentes. Dizer "sem dado
            no período anterior" num cartão que está vazio nos DOIS lados faz
            parecer que o número atual existe — e ele é que falta.
          */}
          {atual === null
            ? 'Sem dado neste período'
            : rotuloAnterior
              ? 'Sem dado no período anterior'
              : 'Primeiro período da série'}
        </p>
      ) : (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-xs font-medium tabular-nums',
            !comparavel && 'text-muted-foreground',
            comparavel && bom && 'text-emerald-600 dark:text-emerald-400',
            comparavel && ruim && 'text-rose-600 dark:text-rose-400',
            comparavel && !bom && !ruim && 'text-muted-foreground',
          )}
        >
          {!comparavel && <TriangleAlert className="h-3.5 w-3.5 shrink-0" />}
          <Icone className="h-3.5 w-3.5 shrink-0" />
          <span>
            {pct === null ? comSinal(diferenca) : percentual(pct)}
            {pct !== null && ` (${comSinal(diferenca)})`}
          </span>
          {rotuloAnterior && (
            <span className="truncate font-normal text-muted-foreground">vs {rotuloAnterior}</span>
          )}
        </div>
      )}
    </Card>
  )
}
