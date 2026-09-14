import * as React from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MAX_IMAGE_SIZE_MB, MAX_MEDIA_ITEMS, MAX_VIDEO_SIZE_MB } from '@/lib/constants'
import type { MediaType } from '@/types/database'

export interface MediaItem {
  /** id local estável, usado pelo dnd-kit. */
  id: string
  url: string
  tipo: MediaType
}

interface Props {
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  onFilesSelected: (files: File[]) => void | Promise<void>
  uploading?: boolean
}

function SortableMedia({
  item,
  index,
  onRemove,
}: {
  item: MediaItem
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const ehVideo = item.tipo === 'video'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-lg border border-white/30 bg-black/5',
        isDragging && 'z-10 opacity-80 shadow-glass-lg',
      )}
    >
      {ehVideo ? (
        <>
          {/* preload=metadata basta para o navegador desenhar o primeiro quadro */}
          <video
            src={item.url}
            className="h-full w-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </span>
        </>
      ) : (
        <img src={item.url} alt={`Mídia ${index + 1}`} className="h-full w-full object-cover" />
      )}

      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover mídia ${index + 1}`}
        className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity duration-200 hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        className="absolute bottom-1.5 left-1.5 cursor-grab rounded bg-black/60 p-1 text-white active:cursor-grabbing"
        aria-label={`Reordenar mídia ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

/**
 * Upload de mídia: imagens e vídeos no mesmo conjunto, até MAX_MEDIA_ITEMS,
 * reordenáveis por drag-and-drop. A ordem daqui é a ordem dos slides.
 */
export function MediaUploader({ items, onChange, onFilesSelected, uploading }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const restantes = MAX_MEDIA_ITEMS - items.length
  const noLimite = restantes <= 0

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    // Corta no que ainda cabe: melhor subir o que dá do que recusar o lote todo.
    await onFilesSelected(Array.from(fileList).slice(0, Math.max(0, restantes)))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/40 px-4 py-8 text-center transition-colors duration-250',
          dragOver && 'border-primary bg-accent/60',
          noLimite && 'opacity-60',
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium">
            {noLimite ? `Limite de ${MAX_MEDIA_ITEMS} mídias atingido` : 'Arraste imagens e vídeos'}
          </p>
          <p className="text-xs text-muted-foreground">
            {noLimite
              ? 'Remova alguma para adicionar outra.'
              : `${items.length}/${MAX_MEDIA_ITEMS} · imagem até ${MAX_IMAGE_SIZE_MB} MB, vídeo até ${MAX_VIDEO_SIZE_MB} MB`}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || noLimite}
        >
          Escolher arquivos
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            Arraste pelo punho para reordenar — a ordem aqui é a ordem dos slides.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {items.map((item, index) => (
                  <SortableMedia
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  )
}
