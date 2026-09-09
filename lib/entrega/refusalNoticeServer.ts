// ═══ KINEO-RECUSA-QUE-NINGUEM-LEU-2026-09-09 (metade servidor) ═════════════
//
// Lê os fatos crus da recusa e devolve o aviso já decidido. Fica SEPARADO de
// `refusalNotice.ts` de propósito: aquele arquivo carrega só a decisão pura e
// o tipo, e é importado pelo `GenerateClient` (componente de cliente). Se o
// cliente do service role morasse lá, `@supabase/supabase-js` + a chave de
// serviço entrariam no bundle do navegador — o mesmo tipo de vazamento que a
// memória `tsc-nao-ve-a-fronteira-servidor-cliente` registra: `tsc` fica verde
// e o build da Vercel (ou pior, a chave) é que paga.
//
// `public.events` está FECHADA para `authenticated` desde 26/08 (migrations
// events_lockdown_service_role_only): ler a recusa exige service role. Todas
// as leituras são do PRÓPRIO usuário já verificado pela página.
import { createClient } from '@supabase/supabase-js'
import {
  decidirAvisoDeRecusa,
  type RefusalFacts,
  type RefusalNotice,
} from '@/lib/entrega/refusalNotice'

/**
 * Best-effort integral: qualquer tropeço devolve `null` e a tela de criar
 * segue idêntica ao que era. Um aviso perdido é barato; uma tela de criação
 * que não abre é o produto inteiro.
 */
export async function lerAvisoDeRecusa(
  userId: string,
  agoraMs: number = Date.now(),
): Promise<RefusalNotice | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return null
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: bloqueio } = await admin
      .from('events')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .eq('name', 'narration_guard_blocked')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!bloqueio) return null

    const blockedAt = String((bloqueio as { created_at: string }).created_at)
    const meta = ((bloqueio as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<
      string,
      unknown
    >

    // As duas perguntas que decidem o silêncio. Feitas em paralelo porque são
    // independentes e esta página é `force-dynamic` — cada ida ao banco aqui é
    // latência na tela mais quente do produto.
    const [{ count: telas }, { count: filmes }] = await Promise.all([
      admin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('name', 'generation_failed_screen_shown')
        .gt('created_at', blockedAt),
      admin
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gt('created_at', blockedAt),
    ])

    const fatos: RefusalFacts = {
      blockedAt,
      speechSeconds: Number(meta.speech_seconds) || 0,
      targetSeconds: Number(meta.target_seconds) || 0,
      missingWords: Number(meta.missing_words) || 0,
      // Tri-estado de propósito. `true`/`false` só quando o evento DIZ; campo
      // ausente (bloqueio anterior a 02/09) vira `null`, e aí a frase "nothing
      // was charged" simplesmente não aparece em vez de ser chutada.
      charged: typeof meta.charged === 'boolean' ? meta.charged : null,
      sawScreenAfter: (telas ?? 0) > 0,
      completedVideoAfter: (filmes ?? 0) > 0,
    }
    return decidirAvisoDeRecusa(fatos, agoraMs)
  } catch {
    return null
  }
}
