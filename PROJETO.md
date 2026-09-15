# Projeto: Calendário Editorial + Preview de Conteúdo

Registro completo do que foi construído: o produto, as decisões, os limites
reais que testamos e o que ficou de fora. O `README.md` responde *como rodar*.
Este documento responde *o que existe e por quê* — é o documento de handover.

- **Repositório:** `designerswisz3-byte/calendario`
- **Branches:** `main` e `claude/criacao-pdf-q9fjoh` (mantidas idênticas)
- **Commits:** 20
- **Migrações SQL:** 7 (consolidadas em `supabase/setup-completo.sql`)

---

## 1. O produto em uma frase

Uma ferramenta onde **você planeja o mês, escreve o briefing e o roteiro, monta
o post e manda um link** — e o cliente abre esse link sem login, vê o post
exatamente como vai sair no Instagram, escreve os ajustes, abre a arte no Canva
e baixa as mídias.

A premissa que organiza tudo: **o campo existe em um lugar só.** Legenda, mídia
e nome do expert vivem na ferramenta de criação. O calendário não duplica nada —
ele dispara a criação e depois mostra o resultado. Toda vez que uma decisão de
produto apareceu, foi essa regra que decidiu.

### As duas partes

| Parte | Onde | Quem usa | Login |
| --- | --- | --- | --- |
| **Criação + link público** | `/criar` → `/preview/:id` | você monta, o cliente vê | criar exige; ver, não |
| **Calendário editorial** | `/calendario` | você | sim |

---

## 2. Estado atual

Funcionando e no ar:

- Calendário mensal com arrastar-e-soltar entre dias, filtros, visão de lista e agenda
- Painel do dia redimensionável, com abas **Briefing** e **Roteiro**
- **Teleprompter** em tela cheia, com velocidade, pausa e espelhamento
- Criação de conteúdo com até **20 mídias** misturando foto e vídeo
- Link público com simulação fiel do feed (carrossel, reels, story, post único)
- Player de vídeo com **som, linha do tempo e volume**
- Botão **AJUSTES** — o cliente escreve sem limite de caracteres
- Botão do **Canva** com **visto** que o expert marca e desmarca
- Botão **DOWNLOAD DE MÍDIA** — arquivo único ou tudo em `.zip`

Dependências de ambiente (fora do código):

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel, **tipo Config** (não Secret), com redeploy depois de salvar
- `supabase/setup-completo.sql` rodado no SQL Editor do Supabase
- Deployment Protection **desligada** na Vercel — com ela ligada, `/preview/:id` pede login e o produto perde o sentido

---

## 3. Stack

Definida na especificação, sem alternativas.

| Camada | Escolha |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 5 |
| Estilo | Tailwind CSS 3.4 + shadcn/ui (Radix UI por baixo) |
| Rotas | React Router 6 |
| Backend | Supabase — Postgres + Auth + Storage |
| Estado remoto | React Query 5 — **única** camada de acesso a dados |
| Drag-and-drop | `@dnd-kit/core` + `/sortable` + `/modifiers` |
| Ícones | `lucide-react` |
| Deploy | Vercel (`vercel.json`) ou Netlify (`netlify.toml`) |

Nenhuma dependência de UI pronta para Instagram, teleprompter, player ou ZIP.
Tudo isso é código nosso — o motivo está na seção 8.

---

## 4. Arquitetura

```
Browser (React 18 + Vite + TS)
│
├── React Router ── públicas: /login, /preview/:id
│                └─ privadas:  /criar, /calendario   (ProtectedRoute + Supabase Auth)
│
├── React Query ── única camada de acesso a dados (src/hooks/*)
│      └── @supabase/supabase-js ──> Supabase
│                                     ├── Postgres + RLS (dono = auth.uid())
│                                     │    └── anônimo entra só por 3 funções SECURITY DEFINER
│                                     ├── Auth (e-mail + senha)
│                                     └── Storage bucket `media` (leitura pública)
│
└── dnd-kit ── 2 usos: reordenar mídias do carrossel + mover item entre dias
```

