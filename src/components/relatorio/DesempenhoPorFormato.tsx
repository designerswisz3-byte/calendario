import * as React from 'react'
import { numero } from '@/lib/relatorio'
import { rotuloDeFormato } from '@/lib/relatorioPublicacoes'
import type { RelatorioPublicacaoRow } from '@/types/database'

interface Props {
  publicacoes: RelatorioPublicacaoRow[]
  de: string
  ate: string
}

const COR: Record<string, string> = {
  Reels: 'var(--viz-1)',
  Carrossel: 'var(--viz-3)',
  Foto: 'var(--viz-4)',
  Vídeo: 'var(--viz-1)',
  Story: 'var(--viz-4)',
}

/**
 * Alcance MÉDIO por formato — não o total.
 *
 * O total premiaria o formato mais publicado, que é a pergunta errada: se ele
 * postou 12 reels e 2 carrosséis, o reels ganha no total mesmo rendendo menos
 * por peça. A decisão aqui é "o que vale a pena gravar da próxima vez", e essa
 * só o número por peça responde. A contagem vai junto, porque média de duas
 * peças não é média de doze.
 */
export function DesempenhoPorFormato({ publicacoes, de, ate }: Props) {
  const linhas = React.useMemo(() => {
    const grupos = new Map<string, { alcance: number[]; salvos: number[] }>()
    for (const p of publicacoes) {
      if (p.dia < de || p.dia > ate) continue
      if (typeof p.alcance !== 'number') continue
      const chave = rotuloDeFormato(p)
      const grupo = grupos.get(chave) ?? { alcance: [], salvos: [] }
      grupo.alcance.push(p.alcance)
      if (typeof p.salvamentos === 'number') grupo.salvos.push(p.salvamentos)
      grupos.set(chave, grupo)
    }
    return [...grupos.entries()]
      .map(([formato, g]) => ({
        formato,
        posts: g.alcance.length,
        alcanceMedio: Math.round(g.alcance.reduce((s, v) => s + v, 0) / g.alcance.length),
        salvosMedio: g.salvos.length
          ? Math.round(g.salvos.reduce((s, v) => s + v, 0) / g.salvos.length)
          : null,
      }))
      .sort((a, b) => b.alcanceMedio - a.alcanceMedio)
  }, [publicacoes, de, ate])

  if (linhas.length === 0) return null

  const maior = linhas[0].alcanceMedio

  return (
    <div className="space-y-3">
      {linhas.map((l) => (
        <div key={l.formato} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-medium" style={{ color: COR[l.formato] }}>
            {l.formato}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-[3px] bg-foreground/[0.06]">
            <div
              className="h-full rounded-[3px]"
              style={{
                width: `${Math.max(2, (l.alcanceMedio / maior) * 100)}%`,
                backgroundColor: COR[l.formato] ?? 'var(--viz-1)',
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
            {numero(l.alcanceMedio)}
          </span>
          <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {l.posts} {l.posts === 1 ? 'post' : 'posts'}
          </span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Alcance <strong>médio por peça</strong>, não o total — o total premiaria o formato que você
        mais publica, que é outra pergunta.
      </p>
    </div>
  )
}
