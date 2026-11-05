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
import { stripScriptMarkers, salvageScriptNarration, parseUserScript } from '@/lib/scriptParser'
import { campoDaVozAssinada, vozAssinadaDoClaim, type VozDoFilmeCurto } from '@/lib/vozDoFilmeCurto'
import type { NarrationLanguage } from '@/lib/textLanguage'
import { isSeedance15, SEEDANCE_SHORT_SECONDS, maxWordsForShortFilm, ritmoDoFilmeCurto, ritmoDaVozNoIdioma, fatorDoRitmoDoIdioma, VERBATIM_EST_WORDS_PER_SECOND } from '@/lib/durationByEngine'
import { minCoverageFor, speechSeconds, WORDS_PER_SECOND } from '@/lib/narrationFit'
import { speechRateFor, CLASSIC_VOICE_WORDS_PER_SECOND } from '@/lib/speechRate'
import { VOICE_PERSONAS } from '@/lib/narration/personas'
import { vozDoFilmeCurto } from '@/lib/vozDoFilmeCurto'
import { KLING4_TRIAL_LIVE, kling4TrialEligible } from '@/lib/kling4TrialPolicy'
import { KLING4_PAID_LIVE } from '@/lib/kling4PaidPolicy' // KINEO-K4-PAGO-CABE-0211 — o mesmo interruptor da rota (paidKling4 = engine 'hollywood' && KLING4_PAID_LIVE)
import { RITMO_HOLLYWOOD } from '@/lib/durationByEngine' // KINEO-K4-PAGO-CABE-0211 — a régua do portão pago (narrationFitAt na família hollywood)
import { palavrasPorSecao } from '@/lib/shortFilmScript' // KINEO-K4-FAIXA-TETO-0511 — o orçamento por seção do pedido de apara

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

// ═══ O alvo do escritor do filme grátis Kling 4 ("vai 16", fundador 02/11; revisão 3) ═══════════════════════════════════
// Ficar ABAIXO do alvo é defeito (regra do fundador). A faixa:
//   · PISO = o maior entre (a) o piso do portão do Seedance de 15 s (75 % de 15 s na voz nominal mais rápida do 15 s, 2,5 pal/s
//     × língua) + 1 palavra de margem — contado como o portão conta (palavrasNoPortao), nunca dá 422 narration_too_short — e
//     (b) o que a voz REAL mais rápida medida fala em K4_FALA_MINIMA_SEGUNDOS (en: 2,79 pal/s, ddf69f98): a fala não fica curta
//     num filme de 15 s, nem no Kling 4 nem no Seedance de reserva (teto do dia, fal, medição que falhou);
//   · TETO = o que cabe em 15,5 s na voz PREVISTA (passo nominal × o fator real medido DESSA voz, K4_FATOR_REAL_POR_VOZ); sem voz
//     prevista, a mais restritiva das vozes do 15 s; nunca menos que piso + 1, nunca acima da guarda do Seedance.
// A medição da voz (≤ 15,5 s) continua decidindo: faixa é alvo, não garantia.
/** Margem sobre o piso do portão (palavras). */
export const K4_MARGEM_DO_PORTAO = 1
/** Fala mínima (s) na voz real mais rápida medida. 11,1 s: com 32 palavras (11,5 s) o de7071ea (onyx, 0,470 s/palavra) passa de 15,5 s no teto. */
export const K4_FALA_MINIMA_SEGUNDOS = 11.1
/** Voz real mais rápida medida por língua (palavras/s no mp3, claims Kling 4 de 29/10–01/11). Sem medida: en × fator da língua. */
export const K4_PASSO_REAL_MAIS_RAPIDO: Readonly<Record<string, number>> = { en: 2.79, pt: 2.12, ar: 2.12, pl: 1.83, de: 2.2, el: 1.42 }
/** Fator real ÷ nominal mais baixo medido POR VOZ (en): echo 0,96 = e566cb2a; futuristic-ai = 6039e4e5; onyx 0,92 = de7071ea; alloy 0,9 = b4cbb871. */
export const K4_FATOR_REAL_POR_VOZ: Readonly<Record<string, number>> = { 'echo@0.96': 0.89, 'alloy@0.98': 0.87, 'onyx@0.92': 0.92, 'alloy@0.9': 0.93 }
/** Fator para voz sem medida (en): o pior medido entre todas. */
export const K4_FATOR_REAL_PADRAO = 0.87
/** Línguas com fator real medido (fora delas o teto é piso + 1). */
const LINGUAS_COM_FATOR = new Set(['en'])
const chaveDaVoz = (v: { voice: string; defaultSpeed: number }) => `${v.voice}@${Math.round(v.defaultSpeed * 100) / 100}`

