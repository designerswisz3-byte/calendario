import { Filter, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PLANNING_TYPES, STATUSES, STATUS_LABEL, TYPE_LABEL } from '@/lib/constants'
import type { CalendarStatus, PlanningType, TagRow } from '@/types/database'

export interface CalendarFilters {
  tipos: PlanningType[]
  statuses: CalendarStatus[]
  tagIds: string[]
  search: string
}

export const EMPTY_FILTERS: CalendarFilters = { tipos: [], statuses: [], tagIds: [], search: '' }

interface Props {
  filters: CalendarFilters
  onChange: (filters: CalendarFilters) => void
  tags: TagRow[]
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export function FiltersBar({ filters, onChange, tags }: Props) {
  const activeCount =
    filters.tipos.length + filters.statuses.length + filters.tagIds.length + (filters.search ? 1 : 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Buscar por expert ou notas…"
          className="pl-9"
          aria-label="Buscar"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filtros
            {activeCount > 0 && (
              <Badge className="ml-1 h-5 min-w-5 justify-center px-1 tabular-nums">{activeCount}</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Tipo</DropdownMenuLabel>
          {PLANNING_TYPES.map((tipo) => (
            <DropdownMenuCheckboxItem
              key={tipo}
              checked={filters.tipos.includes(tipo)}
              onCheckedChange={() => onChange({ ...filters, tipos: toggle(filters.tipos, tipo) })}
              onSelect={(event) => event.preventDefault()}
            >
              {TYPE_LABEL[tipo]}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.statuses.includes(status)}
              onCheckedChange={() =>
                onChange({ ...filters, statuses: toggle(filters.statuses, status) })
              }
              onSelect={(event) => event.preventDefault()}
            >
              {STATUS_LABEL[status]}
            </DropdownMenuCheckboxItem>
          ))}

          {tags.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tags</DropdownMenuLabel>
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={filters.tagIds.includes(tag.id)}
                  onCheckedChange={() =>
                    onChange({ ...filters, tagIds: toggle(filters.tagIds, tag.id) })
                  }
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.cor }} />
                    {tag.nome}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  )
}
