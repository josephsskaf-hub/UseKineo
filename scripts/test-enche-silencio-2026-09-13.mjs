// KINEO-ENCHE-SILENCIO-2026-09-13 — guardião: modo IA nos motores caros não
// nasce mudo. Análise de $0 (13/09 23:30): Kling 3, H3 e Omni com "ideia →
// IA escreve" saíam com 113-116 palavras para 60-64 s (16 por cena de 10 s) e
// reprovavam na régua de silêncio; o Omni abria com enchimento genérico.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }

console.log('== lib executada com openai falso ==')
const rw = rd('lib/runway.ts')
const iF = rw.indexOf('export const FILLER_LINE_RE')
const src = "const LANGUAGE_NAMES = { en: 'English', pt: 'Brazilian Portuguese (pt-BR)', es: 'Spanish (es-419, Latin American)' }\n" + rw.slice(iF)
let pedido = null
const openai = { chat: { completions: { create: async (req) => { pedido = JSON.parse(req.messages[1].content); return { choices: [{ message: { content: JSON.stringify(pedido.map((it) => Array(it.words).fill('fact').join(' '))) } }] } } } } }
const E = roda(src, { openai })
const run = async () => {
  const out = await E.expandVoiceoversToTargets([{ text: 'A wave hit Lituya Bay.', targetWords: 23 }, { text: 'Here is something most people do not know about the wave in Alaska.', targetWords: 23 }], 'en', 'The wave in Alaska')
  checa('cada linha volta com o alvo de palavras dos seus segundos', out[0].split(' ').length === 23 && out[1].split(' ').length === 23)
  checa('o pedido leva palavras-alvo por linha', pedido && pedido[0].words === 23 && pedido[0].line === 'A wave hit Lituya Bay.')
  checa('enchimento genérico é reconhecido (FILLER_LINE_RE)', E.FILLER_LINE_RE.test('Here is something most people do not know about X') && !E.FILLER_LINE_RE.test('On July 9, 1958, Lituya Bay saw a wave.'))
  const openaiCurto = { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(['too short']) } }] }) } } }
  const E2 = roda(src, { openai: openaiCurto })
  const r2 = await E2.expandVoiceoversToTargets([{ text: 'A wave hit Lituya Bay hard that night.', targetWords: 23 }], 'en', 'x')
  checa('resposta curta demais não substitui o original (fail-open)', r2[0] === 'A wave hit Lituya Bay hard that night.')
}
await run()

console.log('== a rota ==')
const r = rd('app/api/generate-video-cinematic/route.ts')
const iEnche = r.indexOf('if (!verbatim && plan.scenes.length > 0) {')
const iRecusa = r.indexOf('if (verbatimOverflowWords > 0) {')
const iFloor = r.indexOf('plan.scenes = fitCinematicPlanFloor(plan.scenes, duration, SCENE_CAP)')
const iDry = r.indexOf('if (body.dry_run === true && dryRunEmails.has(')
const iSubmit = r.indexOf('await submitToFalWithOneRetry(')
checa('o enchimento roda SÓ no modo IA, antes do piso, do dry-run e de qualquer POST', iEnche > 0 && iEnche < iRecusa && iRecusa < iFloor && iFloor < iDry && iDry < iSubmit)
checa('alvo por cena = segundos × 2,3; cena curta = mais de ~1,3 s de silêncio ou enchimento', /target: Math\.round\(\(sc\.seconds \|\| 0\) \* 2\.3\)/.test(r) && /x\.words < x\.target - 3 \|\| FILLER_LINE_RE\.test\(lineOf\(x\.sc\)\)/.test(r))
checa('diálogo reescrito atualiza a fala citada no prompt', /x\.sc\.dialogueLine = spoken/.test(r) && /x\.sc\.prompt = x\.sc\.prompt\.replace\(\/"\[\^"\]\{6,\}"\/, `"\$\{spoken\}"`\)/.test(r))
checa('fail-open (try/catch) e log com antes → depois', /enche-silencio pulado/.test(r) && /KINEO-ENCHE-SILENCIO: \$\{curtas\.length\} cena\(s\) reescritas/.test(r))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