`/preview/:id` é **lazy** e não carrega o bundle do calendário. É a rota que vai
para o cliente; ela não deve pagar o custo do app inteiro para desenhar um post.

### Rotas

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `/` | — | redireciona para `/calendario` |
| `/login` | pública | e-mail + senha (entrar e cadastrar) |
| `/preview/:id` | **pública** | simulação do Instagram + ajustes + Canva + download |
| `/criar` | privada | monta o conteúdo e gera o link |
| `/calendario` | privada | mês, painel do dia, briefing, roteiro, teleprompter |
| `*` | — | 404 |

---

## 5. Modelo de dados

Seis tabelas. As cinco primeiras vieram da especificação; `ajustes` nasceu do
pedido do botão AJUSTES.

### `calendar_items` — o planejamento do dia
`id`, `user_id`, `data`, `horario`, `tipo`, `status`, `notas`, `roteiro`,
`criado_em`, `atualizado_em`

- `tipo`: `carrossel` · `reels` · `story` · `post` · **`ideia`**
- `status`: `ideia` → `roteiro` → `design` → `em_aprovacao` → `aprovado` → `agendado` → `publicado`
- `notas` é o **Briefing**. `roteiro` foi adicionado depois, e é o que alimenta o teleprompter.

### `content_previews` — o conteúdo e o link
`id`, `user_id`, `calendar_item_id`, `nome_expert`, `legenda`, `tipo`,
`canva_url`, `canva_visto`, `canva_visto_em`, `criado_em`, `atualizado_em`

O `id` **é** o link: `/preview/<id>`.

Um índice único parcial garante **um conteúdo por item de planejamento** —
é ele que impede o calendário de virar um segundo lugar para escrever legenda:

```sql
create unique index content_previews_calendar_item_id_key
  on content_previews (calendar_item_id) where calendar_item_id is not null;
```

### `media_assets` — as mídias, na ordem
`id`, `content_preview_id`, `url_arquivo`, `ordem`, `tipo`, `criado_em`

`ordem` é o que o drag-and-drop escreve. `tipo` distingue imagem de vídeo —
sem isso o carrossel misto não saberia o que renderizar em cada slide.

### `tags` e `calendar_item_tags`
`tags`: `id`, `user_id`, `nome`, `cor` · `calendar_item_tags`: chave composta `(calendar_item_id, tag_id)`

### `ajustes` — o retorno do cliente
`id`, `content_preview_id`, `texto`, `autor`, `criado_em`

Sem limite de caracteres, por pedido explícito. **Não tem política de INSERT** —
e isso é intencional; ver a seção seguinte.

### Colunas que nasceram depois da especificação

| Coluna | Migração | Por quê |
| --- | --- | --- |
| `calendar_items.roteiro` | `...000600` | separar Briefing de Roteiro sem perder nenhum texto já salvo |
| `content_previews.canva_url` | `...000700` | link da arte para o expert editar o texto |
| `content_previews.canva_visto` | `...000700` | o check que o expert marca **e desmarca** |
| `content_previews.canva_visto_em` | `...000700` | quando ele marcou |

---

## 6. Segurança

### A regra base
RLS ligada nas seis tabelas. Toda política de dono é `auth.uid() = user_id`.
Ninguém lê nem escreve o conteúdo de outro usuário.

### O problema que o link público cria
O cliente não tem login. Ele precisa **ler um preview** e **escrever um ajuste**
sendo anônimo. A saída óbvia — liberar SELECT para `anon` — foi exatamente o
defeito que embarcamos e depois corrigimos.

> **Defeito real, corrigido na migração `...000300`.** A política
> `content_previews_select_public` liberava SELECT para `anon` sem exigir o `id`.
> Isso significava que qualquer pessoa com a chave anônima — que é pública por
> design — podia **listar todos os previews de todos os clientes** sem conhecer
> link nenhum. Provado no Postgres: `anonimo lista 1 preview(s) SEM saber o id`.
> Depois da correção: `0 linhas`.

### Como ficou
Anônimo não tem acesso direto a tabela nenhuma. Ele passa por **três funções
`SECURITY DEFINER`**, todas com `search_path` fixado em `public, pg_temp`:

