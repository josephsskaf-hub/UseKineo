// Lightweight, non-blocking product event sink.
//
// Body accepts both the legacy `name` field and `event_name`:
//   { name?: string, event_name?: string, metadata?: object, path?: string }
//
// Identity always comes from the Supabase session cookie. The browser cannot
// choose user_id. Writes use the server-only service role so production RLS
// cannot silently discard valid anonymous or authenticated funnel events.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
// KINEO-QUEM-E-GENTE-2026-09-07 (fv-r10) — as três funções já existem e são
// usadas pelo handoff do GPT e pelo episode-link. REUSAR em vez de redigitar:
// duas cópias da mesma regra divergem e a que ninguém audita passa a mentir
// (memória `a-regra-vive-em-varios-arquivos`).
import { clientIp, hashIp, isLikelyBot } from '@/lib/requestIdentity'

export const dynamic = 'force-dynamic'

const SERVER_ONLY_EVENTS = new Set([
  'video_published_v1',
  'video_unpublished_v1',
  'compose_submission_claim',
  'avatar_submission_claim',
  // ═══ KINEO-353A-2026-08-26 ═══════════════════════════════════════════════
  // `cinematic_submission_claim` é a AUTORIDADE do dinheiro: é a linha que diz
  // se um render nasceu, quanto custou e se foi liquidado ou devolvido. Ela
  // estava de fora desta lista — ou seja, qualquer browser podia cunhar uma
  // claim falsa no mesmo `events` que eu uso para reconciliar crédito. Foi
  // essa tabela que usei hoje para provar que o Pedro teve 24 créditos retidos
  // por mais de 2 horas; se ela for forjável, a prova não vale nada.
  //
  // `cinematic_dispatch_result` nasce já protegido: é escrito e AWAITADO
  // dentro da rota, e é ele que passa a guardar o que a Fal respondeu.
  'cinematic_submission_claim',
  'cinematic_dispatch_result',
  'payment_success',
  'checkout_attempted',
  'checkout_auth_required',
  'checkout_started',
  'checkout_failed',
  // KINEO-PAREDE-CHECKOUT-2026-08-16 — os dois lados da morte de um checkout,
  // escritos SÓ pelo webhook da Stripe (app/api/stripe/webhook/route.ts).
  // `checkout_session_expired` = a sessão morreu sem pagamento;
  // `checkout_payment_failed` = o emissor RECUSOU. São remédios opostos
  // (oferta/preço vs. defeito técnico-regulatório), e até hoje deixavam o
  // mesmo rastro. Se o sink do browser pudesse cunhá-los, um burst forjado
  // faria a parede do checkout parecer maior do que é e mandaria a operação
  // consertar o lugar errado — o mesmo estrago de viral_onboarding_viewed.
  'checkout_session_expired',
  'checkout_payment_failed',
  'checkout_payment_failure_enriched',
  // Delayed payment methods finish after the browser has left Checkout. Only
  // the verified Stripe webhook may describe that pending/final state.
  'checkout_payment_pending',
  'checkout_async_payment_failed',
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — written ONLY by the speculativeNoop
  // branch of app/api/stripe/checkout/route.ts when it refuses a prefetch /
  // scanner hit. If the browser sink could mint it, a forged burst would make
  // a real Session-minting incident look like harmless prefetch noise.
  'checkout_prefetch_blocked',
  // KINEO-SCANNER-DENOMINADOR-2026-08-16 — escrito SÓ por recordBotSuspicion()
  // em app/api/stripe/checkout/route.ts. Server-only pelo mesmo motivo do
  // irmão acima, e com um agravante: este evento existe para DECIDIR se um dia
  // barramos requisições na caixa registradora. Se o sink do browser pudesse
  // cunhá-lo, qualquer um forjaria um burst de `ua_absent` acompanhado de
  // compra e provaria, com dado do nosso próprio banco, que o ramo perigoso é
  // seguro de bloquear — o caminho mais curto para nos fazer barrar clientes.
  'checkout_bot_suspected',
  'auth_callback_completed',
  'auth_callback_failed',
  'email_signup_completed',
  'generate_arrived_server',
  'generate_activation_auth_missing',
  // KINEO-AUTOPILOT-299-2026-07-26 — escrito só pelo Server Component de
  // /autopilot. Se o sink do browser pudesse cunhar, um burst forjado infla o
  // TOPO do funil do SKU de $299 e a taxa de conversão passa a mentir pra baixo.
  'autopilot_page_arrived',
  // KINEO-YT-CONNECT-2026-07-26 — os três são escritos SÓ pelo par
  // /api/youtube/auth + /api/youtube/callback. Eles formam o funil inteiro da
  // conexão de canal (denominador, sucesso, falha). Se o sink do browser
  // pudesse cunhá-los, a única métrica que diz se o Autopilot é entregável
  // viraria ficção — e ela é justamente a que estava em ZERO.
  'youtube_connect_started',
  'youtube_connected',
  'youtube_connect_failed',
  // KINEO-REVIVE-2026-07-26 — escritos pelo Server Component /revive/[handle]
  // e pela rota de clique. São outbound frio: o volume de views é o
  // denominador do canal de aquisição inteiro, e um burst forjado esconderia
  // uma campanha morta atrás de números bonitos.
  'revive_page_viewed',
  'revive_cta_clicked',
  // KINEO-BULK-2026-07-27 — o funil dos pacotes de atacado ($99–$379). O par
  // started→completed é a taxa de conversão do PRIMEIRO canal de receita
  // desenhado desta empresa, num histórico de 4 compras avulsas e zero
  // assinaturas. `bulk_checkout_started` é escrito só por
  // app/api/stripe/checkout (depois de a Session existir de verdade) e
  // `bulk_purchase_completed` só pelo webhook, depois de o crédito ser
  // concedido. Se o sink do browser pudesse cunhá-los, um burst forjado inflaria
  // o topo e faria a conversão mentir para baixo — exatamente o estrago de
  // viral_onboarding_viewed (9,7x) e generate_arrived_server (2,7x).
  'bulk_checkout_started',
  'bulk_purchase_completed',
  // KINEO-DODO-2026-09-07 — o trilho UPI/Pix. Escritos só por
  // app/api/dodo/checkout e app/api/dodo/webhook; `payment_success` (com
  // metadata.rail='dodo') já está protegido acima. Se o browser pudesse cunhar
  // `dodo_checkout_started`, o denominador do trilho novo nasceria falso.
  'dodo_checkout_unavailable',
  'dodo_checkout_started',
  'dodo_checkout_failed',
  'dodo_webhook_orphan',
  'dodo_payment_failed',
  'dodo_subscription_revoked',
  // ═══ HOTFIX-EVENTS-LOCKDOWN — 2026-08-26 ═════════════════════════════════
  // A migration irmã fecha a escrita direta pela Data API. Estes nomes também
  // precisam ser recusados neste sink público: são escritos apenas no servidor
  // e lidos como claim, lock, dedupe, alarme ou auditoria financeira.
  'animate_submission_claim',
  'animate_job_submitted',
  'animate_job_settled',
  'supplier_alarm_fired',
  'supplier_alarm_reminder',
  'supplier_alarm_cleared',
  'supplier_burn_projection',
  'storage_capacity_threshold',
  'storage_capacity_projection',
  'cap_hit_sent',
  'admin_credits_granted',
  'blackout_winback_sent',
  'compose_refused',
  'hot_upsell_sent',
  'narration_guard_blocked',
  'oneoff_unlock_emailed',
  'trial_downgraded',
])

