import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GATILHOS, ROTULO_AEI, type AEI, type GatilhoId } from '@/lib/stories/gatilhos'
import { diagnosticarAEI } from '@/lib/stories/gerador'
import { cn } from '@/lib/utils'
import type { StoryDaSequencia } from '@/types/database'

/**
 * Como a tríade A.E.I. ficou nesta sequência, ao vivo.
 *
 * ----------------------------------------------------------------------------
 * Por que ele é calculado na tela e não guardado
 * ----------------------------------------------------------------------------
 * O gerador já devolve a conta da tríade, e seria mais simples guardar aquele
 * número junto da sequência. Só que a sequência é editável: a pessoa troca o
 * movimento do story 3, apaga o story 5, acrescenta outro. Uma conta gravada
 * no momento da geração passaria a mentir no primeiro ajuste — e mentiria
 * justamente sobre o que ela existe para avisar.
 *
 * Então ele lê os stories que estão na tela agora. Trocar um movimento
 * de informação por um de entretenimento muda a barra na hora, e é esse o
 * ponto: o medidor serve para a pessoa VER o desequilíbrio enquanto ainda está
 * editando, não depois de gravar.
 *
 * Sequência antiga não tem o campo `aei` — ela foi salva antes dele existir. O
 * medidor deriva do movimento, que sempre existe.
 */

/*
 * As três cores saem dos tokens de gráfico já validados em src/index.css, em
 * vez de cores novas: é a mesma paleta do Relatório, então as duas abas não
 * discordam sobre o que cada cor significa, e o contraste entre elas já foi
 * conferido para visão normal e para daltonismo.
 *
 * O valor entra DIRETO em `backgroundColor`. Os tokens guardam hexadecimal,
 * não as três componentes de matiz — envolver numa função de cor produz uma
 * declaração inválida, que o navegador descarta em silêncio: a barra aparece
 * vazia e os pontos da legenda somem, que foi o que aconteceu na primeira
 * versão desta tela.
 */
const CORES: Record<AEI, string> = {
  autoridade: 'var(--viz-1)',
  entretenimento: 'var(--viz-3)',
  informacao: 'var(--viz-4)',
}

const ORDEM: AEI[] = ['autoridade', 'entretenimento', 'informacao']

export function contarTriade(stories: StoryDaSequencia[]): Record<AEI, number> {
  const conta: Record<AEI, number> = { autoridade: 0, entretenimento: 0, informacao: 0 }
  for (const story of stories) {
    const ponta = (story.aei ?? GATILHOS[story.gatilho as GatilhoId]?.aei) as AEI | undefined
    if (ponta) conta[ponta] += 1
  }
  return conta
}

export function MedidorDeTriade({ stories }: { stories: StoryDaSequencia[] }) {
  const conta = contarTriade(stories)
  const total = ORDEM.reduce((soma, ponta) => soma + conta[ponta], 0)
  if (total === 0) return null

  const diagnostico = diagnosticarAEI(conta)

  return (
    <section className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tríade do dia
        </h3>
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? 'story' : 'stories'}
        </p>
      </div>

      {/* Uma barra só, dividida: a comparação que interessa é entre as três
          pontas da MESMA sequência, e barra empilhada mostra isso sem o leitor
          precisar somar nada de cabeça. */}
      <div
        className="flex h-2 overflow-hidden rounded-full bg-foreground/10"
        role="img"
        aria-label={ORDEM.map((p) => `${ROTULO_AEI[p]}: ${conta[p]}`).join(', ')}
      >
        {ORDEM.map((ponta) =>
          conta[ponta] === 0 ? null : (
            <div
              key={ponta}
              style={{
                width: `${(conta[ponta] / total) * 100}%`,
                backgroundColor: CORES[ponta],
              }}
            />
          ),
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {ORDEM.map((ponta) => (
          <li key={ponta} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className={cn('h-2 w-2 shrink-0 rounded-full', conta[ponta] === 0 && 'opacity-25')}
              style={{ backgroundColor: CORES[ponta] }}
            />
            <span className={cn(conta[ponta] === 0 && 'text-muted-foreground')}>
              {ROTULO_AEI[ponta]}
            </span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[0.65rem] tabular-nums">
              {conta[ponta]}
            </Badge>
          </li>
        ))}
      </ul>

      {diagnostico && (
        <p className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs leading-relaxed text-foreground/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
          {diagnostico}
        </p>
      )}
    </section>
  )
}
