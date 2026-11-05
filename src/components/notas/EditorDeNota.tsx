import * as React from 'react'
import {
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  CheckSquare,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Strikethrough,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TIPOS_DE_DOCUMENTO,
  TIPOS_DE_IMAGEM,
  ehDocumentoAceito,
  type DocumentoAnexado as Documento,
} from '@/lib/notasAnexos'
import { DocumentoAnexado } from '@/components/notas/documentoAnexado'
import { ImagemRedimensionavel } from '@/components/notas/ImagemRedimensionavel'

/**
 * Imagem com o caminho do anexo preservado.
 *
 * O `src` que fica no editor é uma URL assinada, que expira. O `data-anexo`
 * é o caminho de verdade no bucket — é ele que sobrevive ao salvar e permite
 * gerar uma URL nova na próxima abertura.
 */
const ImagemAnexada = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      anexo: {
        default: null,
        parseHTML: (elemento: HTMLElement) => elemento.getAttribute('data-anexo'),
        renderHTML: (atributos: Record<string, unknown>) =>
          atributos.anexo ? { 'data-anexo': String(atributos.anexo) } : {},
      },
      /*
       * Largura escolhida por quem escreve. Vai para o atributo `width` do
       * HTML, e não para um style inline: é ele que atravessa o salvar, o
       * reabrir e a impressão em PDF sem depender de CSS do app.
       */
      largura: {
        default: null,
        parseHTML: (elemento: HTMLElement) => {
          const bruto = elemento.getAttribute('width')
          const numero = bruto ? Number.parseInt(bruto, 10) : NaN
          return Number.isFinite(numero) ? numero : null
        },
        renderHTML: (atributos: Record<string, unknown>) =>
          atributos.largura ? { width: String(atributos.largura) } : {},
      },
    }
  },
  // A imagem vira um componente React para ganhar as alças de redimensionar.
  addNodeView() {
    return ReactNodeViewRenderer(ImagemRedimensionavel)
  },
})

interface Props {
  /** HTML inicial, já com as URLs assinadas resolvidas. */
  conteudoInicial: string
  /** Chamado a cada mudança, com o HTML do editor. */
  onChange: (html: string) => void
  /** Sobe o arquivo e devolve o caminho no bucket. */
  onSubirImagem: (arquivo: File) => Promise<{ caminho: string; url: string }>
  /** Sobe um documento (PDF e afins) e devolve o que o cartão precisa. */
  onSubirDocumento: (arquivo: File) => Promise<Documento>
  /**
   * Avisa que um anexo não entrou, e por quê.
   *
   * O erro sobe para quem usa, em vez de virar um toast daqui: a página já
   * tem o canal de aviso dela, e um editor que abre o próprio toast acaba
   * mostrando dois para o mesmo problema.
   */
  onFalhaDeAnexo: (mensagem: string) => void
  /** Abre o seletor de notas para inserir uma ligação [[...]]. */
  onInserirLigacao: () => void
}

export interface EditorDeNotaRef {
  inserirTexto: (texto: string) => void
}

function BotaoDaBarra({
  ativo,
  titulo,
  onClick,
  children,
}: {
  ativo?: boolean
  titulo: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(ativo && 'bg-primary/15 text-primary')}
    >
      {children}
    </Button>
  )
}

