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

export type AdV2MontageShotKind = 'people' | 'place' | 'product' | 'product_hero' | 'text' | 'user_video'

export interface AdV2MontageShot {
  url: string
  kind: AdV2MontageShotKind
  /** Início do trecho usado dentro do clipe gerado (s). Ignorado no plano `text` (imagem). */
  cutStart: number
  /** Tempo do plano na linha do tempo (s). */
  cutSeconds: number
  /** Duração MEDIDA do clipe copiado para o bucket (mvhd). Obrigatória fora do plano `text`. */
  measuredSeconds: number | null
  /** Só no 'user_video': ponto focal (0..1) e dimensões do vídeo do cliente, para o recorte 9:16. */
  focusX?: number
  focusY?: number
  videoWidth?: number | null
  videoHeight?: number | null
}

/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do próprio cliente entra com um zoom lento (o mesmo movimento suave que
 * o montador já dá à foto de texto, e a MESMA propriedade `animations: scale` que lib/compose.ts usa em elemento de vídeo
 * em produção), mudo (o som do anúncio é voz + música), sem loop e só com o trecho escolhido.
 */
export const ADS_V2_USER_VIDEO_ZOOM_END = '105%'
/** Diferença de proporção abaixo da qual o vídeo já é 9:16 (ex.: 464×832) e entra com o recorte central de sempre. */
export const ADS_V2_USER_VIDEO_ASPECT_TOLERANCE = 0.02

/**
 * Enquadramento 9:16 do vídeo do cliente SEM propriedade nova: o elemento ganha a proporção do próprio vídeo (fit cover
 * sem corte interno) e é deslocado por x/y, sempre cobrindo o quadro inteiro.
 * O foco (fx, fy) tem o MESMO sentido da prévia (cropRect/focalPosition/panFocal, lib/ads/v2Screen.ts): é a POSIÇÃO da
 * janela 9:16 dentro do vídeo (0 = encostada à esquerda/topo, 1 = à direita/base), não o ponto que fica no centro.
 * Revisão 29/09: antes o fx era tratado como centro e o recorte do render saía até 30% do quadro fora do escolhido.
 * Dimensões desconhecidas ou vídeo já vertical = recorte ao centro (100% × 100%), como qualquer outro plano.
 */
export function userVideoFrame(frameW: number, frameH: number, videoW: unknown, videoH: unknown, focusX: unknown, focusY: unknown): { x: string; y: string; width: string; height: string } {
  const centered = { x: '50%', y: '50%', width: '100%', height: '100%' }
  if (!finitePos(videoW) || !finitePos(videoH) || !finitePos(frameW) || !finitePos(frameH)) return centered
  const F = frameW / frameH
  const A = videoW / videoH
  if (Math.abs(A / F - 1) < ADS_V2_USER_VIDEO_ASPECT_TOLERANCE) return centered
  const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5)
  if (A > F) {
    const ew = A / F
    const cx = clamp01(focusX) * (1 - 1 / ew) + 1 / (2 * ew)
    return { x: pct(0.5 + ew * (0.5 - cx)), y: '50%', width: pct(ew), height: '100%' }
  }
  const eh = F / A
  const cy = clamp01(focusY) * (1 - 1 / eh) + 1 / (2 * eh)
  return { x: '50%', y: pct(0.5 + eh * (0.5 - cy)), width: '100%', height: pct(eh) }
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
  /** De onde a música começa (s) — o início medido da faixa (lib/ads/v2Music.ts); 0 fora da biblioteca. */
  musicTrimStart?: number
  voiceUrl?: string | null
  voiceSeconds?: number | null
  /**
   * KINEO-ADS-3VAR-COR-2026-09-30 — véu de cor das 3 variações ('rgba(r,g,b,a)', lib/ads/v2Variations.ts ADS_V2_LOOKS.tint).
   * Ausente/null = anúncio comum, source idêntico ao de antes.
   */
  tint?: string | null
  /**
   * KINEO-ATOR-ANUNCIO-2026-10-09 — o ATOR (lib/ads/v2Presenter.ts): o vídeo falado vira a trilha BASE do anúncio e os
   * planos de `shots` entram só como inserts curtos por cima. Ausente/null = o anúncio de sempre, source idêntico ao de
   * antes. Com ator, `voiceUrl` é IGNORADO: a voz é o áudio do próprio ator (nunca duas vozes).
   */
  presenter?: AdV2PresenterInput | null
}

