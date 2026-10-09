// KINEO-ADS-V2-2026-09-28 — níveis, créditos, motores e rota por tipo de plano do anúncio v2 (Studio Ads).
//
// Fonte única: docs/ESPEC-ANUNCIO-V2-2026-09-28.md (seções 1, 2 e 3). Decisão do fundador em 28/09: preço 34/41/51 cr
// por 15 s; o motor por nível fica com o CEO-executor (seção 2 da especificação).
//
// LIB PURA (nenhum import): o guardião scripts/test-ads-v2-base-2026-09-28.mjs importa este arquivo cru no Node. Os
// slugs do Kling O3 e do H3 são CÓPIAS de lib/hollywood/router.ts (KLING3_I2V_MODEL, H3_I2V_MODEL) e o guardião lê o
// original por readFileSync para provar o espelho. O slug do Seedance 2.0 Fast foi conferido no OpenAPI público da fal
// em 28/09 (https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=bytedance/seedance-2.0/fast/image-to-video):
// o endpoint NÃO tem o prefixo fal-ai/ (com prefixo a fal responde 404).
//
// ⚠ ADS_V2_PUBLIC: de 28/09 até a virada ficou false (só contas internas pela lista EXATA de isAdsInternalEmail).
// KINEO-ADS-V2-VIRADA-2026-09-29 — true: ordem do fundador (29/09 madrugada) "deixa os motores já acionados para quem
// quiser fazer o tipo de ads". No MESMO commit (especificação, seção 8): /ads/new sem ?classic=1 leva ao /ads/v2, a copy
// pública de /ads e /ads/for fala do anúncio de ~15 s, e os guardiões foram reancorados. Desligar = reverter o commit
// inteiro (só voltar a false deixa a copy de /ads vendendo o v2 para quem não consegue abri-lo).

export const ADS_V2_PUBLIC = true

export type AdsV2Tier = 'photo_motion' | 'commercial' | 'cinema'
export type AdsV2Seconds = 15 | 20 | 30
// KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — 'user_video' = o vídeo do próprio cliente, montado como vídeo (mudo, trecho
// escolhido): NUNCA vai à fal (routeShot devolve null em toda tentativa), igual ao `text`. Ocupa vaga de foto do molde.
export type AdsV2ShotKind = 'people' | 'place' | 'product' | 'product_hero' | 'text' | 'user_video'
export type AdsV2ShotSource = 'client_photo' | 'generated_scene'
// KINEO-ESTILOS-PRODUTO-2026-10-09 — 'pixverse_effect': o plano-herói do produto com ESTILO (lib/ads/v2Styles.ts) sai pelo
// efeito da PixVerse em vez do motor normal. Só entra pela rota com `styled` (routeShot); sem estilo, nada muda.
export type AdsV2Engine = 'kling_o3' | 'seedance_20_fast' | 'h3' | 'pixverse_effect'

export const ADS_V2_TIER_IDS: readonly AdsV2Tier[] = ['photo_motion', 'commercial', 'cinema']
export const ADS_V2_SECONDS: readonly AdsV2Seconds[] = [15, 20, 30]
export const ADS_V2_SHOT_KINDS: readonly AdsV2ShotKind[] = ['people', 'place', 'product', 'product_hero', 'text', 'user_video']
/** Tipos de plano que NUNCA passam por IA de vídeo (sem motor, sem request_id, em nenhuma tentativa). */
export const ADS_V2_NO_AI_KINDS: readonly AdsV2ShotKind[] = ['text', 'user_video']
export const ADS_V2_ENGINE_IDS: readonly AdsV2Engine[] = ['kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect']

export interface AdsV2TierSpec {
  id: AdsV2Tier
  /** Créditos por 15 s (decisão do fundador 28/09). */
  credits15: number
  /** Planos do anúncio de 15 s (sem contar o cartão final). */
  shots: number
  /** Cenas de gente comum criadas pelo Nano Banana Pro edit com as fotos do cliente como referência. */
  generatedScenes: number
  /** Closes-herói de produto/comida no Seedance 2.0 Fast (só no Cinema). */
  heroCloseups: number
}

