import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react'
import { InstagramAvatar } from '@/components/preview/InstagramAvatar'
import { InstagramCarousel } from '@/components/preview/InstagramCarousel'
import { InstagramCaption } from '@/components/preview/InstagramCaption'

interface Props {
  expert: string
  legenda: string
  images: string[]
}

/**
 * Simulação do post no feed (carrossel ou post único).
 * Os ícones de interação são apenas visuais — esta tela é somente leitura.
 */
export function InstagramFeedPost({ expert, legenda, images }: Props) {
  return (
    <article className="w-full max-w-[470px] overflow-hidden border-neutral-200 bg-white text-neutral-900 sm:rounded-lg sm:border dark:border-neutral-800 dark:bg-black dark:text-neutral-50">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <InstagramAvatar name={expert} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{expert}</p>
        </div>
        <MoreHorizontal className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-300" aria-hidden />
      </header>

      {/* Mídia */}
      {images.length > 0 ? (
        <InstagramCarousel images={images} alt={`Post de ${expert}`} />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
          Sem mídia
        </div>
      )}

      {/* Barra de interação (apenas visual) */}
      <div className="flex items-center gap-4 px-3 pb-1 pt-2.5" aria-hidden>
        <Heart className="h-6 w-6" strokeWidth={1.8} />
        <MessageCircle className="h-6 w-6 -scale-x-100" strokeWidth={1.8} />
        <Send className="h-6 w-6 -rotate-12" strokeWidth={1.8} />
        <Bookmark className="ml-auto h-6 w-6" strokeWidth={1.8} />
      </div>

      <div className="space-y-1 px-3 pb-4">
        <p className="text-sm font-semibold">1.248 curtidas</p>
        {legenda.trim() && <InstagramCaption expert={expert} legenda={legenda} />}
        <p className="pt-1 text-[0.68rem] uppercase tracking-wide text-neutral-500">há 2 horas</p>
      </div>
    </article>
  )
}
