// KINEO-AGENCIAS-2026-10-13 — PROGRAMA DE AGÊNCIAS (fundador 13/10/2026, "tudo sim").
//
// A agência de social media / tráfego / pequenas empresas REVENDE o plano Business: o cliente dela assina o Business pelo
// link de parceiro da agência, a equipe da agência opera o Studio Ads nas vagas de equipe do cliente, e a agência ganha
// 30% recorrente em cada cobrança do Business (lib/affiliateCommission.ts AGENCY_BUSINESS_COMMISSION_RATE — só para
// affiliates.partner_type = 'agency', marcado pelo fundador em /admin/affiliates depois de aprovar a inscrição).
//
// REGRA DA CASA: a copy LÊ o número, nunca digita. Preço, créditos, anúncios/mês, vagas e as taxas saem das fontes
// (lib/businessPlan.ts, lib/affiliateCommission.ts, lib/ads/v2Styles.ts). O guardião scripts/test-agencias-1310.mjs confere.
//
// Módulo PURO (sem servidor, sem Supabase, sem node:crypto): entra na página /agencies, no formulário ('use client') e na
// rota app/api/agencies/apply/route.ts.
import {
  AFFILIATE_COMMISSION_PCT,
  AFFILIATE_PAYOUT_TERMS,
  AGENCY_BUSINESS_COMMISSION_PCT,
  BUSINESS_AFFILIATE_COMMISSION_PCT,
} from '@/lib/affiliateCommission'
import {
  BUSINESS_AD_SECONDS,
  BUSINESS_ADS_PER_MONTH,
  BUSINESS_ADS_PROMISE,
  BUSINESS_MONTHLY_CREDITS,
  BUSINESS_PRICE_LABEL,
  BUSINESS_TEAM_SEATS,
} from '@/lib/businessPlan'
import { ADS_V2_STYLES, type AdsV2StyleKey } from '@/lib/ads/v2Styles'

export const AGENCIES_PAGE_PATH = '/agencies'
export const AGENCY_APPLY_API_PATH = '/api/agencies/apply'
export const AGENCY_APPLICATIONS_TABLE = 'agency_applications'

/** Os 3 anúncios da vitrine: prévias REAIS feitas pelo próprio efeito (public/ads-styles/<chave>.mp4) + o ator de IA. */
export const AGENCY_SHOWCASE_STYLE_KEYS: readonly AdsV2StyleKey[] = ['package_explosion', 'giant_product']

/** Faixas de nº de clientes (o mesmo enum do check da tabela). */
export const AGENCY_CLIENT_COUNT_OPTIONS = ['1-5', '6-15', '16-40', '40+'] as const
export type AgencyClientCount = (typeof AGENCY_CLIENT_COUNT_OPTIONS)[number]

/** Tetos do formulário (iguais aos checks da migration 20261013120000_agency_program.sql). */
export const AGENCY_FIELD_LIMITS = { name: 120, agency: 160, website: 300, email: 254, note: 1000 } as const
/** Teto de inscrições por IP por hora e por e-mail por dia (conferido no banco pela rota). */
export const AGENCY_APPLY_MAX_PER_IP_HOUR = 3
export const AGENCY_APPLY_MAX_PER_EMAIL_DAY = 1
/** Campo-armadilha (invisível para gente; robô preenche): inscrição com ele cheio é descartada em silêncio. */
export const AGENCY_HONEYPOT_FIELD = 'company_phone_ext'

export interface AgencyApplication {
  name: string
  agency: string
  website: string
  email: string
  client_count: AgencyClientCount
  note: string | null
}

export type AgencyApplicationResult =
  | { ok: true; value: AgencyApplication }
  | { ok: false; invalid: (keyof AgencyApplication)[] }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function clean(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  // Sem quebras/controle (o texto vai para um e-mail de texto puro), espaços colapsados.
  return raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Site: aceita "minhaagencia.com" ou "https://…"; devolve sempre https://host/caminho; nada de javascript:/data:. */
export function normalizeAgencyWebsite(raw: unknown): string | null {
  const v = clean(raw, AGENCY_FIELD_LIMITS.website)
  if (!v) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!u.hostname.includes('.') || u.username || u.password) return null
    const out = `https://${u.hostname.toLowerCase()}${u.pathname === '/' ? '' : u.pathname}`
    return out.length <= AGENCY_FIELD_LIMITS.website ? out : null
  } catch {
    return null
  }
}