| Função | O que faz | Por que é função, e não política |
| --- | --- | --- |
| `get_public_preview(preview_id uuid)` | devolve o preview + mídias + ajustes em JSON | obriga a **saber o id**; sem id, não há resultado |
| `enviar_ajuste(preview_id, texto, autor)` | grava um ajuste | permite escrever **um** ajuste sem abrir INSERT na tabela |
| `marcar_canva_visto(preview_id, visto)` | marca/desmarca o visto | mesma lógica: uma ação específica, não acesso à tabela |

A diferença é o formato do acesso: uma política é uma **porta**, uma função é um
**balcão**. Com porta, quem entra escolhe o que faz lá dentro. Com balcão, só dá
para pedir o que está no cardápio — e o cardápio tem três itens.

### Storage
Bucket `media` com leitura pública (o cliente precisa ver a imagem) e escrita
restrita à pasta do próprio usuário:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Limite de arquivo: **300 MB**.

### Chaves
- A chave **anônima** é pública por design — ela vai no bundle e é protegida pela RLS. Está certo ela estar lá.
- A chave **`service_role` ignora RLS por completo.** Ela nunca deve ser colada em chat, commitada no repositório ou usada no frontend. Não existe caso de uso legítimo para ela nesse app.

---

## 7. O que cada tela faz

### `/calendario`
Grade do mês com os itens em cada dia. Arrastar um card move o item de data
(atualização otimista — o card muda na hora, o banco confirma depois). Filtros
por tipo, status e tag. Visão de lista e visão de agenda. Barra de progresso do mês.

### Painel do dia
Abre ao clicar no dia. **Arrastável pela borda esquerda** para ficar mais largo —
briefing longo em painel estreito é desconfortável de ler, e essa foi a razão do
pedido. A largura escolhida fica salva no navegador, e acompanha se a janela
encolher em vez de estourar a tela.

Duas abas:

- **Briefing** — o contexto. Todo texto que já existia continua aqui.
- **Roteiro** — o que vai ser falado. É o que o teleprompter lê.

As duas abas ficam **sempre habilitadas**, mesmo vazias. A primeira versão
desabilitava a aba Roteiro quando não havia texto — e isso criava um beco sem
saída: não dava para escrever o roteiro porque a aba estava desabilitada, e ela
estava desabilitada porque não havia roteiro. Hoje a aba vazia mostra um botão
**Escrever** que abre o formulário **já na aba certa**.

### Teleprompter
Tela cheia, com atalhos de teclado: velocidade (↑ ↓), tamanho da fonte (+ −),
pausar e continuar (espaço ou K), voltar ao início (R), espelhar o texto (M) e sair
(Esc). Velocidade, fonte e espelhamento ficam guardados — ninguém acerta a
velocidade de primeira, e parar para reconfigurar no meio da gravação é perder
a tomada. Fecha e devolve o painel do dia exatamente como estava.

### `/criar`
Nome do expert, legenda com contador de **2.200 caracteres** (o limite real do
Instagram), tipo do conteúdo e upload de mídia:

- Até **20 mídias**, misturando foto e vídeo — é o teto do carrossel do Instagram
- Imagem até **10 MB**, vídeo até **300 MB**
- O carrossel exibe todas; reels, story e post único usam a primeira
- Arrastar para reordenar
- Preview ao vivo do lado enquanto você monta

Gera o link público ao salvar.

### `/preview/:id` — a tela que vai para o cliente
Sem login, sem edição. É a única parte do app que **não** usa glassmorphism —
ela imita o Instagram, e qualquer estilo nosso ali quebraria a ilusão.

- **Carrossel** — proporção natural da arte, contador `n/n`, só o slide ativo toca
- **Reels / Story** — vídeo 9:16, legenda **abaixo** do vídeo (nunca por cima)
- **Post único** — imagem única
- **Player** — som original, linha do tempo arrastável e controle de volume sempre visível
- **AJUSTES** — texto sem limite; o retorno aparece para você no painel do dia
- **Canva** — botão que abre a arte + check de visto que o expert marca e desmarca
- **Download de mídia** — um arquivo por vez ou **tudo em `.zip`**, com progresso

