# Projeto: Calendário Editorial + Stories + Preview + Notas + Relatório + Notícias

Registro completo do que foi construído: o produto, as decisões, os limites
reais que testamos e o que ficou de fora. O `README.md` responde *como rodar*.
Este documento responde *o que existe e por quê* — é o documento de handover.

- **Repositório:** `designerswisz3-byte/calendario`
- **Branches:** `main` e `claude/criacao-pdf-q9fjoh` (mantidas idênticas)
- **Commits:** 32
- **Migrações SQL:** 13 (consolidadas em `supabase/setup-completo.sql`)

---

## 1. O produto em uma frase

Uma ferramenta onde **você pensa, planeja o mês, escreve o briefing e o
roteiro, monta o post e manda um link** — e o cliente abre esse link sem login,
vê o post exatamente como vai sair no Instagram, escreve os ajustes, abre a
arte no Canva e baixa as mídias.

A regra que organiza tudo: **o campo existe em um lugar só.** Legenda, mídia e
nome do expert vivem na ferramenta de criação. O calendário não duplica nada —
ele dispara a criação e depois mostra o resultado. Toda vez que uma decisão de
produto apareceu, foi essa regra que decidiu.

### As três partes

| Parte | Onde | Quem usa | Login |
| --- | --- | --- | --- |
| **Notas** | `/notas` | você, antes de planejar | sim |
| **Calendário editorial** | `/calendario` | você | sim |
| **Criação + link público** | `/criar` → `/preview/:id` | você monta, o cliente vê | criar exige; ver, não |

---

## 2. Estado atual

Funcionando e no ar:

- **Notas** no estilo do Notas da Apple, com ligações `[[por título]]` no estilo do Obsidian
- Calendário mensal com arrastar-e-soltar entre dias, filtros, visão de lista e agenda
- Três estados visuais no mês: passado, hoje e futuro
- Painel do dia redimensionável, com **Briefing** e **Roteiro** num bloco de notas lateral
- **Teleprompter** em tela cheia, com velocidade, pausa e espelhamento
- Criação de conteúdo com até **20 mídias** misturando foto e vídeo (até **300 MB** por vídeo), com **upload resumável**
- Link público com simulação fiel do feed (carrossel, reels, story, post único)
- Player de vídeo com **som, linha do tempo e volume**
- Botão **AJUSTES** — o cliente escreve sem limite de caracteres
- Botão do **Canva** com **visto** que o expert marca e desmarca
- Botão **DOWNLOAD DE MÍDIA** — arquivo único ou tudo em `.zip`
- **Stories**: calendário próprio, com sugestão de assunto puxada pelo contexto e sequências geradas, editáveis e ancoráveis numa imagem
- **Data de publicação editável** no formulário do item — o conteúdo já nasce no dia em que vai ao ar
- **Datas do setor no calendário**: 52 eventos e datas comerciais de out/2026 a dez/2027, cada uma com um ângulo de post pronto para virar pauta
- **Notícias**: curadoria de e-commerce de moda com relevância, "por que importa" e botão que transforma a notícia em pauta
- **Relatório**: arquivo mês a mês e semana a semana de métricas de perfil, com comparativo e PDF
- **ErrorBoundary por rota**: uma tela quebrada não derruba o app inteiro

Dependências de ambiente (fora do código):

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel, **tipo Config** (não Secret), com redeploy depois de salvar
- `supabase/setup-completo.sql` rodado por inteiro no SQL Editor do Supabase
- Deployment Protection **desligada** na Vercel — com ela ligada, `/preview/:id` pede login e o produto perde o sentido

---

## 3. Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Frontend | React 18 + TypeScript + Vite 5 | definido na especificação |
| Estilo | Tailwind CSS 3.4 + shadcn/ui (Radix) | idem |
| Rotas | React Router 6 | idem |
| Backend | Supabase — Postgres + Auth + Storage | idem |
| Estado remoto | React Query 5 | **única** camada de acesso a dados |
| Drag-and-drop | `@dnd-kit/*` | reordenar mídias e mover itens entre dias |
| Editor das notas | **TipTap 3** (MIT) | WYSIWYG sobre ProseMirror |
| Desenho | **Excalidraw** (MIT) | canvas infinito dentro da nota |
| Ícones | `lucide-react` | |
| Deploy | Vercel (`vercel.json`) ou Netlify (`netlify.toml`) | |

Nenhuma dependência pronta para Instagram, teleprompter, player, ZIP ou upload
resumável. Tudo isso é código nosso — o critério está na seção 8.

---

## 4. Arquitetura

```
Browser (React 18 + Vite + TS)
│
├── React Router ── públicas: /login, /preview/:id
│                └─ privadas:  /notas, /calendario, /criar
│                   (ProtectedRoute + AppShell + ErrorBoundary)
│
├── React Query ── única camada de acesso a dados (src/hooks/*)
│      └── @supabase/supabase-js ──> Supabase
│                                     ├── Postgres + RLS (dono = auth.uid())
│                                     │    └── anônimo entra só por 3 funções SECURITY DEFINER
│                                     ├── Auth (e-mail + senha)
│                                     ├── Storage `media`  (público — o cliente vê o preview)
│                                     └── Storage `canvas` (privado — anexos das notas)
│
├── TipTap ── editor das notas
├── Excalidraw ── desenho dentro da nota
└── dnd-kit ── reordenar mídias + mover item entre dias
```

Todas as rotas são **lazy**. `/preview/:id` é a que vai para o cliente: ela não
baixa o bundle do calendário, do editor nem do desenho para desenhar um post.

### Rotas

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `/` | — | redireciona para `/calendario` |
| `/login` | pública | e-mail + senha (entrar e cadastrar) |
| `/preview/:id` | **pública** | simulação do Instagram + ajustes + Canva + download |
| `/notas` | privada | caderno com texto, imagem, desenho e ligações |
| `/calendario` | privada | mês, painel do dia, briefing, roteiro, teleprompter |
| `/criar` | privada | monta o conteúdo e gera o link |
| `/stories` | privada | calendário de stories, sugestão de assunto e gerador de sequência |
| `/noticias` | privada | curadoria do setor, com "virar pauta" |
| `/relatorio` | privada | métricas mensais/semanais, comparativo e exportação em PDF |
| `*` | — | 404 |

---

## 5. Modelo de dados

Doze tabelas em uso.

### `notas` — o caderno
`id`, `user_id`, `titulo`, `conteudo`, `desenho` (jsonb), `imagens` (jsonb),
`fixada`, `fixada_em`, `criado_em`, `atualizado_em`

- `titulo` é a **primeira linha do conteúdo**, como no Notas da Apple. Fica em coluna própria para a lista carregar sem puxar o corpo de cada nota.
- `conteudo` é o HTML do editor. Imagem **nunca** entra embutida: fica `src="anexo:<caminho>"`.
- `desenho` guarda a cena do Excalidraw daquela nota.
- `fixada` responde "está no topo?"; `fixada_em` responde "em que ordem?". São duas colunas porque sem a segunda todas as fixadas empatariam e cairiam na ordem de edição — abrir uma nota fixada só para reler mudaria a posição dela no ranking.

### `calendar_items` — o planejamento do dia
`id`, `user_id`, `data`, `horario`, `tipo`, `status`, `notas`, `roteiro`,
`criado_em`, `atualizado_em`

- `tipo`: `carrossel` · `reels` · `story` · `post` · **`ideia`**
- `status`: `ideia` → `roteiro` → `design` → `em_aprovacao` → `aprovado` → `agendado` → `publicado`
- `notas` é o **Briefing**. `roteiro` alimenta o teleprompter.

### `content_previews` — o conteúdo e o link
`id`, `user_id`, `calendar_item_id`, `nome_expert`, `legenda`, `tipo`,
`canva_url`, `canva_visto`, `canva_visto_em`, `criado_em`, `atualizado_em`

O `id` **é** o link: `/preview/<id>`.

Um índice único parcial garante **um conteúdo por item de planejamento** — é
ele que impede o calendário de virar um segundo lugar para escrever legenda:

```sql
create unique index content_previews_calendar_item_id_key
  on content_previews (calendar_item_id) where calendar_item_id is not null;
```

### `media_assets` — as mídias, na ordem
`id`, `content_preview_id`, `url_arquivo`, `ordem`, `tipo`, `criado_em`

`ordem` é o que o drag-and-drop escreve. `tipo` distingue imagem de vídeo —
sem isso o carrossel misto não saberia o que renderizar em cada slide.

### `tags` e `calendar_item_tags`
`tags`: `id`, `user_id`, `nome`, `cor` · `calendar_item_tags`: chave composta

### `ajustes` — o retorno do cliente
`id`, `content_preview_id`, `texto`, `autor`, `criado_em`

Sem limite de caracteres. **Não tem política de INSERT** — e isso é intencional
(ver seção 6).

### `na_gaveta` — a terceira saída para uma ideia

Coluna booleana em `calendar_items` e em `stories_sequencias`. Item com
`na_gaveta = true` some da grade e aparece na gaveta de ideias soltas, ao lado
do calendário.

O caso que ela resolve: a ideia nasceu com data, o dia chegou e ela não foi
usada. Antes havia duas saídas, as duas ruins — apagar (perde a ideia) ou
deixar o item morto na grade (suja o mês e estraga a contagem de progresso).

Por que coluna e não tabela nova: a ideia guardada continua sendo o MESMO item,
com briefing, roteiro, etiquetas, tipo e o conteúdo já criado. Outra tabela
significaria copiar tudo isso e recriar os vínculos na volta — e a volta é o
caminho que mais importa.

Por que `data` continua obrigatória: vira a memória de quando a ideia foi
pensada, e é o que a tela mostra ("de 22/10"). Deixar a coluna anulável custaria
um `if` em cada lugar que desenha a grade, para ganhar nada.

