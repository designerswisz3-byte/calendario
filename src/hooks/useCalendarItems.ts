import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import { endOfMonth, startOfMonth, toDateKey, toDbTime } from '@/lib/date'
import type {
  CalendarItemRow,
  CalendarItemWithRelations,
  CalendarStatus,
  ContentPreviewWithMedia,
  MediaAssetRow,
  PlanningType,
  TagRow,
} from '@/types/database'

/** Chave de cache do mês: "YYYY-MM" em horário local. */
export function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Uma única query traz item + tags + conteúdo vinculado + mídias, para que o
 * calendário consiga desenhar thumbnail e nome do expert sem N+1.
 */
const SELECT_WITH_RELATIONS = `
  *,
  calendar_item_tags ( tags ( * ) ),
  content_previews ( *, media_assets ( * ) )
`

type RawRow = CalendarItemRow & {
  calendar_item_tags: { tags: TagRow | null }[] | null
  content_previews: (ContentPreviewWithMedia | null)[] | ContentPreviewWithMedia | null
}

function normalize(row: RawRow): CalendarItemWithRelations {
  const tags = (row.calendar_item_tags ?? [])
    .map((link) => link.tags)
    .filter((tag): tag is TagRow => Boolean(tag))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const rawPreview = Array.isArray(row.content_previews)
    ? (row.content_previews[0] ?? null)
    : row.content_previews

  const preview: ContentPreviewWithMedia | null = rawPreview
    ? {
        ...rawPreview,
        media_assets: [...(rawPreview.media_assets ?? [])].sort(
          (a: MediaAssetRow, b: MediaAssetRow) => a.ordem - b.ordem,
        ),
      }
    : null

  const { calendar_item_tags: _links, content_previews: _previews, ...item } = row
  return { ...item, tags, preview }
}

/** Itens de planejamento do mês de referência (inclusive dias vizinhos do grid). */
export function useCalendarItems(reference: Date) {
  const { user } = useAuth()
  const monthKey = monthKeyOf(reference)

  // Amplia a faixa em 7 dias de cada lado: o grid mostra dias do mês anterior
  // e do próximo, e eles também precisam dos badges.
  const rangeStart = new Date(startOfMonth(reference))
  rangeStart.setDate(rangeStart.getDate() - 7)
  const rangeEnd = new Date(endOfMonth(reference))
  rangeEnd.setDate(rangeEnd.getDate() + 7)

  return useQuery({
    queryKey: queryKeys.calendarItems(monthKey),
    enabled: Boolean(user),
    queryFn: async (): Promise<CalendarItemWithRelations[]> => {
      const { data, error } = await supabase
        .from('calendar_items')
        .select(SELECT_WITH_RELATIONS)
        .gte('data', toDateKey(rangeStart))
        .lte('data', toDateKey(rangeEnd))
        .order('data', { ascending: true })
        .order('horario', { ascending: true, nullsFirst: false })
      if (error) throw error
      return ((data ?? []) as unknown as RawRow[]).map(normalize)
    },
  })
}

export interface CalendarItemInput {
  data: string
  horario: string | null
  tipo: PlanningType
  status: CalendarStatus
  notas: string | null
  tagIds: string[]
}

/** Reescreve os vínculos de tags do item (remove os que saíram, insere os novos). */
async function syncTags(calendarItemId: string, tagIds: string[]) {
  const { data: existing, error: readError } = await supabase
    .from('calendar_item_tags')
    .select('tag_id')
    .eq('calendar_item_id', calendarItemId)
  if (readError) throw readError

  const current = new Set((existing ?? []).map((row) => row.tag_id))
  const next = new Set(tagIds)

  const toInsert = tagIds.filter((id) => !current.has(id))
  const toDelete = [...current].filter((id) => !next.has(id))

  if (toInsert.length) {
    const { error } = await supabase
      .from('calendar_item_tags')
      .insert(toInsert.map((tag_id) => ({ calendar_item_id: calendarItemId, tag_id })))
    if (error) throw error
  }

  if (toDelete.length) {
    const { error } = await supabase
      .from('calendar_item_tags')
      .delete()
      .eq('calendar_item_id', calendarItemId)
      .in('tag_id', toDelete)
    if (error) throw error
  }
}

export function useCreateCalendarItem() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: CalendarItemInput): Promise<CalendarItemRow> => {
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')
      const { data, error } = await supabase
        .from('calendar_items')
        .insert({
          user_id: user.id,
          data: input.data,
          horario: toDbTime(input.horario),
          tipo: input.tipo,
          status: input.status,
          notas: input.notas?.trim() ? input.notas.trim() : null,
        })
        .select()
        .single()
      if (error) throw error

      if (input.tagIds.length) await syncTags(data.id, input.tagIds)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
    },
  })
}

export function useUpdateCalendarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<CalendarItemInput>
    }): Promise<CalendarItemRow> => {
      const patch: Partial<Omit<CalendarItemRow, 'id' | 'user_id'>> = {}
      if (input.data !== undefined) patch.data = input.data
      if (input.horario !== undefined) patch.horario = toDbTime(input.horario)
      if (input.tipo !== undefined) patch.tipo = input.tipo
      if (input.status !== undefined) patch.status = input.status
      if (input.notas !== undefined) patch.notas = input.notas?.trim() ? input.notas.trim() : null

      const { data, error } = await supabase
        .from('calendar_items')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (input.tagIds) await syncTags(id, input.tagIds)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
    },
  })
}

/**
 * Mover item entre dias (drag-and-drop). Atualiza SOMENTE a data — o vínculo
 * com o conteúdo criado (content_previews.calendar_item_id) é preservado.
 */
export function useMoveCalendarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: string }) => {
      const { error } = await supabase.from('calendar_items').update({ data }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-items'] })
      const snapshots = queryClient.getQueriesData<CalendarItemWithRelations[]>({
        queryKey: ['calendar-items'],
      })
      // Atualização otimista: o card se move na hora e volta se o banco recusar.
      snapshots.forEach(([key, items]) => {
        if (!items) return
        queryClient.setQueryData<CalendarItemWithRelations[]>(
          key,
          items.map((item) => (item.id === id ? { ...item, data } : item)),
        )
      })
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, items]) => queryClient.setQueryData(key, items))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
    },
  })
}

export function useDeleteCalendarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
      queryClient.invalidateQueries({ queryKey: ['content-preview'] })
    },
  })
}
