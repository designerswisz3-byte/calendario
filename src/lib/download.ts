import { criarZip, type ArquivoZip } from '@/lib/zip'

/** Texto livre -> pedaço seguro de nome de arquivo. */
export function slug(texto: string) {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'conteudo'
  )
}

/**
 * Extensão real do arquivo, tirada da URL.
 *
 * O caminho no Storage é `<user_id>/<uuid>.<ext>`, então a extensão está lá.
 * O fallback por tipo cobre URLs sem extensão.
 */
export function extensaoDe(url: string, tipo: 'imagem' | 'video') {
  const semQuery = url.split('?')[0]
  const achada = semQuery.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1]
  if (achada) return achada.toLowerCase()
  return tipo === 'video' ? 'mp4' : 'jpg'
}

export function nomeDaMidia(
  expert: string,
  indice: number,
  url: string,
  tipo: 'imagem' | 'video',
) {
  return `${slug(expert)}-${String(indice + 1).padStart(2, '0')}.${extensaoDe(url, tipo)}`
}

/**
 * URL que força download em vez de abrir na aba.
 *
 * O atributo `download` do <a> é ignorado quando o arquivo está em outra
 * origem — e o Storage do Supabase é outra origem. O parâmetro `?download`
 * faz o próprio Supabase mandar Content-Disposition: attachment, que funciona
 * mesmo entre origens.
 */
export function urlDeDownload(url: string, nome: string) {
  const separador = url.includes('?') ? '&' : '?'
  return `${url}${separador}download=${encodeURIComponent(nome)}`
}

/** Dispara o download de um blob já em memória. */
export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Espera o navegador iniciar o download antes de soltar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export interface MidiaParaBaixar {
  url: string
  tipo: 'imagem' | 'video'
}

/**
 * Baixa todas as mídias e entrega um ZIP único.
 *
 * `onProgresso` existe porque um carrossel com vídeo passa fácil de 100 MB:
 * sem retorno visual, o cliente acha que o botão não funcionou e clica de novo.
 */
export async function baixarTudoComoZip(
  midias: MidiaParaBaixar[],
  expert: string,
  onProgresso?: (concluidas: number, total: number) => void,
): Promise<void> {
  const arquivos: ArquivoZip[] = []

  for (const [indice, midia] of midias.entries()) {
    const resposta = await fetch(midia.url)
    if (!resposta.ok) throw new Error(`Falha ao baixar a mídia ${indice + 1}.`)
    const buffer = await resposta.arrayBuffer()
    arquivos.push({
      nome: nomeDaMidia(expert, indice, midia.url, midia.tipo),
      dados: new Uint8Array(buffer),
    })
    onProgresso?.(indice + 1, midias.length)
  }

  baixarBlob(criarZip(arquivos), `${slug(expert)}-midias.zip`)
}
