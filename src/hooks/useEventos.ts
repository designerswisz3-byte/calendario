import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import { CATALOGO_DE_EVENTOS } from '@/data/catalogoDeEventos'
import type { EventoRow } from '@/types/database'

/**
 * Eventos que tocam uma janela de datas.
 *
 * O filtro não é `data between de and ate`: uma feira que começa em 28/10 e
 * termina em 02/11 pertence aos DOIS meses, e com o filtro ingênuo ela some da
 * grade de novembro. A condição certa é de intervalos que se cruzam —
 * `data <= ate and coalesce(data_fim, data) >= de`.
 */
export function useEventos(de: string, ate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.eventos(de, ate),
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async (): Promise<EventoRow[]> => {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .lte('data', ate)
        .or(`data_fim.gte.${de},and(data_fim.is.null,data.gte.${de})`)
        .order('data', { ascending: true })
      if (error) throw error
      return (data ?? []) as EventoRow[]
    },
  })
}

/**
 * Importa o catálogo que vem junto com o app.
 *
 * `upsert` em `(user_id, data, titulo)`: rodar de novo atualiza o texto do
 * ângulo em vez de duplicar a data na grade. É o que permite melhorar uma
 * ideia de post no código e reimportar sem limpar nada antes.
 */
export function useImportarCatalogo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const linhas = CATALOGO_DE_EVENTOS.map((evento) => ({
        user_id: user!.id,
        data: evento.data,
        data_fim: evento.dataFim ?? null,
        titulo: evento.titulo,
        categoria: evento.categoria,
        escopo: evento.escopo,
        local: evento.local ?? null,
        por_que_importa: evento.porQueImporta,
        ideia_de_post: evento.ideiaDePost,
        fonte_url: evento.fonteUrl ?? null,
      }))
      const { data, error } = await supabase
        .from('eventos')
        .upsert(linhas, { onConflict: 'user_id,data,titulo' })
        .select('id')
      if (error) throw error
      // Gravação que não acerta linha nenhuma volta sem erro: sem isto a tela
      // diria "importado" com o banco vazio.
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a importação mas não gravou nenhuma linha. Confirme ' +
            'que supabase/setup-completo.sql rodou por inteiro (tabela eventos).',
        )
      }
      return data.length
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventos'] })
    },
  })
}

export function useExcluirEvento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('eventos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventos'] })
    },
  })
}
