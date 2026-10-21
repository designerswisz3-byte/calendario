import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  de: string
  ate: string
  /** O primeiro e o último dia que existem no arquivo, para limitar o campo. */
  limites: { primeiro: string; ultimo: string }
  onMudar: (de: string, ate: string) => void
}

const somarDias = (dia: string, n: number) => {
  const data = new Date(`${dia}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + n)
  return data.toISOString().slice(0, 10)
}

const primeiroDoMes = (dia: string) => `${dia.slice(0, 7)}-01`

const ultimoDoMes = (dia: string) => {
  const data = new Date(`${dia}T00:00:00Z`)
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}

/**
 * Os atalhos que resolvem 90% das perguntas.
 *
 * Mensal e semanal respondem "como foi este mês". Estes respondem a pergunta
 * que aparece quando alguém está decidindo: "como foram os últimos 28 dias",
 * "como foi a campanha". Digitar duas datas toda vez para isso é atrito, e
 * atrito em painel significa painel que não se abre.
 */
function atalhos(hoje: string) {
  const mesPassado = somarDias(primeiroDoMes(hoje), -1)
  return [
    { chave: '7d', rotulo: '7 dias', de: somarDias(hoje, -6), ate: hoje },
    { chave: '28d', rotulo: '28 dias', de: somarDias(hoje, -27), ate: hoje },
    { chave: '90d', rotulo: '90 dias', de: somarDias(hoje, -89), ate: hoje },
    { chave: 'mes', rotulo: 'Este mês', de: primeiroDoMes(hoje), ate: hoje },
    {
      chave: 'mes-1',
      rotulo: 'Mês passado',
      de: primeiroDoMes(mesPassado),
      ate: ultimoDoMes(mesPassado),
    },
    { chave: '12m', rotulo: '12 meses', de: somarDias(hoje, -364), ate: hoje },
  ]
}

export function SeletorDePeriodo({ de, ate, limites, onMudar }: Props) {
  const opcoes = React.useMemo(() => atalhos(limites.ultimo), [limites.ultimo])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opcoes.map((opcao) => {
        const ativo = opcao.de === de && opcao.ate === ate
        return (
          <button
            key={opcao.chave}
            type="button"
            onClick={() => onMudar(opcao.de, opcao.ate)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              ativo
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}

      <span className="ml-1 flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-1">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="date"
          aria-label="Início do período"
          value={de}
          min={limites.primeiro}
          max={ate}
          onChange={(evento) => evento.target.value && onMudar(evento.target.value, ate)}
          className="bg-transparent text-xs outline-none"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <input
          type="date"
          aria-label="Fim do período"
          value={ate}
          min={de}
          max={limites.ultimo}
          onChange={(evento) => evento.target.value && onMudar(de, evento.target.value)}
          className="bg-transparent text-xs outline-none"
        />
      </span>
    </div>
  )
}
