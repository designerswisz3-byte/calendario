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
 * URL e chave anônima expostas para o upload resumável, que fala com a API de
 * Storage direto (o client do supabase-js não expõe TUS). A chave anônima é
 * pública por design — quem protege os dados é a RLS, não o segredo da chave.
 */
export const SUPABASE_URL = isSupabaseConfigured ? url : ''
export const SUPABASE_ANON_KEY = isSupabaseConfigured ? anonKey : ''

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

/**
 * Recusa por tamanho no Storage. O limite mora em três lugares e vale sempre o
 * menor deles: o app, o bucket e o **limite global do projeto** — este último
 * só muda no painel, e no plano Free o teto é 50 MB por arquivo.
 *
 * Sem esta tradução o usuário vê "Payload too large" e vai procurar o problema
 * no código, onde ele não está.
 */
const AVISO_TAMANHO =
  'O Supabase recusou o arquivo por tamanho. O limite que vale é o menor entre o bucket e o ' +
  'limite global do projeto (Storage → Settings → Global file size limit). No plano Free o teto ' +
  'é 50 MB por arquivo e nenhuma configuração passa por cima disso.'

/**
 * O bucket só aceita os MIME types listados na migração 200. Um .mov exportado
 * por um editor pouco comum pode chegar como algo fora da lista, e a recusa do
 * Storage ("mime type ... is not supported") não diz onde mexer.
 */
const AVISO_FORMATO =
  'O bucket não aceita esse formato de arquivo. A lista de formatos permitidos está na ' +
  'migração supabase/migrations/20260914000200_storage_media_bucket.sql (campo allowed_mime_types).'

/** Reconhece a recusa por tamanho vinda de qualquer camada do Storage. */
function ehErroDeTamanho(codigo: string | null, status: unknown, bruta: string) {
  if (codigo === '413' || status === 413 || String(status) === '413') return true
  return /payload too large|exceeded the maximum allowed size|maximum allowed size/i.test(bruta)
}

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

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : null

  if (ehErroDeTamanho(codigo, status, bruta)) return AVISO_TAMANHO

  if (codigo === '415' || status === 415 || /mime type .* is not supported/i.test(bruta)) {
    return `${AVISO_FORMATO}${bruta ? ` (${bruta})` : ''}`
  }

  return bruta.trim() ? bruta : fallback
}
