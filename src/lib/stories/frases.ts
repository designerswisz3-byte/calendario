/** Costuras de português que as variantes de texto usam. */

const CONTRACOES: Record<'de' | 'em', Record<string, string>> = {
  de: { a: 'da', o: 'do', as: 'das', os: 'dos' },
  em: { a: 'na', o: 'no', as: 'nas', os: 'nos' },
}

/**
 * Contrai a preposição com o artigo: "de" + "a arara" vira "da arara".
 *
 * Sem isto o gerador escrevia "Antes de a arara virar venda" — português de
 * robô logo na primeira frase. O texto é para ser falado em vídeo; se tropeça
 * na leitura, a pessoa reescreve tudo e o gerador perde a razão de existir.
 */
export function contrair(preposicao: 'de' | 'em', texto: string): string {
  const limpo = texto.trim()
  if (!limpo) return preposicao

  const [primeira, ...resto] = limpo.split(/\s+/)
  const contraida = CONTRACOES[preposicao][primeira.toLowerCase()]

  // Artigo indefinido fica solto de propósito: "de um estoque" é como se fala,
  // e "dum" soa datado em texto que vai ser lido em voz alta.
  if (!contraida || resto.length === 0) return `${preposicao} ${limpo}`
  return `${contraida} ${resto.join(' ')}`
}

/** Tira o artigo da frente: "a arara do estoque" vira "arara do estoque". */
export function semArtigo(texto: string): string {
  return texto.trim().replace(/^(a|o|as|os|um|uma)\s+/i, '')
}

export function maiuscula(texto: string): string {
  const limpo = texto.trim()
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

/** Junta as linhas de um story, separando parágrafos por linha em branco. */
export function paragrafos(...partes: (string | string[])[]): string {
  return partes
    .flatMap((parte) => (Array.isArray(parte) ? [parte.join('\n')] : [parte]))
    .filter((parte) => parte.trim() !== '')
    .join('\n\n')
}
