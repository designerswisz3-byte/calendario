import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, SearchX } from 'lucide-react'
import { AjustesPanel } from '@/components/preview/AjustesPanel'
import { CanvaPanel } from '@/components/preview/CanvaPanel'
import { InstagramPreview } from '@/components/preview/InstagramPreview'
import { usePublicPreview } from '@/hooks/useContentPreviews'

/**
 * Tela pública e somente leitura: /preview/:id
 *
 * Não exige login (RLS permite SELECT anônimo em content_previews/media_assets)
 * e não usa o design system de glassmorphism — aqui imitamos o Instagram real.
 */
export default function PublicPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePublicPreview(id)

  // Desliga o gradiente do app enquanto esta tela estiver montada.
  React.useEffect(() => {
    document.body.dataset.surface = 'instagram'
    return () => {
      delete document.body.dataset.surface
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="sr-only">Carregando preview…</span>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center dark:bg-black">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <SearchX className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Este preview não foi encontrado ou expirou
          </h1>
          <p className="max-w-sm text-sm text-neutral-500">
            Confira se o link está completo ou peça um novo para quem enviou.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-neutral-50 px-0 py-0 dark:bg-black sm:px-4 sm:py-10">
      <div className="flex w-full flex-1 justify-center sm:flex-none">
        <InstagramPreview
          expert={data.nome_expert}
          legenda={data.legenda ?? ''}
          tipo={data.tipo}
          media={data.media_assets}
        />
      </div>

      <div className="w-full max-w-[470px] space-y-3 px-4 pt-4 sm:px-0">
        {data.canva_url && (
          <CanvaPanel
            previewId={data.id}
            canvaUrl={data.canva_url}
            visto={Boolean(data.canva_visto)}
            vistoEm={data.canva_visto_em}
          />
        )}
        <AjustesPanel previewId={data.id} ajustes={data.ajustes ?? []} />
      </div>

      <p className="px-6 py-6 text-center text-[0.7rem] text-neutral-400">
        Pré-visualização de conteúdo · o post é somente leitura
      </p>
    </div>
  )
}