export const ADS_V2_TIERS: Readonly<Record<AdsV2Tier, AdsV2TierSpec>> = {
  photo_motion: { id: 'photo_motion', credits15: 34, shots: 6, generatedScenes: 0, heroCloseups: 0 },
  commercial: { id: 'commercial', credits15: 41, shots: 6, generatedScenes: 3, heroCloseups: 0 },
  cinema: { id: 'cinema', credits15: 51, shots: 7, generatedScenes: 4, heroCloseups: 2 },
}

export function isAdsV2Tier(raw: unknown): raw is AdsV2Tier {
  return typeof raw === 'string' && (ADS_V2_TIER_IDS as readonly string[]).includes(raw)
}
export function isAdsV2Seconds(raw: unknown): raw is AdsV2Seconds {
  return typeof raw === 'number' && (ADS_V2_SECONDS as readonly number[]).includes(raw)
}

/** Créditos do anúncio: ceil(base de 15 s × segundos/15). 15 s = 34/41/51; 20 s = 46/55/68; 30 s = 68/82/102. */
export function adsV2Credits(tier: AdsV2Tier, seconds: AdsV2Seconds): number {
  const spec = ADS_V2_TIERS[tier]
  if (!spec) throw new Error(`ads_v2_unknown_tier:${String(tier)}`)
  if (!isAdsV2Seconds(seconds)) throw new Error(`ads_v2_unknown_seconds:${String(seconds)}`)
  // Conta inteira antes da divisão: 34 × 20 / 15 em ponto flutuante não pode virar 45,33… + ruído e subir um degrau.
  return Math.ceil((spec.credits15 * seconds) / 15)
}

// ── Refação por plano (cobrada à parte, valor mostrado ANTES do clique) ────────────────────────────────────────────
// ⚠ PROVISÓRIO: proposta do CEO-executor (especificação, seções 1 e 9). O fundador confirma na virada pública.
export const ADS_V2_RETAKE_PROVISIONAL = true
export const ADS_V2_RETAKE_CREDITS: Readonly<Record<AdsV2Engine, number>> = {
  kling_o3: 5,
  h3: 5,
  seedance_20_fast: 12,
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — completa o mapa do tipo; adsV2RetakeCredits NUNCA chega aqui (calcula sem estilo):
  // a refação do plano com estilo custa o MESMO que sem estilo (o efeito é mais barato que o motor que ele substitui).
  pixverse_effect: 5,
}
/**
 * Preço da refação do plano. Plano `text` não tem refação (não passa por IA): devolve 0.
 * KINEO-ESTILOS-PRODUTO-2026-10-09 — de propósito SEM o estilo: o preço mostrado e cobrado não muda com o efeito.
 */
export function adsV2RetakeCredits(kind: AdsV2ShotKind, tier: AdsV2Tier): number {
  const engine = routeShot(kind, tier, 1)
  return engine ? ADS_V2_RETAKE_CREDITS[engine] : 0
}

// ── Catálogo de motores (conferido no OpenAPI e na página de preço da fal em 28/09) ───────────────────────────────
export interface AdsV2EngineSpec {
  id: AdsV2Engine
  slug: string
  /** US$ por segundo GERADO, no modo que o v2 manda (sem áudio / 720p / 768P). */
  usdPerSecond: number
  /** Segundos gerados por plano (o menor que o motor aceita e que cobre o corte). */
  genSeconds: number
  /** O motor gera áudio mesmo pedindo que não? (H3 não tem o campo; o montador zera o volume de todo clipe.) */
  audioAlwaysOn: boolean
}

// Slugs COPIADOS (guardião de espelho): KLING3_I2V_MODEL e H3_I2V_MODEL de lib/hollywood/router.ts.
export const ADS_V2_KLING_O3_I2V_SLUG = 'fal-ai/kling-video/o3/pro/image-to-video'
export const ADS_V2_H3_I2V_SLUG = 'minimax/h3/image-to-video'
// Conferido no schema da fal (28/09): sem prefixo fal-ai/.
export const ADS_V2_SEEDANCE_20_FAST_I2V_SLUG = 'bytedance/seedance-2.0/fast/image-to-video'
// KINEO-ESTILOS-PRODUTO-2026-10-09 — os 5 estilos de produto (espelho de ADS_V2_STYLE_ENDPOINT, lib/ads/v2Styles.ts; o
// mesmo modelo da sonda app/api/admin/effect-probe/route.ts). Entrada { effect, image_url, resolution, duration }.
export const ADS_V2_PIXVERSE_EFFECTS_SLUG = 'fal-ai/pixverse/v5/effects'

