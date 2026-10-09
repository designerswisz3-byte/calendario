import * as React from 'react'
import { createPortal } from 'react-dom'

export interface ConteudoParaImprimir {
  titulo: string
  /** HTML do editor, com as URLs assinadas já resolvidas. */
  html: string
  /** SVG do desenho da nota, como data URL. Null quando não há desenho. */
  desenho: string | null
  atualizadoEm: string
}

interface Props {
  conteudo: ConteudoParaImprimir | null
  onConcluido: () => void
}

/**
 * Exporta a nota em PDF pelo motor de impressão do navegador.
 *
 * Por que não jsPDF + html2canvas: aquele caminho tira uma FOTO da tela. O PDF
 * sai com texto que não dá para selecionar nem buscar, imagem reamostrada e
 * quebra de página no meio de um parágrafo. O motor do navegador já resolve
 * paginação, fonte e imagem em resolução cheia — e não custa dependência
 * nenhuma. O preço é um clique a mais: a pessoa escolhe "Salvar como PDF" no
 * diálogo de impressão.
 *
 * Montado por portal no `document.body` porque a página vive dentro de
 * contêineres com `overflow` e `transform`; nascer lá dentro significaria ser
 * recortado justamente na hora de imprimir.
 *
 * A classe `area-de-impressao` é o que a regra de @media print procura para
 * esconder o app em volta — é compartilhada com a impressão do Relatório.
 */
export function ImpressaoDaNota({ conteudo, onConcluido }: Props) {
  const areaRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!conteudo) return
    let cancelado = false

    async function imprimir() {
      // Imagem ainda carregando sai em branco no PDF: espera todas antes.
      const imagens = [...(areaRef.current?.querySelectorAll('img') ?? [])]
      await Promise.all(
        imagens.map(
          (img) =>
            img.complete ||
            new Promise<void>((resolver) => {
              img.addEventListener('load', () => resolver(), { once: true })
              img.addEventListener('error', () => resolver(), { once: true })
            }),
        ),
      )
      // Um quadro para o layout assentar com as imagens já medidas.
      await new Promise((resolver) => requestAnimationFrame(resolver))
      if (cancelado) return

      window.print()
      onConcluido()
    }

    void imprimir()
    return () => {
      cancelado = true
    }
  }, [conteudo, onConcluido])

  if (!conteudo) return null

  return createPortal(
    <div ref={areaRef} className="area-de-impressao impressao-da-nota" aria-hidden>
      <h1>{conteudo.titulo || 'Nota sem título'}</h1>
      <p className="impressao-data">
        {new Date(conteudo.atualizadoEm).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {/*
        O HTML vem do nosso próprio editor: o ProseMirror só produz os nós e
        marcas que registramos, então não há caminho para marcação arbitrária
        entrar aqui. É conteúdo do dono da nota, para o PDF do dono da nota.
      */}
      <div className="impressao-corpo" dangerouslySetInnerHTML={{ __html: conteudo.html }} />

      {conteudo.desenho && (
        <div className="impressao-desenho">
          <img src={conteudo.desenho} alt="Desenho da nota" />
        </div>
      )}
    </div>,
    document.body,
  )
}
