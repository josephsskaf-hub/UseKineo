// KINEO-KINEO1-FORA-2026-09-29 — os fatos de LEGADO que decidem quem continua vendo o Kineo 1 depois que ele saiu
// do catálogo público (lib/engineLaunch.ts: KINEO1_PUBLIC=false, kineo1Visible). Fundador (29/09): "deixar dentro do
// sistema dessas contas que já pagam esse motor que eles usam".
//
// Só servidor: lê com a service key porque `events` é fechada (RLS, só service_role — ver CLAUDE.md, 26-27/08).
// Leitura pura, escopada pelo user_id que o CHAMADOR já verificou na sessão; nunca aceita id vindo do cliente.
//   usedFast   = a conta tem ≥ 1 filme 'fast' CONCLUÍDO, em qualquer data (sem janela de 90 d: o fundador quer
//                manter para quem usa, e um pagante que usou em junho continua sendo quem usa);
//   boughtPack = a conta tem payment_success com metadata.pack começando por 'bulk' (BULK_PACKS é vendido em filmes
//                Kineo 1 — lib/checkoutPricing.ts, metadata.pack gravado pelo webhook da Stripe) OU igual ao passe do
//                Studio Ads (ADS_PASS_ID, lib/ads/offer.ts): o recibo da Stripe do passe usa minutesLine, que lista o
//                Kineo 1 primeiro (lib/credits/creditMinutes.ts) — correção M5 do cético, conserto da revisão E1.
// Quem chama (resolveKineo1Flag, lib/engineLaunch.ts) só chega aqui com has_paid === true.
// Falha de leitura NÃO vira "tem legado": devolve false nos dois eixos e ok=false, para quem consumir (E2b) poder
// distinguir "não tem" de "não consegui ler" em vez de esconder o erro como vazio (lição do JWT-skew, 28/08).
// NESTA entrega (E1) os consumidores (/api/me/credits e /studio/create) só expõem o resultado; ninguém muda
// comportamento com ele ainda.
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { ADS_PASS_ID } from '@/lib/ads/offer'

export interface Kineo1AccessFacts {
  usedFast: boolean
  boughtPack: boolean
  /** false quando alguma das duas leituras falhou (os eixos ficam false, nunca inventados). */
  ok: boolean
}

export const KINEO1_ACCESS_NONE: Kineo1AccessFacts = { usedFast: false, boughtPack: false, ok: false }

/** Prefixo do metadata.pack dos pacotes avulsos (BulkPackId = 'bulk10' | 'bulk20' | …). */
export const KINEO1_BULK_PACK_PREFIX = 'bulk'

function kineo1AdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Mesmo override do lib/reverseTrial.ts: no Next 14.2 o GET idêntico cairia no Data Cache e leria o banco velho.
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

/** Núcleo com o cliente injetado (os guardiões passam um cliente falso). */
export async function resolveKineo1Access(db: SupabaseClient | null, userId: string | null | undefined): Promise<Kineo1AccessFacts> {
  if (!db || typeof userId !== 'string' || userId.length === 0) return KINEO1_ACCESS_NONE
  try {
    const [films, packs, adsPass] = await Promise.all([
      db
        .from('videos')
        .select('id')
        .eq('user_id', userId)
        .eq('quality_mode', 'fast')
        .eq('status', 'completed')
        .limit(1),
      db
        .from('events')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'payment_success')
        .like('metadata->>pack', `${KINEO1_BULK_PACK_PREFIX}%`)
        .limit(1),
      db
        .from('events')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'payment_success')
        .eq('metadata->>pack', ADS_PASS_ID)
        .limit(1),
    ])
    const usedFast = !films.error && Array.isArray(films.data) && films.data.length > 0
    const boughtPack =
      (!packs.error && Array.isArray(packs.data) && packs.data.length > 0) ||
      (!adsPass.error && Array.isArray(adsPass.data) && adsPass.data.length > 0)
    if (films.error || packs.error || adsPass.error) {
      console.warn(`[kineo1-access] read failed user=${userId.slice(0, 8)}:`, films.error?.message ?? packs.error?.message ?? adsPass.error?.message)
    }
    return { usedFast, boughtPack, ok: !films.error && !packs.error && !adsPass.error }
  } catch (e) {
    console.warn(`[kineo1-access] read threw user=${userId.slice(0, 8)}:`, e instanceof Error ? e.message : String(e))
    return KINEO1_ACCESS_NONE
  }
}

/** Fatos de legado do Kineo 1 para um user_id já autenticado pelo chamador. */
export function readKineo1Access(userId: string | null | undefined): Promise<Kineo1AccessFacts> {
  return resolveKineo1Access(kineo1AdminClient(), userId)
}
