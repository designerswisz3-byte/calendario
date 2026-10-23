/**
 * O que a API do Instagram aceita — conferido ANTES de agendar, não às 19h.
 *
 * A regra que organiza este arquivo: **falhar cedo e na frente da pessoa**. Um
 * carrossel com PNG só é recusado pela Meta no instante de montar o container;
 * se isso acontecer no horário agendado, o post simplesmente não sai e ele
 * descobre depois. Então a mesma checagem roda no momento de programar, com o
 * erro escrito em português e um caminho de saída.
 *
 * As regras de formato vêm da API de publicação da Meta. A mais traiçoeira é a
 * imagem: o bucket aceita PNG, WebP e AVIF (porque o link de preview mostra
 * qualquer um deles no navegador), e a publicação não aceita — o preview
 * funcionar não é garantia de que o post sai.
 */
import type { ContentType, MediaType } from '@/types/database'

export interface MidiaParaPublicar {
  url: string
  tipo: MediaType
}

/** Os formatos que o agendamento sabe publicar. `ideia` não é um deles. */
export const FORMATOS_PUBLICAVEIS = ['post', 'carrossel', 'reels', 'story'] as const
export type FormatoPublicavel = (typeof FORMATOS_PUBLICAVEIS)[number]

export function ehPublicavel(tipo: ContentType): tipo is FormatoPublicavel {
  return (FORMATOS_PUBLICAVEIS as readonly string[]).includes(tipo)
}

/** Imagem: a Meta publica JPEG. Vídeo: MP4 e MOV. */
const EXTENSOES_DE_IMAGEM = ['jpg', 'jpeg']
const EXTENSOES_DE_VIDEO = ['mp4', 'mov']

/** O Instagram aceita de 2 a 10 cartões num carrossel. */
export const CARROSSEL_MIN = 2
export const CARROSSEL_MAX = 10

/** Limite da legenda, o mesmo da tela de criação. */
export const LEGENDA_MAX = 2200

export function extensaoDe(url: string): string {
  // Sem query string e sem fragmento: a URL assinada do Storage traz ambos.
  const caminho = url.split('?')[0].split('#')[0]
  const ponto = caminho.lastIndexOf('.')
  return ponto < 0 ? '' : caminho.slice(ponto + 1).toLowerCase()
}

export interface Problema {
  /** O que está errado, numa frase. */
  mensagem: string
  /** O que fazer. Sem isto, o aviso vira beco sem saída. */
  saida?: string
}

/**
 * Tudo o que impede este conteúdo de virar um post. Lista vazia = pode agendar.
 *
 * Devolve TODOS os problemas, não o primeiro: corrigir um de cada vez, com um
 * clique entre eles, é como se desiste de usar a tela.
 */
