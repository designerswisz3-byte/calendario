# Calendário Editorial + Preview de Conteúdo

Ferramenta de planejamento e criação de conteúdo para Instagram, com duas partes integradas:

1. **Ferramenta de preview** — você monta o post (expert, legenda, mídia) e gera um **link público** onde o cliente vê uma simulação fiel do feed do Instagram, sem poder editar nada.
2. **Calendário editorial** — planejamento mensal por dia (tipo, status, tags, horário, notas), de onde você dispara a criação do conteúdo da Parte 1 — sem nunca duplicar os campos de legenda/upload.

> **[`PROJETO.md`](PROJETO.md)** — o registro completo: decisões, modelo de segurança,
> limites reais do Canva e do Instagram que testamos, custos e histórico. Este README
> é o passo a passo para rodar; aquele é o documento de handover.

---

## Stack

| Camada | Escolha |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS + componentes shadcn/ui (Radix UI por baixo) |
| Rotas | React Router |
| Backend | Supabase (Postgres + Auth + Storage) |
| Estado remoto | React Query (`@tanstack/react-query`) |
| Drag-and-drop | `@dnd-kit/core` |
| Deploy | Vercel ou Netlify (configs inclusas) |

## Arquitetura

```
Browser (React 18 + Vite + TS)
│
├── React Router ── públicas: /login, /preview/:id
│                └─ privadas:  /criar, /calendario   (ProtectedRoute + Supabase Auth)
│
├── React Query ── única camada de acesso a dados (src/hooks/*)
│      └── @supabase/supabase-js ──> Supabase
│                                     ├── Postgres + RLS (dono = auth.uid())
│                                     │    └── content_previews/media_assets: SELECT público
│                                     ├── Auth (e-mail + senha)
│                                     └── Storage bucket `media` (leitura pública)
│
└── dnd-kit ── 2 usos: reordenar imagens do carrossel + mover item entre dias
```

**A regra que mantém as duas partes separadas:**

- `calendar_items` = **planejamento** (tipo, status, tags, horário, notas).
- `content_previews` = **conteúdo** (expert, legenda, mídia).
- O elo é `content_previews.calendar_item_id`, com índice único: um item de planejamento tem no máximo um conteúdo. É isso que faz "Editar conteúdo" reaproveitar o mesmo `id` em vez de criar um segundo registro.

O painel do dia **nunca** mostra legenda, upload ou nome do expert — esses campos existem só em `/criar`.

---

## Como rodar

### 1. Instalar

```bash
npm install
```

### 2. Criar o projeto no Supabase

Há dois caminhos. Escolha **um**.

#### Caminho A — integração GitHub → Supabase (automático)

Se você conectou este repositório ao projeto no **Supabase Dashboard → Integrations → GitHub**, as migrações de `supabase/migrations/` são aplicadas sozinhas a cada push na branch de produção configurada lá.

Para funcionar, confira no dashboard:

- **Supabase directory** apontando para `supabase` (é onde ficam `config.toml` e `migrations/`)
- **Production branch** apontando para a branch que você usa de fato (`main` neste repo)

Depois do push, confirme em **Table Editor** que apareceram as 5 tabelas: `calendar_items`, `content_previews`, `media_assets`, `tags` e `calendar_item_tags`.

> Se a migração `20260914000200_storage_media_bucket.sql` falhar com erro de permissão (`must be owner of table objects`), rode **só esse arquivo** no SQL Editor. Criar policy em `storage.objects` exige privilégio que nem todo pipeline tem.

#### Caminho B — SQL Editor (manual, um único copiar-e-colar)

Abra o **SQL Editor** do projeto, cole o conteúdo de **`supabase/setup-completo.sql`** e rode. É a junção das três migrações na ordem certa, e é idempotente — rodar de novo não quebra nada.

Se preferir arquivo por arquivo, rode nesta ordem:

- `supabase/migrations/20260914000100_init_schema.sql` — tabelas, índices, triggers e RLS
- `supabase/migrations/20260914000200_storage_media_bucket.sql` — bucket `media` e políticas de Storage
- `supabase/migrations/20260914000300_preview_publico_apenas_por_id.sql` — fecha a leitura anônima das tabelas e expõe o preview por função

