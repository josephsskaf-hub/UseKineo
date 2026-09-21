// KINEO1 DIAGNÓSTICO 18/09 — guardião dos 3 consertos autorizados pelo fundador ("vai pro 1, 2 e 3, sobe o
// Kling 3 junto"). docs/KINEO1-DIAGNOSTICO-2026-09-18.md.
//   1. ROTEIRO-DA-COTA: o filme grátis de 15 s nasce com roteiro de 15 s (13/13 cortavam a narração no meio).
//   2. STILL-NITIDO: flux/dev a 28 passos (era 4, receita do schnell) — Kineo 1 E âncoras do Kling 3; prompt sem névoa.
//   3. BUSCA-DA-FALA: regra no planejador; guarda do gancho em TODA cena; a mesma query não abre duas cenas.
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
function loadWith(file, requireMap, env = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Promise, setTimeout, clearTimeout }, { filename: file })
  return exports
}

console.log('== 1. roteiro da cota ==')
const gs = rd('app/api/generate-script/route.ts')
checa('15 entra nos alvos suportados (só o servidor o impõe)', gs.includes('const SUPPORTED_TARGETS = [15, 35, 60, 90] as const'))
checa('a cota é lida pelo predicado do cobrador (getEffectiveEntitlement + TRIAL_ENTITLEMENT_COLUMNS), só para engine fast, falha aberta', gs.includes("import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'") && gs.includes("if (typeof body.engine === 'string' && body.engine.toLowerCase() === 'fast') {") && gs.includes('const ent = getEffectiveEntitlement(prof as Parameters<typeof getEffectiveEntitlement>[0], { isPaidAccount: !isFreePlan || hasPaid })') && gs.includes('if (ent.maxDurationSeconds !== null && ent.maxDurationSeconds < alvoSegundos) {\n            cotaSegundos = ent.maxDurationSeconds\n            alvoSegundos = ent.maxDurationSeconds') && gs.includes("console.warn('[generate-script] cota de duração não lida (falha aberta):'"))
checa('WRITER_PAID_PLANS espelha PAID_PLANS do compose (mesma lista)', (() => { const cp = rd('app/api/compose/route.ts'); const m = cp.match(/const PAID_PLANS = new Set\(\[([\s\S]*?)\]\)/); const w = gs.match(/const WRITER_PAID_PLANS = new Set\(\[([\s\S]*?)\]\)/); if (!m || !w) return false; const norm = (x) => x.replace(/[\s']/g, '').split(',').filter(Boolean).sort().join(','); return norm(m[1]) === norm(w[1]) })())
checa('formato curto no prompt (≤ 20 s: HOOK, MR1, MR2, PAYOFF) e o guardrail de seções não regenera por falta de ESCALATION/RHYTHM', gs.includes('SHORT FILM (${targetSeconds} seconds): use ONLY these sections, in this order: HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF') && gs.includes("let missing = alvoSegundos <= 20 ? missingElements(script).filter((m) => m === 'HOOK' || m === 'PAYOFF') : missingElements(script)"))
checa('rastro: script_written leva quota_seconds e requested_seconds', gs.includes('quota_seconds: cotaSegundos, requested_seconds: Number.isFinite(pedido) ? pedido : null,'))
// A régua: 15 s na persona mais rápida cabe em ~42-50 palavras (o filme grátis é cortado em 15 s pelo compose).
const nf = loadWith('lib/narrationFit.ts', {})
const sr = loadWith('lib/speechRate.ts', { '@/lib/narrationFit': nf, './narrationFit': nf })
const personas = loadWith('lib/narration/personas.ts', {})
const W = loadWith('lib/scriptWriterRate.ts', { '@/lib/narrationFit': nf, '@/lib/speechRate': sr, '@/lib/narration/niche-mapping': { selectPersonaForScript: () => null }, '@/lib/narration/personas': personas })
const r15 = W.writerRateFor('fast', 'x', 'en')
checa(`15 s → piso ${W.minWordsFor(15, r15.wordsPerSecond, 1)} / teto ${W.maxWordsFor(15, r15.wordsPerSecond, 1)} palavras (cabe em 15-18 s de fala; hoje nasciam 135)`, W.minWordsFor(15, r15.wordsPerSecond, 1) <= 45 && W.maxWordsFor(15, r15.wordsPerSecond, 1) <= 55)

console.log('== 2. still nítido (Kineo 1 + âncoras do Kling 3) ==')
const an = rd('lib/hollywood/anchors.ts')
checa('flux/dev com 28 passos por padrão (env KINEO_FLUX_DEV_STEPS 4-50 para ensaio) — o mesmo que /images usa no dev', an.includes("const ANCHOR_IMAGE_MODEL = 'fal-ai/flux/dev'") && an.includes('num_inference_steps: ANCHOR_IMAGE_STEPS') && !/^\s*num_inference_steps: 4,/m.test(an) && an.includes('return Number.isFinite(raw) && raw >= 4 && raw <= 50 ? raw : 28') && rd('app/api/images/generate/route.ts').includes("slug: 'fal-ai/flux/dev',\n    cost: 2,\n    input: (prompt, size) => ({ prompt, image_size: size, num_inference_steps: 28"))
const fs_ = rd('lib/fastAiScene.ts')
checa('prompt do still do Kineo 1 pede foco nítido e sem "muted"; janela 12 s', fs_.includes('`Photorealistic cinematic still, documentary photography, natural light, sharp focus on the subject, crisp detail, natural contrast: ${base}.') && !/^\s*`Photorealistic cinematic still[^\n]*shallow depth of field/m.test(fs_) && fs_.includes(": 'documentary realism, natural color grade, sharp 35mm film look',") /* KINEO1-FILME-DESENHADO-2026-09-21: agora é o ramo fotorreal de um ternário (desenho usa o sufixo do look) */ && fs_.includes('export const FAST_AI_STILL_WINDOW_MS = 12_000'))

console.log('== 3. busca nasce da fala ==')
const be = rd('lib/broll/broll-engine.ts')
checa('planejador: primeira palavra da query = o substantivo da fala; ≤ 4 palavras; sem estilo; sem repetir', be.includes('QUERY FROM THE SPOKEN LINE (KINEO1-BUSCA-DA-FALA-2026-09-18') && be.includes('the FIRST word of the first query is the concrete NOUN the spoken line names') && be.includes('Every scene gets a DIFFERENT first query'))
const ft = rd('app/api/generate-video-fast/route.ts')
checa('guarda do gancho vale para TODA cena (não só idx === 0), logs com o número da cena', ft.includes('        if (pixQueries.length > 0) {\n          const HOOK_STOP = new Set(') && !ft.includes('if (idx === 0 && pixQueries.length > 0) {') && ft.includes('`[hook-guard] scene=${sceneNo} dropped'))
checa('query já usada vai para o fim da lista; a que valeu é registrada por cena', ft.includes('const usedQueriesNoFilme = new Set<string>()') && ft.includes('const ineditas = pixQueries.filter((q) => !usedQueriesNoFilme.has(q.trim().toLowerCase()))') && ft.includes("if (pixQueries[0]) usedQueriesNoFilme.add(pixQueries[0].trim().toLowerCase())"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