---

## 8. Decisões de engenharia que importam

Cada uma dessas existe porque a alternativa óbvia falhou em um caso real.

**Data no fuso local, nunca `new Date('YYYY-MM-DD')`.**
Essa forma é interpretada como UTC pelo JavaScript. Em UTC−3, um item marcado
para o dia 1º aparece no dia 31 do mês anterior. `src/lib/date.ts` faz toda
conversão no fuso local.

**Proporção natural da arte, limitada à faixa do Instagram.**
A primeira versão cortava as imagens em quadrado. O Instagram aceita de 1.91:1
até 4:5 — então a moldura respeita a proporção original e só limita quando ela
sai dessa faixa. Recortar arte de cliente sem avisar é destruir trabalho dos outros.

**ZIP escrito à mão, sem biblioteca.**
`src/lib/zip.ts` implementa o formato *store* (sem compressão): CRC32, cabeçalhos
locais, diretório central, EOCD. Foto e vídeo já são formatos comprimidos —
comprimir de novo gasta CPU do cliente para economizar quase nada. São ~110 linhas
contra uma dependência inteira no bundle de uma página pública.
Validado em duas camadas: no Node (`unzip -t` OK, com acentos e subpasta) e no
browser (WebM extraído **byte a byte idêntico**, 82.789 bytes, reproduzível).

**Upload resumável (TUS) escrito à mão, acima de 6 MB.**
`supabase.storage.upload()` manda o arquivo inteiro num POST só. Para um vídeo
de 178 MB isso é: nenhum progresso na tela por minutos (a aba parece travada,
e as pessoas fecham), nenhuma retomada se a conexão oscilar, e um timeout que
joga fora tudo que já subiu. `src/lib/tusUpload.ts` fala o protocolo direto —
POST para criar, PATCH de 6 MB por pedaço. Sem `tus-js-client`, que traz 21
pacotes e dependências de Node (`proper-lockfile`, `is-stream`) para um upload
de navegador; a versão à mão custou **~1 KB** no bundle de `/criar`.
Verificado em browser real contra um servidor TUS mock: 15 MB viraram 3 pedaços
(6 + 6 + 3 MB) e o arquivo remontado bateu **SHA-256 idêntico** ao original.

**Upload em série, não em `Promise.all`.**
A versão anterior subia os 20 arquivos em paralelo. Com vídeos grandes isso é
20 conexões disputando a mesma banda: todas ficam lentas, nenhuma termina, e o
navegador começa a derrubar. Em série cada arquivo termina antes e o progresso
é honesto. E um arquivo recusado não invalida o lote: o que subiu, fica.

**`?download=` na URL do Storage em vez de `<a download>`.**
O atributo `download` é **ignorado** pelo browser em link cross-origin — o arquivo
abre na aba em vez de baixar. O Supabase Storage aceita `?download=<nome>` e
responde com `Content-Disposition: attachment`, que funciona.

**Teleprompter renderizado via `createPortal` no `document.body`.**
`position: fixed` não cobria a tela: um ancestral com `transform` cria um bloco
de contenção e o "fixo" passa a ser fixo *dentro dele*. Medido: `1440x880 em (0, 20)`.
Depois do portal: `1440x900 em (0,0)`.

**Estado do teleprompter no `CalendarPage`, não dentro do painel.**
O overlay do Radix Sheet (`z-50`, `aria-hidden`) interceptava os cliques. O
teleprompter agora **substitui** o painel e o restaura ao fechar.

**`#variable_conflict use_variable` no `enviar_ajuste`.**
Os parâmetros `texto` e `autor` tinham o mesmo nome das colunas. O PL/pgSQL
resolvia para a coluna, e **o autor era gravado sempre nulo**. Pego por teste
próprio: `autor gravado: (nulo)`.

