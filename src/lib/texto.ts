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

/**
 * Primeira linha com conteúdo de um texto — o "nome" que a pessoa escreveu.
 *
 * Usa a primeira linha NÃO VAZIA, não a primeira linha: um briefing que começa
 * com uma quebra de linha renderizaria um título em branco.
 */
export function primeiraLinha(texto: string | null | undefined, limite = 90) {
  const linha = texto?.split('\n').find((l) => l.trim())?.trim() ?? ''
  if (!linha) return ''
  return linha.length > limite ? `${linha.slice(0, limite - 1).trimEnd()}…` : linha
}

/**
 * Como o item se chama no calendário, na lista e na agenda.
 *
 * A primeira linha do briefing vem SEMPRE na frente — inclusive depois de o
 * conteúdo ser criado. Antes, assim que existia um preview, o card passava a
 * mostrar o nome do expert: o mesmo item mudava de nome no meio do fluxo, e
 * uma agenda com cinco conteúdos do mesmo expert virava cinco cards iguais.
 * O expert é quem grava, não o que é gravado.
 */
export function tituloDoItem(
  item: { notas?: string | null; preview?: { nome_expert: string } | null },
  reserva: string,
) {
  return primeiraLinha(item.notas) || item.preview?.nome_expert || reserva
}
