// KINEO-COBERTURA-15S-2026-09-30 — guardião da régua de narração no filme de 15 s (piso do seletor clássico).
// Caso real: cadastro novo do ChatGPT (30/09), Seedance 15 s, roteiro próprio com ~12 s de fala → 3 recusas seguidas
// ("faltam 6 palavras") pela régua de 95 %. Fundador: "Vai tenta puxar ele pra gente".
// Prova: (1) até 15 s a régua é 75 %; acima, 95 % intacto; (2) o caso real passa; (3) 35/60/90 s continuam iguais;
// (4) a régua por duração chega ao guard do servidor, ao contador da tela e à escolha da maior duração que cabe;
// (5) mutantes. Estilo readFileSync + transpile (roda sem alias `@/`).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado em narrationFit: ' + p) })
  return mod.exports
}
const src = read('lib/narrationFit.ts')
const nf = load(src)
const words = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ')

function problems(m) {
  const probs = []
  if (m.minCoverageFor(15) !== 0.75) probs.push('15 s não aceita 75 %')
  if (m.minCoverageFor(5) !== 0.75) probs.push('< 15 s fora da régua curta')
  for (const d of [16, 30, 35, 60, 90]) if (m.minCoverageFor(d) !== m.MIN_COVERAGE) probs.push(`${d} s mudou de régua`)
  if (m.MIN_COVERAGE !== 0.95) probs.push('MIN_COVERAGE deixou de ser 95 %')
  // Caso real: ~12 s de fala num filme de 15 s passa; ~10 s (67 %) continua barrado.
  const wps = m.WORDS_PER_SECOND
  const aaron = m.narrationFit(words(Math.round(12 * wps)), 15)
  if (!aaron.ok || aaron.missingWords !== 0) probs.push(`12 s de fala em 15 s ainda barra (cobertura ${aaron.coverage.toFixed(2)})`)
  const curto = m.narrationFit(words(Math.round(10 * wps)), 15)
  if (curto.ok) probs.push('10 s de fala em 15 s passou (buraco de 5 s)')
  // Filme longo: a mesma fala relativa que passa em 15 s continua barrada em 35 s.
  const longo = m.narrationFit(words(Math.round(35 * 0.8 * wps)), 35)
  if (longo.ok) probs.push('80 % em 35 s passou — a régua de 95 % dos filmes longos afrouxou')
  // A sugestão de duração usa a régua de CADA duração.
  const msg = m.narrationTooShortMessage(m.narrationFit(words(Math.round(12 * wps)), 35), [15, 35, 60, 90])
  if (!/15/.test(msg)) probs.push('mensagem de recusa não sugere 15 s para 12 s de fala')
  return probs
}

const p = problems(nf)
ok(p.length === 0, `(1-3) régua por duração: 15 s = 75 %, resto = 95 %; caso real passa; longos intactos (${p.join('; ') || 'ok'})`)

// (4) a régua chega a quem decide
const speechRate = read('lib/speechRate.ts')
ok(/const ok = coverage >= minCoverageFor\(target\)/.test(speechRate), '(4a) narrationFitAt (guard do servidor, régua por voz) usa minCoverageFor')
const expand = read('lib/expandPolicy.ts')
ok(/currentSpeech >= d \* minCoverageFor\(d\)/.test(expand) && /return targetSeconds \* minCoverageFor\(targetSeconds\)/.test(expand), '(4b) largestFittingDuration e minimumSpeech usam a régua de cada duração')
const contador = read('lib/contadorVoz.ts')
ok(!/MIN_COVERAGE/.test(contador) && /requested \* minCoverageFor\(requested\)/.test(contador), '(4c) contador de voz da tela usa a mesma régua')
const route = read('app/api/generate-video-cinematic/route.ts')
ok(/narrationFitAt\(parsedScript\.narration, duration, narrationRate\)/.test(route), '(4d) o guard do cinematic mede com narrationFitAt')
const gen = read('app/(dashboard)/generate/GenerateClient.tsx')
ok(!/duration \* MIN_COVERAGE/.test(gen), '(4e) o /generate não mede mais com 95 % fixo')

// (5) mutantes
ok(problems(load(src.replace('export const SHORT_FILM_MIN_COVERAGE = 0.75', 'export const SHORT_FILM_MIN_COVERAGE = 0.95'))).length > 0, '(M1) volta a 95 % no 15 s → vermelho')
ok(problems(load(src.replace('export const SHORT_FILM_MAX_SECONDS = 15', 'export const SHORT_FILM_MAX_SECONDS = 35'))).length > 0, '(M2) régua curta vaza para 35 s → vermelho')
ok(problems(load(src.replace('  const ok = coverage >= minCoverageFor(target)', '  const ok = coverage >= MIN_COVERAGE'))).length > 0, '(M3) narrationFit ignora a régua por duração → vermelho')
ok(problems(load(src.replace('export const SHORT_FILM_MIN_COVERAGE = 0.75', 'export const SHORT_FILM_MIN_COVERAGE = 0.6'))).length > 0, '(M4) régua curta frouxa demais (60 %) → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
