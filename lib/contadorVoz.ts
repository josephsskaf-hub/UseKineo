// ═══ STUDIO-CONTADOR-VOZ-2026-09-28 — o contador diz o tamanho REAL do filme com a voz escolhida ═══
//
// Fundador (28/09): "a pessoa que escolhe Kling 2.5 não sabe que precisa de N palavras; faz 110 e vira
// confusão de tempo". MEDIDO nesta sessão: o contador vivo da tela media com a régua da FAMÍLIA
// (clássico 3,1 pal/s) enquanto o servidor mede na régua da VOZ que o compose vai escolher
// (selectPersonaForScript → onyx 0,92 = 2,3 pal/s; fable 1,03 = 2,63; echo 0,96 = 2,45…). Com 203
// palavras a tela dizia 65 s e o servidor media 88 s (dark-mystery); com 110 palavras a tela dizia
// 35 s ("✓ fills your 35s") e o servidor media 48 s. Nos motores hollywood (Kling 3/H3/Omni/S25) a
// tela recebia `quality` = 'cinematic_ai' (família clássica, 3,1) enquanto o servidor usa 2,3.
//
// Esta lib é PURA (sem rede, sem React, sem server-only) e REUSA as funções do servidor em vez de
// espelhar números: a persona sai de `selectPersonaForScript` com a MESMA entrada da rota (fast: tier
// 'free', sem vertical; clássico cinematic: tier 'cinematic', vertical da análise), a régua de
// `speechRateFor`, a maior duração que cabe de `largestFittingDuration`, o "desce" de
// `decideDurationFollowsScript` e o "sobe/teto" de `decideDurationFollowsScriptUp`. Nenhum 15/35/90/
// 1,15 é digitado aqui: se a régua mudar lá, o contador acompanha (scripts/test-contador-voz-2026-09-28.mjs).
import { MIN_COVERAGE, AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD } from '@/lib/narrationFit'
import { SUPPORTED_DURATIONS, largestFittingDuration } from '@/lib/expandPolicy'
import { decideDurationFollowsScript, decideDurationFollowsScriptUp } from '@/lib/durationFollowsScript'
import { speechRateFor, speechFamilyForQuality, speechSecondsAt, type SpeechRate } from '@/lib/speechRate'
import { parseSpeed, parseUserScript } from '@/lib/scriptParser'
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import type { NarrationLanguage } from '@/lib/textLanguage'

export type ContadorMotor = 'fast' | 'seedance' | 'kling' | 'veo' | 'sora' | 'hollywood' | 'h3' | 'omni' | 's25'

/** Piso do "desce" por rota, como está escrito nas rotas: generate-video-fast `floorSeconds: 35`; cinematic clássico `: 15`; hollywood `AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD`. Com o seletor em 35/60/90 os três dão o mesmo resultado; ficam aqui para o guardião provar o espelho. */
export const CONTADOR_FLOOR_FAST_SECONDS = 35
export const CONTADOR_FLOOR_CLASSIC_SECONDS = 15

export interface ReguaDaTela {
  rate: SpeechRate
  /** persona que o servidor vai escolher (clássico) — null no hollywood (voz própria do modelo) ou se a seleção falhar */
  persona: { id: string; name: string; voice: string; defaultSpeed: number } | null
  floorSeconds: number
}

/**
 * A régua que O SERVIDOR vai usar para ESTA pessoa, prevista na tela com a mesma entrada:
 *  · Kineo 1 (generate-video-fast ~724): selectPersonaForScript(prompt, undefined, 'free', language)
 *  · clássico cinematic (generate-video-cinematic ~1540): selectPersonaForScript(prompt, vertical, 'cinematic', language)
 *  · hollywood: família 2,3 pal/s (voz própria), sem persona
 * e a velocidade lida do próprio texto (`speed: 1.2`), como nas duas rotas.
 */