As duas queries de grade filtram `na_gaveta = false` — sem isso a ideia
guardada continuaria ocupando o dia, que é exatamente o problema. O índice é
parcial (`where na_gaveta`): a gaveta é lida inteira a cada abertura e é uma
fração pequena da tabela.

### `stories_sequencias` — o calendário paralelo

`id`, `user_id`, `data`, `titulo`, `tema_id`, `arco_id`, `stories` (jsonb),
`imagem_caminho`, `imagem_descricao`, `observacao`, `publicado`.

**Por que não é mais um `tipo` em `calendar_items`.** Story e post são produtos
diferentes. O post tem legenda, mídia, link de aprovação e um expert; o story
tem uma sequência — blocos de texto com ordem, gatilho e direção de câmera — e
vive 24 horas. Forçar os dois na mesma linha deixaria metade das colunas sempre
nula e encheria a tela de `if` perguntando "mas é story?". São duas grades
porque são dois ofícios.

**Por que a sequência é jsonb e não uma tabela filha.** Ela é editada como
documento: a pessoa reordena, apaga o story 3, reescreve o 5 e salva o
conjunto. Normalizar trocaria um UPDATE por um diff de linhas, sem ganhar
nenhuma consulta que a tela precise fazer.

### `eventos` — o que vai acontecer, e o que postar sobre isso

`id`, `user_id`, `data`, `data_fim` (null = um dia), `titulo`, `categoria`
(`comercial` · `setorial` · `feriado` · `sazonal`), `escopo` (`brasil` ·
`global` · `eua` · `europa` · `china`), `local`, `por_que_importa`,
`ideia_de_post`, `fonte_url`. Único por `(user_id, data, titulo)`.

Os dois campos de texto são o recurso inteiro. Calendário de feriado existe de
graça na internet; o que não existe é a data já traduzida em decisão de quem
vende moda — e é por isso que nenhuma linha do catálogo entra sem os dois
preenchidos.

`data_fim` existe porque feira dura três dias e a grade precisa marcar os três.
O filtro de janela é de intervalos que se cruzam, não `data between`: uma feira
de 28/10 a 02/11 pertence aos dois meses, e o filtro ingênuo a faria sumir de
novembro.

### `noticias` — o que já aconteceu, e o que fazer com isso

`id`, `user_id`, `titulo`, `resumo`, `por_que_importa`, `url`, `fonte`,
`publicado_em`, `coletado_em`, `relevancia` (1 a 5), `tags`, `lida`,
`virou_pauta`. Único por `(user_id, url)` — a mesma notícia coletada duas vezes
é a mesma notícia.

`relevancia` é a curadoria: 1 é ruído, 5 muda decisão esta semana. A aba abre
filtrada em 4 e 5, e não em "todas", porque ela existe para o Rapha estar
atualizado em cinco minutos — abrir numa lista completa devolveria o problema
que a curadoria veio resolver.

A **editoria** (moda, economia, política, empreendedorismo) é a primeira
etiqueta de `tags`, não uma coluna. Notícia sem editoria é de moda — não é
chute: a coleta era só de moda até outubro de 2026, então toda linha antiga É
de moda, e nenhuma precisou ser reclassificada.

### `chaves_de_ingestao` — a porta estreita da coleta

`id`, `user_id`, `rotulo`, `token_hash`, `criado_em`, `ultimo_uso`, `usos`.
Único por `(user_id, rotulo)`: regerar com o mesmo rótulo troca o token e
derruba o anterior, que é como se faz rotação sem acumular chave velha.

Guarda só o **hash** (sha256). O token em claro existe uma vez, no retorno de
`criar_chave_de_ingestao` — o banco não consegue mostrá-lo de novo nem para o
dono. Para que serve e por que não a `service_role`: §8, "A coleta de notícias".

### `relatorio_perfis` e `relatorio_metricas_diarias` — o arquivo de métricas

`relatorio_perfis`: `id`, `user_id`, `rede`, `handle` (sem "@"), `nome`,
`fonte`. Único por `(user_id, rede, handle)`.

`relatorio_metricas_diarias`: `perfil_id`, `dia` (date), `seguidores`,
`seguidores_ganhos`, `alcance`, `views`, `likes`, `comentarios`,
`salvamentos`, `compartilhamentos`, `interacoes`, `cliques_no_link`,
`publicacoes`, `fonte`. Único por `(perfil_id, dia)`.

Duas decisões sustentam a aba:

1. **O grão é o dia, não o mês.** Mensal, semanal e qualquer comparativo saem
   de uma soma sobre dias; o contrário não vale — de um total mensal não se
   extrai a semana.
2. **Toda métrica é nullable, e `null` não é zero.** `null` = "não temos este
   dia"; `0` = "a fonte devolveu zero". Misturar os dois produz gráfico que
   mente para baixo: um mês com 15 dias coletados apareceria com metade do
   alcance real. Cada período carrega quantos dias dele têm dado, e a tela
   mostra a cobertura em vez de interpolar.

As métricas não têm `user_id`: o dono é o perfil, e a RLS as alcança por
`exists (select 1 from relatorio_perfis ...)`. Duas fontes de verdade para a
mesma propriedade é como nasce a linha órfã que escapa da política.

### `canvas_boards` — órfã, de propósito
Sobrou da aba Canvas, que saiu do projeto. **Não foi apagada**: `drop table` é
destrutivo e o conteúdo é de quem escreveu. Para limpar:
`drop table canvas_boards;` — depois de conferir que não há nada lá.

---

## 6. Segurança

### A regra base
RLS ligada em todas as tabelas. Toda política de dono é `auth.uid() = user_id`.
Ninguém lê nem escreve o conteúdo de outro usuário.

### O problema que o link público cria
O cliente não tem login. Ele precisa **ler um preview** e **escrever um ajuste**
sendo anônimo. A saída óbvia — liberar SELECT para `anon` — foi exatamente o
defeito que embarcamos e depois corrigimos.

> **Defeito real, corrigido na migração `...000300`.** A política
> `content_previews_select_public` liberava SELECT para `anon` sem exigir o `id`.
> Qualquer pessoa com a chave anônima — que é pública por design — podia
> **listar todos os previews de todos os clientes** sem conhecer link nenhum.
> Provado no Postgres: `anonimo lista 1 preview(s) SEM saber o id`.
> Depois da correção: `0 linhas`.

### Como ficou
Anônimo não tem acesso direto a tabela nenhuma. Passa por **três funções
`SECURITY DEFINER`**, todas com `search_path` fixado em `public, pg_temp`:

| Função | O que faz | Por que é função, e não política |
| --- | --- | --- |
| `get_public_preview(uuid)` | devolve preview + mídias + ajustes em JSON | obriga a **saber o id** |
| `enviar_ajuste(preview_id, texto, autor)` | grava um ajuste | permite escrever **um** ajuste sem abrir INSERT na tabela |
| `marcar_canva_visto(preview_id, visto)` | marca/desmarca o visto | uma ação específica, não acesso à tabela |

A diferença é o formato do acesso: uma política é uma **porta**, uma função é um
**balcão**. Com porta, quem entra escolhe o que faz lá dentro. Com balcão, só dá
para pedir o que está no cardápio — e o cardápio tem três itens.

### Dois buckets, dois níveis
| Bucket | Leitura | Por quê |
| --- | --- | --- |
| `media` | **pública** | o link `/preview/:id` abre sem login e precisa carregar as mídias |
| `canvas` | **privada** | anexos das notas são material interno: print de conversa, referência de concorrente |

Escrita nos dois é restrita à pasta do próprio usuário:
`(storage.foldername(name))[1] = auth.uid()::text`. O bucket privado não tem URL
fixa — cada exibição gera uma **URL assinada de 1 hora**.

### Chaves
- A chave **anônima** é pública por design — vai no bundle e é protegida pela RLS.
- A chave **`service_role` ignora RLS por completo.** Nunca deve ser colada em chat, commitada ou usada no frontend. Não existe caso de uso legítimo para ela neste app.

---

## 7. O que cada tela faz

### `/notas`
Caderno no estilo do Notas da Apple, com ligações no estilo do Obsidian.

- **Lista à esquerda com apenas o título** — que é a primeira linha do texto.
- **Editor**: títulos, negrito, itálico, riscado, listas e lista de tarefas.
- **Imagens** por botão, arrastar ou **colar um print**.
- **Desenho por nota** (Excalidraw), numa seção que só carrega quando aberta.
- **Fixar no topo** pelo pino, com seção própria e filtro "Só fixadas".
- **Redimensionar imagem** arrastando as alças; `Tamanho original` desfaz.
- **Exportar em PDF** pelo botão no topo da nota.
- **`[[Título da outra nota]]`** liga notas, nas duas direções: *esta nota cita* e **quem cita esta nota**. A retroligação aparece sozinha, sem ninguém criar o caminho de volta. Citar uma nota que ainda não existe oferece criá-la num clique.

A ligação é **por título, não por id**: dá para citar um tema antes de a nota
existir — que é exatamente como o Obsidian é usado. O preço é que renomear
quebra as ligações para aquela nota; em troca, escrever não exige parar para
escolher um identificador.

### `/relatorio`

Duas colunas de informação, uma granularidade por vez.

- **Perfil** no topo: vários perfis convivem (`@euraphaelaraujo`,
  `@swiszoficial`), cada um com o próprio arquivo.
- **Mensal / Semanal**: a semana é ISO-8601 (começa na segunda; a semana
  pertence ao ano em que cai a quinta-feira dela).
- **Cartões** com o número do período em foco e a variação contra o período
  imediatamente anterior da mesma série.
- **Barras** por período, clicáveis: clicar troca o foco dos cartões. Barra
  listrada = período com dias sem coleta. Traço vazado = nenhum dado — nunca
  uma barra de altura zero, que se leria como queda real.
- **Tabela** com o arquivo inteiro, incluindo a coluna `dias` (coletados / do
  período) — é ela que diz se o resto da linha pode ser lido.
