import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type { NoticiaEntrada, NoticiaRow } from '@/types/database'

export function useNoticias() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.noticias(),
    enabled: Boolean(user),
    queryFn: async (): Promise<NoticiaRow[]> => {
      /*
       * Mais recente primeiro e, dentro do dia, a mais relevante no topo.
       * A ordem é a curadoria: quem abre a aba de manhã lê de cima para baixo
       * e para quando quiser, sem precisar filtrar nada.
       */
      const { data, error } = await supabase
        .from('noticias')
        .select('*')
        .order('publicado_em', { ascending: false, nullsFirst: false })
        .order('relevancia', { ascending: false })
        .order('coletado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as NoticiaRow[]
    },
  })
}

/**
 * Grava a coleta do dia.
 *
 * `upsert` em `(user_id, url)`: a mesma notícia que aparece em duas coletas é
 * a mesma notícia. Sem isso, rodar a coleta duas vezes num dia encheria a aba
 * de repetição e a curadoria perderia o sentido.
 *
 * `ignoreDuplicates` fica FALSO de propósito: a segunda passada pode trazer um
 * resumo melhor ou uma relevância corrigida, e queremos a correção.
 */
export function useImportarNoticias() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noticias: NoticiaEntrada[]) => {
      const linhas = noticias.map((noticia) => ({
        ...noticia,
        user_id: user!.id,
        coletado_em: new Date().toISOString(),
      }))
      const { data, error } = await supabase
        .from('noticias')
        .upsert(linhas, { onConflict: 'user_id,url' })
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a importação mas não gravou nenhuma linha. Confirme ' +
            'que supabase/setup-completo.sql rodou por inteiro (tabela noticias).',
        )
      }
      return data.length
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.noticias() })
    },
  })
}

export function useAtualizarNoticia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...campos
    }: { id: string } & Partial<Pick<NoticiaRow, 'lida' | 'virou_pauta' | 'relevancia'>>) => {
      const { data, error } = await supabase
        .from('noticias')
        .update(campos)
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error(`A notícia (${id}) não foi encontrada.`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.noticias() })
    },
  })
}

export function useExcluirNoticia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('noticias').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.noticias() })
    },
  })
}
