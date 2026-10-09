/**
 * Agregação do Relatório: do dia para o mês, a semana e o comparativo.
 *
 * Tudo aqui é função pura sobre um array de dias — nenhuma chamada de rede,
 * nenhum estado. É de propósito: a regra que decide se um mês caiu 43% ou
 * subiu 4% é a parte do Relatório que não pode estar errada, e função pura é a
 * única que dá para testar sem subir banco nem navegador.
 */

export type Granularidade = 'mensal' | 'semanal'

/** Uma linha de relatorio_metricas_diarias, como a tela consome. */
export interface MetricaDiaria {
  dia: string
  seguidores: number | null
  seguidores_ganhos: number | null
  alcance: number | null
  views: number | null
  likes: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  interacoes: number | null
  cliques_no_link: number | null
  publicacoes: number | null
}

/**
 * Métricas de FLUXO: rendem algo por dia, então somam.
 *
 * `seguidores` ficou fora porque é estoque — somar o total de seguidores de 30
 * dias daria 15 mil seguidores num perfil de 500.
 */
export const METRICAS_DE_FLUXO = [
  'alcance',
  'views',
  'likes',
  'comentarios',
  'salvamentos',
  'compartilhamentos',
  'interacoes',
  'cliques_no_link',
  'publicacoes',
  'seguidores_ganhos',
] as const

export type MetricaDeFluxo = (typeof METRICAS_DE_FLUXO)[number]

export const ROTULOS: Record<MetricaDeFluxo | 'seguidores', string> = {
  seguidores: 'Seguidores',
  seguidores_ganhos: 'Seguidores ganhos',
  alcance: 'Alcance',
  views: 'Views',
  likes: 'Curtidas',
  comentarios: 'Comentários',
  salvamentos: 'Salvamentos',
  compartilhamentos: 'Compartilhamentos',
  interacoes: 'Interações',
  cliques_no_link: 'Cliques no link',
  publicacoes: 'Publicações',
}

export interface Periodo {
  /** Estável e ordenável: '2026-09' no mensal, '2026-W38' no semanal. */
  chave: string
  rotulo: string
  inicio: string
  fim: string
  /** Quantos dias o período cobre no calendário. */
  diasNoPeriodo: number
  /** Quantos desses dias têm pelo menos uma métrica coletada. */
  diasComDado: number
  /** Soma dos fluxos. Null quando NENHUM dia do período tem o dado. */
  fluxos: Record<MetricaDeFluxo, number | null>
  /** Total de seguidores no primeiro e no último dia com snapshot. */
  seguidoresInicio: number | null
  seguidoresFim: number | null
}

/* ------------------------------------------------------------------ datas -- */
/*
 * Tudo em string 'YYYY-MM-DD' e UTC.
 *
 * `new Date('2026-09-01')` é meia-noite UTC; em Brasília isso é 31/08 às 21h,
 * e `getMonth()` devolve agosto. Um dia inteiro cairia no mês errado em toda
 * virada de mês. Por isso as contas de calendário usam Date.UTC e os rótulos
 * são formatados com timeZone: 'UTC'.
 */

function paraUTC(dia: string) {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function paraTexto(data: Date) {
  return data.toISOString().slice(0, 10)
}

function somarDias(dia: string, n: number) {
  const data = paraUTC(dia)
  data.setUTCDate(data.getUTCDate() + n)
  return paraTexto(data)
}

function diasEntre(de: string, ate: string) {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000) + 1
}

/** Segunda-feira da semana ISO de `dia`. */
function segundaDaSemana(dia: string) {
  const data = paraUTC(dia)
  // getUTCDay(): 0 = domingo. ISO começa na segunda, então domingo recua 6.
  const recuo = (data.getUTCDay() + 6) % 7
  data.setUTCDate(data.getUTCDate() - recuo)
  return paraTexto(data)
}

/**
 * Número da semana ISO-8601.
 *
 * A regra é a quinta-feira: a semana pertence ao ano em que cai a quinta dela.
 * Sem isso, 1º de janeiro numa sexta viraria "semana 1" quando é a 52ª do ano
 * anterior, e dois períodos diferentes dividiriam a mesma chave.
 */
