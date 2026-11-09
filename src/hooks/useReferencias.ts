import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import { subirAnexo, urlAssinada } from '@/lib/notasAnexos'
import type { StoryReferenciaRow } from '@/types/database'

/** A referência com a URL já assinada, pronta para a `<img>`. */
export interface ReferenciaComUrl extends StoryReferenciaRow {
  /** Null quando o arquivo sumiu do bucket. A tela mostra o buraco, não quebra. */
  url: string | null
}

export function useReferencias() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.referenciasDeStories(),
    enabled: Boolean(user),
    /*
     * As URLs assinadas valem uma hora, então o resultado desta busca
     * ESTRAGA — ao contrário de todas as outras do app, onde o dado só muda
     * quando alguém o altera.
     *
     * Meia hora de `staleTime` deixa a navegação normal usar o cache e garante
     * que ninguém fique olhando para uma grade de imagens quebradas depois de
     * deixar a aba aberta a tarde inteira: ao voltar, a busca refaz e as URLs
     * nascem novas.
     */
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<ReferenciaComUrl[]> => {
      const { data, error } = await supabase
        .from('stories_referencias')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) throw error

      const linhas = (data ?? []) as StoryReferenciaRow[]
      /*
       * Uma assinatura por imagem, todas em paralelo.
       *
       * Em série, vinte referências seriam vinte idas ao Storage uma depois da
       * outra, e a grade apareceria preenchendo de cima para baixo. É o tipo
       * de lentidão que faz a pessoa achar que travou.
       */
      return Promise.all(
        linhas.map(async (linha) => ({ ...linha, url: await urlAssinada(linha.caminho) })),
      )
    },
  })
}

export function useSubirReferencia() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ arquivo, legenda = '' }: { arquivo: File; legenda?: string }) => {
      // Mesma pasta da imagem de apoio das sequências: as políticas do bucket
      // olham o primeiro segmento do caminho (o dono), não o segundo.
      const caminho = await subirAnexo(user!.id, arquivo, 'stories')
      const { data, error } = await supabase
        .from('stories_referencias')
        .insert({ user_id: user!.id, caminho, legenda })
        .select('*')
        .single<StoryReferenciaRow>()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referenciasDeStories() })
    },
  })
}

export function useSalvarLegendaDaReferencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, legenda }: { id: string; legenda: string }) => {
      // `.select('id')` pelo mesmo motivo do resto do projeto: um UPDATE que
      // não acerta linha nenhuma volta SEM erro, e a tela diria "Salvo".
      const { data, error } = await supabase
        .from('stories_referencias')
        .update({ legenda })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a gravação mas não alterou nenhuma linha. Confirme que a ' +
            'migração das referências (tabela stories_referencias) rodou.',
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referenciasDeStories() })
    },
  })
}

export function useExcluirReferencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (referencia: StoryReferenciaRow) => {
      const { error } = await supabase
        .from('stories_referencias')
        .delete()
        .eq('id', referencia.id)
      if (error) throw error

      /*
       * O arquivo sai do bucket DEPOIS da linha, e uma falha aqui não derruba
       * a exclusão.
       *
       * Ordem invertida (arquivo primeiro) deixaria, numa falha de rede no
       * meio, uma linha apontando para um arquivo que não existe mais — um
       * buraco permanente na grade. Nesta ordem o pior caso é um arquivo
       * órfão no bucket, que não aparece para ninguém e não custa nada.
       */
      await supabase.storage.from('canvas').remove([referencia.caminho])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referenciasDeStories() })
    },
  })
}
