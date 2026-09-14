import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { errorMessage, isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  /** Preenchido quando não foi possível abrir sessão (ex: login anônimo desligado). */
  error: string | null
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

/**
 * Evita abrir duas sessões anônimas.
 *
 * O StrictMode roda o efeito duas vezes em desenvolvimento; sem esta trava,
 * seriam criados dois usuários anônimos e o segundo não enxergaria os dados
 * gravados pelo primeiro.
 */
let sessaoEmCurso: Promise<Session | null> | null = null

async function abrirSessao(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session) return data.session

  // Sem sessão guardada: cria uma anônima. É o que dispensa a tela de login.
  const { data: anonima, error: erroAnonimo } = await supabase.auth.signInAnonymously()
  if (erroAnonimo) throw erroAnonimo
  return anonima.session
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let ativo = true

    sessaoEmCurso = sessaoEmCurso ?? abrirSessao()
    sessaoEmCurso
      .then((nova) => {
        if (!ativo) return
        setSession(nova)
        setError(null)
      })
      .catch((erro) => {
        if (!ativo) return
        sessaoEmCurso = null
        setError(errorMessage(erro, 'Não foi possível abrir a sessão.'))
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, proxima) => {
      if (!ativo) return
      // Só reage a sessões reais: um null aqui é o efeito de limpeza do
      // StrictMode, e trocar o estado por ele derrubaria a sessão recém-criada.
      if (proxima) setSession(proxima)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, error }),
    [session, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return context
}
