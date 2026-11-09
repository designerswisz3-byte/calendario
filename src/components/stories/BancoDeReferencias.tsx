import * as React from 'react'
import { Download, ExternalLink, Images, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TIPOS_DE_IMAGEM, urlAssinada, urlParaBaixar } from '@/lib/notasAnexos'
import { cn } from '@/lib/utils'
import type { ReferenciaComUrl } from '@/hooks/useReferencias'

interface Props {
  referencias: ReferenciaComUrl[]
  carregando: boolean
  subindo: boolean
  onSubir: (arquivos: File[]) => void
  onLegenda: (id: string, legenda: string) => void
  onExcluir: (referencia: ReferenciaComUrl) => void
}

/**
 * O banco de referências visuais da aba Stories.
 *
 * ----------------------------------------------------------------------------
 * O que ele guarda, e por que não é a gaveta de ideias
 * ----------------------------------------------------------------------------
 * A gaveta guarda SEQUÊNCIA: texto, tema, arco — coisas que voltam para a
 * grade. Isto aqui guarda INSUMO: o print do story alheio, a foto da arara, a
 * tela do relatório, o enquadramento que funcionou. Referência não tem data e
 * não entra num dia; ela fica à mão enquanto a sequência é escrita.
 *
 * Hoje essas imagens moram no rolo da câmera e somem: a que explicaria a
 * sequência de quinta está a três mil fotos de distância na quinta.
 *
 * ----------------------------------------------------------------------------
 * Por que a legenda existe
 * ----------------------------------------------------------------------------
 * O app roda no navegador e não tem como LER a imagem — isso exigiria um
 * modelo de visão, que exigiria uma chave de API dentro do bundle, que é chave
 * pública. Em vez de fingir que lê, a tela pede a única coisa que falta: uma
 * linha dizendo o que a foto mostra. É o mesmo campo que a imagem de apoio da
 * sequência já pede, e serve para o mesmo: fazer o texto girar em torno
 * daquela imagem em vez de só exibi-la.
 */
