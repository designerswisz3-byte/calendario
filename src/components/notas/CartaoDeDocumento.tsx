import * as React from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import {
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { extensaoDoNome, formatarTamanho, urlAssinada, urlParaBaixar } from '@/lib/notasAnexos'
import { cn } from '@/lib/utils'

/**
 * O documento anexado, como cartão dentro da nota.
 *
 * ----------------------------------------------------------------------------
 * Por que o cartão NÃO guarda uma URL
 * ----------------------------------------------------------------------------
 * As imagens da nota precisam de uma URL assinada no `src` para aparecerem, e
 * por isso o editor troca `anexo:<caminho>` por uma URL a cada abertura. Com
 * documento não é preciso: o cartão se desenha inteiro com nome, tipo e
 * tamanho, que ficam no próprio HTML.
 *
 * Então ele pede a URL só no clique. Isso resolve de graça o problema que a
 * imagem tem de administrar: a URL assinada vale uma hora, e o HTML da nota
 * fica guardado para sempre. Uma nota aberta de manhã e clicada à tarde abre
 * normalmente, porque a assinatura nasce no momento do clique.
 */

const ICONE_POR_EXTENSAO: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  rtf: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
}

/** Só o PDF ganha cor: é o único que o navegador abre sem baixar. */
const COR_POR_EXTENSAO: Record<string, string> = {
  pdf: 'text-red-600 dark:text-red-400',
  xls: 'text-emerald-600 dark:text-emerald-400',
  xlsx: 'text-emerald-600 dark:text-emerald-400',
  csv: 'text-emerald-600 dark:text-emerald-400',
  ppt: 'text-orange-600 dark:text-orange-400',
  pptx: 'text-orange-600 dark:text-orange-400',
}

type Acao = 'abrir' | 'baixar'

export function CartaoDeDocumento({ node, deleteNode, editor, selected }: NodeViewProps) {
  const caminho = String(node.attrs.anexo ?? '')
  const nome = String(node.attrs.nome ?? 'Documento')
  const tamanho = Number(node.attrs.tamanho) || 0

  const [ocupado, setOcupado] = React.useState<Acao | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  const extensao = extensaoDoNome(nome)
  const Icone = ICONE_POR_EXTENSAO[extensao] ?? File
  const editavel = editor.isEditable

  /*
   * O clique inteiro passa por aqui, inclusive o "abrir".
   *
   * Abrir a aba depois de um `await` é o caminho que os bloqueadores de
   * pop-up barram, porque a janela não nasce mais do gesto da pessoa. Por
   * isso a aba é aberta ANTES de pedir a assinatura, ainda dentro do clique,
   * e só depois mandada para a URL.
   *
   * E o `noopener` NÃO vai na string de opções, por mais natural que pareça:
   * com ele, `window.open` devolve `null` por especificação, mesmo quando a
   * aba abriu. O código então acharia que o pop-up foi bloqueado e cairia no
   * `window.location.href` — trocando a nota pelo PDF na mesma aba, sempre.
   * Foi exatamente isso que o teste de navegador pegou.
   *
   * A proteção continua existindo, por outro caminho: `opener = null` logo
   * depois, que corta o acesso da aba nova à página da nota e ainda deixa o
   * handle na mão. Com isso, `null` volta a significar o que precisa
   * significar — pop-up bloqueado de verdade.
   */
  async function agir(acao: Acao) {
    if (!caminho || ocupado) return
    setErro(null)
    setOcupado(acao)

    const aba = acao === 'abrir' ? window.open('', '_blank') : null

    try {
      const url = acao === 'abrir' ? await urlAssinada(caminho) : await urlParaBaixar(caminho, nome)

      if (!url) {
        aba?.close()
        setErro('Não consegui abrir este arquivo. Ele pode ter sido removido do armazenamento.')
        return
      }

      if (acao === 'abrir') {
        if (aba) {
          aba.opener = null
          aba.location.href = url
        } else {
          // Pop-up bloqueado de verdade. Em vez de perder o clique em
          // silêncio, diz o que aconteceu e oferece o botão que funciona —
          // navegar na própria aba levaria a nota embora sem avisar.
          setErro('O navegador bloqueou a aba nova. Use o botão de baixar, ou libere pop-ups aqui.')
        }
        return
      }

      // Baixar é uma âncora descartável: `createSignedUrl` com `download` já
      // manda o cabeçalho que faz o navegador salvar em vez de exibir.
      const link = document.createElement('a')
      link.href = url
      link.download = nome
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      aba?.close()
      setErro('Não consegui falar com o armazenamento agora. Tente de novo.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <NodeViewWrapper
      // `not-prose` impede o CSS de tipografia da nota de estilizar o cartão
      // como se ele fosse texto — sem isso o botão herda sublinhado e margem.
      className="not-prose my-3"
      data-arrastavel
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-3 transition-colors',
          selected && 'border-primary/60 ring-1 ring-primary/30',
        )}
      >
        <Icone
          className={cn('h-8 w-8 shrink-0', COR_POR_EXTENSAO[extensao] ?? 'text-muted-foreground')}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          {/* `break-all` e não `truncate`: nome de arquivo é o que identifica
              o anexo, e cortar "Contrato-fornecedor-2026-assinado.pdf" em
              "Contrato-forn…" tira justamente a parte que distingue um do
              outro quando há três anexos na mesma nota. */}
          <p className="break-all text-sm font-medium leading-snug">{nome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[extensao.toUpperCase(), formatarTamanho(tamanho)].filter(Boolean).join(' · ')}
          </p>
          {erro && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {erro}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void agir('abrir')}
            disabled={ocupado !== null}
            title={`Abrir ${nome} em outra aba`}
          >
            {ocupado === 'abrir' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 hidden sm:inline">Abrir</span>
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => void agir('baixar')}
            disabled={ocupado !== null}
            title={`Baixar ${nome}`}
            aria-label={`Baixar ${nome}`}
          >
            {ocupado === 'baixar' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>

          {editavel && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => deleteNode()}
              title={`Tirar ${nome} da nota`}
              aria-label={`Tirar ${nome} da nota`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/*
        Tirar o cartão da nota NÃO apaga o arquivo do bucket.

        É deliberado, e é o mesmo que a imagem faz: desfazer com Ctrl+Z tem de
        trazer o anexo de volta, e não traria se o arquivo já tivesse sido
        destruído. O custo é arquivo órfão no bucket — e é para isso que
        `anexosDe` existe em notasAnexos.ts, esperando uma limpeza.
      */}
    </NodeViewWrapper>
  )
}