- **Exportar PDF** pelo motor de impressão do navegador, como nas Notas.

Três proteções contra o número que mente:

- quando os dois períodos comparados têm cobertura diferente em mais de um
  dia, o percentual sai em cinza e a tela avisa em vez de pintar de vermelho;
- `seguidores` é **estoque**, não fluxo: o período usa o primeiro e o último
  snapshot, nunca a soma (somar seguidores de 30 dias daria 15 mil seguidores
  num perfil de 500);
- divisão por zero não vira percentual: de 0 para 50 a tela mostra `+50`.

**De onde vêm os dados.** O app roda no navegador, então não pode guardar o
token de página da Meta — quem abrisse o DevTools teria a conta. A entrada é
por importação (CSV ou JSON, uma linha por dia), com `upsert` em
`(perfil_id, dia)`: reimportar o mesmo mês corrige os dias em vez de duplicar
o período. A tela mostra o que vai entrar antes de gravar.

### `/stories`

Grade própria, mais leve que a do calendário editorial: sem arrastar, sem tags,
sem status. A célula só responde "tem sequência aqui, e sobre o quê".

Clicar num dia abre três assuntos, e o botão **Outras ideias** troca os três
por outros. Como as vagas são preenchidas, em ordem de prioridade:

- **A vaga da pauta** — quando existe postagem marcada NAQUELE dia na aba
  Calendário, o tema que casa com ela entra primeiro, com a etiqueta "Combina
  com o post de hoje".
- **Uma vaga é do contexto** — o tema relevante que está mais à frente na
  rotação do dia. Relevante = casa com as datas do calendário em volta daquele
  dia (±21 dias) e com as notícias recentes.
- **O resto vem da rotação pura**, que anda um passo largo por dia.

A ordem não é arbitrária: o post do dia já foi decidido, e o story existe para
sustentá-lo. Um post sobre ruptura de estoque no dia 12 e uma sequência sobre
embalagem no mesmo dia 12 fazem a audiência não lembrar de nenhum dos dois.

#### O laço com o Calendário

`calendar_items` não tem título — tem briefing (`notas`), roteiro e etiquetas.
O assunto curto, que vira o título da sequência, é a **primeira linha do
briefing**, que é como ele escreve a pauta. O que o motor lê para escolher o
ângulo é o **briefing inteiro**: o ângulo costuma estar no meio, não no começo.

O casamento texto → tema (`melhorTemaPara`) foi refeito para isso, porque a
etiqueta "combina com o post de hoje" só vale se for verdade:

- `contexto` conta por **expressão**, não por palavra: "mercado livre" é um
  acerto, não dois. Sem isso, "post sobre devolução alta no Mercado Livre" caía
  em precificação por canal.
- cada palavra pesa pela **raridade** no banco: "coleção" está em meio banco e
  vale pouco; "bastidor" está num tema só e vale tudo.
- casamento por **raiz de 6 letras** resolve "embalando"/"embalagem". Seis, e
  não cinco, porque "produção" e "produto" compartilham cinco e são assuntos
  diferentes.
- a vaga da pauta exige **nota mínima** (3,5). Medido: casamento real pontua de
  4,7 a 7,7; coincidência boba — "dicas de produtividade pessoal" roçando em
  "produto e pessoas" — pontua 2,8. Abaixo da régua, sem etiqueta: melhor não
  ter vaga de pauta do que ter uma etiqueta mentindo.

O botão "Gerar stories deste post" usa o mesmo motor e sempre devolve alguma
coisa (cai na sugestão do dia quando nada casa) — é a diferença entre o botão,
que não pode travar, e a etiqueta, que não pode mentir.

Esse desenho substituiu um que não funcionava, e o erro vale registrar porque
ele é fácil de repetir: a versão anterior **somava** um bônus de contexto à
rotação. Medido com a base real do Raphael, três temas ficaram grudados no topo
por oito dias seguidos — bastava uma notícia conter a palavra "compra". Baixar
o peso de 1 para 0,45 não resolveu: os temas com dois acertos continuaram
grudados em 7 de 8 dias. **Enquanto o bônus for comparável à faixa da rotação,
quem acerta contexto sempre ganha.** A vaga reservada resolve de vez, dá para
explicar numa frase e não precisa ser recalibrada quando o banco cresce.

Medido depois da correção, sobre 28 dias e a base real: 0 de sobreposição entre
dias consecutivos, os 21 temas circulam dentro do mês, nenhum passa de 10 dias
de 28, e os temas de contexto ficam 32% acima da rotação pura — inclinam sem
tomar a lista.

O **passo** da rotação é calculado para ser primo com o tamanho do banco. Andar
de 1 em 1 fazia dois dias seguidos compartilharem 2 dos 3 temas: a lista mudava
no papel e parecia a mesma na tela.

A lista é **estável** se você reabrir o mesmo dia — sugestão que muda a cada
clique faz a pessoa caçar uma melhor em vez de gravar. Quem quer variedade usa
o botão, que diz em qual rodada está e oferece a volta. Sete rodadas varrem 18
dos 21 temas.

**O motor** está em `src/lib/stories/`, em três peças:

| Arquivo | O que é |
| --- | --- |
| `gatilhos.ts` | os 18 movimentos (abertura, dado na tela, mito, bastidor, tempo real, pergunta da caixinha, curiosidade, identificação, autoridade, prova social, contraste, vulnerabilidade, reciprocidade, passo, item, urgência, compromisso, gancho), cada um com 3 a 5 formas de ser escrito, e os 16 arcos |
| `temas.ts` | 21 assuntos que o Raphael sustenta com operação real, cada um com pergunta, dado que prova, ação útil, prazo real e as opções da enquete |
| `frases.ts` | as costuras de português que as variantes usam: contração, artigo, maiúscula, parágrafos |
| `gerador.ts` | compõe gatilho × tema × redação em texto, e escolhe os três assuntos do dia |

A separação é o que torna o motor reutilizável: trocar o tema mantém a
estrutura que funciona; trocar o arco reconta o mesmo assunto com outra
intenção. Um gerador que misturasse os dois só saberia repetir o exemplo que
lhe deram.

#### Variedade: o motor tinha 11 frases, não 105 sequências

A primeira versão tinha **uma** função de escrita por gatilho e cinco arcos que
abriam todos em `abertura` e fechavam todos em `compromisso`. Com 21 temas e 5
arcos parecia haver 105 sequências; havia 11 frases, e trocar o tema só trocava
os substantivos. O Raphael viu isso em uma semana de uso: *"TODAS as sequências
seguem um padrão — aquele foi apenas um exemplo"*. Estava certo, e o número
confirmou: 11 escritores, 5 arcos, 1 abertura, 1 fechamento.

O que mudou, em três camadas:

1. **Redação.** Cada gatilho carrega de 3 a 5 variantes — não sinônimos, e sim
   ângulos: a curiosidade pode abrir pelo objeto, pela pergunta que ninguém
   faz, pelo tempo que você levou para entender. São 65 frases no banco.
2. **Formato.** 16 arcos, com 7 aberturas diferentes (promessa, dado cru,
   crença do mercado, bastidor, tempo real, pergunta da caixinha, prova social)
   e 3 fechamentos (pedido de resposta, gancho para o dia seguinte, tarefa
   entregue sem pedir nada). Há arco que não pede interação nenhuma e arco que
   não ensina nada — porque sequência que sempre termina pedindo algo cansa a
   audiência mais rápido do que qualquer assunto repetido.
3. **Quem escolhe.** Uma semente: dia + rodada do botão "outras ideias" +
   número de vezes que a pessoa apertou gerar. Não é sorteio — o mesmo dia
   reaberto dá o mesmo texto —, mas o mesmo assunto em duas semanas diferentes
   não sai com a mesma frase, e apertar "gerar" de novo **reescreve**. A tela
   diz isso, senão ninguém descobre.

O arco padrão também gira: era sempre `arcosSugeridos[0]`, o que fazia os
dezesseis formatos existirem só no seletor. Agora a roda começa pelos sugeridos
e segue pelos demais **que o tema sustenta inteiros** — a escolha automática
nunca cai num arco que produziria `[preencha: ...]`, embora a escolha manual
possa, de propósito.

Medido: o mesmo tema, no mesmo arco, dá 14 redações distintas em 14 dias; 209
de 210 sequências do caminho da imagem são distintas; a rotação automática
alcança os 16 arcos; nenhuma variante fica fora da rotação.

**Campo opcional ausente vira `[preencha: ...]`**, nunca enchimento. Um
parágrafo vago parece pronto e não é — e isso custa uma gravação inteira.

**A imagem.** O app roda no navegador e não LÊ a imagem: isso exigiria um
modelo de visão, que exigiria chave de API no bundle, que é chave pública. Em
vez de fingir, a tela pede a única coisa que falta — uma linha dizendo o que a
foto mostra. Com ela, a sequência inteira passa a girar em torno daquela
imagem: a curiosidade se aproxima dela, a autoridade a põe em cena, a enquete
aparece por cima. São cinco palavras de trabalho para um resultado coeso de
verdade, em vez de coeso no discurso.

Com dezesseis arcos isso passou a exigir cuidado: o tutorial é abertura, passos
e pergunta final, e nenhum desses gatilhos fala do objeto — uma foto colada ali
não entraria em lugar nenhum. Três garantias, em ordem de qualidade: quando o
app escolhe o arco, prefere os que **falam** do objeto; se mesmo assim nenhum
story citar a cena, um deles troca de variante por uma que cite; e, se o arco
escolhido à mão não souber citar, a cena vai para a direção visual da abertura.
Resultado medido: 203 de 210 combinações citam a imagem na fala, e 210 de 210
a põem em cena.

