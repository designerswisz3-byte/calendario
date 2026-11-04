/**
 * O banco de temas: sobre o que falar.
 *
 * Cada tema é um assunto que o Raphael pode sustentar com operação real —
 * margem, estoque, canal, prazo, equipe, erro próprio. Não existe tema de
 * "motivação": a régua da casa é que todo conteúdo ensine algo aplicável, e
 * motivação genérica não passa nessa régua.
 *
 * Os campos não são decorativos. Cada um alimenta um gatilho específico em
 * gerador.ts, e é por isso que eles são tão concretos: um tema com `pergunta`
 * vaga produz um story 2 vago, e aí a sequência inteira desanda. Quando um
 * campo opcional falta, o gerador escreve `[preencha: ...]` em vez de encher
 * linguiça — texto vago parece pronto e não é, e isso custa uma gravação.
 */

export type Eixo = 'autoridade' | 'humanidade' | 'ensino' | 'conexao' | 'contexto'

export const ROTULO_DE_EIXO: Record<Eixo, string> = {
  autoridade: 'Autoridade',
  humanidade: 'Humanidade e história',
  ensino: 'Ensino prático',
  conexao: 'Conexão e conversa',
  contexto: 'Contexto: quem você é',
}

/**
 * O que cada eixo responde. Aparece na tela, acima das sugestões do dia.
 *
 * `contexto` é o eixo que faltava — e a falta dele era o motivo de as
 * sequências "não conectarem em nada". Os outros quatro eixos falam de
 * OPERAÇÃO: margem, grade, canal, prazo. Nenhum respondia as perguntas que
 * quem chega num perfil quer saber antes de qualquer conteúdo técnico: quem é
 * essa pessoa, em que momento da vida ela está, qual é o objetivo grande dela,
 * que dificuldade ela está tentando superar agora e de onde ela veio.
 *
 * Sem essas respostas, o perfil é um manual com foto. Manual não gera
 * acompanhamento: gera consulta, e consulta a pessoa faz no Google.
 */
export const O_QUE_O_EIXO_RESPONDE: Record<Eixo, string> = {
  autoridade: 'Por que acreditar em você neste assunto.',
  humanidade: 'O que te aconteceu que te ensinou isso.',
  ensino: 'O que a pessoa consegue fazer hoje, sozinha.',
  conexao: 'Por que vale conversar com você.',
  contexto: 'Quem você é, de onde veio e o que está tentando resolver agora.',
}

export interface Tema {
  id: string
  titulo: string
  eixo: Eixo
  /** A alavanca de operação que o tema toca. Aparece como etiqueta. */
  alavanca: string
  /** A frase do story 1. É a parte mais importante da sequência. */
  promessa: string
  /** A pergunta que a sequência responde. Alimenta o gatilho de curiosidade. */
  pergunta: string
  /** O que filmar: um objeto, um lugar, uma tela. Precisa existir de verdade. */
  oQueMostrar: string
  /** O número que sustenta a autoridade. */
  dadoQueProva: string
  /** A tarefa que a pessoa faz hoje, sozinha. 2 a 4 linhas. */
  acaoUtil: string[]
  /** O prazo que existe de verdade, para a urgência não ser inventada. */
  prazoReal: string
  /** Os dois cenários ruins da enquete. */
  opcoesDeEnquete: [string, string]
  perguntaFinal: string
  opcoesFinais: string[]
  arcosSugeridos: string[]
  /** Erro próprio, com custo. Alimenta o movimento de vulnerabilidade. */
  erro?: string

  /**
   * A reflexão: o que a pessoa faz no automático, e por que está errado.
   *
   * É o campo mais importante do tema, e o que não existia. Sem ele o gerador
   * só sabia CONSTATAR — "margem real desconta comissão" — e constatação não
   * muda ninguém: a pessoa ouve, concorda e segue fazendo igual.
   *
   * As três partes são obrigatórias juntas, e a terceira mais que as outras:
   * quem abre a caixa fecha a caixa. Mostrar para alguém que ela errou a vida
   * inteira e não dar a saída é deixar a pessoa pior do que ela chegou.
   */
  reflexao?: {
    /** O que ela faz hoje, sem pensar. Em segunda pessoa, do jeito que ela faz. */
    noAutomatico: string
    /** O que esse automático esconde. É aqui que dói. */
    oQueNinguemVe: string
    /** O jeito que funciona. Curto e executável. */
    oJeitoCerto: string
  }

  /**
   * A história em quatro tempos: como era, o que rompeu, o que você fez, o que ficou.
   *
   * Habilita os arcos narrativos. O primeiro tempo é o que todo mundo pula
   * porque é o mais chato de gravar — e é o que faz os outros três
   * funcionarem: sem cenário normal, a quebra não quebra nada.
   */
  historia?: {
    cenaNormal: string
    quebra: string
    virada: string
    licao: string
  }

  /**
   * Uma cena pequena e ordinária do dia, sem lição nenhuma.
   *
   * Alimenta o entretenimento — a ponta da tríade que não existia no gerador.
   * É o respiro entre dois conteúdos densos, e é nele que quem assiste decide
   * se se identifica com você. Não é palhaçada: é mostrar que ali tem gente.
   */
  rotina?: string

  /**
   * O resultado que você COLHE por fazer isso certo.
   *
   * Terceiro caminho da autoridade, e o mais esquecido. Viver o que prega é
   * passar pela ponte que você construiu; colher o resultado é mostrar onde a
   * ponte te levou. Quem só mostra depoimento de aluno soa como quem vende o
   * mapa e nunca foi.
   */
  usufruto?: string

  /**
   * O gesto cotidiano onde a ideia se ancora, e a frase que cola nele.
   *
   * O movimento de efeito mais longo que existe: depois de ancorado, a pessoa
   * não precisa lembrar de você — o gesto lembra por ela. Exige repetir a mesma
   * frase por semanas, sem mudar uma palavra.
   */
  ancora?: { gesto: string; frase: string }
  provaSocial?: string
  contraste?: { comum: string; queFunciona: string }
  /**
   * Palavras que ligam o tema ao que está acontecendo — datas do calendário e
   * notícias da semana. É o que faz a sugestão do dia ser contextual em vez de
   * sorteada.
   */
  contexto?: string[]
}

