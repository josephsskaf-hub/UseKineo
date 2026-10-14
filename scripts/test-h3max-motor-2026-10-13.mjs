// KINEO-H3MAX-2026-10-13 — guardião do motor MiniMax H3 Max (fundador 13/10: "vai H3 Max").
// O H3 Max entra no lugar que era do Omni, AO LADO do MiniMax H3 (que fica igual), pela MESMA estrada hollywood.
// Prova (readFileSync + execução do código real transpilado; nenhum import com alias @/ é resolvido de verdade):
//   (1) preço: 60 créditos por 60 s, escalado pela régua única (15/30/35/60/90 = 15/30/35/60/90); H3 segue 45; a escada
//       Seedance 35 · H3 45 · H3 Max 60 · Kling 2.5 60 · Veo 100 · Kling 3 150 intacta; normalizeQuality conhece o motor;
//   (2) endpoints exatos (minimax/h3-max/text-to-video e /image-to-video), 768P, prompt_expansion_mode 'disabled' — no
//       payload REAL da rota (buildFalInput transpilado) e no da retomada de cena; payload do H3 Max = payload do H3;
//       o H3 continua com minimax/h3/*, 768P e o mesmo payload;
//   (3) interruptor H3MAX_PUBLIC: executado com true e false — visível/escondido para conta de fora, sempre para a casa,
//       contagem pública de motores; a rota recusa ANTES do custo/claim/débito com a MESMA régua (h3maxVisible);
//   (4) dry-run de $0: a família 'h3max' anda na estrada hollywood (hollywoodPath), e a simulação do ensaio — com o
//       modelo por cena da rota, o payload da rota, os tetos de cena da família, a régua de montagem (MIRROR
//       cabeNaMontagem) e a régua de silêncio real (lib/cinematic/timelineContract) — devolve PASS para o canário de 35 s;
//   (5) cobra e estorna como o H3: custo/claim/quality assinada = 'cinematic_h3max'; compose e compose/status cobram,
//       mutam o áudio nativo e não encolhem a cena narrada; clip-status e retomada de cena conhecem os endpoints;
//       FAILFAST/estorno são os da estrada (genéricos);
//   (6) aparece onde o cliente escolhe: /studio, /generate, mega-menu, /models-pricing, /pricing, página do motor,
//       llms.txt, fatos e /api/me/credits — e o Omni continua fora da oferta;
//   (7) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const ROUTER = 'lib/hollywood/router.ts'
const COST = 'lib/credits/engineCost.ts'
const LAUNCH = 'lib/engineLaunch.ts'
const SRC = {
  route: read(ROUTE), router: read(ROUTER), cost: read(COST), launch: read(LAUNCH),
  compose: read('app/api/compose/route.ts'), status: read('app/api/compose/status/[renderId]/route.ts'),
  clipStatus: read('app/api/cinematic-clip-status/route.ts'), retry: read('app/api/retry-hollywood-scene/route.ts'),
  timeline: read('lib/cinematic/timelineContract.ts'), speech: read('lib/speechRate.ts'), duration: read('lib/durationByEngine.ts'),
  studio: read('app/(dashboard)/studio/StudioClient.tsx'), generate: read('app/(dashboard)/generate/GenerateClient.tsx'),
  landing: read('app/KineoLanding.tsx'), models: read('app/models-pricing/page.tsx'), pricing: read('app/pricing/PricingClient.tsx'),
  catalog: read('lib/growth/enginePageCatalog.ts'), intent: read('lib/growth/engineLandingIntent.ts'), llms: read('app/llms.txt/route.ts'),
  facts: read('lib/kineoFacts.ts'), me: read('app/api/me/credits/route.ts'), label: read('lib/engineLabel.ts'), gate: read('lib/enginePlanGate.ts'),
}

let fails = 0
const check = (name, fn) => {
  let ok = false
  try { ok = fn() === true } catch (e) { ok = false; name += ' [' + (e && e.message) + ']' }
  console.log((ok ? 'PASS ' : 'FAIL ') + name)
  if (!ok) fails++
}
const block = (src, start, end) => {
  const i = src.indexOf(start)
  if (i < 0) return ''
  const j = src.indexOf(end, i + start.length)
  return j < 0 ? '' : src.slice(i, j + end.length)
}
/** Transpila um módulo TS e o executa; `stubs` responde aos imports (alias @/ nunca é resolvido de verdade). */
function load(code, stubs = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  const req = (id) => { if (id in stubs) return stubs[id]; throw new Error('import inesperado: ' + id) }
  new Function('module', 'exports', 'require', js)(m, m.exports, req)
  return m.exports
}

