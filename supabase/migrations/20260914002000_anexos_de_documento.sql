-- ============================================================================
-- Notas aceitam documento, não só imagem
-- ============================================================================
-- O bucket `canvas` nasceu para as imagens do quadro e herdou as notas. A
-- lista de tipos permitidos ficou só com imagem, e o teto, em 10 MB.
--
-- Isso é uma trava do lado do SERVIDOR: por mais que o app ofereça o botão de
-- anexar PDF, o Storage recusa o upload com "mime type not supported" e a
-- pessoa vê um erro que não explica nada. Por isso esta migração vem junto com
-- a tela, e não depois dela.
--
-- O que muda:
--   · entram os tipos de documento que aparecem no dia a dia dele — PDF em
--     primeiro lugar, mais planilha, apresentação, texto e CSV;
--   · o teto sobe de 10 MB para 25 MB.
--
-- O que NÃO muda: o bucket continua privado, e as políticas continuam sendo as
-- mesmas quatro, que olham o primeiro segmento do caminho (`<user_id>/...`).
-- Documento entra pela mesma porta da imagem e fica igualmente inacessível
-- sem URL assinada.
-- ============================================================================

-- Por que 25 MB: os PDFs de material e apostila que ele costuma guardar vão a
-- 15 MB sem esforço. 10 MB recusaria metade deles; um teto muito maior
-- convidaria a usar a nota como disco, e o bucket é o mesmo das imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas',
  'canvas',
  false,
  26214400, -- 25 MB por arquivo
  array[
    -- imagens: o que já valia, sem tirar nada
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
    -- documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/zip',
    'application/json',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

comment on column notas.conteudo is
  'HTML do editor. Imagens aparecem como src="anexo:<caminho no bucket canvas>"; '
  'documentos, como <div data-documento data-anexo="<caminho>">. O documento '
  'guarda só o caminho — a URL assinada é pedida na hora de abrir ou baixar, '
  'nunca gravada, porque ela expira em uma hora e o HTML fica para sempre.';