/** KINEO-ATOR-ANUNCIO-2026-10-09 — o vídeo do ator, já no NOSSO bucket e medido, e a ordem preferida dos inserts. */
export interface AdV2PresenterInput {
  url: string
  /** Duração MEDIDA do vídeo falado (mvhd): a fala inteira mora nele. */
  measuredSeconds: number
  /** Posições em `shots` na ordem de preferência dos inserts (estilo → herói → produto → lugar → gente → vídeo). */
  insertOrder: readonly number[]
}

/** Véu aceito: rgba com alfa entre 0,05 e 0,3 (mais que isso lava a foto). */
export const ADS_V2_TINT_RE = /^rgba\(\d{1,3},\d{1,3},\d{1,3},0\.(?:0[5-9]|[12]\d?|30?)\)$/
/** Trilha do véu: acima de tudo o que é visual (1 fundo · 2 planos · 3 cartão · 4 frases), abaixo de nada. */
export const ADS_V2_TINT_TRACK = 7

/** A música sobe quando a voz acaba: começa a subir este tempo depois do fim da voz. */
export const ADS_V2_MUSIC_RISE_AFTER_VOICE = 0.2

const r3 = (n: number): number => Math.round(n * 1000) / 1000
const pct = (f: number): string => `${r3(f * 100)}%`
const isHttps = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())
const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

