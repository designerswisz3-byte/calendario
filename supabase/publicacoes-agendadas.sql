-- ============================================================================
-- Rode UMA vez no SQL Editor do Supabase. É idempotente, não apaga nada.
-- ============================================================================
-- Libera o botão "Programar publicação no Instagram", na aba Criar Conteúdo.
--
-- O que ele cria:
--   publicacoes_agendadas ......... a fila de posts com dia e hora
--   publicacoes_para_publicar() ... a rotina pega o que venceu (trava atômica)
--   concluir_publicacao() ......... registra o desfecho e o permalink
--   expirar_publicacoes() ......... fecha o que perdeu a janela
--
-- Por que uma tabela e não um campo no calendário: a API do Instagram NÃO
-- agenda — ela monta e publica, as duas imediatas. O horário é guardado aqui, e
-- uma rotina acorda e publica. Sem a fila não existe "programar".
-- ============================================================================

-- ============================================================================
-- Programar uma publicação para ir ao ar no Instagram
-- ============================================================================
-- A API do Instagram NÃO agenda. Ela tem duas chamadas — montar o container e
-- publicar — e as duas são imediatas; não existe `scheduled_publish_time` no
-- corpo do pedido. Então o agendamento é NOSSO: esta tabela é a fila, e uma
-- rotina acorda de tempos em tempos, pega o que venceu e publica.
--
-- Três decisões que sustentam a tabela:
--
-- 1) A LINHA É UMA CÓPIA, não um ponteiro. Legenda e mídias são gravadas aqui
--    no momento do agendamento, e não lidas do preview na hora de publicar.
--    Assim o que vai ao ar é exatamente o que ele viu e aprovou — editar o
--    conteúdo depois não muda, sem aviso, um post que já está na fila. A tela
--    avisa quando o preview mudou e oferece reagendar.
--
-- 2) `status` É O CADEADO contra post duplicado. A ferramenta avisa, com estas
--    palavras, que publicar "makes exactly one POST and never retries": não há
--    repetição automática, mas também não há proteção contra chamar duas
--    vezes. Duas corridas sobrepostas publicariam o mesmo carrossel duas vezes
--    no perfil dele. Por isso quem pega a linha faz `agendada -> publicando`
--    numa única sentença atômica: a segunda corrida não encontra mais nada.
--
-- 3) HÁ JANELA DE ATRASO. Post que perdeu a hora não vira post de madrugada, e
--    story atrasado é pior que story nenhum — ele expira em 24 h. Passada a
--    janela, a linha vira `falhou` com o motivo, em vez de ir ao ar fora de
--    hora.
-- ============================================================================

create table if not exists publicacoes_agendadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- De onde o conteúdo veio. `set null` e não `cascade`: apagar o preview não
  -- pode sumir com o registro de um post que JÁ FOI AO AR.
  content_preview_id uuid references content_previews (id) on delete set null,
  calendar_item_id uuid references calendar_items (id) on delete set null,

  rede text not null default 'instagram' check (rede in ('instagram')),
  -- Sem o "@". A conta é gravada na linha para a rotina não ter que adivinhar
  -- em qual perfil publicar — e para o registro dizer onde o post saiu.
  handle text not null check (handle <> '' and handle not like '@%'),

  /* Quando vai ao ar. timestamptz: o horário é escolhido em Brasília e
     comparado com `now()` do servidor, que é UTC. Guardar `date` + `time`
     separados erraria em toda virada de dia. */
  quando timestamptz not null,

  formato text not null check (formato in ('post', 'carrossel', 'reels', 'story')),
  legenda text not null default '',
  /* [{ "url": "...", "tipo": "imagem" | "video" }], NA ORDEM do carrossel. */
  midias jsonb not null default '[]'::jsonb,

  status text not null default 'agendada'
    check (status in ('agendada', 'publicando', 'publicada', 'falhou', 'cancelada')),

  -- O container da Meta, guardado ANTES de publicar: se a corrida morrer entre
  -- montar e publicar, é por ele que se descobre o que ficou pendurado.
  creation_id text,
  permalink text,
  erro text,
  tentativas integer not null default 0,
  publicada_em timestamptz,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists publicacoes_agendadas_fila_idx
  on publicacoes_agendadas (status, quando);
create index if not exists publicacoes_agendadas_user_idx
  on publicacoes_agendadas (user_id, quando desc);

comment on table publicacoes_agendadas is
  'Fila de publicações programadas. A rotina de publicação consome por aqui.';
comment on column publicacoes_agendadas.midias is
  'Cópia ordenada das mídias no momento do agendamento — não é lida do preview na hora de publicar.';

alter table publicacoes_agendadas enable row level security;

drop policy if exists "publicações do próprio usuário" on publicacoes_agendadas;
create policy "publicações do próprio usuário" on publicacoes_agendadas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on publicacoes_agendadas to authenticated;

