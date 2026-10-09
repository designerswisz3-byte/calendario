-- ============================================================================
-- SETUP COMPLETO DO BANCO — cole tudo isto no SQL Editor do Supabase e rode.
-- ============================================================================
-- Junção das migrações de supabase/migrations/, na ordem correta, para quem
-- prefere um único copiar-e-colar. É idempotente: pode rodar de novo.
--
-- GERADO por scripts/gerar-setup-completo.mjs — não edite à mão.
--
--   1. 20260914000100 — Calendário Editorial + Preview de Conteúdo — schema inicial
--   2. 20260914000200 — Storage: bucket `media`
--   3. 20260914000300 — Corrige o acesso público ao preview: leitura APENAS por id.
--   4. 20260914000400 — Aumenta o limite de upload do bucket `media` de 100 MB para 300 MB.
--   5. 20260914000500 — Ajustes: o retorno do cliente direto no link de preview.
--   6. 20260914000600 — Separa o texto do item de planejamento em dois: briefing e roteiro.
--   7. 20260914000700 — Link da arte no Canva + visto do expert.
--   8. 20260914000800 — Canvas: quadro infinito de ideias (estilo Miro), uma aba nova do app.
--   9. 20260914000900 — Notas: caderno de ideias no estilo do Notas da Apple, com ligações
--   10. 20260914001000 — Notas fixadas: o que é importante sobe para o topo da lista.
--   11. 20260914001100 — Relatório: métricas de perfil arquivadas mês a mês.
--
-- Se alguma parte de Storage falhar com "must be owner of table objects", rode
-- as demais por aqui e crie os buckets pela interface (Storage > New bucket):
-- `media` como Public e `canvas` como privado.
-- ============================================================================


-- ==========================================================================
-- 20260914000100_init_schema.sql
-- ==========================================================================

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


-- ==========================================================================
-- 20260914000200_storage_media_bucket.sql
-- ==========================================================================

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


-- ==========================================================================
-- 20260914000300_preview_publico_apenas_por_id.sql
-- ==========================================================================

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


-- ==========================================================================
-- 20260914000400_limite_video_300mb.sql
-- ==========================================================================

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


-- ==========================================================================
-- 20260914000500_ajustes_do_cliente.sql
-- ==========================================================================

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


-- ==========================================================================
-- 20260914000600_roteiro.sql
-- ==========================================================================

-- ============================================================================
-- Separa o texto do item de planejamento em dois: briefing e roteiro.
-- ============================================================================
-- `notas` continua sendo o BRIEFING — é onde já está tudo que foi escrito até
-- aqui, e nada é movido ou reescrito. O roteiro entra como coluna nova, vazia.
--
-- São textos com funções diferentes: o briefing é para pensar (ângulo, gancho,
-- referência), o roteiro é para gravar — e é ele que alimenta o teleprompter.
-- ============================================================================

alter table calendar_items add column if not exists roteiro text;

comment on column calendar_items.notas is
  'Briefing: ângulo, gancho, referências. Texto livre de planejamento.';
comment on column calendar_items.roteiro is
  'Roteiro de gravação, exibido no teleprompter.';


-- ==========================================================================
-- 20260914000700_canva.sql
-- ==========================================================================

-- ============================================================================
-- Link da arte no Canva + visto do expert.
-- ============================================================================
-- O expert abre o link público, clica para ver a arte no Canva e isso marca
-- um visto. Ele pode desmarcar. Como quem clica é anônimo, a escrita passa
-- por uma função SECURITY DEFINER — a tabela continua fechada para `anon`.
-- ============================================================================

alter table content_previews add column if not exists canva_url text;
alter table content_previews add column if not exists canva_visto boolean not null default false;
alter table content_previews add column if not exists canva_visto_em timestamptz;

-- A URL fica visível num link público: restringir aos domínios do Canva evita
-- que um erro de colagem vire um link para qualquer lugar na cara do cliente.
alter table content_previews drop constraint if exists content_previews_canva_url_check;
alter table content_previews add constraint content_previews_canva_url_check
  check (
    canva_url is null
    or canva_url ~* '^https://([a-z0-9-]+\.)?canva\.(com|cn|me|site)(/|$)'
  );

comment on column content_previews.canva_url is
  'Link do projeto no Canva, aberto pelo expert a partir do preview público.';
comment on column content_previews.canva_visto is
  'Marcado quando o expert abre a arte no Canva. Ele também pode desmarcar.';

