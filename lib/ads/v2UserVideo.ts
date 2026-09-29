// KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do cliente entra no anúncio v2 COMO VÍDEO (pedido do fundador, 29/09:
// "quero colocar as minhas fotos e VÍDEOS e a AI fazer um vídeo do que eu pedi" — testou com 8 fotos de WhatsApp e 1
// vídeo vertical de 12 s de um imóvel). Antes, o modo simples transformava o vídeo em 1-3 FOTOS e a IA animava as fotos.
//
// Regras (as mesmas no navegador, no contrato, no plano e na montagem):
//   · o arquivo ORIGINAL sobe pelo mesmo caminho de footage do v1 (/api/footage, lib/ads/uploadFootage.ts), com o mesmo
//     teto de 50 MB. Acima do teto, tipo que o servidor não mede (WebM), vídeo curto demais ou que o navegador não lê
//     (duração/dimensão) → PLANO B de antes: quadros viram fotos (lib/ads/v2VideoFrames.ts), com aviso traduzido;
//   · no máximo ADS_V2_MAX_USER_VIDEOS vídeos por pedido (o 3º vira fotos);
//   · cada vídeo vira 1 plano 'user_video' que ocupa uma vaga de FOTO do molde (nunca de cena criada): o nº de planos do
//     nível não muda e o preço também não (adsV2Credits só depende de nível e duração);
//   · o plano 'user_video' NÃO vai à fal (custo zero de fornecedor), nasce 'done' e é montado mudo, sem loop, com o
//     trecho escolhido aqui (o mais "vivo": maior diferença entre quadros amostrados; empate/sem diferença = o meio);
//   · refação de plano de vídeo: DESABILITADA com explicação (não passa por IA — não há o que refazer; para usar outro
//     trecho, planeja-se de novo, grátis).
//
// LIB PURA (nenhum import): o guardião scripts/test-ads-video-do-cliente-2026-09-29.mjs carrega este arquivo cru no Node.

/** Máximo de vídeos que entram como vídeo num pedido (o que passar disso vira fotos). */
export const ADS_V2_MAX_USER_VIDEOS = 2
/** Teto do arquivo: o MESMO do /api/footage e de ADS_UPLOAD_MAX_BYTES (lib/ads/uploadFootage.ts). Espelho conferido. */
export const ADS_V2_USER_VIDEO_MAX_BYTES = 50 * 1024 * 1024
/** Tipos que o servidor mede pelo mvhd (MP4/MOV). WebM sobe como footage, mas aqui vira fotos (plano B). */
export const ADS_V2_USER_VIDEO_TYPES: readonly string[] = ['video/mp4', 'video/quicktime']
/** Vídeo mais curto que isto não cabe no maior corte (2,5 s) + dissolve (0,25 s) + folga: vira fotos. */
export const ADS_V2_USER_VIDEO_MIN_SECONDS = 3
/** Vídeo mais longo que isto (10 min) não entra como vídeo (o banco guarda o trecho em numeric(6,3)) — espelho do teto do
 *  plano B (ADS_V2_SIMPLE_VIDEO_MAX_SECONDS, lib/ads/v2Simple.ts) e de ADS_V2_PLAN_VIDEO_MAX_SECONDS (v2ShotLists). */
export const ADS_V2_USER_VIDEO_MAX_SECONDS = 600
/** Janela avaliada no navegador: o maior corte de foto do molde (2,5 s) + o dissolve (0,25 s). */
export const ADS_V2_USER_VIDEO_WINDOW = 2.75
/** Dissolve e folga — espelhos de ADS_V2_FADE_SECONDS e ADS_V2_CUT_MARGIN (lib/ads/v2ShotLists.ts). */
export const ADS_V2_USER_VIDEO_FADE = 0.25
export const ADS_V2_USER_VIDEO_MARGIN = 0.1
/** Quadros amostrados para achar o trecho mais vivo (barato: 32×18 px cada, só no navegador). */
export const ADS_V2_USER_VIDEO_SAMPLES = 24

export type AdsV2UserVideoVerdict = 'video' | 'too_big' | 'bad_type' | 'unreadable' | 'too_short' | 'too_long' | 'too_many'

