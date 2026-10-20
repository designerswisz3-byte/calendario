import { ARCOS, GATILHOS, type Arco, type Gatilho, type GatilhoId } from '@/lib/stories/gatilhos'
import { contrair } from '@/lib/stories/frases'
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

/* ------------------------------------------------------------- semente -- */

/**
 * O número que decide a REDAÇÃO.
 *
 * Os gatilhos trazem de três a cinco formas de escrever o mesmo movimento, e
 * os temas trazem mais de um formato possível. Alguém tem de escolher. Não é
 * sorteio: é o dia, mais o número de vezes que a pessoa pediu outra ideia,
 * mais o número de vezes que ela apertou gerar.
 *
 * O efeito prático é o que foi pedido: o mesmo assunto em duas semanas
 * diferentes não sai com a mesma frase, e apertar "gerar" de novo reescreve em
 * vez de repetir.
 */
export function sementeDoDia(dia: string, giro = 0, tentativa = 0): number {
  // Dias desde a epoch, não a soma dos caracteres: '2026-10-09' e '2026-10-18'
  // somam igual, e a colisão travava a rotação.
  const dias = Math.floor(Date.parse(`${dia}T00:00:00Z`) / 86_400_000) || 0
  return Math.abs(dias + giro * 7 + tentativa)
}

/** A última frase do story — é por ela que se percebe a repetição na tela. */
const fechamento = (texto: string) => texto.split('\n\n').pop()?.trim() ?? ''

/** Espalha os gatilhos: sem isto, na semente 0 todos cairiam na variante 0. */
function digitos(texto: string): number {
  let soma = 0
  for (let i = 0; i < texto.length; i++) soma = (soma * 31 + texto.charCodeAt(i)) % 100_003
  return soma
}

/**
 * Qual das formas de escrever este story entra.
 *
 * `ocorrencia` entra na conta por dois motivos. Um: o gatilho que se repete no
 * arco — o diário tem dois stories de tempo real — nunca cai duas vezes na
 * mesma frase. Dois: passo e item precisam da ORDEM, não do sorteio, porque o
 * segundo passo tem de ser o segundo.
 */
function escolherVariante(gatilho: Gatilho, semente: number, ocorrencia: number): number {
  const total = gatilho.variantes.length
  if (gatilho.porOcorrencia) {
    // Arco com mais passos do que o gatilho tem variantes repete a última em
    // vez de voltar ao "Passo 1", que seria pior: a pessoa perde a conta.
    return Math.min(ocorrencia, total - 1)
  }
  return (semente + digitos(gatilho.id) + ocorrencia) % total
}

/* ------------------------------------------------------- arco possível -- */

/**
 * Campos opcionais que cada gatilho exige.
 *
 * Quem escolhe o arco na mão pode pedir um que o tema não sustenta — e aí o
 * story sai como `[preencha: …]`, que é de propósito. Mas a escolha AUTOMÁTICA
 * não pode cair nisso: sequência sugerida pelo app precisa sair pronta para
 * gravar, senão a pessoa aprende a desconfiar da sugestão.
 */
const EXIGE: Partial<Record<GatilhoId, (tema: Tema, vezes: number) => boolean>> = {
  mito: (t) => Boolean(t.contraste),
  contraste: (t) => Boolean(t.contraste),
  vulnerabilidade: (t) => Boolean(t.erro),
  prova_social: (t) => Boolean(t.provaSocial),
  // Conta as REPETIÇÕES: a oficina de quatro passos só serve ao tema que tem
  // quatro ações. Com três, o quarto story sairia pedindo o passo que falta.
  passo: (t, vezes) => t.acaoUtil.length >= vezes,
  item: (t, vezes) => t.acaoUtil.length >= vezes,
}

/** Os arcos que este tema consegue sustentar inteiros, sem lacuna. */
export function arcosPossiveis(tema: Tema): Arco[] {
  return ARCOS.filter((arco) => {
    const vezes = new Map<GatilhoId, number>()
    for (const gatilho of arco.passos) vezes.set(gatilho, (vezes.get(gatilho) ?? 0) + 1)
    return [...vezes].every(([gatilho, n]) => EXIGE[gatilho]?.(tema, n) ?? true)
  })
}

