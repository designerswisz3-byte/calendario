import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { resumoDoRoteiro } from '@/lib/texto'
import type { CalendarItemWithRelations } from '@/types/database'

interface Props {
  item: CalendarItemWithRelations
  /** O botão de salvar mora no rodapé do visor e aponta para este id. */
  formId: string
  salvando: boolean
  onSalvar: (texto: { notas: string; roteiro: string }) => void
  /** Avisa quando há alteração não salva — o visor pergunta antes de fechar. */
  onMudou: (haAlteracao: boolean) => void
}

/**
 * Edição do texto de um item guardado, sem tirá-lo da gaveta.
 *
 * ----------------------------------------------------------------------------
 * Por que a gaveta deixou de ser só leitura
 * ----------------------------------------------------------------------------
 * Enquanto a gaveta guardava só ideia solta, ler bastava: a ideia se
 * desenvolve na grade, no dia em que vira pauta. Com os roteiros prontos isso
 * mudou. Roteiro pronto é texto que se relê na véspera da gravação — e quem
 * relê, corta uma frase, troca o gancho, ajusta o número. Obrigar a devolver o
 * item para um dia só para trocar uma palavra sujava a grade e fazia o ajuste
 * de dez segundos não acontecer.
 *
 * ----------------------------------------------------------------------------
 * Por que só os dois textos
 * ----------------------------------------------------------------------------
 * Tipo, status, horário e etiquetas continuam no painel do dia. Eles dizem
 * respeito ao item NA GRADE — quando sai, em que etapa está. Aqui o item não
 * tem dia; o que se mexe é o que vai ser lido e falado. Trazer o formulário
 * inteiro para cá criaria duas telas fazendo a mesma coisa de dois jeitos.
 */
export function EditorDoItemGuardado({ item, formId, salvando, onSalvar, onMudou }: Props) {
  const notasDeOrigem = item.notas ?? ''
  const roteiroDeOrigem = item.roteiro ?? ''
  const [notas, setNotas] = React.useState(notasDeOrigem)
  const [roteiro, setRoteiro] = React.useState(roteiroDeOrigem)
  const campoDoRoteiro = React.useRef<HTMLTextAreaElement>(null)

  const haAlteracao = notas !== notasDeOrigem || roteiro !== roteiroDeOrigem
  React.useEffect(() => {
    onMudou(haAlteracao)
  }, [haAlteracao, onMudou])

  /*
   * O cursor começa no roteiro, e no FIM dele.
   *
   * Quem abre a edição a partir dos roteiros prontos veio mexer no roteiro. E
   * no fim, não no começo, porque selecionar tudo faria a primeira tecla
   * apagar o texto inteiro — o pior acidente possível num editor de roteiro.
   */
  React.useEffect(() => {
    const campo = campoDoRoteiro.current
    if (!campo) return
    campo.focus()
    campo.setSelectionRange(campo.value.length, campo.value.length)
  }, [])

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (salvando) return
    onSalvar({ notas, roteiro })
  }

  return (
    <form
      id={formId}
      onSubmit={enviar}
      onKeyDown={(evento) => {
        // Ctrl/⌘ + Enter salva: Enter sozinho é quebra de linha no roteiro.
        if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
          evento.preventDefault()
          evento.currentTarget.requestSubmit()
        }
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={`${formId}-roteiro`}>Roteiro</Label>
          {/*
            O tempo de fala acompanha a digitação. É o número que decide se o
            corte foi suficiente — "cabe em um minuto?" se responde aqui, e não
            abrindo o teleprompter para descobrir.
          */}
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {resumoDoRoteiro(roteiro) || 'sem roteiro escrito'}
          </span>
        </div>
        <Textarea
          ref={campoDoRoteiro}
          id={`${formId}-roteiro`}
          value={roteiro}
          onChange={(evento) => setRoteiro(evento.target.value)}
          placeholder="O texto falado, do jeito que vai para o teleprompter."
          className="min-h-[18rem] resize-y leading-relaxed"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-notas`}>Título e briefing</Label>
        <Textarea
          id={`${formId}-notas`}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          placeholder="A primeira linha é o título do card."
          className="min-h-[7rem] resize-y leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          A primeira linha é o título que aparece no card.
        </p>
      </div>
    </form>
  )
}
