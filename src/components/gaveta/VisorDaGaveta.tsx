import { Archive } from 'lucide-react'
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
  /** O conteúdo da ideia. Cada gaveta traz o seu. */
  children: React.ReactNode
  /** Devolve a ideia para hoje e fecha. */
  onUsarHoje: () => void
  /** Ações extras no rodapé, antes do "Usar hoje". */
  acoes?: React.ReactNode
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
 * Por que é SÓ LEITURA
 * ----------------------------------------------------------------------------
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
  children,
  onUsarHoje,
  acoes,
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
            Guardada em ideias soltas · estava em {formatShortDate(guardadaDe)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-5 py-3 sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Só leitura. Para editar, traga a ideia de volta para um dia.
          </p>
          <div className="flex items-center gap-2">
            {acoes}
            <Button size="sm" onClick={onUsarHoje}>
              Usar hoje
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
