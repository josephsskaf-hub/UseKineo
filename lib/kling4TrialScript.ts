// ═══ KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "2 c"] ═══
// O filme grátis do Kling 4 é UM clipe de 15 s (kling/v4, duration 15, multi_prompt). A rota mandava ao clipe de 15 s qualquer
// fala do roteiro do Seedance de 15 s (36–56 palavras, feito para 3 clipes de 6–8 s). Farol (e8f91bdf, 01/11): 18,4 s de
// narração sobre 15 s de imagem.
//
// Decisão do fundador (02/11, opção "C"): o ROTEIRISTA escreve para caber nos 15 s quando o pedido vai ao Kling 4 grátis
// (faixaDoKling4NoEscritor, abaixo) e a MEDIÇÃO real da voz antes do pagamento fica como rede de segurança: acima de 15,5 s,
// Seedance. As duas peças:
//
// 1. A MEDIÇÃO (rede de segurança). Os 20 claims Kling 4 de 29/10–01/11 falam de 1,42 a 2,79 palavras/s — a MESMA voz (onyx 0,92,
//    en) dá 2,17 no farol e ≥ 2,73 no a371e0ea —, então régua nenhuma de texto DECIDE. A rota OUVE: antes da reserva e do POST
//    pago, sintetiza a narração EXATAMENTE como a montagem vai sintetizar (mesmo texto, voz assinada, velocidade, língua e
//    qualidade — lib/audioNoCliqueServer vozClassicaAquecivel, a mesma chave do cache de voz do /api/compose), lê a duração do
//    mp3 e: ≤ 15,5 s medidos → Kling 4; acima, sem medida (TTS falhou, voz não assinada, texto que o compose reescreveria) ou
//    estourado o prazo próprio da medição (K4_PRAZO_DA_MEDICAO_MS) → o Seedance de 3 clipes, que filma a fala inteira. Na dúvida,
//    Seedance; nunca se amputa a fala do cliente. Custo: uma TTS + um Whisper (centavos), que a montagem NÃO paga de novo.
//
// 2. O ALVO DO ESCRITOR (o que faz a maioria caber). É em PALAVRAS, por língua, tirado das durações medidas (palavras ×
//    segundos dos 20 filmes; scripts/test-k4-narracao-cabe-0111.mts simula cada filme no tamanho do alvo com a duração real
//    por palavra dele). E fica SEMPRE dentro da faixa que o Seedance de 15 s aceita (faixaAceitaNoFilmeCurto, a mesma do
//    escritor e do lib/meta95/ideiaNoEscritor pisoDoPortao): se a medição mandar o filme ao Seedance, o roteiro curto serve.
//    Língua sem interseção (a voz real fala o piso do Seedance em mais de 15,5 s) ou sem medida: null — o escritor usa a faixa
//    normal e a medição decide.
import { stripScriptMarkers, salvageScriptNarration } from '@/lib/scriptParser'
import { campoDaVozAssinada, vozAssinadaDoClaim, type VozDoFilmeCurto } from '@/lib/vozDoFilmeCurto'
import type { NarrationLanguage } from '@/lib/textLanguage'
import { faixaAceitaNoFilmeCurto, isSeedance15, SEEDANCE_SHORT_SECONDS } from '@/lib/durationByEngine'
import { MIN_COVERAGE } from '@/lib/narrationFit'
import { KLING4_TRIAL_LIVE, kling4TrialEligible } from '@/lib/kling4TrialPolicy'

/** Teto da fala MEDIDA (mp3 da voz da montagem) para o clipe único de 15 s. */
export const K4_TETO_MEDIDO_SEGUNDOS = 15.5
/** Prazo próprio da medição (TTS + Whisper): estourou = sem medida = Seedance, sem segurar a rota. */
export const K4_PRAZO_DA_MEDICAO_MS = 20_000

export type MotivoDaFalaK4 = 'fits' | 'narration_over_kling4_15s' | 'narration_unmeasured_kling4' | 'narration_measure_timeout_kling4'
export interface FalaK4 { seconds: number | null; maxSeconds: number; cabe: boolean; reason: MotivoDaFalaK4 }

/** A decisão, só sobre a duração medida: ≤ 15,5 s cabe; acima ou sem medida, não. */
export function kling4TrialFalaCabe(seconds: number | null): FalaK4 {
  const s = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0.5 ? Math.round(seconds * 1000) / 1000 : null
  if (s === null) return { seconds: null, maxSeconds: K4_TETO_MEDIDO_SEGUNDOS, cabe: false, reason: 'narration_unmeasured_kling4' }
  return { seconds: s, maxSeconds: K4_TETO_MEDIDO_SEGUNDOS, cabe: s <= K4_TETO_MEDIDO_SEGUNDOS, reason: s <= K4_TETO_MEDIDO_SEGUNDOS ? 'fits' : 'narration_over_kling4_15s' }
}

