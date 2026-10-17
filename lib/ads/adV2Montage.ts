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
  /** KINEO-ADS-MELHORIAS-1410 — só no plano `text` que é o PACKSHOT (a foto real do produto): fundo suave + foto inteira com zoom. */
  packshot?: boolean
  fill?: boolean // KINEO-ADS-POS-ENTREGA-1510 — clipe que só existe em 9:16 (efeito) num quadro de outra proporção: fundo suave + o clipe INTEIRO (sem corte duro)
  closeup?: boolean // KINEO-ADS-FIEL-2-1510 — só no plano `text` que é o CLOSE do Premium com a trava: a foto real com um zoom de close (mais perto e mais fundo que o de sempre)
  avoid?: readonly AdV2AvoidBox[] // KINEO-ADS-FIEL-3-1510 — cena travada: o produto real e os rostos (frações do quadro) que as frases de tela não cobrem
}
/** KINEO-ADS-FIEL-2-1510 — o zoom do close real: começa já perto e aproxima mais (as MESMAS propriedades do zoom do plano `text`, só outros valores). */
export const ADS_V2_CLOSEUP_ZOOM_START = '108%' // KINEO-ADS-FIEL-2-1510
export const ADS_V2_CLOSEUP_ZOOM_END = '122%' // KINEO-ADS-FIEL-2-1510

// ── KINEO-ADS-MELHORIAS-1410 — o PACKSHOT (a foto real do produto, sem IA) ─────────────────────────────────────────────────
// Três elementos na trilha dos planos, só com propriedades que a casa JÁ usa em produção (image + fit cover/contain — contain no
// logo de lib/brandLogo.ts e no cartão de lib/ads/producao.ts — + largura acima de 100% como no vídeo do cliente + animations scale
// + shape rgba): (1) a MESMA foto em `cover`, ampliada, sob (2) um véu escuro — o fundo suave que enche o quadro
// quando a foto não tem a proporção dele; (3) a foto INTEIRA em `contain` (nada do produto é cortado) com um zoom lento.
// Foto já na proporção do quadro (o caso de hoje: o navegador recorta no formato do anúncio) = a camada 2 cobre a 1 inteira.
// blur_radius NÃO entra: nunca foi exercitado num render nosso (regra da casa: propriedade nova só com render de validação).
export const ADS_V2_PACKSHOT_ZOOM_END = '106%'
export const ADS_V2_PACKSHOT_BG_SCALE = '118%'
export const ADS_V2_PACKSHOT_VEIL = 'rgba(0,0,0,0.45)'
/** Os 3 elementos do packshot (fundo cover ampliado · véu · foto inteira em contain com zoom). `extra` = transição de entrada. */
export function adsV2PackshotElements(url: string, track: number, time: number, duration: number, extra: Record<string, unknown> = {}): Record<string, unknown>[] {
  const source = url.trim()
  return [
    { type: 'image', track, time, duration, source, fit: 'cover', x: '50%', y: '50%', width: ADS_V2_PACKSHOT_BG_SCALE, height: ADS_V2_PACKSHOT_BG_SCALE, ...extra },
    { type: 'shape', track, time, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: ADS_V2_PACKSHOT_VEIL, ...extra },
    { type: 'image', track, time, duration, source, fit: 'contain', x: '50%', y: '50%', width: '100%', height: '100%', ...extra, animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_PACKSHOT_ZOOM_END, easing: 'linear' }] },
  ]
}
// ▼ KINEO-ADS-POS-ENTREGA-1510 — o PREENCHIMENTO do "baixar 9:16 + 4:5 + 1:1" (a mesma montagem, os MESMOS clipes, outro quadro).
// Clipe que só existe em 9:16 (plano do estilo/efeito, o ator) não leva corte duro num quadro mais largo: a MESMA técnica do
// packshot, agora com vídeo — (1) o clipe em `cover`, ampliado e mudo, sob (2) o véu escuro, e (3) o clipe INTEIRO em `contain`
// (nada do efeito nem do rosto sai do quadro). Mesmas propriedades que a casa já usa (video cover/contain, shape rgba, trim_start).
// blur_radius fica DESLIGADO (ADS_V2_FILL_BLUR = 0): regra da casa, propriedade nova só depois de UM render de validação (~US$ 0,13);
// ligar = trocar o número aqui. `volume` = o som do clipe da frente (o ator fala; plano comum é mudo); o de trás é sempre mudo.
export const ADS_V2_FILL_BLUR = 0
export function adsV2FillVideoElements(url: string, track: number, time: number, duration: number, trimStart: number, extra: Record<string, unknown> = {}, volume = '0%'): Record<string, unknown>[] {
  const source = url.trim()
  const clip = { type: 'video', track, time, duration, source, loop: false, trim_start: Math.round(Math.max(0, trimStart) * 1000) / 1000 }
  return [
    { ...clip, fit: 'cover', x: '50%', y: '50%', width: ADS_V2_PACKSHOT_BG_SCALE, height: ADS_V2_PACKSHOT_BG_SCALE, volume: '0%', ...(ADS_V2_FILL_BLUR > 0 ? { blur_radius: ADS_V2_FILL_BLUR } : {}), ...extra },
    { type: 'shape', track, time, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: ADS_V2_PACKSHOT_VEIL, ...extra },
    { ...clip, fit: 'contain', x: '50%', y: '50%', width: '100%', height: '100%', volume, ...extra },
  ]
}
// ▲ KINEO-ADS-POS-ENTREGA-1510