export function buildAdV2Source(input: AdV2MontageInput): Record<string, unknown> {
  // KINEO-ATOR-ANUNCIO-2026-10-09 — com ator, outra linha do tempo (abaixo); sem ator, nada muda daqui para baixo.
  if (input.presenter !== undefined && input.presenter !== null) return buildAdV2PresenterSource(input, input.presenter)
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
    if (shot.kind === 'user_video') {
      // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do cliente: SEMPRE mudo (o áudio dele não entra; voz e música
      // seguem), sem loop, só o trecho [trim_start, trim_start + duração], recortado em 9:16 no ponto focal.
      elements.push({
        type: 'video', track: 2, time: starts[i], duration,
        source: shot.url.trim(), fit: 'cover', loop: false, trim_start: r3(cutStart),
        ...userVideoFrame(width, height, shot.videoWidth, shot.videoHeight, shot.focusX, shot.focusY),
        volume: '0%',
        ...transition,
        animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_USER_VIDEO_ZOOM_END, easing: 'linear' }],
      })
      return
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

  // KINEO-ADS-3VAR-COR-2026-09-30 — véu de cor da variação: SÓ durante os planos (o cartão do fim fica com a cor da marca).
  // Mesmas propriedades que o fundo preto acima já usa em produção (shape + path + fill_color; rgba como nas frases):
  // nada de propriedade nunca exercitada (color_overlay/blend_mode ficam de fora de propósito).
  const tint = input.tint ?? null
  if (tint !== null) {
    if (typeof tint !== 'string' || !ADS_V2_TINT_RE.test(tint)) throw new Error('ads_v2_montage_bad_tint')
    elements.push({
      type: 'shape', track: ADS_V2_TINT_TRACK, time: 0, duration: shotsSeconds,
      x: '50%', y: '50%', width: '100%', height: '100%',
      path: ADS_V2_RECT_PATH, fill_color: tint,
    })
  }

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
      // KINEO-ADS-V2-PILULA-2026-09-28 — 1ª amostra real (Kitchen Magic, cozinha branca): frase branca sumia sobre a foto
      // clara. Pílula escura que abraça a linha, com as MESMAS propriedades que a legenda do compose já usa em produção
      // (lib/compose.ts: background_color + background_x/y_padding + border_radius): nada de propriedade nunca exercitada.
      background_color: 'rgba(0,0,0,0.55)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10,
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

  // KINEO-ADS-V2-MUSICA-2026-09-29 — a música começa no início MEDIDO da faixa (a biblioteca tem faixa com 14 s de
  // silêncio na abertura: o 1º anúncio real saiu mudo do segundo 8 ao 14) e fica baixa só enquanto a voz fala:
  // trecho 1 a 25% até o fim da voz, trecho 2 a 70% até o fim, continuando a MESMA música (trim contínuo).
  if (input.musicUrl) {
    if (!isHttps(input.musicUrl)) throw new Error('ads_v2_montage_bad_music')
    const trim = input.musicTrimStart ?? 0
    if (!(typeof trim === 'number' && Number.isFinite(trim) && trim >= 0)) throw new Error('ads_v2_montage_bad_music_trim')
    const source = input.musicUrl.trim()
    // ⚠ O Creatomate NÃO aceita `loop` junto com `trim_start` no áudio (docs "Audio properties in RenderScript"):
    // o 2º canário (pedido bdba9af5, 28/09) mandou os dois e saiu SEM música nenhuma. Com início > 0 vai só o
    // trim_start (a tabela de lib/ads/v2Music.ts garante 32 s seguidos de som a partir dele); com início 0 vai só o loop.
    const musicEl = (time: number, duration: number, start: number, volume: string, fadeIn: number, fadeOut: number): Record<string, unknown> => ({
      type: 'audio', track: 6, time: r3(time), duration: r3(duration), source, volume,
      ...(start > 0 ? { trim_start: r3(start) } : { loop: true }),
      audio_fade_in: fadeIn, audio_fade_out: fadeOut,
    })
    const rise = hasVoice ? r3(ADS_V2_VOICE_START + (input.voiceSeconds as number) + ADS_V2_MUSIC_RISE_AFTER_VOICE) : 0
    if (hasVoice && rise < total - 0.5) {
      elements.push(musicEl(0, rise, trim, ADS_V2_MUSIC_VOLUME_WITH_VOICE, 0.5, 0.3))
      elements.push(musicEl(rise, total - rise, trim + rise, ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.6, 1))
    } else {
      elements.push(musicEl(0, total, trim, hasVoice ? ADS_V2_MUSIC_VOLUME_WITH_VOICE : ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.5, 1))
    }
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

// ── KINEO-ATOR-ANUNCIO-2026-10-09 — o ATOR como trilha base ──────────────────────────────────────────────────────────
// Linha do tempo com ator (decisão do fundador 09/10, "boca acompanhando a fala"):
//   · o vídeo falado entra em 0 s, com o SOM dele (é a voz do anúncio), do começo ao fim da fala;
//   · os 2,5 s de abertura são só o rosto (o gancho é a pessoa); depois, a cada ~3 s de rosto, um insert de 1,5-2,5 s
//     com uma foto animada do cliente (ou o plano do estilo) POR CIMA, mudo — a fala continua por baixo, sem corte;
//   · os últimos 2 s antes do cartão voltam ao rosto; o cartão (logo real) entra com dissolve no fim da fala;
//   · as frases de tela são as mesmas do plano, esticadas para a duração da fala; véu de cor das variações por cima;
//   · música por baixo, mais baixa que no anúncio de foto (a voz do ator vem do vídeo), e sobe depois da fala.
/** Abertura só com o rosto. */
export const ADS_V2_PRESENTER_HOOK = 2.5
/** Rosto entre um insert e o seguinte. */
export const ADS_V2_PRESENTER_GAP = 3
/** Rosto no fim, antes do cartão. */
export const ADS_V2_PRESENTER_TAIL = 2
/** Duração alvo de cada insert, e a faixa aceita. */
export const ADS_V2_PRESENTER_INSERT_SECONDS = 2
export const ADS_V2_PRESENTER_INSERT_MIN = 1.5
export const ADS_V2_PRESENTER_INSERT_MAX = 2.5
/** Fala mais curta que isto não sustenta o anúncio com ator (o chamador volta ao anúncio de sempre). */
export const ADS_V2_PRESENTER_MIN_SECONDS = 3
/** Música sob a fala do ator (a voz do vídeo do avatar chega mais baixa que a TTS pura). */
export const ADS_V2_MUSIC_VOLUME_PRESENTER = '18%'
/**
 * KINEO-ATOR-AJUSTES-2026-10-09 — frases com ATOR moram no TERÇO DE BAIXO. Canário 7112d56c (09/10): com a caixa de sempre
 * (centro 45%, terço do meio) "LUME - eau de parfum" / "Captivating fragrance selection" saíram EM CIMA DOS OLHOS da pessoa —
 * no anúncio com ator o rosto ocupa o terço do meio. Caixa com centro em 77% e a mesma altura (18%): de 68% a 86%, acima dos
 * ~12% de baixo que a interface do TikTok/Reels cobre. O texto encosta no topo da caixa (como no anúncio de sempre): a 1ª
 * linha nasce em ~68-70%. Mesmo estilo (fonte, pílula, contorno). Sem ator, a caixa de sempre (ADS_V2_OVERLAY_Y) — intocada.
 */
export const ADS_V2_PRESENTER_OVERLAY_Y = 0.77
/** Faixa de baixo que a interface das redes cobre: nada das frases do ator abaixo disto. */
export const ADS_V2_PRESENTER_SAFE_BOTTOM = 0.88
/** Começo do terço de baixo: a caixa das frases do ator nunca sobe acima disto (o rosto mora acima). */
export const ADS_V2_PRESENTER_LOWER_THIRD = 2 / 3
/** Trilhas: o ator na trilha dos planos (2); inserts na trilha do cartão (3) — nunca se cruzam no tempo. */
export const ADS_V2_PRESENTER_TRACK = 2
export const ADS_V2_PRESENTER_INSERT_TRACK = 3

export interface AdV2PresenterInsert {
  /** Posição do plano em `shots`. */
  shot: number
  time: number
  seconds: number
}

/**
 * Onde entram os inserts (pura): na ordem pedida, a partir do gancho, um a cada (insert + GAP), enquanto couber antes do
 * rosto final. Cada insert usa o MESMO trecho escolhido no plano (cutStart) e nunca passa do clipe medido. Plano de texto,
 * sem medida ou sem URL https fica de fora.
 */
export function adsV2PresenterInserts(mainSeconds: number, shots: readonly AdV2MontageShot[], order: readonly number[]): AdV2PresenterInsert[] {
  const out: AdV2PresenterInsert[] = []
  if (!finitePos(mainSeconds)) return out
  const seen = new Set<number>()
  let t = ADS_V2_PRESENTER_HOOK
  for (const i of Array.isArray(order) ? order : []) {
    if (!Number.isInteger(i) || i < 0 || i >= shots.length || seen.has(i)) continue
    seen.add(i)
    const s = shots[i]
    if (!s || s.kind === 'text' || !isHttps(s.url) || !finitePos(s.measuredSeconds) || !finitePos(s.cutSeconds)) continue
    const start = typeof s.cutStart === 'number' && Number.isFinite(s.cutStart) && s.cutStart >= 0 ? s.cutStart : 0
    const seconds = r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds, s.measuredSeconds - start))
    if (!(seconds >= ADS_V2_PRESENTER_INSERT_MIN)) continue
    if (r3(t + seconds) > r3(mainSeconds - ADS_V2_PRESENTER_TAIL)) break
    out.push({ shot: i, time: r3(t), seconds })
    t = r3(t + seconds + ADS_V2_PRESENTER_GAP)
  }
  return out
}

