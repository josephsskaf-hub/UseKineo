// KINEO-ADS-V2-2026-09-28 — ETAPA 3 (tela /ads/v2): as regras da tela que precisam de prova, fora do JSX.
//
// O que mora aqui: o recorte 9:16 (1080×1920, JPEG q0.9) com ponto focal, a lista das 4 marcações de foto, os rótulos
// de estado dos planos (sem prometer tempo), QUEM pode ter "Redo this shot" (plano `text` NUNCA: texto não passa por
// IA de vídeo — o motor troca o preço), a frase que vai ao servidor com o nome do negócio, e a frase de cada erro das
// rotas /api/ads/v2/* (explica e diz o que fazer). Textos em INGLÊS (língua do site).
//
// LIB PURA (nenhum import): o guardião scripts/test-ads-v2-tela-2026-09-28.mjs importa este arquivo cru no Node. Os
// enums de setor e de tipo de foto são CÓPIAS de lib/ads/v2ShotLists.ts / lib/ads/v2Contract.ts e o guardião confere
// o espelho. Nada de 35/60 s, narração obrigatória ou legenda: o v2 é 15 s, narração opcional e sem legenda.

export type AdsV2ScreenSector = 'restaurant' | 'clinic' | 'real_estate' | 'gym' | 'salon' | 'store' | 'app_service' | 'other'
export type AdsV2ScreenPhotoKind = 'product' | 'place' | 'people' | 'text'
export type AdsV2ScreenTier = 'photo_motion' | 'commercial' | 'cinema'
export type AdsV2ScreenOrderStatus = 'draft' | 'planned' | 'generating' | 'assembling' | 'delivered' | 'failed' | 'cancelled'

/** Duração do anúncio que a tela vende (a base de preço 34/41/51 é por 15 s). */
export const ADS_V2_SCREEN_SECONDS = 15

// ── Recorte 9:16 no navegador ──────────────────────────────────────────────────────────────────────────────────────
/** Saída do recorte: 1080×1920 JPEG qualidade 0,9 (Kling O3 e H3 não têm aspect_ratio e seguem a foto). */
export const ADS_V2_CROP = { width: 1080, height: 1920, quality: 0.9, type: 'image/jpeg' } as const
/** Recorte com menos que isto de largura na foto original vai ser ampliado: a tela avisa (não bloqueia). */
export const ADS_V2_MIN_CROP_WIDTH = 720

export interface AdsV2CropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export function clampFocal(v: number): number {
  if (!Number.isFinite(v)) return 0.5
  return Math.min(1, Math.max(0, v))
}

/**
 * A maior janela 9:16 que cabe na foto, deslizada pelo ponto focal (0 = encostada à esquerda/em cima, 1 = à
 * direita/embaixo). É a MESMA conta do `object-fit: cover` + `object-position: fx% fy%` da prévia, então o que a pessoa
 * vê ao arrastar é o que sobe.
 */
export function cropRect(imgW: number, imgH: number, fx: number, fy: number): AdsV2CropRect {
  if (!(imgW > 0) || !(imgH > 0)) throw new Error('ads_v2_bad_image_size')
  const ratio = ADS_V2_CROP.width / ADS_V2_CROP.height
  let sw = imgW
  let sh = imgW / ratio
  if (sh > imgH) {
    sh = imgH
    sw = imgH * ratio
  }
  const sx = (imgW - sw) * clampFocal(fx)
  const sy = (imgH - sh) * clampFocal(fy)
  return { sx, sy, sw, sh }
}

/** `object-position` da prévia para o mesmo ponto focal. */
export function focalPosition(fx: number, fy: number): string {
  return `${Math.round(clampFocal(fx) * 1000) / 10}% ${Math.round(clampFocal(fy) * 1000) / 10}%`
}

/**
 * Arrastar a foto dentro da moldura 9:16: a foto anda com o dedo (arrastar para a direita mostra mais do lado
 * esquerdo, então o foco vai para a esquerda). Eixo sem sobra = não mexe.
 */
export function panFocal(
  focal: { fx: number; fy: number },
  delta: { dx: number; dy: number },
  frame: { w: number; h: number },
  image: { w: number; h: number },
): { fx: number; fy: number } {
  if (!(frame.w > 0) || !(frame.h > 0) || !(image.w > 0) || !(image.h > 0)) return { fx: clampFocal(focal.fx), fy: clampFocal(focal.fy) }
  const scale = Math.max(frame.w / image.w, frame.h / image.h)
  const overX = image.w * scale - frame.w
  const overY = image.h * scale - frame.h
  return {
    fx: overX > 0.5 ? clampFocal(focal.fx - delta.dx / overX) : clampFocal(focal.fx),
    fy: overY > 0.5 ? clampFocal(focal.fy - delta.dy / overY) : clampFocal(focal.fy),
  }
}

