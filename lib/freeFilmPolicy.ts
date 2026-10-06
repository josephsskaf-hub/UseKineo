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
 * MX FORA de propósito (0 pagantes em 30 dias). BR voltou em 03/10 por decisão do fundador (KINEO-BRASIL-VOLTA-2026-10-03).
 * Mudar a lista é decisão do fundador.
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
  'BR', // KINEO-BRASIL-VOLTA-2026-10-03 — fundador (03/10): o Brasil vende (checkout em reais, Kineo Empresas). Reverter = apagar esta linha.
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

/**
 * KINEO-E4-CONSERTO-2026-09-29 (revisão de dinheiro, achado 4) — a régua ESTRITA da cota semanal: país CONHECIDO e na
 * lista. Diferente de filmeGratisPermitido (fail-open do cadastro, decisão da E1), aqui país desconhecido ('XX', 'T1'
 * do Tor, cabeçalho ausente) NÃO passa: é crédito recorrente, e o fail-open abria a cota a conta antiga de fora da lista
 * pelo Tor. Devolve o código normalizado (para fixar o país da 1ª vez) ou null.
 */
export function paisDaListaConfirmado(country: string | null | undefined): string | null {
  const c = normalizarPais(country)
  if (c === null) return null
  return PAISES_FILME_GRATIS.includes(c) ? c : null
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

// KINEO-CLIPE-GRATIS-REGIAO-2026-10-05 — decisão do fundador (05/10, noite, item 1A): "por 0,27 eu topo liberar para esses
// países que não têm tanto poder aquisitivo, pelo menos um clipe grátis de 5 segundos". Quem nasce 'region_paid_only' ganha,
// no cadastro, os créditos de 1 clipe de 5 s (lib/reverseTrial.ts: compare-and-set em trial_status='region_paid_only' e
// video_credits=0 — nunca dá duas vezes, nunca sobrescreve saldo). 5 cr = 1 clipe de 5 s no Seedance 1.5 (US$ 0,13 na fal)
// ou no Kling 2.5 (US$ 0,35, o teto). O filme narrado continua recusado para essas contas (REGION_PAID_ONLY_REFUSAL,
// intacto). O guardião scripts/test-clipe-gratis-regiao-2026-10-05.mjs confere que o número bate com
// clipCreditCost('seedance', 5) de lib/clips/clipPricing.ts (espelho, sem import: este módulo também roda no navegador).
export const REGION_FREE_CLIP_PUBLIC = true
export const REGION_FREE_CLIP_CREDITS = 5
export const REGION_FREE_CLIP_GRANTED_EVENT = 'region_free_clip_granted'
export const REGION_FREE_CLIP_HREF = '/clips'
/** A faixa do topo enquanto o clipe grátis está disponível (pt/en/es; as outras línguas da interface caem no inglês). */
export const REGION_FREE_CLIP_NOTICE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'Your first clip is free',
    body: 'The free film is not available in your country yet, but your first 5-second clip is on us. Plans unlock every engine, with clean downloads.',
    cta: 'Make my free clip',
  },
  pt: {
    title: 'Seu primeiro clipe é grátis',
    body: 'O filme grátis ainda não está disponível no seu país, mas o seu primeiro clipe de 5 segundos é por nossa conta. Os planos liberam todos os motores, com download sem marca d’água.',
    cta: 'Fazer meu clipe grátis',
  },
  es: {
    title: 'Tu primer clip es gratis',
    body: 'La película gratis todavía no está disponible en tu país, pero tu primer clip de 5 segundos va por nuestra cuenta. Los planes desbloquean todos los motores, con descargas sin marca de agua.',
    cta: 'Hacer mi clip gratis',
  },
}
/** A faixa oferece o clipe grátis enquanto o saldo cobre 1 clipe: some quando a pessoa usa e volta se o clipe falhar e for estornado. */
export function regionFreeClipAvailable(row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null | undefined): boolean {
  if (!REGION_FREE_CLIP_PUBLIC || !regionPaidOnlyNoticeVisible(row)) return false
  return typeof row?.video_credits === 'number' && row.video_credits >= REGION_FREE_CLIP_CREDITS
}

/** País do request pela Vercel (x-vercel-ip-country); null sem cabeçalho. */
export function paisDoRequest(h: { get(name: string): string | null } | null | undefined): string | null {
  try {
    return normalizarPais(h?.get('x-vercel-ip-country') ?? null)
  } catch {
    return null
  }
}
