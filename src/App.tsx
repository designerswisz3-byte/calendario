import * as React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Rotas em lazy: o link público /preview/:id é o que chega para o cliente,
 * então ele não deve baixar o bundle do calendário para renderizar um post.
 */
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage'))
const CreatePage = React.lazy(() => import('@/pages/CreatePage'))
const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))
const PublicPreviewPage = React.lazy(() => import('@/pages/PublicPreviewPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Carregando…</span>
    </div>
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
        <Route path="/preview/:id" element={<PublicPreviewPage />} />

        <Route
          path="/criar"
          element={
            <ProtectedRoute>
              <AppShell>
                <CreatePage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <AppShell>
                <CalendarPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  )
}
