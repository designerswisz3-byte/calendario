import type { CategoriaDeEvento, EscopoDeEvento } from '@/types/database'

/**
 * Catálogo base: o que acontece no mundo da moda e do varejo entre out/2026 e
 * dez/2027, e o que fazer com cada data.
 *
 * Três regras guiaram o que entrou aqui:
 *
 * 1. **Data sem ângulo não entra.** Existe calendário de feriado de graça na
 *    internet. O que falta é a frase que liga a data a uma decisão de quem
 *    vende moda — e é por isso que cada item carrega `porQueImporta` e
 *    `ideiaDePost`, não só um nome e um dia.
 * 2. **Ângulo que vira operação, não motivação.** Toda ideia aqui aponta para
 *    uma alavanca real: margem, giro, mix, frete, devolução, piso de preço,
 *    comissão de canal, equipe. "Feliz dia das mães para todas as mães" não
 *    ensina nada e não salva ninguém.
 * 3. **Data de feira só com fonte oficial.** Datas de 2027 de feiras
 *    brasileiras (Couromoda, Francal, SPFW) ainda não foram publicadas pelas
 *    organizadoras em out/2026 — e inventar data de evento é o tipo de erro
 *    que faz alguém comprar passagem errada. Ficaram de fora até saírem.
 */
export interface EventoDoCatalogo {
  data: string
  dataFim?: string
  titulo: string
  categoria: CategoriaDeEvento
  escopo: EscopoDeEvento
  local?: string
  porQueImporta: string
  ideiaDePost: string
  fonteUrl?: string
}

