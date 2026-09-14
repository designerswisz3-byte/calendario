import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/components/auth/AuthProvider'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const { session, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = React.useState<Mode>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/calendario'

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!email.trim() || !password) {
      toast({ variant: 'destructive', title: 'Preencha e-mail e senha' })
      return
    }
    if (mode === 'signup' && password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Use ao menos 6 caracteres.' })
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password)
        toast({
          variant: 'success',
          title: 'Conta criada',
          description: needsConfirmation
            ? 'Confirme o e-mail que enviamos para entrar.'
            : 'Bem-vindo! Você já está logado.',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: mode === 'login' ? 'Não foi possível entrar' : 'Não foi possível criar a conta',
        description: errorMessage(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glass">
          <CalendarDays className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário Editorial</h1>
          <p className="text-sm text-muted-foreground">Planeje, crie e aprove conteúdo em um só lugar.</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Use seu e-mail e senha para acessar o planejamento.'
              : 'Crie sua conta para começar a planejar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={submitting}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
