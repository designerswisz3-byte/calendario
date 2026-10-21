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
import { todayKey } from '@/lib/date'
import { CartaoDeMetrica } from '@/components/relatorio/CartaoDeMetrica'
import { DiaDetalhado } from '@/components/relatorio/DiaDetalhado'
import { GraficoDiario } from '@/components/relatorio/GraficoDiario'
import { SeletorDePeriodo } from '@/components/relatorio/SeletorDePeriodo'
import { TabelaComparativa } from '@/components/relatorio/TabelaComparativa'
import { GraficoDePeriodos } from '@/components/relatorio/GraficoDePeriodos'
import { TabelaDePeriodos } from '@/components/relatorio/TabelaDePeriodos'
import { ImportarMetricas } from '@/components/relatorio/ImportarMetricas'
import {
  ImpressaoDoRelatorio,
  type RelatorioParaImprimir,
} from '@/components/relatorio/ImpressaoDoRelatorio'
import {
  agrupar,
  comparar,
  compararJanelas,
  METRICAS_DE_FLUXO,
  numero,
  ROTULOS,
  type Granularidade,
  type MetricaDeFluxo,
  type Periodo,
} from '@/lib/relatorio'
import {
  useCriarPerfil,
  useExcluirPerfil,
  useImportarMetricas,
  useMetricas,
  usePerfis,
  usePublicacoes,
} from '@/hooks/useRelatorio'
import { porDia as publicacoesPorDia } from '@/lib/relatorioPublicacoes'
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
  /*
   * O terceiro modo: um período qualquer, de data a data.
   *
   * Mensal e semanal respondem "como foi este mês". Este responde a pergunta
   * de quem está decidindo — "como foram os 40 dias desde que mudei a
   * frequência" —, que não cabe em meses fechados.
   */
  const [modo, setModo] = React.useState<'mensal' | 'semanal' | 'periodo'>('mensal')
  const [janelaEscolhida, setJanelaEscolhida] = React.useState<{ de: string; ate: string } | null>(
    null,
  )
  const [metricaDoGrafico, setMetricaDoGrafico] = React.useState<MetricaDeFluxo>('alcance')
  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  /* O dia aberto no painel de conteúdo, embaixo do gráfico diário. */
  const [diaAberto, setDiaAberto] = React.useState<string | null>(null)
  const [abrindoImportacao, setAbrindoImportacao] = React.useState(false)
  const [abrindoPerfil, setAbrindoPerfil] = React.useState(false)
  const [paraImprimir, setParaImprimir] = React.useState<RelatorioParaImprimir | null>(null)

  const perfil = perfis?.find((p) => p.id === perfilId) ?? perfis?.[0] ?? null
  const { data: metricas, isLoading: carregandoMetricas } = useMetricas(perfil?.id ?? null)
  const { data: publicacoes } = usePublicacoes(perfil?.id ?? null)

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

  /** O primeiro e o último dia que existem no arquivo deste perfil. */
  const limites = React.useMemo(() => {
    const dias = (metricas ?? []).map((m) => m.dia).sort()
    return dias.length > 0
      ? { primeiro: dias[0], ultimo: dias[dias.length - 1] }
      : { primeiro: todayKey(), ultimo: todayKey() }
  }, [metricas])

  /* Abre nos últimos 28 dias do que existe — não em "hoje", que pode não ter
     sido coletado ainda, nem no arquivo inteiro, que é leitura de fechamento. */
  const janelaAtiva = React.useMemo(() => {
    if (janelaEscolhida) return janelaEscolhida
    const fim = limites.ultimo
    const inicio = new Date(`${fim}T00:00:00Z`)
    inicio.setUTCDate(inicio.getUTCDate() - 27)
    const de = inicio.toISOString().slice(0, 10)
    return { de: de < limites.primeiro ? limites.primeiro : de, ate: fim }
  }, [janelaEscolhida, limites])

  const comparativo =
    modo === 'periodo'
      ? compararJanelas(metricas ?? [], janelaAtiva.de, janelaAtiva.ate)
      : emFoco
        ? comparar(periodos, emFoco)
        : null

  /** De onde os dias vieram de verdade — pode ser mais de uma fonte. */
  /*
   * ATENÇÃO À ORDEM: este bloco fica aqui, com os outros hooks, e não lá
   * embaixo perto do JSX que o usa.
   *
   * A primeira versão ficou depois do `if (!perfil) return`, e a tela quebrava
   * com "Rendered more hooks than during the previous render" no instante em
   * que o perfil chegava do banco: o primeiro render saía pelo atalho e
   * contava menos hooks que o segundo. React não perdoa hook condicional, e a
   * aba inteira ia para a tela de erro.
   */
  /**
   * Quando a coleta passou por aqui pela última vez.
   *
   * A aba passou a ser alimentada por uma rotina que roda algumas vezes ao
   * dia. Sem dizer isso na tela, um número velho e um número fresco têm a
   * mesma cara — e quem olha não sabe se está vendo o dia de hoje crescendo ou
   * um painel que parou de atualizar há uma semana.
   */
  const coleta = React.useMemo(() => {
    const automaticas = (metricas ?? []).filter((m) => m.fonte === 'instagram_api')
    if (automaticas.length === 0) return null
    const ultima = automaticas.reduce(
      (maior, m) => (m.atualizado_em > maior ? m.atualizado_em : maior),
      automaticas[0].atualizado_em,
    )
    const minutos = Math.max(0, Math.round((Date.now() - Date.parse(ultima)) / 60_000))
    const quando =
      minutos < 60
        ? `há ${minutos} min`
        : minutos < 60 * 36
          ? `há ${Math.round(minutos / 60)} h`
          : `há ${Math.round(minutos / 1440)} dias`
    // O dia corrente é sempre parcial: a Meta fecha a conta à meia-noite.
    const hoje = todayKey()
    const temHoje = automaticas.some((m) => m.dia === hoje)
    return { quando, temHoje, atrasada: minutos > 60 * 30 }
  }, [metricas])

  const fontes = React.useMemo(
    () => [...new Set((metricas ?? []).map((m) => m.fonte))].sort(),
    [metricas],
  )

  /* MESMA REGRA DE ORDEM do bloco acima: hook antes de qualquer `return`. */
  const postsPorDia = React.useMemo(
    () => publicacoesPorDia(publicacoes?.linhas ?? []),
    [publicacoes],
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
      granularidade: modo === 'periodo' ? 'periodo' : granularidade,
      /*
       * No modo período, o PDF leva as DUAS janelas comparadas, não o arquivo
       * mensal inteiro. Sair com a tabela de 14 meses embaixo de um
       * comparativo de 28 dias seria dois relatórios no mesmo papel, e quem
       * recebe não saberia qual deles responde a pergunta que motivou o envio.
       */
      periodos:
        modo === 'periodo'
          ? [comparativo.anterior, comparativo.atual].filter((p): p is Periodo => p !== null)
          : periodos,
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

        <Tabs
          value={modo}
          onValueChange={(v) => {
            const escolhido = v as 'mensal' | 'semanal' | 'periodo'
            setModo(escolhido)
            if (escolhido !== 'periodo') setGranularidade(escolhido)
          }}
        >
          <TabsList>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="periodo">Período</TabsTrigger>
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

      {coleta && (
        <p className="-mt-2 text-xs text-muted-foreground">
          <span className={coleta.atrasada ? 'text-amber-600 dark:text-amber-400' : ''}>
            Coleta automática {coleta.quando}
          </span>
          {coleta.temHoje && ' · o dia de hoje ainda está em andamento e fecha à meia-noite'}
          {coleta.atrasada && ' · confira a rotina de métricas'}
        </p>
      )}

      {publicacoes?.faltaMigracao && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <strong>Falta uma migração.</strong> O arquivo de publicações (
          <code>relatorio_publicacoes</code>) ainda não existe no banco, então o dia a dia não
          mostra qual conteúdo saiu em cada data. Rode{' '}
          <code>supabase/relatorio-publicacoes.sql</code> no SQL Editor — uma vez, sem apagar
          nada.
        </p>
      )}

      {modo === 'periodo' && (metricas ?? []).length > 0 && (
        <SeletorDePeriodo
          de={janelaAtiva.de}
          ate={janelaAtiva.ate}
          limites={limites}
          onMudar={(de, ate) => setJanelaEscolhida({ de, ate })}
        />
      )}

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
              {/*
                O crescimento LÍQUIDO, e a origem dele junto.
                "+154" e "+72" respondem a mesma pergunta com precisão
                diferente, e quem decide pauta precisa saber qual está lendo:
                o líquido vem de seguiu menos deixou de seguir, somado dia a
                dia; o snapshot é a diferença entre dois totais do perfil.
              */}
              <p className="mt-1 text-xs text-muted-foreground">
                {comparativo.ganhoLiquido.atual === null
                  ? 'Crescimento do período: sem base (falta a série de ganhos e perdas)'
                  : `Crescimento líquido no período: ${
                      comparativo.ganhoLiquido.atual > 0 ? '+' : ''
                    }${numero(comparativo.ganhoLiquido.atual)}`}
              </p>
              {comparativo.origemDoGanho === 'snapshot' && (
                <p className="mt-0.5 text-[0.7rem] text-amber-600 dark:text-amber-400">
                  Medido pela diferença entre dois totais do perfil, não pela soma de ganhos e
                  perdas — menos preciso.
                </p>
              )}
            </Card>

            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ganhos e perdas
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">
                  +{numero(comparativo.fluxos.seguidores_ganhos.atual ?? 0)}
                </span>
                <span className="mx-1.5 text-base font-normal text-muted-foreground">/</span>
                <span className="text-rose-600 dark:text-rose-400">
                  −{numero(comparativo.fluxos.seguidores_perdidos.atual ?? 0)}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {comparativo.fluxos.seguidores_perdidos.atual === null
                  ? 'Quem deixou de seguir ainda não está no arquivo'
                  : 'Quem seguiu / quem deixou de seguir no período'}
              </p>
            </Card>

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
                {modo === 'periodo'
                  ? 'Dia a dia'
                  : granularidade === 'mensal'
                    ? 'Mês a mês'
                    : 'Semana a semana'}
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
            {modo === 'periodo' ? (
              <>
                <GraficoDiario
                  dias={metricas ?? []}
                  de={janelaAtiva.de}
                  ate={janelaAtiva.ate}
                  metrica={metricaDoGrafico}
                  anterior={comparativo.anterior}
                  publicacoes={publicacoes?.linhas ?? []}
                  diaSelecionado={diaAberto}
                  onSelecionarDia={setDiaAberto}
                />
                <p className="text-xs text-muted-foreground">
                  Uma barra por dia. Traço vazado = dia sem coleta, nunca zero. A linha tracejada
                  é a média diária do período anterior de mesmo tamanho. O ponto azul marca o dia
                  que teve publicação — passe o cursor para ver qual, clique para abrir o dia.
                </p>
                {diaAberto && (
                  <DiaDetalhado
                    dia={diaAberto}
                    metricas={(metricas ?? []).find((m) => m.dia === diaAberto) ?? null}
                    publicacoes={postsPorDia.get(diaAberto) ?? []}
                    onFechar={() => setDiaAberto(null)}
                  />
                )}
              </>
            ) : (
              <>
                <GraficoDePeriodos
                  periodos={periodos}
                  metrica={metricaDoGrafico}
                  selecionado={emFoco as string}
                  onSelecionar={setSelecionada}
                />
                <p className="text-xs text-muted-foreground">
                  Clique num período para trazer os cartões e o comparativo para ele. Barra
                  listrada = período com dias sem coleta; traço vazado = nenhum dado — nunca zero.
                </p>
              </>
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">
              {modo === 'periodo'
                ? `${comparativo.atual.rotulo} contra ${comparativo.anterior?.rotulo ?? 'o período anterior'}`
                : `Arquivo completo (${periodos.length} ${granularidade === 'mensal' ? 'meses' : 'semanas'})`}
            </h2>
            {modo === 'periodo' ? (
              <TabelaComparativa comparativo={comparativo} />
            ) : (
              <TabelaDePeriodos
                periodos={periodos}
                selecionado={emFoco as string}
                onSelecionar={setSelecionada}
              />
            )}
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
