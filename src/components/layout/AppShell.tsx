import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  LogOut,
  MessagesSquare,
  Newspaper,
  NotebookPen,
  Sparkles,
} from 'lucide-react'
import { BottomNavBar, type ItemDaNavegacao } from '@/components/ui/bottom-nav-bar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/components/auth/AuthProvider'
import { toast } from '@/components/ui/use-toast'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/*
 * As abas, na ordem em que o trabalho acontece: planejar, produzir, publicar o
 * dia a dia, guardar o que se aprende, se informar e medir. "Comunidade" fica
 * depois de Stories porque é o outro canal diário — o que se fala hoje no
 * grupo.
 */
const ABAS: ItemDaNavegacao[] = [
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/criar', label: 'Criar conteúdo', curto: 'Criar', icon: Sparkles, end: true },
  { to: '/stories', label: 'Stories', icon: Clapperboard },
  { to: '/comunidade', label: 'Comunidade', icon: MessagesSquare },
  { to: '/notas', label: 'Notas', icon: NotebookPen },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/relatorio', label: 'Relatório', icon: BarChart3 },
]

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
          <NavLink to="/calendario" className="mr-1 flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glass">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="md:hidden xl:inline">Calendário Editorial</span>
          </NavLink>

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

      {/*
        A navegação mora FORA do cabeçalho, e não dentro dele.

        O cabeçalho tem `backdrop-blur`, e um elemento com backdrop-filter vira
        a referência de posição para tudo que é `fixed` dentro dele. A pílula
        ficaria presa aos 64px do cabeçalho e nunca chegaria ao rodapé no
        celular.

        Uma pílula só, em dois lugares: centralizada sobre o cabeçalho de `md`
        para cima, e flutuando no rodapé no celular — onde sete abas não cabem
        ao lado do logo, e onde o polegar alcança. `mx-auto w-fit` em vez de
        `left-1/2 -translate-x-1/2`: a animação de entrada usa `transform`, e
        os dois brigariam pela mesma propriedade.
      */}
      <BottomNavBar
        itens={ABAS}
        className="fixed inset-x-0 bottom-4 z-40 mx-auto w-fit md:bottom-auto md:top-1.5"
      />

      <main
        className={cn(
          telaCheia
            ? // 4rem = a altura do cabeçalho grudento acima. No celular saem
              // mais 5rem: a pílula flutua no rodapé e cobriria a última linha.
              'h-[calc(100dvh-9rem)] w-full md:h-[calc(100vh-4rem)]'
            : cn(
                // `pb-24` no celular pelo mesmo motivo: o fim da página precisa
                // rolar para cima da pílula.
                'mx-auto w-full px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-8',
                larga ? 'max-w-[96rem]' : 'max-w-7xl',
              ),
        )}
      >
        {children}
      </main>
    </div>
  )
}
