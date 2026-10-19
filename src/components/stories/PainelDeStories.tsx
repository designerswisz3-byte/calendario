import * as React from 'react'
import { Lightbulb, Loader2, PenLine, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditorDeSequencia } from '@/components/stories/EditorDeSequencia'
import { GerarDoAssunto, QUALQUER_EIXO } from '@/components/stories/GerarDoAssunto'
import { ImagemDeApoio } from '@/components/stories/ImagemDeApoio'
import { ARCOS } from '@/lib/stories/gatilhos'
import { ROTULO_DE_EIXO, TEMAS_POR_ID, type Eixo } from '@/lib/stories/temas'
import {
  arcoPadrao,
  escolherTemaPor,
  gerarSequencia,
  sementeDoDia,
  sugerirTemas,
  type Sugestao,
} from '@/lib/stories/gerador'
import { formatFullDay, parseDateKey } from '@/lib/date'
import type { StoryDaSequencia, StorySequenciaRow } from '@/types/database'

export interface RascunhoDeSequencia {
  id: string | null
  data: string
  titulo: string
  temaId: string | null
  arcoId: string | null
  stories: StoryDaSequencia[]
  observacao: string
  imagemCaminho: string | null
  imagemDescricao: string
  publicado: boolean
}

interface Props {
  dia: string | null
  sequencias: StorySequenciaRow[]
  /** O que está acontecendo: datas do calendário e notícias recentes. */
  contexto: { eventos: string[]; noticias: string[] }
  rascunho: RascunhoDeSequencia | null
  urlDaImagem: string | null
  subindoImagem: boolean
  salvando: boolean
  onFechar: () => void
  onAbrirRascunho: (rascunho: RascunhoDeSequencia) => void
  onAlterarRascunho: (campos: Partial<RascunhoDeSequencia>) => void
  onSalvar: () => void
  onExcluir: (id: string) => void
  onImagem: (arquivo: File) => void
  onRemoverImagem: () => void
}

/** Converte o que o gerador produz no formato que o banco guarda. */
function paraLinhas(stories: ReturnType<typeof gerarSequencia>): StoryDaSequencia[] {
  return (stories?.stories ?? []).map((story) => ({
    ordem: story.ordem,
    rotulo: story.rotulo,
    gatilho: story.gatilho,
    direcao_visual: story.direcaoVisual,
    texto: story.texto,
    pede_interacao: story.pedeInteracao,
  }))
}

