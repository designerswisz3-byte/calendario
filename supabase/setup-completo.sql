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
--   12. 20260914001200 — Eventos do setor + datas do ano, e a curadoria de notícias.
--   13. 20260914001300 — Stories: o calendário paralelo.
--   14. 20260914001400 — Porta estreita de ingestão: a rotina grava notícias e eventos sem a chave mestra.
--   15. 20260914001500 — A gaveta de ideias soltas: item guardado sem data, em vez de apagado.
--   16. 20260914001600 — A porta estreita também para as métricas do Relatório.
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

-- O Supabase concede isto sozinho para tabelas novas em `public`; declarar
-- explícito torna o arquivo auto-suficiente em qualquer Postgres — e foi o que
-- faltou quando estas tabelas foram recriadas na bancada de testes: a RLS
-- estava certa e a tela dizia "nenhum perfil", porque o privilégio de tabela
-- nem chegava na política.
grant select, insert, update, delete on relatorio_perfis to anon, authenticated;
grant select, insert, update, delete on relatorio_metricas_diarias to anon, authenticated;


-- ==========================================================================
-- 20260914001200_eventos_e_noticias.sql
-- ==========================================================================

-- ============================================================================
-- Eventos do setor + datas do ano, e a curadoria de notícias.
-- ============================================================================
-- As duas tabelas existem pelo mesmo motivo: transformar "o que está
-- acontecendo lá fora" em pauta aqui dentro. Uma olha para FRENTE (o que vai
-- acontecer e merece post), a outra para TRÁS (o que aconteceu e merece
-- leitura). Nenhuma das duas é mural: as duas terminam num botão que vira
-- item do calendário.
-- ============================================================================

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  data date not null,
  -- Feira dura três dias; feriado dura um. `data_fim` nulo = evento de um dia.
  data_fim date,

  titulo text not null check (titulo <> ''),
  categoria text not null default 'comercial'
    check (categoria in ('comercial', 'setorial', 'feriado', 'sazonal')),
  escopo text not null default 'brasil'
    check (escopo in ('brasil', 'global', 'eua', 'europa', 'china')),
  local text,

  -- O par que separa este calendário de um calendário de feriados qualquer.
  por_que_importa text not null default '',
  ideia_de_post text not null default '',

  fonte_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  check (data_fim is null or data_fim >= data),
  -- Torna a importação do catálogo idempotente: reimportar atualiza o texto
  -- em vez de duplicar a data na grade.
  unique (user_id, data, titulo)
);

create index if not exists eventos_user_id_data_idx on eventos (user_id, data);

comment on column eventos.por_que_importa is
  'O que esta data muda na operação de quem vende moda. Não é descrição da data.';
comment on column eventos.ideia_de_post is
  'Ângulo de conteúdo pronto para virar briefing: promessa, problema, solução.';

create table if not exists noticias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  titulo text not null check (titulo <> ''),
  resumo text not null default '',
  -- O que a notícia muda para quem vende moda. É este campo que justifica a
  -- notícia estar na lista; sem ele, é recorte de jornal.
  por_que_importa text not null default '',

  url text not null,
  fonte text not null default '',
  publicado_em date,
  coletado_em timestamptz not null default now(),

  -- 1 = ruído, 5 = muda decisão esta semana. A curadoria é o produto.
  relevancia smallint not null default 3 check (relevancia between 1 and 5),
  tags text[] not null default '{}',

  lida boolean not null default false,
  -- Marcada quando vira item do calendário: fecha o laço notícia -> conteúdo.
  virou_pauta boolean not null default false,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- A mesma notícia coletada duas vezes é a mesma notícia.
  unique (user_id, url)
);

create index if not exists noticias_user_id_ordem_idx
  on noticias (user_id, publicado_em desc nulls last, relevancia desc);

-- ============================================================================
-- RLS — o padrão do projeto: o dono é quem vê.
-- ============================================================================

alter table eventos enable row level security;
alter table noticias enable row level security;

drop policy if exists "eventos do próprio usuário" on eventos;
create policy "eventos do próprio usuário" on eventos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notícias do próprio usuário" on noticias;
create policy "notícias do próprio usuário" on noticias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists eventos_set_atualizado_em on eventos;
create trigger eventos_set_atualizado_em
  before update on eventos
  for each row execute function set_atualizado_em();

