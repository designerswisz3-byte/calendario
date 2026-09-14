import * as React from 'react'
import { MEDIA_BUCKET, supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB } from '@/lib/constants'
import type { MediaType } from '@/types/database'

function extensionOf(file: File) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : null
  if (fromName) return fromName.toLowerCase()
  const fromType = file.type.split('/')[1]
  return fromType ? fromType.toLowerCase() : 'bin'
}

export function validateFile(file: File, expected: MediaType): string | null {
  if (expected === 'imagem' && !file.type.startsWith('image/')) {
    return `"${file.name}" não é uma imagem.`
  }
  if (expected === 'video' && !file.type.startsWith('video/')) {
    return `"${file.name}" não é um vídeo.`
  }
  const limitMb = expected === 'imagem' ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB
  if (file.size > limitMb * 1024 * 1024) {
    return `"${file.name}" passa do limite de ${limitMb} MB.`
  }
  return null
}

/** Faz upload para o bucket `media`, em `<user_id>/<uuid>.<ext>`. */
export function useMediaUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = React.useState(false)

  const upload = React.useCallback(
    async (file: File): Promise<string> => {
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')

      const path = `${user.id}/${crypto.randomUUID()}.${extensionOf(file)}`
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
      if (error) throw error

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      return data.publicUrl
    },
    [user],
  )

  const uploadMany = React.useCallback(
    async (files: File[]): Promise<string[]> => {
      setUploading(true)
      try {
        return await Promise.all(files.map(upload))
      } finally {
        setUploading(false)
      }
    },
    [upload],
  )

  return { upload, uploadMany, uploading }
}
