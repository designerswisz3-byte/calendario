import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { numero } from '@/lib/relatorio'
import { quandoSaiu, rotuloDeFormato, tituloDaPublicacao } from '@/lib/relatorioPublicacoes'
import type { RelatorioPublicacaoRow } from '@/types/database'

interface Props {
  publicacoes: RelatorioPublicacaoRow[]
  de: string
  ate: string
  quantas?: number
}

/** Uma cor por formato — as três passaram no validador em conjunto. */
const COR_DO_FORMATO: Record<string, string> = {
  Reels: 'var(--viz-1)',
  Carrossel: 'var(--viz-3)',
  Foto: 'var(--viz-4)',
  Vídeo: 'var(--viz-1)',
  Story: 'var(--viz-4)',
}

/**
 * O que rendeu mais no período, em barra de proporção.
 *
 * A barra é relativa ao MAIOR do período, não a uma meta: o que interessa aqui
 * é "quanto este rendeu perto do melhor", e não "quanto faltou para um número
 * que ninguém definiu". Meta inventada vira barra vermelha permanente.
 *
 * O formato vira cor E texto. A cor sozinha não serve — o verde-água usado em
 * Foto fica abaixo de 3:1 contra o cartão claro, e a regra para esse caso é
 * rótulo visível, que é o que o nome ao lado faz.
 */
export function TopPublicacoes({ publicacoes, de, ate, quantas = 5 }: Props) {
  const ranking = React.useMemo(() => {
    const noPeriodo = publicacoes.filter((p) => p.dia >= de && p.dia <= ate)
    const comAlcance = noPeriodo.filter((p) => typeof p.alcance === 'number')
    return [...comAlcance]
      .sort((a, b) => (b.alcance as number) - (a.alcance as number))
      .slice(0, quantas)
  }, [publicacoes, de, ate, quantas])

  if (ranking.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma publicação com métrica neste período.
      </p>
    )
  }

  const maior = ranking[0].alcance as number

  return (
    <ol className="flex flex-col gap-4">
      {ranking.map((p, i) => {
        const formato = rotuloDeFormato(p)
        const cor = COR_DO_FORMATO[formato] ?? 'var(--viz-1)'
        const alcance = p.alcance as number
        return (
          <li key={p.midia_id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <p className="mr-auto line-clamp-1 text-sm font-medium">
                {tituloDaPublicacao(p, 70)}
              </p>
              {p.permalink && (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Abrir no Instagram: ${tituloDaPublicacao(p, 40)}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 pl-6">
              <Progress
                value={(alcance / maior) * 100}
                corDaBarra={cor}
                aria-label={`${formato}: ${numero(alcance)} de alcance`}
              />
              <span className="shrink-0 text-xs font-medium tabular-nums">{numero(alcance)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-xs text-muted-foreground">
              <span className="font-medium" style={{ color: cor }}>
                {formato}
              </span>
              <span>{quandoSaiu(p)}</span>
              {typeof p.salvamentos === 'number' && (
                <span className="tabular-nums">{numero(p.salvamentos)} salvos</span>
              )}
              {typeof p.compartilhamentos === 'number' && (
                <span className="tabular-nums">{numero(p.compartilhamentos)} compart.</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
