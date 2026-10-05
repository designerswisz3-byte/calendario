-- ============================================================================
-- Sobe o limite de upload do bucket `media` de 300 MB para 500 MB.
-- ============================================================================
-- O limite existe em TRÊS lugares e vale sempre o MENOR deles:
--
--   1. o app (MAX_VIDEO_SIZE_MB, validado antes de o arquivo sair do browser)
--   2. o bucket (esta migração)
--   3. o limite global do projeto no Supabase
--
-- O item 3 NÃO se resolve por SQL. Ele fica em Storage → Settings → "Global
-- file size limit", e enquanto estiver abaixo de 500 MB é ele que manda —
-- rodar esta migração sozinha não muda nada no que a pessoa consegue subir.
--
-- Já aconteceu neste projeto: o app e o bucket estavam em 300 MB, um vídeo de
-- 178 MB era recusado, e a causa era o limite global parado nos 50 MB padrão.
-- ============================================================================

update storage.buckets
set file_size_limit = 524288000 -- 500 MB
where id = 'media';

-- Garante o bucket mesmo em banco novo, onde a migração 200 ainda não passou.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  524288000,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;
