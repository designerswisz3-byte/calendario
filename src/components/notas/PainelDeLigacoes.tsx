import * as React from 'react'
import { ArrowUpRight, CornerUpLeft, Plus, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { chaveDoTitulo, resolverLigacoes, retroLigacoes } from '@/lib/notasLinks'
import type { NotaComLigacoes } from '@/lib/notasLinks'

interface Props {
  notaId: string
  titulo: string
  conteudo: string
  caderno: NotaComLigacoes[]
  onAbrirNota: (id: string) => void
  onCriarNota: (titulo: string) => void
  ligacoesCitadas: string[]
}

/**
 * As duas direções da ligação, que é o que o Obsidian tem de útil:
 *
 *   - "Esta nota cita": os [[títulos]] escritos aqui dentro;
 *   - "Citam esta nota": quem escreveu [[este título]] em outro lugar.
 *
 * A segunda é a que faz diferença — ela aparece sozinha, sem ninguém ter que
 * lembrar de criar o caminho de volta.
 */
export function PainelDeLigacoes({
  notaId,
  titulo,
  caderno,
  onAbrirNota,
  onCriarNota,
  ligacoesCitadas,
}: Props) {
  const citadas = React.useMemo(
    () => resolverLigacoes(ligacoesCitadas, caderno),
    [ligacoesCitadas, caderno],
  )
  const citam = React.useMemo(
    () => retroLigacoes({ titulo }, caderno, notaId),
    [titulo, caderno, notaId],
  )

  if (citadas.length === 0 && citam.length === 0) return null

  return (
    <section className="space-y-3 border-t border-border/60 px-5 py-4">
      {citadas.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Esta nota cita
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {citadas.map(({ titulo: alvo, nota }) => (
              <li key={alvo}>
                {nota ? (
                  <Button variant="outline" size="sm" onClick={() => onAbrirNota(nota.id)}>
                    {alvo}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-dashed border-border text-muted-foreground"
                    title="Esta nota ainda não existe — clique para criar"
                    onClick={() => onCriarNota(alvo)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {alvo}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {citam.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CornerUpLeft className="h-3.5 w-3.5" />
            Citam esta nota
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {citam.map((nota) => (
              <li key={nota.id}>
                <Button variant="outline" size="sm" onClick={() => onAbrirNota(nota.id)}>
                  {nota.titulo || 'Nota sem título'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Escolhe (ou inventa) o título a ligar, e devolve o `[[...]]` pronto. */
export function SeletorDeLigacao({
  aberto,
  onOpenChange,
  caderno,
  notaId,
  onEscolher,
}: {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  caderno: { id: string; titulo: string }[]
  notaId: string
  onEscolher: (titulo: string) => void
}) {
  const [busca, setBusca] = React.useState('')

  React.useEffect(() => {
    if (aberto) setBusca('')
  }, [aberto])

  const chave = chaveDoTitulo(busca)
  const candidatas = caderno
    .filter((nota) => nota.id !== notaId && nota.titulo)
    .filter((nota) => !chave || chaveDoTitulo(nota.titulo).includes(chave))
    .slice(0, 12)

  const jaExiste = candidatas.some((nota) => chaveDoTitulo(nota.titulo) === chave)

  function escolher(titulo: string) {
    onEscolher(titulo)
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Ligar a outra nota
          </DialogTitle>
          <DialogDescription>
            Entra como <code className="rounded bg-foreground/10 px-1">[[título]]</code> no texto. A
            nota citada não precisa existir ainda.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar ou escrever um tema novo…"
          onKeyDown={(evento) => {
            if (evento.key !== 'Enter') return
            evento.preventDefault()
            const alvo = candidatas[0]?.titulo ?? busca.trim()
            if (alvo) escolher(alvo)
          }}
        />

        <ul className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
          {busca.trim() && !jaExiste && (
            <li>
              <button
                type="button"
                onClick={() => escolher(busca.trim())}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                Criar ligação para “{busca.trim()}”
              </button>
            </li>
          )}
          {candidatas.map((nota) => (
            <li key={nota.id}>
              <button
                type="button"
                onClick={() => escolher(nota.titulo)}
                className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
              >
                {nota.titulo}
              </button>
            </li>
          ))}
          {candidatas.length === 0 && !busca.trim() && (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              Nenhuma outra nota ainda. Escreva um tema para criar a primeira ligação.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
