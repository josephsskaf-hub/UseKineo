// KINEO-AMOSTRA-ANUNCIO-2410 — pure sample policy; the server owns admission and budget reservation.
import { CENA_KEYFRAME_USD, CENA_ROUTES } from './adapters'

export const ADS_ESCOLHA_SAMPLE_MARK = 'KINEO-AMOSTRA-ANUNCIO-2410' as const
export const ADS_ESCOLHA_SAMPLE_LIVE = true
export const ADS_ESCOLHA_SAMPLE_SECONDS = 8
export const ADS_ESCOLHA_SAMPLE_WORDS = 18
export const ADS_ESCOLHA_SAMPLE_PHOTOS = 2
export const ADS_ESCOLHA_SAMPLE_DAILY_CAP_CENTS = 2500 // KINEO-ADS-SIMPLES-2810 — fundador 28/10: US$ 10 → US$ 25/dia (≈ 16 amostras); o SQL (reserve_ads_escolha_sample + CHECK do dia) acompanha em supabase/migrations/20261028120000_ads_escolha_sample_cap_2500.sql (NÃO aplicada ainda)
/** Estimate, not an invoice. Code tariff (checked 21/10/2026): 8×$0.112 + 2×$0.15 = $1.196.
 * Reserve $1.50 including a $0.304 allowance for bounded text/judges, one TTS and montage.
 * Photo/video/TTS retries are forbidden; music uses the existing curated library.
 * Auxiliary actual billing is unknown and must be reconciled before increasing daily volume. */
export const ADS_ESCOLHA_SAMPLE_ESTIMATE_CENTS = 150
export const ADS_ESCOLHA_SAMPLE_KNOWN_MEDIA_CENTS = Math.ceil((ADS_ESCOLHA_SAMPLE_SECONDS * CENA_ROUTES.kling3.silentVideoUsdPerSecond + ADS_ESCOLHA_SAMPLE_PHOTOS * CENA_KEYFRAME_USD) * 100)

export function isEscolhaSamplePlan(plan: unknown): boolean {
  const p = plan as { escolha?: { marker?: unknown; sample?: unknown } } | null
  return p?.escolha?.marker === 'KINEO-ADS-ESCOLHA-2310' && p.escolha.sample === ADS_ESCOLHA_SAMPLE_MARK
}
export function escolhaSeconds(plan: unknown): 8 | 15 { return isEscolhaSamplePlan(plan) ? 8 : 15 }
