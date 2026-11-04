import { contrair, maiuscula, paragrafos, semArtigo } from '@/lib/stories/frases'
import type { DispositivoId } from '@/lib/stories/dispositivos'
import type { Tema } from '@/lib/stories/temas'

/**
 * Os movimentos: a gramática de uma sequência de stories.
 *
 * Cada movimento é uma COISA QUE O STORY FAZ, não um assunto. "Reflexão" não
 * diz sobre o que falar — diz o que aquele story precisa provocar em quem
 * assiste.
 *
 * ============================================================================
 * O que estava errado na versão anterior, e por quê
 * ============================================================================
 * A primeira versão tinha dezoito movimentos e dezesseis arcos, e produzia
 * sequências que o Raphael descreveu como "pobres, padronizadas, não conectam
 * em nada". Os três motivos, na ordem do dano:
 *
 * 1. CONSTATAÇÃO EM VEZ DE REFLEXÃO. A abertura era literalmente o campo
 *    `promessa` do tema — um fato. "Estoque parado não é patrimônio." Quem
 *    assiste ouve, concorda e não muda nada, porque não foi colocado em
 *    xeque. Informante entrega fato; quem é acompanhado derruba a maneira como
 *    a pessoa já fazia e DEPOIS fecha a caixa que abriu.
 *
 * 2. NÃO EXISTIA HISTÓRIA. Nenhum dos dezesseis arcos tinha estrutura de
 *    narrativa — eram listas de movimentos. História é cenário normal, quebra
 *    do padrão, jornada de superação e aprendizado, nessa ordem. Sem isso o
 *    story explica, e explicação não gera memória: história gera.
 *
 * 3. A TRÍADE ESTAVA TORTA. Quase todo movimento entregava informação, alguns
 *    entregavam autoridade, e NENHUM entregava entretenimento. Faltava a parte
 *    que humaniza — a cena boba da rotina, a piada que se repete, o lado de
 *    quem está do mesmo lado. Perfil só técnico é enciclopédia, e ninguém
 *    acompanha enciclopédia por carinho.
 *
 * ============================================================================
 * O que passou a existir
 * ============================================================================
 * - `aei`: cada movimento declara qual ponta da tríade alimenta. O gerador usa
 *   isso para montar um dia equilibrado e para DIZER ao Raphael o que ficou
 *   faltando — do mesmo jeito que se diagnostica um perfil: engaja e não vende
 *   é falta de autoridade; vende e ninguém entra é falta de conexão; o seguidor
 *   entra e sai é falta de conhecimento.
 *
 * - `papel`: o lugar na história de quatro tempos, quando o movimento tem um.
 *   É o que permite existir arco narrativo de verdade.
 *
 * - `dispositivo`: o PEDIDO que acompanha o movimento (ver dispositivos.ts).
 *   Antes havia um booleano e uma enquete; agora cada story pede uma coisa
 *   diferente, com custo e retorno diferentes.
 *
 * Base: as cinco aulas do material de stories (histórias, reflexão, conversas,
 * tríade A.E.I), o catálogo de dispositivos de engenharia social, Cialdini,
 * StoryBrand (quem assiste é o herói; você é o guia) e a régua da casa —
 * promessa clara na abertura, problema no meio, solução no fim.
 */

/** Qual ponta da tríade o story alimenta. Todo story alimenta exatamente uma. */
export type AEI = 'autoridade' | 'entretenimento' | 'informacao'

export const ROTULO_AEI: Record<AEI, string> = {
  autoridade: 'Autoridade',
  entretenimento: 'Entretenimento',
  informacao: 'Informação',
}

/** O lugar do movimento na história de quatro tempos. */
export type Papel = 'cena' | 'quebra' | 'virada' | 'licao'

export type GatilhoId =
  /* ------ aberturas ------ */
  | 'abertura'
  | 'reflexao'
  | 'numero'
  | 'mito'
  | 'pergunta_da_caixinha'
  | 'print_direct'
  | 'cena_normal'
  /* ------ história ------ */
  | 'quebra'
  | 'virada'
  | 'licao'
  /* ------ sustentação ------ */
  | 'curiosidade'
  | 'identificacao'
  | 'contraste'
  | 'bastidor'
  | 'tempo_real'
  | 'vulnerabilidade'
  /* ------ autoridade, pelos três caminhos ------ */
  | 'autoridade'
  | 'depoimento'
  | 'usufruto'
  | 'prova_social'
  /* ------ entretenimento ------ */
  | 'rotina'
  | 'piada_interna'
  | 'caixinha_pessoal'
  /* ------ informação (método B.D.A.) ------ */
  | 'basico'
  | 'didatico'
  | 'aplicavel'
  | 'reciprocidade'
  | 'passo'
  | 'item'
  /* ------ memória ------ */
  | 'ancora'
  | 'resumo'
  /* ------ fechos ------ */
  | 'urgencia'
  | 'compromisso'
  | 'levante_a_mao'
  | 'gancho'

/** Uma forma de escrever o story. `ocorrencia` conta repetições no mesmo arco. */
type Variante = (tema: Tema, ocorrencia: number) => string

interface Definicao {
  id: GatilhoId
  rotulo: string
  /** O que este story tem de FAZER. Aparece no editor, acima do texto. */
  intencao: string
  direcaoVisual: string
  aei: AEI
  papel?: Papel
  dispositivo: DispositivoId
  /**
   * A variante é escolhida pela ORDEM de repetição, não pelo sorteio.
   * É o caso de passo e item: o segundo passo tem de ser o segundo.
   */
  porOcorrencia?: boolean
  variantes: Variante[]
}

export interface Gatilho extends Definicao {
  /**
   * Story que pede algo de quem assiste.
   *
   * Continua existindo porque o banco guarda `pede_interacao` em cada linha e
   * há sequências salvas que dependem dele. Agora é DERIVADO do dispositivo,
   * em vez de ser um campo escrito à mão que podia discordar dele.
   */
  pedeInteracao: boolean
}

const faltando = (pedido: string) => `[preencha: ${pedido}]`

/** O que o tema oferece como reflexão, ou o pedido de preenchimento. */
const semReflexao = (t: Tema) =>
  faltando(
    `o que a pessoa faz no automático em ${semArtigo(t.alavanca.toLowerCase())}, ` +
      'por que isso está errado e qual é o jeito certo',
  )

