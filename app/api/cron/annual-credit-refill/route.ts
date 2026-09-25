// KINEO-ANUAL-RECARGA-MENSAL-2026-09-24 — cron diário: a assinatura ANUAL recebe
// créditos todo mês, como o FAQ do /pricing sempre prometeu.
//
// POR QUÊ (análise de 23/09; decisão do fundador em 24/09: "recarga mensal"): a
// fatura anual é uma por ano e o webhook concedia TIER_CREDITS em
// invoice.payment_succeeded — uma vez a cada 12 meses — enquanto o FAQ dizia
// "Credits reset each month (no rollover)". Zero vendas anuais na vida até aqui,
// então não há ninguém para reparar; a partir de agora a promessa é verdadeira.
//
// O QUE FAZ, por assinatura ativa com preço de intervalo 'year':
//   1. calcula os meses 1..11 já vencidos desde current_period_start (o mês 0
//      veio com a fatura; o 12 é a próxima fatura) — lib/billing/annualRefill;
//   2. para cada mês vencido sem razão, grava UMA linha em `events`
//      (id determinístico = sha256 da chave assinatura+período+mês → a segunda
//      rodada bate em 23505 e não concede duas vezes), faz o SET do saldo no
//      perfil (nunca soma: "no rollover", igual à renovação mensal do webhook)
//      e marca a linha como granted.
// GUARDAS (espelho do webhook): perfil precisa existir, não ser conta interna,
// e a assinatura do perfil precisa ser ESTA (uma anual antiga superada por
// outra assinatura não reseta o saldo da nova).
// DRY-RUN por padrão; só escreve com ?confirm=SEND (o vercel.json agenda COM o
// token — lição de 01/09: dois crons dormiram 30 dias sem ele).
import { NextRequest, NextResponse } from 'next/server'
import { renewalBalance } from '@/lib/credits/renewalBalance' // KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import {
  ANNUAL_REFILL_EVENT,
  ANNUAL_REFILL_VERSION,
  annualRefillCinematicTokens,
  annualRefillCredits,
  annualRefillDueAt,
  annualRefillDueMonths,
  annualRefillEventKey,
  annualTierFromMetadata,
} from '@/lib/billing/annualRefill'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Teto por rodada: o cron é diário e a base anual é pequena; um dia de atraso vale menos que um laço. */
const MAX_GRANTS_PER_RUN = 50

type Skip = { subscription: string; user?: string; month?: number; why: string }
type Grant = { subscription: string; user: string; tier: string; month: number; credits: number; due_at: string }

function eventIdFor(key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const write = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'Supabase admin env missing' }, { status: 500 })
  const supabase = createAdminClient(url, serviceKey, { auth: { persistSession: false } })

  const now = Date.now()
  const planned: Grant[] = []
  const granted: Grant[] = []
  const skipped: Skip[] = []
  let scanned = 0
  let annual = 0
  let grants = 0

  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    scanned++
    const yearly = sub.items.data.find((item) => item.price?.recurring?.interval === 'year')
    if (!yearly) continue
    annual++
    const tier = annualTierFromMetadata(sub.metadata?.tier)
    const userId = (sub.metadata?.supabase_user_id ?? '').trim()
    if (!tier) { skipped.push({ subscription: sub.id, why: 'tier_without_annual_plan' }); continue }
    if (!UUID.test(userId)) { skipped.push({ subscription: sub.id, why: 'no_user_id' }); continue }
    const periodStart = sub.current_period_start
    const due = annualRefillDueMonths(periodStart, now)
    if (due.length === 0) continue
    const credits = annualRefillCredits(tier, yearly.price?.unit_amount ?? null, yearly.price?.currency ?? sub.currency ?? 'usd')

    for (const month of due) {
      if (grants >= MAX_GRANTS_PER_RUN) { skipped.push({ subscription: sub.id, user: userId, month, why: 'run_cap' }); break }
      const id = eventIdFor(annualRefillEventKey(sub.id, periodStart, month))
      const dueAt = new Date(annualRefillDueAt(periodStart, month)).toISOString()
      const { data: existing, error: existingError } = await supabase.from('events').select('id, metadata').eq('id', id).maybeSingle()
      if (existingError) { skipped.push({ subscription: sub.id, user: userId, month, why: `ledger_read:${existingError.code}` }); continue }
      const alreadyGranted = Boolean((existing?.metadata as Record<string, unknown> | null)?.granted)
      if (alreadyGranted) continue
      const grant: Grant = { subscription: sub.id, user: userId, tier, month, credits, due_at: dueAt }
      if (!write) { planned.push(grant); continue }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, plan, stripe_subscription_id, video_credits')
        .eq('id', userId)
        .maybeSingle()
      if (profileError || !profile) { skipped.push({ ...grant, why: 'no_profile' }); continue }
      if (isInternalEmail(profile.email)) { skipped.push({ ...grant, why: 'internal_account' }); continue }
      if (profile.stripe_subscription_id && profile.stripe_subscription_id !== sub.id) { skipped.push({ ...grant, why: 'superseded_subscription' }); continue }

      const metadata = {
        source: 'cron',
        version: ANNUAL_REFILL_VERSION,
        stripe_subscription_id: sub.id,
        tier,
        credits,
        month_index: month,
        period_start: new Date(periodStart * 1000).toISOString(),
        due_at: dueAt,
        granted: false,
      }
      if (!existing) {
        const { error: insertError } = await supabase.from('events').insert({
          id,
          name: ANNUAL_REFILL_EVENT,
          user_id: userId,
          path: '/api/cron/annual-credit-refill',
          session_id: null,
          metadata,
        })
        // 23505 = outra rodada gravou o razão no mesmo instante; ela conclui o grant.
        if (insertError) { skipped.push({ ...grant, why: insertError.code === '23505' ? 'ledger_race' : `ledger_write:${insertError.code}` }); continue }
      }
      // KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25 — a mesma regra da renovação mensal do webhook: a cota do
      // plano zera (sem rollover), o que passa de uma cota (comprado/dado) sobrevive.
      const renovacao = renewalBalance(profile.video_credits, credits)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ video_credits: renovacao.balance, is_pro: true, plan: tier, cinematic_tokens: annualRefillCinematicTokens(tier) })
        .eq('id', userId)
      if (updateError) {
        // O razão fica granted:false: a próxima rodada tenta de novo em vez de perder o mês.
        skipped.push({ ...grant, why: `grant_write:${updateError.code}` })
        continue
      }
      await supabase.from('events').update({ metadata: { ...metadata, granted: true, granted_at: new Date().toISOString() } }).eq('id', id)
      grants++
      granted.push(grant)
      console.log(`[annual-credit-refill] ${tier} month ${month} → ${credits} cr → user ${userId} (${sub.id})`)
    }
  }

  return NextResponse.json({
    mode: write ? 'SEND' : 'dry_run',
    version: ANNUAL_REFILL_VERSION,
    scanned,
    annual,
    planned: write ? undefined : planned,
    granted,
    skipped,
  })
}