export const TEMAS: Tema[] = [
  /* ------------------------------------------------------- estoque e compra -- */
  {
    id: 'escolha-produtos-campanha',
    titulo: 'Como eu escolho quais produtos entram na campanha',
    eixo: 'autoridade',
    alavanca: 'Estoque e curva ABC',
    promessa: 'Escolher o produto errado para a campanha custa mais caro que não fazer campanha.',
    pergunta: 'Quais produtos merecem receber nosso investimento nesta campanha?',
    oQueMostrar: 'a arara com as peças candidatas da campanha',
    dadoQueProva: 'quanto a peça vende por semana, quais tamanhos saem e o prazo de reposição dela',
    acaoUtil: [
      'Pegue seu principal produto e abra o estoque por tamanho e cor.',
      'Veja se as variações que mais vendem também são as que têm estoque suficiente.',
      'O total de peças pode parecer bom e esconder a falta justamente do que a cliente procura.',
    ],
    prazoReal: 'o tempo que leva entre o corte e a peça ficar disponível para venda',
    opcoesDeEnquete: ['Faltar o produto campeão', 'Sobrar estoque sem vender'],
    perguntaFinal: 'Qual decisão sobre estoque você ainda precisa resolver para a campanha?',
    opcoesFinais: ['Escolher os produtos', 'Definir as quantidades', 'Organizar a reposição'],
    reflexao: {
      noAutomatico: 'escolhe para a campanha a peça que você mais gosta, ou a que vendeu bem na campanha passada',
      oQueNinguemVe:
        'campanha não cria venda, ela antecipa venda. Botar a peça campeã em promoção é dar desconto em quem ia comprar sem desconto nenhum',
      oJeitoCerto:
        'entra na campanha a peça com giro bom e estoque sobrando, não a campeã: a campeã você usa para atrair, com estoque garantido e sem desconto',
    },
    historia: {
      cenaNormal:
        'toda campanha a gente escolhia os produtos pela foto bonita e pelo que o time gostava',
      quebra:
        'numa campanha a peça campeã esgotou no segundo dia e ficou faltando o resto do mês — vendemos o estoque inteiro dela com desconto (diga quanto de margem isso custou)',
      virada:
        'passei a abrir, antes de qualquer peça entrar na campanha, a venda semanal dela, a grade por tamanho e o prazo de reposição. Peça sem reposição no prazo da campanha não entra',
      licao:
        'campanha não é vitrine, é compromisso de entrega',
    },
    rotina: 'você passando a mão nas araras separando as candidatas, e errando o cabide duas vezes',
    usufruto:
      'a campanha que você fecha sem precisar queimar nada depois, porque escolheu certo na frente',
    provaSocial:
      'o print de um dono de loja contando o que sobrou da campanha dele (cubra o nome)',
    arcosSugeridos: ['autoridade_pratica', 'ensino_rapido'],
    contexto: ['black friday', 'campanha', 'natal', 'dia das mães', 'estoque'],
  },
  {
    id: 'estoque-por-tamanho',
    titulo: 'O estoque que parece cheio e está vazio',
    eixo: 'ensino',
    alavanca: 'Grade e mix',
    promessa: 'Seu estoque pode estar cheio e faltando justamente o que a cliente veio comprar.',
    pergunta: 'De que adianta ter 400 peças se faltam os três tamanhos que vendem?',
    oQueMostrar: 'a arara de um único modelo, separada por tamanho',
    dadoQueProva: 'a participação de cada tamanho na venda do último trimestre contra a participação dele no estoque de hoje',
    acaoUtil: [
      'Escolha o produto que mais vende.',
      'Liste a venda dos últimos 90 dias por tamanho, em porcentagem.',
      'Compare com a porcentagem de cada tamanho no seu estoque atual.',
      'A diferença entre as duas colunas é venda que você vai perder.',
    ],
    prazoReal: 'o prazo da sua próxima reposição do fornecedor',
    opcoesDeEnquete: ['Nunca olhei por tamanho', 'Olho, mas depois que falta'],
    perguntaFinal: 'Você sabe a curva de tamanho do seu produto principal?',
    opcoesFinais: ['Sei de cabeça', 'Sei onde olhar', 'Nunca tirei esse número'],
    reflexao: {
      noAutomatico: 'olha o total de peças em estoque e acha que está abastecido',
      oQueNinguemVe:
        'o total esconde a grade. Você pode ter o estoque cheio e estar sem exatamente os três tamanhos que respondem pela maior parte da venda — e a cliente que não acha o tamanho dela não compra outro, ela sai',
      oJeitoCerto:
        'olhe participação de cada tamanho na VENDA contra a participação dele no ESTOQUE. A diferença entre as duas colunas é venda que você já perdeu',
    },
    rotina: 'você contando peça por tamanho na arara em voz alta e perdendo a conta no meio',
    ancora: { gesto: 'pegar uma peça na arara e olhar a etiqueta do tamanho antes do preço', frase: 'estoque cheio não é estoque certo' },
    provaSocial:
      'o print de quem tirou a curva de tamanho depois que você ensinou, e o que encontrou',
    arcosSugeridos: ['ensino_rapido', 'autoridade_pratica'],
    contexto: ['estoque', 'grade', 'ruptura'],
  },
  {
    id: 'giro-dinheiro-parado',
    titulo: 'Quanto dinheiro está parado na sua arara',
    eixo: 'ensino',
    alavanca: 'Giro e capital',
    promessa: 'Estoque parado não é patrimônio. É dinheiro seu esperando o próximo desconto.',
    pergunta: 'Quanto do seu estoque não gira há mais de 90 dias?',
    oQueMostrar: 'o canto do estoque com a coleção antiga',
    dadoQueProva: 'o custo total das peças paradas há mais de 90 dias, em reais',
    acaoUtil: [
      'Filtre os produtos sem venda nos últimos 90 dias.',
      'Multiplique a quantidade pelo custo, não pelo preço de venda.',
      'Esse número é o que está fora do seu caixa agora.',
    ],
    prazoReal: 'a virada de estação, quando a peça perde mais valor ainda',
    opcoesDeEnquete: ['Tenho peça parada há mais de 1 ano', 'Prefiro nem olhar esse número'],
    perguntaFinal: 'O que te impede de queimar o estoque parado?',
    opcoesFinais: ['Medo de queimar a marca', 'Esperança de vender pelo preço cheio', 'Não sei quanto tenho parado'],
    reflexao: {
      noAutomatico: 'olha o estoque parado e pensa "isso aí eu vendo depois, pelo preço justo"',
      oQueNinguemVe:
        'estoque parado não é patrimônio, é o seu caixa em forma de pano. E ele não fica parado: perde valor a cada virada de estação, enquanto você paga aluguel para guardá-lo',
      oJeitoCerto:
        'faça uma régua de desconto por tempo de estoque e decida ela ANTES da peça encalhar, não depois',
    },
    historia: {
      cenaNormal:
        'a gente guardava a peça que não vendia esperando a próxima estação, porque dar desconto parecia desvalorizar a marca',
      quebra:
        'um dia eu somei o custo de tudo que estava parado há mais de noventa dias (diga o número) e era mais do que eu tinha em caixa',
      virada:
        'montei a régua: 30 dias sem venda vira recomendação na vitrine, 60 vira combo, 90 vira desconto de verdade. Decidida na planilha, antes de encalhar',
      licao:
        'desconto decidido na frente é estratégia; desconto decidido no desespero é prejuízo',
    },
    rotina: 'você abrindo o canto do estoque da coleção antiga e fazendo cara de quem não queria ter aberto',
    usufruto:
      'o caixa que sobra no fim do mês porque não tem dinheiro dormindo na arara',
    provaSocial:
      'o print de alguém que somou o estoque parado e levou um susto com o número',
    arcosSugeridos: ['contraste_curto', 'ensino_rapido'],
    contraste: {
      comum: 'segurar a peça esperando vender pelo preço justo',
      queFunciona: 'uma régua de desconto por tempo de estoque, decidida antes da peça encalhar',
    },
    contexto: ['liquidação', 'inventário', 'coleção', 'queima'],
  },

  /* ------------------------------------------------------ margem e preço -- */
  {
    id: 'margem-de-contribuicao',
    titulo: 'A conta de margem que quase ninguém faz antes de dar desconto',
    eixo: 'ensino',
    alavanca: 'Margem de contribuição',
    promessa: 'Dar desconto sem saber a margem por peça é vender prejuízo com volume.',
    pergunta: 'Depois de tudo que sai do preço, quanto sobra de verdade nessa peça?',
    oQueMostrar: 'a peça que você mais vende',
    dadoQueProva: 'preço de venda menos custo, comissão do canal, frete e taxa de devolução — o que sobra por peça',
    acaoUtil: [
      'Pegue uma peça e escreva: preço de venda.',
      'Subtraia custo, comissão do canal, frete que você paga e a taxa de devolução dela.',
      'O que sobrou é a sua margem de contribuição. Divida pelo preço: esse é o percentual real.',
      'Agora aplique o desconto que você pensou em dar e refaça a conta.',
    ],
    prazoReal: 'a data em que a oferta entra no ar e o preço não volta atrás',
    opcoesDeEnquete: ['Calculo só sobre o custo', 'Uso o desconto que o concorrente deu'],
    perguntaFinal: 'Você sabe a margem real do seu produto mais vendido?',
    opcoesFinais: ['Sei por peça', 'Sei só a média da loja', 'Nunca cheguei nesse número'],
    reflexao: {
      noAutomatico: 'calcula a margem como preço de venda menos o custo da peça',
      oQueNinguemVe:
        'essa conta ignora tudo que só aparece DEPOIS da venda: comissão do canal, frete que você paga, taxa de devolução daquela peça. É por isso que a sua margem na planilha é boa e o caixa não enche',
      oJeitoCerto:
        'margem de contribuição é preço menos custo, menos comissão, menos frete, menos devolução. Faça essa conta em UMA peça hoje e aplique o desconto que você pensou em dar',
    },
    historia: {
      cenaNormal:
        'a gente dava desconto olhando o custo da peça e achando que ainda sobrava bem',
      quebra:
        'fechei um mês com venda recorde e caixa pior que o mês anterior. A comissão, o frete e a devolução comeram tudo que o desconto já tinha apertado',
      virada:
        'refiz a conta peça por peça descontando tudo que sai depois da venda, e descobri que uma parte do catálogo vendia no vermelho. Reprecifiquei antes de tocar em qualquer campanha',
      licao:
        'faturamento é vaidade; margem de contribuição é a conta que paga o salário',
    },
    rotina: 'você com a calculadora do celular na mão, refazendo a mesma conta pela terceira vez',
    ancora: { gesto: 'abrir a calculadora antes de aprovar um desconto', frase: 'desconto sem a conta é venda de prejuízo com volume' },
    provaSocial:
      'o print de quem refez a conta de margem e descobriu que vendia no vermelho',
    arcosSugeridos: ['autoridade_pratica', 'contraste_curto'],
    contraste: {
      comum: 'calcular margem como preço menos custo do produto',
      queFunciona: 'descontar também comissão, frete e devolução, que só aparecem depois da venda',
    },
    contexto: ['black friday', 'desconto', 'promoção', 'margem', 'comissão'],
  },
  {
    id: 'frete-gratis-sem-piso',
    titulo: 'O frete grátis que come o lucro sem ninguém ver',
    eixo: 'autoridade',
    alavanca: 'Frete e piso de pedido',
    promessa: 'Frete grátis sem piso de pedido é o vazamento de margem mais caro do e-commerce de moda.',
    pergunta: 'Qual é o valor mínimo de pedido que faz o frete grátis se pagar?',
    oQueMostrar: 'a tela dos pedidos com frete grátis',
    dadoQueProva: 'o ticket médio dos pedidos com frete grátis contra o custo médio do frete que você pagou',
    acaoUtil: [
      'Separe os pedidos do último mês que tiveram frete grátis.',
      'Some o que você pagou de frete neles.',
      'Compare com a margem de contribuição desses mesmos pedidos.',
      'Se o frete comeu mais de um terço da margem, o piso está baixo demais.',
    ],
    prazoReal: 'o próximo pico de pedido, quando o volume multiplica o vazamento',
    opcoesDeEnquete: ['Frete grátis em qualquer valor', 'Não sei quanto pago de frete por pedido'],
    perguntaFinal: 'Como está o seu frete grátis hoje?',
    opcoesFinais: ['Sem piso nenhum', 'Tem piso, mas chutei o valor', 'Calculei com a margem'],
    reflexao: {
      noAutomatico: 'oferece frete grátis para todo mundo, em qualquer valor, porque o concorrente oferece',
      oQueNinguemVe:
        'frete grátis sem piso transforma o pedido pequeno no pedido mais caro da loja. Você paga o frete inteiro para entregar a peça de menor margem — e quanto mais você vende, mais isso sangra',
      oJeitoCerto:
        'calcule o piso pela margem: o valor mínimo de pedido em que o frete ainda se paga. Aí o frete grátis para de afundar o ticket e passa a subir ele',
    },
    rotina: 'você conferindo o custo de frete de um pedido e descobrindo que ele é maior que a peça',
    usufruto:
      'o ticket médio que subiu sozinho depois que o piso entrou, sem precisar de promoção',
    provaSocial:
      'o print de quem colocou piso no frete grátis e viu o ticket subir',
    arcosSugeridos: ['contraste_curto', 'autoridade_pratica'],
    contraste: {
      comum: 'oferecer frete grátis para todo mundo, para competir',
      queFunciona: 'um piso calculado pela margem, que usa o frete para subir o ticket em vez de afundá-lo',
    },
    contexto: ['frete', 'logística', 'marketplace', 'margem'],
  },
  {
    id: 'preco-minimo-por-canal',
    titulo: 'Por que o mesmo produto tem preço diferente em cada canal',
    eixo: 'ensino',
    alavanca: 'Precificação por canal',
    promessa: 'O mesmo produto não pode ter o mesmo preço em todo canal — e isso não é ganância, é matemática.',
    pergunta: 'Qual é o preço mínimo que cada canal aguenta sem destruir a margem?',
    oQueMostrar: 'a mesma peça aberta em dois canais',
    dadoQueProva: 'a comissão de cada canal e o que ela faz com a margem da mesma peça',
    acaoUtil: [
      'Escolha um produto que você vende em mais de um canal.',
      'Anote a comissão e a taxa fixa de cada canal.',
      'Calcule o preço que mantém a mesma margem em todos.',
      'Onde o preço ficar fora de mercado, o problema é o canal, não o produto.',
    ],
    prazoReal: 'a próxima mudança de comissão da plataforma, que não avisa com antecedência',
    opcoesDeEnquete: ['Uso o mesmo preço em todo lugar', 'Mudo o preço no feeling'],
    perguntaFinal: 'Você tem um piso de preço por canal?',
    opcoesFinais: ['Tenho calculado', 'Tenho, mas desatualizado', 'Uso o mesmo preço em tudo'],
    reflexao: {
      noAutomatico: 'usa o mesmo preço em todo canal, para não confundir a cliente',
      oQueNinguemVe:
        'cada canal cobra uma comissão diferente, então o mesmo preço entrega margens diferentes. Preço igual em todo lugar não é coerência: é aceitar vender de graça no canal mais caro',
      oJeitoCerto:
        'anote a comissão e a taxa fixa de cada canal e calcule o preço que mantém a MESMA margem nos dois. Onde o preço ficar fora de mercado, o problema é o canal, não o produto',
    },
    rotina: 'você com a mesma peça aberta em dois celulares, um em cada canal, comparando o preço',
    ancora: { gesto: 'abrir o mesmo produto em dois canais antes de decidir preço', frase: 'preço igual em canal diferente é margem diferente' },
    provaSocial:
      'o print de alguém que calculou o preço mínimo por canal e desligou um canal',
    arcosSugeridos: ['ensino_rapido', 'autoridade_pratica'],
    contexto: ['marketplace', 'comissão', 'shopee', 'mercado livre', 'preço'],
  },

  /* ---------------------------------------------------- devolução e produto -- */
  {
    id: 'devolucao-por-sku',
    titulo: 'A devolução que você não mede está comendo a coleção',
    eixo: 'ensino',
    alavanca: 'Devolução e ficha técnica',
    promessa: 'Em moda, de 10% a 30% do que você vende volta. Quem não mede por produto paga sem saber.',
    pergunta: 'Quais são os três produtos que mais voltam, e por quê?',
    oQueMostrar: 'a mesa de devolução com as peças que voltaram',
    dadoQueProva: 'a taxa de devolução dos três produtos campeões, em porcentagem',
    acaoUtil: [
      'Liste a devolução dos últimos 90 dias por produto, não no total.',
      'Pegue os três que mais voltam.',
      'Para cada um, pergunte: é a grade, a foto ou a descrição?',
      'Um ponto de devolução a menos é margem que volta sem vender nada a mais.',
    ],
    prazoReal: 'a janela de troca da próxima campanha, que já está contratada',
    opcoesDeEnquete: ['Não meço devolução por produto', 'Meço, mas não mudei nada ainda'],
    perguntaFinal: 'Você sabe qual é o seu produto que mais volta?',
    opcoesFinais: ['Sei e já corrigi', 'Sei e não mexi', 'Nunca separei por produto'],
    reflexao: {
      noAutomatico: 'olha a taxa de devolução da loja inteira, aquela média que fica no relatório',
      oQueNinguemVe:
        'a média esconde o culpado. Devolução não é espalhada: ela se concentra em poucos produtos, quase sempre por grade ou por foto — e enquanto você olha a média, você segue anunciando o produto que devolve',
      oJeitoCerto:
        'abra a devolução por produto, não por loja. Os três primeiros da lista é onde está o seu problema, e ele se resolve na ficha, não no atendimento',
    },
    historia: {
      cenaNormal:
        'a gente tratava devolução como custo de operar: chega, confere, devolve o dinheiro, segue',
      quebra:
        'numa semana a mesa de devolução virou gargalo e eu fui olhar: era quase tudo o mesmo modelo, no mesmo tamanho (diga o número)',
      virada:
        'parei o anúncio daquele modelo, refiz a tabela de medida com a peça na mão e refotografei mostrando o caimento. A devolução dele caiu e eu passei a olhar devolução por produto toda semana',
      licao:
        'devolução não é problema de atendimento, é problema de ficha de produto',
    },
    rotina: 'você abrindo uma caixa de devolução e já sabendo qual peça é antes de ver',
    provaSocial:
      'o print de quem abriu a devolução por produto e achou o culpado em três linhas',
    arcosSugeridos: ['autoridade_pratica', 'ensino_rapido'],
    contexto: ['devolução', 'troca', 'natal', 'ficha técnica', 'voltou', 'voltaram'],
  },
  {
    id: 'foto-e-descricao',
    titulo: 'A foto que vende e devolve',
    eixo: 'ensino',
    alavanca: 'Conversão e devolução',
    promessa: 'A foto que mais converte pode ser a que mais devolve — e o prejuízo aparece 20 dias depois.',
    pergunta: 'Sua foto está vendendo a peça que chega na casa da cliente?',
    oQueMostrar: 'a foto de estúdio da peça que mais volta',
    dadoQueProva: 'a taxa de devolução do produto antes e depois de você mudar a foto e a ficha de medidas',
    acaoUtil: [
      'Abra a página do seu produto mais devolvido.',
      'Pergunte: dá para saber como essa peça veste sem experimentar?',
      'Acrescente medidas da peça (não do corpo) e uma foto com referência de altura.',
      'Acompanhe a devolução dele por 30 dias.',
    ],
    prazoReal: 'os 30 dias que a devolução leva para aparecer no seu número',
    opcoesDeEnquete: ['Minha ficha de medidas é genérica', 'Uso só foto de estúdio'],
    perguntaFinal: 'O que falta na sua página de produto?',
    opcoesFinais: ['Medidas da peça', 'Foto com referência de corpo', 'Descrição de caimento'],
    reflexao: {
      noAutomatico: 'escolhe a foto mais bonita da peça e escreve a descrição com os adjetivos que vendem',
      oQueNinguemVe:
        'foto que embeleza vende e devolve. A cliente compra o que viu e recebe o que é — e a devolução volta com frete, com a peça usada e sem a venda',
      oJeitoCerto:
        'a foto tem de mostrar o caimento real e a medida tem de estar na peça, não na tabela genérica do fornecedor. Venda menos e devolva menos: a conta fecha melhor',
    },
    rotina: 'você medindo uma peça com a trena no chão da sala, porque a tabela do fornecedor não bate',
    ancora: { gesto: 'medir a peça com a trena antes de subir o anúncio', frase: 'foto vende, medida é que entrega' },
    provaSocial:
      'a mensagem de uma cliente dizendo que a peça chegou diferente da foto (cubra o nome)',
    arcosSugeridos: ['ensino_rapido', 'contraste_curto'],
    contraste: {
      comum: 'investir na foto mais bonita',
      queFunciona: 'investir na foto mais honesta, que vende menos no clique e devolve muito menos',
    },
    contexto: ['devolução', 'conversão', 'foto', 'ficha técnica'],
  },

  /* -------------------------------------------------------- canal e mercado -- */
  {
    id: 'mudanca-de-comissao',
    titulo: 'Quando o marketplace muda a regra no meio do jogo',
    eixo: 'autoridade',
    alavanca: 'Canal e margem',
    promessa: 'Quando a plataforma muda a comissão, sua planilha de preço passa a mentir no mesmo dia.',
    pergunta: 'O que você faz quando o canal muda a regra e você já tinha precificado o ano?',
    oQueMostrar: 'o comunicado da plataforma aberto na tela',
    dadoQueProva: 'quanto a mudança tirou da margem por faixa de preço, em reais por peça',
    acaoUtil: [
      'Abra a tabela de comissão atual do seu canal principal.',
      'Refaça a margem de um produto barato e de um caro.',
      'Veja em qual faixa de preço a mudança dói mais.',
      'Decida o que sai do canal antes de decidir o que sobe de preço.',
    ],
    prazoReal: 'a data em que a nova regra entra em vigor',
    opcoesDeEnquete: ['Descobri pela queda na venda', 'Não refiz a conta ainda'],
    perguntaFinal: 'Você já refez seus preços depois da última mudança de comissão?',
    opcoesFinais: ['Refiz tudo', 'Refiz só os campeões', 'Ainda não refiz'],
    reflexao: {
      noAutomatico: 'descobre a mudança de comissão quando o repasse chega menor',
      oQueNinguemVe:
        'o canal muda a regra sem avisar com antecedência, e quem só olha faturamento não percebe: a venda continua igual, o que mudou foi o que sobra. Você só descobre no fechamento, depois de ter vendido um mês inteiro no preço errado',
      oJeitoCerto:
        'confira a comissão efetiva do canal todo mês, pelo extrato e não pela tabela. E tenha o preço mínimo por canal calculado, para reprecificar no mesmo dia em que a regra muda',
    },
    rotina: 'você conferindo o extrato do marketplace no celular, na fila do banco',
    usufruto:
      'a tranquilidade de reprecificar em um dia quando o canal muda a regra, em vez de descobrir no fim do trimestre',
    provaSocial:
      'o print de outro vendedor comentando o mesmo corte de repasse',
    arcosSugeridos: ['autoridade_pratica', 'conversa'],
    contexto: ['marketplace', 'comissão', 'shopee', 'mercado livre', 'taxa', 'plataforma', 'canal'],
  },
  {
    id: 'competir-com-importado',
    titulo: 'Como competir com quem vende mais barato que o seu custo',
    eixo: 'autoridade',
    alavanca: 'Posicionamento',
    promessa: 'Você não vai ganhar de preço de quem aceita perder dinheiro. E não precisa.',
    pergunta: 'O que a peça de 30 dias de entrega não entrega, e a sua entrega?',
    oQueMostrar: 'a peça nacional ao lado da embalagem de uma importada',
    dadoQueProva: 'o prazo médio de entrega nacional contra o do importado, e a taxa de troca resolvida',
    acaoUtil: [
      'Liste três coisas que você faz e o importado não: prazo, troca, prova, atendimento.',
      'Escolha a mais forte e coloque na página de produto, não no rodapé.',
      'Teste por 15 dias e olhe a conversão.',
    ],
    prazoReal: 'a mudança tributária que acabou de tirar a diferença de preço que te protegia',
    opcoesDeEnquete: ['Baixei preço para competir', 'Perdi venda e não sei para onde foi'],
    perguntaFinal: 'Qual é a sua vantagem real contra o importado?',
    opcoesFinais: ['Prazo de entrega', 'Troca sem dor', 'Qualidade e caimento'],
    reflexao: {
      noAutomatico: 'tenta chegar perto do preço de quem vende mais barato que o seu custo',
      oQueNinguemVe:
        'essa briga você perde por definição: ninguém ganha de uma estrutura de custo que não é a sua. E cada passo que você dá na direção do preço dele é um passo de margem que você entrega sem recuperar',
      oJeitoCerto:
        'não compita no preço, compita no que ele não entrega: prazo, troca, grade completa, medida que bate. É mais caro de operar e é o único terreno em que você ganha',
    },
    historia: {
      cenaNormal:
        'quando o importado barato apareceu no mesmo termo de busca que o nosso, a primeira reação foi descer o preço',
      quebra:
        'descemos, vendemos mais e fechamos o mês com menos dinheiro. A venda subiu e a margem foi embora inteira',
      virada:
        'voltei o preço, parei de competir por preço e passei a competir por prazo de entrega e troca sem perrengue. Perdi a cliente que só olhava preço e segurei a que volta',
      licao:
        'quem compete em preço com quem tem custo menor está escolhendo sangrar devagar',
    },
    rotina: 'você comparando a peça nacional com a importada em cima da mesa, puxando a costura das duas',
    usufruto:
      'a cliente que paga mais caro na sua loja sabendo que vai chegar certo e no prazo',
    provaSocial:
      'a mensagem de uma cliente explicando por que pagou mais caro em você',
    arcosSugeridos: ['contraste_curto', 'conversa'],
    contraste: {
      comum: 'tentar chegar no preço do importado',
      queFunciona: 'sair da faixa de preço onde o importado ganha e vender o que ele não consegue entregar',
    },
    contexto: ['shein', 'temu', 'importação', 'taxa das blusinhas', 'concorrência'],
  },

  /* ------------------------------------------------------ história e equipe -- */
  {
    id: 'erro-de-compra',
    titulo: 'A compra de coleção que me custou caro',
    eixo: 'humanidade',
    alavanca: 'Compra e profundidade',
    promessa: 'Vou te contar a compra que eu errei, quanto ela custou e o que eu mudei depois.',
    pergunta: 'Como uma compra feita com empolgação vira estoque morto seis meses depois?',
    oQueMostrar: 'a peça que encalhou, ainda no estoque',
    dadoQueProva: 'quanto do pedido não girou em seis meses, em porcentagem e em reais',
    acaoUtil: [
      'Olhe sua última compra grande.',
      'Separe o que já girou do que não girou.',
      'Se mais de um terço não girou, o erro foi de profundidade, não de escolha.',
    ],
    prazoReal: 'a próxima compra de coleção, que você já vai fechar com fornecedor',
    opcoesDeEnquete: ['Compro pela empolgação do showroom', 'Compro igual ao ano passado'],
    perguntaFinal: 'Qual foi a compra que você mais se arrependeu?',
    opcoesFinais: ['Comprei demais', 'Comprei o modelo errado', 'Comprei na hora errada'],
    reflexao: {
      noAutomatico: 'compra profundidade da peça que te empolgou no showroom',
      oQueNinguemVe:
        'showroom é ambiente de venda, e empolgação ali custa capital por seis meses. A peça que você amou pode ser a que vai ocupar a sua arara e o seu caixa até a virada da estação',
      oJeitoCerto:
        'defina o teto de capital por coleção ANTES de ir ao showroom, e compre largura em vez de profundidade no que você não testou',
    },
    historia: {
      cenaNormal:
        'eu ia ao showroom com o cartão e com o gosto, e comprava o que me encantava',
      quebra:
        'uma coleção inteira travou o caixa porque eu comprei fundo demais na peça errada (diga quanto)',
      virada:
        'passei a ir com teto de capital escrito e com a regra de comprar pouco de muita coisa no que não foi testado. Só compro fundo depois de duas semanas de venda',
      licao:
        'teto de capital decidido em casa vale mais que qualquer desconto de fornecedor',
    },
    rotina: 'você mexendo na caixa de uma peça que ainda está lá, da coleção passada',
    provaSocial:
      'o print de um dono de loja contando a compra de coleção que travou o caixa dele',
    arcosSugeridos: ['historia_completa', 'conversa'],
    erro: 'comprar profundidade pela empolgação do showroom, sem teto de capital por coleção',
    contexto: ['coleção', 'compra', 'fornecedor', 'inverno', 'verão'],
  },
  {
    id: 'por-que-confeccao-propria',
    titulo: 'Por que eu escolhi ter confecção própria',
    eixo: 'humanidade',
    alavanca: 'Produto e cadeia',
    promessa: 'Produzir dá mais trabalho e menos margem no começo. Vou te contar por que eu escolhi assim mesmo.',
    pergunta: 'O que você ganha controlando a produção, e o que você perde?',
    oQueMostrar: 'o chão da confecção, com as máquinas rodando',
    dadoQueProva: 'o prazo de reposição da confecção própria contra o de quem compra pronto',
    acaoUtil: [
      'Liste o que trava sua operação hoje: prazo, qualidade, exclusividade ou custo.',
      'Produzir resolve prazo e exclusividade. Não resolve custo no começo.',
      'Se o seu gargalo é custo, produzir é a resposta errada.',
    ],
    prazoReal: 'o tempo até a primeira coleção própria se pagar',
    opcoesDeEnquete: ['Dependo totalmente de fornecedor', 'Já pensei em produzir e travei'],
    perguntaFinal: 'O que mais te trava hoje na sua operação?',
    opcoesFinais: ['Prazo do fornecedor', 'Falta de exclusividade', 'Custo da peça'],
    reflexao: {
      noAutomatico: 'acha que confecção própria é só margem maior',
      oQueNinguemVe:
        'própria não é mais barata, é mais controlável. Você troca o custo mais baixo do fornecedor pela possibilidade de ajustar grade, medida e prazo — e paga isso com capital imobilizado e com gente',
      oJeitoCerto:
        'decida pelo que você precisa controlar, não pelo custo: se o seu problema é grade e prazo, própria se paga; se é preço, não',
    },
    historia: {
      cenaNormal:
        'no começo era tudo de fornecedor, e eu só mandava o pedido e esperava',
      quebra:
        'quando a grade chegava errada ou atrasava, não tinha o que fazer: eu explicava para a cliente um problema que não era meu e perdia ela igual',
      virada:
        'trouxe a confecção para dentro aceitando a conta: mais capital parado, mais gente, mais dor de cabeça — em troca de prazo e medida na minha mão',
      licao:
        'própria não é sobre custo, é sobre quem manda no prazo',
    },
    rotina: 'você entrando na produção de manhã e cumprimentando todo mundo pelo nome',
    usufruto:
      'poder mudar uma medida numa terça e ter a peça corrigida na arara na semana seguinte',
    provaSocial:
      'o depoimento de um cliente sobre prazo ou medida, que só a própria entrega',
    arcosSugeridos: ['historia_completa', 'conversa'],
    contexto: ['produção', 'fornecedor', 'confecção', 'cadeia', 'própria'],
  },
  {
    id: 'quem-decide-o-que',
    titulo: 'Quem decide o quê na minha operação',
    eixo: 'humanidade',
    alavanca: 'Pessoas e processo',
    promessa: 'Enquanto tudo passa por você, sua loja cresce até o tamanho do seu dia.',
    pergunta: 'Quais decisões você ainda toma que não deveriam chegar até você?',
    oQueMostrar: 'a equipe trabalhando, cada um na sua etapa',
    dadoQueProva: 'quantas decisões por dia passavam por você antes e quantas passam agora',
    acaoUtil: [
      'Anote toda decisão que chegou até você hoje.',
      'Marque as que alguém da equipe poderia ter tomado com uma regra escrita.',
      'Escreva a regra de uma delas. Só uma.',
    ],
    prazoReal: 'o próximo pico de venda, quando o gargalo vira você',
    opcoesDeEnquete: ['Tudo passa por mim', 'Deleguei e voltou para mim'],
    perguntaFinal: 'O que você ainda não consegue delegar?',
    opcoesFinais: ['Compra', 'Preço', 'Atendimento', 'Conteúdo'],
    reflexao: {
      noAutomatico: 'decide tudo você, porque é mais rápido e porque ninguém erra como você erraria',
      oQueNinguemVe:
        'operação que depende de você para toda decisão tem o seu dia como teto de crescimento. Não é que o time não saiba: é que ninguém escreveu o que ele pode decidir sem perguntar',
      oJeitoCerto:
        'escreva três decisões que o time pode tomar sozinho e o limite de cada uma. Uma folha. Depois disso você só decide o que estiver fora dos limites',
    },
    rotina: 'você sendo interrompido quatro vezes em dez minutos e respondendo tudo na mesma pergunta',
    usufruto:
      'a semana que roda sem você, porque o limite de cada decisão está escrito',
    provaSocial:
      'o print de alguém da sua equipe tomando uma decisão sozinho, com autorização',
    historia: {
      cenaNormal:
        'eu decidia tudo, porque era mais rápido e porque ninguém errava como eu erraria',
      quebra:
        'numa semana de pico eu virei o gargalo da minha própria operação: nada andava sem a minha resposta',
      virada:
        'escrevi três decisões que o time pode tomar sozinho e o limite de cada uma, em uma folha, e avisei todo mundo',
      licao: 'operação que depende de você para tudo tem o seu dia como teto',
    },
    arcosSugeridos: ['historia_completa', 'conversa'],
    contexto: ['equipe', 'processo', 'operação'],
  },
  {
    id: 'o-que-olho-na-segunda',
    titulo: 'Os números que eu olho toda segunda de manhã',
    eixo: 'autoridade',
    alavanca: 'Gestão e rotina',
    promessa: 'Cinco números, quinze minutos, toda segunda. É o que me impede de descobrir problema em novembro.',
    pergunta: 'Quais números dizem, na segunda, como vai terminar o mês?',
    oQueMostrar: 'a tela do painel, com os números da semana',
    dadoQueProva: 'os cinco números que você acompanha e o que cada um mandou fazer na última vez',
    acaoUtil: [
      'Escolha cinco números, não quinze.',
      'Sugestão: venda da semana, ticket, ruptura dos campeões, devolução e caixa.',
      'Olhe na mesma hora, no mesmo dia, toda semana.',
      'Número que você olha uma vez por mês não muda decisão nenhuma.',
    ],
    prazoReal: 'o fechamento do mês, que já está sendo decidido agora',
    opcoesDeEnquete: ['Só olho no fim do mês', 'Olho tudo e não decido nada'],
    perguntaFinal: 'Quantos números você acompanha toda semana?',
    opcoesFinais: ['Menos de cinco', 'Entre cinco e dez', 'Nenhum com regularidade'],
    reflexao: {
      noAutomatico: 'abre o relatório de faturamento na segunda e sente que está indo bem ou mal pelo número de cima',
      oQueNinguemVe:
        'faturamento é o número que avisa mais tarde. Quando ele cai, o problema já tem semanas — está na grade que furou, na devolução que subiu, no canal que mudou a comissão',
      oJeitoCerto:
        'olhe quatro números antes do faturamento: ruptura da grade, devolução por produto, margem por canal e estoque sem giro. Mesma hora, todo semana',
    },
    rotina: 'você com o café na mão e a planilha aberta, antes de qualquer pessoa chegar',
    usufruto:
      'o mês que você corrige na segunda semana porque viu no número certo, em vez de descobrir no fechamento',
    ancora: { gesto: 'abrir a planilha na segunda antes de abrir o WhatsApp', frase: 'faturamento avisa tarde' },
    provaSocial:
      'o print de quem começou a rotina de segunda e o que mudou no primeiro mês',
    arcosSugeridos: ['ensino_rapido', 'autoridade_pratica'],
    contexto: ['gestão', 'métricas', 'rotina', 'relatório'],
  },
  {
    id: 'comecar-hoje',
    titulo: 'O que eu faria diferente se começasse hoje',
    eixo: 'humanidade',
    alavanca: 'Estratégia',
    promessa: 'Se eu começasse hoje, teria errado menos em três decisões. Vou te contar quais.',
    pergunta: 'Que decisão do começo você levaria anos para corrigir?',
    oQueMostrar: 'a primeira máquina da operação',
    dadoQueProva: 'quanto tempo você levou para corrigir a decisão errada',
    acaoUtil: [
      'Escolha a decisão que você mais adia hoje.',
      'Pergunte: daqui a um ano, eu vou achar que demorei demais?',
      'Se a resposta for sim, marque uma data para decidir.',
    ],
    prazoReal: 'o tempo que uma decisão adiada leva para virar custo fixo',
    opcoesDeEnquete: ['Estou adiando uma decisão grande', 'Já adiei e me arrependi'],
    perguntaFinal: 'Qual decisão você está adiando agora?',
    opcoesFinais: ['Cortar um canal', 'Subir preço', 'Contratar', 'Parar um produto'],
    reflexao: {
      noAutomatico: 'acha que o que faltou no começo foi dinheiro ou fornecedor melhor',
      oQueNinguemVe:
        'o que custa caro no começo não é a falta de capital: é a decisão adiada. Cada mês que você passa sem saber a sua margem por peça é um mês inteiro de escolhas no escuro',
      oJeitoCerto:
        'escolha a decisão que você está adiando há mais tempo e tome ela esta semana, mesmo com informação incompleta',
    },
    historia: {
      cenaNormal:
        'eu tinha a decisão clara na cabeça e segurava, porque mexer parecia arriscar faturamento',
      quebra:
        'adiei por meses uma decisão que já estava resolvida, com medo de perder venda — e perdi mais segurando do que teria perdido mudando',
      virada:
        'comecei a tratar decisão adiada como custo: toda semana, uma decisão que estava parada sai da fila, mesmo sem toda a informação',
      licao:
        'decisão adiada por medo de perder faturamento custa mais caro que a decisão errada',
    },
    rotina: 'você olhando uma foto antiga da operação no celular e rindo do tamanho da bagunça',
    provaSocial:
      'o print de alguém que tomou a decisão que estava adiando, e no que deu',
    arcosSugeridos: ['historia_completa', 'conversa'],
    erro: 'adiar por meses uma decisão que já estava clara, por medo de perder faturamento',
    contexto: ['balanço', 'ano', 'planejamento', 'estratégia'],
  },

  /* -------------------------------------------------- campanha e sazonalidade -- */
  {
    id: 'calendario-reverso',
    titulo: 'Por que o Natal começa em setembro',
    eixo: 'ensino',
    alavanca: 'Planejamento',
    promessa: 'Quem vende bem na data decidiu três meses antes. Dezembro é só execução.',
    pergunta: 'O que precisa estar resolvido hoje para a campanha ser só execução?',
    oQueMostrar: 'o calendário de campanhas na parede',
    dadoQueProva: 'a data-limite de compra, de foto e de preço para a próxima campanha',
    acaoUtil: [
      'Pegue a próxima data grande do seu calendário.',
      'Conte para trás: entrega, produção, compra, decisão de mix.',
      'A primeira data dessa lista é hoje ou já passou.',
    ],
    prazoReal: 'o prazo do seu fornecedor, que encurta conforme a data se aproxima',
    opcoesDeEnquete: ['Começo a planejar no mês da data', 'Planejo, mas não cumpro o cronograma'],
    perguntaFinal: 'Para a próxima data grande, o que ainda não está resolvido?',
    opcoesFinais: ['Mix de produto', 'Quantidade', 'Preço', 'Foto e conteúdo'],
    reflexao: {
      noAutomatico: 'começa a planejar a data comercial quando ela aparece no calendário',
      oQueNinguemVe:
        'a data é o fim do processo, não o começo. Entre decidir a peça e ela estar disponível para venda tem corte, costura, foto, cadastro e reposição — e nada disso aceita ser apressado na última semana',
      oJeitoCerto:
        'monte o calendário de trás para frente: data da campanha, menos o prazo de cadastro e foto, menos o prazo de produção, menos o prazo de compra de tecido. O resultado é a data em que você tinha de ter começado',
    },
    rotina: 'você riscando datas num calendário de parede com caneta, de trás para frente',
    ancora: { gesto: 'contar os dias de trás para frente no calendário antes de aceitar um prazo', frase: 'a data é o fim do processo, não o começo' },
    provaSocial:
      'o print de quem montou o calendário de trás para frente e chegou na data real',
    arcosSugeridos: ['ensino_rapido', 'autoridade_pratica'],
    contexto: ['natal', 'black friday', 'dia das mães', 'campanha', 'planejamento'],
  },
  {
    id: 'data-de-corte-entrega',
    titulo: 'A venda que custa caro é a que você aceita depois da hora',
    eixo: 'ensino',
    alavanca: 'Prazo e expedição',
    promessa: 'Aceitar pedido depois da data de corte troca faturamento por reclamação.',
    pergunta: 'Qual é o último dia em que você consegue prometer entrega antes da data?',
    oQueMostrar: 'a expedição, com as caixas prontas para sair',
    dadoQueProva: 'o prazo real da transportadora por região, não o do site',
    acaoUtil: [
      'Pegue o prazo real de entrega por região do último mês.',
      'Conte para trás a partir da data da campanha.',
      'Publique essa data no site antes que ela chegue.',
    ],
    prazoReal: 'a própria data de corte, que passa sem avisar',
    opcoesDeEnquete: ['Prometo prazo que não cumpro', 'Não sei meu prazo real por região'],
    perguntaFinal: 'Você já definiu sua data de corte da próxima campanha?',
    opcoesFinais: ['Já publiquei', 'Sei mas não comuniquei', 'Nem pensei nisso'],
    reflexao: {
      noAutomatico: 'aceita o pedido depois da data de corte porque é venda, e venda não se recusa',
      oQueNinguemVe:
        'essa venda custa mais do que rende: ela entra na fila na frente de quem comprou no prazo, atrasa os dois e queima a confiança de quem fez certo. Você paga frete expresso para entregar margem menor',
      oJeitoCerto:
        'publique a data de corte antes e cumpra ela. Depois da data, venda com o prazo real na tela — não com o prazo que a cliente quer ouvir',
    },
    rotina: 'você conferindo a fila da expedição e separando o que ainda dá para sair hoje',
    provaSocial:
      'a mensagem de uma cliente agradecendo por chegar no prazo prometido',
    arcosSugeridos: ['ensino_rapido', 'autoridade_pratica'],
    contexto: ['natal', 'entrega', 'prazo', 'logística', 'frete'],
  },
  {
    id: 'o-que-sobrou-da-campanha',
    titulo: 'O que sobrou da campanha diz mais que o que vendeu',
    eixo: 'autoridade',
    alavanca: 'Compra e curva',
    promessa: 'O faturamento da campanha elogia a oferta. A sobra denuncia a compra.',
    pergunta: 'O que a sobra desta campanha está te dizendo sobre a próxima compra?',
    oQueMostrar: 'as peças que sobraram, separadas por modelo',
    dadoQueProva: 'o percentual de sobra por produto, não o faturamento total',
    acaoUtil: [
      'Liste o que sobrou por SKU, em porcentagem do que você comprou.',
      'Os que sobraram acima de 40% não devem repetir na próxima compra.',
      'Os que zeraram antes do fim: você comprou pouco, não vendeu bem.',
    ],
    prazoReal: 'a próxima compra, que costuma ser fechada antes de alguém olhar a sobra',
    opcoesDeEnquete: ['Olho só o faturamento', 'Olho a sobra, mas depois da próxima compra'],
    perguntaFinal: 'Você analisa a sobra antes de fechar a próxima compra?',
    opcoesFinais: ['Sempre', 'Às vezes', 'Nunca parei para isso'],
    reflexao: {
      noAutomatico: 'fecha a campanha olhando o que vendeu, e comemora o total',
      oQueNinguemVe:
        'o que vendeu você já sabia. O que sobrou é o dado novo: ele diz onde você comprou errado, qual grade você furou e qual peça nunca devia ter entrado. E é o único relatório que melhora a campanha seguinte',
      oJeitoCerto:
        'liste o que sobrou por produto e por tamanho no dia seguinte ao fim da campanha, enquanto a informação está fresca. Essa lista é a sua ordem de compra da próxima',
    },
    rotina: 'você sentado no chão do estoque depois da campanha, separando o que sobrou em duas pilhas',
    usufruto:
      'a campanha seguinte comprada pela lista do que sobrou na anterior, em vez de pelo feeling',
    ancora: { gesto: 'separar o que sobrou em duas pilhas no dia seguinte à campanha', frase: 'o que sobrou ensina mais que o que vendeu' },
    provaSocial:
      'o print de quem listou o que sobrou e usou a lista para comprar a seguinte',
    arcosSugeridos: ['autoridade_pratica', 'contraste_curto'],
    contraste: {
      comum: 'comemorar o faturamento da campanha',
      queFunciona: 'ler a sobra por produto, que é o retrato do erro de compra',
    },
    contexto: ['black friday', 'campanha', 'sobra', 'estoque', 'compra'],
  },

  /* ------------------------------------------------------- cliente e conexão -- */
  {
    id: 'cliente-que-voltou',
    titulo: 'A venda mais barata é para quem já comprou',
    eixo: 'conexao',
    alavanca: 'Recompra e base',
    promessa: 'Você gasta para trazer gente nova e trata quem já comprou como lista de disparo.',
    pergunta: 'Quantas das suas vendas deste mês foram de clientes que já tinham comprado?',
    oQueMostrar: 'a mensagem de uma cliente que voltou a comprar',
    dadoQueProva: 'o percentual de recompra do último trimestre e o custo de trazer um cliente novo',
    acaoUtil: [
      'Separe quem comprou mais de uma vez nos últimos 12 meses.',
      'Veja o que essas pessoas compraram da segunda vez.',
      'Ofereça isso para quem comprou só uma vez. Sem desconto, só a oferta certa.',
    ],
    prazoReal: 'a próxima campanha, em que a base responde mais rápido que o tráfego pago',
    opcoesDeEnquete: ['Não sei minha taxa de recompra', 'Mando o mesmo e-mail para todo mundo'],
    perguntaFinal: 'Como você fala com quem já comprou?',
    opcoesFinais: ['Tenho segmentação', 'Mando igual para todos', 'Não falo'],
    reflexao: {
      noAutomatico: 'investe para trazer cliente nova e trata quem já comprou como venda feita',
      oQueNinguemVe:
        'a cliente que já comprou é a mais barata que você tem: ela já confia, já sabe o tamanho dela e não custa anúncio. E é justamente com ela que ninguém fala',
      oJeitoCerto:
        'separe quem comprou nos últimos noventa dias e fale com essas pessoas primeiro, com o que faz sentido para o que elas já levaram',
    },
    rotina: 'você lendo uma mensagem de uma cliente que voltou e mostrando a tela sem o nome',
    usufruto:
      'a base que compra de novo sem anúncio, e que sustenta o mês quando o tráfego cai',
    arcosSugeridos: ['conversa', 'ensino_rapido'],
    provaSocial: 'a mensagem de uma cliente que voltou e disse por quê (cubra o nome dela)',
    contexto: ['cliente', 'recompra', 'dia do cliente', 'base'],
  },
  {
    id: 'embalagem-parte-do-produto',
    titulo: 'A embalagem é parte do produto, não do custo',
    eixo: 'conexao',
    alavanca: 'Experiência e ticket',
    promessa: 'Em data de presente, a embalagem decide se a cliente volta — e ela custa menos que um anúncio.',
    pergunta: 'O que a sua cliente sente ao abrir a caixa que você mandou?',
    oQueMostrar: 'a embalagem sendo montada na expedição',
    dadoQueProva: 'o custo da embalagem por pedido contra o custo de aquisição de cliente',
    acaoUtil: [
      'Peça um pedido seu para a sua própria casa.',
      'Abra como se fosse cliente e filme.',
      'Tudo que te decepcionar, decepciona ela também.',
    ],
    prazoReal: 'a próxima data de presente do calendário',
    opcoesDeEnquete: ['Uso saco plástico simples', 'Nunca recebi um pedido meu'],
    perguntaFinal: 'Quando foi a última vez que você abriu um pedido da sua loja?',
    opcoesFinais: ['Esse mês', 'Faz tempo', 'Nunca fiz isso'],
    reflexao: {
      noAutomatico: 'trata embalagem como custo e procura a mais barata que protege a peça',
      oQueNinguemVe:
        'a embalagem é o único momento físico da sua marca. É a única parte da experiência que a cliente toca, fotografa e mostra para outra pessoa — e você está economizando centavos exatamente ali',
      oJeitoCerto:
        'decida a embalagem olhando dois números juntos: o custo por pedido e a chance de a cliente fotografar. Um deles é custo, o outro é mídia que você não paga',
    },
    rotina: 'você abrindo um pedido pronto como se fosse a cliente, só para ver como chega',
    usufruto:
      'os stories de clientes abrindo o pedido, que você não pagou para ninguém fazer',
    provaSocial:
      'o story de uma cliente abrindo o pedido, repostado com autorização',
    arcosSugeridos: ['conversa', 'ensino_rapido'],
    contexto: ['dia das mães', 'natal', 'presente', 'embalagem', 'experiência'],
  },
  {
    id: 'bastidor-producao',
    titulo: 'Um dia dentro da produção',
    eixo: 'humanidade',
    alavanca: 'Produto e pessoas',
    promessa: 'Vou te mostrar o caminho de uma peça, do corte até a etiqueta.',
    pergunta: 'Quanto tempo e quantas mãos existem entre o tecido e a peça pronta?',
    oQueMostrar: 'o caminho da peça: corte, costura, revisão e etiqueta',
    dadoQueProva: 'quantas pessoas e quantos dias uma peça leva até ficar disponível',
    acaoUtil: [
      'Cronometre o caminho de um produto seu, do pedido ao envio.',
      'Marque onde ele fica parado esperando alguém.',
      'A espera, não o trabalho, é o que estica o seu prazo.',
    ],
    prazoReal: 'o prazo que você promete no site hoje',
    opcoesDeEnquete: ['Não sei meu tempo real de produção', 'Prometo prazo pelo que eu gostaria'],
    perguntaFinal: 'Você sabe onde seu pedido fica parado?',
    opcoesFinais: ['Sei e já reduzi', 'Sei e não mexi', 'Nunca mapeei'],
    reflexao: {
      noAutomatico: 'acha que mostrar a produção é conteúdo de bastidor, coisa bonita de fundo',
      oQueNinguemVe:
        'mostrar a produção é a prova mais barata de autoridade que existe. Quem opera de verdade tem imagem para mostrar; quem só comenta sobre operação não tem — e a diferença aparece em um story',
      oJeitoCerto:
        'grave o lugar onde a decisão acontece e diga qual decisão é. Bastidor sem a decisão é vídeo de fábrica; com a decisão, é autoridade',
    },
    rotina: 'você entrando na produção, pegando uma peça da mesa e conferindo a costura no contraluz',
    usufruto:
      'a confiança de quem compra de você sabendo exatamente de onde a peça sai',
    provaSocial:
      'o depoimento de quem comprou depois de ver a produção por dentro',
    historia: {
      cenaNormal: 'eu nunca filmava a produção, porque parecia conteúdo de enfeite',
      quebra:
        'uma cliente me perguntou onde a peça era feita e eu não tinha nenhuma imagem para mostrar',
      virada:
        'passei a gravar o lugar onde a decisão acontece e a dizer qual decisão é — não a fábrica bonita, a decisão',
      licao: 'bastidor sem a decisão é vídeo de fábrica; com a decisão, é autoridade',
    },
    arcosSugeridos: ['historia_completa', 'conversa'],
    contexto: ['produção', 'bastidor', 'prazo', 'equipe', 'galpão', 'fábrica', 'corte', 'costura', 'tecido', 'máquina', 'oficina'],
  },
  /* --------------------------------------------- contexto: quem você é -- */
  /*
   * Os temas deste eixo não falam de operação, e é por isso que eles existem.
   *
   * Vinte e um temas de margem, grade, canal e prazo fazem um perfil que ensina
   * e não é acompanhado — porque quem chega quer saber, antes de qualquer conta,
   * quem é a pessoa que está falando, em que momento da vida ela está, o que ela
   * está tentando resolver e de onde ela veio. Sem isso, o perfil é um manual
   * com foto, e manual ninguém segue: consulta.
   *
   * Eles são escritos de propósito com o específico ficando de fora, do mesmo
   * jeito que `erro` e `provaSocial`: o gerador não tem como saber o número de
   * anos, o nome da pessoa nem o aperto do mês. Essa parte entra na gravação —
   * e é justamente ela que não pode ser inventada por um gerador.
   */
  {
    id: 'quem-eu-sou-hoje',
    titulo: 'Quem eu sou e em que momento eu estou',
    eixo: 'contexto',
    alavanca: 'Momento de vida e de operação',
    promessa:
      'Antes de você decidir se vale ouvir o que eu falo de margem, vale saber de onde eu estou falando.',
    pergunta: 'Quem é a pessoa que está te ensinando isso, e em que momento ela está?',
    oQueMostrar: 'o lugar de onde você trabalha todo dia, sem arrumar nada antes',
    dadoQueProva:
      'quanto tempo você está nisso e quantas coleções já passaram pela sua mão (diga os números)',
    acaoUtil: [
      'Escreva em uma frase em que momento o seu negócio está hoje.',
      'Escreva em outra frase onde ele estava há dois anos.',
      'A diferença entre as duas frases é o seu contexto — e é isso que a sua audiência não sabe.',
    ],
    prazoReal: 'o fim deste ano, quando esse momento já vai ser outro',
    opcoesDeEnquete: ['Ninguém sabe em que momento eu estou', 'Eu mesmo não sei dizer'],
    perguntaFinal: 'E você, em que momento do seu negócio está hoje?',
    opcoesFinais: ['Começando agora', 'Crescendo e apertado', 'Estruturando para escalar'],
    reflexao: {
      noAutomatico: 'posta conteúdo técnico todo dia e nunca diz quem você é',
      oQueNinguemVe:
        'ninguém aprende com quem não sabe de onde está falando. A pessoa precisa do seu contexto para calibrar o seu conselho — e sem ele, ela escuta você igual escuta um anúncio',
      oJeitoCerto:
        'conte o seu momento de vida uma vez por semana, de maneira indireta: gravando o que você está fazendo e por que está fazendo agora',
    },
    rotina:
      'você abrindo a loja ou a produção de manhã, com o celular na mão e sem roteiro nenhum',
    usufruto:
      'o lugar de onde você grava hoje, que não existia quando você começou',
    provaSocial:
      'a mensagem de alguém dizendo em que momento ESTÁ, depois de você contar o seu',
    historia: {
      cenaNormal: 'descreva como era a sua semana de trabalho há dois anos, em uma frase',
      quebra: 'conte o que mudou, e o que isso obrigou você a aprender',
      virada: 'conte o que você passou a fazer diferente a partir dali',
      licao: 'o que esse momento te ensinou sobre o próximo, em uma frase',
    },
    arcosSugeridos: ['historia_completa', 'caixinha_do_dia', 'triade_curta'],
    contexto: ['aniversário', 'balanço', 'ano', 'retrospectiva'],
  },
  {
    id: 'por-que-eu-ensino',
    titulo: 'Por que eu ensino isso em vez de só operar',
    eixo: 'contexto',
    alavanca: 'Objetivo e motivo',
    promessa: 'Eu não ensino margem porque é bonito. Eu ensino porque perder margem quase me tirou do jogo.',
    pergunta: 'Por que alguém que tem uma operação para rodar passa o dia ensinando outra pessoa?',
    oQueMostrar: 'a sua mesa com as duas coisas em cima: a operação e o material de aula',
    dadoQueProva:
      'quantos donos de loja já te mandaram a mesma dúvida este mês (diga o número)',
    acaoUtil: [
      'Escreva por que você faz o que faz, sem usar a palavra "paixão".',
      'Escreva o que você quer que mude no seu mercado.',
      'Se as duas frases não conversam, uma das duas é mentira.',
    ],
    prazoReal: 'o tempo que leva para um dono de loja quebrar por não saber a margem',
    opcoesDeEnquete: ['Nunca contei por que faço isso', 'Contei uma vez, há muito tempo'],
    perguntaFinal: 'E você, por que escolheu vender moda e não outra coisa?',
    opcoesFinais: ['Caiu no colo', 'Sempre quis', 'Era o que dava para fazer na época'],
    reflexao: {
      noAutomatico: 'acha que falar do seu objetivo é autopromoção e por isso nunca fala',
      oQueNinguemVe:
        'ninguém compra de quem não tem motivo visível. O seu objetivo é o que faz o seu conteúdo técnico parar de parecer dica solta e começar a parecer um caminho',
      oJeitoCerto:
        'diga o seu objetivo junto com o conteúdo, não em um story separado de missão e valores: "eu mostro isso porque eu quero que você pare de vender no prejuízo sem saber"',
    },
    rotina: 'você gravando aula de madrugada, com o café frio do lado',
    historia: {
      cenaNormal:
        'eu operava e não falava com ninguém sobre operação, porque achava que era obrigação de todo mundo saber',
      quebra:
        'comecei a receber a mesma dúvida de dono de loja, repetida, semana após semana — gente vendendo bem e quebrando',
      virada:
        'passei a gravar as respostas em vez de responder uma por uma, e organizei o que eu já fazia na operação em aula',
      licao: 'quando a mesma dúvida repete, não é dúvida: é furo de mercado',
    },
    provaSocial:
      'o print de alguém contando o que mudou na loja dele com o que aprendeu aqui',
    arcosSugeridos: ['historia_completa', 'conversa', 'reflexao_dura'],
    contexto: ['mentoria', 'aula', 'turma', 'comunidade'],
  },
  {
    id: 'o-que-eu-estou-tentando-resolver',
    titulo: 'A dificuldade que eu estou enfrentando agora',
    eixo: 'contexto',
    alavanca: 'Dificuldade do momento',
    promessa: 'Vou te contar o problema que está na minha mesa hoje, sem final feliz ainda.',
    pergunta: 'O que está difícil na minha operação neste momento, de verdade?',
    oQueMostrar: 'a tela ou a pilha que representa o problema de agora',
    dadoQueProva: 'o tamanho do problema em número, mesmo que o número seja ruim',
    acaoUtil: [
      'Escolha uma dificuldade que você está enfrentando e que não é segredo.',
      'Conte ela sem dar a solução, porque você ainda não tem.',
      'Volte nela em uma semana e conte no que deu — essa é a parte que prende.',
    ],
    prazoReal: 'o prazo que esse problema tem para ser resolvido antes de virar prejuízo',
    opcoesDeEnquete: ['Nunca mostro o que está difícil', 'Só mostro depois de resolver'],
    perguntaFinal: 'Qual é a dificuldade que está na sua mesa esta semana?',
    opcoesFinais: ['Caixa', 'Grade e estoque', 'Time e processo'],
    reflexao: {
      noAutomatico: 'só mostra o problema depois de ter resolvido, com a lição pronta',
      oQueNinguemVe:
        'problema já resolvido é propaganda. Quem assiste não se identifica com quem nunca está no meio da dificuldade — ela se identifica com quem está, e volta para saber no que deu',
      oJeitoCerto:
        'conte a dificuldade ENQUANTO ela está acontecendo, escolhendo uma que você se sente confortável de abrir. E volte nela depois com o resultado',
    },
    rotina: 'você sentado olhando o problema sem fazer nada, porque ainda não sabe o que fazer',
    provaSocial:
      'o print de outro dono de loja dizendo que está no mesmo aperto',
    erro:
      'conte um aperto parecido que você já teve e resolveu errado, e quanto custou',
    historia: {
      cenaNormal: 'descreva como a operação estava rodando antes deste problema aparecer',
      quebra: 'conte o problema de agora, com o tamanho dele, sem dar solução',
      virada: 'conte o que você já tentou até aqui, inclusive o que não funcionou',
      licao: 'o que esse problema já te ensinou, mesmo sem estar resolvido',
    },
    ancora: {
      gesto: 'contar o problema no dia do problema, antes de ter a solução',
      frase: 'problema já resolvido é propaganda',
    },
    arcosSugeridos: ['historia_do_dia', 'diario', 'conversa'],
    contexto: ['pico', 'atraso', 'greve', 'fornecedor', 'caixa'],
  },
  {
    id: 'como-eu-combato',
    titulo: 'O que eu faço todo dia para não voltar a errar',
    eixo: 'contexto',
    alavanca: 'Disciplina e rotina',
    promessa: 'Não é talento e não é sorte. É uma rotina chata que eu não quebro.',
    pergunta: 'O que eu faço, todo dia, que me impede de repetir o erro que já me custou caro?',
    oQueMostrar: 'o gesto da sua rotina: a planilha que você abre, a volta que você dá no estoque',
    dadoQueProva: 'há quanto tempo você não quebra essa rotina (diga o número de semanas)',
    acaoUtil: [
      'Escolha o erro que mais te custou nos últimos dois anos.',
      'Escreva a única coisa que, feita toda semana, impediria ele de voltar.',
      'Marque na agenda. Mesmo dia, mesma hora, para sempre.',
    ],
    prazoReal: 'a próxima semana, quando a rotina vai testar se você mantém',
    opcoesDeEnquete: ['Minha rotina muda toda semana', 'Só olho quando o problema aparece'],
    perguntaFinal: 'Qual é a sua rotina fixa de números hoje?',
    opcoesFinais: ['Toda semana, dia marcado', 'Quando dá', 'Não tenho'],
    reflexao: {
      noAutomatico: 'resolve problema quando ele aparece, e chama isso de ser ágil',
      oQueNinguemVe:
        'operação que só reage tem o seu cansaço como limite. O que separa quem cresce de quem corre não é velocidade de resposta: é a rotina que faz o problema aparecer pequeno',
      oJeitoCerto:
        'escolha um dia e uma hora fixos para olhar os quatro números que avisam antes do faturamento, e não negocie esse horário com nada',
    },
    rotina: 'você abrindo a mesma planilha na mesma hora, de novo, sem nenhuma emoção',
    usufruto: 'os meses que passam sem susto, porque o susto aparece pequeno na segunda-feira',
    ancora: {
      gesto: 'abrir a planilha de números na segunda antes de qualquer mensagem',
      frase: 'quem não tem rotina de número tem rotina de susto',
    },
    provaSocial:
      'o print de quem copiou a sua rotina de segunda e manteve por um mês',
    historia: {
      cenaNormal: 'descreva como você trabalhava antes de ter rotina de número nenhuma',
      quebra: 'conte o susto que te obrigou a criar a rotina, e o tamanho dele',
      virada: 'conte como você montou a rotina e quanto tempo levou para ela pegar',
      licao: 'quem não tem rotina de número tem rotina de susto',
    },
    arcosSugeridos: ['ancoragem', 'colher_o_resultado', 'reflexao_dura'],
    contexto: ['rotina', 'planejamento', 'semana', 'disciplina'],
  },
  {
    id: 'de-onde-eu-vim',
    titulo: 'De onde eu vim, e por que isso explica como eu decido',
    eixo: 'contexto',
    alavanca: 'História e origem',
    promessa: 'O jeito como eu decido hoje tem endereço. Vou te levar até lá.',
    pergunta: 'O que aconteceu na minha vida que me fez olhar número antes de olhar vitrine?',
    oQueMostrar: 'uma foto antiga da operação, do primeiro lugar, da primeira arara',
    dadoQueProva: 'o tamanho de onde você começou contra o tamanho de hoje',
    acaoUtil: [
      'Procure uma foto do começo da sua operação.',
      'Conte o que estava difícil naquele dia da foto.',
      'Diga o que você aprendeu ali que ainda usa hoje.',
    ],
    prazoReal: 'o tempo que você já está nisso, e que não volta',
    opcoesDeEnquete: ['Nunca mostrei o começo', 'Tenho vergonha do começo'],
    perguntaFinal: 'Como começou a sua loja?',
    opcoesFinais: ['Em casa', 'Comprando revenda', 'Com confecção desde o início'],
    reflexao: {
      noAutomatico: 'esconde o começo pequeno porque acha que ele tira autoridade',
      oQueNinguemVe:
        'é o contrário: o começo pequeno é a única prova de que o caminho é possível. Quem só mostra o resultado de hoje parece inalcançável — e ninguém contrata quem parece inalcançável',
      oJeitoCerto:
        'mostre a foto do começo junto com a decisão que nasceu ali. Foto antiga sem a decisão é nostalgia; com a decisão, é autoridade',
    },
    rotina: 'você rolando o celular para achar a foto antiga e rindo do que encontra no caminho',
    historia: {
      cenaNormal: 'descreva como era o lugar onde você começou, em uma frase, sem embelezar',
      quebra: 'conte o aperto daquela época que te obrigou a aprender a olhar número',
      virada: 'conte o que você passou a fazer diferente a partir dali',
      licao: 'o que você aprendeu ali e ainda usa hoje, em uma frase',
    },
    usufruto: 'a operação de hoje, que é a mesma decisão daquela época repetida por anos',
    provaSocial:
      'o print de alguém contando o começo dele, depois de você contar o seu',
    erro:
      'conte o erro do começo que você só entendeu anos depois, e o que ele custou',
    arcosSugeridos: ['historia_completa', 'erro_que_custou', 'caixinha_do_dia'],
    contexto: ['aniversário', 'retrospectiva', 'ano', 'história'],
  },
  {
    id: 'o-dia-que-nao-rendeu',
    titulo: 'O dia em que eu não rendi — e o que eu fiz com ele',
    eixo: 'contexto',
    alavanca: 'Humanidade e consistência',
    promessa: 'Nem todo dia rende. Vou te mostrar o que eu faço no dia que não rende.',
    pergunta: 'O que fazer no dia em que a operação precisa de você e você não está lá?',
    oQueMostrar: 'você exatamente como está hoje, sem produzir nada antes',
    dadoQueProva: 'o que ainda foi feito hoje, mesmo no dia ruim',
    acaoUtil: [
      'Escolha o mínimo que você faz mesmo nos dias ruins.',
      'Deixe isso escrito como regra, não como intenção.',
      'No próximo dia ruim, faça só o mínimo e conte que fez.',
    ],
    prazoReal: 'o fim deste dia, que termina do mesmo jeito se você render ou não',
    opcoesDeEnquete: ['Dia ruim eu paro tudo', 'Dia ruim eu me cobro mais e piora'],
    perguntaFinal: 'O que você faz no dia em que não rende?',
    opcoesFinais: ['Paro', 'Faço o mínimo', 'Me cobro em dobro'],
    reflexao: {
      noAutomatico: 'esconde o dia ruim e só aparece quando está bem',
      oQueNinguemVe:
        'perfil que só aparece bem não gera identificação, gera distância. O que aproxima é ver você no dia ruim fazendo o mínimo — porque é isso que quem assiste também precisa aprender a fazer',
      oJeitoCerto:
        'mostre o dia ruim no dia ruim, e volte no fim do dia contando no que deu. Mas escolha com cuidado: isso é fraqueza do momento, não é ferida aberta',
    },
    rotina: 'você mostrando a cara sem filtro e dizendo que hoje é um daqueles dias',
    historia: {
      cenaNormal: 'descreva como são os seus dias normais de trabalho',
      quebra: 'conte como você acordou neste dia específico, e o que estava pesando',
      virada: 'conte o mínimo que você fez mesmo assim, e em que hora do dia virou',
      licao: 'consistência não é render todo dia; é ter um mínimo que você não negocia',
    },
    provaSocial:
      'o print de alguém dizendo que também teve um dia desses nesta semana',
    erro:
      'conte uma vez em que você se cobrou em dobro num dia ruim e piorou tudo',
    ancora: {
      gesto: 'fazer o mínimo no dia em que você não está rendendo',
      frase: 'consistência não é render todo dia, é ter um mínimo que você não negocia',
    },
    arcosSugeridos: ['historia_do_dia', 'diario', 'respiro'],
    contexto: ['semana', 'cansaço', 'pico', 'rotina'],
  },
  {
    id: 'quem-esta-do-meu-lado',
    titulo: 'As pessoas que fazem isso funcionar comigo',
    eixo: 'contexto',
    alavanca: 'Time e pessoas',
    promessa: 'Nada que eu te mostro aqui é feito por uma pessoa só. Vou te apresentar quem faz.',
    pergunta: 'Quem toma as decisões que você acha que sou eu tomando?',
    oQueMostrar: 'a pessoa da equipe fazendo a parte dela, com a autorização dela',
    dadoQueProva: 'quantas decisões por semana passam por essa pessoa e não por você',
    acaoUtil: [
      'Liste três decisões que alguém da sua equipe toma sem te perguntar.',
      'Se a lista estiver vazia, o problema não é o time: é o limite que ninguém escreveu.',
      'Escreva um limite hoje e avise a pessoa.',
    ],
    prazoReal: 'a próxima semana de pico, quando você não vai dar conta sozinho',
    opcoesDeEnquete: ['Decido tudo sozinho', 'Delego e refaço depois'],
    perguntaFinal: 'Quantas decisões a sua equipe toma sem te perguntar?',
    opcoesFinais: ['Nenhuma', 'Algumas', 'A maioria do operacional'],
    reflexao: {
      noAutomatico: 'aparece como se a operação fosse você sozinho, porque é mais simples de contar',
      oQueNinguemVe:
        'isso te coloca num pedestal que atrapalha: quem assiste acha que precisa ser você para conseguir, e desiste. E a sua equipe, que fez o trabalho, não aparece',
      oJeitoCerto:
        'mostre a pessoa fazendo e diga qual decisão é dela. Com autorização, e respeitando quem não quer aparecer',
    },
    rotina: 'você chamando alguém da equipe para a câmera e a pessoa fugindo do enquadramento',
    usufruto: 'a semana que roda inteira sem você precisar responder nada',
    provaSocial:
      'o depoimento de alguém da sua equipe sobre a decisão que é dela',
    arcosSugeridos: ['bastidor_puro', 'prova_primeiro', 'caixinha_do_dia'],
    contexto: ['equipe', 'time', 'contratação', 'processo'],
  },
  {
    id: 'o-que-eu-nao-mostro',
    titulo: 'O que eu escolho não mostrar aqui',
    eixo: 'contexto',
    alavanca: 'Limite da exposição',
    promessa: 'Eu abro bastante da operação. Vou te contar o que eu não abro, e por quê.',
    pergunta: 'Até onde vale expor a sua vida e a sua empresa para criar conteúdo?',
    oQueMostrar: 'você falando com a câmera, sem nenhum apoio visual — o assunto é a regra',
    dadoQueProva: 'quantas vezes você já se arrependeu de ter mostrado algo (diga honestamente)',
    acaoUtil: [
      'Escreva três coisas que você não vai mostrar no seu perfil, nunca.',
      'Escreva o nome de quem está na sua vida e não quer aparecer.',
      'Respeite as duas listas, mesmo quando o conteúdo ficaria melhor.',
    ],
    prazoReal: 'o próximo dia em que você vai ter vontade de postar algo que não devia',
    opcoesDeEnquete: ['Já mostrei coisa que me arrependi', 'Não mostro nada e não conecto'],
    perguntaFinal: 'Onde está o seu limite de exposição?',
    opcoesFinais: ['Operação sim, família não', 'Tudo que for útil', 'Ainda estou descobrindo'],
    reflexao: {
      noAutomatico: 'pensa em exposição como um botão: ou abre tudo, ou não abre nada',
      oQueNinguemVe:
        'os dois extremos custam. Fechado demais não gera vínculo nenhum; aberto demais transforma o seu perfil no lugar da sua terapia, e isso cansa quem assiste e machuca quem está perto de você',
      oJeitoCerto:
        'defina a linha antes, por escrito: o que é seu para mostrar, o que é de outra pessoa e o que é ferida aberta. Fraqueza do momento pode; ferida aberta não',
    },
    rotina: 'você começando a gravar, parando no meio e apagando',
    provaSocial:
      'o print de outro criador contando onde ele traçou a linha dele',
    usufruto:
      'a tranquilidade de abrir a operação todo dia sem ter medo do que você mostrou',
    arcosSugeridos: ['reflexao_dura', 'caixinha_do_dia', 'triade_curta'],
    contexto: ['família', 'equipe', 'privacidade'],
  },
]

export const TEMAS_POR_ID = new Map(TEMAS.map((tema) => [tema.id, tema]))