/** Palavras faladas como o PORTÃO da rota conta (narrationFitAt → speechSeconds: narração sem marcadores, narrationWordCount). */
export function palavrasNoPortao(script: string): number {
  return Math.round(speechSeconds(parseUserScript(String(script ?? '')).narration) * WORDS_PER_SECOND)
}

/** Palavras mínimas que o portão do Seedance de 15 s aceita numa voz de passo `wps` (já na língua): ⌈15 × 75 % × wps⌉. */
export function pisoDoPortaoNaVoz(wps: number): number {
  return Math.ceil(SEEDANCE_SHORT_SECONDS * minCoverageFor(SEEDANCE_SHORT_SECONDS) * wps - 1e-9)
}

/** Passo nominal (pal/s, na língua) de uma voz do 15 s — a mesma conta da rota (narrationRate do cinematic, sem `speed:`). */
export function passoDaVozNoFilmeCurto(voz: { voice: string; defaultSpeed: number }, language: string): number {
  return ritmoDaVozNoIdioma(speechRateFor({ family: 'classic', language, voice: voz.voice, personaSpeed: voz.defaultSpeed }).wordsPerSecond, language)
}

/** As vozes que o 15 s pode escolher (personas com a velocidade limitada como vozDoFilmeCurto faz, e a de legado onyx × 1,0). */
function vozesDoFilmeCurto(): Array<{ voice: string; defaultSpeed: number }> {
  return [...VOICE_PERSONAS.map((p) => ({ voice: p.voice as string, defaultSpeed: p.defaultSpeed })), { voice: 'onyx', defaultSpeed: 1 }].map((v) => {
    const passo = CLASSIC_VOICE_WORDS_PER_SECOND[v.voice]
    const teto = passo > 0 ? VERBATIM_EST_WORDS_PER_SECOND / passo : Infinity
    return v.defaultSpeed <= teto + 1e-9 ? v : { voice: v.voice, defaultSpeed: Math.floor(teto * 100 + 1e-9) / 100 }
  })
}

/** O que cabe em 15,5 s numa voz (fator real medido dela); null fora das línguas com fator medido. */
function cabeNaVoz(voz: { voice: string; defaultSpeed: number }, lang: string): number | null {
  if (!LINGUAS_COM_FATOR.has(lang)) return null
  const fator = K4_FATOR_REAL_POR_VOZ[chaveDaVoz(voz)] ?? K4_FATOR_REAL_PADRAO
  return Math.floor(K4_TETO_MEDIDO_SEGUNDOS * fator * passoDaVozNoFilmeCurto(voz, lang) + 1e-9)
}

export interface FaixaK4DoEscritor { min: number; max: number; language: string; voiceWordsPerSecond: number | null }

/**
 * A faixa de palavras do escritor quando o filme vai ao Kling 4 grátis. `voz` = a voz prevista (caminho do servidor), ou null
 * (a voz é escolhida depois, pelas palavras do roteiro): o teto fica na voz mais restritiva do 15 s.
 */
export function faixaDoKling4NoEscritor(language: string | null | undefined, voz?: { voice: string; defaultSpeed: number } | null): FaixaK4DoEscritor {
  const lang = typeof language === 'string' && language.trim() ? language.trim().toLowerCase() : 'en'
  const passoReal = K4_PASSO_REAL_MAIS_RAPIDO[lang] ?? K4_PASSO_REAL_MAIS_RAPIDO.en * fatorDoRitmoDoIdioma(lang)
  const piso = Math.max(pisoDoPortaoNaVoz(ritmoDoFilmeCurto(lang)) + K4_MARGEM_DO_PORTAO, Math.ceil(K4_FALA_MINIMA_SEGUNDOS * passoReal - 1e-9))
  const cabes = (voz ? [voz] : vozesDoFilmeCurto()).map((v) => cabeNaVoz(v, lang)).filter((n): n is number => n !== null)
  const cabe = cabes.length ? Math.min(...cabes) : 0
  const max = Math.min(maxWordsForShortFilm(SEEDANCE_SHORT_SECONDS, lang), Math.max(piso + 1, cabe))
  return { min: Math.min(piso, max), max, language: lang, voiceWordsPerSecond: voz ? passoDaVozNoFilmeCurto(voz, lang) : null }
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
  /** O `vertical` do pedido, quando já existe (caminho do servidor): a voz prevista dá o TETO da faixa (fator real dela); o piso não muda. */
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
    return faixaDoKling4NoEscritor(a.language, voz ? { voice: voz.voice, defaultSpeed: voz.defaultSpeed } : null)
  } catch (e) {
    console.warn('[kling4-trial] KINEO-K4-NARRACAO-CABE-0111 elegibilidade no escritor não lida (faixa normal):', e instanceof Error ? e.message : String(e))
    return null
  }
}

