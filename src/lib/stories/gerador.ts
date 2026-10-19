import { ARCOS, GATILHOS, type Arco, type GatilhoId } from '@/lib/stories/gatilhos'
import { TEMAS, TEMAS_POR_ID, type Eixo, type Tema } from '@/lib/stories/temas'

export interface StoryGerado {
  ordem: number
  rotulo: string
  gatilho: GatilhoId
  direcaoVisual: string
  texto: string
  pedeInteracao: boolean
}

export interface Sequencia {
  temaId: string | null
  titulo: string
  arcoId: string
  stories: StoryGerado[]
  /** O recado final: qual story carrega o peso da sequência. */
  observacao: string
}

/* ------------------------------------------------------------ português -- */

/**
 * Contrai a preposição com o artigo: "de" + "a arara" vira "da arara".
 *
 * Sem isto o gerador escrevia "Antes de a arara do estoque virar venda" e
 * "aproximando de a arara" — português de robô, logo na primeira frase que a
 * pessoa lê. O texto é para ser falado em vídeo; se ele tropeça na leitura,
 * a pessoa reescreve tudo e o gerador perde a razão de existir.
 */
const CONTRACOES: Record<'de' | 'em', Record<string, string>> = {
  de: { a: 'da', o: 'do', as: 'das', os: 'dos' },
  em: { a: 'na', o: 'no', as: 'nas', os: 'nos' },
}

export function contrair(preposicao: 'de' | 'em', texto: string): string {
  const limpo = texto.trim()
  if (!limpo) return preposicao

  const [primeira, ...resto] = limpo.split(/\s+/)
  const contraida = CONTRACOES[preposicao][primeira.toLowerCase()]

  // Artigo indefinido fica solto de propósito: "de um estoque" é como se
  // fala, e "dum" soa datado em texto que vai ser lido em voz alta.
  if (!contraida || resto.length === 0) return `${preposicao} ${limpo}`
  return `${contraida} ${resto.join(' ')}`
}

/* ------------------------------------------------------------- escritores -- */
/*
 * Um escritor por gatilho. Cada um recebe o tema e devolve o texto DAQUELE
 * story — é aqui que gatilho (o movimento) e tema (o assunto) viram frase.
 *
 * O texto sai em rascunho, não em versão final, e isso é de propósito: a
 * sequência é editável e quem grava é o Raphael. Um gerador que entregasse
 * texto fechado seria pior, porque a pessoa leria em vez de falar — e story
 * lido se reconhece de longe.
 */

