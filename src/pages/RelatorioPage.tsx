import * as React from 'react'
import { BarChart3, FileDown, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { CartaoDeMetrica } from '@/components/relatorio/CartaoDeMetrica'
import { GraficoDePeriodos } from '@/components/relatorio/GraficoDePeriodos'
import { TabelaDePeriodos } from '@/components/relatorio/TabelaDePeriodos'
import { ImportarMetricas } from '@/components/relatorio/ImportarMetricas'
import {
  ImpressaoDoRelatorio,
  type RelatorioParaImprimir,
} from '@/components/relatorio/ImpressaoDoRelatorio'
import {
  METRICAS_DE_FLUXO,
  ROTULOS,
  agrupar,
  comparar,
  numero,
  type Granularidade,
  type MetricaDeFluxo,
} from '@/lib/relatorio'
import {
  useCriarPerfil,
  useExcluirPerfil,
  useImportarMetricas,
  useMetricas,
  usePerfis,
} from '@/hooks/useRelatorio'
import { errorMessage } from '@/lib/supabase'
import type { RedeSocial, RelatorioMetricaEntrada } from '@/types/database'

/** Cartões do topo, na ordem do funil. */
const DESTAQUES = [
  'alcance',
  'views',
  'interacoes',
  'salvamentos',
  'compartilhamentos',
] as const satisfies readonly MetricaDeFluxo[]

export default function RelatorioPage() {
  const { data: perfis, isLoading: carregandoPerfis } = usePerfis()
  const criarPerfil = useCriarPerfil()
  const excluirPerfil = useExcluirPerfil()
  const importar = useImportarMetricas()

  const [perfilId, setPerfilId] = React.useState<string | null>(null)
  const [granularidade, setGranularidade] = React.useState<Granularidade>('mensal')
  const [metricaDoGrafico, setMetricaDoGrafico] = React.useState<MetricaDeFluxo>('alcance')
  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  const [abrindoImportacao, setAbrindoImportacao] = React.useState(false)
  const [abrindoPerfil, setAbrindoPerfil] = React.useState(false)
  const [paraImprimir, setParaImprimir] = React.useState<RelatorioParaImprimir | null>(null)

  const perfil = perfis?.find((p) => p.id === perfilId) ?? perfis?.[0] ?? null
  const { data: metricas, isLoading: carregandoMetricas } = useMetricas(perfil?.id ?? null)

  const periodos = React.useMemo(
    () => agrupar(metricas ?? [], granularidade),
    [metricas, granularidade],
  )

  /*
   * O período em foco é sempre o mais recente, até a pessoa escolher outro.
   *
   * A chave muda de forma ('2026-09' vira '2026-W38') quando a granularidade
   * troca, e muda de conjunto quando o perfil troca: guardar a escolha antiga
   * deixaria a tela apontando para um período que não existe mais naquela
   * série, e o comparativo vinha vazio sem explicação.
   */
  const emFoco = periodos.some((p) => p.chave === selecionada)
    ? (selecionada as string)
    : (periodos[periodos.length - 1]?.chave ?? null)

  const comparativo = emFoco ? comparar(periodos, emFoco) : null

  /** De onde os dias vieram de verdade — pode ser mais de uma fonte. */
  const fontes = React.useMemo(
    () => [...new Set((metricas ?? []).map((m) => m.fonte))].sort(),
    [metricas],
  )

  async function aoImportar(dias: RelatorioMetricaEntrada[], fonte: string) {
    if (!perfil) return
    try {
      const total = await importar.mutateAsync({ perfilId: perfil.id, dias, fonte })
      toast({ title: `${total} dia(s) importados`, description: `Perfil @${perfil.handle}.` })
      setAbrindoImportacao(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível importar',
        description: errorMessage(error),
      })
    }
  }

  function exportarPdf() {
    if (!perfil || !comparativo) return
    setParaImprimir({
      perfil: perfil.handle,
      granularidade,
      periodos,
      comparativo,
    })
  }

  /* ------------------------------------------------------------- vazios -- */

  if (carregandoPerfis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!perfil) {
    return (
      <>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Nenhum perfil no Relatório</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre o perfil que você acompanha e importe os dias de métricas. A partir daí a
            aba monta as visões mensal e semanal, os comparativos e o PDF.
          </p>
          <Button className="mt-4" onClick={() => setAbrindoPerfil(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar perfil
          </Button>
        </Card>
        <DialogoDePerfil
          aberto={abrindoPerfil}
          onFechar={() => setAbrindoPerfil(false)}
          salvando={criarPerfil.isPending}
          onCriar={async (entrada) => {
            try {
              const novo = await criarPerfil.mutateAsync(entrada)
              setPerfilId(novo.id)
              setAbrindoPerfil(false)
            } catch (error) {
              toast({
                variant: 'destructive',
                title: 'Não foi possível cadastrar',
                description: errorMessage(error),
              })
            }
          }}
        />
      </>
    )
  }

  /* ----------------------------------------------------------------- tela -- */

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-2">
          <Select
            value={perfil.id}
            onValueChange={(valor) => {
              setPerfilId(valor)
              setSelecionada(null)
            }}
          >
            <SelectTrigger className="w-auto min-w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perfis?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  @{p.handle}
                  {p.nome ? ` · ${p.nome}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={() => setAbrindoPerfil(true)} title="Novo perfil">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={granularidade} onValueChange={(v) => setGranularidade(v as Granularidade)}>
          <TabsList>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" onClick={() => setAbrindoImportacao(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar dados
        </Button>
        <Button onClick={exportarPdf} disabled={!comparativo}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </header>

      {carregandoMetricas ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !comparativo ? (
        <Card className="p-8 text-center">
          <h2 className="text-base font-semibold">@{perfil.handle} ainda não tem dados</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Importe os dias de métricas (CSV ou JSON, uma linha por dia) para a aba montar o
            arquivo mês a mês.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => setAbrindoImportacao(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar dados
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                if (!window.confirm(`Remover @${perfil.handle} e todas as métricas dele?`)) return
                try {
                  await excluirPerfil.mutateAsync(perfil.id)
                  setPerfilId(null)
                } catch (error) {
                  toast({
                    variant: 'destructive',
                    title: 'Não foi possível remover',
                    description: errorMessage(error),
                  })
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover perfil
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Cobertura antes dos números: é o que diz se eles podem ser lidos. */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{comparativo.atual.rotulo}</h1>
            <p className="text-sm text-muted-foreground">
              {comparativo.atual.inicio} a {comparativo.atual.fim} ·{' '}
              {comparativo.atual.diasComDado} de {comparativo.atual.diasNoPeriodo} dias com dado
              {comparativo.anterior && ` · comparado com ${comparativo.anterior.rotulo}`}
            </p>
          </div>

          {comparativo.anterior && !comparativo.fluxos.alcance.comparavel && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              <strong>Cobertura desigual.</strong> {comparativo.atual.rotulo} tem{' '}
              {comparativo.atual.diasComDado} dias coletados e {comparativo.anterior.rotulo} tem{' '}
              {comparativo.anterior.diasComDado}. As variações em cinza misturam performance com
              falta de coleta — compare os absolutos, não o percentual.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Seguidores
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {numero(comparativo.atual.seguidoresFim)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {comparativo.seguidoresGanhos.atual === null
                  ? 'Sem snapshot de seguidores no período'
                  : `Ganho de ${comparativo.seguidoresGanhos.atual > 0 ? '+' : ''}${numero(
                      comparativo.seguidoresGanhos.atual,
                    )} no período`}
              </p>
            </Card>

            <CartaoDeMetrica
              titulo="Seguidores ganhos"
              variacao={comparativo.seguidoresGanhos}
              rotuloAnterior={comparativo.anterior?.rotulo ?? null}
            />

            {DESTAQUES.map((metrica) => (
              <CartaoDeMetrica
                key={metrica}
                titulo={ROTULOS[metrica]}
                variacao={comparativo.fluxos[metrica]}
                rotuloAnterior={comparativo.anterior?.rotulo ?? null}
              />
            ))}
          </div>

          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-sm font-semibold">
                {granularidade === 'mensal' ? 'Mês a mês' : 'Semana a semana'}
              </h2>
              <Select
                value={metricaDoGrafico}
                onValueChange={(v) => setMetricaDoGrafico(v as MetricaDeFluxo)}
              >
                <SelectTrigger className="w-auto min-w-[11rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICAS_DE_FLUXO.map((metrica) => (
                    <SelectItem key={metrica} value={metrica}>
                      {ROTULOS[metrica]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <GraficoDePeriodos
              periodos={periodos}
              metrica={metricaDoGrafico}
              selecionado={emFoco as string}
              onSelecionar={setSelecionada}
            />
            <p className="text-xs text-muted-foreground">
              Clique num período para trazer os cartões e o comparativo para ele. Barra listrada =
              período com dias sem coleta; traço vazado = nenhum dado — nunca zero.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">
              Arquivo completo ({periodos.length}{' '}
              {granularidade === 'mensal' ? 'meses' : 'semanas'})
            </h2>
            <TabelaDePeriodos
              periodos={periodos}
              selecionado={emFoco as string}
              onSelecionar={setSelecionada}
            />
          </Card>

          <p className="text-xs text-muted-foreground">
            {/*
              A fonte vem das LINHAS importadas, não do cadastro do perfil: o
              campo do cadastro nasce "manual" e continuaria dizendo "manual"
              depois de uma importação vinda do coletor. Rodapé que mente sobre
              a origem do dado é pior do que rodapé nenhum.
            */}
            Fonte dos dados: {fontes.join(', ')}. "—" é dia sem coleta, não zero — nada aqui é
            estimado.
          </p>
        </>
      )}

      <ImportarMetricas
        aberto={abrindoImportacao}
        onFechar={() => setAbrindoImportacao(false)}
        perfil={perfil.handle}
        salvando={importar.isPending}
        onImportar={aoImportar}
      />

      <DialogoDePerfil
        aberto={abrindoPerfil}
        onFechar={() => setAbrindoPerfil(false)}
        salvando={criarPerfil.isPending}
        onCriar={async (entrada) => {
          try {
            const novo = await criarPerfil.mutateAsync(entrada)
            setPerfilId(novo.id)
            setSelecionada(null)
            setAbrindoPerfil(false)
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Não foi possível cadastrar',
              description: errorMessage(error),
            })
          }
        }}
      />

      <ImpressaoDoRelatorio relatorio={paraImprimir} onConcluido={() => setParaImprimir(null)} />
    </div>
  )
}

/* -------------------------------------------------------- cadastro simples -- */

function DialogoDePerfil({
  aberto,
  onFechar,
  salvando,
  onCriar,
}: {
  aberto: boolean
  onFechar: () => void
  salvando: boolean
  onCriar: (entrada: { handle: string; nome: string; rede: RedeSocial }) => Promise<void>
}) {
  const [handle, setHandle] = React.useState('')
  const [nome, setNome] = React.useState('')
  const [rede, setRede] = React.useState<RedeSocial>('instagram')

  return (
    <Dialog
      open={aberto}
      onOpenChange={(estado) => {
        if (!estado && !salvando) onFechar()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo perfil</DialogTitle>
          <DialogDescription>
            O perfil é só o rótulo do arquivo de métricas — os dados entram pela importação.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (handle.trim()) void onCriar({ handle, nome: nome.trim(), rede })
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="handle-do-perfil">Handle</Label>
            <Input
              id="handle-do-perfil"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="euraphaelaraujo"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nome-do-perfil">Nome (opcional)</Label>
            <Input
              id="nome-do-perfil"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Raphael Araújo"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Rede</Label>
            <Select value={rede} onValueChange={(v) => setRede(v as RedeSocial)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !handle.trim()}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
