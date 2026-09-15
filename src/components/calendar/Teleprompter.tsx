import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ChevronUp,
  FlipHorizontal2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  roteiro: string
  titulo?: string
}

/** Pixels por segundo em cada passo de velocidade. */
const VELOCIDADE_MIN = 1
const VELOCIDADE_MAX = 30
const PX_POR_PASSO = 6

const FONTE_MIN = 20
const FONTE_MAX = 96

const CHAVE_PREFS = 'teleprompter-prefs'

interface Prefs {
  velocidade: number
  fonte: number
  espelhado: boolean
}

function lerPrefs(): Prefs {
  const padrao: Prefs = { velocidade: 6, fonte: 44, espelhado: false }
  if (typeof window === 'undefined') return padrao
  try {
    const bruto = window.localStorage.getItem(CHAVE_PREFS)
    return bruto ? { ...padrao, ...JSON.parse(bruto) } : padrao
  } catch {
    return padrao
  }
}

/**
 * Teleprompter de tela cheia.
 *
 * O texto sobe sozinho, e tudo que muda o ritmo pode ser mexido DURANTE a
 * gravação — ninguém acerta a velocidade de primeira, e parar para reconfigurar
 * significa regravar. Daí os atalhos de teclado: a mão sai do teclado para
 * gravar, mas a barra de espaço continua alcançável.
 */
