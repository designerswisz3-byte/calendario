/** Tipos do banco (espelham as migrações em supabase/migrations). */

export type PlanningType = 'carrossel' | 'reels' | 'story' | 'post' | 'ideia'
export type ContentType = 'carrossel' | 'reels' | 'story' | 'post'
export type CalendarStatus =
  | 'ideia'
  | 'roteiro'
  | 'design'
  | 'em_aprovacao'
  | 'aprovado'
  | 'agendado'
  | 'publicado'
export type MediaType = 'imagem' | 'video'

export type CalendarItemRow = {
  id: string
  user_id: string
  /** `date` do Postgres, sempre no formato "YYYY-MM-DD" (timezone local). */
  data: string
  horario: string | null
  tipo: PlanningType
  status: CalendarStatus
  /** Briefing: ângulo, gancho, referências. */
  notas: string | null
  /** Roteiro de gravação — é o texto que alimenta o teleprompter. */
  roteiro: string | null
  /** Guardado na gaveta de ideias soltas: sai da grade, mantém tudo o mais. */
  na_gaveta: boolean
  criado_em: string
  atualizado_em: string
}

export type ContentPreviewRow = {
  id: string
  user_id: string
  calendar_item_id: string | null
  nome_expert: string
  legenda: string | null
  tipo: ContentType
  /** Link do projeto no Canva, aberto pelo expert no preview público. */
  canva_url: string | null
  /** Marcado quando o expert abre a arte. Ele também pode desmarcar. */
  canva_visto: boolean
  canva_visto_em: string | null
  criado_em: string
  atualizado_em: string
}

export type MediaAssetRow = {
  id: string
  content_preview_id: string
  url_arquivo: string
  ordem: number
  tipo: MediaType
  criado_em: string
}

export type TagRow = {
  id: string
  user_id: string
  nome: string
  cor: string
}

export type CalendarItemTagRow = {
  calendar_item_id: string
  tag_id: string
}

/** content_preview + mídias, como consumido pelas telas. */
export interface ContentPreviewWithMedia extends ContentPreviewRow {
  media_assets: MediaAssetRow[]
}

/**
 * Mapa `fileId do Excalidraw -> caminho no bucket `canvas``.
 *
 * É o que mantém a linha do quadro pequena: a imagem em si fica no storage, e
 * o jsonb guarda só onde ela está. Sem isso, cada autosave reescreveria todas
 * as imagens em base64.
 */
export type CanvasImagens = Record<string, string>

export type CanvasDados = {
  elements?: unknown[]
  appState?: Record<string, unknown>
  imagens?: CanvasImagens
}

export type NotaRow = {
  id: string
  user_id: string
  /** Primeira linha do conteúdo, como no Notas da Apple. */
  titulo: string
  /** HTML do editor. Imagens entram como `src="anexo:<caminho>"`. */
  conteudo: string
  /** Cena do Excalidraw do desenho desta nota. */
  desenho: CanvasDados | null
  imagens: CanvasImagens
  /** Fixada no topo da lista. */
  fixada: boolean
  /** Quando foi fixada — define a ordem entre as fixadas. */
  fixada_em: string | null
  criado_em: string
  atualizado_em: string
}

/** O que a lista precisa — sem puxar o corpo de cada nota. */
export type NotaResumo = Pick<
  NotaRow,
  'id' | 'titulo' | 'atualizado_em' | 'fixada' | 'fixada_em'
>

export type CanvasBoardRow = {
  id: string
  user_id: string
  nome: string
  dados: CanvasDados
  criado_em: string
  atualizado_em: string
}

/** Retorno do cliente, escrito pelo link público via enviar_ajuste(). */
export type AjusteRow = {
  id: string
  content_preview_id: string
  autor: string | null
  texto: string
  criado_em: string
}

/** O ajuste como ele volta no payload público (sem o id do preview). */
export interface AjustePublico {
  id: string
  autor: string | null
  texto: string
  criado_em: string
}

