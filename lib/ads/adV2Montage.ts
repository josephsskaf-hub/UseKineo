// KINEO-ADS-V2-2026-09-28 — montador próprio do anúncio v2 (FORA do /api/compose).
//
// Por que não o /api/compose: ele recusa URL da fal no modo fast, exige narração e não aceita 15 s
// (SUPPORTED_DURATIONS). E o nome deste arquivo NUNCA começa com lib/compose: a trava 8.2
// (scripts/test-despacho-vazio-2026-09-04.mjs) confere o diff por PREFIXO.
//
// Devolve o `source` do Creatomate no MESMO formato que lib/compose.ts entrega a submitCreatomateRender (ver
// buildHollywoodCreatomateSource): { output_format:'mp4', width, height, frame_rate, duration, elements[] }, com
// elementos type/track/time/duration/source/fit/x/y/width/height/volume/enter_transition/animations. submitCreatomateRender
// passa o source por withSnapshotRequest, que respeita o snapshot_time já presente (aqui 1 s: o gancho).
//
// Linha do tempo (especificação, seção 6): planos na ordem, cada um usando um TRECHO do clipe
// (trim_start + duração ≤ duração medida), dissolve curto, plano `text` = foto parada com zoom lento de ~1,08x,
// 2-3 frases no terço do meio (fora dos 14% de cima e dos 35% de baixo), voz a partir de 0,3 s, música por baixo
// (~25% com voz, ~70% sem), cartão final de 2,5 s. Duração total = soma EXATA dos cortes + cartão. Sem marca d'água
// (o v2 exige acesso pago) e sem legenda palavra por palavra.
//
// LIB PURA (nenhum import): RECT_PATH é CÓPIA de lib/compose.ts (guardião de espelho); frame_rate 24 é o padrão de
// lib/renderProfile.ts (DEFAULT_RENDER_PROFILE.fps, também espelhado no guardião).

export const ADS_V2_RECT_PATH = 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z'
export const ADS_V2_FRAME_RATE = 24
/** Dissolve entre planos e na entrada do cartão (o elemento anterior dura este tempo a mais, por baixo do seguinte). */
export const ADS_V2_MONTAGE_FADE = 0.25
export const ADS_V2_TEXT_ZOOM_END = '108%'
export const ADS_V2_VOICE_START = 0.3
export const ADS_V2_MUSIC_VOLUME_WITH_VOICE = '25%'
export const ADS_V2_MUSIC_VOLUME_NO_VOICE = '70%'
/** Zona segura das frases: nada acima de 14% nem abaixo de 65% da altura (35% de baixo é da interface das redes). */
export const ADS_V2_SAFE_TOP = 0.14
export const ADS_V2_SAFE_BOTTOM = 0.65
/** Caixa das frases: centro em 45%, altura 18% → de 36% a 54%, dentro do terço do meio. */
export const ADS_V2_OVERLAY_Y = 0.45
export const ADS_V2_OVERLAY_H = 0.18
export const ADS_V2_MAX_OVERLAYS = 3

export type AdV2MontageShotKind = 'people' | 'place' | 'product' | 'product_hero' | 'text'

export interface AdV2MontageShot {
  url: string
  kind: AdV2MontageShotKind
  /** Início do trecho usado dentro do clipe gerado (s). Ignorado no plano `text` (imagem). */
  cutStart: number
  /** Tempo do plano na linha do tempo (s). */
  cutSeconds: number
  /** Duração MEDIDA do clipe copiado para o bucket (mvhd). Obrigatória fora do plano `text`. */
  measuredSeconds: number | null
}

export interface AdV2Overlay {
  text: string
  start: number
  end: number
}

export interface AdV2MontageInput {
  width: number
  height: number
  shots: readonly AdV2MontageShot[]
  overlays: readonly AdV2Overlay[]
  fontFamily: string
  cardUrl: string
  cardSeconds?: number
  musicUrl: string | null
  voiceUrl?: string | null
  voiceSeconds?: number | null
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000
const pct = (f: number): string => `${r3(f * 100)}%`
const isHttps = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())
const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

