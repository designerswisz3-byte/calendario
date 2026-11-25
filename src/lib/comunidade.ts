/**
 * O calendário de temas da comunidade de WhatsApp.
 *
 * ----------------------------------------------------------------------------
 * O problema que ele resolve
 * ----------------------------------------------------------------------------
 * Comunidade morre de duas formas: silêncio e improviso. No silêncio, ninguém
 * abre o grupo. No improviso, o dono abre o grupo todo dia sem saber do que
 * falar, repete o assunto que está na cabeça e, em um mês, falou cinco vezes de
 * tráfego e nenhuma de caixa.
 *
 * Este arquivo é a pauta: UM tema por semana, e dentro dele um subtema por
 * dia. A semana inteira bate na mesma tecla por ângulos diferentes, que é como
 * um assunto deixa de ser dica e vira entendimento.
 *
 * ----------------------------------------------------------------------------
 * A ordem dos temas não é alfabética
 * ----------------------------------------------------------------------------
 * Segue a hierarquia de decisão de quem toca e-commerce de moda: primeiro o
 * que protege a margem (margem, preço, canal), depois o que prende dinheiro
 * (estoque, compra, frete, devolução, caixa), e só então o que traz venda
 * (tráfego, marca, recompra) e o que permite escalar (gestão). Ensinar tráfego
 * antes de margem é ensinar a acelerar um carro que vaza óleo.
 *
 * ----------------------------------------------------------------------------
 * O que NÃO está aqui, de propósito
 * ----------------------------------------------------------------------------
 * Nenhuma estatística de mercado. Todo "como abordar" pede que ele mostre a
 * conta DELE ou que o grupo traga o número de cada um. Dado inventado num
 * grupo de donos de loja é descoberto por alguém em dez minutos — e leva a
 * autoridade junto.
 */

/** 5 = mexe direto na margem ou no caixa. 3 = melhora, mas não decide o mês. */
export type Importancia = 3 | 4 | 5

export interface Subtema {
  /** Estável: é o que fica gravado quando ele marca "falei sobre esse tema". */
  id: string
  titulo: string
  /** O que fazer no grupo: formato, pergunta, o que mostrar. */
  comoAbordar: string
  importancia: Importancia
  /** Por que isto importa para quem gere um e-commerce — em uma linha. */
  porQue: string
}

export interface Tema {
  id: string
  nome: string
  /** A ideia que costura os sete dias. */
  fio: string
  /** Sete, de segunda a domingo. */
  subtemas: Subtema[]
}

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

