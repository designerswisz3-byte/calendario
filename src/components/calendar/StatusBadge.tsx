import { Badge } from '@/components/ui/badge'
import { STATUS_BADGE, STATUS_LABEL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { CalendarStatus } from '@/types/database'

export function StatusBadge({ status, className }: { status: CalendarStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_BADGE[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
