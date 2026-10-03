// KINEO-PREVIA-CENAS-2026-10-03 — guardião da "Prévia das cenas" (quem nasceu fora do filme grátis vê o roteiro + 3–4
// imagens das cenas por centavos, em vez da parede 402). Prova, EXECUTANDO lib/scenePreview.ts:
//   (1) quem vê: a MESMA régua de regionPaidOnlyNoticeVisible (lib/freeFilmPolicy.ts), executada lado a lado;
//   (2) o desvio do Gerar: só o despacho do Studio, só sem saldo para o filme, nunca e-mail/checkout/criação automática;
//   (3) travas: 1/dia e 3 no total por conta, 200/dia global, e a recontagem da reserva fecha a corrida de dois cliques;
//   (4) roteiro → 3–4 cenas → prompts sem texto; imagem = o slug e a entrada do schnell do /images;
//   (5) a rota confere tudo ANTES de qualquer fornecedor, na ordem; recusa com motivo legível em pt/en/es;
//   (6) a volta depois de pagar leva ao Studio com o roteiro verbatim, sem gerar sozinha;
//   (7) mutantes.
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
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
const ordem = (src, ...marcas) => { let at = -1; for (const m of marcas) { const i = src.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }

const LIB = read('lib/scenePreview.ts')
const P = load(LIB)
const F = load(read('lib/freeFilmPolicy.ts'))
const ROUTE = read('app/api/scene-preview/route.ts')
const CREATE = read('app/(dashboard)/studio/create/page.tsx')
const IMAGES = read('app/api/images/generate/route.ts')
const BANNER = read('components/RegionPaidOnlyBanner.tsx')
const LAYOUT = read('app/(dashboard)/layout.tsx')
const CLIENT = read('app/(dashboard)/studio/previa/ScenePreviewClient.tsx')

console.log('1 — quem vê')
ok(P.PREVIA_CENAS_PUBLIC === true && /export const PREVIA_CENAS_PUBLIC = true\n/.test(LIB), 'interruptor em código, nasce ligado (ordem do fundador)')
const rows = [
  { trial_status: 'region_paid_only', has_paid: false, plan: 'free' },
  { trial_status: 'region_paid_only', has_paid: null, plan: null },
  { trial_status: 'region_paid_only', has_paid: true, plan: 'free' },
  { trial_status: 'region_paid_only', has_paid: false, plan: 'starter' },
  { trial_status: 'region_paid_only', has_paid: false, plan: 'creator_trial' },
  { trial_status: 'active', has_paid: false, plan: 'free' },
  { trial_status: null, has_paid: false, plan: 'free' },
  null,
]
ok(rows.every((r) => P.previaEligible(r) === F.regionPaidOnlyNoticeVisible(r)), 'previaEligible ≡ regionPaidOnlyNoticeVisible em 8 perfis')
ok(!P.previaEligible(rows[0], false), 'interruptor desligado = ninguém')

console.log('2 — desvio do Gerar')
const elig = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 }
const go = (over = {}, profile = elig, filmCost = 25) => P.shouldRouteGenerateToPreview({ profile, params: { studio: '1', autoanalyze: '1', prompt: 'the lost city under the ice', ...over }, filmCost })
ok(go() === true, 'conta elegível sem saldo, despacho do Studio → prévia')
ok(go({}, { ...elig, video_credits: 25 }) === false, 'com saldo que paga o filme → caminho de sempre')
ok(go({}, { ...elig, video_credits: 10 }, 25) === true, 'saldo menor que o filme → prévia')
ok(go({ studio: null, autoanalyze: null }) === false, 'link de e-mail (sem studio/autoanalyze) não desvia')
ok(go({ create_intent: 'trial_best' }) === false && go({ resume: 'wall_v1' }) === false, 'criação automática e retomada de checkout não desviam')
ok(go({ prompt: 'hi' }) === false, 'sem ideia de verdade não desvia')
ok(go({}, { ...elig, has_paid: true }) === false && go({}, { trial_status: 'active', plan: 'free' }) === false, 'quem pagou ou é da lista nunca desvia')
ok(go({}, elig, 0) === true, 'filme de custo 0 conta como 1 crédito (conta sem saldo desvia)')
const pp = P.previaPath({ prompt: 'x'.repeat(5000), engine: 'seedance', duration: '15', language: 'pt' })
ok(pp.startsWith('/studio/previa?') && new URLSearchParams(pp.split('?')[1]).get('prompt').length === P.PREVIA_IDEA_MAX && /engine=seedance/.test(pp) && /language=pt/.test(pp), 'destino leva a ideia (cortada no teto), motor, duração e língua')
ok(P.previaPath({ prompt: 'a b c', engine: '<x>', duration: '9999', language: 'portuguese' }) === '/studio/previa?prompt=a+b+c&from=generate', 'parâmetros sujos não viajam')

