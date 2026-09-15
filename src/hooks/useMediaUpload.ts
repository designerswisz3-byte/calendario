import * as React from 'react'
import {
  MEDIA_BUCKET,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabase,
} from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB } from '@/lib/constants'
import { TAMANHO_DO_PEDACO, uploadResumavel } from '@/lib/tusUpload'
import type { MediaType } from '@/types/database'

function extensionOf(file: File) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : null
  if (fromName) return fromName.toLowerCase()
  const fromType = file.type.split('/')[1]
  return fromType ? fromType.toLowerCase() : 'bin'
}

/** Deduz se o arquivo é imagem ou vídeo pelo MIME type. */
export function detectarTipo(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'imagem'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

/**
 * Valida um arquivo e já devolve o tipo detectado — imagem e vídeo convivem
 * no mesmo upload, então quem chama não precisa saber de antemão qual é.
 */
export type ResultadoValidacao =
  | { ok: true; tipo: MediaType }
  | { ok: false; erro: string }

export function validateFile(file: File): ResultadoValidacao {
  const tipo = detectarTipo(file)
  if (!tipo) return { ok: false, erro: `"${file.name}" não é imagem nem vídeo.` }

  const limitMb = tipo === 'imagem' ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB
  if (file.size > limitMb * 1024 * 1024) {
    return { ok: false, erro: `"${file.name}" passa do limite de ${limitMb} MB para ${tipo}.` }
  }
  return { ok: true, tipo }
}

/**
 * Resultado por arquivo. Um lote com um vídeo de 178 MB não pode perder tudo
 * porque o último arquivo falhou — quem deu certo fica, quem falhou é avisado.
 */
export type ResultadoUpload =
  | { ok: true; url: string }
  | { ok: false; erro: unknown }

export interface ProgressoUpload {
  /** 1-based, para exibir "2 de 5". */
  indice: number
  total: number
  nome: string
  /** 0 a 1, do arquivo atual. */
  fracao: number
}

/** Faz upload para o bucket `media`, em `<user_id>/<uuid>.<ext>`. */
export function useMediaUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = React.useState(false)
  const [progresso, setProgresso] = React.useState<ProgressoUpload | null>(null)

  const upload = React.useCallback(
    async (file: File, onProgress?: (fracao: number) => void): Promise<string> => {
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')

      const path = `${user.id}/${crypto.randomUUID()}.${extensionOf(file)}`

      if (file.size > TAMANHO_DO_PEDACO) {
        // Arquivo grande: TUS. Um POST único de 178 MB não mostra progresso,
        // não retoma e estoura o timeout — perdendo tudo que já tinha subido.
        const { data: sessao } = await supabase.auth.getSession()
        const accessToken = sessao.session?.access_token
        if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

        await uploadResumavel({
          supabaseUrl: SUPABASE_URL,
          anonKey: SUPABASE_ANON_KEY,
          accessToken,
          bucket: MEDIA_BUCKET,
          caminho: path,
          arquivo: file,
          onProgress,
        })
      } else {
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })
        if (error) throw error
        onProgress?.(1)
      }

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      return data.publicUrl
    },
    [user],
  )

  const uploadMany = React.useCallback(
    async (files: File[]): Promise<ResultadoUpload[]> => {
      setUploading(true)
      setProgresso(null)
      try {
        const resultados: ResultadoUpload[] = []
        // Em série, e não em Promise.all: 20 vídeos simultâneos disputam a
        // mesma banda, todos ficam lentos e o navegador começa a derrubar
        // conexão. Um de cada vez termina antes e dá progresso honesto.
        for (const [indice, file] of files.entries()) {
          const base: Omit<ProgressoUpload, 'fracao'> = {
            indice: indice + 1,
            total: files.length,
            nome: file.name,
          }
          setProgresso({ ...base, fracao: 0 })
          try {
            const url = await upload(file, (fracao) => setProgresso({ ...base, fracao }))
            resultados.push({ ok: true, url })
          } catch (erro) {
            // Segue para o próximo: um arquivo recusado não invalida os outros.
            resultados.push({ ok: false, erro })
          }
        }
        return resultados
      } finally {
        setUploading(false)
        setProgresso(null)
      }
    },
    [upload],
  )

  return { upload, uploadMany, uploading, progresso }
}