function Barra({
  editor,
  onImagem,
  onDocumento,
  onLigacao,
  subindo,
}: {
  editor: Editor
  onImagem: () => void
  onDocumento: () => void
  onLigacao: () => void
  subindo: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
      <BotaoDaBarra
        titulo="Título"
        ativo={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra
        titulo="Negrito"
        ativo={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra
        titulo="Itálico"
        ativo={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra
        titulo="Riscado"
        ativo={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </BotaoDaBarra>

      <span className="mx-1 h-5 w-px bg-border" />

      <BotaoDaBarra
        titulo="Lista"
        ativo={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra
        titulo="Lista numerada"
        ativo={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra
        titulo="Lista de tarefas"
        ativo={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare className="h-4 w-4" />
      </BotaoDaBarra>

      <span className="mx-1 h-5 w-px bg-border" />

      <BotaoDaBarra titulo="Inserir imagem" onClick={onImagem}>
        {subindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </BotaoDaBarra>
      <BotaoDaBarra titulo="Anexar documento (PDF, Word, Excel…)" onClick={onDocumento}>
        <Paperclip className="h-4 w-4" />
      </BotaoDaBarra>
      <BotaoDaBarra titulo="Ligar a outra nota" onClick={onLigacao}>
        <Link2 className="h-4 w-4" />
      </BotaoDaBarra>
    </div>
  )
}

/**
 * IMPORTANTE: quem usa precisa passar `key={notaId}`.
 *
 * O `useEditor` do TipTap cria o gerenciador da instância uma única vez, num
 * `useState`. Trocar o array de dependências não garante que o `content` novo
 * seja aplicado — e foi assim que abrir outra nota montava o editor vazio,
 * mesmo com o conteúdo certo em mãos. Remontar o componente inteiro pela
 * `key` é o caminho do React, e não depende do que a biblioteca faz por
 * dentro.
 */
/**
 * Vale a pena interceptar este colar/arrastar?
 *
 * Só quando há pelo menos um arquivo que a nota sabe guardar. Se não houver,
 * o evento segue para o TipTap — é o que preserva o colar de texto, de HTML e
 * de imagem vinda de outra aba, que não chegam como `File`.
 */
function algumAceito(arquivos: File[]): boolean {
  return arquivos.some((a) => TIPOS_DE_IMAGEM.includes(a.type) || ehDocumentoAceito(a))
}

export const EditorDeNota = React.forwardRef<EditorDeNotaRef, Props>(function EditorDeNota(
  { conteudoInicial, onChange, onSubirImagem, onSubirDocumento, onInserirLigacao, onFalhaDeAnexo },
  ref,
) {
  const entradaRef = React.useRef<HTMLInputElement>(null)
  const entradaDocRef = React.useRef<HTMLInputElement>(null)
  const [subindo, setSubindo] = React.useState(false)

  // Mesmas refs do onChange, e pelo mesmo motivo: entrar no array de
  // dependências do editor recriaria a instância e perderia o cursor.
  const subirDocumentoRef = React.useRef(onSubirDocumento)
  subirDocumentoRef.current = onSubirDocumento
  const falhaRef = React.useRef(onFalhaDeAnexo)
  falhaRef.current = onFalhaDeAnexo

  // Ref, e não dependência: o onChange é recriado a cada render de quem usa, e
  // recriar o editor a cada tecla perderia o cursor.
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        ImagemAnexada.configure({ inline: false, allowBase64: false }),
        DocumentoAnexado,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({
          placeholder: 'Comece pelo título. A primeira linha nomeia a nota.',
        }),
      ],
      content: conteudoInicial,
      onUpdate: ({ editor: atual }) => onChangeRef.current(atual.getHTML()),
      editorProps: {
        attributes: {
          class:
            'prose-notas min-h-[22rem] px-5 py-4 focus:outline-none',
        },
        // Colar print é o jeito mais comum de pôr imagem numa nota; arrastar
        // um PDF da área de trabalho é o jeito mais comum de pôr documento.
        handlePaste: (_visao, evento) => {
          const arquivos = [...(evento.clipboardData?.files ?? [])]
          if (!algumAceito(arquivos)) return false
          evento.preventDefault()
          void inserirArquivos(arquivos)
          return true
        },
        handleDrop: (_visao, evento) => {
          const arrastado = evento as DragEvent
          const arquivos = [...(arrastado.dataTransfer?.files ?? [])]
          if (!algumAceito(arquivos)) return false
          evento.preventDefault()
          void inserirArquivos(arquivos)
          return true
        },
      },
  })

  const inserirArquivos = React.useCallback(
    async (arquivos: File[]) => {
      if (!editor || arquivos.length === 0) return
      setSubindo(true)
      try {
        for (const arquivo of arquivos) {
          /*
           * Um arquivo que falha não derruba os outros.
           *
           * Arrastar cinco PDFs e perder os cinco porque o terceiro passou do
           * limite é o pior desfecho possível: os quatro bons já tinham
           * subido. Cada um é tratado por si, e o que não entrou vira um aviso
           * nomeando o arquivo.
           */
          try {
            if (TIPOS_DE_IMAGEM.includes(arquivo.type)) {
              const { caminho, url } = await onSubirImagem(arquivo)
              editor.chain().focus().setImage({ src: url, alt: arquivo.name }).run()
              // O setImage não aceita atributos extras: o anexo entra logo
              // depois, no nó recém-criado, que é onde a seleção está.
              editor.commands.updateAttributes('image', { anexo: caminho })
              continue
            }

            if (ehDocumentoAceito(arquivo)) {
              const { caminho, nome, tipo, tamanho } = await subirDocumentoRef.current(arquivo)
              // `caminho` vira `anexo` aqui: a biblioteca fala em caminho de
              // bucket, e o nó do editor usa o mesmo nome de atributo que a
              // imagem já usa (`data-anexo`), para o HTML salvo ser coerente.
              editor.chain().focus().inserirDocumento({ anexo: caminho, nome, tipo, tamanho }).run()
              continue
            }

            falhaRef.current(`"${arquivo.name}" não é um tipo de arquivo aceito aqui.`)
          } catch (erro) {
            falhaRef.current(
              erro instanceof Error ? erro.message : `Não consegui anexar "${arquivo.name}".`,
            )
          }
        }
      } finally {
        setSubindo(false)
      }
    },
    [editor, onSubirImagem],
  )

  React.useImperativeHandle(ref, () => ({
    inserirTexto: (texto: string) => editor?.chain().focus().insertContent(texto).run(),
  }))

  if (!editor) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Barra
        editor={editor}
        subindo={subindo}
        onImagem={() => entradaRef.current?.click()}
        onDocumento={() => entradaDocRef.current?.click()}
        onLigacao={onInserirLigacao}
      />

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <EditorContent editor={editor} />
      </div>

      <input
        ref={entradaRef}
        type="file"
        accept={TIPOS_DE_IMAGEM.join(',')}
        multiple
        className="hidden"
        onChange={(evento) => {
          void inserirArquivos([...(evento.target.files ?? [])])
          evento.target.value = ''
        }}
      />

      {/*
        `accept` lista os tipos E as extensões.

        Só os tipos não basta: o Windows manda `File.type` vazio para vários
        documentos, e o seletor de arquivos esconderia justamente os que a
        pessoa quer anexar. Com a extensão na lista, eles aparecem.
      */}
      <input
        ref={entradaDocRef}
        type="file"
        accept={[
          ...TIPOS_DE_DOCUMENTO,
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.rtf', '.zip', '.json', '.txt', '.csv', '.md',
        ].join(',')}
        multiple
        className="hidden"
        onChange={(evento) => {
          void inserirArquivos([...(evento.target.files ?? [])])
          evento.target.value = ''
        }}
      />
    </div>
  )
})
