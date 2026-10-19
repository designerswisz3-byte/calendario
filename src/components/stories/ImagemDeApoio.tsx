import * as React from 'react'
import { ImagePlus, Loader2, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TIPOS_DE_IMAGEM } from '@/lib/notasAnexos'
import { cn } from '@/lib/utils'

interface Props {
  url: string | null
  descricao: string
  subindo: boolean
  /** Já existe um assunto escolhido? Muda o verbo do botão, não o estado. */
  temTema: boolean
  onArquivo: (arquivo: File) => void
  onDescricao: (texto: string) => void
  onRemover: () => void
  onRegerar: () => void
}

/**
 * A imagem que ancora a sequência.
 *
 * Aqui mora uma decisão de produto que vale explicar: o app roda no navegador
 * e não tem como LER a imagem — isso exigiria um modelo de visão, que exigiria
 * uma chave de API dentro do bundle, que é chave pública.
 *
 * Em vez de fingir que lê, a tela pede a única coisa que falta: uma linha
 * dizendo o que a foto mostra. Com ela, a sequência inteira passa a girar em
 * torno daquela imagem — a curiosidade se aproxima dela, a autoridade a segura
 * na mão, a enquete aparece por cima dela. São cinco palavras de trabalho, e o
 * resultado é coeso de verdade em vez de coeso no discurso.
 */
export function ImagemDeApoio({
  url,
  descricao,
  subindo,
  temTema,
  onArquivo,
  onDescricao,
  onRemover,
  onRegerar,
}: Props) {
  const entrada = React.useRef<HTMLInputElement>(null)
  const [sobre, setSobre] = React.useState(false)

  function primeiraImagem(lista: FileList | DataTransferItemList | null) {
    if (!lista) return null
    for (const item of Array.from(lista as ArrayLike<File | DataTransferItem>)) {
      const arquivo = 'getAsFile' in item ? item.getAsFile() : item
      if (arquivo && TIPOS_DE_IMAGEM.includes(arquivo.type)) return arquivo
    }
    return null
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        setSobre(true)
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault()
        setSobre(false)
        const arquivo = primeiraImagem(e.dataTransfer.files)
        if (arquivo) onArquivo(arquivo)
      }}
      /*
       * Colar funciona em qualquer lugar do bloco, e não só num campo de
       * texto: o gesto natural depois de dar print na tela é Ctrl+V onde o
       * olho está, não procurar um campo para focar antes.
       */
      onPaste={(e) => {
        const arquivo = primeiraImagem(e.clipboardData.items)
        if (arquivo) {
          e.preventDefault()
          onArquivo(arquivo)
        }
      }}
      tabIndex={0}
      className={cn(
        'space-y-3 rounded-lg border border-dashed p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
        sobre ? 'border-primary bg-primary/5' : 'border-border/70',
      )}
    >
      <div className="flex items-center gap-2">
        <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm font-medium">Imagem de apoio</p>
        {subindo && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {url ? (
        <div className="flex gap-3">
          <img
            src={url}
            alt={descricao || 'Imagem de apoio da sequência'}
            className="h-28 w-28 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="imagem-descricao" className="text-xs">
                O que esta imagem mostra?
              </Label>
              <Input
                id="imagem-descricao"
                value={descricao}
                onChange={(e) => onDescricao(e.target.value)}
                placeholder="o galpão da produção"
              />
              <p className="text-xs text-muted-foreground">
                Um objeto ou lugar, como se fosse completar "vou mostrar…". Não é a legenda do
                story — é o que aparece na tela.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/*
                O botão só desabilita por falta de descrição — e, quando
                desabilita, a linha abaixo diz o porquê. Controle cinza sem
                explicação na tela é o pior tipo de trava: a pessoa fica
                clicando e conclui que o produto está quebrado.
              */}
              <Button size="sm" disabled={!descricao.trim()} onClick={onRegerar}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                {temTema ? 'Regerar em torno da imagem' : 'Gerar sequência a partir da imagem'}
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemover}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remover
              </Button>
            </div>

            {!descricao.trim() ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Escreva acima o que a imagem mostra para liberar o botão.
              </p>
            ) : (
              !temTema && (
                <p className="text-xs text-muted-foreground">
                  O assunto é escolhido pela sua descrição e aparece em "Assunto da sequência".
                  Dá para trocar depois.
                </p>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Arraste uma imagem, cole com Ctrl+V ou escolha um arquivo.
          </p>
          <Button size="sm" variant="outline" onClick={() => entrada.current?.click()} disabled={subindo}>
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            Escolher imagem
          </Button>
        </div>
      )}

      <input
        ref={entrada}
        type="file"
        accept={TIPOS_DE_IMAGEM.join(',')}
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) onArquivo(arquivo)
          e.target.value = ''
        }}
      />
    </section>
  )
}
