import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  apagarImagensDoCanvas,
  baixarImagemDoCanvas,
  subirImagemDoCanvas,
} from '@/lib/canvasArquivos'
import type { CanvasBoardRow, CanvasDados, CanvasImagens } from '@/types/database'

/** Nome do quadro padrão. Quadros múltiplos entram como nomes diferentes. */
export const CANVAS_PADRAO = 'Principal'

/** Só estes campos do appState voltam ao reabrir o quadro. */
const CAMPOS_DE_VISUALIZACAO = [
  'viewBackgroundColor',
  'gridSize',
  'gridModeEnabled',
  'scrollX',
  'scrollY',
  'zoom',
] as const

export interface CenaDoCanvas {
  boardId: string
  elements: unknown[]
  appState: Record<string, unknown>
  /** fileId -> { dataURL, mimeType }, já remontado do storage. */
  arquivos: Record<string, { dataURL: string; mimeType: string }>
  imagens: CanvasImagens
}

/**
 * Abre o quadro do usuário, criando-o na primeira visita.
 *
 * O insert usa `ignoreDuplicates` contra o índice único (user_id, nome): duas
 * abas abrindo o app ao mesmo tempo não criam dois quadros.
 */
export function useCanvasBoard(nome = CANVAS_PADRAO) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.canvas(nome),
    enabled: Boolean(user),
    // Refetch no FOCO continua desligado: voltar para a aba do navegador não
    // pode trocar o que está na tela por baixo de quem está desenhando.
    refetchOnWindowFocus: false,
    /*
     * Mas na MONTAGEM o quadro é sempre relido do banco.
     *
     * Com `staleTime: Infinity` o cache virava a verdade: quem desenhava, saía
     * para o Calendário e voltava, remontava a tela com a cena do primeiro
     * carregamento — vazia. Pior, o autosave seguinte gravava essa cena vazia
     * por cima do trabalho que estava salvo. O banco é a fonte da verdade a
     * cada entrada na tela.
     */
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<CenaDoCanvas> => {
      const userId = user!.id

      const buscar = async () =>
        supabase
          .from('canvas_boards')
          .select('*')
          .eq('user_id', userId)
          .eq('nome', nome)
          .maybeSingle<CanvasBoardRow>()

      let { data, error } = await buscar()
      if (error) throw error

      if (!data) {
        const { error: erroInsert } = await supabase
          .from('canvas_boards')
          .insert({ user_id: userId, nome })
        // 23505 = corrida com outra aba; o quadro passou a existir, basta ler.
        if (erroInsert && erroInsert.code !== '23505') throw erroInsert

        const novo = await buscar()
        if (novo.error) throw novo.error
        data = novo.data
      }

      if (!data) throw new Error('Não consegui abrir o canvas.')

      const dados = (data.dados ?? {}) as CanvasDados
      const imagens = dados.imagens ?? {}

      // Remonta as imagens em paralelo — um quadro com 20 prints não pode
      // abrir em série, seriam 20 idas e voltas enfileiradas.
      const baixadas = await Promise.all(
        Object.entries(imagens).map(async ([fileId, caminho]) => {
          const arquivo = await baixarImagemDoCanvas(caminho)
          return arquivo ? ([fileId, arquivo] as const) : null
        }),
      )

      return {
        boardId: data.id,
        elements: dados.elements ?? [],
        appState: dados.appState ?? {},
        arquivos: Object.fromEntries(baixadas.filter((par) => par !== null)),
        imagens,
      }
    },
  })
}

export interface EntradaDeSalvamento {
  boardId: string
  elements: readonly unknown[]
  appState: Record<string, unknown>
  /** Cena completa do Excalidraw: fileId -> { dataURL, mimeType }. */
  arquivos: Record<string, { dataURL: string; mimeType: string }>
  /** O que já estava no storage antes desta gravação. */
  imagensConhecidas: CanvasImagens
}