const ESCRITORES: Record<GatilhoId, (tema: Tema) => string> = {
  abertura: (t) => t.promessa,

  /*
   * "Por trás de X", e não "antes de X virar venda".
   *
   * O segundo só funciona quando X é produto. Metade dos temas mostra uma
   * tela, uma mesa de devolução ou a equipe — e "antes da mesa de devolução
   * virar venda" é frase quebrada. Testado sobre os 21 temas: esta forma
   * fecha em todos.
   */
  curiosidade: (t) =>
    [
      `Por trás ${contrair('de', t.oQueMostrar)} existe uma decisão que quase ninguém vê:`,
      '',
      t.pergunta,
      '',
      'Vou te mostrar como eu decido.',
    ].join('\n'),

  identificacao: (t) =>
    [
      'Na sua operação, qual destes cenários mais preocupa você?',
      '',
      `🔘 ${t.opcoesDeEnquete[0]}`,
      `🔘 ${t.opcoesDeEnquete[1]}`,
    ].join('\n'),

  autoridade: (t) =>
    [
      `Vou usar ${t.oQueMostrar} como exemplo.`,
      '',
      `Para decidir, eu olho ${t.dadoQueProva}.`,
      '',
      'É isso que define onde colocar o dinheiro.',
    ].join('\n'),

  reciprocidade: (t) => ['Faça uma conferência hoje:', '', ...t.acaoUtil].join('\n'),

  urgencia: (t) =>
    [
      `Agora pense no seu prazo: ${t.prazoReal}.`,
      '',
      'Se isso te pegar no meio da campanha, quando você consegue resolver?',
      '',
      'Essa resposta precisa entrar no planejamento de agora.',
    ].join('\n'),

  compromisso: (t) =>
    [
      `Pensando na sua operação: ${t.perguntaFinal}`,
      '',
      t.opcoesFinais.join('? '),
      '',
      '📩 Me conte aqui o que está travando.',
    ].join('\n'),

  bastidor: (t) =>
    [
      `Isto aqui é ${t.oQueMostrar}.`,
      '',
      'É onde a decisão que eu vou te contar acontece de verdade.',
    ].join('\n'),

  // Os três abaixo dependem de campo opcional. Sem ele, o texto vira um pedido
  // explícito em vez de recheio genérico: `[preencha: ...]` não passa
  // despercebido na hora de gravar; um parágrafo vago passa.
  vulnerabilidade: (t) =>
    t.erro
      ? [
          'Já errei isso, e o erro foi caro:',
          '',
          t.erro.charAt(0).toUpperCase() + t.erro.slice(1) + '.',
          '',
          'O que eu mudei depois foi o que vou te mostrar agora.',
        ].join('\n')
      : `[preencha: um erro seu nesse assunto e QUANTO ele custou — sem o número, vira humildade de fachada]`,

  prova_social: (t) =>
    t.provaSocial
      ? [`Olha ${t.provaSocial}.`, '', 'Não sou só eu passando por isso.'].join('\n')
      : `[preencha: print de conversa, depoimento ou alguém da equipe falando sobre ${t.alavanca.toLowerCase()}]`,

  contraste: (t) =>
    t.contraste
      ? [
          `O que quase todo mundo faz: ${t.contraste.comum}.`,
          '',
          `O que funciona: ${t.contraste.queFunciona}.`,
          '',
          'A diferença entre os dois aparece na margem, não na venda.',
        ].join('\n')
      : `[preencha: o jeito comum de fazer isso, e o jeito que funciona]`,
}

/* --------------------------------------------------------------- gerar -- */

export function arcoPorId(id: string): Arco {
  return ARCOS.find((arco) => arco.id === id) ?? ARCOS[0]
}

export interface OpcoesDeGeracao {
  /**
   * Substitui o objeto concreto do tema.
   *
   * É por aqui que a imagem de apoio entra: a pessoa diz em poucas palavras o
   * que a foto mostra ("a arara do estoque de verão"), e a sequência inteira
   * passa a girar em torno DAQUELA imagem — a curiosidade se aproxima dela, a
   * autoridade a segura na mão, a enquete aparece por cima dela.
   */
  oQueMostrar?: string
}

export function gerarSequencia(
  temaId: string,
  arcoId?: string,
  opcoes: OpcoesDeGeracao = {},
): Sequencia | null {
  const base = TEMAS_POR_ID.get(temaId)
  if (!base) return null

  const descricao = opcoes.oQueMostrar?.trim()
  const tema: Tema = descricao ? { ...base, oQueMostrar: descricao } : base

  const arco = arcoPorId(arcoId ?? tema.arcosSugeridos[0] ?? ARCOS[0].id)

  const stories = arco.passos.map((gatilhoId, i) => {
    const gatilho = GATILHOS[gatilhoId]
    return {
      ordem: i + 1,
      rotulo: `Story ${i + 1} — ${gatilho.rotulo}`,
      gatilho: gatilhoId,
      direcaoVisual: i === 0 ? gatilho.direcaoVisual : direcaoDoTema(gatilhoId, tema),
      texto: ESCRITORES[gatilhoId](tema),
      pedeInteracao: Boolean(gatilho.pedeInteracao),
    }
  })

  return {
    temaId: tema.id,
    titulo: tema.titulo,
    arcoId: arco.id,
    stories,
    observacao: observacaoDe(arco, stories),
  }
}

