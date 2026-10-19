import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ARCOS } from '@/lib/stories/gatilhos'
import { ROTULO_DE_EIXO, type Eixo } from '@/lib/stories/temas'

export const QUALQUER_EIXO = 'qualquer'

interface Props {
  /** O assunto que a pessoa escreveu. É ele que vira a busca. */
  assunto: string
  eixo: Eixo | typeof QUALQUER_EIXO
  arcoId: string
  /** Já existem stories? Então o botão substitui, e avisa. */
  temStories: boolean
  /** Qual ângulo o motor usou da última vez. */
  ultimoAngulo: string | null
  onEixo: (eixo: Eixo | typeof QUALQUER_EIXO) => void
  onArco: (arcoId: string) => void
  onGerar: () => void
}

const EIXOS: Eixo[] = ['autoridade', 'humanidade', 'ensino', 'conexao']

/**
 * Gerar sequência a partir do assunto que a PESSOA escreveu.
 *
 * As sugestões do dia resolvem "não sei sobre o que falar". Isto resolve o
 * contrário, que é o caso mais comum de quem já tem pauta: "eu sei o assunto,
 * me dá a sequência". Antes, quem escrevia "Black Friday" do zero ficava com
 * um rascunho vazio e nenhum caminho de volta para o gerador.
 *
 * A finalidade existe porque o mesmo assunto rende sequências diferentes: a
 * Black Friday dá uma sequência de autoridade (a decisão com dado) e outra de
 * humanidade (o erro do ano passado). Quem escolhe é quem vai gravar.
 */
export function GerarDoAssunto({
  assunto,
  eixo,
  arcoId,
  temStories,
  ultimoAngulo,
  onEixo,
  onArco,
  onGerar,
}: Props) {
  const vazio = !assunto.trim()

  return (
    <section className="space-y-2.5 rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm font-medium">Gerar a partir do seu assunto</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="gerar-eixo" className="text-xs">
            Finalidade
          </Label>
          <Select value={eixo} onValueChange={(v) => onEixo(v as Eixo | typeof QUALQUER_EIXO)}>
            <SelectTrigger id="gerar-eixo" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUALQUER_EIXO}>Qualquer — deixa o motor escolher</SelectItem>
              {EIXOS.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {ROTULO_DE_EIXO[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="gerar-arco" className="text-xs">
            Arco
          </Label>
          <Select value={arcoId} onValueChange={onArco}>
            <SelectTrigger id="gerar-arco" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARCOS.map((arco) => (
                <SelectItem key={arco.id} value={arco.id}>
                  {arco.rotulo} · {arco.passos.length} stories
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {ARCOS.find((arco) => arco.id === arcoId)?.quandoUsar}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={vazio} onClick={onGerar}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {temStories ? 'Regerar sequência' : 'Gerar sequência'}
        </Button>
        {temStories && (
          <span className="text-xs text-muted-foreground">Substitui o que está escrito.</span>
        )}
      </div>

      {/* Nunca travar sem dizer o motivo na tela. */}
      {vazio && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Escreva o assunto em "Assunto da sequência" abaixo para liberar o botão.
        </p>
      )}

      {/*
        O título continua sendo o que a pessoa escreveu ("Black Friday"), então
        sem esta linha ela não teria como saber que o motor entrou pelo ângulo
        "Como eu escolho quais produtos entram na campanha".
      */}
      {ultimoAngulo && !vazio && (
        <p className="text-xs text-muted-foreground">
          Ângulo usado: <span className="font-medium text-foreground">{ultimoAngulo}</span>
        </p>
      )}
    </section>
  )
}