// ═══ KINEO-K4-PAGO-CABE-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — o Kling 4 PAGO de 15 s ═══
// O filme pago de 15 s também é UM clipe de 15 s (kling/v4, multi_prompt; se a fal falhar, 3 × 5 s do Seedance com a fala
// dividida por igual). O escritor do caminho da ideia (engine 'hollywood') mirava a régua hollywood com cobertura 1,0
// (⌈15 × 2,3⌉ = 35 a 42 palavras). 02/11, dois filmes pagos (bc9177cd, 35 palavras; af240efa, 40): a voz falou 2,05 e 2,14
// pal/s, 16–19 s de fala em 15 s, e o compose recusou (scene_speech_exceeds_footage) DEPOIS de pagar a fal. A mesma faixa do
// grátis (acima), com as réguas do caminho pago:
//   · PISO = o portão pago (narrationFitAt na régua hollywood: 75 % de 15 s a 2,3 pal/s = 26) + K4_MARGEM_DO_PORTAO — nunca
//     422 kling4_paid_script_duration_mismatch, nunca 'curto' no meta95 (pisoDoPortao = o mesmo 26);
//   · TETO = o que cabe em K4_TETO_MEDIDO_SEGUNDOS na voz real mais lenta: 2,3 × fator da língua × K4_FATOR_REAL_PADRAO
//     (0,87 → 2,0 pal/s em en/pt/es, abaixo das duas vozes medidas no defeito); nunca menos que piso + 1.
// en/pt/es 27–31 (31 palavras a 2,05 pal/s = 15,1 s). O pago não mede a voz antes do POST: no escritor, este teto também é o
// teto DURO do corte por frases (generate-script). 30/60 s e o roteiro verbatim do cliente ficam como estão.
/** Duração do filme pago com faixa própria no escritor (o clipe único de 15 s). */
export const K4_PAGO_SEGUNDOS = 15
export function faixaDoKling4PagoNoEscritor(language: string | null | undefined): FaixaK4DoEscritor {
  const lang = typeof language === 'string' && language.trim() ? language.trim().toLowerCase() : 'en'
  const piso = Math.ceil(K4_PAGO_SEGUNDOS * minCoverageFor(K4_PAGO_SEGUNDOS) * RITMO_HOLLYWOOD - 1e-9) + K4_MARGEM_DO_PORTAO
  const passoReal = RITMO_HOLLYWOOD * fatorDoRitmoDoIdioma(lang) * K4_FATOR_REAL_PADRAO
  const max = Math.max(piso + 1, Math.floor(K4_TETO_MEDIDO_SEGUNDOS * passoReal + 1e-9))
  return { min: piso, max, language: lang, voiceWordsPerSecond: null }
}

/** O pedido vai ao Kling 4 PAGO de 15 s? O predicado da rota (engine 'hollywood' com KLING4_PAID_LIVE), na duração de 15 s. */
export function faixaDoKling4PagoParaOPedido(a: { engine: unknown; seconds: number; language: string; live?: boolean }): FaixaK4DoEscritor | null {
  if (!(a.live ?? KLING4_PAID_LIVE) || a.seconds !== K4_PAGO_SEGUNDOS || a.engine !== 'hollywood') return null
  return faixaDoKling4PagoNoEscritor(a.language)
}

/** Instrução extra do escritor no Kling 4 grátis: substitui a faixa de palavras do prompt e corta as pausas longas. */
export function instrucaoDoKling4NoEscritor(faixa: FaixaK4DoEscritor): string {
  return `KLING 4 SINGLE-SHOT FILM (overrides the word range above): this film is ONE continuous 15-second shot and the narration must end inside it.
- Total script: ${faixa.min}-${faixa.max} spoken words (not counting the [Pexels: ...] cues or the section headers). Never fewer than ${faixa.min}, never more than ${faixa.max}.
- Every pause costs screen time: do NOT use "..." or em-dashes in this script; end sentences with periods. Prefer short, common words.
- Still HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF — and the PAYOFF still delivers the concrete answer as the last sentence.`
}

