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

/**
 * Códigos que significam sempre a mesma coisa: o banco está atrás do código.
 *
 * 42703 coluna inexistente · 42P01 tabela inexistente
 * PGRST204 cache de schema desatualizado · PGRST202 função inexistente
 *
 * A mensagem crua do Postgres ("column X does not exist") faz quem lê procurar
 * bug no app, quando o que falta é rodar a migração.
 */
const CODIGOS_DE_MIGRACAO = new Set(['42703', '42P01', 'PGRST204', 'PGRST202'])

const AVISO_MIGRACAO =
  'O banco está desatualizado: falta rodar supabase/setup-completo.sql no SQL Editor do Supabase.'

/** Converte um erro do Supabase em mensagem legível para toast. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (!error) return fallback
  if (typeof error === 'string') return error

  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : null

  const bruta =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

  if (codigo && CODIGOS_DE_MIGRACAO.has(codigo)) {
    return `${AVISO_MIGRACAO}${bruta ? ` (${bruta})` : ''}`
  }

  return bruta.trim() ? bruta : fallback
}