export function reguaDoServidorNaTela(args: { engine: ContadorMotor; script: string; language: NarrationLanguage; vertical?: string | null }): ReguaDaTela {
  const script = args.script ?? ''
  const family = speechFamilyForQuality(args.engine)
  const speed = parseSpeed(script)
  if (family === 'hollywood') {
    return { rate: speechRateFor({ family, speed, language: args.language }), persona: null, floorSeconds: AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD }
  }
  const vertical = typeof args.vertical === 'string' && args.vertical.trim() ? args.vertical.trim().toLowerCase() : undefined
  const persona = (() => {
    try {
      return args.engine === 'fast'
        ? selectPersonaForScript(script, undefined, 'free', args.language)
        : selectPersonaForScript(script, vertical, 'cinematic', args.language)
    } catch { return null }
  })()
  return {
    rate: speechRateFor({ family: 'classic', speed, language: args.language, voice: persona?.voice, personaSpeed: persona?.defaultSpeed }),
    persona: persona ? { id: persona.id, name: persona.name, voice: persona.voice, defaultSpeed: persona.defaultSpeed } : null,
    floorSeconds: args.engine === 'fast' ? CONTADOR_FLOOR_FAST_SECONDS : CONTADOR_FLOOR_CLASSIC_SECONDS,
  }
}

export type ContadorVoz =
  /** nenhuma duração do seletor cabe: o servidor recusa sem cobrar */
  | { kind: 'too_short'; words: number; speechSeconds: number; requested: number; minSeconds: number; missingWords: number }
  /** a fala não enche o seletor mas enche uma duração menor: o servidor desce para `to` e cobra `to` */
  | { kind: 'down'; words: number; speechSeconds: number; requested: number; to: number; missingWords: number }
  /** a fala enche o seletor */
  | { kind: 'fits'; words: number; speechSeconds: number; requested: number; narratesLonger: boolean }
  /** a fala enche uma duração MAIOR: o filme segue o roteiro até `to` */
  | { kind: 'up'; words: number; speechSeconds: number; requested: number; to: number }
  /** acima do teto × tolerância: recusa honesta (cortar ou deixar a IA estruturar) */
  | { kind: 'too_long'; words: number; speechSeconds: number; requested: number; maxSeconds: number; excessWords: number }

/** Palavras que a voz vai falar: a narração extraída (sem `speed:`, `Visual:`, rótulos), como o servidor. */
export function narracaoDoContador(script: string): { narration: string; words: number } {
  const narration = parseUserScript(script ?? '').narration || (script ?? '')
  return { narration, words: narration.trim() ? narration.trim().replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean).length : 0 }
}

/** Segundos de fala da narração extraída na régua prevista — a checagem da análise usa isto (mesma medida do contador). */
export function falaNaReguaDaTela(script: string, regua: ReguaDaTela): number {
  const { narration } = narracaoDoContador(script)
  return narration.trim() ? speechSecondsAt(narration, regua.rate) : 0
}

/**
 * O veredito do contador em "Use my script as is": o que o servidor VAI fazer com este texto, nesta voz,
 * com este seletor — antes do clique. Só a aritmética das rotas; nada decidido aqui.
 */
export function contadorVoz(args: { script: string; regua: ReguaDaTela; requestedSeconds: number; supported?: readonly number[]; minWords?: number }): ContadorVoz | null {
  const { narration, words } = narracaoDoContador(args.script)
  if (words < (args.minWords ?? 8)) return null
  const requested = Number(args.requestedSeconds)
  if (!Number.isFinite(requested) || requested <= 0) return null
  const supported = args.supported ?? SUPPORTED_DURATIONS
  const wps = args.regua.rate.wordsPerSecond
  const speechSeconds = speechSecondsAt(narration, args.regua.rate)
  if (!(speechSeconds > 0)) return null
  const largest = largestFittingDuration(speechSeconds, supported)
  const sobe = decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: requested, speechSeconds, largestFitting: largest })
  if (sobe?.kind === 'too_long') {
    const teto = sobe.maxSeconds
    // as palavras que sobram para caber no teto com a folga que o servidor tolera (a mesma constante, via a própria função)
    const cabeNoTeto = (() => { for (let w = words; w > 0; w -= 1) { const s = w / wps; const r = decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: requested, speechSeconds: s, largestFitting: largestFittingDuration(s, supported) }); if (r?.kind !== 'too_long') return w } return 0 })()
    return { kind: 'too_long', words, speechSeconds, requested, maxSeconds: teto, excessWords: Math.max(1, words - cabeNoTeto) }
  }
  const minSeconds = Math.min(...supported)
  if (largest === null) {
    return { kind: 'too_short', words, speechSeconds, requested, minSeconds, missingWords: Math.max(1, Math.ceil((minSeconds * MIN_COVERAGE - speechSeconds) * wps)) }
  }
  if (sobe?.kind === 'up') return { kind: 'up', words, speechSeconds, requested, to: sobe.to }
  const fitOk = speechSeconds >= requested * MIN_COVERAGE
  if (fitOk) return { kind: 'fits', words, speechSeconds, requested, narratesLonger: speechSeconds > requested * 1.05 }
  const desce = decideDurationFollowsScript({ fitOk, ownScript: true, requestedSeconds: requested, speechSeconds, largestFitting: largest, floorSeconds: args.regua.floorSeconds })
  const missingWords = Math.max(1, Math.ceil((requested * MIN_COVERAGE - speechSeconds) * wps))
  if (desce) return { kind: 'down', words, speechSeconds, requested, to: desce.to, missingWords }
  return { kind: 'too_short', words, speechSeconds, requested, minSeconds, missingWords: Math.max(1, Math.ceil((minSeconds * MIN_COVERAGE - speechSeconds) * wps)) }
}

