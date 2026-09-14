import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type { AjusteRow } from '@/types/database'

/**
 * Envio do ajuste pelo cliente, a partir do link público.
 *
 * Passa pela função enviar_ajuste() em vez de escrever na tabela: `anon` não
 * tem INSERT em `ajustes`, e a função é a única porta — ela exige um preview
 * existente e recusa texto vazio.
 */
export function useEnviarAjuste(previewId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ texto, autor }: { texto: string; autor: string }) => {
      if (!previewId) throw new Error('Preview não identificado.')

      const { data, error } = await supabase.rpc('enviar_ajuste', {
        preview_id: previewId,
        texto,
        autor: autor.trim() || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Recarrega o preview para a conversa aparecer já com o novo ajuste.
      if (previewId) queryClient.invalidateQueries({ queryKey: queryKeys.preview(previewId) })
    },
  })
}

/** Ajustes de um conteúdo, na visão do dono (RLS restringe ao próprio). */
export function useAjustes(previewId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.ajustes(previewId ?? 'none'),
    enabled: Boolean(previewId) && Boolean(user),
    queryFn: async (): Promise<AjusteRow[]> => {
      const { data, error } = await supabase
        .from('ajustes')
        .select('*')
        .eq('content_preview_id', previewId as string)
        .order('criado_em', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useApagarAjuste(previewId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ajustes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      if (previewId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.ajustes(previewId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.preview(previewId) })
      }
    },
  })
}