/**
 * REVISÃO 28/09 (celular): `touch-action` da moldura. Com `none` o dedo que começa em cima da foto não rola a página
 * (7 fotos = a lista inteira vira parede). Quase toda foto é mais LARGA que 9:16 (paisagem, 3:4, quadrada): só o eixo
 * X tem sobra, então o gesto vertical fica com a página ('pan-y') e o horizontal enquadra. Foto mais estreita que
 * 9:16 (print de celular): 'pan-x'. Já 9:16: nada a enquadrar ('auto').
 */
export function frameTouchAction(imgW: number, imgH: number): 'pan-y' | 'pan-x' | 'auto' {
  if (!(imgW > 0) || !(imgH > 0)) return 'auto'
  const r = imgW / imgH
  const target = ADS_V2_CROP.width / ADS_V2_CROP.height
  if (r > target * 1.01) return 'pan-y'
  if (r < target * 0.99) return 'pan-x'
  return 'auto'
}

/** A foto é pequena para 1080×1920 (o recorte vai ser ampliado)? */
export function isSmallCrop(rect: AdsV2CropRect): boolean {
  return rect.sw < ADS_V2_MIN_CROP_WIDTH
}

// ── O que cada foto mostra ─────────────────────────────────────────────────────────────────────────────────────────
export const ADS_V2_PHOTO_KIND_OPTIONS: readonly { id: AdsV2ScreenPhotoKind; label: string; hint: string }[] = [
  { id: 'product', label: 'Food or product', hint: 'Your dish or product comes alive with one slow camera move.' },
  { id: 'place', label: 'Place', hint: 'Your room, shop or front door, with one slow camera move.' },
  { id: 'people', label: 'People', hint: 'Your team or customers. Only with their permission.' },
  { id: 'text', label: 'Screen or text', hint: 'Shown as a still with a slow zoom, so every word stays exactly right.' },
]

export function isScreenPhotoKind(raw: unknown): raw is AdsV2ScreenPhotoKind {
  return typeof raw === 'string' && ADS_V2_PHOTO_KIND_OPTIONS.some((o) => o.id === raw)
}

// ── Setor ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ADS_V2_SECTOR_OPTIONS: readonly { id: AdsV2ScreenSector; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant, café or bakery' },
  { id: 'clinic', label: 'Clinic or health practice' },
  { id: 'real_estate', label: 'Real estate' },
  { id: 'gym', label: 'Gym or studio' },
  { id: 'salon', label: 'Beauty salon or barber' },
  { id: 'store', label: 'Shop or product' },
  { id: 'app_service', label: 'App or online service' },
  { id: 'other', label: 'Something else' },
]

/** Dicas de foto por setor (coluna "What makes a good photo"). */
export const ADS_V2_PHOTO_TIPS: Readonly<Record<AdsV2ScreenSector, readonly string[]>> = {
  restaurant: ['Your best dish close up, in daylight, filling the frame.', 'The dining room with the lights on and the tables set.', 'A menu or price board works too: mark it Screen or text.'],
  clinic: ['A clean, bright reception or waiting room.', 'A tidy treatment room, without instruments in close-up.', 'Your team smiling, only with their permission.'],
  real_estate: ['The living room in daylight, from a corner, so the room looks wide.', 'The kitchen or the best room, lights on.', 'The facade or the view, on a clear day.'],
  gym: ['The training floor, empty or with members who agreed.', 'Your best equipment, close up.', 'A class in motion, only with permission.'],
  salon: ['A finished hairstyle or nails, close up, in good light.', 'Your chairs and mirrors, clean and lit.', 'The entrance or reception with your sign.'],
  store: ['Your best-selling product on a clean background.', 'The product in a hand or in use.', 'Your shop or shelf, tidy and lit.'],
  app_service: ["Your app's main screen: mark it Screen or text so every word stays exact.", 'A person using your service, with permission.', 'Your team or your workspace.'],
  other: ['What you sell, close up.', 'Your place or where you work.', 'A happy customer, with their permission.'],
}
export const ADS_V2_GENERAL_PHOTO_TIPS: readonly string[] = [
  'Real photos of YOUR business. The ad shows exactly what is in them, nothing invented.',
  'Sharp and bright, no heavy filters. Big photos look best; small ones look soft.',
  'Anything with words or prices (menus, screens, signs): mark it Screen or text.',
  'Your best photo first: we use them in the order you add them.',
]