function semanaISO(dia: string): { ano: number; semana: number } {
  const quinta = paraUTC(somarDias(segundaDaSemana(dia), 3))
  const ano = quinta.getUTCFullYear()
  const primeiraQuinta = paraUTC(somarDias(segundaDaSemana(`${ano}-01-04`), 3))
  const semana =
    Math.round((quinta.getTime() - primeiraQuinta.getTime()) / (7 * 86_400_000)) + 1
  return { ano, semana }
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function rotuloMensal(dia: string) {
  const data = paraUTC(dia)
  return `${MESES[data.getUTCMonth()]} ${data.getUTCFullYear()}`
}

function rotuloSemanal(inicio: string, fim: string) {
  const a = paraUTC(inicio)
  const b = paraUTC(fim)
  const mesmoMes = a.getUTCMonth() === b.getUTCMonth()
  const diaA = String(a.getUTCDate()).padStart(2, '0')
  const diaB = String(b.getUTCDate()).padStart(2, '0')
  return mesmoMes
    ? `${diaA}–${diaB} ${MESES[b.getUTCMonth()]}`
    : `${diaA} ${MESES[a.getUTCMonth()]} – ${diaB} ${MESES[b.getUTCMonth()]}`
}

/* --------------------------------------------------------------- agrupar -- */

function ultimoDiaDoMes(dia: string) {
  const data = paraUTC(dia)
  return paraTexto(new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)))
}

function primeiroDiaDoMes(dia: string) {
  const data = paraUTC(dia)
  return paraTexto(new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1)))
}

interface Balde {
  chave: string
  rotulo: string
  inicio: string
  fim: string
  dias: MetricaDiaria[]
}

/**
 * Agrupa os dias em meses ou semanas ISO.
 *
 * Só nascem baldes que têm pelo menos um dia coletado: um mês inteiro sem
 * dado não é "mês de alcance zero", é mês que não existe no relatório.
 */
export function agrupar(dados: MetricaDiaria[], granularidade: Granularidade): Periodo[] {
  const baldes = new Map<string, Balde>()

  for (const linha of dados) {
    let chave: string
    let inicio: string
    let fim: string
    let rotulo: string

    if (granularidade === 'mensal') {
      inicio = primeiroDiaDoMes(linha.dia)
      fim = ultimoDiaDoMes(linha.dia)
      chave = inicio.slice(0, 7)
      rotulo = rotuloMensal(linha.dia)
    } else {
      inicio = segundaDaSemana(linha.dia)
      fim = somarDias(inicio, 6)
      const { ano, semana } = semanaISO(linha.dia)
      chave = `${ano}-W${String(semana).padStart(2, '0')}`
      rotulo = rotuloSemanal(inicio, fim)
    }

    const balde = baldes.get(chave) ?? { chave, rotulo, inicio, fim, dias: [] }
    balde.dias.push(linha)
    baldes.set(chave, balde)
  }

  return [...baldes.values()]
    .sort((a, b) => (a.chave < b.chave ? -1 : 1))
    .map(fechar)
}

function fechar(balde: Balde): Periodo {
  const dias = [...balde.dias].sort((a, b) => (a.dia < b.dia ? -1 : 1))

  const fluxos = {} as Record<MetricaDeFluxo, number | null>
  for (const metrica of METRICAS_DE_FLUXO) {
    const presentes = dias.map((d) => d[metrica]).filter((v): v is number => v !== null)
    // Nenhum dia com o dado → null, e não 0. A tela mostra "—" em vez de
    // desenhar uma barra zerada que pareceria queda real.
    fluxos[metrica] = presentes.length === 0 ? null : presentes.reduce((s, v) => s + v, 0)
  }

  const comSeguidores = dias.filter((d) => d.seguidores !== null)

  return {
    chave: balde.chave,
    rotulo: balde.rotulo,
    inicio: balde.inicio,
    fim: balde.fim,
    diasNoPeriodo: diasEntre(balde.inicio, balde.fim),
    // Um dia "tem dado" se qualquer métrica dele foi coletada.
    diasComDado: dias.filter(
      (d) => d.seguidores !== null || METRICAS_DE_FLUXO.some((m) => d[m] !== null),
    ).length,
    fluxos,
    seguidoresInicio: comSeguidores[0]?.seguidores ?? null,
    seguidoresFim: comSeguidores[comSeguidores.length - 1]?.seguidores ?? null,
  }
}

