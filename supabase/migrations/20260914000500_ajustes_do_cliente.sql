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
