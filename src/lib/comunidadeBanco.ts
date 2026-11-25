/*
 * GERADO por scripts/gerar-banco-comunidade.mjs — não edite à mão.
 *
 * A fonte é scripts/comunidade/banco-temas.md (o texto) e
 * scripts/comunidade/importancia.json (o nível de cada assunto). Para mudar
 * um assunto, edite lá e rode o script: o que for digitado aqui some na
 * próxima geração.
 */

export type Importancia = 3 | 4 | 5

export interface AssuntoDoBanco {
  /** Estável: é o que fica gravado quando ele marca "falei sobre esse tema". */
  id: string
  /** A categoria dentro do pilar (ex.: "Fechamento", "Curva ABC"). */
  tema: string
  assunto: string
  /** O que ele precisa trazer para o post: print, foto, conta, caso. */
  prova: string
  pergunta: string
  /** O dado muda toda semana, então o assunto se renova sozinho. */
  recorrente: boolean
  importancia: Importancia
}

export interface Pilar {
  letra: string
  /** Dia da semana, como em Date.getUTCDay(): domingo = 0. */
  dia: number
  nome: string
  /** O papel do pilar na semana do grupo. */
  papel: string
  assuntos: AssuntoDoBanco[]
}

export interface AssuntoDaLargada {
  id: string
  data: string
  assunto: string
  prova: string
  pergunta: string
  importancia: Importancia
}

export interface Coringa {
  id: string
  gatilho: string
  angulo: string
  pergunta: string
}

export interface Dinamica {
  quando: string
  nome: string
  como: string
}

export interface GanchoDoMes {
  gancho: string
  assuntos: string[]
}

