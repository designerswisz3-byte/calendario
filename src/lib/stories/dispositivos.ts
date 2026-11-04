/**
 * Os dispositivos: o que o story PEDE de quem está assistindo.
 *
 * ----------------------------------------------------------------------------
 * Por que esta camada existe
 * ----------------------------------------------------------------------------
 * O gerador tinha gatilhos (o que o story FAZ) e não tinha dispositivos (o que
 * o story PEDE). O efeito na tela era o que o Raphael descreveu: sequência
 * padronizada. Toda sequência pedia a mesma coisa — uma enquete no meio e uma
 * caixinha no fim — porque `pedeInteracao` era um booleano, e um booleano só
 * sabe duas coisas.
 *
 * Um story de verdade não pede "interação". Pede uma coisa específica: manda um
 * print, acha o erro, vota entre dois cenários, levanta a mão, volta às seis.
 * Cada pedido tem um custo diferente para quem assiste e devolve uma coisa
 * diferente para quem publica. Pedir um emoji custa um toque e devolve
 * presença; pedir um print custa dois minutos e devolve prova social.
 *
 * ----------------------------------------------------------------------------
 * De onde vem
 * ----------------------------------------------------------------------------
 * Do material de dispositivos de engenharia social do STORIES 10X, adaptado
 * para o nicho: quem assiste o Raphael é dono de e-commerce de moda, não
 * audiência de lifestyle. "Peça um print" aqui não é print de tela bonita — é
 * print do relatório de margem, da curva de tamanho, do extrato do marketplace.
 *
 * ----------------------------------------------------------------------------
 * A régua: por que nem todos os 38 entraram
 * ----------------------------------------------------------------------------
 * Foram cortados os que exigem algo que o Raphael não tem hoje ou que colidem
 * com a hierarquia de decisão da casa:
 *
 *  - os que dependem de tráfego pago para trazer público de fora;
 *  - os que pedem sorteio ou presente físico (custa margem e atrai audiência
 *    que não compra formação);
 *  - os de espetacularização pura, que entregam alcance e nenhuma decisão.
 *
 * O que sobrou são os que funcionam com o que ele já tem: operação real,
 * número real, direct cheio de dúvida de dono de loja.
 */

/** Quanto custa para quem assiste. Decide quantos desses cabem num dia. */
export type Custo = 'um toque' | 'dois minutos' | 'trabalho de verdade'

/** O que o dispositivo devolve. É por aqui que o gerador equilibra o dia. */
export type Retorno =
  | 'presença' /* a pessoa se mexe, o Instagram entende que o perfil é vivo */
  | 'resposta' /* chega texto no direct — matéria-prima do conteúdo seguinte */
  | 'prova social' /* chega print ou depoimento que vira autoridade amanhã */
  | 'lista' /* separa quem quer de quem só assiste */
  | 'retenção' /* a pessoa volta mais tarde ou amanhã */

export type DispositivoId =
  | 'enquete_dois_cenarios'
  | 'caixinha_aberta'
  | 'caixinha_pessoal'
  | 'levante_a_mao'
  | 'manda_um_emoji'
  | 'peca_o_print'
  | 'print_do_direct'
  | 'conversa_sem_privacidade'
  | 'ache_o_erro'
  | 'tarja_de_curiosidade'
  | 'elemento_escondido'
  | 'volta_mais_tarde'
  | 'ative_a_notificacao'
  | 'meta_coletiva'
  | 'hotseat'
  | 'bi_apurado'
  | 'desafio_curto'
  | 'psicologia_reversa'
  | 'voce_sabia'
  | 'nome_proprio'
  | 'resumo_da_sequencia'
  | 'indicacao'
  | 'peca_compartilhamento'
  | 'nenhum'

export interface Dispositivo {
  id: DispositivoId
  rotulo: string
  /** A lógica: por que isso mexe com quem assiste. Uma frase. */
  logica: string
  /** Como se executa no nicho do Raphael. É o que vai para a direção visual. */
  comoUsar: string
  custo: Custo
  retorno: Retorno
  /**
   * O que fazer com o que chega.
   *
   * Sem isso o dispositivo é desperdício: a pessoa responde, o Raphael lê e
   * morre ali. Todo pedido tem de ter um destino — e o destino quase sempre é
   * o conteúdo do dia seguinte.
   */
  oQueFazerDepois: string
}

