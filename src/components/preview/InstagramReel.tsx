import { Bookmark, Heart, MessageCircle, MoreHorizontal, Music2, Send } from 'lucide-react'
import { InstagramAvatar } from '@/components/preview/InstagramAvatar'
import { InstagramCaption } from '@/components/preview/InstagramCaption'

interface Props {
  expert: string
  legenda: string
  videoUrl: string | null
  variant: 'reels' | 'story'
}

/** Formato vertical 9:16, vídeo em loop e legenda em overlay. */
export function InstagramReel({ expert, legenda, videoUrl, variant }: Props) {
  const isStory = variant === 'story'

  return (
    <div className="w-full max-w-[380px]">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black sm:rounded-xl">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            Sem mídia
          </div>
        )}

        {/* Gradientes de leitura, como no app */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 to-transparent" />

        {isStory ? (
          <>
            {/* Barra de progresso do story */}
            <div className="absolute inset-x-3 top-2 flex gap-1" aria-hidden>
              <span className="h-0.5 flex-1 rounded-full bg-white/40">
                <span className="block h-full w-2/3 rounded-full bg-white" />
              </span>
            </div>
            <header className="absolute inset-x-3 top-5 flex items-center gap-2 text-white">
              <InstagramAvatar name={expert} size={30} ring={false} />
              <span className="truncate text-sm font-semibold">{expert}</span>
              <span className="text-xs text-white/70">2 h</span>
              <MoreHorizontal className="ml-auto h-5 w-5" aria-hidden />
            </header>
          </>
        ) : (
          <header className="absolute right-3 top-3 text-white" aria-hidden>
            <MoreHorizontal className="h-5 w-5" />
          </header>
        )}

        {/* Rodapé com autor + legenda em overlay */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3 text-white">
          <div className="min-w-0 flex-1 space-y-2">
            {!isStory && (
              <div className="flex items-center gap-2">
                <InstagramAvatar name={expert} size={30} ring={false} />
                <span className="truncate text-sm font-semibold">{expert}</span>
                <span className="rounded border border-white/60 px-1.5 py-px text-[0.65rem] font-medium">
                  Seguir
                </span>
              </div>
            )}

            {legenda.trim() && (
              <InstagramCaption
                expert={isStory ? '' : expert}
                legenda={legenda}
                className="text-[0.8rem] text-white drop-shadow"
              />
            )}

            {!isStory && (
              <div className="flex items-center gap-1.5 text-xs text-white/90">
                <Music2 className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate">{expert} · áudio original</span>
              </div>
            )}
          </div>

          {/* Ícones de interação (apenas visuais) */}
          {!isStory && (
            <div className="flex flex-col items-center gap-4 pb-1" aria-hidden>
              <Heart className="h-6 w-6" strokeWidth={1.8} />
              <MessageCircle className="h-6 w-6 -scale-x-100" strokeWidth={1.8} />
              <Send className="h-6 w-6 -rotate-12" strokeWidth={1.8} />
              <Bookmark className="h-6 w-6" strokeWidth={1.8} />
            </div>
          )}
        </div>

        {isStory && (
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 text-white" aria-hidden>
            <span className="flex-1 rounded-full border border-white/60 px-4 py-2 text-xs text-white/80">
              Envie uma mensagem
            </span>
            <Heart className="h-6 w-6" strokeWidth={1.8} />
            <Send className="h-6 w-6 -rotate-12" strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  )
}