/**
 * Gatilhos cujo texto FALA do objeto que está na tela.
 *
 * Serve ao caminho da imagem: quando a pessoa colou uma foto, a sequência
 * precisa falar daquela foto, não só mostrá-la. O tutorial é abertura, passos e
 * pergunta final — nenhum desses gatilhos cita a cena, e uma sequência assim
 * ignoraria a imagem que foi o ponto de partida.
 */
const CITAM_O_OBJETO: GatilhoId[] = ['bastidor', 'tempo_real', 'curiosidade']

/**
 * O formato que entra quando a pessoa não escolheu.
 *
 * Antes era sempre `arcosSugeridos[0]` — o que fazia o mesmo tema sair sempre
 * no mesmo formato, e os dezesseis arcos existirem só no seletor. Agora a roda
 * começa pelos sugeridos (que são os que combinam melhor com o assunto) e
 * segue pelos demais que o tema sustenta, girando com o dia.
 */
export function arcoPadrao(
  tema: Tema,
  semente = 0,
  opcoes: { citaObjeto?: boolean } = {},
): string {
  const possiveis = arcosPossiveis(tema).map((arco) => arco.id)
  const roda = opcoes.citaObjeto
    ? possiveis.filter((id) =>
        arcoPorId(id).passos.some((gatilho) => CITAM_O_OBJETO.includes(gatilho)),
      )
    : possiveis
  // Sem nenhum arco que sirva, vale qualquer um que o tema sustente: é melhor
  // uma sequência com a cena só na direção visual do que botão que não gera.
  const usavel = roda.length > 0 ? roda : possiveis
  const sugeridos = tema.arcosSugeridos.filter((id) => usavel.includes(id))
  const fila = [...sugeridos, ...usavel.filter((id) => !sugeridos.includes(id))]
  if (fila.length === 0) return tema.arcosSugeridos[0] ?? ARCOS[0].id
  return fila[semente % fila.length]
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
  /** Decide a redação e, quando o arco não vem pedido, o formato. */
  semente?: number
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
  const semente = opcoes.semente ?? 0

  const arco = arcoPorId(arcoId ?? arcoPadrao(tema, semente, { citaObjeto: Boolean(descricao) }))

  /*
   * O texto sai em RASCUNHO, não em versão final, e isso é de propósito: a
   * sequência é editável e quem grava é o Raphael. Um gerador que entregasse
   * texto fechado seria pior, porque a pessoa leria em vez de falar — e story
   * lido se reconhece de longe.
   */
  const repeticoes = new Map<GatilhoId, number>()
  const ocorrencias: number[] = []
  const stories: StoryGerado[] = []

  for (const [i, gatilhoId] of arco.passos.entries()) {
    const gatilho = GATILHOS[gatilhoId]
    const ocorrencia = repeticoes.get(gatilhoId) ?? 0
    repeticoes.set(gatilhoId, ocorrencia + 1)
    ocorrencias.push(ocorrencia)

    let indice = escolherVariante(gatilho, semente, ocorrencia)
    let texto = gatilho.variantes[indice](tema, ocorrencia)

    /*
     * Dois stories seguidos não terminam na mesma frase.
     *
     * O bastidor e o tempo real citam os dois o objeto do tema, e o sorteio
     * podia fechar os dois com a linha idêntica — "a peça nacional ao lado da
     * embalagem de uma importada." duas vezes, em telas seguidas. Quem assiste
     * acha que é repost.
     */
    const anterior = stories[stories.length - 1]
    if (anterior && !gatilho.porOcorrencia && fechamento(texto) === fechamento(anterior.texto)) {
      indice = (indice + 1) % gatilho.variantes.length
      texto = gatilho.variantes[indice](tema, ocorrencia)
    }

    stories.push({
      ordem: i + 1,
      rotulo: `Story ${i + 1} — ${gatilho.rotulo}`,
      gatilho: gatilhoId,
      direcaoVisual: direcaoDoTema(gatilhoId, tema),
      texto,
      pedeInteracao: Boolean(gatilho.pedeInteracao),
    })
  }

  /*
   * A imagem TEM de aparecer em cena, e de preferência na FALA.
   *
   * Nem todo arco toca o objeto: o tutorial é abertura, passos e pergunta
   * final, e nenhum desses gatilhos cita o que está na tela. Quem acabou de
   * colar uma foto e pediu "gerar em torno da imagem" receberia uma sequência
   * onde a foto não entra em lugar nenhum — o botão faria algo e não pareceria
   * ter feito nada.
   *
   * São dois remendos, em ordem de qualidade: trocar UM story por uma variante
   * que fale do objeto (o resto da sequência continua sorteado, então a
   * variedade fica de pé), e, se nenhum gatilho do arco souber citar, pelo
   * menos escrever a cena na direção visual da abertura.
   */
  if (descricao && !stories.some((story) => story.texto.includes(descricao))) {
    const alvo = stories.findIndex((story) =>
      GATILHOS[story.gatilho].variantes.some((v) => v(tema, 0).includes(descricao)),
    )
    if (alvo >= 0) {
      const gatilho = GATILHOS[stories[alvo].gatilho]
      const ocorrencia = ocorrencias[alvo]
      const citam = gatilho.variantes.filter((v) => v(tema, ocorrencia).includes(descricao))
      if (citam.length > 0) {
        stories[alvo] = { ...stories[alvo], texto: citam[semente % citam.length](tema, ocorrencia) }
      }
    }
  }

  if (descricao && !stories.some((story) => (story.texto + story.direcaoVisual).includes(descricao))) {
    stories[0] = {
      ...stories[0],
      direcaoVisual: `${stories[0].direcaoVisual} Abra mostrando ${descricao}.`,
    }
  }

  return {
    temaId: tema.id,
    titulo: tema.titulo,
    arcoId: arco.id,
    stories,
    observacao: observacaoDe(arco, stories),
  }
}

