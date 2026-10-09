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
