import { KeyRound, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/auth/AuthProvider'

/**
 * Segura as telas privadas até existir sessão.
 *
 * Não há tela de login: a sessão é aberta sozinha, de forma anônima. Se o
 * Supabase estiver com login anônimo desligado, mostramos exatamente onde
 * ligar em vez de deixar a tela em branco.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { session, loading, error } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Abrindo sessão…</span>
      </div>
    )
  }

  if (!session) {
    const desligado = /anonymous|disabled/i.test(error ?? '')

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <CardTitle>
              {desligado ? 'Ative o login anônimo no Supabase' : 'Não foi possível abrir a sessão'}
            </CardTitle>
            <CardDescription>
              {desligado
                ? 'Este app dispensa tela de login: ele abre uma sessão anônima sozinho. Falta permitir isso no projeto.'
                : 'O Supabase recusou a abertura de sessão.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {desligado && (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Supabase → <strong>Authentication</strong> → <strong>Sign In / Providers</strong></li>
                <li>
                  Ligue <strong>Anonymous sign-ins</strong>
                </li>
                <li>Recarregue esta página</li>
              </ol>
            )}
            {error && (
              <p className="rounded-lg bg-foreground/5 p-3 font-mono text-xs text-muted-foreground">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