/**
 * A direção visual puxa o objeto concreto do tema quando faz sentido.
 *
 * Vale para o primeiro story também. Enquanto todo arco abria em `abertura`
 * ("você falando com a câmera"), não fazia diferença; com arcos que abrem no
 * bastidor ou em tempo real, o story 1 é justamente o que mais precisa dizer o
 * que aparece na tela.
 */
function direcaoDoTema(gatilhoId: GatilhoId, tema: Tema): string {
  const padrao = GATILHOS[gatilhoId].direcaoVisual
  switch (gatilhoId) {
    case 'curiosidade':
      return `Movimento: a câmera se aproximando ${contrair('de', tema.oQueMostrar)}.`
    case 'bastidor':
      return `Plano aberto ${contrair('de', tema.oQueMostrar)}.`
    case 'tempo_real':
      return `Gravação de mão, sem corte: ${tema.oQueMostrar}.`
    case 'autoridade':
      // "Você com a arara com as peças…" — o objeto do tema já costuma trazer
      // um "com". "Em cena:" não colide com nada e serve igual para objeto,
      // tela e pessoa.
      return `Em cena: ${tema.oQueMostrar}. Mostre o dado na tela: ${tema.dadoQueProva}.`
    case 'numero':
      return `Tela cheia, fonte grande, só o dado: ${tema.dadoQueProva}.`
    case 'identificacao':
      // "Imagem da arara com as peças, com enquete por cima" empilhava dois
      // "com" na mesma frase. Em duas frases, lê-se na gravação.
      return `Imagem ${contrair('de', tema.oQueMostrar)}. Enquete por cima.`
    case 'urgencia':
      return `A etapa seguinte do processo, com o prazo escrito na tela: ${tema.prazoReal}.`
    case 'gancho':
      // "Plano rápido da peça que encalhou, ainda no estoque, ainda inacabado"
      // — dois "ainda" e três vírgulas. Em duas frases, não empilha.
      return `O que vem a seguir, ainda inacabado. Em cena: ${tema.oQueMostrar}.`
    default:
      return padrao
  }
}

/**
 * O recado final.
 *
 * Aponta o story que sustenta a sequência — aquele que, se sair fraco, derruba
 * o resto. Cada tipo de fecho tem um ponto fraco diferente, e isso importa
 * agora que existe arco sem dado, sem tarefa e sem pedido de resposta.
 */
