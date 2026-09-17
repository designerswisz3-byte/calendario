import * as React from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2, NotebookPen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { resumoDoRoteiro } from '@/lib/texto'

export type AbaDeTexto = 'briefing' | 'roteiro'

interface Props {
  /** Elemento dentro do painel onde o bloco é montado. Ver comentário abaixo. */
  hospedeiro: HTMLElement | null
  /** id do <form> no painel — é ele que o botão Salvar submete. */
  formId: string
  titulo: string
  aba: AbaDeTexto
  onAbaChange: (aba: AbaDeTexto) => void
  briefing: string
  onBriefingChange: (valor: string) => void
  roteiro: string
  onRoteiroChange: (valor: string) => void
  /** Largura atual do painel do dia: o bloco ocupa o que sobra da tela. */
  larguraDoPainel: number
  ladoALado: boolean
  saving?: boolean
  onCancel: () => void
}

const CAMPOS: Record<AbaDeTexto, { rotulo: string; dica: string; placeholder: string }> = {
  briefing: {
    rotulo: 'Briefing',
    dica: 'Ângulo, gancho, referência — o que não pode faltar',
    placeholder: 'Por que este conteúdo existe? Qual o gancho? Que prova entra?',
  },
  roteiro: {
    rotulo: 'Roteiro',
    dica: 'O texto falado, como ele sai no teleprompter',
    placeholder: 'GANCHO:\n\nExiste um número exato que separa…\n\n8s a 18s. A cena\n\n…',
  },
}

/**
 * Bloco de notas: a superfície grande de escrita, ao lado do painel do dia.
 *
 * O problema que ele resolve: o formulário de edição abre dentro da coluna
 * estreita do painel, e um briefing de trinta linhas não cabe num textarea de
 * 140 px. Escrever ali é olhar o texto por uma fresta.
 *
 * Onde ele é montado, e por quê: num `hospedeiro` que o painel renderiza como
 * filho direto do SheetContent. Duas armadilhas já conhecidas neste projeto
 * fazem essa escolha ser necessária:
 *
 *   1. `position: fixed` não é confiável aqui — o SheetContent anima com
 *      transform, e um ancestral com transform vira bloco de contenção, então
 *      o "fixo" passa a ser fixo dentro do painel. Foi o bug do teleprompter.
 *   2. A coluna do painel tem `overflow-y-auto`. Nascer dentro dela seria
 *      pedir para ser recortado.
 *
 * Como filho direto do SheetContent (que é `fixed`, logo posicionado), o bloco
 * se ancora no painel com `position: absolute` e acompanha a largura dele —
 * que é exatamente o comportamento desejado: o bloco fica *ao lado*.
 */
export function BlocoDeNotas({
  hospedeiro,
  formId,
  titulo,
  aba,
  onAbaChange,
  briefing,
  onBriefingChange,
  roteiro,
  onRoteiroChange,
  larguraDoPainel,
  ladoALado,
  saving,
  onCancel,
}: Props) {
  const areaRef = React.useRef<HTMLTextAreaElement>(null)
  const [amplo, setAmplo] = React.useState(false)

  // O cursor já começa no texto: quem clicou em editar quer escrever.
  React.useEffect(() => {
    const area = areaRef.current
    if (!area) return
    area.focus()
    area.setSelectionRange(area.value.length, area.value.length)
  }, [aba])

  // Ctrl/Cmd+S salva. Quem escreve texto longo tem esse reflexo na mão.
  React.useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!(evento.metaKey || evento.ctrlKey) || evento.key.toLowerCase() !== 's') return
      evento.preventDefault()
      const form = document.getElementById(formId)
      if (form instanceof HTMLFormElement) form.requestSubmit()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [formId])

  if (!hospedeiro) return null

  const campo = CAMPOS[aba]
  const valor = aba === 'briefing' ? briefing : roteiro
  const aoMudar = aba === 'briefing' ? onBriefingChange : onRoteiroChange
  const resumo = resumoDoRoteiro(roteiro)

  // Ao lado do painel: encosta na borda esquerda dele e toma o resto da tela.
  // Em tela estreita não há "ao lado" — o bloco cobre o painel inteiro.
  const posicao = ladoALado
    ? {
        right: '100%',
        marginRight: '0.75rem',
        width: amplo
          ? `calc(100vw - ${larguraDoPainel}px - 1.5rem)`
          : `min(52rem, calc(100vw - ${larguraDoPainel}px - 1.5rem))`,
      }
    : { inset: 0 }

  return createPortal(
    <section
      role="dialog"
      aria-label={`Bloco de notas — ${titulo}`}
      style={posicao}
      className={cn(
        'glass-strong absolute z-10 flex flex-col overflow-hidden rounded-xl border shadow-glass-lg',
        ladoALado && 'inset-y-4',
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <NotebookPen className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Bloco de notas</p>
          <p className="truncate text-xs text-muted-foreground">{titulo}</p>
        </div>

        {ladoALado && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setAmplo((v) => !v)}
            aria-label={amplo ? 'Reduzir a largura do bloco' : 'Usar toda a largura disponível'}
            title={amplo ? 'Reduzir' : 'Usar toda a largura'}
          >
            {amplo ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          aria-label="Fechar sem salvar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </header>

      <Tabs
        value={aba}
        onValueChange={(valor) => onAbaChange(valor as AbaDeTexto)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-4 pt-3">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            {(['briefing', 'roteiro'] as const).map((chave) => {
              const preenchido = (chave === 'briefing' ? briefing : roteiro).trim()
              return (
                <TabsTrigger key={chave} value={chave}>
                  {CAMPOS[chave].rotulo}
                  {preenchido && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Um único textarea, trocado pela aba: o conteúdo é grande e manter
            dois montados só duplicaria rolagem e estado de scroll. */}
        <TabsContent value={aba} forceMount className="flex min-h-0 flex-1 flex-col gap-2 p-4 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="bloco-texto" className="text-xs text-muted-foreground">
              {campo.dica}
            </label>
            {aba === 'roteiro' && resumo && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{resumo}</span>
            )}
          </div>

          <textarea
            id="bloco-texto"
            ref={areaRef}
            value={valor}
            onChange={(evento) => aoMudar(evento.target.value)}
            placeholder={campo.placeholder}
            spellCheck
            className={cn(
              'min-h-0 flex-1 resize-none rounded-lg border border-input bg-background/70 p-4 leading-relaxed backdrop-blur-sm scrollbar-thin',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              aba === 'roteiro' ? 'font-mono text-[0.9rem]' : 'text-[0.95rem]',
            )}
          />
        </TabsContent>
      </Tabs>

      <footer className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <p className="hidden text-xs text-muted-foreground sm:block">
          <kbd className="rounded border border-border px-1 py-0.5 font-sans text-[0.65rem]">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="rounded border border-border px-1 py-0.5 font-sans text-[0.65rem]">S</kbd>{' '}
          salva
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          {/* `form=` associa o botão ao formulário do painel mesmo estando
              fora dele no DOM — um salvar só, para os dois lados. */}
          <Button type="submit" form={formId} size="sm" loading={saving}>
            Salvar
          </Button>
        </div>
      </footer>
    </section>,
    hospedeiro,
  )
}
