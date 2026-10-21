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

const prompt = `Coleta diária das métricas de Instagram do Raphael para a aba Relatório do app dele.

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
- Para cada conta: confere que o id responde com o username esperado, puxa alcance e novos seguidores em série, o resto dia a dia, e conta as publicações.
- Grava via \`rpc/ingerir_metricas\`, que faz upsert por dia — rodar duas vezes no mesmo dia atualiza, não duplica.
- Repuxa os últimos 7 dias, não só ontem: a Meta fecha a janela do dia com atraso, e quem grava só "ontem" congela um número provisório.

## 5. Como terminar

Uma linha por perfil, exatamente o que o script imprimiu. Exemplo:

\`\`\`
2026-10-14 a 2026-10-20
@euraphaelaraujo: 7 dia(s) · 4399 seguidores (+17 no período) · 6035 de alcance
\`\`\`

Se o script falhar, diga **a linha do erro** e não tente contornar — nem com dado inventado, nem com outra conta. Um erro visível custa um dia de métrica; um dado inventado custa a confiança no painel inteiro.

Se aparecer uma conta nova na marca (por exemplo o perfil da loja, quando ele for conectado no painel da InsightfulPipe), ela entra sozinha na coleta — não é preciso mexer aqui.`

const saida = process.argv.indexOf('--saida') >= 0 ? process.argv[process.argv.indexOf('--saida') + 1] : null
if (saida) {
  writeFileSync(saida, prompt)
  console.error(`prompt com ${prompt.length} caracteres em ${saida}`)
} else {
  console.log(prompt)
}
