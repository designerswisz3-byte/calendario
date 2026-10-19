import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type { StorySequenciaEntrada, StorySequenciaRow } from '@/types/database'

export function useStoriesDoMes(de: string, ate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.storiesDoMes(de, ate),
    enabled: Boolean(user),
    queryFn: async (): Promise<StorySequenciaRow[]> => {
      const { data, error } = await supabase
        .from('stories_sequencias')
        .select('*')
        .gte('data', de)
        .lte('data', ate)
        .order('data', { ascending: true })
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as StorySequenciaRow[]
    },
  })
}

export function useCriarSequencia() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entrada: StorySequenciaEntrada): Promise<StorySequenciaRow> => {
      const { data, error } = await supabase
        .from('stories_sequencias')
        .insert({ ...entrada, user_id: user!.id })
        .select('*')
        .single<StorySequenciaRow>()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useSalvarSequencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & Partial<StorySequenciaEntrada>) => {
      // `.select('id')` pelo mesmo motivo do resto do projeto: um UPDATE que
      // não acerta linha nenhuma volta SEM erro, e a tela diria "Salvo".
      const { data, error } = await supabase
        .from('stories_sequencias')
        .update(campos)
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a gravação mas não alterou nenhuma linha. Confirme que ' +
            'supabase/setup-completo.sql rodou por inteiro (tabela stories_sequencias).',
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useExcluirSequencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stories_sequencias').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}
