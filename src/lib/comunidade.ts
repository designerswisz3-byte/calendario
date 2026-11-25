/**
 * A pauta do grupo de WhatsApp: de uma data para um assunto.
 *
 * ----------------------------------------------------------------------------
 * Como o sistema funciona
 * ----------------------------------------------------------------------------
 * Cada dia da semana tem um PILAR fixo — segunda é dia de número, quinta é dia
 * de marketplace. Ele nunca decide "sobre o que falar"; só pega o assunto do
 * pilar do dia. É isso que tira a fricção de decisão, que é o que mata a
 * constância, e é isso que ensina ao grupo a rotina da semana.
 *
 * Dentro de cada pilar, os assuntos andam em fila: o da semana que vem é o
 * próximo da lista. Cada pilar tem a sua fila e o seu tamanho, então as sete
 * giram de forma independente — a de segunda recomeça depois de 18 semanas, as
 * outras depois de 20.
 *
 * Três coisas valem mais do que a fila:
 *   · a SEQUÊNCIA DE LARGADA, que tem data marcada (a semana da Black Friday);
 *   · o que ele ESCOLHEU para o dia, trocando o assunto sugerido por outro do
 *     pilar ou por um coringa;
 *   · o que ele de fato MARCOU como falado, que é o registro.
 *
 * O texto dos assuntos não mora aqui: vem de comunidadeBanco.ts, que é gerado
 * a partir do documento dele (scripts/comunidade/banco-temas.md).
 */

import {
  CORINGAS,
  DINAMICAS,
  LARGADA,
  PILARES,
  SAZONAL,
  type AssuntoDoBanco,
  type GanchoDoMes,
  type Importancia,
  type Pilar,
} from '@/lib/comunidadeBanco'

export { CORINGAS, DINAMICAS, PILARES }
export type { Importancia, Pilar }

export const ROTULO_DE_IMPORTANCIA: Record<Importancia, string> = {
  5: 'Crítico',
  4: 'Alto',
  3: 'Médio',
}

export const EXPLICACAO_DE_IMPORTANCIA: Record<Importancia, string> = {
  5: 'Mexe direto na margem ou no caixa. Quem erra aqui trabalha de graça.',
  4: 'Mexe no resultado do trimestre. Vale a atenção desta semana.',
  3: 'Melhora a operação, mas não decide o mês sozinho.',
}

/** O formato de todo post do grupo, na ordem. */
export const FORMATO_DO_POST = [
  { nome: 'Fato do dia', detalhe: 'em uma linha.' },
  { nome: 'Prova', detalhe: 'print, foto, vídeo curto ou áudio.' },
  { nome: 'O porquê', detalhe: 'o princípio por trás do número, em 3 a 5 linhas.' },
  { nome: 'Uma pergunta só', detalhe: 'respondível em uma linha ou por enquete.' },
]

/** O que precisa estar decidido antes de postar — vale para todo dia. */
export const PONTOS_DE_ATENCAO = [
  'A métrica de sucesso é resposta de membro, não post seu. Se só você fala, o grupo vira lista de transmissão.',
  'Grupo aberto tem concorrente dentro: nome de fornecedor, custo de costura por peça, campeão no início do ciclo e valor absoluto de caixa e lucro não entram. Número sensível vai em % ou em evolução.',
  'Nenhum número inventado. Sem a prova no dia, troque por um assunto de Pessoas ou de Visão, que não dependem de dado.',
  'Convite para a mentoria: no máximo um a cada duas semanas, sempre logo depois de um post de alto valor.',
]

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

const DIA_EM_MS = 24 * 60 * 60 * 1000

/*
 * Toda a aritmética de data é feita em UTC, com a data já reduzida a ano, mês
 * e dia. Somar 24 horas a uma data local erra uma vez por ano em país com
 * horário de verão; em UTC não existe esse dia de 23 horas.
 */
