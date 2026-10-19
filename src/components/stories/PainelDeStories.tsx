import * as React from 'react'
import { Lightbulb, Loader2, PenLine, Sparkles, Trash2 } from 'lucide-react'
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
import { ImagemDeApoio } from '@/components/stories/ImagemDeApoio'
import { ARCOS } from '@/lib/stories/gatilhos'
import { ROTULO_DE_EIXO } from '@/lib/stories/temas'
import { gerarSequencia, sugerirTemas, type Sugestao } from '@/lib/stories/gerador'
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
  const sugestoes: Sugestao[] = React.useMemo(
    () => (dia ? sugerirTemas(dia, contexto) : []),
    [dia, contexto],
  )

  const [arcoPorTema, setArcoPorTema] = React.useState<Record<string, string>>({})

  function gerar(temaId: string, arcoId?: string) {
    if (!dia) return
    const gerada = gerarSequencia(temaId, arcoId, {
      oQueMostrar: rascunho?.imagemDescricao,
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

  /** Refaz a sequência atual em torno da descrição da imagem. */
  function regerarComImagem() {
    if (!rascunho?.temaId) return
    const gerada = gerarSequencia(rascunho.temaId, rascunho.arcoId ?? undefined, {
      oQueMostrar: rascunho.imagemDescricao,
    })
    if (!gerada) return
    onAlterarRascunho({ stories: paraLinhas(gerada), observacao: gerada.observacao })
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
                podeRegerar={Boolean(rascunho.temaId)}
                onArquivo={onImagem}
                onDescricao={(texto) => onAlterarRascunho({ imagemDescricao: texto })}
                onRemover={onRemoverImagem}
                onRegerar={regerarComImagem}
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
                  <h3 className="text-sm font-semibold">Assuntos para hoje</h3>
                </div>

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
                        value={arcoPorTema[tema.id] ?? tema.arcosSugeridos[0]}
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
                              {arco.rotulo} · {arco.passos.length} stories
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() => gerar(tema.id, arcoPorTema[tema.id] ?? tema.arcosSugeridos[0])}
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
