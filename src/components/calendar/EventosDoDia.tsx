import { ExternalLink, Loader2, PenSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  COR_DE_CATEGORIA,
  COR_DE_TEXTO,
  ROTULO_DE_CATEGORIA,
  ROTULO_DE_ESCOPO,
} from '@/lib/eventos'
import { cn } from '@/lib/utils'
import type { EventoRow } from '@/types/database'

interface Props {
  eventos: EventoRow[]
  criandoId: string | null
  onVirarPauta: (evento: EventoRow) => void
}

/**
 * As datas do dia, dentro do painel.
 *
 * O bloco só existe por causa do botão "Virar pauta". Sem ele isto seria um
 * calendário de feriados, e calendário de feriado existe de graça em qualquer
 * lugar — o que não existe é a data já traduzida em briefing, com o ângulo
 * pronto para gravar.
 */
export function EventosDoDia({ eventos, criandoId, onVirarPauta }: Props) {
  if (eventos.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {eventos.length === 1 ? 'Data do dia' : 'Datas do dia'}
      </h3>

      {eventos.map((evento) => (
        <article
          key={evento.id}
          className="relative overflow-hidden rounded-lg border border-border/70 bg-background/40 p-3 pl-4"
        >
          {/* A mesma cor da faixa na grade: o olho liga a célula ao painel. */}
          <span
            className={cn('absolute inset-y-0 left-0 w-1', COR_DE_CATEGORIA[evento.categoria])}
            aria-hidden
          />

          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{evento.titulo}</h4>
            <Badge variant="outline" className={cn('text-[0.65rem]', COR_DE_TEXTO[evento.categoria])}>
              {ROTULO_DE_CATEGORIA[evento.categoria]}
            </Badge>
            <Badge variant="secondary" className="text-[0.65rem]">
              {ROTULO_DE_ESCOPO[evento.escopo]}
            </Badge>
          </div>

          {evento.local && <p className="mt-0.5 text-xs text-muted-foreground">{evento.local}</p>}

          {evento.por_que_importa && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Por que importa: </span>
              {evento.por_que_importa}
            </p>
          )}

          {evento.ideia_de_post && (
            <p className="mt-2 rounded-md bg-foreground/[0.04] p-2 text-xs leading-relaxed">
              {evento.ideia_de_post}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={criandoId === evento.id}
              onClick={() => onVirarPauta(evento)}
            >
              {criandoId === evento.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PenSquare className="h-3.5 w-3.5" />
              )}
              Virar pauta
            </Button>

            {evento.fonte_url && (
              <a
                href={evento.fonte_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Fonte
              </a>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}
