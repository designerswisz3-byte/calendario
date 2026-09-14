import * as React from 'react'
import { cn } from '@/lib/utils'

interface Props {
  expert: string
  legenda: string
  className?: string
  /** Legenda longa começa recolhida com "mais", como no feed real. */
  collapsible?: boolean
}

const COLLAPSE_AT = 160

export function InstagramCaption({ expert, legenda, className, collapsible = true }: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const isLong = legenda.length > COLLAPSE_AT
  const showToggle = collapsible && isLong && !expanded
  const text = showToggle ? `${legenda.slice(0, COLLAPSE_AT).trimEnd()}… ` : legenda

  return (
    <p className={cn('whitespace-pre-wrap break-words text-sm leading-[1.35]', className)}>
      <span className="font-semibold">{expert}</span>{' '}
      <span>{text}</span>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-neutral-500 hover:text-neutral-400"
        >
          mais
        </button>
      )}
    </p>
  )
}
