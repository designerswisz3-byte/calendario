import * as React from 'react'
import { MessageSquareText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { useAjustes, useApagarAjuste } from '@/hooks/useAjustes'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const formatador = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Acima disso o texto vem recolhido, para não empurrar o preview da tela. */
const LIMITE_RECOLHIDO = 420

function TextoDoAjuste({ texto }: { texto: string }) {
  const [aberto, setAberto] = React.useState(false)
  const longo = texto.length > LIMITE_RECOLHIDO

  return (
    <div>
      <p
        className={cn(
          'whitespace-pre-wrap break-words text-sm leading-relaxed',
          longo && !aberto && 'line-clamp-6',
        )}
      >
        {texto}
      </p>
      {longo && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {aberto ? 'Recolher' : `Ver tudo (${texto.length.toLocaleString('pt-BR')} caracteres)`}
        </button>
      )}
    </div>
  )
}

/** O que o cliente pediu pelo link público, na visão de quem vai executar. */
export function AjustesDoCliente({ previewId }: { previewId: string }) {
  const { data: ajustes = [], isLoading } = useAjustes(previewId)
  const apagar = useApagarAjuste(previewId)

  if (isLoading) return <Skeleton className="h-28 rounded-xl" />
  if (ajustes.length === 0) return null

  async function handleApagar(id: string) {
    if (!window.confirm('Apagar este ajuste? Ele some da sua lista e da do cliente.')) return
    try {
      await apagar.mutateAsync(id)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível apagar', description: errorMessage(error) })
    }
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Ajustes pedidos pelo cliente
          <span className="rounded-md bg-amber-500/15 px-1.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300">
            {ajustes.length}
          </span>
        </CardTitle>
        <CardDescription>Chegaram pelo link de preview.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {ajustes.map((ajuste) => (
          <article key={ajuste.id} className="rounded-lg bg-foreground/[0.04] p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium">{ajuste.autor?.trim() || 'Anônimo'}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {formatador.format(new Date(ajuste.criado_em))}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleApagar(ajuste.id)}
                  aria-label="Apagar ajuste"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            </div>
            <TextoDoAjuste texto={ajuste.texto} />
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
