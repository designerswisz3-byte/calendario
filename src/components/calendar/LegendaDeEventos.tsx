import { CalendarRange, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COR_DE_CATEGORIA, ROTULO_DE_CATEGORIA } from '@/lib/eventos'
import { CATALOGO_DE_EVENTOS } from '@/data/catalogoDeEventos'
import { cn } from '@/lib/utils'
import type { CategoriaDeEvento } from '@/types/database'

interface Props {
  /** Quantos eventos caem na janela visível — só para decidir o tom do texto. */
  total: number
  importando: boolean
  onImportar: () => void
}

const CATEGORIAS: CategoriaDeEvento[] = ['comercial', 'sazonal', 'setorial', 'feriado']

/**
 * Legenda das cores + o botão que traz o catálogo.
 *
 * A legenda existe porque quatro cores sem dicionário viram enfeite: quem abre
 * a grade precisa saber, sem clicar, se a barra amarela é feira ou Black
 * Friday.
 *
 * O botão fica sempre à vista, e não só quando o mês está vazio, porque a
 * importação é idempotente (upsert por data + título): clicar de novo atualiza
 * os ângulos em vez de duplicar as datas. Esconder o botão depois da primeira
 * importação tiraria justamente o caminho de atualizar.
 */
export function LegendaDeEventos({ total, importando, onImportar }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Datas no mês: {total}
      </span>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {CATEGORIAS.map((categoria) => (
          <span key={categoria} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-3 rounded-sm', COR_DE_CATEGORIA[categoria])} aria-hidden />
            {ROTULO_DE_CATEGORIA[categoria]}
          </span>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 px-2 text-xs"
        disabled={importando}
        onClick={onImportar}
        title="Reimportar atualiza os ângulos; não duplica as datas."
      >
        {importando && <Loader2 className="h-3 w-3 animate-spin" />}
        {total === 0 ? 'Carregar' : 'Atualizar'} catálogo ({CATALOGO_DE_EVENTOS.length} datas)
      </Button>
    </div>
  )
}
