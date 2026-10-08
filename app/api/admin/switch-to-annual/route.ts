// ═══ KINEO-TROCA-ANUAL-2026-10-07 — cumprir a oferta "troque para o anual" dos primeiros assinantes ═══════════════
//
// POST /api/admin/switch-to-annual { userId, annualAmountUsd, confirm }
//
// POR QUE EXISTE: em 05/10 o fundador ofereceu a 9 assinantes mensais o anual com 40% de desconto — "just reply YES
// and I'll switch your subscription myself". O primeiro SIM chegou em 07/10 e não havia como cumprir: o
// /api/stripe/change-plan recusa anual (409 annual_needs_support) e trocar à mão no painel da Stripe não carimba a
// metadata que o cron da recarga anual e o webhook leem. Regra pura, valores e porquês: lib/billing/annualSwitch.ts.
// Passo a passo e estorno: docs/TROCA-ANUAL-PRIMEIROS-ASSINANTES-2026-10-07.md.
//
// COMO FUNCIONA (uma pessoa por chamada, só admin logado):
//   · sem confirm='SEND' é ENSAIO: lê o perfil e a assinatura, aplica a regra do valor, mostra o que bloquearia, pede
//     à Stripe a PRÉVIA da fatura (crédito do mês já pago + o que seria cobrado agora) e devolve a metadata que seria
//     gravada. Nenhuma escrita: nem na Stripe, nem no banco.
//   · confirm='SEND': troca o ITEM da assinatura para price_data anual (o mesmo jeito do change-plan, sem Price de
//     painel; o Product é o da casa, kineo_plan_<tier>), proration 'always_invoice' + billing_cycle_anchor 'now' (cobra
//     AGORA o ano novo menos o mês já pago) e payment_behavior 'error_if_incomplete' (cartão recusado = a Stripe não
//     troca nada e devolve 402). Depois grava o evento plan_switched_to_annual (o razão) e, só com o razão gravado, o
//     perfil: plano, ids e a COTA DO MÊS DA TROCA pela régua da renovação (renewalBalance: a cota reinicia, o comprado
//     acima de uma cota sobrevive). O ano pago começa na troca e o resto do mês mensal volta em dinheiro (rateio): sem
//     esta cota a pessoa passaria o 1º mês do ano sem crédito novo (o cron só solta os meses 1..11, a partir de +1 mês).
//   · idempotente: o razão tem id determinístico por assinatura e nasce ANTES da concessão (sem razão, nada é
//     concedido; com razão, no máximo uma vez). A 2ª execução responde "já trocada" sem chamar a Stripe; concessão que
//     ficou pendente é refeita só se o saldo ainda é o de antes (compare-and-set). Se o razão faltar mas a assinatura
//     já estiver anual com o selo desta ferramenta, o SEND só completa o registro, sem cobrar; e a chamada de troca
//     leva chave de idempotência da Stripe (janela de 10 min).
//   · falha da Stripe = nada gravado e erro claro (tipo, código, motivo da recusa).
//
// KINEO-ANUAL-NUCLEO-2026-10-08 — a troca (passos 4 a 10: razão, assinatura viva, bloqueios, regra do valor, Product da
// casa, prévia, update na Stripe, razão e cota do mês) saiu daqui para lib/billing/annualSwitchCore.ts, SEM mudar uma
// vírgula do comportamento desta rota: o autoatendimento da oferta do 2º mês (app/api/stripe/switch-to-annual, 30%)
// cobra pelo MESMO update da Stripe. Esta rota continua dona do que é dela: só admin, uma pessoa por chamada, a oferta de
// 05/10 (40%) e o valor do e-mail exigido também no ensaio. O guardião scripts/test-troca-anual-2026-10-07.mjs segue
// executando esta rota inteira (com o núcleo) e muta o núcleo onde a regra mora.
//
// SEM CRON DE PROPÓSITO: cada execução cobra o cartão de um cliente e exige o "vai" do fundador para AQUELA pessoa.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { ANNUAL_SWITCH_OFFER } from '@/lib/billing/annualSwitch'
import { ANNUAL_SWITCH_PROFILE_COLUMNS, runAnnualSwitch, type AnnualSwitchProfile } from '@/lib/billing/annualSwitchCore'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const ROUTE_PATH = '/api/admin/switch-to-annual'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  // ── 1. só admin ──────────────────────────────────────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })

  // ── 2. pedido ────────────────────────────────────────────────────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as { userId?: unknown; annualAmountUsd?: unknown; confirm?: unknown }
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!UUID.test(userId)) return NextResponse.json({ error: 'invalid_user_id', hint: 'userId = profiles.id (uuid).' }, { status: 400 })
  const send = body.confirm === 'SEND'

  // ── 3. perfil ────────────────────────────────────────────────────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(ANNUAL_SWITCH_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'profile_read_failed', detail: profileError.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })

  // ── 4 a 10. a troca: o núcleo único (lib/billing/annualSwitchCore.ts), com a oferta de 05/10 ────────────────────────
  const outcome = await runAnnualSwitch({
    admin,
    profile: profile as unknown as AnnualSwitchProfile,
    offer: ANNUAL_SWITCH_OFFER,
    send,
    requestedAnnualUsd: body.annualAmountUsd,
    amountOptionalOnDryRun: false,
    requirePaidRenewal: false,
    source: 'admin_switch_to_annual',
    path: ROUTE_PATH,
    switchedBy: user.email ?? 'admin',
  })
  return NextResponse.json(outcome.body, { status: outcome.status })
}
