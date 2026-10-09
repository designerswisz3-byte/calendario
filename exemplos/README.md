# Exemplos de importação do Relatório

Arquivos prontos para colar em **Relatório → Importar dados**.

## `metricas-swiszoficial-jul-out-2026.csv`

100 dias reais de `@swiszoficial`, de 01/07 a 08/10/2026, vindos do conector
Swisz (`swisz_insta_evolucao`, lido em 09/10/2026).

São os mesmos dados que o teste de ponta a ponta usa, e servem de referência
de formato por um motivo específico: eles têm **buracos reais**. A coluna
`seguidores` só começa em 16/09 — antes disso o coletor não rodava, e a Meta
não devolve seguidores retroativo. Célula vazia é exatamente isso: *não temos
este dia*, que a aba trata como ausência, não como zero.

Confira contra a soma por mês, se quiser validar uma importação:

| Mês | Dias | Alcance | Views | Interações |
| --- | --- | --- | --- | --- |
| jul 2026 | 31/31 | 14.737 | 425.416 | 35.735 |
| ago 2026 | 31/31 | 14.658 | 65.154 | 2.943 |
| set 2026 | 30/30 | 8.075 | 60.522 | 2.024 |
| out 2026 | 8/31 | 1.289 | 11.666 | 320 |

## Formato

Uma linha por dia. A coluna de data pode se chamar `dia`, `data` ou `date`,
em `AAAA-MM-DD` ou `DD/MM/AAAA`. As colunas de métrica reconhecidas (com os
apelidos em inglês que as APIs costumam devolver):

`seguidores`/`followers` · `seguidores_ganhos`/`follows` · `alcance`/`reach` ·
`views` · `likes` · `comentarios`/`comments` · `salvamentos`/`saves` ·
`compartilhamentos`/`shares` · `interacoes`/`total_interactions` ·
`cliques_no_link`/`profile_links_taps` · `publicacoes`/`posts`

JSON também serve — uma lista de objetos com as mesmas chaves. Reimportar o
mesmo dia **corrige** o valor; não duplica.
