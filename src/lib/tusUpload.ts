/**
 * Upload resumável (protocolo TUS) para o Supabase Storage.
 *
 * Por que não o upload normal: o `supabase.storage.upload()` manda o arquivo
 * inteiro num POST só. Para um vídeo de 178 MB isso significa nenhum progresso
 * na tela (a aba parece travada por minutos), nenhuma retomada se a conexão
 * oscilar e um timeout que joga fora tudo que já subiu. A própria documentação
 * do Supabase recomenda TUS acima de 6 MB.
 *
 * Por que à mão, sem `tus-js-client`: a biblioteca traz 21 pacotes, vários
 * feitos para Node (`proper-lockfile`, `is-stream`), para um upload que roda no
 * navegador. O que usamos do protocolo são dois verbos — POST para criar,
 * PATCH para enviar cada pedaço. É a mesma decisão do escritor de ZIP.
 *
 * O que isto NÃO faz: passar por cima do limite de tamanho do projeto. Se o
 * Supabase recusa o arquivo por tamanho, ele recusa aqui também — a diferença
 * é que aqui a recusa vem com uma mensagem que diz o que fazer.
 */

/** Exigência do Supabase: o pedaço tem que ser exatamente 6 MB. */
const TAMANHO_DO_PEDACO = 6 * 1024 * 1024

const TUS_VERSAO = '1.0.0'

/** Base64 de texto UTF-8 — `btoa` sozinho quebra com acento no nome do arquivo. */
function base64Utf8(valor: string) {
  const bytes = new TextEncoder().encode(valor)
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario)
}

function metadata(campos: Record<string, string>) {
  return Object.entries(campos)
    .map(([chave, valor]) => `${chave} ${base64Utf8(valor)}`)
    .join(',')
}

export interface OpcoesTus {
  supabaseUrl: string
  anonKey: string
  accessToken: string
  bucket: string
  /** Caminho dentro do bucket, sem o nome do bucket na frente. */
  caminho: string
  arquivo: File
  /** 0 a 1. Chamado a cada pedaço e durante o envio de cada pedaço. */
  onProgress?: (fracao: number) => void
  signal?: AbortSignal
}

class ErroDeUpload extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ErroDeUpload'
    this.status = status
  }
}

/** PATCH de um pedaço via XHR — `fetch` não reporta progresso de envio. */
function enviarPedaco(
  url: string,
  offset: number,
  pedaco: Blob,
  cabecalhos: Record<string, string>,
  aoProgredir: (enviadoNoPedaco: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PATCH', url, true)
    xhr.setRequestHeader('tus-resumable', TUS_VERSAO)
    xhr.setRequestHeader('upload-offset', String(offset))
    xhr.setRequestHeader('content-type', 'application/offset+octet-stream')
    for (const [chave, valor] of Object.entries(cabecalhos)) xhr.setRequestHeader(chave, valor)

    const abortar = () => xhr.abort()
    signal?.addEventListener('abort', abortar)

    const limpar = () => signal?.removeEventListener('abort', abortar)

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgredir(evento.loaded)
    }

    xhr.onload = () => {
      limpar()
      if (xhr.status >= 200 && xhr.status < 300) {
        const novo = Number(xhr.getResponseHeader('upload-offset'))
        // Sem o offset de volta não dá para saber onde continuar: melhor falhar
        // agora do que gravar um arquivo truncado.
        if (!Number.isFinite(novo)) {
          rejeitar(new ErroDeUpload(xhr.status, 'O servidor não informou onde o upload parou.'))
          return
        }
        resolver(novo)
        return
      }
      rejeitar(new ErroDeUpload(xhr.status, xhr.responseText || `HTTP ${xhr.status}`))
    }

    xhr.onerror = () => {
      limpar()
      rejeitar(new ErroDeUpload(0, 'Falha de rede durante o envio.'))
    }
    xhr.onabort = () => {
      limpar()
      rejeitar(new ErroDeUpload(0, 'Upload cancelado.'))
    }

    xhr.send(pedaco)
  })
}

/**
 * Sobe um arquivo em pedaços de 6 MB. Devolve quando o último pedaço confirmou.
 * Lança `ErroDeUpload` com o status HTTP — quem chama traduz para o usuário.
 */
export async function uploadResumavel(opcoes: OpcoesTus): Promise<void> {
  const { supabaseUrl, anonKey, accessToken, bucket, caminho, arquivo, onProgress, signal } = opcoes

  const autenticacao = {
    authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
  }

  // 1. Criação: anuncia o tamanho total e recebe a URL onde os pedaços entram.
  const criacao = await fetch(`${supabaseUrl}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      ...autenticacao,
      'tus-resumable': TUS_VERSAO,
      'upload-length': String(arquivo.size),
      'upload-metadata': metadata({
        bucketName: bucket,
        objectName: caminho,
        contentType: arquivo.type || 'application/octet-stream',
        cacheControl: '3600',
      }),
    },
    signal,
  })

  if (!criacao.ok) {
    throw new ErroDeUpload(criacao.status, (await criacao.text()) || `HTTP ${criacao.status}`)
  }

  const destino = criacao.headers.get('location')
  if (!destino) {
    throw new ErroDeUpload(criacao.status, 'O servidor não devolveu o endereço do upload.')
  }
  // `location` pode vir relativo; `URL` resolve os dois casos.
  const url = new URL(destino, supabaseUrl).toString()

  // 2. Envio: um PATCH por pedaço, sempre a partir do offset confirmado.
  let offset = 0
  while (offset < arquivo.size) {
    const fim = Math.min(offset + TAMANHO_DO_PEDACO, arquivo.size)
    const base = offset

    offset = await enviarPedaco(
      url,
      offset,
      arquivo.slice(offset, fim),
      autenticacao,
      (enviadoNoPedaco) => onProgress?.(Math.min(1, (base + enviadoNoPedaco) / arquivo.size)),
      signal,
    )
  }

  onProgress?.(1)
}

export { ErroDeUpload, TAMANHO_DO_PEDACO }
