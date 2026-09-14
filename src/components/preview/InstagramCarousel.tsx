import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaType } from '@/types/database'

export interface CarouselSlide {
  url: string
  tipo: MediaType
}

interface Props {
  slides: CarouselSlide[]
  alt: string
}

/**
 * Área de mídia do carrossel: navegação por setas, swipe e indicadores
 * (bolinhas), como no app do Instagram. Aceita imagem e vídeo no mesmo
 * carrossel — só o slide visível toca, para não disputar rede e CPU.
 */
export function InstagramCarousel({ slides, alt }: Props) {
  const [index, setIndex] = React.useState(0)
  const touchStartX = React.useRef<number | null>(null)
  const videoRefs = React.useRef<Array<HTMLVideoElement | null>>([])

  const total = slides.length

  const goTo = React.useCallback(
    (next: number) =>
      setIndex((current) => {
        const target = Math.max(0, Math.min(total - 1, next))
        return target === current ? current : target
      }),
    [total],
  )

  // Toca só o slide ativo; os demais voltam ao início e pausam.
  React.useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      if (i === index) {
        void video.play().catch(() => {
          /* autoplay bloqueado pelo navegador: o pôster continua visível */
        })
      } else {
        video.pause()
        video.currentTime = 0
      }
    })
  }, [index, total])

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1))
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
        aria-label={`Mídia ${index + 1} de ${total}`}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) =>
            slide.tipo === 'video' ? (
              <video
                key={`${slide.url}-${i}`}
                ref={(el) => {
                  videoRefs.current[i] = el
                }}
                src={slide.url}
                className="h-full w-full shrink-0 object-cover"
                loop
                muted
                playsInline
                preload="metadata"
                controls={false}
              />
            ) : (
              <img
                key={`${slide.url}-${i}`}
                src={slide.url}
                alt={`${alt} — mídia ${i + 1}`}
                className="h-full w-full shrink-0 object-cover"
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ),
          )}
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
                aria-label="Mídia anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-neutral-800 shadow transition hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {index < total - 1 && (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Próxima mídia"
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
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir para a mídia ${i + 1}`}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all duration-200',
                i === index ? 'bg-[#0095f6]' : 'bg-neutral-300 dark:bg-neutral-600',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