export const TEMAS: Tema[] = [
  {
    id: 'margem',
    nome: 'Margem de verdade',
    fio: 'Faturamento não paga boleto. A semana inteira gira em torno de uma conta só: quanto sobra por pedido.',
    subtemas: [
      {
        id: 'margem-faturamento-nao-e-resultado',
        titulo: 'Faturamento não é resultado',
        comoAbordar:
          'Abra com uma pergunta seca: "Quanto sobrou no seu bolso mês passado — não quanto vendeu?". Peça só o número ou um "não sei". Os "não sei" são o gancho da semana: todo mundo sabe o faturamento de cabeça, quase ninguém sabe a sobra.',
        importancia: 5,
        porQue: 'É a confusão que faz a loja crescer em venda e encolher em dinheiro.',
      },
      {
        id: 'margem-conta-por-pedido',
        titulo: 'A conta da margem por pedido',
        comoAbordar:
          'Mande a conta em uma linha: preço − custo da peça − comissão − frete − imposto − embalagem − devolução rateada. Faça com uma peça sua, número por número, e peça que cada um repita com o produto que mais vende e poste o que sobrou.',
        importancia: 5,
        porQue: 'Sem essa conta, toda decisão de preço, desconto e anúncio é chute.',
      },
      {
        id: 'margem-campeao-que-da-prejuizo',
        titulo: 'O campeão de vendas que dá prejuízo',
        comoAbordar:
          'Conte um caso seu de produto que vendia muito e deixava pouco. Depois o exercício: cada um lista os três mais vendidos e calcula a sobra de cada. Feche perguntando: "algum deles te surpreendeu?".',
        importancia: 5,
        porQue: 'O produto que mais vende é o que mais multiplica o erro de margem.',
      },
      {
        id: 'margem-custos-invisiveis',
        titulo: 'Os custos que ninguém põe na conta',
        comoAbordar:
          'Enquete: "qual destes você NÃO coloca no custo do pedido?" — embalagem, brinde, tarifa do meio de pagamento, antecipação, devolução. Depois do resultado, explique em áudio curto quanto cada um come de uma venda sua.',
        importancia: 4,
        porQue: 'São pequenos por pedido e grandes no mês — e não aparecem em nenhum relatório de venda.',
      },
      {
        id: 'margem-por-canal',
        titulo: 'A mesma peça, uma margem em cada canal',
        comoAbordar:
          'Pegue uma peça e mostre a sobra dela no site, no marketplace e no atacado, lado a lado. Pergunta para o grupo: "você sabe qual canal te paga melhor POR PEÇA?". Quem souber, conta como descobriu.',
        importancia: 5,
        porQue: 'O canal que mais fatura nem sempre é o que mais deixa dinheiro.',
      },
      {
        id: 'margem-desconto-sem-conta',
        titulo: 'O desconto dado sem fazer conta',
        comoAbordar:
          'Faça a conta em áudio, com uma peça sua: com este desconto, quantas peças a mais eu preciso vender para sobrar o mesmo? Peça que cada um faça com o último cupom que soltou e diga se a venda extra apareceu.',
        importancia: 4,
        porQue: 'Desconto sai inteiro da margem, não do faturamento.',
      },
      {
        id: 'margem-preco-minimo-da-semana',
        titulo: 'Fechamento: o preço mínimo de um produto',
        comoAbordar:
          'Desafio de domingo: cada um escolhe UM produto e define o preço abaixo do qual não vende — nem em liquidação. Peça que postem o produto e o número. Na segunda, comente os três mais interessantes.',
        importancia: 4,
        porQue: 'Quem não tem piso de preço descobre o prejuízo depois da promoção.',
      },
    ],
  },
  {
    id: 'preco',
    nome: 'Preço que se sustenta',
    fio: 'Preço é decisão de margem antes de ser decisão de mercado. Primeiro o piso, depois o concorrente.',
    subtemas: [
      {
        id: 'preco-minimo-antes-do-preco',
        titulo: 'Preço mínimo vem antes do preço de venda',
        comoAbordar:
          'Pergunte como cada um chega no preço: "custo vezes quanto?", "olho o concorrente?", "no feeling?". Deixe responderem antes de opinar. Depois mostre a ordem certa: primeiro o piso que cobre tudo, depois quanto o mercado aceita acima dele.',
        importancia: 5,
        porQue: 'Preço montado de cima para baixo esconde o produto que não deveria existir.',
      },
      {
        id: 'preco-markup-nao-e-margem',
        titulo: 'Markup não é margem',
        comoAbordar:
          'Mande duas linhas: markup multiplica o custo da peça; margem é o que sobra depois de TUDO. Faça com uma peça sua: o markup que você usa e a margem que ele realmente deixou. Peça o mesmo par de números de cada um.',
        importancia: 5,
        porQue: 'É por confundir os dois que "vendo pelo dobro" vira "não sobra nada".',
      },
      {
        id: 'preco-copiar-concorrente',
        titulo: 'Copiar o preço do concorrente',
        comoAbordar:
          'Provocação: "você copia o preço dele, mas não tem o custo dele". Liste o que você não enxerga do outro lado — volume de compra, prazo com fornecedor, frete negociado. Pergunte quem já baixou preço para acompanhar e o que aconteceu com o mês.',
        importancia: 4,
        porQue: 'Guerra de preço é vencida por quem tem o menor custo, não por quem tem mais coragem.',
      },
      {
        id: 'preco-quando-subir',
        titulo: 'Quando subir o preço — e como contar',
        comoAbordar:
          'Conte uma vez em que você subiu preço: o que mediu antes, quanto subiu, o que aconteceu com a venda. Depois pergunte: "qual produto seu aguenta um aumento e você está com medo de testar?".',
        importancia: 4,
        porQue: 'Aumento pequeno em produto que gira é o ganho de margem mais rápido que existe.',
      },
      {
        id: 'preco-kit-e-ticket',
        titulo: 'Kit, combo e ticket médio',
        comoAbordar:
          'Mostre a conta de um pedido de uma peça e de um pedido de duas: o frete e a embalagem quase não mudam, a sobra muda muito. Peça que cada um diga o ticket médio e monte ali no grupo um kit com o que já tem em estoque.',
        importancia: 4,
        porQue: 'Custo fixo por pedido se dilui quando o carrinho cresce.',
      },
      {
        id: 'preco-ancora-e-arredondamento',
        titulo: 'Âncora, de/por e arredondamento',
        comoAbordar:
          'Mande duas vitrines da mesma peça — uma só com o preço, outra com âncora — e pergunte qual parece mais barata. Explique o que é âncora honesta e o que é "de/por" inventado, que derruba confiança e pode dar problema.',
        importancia: 3,
        porQue: 'Muda a percepção do preço sem tirar um centavo da margem.',
      },
      {
        id: 'preco-revisar-um-produto',
        titulo: 'Fechamento: revisar o preço de um produto',
        comoAbordar:
          'Desafio: escolher um produto, refazer piso, margem e preço, e postar antes e depois. Quem mudar o preço de verdade na loja volta na sexta contando o que aconteceu com a venda.',
        importancia: 4,
        porQue: 'Tema de preço só vira resultado quando alguém altera uma etiqueta.',
      },
    ],
  },
  {
    id: 'canais',
    nome: 'Marketplace sem ilusão',
    fio: 'Marketplace é vitrine alugada: dá volume, cobra pedágio e muda a regra quando quer. A semana é sobre usar sem depender.',
    subtemas: [
      {
        id: 'canais-quanto-fica-com-o-marketplace',
        titulo: 'Quanto o marketplace fica de cada venda',
        comoAbordar:
          'Abra um pedido seu e some tudo o que saiu: comissão, taxa fixa, frete, anúncio. Mostre o total em reais e em parte do preço. Peça que cada um faça com o último pedido e poste só o percentual final.',
        importancia: 5,
        porQue: 'A comissão anunciada nunca é o custo total do canal.',
      },
      {
        id: 'canais-dependencia-de-um-so',
        titulo: 'Depender de um canal só',
        comoAbordar:
          'Enquete: "quanto do seu faturamento vem do seu maior canal?" — até um terço, até metade, mais da metade, quase tudo. Depois conte o que acontece com uma operação quando a regra daquele canal muda de um mês para o outro.',
        importancia: 5,
        porQue: 'Concentração de receita é risco que só aparece no dia em que a regra muda.',
      },
      {
        id: 'canais-anuncio-dentro-do-marketplace',
        titulo: 'Anúncio patrocinado dentro do marketplace',
        comoAbordar:
          'Explique em texto curto: o custo do anúncio entra na conta da margem como qualquer outro. Mostre um anúncio seu — quanto gastou, quanto vendeu, quanto sobrou depois da comissão. Pergunte quem olha a sobra e quem olha só a venda.',
        importancia: 4,
        porQue: 'Patrocinado em produto de margem curta transforma venda em prejuízo com aparência de crescimento.',
      },
      {
        id: 'canais-reputacao-e-prazo',
        titulo: 'Reputação, prazo e cancelamento',
        comoAbordar:
          'Liste os indicadores que derrubam a vitrine de um vendedor: atraso de envio, cancelamento, reclamação. Peça um print (sem dados sensíveis) da reputação de cada um e ajude a ler o que está puxando para baixo.',
        importancia: 4,
        porQue: 'Reputação é o que decide quanto do tráfego do canal chega no seu anúncio.',
      },
      {
        id: 'canais-preco-por-canal',
        titulo: 'O mesmo preço em todo canal?',
        comoAbordar:
          'Pergunta aberta: "seu preço é igual no site e no marketplace?". Deixe o debate rolar e depois mostre a sua regra — como o custo de cada canal entra no preço daquele canal — e o cuidado com as políticas de paridade de cada plataforma.',
        importancia: 4,
        porQue: 'Preço único em canais de custo diferente garante margem ruim em pelo menos um deles.',
      },
      {
        id: 'canais-marca-procurada-pelo-nome',
        titulo: 'Ser procurado pelo nome',
        comoAbordar:
          'Sem burlar regra de plataforma: o que faz o cliente do marketplace lembrar da marca? Embalagem, etiqueta, qualidade, atendimento. Mostre o que vai dentro do seu pacote e peça fotos dos pacotes do grupo.',
        importancia: 3,
        porQue: 'Cliente que procura a marca pelo nome é o único que o canal não consegue tirar de você.',
      },
      {
        id: 'canais-mapa-de-canais',
        titulo: 'Fechamento: o mapa de canais',
        comoAbordar:
          'Desafio: uma tabela de três colunas — canal, quanto representa da venda, quanto sobra por pedido. Peça que postem. Você comenta onde cada um está pondo energia demais para o que o canal devolve.',
        importancia: 4,
        porQue: 'É a foto que mostra onde o esforço e o retorno estão desalinhados.',
      },
    ],
  },
  {
    id: 'estoque',
    nome: 'Estoque e giro',
    fio: 'Estoque parado é dinheiro que você já pagou e ainda não recebeu de volta.',
    subtemas: [
      {
        id: 'estoque-cheio-e-vazio',
        titulo: 'Estoque cheio e vazio ao mesmo tempo',
        comoAbordar:
          'Descreva a cena: prateleira lotada e o cliente pedindo justamente o tamanho que acabou. Pergunte: "qual produto seu está em falta HOJE no tamanho que mais sai?". As respostas mostram que ruptura e sobra moram na mesma loja.',
        importancia: 5,
        porQue: 'Ruptura perde a venda; sobra prende o caixa. As duas acontecem juntas.',
      },
      {
        id: 'estoque-giro-em-dias',
        titulo: 'Giro: em quantos dias o estoque vira dinheiro',
        comoAbordar:
          'Explique a conta simples: estoque atual dividido pela venda média do período. Faça com uma categoria sua e diga o número em dias. Peça que cada um calcule uma categoria e compare com o prazo que paga o fornecedor.',
        importancia: 5,
        porQue: 'Se o estoque gira mais devagar do que o boleto vence, o caixa financia a prateleira.',
      },
      {
        id: 'estoque-grade-de-tamanhos',
        titulo: 'A grade de tamanhos certa',
        comoAbordar:
          'Mostre como você decide a grade: o que vendeu por tamanho na última coleção, não a grade padrão do fornecedor. Peça que cada um diga qual tamanho sempre sobra e qual sempre falta — e se a próxima compra já reflete isso.',
        importancia: 5,
        porQue: 'Em moda, grade errada é a maior fábrica de peça parada.',
      },
      {
        id: 'estoque-curva-abc',
        titulo: 'Curva ABC sem planilha complicada',
        comoAbordar:
          'Ensine em áudio de dois minutos: ordene os produtos pela venda, veja os poucos que fazem a maior parte do resultado e os muitos que quase não vendem. Peça que cada um diga quantos produtos tem e quantos fazem a maior parte da venda.',
        importancia: 4,
        porQue: 'Mostra onde a atenção e o dinheiro de reposição deveriam estar.',
      },
      {
        id: 'estoque-peca-parada',
        titulo: 'Peça parada: quando liquidar',
        comoAbordar:
          'Conte a sua regra: depois de quanto tempo parada a peça entra em ação, e em que degraus o preço cai. Pergunte: "qual é a peça mais antiga do seu estoque e por que ela ainda está lá?".',
        importancia: 4,
        porQue: 'Cada mês que a peça fica parada ela vale menos e ocupa o lugar de uma que venderia.',
      },
      {
        id: 'estoque-inventario-e-furo',
        titulo: 'Inventário e furo de estoque',
        comoAbordar:
          'Pergunte quem já vendeu o que não tinha. Depois mostre a sua rotina de contagem — de quanto em quanto tempo, quem conta, o que faz com a diferença. Curto e prático: um checklist de cinco linhas.',
        importancia: 3,
        porQue: 'Furo de estoque vira cancelamento, e cancelamento derruba reputação.',
      },
      {
        id: 'estoque-lista-dos-parados',
        titulo: 'Fechamento: a lista dos dez parados',
        comoAbordar:
          'Desafio: levantar os dez produtos há mais tempo sem vender e somar quanto dinheiro está preso neles. Peça só o valor total. O número costuma chocar — e é o gancho para a ação de liquidação.',
        importancia: 4,
        porQue: 'Dar valor em reais ao estoque parado é o que faz a decisão sair.',
      },
    ],
  },
  {
    id: 'compras',
    nome: 'Compra e coleção',
    fio: 'O lucro da coleção é decidido na compra, meses antes da primeira venda.',
    subtemas: [
      {
        id: 'compras-gosto-ou-dado',
        titulo: 'Comprar por gosto ou comprar por dado',
        comoAbordar:
          'Pergunta provocativa: "qual peça você comprou porque AMOU e encalhou?". Deixe contarem. Depois mostre o que você olha antes de comprar: o que vendeu, em que tamanho, em que faixa de preço.',
        importancia: 5,
        porQue: 'O gosto do dono não é o gosto de quem compra.',
      },
      {
        id: 'compras-quanto-comprar',
        titulo: 'Quanto comprar: o orçamento de compra',
        comoAbordar:
          'Explique a lógica em três passos: quanto pretendo vender, quanto estoque já tenho, quanto falta comprar. Faça com números de uma categoria sua. Pergunte quem define o valor da compra antes de ir ao fornecedor.',
        importancia: 5,
        porQue: 'Compra sem teto é a origem do estoque parado e do caixa apertado.',
      },
      {
        id: 'compras-testar-antes',
        titulo: 'Testar antes de apostar',
        comoAbordar:
          'Conte um caso de lote pequeno que virou reposição grande — e um que você ainda bem que comprou pouco. Pergunte ao grupo qual foi a última aposta grande e se havia como testar antes.',
        importancia: 4,
        porQue: 'Lote pequeno custa mais por peça e muito menos por erro.',
      },
      {
        id: 'compras-prazo-ou-desconto',
        titulo: 'Negociar prazo ou negociar desconto',
        comoAbordar:
          'Enquete: "no fornecedor você pede desconto ou prazo?". Depois mostre a conta dos dois lados com um pedido seu: o que o desconto dá na margem e o que o prazo dá no caixa.',
        importancia: 4,
        porQue: 'Prazo de fornecedor é o capital de giro mais barato que existe.',
      },
      {
        id: 'compras-reposicao',
        titulo: 'Repor ou deixar morrer',
        comoAbordar:
          'Mostre o seu critério para repor: velocidade de venda, margem e tempo de reposição do fornecedor. Peça que cada um cite um produto que deveria ter reposto e um que repôs por insistência.',
        importancia: 4,
        porQue: 'Repor o que gira dá mais resultado do que lançar novidade.',
      },
      {
        id: 'compras-calendario-de-colecao',
        titulo: 'O calendário da coleção',
        comoAbordar:
          'Desenhe em texto a sua linha do tempo: quando compra, quando chega, quando fotografa, quando lança, quando liquida. Pergunte em qual etapa cada um sempre atrasa.',
        importancia: 3,
        porQue: 'Coleção que chega atrasada já nasce em promoção.',
      },
      {
        id: 'compras-pos-venda-da-colecao',
        titulo: 'Fechamento: o balanço da última coleção',
        comoAbordar:
          'Desafio: três números da última coleção — quanto foi comprado, quanto vendeu a preço cheio, quanto sobrou. Peça que postem. É o retrato que orienta a próxima compra.',
        importancia: 4,
        porQue: 'Quem não fecha a coleção anterior repete os mesmos erros na próxima.',
      },
    ],
  },
  {
    id: 'frete',
    nome: 'Frete e entrega',
    fio: 'Frete nunca é grátis: ou o cliente paga, ou a margem paga. A semana é sobre decidir isso de propósito.',
    subtemas: [
      {
        id: 'frete-gratis-nao-existe',
        titulo: 'Frete grátis não existe',
        comoAbordar:
          'Abra com a frase e a pergunta: "quem paga o frete grátis da sua loja?". Mostre um pedido seu com frete grátis e quanto dele sobrou. O objetivo é tirar o frete do campo do marketing e pôr no campo da conta.',
        importancia: 5,
        porQue: 'Frete grátis sem regra é o desconto mais caro que a loja dá.',
      },
      {
        id: 'frete-piso-de-frete-gratis',
        titulo: 'O piso do frete grátis',
        comoAbordar:
          'Mostre como você chegou no valor mínimo do pedido para frete grátis: ticket médio, custo médio de envio e margem. Peça que cada um diga o piso que usa e o ticket médio — e veja se um conversa com o outro.',
        importancia: 5,
        porQue: 'Piso bem posto aumenta o carrinho; piso mal posto só entrega margem.',
      },
      {
        id: 'frete-prazo-prometido',
        titulo: 'Prazo prometido e prazo cumprido',
        comoAbordar:
          'Pergunte: "do pagamento à postagem, quantos dias leva na sua operação?". Depois mostre onde o tempo se perde — separação, embalagem, coleta — e o que você fez para cortar um dia.',
        importancia: 4,
        porQue: 'Prazo é critério de compra e de reputação ao mesmo tempo.',
      },
      {
        id: 'frete-tabela-de-transportadoras',
        titulo: 'Renegociar a tabela de frete',
        comoAbordar:
          'Conte como você compara transportadoras e de quanto em quanto tempo renegocia. Pergunte quando foi a última cotação de cada um. Quem cotou há mais de um ano tem lição de casa.',
        importancia: 4,
        porQue: 'Tabela de frete envelhece, e o custo sobe sem ninguém avisar.',
      },
      {
        id: 'frete-embalagem',
        titulo: 'Embalagem: custo, peso e experiência',
        comoAbordar:
          'Mostre a sua embalagem, quanto custa e quanto pesa. Explique o peso cubado em duas frases. Peça fotos das embalagens do grupo e aponte onde dá para gastar menos sem piorar a chegada.',
        importancia: 3,
        porQue: 'Embalagem maior que a peça paga frete de ar.',
      },
      {
        id: 'frete-extravio-e-reenvio',
        titulo: 'Extravio, atraso e reenvio',
        comoAbordar:
          'Pergunte quanto cada um perdeu com extravio no último trimestre — a maioria não sabe. Mostre como você registra e cobra da transportadora, e o texto que manda ao cliente enquanto resolve.',
        importancia: 3,
        porQue: 'Perda não registrada não é cobrada, e o prejuízo fica com a loja.',
      },
      {
        id: 'frete-conta-por-pedido',
        titulo: 'Fechamento: o frete médio por pedido',
        comoAbordar:
          'Desafio: somar tudo o que pagou de frete no mês e dividir pelo número de pedidos. Postar o valor e quanto ele representa do ticket médio. Você comenta quem está acima do que a margem aguenta.',
        importancia: 4,
        porQue: 'É o número que diz se a política de frete cabe na margem.',
      },
    ],
  },
  {
    id: 'devolucao',
    nome: 'Troca e devolução',
    fio: 'Em moda, devolução não é exceção: é linha de custo. Quem não mede paga sem ver.',
    subtemas: [
      {
        id: 'devolucao-quanto-custa',
        titulo: 'Quanto custa uma devolução de verdade',
        comoAbordar:
          'Some em voz alta o custo de uma devolução sua: frete de ida, frete de volta, embalagem nova, tempo da equipe, peça que volta sem condição de venda. Pergunte quem já fez essa soma.',
        importancia: 5,
        porQue: 'Devolução não desfaz só a venda: cobra frete, embalagem e tempo por cima.',
      },
      {
        id: 'devolucao-taxa-por-produto',
        titulo: 'Taxa de devolução por produto e por tamanho',
        comoAbordar:
          'Mostre como você mede: devoluções divididas por vendas, produto a produto. Conte o que descobriu quando abriu por tamanho. Peça que cada um diga se sabe qual é o produto mais devolvido da loja.',
        importancia: 5,
        porQue: 'A média esconde o produto que sozinho estraga o resultado.',
      },
      {
        id: 'devolucao-tabela-de-medidas',
        titulo: 'Tabela de medidas e foto que evitam troca',
        comoAbordar:
          'Mande o antes e depois de uma página de produto sua: tabela de medidas real da peça, modelo com altura e tamanho informados. Peça links do grupo e sugira uma melhoria em cada um.',
        importancia: 4,
        porQue: 'Troca por tamanho se resolve na página, antes da compra.',
      },
      {
        id: 'devolucao-politica-clara',
        titulo: 'Política de troca que vende',
        comoAbordar:
          'Compare duas políticas: uma longa e escondida, uma de três linhas no produto. Pergunte onde a política de cada um aparece na loja. Mostre a sua e por que ela está onde está.',
        importancia: 4,
        porQue: 'Política clara reduz dúvida antes da compra e atrito depois.',
      },
      {
        id: 'devolucao-logistica-reversa',
        titulo: 'A logística da volta',
        comoAbordar:
          'Descreva o caminho da peça devolvida na sua operação, passo a passo, e quanto tempo ela leva para voltar a estar à venda. Pergunte: "quanto tempo uma devolução fica parada na sua mesa?".',
        importancia: 3,
        porQue: 'Peça devolvida que demora a voltar para o estoque é venda perdida da estação.',
      },
      {
        id: 'devolucao-peca-que-voltou',
        titulo: 'O que fazer com a peça que voltou',
        comoAbordar:
          'Liste os destinos possíveis: volta ao estoque, segunda linha, outlet, descarte. Conte qual é o seu critério para cada um. Pergunte ao grupo o que fazem com peça que volta com sinal de uso.',
        importancia: 3,
        porQue: 'Sem critério, a peça devolvida vira estoque que ninguém sabe que existe.',
      },
      {
        id: 'devolucao-tres-mais-devolvidos',
        titulo: 'Fechamento: os três mais devolvidos',
        comoAbordar:
          'Desafio: achar os três produtos com mais devolução e o motivo de cada um. Postar produto e motivo. Feche separando o que se corrige na página do que se corrige na compra.',
        importancia: 4,
        porQue: 'É nos três piores que o esforço de correção mais rende.',
      },
    ],
  },
  {
    id: 'caixa',
    nome: 'Caixa e capital de giro',
    fio: 'Loja não fecha por falta de lucro; fecha por falta de caixa.',
    subtemas: [
      {
        id: 'caixa-lucro-no-papel',
        titulo: 'Lucro no papel, conta zerada',
        comoAbordar:
          'Abra com a pergunta: "já teve mês bom de venda em que faltou dinheiro para pagar boleto?". Deixe contarem. Depois explique a diferença entre lucro e caixa com um exemplo da sua operação.',
        importancia: 5,
        porQue: 'É a situação que quebra loja que vende bem.',
      },
      {
        id: 'caixa-ciclo-de-caixa',
        titulo: 'O ciclo de caixa',
        comoAbordar:
          'Desenhe em texto: pago o fornecedor no dia X, a peça vende no dia Y, o dinheiro entra no dia Z. Mostre o seu intervalo em dias. Peça que cada um calcule o seu, mesmo que aproximado.',
        importancia: 5,
        porQue: 'Esse intervalo é exatamente o tamanho do capital de giro que a loja precisa.',
      },
      {
        id: 'caixa-antecipacao',
        titulo: 'Quanto custa antecipar recebível',
        comoAbordar:
          'Mostre uma antecipação sua: valor bruto, taxa, valor líquido — e quanto isso representa da margem daquele pedido. Enquete: "você antecipa sempre, às vezes ou nunca?".',
        importancia: 5,
        porQue: 'Antecipar todo mês é vender com um desconto que ninguém contabiliza.',
      },
      {
        id: 'caixa-parcelamento-sem-juros',
        titulo: 'Parcelado sem juros: quem banca',
        comoAbordar:
          'Explique que "sem juros" para o cliente é "com custo" para a loja. Faça a conta de uma venda parcelada sua. Pergunte em quantas vezes cada um parcela e se o preço considera isso.',
        importancia: 4,
        porQue: 'O parcelamento alonga o ciclo de caixa e encarece a venda.',
      },
      {
        id: 'caixa-conta-pessoal',
        titulo: 'Pró-labore e a conta pessoal',
        comoAbordar:
          'Sem julgamento: "quem aqui paga conta de casa com o cartão da loja?". Conte como você separou e o que mudou na leitura do resultado. Sugira o primeiro passo: um valor fixo por mês.',
        importancia: 4,
        porQue: 'Conta misturada torna impossível saber se a empresa dá lucro.',
      },
      {
        id: 'caixa-reserva',
        titulo: 'Reserva: quantos meses a loja aguenta',
        comoAbordar:
          'Pergunta direta: "se a venda parasse amanhã, quantos meses de custo fixo você tem em caixa?". Mostre como você definiu a sua reserva e de onde ela foi sendo construída.',
        importancia: 4,
        porQue: 'Reserva é o que permite decidir com calma quando o mês vai mal.',
      },
      {
        id: 'caixa-fluxo-de-quatro-semanas',
        titulo: 'Fechamento: o fluxo das próximas quatro semanas',
        comoAbordar:
          'Desafio: listar o que entra e o que sai em cada uma das próximas quatro semanas. Não precisa postar valores — só dizer se alguma semana fecha no negativo. Quem achou o buraco agora tem tempo de agir.',
        importancia: 4,
        porQue: 'Buraco de caixa visto com um mês de antecedência tem solução; no dia, não.',
      },
    ],
  },
  {
    id: 'trafego',
    nome: 'Tráfego pago e custo de aquisição',
    fio: 'Anúncio amplifica o que já funciona. Em oferta sem margem, ele só acelera o prejuízo.',
    subtemas: [
      {
        id: 'trafego-roas-bonito',
        titulo: 'ROAS bonito, margem negativa',
        comoAbordar:
          'Mostre a conta de uma campanha sua: retorno sobre o anúncio e, ao lado, o que sobrou depois de produto, frete e taxas. Pergunte quem acompanha o segundo número.',
        importancia: 5,
        porQue: 'Retorno sobre anúncio mede venda, não lucro.',
      },
      {
        id: 'trafego-cac-maximo',
        titulo: 'Quanto eu posso pagar por um cliente',
        comoAbordar:
          'Ensine a conta: margem do primeiro pedido define o teto do custo de aquisição. Faça com o seu ticket e a sua margem. Peça que cada um calcule o próprio teto e compare com o que está pagando.',
        importancia: 5,
        porQue: 'Sem teto, a plataforma gasta o que você deixar.',
      },
      {
        id: 'trafego-criativo',
        titulo: 'O criativo é a variável que mais pesa',
        comoAbordar:
          'Mande dois criativos seus do mesmo produto e peça que adivinhem qual vendeu mais. Depois revele e explique o porquê. Peça que mandem o melhor criativo de cada um para o grupo analisar.',
        importancia: 4,
        porQue: 'Segmentação ajusta; criativo decide.',
      },
      {
        id: 'trafego-escalar-orcamento',
        titulo: 'Quando aumentar o orçamento',
        comoAbordar:
          'Conte a sua regra: o que precisa estar verdadeiro antes de subir verba — margem, estoque do produto, capacidade de envio. Pergunte quem já escalou anúncio de um produto que acabou no meio da campanha.',
        importancia: 4,
        porQue: 'Escalar sem estoque ou sem margem multiplica o problema, não o resultado.',
      },
      {
        id: 'trafego-tres-numeros',
        titulo: 'Os três números do painel',
        comoAbordar:
          'Reduza o painel a três perguntas: quanto gastei, quanto vendi, quanto sobrou. Mostre onde achar cada um. Peça um print (sem dados sensíveis) e ajude a ler dois ou três ali no grupo.',
        importancia: 4,
        porQue: 'Painel cheio de métrica esconde a única que paga a conta.',
      },
      {
        id: 'trafego-publico-quente',
        titulo: 'Quem já te conhece compra mais barato',
        comoAbordar:
          'Explique a diferença de falar com quem nunca viu a marca e com quem já visitou ou comprou. Mostre como você divide a verba entre os dois. Pergunte quem anuncia para a própria base.',
        importancia: 3,
        porQue: 'É a venda de menor custo de aquisição que a loja tem.',
      },
      {
        id: 'trafego-retorno-minimo',
        titulo: 'Fechamento: o retorno mínimo de cada um',
        comoAbordar:
          'Desafio: com a margem da própria loja, calcular o retorno mínimo que um anúncio precisa dar para não dar prejuízo. Postar o número. Quem estiver rodando abaixo dele já sabe o que pausar.',
        importancia: 4,
        porQue: 'É o número que transforma "acho que está indo bem" em decisão.',
      },
    ],
  },
  {
    id: 'marca',
    nome: 'Conteúdo e posicionamento',
    fio: 'Marca é o que permite cobrar mais pela mesma peça. Sem ela, a única alavanca que sobra é preço.',
    subtemas: [
      {
        id: 'marca-por-que-de-voce',
        titulo: 'Por que comprar de você',
        comoAbordar:
          'Pergunta dura: "se o cliente acha peça parecida mais barata no marketplace, por que ele compraria de você?". Peça a resposta em uma frase. A dificuldade em responder é o tema da semana.',
        importancia: 4,
        porQue: 'Quem não sabe responder compete só por preço.',
      },
      {
        id: 'marca-conteudo-que-vende',
        titulo: 'Conteúdo que vende e conteúdo que só entretém',
        comoAbordar:
          'Mostre dois posts seus: um com muito alcance e pouca venda, outro o contrário. Explique a diferença. Peça que cada um ache o próprio par e diga o que aprendeu.',
        importancia: 4,
        porQue: 'Alcance não paga boleto; conteúdo precisa de um papel no funil.',
      },
      {
        id: 'marca-foto-e-video-de-produto',
        titulo: 'Foto e vídeo de produto: o mínimo que converte',
        comoAbordar:
          'Liste o seu mínimo por produto: frente, costas, detalhe do tecido, peça no corpo, vídeo curto de caimento. Peça links e aponte, em cada um, a imagem que está faltando.',
        importancia: 4,
        porQue: 'Em moda online, a foto é o provador.',
      },
      {
        id: 'marca-prova-social',
        titulo: 'Avaliação e cliente usando',
        comoAbordar:
          'Conte como você pede avaliação e foto de cliente — em que momento, com que mensagem. Mande o seu texto pronto para o grupo copiar. Pergunte quem pede e quem só espera chegar.',
        importancia: 4,
        porQue: 'Prova de outro cliente convence mais do que qualquer legenda da marca.',
      },
      {
        id: 'marca-bastidor-como-prova',
        titulo: 'Bastidor como prova',
        comoAbordar:
          'Mostre um bastidor seu — separação, corte, conferência — e explique o que ele prova para quem assiste. Desafio rápido: cada um grava quinze segundos da própria operação hoje.',
        importancia: 3,
        porQue: 'Bastidor mostra que existe empresa por trás do perfil.',
      },
      {
        id: 'marca-calendario-minimo',
        titulo: 'O calendário mínimo que você sustenta',
        comoAbordar:
          'Pergunte quantos posts por semana cada um mantém de verdade, sem falhar. Defenda o mínimo sustentável contra o ideal abandonado, e mostre a sua rotina de produção em lote.',
        importancia: 3,
        porQue: 'Constância mediana vence explosões seguidas de silêncio.',
      },
      {
        id: 'marca-frase-de-posicionamento',
        titulo: 'Fechamento: a frase da marca',
        comoAbordar:
          'Desafio: completar "Vendo ___ para ___ que quer ___ sem ___". Postar no grupo. Você comenta as mais claras e ajuda a afiar duas ou três.',
        importancia: 3,
        porQue: 'Frase clara orienta produto, preço e conteúdo ao mesmo tempo.',
      },
    ],
  },
  {
    id: 'recompra',
    nome: 'Recompra e base de clientes',
    fio: 'O segundo pedido é onde o lucro mora: o custo de trazer aquele cliente já foi pago.',
    subtemas: [
      {
        id: 'recompra-quantos-voltam',
        titulo: 'Quantos clientes compram de novo',
        comoAbordar:
          'Pergunte: "de cada dez clientes, quantos voltaram a comprar?". A maioria vai chutar. Mostre onde achar esse número na plataforma e qual é o seu.',
        importancia: 5,
        porQue: 'Loja que só vende para cliente novo paga aquisição em toda venda.',
      },
      {
        id: 'recompra-lista-propria',
        titulo: 'Lista própria: WhatsApp e e-mail',
        comoAbordar:
          'Mostre como você captura contato — no checkout, no pacote, no pós-venda — e com que autorização. Pergunte o tamanho da lista de cada um e quando foi a última mensagem enviada.',
        importancia: 4,
        porQue: 'É o único canal que não cobra por alcance nem muda de regra.',
      },
      {
        id: 'recompra-primeiros-sete-dias',
        titulo: 'Os primeiros sete dias depois da compra',
        comoAbordar:
          'Mande a sua sequência de pós-venda, mensagem por mensagem: confirmação, envio, chegada, pedido de avaliação. Ofereça os textos para copiarem e adaptarem.',
        importancia: 4,
        porQue: 'A experiência do primeiro pedido decide se existe segundo.',
      },
      {
        id: 'recompra-segmentar-a-base',
        titulo: 'Nem todo cliente é igual',
        comoAbordar:
          'Explique três grupos simples: comprou há pouco, compra sempre, sumiu. Mostre uma mensagem diferente que você manda para cada um. Peça que cada um conte quantos clientes tem em cada grupo.',
        importancia: 4,
        porQue: 'Mensagem igual para todo mundo vira ruído e descadastro.',
      },
      {
        id: 'recompra-oferta-para-quem-ja-comprou',
        titulo: 'Oferta para quem já comprou',
        comoAbordar:
          'Conte uma ação sua só para a base: lançamento antecipado, reposição do que a pessoa já levou, condição exclusiva. Mostre o resultado comparado a uma campanha aberta.',
        importancia: 4,
        porQue: 'Quem já comprou converte mais e custa menos para alcançar.',
      },
      {
        id: 'recompra-cliente-sumido',
        titulo: 'Reativar quem sumiu',
        comoAbordar:
          'Mande o texto que você usa para quem não compra há meses e explique por que ele não começa com desconto. Desafio: cada um manda para dez clientes sumidos e conta o que voltou.',
        importancia: 3,
        porQue: 'Reativar é mais barato do que conquistar do zero.',
      },
      {
        id: 'recompra-taxa-de-cada-um',
        titulo: 'Fechamento: a taxa de recompra de cada um',
        comoAbordar:
          'Desafio: clientes com dois ou mais pedidos divididos pelo total de clientes, nos últimos doze meses. Postar o número. É a linha de base para medir tudo o que foi discutido na semana.',
        importancia: 4,
        porQue: 'Sem a linha de base, não dá para saber se o trabalho de retenção funcionou.',
      },
    ],
  },
  {
    id: 'gestao',
    nome: 'Pessoas, processo e rotina do dono',
    fio: 'Operação que depende do dono para tudo não escala: ela trava na agenda dele.',
    subtemas: [
      {
        id: 'gestao-onde-o-tempo-vai',
        titulo: 'Para onde vai o seu tempo',
        comoAbordar:
          'Peça que cada um liste as cinco tarefas em que mais gastou tempo ontem e marque quais só o dono poderia fazer. Mostre a sua lista de hoje e a de dois anos atrás.',
        importancia: 4,
        porQue: 'O dono é o recurso mais caro e mais mal alocado da operação.',
      },
      {
        id: 'gestao-painel-de-cinco-numeros',
        titulo: 'O painel de cinco números da semana',
        comoAbordar:
          'Mostre os cinco números que você olha toda segunda — venda, margem, caixa, estoque parado, devolução — e onde pega cada um. Peça que cada um diga quais já acompanha e qual falta.',
        importancia: 5,
        porQue: 'Sem painel, o dono só descobre o problema quando ele chega no banco.',
      },
      {
        id: 'gestao-o-que-delegar',
        titulo: 'O que delegar primeiro',
        comoAbordar:
          'Dê o critério: o que se repete, tem passo a passo e não exige a sua decisão. Conte qual foi a primeira tarefa que você soltou e o que deu errado no começo. Pergunte qual seria a de cada um.',
        importancia: 4,
        porQue: 'Delegar o repetitivo é o que libera tempo para decidir preço, compra e canal.',
      },
      {
        id: 'gestao-processo-de-uma-pagina',
        titulo: 'Processo escrito em uma página',
        comoAbordar:
          'Mande um processo seu de verdade — separação de pedido, por exemplo — em uma página: o que fazer, em que ordem, o que conferir. Desafio: cada um escreve o de uma tarefa hoje.',
        importancia: 4,
        porQue: 'Processo na cabeça do dono some quando ele não está.',
      },
      {
        id: 'gestao-primeira-contratacao',
        titulo: 'A primeira contratação',
        comoAbordar:
          'Pergunte qual foi (ou será) o primeiro cargo de cada um. Conte o seu erro mais caro de contratação e o que mudou no jeito de contratar depois dele.',
        importancia: 3,
        porQue: 'Contratar para a função errada custa salário e meses.',
      },
      {
        id: 'gestao-reuniao-semanal',
        titulo: 'A reunião semanal de trinta minutos',
        comoAbordar:
          'Mostre a pauta fixa da sua: números da semana, o que travou, o que cada um entrega até a próxima. Ofereça o modelo. Pergunte quem tem rito semanal com a equipe e quem resolve tudo no susto.',
        importancia: 3,
        porQue: 'Rito curto e fixo evita que tudo vire urgência.',
      },
      {
        id: 'gestao-uma-tarefa-que-sai-do-dono',
        titulo: 'Fechamento: uma tarefa sai das suas mãos',
        comoAbordar:
          'Desafio: escolher UMA tarefa, escrever o passo a passo e entregar para alguém nesta semana. Postar qual foi. Na sexta, quem cumpriu conta quanto tempo recuperou.',
        importancia: 4,
        porQue: 'Semana de gestão só valeu se o dono terminou com uma tarefa a menos.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// De uma data para um tema
// ---------------------------------------------------------------------------

/**
 * A segunda-feira em que o ciclo começa a contar.
 *
 * É só um ponto fixo: a partir dele, cada semana pega o tema seguinte e, no
 * fim da lista, recomeça. Sem ponto fixo, o tema de uma semana dependeria de
 * quando a página foi aberta — e a mesma segunda mostraria temas diferentes em
 * dois dias diferentes.
 */
const INICIO_DO_CICLO = Date.UTC(2026, 0, 5)
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
  // getUTCDay: domingo = 0. A semana da comunidade começa na segunda.
  const desdeSegunda = (new Date(ms).getUTCDay() + 6) % 7
  return paraChave(ms - desdeSegunda * DIA_EM_MS)
}

export function somarDias(chave: string, dias: number): string {
  return paraChave(paraUTC(chave) + dias * DIA_EM_MS)
}

/** O tema de uma semana, dada a segunda-feira dela. */
export function temaDaSemana(segunda: string): Tema {
  const semanas = Math.round((paraUTC(segunda) - INICIO_DO_CICLO) / (7 * DIA_EM_MS))
  // O resto de número negativo é negativo em JavaScript; a soma corrige para
  // as semanas anteriores ao início do ciclo.
  const indice = ((semanas % TEMAS.length) + TEMAS.length) % TEMAS.length
  return TEMAS[indice]
}

export interface DiaDaComunidade {
  data: string
  subtema: Subtema
}

/** Os sete dias de uma semana, cada um com o seu subtema. */
export function diasDaSemana(segunda: string): DiaDaComunidade[] {
  const tema = temaDaSemana(segunda)
  return tema.subtemas.map((subtema, indice) => ({
    data: somarDias(segunda, indice),
    subtema,
  }))
}
