-- ============================================================================
-- Roteiros prontos: uma segunda gaveta no calendário
-- ============================================================================
-- A gaveta de ideias soltas guarda o que ainda NÃO está pronto: a ideia que
-- nasceu com data e não foi usada. Faltava o lugar do oposto — o roteiro que
-- já está escrito e só espera o dia de gravar.
--
-- Misturar os dois na mesma lista estraga as duas perguntas que a gaveta
-- responde. "O que eu posso gravar hoje, se sobrar uma hora?" exige achar os
-- prontos no meio dos rascunhos; "que ideia eu ainda não desenvolvi?" exige o
-- contrário. Duas gavetas respondem cada uma com um olhar.
--
-- `na_gaveta` continua dizendo SE o item saiu da grade. Esta coluna diz PARA
-- QUAL das duas ele foi. Separar assim é o que deixa tudo que já existe
-- funcionando sem tocar: a grade segue filtrando por `na_gaveta = false`, e o
-- que estava guardado antes desta migração cai em 'ideias', que é onde estava.
--
-- Pode rodar mais de uma vez.
-- ============================================================================

alter table calendar_items
  add column if not exists gaveta text not null default 'ideias';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_items_gaveta_valida'
  ) then
    alter table calendar_items
      add constraint calendar_items_gaveta_valida
      check (gaveta in ('ideias', 'roteiros'));
  end if;
end
$$;

comment on column calendar_items.gaveta is
  'Para qual gaveta o item vai quando na_gaveta = true: ideias (ainda não '
  'desenvolvida) ou roteiros (roteiro pronto, esperando gravação). Fora da '
  'gaveta o valor fica guardado e não significa nada.';