drop trigger if exists noticias_set_atualizado_em on noticias;
create trigger noticias_set_atualizado_em
  before update on noticias
  for each row execute function set_atualizado_em();


-- ==========================================================================
-- 20260914001300_stories.sql
-- ==========================================================================

-- ============================================================================
-- Stories: o calendário paralelo.
-- ============================================================================
-- Por que uma tabela separada de `calendar_items`, e não mais um `tipo`:
--
-- Story e post são produtos diferentes. O post tem legenda, mídia, link de
-- aprovação e um expert; o story tem uma SEQUÊNCIA — sete blocos de texto com
-- ordem, gatilho e direção de câmera — e vive 24 horas. Forçar os dois na
-- mesma linha significaria metade das colunas sempre nula e uma tela cheia de
-- `if` perguntando "mas é story?". São duas grades porque são dois ofícios.
--
-- A sequência vai em `jsonb`, e não numa tabela de stories filhos, porque ela
-- é editada como DOCUMENTO: a pessoa reordena, apaga o story 3, reescreve o 5
-- e salva o conjunto. Normalizar isso trocaria um UPDATE por um diff de
-- linhas, sem ganhar nenhuma consulta que a tela precise fazer.
-- ============================================================================

create table if not exists stories_sequencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- O dia em que a sequência vai ao ar.
  data date not null,
  titulo text not null default '',

  -- De onde a sequência nasceu. Nulos quando foi escrita do zero.
  tema_id text,
  arco_id text,

  /*
   * [{ ordem, rotulo, gatilho, direcao_visual, texto, pede_interacao }]
   * Gerada pelo motor em src/lib/stories, e editável depois — o que está aqui
   * é sempre a versão da pessoa, não a do gerador.
   */
  stories jsonb not null default '[]',

  -- Imagem de apoio no bucket privado, e o que ela mostra. A descrição é o
  -- que liga a foto ao texto: é ela que o gerador usa como objeto concreto.
  imagem_caminho text,
  imagem_descricao text not null default '',

  observacao text not null default '',
  publicado boolean not null default false,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists stories_sequencias_user_id_data_idx
  on stories_sequencias (user_id, data desc);

comment on column stories_sequencias.stories is
  'A sequência como documento: um objeto por story, na ordem de publicação.';
comment on column stories_sequencias.imagem_descricao is
  'O que a imagem mostra, em poucas palavras. Vira o objeto concreto da sequência.';

alter table stories_sequencias enable row level security;

drop policy if exists "sequências do próprio usuário" on stories_sequencias;
create policy "sequências do próprio usuário" on stories_sequencias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists stories_sequencias_set_atualizado_em on stories_sequencias;
create trigger stories_sequencias_set_atualizado_em
  before update on stories_sequencias
  for each row execute function set_atualizado_em();


-- ==========================================================================
-- 20260914001400_ingestao.sql
-- ==========================================================================

-- Porta estreita de ingestão: a rotina grava notícias e eventos sem a chave mestra.
--
-- O problema que isto resolve
-- ---------------------------------------------------------------------------
-- A coleta diária roda numa sessão agendada, fora do navegador. Para gravar em
-- `noticias` ela precisa de credencial — e a RLS destas tabelas é `auth.uid() =
-- user_id`, que só existe para quem está logado no app. A saída óbvia era a
-- `service_role`, e ela é o oposto de estreita: ignora a RLS inteira, lê e
-- apaga qualquer tabela, e quem a tem é dono do banco.
--
-- Aqui a rotina recebe um token que só sabe fazer uma coisa: inserir linha em
-- `noticias` e em `eventos`, do dono daquele token. Não lê nada, não apaga
-- nada, não enxerga outra tabela. Se vazar, o estrago é alguém sujar a lista de
-- notícias dele — recuperável com um delete. É a diferença entre perder a
-- chave do depósito e perder a chave do cofre.