/**
 * KINEO-ADS-MELHORIAS-1410 — o cartão final é um PNG 1080×1920 (lib/ads/endCard.ts, desenhado no navegador). Num quadro de outra
 * proporção (4:5, 1:1) ele entra com a largura inteira e é DESLOCADO para que a caixa do conteúdo (logo, nome, oferta, chamada e
 * contato: de 12% a 64% da altura do cartão, END_CARD_SAFE) fique dentro do quadro — o fundo do cartão cobre a tela inteira, então
 * o que sai do quadro é só fundo. Mesma técnica (e as mesmas propriedades) do vídeo do cliente: o elemento na proporção do
 * próprio conteúdo, deslocado por x/y. Quadro 9:16 (ou mais alto) = o cartão de sempre, 100% × 100%.
 */
export const ADS_V2_CARD_ASPECT = 1080 / 1920
export const ADS_V2_CARD_CONTENT = { top: 0.12, bottom: 0.64 } as const
export function adsV2CardFrame(frameW: number, frameH: number): { x: string; y: string; width: string; height: string } {
  const full = { x: '50%', y: '50%', width: '100%', height: '100%' }
  if (!finitePos(frameW) || !finitePos(frameH)) return full
  const F = frameW / frameH
  if (F <= ADS_V2_CARD_ASPECT * (1 + ADS_V2_USER_VIDEO_ASPECT_TOLERANCE)) return full
  const eh = F / ADS_V2_CARD_ASPECT // altura do cartão em frações da altura do quadro (> 1)
  const win = 1 / eh // fração da altura do cartão que aparece
  const mid = (ADS_V2_CARD_CONTENT.top + ADS_V2_CARD_CONTENT.bottom) / 2
  const top = Math.min(1 - win, Math.max(0, mid - win / 2)) // topo da janela, em frações do cartão
  return { x: '50%', y: pct(eh / 2 - top * eh), width: '100%', height: pct(eh) }
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
  /**
   * KINEO-ANUNCIO-CONSERTOS-2026-10-12 — 'lower_third' = anúncio de PRODUTO sem ator: as frases descem para o terço de baixo
   * (a MESMA caixa do ator, ADS_V2_PRESENTER_OVERLAY_Y), longe do centro onde mora o rótulo. Prospecção de 12/10: a frase cobriu
   * o rótulo do café (East Coast) e o logo do relógio (Votch). Ausente/null = o centro de sempre, source idêntico ao de antes.
   */
  overlayPlacement?: 'lower_third' | null
}

/** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o anúncio tem foto marcada como PRODUTO? (as frases de tela descem para o terço de baixo). Pura. */
export function adsV2ProductOverlays(photos: readonly { kind?: unknown }[] | null | undefined): boolean {
  return Array.isArray(photos) && photos.some((p) => p && p.kind === 'product')
}