**Erro de banco traduzido em instrução.**
Os códigos `42703`, `42P01`, `PGRST204` e `PGRST202` significam sempre a mesma
coisa na prática: falta rodar a migração. Em vez de vazar o erro do Postgres, o
app diz o que fazer — *"falta rodar `supabase/setup-completo.sql` no SQL Editor"*.

**Tipos de linha como `type`, não `interface`.**
O client do Supabase exige `Record<string, unknown>`. `interface` não ganha
assinatura de índice implícita e quebra a tipagem inteira — todas as operações
de tabela resolvem para `never`.

---

## 9. Limites reais que testamos

Estes números não são estimativa. Foram medidos ou lidos na documentação oficial.

### Canva — o carrossel **não** importa sozinho
Testado ao vivo na Connect API: exportamos 3 páginas de um carrossel real de 9,
e o slide 1 voltou como PNG **1080×1350 (4:5), 1,99 MB**. Ou seja: a API funciona,
uma página vira uma imagem, e o link expira em **~24 h** (`X-Amz-Expires=86953`).

O bloqueio não é técnico, é comercial:

- **Integração privada** (só sua conta) → exige **Canva Enterprise**
- **Integração pública** → exige passar pela revisão da Canva

Por isso seguimos com a opção manual: **botão para o link do Canva + check de
visto** controlado pelo expert. Custo zero, sem dependência de plano e sem link
que expira em um dia.

Conta de armazenamento, se um dia a importação automática for ligada:
1,99 MB por slide × 9 slides ≈ **18 MB por carrossel** → cerca de **55 carrossels**
no 1 GB gratuito do Supabase. Exportar em JPG em vez de PNG muda essa conta
por um fator grande.

### Instagram — **não dá para agendar pela plataforma**
A Content Publishing API **não tem parâmetro de agendamento**. Quem agenda é o
app: ele guarda a data e publica na hora. Isso exige um servidor rodando —
o frontend sozinho não faz.

Outros limites que valem antes de qualquer decisão:

- Publicar em conta **sua ou que você administra**: Standard Access, **sem App Review**
- Publicar em conta **de cliente**: Advanced Access + App Review + verificação do negócio
- Carrossel pela API: **máximo 10 itens** (a interface aceita 20)
- A mídia precisa estar em **URL pública** — que o bucket `media` já fornece

### Supabase — o limite de upload que vale é o do projeto
O tamanho máximo mora em três camadas e vale **sempre a menor**: o app (300 MB),
o bucket (300 MB) e o **limite global do projeto**, que só muda no painel em
*Storage → Settings → Global file size limit* e vem com **50 MB** de padrão.

Confirmado na documentação: *"you can specify the maximum file size on a per
bucket level but it can't be higher than this global limit"*.

| Plano | Teto por arquivo |
| --- | --- |
| Free | **50 MB** |
| Pro / Team | 500 GB |

Consequência prática: **no plano Free um Reels de 178 MB não sobe**, com qualquer
configuração. Não é limitação do app — é teto de plano.

### Vercel
- `VITE_*` é variável de **build**. Mudar o valor sem redeploy não muda nada no site.
- O tipo precisa ser **Config**, não Secret — `VITE_` significa que o valor vai para o bundle público de qualquer forma.
- **Deployment Protection** bloqueia *todas* as rotas, inclusive `/preview/:id`. Com ela ligada, o produto não existe.

---

## 10. Como colocar no ar

### 1. Banco
Abra `supabase/setup-completo.sql`, **copie o conteúdo do arquivo** (Ctrl+A,
Ctrl+C) e cole no SQL Editor do Supabase. Não cole o caminho do arquivo.
Link direto para o conteúdo bruto:

```
https://raw.githubusercontent.com/designerswisz3-byte/calendario/main/supabase/setup-completo.sql
```

O script é **idempotente** — rodar duas vezes não quebra nada.

> O Supabase avisa *"potential destructive operation"*. O arquivo foi conferido
> linha a linha: **zero** `drop table`, `truncate`, `delete from`, `drop schema`
> ou `drop column`. O que existe são `drop policy if exists` (25 das 27 são
> recriadas na sequência; as 2 que não voltam são exatamente as políticas do
> furo de segurança) e `drop trigger` seguido de recriação. Pode seguir.

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

