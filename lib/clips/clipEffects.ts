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
// MÓDULO PURO (só `import type`): a tela do /clips, a variante "clips-first" da home e o guardião leem o MESMO catálogo.
import type { ClipEngineKey } from './clipCatalog'

/** Interruptor dos efeitos. false = só as contas da casa veem a galeria (o fundador liga). */
export const CLIP_EFFECTS_PUBLIC = false

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
    preview: null,
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
    preview: null,
  },
  {
    key: 'cartoon_3d',
    title: 'Turn into a 3D cartoon',
    sub: 'Your photo as an animated 3D movie character.',
    engine: 'seedance',
    seconds: 5,
    prompt: `Transform the photo into a polished 3D animated movie style: the same person and pose as a stylized 3D cartoon character with soft lighting, then a short playful animation — a wave and a smile to camera. ${NO_TEXT}`,
    filmIdea: 'An animated 60-second adventure starring this character',
    person: true,
    preview: null,
  },
  {
    key: 'color_burst',
    title: 'Color and particle burst',
    sub: 'An explosion of color and light around your subject.',
    engine: 'kling',
    seconds: 5,
    prompt: `A vivid burst of colored powder and glowing particles explodes around the subject of the photo in slow motion, colors swirling in the air, cinematic backlight, subject stays sharp and unchanged. ${NO_TEXT}`,
    filmIdea: 'A celebration in 60 seconds — the story behind this moment',
    person: false,
    preview: null,
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
 * O upsell para o produto 2: o Studio abre com a ideia sugerida do efeito (o Studio novo lê ?prompt=&engine=&duration=;
 * NADA dispara sozinho — a pessoa aperta Gerar). A foto do clipe vai junto como referência quando o Studio a ler.
 */
export function clipEffectFilmHref(effect: ClipEffect, args?: { photoUrl?: string | null }): string {
  const q = new URLSearchParams({ prompt: effect.filmIdea, engine: 'seedance', duration: '60', intent_campaign: `clip_effect_${effect.key}` })
  if (args?.photoUrl && /^https:\/\//.test(args.photoUrl)) q.set('ref_image', args.photoUrl)
  return `/studio?${q.toString()}`
}
