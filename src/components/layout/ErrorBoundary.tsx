import * as React from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  /** Muda quando a rota muda: serve para limpar o erro ao navegar. */
  chaveDeReset?: string
}

interface Estado {
  erro: Error | null
}

/**
 * Impede que o erro de uma tela derrube o app inteiro.
 *
 * Sem isto, um throw não tratado durante o render faz o React 18 desmontar a
 * árvore toda: some o cabeçalho, some a navegação, e a única saída é recarregar
 * a página — que foi exatamente o que aconteceu quando o canvas quebrou.
 *
 * Com o boundary, a falha fica contida na área de conteúdo: o cabeçalho
 * continua lá e dá para voltar para o calendário sem F5.
 */
export class ErrorBoundary extends React.Component<Props, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidUpdate(anterior: Props) {
    // Trocar de rota limpa o erro: a tela nova merece uma chance.
    if (this.state.erro && anterior.chaveDeReset !== this.props.chaveDeReset) {
      this.setState({ erro: null })
    }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="glass w-full max-w-lg space-y-4 rounded-xl p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" />
          </span>

          <div className="space-y-1">
            <p className="text-sm font-semibold">Esta tela quebrou</p>
            <p className="text-xs text-muted-foreground">
              O resto do app continua funcionando — use o menu acima para sair daqui.
            </p>
          </div>

          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-foreground/[0.06] p-3 text-left text-[0.7rem] leading-relaxed text-muted-foreground scrollbar-thin">
            {this.state.erro.message}
          </pre>

          <Button size="sm" variant="outline" onClick={() => this.setState({ erro: null })}>
            <RotateCcw className="h-3.5 w-3.5" />
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }
}
