/**
 * Monta o prompt da rotina diária de métricas.
 *
 * A sessão agendada não tem o repositório clonado, então o coletor precisa
 * viajar DENTRO do prompt. Copiar e colar à mão sairia de sincronia na segunda
 * vez — o mesmo motivo de `gerar-setup-completo.mjs` existir para o SQL.
 *
 *   node scripts/gerar-prompt-metricas.mjs            # imprime
 *   node scripts/gerar-prompt-metricas.mjs --saida p.md
 *
 * Os três valores de credencial NÃO ficam aqui: o prompt sai com marcadores e
 * quem edita a rotina preenche. Chave em arquivo versionado é chave vazada.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const coletor = readFileSync(path.join(aqui, 'rotina-metricas/coletor.py'), 'utf8').trimEnd()

const prompt = `Coleta das métricas de Instagram do Raphael para a aba Relatório do app dele. Roda três vezes por dia.

A sessão não tem o repositório clonado. Tudo o que é preciso está aqui.

## 1. Credenciais

\`\`\`bash
export IP_KEY="COLE_A_CHAVE_DA_INSIGHTFULPIPE"
export SUPABASE_URL="COLE_A_URL_DO_SUPABASE"
export SUPABASE_ANON_KEY="COLE_A_CHAVE_ANON"
export INGESTAO_TOKEN="COLE_O_TOKEN_DE_INGESTAO"
export BRAND_ID=6366
export DIAS=7
\`\`\`

Se alguma linha ainda estiver com COLE_, pare e diga qual falta. Não peça credencial a ninguém e não tente contornar.

O token de ingestão só sabe inserir notícia, evento e métrica. A chave \`anon\` sozinha não grava nada. A chave da InsightfulPipe é a única com alcance maior — por isso o coletor abaixo só faz leitura (\`query\`), nunca \`action\`.

## 2. Preparar

\`\`\`bash
npm install -g insightfulpipe >/dev/null 2>&1
printf '%s' "$IP_KEY" | insightfulpipe auth --insecure-storage
insightfulpipe whoami >/dev/null || { echo "autenticação falhou"; exit 1; }
\`\`\`

## 3. Coletar e gravar

Grave o arquivo abaixo como \`/tmp/coletor.py\` **exatamente como está** e rode \`python3 /tmp/coletor.py\`.

\`\`\`python
${coletor}
\`\`\`

## 4. O que ele faz, para você conferir a saída

- Lista as contas de Instagram **da marca ${'6366'} (Swisz)**. As contas de outras marcas do workspace não são tocadas: elas nem entram na lista.
- Para cada conta: confere que o id responde com o username esperado, puxa o alcance em série, e o resto dia a dia — views, curtidas, comentários, compartilhamentos, **salvamentos**, interações, cliques, e **quantos seguiram e quantos deixaram de seguir**.
- Depois, uma linha por **publicação** do período, com as métricas de cada post.
- Grava via \`rpc/ingerir_metricas\` e \`rpc/ingerir_publicacoes\`, as duas com upsert — rodar duas vezes no mesmo dia atualiza, não duplica.
- Repuxa os últimos 7 dias, não só ontem: a Meta fecha a janela do dia com atraso, e quem grava só "ontem" congela um número provisório.
- Se aparecer **AVISO: ingerir_publicacoes não existe no banco**, repita esse aviso na sua resposta, numa linha. Não é falha da coleta: significa que falta rodar \`supabase/relatorio-publicacoes.sql\` no Supabase. O dia de métrica foi gravado assim mesmo.

## 5. Como terminar

Uma linha por perfil, exatamente o que o script imprimiu. Exemplo:

\`\`\`
2026-10-14 a 2026-10-20
@euraphaelaraujo: 7 dia(s) · 6 publicação(ões) · 4402 seguidores (+28 / -19 = +9 no período) · 6035 de alcance
\`\`\`

Nada além disso. Esta rotina roda três vezes por dia: resumo curto é o que a torna suportável de ler.

Se o script falhar, diga **a linha do erro** e não tente contornar — nem com dado inventado, nem com outra conta. Um erro visível custa um dia de métrica; um dado inventado custa a confiança no painel inteiro.

Se aparecer uma conta nova na marca (por exemplo o perfil da loja, quando ele for conectado no painel da InsightfulPipe), ela entra sozinha na coleta — não é preciso mexer aqui.`

const saida = process.argv.indexOf('--saida') >= 0 ? process.argv[process.argv.indexOf('--saida') + 1] : null
if (saida) {
  writeFileSync(saida, prompt)
  console.error(`prompt com ${prompt.length} caracteres em ${saida}`)
} else {
  console.log(prompt)
}