/** 138 assuntos em 7 pilares. */
export const PILARES: Pilar[] = [
  {
    "letra": "N",
    "dia": 1,
    "nome": "Números da operação",
    "papel": "Abre a semana com prova real",
    "assuntos": [
      {
        "id": "N01",
        "tema": "Fechamento",
        "assunto": "O número da semana que mais surpreendeu e o porquê dele",
        "prova": "Print do painel com o número marcado",
        "pergunta": "Qual número da sua semana te surpreendeu?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "N02",
        "tema": "Fechamento",
        "assunto": "A semana que vendeu mais e lucrou menos",
        "prova": "Duas semanas lado a lado: faturamento x margem",
        "pergunta": "Você fecha a semana olhando faturamento ou margem?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "N03",
        "tema": "Fechamento",
        "assunto": "Divisão das vendas por canal e o canal que mais mexeu",
        "prova": "% por marketplace",
        "pergunta": "Qual canal mais cresceu pra você nos últimos 30 dias?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "N04",
        "tema": "Indicadores",
        "assunto": "Os 5 números que o Raphael olha toda segunda antes de qualquer reunião",
        "prova": "Lista + onde cada um fica no painel",
        "pergunta": "Quais são os 3 números que você olha toda segunda?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "N05",
        "tema": "Indicadores",
        "assunto": "Ticket médio: o que fez subir ou cair",
        "prova": "Evolução de 4 semanas + causa",
        "pergunta": "Que ação de ticket médio funciona na sua loja?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "N06",
        "tema": "Indicadores",
        "assunto": "Devolução da semana e o motivo número 1",
        "prova": "% de devolução + motivo",
        "pergunta": "Enquete: tamanho, qualidade, expectativa ou arrependimento?",
        "recorrente": true,
        "importancia": 5
      },
      {
        "id": "N07",
        "tema": "Indicadores",
        "assunto": "Ruptura da semana: SKUs sem estoque e a venda que ficou na mesa",
        "prova": "Nº de SKUs + estimativa de venda perdida",
        "pergunta": "Você mede quanto perde com ruptura?",
        "recorrente": true,
        "importancia": 5
      },
      {
        "id": "N08",
        "tema": "Indicadores",
        "assunto": "Produção da semana por etapa: corte, costura, acabamento",
        "prova": "Números por etapa",
        "pergunta": "Quem produz: qual etapa é seu gargalo hoje?",
        "recorrente": true,
        "importancia": 3
      },
      {
        "id": "N09",
        "tema": "Metas",
        "assunto": "Meta x realizado: onde bateu e onde ficou para trás",
        "prova": "Quadro de metas",
        "pergunta": "Você trabalha com meta semanal ou só mensal?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "N10",
        "tema": "Metas",
        "assunto": "Como a meta do mês vira meta por semana, canal e SKU",
        "prova": "Planilha de desdobramento",
        "pergunta": "Sua meta é feita por conta ou por feeling?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "N11",
        "tema": "Leitura de dados",
        "assunto": "O número bonito que escondia um problema",
        "prova": "Caso real (canal crescendo com margem caindo, SKU vendendo com devolução alta)",
        "pergunta": "Já comemorou um número que depois virou problema?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "N12",
        "tema": "Leitura de dados",
        "assunto": "Visita, conversão e venda: em que etapa o anúncio quebrou",
        "prova": "Métricas de um anúncio",
        "pergunta": "Você acompanha conversão por anúncio?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "N13",
        "tema": "Leitura de dados",
        "assunto": "A média engana: o SKU que puxa a média e esconde 20 que não vendem",
        "prova": "Distribuição de vendas por SKU",
        "pergunta": "Quantos SKUs seus não venderam nada no último mês?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "N14",
        "tema": "Comparativo",
        "assunto": "Mesma semana do ano passado: o que mudou na operação para o número mudar",
        "prova": "Comparativo + 2 ou 3 mudanças estruturais",
        "pergunta": "O que você faz hoje que não fazia há um ano?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "N15",
        "tema": "Comparativo",
        "assunto": "Cada degrau de faturamento e o sistema implantado antes dele",
        "prova": "Gráfico mês a mês com marcos",
        "pergunta": "Qual mudança mais fez sua loja crescer?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "N16",
        "tema": "Painel",
        "assunto": "Como é montado o painel da Swisz e de onde vem cada dado",
        "prova": "Print do painel",
        "pergunta": "Você acompanha venda por planilha, ERP ou painel?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "N17",
        "tema": "Painel",
        "assunto": "O indicador que a Swisz parou de olhar e por quê",
        "prova": "Exemplo",
        "pergunta": "Qual métrica você acompanha que não muda nenhuma decisão?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "N18",
        "tema": "Produtividade",
        "assunto": "Pedidos por colaborador: quanto a operação entrega por pessoa",
        "prova": "Pedidos ou peças por pessoa",
        "pergunta": "Você sabe quantos pedidos cada pessoa da equipe processa?",
        "recorrente": false,
        "importancia": 3
      }
    ]
  },
  {
    "letra": "P",
    "dia": 2,
    "nome": "Produto e curva ABC",
    "papel": "O que vender, repor e matar",
    "assuntos": [
      {
        "id": "P01",
        "tema": "Campeão",
        "assunto": "O produto que mais vendeu na semana e os 3 motivos de ele vender",
        "prova": "Foto + unidades + motivo (preço, modelagem, foto, tendência)",
        "pergunta": "Qual é seu campeão hoje e por que ele vende?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "P02",
        "tema": "Campeão",
        "assunto": "Como identificar um campeão nos primeiros 7 dias de anúncio",
        "prova": "Critérios: visita, conversão, velocidade",
        "pergunta": "Em quantos dias você decide se um produto deu certo?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P03",
        "tema": "Campeão",
        "assunto": "O campeão de vendas que era o pior em margem",
        "prova": "Conta do SKU",
        "pergunta": "Você sabe o lucro líquido por peça do seu mais vendido?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "P04",
        "tema": "Campeão",
        "assunto": "Quando acelerar a produção do campeão e quando segurar",
        "prova": "Regra de reposição da curva A",
        "pergunta": "Já perdeu a onda de um produto por falta de estoque?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "P05",
        "tema": "Curva ABC",
        "assunto": "Quantos SKUs fazem 80% do faturamento da Swisz",
        "prova": "% de SKUs na curva A",
        "pergunta": "Enquete: quantos SKUs fazem 80% do seu faturamento?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P06",
        "tema": "Curva ABC",
        "assunto": "Curva de faturamento x curva de lucro: as listas não batem",
        "prova": "As duas listas lado a lado",
        "pergunta": "Você monta sua curva por faturamento ou por margem?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "P07",
        "tema": "Curva ABC",
        "assunto": "Curva C: matar, liquidar ou reposicionar",
        "prova": "2 ou 3 decisões recentes",
        "pergunta": "Qual foi o último produto que você tirou de linha?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P08",
        "tema": "Curva ABC",
        "assunto": "Estoque parado: quanto capital está em produto sem giro há 60 dias",
        "prova": "% do estoque parado",
        "pergunta": "Enquete: quanto do seu estoque está parado há mais de 60 dias?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "P09",
        "tema": "Lançamento",
        "assunto": "O lançamento da semana e por que ele foi escolhido",
        "prova": "Foto + racional",
        "pergunta": "Quantos lançamentos você faz por mês?",
        "recorrente": true,
        "importancia": 3
      },
      {
        "id": "P10",
        "tema": "Lançamento",
        "assunto": "Lote piloto: quantas peças produzir antes de validar",
        "prova": "Regra de lote inicial",
        "pergunta": "Qual o tamanho do seu primeiro lote?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P11",
        "tema": "Lançamento",
        "assunto": "O lançamento que flopou e o que ele ensinou",
        "prova": "Números + diagnóstico",
        "pergunta": "Qual foi seu maior flop?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P12",
        "tema": "Tendência",
        "assunto": "Como nasce um produto na Swisz: de onde vem a ideia",
        "prova": "Fontes de pesquisa",
        "pergunta": "Onde você pesquisa tendência hoje?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "P13",
        "tema": "Tendência",
        "assunto": "Sempre cria, nunca copia: vender o ciclo inteiro antes da cópia chegar",
        "prova": "Produto copiado + o que já estava no próximo",
        "pergunta": "O que você faz quando te copiam?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "P14",
        "tema": "Tendência",
        "assunto": "O produto que viralizou na rede e não vendeu no marketplace",
        "prova": "Caso real",
        "pergunta": "Já produziu algo que bombou no Instagram e encalhou?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "P15",
        "tema": "Mix",
        "assunto": "Quantos SKUs a loja precisa: foco para validar, portfólio para escalar",
        "prova": "Evolução do nº de SKUs ativos",
        "pergunta": "Você está na fase de focar ou de ampliar?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P16",
        "tema": "Grade",
        "assunto": "Grade de tamanhos: como é definida a distribuição P, M, G, GG",
        "prova": "% de venda por tamanho",
        "pergunta": "Sua grade é definida por dado ou por costume?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "P17",
        "tema": "Grade",
        "assunto": "A cor que encalha: quando a variação ajuda e quando só multiplica estoque",
        "prova": "Cor que vende x cor que encalha",
        "pergunta": "Qual cor sempre sobra no seu estoque?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P18",
        "tema": "Produto",
        "assunto": "A reclamação de tamanho que virou ajuste de modelagem",
        "prova": "Caso + foto",
        "pergunta": "Você revisa modelagem com base em avaliação?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P19",
        "tema": "Ficha técnica",
        "assunto": "Ficha técnica completa: o documento que protege a margem antes do produto existir",
        "prova": "Foto de uma ficha (sem dado sensível)",
        "pergunta": "Todos os seus produtos têm ficha técnica?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "P20",
        "tema": "Foto",
        "assunto": "Essa foto vende, essa não vende: o que muda na primeira imagem",
        "prova": "Comparativo + conversão",
        "pergunta": "Quem faz suas fotos: estúdio, equipe ou o dono?",
        "recorrente": false,
        "importancia": 4
      }
    ]
  },
  {
    "letra": "M",
    "dia": 3,
    "nome": "Margem, preço e caixa",
    "papel": "A conta que separa faturamento de resultado",
    "assuntos": [
      {
        "id": "M01",
        "tema": "Precificação",
        "assunto": "A conta completa do produto no marketplace, do custo ao lucro líquido",
        "prova": "Conta real: custo R$ 22, venda R$ 59,90, 18% de taxa e imposto, R$ 7 de tarifa, R$ 20,11 líquidos",
        "pergunta": "Qual margem líquida você considera saudável?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M02",
        "tema": "Precificação",
        "assunto": "Preço mínimo: a linha abaixo da qual a Swisz não vende",
        "prova": "Como é calculado por canal",
        "pergunta": "Você tem preço mínimo definido por SKU?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M03",
        "tema": "Precificação",
        "assunto": "Mesmo produto, preço diferente por canal",
        "prova": "Comissão e preço por canal",
        "pergunta": "Você pratica o mesmo preço em todos os canais?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M04",
        "tema": "Precificação",
        "assunto": "Guerra de preço: quando entrar e quando sair",
        "prova": "Caso real de concorrente derrubando preço",
        "pergunta": "O que você faz quando o concorrente derruba o preço?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M05",
        "tema": "Precificação",
        "assunto": "Frete: quanto o subsídio come da margem",
        "prova": "Conta do impacto",
        "pergunta": "Você embute o frete ou absorve?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M06",
        "tema": "Custo invisível",
        "assunto": "Os custos que não aparecem no extrato no mesmo dia",
        "prova": "Lista: devolução, retrabalho, avaria, peça perdida",
        "pergunta": "Qual custo invisível você descobriu tarde demais?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M07",
        "tema": "Custo invisível",
        "assunto": "Quanto custa de verdade uma peça devolvida",
        "prova": "Conta: frete de volta, taxa, peça avariada",
        "pergunta": "Você sabe o custo de cada devolução?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M08",
        "tema": "Custo invisível",
        "assunto": "Peça manchada e peça perdida: o prejuízo de um mês sem controle de qualidade",
        "prova": "Peças descartadas ou retrabalhadas",
        "pergunta": "Você mede quantas peças perde por mês?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M09",
        "tema": "Ads",
        "assunto": "Quanto do faturamento vai para ads e qual é o teto",
        "prova": "% de ads sobre faturamento",
        "pergunta": "Enquete: quanto % você investe em ads?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M10",
        "tema": "Ads",
        "assunto": "ROAS de equilíbrio: a conta que diz se a campanha se paga",
        "prova": "Fórmula aplicada a um SKU",
        "pergunta": "Você sabe seu ROAS de equilíbrio?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M11",
        "tema": "Campanhas",
        "assunto": "Campanha do marketplace: quando participar e quando ficar de fora",
        "prova": "Critério + caso",
        "pergunta": "Você entra em todas as campanhas?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M12",
        "tema": "Caixa",
        "assunto": "Faturamento não é caixa: o mês que vendeu muito e faltou dinheiro",
        "prova": "Caso real (pode ser em %)",
        "pergunta": "Já viveu mês de venda alta e caixa apertado?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M13",
        "tema": "Caixa",
        "assunto": "A fábrica comporta X, o caixa permite Y",
        "prova": "Capacidade instalada x produção atual",
        "pergunta": "Enquete: o que trava mais seu crescimento hoje: caixa, produção ou venda?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M14",
        "tema": "Caixa",
        "assunto": "Prazo de recebimento dos marketplaces e o dinheiro que fica no caminho",
        "prova": "Prazo médio por canal",
        "pergunta": "Quanto tempo leva da venda ao dinheiro na conta?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M15",
        "tema": "Caixa",
        "assunto": "Antecipação de recebíveis: quando vale e quando é armadilha",
        "prova": "Critério de decisão",
        "pergunta": "Enquete: você antecipa recebíveis?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M16",
        "tema": "Caixa",
        "assunto": "Comprar tecido sem travar o fluxo de caixa",
        "prova": "Regra de compra (lote, prazo com fornecedor)",
        "pergunta": "Qual prazo você consegue com fornecedor?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M17",
        "tema": "Financeiro",
        "assunto": "DRE mensal: a planilha que diz se a empresa ganhou dinheiro",
        "prova": "Estrutura (sem valores)",
        "pergunta": "Você fecha DRE todo mês?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "M18",
        "tema": "Financeiro",
        "assunto": "Pró-labore: separar o dinheiro do dono do dinheiro da empresa",
        "prova": "Como o Raphael faz",
        "pergunta": "Enquete: você tem pró-labore fixo?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M19",
        "tema": "Financeiro",
        "assunto": "Onde reinvestir o lucro: estoque, máquina, gente ou ads",
        "prova": "Regra de alocação",
        "pergunta": "Onde você reinvestiria hoje?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "M20",
        "tema": "Margem",
        "assunto": "O canal que mais vende nem sempre é o que mais lucra",
        "prova": "Ranking por margem x por faturamento",
        "pergunta": "Seu canal mais lucrativo é o que mais vende?",
        "recorrente": false,
        "importancia": 5
      }
    ]
  },
  {
    "letra": "C",
    "dia": 4,
    "nome": "Marketplaces e anúncios",
    "papel": "Algoritmo, canais, reputação, ads",
    "assuntos": [
      {
        "id": "C01",
        "tema": "Algoritmo",
        "assunto": "O que faz um anúncio ganhar relevância na prática",
        "prova": "Fatores observados na operação",
        "pergunta": "O que você sente que mais pesa na relevância?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C02",
        "tema": "Algoritmo",
        "assunto": "O anúncio que caiu de posição: diagnóstico passo a passo",
        "prova": "Métricas antes e depois + causa",
        "pergunta": "Seu anúncio já caiu do nada? O que era?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C03",
        "tema": "Anúncio",
        "assunto": "As regras de título da Swisz por canal",
        "prova": "Regras reais: ML entre 58 e 60 caracteres, sem cor, fechando com estilo ou ocasião",
        "pergunta": "Você escreve título diferente para cada canal?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C04",
        "tema": "Anúncio",
        "assunto": "O teste de primeira foto que mudou a conversão",
        "prova": "Antes e depois + conversão",
        "pergunta": "Qual teste de foto deu mais resultado pra você?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C05",
        "tema": "Anúncio",
        "assunto": "Vídeo no anúncio: vale a produção?",
        "prova": "Anúncios com e sem vídeo",
        "pergunta": "Enquete: seus anúncios têm vídeo?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "C06",
        "tema": "Anúncio",
        "assunto": "A descrição que reduz pergunta e devolução",
        "prova": "Template de descrição",
        "pergunta": "Qual pergunta de cliente mais se repete?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C07",
        "tema": "Esteira",
        "assunto": "Um SKU, 14 contas, uma planilha: a esteira de publicação",
        "prova": "Print da planilha de status por canal",
        "pergunta": "Quanto tempo leva do produto pronto ao anúncio no ar?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "C08",
        "tema": "Canais",
        "assunto": "O mesmo produto no Mercado Livre e na Shopee: comportamentos diferentes",
        "prova": "Comparativo de um SKU",
        "pergunta": "Enquete: qual é seu canal principal?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C09",
        "tema": "Canais",
        "assunto": "O que a Swisz aprendeu em Shein, Temu e TikTok Shop",
        "prova": "1 aprendizado por canal",
        "pergunta": "Quem já está no TikTok Shop? Como está?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "C10",
        "tema": "Canais",
        "assunto": "Checklist antes de abrir um canal novo",
        "prova": "Checklist",
        "pergunta": "Qual canal você pensa em abrir em 2027?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C11",
        "tema": "Canais",
        "assunto": "Mais de uma conta no mesmo marketplace: quando faz sentido",
        "prova": "Estratégia de contas",
        "pergunta": "Enquete: você opera mais de uma conta?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "C12",
        "tema": "Logística",
        "assunto": "Full ou envio próprio: o critério de decisão",
        "prova": "Impacto em venda",
        "pergunta": "Quanto do seu volume vai pelo Full?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C13",
        "tema": "Reputação",
        "assunto": "O que derruba a reputação e como recuperar",
        "prova": "Caso real + plano",
        "pergunta": "Já tomou queda de reputação?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "C14",
        "tema": "Reputação",
        "assunto": "A avaliação recorrente que virou mudança no produto",
        "prova": "Print da avaliação + ação",
        "pergunta": "Você lê avaliações toda semana?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C15",
        "tema": "Ads",
        "assunto": "Como as campanhas de ads são organizadas",
        "prova": "Estrutura (por curva, por canal)",
        "pergunta": "Você separa campanha por curva ABC?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C16",
        "tema": "Ads",
        "assunto": "Quando desligar um anúncio patrocinado",
        "prova": "Critério",
        "pergunta": "Qual seu critério para pausar?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C17",
        "tema": "Campanhas",
        "assunto": "Oferta relâmpago: escada de venda ou queima de margem",
        "prova": "Resultado de uma relâmpago",
        "pergunta": "Relâmpago compensa pra você?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "C18",
        "tema": "Afiliados",
        "assunto": "Afiliados e creators: o canal que pouca gente mede",
        "prova": "Resultado",
        "pergunta": "Enquete: você trabalha com afiliados?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "C19",
        "tema": "Regras",
        "assunto": "Mudou a regra ou a taxa do marketplace: como a Swisz reage",
        "prova": "Caso recente",
        "pergunta": "Como você fica sabendo das mudanças?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "C20",
        "tema": "Site",
        "assunto": "Site próprio e marketplace: o papel de cada um",
        "prova": "Participação do site",
        "pergunta": "Quanto o site representa nas suas vendas?",
        "recorrente": false,
        "importancia": 4
      }
    ]
  },
  {
    "letra": "O",
    "dia": 5,
    "nome": "Fábrica, estoque e operação",
    "papel": "Bastidor da estrutura",
    "assuntos": [
      {
        "id": "O01",
        "tema": "Fábrica",
        "assunto": "Um minuto dentro de um setor e o indicador que ele persegue",
        "prova": "Vídeo curto do setor",
        "pergunta": "Qual setor mais te preocupa hoje?",
        "recorrente": true,
        "importancia": 3
      },
      {
        "id": "O02",
        "tema": "Corte",
        "assunto": "Encaixe no CAD e desperdício de tecido",
        "prova": "Foto do risco + % de aproveitamento",
        "pergunta": "Você mede aproveitamento de tecido?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O03",
        "tema": "Costura",
        "assunto": "Facção: como acompanhar prazo e qualidade de quem costura fora",
        "prova": "Relatório de envio e retorno de costura",
        "pergunta": "Qual sua maior dor com facção?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O04",
        "tema": "Costura",
        "assunto": "Romaneio: onde a peça some entre envio e retorno",
        "prova": "Processo de conferência",
        "pergunta": "Já sumiu peça na facção?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O05",
        "tema": "Acabamento",
        "assunto": "Produtividade por pessoa no acabamento e embalagem",
        "prova": "Métrica do setor",
        "pergunta": "Você mede produtividade individual?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "O06",
        "tema": "Qualidade",
        "assunto": "O defeito mais recorrente do mês e a causa",
        "prova": "Foto + % de reprovação",
        "pergunta": "Qual defeito mais aparece na sua produção?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "O07",
        "tema": "Qualidade",
        "assunto": "A mancha que derrubou um anúncio: qualidade e algoritmo andam juntos",
        "prova": "Caso real",
        "pergunta": "Você revisa peça a peça ou por amostragem?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O08",
        "tema": "PPCP",
        "assunto": "Como se decide o que entra na produção da semana",
        "prova": "Critério de prioridade (ruptura, curva A, giro)",
        "pergunta": "Como você decide o que produzir?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O09",
        "tema": "Estoque",
        "assunto": "Ponto de reposição: a conta que evita ruptura",
        "prova": "Venda média diária x lead time + estoque de segurança",
        "pergunta": "Você tem ponto de reposição por SKU?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "O10",
        "tema": "Estoque",
        "assunto": "O relatório de ruptura por SKU pai e como ele é lido",
        "prova": "Print",
        "pergunta": "Com que frequência você olha ruptura?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O11",
        "tema": "Estoque",
        "assunto": "Ruptura ainda acontece na escala: o caso desta semana",
        "prova": "Caso real + o que foi feito",
        "pergunta": "Qual foi sua última ruptura que doeu?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "O12",
        "tema": "Estoque",
        "assunto": "Inventário: a diferença entre o sistema e a prateleira",
        "prova": "% de divergência + causa",
        "pergunta": "Quando foi seu último inventário?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O13",
        "tema": "Estoque",
        "assunto": "Endereçamento: como o estoque é organizado para separar rápido",
        "prova": "Foto do estoque",
        "pergunta": "Seu estoque é endereçado?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "O14",
        "tema": "Expedição",
        "assunto": "Dia de pico na expedição: pedidos, pessoas e processo",
        "prova": "Números do dia + vídeo",
        "pergunta": "Quantos pedidos por dia sua equipe aguenta?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O15",
        "tema": "Expedição",
        "assunto": "Erro de envio: troca de tamanho e cor, e a bipagem que evita",
        "prova": "Processo",
        "pergunta": "Qual seu índice de erro de envio?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O16",
        "tema": "Sistema",
        "assunto": "O erro de integração que vendeu o que não existia",
        "prova": "Caso real",
        "pergunta": "Enquete: qual ERP você usa?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O17",
        "tema": "Automação",
        "assunto": "A tarefa manual que virou automação",
        "prova": "Exemplo: card automático no Trello com foto do Drive",
        "pergunta": "Qual tarefa repetitiva você automatizaria?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "O18",
        "tema": "Processo",
        "assunto": "O processo escrito depois de dar errado três vezes",
        "prova": "Exemplo de procedimento",
        "pergunta": "Seus processos estão escritos ou na cabeça de alguém?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "O19",
        "tema": "Compras",
        "assunto": "A ruptura que começou 40 dias antes, na compra do tecido",
        "prova": "Linha do tempo da compra ao anúncio",
        "pergunta": "Qual é o lead time do seu produto?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "O20",
        "tema": "Pós-venda",
        "assunto": "A reclamação investigada que evitou as próximas",
        "prova": "Caso + ação no lote",
        "pergunta": "Você investiga o lote quando chega reclamação?",
        "recorrente": false,
        "importancia": 4
      }
    ]
  },
  {
    "letra": "G",
    "dia": 6,
    "nome": "Pessoas, cultura e liderança",
    "papel": "Time, papel do dono, gestão",
    "assuntos": [
      {
        "id": "G01",
        "tema": "Papel do dono",
        "assunto": "Onde foi o tempo do Raphael nesta semana",
        "prova": "Print da agenda",
        "pergunta": "Quanto do seu tempo vai para operação e quanto para estratégia?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G02",
        "tema": "Papel do dono",
        "assunto": "A tarefa que o Raphael deixou de fazer e quem assumiu",
        "prova": "Caso real",
        "pergunta": "Qual tarefa você ainda faz e já deveria ter delegado?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G03",
        "tema": "Papel do dono",
        "assunto": "Se o dono sumir uma semana, o que para?",
        "prova": "Reflexão + exemplo",
        "pergunta": "O que para na sua empresa se você sumir 7 dias?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "G04",
        "tema": "Contratação",
        "assunto": "A ordem das contratações: quem entra primeiro",
        "prova": "Linha do tempo de contratações",
        "pergunta": "Qual foi sua melhor contratação?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G05",
        "tema": "Contratação",
        "assunto": "Teste antes de efetivar: como o RH avalia freelancer na fábrica",
        "prova": "Processo do RH",
        "pergunta": "Você testa antes de contratar?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G06",
        "tema": "Contratação",
        "assunto": "Atitude ou técnica: o que pesa mais",
        "prova": "Visão do Raphael",
        "pergunta": "Enquete: atitude ou técnica?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G07",
        "tema": "Gestão",
        "assunto": "Avaliação de desempenho na produção: os 12 critérios",
        "prova": "Formulário (sem nomes)",
        "pergunta": "Você avalia desempenho formalmente?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G08",
        "tema": "Gestão",
        "assunto": "A reunião semanal de gestão: pauta e números",
        "prova": "Estrutura da reunião",
        "pergunta": "Como é sua reunião semanal com o time?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G09",
        "tema": "Gestão",
        "assunto": "Meta por setor: como cada área sabe se ganhou a semana",
        "prova": "Exemplo de meta",
        "pergunta": "Seu time sabe a meta dele de cabeça?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G10",
        "tema": "Gestão",
        "assunto": "Feedback difícil sem perder a pessoa",
        "prova": "Caso real (sem expor ninguém)",
        "pergunta": "Como você dá feedback negativo?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G11",
        "tema": "Cultura",
        "assunto": "Manual do colaborador: por que escrever a cultura",
        "prova": "Trecho do manual",
        "pergunta": "Sua cultura está escrita?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G12",
        "tema": "Cultura",
        "assunto": "O comportamento que não é tolerado na Swisz",
        "prova": "Exemplo",
        "pergunta": "Qual comportamento você não tolera no time?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G13",
        "tema": "Cultura",
        "assunto": "Bonificação e reconhecimento na produção: o que funciona",
        "prova": "Modelo real",
        "pergunta": "Enquete: você tem bonificação por meta?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G14",
        "tema": "Cultura",
        "assunto": "NR-1 e riscos psicossociais: o que a Swisz fez",
        "prova": "Avaliação aplicada pelo RH",
        "pergunta": "Você já sabe o que a NR-1 exige da sua empresa?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G15",
        "tema": "Liderança",
        "assunto": "O líder que começou na base",
        "prova": "História real",
        "pergunta": "Já promoveu alguém da operação para liderança?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G16",
        "tema": "Liderança",
        "assunto": "O erro de transformar o melhor operador em líder",
        "prova": "Reflexão",
        "pergunta": "Já errou numa promoção?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G17",
        "tema": "Retenção",
        "assunto": "Quanto custa perder um colaborador treinado",
        "prova": "Estimativa de custo",
        "pergunta": "Qual sua maior dificuldade para reter gente?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "G18",
        "tema": "Treinamento",
        "assunto": "Os primeiros 7 dias de um colaborador novo",
        "prova": "Checklist de onboarding",
        "pergunta": "Você tem onboarding estruturado?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G19",
        "tema": "Família",
        "assunto": "Regras para trabalhar com família na empresa",
        "prova": "Visão do Raphael",
        "pergunta": "Trabalha com família? Qual a regra número 1?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "G20",
        "tema": "Rotina",
        "assunto": "A primeira hora do dia do Raphael",
        "prova": "Rotina real",
        "pergunta": "Como é sua primeira hora do dia?",
        "recorrente": false,
        "importancia": 3
      }
    ]
  },
  {
    "letra": "V",
    "dia": 0,
    "nome": "Visão, decisões e lições",
    "papel": "Reflexão, aquisições, erros, próximos passos",
    "assuntos": [
      {
        "id": "V01",
        "tema": "Aquisição",
        "assunto": "A nova aquisição: o que foi comprado, que gargalo resolve, em quanto tempo se paga",
        "prova": "Foto + racional + payback",
        "pergunta": "Qual foi o melhor investimento que você fez na operação?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "V02",
        "tema": "Aquisição",
        "assunto": "Máquina ou pessoa: quando automatizar",
        "prova": "Caso",
        "pergunta": "O que você automatizaria se tivesse caixa?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V03",
        "tema": "Aquisição",
        "assunto": "O investimento que não se pagou e onde o racional falhou",
        "prova": "Caso real",
        "pergunta": "Qual investimento você se arrepende de ter feito?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V04",
        "tema": "Decisão",
        "assunto": "A decisão difícil da semana e os critérios usados",
        "prova": "Caso + hierarquia: margem, crescimento, operação, velocidade, posicionamento",
        "pergunta": "Qual decisão você está adiando?",
        "recorrente": true,
        "importancia": 5
      },
      {
        "id": "V05",
        "tema": "Decisão",
        "assunto": "A oportunidade que a Swisz recusou",
        "prova": "Caso",
        "pergunta": "Qual oportunidade você recusou e não se arrepende?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V06",
        "tema": "Linha do tempo",
        "assunto": "A operação neste mesmo mês em 2020, 2022 e hoje",
        "prova": "Fotos lado a lado",
        "pergunta": "Manda uma foto do começo da sua operação",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V07",
        "tema": "Linha do tempo",
        "assunto": "O primeiro funcionário, o primeiro galpão, o primeiro marco",
        "prova": "História",
        "pergunta": "Qual marco você lembra até hoje?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V08",
        "tema": "Lição",
        "assunto": "O erro mais caro da trajetória",
        "prova": "História + quanto custou",
        "pergunta": "Qual foi o erro mais caro do seu negócio?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V09",
        "tema": "Lição",
        "assunto": "O que o Raphael faria diferente se começasse hoje",
        "prova": "Lista curta",
        "pergunta": "E você, o que faria diferente?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V10",
        "tema": "Mercado",
        "assunto": "A notícia da semana e o impacto prático para quem vende moda",
        "prova": "Notícia + leitura",
        "pergunta": "Isso afeta sua operação? Como?",
        "recorrente": true,
        "importancia": 4
      },
      {
        "id": "V11",
        "tema": "Mercado",
        "assunto": "Shein e Temu: concorrente ou canal",
        "prova": "Visão + experiência real nos dois",
        "pergunta": "Enquete: concorrente ou canal?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V12",
        "tema": "Mercado",
        "assunto": "O que o seller vai precisar ter em 2027 que não tem hoje",
        "prova": "Visão",
        "pergunta": "O que você muda em 2027?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V13",
        "tema": "Visão",
        "assunto": "O que está sendo construído agora na Swisz",
        "prova": "Bastidor do projeto",
        "pergunta": "Qual é seu próximo grande passo?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V14",
        "tema": "Visão",
        "assunto": "Vender produto ou construir marca dentro do marketplace",
        "prova": "Visão",
        "pergunta": "Você vende marca ou vende produto?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V15",
        "tema": "Reflexão",
        "assunto": "O teto invisível de quem cresce faturamento sem estrutura",
        "prova": "Reflexão + exemplo",
        "pergunta": "Onde você sente que bateu no teto?",
        "recorrente": false,
        "importancia": 5
      },
      {
        "id": "V16",
        "tema": "Reflexão",
        "assunto": "Competir sem se comparar: com quem o Raphael aprende hoje",
        "prova": "Referências",
        "pergunta": "Com quem você aprende hoje?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V17",
        "tema": "Reflexão",
        "assunto": "Constância: o hábito de gestão que não falha há 12 meses",
        "prova": "Hábito + resultado",
        "pergunta": "Qual hábito de gestão você mantém toda semana?",
        "recorrente": false,
        "importancia": 4
      },
      {
        "id": "V18",
        "tema": "Bastidor",
        "assunto": "Visita, feira ou viagem de pesquisa: 3 coisas que voltaram para a operação",
        "prova": "Fotos + aprendizados",
        "pergunta": "Qual evento realmente valeu pra você?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V19",
        "tema": "Bastidor",
        "assunto": "A conversa com um fornecedor ou especialista que mudou uma decisão",
        "prova": "Resumo",
        "pergunta": "Qual parceiro mais te ensinou?",
        "recorrente": false,
        "importancia": 3
      },
      {
        "id": "V20",
        "tema": "Case",
        "assunto": "Case de mentorado: o problema, a mudança e o resultado",
        "prova": "Case autorizado com número real",
        "pergunta": "Quem aqui vive o mesmo problema?",
        "recorrente": false,
        "importancia": 4
      }
    ]
  }
]

