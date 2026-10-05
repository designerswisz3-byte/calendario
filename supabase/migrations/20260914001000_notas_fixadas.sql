-- ============================================================================
-- Notas fixadas: o que é importante sobe para o topo da lista.
-- ============================================================================
-- Duas colunas, e não uma. `fixada` responde "está no topo?"; `fixada_em`
-- responde "em que ordem?".
--
-- Sem a segunda, todas as fixadas empatariam e cairiam na ordem de edição —
-- ou seja, abrir uma nota fixada para reler mudaria a posição dela no ranking.
-- Com `fixada_em`, a ordem entre as fixadas é a ordem em que foram fixadas, e
-- só muda quando a pessoa decide mudá-la: refixar manda a nota para o topo.
-- ============================================================================

alter table notas add column if not exists fixada boolean not null default false;
alter table notas add column if not exists fixada_em timestamptz;

-- O índice cobre exatamente a ordenação da lista: fixadas primeiro, as mais
-- recentemente fixadas na frente, e o resto por última edição.
create index if not exists notas_user_id_ordem_idx
  on notas (user_id, fixada desc, fixada_em desc nulls last, atualizado_em desc);

comment on column notas.fixada is
  'Nota fixada no topo da lista.';
comment on column notas.fixada_em is
  'Quando foi fixada. Define a ordem entre as fixadas — refixar sobe a nota.';

-- ============================================================================
-- Fixar não é editar.
-- ============================================================================
-- O gatilho genérico `set_atualizado_em()` carimba a data em QUALQUER update.
-- Com ele, fixar ou soltar uma nota a tornava "a mais recente": ela pulava
-- para o topo da seção das soltas e a data na lista mudava sem ninguém ter
-- escrito nada. Medido: uma nota de 3 minutos atrás virou a mais nova da lista
-- só por ter sido fixada e solta.
--
-- Este gatilho é só da tabela `notas` e só carimba quando o CONTEÚDO muda.
-- ============================================================================

create or replace function notas_carimbar_edicao()
returns trigger
language plpgsql
as $$
begin
  if new.titulo is distinct from old.titulo
     or new.conteudo is distinct from old.conteudo
     or new.desenho is distinct from old.desenho
     or new.imagens is distinct from old.imagens then
    new.atualizado_em = now();
  else
    new.atualizado_em = old.atualizado_em;
  end if;
  return new;
end;
$$;

drop trigger if exists notas_set_atualizado_em on notas;
drop trigger if exists notas_carimbar_edicao on notas;
create trigger notas_carimbar_edicao
  before update on notas
  for each row execute function notas_carimbar_edicao();
