// KINEO-CLIPS-PRIMEIRO-2026-10-05 — EFEITOS DE 1 CLIQUE (a porta de entrada no estilo dos concorrentes de clipe).
//
// Decisão do fundador (04/10): a Kineo passa a ter 2 produtos — PRODUTO 1 = CLIPES (entrada), PRODUTO 2 = FILME NARRADO
// (premium, o que já existe). O que fez os concorrentes de clipe crescerem foi o efeito de 1 clique: foto → clipe em ~1 min,
// compartilhável. Cada efeito aqui = a foto da pessoa + um prompt FIXO por trás + motor e duração definidos. A pessoa não
// escreve nada; o pedido vai pela MESMA rota do /clips (app/api/clips: moderação de entrada, débito, estorno, moderação no
// fim), então o preço é o do clipe de sempre (lib/clips/clipPricing.ts clipCreditCost) — nenhuma tabela nova.
//
// PRÉVIAS HONESTAS: só aponta um clipe da casa quando ele de fato mostra o efeito; senão `preview: null` e a tela mostra um
// placeholder marcado. NADA de render pago para criar prévia (regra da sessão). O selo é o motor real.
//
// MÓDULO PURO (só imports relativos de módulos puros: ./clipCatalog e ./clipPricing): a tela do /clips, a variante
// "clips-first" da home, a rota e o guardião (scripts/test-clip-efeitos-2026-10-05.mjs) leem o MESMO catálogo.
//
// KINEO-CLIP-EFEITOS-2026-10-05 — o SERVIDOR resolve o efeito: o navegador manda só `effect` (chave) + a foto; prompt,
// motor, duração e formato saem daqui (resolveClipEffectRequest) e o resto do pedido segue o submitClip de sempre
// (moderação de entrada, saldo, débito, estorno, MP4 no nosso bucket). Interruptor antes de tudo: efeito com
// CLIP_EFFECTS_PUBLIC=false e conta de fora → 404, nada lido nem cobrado.
import { CLIP_ENGINES, type ClipEngineKey, type ClipRequestInput } from './clipCatalog'
import { clipCreditCost } from './clipPricing'

/** Interruptor dos efeitos. false = só as contas da casa veem a galeria (o fundador liga). */
export const CLIP_EFFECTS_PUBLIC = true // fundador 05/10: ligar tudo

export type ClipEffectKey =
  | 'bring_to_life'
  | 'product_360'
  | 'zoom_out_earth'
  | 'cinematic_slowmo'
  | 'restore_old_photo'
  | 'cartoon_3d'
  | 'color_burst'
  | 'storm_behind'

export interface ClipEffectPreview {
  video: string
  poster?: string
  /** O que a prévia é de verdade (selo honesto na galeria). */
  note: string
}

export interface ClipEffect {
  key: ClipEffectKey
  /** Rótulo da galeria (inglês; a tela traduz pelo dicionário). */
  title: string
  /** Uma linha: o que acontece com a foto. */
  sub: string
  engine: ClipEngineKey
  seconds: number
  /** Prompt fixo enviado com a foto (inglês, sem marca, sem pessoa famosa nomeada). */
  prompt: string
  /** Ideia sugerida para o upsell "Transformar em filme narrado" (o Studio abre com ela). */
  filmIdea: string
  /** O efeito pede rosto/pessoa na foto? (só para a dica da tela; a moderação é a de sempre). */
  person: boolean
  preview: ClipEffectPreview | null
}

const NO_TEXT = 'No text, no captions, no logos, no watermark.'