const PESO_DO_STORY: Partial<Record<GatilhoId, string>> = {
  autoridade:
    'é o story que torna a sua autoridade visível. Um dado real ali dá força a todos os outros.',
  reciprocidade:
    'é o story que faz salvar. Sem uma tarefa que a pessoa consiga fazer hoje, a sequência vira opinião.',
  passo: 'é o passo em que a pessoa para o celular e executa. Se for vago, ela abandona no meio.',
  item: 'é o item que precisa valer sozinho. Quem chega no meio da lista começa por ele.',
  compromisso: 'é onde a conversa abre. Se a pergunta for vaga, ninguém responde.',
  gancho:
    'é o que traz a pessoa de volta amanhã. Só prometa a continuação que você realmente vai gravar.',
  vulnerabilidade:
    'é o story que compra confiança. Erro sem o número do prejuízo soa a humildade de fachada.',
  curiosidade: 'é o laço que segura a sequência. Se ele entregar a resposta, ninguém vê o resto.',
}

const ORDEM_DE_PESO: GatilhoId[] = ['autoridade', 'reciprocidade', 'passo', 'item', 'vulnerabilidade']

function observacaoDe(arco: Arco, stories: StoryGerado[]): string {
  const alvo =
    ORDEM_DE_PESO.map((gatilho) => stories.find((s) => s.gatilho === gatilho)).find(Boolean) ??
    stories[stories.length - 1]

  const porque =
    PESO_DO_STORY[alvo.gatilho] ??
    'é o story que fecha. Se ele não der um motivo para voltar, a sequência termina em silêncio.'

  return `Arco: ${arco.rotulo} (${arco.tom.toLowerCase()}). O ${alvo.rotulo
    .split(' — ')[0]
    .toLowerCase()} merece mais atenção — ${porque}`
}

/* ------------------------------------------------------------ sugestões -- */

export interface ContextoDoDia {
  /** Títulos de datas do calendário próximas (feiras, Black Friday, feriados). */
  eventos: string[]
  /** Títulos e tags de notícias recentes. */
  noticias: string[]
  /**
   * O assunto das postagens já marcadas NESTE dia no calendário.
   *
   * É o laço que faltava entre as duas abas: se o dia 12 tem um post sobre
   * ruptura de estoque, os stories do dia 12 têm de falar disso. Post e story
   * no mesmo dia sobre assuntos diferentes é o jeito mais rápido de a audiência
   * não lembrar de nenhum dos dois.
   */
  pautas?: string[]
}