Ao final, confirme no **Table Editor** que existem 5 tabelas. Se não existirem, nada do app funciona — é a primeira coisa a checar quando o calendário aparece vazio ou dá erro ao salvar.

#### Nos dois casos

Em **Project Settings → API**, copie a URL e a chave `anon` — elas vão no `.env` local e nas variáveis de ambiente da Vercel.

> A integração com o GitHub aplica o **banco**, mas não entrega as chaves para o frontend. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam sendo configuração da Vercel.

E em **Authentication → URL Configuration**, coloque a URL da Vercel em *Site URL*, senão o link de confirmação de e-mail aponta para `localhost`.

### 3. Configurar o ambiente

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Sem isso, o app abre uma tela explicando o que falta em vez de quebrar.

### 4. Rodar

```bash
npm run dev      # http://localhost:5173
npm run build    # build de produção em dist/
npm run lint     # typecheck (tsc --noEmit)
```

---

## Modelo de dados

| Tabela | Papel |
| --- | --- |
| `calendar_items` | Planejamento do dia: `data`, `horario`, `tipo`, `status`, `notas` |
| `content_previews` | Conteúdo criado: `nome_expert`, `legenda`, `tipo`, `calendar_item_id` |
| `media_assets` | Imagens do carrossel (com `ordem`) ou o vídeo do reels/story |
| `tags` | Tags do usuário, com cor |
| `calendar_item_tags` | Relação N:N entre item de planejamento e tags |

**Status** (funil editorial, nesta ordem):
`ideia → roteiro → design → em_aprovacao → aprovado → agendado → publicado`

### Row Level Security

Todas as tabelas têm RLS ligado.

- Tabelas com `user_id`: `SELECT/INSERT/UPDATE/DELETE` só para `auth.uid() = user_id`.
- `calendar_item_tags` não tem `user_id` — herda o dono via `EXISTS` no `calendar_items`.
- **Nenhuma tabela tem leitura anônima.** O link público passa pela função `get_public_preview(uuid)` (veja abaixo).
- Storage: bucket `media` com leitura pública e escrita só do usuário autenticado, dentro da pasta `<user_id>/`.

### Por que o link público usa uma função, e não a tabela

A primeira versão dava `SELECT` público (`using (true)`) em `content_previews` e `media_assets`. O link funcionava — mas RLS é por **linha**, não por formato de consulta. Com a chave `anon`, que vai no bundle JavaScript público, qualquer pessoa podia fazer `GET /rest/v1/content_previews` e **listar o conteúdo não publicado de todos os clientes**, sem saber id nenhum.

A especificação pede leitura pública "apenas via id" — e isso não se expressa numa policy. A migração `20260914000300` corrige:

1. Remove o `SELECT` anônimo das duas tabelas (passa a ser só do dono).
2. Cria `public.get_public_preview(preview_id uuid)` como `SECURITY DEFINER`, com `search_path` fixado, retornando **uma** linha e só os campos que o cliente precisa ver — sem `user_id`, sem `calendar_item_id`.
3. Concede `EXECUTE` a `anon`.

Resultado, validado contra um Postgres real: anônimo lista `0` linhas nas tabelas, mas recebe o post completo ao chamar a função com o id certo, e `null` com um id inexistente.

---

## Briefing, roteiro e teleprompter

O item de planejamento tem dois textos, em abas:

- **Briefing** — ângulo, gancho, referências. É o campo `notas`, o mesmo que sempre existiu: nada foi movido, e tudo que já estava escrito continua ali.
- **Roteiro** — o texto falado, na coluna nova `roteiro`. É ele que alimenta o teleprompter.

A separação existe porque são textos com funções diferentes: o briefing é para pensar, o roteiro é para gravar. Misturar os dois num campo só significa caçar a fala no meio da estratégia, na hora da gravação.

No painel do dia, a aba Roteiro traz o botão **Abrir teleprompter**: tela cheia, texto grande e centralizado, rolando sozinho. Contagem regressiva de 3 segundos ao abrir, para posicionar a câmera.