const DEFINICOES: Definicao[] = [
  /* ======================================================== aberturas ==== */
  {
    id: 'abertura',
    rotulo: 'Abertura com promessa',
    intencao:
      'Entrega a promessa em uma frase. Quem assiste tem de saber, em 2 segundos, o que ganha se ficar.',
    direcaoVisual: 'Você falando com a câmera, em pé, no ambiente de trabalho.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      /*
       * A primeira variante NÃO é mais o campo `promessa` cru.
       *
       * Era, e era o maior defeito do gerador: a abertura de toda sequência era
       * a manchete do tema, copiada. Fato enunciado não é abertura — é título.
       * A abertura precisa prometer para QUEM assiste, no tempo dela.
       */
      (t) =>
        paragrafos(
          `Se você vende moda e nunca parou pra olhar ${semArtigo(t.alavanca.toLowerCase())}, este story é pra você.`,
          t.promessa,
        ),
      (t) =>
        paragrafos(
          t.pergunta,
          'Se você travou nessa pergunta, fica comigo até o fim — eu te dou a conta.',
        ),
      (t) => paragrafos('Vou ser direto, porque isso custa dinheiro todo mês:', t.promessa),
      (t) =>
        paragrafos(
          `Tem uma coisa sobre ${semArtigo(t.alavanca.toLowerCase())} que quase ninguém te conta.`,
          t.promessa,
          'Nos próximos stories eu abro a conta.',
        ),
      (t) => paragrafos('Se você só vir um story meu hoje, que seja este.', t.promessa),
    ],
  },

  {
    id: 'reflexao',
    rotulo: 'Reflexão: quebrar o automático',
    /*
     * O movimento que faltava, e o mais importante de todos.
     *
     * A diferença entre informar e ser acompanhado está aqui. Informar é dizer
     * "a margem real desconta comissão e frete". Gerar reflexão é mostrar para
     * a pessoa que ela calcula margem errado desde que abriu a loja, e só
     * DEPOIS dar o jeito certo. O primeiro ela ouve; o segundo ela não
     * consegue desouvir.
     *
     * A segunda parte não é opcional: quem abre a caixa fecha a caixa. Reflexão
     * sem saída é só deixar a pessoa pior do que ela chegou.
     */
    intencao:
      'Mostra que o jeito que a pessoa faz hoje está errado — e fecha, no mesmo story, com o jeito certo. Abriu a caixa, fecha a caixa.',
    direcaoVisual: 'Plano fechado, você falando devagar. Sem tela, sem objeto: é a frase que carrega.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.reflexao
          ? paragrafos(
              `Você provavelmente faz assim: ${t.reflexao.noAutomatico}.`,
              `E aí está o problema — ${t.reflexao.oQueNinguemVe}.`,
              `O jeito que funciona é outro: ${t.reflexao.oJeitoCerto}.`,
            )
          : semReflexao(t),
      (t) =>
        t.reflexao
          ? paragrafos(
              `Se você ${t.reflexao.noAutomatico}, você está fazendo errado. E não é culpa sua: te ensinaram assim.`,
              `${maiuscula(t.reflexao.oQueNinguemVe)}.`,
              `A correção leva dez minutos: ${t.reflexao.oJeitoCerto}.`,
            )
          : semReflexao(t),
      (t) =>
        t.reflexao
          ? paragrafos(
              `Pergunta honesta: você ${t.reflexao.noAutomatico}?`,
              'Eu fazia. Por anos. E a conta não fechava justamente por isso.',
              `${maiuscula(t.reflexao.oQueNinguemVe)}. Hoje eu faço assim: ${t.reflexao.oJeitoCerto}.`,
            )
          : semReflexao(t),
      (t) =>
        t.reflexao
          ? paragrafos(
              `Isso aqui parece detalhe e decide o mês: ${t.reflexao.oQueNinguemVe}.`,
              `Enquanto você ${t.reflexao.noAutomatico}, o dinheiro sai sem aparecer em lugar nenhum.`,
              `${maiuscula(t.reflexao.oJeitoCerto)}.`,
            )
          : semReflexao(t),
    ],
  },

  {
    id: 'numero',
    rotulo: 'Dado na tela',
    /*
     * "Dado", não "número". O campo do tema é `dadoQueProva`, e na maioria dos
     * temas ele não é um número: é o que olhar. Escrever "guarda esse número"
     * em cima disso é frase errada em quase todo tema.
     */
    intencao:
      'Abre pelo dado cru, sem introdução. O dado faz a pergunta — você só confirma que ela existe.',
    direcaoVisual: 'Tela cheia com o dado, fonte grande, sem mais nada. Tarja preta cobrindo só o número.',
    aei: 'autoridade',
    dispositivo: 'tarja_de_curiosidade',
    variantes: [
      (t) => paragrafos(maiuscula(t.dadoQueProva) + '.', 'Guarda esse dado. Já volto nele.'),
      (t) => paragrafos('Antes de eu falar qualquer coisa, olha isto:', maiuscula(t.dadoQueProva) + '.'),
      (t) =>
        paragrafos(
          maiuscula(t.dadoQueProva) + '.',
          `É esse dado que decide ${semArtigo(t.alavanca.toLowerCase())} aqui dentro — e eu aposto que você não tem ele na mão.`,
        ),
      (t) =>
        paragrafos(
          'Tampei o número de propósito.',
          `${maiuscula(t.dadoQueProva)}.`,
          'Daqui a dois stories eu destampo.',
        ),
    ],
  },

  {
    id: 'mito',
    rotulo: 'Derrubar uma crença',
    intencao:
      'Começa pelo que a pessoa acredita e mostra que está errado. Contrariar prende mais do que concordar.',
    direcaoVisual: 'Você de braços cruzados, plano fechado, tom de conversa séria.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.contraste
          ? paragrafos(
              `Você provavelmente faz assim: ${t.contraste.comum}.`,
              'Eu fazia também. E era exatamente por isso que a conta não fechava.',
            )
          : faltando(`a crença comum sobre ${t.alavanca.toLowerCase()} que você quer derrubar`),
      (t) =>
        t.contraste
          ? paragrafos(
              `A maior besteira que me ensinaram sobre ${semArtigo(t.alavanca.toLowerCase())}:`,
              `${maiuscula(t.contraste.comum)}.`,
              'Custou caro pra eu desaprender.',
            )
          : faltando(`o conselho ruim que você já recebeu sobre ${t.alavanca.toLowerCase()}`),
      (t) =>
        paragrafos(
          `Vou derrubar uma ideia que o mercado inteiro repete sobre ${semArtigo(t.alavanca.toLowerCase())}.`,
          t.pergunta,
        ),
      (t) =>
        t.reflexao
          ? paragrafos(
              `Não faça nada sobre ${semArtigo(t.alavanca.toLowerCase())} hoje.`,
              `Porque se você olhar, vai descobrir que ${t.reflexao.oQueNinguemVe} — e aí não tem como desver.`,
              'Agora que eu já estraguei seu dia: vem comigo.',
            )
          : faltando(`o que a pessoa vai descobrir sobre ${t.alavanca.toLowerCase()} se olhar de verdade`),
    ],
  },

  {
    id: 'pergunta_da_caixinha',
    rotulo: 'Resposta à caixinha',
    intencao:
      'Começa respondendo alguém. Quem assiste entra numa conversa que já estava rolando, e isso prende.',
    direcaoVisual: 'Print da pergunta recebida, com o nome coberto, ocupando a tela.',
    aei: 'entretenimento',
    dispositivo: 'print_do_direct',
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
          'Então vou responder de uma vez, pra todo mundo.',
        ),
    ],
  },

  {
    id: 'print_direct',
    rotulo: 'Print do direct',
    /*
     * Dispositivo virou movimento porque ele ABRE sequência.
     *
     * Mostrar que você responde é o que faz a próxima pessoa mandar mensagem.
     * Ninguém manda direct para quem parece inalcançável — e o perfil só parece
     * alcançável quando ele mostra que alcançou alguém.
     */
    intencao:
      'Mostra uma conversa real sua com um dono de loja. Prova que você responde — é isso que faz o próximo mandar mensagem.',
    direcaoVisual: 'Print da conversa, nome tampado, a sua resposta visível. Nada mais na tela.',
    aei: 'entretenimento',
    dispositivo: 'print_do_direct',
    variantes: [
      (t) =>
        paragrafos(
          'Olha a conversa que eu tive ontem aqui no direct.',
          `A dúvida era essa: ${t.pergunta}`,
          'Respondi por áudio, mas vale pra muita gente — então vou abrir aqui.',
        ),
      (t) =>
        paragrafos(
          'Printei com a permissão dela e tampei o nome.',
          `${maiuscula(t.pergunta)}`,
          'Eu respondo todo mundo, viu? Pode mandar.',
        ),
      (t) =>
        paragrafos(
          'Três pessoas diferentes me mandaram a mesma coisa esta semana.',
          t.pergunta,
          'Quando a dúvida repete, não é dúvida: é furo de mercado.',
        ),
    ],
  },

  /* ================================================ história em 4 tempos === */
  {
    id: 'cena_normal',
    rotulo: 'Cenário normal',
    /*
     * O primeiro tempo da história, e o que ninguém grava.
     *
     * Quase todo criador abre no problema, porque o problema é o que interessa.
     * Só que problema sem cenário normal não tem quebra: a pessoa precisa ver
     * o padrão antes de ver o padrão romper. É o tempo mais chato de gravar e o
     * que faz os outros três funcionarem.
     */
    intencao:
      'Mostra como as coisas eram ANTES de dar errado. Sem o normal, a quebra não quebra nada.',
    direcaoVisual: 'Plano aberto, luz do dia, ritmo calmo. O lugar funcionando como sempre.',
    aei: 'entretenimento',
    papel: 'cena',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.historia
          ? paragrafos(
              'Vou te contar uma história que terminou em número, mas começou assim:',
              `${maiuscula(t.historia.cenaNormal)}.`,
            )
          : faltando('como era a operação ANTES do problema aparecer'),
      (t) =>
        t.historia
          ? paragrafos(
              `${maiuscula(t.historia.cenaNormal)}.`,
              'Era assim todo mês. Funcionava, ou eu achava que funcionava.',
            )
          : faltando('o jeito como era antes, quando você achava que estava tudo certo'),
      (t) =>
        t.historia
          ? paragrafos(
              'Deixa eu voltar um pouco antes, porque senão o resto não faz sentido.',
              `${maiuscula(t.historia.cenaNormal)}.`,
            )
          : faltando('o cenário normal da operação antes da virada'),
    ],
  },

  {
    id: 'quebra',
    rotulo: 'O problema aparece',
    intencao:
      'O momento em que o padrão rompe. Uma coisa só, com data e tamanho — não uma lista de dificuldades.',
    direcaoVisual: 'Plano fechado no que deu errado: a tela, a peça, a planilha, a caixa parada.',
    aei: 'entretenimento',
    papel: 'quebra',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.historia
          ? paragrafos('Até que:', `${maiuscula(t.historia.quebra)}.`)
          : faltando('o que saiu do lugar — um fato, com data e tamanho'),
      (t) =>
        t.historia
          ? paragrafos(
              `${maiuscula(t.historia.quebra)}.`,
              'E isso não foi azar. Foi uma decisão minha chegando a conta.',
            )
          : faltando('o problema que apareceu e a decisão sua que causou ele'),
      (t) =>
        t.historia
          ? paragrafos(
              'Aí veio o dia que mudou como eu olho isso.',
              `${maiuscula(t.historia.quebra)}.`,
              'Eu não tinha o que responder.',
            )
          : faltando('o dia em que o problema ficou impossível de ignorar'),
    ],
  },

  {
    id: 'virada',
    rotulo: 'Jornada de superação',
    /*
     * O tempo que mais se perde na gravação.
     *
     * A tentação é pular do problema para o aprendizado — "errei, aprendi" —
     * porque é mais curto. Mas é na jornada que a pessoa vê que dá para fazer:
     * ela não copia a lição, ela copia o caminho. Pular isso é a diferença
     * entre inspirar e ensinar.
     */
    intencao:
      'O que você fez, na ordem, para sair do problema. É aqui que quem assiste aprende a copiar o caminho.',
    direcaoVisual: 'Você em movimento: mexendo na planilha, no estoque, no telefone com o fornecedor.',
    aei: 'informacao',
    papel: 'virada',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.historia
          ? paragrafos('O que eu fiz, na ordem:', `${maiuscula(t.historia.virada)}.`)
          : faltando('o que você fez para resolver, passo por passo'),
      (t) =>
        t.historia
          ? paragrafos(
              'Não foi insight. Foi trabalho chato.',
              `${maiuscula(t.historia.virada)}.`,
              'Levou mais tempo do que eu queria.',
            )
          : faltando('o trabalho chato que resolveu o problema'),
      /*
       * Esta variante NÃO recita `dadoQueProva`.
       *
       * Recitava, e era a única repetição que o banco inteiro ainda produzia:
       * em `historia_completa`, a virada citava o dado no fecho e o story
       * seguinte — autoridade, cujas quatro variantes todas citam o dado —
       * repetia a mesma frase longa na tela seguinte. Como não havia variante
       * de autoridade sem o dado, o desempate tinha de sair daqui.
       */
      (t) =>
        t.historia
          ? paragrafos(
              `${maiuscula(t.historia.virada)}.`,
              'E eu só soube que tinha dado certo quando o número virou. Já volto nele.',
            )
          : faltando('como você virou o jogo, e qual número provou que virou'),
    ],
  },

  {
    id: 'licao',
    rotulo: 'O aprendizado',
    intencao:
      'O princípio que ficou — a frase que a pessoa leva. Não é resumo da história: é a regra que nasceu dela.',
    direcaoVisual: 'Tela cheia, texto curto e grande. Feito para pausar e salvar.',
    aei: 'informacao',
    papel: 'licao',
    dispositivo: 'resumo_da_sequencia',
    variantes: [
      (t) =>
        t.historia
          ? paragrafos(`${maiuscula(t.historia.licao)}.`, 'É a regra que saiu daí, e eu não abro mão dela.')
          : faltando('o princípio que ficou dessa história — uma frase, não um resumo'),
      (t) =>
        t.historia
          ? paragrafos(
              'Se você levar uma coisa só deste story, leva esta:',
              `${maiuscula(t.historia.licao)}.`,
            )
          : faltando('a frase que resume o aprendizado'),
      (t) =>
        t.historia
          ? paragrafos(
              `${maiuscula(t.historia.licao)}.`,
              // Sem o campo `alavanca` nesta frase: "Me custou grade e mix
              // inteira pra aprender" era o que saía nos temas cuja alavanca
              // não é um substantivo que aceita "inteira".
              'Parece óbvio escrito assim. Não parecia nada óbvio quando eu estava no meio.',
            )
          : faltando('o aprendizado, e o que ele te custou'),
    ],
  },

  /* ====================================================== sustentação ==== */
  {
    id: 'curiosidade',
    rotulo: 'Curiosidade',
    intencao: 'Abre um laço e não fecha. Mostra que existe uma decisão por trás do que está à vista.',
    direcaoVisual: 'Movimento: a câmera se aproximando de algo concreto da operação.',
    aei: 'entretenimento',
    dispositivo: 'elemento_escondido',
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
      (t) => paragrafos('Ninguém te faz essa pergunta, e devia fazer:', t.pergunta),
      (t) =>
        paragrafos(
          'Tem uma coisa nesta cena que eu não vou comentar agora.',
          'Quem achar, me manda no direct.',
          t.pergunta,
        ),
    ],
  },

  {
    id: 'identificacao',
    rotulo: 'Identificação e aversão à perda',
    intencao:
      'Faz quem assiste se ver no problema. Enquete com dois cenários ruins força a escolha — sim ou não não força nada.',
    direcaoVisual: 'Imagem da operação. Enquete por cima, cobrindo o meio da tela.',
    aei: 'entretenimento',
    dispositivo: 'enquete_dois_cenarios',
    variantes: [
      (t) =>
        paragrafos('Na sua operação, qual destes dói mais?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Responde rápido, sem pensar muito. Dos dois, qual é o seu?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Vou fazer uma aposta: você já passou por um destes este ano.', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
      (t) =>
        paragrafos('Se tivesse que escolher UM problema pra ter este mês, qual seria?', [
          `🔘 ${t.opcoesDeEnquete[0]}`,
          `🔘 ${t.opcoesDeEnquete[1]}`,
        ]),
    ],
  },

  {
    id: 'contraste',
    rotulo: 'Contraste',
    intencao:
      'Põe lado a lado o jeito que a maioria faz e o jeito que funciona. O contraste ensina mais rápido que a explicação.',
    direcaoVisual: 'Dois enquadramentos no mesmo story, ou antes e depois.',
    aei: 'informacao',
    dispositivo: 'nenhum',
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

  {
    id: 'bastidor',
    rotulo: 'Bastidor',
    intencao:
      'Mostra o lugar onde a coisa acontece. É o que separa quem opera de quem comenta sobre operação.',
    direcaoVisual: 'Plano aberto do espaço real: chão de fábrica, estoque, mesa, expedição.',
    aei: 'autoridade',
    dispositivo: 'nenhum',
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

  {
    id: 'tempo_real',
    rotulo: 'Tempo real',
    intencao:
      'Narra o que está acontecendo agora, sem edição. Não vende nada — constrói presença e confiança.',
    direcaoVisual: 'Gravação de mão, sem corte, mostrando o que está acontecendo.',
    aei: 'entretenimento',
    dispositivo: 'nenhum',
    variantes: [
      (t, i) =>
        i === 0
          ? paragrafos('Acompanha comigo.', `Agora: ${t.oQueMostrar}.`)
          : paragrafos('Continuando aqui, e ainda não terminou:', `${maiuscula(t.oQueMostrar)}.`),
      /*
       * O objeto do tema fica no FIM da frase, sempre.
       *
       * "A peça que encalhou, ainda no estoque neste momento." — era o que saía
       * quando o texto continuava depois dele. Metade dos temas tem vírgula no
       * meio do `oQueMostrar`, e qualquer palavra colada depois entra na oração
       * errada.
       */
      (t) => paragrafos('Sem corte, sem roteiro.', `Acontecendo agora: ${t.oQueMostrar}.`),
      (t) =>
        paragrafos(
          'Decidi gravar enquanto acontece, porque editado some o que importa.',
          `${maiuscula(t.oQueMostrar)}.`,
        ),
    ],
  },

  {
    id: 'vulnerabilidade',
    rotulo: 'Vulnerabilidade: o erro que custou',
    intencao:
      'Conta um erro seu, com o custo. Erro sem número é humildade de fachada; com número, vira aula.',
    direcaoVisual: 'Você sentado, tom mais baixo, sem edição.',
    aei: 'entretenimento',
    papel: 'quebra',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.erro
          ? paragrafos(
              'Já errei isso, e o erro foi caro:',
              `${maiuscula(t.erro)}.`,
              'O que eu mudei depois é o que vem agora.',
            )
          : faltando('um erro seu nesse assunto e QUANTO ele custou — sem o número, vira humildade de fachada'),
      (t) =>
        t.erro
          ? paragrafos(
              'Vou contar uma de que não me orgulho.',
              `${maiuscula(t.erro)}.`,
              'Levei um tempo pra admitir que o problema era meu.',
            )
          : faltando('o erro que você demorou a admitir nesse assunto, e o custo dele'),
      (t) =>
        t.erro
          ? paragrafos(
              `${maiuscula(t.erro)}.`,
              'Esse foi o erro. O aprendizado veio da conta que eu fui obrigado a fazer depois.',
            )
          : faltando('o erro e a conta que você teve de fazer depois dele'),
    ],
  },

  /* ============================== autoridade, pelos três caminhos ======== */
  {
    id: 'autoridade',
    rotulo: 'Autoridade: viver o que prega',
    /*
     * Primeiro caminho da autoridade: você é o aluno número um do que ensina.
     *
     * Não basta viver no secreto. Se o Raphael defende régua de desconto e
     * nunca mostra a régua dele na tela, quem assiste não tem como saber. A
     * palavra convence; o exemplo arrasta.
     */
    intencao:
      'Mostra VOCÊ fazendo o que ensina, com o número na tela. É o primeiro caminho da autoridade e o que mais falta.',
    direcaoVisual: 'Você segurando o objeto da operação, ou a sua tela com o número à mostra.',
    aei: 'autoridade',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        paragrafos(
          `Vou te mostrar no meu: ${t.oQueMostrar}.`,
          `Pra decidir, eu olho ${t.dadoQueProva}.`,
          'É isso que define onde eu coloco o dinheiro — não é opinião.',
        ),
      (t) =>
        paragrafos(
          'Vou abrir o número que eu olho, ao vivo.',
          `${maiuscula(t.dadoQueProva)}.`,
          'Sem isso, é chute com cara de estratégia.',
        ),
      (t) =>
        paragrafos(
          'Se eu decidisse isso no feeling, eu erraria — já errei.',
          `Por isso, antes de qualquer coisa, eu olho ${t.dadoQueProva}.`,
          'Toda semana, no mesmo dia.',
        ),
      (t) =>
        paragrafos(
          `${maiuscula(t.pergunta)}`,
          `A resposta não vem de opinião. Vem ${contrair('de', t.dadoQueProva)}.`,
        ),
    ],
  },

  {
    id: 'depoimento',
    rotulo: 'Autoridade: depoimento',
    /*
     * Segundo caminho. A pessoa só manda depoimento porque alguém pediu — e
     * porque viu outra pessoa mandando. O primeiro print publicado destrava os
     * seguintes; sem nenhum, ninguém começa.
     */
    intencao:
      'Mostra o resultado de OUTRA pessoa. Tira o holofote de você e, publicado uma vez, destrava os próximos.',
    direcaoVisual: 'Print do depoimento ou do número do aluno, com o nome coberto se ele pediu.',
    aei: 'autoridade',
    dispositivo: 'peca_o_print',
    variantes: [
      (t) =>
        t.provaSocial
          ? paragrafos(
              `Olha o que chegou: ${semArtigo(t.provaSocial)}.`,
              'Não sou eu falando de mim. É alguém que fez e mediu.',
              'Se você fez também, me manda o seu print que eu comento aqui.',
            )
          : faltando(`o print, o depoimento ou o resultado de alguém sobre ${t.alavanca.toLowerCase()}`),
      (t) =>
        t.provaSocial
          ? paragrafos(
              'Não precisa acreditar em mim.',
              `${maiuscula(t.provaSocial)}.`,
              'Pedi autorização pra mostrar, e ela deixou.',
            )
          : faltando(`alguém de fora com resultado em ${t.alavanca.toLowerCase()}`),
      (t) =>
        t.provaSocial
          ? paragrafos(
              'Recebi isto esta semana e pedi pra mostrar:',
              `${maiuscula(t.provaSocial)}.`,
              'Esse é o tipo de mensagem que faz eu continuar gravando.',
            )
          : faltando('uma mensagem real que você recebeu sobre esse assunto'),
    ],
  },

  {
    id: 'usufruto',
    rotulo: 'Autoridade: colher o resultado',
    /*
     * Terceiro caminho, e o mais esquecido. A diferença é sutil e importa:
     * viver o que prega é passar pela ponte que você construiu. Colher o
     * resultado é mostrar onde a ponte te levou.
     *
     * Quem só mostra depoimento de aluno e nunca mostra o próprio resultado
     * soa como quem vende o mapa e nunca foi.
     */
    intencao:
      'Mostra o que a disciplina te DEU — não o trabalho, o resultado dele. É o caminho de autoridade que quase ninguém usa.',
    direcaoVisual: 'O resultado em cena: a operação rodando sozinha, o relatório fechado, o lugar onde isso te levou.',
    aei: 'autoridade',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.usufruto
          ? paragrafos(
              `Isto aqui é o que ${semArtigo(t.alavanca.toLowerCase())} bem feita me deu:`,
              `${maiuscula(t.usufruto)}.`,
              'Não é sorte e não foi rápido. É a conta de ter feito direito por vários meses.',
            )
          : faltando(`o resultado que você colhe hoje por cuidar ${contrair('de', t.alavanca.toLowerCase())}`),
      (t) =>
        t.usufruto
          ? paragrafos(
              `${maiuscula(t.usufruto)}.`,
              'Falo disso porque é fácil achar que esse tipo de disciplina não paga. Paga.',
            )
          : faltando('onde esse cuidado te levou, em termos concretos'),
      (t) =>
        t.usufruto
          ? paragrafos(
              'Vou mostrar a parte boa, que eu também não mostro muito.',
              `${maiuscula(t.usufruto)}.`,
            )
          : faltando('o benefício concreto que você aproveita por fazer isso certo'),
    ],
  },

  {
    id: 'prova_social',
    rotulo: 'Prova social: outra pessoa no mesmo problema',
    intencao:
      'Mostra outra pessoa vivendo o MESMO problema. Diferente do depoimento: aqui não há resultado, há companhia.',
    direcaoVisual: 'Print de conversa, enquete com o resultado à mostra, ou a pessoa da equipe falando.',
    aei: 'entretenimento',
    dispositivo: 'conversa_sem_privacidade',
    variantes: [
      (t) =>
        t.provaSocial
          ? paragrafos(`Olha ${semArtigo(t.provaSocial)}.`, 'Não é só você passando por isso. Nem perto.')
          : faltando(`print ou conversa de alguém com o mesmo problema de ${t.alavanca.toLowerCase()}`),
      (t) =>
        paragrafos(
          'Abri uma enquete sobre isso semana passada.',
          `A maioria respondeu "${t.opcoesDeEnquete[0]}".`,
          'Então vamos falar disso, porque é o problema de quase todo mundo.',
        ),
      (t) =>
        t.provaSocial
          ? paragrafos('Essa conversa aqui eu tive ontem:', `${maiuscula(t.provaSocial)}.`)
          : faltando('uma conversa real sobre esse assunto'),
    ],
  },

  /* ======================================================= entretenimento = */
  {
    id: 'rotina',
    rotulo: 'Rotina: quebra-gelo',
    /*
     * O movimento que não existia, e cuja ausência era metade do problema.
     *
     * O gerador produzia sequências tecnicamente corretas e inteiramente
     * secas. Quem assiste precisa respirar entre dois conteúdos densos — e é
     * nesse respiro que decide se se identifica com você ou não. Coisa
     * pequena, ordinária, sem lição nenhuma: o café, a jaqueta, o trânsito, a
     * caixa que chegou. Não é palhaçada: é mostrar que ali tem gente.
     */
    intencao:
      'Uma cena pequena e ordinária do seu dia, sem lição nenhuma. É o respiro — e é onde a pessoa decide se gosta de você.',
    direcaoVisual: 'Celular na mão, sem enquadramento pensado. O que estiver à sua frente agora.',
    aei: 'entretenimento',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.rotina
          ? paragrafos('Pausa no conteúdo.', `${maiuscula(t.rotina)}.`)
          : faltando('uma cena boba do seu dia de hoje — café, trânsito, a caixa que chegou'),
      (t) =>
        t.rotina
          ? paragrafos(`${maiuscula(t.rotina)}.`, 'Voltamos à programação já.')
          : faltando('a cena pequena do dia que serve de respiro'),
      (t) =>
        t.rotina
          ? paragrafos(
              'Deixa eu te mostrar uma coisa que não tem nada a ver com nada.',
              `${maiuscula(t.rotina)}.`,
            )
          : faltando('algo do seu dia sem relação com o conteúdo'),
    ],
  },

  {
    id: 'piada_interna',
    rotulo: 'Piada interna',
    /*
     * Repetição cria pertencimento.
     *
     * A piada que volta toda semana divide a audiência em duas: quem entende e
     * quem não entende. Quem entende se sente de dentro, e é por isso que ela
     * funciona — não pela graça.
     */
    intencao:
      'Repete de propósito a mesma brincadeira. Quem entende se sente de dentro — é disso que ela vive, não da graça.',
    direcaoVisual: 'O mesmo enquadramento de sempre, o mesmo gesto. A repetição é o ponto.',
    aei: 'entretenimento',
    dispositivo: 'manda_um_emoji',
    variantes: [
      (t) =>
        t.ancora
          ? paragrafos(
              `${maiuscula(t.ancora.frase)}`,
              `Quem acompanha já sabe o que vem agora. ${maiuscula(t.ancora.gesto)}.`,
            )
          : faltando('a brincadeira que você repete toda semana aqui'),
      (t) =>
        t.ancora
          ? paragrafos(`De novo, sim. ${maiuscula(t.ancora.gesto)}.`, `${maiuscula(t.ancora.frase)}`)
          : faltando('o bordão ou gesto que já é seu'),
    ],
  },

  {
    id: 'caixinha_pessoal',
    rotulo: 'Caixinha pessoal',
    intencao:
      'Abre uma caixinha só de pergunta pessoal, nada de trabalho. Humaniza sem expor o que você não quer expor.',
    direcaoVisual: 'Selfie, sem cenário montado. Caixinha na tela com a regra escrita.',
    aei: 'entretenimento',
    dispositivo: 'caixinha_pessoal',
    variantes: [
      () =>
        paragrafos(
          'Hoje a caixinha é diferente: pode perguntar qualquer coisa, menos trabalho.',
          'Quero que vocês me conheçam fora do e-commerce.',
          '📩 Pergunta aí que eu respondo as mais aleatórias.',
        ),
      () =>
        paragrafos(
          'Vou abrir uma caixinha pessoal.',
          'Nada de margem, nada de estoque. O que você quer saber de mim?',
          '📩 Manda que eu respondo em vídeo.',
        ),
    ],
  },

  /* =========================================== informação (método B.D.A.) = */
  {
    id: 'basico',
    rotulo: 'B.D.A. — o básico',
    /*
     * Primeiro tempo do método: levanta um tema BÁSICO da área.
     *
     * Básico não é raso: é o que todo mundo deveria saber e quase ninguém
     * resolveu. É a dúvida que aparece no direct toda semana.
     */
    intencao:
      'Levanta uma questão básica da área — a que aparece toda semana. Básico não é raso: é o que ninguém resolveu ainda.',
    direcaoVisual: 'Você falando com a câmera. A pergunta escrita na tela, em texto grande.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        paragrafos(
          `Vamos do básico, porque o básico é onde o dinheiro vaza: ${semArtigo(t.alavanca.toLowerCase())}.`,
          t.pergunta,
        ),
      (t) =>
        paragrafos(
          'Essa é a dúvida mais comum que eu recebo, e ela é básica de propósito:',
          t.pergunta,
          'Se você não sabe responder, não tem problema. Quase ninguém sabe.',
        ),
    ],
  },

  {
    id: 'didatico',
    rotulo: 'B.D.A. — o exemplo',
    /*
     * Segundo tempo: aborda de forma DIDÁTICA, com exemplo real.
     *
     * Didático não é simplificado — é um caso concreto em vez de um conceito.
     * "Um cliente meu não conseguia perder peso e descobrimos que o problema
     * era a rotina" ensina mais do que a definição de aderência.
     */
    intencao:
      'Explica com um caso concreto, não com conceito. Um exemplo real ensina mais rápido que qualquer definição.',
    direcaoVisual: 'A tela ou a peça do caso que você está contando. O exemplo tem de estar à vista.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        paragrafos(
          'Vou explicar com um caso de verdade, porque conceito ninguém guarda.',
          `${maiuscula(t.oQueMostrar)}.`,
          `O que a gente olhou foi ${t.dadoQueProva}. E foi aí que o problema apareceu.`,
        ),
      (t) =>
        paragrafos(
          'Deixa eu te dar um exemplo que eu vi acontecer.',
          `${maiuscula(t.oQueMostrar)}.`,
          `Ninguém tinha olhado ${t.dadoQueProva}. Estava tudo lá.`,
        ),
    ],
  },

  {
    id: 'aplicavel',
    rotulo: 'B.D.A. — a solução aplicável',
    intencao:
      'Fecha com algo que a pessoa aplica HOJE, em pouco tempo. Pequena dose, pequena vitória — é a amostra grátis.',
    direcaoVisual: 'Checklist na tela, legível no celular, três ou quatro linhas no máximo.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        paragrafos(
          'Agora a parte que você faz hoje, em dez minutos:',
          t.acaoUtil.slice(0, 3),
          'Pequena, mas é uma vitória de verdade. E vitória pequena é o que faz continuar.',
        ),
      (t) =>
        paragrafos(
          'Não vou te mandar estudar. Vou te dar a tarefa:',
          t.acaoUtil.slice(0, 3),
          'Faz hoje e me conta no que deu.',
        ),
    ],
  },

  {
    id: 'reciprocidade',
    rotulo: 'Entregar uma ação útil',
    intencao:
      'Dá uma tarefa que a pessoa consegue fazer hoje, sozinha, de graça. É o que faz salvar o story.',
    direcaoVisual: 'Selfie ou tela com um checklist curto, legível no celular.',
    aei: 'informacao',
    dispositivo: 'nenhum',
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

  {
    id: 'passo',
    rotulo: 'Passo do tutorial',
    intencao:
      'Um passo por story. Quem faz junto precisa parar, executar e voltar — e isso segura a sequência.',
    direcaoVisual: 'Tela ou mão executando o passo, com o número grande no canto.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    porOcorrencia: true,
    variantes: [
      (t) => paragrafos('Passo 1', t.acaoUtil[0] ?? faltando('o primeiro passo')),
      (t) => paragrafos('Passo 2', t.acaoUtil[1] ?? faltando('o segundo passo')),
      (t) => paragrafos('Passo 3', t.acaoUtil[2] ?? faltando('o terceiro passo')),
      (t) => paragrafos('Passo 4', t.acaoUtil[3] ?? faltando('o quarto passo')),
    ],
  },

  {
    id: 'item',
    rotulo: 'Item da lista',
    intencao:
      'Um item por story, numerado. Lista é o formato mais fácil de acompanhar e o mais fácil de salvar.',
    direcaoVisual: 'Número grande na tela e uma imagem que ilustre só aquele item.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    porOcorrencia: true,
    variantes: [
      (t) => paragrafos('1️⃣', t.acaoUtil[0] ?? faltando('o primeiro item')),
      (t) => paragrafos('2️⃣', t.acaoUtil[1] ?? faltando('o segundo item')),
      (t) => paragrafos('3️⃣', t.acaoUtil[2] ?? faltando('o terceiro item')),
      (t) => paragrafos('4️⃣', t.acaoUtil[3] ?? faltando('o quarto item')),
    ],
  },

  /* ============================================================= memória = */
  {
    id: 'ancora',
    rotulo: 'Âncora na rotina de quem assiste',
    /*
     * O movimento de memória, e o de efeito mais longo.
     *
     * Você pega um gesto que a pessoa já faz todo dia e cola significado nele.
     * Depois disso, ela não precisa lembrar de você: o gesto lembra por ela.
     * É o mais lento de construir — exige repetir a mesma frase por semanas —
     * e o único que continua rendendo quando você para de postar.
     */
    intencao:
      'Cola um significado seu num gesto que a pessoa já faz todo dia. Depois disso, o gesto lembra de você por ela.',
    direcaoVisual: 'O gesto em cena, simples e reconhecível. A frase escrita na tela, sempre igual.',
    aei: 'entretenimento',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        t.ancora
          ? paragrafos(
              `${maiuscula(t.ancora.gesto)}.`,
              `Quando você fizer isso amanhã, eu quero que passe na sua cabeça: "${t.ancora.frase}"`,
              'É pequeno. E é o que separa quem decide de quem reage.',
            )
          : faltando('um gesto que seu seguidor já faz todo dia e uma frase curta pra colar nele'),
      (t) =>
        t.ancora
          ? paragrafos(
              `Toda vez que eu ${t.ancora.gesto}, eu penso a mesma coisa:`,
              `"${maiuscula(t.ancora.frase)}"`,
              'Rouba de mim. Usa amanhã.',
            )
          : faltando('o gesto e a frase que você quer ancorar'),
    ],
  },

  {
    id: 'resumo',
    rotulo: 'Resumo da sequência',
    intencao:
      'Reúne a sequência em uma tela, para quem entrou no meio e para quem quer salvar. Salvamento é o sinal que mais conta.',
    direcaoVisual: 'Tela cheia, fundo liso, os pontos numerados em texto grande. Sem vídeo.',
    aei: 'informacao',
    dispositivo: 'resumo_da_sequencia',
    variantes: [
      (t) =>
        paragrafos(
          `${maiuscula(t.titulo)} — em três linhas:`,
          t.acaoUtil.slice(0, 3).map((linha, i) => `${i + 1}. ${linha}`),
          'Salva esse. Você vai precisar na hora de decidir.',
        ),
      (t) =>
        paragrafos(
          'Resumo pra quem chegou agora:',
          t.acaoUtil.slice(0, 3).map((linha, i) => `${i + 1}. ${linha}`),
          `E o número que decide tudo isso: ${t.dadoQueProva}.`,
        ),
    ],
  },

  /* =============================================================== fechos = */
  {
    id: 'urgencia',
    rotulo: 'Urgência pelo prazo real',
    intencao:
      'Usa um prazo que existe de verdade — reposição, calendário, estoque. Urgência inventada queima a confiança.',
    direcaoVisual: 'A etapa seguinte do processo: o que acontece depois do que você mostrou.',
    aei: 'informacao',
    dispositivo: 'nenhum',
    variantes: [
      (t) =>
        paragrafos(
          `Agora pense no seu prazo: ${t.prazoReal}.`,
          'Se isso te pegar no meio da campanha, quando você resolve?',
          'Essa resposta precisa entrar no planejamento de agora.',
        ),
      (t) => paragrafos(`Esse prazo não negocia: ${t.prazoReal}.`, 'Ele não espera você estar pronto.'),
      (t) =>
        paragrafos(
          'Faz a conta do seu tempo antes de decidir.',
          `${maiuscula(t.prazoReal)}.`,
          'Dá pra encaixar? Se não dá, a decisão é outra.',
        ),
    ],
  },

  {
    id: 'compromisso',
    rotulo: 'Abertura de conversa',
    intencao:
      'Pede uma resposta específica, com opções. Pergunta aberta demais não é respondida — e pergunta de sim ou não não gera conversa.',
    direcaoVisual: 'Você olhando para a câmera, com caixinha de perguntas.',
    aei: 'entretenimento',
    dispositivo: 'caixinha_aberta',
    variantes: [
      (t) =>
        paragrafos(
          `Pensando na sua operação: ${t.perguntaFinal}`,
          t.opcoesFinais.map((o) => `· ${o}`),
          '📩 Me conte aqui o que está travando — eu leio tudo.',
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
          'Responde aí na caixinha — as melhores eu respondo em story amanhã.',
        ),
      (t) =>
        paragrafos(
          `${maiuscula(t.perguntaFinal)}`,
          'Me conta COMO você faz hoje, não se você faz. É a resposta que me interessa.',
        ),
    ],
  },

  {
    id: 'levante_a_mao',
    rotulo: 'Levante a mão',
    /*
     * O fecho que separa quem quer de quem só assiste.
     *
     * Diferente do compromisso: ali você quer conversa, aqui você quer lista. A
     * palavra exata é o que permite filtrar depois — "me manda EU QUERO" é
     * filtrável; "me manda uma mensagem" não é.
     */
    intencao:
      'Pede uma palavra exata no direct para separar quem quer de quem só assiste. É triagem, não engajamento.',
    direcaoVisual: 'Tela cheia com a palavra escrita, grande. Nada mais.',
    aei: 'informacao',
    dispositivo: 'levante_a_mao',
    variantes: [
      (t) =>
        paragrafos(
          `Quem quer a planilha de ${semArtigo(t.alavanca.toLowerCase())} que eu uso, me manda EU QUERO aqui no direct.`,
          'Mando hoje mesmo, sem cadastro e sem link.',
        ),
      (t) =>
        paragrafos(
          `Se você vai fazer essa conta hoje, me manda VOU FAZER.`,
          'Eu te cobro amanhã. Sério.',
          `${maiuscula(t.perguntaFinal)}`,
        ),
    ],
  },

  {
    id: 'gancho',
    rotulo: 'Gancho para o próximo',
    intencao:
      'Fecha sem fechar. Em vez de pedir resposta, promete a continuação — e traz a pessoa de volta amanhã.',
    direcaoVisual: 'Plano rápido do que vem a seguir, ainda inacabado.',
    aei: 'entretenimento',
    dispositivo: 'volta_mais_tarde',
    variantes: [
      () => paragrafos('Amanhã eu mostro no que isso deu.', 'Guarda esse story pra comparar.'),
      (t) => paragrafos(`Falta a parte que interessa: ${t.pergunta}`, 'Vem no próximo.'),
      () =>
        paragrafos(
          'Não vou te dar a resposta agora.',
          'Vou te dar hoje às 18h, com o número fechado na mão.',
        ),
      (t) =>
        paragrafos(
          `${maiuscula(t.prazoReal)}.`,
          'Quando esse prazo virar, eu volto aqui com o resultado. Ativa a notificação que eu não aviso duas vezes.',
        ),
    ],
  },
]