/**
 * Salva o quadro. As imagens novas sobem antes; o jsonb guarda só os caminhos.
 *
 * Devolve o mapa de imagens atualizado para quem chamou usar como
 * `imagensConhecidas` no próximo salvamento.
 */
export function useSalvarCanvas() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (entrada: EntradaDeSalvamento): Promise<CanvasImagens> => {
      const userId = user!.id
      const { boardId, elements, appState, arquivos, imagensConhecidas } = entrada

      // Quais fileIds a cena realmente usa agora.
      const emUso = new Set(
        elements
          .filter(
            (el): el is { type: string; fileId: string } =>
              typeof el === 'object' &&
              el !== null &&
              (el as { type?: unknown }).type === 'image' &&
              typeof (el as { fileId?: unknown }).fileId === 'string',
          )
          .map((el) => el.fileId),
      )

      const imagens: CanvasImagens = {}
      for (const fileId of emUso) {
        if (imagensConhecidas[fileId]) {
          imagens[fileId] = imagensConhecidas[fileId]
          continue
        }
        const arquivo = arquivos[fileId]
        if (!arquivo?.dataURL.startsWith('data:')) continue
        imagens[fileId] = await subirImagemDoCanvas(
          userId,
          fileId,
          arquivo.dataURL,
          arquivo.mimeType,
        )
      }

      const dados: CanvasDados = {
        elements: elements as unknown[],
        appState: filtrarAppState(appState),
        imagens,
      }

      /*
       * O `.select('id')` no fim não é enfeite: sem ele, um UPDATE que não
       * acerta NENHUMA linha volta sem erro, e o app mostra "Salvo" enquanto
       * nada foi gravado. Acontece em dois casos reais — o quadro sumiu do
       * banco, ou a RLS barrou a escrita — e os dois passariam despercebidos.
       * Confirmado em Postgres: `update ... where id = <inexistente>` responde
       * UPDATE 0, sem erro.
       */
      const { data, error } = await supabase
        .from('canvas_boards')
        .update({ dados })
        .eq('id', boardId)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error(
          'O banco aceitou a gravação mas não alterou nenhuma linha. O quadro ' +
            `(${boardId}) não existe ou a permissão de escrita foi negada. ` +
            'Confirme que supabase/setup-completo.sql rodou por inteiro.',
        )
      }

      // Só depois de a cena nova estar gravada: se apagássemos antes e o
      // update falhasse, o quadro salvo apontaria para arquivos inexistentes.
      const orfas = Object.entries(imagensConhecidas)
        .filter(([fileId]) => !imagens[fileId])
        .map(([, caminho]) => caminho)
      await apagarImagensDoCanvas(orfas)

      return imagens
    },
  })
}

/**
 * Guarda só o que faz sentido restaurar.
 *
 * O appState do Excalidraw carrega coisas não serializáveis (Map de
 * colaboradores, elemento em edição, estado de ponteiro). Jogar o objeto
 * inteiro no jsonb quebra na serialização ou ressuscita estado de UI que não
 * deveria sobreviver a um F5.
 */
export function filtrarAppState(appState: Record<string, unknown>) {
  const saida: Record<string, unknown> = {}
  for (const campo of CAMPOS_DE_VISUALIZACAO) {
    if (appState[campo] !== undefined) saida[campo] = appState[campo]
  }
  return saida
}

/**
 * Dispara `aoSalvar` depois de `espera` ms sem alterações.
 *
 * O onChange do Excalidraw dispara a cada movimento de ponteiro — desenhar uma
 * linha gera centenas de eventos. Sem isso, seria um UPDATE por quadro de
 * animação.
 */
export function useSalvamentoAdiado(aoSalvar: () => void, espera = 1500) {
  const refCallback = React.useRef(aoSalvar)
  refCallback.current = aoSalvar

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const agendar = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => refCallback.current(), espera)
  }, [espera])

  const agoraMesmo = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    refCallback.current()
  }, [])

  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  return { agendar, agoraMesmo }
}