Tudo que muda o ritmo pode ser mexido **durante** a gravação, porque ninguém acerta a velocidade de primeira e parar para reconfigurar significa regravar:

| Controle | Atalho |
| --- | --- |
| Pausar / retomar | `espaço` ou `K` |
| Velocidade | `↑` `↓` |
| Tamanho da fonte | `+` `−` |
| Voltar ao início | `R` |
| Espelhar (rigs com vidro) | `M` |
| Fechar | `Esc` |

Velocidade, fonte e espelhamento ficam guardados no navegador. Os controles somem sozinhos enquanto o texto rola, para não aparecerem na gravação — mexer o mouse os traz de volta. Uma linha fina marca a altura de leitura, e o texto começa e termina no centro da tela, que é onde a câmera fica.

O teleprompter **substitui** o painel do dia em vez de conviver com ele: o overlay modal do Sheet bloquearia os cliques dos controles. Ao fechar, o painel volta no mesmo dia.

## Download das mídias

O link público tem um botão **Baixar mídias**. Uma mídia baixa direto; várias viram um ZIP, porque disparar N downloads seguidos faz o navegador bloquear do segundo em diante. Vale para qualquer formato — o que estiver no conteúdo é o que sai no pacote.

O ZIP é escrito à mão em `src/lib/zip.ts`, sem compressão (método *store*), em vez de importar uma biblioteca. JPEG, PNG e MP4 já são formatos comprimidos: passar deflate neles rende perto de zero e custa CPU. O ZIP aqui é só o recipiente, e a página que o cliente carrega não engorda ~30 KB por um recurso secundário.

Abaixo do botão há a lista arquivo por arquivo. Não é redundância: é a rota de fuga. Se empacotar falhar — rede, CORS, memória — os links individuais continuam funcionando, porque não dependem de JavaScript: usam o parâmetro `?download` do Storage, que faz o próprio Supabase mandar `Content-Disposition: attachment`. O atributo `download` do `<a>` sozinho não resolveria: ele é ignorado quando o arquivo está em outra origem, e o Storage é outra origem.

Os arquivos saem nomeados por expert e posição (`swiss-boutique-01.jpg`), não com o UUID do Storage.

## Arte no Canva e o visto do expert

O conteúdo pode guardar o link do projeto no Canva (`content_previews.canva_url`). Quando existe, o link público mostra um botão **Abrir arte no Canva** — o expert entra e ajusta o texto da arte sem você intermediar.

Abrir a arte já marca o visto: quem clicou viu, e pedir confirmação depois seria um passo a mais para dizer o que a ação já disse. O check continua clicável, para desmarcar quando ele quiser revisitar. Você enxerga o estado num selo no painel do dia e num aviso na tela de edição, com data e hora.

A escrita segue o mesmo padrão dos ajustes: quem clica é anônimo, então passa por `marcar_canva_visto()`, uma função `SECURITY DEFINER`. A tabela `content_previews` continua fechada para `anon`.

A URL é restrita aos domínios do Canva, por CHECK no banco e validação na tela. O endereço aparece num link público: um erro de colagem viraria um link para qualquer lugar na cara do cliente.

> **Sobre importar as artes automaticamente:** a Connect API do Canva devolve uma imagem por página (verificado: um carrossel de 9 páginas exportou em PNG 1080x1350, 4:5). Mas integração privada exige plano **Canva Enterprise**, e a alternativa é publicar uma integração pública e passar pela revisão do Canva. Por isso o upload segue manual.

## Ajustes: o retorno do cliente

O link público tem um botão **AJUSTES**. O cliente escreve o que precisa mudar — sem limite de caracteres, sem contador — assina se quiser, e envia. O pedido aparece para você em dois lugares: um selo no painel do dia e um card na tela de edição, ao lado do preview.

A parte delicada é que quem abre o link é anônimo e o RLS bloqueia escrita anônima. Em vez de liberar `INSERT` para `anon` na tabela — o que deixaria qualquer um escrever em qualquer lugar — a escrita passa por `enviar_ajuste()`, uma função `SECURITY DEFINER` que só sabe fazer uma coisa: anexar um texto a um preview que existe. A tabela `ajustes` continua fechada para `anon`, inclusive para leitura.