/** O que a medição usa (injetável no teste): a voz clássica aquecível e a leitura do cache de voz — as do compose. */
export interface DepsDaFalaK4 {
  aquecivel: (a: { script: string; speed: number; vertical: string | undefined; language: NarrationLanguage; quality: string; log?: string }) => { chave: string; produzir: () => Promise<boolean> } | null
  lookup: (chave: string) => Promise<{ audioDuration: number } | null>
}

async function depsDeProducao(): Promise<DepsDaFalaK4> {
  const [{ vozClassicaAquecivel }, { lookupCachedVoiceover }] = await Promise.all([import('@/lib/audioNoCliqueServer'), import('@/lib/compose')])
  return { aquecivel: vozClassicaAquecivel, lookup: lookupCachedVoiceover }
}

type ArgsDaFalaK4 = {
  voiceoverScript: string
  verbatim: boolean
  scriptSpeed: unknown
  voz: VozDoFilmeCurto | null
  language: NarrationLanguage
  quality: string
  log?: string
  /** Prazo da medição (padrão K4_PRAZO_DA_MEDICAO_MS). */
  prazoMs?: number
}

async function medirSemPrazo(a: ArgsDaFalaK4, deps?: DepsDaFalaK4): Promise<FalaK4> {
  try {
    const raw = String(a.voiceoverScript ?? '')
    const narracao = stripScriptMarkers(raw) || (raw.trim() ? salvageScriptNarration(raw) : '')
    if (!narracao || !a.voz) return kling4TrialFalaCabe(null)
    const assinada = vozAssinadaDoClaim({ narration_voice: campoDaVozAssinada(a.voz), speed: a.scriptSpeed })
    if (!assinada) return kling4TrialFalaCabe(null)
    const s = Number(assinada.speed)
    const explicitSpeed = Number.isFinite(s) && s > 0 ? Math.max(0.7, Math.min(1.3, s)) : null // ≡ compose
    if (explicitSpeed === null && !a.verbatim) return kling4TrialFalaCabe(null)
    const d = deps ?? await depsDeProducao()
    const voz = d.aquecivel({ script: narracao, speed: explicitSpeed ?? 1.0, vertical: assinada.vertical, language: a.language, quality: a.quality, log: a.log })
    if (!voz) return kling4TrialFalaCabe(null)
    if (!(await voz.produzir())) return kling4TrialFalaCabe(null)
    const pronta = await d.lookup(voz.chave)
    return kling4TrialFalaCabe(pronta?.audioDuration ?? null)
  } catch (e) {
    console.warn('[kling4-trial] KINEO-K4-NARRACAO-CABE-0111 medição da fala falhou (→ Seedance):', e instanceof Error ? e.message : String(e))
    return kling4TrialFalaCabe(null)
  }
}

/**
 * Sintetiza (ou acha no cache) a narração que a montagem vai falar e devolve a decisão pela duração MEDIDA. Nunca lança e
 * nunca passa do prazo próprio (K4_PRAZO_DA_MEDICAO_MS): estourou → 'narration_measure_timeout_kling4' → Seedance (a TTS que
 * terminar depois só deixa o mp3 no cache, que a montagem do Seedance não usa — nada é cobrado do cliente).
 * Derivação ≡ /api/compose: texto = stripScriptMarkers(voiceover_script) (ou o salvamento); voz e velocidade = o
 * `narration_voice` assinado × `speed` do roteiro (vozAssinadaDoClaim); o compose só fala o texto como está com velocidade
 * explícita ou roteiro verbatim — fora disso ele reescreve antes da TTS e não há o que medir aqui (→ Seedance).
 */
