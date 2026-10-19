import * as React from 'react'
import { ArrowDown, ArrowUp, Check, Copy, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GATILHOS, type GatilhoId } from '@/lib/stories/gatilhos'
import { cn } from '@/lib/utils'
import type { StoryDaSequencia } from '@/types/database'

interface Props {
  titulo: string
  stories: StoryDaSequencia[]
  observacao: string
  onTitulo: (texto: string) => void
  onStories: (stories: StoryDaSequencia[]) => void
}

/**
 * O editor da sequência.
 *
 * Tudo aqui é editável porque o gerador entrega RASCUNHO. Um texto fechado
 * seria lido em vez de falado, e story lido se reconhece de longe — a pessoa
 * que grava precisa passar a mão em cada frase para ela virar dela.
 *
 * O rótulo ("Story 3 — Identificação") é recalculado a cada mudança de ordem,
 * e não guardado: se fosse guardado, reordenar deixaria "Story 5" na segunda
 * posição e o roteiro de gravação passaria a mentir.
 */
export function EditorDeSequencia({ titulo, stories, observacao, onTitulo, onStories }: Props) {
  const [copiado, setCopiado] = React.useState(false)

  function renumerar(lista: StoryDaSequencia[]): StoryDaSequencia[] {
    return lista.map((story, i) => ({
      ...story,
      ordem: i + 1,
      rotulo: `Story ${i + 1} — ${GATILHOS[story.gatilho as GatilhoId]?.rotulo ?? 'Livre'}`,
    }))
  }

  function mexer(i: number, delta: number) {
    const destino = i + delta
    if (destino < 0 || destino >= stories.length) return
    const copia = [...stories]
    ;[copia[i], copia[destino]] = [copia[destino], copia[i]]
    onStories(renumerar(copia))
  }

  function alterar(i: number, campos: Partial<StoryDaSequencia>) {
    const copia = [...stories]
    copia[i] = { ...copia[i], ...campos }
    onStories(campos.gatilho ? renumerar(copia) : copia)
  }

  function acrescentar() {
    onStories(
      renumerar([
        ...stories,
        {
          ordem: stories.length + 1,
          rotulo: '',
          gatilho: 'compromisso',
          direcao_visual: GATILHOS.compromisso.direcaoVisual,
          texto: '',
          pede_interacao: true,
        },
      ]),
    )
  }

  async function copiarTudo() {
    const texto = [
      titulo,
      '',
      ...stories.flatMap((story) => [story.rotulo, `(${story.direcao_visual})`, '', story.texto, '']),
      observacao,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Área de transferência bloqueada pelo navegador: o texto continua à
      // vista nos campos, então falhar aqui não impede nada.
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sequencia-titulo">Assunto da sequência</Label>
        <Input
          id="sequencia-titulo"
          value={titulo}
          onChange={(e) => onTitulo(e.target.value)}
          placeholder="Sobre o que é esta sequência"
        />
      </div>

      {stories.map((story, i) => {
        const gatilho = GATILHOS[story.gatilho as GatilhoId]
        return (
          <article key={i} className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{story.rotulo || `Story ${i + 1}`}</span>
              {story.pede_interacao && (
                <Badge variant="secondary" className="gap-1 text-[0.65rem]">
                  <MessageCircle className="h-3 w-3" />
                  pede interação
                </Badge>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={i === 0}
                  onClick={() => mexer(i, -1)}
                  aria-label={`Subir ${story.rotulo}`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={i === stories.length - 1}
                  onClick={() => mexer(i, 1)}
                  aria-label={`Descer ${story.rotulo}`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onStories(renumerar(stories.filter((_, j) => j !== i)))}
                  aria-label={`Excluir ${story.rotulo}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* A intenção fica à vista enquanto a pessoa escreve: é o que
                impede o story 3 de virar mais um parágrafo explicativo. */}
            {gatilho && <p className="text-xs text-muted-foreground">{gatilho.intencao}</p>}

            <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
              <Select
                value={story.gatilho}
                onValueChange={(valor) =>
                  alterar(i, {
                    gatilho: valor,
                    direcao_visual: GATILHOS[valor as GatilhoId].direcaoVisual,
                    pede_interacao: Boolean(GATILHOS[valor as GatilhoId].pedeInteracao),
                  })
                }
              >
                <SelectTrigger aria-label={`Gatilho do ${story.rotulo}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(GATILHOS).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={story.direcao_visual}
                onChange={(e) => alterar(i, { direcao_visual: e.target.value })}
                placeholder="Direção visual: o que aparece na tela"
                className="text-xs"
              />
            </div>

            <Textarea
              value={story.texto}
              onChange={(e) => alterar(i, { texto: e.target.value })}
              rows={Math.max(3, story.texto.split('\n').length + 1)}
              className={cn(
                'text-sm',
                // O marcador de pendência salta à vista: ele existe para ser
                // notado antes da gravação, não depois.
                story.texto.includes('[preencha:') && 'border-amber-500/60 bg-amber-500/5',
              )}
            />
          </article>
        )
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={acrescentar}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Mais um story
        </Button>
        <Button size="sm" variant="ghost" onClick={copiarTudo}>
          {copiado ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          {copiado ? 'Copiado' : 'Copiar sequência'}
        </Button>
      </div>

      {observacao && (
        <p className="rounded-md bg-foreground/[0.04] p-2.5 text-xs leading-relaxed text-muted-foreground">
          {observacao}
        </p>
      )}
    </div>
  )
}