export const CATALOGO_DE_EVENTOS: EventoDoCatalogo[] = [
  /* ----------------------------------------------------------- 2026 Q4 -- */
  {
    data: '2026-10-13',
    dataFim: '2026-10-18',
    titulo: 'São Paulo Fashion Week N61',
    categoria: 'setorial',
    escopo: 'brasil',
    local: 'São Paulo, SP',
    porQueImporta:
      'É a semana em que a imprensa de moda brasileira olha para uma coisa só. Quem vende moda ganha pauta de graça — e tendência de passarela vira pedido de cliente em 60 a 90 dias.',
    ideiaDePost:
      'Promessa: "O que passa na passarela da SPFW chega no seu estoque em 90 dias — se você souber ler." Problema: a maioria dos lojistas assiste desfile como espectador e compra pelo que o fornecedor empurrou. Solução: mostre como você traduz três tendências da semana em decisão de compra concreta (cor, modelagem, tecido) e qual delas você NÃO vai comprar, e por quê.',
    fonteUrl: 'https://spfw.com.br/',
  },
  {
    data: '2026-10-31',
    titulo: 'Halloween',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Data pequena em venda e grande em alcance: é desculpa de conteúdo com custo zero, numa semana morta entre o Dia das Crianças e a largada da Black Friday.',
    ideiaDePost:
      'Promessa: "Os 3 monstros que assombram o lucro de um e-commerce de moda." Problema: use o gancho da data para falar do que realmente dá medo — frete grátis sem piso de pedido, estoque parado de coleção passada e devolução acima de 10%. Solução: o número de corte de cada um e o que fazer quando ele estoura.',
  },
  {
    data: '2026-11-02',
    titulo: 'Finados',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional numa segunda: o tráfego cai, a operação de expedição para e o prazo prometido na véspera não se cumpre. É data de ajustar prazo no site, não de vender.',
    ideiaDePost:
      'Promessa: "O feriado que não vende ainda assim custa caro." Problema: a loja segue prometendo "envio em 24h" num dia sem transportadora rodando, e a reclamação chega três dias depois. Solução: a rotina de bloquear prazo de entrega no calendário da loja com antecedência — e por que isso vale mais que qualquer campanha de feriado.',
  },
  {
    data: '2026-11-11',
    titulo: "Singles' Day (11.11)",
    categoria: 'comercial',
    escopo: 'china',
    porQueImporta:
      'A maior data de varejo do planeta, e o laboratório onde Shein e Shopee testam o que vão rodar no Brasil na Black Friday duas semanas depois. Olhar o 11.11 é ver o próximo mês antes dele chegar.',
    ideiaDePost:
      'Promessa: "A Black Friday brasileira é ensaiada na China, duas semanas antes." Problema: o lojista descobre o mecanismo de oferta do concorrente quando já está perdendo venda. Solução: mostre dois mecanismos do 11.11 deste ano (cupom progressivo, kit com frete diluído) e como adaptar um deles sem destruir a margem.',
  },
  {
    data: '2026-11-15',
    titulo: 'Proclamação da República',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Último feriado antes da Black Friday. É a data-limite real para ter estoque conferido, fotos prontas e preço fechado — depois dela, só dá tempo de executar.',
    ideiaDePost:
      'Promessa: "Faltam 12 dias para a Black Friday. Se isto não estiver pronto hoje, não fica." Problema: todo ano a loja chega na quarta-feira anterior fotografando produto e definindo desconto no grito. Solução: a checklist de 5 itens que precisa estar fechada ANTES do feriado — e o que você corta quando não deu tempo.',
  },
  {
    data: '2026-11-20',
    titulo: 'Dia da Consciência Negra',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional. Em moda é data de posicionamento, não de oferta: marca que só aparece com desconto nesse dia é lida como oportunista — e o público de moda percebe rápido.',
    ideiaDePost:
      'Promessa: "Tem data que não é para vender. É para mostrar quem você é." Problema: o calendário comercial empurra desconto para cima de toda data, e marca de moda que faz isso aqui queima reputação por um pico de venda. Solução: explique o critério que você usa para decidir se uma data entra como campanha, como conteúdo ou como silêncio.',
  },
  {
    data: '2026-11-23',
    dataFim: '2026-11-27',
    titulo: 'Semana da Black Friday',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'A venda já não se concentra na sexta: a semana inteira é a data. Isso muda o fôlego de estoque, a escala de equipe e o caixa — e quem planejou só para um dia fica sem produto na quarta.',
    ideiaDePost:
      'Promessa: "A Black Friday virou semana. Quem planejou para um dia vai quebrar no meio." Problema: conte o caso de ruptura — o campeão de venda acabou na terça e o resto da semana vendeu só a cauda de margem baixa. Solução: como separar estoque por dia da semana e segurar o campeão para a sexta.',
  },
  {
    data: '2026-11-27',
    titulo: 'Black Friday',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Maior data do segundo semestre e a que mais destrói margem por decisão tomada no impulso. Desconto, frete grátis, comissão de marketplace e devolução se somam numa conta que quase ninguém faz antes.',
    ideiaDePost:
      'Promessa: "A Black Friday não quebra ninguém. O desconto dado sem saber a margem, sim." Problema: mostre a conta real de uma peça vendida a 50% off — depois do frete grátis, da comissão do canal e da taxa de devolução, o que sobrou foi prejuízo. Solução: a margem de contribuição por peça e o piso de preço por canal, calculados antes de montar a oferta.',
  },
  {
    data: '2026-11-30',
    titulo: 'Cyber Monday',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'A segunda chance de vender o que sobrou — e a hora de escoar o que ficou parado na sexta sem repetir o desconto que já machucou a margem.',
    ideiaDePost:
      'Promessa: "O que sobrou da Black Friday diz mais sobre sua compra do que o que vendeu." Problema: o lojista comemora o faturamento e ignora que o encalhe é o retrato do erro de curva. Solução: como ler a sobra por SKU para corrigir a próxima compra, e o que fazer com ela na Cyber Monday sem repetir o desconto.',
  },
  {
    data: '2026-12-08',
    titulo: 'Corte de prazo para entrega de Natal',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'A partir daqui, prazo prometido errado vira pedido cancelado, chargeback e reclamação pública. É a data operacional mais cara de dezembro — e a que ninguém marca no calendário.',
    ideiaDePost:
      'Promessa: "A venda de Natal que mais custa caro é a que você aceita depois do dia certo." Problema: o pedido entra dia 20, a transportadora não entrega, o cliente reclama no Instagram e você devolve o dinheiro depois de ter pago o frete. Solução: como calcular a sua data de corte real por região e comunicá-la no site antes que ela passe.',
  },
  {
    data: '2026-12-25',
    titulo: 'Natal',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Maior volume do ano em presente, e o período de maior pressão sobre separação, embalagem e atendimento. O resultado do Natal foi decidido na compra de setembro.',
    ideiaDePost:
      'Promessa: "Quem vende bem no Natal decidiu em setembro." Problema: a corrida de dezembro é consequência de não ter definido mix, profundidade e embalagem três meses antes. Solução: mostre o seu calendário reverso — o que precisa estar resolvido em setembro, outubro e novembro para dezembro ser só execução.',
  },
  {
    data: '2026-12-26',
    titulo: 'Abertura da janela de trocas e devoluções',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Em moda, de 10% a 30% do que foi vendido no Natal volta. É aqui que o lucro de dezembro é confirmado ou perdido — e quase ninguém mede a devolução por SKU.',
    ideiaDePost:
      'Promessa: "O lucro do Natal não é decidido em dezembro. É entre 26/12 e 15/01." Problema: a loja comemora o faturamento e dois meses depois descobre que a taxa de troca comeu a margem da coleção inteira. Solução: medir devolução por SKU, achar os três campeões de volta e decidir se o problema é a grade, a foto ou a descrição.',
  },
  {
    data: '2026-12-31',
    titulo: 'Fechamento de inventário e balanço do ano',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Inventário é o momento em que o estoque do sistema encontra o estoque real. A diferença entre os dois é dinheiro que já foi — e a base de tudo que será planejado no ano seguinte.',
    ideiaDePost:
      'Promessa: "A conta que separa quem cresce de quem só fatura é feita no dia 31." Problema: a maioria fecha o ano olhando faturamento e não sabe quanto do estoque é invendável. Solução: os três números que você tira do inventário — cobertura em dias, % de coleção morta e giro por curva — e o que cada um manda fazer em janeiro.',
  },

  /* ----------------------------------------------------------- 2027 S1 -- */
  {
    data: '2027-01-01',
    titulo: 'Confraternização Universal',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional e a virada do exercício fiscal e de coleção. Começa o mês de pior caixa do varejo de moda: dezembro pago, janeiro com boleto e sem venda.',
    ideiaDePost:
      'Promessa: "Janeiro é o mês que quebra loja de moda — e todo ano é o mesmo motivo." Problema: dezembro vende, janeiro cobra. Fornecedor, 13º, férias e imposto vencem quando a receita despenca. Solução: a reserva de caixa que precisa ser separada em novembro e o erro de usar o dinheiro da Black Friday como se fosse lucro.',
  },
  {
    data: '2027-01-05',
    dataFim: '2027-01-31',
    titulo: 'Liquidação de verão e queima de coleção',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Janela para converter estoque parado em caixa antes que ele perca mais valor. Peça de coleção passada não envelhece bem: cada mês parada custa espaço, capital e desconto maior depois.',
    ideiaDePost:
      'Promessa: "Estoque parado não é patrimônio. É prejuízo esperando o próximo desconto." Problema: o lojista segura a peça esperando "vender pelo preço justo" e um ano depois vende por 30% do custo. Solução: a régua de desconto por tempo de estoque — quando dar 20%, quando dar 50% e quando é melhor doar do que estocar.',
  },
  {
    data: '2027-01-10',
    dataFim: '2027-01-12',
    titulo: "NRF Retail's Big Show 2027",
    categoria: 'setorial',
    escopo: 'eua',
    local: 'Javits Center, Nova York, EUA',
    porQueImporta:
      'O maior evento de varejo do mundo. O que é anunciado ali define a pauta de tecnologia e operação do varejo global pelos 12 meses seguintes — e chega ao Brasil em 18 a 24 meses.',
    ideiaDePost:
      'Promessa: "O que o varejo mundial vai copiar em 2027 foi apresentado esta semana em Nova York." Problema: a maioria descobre a tendência quando ela já virou exigência do cliente. Solução: traga as três coisas da NRF que um e-commerce de moda brasileiro consegue aplicar sem time de TI — e diga qual delas é só hype caro.',
    fonteUrl: 'https://nrfbigshow.nrf.com/',
  },
  {
    data: '2027-01-26',
    dataFim: '2027-01-28',
    titulo: 'Première Vision Paris',
    categoria: 'setorial',
    escopo: 'europa',
    local: 'Paris Nord Villepinte, França',
    porQueImporta:
      'É onde tecido e matéria-prima da moda mundial são negociados antes da coleção existir. O que aparece ali define custo e disponibilidade de insumo lá na frente — e custo de insumo é margem.',
    ideiaDePost:
      'Promessa: "O preço da sua peça do ano que vem está sendo definido agora, em Paris." Problema: o lojista negocia preço de venda sem entender que o custo veio de uma decisão de matéria-prima tomada dois ciclos antes. Solução: explique a cadeia — tecido, confecção, margem — e como antecipar aumento de custo na hora de fechar a próxima coleção.',
    fonteUrl: 'https://paris.premierevision.com/en',
  },
  {
    data: '2027-02-02',
    dataFim: '2027-02-04',
    titulo: 'Shoptalk Luxe',
    categoria: 'setorial',
    escopo: 'global',
    local: 'Abu Dhabi, Emirados Árabes',
    porQueImporta:
      'Evento de varejo de luxo. Interessa porque técnica de luxo vira padrão de mercado médio em poucos anos: embalagem, atendimento 1:1 e clienteling nasceram ali.',
    ideiaDePost:
      'Promessa: "O que a loja de luxo faz hoje, você vai precisar fazer em 3 anos." Problema: lojista de ticket médio acha que experiência é coisa de marca cara e compete só por preço — onde nunca vai ganhar. Solução: duas práticas de clienteling que custam quase nada e sobem o ticket de recompra.',
    fonteUrl: 'https://shoptalk.com/',
  },
  {
    data: '2027-02-08',
    dataFim: '2027-02-09',
    titulo: 'Carnaval',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Pico de moda festa, praia e fantasia, e uma parada de 4 a 5 dias na operação logística. A venda acontece até duas semanas antes; depois, só prejuízo de prazo.',
    ideiaDePost:
      'Promessa: "A venda de Carnaval acaba 10 dias antes do Carnaval." Problema: a loja mantém a campanha no ar até a véspera, vende o que não consegue entregar e troca faturamento por reclamação. Solução: a data de corte da campanha sazonal e como virar a comunicação para o pós-feriado sem deixar o perfil mudo.',
  },
  {
    data: '2027-02-14',
    titulo: "Valentine's Day (EUA/Europa)",
    categoria: 'comercial',
    escopo: 'global',
    porQueImporta:
      'Não é a data brasileira (que é 12/06), mas é a data dos marketplaces e fornecedores internacionais. Quem vende cross-border ou compra de fora sente no prazo e no frete.',
    ideiaDePost:
      'Promessa: "Existe um Dia dos Namorados que afeta seu estoque e não é o do Brasil." Problema: o lojista programa reposição em fevereiro sem contar com o pico logístico lá fora e recebe atrasado. Solução: como ler o calendário comercial do fornecedor, não só o do cliente, na hora de programar compra.',
  },
  {
    data: '2027-03-08',
    titulo: 'Dia Internacional da Mulher',
    categoria: 'comercial',
    escopo: 'global',
    porQueImporta:
      'Em moda feminina é a data de maior risco reputacional do primeiro trimestre: o público identifica em segundos quem usa a pauta como desconto.',
    ideiaDePost:
      'Promessa: "Como não transformar o 8 de março no post que queima sua marca." Problema: a enxurrada de "50% off para as mulheres" é lida como oportunismo, e quem vende para mulher todo dia paga o preço. Solução: o teste de três perguntas que define se a sua marca tem o que dizer nessa data — e o que fazer se a resposta for não.',
  },
  {
    data: '2027-03-15',
    titulo: 'Dia do Consumidor',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Virou a "Black Friday do primeiro semestre" no e-commerce brasileiro. Concentra desconto num mês historicamente fraco, o que a torna útil para girar estoque de verão sem esperar o meio do ano.',
    ideiaDePost:
      'Promessa: "A data que salva o primeiro semestre de quem vende moda — e quase ninguém usa direito." Problema: março é mês de caixa apertado e coleção de verão encalhada, e a maioria deixa a data passar. Solução: como montar a oferta usando o que está parado, não o que está vendendo, e qual o piso de desconto por curva.',
  },
  {
    data: '2027-03-22',
    dataFim: '2027-03-24',
    titulo: 'Shoptalk Spring',
    categoria: 'setorial',
    escopo: 'eua',
    local: 'Mandalay Bay, Las Vegas, EUA',
    porQueImporta:
      'O maior encontro de inovação em varejo e e-commerce. É onde as plataformas e marketplaces anunciam mudanças que mexem em comissão, logística e vitrine — tudo que afeta margem.',
    ideiaDePost:
      'Promessa: "As regras do jogo de marketplace mudam aqui, antes de mudarem na sua conta." Problema: o seller descobre alteração de comissão ou de algoritmo quando a venda já caiu. Solução: as duas mudanças anunciadas que afetam seller brasileiro e o que fazer nos 90 dias seguintes.',
    fonteUrl: 'https://shoptalk.com/',
  },
  {
    data: '2027-03-26',
    titulo: 'Sexta-feira Santa',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional que emenda com a Páscoa: quatro dias de operação parada no fim do primeiro trimestre.',
    ideiaDePost:
      'Promessa: "Feriado longo é o melhor momento do trimestre para olhar o número que você evita." Problema: a operação para e o dono usa o tempo para descansar da rotina em vez de revisar o que a rotina esconde. Solução: as três perguntas de fechamento de trimestre que cabem numa manhã de feriado.',
  },
  {
    data: '2027-03-28',
    titulo: 'Páscoa',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Data fraca em moda e forte em tráfego: o consumidor está comprando, só que outra coisa. Serve para conteúdo e para preparar a virada de coleção, não para campanha de desconto.',
    ideiaDePost:
      'Promessa: "Nem toda data do calendário é sua. Saber qual pular é estratégia." Problema: a loja força campanha em data que não converte, gasta verba e ainda cansa a base. Solução: o critério de aderência — como decidir em que datas entrar, usando venda histórica em vez de calendário de agência.',
  },
  {
    data: '2027-04-01',
    dataFim: '2027-04-30',
    titulo: 'Virada de coleção outono/inverno',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Momento de maior exposição de capital do ano: entra coleção nova enquanto a anterior ainda não girou. Errar a profundidade aqui compromete o caixa até dezembro.',
    ideiaDePost:
      'Promessa: "A compra de inverno é a decisão mais cara do ano — e a mais chutada." Problema: comprar pela empolgação do showroom e descobrir em julho que 40% do pedido não girou. Solução: como definir profundidade por curva ABC e o teto de capital que uma coleção pode travar.',
  },
  {
    data: '2027-04-21',
    titulo: 'Tiradentes',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional numa quarta-feira: quebra a semana ao meio, derruba a expedição e costuma virar emenda informal na equipe.',
    ideiaDePost:
      'Promessa: "Feriado no meio da semana custa mais caro que feriado na segunda." Problema: a semana quebrada derruba a produtividade de separação e o prazo prometido não se sustenta. Solução: como reorganizar a escala e o prazo do site em semana de feriado no miolo.',
  },
  {
    data: '2027-05-01',
    titulo: 'Dia do Trabalho',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional a oito dias do Dia das Mães: é o último fim de semana de preparação da maior data do primeiro semestre.',
    ideiaDePost:
      'Promessa: "Faltam 8 dias para a data de maior ticket do semestre." Problema: a campanha de Dia das Mães costuma subir na semana da data, quando a decisão de compra já foi tomada. Solução: a linha do tempo de campanha que começa 4 semanas antes e o que vai no ar em cada semana.',
  },
  {
    data: '2027-05-09',
    titulo: 'Dia das Mães',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'A maior data do primeiro semestre para moda e a de maior ticket médio: o presente puxa o preço para cima. Também é a data em que a embalagem vira parte do produto.',
    ideiaDePost:
      'Promessa: "Dia das Mães é a data de maior ticket do ano — e a maioria vende como se fosse qualquer semana." Problema: quem compra presente não compara preço do mesmo jeito; descontar aqui é jogar dinheiro fora. Solução: como montar kit e embalagem para subir o ticket em vez de baixar o preço, com a conta de margem do kit.',
  },
  {
    data: '2027-05-27',
    titulo: 'Corpus Christi',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Ponto facultativo federal que na prática para boa parte do país numa quinta, com emenda na sexta. Logística e atendimento caem por quatro dias.',
    ideiaDePost:
      'Promessa: "O feriado que não é feriado, mas para a sua operação do mesmo jeito." Problema: a loja não bloqueia prazo porque "é só ponto facultativo", e a transportadora não roda. Solução: como mapear os feriados que afetam a sua entrega mesmo sem serem nacionais.',
  },
  {
    data: '2027-06-01',
    dataFim: '2027-06-03',
    titulo: 'Shoptalk Europe',
    categoria: 'setorial',
    escopo: 'europa',
    local: 'Barcelona, Espanha',
    porQueImporta:
      'Versão europeia do Shoptalk. Interessa porque a Europa regula antes — privacidade, ESG e devolução viram lei lá e exigência de marketplace aqui.',
    ideiaDePost:
      'Promessa: "A regra que vai chegar no seu marketplace já está valendo na Europa." Problema: o seller é pego de surpresa por exigência nova de dado, rastreabilidade ou política de devolução. Solução: as duas regras europeias com maior chance de virar exigência de canal no Brasil e como se antecipar.',
    fonteUrl: 'https://shoptalk.com/',
  },
  {
    data: '2027-06-12',
    titulo: 'Dia dos Namorados',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Segunda maior data de presente do primeiro semestre e a de maior peso em moda íntima, festa e acessório. Cai num sábado em 2027, o que antecipa o pico de compra para a semana anterior.',
    ideiaDePost:
      'Promessa: "Em 2027 o Dia dos Namorados cai no sábado — e isso muda a sua data de corte." Problema: data em fim de semana comprime o prazo de entrega e a loja só percebe quando o pedido de quinta não chega. Solução: como recalcular a data de corte quando a data cai em sábado, e o que anunciar no lugar depois que ela passa.',
  },
  {
    data: '2027-06-24',
    titulo: 'Festas juninas',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Pico regional forte no Nordeste e em interior, com demanda concentrada em peça temática. Para quem não trabalha o tema, é o melhor momento de girar inverno antes do meio do ano.',
    ideiaDePost:
      'Promessa: "Existe venda sazonal que não é sua — e tentar pegar custa mais que ignorar." Problema: a loja compra tema para aproveitar a data e fica com estoque que só volta a fazer sentido em 12 meses. Solução: o critério de entrada em sazonalidade temática e o que fazer em vez disso para girar o inverno.',
  },

  /* ----------------------------------------------------------- 2027 S2 -- */
  {
    data: '2027-07-01',
    dataFim: '2027-07-31',
    titulo: 'Balanço de meio de ano e férias escolares',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Metade do exercício fechada: dá para projetar o ano com dado real em vez de expectativa. Também é mês de viagem, o que muda o mix de busca e esvazia a equipe.',
    ideiaDePost:
      'Promessa: "Em julho dá para saber como vai terminar o ano. Com um número só." Problema: a maioria chega em novembro descobrindo que não bate a meta, quando ainda dava para corrigir em julho. Solução: como projetar o fechamento com o realizado do primeiro semestre e que alavanca puxar se a conta não fecha.',
  },
  {
    data: '2027-08-08',
    titulo: 'Dia dos Pais',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Terceira maior data de presente do ano. Em moda, converte menos que o Dia das Mães e exige mix diferente — quem replica a campanha de maio queima verba.',
    ideiaDePost:
      'Promessa: "Dia dos Pais não é Dia das Mães com outra foto." Problema: a loja repete a mesma mecânica de maio e converte metade, porque quem compra, o produto e o ticket são outros. Solução: as três diferenças de comportamento entre as duas datas e como isso muda oferta, kit e canal.',
  },
  {
    data: '2027-08-15',
    dataFim: '2027-08-31',
    titulo: 'Volta às aulas (2º semestre)',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Movimenta moda jovem, calçado e mochila, e marca a retomada de consumo depois do inverno. É a janela para escoar o que sobrou da coleção de inverno antes da primavera.',
    ideiaDePost:
      'Promessa: "A última janela para vender inverno pelo preço cheio fecha em agosto." Problema: o lojista segura a peça de inverno esperando o frio voltar e entra em setembro com estoque de estação errada. Solução: a régua de liquidação por estação e o cálculo de quando segurar custa mais que descontar.',
  },
  {
    data: '2027-09-07',
    titulo: 'Independência do Brasil',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional numa terça, que puxa emenda na segunda. Abre o mês da Semana do Brasil e do Dia do Cliente — e é o marco para começar o planejamento de Black Friday e Natal.',
    ideiaDePost:
      'Promessa: "O Natal começa hoje. Quem começa em novembro só executa o que deu tempo." Problema: todo ano a compra de Natal é feita em cima da hora, com fornecedor lotado e preço pior. Solução: o calendário reverso de setembro a dezembro, com a data-limite de cada decisão.',
  },
  {
    data: '2027-09-15',
    titulo: 'Dia do Cliente',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Data de relacionamento, não de aquisição: funciona na base que já comprou. É o melhor teste barato de recompra antes da Black Friday.',
    ideiaDePost:
      'Promessa: "A venda mais barata do ano é para quem já comprou de você." Problema: a loja gasta tudo em tráfego novo e trata a base como lista de disparo. Solução: a segmentação mínima de base (recência, frequência, ticket) e a oferta que você manda para cada grupo.',
  },
  {
    data: '2027-10-05',
    dataFim: '2027-10-07',
    titulo: 'Shoptalk Fall',
    categoria: 'setorial',
    escopo: 'eua',
    local: 'Nashville, EUA',
    porQueImporta:
      'Edição de outono, às vésperas da temporada de fim de ano americana. É onde saem as leituras de comportamento de compra que vão pautar a Black Friday global.',
    ideiaDePost:
      'Promessa: "A sete semanas da Black Friday, o varejo americano já sabe o que vai acontecer." Problema: o lojista brasileiro planeja a data no escuro, com base no ano anterior. Solução: os dois sinais de comportamento apontados lá que se aplicam ao Brasil e o ajuste que eles pedem na sua oferta.',
    fonteUrl: 'https://shoptalk.com/',
  },
  {
    data: '2027-10-12',
    titulo: 'Dia das Crianças e Nossa Senhora Aparecida',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional e data de presente no mesmo dia. Para moda infantil é pico; para as demais, é a última data relevante antes da Black Friday — e um feriado que para a expedição.',
    ideiaDePost:
      'Promessa: "A última data antes da Black Friday é o seu ensaio geral." Problema: a loja trata outubro como mês de passagem e chega em novembro testando mecânica de oferta na data mais cara do ano. Solução: use o Dia das Crianças para testar cupom, kit e frete em escala pequena, e leve só o que funcionou para a Black Friday.',
  },
  {
    data: '2027-10-31',
    titulo: 'Halloween',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Alcance alto e venda baixa em moda. Vale como conteúdo na semana que antecede a largada das campanhas de novembro.',
    ideiaDePost:
      'Promessa: "Os 3 monstros que assombram o lucro de um e-commerce de moda." Problema: use o gancho para falar de frete grátis sem piso, estoque morto e devolução acima de 10%. Solução: o número de corte de cada um e o que fazer quando ele estoura.',
  },
  {
    data: '2027-11-02',
    titulo: 'Finados',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional numa terça, com emenda provável na segunda: quatro dias de operação lenta a três semanas da Black Friday.',
    ideiaDePost:
      'Promessa: "Faltam 24 dias para a Black Friday e você acabou de perder 4." Problema: o feriado emendado come a semana de preparação e ninguém recalcula o cronograma. Solução: o que precisa estar pronto antes do feriado de novembro para a data não ser improviso.',
  },
  {
    data: '2027-11-11',
    titulo: "Singles' Day (11.11)",
    categoria: 'comercial',
    escopo: 'china',
    porQueImporta:
      'Laboratório global de mecânica de oferta, duas semanas antes da Black Friday brasileira. O que funciona lá chega aqui via Shein e Shopee quase imediatamente.',
    ideiaDePost:
      'Promessa: "A Black Friday brasileira é ensaiada na China, duas semanas antes." Problema: você descobre o mecanismo do concorrente quando já perdeu venda. Solução: dois mecanismos do 11.11 deste ano e como adaptar um sem destruir a margem.',
  },
  {
    data: '2027-11-15',
    titulo: 'Proclamação da República',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional numa segunda, 11 dias antes da Black Friday. É a data-limite real para estoque conferido, fotos prontas e preço fechado.',
    ideiaDePost:
      'Promessa: "Faltam 11 dias para a Black Friday. Se isto não estiver pronto hoje, não fica." Problema: todo ano a loja chega na semana anterior fotografando produto e definindo desconto no grito. Solução: a checklist de 5 itens que precisa estar fechada antes do feriado — e o que você corta quando não deu tempo.',
  },
  {
    data: '2027-11-20',
    titulo: 'Dia da Consciência Negra',
    categoria: 'feriado',
    escopo: 'brasil',
    porQueImporta:
      'Feriado nacional em pleno aquecimento de Black Friday. O choque entre pauta e oferta é exatamente o que torna o erro caro aqui.',
    ideiaDePost:
      'Promessa: "Tem data que não é para vender. Principalmente na semana em que tudo é desconto." Problema: a campanha de Black Friday atropela a data e a marca é lida como oportunista. Solução: o critério para decidir se uma data entra como campanha, como conteúdo ou como silêncio — e como pausar a oferta sem perder o aquecimento.',
  },
  {
    data: '2027-11-22',
    dataFim: '2027-11-26',
    titulo: 'Semana da Black Friday',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'A data virou semana. Muda fôlego de estoque, escala de equipe e caixa — quem planejou só para a sexta fica sem produto na quarta.',
    ideiaDePost:
      'Promessa: "A Black Friday virou semana. Quem planejou para um dia vai quebrar no meio." Problema: o campeão de venda acaba na terça e o resto da semana vende só a cauda de margem baixa. Solução: como separar estoque por dia e segurar o campeão para a sexta.',
  },
  {
    data: '2027-11-26',
    titulo: 'Black Friday',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Maior data do segundo semestre e a que mais destrói margem por decisão de impulso. Desconto, frete grátis, comissão e devolução se somam numa conta que quase ninguém faz antes.',
    ideiaDePost:
      'Promessa: "A Black Friday não quebra ninguém. O desconto dado sem saber a margem, sim." Problema: mostre a conta real de uma peça a 50% off depois de frete grátis, comissão de canal e taxa de devolução. Solução: margem de contribuição por peça e piso de preço por canal, calculados antes de montar a oferta.',
  },
  {
    data: '2027-11-29',
    titulo: 'Cyber Monday',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Segunda chance de escoar o que sobrou, sem repetir o desconto que já machucou a margem na sexta.',
    ideiaDePost:
      'Promessa: "O que sobrou da Black Friday diz mais sobre sua compra do que o que vendeu." Problema: comemora-se o faturamento e ignora-se que o encalhe é o retrato do erro de curva. Solução: como ler a sobra por SKU para corrigir a próxima compra.',
  },
  {
    data: '2027-12-08',
    titulo: 'Corte de prazo para entrega de Natal',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Depois daqui, prazo prometido errado vira cancelamento, chargeback e reclamação pública. É a data operacional mais cara de dezembro.',
    ideiaDePost:
      'Promessa: "A venda de Natal que mais custa caro é a que você aceita depois do dia certo." Problema: o pedido entra dia 20, não entrega, o cliente reclama no Instagram e você devolve o dinheiro depois de ter pago o frete. Solução: como calcular a data de corte real por região e comunicá-la antes que ela passe.',
  },
  {
    data: '2027-12-25',
    titulo: 'Natal',
    categoria: 'comercial',
    escopo: 'brasil',
    porQueImporta:
      'Maior volume do ano em presente e maior pressão sobre separação, embalagem e atendimento. O resultado foi decidido na compra de setembro.',
    ideiaDePost:
      'Promessa: "Quem vende bem no Natal decidiu em setembro." Problema: a corrida de dezembro é consequência de não ter definido mix, profundidade e embalagem três meses antes. Solução: o calendário reverso — o que precisa estar resolvido em cada mês para dezembro ser só execução.',
  },
  {
    data: '2027-12-26',
    titulo: 'Abertura da janela de trocas e devoluções',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'Em moda, de 10% a 30% do que foi vendido no Natal volta. É aqui que o lucro de dezembro é confirmado ou perdido.',
    ideiaDePost:
      'Promessa: "O lucro do Natal não é decidido em dezembro. É entre 26/12 e 15/01." Problema: a loja comemora o faturamento e dois meses depois descobre que a troca comeu a margem da coleção. Solução: medir devolução por SKU, achar os três campeões de volta e decidir se o problema é grade, foto ou descrição.',
  },
  {
    data: '2027-12-31',
    titulo: 'Fechamento de inventário e balanço do ano',
    categoria: 'sazonal',
    escopo: 'brasil',
    porQueImporta:
      'O estoque do sistema encontra o estoque real. A diferença entre os dois é dinheiro que já foi — e a base do planejamento do ano seguinte.',
    ideiaDePost:
      'Promessa: "A conta que separa quem cresce de quem só fatura é feita no dia 31." Problema: fecha-se o ano olhando faturamento, sem saber quanto do estoque é invendável. Solução: cobertura em dias, % de coleção morta e giro por curva — e o que cada número manda fazer em janeiro.',
  },
]
