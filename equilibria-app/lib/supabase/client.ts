import { createBrowserClient } from '@supabase/ssr'

// NOTA: cuando hagamos el refactor completo a tipos generados,
// importar Database de '@/lib/database.types' y pasarlo como genérico
// a createBrowserClient<Database>. Hoy no se hace porque rompe múltiples
// queries con joins embebidos (`*, plans(*)`) y requiere reescribirlos.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