/**
 * Payload devolvido por get_public_preview(uuid) para o link compartilhável.
 * Propositalmente sem user_id e sem calendar_item_id: quem recebe o link não
 * precisa conhecer a estrutura interna do planejamento.
 */
export interface PublicPreview {
  id: string
  nome_expert: string
  legenda: string | null
  tipo: ContentType
  criado_em: string
  canva_url: string | null
  canva_visto: boolean
  canva_visto_em: string | null
  media_assets: MediaAssetRow[]
  ajustes: AjustePublico[]
}

/** Item de planejamento + tags + conteúdo vinculado (se houver). */
export interface CalendarItemWithRelations extends CalendarItemRow {
  tags: TagRow[]
  preview: ContentPreviewWithMedia | null
}

/* ------------------------------------------------------------- relatório -- */

export type RedeSocial = 'instagram' | 'youtube' | 'tiktok'

export type RelatorioPerfilRow = {
  id: string
  user_id: string
  rede: RedeSocial
  /** Sem o "@". */
  handle: string
  nome: string
  /** De onde o dado vem: 'swisz', 'meta_graph', 'manual'. */
  fonte: string
  criado_em: string
  atualizado_em: string
}

/**
 * Um dia de métricas.
 *
 * Todo número é nullable e null NÃO é zero: é "não temos esse dia". A
 * agregação em src/lib/relatorio.ts respeita essa diferença.
 */
export type RelatorioMetricaRow = {
  id: string
  perfil_id: string
  /** `date` do Postgres: "YYYY-MM-DD". */
  dia: string
  /** Total de seguidores no dia (estoque — não se soma). */
  seguidores: number | null
  /** Quantas contas seguiram NESTE dia (fluxo). */
  seguidores_ganhos: number | null
  /** Quantas contas deixaram de seguir NESTE dia (fluxo). */
  seguidores_perdidos: number | null
  alcance: number | null
  views: number | null
  likes: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  interacoes: number | null
  cliques_no_link: number | null
  publicacoes: number | null
  fonte: string
  criado_em: string
  atualizado_em: string
}

/** O que a importação grava: um dia, com as métricas que existirem. */
export type RelatorioMetricaEntrada = { dia: string } & Partial<
  Pick<
    RelatorioMetricaRow,
    | 'seguidores'
    | 'seguidores_ganhos'
    | 'seguidores_perdidos'
    | 'alcance'
    | 'views'
    | 'likes'
    | 'comentarios'
    | 'salvamentos'
    | 'compartilhamentos'
    | 'interacoes'
    | 'cliques_no_link'
    | 'publicacoes'
  >
>

/**
 * Uma publicação do Instagram, com as métricas dela.
 *
 * O grão é o POST, não o dia: um dia com três publicações precisa dizer qual
 * das três puxou o alcance. A tabela diária continua respondendo "como foi o
 * dia"; esta responde "por causa de quê".
 *
 * Não guarda thumbnail: a Meta assina as URLs de imagem com validade de horas,
 * e guardá-las produziria painel com foto quebrada em semanas. `permalink` é
 * estável.
 */
export type RelatorioPublicacaoRow = {
  id: string
  perfil_id: string
  /** O id da mídia na Meta. É por ele que a coleta é idempotente. */
  midia_id: string
  publicado_em: string
  /** `date`: o dia a que o post pertence em horário de Brasília. */
  dia: string
  /** IMAGE, VIDEO, CAROUSEL_ALBUM. */
  tipo: string
  /** FEED, REELS, STORY. */
  formato: string
  legenda: string
  permalink: string
  alcance: number | null
  views: number | null
  likes: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  interacoes: number | null
  fonte: string
  criado_em: string
  atualizado_em: string
}

/* ------------------------------------------------- eventos e notícias -- */

export type CategoriaDeEvento = 'comercial' | 'setorial' | 'feriado' | 'sazonal'
export type EscopoDeEvento = 'brasil' | 'global' | 'eua' | 'europa' | 'china'

