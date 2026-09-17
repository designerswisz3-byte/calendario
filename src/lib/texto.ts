/**
 * Contagem de palavras e tempo de fala do roteiro.
 *
 * A mesma conta aparecia em três lugares (formulário, painel do dia e bloco de
 * notas) — e três cópias da mesma regra é uma discordância esperando acontecer.
 */

/** 150 palavras por minuto: ritmo de fala gravada, não de leitura silenciosa. */
const PALAVRAS_POR_MINUTO = 150

export function contarPalavras(texto: string | null | undefined) {
  const limpo = texto?.trim() ?? ''
  return limpo ? limpo.split(/\s+/).length : 0
}

export function minutosDeFala(palavras: number) {
  return Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO))
}

/** "312 palavras · ~2 min" — vazio quando não há texto, para não poluir a UI. */
export function resumoDoRoteiro(texto: string | null | undefined) {
  const palavras = contarPalavras(texto)
  if (!palavras) return ''
  return `${palavras} palavras · ~${minutosDeFala(palavras)} min`
}
