// KINEO-REVERSE-TRIAL-P1-2026-08-06 — REVERSE TRIAL, FASE 1 (fundação).
//
// TODO comportamento novo deste arquivo está atrás de UMA flag de ambiente:
//
//   KINEO_REVERSE_TRIAL_ENABLED === 'true'   (default: OFF)
//
// Com a flag OFF (o estado de produção nesta fase) NENHUM caminho novo executa:
// - a ativação no signup retorna antes de qualquer leitura;
// - isTrialActive() retorna false para qualquer perfil;
// - recordReverseTrialDebit() retorna antes de qualquer leitura.
// O free tier atual (FREE_FAST_PREVIEW_LIMIT = 3/24h) NÃO é tocado aqui — a
// troca atômica do free tier + copy é FASE 2.
//
// O QUE O TRIAL É (spec aprovada pelo fundador em 06/08):
// - Novo perfil (flag ON) nasce com trial_status='active' e trial_ends_at =
//   now + 3 ou 7 dias (A/B 50/50 por hash determinístico do user_id, gravado
//   em trial_variant). SEM tocar em Stripe.
// - Durante o trial: mesmos direitos do CREATOR, EXCETO os motores Studio
//   (Kling / Veo / Hollywood) — NUNCA Studio no trial.
// - HARD CAP de 60 créditos NO BACKEND: todo débito de crédito de uma conta em
//   trial soma em trial_credits_used; ao atingir 60 o trial expira na hora
//   (trial_status='expired'), mesmo antes do dia 3/7.
// - Expiração PASSIVA: isTrialActive() decide em toda leitura — nada depende
//   de cron (o cron de downgrade formal é FASE 2).
// - 1 trial por conta, PARA SEMPRE: trial_status não-nulo nunca é reativado.
//
// ⚠️ DECISÃO ABERTA PARA A FASE 2 (registrada, NÃO implementada — máximo rigor
// em crédito): a ativação NÃO concede video_credits. Um perfil novo nasce com
// 0 créditos (handle_new_user), então com a flag ON o trial dá o DIREITO de
// usar os motores pagos, mas o usuário só consegue debitar se tiver saldo.
// Antes de ligar a flag, o CEO decide o grant do trial (sugestão natural: 60,
// o próprio cap). Conceder crédito é decisão de dinheiro, não de fundação.

import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'

// Mesmo idioma de flag dos crons de lifecycle (KINEO_LIFECYCLE_EMAILS_ENABLED):
// igualdade estrita com 'true'. Qualquer outro valor (ausente, '1', 'yes') = OFF.
export const REVERSE_TRIAL_ENABLED = process.env.KINEO_REVERSE_TRIAL_ENABLED === 'true'

/** Hard cap de créditos que um trial pode consumir, imposto no servidor. */
export const TRIAL_CREDIT_CAP = 60

export type TrialVariant = '3d' | '7d'

const TRIAL_VARIANT_DAYS: Record<TrialVariant, number> = { '3d': 3, '7d': 7 }

// Anti-abuso mínimo desta fase: domínios descartáveis bloqueados na ativação.
// Tokens sem ponto casam por substring do domínio (pega mailinator.com,
// team.mailinator.net etc.); tokens com ponto casam o domínio exato ou
// subdomínios. minitts.net e dysonc.com já apareceram na nossa base.
const DISPOSABLE_EMAIL_TOKENS = [
  'mailinator',
  'guerrillamail',
  '10minutemail',
  'tempmail',
  'yopmail',
  'sharklasers',
  'minitts.net',
  'dysonc.com',
] as const

export function isDisposableEmail(email: string | null | undefined): boolean {
  const at = (email ?? '').toLowerCase().trim().lastIndexOf('@')
  if (at < 0) return false
  const domain = (email ?? '').toLowerCase().trim().slice(at + 1)
  if (!domain) return false
  return DISPOSABLE_EMAIL_TOKENS.some((token) =>
    token.includes('.')
      ? domain === token || domain.endsWith('.' + token)
      : domain.includes(token),
  )
}

