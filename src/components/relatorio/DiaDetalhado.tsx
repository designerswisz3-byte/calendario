import { ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { METRICAS_DE_FLUXO, ROTULOS, numero, type MetricaDiaria } from '@/lib/relatorio'
import { quandoSaiu, rotuloDeFormato, tituloDaPublicacao } from '@/lib/relatorioPublicacoes'
import type { RelatorioPublicacaoRow } from '@/types/database'

interface Props {
  dia: string
  /** A linha diária, se o dia foi coletado. */
  metricas: MetricaDiaria | null
  publicacoes: RelatorioPublicacaoRow[]
  onFechar: () => void
}

/** A ordem do funil: quem viu, quem reagiu, quem guardou, quem foi atrás. */
const DO_DIA = [
  'alcance',
  'views',
  'interacoes',
  'salvamentos',
  'compartilhamentos',
  'seguidores_ganhos',
  'seguidores_perdidos',
] as const satisfies readonly (typeof METRICAS_DE_FLUXO)[number][]

/** O que a publicação rendeu, na mesma ordem. */
const DA_PUBLICACAO = [
  ['alcance', 'Alcance'],
  ['views', 'Views'],
  ['interacoes', 'Interações'],
  ['salvamentos', 'Salvamentos'],
  ['compartilhamentos', 'Compart.'],
  ['likes', 'Curtidas'],
  ['comentarios', 'Coment.'],
] as const

/**
 * Um dia inteiro, com o conteúdo que saiu nele.
 *
 * O gráfico mostra que o dia 14 teve três vezes o alcance do dia 13. Isto
 * responde a pergunta seguinte, que é a única que vira pauta: foi por causa de
 * quê. Sem esta tela, o pico é uma curiosidade; com ela, é um formato para
 * repetir.
 *
 * As métricas da PUBLICAÇÃO e as do DIA não são a mesma conta e não devem
 * bater — e a diferença é visível o bastante para alguém desconfiar do painel
 * se ela não estiver escrita: a da publicação é ACUMULADA desde que ela saiu
 * (a Meta entrega `lifetime`), a do dia é daquele dia. Um reels publicado
 * ontem aparece com 1.541 de alcance num dia que teve 816 no perfil, e os dois
 * números estão certos. Por isso as duas vão separadas, com nomes diferentes e
 * com a janela de cada uma dita na tela.
 */
export function DiaDetalhado({ dia, metricas, publicacoes, onFechar }: Props) {
  const [ano, mes, numeroDoDia] = dia.split('-')
  const data = new Date(`${dia}T12:00:00Z`)
  const semana = data.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })

  return (
    <Card className="space-y-3 border-primary/30 p-4">
      <div className="flex items-start gap-2">
        <div className="mr-auto">
          <h3 className="text-sm font-semibold">
            {numeroDoDia}/{mes}/{ano}
            {/* `first-letter`, e não `capitalize`: este último viraria
                "Terça-Feira", com a segunda palavra maiúscula. */}
            <span className="ml-2 font-normal text-muted-foreground first-letter:uppercase">
              {semana}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {publicacoes.length === 0
              ? 'Nenhuma publicação neste dia'
              : publicacoes.length === 1
                ? '1 publicação'
                : `${publicacoes.length} publicações`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} title="Fechar o dia">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {metricas ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {DO_DIA.map((metrica) => {
            const valor = metricas[metrica]
            return (
              <div key={metrica} className="rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                  {ROTULOS[metrica]}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {typeof valor === 'number' ? numero(valor) : '—'}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Este dia não foi coletado.</p>
      )}

      {publicacoes.length > 0 && (
        <p className="text-[0.7rem] text-muted-foreground">
          As métricas de cada publicação são <strong>acumuladas desde que ela saiu</strong>, então
          podem passar o número do dia — que conta só aquele dia.
        </p>
      )}

      {publicacoes.length > 0 && (
        <ul className="space-y-2">
          {publicacoes.map((publicacao) => (
            <li key={publicacao.midia_id} className="rounded-lg border border-border/70 p-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-sky-700 dark:text-sky-300">
                  {rotuloDeFormato(publicacao)}
                </span>
                <span className="text-xs text-muted-foreground">{quandoSaiu(publicacao)}</span>
                {publicacao.permalink && (
                  <a
                    href={publicacao.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Abrir no Instagram
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <p className="mt-1.5 text-sm font-medium leading-snug">
                {tituloDaPublicacao(publicacao, 120)}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {DA_PUBLICACAO.map(([campo, rotulo]) => (
                  <span key={campo} className="text-xs text-muted-foreground">
                    {rotulo}{' '}
                    <strong className="font-semibold tabular-nums text-foreground">
                      {typeof publicacao[campo] === 'number'
                        ? numero(publicacao[campo] as number)
                        : '—'}
                    </strong>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
