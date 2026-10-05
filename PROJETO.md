# Projeto: Calendário Editorial + Preview + Notas

Registro completo do que foi construído: o produto, as decisões, os limites
reais que testamos e o que ficou de fora. O `README.md` responde *como rodar*.
Este documento responde *o que existe e por quê* — é o documento de handover.

- **Repositório:** `designerswisz3-byte/calendario`
- **Branches:** `main` e `claude/criacao-pdf-q9fjoh` (mantidas idênticas)
- **Commits:** 29
- **Migrações SQL:** 9 (consolidadas em `supabase/setup-completo.sql`)

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
- Criação de conteúdo com até **20 mídias** misturando foto e vídeo, com **upload resumável**
- Link público com simulação fiel do feed (carrossel, reels, story, post único)
- Player de vídeo com **som, linha do tempo e volume**
- Botão **AJUSTES** — o cliente escreve sem limite de caracteres
- Botão do **Canva** com **visto** que o expert marca e desmarca
- Botão **DOWNLOAD DE MÍDIA** — arquivo único ou tudo em `.zip`
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
| `*` | — | 404 |

---

## 5. Modelo de dados

Sete tabelas em uso.

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

### `/calendario`
Grade do mês com os itens em cada dia. Arrastar um card move o item de data
(atualização otimista). Filtros por tipo, status e tag. Visão de lista e agenda.

**Três estados visuais**: passado (fundo escurecido), hoje (borda e anel na cor
primária) e futuro. O escurecido fica no **fundo da célula**, não nos cards —
um item atrasado precisa continuar legível, senão a sinalização esconde
justamente o que pede atenção.

O card se chama pela **primeira linha do briefing**, sempre — inclusive depois
de o conteúdo ser criado. O nome do expert é só reserva para item sem briefing.

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

Foi assim que apareceram, antes de subir: o título grudado no parágrafo, o
editor montando vazio ao trocar de nota, e o cache servindo a nota velha.

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
