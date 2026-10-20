-- ============================================================================
-- Porta de ingestão: a coleta diária grava sozinha, sem a chave mestra
-- ============================================================================
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode UMA vez.
--
-- O que ele cria:
--   · a tabela `chaves_de_ingestao` (guarda só o hash do token, nunca o token);
--   · `ingerir_noticias(token, linhas)` e `ingerir_eventos(token, linhas)`,
--     que inserem no seu usuário e não fazem mais nada;
--   · `criar_chave_de_ingestao(rotulo)`, que gera o token.
--
-- Por que não a chave `service_role`: ela ignora a RLS inteira — lê, altera e
-- apaga qualquer tabela do projeto. O token daqui só sabe inserir notícia e
-- evento. Se ele vazar, o estrago é alguém sujar a sua lista de notícias, e
-- um delete resolve.
--
-- DEPOIS de rodar, rode a última linha do arquivo sozinha. Ela mostra o token
-- UMA vez — copie e cole no agendador. O banco guarda só o hash: ninguém,
-- nem você, consegue ver o token de novo. Perdeu? Rode de novo: o token
-- anterior para de valer na hora.
-- ============================================================================

create table if not exists chaves_de_ingestao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Para que serve esta chave. Serve também de identidade: regerar com o mesmo
  -- rótulo troca o token e derruba o antigo, que é como se faz rotação.
  rotulo text not null default 'rotina',

  -- Só o hash. O token em claro existe uma vez, na hora em que é gerado; o
  -- banco nunca consegue mostrá-lo de novo, nem para o dono.
  token_hash text not null unique,

  criado_em timestamptz not null default now(),
  ultimo_uso timestamptz,
  usos integer not null default 0,

  unique (user_id, rotulo)
);

alter table chaves_de_ingestao enable row level security;

drop policy if exists "chaves do próprio usuário" on chaves_de_ingestao;
create policy "chaves do próprio usuário" on chaves_de_ingestao
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists chaves_de_ingestao_user_idx on chaves_de_ingestao (user_id);

-- O Supabase dá SELECT em tudo que está em `public` para `anon` e
-- `authenticated`; a RLS acima já devolve lista vazia, mas o privilégio não
-- precisa existir. O app nunca lê esta tabela — quem lê são as funções abaixo,
-- que rodam como dono. Tirar o grant é a segunda tranca: se um dia alguém
-- criar uma policy permissiva aqui por engano, ainda assim não dá para ler.
revoke all on table chaves_de_ingestao from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gerar a chave
-- ---------------------------------------------------------------------------
-- Roda no SQL Editor do Supabase, onde `auth.uid()` é nulo — por isso o dono é
-- resolvido pelo e-mail, ou pelo único usuário quando só existe um. Devolve o
-- token UMA vez: é para copiar e colar no agendador, não para guardar aqui.

