import { NavLink } from 'react-router-dom'
import { CalendarDays, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-250',
    isActive
      ? 'bg-primary text-primary-foreground shadow-glass'
      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
  )

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/20 bg-background/60 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <NavLink
            to="/calendario"
            className="mr-1 hidden items-center gap-2 font-semibold tracking-tight sm:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glass">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Calendário Editorial</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavLink to="/calendario" className={navLinkClass}>
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </NavLink>
            <NavLink to="/criar" className={navLinkClass} end>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Criar conteúdo</span>
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
