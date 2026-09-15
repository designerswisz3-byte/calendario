import * as React from 'react'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { useMarcarCanvaVisto } from '@/hooks/useAjustes'
import { cn } from '@/lib/utils'

interface Props {
  previewId: string
  canvaUrl: string
  visto: boolean
  vistoEm: string | null
}

const formatador = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Acesso do expert à arte no Canva, com o visto.
 *
 * Abrir a arte já marca o visto — quem clicou viu, e pedir a confirmação
 * depois seria um passo a mais para dizer o que a ação já disse. O check
 * continua clicável, para desmarcar quando ele quiser revisitar.
 *
 * Estilo neutro, sem o glassmorphism do app: esta tela imita o Instagram.
 */
export function CanvaPanel({ previewId, canvaUrl, visto, vistoEm }: Props) {
  const marcar = useMarcarCanvaVisto(previewId)
  const [erro, setErro] = React.useState(false)

  async function alternar(proximo: boolean) {
    setErro(false)
    try {
      await marcar.mutateAsync(proximo)
    } catch {
      setErro(true)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <a
        href={canvaUrl}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => {
          // Abrir já é o visto. Não bloqueia a navegação se a gravação falhar.
          if (!visto) void alternar(true)
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-900"
      >
        <ExternalLink className="h-4 w-4" />
        Abrir arte no Canva
      </a>

      <button
        type="button"
        onClick={() => void alternar(!visto)}
        disabled={marcar.isPending}
        aria-pressed={visto}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-900"
      >
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            visto
              ? 'border-[#0095f6] bg-[#0095f6] text-white'
              : 'border-neutral-400 dark:border-neutral-600',
          )}
        >
          {marcar.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : visto ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm text-neutral-900 dark:text-neutral-100">
            {visto ? 'Arte vista' : 'Marcar arte como vista'}
          </span>
          {visto && vistoEm && (
            <span className="block text-xs text-neutral-500">
              em {formatador.format(new Date(vistoEm))}
            </span>
          )}
        </span>
      </button>

      {erro && (
        <p className="px-1 text-xs text-red-600">
          Não foi possível registrar. Tente clicar de novo.
        </p>
      )}
    </div>
  )
}
