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
