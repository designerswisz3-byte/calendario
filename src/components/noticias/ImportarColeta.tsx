import * as React from 'react'
import { Loader2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ErroDeColeta, lerColeta, type LeituraDeColeta } from '@/lib/noticias'
import type { NoticiaEntrada } from '@/types/database'

interface Props {
  aberto: boolean
  onFechar: () => void
  salvando: boolean
  onImportar: (noticias: NoticiaEntrada[]) => Promise<void>
}

const EXEMPLO = `[
  {
    "titulo": "Shein abre centro de distribuição no Nordeste",
    "resumo": "Operação reduz o prazo médio de entrega da plataforma no país.",
    "por_que_importa": "Prazo vira padrão de mercado: quem entrega em 10 dias passa a perder venda para quem entrega em 3.",
    "url": "https://exemplo.com.br/noticia",
    "fonte": "E-Commerce Brasil",
    "publicado_em": "2026-10-13",
    "relevancia": 4,
    "tags": ["logística", "concorrência"]
  }
]`

/**
 * Entrada da coleta diária.
 *
 * Igual ao Relatório, e pelo mesmo motivo: o app roda no navegador e não tem
 * como varrer a imprensa sozinho — nem deveria, porque chave de API em bundle
 * é chave pública. Quem coleta (uma sessão agendada, um script, ou você) entrega
 * o JSON aqui, e o Supabase vira a única fonte que a tela lê.
 */
export function ImportarColeta({ aberto, onFechar, salvando, onImportar }: Props) {
  const [texto, setTexto] = React.useState('')
  const [leitura, setLeitura] = React.useState<LeituraDeColeta | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  function conferir() {
    setErro(null)
    setLeitura(null)
    try {
      setLeitura(lerColeta(texto))
    } catch (e) {
      setErro(e instanceof ErroDeColeta ? e.message : 'Não consegui ler a coleta.')
    }
  }

  async function confirmar() {
    if (!leitura) return
    await onImportar(leitura.noticias)
    setTexto('')
    setLeitura(null)
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(estado) => {
        if (!estado && !salvando) onFechar()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar coleta de notícias</DialogTitle>
          <DialogDescription>
            Lista JSON com <code>titulo</code> e <code>url</code> obrigatórios. A mesma URL
            importada de novo atualiza a notícia — não duplica.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setLeitura(null)
            setErro(null)
          }}
          placeholder={EXEMPLO}
          rows={12}
          className="font-mono text-xs"
          spellCheck={false}
        />

        {erro && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}

        {leitura && (
          <div className="space-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
            <p className="font-medium">{leitura.noticias.length} notícia(s) prontas para entrar</p>
            {leitura.avisos.map((aviso) => (
              <p key={aviso} className="text-xs text-amber-600 dark:text-amber-400">
                {aviso}
              </p>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          {leitura ? (
            <Button onClick={confirmar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {leitura.noticias.length}
            </Button>
          ) : (
            <Button onClick={conferir} disabled={!texto.trim()}>
              Conferir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
