import * as React from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Instagram,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { ATRASO_MAXIMO_MINUTOS, CONTA_DO_INSTAGRAM } from '@/lib/constants'
import {
  avisosParaPublicar,
  ehPublicavel,
  formatarQuando,
  horarioDeBrasilia,
  problemasParaPublicar,
  rotuloDoFormato,
  type MidiaParaPublicar,
} from '@/lib/publicacaoNoInstagram'
import {
  useAgendarPublicacao,
  useCancelarPublicacao,
  usePublicacoesAgendadas,
} from '@/hooks/usePublicacoesAgendadas'
import { cn } from '@/lib/utils'
import type { ContentType, PublicacaoAgendadaRow } from '@/types/database'

interface Props {
  /** Null enquanto o conteúdo não foi salvo: não dá para agendar um rascunho. */
  contentPreviewId: string | null
  calendarItemId: string | null
  formato: ContentType
  legenda: string
  midias: MidiaParaPublicar[]
  /** True quando há alteração não salva — o que iria ao ar seria a versão antiga. */
  temAlteracaoNaoSalva: boolean
}

/** Hoje, em Brasília, no formato do <input type="date">. */
function hojeEmBrasilia() {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Programar o post para ir ao ar no Instagram.
 *
 * O botão fica aqui, e não no calendário, porque é aqui que existem as três
 * coisas que uma publicação precisa e que o card do calendário não tem:
 * legenda final, mídia na ordem e formato.
 *
 * A checagem de formato roda ANTES de agendar, não na hora de publicar. Se um
 * carrossel em PNG só for recusado às 19h, o post não sai e ele descobre
 * depois — com a tela aberta, ele corrige em trinta segundos.
 */
export function ProgramarPublicacao({
  contentPreviewId,
  calendarItemId,
  formato,
  legenda,
  midias,
  temAlteracaoNaoSalva,
}: Props) {
  const { data: fila } = usePublicacoesAgendadas()
  const agendar = useAgendarPublicacao()
  const cancelar = useCancelarPublicacao()

  const [aberto, setAberto] = React.useState(false)
  const [dia, setDia] = React.useState(hojeEmBrasilia)
  const [hora, setHora] = React.useState('19:00')

  const quando = React.useMemo(() => horarioDeBrasilia(dia, hora), [dia, hora])

  const problemas = React.useMemo(
    () => problemasParaPublicar({ formato, legenda, midias, quando }),
    [formato, legenda, midias, quando],
  )
  const avisos = React.useMemo(() => avisosParaPublicar({ formato, legenda }), [formato, legenda])

  /* Só a fila DESTE conteúdo: a lista geral viveria noutra tela, e aqui ela
     só serviria para esconder o que importa agora. */
  const desteConteudo = React.useMemo(
    () =>
      (fila?.linhas ?? []).filter(
        (linha) => contentPreviewId && linha.content_preview_id === contentPreviewId,
      ),
    [fila, contentPreviewId],
  )
  const naFila = desteConteudo.filter((l) => l.status === 'agendada' || l.status === 'publicando')

  async function confirmar() {
    if (!quando || problemas.length > 0) return
    try {
      await agendar.mutateAsync({
        contentPreviewId,
        calendarItemId,
        handle: CONTA_DO_INSTAGRAM,
        quando,
        formato: formato as PublicacaoAgendadaRow['formato'],
        legenda,
        midias,
      })
      setAberto(false)
      toast({
        variant: 'success',
        title: `Programado para ${formatarQuando(quando)}`,
        description: `Vai ao ar em @${CONTA_DO_INSTAGRAM}. Dá para cancelar até o horário.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível programar',
        description: errorMessage(error),
      })
    }
  }

  if (fila?.faltaMigracao) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <strong>Falta uma migração.</strong> Rode{' '}
        <code>supabase/publicacoes-agendadas.sql</code> no SQL Editor para liberar o agendamento.
      </p>
    )
  }

  const podeAbrir = Boolean(contentPreviewId) && ehPublicavel(formato)

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={!podeAbrir}
        onClick={() => setAberto(true)}
      >
        <CalendarClock className="mr-2 h-4 w-4" />
        Programar publicação no Instagram
      </Button>

      {!contentPreviewId && (
        <p className="text-xs text-muted-foreground">
          Salve o conteúdo primeiro — é a versão salva que vai ao ar.
        </p>
      )}
      {contentPreviewId && !ehPublicavel(formato) && (
        <p className="text-xs text-muted-foreground">
          {rotuloDoFormato(formato)} não é publicável pela API do Instagram.
        </p>
      )}

      {naFila.length > 0 && (
        <ul className="space-y-1.5">
          {naFila.map((linha) => (
            <li
              key={linha.id}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
            >
              <Instagram className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="mr-auto">
                {linha.status === 'publicando' ? 'Publicando agora' : 'Vai ao ar'} em{' '}
                <strong>{formatarQuando(linha.quando)}</strong>
              </span>
              {linha.status === 'agendada' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  loading={cancelar.isPending}
                  onClick={async () => {
                    try {
                      await cancelar.mutateAsync(linha.id)
                      toast({ title: 'Agendamento cancelado' })
                    } catch (error) {
                      toast({
                        variant: 'destructive',
                        title: 'Não deu para cancelar',
                        description: errorMessage(error),
                      })
                    }
                  }}
                >
                  Cancelar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {desteConteudo
        .filter((l) => l.status === 'publicada' || l.status === 'falhou')
        .slice(0, 3)
        .map((linha) => (
          <Resultado key={linha.id} linha={linha} />
        ))}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Programar publicação</DialogTitle>
            <DialogDescription>
              {rotuloDoFormato(formato)} em <strong>@{CONTA_DO_INSTAGRAM}</strong>, com a legenda e
              as mídias salvas agora.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dia-da-publicacao">Dia</Label>
                <Input
                  id="dia-da-publicacao"
                  type="date"
                  value={dia}
                  min={hojeEmBrasilia()}
                  onChange={(e) => setDia(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hora-da-publicacao">Horário (Brasília)</Label>
                <Input
                  id="hora-da-publicacao"
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>

            {temAlteracaoNaoSalva && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Há alteração não salva nesta tela. O que vai ao ar é a{' '}
                <strong>versão salva</strong> — salve antes de programar se quiser publicar o que
                está vendo.
              </p>
            )}

            {problemas.length > 0 ? (
              <ul className="space-y-1.5">
                {problemas.map((problema, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs"
                  >
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <span>
                      {problema.mensagem}
                      {problema.saida && (
                        <span className="block text-muted-foreground">{problema.saida}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {midias.length} {midias.length === 1 ? 'mídia' : 'mídias'} no formato que a Meta
                aceita. Pronto para ir ao ar.
              </p>
            )}

            {avisos.map((aviso, i) => (
              <p key={i} className="flex gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {aviso}
              </p>
            ))}

            <p className="text-xs text-muted-foreground">
              O Instagram não agenda do lado dele: quem publica no horário é a rotina deste app.
              Ela roda a cada poucos minutos, então o post pode sair alguns minutos depois da hora
              cheia. Se passar de {ATRASO_MAXIMO_MINUTOS / 60} h, ele não é publicado atrasado —
              aparece aqui como falha.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={confirmar}
              loading={agendar.isPending}
              disabled={problemas.length > 0 || !quando}
            >
              {quando && problemas.length === 0
                ? `Programar para ${formatarQuando(quando)}`
                : 'Programar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Resultado({ linha }: { linha: PublicacaoAgendadaRow }) {
  const publicada = linha.status === 'publicada'
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        publicada
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-destructive/40 bg-destructive/5 text-destructive',
      )}
    >
      {publicada ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        {publicada ? (
          <span>Publicado em {formatarQuando(linha.publicada_em ?? linha.quando)}</span>
        ) : (
          <span>
            Não foi ao ar em {formatarQuando(linha.quando)}
            {linha.erro && <span className="block opacity-80">{linha.erro}</span>}
          </span>
        )}
      </div>
      {publicada && linha.permalink && (
        <a
          href={linha.permalink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 underline"
        >
          Ver post
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