export const GATILHOS: Record<GatilhoId, Gatilho> = Object.fromEntries(
  DEFINICOES.map((d) => [
    d.id,
    { ...d, pedeInteracao: d.dispositivo !== 'nenhum' },
  ]),
) as Record<GatilhoId, Gatilho>

/** Na ordem de definição, para o seletor do editor. */
export const GATILHOS_EM_ORDEM = DEFINICOES.map((d) => GATILHOS[d.id])

/* ============================================================== arcos ==== */

export interface Arco {
  id: string
  rotulo: string
  /** Para que serve — ajuda a escolher sem ler os seis stories. */
  quandoUsar: string
  /** O jeito de falar. Diferencia arcos do mesmo tamanho no seletor. */
  tom: string
  passos: GatilhoId[]
  /**
   * A sequência é gravada em MOMENTOS diferentes do dia, não de uma vez.
   *
   * Muda o que o gerador escreve: o story do meio da tarde pode retomar o da
   * manhã, e o fecho da noite pode cobrar quem voltou. Sequência inteira
   * gravada de uma vez não tem como fazer isso, e é por isso que ela soa como
   * um bloco só.
   */
  aoLongoDoDia?: boolean
  /**
   * História de quatro tempos: cenário normal, quebra, superação, aprendizado.
   *
   * A tela marca estes de propósito. São os arcos que geram memória em vez de
   * só entregar informação, e são os que mais dão trabalho de gravar — a
   * pessoa precisa saber no que está se metendo antes de escolher.
   */
  narrativo?: boolean
}

