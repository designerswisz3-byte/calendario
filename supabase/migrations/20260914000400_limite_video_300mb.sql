-- ============================================================================
-- Aumenta o limite de upload do bucket `media` de 100 MB para 300 MB.
-- ============================================================================
-- O limite existe em três lugares e todos precisam concordar, senão o upload
-- falha em algum ponto do caminho:
--   1. o app (MAX_VIDEO_SIZE_MB, validado antes de subir)
--   2. o bucket (esta migração)
--   3. o teto do plano do projeto no Supabase
--
-- O item 3 não se resolve por SQL. No plano Free o teto por arquivo é de
-- 50 MB, e nenhuma configuração de bucket passa por cima disso — um vídeo de
-- 300 MB só sobe em plano pago.
-- ============================================================================

update storage.buckets
set file_size_limit = 314572800 -- 300 MB
where id = 'media';

-- Garante o bucket mesmo em banco novo, onde a migração 200 ainda não passou.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  314572800,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;