export function PainelDeStories({
  dia,
  sequencias,
  contexto,
  rascunho,
  urlDaImagem,
  subindoImagem,
  salvando,
  onFechar,
  onAbrirRascunho,
  onAlterarRascunho,
  onSalvar,
  onExcluir,
  onImagem,
  onRemoverImagem,
}: Props) {
  /*
   * As sugestões são memoizadas pelo DIA, não pelo render.
   *
   * Sem isso, cada tecla digitada no editor recalcularia a lista e a pessoa
   * veria os três temas dançando enquanto escreve. Pior: a escolha deixaria de
   * ser "a sugestão de hoje" e viraria "a sugestão deste instante".
   */
  /** Quantas vezes a pessoa pediu "outras ideias" para o dia aberto. */
  const [giro, setGiro] = React.useState(0)

  // Trocar de dia zera o giro: o dia novo merece começar pela sugestão dele.
  React.useEffect(() => setGiro(0), [dia])

  const sugestoes: Sugestao[] = React.useMemo(
    () => (dia ? sugerirTemas(dia, contexto, 3, giro) : []),
    [dia, contexto, giro],
  )

  /*
   * A semente da REDAÇÃO.
   *
   * O dia e a rodada já mudam os assuntos; a semente muda as frases e o
   * formato. O contador de tentativas é o que faz apertar "gerar" de novo
   * reescrever em vez de devolver o mesmo texto — era essa a reclamação: todas
   * as sequências saíam no mesmo molde.
   *
   * Fica num ref, não em estado: quem lê é a função de gerar, no clique.
   * Em estado, cada clique causaria um render inútil do painel inteiro.
   */
  const tentativa = React.useRef(0)
  React.useEffect(() => {
    tentativa.current = 0
  }, [dia])

  const sementeBase = React.useMemo(() => (dia ? sementeDoDia(dia, giro) : 0), [dia, giro])

  const [arcoPorTema, setArcoPorTema] = React.useState<Record<string, string>>({})
  /* Escolhas do bloco "gerar a partir do seu assunto". */
  const [eixoEscolhido, setEixoEscolhido] = React.useState<Eixo | typeof QUALQUER_EIXO>(
    QUALQUER_EIXO,
  )
  const [arcoEscolhido, setArcoEscolhido] = React.useState(ARCOS[0].id)

  /*
   * Abrir uma sequência salva traz o arco dela para o seletor. Sem isto, abrir
   * uma sequência de 7 stories mostraria "Ensino rápido · 4 stories" no campo,
   * e regerar encolheria a sequência sem a pessoa ter pedido.
   */
  React.useEffect(() => {
    if (rascunho?.arcoId) setArcoEscolhido(rascunho.arcoId)
  }, [rascunho?.id, rascunho?.arcoId])

  function gerar(temaId: string, arcoId?: string) {
    if (!dia) return
    const gerada = gerarSequencia(temaId, arcoId, {
      oQueMostrar: rascunho?.imagemDescricao,
      semente: sementeDoDia(dia, giro, tentativa.current++),
    })
    if (!gerada) return
    onAbrirRascunho({
      id: null,
      data: dia,
      titulo: gerada.titulo,
      temaId: gerada.temaId,
      arcoId: gerada.arcoId,
      stories: paraLinhas(gerada),
      observacao: gerada.observacao,
      imagemCaminho: rascunho?.imagemCaminho ?? null,
      imagemDescricao: rascunho?.imagemDescricao ?? '',
      publicado: false,
    })
  }

  /**
   * Gera a sequência a partir do assunto que a PESSOA escreveu.
   *
   * As sugestões do dia resolvem "não sei sobre o que falar". Isto resolve o
   * caso mais comum de quem já tem pauta — "eu sei o assunto, me dá a
   * sequência" —, que antes terminava num rascunho vazio sem caminho de volta
   * para o gerador.
   */
  function gerarDoAssunto() {
    if (!rascunho || !dia) return
    const assunto = rascunho.titulo.trim() || rascunho.imagemDescricao.trim()
    if (!assunto) return

    // Substituir texto já escrito é destrutivo: pergunta antes.
    if (
      rascunho.stories.length > 0 &&
      !window.confirm('Isto substitui os stories escritos. Continuar?')
    ) {
      return
    }

    const eixo = eixoEscolhido === QUALQUER_EIXO ? undefined : eixoEscolhido
    const tema = escolherTemaPor(assunto, dia, contexto, eixo)
    const gerada = gerarSequencia(tema.id, arcoEscolhido, {
      // A imagem continua mandando no objeto de cena quando existe; o assunto
      // escolhe o ÂNGULO. São duas perguntas diferentes: "sobre o quê" e "o
      // que aparece na tela".
      oQueMostrar: rascunho.imagemDescricao.trim() || undefined,
      semente: sementeDoDia(dia, giro, tentativa.current++),
    })
    if (!gerada) return

    onAlterarRascunho({
      temaId: gerada.temaId,
      arcoId: gerada.arcoId,
      // O título é da pessoa: o motor não o atropela.
      stories: paraLinhas(gerada),
      observacao: gerada.observacao,
    })
  }

  /**
   * Gera (ou refaz) a sequência em torno da imagem.
   *
   * Quando ainda não há assunto escolhido — que é o caso de quem acabou de
   * colar uma foto e não passou pelas sugestões —, o assunto sai da própria
   * descrição. Era aqui que o botão ficava desativado: ele só sabia REGERAR, e
   * exigia um tema que esse caminho nunca teve.
   */
  function gerarComImagem() {
    if (!rascunho || !dia) return
    const descricao = rascunho.imagemDescricao.trim()
    if (!descricao) return

    const temaId = rascunho.temaId ?? escolherTemaPor(descricao, dia, contexto).id
    const gerada = gerarSequencia(temaId, rascunho.arcoId ?? undefined, {
      oQueMostrar: descricao,
      semente: sementeDoDia(dia, giro, tentativa.current++),
    })
    if (!gerada) return

    onAlterarRascunho({
      temaId: gerada.temaId,
      arcoId: gerada.arcoId,
      // Só assume o título do tema quando a pessoa ainda não escreveu o dela.
      titulo: rascunho.titulo.trim() || gerada.titulo,
      stories: paraLinhas(gerada),
      observacao: gerada.observacao,
    })
  }

  return (
    <Sheet open={Boolean(dia)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{dia ? formatFullDay(parseDateKey(dia)) : ''}</SheetTitle>
          <SheetDescription>
            {sequencias.length === 0
              ? 'Nenhuma sequência ainda.'
              : `${sequencias.length} ${sequencias.length === 1 ? 'sequência' : 'sequências'} neste dia`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5 scrollbar-thin">
          {rascunho ? (
            <>
              <ImagemDeApoio
                url={urlDaImagem}
                descricao={rascunho.imagemDescricao}
                subindo={subindoImagem}
                temTema={Boolean(rascunho.temaId)}
                onArquivo={onImagem}
                onDescricao={(texto) => onAlterarRascunho({ imagemDescricao: texto })}
                onRemover={onRemoverImagem}
                onRegerar={gerarComImagem}
              />

              <GerarDoAssunto
                assunto={rascunho.titulo.trim() || rascunho.imagemDescricao.trim()}
                eixo={eixoEscolhido}
                arcoId={arcoEscolhido}
                temStories={rascunho.stories.length > 0}
                ultimoAngulo={
                  rascunho.temaId ? (TEMAS_POR_ID.get(rascunho.temaId)?.titulo ?? null) : null
                }
                onEixo={setEixoEscolhido}
                onArco={setArcoEscolhido}
                onGerar={gerarDoAssunto}
              />

              <EditorDeSequencia
                titulo={rascunho.titulo}
                stories={rascunho.stories}
                observacao={rascunho.observacao}
                onTitulo={(titulo) => onAlterarRascunho({ titulo })}
                onStories={(stories) => onAlterarRascunho({ stories })}
              />

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onSalvar} loading={salvando}>
                  {rascunho.id ? 'Salvar sequência' : 'Criar sequência'}
                </Button>
                <Button variant="ghost" onClick={onFechar}>
                  Fechar
                </Button>
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rascunho.publicado}
                    onChange={(e) => onAlterarRascunho({ publicado: e.target.checked })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Já publiquei
                </label>
              </div>
            </>
          ) : (
            <>
              {sequencias.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sequências do dia
                  </h3>
                  {sequencias.map((sequencia) => (
                    <article
                      key={sequencia.id}
                      className="glass flex items-center gap-2 rounded-lg p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {sequencia.titulo || 'Sem título'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sequencia.stories.length} stories
                          {sequencia.publicado && ' · publicada'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onAbrirRascunho({
                            id: sequencia.id,
                            data: sequencia.data,
                            titulo: sequencia.titulo,
                            temaId: sequencia.tema_id,
                            arcoId: sequencia.arco_id,
                            stories: sequencia.stories,
                            observacao: sequencia.observacao,
                            imagemCaminho: sequencia.imagem_caminho,
                            imagemDescricao: sequencia.imagem_descricao,
                            publicado: sequencia.publicado,
                          })
                        }
                      >
                        <PenLine className="mr-1.5 h-3.5 w-3.5" />
                        Abrir
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Excluir ${sequencia.titulo}`}
                        onClick={() => {
                          if (window.confirm(`Excluir "${sequencia.titulo || 'esta sequência'}"?`)) {
                            onExcluir(sequencia.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </article>
                  ))}
                </section>
              )}

              <section className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                  <h3 className="text-sm font-semibold">Assuntos para este dia</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 px-2 text-xs"
                    onClick={() => setGiro((atual) => atual + 1)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Outras ideias
                  </Button>
                </div>

                {giro > 0 && (
                  /*
                   * Dizer em que rodada a pessoa está evita o clique infinito
                   * à procura de "a melhor": com 21 temas e 3 por rodada, sete
                   * cliques varrem o banco quase inteiro, e saber disso é o
                   * que faz parar e gravar.
                   */
                  <p className="text-xs text-muted-foreground">
                    Rodada {giro + 1}.{' '}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => setGiro(0)}
                    >
                      Voltar às sugestões do dia
                    </button>
                  </p>
                )}

                {sugestoes.map(({ tema, motivo }) => (
                  <article key={tema.id} className="space-y-2 rounded-lg border border-border/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{tema.titulo}</h4>
                      <Badge variant="outline" className="text-[0.65rem]">
                        {ROTULO_DE_EIXO[tema.eixo]}
                      </Badge>
                      <Badge variant="secondary" className="text-[0.65rem]">
                        {tema.alavanca}
                      </Badge>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">{tema.promessa}</p>
                    {motivo && (
                      <p className="text-xs leading-relaxed text-primary/80">{motivo}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={arcoPorTema[tema.id] ?? arcoPadrao(tema, sementeBase)}
                        onValueChange={(valor) =>
                          setArcoPorTema((atual) => ({ ...atual, [tema.id]: valor }))
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-auto min-w-[11rem] text-xs"
                          aria-label={`Arco para ${tema.titulo}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARCOS.map((arco) => (
                            <SelectItem key={arco.id} value={arco.id}>
                              {arco.rotulo} · {arco.passos.length} stories · {arco.tom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() =>
                          gerar(tema.id, arcoPorTema[tema.id] ?? arcoPadrao(tema, sementeBase))
                        }
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Gerar sequência
                      </Button>
                    </div>
                  </article>
                ))}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() =>
                    dia &&
                    onAbrirRascunho({
                      id: null,
                      data: dia,
                      titulo: '',
                      temaId: null,
                      arcoId: null,
                      stories: [],
                      observacao: '',
                      imagemCaminho: null,
                      imagemDescricao: '',
                      publicado: false,
                    })
                  }
                >
                  <PenLine className="mr-1.5 h-4 w-4" />
                  Escrever do zero
                </Button>
              </section>
            </>
          )}

          {salvando && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando…
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
