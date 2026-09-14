# Calendário Editorial + Preview de Conteúdo

Ferramenta de planejamento e criação de conteúdo para Instagram, com duas partes integradas:

1. **Ferramenta de preview** — você monta o post (expert, legenda, mídia) e gera um **link público** onde o cliente vê uma simulação fiel do feed do Instagram, sem poder editar nada.
2. **Calendário editorial** — planejamento mensal por dia (tipo, status, tags, horário, notas), de onde você dispara a criação do conteúdo da Parte 1 — sem nunca duplicar os campos de legenda/upload.

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

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode em ordem:
   - `supabase/migrations/20260914000100_init_schema.sql` — tabelas, índices, triggers e RLS
   - `supabase/migrations/20260914000200_storage_media_bucket.sql` — bucket `media` e políticas de Storage
3. Em **Project Settings → API**, copie a URL e a chave `anon`.

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
- **`content_previews` e `media_assets` têm `SELECT` público** (`anon`). É o que permite o link `/preview/:id` abrir sem login. Escrita continua restrita ao dono. `media_assets` precisa da mesma liberação, senão o visitante anônimo abriria o preview sem as mídias.
- Storage: bucket `media` com leitura pública e escrita só do usuário autenticado, dentro da pasta `<user_id>/`.

---

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

**Reordenação do carrossel.** A posição das imagens na tela de criação é gravada em `media_assets.ordem` — é a ordem que o cliente vê no link.

**Code splitting.** As rotas são lazy. O link público não baixa o bundle do calendário para renderizar um post.

---

## Deploy

Já configurado para deploy padrão em ambos:

- **Vercel** — `vercel.json` com rewrite de SPA
- **Netlify** — `netlify.toml` com build, publish e redirect de SPA

O rewrite é obrigatório: sem ele, abrir `/preview/:id` direto (ou dar F5) devolve 404.

Lembre de cadastrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do serviço.

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
supabase/migrations/ schema + RLS + bucket de storage
```
