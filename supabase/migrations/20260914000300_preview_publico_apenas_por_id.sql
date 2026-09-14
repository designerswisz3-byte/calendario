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
