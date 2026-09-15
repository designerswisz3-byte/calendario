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