**Gerar a partir do assunto que a pessoa escreveu.** As sugestões do dia
resolvem "não sei sobre o que falar". O caso mais comum de quem já tem pauta é
o contrário — "eu sei o assunto, me dá a sequência" —, e ele terminava num
rascunho vazio sem caminho de volta para o gerador. O bloco "Gerar a partir do
seu assunto" usa o título escrito à mão como busca, com dois seletores:

- **Finalidade** (autoridade · humanidade · ensino · conexão), porque o mesmo
  assunto rende sequências diferentes: a Black Friday dá uma de autoridade (a
  decisão com dado) e outra de humanidade (o erro do ano passado).
- **Arco**, que decide o tamanho (de 4 a 7 stories) e o tom — o seletor mostra
  os dois, porque "Lista numerada · 5 stories" e "Diário do dia · 5 stories"
  são a mesma altura e coisas opostas.

O título da pessoa nunca é atropelado pelo do tema; em troca, a tela mostra
`Ângulo usado: …`, senão ela não teria como saber por onde o motor entrou.
Regerar por cima de texto escrito pergunta antes.

A primeira versão disso saiu errada e vale registrar o erro: o botão só sabia
**regerar**, e exigia um tema já escolhido. Quem colava uma foto e escrevia a
descrição — o caminho mais natural, e o que foi pedido — encontrava um botão
cinza, sem nada na tela explicando o motivo. Duas correções:

1. Sem tema escolhido, o assunto sai da **própria descrição**
   (`escolherTemaPor`), pesando `contexto` (3) acima de `titulo`/`alavanca` (2)
   e de `oQueMostrar` (1) — sem esse peso, "a mesa de corte com os tecidos"
   caía no tema de devolução, por causa da "mesa de devolução".
2. O botão só desabilita por falta de descrição, e nesse caso **a linha abaixo
   dele diz isso**. Controle cinza sem explicação na tela é o pior tipo de
   trava: a pessoa clica, não acontece nada, e ela conclui que o produto
   quebrou.

#### O período escolhido à mão

Mensal e semanal respondem "como foi este mês". A aba **Período** responde a
pergunta que aparece quando alguém está decidindo: "como foram os 40 dias
desde que mudei a frequência", "como foi a campanha". Isso não cabe em meses
fechados.

- **Atalhos** (7, 28, 90 dias, este mês, mês passado, 12 meses) mais dois
  campos de data. Digitar duas datas toda vez seria atrito, e atrito em painel
  significa painel que não se abre.
- **O par de comparação é a janela anterior de mesmo tamanho, colada nela.**
  Comparar 14 dias com o mês passado inteiro não diz nada.
- **Sem histórico antes da janela, a comparação some** em vez de virar
  "-100%": falta de base não é queda.
- **Gráfico dia a dia** com uma barra por dia, traço vazado onde não houve
  coleta, e uma linha tracejada na média diária do período anterior — o
  comparativo que cabe num gráfico diário sem virar sopa de duas séries.
- **Tabela métrica a métrica**: período, anterior e variação. É o que se relê
  numa reunião, onde barra não ajuda.
- O PDF do modo Período leva as **duas janelas**, não o arquivo mensal inteiro:
  seriam dois relatórios no mesmo papel.

`seguidores_ganhos` aparece uma vez só na tabela, embora esteja na lista de
fluxos: a linha de cima prefere a diferença entre dois snapshots de total (que
inclui quem saiu) e a de baixo seria a soma das entradas. Dois números com o
mesmo nome, lado a lado, é como se desconfia de um painel.

### `/noticias`

Lista agrupada por dia de publicação, ordenada por relevância dentro do dia.
Cada cartão traz resumo, o "por que importa" e as tags, e três ações: abrir a
fonte, marcar como lida e **virar pauta**.

"Virar pauta" cria um item no calendário **de hoje**, como ideia, com o
briefing já montado (título na primeira linha, resumo, por que importa e a URL
da fonte), e marca a notícia como lida. Hoje e não "algum dia": pauta que nasce
de notícia tem prazo de validade, e jogá-la para uma data futura vazia é o
jeito mais rápido de ela morrer na lista. Para outro dia, arrasta-se na grade.

Nota lida **não some** da lista: apaga. Sumir esconderia o que já foi avaliado
e faria a mesma notícia voltar a chamar atenção amanhã.

### `/calendario`
Grade do mês com os itens em cada dia. Arrastar um card move o item de data
(atualização otimista). Filtros por tipo, status e tag. Visão de lista e agenda.

**Três estados visuais**: passado (fundo escurecido), hoje (borda e anel na cor
primária) e futuro. O escurecido fica no **fundo da célula**, não nos cards —
um item atrasado precisa continuar legível, senão a sinalização esconde
justamente o que pede atenção.

O card se chama pela **primeira linha do briefing**, sempre — inclusive depois
de o conteúdo ser criado. O nome do expert é só reserva para item sem briefing.

### A gaveta de ideias soltas

Fica **ao lado da grade**, nas duas abas, e não numa tela separada. O movimento
é de ida e volta — a ideia guardada em novembro é a pauta de janeiro —, e isso
só acontece se ela estiver visível enquanto o mês é planejado. Gaveta em outra
aba é gaveta que ninguém abre.

Três gestos:

| Gesto | O que faz |
| --- | --- |
| Arrastar da grade para a gaveta | guarda; sai do dia, mantém tudo |
| Arrastar da gaveta para um dia | devolve para aquele dia |
| Botão (arquivo no painel do dia, "usar hoje" na gaveta) | o mesmo, sem arrastar |

Os botões não são enfeite: no celular a grade vira agenda e **não existe
arrasto nenhum**. Sem eles, metade do uso ficaria de fora. Por isso o
`DndContext` envolve as duas vistas — a gaveta precisa do contexto para ser
alvo de soltura, mesmo quando nada é arrastável.

O botão de guardar fica **ao lado do de excluir**, de propósito: as duas ações
respondem "não vou usar isto hoje", e a diferença é que uma perde a ideia. Ter
as duas lado a lado é o que faz a pessoa parar de apagar.

O card na gaveta **não abre ao clique**. Abrir o painel do dia antigo mostraria
um dia que não tem mais aquele item. A gaveta é guarda; para mexer na ideia,
devolva primeiro.

### Datas no calendário

A grade ganhou uma faixa colorida por categoria acima dos cards de conteúdo —
deliberadamente **menor** que eles, porque a data é contexto e o item planejado
é tarefa. Evento de vários dias vira uma barra contínua atravessando a semana,
com o título só no primeiro dia e "…fim" no último.

No painel do dia, cada data aparece com `por_que_importa`, o ângulo de post e o
botão **Virar pauta**, que cria o item já com o briefing montado. Sem esse
botão isto seria um calendário de feriados; com ele, é o começo do mês de
conteúdo.

O catálogo (52 datas, `src/data/catalogoDeEventos.ts`) entra pelo botão da
legenda. A importação é idempotente — `upsert` em `(user_id, data, titulo)` —
então reimportar atualiza os ângulos sem duplicar a grade, e é por isso que o
botão continua à vista depois da primeira carga.

### Painel do dia
Abre ao clicar no dia. **Arrastável pela borda esquerda**; a largura fica salva.

Clicar em **editar** abre o **bloco de notas ao lado**: os campos curtos (tipo,
status, horário, tags) ficam na coluna estreita, e os textos longos ganham o
resto da tela — a área de escrita vai de 140 px para ~630 px de altura.

É **um formulário só**: o Salvar do bloco submete o mesmo `<form>` do painel
(via atributo `form=`), então não existe caminho em que metade do item salva.
`Ctrl/Cmd+S` também salva. Com o bloco aberto, **Esc e clique fora deixam de
fechar o painel** — são gestos acidentais, e aqui o custo é um briefing inteiro.

### Teleprompter
Tela cheia, com atalhos: velocidade (↑ ↓), fonte (+ −), pausar (espaço ou K),
voltar ao início (R), espelhar (M), sair (Esc). Velocidade, fonte e
espelhamento ficam guardados.

### `/criar`
Nome do expert, legenda com contador de **2.200 caracteres**, tipo do conteúdo
e upload de até **20 mídias** misturando foto e vídeo (imagem até 10 MB, vídeo
até 300 MB), com barra de progresso e reordenação por arrastar.

### `/preview/:id` — a tela que vai para o cliente
Sem login, sem edição. É a única parte do app que **não** usa glassmorphism —
ela imita o Instagram, e qualquer estilo nosso ali quebraria a ilusão.

- **Carrossel** — proporção natural da arte, contador `n/n`, só o slide ativo toca
- **Reels / Story** — vídeo 9:16, legenda **abaixo** do vídeo
- **Player** — som original, linha do tempo arrastável, volume sempre visível
- **AJUSTES** — texto sem limite; o retorno aparece no painel do dia
- **Canva** — abre a arte + check de visto que o expert marca e desmarca
- **Download** — um arquivo ou **tudo em `.zip`**, com progresso

---

## 8. Decisões de engenharia que importam

Cada uma existe porque a alternativa óbvia falhou em um caso real.

**Quando escrever e quando usar biblioteca.**
O critério: se o cliente nunca nota a diferença entre a nossa versão e a
comprada, não é lugar de gastar tempo. ZIP (~110 linhas), upload resumável
(~180) e o player trocam uma função estreita — foram escritos. Canvas infinito
e editor WYSIWYG são pan, zoom, hit-testing, seleção, undo/redo, schema de
documento: à mão dariam produto pior por muito mais esforço — vieram prontos
(Excalidraw e TipTap, ambos MIT) e lazy.

**Data no fuso local, nunca `new Date('YYYY-MM-DD')`.**
Essa forma é interpretada como UTC. Em UTC−3, um item marcado para o dia 1º
aparece no dia 31 do mês anterior. `src/lib/date.ts` converte tudo no fuso local.

**Proporção natural da arte, limitada à faixa do Instagram.**
A primeira versão cortava em quadrado. O Instagram aceita de 1.91:1 até 4:5 —
a moldura respeita a proporção e só limita fora dessa faixa. Recortar arte de
cliente sem avisar é destruir trabalho dos outros.

