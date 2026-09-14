import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `false` quando o .env ainda não foi preenchido. A app mostra uma tela de
 * configuração em vez de quebrar com erro do client.
 */
export const isSupabaseConfigured =
  Boolean(url) && Boolean(anonKey) && !url.includes('SEU-PROJETO')

export const supabase = createClient<Database>(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const MEDIA_BUCKET = 'media'

/** Converte um erro do Supabase em mensagem legível para toast. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}
