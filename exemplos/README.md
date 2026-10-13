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

## `eventos-2026-2027.json`

As 52 datas do catálogo (`src/data/catalogoDeEventos.ts`) exportadas no formato
que `scripts/importar.mjs` consome. A tela importa direto do módulo TypeScript;
este arquivo existe para o caminho servidor:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/importar.mjs --tabela eventos \
    --arquivo exemplos/eventos-2026-2027.json --usuario <uuid>
```

Datas de feiras brasileiras de 2027 (Couromoda, Francal, SPFW) **não entraram**:
as organizadoras ainda não publicaram o calendário em out/2026, e data de evento
inventada faz alguém comprar passagem errada.

## `coleta-noticias-2026-10-13.json`

A primeira coleta, montada em 13/10/2026. Seis notícias com fonte conferível,
cada uma com o campo que justifica ela estar na lista: o que aquilo muda para
quem vende moda.

Serve de referência de formato e de régua de curadoria — `relevancia` 5 é "muda
decisão esta semana", não "achei interessante".

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/importar.mjs --tabela noticias \
    --arquivo exemplos/coleta-noticias-2026-10-13.json --usuario <uuid>
```

A chave de serviço ignora a RLS: ela só pode existir como segredo de ambiente
do servidor ou do agendador — nunca em arquivo versionado, nunca no front.

---

## A coleta diária

A Routine `Coleta diária de notícias — e-commerce de moda` roda em dia útil às
06:52 (BRT) e grava direto na tabela `noticias`. Os arquivos acima são o
formato que ela produz.

Para listar o que já está guardado, sem gravar nada:

```bash
node scripts/importar.mjs --tabela noticias --listar 30
```

É o primeiro comando da coleta: sem ele, a mesma notícia voltaria todo dia.
