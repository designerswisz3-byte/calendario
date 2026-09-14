import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Loader2, MessageSquarePlus, X } from 'lucide-react'
import { useEnviarAjuste } from '@/hooks/useAjustes'
import { errorMessage } from '@/lib/supabase'
import type { AjustePublico } from '@/types/database'

interface Props {
  previewId: string
  ajustes: AjustePublico[]
}

const formatador = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Botão AJUSTES do link público.
 *
 * Usa as primitivas do Radix direto, e não o Dialog do design system: esta
 * tela imita o Instagram e não pode receber o glassmorphism do resto do app.
 *
 * O texto não tem limite nem contador — é retorno de cliente, não legenda.
 * O único teto vive no banco (100 mil caracteres), para o endpoint anônimo
 * não virar porta de despejo.
 */
export function AjustesPanel({ previewId, ajustes }: Props) {
  const [aberto, setAberto] = React.useState(false)
  const [texto, setTexto] = React.useState('')
  const [autor, setAutor] = React.useState('')
  const [enviado, setEnviado] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const enviar = useEnviarAjuste(previewId)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!texto.trim()) {
      setErro('Escreva o ajuste antes de enviar.')
      return
    }
    setErro(null)

    try {
      await enviar.mutateAsync({ texto, autor })
      setTexto('')
      setEnviado(true)
      setTimeout(() => setEnviado(false), 4000)
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível enviar. Tente de novo.'))
    }
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0095f6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1877f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095f6] focus-visible:ring-offset-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          AJUSTES
          {ajustes.length > 0 && (
            <span className="rounded-full bg-white/25 px-1.5 text-xs font-semibold tabular-nums">
              {ajustes.length}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-neutral-200 bg-white text-neutral-900 shadow-2xl duration-250 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:max-h-[86vh] sm:w-[min(32rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div>
              <Dialog.Title className="text-base font-semibold">Pedir ajustes</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-neutral-500">
                Escreva o que precisa mudar. Sem limite de tamanho.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="ajuste-texto" className="text-sm font-medium">
                  O que ajustar
                </label>
                <textarea
                  id="ajuste-texto"
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder="Ex: no slide 3, trocar o CTA para vermelho. Na legenda, tirar a segunda frase…"
                  rows={6}
                  className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ajuste-autor" className="text-sm font-medium">
                  Seu nome <span className="font-normal text-neutral-500">(opcional)</span>
                </label>
                <input
                  id="ajuste-autor"
                  value={autor}
                  onChange={(event) => setAutor(event.target.value)}
                  placeholder="Quem está pedindo"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
                />
              </div>

              {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}

              {enviado && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" />
                  Ajuste enviado.
                </p>
              )}

              <button
                type="submit"
                disabled={enviar.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0095f6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1877f2] disabled:opacity-60"
              >
                {enviar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar ajuste
              </button>
            </form>
            {ajustes.length > 0 && (
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Já enviados ({ajustes.length})
                </h3>
                <ul className="space-y-3">
                  {ajustes.map((ajuste) => (
                    <li
                      key={ajuste.id}
                      className="rounded-lg bg-neutral-100 px-3 py-2.5 dark:bg-neutral-900"
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-neutral-500">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {ajuste.autor?.trim() || 'Anônimo'}
                        </span>
                        <span>{formatador.format(new Date(ajuste.criado_em))}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {ajuste.texto}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
