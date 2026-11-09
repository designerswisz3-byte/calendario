import { Clock, FileText, ImageIcon, NotebookPen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TypeIcon } from '@/components/calendar/TypeIcon'
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL } from '@/lib/constants'
import { formatTime } from '@/lib/date'
import { briefingSemOTitulo, resumoDoRoteiro } from '@/lib/texto'
import { cn } from '@/lib/utils'
import type { CalendarItemWithRelations } from '@/types/database'

/**
 * O que está escrito num item do calendário, só para ler.
 *
 * Vive dentro do visor da gaveta, onde a pessoa precisa decidir se vale trazer
 * a ideia de volta. Mostra, nesta ordem: o que é (tipo, status, horário e
 * etiquetas), o briefing e o roteiro — que é a ordem em que ela lembra do item.
 *
 * O texto aparece INTEIRO, sem cortar em "ver mais". Metade de um briefing não
 * ajuda a decidir nada, e o visor já rola.
 */

function Secao({
  icone: Icone,
  titulo,
  extra,
  children,
}: {
  icone: typeof FileText
  titulo: string
  extra?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {titulo}
        {extra && <span className="font-normal normal-case tracking-normal">· {extra}</span>}
      </h3>
      {children}
    </section>
  )
}

/**
 * Texto com as quebras de linha preservadas.
 *
 * `whitespace-pre-wrap` e não `<p>` por parágrafo: o briefing é escrito num
 * textarea, onde a pessoa separa as ideias com Enter. Renderizar como HTML
 * colapsaria tudo numa frase só e perderia justamente a estrutura que ela deu.
 */
function Texto({ children }: { children: string }) {
  return (
    <p className="whitespace-pre-wrap break-words rounded-md bg-foreground/[0.035] p-3 text-sm leading-relaxed">
      {children}
    </p>
  )
}

export function ConteudoDoItem({ item }: { item: CalendarItemWithRelations }) {
  const horario = formatTime(item.horario)
  /*
   * Sem a primeira linha: ela já é o título do visor, no cabeçalho logo acima.
   * Repeti-la aqui fazia o mesmo texto aparecer duas vezes seguidas — e, num
   * briefing de uma linha só, o corpo inteiro era o eco do cabeçalho.
   */
  const briefing = briefingSemOTitulo(item.notas)
  const roteiro = item.roteiro?.trim() ?? ''
  const legenda = item.preview?.legenda?.trim() ?? ''
  const imagens = item.preview?.media_assets.filter((a) => a.tipo === 'imagem') ?? []

  /*
   * Uma ideia pode ter sido guardada com o título e mais nada — é o caso mais
   * comum, porque é o que acontece quando ela nasce de um impulso. Dizer isso
   * é melhor que mostrar um modal vazio, que parece defeito.
   */
  const vazia = !briefing && !roteiro && !legenda && imagens.length === 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="gap-1 text-[0.7rem] font-normal">
          <TypeIcon tipo={item.tipo} />
          {TYPE_LABEL[item.tipo]}
        </Badge>
        <Badge variant="outline" className={cn('text-[0.7rem] font-normal', STATUS_BADGE[item.status])}>
          {STATUS_LABEL[item.status]}
        </Badge>
        {horario && (
          <Badge variant="outline" className="gap-1 text-[0.7rem] font-normal tabular-nums">
            <Clock className="h-3 w-3" />
            {horario}
          </Badge>
        )}
        {item.tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="text-[0.7rem] font-normal">
            {tag.nome}
          </Badge>
        ))}
      </div>

      {vazia && (
        <p className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Esta ideia foi guardada só com o título — não há briefing nem roteiro escrito ainda.
        </p>
      )}

      {briefing && (
        <Secao icone={NotebookPen} titulo="Briefing">
          <Texto>{briefing}</Texto>
        </Secao>
      )}

      {roteiro && (
        <Secao icone={FileText} titulo="Roteiro" extra={resumoDoRoteiro(roteiro)}>
          <Texto>{roteiro}</Texto>
        </Secao>
      )}

      {(legenda || imagens.length > 0) && (
        <Secao icone={ImageIcon} titulo="Conteúdo anexado">
          {imagens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagens.map((imagem) => (
                <img
                  key={imagem.id}
                  src={imagem.url_arquivo}
                  alt=""
                  className="h-20 w-20 rounded-md border border-border/60 object-cover"
                />
              ))}
            </div>
          )}
          {legenda && <Texto>{legenda}</Texto>}
        </Secao>
      )}
    </div>
  )
}
