/**
 * Os gatilhos: a gramática de uma sequência de stories.
 *
 * Cada gatilho é um MOVIMENTO, não um assunto. "Curiosidade" não diz sobre o
 * que falar — diz o que aquele story precisa fazer com quem assiste. O assunto
 * vem dos temas (temas.ts); juntos, gatilho + tema produzem o texto.
 *
 * A separação importa porque é ela que torna o gerador reutilizável: trocar o
 * tema mantém a estrutura que funciona, e trocar o arco reconta o mesmo assunto
 * com outra intenção. Um sistema que misturasse os dois só saberia repetir o
 * exemplo que lhe deram.
 *
 * Base: Cialdini (reciprocidade, prova social, autoridade, compromisso,
 * escassez), StoryBrand (o espectador é o herói; a marca é o guia) e a regra
 * da casa — promessa clara, problema no meio, solução no fim.
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

export interface Gatilho {
  id: GatilhoId
  rotulo: string
  /** O que este story tem de FAZER. Aparece no editor, acima do texto. */
  intencao: string
  /** Enquadramento sugerido quando o tema não traz um próprio. */
  direcaoVisual: string
  /** Story que pede interação explícita (enquete, caixinha, slider). */
  pedeInteracao?: boolean
}

export const GATILHOS: Record<GatilhoId, Gatilho> = {
  abertura: {
    id: 'abertura',
    rotulo: 'Abertura',
    intencao:
      'Entrega a promessa em uma frase. Quem assiste tem de saber, em 2 segundos, o que ganha se ficar.',
    direcaoVisual: 'Você falando com a câmera, em pé, no ambiente de trabalho.',
  },
  curiosidade: {
    id: 'curiosidade',
    rotulo: 'Curiosidade',
    intencao:
      'Abre um laço e não fecha. Mostra que existe uma decisão por trás do que está à vista.',
    direcaoVisual: 'Movimento: a câmera se aproximando de algo concreto da operação.',
  },
  identificacao: {
    id: 'identificacao',
    rotulo: 'Identificação e aversão à perda',
    intencao:
      'Faz quem assiste se ver no problema. Enquete com dois cenários ruins força a escolha e gera o toque.',
    direcaoVisual: 'Imagem da operação, com enquete por cima.',
    pedeInteracao: true,
  },
  autoridade: {
    id: 'autoridade',
    rotulo: 'Autoridade e prova concreta',
    intencao:
      'Mostra o número real que sustentou a decisão. Autoridade sem prova é opinião — aqui entra o dado.',
    direcaoVisual: 'Você segurando o objeto da história, ou a tela com o número à mostra.',
  },
  reciprocidade: {
    id: 'reciprocidade',
    rotulo: 'Reciprocidade: entregar uma ação útil',
    intencao:
      'Dá uma tarefa que a pessoa consegue fazer hoje, sozinha, de graça. É o que faz salvar o story.',
    direcaoVisual: 'Selfie ou tela com um checklist curto, legível no celular.',
  },
  urgencia: {
    id: 'urgencia',
    rotulo: 'Urgência pelo prazo real',
    intencao:
      'Usa um prazo que existe de verdade — reposição, calendário, estoque. Urgência inventada queima a confiança.',
    direcaoVisual: 'A etapa seguinte do processo: o que acontece depois do que você mostrou.',
  },
  compromisso: {
    id: 'compromisso',
    rotulo: 'Compromisso e abertura de conversa',
    intencao:
      'Pede uma resposta específica, com opções. Pergunta aberta demais não é respondida.',
    direcaoVisual: 'Você olhando para a câmera, com caixinha de perguntas.',
    pedeInteracao: true,
  },
  bastidor: {
    id: 'bastidor',
    rotulo: 'Bastidor',
    intencao:
      'Mostra o lugar onde a coisa acontece. É o que separa quem opera de quem comenta sobre operação.',
    direcaoVisual: 'Plano aberto do espaço real: chão de fábrica, estoque, mesa, expedição.',
  },
  vulnerabilidade: {
    id: 'vulnerabilidade',
    rotulo: 'Vulnerabilidade: o erro que custou',
    intencao:
      'Conta um erro seu, com o custo. Erro sem número é humildade de fachada; com número, vira aula.',
    direcaoVisual: 'Você sentado, tom mais baixo, sem edição.',
  },
  prova_social: {
    id: 'prova_social',
    rotulo: 'Prova social',
    intencao:
      'Mostra outra pessoa vivendo o mesmo problema ou o mesmo resultado. Tira o holofote de você.',
    direcaoVisual: 'Print de conversa, depoimento ou a pessoa da equipe falando.',
  },
  contraste: {
    id: 'contraste',
    rotulo: 'Contraste',
    intencao:
      'Põe lado a lado o jeito que a maioria faz e o jeito que funciona. O contraste ensina mais rápido que a explicação.',
    direcaoVisual: 'Dois enquadramentos no mesmo story, ou antes e depois.',
  },
}

export interface Arco {
  id: string
  rotulo: string
  /** Para que serve — ajuda a escolher sem ler os sete stories. */
  quandoUsar: string
  passos: GatilhoId[]
}

/**
 * Os arcos.
 *
 * O primeiro é o da sequência que o Rapha já validou na prática. Os outros
 * existem porque repetir o mesmo arco toda semana ensina a audiência a prever
 * o final — e quem prevê o final, pula.
 */
export const ARCOS: Arco[] = [
  {
    id: 'autoridade_pratica',
    rotulo: 'Autoridade prática',
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
    id: 'historia',
    rotulo: 'História e bastidor',
    quandoUsar:
      'Quando o assunto é você, a empresa ou um erro. Constrói confiança, não converte no mesmo dia.',
    passos: ['abertura', 'bastidor', 'vulnerabilidade', 'autoridade', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'ensino_rapido',
    rotulo: 'Ensino rápido',
    quandoUsar:
      'Dia corrido. Quatro stories, uma ideia só, com a tarefa no meio para garantir o salvamento.',
    passos: ['abertura', 'identificacao', 'reciprocidade', 'compromisso'],
  },
  {
    id: 'conversa',
    rotulo: 'Conversa com a audiência',
    quandoUsar:
      'Quando o objetivo é resposta na caixinha, não alcance. Duas interações em cinco stories.',
    passos: ['abertura', 'bastidor', 'identificacao', 'prova_social', 'compromisso'],
  },
  {
    id: 'contraste_curto',
    rotulo: 'Contraste curto',
    quandoUsar:
      'Para corrigir uma crença comum do mercado. Funciona bem com assunto de preço e margem.',
    passos: ['abertura', 'contraste', 'autoridade', 'reciprocidade', 'compromisso'],
  },
]
