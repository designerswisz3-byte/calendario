/**
 * Copia as fontes do Excalidraw para `public/fonts`.
 *
 * O Excalidraw busca as fontes em `window.EXCALIDRAW_ASSET_PATH` em tempo de
 * execução. Sem elas servidas pela gente, ele cai num CDN externo — o canvas
 * passa a depender de um domínio de terceiro para renderizar texto.
 *
 * Xiaolai fica de fora de propósito: é a fonte CJK e sozinha pesa 13 MB dos
 * 14 MB do pacote. O app é em português; se alguém escrever em chinês, o
 * navegador cai no fallback do sistema em vez de a gente publicar 13 MB em
 * toda build. Para incluí-la, tire o nome de FORA_DE_ESCOPO.
 */
import { cp, mkdir, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const origem = path.join(raiz, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts')
const destino = path.join(raiz, 'public/fonts')

const FORA_DE_ESCOPO = new Set(['Xiaolai'])

if (!existsSync(origem)) {
  console.error(`[fontes] não encontrei ${origem}. Rode npm install primeiro.`)
  process.exit(1)
}

await rm(destino, { recursive: true, force: true })
await mkdir(destino, { recursive: true })

let copiadas = 0
for (const entrada of await readdir(origem, { withFileTypes: true })) {
  if (FORA_DE_ESCOPO.has(entrada.name)) continue
  await cp(path.join(origem, entrada.name), path.join(destino, entrada.name), {
    recursive: true,
  })
  copiadas++
}

console.log(`[fontes] ${copiadas} famílias copiadas para public/fonts`)
