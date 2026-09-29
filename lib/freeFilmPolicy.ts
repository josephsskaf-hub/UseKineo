// KINEO-FILME-GRATIS-POR-PAIS-2026-09-29 — o interruptor da "saída B" do fundador (29/09: "vou sair na saída B").
//
// A decisão: o filme grátis (o trial de 10 créditos) passa a ser SÓ para país rico. O dado que sustenta: em 30 dias,
// 0 pagantes vieram de BR e MX, e os cadastros de países de renda baixa consomem fal sem nunca virar assinatura.
// Quem fica fora nasce com trial_status='region_paid_only' e 0 crédito (lib/reverseTrial.ts): a tela e a rota já
// recusam render de IA sem saldo, e a varredura de trial órfão (que só lê trial_status NULL) não o recredita.
//
// ⛔ POR QUE NASCEU EM 'todos': uma conta 'region_paid_only' continuava sendo plano grátis — passava pela cota
// semanal de Kineo 1 (compose isFreePlanFast) e pelo "1º filme" com clipes de IA da generate-video-fast. Ordem
// cumprida: E1 → E2a (15 s) → E2b (entrada no Seedance) → E3 (textos) → E4 (KINEO-E4-SAIDA-B-2026-09-29).
// ✅ E4 LIGA A B: a cota de Kineo 1 morreu (lib/freeTierOffer ON_OFFER.limit=0), o Kineo 1 grátis é recusado no
// servidor ANTES de qualquer fornecedor (lib/kineo1Gate.ts, na generate-video-fast e no compose free-plan-fast), e a
// cota semanal nova (1 Seedance 15 s, lib/freeWeeklyFilm.ts) só vale para país desta lista e nunca para
// 'region_paid_only'. scripts/test-e4-saida-b-cota-seedance-2026-09-29.mjs prova as três coisas executando o código.
// Contas que já existem não perdem nada: a régua só age na CONCESSÃO do trial (lib/reverseTrial.ts).
//
// Módulo PURO (sem env, sem banco, sem import) — o servidor e os guardiões leem a mesma régua.
export type FreeFilmPolicy = 'todos' | 'pais_rico'

export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'

/**
 * ISO-3166 alfa-2 dos países que recebem o filme grátis sob 'pais_rico'. Alta renda: América do Norte anglófona,
 * Reino Unido/Irlanda, Oceania, União Europeia + EEE + Suíça, Ásia rica e Golfo + Israel.
 * BR e MX FORA de propósito (0 pagantes em 30 dias). Mudar a lista é decisão do fundador.
 */
export const PAISES_FILME_GRATIS: readonly string[] = [
  // América do Norte, Reino Unido e Irlanda, Oceania
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ',
  // União Europeia
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEE e Suíça
  'NO', 'IS', 'LI', 'CH',
  // Ásia rica
  'JP', 'KR', 'SG', 'HK', 'TW',
  // Golfo e Israel
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL',
]

/** Status gravado em profiles.trial_status para quem ficou fora do filme grátis (texto livre, sem CHECK no banco). */
export const REGION_PAID_ONLY_TRIAL_STATUS = 'region_paid_only'
/** Evento de servidor da recusa (metadata: { country }). */
export const TRIAL_REGION_EXCLUDED_EVENT = 'trial_region_excluded'

function normalizarPais(country: string | null | undefined): string | null {
  if (typeof country !== 'string') return null
  const c = country.trim().toUpperCase()
  // 'XX'/'T1' e vazio = a Vercel não soube (Tor, rede privada): sem sinal.
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return null
  return c
}

/**
 * Esta conta pode receber o filme grátis? Política 'todos' → sempre. País ausente/desconhecido → concede (mesma
 * filosofia fail-open da digital do aparelho: sem sinal não se pune ninguém). Senão, só os da lista.
 */
export function filmeGratisPermitido(country: string | null | undefined, policy: FreeFilmPolicy = FREE_FILM_POLICY): boolean {
  if (policy === 'todos') return true
  const c = normalizarPais(country)
  if (c === null) return true
  return PAISES_FILME_GRATIS.includes(c)
}

// ═══ KINEO-E4-SAIDA-B-2026-09-29 — a verdade pública e a tela de quem ficou fora ═══════════════════════════════════
// Texto público (llms.txt, /facts, /api/facts, páginas que citam o filme grátis): com 'pais_rico' o filme grátis é
// "in supported countries". A cláusula DERIVA da política — nenhuma lista de país é digitada em texto público, e virar
// a política para 'todos' apaga a cláusula sozinha. Lida por lib/freeTierOffer.ts (FREE_FILM_LABEL).
export const FREE_FILM_COUNTRY_CLAUSE: string = FREE_FILM_POLICY === 'pais_rico' ? ' in supported countries' : ''

/** A conta nasceu fora do filme grátis (e segue sem pagar)? Só ela vê o aviso; pagou → some. */
export function regionPaidOnlyNoticeVisible(row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined): boolean {
  if (!row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return false
  if (row.has_paid === true) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  return plan === 'free' || plan === ''
}

/** Aviso honesto (nunca um erro seco) — pt/en/es; outras línguas da interface caem no inglês. Botão leva aos planos. */
export interface RegionPaidOnlyNoticeCopy { title: string; body: string; cta: string }
export const REGION_PAID_ONLY_NOTICE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'The free film is not available in your country yet',
    body: 'Plans work normally here: pick one and every engine is yours, with clean downloads.',
    cta: 'See plans',
  },
  pt: {
    title: 'O filme grátis ainda não está disponível no seu país',
    body: 'Os planos funcionam normalmente: escolha um e todos os motores ficam liberados, com download sem marca d’água.',
    cta: 'Ver planos',
  },
  es: {
    title: 'La película gratis todavía no está disponible en tu país',
    body: 'Los planes funcionan con normalidad: elige uno y todos los motores quedan disponibles, con descargas sin marca de agua.',
    cta: 'Ver planes',
  },
}
export const REGION_PAID_ONLY_PLANS_HREF = '/pricing'
/** Recusa de servidor para a conta 'region_paid_only' (inglês: a rota não sabe a língua da interface). */
export const REGION_PAID_ONLY_REFUSAL = `${REGION_PAID_ONLY_NOTICE.en.title}. ${REGION_PAID_ONLY_NOTICE.en.body} Nothing was charged.`

/** País do request pela Vercel (x-vercel-ip-country); null sem cabeçalho. */
export function paisDoRequest(h: { get(name: string): string | null } | null | undefined): string | null {
  try {
    return normalizarPais(h?.get('x-vercel-ip-country') ?? null)
  } catch {
    return null
  }
}
