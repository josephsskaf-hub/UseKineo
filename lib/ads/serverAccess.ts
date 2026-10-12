// KINEO-STUDIO-ADS-2026-09-25 — leitura do acesso ao Studio Ads NO SERVIDOR (chave de serviço), compartilhada pelas
// rotas /api/ads/*. Só chamar DEPOIS de conferir o dono com getUser, passando o e-mail VERIFICADO dele.
// Decide com lib/ads/access.ts (puro): passe > assinante > interna; trial e free fora. Sem a coluna do passe
// (migration não aplicada, 42703) decide sem ela. Erro de leitura = 'none' (falha fechada).
// KINEO-STUDIO-ADS-REVISAO-2026-09-24 — `adsGate` junta acesso e interruptor: desligado (NEXT_PUBLIC_ADS_PASS_LIVE
// !== '1') só a conta interna passa, como no checkout. "Desligado" quer dizer desligado.
// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — "pode abrir tudo para ele fazer o que ele quiser dentro" (fundador, 09/10): quem a régua
// de sempre deixa em 'none' com plano de cortesia paga UMA leitura a mais (lib/partnerAccess.ts) e, sendo parceiro ativo, entra
// como 'partner' — que adsGate trata como o assinante. Pagante, passe, casa e conta grátis não leem nada a mais. Leitura do
// parceiro que falha = 'none' (falha fechada, como a do perfil).
import { footageAdminClient } from '@/lib/userFootage'
import { adsAccessReason, ADS_ACCESS_SELECT, type AdsAccessFields, type AdsAccessReason } from '@/lib/ads/access'
import { adsPassLive } from '@/lib/ads/offer'
import { ADS_SAMPLE_DAILY_CAP, ADS_SAMPLE_LIVE, ADS_SAMPLE_PREFIX, ADS_SAMPLE_TIER } from '@/lib/ads/sample' // KINEO-ADS-AMOSTRA-2026-10-09
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen' // KINEO-ADS-AMOSTRA-2026-10-09
import { isActivePartner } from '@/lib/partnerAccess' // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09
import { personalWorkspace, resolveAdsWorkspace, type AdsWorkspace } from '@/lib/ads/workspace' // KINEO-EQUIPE-BUSINESS-2026-10-10

/** KINEO-EQUIPE-BUSINESS-2026-10-10 — o que loadAdsAccess devolve: o acesso E o workspace (sem a opção, sempre o pessoal). */
export interface AdsAccessLoad extends AdsWorkspace {
  admin: ReturnType<typeof footageAdminClient>
  reason: AdsAccessReason
}

/**
 * KINEO-EQUIPE-BUSINESS-2026-10-10 — `opts.workspace`: SÓ o Studio Ads v2 (rotas /api/ads/v2/*, /api/ads/brand-kit, /ads/v2,
 * a porta /ads e o /api/footage com purpose 'ads') pede. Aí o resolvedor único (lib/ads/workspace.ts resolveAdsWorkspace)
 * diz se a pessoa é MEMBRO ativo de um Business: o acesso passa a ser o do DONO ('subscriber' do plano business) e
 * ownerId = o dono. Sem a opção (v1, Produção, filmes, o resto), nada muda: o workspace é sempre o pessoal e não há
 * leitura a mais.
 */
export async function loadAdsAccess(userId: string, authEmail: string | null | undefined, opts: { workspace?: boolean } = {}): Promise<AdsAccessLoad> {
  const admin = footageAdminClient()
  const own = await loadOwnAdsAccess(admin, userId, authEmail)
  if (!opts.workspace) return { admin, reason: own.reason, ...personalWorkspace(userId, own.plan) }
  const ws = await resolveAdsWorkspace(admin, userId, own.plan)
  if (ws.role !== 'member') return { admin, reason: own.reason, ...ws }
  // Membro: o acesso é o do plano do DONO (business → 'subscriber'); o e-mail do membro não entra (nada de 'internal' herdado).
  return { admin, reason: adsAccessReason({ plan: ws.ownerPlan, ads_access_until: null }, null), ...ws }
}