-- ---------------------------------------------------------------------------
-- A porta do expert: alterna o visto de um preview que existe.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_canva_visto(preview_id uuid, visto boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
  atualizado content_previews;
begin
  update content_previews cp
  set canva_visto = visto,
      canva_visto_em = case when visto then now() else null end
  where cp.id = preview_id
  returning * into atualizado;

  if atualizado.id is null then
    raise exception 'Este preview não foi encontrado.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'canva_visto', atualizado.canva_visto,
    'canva_visto_em', atualizado.canva_visto_em
  );
end;
$$;

revoke all on function public.marcar_canva_visto(uuid, boolean) from public;
grant execute on function public.marcar_canva_visto(uuid, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- O payload público passa a carregar o link e o visto.
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
    'canva_url', cp.canva_url,
    'canva_visto', cp.canva_visto,
    'canva_visto_em', cp.canva_visto_em,
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


-- ==========================================================================
-- 20260914000800_canvas.sql
-- ==========================================================================

-- ============================================================================
-- Canvas: quadro infinito de ideias (estilo Miro), uma aba nova do app.
-- ============================================================================
-- Guarda a cena (elementos + estado de visualização) num jsonb e as imagens
-- num bucket PRIVADO. Os dois separados de propósito:
--
--   * a cena sem imagens é pequena — alguns KB mesmo com centenas de formas;
--   * imagem colada no Excalidraw vira dataURL base64, e base64 dentro de
--     jsonb infla a linha até o ponto de cada autosave reescrever megabytes.
--
-- Por isso `dados.imagens` guarda só o CAMINHO no storage, e o app remonta a
-- dataURL ao abrir o quadro.
-- ============================================================================

create table if not exists canvas_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null default 'Principal',
  -- { elements: [...], appState: {...}, imagens: { <fileId>: <caminho> } }
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Um quadro por nome, por dono. É o que torna o "abre ou cria" seguro contra
-- corrida: duas abas abrindo o app ao mesmo tempo não criam dois quadros.
create unique index if not exists canvas_boards_user_id_nome_key
  on canvas_boards (user_id, nome);

create index if not exists canvas_boards_user_id_idx on canvas_boards (user_id);

drop trigger if exists canvas_boards_set_atualizado_em on canvas_boards;
create trigger canvas_boards_set_atualizado_em
  before update on canvas_boards
  for each row execute function set_atualizado_em();

alter table canvas_boards enable row level security;

drop policy if exists "canvas_boards_select_own" on canvas_boards;
create policy "canvas_boards_select_own" on canvas_boards
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "canvas_boards_insert_own" on canvas_boards;
create policy "canvas_boards_insert_own" on canvas_boards
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "canvas_boards_update_own" on canvas_boards;
create policy "canvas_boards_update_own" on canvas_boards
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "canvas_boards_delete_own" on canvas_boards;
create policy "canvas_boards_delete_own" on canvas_boards
  for delete to authenticated using (auth.uid() = user_id);

comment on table canvas_boards is
  'Quadro infinito de ideias. `dados` guarda elements/appState do Excalidraw e o mapa de imagens.';

-- ============================================================================
-- Storage: bucket `canvas` — PRIVADO.
-- ============================================================================
-- Diferente do bucket `media`, que é público porque o link /preview/:id abre
-- sem login. O canvas é material interno de trabalho: referência de
-- concorrente, print de conversa, rascunho de campanha. Nada disso deveria ser
-- legível por quem tiver a URL.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas',
  'canvas',
  false,
  10485760, -- 10 MB por imagem
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura restrita ao dono: sem política para `anon`, e a pasta é o user_id.
drop policy if exists "canvas_owner_read" on storage.objects;
create policy "canvas_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'canvas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "canvas_owner_insert" on storage.objects;
create policy "canvas_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'canvas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "canvas_owner_update" on storage.objects;
create policy "canvas_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'canvas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "canvas_owner_delete" on storage.objects;
create policy "canvas_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'canvas' and (storage.foldername(name))[1] = auth.uid()::text);


-- ==========================================================================
-- 20260914000900_notas.sql
-- ==========================================================================

-- ============================================================================
-- Notas: caderno de ideias no estilo do Notas da Apple, com ligações
-- entre notas no estilo do Obsidian.
-- ============================================================================
-- Substitui a aba Canvas. A tabela `canvas_boards` NÃO é apagada aqui de
-- propósito: apagar tabela é destrutivo e o conteúdo é de quem escreveu. Quem
-- quiser limpar roda `drop table canvas_boards;` à mão, depois de conferir.
--
-- O conteúdo é o HTML do editor. Imagens não entram embutidas: cada uma vai
-- para o bucket privado e no HTML fica só `src="anexo:<caminho>"`, trocado por
-- uma URL assinada na hora de exibir. Sem isso, cada autosave reescreveria
-- todas as imagens em base64 — o mesmo erro que o canvas quase cometeu.
-- ============================================================================

create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  /* Primeira linha do conteúdo, como no Notas da Apple. Guardada em coluna
     própria para a lista carregar sem puxar o corpo inteiro de cada nota. */
  titulo text not null default '',
  conteudo text not null default '',
  /* Cena do Excalidraw do desenho desta nota. Null = nota sem desenho. */
  desenho jsonb,
  /* fileId do Excalidraw -> caminho no bucket, para o desenho. */
  imagens jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- A lista abre ordenada pela última edição, como todo app de notas.
create index if not exists notas_user_id_atualizado_em_idx
  on notas (user_id, atualizado_em desc);

drop trigger if exists notas_set_atualizado_em on notas;
create trigger notas_set_atualizado_em
  before update on notas
  for each row execute function set_atualizado_em();

alter table notas enable row level security;

drop policy if exists "notas_select_own" on notas;
create policy "notas_select_own" on notas
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notas_insert_own" on notas;
create policy "notas_insert_own" on notas
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "notas_update_own" on notas;
create policy "notas_update_own" on notas
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notas_delete_own" on notas;
create policy "notas_delete_own" on notas
  for delete to authenticated using (auth.uid() = user_id);

comment on table notas is
  'Notas em HTML, com desenho opcional e ligações [[por título]] entre elas.';
comment on column notas.conteudo is
  'HTML do editor. Imagens aparecem como src="anexo:<caminho no bucket canvas>".';

-- ============================================================================
-- Storage: os anexos ficam no bucket `canvas`, que já existe e já é privado.
-- ============================================================================
-- Reaproveitar evita criar mais um bucket (e mais uma chance de a parte de
-- Storage falhar no SQL Editor). As políticas de dono já valem para ele.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas',
  'canvas',
  false,
  10485760, -- 10 MB por imagem
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ==========================================================================
-- 20260914001000_notas_fixadas.sql
-- ==========================================================================

-- ============================================================================
-- Notas fixadas: o que é importante sobe para o topo da lista.
-- ============================================================================
-- Duas colunas, e não uma. `fixada` responde "está no topo?"; `fixada_em`
-- responde "em que ordem?".
--
-- Sem a segunda, todas as fixadas empatariam e cairiam na ordem de edição —
-- ou seja, abrir uma nota fixada para reler mudaria a posição dela no ranking.
-- Com `fixada_em`, a ordem entre as fixadas é a ordem em que foram fixadas, e
-- só muda quando a pessoa decide mudá-la: refixar manda a nota para o topo.
-- ============================================================================

alter table notas add column if not exists fixada boolean not null default false;
alter table notas add column if not exists fixada_em timestamptz;

-- O índice cobre exatamente a ordenação da lista: fixadas primeiro, as mais
-- recentemente fixadas na frente, e o resto por última edição.
create index if not exists notas_user_id_ordem_idx
  on notas (user_id, fixada desc, fixada_em desc nulls last, atualizado_em desc);

comment on column notas.fixada is
  'Nota fixada no topo da lista.';
comment on column notas.fixada_em is
  'Quando foi fixada. Define a ordem entre as fixadas — refixar sobe a nota.';

-- ============================================================================
-- Fixar não é editar.
-- ============================================================================
-- O gatilho genérico `set_atualizado_em()` carimba a data em QUALQUER update.
-- Com ele, fixar ou soltar uma nota a tornava "a mais recente": ela pulava
-- para o topo da seção das soltas e a data na lista mudava sem ninguém ter
-- escrito nada. Medido: uma nota de 3 minutos atrás virou a mais nova da lista
-- só por ter sido fixada e solta.
--
-- Este gatilho é só da tabela `notas` e só carimba quando o CONTEÚDO muda.
-- ============================================================================

create or replace function notas_carimbar_edicao()
returns trigger
language plpgsql
as $$
begin
  if new.titulo is distinct from old.titulo
     or new.conteudo is distinct from old.conteudo
     or new.desenho is distinct from old.desenho
     or new.imagens is distinct from old.imagens then
    new.atualizado_em = now();
  else
    new.atualizado_em = old.atualizado_em;
  end if;
  return new;
end;
$$;

drop trigger if exists notas_set_atualizado_em on notas;
drop trigger if exists notas_carimbar_edicao on notas;
create trigger notas_carimbar_edicao
  before update on notas
  for each row execute function notas_carimbar_edicao();


-- ==========================================================================
-- 20260914001100_relatorio.sql
-- ==========================================================================

-- ============================================================================
-- Relatório: métricas de perfil arquivadas mês a mês.
-- ============================================================================
-- Duas decisões que sustentam a aba inteira:
--
-- 1) O GRÃO É O DIA, não o mês. Mensal, semanal e qualquer comparativo saem de
--    uma soma sobre os dias; o contrário não vale — de um total mensal não se
--    extrai a semana. Guardar o mês fechado economizaria linhas (30x menos) e
--    custaria a visão semanal que foi pedida junto.
--
-- 2) TODA MÉTRICA É NULLABLE, e null NÃO é zero. null = "não temos o dado
--    deste dia". Zero = "a Meta devolveu zero". Misturar os dois produz
--    gráficos que mentem para baixo: um mês com 15 dias coletados apareceria
--    com metade do alcance real, e ninguém saberia por quê. Por isso cada
--    período também carrega quantos dias dele têm dado — a tela mostra a
--    cobertura em vez de interpolar.
-- ============================================================================