export const CLIP_EFFECTS: readonly ClipEffect[] = [
  {
    key: 'bring_to_life',
    title: 'Bring your photo to life',
    sub: 'Natural breathing, a soft smile and a gentle head turn.',
    engine: 'seedance',
    seconds: 5,
    prompt: `The person in the photo comes to life: natural breathing, a soft genuine smile, blinking, a gentle head turn toward the camera, hair moving slightly. Keep the exact face, outfit and background. Subtle handheld camera. ${NO_TEXT}`,
    filmIdea: 'The story behind this photo — who this person is and the moment it was taken',
    person: true,
    preview: { video: '/previews/216cbed2-b95f-47e7-98bc-e4c3fc3010a9.mp4', note: 'House film: a face brought to life (Kling 3)' },
  },
  {
    key: 'product_360',
    title: 'Product turning 360°',
    sub: 'Your product spins on a clean studio turntable.',
    engine: 'kling',
    seconds: 5,
    prompt: `The product from the photo rotates a full 360 degrees on a turntable in a clean studio, soft key light, glossy reflections, smooth constant speed, product perfectly centered and unchanged in shape and color. ${NO_TEXT}`,
    filmIdea: 'Why this product is different — a 60-second ad that shows what it does',
    person: false,
    preview: { video: '/previews/promo-ads-3var-1.mp4', poster: '/posters/promo-ads-3var-1.webp', note: 'House ad made from product photos (Kling 2.5)' },
  },
  {
    key: 'zoom_out_earth',
    title: 'Zoom out to planet Earth',
    sub: 'From your photo straight up to space in one move.',
    engine: 'kling',
    seconds: 5,
    prompt: `Start exactly on the photo, then the camera pulls straight up and away in one continuous accelerating move: rooftops, the city, the coastline, clouds, until the whole planet Earth is visible from space. ${NO_TEXT}`,
    filmIdea: 'This place seen from above — what makes it special, told in 60 seconds',
    person: false,
    preview: { video: '/previews/efeito-zoom_out_earth.mp4', poster: '/posters/efeito-zoom_out_earth.webp', note: 'Made with this effect from an AI-generated photo (Kling 2.5)' }, // KINEO-PREVIAS-EFEITOS-2026-10-05
  },
  {
    key: 'cinematic_slowmo',
    title: 'Cinematic slow motion',
    sub: 'Your moment in dramatic movie slow motion.',
    engine: 'kling',
    seconds: 5,
    prompt: `Turn the photo into a dramatic cinematic slow-motion shot: everything moves at 120 fps slow motion, dust and light particles floating, shallow depth of field, gentle dolly-in, movie color grade. Keep the scene and people unchanged. ${NO_TEXT}`,
    filmIdea: 'The moment in this photo as an epic 60-second story',
    person: true,
    preview: { video: '/previews/c6bdbcfb-ffc2-48e1-be15-e26fb048fe9a.mp4', note: 'House film in cinematic slow motion (Kling 2.5)' },
  },
  {
    key: 'restore_old_photo',
    title: 'Restore and animate an old photo',
    sub: 'An old photo, sharpened and gently brought to life.',
    engine: 'seedance',
    seconds: 5,
    prompt: `Restore the old photograph: sharper detail, cleaned scratches, natural color, then animate it gently — subtle breathing, a slight smile, blinking, light camera push-in. Keep every face exactly as it is. ${NO_TEXT}`,
    filmIdea: 'The story of the people in this old photo and the year it was taken',
    person: true,
    preview: { video: '/previews/efeito-restore_old_photo.mp4', poster: '/posters/efeito-restore_old_photo.webp', note: 'Made with this effect from an AI-generated photo (Seedance 1.5)' }, // KINEO-PREVIAS-EFEITOS-2026-10-05
  },
  // KINEO-PREVIAS-EFEITOS-2026-10-05 — "Turn into a 3D cartoon" SAIU da galeria: testado em Seedance 1.5 e Kling 2.5 a partir
  // de foto, o motor de vídeo preserva o rosto real e só anima (a pessoa acena, não vira desenho). Volta quando houver
  // uma etapa de estilização da foto (ex.: edição de imagem para 3D) ANTES do vídeo.
  {
    key: 'color_burst',
    title: 'Color and particle burst',
    sub: 'An explosion of color and light around your subject.',
    engine: 'kling',
    seconds: 5,
    prompt: `A vivid burst of colored powder and glowing particles explodes around the subject of the photo in slow motion, colors swirling in the air, cinematic backlight, subject stays sharp and unchanged. ${NO_TEXT}`,
    filmIdea: 'A celebration in 60 seconds — the story behind this moment',
    person: false,
    preview: { video: '/previews/efeito-color_burst.mp4', poster: '/posters/efeito-color_burst.webp', note: 'Made with this effect from an AI-generated photo (Kling 2.5)' }, // KINEO-PREVIAS-EFEITOS-2026-10-05
  },
  {
    key: 'storm_behind',
    title: 'Storm in the background',
    sub: 'Lightning and rolling clouds behind your photo.',
    engine: 'kling',
    seconds: 5,
    prompt: `Keep the foreground subject exactly as in the photo while a dramatic storm builds behind: dark rolling clouds, lightning strikes on the horizon, wind moving hair and clothes, cinematic lighting flashes. ${NO_TEXT}`,
    filmIdea: 'The night the storm came — a 60-second dramatic story',
    person: false,
    preview: { video: '/previews/4b12925e-avalanche.mp4', note: 'House film: storm and lightning (Kling 3)' },
  },
]

export function clipEffectByKey(key: unknown): ClipEffect | null {
  return CLIP_EFFECTS.find((e) => e.key === key) ?? null
}

/** A galeria aparece para esta conta? Público depois do "vai"; antes, só a casa. */
export function clipEffectsVisible(isInternal: boolean, publicFlag: boolean = CLIP_EFFECTS_PUBLIC): boolean {
  return publicFlag === true || isInternal === true
}

/**
 * O upsell para o produto 2: o Studio abre com a ideia sugerida do efeito (o Studio novo lê ?prompt=&engine=&duration=&
 * intent_campaign=; NADA dispara sozinho — a pessoa aperta Gerar).
 * KINEO-CLIP-EFEITOS-2026-10-05 — a foto NÃO viaja: o Studio (app/(dashboard)/studio/StudioClient.tsx) não lê nenhum
 * parâmetro de imagem de referência, então o `ref_image` saiu do link (era peso morto e expunha a URL da foto no
 * histórico/referrer). O argumento `args.photoUrl` fica na assinatura para os chamadores não quebrarem no dia em que o
 * Studio passar a ler a foto — pendência da sessão dona do Studio.
 */