export function buildAdV2Source(input: AdV2MontageInput): Record<string, unknown> {
  const { width, height } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width % 2 || height % 2) {
    throw new Error('ads_v2_montage_bad_size')
  }
  const shots = Array.isArray(input.shots) ? input.shots : []
  if (shots.length === 0) throw new Error('ads_v2_montage_no_shots')
  if (!isHttps(input.cardUrl)) throw new Error('ads_v2_montage_bad_card')
  const cardSeconds = input.cardSeconds ?? 2.5
  if (!finitePos(cardSeconds)) throw new Error('ads_v2_montage_bad_card_seconds')
  const fontFamily = typeof input.fontFamily === 'string' && input.fontFamily.trim() ? input.fontFamily.trim() : ''
  if (!fontFamily) throw new Error('ads_v2_montage_bad_font')

  const elements: Record<string, unknown>[] = []
  let cursor = 0
  const starts: number[] = []
  shots.forEach((shot, i) => {
    if (!isHttps(shot?.url)) throw new Error(`ads_v2_montage_bad_url:${i}`)
    if (!finitePos(shot.cutSeconds)) throw new Error(`ads_v2_montage_bad_cut:${i}`)
    starts.push(r3(cursor))
    cursor = r3(cursor + shot.cutSeconds)
  })
  const shotsSeconds = r3(cursor)
  const total = r3(shotsSeconds + cardSeconds)

  // Fundo preto por baixo de tudo (mesma receita do compose: shape só desenha com path).
  elements.push({
    type: 'shape', track: 1, time: 0, duration: total,
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: ADS_V2_RECT_PATH, fill_color: '#000000',
  })

  shots.forEach((shot, i) => {
    // Cada plano fica ADS_V2_MONTAGE_FADE a mais por baixo do seguinte (ou do cartão), que entra com fade: dissolve.
    const duration = r3(shot.cutSeconds + ADS_V2_MONTAGE_FADE)
    const transition = i > 0 ? { enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE } } : {}
    if (shot.kind === 'text') {
      // Texto nunca passa por IA: a foto entra parada e o montador faz um zoom lento de ~1,08x.
      elements.push({
        type: 'image', track: 2, time: starts[i], duration,
        source: shot.url.trim(), fit: 'cover',
        x: '50%', y: '50%', width: '100%', height: '100%',
        ...transition,
        animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_TEXT_ZOOM_END, easing: 'linear' }],
      })
      return
    }
    const cutStart = shot.cutStart
    if (typeof cutStart !== 'number' || !Number.isFinite(cutStart) || cutStart < 0) throw new Error(`ads_v2_montage_bad_trim:${i}`)
    if (!finitePos(shot.measuredSeconds)) throw new Error(`ads_v2_montage_unmeasured:${i}`)
    // O trecho usado (com o dissolve) tem de caber no clipe medido: nada de loop nem de quadro congelado no fim.
    if (r3(cutStart + duration) > r3(shot.measuredSeconds)) {
      throw new Error(`ads_v2_montage_trim_past_clip:${i}:${r3(cutStart + duration)}>${r3(shot.measuredSeconds)}`)
    }
    elements.push({
      type: 'video', track: 2, time: starts[i], duration,
      source: shot.url.trim(), fit: 'cover', loop: false, trim_start: r3(cutStart),
      x: '50%', y: '50%', width: '100%', height: '100%',
      // Áudio do motor sempre mudo (o H3 gera áudio mesmo sem pedir): o som do anúncio é voz + música.
      volume: '0%',
      ...transition,
    })
  })

  // Cartão final: PNG 1080×1920 desenhado por lib/ads/endCard.ts (logo real sobre fundo na cor da marca).
  elements.push({
    type: 'image', track: 3, time: shotsSeconds, duration: r3(cardSeconds),
    source: input.cardUrl.trim(), fit: 'cover',
    x: '50%', y: '50%', width: '100%', height: '100%',
    enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE },
  })

  // Frases de tela (2-3), no terço do meio, só sobre os planos (nunca sobre o cartão).
  const overlays = Array.isArray(input.overlays) ? input.overlays : []
  if (overlays.length > ADS_V2_MAX_OVERLAYS) throw new Error('ads_v2_montage_too_many_overlays')
  overlays.forEach((o, i) => {
    const text = typeof o?.text === 'string' ? o.text.trim() : ''
    if (!text) throw new Error(`ads_v2_montage_empty_overlay:${i}`)
    if (!(Number.isFinite(o.start) && Number.isFinite(o.end) && o.start >= 0 && o.end > o.start && o.end <= shotsSeconds)) {
      throw new Error(`ads_v2_montage_overlay_window:${i}`)
    }
    elements.push({
      type: 'text', track: 4, time: r3(o.start), duration: r3(o.end - o.start),
      text,
      x: '50%', y: pct(ADS_V2_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',
      width: '84%', height: pct(ADS_V2_OVERLAY_H),
      font_family: fontFamily, font_size: 64, font_weight: '800', line_height: '110%',
      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,
      enter_transition: { type: 'fade', duration: 0.2 },
    })
  })

  // Voz a partir de 0,3 s; recusada se passar do fim do anúncio.
  const voiceUrl = input.voiceUrl ?? null
  const hasVoice = voiceUrl !== null && voiceUrl !== ''
  if (hasVoice) {
    if (!isHttps(voiceUrl)) throw new Error('ads_v2_montage_bad_voice')
    const vs = input.voiceSeconds
    if (!finitePos(vs)) throw new Error('ads_v2_montage_voice_unmeasured')
    if (r3(ADS_V2_VOICE_START + vs) > total) throw new Error(`ads_v2_montage_voice_too_long:${r3(vs)}`)
    elements.push({
      type: 'audio', track: 5, time: ADS_V2_VOICE_START, duration: r3(vs),
      source: voiceUrl.trim(), volume: '100%',
    })
  }

  if (input.musicUrl) {
    if (!isHttps(input.musicUrl)) throw new Error('ads_v2_montage_bad_music')
    elements.push({
      type: 'audio', track: 6, time: 0, duration: total,
      source: input.musicUrl.trim(),
      volume: hasVoice ? ADS_V2_MUSIC_VOLUME_WITH_VOICE : ADS_V2_MUSIC_VOLUME_NO_VOICE,
      loop: true, audio_fade_in: 0.5, audio_fade_out: 1,
    })
  }

  return {
    output_format: 'mp4',
    width,
    height,
    frame_rate: ADS_V2_FRAME_RATE,
    duration: total,
    snapshot_time: 1,
    elements,
  }
}