console.log('3 — travas')
ok(P.PREVIA_PER_ACCOUNT_PER_DAY === 1 && P.PREVIA_PER_ACCOUNT_TOTAL === 3 && P.PREVIA_GLOBAL_PER_DAY === 200, '1/dia, 3 no total, 200/dia global')
ok(P.decidePreviaLimits({ accountTotal: 0, accountLastDay: 0, globalLastDay: 0 }) === null, 'primeira passa')
ok(P.decidePreviaLimits({ accountTotal: 1, accountLastDay: 1, globalLastDay: 1 }) === 'daily_limit', '2ª no mesmo dia → daily_limit')
ok(P.decidePreviaLimits({ accountTotal: 3, accountLastDay: 0, globalLastDay: 0 }) === 'total_limit', '4ª na vida → total_limit')
ok(P.decidePreviaLimits({ accountTotal: 0, accountLastDay: 0, globalLastDay: 200 }) === 'global_limit', 'teto global')
// Corrida: duas reservas gravadas juntas na mesma conta.
ok(P.reservationWins({ myId: 'a', accountAllIds: ['a', 'b'], accountDayIds: ['a', 'b'], globalDayIds: ['a', 'b'] }) === null, 'a 1ª reserva vence')
ok(P.reservationWins({ myId: 'b', accountAllIds: ['a', 'b'], accountDayIds: ['a', 'b'], globalDayIds: ['a', 'b'] }) === 'daily_limit', 'a 2ª se vê além do teto e é recusada')
ok(P.reservationWins({ myId: 'z', accountAllIds: ['a'], accountDayIds: ['a'], globalDayIds: ['a'] }) === 'busy', 'reserva que não aparece na recontagem → busy (nunca passa às cegas)')
ok(P.reservationWins({ myId: 9, accountAllIds: [9], accountDayIds: [9], globalDayIds: Array.from({ length: 201 }, (_, i) => (i < 200 ? i + 100 : 9)) }) === 'global_limit', 'teto global também na recontagem')
ok(P.PREVIA_COUNTED_STATUSES.join(',') === 'reserved,shown', "falha do fornecedor ('failed') e recusa ('refused') devolvem a vaga")

