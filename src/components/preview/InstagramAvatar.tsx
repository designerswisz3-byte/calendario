import { cn } from '@/lib/utils'

/** Foto de perfil genérica: inicial do expert dentro do anel gradiente do IG. */
export function InstagramAvatar({
  name,
  size = 32,
  ring = true,
  className,
}: {
  name: string
  size?: number
  ring?: boolean
  className?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        padding: ring ? 2 : 0,
        background: ring
          ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
          : undefined,
      }}
      aria-hidden
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
        style={{ fontSize: Math.max(10, size * 0.42) }}
      >
        {initial}
      </span>
    </span>
  )
}