// ── (1) preço ──────────────────────────────────────────────────────────────────────────────────────────────────────
function rulesPrice(costSrc) {
  const c = load(costSrc)
  const d = (q, s) => c.creditCostForDuration(q, true, s)
  const ladder = [['cinematic_ai', 35], ['cinematic_h3', 45], ['cinematic_h3max', 60], ['cinematic_kling', 60], ['cinematic_veo', 100], ['cinematic_hollywood', 150]]
  return c.creditCostFor('cinematic_h3max', true) === 60 && c.creditCostFor('cinematic_h3max', false) === 60 &&
    [[15, 15], [30, 30], [35, 35], [60, 60], [90, 90]].every(([s, cr]) => d('cinematic_h3max', s) === cr) &&
    c.creditCostFor('cinematic_h3', true) === 45 && d('cinematic_h3', 35) === 27 && d('cinematic_h3', 90) === 68 &&
    ladder.every(([q, cr]) => c.creditCostFor(q, true) === cr) &&
    c.normalizeQuality('cinematic_h3max') === 'cinematic_h3max' && c.normalizeQuality('cinematic_h3') === 'cinematic_h3'
}

// ── (2) endpoints, 768P, 'disabled' ───────────────────────────────────────────────────────────────────────────────────
const ROUTER_CONSTS = ['HOLLYWOOD_MODELS', 'KLING3_I2V_MODEL', 'H3_MODELS', 'H3_I2V_MODEL', 'H3_RESOLUTION', 'H3MAX_MODELS', 'H3MAX_I2V_MODEL', 'H3MAX_RESOLUTION', 'H3MAX_USD_PER_SECOND', 'H3_USD_PER_SECOND', 'OMNI_I2V_MODEL', 'S25_T2V_MODEL', 'S25_I2V_MODEL']
/** Tira as marcas de fim de linha (código e comentário) para extrair blocos; a regra nunca depende delas. */
const desmarca = (t) => t.replace(/ \/\/ KINEO-H3MAX-2026-10-13[^\n]*/g, '').replace(/ \[KINEO-H3MAX-2026-10-13\]/g, '')
function routerModule(routerSrcMarcado) {
  const routerSrc = desmarca(routerSrcMarcado)
  const parts = ROUTER_CONSTS.map((n) => {
    const line = routerSrc.match(new RegExp(`^export const ${n}(?::[^=]+)? = (.*)$`, 'm'))
    if (!line) throw new Error('constante ausente: ' + n)
    return line[1].trim().endsWith('{') ? block(routerSrc, line[0], '\n}\n') : line[0]
  })
  const fnModel = block(routerSrc, 'export function cinematicSceneModel(', '\n}\n')
  const fnUsd = block(routerSrc, 'export function cinematicUsdPerSecond(', '\n}\n')
  if (!fnModel || !fnUsd) throw new Error('funções do router ausentes')
  return load(`type HollywoodSceneType = 'dialogue' | 'cinematic' | 'support'\ntype CinematicFamily = string\nconst HOLLYWOOD_USD_PER_SECOND: Record<string, number> = { dialogue: 0.168, cinematic: 0.168, support: 0.168 }\nconst S25_USD_PER_SECOND = 0.208\nconst OMNI_USD_PER_SECOND = 0.13\n${parts.join('\n')}\n${fnModel}\n${fnUsd}`)
}
function rulesEndpoints(routerSrc) {
  const r = routerModule(routerSrc)
  const T = 'minimax/h3-max/text-to-video', I = 'minimax/h3-max/image-to-video'
  return ['dialogue', 'cinematic', 'support'].every((t) => r.cinematicSceneModel('h3max', t, false) === T && r.cinematicSceneModel('h3max', t, true) === I &&
      r.cinematicSceneModel('h3', t, false) === 'minimax/h3/text-to-video' && r.cinematicSceneModel('h3', t, true) === 'minimax/h3/image-to-video') &&
    r.H3MAX_RESOLUTION === '768P' && r.H3_RESOLUTION === '768P' && r.H3MAX_USD_PER_SECOND === 0.08 && r.H3_USD_PER_SECOND === 0.06 &&
    r.cinematicUsdPerSecond('h3max', 'support') === 0.08 && r.cinematicUsdPerSecond('h3', 'support') === 0.06 &&
    /^export type CinematicFamily = 'hollywood' \| 'h3' \| 'h3max' \| 'omni' \| 's25'/m.test(routerSrc) &&
    routerSrc.includes("const v = (process.env.KINEO_H3_PROMPT_EXPANSION ?? '').trim().toLowerCase()\n  return v === 'fast' || v === 'balanced' || v === 'quality' ? v : 'disabled'")
}
/** O payload REAL da rota para os motores MiniMax (ramos do H3 e do H3 Max de buildFalInput), transpilado. */
function routePayloads(routeSrc, routerSrc) {
  const h3 = block(routeSrc, '  if (model === H3_I2V_MODEL) {\n', "      // no generate_audio/audio_url input. Verify native dialogue in compose.\n    }\n  }\n")
  const h3max = block(routeSrc, '  if (model === H3MAX_I2V_MODEL) { // KINEO-H3MAX-2026-10-13\n', '  } // KINEO-H3MAX-2026-10-13\n  if (model === KLING3_I2V_MODEL) {')
  if (!h3 || !h3max) throw new Error('ramos MiniMax de buildFalInput não encontrados')
  const r = routerModule(routerSrc)
  const consts = `const H3_I2V_MODEL = ${JSON.stringify(r.H3_I2V_MODEL)}\nconst H3_MODELS = ${JSON.stringify(r.H3_MODELS)}\nconst H3MAX_I2V_MODEL = ${JSON.stringify(r.H3MAX_I2V_MODEL)}\nconst H3MAX_MODELS = ${JSON.stringify(r.H3MAX_MODELS)}\nconst H3_RESOLUTION = '${r.H3_RESOLUTION}'\nconst H3MAX_RESOLUTION = '${r.H3MAX_RESOLUTION}'\nconst H3_PROMPT_EXPANSION = 'disabled'\nconst KLING3_I2V_MODEL = 'kling-i2v'\n`
  const body = h3max.replace(/\n {2}if \(model === KLING3_I2V_MODEL\) \{$/, '\n') + h3
  return load(`${consts}export function build(model: string, prompt: string, seconds: number | undefined, imageUrl: string | undefined, frame: { falAspectRatio: string }): Record<string, unknown> | null {\n${body}  return null\n}`).build
}
function rulesPayload(routeSrc, routerSrc) {
  const build = routePayloads(routeSrc, routerSrc)
  const frame = { falAspectRatio: '9:16' }
  const i2v = build('minimax/h3-max/image-to-video', 'p', 9, 'https://a/x.png', frame)
  const t2v = build('minimax/h3-max/text-to-video', 'p', 9, undefined, frame)
  const h3i = build('minimax/h3/image-to-video', 'p', 9, 'https://a/x.png', frame)
  const h3t = build('minimax/h3/text-to-video', 'p', 9, undefined, frame)
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  return same(i2v, { image_url: 'https://a/x.png', prompt: 'p', duration: 9, resolution: '768P', prompt_expansion_mode: 'disabled' }) &&
    same(t2v, { prompt: 'p', duration: 9, resolution: '768P', aspect_ratio: '9:16', prompt_expansion_mode: 'disabled' }) &&
    same(i2v, h3i) && same(t2v, h3t) &&
    // duração: inteiro 5..15 (o schema aceita decimal; a cena assinada é inteira e a sobra do modelo sai na montagem)
    build('minimax/h3-max/image-to-video', 'p', 3, 'u', frame).duration === 5 && build('minimax/h3-max/image-to-video', 'p', 22, 'u', frame).duration === 15 &&
    build('minimax/h3-max/text-to-video', 'p', 7.6, undefined, frame).duration === 8 &&
    !('generate_audio' in i2v) && !('end_image_url' in i2v)
}
function rulesRetry(retrySrc) {
  return retrySrc.includes("const H3MAX_SET = new Set<string>([...Object.values(H3MAX_MODELS), H3MAX_I2V_MODEL])") &&
    retrySrc.includes('...H3_SET, ...H3MAX_SET /* KINEO-H3MAX-2026-10-13 */, OMNI_I2V_MODEL') &&
    retrySrc.includes('[KLING3_I2V_MODEL, H3_I2V_MODEL, H3MAX_I2V_MODEL, OMNI_I2V_MODEL, S25_I2V_MODEL].includes(slot.model)') &&
    retrySrc.includes('if (H3MAX_SET.has(model)) return { ...(scene.anchor ? { image_url: scene.anchor } : { aspect_ratio: scene.aspect }), // KINEO-H3MAX-2026-10-13\n    prompt, duration: Math.max(5, Math.min(15, scene.seconds)), resolution: H3MAX_RESOLUTION, prompt_expansion_mode: H3_PROMPT_EXPANSION }')
}
function rulesPoller(clipSrc) {
  const allowed = block(clipSrc, 'const ALLOWED_MODELS = new Set([', '])')
  return clipSrc.includes("const H3MAX_T2V_MODEL = 'minimax/h3-max/text-to-video'") && clipSrc.includes("const H3MAX_I2V_MODEL = 'minimax/h3-max/image-to-video'") &&
    /\n {2}H3MAX_T2V_MODEL,/.test(allowed) && /\n {2}H3MAX_I2V_MODEL,/.test(allowed) && /\n {2}H3_T2V_MODEL,/.test(allowed) && /\n {2}H3_I2V_MODEL,/.test(allowed)
}

// ── (3) interruptor ───────────────────────────────────────────────────────────────────────────────────────────────────
const CASA = 'josephsskaf@gmail.com'
function launchModule(launchSrc) {
  return load(launchSrc, { '@/lib/internalAccounts': { isInternalEmail: (e) => typeof e === 'string' && e.toLowerCase() === CASA } })
}
function rulesFlag(launchSrc, routeSrc, meSrc) {
  // KINEO-LEVA-1310 — a régua vale nos dois estados do interruptor (publicado desligado para o canário da casa).
  const flagRe = /export const H3MAX_PUBLIC = (true|false) \/\/ KINEO-H3MAX-2026-10-13[^\r\n]*/
  if (!flagRe.test(launchSrc)) return false
  const onSrc = launchSrc.replace(flagRe, 'export const H3MAX_PUBLIC = true // KINEO-H3MAX-2026-10-13')
  const offSrc = launchSrc.replace(flagRe, 'export const H3MAX_PUBLIC = false // KINEO-H3MAX-2026-10-13')
  const on = launchModule(onSrc)
  const off = launchModule(offSrc)
  const gate = "    if (wantsH3Max && !h3maxVisible(user.email)) { // KINEO-H3MAX-2026-10-13\n"
  const iGate = routeSrc.indexOf(gate)
  const iCost = routeSrc.indexOf('    const cost = creditCostForDuration(costQuality, true, duration)')
  const iClaim = routeSrc.indexOf('    const claimQuality = wantsS25\n')
  const iPath = routeSrc.indexOf('    const hollywoodPath = wantsHollywood || wantsH3 || wantsH3Max || wantsOmni || wantsS25')
  const refusal = block(routeSrc, gate, '    } // KINEO-H3MAX-2026-10-13\n')
  return on.H3MAX_PUBLIC === true && on.h3maxVisible('x@y.com') === true && on.h3maxVisible(null) === true && on.h3maxVisible(CASA) === true &&
    off.H3MAX_PUBLIC === false && off.h3maxVisible('x@y.com') === false && off.h3maxVisible(null) === false && off.h3maxVisible(CASA) === true &&
    on.VIDEO_ENGINE_LIST_COPY.includes('MiniMax H3, MiniMax H3 Max, Seedance 1.5') && !off.VIDEO_ENGINE_LIST_COPY.includes('H3 Max') &&
    on.VIDEO_ENGINE_COUNT_WORD === 'Seven' && off.VIDEO_ENGINE_COUNT_WORD === 'Six' &&
    on.engineOffered('omni') === false && on.enginePaused('omni') !== null && on.enginePaused('h3max') === null &&
    // a rota lê a MESMA régua e recusa antes do custo, do claim e do débito, sem cobrar
    routeSrc.includes("import { h3maxVisible } from '@/lib/engineLaunch' // KINEO-H3MAX-2026-10-13\n") &&
    iGate > 0 && iCost > iGate && iClaim > iGate && iPath > iGate &&
    refusal.includes("reason: 'h3max_not_public', engine: 'h3max', alternative: { key: 'h3', label: 'MiniMax H3' }, retryable: false, charged: false, refunded: false }, { status: 400 })") &&
    // a tela recebe a mesma régua
    meSrc.includes('h3max: h3maxVisible(user.email)')
}

// ── (4) dry-run de $0 ─────────────────────────────────────────────────────────────────────────────────────────────────
// O canário de 35 s (o mesmo roteiro do relatório), já cortado pelo planejador em 4 cenas de segundos inteiros.
const CANARIO = [
  'In December 1900, a supply ship reached a lighthouse on a lonely Scottish island, and nobody waved from the rocks.',
  'Three keepers, James Ducat, Thomas Marshall and Donald MacArthur, were simply gone. The great lamp was cleaned and ready.',
  'The gate was shut. Two oilskin coats were missing, and the third still hung on its hook by the door.',
  'The last log entry was dated the fifteenth. No bodies were ever found. One man went out without his coat. Why?',
]
function dryRun(routeSrc, routerSrc, timelineSrc, plan, target) {
  // família, como a rota decide (wantsH3Max) — e a estrada hollywood (o ensaio de $0 mora dentro dela)
  const famLine = routeSrc.match(/^ {4}const family: CinematicFamily = (.*?) \/\/ KINEO-H3MAX-2026-10-13$/m)
  const capLines = routeSrc.match(/^ {4}const SCENE_CAP = (.*)\n {4}const DIALOGUE_CAP = (.*)$/m)
  const mirror = block(routeSrc, '          // ═══ MIRROR: cabeNaMontagem ═══\n', '          // ═══ END MIRROR: cabeNaMontagem ═══\n')
  if (!famLine || !capLines || !mirror) throw new Error('trecho do dry-run não encontrado')
  const env = load(`const wantsH3 = false, wantsH3Max = true, wantsOmni = false, wantsS25 = false\nexport const family = ${famLine[1]}\nexport const SCENE_CAP = ${capLines[1]}\nexport const DIALOGUE_CAP = ${capLines[2]}\n${mirror}\nexport { cabeNaMontagem }`)
  const r = routerModule(routerSrc)
  const build = routePayloads(routeSrc, routerSrc)
  const tl = load(timelineSrc)
  const ritmo = 2.3 // régua hollywood (lib/speechRate SPEECH_RATE_BASE.hollywood), voz a 1,0
  const words = (t) => t.trim().split(/\s+/).filter(Boolean).length
  const report = plan.map((sc, i) => ({ scene: i + 1, type: sc.type, seconds: sc.seconds, words: words(sc.voiceover) }))
  const problems = []
  for (const x of report) {
    const fala = x.words / ritmo
    if (x.words > 0 && x.seconds > 0 && !env.cabeNaMontagem(fala, x.seconds)) problems.push(`cena ${x.scene}: fala não cabe`)
    if (x.seconds > (x.type === 'dialogue' ? env.DIALOGUE_CAP : env.SCENE_CAP)) problems.push(`cena ${x.scene}: teto`)
    const model = r.cinematicSceneModel(env.family, x.type, true)
    const input = build(model, 'preflight', x.seconds, 'https://preflight.local/anchor.png', { falAspectRatio: '9:16' })
    if (!input || (model.includes('image-to-video') && !input.image_url)) problems.push(`cena ${x.scene}: payload`)
  }
  const total = report.reduce((a, x) => a + x.seconds, 0)
  const mute = report.reduce((a, x) => a + (x.words > 0 ? 0 : x.seconds), 0)
  const rep = tl.planSilenceReport(plan, ritmo)
  const totalMax = Math.round(tl.SILENCE_TOTAL_MAX_SECONDS * Math.max(1, total / 60) * 10) / 10
  const silenceOk = rep.worst <= tl.SILENCE_SCENE_MAX_SECONDS && rep.total <= totalMax
  const pass = mute <= 6 && total >= target && problems.length === 0 && silenceOk
  return { family: env.family, models: report.map((x) => r.cinematicSceneModel(env.family, x.type, true)), total, mute, silence: rep.total, words: report.reduce((a, x) => a + x.words, 0), problems, verdict: pass ? 'PASS' : 'FAIL' }
}
const PLANO_35 = CANARIO.map((v, i) => ({ type: 'support', seconds: [9, 8, 9, 9][i], voiceover: v }))
function rulesDryRun(routeSrc, routerSrc, timelineSrc) {
  const r = dryRun(routeSrc, routerSrc, timelineSrc, PLANO_35, 35)
  console.log(`     ensaio de $0 (35 s, ${r.words} palavras): família ${r.family} · ${r.total}s · mudo ${r.mute}s · silêncio ${r.silence}s · ${r.models[0]} · ${r.verdict}`)
  const ruim = dryRun(routeSrc, routerSrc, timelineSrc, PLANO_35.map((s, i) => (i === 0 ? { ...s, seconds: 16 } : s)), 35)
  // o dry-run devolve o plano ANTES do primeiro POST de cena; o bloco do ensaio não tem desvio por família (só o extra do S25)
  const ensaio = block(routeSrc, "        const dryRunEmails = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])\n", "          await releaseBirthClaim('dry_run_no_charge')\n")
  const iEnsaio = routeSrc.indexOf("          await releaseBirthClaim('dry_run_no_charge')\n")
  const iPost = routeSrc.indexOf('              () => submitToFal(scenePrompt, sceneModel, false, true, hs.seconds, sceneAnchor, undefined, plan.stylized),')
  const pathOk = routeSrc.includes('    const hollywoodPath = wantsHollywood || wantsH3 || wantsH3Max || wantsOmni || wantsS25')
  return pathOk && r.family === 'h3max' && r.verdict === 'PASS' && r.models.every((m) => m === 'minimax/h3-max/image-to-video') &&
    ruim.verdict === 'FAIL' && !!ensaio && !/family === 'h3/.test(ensaio) && iEnsaio > 0 && iPost > iEnsaio
}

// ── (5) cobra e estorna como o H3 ─────────────────────────────────────────────────────────────────────────────────────
function rulesBilling(routeSrc, composeSrc, statusSrc, speechSrc, durationSrc, gateSrc, labelSrc) {
  const tern = (name) => block(routeSrc, `    const ${name} = wantsS25\n`, "          : 'cinematic_ai'\n")
  const claimEngine = block(routeSrc, '    const claimEngine = wantsS25\n', "          : 'seedance'\n")
  return tern('claimQuality').includes("      : wantsH3Max // KINEO-H3MAX-2026-10-13\n      ? 'cinematic_h3max' // KINEO-H3MAX-2026-10-13\n") &&
    block(routeSrc, '    const costQuality: Quality = wantsS25\n', "            : 'cinematic_ai'\n").includes("      : wantsH3Max // KINEO-H3MAX-2026-10-13\n      ? 'cinematic_h3max' // KINEO-H3MAX-2026-10-13\n") &&
    claimEngine.includes("      : wantsH3Max // KINEO-H3MAX-2026-10-13\n      ? 'h3max' // KINEO-H3MAX-2026-10-13\n") &&
    routeSrc.includes("const H3MAX_CREDIT_COST = creditCostFor('cinematic_h3max') // KINEO-H3MAX-2026-10-13") &&
    routeSrc.includes('        quality: claimQuality,\n') && // a resposta assinada carrega a quality do claim (lição do H3, 19/08)
    routeSrc.includes("const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')") &&
    // compose: normaliza, cobra, narra por cena, muta o áudio do modelo e não encolhe a cena narrada (regra do H3)
    composeSrc.includes("q === 'cinematic_h3' || q === 'cinematic_h3max' ||") &&
    composeSrc.includes("'cinematic_sora', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_omni', 'cinematic_s25', // KINEO-H3MAX-2026-10-13") &&
    composeSrc.includes("quality === 'cinematic_hollywood' || quality === 'cinematic_h3' || quality === 'cinematic_h3max' || quality === 'cinematic_omni' || quality === 'cinematic_s25' || quality === 'avatar' ||") &&
    composeSrc.includes("if (quality === 'cinematic_hollywood' || quality === 'cinematic_h3' || quality === 'cinematic_h3max' || quality === 'cinematic_omni' || quality === 'cinematic_s25') {") &&
    composeSrc.includes("if (c && c.engine === 'support' && quality !== 'cinematic_h3' && quality !== 'cinematic_h3max') {") &&
    composeSrc.includes("muteClipAudio: quality === 'cinematic_h3' || quality === 'cinematic_h3max' /* KINEO-H3MAX-2026-10-13 */ ||") &&
    composeSrc.includes("['cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_omni', 'cinematic_s25'].includes(trustedQuality)") &&
    statusSrc.includes("quality === 'cinematic_hollywood' || quality === 'cinematic_h3' || quality === 'cinematic_h3max' ||") &&
    // régua de voz hollywood (2,3 pal/s), estrada hollywood nas durações, nome público e o portão de plano
    speechSrc.includes("/^(cinematic_)?(hollywood|h3|h3max|omni|s25)$/") &&
    durationSrc.includes("['hollywood', 'h3', 'h3max', 'omni', 's25', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_omni', 'cinematic_s25'].includes(k)") &&
    durationSrc.includes("const outros = ['kling', 'veo', 'sora', 'hollywood', 'h3', 'h3max',") && // senão 'h3max' cairia no Seedance 15 s
    gateSrc.includes("'kling', 'veo', 'hollywood', 'h3', 'h3max', 'omni', 's25',") && gateSrc.includes("  'cinematic_h3max', // KINEO-H3MAX-2026-10-13") &&
    labelSrc.includes("  cinematic_h3max: 'MiniMax H3 Max', // KINEO-H3MAX-2026-10-13")
}

// ── (6) onde o cliente vê ─────────────────────────────────────────────────────────────────────────────────────────────
function rulesSurfaces(s) {
  return s.studio.includes("{ key: 'h3max', paused: Boolean(enginePaused('h3max')), icon: 'H3+', name: 'MiniMax H3 Max', tag: 'New',") &&
    s.studio.includes("credits: `${creditCostFor('cinematic_h3max', true)} cr`") && s.studio.includes("  h3max: 'cinematic_h3max', // KINEO-H3MAX-2026-10-13") &&
    s.studio.includes("(e.key !== 'h3max' || h3maxOk) /* KINEO-H3MAX-2026-10-13 */") && s.studio.includes('useState<boolean>(H3MAX_PUBLIC)') &&
    s.generate.includes("...(h3maxOk ? [{ key: 'h3max' as const, label: 'MiniMax H3 Max', sub: 'MiniMax · newest · sharper film', cr: creditCostForDuration('cinematic_h3max', true, duration) }] : [])") &&
    s.generate.includes("data.quality === 'cinematic_h3max' ? 'cinematic_h3max'") &&
    s.landing.includes("{h3maxVisible(initialEmail) && !enginePaused('h3max') && <NavEngineItem href=\"/studio?engine=h3max&intent_campaign=nav_mega\" name=\"MiniMax H3 Max\"") &&
    s.models.includes("...(H3MAX_PUBLIC ? [{ key: 'h3max', name: 'MiniMax H3 Max', quality: 'cinematic_h3max' as Quality,") &&
    // reancorado KINEO-PRECOS-LIMPEZA-1510 — a linha do H3 Max vivia na tabela "Compare plans", que o fundador tirou do /pricing (15/10).
    !s.pricing.includes('MiniMax H3 Max — cinematic') && !s.pricing.includes('What you get at each tier') &&
    s.intent.includes("  h3max: '/ai-video-generator/minimax-h3-max', // KINEO-H3MAX-2026-10-13") &&
    desmarca(s.catalog).includes("        'minimax-h3-max': {\n          param: 'h3max' as EngineLandingParam,\n          qualityMode: 'cinematic_h3max',") &&
    s.catalog.includes("  return !enginePaused(param) && (param !== 's25' || S25_PUBLIC) && (param !== 'h3max' || H3MAX_PUBLIC) // KINEO-H3MAX-2026-10-13") &&
    s.llms.includes("${H3MAX_PUBLIC ? `- 2026-10-13: MiniMax H3 Max is live on Kineo") &&
    s.facts.includes("credits: creditsPerReferenceVideo('cinematic_h3max'), // KINEO-H3MAX-2026-10-13") &&
    // o Omni continua fora da oferta: nenhuma superfície de venda volta a citá-lo
    !/key: 'omni'/.test(s.studio) && !/engine=omni/.test(s.landing) && !/\{ key: 'omni', label/.test(s.generate) && !/key: 'omni', name/.test(s.models)
}

check('1 preço: 60 cr a 60 s pela régua única (15/30/35/60/90 = 15/30/35/60/90), H3 intacto em 45, escada certa', () => rulesPrice(SRC.cost))
check('2a endpoints exatos minimax/h3-max/{text,image}-to-video, 768P, família h3max; H3 intacto', () => rulesEndpoints(SRC.router))
check('2b payload REAL da rota: 768P, disabled, duração inteira 5–15, i2v com image_url, igual ao do H3', () => rulesPayload(SRC.route, SRC.router))
check('2c retomada de cena conhece o H3 Max, com âncora e prompt literal', () => rulesRetry(SRC.retry))
check('2d poller assinado (cinematic-clip-status) aceita os dois endpoints do H3 Max', () => rulesPoller(SRC.clipStatus))
check('3 interruptor H3MAX_PUBLIC executado (true/false): conta de fora, casa, contagem; rota recusa antes do custo/claim', () => rulesFlag(SRC.launch, SRC.route, SRC.me))
check('4 dry-run de $0: família h3max na estrada hollywood, canário de 35 s = PASS, plano ruim = FAIL, ensaio antes do POST', () => rulesDryRun(SRC.route, SRC.router, SRC.timeline))
check('5 cobra e estorna como o H3 (custo, claim, compose, status, régua de voz, durações, portão, selo)', () => rulesBilling(SRC.route, SRC.compose, SRC.status, SRC.speech, SRC.duration, SRC.gate, SRC.label))
check('6 aparece no /studio, /generate, mega-menu, /models-pricing, /pricing, página do motor, llms.txt, fatos — e o Omni segue fora', () => rulesSurfaces(SRC))

// Mutantes: cada um tem de aplicar (o texto muda) e deixar a regra vermelha.
const mut = (name, key, from, to, rule) => {
  const m = SRC[key].split(from).join(to)
  check(`M ${name}`, () => m !== SRC[key] && rule(m) === false)
}
mut('H3 Max a 55 cr', 'cost', "      return 60 // KINEO-H3MAX-2026-10-13\n", "      return 55 // KINEO-H3MAX-2026-10-13\n", rulesPrice)
mut('H3 mexido para 50', 'cost', '      return 45\n', '      return 50\n', rulesPrice)
mut('normalizeQuality esquece o H3 Max', 'cost', "    case 'cinematic_h3max': // KINEO-H3MAX-2026-10-13\n", '', rulesPrice)
mut('endpoint t2v errado', 'router', "  support: 'minimax/h3-max/text-to-video',", "  support: 'minimax/h3max/text-to-video',", rulesEndpoints)
mut('família h3max cai no H3', 'router', "  if (family === 'h3max') return hasAnchor ? H3MAX_I2V_MODEL : H3MAX_MODELS[type] // KINEO-H3MAX-2026-10-13\n", '', rulesEndpoints)
mut('1080P no payload', 'route', '      resolution: H3MAX_RESOLUTION, // KINEO-H3MAX-2026-10-13\n      prompt_expansion_mode: H3_PROMPT_EXPANSION, // KINEO-H3MAX-2026-10-13 — mesmo', "      resolution: '1080P', // KINEO-H3MAX-2026-10-13\n      prompt_expansion_mode: H3_PROMPT_EXPANSION, // KINEO-H3MAX-2026-10-13 — mesmo", (r) => rulesPayload(r, SRC.router))
mut('reescrita ligada no t2v', 'route', "      prompt_expansion_mode: H3_PROMPT_EXPANSION, // KINEO-H3MAX-2026-10-13\n    } // KINEO-H3MAX-2026-10-13\n", "      prompt_expansion_mode: 'balanced', // KINEO-H3MAX-2026-10-13\n    } // KINEO-H3MAX-2026-10-13\n", (r) => rulesPayload(r, SRC.router))
mut('i2v sem image_url', 'route', '      image_url: imageUrl, // KINEO-H3MAX-2026-10-13\n', '', (r) => rulesPayload(r, SRC.router))
mut('retomada sem o H3 Max', 'retry', '...H3_SET, ...H3MAX_SET /* KINEO-H3MAX-2026-10-13 */, OMNI_I2V_MODEL', '...H3_SET, OMNI_I2V_MODEL', rulesRetry)
mut('poller sem o i2v do H3 Max', 'clipStatus', '  H3MAX_I2V_MODEL, // KINEO-H3MAX-2026-10-13\n', '', rulesPoller)
mut('interruptor sem a casa', 'launch', '  return H3MAX_PUBLIC || isInternalEmail(email) // KINEO-H3MAX-2026-10-13\n', '  return H3MAX_PUBLIC // KINEO-H3MAX-2026-10-13\n', (l) => rulesFlag(l, SRC.route, SRC.me))
mut('portão da rota removido', 'route', "    if (wantsH3Max && !h3maxVisible(user.email)) { // KINEO-H3MAX-2026-10-13\n", "    if (false) { // KINEO-H3MAX-2026-10-13\n", (r) => rulesFlag(SRC.launch, r, SRC.me))
mut('recusa do portão cobrando', 'route', "reason: 'h3max_not_public', engine: 'h3max', alternative: { key: 'h3', label: 'MiniMax H3' }, retryable: false, charged: false,", "reason: 'h3max_not_public', engine: 'h3max', alternative: { key: 'h3', label: 'MiniMax H3' }, retryable: false,", (r) => rulesFlag(SRC.launch, r, SRC.me))
mut('H3 Max fora da estrada hollywood', 'route', 'wantsHollywood || wantsH3 || wantsH3Max || wantsOmni || wantsS25 // KINEO-H3MAX-2026-10-13: o H3 Max anda', 'wantsHollywood || wantsH3 || wantsOmni || wantsS25 // KINEO-H3MAX-2026-10-13: o H3 Max anda', (r) => rulesDryRun(r, SRC.router, SRC.timeline))
mut('família h3max vira omni (o modelo da cena deixa de ser o H3 Max)', 'route', "wantsH3Max ? 'h3max' : wantsOmni ? 'omni' : wantsS25 ? 's25' : 'hollywood' // KINEO-H3MAX-2026-10-13", "wantsH3Max ? 'omni' : wantsOmni ? 'omni' : wantsS25 ? 's25' : 'hollywood' // KINEO-H3MAX-2026-10-13", (r) => rulesDryRun(r, SRC.router, SRC.timeline))
mut('claim assina como H3', 'route', "      : wantsH3Max // KINEO-H3MAX-2026-10-13\n      ? 'cinematic_h3max' // KINEO-H3MAX-2026-10-13\n      : wantsOmni\n      ? 'cinematic_omni'", "      : wantsH3Max // KINEO-H3MAX-2026-10-13\n      ? 'cinematic_h3' // KINEO-H3MAX-2026-10-13\n      : wantsOmni\n      ? 'cinematic_omni'", (r) => rulesBilling(r, SRC.compose, SRC.status, SRC.speech, SRC.duration, SRC.gate, SRC.label))
mut('compose deixa de mutar o áudio do H3 Max', 'compose', "muteClipAudio: quality === 'cinematic_h3' || quality === 'cinematic_h3max' /* KINEO-H3MAX-2026-10-13 */ ||", "muteClipAudio: quality === 'cinematic_h3' ||", (c) => rulesBilling(SRC.route, c, SRC.status, SRC.speech, SRC.duration, SRC.gate, SRC.label))
mut('compose encolhe a cena narrada do H3 Max', 'compose', "if (c && c.engine === 'support' && quality !== 'cinematic_h3' && quality !== 'cinematic_h3max') {", "if (c && c.engine === 'support' && quality !== 'cinematic_h3') {", (c) => rulesBilling(SRC.route, c, SRC.status, SRC.speech, SRC.duration, SRC.gate, SRC.label))
mut('H3 Max na régua clássica (3,1 pal/s)', 'speech', '(hollywood|h3|h3max|omni|s25)', '(hollywood|h3|omni|s25)', (sp) => rulesBilling(SRC.route, SRC.compose, SRC.status, sp, SRC.duration, SRC.gate, SRC.label))
mut('card do /studio sumiu', 'studio', "{ key: 'h3max', paused:", "{ key: 'h3maxx', paused:", (st) => rulesSurfaces({ ...SRC, studio: st }))
mut('Omni volta ao seletor do /studio', 'studio', "  // KINEO-H3MAX-2026-10-13 — o MiniMax H3 Max entra no lugar que era do Omni", "  { key: 'omni', name: 'Omni Flash' },\n  // KINEO-H3MAX-2026-10-13 — o MiniMax H3 Max entra no lugar que era do Omni", (st) => rulesSurfaces({ ...SRC, studio: st }))

console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS PASS')
process.exit(fails ? 1 : 0)