**Upload resumável (TUS) escrito à mão, acima de 6 MB.**
`supabase.storage.upload()` manda tudo num POST só: para 178 MB isso é nenhum
progresso na tela, nenhuma retomada e um timeout que joga fora o que já subiu.
`tus-js-client` traz 21 pacotes com dependências de Node para um upload de
navegador; a versão própria custou **~1 KB**. Verificado em browser real: 15 MB
viraram 3 pedaços (6+6+3) e o arquivo remontado bateu **SHA-256 idêntico**.

**Upload em série, não em `Promise.all`.**
20 arquivos em paralelo disputam a mesma banda: todas as conexões ficam lentas,
nenhuma termina. E um arquivo recusado não invalida o lote: o que subiu, fica.

**ZIP escrito à mão, sem biblioteca.**
`src/lib/zip.ts` implementa o formato *store*: CRC32, cabeçalhos locais,
diretório central, EOCD. Foto e vídeo já são comprimidos — comprimir de novo
gasta CPU do cliente para economizar quase nada. Validado em duas camadas: no
Node (`unzip -t`) e no browser (WebM extraído **byte a byte idêntico**).

**`?download=` na URL do Storage em vez de `<a download>`.**
O atributo `download` é **ignorado** em link cross-origin — o arquivo abre na
aba. O Supabase aceita `?download=<nome>` e responde com
`Content-Disposition: attachment`.

**Imagem de nota nunca embutida no conteúdo.**
Base64 dentro do HTML faria cada autosave reescrever megabytes; URL assinada
expiraria dentro do texto salvo. O HTML guarda `src="anexo:<caminho>"` e a URL
assinada é gerada na hora de exibir, com `data-anexo` segurando a ida e volta.

**Fixar não é editar: gatilho próprio para `notas`.**
O gatilho genérico `set_atualizado_em()` carimba a data em qualquer update.
Com ele, fixar ou soltar tornava a nota "a mais recente": ela pulava para o
topo da seção das soltas e a data na lista mudava sem ninguém ter escrito nada.
Medido: uma nota de 3 minutos atrás virou a mais nova da lista só por ter sido
fixada e solta. O gatilho de `notas` só carimba quando título, conteúdo,
desenho ou imagens mudam.

**PDF pela impressão do navegador, não por `jsPDF` + `html2canvas`.**
Aquele caminho tira uma FOTO da tela: texto que não dá para selecionar nem
buscar, imagem reamostrada e quebra de página no meio do parágrafo. O motor do
navegador já resolve paginação, fonte e imagem em resolução cheia, e não custa
dependência nenhuma. O preço é um clique: a pessoa escolhe "Salvar como PDF".
Verificado gerando o PDF de verdade: **1 página**, texto extraível por
`pdftotext`, imagem embarcada a 400×300 e **sem** o cabeçalho nem a lista do app.

**`display: none` no app ao imprimir, não `visibility: hidden`.**
`visibility` esconde mas MANTÉM a altura: uma nota de três linhas saía em duas
páginas, a segunda em branco, ocupada pelo app invisível.

**Largura da imagem no atributo `width`, não em style inline.**
É o atributo que atravessa o salvar, o reabrir e a impressão sem depender do
CSS do app. Só a largura é guardada — a altura fica `auto`, o que mantém a
proporção sem precisar guardá-la.

**O editor da nota remonta pela `key`, não pelas deps do TipTap.**
`useEditor` cria o gerenciador da instância uma vez só, num `useState`. Trocar
o array de dependências não garante que o `content` novo seja aplicado — abrir
outra nota montava o editor vazio com o conteúdo certo em mãos.

**A nota nunca vem do cache (`gcTime: 0`).**
Trocar de nota muda a chave da consulta, e o React Query entrega na hora o que
tiver guardado — que podia ser a versão de quando a nota foi criada, ainda
vazia. É o mesmo erro que o canvas cometeu com `staleTime: Infinity`, em outra
roupa (ver seção 9).

**Texto puro do HTML com uma quebra por bloco.**
`textContent` cola tudo: `<p>Título</p><p>Corpo</p>` virava "TítuloCorpo" e o
título da nota saía grudado no primeiro parágrafo.

**`position: absolute` ancorado no painel, não `fixed`.**
O painel anima com `transform`, e um ancestral com transform vira bloco de
contenção — o "fixo" passa a ser fixo dentro dele. Foi o bug do teleprompter,
resolvido com `createPortal` no `document.body`; e a razão de o bloco de notas
nascer como filho direto do `SheetContent`.

**`#variable_conflict use_variable` no `enviar_ajuste`.**
Os parâmetros `texto` e `autor` tinham o mesmo nome das colunas. O PL/pgSQL
resolvia para a coluna e **o autor era gravado sempre nulo**.

**Erro de banco traduzido em instrução.**
`42703`, `42P01`, `PGRST204` e `PGRST202` significam sempre a mesma coisa: falta
rodar a migração. O app diz o que fazer em vez de vazar o erro do Postgres.
`413` e `415` viram instrução sobre limite e formato.

**`UPDATE` sempre com `.select()` de volta.**
Um UPDATE que não acerta nenhuma linha volta **sem erro** do Postgres —
confirmado em banco local. Sem o retorno, a tela diz "Salvo" com nada gravado.

**Tipos de linha como `type`, não `interface`.**
O client do Supabase exige `Record<string, unknown>`. `interface` não ganha
assinatura de índice implícita e quebra a tipagem inteira.

---

## 9. Limites reais que testamos

Não são estimativas: foram medidos ou lidos na documentação oficial.

### Supabase — o limite de upload que vale é o do projeto
O tamanho máximo mora em três camadas e vale **sempre a menor**: o app (300 MB),
o bucket (300 MB) e o **limite global do projeto**, que só muda no painel em
*Storage → Settings → Global file size limit* e vem com **50 MB** de padrão.

| Plano | Teto por arquivo |
| --- | --- |
| Free | **50 MB** |
| Pro / Team | 500 GB |

Consequência: **no plano Free um Reels de 178 MB não sobe**, com qualquer
configuração. Não é limitação do app — é teto de plano.

**Egress** é o limite mais esquecido: cada cliente que abre o preview baixa o
vídeo. No Free são 5 GB/mês → **~28 aberturas** de um vídeo de 178 MB.

### Canva — o carrossel não importa sozinho
Testado ao vivo na Connect API: exportamos páginas de um carrossel real e cada
slide voltou como **1080×1350 (4:5)** — 1,99 MB em PNG, **~290 KB em JPG q85**.
Os links expiram em horas.

O bloqueio não é técnico, é comercial: integração **privada** exige **Canva
Enterprise**; **pública** exige passar pela revisão da Canva. Por isso a opção
manual: botão com o link + check de visto. Custo zero.

### Instagram — não dá para agendar pela plataforma
A Content Publishing API **não tem parâmetro de agendamento**: quem agenda é o
app, o que exige um servidor rodando. Publicar em conta própria usa Standard
Access sem App Review; em conta de cliente exige Advanced Access + App Review +
verificação do negócio. Carrossel pela API: **máximo 10 itens** (a interface
aceita 20).

### Métricas de perfil — nenhum conector disponível entrega `@euraphaelaraujo`

Verificado por chamada, não por memória, em 09/10/2026:

- **Algrow** é inteligência de **YouTube**. `resolve_handle('@euraphaelaraujo')`
  responde 404 ("não é um canal"), e `get_channel_daily_analytics` exige um
  `UC…` de 24 caracteres. O que ele faz com Instagram é **por vídeo**
  (`analyze_video`, `download_video`, `fetch_transcript`) — análise de
  conteúdo, não métrica de conta. Não serve de fonte para o Relatório.
- **Swisz** entrega métricas de Instagram de verdade (`swisz_insta_resumo`,
  `swisz_insta_evolucao`, `swisz_insta_ranking`), mas está fixo em
  **`@swiszoficial`**: as ferramentas não têm parâmetro de perfil.
- **InsightfulPipe** não está instalado. **Windsor.ai** aparece como conexão
  incompleta.

Além disso, conector é ferramenta **desta sessão**, não do app publicado: a
tela na Vercel só enxerga o Supabase. Por isso o Relatório lê do banco e a
entrada é por importação — qualquer fonte que produza uma linha por dia serve,
e trocar de fonte não mexe na tela.

**Seguidores não voltam.** `swisz_insta_evolucao` só tem `seguidores` a partir
de 16/09/2026; antes disso o coletor não rodava e a Meta **não devolve
seguidores retroativo**. "Todos os meses arquivados" só existe a partir do dia
em que alguém começa a arquivar — é exatamente por isso que o Relatório mostra
a cobertura de cada período em vez de preencher o buraco.

### Métricas do Instagram: a coleta do Relatório

**Rotina** `trig_01UrGTx4LJYk74pyWikgQsLD` — "Métricas do Instagram no
Relatório", **três vezes por dia** (07:08, 13:08 e 19:08 de Brasília). Ela instala a CLI, autentica com a
chave, roda o coletor e grava pela porta estreita (`rpc/ingerir_metricas`).
Nada de importar à mão.

O coletor canônico é `scripts/rotina-metricas/coletor.py`;
`scripts/gerar-prompt-metricas.mjs` monta o prompt da rotina com ele dentro. A
sessão disparada não tem o repositório, então o script precisa viajar no
prompt — e copiá-lo à mão sairia de sincronia na segunda vez, o mesmo motivo
de `gerar-setup-completo.mjs` existir para o SQL.

**Perfis**: a coleta varre as contas de Instagram **da marca 6366 (Swisz)** e
cria o perfil no Relatório sozinha, na primeira corrida. Conta nova conectada
naquela marca entra na coleta sem mexer em nada. As contas das outras marcas do
workspace nem entram na lista — é o filtro que garante que a coleta não as
toque.

