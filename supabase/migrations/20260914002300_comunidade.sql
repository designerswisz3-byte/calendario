-- ============================================================================
-- Comunidade: o que já foi falado no grupo
-- ============================================================================
-- A aba Comunidade é um calendário semanal de temas para o grupo de WhatsApp:
-- um tema por semana, um subtema por dia. A pauta em si mora no código do app
-- (src/lib/comunidade.ts) — é texto curado, igual para todo dia do ciclo, e
-- não faz sentido no banco.
--
-- O que precisa de banco é a única coisa que ele produz ali: o "falei sobre
-- esse tema". Guardar isso no navegador não serviria — ele marca no celular,
-- de dentro do grupo, e confere no computador.
--
-- Uma linha por DIA marcado. A chave é a data, não o subtema: a pauta se
-- repete a cada ciclo, e "falei disso em setembro" não pode marcar sozinho o
-- dia de dezembro. O subtema vai junto como registro — é o que permite dizer,
-- no ciclo seguinte, "você já falou disto em 02/09".
-- ============================================================================

create table if not exists comunidade_falados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- O dia do calendário que foi marcado.
  data date not null,

  -- O identificador do subtema na pauta do app (ex.: 'margem-conta-por-pedido').
  -- Texto livre de propósito: a pauta evolui, e uma chave estrangeira ou um
  -- check aqui obrigaria uma migração a cada subtema reescrito.
  subtema_id text not null,

  criado_em timestamptz not null default now()
);

-- Um check por dia. Dois cliques seguidos não criam duas linhas.
create unique index if not exists comunidade_falados_dia_unico
  on comunidade_falados (user_id, data);

alter table comunidade_falados enable row level security;

drop policy if exists "comunidade_falados_select_own" on comunidade_falados;
create policy "comunidade_falados_select_own" on comunidade_falados
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "comunidade_falados_insert_own" on comunidade_falados;
create policy "comunidade_falados_insert_own" on comunidade_falados
  for insert to authenticated with check (auth.uid() = user_id);

-- Sem política de UPDATE: a linha não muda. Desmarcar é apagar.
drop policy if exists "comunidade_falados_delete_own" on comunidade_falados;
create policy "comunidade_falados_delete_own" on comunidade_falados
  for delete to authenticated using (auth.uid() = user_id);

comment on table comunidade_falados is
  'Aba Comunidade: os dias em que ele marcou "falei sobre esse tema" no grupo '
  'de WhatsApp. A pauta (temas e subtemas) fica no código, em src/lib/comunidade.ts.';