function buildAdV2PresenterSource(input: AdV2MontageInput, presenter: AdV2PresenterInput): Record<string, unknown> {
  const { width, height } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width % 2 || height % 2) {
    throw new Error('ads_v2_montage_bad_size')
  }
  if (!isHttps(presenter?.url)) throw new Error('ads_v2_montage_bad_presenter')
  if (!finitePos(presenter.measuredSeconds)) throw new Error('ads_v2_montage_presenter_unmeasured')
  const clip = r3(presenter.measuredSeconds)
  // A fala ocupa o clipe inteiro; o cartão entra com dissolve nos últimos ADS_V2_MONTAGE_FADE s do clipe.
  const main = r3(clip - ADS_V2_MONTAGE_FADE)
  if (main < ADS_V2_PRESENTER_MIN_SECONDS) throw new Error(`ads_v2_montage_presenter_too_short:${clip}`)
  const shots = Array.isArray(input.shots) ? input.shots : []
  if (!isHttps(input.cardUrl)) throw new Error('ads_v2_montage_bad_card')
  const cardSeconds = input.cardSeconds ?? 2.5
  if (!finitePos(cardSeconds)) throw new Error('ads_v2_montage_bad_card_seconds')
  const fontFamily = typeof input.fontFamily === 'string' && input.fontFamily.trim() ? input.fontFamily.trim() : ''
  if (!fontFamily) throw new Error('ads_v2_montage_bad_font')
  const total = r3(main + cardSeconds)

  const elements: Record<string, unknown>[] = []
  elements.push({
    type: 'shape', track: 1, time: 0, duration: total,
    x: '50%', y: '50%', width: '100%', height: '100%',
    path: ADS_V2_RECT_PATH, fill_color: '#000000',
  })
  // O ator: o clipe inteiro, COM o som (é a voz do anúncio). Sem loop, sem trecho: a fala começa no 0 do clipe.
  elements.push({
    type: 'video', track: ADS_V2_PRESENTER_TRACK, time: 0, duration: clip,
    source: presenter.url.trim(), fit: 'cover', loop: false, trim_start: 0,
    x: '50%', y: '50%', width: '100%', height: '100%',
    volume: '100%',
  })
  // Inserts por cima, MUDOS (a fala do ator continua por baixo), corte seco como num vídeo de criador.
  for (const ins of adsV2PresenterInserts(main, shots, presenter.insertOrder)) {
    const shot = shots[ins.shot]
    const start = typeof shot.cutStart === 'number' && Number.isFinite(shot.cutStart) && shot.cutStart >= 0 ? shot.cutStart : 0
    const frame = shot.kind === 'user_video'
      ? userVideoFrame(width, height, shot.videoWidth, shot.videoHeight, shot.focusX, shot.focusY)
      : { x: '50%', y: '50%', width: '100%', height: '100%' }
    elements.push({
      type: 'video', track: ADS_V2_PRESENTER_INSERT_TRACK, time: ins.time, duration: ins.seconds,
      source: shot.url.trim(), fit: 'cover', loop: false, trim_start: r3(start),
      ...frame,
      volume: '0%',
    })
  }
  // Cartão final (logo real), no fim da fala, e até o ÚLTIMO quadro: time main + cardSeconds = total (duração do source).
  // KINEO-ATOR-AJUSTES-2026-10-09 — o "1 s preto no fim" do canário 7112d56c NÃO estava no vídeo: medido no MP4 entregue
  // (ffprobe/signalstats), os 348 quadros de 14,5 s terminam no cartão (o último, 14,458 s, tem a mesma luma do cartão).
  // O quadrado preto era o 16º da grade 2×8 feita a 1 quadro/s — 14,5 s dão 15 quadros e o filtro tile completa com preto.
  // O guardião scripts/test-ads-ator-ajustes-2026-10-09.mjs trava fim do cartão = fim da composição nas DUAS montagens.
  elements.push({
    type: 'image', track: 3, time: main, duration: r3(cardSeconds),
    source: input.cardUrl.trim(), fit: 'cover',
    x: '50%', y: '50%', width: '100%', height: '100%',
    enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE },
  })
  const tint = input.tint ?? null
  if (tint !== null) {
    if (typeof tint !== 'string' || !ADS_V2_TINT_RE.test(tint)) throw new Error('ads_v2_montage_bad_tint')
    elements.push({
      type: 'shape', track: ADS_V2_TINT_TRACK, time: 0, duration: main,
      x: '50%', y: '50%', width: '100%', height: '100%',
      path: ADS_V2_RECT_PATH, fill_color: tint,
    })
  }
  // Frases: validadas contra a linha do tempo do PLANO (como no anúncio de sempre) e esticadas para a da fala.
  const shotsSeconds = r3(shots.reduce((sum, s) => sum + (finitePos(s?.cutSeconds) ? s.cutSeconds : 0), 0))
  const overlays = Array.isArray(input.overlays) ? input.overlays : []
  if (overlays.length > ADS_V2_MAX_OVERLAYS) throw new Error('ads_v2_montage_too_many_overlays')
  const scale = shotsSeconds > 0 ? main / shotsSeconds : 1
  overlays.forEach((o, i) => {
    const text = typeof o?.text === 'string' ? o.text.trim() : ''
    if (!text) throw new Error(`ads_v2_montage_empty_overlay:${i}`)
    if (!(Number.isFinite(o.start) && Number.isFinite(o.end) && o.start >= 0 && o.end > o.start && o.end <= shotsSeconds)) {
      throw new Error(`ads_v2_montage_overlay_window:${i}`)
    }
    const start = r3(o.start * scale)
    const end = r3(Math.min(o.end * scale, main))
    if (!(end > start)) throw new Error(`ads_v2_montage_overlay_window:${i}`)
    elements.push({
      type: 'text', track: 4, time: start, duration: r3(end - start),
      text,
      // KINEO-ATOR-AJUSTES-2026-10-09 — terço de baixo (o rosto do ator mora no terço do meio).
      x: '50%', y: pct(ADS_V2_PRESENTER_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%',
      width: '84%', height: pct(ADS_V2_OVERLAY_H),
      font_family: fontFamily, font_size: 64, font_weight: '800', line_height: '110%',
      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2,
      background_color: 'rgba(0,0,0,0.55)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10,
      enter_transition: { type: 'fade', duration: 0.2 },
    })
  })
  // NENHUM elemento de voz: a voz é o som do ator (input.voiceUrl é ignorado de propósito — duas vozes, nunca).
  if (input.musicUrl) {
    if (!isHttps(input.musicUrl)) throw new Error('ads_v2_montage_bad_music')
    const trim = input.musicTrimStart ?? 0
    if (!(typeof trim === 'number' && Number.isFinite(trim) && trim >= 0)) throw new Error('ads_v2_montage_bad_music_trim')
    const source = input.musicUrl.trim()
    const musicEl = (time: number, duration: number, start: number, volume: string, fadeIn: number, fadeOut: number): Record<string, unknown> => ({
      type: 'audio', track: 6, time: r3(time), duration: r3(duration), source, volume,
      ...(start > 0 ? { trim_start: r3(start) } : { loop: true }),
      audio_fade_in: fadeIn, audio_fade_out: fadeOut,
    })
    const rise = r3(clip + ADS_V2_MUSIC_RISE_AFTER_VOICE)
    if (rise < total - 0.5) {
      elements.push(musicEl(0, rise, trim, ADS_V2_MUSIC_VOLUME_PRESENTER, 0.5, 0.3))
      elements.push(musicEl(rise, total - rise, trim + rise, ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.6, 1))
    } else {
      elements.push(musicEl(0, total, trim, ADS_V2_MUSIC_VOLUME_PRESENTER, 0.5, 1))
    }
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
