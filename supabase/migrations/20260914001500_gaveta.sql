-- A gaveta de ideias soltas: item guardado sem data, em vez de apagado.
--
-- O caso real: ele cria o item no calendário, a ideia não entra naquele dia e
-- hoje a única saída é apagar ou deixar a data passar com um item morto na
-- grade. As duas são ruins — a primeira perde a ideia, a segunda suja o mês e
-- estraga a contagem de progresso.
--
-- Por que uma coluna e não uma tabela nova: a ideia guardada continua sendo o
-- MESMO item. Ela mantém briefing, roteiro, etiquetas, tipo e o conteúdo já
-- criado. Mover para outra tabela significaria copiar tudo isso e recriar os
-- vínculos na volta — e a volta é o caminho que mais importa aqui.
--
-- Por que `data` continua obrigatória: ela vira a memória de quando a ideia foi
-- pensada, e é a data que a tela mostra ("guardada em 14/11"). Tornar a coluna
-- anulável custaria um `if` em cada lugar que desenha a grade, para ganhar
-- nada.

alter table calendar_items
  add column if not exists na_gaveta boolean not null default false;

alter table stories_sequencias
  add column if not exists na_gaveta boolean not null default false;

-- Índice parcial: a gaveta é lida inteira a cada abertura da aba, e ela é uma
-- fração pequena da tabela. Indexar só as linhas guardadas mantém o índice do
-- tamanho da gaveta, não do calendário.
create index if not exists calendar_items_gaveta_idx
  on calendar_items (user_id, atualizado_em desc) where na_gaveta;

create index if not exists stories_sequencias_gaveta_idx
  on stories_sequencias (user_id, atualizado_em desc) where na_gaveta;