export function Teleprompter({ aberto, onOpenChange, roteiro, titulo }: Props) {
  const areaRef = React.useRef<HTMLDivElement>(null)
  const restoRef = React.useRef(0)
  const quadroRef = React.useRef<number | null>(null)
  const ultimoRef = React.useRef<number | null>(null)

  const [prefs, setPrefs] = React.useState<Prefs>(lerPrefs)
  const [tocando, setTocando] = React.useState(false)
  const [contagem, setContagem] = React.useState<number | null>(null)
  const [progresso, setProgresso] = React.useState(0)
  const [controlesVisiveis, setControlesVisiveis] = React.useState(true)

  const atualizarPrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((atual) => {
      const proximo = { ...atual, ...patch }
      try {
        window.localStorage.setItem(CHAVE_PREFS, JSON.stringify(proximo))
      } catch {
        /* modo privado: só não guarda */
      }
      return proximo
    })
  }, [])

  const reiniciar = React.useCallback(() => {
    setTocando(false)
    restoRef.current = 0
    setProgresso(0)
    if (areaRef.current) areaRef.current.scrollTop = 0
  }, [])

  // Ao abrir, começa do zero com 3 segundos de respiro para posicionar a câmera.
  React.useEffect(() => {
    if (!aberto) {
      setTocando(false)
      setContagem(null)
      return
    }
    reiniciar()
    setContagem(3)
  }, [aberto, reiniciar])

  React.useEffect(() => {
    if (contagem === null) return
    if (contagem === 0) {
      setContagem(null)
      setTocando(true)
      return
    }
    const t = setTimeout(() => setContagem((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [contagem])

  // O laço de rolagem. Acumula fração de pixel para a velocidade baixa não
  // travar em zero por arredondamento.
  React.useEffect(() => {
    if (!tocando) {
      ultimoRef.current = null
      if (quadroRef.current) cancelAnimationFrame(quadroRef.current)
      return
    }

    const passo = (agora: number) => {
      const area = areaRef.current
      if (!area) return
      const anterior = ultimoRef.current ?? agora
      const dt = Math.min(100, agora - anterior) / 1000
      ultimoRef.current = agora

      restoRef.current += prefs.velocidade * PX_POR_PASSO * dt
      const inteiro = Math.floor(restoRef.current)
      if (inteiro >= 1) {
        area.scrollTop += inteiro
        restoRef.current -= inteiro
      }

      const max = area.scrollHeight - area.clientHeight
      setProgresso(max > 0 ? Math.min(100, (area.scrollTop / max) * 100) : 100)

      if (max > 0 && area.scrollTop >= max - 1) {
        setTocando(false)
        return
      }
      quadroRef.current = requestAnimationFrame(passo)
    }

    quadroRef.current = requestAnimationFrame(passo)
    return () => {
      if (quadroRef.current) cancelAnimationFrame(quadroRef.current)
    }
  }, [tocando, prefs.velocidade])

  // Esconde os controles enquanto roda, para não aparecerem na gravação.
  React.useEffect(() => {
    if (!aberto) return
    let t: ReturnType<typeof setTimeout>
    const mostrar = () => {
      setControlesVisiveis(true)
      clearTimeout(t)
      if (tocando) t = setTimeout(() => setControlesVisiveis(false), 2500)
    }
    mostrar()
    window.addEventListener('mousemove', mostrar)
    window.addEventListener('touchstart', mostrar)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', mostrar)
      window.removeEventListener('touchstart', mostrar)
    }
  }, [aberto, tocando])

  // Atalhos: a mão sai do teclado para gravar, mas espaço e setas ficam perto.
  React.useEffect(() => {
    if (!aberto) return

    const aoTeclar = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          setContagem(null)
          setTocando((v) => !v)
          break
        case 'Escape':
          onOpenChange(false)
          break
        case 'ArrowUp':
          e.preventDefault()
          atualizarPrefs({ velocidade: Math.min(VELOCIDADE_MAX, prefs.velocidade + 1) })
          break
        case 'ArrowDown':
          e.preventDefault()
          atualizarPrefs({ velocidade: Math.max(VELOCIDADE_MIN, prefs.velocidade - 1) })
          break
        case '+':
        case '=':
          atualizarPrefs({ fonte: Math.min(FONTE_MAX, prefs.fonte + 4) })
          break
        case '-':
          atualizarPrefs({ fonte: Math.max(FONTE_MIN, prefs.fonte - 4) })
          break
        case 'r':
          reiniciar()
          break
        case 'm':
          atualizarPrefs({ espelhado: !prefs.espelhado })
          break
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, prefs, atualizarPrefs, onOpenChange, reiniciar])

  // Trava a rolagem do fundo: rolar a página por trás do teleprompter durante
  // a gravação é a receita para perder o lugar no texto.
  React.useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [aberto])

  if (!aberto) return null

  const semRoteiro = !roteiro.trim()

  /*
   * Portal para o body. `position: fixed` deixa de ser relativo à janela
   * quando algum ancestral tem transform, filter, backdrop-filter ou contain —
   * e a casca do app tem. Sem isto o teleprompter ficava 20px abaixo do topo,
   * deixando uma faixa da interface aparecendo na gravação.
   */
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* Texto */}
      <div
        ref={areaRef}
        className="no-scrollbar flex-1 overflow-y-auto overscroll-contain"
        style={{ transform: prefs.espelhado ? 'scaleX(-1)' : undefined }}
      >
        {semRoteiro ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-lg text-neutral-500">
            Este item ainda não tem roteiro. Escreva na aba Roteiro e volte.
          </div>
        ) : (
          <div
            className="mx-auto max-w-4xl whitespace-pre-wrap break-words px-6 text-center font-semibold leading-[1.45]"
            // Espaço em branco no topo e no rodapé: o texto começa e termina no
            // centro da tela, que é onde a câmera fica.
            style={{ fontSize: prefs.fonte, paddingTop: '45vh', paddingBottom: '55vh' }}
          >
            {roteiro}
          </div>
        )}
      </div>

      {/* Linha de leitura: marca onde os olhos devem ficar */}
      <div className="pointer-events-none absolute inset-x-0 top-[45vh] z-10 flex items-center gap-2 px-4 opacity-30">
        <span className="h-px flex-1 bg-white" />
        <span className="h-px flex-1 bg-white" />
      </div>

      {/* Contagem regressiva */}
      {contagem !== null && contagem > 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <span className="text-[12rem] font-bold tabular-nums leading-none">{contagem}</span>
        </div>
      )}

      {/* Progresso */}
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-white/15">
        <div className="h-full bg-white transition-[width] duration-100" style={{ width: `${progresso}%` }} />
      </div>

      {/* Controles */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/80 backdrop-blur-sm transition-opacity duration-300',
          controlesVisiveis ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setContagem(null)
              setTocando((v) => !v)
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85"
            aria-label={tocando ? 'Pausar' : 'Reproduzir'}
          >
            {tocando ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-sm text-white/80 transition hover:text-white"
            aria-label="Voltar ao início"
          >
            <RotateCcw className="h-4 w-4" />
            Início
          </button>

          {/* Velocidade */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-white/50">Velocidade</span>
            <button
              type="button"
              onClick={() => atualizarPrefs({ velocidade: Math.max(VELOCIDADE_MIN, prefs.velocidade - 1) })}
              aria-label="Diminuir velocidade"
              className="rounded p-1 text-white/70 transition hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={VELOCIDADE_MIN}
              max={VELOCIDADE_MAX}
              value={prefs.velocidade}
              onChange={(e) => atualizarPrefs({ velocidade: Number(e.target.value) })}
              aria-label="Velocidade do teleprompter"
              className="video-range w-24"
              style={{
                ['--progresso' as string]: `${((prefs.velocidade - VELOCIDADE_MIN) / (VELOCIDADE_MAX - VELOCIDADE_MIN)) * 100}%`,
              }}
            />
            <button
              type="button"
              onClick={() => atualizarPrefs({ velocidade: Math.min(VELOCIDADE_MAX, prefs.velocidade + 1) })}
              aria-label="Aumentar velocidade"
              className="rounded p-1 text-white/70 transition hover:text-white"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="w-6 text-sm tabular-nums text-white/90">{prefs.velocidade}</span>
          </div>

          {/* Tamanho da fonte */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide text-white/50">Fonte</span>
            <button
              type="button"
              onClick={() => atualizarPrefs({ fonte: Math.max(FONTE_MIN, prefs.fonte - 4) })}
              aria-label="Diminuir fonte"
              className="rounded p-1 text-white/70 transition hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums text-white/90">{prefs.fonte}</span>
            <button
              type="button"
              onClick={() => atualizarPrefs({ fonte: Math.min(FONTE_MAX, prefs.fonte + 4) })}
              aria-label="Aumentar fonte"
              className="rounded p-1 text-white/70 transition hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => atualizarPrefs({ espelhado: !prefs.espelhado })}
            aria-pressed={prefs.espelhado}
            aria-label="Espelhar texto"
            title="Espelhar — para rigs de teleprompter com vidro"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition',
              prefs.espelhado ? 'bg-white text-black' : 'text-white/70 hover:text-white',
            )}
          >
            <FlipHorizontal2 className="h-4 w-4" />
            Espelhar
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto flex items-center gap-1.5 text-sm text-white/70 transition hover:text-white"
            aria-label="Fechar teleprompter"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
        </div>

        <p className="border-t border-white/10 px-4 py-1.5 text-center text-[0.68rem] text-white/40">
          {titulo ? `${titulo} · ` : ''}
          espaço pausa · ↑↓ velocidade · +/− fonte · R reinicia · M espelha · Esc fecha
        </p>
      </div>
    </div>,
    document.body,
  )
}
