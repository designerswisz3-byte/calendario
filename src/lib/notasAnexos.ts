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

/* ------------------------------------------------------------ documentos -- */

/**
 * Documentos que a nota aceita.
 *
 * A lista tem de bater com `allowed_mime_types` do bucket `canvas` (migração
 * 20260914002000). Se divergirem, o app oferece o botão e o Storage recusa o
 * upload com "mime type not supported" — erro que não explica nada para quem
 * só queria anexar um PDF.
 */
const EXTENSAO_POR_MIME_DE_DOCUMENTO: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/rtf': 'rtf',
  'application/zip': 'zip',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
}

export const TIPOS_DE_DOCUMENTO = Object.keys(EXTENSAO_POR_MIME_DE_DOCUMENTO)

/**
 * O caminho de volta: da extensão para o tipo.
 *
 * Necessário porque `File.type` mente com frequência. O Windows devolve
 * string vazia para `.md` e para vários arquivos sem associação registrada, e
 * o Linux às vezes devolve `application/octet-stream` para `.docx`. Nos dois
 * casos o arquivo é bom e o Storage recusaria pelo tipo — então o tipo é
 * deduzido da extensão e enviado explicitamente no upload.
 */
const MIME_POR_EXTENSAO: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSAO_POR_MIME_DE_DOCUMENTO).map(([mime, extensao]) => [extensao, mime]),
)

/** Igual ao `file_size_limit` do bucket. Conferido no app para o erro ser claro. */
export const LIMITE_DE_BYTES = 25 * 1024 * 1024

export interface DocumentoAnexado {
  /** Caminho no bucket. É só isto que o HTML da nota guarda. */
  caminho: string
  /** O nome do arquivo como ele escolheu. É o que aparece no cartão. */
  nome: string
  tipo: string
  tamanho: number
}

/** A extensão em minúsculas, sem o ponto. Vazio quando o nome não tem uma. */
export function extensaoDoNome(nome: string): string {
  const ponto = nome.lastIndexOf('.')
  if (ponto <= 0 || ponto === nome.length - 1) return ''
  return nome.slice(ponto + 1).toLowerCase()
}

/**
 * O tipo que vai no upload: o do arquivo quando é aceito, senão o da extensão.
 *
 * Devolve `null` quando nem um nem outro servem — e aí o arquivo não sobe, com
 * uma mensagem que diz o que aconteceu.
 */
export function tipoDeDocumento(arquivo: File): string | null {
  if (EXTENSAO_POR_MIME_DE_DOCUMENTO[arquivo.type]) return arquivo.type
  return MIME_POR_EXTENSAO[extensaoDoNome(arquivo.name)] ?? null
}

export function ehDocumentoAceito(arquivo: File): boolean {
  return tipoDeDocumento(arquivo) !== null
}

/** "2,4 MB". Para o cartão dizer se vale abrir no celular. */
export function formatarTamanho(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  // Uma casa decimal só abaixo de 10 MB: "15,3 MB" não ajuda a decidir nada
  // que "15 MB" já não diga.
  return mb < 10 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${Math.round(mb)} MB`
}

/**
 * Sobe um documento e devolve o que o cartão precisa para se desenhar.
 *
 * O nome original NÃO vira o nome do arquivo no bucket: o caminho é um UUID.
 * Dois motivos — nome de arquivo com acento, espaço e barra quebra caminho de
 * Storage, e dois PDFs chamados "contrato.pdf" se sobrescreveriam. O nome
 * bonito viaja no HTML da nota, que é onde ele é mostrado.
 */
export async function subirDocumento(
  userId: string,
  arquivo: File,
  pasta: 'notas' | 'stories' = 'notas',
): Promise<DocumentoAnexado> {
  const tipo = tipoDeDocumento(arquivo)
  if (!tipo) {
    throw new Error(
      `"${arquivo.name}" não é um tipo de documento aceito. ` +
        'Valem PDF, Word, Excel, PowerPoint, texto, CSV e ZIP.',
    )
  }
  if (arquivo.size > LIMITE_DE_BYTES) {
    throw new Error(
      `"${arquivo.name}" tem ${formatarTamanho(arquivo.size)} e o limite é ` +
        `${formatarTamanho(LIMITE_DE_BYTES)}.`,
    )
  }

  const extensao = EXTENSAO_POR_MIME_DE_DOCUMENTO[tipo]
  const caminho = `${userId}/${pasta}/${crypto.randomUUID()}.${extensao}`
  const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, {
    // Explícito, e não o `arquivo.type`: quando o tipo foi deduzido da
    // extensão, mandar o original faria o Storage recusar.
    contentType: tipo,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  return { caminho, nome: arquivo.name, tipo, tamanho: arquivo.size }
}

/**
 * URL assinada para BAIXAR, com o nome original de volta.
 *
 * Sem o `download`, o navegador salva o arquivo com o nome que está no
 * caminho — um UUID. O parâmetro devolve o nome que a pessoa reconhece.
 */
export async function urlParaBaixar(caminho: string, nome: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrl(caminho, VALIDADE_SEGUNDOS, { download: nome })
  if (error || !data) return null
  return data.signedUrl
}

/**
 * Sobe o arquivo e devolve o caminho no bucket (nunca uma URL).
 *
 * `pasta` separa as origens dentro do mesmo balde — notas, stories. É só
 * organização: a política de acesso olha o primeiro segmento, que é o id do
 * dono, e não o segundo.
 */
export async function subirAnexo(
  userId: string,
  arquivo: File,
  pasta: 'notas' | 'stories' = 'notas',
): Promise<string> {
  const extensao = EXTENSAO_POR_MIME[arquivo.type]
  if (!extensao) throw new Error(`"${arquivo.name}" não é um formato de imagem aceito.`)

  const caminho = `${userId}/${pasta}/${crypto.randomUUID()}.${extensao}`
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

/**
 * Caminhos de anexo citados no HTML — para quem for apagar os órfãos.
 *
 * Hoje ninguém chama. Mesmo assim ela enxerga IMAGEM E DOCUMENTO, e isso é de
 * propósito: o nome promete "anexos", e uma versão que só visse imagem viraria
 * uma armadilha para quem ligar a limpeza depois — ela apagaria do bucket os
 * PDFs que estão em uso, sem erro nenhum, porque não os teria contado.
 */
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

  for (const cartao of doc.querySelectorAll('[data-documento][data-anexo]')) {
    const caminho = cartao.getAttribute('data-anexo')
    if (caminho) caminhos.add(caminho)
  }

  return [...caminhos]
}