/** KINEO-ATOR-ANUNCIO-2026-10-09 — o vídeo do ator, já no NOSSO bucket e medido, e a ordem preferida dos inserts. */
export interface AdV2PresenterInput {
  url: string
  /** Duração MEDIDA do vídeo falado (mvhd): a fala inteira mora nele. */
  measuredSeconds: number
  /** Posições em `shots` na ordem de preferência dos inserts (estilo → herói → produto → lugar → gente → vídeo). */
  insertOrder: readonly number[]
  fill?: boolean // KINEO-ADS-POS-ENTREGA-1510 — quadro que não é 9:16: o ator INTEIRO sobre fundo suave e o cartão no quadro (adsV2CardFrame)
  v2?: AdV2PresenterV2Input | null // KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna): corte no fim real da fala + close da foto real + cartão
}
/** KINEO-APRESENTADOR-V2-1710 — o que a estrutura de 15 s do apresentador v2 precisa: a duração MEDIDA da voz e a foto REAL do produto. */
export interface AdV2PresenterV2Input {
  /** Duração da voz que guiou o avatar (s): a fala termina aqui dentro do clipe (o motor devolve ~10,1 s para ~8 s de áudio). */
  speechSeconds: number
  /** A foto REAL do produto (a 2ª referência da foto do apresentador), no close de ~2 s depois da fala. */
  closeUrl: string
  /** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o retângulo do produto na foto do apresentador (frações): a frase de tela vai ACIMA dele. Ausente = o terço de cima. */
  productRect?: AdV2AvoidBox | null // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
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
    if (shot.kind === 'text' && shot.packshot === true) {
      // KINEO-ADS-MELHORIAS-1410 — o packshot: fundo suave (a mesma foto, ampliada, sob véu) + a foto inteira com zoom lento.
      elements.push(...adsV2PackshotElements(shot.url, 2, starts[i], duration, transition))
      return
    }
    if (shot.kind === 'text') {
      // Texto nunca passa por IA: a foto entra parada e o montador faz um zoom lento de ~1,08x.
      elements.push({
        type: 'image', track: 2, time: starts[i], duration,
        source: shot.url.trim(), fit: 'cover',
        x: '50%', y: '50%', width: '100%', height: '100%',
        ...transition,
        animations: [shot.closeup === true ? { type: 'scale', fade: false, start_scale: ADS_V2_CLOSEUP_ZOOM_START, end_scale: ADS_V2_CLOSEUP_ZOOM_END, easing: 'linear' } : { type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_TEXT_ZOOM_END, easing: 'linear' }], // KINEO-ADS-FIEL-2-1510 — o close real; sem a marca, o zoom de sempre
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
    if (shot.fill === true && shot.kind !== 'user_video') { elements.push(...adsV2FillVideoElements(shot.url, 2, starts[i], duration, cutStart, transition)); return } // KINEO-ADS-POS-ENTREGA-1510 — efeito só 9:16 noutro quadro: fundo suave + o clipe inteiro
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
    ...adsV2CardFrame(width, height), // KINEO-ADS-MELHORIAS-1410 — 9:16 = 100% × 100% (o de sempre); 4:5 e 1:1 = o conteúdo do cartão inteiro no quadro
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
    const geo = adsV2OverlayGeometry(text, width, height, adsV2OverlayAvoid(shots, starts, o.start, o.end)) // KINEO-ADS-FIEL-3-1510 — fonte pela largura, ≤ 2 linhas, zona segura, longe do produto e dos rostos
    elements.push({
      type: 'text', track: 4, time: r3(o.start), duration: r3(o.end - o.start),
      text,
      // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — produto sem ator: terço de baixo (o rótulo mora no centro). Sem a opção, o centro.
      ...(input.overlayPlacement === 'lower_third' ? { x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor } : { x: '50%', y: pct(ADS_V2_OVERLAY_Y), x_anchor: '50%', y_anchor: '50%' }), // KINEO-ADS-FIEL-3-1510 — produto: presa pela base na faixa de baixo da zona segura (ou na de cima, se embaixo cobre o produto/rosto)
      x_alignment: '50%', // KINEO-CENTRO-ADS-GANCHO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a frase de tela no MEIO da caixa de 84% (o padrão do Creatomate é a esquerda)
      width: geo.width, ...(input.overlayPlacement === 'lower_third' ? {} : { height: pct(ADS_V2_OVERLAY_H) }), // KINEO-ADS-FIEL-3-1510 — 80% (era 84%); presa pela base = sem altura fixa
      font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', // KINEO-ADS-FIEL-3-1510 — 48 px por 1080 de largura (era 64 fixo)
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
    const still = !!s && s.kind === 'text' && s.packshot === true // KINEO-ADS-MELHORIAS-1410 — o packshot entra como insert (foto parada: sem clipe medido)
    if (!s || (s.kind === 'text' && !still) || !isHttps(s.url) || (!still && !finitePos(s.measuredSeconds)) || !finitePos(s.cutSeconds)) continue
    const start = typeof s.cutStart === 'number' && Number.isFinite(s.cutStart) && s.cutStart >= 0 ? s.cutStart : 0
    const seconds = still ? r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds)) : r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds, (s.measuredSeconds as number) - start)) // KINEO-ADS-MELHORIAS-1410
    if (!(seconds >= ADS_V2_PRESENTER_INSERT_MIN)) continue
    if (r3(t + seconds) > r3(mainSeconds - ADS_V2_PRESENTER_TAIL)) break
    out.push({ shot: i, time: r3(t), seconds })
    t = r3(t + seconds + ADS_V2_PRESENTER_GAP)
  }
  return out
}

// ── KINEO-APRESENTADOR-V2-1710 — a ESTRUTURA DE 15 s do apresentador v2 (lib/ads/v2PresenterV2.ts) ─────────────────────────────────────
// KINEO-APRESENTADOR-V2-1710 — apresentador de 0 ao FIM REAL DA FALA (a voz medida + 0,15 s; o motor devolve ~10,1 s para ~8 s de áudio e a cauda
// KINEO-APRESENTADOR-V2-1710 — é ela sorrindo calada, com uma "quebra" no fim), no máximo 1 corte (insert) no meio; no ponto do corte, dissolve para o
// KINEO-APRESENTADOR-V2-1710 — CLOSE da foto REAL do produto (~2 s, o packshot: nada do produto cortado, zoom lento) e o cartão de 2,5 s. Total ≈ 15 s
// KINEO-APRESENTADOR-V2-1710 — com ~10,3 s de voz; voz mais longa = filme um pouco mais longo (passar do alvo é bom; amputar a fala, nunca).
/** KINEO-APRESENTADOR-V2-1710 — folga depois do fim da fala antes do corte. */
export const ADS_V2_PRESENTER_V2_SPEECH_PAD = 0.15
/** KINEO-APRESENTADOR-V2-1710 — o close da foto real do produto. */
export const ADS_V2_PRESENTER_V2_CLOSE_SECONDS = 2
/** KINEO-APRESENTADOR-V2-1710 — no máximo 1 corte dentro da fala. */
export const ADS_V2_PRESENTER_V2_MAX_INSERTS = 1
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o DISSOLVE apresentador → close não aparecia na R2 (quadro a quadro a 24 fps: rosto, e no quadro seguinte o packshot). Causa no código: o close
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — entrava na MESMA trilha do apresentador (2) — a casa já usa trilhas DIFERENTES para o fade cruzar um plano no outro (lib/ads/producao.ts
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — alterna as trilhas 2 e 3 por isso). Agora o close tem trilha própria ACIMA do apresentador, o apresentador fica 0,35 s a mais por
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — baixo dele e o fade de entrada dura 0,35 s (era 0,25: ~8 quadros a 24 fps). O cartão e as frases sobem uma trilha (continuam por cima de tudo).
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o dissolve visível do apresentador para o close da foto real (s). */
export const ADS_V2_PRESENTER_V2_DISSOLVE = 0.35 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — trilhas do v2: o close ACIMA do apresentador (2); o cartão acima do close; as frases acima de tudo (os inserts seguem na 3, antes do corte). */
export const ADS_V2_PRESENTER_V2_CLOSE_TRACK = 3 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
export const ADS_V2_PRESENTER_V2_CARD_TRACK = 4 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
export const ADS_V2_PRESENTER_V2_TEXT_TRACK = 5 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/**
 * KINEO-APRESENTADOR-V2-1710 — a linha do tempo (pura): `cut` = fim do apresentador (fala + 0,15 s, sem passar do clipe menos o dissolve), o close de
 * `cut` a `cardStart`, o cartão até `total`. Voz sem medida = o clipe inteiro (o corte de antes). null = clipe curto demais.
 */
