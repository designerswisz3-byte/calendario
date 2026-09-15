import * as React from 'react'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Music2, Send } from 'lucide-react'
import { InstagramAvatar } from '@/components/preview/InstagramAvatar'
import { InstagramCaption } from '@/components/preview/InstagramCaption'
import { VideoPlayer } from '@/components/preview/VideoPlayer'

interface Props {
  expert: string
  legenda: string
  /** A mídia em destaque. Um story também pode ser uma imagem parada. */
  midia: { url: string; tipo: 'imagem' | 'video' } | null
  variant: 'reels' | 'story'
}

/**
 * Formato vertical 9:16.
 *
 * A legenda fica ABAIXO da mídia, na mesma casca do carrossel, e não em
 * overlay: um roteiro de reels tem muitas linhas e cobria o vídeo inteiro,
 * justamente o que o cliente precisa ver para aprovar. Dentro do vídeo ficam
 * só os elementos que identificam o formato.
 */
export function InstagramReel({ expert, legenda, midia, variant }: Props) {
  const isStory = variant === 'story'
  const [mudo, setMudo] = React.useState(true)
  const [volume, setVolume] = React.useState(1)

  return (
    <article className="w-full max-w-[380px] overflow-hidden border-neutral-200 bg-white text-neutral-900 sm:rounded-lg sm:border dark:border-neutral-800 dark:bg-black dark:text-neutral-50">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <InstagramAvatar name={expert} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{expert}</p>
          <p className="truncate text-xs leading-tight text-neutral-500">
            {isStory ? 'Story' : 'Reels'}
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-300" aria-hidden />
      </header>

      {/* Mídia 9:16 */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
        {midia?.tipo === 'video' ? (
          <VideoPlayer
            src={midia.url}
            ativo
            mudo={mudo}
            volume={volume}
            onMudoChange={setMudo}
            onVolumeChange={setVolume}
          />
        ) : midia ? (
          // object-contain: uma arte 4:5 aqui perderia metade com corte.
          <img
            src={midia.url}
            alt={`Conteúdo de ${expert}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            Sem mídia
          </div>
        )}

        {/* Barra de progresso do story: o único overlay que sobrou */}
        {isStory && (
          <div className="pointer-events-none absolute inset-x-3 top-2 flex gap-1" aria-hidden>
            <span className="h-0.5 flex-1 rounded-full bg-white/40">
              <span className="block h-full w-2/3 rounded-full bg-white" />
            </span>
          </div>
        )}
      </div>

      {/* Barra de interação (apenas visual) */}
      <div className="flex items-center gap-4 px-3 pb-1 pt-2.5" aria-hidden>
        <Heart className="h-6 w-6" strokeWidth={1.8} />
        <MessageCircle className="h-6 w-6 -scale-x-100" strokeWidth={1.8} />
        <Send className="h-6 w-6 -rotate-12" strokeWidth={1.8} />
        <Bookmark className="ml-auto h-6 w-6" strokeWidth={1.8} />
      </div>

      <div className="space-y-1 px-3 pb-4">
        {!isStory && <p className="text-sm font-semibold">1.248 curtidas</p>}
        {legenda.trim() && <InstagramCaption expert={expert} legenda={legenda} />}
        {!isStory && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-neutral-500">
            <Music2 className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate">{expert} · áudio original</span>
          </p>
        )}
        <p className="pt-1 text-[0.68rem] uppercase tracking-wide text-neutral-500">há 2 horas</p>
      </div>
    </article>
  )
}
