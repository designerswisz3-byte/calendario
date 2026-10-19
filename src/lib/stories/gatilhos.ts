import { contrair, maiuscula, paragrafos, semArtigo } from '@/lib/stories/frases'
import type { Tema } from '@/lib/stories/temas'

/**
 * Os gatilhos: a gramática de uma sequência de stories.
 *
 * Cada gatilho é um MOVIMENTO, não um assunto. "Curiosidade" não diz sobre o
 * que falar — diz o que aquele story precisa fazer com quem assiste.
 *
 * ----------------------------------------------------------------------------
 * Por que cada gatilho tem VÁRIAS variantes
 * ----------------------------------------------------------------------------
 * A primeira versão tinha uma função de escrita por gatilho. O resultado:
 * trocar o tema trocava os substantivos e nada mais — toda curiosidade do app
 * dizia "Por trás de X existe uma decisão que quase ninguém vê". Com 21 temas e
 * 5 arcos parecia haver 105 sequências; havia 11 frases.
 *
 * Variedade de verdade está na FRASE, não no assunto. Por isso cada gatilho
 * carrega de três a cinco formas genuinamente diferentes de fazer o mesmo
 * movimento — não sinônimos, e sim ângulos: a curiosidade pode abrir por um
 * objeto, por uma pergunta que ninguém faz, por um erro próprio ou por um
 * número guardado.
 *
 * Base: Cialdini (reciprocidade, prova social, autoridade, compromisso,
 * escassez), StoryBrand (o espectador é o herói; a marca é o guia) e a regra da
 * casa — promessa clara, problema no meio, solução no fim.
 */

export type GatilhoId =
  | 'abertura'
  | 'curiosidade'
  | 'identificacao'
  | 'autoridade'
  | 'reciprocidade'
  | 'urgencia'
  | 'compromisso'
  | 'bastidor'
  | 'vulnerabilidade'
  | 'prova_social'
  | 'contraste'
  | 'numero'
  | 'mito'
  | 'passo'
  | 'tempo_real'
  | 'pergunta_da_caixinha'
  | 'gancho'
  | 'item'

/** Uma forma de escrever o story. `ocorrencia` conta repetições no mesmo arco. */
type Variante = (tema: Tema, ocorrencia: number) => string

export interface Gatilho {
  id: GatilhoId
  rotulo: string
  /** O que este story tem de FAZER. Aparece no editor, acima do texto. */
  intencao: string
  direcaoVisual: string
  /** Story que pede interação explícita (enquete, caixinha, slider). */
  pedeInteracao?: boolean
  /**
   * A variante é escolhida pela ORDEM de repetição, não pelo sorteio.
   * É o caso de passo e item: o segundo passo tem de ser o segundo, não um
   * passo aleatório.
   */
  porOcorrencia?: boolean
  variantes: Variante[]
}

const faltando = (pedido: string) => `[preencha: ${pedido}]`

