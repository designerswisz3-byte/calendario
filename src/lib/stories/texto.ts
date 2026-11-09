import type { StoryDaSequencia } from '@/types/database'

/**
 * Uma sequência SALVA em texto corrido, para colar em qualquer lugar.
 *
 * Existe separada de `sequenciaEmTexto` (em gerador.ts) porque as duas partem
 * de coisas diferentes: aquela recebe o que o gerador acabou de produzir, esta
 * recebe o que está gravado no banco — já editado, já com stories
 * acrescentados à mão, e possivelmente sem os campos que só existem desde a
 * reforma do gerador.
 *
 * Mora num arquivo próprio porque tem dois clientes: o botão de copiar do
 * editor e o da leitura na gaveta. Em dois lugares, o mesmo texto escrito duas
 * vezes vira duas versões do roteiro — e quem copia de um lado não entende por
 * que o outro saiu diferente.
 */
export function sequenciaSalvaEmTexto(
  titulo: string,
  stories: StoryDaSequencia[],
  observacao: string,
): string {
  const partes: string[] = [titulo, '']

  for (const story of stories) {
    partes.push(story.momento ? `${story.rotulo} — publicar: ${story.momento}` : story.rotulo)
    partes.push(`(${story.direcao_visual})`)
    partes.push('')
    partes.push(story.texto)
    /*
     * O pedido entra no texto copiado porque é informação de gravação: sem
     * ele, quem cola a sequência no bloco de notas perde a enquete, a tarja e
     * a palavra que a pessoa tem de mandar — justamente o que não está na fala
     * e precisa ser montado na tela.
     */
    if (story.pedido) {
      partes.push('')
      partes.push(`▸ Pedido — ${story.pedido}`)
    }
    if (story.depois_do_pedido) partes.push(`▸ Depois — ${story.depois_do_pedido}`)
    partes.push('')
  }

  partes.push(observacao)
  return partes.join('\n')
}
