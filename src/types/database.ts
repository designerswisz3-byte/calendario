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
  media_assets: MediaAssetRow[]
  ajustes: AjustePublico[]
}

/** Item de planejamento + tags + conteúdo vinculado (se houver). */
export interface CalendarItemWithRelations extends CalendarItemRow {
  tags: TagRow[]
  preview: ContentPreviewWithMedia | null
}

export interface Database {
  public: {
    Tables: {
      calendar_items: {
        Row: CalendarItemRow
        Insert: Omit<CalendarItemRow, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<CalendarItemRow, 'id' | 'user_id'>>
        Relationships: []
      }
      content_previews: {
        Row: ContentPreviewRow
        Insert: Omit<ContentPreviewRow, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: string
          criado_em?: string
          atualizado_em?: string
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
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
