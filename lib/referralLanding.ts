// KINEO-LACOS-INDICACAO-2026-10-02 — chegada pelo link de indicação, gravada NO SERVIDOR.
//
// Dois lugares leem o `?ref=` de indicação no servidor:
//   1. app/a/[code]/route.ts — o middleware manda todo `?ref=XXXXXXXX` (8 caracteres) para /a/XXXXXXXX desde
//      08/09 (KINEO-AFILIADO-REF). Até hoje, um código de INDICAÇÃO (profiles.referral_code, o link do "Invite &
//      Earn") caía ali como "afiliado desconhecido" e ia para a home SEM o código: o captureRefOnce nunca o via e o
//      cadastro nunca era atribuído. Medido em 02/10: 0 cadastros com referred_by desde a semana de 24/08 (6 antes).
//      Agora o /a/ reconhece o código de indicação, grava a chegada e entrega o código à home por cookie.
//   2. app/v/[id]/page.tsx — o link compartilhado de um filme publicado leva `?ref=<código do dono>`. O middleware
//      deixa de desviar /v/ (o visitante vê o filme) e a página grava a chegada.
//
// Nunca lança e nunca atrasa a página além do prazo: analytics não derruba aquisição.
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { isAffiliatePreviewBot } from '@/lib/affiliateDestinations'
import { normalizeReferralCode, REFERRAL_LANDING_EVENT } from '@/lib/referralReward'

export type ReferralLandingSurface = 'home' | 'public_video'

const LOOKUP_TIMEOUT_MS = 1_500

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Dono do código de indicação, ou null (código inválido, desconhecido, fora do ar ou lento). */
export async function findReferrerIdByCode(rawCode: unknown): Promise<string | null> {
  const code = normalizeReferralCode(rawCode)
  if (!code) return null
  const admin = serviceClient()
  if (!admin) return null
  try {
    const lookup = admin.from('profiles').select('id').eq('referral_code', code).maybeSingle()
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS))
    const result = await Promise.race([lookup, timeout])
    if (!result || result.error || !result.data) return null
    return typeof result.data.id === 'string' ? result.data.id : null
  } catch {
    return null
  }
}

/**
 * Grava `referral_landing` (SERVER_ONLY_EVENTS) quando o código é de indicação. Robô de prévia (WhatsApp, Telegram,
 * X…) não conta: a prévia do link não é uma pessoa chegando. Metadados: ids e a superfície, nunca e-mail.
 * Devolve o id do indicador (para quem chama decidir o cookie) ou null.
 */
export async function recordReferralLanding(input: {
  code: unknown
  surface: ReferralLandingSurface
  userAgent?: string | null
  videoId?: string | null
  referrerId?: string | null
}): Promise<string | null> {
  try {
    if (isAffiliatePreviewBot(input.userAgent)) return null
    const referrerId = input.referrerId ?? (await findReferrerIdByCode(input.code))
    if (!referrerId) return null
    const metadata: Record<string, unknown> = { referrer_user_id: referrerId, surface: input.surface }
    if (input.videoId) metadata.video_id = input.videoId.slice(0, 64)
    await writeServerEvent({ name: REFERRAL_LANDING_EVENT, userId: null, metadata })
    return referrerId
  } catch {
    return null
  }
}

// Um só import para o /a/[code] (os guardiões que executam a rota mockam um módulo só).
export { normalizeReferralCode, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/referralReward'
