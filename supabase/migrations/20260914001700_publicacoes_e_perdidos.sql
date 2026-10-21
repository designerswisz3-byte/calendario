-- ============================================================================
-- Duas perguntas que o Relatório não respondia
-- ============================================================================
-- 1) "Quantos seguidores eu PERDI por dia?"
--
--    A coleta trazia só `follower_count`, que a Meta documenta como novos
--    seguidores do dia. Ganho bruto não é crescimento: em outubro de 2026 o
--    perfil ganhou 154 e perdeu 82 em 31 dias — quem só vê o 154 acha que
--    cresceu 154, e quem só vê o total de seguidores parado acha que não
--    aconteceu nada. São duas séries diferentes e as duas decidem conteúdo.
--
--    O dado existe: `follows_and_unfollows` com `breakdown=follow_type`
--    devolve FOLLOWER (seguiu) e NON_FOLLOWER (deixou de seguir) por dia.
--    Conferido contra `follower_count` em 12 dias seguidos: FOLLOWER bate
--    exatamente, dia a dia. E, diferente de `follower_count`, ele responde
--    para muito antes dos últimos 30 dias — é por isso que o histórico pode
--    ser preenchido para trás.
--
-- 2) "Que conteúdo foi postado no dia que eu estou olhando?"
--
--    A tabela diária guardava só a CONTAGEM de publicações. Um pico de
--    alcance no dia 14 não dizia qual post o causou, que é a única leitura
--    que vira decisão de conteúdo. Por isso a publicação em si entra no
--    arquivo, com as métricas dela.
-- ============================================================================

alter table relatorio_metricas_diarias
  add column if not exists seguidores_perdidos integer;

comment on column relatorio_metricas_diarias.seguidores_perdidos is
  'Quantas contas deixaram de seguir NESTE dia (fluxo). Null = dia sem o dado, não zero.';

-- ============================================================================
-- Uma linha por publicação
-- ============================================================================
-- O grão é a publicação, não o dia: um dia com três posts precisa dizer qual
-- dos três puxou o alcance. A agregação por dia continua na tabela diária —
-- aqui ninguém soma nada, só se lê o que saiu e como foi.
--
-- O que NÃO entra, de propósito: `thumbnail_url` e `media_url`. A Meta assina
-- essas URLs com validade de horas (`oe=` no fim). Guardadas, viram imagem
-- quebrada em semanas e o painel passa a parecer defeito. `permalink` é
-- estável e abre o post de verdade.
-- ============================================================================

create table if not exists relatorio_publicacoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references relatorio_perfis (id) on delete cascade,

  -- O id da mídia na Meta. É ele que torna a coleta idempotente: repuxar o
  -- mesmo mês atualiza as métricas da publicação em vez de duplicá-la.
  midia_id text not null,

  publicado_em timestamptz not null,
  /*
   * O dia a que a publicação pertence, em horário de Brasília.
   *
   * Derivado, e não redundante: `publicado_em` é UTC, e um post das 22h de
   * Brasília é 01h do dia seguinte em UTC. Guardar o dia já resolvido é o que
   * faz a publicação cair na MESMA barra do gráfico em que está o alcance
   * daquele dia. Sem isso, todo post da noite — que é quando ele publica —
   * apareceria no dia errado.
   */
  dia date not null,

  -- IMAGE, VIDEO, CAROUSEL_ALBUM.
  tipo text not null default '',
  -- FEED, REELS, STORY: é o que muda a leitura de alcance.
  formato text not null default '',
  legenda text not null default '',
  permalink text not null default '',

  alcance integer,
  views integer,
  likes integer,
  comentarios integer,
  salvamentos integer,
  compartilhamentos integer,
  interacoes integer,

  fonte text not null default 'instagram_api',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (perfil_id, midia_id)
);

create index if not exists relatorio_publicacoes_perfil_dia_idx
  on relatorio_publicacoes (perfil_id, dia desc);

comment on table relatorio_publicacoes is
  'Uma linha por publicação do Instagram, com as métricas dela. Serve ao dia a dia do Relatório.';

alter table relatorio_publicacoes enable row level security;

