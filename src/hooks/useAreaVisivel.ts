import * as React from 'react'

export interface AreaVisivel {
  /** Quantos pixels de altura estão de fato à vista — já sem o teclado. */
  altura: number
  /** O quanto o navegador empurrou a página para cima ao abrir o teclado. */
  topo: number
  /** O teclado virtual está tomando parte da tela. */
  tecladoAberto: boolean
}

/**
 * Quanto do teclado precisa aparecer para contar como "aberto".
 *
 * A barra de endereço do navegador some e volta com a rolagem, e isso também
 * muda a altura visível — em 50 a 90 pixels. Um teclado nunca tem menos de
 * 200. O corte fica entre os dois.
 */
const MINIMO_DO_TECLADO = 140

function ler(): { altura: number; topo: number; largura: number } {
  const vv = window.visualViewport
  if (!vv) return { altura: window.innerHeight, topo: 0, largura: window.innerWidth }
  /*
   * Com zoom de pinça, a "altura visível" encolhe sem teclado nenhum.
   *
   * Multiplicar pela escala devolve a altura na medida do layout, que só
   * diminui quando algo de fato cobre a tela. E o deslocamento só vale sem
   * zoom: ampliada, a página se arrasta pelo dedo, e seguir esse movimento
   * faria a tela inteira escorregar junto.
   */
  const semZoom = Math.abs(vv.scale - 1) < 0.01
  return {
    altura: Math.round(vv.height * vv.scale),
    topo: semZoom ? Math.round(vv.offsetTop) : 0,
    largura: window.innerWidth,
  }
}

/**
 * A área da tela que sobra à vista quando o teclado virtual abre.
 *
 * ----------------------------------------------------------------------------
 * Por que `100dvh` não resolve
 * ----------------------------------------------------------------------------
 * O teclado do celular não se comporta igual em todo lugar. No iPhone ele
 * cobre a página sem avisar o layout: `100vh` e `100dvh` continuam medindo a
 * tela inteira, e o que estava embaixo fica atrás do teclado — inclusive o
 * cursor. No Android, conforme a versão, a página encolhe de verdade ou é
 * coberta como no iPhone.
 *
 * A única medida que vale nos três casos é a do `visualViewport`: o retângulo
 * que a pessoa está realmente enxergando. Quem dimensiona o editor por ela
 * escreve sempre com o texto inteiro acima do teclado.
 *
 * `ativo = false` desliga os ouvintes — no computador ninguém precisa disto.
 */
export function useAreaVisivel(ativo: boolean): AreaVisivel {
  const [area, setArea] = React.useState<AreaVisivel>(() => {
    const { altura, topo } = ler()
    return { altura, topo, tecladoAberto: false }
  })
  /*
   * A maior altura já vista NESTA largura — ou seja, a tela sem teclado.
   *
   * Guardada por largura porque girar o aparelho troca as duas medidas: a
   * altura do retrato não serve de régua para a paisagem.
   */
  const semTeclado = React.useRef({ largura: 0, altura: 0 })

  React.useEffect(() => {
    if (!ativo) return

    const atualizar = () => {
      const agora = ler()
      const regua = semTeclado.current
      if (regua.largura !== agora.largura) {
        semTeclado.current = { largura: agora.largura, altura: agora.altura }
      } else if (agora.altura > regua.altura) {
        regua.altura = agora.altura
      }
      const tecladoAberto = semTeclado.current.altura - agora.altura > MINIMO_DO_TECLADO
      setArea((antes) =>
        antes.altura === agora.altura &&
        antes.topo === agora.topo &&
        antes.tecladoAberto === tecladoAberto
          ? antes
          : { altura: agora.altura, topo: agora.topo, tecladoAberto },
      )
    }

    atualizar()
    const vv = window.visualViewport
    // `scroll` também: no iPhone, abrir o teclado desloca a página sem mudar
    // a altura do layout, e é esse evento que avisa do deslocamento.
    vv?.addEventListener('resize', atualizar)
    vv?.addEventListener('scroll', atualizar)
    window.addEventListener('resize', atualizar)
    return () => {
      vv?.removeEventListener('resize', atualizar)
      vv?.removeEventListener('scroll', atualizar)
      window.removeEventListener('resize', atualizar)
    }
  }, [ativo])

  return area
}
