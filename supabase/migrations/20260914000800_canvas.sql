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
