import { Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Mostrada quando o .env ainda não foi preenchido. */
export function SupabaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </span>
          <CardTitle>Configure o Supabase</CardTitle>
          <CardDescription>
            Crie um arquivo <code>.env</code> na raiz do projeto a partir de <code>.env.example</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-lg bg-foreground/5 p-3 text-xs">
{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon`}
          </pre>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Crie um projeto em supabase.com</li>
            <li>
              Rode as migrações de <code>supabase/migrations/</code> no SQL Editor
            </li>
            <li>
              Copie URL e chave anon em <em>Project Settings → API</em>
            </li>
            <li>Reinicie o servidor de desenvolvimento</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
