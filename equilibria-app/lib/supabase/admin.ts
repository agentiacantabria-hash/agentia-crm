import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  // Strip BOM (U+FEFF) y otros invisibles que pueden quedar al copiar la clave en Vercel
  const serviceKey = Array.from(raw).filter(c => {
    const code = c.codePointAt(0) ?? 0
    return code >= 32 && code <= 126
  }).join('')

  if (!serviceKey || serviceKey.includes('XXXX')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada — ve a Supabase > Settings > API')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