/**
 * Os arcos.
 *
 * ----------------------------------------------------------------------------
 * O que mudou, e por quê
 * ----------------------------------------------------------------------------
 * Antes havia dezesseis arcos e eles eram, estruturalmente, o mesmo arco:
 * onze dos dezesseis terminavam em `compromisso` e dez começavam em
 * `abertura`. Então a primeira e a última frase de quase toda sequência do app
 * eram as mesmas — e é isso que se sente como "padronizado", mesmo quando o
 * assunto do meio muda.
 *
 * Agora são doze aberturas diferentes (promessa, reflexão, crença, dado,
 * cenário normal, print do direct, pergunta da caixinha, bastidor, tempo real,
 * rotina, depoimento, básico) e seis fechos (conversa, gancho, resumo
 * salvável, levantar a mão, âncora, tarefa entregue sem pedir nada).
 *
 * E, o que é mais importante: existe arco NARRATIVO. Nenhum dos dezesseis
 * anteriores contava uma história — todos explicavam. História tem quatro
 * tempos e eles não são negociáveis: como era, o que rompeu, o que você fez,
 * o que ficou. Pular o primeiro tempo é o erro mais comum, porque é o mais
 * chato de gravar; sem ele, a quebra não quebra nada.
 *
 * Também existe arco que não ensina nada (`respiro`) e arco que só conversa
 * (`caixinha_do_dia`). Perfil que só entrega conteúdo técnico cansa, e o
 * respiro é justamente onde quem assiste decide se gosta de você.
 */
