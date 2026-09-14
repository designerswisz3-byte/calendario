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
