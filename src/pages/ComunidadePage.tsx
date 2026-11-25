import * as React from 'react'
import { Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import {
  EXPLICACAO_DE_IMPORTANCIA,
  ROTULO_DE_IMPORTANCIA,
  TEMAS,
  diasDaSemana,
  segundaDaSemana,
  somarDias,
  temaDaSemana,
  type Importancia,
} from '@/lib/comunidade'
import { formatShortDate, todayKey } from '@/lib/date'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMarcarFalado, useTemasFalados } from '@/hooks/useComunidade'

const DIA_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "24 a 30 de novembro" ou "30 de novembro a 6 de dezembro". */
function intervaloDaSemana(segunda: string): string {
  const domingo = somarDias(segunda, 6)
  const [, mesA, diaA] = segunda.split('-').map(Number)
  const [, mesB, diaB] = domingo.split('-').map(Number)
  return mesA === mesB
    ? `${diaA} a ${diaB} de ${MESES[mesB - 1]}`
    : `${diaA} de ${MESES[mesA - 1]} a ${diaB} de ${MESES[mesB - 1]}`
}

/*
 * A importância em três degraus, do mais forte para o mais discreto.
 *
 * Um degrau só de cor — e não vermelho, amarelo, verde — porque aqui não há
 * "ruim": o tema médio também vale ser falado. O que muda é o peso, e peso se
 * lê em intensidade.
 */
const ESTILO_DA_IMPORTANCIA: Record<Importancia, string> = {
  5: 'border-transparent bg-primary text-primary-foreground',
  4: 'border-primary/30 bg-primary/10 text-primary',
  3: 'border-border bg-transparent text-muted-foreground',
}

function SeloDeImportancia({ nivel }: { nivel: Importancia }) {
  return (
    <span
      title={EXPLICACAO_DE_IMPORTANCIA[nivel]}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium leading-tight',
        ESTILO_DA_IMPORTANCIA[nivel],
      )}
    >
      {/* Três pontos: o nível também se lê sem depender da cor. */}
      <span className="flex items-center gap-0.5" aria-hidden>
        {[3, 4, 5].map((degrau) => (
          <span
            key={degrau}
            className={cn('h-1 w-1 rounded-full bg-current', degrau > nivel && 'opacity-25')}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">Importância: </span>
        {ROTULO_DE_IMPORTANCIA[nivel]}
      </span>
    </span>
  )
}

export default function ComunidadePage() {
  const hoje = todayKey()
  /*
   * A semana em tela é guardada pela SEGUNDA-FEIRA dela.
   *
   * Avançar e voltar somam e tiram sete dias de uma data que já é segunda —
   * sem recalcular "em que semana estou" a cada clique, que é onde nasceriam
   * os erros de virada de mês e de ano.
   */
  const [segunda, setSegunda] = React.useState(() => segundaDaSemana(hoje))
  const { data: falados = [], error: erroDosFalados } = useTemasFalados()
  const marcar = useMarcarFalado()

  const tema = temaDaSemana(segunda)
  const dias = diasDaSemana(segunda)
  const estaSemana = segunda === segundaDaSemana(hoje)

  const faladoNoDia = React.useMemo(() => new Set(falados.map((f) => f.data)), [falados])
  /*
   * A última vez que cada subtema foi falado.
   *
   * A pauta se repete a cada ciclo. Quando o tema volta, saber que ele já foi
   * falado — e quando — muda o que fazer: aprofundar em vez de repetir a
   * mesma abertura para o mesmo grupo.
   */
  const ultimaVezDoSubtema = React.useMemo(() => {
    const mapa = new Map<string, string>()
    for (const linha of falados) {
      const anterior = mapa.get(linha.subtema_id)
      if (!anterior || linha.data > anterior) mapa.set(linha.subtema_id, linha.data)
    }
    return mapa
  }, [falados])

  const feitosNaSemana = dias.filter((dia) => faladoNoDia.has(dia.data)).length
  const posicaoNoCiclo = TEMAS.indexOf(tema) + 1

  async function alternar(data: string, subtemaId: string) {
    try {
      await marcar.mutateAsync({ data, subtemaId, falado: !faladoNoDia.has(data) })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível marcar',
        description: errorMessage(erro),
      })
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comunidade</h1>
          <p className="text-sm text-muted-foreground">
            Um tema por semana, um assunto por dia para o grupo de WhatsApp.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSegunda((atual) => somarDias(atual, -7))}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[11rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
            {intervaloDaSemana(segunda)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSegunda((atual) => somarDias(atual, 7))}
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-1"
            onClick={() => setSegunda(segundaDaSemana(hoje))}
            disabled={estaSemana}
          >
            Hoje
          </Button>
        </div>
      </header>

      {erroDosFalados && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{errorMessage(erroDosFalados)}</p>
        </div>
      )}

      {/* ---------- O tema da semana ---------- */}
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tema da semana · {posicaoNoCiclo} de {TEMAS.length} no ciclo
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {feitosNaSemana} de {dias.length} falados
          </p>
        </div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{tema.nome}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{tema.fio}</p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={dias.length}
          aria-valuenow={feitosNaSemana}
          aria-label="Dias da semana já falados"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(feitosNaSemana / dias.length) * 100}%` }}
          />
        </div>
      </Card>

      {/* ---------- Os sete dias ---------- */}
      <ol className="space-y-3">
        {dias.map((dia, indice) => {
          const falado = faladoNoDia.has(dia.data)
          const ehHoje = dia.data === hoje
          const [, , numeroDoDia] = dia.data.split('-').map(Number)
          /*
           * "Já falou disto" só quando a marcação é de OUTRO dia — a de hoje é
           * o próprio check, e repeti-la embaixo seria dizer a mesma coisa
           * duas vezes.
           */
          const ultimaVez = ultimaVezDoSubtema.get(dia.subtema.id)
          const jaFalouAntes = ultimaVez && ultimaVez !== dia.data ? ultimaVez : null

          return (
            <li key={dia.data}>
              <Card
                className={cn(
                  'flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:p-5',
                  ehHoje && 'ring-2 ring-primary/50',
                  falado && 'bg-primary/[0.04]',
                )}
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-14 sm:flex-col sm:items-center sm:gap-1">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      ehHoje ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {DIA_DA_SEMANA[indice]}
                  </span>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold tabular-nums',
                      ehHoje ? 'bg-primary text-primary-foreground' : 'bg-foreground/5',
                    )}
                  >
                    {numeroDoDia}
                  </span>
                  {ehHoje && <span className="text-[0.7rem] font-medium text-primary">hoje</span>}
                </div>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-snug">{dia.subtema.titulo}</h3>
                    <SeloDeImportancia nivel={dia.subtema.importancia} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Como abordar
                    </p>
                    <p className="text-sm leading-relaxed">{dia.subtema.comoAbordar}</p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">Por que importa: </span>
                    {dia.subtema.porQue}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={falado}
                      onClick={() => void alternar(dia.data, dia.subtema.id)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        falado
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/60 text-foreground hover:border-primary/50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border',
                          falado ? 'border-primary-foreground/60' : 'border-muted-foreground/50',
                        )}
                        aria-hidden
                      >
                        {falado && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      Falei sobre esse tema
                    </button>
                    {jaFalouAntes && (
                      <span className="text-xs text-muted-foreground">
                        Você já falou disto em {formatShortDate(jaFalouAntes)} — vale aprofundar em
                        vez de repetir a abertura.
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