export const GATILHOS: Record<GatilhoId, Gatilho> = {
  /* --------------------------------------------------------------- abrir -- */
  abertura: {
    id: 'abertura',
    rotulo: 'Abertura',
    intencao:
      'Entrega a promessa em uma frase. Quem assiste tem de saber, em 2 segundos, o que ganha se ficar.',
    direcaoVisual: 'Você falando com a câmera, em pé, no ambiente de trabalho.',
    variantes: [
      (t) => t.promessa,
      (t) => paragrafos(t.pergunta, 'Se você travou nessa pergunta, fica comigo nos próximos stories.'),
      (t) => paragrafos('Vou ser direto, porque isso custa dinheiro:', t.promessa),
      (t) =>
        paragrafos(
          `Tem uma coisa sobre ${semArtigo(t.alavanca.toLowerCase())} que quase ninguém te conta.`,
          t.promessa,
        ),
      (t) => paragrafos('Se você só vir um story meu hoje, que seja este.', t.promessa),
    ],
  },

  numero: {
    id: 'numero',
    rotulo: 'Dado na tela',
    /*
     * "Dado", não "número".
     *
     * O campo do tema é `dadoQueProva`, e na maioria dos temas ele não é um
     * número: é o que olhar ("quanto a peça vende por semana, quais tamanhos
     * saem"). Escrever "guarda esse número" em cima disso é frase errada em 18
     * dos 21 temas — o gerador prometeria algo que a tela não mostra.
     */
    intencao:
      'Abre pelo dado cru, sem introdução. O dado faz a pergunta — você só confirma que ela existe.',
    direcaoVisual: 'Tela cheia com o dado, fonte grande, sem mais nada.',
    variantes: [
      (t) => paragrafos(maiuscula(t.dadoQueProva) + '.', 'Guarda esse dado. Já volto nele.'),
      (t) =>
        paragrafos(
          'Antes de eu falar qualquer coisa, olha isto:',
          maiuscula(t.dadoQueProva) + '.',
        ),
      (t) =>
        paragrafos(
          maiuscula(t.dadoQueProva) + '.',
          `É esse número que decide ${semArtigo(t.alavanca.toLowerCase())} aqui dentro.`,
        ),
    ],
  },

  mito: {
    id: 'mito',
    rotulo: 'Derrubar uma crença',
    intencao:
      'Começa pelo que a pessoa acredita e mostra que está errado. Contrariar prende mais do que concordar.',
    direcaoVisual: 'Você de braços cruzados, plano fechado, tom de conversa séria.',
    variantes: [
      (t) =>
        t.contraste
          ? paragrafos(
              `Você provavelmente faz assim: ${t.contraste.comum}.`,
              'Eu fazia também. E era por isso que a conta não fechava.',
            )
          : faltando(`a crença comum sobre ${t.alavanca.toLowerCase()} que você quer derrubar`),
      (t) =>
        t.contraste
          ? paragrafos(
              `A maior besteira que me ensinaram sobre ${semArtigo(t.alavanca.toLowerCase())}:`,
              `${maiuscula(t.contraste.comum)}.`,
            )
          : faltando(`o conselho ruim que você já recebeu sobre ${t.alavanca.toLowerCase()}`),
      (t) =>
        paragrafos(
          `Vou derrubar uma ideia comum sobre ${semArtigo(t.alavanca.toLowerCase())}.`,
          t.pergunta,
        ),
    ],
  },

  pergunta_da_caixinha: {
    id: 'pergunta_da_caixinha',
    rotulo: 'Resposta à caixinha',
    intencao:
      'Começa respondendo alguém. Quem assiste entra numa conversa que já estava rolando, e isso prende.',
    direcaoVisual: 'Print da pergunta recebida (com o nome coberto) na tela.',
    variantes: [
      (t) => paragrafos('Me perguntaram isto aqui e a resposta não cabe no direct:', t.pergunta),
      (t) =>
        paragrafos(
          'Chegou essa pergunta na caixinha e ela é boa demais pra responder só pra uma pessoa:',
          t.pergunta,
        ),
      (t) =>
        paragrafos(
          'Essa pergunta aparece toda semana por aqui:',
          t.pergunta,
          'Então vou responder de uma vez.',
        ),
    ],
  },

  /* ------------------------------------------------------------- sustentar -- */
  curiosidade: {
    id: 'curiosidade',
    rotulo: 'Curiosidade',
    intencao:
      'Abre um laço e não fecha. Mostra que existe uma decisão por trás do que está à vista.',
    direcaoVisual: 'Movimento: a câmera se aproximando de algo concreto da operação.',
    variantes: [
      /*
       * O objeto do tema fecha a frase.
       *
       * "Por trás da arara do modelo, separada por tamanho existe uma decisão"
       * — a vírgula do próprio campo engolia a oração seguinte. Virando a
       * ordem, qualquer campo cabe, com vírgula ou sem.
       */
      (t) =>
        paragrafos(
          `Existe uma decisão que quase ninguém vê por trás ${contrair('de', t.oQueMostrar)}:`,
          t.pergunta,
          'Vou te mostrar como eu decido.',
        ),
      (t) =>
        paragrafos(
          'Olha isto aqui.',
          `Parece só ${semArtigo(t.oQueMostrar)}. É uma decisão ${contrair('de', t.alavanca.toLowerCase())} esperando pra ser tomada.`,
          t.pergunta,
        ),
      (t) =>
        paragrafos('Ninguém te faz essa pergunta, e devia fazer:', t.pergunta),
      (t) =>
        paragrafos(
          'Eu levei anos pra entender o que está escondido aqui.',
          t.pergunta,
          'Fica comigo que eu te mostro.',
        ),
    ],
  },

  bastidor: {
    id: 'bastidor',
    rotulo: 'Bastidor',
    intencao:
      'Mostra o lugar onde a coisa acontece. É o que separa quem opera de quem comenta sobre operação.',
    direcaoVisual: 'Plano aberto do espaço real: chão de fábrica, estoque, mesa, expedição.',
    variantes: [
      (t) => paragrafos(`Isto aqui é ${semArtigo(t.oQueMostrar)}.`, 'É onde a decisão acontece de verdade.'),
      (t) => paragrafos('Vem comigo aqui um minuto.', `${maiuscula(t.oQueMostrar)}.`),
      (t) => paragrafos('Pouca gente vê esta parte.', `Sem produção nenhuma: ${t.oQueMostrar}.`),
      (t) =>
        paragrafos(
          `Toda vez que eu falo ${contrair('de', t.alavanca.toLowerCase())}, é daqui que eu estou falando.`,
          `${maiuscula(t.oQueMostrar)}.`,
        ),
    ],
  },

  tempo_real: {
    id: 'tempo_real',
    rotulo: 'Tempo real',
    intencao:
      'Narra o que está acontecendo agora, sem edição. Não vende nada — constrói presença e confiança.',
    direcaoVisual: 'Gravação de mão, sem corte, mostrando o que está acontecendo.',
    variantes: [
      (t, i) =>
        i === 0
          ? paragrafos('Acompanha comigo.', `Agora: ${t.oQueMostrar}.`)
          : paragrafos('Continuando aqui, e ainda não terminou:', `${maiuscula(t.oQueMostrar)}.`),
      /*
       * O objeto do tema fica no FIM da frase, sempre.
       *
       * "A peça que encalhou, ainda no estoque neste momento." — era o que
       * saía quando o texto continuava depois dele. Metade dos temas tem uma
       * vírgula no meio do `oQueMostrar`, e qualquer palavra colada depois
       * entra na oração errada.
       */
      (t) => paragrafos('Sem corte, sem roteiro.', `Acontecendo agora: ${t.oQueMostrar}.`),
      (t) =>
        paragrafos(
          'Decidi gravar enquanto acontece, porque editado some o que importa.',
          `${maiuscula(t.oQueMostrar)}.`,
        ),
    ],
  },

  identificacao: {
    id: 'identificacao',
    rotulo: 'Identificação e aversão à perda',
    intencao:
      'Faz quem assiste se ver no problema. Enquete com dois cenários ruins força a escolha e gera o toque.',
    direcaoVisual: 'Imagem da operação. Enquete por cima, cobrindo o meio da tela.',
    pedeInteracao: true,
    variantes: [
      (t) =>
        paragrafos('Na sua operação, qual destes cenários mais preocupa você?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Responde rápido, sem pensar muito. Dos dois, qual dói mais?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Vou fazer uma aposta: você já passou por um destes.', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Se tivesse que escolher um problema pra ter este mês, qual seria?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
    ],
  },

  autoridade: {
    id: 'autoridade',
    rotulo: 'Autoridade e prova concreta',
    intencao:
      'Mostra o número real que sustentou a decisão. Autoridade sem prova é opinião — aqui entra o dado.',
    direcaoVisual: 'Você segurando o objeto da história, ou a tela com o número à mostra.',
    variantes: [
      (t) =>
        paragrafos(
          `Vou te dar um exemplo: ${t.oQueMostrar}.`,
          `Para decidir, eu olho ${t.dadoQueProva}.`,
          'É isso que define onde colocar o dinheiro.',
        ),
      (t) =>
        paragrafos(
          'Vou abrir o número que eu olho.',
          `${maiuscula(t.dadoQueProva)}.`,
          'Sem isso, é chute com cara de estratégia.',
        ),
      (t) =>
        paragrafos(
          'Se eu decidisse isso no feeling, eu erraria — já errei.',
          `Por isso, antes de qualquer coisa, eu olho ${t.dadoQueProva}.`,
        ),
      (t) =>
        paragrafos(
          `${maiuscula(t.pergunta)}`,
          `A resposta não vem de opinião. Vem ${contrair('de', t.dadoQueProva)}.`,
        ),
    ],
  },

  contraste: {
    id: 'contraste',
    rotulo: 'Contraste',
    intencao:
      'Põe lado a lado o jeito que a maioria faz e o jeito que funciona. O contraste ensina mais rápido que a explicação.',
    direcaoVisual: 'Dois enquadramentos no mesmo story, ou antes e depois.',
    variantes: [
      (t) =>
        t.contraste
          ? paragrafos(
              `O que quase todo mundo faz: ${t.contraste.comum}.`,
              `O que funciona: ${t.contraste.queFunciona}.`,
              'A diferença entre os dois aparece na margem, não na venda.',
            )
          : faltando('o jeito comum de fazer isso, e o jeito que funciona'),
      (t) =>
        t.contraste
          ? paragrafos(
              'Duas formas de fazer a mesma coisa.',
              `A primeira: ${t.contraste.comum}. Custa barato hoje e caro depois.`,
              `A segunda: ${t.contraste.queFunciona}. Custa dez minutos hoje.`,
            )
          : faltando('os dois jeitos de fazer isso, e o que cada um custa'),
      (t) =>
        t.contraste
          ? paragrafos(
              `Eu fazia assim: ${t.contraste.comum}.`,
              `Hoje eu faço assim: ${t.contraste.queFunciona}.`,
              'A mudança não foi de esforço. Foi de ordem.',
            )
          : faltando('como você fazia antes e como faz hoje'),
    ],
  },

  vulnerabilidade: {
    id: 'vulnerabilidade',
    rotulo: 'Vulnerabilidade: o erro que custou',
    intencao:
      'Conta um erro seu, com o custo. Erro sem número é humildade de fachada; com número, vira aula.',
    direcaoVisual: 'Você sentado, tom mais baixo, sem edição.',
    variantes: [
      (t) =>
        t.erro
          ? paragrafos('Já errei isso, e o erro foi caro:', `${maiuscula(t.erro)}.`, 'O que eu mudei depois é o que vem agora.')
          : faltando('um erro seu nesse assunto e QUANTO ele custou — sem o número, vira humildade de fachada'),
      (t) =>
        t.erro
          ? paragrafos('Vou contar uma de que não me orgulho.', `${maiuscula(t.erro)}.`, 'Levei um tempo pra admitir que o problema era meu.')
          : faltando('o erro que você demorou a admitir nesse assunto, e o custo dele'),
      (t) =>
        t.erro
          ? paragrafos(`${maiuscula(t.erro)}.`, 'Esse foi o erro. O aprendizado veio da conta que eu fui obrigado a fazer depois.')
          : faltando('o erro e a conta que você teve de fazer depois dele'),
    ],
  },

  prova_social: {
    id: 'prova_social',
    rotulo: 'Prova social',
    intencao:
      'Mostra outra pessoa vivendo o mesmo problema ou o mesmo resultado. Tira o holofote de você.',
    direcaoVisual: 'Print de conversa, depoimento ou a pessoa da equipe falando.',
    variantes: [
      (t) =>
        t.provaSocial
          ? paragrafos(`Olha ${semArtigo(t.provaSocial)}.`, 'Não sou só eu passando por isso.')
          : faltando(`print, depoimento ou alguém da equipe falando sobre ${t.alavanca.toLowerCase()}`),
      (t) =>
        t.provaSocial
          ? paragrafos('Não precisa acreditar em mim.', `${maiuscula(t.provaSocial)}.`)
          : faltando(`alguém de fora falando sobre ${t.alavanca.toLowerCase()}`),
      (t) =>
        t.provaSocial
          ? paragrafos('Recebi isto esta semana e pedi pra mostrar:', `${maiuscula(t.provaSocial)}.`)
          : faltando('uma mensagem real que você recebeu sobre esse assunto'),
    ],
  },

  /* ------------------------------------------------------------- entregar -- */
  reciprocidade: {
    id: 'reciprocidade',
    rotulo: 'Reciprocidade: entregar uma ação útil',
    intencao:
      'Dá uma tarefa que a pessoa consegue fazer hoje, sozinha, de graça. É o que faz salvar o story.',
    direcaoVisual: 'Selfie ou tela com um checklist curto, legível no celular.',
    variantes: [
      (t) => paragrafos('Faça uma conferência hoje:', t.acaoUtil),
      (t) => paragrafos('Anota aí. Dá pra fazer em dez minutos, sem sistema nenhum:', t.acaoUtil),
      (t) => paragrafos('Quer testar isso na sua operação? Começa por aqui:', t.acaoUtil),
      (t) =>
        paragrafos(
          'Não vou te vender nada. Vou te dar a tarefa:',
          t.acaoUtil,
          'Se der trabalho, é porque estava sendo ignorado.',
        ),
    ],
  },

  passo: {
    id: 'passo',
    rotulo: 'Passo do tutorial',
    intencao:
      'Um passo por story. Quem está fazendo junto precisa parar, executar e voltar — e isso segura a sequência.',
    direcaoVisual: 'Tela ou mão executando o passo, com o número grande no canto.',
    porOcorrencia: true,
    variantes: [
      (t) => paragrafos('Passo 1', t.acaoUtil[0] ?? faltando('o primeiro passo')),
      (t) => paragrafos('Passo 2', t.acaoUtil[1] ?? faltando('o segundo passo')),
      (t) => paragrafos('Passo 3', t.acaoUtil[2] ?? faltando('o terceiro passo')),
      (t) => paragrafos('Passo 4', t.acaoUtil[3] ?? faltando('o quarto passo')),
    ],
  },

  item: {
    id: 'item',
    rotulo: 'Item da lista',
    intencao:
      'Um item por story, numerado. Lista é o formato mais fácil de acompanhar e o mais fácil de salvar.',
    direcaoVisual: 'Número grande na tela e uma imagem que ilustre só aquele item.',
    porOcorrencia: true,
    variantes: [
      (t) => paragrafos('1️⃣', t.acaoUtil[0] ?? faltando('o primeiro item')),
      (t) => paragrafos('2️⃣', t.acaoUtil[1] ?? faltando('o segundo item')),
      (t) => paragrafos('3️⃣', t.acaoUtil[2] ?? faltando('o terceiro item')),
      (t) => paragrafos('4️⃣', t.acaoUtil[3] ?? faltando('o quarto item')),
    ],
  },

  /* --------------------------------------------------------------- fechar -- */
  urgencia: {
    id: 'urgencia',
    rotulo: 'Urgência pelo prazo real',
    intencao:
      'Usa um prazo que existe de verdade — reposição, calendário, estoque. Urgência inventada queima a confiança.',
    direcaoVisual: 'A etapa seguinte do processo: o que acontece depois do que você mostrou.',
    variantes: [
      (t) =>
        paragrafos(
          `Agora pense no seu prazo: ${t.prazoReal}.`,
          'Se isso te pegar no meio da campanha, quando você resolve?',
          'Essa resposta precisa entrar no planejamento de agora.',
        ),
      (t) =>
        paragrafos(
          `Esse prazo não negocia: ${t.prazoReal}.`,
          'Ele não espera você estar pronto.',
        ),
      (t) =>
        paragrafos(
          'Faz a conta do seu tempo antes de decidir.',
          `${maiuscula(t.prazoReal)}.`,
          'Dá pra encaixar? Se não dá, a decisão é outra.',
        ),
    ],
  },

  compromisso: {
    id: 'compromisso',
    rotulo: 'Compromisso e abertura de conversa',
    intencao:
      'Pede uma resposta específica, com opções. Pergunta aberta demais não é respondida.',
    direcaoVisual: 'Você olhando para a câmera, com caixinha de perguntas.',
    pedeInteracao: true,
    variantes: [
      (t) =>
        paragrafos(
          `Pensando na sua operação: ${t.perguntaFinal}`,
          t.opcoesFinais.join('? ') + '?',
          '📩 Me conte aqui o que está travando.',
        ),
      (t) =>
        paragrafos(
          `Me responde uma: ${t.perguntaFinal}`,
          t.opcoesFinais.map((o) => `· ${o}`),
          '📩 Responde aqui que eu leio tudo.',
        ),
      (t) =>
        paragrafos(
          'Se você fosse resolver UMA coisa disso esta semana, qual seria?',
          t.opcoesFinais.map((o) => `· ${o}`),
          '📩 Me diz qual, que eu falo dela amanhã.',
        ),
      (t) =>
        paragrafos(
          `Quero saber de você: ${t.perguntaFinal}`,
          'Responde aí na caixinha — as melhores eu respondo em story.',
        ),
    ],
  },

  gancho: {
    id: 'gancho',
    rotulo: 'Gancho para o próximo',
    intencao:
      'Fecha sem fechar. Em vez de pedir resposta, promete a continuação — e traz a pessoa de volta amanhã.',
    direcaoVisual: 'Plano rápido do que vem a seguir, ainda inacabado.',
    variantes: [
      () => paragrafos('Amanhã eu mostro no que isso deu.', 'Guarda esse story pra comparar.'),
      (t) => paragrafos(`Falta a parte que interessa: ${t.pergunta}`, 'Vem no próximo.'),
      () => paragrafos('Não vou te dar a resposta agora.', 'Vou te dar depois que eu tiver o número na mão.'),
      (t) => paragrafos(`${maiuscula(t.prazoReal)}.`, 'Quando esse prazo virar, eu volto aqui com o resultado.'),
    ],
  },
}

export interface Arco {
  id: string
  rotulo: string
  /** Para que serve — ajuda a escolher sem ler os sete stories. */
  quandoUsar: string
  /** O jeito de falar. Aparece no seletor para diferenciar arcos do mesmo tamanho. */
  tom: string
  passos: GatilhoId[]
}

/**
 * Os arcos.
 *
 * Dezesseis formatos, e nem todos abrem ou fecham igual — esse era o outro
 * motivo de tudo parecer a mesma coisa: os cinco arcos originais começavam em
 * `abertura` e terminavam em `compromisso`, então toda sequência do app tinha a
 * mesma primeira e a mesma última frase.
 *
 * Aqui existem sete aberturas diferentes (promessa, número, crença, bastidor,
 * tempo real, pergunta da caixinha, prova social) e três fechamentos (pedido de
 * resposta, gancho para o dia seguinte, tarefa entregue sem pedir nada). Há
 * arco que não vende nada e arco que não pede interação nenhuma — porque
 * sequência que sempre termina pedindo algo cansa a audiência mais rápido do
 * que qualquer assunto repetido.
 */
export const ARCOS: Arco[] = [
  {
    id: 'autoridade_pratica',
    rotulo: 'Autoridade prática',
    tom: 'Explicativo, com um dado no meio',
    quandoUsar:
      'Quando existe uma decisão real e um número para mostrar. É o arco mais completo, e o mais pesado de gravar.',
    passos: ['abertura', 'curiosidade', 'identificacao', 'autoridade', 'reciprocidade', 'urgencia', 'compromisso'],
  },
  {
    id: 'historia',
    rotulo: 'História e bastidor',
    tom: 'Pessoal, tom mais baixo',
    quandoUsar:
      'Quando o assunto é você, a empresa ou um erro. Constrói confiança, não converte no mesmo dia.',
    passos: ['abertura', 'bastidor', 'vulnerabilidade', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'ensino_rapido',
    rotulo: 'Ensino rápido',
    tom: 'Direto ao ponto',
    quandoUsar:
      'Dia corrido. Quatro stories, uma ideia só, com a tarefa no meio para garantir o salvamento.',
    passos: ['abertura', 'identificacao', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'conversa',
    rotulo: 'Conversa com a audiência',
    tom: 'Informal, duas interações',
    quandoUsar:
      'Quando o objetivo é resposta na caixinha, não alcance. Duas interações em cinco stories.',
    passos: ['abertura', 'bastidor', 'identificacao', 'prova_social', 'compromisso'],
  },
  {
    id: 'contraste_curto',
    rotulo: 'Contraste curto',
    tom: 'Dois lados, sem meio-termo',
    quandoUsar:
      'Para corrigir uma crença comum do mercado. Funciona bem com assunto de preço e margem.',
    passos: ['abertura', 'contraste', 'autoridade', 'reciprocidade', 'compromisso'],
  },

  /* ------------------------------------- formatos que não abrem com promessa -- */
  {
    id: 'numero_cru',
    rotulo: 'Dado cru',
    tom: 'Seco, começa pelo dado',
    quandoUsar:
      'Quando o dado sozinho já choca. Abre sem introdução e fecha com gancho, sem pedir nada.',
    passos: ['numero', 'curiosidade', 'autoridade', 'gancho'],
  },
  {
    id: 'mito_derrubado',
    rotulo: 'Derrubando um mito',
    tom: 'Contrariando de cara',
    quandoUsar:
      'Quando o mercado inteiro faz errado e você consegue provar. Prende por discordância.',
    passos: ['mito', 'contraste', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'tutorial',
    rotulo: 'Tutorial em passos',
    tom: 'Passo a passo, para executar junto',
    quandoUsar:
      'Quando dá para a pessoa fazer junto, agora. É o formato que mais gera salvamento.',
    passos: ['abertura', 'passo', 'passo', 'passo', 'compromisso'],
  },
  {
    id: 'lista',
    rotulo: 'Lista numerada',
    tom: 'Enumerado, fácil de acompanhar',
    quandoUsar:
      'Para assunto com três ou quatro pontos independentes. Quem chega no meio não se perde.',
    passos: ['abertura', 'item', 'item', 'item', 'compromisso'],
  },
  {
    id: 'diario',
    rotulo: 'Diário do dia',
    tom: 'Ao vivo, sem corte, sem CTA',
    quandoUsar:
      'Dia de operação pesada. Não vende nada — constrói presença. Termina em gancho, não em pedido.',
    passos: ['tempo_real', 'tempo_real', 'vulnerabilidade', 'autoridade', 'gancho'],
  },
  {
    id: 'resposta',
    rotulo: 'Resposta à caixinha',
    tom: 'Conversando com uma pessoa',
    quandoUsar:
      'Quando alguém perguntou algo que serve para todo mundo. Abre com a pergunta de outra pessoa.',
    passos: ['pergunta_da_caixinha', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'bastidor_puro',
    rotulo: 'Bastidor puro',
    tom: 'Observação, sem ensinar nada',
    quandoUsar:
      'Para lembrar que você opera de verdade. Nenhuma interação pedida, nenhuma tarefa — só presença.',
    passos: ['bastidor', 'tempo_real', 'curiosidade', 'gancho'],
  },
  {
    id: 'entrega_seca',
    rotulo: 'Entrega seca',
    tom: 'Sem pedido nenhum, termina na tarefa',
    quandoUsar:
      'Quando você só quer ser útil naquele dia. Abre no dado, fecha na tarefa — e não pede nada em troca.',
    passos: ['numero', 'identificacao', 'autoridade', 'reciprocidade'],
  },
  {
    id: 'oficina',
    rotulo: 'Oficina em quatro passos',
    tom: 'Aula inteira, do começo ao fim',
    quandoUsar:
      'Assunto que só se resolve fazendo os quatro passos. Abre numa pergunta real e fecha prometendo o resultado.',
    passos: ['pergunta_da_caixinha', 'passo', 'passo', 'passo', 'passo', 'gancho'],
  },
  {
    id: 'lista_longa',
    rotulo: 'Lista de quatro',
    tom: 'Enumerado, começa pelo dado cru',
    quandoUsar:
      'Para assunto com quatro pontos independentes. Abre com o dado na tela, sem nenhuma introdução.',
    passos: ['numero', 'item', 'item', 'item', 'item', 'compromisso'],
  },
  {
    id: 'prova_primeiro',
    rotulo: 'Começando pelo outro',
    tom: 'O holofote em quem não é você',
    quandoUsar:
      'Quando você tem um print, um depoimento ou alguém da equipe. Tira o peso do "eu" na abertura.',
    passos: ['prova_social', 'identificacao', 'autoridade', 'reciprocidade', 'compromisso'],
  },
]
