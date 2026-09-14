import * as React from 'react'
import { Check, Plus, Tag as TagIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from '@/components/ui/use-toast'
import { useCreateTag, useTags } from '@/hooks/useTags'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Props {
  value: string[]
  onChange: (tagIds: string[]) => void
}

export function TagPicker({ value, onChange }: Props) {
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const [draft, setDraft] = React.useState('')
  const [open, setOpen] = React.useState(false)

  const selected = tags.filter((tag) => value.includes(tag.id))

  async function handleCreate() {
    const nome = draft.trim()
    if (!nome) return

    const existing = tags.find((tag) => tag.nome.toLowerCase() === nome.toLowerCase())
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id])
      setDraft('')
      return
    }

    try {
      const tag = await createTag.mutateAsync({ nome })
      onChange([...value, tag.id])
      setDraft('')
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível criar a tag', description: errorMessage(error) })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="gap-1"
          style={{ borderColor: `${tag.cor}55`, color: tag.cor }}
        >
          {tag.nome}
          <button
            type="button"
            onClick={() => onChange(value.filter((id) => id !== tag.id))}
            aria-label={`Remover tag ${tag.nome}`}
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            ×
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
            <TagIcon className="h-3 w-3" />
            Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleCreate()
                  }
                }}
                placeholder="Nova tag…"
                className="h-8 text-sm"
              />
              <Button
                type="button"
                size="icon-sm"
                onClick={() => void handleCreate()}
                loading={createTag.isPending}
                aria-label="Criar tag"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma tag ainda. Crie a primeira acima.
              </p>
            ) : (
              <ul className="max-h-48 space-y-0.5 overflow-y-auto scrollbar-thin">
                {tags.map((tag) => {
                  const active = value.includes(tag.id)
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(active ? value.filter((id) => id !== tag.id) : [...value, tag.id])
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-accent',
                          active && 'bg-accent/60',
                        )}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.cor }} />
                        <span className="min-w-0 flex-1 truncate">{tag.nome}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
