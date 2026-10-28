// KINEO-ADS-SIMPLES-2810 — a leitura (chave de serviço) da régua ÚNICA de elegibilidade do Studio Ads (lib/ads/eligibilityPure.ts).
// Quem pergunta: /ads/v2 (page.tsx), a porta /ads, GET /api/ads/v2/eligibility (cards da home e CTA do UGC), /api/ads/v2/link-import.
// O que lê, nesta ordem e TUDO falha fechada: o livro-razão da Escolha (ads_escolha_samples: usou?), o perfil (trial_status,
// signup_country, last_country), o auth (e-mail VERIFICADO e email_confirmed_at) e o livro do dia (ads_escolha_sample_days).
// Nunca escreve nada. Quem RESERVA a amostra continua sendo reserveEscolhaSample (RPC) — esta função só diz o estado.
import type { SupabaseClient } from '@supabase/supabase-js'
import { adsGate } from '@/lib/ads/serverAccess'
import type { AdsAccessReason } from '@/lib/ads/access'
import { adsSampleTrialStatusBlocked } from '@/lib/ads/sample'
import { isDisposableEmail } from '@/lib/emailValidation'
import { ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS, ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS, ADS_ESCOLHA_SAMPLE_LIVE } from '@/lib/ads/cena/escolhaSamplePolicy'
import { adsEligibilityDecide, adsSampleCapResetIso, adsSampleCountry, type AdsEligibilityDecision } from '@/lib/ads/eligibilityPure'

export interface AdsEligibility extends AdsEligibilityDecision {
  gate: 'ok' | 'no_access' | 'closed'
  access: AdsAccessReason
  /** o pedido da amostra já usada (ads_escolha_samples.order_id), para a tela reabrir o resultado */
  sampleOrderId: string | null
  sampleDelivered: boolean
  /** quando o teto do dia reabre (só com reason 'budget_exhausted_today') */
  resetAt: string | null
  /** o melhor sinal de país que decidiu (null = nenhum) */
  country: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

/** O país do perfil para a amostra: pedido atual → last_country → signup_country (fail-closed em adsSampleCountryAllowed). */
export async function loadAdsSampleCountry(admin: SupabaseClient, userId: string, requestCountry: string | null | undefined): Promise<string | null> {
  try {
    const prof = await admin.from('profiles').select('signup_country, last_country').eq('id', userId).maybeSingle()
    const row = (prof.data as { signup_country?: unknown; last_country?: unknown } | null) ?? null
    return adsSampleCountry([requestCountry, prof.error ? null : row?.last_country, prof.error ? null : row?.signup_country])
  } catch {
    return adsSampleCountry([requestCountry])
  }
}

export async function loadAdsEligibility(admin: SupabaseClient, user: { id: string }, access: AdsAccessReason, opts: { requestCountry?: string | null } = {}): Promise<AdsEligibility> {
  const gate = adsGate(access)
  const base = { gate, access, sampleOrderId: null as string | null, sampleDelivered: false, resetAt: null as string | null, country: null as string | null }
  if (gate === 'ok') return { state: 'paid', reason: null, ...base }
  if (!UUID.test(user.id)) return { state: 'not_eligible', reason: 'ledger_unavailable', ...base }
  let used: boolean | null = null
  try {
    const r = await admin.from('ads_escolha_samples').select('order_id, delivered_at').eq('actor_id', user.id).maybeSingle()
    if (!r.error) {
      const row = (r.data as { order_id?: unknown; delivered_at?: unknown } | null) ?? null
      used = !!row
      if (row && typeof row.order_id === 'string') base.sampleOrderId = row.order_id
      base.sampleDelivered = !!row && typeof row.delivered_at === 'string'
    }
  } catch { used = null }
  if (used !== false) return { ...adsEligibilityDecide({ gate, sampleLive: ADS_ESCOLHA_SAMPLE_LIVE, used, emailConfirmed: true, disposable: false, trialBlocked: false, country: null, reservedCentsToday: 0, dailyCapCents: ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS, estimateCents: ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS }), ...base }

  let emailConfirmed = false, disposable = true, trialBlocked = true
  try {
    const [auth, prof] = await Promise.all([admin.auth.admin.getUserById(user.id), admin.from('profiles').select('trial_status, signup_country, last_country').eq('id', user.id).maybeSingle()])
    const u = auth.error ? null : auth.data?.user ?? null
    emailConfirmed = !!u?.email && typeof u.email_confirmed_at === 'string' && Number.isFinite(Date.parse(u.email_confirmed_at))
    disposable = !u?.email || isDisposableEmail(u.email)
    const row = (prof.data as { trial_status?: unknown; signup_country?: unknown; last_country?: unknown } | null) ?? null
    trialBlocked = !!prof.error || adsSampleTrialStatusBlocked(row?.trial_status)
    base.country = adsSampleCountry([opts.requestCountry, prof.error ? null : row?.last_country, prof.error ? null : row?.signup_country])
  } catch { /* falha fechada: os padrões acima já barram */ }

  let reservedCentsToday: number | null = null
  try {
    const day = new Date().toISOString().slice(0, 10)
    const d = await admin.from('ads_escolha_sample_days').select('reserved_cents').eq('request_day', day).maybeSingle()
    if (!d.error) { const n = Number((d.data as { reserved_cents?: unknown } | null)?.reserved_cents ?? 0); reservedCentsToday = Number.isFinite(n) ? n : null }
  } catch { reservedCentsToday = null }

  const decision = adsEligibilityDecide({ gate, sampleLive: ADS_ESCOLHA_SAMPLE_LIVE, used, emailConfirmed, disposable, trialBlocked, country: base.country, reservedCentsToday, dailyCapCents: ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS, estimateCents: ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS })
  return { ...decision, ...base, resetAt: decision.reason === 'budget_exhausted_today' ? adsSampleCapResetIso() : null }
}