export interface Sugestao {
  tema: Tema
  /** Por que este tema hoje. Vazio quando a escolha foi só rotação. */
  motivo: string
  /** Veio da postagem do dia. A tela destaca esta sugestão. */
  daPauta?: boolean
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
const mdc = (a: number, b: number): number => (b === 0 ? a : mdc(b, a % b))

/**
 * De quantas casas a janela anda por dia.
 *
 * Andar de 1 em 1 fazia dois dias seguidos compartilharem 2 dos 3 temas — a
 * lista mudava no papel e parecia a mesma na tela. O passo precisa ser primo
 * com o tamanho do banco, senão a rotação fecha num ciclo curto e parte dos
 * temas nunca aparece.
 */
function passoDaRotacao(tamanho: number): number {
  for (let passo = Math.floor(tamanho / 3) + 1; passo < tamanho; passo++) {
    if (mdc(passo, tamanho) === 1) return passo
  }
  return 1
}

/**
 * Como contexto e rotação dividem as vagas.
 *
 * Somar um bônus à rotação não funcionou, e foi medido duas vezes: com bônus 1
 * por acerto, três temas ficaram grudados no topo por oito dias seguidos
 * (bastava uma notícia na base conter "compra"); baixando para 0,45, os temas
 * com DOIS acertos continuaram grudados em 7 de 8 dias. Enquanto o bônus for
 * comparável à faixa da rotação, quem acerta contexto sempre ganha.
 *
 * A mecânica aqui é outra: UMA vaga é reservada ao contexto e as demais vêm da
 * rotação pura. O tema relevante está sempre representado, e nunca ocupa a
 * lista inteira. É uma regra que dá para explicar em uma frase — e, ao
 * contrário de um peso, não precisa ser recalibrada quando o banco cresce.
 */
const VAGAS_DE_CONTEXTO = 1

const NOTA_MINIMA_DA_PAUTA = 3.5

/**
 * A vaga da pauta vem ANTES da vaga do contexto.
 *
 * Ordem de prioridade: o que já está marcado para hoje ganha do que está no ar
 * esta semana, que ganha da rotação. Faz sentido na prática — a postagem do dia
 * já foi decidida, e o story existe para sustentá-la.
 */
export function sugerirTemas(
  dia: string,
  contexto: ContextoDoDia,
  quantos = 3,
  /** Cada giro reembaralha: é o "quero outras ideias" do botão. */
  giro = 0,
): Sugestao[] {
  const alvo = [...contexto.eventos, ...contexto.noticias].join(' · ').toLowerCase()
  /*
   * A semente é o número de DIAS desde a epoch, não a soma dos caracteres da
   * data: '2026-10-09' e '2026-10-18' somam igual, e a colisão travava a
   * rotação.
   */
  const dias = Math.floor(Date.parse(`${dia}T00:00:00Z`) / 86_400_000) || 0
  const semente = (dias + giro) * passoDaRotacao(TEMAS.length)

  const porRotacao = TEMAS.map((tema, i) => ({
    tema,
    batidas: (tema.contexto ?? []).filter((palavra) => alvo.includes(palavra)),
    ordem: ((i + semente) % TEMAS.length) / TEMAS.length,
  })).sort((a, b) => b.ordem - a.ordem)

  const escolhidos: typeof porRotacao = []

  /*
   * A vaga da pauta: o assunto da postagem marcada para hoje.
   *
   * Exige nota mínima porque a tela vai DIZER que aquele tema veio do post.
   * Medido sobre pautas reais: casamento de verdade pontua de 4,7 a 7,7;
   * coincidência boba — "dicas de produtividade pessoal" roçando em "produto e
   * pessoas" — pontua 2,8. Abaixo da régua, melhor não ter vaga de pauta do
   * que ter uma etiqueta mentindo.
   */
  const pauta = (contexto.pautas ?? []).join(' · ').trim()
  const casado = quantos > 1 && pauta ? melhorTemaPara(pauta, TEMAS) : null
  const daPauta = casado && casado.nota >= NOTA_MINIMA_DA_PAUTA ? casado : null
  if (daPauta) {
    const entrada = porRotacao.find((p) => p.tema.id === daPauta.tema.id)
    if (entrada) escolhidos.push(entrada)
  }

  // A vaga do contexto: o tema relevante que está mais à frente na rotação de
  // hoje — então ela também muda de um dia para o outro.
  if (quantos > escolhidos.length + VAGAS_DE_CONTEXTO) {
    const relevante = porRotacao.find((p) => p.batidas.length > 0 && !escolhidos.includes(p))
    if (relevante) escolhidos.push(relevante)
  }

  for (const candidato of porRotacao) {
    if (escolhidos.length >= quantos) break
    if (!escolhidos.includes(candidato)) escolhidos.push(candidato)
  }

  return escolhidos.map(({ tema, batidas }) => {
    if (daPauta && tema.id === daPauta.tema.id) {
      return {
        tema,
        motivo: `Puxado da postagem deste dia: ${resumir(pauta)}.`,
        daPauta: true,
      }
    }
    return {
      tema,
      motivo: batidas.length
        ? `Puxado pelo que está no seu calendário e nas notícias: ${batidas.join(', ')}.`
        : '',
    }
  })
}

/** Corta o assunto da postagem para caber numa linha de motivo. */
function resumir(texto: string, limite = 60): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`
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
/**
 * O tema que mais combina com um texto livre, ou `null` se nada casar.
 *
 * Fica separado de `escolherTemaPor` porque tem dois clientes com necessidades
 * opostas: o botão, que precisa SEMPRE devolver um tema (e por isso cai na
 * sugestão do dia quando nada casa), e a vaga da pauta, que só existe quando o
 * texto da postagem realmente casa com algum assunto do banco — senão a tela
 * diria "puxado da sua postagem" apontando para um tema sem relação nenhuma.
 */
/**
 * Em quantos temas cada palavra aparece.
 *
 * "coleção" e "mercado" estão em meio banco; "bastidor" e "devolução" estão em
 * um tema só. Contar as duas igual foi o que fez "post sobre devolução alta no
 * Mercado Livre" cair em precificação por canal: a expressão "mercado livre"
 * valia dois acertos e "devolução" valia um.
 */
const EM_QUANTOS_TEMAS = (() => {
  const mapa = new Map<string, number>()
  for (const tema of TEMAS) {
    const texto = `${tema.titulo} ${tema.alavanca} ${tema.oQueMostrar} ${(tema.contexto ?? []).join(' ')}`
    for (const palavra of new Set(palavras(texto))) {
      mapa.set(palavra, (mapa.get(palavra) ?? 0) + 1)
    }
  }
  return mapa
})()

/** 1 para a palavra que só existe num tema; ~0,2 para a que está em todos. */
function raridade(palavra: string): number {
  const em = EM_QUANTOS_TEMAS.get(palavra) ?? 1
  return Math.log(1 + TEMAS.length / em) / Math.log(1 + TEMAS.length)
}

/**
 * Casa plural e flexão sem stemmer.
 *
 * Prefixo nos dois sentidos resolve "estoque"/"estoques". Não resolve
 * "embalando"/"embalagem", que é o jeito como as pautas são escritas de
 * verdade — por isso o segundo teste: seis letras iniciais em comum. Seis, e
 * não cinco, porque "produção" e "produto" compartilham cinco e são assuntos
 * diferentes.
 */
const RAIZ = 6

const casa = (termos: string[], palavra: string) =>
  termos.some(
    (t) =>
      t === palavra ||
      t.startsWith(palavra) ||
      palavra.startsWith(t) ||
      (t.length >= RAIZ && palavra.length >= RAIZ && t.slice(0, RAIZ) === palavra.slice(0, RAIZ)),
  )

export function melhorTemaPara(
  descricao: string,
  candidatos: Tema[] = TEMAS,
): { tema: Tema; nota: number } | null {
  const termos = palavras(descricao)
  if (termos.length === 0 || candidatos.length === 0) return null

  /*
   * Os campos não valem o mesmo.
   *
   * `contexto` é a lista que existe PARA casar — é curada, e conta por
   * EXPRESSÃO: "mercado livre" é um acerto, não dois. `titulo` e `alavanca`
   * dizem do que o tema trata. `oQueMostrar` é cenário, e casa por acidente:
   * "mesa" aparece tanto na mesa de corte quanto na mesa de devolução. Sem
   * peso, "a mesa de corte com os tecidos" caía em devolução.
   */
  const porExpressao = (expressoes: string[]) =>
    expressoes.reduce((soma, expressao) => {
      const partes = palavras(expressao)
      if (partes.length === 0 || !partes.every((parte) => casa(termos, parte))) return soma
      return soma + partes.reduce((s, parte) => s + raridade(parte), 0) / partes.length
    }, 0)

  const porPalavra = (campo: string) =>
    [...new Set(palavras(campo))]
      .filter((palavra) => casa(termos, palavra))
      .reduce((soma, palavra) => soma + raridade(palavra), 0)

  const pontuados = candidatos
    .map((tema) => ({
      tema,
      nota:
        porExpressao(tema.contexto ?? []) * 3 +
        porPalavra(`${tema.titulo} ${tema.alavanca}`) * 2 +
        porPalavra(tema.oQueMostrar),
    }))
    .sort((a, b) => b.nota - a.nota)

  return pontuados[0].nota > 0 ? pontuados[0] : null
}

export function escolherTemaPor(
  descricao: string,
  dia: string,
  contexto: ContextoDoDia,
  /** Restringe ao eixo pedido. Sem ele, o banco inteiro concorre. */
  eixo?: Eixo,
): Tema {
  const candidatos = eixo ? TEMAS.filter((tema) => tema.eixo === eixo) : TEMAS
  const casado = melhorTemaPara(descricao, candidatos)
  if (casado) return casado.tema

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
