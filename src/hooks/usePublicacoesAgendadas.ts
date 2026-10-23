import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type {
  MidiaDaPublicacao,
  PublicacaoAgendadaRow,
} from '@/types/database'

/**
 * A fila de publicações do usuário.
 *
 * Inclui as já publicadas e as que falharam, não só as pendentes: depois que
 * um post vai ao ar, a linha é o único registro de que ELE saiu por aqui — e
 * é por ela que se chega no permalink.
 */
export function usePublicacoesAgendadas() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.publicacoesAgendadas(),
    enabled: Boolean(user),
    queryFn: async (): Promise<{
      linhas: PublicacaoAgendadaRow[]
      faltaMigracao: boolean
    }> => {
      const { data, error } = await supabase
        .from('publicacoes_agendadas')
        .select('*')
        .order('quando', { ascending: false })
      if (error) {
        /*
         * A tabela nasce numa migração posterior à da tela. Até ela rodar, a
         * aba inteira não pode cair por causa de um botão novo — a query volta
         * vazia e a tela diz o que fazer.
         */
        const faltando =
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          /publicacoes_agendadas/.test(error.message)
        if (faltando) return { linhas: [], faltaMigracao: true }
        throw error
      }
      return { linhas: (data ?? []) as PublicacaoAgendadaRow[], faltaMigracao: false }
    },
    /*
     * Quem publica é a rotina, fora do navegador — a tela não fica sabendo
     * sozinha. Sem recarregar de tempos em tempos, ela mostraria "agendada"
     * por tempo indeterminado depois de o post já estar no ar.
     *
     * O ritmo muda com o que existe na fila, em vez de ser fixo:
     *
     * - PUBLICANDO: 5 s. É a janela de segundos em que a Meta está montando e
     *   publicando. É o único momento em que alguém fica olhando a tela
     *   esperando, então é o único que merece ser rápido.
     * - AGENDADA (algo por vir): 20 s. Suficiente para o "foi ao ar" aparecer
     *   quase junto com o post.
     * - NADA PENDENTE: desliga. Uma aba aberta a tarde inteira sem nada na
     *   fila não tem o que descobrir, e bater no banco de 20 em 20 segundos à
     *   toa é a forma mais boba de gastar cota.
     */
    refetchInterval: (consulta) => {
      const linhas = consulta.state.data?.linhas ?? []
      if (linhas.some((l) => l.status === 'publicando')) return 5_000
      if (linhas.some((l) => l.status === 'agendada')) return 20_000
      return false
    },
    // Voltar para a aba é o gesto de quem quer saber se saiu: revalida na hora.
    refetchOnWindowFocus: true,
  })
}

export interface NovoAgendamento {
  contentPreviewId: string | null
  calendarItemId: string | null
  handle: string
  /** Instante em UTC. */
  quando: Date
  formato: PublicacaoAgendadaRow['formato']
  legenda: string
  midias: MidiaDaPublicacao[]
}

export function useAgendarPublicacao() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entrada: NovoAgendamento) => {
      const { data, error } = await supabase
        .from('publicacoes_agendadas')
        .insert({
          user_id: user!.id,
          content_preview_id: entrada.contentPreviewId,
          calendar_item_id: entrada.calendarItemId,
          handle: entrada.handle.replace(/^@/, '').trim(),
          quando: entrada.quando.toISOString(),
          formato: entrada.formato,
          legenda: entrada.legenda,
          midias: entrada.midias,
        })
        .select('*')
        .single<PublicacaoAgendadaRow>()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicacoesAgendadas() })
    },
  })
}

/**
 * Cancela um agendamento.
 *
 * `cancelada` em vez de `delete`, e a diferença importa: a linha fica como
 * registro de que o post foi programado e retirado. Apagar faria sumir o
 * motivo de um horário vago no calendário.
 *
 * O `status = 'agendada'` no filtro é a trava contra a corrida mais cara da
 * fila: cancelar no segundo em que a rotina já pegou a linha para publicar.
 * Se ela já saiu de `agendada`, o cancelamento não acerta nada e a tela diz
 * isso, em vez de mostrar "cancelado" sobre um post que foi ao ar.
 */
export function useCancelarPublicacao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('publicacoes_agendadas')
        .update({ status: 'cancelada' })
        .eq('id', id)
        .eq('status', 'agendada')
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'Este post saiu da fila antes do cancelamento — a publicação já começou. ' +
            'Confira o status na lista antes de agendar de novo.',
        )
      }
      return data.length
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicacoesAgendadas() })
    },
  })
}
