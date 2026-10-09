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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROTULOS } from '@/lib/relatorio'
import { ErroDeImportacao, lerMetricas, type Leitura } from '@/lib/relatorioImportacao'
import type { RelatorioMetricaEntrada } from '@/types/database'

interface Props {
  aberto: boolean
  onFechar: () => void
  perfil: string
  salvando: boolean
  onImportar: (dias: RelatorioMetricaEntrada[], fonte: string) => Promise<void>
}

const EXEMPLO = `dia;seguidores;alcance;views;likes;comentarios;salvamentos;compartilhamentos;publicacoes
2026-09-01;452;300;1388;40;3;5;2;1
2026-09-02;455;280;3014;52;4;7;1;2`

/**
 * Entrada de dados do Relatório.
 *
 * O app roda no navegador do cliente, então não pode guardar o token de página
 * da Meta para puxar métricas sozinho — quem abrisse o DevTools teria a conta.
 * O caminho honesto é este: quem tem o dado (coletor no servidor, planilha,
 * export da própria Meta) cola aqui, e o Supabase passa a ser a única fonte
 * que a tela lê.
 *
 * Nada é gravado antes da conferência: a tela mostra quantos dias, quais
 * métricas e qual janela vão entrar. Importar em cima do mês errado é
 * reversível; descobrir isso só na próxima decisão, não.
 */
export function ImportarMetricas({ aberto, onFechar, perfil, salvando, onImportar }: Props) {
  const [texto, setTexto] = React.useState('')
  const [fonte, setFonte] = React.useState('manual')
  const [leitura, setLeitura] = React.useState<Leitura | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  function conferir() {
    setErro(null)
    setLeitura(null)
    try {
      setLeitura(lerMetricas(texto))
    } catch (e) {
      setErro(e instanceof ErroDeImportacao ? e.message : 'Não consegui ler os dados colados.')
    }
  }

  async function confirmar() {
    if (!leitura) return
    await onImportar(leitura.dias, fonte.trim() || 'manual')
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
          <DialogTitle>Importar métricas de @{perfil}</DialogTitle>
          <DialogDescription>
            Cole CSV ou JSON com uma linha por dia. Reimportar o mesmo dia corrige o valor — não
            duplica. Célula vazia entra como "sem dado", que é diferente de zero.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setLeitura(null)
              setErro(null)
            }}
            placeholder={EXEMPLO}
            rows={10}
            className="font-mono text-xs"
            spellCheck={false}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="fonte-da-importacao">Fonte (fica gravada em cada dia)</Label>
            <Input
              id="fonte-da-importacao"
              value={fonte}
              onChange={(e) => setFonte(e.target.value)}
              placeholder="manual, meta_graph, swisz…"
            />
          </div>

          {erro && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          {leitura && (
            <div className="space-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
              <p className="font-medium">
                {leitura.dias.length} dia(s), de {leitura.de} a {leitura.ate}
              </p>
              <p className="text-muted-foreground">
                Métricas:{' '}
                {leitura.metricas
                  .map((m) => ROTULOS[m as keyof typeof ROTULOS] ?? m)
                  .join(', ')}
              </p>
              {leitura.avisos.map((aviso) => (
                <p key={aviso} className="text-xs text-amber-600 dark:text-amber-400">
                  {aviso}
                </p>
              ))}
            </div>
          )}
        </div>

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
              Importar {leitura.dias.length} dia(s)
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
