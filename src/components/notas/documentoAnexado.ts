import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CartaoDeDocumento } from '@/components/notas/CartaoDeDocumento'

/**
 * O nó do documento anexado.
 *
 * ----------------------------------------------------------------------------
 * Por que um nó próprio, e não um link
 * ----------------------------------------------------------------------------
 * A saída mais barata seria inserir `<a href="anexo:…">contrato.pdf</a>`. Ela
 * quebra em três pontos, e os três doem:
 *
 *  1. Um link é texto. Quem escreve consegue apagar metade do nome, digitar no
 *     meio dele e colar o cursor dentro — e o anexo passa a ter um nome que
 *     não é o do arquivo. `atom: true` faz o cartão ser uma coisa só: entra,
 *     sai, mas não se edita por dentro.
 *  2. Link não tem onde pendurar tamanho e tipo. Eles teriam de ser buscados
 *     no Storage a cada abertura da nota, uma ida de rede por anexo, só para
 *     escrever "2,4 MB" na tela.
 *  3. `href="anexo:…"` é um esquema que o navegador não conhece. Clicar não
 *     faria nada, e seria preciso interceptar o clique de qualquer jeito.
 *
 * ----------------------------------------------------------------------------
 * O que fica no HTML salvo
 * ----------------------------------------------------------------------------
 *   <div data-documento data-anexo="<uuid>/notas/<uuid>.pdf"
 *        data-nome="contrato.pdf" data-tipo="application/pdf"
 *        data-tamanho="2516582"></div>
 *
 * Caminho, não URL. URL assinada expira em uma hora e o HTML fica para
 * sempre — gravá-la seria gravar um link morto. O cartão pede a assinatura no
 * clique, que é quando ela precisa existir.
 *
 * Por isso este nó NÃO passa por `paraExibicao`/`paraArmazenamento` como a
 * imagem: não há nada para traduzir na ida nem na volta. O que está salvo é o
 * que o editor mostra.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentoAnexado: {
      inserirDocumento: (atributos: {
        anexo: string
        nome: string
        tipo: string
        tamanho: number
      }) => ReturnType
    }
  }
}

/** Lê um atributo `data-*`, devolvendo o padrão quando ele não está lá. */
const lerTexto = (nome: string, padrao = '') =>
  function (elemento: HTMLElement) {
    return elemento.getAttribute(nome) ?? padrao
  }

export const DocumentoAnexado = Node.create({
  name: 'documentoAnexado',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      anexo: { default: '', parseHTML: lerTexto('data-anexo') },
      nome: { default: 'Documento', parseHTML: lerTexto('data-nome', 'Documento') },
      tipo: { default: '', parseHTML: lerTexto('data-tipo') },
      tamanho: {
        default: 0,
        parseHTML: (elemento: HTMLElement) => Number(elemento.getAttribute('data-tamanho')) || 0,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-documento]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { anexo, nome, tipo, tamanho } = HTMLAttributes as Record<string, unknown>
    return [
      'div',
      mergeAttributes({
        'data-documento': '',
        'data-anexo': String(anexo ?? ''),
        'data-nome': String(nome ?? ''),
        'data-tipo': String(tipo ?? ''),
        'data-tamanho': String(tamanho ?? 0),
      }),
      /*
       * O nome vai DENTRO da div, além de ir no atributo.
       *
       * O cartão é desenhado pelo componente React e não depende deste texto.
       * Mas o HTML salvo também é lido fora do editor — na impressão da nota e
       * em qualquer lugar que mostre o conteúdo cru. Sem o texto aqui, o anexo
       * sumiria dessas telas sem deixar rastro, como se nunca tivesse existido.
       */
      String(nome ?? ''),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CartaoDeDocumento)
  },

  addCommands() {
    return {
      inserirDocumento:
        (atributos) =>
        ({ chain, state }) => {
          /*
           * Insere em `selection.to`, e não na seleção.
           *
           * Depois de inserir um nó atômico, ele fica SELECIONADO. Mandar o
           * próximo para a seleção substituiria o anterior — anexar dois PDFs
           * seguidos deixaria só o segundo. Em `to`, o novo entra depois.
           */
          const posicao = state.selection.to
          const conteudo: { type: string; attrs?: Record<string, unknown> }[] = [
            { type: this.name, attrs: atributos },
          ]

          /*
           * Um parágrafo vazio quando o anexo fica por último — e isto não é
           * capricho de formatação.
           *
           * Nó atômico no fim do documento não deixa lugar para o cursor
           * depois dele. O ProseMirror resolve selecionando o PRÓPRIO nó, e
           * aí a primeira tecla digitada SUBSTITUI o anexo: o cartão some e
           * vira a letra que a pessoa apertou. Medido no navegador —
           * anexar no fim e continuar escrevendo apagava o arquivo da nota,
           * sem aviso e sem jeito de perceber antes de salvar.
           *
           * No meio do texto o problema não existe (já há parágrafo depois),
           * e por isso o parágrafo extra só entra quando é necessário.
           */
          const fimDoDocumento = state.doc.content.size
          if (posicao >= fimDoDocumento - 1) conteudo.push({ type: 'paragraph' })

          return chain().insertContentAt(posicao, conteudo).focus().run()
        },
    }
  },
})
