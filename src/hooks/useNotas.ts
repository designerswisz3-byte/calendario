import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import { ligacoesDe } from '@/lib/notasLinks'
import type { CanvasDados, CanvasImagens, NotaResumo, NotaRow } from '@/types/database'

/**
 * Lista de notas: só id, título e data.
 *
 * O corpo de cada nota fica fora de propósito — a lista mostra apenas o
 * título, e puxar o HTML de todas as notas a cada abertura seria baixar o
 * caderno inteiro para desenhar uma coluna de títulos.
 */
export function useNotas() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.notas(),
    enabled: Boolean(user),
    queryFn: async (): Promise<NotaResumo[]> => {
      /*
       * Três critérios, nesta ordem: fixadas primeiro; entre as fixadas, a
       * mais recentemente fixada na frente; o resto por última edição.
       *
       * O segundo critério é o que faz o "ranking" existir — sem ele as
       * fixadas empatariam e cairiam na ordem de edição, de modo que só abrir
       * uma nota para reler já mudaria a posição dela.
       */
      const { data, error } = await supabase
        .from('notas')
        .select('id, titulo, atualizado_em, fixada, fixada_em')
        .order('fixada', { ascending: false })
        .order('fixada_em', { ascending: false, nullsFirst: false })
        .order('atualizado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as NotaResumo[]
    },
  })
}

/**
 * Uma nota inteira.
 *
 * `staleTime: 0` + `refetchOnMount: 'always'`: o banco é a verdade toda vez
 * que a nota é aberta. Servir cache aqui é como o canvas perdia trabalho —
 * abria com a versão velha e o autosave seguinte gravava por cima.
 */
export function useNota(id: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.nota(id ?? 'nenhuma'),
    enabled: Boolean(user) && Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    /*
     * `gcTime: 0` é o que impede o cache de servir uma nota VELHA.
     *
     * Trocar de nota muda a chave da consulta, e o React Query entrega na hora
     * o que tiver guardado daquela chave — que podia ser a versão de quando a
     * nota foi criada, ainda vazia. O editor montava com ela, e a resposta
     * fresca chegava depois sem remontar nada: nota cheia no banco, editor em
     * branco na tela. Sem cache, a nota só aparece quando o banco responde.
     */
    gcTime: 0,
    queryFn: async (): Promise<NotaRow | null> => {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .eq('id', id as string)
        .maybeSingle<NotaRow>()
      if (error) throw error
      return data
    },
  })
}

/**
 * Conteúdo de todas as notas, só para descobrir quem aponta para quem.
 *
 * Pesado por natureza, então com `staleTime` generoso: a resposta muda devagar
 * e ninguém precisa dela atualizada ao segundo.
 */
export function useLigacoesDoCaderno() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.notasLigacoes(),
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('notas').select('id, titulo, conteudo')
      if (error) throw error
      return (data ?? []).map((nota) => ({
        id: nota.id as string,
        titulo: nota.titulo as string,
        ligacoes: ligacoesDe((nota.conteudo as string) ?? ''),
      }))
    },
  })
}

export function useCriarNota() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (titulo: string): Promise<NotaRow> => {
      const { data, error } = await supabase
        .from('notas')
        .insert({ user_id: user!.id, titulo, conteudo: titulo ? `<h2>${titulo}</h2>` : '' })
        .select('*')
        .single<NotaRow>()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notas() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notasLigacoes() })
    },
  })
}

export interface EntradaDeNota {
  id: string
  titulo: string
  conteudo: string
  desenho?: CanvasDados | null
  imagens?: CanvasImagens
}

export function useSalvarNota() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...campos }: EntradaDeNota) => {
      /*
       * `.select('id')` pelo mesmo motivo do canvas: um UPDATE que não acerta
       * nenhuma linha volta SEM erro, e a tela diria "Salvo" com nada gravado.
       */
      const { data, error } = await supabase
        .from('notas')
        .update(campos)
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a gravação mas não alterou nenhuma linha. A nota ' +
            `(${id}) não existe ou a permissão de escrita foi negada. Confirme ` +
            'que supabase/setup-completo.sql rodou por inteiro.',
        )
      }
    },
    onSuccess: () => {
      // Só a lista e as ligações: a nota aberta já está correta na tela, e
      // invalidá-la remontaria o editor embaixo de quem está escrevendo.
      void queryClient.invalidateQueries({ queryKey: queryKeys.notas() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notasLigacoes() })
    },
  })
}

/**
 * Fixa ou solta a nota.
 *
 * Fixar de novo uma nota já fixada renova o `fixada_em` e manda ela para o
 * topo das fixadas — é o jeito de reordenar sem precisar de arrastar.
 */
export function useFixarNota() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, fixada }: { id: string; fixada: boolean }) => {
      const { data, error } = await supabase
        .from('notas')
        .update({ fixada, fixada_em: fixada ? new Date().toISOString() : null })
        .eq('id', id)
        .select('id')
      if (error) throw error
      // Mesmo motivo de sempre: UPDATE que não acerta linha volta sem erro.
      if (!data || data.length === 0) {
        throw new Error(`A nota (${id}) não foi encontrada para fixar.`)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notas() })
    },
  })
}

export function useExcluirNota() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notas() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notasLigacoes() })
    },
  })
}
