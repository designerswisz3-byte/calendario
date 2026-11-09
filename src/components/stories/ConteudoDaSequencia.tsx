import { Clock, Link2, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MedidorDeTriade } from '@/components/stories/MedidorDeTriade'
import { GATILHOS, ROTULO_AEI, type GatilhoId } from '@/lib/stories/gatilhos'
import type { StorySequenciaRow } from '@/types/database'

/**
 * O que está escrito numa sequência de stories, só para ler.
 *
 * É a leitura que o card da gaveta não cabia: quantos stories são, o que cada
 * um fala, o que aparece na tela e o que ele pede de quem assiste.
 *
 * O medidor da tríade entra aqui pelo mesmo motivo que entra no editor — é o
 * que diz, em uma olhada, se vale gravar esta sequência num dia em que já
 * houve conteúdo técnico. E é justamente o tipo de decisão que se toma de
 * frente para a gaveta.
 */
export function ConteudoDaSequencia({ sequencia }: { sequencia: StorySequenciaRow }) {
  const stories = sequencia.stories ?? []

  if (stories.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
        Esta sequência foi guardada sem nenhum story escrito.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[0.7rem] font-normal">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </Badge>
        {sequencia.origem === 'rotina' && (
          <Badge variant="secondary" className="text-[0.7rem] font-normal">
            ✦ sugestão da rotina
          </Badge>
        )}
        {sequencia.publicado && (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[0.7rem] font-normal text-emerald-700 dark:text-emerald-300">
            Publicada
          </Badge>
        )}
      </div>

      <MedidorDeTriade stories={stories} />

      <ol className="space-y-3">
        {stories.map((story, i) => {
          const movimento = GATILHOS[story.gatilho as GatilhoId]
          const ponta = story.aei ?? movimento?.aei
          return (
            <li
              key={i}
              className="space-y-1.5 rounded-lg border border-border/70 bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold">
                  {story.rotulo || `Story ${story.ordem || i + 1}`}
                </span>
                {ponta && (
                  <Badge variant="outline" className="text-[0.65rem] font-normal">
                    {ROTULO_AEI[ponta]}
                  </Badge>
                )}
                {story.momento && (
                  <Badge variant="secondary" className="gap-1 text-[0.65rem] font-normal">
                    <Clock className="h-3 w-3" />
                    {story.momento}
                  </Badge>
                )}
                {story.retomada && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[0.65rem] font-normal"
                    title={story.retomada}
                  >
                    <Link2 className="h-3 w-3" />
                    amarra no anterior
                  </Badge>
                )}
              </div>

              {story.direcao_visual && (
                <p className="text-xs italic leading-relaxed text-muted-foreground">
                  {story.direcao_visual}
                </p>
              )}

              {/* As quebras de linha do texto SÃO a divisão entre as telas de
                  fala. Colapsá-las aqui tiraria a única pista de ritmo que o
                  roteiro tem. */}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {story.texto}
              </p>

              {story.pedido && (
                <p className="flex gap-1.5 rounded-md bg-foreground/[0.04] p-2 text-xs leading-relaxed text-muted-foreground">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground/70">Pedido: </span>
                    {story.pedido}
                  </span>
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {sequencia.observacao && (
        <p className="rounded-md bg-foreground/[0.04] p-2.5 text-xs leading-relaxed text-muted-foreground">
          {sequencia.observacao}
        </p>
      )}
    </div>
  )
}
