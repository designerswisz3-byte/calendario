import { Clapperboard, Images, Lightbulb, Square, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanningType } from '@/types/database'

const ICONS: Record<PlanningType, typeof Images> = {
  carrossel: Images,
  reels: Clapperboard,
  story: Zap,
  post: Square,
  ideia: Lightbulb,
}

export function TypeIcon({ tipo, className }: { tipo: PlanningType; className?: string }) {
  const Icon = ICONS[tipo]
  return <Icon className={cn('h-3.5 w-3.5', className)} aria-hidden />
}
