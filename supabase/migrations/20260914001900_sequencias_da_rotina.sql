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
