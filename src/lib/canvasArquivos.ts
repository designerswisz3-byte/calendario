import { supabase } from '@/lib/supabase'

/**
 * Imagens do canvas: entre o Excalidraw e o Supabase Storage.
 *
 * O Excalidraw trabalha com dataURL base64 na memória da cena. Persistir isso
 * dentro do jsonb do quadro seria reescrever todas as imagens a cada autosave —
 * um print de 2 MB vira ~2,7 MB de base64, e o autosave roda a cada poucos
 * segundos. Então a imagem vai para o bucket `canvas` (privado) e o quadro
 * guarda só o caminho.
 */

export const CANVAS_BUCKET = 'canvas'

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

/** dataURL -> Blob. `fetch` resolve `data:` sem precisar decodificar na mão. */
async function dataUrlParaBlob(dataURL: string): Promise<Blob> {
  const resposta = await fetch(dataURL)
  return resposta.blob()
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(String(leitor.result))
    leitor.onerror = () => rejeitar(leitor.error ?? new Error('Não consegui ler a imagem.'))
    leitor.readAsDataURL(blob)
  })
}

/**
 * Sobe uma imagem da cena e devolve o caminho no bucket.
 *
 * O caminho embute o fileId do Excalidraw para o mesmo arquivo nunca subir
 * duas vezes: reabrir o quadro e mexer nele não reenvia nada.
 */
export async function subirImagemDoCanvas(
  userId: string,
  fileId: string,
  dataURL: string,
  mimeType: string,
): Promise<string> {
  const blob = await dataUrlParaBlob(dataURL)
  const extensao = EXTENSAO_POR_MIME[mimeType] ?? 'bin'
  const caminho = `${userId}/${fileId}.${extensao}`

  const { error } = await supabase.storage.from(CANVAS_BUCKET).upload(caminho, blob, {
    contentType: mimeType,
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error

  return caminho
}

/**
 * Baixa uma imagem do bucket e devolve a dataURL para remontar a cena.
 *
 * Usa `download()`, que passa pelo JWT do usuário — o bucket é privado, então
 * não existe URL pública e não precisamos assinar nada.
 */
export async function baixarImagemDoCanvas(caminho: string): Promise<{
  dataURL: string
  mimeType: string
} | null> {
  const { data, error } = await supabase.storage.from(CANVAS_BUCKET).download(caminho)
  // Imagem some (apagada à mão, quadro migrado) não pode derrubar o quadro
  // inteiro: o resto da cena continua válido e abre normalmente.
  if (error || !data) return null

  return {
    dataURL: await blobParaDataUrl(data),
    mimeType: data.type || 'image/png',
  }
}

/** Remove do bucket as imagens que não estão mais em uso pela cena. */
export async function apagarImagensDoCanvas(caminhos: string[]) {
  if (caminhos.length === 0) return
  await supabase.storage.from(CANVAS_BUCKET).remove(caminhos)
}
