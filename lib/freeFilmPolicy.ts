// KINEO-FILME-GRATIS-POR-PAIS-2026-09-29 — o interruptor da "saída B" do fundador (29/09: "vou sair na saída B").
//
// A decisão: o filme grátis (o trial de 10 créditos) passa a ser SÓ para país rico. O dado que sustenta: em 30 dias,
// 0 pagantes vieram de BR e MX, e os cadastros de países de renda baixa consomem fal sem nunca virar assinatura.
// Quem fica fora nasce com trial_status='region_paid_only' e 0 crédito (lib/reverseTrial.ts): a tela e a rota já
// recusam render de IA sem saldo, e a varredura de trial órfão (que só lê trial_status NULL) não o recredita.
//
// ⛔ POR QUE NASCE EM 'todos' E NÃO PODE LIGAR SOZINHO: uma conta 'region_paid_only' continua sendo plano grátis —
// passa pela cota semanal de Kineo 1 (compose isFreePlanFast) e pelo "1º filme" com clipes de IA da
// generate-video-fast. Ligar a B antes da E4 (fim da cota semanal com guarda de servidor) só trocaria o filme bom
// de 7 cr por Kineo 1 grátis com fal gasto. Ordem: E1 (este arquivo, em 'todos') → E2a (15 s) → E2b (entrada no
// Seedance) → E3 (textos) → E4 (cota semanal morre) → só então FREE_FILM_POLICY='pais_rico'.
// scripts/test-filme-gratis-por-pais-2026-09-29.mjs trava o padrão em 'todos' até lá.
//
// Módulo PURO (sem env, sem banco, sem import) — o servidor e os guardiões leem a mesma régua.
export type FreeFilmPolicy = 'todos' | 'pais_rico'

export const FREE_FILM_POLICY: FreeFilmPolicy = 'todos'

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

/** País do request pela Vercel (x-vercel-ip-country); null sem cabeçalho. */
export function paisDoRequest(h: { get(name: string): string | null } | null | undefined): string | null {
  try {
    return normalizarPais(h?.get('x-vercel-ip-country') ?? null)
  } catch {
    return null
  }
}
