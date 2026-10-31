// KINEO-DECISOES-PRECO-3110 — a leitura de servidor da concessão do filme grátis de região (fundador 31/10: "1 sim, 2 não").
// Só o servidor chama (service role: `events` é fechada para anon/authenticated). A régua pura mora em lib/freeFilmPolicy.ts
// (regionFreeFilmGrantOnRecord / regionFreeFilmEligibilityFor); aqui só se busca o evento region_free_film_granted da conta,
// gravado com granted:true ATÉ o corte. Devolve true/false; null = não consegui ler (quem chama falha FECHADO: não admite).
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { REGION_FREE_FILM_GRANTED_EVENT, REGION_FREE_FILM_GRANT_CUTOFF_ISO, regionFreeFilmGrantOnRecord } from '@/lib/freeFilmPolicy'

export async function readRegionFreeFilmGrantOnRecord(userId: string, db?: SupabaseClient | null): Promise<boolean | null> {
  try {
    let client = db ?? null
    if (!client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) return null
      client = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    }
    const { data, error } = await client
      .from('events')
      .select('created_at, metadata')
      .eq('name', REGION_FREE_FILM_GRANTED_EVENT)
      .eq('user_id', userId)
      .lte('created_at', REGION_FREE_FILM_GRANT_CUTOFF_ISO)
      .order('created_at', { ascending: true })
      .limit(5)
    if (error || !Array.isArray(data)) return null
    return data.some((row) => {
      const r = row as { created_at?: string | null; metadata?: { granted?: unknown } | null }
      return regionFreeFilmGrantOnRecord({ created_at: r.created_at ?? null, granted: r.metadata?.granted })
    })
  } catch {
    return null
  }
}
