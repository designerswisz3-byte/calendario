import * as React from 'react'
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
import { TagPicker } from '@/components/calendar/TagPicker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PLANNING_TYPES, STATUSES, STATUS_LABEL, TYPE_LABEL } from '@/lib/constants'
import { formatTime } from '@/lib/date'
import type { CalendarItemInput } from '@/hooks/useCalendarItems'
import type { CalendarItemWithRelations, CalendarStatus, PlanningType } from '@/types/database'

interface Props {
  dateKey: string
  item?: CalendarItemWithRelations
  onSubmit: (input: CalendarItemInput) => Promise<void> | void
  onCancel: () => void
  saving?: boolean
  /** Em qual aba abrir. Quem clicou em "Escrever" no roteiro quer o roteiro. */
  abaInicial?: 'briefing' | 'roteiro'
}

/**
 * Formulário do item de PLANEJAMENTO.
 *
 * Por definição do produto, aqui não existe legenda, upload de mídia nem nome
 * do expert — esses campos pertencem só à tela de criação (/criar).
 */
export function CalendarItemForm({
  dateKey,
  item,
  onSubmit,
  onCancel,
  saving,
  abaInicial = 'briefing',
}: Props) {
  const [tipo, setTipo] = React.useState<PlanningType | ''>(item?.tipo ?? '')
  const [status, setStatus] = React.useState<CalendarStatus>(item?.status ?? 'ideia')
  const [horario, setHorario] = React.useState(formatTime(item?.horario))
  const [notas, setNotas] = React.useState(item?.notas ?? '')
  const [roteiro, setRoteiro] = React.useState(item?.roteiro ?? '')
  const [tagIds, setTagIds] = React.useState<string[]>(item?.tags.map((tag) => tag.id) ?? [])
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

  return (
    <form onSubmit={handleSubmit} className="glass space-y-4 rounded-lg p-4">
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

      {/*
        Dois textos com funções diferentes: o briefing é para pensar, o roteiro
        é para gravar — e é o roteiro que alimenta o teleprompter.
      */}
      <Tabs defaultValue={abaInicial}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="briefing">
            Briefing
            {notas.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
          </TabsTrigger>
          <TabsTrigger value="roteiro">
            Roteiro
            {roteiro.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="briefing" className="mt-3 space-y-1.5">
          <Label htmlFor="item-notas" className="text-xs text-muted-foreground">
            Ângulo, gancho, referência — o que não pode faltar
          </Label>
          <Textarea
            id="item-notas"
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Por que este conteúdo existe? Qual o gancho? Que prova entra?"
            className="min-h-[140px]"
          />
        </TabsContent>

        <TabsContent value="roteiro" className="mt-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="item-roteiro" className="text-xs text-muted-foreground">
              O texto falado, como ele sai no teleprompter
            </Label>
            {roteiro.trim() && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {roteiro.trim().split(/\s+/).length} palavras · ~
                {Math.max(1, Math.round(roteiro.trim().split(/\s+/).length / 150))} min
              </span>
            )}
          </div>
          <Textarea
            id="item-roteiro"
            value={roteiro}
            onChange={(event) => setRoteiro(event.target.value)}
            placeholder={'GANCHO:\n\nExiste um número exato que separa…\n\n8s a 18s. A cena\n\n…'}
            className="min-h-[140px] font-mono text-[0.82rem] leading-relaxed"
          />
        </TabsContent>
      </Tabs>

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
  )
}
