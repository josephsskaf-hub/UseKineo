// KINEO-STUDIO-ADS-2026-09-25 — leitura do acesso ao Studio Ads NO SERVIDOR (chave de serviço), compartilhada pelas
// rotas /api/ads/*. Só chamar DEPOIS de conferir o dono com getUser, passando o e-mail VERIFICADO dele.
// Decide com lib/ads/access.ts (puro): passe > assinante > interna; trial e free fora. Sem a coluna do passe
// (migration não aplicada, 42703) decide sem ela. Erro de leitura = 'none' (falha fechada).
// KINEO-STUDIO-ADS-REVISAO-2026-09-24 — `adsGate` junta acesso e interruptor: desligado (NEXT_PUBLIC_ADS_PASS_LIVE
// !== '1') só a conta interna passa, como no checkout. "Desligado" quer dizer desligado.
import { footageAdminClient } from '@/lib/userFootage'
import { adsAccessReason, ADS_ACCESS_SELECT, type AdsAccessFields, type AdsAccessReason } from '@/lib/ads/access'
import { adsPassLive } from '@/lib/ads/offer'
import { ADS_SAMPLE_DAILY_CAP, ADS_SAMPLE_LIVE, ADS_SAMPLE_PREFIX, ADS_SAMPLE_TIER } from '@/lib/ads/sample' // KINEO-ADS-AMOSTRA-2026-10-09
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen' // KINEO-ADS-AMOSTRA-2026-10-09

export async function loadAdsAccess(userId: string, authEmail: string | null | undefined): Promise<{ admin: ReturnType<typeof footageAdminClient>; reason: AdsAccessReason }> {
  const admin = footageAdminClient()
  const withColumn = await admin.from('profiles').select(ADS_ACCESS_SELECT).eq('id', userId).maybeSingle()
  if (!withColumn.error) return { admin, reason: adsAccessReason(withColumn.data as AdsAccessFields | null, authEmail) }
  if (withColumn.error.code === '42703') {
    const without = await admin.from('profiles').select('id, plan').eq('id', userId).maybeSingle()
    return { admin, reason: without.error ? 'none' : adsAccessReason((without.data as AdsAccessFields | null) ?? null, authEmail) }
  }
  return { admin, reason: 'none' }
}

/** O que a rota deve fazer: 'ok', 'no_access' (403 com botão do passe) ou 'closed' (desligado; 403 "opens soon"). */
export function adsGate(reason: AdsAccessReason): 'ok' | 'no_access' | 'closed' {
  if (reason === 'none') return 'no_access'
  if (!adsPassLive() && reason !== 'internal') return 'closed'
  return 'ok'
}

export const isMissingAdsTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

// ═══ KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis (lib/ads/sample.ts) ════════════════════════════════════════════════
// Quem ganha: SÓ a conta que o gate barrou por falta de plano ('no_access', reason 'none'), com o Studio Ads aberto ao
// público (adsPassLive: com ele desligado nem o assinante entra — a amostra não fura o "Desligado quer dizer desligado")
// e que ainda NÃO tem amostra começada ou entregue (billing_ref 'adssample-%' em generating/assembling/delivered; uma
// amostra que FALHOU não conta: a culpa foi nossa, a pessoa tenta de novo). Assinante, passe e interna nunca passam por
// aqui (gate 'ok'). Qualquer erro de leitura = false (falha fechada).
// O teto do dia conta as amostras INICIADAS (started_at) desde 00:00 UTC; erro de leitura = teto atingido (falha fechada).

/** A conta pode abrir o montador pela amostra grátis? */
export async function adsSampleOpen(admin: ReturnType<typeof footageAdminClient>, userId: string, reason: AdsAccessReason): Promise<boolean> {
  if (!ADS_SAMPLE_LIVE) return false
  if (reason !== 'none' || adsGate(reason) !== 'no_access') return false
  if (!adsPassLive()) return false
  try {
    const { data, error } = await admin
      .from('ads_v2_orders')
      .select('id')
      .eq('user_id', userId)
      .like('billing_ref', `${ADS_SAMPLE_PREFIX}%`)
      .in('status', ['generating', 'assembling', 'delivered'])
      .limit(1)
    if (error) return false
    return Array.isArray(data) && data.length === 0
  } catch {
    return false
  }
}

/** O pedido está no nível e na duração da amostra (o único que a amostra abre)? As rotas perguntam AQUI, não ao sample.ts. */
export function adsSampleLevelOk(tier: unknown, seconds: unknown): boolean {
  return tier === ADS_SAMPLE_TIER && seconds === ADS_V2_SCREEN_SECONDS
}

/** Início do dia UTC de `now` (ISO). */
export function adsSampleDayStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/** O teto global de amostras do dia já foi atingido? */
export async function adsSampleCapReached(admin: ReturnType<typeof footageAdminClient>, now: Date = new Date()): Promise<boolean> {
  try {
    const { count, error } = await admin
      .from('ads_v2_orders')
      .select('id', { count: 'exact', head: true })
      .like('billing_ref', `${ADS_SAMPLE_PREFIX}%`)
      .gte('started_at', adsSampleDayStartIso(now))
    if (error || typeof count !== 'number') return true
    return count >= ADS_SAMPLE_DAILY_CAP
  } catch {
    return true
  }
}
