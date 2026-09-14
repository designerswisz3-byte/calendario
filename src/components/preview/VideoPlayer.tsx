import * as React from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  src: string
  /** Se este é o vídeo em exibição. Fora de cena, pausa e rebobina. */
  ativo: boolean
  /** Mudo e volume vêm de fora para a preferência seguir de slide em slide. */
  mudo: boolean
  volume: number
  onMudoChange: (mudo: boolean) => void
  onVolumeChange: (volume: number) => void
  objectFit?: 'cover' | 'contain'
  onMetadata?: (largura: number, altura: number) => void
  className?: string
}

function formatarTempo(segundos: number) {
  if (!Number.isFinite(segundos)) return '0:00'
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Vídeo do preview com som, linha do tempo e volume.
 *
 * Começa mudo porque todo navegador bloqueia autoplay com áudio — sem isso o
 * vídeo simplesmente não tocaria. O som fica a um clique, e a escolha do
 * cliente vale para os slides seguintes.
 */
export function VideoPlayer({
  src,
  ativo,
  mudo,
  volume,
  onMudoChange,
  onVolumeChange,
  objectFit = 'cover',
  onMetadata,
  className,
}: Props) {
  const ref = React.useRef<HTMLVideoElement>(null)
  const [tocando, setTocando] = React.useState(false)
  const [tempo, setTempo] = React.useState(0)
  const [duracao, setDuracao] = React.useState(0)

  // Só o vídeo em cena toca; os outros pausam e voltam ao início.
  React.useEffect(() => {
    const video = ref.current
    if (!video) return
    if (ativo) {
      void video.play().catch(() => {
        /* autoplay recusado: o cliente aperta play */
      })
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [ativo])

  React.useEffect(() => {
    const video = ref.current
    if (!video) return
    video.muted = mudo
    video.volume = volume
  }, [mudo, volume])

  function alternarPlay(event: React.MouseEvent) {
    event.stopPropagation()
    const video = ref.current
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }

  function buscar(event: React.ChangeEvent<HTMLInputElement>) {
    const video = ref.current
    if (!video || !Number.isFinite(duracao)) return
    const alvo = (Number(event.target.value) / 100) * duracao
    video.currentTime = alvo
    setTempo(alvo)
  }

  const progresso = duracao > 0 ? (tempo / duracao) * 100 : 0

  return (
    <div className={cn('group relative h-full w-full', className)}>
      <video
        ref={ref}
        src={src}
        className={cn('h-full w-full', objectFit === 'cover' ? 'object-cover' : 'object-contain')}
        loop
        playsInline
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onTimeUpdate={(event) => setTempo(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const el = event.currentTarget
          setDuracao(el.duration)
          el.muted = mudo
          el.volume = volume
          onMetadata?.(el.videoWidth, el.videoHeight)
        }}
      />

      {/* Barra de controle */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 opacity-90 transition-opacity duration-200 group-hover:opacity-100"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progresso}
          onChange={buscar}
          aria-label="Linha do tempo do vídeo"
          className="video-range mb-1.5 w-full"
          style={{ ['--progresso' as string]: `${progresso}%` }}
        />

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={alternarPlay}
            aria-label={tocando ? 'Pausar' : 'Reproduzir'}
            className="rounded p-0.5 transition hover:opacity-80"
          >
            {tocando ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <span className="text-[0.7rem] tabular-nums text-white/90">
            {formatarTempo(tempo)} / {formatarTempo(duracao)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={mudo ? 0 : volume}
              onChange={(event) => {
                const v = Number(event.target.value)
                onVolumeChange(v)
                onMudoChange(v === 0)
              }}
              aria-label="Volume"
              className="video-range w-16 sm:w-20"
              style={{ ['--progresso' as string]: `${(mudo ? 0 : volume) * 100}%` }}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onMudoChange(!mudo)
              }}
              aria-label={mudo ? 'Ativar som' : 'Desativar som'}
              className="rounded p-0.5 transition hover:opacity-80"
            >
              {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
