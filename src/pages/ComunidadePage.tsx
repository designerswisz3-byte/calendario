import * as React from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Repeat,
  Shuffle,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import {
  CORINGAS,
  DINAMICAS,
  EXPLICACAO_DE_IMPORTANCIA,
  FORMATO_DO_POST,
  INICIO_DO_GRUPO,
  PILARES,
  PONTOS_DE_ATENCAO,
  ROTULO_DE_IMPORTANCIA,
  assuntoPorId,
  assuntoSugerido,
  dinamicasDoDia,
  ganchoDaSemana,
  pilarDoDia,
  segundaDaSemana,
  somarDias,
  type AssuntoDoDia,
  type Importancia,
} from '@/lib/comunidade'
import { formatShortDate, todayKey } from '@/lib/date'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMarcarFalado, useTemasFalados } from '@/hooks/useComunidade'

const DIA_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
/** Pelo getUTCDay: domingo = 0. */
const NOME_DO_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

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
 * "ruim": o assunto médio também vale ser falado. O que muda é o peso, e peso
 * se lê em intensidade.
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

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

/** Uma linha da lista de troca de assunto. */
function OpcaoDeAssunto({
  codigo,
  titulo,
  detalhe,
  recorrente,
  atual,
  ultimaVez,
  onEscolher,
}: {
  codigo?: string
  titulo: string
  detalhe?: string
  recorrente?: boolean
  atual: boolean
  ultimaVez?: string
  onEscolher: () => void
}) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      aria-pressed={atual}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        atual
          ? 'border-primary bg-primary/10'
          : 'border-border/60 hover:border-primary/40 hover:bg-foreground/[0.03]',
      )}
    >
      {codigo && (
        <span className="mt-0.5 w-8 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {codigo}
        </span>
      )}
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block font-medium leading-snug">
          {titulo}
          {recorrente && (
            <Repeat
              className="ml-1.5 inline h-3 w-3 text-muted-foreground"
              aria-label="Recorrente"
            />
          )}
        </span>
        {detalhe && <span className="block text-xs text-muted-foreground">{detalhe}</span>}
        {ultimaVez && (
          <span className="block text-xs text-primary">
            Falado em {formatShortDate(ultimaVez)}
          </span>
        )}
      </span>
      {atual && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
    </button>
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
  /*
   * O assunto que ele escolheu para um dia AINDA NÃO marcado.
   *
   * Fica só nesta tela, de propósito: enquanto o dia não foi falado, a troca
   * é intenção, não registro. O que vai para o banco é o assunto do dia em que
   * ele marca "falei" — aí sim, com o identificador do que foi escolhido.
   */
  const [escolhas, setEscolhas] = React.useState<Record<string, string>>({})
  const [trocando, setTrocando] = React.useState<string | null>(null)

  const { data: falados = [], error: erroDosFalados } = useTemasFalados()
  const marcar = useMarcarFalado()

  const estaSemana = segunda === segundaDaSemana(hoje)
  const gancho = ganchoDaSemana(segunda)

  const faladoNoDia = React.useMemo(
    () => new Map(falados.map((f) => [f.data, f.subtema_id])),
    [falados],
  )
  /*
   * A última vez que cada assunto foi falado.
   *
   * A fila de cada pilar recomeça depois de 18 ou 20 semanas, e ele pode
   * trocar o assunto de um dia por outro da lista. Nos dois casos, saber que
   * o assunto já foi falado — e quando — muda o que fazer: aprofundar em vez
   * de repetir a mesma abertura para o mesmo grupo.
   */
  const ultimaVezDoAssunto = React.useMemo(() => {
    const mapa = new Map<string, string>()
    for (const linha of falados) {
      const anterior = mapa.get(linha.subtema_id)
      if (!anterior || linha.data > anterior) mapa.set(linha.subtema_id, linha.data)
    }
    return mapa
  }, [falados])

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = somarDias(segunda, indice)
    const sugerido = assuntoSugerido(data)
    const gravado = faladoNoDia.get(data)
    /*
     * A ordem importa: o que foi gravado vence o que foi escolhido, que vence
     * o que a pauta sugere. Um identificador gravado que o banco de temas não
     * conhece mais (assunto retirado do documento) cai na sugestão — o dia
     * continua marcado, só não há mais texto antigo para mostrar.
     */
    const assunto: AssuntoDoDia | null =
      (gravado ? assuntoPorId(gravado) : null) ??
      (escolhas[data] ? assuntoPorId(escolhas[data]) : null) ??
      sugerido
    return { data, indice, sugerido, assunto, falado: gravado !== undefined }
  })

  const comPauta = dias.filter((dia) => dia.assunto !== null)
  const feitosNaSemana = comPauta.filter((dia) => dia.falado).length
  const temLargada = dias.some((dia) => dia.sugerido?.origem === 'largada')

  async function alternar(data: string, assunto: AssuntoDoDia, falado: boolean) {
    try {
      await marcar.mutateAsync({ data, subtemaId: assunto.id, falado: !falado })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível marcar',
        description: errorMessage(erro),
      })
    }
  }

  async function escolher(data: string, id: string) {
    setTrocando(null)
    const dia = dias.find((d) => d.data === data)
    if (!dia || dia.assunto?.id === id) return

    if (!dia.falado) {
      setEscolhas((atual) => {
        const proximo = { ...atual }
        // Voltar para a sugestão é só esquecer a escolha.
        if (id === dia.sugerido?.id) delete proximo[data]
        else proximo[data] = id
        return proximo
      })
      return
    }

    /*
     * Dia já marcado: a troca corrige o REGISTRO.
     *
     * "Marquei, mas na verdade falei de outra coisa" é o caso de uso — um
     * coringa atropelou a pauta. Apaga e grava de novo, com o assunto certo.
     */
    try {
      await marcar.mutateAsync({ data, subtemaId: id, falado: false })
      await marcar.mutateAsync({ data, subtemaId: id, falado: true })
    } catch (erro) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível trocar o assunto',
        description: errorMessage(erro),
      })
    }
  }

  async function copiar(pergunta: string) {
    try {
      await navigator.clipboard.writeText(pergunta)
      toast({ variant: 'success', title: 'Pergunta copiada' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Não foi possível copiar',
        description: 'Selecione o texto e copie manualmente.',
      })
    }
  }

  const diaEmTroca = dias.find((dia) => dia.data === trocando) ?? null
  const pilarEmTroca = diaEmTroca ? pilarDoDia(diaEmTroca.data) : null

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comunidade</h1>
          <p className="text-sm text-muted-foreground">
            Um pilar por dia da semana, um assunto por dia para o grupo de WhatsApp.
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
          <span
            className="min-w-[11rem] text-center text-sm font-medium tabular-nums"
            aria-live="polite"
            data-intervalo
          >
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

      {/* ---------- A semana ---------- */}
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Rotulo>{temLargada ? 'Sequência de largada · semana da Black Friday' : 'Semana'}</Rotulo>
          {comPauta.length > 0 && (
            <p className="text-xs tabular-nums text-muted-foreground" data-progresso>
              {feitosNaSemana} de {comPauta.length} falados
            </p>
          )}
        </div>
        {comPauta.length > 0 && (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={comPauta.length}
            aria-valuenow={feitosNaSemana}
            aria-label="Dias da semana já falados"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(feitosNaSemana / comPauta.length) * 100}%` }}
            />
          </div>
        )}
        {/*
          O gancho do mês fica na moldura da semana, e não num dia.

          Ele não é um assunto da fila: é o que está acontecendo no calendário
          de quem vende moda. Serve para ele decidir se o assunto do dia vai
          como está ou se a data comercial pede um coringa.
        */}
        {gancho && (
          <div className="space-y-1" data-gancho>
            <p className="text-sm">
              <span className="font-medium">Gancho do mês: </span>
              {gancho.gancho}
            </p>
            <p className="text-sm text-muted-foreground">{gancho.assuntos.join(' · ')}</p>
          </div>
        )}

        <details className="group rounded-lg border border-border/60 bg-foreground/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Como o grupo funciona
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-5 border-t border-border/60 px-3 py-4 text-sm sm:grid-cols-2">
            <section className="space-y-2">
              <Rotulo>O formato de cada post</Rotulo>
              <ol className="list-decimal space-y-1 pl-5">
                {FORMATO_DO_POST.map((bloco) => (
                  <li key={bloco.nome}>
                    <span className="font-medium">{bloco.nome}</span>{' '}
                    <span className="text-muted-foreground">{bloco.detalhe}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-2">
              <Rotulo>A rotação da semana</Rotulo>
              <ul className="space-y-1">
                {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                  const pilar = PILARES.find((p) => p.dia === dia)!
                  return (
                    <li key={dia}>
                      <span className="font-medium">{NOME_DO_DIA[dia]}:</span> {pilar.nome}
                      <span className="text-muted-foreground"> — {pilar.papel}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="space-y-2">
              <Rotulo>Antes de postar</Rotulo>
              <ul className="list-disc space-y-1.5 pl-5">
                {PONTOS_DE_ATENCAO.map((ponto) => (
                  <li key={ponto}>{ponto}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <Rotulo>Dinâmicas fixas</Rotulo>
              <ul className="space-y-1.5">
                {DINAMICAS.map((dinamica) => (
                  <li key={dinamica.nome}>
                    <span className="font-medium">{dinamica.nome}</span>
                    <span className="text-muted-foreground"> ({dinamica.quando.toLowerCase()})</span>
                    : {dinamica.como}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </details>
      </Card>

      {/* ---------- Os sete dias ---------- */}
      <ol className="space-y-3">
        {dias.map(({ data, indice, assunto, falado }) => {
          const ehHoje = data === hoje
          const [, , numeroDoDia] = data.split('-').map(Number)
          const dinamicas = dinamicasDoDia(data)
          /*
           * "Já falou disto" só quando a marcação é de OUTRO dia — a de hoje é
           * o próprio check, e repeti-la embaixo seria dizer a mesma coisa
           * duas vezes.
           */
          const ultimaVez = assunto ? ultimaVezDoAssunto.get(assunto.id) : undefined
          const jaFalouAntes = ultimaVez && ultimaVez !== data ? ultimaVez : null

          return (
            <li key={data} data-dia={data}>
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
                  {ehHoje && (
                    <span className="text-[0.7rem] font-medium text-primary" data-hoje>
                      hoje
                    </span>
                  )}
                </div>

                {assunto === null ? (
                  <p className="flex-1 self-center text-sm text-muted-foreground">
                    Sem pauta: o grupo começou em {formatShortDate(INICIO_DO_GRUPO)}.
                  </p>
                ) : (
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        <span data-grupo>{assunto.grupo}</span>
                        {assunto.tema && (
                          <span className="font-medium normal-case tracking-normal text-muted-foreground">
                            · {assunto.tema}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {assunto.recorrente && (
                          <span
                            title="O dado muda toda semana, então o assunto se renova sozinho."
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
                          >
                            <Repeat className="h-3 w-3" aria-hidden />
                            Recorrente
                          </span>
                        )}
                        {assunto.importancia ? (
                          <SeloDeImportancia nivel={assunto.importancia} />
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[0.7rem] font-medium text-amber-700 dark:text-amber-300">
                            Coringa
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-semibold leading-snug sm:text-lg" data-assunto>
                      {assunto.assunto}
                    </h3>

                    <div className="space-y-1">
                      <Rotulo>
                        {assunto.origem === 'coringa' ? 'Ângulo do post' : 'Prova para trazer'}
                      </Rotulo>
                      <p className="text-sm leading-relaxed">{assunto.prova}</p>
                    </div>

                    <div className="space-y-1">
                      <Rotulo>Pergunta pro grupo</Rotulo>
                      <div className="flex items-start gap-2 rounded-lg bg-foreground/[0.04] px-3 py-2">
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">{assunto.pergunta}</p>
                        <button
                          type="button"
                          onClick={() => void copiar(assunto.pergunta)}
                          aria-label="Copiar a pergunta"
                          title="Copiar a pergunta"
                          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {dinamicas.length > 0 && (
                      <p className="text-sm text-muted-foreground" data-dinamicas>
                        <span className="font-medium text-foreground/80">Também hoje: </span>
                        {dinamicas.join(' · ')}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-1">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={falado}
                        onClick={() => void alternar(data, assunto, falado)}
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
                      <Button variant="ghost" size="sm" onClick={() => setTrocando(data)}>
                        <Shuffle className="mr-1.5 h-3.5 w-3.5" />
                        Trocar assunto
                      </Button>
                      {jaFalouAntes && (
                        <span className="text-xs text-muted-foreground">
                          Você já falou disto em {formatShortDate(jaFalouAntes)} — vale aprofundar
                          em vez de repetir a abertura.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ol>

      {/* ---------- Trocar o assunto de um dia ---------- */}
      {diaEmTroca && pilarEmTroca && (
        <Dialog open onOpenChange={(aberto) => !aberto && setTrocando(null)}>
          <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
            <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 text-left">
              <DialogTitle className="pr-6 text-base">
                Assunto de {formatShortDate(diaEmTroca.data)}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {NOME_DO_DIA[pilarEmTroca.dia]} é dia de {pilarEmTroca.nome.toLowerCase()}. Escolha
                outro assunto do pilar — ou um coringa, se algo aconteceu.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto scrollbar-thin px-5 py-4">
              {/*
                A sugestão da pauta só ganha linha própria quando NÃO é do
                pilar — ou seja, na largada. Fora dela, a sugestão já está na
                lista do pilar logo abaixo.
              */}
              {diaEmTroca.sugerido?.origem === 'largada' && (
                <section className="space-y-2">
                  <Rotulo>Sugestão da pauta</Rotulo>
                  <OpcaoDeAssunto
                    titulo={diaEmTroca.sugerido.assunto}
                    detalhe={diaEmTroca.sugerido.grupo}
                    atual={diaEmTroca.assunto?.id === diaEmTroca.sugerido.id}
                    ultimaVez={ultimaVezDoAssunto.get(diaEmTroca.sugerido.id)}
                    onEscolher={() => void escolher(diaEmTroca.data, diaEmTroca.sugerido!.id)}
                  />
                </section>
              )}

              <section className="space-y-2">
                <Rotulo>
                  {pilarEmTroca.nome} · {pilarEmTroca.assuntos.length} assuntos
                </Rotulo>
                {pilarEmTroca.assuntos.map((opcao) => (
                  <OpcaoDeAssunto
                    key={opcao.id}
                    codigo={opcao.id}
                    titulo={opcao.assunto}
                    detalhe={
                      opcao.id === diaEmTroca.sugerido?.id
                        ? `${opcao.tema} · sugestão da pauta para este dia`
                        : opcao.tema
                    }
                    recorrente={opcao.recorrente}
                    atual={diaEmTroca.assunto?.id === opcao.id}
                    ultimaVez={ultimaVezDoAssunto.get(opcao.id)}
                    onEscolher={() => void escolher(diaEmTroca.data, opcao.id)}
                  />
                ))}
              </section>

              <section className="space-y-2">
                <Rotulo>Coringas · quando algo acontece, a realidade vence a pauta</Rotulo>
                {CORINGAS.map((coringa) => (
                  <OpcaoDeAssunto
                    key={coringa.id}
                    titulo={coringa.gatilho}
                    detalhe={coringa.angulo}
                    atual={diaEmTroca.assunto?.id === coringa.id}
                    ultimaVez={ultimaVezDoAssunto.get(coringa.id)}
                    onEscolher={() => void escolher(diaEmTroca.data, coringa.id)}
                  />
                ))}
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