export const LARGADA: AssuntoDaLargada[] = [
  {
    "id": "L-2026-11-25",
    "data": "2026-11-25",
    "assunto": "Boas-vindas: por que o grupo existe e como funciona a rotação da semana",
    "prova": "Áudio do Raphael",
    "pergunta": "Enquete de apresentação: canal principal e maior gargalo hoje",
    "importancia": 4
  },
  {
    "id": "L-2026-11-26",
    "data": "2026-11-26",
    "assunto": "Véspera da Black Friday na Swisz: estoque, preço mínimo e o que foi produzido a mais",
    "prova": "Foto do estoque pronto",
    "pergunta": "O que você preparou diferente este ano?",
    "importancia": 5
  },
  {
    "id": "L-2026-11-27",
    "data": "2026-11-27",
    "assunto": "Black Friday ao vivo: parciais de manhã, tarde e noite",
    "prova": "Prints ao longo do dia + vídeo da expedição",
    "pergunta": "Como está seu dia até agora?",
    "importancia": 5
  },
  {
    "id": "L-2026-11-28",
    "data": "2026-11-28",
    "assunto": "Resultado da Black Friday e o sistema que permitiu o número",
    "prova": "Print do fechamento",
    "pergunta": "Enquete: sua BF foi boa em faturamento, em margem ou nos dois?",
    "importancia": 5
  },
  {
    "id": "L-2026-11-29",
    "data": "2026-11-29",
    "assunto": "O que deu errado na Black Friday e o que muda para 2027",
    "prova": "Caso real",
    "pergunta": "Qual foi seu maior aprendizado da data?",
    "importancia": 4
  },
  {
    "id": "L-2026-11-30",
    "data": "2026-11-30",
    "assunto": "Cyber Monday e o destino do estoque que sobrou",
    "prova": "Estoque remanescente por curva",
    "pergunta": "O que você faz com o que sobrou da BF?",
    "importancia": 5
  },
  {
    "id": "L-2026-12-01",
    "data": "2026-12-01",
    "assunto": "Dezembro: Natal, 12.12 e pico de verão. O plano do mês",
    "prova": "Plano de produção e campanhas",
    "pergunta": "Qual é sua maior data de dezembro?",
    "importancia": 4
  }
]

