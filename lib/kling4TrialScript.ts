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
// 2. O ALVO DO ESCRITOR (o que faz a maioria caber; "vai 16", fundador 02/11). É em PALAVRAS e mira o PISO do portão do
//    Seedance de 15 s (75 % de cobertura no passo da voz — a régua da rota), com teto por voz (faixaDoKling4NoEscritor, abaixo).
//    Se a medição mandar o filme ao Seedance, o roteiro serve: está acima do piso do portão em qualquer voz.
//    scripts/test-k4-narracao-cabe-0111.mts simula os 20 filmes reais no tamanho do alvo, com a duração real por palavra.
import { stripScriptMarkers, salvageScriptNarration } from '@/lib/scriptParser'
import { campoDaVozAssinada, vozAssinadaDoClaim, type VozDoFilmeCurto } from '@/lib/vozDoFilmeCurto'
import type { NarrationLanguage } from '@/lib/textLanguage'
import { isSeedance15, SEEDANCE_SHORT_SECONDS, maxWordsForShortFilm, ritmoDoFilmeCurto, ritmoDaVozNoIdioma } from '@/lib/durationByEngine'
import { minCoverageFor } from '@/lib/narrationFit'
import { speechRateFor } from '@/lib/speechRate'
import { VOICE_PERSONAS } from '@/lib/narration/personas'
import { vozDoFilmeCurto } from '@/lib/vozDoFilmeCurto'
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
 * nunca passa do prazo próprio (K4_PRAZO_DA_MEDICAO_MS): estourou → 'narration_measure_timeout_kling4' → Seedance. A TTS que
 * terminar depois deixa o mp3 no cache de voz com a MESMA chave (mesmo texto, voz, velocidade, língua e qualidade), e a montagem
 * do Seedance o USA — não paga a voz de novo; nada é cobrado do cliente pela medição.
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

// ═══ O alvo do escritor do filme grátis Kling 4 ("vai 16", fundador 02/11) ═══════════════════════════════════════════════
// O escritor mira o PISO do portão do Seedance de 15 s — a mesma régua da rota: fala estimada ≥ 75 % de 15 s
// (minCoverageFor(15) = SHORT_FILM_MIN_COVERAGE) no passo da VOZ (speechRateFor × ritmo da língua, como narrationRate na rota
// do cinematic). A voz do 15 s é escolhida DEPOIS, pelas palavras do roteiro pronto (vozDoFilmeCurto → detectNiche), então a
// faixa vale para TODA voz que o 15 s pode escolher:
//   · PISO = o piso do portão na voz MAIS RÁPIDA do 15 s (o teto de passo da casa, ritmoDoFilmeCurto: 2,5 pal/s × língua) —
//     com ele o portão passa em qualquer voz; nunca abaixo do piso do Seedance, nunca filme recusado por fala curta;
//   · TETO = o que cabe nos 15,5 s na voz pedida (ou na mais LENTA, quando a voz não é conhecida): passo nominal da voz × o
//     fator real medido (K4_FATOR_REAL_MEDIDO: o pior real ÷ nominal dos filmes da língua), e nunca menos que PISO + folga.
// A medição da voz (≤ 15,5 s) continua decidindo: faixa é alvo, não garantia.
/** Folga mínima acima do piso (o corte por frases inteiras precisa de espaço para cair dentro da faixa). */
export const K4_FOLGA_DO_ESCRITOR = 2
/**
 * Fator real ÷ nominal mais baixo medido por língua (palavras/s medidas no mp3 ÷ passo nominal da voz assinada), dos filmes
 * Kling 4 de 29/10–01/11 que NÃO pararam no piso de 15 s. en: 6039e4e5 (futuristic-ai, 2,194 ÷ 2,5 = 0,878) — arredondado para
 * baixo. Língua sem medida suficiente: sem fator (o teto fica em piso + folga).
 */
export const K4_FATOR_REAL_MEDIDO: Readonly<Record<string, number>> = { en: 0.87 }

/** Palavras mínimas que o portão do Seedance de 15 s aceita numa voz de passo `wps` (já na língua): ⌈15 × 75 % × wps⌉. */
export function pisoDoPortaoNaVoz(wps: number): number {
  return Math.ceil(SEEDANCE_SHORT_SECONDS * minCoverageFor(SEEDANCE_SHORT_SECONDS) * wps - 1e-9)
}