/**
 * A/B determinístico 50/50 pelo user_id (UUID): FNV-1a de 32 bits sobre a
 * string. O mesmo usuário SEMPRE cai na mesma variante — reprocessar o signup
 * nunca troca o braço do experimento.
 */
export function trialVariantFor(userId: string): TrialVariant {
  let hash = 0x811c9dc5
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 2 === 0 ? '3d' : '7d'
}

/** Campos de trial como saem de um select em profiles (tolerante a tipo). */
export interface TrialProfileFields {
  trial_status?: unknown
  trial_ends_at?: unknown
  trial_credits_used?: unknown
}

/**
 * A VERDADE ÚNICA sobre "este perfil está em trial ativo?". Usada em TODOS os
 * checks de entitlement — a expiração é passiva: passou de trial_ends_at ou
 * bateu no cap de 60, isto retorna false na mesma request, sem esperar cron.
 * Com a flag OFF retorna false para qualquer entrada (nenhum caminho novo).
 */
export function isTrialActive(
  profile: TrialProfileFields | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!REVERSE_TRIAL_ENABLED) return false
  if (!profile || profile.trial_status !== 'active') return false
  const endsRaw = profile.trial_ends_at
  const ends = typeof endsRaw === 'string' ? Date.parse(endsRaw) : NaN
  if (!Number.isFinite(ends) || now >= ends) return false
  const used = typeof profile.trial_credits_used === 'number' ? profile.trial_credits_used : 0
  return used < TRIAL_CREDIT_CAP
}

// Service-role client (mesmo padrão de lib/credits/renderIntent.ts): a
// contabilidade do trial não pode depender de RLS do usuário logado.
function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[reverse-trial] service-role env missing — reverse trial disabled')
    return null
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Ativação no signup. Chamada de /api/track-signup-source (o único touchpoint
 * server-side que TODOS os fluxos de signup já chamam). Nunca lança.
 *
 * Guardas, nesta ordem:
 *   1. flag OFF → no-op absoluto;
 *   2. perfil precisa ser NOVO (user.created_at < 24h) — sem isto, ligar a
 *      flag daria trial retroativo a toda a base no próximo login;
 *   3. e-mail descartável → nunca ativa;
 *   4. trial_status não-nulo → NUNCA reativa (1 trial por conta, para sempre);
 *   5. conta paga (plan pago ou has_paid) → não precisa de trial;
 *   6. o UPDATE carrega `is('trial_status', null)` — corrida entre duas
 *      requests de signup não cria dois trials nem sobrescreve um expirado.
 */
export async function maybeActivateReverseTrial(args: {
  userId: string
  email: string | null | undefined
  userCreatedAt: string | null | undefined
}): Promise<{ activated: boolean; reason: string }> {
  if (!REVERSE_TRIAL_ENABLED) return { activated: false, reason: 'flag_off' }
  try {
    const createdAt = typeof args.userCreatedAt === 'string' ? Date.parse(args.userCreatedAt) : NaN
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      return { activated: false, reason: 'not_new_signup' }
    }
    if (isDisposableEmail(args.email)) {
      console.warn(`[reverse-trial] disposable email blocked user=${args.userId.slice(0, 8)}`)
      return { activated: false, reason: 'disposable_email' }
    }
    const db = adminClient()
    if (!db) return { activated: false, reason: 'no_admin_client' }

    const { data: profile, error: readErr } = await db
      .from('profiles')
      .select('trial_status, plan, has_paid')
      .eq('id', args.userId)
      .maybeSingle()
    if (readErr) {
      console.error('[reverse-trial] activation profile read failed:', readErr.message)
      return { activated: false, reason: 'read_error' }
    }
    if (!profile) return { activated: false, reason: 'no_profile' }
    if (profile.trial_status !== null && profile.trial_status !== undefined) {
      return { activated: false, reason: 'trial_already_used' }
    }
    const plan = ((profile as { plan?: string | null }).plan ?? 'free').toLowerCase()
    if ((plan !== 'free' && plan !== '') || (profile as { has_paid?: boolean }).has_paid === true) {
      return { activated: false, reason: 'already_paid' }
    }

    const variant = trialVariantFor(args.userId)
    const endsAt = new Date(Date.now() + TRIAL_VARIANT_DAYS[variant] * 24 * 60 * 60 * 1000).toISOString()
    // NOTA FASE 2: nenhum video_credits é concedido aqui — ver o bloco
    // "DECISÃO ABERTA" no topo do arquivo.
    const { data: updated, error: updateErr } = await db
      .from('profiles')
      .update({ trial_status: 'active', trial_ends_at: endsAt, trial_variant: variant })
      .eq('id', args.userId)
      .is('trial_status', null)
      .select('id')
    if (updateErr) {
      console.error('[reverse-trial] activation update failed:', updateErr.message)
      return { activated: false, reason: 'update_error' }
    }
    if (!updated || updated.length === 0) {
      // Outra request ativou primeiro — idempotente, não é erro.
      return { activated: false, reason: 'lost_race' }
    }
    console.log(`[reverse-trial] ACTIVATED user=${args.userId.slice(0, 8)} variant=${variant} ends=${endsAt}`)
    return { activated: true, reason: variant }
  } catch (e) {
    console.error('[reverse-trial] activation threw:', e instanceof Error ? e.message : String(e))
    return { activated: false, reason: 'threw' }
  }
}

