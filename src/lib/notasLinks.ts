/**
 * Ligações entre notas, no formato do Obsidian: `[[Título da nota]]`.
 *
 * A ligação é por TÍTULO, não por id. É o que torna possível escrever o link
 * antes de a nota existir — você cita um tema e cria a nota depois, que é
 * justamente como o Obsidian é usado. O preço é que renomear uma nota quebra
 * as ligações para ela; em troca, escrever não exige parar para escolher um id.
 */

const PADRAO = /\[\[([^[\]]+)\]\]/g

/** Compara títulos ignorando caixa, acento e espaço sobrando. */
export function chaveDoTitulo(titulo: string) {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Texto puro do HTML, com uma quebra de linha por bloco.
 *
 * `textContent` sozinho cola tudo: `<p>Título</p><p>Corpo</p>` viraria
 * "TítuloCorpo", e o título da nota sairia grudado no primeiro parágrafo.
 * Fechar cada bloco com \n antes de ler resolve sem varrer a árvore (o que
 * duplicaria texto de bloco aninhado, tipo <li><p>…</p></li>).
 */
function texto(html: string) {
  const comQuebras = html.replace(/<\/(p|h[1-6]|li|blockquote|pre|div|tr)\s*>/gi, '\n</$1>')
  const doc = new DOMParser().parseFromString(`<body>${comQuebras}</body>`, 'text/html')
  return doc.body.textContent ?? ''
}

/** Títulos citados com [[...]] no conteúdo, sem repetir. */
export function ligacoesDe(html: string): string[] {
  const achados = new Set<string>()
  for (const [, titulo] of texto(html).matchAll(PADRAO)) {
    const limpo = titulo.trim()
    if (limpo) achados.add(limpo)
  }
  return [...achados]
}

export interface NotaComLigacoes {
  id: string
  titulo: string
  conteudo?: string
  ligacoes?: string[]
}

/**
 * Quem aponta para esta nota.
 *
 * Calculado no cliente de propósito: um caderno pessoal tem dezenas ou
 * centenas de notas, não milhões. Uma tabela de ligações no banco precisaria
 * ser reescrita a cada tecla digitada, para responder uma pergunta que um
 * filtro em memória responde na hora.
 */
export function retroLigacoes(
  alvo: { titulo: string },
  todas: NotaComLigacoes[],
  idDoAlvo: string,
) {
  const chave = chaveDoTitulo(alvo.titulo)
  if (!chave) return []

  return todas.filter(
    (nota) =>
      nota.id !== idDoAlvo &&
      (nota.ligacoes ?? []).some((titulo) => chaveDoTitulo(titulo) === chave),
  )
}

/** Resolve os [[títulos]] citados para notas existentes (ou marca como nova). */
export function resolverLigacoes(
  titulosCitados: string[],
  todas: { id: string; titulo: string }[],
) {
  const porChave = new Map(todas.map((nota) => [chaveDoTitulo(nota.titulo), nota]))
  return titulosCitados.map((titulo) => ({
    titulo,
    nota: porChave.get(chaveDoTitulo(titulo)) ?? null,
  }))
}

/** Título a partir do conteúdo, como no Notas da Apple: a primeira linha. */
export function tituloDoConteudo(html: string, reserva = 'Nota sem título') {
  const primeira = texto(html)
    .split('\n')
    .map((linha) => linha.trim())
    .find(Boolean)
  if (!primeira) return reserva
  return primeira.length > 120 ? `${primeira.slice(0, 119).trimEnd()}…` : primeira
}

/** Primeiras palavras do corpo, para a prévia na lista. */
export function resumoDoConteudo(html: string, titulo: string, limite = 90) {
  const corpo = texto(html).replace(/\s+/g, ' ').trim()
  const semTitulo = corpo.startsWith(titulo) ? corpo.slice(titulo.length).trim() : corpo
  if (!semTitulo) return ''
  return semTitulo.length > limite ? `${semTitulo.slice(0, limite - 1).trimEnd()}…` : semTitulo
}