export async function POST(req: NextRequest) {
  try {
    // PUSH #29 — local/preview QA must never contaminate the production
    // acquisition funnel when a developer is using production-like env vars.
    // Billing and other server-authoritative events use their own routes; this
    // guard only affects the generic browser event sink.
    const hostname = req.nextUrl.hostname.toLowerCase()
    if (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
      process.env.VERCEL_ENV === 'preview'
    ) {
      return NextResponse.json({ ok: true, ignored: true, stored: false, reason: 'non_production_qa' })
    }

    const body = await req.json().catch(() => ({}))
    const rawName = typeof body?.event_name === 'string'
      ? body.event_name
      : typeof body?.name === 'string'
        ? body.name
        : ''
    const name = rawName.trim().slice(0, 64)
    if (!name) {
      return NextResponse.json({ ok: true, ignored: true, stored: false })
    }
    // These names are authoritative locks/payment facts written only by their
    // server routes. Letting the generic browser sink mint them would corrupt
    // billing recovery and funnel truth.
    if (SERVER_ONLY_EVENTS.has(name)) {
      return NextResponse.json({ ok: true, ignored: true, stored: false })
    }

    const metadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {}
    const path = typeof body?.path === 'string' ? body.path.slice(0, 256) : null
    const sessionId =
      typeof body?.session_id === 'string'
        ? body.session_id.slice(0, 64)
        : null

    let userId: string | null = null
    try {
      const cookieClient = createClient()
      const {
        data: { user },
      } = await cookieClient.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // Expired or malformed cookies must not prevent anonymous funnel data.
    }

    // ═══ KINEO-QUEM-E-GENTE-2026-09-07 (fv-r10) ═════════════════════════════
    // O QUE ESTAVA ERRADO, MEDIDO HOJE: em 07/09, das 21:48 UTC em diante, a
    // casa registrou 3h15 sem UM clique no CTA da landing, sem UM cadastro e
    // sem UM render — com `landing_session_started` ACIMA da média das mesmas
    // horas dos 3 dias anteriores (35 sessões contra 26 na mesma janela de
    // ontem, que rendeu 6 cadastros e 11 renders). Não deu para decidir entre
    // "madrugada magra com tráfego de robô" e "defeito no funil", porque o
    // evento da landing NÃO GRAVA NADA que distinga pessoa de varredor: uma
    // tentativa de contar visitantes distintos por `ip_hash` devolve o número
    // de um campo que não existe — e um `count(distinct)` sobre campo ausente
    // devolve 1, que parece resposta (mesma armadilha registrada no checkpoint
    // #8b desta noite, por outra sessão, três horas antes).
    //
    // O QUE ESTE CARIMBO RESOLVE, e vale para todo evento deste sink: passa a
    // existir (a) um identificador pseudônimo por origem, para contar
    // VISITANTES em vez de SESSÕES, e (b) uma etiqueta de robô. Nenhum dos dois
    // barra ou muda o que quer que seja — só etiqueta (mesmo padrão do
    // episode-link).
    //
    // TRÊS DECISÕES DE PRIVACIDADE, deliberadas:
    //   1. IP CRU NUNCA É GRAVADO. `hashIp` é SHA-256(salt|ip), a MESMA função
    //      que o handoff do GPT já usa — não uma segunda cópia da regra.
    //   2. O USER-AGENT COMPLETO NÃO É GRAVADO. Ele é lido, reduzido a um
    //      booleano e descartado: guardar a string inteira seria impressão
    //      digital de navegador, que esta medição não precisa.
    //   3. AS DUAS CHAVES SÃO RESERVADAS E ESCRITAS DEPOIS do spread do
    //      `metadata` do cliente. O navegador não pode forjá-las — se pudesse,
    //      o carimbo que existe para separar robô de gente seria escrito pelo
    //      próprio robô.
    //   4. O CARIMBO NUNCA PODE IMPEDIR A GRAVAÇÃO. Ler `req.headers.get(...)`
    //      direto derruba a rota inteira quando a requisição não traz
    //      cabeçalhos — e como todo este corpo está dentro de um `try`, o
    //      desfecho seria o pior possível: `ok: true` para o cliente e evento
    //      NÃO gravado, em silêncio. Foi o guardião de segurança que pegou
    //      isto, executando a rota com uma requisição mínima.
    const uaHeader =
      typeof req.headers?.get === 'function' ? req.headers.get('user-agent') : null
    const stampedMetadata: Record<string, unknown> = {
      ...metadata,
      ip_hash: hashIp(clientIp(req.headers)),
      is_bot: isLikelyBot(uaHeader),
    }

    const row: Record<string, unknown> = {
      name,
      user_id: userId,
    }
    row.metadata = stampedMetadata
    if (path) row.path = path
    if (sessionId) row.session_id = sessionId

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[events] Supabase service role is not configured')
      return NextResponse.json({ ok: true, stored: false })
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let { error } = await admin.from('events').insert(row)
    // Preserve compatibility with old environments that only have the
    // original {name, user_id} columns.
    if (error && /column .* does not exist/i.test(error.message ?? '')) {
      const fallback = await admin
        .from('events')
        .insert({ name, user_id: userId })
      error = fallback.error
    }

    if (error) {
      console.error('[events] insert failed:', error.message)
      return NextResponse.json({ ok: true, stored: false })
    }

    return NextResponse.json({ ok: true, stored: true })
  } catch (error) {
    // Analytics must never interrupt the user-facing flow.
    console.error('[events] unexpected failure:', error)
    return NextResponse.json({ ok: true, stored: false })
  }
}
