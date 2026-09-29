// ═══ KINEO-SEEDANCE-15S-2026-09-29 — a duração de 15 s existe SÓ no Seedance 1.5 ('cinematic_ai') ═══
// "Vai" nominal do fundador para o 15 s (29/09). O Seedance a 15 s custa creditCostForDuration('cinematic_ai', true, 15)
// = 7 créditos — o primeiro filme de IA que cabe no trial de 10. Os outros motores continuam em 35/60/90:
//   · Kling 3 / H3 / Omni / Seedance 2.5 (estrada hollywood) planejam no mínimo ~34 s (Math.max(30, …)+4); um pedido
//     de 15 s cobrava 15 s e entregava 34 — o furo que a rota do cinematic passa a recusar;
//   · Kling 2.5 / Veo / Sora não têm prova a 15 s.
// Regra da casa (M1 do cético): NUNCA subir 15 → 35 em silêncio depois de a tela mostrar o preço de 15 s — é
// cobrança-surpresa (lib/credits/engineCost.ts: "preço que muda depois do clique"). Fora do Seedance, 15 s (ou
// qualquer alvo abaixo de 35) é RECUSA honesta, antes de qualquer débito.
//
// Módulo PURO (sem import): lido pela rota, pelo /studio, pelo /generate e executado pelo guardião
// scripts/test-seedance-15s-2026-09-29.mjs via transpile.

/** O menor alvo que todo motor aceita. Abaixo disto, só o Seedance 1.5. */
export const MIN_DURATION_ALL_ENGINES = 35
/** O alvo curto do Seedance 1.5. */
export const SEEDANCE_SHORT_SECONDS = 15
/** Botões de duração do Seedance 1.5 (o 15 só aparece para quem o interruptor SEEDANCE_15S_PUBLIC deixa). */
export const SEEDANCE_DURATIONS = [15, 35, 60, 90] as const
/** Botões de duração dos demais motores (mesma lista global de lib/expandPolicy.ts SUPPORTED_DURATIONS). */
export const DEFAULT_ENGINE_DURATIONS = [35, 60, 90] as const

/**
 * É o Seedance 1.5? Aceita as chaves da UI ('seedance'), a quality do biller ('cinematic_ai') e a ausência de motor
 * (a rota do cinematic trata `engine` ausente/desconhecido como Seedance — ver o `: 'cinematic_ai'` do costQuality).
 */
export function isSeedance15(engine: string | null | undefined): boolean {
  const k = typeof engine === 'string' ? engine.trim().toLowerCase() : ''
  if (k === '' || k === 'seedance' || k === 'cinematic_ai') return true
  const outros = ['kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25', 'fast', 'creator', 'avatar', 'presenter']
  const qualidades = ['cinematic_kling', 'cinematic_veo', 'cinematic_sora', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']
  return !outros.includes(k) && !qualidades.includes(k)
}

/** As durações que o seletor oferece para este motor. */
export function supportedDurationsFor(engine: string | null | undefined): readonly number[] {
  return isSeedance15(engine) ? SEEDANCE_DURATIONS : DEFAULT_ENGINE_DURATIONS
}

export type ChecagemDeDuracao =
  | { ok: true }
  | { ok: false; recusa: 'only_seedance_15s'; sugestao: number }

/** 15 s (ou qualquer alvo abaixo de 35) fora do Seedance = recusa; nunca troca a duração em silêncio. */
export function checarDuracao(engine: string | null | undefined, seconds: number): ChecagemDeDuracao {
  if (!Number.isFinite(seconds)) return { ok: true }
  if (seconds < MIN_DURATION_ALL_ENGINES && !isSeedance15(engine)) {
    return { ok: false, recusa: 'only_seedance_15s', sugestao: MIN_DURATION_ALL_ENGINES }
  }
  return { ok: true }
}

export const ONLY_SEEDANCE_15S_MESSAGE = '15-second films are available on Seedance 1.5; pick 35 s for this engine.'

// ─── B4 do cético: roteiro longo pedido como filme curto ────────────────────────────────────────────────────────
// Em verbatim, o nº de clipes segue a FALA (route.ts #442, até 9) e o compose deixa o áudio mandar até 90 s, mas o
// preço fica selado na duração pedida. Sem esta guarda, 150 palavras "a 15 s" viravam um filme de ~60 s por 7 cr.
// A estimativa é a MESMA do #442 da rota (palavras ÷ 2,5 pal/s — o guardião confere que a rota ainda usa 2,5).
export const VERBATIM_EST_WORDS_PER_SECOND = 2.5
/** Folga de fala sobre o alvo curto: 15 s × 1,5 = 22,5 s (≈ 56 palavras, o teto do roteirista para 15 s). */
export const SHORT_FILM_SPEECH_FACTOR = 1.5

export type ChecagemDeFalaCurta =
  | { ok: true; estSeconds: number; limitSeconds: number }
  | { ok: false; recusa: 'script_too_long_for_short_film'; estSeconds: number; limitSeconds: number; sugestao: number }

/**
 * Seedance a menos de 35 s em verbatim: a fala estimada não pode passar de alvo × 1,5. Acima disso, recusa ANTES
 * do débito sugerindo 35 s. Fora do Seedance, ou a partir de 35 s, ou fora do verbatim, não se aplica (ok).
 */
export function checarFalaDoFilmeCurto(args: {
  engine: string | null | undefined
  seconds: number
  verbatim: boolean
  narration: string
}): ChecagemDeFalaCurta {
  const words = String(args.narration ?? '').split(/\s+/).filter(Boolean).length
  const estSeconds = words / VERBATIM_EST_WORDS_PER_SECOND
  const limitSeconds = args.seconds * SHORT_FILM_SPEECH_FACTOR
  if (!args.verbatim || !isSeedance15(args.engine) || !(args.seconds < MIN_DURATION_ALL_ENGINES)) {
    return { ok: true, estSeconds, limitSeconds }
  }
  if (estSeconds > limitSeconds) {
    return { ok: false, recusa: 'script_too_long_for_short_film', estSeconds, limitSeconds, sugestao: MIN_DURATION_ALL_ENGINES }
  }
  return { ok: true, estSeconds, limitSeconds }
}

export function scriptTooLongForShortFilmMessage(seconds: number, estSeconds: number): string {
  return `This script reads for about ${Math.round(estSeconds)} seconds — too long for a ${seconds}-second film. Pick 35 s for this script, or shorten it. Nothing was charged.`
}
