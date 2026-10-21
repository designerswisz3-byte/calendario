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
