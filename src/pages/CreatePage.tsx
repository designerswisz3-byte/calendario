import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ExternalLink, Link2, Loader2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AjustesDoCliente } from '@/components/calendar/AjustesDoCliente'
import { MediaUploader, type MediaItem } from '@/components/preview/MediaUploader'
import { InstagramPreview } from '@/components/preview/InstagramPreview'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import {
  CANVA_URL_REGEX,
  CAPTION_MAX_LENGTH,
  CONTENT_TYPES,
  MAX_MEDIA_ITEMS,
  TYPE_LABEL,
  aceitaVariasMidias,
} from '@/lib/constants'
import { formatShortDate } from '@/lib/date'
import { useMediaUpload, validateFile } from '@/hooks/useMediaUpload'
import { usePreviewByCalendarItem, useSavePreview } from '@/hooks/useContentPreviews'
import { useCalendarItem } from '@/hooks/useCalendarItem'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/types/database'

export default function CreatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Vindo do calendário: /criar?calendar_item_id=<id>
  const calendarItemId = searchParams.get('calendar_item_id')
  const previewIdParam = searchParams.get('preview_id')

  const { data: calendarItem } = useCalendarItem(calendarItemId ?? undefined)
  const { data: linkedPreview, isLoading: loadingLinked } = usePreviewByCalendarItem(
    calendarItemId ?? undefined,
  )
  const savePreview = useSavePreview()
  const { uploadMany, uploading, progresso } = useMediaUpload()

  const [previewId, setPreviewId] = React.useState<string | null>(previewIdParam)
  const [nomeExpert, setNomeExpert] = React.useState('')
  const [legenda, setLegenda] = React.useState('')
  const [canvaUrl, setCanvaUrl] = React.useState('')
  const [tipo, setTipo] = React.useState<ContentType>('carrossel')
  const [media, setMedia] = React.useState<MediaItem[]>([])
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const hydrated = React.useRef(false)

  // Edição: carrega o conteúdo já vinculado ao item de planejamento.
  React.useEffect(() => {
    if (hydrated.current || !linkedPreview) return
    hydrated.current = true
    setPreviewId(linkedPreview.id)
    setNomeExpert(linkedPreview.nome_expert)
    setLegenda(linkedPreview.legenda ?? '')
    setCanvaUrl(linkedPreview.canva_url ?? '')
    setTipo(linkedPreview.tipo)
    setMedia(
      linkedPreview.media_assets.map((asset) => ({
        id: asset.id,
        url: asset.url_arquivo,
        tipo: asset.tipo,
      })),
    )
    setGeneratedUrl(`${window.location.origin}/preview/${linkedPreview.id}`)
  }, [linkedPreview])

  // O tipo do planejamento sugere o tipo do conteúdo (exceto "ideia").
  React.useEffect(() => {
    if (hydrated.current || !calendarItem) return
    if (calendarItem.tipo !== 'ideia') setTipo(calendarItem.tipo as ContentType)
  }, [calendarItem])

  const isEditing = Boolean(previewId)
  // Formatos de mídia única mostram só a primeira; o upload guarda todas.
  const midiasIgnoradas = aceitaVariasMidias(tipo) ? 0 : Math.max(0, media.length - 1)
  const captionLeft = CAPTION_MAX_LENGTH - legenda.length

  async function handleFiles(files: File[]) {
    if (!files.length) return

    // Valida tudo antes de subir qualquer coisa: nada pior que metade no ar.
    const tipos: MediaItem['tipo'][] = []
    for (const file of files) {
      const resultado = validateFile(file)
      if (!resultado.ok) {
        toast({ variant: 'destructive', title: 'Arquivo inválido', description: resultado.erro })
        return
      }
      tipos.push(resultado.tipo)
    }

    const resultados = await uploadMany(files)

    const enviados: MediaItem[] = []
    const falhas: string[] = []
    resultados.forEach((resultado, index) => {
      if (resultado.ok) {
        enviados.push({ id: crypto.randomUUID(), url: resultado.url, tipo: tipos[index] })
      } else {
        falhas.push(`${files[index].name}: ${errorMessage(resultado.erro)}`)
      }
    })

    // O que subiu fica, mesmo que parte do lote tenha falhado.
    if (enviados.length) {
      setMedia((current) => [...current, ...enviados].slice(0, MAX_MEDIA_ITEMS))
    }
    if (falhas.length) {
      toast({
        variant: 'destructive',
        title: falhas.length === 1 ? 'Falha no upload' : `${falhas.length} arquivos falharam`,
        description: falhas.join(' · '),
      })
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    // Validação: expert + pelo menos uma mídia são obrigatórios.
    if (!nomeExpert.trim()) {
      toast({ variant: 'destructive', title: 'Informe o nome do expert' })
      return
    }
    if (media.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Adicione pelo menos uma mídia',
        description: 'Envie ao menos uma imagem ou vídeo.',
      })
      return
    }
    if (canvaUrl.trim() && !CANVA_URL_REGEX.test(canvaUrl.trim())) {
      toast({
        variant: 'destructive',
        title: 'Link do Canva inválido',
        description: 'Cole o endereço do projeto no Canva (canva.com). Esse link aparece para o cliente.',
      })
      return
    }

    if (legenda.length > CAPTION_MAX_LENGTH) {
      toast({
        variant: 'destructive',
        title: 'Legenda muito longa',
        description: `O limite do Instagram é ${CAPTION_MAX_LENGTH} caracteres.`,
      })
      return
    }

    try {
      const saved = await savePreview.mutateAsync({
        id: previewId,
        calendarItemId,
        nomeExpert,
        legenda,
        tipo,
        canvaUrl,
        media: media.map((item) => ({ url_arquivo: item.url, tipo: item.tipo })),
      })

      setPreviewId(saved.id)
      setGeneratedUrl(`${window.location.origin}/preview/${saved.id}`)
      toast({
        variant: 'success',
        title: isEditing ? 'Conteúdo atualizado' : 'Link de preview gerado',
        description: isEditing
          ? 'O link continua o mesmo — quem já recebeu vê a versão nova.'
          : 'Copie o link e envie para aprovação.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: errorMessage(error),
      })
    }
  }

  async function copyLink() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível copiar', description: generatedUrl })
    }
  }

  if (calendarItemId && loadingLinked) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[32rem] w-full rounded-xl" />
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {calendarItemId && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/calendario')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao calendário
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? 'Editar conteúdo' : 'Criar conteúdo'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Monte o post, gere o link e envie para aprovação.
          </p>
        </div>
        {calendarItem && (
          <Badge variant="glass" className="gap-1.5">
            <Link2 className="h-3 w-3" />
            Vinculado a {formatShortDate(calendarItem.data)}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ---------- Formulário ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Conteúdo</CardTitle>
            <CardDescription>Expert, legenda e mídia ficam só aqui.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="expert">Nome do expert / cliente</Label>
                <Input
                  id="expert"
                  placeholder="ex: maria.consultoria"
                  value={nomeExpert}
                  onChange={(event) => setNomeExpert(event.target.value)}
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de conteúdo</Label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as ContentType)}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TYPE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="legenda">Legenda</Label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      captionLeft < 0
                        ? 'font-semibold text-destructive'
                        : captionLeft < 200
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {legenda.length.toLocaleString('pt-BR')} / {CAPTION_MAX_LENGTH.toLocaleString('pt-BR')}
                  </span>
                </div>
                <Textarea
                  id="legenda"
                  placeholder="Escreva a legenda como ela vai aparecer no post…"
                  className="min-h-[180px]"
                  value={legenda}
                  onChange={(event) => setLegenda(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="canva">
                  Link da arte no Canva{' '}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="canva"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.canva.com/design/..."
                  value={canvaUrl}
                  onChange={(event) => setCanvaUrl(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Aparece como botão no link do cliente, para ele abrir a arte e ajustar o texto.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Mídias</Label>
                <MediaUploader
                  items={media}
                  onChange={setMedia}
                  onFilesSelected={handleFiles}
                  uploading={uploading}
                  progresso={progresso}
                />
                {midiasIgnoradas > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {TYPE_LABEL[tipo]} usa só a primeira mídia. As outras{' '}
                    {midiasIgnoradas === 1 ? 'ficará guardada' : `${midiasIgnoradas} ficarão guardadas`},
                    mas não aparecem no preview — troque para Carrossel para mostrar todas.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" loading={savePreview.isPending || uploading}>
                {isEditing ? 'Salvar alterações' : 'Gerar link de preview'}
              </Button>

              {generatedUrl && (
                <div className="glass space-y-2 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground">Link público</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded bg-foreground/5 px-2 py-1.5 text-xs">
                      {generatedUrl}
                    </code>
                    <Button type="button" variant="outline" size="icon-sm" onClick={copyLink} aria-label="Copiar link">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" variant="outline" size="icon-sm" asChild aria-label="Abrir preview">
                      <a href={generatedUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ---------- Preview ao vivo + retorno do cliente ---------- */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {previewId && linkedPreview?.canva_url && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                linkedPreview.canva_visto
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-foreground/[0.04] text-muted-foreground',
              )}
            >
              <Palette className="h-4 w-4 shrink-0" />
              {linkedPreview.canva_visto ? (
                <span>
                  O expert abriu a arte no Canva
                  {linkedPreview.canva_visto_em &&
                    ` em ${new Date(linkedPreview.canva_visto_em).toLocaleString('pt-BR')}`}
                </span>
              ) : (
                <span>O expert ainda não abriu a arte no Canva.</span>
              )}
            </div>
          )}
          {previewId && <AjustesDoCliente previewId={previewId} />}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Preview ao vivo
            </h2>
            {savePreview.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex justify-center rounded-xl bg-neutral-100/70 p-3 dark:bg-neutral-900/60">
            <InstagramPreview
              expert={nomeExpert}
              legenda={legenda}
              tipo={tipo}
              media={media.map((item) => ({ url_arquivo: item.url, tipo: item.tipo }))}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {previewId ? (
              <>
                É exatamente o que o cliente vê em{' '}
                <Link to={`/preview/${previewId}`} className="underline">
                  /preview/{previewId.slice(0, 8)}…
                </Link>
              </>
            ) : (
              'É exatamente o que o cliente vai ver no link público.'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
