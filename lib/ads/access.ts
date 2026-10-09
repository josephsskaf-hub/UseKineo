// KINEO-STUDIO-ADS-2026-09-25 — quem pode entrar no Studio Ads (decisões 2 e 3 do fundador, 24/09).
//
// TRÊS PORTAS, NENHUMA A MAIS:
//   'pass'       → comprou o passe: profiles.ads_access_until no futuro (escrita SÓ pelo webhook, Path A; o cliente não
//                  consegue escrever a coluna — guarda ads_access_client_guard na migration).
//   'subscriber' → assinante pago de um plano mensal/anual (decisão 3: "assinante pago entra sem passe").
//   'internal'   → contas da casa, para o canário e a operação.
// Trial e free NÃO entram. Falha de leitura = 'none' (falha fechada).
//
// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — e uma quarta, DEPOIS das três: 'partner' → o parceiro ativo (cortesia ativa + afiliado
// ativo), que o fundador abriu em 09/10: "pode abrir tudo para ele fazer o que ele quiser dentro". Entra como o assinante (sem
// passe), com o crédito da cortesia — o anúncio debita video_credits igual. A regra segue PURA: quem lê o banco é
// lib/partnerAccess.ts, no servidor (lib/ads/serverAccess.ts loadAdsAccess), e passa `partner = true`. Sem ela = a régua de antes.
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
// KINEO-BUSINESS-84-2026-10-09 — 'business' entra: o plano Business É o Studio Ads self-serve (anúncios de produto para empresas).
export const ADS_SUBSCRIBER_PLANS: readonly string[] = ['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot', 'autopilot_lite', 'business']

export interface AdsAccessFields {
  plan?: unknown
  /** profiles.ads_access_until — ISO string ou Date; null = nunca comprou o passe. */
  ads_access_until?: string | Date | null
}

export type AdsAccessReason = 'pass' | 'subscriber' | 'internal' | 'partner' | 'none' // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09: + partner

/** Conta da casa para o Studio Ads: lista EXATA confirmada pelo fundador + apelidos josephsskaf+…@gmail.com. */
export function isAdsInternalEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  if (INTERNAL_EXACT_EMAILS.map((x) => x.toLowerCase()).includes(e)) return true
  // KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — revisão: apelido josephsskaf+x@gmail.com NÃO entra. O cadastro confirma o
  // e-mail sozinho, então qualquer pessoa registraria um apelido novo e ganharia a porta da casa. Só a lista exata (contas
  // que já existem e não podem ser registradas de novo).
  return false
}

function passUntil(row: AdsAccessFields): Date | null {
  const raw = row[ADS_ACCESS_COLUMN]
  if (!raw) return null
  const d = raw instanceof Date ? raw : new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Por que esta conta entra (ou 'none'). `authEmail` = e-mail do getUser, nunca de profiles. `partner` = parceiro ativo lido no
 *  servidor por lib/partnerAccess.ts (KINEO-PARCEIRO-ABRE-TUDO-2026-10-09); ausente = a régua de antes. */
export function adsAccessReason(row: AdsAccessFields | null | undefined, authEmail: string | null | undefined, now: Date = new Date(), partner: boolean = false): AdsAccessReason {
  // KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — revisão: a conta da casa decide PRIMEIRO. Com o interruptor desligado só
  // 'internal' passa, e o fundador (plano pro) caía em 'subscriber' e via "opens soon" no próprio canário.
  if (isAdsInternalEmail(authEmail)) return 'internal'
  if (row) {
    const until = passUntil(row)
    if (until && until.getTime() > now.getTime()) return 'pass'
    const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : ''
    if (ADS_SUBSCRIBER_PLANS.includes(plan)) return 'subscriber'
  }
  // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — "pode abrir tudo para ele fazer o que ele quiser dentro" (fundador, 09/10): depois da
  // casa, do passe e do assinante, o parceiro ativo entra como assinante.
  if (partner === true) return 'partner'
  return 'none'
}

export function hasAdsAccess(row: AdsAccessFields | null | undefined, authEmail: string | null | undefined, now: Date = new Date()): boolean {
  return adsAccessReason(row, authEmail, now) !== 'none'
}

/** Colunas que as rotas /api/ads/* leem do perfil antes de decidir (sem e-mail: ele vem do auth). */
export const ADS_ACCESS_SELECT = `id, plan, ${ADS_ACCESS_COLUMN}` as const
