import { Link, matchPath, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ItemDaNavegacao {
  label: string
  /** Nome curto para a tela estreita, onde sete abas disputam 370px. */
  curto?: string
  icon: LucideIcon
  to: string
  /** Só a rota exata conta como ativa (ex.: /criar, mas não /criar/123). */
  end?: boolean
}

interface BottomNavBarProps {
  itens: ItemDaNavegacao[]
  className?: string
}

/*
 * `motion.create(Link)` e não `motion.button`: as abas são navegação de
 * verdade. Como link, abrem em nova aba com o botão do meio, aparecem no
 * leitor de tela como link e funcionam com Ctrl+clique — coisas que um botão
 * com `navigate()` no onClick perde todas.
 */
const MotionLink = motion.create(Link)

/**
 * A navegação em pílula: só ícones, e a aba ativa abre o nome ao lado.
 *
 * O ganho sobre a fileira de abas por extenso é de espaço: sete nomes escritos
 * não cabem abaixo de ~1000px, e a solução anterior era esconder TODOS os
 * nomes nas telas médias. Aqui o nome que importa — o de onde você está —
 * aparece sempre, e os outros ficam a um toque.
 *
 * A aba ativa vem da ROTA, não de um estado interno. Um `useState` daria a
 * mesma animação e erraria em três casos: recarregar a página, chegar por um
 * link direto e usar o botão voltar do navegador.
 */
export function BottomNavBar({ itens, className }: BottomNavBarProps) {
  const { pathname } = useLocation()

  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      aria-label="Navegação principal"
      className={cn(
        'flex h-[52px] max-w-[95vw] items-center space-x-0.5 rounded-full border border-border bg-card/85 p-1.5 shadow-xl backdrop-blur-xl sm:space-x-1 sm:p-2',
        className,
      )}
    >
      {itens.map((item) => {
        const Icon = item.icon
        const isActive = matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null

        return (
          <MotionLink
            key={item.to}
            to={item.to}
            whileTap={{ scale: 0.97 }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            title={item.label}
            className={cn(
              'relative flex h-10 min-w-[36px] shrink-0 items-center justify-center rounded-full px-2 transition-colors duration-200 sm:min-w-[44px] sm:px-3',
              isActive
                ? 'bg-primary/10 text-primary dark:bg-primary/15'
                : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Icon size={20} strokeWidth={2} aria-hidden className="shrink-0" />

            {/*
              Largura animada até `auto`, e não até um número fixo: o original
              reservava 72px e cortava "Criar conteúdo" e "Comunidade" em
              reticências. Com `auto`, cada nome abre no tamanho que tem.
            */}
            <motion.span
              initial={false}
              animate={{
                width: isActive ? 'auto' : 0,
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? 8 : 0,
              }}
              transition={{
                width: { type: 'spring', stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="overflow-hidden"
              aria-hidden
            >
              <span className="block select-none whitespace-nowrap text-xs font-medium leading-none sm:text-[0.8125rem]">
                {item.curto ? (
                  <>
                    <span className="sm:hidden">{item.curto}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </motion.span>
          </MotionLink>
        )
      })}
    </motion.nav>
  )
}

export default BottomNavBar
