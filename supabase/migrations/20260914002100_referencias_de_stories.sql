-- ============================================================================
-- Banco de referências visuais da aba Stories
-- ============================================================================
-- A gaveta de ideias soltas guarda SEQUÊNCIA — texto, tema, arco. Não havia
-- onde guardar o outro insumo de quem grava story: a imagem que ele viu e quer
-- imitar. Print de um story alheio, foto de uma arara, uma tela de relatório,
-- um enquadramento que funcionou.
--
-- Hoje isso mora no rolo da câmera e some: a imagem que explicaria a sequência
-- de quinta-feira está a três mil fotos de distância na quinta-feira.
--
-- A referência é só imagem e uma linha de legenda, de propósito. Ela não tem
-- data e não entra na grade — não é conteúdo planejado, é insumo. Por isso
-- também não tem `na_gaveta`: o banco inteiro É a gaveta.
-- ============================================================================

create table if not exists stories_referencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Caminho no bucket `canvas`, nunca uma URL: o bucket é privado e a URL
  -- assinada expira em uma hora, enquanto a linha fica guardada para sempre.
  caminho text not null,

  /*
   * O que a imagem mostra, em uma linha.
   *
   * Não é enfeite: é o campo que o gerador de sequências lê como objeto
   * concreto do tema. O app roda no navegador e não tem como LER a imagem, e
   * fingir que lê exigiria uma chave de modelo de visão dentro do bundle — que
   * é chave pública. A linha escrita à mão é o que falta, e são cinco palavras.
   */
  legenda text not null default '',

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- O banco abre pela mais recente: referência nova é a que acabou de ser vista,
-- e é a que a pessoa está procurando quando abre a aba.
create index if not exists stories_referencias_user_criado_idx
  on stories_referencias (user_id, criado_em desc);

-- A mesma imagem não entra duas vezes. Colar o mesmo print de novo é o gesto
-- mais provável de todos — e o caminho é um UUID por upload, então a trava
-- real está no app; esta aqui pega o caso de reenvio da mesma linha.
create unique index if not exists stories_referencias_caminho_unico
  on stories_referencias (user_id, caminho);

drop trigger if exists stories_referencias_set_atualizado_em on stories_referencias;
create trigger stories_referencias_set_atualizado_em
  before update on stories_referencias
  for each row execute function set_atualizado_em();

alter table stories_referencias enable row level security;

drop policy if exists "stories_referencias_select_own" on stories_referencias;
create policy "stories_referencias_select_own" on stories_referencias
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "stories_referencias_insert_own" on stories_referencias;
create policy "stories_referencias_insert_own" on stories_referencias
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "stories_referencias_update_own" on stories_referencias;
create policy "stories_referencias_update_own" on stories_referencias
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "stories_referencias_delete_own" on stories_referencias;
create policy "stories_referencias_delete_own" on stories_referencias
  for delete to authenticated using (auth.uid() = user_id);

-- O arquivo em si vai para o bucket `canvas`, na pasta `<user_id>/stories/`,
-- que já é onde a imagem de apoio das sequências mora. Nada de bucket novo:
-- as políticas de lá olham o primeiro segmento do caminho e já servem.
comment on table stories_referencias is
  'Referências visuais da aba Stories: print, foto ou tela que inspira uma '
  'sequência. O arquivo fica no bucket canvas em <user_id>/stories/.';
