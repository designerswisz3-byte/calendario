/**
 * Gera `supabase/setup-completo.sql` a partir de `supabase/migrations/`.
 *
 * O arquivo é o que se cola no SQL Editor do Supabase de uma vez só. Ele era
 * montado à mão, e arquivo montado à mão sai de sincronia: bastava uma
 * migração nova ser esquecida para o banco de alguém ficar atrás do código.
 *
 *   node scripts/gerar-setup-completo.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pasta = path.join(raiz, 'supabase/migrations')
const saida = path.join(raiz, 'supabase/setup-completo.sql')

const arquivos = (await readdir(pasta)).filter((n) => n.endsWith('.sql')).sort()

/** Primeira linha de comentário com texto — vira o resumo no índice. */
function resumo(sql) {
  for (const linha of sql.split('\n')) {
    const texto = linha.replace(/^--\s?/, '').trim()
    if (linha.startsWith('--') && texto && !/^=+$/.test(texto)) return texto
  }
  return 'migração'
}

const partes = []
for (const nome of arquivos) {
  partes.push({ nome, sql: await readFile(path.join(pasta, nome), 'utf8') })
}

const indice = partes
  .map((p, i) => `--   ${i + 1}. ${p.nome.slice(0, 14)} — ${resumo(p.sql)}`)
  .join('\n')

const cabecalho = `-- ============================================================================
-- SETUP COMPLETO DO BANCO — cole tudo isto no SQL Editor do Supabase e rode.
-- ============================================================================
-- Junção das migrações de supabase/migrations/, na ordem correta, para quem
-- prefere um único copiar-e-colar. É idempotente: pode rodar de novo.
--
-- GERADO por scripts/gerar-setup-completo.mjs — não edite à mão.
--
${indice}
--
-- Se alguma parte de Storage falhar com "must be owner of table objects", rode
-- as demais por aqui e crie os buckets pela interface (Storage > New bucket):
-- \`media\` como Public e \`canvas\` como privado.
-- ============================================================================
`

const corpo = partes
  .map(
    (p) =>
      `\n\n-- ${'='.repeat(74)}\n-- ${p.nome}\n-- ${'='.repeat(74)}\n\n${p.sql.trim()}\n`,
  )
  .join('')

await writeFile(saida, `${cabecalho}${corpo}`)
console.log(`[setup] ${partes.length} migrações -> supabase/setup-completo.sql`)
