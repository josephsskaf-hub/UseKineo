// ═══ KINEO-ANUAL-2o-MES-2026-10-08 — autoatendimento: o assinante troca o PRÓPRIO mensal pelo anual, com 30% ═══════
//
// Decisão do fundador (08/10 ~01h BRT): "É o mensal e no segundo mês a gente tenta trocar pro anual. Com desconto de
// 30%." O mensal continua sendo a porta; quem já pagou a 1ª renovação (está no 2º mês ou depois) vê o anual a mensal ×
// 12 × 0,7 ao dólar mais próximo. O e-mail do 2º mês (app/api/cron/send-month2-annual-offer) e a peça da tela
// (components/billing/Month2AnnualOffer.tsx) trazem a pessoa até aqui.
//
//   GET  → o estado para a tela (Month2AnnualStatus): live, eligible e os números da oferta. Só leitura. Visitante,
//          conta sem assinatura Stripe, conta interna, teste e plano fora da escada respondem SEM chamar a Stripe; o
//          resto lê a assinatura viva e as faturas pagas (a renovação é a prova do 2º mês).
//   POST { confirm?: 'SEND', annualAmountUsd?: number, surface?: string }
//          sem confirm = ENSAIO: a prévia da fatura (anual, crédito dos dias não usados, cobrado agora, créditos antes e
//            depois, data do reembolso de 14 dias). Nada gravado — nem no banco, nem na assinatura. Inelegível = 409
//            `not_eligible` com os motivos (códigos), nada gravado.
//          confirm 'SEND' = a TROCA, pelo núcleo único lib/billing/annualSwitchCore.ts (o MESMO update da Stripe, a
//            mesma idempotência, o mesmo razão `plan_switched_to_annual` e a mesma cota do mês da rota do admin). Exige
//            o anual que a pessoa viu na prévia (`annualAmountUsd`): se a regra der outro valor, 409 `price_changed` e
//            nada é cobrado. Cartão recusado = 402 `card_declined`, a assinatura segue mensal.
// SÓ A PRÓPRIA ASSINATURA: o perfil é sempre o do usuário da sessão (nenhum id vem do corpo) e o núcleo confere o dono na
// Stripe (metadata.supabase_user_id e o Customer do perfil).
// INTERRUPTOR: MONTH2_ANNUAL_OFFER_LIVE (lib/billing/month2AnnualOffer.ts). Desligado: GET devolve live:false sem ler
// nada; POST devolve 404 `offer_not_live` antes de qualquer leitura.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ANNUAL_REFUND_DAYS } from '@/lib/checkoutPricing'
import { MONTH2_ANNUAL_OFFER, month2ProfileBlocker } from '@/lib/billing/annualSwitch'
import {
  MONTH2_ANNUAL_OFFER_LIVE,
  MONTH2_ANNUAL_PERCENT_OFF,
  month2Surface,
  type Month2AnnualPreview,
  type Month2AnnualStatus,
} from '@/lib/billing/month2AnnualOffer'
import {
  ANNUAL_SWITCH_PROFILE_COLUMNS,
  evaluateAnnualSwitch,
  runAnnualSwitch,
  type AnnualSwitchOutcome,
  type AnnualSwitchProfile,
} from '@/lib/billing/annualSwitchCore'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const ROUTE_PATH = '/api/stripe/switch-to-annual'

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function closedStatus(reasons: string[], live: boolean = MONTH2_ANNUAL_OFFER_LIVE): Month2AnnualStatus {
  return { live, eligible: false, reasons }
}