export const CORINGAS: Coringa[] = [
  {
    "id": "coringa-recorde",
    "gatilho": "Recorde de venda, produção ou pedidos",
    "angulo": "O recorde e o sistema que permitiu",
    "pergunta": "Qual foi seu último recorde e o que estava diferente?"
  },
  {
    "id": "coringa-crise",
    "gatilho": "Crise: conta suspensa, anúncio derrubado, ruptura grave, atraso de facção, falha de integração",
    "angulo": "O que aconteceu, como foi tratado, o que muda",
    "pergunta": "Já passou por isso? Como resolveu?"
  },
  {
    "id": "coringa-aquisicao",
    "gatilho": "Nova aquisição: máquina, sistema, galpão, pessoa-chave",
    "angulo": "Gargalo que resolve + payback",
    "pergunta": "Qual seria sua próxima aquisição?"
  },
  {
    "id": "coringa-regra-de-marketplace",
    "gatilho": "Mudança de regra ou taxa de marketplace",
    "angulo": "O impacto na conta do produto",
    "pergunta": "Como isso mexe na sua margem?"
  },
  {
    "id": "coringa-noticia",
    "gatilho": "Notícia de mercado (tributação, importação, plataformas)",
    "angulo": "Leitura prática para o seller",
    "pergunta": "Você já está se preparando?"
  },
  {
    "id": "coringa-data-comercial",
    "gatilho": "Data comercial a 7 dias",
    "angulo": "O plano de preparação da Swisz",
    "pergunta": "O que você já deixou pronto?"
  },
  {
    "id": "coringa-pergunta-de-membro",
    "gatilho": "Pergunta forte de um membro",
    "angulo": "Vira o tema do dia (com permissão)",
    "pergunta": "Quem mais vive isso?"
  },
  {
    "id": "coringa-mentorado",
    "gatilho": "Resultado de mentorado",
    "angulo": "Case com número real (com autorização)",
    "pergunta": "Quem tem o mesmo gargalo?"
  }
]

