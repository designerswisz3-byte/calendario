import { Check, ExternalLink, Loader2, PenSquare, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROTULO_DE_RELEVANCIA } from '@/lib/noticias'
import { cn } from '@/lib/utils'
import type { NoticiaRow } from '@/types/database'

interface Props {
  noticia: NoticiaRow
  criandoPauta: boolean
  onAlternarLida: () => void
  onVirarPauta: () => void
  onExcluir: () => void
}

/**
 * Cor da relevância.
 *
 * Só os dois degraus de cima ganham cor. Se tudo fosse colorido a lista
 * viraria um arco-íris onde nada se destaca — e o ponto da curadoria é
 * justamente que a maioria das notícias NÃO merece atenção.
 */
const COR_DE_RELEVANCIA: Record<number, string> = {
  5: 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  4: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function CartaoDeNoticia({
  noticia,
  criandoPauta,
  onAlternarLida,
  onVirarPauta,
  onExcluir,
}: Props) {
  return (
    <article
      className={cn(
        'glass space-y-2 rounded-lg p-4 transition-opacity',
        // Lida não some da lista: apaga. Sumir esconderia o que já foi
        // avaliado e faria a mesma notícia voltar a chamar atenção amanhã.
        noticia.lida && 'opacity-55',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn('text-[0.65rem]', COR_DE_RELEVANCIA[noticia.relevancia])}
        >
          {ROTULO_DE_RELEVANCIA[noticia.relevancia] ?? noticia.relevancia}
        </Badge>
        {noticia.fonte && (
          <span className="text-xs font-medium text-muted-foreground">{noticia.fonte}</span>
        )}
        {noticia.virou_pauta && (
          <Badge variant="secondary" className="text-[0.65rem]">
            Virou pauta
          </Badge>
        )}
      </div>

      <h3 className={cn('text-sm font-semibold leading-snug', noticia.lida && 'line-through decoration-1')}>
        {noticia.titulo}
      </h3>

      {noticia.resumo && (
        <p className="text-xs leading-relaxed text-muted-foreground">{noticia.resumo}</p>
      )}

      {noticia.por_que_importa && (
        <p className="rounded-md bg-foreground/[0.04] p-2 text-xs leading-relaxed">
          <span className="font-medium">Por que importa: </span>
          {noticia.por_que_importa}
        </p>
      )}

      {noticia.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {noticia.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[0.65rem] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Button size="sm" variant="outline" disabled={criandoPauta} onClick={onVirarPauta}>
          {criandoPauta ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PenSquare className="h-3.5 w-3.5" />
          )}
          Virar pauta
        </Button>

        <Button size="sm" variant="ghost" onClick={onAlternarLida}>
          <Check className="h-3.5 w-3.5" />
          {noticia.lida ? 'Marcar como não lida' : 'Marcar como lida'}
        </Button>

        {/*
          `rel="noreferrer noopener"`: a URL vem de uma coleta externa, e sem
          isso a página aberta recebe `window.opener` e pode redirecionar esta
          aba. É barato e fecha o buraco.
        */}
        <a
          href={noticia.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Abrir
        </a>

        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-7 w-7"
          onClick={onExcluir}
          aria-label={`Excluir ${noticia.titulo}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  )
}
