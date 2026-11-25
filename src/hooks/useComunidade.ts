import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type { ComunidadeFaladoRow } from '@/types/database'

type Falado = Pick<ComunidadeFaladoRow, 'data' | 'subtema_id'>

/**
 * A tabela `comunidade_falados` ainda não existe neste banco.
 *
 * O erro cru do PostgREST é "Could not find the table 'public.comunidade_falados'
 * in the schema cache", que não diz a ninguém o que fazer. A tradução diz.
 */
function erroDeTabelaAusente(erro: { message?: string; code?: string }): Error | null {
  const texto = erro.message ?? ''
  const falta =
    erro.code === 'PGRST205' ||
    erro.code === '42P01' ||
    (/comunidade_falados/.test(texto) && /schema cache|does not exist/i.test(texto))
  if (!falta) return null
  return new Error(
    'Falta rodar no Supabase a migração da aba Comunidade ' +
      '(supabase/migrations/20260914002300_comunidade.sql). ' +
      'A pauta aparece normalmente; só o "Falei sobre esse tema" depende dela.',
  )
}

/**
 * Todos os dias já marcados, de uma vez.
 *
 * Sem recorte por semana, de propósito. São no máximo 365 linhas curtas por
 * ano, e ter todas na mão é o que permite dizer "você já falou disto em 02/09"
 * quando o tema volta no ciclo seguinte — sem uma segunda busca por subtema.
 */
export function useTemasFalados() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.comunidadeFalados(),
    enabled: Boolean(user),
    // Tabela ausente não se resolve tentando de novo.
    retry: false,
    queryFn: async (): Promise<Falado[]> => {
      const { data, error } = await supabase
        .from('comunidade_falados')
        .select('data, subtema_id')
        .order('data', { ascending: false })
      if (error) throw erroDeTabelaAusente(error) ?? error
      return (data ?? []) as Falado[]
    },
  })
}

/**
 * Marca ou desmarca um dia.
 *
 * Otimista: o check responde no toque. Ele marca de dentro do grupo, no
 * celular, entre uma mensagem e outra — esperar a ida e volta do banco para o
 * quadradinho mudar faria o gesto parecer que não pegou, e o segundo toque
 * desfaria o primeiro.
 */
export function useMarcarFalado() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const chave = queryKeys.comunidadeFalados()

  return useMutation({
    mutationFn: async ({
      data,
      subtemaId,
      falado,
    }: {
      data: string
      subtemaId: string
      falado: boolean
    }) => {
      if (falado) {
        const { error } = await supabase
          .from('comunidade_falados')
          .insert({ user_id: user!.id, data, subtema_id: subtemaId })
        // 23505 = o dia já estava marcado (dois toques, ou outra aba). O
        // resultado que ele queria já é verdade: não é erro.
        if (error && error.code !== '23505') throw erroDeTabelaAusente(error) ?? error
        return
      }
      const { error } = await supabase.from('comunidade_falados').delete().eq('data', data)
      if (error) throw erroDeTabelaAusente(error) ?? error
    },
    onMutate: async ({ data, subtemaId, falado }) => {
      await queryClient.cancelQueries({ queryKey: chave })
      const antes = queryClient.getQueryData<Falado[]>(chave)
      queryClient.setQueryData<Falado[]>(chave, (atual = []) => {
        const semODia = atual.filter((linha) => linha.data !== data)
        return falado ? [{ data, subtema_id: subtemaId }, ...semODia] : semODia
      })
      return { antes }
    },
    // Falhou: o check volta para onde estava. Um check que fica marcado sem
    // ter sido gravado é pior do que um que não marca.
    onError: (_erro, _variaveis, contexto) => {
      /*
       * `?? []`, e não só `contexto?.antes`.
       *
       * Quando a busca nunca deu certo (tabela ausente), não havia dado
       * nenhum antes do toque — `antes` é `undefined`. E `setQueryData` com
       * `undefined` não faz nada: o check otimista ficaria marcado para
       * sempre, dizendo "falei" sobre um dia que o banco recusou.
       */
      queryClient.setQueryData(chave, contexto?.antes ?? [])
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chave })
    },
  })
}
