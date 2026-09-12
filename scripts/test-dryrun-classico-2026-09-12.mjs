// KINEO-DRYRUN-CLASSICO-2026-09-12 — guardião do validador de $0 nos clássicos.
//
// Ordem do fundador (12/09): "pente fino em todos os motores, dry-run pra ver
// se tudo vai dar certo". Até 11/09 só a família Kling 3/H3/Omni tinha dry-run;
// Seedance/Kling 2.5/Veo e Kineo 1 seguiam para o POST pago com o flag ligado.
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp }); return exp }

console.log('== a lib, executada ==')
const L = roda(rd('lib/cinematic/classicDryRun.ts'))
const cena = (n) => ({ voiceover: Array(n).fill('word').join(' '), prompt: 'p' })
// 60 s clássico: 3,1 × 60 = 186 palavras; ±15% = 158..214
const bom = L.classicDryRunReport({ scenes: [cena(31), cena(31), cena(31), cena(31), cena(31), cena(31)], targetSeconds: 60, secondsPerClip: 10, verbatim: false })
checa('186 palavras/60 s: PASS, drift 0, sem risco de reescrita', bom.pass && bom.rescale_risk === false && bom.expected_words === 186 && bom.total_words === 186 && /^PASS/.test(bom.verdict))
checa('fala por cena = palavras/3,1 (31 → 10 s)', bom.scenes[0].speech_seconds === 10 && bom.scenes.length === 6 && bom.footage_seconds === 60)
// o caso do vigia (c636e7a0): "as is" com 143 palavras para 60 s → 143/186 = −23% → o compose reescreve
const asIs = L.classicDryRunReport({ scenes: [cena(48), cena(48), cena(47)], targetSeconds: 60, secondsPerClip: 10, verbatim: true })
checa('143 palavras "as is" para 60 s: FAIL com risco de reescrita e aviso de verbatim', !asIs.pass && asIs.rescale_risk === true && /REESCREVE/.test(asIs.verdict) && /Use my script as is/.test(asIs.verdict))
checa('e a narração curta é nomeada (46 s < piso 57 s)', asIs.problems.some((p) => /narração de 46.*alvo de 60.*piso 57/.test(p)))
// o caso do Kineo 1 antes do conserto de 19:30: 114 palavras para 90 s
const k1 = L.classicDryRunReport({ scenes: Array(9).fill(cena(13)).map((s) => ({ ...s })), targetSeconds: 90, secondsPerClip: 10, verbatim: false })
checa('117 palavras/90 s (defeito do Kineo 1): FAIL, drift −58%', !k1.pass && Math.round(k1.rescale_drift * 100) === -58 && k1.total_words === 117)
// excesso também é reescrita
const longo = L.classicDryRunReport({ scenes: [cena(120), cena(120)], targetSeconds: 60, secondsPerClip: 10, verbatim: false })
checa('240 palavras/60 s: risco de reescrita por excesso e footage curto (20 s < 77 s)', longo.rescale_risk && longo.problems.some((p) => /footage de 20s/.test(p)))
checa('cena muda é nomeada', L.classicDryRunReport({ scenes: [cena(31), { voiceover: '', prompt: 'x' }], targetSeconds: 10, secondsPerClip: 10, verbatim: false }).problems.some((p) => /sem fala: 2/.test(p)))
checa('zero cenas = FAIL', L.classicDryRunReport({ scenes: [], targetSeconds: 60, secondsPerClip: 10, verbatim: false }).pass === false)
checa('só contas do fundador', L.isDryRunAccount('JosephsSkaf@gmail.com') && !L.isDryRunAccount('cliente@gmail.com') && !L.isDryRunAccount(null))

console.log('== a rota cinematic (clássicos) ==')
const cin = rd('app/api/generate-video-cinematic/route.ts')
const iHook = cin.indexOf("if (body.dry_run === true && isDryRunAccount(user.email)) {")
const iAnchor = cin.indexOf('const anchorActive = wantsKling && CINEMATIC_ANCHOR_ENABLED')
const iSubmit = cin.indexOf('const submitScene = async (')
const iPrompts = cin.indexOf('const classicScenePrompts = scenes.map(')
checa('gancho existe, depois dos prompts corrigidos pelo contrato e ANTES das stills pagas e dos POSTs de cena', iHook > 0 && iPrompts > 0 && iPrompts < iHook && iHook < iAnchor && iAnchor < iSubmit)
checa('gancho clássico estorna pelo releaseBirthClaim antes de responder', /const refunded = await releaseBirthClaim\('dry_run_no_charge'\)\n\s+return NextResponse\.json\(\{\n\s+dry_run: true,\n\s+family: 'classic'/.test(cin))
checa('relatório usa a lib pura com a duração pedida e o clipe do motor (Veo 8 s, resto 10 s)', /classicDryRunReport\(\{\n\s+scenes: scenes\.map\(\(s, i\) => \(\{ voiceover: s\.voiceover, prompt: classicScenePrompts\[i\] \}\)\),\n\s+targetSeconds: duration,\n\s+secondsPerClip: \(wantsVeo \|\| wantsSora\) \? 8 : 10,\n\s+verbatim,/.test(cin))
checa('resposta nomeia motor, modo visual e contrato de cena', /engine: wantsKling \? 'kling' : wantsVeo \? 'veo' : wantsSora \? 'sora' : 'seedance'/.test(cin) && /visual_mode: classicVisualMode,\n\s+visual_mode_reason: formatoVisual\.motivo,\n\s+contrato_cena: contratoRelatoClassico,/.test(cin))
checa('o bloco hollywood continua com o seu dry-run (dois pontos de saída, um por família)', (cin.match(/releaseBirthClaim\('dry_run_no_charge'\)/g) || []).length === 2)
checa('o gancho está fora do bloco hollywood (depois do seu fecho)', cin.indexOf('// ── end KINEO-HOLLYWOOD-2026-07-09') < iHook)

console.log('== a rota fast (Kineo 1) ==')
const fast = rd('app/api/generate-video-fast/route.ts')
const fHook = fast.indexOf("if (body.dry_run === true && isDryRunAccount(user.email)) {")
const fAiHook = fast.indexOf('let aiHookHandle: AiHookHandle | null = null')
const fScenes = fast.indexOf('scenes = await generateScenes(prompt.slice(0, 1200), clipCount')
checa('dry_run entra no contrato do body', /dry_run\?: boolean\n\s+\}\n\s+try \{\n\s+body = await req\.json\(\)/.test(fast))
checa('gancho depois das cenas planejadas e ANTES do hook pago da IA', fHook > 0 && fScenes > 0 && fScenes < fHook && fHook < fAiHook)
checa('relatório do Kineo 1 usa a mesma lib, com segundos por clipe = duração/cenas, e devolve a faixa de palavras', /secondsPerClip: duration \/ Math\.max\(1, clipCount\),/.test(fast) && /words_per_scene: verbatim \? null : wordsPerSceneFor\(duration, clipCount\)/.test(fast) && /family: 'fast', engine: 'fast'/.test(fast))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
