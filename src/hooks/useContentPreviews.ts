import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type {
  ContentPreviewWithMedia,
  ContentType,
  MediaType,
  PublicPreview,
} from '@/types/database'

const SELECT_WITH_MEDIA = '*, media_assets ( * )'

function sortMedia(preview: ContentPreviewWithMedia): ContentPreviewWithMedia {
  return {
    ...preview,
    media_assets: [...(preview.media_assets ?? [])].sort((a, b) => a.ordem - b.ordem),
  }
}

/**
 * Leitura de um preview pelo id, sem login.
 *
 * Usa a função get_public_preview(uuid) em vez de ler a tabela direto. A
 * diferença não é cosmética: RLS é por linha, então um SELECT anônimo na
 * tabela deixaria qualquer um LISTAR todos os previews de todos os clientes
 * com a chave anon (que vai no bundle público). A função exige o id.
 */
export function usePublicPreview(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.preview(id ?? 'none'),
    enabled: Boolean(id),
    retry: false,
    queryFn: async (): Promise<PublicPreview | null> => {
      const { data, error } = await supabase.rpc('get_public_preview', {
        preview_id: id as string,
      })
      if (error) throw error
      if (!data) return null

      const preview = data as PublicPreview
      return {
        ...preview,
        media_assets: [...(preview.media_assets ?? [])].sort((a, b) => a.ordem - b.ordem),
      }
    },
  })
}

/** Conteúdo já vinculado a um item de planejamento (decide Criar vs. Editar). */
export function usePreviewByCalendarItem(calendarItemId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.previewByCalendarItem(calendarItemId ?? 'none'),
    enabled: Boolean(calendarItemId) && Boolean(user),
    queryFn: async (): Promise<ContentPreviewWithMedia | null> => {
      const { data, error } = await supabase
        .from('content_previews')
        .select(SELECT_WITH_MEDIA)
        .eq('calendar_item_id', calendarItemId as string)
        .maybeSingle()
      if (error) throw error
      return data ? sortMedia(data as unknown as ContentPreviewWithMedia) : null
    },
  })
}

export interface MediaInput {
  url_arquivo: string
  tipo: MediaType
}

export interface SavePreviewInput {
  /** Presente = edição do mesmo registro (nunca cria um segundo). */
  id?: string | null
  calendarItemId?: string | null
  nomeExpert: string
  legenda: string
  tipo: ContentType
  /** Link do projeto no Canva. Vazio remove o botão do preview público. */
  canvaUrl: string
  media: MediaInput[]
}

/**
 * Cria OU atualiza um content_preview e reescreve suas mídias na ordem enviada.
 * Quando `calendarItemId` vem preenchido, o vínculo com o planejamento é feito
 * automaticamente no mesmo save.
 */
export function useSavePreview() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: SavePreviewInput): Promise<ContentPreviewWithMedia> => {
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')

      const payload = {
        nome_expert: input.nomeExpert.trim(),
        legenda: input.legenda.trim() ? input.legenda : null,
        tipo: input.tipo,
        canva_url: input.canvaUrl.trim() || null,
        calendar_item_id: input.calendarItemId ?? null,
      }

      let previewId = input.id ?? null

      if (previewId) {
        const { error } = await supabase.from('content_previews').update(payload).eq('id', previewId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('content_previews')
          .insert({ ...payload, user_id: user.id })
          .select('id')
          .single()
        if (error) throw error
        previewId = data.id
      }

      // Mídias são reescritas por completo: mais simples e mantém a ordem exata
      // definida no drag-and-drop da tela de criação.
      const { error: deleteError } = await supabase
        .from('media_assets')
        .delete()
        .eq('content_preview_id', previewId)
      if (deleteError) throw deleteError

      if (input.media.length) {
        const { error: insertError } = await supabase.from('media_assets').insert(
          input.media.map((asset, index) => ({
            content_preview_id: previewId as string,
            url_arquivo: asset.url_arquivo,
            tipo: asset.tipo,
            ordem: index,
          })),
        )
        if (insertError) throw insertError
      }

      const { data: saved, error: readError } = await supabase
        .from('content_previews')
        .select(SELECT_WITH_MEDIA)
        .eq('id', previewId)
        .single()
      if (readError) throw readError

      return sortMedia(saved as unknown as ContentPreviewWithMedia)
    },
    onSuccess: (preview) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.preview(preview.id) })
      if (preview.calendar_item_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.previewByCalendarItem(preview.calendar_item_id),
        })
      }
    },
  })
}

export function useDeletePreview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // media_assets cai junto por ON DELETE CASCADE.
      const { error } = await supabase.from('content_previews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
      queryClient.invalidateQueries({ queryKey: ['content-preview'] })
    },
  })
}