export function problemasParaPublicar(entrada: {
  formato: ContentType
  legenda: string
  midias: MidiaParaPublicar[]
  quando?: Date | null
  agora?: Date
}): Problema[] {
  const { formato, legenda, midias } = entrada
  const problemas: Problema[] = []

  if (!ehPublicavel(formato)) {
    return [
      {
        mensagem: `"${formato}" não é um formato que o Instagram publica pela API.`,
        saida: 'Troque para Post único, Carrossel, Reels ou Story.',
      },
    ]
  }

  if (midias.length === 0) {
    problemas.push({
      mensagem: 'O post não tem nenhuma mídia.',
      saida: 'Envie a imagem ou o vídeo antes de programar.',
    })
  }

  /* Quantidade por formato. O carrossel é o único que leva mais de uma; os
     outros usam SÓ a primeira na tela de criação, e publicar a primeira
     calado seria publicar algo que ele não viu. */
  if (formato === 'carrossel') {
    if (midias.length === 1) {
      problemas.push({
        mensagem: 'Um carrossel precisa de pelo menos 2 cartões.',
        saida: 'Adicione outra mídia ou troque o formato para Post único.',
      })
    }
    if (midias.length > CARROSSEL_MAX) {
      problemas.push({
        mensagem: `O Instagram aceita no máximo ${CARROSSEL_MAX} cartões; este tem ${midias.length}.`,
        saida: `Remova ${midias.length - CARROSSEL_MAX}.`,
      })
    }
  } else if (midias.length > 1) {
    problemas.push({
      mensagem: `${rotuloDoFormato(formato)} vai ao ar com uma mídia só, e aqui há ${midias.length}.`,
      saida: 'Deixe só a que vai ao ar, ou troque o formato para Carrossel.',
    })
  }

  if (formato === 'reels' && midias.some((m) => m.tipo !== 'video')) {
    problemas.push({
      mensagem: 'Reels é vídeo.',
      saida: 'Troque a mídia por um vídeo, ou o formato por Post único.',
    })
  }

  // Extensão, arquivo por arquivo — é o erro que o preview esconde.
  for (const midia of midias) {
    const extensao = extensaoDe(midia.url)
    const aceitas = midia.tipo === 'video' ? EXTENSOES_DE_VIDEO : EXTENSOES_DE_IMAGEM
    if (!aceitas.includes(extensao)) {
      problemas.push({
        mensagem: `A Meta não publica ${midia.tipo === 'video' ? 'vídeo' : 'imagem'} em .${
          extensao || 'sem extensão'
        }.`,
        saida: `Converta para ${midia.tipo === 'video' ? '.mp4' : '.jpg'} e envie de novo. O preview abre qualquer formato; a publicação não.`,
      })
    }
  }

  if (legenda.length > LEGENDA_MAX) {
    problemas.push({
      mensagem: `A legenda tem ${legenda.length.toLocaleString('pt-BR')} caracteres; o limite é ${LEGENDA_MAX.toLocaleString('pt-BR')}.`,
      saida: `Corte ${(legenda.length - LEGENDA_MAX).toLocaleString('pt-BR')}.`,
    })
  }

  if (entrada.quando) {
    const agora = entrada.agora ?? new Date()
    if (entrada.quando.getTime() <= agora.getTime()) {
      problemas.push({
        mensagem: 'O horário escolhido já passou.',
        saida: 'Escolha um horário à frente de agora.',
      })
    }
  }

  return problemas
}

/**
 * Avisos: não impedem o post, mas mudam o que ele espera ver.
 *
 * Separado dos problemas de propósito. Misturar "não vai sair" com "vai sair
 * diferente do que você imagina" treina a pessoa a ignorar os dois.
 */
export function avisosParaPublicar(entrada: {
  formato: ContentType
  legenda: string
}): string[] {
  const avisos: string[] = []
  if (entrada.formato === 'story') {
    avisos.push(
      'Story não leva legenda no Instagram: o texto fica guardado aqui, mas não vai ao ar com o story.',
    )
    avisos.push('Story some em 24 h — se perder a hora, ele não é publicado atrasado.')
  }
  return avisos
}

export function rotuloDoFormato(formato: ContentType): string {
  const rotulos: Record<string, string> = {
    post: 'Post único',
    carrossel: 'Carrossel',
    reels: 'Reels',
    story: 'Story',
    ideia: 'Ideia',
  }
  return rotulos[formato] ?? formato
}

/**
 * "2026-10-24" + "19:30" (Brasília) -> Date em UTC.
 *
 * `new Date('2026-10-24T19:30')` usa o fuso de quem está olhando — no celular
 * dele, Brasília; num servidor, UTC. O horário de um post não pode depender de
 * onde a tela está aberta, então o deslocamento de Brasília entra explícito.
 * Fixo em -3: o Brasil não tem horário de verão desde 2019.
 */
export function horarioDeBrasilia(dia: string, hora: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return null
  const data = new Date(`${dia}T${hora}:00.000-03:00`)
  return Number.isNaN(data.getTime()) ? null : data
}

/** "24/10 às 19:30" — como ele leu quando escolheu. */
export function formatarQuando(quando: string | Date): string {
  const data = typeof quando === 'string' ? new Date(quando) : quando
  if (Number.isNaN(data.getTime())) return '—'
  return data
    .toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    .replace(',', ' às')
}