export function clipEffectFilmHref(effect: ClipEffect, _args?: { photoUrl?: string | null }): string {
  const q = new URLSearchParams({ prompt: effect.filmIdea, engine: 'seedance', duration: '60', intent_campaign: `clip_effect_${effect.key}` })
  return `/studio?${q.toString()}`
}

// ─── KINEO-CLIP-EFEITOS-2026-10-05 — servidor, preço, eventos ───────────────
/** Eventos do efeito — todos escritos SÓ pelo servidor (estão em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const CLIP_EFFECT_EVENTS = ['clip_effect_chosen', 'clip_effect_ready', 'clip_effect_film_upsell_clicked'] as const

/**
 * Créditos do clipe de um efeito = o preço do clipe de sempre (lib/clips/clipPricing.ts), com a MESMA chamada que o
 * submitClip faz na hora do débito (efeito é sempre com foto → withImage=true; hoje a fal cobra igual com e sem foto).
 */
export function clipEffectCredits(effect: ClipEffect): number {
  return clipCreditCost(effect.engine, effect.seconds, true)
}

/** O que a galeria recebe do GET /api/clips — sem o prompt (o navegador não precisa dele nem o manda de volta). */
export interface PublicClipEffect {
  key: ClipEffectKey
  title: string
  sub: string
  engine: ClipEngineKey
  /** Selo honesto: o motor REAL que faz o clipe deste efeito. */
  engine_label: string
  seconds: number
  credits: number
  person: boolean
  preview: ClipEffectPreview | null
}

/** Cartões da galeria, só com os motores que a conta pode apertar (a rota recusa o resto com a mesma régua). */
export function publicClipEffects(engineOk: (engine: ClipEngineKey) => boolean): PublicClipEffect[] {
  return CLIP_EFFECTS.filter((e) => engineOk(e.engine)).map((e) => ({
    key: e.key,
    title: e.title,
    sub: e.sub,
    engine: e.engine,
    engine_label: CLIP_ENGINES[e.engine].label,
    seconds: e.seconds,
    credits: clipEffectCredits(e),
    person: e.person,
    preview: e.preview,
  }))
}

/** O corpo do POST pede um efeito? (campo ausente/vazio = o clipe livre de sempre). */
export function wantsClipEffect(raw: unknown): boolean {
  return raw !== undefined && raw !== null && raw !== ''
}

export type ClipEffectResolution =
  | { ok: true; effect: ClipEffect; body: ClipRequestInput }
  | { ok: false; status: number; code: string; error: string }

/**
 * O servidor transforma `effect` (chave) + foto no pedido do clipe. A ordem é o contrato:
 *   1. interruptor (CLIP_EFFECTS_PUBLIC / conta da casa) — fora dele, 404 sem ler nada;
 *   2. chave do catálogo — desconhecida, 400;
 *   3. foto obrigatória (efeito é sempre image-to-video) — sem foto, 400;
 *   4. prompt, motor, duração e formato SAEM DO CATÁLOGO. Nada do navegador além da foto entra no pedido: `prompt`,
 *      `engine`, `seconds` e `aspect` que vierem no corpo são ignorados.
 * A posse da foto, a moderação, o saldo, o débito e o estorno continuam no submitClip, idênticos ao clipe livre.
 */
export function resolveClipEffectRequest(raw: unknown, ctx: { visible: boolean; imageUrl: unknown }): ClipEffectResolution {
  if (ctx.visible !== true) return { ok: false, status: 404, code: 'not_found', error: 'Not found.' }
  const effect = clipEffectByKey(raw)
  if (!effect) return { ok: false, status: 400, code: 'effect', error: 'Choose one of the listed effects.' }
  const imageUrl = typeof ctx.imageUrl === 'string' ? ctx.imageUrl.trim() : ''
  if (!imageUrl) return { ok: false, status: 400, code: 'effect_photo', error: 'This effect starts from your photo. Add a photo first.' }
  return { ok: true, effect, body: { engine: effect.engine, seconds: effect.seconds, aspect: null, prompt: effect.prompt, imageUrl } }
}

/**
 * Qual efeito gerou esta linha de `clips`? O prompt do efeito é fixo e só o servidor o escreve, então prompt + motor +
 * duração + foto identificam o efeito sem coluna nova na tabela. (Se o texto de um efeito mudar no catálogo, os clipes
 * antigos dele deixam de ser reconhecidos — perdem só o botão do upsell e o evento de pronto.)
 */
export function clipEffectForRow(row: { prompt: string; engine: string; seconds: number; mode: string }): ClipEffect | null {
  if (row.mode !== 'image') return null
  return CLIP_EFFECTS.find((e) => e.prompt === row.prompt && e.engine === row.engine && e.seconds === row.seconds) ?? null
}

/** Metadata dos eventos do efeito: só a forma do pedido (sem foto, texto ou e-mail). */
export function clipEffectEventMetadata(effect: ClipEffect, clip: { id: string; credits: number }): Record<string, unknown> {
  return { effect: effect.key, engine: effect.engine, seconds: effect.seconds, credits: clip.credits, clip_id: clip.id }
}