const LISTA: Dispositivo[] = [
  /* ------------------------------------------------- pedidos de um toque -- */
  {
    id: 'enquete_dois_cenarios',
    rotulo: 'Enquete entre dois cenários ruins',
    logica:
      'Escolher entre duas coisas ruins obriga a pessoa a se reconhecer num dos dois. Enquete de sim ou não não obriga a nada.',
    comoUsar:
      'Dois cenários que acontecem de verdade na loja de quem assiste, nenhum confortável. Nunca "sim/não", nunca "você faz isso?".',
    custo: 'um toque',
    retorno: 'presença',
    oQueFazerDepois:
      'Mostre o resultado no story seguinte e fale com quem perdeu a votação. É a parte que quase todo mundo esquece.',
  },
  {
    id: 'manda_um_emoji',
    rotulo: 'Manda um emoji',
    logica:
      'O pedido mais barato que existe. Serve para medir quem está assistindo de verdade quando o assunto é denso.',
    comoUsar:
      'Um emoji só, escolhido por você e sempre o mesmo. "Se a sua grade está furada agora, me manda um 📉."',
    custo: 'um toque',
    retorno: 'presença',
    oQueFazerDepois:
      'Conte quantos chegaram e diga o número no dia seguinte. O número vira o dado de abertura do próximo story.',
  },
  {
    id: 'levante_a_mao',
    rotulo: 'Levante a mão',
    logica:
      'Separa quem quer de quem só assiste. É triagem, não engajamento — e é assim que nasce lista de interessado.',
    comoUsar:
      'Peça uma palavra exata no direct: "me manda EU QUERO que eu te mando a planilha". A palavra exata é o que deixa filtrar depois.',
    custo: 'um toque',
    retorno: 'lista',
    oQueFazerDepois:
      'Responda TODOS no mesmo dia, mesmo que com áudio curto. A lista só vale se a primeira resposta for rápida.',
  },
  {
    id: 'volta_mais_tarde',
    rotulo: 'Volta mais tarde',
    logica:
      'Marcar hora cria um compromisso. A pessoa volta porque você disse quando, não porque ela lembrou.',
    comoUsar:
      'Diga a hora e o que vai mostrar: "às 18h eu volto com o número fechado do dia". E volte — se furar uma vez, não funciona mais.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Abra o story das 18h citando que você prometeu. Quem voltou precisa ser reconhecido.',
  },
  {
    id: 'ative_a_notificacao',
    rotulo: 'Ative a notificação',
    logica:
      'Só funciona depois de uma sequência boa. Pedir antes de entregar é pedir favor; pedir depois é oferecer continuação.',
    comoUsar:
      'Peça no story seguinte ao melhor da sequência, e diga o motivo concreto: "amanhã eu abro a planilha de margem aqui".',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Entregue o que prometeu no dia seguinte, no mesmo horário.',
  },

  /* ---------------------------------------------- pedidos de dois minutos -- */
  {
    id: 'caixinha_aberta',
    rotulo: 'Caixinha de pergunta',
    logica:
      'Quem pergunta entrega o assunto do próximo conteúdo já com a dúvida formulada do jeito que o mercado fala.',
    comoUsar:
      'Pergunte por um problema, não por uma opinião: "qual número da sua loja você não sabe tirar?" — e não "o que você quer ver aqui?".',
    custo: 'dois minutos',
    retorno: 'resposta',
    oQueFazerDepois:
      'Escolha UMA pergunta e responda com uma sequência inteira amanhã. Responder dez por cima não ensina ninguém.',
  },
  {
    id: 'caixinha_pessoal',
    rotulo: 'Caixinha pessoal (nada de trabalho)',
    logica:
      'Humaniza sem exposição. Abre espaço para a pergunta que a pessoa não se sente à vontade de fazer no meio do conteúdo técnico.',
    comoUsar:
      'Anuncie a regra num story antes: "pergunte qualquer coisa, menos trabalho". Responda rápido, sem lição de moral.',
    custo: 'dois minutos',
    retorno: 'resposta',
    oQueFazerDepois: 'Responda as mais aleatórias também. São elas que geram o print que a pessoa manda para a amiga.',
  },
  {
    id: 'peca_o_print',
    rotulo: 'Peça o print',
    logica:
      'Prova social não aparece sozinha. A pessoa só manda porque alguém pediu — e porque viu outra mandando.',
    comoUsar:
      'Peça o print do que você ensinou a tirar: a curva de tamanho, a conta de margem, o relatório de devolução. "Me manda o seu que eu comento."',
    custo: 'dois minutos',
    retorno: 'prova social',
    oQueFazerDepois:
      'Publique o primeiro print que chegar, com o comentário. A partir do primeiro, os outros vêm sem pedir.',
  },
  {
    id: 'ache_o_erro',
    rotulo: 'Ache o erro',
    logica:
      'Procurar prende mais do que ouvir. E quem acha o erro sozinho acredita na correção — não precisa ser convencido.',
    comoUsar:
      'Mostre uma tela real com um erro plantado: uma precificação, um anúncio, uma grade. "Tem um erro aqui que custa margem. Acha."',
    custo: 'dois minutos',
    retorno: 'resposta',
    oQueFazerDepois: 'Mostre a resposta no story seguinte e cite quem acertou primeiro.',
  },
  {
    id: 'bi_apurado',
    rotulo: 'Pesquisa com a audiência',
    logica:
      'Você descobre o estado real do mercado e devolve o dado. O dado que você levantou é seu — ninguém mais tem.',
    comoUsar:
      'Três ou quatro enquetes seguidas sobre o mesmo tema operacional, para virar um número: "68% de vocês não sabe a margem por peça".',
    custo: 'dois minutos',
    retorno: 'presença',
    oQueFazerDepois:
      'Transforme o resultado em dado de abertura. Vira post, vira aula de mentoria e vira autoridade — é dado próprio.',
  },
  {
    id: 'desafio_curto',
    rotulo: 'Desafio curto com análise',
    logica:
      'A promessa de análise é o pagamento. Ninguém executa por nada — executa porque você olha o resultado dele.',
    comoUsar:
      'Uma tarefa de até 15 minutos, feita hoje: "tira a curva de tamanho do seu campeão e me manda que eu analiso".',
    custo: 'trabalho de verdade',
    retorno: 'prova social',
    oQueFazerDepois: 'Analise em público, com o nome de quem mandou. A análise pública é o conteúdo.',
  },

  /* -------------------------------------------- dispositivos de retenção -- */
  {
    id: 'tarja_de_curiosidade',
    rotulo: 'Tarja de curiosidade',
    logica:
      'Esconder a parte decisiva da tela faz a pessoa querer a próxima. Esconder a parte irrelevante irrita.',
    comoUsar:
      'Tampe só o número: a margem, o faturamento do canal, o custo da peça. O resto da tela fica à vista.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Mostre o número no story seguinte. Tarja que não abre uma vez queima as próximas.',
  },
  {
    id: 'elemento_escondido',
    rotulo: 'Elemento escondido',
    logica:
      'Quem percebe sente que está por dentro. Cria duas camadas de audiência e a de dentro se sente de dentro.',
    comoUsar:
      'Deixe algo na cena sem comentar: a caixa de uma coleção nova, uma tela de resultado, o nome de um fornecedor.',
    custo: 'um toque',
    retorno: 'resposta',
    oQueFazerDepois: 'Quando alguém perguntar, publique o print da pergunta. Aí todo mundo vai procurar na próxima.',
  },

  /* ---------------------------------------- dispositivos de prova e de voz -- */
  {
    id: 'print_do_direct',
    rotulo: 'Print do direct',
    logica:
      'Mostrar que você responde é o que faz a próxima pessoa mandar mensagem. Ninguém manda para quem parece inalcançável.',
    comoUsar:
      'Print da dúvida de um dono de loja, com o nome tampado, e a sua resposta. A dúvida tem de ser comum, não exótica.',
    custo: 'um toque',
    retorno: 'prova social',
    oQueFazerDepois: 'Use a dúvida do print como assunto da sequência seguinte.',
  },
  {
    id: 'conversa_sem_privacidade',
    rotulo: 'Conversa sem privacidade',
    logica:
      'Ler uma conversa alheia prende mais do que ouvir uma explicação. É a mesma curiosidade de mesa de bar.',
    comoUsar:
      'Print de uma conversa real com fornecedor, com a equipe ou com um aluno de mentoria — com autorização e nome tampado.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Explique a decisão que saiu da conversa. O print é o gancho, a decisão é o conteúdo.',
  },
  {
    id: 'hotseat',
    rotulo: 'Dia do hotseat',
    logica:
      'A audiência traz o conteúdo. Você só escolhe, analisa e devolve — e quem foi escolhido divulga por você.',
    comoUsar:
      'Peça o print de uma loja ou de um anúncio e analise ao vivo um por dia. "Manda sua ficha de produto que eu abro aqui."',
    custo: 'trabalho de verdade',
    retorno: 'prova social',
    oQueFazerDepois: 'Marque o perfil analisado. Ele leva a sequência para a audiência dele.',
  },
  {
    id: 'meta_coletiva',
    rotulo: 'Meta coletiva',
    logica:
      'Transforma audiência em time. Cada um faz uma parte pequena e o grupo cobra o resultado de você.',
    comoUsar:
      'Uma condição clara e um prêmio que você aguenta entregar: "se 300 pessoas compartilharem, eu abro a planilha de precificação por canal".',
    custo: 'um toque',
    retorno: 'presença',
    oQueFazerDepois: 'Mostre o placar de hora em hora e entregue no mesmo dia em que a meta bater.',
  },
  {
    id: 'peca_compartilhamento',
    rotulo: 'Peça o compartilhamento',
    logica:
      'Compartilhamento é o único alcance que não depende do algoritmo gostar de você.',
    comoUsar:
      'Peça com destinatário, não para o mundo: "manda isso para o sócio que decide o preço contigo".',
    custo: 'um toque',
    retorno: 'presença',
    oQueFazerDepois: 'Responda quem compartilhou. É o reforço que faz repetir.',
  },
  {
    id: 'indicacao',
    rotulo: 'Indicação (livro, planilha, fornecedor)',
    logica:
      'Indicar algo de fora mostra repertório e custa zero. E associa você à coisa indicada para sempre.',
    comoUsar:
      'Indique o que você usa de verdade e diga o uso específico: qual capítulo, qual aba da planilha, para qual decisão.',
    custo: 'um toque',
    retorno: 'resposta',
    oQueFazerDepois: 'Pergunte quem já leu e o que tirou. Vira conversa, não recomendação solta.',
  },

  /* ----------------------------------------- dispositivos de redação pura -- */
  {
    id: 'psicologia_reversa',
    rotulo: 'Psicologia reversa',
    logica:
      'Dizer para não fazer prende mais do que mandar fazer. Quem está no erro se reconhece sem se sentir corrigido.',
    comoUsar:
      'Instrução invertida, com o custo na frente: "não calcule sua margem hoje. Você vai descobrir que vende no prejuízo há três meses".',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Desfaça a inversão antes de fechar a sequência. Ironia sem fecho vira mensagem errada.',
  },
  {
    id: 'voce_sabia',
    rotulo: 'Você sabia',
    logica:
      'Informação que a pessoa não tinha e consegue conferir sozinha compra credibilidade em um story.',
    comoUsar:
      'Um fato verificável do setor, com a fonte na tela: regra de comissão, prazo de repasse, mudança de política do canal.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Diga o que esse fato muda na operação dela amanhã. Fato sem consequência é curiosidade.',
  },
  {
    id: 'nome_proprio',
    rotulo: 'Dar nome à técnica',
    logica:
      'O que tem nome é lembrado e repetido. E quem repete o nome cita você junto, de graça.',
    comoUsar:
      'Batize a sua regra com um nome curto e estranho, e use sempre o mesmo: "régua de desconto por tempo", "piso de frete".',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Repita o nome por semanas, sempre igual. Nome que muda não ancora.',
  },
  {
    id: 'resumo_da_sequencia',
    rotulo: 'Resumo em um story',
    logica:
      'Quem entrou no meio precisa de uma porta. E quem viu tudo salva o resumo — salvamento é o sinal que mais conta.',
    comoUsar:
      'Um story de tela cheia, texto curto, os pontos da sequência numerados. Sem vídeo, feito para pausar e salvar.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Deixe no destaque. É o que a pessoa manda para a sócia depois.',
  },

  {
    id: 'nenhum',
    rotulo: 'Sem pedido',
    logica:
      'Sequência que pede algo em todo story cansa. O story sem pedido é o que faz o pedido seguinte ser atendido.',
    comoUsar: 'Nada na tela além do conteúdo. Nenhuma figurinha, nenhuma pergunta.',
    custo: 'um toque',
    retorno: 'retenção',
    oQueFazerDepois: 'Nada. É o ponto.',
  },
]

export const DISPOSITIVOS: Record<DispositivoId, Dispositivo> = Object.fromEntries(
  LISTA.map((d) => [d.id, d]),
) as Record<DispositivoId, Dispositivo>

/** Na ordem do catálogo, para o seletor do editor. */
export const DISPOSITIVOS_EM_ORDEM = LISTA

/**
 * Quantos pedidos cabem numa sequência.
 *
 * Medida de bom senso, não de laboratório: três pedidos em cinco stories é o
 * limite em que a sequência ainda parece conteúdo. Acima disso parece captação.
 * O gerador usa isto para decidir quando trocar um dispositivo por `nenhum`.
 */
export const LIMITE_DE_PEDIDOS = 3

/** O dispositivo custa trabalho de quem assiste? No máximo um por sequência. */
export function exigeEsforco(id: DispositivoId): boolean {
  return DISPOSITIVOS[id].custo === 'trabalho de verdade'
}