export function adsV2PresenterV2Timeline(i: { clipSeconds: number; speechSeconds: number | null | undefined; cardSeconds: number }): { cut: number; cardStart: number; total: number } | null {
  if (!finitePos(i?.clipSeconds) || !finitePos(i?.cardSeconds)) return null
  const room = r3(i.clipSeconds - ADS_V2_PRESENTER_V2_DISSOLVE) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o dissolve de 0,35 s cabe no clipe (era o fade de 0,25)
  const cut = finitePos(i.speechSeconds) ? r3(Math.min(i.speechSeconds + ADS_V2_PRESENTER_V2_SPEECH_PAD, room)) : room
  if (cut < ADS_V2_PRESENTER_MIN_SECONDS) return null
  const cardStart = r3(cut + ADS_V2_PRESENTER_V2_CLOSE_SECONDS)
  return { cut, cardStart, total: r3(cardStart + i.cardSeconds) }
}

function buildAdV2PresenterV2Source(input: AdV2MontageInput, presenter: AdV2PresenterInput, v2: AdV2PresenterV2Input): Record<string, unknown> { // KINEO-APRESENTADOR-V2-1710
  const { width, height } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width % 2 || height % 2) throw new Error('ads_v2_montage_bad_size')
  if (!isHttps(presenter?.url)) throw new Error('ads_v2_montage_bad_presenter')
  if (!finitePos(presenter.measuredSeconds)) throw new Error('ads_v2_montage_presenter_unmeasured')
  if (!isHttps(v2?.closeUrl)) throw new Error('ads_v2_montage_bad_close')
  if (!isHttps(input.cardUrl)) throw new Error('ads_v2_montage_bad_card')
  const cardSeconds = input.cardSeconds ?? 2.5
  if (!finitePos(cardSeconds)) throw new Error('ads_v2_montage_bad_card_seconds')
  const fontFamily = typeof input.fontFamily === 'string' && input.fontFamily.trim() ? input.fontFamily.trim() : ''
  if (!fontFamily) throw new Error('ads_v2_montage_bad_font')
  const t = adsV2PresenterV2Timeline({ clipSeconds: presenter.measuredSeconds, speechSeconds: v2.speechSeconds, cardSeconds })
  if (!t) throw new Error(`ads_v2_montage_presenter_too_short:${r3(presenter.measuredSeconds)}`)
  const shots = Array.isArray(input.shots) ? input.shots : []
  const elements: Record<string, unknown>[] = []
  elements.push({ type: 'shape', track: 1, time: 0, duration: t.total, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: '#000000' })
  // O apresentador COM o som (a voz é a dele), do 0 ao corte — e o dissolve por baixo do close (a fala já acabou 0,15 s antes do corte).
  elements.push({ type: 'video', track: ADS_V2_PRESENTER_TRACK, time: 0, duration: r3(t.cut + ADS_V2_PRESENTER_V2_DISSOLVE), source: presenter.url.trim(), fit: 'cover', loop: false, trim_start: 0, x: '50%', y: '50%', width: '100%', height: '100%', volume: '100%' }) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — + o dissolve inteiro por baixo do close
  // No máximo 1 corte dentro da fala: um insert do cliente (nunca a foto do produto: ela é o close logo depois).
  const noPackshot = shots.map((s) => (s && s.kind === 'text' && s.packshot === true ? { ...s, url: '' } : s))
  for (const ins of adsV2PresenterInserts(t.cut, noPackshot, presenter.insertOrder).slice(0, ADS_V2_PRESENTER_V2_MAX_INSERTS)) {
    const shot = shots[ins.shot]
    const start = typeof shot.cutStart === 'number' && Number.isFinite(shot.cutStart) && shot.cutStart >= 0 ? shot.cutStart : 0
    const frame = shot.kind === 'user_video' ? userVideoFrame(width, height, shot.videoWidth, shot.videoHeight, shot.focusX, shot.focusY) : { x: '50%', y: '50%', width: '100%', height: '100%' }
    elements.push({ type: 'video', track: ADS_V2_PRESENTER_INSERT_TRACK, time: ins.time, duration: ins.seconds, source: shot.url.trim(), fit: 'cover', loop: false, trim_start: r3(start), ...frame, volume: '0%' })
  }
  // O close da foto REAL do produto, na trilha do apresentador: entra com dissolve no ponto do corte e fica por baixo do cartão.
  elements.push(...adsV2PackshotElements(v2.closeUrl, ADS_V2_PRESENTER_V2_CLOSE_TRACK, t.cut, r3(ADS_V2_PRESENTER_V2_CLOSE_SECONDS + ADS_V2_MONTAGE_FADE), { enter_transition: { type: 'fade', duration: ADS_V2_PRESENTER_V2_DISSOLVE } })) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — trilha ACIMA do apresentador (era a mesma: não cruzava) e fade de 0,35 s
  // O cartão final (logo real) até o último quadro.
  elements.push({ type: 'image', track: ADS_V2_PRESENTER_V2_CARD_TRACK, time: t.cardStart, duration: r3(cardSeconds), source: input.cardUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE } }) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — acima do close (o close subiu para a 3)
  const tint = input.tint ?? null
  if (tint !== null) {
    if (typeof tint !== 'string' || !ADS_V2_TINT_RE.test(tint)) throw new Error('ads_v2_montage_bad_tint')
    elements.push({ type: 'shape', track: ADS_V2_TINT_TRACK, time: 0, duration: t.cardStart, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: tint })
  }
  // Frases: validadas contra a linha do tempo do PLANO e esticadas para a da FALA (só sobre o apresentador; o close fica limpo).
  const shotsSeconds = r3(shots.reduce((sum, s) => sum + (finitePos(s?.cutSeconds) ? s.cutSeconds : 0), 0))
  const overlays = Array.isArray(input.overlays) ? input.overlays : []
  if (overlays.length > ADS_V2_MAX_OVERLAYS) throw new Error('ads_v2_montage_too_many_overlays')
  const scale = shotsSeconds > 0 ? t.cut / shotsSeconds : 1
  overlays.forEach((o, i) => {
    const text = typeof o?.text === 'string' ? o.text.trim() : ''
    if (!text) throw new Error(`ads_v2_montage_empty_overlay:${i}`)
    if (!(Number.isFinite(o.start) && Number.isFinite(o.end) && o.start >= 0 && o.end > o.start && o.end <= shotsSeconds)) throw new Error(`ads_v2_montage_overlay_window:${i}`)
    const start = r3(o.start * scale)
    const end = r3(Math.min(o.end * scale, t.cut))
    if (!(end > start)) throw new Error(`ads_v2_montage_overlay_window:${i}`)
    const geo = adsV2PresenterV2OverlayGeometry(text, width, height, v2.productRect ?? null) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — acima do produto e das mãos (sem o retângulo: o terço de cima)
    elements.push({ type: 'text', track: ADS_V2_PRESENTER_V2_TEXT_TRACK, time: start, duration: r3(end - start), text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2, background_color: 'rgba(0,0,0,0.55)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10, enter_transition: { type: 'fade', duration: 0.2 } })
  })
  // NENHUM elemento de voz (a voz é o som do apresentador). Música baixa sob a fala; sobe logo depois do corte.
  if (input.musicUrl) {
    if (!isHttps(input.musicUrl)) throw new Error('ads_v2_montage_bad_music')
    const trim = input.musicTrimStart ?? 0
    if (!(typeof trim === 'number' && Number.isFinite(trim) && trim >= 0)) throw new Error('ads_v2_montage_bad_music_trim')
    const source = input.musicUrl.trim()
    const musicEl = (time: number, duration: number, start: number, volume: string, fadeIn: number, fadeOut: number): Record<string, unknown> => ({ type: 'audio', track: 6, time: r3(time), duration: r3(duration), source, volume, ...(start > 0 ? { trim_start: r3(start) } : { loop: true }), audio_fade_in: fadeIn, audio_fade_out: fadeOut })
    const rise = r3(t.cut + ADS_V2_MUSIC_RISE_AFTER_VOICE)
    if (rise < t.total - 0.5) {
      elements.push(musicEl(0, rise, trim, ADS_V2_MUSIC_VOLUME_PRESENTER, 0.5, 0.3))
      elements.push(musicEl(rise, t.total - rise, trim + rise, ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.6, 1))
    } else {
      elements.push(musicEl(0, t.total, trim, ADS_V2_MUSIC_VOLUME_PRESENTER, 0.5, 1))
    }
  }
  return { output_format: 'mp4', width, height, frame_rate: ADS_V2_FRAME_RATE, duration: t.total, snapshot_time: 1, elements }
}

function buildAdV2PresenterSource(input: AdV2MontageInput, presenter: AdV2PresenterInput): Record<string, unknown> {
  if (presenter && presenter.v2) return buildAdV2PresenterV2Source(input, presenter, presenter.v2) // KINEO-APRESENTADOR-V2-1710 — o apresentador v2: a estrutura de 15 s (abaixo, o ator de antes intocado)
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
  if (presenter.fill === true) elements.splice(elements.length - 1, 1, ...adsV2FillVideoElements(presenter.url, ADS_V2_PRESENTER_TRACK, 0, clip, 0, {}, '100%')) // KINEO-ADS-POS-ENTREGA-1510 — o ator inteiro (com a voz) sobre fundo suave mudo
  for (const ins of adsV2PresenterInserts(main, shots, presenter.insertOrder)) {
    const shot = shots[ins.shot]
    if (shot.kind === 'text' && shot.packshot === true) { elements.push(...adsV2PackshotElements(shot.url, ADS_V2_PRESENTER_INSERT_TRACK, ins.time, ins.seconds)); continue } // KINEO-ADS-MELHORIAS-1410 — a foto real do produto, corte seco como os outros inserts
    const start = typeof shot.cutStart === 'number' && Number.isFinite(shot.cutStart) && shot.cutStart >= 0 ? shot.cutStart : 0
    if (shot.fill === true && shot.kind !== 'user_video') { elements.push(...adsV2FillVideoElements(shot.url, ADS_V2_PRESENTER_INSERT_TRACK, ins.time, ins.seconds, start)); continue } // KINEO-ADS-POS-ENTREGA-1510 — insert de efeito noutro quadro: fundo suave + o clipe inteiro
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
  if (presenter.fill === true) Object.assign(elements[elements.length - 1], adsV2CardFrame(width, height)) // KINEO-ADS-POS-ENTREGA-1510 — 4:5/1:1: o conteúdo do cartão inteiro no quadro
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
    const geoP = adsV2OverlayGeometry(text, width, height, null) // KINEO-ADS-FIEL-3-1510
    elements.push({
      type: 'text', track: 4, time: start, duration: r3(end - start),
      text,
      // KINEO-ATOR-AJUSTES-2026-10-09 — terço de baixo (o rosto do ator mora no terço do meio).
      x: '50%', y: geoP.y, x_anchor: '50%', y_anchor: geoP.y_anchor, // KINEO-ADS-FIEL-3-1510 — presa pela base na faixa de baixo da zona segura (o rosto fica acima)
      x_alignment: '50%', // KINEO-CENTRO-ADS-GANCHO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a frase de tela no MEIO da caixa de 84% (o padrão do Creatomate é a esquerda)
      width: geoP.width, // KINEO-ADS-FIEL-3-1510 — 80% (era 84%), sem altura fixa
      font_family: fontFamily, font_size: geoP.font_size, font_weight: '800', line_height: '110%', // KINEO-ADS-FIEL-3-1510 — 48 px por 1080 de largura (era 64 fixo)
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
// ── KINEO-ADS-FIEL-3-1510 — FRASES DE TELA menores e na ZONA SEGURA (fundador 15/10, olhando os quadros do T1 95a23737: "as legendas estão
// KINEO-ADS-FIEL-3-1510 — posicionadas erradas, estão muito grandes") ──────────────────────────────────────────────────────────────────
// KINEO-ADS-FIEL-3-1510 — Era: fonte 64 px FIXA (com o quadro de 720 px do perfil de custo, 8,9% da largura), caixa de 84% e, no anúncio de
// KINEO-ADS-FIEL-3-1510 — produto, o terço de baixo (centro em 77%) — em cima do produto colado. Régua de mercado (Reels/TikTok): o bloco
// KINEO-ADS-FIEL-3-1510 — de texto ≈ 5–6% da altura do 9:16 (2 linhas de 48 px a 110% = 105,6 px = 5,5% de 1920), no máximo 2 linhas, largura
// KINEO-ADS-FIEL-3-1510 — ≤ 80%, FORA dos ~15% de cima e dos ~20% de baixo (botões, nome e legenda da plataforma). 4:5 e 1:1 aparecem menores
// KINEO-ADS-FIEL-3-1510 — na tela e com a interface quase toda fora do quadro: a faixa encolhe na proporção da altura (1920 → 1350 → 1080).
// KINEO-ADS-FIEL-3-1510 — A fonte escala com a LARGURA do quadro (os 3 formatos têm 1080 de largura; o 9:16 pode sair em 720). A frase fica
// KINEO-ADS-FIEL-3-1510 — presa pela BASE (y_anchor 100%, a mesma âncora das legendas do compose em produção) e cresce para cima.
// KINEO-ADS-FIEL-3-1510 — No anúncio de produto (e no do ator) a frase vai à faixa de BAIXO da zona segura; se ali ela cobre o produto real
// KINEO-ADS-FIEL-3-1510 — ou um rosto (as caixas que a trava gravou ao lado de cada quadro), sobe para a faixa de CIMA. Centralizada sempre
// KINEO-ADS-FIEL-3-1510 — (x_alignment 50%, o conserto do centro de 14/10). O cartão final não muda (o título dele não cobre nada).
/** KINEO-ADS-FIEL-3-1510 — a fonte das frases num quadro de 1080 px de largura (escala com a largura). */
export const ADS_V2_OVERLAY_FONT_AT_1080 = 48 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o menor tamanho (frase com palavra comprida que não cabe em 2 linhas a 48). */
export const ADS_V2_OVERLAY_FONT_MIN_AT_1080 = 40 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — largura da caixa das frases (fração da largura do quadro). */
export const ADS_V2_OVERLAY_WIDTH = 0.8 // KINEO-ADS-FIEL-3-1510
export const ADS_V2_OVERLAY_LINE_HEIGHT = 1.1 // KINEO-ADS-FIEL-3-1510 — o '110%' de sempre
export const ADS_V2_OVERLAY_MAX_LINES = 2 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — largura média de um caractere em negrito 800 (em "em"): a estimativa das quebras de linha. */
export const ADS_V2_OVERLAY_CHAR_EM = 0.58 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — folga da pílula (background_y_padding) até a borda da zona segura, em fração da altura. */
export const ADS_V2_OVERLAY_PILL_PAD = 0.012 // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — folga em volta das caixas evitadas (a câmera ainda anda um pouco no vídeo). */
export const ADS_V2_OVERLAY_AVOID_PAD = 0.02 // KINEO-ADS-FIEL-3-1510
export type AdsV2OverlayFrame = '9:16' | '4:5' | '1:1' // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — zona segura por formato (frações da altura): nada da frase acima de `top` nem abaixo de `bottom`. */
export const ADS_V2_OVERLAY_SAFE: Readonly<Record<AdsV2OverlayFrame, { top: number; bottom: number }>> = { '9:16': { top: 0.15, bottom: 0.8 }, '4:5': { top: 0.11, bottom: 0.86 }, '1:1': { top: 0.09, bottom: 0.89 } } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — caixa em frações do quadro (as que a trava grava: produto + rostos). */
export interface AdV2AvoidBox { x0: number; y0: number; x1: number; y1: number } // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o formato pelo quadro (a proporção mais próxima). Pura. */
export function adsV2OverlayFrame(width: number, height: number): AdsV2OverlayFrame { // KINEO-ADS-FIEL-3-1510
  const r = width / height // KINEO-ADS-FIEL-3-1510
  return Math.abs(r - 1) < Math.abs(r - 0.8) ? '1:1' : Math.abs(r - 0.8) < Math.abs(r - 0.5625) ? '4:5' : '9:16' // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — as linhas da frase (quebra por palavra, estimada) numa fonte e num quadro. Pura. */
export function adsV2OverlayLines(text: string, fontPx: number, frameW: number): string[] { // KINEO-ADS-FIEL-3-1510
  const perLine = Math.max(4, Math.floor((frameW * ADS_V2_OVERLAY_WIDTH * 0.94) / (fontPx * ADS_V2_OVERLAY_CHAR_EM))) // KINEO-ADS-FIEL-3-1510 — 94%: a pílula come 3% de cada lado
  const lines: string[] = [] // KINEO-ADS-FIEL-3-1510
  for (const word of String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)) { // KINEO-ADS-FIEL-3-1510
    const last = lines.length ? lines[lines.length - 1] : null // KINEO-ADS-FIEL-3-1510
    if (last !== null && (last + ' ' + word).length <= perLine) lines[lines.length - 1] = last + ' ' + word // KINEO-ADS-FIEL-3-1510
    else lines.push(word) // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
  return lines // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — o tamanho da fonte: 48 px por 1080 de largura; desce (até 40) só se a frase não couber em 2 linhas. Pura. */
export function adsV2OverlayFontSize(text: string, frameW: number): number { // KINEO-ADS-FIEL-3-1510
  const k = frameW > 0 ? frameW / 1080 : 1 // KINEO-ADS-FIEL-3-1510
  const max = Math.round(ADS_V2_OVERLAY_FONT_AT_1080 * k), min = Math.round(ADS_V2_OVERLAY_FONT_MIN_AT_1080 * k) // KINEO-ADS-FIEL-3-1510
  for (let f = max; f > min; f -= 2) if (adsV2OverlayLines(text, f, frameW).length <= ADS_V2_OVERLAY_MAX_LINES) return f // KINEO-ADS-FIEL-3-1510
  return min // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
export interface AdV2OverlayPlace { band: 'lower' | 'upper'; bottom: number; box: AdV2AvoidBox; overlap: number } // KINEO-ADS-FIEL-3-1510
/**
 * KINEO-ADS-FIEL-3-1510 — onde a frase fica: a faixa de BAIXO da zona segura (a base em `bottom` − folga da pílula) ou a de CIMA (o topo do
 * bloco de 2 linhas em `top`). A 1ª que não toca nenhuma caixa evitada (com folga) ganha; nenhuma = a de menor invasão (empate = baixo). Pura.
 */
export function adsV2OverlayPlace(i: { text: string; frameW: number; frameH: number; fontPx: number; avoid?: readonly AdV2AvoidBox[] | null }): AdV2OverlayPlace { // KINEO-ADS-FIEL-3-1510
  const safe = ADS_V2_OVERLAY_SAFE[adsV2OverlayFrame(i.frameW, i.frameH)] // KINEO-ADS-FIEL-3-1510
  const lines = adsV2OverlayLines(i.text, i.fontPx, i.frameW) // KINEO-ADS-FIEL-3-1510
  const lineH = (i.fontPx * ADS_V2_OVERLAY_LINE_HEIGHT) / i.frameH // KINEO-ADS-FIEL-3-1510
  const blockH = Math.max(1, lines.length) * lineH // KINEO-ADS-FIEL-3-1510
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0) // KINEO-ADS-FIEL-3-1510
  const halfW = Math.min(ADS_V2_OVERLAY_WIDTH, (longest * i.fontPx * ADS_V2_OVERLAY_CHAR_EM) / i.frameW + 0.06) / 2 // KINEO-ADS-FIEL-3-1510 — a pílula abraça a linha mais longa
  const lowerBottom = safe.bottom - ADS_V2_OVERLAY_PILL_PAD // KINEO-ADS-FIEL-3-1510
  const upperBottom = safe.top + ADS_V2_OVERLAY_PILL_PAD + ADS_V2_OVERLAY_MAX_LINES * lineH // KINEO-ADS-FIEL-3-1510 — cabe o bloco de 2 linhas abaixo do topo
  const avoid = Array.isArray(i.avoid) ? i.avoid : [] // KINEO-ADS-FIEL-3-1510
  const r4 = (n: number) => Math.round(n * 10000) / 10000 // KINEO-ADS-FIEL-3-1510
  const cand = (band: 'lower' | 'upper', bottom: number): AdV2OverlayPlace => { // KINEO-ADS-FIEL-3-1510
    const box = { x0: 0.5 - halfW, y0: bottom - blockH - ADS_V2_OVERLAY_PILL_PAD, x1: 0.5 + halfW, y1: bottom + ADS_V2_OVERLAY_PILL_PAD } // KINEO-ADS-FIEL-3-1510
    let overlap = 0 // KINEO-ADS-FIEL-3-1510
    for (const a of avoid) { // KINEO-ADS-FIEL-3-1510
      const w = Math.min(box.x1, a.x1 + ADS_V2_OVERLAY_AVOID_PAD) - Math.max(box.x0, a.x0 - ADS_V2_OVERLAY_AVOID_PAD) // KINEO-ADS-FIEL-3-1510
      const h = Math.min(box.y1, a.y1 + ADS_V2_OVERLAY_AVOID_PAD) - Math.max(box.y0, a.y0 - ADS_V2_OVERLAY_AVOID_PAD) // KINEO-ADS-FIEL-3-1510
      if (w > 0 && h > 0) overlap += w * h // KINEO-ADS-FIEL-3-1510
    } // KINEO-ADS-FIEL-3-1510
    return { band, bottom: r4(bottom), box: { x0: r4(box.x0), y0: r4(box.y0), x1: r4(box.x1), y1: r4(box.y1) }, overlap: r4(overlap) } // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
  const lower = cand('lower', lowerBottom) // KINEO-ADS-FIEL-3-1510
  if (lower.overlap <= 0) return lower // KINEO-ADS-FIEL-3-1510
  const upper = cand('upper', upperBottom) // KINEO-ADS-FIEL-3-1510
  return upper.overlap < lower.overlap ? upper : lower // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — as caixas evitadas durante a frase: as das cenas que aparecem no tempo dela. Pura. */
export function adsV2OverlayAvoid(shots: readonly AdV2MontageShot[], starts: readonly number[], start: number, end: number): AdV2AvoidBox[] { // KINEO-ADS-FIEL-3-1510
  const out: AdV2AvoidBox[] = [] // KINEO-ADS-FIEL-3-1510
  shots.forEach((s, k) => { const a = starts[k], b = a + s.cutSeconds; if (Array.isArray(s.avoid) && a < end && b > start) out.push(...s.avoid) }) // KINEO-ADS-FIEL-3-1510
  return out // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
/** KINEO-ADS-FIEL-3-1510 — as propriedades de lugar e tamanho da frase presa pela base (y_anchor 100%, sem altura fixa: cresce para cima). */
export function adsV2OverlayGeometry(text: string, frameW: number, frameH: number, avoid?: readonly AdV2AvoidBox[] | null): { y: string; y_anchor: string; width: string; font_size: number; place: AdV2OverlayPlace } { // KINEO-ADS-FIEL-3-1510
  const fontPx = adsV2OverlayFontSize(text, frameW) // KINEO-ADS-FIEL-3-1510
  const place = adsV2OverlayPlace({ text, frameW, frameH, fontPx, avoid }) // KINEO-ADS-FIEL-3-1510
  return { y: pct(place.bottom), y_anchor: '100%', width: pct(ADS_V2_OVERLAY_WIDTH), font_size: fontPx, place } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
// ── KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a FRASE DE TELA do apresentador v2 ACIMA do produto e das mãos ──────────────────────────────────────────────────────────────────
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — na R2 "Um perfume encantador" ficou sobre os dedos (a faixa de baixo da zona segura). A base da frase vai logo acima do topo do produto
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — (o retângulo da foto escolhida, lib/ads/v2PresenterV2.ts adsV2PresenterV2ProductRect), presa entre o topo da zona segura e a faixa de baixo; sem o
// KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — retângulo, o terço de cima (o bloco de 2 linhas logo abaixo do topo da zona segura — a mesma faixa 'upper' de adsV2OverlayPlace).
export interface AdV2PresenterV2OverlayPlace { band: 'above_product' | 'upper_third'; bottom: number } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
/** KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — onde a frase do v2 fica (pura). */
export function adsV2PresenterV2OverlayGeometry(text: string, frameW: number, frameH: number, productRect?: AdV2AvoidBox | null): { y: string; y_anchor: string; width: string; font_size: number; place: AdV2PresenterV2OverlayPlace } { // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const fontPx = adsV2OverlayFontSize(text, frameW) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const safe = ADS_V2_OVERLAY_SAFE[adsV2OverlayFrame(frameW, frameH)] // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const lineH = (fontPx * ADS_V2_OVERLAY_LINE_HEIGHT) / frameH // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const lines = Math.max(1, adsV2OverlayLines(text, fontPx, frameW).length) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const highest = safe.top + ADS_V2_OVERLAY_PILL_PAD + lines * lineH // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — a base mais alta: o topo do bloco encosta no topo da zona segura
  const upper = safe.top + ADS_V2_OVERLAY_PILL_PAD + ADS_V2_OVERLAY_MAX_LINES * lineH // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o terço de cima (a faixa 'upper' de sempre)
  const lowest = safe.bottom - ADS_V2_OVERLAY_PILL_PAD // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const r = productRect // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const okRect = !!r && [r.x0, r.y0, r.x1, r.y1].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) && r.y1 > r.y0 && r.x1 > r.x0 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const r4 = (n: number) => Math.round(n * 10000) / 10000 // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
  const bottom = okRect ? Math.min(lowest, Math.max(highest, (r as AdV2AvoidBox).y0 - ADS_V2_OVERLAY_AVOID_PAD - ADS_V2_OVERLAY_PILL_PAD)) : upper // KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — logo acima do topo do produto (com folga), dentro da zona segura
  return { y: pct(r4(bottom)), y_anchor: '100%', width: pct(ADS_V2_OVERLAY_WIDTH), font_size: fontPx, place: { band: okRect ? 'above_product' : 'upper_third', bottom: r4(bottom) } } // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
} // KINEO-APRESENTADOR-V2-AJUSTE-3-1710
