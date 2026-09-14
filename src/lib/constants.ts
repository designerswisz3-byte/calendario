import type { CalendarStatus, ContentType, PlanningType } from '@/types/database'

/** Tipos aceitos por um item de planejamento (inclui "ideia"). */
export const PLANNING_TYPES: PlanningType[] = ['carrossel', 'reels', 'story', 'post', 'ideia']

/** Tipos aceitos por um conteúdo/preview (sem "ideia"). */
export const CONTENT_TYPES: ContentType[] = ['carrossel', 'reels', 'story', 'post']

export const TYPE_LABEL: Record<PlanningType, string> = {
  carrossel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
  post: 'Post único',
  ideia: 'Ideia',
}

/** Fluxo do funil editorial, na ordem exata da especificação. */
export const STATUSES: CalendarStatus[] = [
  'ideia',
  'roteiro',
  'design',
  'em_aprovacao',
  'aprovado',
  'agendado',
  'publicado',
]

export const STATUS_LABEL: Record<CalendarStatus, string> = {
  ideia: 'Ideia',
  roteiro: 'Roteiro/Copy',
  design: 'Design',
  em_aprovacao: 'Em aprovação',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
}

/**
 * Badges de status. Apenas "publicado" usa a cor de acento do design system;
 * o resto fica na paleta neutra para não competir visualmente.
 */
export const STATUS_BADGE: Record<CalendarStatus, string> = {
  ideia: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300',
  roteiro: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
  design: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300',
  em_aprovacao: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300',
  aprovado: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  agendado: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300',
  publicado: 'bg-primary text-primary-foreground border-transparent',
}

/** Ponto de status nos cards compactos do calendário: cor sólida, legível. */
export const STATUS_DOT: Record<CalendarStatus, string> = {
  ideia: 'bg-slate-400',
  roteiro: 'bg-amber-500',
  design: 'bg-sky-500',
  em_aprovacao: 'bg-orange-500',
  aprovado: 'bg-emerald-500',
  agendado: 'bg-violet-500',
  publicado: 'bg-primary',
}

/** Limite real de caracteres da legenda no Instagram. */
export const CAPTION_MAX_LENGTH = 2200

/** Tipos que usam vídeo vertical 9:16 em vez de imagens. */
export const VIDEO_TYPES: ContentType[] = ['reels', 'story']

export const isVideoType = (tipo: ContentType) => VIDEO_TYPES.includes(tipo)

export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export const TAG_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
]

export const MAX_IMAGE_SIZE_MB = 10
export const MAX_VIDEO_SIZE_MB = 100

/**
 * Teto de mídias por conteúdo. O carrossel do Instagram aceita até 20 slides,
 * misturando foto e vídeo — é esse o número que espelhamos aqui.
 */
export const MAX_MEDIA_ITEMS = 20

/** Formatos que exibem mais de uma mídia. Os demais usam só a primeira. */
export const MULTI_MEDIA_TYPES: ContentType[] = ['carrossel']

export const aceitaVariasMidias = (tipo: ContentType) => MULTI_MEDIA_TYPES.includes(tipo)