create or replace function criar_chave_de_ingestao(
  rotulo_da_chave text default 'rotina',
  email_do_dono text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid;
  quantos integer;
  token text := gen_random_uuid()::text || gen_random_uuid()::text;
begin
  if email_do_dono is null then
    select count(*) into quantos from auth.users;
    if quantos <> 1 then
      raise exception 'há % usuários; informe o e-mail: select criar_chave_de_ingestao(''rotina'', ''voce@exemplo.com'')', quantos;
    end if;
    select id into dono from auth.users;
  else
    select id into dono from auth.users where lower(email) = lower(email_do_dono);
    if dono is null then raise exception 'nenhum usuário com o e-mail %', email_do_dono; end if;
  end if;

  insert into chaves_de_ingestao (user_id, rotulo, token_hash)
  values (dono, rotulo_da_chave, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id, rotulo) do update
    set token_hash = excluded.token_hash, criado_em = now(), ultimo_uso = null, usos = 0;

  return token;
end;
$$;

-- Só o editor SQL e o dono logado geram chave. O `anon` (a chave pública que
-- está no bundle do app) não pode: senão qualquer visitante faria a sua.
revoke all on function criar_chave_de_ingestao(text, text) from public, anon;
grant execute on function criar_chave_de_ingestao(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Usar a chave
-- ---------------------------------------------------------------------------

create or replace function dono_do_token(token text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select user_id from chaves_de_ingestao
   where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
$$;

revoke all on function dono_do_token(text) from public, anon, authenticated;

-- A coleta precisa saber o que já entrou, senão repete a notícia de ontem com
-- outro link. Devolve só as URLs — nem título, nem texto: o mínimo que serve
-- para não repetir é o máximo que esta porta precisa abrir.
create or replace function urls_de_noticias(token text, dias integer default 30)
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
    select n.url from noticias n
     where n.user_id = dono
       and n.coletado_em >= now() - make_interval(days => greatest(dias, 1));
end;
$$;

grant execute on function urls_de_noticias(text, integer) to anon, authenticated, service_role;

create or replace function ingerir_noticias(token text, linhas jsonb)
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
  -- Mesmo assim, erro genérico — mensagem de erro que explica demais vira pista.
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into noticias (
    user_id, titulo, resumo, por_que_importa, url, fonte, publicado_em, relevancia, tags
  )
  select
    dono,
    item.titulo,
    coalesce(item.resumo, ''),
    coalesce(item.por_que_importa, ''),
    item.url,
    coalesce(item.fonte, ''),
    item.publicado_em,
    coalesce(item.relevancia, 3),
    coalesce(item.tags, '{}')
  from jsonb_to_recordset(linhas) as item(
    titulo text, resumo text, por_que_importa text, url text,
    fonte text, publicado_em date, relevancia smallint, tags text[]
  )
  -- A mesma notícia coletada duas vezes é a mesma notícia: atualiza o texto em
  -- vez de duplicar a linha na lista dele.
  on conflict (user_id, url) do update set
    titulo = excluded.titulo,
    resumo = excluded.resumo,
    por_que_importa = excluded.por_que_importa,
    fonte = excluded.fonte,
    publicado_em = excluded.publicado_em,
    relevancia = excluded.relevancia,
    tags = excluded.tags,
    atualizado_em = now();

  get diagnostics gravadas = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravadas;
end;
$$;

create or replace function ingerir_eventos(token text, linhas jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  gravados integer;
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  insert into eventos (
    user_id, data, data_fim, titulo, categoria, escopo, local,
    por_que_importa, ideia_de_post, fonte_url
  )
  select
    dono, item.data, item.data_fim, item.titulo,
    coalesce(item.categoria, 'comercial'),
    coalesce(item.escopo, 'brasil'),
    item.local,
    coalesce(item.por_que_importa, ''),
    coalesce(item.ideia_de_post, ''),
    item.fonte_url
  from jsonb_to_recordset(linhas) as item(
    data date, data_fim date, titulo text, categoria text, escopo text,
    local text, por_que_importa text, ideia_de_post text, fonte_url text
  )
  on conflict (user_id, data, titulo) do update set
    data_fim = excluded.data_fim,
    categoria = excluded.categoria,
    escopo = excluded.escopo,
    local = excluded.local,
    por_que_importa = excluded.por_que_importa,
    ideia_de_post = excluded.ideia_de_post,
    fonte_url = excluded.fonte_url,
    atualizado_em = now();

  get diagnostics gravados = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return gravados;
end;
$$;

-- É o `anon` quem chama: a rotina não tem login, tem token. A chave `anon` já é
-- pública (está no bundle do app) e sozinha não grava nada — quem autoriza a
-- escrita é o token, dentro da função.
grant execute on function ingerir_noticias(text, jsonb) to anon, authenticated, service_role;
grant execute on function ingerir_eventos(text, jsonb) to anon, authenticated, service_role;

-- ============================================================================
-- AGORA GERE O TOKEN
-- ============================================================================
-- Apague tudo do editor, digite a linha abaixo SEM os dois tracinhos e rode:
--
--     select criar_chave_de_ingestao('rotina de notícias');
--
-- Com os tracinhos ela é comentário e o editor responde "Success. No rows
-- returned" — que é o editor dizendo "não rodei nada".
--
-- O retorno é uma célula com um texto de 72 caracteres: esse é o token. Ele
-- aparece UMA vez; o banco guarda só o hash. Perdeu? Rode de novo — o token
-- anterior para de valer na hora.