const r3 = (n: number): number => Math.round(n * 1000) / 1000
const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/**
 * Decide, no navegador, se o vídeo entra COMO VÍDEO ('video') ou cai no plano B (quadros viram fotos). Tudo que o
 * navegador não conseguiu ler (duração, largura, altura) = 'unreadable' → plano B.
 */
export function userVideoVerdict(v: {
  bytes: number
  type: string
  seconds: number | null
  width: number | null
  height: number | null
  videosAlready: number
}): AdsV2UserVideoVerdict {
  if (!(v.videosAlready < ADS_V2_MAX_USER_VIDEOS)) return 'too_many'
  if (!(typeof v.bytes === 'number' && v.bytes > 0 && v.bytes <= ADS_V2_USER_VIDEO_MAX_BYTES)) return 'too_big'
  if (!ADS_V2_USER_VIDEO_TYPES.includes(String(v.type ?? '').toLowerCase())) return 'bad_type'
  if (!finitePos(v.seconds) || !finitePos(v.width) || !finitePos(v.height)) return 'unreadable'
  if (v.seconds < ADS_V2_USER_VIDEO_MIN_SECONDS) return 'too_short'
  if (v.seconds > ADS_V2_USER_VIDEO_MAX_SECONDS) return 'too_long'
  return 'video'
}

/** Tempos (s) dos quadros amostrados: ADS_V2_USER_VIDEO_SAMPLES pontos igualmente espaçados, cada um ≤ duração − 0,05. */
export function userVideoSampleTimes(duration: number, samples = ADS_V2_USER_VIDEO_SAMPLES): number[] {
  if (!finitePos(duration)) return []
  const n = Math.max(2, Math.min(60, Math.floor(samples)))
  const cap = Math.max(0, duration - 0.05)
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(r3(Math.min(cap, (duration * i) / (n - 1))))
  return out.filter((t, i) => i === 0 || t > out[i - 1])
}

/**
 * O início do trecho mais "vivo": `times[i]` com `diffs[i]` = diferença média entre o quadro i e o i+1 (0..1).
 * A janela [s, s + window] com a maior soma de diferenças vence; empate = a mais cedo. Nenhuma diferença (vídeo
 * parado, ou amostra que falhou) = o MEIO do vídeo. Resultado dentro de [0, duração − window − folga]. Determinística.
 */
export function pickLivelyStart(times: readonly number[], diffs: readonly number[], duration: number, window = ADS_V2_USER_VIDEO_WINDOW): number {
  if (!finitePos(duration)) return 0
  const maxStart = Math.max(0, duration - window - ADS_V2_USER_VIDEO_MARGIN)
  const middle = r3(Math.min(maxStart, Math.max(0, duration / 2 - window / 2)))
  const n = Math.min(times.length - 1, diffs.length)
  if (!(n >= 1)) return middle
  let best = -1
  let bestStart = middle
  for (let i = 0; i < n; i++) {
    const s = times[i]
    if (!(Number.isFinite(s) && s >= 0) || s > maxStart + 1e-9) continue
    let score = 0
    for (let j = i; j < n; j++) {
      if (times[j + 1] > s + window + 1e-9) break
      const d = diffs[j]
      if (Number.isFinite(d) && d > 0) score += d
    }
    if (score > best + 1e-9) {
      best = score
      bestStart = s
    }
  }
  if (!(best > 0)) return middle
  return r3(Math.min(maxStart, Math.max(0, bestStart)))
}

/**
 * Início do corte no SERVIDOR (o que o navegador sugeriu, conferido contra a duração MEDIDA): o trecho usado + dissolve
 * + folga cabe no vídeo; sem sugestão válida = o meio. null = o vídeo não comporta o corte (curto demais).
 */
export function clampUserVideoStart(suggested: unknown, measured: number, cut: number): number | null {
  if (!finitePos(measured) || !finitePos(cut)) return null
  const maxStart = r3(measured - cut - ADS_V2_USER_VIDEO_FADE - ADS_V2_USER_VIDEO_MARGIN)
  if (maxStart < 0) return null
  const fallback = Math.max(0, (measured - cut) / 2 - ADS_V2_USER_VIDEO_FADE / 2)
  const s = typeof suggested === 'number' && Number.isFinite(suggested) && suggested >= 0 ? suggested : fallback
  return r3(Math.min(maxStart, Math.max(0, s)))
}