// ── Níveis (a tela mostra o preço por adsV2Credits; aqui só a explicação para o dono do negócio) ──────────────────
export const ADS_V2_TIER_COPY: Readonly<Record<AdsV2ScreenTier, { name: string; pitch: string; includes: readonly string[] }>> = {
  photo_motion: {
    name: 'Photo motion',
    pitch: 'Your own photos come to life.',
    includes: ['6 shots, each one made from a photo you took', 'Music, a short voice-over you can turn off, and your logo at the end'],
  },
  commercial: {
    name: 'Commercial',
    pitch: 'Your photos, plus people enjoying what you offer.',
    includes: ['3 shots from your photos', '3 new scenes of everyday people using or enjoying it, created from your photos', 'Music, voice-over and your logo at the end'],
  },
  cinema: {
    name: 'Cinema',
    pitch: 'The full commercial look.',
    // REVISÃO 28/09: o close-herói só existe quando há foto marcada Food or product (planShots: heroSlot && product).
    includes: ['Everything in Commercial; with a Food or product photo, it opens on 2 hero close-ups of it', 'One more created scene: 7 shots in about 16 seconds', 'Music, voice-over and your logo at the end'],
  },
}

// ── Como funciona (coluna lateral; 4 passos do v2) ─────────────────────────────────────────────────────────────────
export const ADS_V2_HOW_IT_WORKS: readonly { title: string; body: string }[] = [
  { title: 'Pick a level', body: 'Photo motion, Commercial or Cinema. The price is shown before anything is charged.' },
  { title: 'Show your business', body: 'One sentence (or your link), your logo and 3 to 7 real photos. Frame each one for a vertical phone screen.' },
  { title: 'Check the plan', body: 'See every shot, the words on screen and the voice-over. Planning is free.' },
  { title: 'Get your ad', body: 'We animate your photos, add music and your logo, and deliver a vertical ad. Not happy with a shot? Redo it for a few credits, with the price shown first.' },
]
/** A estrutura do anúncio (o "modelo" ao lado do montador). */
export const ADS_V2_AD_SHAPE: readonly string[] = ['Hook', 'Desire', 'In use', 'Your place or product', 'Your logo']

// ── Estado dos planos ──────────────────────────────────────────────────────────────────────────────────────────────
/** Espelho do que GET /api/ads/v2/status devolve por plano (AdsV2ShotView de lib/ads/v2Advance.ts). */
export interface AdsV2ScreenShot {
  idx: number
  kind: string
  source: string
  attempt: number
  state: 'ready' | 'working' | 'failed'
  status: string
  url: string | null
  retake_credits: number
}

export const ADS_V2_ACTIVE_STATUSES: readonly AdsV2ScreenOrderStatus[] = ['generating', 'assembling']
export function isActiveOrderStatus(status: unknown): boolean {
  return typeof status === 'string' && (ADS_V2_ACTIVE_STATUSES as readonly string[]).includes(status)
}

/** Rótulo de um plano na grade. Nenhum rótulo promete tempo. */
export function shotStateLabel(shot: Pick<AdsV2ScreenShot, 'kind' | 'source' | 'status' | 'state'>, orderStatus: string): string {
  if (shot.kind === 'text' || shot.status === 'skipped_text') return 'Still with zoom'
  // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do cliente não passa por IA: entra pronto, como foi gravado.
  if (shot.kind === 'user_video') return 'Your video'
  if (shot.state === 'ready' || shot.status === 'done') return 'Ready'
  if (shot.state === 'failed' || shot.status === 'failed' || shot.status === 'stuck') {
    return isActiveOrderStatus(orderStatus) ? 'Trying again' : 'Did not work'
  }
  if (shot.source === 'generated_scene' && (shot.status === 'pending' || shot.status === 'image_submitted')) return 'Preparing image'
  return 'Animating'
}

/**
 * "Redo this shot" só existe para plano pronto de anúncio ENTREGUE, com preço conhecido — e NUNCA para `text`
 * (foto parada com zoom: não passa por IA, então não há o que refazer, e mandar à IA trocaria as palavras).
 */
