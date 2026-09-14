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
  // 14/09: teto — resposta acima de alvo+1 (o compose recusaria) é descartada; e o que fica fora ganha uma 2ª rodada
  let chamadas = 0
  const openaiLongo = { chat: { completions: { create: async (req) => { chamadas++; const ped = JSON.parse(req.messages[1].content); return { choices: [{ message: { content: JSON.stringify(ped.map((it) => Array(chamadas === 1 ? it.words + 5 : it.words).fill('w').join(' '))) } }] } } } } }
  const E3 = roda(src, { openai: openaiLongo })
  const r3 = await E3.expandVoiceoversToTargets([{ text: 'Short line here.', targetWords: 23 }], 'en', 'x')
  checa('resposta acima de alvo+1 é descartada e a 2ª rodada acerta o alvo', chamadas === 2 && r3[0].split(' ').length === 23)
  checa('janela aceita alvo−2..alvo+1', E.fitsVoiceoverTarget(21, 23) && E.fitsVoiceoverTarget(24, 23) && !E.fitsVoiceoverTarget(20, 23) && !E.fitsVoiceoverTarget(25, 23))
  checa('v4: com teto da cena, aceita até o teto (27 para 12 s) e a rota pede alvo+3', E.fitsVoiceoverTarget(27, 23, 27) && !E.fitsVoiceoverTarget(28, 23, 27) && /targetWords: Math\.min\(Math\.max\(x\.target \+ 3, Math\.ceil\(x\.target \* 1\.2\)\), x\.maxWords\), maxWords: x\.maxWords/.test(rd('app/api/generate-video-cinematic/route.ts')))
  checa('v3: os segundos seguem a fala (round(pal/2,3)+1, teto da família) nas cenas reescritas', /x\.sc\.seconds = Math\.max\(4, Math\.min\(teto, Math\.round\(w \/ 2\.3\) \+ 1\)\)/.test(rd('app/api/generate-video-cinematic/route.ts')))
  checa('linha já no alvo não gasta chamada', await (async () => { let n = 0; const E4 = roda(src, { openai: { chat: { completions: { create: async () => { n++; return { choices: [{ message: { content: '[]' } }] } } } } } }); const r = await E4.expandVoiceoversToTargets([{ text: Array(22).fill('w').join(' '), targetWords: 23 }], 'en', 'x'); return n === 0 && r[0].split(' ').length === 22 })())
}
await run()

console.log('== idioma (14/09): a ideia em PT no H3 saía narrada em inglês ==')
{
  const TL = roda(rd('lib/textLanguage.ts'))
  const pt = 'A história do tsunami de Lituya Bay em 1958: a onda mais alta já registrada, 524 metros, causada por um deslizamento no Alasca. Conte a noite e como um pescador sobreviveu.'
  checa('o detector reconhece a ideia PT do dry-run (antes: pt 9 × es 3 e mesmo assim null)', TL.resolveNarrationLanguage(undefined, pt).language === 'pt')
  checa('a mesma frase em inglês segue en', TL.resolveNarrationLanguage(undefined, 'The story of the 1958 Lituya Bay tsunami: the tallest wave ever recorded, 524 meters, caused by a landslide in Alaska. Tell the night and how a fisherman survived.').language === 'en')
  checa('espanhol claro segue es', TL.resolveNarrationLanguage(undefined, 'La historia del tsunami de Lituya Bay en 1958: la ola más alta jamás registrada, con 524 metros, fue causada por un deslizamiento en Alaska y un pescador sobrevivió.').language === 'es')
  const router = rd('lib/hollywood/router.ts')
  checa('o planejador hollywood escreve a narração na língua da pessoa (não mais "ALL text in English regardless")', /NARRATION LANGUAGE \(STRICT/.test(router) && /every "voiceover" MUST be written in \$\{NARRATION_LANGUAGE_NAME\[language\] \?\? language\}/.test(router) && /Use NO "dialogue" scenes for this film/.test(router))
  checa('em inglês o contrato antigo continua', /: 'ALL text in English regardless of the input language\.'\}/.test(router))
}
console.log('== a rota ==')
const r = rd('app/api/generate-video-cinematic/route.ts')
const iEnche = r.indexOf('if (!verbatim && plan.scenes.length > 0) {')
const iRecusa = r.indexOf('if (verbatimOverflowWords > 0) {')
const iFloor = r.indexOf('plan.scenes = fitCinematicPlanFloor(plan.scenes, duration, SCENE_CAP)')
const iDry = r.indexOf('if (body.dry_run === true && dryRunEmails.has(')
const iSubmit = r.indexOf('await submitToFalWithOneRetry(')
checa('o enchimento roda SÓ no modo IA, antes do piso, do dry-run e de qualquer POST', iEnche > 0 && iEnche < iRecusa && iRecusa < iFloor && iFloor < iDry && iDry < iSubmit)
checa('alvo por cena = segundos × 2,3; cena abaixo de alvo−1, acima do teto da cena, ou enchimento', /target: Math\.round\(\(sc\.seconds \|\| 0\) \* 2\.3\)/.test(r) && /x\.words < x\.target - 1 \|\| x\.words > x\.maxWords \|\| FILLER_LINE_RE\.test\(lineOf\(x\.sc\)\)/.test(r))
checa('diálogo reescrito atualiza a fala citada no prompt', /x\.sc\.dialogueLine = spoken/.test(r) && /x\.sc\.prompt = x\.sc\.prompt\.replace\(\/"\[\^"\]\{6,\}"\/, `"\$\{spoken\}"`\)/.test(r))
checa('v6: apara o respiro no modo IA só enquanto o filme fica ≥ pedido (o piso não reestica)', /while \(\(totalSil > 7\.5 \|\| totalSec > duration \* 1\.05\) && totalSec - 1 >= duration && guard-- > 0\)/.test(r))
checa('fail-open (try/catch) e log com antes → depois', /enche-silencio pulado/.test(r) && /KINEO-ENCHE-SILENCIO: \$\{curtas\.length\} cena\(s\) reescritas/.test(r))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