create table if not exists relatorio_perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rede text not null default 'instagram' check (rede in ('instagram', 'youtube', 'tiktok')),
  -- Sem o "@": ele é enfeite de exibição, não parte da identidade.
  handle text not null check (handle <> '' and handle not like '@%'),
  nome text not null default '',
  -- De onde o dado vem. Serve para a tela avisar o que está desatualizado e
  -- para não tratar importação manual como se fosse coleta automática.
  fonte text not null default 'manual',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, rede, handle)
);

create table if not exists relatorio_metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references relatorio_perfis (id) on delete cascade,
  dia date not null,

  -- ESTOQUE: o total de seguidores naquele dia. Não se soma — compara-se o
  -- primeiro com o último dia do período.
  seguidores integer,
  -- FLUXO: quanto rendeu NESTE dia. Somável.
  seguidores_ganhos integer,
  alcance integer,
  views integer,
  likes integer,
  comentarios integer,
  salvamentos integer,
  compartilhamentos integer,
  interacoes integer,
  cliques_no_link integer,
  publicacoes integer,

  fonte text not null default 'manual',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- O par que torna a importação idempotente: reimportar o mesmo dia atualiza
  -- a linha em vez de duplicar o mês.
  unique (perfil_id, dia)
);

create index if not exists relatorio_metricas_perfil_dia_idx
  on relatorio_metricas_diarias (perfil_id, dia desc);