export type EventoRow = {
  id: string
  user_id: string
  /** `date` do Postgres: "AAAA-MM-DD". */
  data: string
  /** Null = evento de um dia. Feira ocupa uma faixa. */
  data_fim: string | null
  titulo: string
  categoria: CategoriaDeEvento
  escopo: EscopoDeEvento
  local: string | null
  /** O que esta data muda na operação de quem vende moda. */
  por_que_importa: string
  /** Ângulo pronto para virar briefing. */
  ideia_de_post: string
  fonte_url: string | null
  criado_em: string
  atualizado_em: string
}

export type EventoEntrada = Omit<EventoRow, 'id' | 'criado_em' | 'atualizado_em'>

export type NoticiaRow = {
  id: string
  user_id: string
  titulo: string
  resumo: string
  /** O que a notícia muda para quem vende moda — é o que a justifica na lista. */
  por_que_importa: string
  url: string
  fonte: string
  publicado_em: string | null
  coletado_em: string
  /** 1 = ruído, 5 = muda decisão esta semana. */
  relevancia: number
  tags: string[]
  lida: boolean
  virou_pauta: boolean
  criado_em: string
  atualizado_em: string
}

export type NoticiaEntrada = {
  titulo: string
  resumo?: string
  por_que_importa?: string
  url: string
  fonte?: string
  publicado_em?: string | null
  relevancia?: number
  tags?: string[]
}

/* ----------------------------------------------------------- stories -- */

/** Um story dentro da sequência. Espelha src/lib/stories/gerador.ts. */
export type StoryDaSequencia = {
  ordem: number
  rotulo: string
  gatilho: string
  direcao_visual: string
  texto: string
  pede_interacao: boolean
}

export type StorySequenciaRow = {
  id: string
  user_id: string
  /** `date` do Postgres: "AAAA-MM-DD". */
  data: string
  titulo: string
  /** De onde nasceu. Null quando foi escrita do zero. */
  tema_id: string | null
  arco_id: string | null
  stories: StoryDaSequencia[]
  imagem_caminho: string | null
  imagem_descricao: string
  observacao: string
  publicado: boolean
  /** Guardada na gaveta de ideias soltas: sai da grade, mantém tudo o mais. */
  na_gaveta: boolean
  criado_em: string
  atualizado_em: string
}

export type StorySequenciaEntrada = Pick<
  StorySequenciaRow,
  'data' | 'titulo' | 'tema_id' | 'arco_id' | 'stories' | 'observacao'
> &
  Partial<Pick<StorySequenciaRow, 'imagem_caminho' | 'imagem_descricao' | 'publicado'>>

