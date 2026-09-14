import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Compass className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço acessado não existe.</p>
      </div>
      <Button asChild>
        <Link to="/calendario">Ir para o calendário</Link>
      </Button>
    </div>
  )
}