export function canRedoShot(shot: Pick<AdsV2ScreenShot, 'kind' | 'status' | 'state' | 'retake_credits'>, orderStatus: string): boolean {
  if (shot.kind === 'text') return false
  // O vídeo do cliente também não (não passa por IA; outro trecho = planejar de novo, grátis).
  if (shot.kind === 'user_video') return false
  if (orderStatus !== 'delivered') return false
  if (shot.state !== 'ready' || shot.status !== 'done') return false
  return Number.isInteger(shot.retake_credits) && shot.retake_credits > 0
}

// ── Frase do negócio ───────────────────────────────────────────────────────────────────────────────────────────────
/** Espelho de ADS_V2_SENTENCE_MAX_CHARS (lib/ads/v2Contract.ts). */
export const ADS_V2_SCREEN_SENTENCE_MAX = 400

/**
 * A frase que vai ao servidor: o nome do negócio entra se a pessoa não o escreveu (o plano recusa brief sem nome).
 * Sem frase = null (vale o link). Passou do limite = 'too_long'.
 */
export function composeSentence(business: string, sentence: string): string | null | 'too_long' {
  const s = sentence.replace(/\s+/g, ' ').trim()
  if (!s) return null
  const b = business.replace(/\s+/g, ' ').trim()
  const out = !b || s.toLowerCase().includes(b.toLowerCase()) ? s : `${b}: ${s}`
  return out.length > ADS_V2_SCREEN_SENTENCE_MAX ? 'too_long' : out
}

// ── Erros das rotas → frase que explica e diz o que fazer ──────────────────────────────────────────────────────────
export function adsV2ErrorMessage(code: string | null | undefined, extra: { needed?: number; balance?: number; credits?: number; message?: string } = {}): string {
  if (typeof code === 'string' && code.startsWith('moderation_')) {
    return extra.message || 'Our safety check could not look at this text right now. Nothing was charged. Try again in a minute.'
  }
  switch (code) {
    case 'network':
      return 'No connection. Check your internet and try again.'
    case 'unauthenticated':
      return 'Your session ended. Sign in again, then come back to this page.'
    case 'no_access':
    case 'closed':
      return 'Studio Ads is not available on your account right now. Open the Studio Ads page to see how to get it.'
    case 'v2_closed':
      return 'This new ad maker is still in private testing and is not open for your account yet.'
    case 'not_ready':
      return 'The new ad maker is not switched on yet. Nothing was charged. Try again later.'
    case 'unavailable':
      return 'Planning is unavailable for a moment. Nothing was charged. Try again in a minute.'
    case 'sentence_or_link_required':
      return 'Write one sentence about your business, or paste its website or Instagram link.'
    case 'sentence_too_long':
      return 'Your sentence is too long. Keep it under 400 characters, business name included.'
    case 'bad_link':
      return 'That link does not look right. Paste the full address, starting with https://'
    case 'link_unreachable':
      return 'We could not read that link. Write one sentence about your business instead.'
    case 'brief_needs_business':
      return 'We could not tell which business this is. Write the business name in your sentence and plan again.'
    case 'too_few_photos':
      return 'Add at least 3 photos of your business.'
    case 'too_many_photos':
      return 'Use at most 7 photos. Remove the weakest ones.'
    case 'media_not_owned':
    case 'bad_photo_id':
    case 'logo_invalid':
    case 'card_invalid':
      return 'One of your files did not upload correctly. Remove it, add it again, and plan again.'
    case 'duplicate_photo':
    case 'logo_is_photo':
      return 'The same image is used twice. Each photo (and the logo) must be a different file.'
    case 'bad_sector':
      return 'Choose the kind of business first.'
    case 'daily_limit':
      return 'You planned many ads today. Come back tomorrow, or make one of the plans you already have.'
    case 'no_copy':
    case 'plan_prompts_invalid':
      return 'We could not write the words for this ad without inventing facts. Add a little more detail to your sentence (what you sell, your offer) and plan again.'
    case 'moderation':
      return extra.message || 'This ad cannot be made: the text breaks our content rules. Change the sentence and plan again.'
    case 'order_not_found':
      return 'We could not find this ad. Start over to make a new one.'
    case 'not_editable':
    case 'not_startable':
      return 'This plan was already used. Plan again to make a new ad.'
    case 'replan_needed':
      return 'This plan was made without a voice-over. Plan again to get one.'
    case 'plan_required':
      return 'Plan your ad first.'
    case 'card_required':
      return 'Your end card is missing. Check the business name and logo, then try again.'
    case 'out_of_credits':
      return typeof extra.needed === 'number'
        ? `This ad needs ${extra.needed} credits${typeof extra.balance === 'number' ? ` and you have ${extra.balance}` : ''}. Get credits and come back: your plan stays on this page.`
        : 'You do not have enough credits for this. Get credits and come back: your plan stays on this page.'
    case 'another_active':
      return 'Another ad of yours is still being made. When it is ready (it lands in My Videos), you can start this one.'
    case 'intent_failed':
    case 'debit_unconfirmed':
    case 'debit_mismatch':
    case 'debit_refunded':
      return 'We could not confirm the credits for this ad, so nothing was made. If credits left your balance, they come back on their own. Try again in a minute.'
    case 'price_changed':
      return typeof extra.credits === 'number'
        ? `Redoing this shot now costs ${extra.credits} credits. Check the new price and try again.`
        : 'The price of redoing this shot changed. Check the new price and try again.'
    case 'text_not_retakable':
      return 'Screen or text shots are stills, so every word stays exact. There is nothing to redo.'
    // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — vídeo do cliente (entra como vídeo).
    case 'video_not_retakable':
      return 'This shot is your own video, used as you filmed it (no AI), so there is nothing to redo. To use another part of it, plan the ad again (free).'
    case 'video_unreadable':
    case 'video_invalid':
      return 'We could not read one of your videos on our side, so it now goes in as photos taken from it. Plan again (free).'
    case 'video_too_short':
      return 'One of your videos is shorter than 3 seconds, so it now goes in as photos taken from it. Plan again (free).'
    case 'too_many_videos':
      return 'Up to 2 videos go in as video. Remove one, or it goes in as photos.'
    case 'bad_video':
    case 'bad_video_id':
    case 'bad_videos':
      return 'One of your videos did not upload correctly. Remove it, add it again and plan again.'
    case 'shot_not_ready':
    case 'not_delivered':
      return 'This shot can be redone only after the ad is ready.'
    case 'bad_idx':
      return 'We could not find that shot. Reload the page and try again.'
    default:
      return 'Something went wrong on our side. Nothing new was charged. Try again.'
  }
}