/** Valida e limpa o corpo do formulário. Nunca lança. */
export function sanitizeAgencyApplication(raw: unknown): AgencyApplicationResult {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const name = clean(b.name, AGENCY_FIELD_LIMITS.name)
  const agency = clean(b.agency, AGENCY_FIELD_LIMITS.agency)
  const website = normalizeAgencyWebsite(b.website)
  const email = clean(b.email, AGENCY_FIELD_LIMITS.email).toLowerCase()
  const count = clean(b.client_count, 10)
  const note = clean(b.note, AGENCY_FIELD_LIMITS.note)
  const invalid: (keyof AgencyApplication)[] = []
  if (name.length < 2) invalid.push('name')
  if (agency.length < 2) invalid.push('agency')
  if (!website) invalid.push('website')
  if (!EMAIL_RE.test(email)) invalid.push('email')
  if (!(AGENCY_CLIENT_COUNT_OPTIONS as readonly string[]).includes(count)) invalid.push('client_count')
  if (invalid.length) return { ok: false, invalid }
  return {
    ok: true,
    value: { name, agency, website: website as string, email, client_count: count as AgencyClientCount, note: note || null },
  }
}

/** O armadilha veio preenchido? */
export function isAgencyHoneypotHit(raw: unknown): boolean {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const v = b[AGENCY_HONEYPOT_FIELD]
  return typeof v === 'string' && v.trim().length > 0
}

/** O e-mail que o fundador recebe (texto puro, em português). */
export function agencyApplicationAlert(app: AgencyApplication, siteOrigin = 'https://www.usekineo.com'): { subject: string; text: string } {
  return {
    subject: `[Kineo] Inscrição de agência: ${app.agency} (${app.client_count} clientes)`,
    text: [
      `Nova inscrição no programa de agências (${siteOrigin}${AGENCIES_PAGE_PATH}).`,
      `Nome: ${app.name}`,
      `Agência: ${app.agency}`,
      `Site: ${app.website}`,
      `E-mail: ${app.email}`,
      `Clientes: ${app.client_count}`,
      `Recado: ${app.note ?? '(nenhum)'}`,
      '',
      'Nenhuma conta foi criada. Próximo passo (manual): responder ao e-mail; quando a agência tiver conta e link de',
      `parceiro (${siteOrigin}/affiliate), marcar "agência" em ${siteOrigin}/admin/affiliates para o Business pagar ${AGENCY_BUSINESS_COMMISSION_PCT}.`,
    ].join('\n'),
  }
}

/** Os números da oferta, todos derivados (a página e o guardião leem daqui). */
export const AGENCY_OFFER = {
  commissionPct: AGENCY_BUSINESS_COMMISSION_PCT,
  standardBusinessPct: BUSINESS_AFFILIATE_COMMISSION_PCT,
  otherPlansPct: AFFILIATE_COMMISSION_PCT,
  priceLabel: BUSINESS_PRICE_LABEL,
  monthlyCredits: BUSINESS_MONTHLY_CREDITS,
  adsPerMonth: BUSINESS_ADS_PER_MONTH,
  adSeconds: BUSINESS_AD_SECONDS,
  adsPromise: BUSINESS_ADS_PROMISE,
  seats: BUSINESS_TEAM_SEATS,
  styles: ADS_V2_STYLES.length,
  payoutTerms: AFFILIATE_PAYOUT_TERMS,
} as const

/** Ganho mensal ilustrativo da agência com N clientes no Business (centavos inteiros → texto US$). */
export function agencyMonthlyEarningLabel(clients: number, priceUsdMinor: number, rate: number): string {
  const cents = Math.round(clients * priceUsdMinor * rate)
  const dollars = cents / 100
  return `$${Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)}`
}
