import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/hooks/queryKeys'
import { useAuth } from '@/components/auth/AuthProvider'
import type { CalendarItemRow } from '@/types/database'

/** Um item de planejamento isolado (usado pela tela de criação). */
export function useCalendarItem(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.calendarItem(id ?? 'none'),
    enabled: Boolean(id) && Boolean(user),
    queryFn: async (): Promise<CalendarItemRow | null> => {
      const { data, error } = await supabase
        .from('calendar_items')
        .select('*')
        .eq('id', id as string)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