**Janela**: 7 dias **até hoje**, a cada corrida. Duas razões, e as duas
importam. A Meta fecha a janela do dia com atraso, então gravar só "ontem"
congelaria um número provisório. E o dia corrente vem parcial de propósito: é
ele que cresce entre uma corrida e outra — é isso que faz valer rodar três
vezes ao dia em vez de uma. O upsert é por `(perfil, dia)`: a corrida das 19h
sobrescreve a das 13h, e a da manhã seguinte fecha o número.

A tela diz quando foi a última coleta ("Coleta automática há 2 h") e avisa que
o dia de hoje ainda está em andamento. Sem isso, um número velho e um número
fresco têm a mesma cara, e ninguém sabe se o painel parou de atualizar.

**`ingerir_metricas` usa `coalesce(novo, antigo)`** em cada coluna: nulo
significa "esta coleta não trouxe este campo", não "o valor é nulo".
Sobrescrever com nulo apagaria o salvamento que veio de importação manual só
porque a API de conta não entrega salvamento por dia.

#### Histórico: até onde a API vai

Medido no projeto dele, não deduzido: a série diária volta pelo menos até
**setembro de 2025** — 390 dias no arquivo. `scripts/rotina-metricas/historico.py`
faz o mutirão inicial, varrendo 30 dias por vez (o limite da Meta por pedido),
do mais antigo para o mais novo: se a cota acabar no meio, o que falta é
passado distante e não o mês que ele está olhando.

Uma armadilha que custou uma execução: **`follower_count` só existe nos
últimos 30 dias**. Pedido para trás disso, a Meta recusa a janela INTEIRA — e
aí nem o alcance vem. O script pede o ganho de seguidores só na janela recente;
nos meses antigos o campo fica nulo, que é a verdade (não temos), e não zero.

#### O ganho de seguidores com um snapshot só

A API não devolve histórico do TOTAL de seguidores — só o ganho de cada dia.
Então a coleta grava o total uma vez por corrida, no último dia da janela.

Isso quebrou o cálculo do período, e só apareceu com dado real: `ganhoDe`
preferia a diferença entre o primeiro e o último snapshot do período, e com um
snapshot só os dois eram a MESMA linha — diferença zero. O painel mostrava
"Ganho de 0 no período" ao lado de 58 seguidores ganhos somados, e comparava
esse zero com a soma do mês anterior: **-100%**, sem queda nenhuma.

A regra agora exige dois snapshots **em dias diferentes**; sem isso, vale a
soma dos ganhos diários. A preferência pela diferença continua certa quando ela
existe: `follower_count` conta quem ENTROU, e a diferença entre dois totais é o
líquido — inclui quem saiu.



`scripts/puxar-metricas.mjs` puxa os dias de `@euraphaelaraujo` pela CLI da
InsightfulPipe e imprime o JSON que a aba Relatório importa.

A credencial fica na CLI (`insightfulpipe auth`, chaveiro do sistema). O script
nunca vê a chave — ele chama a CLI já autenticada. Chave de API em arquivo
versionado é chave vazada.

O workspace tem outras contas conectadas (outra marca, contas de anúncio de
terceiros). Três travas para nenhuma delas ser tocada: os ids da conta são
fixos no arquivo, toda chamada é de leitura (`query`, nunca `action`) e a
primeira coisa que o script faz é conferir que o perfil devolvido é
`@euraphaelaraujo` — se o id responder como outra conta, ele para sem coletar.

Três detalhes da API da Meta que o script resolve, e que custam caro se
ficarem errados:

1. **`followers_count` e `follower_count` diferem por uma letra e são opostos.**
   O primeiro é o total do perfil (4.399); o segundo é quantos entraram
   naquele dia (4). O apelido de importação mapeava os dois para "seguidores",
   e o gráfico desceria de 4.399 para 4 parecendo dado, não defeito. Pego na
   conferência do arquivo antes de ele ser usado; agora há teste.
2. **`until` é exclusivo**, então para incluir o último dia pede-se o dia
   seguinte. E o balde carimbado com `end_time` de 19/10 É o dia 19/10 — isso
   foi medido contra o total de um dia só, não deduzido.
3. **Só `reach` e `follower_count` aceitam série temporal.** O resto vem como
   total de um intervalo, por isso o laço dia a dia. E a janela máxima da Meta
   para insights de conta é de 30 dias: o script recusa `--dias` maior em vez
   de fatiar e dar impressão de histórico completo.

`salvamentos` fica de fora: a API de conta não entrega salvamento por dia, só
por publicação. Preencher com zero inventaria queda; ausente a tela mostra como
cobertura incompleta, que é a verdade.

### A coleta de notícias: como ela roda

A tela não pode fazer isso sozinha. O app roda no navegador e, para gravar em
nome do usuário sem a sessão dele aberta, precisaria de uma chave de escrita
dentro do bundle — que é chave pública. Então a coleta roda **fora** do app e o
Supabase é o ponto de encontro.

As três peças:

1. **Routine** `trig_01LCPbNiHyETcnQ5dADJd7PU` — "Notícias — varredura de
   manhã, checagem ao meio-dia e à noite",
   `CRON_TZ=America/Sao_Paulo 52 6,12,18 * * 1-5`. Dispara uma sessão nova
   **três vezes por dia útil**, às 06:52, 12:52 e 18:52 de Brasília.

   O horário não é a hora cheia de propósito: a maioria dos agendamentos cai
   no minuto 0, e fila de servidor ali atrasa a execução. 06:52 é o mesmo
   horário na prática, sem a fila.

   **As três corridas não fazem a mesma coisa**, e isso é o ponto inteiro do
   desenho. O próprio prompt descobre em qual modo está:

   ```bash
   export HORA=$(TZ=America/Sao_Paulo date +%H)
   [ "$HORA" -lt 10 ] && export MODO=varredura || export MODO=checagem
   ```

   | Modo | Quando | O que é | Régua |
   | --- | --- | --- | --- |
   | **varredura** | 06:52 | a coleta do dia: varre as quatro frentes, janela de 48h | 5 a 9 itens, relevância ≥ 3 |
   | **checagem** | 12:52 e 18:52 | só o que surgiu nas últimas ~6 horas | 0 a 3 itens, **relevância 4 ou 5** |

   Na checagem, **"Nada novo desde a coleta da manhã." é a saída esperada e
   desejável** — uma linha, sem lista, sem JSON. O prompt diz isso com todas as
   letras porque o risco de rodar mais vezes não é técnico, é de atenção: uma
   sessão que precisa justificar a própria corrida enche a lista de "vale
   saber", e três listas infladas por dia destroem exatamente a utilidade da
   aba, que é ele estar atualizado em cinco minutos. Por isso a régua SOBE na
   checagem em vez de descer, e análise, retrospectiva e "o que esperar de"
   ficam para a varredura do dia seguinte — elas não perdem validade em seis
   horas.

   Repetição não é um risco aqui: cada corrida lê `urls_de_noticias` (30 dias)
   antes de pesquisar, e nas checagens é essa consulta que faz quase todo o
   trabalho — a maior parte do que aparecer já vai estar gravada da manhã.

   O custo real é outro, e é o que vale revisar depois de uma semana: **três
   sessões e três notificações por dia útil** em vez de uma. Se as checagens
   virarem ruído, há dois ajustes de uma linha: cair para `52 6,13 * * 1-5`
   (duas corridas) ou desligar o push e deixar a checagem só gravando.
   Fim de semana continua fora — notícia de sábado entra na varredura de
   segunda.

2. **A sessão** pesquisa, cura pela régua de relevância, monta o JSON e publica
   com `curl` direto no PostgREST. Antes de pesquisar ela lista as URLs dos
   últimos 30 dias, para não recolher o que já entrou — o upsert sozinho só
   pega URL idêntica, e a mesma história num link diferente passaria.

   **A sessão disparada NÃO tem o repositório clonado** (`sources: []`,
   `config:no-git-repo`). Descoberto na primeira execução de teste, não em
   produção: a versão original do prompt mandava rodar
   `node scripts/importar.mjs`, que não existe naquela máquina. Por isso o
   prompt é autossuficiente — dois `curl` e um `python3 -c`, sem depender de
   clone de repositório privado todo dia.

3. **`scripts/importar.mjs`** continua no repositório para uso manual e para
   qualquer outro agendador que tenha o checkout. Faz o mesmo upsert, com
   `--listar N` para a deduplicação.

#### Por que a automação ficou travada — e o que destravou