-- Mesma regra das métricas diárias: o dono é o perfil, não a linha. Dois
-- lugares guardando a mesma propriedade é como nasce a linha órfã.
drop policy if exists "publicações dos próprios perfis" on relatorio_publicacoes;
create policy "publicações dos próprios perfis" on relatorio_publicacoes
  for all
  using (
    exists (
      select 1 from relatorio_perfis p
      where p.id = relatorio_publicacoes.perfil_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from relatorio_perfis p
      where p.id = relatorio_publicacoes.perfil_id and p.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on relatorio_publicacoes to authenticated;

-- ============================================================================
-- A porta estreita, agora com `seguidores_perdidos`
-- ============================================================================

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
    perfil_id, dia, seguidores, seguidores_ganhos, seguidores_perdidos,
    alcance, views, likes, comentarios, salvamentos, compartilhamentos,
    interacoes, cliques_no_link, publicacoes, fonte
  )
  select
    perfil, item.dia, item.seguidores, item.seguidores_ganhos,
    item.seguidores_perdidos, item.alcance, item.views, item.likes,
    item.comentarios, item.salvamentos, item.compartilhamentos,
    item.interacoes, item.cliques_no_link, item.publicacoes, 'instagram_api'
  from jsonb_to_recordset(linhas) as item(
    dia date, seguidores integer, seguidores_ganhos integer,
    seguidores_perdidos integer, alcance integer, views integer, likes integer,
    comentarios integer, salvamentos integer, compartilhamentos integer,
    interacoes integer, cliques_no_link integer, publicacoes integer
  )
  on conflict (perfil_id, dia) do update set
    /*
     * `coalesce(novo, antigo)`, e não `novo` direto.
     *
     * Nulo aqui significa "esta coleta não trouxe este campo", não "o valor é
     * nulo". Sobrescrever com nulo apagaria o salvamento que veio de uma
     * importação manual só porque aquela corrida não pediu salvamento — e a
     * tela leria isso como buraco de cobertura.
     */
    seguidores = coalesce(excluded.seguidores, relatorio_metricas_diarias.seguidores),
    seguidores_ganhos = coalesce(excluded.seguidores_ganhos, relatorio_metricas_diarias.seguidores_ganhos),
    seguidores_perdidos = coalesce(excluded.seguidores_perdidos, relatorio_metricas_diarias.seguidores_perdidos),
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

-- ============================================================================
-- A porta estreita para as publicações
-- ============================================================================
-- Mesmo desenho: o token só sabe inserir, e só nas tabelas do dono dele. Ele
-- NÃO ganha o direito de apagar — uma coleta com defeito pode sujar o
-- arquivo, nunca esvaziá-lo.
-- ============================================================================

create or replace function ingerir_publicacoes(
  token text,
  rede_do_perfil text,
  handle_do_perfil text,
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

  select id into perfil
    from relatorio_perfis
   where user_id = dono
     and rede = rede_do_perfil
     and handle = lower(ltrim(handle_do_perfil, '@'));

  -- Publicação sem perfil não cria perfil: quem cria é `ingerir_metricas`, que
  -- roda antes na mesma corrida. Criar aqui também abriria dois caminhos para
  -- a mesma linha e um deles ficaria sem as métricas diárias.
  if perfil is null then
    raise exception 'perfil @% não existe no Relatório', handle_do_perfil
      using errcode = '23503';
  end if;

  insert into relatorio_publicacoes (
    perfil_id, midia_id, publicado_em, dia, tipo, formato, legenda, permalink,
    alcance, views, likes, comentarios, salvamentos, compartilhamentos,
    interacoes, fonte
  )
  select
    perfil, item.midia_id, item.publicado_em, item.dia,
    coalesce(item.tipo, ''), coalesce(item.formato, ''),
    coalesce(item.legenda, ''), coalesce(item.permalink, ''),
    item.alcance, item.views, item.likes, item.comentarios, item.salvamentos,
    item.compartilhamentos, item.interacoes, 'instagram_api'
  from jsonb_to_recordset(linhas) as item(
    midia_id text, publicado_em timestamptz, dia date, tipo text, formato text,
    legenda text, permalink text, alcance integer, views integer,
    likes integer, comentarios integer, salvamentos integer,
    compartilhamentos integer, interacoes integer
  )
  on conflict (perfil_id, midia_id) do update set
    -- A legenda pode ser editada no Instagram, e as métricas crescem por
    -- semanas depois da publicação: repuxar precisa atualizar, não ignorar.
    publicado_em = excluded.publicado_em,
    dia = excluded.dia,
    tipo = case when excluded.tipo <> '' then excluded.tipo else relatorio_publicacoes.tipo end,
    formato = case when excluded.formato <> '' then excluded.formato else relatorio_publicacoes.formato end,
    legenda = case when excluded.legenda <> '' then excluded.legenda else relatorio_publicacoes.legenda end,
    permalink = case when excluded.permalink <> '' then excluded.permalink else relatorio_publicacoes.permalink end,
    alcance = coalesce(excluded.alcance, relatorio_publicacoes.alcance),
    views = coalesce(excluded.views, relatorio_publicacoes.views),
    likes = coalesce(excluded.likes, relatorio_publicacoes.likes),
    comentarios = coalesce(excluded.comentarios, relatorio_publicacoes.comentarios),
    salvamentos = coalesce(excluded.salvamentos, relatorio_publicacoes.salvamentos),
    compartilhamentos = coalesce(excluded.compartilhamentos, relatorio_publicacoes.compartilhamentos),
    interacoes = coalesce(excluded.interacoes, relatorio_publicacoes.interacoes),
    fonte = 'instagram_api',
    atualizado_em = now();

  get diagnostics gravados = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravados;
end;
$$;

grant execute on function ingerir_publicacoes(text, text, text, jsonb) to anon, authenticated, service_role;

-- Para a coleta saber quais publicações já estão no arquivo e só repuxar
-- métrica do que ainda está novo (as da Meta crescem por semanas).
create or replace function midias_arquivadas(token text, handle_do_perfil text, dias integer default 90)
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
    select pub.midia_id
      from relatorio_publicacoes pub
      join relatorio_perfis p on p.id = pub.perfil_id
     where p.user_id = dono
       and p.handle = lower(ltrim(handle_do_perfil, '@'))
       and pub.dia >= current_date - greatest(dias, 1);
end;
$$;

grant execute on function midias_arquivadas(text, text, integer) to anon, authenticated, service_role;