export function BancoDeReferencias({
  referencias,
  carregando,
  subindo,
  onSubir,
  onLegenda,
  onExcluir,
}: Props) {
  const entrada = React.useRef<HTMLInputElement>(null)
  const painel = React.useRef<HTMLElement>(null)
  const [sobre, setSobre] = React.useState(false)
  const [aberta, setAberta] = React.useState<string | null>(null)

  // A referência aberta sai da lista ATUAL: some sozinha quando é excluída.
  const emFoco = referencias.find((r) => r.id === aberta) ?? null

  const imagensDe = React.useCallback((lista: FileList | null | undefined) => {
    return [...(lista ?? [])].filter((a) => TIPOS_DE_IMAGEM.includes(a.type))
  }, [])

  /*
   * Ctrl+V em qualquer lugar da aba, com duas exceções.
   *
   * O ouvinte vive no `document` e não no painel, e isso é deliberado: exigir
   * que a pessoa clique no painel antes de colar é exigir que ela saiba que o
   * painel existe e tem foco — ou seja, é o mesmo que não ter atalho. Colar um
   * print recém-tirado tem de funcionar assim que a aba está na frente.
   *
   * As duas exceções existem porque colar também significa outra coisa:
   *
   *  1. dentro de um campo de texto, colar é colar TEXTO. Sem esta guarda,
   *     colar uma legenda copiada com um print no histórico subiria a imagem;
   *  2. com um diálogo aberto (o editor de sequência, a leitura da gaveta), a
   *     atenção está lá dentro. Uma referência aparecendo atrás, sem ser vista,
   *     é pior que nada acontecer.
   */
  React.useEffect(() => {
    function aoColar(evento: ClipboardEvent) {
      const alvo = evento.target as HTMLElement | null
      const editando =
        alvo?.isContentEditable ||
        ['INPUT', 'TEXTAREA'].includes(alvo?.tagName ?? '')
      if (editando) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return

      const imagens = imagensDe(evento.clipboardData?.files)
      if (imagens.length === 0) return
      evento.preventDefault()
      onSubir(imagens)
    }

    document.addEventListener('paste', aoColar)
    return () => document.removeEventListener('paste', aoColar)
  }, [imagensDe, onSubir])

  async function abrirOuBaixar(referencia: ReferenciaComUrl, acao: 'abrir' | 'baixar') {
    const nome = referencia.legenda.trim() || 'referencia'
    /*
     * A aba nasce ANTES do await, e sem `noopener` na string de opções.
     *
     * Depois do await o bloqueador de pop-up barra, porque a janela já não vem
     * do gesto. E `noopener` ali faria `window.open` devolver `null` por
     * especificação, mesmo com a aba aberta — o código acharia que foi
     * bloqueado. A proteção vira `opener = null` logo depois.
     */
    const aba = acao === 'abrir' ? window.open('', '_blank') : null
    const url =
      acao === 'abrir'
        ? await urlAssinada(referencia.caminho)
        : await urlParaBaixar(referencia.caminho, `${nome}.jpg`)

    if (!url) {
      aba?.close()
      return
    }
    if (acao === 'abrir') {
      if (aba) {
        aba.opener = null
        aba.location.href = url
      }
      return
    }
    const link = document.createElement('a')
    link.href = url
    link.download = `${nome}.jpg`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <>
      <section
        ref={painel}
        aria-label={`Referências, ${referencias.length} ${referencias.length === 1 ? 'imagem' : 'imagens'}`}
        onDragOver={(e) => {
          e.preventDefault()
          setSobre(true)
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSobre(false)
          const imagens = imagensDe(e.dataTransfer?.files)
          if (imagens.length > 0) onSubir(imagens)
        }}
        className={cn(
          'flex w-full flex-col gap-2 rounded-lg border border-dashed border-border/70 bg-white/30 p-2.5 transition-all duration-200 dark:bg-white/[0.03]',
          sobre && 'border-solid border-primary bg-accent/70 ring-2 ring-primary/40 dark:bg-accent/40',
        )}
      >
        <header className="flex items-center gap-1.5">
          <Images className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Referências
          </h3>
          {referencias.length > 0 && (
            <span className="ml-auto rounded-full bg-foreground/10 px-1.5 text-[0.62rem] font-semibold tabular-nums text-muted-foreground">
              {referencias.length}
            </span>
          )}
        </header>

        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-[0.68rem]"
          disabled={subindo}
          onClick={() => entrada.current?.click()}
        >
          {subindo ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          {subindo ? 'Subindo…' : 'Adicionar imagem'}
        </Button>

        {referencias.length === 0 ? (
          /* Igual à gaveta vazia: explica o gesto em vez de dizer "vazio".
             Alvo de colar que não se anuncia é alvo que ninguém descobre. */
          <p className="rounded-md border border-dashed border-border/60 p-3 text-[0.68rem] leading-relaxed text-muted-foreground">
            {carregando
              ? 'Carregando…'
              : 'Cole um print com Ctrl+V, arraste uma imagem para cá ou use o botão. Fica guardada aqui para inspirar as sequências.'}
          </p>
        ) : (
          <div className="grid max-h-[32rem] grid-cols-2 gap-1.5 overflow-y-auto scrollbar-thin">
            {referencias.map((referencia) => (
              <button
                key={referencia.id}
                type="button"
                onClick={() => setAberta(referencia.id)}
                title={referencia.legenda || 'Sem legenda'}
                className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-foreground/5 transition-colors hover:border-primary/50"
              >
                {referencia.url ? (
                  <img
                    src={referencia.url}
                    alt={referencia.legenda}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* O arquivo sumiu do bucket. Mostra o buraco em vez de uma
                     imagem quebrada do navegador, que parece defeito do app. */
                  <span className="flex h-full w-full items-center justify-center p-1 text-center text-[0.58rem] leading-tight text-muted-foreground">
                    imagem indisponível
                  </span>
                )}
                {referencia.legenda && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-left text-[0.55rem] text-white">
                    {referencia.legenda}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <input
          ref={entrada}
          type="file"
          accept={TIPOS_DE_IMAGEM.join(',')}
          multiple
          className="hidden"
          onChange={(evento) => {
            const imagens = imagensDe(evento.target.files)
            if (imagens.length > 0) onSubir(imagens)
            evento.target.value = ''
          }}
        />
      </section>

      <Dialog open={Boolean(emFoco)} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent className="max-w-3xl">
          {emFoco && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-base">Referência</DialogTitle>
                <DialogDescription className="text-xs">
                  A legenda é o que o gerador lê como objeto da cena. Uma linha basta.
                </DialogDescription>
              </DialogHeader>

              {emFoco.url ? (
                <img
                  src={emFoco.url}
                  alt={emFoco.legenda}
                  className="max-h-[55vh] w-full rounded-md object-contain"
                />
              ) : (
                <p className="rounded-md border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  O arquivo desta referência não está mais no armazenamento.
                </p>
              )}

              <Input
                defaultValue={emFoco.legenda}
                placeholder="O que esta imagem mostra"
                /* `onBlur`, e não `onChange`: salvar a cada tecla seria uma
                   gravação por letra. O diálogo só fecha pelo botão ou pelo
                   Esc, e os dois tiram o foco do campo antes. */
                onBlur={(e) => {
                  const novo = e.target.value.trim()
                  if (novo !== emFoco.legenda) onLegenda(emFoco.id, novo)
                }}
              />

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setAberta(null)
                    onExcluir(emFoco)
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Excluir
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void abrirOuBaixar(emFoco, 'baixar')}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Baixar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void abrirOuBaixar(emFoco, 'abrir')}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Abrir
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