/** A frase da tela, em inglês, uma linha por ramo — derivada só do veredito (nenhum número digitado). */
export function fraseDoContador(v: ContadorVoz, voz: string | null, motor?: ContadorMotor): { text: string; tone: 'ok' | 'info' | 'warn'; lengthWillChange: { from: number; to: number } | null } {
  const s = Math.round(v.speechSeconds)
  const comVoz = voz ? ` with the ${voz} voice` : ' with this voice'
  // Revisão 28/09: (a) "we narrate it all" só onde está provado — clássico e Kineo 1 (o compose deixa o áudio mandar até
  // o teto; KINEO1-VERBATIM-ESTICA). No hollywood, apararComFolga apara cenas para caber na duração: sem prova, sem promessa.
  // (b) acima do teto, só o Kineo 1 RECUSA sem cobrar (generate-video-fast, script_too_long_for_engine); no cinematic
  // (Kling 2.5/Seedance/Veo/hollywood) o servidor não recusa — corta no teto e o final se perde. A frase diz isso.
  const family = motor ? speechFamilyForQuality(motor) : null
  const narraTudoProvado = family !== 'hollywood'
  const recusaNoTeto = motor === 'fast'
  switch (v.kind) {
    case 'fits':
      return { text: `${v.words} words ≈ ${s}s${comVoz} ✓ fills your ${v.requested}s film${v.narratesLonger && narraTudoProvado ? ` — we narrate it all (~${s}s)` : ''}`, tone: 'ok', lengthWillChange: null }
    case 'down':
      return { text: `Your script makes a ~${s}-second film${comVoz} (${v.words} words). Want ${v.requested}s? Add ~${v.missingWords} words — or keep it: the length switches to ${v.to}s and you pay for ${v.to}s.`, tone: 'info', lengthWillChange: { from: v.requested, to: v.to } }
    case 'up':
      // 2ª revisão (29/09): 'full script' só onde é verdade (clássico/Kineo 1); no hollywood a rota apara cenas para caber.
      return { text: `Your script makes a ~${s}-second film${comVoz} (${v.words} words) — longer than ${v.requested}s. The length switches to ${v.to}s${narraTudoProvado ? ' and we narrate it all' : ''}.`, tone: 'info', lengthWillChange: { from: v.requested, to: v.to } }
    case 'too_long':
      return { text: `Your script runs ~${s}s${comVoz} (${v.words} words) — films go up to ${v.maxSeconds}s. Trim ~${v.excessWords} words, or let AI structure it${recusaNoTeto ? " — otherwise we can't generate it (nothing is charged)." : ` — otherwise we cut the film at ${v.maxSeconds}s and the ending is lost.`}`, tone: 'warn', lengthWillChange: null }
    case 'too_short':
      return { text: `Too short for a film — ${v.words} words ≈ ${s}s${comVoz}. Add ~${v.missingWords} words to reach ${v.minSeconds}s, or let AI structure it.`, tone: 'warn', lengthWillChange: null }
  }
}