/** A direção visual puxa o objeto concreto do tema quando faz sentido. */
function direcaoDoTema(gatilhoId: GatilhoId, tema: Tema): string {
  const padrao = GATILHOS[gatilhoId].direcaoVisual
  switch (gatilhoId) {
    case 'curiosidade':
      return `Movimento: a câmera se aproximando ${contrair('de', tema.oQueMostrar)}.`
    case 'bastidor':
      return `Plano aberto ${contrair('de', tema.oQueMostrar)}.`
    case 'autoridade':
      // "Você com a arara com as peças..." — o objeto do tema já costuma
      // trazer um "com". "Em cena:" não colide com nada e serve igual para
      // objeto, tela e pessoa.
      return `Em cena: ${tema.oQueMostrar}. Mostre o dado na tela: ${tema.dadoQueProva}.`
    case 'identificacao':
      return `Imagem ${contrair('de', tema.oQueMostrar)}, com enquete por cima.`
    default:
      return padrao
  }
}

/**
 * O recado final.
 *
 * Aponta o story que sustenta a sequência — aquele que, se sair fraco, derruba
 * o resto. É sempre o da prova concreta quando ela existe; sem ela, o da ação
 * útil, que é o que faz salvar.
 */
function observacaoDe(arco: Arco, stories: StoryGerado[]): string {
  const prova = stories.find((s) => s.gatilho === 'autoridade')
  const util = stories.find((s) => s.gatilho === 'reciprocidade')
  const alvo = prova ?? util ?? stories[stories.length - 1]

  const porque =
    alvo === prova
      ? 'é o story que torna a sua autoridade visível. Um dado real ali dá força a todos os outros.'
      : alvo === util
        ? 'é o story que faz salvar. Sem uma tarefa que a pessoa consiga fazer hoje, a sequência vira opinião.'
        : 'é onde a conversa abre. Se a pergunta for vaga, ninguém responde.'

  return `Arco: ${arco.rotulo}. O ${alvo.rotulo.split(' — ')[0].toLowerCase()} merece mais atenção — ${porque}`
}

/* ------------------------------------------------------------ sugestões -- */

export interface ContextoDoDia {
  /** Títulos de datas do calendário próximas (feiras, Black Friday, feriados). */
  eventos: string[]
  /** Títulos e tags de notícias recentes. */
  noticias: string[]
}

export interface Sugestao {
  tema: Tema
  /** Por que este tema hoje. Vazio quando a escolha foi só rotação. */
  motivo: string
}

/**
 * Os três temas do dia.
 *
 * Não é sorteio. A pontuação olha o que já está no app — as datas da semana e
 * as notícias recentes — e sobe os temas que conversam com elas. É o que faz a
 * sugestão de uma terça de novembro falar de estoque e margem, e a de uma
 * terça de janeiro falar de queima e caixa.
 *
 * O desempate é semeado pela data: a lista muda de um dia para o outro, mas é
 * a MESMA se você abrir o mesmo dia duas vezes. Sugestão que muda a cada
 * clique faz a pessoa ficar clicando à procura de uma melhor em vez de gravar.
 */
export function sugerirTemas(dia: string, contexto: ContextoDoDia, quantos = 3): Sugestao[] {
  const alvo = [...contexto.eventos, ...contexto.noticias].join(' · ').toLowerCase()
  /*
   * A semente é o número de DIAS desde a epoch, não a soma dos caracteres da
   * data.
   *
   * Somar caracteres parecia equivalente e não era: '2026-10-09' e
   * '2026-10-18' somam igual, e a colisão fazia a janela de três temas parar
   * nos mesmos lugares. Medido, 8 dos 21 temas nunca chegavam ao topo em um
   * mês inteiro. Com dias-desde-a-epoch a janela anda exatamente uma casa por
   * dia e o banco inteiro circula.
   */
  const semente = Math.floor(Date.parse(`${dia}T00:00:00Z`) / 86_400_000) || 0

  const pontuados = TEMAS.map((tema, i) => {
    const batidas = (tema.contexto ?? []).filter((palavra) => alvo.includes(palavra))
    // A rotação é determinística e espalhada: sem ela, os primeiros temas da
    // lista apareceriam todo dia e os últimos, nunca.
    const rotacao = ((i + semente) % TEMAS.length) / (TEMAS.length * 2)
    return { tema, batidas, nota: batidas.length + rotacao }
  })

  return pontuados
    .sort((a, b) => b.nota - a.nota)
    .slice(0, quantos)
    .map(({ tema, batidas }) => ({
      tema,
      motivo: batidas.length
        ? `Puxado pelo que está no seu calendário e nas notícias: ${batidas.join(', ')}.`
        : '',
    }))
}

