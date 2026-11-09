-- ============================================================================
-- Atualização de novembro/2026 — cole TUDO no SQL Editor do Supabase e rode
-- ============================================================================
-- Três coisas, nesta ordem:
--
--   1. o bucket `canvas` passa a aceitar documento (PDF, Word, Excel…) com
--      teto de 25 MB  → é o que faz "anexar PDF" funcionar na aba Notas;
--   2. a tabela `stories_referencias`                → o banco de Referências
--      na aba Stories;
--   3. a coluna `origem` em stories_sequencias, mais as funções
--      `assuntos_de_stories` e `ingerir_sequencias`  → a rotina diária que
--      escreve as sequências com o dado real da operação.
--
-- PODE RODAR MAIS DE UMA VEZ. Nada aqui apaga dado nem duplica linha: tudo é
-- "crie se não existir" ou "substitua". Rodado duas vezes seguidas num banco
-- que já tinha tudo, sai sem um erro.
--
-- Se der erro, LEIA A MENSAGEM: a trava logo abaixo diz, em português, o que
-- está faltando e qual arquivo rodar antes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trava de pré-requisito
-- ---------------------------------------------------------------------------
-- Este arquivo é um PEDAÇO do banco, não o banco inteiro. Ele assume que o
-- resto já está lá. Sem esta trava, um banco incompleto daria um erro de
-- Postgres cru ("relation does not exist") no meio de 300 linhas, e não haveria
-- como saber se o problema era a atualização ou a base.
do $$
declare
  -- `::text` em cada item não é decoração: sem o cast, o Postgres tenta ler a
  -- string como LITERAL DE ARRAY e estoura com "malformed array literal" —
  -- justamente o erro cru que esta trava existe para evitar.
  faltando text[] := '{}';
begin
  if to_regclass('public.notas') is null then
    faltando := faltando || 'tabela notas'::text;
  end if;
  if to_regclass('public.stories_sequencias') is null then
    faltando := faltando || 'tabela stories_sequencias'::text;
  end if;
  if to_regclass('public.chaves_de_ingestao') is null then
    faltando := faltando || 'tabela chaves_de_ingestao (porta de ingestão)'::text;
  end if;
  if not exists (select 1 from pg_proc where proname = 'dono_do_token') then
    faltando := faltando || 'função dono_do_token (porta de ingestão)'::text;
  end if;
  if not exists (select 1 from pg_proc where proname = 'set_atualizado_em') then
    faltando := faltando || 'função set_atualizado_em'::text;
  end if;

  if array_length(faltando, 1) > 0 then
    raise exception E'Falta parte da base antes desta atualização: %.\n\nRode supabase/setup-completo.sql (o arquivo inteiro) em vez deste. Ele cria tudo do zero e também pode ser rodado em cima do que já existe.',
      array_to_string(faltando, ', ');
  end if;

  raise notice 'Pré-requisitos ok. Aplicando a atualização.';
end
$$;



-- ============================================================================
-- Notas aceitam documento, não só imagem
-- ============================================================================
-- O bucket `canvas` nasceu para as imagens do quadro e herdou as notas. A
-- lista de tipos permitidos ficou só com imagem, e o teto, em 10 MB.
--
-- Isso é uma trava do lado do SERVIDOR: por mais que o app ofereça o botão de
-- anexar PDF, o Storage recusa o upload com "mime type not supported" e a
-- pessoa vê um erro que não explica nada. Por isso esta migração vem junto com
-- a tela, e não depois dela.
--
-- O que muda:
--   · entram os tipos de documento que aparecem no dia a dia dele — PDF em
--     primeiro lugar, mais planilha, apresentação, texto e CSV;
--   · o teto sobe de 10 MB para 25 MB.
--
-- O que NÃO muda: o bucket continua privado, e as políticas continuam sendo as
-- mesmas quatro, que olham o primeiro segmento do caminho (`<user_id>/...`).
-- Documento entra pela mesma porta da imagem e fica igualmente inacessível
-- sem URL assinada.
-- ============================================================================

-- Por que 25 MB: os PDFs de material e apostila que ele costuma guardar vão a
-- 15 MB sem esforço. 10 MB recusaria metade deles; um teto muito maior
-- convidaria a usar a nota como disco, e o bucket é o mesmo das imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas',
  'canvas',
  false,
  26214400, -- 25 MB por arquivo
  array[
    -- imagens: o que já valia, sem tirar nada
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
    -- documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/zip',
    'application/json',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

comment on column notas.conteudo is
  'HTML do editor. Imagens aparecem como src="anexo:<caminho no bucket canvas>"; '
  'documentos, como <div data-documento data-anexo="<caminho>">. O documento '
  'guarda só o caminho — a URL assinada é pedida na hora de abrir ou baixar, '
  'nunca gravada, porque ela expira em uma hora e o HTML fica para sempre.';


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


-- ============================================================================
-- A rotina diária grava sequências de stories, pela mesma porta estreita
-- ============================================================================
-- O gerador combinatório do app monta sequências a partir de frases escritas à
-- mão. Isso tem um teto: por mais arcos e variantes que existam, a saída é
-- sempre uma combinação de texto pré-escrito, com os campos do tema
-- substituídos dentro. Variedade de estrutura não vira adaptação ao assunto, e
-- o rascunho sai sem número nenhum da operação de verdade.
--
-- Esta migração abre a porta para o outro caminho: uma rotina diária lê o dado
-- real (ruptura, giro, margem, o que o perfil publicou e como rendeu), escreve
-- as sequências do dia com esse dado dentro e grava aqui como rascunho.
--
-- O que ela cria:
--   · a coluna `origem` em stories_sequencias, para a tela saber o que veio da
--     rotina e o que foi escrito por ele;
--   · `assuntos_de_stories(token, dias)`, que a rotina lê ANTES de escrever
--     para não repetir o ângulo da semana passada;
--   · `ingerir_sequencias(token, linhas)`, que grava.
--
-- Por que não a chave `service_role`: ela ignora a RLS inteira — lê, altera e
-- apaga qualquer tabela do projeto. O token daqui só sabe listar assunto de
-- story e inserir rascunho de story. Se vazar, o estrago é alguém sujar a
-- grade de stories, e um delete resolve.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- De onde veio a sequência
-- ---------------------------------------------------------------------------
-- `manual` cobre tanto o que ele escreveu do zero quanto o que o gerador do
-- app montou — do ponto de vista da tela são a mesma coisa: ele estava ali,
-- viu e aceitou. `rotina` é o que apareceu sozinho enquanto ele dormia, e isso
-- precisa ficar visível: rascunho que aparece sem aviso e parece escrito por
-- ele é o jeito mais rápido de gravar uma frase que não é sua.
alter table stories_sequencias
  add column if not exists origem text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stories_sequencias_origem_valida'
  ) then
    alter table stories_sequencias
      add constraint stories_sequencias_origem_valida
      check (origem in ('manual', 'rotina'));
  end if;