export const DINAMICAS: Dinamica[] = [
  {
    "quando": "Toda segunda",
    "nome": "Enquete do painel",
    "como": "Enquete rápida ligada ao número do dia"
  },
  {
    "quando": "Segunda a sexta",
    "nome": "Desafio da semana",
    "como": "Lança na segunda, fecha na sexta. Ex.: calcular a margem líquida dos 3 mais vendidos; revisar o título dos 5 principais anúncios; medir devolução do mês por motivo; listar SKUs sem venda há 60 dias"
  },
  {
    "quando": "Quarta, quinzenal",
    "nome": "Hot seat",
    "como": "Um membro traz um problema real, o Raphael responde em áudio e o grupo contribui"
  },
  {
    "quando": "Toda sexta",
    "nome": "Erro da semana",
    "como": "Cada um conta um erro e o que mudou depois dele"
  },
  {
    "quando": "Mensal",
    "nome": "Q&A ao vivo",
    "como": "Perguntas acumuladas no mês respondidas ao vivo"
  },
  {
    "quando": "Entrada de membro",
    "nome": "Apresentação padrão",
    "como": "Nome, loja, canal principal, maior gargalo hoje"
  },
  {
    "quando": "Fim do mês",
    "nome": "Curadoria",
    "como": "As 5 melhores trocas do grupo no mês"
  }
]

