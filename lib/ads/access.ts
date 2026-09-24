// KINEO-STUDIO-ADS-2026-09-25 — quem pode entrar no Studio Ads (decisões 2 e 3 do fundador, 24/09).
//
// TRÊS PORTAS, NENHUMA A MAIS:
//   'pass'       → comprou o passe: profiles.ads_access_until no futuro (escrita SÓ pelo webhook, Path A; o cliente não
//                  consegue escrever a coluna — guarda ads_access_client_guard na migration).
//   'subscriber' → assinante pago de um plano mensal/anual (decisão 3: "assinante pago entra sem passe").
//   'internal'   → contas da casa, para o canário e a operação.
// Trial e free NÃO entram. Falha de leitura = 'none' (falha fechada).
//
// KINEO-STUDIO-ADS-REVISAO-2026-09-24 — a v1 usava isPayingProfile (has_paid OU plano != free) e o e-mail de
// profiles. A revisão adversarial CONFIRMOU: (1) has_paid vira true com QUALQUER pacote avulso e com o próprio passe,
// então o passe de 365 d nunca expirava e quem comprou US$2,90 entrava para sempre; (2) profiles.email é editável
// pelo cliente e os padrões LIKE de métrica ('test%', '%mailinator%') casam com estranhos. Agora: plano de
// assinatura explícito (sem *_trial, sem o piloto avulso) e conta interna só pela lista exata + apelidos do fundador,
// sempre pelo e-mail VERIFICADO do auth (getUser), nunca pelo da tabela.
import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { ADS_ACCESS_COLUMN } from '@/lib/ads/offer'

/** Planos de ASSINATURA que abrem o Studio Ads sem passe (espelha os pagos de app/api/admin/_shared/mrr.ts, sem trial nem piloto). */
export const ADS_SUBSCRIBER_PLANS: readonly string[] = ['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot', 'autopilot_lite']

export interface AdsAccessFields {
  plan?: unknown
  /** profiles.ads_access_until — ISO string ou Date; null = nunca comprou o passe. */
  ads_access_until?: string | Date | null
}

export type AdsAccessReason = 'pass' | 'subscriber' | 'internal' | 'none'

/** Conta da casa para o Studio Ads: lista EXATA confirmada pelo fundador + apelidos josephsskaf+…@gmail.com. */
export function isAdsInternalEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  if (INTERNAL_EXACT_EMAILS.map((x) => x.toLowerCase()).includes(e)) return true
  return /^josephsskaf\+[^@\s]+@gmail\.com$/.test(e)
}

function passUntil(row: AdsAccessFields): Date | null {
  const raw = row[ADS_ACCESS_COLUMN]
  if (!raw) return null
  const d = raw instanceof Date ? raw : new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Por que esta conta entra (ou 'none'). `authEmail` = e-mail do getUser, nunca de profiles. */
export function adsAccessReason(row: AdsAccessFields | null | undefined, authEmail: string | null | undefined, now: Date = new Date()): AdsAccessReason {
  if (row) {
    const until = passUntil(row)
    if (until && until.getTime() > now.getTime()) return 'pass'
    const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : ''
    if (ADS_SUBSCRIBER_PLANS.includes(plan)) return 'subscriber'
  }
  if (isAdsInternalEmail(authEmail)) return 'internal'
  return 'none'
}

export function hasAdsAccess(row: AdsAccessFields | null | undefined, authEmail: string | null | undefined, now: Date = new Date()): boolean {
  return adsAccessReason(row, authEmail, now) !== 'none'
}

/** Colunas que as rotas /api/ads/* leem do perfil antes de decidir (sem e-mail: ele vem do auth). */
export const ADS_ACCESS_SELECT = `id, plan, ${ADS_ACCESS_COLUMN}` as const