-- ============================================================================
-- A porta estreita da publicação
-- ============================================================================
-- O token de ingestão ganha duas capacidades novas, e só estas duas: pegar a
-- fila vencida e registrar o desfecho. Ele continua sem conseguir ler uma nota,
-- um item do calendário ou uma métrica.
--
-- O que ele passa a enxergar é a legenda e as URLs das mídias de um post
-- programado. As URLs já são públicas (o bucket `media` é público, porque o
-- link de preview abre sem login), então o que se acrescenta de verdade é a
-- legenda — texto que ele mesmo escreveu para publicar em seguida.
-- ============================================================================

/* Pega a fila e JÁ MARCA como `publicando`, na mesma sentença.
 *
 * Duas corridas sobrepostas: a primeira leva as linhas, a segunda recebe lista
 * vazia. É a trava que impede post duplicado — o erro mais caro desta fila,
 * porque não dá para desfazer um post que já apareceu para os seguidores.
 *
 * `atraso_maximo_minutos` é a janela: o que passou dela não vai ao ar fora de
 * hora, vai para `falhou`. Quem fecha essas linhas é `expirar_publicacoes`.
 */
create or replace function publicacoes_para_publicar(
  token text,
  atraso_maximo_minutos integer default 120
)
returns table (
  id uuid,
  handle text,
  formato text,
  legenda text,
  midias jsonb,
  quando timestamptz
)
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
  update publicacoes_agendadas p
     set status = 'publicando',
         tentativas = p.tentativas + 1,
         atualizado_em = now()
   where p.id in (
     select f.id from publicacoes_agendadas f
      where f.user_id = dono
        and f.status = 'agendada'
        and f.quando <= now()
        and f.quando > now() - make_interval(mins => greatest(atraso_maximo_minutos, 1))
      order by f.quando
      -- Uma de cada vez: publicar em lote num perfil só é jeito de tomar
      -- limite de API e deixar metade da fila presa em `publicando`.
      limit 3
      for update skip locked
   )
   returning p.id, p.handle, p.formato, p.legenda, p.midias, p.quando;
end;
$$;

grant execute on function publicacoes_para_publicar(text, integer) to anon, authenticated, service_role;

/* Registra o desfecho. `publicada` exige permalink: sucesso sem prova de que o
 * post existe é a forma mais fácil de a fila mentir. */
create or replace function concluir_publicacao(
  token text,
  publicacao uuid,
  novo_status text,
  creation text default null,
  link text default null,
  mensagem_de_erro text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  mexidas integer;
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;
  if novo_status not in ('agendada', 'publicada', 'falhou') then
    raise exception 'status inválido: %', novo_status using errcode = '22023';
  end if;
  if novo_status = 'publicada' and coalesce(link, '') = '' then
    raise exception 'publicada exige o permalink do post' using errcode = '22023';
  end if;

  update publicacoes_agendadas
     set status = novo_status,
         creation_id = coalesce(creation, creation_id),
         permalink = coalesce(link, permalink),
         erro = case when novo_status = 'publicada' then null else mensagem_de_erro end,
         publicada_em = case when novo_status = 'publicada' then now() else publicada_em end,
         atualizado_em = now()
   where id = publicacao
     and user_id = dono
     -- Só quem está `publicando` pode ser concluída: fecha a janela para uma
     -- corrida atrasada sobrescrever o desfecho de um post já publicado.
     and status = 'publicando';

  get diagnostics mexidas = row_count;
  update chaves_de_ingestao set ultimo_uso = now(), usos = usos + 1
   where user_id = dono and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  return mexidas;
end;
$$;

grant execute on function concluir_publicacao(text, uuid, text, text, text, text) to anon, authenticated, service_role;

/* Fecha o que perdeu a hora, com o motivo escrito.
 *
 * Roda no começo de cada corrida, ANTES de pegar a fila: assim a tela mostra
 * "não foi ao ar porque passou da janela" em vez de deixar a linha parada em
 * `agendada` para sempre, parecendo que ainda vai sair. */
create or replace function expirar_publicacoes(
  token text,
  atraso_maximo_minutos integer default 120
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dono uuid := dono_do_token(token);
  mexidas integer;
begin
  if dono is null then
    raise exception 'token de ingestão inválido' using errcode = '28000';
  end if;

  update publicacoes_agendadas
     set status = 'falhou',
         erro = 'Passou da janela de ' || greatest(atraso_maximo_minutos, 1)
                || ' min depois do horário. Não foi publicada para não sair fora de hora.',
         atualizado_em = now()
   where user_id = dono
     and status = 'agendada'
     and quando < now() - make_interval(mins => greatest(atraso_maximo_minutos, 1));

  get diagnostics mexidas = row_count;
  return mexidas;
end;
$$;

grant execute on function expirar_publicacoes(text, integer) to anon, authenticated, service_role;