## 11. Histórico

| # | Commit | O que entrou |
| --- | --- | --- |
| 1 | `fce4378` | setup do projeto e design system de glassmorphism |
| 2 | `0018bdb` | migrações SQL, políticas de RLS e bucket de storage |
| 3 | `40b6fce` | login e cadastro com Supabase Auth |
| 4 | `19e26ac` | ferramenta de criação e link público do post |
| 5 | `7f421aa` | calendário mensal, painel do dia e integração com a criação |
| 6 | `67be54f` | README e configuração de deploy |
| 7 | `e693ed9` | `config.toml` e documentação da integração com o GitHub |
| 8 | `bde765f` | **correção de segurança**: leitura pública passa a exigir o id |
| 9 | `3e9b5c5` | servidor MCP do Supabase no escopo do projeto |
| 10 | `46d65ad` | remoção da tela de login em favor de sessão anônima |
| 11 | `d2e0c3b` | **revertido**: volta a tela de login + `setup-completo.sql` |
| 12 | `3a82d31` | até 20 mídias por conteúdo, misturando imagem e vídeo |
| 13 | `dae65cc` | carrossel respeita a proporção da arte; vídeo até 300 MB |
| 14 | `6a6db05` | botão AJUSTES no link público, com retorno visível para o dono |
| 15 | `d093e8b` | som, linha do tempo e volume no preview |
| 16 | `425e472` | legenda do reels sai de cima do vídeo; painel do dia arrastável |
| 17 | `813f00b` | separa briefing de roteiro e adiciona o teleprompter |
| 18 | `839bfb9` | abas sempre acessíveis e erro de migração que se explica |
| 19 | `a01f996` | link do Canva no preview do expert, com visto que ele controla |
| 20 | `427724c` | botão para baixar as mídias no link público |

Os commits 10 e 11 são o mesmo pedido em duas direções — tirar o login e depois
voltar atrás. Ficam no histórico porque a reversão é informação: a sessão anônima
funcionava, mas some quando o cliente limpa o navegador, e conteúdo de cliente
não pode depender disso.

---

## 12. O que não existe (e o que custaria)

| Ideia | Situação | O que travaria |
| --- | --- | --- |
| Importar carrossel do Canva automaticamente | **não** | exige Canva Enterprise (privada) ou revisão da Canva (pública) |
| Agendar post no Instagram | **não** | a API não agenda; exige servidor rodando + App Review para contas de cliente |
| Aprovar/reprovar com um clique no link público | não | hoje o retorno é texto livre em AJUSTES |
| Notificação quando o cliente responde | não | exige e-mail transacional ou webhook |
| Mais de um usuário por conta / times | não | a RLS hoje é por `auth.uid()`, um dono por linha |
| Métricas do post publicado | não | exige Instagram Graph API + vínculo da conta |

---

## 13. Estrutura de arquivos

```
src/
├── components/
│   ├── auth/       AuthProvider, ProtectedRoute
│   ├── calendar/   MonthGrid, DayCell, DayPanel, CalendarItemForm, Teleprompter,
│   │               AjustesDoCliente, ListView, AgendaView, FiltersBar, TagPicker…
│   ├── layout/     AppShell, ThemeToggle, SupabaseSetupNotice
│   ├── preview/    InstagramPreview, InstagramCarousel, InstagramReel, VideoPlayer,
│   │               MediaUploader, AjustesPanel, CanvaPanel, DownloadPanel…
│   └── ui/         shadcn/ui escritos à mão sobre Radix
├── hooks/          useCalendarItems, useContentPreviews, useAjustes, useMediaUpload,
│                   useLarguraPainel, useTags, useTheme, queryKeys
├── lib/            supabase, date, constants, zip, download, utils
├── pages/          CalendarPage, CreatePage, PublicPreviewPage, LoginPage, NotFoundPage
└── types/          database.ts

supabase/
├── migrations/     7 migrações, em ordem
├── setup-completo.sql   as 7 concatenadas — é este que se roda no SQL Editor
└── config.toml
```
