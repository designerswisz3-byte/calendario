import * as React from 'react'
import { Download, FileVideo, ImageIcon, Loader2 } from 'lucide-react'
import {
  baixarTudoComoZip,
  nomeDaMidia,
  urlDeDownload,
  type MidiaParaBaixar,
} from '@/lib/download'
import { cn } from '@/lib/utils'

interface Props {
  expert: string
  midias: MidiaParaBaixar[]
}

/**
 * Download das mídias, no link público.
 *
 * Uma mídia baixa direto. Várias viram um ZIP, para não disparar N downloads
 * seguidos — navegador bloqueia o segundo em diante.
 *
 * Se empacotar falhar (rede, CORS, memória), a lista individual abaixo
 * continua funcionando: ela não depende de JavaScript nenhum, é o próprio
 * Storage mandando Content-Disposition. É a rota de fuga do recurso.
 *
 * Estilo neutro, sem o glassmorphism do app: esta tela imita o Instagram.
 */
export function DownloadPanel({ expert, midias }: Props) {
  const [baixando, setBaixando] = React.useState(false)
  const [progresso, setProgresso] = React.useState<{ feitas: number; total: number } | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mostrarLista, setMostrarLista] = React.useState(false)

  if (midias.length === 0) return null

  const umaSo = midias.length === 1

  async function baixarTudo() {
    setErro(null)
    setBaixando(true)
    setProgresso({ feitas: 0, total: midias.length })
    try {
      await baixarTudoComoZip(midias, expert, (feitas, total) => setProgresso({ feitas, total }))
    } catch {
      setErro('Não foi possível empacotar. Baixe uma a uma na lista abaixo.')
      setMostrarLista(true)
    } finally {
      setBaixando(false)
      setProgresso(null)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      {umaSo ? (
        <a
          href={urlDeDownload(midias[0].url, nomeDaMidia(expert, 0, midias[0].url, midias[0].tipo))}
          download
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          <Download className="h-4 w-4" />
          Baixar mídia
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void baixarTudo()}
          disabled={baixando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-70 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {baixando && progresso
            ? `Preparando ${progresso.feitas} de ${progresso.total}…`
            : `Baixar mídias (${midias.length})`}
        </button>
      )}

      {erro && <p className="px-1 text-xs text-red-600">{erro}</p>}

      {!umaSo && (
        <>
          <button
            type="button"
            onClick={() => setMostrarLista((v) => !v)}
            className="w-full px-1 text-left text-xs text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-300"
          >
            {mostrarLista ? 'Esconder arquivos' : 'Ou baixar uma por uma'}
          </button>

          {mostrarLista && (
            <ul className="space-y-1">
              {midias.map((midia, indice) => {
                const nome = nomeDaMidia(expert, indice, midia.url, midia.tipo)
                return (
                  <li key={`${midia.url}-${indice}`}>
                    <a
                      href={urlDeDownload(midia.url, nome)}
                      download={nome}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                        'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900',
                      )}
                    >
                      {midia.tipo === 'video' ? (
                        <FileVideo className="h-4 w-4 shrink-0 text-neutral-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-neutral-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{nome}</span>
                      <Download className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
