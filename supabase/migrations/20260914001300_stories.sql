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