/** Passo nominal (pal/s, na língua) de uma voz do 15 s — a mesma conta da rota (narrationRate do cinematic, sem `speed:`). */
export function passoDaVozNoFilmeCurto(voz: { voice: string; defaultSpeed: number }, language: string): number {
  return ritmoDaVozNoIdioma(speechRateFor({ family: 'classic', language, voice: voz.voice, personaSpeed: voz.defaultSpeed }).wordsPerSecond, language)
}

/** A voz mais LENTA que o 15 s pode escolher (todas as personas e a de legado, onyx × 1,0), na língua. */
export function passoMaisLentoDoFilmeCurto(language: string): number {
  const passos = [...VOICE_PERSONAS.map((p) => ({ voice: p.voice, defaultSpeed: p.defaultSpeed })), { voice: 'onyx', defaultSpeed: 1 }]
    .map((v) => passoDaVozNoFilmeCurto(v, language))
  return Math.min(...passos)
}

export interface FaixaK4DoEscritor { min: number; max: number; language: string; voiceWordsPerSecond: number | null }

/**
 * A faixa de palavras do escritor quando o filme vai ao Kling 4 grátis. `vozWps` = passo da voz (na língua), quando a voz é
 * conhecida; null = a mais lenta do 15 s. PISO = portão de 75 % na voz mais rápida (serve a qualquer voz e ao Seedance);
 * TETO = cabe em 15,5 s na voz, no fator real medido; nunca menos que piso + folga, nunca acima do teto da guarda do Seedance.
 */
export function faixaDoKling4NoEscritor(language: string | null | undefined, vozWps?: number | null): FaixaK4DoEscritor {
  const lang = typeof language === 'string' && language.trim() ? language.trim().toLowerCase() : 'en'
  const piso = pisoDoPortaoNaVoz(ritmoDoFilmeCurto(lang))
  const passo = typeof vozWps === 'number' && Number.isFinite(vozWps) && vozWps > 0 ? vozWps : passoMaisLentoDoFilmeCurto(lang)
  const fator = K4_FATOR_REAL_MEDIDO[lang]
  const cabe = typeof fator === 'number' && fator > 0 ? Math.floor(K4_TETO_MEDIDO_SEGUNDOS * fator * passo + 1e-9) : 0
  const max = Math.min(maxWordsForShortFilm(SEEDANCE_SHORT_SECONDS, lang), Math.max(piso + K4_FOLGA_DO_ESCRITOR, cabe))
  return { min: Math.min(piso, max), max, language: lang, voiceWordsPerSecond: typeof vozWps === 'number' && vozWps > 0 ? vozWps : null }
}

/** O pedido vai ao Kling 4 grátis? O mesmo predicado da rota (kling4TrialEligible), lido no escritor — falha = null. */
export async function faixaDoKling4ParaOPedido(a: {
  engine: unknown
  seconds: number
  language: string
  /** Plano já pago (lista do cobrador) ou has_paid; null = perfil ilegível → sem faixa. Lido SÓ depois das checagens baratas. */
  lerPago: () => Promise<boolean | null>
  /** Filmes não falhos e débitos cinematic-% não estornados da pessoa (null = ilegível). */
  contar: () => Promise<{ films: number | null; debits: number | null }>
  /** O `vertical` do pedido, quando já existe (caminho do servidor): a voz prevista dá o TETO da faixa; o piso não muda. */
  vertical?: string | null
  /** O texto do pedido (prevê a voz junto com o vertical). */
  topic?: string
  live?: boolean
}): Promise<FaixaK4DoEscritor | null> {
  try {
    if (!(a.live ?? KLING4_TRIAL_LIVE) || a.seconds !== SEEDANCE_SHORT_SECONDS) return null
    if (!isSeedance15(typeof a.engine === 'string' ? a.engine : null)) return null
    if ((await a.lerPago()) !== false) return null
    const { films, debits } = await a.contar()
    // admitted: true — a admissão do filme grátis (trial/região/semana) é da rota; fora dela, o roteiro na faixa continua
    // acima do piso do portão do Seedance de 15 s em qualquer voz, então não há pedido que a rota recuse por causa dela.
    if (!kling4TrialEligible({ paid: false, admitted: true, shortFilm: true, priorFilms: films, priorDebits: debits, live: a.live })) return null
    const vertical = typeof a.vertical === 'string' && a.vertical.trim() ? a.vertical : null
    const voz = vertical ? (() => { try { return vozDoFilmeCurto({ engine: a.engine, seconds: a.seconds, narration: String(a.topic ?? ''), vertical, language: a.language as NarrationLanguage }) } catch { return null } })() : null
    return faixaDoKling4NoEscritor(a.language, voz ? passoDaVozNoFilmeCurto(voz, a.language) : null)
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
