import { supabase } from '@/lib/supabase'

/**
 * Imagens dentro de uma nota.
 *
 * O HTML guardado NUNCA carrega a imagem embutida nem uma URL assinada:
 * guarda `src="anexo:<caminho>"`. Base64 dentro do conteúdo faria cada
 * autosave reescrever megabytes, e URL assinada expira — o conteúdo salvo
 * apontaria para um link morto em algumas horas.
 *
 * Na hora de exibir, cada `anexo:` vira uma URL assinada nova. Na hora de
 * salvar, o caminho volta. O `data-anexo` é o que permite essa ida e volta
 * mesmo depois de o editor ter mexido no HTML.
 */

/**
 * Bucket privado dos anexos. Herdado do Canvas, que saiu do projeto: é o mesmo
 * balde, com as mesmas políticas de dono, e reaproveitá-lo evitou pedir mais
 * uma migração de Storage.
 */
export const BUCKET_ANEXOS = 'canvas'

const PREFIXO = 'anexo:'
/** Uma hora é bem mais que uma sessão de escrita, e o link não vaza depois. */
const VALIDADE_SEGUNDOS = 3600

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export const TIPOS_DE_IMAGEM = Object.keys(EXTENSAO_POR_MIME)

/** Sobe o arquivo e devolve o caminho no bucket (nunca uma URL). */
export async function subirAnexo(userId: string, arquivo: File): Promise<string> {
  const extensao = EXTENSAO_POR_MIME[arquivo.type]
  if (!extensao) throw new Error(`"${arquivo.name}" não é um formato de imagem aceito.`)

  const caminho = `${userId}/notas/${crypto.randomUUID()}.${extensao}`
  const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, {
    contentType: arquivo.type,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return caminho
}

/** URL temporária para mostrar a imagem. O bucket é privado: não há URL fixa. */
export async function urlAssinada(caminho: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrl(caminho, VALIDADE_SEGUNDOS)
  // Anexo apagado à mão não pode derrubar a nota inteira: o texto continua.
  if (error || !data) return null
  return data.signedUrl
}

function parsear(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

/** Troca cada `anexo:` por uma URL assinada, para o editor conseguir exibir. */
export async function paraExibicao(html: string): Promise<string> {
  if (!html.includes(PREFIXO)) return html

  const doc = parsear(html)
  const imagens = [...doc.querySelectorAll('img')]

  await Promise.all(
    imagens.map(async (img) => {
      const src = img.getAttribute('src') ?? ''
      const caminho = src.startsWith(PREFIXO)
        ? src.slice(PREFIXO.length)
        : (img.getAttribute('data-anexo') ?? '')
      if (!caminho) return

      img.setAttribute('data-anexo', caminho)
      const url = await urlAssinada(caminho)
      if (url) img.setAttribute('src', url)
      else img.setAttribute('alt', 'Imagem indisponível')
    }),
  )

  return doc.body.innerHTML
}

/** Devolve o `anexo:` ao lugar da URL assinada, antes de gravar. */
export function paraArmazenamento(html: string): string {
  if (!html.includes('data-anexo')) return html

  const doc = parsear(html)
  for (const img of doc.querySelectorAll('img[data-anexo]')) {
    const caminho = img.getAttribute('data-anexo')
    if (caminho) img.setAttribute('src', `${PREFIXO}${caminho}`)
  }
  return doc.body.innerHTML
}

/** Caminhos de anexo citados no HTML — usado para apagar os órfãos. */
export function anexosDe(html: string): string[] {
  if (!html.includes('data-anexo') && !html.includes(PREFIXO)) return []
  const doc = parsear(html)
  const caminhos = new Set<string>()
  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? ''
    const caminho = src.startsWith(PREFIXO)
      ? src.slice(PREFIXO.length)
      : (img.getAttribute('data-anexo') ?? '')
    if (caminho) caminhos.add(caminho)
  }
  return [...caminhos]
}
