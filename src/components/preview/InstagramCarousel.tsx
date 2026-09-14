import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  images: string[]
  alt: string
}

/**
 * Área de mídia do carrossel: navegação por setas, swipe e indicadores
 * (bolinhas), como no app do Instagram.
 */
export function InstagramCarousel({ images, alt }: Props) {
  const [index, setIndex] = React.useState(0)
  const touchStartX = React.useRef<number | null>(null)

  const total = images.length
  const clamp = React.useCallback(
    (next: number) => Math.max(0, Math.min(total - 1, next)),
    [total],
  )

  const goTo = React.useCallback((next: number) => setIndex((current) => {
    const target = Math.max(0, Math.min(total - 1, next))
    return target === current ? current : target
  }), [total])

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(delta) > 40) goTo(clamp(index + (delta < 0 ? 1 : -1)))
    touchStartX.current = null
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') goTo(index + 1)
    if (event.key === 'ArrowLeft') goTo(index - 1)
  }

  return (
    <div className="w-full">
      <div
        className="relative aspect-square w-full select-none overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-roledescription="carrossel"
        aria-label={`Imagem ${index + 1} de ${total}`}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt={`${alt} — imagem ${i + 1}`}
              className="h-full w-full shrink-0 object-cover"
              draggable={false}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>

        {total > 1 && (
          <>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {index + 1}/{total}
            </span>

            {index > 0 && (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Imagem anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-neutral-800 shadow transition hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {index < total - 1 && (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Próxima imagem"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-neutral-800 shadow transition hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir para a imagem ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === index ? 'w-1.5 bg-[#0095f6]' : 'w-1.5 bg-neutral-300 dark:bg-neutral-600',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
