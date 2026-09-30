// KINEO-COBERTURA-15S-2026-09-30 — desfaz, EM MEMÓRIA, a única mudança da régua de 15 s (minCoverageFor) em
// lib/narrationFit.ts e lib/speechRate.ts, para os guardiões "byte a byte igual à base" de 29/09 continuarem provando
// o que provavam (nada MAIS mudou nesses arquivos). Se a mudança for editada, as âncoras daqui param de casar e o
// guardião fica vermelho — de propósito. Guardião da mudança: scripts/test-cobertura-15s-2026-09-30.mjs.
const BLOCO_15S_INICIO = '\n/**\n * [TRAVA 8.2 — vai do fundador 30/09 "Vai tenta puxar ele pra gente"] KINEO-COBERTURA-15S-2026-09-30.'
const BLOCO_15S_FIM = '  return Number.isFinite(targetSeconds) && targetSeconds > 0 && targetSeconds <= SHORT_FILM_MAX_SECONDS ? SHORT_FILM_MIN_COVERAGE : MIN_COVERAGE\n}\n'

const TROCAS = {
  'lib/narrationFit.ts': [
    ['  const ok = coverage >= minCoverageFor(target)\n  const missingWords = ok ? 0 : Math.ceil((target * minCoverageFor(target) - speech) * WORDS_PER_SECOND)',
     '  const ok = coverage >= MIN_COVERAGE\n  const missingWords = ok ? 0 : Math.ceil((target * MIN_COVERAGE - speech) * WORDS_PER_SECOND)'],
    ['  // KINEO-COBERTURA-15S-2026-09-30 — cada duração com a SUA régua (15 s aceita 75 %).\n  const cabem = supportedDurations\n    .filter((d) => Number.isFinite(d) && d > 0 && fit.speech >= d * minCoverageFor(d) - 1e-9)',
     '  const teto = fit.speech / MIN_COVERAGE\n  const cabem = supportedDurations\n    .filter((d) => Number.isFinite(d) && d > 0 && d <= teto + 1e-9)'],
  ],
  'lib/speechRate.ts': [
    ['narrationFit, autofitDown, WORDS_PER_SECOND, MIN_COVERAGE, MIN_AUTOFIT_DOWN_COVERAGE, minCoverageFor,', 'narrationFit, autofitDown, WORDS_PER_SECOND, MIN_COVERAGE, MIN_AUTOFIT_DOWN_COVERAGE,'],
    ['  const ok = coverage >= minCoverageFor(target) // KINEO-COBERTURA-15S-2026-09-30\n  return { speech, target, silence: target - speech, coverage, ok, missingWords: ok ? 0 : Math.ceil((target * minCoverageFor(target) - speech) * rate.wordsPerSecond) }',
     '  const ok = coverage >= MIN_COVERAGE\n  return { speech, target, silence: target - speech, coverage, ok, missingWords: ok ? 0 : Math.ceil((target * MIN_COVERAGE - speech) * rate.wordsPerSecond) }'],
  ],
}

export function desfazCobertura15s(p, s) {
  if (s == null || !TROCAS[p]) return s
  let t = s
  if (p === 'lib/narrationFit.ts') {
    const i = t.indexOf(BLOCO_15S_INICIO)
    const j = t.indexOf(BLOCO_15S_FIM)
    if (i < 0 || j < 0) return s
    t = t.slice(0, i) + t.slice(j + BLOCO_15S_FIM.length)
  }
  for (const [novo, velho] of TROCAS[p]) {
    if (!t.includes(novo)) return s
    t = t.split(novo).join(velho)
  }
  return t
}

/** Para CARREGAR código (não comparar bytes): mantém minCoverageFor, mas com a régua de 95 % da época também no 15 s. */
export function reguaDe95No15s(p, s) {
  if (p !== 'lib/narrationFit.ts' || s == null) return s
  const a = 'export const SHORT_FILM_MIN_COVERAGE = 0.75'
  return s.includes(a) ? s.split(a).join('export const SHORT_FILM_MIN_COVERAGE = 0.95') : s
}
