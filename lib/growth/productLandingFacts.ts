// KINEO-MAPA-PRODUTOS-2026-10-02 — Clips, Spaces, Ads v2 e Produção na fonte que os motores de resposta leem
// (/llms.txt e /api/facts). Os produtos saíram entre 29/09 e 01/10 e NENHUMA das duas superfícies falava deles: quem
// perguntava ao ChatGPT "como faço um clipe de 5 s a partir de uma foto" ou "como mostro um galpão vazio já montado"
// ouvia que a Kineo só faz Shorts narrados.
//
// DISCIPLINA (a mesma de lib/kineoFacts.ts): NENHUM número digitado. Preço e duração do clipe = clipCreditCost ×
// offeredSecondsFor (os MESMOS que /api/clips cobra); motor visível = o mesmo interruptor que a rota lê (enginePaused,
// S25_PUBLIC); Spaces = soma das etapas que já existem (foto pronta no Nano Banana Pro do catálogo de imagens + clipe
// Kling 2.5 de 5 s pelo /api/clips, exatamente o pedido que app/(dashboard)/spaces/SpacesClient.tsx faz); Ads v2 =
// adsV2Credits. Produção NÃO tem preço público (PRODUCAO_MONTAGE_CREDITS = null): o fato só existe com
// PRODUCAO_PUBLIC=true e mesmo assim sai sem preço ("for businesses on request").
//
// Cada produto respeita o interruptor dele: CLIPS_PUBLIC / SPACES_PUBLIC / ADS_V2_PUBLIC / PRODUCAO_PUBLIC = false
// → o fato vira null e some do llms.txt e do JSON no mesmo deploy.
//
// Imports relativos (sem @/ nos módulos lidos aqui) para o guardião offline resolver o grafo sem Next.
import { productLandingPath } from './productLandingPages'
import { CLIP_ENGINES, CLIP_ENGINE_ORDER, modesFor, offeredSecondsFor, type ClipEngineKey } from '../clips/clipCatalog'
import { clipCreditCost } from '../clips/clipPricing'
import { CLIPS_PUBLIC } from '../clips/clipLaunch'
import { SPACES_PUBLIC, SPACE_MAX_PHOTOS } from '../spaces/spaces'
import { IMG_ENGINES } from '../imageModels'
import { S25_PUBLIC, enginePaused } from '../engineLaunch'
import { PRODUCAO_PUBLIC } from '../ads/producao'
import { ADS_V2_PUBLIC, ADS_V2_TIER_IDS, adsV2Credits } from '../ads/v2Tiers'
// O anúncio v2 mora na porta /ads: com o passe desligado (NEXT_PUBLIC_ADS_PASS_LIVE=0, emergência) a porta some de toda
// superfície de resposta (STUDIO_ADS_FACT null) — o fato v2 some junto, senão o llms.txt citaria /ads sozinho.
import { adsPassLive } from '../ads/offer'
// A tela vende SÓ a duração de ADS_V2_SCREEN_SECONDS (15 s): 20 e 30 s existem na tabela, não no botão — o fato não os cita.
import { ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '../ads/v2Screen'

const BASE = 'https://www.usekineo.com'

/* ─── Clips ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Motor de clipe à venda para o público: fora de manutenção e, no Seedance 2.5, só com S25_PUBLIC (mesma régua da rota). */
export function clipEnginePubliclyOffered(key: ClipEngineKey): boolean {
  if (enginePaused(key)) return false
  if (key === 's25' && !S25_PUBLIC) return false
  return true
}

export interface ClipEngineOffer {
  key: ClipEngineKey
  name: string
  /** true = o motor só começa de uma foto (não tem texto → vídeo). */
  photoOnly: boolean
  options: { seconds: number; credits: number }[]
}

export interface ClipsProductFact {
  name: 'Clips'
  url: string
  appUrl: string
  description: string
  inputs: string[]
  narration: false
  engines: ClipEngineOffer[]
  fromCredits: number
}

export function buildClipsFact(): ClipsProductFact | null {
  if (!CLIPS_PUBLIC) return null
  const engines: ClipEngineOffer[] = CLIP_ENGINE_ORDER.filter(clipEnginePubliclyOffered).map((key) => ({
    key,
    name: CLIP_ENGINES[key].label,
    photoOnly: !modesFor(key).includes('t2v'),
    options: offeredSecondsFor(key).map((seconds) => ({ seconds, credits: clipCreditCost(key, seconds) })),
  }))
  if (engines.length === 0) return null
  return {
    name: 'Clips',
    url: `${BASE}${productLandingPath('clips')}`,
    appUrl: `${BASE}/clips`,
    description: 'One AI video clip: a single scene with no narration, made from a text description or from a photo used as the first frame.',
    inputs: ['text description', 'photo as the first frame'],
    narration: false,
    engines,
    fromCredits: Math.min(...engines.flatMap((e) => e.options.map((o) => o.credits))),
  }
}

/* ─── Spaces ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** O clipe que o Spaces pede ao /api/clips por foto pronta (espelho de SpacesClient.tsx; o guardião confere o pedido). */
export const SPACES_CLIP_ENGINE: ClipEngineKey = 'kling'
export const SPACES_CLIP_SECONDS = 5
/** A foto pronta sai do Nano Banana Pro do catálogo de imagens (o mesmo preço que /api/images/generate cobra). */
export const SPACES_PHOTO_IMAGE_ENGINE = 'nanobanana'

function imageEngineCredits(key: string): number {
  const engine = IMG_ENGINES.find((e) => e.key === key)
  const n = engine ? Number.parseInt(engine.credits, 10) : Number.NaN
  if (!Number.isInteger(n) || n <= 0) throw new Error(`image engine credits missing: ${key}`)
  return n
}

export interface SpacesProductFact {
  name: 'Spaces'
  url: string
  appUrl: string
  description: string
  maxPhotos: number
  photoEngine: string
  creditsPerFinishedPhoto: number
  clipEngine: string
  clipSeconds: number
  creditsPerClip: number
  /** foto pronta + clipe, por foto do espaço. */
  creditsPerPhotoWithClip: number
  montageCredits: 0
}

export function buildSpacesFact(): SpacesProductFact | null {
  if (!SPACES_PUBLIC) return null
  const creditsPerFinishedPhoto = imageEngineCredits(SPACES_PHOTO_IMAGE_ENGINE)
  const creditsPerClip = clipCreditCost(SPACES_CLIP_ENGINE, SPACES_CLIP_SECONDS)
  const photoEngine = IMG_ENGINES.find((e) => e.key === SPACES_PHOTO_IMAGE_ENGINE)?.name ?? SPACES_PHOTO_IMAGE_ENGINE
  return {
    name: 'Spaces',
    url: `${BASE}${productLandingPath('spaces')}`,
    appUrl: `${BASE}/spaces`,
    description: 'Photos of an empty space (a store, a warehouse, an apartment) plus what the customer wants inside it become the same photos with the space finished — same camera, same walls and windows — and a before → after video.',
    maxPhotos: SPACE_MAX_PHOTOS,
    photoEngine,
    creditsPerFinishedPhoto,
    clipEngine: CLIP_ENGINES[SPACES_CLIP_ENGINE].label,
    clipSeconds: SPACES_CLIP_SECONDS,
    creditsPerClip,
    creditsPerPhotoWithClip: creditsPerFinishedPhoto + creditsPerClip,
    montageCredits: 0,
  }
}

/* ─── Ads v2 ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface AdsV2ProductFact {
  name: 'Studio Ads (photo-motion ad)'
  url: string
  description: string
  seconds: number
  tiers: { id: string; name: string; pitch: string; credits: number }[]
  access: string
}

export function buildAdsV2Fact(): AdsV2ProductFact | null {
  if (!ADS_V2_PUBLIC || !adsPassLive()) return null
  return {
    name: 'Studio Ads (photo-motion ad)',
    url: `${BASE}/ads`,
    description: "A vertical video ad made from the business's own authorized photos and logo: each photo gets movement, with music, a short voice-over and the logo at the end.",
    seconds: ADS_V2_SCREEN_SECONDS,
    tiers: ADS_V2_TIER_IDS.map((id) => ({
      id,
      name: ADS_V2_TIER_COPY[id].name,
      pitch: ADS_V2_TIER_COPY[id].pitch,
      credits: adsV2Credits(id, ADS_V2_SCREEN_SECONDS),
    })),
    access: 'Same access as Studio Ads: paid plans (or an active ad pass); the free trial does not include it.',
  }
}

/* ─── Produção (anúncio com atriz de IA / mascote) ───────────────────────────────────────────────────────────────── */

export interface ActorAdsProductFact {
  name: 'Ads with an AI actor or brand mascot'
  url: string
  description: string
  price: 'for businesses on request'
}

/** null enquanto PRODUCAO_PUBLIC=false (decisão do fundador: render aprovado + preço da montagem antes de abrir). */
export function buildActorAdsFact(): ActorAdsProductFact | null {
  if (!PRODUCAO_PUBLIC) return null
  return {
    name: 'Ads with an AI actor or brand mascot',
    url: `${BASE}${productLandingPath('actorAds')}`,
    description: 'A business ad built around one consistent AI actor or brand mascot: shots planned and previewed as images first, brought to life as clips or as the character speaking to camera, then assembled with the business logo.',
    price: 'for businesses on request',
  }
}

export interface ProductLandingFacts {
  clips: ClipsProductFact | null
  spaces: SpacesProductFact | null
  adsV2: AdsV2ProductFact | null
  actorAds: ActorAdsProductFact | null
}

export function getProductLandingFacts(): ProductLandingFacts {
  return { clips: buildClipsFact(), spaces: buildSpacesFact(), adsV2: buildAdsV2Fact(), actorAds: buildActorAdsFact() }
}

/** "Kling 2.5 5 s = 5 · 10 s = 8" — a linha de preço de um motor, para texto corrido. */
export function clipEngineLine(engine: ClipEngineOffer): string {
  const prices = engine.options.map((o) => `${o.seconds} s = ${o.credits}`).join(' · ')
  return `${engine.name}${engine.photoOnly ? ' (from a photo only)' : ''}: ${prices} credits`
}
