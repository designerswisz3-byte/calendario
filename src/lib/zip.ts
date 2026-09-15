/**
 * Escritor de ZIP mínimo, sem compressão (método "store").
 *
 * Por que não uma biblioteca: JPEG, PNG e MP4 já são formatos comprimidos —
 * passar deflate neles rende perto de zero e custa CPU. O ZIP aqui serve só
 * como recipiente, para o download virar um arquivo só. Assim a página que o
 * cliente carrega não engorda ~30 KB por causa de um recurso secundário.
 *
 * Formato: APPNOTE.TXT 6.3.x, sem ZIP64 — suficiente até 4 GB por arquivo e
 * no total, bem acima do que cabe na memória do navegador de qualquer jeito.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[i] = c >>> 0
  }
  return tabela
})()

function crc32(dados: Uint8Array<ArrayBuffer>): number {
  let c = 0xffffffff
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Data/hora no formato MS-DOS que o ZIP usa. */
function dataDos(d: Date) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { hora, data }
}

export interface ArquivoZip {
  nome: string
  /**
   * `Uint8Array<ArrayBuffer>` e não `Uint8Array`: desde o TS 5.7 os typed
   * arrays são genéricos, e o Blob só aceita buffer `ArrayBuffer`.
   */
  dados: Uint8Array<ArrayBuffer>
}

export function criarZip(arquivos: ArquivoZip[]): Blob {
  const codificador = new TextEncoder()
  const agora = dataDos(new Date())
  const partes: Uint8Array<ArrayBuffer>[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.nome)
    const crc = crc32(arquivo.dados)
    const tamanho = arquivo.dados.length

    // --- cabeçalho local ---
    const local = new Uint8Array(30 + nome.length)
    const vLocal = new DataView(local.buffer)
    vLocal.setUint32(0, 0x04034b50, true)
    vLocal.setUint16(4, 20, true) // versão necessária
    vLocal.setUint16(6, 0x0800, true) // nome em UTF-8
    vLocal.setUint16(8, 0, true) // método: store
    vLocal.setUint16(10, agora.hora, true)
    vLocal.setUint16(12, agora.data, true)
    vLocal.setUint32(14, crc, true)
    vLocal.setUint32(18, tamanho, true) // comprimido
    vLocal.setUint32(22, tamanho, true) // original
    vLocal.setUint16(26, nome.length, true)
    vLocal.setUint16(28, 0, true) // sem campo extra
    local.set(nome, 30)

    partes.push(local, arquivo.dados)

    // --- entrada no diretório central ---
    const entrada = new Uint8Array(46 + nome.length)
    const vEntrada = new DataView(entrada.buffer)
    vEntrada.setUint32(0, 0x02014b50, true)
    vEntrada.setUint16(4, 20, true) // versão de origem
    vEntrada.setUint16(6, 20, true) // versão necessária
    vEntrada.setUint16(8, 0x0800, true)
    vEntrada.setUint16(10, 0, true)
    vEntrada.setUint16(12, agora.hora, true)
    vEntrada.setUint16(14, agora.data, true)
    vEntrada.setUint32(16, crc, true)
    vEntrada.setUint32(20, tamanho, true)
    vEntrada.setUint32(24, tamanho, true)
    vEntrada.setUint16(28, nome.length, true)
    vEntrada.setUint16(30, 0, true) // extra
    vEntrada.setUint16(32, 0, true) // comentário
    vEntrada.setUint16(34, 0, true) // disco inicial
    vEntrada.setUint16(36, 0, true) // atributos internos
    vEntrada.setUint32(38, 0, true) // atributos externos
    vEntrada.setUint32(42, offset, true) // onde está o cabeçalho local
    entrada.set(nome, 46)
    central.push(entrada)

    offset += local.length + tamanho
  }

  const tamanhoCentral = central.reduce((total, parte) => total + parte.length, 0)

  // --- fim do diretório central ---
  const fim = new Uint8Array(22)
  const vFim = new DataView(fim.buffer)
  vFim.setUint32(0, 0x06054b50, true)
  vFim.setUint16(4, 0, true) // número do disco
  vFim.setUint16(6, 0, true) // disco do diretório central
  vFim.setUint16(8, arquivos.length, true)
  vFim.setUint16(10, arquivos.length, true)
  vFim.setUint32(12, tamanhoCentral, true)
  vFim.setUint32(16, offset, true)
  vFim.setUint16(20, 0, true) // comentário

  return new Blob([...partes, ...central, fim], { type: 'application/zip' })
}
