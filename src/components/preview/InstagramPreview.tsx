import { InstagramFeedPost } from '@/components/preview/InstagramFeedPost'
import { InstagramReel } from '@/components/preview/InstagramReel'
import { aceitaVariasMidias, isVideoType } from '@/lib/constants'
import type { ContentType, MediaAssetRow } from '@/types/database'

interface Props {
  expert: string
  legenda: string
  tipo: ContentType
  media: Pick<MediaAssetRow, 'url_arquivo' | 'tipo'>[]
}

/**
 * Escolhe entre feed (carrossel/post) e vertical 9:16 (reels/story).
 *
 * O upload aceita até 20 mídias, mas cada formato mostra o que o Instagram
 * mostraria: o carrossel exibe todos os slides; os demais usam a primeira.
 */
export function InstagramPreview({ expert, legenda, tipo, media }: Props) {
  const nome = expert.trim() || 'seu_perfil'
  const slides = media.map((asset) => ({ url: asset.url_arquivo, tipo: asset.tipo }))

  if (isVideoType(tipo)) {
    return (
      <InstagramReel
        expert={nome}
        legenda={legenda}
        midia={slides[0] ?? null}
        variant={tipo === 'story' ? 'story' : 'reels'}
      />
    )
  }

  return (
    <InstagramFeedPost
      expert={nome}
      legenda={legenda}
      slides={aceitaVariasMidias(tipo) ? slides : slides.slice(0, 1)}
    />
  )
}
