import { COR_DE_CATEGORIA, ROTULO_DE_CATEGORIA } from '@/lib/eventos'
import { cn } from '@/lib/utils'
import type { EventoRow } from '@/types/database'

interface Props {
  eventos: EventoRow[]
  /** O dia desta célula, para saber se o evento começa, continua ou termina. */
  dia: string
}

/**
 * A faixa de eventos dentro da célula do dia.
 *
 * Desenhada em cima dos cards de conteúdo, e deliberadamente MENOR que eles:
 * o calendário é de produção de conteúdo, e o evento é contexto, não tarefa.
 * Se a data roubasse o olho do item planejado, a grade perderia o que ela faz
 * de mais importante.
 *
 * Evento de vários dias ganha cantos retos no meio do intervalo, para a faixa
 * ler como uma barra contínua atravessando a semana em vez de três pílulas
 * soltas.
 */
export function MarcadorDeEventos({ eventos, dia }: Props) {
  if (eventos.length === 0) return null

  const visiveis = eventos.slice(0, 2)
  const escondidos = eventos.length - visiveis.length

  return (
    <div className="flex flex-col gap-0.5">
      {visiveis.map((evento) => {
        const comeca = evento.data === dia
        const termina = (evento.data_fim ?? evento.data) === dia
        return (
          <span
            key={evento.id}
            title={`${ROTULO_DE_CATEGORIA[evento.categoria]} · ${evento.titulo}`}
            className={cn(
              // `min-h`: no meio da faixa o rótulo é vazio, e sem altura
              // mínima a barra afinava justamente nos dias do meio — a feira
              // parecia três eventos em vez de um.
              'flex min-h-[0.95rem] items-center gap-1 overflow-hidden px-1 py-[0.1rem] text-[0.6rem] font-medium leading-tight text-white/95',
              COR_DE_CATEGORIA[evento.categoria],
              comeca ? 'rounded-l-sm' : '',
              termina ? 'rounded-r-sm' : '',
              !comeca && !termina ? 'rounded-none' : '',
            )}
          >
            {/* No meio de uma faixa longa o título já apareceu: repetir em
                toda célula vira ruído, então sobra só a cor da barra. */}
            <span className="truncate">{comeca ? evento.titulo : termina ? '…fim' : ''}</span>
          </span>
        )
      })}
      {escondidos > 0 && (
        <span className="pl-1 text-[0.58rem] font-medium leading-tight text-muted-foreground">
          +{escondidos} data{escondidos === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}