console.log('4 — roteiro → cenas → imagens')
const SCRIPT = `HOOK (0-2s): [Pexels: frozen lake aerial] Under this ice lies a city.
MICRO REWARD 1: [Pexels: old map archive] In 1912 a sailor drew it.
MICRO REWARD 2: [Pexels: sonar screen ship] Sonar found walls in 2009.
RHYTHM: [Pexels: ice cracking] Cold. Dark. Silent.
PAYOFF: [Pexels: ancient stone gate underwater] ... It was a harbor older than Rome.`
const sc = P.parsePreviaScenes(SCRIPT)
ok(sc.length === 5 && sc[0].label === 'HOOK' && sc[0].cue === 'frozen lake aerial' && sc[0].text === 'Under this ice lies a city.', 'roteiro estruturado vira cenas (rótulo, cena, fala)')
const picked = P.pickPreviaScenes(sc)
ok(picked.length === 4 && !picked.some((s) => s.label === 'RHYTHM') && picked[0].label === 'HOOK' && picked[3].label === 'PAYOFF', '4 cenas: gancho, recompensas e fecho (RHYTHM fora)')
ok(P.parsePreviaScenes(null).length === 0 && P.parsePreviaScenes('texto solto').length === 0, 'texto sem estrutura = 0 cenas (a rota recusa script_failed)')
const prompt = P.previaImagePrompt(picked[0])
ok(/No text, no letters/.test(prompt) && prompt.includes('frozen lake aerial'), 'prompt da imagem pede zero texto e usa a cena')
const schnell = IMAGES.match(/schnell: \{\s*slug: '([^']+)',[\s\S]*?input: \(prompt, size\) => \(\{ prompt, image_size: size, num_inference_steps: (\d+), enable_safety_checker: (true|false) \}\)/)
const inp = P.previaImageInput('x')
ok(schnell && schnell[1] === P.PREVIA_IMAGE_SLUG && Number(schnell[2]) === inp.num_inference_steps && String(inp.enable_safety_checker) === schnell[3], 'imagem = o MESMO slug e a mesma entrada do schnell do /images')
ok(P.previaCostEstimate({ images: 4, usdPerMegapixel: null, scriptUsd: 0.01 }) === null, 'sem preço conhecido o custo é DESCONHECIDO (null), nunca inventado')