export async function medirFalaDoKling4Trial(a: ArgsDaFalaK4, deps?: DepsDaFalaK4): Promise<FalaK4> {
  const prazo = typeof a.prazoMs === 'number' && Number.isFinite(a.prazoMs) && a.prazoMs > 0 ? a.prazoMs : K4_PRAZO_DA_MEDICAO_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  const estouro = new Promise<FalaK4>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[kling4-trial] KINEO-K4-NARRACAO-CABE-0111 medição da fala passou de ${prazo} ms (→ Seedance)`)
      resolve({ ...kling4TrialFalaCabe(null), reason: 'narration_measure_timeout_kling4' })
    }, prazo)
  })
  try {
    return await Promise.race([medirSemPrazo(a, deps), estouro])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// ═══ O alvo do escritor do filme grátis Kling 4 (opção C, fundador 02/11) ═══════════════════════════════════════════════
// Teto de PALAVRAS faladas por língua, das durações medidas dos 20 filmes (claims kling4_trial × render_delivered_measured,
// 29/10–01/11; os dados e a simulação estão em scripts/test-k4-narracao-cabe-0111.mts):
//   · en (10 filmes): 6 falam ≥ 2,57 pal/s (echo 0,96, alloy, onyx sem reticências) e cabem com até 39 palavras; os outros 4
//     (onyx 0,92/alloy 0,9 com reticências e palavras longas, 2,13–2,19 pal/s) só caberiam com ≤ 33 — abaixo do piso de 36 do
//     Seedance, então não se persegue. Teto 38: o mais lento dos 6 (702699d9, 0,389 s/palavra) fala 38 em 14,8 s — 0,7 s de folga.
//   · de (1 filme, ed6e422f): 33 palavras couberam nos 15 s (o filme parou no piso de 15 s). Teto 33, nenhuma extrapolação.
//   · pt (4), ar (3), pl (1), el (1): a voz real fala o piso do Seedance (36; pl 32) em 16,4–25 s — sem interseção, faixa normal.
//   · demais línguas (es, tr, …): sem medida — faixa normal; a medição decide.
export const K4_TETO_DO_ESCRITOR_POR_LINGUA: Readonly<Record<string, number>> = { en: 38, de: 33 }

export interface FaixaK4DoEscritor { min: number; max: number; language: string }

/**
 * A faixa de palavras do escritor quando o filme vai ao Kling 4 grátis: [piso do Seedance de 15 s, teto medido do Kling 4],
 * só se as duas se cruzam. Nunca abaixo do piso do Seedance (se a medição mandar ao Seedance, o roteiro serve) e nunca acima do
 * teto dele. null = sem interseção ou sem medida → o escritor usa a faixa normal.
 */
export function faixaDoKling4NoEscritor(language: string | null | undefined): FaixaK4DoEscritor | null {
  const lang = typeof language === 'string' ? language.trim().toLowerCase() : ''
  const teto = K4_TETO_DO_ESCRITOR_POR_LINGUA[lang]
  if (!(typeof teto === 'number' && teto > 0)) return null
  const seedance = faixaAceitaNoFilmeCurto(SEEDANCE_SHORT_SECONDS, MIN_COVERAGE, lang)
  const max = Math.min(teto, seedance.max)
  if (seedance.min > max) return null
  return { min: seedance.min, max, language: lang }
}

/** O pedido vai ao Kling 4 grátis? O mesmo predicado da rota (kling4TrialEligible), lido no escritor — falha = null. */
export async function faixaDoKling4ParaOPedido(a: {
  engine: unknown
  seconds: number
  language: string
  /** Plano já pago (lista do cobrador) ou has_paid; null = perfil ilegível → sem faixa. */
  paid: boolean | null
  /** Filmes não falhos e débitos cinematic-% não estornados da pessoa (null = ilegível). */
  contar: () => Promise<{ films: number | null; debits: number | null }>
  live?: boolean
}): Promise<FaixaK4DoEscritor | null> {
  try {
    if (!(a.live ?? KLING4_TRIAL_LIVE) || a.seconds !== SEEDANCE_SHORT_SECONDS) return null
    if (!isSeedance15(typeof a.engine === 'string' ? a.engine : null) || a.paid !== false) return null
    const faixa = faixaDoKling4NoEscritor(a.language)
    if (!faixa) return null
    const { films, debits } = await a.contar()
    // admitted: true — a admissão do filme grátis (trial/região/semana) é da rota; fora dela, o roteiro na faixa do Kling 4
    // continua dentro da faixa do Seedance de 15 s, então não há pedido que o portão recuse por causa dela.
    const elegivel = kling4TrialEligible({ paid: false, admitted: true, shortFilm: true, priorFilms: films, priorDebits: debits, live: a.live })
    return elegivel ? faixa : null
  } catch (e) {
    console.warn('[kling4-trial] KINEO-K4-NARRACAO-CABE-0111 elegibilidade no escritor não lida (faixa normal):', e instanceof Error ? e.message : String(e))
    return null
  }
}

/** Instrução extra do escritor no Kling 4 grátis: substitui a faixa de palavras do prompt e corta as pausas longas. */
export function instrucaoDoKling4NoEscritor(faixa: FaixaK4DoEscritor): string {
  return `KLING 4 SINGLE-SHOT FILM (overrides the word range above): this film is ONE continuous 15-second shot and the narration must end inside it.
- Total script: ${faixa.min}-${faixa.max} spoken words (not counting the [Pexels: ...] cues or the section headers). Never fewer than ${faixa.min}, never more than ${faixa.max}.
- Every pause costs screen time: do NOT use "..." or em-dashes in this script; end sentences with periods. Prefer short, common words.
- Still HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF — and the PAYOFF still delivers the concrete answer as the last sentence.`
}