create table if not exists chaves_de_ingestao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Para que serve esta chave. Serve também de identidade: regerar com o mesmo
  -- rótulo troca o token e derruba o antigo, que é como se faz rotação.
  rotulo text not null default 'rotina',

  -- Só o hash. O token em claro existe uma vez, na hora em que é gerado; o
  -- banco nunca consegue mostrá-lo de novo, nem para o dono.
  token_hash text not null unique,

  criado_em timestamptz not null default now(),
  ultimo_uso timestamptz,
  usos integer not null default 0,

  unique (user_id, rotulo)
);

alter table chaves_de_ingestao enable row level security;

drop policy if exists "chaves do próprio usuário" on chaves_de_ingestao;
create policy "chaves do próprio usuário" on chaves_de_ingestao
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists chaves_de_ingestao_user_idx on chaves_de_ingestao (user_id);

-- O Supabase dá SELECT em tudo que está em `public` para `anon` e
-- `authenticated`; a RLS acima já devolve lista vazia, mas o privilégio não
-- precisa existir. O app nunca lê esta tabela — quem lê são as funções abaixo,
-- que rodam como dono. Tirar o grant é a segunda tranca: se um dia alguém
-- criar uma policy permissiva aqui por engano, ainda assim não dá para ler.
revoke all on table chaves_de_ingestao from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gerar a chave
-- ---------------------------------------------------------------------------
-- Roda no SQL Editor do Supabase, onde `auth.uid()` é nulo — por isso o dono é
-- resolvido pelo e-mail, ou pelo único usuário quando só existe um. Devolve o
-- token UMA vez: é para copiar e colar no agendador, não para guardar aqui.

