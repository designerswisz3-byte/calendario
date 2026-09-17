import * as React from 'react'
import { NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagPicker } from '@/components/calendar/TagPicker'
import { BlocoDeNotas, type AbaDeTexto } from '@/components/calendar/BlocoDeNotas'
import { PLANNING_TYPES, STATUSES, STATUS_LABEL, TYPE_LABEL } from '@/lib/constants'
import { formatTime } from '@/lib/date'
import { contarPalavras, resumoDoRoteiro } from '@/lib/texto'
import type { CalendarItemInput } from '@/hooks/useCalendarItems'
import type { CalendarItemWithRelations, CalendarStatus, PlanningType } from '@/types/database'

interface Props {
  dateKey: string
  item?: CalendarItemWithRelations
  onSubmit: (input: CalendarItemInput) => Promise<void> | void
  onCancel: () => void
  saving?: boolean
  /** Em qual aba o bloco de notas abre. Quem clicou no roteiro quer o roteiro. */
  abaInicial?: AbaDeTexto
  /** Onde o bloco de notas é montado — filho direto do painel. */
  hospedeiroBloco: HTMLElement | null
  larguraDoPainel: number
  ladoALado: boolean
  titulo: string
}

/**
 * Formulário do item de PLANEJAMENTO.
 *
 * Por definição do produto, aqui não existe legenda, upload de mídia nem nome
 * do expert — esses campos pertencem só à tela de criação (/criar).
 *
 * Divisão de trabalho com o bloco de notas: os campos curtos (tipo, status,
 * horário, tags) ficam no painel, onde a coluna estreita não atrapalha; os
 * textos longos vão para o bloco ao lado, que tem espaço para serem lidos. O
 * estado é um só e o salvar é um só — o bloco submete este mesmo formulário.
 */
export function CalendarItemForm({
  dateKey,
  item,
  onSubmit,
  onCancel,
  saving,
  abaInicial = 'briefing',
  hospedeiroBloco,
  larguraDoPainel,
  ladoALado,
  titulo,
}: Props) {
  const formId = React.useId()
  const [tipo, setTipo] = React.useState<PlanningType | ''>(item?.tipo ?? '')
  const [status, setStatus] = React.useState<CalendarStatus>(item?.status ?? 'ideia')
  const [horario, setHorario] = React.useState(formatTime(item?.horario))
  const [notas, setNotas] = React.useState(item?.notas ?? '')
  const [roteiro, setRoteiro] = React.useState(item?.roteiro ?? '')
  const [tagIds, setTagIds] = React.useState<string[]>(item?.tags.map((tag) => tag.id) ?? [])
  const [aba, setAba] = React.useState<AbaDeTexto>(abaInicial)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    // Validação: tipo é obrigatório.
    if (!tipo) {
      setError('Escolha o tipo de conteúdo antes de salvar.')
      return
    }
    setError(null)

    await onSubmit({
      data: dateKey,
      horario: horario || null,
      tipo,
      status,
      notas,
      roteiro,
      tagIds,
    })
  }

  const palavrasBriefing = contarPalavras(notas)
  const resumoRoteiro = resumoDoRoteiro(roteiro)

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="glass space-y-4 rounded-lg p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-tipo">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as PlanningType)}>
              <SelectTrigger id="item-tipo" aria-invalid={Boolean(error)}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {PLANNING_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CalendarStatus)}>
              <SelectTrigger id="item-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="item-horario">Horário sugerido</Label>
          <Input
            id="item-horario"
            type="time"
            value={horario}
            onChange={(event) => setHorario(event.target.value)}
            className="w-36"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tags</Label>
          <TagPicker value={tagIds} onChange={setTagIds} />
        </div>

        {/* Os textos moram no bloco ao lado. Aqui fica só o estado deles, para
            quem está mexendo nos campos curtos saber o que já foi escrito. */}
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm font-medium">Briefing e roteiro</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Briefing</dt>
              <dd className="font-medium tabular-nums">
                {palavrasBriefing ? `${palavrasBriefing} palavras` : 'vazio'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Roteiro</dt>
              <dd className="font-medium tabular-nums">{resumoRoteiro || 'vazio'}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Escreva no bloco de notas ao lado — ele salva junto com este formulário.
          </p>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            {item ? 'Salvar' : 'Adicionar item'}
          </Button>
        </div>
      </form>

      <BlocoDeNotas
        hospedeiro={hospedeiroBloco}
        formId={formId}
        titulo={titulo}
        aba={aba}
        onAbaChange={setAba}
        briefing={notas}
        onBriefingChange={setNotas}
        roteiro={roteiro}
        onRoteiroChange={setRoteiro}
        larguraDoPainel={larguraDoPainel}
        ladoALado={ladoALado}
        saving={saving}
        onCancel={onCancel}
      />
    </>
  )
}