Há um teto de 100 mil caracteres no banco. Não é para restringir o cliente — nenhum retorno humano chega perto disso — é para um endpoint anônimo não virar porta de despejo.

## Fluxo de integração entre as partes

1. No painel do dia, cada item de planejamento tem um botão **"Criar conteúdo"**.
2. Ele leva para `/criar?calendar_item_id=<id>`.
3. Ao gerar o link, o registro em `content_previews` já nasce vinculado àquele `calendar_item_id`.
4. De volta ao calendário, o dia mostra o conteúdo criado: thumbnail, nome do expert e link de preview acessível direto dali.
5. Se o item já tem conteúdo, o botão vira **"Editar conteúdo"** e reabre `/criar` com os dados carregados — **mantendo o mesmo `id` do preview**, sem criar um segundo registro.
6. Arrastar um item de um dia para outro atualiza **só** `calendar_items.data`. O vínculo com o conteúdo vai junto.

---

## Rotas

| Rota | Login | O que é |
| --- | --- | --- |
| `/login` | não | Entrar / cadastrar |
| `/criar` | sim | Criação do conteúdo + preview ao vivo |
| `/criar?calendar_item_id=<id>` | sim | Idem, já vinculado a um dia do calendário |
| `/preview/:id` | **não** | Simulação do Instagram, somente leitura — é o link que vai para o cliente |
| `/calendario` | sim | Calendário mensal + lista + painel do dia |

---

## Design system

Glassmorphism minimalista em todo o app — **exceto** `/preview/:id`, que imita o Instagram real.

- `backdrop-filter: blur(16px)` sobre fundo semi-transparente, em cima de um gradiente neutro sutil
- Bordas finas semi-transparentes (1px) e sombras suaves e difusas
- Paleta neutra cinza-azulada, com **um único acento**: `#6366f1` — usado no dia atual, botões primários e no badge "publicado"
- Modo claro e escuro completos (`.dark` na raiz, preferência salva em `localStorage`)
- Transições de 200–300 ms, cantos arredondados consistentes

As classes utilitárias `.glass`, `.glass-strong` e `.glass-panel` estão em `src/index.css`.

---

## Detalhes de implementação que importam

**Timezone.** `calendar_items.data` é um `date` puro do Postgres. `new Date('2026-09-14')` seria interpretado como UTC e o dia "voltaria" um em fusos negativos (ex.: America/Sao_Paulo). Por isso toda conversão passa por `toDateKey` / `parseDateKey` em `src/lib/date.ts`, sempre em horário local.

**Uma query por mês.** O calendário carrega item + tags + conteúdo + mídias numa chamada só (`calendar_item_tags(tags(*)), content_previews(*, media_assets(*))`), evitando N+1 para desenhar as thumbnails.

**Drag-and-drop otimista.** O card se move na hora; se o banco recusar, o estado volta e aparece um toast.

**Mídias.** Até 20 por conteúdo, misturando imagens e vídeos no mesmo conjunto — é o que o carrossel do Instagram aceita. A posição na tela de criação é gravada em `media_assets.ordem`, e é a ordem que o cliente vê no link.

O upload sempre aceita as 20; quem decide quantas aparecem é o formato. Carrossel exibe todos os slides (imagem e vídeo, só o slide visível toca); Post único, Reels e Story usam a primeira mídia e avisam na tela quando há outras guardadas. Assim trocar de formato não descarta upload nenhum.

**Painel do dia arrastável.** A borda esquerda do painel é uma alça: arraste para alargar, duplo clique para restaurar. Um briefing de reels tem dezenas de linhas, e lê-lo numa coluna de 512px é desconfortável. A largura fica guardada no navegador, entre 380px e a janela menos 120px — sempre sobra uma faixa do calendário à vista, para o painel não virar tela cheia sem querer.

