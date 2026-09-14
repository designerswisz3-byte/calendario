import { InstagramFeedPost } from '@/components/preview/InstagramFeedPost'
import { InstagramReel } from '@/components/preview/InstagramReel'
import { isVideoType } from '@/lib/constants'
import type { ContentType, MediaAssetRow } from '@/types/database'

interface Props {
  expert: string
  legenda: string
  tipo: ContentType
  media: Pick<MediaAssetRow, 'url_arquivo' | 'tipo'>[]
}

/** Escolhe entre feed (carrossel/post) e vertical 9:16 (reels/story). */
export function InstagramPreview({ expert, legenda, tipo, media }: Props) {
  const nome = expert.trim() || 'seu_perfil'

  if (isVideoType(tipo)) {
    const video = media.find((asset) => asset.tipo === 'video')
    return (
      <InstagramReel
        expert={nome}
        legenda={legenda}
        videoUrl={video?.url_arquivo ?? null}
        variant={tipo === 'story' ? 'story' : 'reels'}
      />
    )
  }

  const images = media.filter((asset) => asset.tipo === 'imagem').map((asset) => asset.url_arquivo)
  return <InstagramFeedPost expert={nome} legenda={legenda} images={images} />
}