/**
 * Anúncio que falhou: o que dizer (o estorno é automático — failAdsV2Order só falha quem não tem vídeo entregue).
 * REVISÃO 28/09: a REFAÇÃO que falha (pedido com parent_order_id) estorna só a refação e o anúncio do pai continua
 * entregue — dizer "This ad did not work" ali assustava quem tem o anúncio pronto em My Videos.
 */
export function failedOrderMessage(error: string | null | undefined, redo = false): string {
  const e = String(error ?? '')
  if (redo) {
    if (/^charge_/.test(e)) return 'We could not confirm the credits for this redo, so it was not made. If credits left your balance, they come back on their own. Your ad is still in My Videos, exactly as it was.'
    return 'We could not redo this shot. The credits for the redo go back to your balance automatically. Your ad is still in My Videos, exactly as it was.'
  }
  if (/^charge_/.test(e)) return 'We could not confirm the credits for this ad, so it was not made. If credits left your balance, they come back on their own.'
  if (/moderation/.test(e)) return 'This ad could not be finished because of our content rules. Its credits go back to your balance automatically.'
  return 'We could not finish this ad. Its credits go back to your balance automatically. You can plan it again from your photos.'
}

// ── Prévia do plano: o que cada plano mostra ───────────────────────────────────────────────────────────────────────
export const ADS_V2_ROLE_LABELS: Readonly<Record<string, string>> = {
  hook: 'Hook',
  desire: 'Desire',
  use: 'In use',
  emotion: 'The feeling',
  place: 'Your place',
  product: 'Your product',
}

/** Uma linha, em linguagem de dono de negócio, do que o plano vai mostrar. */
export function describeShot(shot: { kind: string; source: string }): string {
  if (shot.kind === 'text') return 'Your photo as a still with a slow zoom, so every word stays exactly right'
  if (shot.kind === 'user_video') return 'Your own video, as you filmed it: a short part, muted, no AI'
  if (shot.source === 'generated_scene') return 'A new scene of everyday people enjoying it, created from your photos'
  if (shot.kind === 'product_hero') return 'A hero close-up of your product, from your photo'
  return 'Your photo, brought to life with one slow camera move'
}

/** Nome de arquivo do download a partir do nome do negócio. */
export function adFileSlug(business: string): string {
  const s = business
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return s || 'studio'
}
