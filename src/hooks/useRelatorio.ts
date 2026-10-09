import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type {
  RedeSocial,
  RelatorioMetricaEntrada,
  RelatorioMetricaRow,
  RelatorioPerfilRow,
} from '@/types/database'

export function usePerfis() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.relatorioPerfis(),
    enabled: Boolean(user),
    queryFn: async (): Promise<RelatorioPerfilRow[]> => {
      const { data, error } = await supabase
        .from('relatorio_perfis')
        .select('*')
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as RelatorioPerfilRow[]
    },
  })
}

/**
 * Todos os dias de um perfil, sem janela.
 *
 * Parece exagero e não é: a aba pediu "todos os meses arquivados", e um ano
 * inteiro são 365 linhas de onze números — menos bytes do que uma foto do
 * calendário. Puxar tudo de uma vez é o que deixa mensal, semanal e qualquer
 * comparativo saírem da mesma resposta, sem ir ao banco a cada clique.
 */
export function useMetricas(perfilId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.relatorioMetricas(perfilId ?? 'nenhum'),
    enabled: Boolean(user) && Boolean(perfilId),
    queryFn: async (): Promise<RelatorioMetricaRow[]> => {
      const { data, error } = await supabase
        .from('relatorio_metricas_diarias')
        .select('*')
        .eq('perfil_id', perfilId as string)
        .order('dia', { ascending: true })
      if (error) throw error
      return (data ?? []) as RelatorioMetricaRow[]
    },
  })
}

export function useCriarPerfil() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entrada: { handle: string; nome: string; rede: RedeSocial }) => {
      const { data, error } = await supabase
        .from('relatorio_perfis')
        // O "@" é enfeite de exibição: guardar os dois formatos criaria dois
        // perfis para o mesmo handle e o unique não pegaria.
        .insert({ ...entrada, handle: entrada.handle.replace(/^@/, '').trim(), user_id: user!.id })
        .select('*')
        .single<RelatorioPerfilRow>()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.relatorioPerfis() })
    },
  })
}

export function useExcluirPerfil() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('relatorio_perfis').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.relatorioPerfis() })
    },
  })
}

/**
 * Importa dias de métricas.
 *
 * `upsert` com `onConflict: 'perfil_id,dia'`: reimportar o mesmo mês corrige
 * os dias em vez de duplicá-los. Sem isso, cada reimportação dobraria o
 * alcance do período — o tipo de erro que só aparece depois de alguém tomar
 * uma decisão com o número errado.
 */
export function useImportarMetricas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      perfilId,
      dias,
      fonte,
    }: {
      perfilId: string
      dias: RelatorioMetricaEntrada[]
      fonte: string
    }) => {
      const linhas = dias.map((dia) => ({ ...dia, perfil_id: perfilId, fonte }))
      const { data, error } = await supabase
        .from('relatorio_metricas_diarias')
        .upsert(linhas, { onConflict: 'perfil_id,dia' })
        .select('dia')
      if (error) throw error
      // Mesmo motivo do canvas e das notas: gravação que não acerta linha
      // nenhuma volta sem erro, e a tela diria "importado" com o banco vazio.
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a importação mas não gravou nenhuma linha. Confirme ' +
            'que supabase/setup-completo.sql rodou por inteiro (tabela ' +
            'relatorio_metricas_diarias e as políticas de RLS).',
        )
      }
      return data.length
    },
    onSuccess: (_total, { perfilId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.relatorioMetricas(perfilId) })
    },
  })
}
