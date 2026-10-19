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

export type Eixo = 'autoridade' | 'humanidade' | 'ensino' | 'conexao'

export const ROTULO_DE_EIXO: Record<Eixo, string> = {
  autoridade: 'Autoridade',
  humanidade: 'Humanidade e história',
  ensino: 'Ensino prático',
  conexao: 'Conexão e conversa',
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
  /** Erro próprio, com custo. Alimenta o gatilho de vulnerabilidade. */
  erro?: string
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
    arcosSugeridos: ['contraste_curto', 'ensino_rapido'],
    contraste: {
      comum: 'segurar a peça esperando vender pelo preço justo',
      queFunciona: 'uma régua de desconto por tempo de estoque, decidida antes de a peça encalhar',
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
    dadoQueProva: 'a taxa de devolução dos seus três produtos campeões, em porcentagem',
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
    dadoQueProva: 'o prazo médio de entrega seu contra o do importado, e a sua taxa de troca resolvida',
    acaoUtil: [
      'Liste três coisas que você faz e o importado não: prazo, troca, prova, atendimento.',
      'Escolha a mais forte e coloque na página de produto, não no rodapé.',
      'Teste por 15 dias e olhe a conversão.',
    ],
    prazoReal: 'a mudança tributária que acabou de tirar a diferença de preço que te protegia',
    opcoesDeEnquete: ['Baixei preço para competir', 'Perdi venda e não sei para onde foi'],
    perguntaFinal: 'Qual é a sua vantagem real contra o importado?',
    opcoesFinais: ['Prazo de entrega', 'Troca sem dor', 'Qualidade e caimento'],
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
    arcosSugeridos: ['historia', 'conversa'],
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
    dadoQueProva: 'o prazo de reposição seu contra o de quem compra pronto',
    acaoUtil: [
      'Liste o que trava sua operação hoje: prazo, qualidade, exclusividade ou custo.',
      'Produzir resolve prazo e exclusividade. Não resolve custo no começo.',
      'Se o seu gargalo é custo, produzir é a resposta errada.',
    ],
    prazoReal: 'o tempo até a primeira coleção própria se pagar',
    opcoesDeEnquete: ['Dependo totalmente de fornecedor', 'Já pensei em produzir e travei'],
    perguntaFinal: 'O que mais te trava hoje na sua operação?',
    opcoesFinais: ['Prazo do fornecedor', 'Falta de exclusividade', 'Custo da peça'],
    arcosSugeridos: ['historia', 'conversa'],
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
    arcosSugeridos: ['historia', 'conversa'],
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
    arcosSugeridos: ['historia', 'conversa'],
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
    dadoQueProva: 'a sua data-limite de compra, de foto e de preço para a próxima campanha',
    acaoUtil: [
      'Pegue a próxima data grande do seu calendário.',
      'Conte para trás: entrega, produção, compra, decisão de mix.',
      'A primeira data dessa lista é hoje ou já passou.',
    ],
    prazoReal: 'o prazo do seu fornecedor, que encurta conforme a data se aproxima',
    opcoesDeEnquete: ['Começo a planejar no mês da data', 'Planejo, mas não cumpro o cronograma'],
    perguntaFinal: 'Para a próxima data grande, o que ainda não está resolvido?',
    opcoesFinais: ['Mix de produto', 'Quantidade', 'Preço', 'Foto e conteúdo'],
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
    dadoQueProva: 'o prazo real da sua transportadora por região, não o do site',
    acaoUtil: [
      'Pegue o prazo real de entrega por região do último mês.',
      'Conte para trás a partir da data da campanha.',
      'Publique essa data no site antes que ela chegue.',
    ],
    prazoReal: 'a própria data de corte, que passa sem avisar',
    opcoesDeEnquete: ['Prometo prazo que não cumpro', 'Não sei meu prazo real por região'],
    perguntaFinal: 'Você já definiu sua data de corte da próxima campanha?',
    opcoesFinais: ['Já publiquei', 'Sei mas não comuniquei', 'Nem pensei nisso'],
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
    dadoQueProva: 'o custo da embalagem por pedido contra o seu custo de aquisição de cliente',
    acaoUtil: [
      'Peça um pedido seu para a sua própria casa.',
      'Abra como se fosse cliente e filme.',
      'Tudo que te decepcionar, decepciona ela também.',
    ],
    prazoReal: 'a próxima data de presente do calendário',
    opcoesDeEnquete: ['Uso saco plástico simples', 'Nunca recebi um pedido meu'],
    perguntaFinal: 'Quando foi a última vez que você abriu um pedido da sua loja?',
    opcoesFinais: ['Esse mês', 'Faz tempo', 'Nunca fiz isso'],
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
    arcosSugeridos: ['historia', 'conversa'],
    contexto: ['produção', 'bastidor', 'prazo', 'equipe', 'galpão', 'fábrica', 'corte', 'costura', 'tecido', 'máquina', 'oficina'],
  },
]

export const TEMAS_POR_ID = new Map(TEMAS.map((tema) => [tema.id, tema]))