create or replace function criar_chave_de_ingestao(
  rotulo_da_chave text default 'rotina',
  email_do_dono text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid;
  quantos integer;
  token text := gen_random_uuid()::text || gen_random_uuid()::text;
begin
  if email_do_dono is null then
    select count(*) into quantos from auth.users;
    if quantos <> 1 then
      raise exception 'há % usuários; informe o e-mail: select criar_chave_de_ingestao(''rotina'', ''voce@exemplo.com'')', quantos;
    end if;
    select id into dono from auth.users;
  else
    select id into dono from auth.users where lower(email) = lower(email_do_dono);
    if dono is null then raise exception 'nenhum usuário com o e-mail %', email_do_dono; end if;
  end if;

  insert into chaves_de_ingestao (user_id, rotulo, token_hash)
  values (dono, rotulo_da_chave, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id, rotulo) do update
    set token_hash = excluded.token_hash, criado_em = now(), ultimo_uso = null, usos = 0;

  return token;
end;
$$;

-- Só o editor SQL e o dono logado geram chave. O `anon` (a chave pública que
-- está no bundle do app) não pode: senão qualquer visitante faria a sua.
revoke all on function criar_chave_de_ingestao(text, text) from public, anon;
grant execute on function criar_chave_de_ingestao(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Usar a chave
-- ---------------------------------------------------------------------------

create or replace function dono_do_token(token text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select user_id from chaves_de_ingestao
   where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
$$;

revoke all on function dono_do_token(text) from public, anon, authenticated;

-- A coleta precisa saber o que já entrou, senão repete a notícia de ontem com
-- outro link. Devolve só as URLs — nem título, nem texto: o mínimo que serve
-- para não repetir é o máximo que esta porta precisa abrir.
create or replace function urls_de_noticias(token text, dias integer default 30)
returns setof text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare dono uuid := dono_do_token(token);
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;
  return query
    select n.url from noticias n
     where n.user_id = dono
       and n.coletado_em >= now() - make_interval(days => greatest(dias, 1));
end;
$$;

grant execute on function urls_de_noticias(text, integer) to anon, authenticated, service_role;

create or replace function ingerir_noticias(token text, linhas jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  gravadas integer;
begin
  -- Token de 72 caracteres aleatórios: adivinhar por HTTP não é um caminho.
  -- Mesmo assim, erro genérico — mensagem de erro que explica demais vira pista.
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into noticias (
    user_id, titulo, resumo, por_que_importa, url, fonte, publicado_em, relevancia, tags
  )
  select
    dono,
    item.titulo,
    coalesce(item.resumo, ''),
    coalesce(item.por_que_importa, ''),
    item.url,
    coalesce(item.fonte, ''),
    item.publicado_em,
    coalesce(item.relevancia, 3),
    coalesce(item.tags, '{}')
  from jsonb_to_recordset(linhas) as item(
    titulo text, resumo text, por_que_importa text, url text,
    fonte text, publicado_em date, relevancia smallint, tags text[]
  )
  -- A mesma notícia coletada duas vezes é a mesma notícia: atualiza o texto em
  -- vez de duplicar a linha na lista dele.
  on conflict (user_id, url) do update set
    titulo = excluded.titulo,
    resumo = excluded.resumo,
    por_que_importa = excluded.por_que_importa,
    fonte = excluded.fonte,
    publicado_em = excluded.publicado_em,
    relevancia = excluded.relevancia,
    tags = excluded.tags,
    atualizado_em = now();

  get diagnostics gravadas = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravadas;
end;
$$;

create or replace function ingerir_eventos(token text, linhas jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  gravados integer;
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into eventos (
    user_id, data, data_fim, titulo, categoria, escopo, local,
    por_que_importa, ideia_de_post, fonte_url
  )
  select
    dono, item.data, item.data_fim, item.titulo,
    coalesce(item.categoria, 'comercial'),
    coalesce(item.escopo, 'brasil'),
    item.local,
    coalesce(item.por_que_importa, ''),
    coalesce(item.ideia_de_post, ''),
    item.fonte_url
  from jsonb_to_recordset(linhas) as item(
    data date, data_fim date, titulo text, categoria text, escopo text,
    local text, por_que_importa text, ideia_de_post text, fonte_url text
  )
  on conflict (user_id, data, titulo) do update set
    data_fim = excluded.data_fim,
    categoria = excluded.categoria,
    escopo = excluded.escopo,
    local = excluded.local,
    por_que_importa = excluded.por_que_importa,
    ideia_de_post = excluded.ideia_de_post,
    fonte_url = excluded.fonte_url,
    atualizado_em = now();

  get diagnostics gravados = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravados;
end;
$$;

-- É o `anon` quem chama: a rotina não tem login, tem token. A chave `anon` já é
-- pública (está no bundle do app) e sozinha não grava nada — quem autoriza a
-- escrita é o token, dentro da função.
grant execute on function ingerir_noticias(text, jsonb) to anon, authenticated, service_role;
grant execute on function ingerir_eventos(text, jsonb) to anon, authenticated, service_role;


-- ==========================================================================
-- 20260914001500_gaveta.sql
-- ==========================================================================

-- A gaveta de ideias soltas: item guardado sem data, em vez de apagado.
--
-- O caso real: ele cria o item no calendário, a ideia não entra naquele dia e
-- hoje a única saída é apagar ou deixar a data passar com um item morto na
-- grade. As duas são ruins — a primeira perde a ideia, a segunda suja o mês e
-- estraga a contagem de progresso.
--
-- Por que uma coluna e não uma tabela nova: a ideia guardada continua sendo o
-- MESMO item. Ela mantém briefing, roteiro, etiquetas, tipo e o conteúdo já
-- criado. Mover para outra tabela significaria copiar tudo isso e recriar os
-- vínculos na volta — e a volta é o caminho que mais importa aqui.
--
-- Por que `data` continua obrigatória: ela vira a memória de quando a ideia foi
-- pensada, e é a data que a tela mostra ("guardada em 14/11"). Tornar a coluna
-- anulável custaria um `if` em cada lugar que desenha a grade, para ganhar
-- nada.

alter table calendar_items
  add column if not exists na_gaveta boolean not null default false;

alter table stories_sequencias
  add column if not exists na_gaveta boolean not null default false;

-- Índice parcial: a gaveta é lida inteira a cada abertura da aba, e ela é uma
-- fração pequena da tabela. Indexar só as linhas guardadas mantém o índice do
-- tamanho da gaveta, não do calendário.
create index if not exists calendar_items_gaveta_idx
  on calendar_items (user_id, atualizado_em desc) where na_gaveta;

create index if not exists stories_sequencias_gaveta_idx
  on stories_sequencias (user_id, atualizado_em desc) where na_gaveta;


-- ==========================================================================
-- 20260914001600_ingerir_metricas.sql
-- ==========================================================================

-- A porta estreita também para as métricas do Relatório.
--
-- Mesmo desenho de `ingerir_noticias`: o token só sabe inserir, e só nestas
-- duas tabelas, do dono dele. Aqui ele ganha uma capacidade a mais — criar o
-- perfil quando ele ainda não existe —, porque o contrário seria pedir que
-- alguém cadastrasse o perfil à mão antes da primeira coleta funcionar, e o
-- ponto da coleta é não depender de ninguém de manhã.

create or replace function ingerir_metricas(
  token text,
  rede_do_perfil text,
  handle_do_perfil text,
  nome_do_perfil text,
  linhas jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  perfil uuid;
  gravados integer;
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into relatorio_perfis (user_id, rede, handle, nome, fonte)
  values (dono, rede_do_perfil, lower(ltrim(handle_do_perfil, '@')), coalesce(nome_do_perfil, ''), 'instagram_api')
  on conflict (user_id, rede, handle) do update
    set nome = case when excluded.nome <> '' then excluded.nome else relatorio_perfis.nome end,
        atualizado_em = now()
  returning id into perfil;

  insert into relatorio_metricas_diarias (
    perfil_id, dia, seguidores, seguidores_ganhos, alcance, views, likes,
    comentarios, salvamentos, compartilhamentos, interacoes, cliques_no_link,
    publicacoes, fonte
  )
  select
    perfil, item.dia, item.seguidores, item.seguidores_ganhos, item.alcance,
    item.views, item.likes, item.comentarios, item.salvamentos,
    item.compartilhamentos, item.interacoes, item.cliques_no_link,
    item.publicacoes, 'instagram_api'
  from jsonb_to_recordset(linhas) as item(
    dia date, seguidores integer, seguidores_ganhos integer, alcance integer,
    views integer, likes integer, comentarios integer, salvamentos integer,
    compartilhamentos integer, interacoes integer, cliques_no_link integer,
    publicacoes integer
  )
  on conflict (perfil_id, dia) do update set
    /*
     * `coalesce(novo, antigo)`, e não `novo` direto.
     *
     * Nulo aqui significa "esta coleta não trouxe este campo", não "o valor é
     * nulo". Sobrescrever com nulo apagaria o salvamento que veio de uma
     * importação manual só porque a API de conta não entrega salvamento por
     * dia — e a tela leria isso como buraco de cobertura.
     */
    seguidores = coalesce(excluded.seguidores, relatorio_metricas_diarias.seguidores),
    seguidores_ganhos = coalesce(excluded.seguidores_ganhos, relatorio_metricas_diarias.seguidores_ganhos),
    alcance = coalesce(excluded.alcance, relatorio_metricas_diarias.alcance),
    views = coalesce(excluded.views, relatorio_metricas_diarias.views),
    likes = coalesce(excluded.likes, relatorio_metricas_diarias.likes),
    comentarios = coalesce(excluded.comentarios, relatorio_metricas_diarias.comentarios),
    salvamentos = coalesce(excluded.salvamentos, relatorio_metricas_diarias.salvamentos),
    compartilhamentos = coalesce(excluded.compartilhamentos, relatorio_metricas_diarias.compartilhamentos),
    interacoes = coalesce(excluded.interacoes, relatorio_metricas_diarias.interacoes),
    cliques_no_link = coalesce(excluded.cliques_no_link, relatorio_metricas_diarias.cliques_no_link),
    publicacoes = coalesce(excluded.publicacoes, relatorio_metricas_diarias.publicacoes),
    fonte = 'instagram_api',
    atualizado_em = now();

  get diagnostics gravados = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravados;
end;
$$;

grant execute on function ingerir_metricas(text, text, text, text, jsonb) to anon, authenticated, service_role;

-- Para a coleta saber o que já tem e pedir só o que falta.
create or replace function dias_de_metricas(token text, handle_do_perfil text, dias integer default 30)
returns setof date
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare dono uuid := dono_do_token(token);
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;
  return query
    select m.dia
      from relatorio_metricas_diarias m
      join relatorio_perfis p on p.id = m.perfil_id
     where p.user_id = dono
       and p.handle = lower(ltrim(handle_do_perfil, '@'))
       and m.dia >= current_date - greatest(dias, 1);
end;
$$;

grant execute on function dias_de_metricas(text, text, integer) to anon, authenticated, service_role;
