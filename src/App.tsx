import * as React from 'react'
import { cn } from '@/lib/utils'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Rotas em lazy: o link público /preview/:id é o que chega para o cliente,
 * então ele não deve baixar o bundle do calendário para renderizar um post.
 */
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage'))
/** Editor e desenho são bundles grandes; só carregam para quem abre Notas. */
const NotasPage = React.lazy(() => import('@/pages/NotasPage'))
const ComunidadePage = React.lazy(() => import('@/pages/ComunidadePage'))
const CreatePage = React.lazy(() => import('@/pages/CreatePage'))
/** Dashboard de métricas — tabela larga e impressão própria, carrega sob demanda. */
const RelatorioPage = React.lazy(() => import('@/pages/RelatorioPage'))
const NoticiasPage = React.lazy(() => import('@/pages/NoticiasPage'))
const StoriesPage = React.lazy(() => import('@/pages/StoriesPage'))
const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))
const PublicPreviewPage = React.lazy(() => import('@/pages/PublicPreviewPage'))

function RouteFallback({ dentroDaMoldura = false }: { dentroDaMoldura?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        // Dentro da moldura o cabeçalho já ocupa parte da tela: a altura
        // inteira empurraria o indicador para baixo da dobra.
        dentroDaMoldura ? 'min-h-[50vh]' : 'min-h-screen',
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

/**
 * Rota privada com o app em volta.
 *
 * O ErrorBoundary fica DENTRO do AppShell de propósito: se uma tela quebrar, o
 * cabeçalho e a navegação continuam de pé e dá para sair dali sem recarregar.
 * Fora do AppShell, o erro levaria o menu junto — que foi como uma tela
 * sozinha já conseguiu deixar o app inteiro preto.
 */
function RotaPrivada({
  children,
  telaCheia,
  larga,
}: {
  children: React.ReactNode
  telaCheia?: boolean
  larga?: boolean
}) {
  const { pathname } = useLocation()
  return (
    <ProtectedRoute>
      <AppShell telaCheia={telaCheia} larga={larga}>
        {/* Trocar de rota limpa o erro: a tela nova merece uma chance. */}
        <ErrorBoundary chaveDeReset={pathname}>
          {/*
            O Suspense fica DENTRO da moldura, e não só em volta das rotas.

            As páginas são carregadas sob demanda. Com um único Suspense lá em
            cima, a primeira visita a cada aba escondia a tela inteira —
            cabeçalho e navegação junto — enquanto o código da página chegava,
            e a aba clicada só acendia depois. Aqui dentro, a moldura fica: a
            navegação responde no clique e só o miolo espera.
          */}
          <React.Suspense fallback={<RouteFallback dentroDaMoldura />}>{children}</React.Suspense>
        </ErrorBoundary>
      </AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SupabaseSetupNotice />

  return (
    <React.Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/calendario" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Link compartilhável: sem login, sem edição. */}
        <Route
          path="/preview/:id"
          element={
            <ErrorBoundary>
              <PublicPreviewPage />
            </ErrorBoundary>
          }
        />

        <Route
          path="/criar"
          element={
            <RotaPrivada>
              <CreatePage />
            </RotaPrivada>
          }
        />
        <Route
          path="/calendario"
          element={
            <RotaPrivada larga>
              <CalendarPage />
            </RotaPrivada>
          }
        />
        <Route
          path="/stories"
          element={
            <RotaPrivada>
              <StoriesPage />
            </RotaPrivada>
          }
        />
        <Route
          path="/comunidade"
          element={
            <RotaPrivada>
              <ComunidadePage />
            </RotaPrivada>
          }
        />
        <Route
          path="/noticias"
          element={
            <RotaPrivada>
              <NoticiasPage />
            </RotaPrivada>
          }
        />
        <Route
          path="/relatorio"
          element={
            <RotaPrivada>
              <RelatorioPage />
            </RotaPrivada>
          }
        />
        <Route
          path="/notas"
          element={
            <RotaPrivada telaCheia>
              <NotasPage />
            </RotaPrivada>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  )
}