**Legenda do formato vertical.** Reels e Story usam a mesma casca do carrossel: cabeçalho, mídia 9:16, barra de interação e a legenda ABAIXO da mídia. A legenda já ficou em overlay sobre o vídeo, como no app, mas um roteiro de reels cobria o vídeo inteiro — justamente o que o cliente precisa ver para aprovar. Dentro da mídia ficaram só os elementos que identificam o formato.

**Vídeo no preview.** Tem som, linha do tempo arrastável e controle de volume. Começa mudo por imposição do navegador — todos bloqueiam autoplay com áudio, e sem o mudo o vídeo simplesmente não tocaria; o som fica a um clique. A escolha de som e volume vale para o carrossel inteiro, então quem tirou o mudo no slide 2 não precisa tirar de novo no slide 3. Só o slide visível toca; os outros pausam e rebobinam, para 20 vídeos não disputarem rede e CPU.

**Proporção do preview.** A moldura do carrossel assume a proporção real da primeira mídia, como o Instagram faz — e não um quadrado fixo. Sem isso, uma arte 4:5 (o formato mais comum de carrossel) perdia topo e base, justamente onde costuma ficar a chamada final. O intervalo é o que o Instagram aceita de fato, de 1.91:1 a 4:5; arte mais alta que isso ele corta mesmo, e o preview mostra o corte em vez de mentir que cabe.

**Limite de upload.** Imagem até 10 MB, vídeo até 300 MB. O número vive em três lugares que precisam concordar: o app (`MAX_VIDEO_SIZE_MB`), o bucket (migração `20260914000400`) e o teto do plano do Supabase. Esse último não se resolve por SQL — no plano Free o limite por arquivo é de 50 MB, e nenhuma configuração de bucket passa por cima.

**Code splitting.** As rotas são lazy. O link público não baixa o bundle do calendário para renderizar um post.

---

## Deploy

Já configurado para deploy padrão em ambos:

- **Vercel** — `vercel.json` com rewrite de SPA
- **Netlify** — `netlify.toml` com build, publish e redirect de SPA

O rewrite é obrigatório: sem ele, abrir `/preview/:id` direto (ou dar F5) devolve 404.

### Vercel, passo a passo

1. Abra **[vercel.com/new](https://vercel.com/new)** e importe `designerswisz3-byte/calendario`.
2. A Vercel detecta Vite sozinha — build `npm run build`, output `dist`. Não mexa.
3. Em **Environment Variables**, antes de clicar em Deploy, adicione as duas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

São variáveis de **build**: o Vite injeta os valores no bundle na hora do build. Se você adicionar depois, precisa fazer **Redeploy** para elas valerem.

Sem essas duas variáveis o build passa, o link abre — e mostra a tela "Configure o Supabase". Não é bug.

---

## Critérios de aceite

- [x] Criar item de planejamento no dia 14/09 e ver o botão "Criar conteúdo"
- [x] "Criar conteúdo" leva para `/criar` com a data já associada
- [x] Preencher expert, legenda e imagens, gerar link e voltar: o dia 14/09 mostra o conteúdo criado
- [x] Abrir o link em aba anônima (sem login) e ver a simulação do Instagram
- [x] Reabrir o item e ver "Editar conteúdo", com os dados carregados e o mesmo `id`
- [x] Arrastar o item para 16/09 e o conteúdo vinculado se mover junto
- [x] Recarregar a página e os dados persistirem via Supabase

## Estrutura

```
src/
├── components/
│   ├── auth/        AuthProvider, ProtectedRoute
│   ├── calendar/    MonthGrid, DayCell, DayPanel, ListView, AgendaView, filtros, tags
│   ├── layout/      AppShell, ThemeToggle, SupabaseSetupNotice
│   ├── preview/     InstagramPreview (feed + reels/story), MediaUploader
│   └── ui/          shadcn/ui (button, dialog, sheet, select, toast, …)
├── hooks/           React Query: calendar items, previews, tags, upload, tema, media query
├── lib/             cliente Supabase, constantes, helpers de data, cn()
├── pages/           Login, Create, PublicPreview, Calendar, NotFound
└── types/           tipos do banco
supabase/            setup-completo.sql + migrations/ (schema, RLS, storage)
```