export interface Database {
  public: {
    Tables: {
      calendar_items: {
        Row: CalendarItemRow
        // `na_gaveta` sai do Omit porque tem default no banco: item nasce na
        // grade, nunca na gaveta.
        Insert: Omit<CalendarItemRow, 'id' | 'criado_em' | 'atualizado_em' | 'na_gaveta'> & {
          id?: string
          criado_em?: string
          atualizado_em?: string
          na_gaveta?: boolean
        }
        Update: Partial<Omit<CalendarItemRow, 'id' | 'user_id'>>
        Relationships: []
      }
      content_previews: {
        Row: ContentPreviewRow
        Insert: Omit<
          ContentPreviewRow,
          'id' | 'criado_em' | 'atualizado_em' | 'canva_visto' | 'canva_visto_em'
        > & {
          id?: string
          criado_em?: string
          atualizado_em?: string
          // Têm default no banco: o insert não precisa informar.
          canva_visto?: boolean
          canva_visto_em?: string | null
        }
        Update: Partial<Omit<ContentPreviewRow, 'id' | 'user_id'>>
        Relationships: []
      }
      media_assets: {
        Row: MediaAssetRow
        Insert: Omit<MediaAssetRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<MediaAssetRow, 'id'>>
        Relationships: []
      }
      tags: {
        Row: TagRow
        Insert: Omit<TagRow, 'id'> & { id?: string }
        Update: Partial<Omit<TagRow, 'id' | 'user_id'>>
        Relationships: []
      }
      ajustes: {
        Row: AjusteRow
        Insert: Omit<AjusteRow, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<AjusteRow, 'id'>>
        Relationships: []
      }
      calendar_item_tags: {
        Row: CalendarItemTagRow
        Insert: CalendarItemTagRow
        Update: Partial<CalendarItemTagRow>
        Relationships: []
      }
      notas: {
        Row: NotaRow
        Insert: Omit<
          NotaRow,
          | 'id'
          | 'criado_em'
          | 'atualizado_em'
          | 'titulo'
          | 'conteudo'
          | 'desenho'
          | 'imagens'
          | 'fixada'
          | 'fixada_em'
        > & {
          id?: string
          titulo?: string
          conteudo?: string
          desenho?: CanvasDados | null
          imagens?: CanvasImagens
          fixada?: boolean
          fixada_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<NotaRow, 'id' | 'user_id'>>
        Relationships: []
      }
      stories_sequencias: {
        Row: StorySequenciaRow
        Insert: StorySequenciaEntrada & {
          id?: string
          user_id: string
          criado_em?: string
          atualizado_em?: string
          na_gaveta?: boolean
        }
        Update: Partial<Omit<StorySequenciaRow, 'id' | 'user_id'>>
        Relationships: []
      }
      eventos: {
        Row: EventoRow
        Insert: EventoEntrada & { id?: string; criado_em?: string; atualizado_em?: string }
        Update: Partial<Omit<EventoRow, 'id' | 'user_id'>>
        Relationships: []
      }
      noticias: {
        Row: NoticiaRow
        Insert: NoticiaEntrada & {
          id?: string
          user_id: string
          lida?: boolean
          virou_pauta?: boolean
          coletado_em?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<NoticiaRow, 'id' | 'user_id'>>
        Relationships: []
      }
      relatorio_perfis: {
        Row: RelatorioPerfilRow
        Insert: Omit<RelatorioPerfilRow, 'id' | 'criado_em' | 'atualizado_em' | 'rede' | 'nome' | 'fonte'> & {
          id?: string
          rede?: RedeSocial
          nome?: string
          fonte?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<RelatorioPerfilRow, 'id' | 'user_id'>>
        Relationships: []
      }
      relatorio_metricas_diarias: {
        Row: RelatorioMetricaRow
        Insert: RelatorioMetricaEntrada & {
          id?: string
          perfil_id: string
          fonte?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<RelatorioMetricaRow, 'id' | 'perfil_id'>>
        Relationships: []
      }
      relatorio_publicacoes: {
        Row: RelatorioPublicacaoRow
        Insert: Omit<
          RelatorioPublicacaoRow,
          | 'id'
          | 'tipo'
          | 'formato'
          | 'legenda'
          | 'permalink'
          | 'fonte'
          | 'criado_em'
          | 'atualizado_em'
        > & {
          id?: string
          tipo?: string
          formato?: string
          legenda?: string
          permalink?: string
          fonte?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<RelatorioPublicacaoRow, 'id' | 'perfil_id'>>
        Relationships: []
      }
      canvas_boards: {
        Row: CanvasBoardRow
        Insert: Omit<CanvasBoardRow, 'id' | 'criado_em' | 'atualizado_em' | 'nome' | 'dados'> & {
          id?: string
          nome?: string
          dados?: CanvasDados
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<CanvasBoardRow, 'id' | 'user_id'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_public_preview: {
        Args: { preview_id: string }
        Returns: PublicPreview | null
      }
      enviar_ajuste: {
        Args: { preview_id: string; texto: string; autor?: string | null }
        Returns: AjustePublico
      }
      marcar_canva_visto: {
        Args: { preview_id: string; visto: boolean }
        Returns: { canva_visto: boolean; canva_visto_em: string | null }
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