/** A régua de sempre, da PRÓPRIA conta (era o corpo de loadAdsAccess); devolve também o plano lido (null = não lido). */
async function loadOwnAdsAccess(admin: ReturnType<typeof footageAdminClient>, userId: string, authEmail: string | null | undefined): Promise<{ reason: AdsAccessReason; plan: unknown }> {
  const withColumn = await admin.from('profiles').select(ADS_ACCESS_SELECT).eq('id', userId).maybeSingle()
  if (!withColumn.error) return { reason: await comParceiro(userId, withColumn.data as AdsAccessFields | null, authEmail), plan: (withColumn.data as AdsAccessFields | null)?.plan ?? null }
  if (withColumn.error.code === '42703') {
    const without = await admin.from('profiles').select('id, plan').eq('id', userId).maybeSingle()
    return { reason: without.error ? 'none' : await comParceiro(userId, (without.data as AdsAccessFields | null) ?? null, authEmail), plan: without.error ? null : (without.data as AdsAccessFields | null)?.plan ?? null }
  }
  return { reason: 'none', plan: null }
}

/** KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — a régua de sempre; só o 'none' com perfil lido pergunta pelo parceiro ativo. */
async function comParceiro(userId: string, row: AdsAccessFields | null, authEmail: string | null | undefined): Promise<AdsAccessReason> {
  const reason = adsAccessReason(row, authEmail)
  if (reason !== 'none' || !row || typeof row.plan !== 'string') return reason
  return adsAccessReason(row, authEmail, undefined, await isActivePartner(userId, row.plan))
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

// ═══ KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a amostra JÁ USADA e o anúncio que a pessoa fez ═════════════════════════════
// A porta /ads troca o convite da amostra pela oferta do Business quando a conta barrada ('no_access') já usou a dela. "Usou"
// é o MESMO critério de adsSampleOpen (pedido 'adssample-…' em generating/assembling/delivered — amostra que falhou não conta).
// O anúncio mostrado é o último pedido ENTREGUE da conta (ads_v2_orders.video_id → videos, do próprio dono). Só leitura;
// qualquer erro = { used: false } (sem oferta nova: a porta segue como antes, nunca inventa um anúncio).
// `delivered`: a amostra já foi ENTREGUE — a porta só diz "Your free ad is done" quando é verdade (amostra ainda montando = a
// porta de antes).
export interface AdsSampleUsedAd {
  used: boolean
  delivered: boolean
  videoUrl: string | null
  posterUrl: string | null
}

/** Os estados em que a amostra conta como USADA — os mesmos do adsSampleOpen acima (o guardião confere que as duas listas são iguais). */
const ADS_SAMPLE_USED_STATUSES = ['generating', 'assembling', 'delivered']

export async function loadAdsSampleUsedAd(admin: ReturnType<typeof footageAdminClient>, userId: string): Promise<AdsSampleUsedAd> {
  const none: AdsSampleUsedAd = { used: false, delivered: false, videoUrl: null, posterUrl: null }
  try {
    const used = await admin
      .from('ads_v2_orders')
      .select('status')
      .eq('user_id', userId)
      .like('billing_ref', `${ADS_SAMPLE_PREFIX}%`)
      .in('status', ADS_SAMPLE_USED_STATUSES)
      .limit(5)
    if (used.error || !Array.isArray(used.data) || used.data.length === 0) return none
    const delivered = (used.data as { status?: string | null }[]).some((r) => r.status === 'delivered')
    const last = await admin
      .from('ads_v2_orders')
      .select('video_id')
      .eq('user_id', userId)
      .eq('status', 'delivered')
      .not('video_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
    const videoId = !last.error && Array.isArray(last.data) ? (last.data[0] as { video_id?: string | null } | undefined)?.video_id ?? null : null
    if (!videoId) return { used: true, delivered, videoUrl: null, posterUrl: null }
    const v = await admin.from('videos').select('video_url, thumbnail_url').eq('id', videoId).eq('user_id', userId).maybeSingle()
    const row = (v.data as { video_url?: string | null; thumbnail_url?: string | null } | null) ?? null
    return { used: true, delivered, videoUrl: !v.error && typeof row?.video_url === 'string' ? row.video_url : null, posterUrl: !v.error && typeof row?.thumbnail_url === 'string' ? row.thumbnail_url : null }
  } catch {
    return none
  }
}
