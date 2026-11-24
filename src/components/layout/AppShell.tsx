import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, CalendarDays, Clapperboard, LogOut, Newspaper, NotebookPen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/components/auth/AuthProvider'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-250',
    isActive
      ? 'bg-primary text-primary-foreground shadow-glass'
      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
  )

interface Props {
  children: React.ReactNode
  /**
   * Ocupa a janela inteira, sem a coluna central nem o respiro das outras
   * telas. As Notas usam duas colunas que vão até a borda; enquadrá-las em
   * 7xl com padding encolheria a área de escrita sem motivo.
   */
  telaCheia?: boolean
  /**
   * Coluna central mais larga, para a tela que tem faixa lateral.
   *
   * O calendário divide a largura entre a grade do mês e as duas gavetas. Em
   * 7xl, a segunda gaveta saiu inteira do bolso da grade: cada dia perdeu um
   * quinto da largura e o título do card passou a cortar em "A cont…". Num
   * monitor de 1440 para cima havia margem sobrando dos dois lados — é dela
   * que a gaveta nova passa a tirar o espaço.
   *
   * O cabeçalho continua em 7xl de propósito: se ele alargasse só nesta tela,
   * o menu pularia de lugar a cada troca de aba.
   */
  larga?: boolean
}

export function AppShell({ children, telaCheia = false, larga = false }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Não foi possível sair', description: errorMessage(error) })
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/20 bg-background/60 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <NavLink to="/calendario" className="mr-1 hidden items-center gap-2 font-semibold tracking-tight sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glass">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="hidden xl:inline">Calendário Editorial</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavLink to="/calendario" className={navLinkClass} title="Calendário" aria-label="Calendário">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden lg:inline">Calendário</span>
            </NavLink>
            <NavLink to="/criar" className={navLinkClass} end title="Criar conteúdo" aria-label="Criar conteúdo">
              <Sparkles className="h-4 w-4" />
              <span className="hidden lg:inline">Criar conteúdo</span>
            </NavLink>
            <NavLink to="/stories" className={navLinkClass} title="Stories" aria-label="Stories">
              <Clapperboard className="h-4 w-4" />
              <span className="hidden lg:inline">Stories</span>
            </NavLink>
            <NavLink to="/notas" className={navLinkClass} title="Notas" aria-label="Notas">
              <NotebookPen className="h-4 w-4" />
              <span className="hidden lg:inline">Notas</span>
            </NavLink>
            <NavLink to="/noticias" className={navLinkClass} title="Notícias" aria-label="Notícias">
              <Newspaper className="h-4 w-4" />
              <span className="hidden lg:inline">Notícias</span>
            </NavLink>
            <NavLink to="/relatorio" className={navLinkClass} title="Relatório" aria-label="Relatório">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden lg:inline">Relatório</span>
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden max-w-[14rem] truncate text-xs text-muted-foreground xl:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          telaCheia
            ? // 4rem = a altura do cabeçalho grudento acima.
              'h-[calc(100vh-4rem)] w-full'
            : cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', larga ? 'max-w-[96rem]' : 'max-w-7xl'),
        )}
      >
        {children}
      </main>
    </div>
  )
}