/** Chave `AAAA-MM`. */
export const SAZONAL: Record<string, GanchoDoMes> = {
  "2026-12": {
    "gancho": "12.12, Natal, Réveillon",
    "assuntos": [
      "Prazo de produção e envio para o Natal",
      "branco e festa para o Réveillon",
      "retrospectiva 2026 em números",
      "planejamento 2027"
    ]
  },
  "2027-01": {
    "gancho": "Liquidação de verão, virada do ano",
    "assuntos": [
      "Queima da curva C",
      "DRE do ano",
      "metas 2027 desdobradas",
      "reposição de verão"
    ]
  },
  "2027-02": {
    "gancho": "Carnaval (6 a 9/02)",
    "assuntos": [
      "Produto de Carnaval: lote curto ou ficar de fora",
      "compra de tecido para outono e inverno"
    ]
  },
  "2027-03": {
    "gancho": "Dia da Mulher (08/03), Dia do Consumidor (15/03)",
    "assuntos": [
      "Lançamento de outono",
      "precificação da coleção nova",
      "campanha do consumidor: entrar ou não"
    ]
  },
  "2027-04": {
    "gancho": "Entressafra",
    "assuntos": [
      "Produção de inverno em ritmo",
      "ficha técnica de inverno revisada",
      "preparação para o Dia das Mães"
    ]
  },
  "2027-05": {
    "gancho": "Dia das Mães (09/05)",
    "assuntos": [
      "Kits e presente",
      "a maior data do semestre",
      "expedição de pico"
    ]
  },
  "2027-06": {
    "gancho": "Dia dos Namorados (12/06), festa junina, inverno",
    "assuntos": [
      "Pico de inverno",
      "looks de festa junina",
      "reposição de inverno sem sobrar"
    ]
  },
  "2027-07": {
    "gancho": "Liquidação de inverno, meio do ano",
    "assuntos": [
      "Balanço do semestre",
      "o que sobrou do inverno",
      "plano do segundo semestre"
    ]
  },
  "2027-08": {
    "gancho": "Virada de coleção",
    "assuntos": [
      "Compra de tecido de verão",
      "lançamento primavera e verão",
      "Dia dos Pais (08/08) só para quem vende masculino"
    ]
  },
  "2027-09": {
    "gancho": "9.9, primavera",
    "assuntos": [
      "Lançamento de verão",
      "início do planejamento da Black Friday"
    ]
  },
  "2027-10": {
    "gancho": "10.10",
    "assuntos": [
      "Produção antecipada para a BF",
      "preço mínimo por SKU",
      "estoque de segurança"
    ]
  },
  "2027-11": {
    "gancho": "11.11, Black Friday (26/11)",
    "assuntos": [
      "Semana da BF ao vivo",
      "pós-BF",
      "o ciclo recomeça"
    ]
  }
}
