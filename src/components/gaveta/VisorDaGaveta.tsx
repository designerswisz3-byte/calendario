import { Archive, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatShortDate } from '@/lib/date'

interface Props {
  aberto: boolean
  onFechar: () => void
  titulo: string
  /** A data em que a ideia estava marcada antes de ser guardada. */
  guardadaDe: string
  /** O nome da gaveta onde ela está. Padrão: "ideias soltas". */
  gaveta?: string
  /** O conteúdo da ideia. Cada gaveta traz o seu. */
  children: React.ReactNode
  /** Devolve a ideia para hoje e fecha. */
  onUsarHoje: () => void
  /** Ações extras no rodapé, antes do "Usar hoje". */
  acoes?: React.ReactNode
  /**
   * Abre a edição. Quando informado, o rodapé troca o aviso de "só leitura"
   * por um botão Editar. A gaveta de stories não informa e continua só leitura.
   */
  onEditar?: () => void
  /**
   * Substitui o rodapé inteiro. É o que a edição usa: enquanto se escreve, os
   * botões são Cancelar e Salvar — "Usar hoje" no meio de uma edição tiraria o
   * item da gaveta com o texto pela metade.
   */
  rodape?: React.ReactNode
}

/**
 * A janela que mostra o que está escrito numa ideia guardada.
 *
 * ----------------------------------------------------------------------------
 * O problema que ela resolve
 * ----------------------------------------------------------------------------
 * A gaveta guardava, e só. O card mostrava o título e mais nada, e a única
 * forma de reler o briefing, o roteiro ou os stories era arrastar a ideia de
 * volta para um dia — ou seja, sujar a grade só para lembrar do que se tratava,
 * e depois guardar de novo.
 *
 * Isso virava um desincentivo a usar a gaveta: ideia que não dá para consultar
 * é ideia esquecida, e uma gaveta de ideias esquecidas é uma lixeira com outro
 * nome. Ela existe justamente porque a ideia de novembro é a pauta de janeiro,
 * e isso só acontece se dentro dela der para ler.
 *
 * ----------------------------------------------------------------------------
 * Por que nasceu SÓ LEITURA — e o que mudou
 * ----------------------------------------------------------------------------
 * (Os itens do calendário passaram a ser editáveis aqui quando surgiu a gaveta
 * de roteiros prontos: ver EditorDoItemGuardado. O raciocínio abaixo continua
 * valendo para as sequências de stories, que seguem só para leitura.)
 *
 * A gaveta continua sendo guarda, não bancada de trabalho. Editar aqui exigiria
 * duplicar o painel do dia e o editor de sequência dentro de um modal, e criaria
 * duas telas que fazem a mesma coisa de dois jeitos diferentes — que é como
 * nascem as divergências de comportamento entre elas.
 *
 * O caminho continua curto, e agora é informado: leia, decida, e use "Usar
 * hoje" para trazer a ideia de volta à grade, onde ela se edita como qualquer
 * outra. A diferença é que agora a decisão é tomada ANTES de mexer no mês, em
 * vez de depois.
 */
export function VisorDaGaveta({
  aberto,
  onFechar,
  titulo,
  guardadaDe,
  gaveta = 'ideias soltas',
  children,
  onUsarHoje,
  acoes,
  onEditar,
  rodape,
}: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      {/*
        `max-h` com rolagem interna, e não altura livre: roteiro de reel passa
        de mil palavras, e sem o teto o modal cresceria para fora da tela
        levando os botões do rodapé junto.
      */}
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="pr-6 text-base leading-snug">{titulo}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Archive className="h-3 w-3 shrink-0" aria-hidden />
            Em {gaveta} · estava em {formatShortDate(guardadaDe)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-5 py-3 sm:justify-between">
          {rodape ?? (
            <>
              {onEditar ? (
                <Button size="sm" variant="outline" onClick={onEditar}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
              ) : (
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Só leitura. Para editar, traga a ideia de volta para um dia.
                </p>
              )}
              <div className="flex items-center gap-2">
                {acoes}
                <Button size="sm" onClick={onUsarHoje}>
                  Usar hoje
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
