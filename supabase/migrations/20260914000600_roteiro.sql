-- ============================================================================
-- Separa o texto do item de planejamento em dois: briefing e roteiro.
-- ============================================================================
-- `notas` continua sendo o BRIEFING — é onde já está tudo que foi escrito até
-- aqui, e nada é movido ou reescrito. O roteiro entra como coluna nova, vazia.
--
-- São textos com funções diferentes: o briefing é para pensar (ângulo, gancho,
-- referência), o roteiro é para gravar — e é ele que alimenta o teleprompter.
-- ============================================================================

alter table calendar_items add column if not exists roteiro text;

comment on column calendar_items.notas is
  'Briefing: ângulo, gancho, referências. Texto livre de planejamento.';
comment on column calendar_items.roteiro is
  'Roteiro de gravação, exibido no teleprompter.';
