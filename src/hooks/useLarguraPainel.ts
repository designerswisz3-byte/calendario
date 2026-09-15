import * as React from 'react'

const CHAVE = 'painel-dia-largura'
const MIN = 380
/** Deixa uma faixa do calendário à mostra, para não virar tela cheia sem querer. */
const MARGEM_DIREITA = 120

function maximo() {
  if (typeof window === 'undefined') return 720
  return Math.max(MIN, window.innerWidth - MARGEM_DIREITA)
}

function limitar(valor: number) {
  return Math.min(maximo(), Math.max(MIN, valor))
}

/**
 * Largura do painel do dia, arrastável pela borda esquerda.
 *
 * O briefing costuma ser longo, e ler um roteiro inteiro numa coluna estreita
 * é desconfortável. A escolha fica guardada no navegador — quem alargou uma
 * vez não quer alargar de novo a cada abertura.
 */
export function useLarguraPainel() {
  const [largura, setLargura] = React.useState<number>(() => {
    if (typeof window === 'undefined') return 512
    const salvo = Number(window.localStorage.getItem(CHAVE))
    return Number.isFinite(salvo) && salvo > 0 ? limitar(salvo) : 512
  })
  const [arrastando, setArrastando] = React.useState(false)

  // Se a janela encolher, a largura acompanha em vez de estourar a tela.
  React.useEffect(() => {
    const aoRedimensionar = () => setLargura((atual) => limitar(atual))
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])

  const iniciarArrasto = React.useCallback((evento: React.PointerEvent) => {
    evento.preventDefault()
    evento.stopPropagation()
    setArrastando(true)

    // O painel abre pela direita: arrastar para a esquerda aumenta a largura.
    const mover = (e: PointerEvent) => setLargura(limitar(window.innerWidth - e.clientX))

    const soltar = () => {
      setArrastando(false)
      document.removeEventListener('pointermove', mover)
      document.removeEventListener('pointerup', soltar)
      document.body.style.removeProperty('user-select')
      document.body.style.removeProperty('cursor')
      setLargura((atual) => {
        try {
          window.localStorage.setItem(CHAVE, String(atual))
        } catch {
          /* modo privado: só não guarda */
        }
        return atual
      })
    }

    // Sem isso o arrasto seleciona o texto do painel inteiro.
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('pointermove', mover)
    document.addEventListener('pointerup', soltar)
  }, [])

  const redefinir = React.useCallback(() => {
    setLargura(512)
    try {
      window.localStorage.removeItem(CHAVE)
    } catch {
      /* idem */
    }
  }, [])

  return { largura, arrastando, iniciarArrasto, redefinir }
}