/* ------------------------------------------------- tema a partir do texto -- */

const VAZIAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'um', 'uma', 'e', 'em',
  'no', 'na', 'nos', 'nas', 'com', 'para', 'por', 'que', 'meu', 'minha', 'nosso',
  'nossa', 'the', 'esta', 'este', 'essa', 'esse', 'foto', 'imagem', 'print',
])

function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !VAZIAS.has(p))
}

/**
 * Qual assunto combina com o que a pessoa descreveu.
 *
 * Existe porque "gerar a partir da imagem" não pode exigir que um tema já
 * tenha sido escolhido — quem acabou de colar uma foto do galpão não escolheu
 * assunto nenhum, e esse era justamente o caminho que o botão deixava
 * desativado.
 *
 * Quando nada casa, devolve a primeira sugestão do dia em vez de null: uma
 * sequência com o ângulo do dia e o objeto certo é útil; um botão que não faz
 * nada, não. A tela diz qual ângulo entrou, para não haver surpresa.
 */
export function escolherTemaPor(
  descricao: string,
  dia: string,
  contexto: ContextoDoDia,
  /** Restringe ao eixo pedido. Sem ele, o banco inteiro concorre. */
  eixo?: Eixo,
): Tema {
  const candidatos = eixo ? TEMAS.filter((tema) => tema.eixo === eixo) : TEMAS
  const termos = palavras(descricao)

  if (termos.length > 0 && candidatos.length > 0) {
    /*
     * Os campos não valem o mesmo.
     *
     * `contexto` é a lista que existe PARA casar — é curada. `titulo` e
     * `alavanca` dizem do que o tema trata. `oQueMostrar` é cenário, e casa por
     * acidente: "mesa" aparece tanto na mesa de corte quanto na mesa de
     * devolução. Sem peso, "a mesa de corte com os tecidos" caía em devolução.
     */
    const pesar = (termos2: string[], campo: string[]) =>
      termos2.filter((termo) =>
        // `startsWith` nos dois sentidos cobre plural e flexão sem stemmer:
        // "estoque" casa com "estoques", que é o caso que aparece de verdade.
        campo.some((p) => p === termo || p.startsWith(termo) || termo.startsWith(p)),
      ).length

    const pontuados = candidatos.map((tema) => {
      const nota =
        pesar(termos, palavras((tema.contexto ?? []).join(' '))) * 3 +
        pesar(termos, palavras(`${tema.titulo} ${tema.alavanca}`)) * 2 +
        pesar(termos, palavras(tema.oQueMostrar))
      return { tema, nota }
    }).sort((a, b) => b.nota - a.nota)

    if (pontuados[0].nota > 0) return pontuados[0].tema
  }

  /*
   * Nada casou. Em vez de devolver null e travar o botão, cai na sugestão do
   * dia — que é contextual. Com eixo pedido, cai no primeiro daquele eixo que
   * a rotação do dia alcançar, para a escolha do usuário ser respeitada mesmo
   * quando o texto dele não diz nada ao motor.
   */
  if (eixo) {
    const doEixo = sugerirTemas(dia, contexto, TEMAS.length).find((s) => s.tema.eixo === eixo)
    if (doEixo) return doEixo.tema
    if (candidatos.length > 0) return candidatos[0]
  }
  return sugerirTemas(dia, contexto, 1)[0].tema
}

/** A sequência em texto corrido, para colar em qualquer lugar. */
export function sequenciaEmTexto(sequencia: Sequencia): string {
  const partes = [sequencia.titulo, '']
  for (const story of sequencia.stories) {
    partes.push(`${story.rotulo}`)
    partes.push(`(${story.direcaoVisual})`)
    partes.push('')
    partes.push(story.texto)
    partes.push('')
  }
  partes.push(sequencia.observacao)
  return partes.join('\n')
}