/**
 * Contabilidade do HARD CAP, chamada pelo ponto único de débito
 * (lib/credits/debit.ts) DEPOIS de um debit_video_credits bem-sucedido.
 * Soma o custo em trial_credits_used quando a conta está em trial 'active';
 * ao atingir 60 (ou se o relógio já passou de trial_ends_at) marca
 * trial_status='expired' NA MESMA escrita — a expiração no cap é imediata,
 * não espera dia 3/7 nem cron.
 *
 * Concorrência: update otimista (eq em trial_credits_used) com 1 retry; se a
 * segunda tentativa também perder a corrida, grava incondicionalmente a partir
 * da releitura mais fresca e loga — o erro barato aqui é contar 1 débito a
 * menos uma vez, nunca deixar de expirar (o próximo débito re-soma e expira).
 * Nunca lança: débito de crédito jamais falha por causa da contabilidade.
 */
export async function recordReverseTrialDebit(userId: string, cost: number): Promise<void> {
  if (!REVERSE_TRIAL_ENABLED) return
  if (!userId || !Number.isFinite(cost) || cost <= 0) return
  try {
    const db = adminClient()
    if (!db) return
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { data: profile, error: readErr } = await db
        .from('profiles')
        .select('trial_status, trial_ends_at, trial_credits_used')
        .eq('id', userId)
        .maybeSingle()
      if (readErr || !profile) {
        if (readErr) console.error('[reverse-trial] cap read failed:', readErr.message)
        return
      }
      if (profile.trial_status !== 'active') return
      const used = typeof profile.trial_credits_used === 'number' ? profile.trial_credits_used : 0
      const newUsed = used + Math.round(cost)
      const endsRaw = (profile as { trial_ends_at?: unknown }).trial_ends_at
      const ends = typeof endsRaw === 'string' ? Date.parse(endsRaw) : NaN
      const shouldExpire = newUsed >= TRIAL_CREDIT_CAP || !Number.isFinite(ends) || Date.now() >= ends
      const patch: Record<string, unknown> = { trial_credits_used: newUsed }
      if (shouldExpire) patch.trial_status = 'expired'

      const query = db.from('profiles').update(patch).eq('id', userId)
      // Última tentativa: grava sem a guarda otimista (ver docstring).
      const { data: updated, error: updateErr } = attempt < 3
        ? await query.eq('trial_credits_used', used).select('id')
        : await query.select('id')
      if (updateErr) {
        console.error('[reverse-trial] cap update failed:', updateErr.message)
        return
      }
      if (updated && updated.length > 0) {
        if (shouldExpire) {
          console.log(`[reverse-trial] EXPIRED at cap user=${userId.slice(0, 8)} used=${newUsed}/${TRIAL_CREDIT_CAP}`)
        }
        return
      }
      // Perdeu a corrida — relê e tenta de novo.
    }
  } catch (e) {
    console.error('[reverse-trial] cap accounting threw:', e instanceof Error ? e.message : String(e))
  }
}
