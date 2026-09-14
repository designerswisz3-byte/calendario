import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import { TAG_COLORS } from '@/lib/constants'
import type { TagRow } from '@/types/database'

export function useTags() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.tags(),
    enabled: Boolean(user),
    queryFn: async (): Promise<TagRow[]> => {
      const { data, error } = await supabase.from('tags').select('*').order('nome')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ nome, cor }: { nome: string; cor?: string }): Promise<TagRow> => {
      if (!user) throw new Error('Sessão ainda não aberta. Recarregue a página.')
      const color = cor ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, nome: nome.trim(), cor: color })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags() })
    },
  })
}