function routeProblems(src) {
  const p = []
  if (!ordem(src,
    "if (!PREVIA_CENAS_PUBLIC) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })\n  const body",
    "if (!previaEligible(profile)) return refuse(user.id, 'not_eligible', language)",
    "if (idea.length < PREVIA_IDEA_MIN) return refuse(user.id, 'idea_too_short', language)",
    'const limit = decidePreviaLimits(',
    "const check = await moderateContent({ surface: 'images', stage: 'input'",
    'const ins = await db.from(\'events\').insert({ name: PREVIA_EVENTS.requested',
    'reservationWins({ myId',
    '/api/generate-script',
    'fal.subscribe(PREVIA_IMAGE_SLUG')) p.push('ordem porta → elegível → ideia → tetos → moderação → reserva → recontagem → roteiro → imagens quebrada')
  if (!/stage: 'output'[\s\S]*persistImage\(/.test(src)) p.push('imagem sem moderação de saída antes de guardar')
  if (!/status: 'failed'/.test(src) || !/status: 'shown'/.test(src)) p.push('reserva sem desfecho')
  if (!/name: PREVIA_EVENTS\.refused/.test(src) || !/name: PREVIA_EVENTS\.shown/.test(src)) p.push('sem os eventos de servidor')
  if (/debitVideoCredits|add_video_credits|creditCost/.test(src)) p.push('a prévia não pode mexer em crédito')
  if (!/export const fetchCache = 'force-no-store'/.test(src)) p.push('sem force-no-store')
  return p
}
console.log('5 — rota')
const rp = routeProblems(ROUTE)
ok(rp.length === 0, 'app/api/scene-preview' + (rp.length ? ': ' + rp.join('; ') : ''))
ok(['en', 'pt', 'es'].every((l) => Object.keys(P.PREVIA_COPY.en.refused).every((k) => typeof P.PREVIA_COPY[l].refused[k] === 'string' && P.PREVIA_COPY[l].refused[k].length > 10)), 'toda recusa tem texto legível em pt/en/es')
ok(['en', 'pt', 'es'].every((l) => /not look exactly|não sai idêntico|no saldrá idéntica/.test(P.PREVIA_COPY[l].honest)), 'a tela diz que o filme não sai idêntico às imagens')
ok(/name: PREVIA_EVENTS\.ctaClicked/.test(read('app/api/scene-preview/cta/route.ts')), 'clique em "Transformar em filme" vira evento de servidor')
ok(Object.values(P.PREVIA_EVENTS).concat('scene_preview_routed').every((n) => read('app/api/events/route.ts').includes(`  '${n}',`)), 'os eventos da prévia não podem ser forjados pelo navegador (SERVER_ONLY_EVENTS)')

function createProblems(src) {
  const p = []
  if (!ordem(src, 'await maybeActivateReverseTrial({', 'shouldRouteGenerateToPreview({', "name: 'generate_arrived_server'")) p.push('o desvio precisa vir DEPOIS da ativação do trial (que grava o trial_status) e antes da tela')
  if (!/redirect\(previaPath\(/.test(src)) p.push('o desvio não leva à prévia')
  if (!/startsWith\('NEXT_REDIRECT'\)\) throw e/.test(src)) p.push('o catch engoliria o redirect')
  return p
}
console.log('6 — desvio, faixa e volta')
const cp = createProblems(CREATE)
ok(cp.length === 0, '/studio/create' + (cp.length ? ': ' + cp.join('; ') : ''))
ok(/href="\/studio\/previa"/.test(BANNER) && /PREVIA_CENAS_PUBLIC \?/.test(BANNER), 'a faixa region_paid_only oferece a prévia (com o interruptor)')
ok(/<ScenePreviewResumeBanner \/>/.test(LAYOUT) && /has_paid === true/.test(LAYOUT), 'a volta pós-pagamento só monta para quem já pode fazer filme')
const href = P.previaResumeStudioHref({ t: 1, idea: 'i', script: 'HOOK: hi', language: 'pt' })
const hq = new URLSearchParams(href.split('?')[1])
ok(href.startsWith('/studio?') && hq.get('script_mode') === 'verbatim' && hq.get('engine') === 'seedance' && hq.get('duration') === '15' && hq.get('language') === 'pt' && !hq.has('autoanalyze') && !hq.has('create_intent'), 'a volta abre o Studio com o roteiro verbatim e NÃO dispara render')
ok(P.previaResumeValid({ t: 1000, idea: 'i', script: 's', language: 'en' }, 2000) && !P.previaResumeValid({ t: 0, idea: 'i', script: 's', language: 'en' }, P.PREVIA_RESUME_MAX_AGE_MS + 1) && !P.previaResumeValid({ t: 1, idea: 'i', script: ' ', language: 'en' }, 2), 'guardado vale 14 dias e precisa de roteiro')
ok(/localStorage\.setItem\(PREVIA_RESUME_STORAGE_KEY/.test(CLIENT) && /\/api\/scene-preview\/cta/.test(CLIENT), 'a tela guarda ideia + roteiro e grava o clique antes de ir aos planos')

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('fornecedor antes da moderação', routeProblems(ROUTE.replace("const check = await moderateContent({ surface: 'images', stage: 'input'", "const check = { ok: true } as const; void ({ surface: 'images', stage: 'input'")))
mut('sem recontagem', routeProblems(ROUTE.replace('reservationWins({ myId', 'null && ({ myId')))
mut('prévia cobrando', routeProblems(ROUTE + '\n// debitVideoCredits('))
mut('desvio antes da ativação', createProblems(CREATE.replace('await maybeActivateReverseTrial({', 'void ({')))
mut('catch engole o redirect', createProblems(CREATE.replace("startsWith('NEXT_REDIRECT')) throw e", "startsWith('X')) throw e")))
const LIB2 = load(LIB.replace("if (p.create_intent || p.resume) return false", ''))
ok(LIB2.shouldRouteGenerateToPreview({ profile: elig, params: { studio: '1', prompt: 'the lost city under the ice', create_intent: 'trial_best' }, filmCost: 25 }) === true, 'mutante pego: sem a exceção da criação automática o desvio a sequestraria')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
