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