export const ARCOS: Arco[] = [
  /* ------------------------------------------------------- narrativos ---- */
  {
    id: 'historia_completa',
    rotulo: 'História completa',
    tom: 'Narrativo, quatro tempos, fecha em princípio',
    quandoUsar:
      'Quando existe uma história de verdade: como era, o que deu errado, o que você fez e o que ficou. É o arco que mais gera memória e o mais pesado de gravar.',
    passos: ['cena_normal', 'quebra', 'virada', 'autoridade', 'licao', 'compromisso'],
    narrativo: true,
  },
  {
    id: 'erro_que_custou',
    rotulo: 'O erro que custou',
    tom: 'Confissão, com a conta na mesa',
    quandoUsar:
      'Quando o erro é seu e você sabe quanto custou. Compra confiança como nenhum outro formato — e só funciona com o número.',
    passos: ['cena_normal', 'vulnerabilidade', 'virada', 'numero', 'licao', 'compromisso'],
    narrativo: true,
  },
  {
    id: 'historia_do_dia',
    aoLongoDoDia: true,
    rotulo: 'História ao longo do dia',
    tom: 'Acompanhando em tempo real, três momentos',
    quandoUsar:
      'Para gravar em três momentos do dia: de manhã o normal, no meio o problema, à tarde a virada. A audiência volta para saber no que deu.',
    passos: ['cena_normal', 'quebra', 'identificacao', 'virada', 'licao', 'ancora'],
    narrativo: true,
  },

  /* --------------------------------------------------------- reflexão ---- */
  {
    id: 'reflexao_dura',
    rotulo: 'Reflexão dura',
    tom: 'Confronta de cara e entrega a saída',
    quandoUsar:
      'Quando você consegue mostrar que a pessoa faz errado desde sempre — e tem o jeito certo na mão. Abre a caixa e fecha no mesmo story.',
    passos: ['reflexao', 'identificacao', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'nao_e_so_voce',
    rotulo: 'Não é só você',
    tom: 'Confronta e logo acolhe',
    quandoUsar:
      'A sequência mais difícil de ignorar: mostra que a pessoa faz errado e, no story seguinte, que ela não está sozinha nisso. Confronto sem companhia só gera defesa.',
    passos: ['reflexao', 'prova_social', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'reflexao_curta',
    rotulo: 'Reflexão em três stories',
    tom: 'Três telas, sem rodeio',
    quandoUsar:
      'Dia corrido. Quebra o automático, entrega a tarefa e separa quem vai fazer. Três stories, dez minutos de gravação.',
    passos: ['reflexao', 'aplicavel', 'levante_a_mao'],
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
    id: 'contraste_curto',
    rotulo: 'Contraste curto',
    tom: 'Dois lados, sem meio-termo',
    quandoUsar:
      'Para corrigir uma crença comum do mercado. Funciona bem com assunto de preço e margem.',
    passos: ['abertura', 'contraste', 'autoridade', 'reciprocidade', 'compromisso'],
  },

  /* ------------------------------------------------- método B.D.A. ------- */
  {
    id: 'bda',
    rotulo: 'B.D.A. — básico, didático, aplicável',
    tom: 'Aula curta, três movimentos',
    quandoUsar:
      'O formato mais confiável para ensinar: levanta a questão básica, explica com um caso real e fecha com o que fazer hoje.',
    passos: ['basico', 'didatico', 'aplicavel', 'compromisso'],
  },
  {
    id: 'bda_com_prova',
    rotulo: 'B.D.A. com prova',
    tom: 'Aula curta com depoimento no meio',
    quandoUsar:
      'O mesmo B.D.A., com o resultado de outra pessoa entre a explicação e a tarefa. Converte mais e precisa de um print na mão.',
    passos: ['basico', 'didatico', 'depoimento', 'aplicavel', 'levante_a_mao'],
  },

  /* ------------------------------------------- tríade A.E.I equilibrada -- */
  {
    id: 'dia_completo',
    aoLongoDoDia: true,
    rotulo: 'Dia completo (A.E.I.)',
    tom: 'Sequência de dia inteiro, equilibrada',
    quandoUsar:
      'A sequência mais parecida com um dia bem feito: autoridade, entretenimento e informação na mesma fita. Use quando for o único conteúdo do dia.',
    passos: ['abertura', 'rotina', 'autoridade', 'reciprocidade', 'depoimento', 'compromisso'],
  },
  {
    id: 'triade_curta',
    rotulo: 'Tríade em quatro stories',
    tom: 'Uma de cada ponta, mais o fecho',
    quandoUsar:
      'Quando o dia é curto e você não quer deixar nenhuma ponta de fora. Uma reflexão, um respiro, um resultado seu e a conversa.',
    passos: ['reflexao', 'rotina', 'usufruto', 'compromisso'],
  },

  /* ---------------------------------------------------------- conversa --- */
  {
    id: 'conversa',
    rotulo: 'Conversa com a audiência',
    tom: 'Informal, começa na mensagem de alguém',
    quandoUsar:
      'Quando o objetivo é resposta no direct, não alcance. Abre mostrando que você responde — é isso que faz o próximo mandar.',
    passos: ['print_direct', 'identificacao', 'autoridade', 'reciprocidade', 'compromisso'],
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
    id: 'caixinha_do_dia',
    rotulo: 'Dia de conversa',
    tom: 'Nenhum conteúdo técnico, só conexão',
    quandoUsar:
      'Para o dia em que você não vai ensinar nada. Humaniza, abre o direct e enche a caixinha de assunto para a semana.',
    passos: ['rotina', 'caixinha_pessoal', 'print_direct', 'compromisso'],
  },

  /* -------------------------------------------------------- autoridade --- */
  {
    id: 'autoridade_pratica',
    rotulo: 'Autoridade prática',
    tom: 'Explicativo, com um dado no meio',
    quandoUsar:
      'Quando existe uma decisão real e um número para mostrar. É o arco mais completo, e o mais pesado de gravar.',
    passos: [
      'abertura',
      'curiosidade',
      'identificacao',
      'autoridade',
      'reciprocidade',
      'urgencia',
      'compromisso',
    ],
  },
  {
    id: 'prova_primeiro',
    rotulo: 'Começando pelo outro',
    tom: 'O holofote em quem não é você',
    quandoUsar:
      'Quando você tem um print, um depoimento ou um resultado de aluno. Tira o peso do "eu" na abertura.',
    passos: ['depoimento', 'identificacao', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'colher_o_resultado',
    rotulo: 'Colhendo o resultado',
    tom: 'Mostrando onde a disciplina levou',
    quandoUsar:
      'O caminho de autoridade que quase ninguém usa: não é você trabalhando, é o que o trabalho te deu. Use quando houver resultado seu para mostrar.',
    passos: ['bastidor', 'autoridade', 'usufruto', 'licao', 'gancho'],
  },

  /* ------------------------------------------------------------- ensino -- */
  {
    id: 'ensino_rapido',
    rotulo: 'Ensino rápido',
    tom: 'Direto ao ponto',
    quandoUsar:
      'Dia corrido. Quatro stories, uma ideia só, com a tarefa no meio para garantir o salvamento.',
    passos: ['abertura', 'identificacao', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'tutorial',
    rotulo: 'Tutorial em passos',
    tom: 'Passo a passo, fecha em tela salvável',
    quandoUsar:
      'Quando dá para a pessoa fazer junto, agora. Fecha no resumo em vez de pedir resposta — é o formato que mais gera salvamento.',
    passos: ['abertura', 'passo', 'passo', 'passo', 'resumo'],
  },
  {
    id: 'lista',
    rotulo: 'Lista numerada',
    tom: 'Enumerado, fácil de acompanhar',
    quandoUsar:
      'Para assunto com três pontos independentes. Quem chega no meio não se perde, e o resumo final é o que ela salva.',
    passos: ['abertura', 'item', 'item', 'item', 'resumo'],
  },
  {
    id: 'oficina',
    rotulo: 'Oficina em quatro passos',
    tom: 'Aula inteira, do começo ao fim',
    quandoUsar:
      'Assunto que só se resolve fazendo os quatro passos. Abre numa pergunta real e fecha separando quem vai executar.',
    passos: ['pergunta_da_caixinha', 'passo', 'passo', 'passo', 'passo', 'levante_a_mao'],
  },
  {
    id: 'lista_longa',
    rotulo: 'Lista de quatro',
    tom: 'Enumerado, começa pelo dado cru',
    quandoUsar:
      'Para assunto com quatro pontos independentes. Abre com o dado tampado na tela, sem nenhuma introdução.',
    passos: ['numero', 'item', 'item', 'item', 'item', 'resumo'],
  },

  /* ---------------------------------------------------------- pelo dado -- */
  {
    id: 'numero_cru',
    rotulo: 'Dado cru',
    tom: 'Seco, começa pelo dado tampado',
    quandoUsar:
      'Quando o dado sozinho já choca. Abre sem introdução, destampa no meio e fecha com gancho, sem pedir nada.',
    passos: ['numero', 'curiosidade', 'autoridade', 'gancho'],
  },
  {
    id: 'entrega_seca',
    rotulo: 'Entrega seca',
    tom: 'Sem pedido nenhum, termina na tarefa',
    quandoUsar:
      'Quando você só quer ser útil naquele dia. Abre no dado, fecha na tarefa — e não pede nada em troca.',
    passos: ['numero', 'identificacao', 'autoridade', 'reciprocidade'],
  },

  /* ------------------------------------------------- presença e respiro -- */
  {
    id: 'diario',
    aoLongoDoDia: true,
    rotulo: 'Diário do dia',
    tom: 'Ao vivo, sem corte, sem pedido',
    quandoUsar:
      'Dia de operação pesada. Não vende nada — constrói presença. Termina em gancho, não em pedido.',
    passos: ['tempo_real', 'tempo_real', 'vulnerabilidade', 'autoridade', 'gancho'],
  },
  {
    id: 'bastidor_puro',
    rotulo: 'Bastidor puro',
    tom: 'Observação, sem ensinar nada',
    quandoUsar:
      'Para lembrar que você opera de verdade. Nenhuma tarefa, nenhuma aula — só presença e um detalhe escondido na cena.',
    passos: ['bastidor', 'tempo_real', 'curiosidade', 'gancho'],
  },
  {
    id: 'respiro',
    rotulo: 'Respiro',
    tom: 'Leve, três stories, nada de trabalho',
    quandoUsar:
      'O dia em que você não ensina nada. Existe porque perfil só técnico cansa — e é no respiro que a pessoa decide se gosta de você.',
    passos: ['rotina', 'piada_interna', 'ancora'],
  },

  /* ----------------------------------------------------------- memória --- */
  {
    id: 'ancoragem',
    rotulo: 'Ancoragem',
    tom: 'Termina colando a ideia num gesto do dia',
    quandoUsar:
      'O arco de efeito mais longo: cola a sua ideia num gesto que a pessoa já faz todo dia. Precisa da mesma frase repetida por semanas para funcionar.',
    passos: ['reflexao', 'didatico', 'ancora', 'compromisso'],
  },
]

export const ARCOS_POR_ID = new Map(ARCOS.map((arco) => [arco.id, arco]))

/**
 * Como a tríade ficou neste conjunto de stories.
 *
 * Serve para o gerador avisar o que faltou. O diagnóstico é o mesmo que se usa
 * num perfil inteiro, aplicado a uma sequência: sem autoridade, a pessoa
 * engaja e não compra; sem entretenimento, ela não cria vínculo e vai embora;
 * sem informação, ela não sente que ganha algo em acompanhar.
 */
export function contarAEI(passos: GatilhoId[]): Record<AEI, number> {
  const conta: Record<AEI, number> = { autoridade: 0, entretenimento: 0, informacao: 0 }
  for (const passo of passos) conta[GATILHOS[passo].aei] += 1
  return conta
}