/* ------------------------------------------------------------ comparativo -- */

export interface Variacao {
  atual: number | null
  anterior: number | null
  /** Diferença absoluta. Null quando falta um dos dois lados. */
  diferenca: number | null
  /** Variação percentual. Null quando falta um lado OU o anterior é 0. */
  percentual: number | null
  /**
   * Os dois períodos cobrem o mesmo número de dias coletados?
   *
   * Comparar um mês de 30 dias coletados com um de 15 e anunciar "-50%" é o
   * erro mais fácil de cometer aqui. Quando isso acontece a tela avisa, em vez
   * de apresentar a queda como se fosse de performance.
   */
  comparavel: boolean
}

function variacao(
  atual: number | null,
  anterior: number | null,
  comparavel: boolean,
): Variacao {
  const temOsDois = atual !== null && anterior !== null
  return {
    atual,
    anterior,
    diferenca: temOsDois ? atual - anterior : null,
    // Divisão por zero: de 0 para 10 não é "+∞%", é "+10" e ponto.
    percentual: temOsDois && anterior !== 0 ? ((atual - anterior) / anterior) * 100 : null,
    comparavel,
  }
}

export interface Comparativo {
  atual: Periodo
  anterior: Periodo | null
  fluxos: Record<MetricaDeFluxo, Variacao>
  seguidoresGanhos: Variacao
  /** Diferença de dias coletados entre os dois períodos. */
  diferencaDeCobertura: number
}

/**
 * Compara um período com o período imediatamente anterior da mesma série —
 * mês contra mês passado, semana contra semana passada.
 */
export function comparar(periodos: Periodo[], chave: string): Comparativo | null {
  const i = periodos.findIndex((p) => p.chave === chave)
  if (i < 0) return null

  const atual = periodos[i]
  const anterior = i > 0 ? periodos[i - 1] : null
  const diferencaDeCobertura = anterior ? atual.diasComDado - anterior.diasComDado : 0
  // Um dia de folga passa (fevereiro contra janeiro, mês em curso); mais que
  // isso e a comparação direta deixa de significar performance.
  const comparavel = Boolean(anterior) && Math.abs(diferencaDeCobertura) <= 1

  const fluxos = {} as Record<MetricaDeFluxo, Variacao>
  for (const metrica of METRICAS_DE_FLUXO) {
    fluxos[metrica] = variacao(
      atual.fluxos[metrica],
      anterior?.fluxos[metrica] ?? null,
      comparavel,
    )
  }

  const ganhoDe = (p: Periodo | null) => {
    if (!p) return null
    // Preferimos a diferença dos snapshots: é o número que a Meta mostra.
    // A soma dos ganhos diários serve de reserva quando falta snapshot.
    if (p.seguidoresInicio !== null && p.seguidoresFim !== null) {
      return p.seguidoresFim - p.seguidoresInicio
    }
    return p.fluxos.seguidores_ganhos
  }

  return {
    atual,
    anterior,
    fluxos,
    seguidoresGanhos: variacao(ganhoDe(atual), ganhoDe(anterior), comparavel),
    diferencaDeCobertura,
  }
}

/* ---------------------------------------------------------------- formato -- */

export function numero(valor: number | null, casas = 0) {
  if (valor === null) return '—'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function percentual(valor: number | null) {
  if (valor === null) return '—'
  const sinal = valor > 0 ? '+' : ''
  return `${sinal}${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function comSinal(valor: number | null) {
  if (valor === null) return '—'
  return `${valor > 0 ? '+' : ''}${numero(valor)}`
}