export const ADS_V2_ENGINES: Readonly<Record<AdsV2Engine, AdsV2EngineSpec>> = {
  // fal: "$0.112 (audio off) or $0.14 (audio on)" por segundo · duração aceita '3'..'15' → 3 s = US$ 0,336.
  kling_o3: { id: 'kling_o3', slug: ADS_V2_KLING_O3_I2V_SLUG, usdPerSecond: 0.112, genSeconds: 3, audioAlwaysOn: false },
  // fal: "Fast tier $0.2419 / sec" a 720p, áudio sem custo extra · duração mínima '4' → 4 s = US$ 0,9676.
  seedance_20_fast: { id: 'seedance_20_fast', slug: ADS_V2_SEEDANCE_20_FAST_I2V_SLUG, usdPerSecond: 0.2419, genSeconds: 4, audioAlwaysOn: false },
  // fal: "$0.06 per second at 768p" · duration inteiro, mínimo 5 → 5 s = US$ 0,30. Espelha H3_USD_PER_SECOND do router.
  h3: { id: 'h3', slug: ADS_V2_H3_I2V_SLUG, usdPerSecond: 0.06, genSeconds: 5, audioAlwaysOn: true },
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — PixVerse v5 effects em 720p, 5 s ≈ US$ 0,20 por clipe (testes de 09/10):
  // 0,04 × 5 = 0,20. O efeito não tem campo de áudio; o montador zera o volume de todo clipe (como no H3).
  pixverse_effect: { id: 'pixverse_effect', slug: ADS_V2_PIXVERSE_EFFECTS_SLUG, usdPerSecond: 0.04, genSeconds: 5, audioAlwaysOn: true },
}

/** Nano Banana Pro edit: US$ 0,15 por imagem em 1K e 2K ("4K outputs will be charged at double"). O v2 usa 2K. */
export const ADS_V2_SCENE_IMAGE_SLUG = 'fal-ai/nano-banana-pro/edit'
export const ADS_V2_SCENE_IMAGE_USD = 0.15

/** Fixos por anúncio (especificação, seção 3): Lyria 0,08 + voz MiniMax ~0,03 + Creatomate ~0,13 + GPT ~0,01. */
export const ADS_V2_FIXED_USD_PARTS = { lyria: 0.08, voice: 0.03, creatomate: 0.13, gpt: 0.01 } as const
export const ADS_V2_FIXED_USD = 0.25
/**
 * Fixos de 15 s que crescem com a duração: o Creatomate cobra por segundo renderizado (lib/renderProfile.ts:
 * width × height × fps × segundos) e a voz MiniMax por caractere (a narração cresce com o anúncio: 30/40/60 palavras).
 * Lyria (1 faixa) e GPT (1 chamada) não crescem. Em 30 s o fixo é 0,08 + 0,01 + (0,03 + 0,13) × 2 = 0,41, não 0,25.
 */
export function adsV2FixedUsd(seconds: number = 15): number {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`ads_v2_bad_seconds:${String(seconds)}`)
  const f = ADS_V2_FIXED_USD_PARTS
  return Math.round((f.lyria + f.gpt + (f.voice + f.creatomate) * (seconds / 15)) * 1000) / 1000
}

/** A partir de qual tentativa a vaga cai na reserva H3 (o motor principal falhou 2 vezes). */
export const ADS_V2_FALLBACK_FROM_ATTEMPT = 3

