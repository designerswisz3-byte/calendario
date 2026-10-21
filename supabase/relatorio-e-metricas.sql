-- ============================================================================
-- O que falta no seu Supabase: a aba Relatório
-- ============================================================================
-- Conferido no seu projeto em 21/10/2026, tabela por tabela:
--
--   notas, calendar_items, tags, content_previews, media_assets, ajustes,
--   canvas_boards, stories_sequencias, eventos, noticias ....... já existem
--   na_gaveta (gaveta de ideias soltas) .......................... já existe
--   chaves_de_ingestao + ingerir_noticias + ingerir_eventos ...... já existem
--
--   relatorio_perfis, relatorio_metricas_diarias ................. FALTAM
--   ingerir_metricas, dias_de_metricas ........................... FALTAM
--
-- Por isso "Could not find the table 'public.relatorio_perfis'": a aba
-- Relatório foi para o ar sem a migração dela.
--
-- Cole este arquivo inteiro no SQL Editor e rode UMA vez. Ele é idempotente:
-- se alguma parte já existir, não duplica nem apaga nada.
--
-- Depois disso você NÃO precisa cadastrar perfil: a coleta diária cria o
-- perfil sozinha na primeira corrida.
-- ============================================================================

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

-- ========================================================================
-- A porta de ingestão das métricas (o que a rotina diária usa para gravar)
-- ========================================================================

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
