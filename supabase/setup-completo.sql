-- ============================================================================
-- SETUP COMPLETO DO BANCO — cole tudo isto no SQL Editor do Supabase e rode.
-- ============================================================================
-- Junção das migrações de supabase/migrations/, na ordem correta, para quem
-- prefere um único copiar-e-colar. É idempotente: pode rodar de novo.
--
--   1. 20260914000100 — tabelas, índices, triggers e RLS
--   2. 20260914000200 — bucket `media` no Storage e suas políticas
--   3. 20260914000300 — fecha a leitura anônima e cria get_public_preview()
--   4. 20260914000400 — sobe o limite de upload do bucket para 300 MB
--   5. 20260914000500 — ajustes do cliente e a função enviar_ajuste()
--
-- Se a parte 2 falhar com "must be owner of table objects", rode as demais
-- por aqui e crie o bucket `media` pela interface (Storage > New bucket >
-- nome "media" > Public).
-- ============================================================================



-- >>>>>>>>>>>>>>>>>>>> 20260914000100_init_schema.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Calendário Editorial + Preview de Conteúdo — schema inicial
-- ============================================================================
-- Executar no SQL Editor do Supabase (ou `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- calendar_items — PLANEJAMENTO do dia.
-- Nunca guarda legenda, mídia ou nome do expert: isso pertence a
-- content_previews (a ferramenta de criação da Parte 1).
-- ---------------------------------------------------------------------------
create table if not exists calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  data date not null,
  horario time,
  tipo text check (tipo in ('carrossel','reels','story','post','ideia')) not null,
  status text check (
    status in ('ideia','roteiro','design','em_aprovacao','aprovado','agendado','publicado')
  ) not null default 'ideia',
  notas text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- content_previews — CONTEÚDO de fato (expert, legenda, tipo) + link público.
-- calendar_item_id é o elo com o planejamento.
-- ---------------------------------------------------------------------------
create table if not exists content_previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  calendar_item_id uuid references calendar_items(id) on delete set null,
  nome_expert text not null,
  legenda text,
  tipo text check (tipo in ('carrossel','reels','story','post')) not null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Um item de planejamento tem no máximo um conteúdo vinculado: é o que garante
-- que "Editar conteúdo" reuse o mesmo id em vez de criar um segundo registro.
create unique index if not exists content_previews_calendar_item_id_key
  on content_previews (calendar_item_id)
  where calendar_item_id is not null;

-- ---------------------------------------------------------------------------
-- media_assets — imagens do carrossel (ordenadas) ou vídeo do reels/story.
-- ---------------------------------------------------------------------------
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  content_preview_id uuid references content_previews(id) on delete cascade not null,
  url_arquivo text not null,
  ordem int default 0,
  tipo text check (tipo in ('imagem','video')) not null,
  criado_em timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- tags + relação N:N com os itens de planejamento
-- ---------------------------------------------------------------------------
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nome text not null,
  cor text default '#6366f1'
);

create unique index if not exists tags_user_nome_key on tags (user_id, lower(nome));

create table if not exists calendar_item_tags (
  calendar_item_id uuid references calendar_items(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (calendar_item_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Índices de leitura (calendário lê sempre por user_id + faixa de datas)
-- ---------------------------------------------------------------------------
create index if not exists calendar_items_user_data_idx on calendar_items (user_id, data);
create index if not exists content_previews_user_idx on content_previews (user_id);
create index if not exists media_assets_preview_ordem_idx on media_assets (content_preview_id, ordem);

-- ---------------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------------
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists calendar_items_set_atualizado_em on calendar_items;
create trigger calendar_items_set_atualizado_em
  before update on calendar_items
  for each row execute function set_atualizado_em();

drop trigger if exists content_previews_set_atualizado_em on content_previews;
create trigger content_previews_set_atualizado_em
  before update on content_previews
  for each row execute function set_atualizado_em();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table calendar_items enable row level security;
alter table content_previews enable row level security;
alter table media_assets enable row level security;
alter table tags enable row level security;
alter table calendar_item_tags enable row level security;

-- --- calendar_items: tudo restrito ao dono -----------------------------------
drop policy if exists "calendar_items_select_own" on calendar_items;
create policy "calendar_items_select_own" on calendar_items
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_items_insert_own" on calendar_items;
create policy "calendar_items_insert_own" on calendar_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_items_update_own" on calendar_items;
create policy "calendar_items_update_own" on calendar_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_items_delete_own" on calendar_items;
create policy "calendar_items_delete_own" on calendar_items
  for delete using (auth.uid() = user_id);

-- --- content_previews --------------------------------------------------------
-- SELECT é PÚBLICO (anon + authenticated): é o que faz o link /preview/:id
-- abrir sem login. Escrita continua restrita ao dono.
drop policy if exists "content_previews_select_public" on content_previews;
create policy "content_previews_select_public" on content_previews
  for select to anon, authenticated using (true);

drop policy if exists "content_previews_insert_own" on content_previews;
create policy "content_previews_insert_own" on content_previews
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "content_previews_update_own" on content_previews;
create policy "content_previews_update_own" on content_previews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "content_previews_delete_own" on content_previews;
create policy "content_previews_delete_own" on content_previews
  for delete to authenticated using (auth.uid() = user_id);

-- --- media_assets ------------------------------------------------------------
-- SELECT também público: sem isso o visitante anônimo abriria o preview sem as
-- mídias. Escrita permitida apenas ao dono do content_preview correspondente.
drop policy if exists "media_assets_select_public" on media_assets;
create policy "media_assets_select_public" on media_assets
  for select to anon, authenticated using (true);

drop policy if exists "media_assets_insert_own" on media_assets;
create policy "media_assets_insert_own" on media_assets
  for insert to authenticated with check (
    exists (
      select 1 from content_previews cp
      where cp.id = media_assets.content_preview_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "media_assets_update_own" on media_assets;
create policy "media_assets_update_own" on media_assets
  for update to authenticated using (
    exists (
      select 1 from content_previews cp
      where cp.id = media_assets.content_preview_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "media_assets_delete_own" on media_assets;
create policy "media_assets_delete_own" on media_assets
  for delete to authenticated using (
    exists (
      select 1 from content_previews cp
      where cp.id = media_assets.content_preview_id and cp.user_id = auth.uid()
    )
  );

-- --- tags --------------------------------------------------------------------
drop policy if exists "tags_select_own" on tags;
create policy "tags_select_own" on tags for select using (auth.uid() = user_id);

drop policy if exists "tags_insert_own" on tags;
create policy "tags_insert_own" on tags for insert with check (auth.uid() = user_id);

drop policy if exists "tags_update_own" on tags;
create policy "tags_update_own" on tags
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tags_delete_own" on tags;
create policy "tags_delete_own" on tags for delete using (auth.uid() = user_id);

-- --- calendar_item_tags (sem user_id: herda o dono do item) -------------------
drop policy if exists "calendar_item_tags_select_own" on calendar_item_tags;
create policy "calendar_item_tags_select_own" on calendar_item_tags
  for select using (
    exists (
      select 1 from calendar_items ci
      where ci.id = calendar_item_tags.calendar_item_id and ci.user_id = auth.uid()
    )
  );

drop policy if exists "calendar_item_tags_insert_own" on calendar_item_tags;
create policy "calendar_item_tags_insert_own" on calendar_item_tags
  for insert with check (
    exists (
      select 1 from calendar_items ci
      where ci.id = calendar_item_tags.calendar_item_id and ci.user_id = auth.uid()
    )
  );

drop policy if exists "calendar_item_tags_delete_own" on calendar_item_tags;
create policy "calendar_item_tags_delete_own" on calendar_item_tags
  for delete using (
    exists (
      select 1 from calendar_items ci
      where ci.id = calendar_item_tags.calendar_item_id and ci.user_id = auth.uid()
    )
  );


-- >>>>>>>>>>>>>>>>>>>> 20260914000200_storage_media_bucket.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Storage: bucket `media`
-- Leitura pública (o link /preview/:id abre sem login e precisa carregar as
-- mídias) e escrita restrita a usuários autenticados, cada um na sua pasta
-- `<user_id>/...`.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600, -- 100 MB
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública de qualquer arquivo do bucket.
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

-- Upload apenas dentro da própria pasta do usuário.
drop policy if exists "media_authenticated_insert" on storage.objects;
create policy "media_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_authenticated_update" on storage.objects;
create policy "media_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_authenticated_delete" on storage.objects;
create policy "media_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);


-- >>>>>>>>>>>>>>>>>>>> 20260914000300_preview_publico_apenas_por_id.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Corrige o acesso público ao preview: leitura APENAS por id.
-- ============================================================================
-- A migração 20260914000100 deu SELECT público (`using (true)`) em
-- content_previews e media_assets. Isso faz o link /preview/:id funcionar,
-- mas RLS é por LINHA, não por formato de consulta: com a chave anon — que
-- vai no bundle público do frontend — qualquer pessoa poderia LISTAR todos
-- os previews de todos os clientes e ler as legendas, sem saber id nenhum.
--
-- A especificação pede leitura pública "apenas via id". Em Postgres isso não
-- se expressa numa policy; resolve-se tirando o SELECT anônimo da tabela e
-- expondo uma função SECURITY DEFINER que exige o id como argumento.
-- ============================================================================

-- --- 1. content_previews: SELECT volta a ser só do dono -----------------------
drop policy if exists "content_previews_select_public" on content_previews;

drop policy if exists "content_previews_select_own" on content_previews;
create policy "content_previews_select_own" on content_previews
  for select to authenticated using (auth.uid() = user_id);

-- --- 2. media_assets: idem, via dono do content_preview ----------------------
drop policy if exists "media_assets_select_public" on media_assets;

drop policy if exists "media_assets_select_own" on media_assets;
create policy "media_assets_select_own" on media_assets
  for select to authenticated using (
    exists (
      select 1 from content_previews cp
      where cp.id = media_assets.content_preview_id and cp.user_id = auth.uid()
    )
  );

-- --- 3. A porta pública: exige o id, devolve uma linha ------------------------
-- SECURITY DEFINER roda com os privilégios do dono da função, contornando a
-- RLS de propósito — por isso o search_path é fixado, para a função não poder
-- ser sequestrada por um schema plantado no caminho de busca.
--
-- O retorno omite user_id e calendar_item_id: quem recebe o link não precisa
-- (nem deve) saber a estrutura interna do planejamento.
create or replace function public.get_public_preview(preview_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', cp.id,
    'nome_expert', cp.nome_expert,
    'legenda', cp.legenda,
    'tipo', cp.tipo,
    'criado_em', cp.criado_em,
    'media_assets', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', ma.id,
                   'content_preview_id', ma.content_preview_id,
                   'url_arquivo', ma.url_arquivo,
                   'ordem', ma.ordem,
                   'tipo', ma.tipo,
                   'criado_em', ma.criado_em
                 )
                 order by ma.ordem
               )
        from media_assets ma
        where ma.content_preview_id = cp.id
      ),
      '[]'::jsonb
    )
  )
  from content_previews cp
  where cp.id = preview_id;
$$;

revoke all on function public.get_public_preview(uuid) from public;
grant execute on function public.get_public_preview(uuid) to anon, authenticated;

comment on function public.get_public_preview(uuid) is
  'Leitura pública de um preview, exigindo o id. Substitui o SELECT anônimo '
  'na tabela, que permitia listar todos os previews de todos os usuários.';


-- >>>>>>>>>>>>>>>>>>>> 20260914000400_limite_video_300mb.sql <<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>> 20260914000500_ajustes_do_cliente.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Ajustes: o retorno do cliente direto no link de preview.
-- ============================================================================
-- Quem abre o link é anônimo e não tem sessão. Em vez de abrir INSERT para
-- `anon` na tabela — o que deixaria qualquer um escrever em qualquer lugar —
-- a escrita passa por uma função SECURITY DEFINER que só sabe fazer uma
-- coisa: anexar um texto a um preview que existe.
-- ============================================================================

create table if not exists ajustes (
  id uuid primary key default gen_random_uuid(),
  content_preview_id uuid references content_previews(id) on delete cascade not null,
  autor text,
  texto text not null,
  criado_em timestamptz default now()
);

create index if not exists ajustes_preview_idx on ajustes (content_preview_id, criado_em);

alter table ajustes enable row level security;

-- Leitura e limpeza só do dono do conteúdo. `anon` não toca na tabela.
drop policy if exists "ajustes_select_own" on ajustes;
create policy "ajustes_select_own" on ajustes
  for select to authenticated using (
    exists (
      select 1 from content_previews cp
      where cp.id = ajustes.content_preview_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "ajustes_delete_own" on ajustes;
create policy "ajustes_delete_own" on ajustes
  for delete to authenticated using (
    exists (
      select 1 from content_previews cp
      where cp.id = ajustes.content_preview_id and cp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- A porta do cliente: exige um preview existente e um texto não vazio.
-- ---------------------------------------------------------------------------
-- O texto não tem limite prático (o campo é `text`), mas há um teto de 100 mil
-- caracteres. Não é para restringir o cliente — nenhum retorno humano chega
-- perto disso — é para um endpoint anônimo não virar porta de entrada para
-- alguém despejar megabytes no banco.
create or replace function public.enviar_ajuste(
  preview_id uuid,
  texto text,
  autor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- Os parâmetros `texto` e `autor` têm o mesmo nome de colunas de `ajustes`.
-- Sem esta diretiva, o PL/pgSQL resolve o nome para a coluna dentro do
-- INSERT e o valor recebido é descartado — o autor chegava sempre nulo.
#variable_conflict use_variable
declare
  texto_limpo text := btrim(texto);
  autor_limpo text := nullif(btrim(autor), '');
  novo ajustes;
begin
  if texto_limpo is null or texto_limpo = '' then
    raise exception 'Escreva o ajuste antes de enviar.' using errcode = '22023';
  end if;

  if length(texto_limpo) > 100000 then
    raise exception 'O texto passou de 100 mil caracteres.' using errcode = '22023';
  end if;

  if not exists (select 1 from content_previews where id = preview_id) then
    raise exception 'Este preview não foi encontrado.' using errcode = 'P0002';
  end if;

  insert into ajustes (content_preview_id, autor, texto)
  values (preview_id, autor_limpo, texto_limpo)
  returning * into novo;

  return jsonb_build_object(
    'id', novo.id,
    'autor', novo.autor,
    'texto', novo.texto,
    'criado_em', novo.criado_em
  );
end;
$$;

revoke all on function public.enviar_ajuste(uuid, text, text) from public;
grant execute on function public.enviar_ajuste(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- O preview público passa a devolver os ajustes já enviados, para o cliente
-- ver o que ele mesmo mandou e não repetir o pedido.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_preview(preview_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', cp.id,
    'nome_expert', cp.nome_expert,
    'legenda', cp.legenda,
    'tipo', cp.tipo,
    'criado_em', cp.criado_em,
    'media_assets', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', ma.id,
                   'content_preview_id', ma.content_preview_id,
                   'url_arquivo', ma.url_arquivo,
                   'ordem', ma.ordem,
                   'tipo', ma.tipo,
                   'criado_em', ma.criado_em
                 )
                 order by ma.ordem
               )
        from media_assets ma
        where ma.content_preview_id = cp.id
      ),
      '[]'::jsonb
    ),
    'ajustes', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', aj.id,
                   'autor', aj.autor,
                   'texto', aj.texto,
                   'criado_em', aj.criado_em
                 )
                 order by aj.criado_em
               )
        from ajustes aj
        where aj.content_preview_id = cp.id
      ),
      '[]'::jsonb
    )
  )
  from content_previews cp
  where cp.id = preview_id;
$$;

comment on function public.enviar_ajuste(uuid, text, text) is
  'Única porta de escrita do visitante anônimo: anexa um ajuste a um preview '
  'existente. A tabela `ajustes` continua fechada para anon.';