/**
 * Motor de um plano (especificação, seção 2).
 * - `text` (tela de app, cardápio com preço, placa, documento) → null EM TODA TENTATIVA: foto parada com zoom do
 *   montador. Texto nunca passa por IA de vídeo (o Seedance 2.0 trocou $9.90 por $9.30 no teste de 28/09).
 * - `product_hero` só existe no Cinema → Seedance 2.0 Fast; fora do Cinema é tratado como `product` (Kling O3).
 * - people/place/product → Kling O3 Pro i2v, sem áudio, 3 s.
 * - `attempt` começa em 1. Tentativas 1 e 2 vão ao motor principal (a 2ª é a refação automática sem custo); da 3ª em
 *   diante (principal falhou 2 vezes) vai à reserva MiniMax H3 i2v 768P.
 * - KINEO-ESTILOS-PRODUTO-2026-10-09 — `styled` = este é o plano-herói com ESTILO (planShots marcou `effect`): tentativas 1
 *   e 2 vão ao efeito da PixVerse (só product/product_hero); da 3ª em diante, a MESMA reserva H3 de todo plano, com o
 *   prompt de movimento normal — o anúncio sai, só esse plano sem o efeito. Sem `styled` (padrão), a rota é a de antes.
 * ⚠ `attempt` conta só as tentativas da MESMA geração paga (1ª + refação automática por falha do fornecedor). Uma
 *   refação cobrada (adsV2RetakeCredits, preço do motor principal) recomeça em 1 — se a rota passar o `attempt`
 *   acumulado da tabela ads_v2_shots, a 2ª refação de um plano que nunca falhou cai no H3 cobrando o preço do principal.
 */
export function routeShot(kind: AdsV2ShotKind, tier: AdsV2Tier, attempt: number, styled = false): AdsV2Engine | null {
  if (kind === 'text') return null
  // O vídeo do cliente é montado como ele gravou: nenhum motor em tentativa nenhuma (custo zero de fornecedor).
  if (kind === 'user_video') return null
  if (!(ADS_V2_SHOT_KINDS as readonly string[]).includes(kind)) throw new Error(`ads_v2_unknown_kind:${String(kind)}`)
  if (!isAdsV2Tier(tier)) throw new Error(`ads_v2_unknown_tier:${String(tier)}`)
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error(`ads_v2_bad_attempt:${String(attempt)}`)
  if (attempt >= ADS_V2_FALLBACK_FROM_ATTEMPT) return 'h3'
  if (styled === true && (kind === 'product' || kind === 'product_hero')) return 'pixverse_effect'
  if (kind === 'product_hero' && tier === 'cinema') return 'seedance_20_fast'
  return 'kling_o3'
}

export interface AdsV2CostShot {
  kind: AdsV2ShotKind
  source: AdsV2ShotSource
  /** Tentativa usada para escolher o motor; ausente = 1 (estimativa do plano novo). */
  attempt?: number
  /** KINEO-ESTILOS-PRODUTO-2026-10-09 — o plano tem estilo (planShots marcou `effect`): custa o efeito, não o motor. */
  styled?: boolean
}

export interface AdsV2UsdEstimate {
  videoUsd: number
  imageUsd: number
  fixedUsd: number
  totalUsd: number
  /** Planos que vão a um motor de vídeo (o `text` fica fora). */
  aiShots: number
  sceneImages: number
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Custo estimado em US$ de um plano (dry-run): vídeo por motor × segundos gerados + Nano Banana por cena criada + fixos.
 * Na tabela da especificação (15 s): Foto em movimento 2,266 · Comercial 2,716 · Cinema ~4,465.
 * `seconds` = duração pedida (15/20/30; padrão 15): os fixos de render e voz crescem com ela (adsV2FixedUsd).
 */
export function estimateAdUsd(plan: { tier: AdsV2Tier; shots: readonly AdsV2CostShot[]; seconds?: number }): AdsV2UsdEstimate {
  let videoUsd = 0
  let aiShots = 0
  let sceneImages = 0
  for (const shot of plan.shots) {
    const engine = routeShot(shot.kind, plan.tier, shot.attempt ?? 1, shot.styled === true)
    if (engine) {
      const e = ADS_V2_ENGINES[engine]
      videoUsd += e.usdPerSecond * e.genSeconds
      aiShots += 1
    }
    if (shot.source === 'generated_scene') sceneImages += 1
  }
  const imageUsd = sceneImages * ADS_V2_SCENE_IMAGE_USD
  const fixedUsd = adsV2FixedUsd(plan.seconds ?? 15)
  return {
    videoUsd: round3(videoUsd),
    imageUsd: round3(imageUsd),
    fixedUsd,
    totalUsd: round3(videoUsd + imageUsd + fixedUsd),
    aiShots,
    sceneImages,
  }
}