export async function GET() {
  if (!MONTH2_ANNUAL_OFFER_LIVE) return NextResponse.json(closedStatus(['offer_not_live'], false))
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(closedStatus(['not_signed_in']))
  const admin = serviceRoleClient()
  if (!admin || !process.env.STRIPE_SECRET_KEY) return NextResponse.json(closedStatus(['unavailable']))
  const { data: profile, error } = await admin.from('profiles').select(ANNUAL_SWITCH_PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
  if (error || !profile) return NextResponse.json(closedStatus(['unavailable']))
  const early = month2ProfileBlocker(profile as unknown as AnnualSwitchProfile)
  if (early) return NextResponse.json(closedStatus([early]))

  const ev = await evaluateAnnualSwitch({ admin, profile: profile as unknown as AnnualSwitchProfile, offer: MONTH2_ANNUAL_OFFER, requirePaidRenewal: true })
  if (ev.state === 'already_switched') return NextResponse.json(closedStatus(['already_switched']))
  if (ev.state !== 'evaluated') return NextResponse.json(closedStatus([ev.reason]))
  if (!ev.eligible || ev.monthlyMinor === null || ev.annualMinor === null || !ev.credits) {
    return NextResponse.json(closedStatus(ev.blockers.length ? ev.blockers.map((b) => b.code) : ['offer_unknown']))
  }
  const status: Month2AnnualStatus = {
    live: true,
    eligible: true,
    reasons: [],
    offer: { id: MONTH2_ANNUAL_OFFER, percentOff: MONTH2_ANNUAL_PERCENT_OFF },
    tier: ev.tier ?? undefined,
    monthlyMinor: ev.monthlyMinor,
    annualMinor: ev.annualMinor,
    twelveMonthsMinor: ev.monthlyMinor * 12,
    creditsPerMonth: ev.credits.perMonthAfter,
    refundDays: ANNUAL_REFUND_DAYS,
  }
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!MONTH2_ANNUAL_OFFER_LIVE) return NextResponse.json({ error: 'offer_not_live', nothing_written: true }, { status: 404 })
  const admin = serviceRoleClient()
  if (!admin || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'unavailable', nothing_written: true }, { status: 503 })

  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown; annualAmountUsd?: unknown; surface?: unknown }
  const send = body.confirm === 'SEND'
  // A troca cobra o que a pessoa VIU: sem o anual da prévia, o SEND nem chega à Stripe.
  if (send && (body.annualAmountUsd === undefined || body.annualAmountUsd === null || body.annualAmountUsd === '')) {
    return NextResponse.json({ error: 'annual_amount_required', nothing_written: true }, { status: 400 })
  }
  const surface = month2Surface(body.surface)

  const { data: profile, error } = await admin.from('profiles').select(ANNUAL_SWITCH_PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
  if (error || !profile) return NextResponse.json({ error: 'unavailable', nothing_written: true }, { status: 503 })
  const early = month2ProfileBlocker(profile as unknown as AnnualSwitchProfile)
  if (early) return NextResponse.json({ error: 'not_eligible', reasons: [early], nothing_written: true }, { status: 409 })

  const outcome = await runAnnualSwitch({
    admin,
    profile: profile as unknown as AnnualSwitchProfile,
    offer: MONTH2_ANNUAL_OFFER,
    send,
    requestedAnnualUsd: body.annualAmountUsd,
    amountOptionalOnDryRun: true,
    requirePaidRenewal: true,
    source: 'self_service_switch_to_annual',
    path: ROUTE_PATH,
    switchedBy: 'self',
    ledgerExtra: { surface },
  })
  const res = selfServiceResponse(outcome, send)
  return NextResponse.json(res.body, { status: res.status })
}

/** O corpo do núcleo é o do admin (metadata, ids, dicas internas). Para a pessoa, só o que a tela usa. */
function selfServiceResponse(outcome: AnnualSwitchOutcome, send: boolean): { status: number; body: Record<string, unknown> } {
  const mode = send ? 'SEND' : 'dry_run'
  switch (outcome.kind) {
    case 'preview': {
      const s = outcome.summary!
      const preview: Month2AnnualPreview = {
        annualUsd: s.annualUsd,
        annualMinor: s.annualMinor,
        monthlyMinor: s.monthlyMinor,
        prorationCreditMinor: s.prorationCreditMinor ?? 0,
        chargedNowMinor: s.chargedNowMinor ?? s.annualMinor,
        creditsPerMonth: s.creditsPerMonth,
        creditsBefore: s.creditsBefore ?? 0,
        creditsAfter: s.creditsAfter ?? s.creditsPerMonth,
        refundUntil: s.refundUntil,
      }
      return { status: 200, body: { ok: true, mode, eligible: true, preview, confirm_with: { confirm: 'SEND', annualAmountUsd: s.annualUsd } } }
    }
    case 'switched': {
      const s = outcome.summary!
      return {
        status: 200,
        body: {
          ok: true,
          mode,
          switched: true,
          result: {
            annualUsd: s.annualUsd,
            annualMinor: s.annualMinor,
            chargedNowMinor: s.chargedNowMinor,
            creditsAfter: s.creditsAfter,
            creditsGranted: s.creditsGranted,
            refundUntil: s.refundUntil,
            firstRefillAt: s.firstRefillAt,
          },
        },
      }
    }
    case 'not_ready':
    case 'blocked':
      return { status: 409, body: { error: 'not_eligible', mode, reasons: (outcome.blockers ?? []).map((b) => b.code), nothing_written: true } }
    case 'no_subscription':
    case 'not_owner':
      return { status: 409, body: { error: 'not_eligible', mode, reasons: [String(outcome.body.error ?? outcome.kind)], nothing_written: true } }
    case 'already_switched':
      return { status: 409, body: { error: 'already_switched', mode, nothing_charged_now: true } }
    case 'amount_mismatch':
      return { status: 409, body: { error: 'price_changed', mode, expected_annual_usd: outcome.expectedUsd ?? null, nothing_written: true } }
    case 'update_failed':
      return outcome.status === 402
        ? { status: 402, body: { error: 'card_declined', mode, nothing_written: true } }
        : { status: 502, body: { error: 'switch_failed', mode, nothing_written: true } }
    case 'preview_failed':
      return { status: 502, body: { error: 'preview_failed', mode, nothing_written: true } }
    case 'product_inactive':
    case 'product_failed':
    case 'ledger_read_failed':
    case 'stripe_read_failed':
    default:
      return { status: outcome.status >= 500 ? 502 : 409, body: { error: 'unavailable', mode, nothing_written: true } }
  }
}
