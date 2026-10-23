/**
 * Monta o prompt da rotina que publica no Instagram.
 *
 * A sessão agendada não tem o repositório clonado, então o publicador precisa
 * viajar DENTRO do prompt — mesmo motivo de `gerar-prompt-metricas.mjs`.
 *
 *   node scripts/gerar-prompt-publicacao.mjs
 *   node scripts/gerar-prompt-publicacao.mjs --saida p.md
 *
 * As credenciais NÃO ficam aqui: o prompt sai com marcadores e quem edita a
 * rotina preenche. Chave em arquivo versionado é chave vazada.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const publicador = readFileSync(path.join(aqui, 'rotina-publicacao/publicador.py'), 'utf8').trimEnd()

const prompt = `Publica no Instagram do Raphael o que ele programou no app. Roda de poucos em poucos minutos.

A sessão não tem o repositório clonado. Tudo o que é preciso está aqui.

**Esta rotina ESCREVE numa conta real.** Se qualquer passo falhar, pare e relate — nunca tente outro caminho, outra conta ou outro formato. Um post errado no perfil dele não tem desfazer.

## 1. Credenciais

\`\`\`bash
export IP_KEY="COLE_A_CHAVE_DA_INSIGHTFULPIPE"
export SUPABASE_URL="COLE_A_URL_DO_SUPABASE"
export SUPABASE_ANON_KEY="COLE_A_CHAVE_ANON"
export INGESTAO_TOKEN="COLE_O_TOKEN_DE_INGESTAO"
export BRAND_ID=6366
export ATRASO_MAXIMO_MINUTOS=120
\`\`\`

Se alguma linha ainda estiver com COLE_, pare e diga qual falta. Não peça credencial a ninguém e não tente contornar.

## 2. Preparar

\`\`\`bash
npm install -g insightfulpipe >/dev/null 2>&1
printf '%s' "$IP_KEY" | insightfulpipe auth --insecure-storage
insightfulpipe whoami >/dev/null || { echo "autenticação falhou"; exit 1; }
\`\`\`

## 3. Publicar

Grave o arquivo abaixo como \`/tmp/publicador.py\` **exatamente como está** e rode \`python3 /tmp/publicador.py\`.

\`\`\`python
${publicador}
\`\`\`

## 4. O que ele faz, para você conferir a saída

1. Fecha o que perdeu a janela de ${'`$ATRASO_MAXIMO_MINUTOS`'} minutos — post atrasado não vai ao ar de madrugada.
2. Pega da fila o que já venceu, **já marcando como \`publicando\`** na mesma sentença: duas corridas sobrepostas não publicam o mesmo post duas vezes.
3. Para cada um: confere que a conta é da marca 6366 e responde com o handle esperado, monta o container (um por cartão, no carrossel), espera a Meta terminar de processar, publica e grava o permalink.
4. Falha de um post não derruba os outros: a linha vira \`falhou\` com o motivo escrito, e ele vê isso na tela.

## 5. Como terminar

Exatamente o que o script imprimiu, sem nada em volta. Uma linha por post:

\`\`\`
PUBLICADO carrossel em @euraphaelaraujo — https://www.instagram.com/p/XXXX/
\`\`\`

Ou, o caso mais comum:

\`\`\`
Nada para publicar agora.
\`\`\`

**Se o script falhar, diga a linha exata do erro.** Não tente publicar à mão, não troque o formato, não troque a conta. Um erro visível custa um post; um post errado custa o perfil.

Se a permissão for negada pelo ambiente (classificador de ações do mundo real), **diga isso com estas palavras e pare** — é informação que muda o desenho, não um obstáculo para contornar.`

const saida = process.argv.indexOf('--saida') >= 0 ? process.argv[process.argv.indexOf('--saida') + 1] : null
if (saida) {
  writeFileSync(saida, prompt)
  console.error(`prompt com ${prompt.length} caracteres em ${saida}`)
} else {
  console.log(prompt)
}