end
$$;

-- A rotina roda todo dia e pode rodar duas vezes no mesmo dia (reexecução
-- manual, retentativa do agendador). Sem esta chave, o dia 12 acumularia três
-- cópias da mesma sugestão. Com ela, a segunda corrida ATUALIZA a primeira.
--
-- Vale só para `rotina`: ele pode ter quantas sequências quiser no mesmo dia
-- com o mesmo assunto, e não cabe ao banco opinar sobre isso.
create unique index if not exists stories_sequencias_rotina_unica
  on stories_sequencias (user_id, data, titulo)
  where origem = 'rotina';

-- ---------------------------------------------------------------------------
-- O que já foi dito — a rotina lê isto ANTES de escrever
-- ---------------------------------------------------------------------------
-- É a memória da aba. Sem ela a rotina reescreve o mesmo ângulo toda semana,
-- porque todo dia ela começa do zero e o assunto mais óbvio do nicho é sempre
-- o mesmo. Devolve o que ele publicou e também o que ficou em rascunho: ângulo
-- sugerido e recusado também não deve voltar na semana seguinte.
create or replace function assuntos_de_stories(token text, dias integer default 30)
returns table (
  data date,
  titulo text,
  tema_id text,
  arco_id text,
  origem text,
  publicado boolean,
  -- A primeira linha de cada story, que é onde mora o ângulo. A sequência
  -- inteira seria texto demais para a rotina ler todo dia, e o ângulo cabe
  -- na abertura.
  aberturas text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  return query
  select
    s.data,
    s.titulo,
    s.tema_id,
    s.arco_id,
    s.origem,
    s.publicado,
    (
      select array_agg(split_part(trim(item ->> 'texto'), E'\n', 1) order by (item ->> 'ordem')::int)
      from jsonb_array_elements(s.stories) as item
    )
  from stories_sequencias s
  where s.user_id = dono
    and s.data >= current_date - make_interval(days => greatest(dias, 1))
  order by s.data desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gravar as sequências do dia
-- ---------------------------------------------------------------------------
-- Entra sempre como rascunho não publicado e fora da gaveta: a sequência tem
-- de aparecer no dia dela, para ele abrir, ler e decidir. O que vai ao ar é o
-- que ele aprovar — a rotina sugere, não publica.
create or replace function ingerir_sequencias(token text, linhas jsonb)
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
  -- Mesmo assim, erro genérico — mensagem que explica demais vira pista.
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into stories_sequencias (
    user_id, data, titulo, tema_id, arco_id, stories, observacao, origem
  )
  select
    dono,
    item.data,
    item.titulo,
    item.tema_id,
    item.arco_id,
    coalesce(item.stories, '[]'::jsonb),
    coalesce(item.observacao, ''),
    'rotina'
  from jsonb_to_recordset(linhas) as item(
    data date, titulo text, tema_id text, arco_id text,
    stories jsonb, observacao text
  )
  -- Rodou duas vezes no mesmo dia com o mesmo assunto: é a mesma sugestão,
  -- reescrita. Atualiza em vez de empilhar.
  on conflict (user_id, data, titulo) where origem = 'rotina' do update set
    tema_id = excluded.tema_id,
    arco_id = excluded.arco_id,
    stories = excluded.stories,
    observacao = excluded.observacao,
    atualizado_em = now();

  get diagnostics gravadas = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravadas;
end;
$$;

-- As duas rodam como dono e conferem o token por conta própria. É por isso que
-- `anon` pode chamá-las: a porta é a função, não a tabela.
grant execute on function assuntos_de_stories(text, integer) to anon, authenticated;
grant execute on function ingerir_sequencias(text, jsonb) to anon, authenticated;


-- ============================================================================
-- Conferência: rode junto e leia a saída
-- ============================================================================
select
  (select count(*) from information_schema.tables
    where table_name = 'stories_referencias')                      as "tabela de referências (1 = ok)",
  (select count(*) from information_schema.columns
    where table_name = 'stories_sequencias' and column_name = 'origem') as "coluna origem (1 = ok)",
  (select count(*) from pg_proc where proname = 'ingerir_sequencias')   as "ingerir_sequencias (1 = ok)",
  (select count(*) from pg_proc where proname = 'assuntos_de_stories')  as "assuntos_de_stories (1 = ok)",
  (select 'application/pdf' = any(allowed_mime_types)
     from storage.buckets where id = 'canvas')                     as "bucket aceita PDF",
  (select file_size_limit / 1024 / 1024 || ' MB'
     from storage.buckets where id = 'canvas')                     as "teto por arquivo";