function paraUTC(chave: string): number {
  const [ano, mes, dia] = chave.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

function paraChave(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** A segunda-feira da semana de uma data (`YYYY-MM-DD`). */
export function segundaDaSemana(chave: string): string {
  const ms = paraUTC(chave)
  // getUTCDay: domingo = 0. A semana do grupo começa na segunda.
  const desdeSegunda = (new Date(ms).getUTCDay() + 6) % 7
  return paraChave(ms - desdeSegunda * DIA_EM_MS)
}

export function somarDias(chave: string, dias: number): string {
  return paraChave(paraUTC(chave) + dias * DIA_EM_MS)
}

// ---------------------------------------------------------------------------
// O assunto de um dia
// ---------------------------------------------------------------------------

/** O primeiro dia do grupo. Antes dele não há pauta: o grupo não existia. */
export const INICIO_DO_GRUPO = LARGADA[0].data

/*
 * O primeiro dia da rotação: o dia seguinte ao fim da largada.
 *
 * É a partir daqui que cada pilar conta as suas semanas. A quarta, que vem
 * logo depois da largada, começa no primeiro assunto de Margem; a segunda só
 * começa cinco dias depois, no primeiro assunto de Números. Nenhum pilar perde
 * o seu primeiro assunto por causa do dia da semana em que a largada acabou.
 */
const INICIO_DA_ROTACAO = somarDias(LARGADA[LARGADA.length - 1].data, 1)

const PILAR_DO_DIA = new Map(PILARES.map((pilar) => [pilar.dia, pilar]))
const LARGADA_POR_DATA = new Map(LARGADA.map((item) => [item.data, item]))

/** O assunto de um dia, já no formato que a tela mostra. */
export interface AssuntoDoDia {
  /** O que fica gravado em `comunidade_falados.subtema_id`. */
  id: string
  /** De onde veio: a fila do pilar, a largada com data marcada, ou um coringa. */
  origem: 'pilar' | 'largada' | 'coringa'
  /** O nome do pilar, "Largada" ou "Coringa" — o rótulo acima do título. */
  grupo: string
  /** A categoria dentro do pilar. Vazia na largada e nos coringas. */
  tema: string
  assunto: string
  /** O que trazer. No coringa, é o ângulo do post. */
  prova: string
  pergunta: string
  recorrente: boolean
  /** Coringa não tem nível: ele entra porque aconteceu, não porque é a vez dele. */
  importancia: Importancia | null
}

function doPilar(pilar: Pilar, assunto: AssuntoDoBanco): AssuntoDoDia {
  return {
    id: assunto.id,
    origem: 'pilar',
    grupo: pilar.nome,
    tema: assunto.tema,
    assunto: assunto.assunto,
    prova: assunto.prova,
    pergunta: assunto.pergunta,
    recorrente: assunto.recorrente,
    importancia: assunto.importancia,
  }
}

/** Todo assunto que pode ser gravado, pelo identificador. */
const ASSUNTO_POR_ID = new Map<string, AssuntoDoDia>()
for (const pilar of PILARES) {
  for (const assunto of pilar.assuntos) ASSUNTO_POR_ID.set(assunto.id, doPilar(pilar, assunto))
}
for (const item of LARGADA) {
  ASSUNTO_POR_ID.set(item.id, {
    id: item.id,
    origem: 'largada',
    grupo: 'Largada · semana da Black Friday',
    tema: '',
    assunto: item.assunto,
    prova: item.prova,
    pergunta: item.pergunta,
    recorrente: false,
    importancia: item.importancia,
  })
}
for (const coringa of CORINGAS) {
  ASSUNTO_POR_ID.set(coringa.id, {
    id: coringa.id,
    origem: 'coringa',
    grupo: 'Coringa',
    tema: '',
    assunto: coringa.gatilho,
    prova: coringa.angulo,
    pergunta: coringa.pergunta,
    recorrente: false,
    importancia: null,
  })
}

/**
 * Um assunto pelo identificador gravado.
 *
 * Devolve `null` para identificador desconhecido — o que acontece com dia
 * marcado antes de o banco de temas ser trocado, e vai acontecer de novo
 * quando um assunto for retirado do documento. A tela trata: o dia continua
 * marcado e mostra o assunto da fila.
 */
export function assuntoPorId(id: string): AssuntoDoDia | null {
  return ASSUNTO_POR_ID.get(id) ?? null
}

/** O pilar de uma data, pelo dia da semana. */
export function pilarDoDia(data: string): Pilar {
  return PILAR_DO_DIA.get(new Date(paraUTC(data)).getUTCDay())!
}

/**
 * O assunto que a pauta sugere para uma data.
 *
 * `null` antes do início do grupo. A largada tem data marcada e vence a fila;
 * depois dela, cada pilar anda uma posição por semana.
 */
export function assuntoSugerido(data: string): AssuntoDoDia | null {
  if (data < INICIO_DO_GRUPO) return null

  const daLargada = LARGADA_POR_DATA.get(data)
  if (daLargada) return ASSUNTO_POR_ID.get(daLargada.id)!

  const pilar = pilarDoDia(data)
  // A primeira vez que este dia da semana acontece na rotação.
  const inicio = paraUTC(INICIO_DA_ROTACAO)
  const ateOPrimeiro = (pilar.dia - new Date(inicio).getUTCDay() + 7) % 7
  const primeiro = inicio + ateOPrimeiro * DIA_EM_MS
  const semanas = Math.round((paraUTC(data) - primeiro) / (7 * DIA_EM_MS))
  const posicao = ((semanas % pilar.assuntos.length) + pilar.assuntos.length) % pilar.assuntos.length
  return doPilar(pilar, pilar.assuntos[posicao])
}

// ---------------------------------------------------------------------------
// As dinâmicas e o gancho do mês
// ---------------------------------------------------------------------------

/**
 * As dinâmicas fixas que caem numa data.
 *
 * São o que põe o membro para falar — e o que separa comunidade de lista de
 * transmissão. Só as que têm dia certo aparecem no card do dia; as mensais e
 * a de entrada de membro ficam no painel "como o grupo funciona".
 */
export function dinamicasDoDia(data: string): string[] {
  if (data < INICIO_DA_ROTACAO) return []
  const ms = paraUTC(data)
  const diaDaSemana = new Date(ms).getUTCDay()
  const saida: string[] = []

  if (diaDaSemana === 1) saida.push('Enquete do painel', 'Lançar o desafio da semana')
  if (diaDaSemana === 5) saida.push('Erro da semana', 'Fechar o desafio da semana')
  if (diaDaSemana === 3) {
    // Quinzenal, contando da primeira quarta da rotação.
    const semanas = Math.round((ms - paraUTC(INICIO_DA_ROTACAO)) / (7 * DIA_EM_MS))
    if (semanas % 2 === 0) saida.push('Hot seat')
  }
  // Último dia do mês: o dia seguinte já é de outro mês.
  if (somarDias(data, 1).slice(0, 7) !== data.slice(0, 7)) saida.push('Curadoria do mês')

  return saida
}

/** O gancho sazonal do mês em que a maior parte da semana cai. */
export function ganchoDaSemana(segunda: string): GanchoDoMes | null {
  // A quinta-feira decide o mês de uma semana partida entre dois.
  return SAZONAL[somarDias(segunda, 3).slice(0, 7)] ?? null
}