// ═══ KINEO-K4-FAIXA-TETO-0511 — o roteiro do filme grátis Kling 4 nasce NA faixa, também quando o escritor condensa texto colado ═══
// Medido (events, 26/10–05/11): de 12 claims, 5 foram ao Seedance de reserva por fala acima de 15,5 s, todos com roteiro acima do teto:
//   A) o escritor passou da faixa nas duas versões (31–32 pedidas, 38→37 e 38→35 entregues) e o corte por frases não tinha o que tirar
//      (cada bloco é uma frase: tirar uma cai abaixo do piso); B) texto colado longo (ChatGPT, 59–446 palavras) ficava sem a faixa
//      (!colado.pasted) e o escritor o condensava para o teto do Seedance (41 palavras, 16,6–18,8 s), já sem ser palavra por palavra.
// Conserto: (B) colado que NÃO fica palavra por palavra (mais palavras que o teto normal do filme curto) entra na faixa; colado que
// cabe segue intacto, sem faixa. (A) ainda acima do teto depois da nova tentativa: UMA apara (só apaga e encurta), adotada só se
// melhora sem perder estrutura, final nem o piso. Falhou ou não melhorou: fica como está, e a medição da voz manda ao Seedance. O teto
// duro do corte por frases NÃO muda: nunca filme truncado, nunca 422.
/** O texto colado vai ser reescrito pelo escritor (não fica palavra por palavra)? Só aí a faixa do Kling 4 grátis vale para ele. */
export function coladoVaiNaFaixaDoKling4(colado: { pasted: boolean; words: number }, tetoDoFilmeCurto: number): boolean {
  return colado.pasted && colado.words > tetoDoFilmeCurto
}

/** Instrução extra quando o escritor condensa o texto colado para o Kling 4 grátis (a regra do colado pede ±10 %, impossível aqui). */
export function instrucaoDoColadoNoKling4(faixa: FaixaK4DoEscritor): string {
  return `THE USER'S TEXT IS LONGER THAN THIS FILM (overrides the "within 10%" rule above): condense it to ${faixa.min}-${faixa.max} spoken words. Narrate only what is meant to be spoken: ignore titles, timings, editing notes, on-screen text and descriptions. Keep the user's language, facts, names and order of events, reuse their own words where you can, invent nothing, and end on the user's own ending.`
}

/** KINEO-K4-FAIXA-TETO-0511B — o orçamento soma exatamente o alvo (maiores restos): arredondar tudo para baixo somava menos que o piso, e a apara obediente era recusada. */
export function orcamentoPorSecao(palavras: number[], alvo: number): number[] {
  const total = Math.max(1, palavras.reduce((a, n) => a + n, 0))
  const brutos = palavras.map((n) => (n * alvo) / total)
  const limites = brutos.map((b) => Math.max(3, Math.floor(b)))
  const porResto = brutos.map((b, i) => ({ i, resto: b - Math.floor(b) })).sort((a, z) => z.resto - a.resto).map((x) => x.i)
  for (let falta = alvo - limites.reduce((a, n) => a + n, 0), k = 0; falta > 0 && limites.length > 0; falta--, k++) limites[porResto[k % porResto.length]] += 1
  for (let sobra = limites.reduce((a, n) => a + n, 0) - alvo; sobra > 0; sobra--) { const maior = limites.indexOf(Math.max(...limites)); if (limites[maior] <= 3) break; limites[maior] -= 1 }
  return limites
}

/** O pedido da apara: o roteiro acima do teto perde palavras, sem ganhar fato. Orçamento por seção: o modelo não acerta o total sozinho. */
export function pedidoDeAparaDoKling4(script: string, palavras: number, faixa: FaixaK4DoEscritor): string {
  const secoes = palavrasPorSecao(script)
  const limites = orcamentoPorSecao(secoes.map((s) => s.words), faixa.min)
  const orcamento = secoes.map((s, i) => `${s.label}: ${s.words} words now, at most ${limites[i]}`).join('; ')
  return `This script has ${palavras} spoken words and this film holds at most ${faixa.max}: it must lose ${palavras - faixa.min} words. Word budget per section: ${orcamento}. Count each section word by word and stay inside its budget. Only delete or shorten: drop adjectives, adverbs, filler and repeated ideas, and shorten a clause when needed; do NOT add a fact, a name or a new sentence. Keep the same sections in the same order, the same [Pexels: ...] cues, and every sentence complete and grammatical. The last sentence of the PAYOFF must still state the same concrete answer. Do not use "..." or em-dashes. Respond with ONLY the script.`
}

/** A apara fica? Só com menos palavras, sem cair abaixo do piso e sem perder nada que a versão anterior tinha (a rota mede o resto). */
export function aparaDoKling4Serve(a: { antes: number; depois: number; pisoDepois: number; faixa: FaixaK4DoEscritor; estruturaIntacta: boolean }): boolean {
  return a.estruturaIntacta && a.depois < a.antes && a.pisoDepois >= a.faixa.min
}