A primeira versão pedia três variáveis de ambiente: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_USER_ID`. Nenhuma chegava na sessão
disparada — testado em 13/10/2026 por duas sessões novas e independentes, as
duas sem nenhuma delas. Depois ficou visível no próprio objeto da rotina: o
`session_request` dela carrega `environment_variables: {}`.

Duas coisas estavam erradas, e a segunda é a que importa:

1. **Lugar errado.** "Network secrets" é credencial de saída para o proxy, não
   variável de ambiente do shell. (Eu mandei ele salvar ali.)
2. **Mecanismo errado para o problema.** Mesmo funcionando, aquele desenho
   colocava a `service_role` — a chave que ignora a RLS inteira, lê e apaga
   qualquer tabela — dentro de toda sessão que rodasse naquele ambiente. Para
   inserir cinco linhas por dia em duas tabelas.

A saída foi uma **porta estreita**, em `20260914001400_ingestao.sql`:

| Peça | O que faz |
| --- | --- |
| `chaves_de_ingestao` | guarda o **hash** do token (sha256), nunca o token |
| `criar_chave_de_ingestao(rotulo)` | gera o token e mostra UMA vez; regerar com o mesmo rótulo derruba o anterior |
| `ingerir_noticias(token, linhas)` | upsert em `noticias` por `(user_id, url)` |
| `ingerir_eventos(token, linhas)` | upsert em `eventos` por `(user_id, data, titulo)` |
| `urls_de_noticias(token, dias)` | devolve só as URLs guardadas — o mínimo para não repetir |

As funções são `security definer` com `search_path` fixo, e quem chama é a
chave `anon` — a mesma que já está no bundle do site e que, sozinha, não grava
nada (a RLS barra). Quem autoriza a escrita é o token, dentro da função.

O que isso muda na prática: se o token vazar, o estrago é alguém sujar a lista
de notícias dele, e um `delete` resolve. Com a `service_role` no lugar dele, o
estrago seria o banco inteiro. É a diferença entre perder a chave do depósito e
perder a chave do cofre.

E como nenhum dos três valores é mais uma chave mestra — URL e `anon` já são
públicas, o token só insere —, **os três passaram a morar no prompt da própria
rotina**, que é um mecanismo que comprovadamente funciona. A automação deixou
de depender das variáveis de ambiente que nunca chegaram.

A rotina continua com dois modos de primeira classe:

| Modo | Quando | O que faz |
| --- | --- | --- |
| **Entrega** | falta alguma variável | pesquisa, cura e termina com o JSON pronto num bloco de código; o Rapha cola em Notícias → Importar coleta |
| **Publicação** | o bloco de credenciais está preenchido | grava direto pela porta estreita, sem ninguém no meio |

O modo entrega **não é fallback**, e o prompt diz isso com todas as letras: texto
com cara de erro todo dia de manhã treina a pessoa a ignorar a notificação. A
saída é formatada para celular — destaque do dia, contagem, e o JSON como
ÚLTIMA coisa da mensagem, para dar para selecionar sem caçar onde termina.

O preço do modo entrega é a deduplicação: sem credencial não dá para consultar
o que já foi coletado, e a sessão não lembra de ontem. Sobra a janela de 48h
como defesa. Repetição não estraga o banco — a importação é por URL e atualiza
em vez de duplicar — mas polui a leitura, e era o primeiro motivo real para
resolver as credenciais. Em modo publicação isso some: `urls_de_noticias`
devolve o que já entrou nos últimos 30 dias.

#### As quatro frentes

A coleta começou só em moda e cresceu para **economia, política e
empreendedorismo**, porque decisão de estoque e de preço não é tomada só com
notícia do setor: juros, câmbio e tributação mudam a conta antes de qualquer
tendência.

| Frente | Cota na varredura | Filtro |
| --- | --- | --- |
| Moda e e-commerce | 3 a 5 | marketplace, importação, concorrência, logística, devolução |
| Economia | 1 a 3 | Selic, câmbio, inflação, varejo restrito, inadimplência — só o que mexe na conta dele |
| Política | 0 a 2 | **só** o que vira regra ou custo: tributária, ICMS, trabalhista, acordo comercial |
| Empreendedorismo | 0 a 2 | gestão e processo com caso real e número |

O filtro de política é o mais duro, e é de posicionamento, não de curadoria:
**disputa partidária, eleição e declaração polêmica não entram nunca.** Ele é
dono de operação que precisa saber o que muda na conta — não comentarista
político. Conteúdo partidário no perfil dele custa audiência e não traz
nenhuma.

A editoria **não virou coluna** no banco: é a primeira etiqueta de `tags`.
Coluna nova exigiria migração e, pior, obrigaria a reclassificar as notícias
que já estão lá — que são todas de moda e continuam certas sem tocar em nada.
A tela conta e filtra por editoria (`editoriaDe`, em `src/lib/noticias.ts`), e
a fileira de frentes só aparece quando existe mais de uma na base.

Na varredura de segunda a mesma sessão também procura calendário novo de
feira (nas checagens, não — calendário de feira não muda de seis em seis horas). Em modo
publicação ela grava o evento **direto na tabela `eventos`** — a data aparece na
grade no mesmo dia, sem branch e sem deploy. Em modo entrega ela só reporta a
data em texto, porque **não existe tela para cadastrar um evento à mão**: o
único caminho de entrada é o botão do catálogo. É uma lacuna conhecida; se
acontecer com frequência, vale um formulário de "nova data" no painel do dia.

**Nota sobre conectores:** a Routine não carrega conectores MCP (Exa, Swisz,
Canva). Não precisa: a pesquisa usa a busca web embutida, que não é conector.
O que ela não consegue fazer é puxar dado proprietário do Swisz — isso continua
sendo trabalho de sessão.

### Vercel
- `VITE_*` é variável de **build**: mudar sem redeploy não muda nada.
- O tipo precisa ser **Config**, não Secret.
- **Deployment Protection** bloqueia *todas* as rotas, inclusive `/preview/:id`.

---

## 10. Como colocar no ar

### 1. Banco
Abra `supabase/setup-completo.sql`, **copie o conteúdo do arquivo** (Ctrl+A,
Ctrl+C) e cole no SQL Editor do Supabase. Não cole o caminho do arquivo.

```
https://raw.githubusercontent.com/designerswisz3-byte/calendario/main/supabase/setup-completo.sql
```

O arquivo é **gerado** por `scripts/gerar-setup-completo.mjs` a partir das
migrações, e é **idempotente**.

> **Atenção à transação.** O SQL Editor roda o script inteiro numa transação:
> se a parte de Storage falhar com *"must be owner of table objects"*, **tudo é
> desfeito**, inclusive as tabelas. Se isso acontecer, rode o script sem as
> seções de Storage e crie os buckets pela interface: `media` como **Public** e
> `canvas` como **privado**.
>
> Para conferir num segundo:
> ```sql
> select to_regclass('public.notas') as notas,
>        to_regclass('public.calendar_items') as calendario,
>        (select count(*) from storage.buckets where id in ('media','canvas')) as buckets;
> ```

**Para a coleta de notícias gravar sozinha**, rode também
`supabase/porta-de-ingestao.sql` (é o mesmo conteúdo da migração
`20260914001400`, num arquivo separado para colar sem procurar). Depois, num
editor limpo, **digitando a linha** — ela fica comentada no arquivo de
propósito, para que reexecutar o arquivo inteiro não rotacione o token sem
querer:

```sql
select criar_chave_de_ingestao('rotina de notícias');
```

> Com `--` na frente ela é comentário, e o SQL Editor responde *"Success. No
> rows returned"* — que é o editor dizendo "não rodei nada". Já aconteceu.

Ela devolve o token **uma vez** — o banco guarda só o hash. Cole-o, junto com a
URL do projeto e a chave `anon`, no bloco de credenciais do prompt da rotina
diária. Perdeu o token? Rode de novo: o anterior para de valer na hora.

### 2. Frontend
Na Vercel → Settings → Environment Variables:

| Nome | Tipo | Valor |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Config | URL do projeto |
| `VITE_SUPABASE_ANON_KEY` | Config | chave **anon** (nunca a `service_role`) |

Salve e **faça redeploy**. Depois desligue a Deployment Protection.

### 3. Conferir
Abra `/login`, crie a conta, crie um conteúdo em `/criar`, copie o link e abra
**em aba anônima**. Se abrir sem pedir login e o post aparecer, está no ar.

---

## 11. Como isto é testado

Esta seção existe porque três bugs seguidos escaparam do mesmo jeito: eu
testava a camada que eu tinha escrito, com o banco falso, e os bugs estavam na
**fronteira com o banco de verdade**.

O harness de teste sobe, localmente:

1. **Postgres 16** com `auth.users`, `auth.uid()` e as migrações aplicadas
2. **PostgREST** com um JWT assinado, falando a mesma API do Supabase
3. Um **proxy** de 30 linhas mapeando `/rest/v1/*` para a raiz do PostgREST
4. A página **real**, com os hooks de produção — só o `useAuth` é falso
5. **Playwright** dirigindo um Chromium de verdade

As asserções que importam **olham o que o usuário olha**:

- contagem de **pixels desenhados no canvas**, não linhas no banco
- o **HTML dentro do editor**, não a resposta da API
- o conteúdo depois de **trocar de tela sem F5**, que é o caminho que o usuário usa e o F5 não cobre

- o **texto extraído do PDF** com `pdftotext`, não o HTML que gerou o PDF
- o número na tela conferido contra uma **soma independente** dos dados de
  origem, nunca contra a mesma função que a tela usou para calcular

Foi assim que apareceram, antes de subir: o título grudado no parágrafo, o
editor montando vazio ao trocar de nota, e o cache servindo a nota velha.

**Nas Datas e nas Notícias**, 42 asserções no navegador contra o banco real e
45 de biblioteca pura. Pegaram três coisas:

1. `scripts/importar.mjs` falhava com `PGRST102 — All object keys must match`
   (e a mesma pedra apareceu de novo no caminho do `curl`, confirmada com uma
   requisição de propósito malformada antes de o comando entrar na Routine).
   O PostgREST monta um único comando a partir das chaves do PRIMEIRO objeto do
   lote, e a coleta real tem itens com e sem `publicado_em`. O supabase-js
   normaliza isso por dentro, então o mesmo JSON passava pela tela e quebrava
   no script — ou seja, o caminho do agendador era o único quebrado, e era o
   que ninguém veria falhar.
2. `npm run lint` **não checava nada**. O `tsconfig.json` da raiz tem
   `files: []` e só referências, e `tsc --noEmit` não compila referências:
   o comando saía com 0 sobre qualquer código. Trocado por `tsc -b --force`,
   que na mesma hora apontou dois erros reais que estavam no diretório.
3. A faixa de evento de vários dias afinava nos dias do meio (rótulo vazio sem
   altura mínima), e a feira de seis dias parecia três eventos soltos.

**Nos Stories**, 99 asserções de motor puro e 116 no navegador contra o banco
real. Pegaram seis coisas:

1. A rotação das sugestões cobria só **13 dos 21 temas** em um mês. A semente
   era a soma dos caracteres da data, e `2026-10-09` soma igual a `2026-10-18`:
   a janela parava nos mesmos lugares. Trocada por dias-desde-a-epoch, que anda
   exatamente uma casa por dia — 21 de 21.
2. Português de robô na primeira frase: *"Antes de a arara virar venda"*. O
   gerador concatenava `de` + descrição sem contrair. Agora contrai (`da`,
   `do`, `das`, `dos`), e o artigo indefinido fica solto de propósito, porque
   "dum" soa datado em texto que vai ser lido em voz alta.
3. O molde de curiosidade era *"Antes de X virar venda"*, que só fecha quando X
   é produto — metade dos temas mostra uma tela, uma mesa de devolução ou a
   equipe. Trocado por *"Por trás de X existe uma decisão que quase ninguém
   vê"*, verificado sobre os 21 temas.
4. *"Você com a arara com as peças…"* — o objeto do tema já costuma trazer um
   "com". A direção de câmera da autoridade virou "Em cena: …".
5. Na rodada da variedade, a varredura sobre 2.016 sequências pegou frases que
   só quebram em alguns temas: *"A peça que encalhou, ainda no estoque neste
   momento."* e *"Por trás da arara do modelo, separada por tamanho existe uma
   decisão"*. Metade dos temas tem uma vírgula no meio do `oQueMostrar`, e
   qualquer palavra colada depois dele entra na oração errada. Regra que ficou:
   **campo do tema fecha a frase**.
6. Dois stories seguidos podiam terminar na mesma linha (bastidor e tempo real
   citam os dois o objeto), e na tela isso parece repost. O gerador passa para
   a variante seguinte quando o fechamento se repete — 0 pares em 2.688
   sequências.

Três dessas só apareceram porque o teste roda o gerador sobre **todos** os
temas, em todos os arcos, e lê a frase resultante — em vez de conferir um
exemplo. Testar um caso teria passado.

Vale registrar também o que os testes antigos *não* pegaram: duas asserções
codificavam o defeito. Uma exigia que a curiosidade começasse em "Por trás
d…", a outra que todo story 7 trouxesse as opções do compromisso — e as duas
passavam exatamente porque existia uma única redação possível. Teste que fixa a
frase impede a variedade de nascer; o que vale fixar é o **movimento**.

**Na gaveta**, 23 asserções no navegador arrastando de verdade (mouse com
passos — `dnd-kit` não reconhece um salto). Elas pegaram um defeito do próprio
teste que valia por um produto: o alvo `Dia 27` casa com DUAS células na grade
de outubro de 2026, que começa em 27 de setembro. O teste arrastou a ideia para
setembro e deu certo. Em grade de calendário, seletor por número de dia precisa
de um dia que só exista uma vez no mês desenhado.

Também vale registrar um susto do harness: a imagem de apoio chegava quebrada
na tela, e parecia bug do app. Era o stub de Storage guardando o envelope
`multipart/form-data` inteiro como se fosse o PNG — o supabase-js manda o
arquivo como form-data no navegador. Defeito do harness disfarçado de defeito
do produto; o stub passou a desembrulhar.

**No Relatório**, com 100 dias de dados reais de `@swiszoficial` (julho a
outubro de 2026, com o buraco real de seguidores antes de 16/09) e 49
asserções, o teste pegou quatro coisas que o typecheck não pegaria:

1. `paraNumero('muitas')` devolvia **0** — a limpeza de caracteres deixava
   string vazia e `Number('')` é zero. Texto lixo entrava no banco como um dia
   de zero, que a agregação somaria como coleta real.
2. O rodapé dizia "Fonte dos dados: **manual**" depois de uma importação
   vinda do coletor — lia o campo do cadastro do perfil em vez da fonte das
   linhas.
3. Cartão vazio nos dois lados dizia "sem dado no **período anterior**",
   sugerindo que o número atual existia.
4. O PDF saía com um retângulo cinza do tamanho da página: o fundo do `<body>`
   continua pintando depois que o conteúdo do app é escondido.

---

## 12. Histórico

| # | Commit | O que entrou |
| --- | --- | --- |
| 1 | `fce4378` | setup do projeto e design system de glassmorphism |
| 2 | `0018bdb` | migrações SQL, políticas de RLS e bucket de storage |
| 3 | `40b6fce` | login e cadastro com Supabase Auth |
| 4 | `19e26ac` | ferramenta de criação e link público do post |
| 5 | `7f421aa` | calendário mensal, painel do dia e integração com a criação |
| 6 | `67be54f` | README e configuração de deploy |
| 7 | `e693ed9` | `config.toml` e a integração com o GitHub |
| 8 | `bde765f` | **correção de segurança**: leitura pública passa a exigir o id |
| 9 | `3e9b5c5` | servidor MCP do Supabase no escopo do projeto |
| 10 | `46d65ad` | remoção da tela de login em favor de sessão anônima |
| 11 | `d2e0c3b` | **revertido**: volta a tela de login + `setup-completo.sql` |
| 12 | `3a82d31` | até 20 mídias por conteúdo, misturando imagem e vídeo |
| 13 | `dae65cc` | carrossel respeita a proporção da arte; vídeo até 300 MB |
| 14 | `6a6db05` | botão AJUSTES no link público |
| 15 | `d093e8b` | som, linha do tempo e volume no preview |
| 16 | `425e472` | legenda do reels sai de cima do vídeo; painel do dia arrastável |
| 17 | `813f00b` | separa briefing de roteiro e adiciona o teleprompter |
| 18 | `839bfb9` | abas sempre acessíveis e erro de migração que se explica |
| 19 | `a01f996` | link do Canva no preview, com visto que o expert controla |
| 20 | `427724c` | botão para baixar as mídias no link público |
| 21 | `8049a12` | este documento |
| 22 | `828c970` | upload resumável para vídeos grandes, com progresso |
| 23 | `6504249` | bloco de notas ao lado do painel do dia |
| 24 | `49d977e` | item se chama pelo briefing; mês mostra passado/hoje/futuro |
| 25 | `e1f2dd3` | aba Canvas, um quadro infinito |
| 26 | `245b7a4` | **fix**: laço de salvamento que deixava a tela preta |
| 27 | `f2cfccf` | **fix**: gravação silenciosa e nota do tamanho do texto |
| 28 | `72ef31e` | **fix**: voltar para a tela montava o quadro vazio e apagava o trabalho |
| 29 | `9d5be92` | aba **Notas**, estilo Apple + ligações estilo Obsidian |

Os commits 10 e 11 são o mesmo pedido em duas direções — tirar o login e voltar
atrás. Ficam no histórico porque a reversão é informação: a sessão anônima
funcionava, mas some quando o cliente limpa o navegador.

Os commits 25–28 são a aba Canvas inteira: nascimento, três correções e, no
29, substituição pelas Notas. O que sobreviveu dela foi o desenho (agora dentro
da nota), o bucket privado e as três lições de cache que a seção 8 registra.

---

## 13. O que não existe (e o que custaria)

| Ideia | Situação | O que travaria |
| --- | --- | --- |
| Grafo visual das notas | **não** | a navegação real acontece pelos dois painéis de ligação; o grafo é a parte cara e menos usada |
| Importar carrossel do Canva automaticamente | **não** | exige Canva Enterprise ou revisão da Canva |
| Agendar post no Instagram | **não** | a API não agenda; exige servidor + App Review para contas de cliente |
| Arrastar para reordenar as fixadas | não | refixar sobe a nota, o que cobre o caso com poucas fixadas |
| Exportar várias notas num PDF só | não | o botão exporta a nota aberta |
| Imagens dentro do desenho | não | o desenho salva as formas, não os arquivos colados nele |
| Renomear nota sem quebrar ligações | não | a ligação é por título — é o preço da escrita sem fricção |
| Aprovar/reprovar com um clique no link público | não | hoje o retorno é texto livre em AJUSTES |
| Notificação quando o cliente responde | não | exige e-mail transacional ou webhook |
| Times / mais de um usuário por conta | não | a RLS é por `auth.uid()`, um dono por linha |
| Métricas do post publicado | não | exige Instagram Graph API + vínculo da conta |

---

## 14. Estrutura de arquivos

```
src/
├── components/
│   ├── auth/       AuthProvider, ProtectedRoute
│   ├── calendar/   MonthGrid, DayCell, DayPanel, CalendarItemForm, BlocoDeNotas,
│   │               Teleprompter, AjustesDoCliente, ListView, AgendaView, FiltersBar…
│   ├── layout/     AppShell, ErrorBoundary, ThemeToggle, SupabaseSetupNotice
│   ├── notas/      EditorDeNota, DesenhoDaNota, PainelDeLigacoes
│   ├── preview/    InstagramPreview, InstagramCarousel, InstagramReel, VideoPlayer,
│   │               MediaUploader, AjustesPanel, CanvaPanel, DownloadPanel…
│   └── ui/         shadcn/ui escritos à mão sobre Radix
├── hooks/          useNotas, useCalendarItems, useContentPreviews, useAjustes,
│                   useMediaUpload, useLarguraPainel, useTags, useTheme, queryKeys
├── lib/            supabase, date, constants, texto, zip, download, tusUpload,
│                   notasAnexos, notasLinks, utils
├── pages/          NotasPage, CalendarPage, CreatePage, PublicPreviewPage,
│                   LoginPage, NotFoundPage
└── types/          database.ts

scripts/
├── copiar-fontes-excalidraw.mjs   roda no predev/prebuild
└── gerar-setup-completo.mjs       regenera o SQL consolidado

supabase/
├── migrations/     9 migrações, em ordem
├── setup-completo.sql   gerado — é este que se roda no SQL Editor
└── config.toml
```

### Comandos

| Comando | O quê |
| --- | --- |
| `npm run dev` | sobe o Vite (copia as fontes antes) |
| `npm run build` | typecheck + build de produção |
| `npm run lint` | só o typecheck |
| `npm run fontes` | copia as fontes do Excalidraw para `public/fonts` |
| `node scripts/gerar-setup-completo.mjs` | regenera o SQL consolidado |