comment on table relatorio_perfis is
  'Perfis acompanhados no Relatório. Um perfil por rede e handle.';
comment on column relatorio_metricas_diarias.seguidores is
  'Total de seguidores no dia (estoque). Null = dia sem coleta, não zero.';
comment on column relatorio_metricas_diarias.alcance is
  'Contas alcançadas NESTE dia (fluxo). Null = dia sem coleta, não zero.';

-- ============================================================================
-- RLS
-- ============================================================================
-- As métricas não têm user_id de propósito: o dono é o perfil. Duas fontes de
-- verdade para a mesma propriedade é como se cria a linha órfã que escapa da
-- política.
-- ============================================================================

alter table relatorio_perfis enable row level security;
alter table relatorio_metricas_diarias enable row level security;

drop policy if exists "perfis do próprio usuário" on relatorio_perfis;
create policy "perfis do próprio usuário" on relatorio_perfis
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "métricas dos próprios perfis" on relatorio_metricas_diarias;
create policy "métricas dos próprios perfis" on relatorio_metricas_diarias
  for all
  using (
    exists (
      select 1 from relatorio_perfis p
      where p.id = relatorio_metricas_diarias.perfil_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from relatorio_perfis p
      where p.id = relatorio_metricas_diarias.perfil_id and p.user_id = auth.uid()
    )
  );

drop trigger if exists relatorio_perfis_set_atualizado_em on relatorio_perfis;
create trigger relatorio_perfis_set_atualizado_em
  before update on relatorio_perfis
  for each row execute function set_atualizado_em();

drop trigger if exists relatorio_metricas_set_atualizado_em on relatorio_metricas_diarias;
create trigger relatorio_metricas_set_atualizado_em
  before update on relatorio_metricas_diarias
  for each row execute function set_atualizado_em();
