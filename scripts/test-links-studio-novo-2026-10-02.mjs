// KINEO-LINKS-STUDIO-NOVO-2026-10-02 — guardião da migração dos construtores de link da tela antiga (/studio/create)
// para o Studio novo (/studio), no precedente do link /go (36fc267, lib/gptHandoff.ts STUDIO_PATH).
//
// O que ele prova, e como (readFileSync + typescript.transpileModule dos módulos puros, sem alias em runtime):
//   (1) cada construtor migrado devolve /studio?… com EXATAMENTE os mesmos parâmetros de antes (chaves e valores
//       congelados aqui), com as duas exceções documentadas: o remix ganha intent_campaign (a única etiqueta que o
//       Studio carrega até o Generate) e o 45 legado do toolActivationHref vira 35 (a tela antiga já fazia isso);
//   (2) os parâmetros de criação que eles mandam são LIDOS pelo Studio novo (StudioClient, só leitura: sp.get(...));
//   (3) os que ficam na tela antiga ficam: resume=wall_v1 (pós-checkout) e o redirect autenticado com create_intent;
//   (4) a prova "Your script is waiting" do /signup aceita /studio e /studio/create, e só eles;
//   (5) o /studio dispara a conversão de cadastro + origem para ?signup=1 sem mexer na query do Studio;
//   (M) mutantes: cada regra é quebrada numa cópia do fonte e o verificador TEM de reprovar.
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

/** Executa um módulo TS puro. `stubs` responde aos imports (alias @/ ou relativo) que o módulo tiver. */
function load(src, stubs = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = (p) => {
    if (p in stubs) return stubs[p]
    throw new Error('import inesperado: ' + p)
  }
  new Function('module', 'exports', 'require', 'URLSearchParams', 'URL', js)(mod, mod.exports, req, URLSearchParams, URL)
  return mod.exports
}
const tryLoad = (src, stubs) => { try { return load(src, stubs) } catch { return null } }

const SRC = {
  tool: read('lib/toolActivationHref.ts'),
  product: read('lib/growth/productToVideo.ts'),
  comment: read('lib/growth/commentToVideo.ts'),
  business: read('lib/growth/businessContentPlan.ts'),
  freeScript: read('lib/growth/freeScriptSignupHandoff.ts'),
  remix: read('lib/growth/exampleRemix.ts'),
  pricing: read('lib/growth/pricingJourneyProof.ts'),
  preview: read('lib/growth/signupCreationPreview.ts'),
  creation: read('lib/creationHandoff.ts'),
  authRedirect: read('lib/authRedirect.ts'),
  wall: read('lib/growth/wallV1.ts'),
  studioClient: read('app/(dashboard)/studio/StudioClient.tsx'),
  studioPage: read('app/(dashboard)/studio/page.tsx'),
  tracker: read('components/SignupConversionTracker.tsx'),
}
const ENGINE_LABEL_STUB = { '@/lib/engineLabel': { engineLabelFor: () => 'Engine' } }

const inner = (href) => {
  const outer = new URL(href, 'https://kineo.local')
  const r = outer.searchParams.get('redirect')
  return r ? new URL(r, 'https://kineo.local') : null
}
const queryOf = (u) => Object.fromEntries([...u.searchParams.entries()])
/** Problemas de um destino contra o contrato congelado: caminho /studio e o mesmo conjunto chave→valor. */
function destinationProblems(label, u, expected) {
  if (!u) return [`${label}: sem destino`]
  const p = []
  if (u.pathname !== '/studio') p.push(`${label}: caminho ${u.pathname} (esperado /studio)`)
  const got = queryOf(u)
  const keysGot = Object.keys(got).sort().join(',')
  const keysExp = Object.keys(expected).sort().join(',')
  if (keysGot !== keysExp) p.push(`${label}: parâmetros [${keysGot}] ≠ [${keysExp}]`)
  for (const [k, v] of Object.entries(expected)) {
    if (v !== undefined && got[k] !== v) p.push(`${label}: ${k}=${JSON.stringify(got[k])} (esperado ${JSON.stringify(v)})`)
  }
  return p
}

// ─── (1) cada construtor → /studio com os parâmetros de antes ────────────────
function builderProblems(src) {
  const p = []
  const tool = tryLoad(src.tool)
  if (!tool) return ['toolActivationHref não carrega']
  p.push(...destinationProblems('tool', inner(tool.toolActivationHref({ prompt: 'HOOK: a\nPAYOFF: b', campaign: 'c1', intentCampaign: 'ic_1', scriptMode: 'verbatim', duration: 60 })),
    { prompt: 'HOOK: a\nPAYOFF: b', autoanalyze: '1', script_mode: 'verbatim', duration: '60', intent_campaign: 'ic_1' }))
  p.push(...destinationProblems('tool (45 legado)', inner(tool.toolActivationHref({ prompt: 'x', campaign: 'c1', duration: 45 })),
    { prompt: 'x', autoanalyze: '1', duration: '35' }))
  p.push(...destinationProblems('tool (simples)', inner(tool.toolActivationHref({ prompt: 'one\nidea', campaign: 'c1' })),
    { prompt: 'one idea', autoanalyze: '1' }))
  if (!tool.toolActivationHref({ campaign: 'c1' }).startsWith('/signup?') || inner(tool.toolActivationHref({ campaign: 'c1' }))) p.push('tool sem prompt deixou de ser a porta simples')

  const product = tryLoad(src.product)
  if (!product) return [...p, 'productToVideo não carrega']
  p.push(...destinationProblems('product', inner(product.buildProductToVideoActivationHref([{ label: 'HOOK', text: 'h' }, { label: 'CTA', text: 'c' }])),
    { prompt: 'HOOK: h\nPAYOFF: c', script_mode: 'verbatim', duration: '35', autoanalyze: '1', intent_campaign: 'product_to_short' }))

  const comment = tryLoad(src.comment)
  if (!comment) return [...p, 'commentToVideo não carrega']
  p.push(...destinationProblems('comment', inner(comment.buildCommentToVideoActivationHref([{ label: 'HOOK', text: 'h' }, { label: 'PAYOFF', text: 'p' }])),
    { prompt: 'HOOK: h\nPAYOFF: p', autoanalyze: '1', intent_campaign: 'comment_to_short' }))

  const business = tryLoad(src.business)
  if (!business) return [...p, 'businessContentPlan não carrega']
  const bDest = inner(business.buildBusinessPlanActivationHref({ offer: 'Dental cleaning', audience: 'parents', goal: 'leads', firstItem: { angle: 'a', hook: 'h', evidence: 'e' } }))
  p.push(...destinationProblems('business', bDest, { prompt: undefined, duration: '35', autoanalyze: '1', intent_campaign: 'weekly_business_video_plan' }))
  if (bDest && !bDest.searchParams.get('prompt')?.includes('Business offer: Dental cleaning')) p.push('business: prompt perdeu a oferta')

  const free = tryLoad(src.freeScript)
  if (!free) return [...p, 'freeScriptSignupHandoff não carrega']
  p.push(...destinationProblems('free script', inner(free.buildFreeScriptSignupHref([{ label: 'HOOK', text: 'h' }, { label: 'FACT 1', text: 'f' }], { source: 's', medium: 'm', campaign: 'c' })),
    { prompt: 'HOOK: h\nMICRO REWARD 1: f', autoanalyze: '1', handoff_kind: 'free_script' }))

  const remix = tryLoad(src.remix)
  if (!remix) return [...p, 'exampleRemix não carrega']
  const rTopic = new URL(remix.exampleRemixHref({ slug: 'slug-a', referencePrompt: 'Create a Short about X, with a hook.', topic: 'ice caves' }), 'https://kineo.local')
  p.push(...destinationProblems('remix', rTopic, {
    prompt: 'Create a Short about ice caves, with a hook.', create_intent: 'example_remix', script_mode: 'ai',
    utm_source: 'example_watch', utm_medium: 'proof', utm_campaign: 'example_remix_v1', utm_content: 'slug-a',
    intent_campaign: 'example_remix_v1', // exceção documentada: a campanha atravessa o Generate do Studio
  }))
  const rExact = new URL(remix.exampleRemixHref({ slug: 'slug-a', referencePrompt: 'P', topic: '', mode: 'exact' }), 'https://kineo.local')
  if (rExact.searchParams.get('remix_mode') !== 'exact_prompt' || rExact.pathname !== '/studio') p.push('remix exato perdeu remix_mode ou o caminho')

  const pricing = tryLoad(src.pricing, ENGINE_LABEL_STUB)
  if (!pricing) return [...p, 'pricingJourneyProof não carrega']
  const d = pricing.decidePricingJourneyProof({ completedCount: 0, hasActivePlan: false, historyReliable: true, recentVideos: [], reverseTrial: true, savedCheckoutAvailable: false, signedIn: true })
  p.push(...destinationProblems('pricingJourneyProof', d.creationHref ? new URL(d.creationHref, 'https://kineo.local') : null,
    { engine: 'seedance', duration: '35', intent_campaign: 'pricing_journey_proof_v1' }))
  return p
}
const bp = builderProblems(SRC)
ok(bp.length === 0, `(1) os 7 construtores migrados devolvem /studio?… com os mesmos parâmetros (${bp.join('; ') || 'ok'})`)

// ─── (2) o Studio novo lê os parâmetros de criação que eles mandam ───────────
const studioReads = new Set([...SRC.studioClient.matchAll(/sp\.get\('([a-z_]+)'\)/g)].map((m) => m[1]))
const CREATION_KEYS = ['prompt', 'engine', 'duration', 'script_mode', 'intent_campaign']
const unread = CREATION_KEYS.filter((k) => !studioReads.has(k))
ok(unread.length === 0, `(2) o StudioClient lê ${CREATION_KEYS.join('/')} da URL (${unread.join(', ') || 'ok'})`)
ok(!studioReads.has('resume') && !studioReads.has('create_intent'),
  '(2b) o Studio novo NÃO lê resume nem create_intent (por isso parede e redirect autenticado ficam na tela antiga — se isto ficar vermelho, é hora de migrá-los)')

// ─── (3) o que fica na tela antiga, fica ─────────────────────────────────────
const wall = tryLoad(SRC.wall, ENGINE_LABEL_STUB)
ok(wall?.WALL_V1_RESUME_PATH === '/studio/create?resume=wall_v1', '(3) volta pós-checkout segue em /studio/create?resume=wall_v1 (só a tela antiga retoma o rascunho da parede)')
ok(wall?.checkoutSuccessResumeHref().startsWith('/studio/create?resume=wall_v1&'), '(3b) "Back to your script" do /checkout/success segue na tela antiga')
const creation = tryLoad(SRC.creation)
const authRedirectMod = tryLoad(SRC.authRedirect)
ok(creation?.buildAuthenticatedCreationRedirect({ prompt: 'x', campaign: 'c', createIntent: 'fast' })?.startsWith('/studio/create?welcome=1&'),
  '(3c) redirect autenticado com create_intent segue em /studio/create (contrato de criação automática só lido lá)')

// ─── (4) prova do /signup aceita /studio e /studio/create, e só eles ─────────
function previewProblems(previewSrc) {
  const proof = tryLoad(previewSrc, { '@/lib/creationHandoff': creation, '@/lib/authRedirect': authRedirectMod })
  if (!proof) return ['signupCreationPreview não carrega']
  const p = []
  const remix = load(SRC.remix)
  const free = load(SRC.freeScript)
  const remixRedirect = remix.exampleRemixHref({ slug: 's', referencePrompt: 'Create a Short about X, with a hook.', topic: 'ice caves' })
  const freeRedirect = inner(free.buildFreeScriptSignupHref([{ label: 'HOOK', text: 'h' }, { label: 'FACT 1', text: 'f' }], { source: 's', medium: 'm', campaign: 'c' }))
  const freeStr = `${freeRedirect.pathname}${freeRedirect.search}`
  if (!proof.buildExampleRemixSignupPreview(remixRedirect)) p.push('remix novo (/studio) perdeu a prova')
  if (!proof.buildExampleRemixSignupPreview(remixRedirect.replace(/^\/studio\?/, '/studio/create?'))) p.push('remix em circulação (/studio/create) perdeu a prova')
  if (proof.buildFreeScriptSignupPreview(freeStr)?.kind !== 'script') p.push('roteiro grátis novo (/studio) perdeu a prova')
  if (proof.buildFreeScriptSignupPreview(freeStr.replace(/^\/studio\?/, '/studio/create?'))?.kind !== 'script') p.push('roteiro grátis em circulação perdeu a prova')
  for (const bad of ['/studio-evil?', '/studio/create-evil?', '/pricing?', '/studio/x?']) {
    if (proof.buildExampleRemixSignupPreview(remixRedirect.replace(/^\/studio\?/, bad))) p.push(`remix aceitou ${bad}`)
    if (proof.buildFreeScriptSignupPreview(freeStr.replace(/^\/studio\?/, bad))) p.push(`roteiro aceitou ${bad}`)
  }
  if (proof.buildExampleRemixSignupPreview('/studio?prompt=private')) p.push('/studio genérico virou prova')
  return p
}
const pp = previewProblems(SRC.preview)
ok(pp.length === 0, `(4) prova do /signup: /studio e /studio/create sim, qualquer outro caminho não (${pp.join('; ') || 'ok'})`)

// ─── (5) /studio dispara conversão de cadastro + origem sem tocar na query ───
function signupProblems(page, tracker) {
  const p = []
  const code = page.replace(/\/\/.*$/gm, '')
  if (!/import SignupConversionTracker from '@\/components\/SignupConversionTracker'/.test(code)) p.push('página do Studio não importa o rastreador')
  if (!/<SignupConversionTracker keepUrl \/>/.test(code)) p.push('página do Studio não monta o rastreador com keepUrl')
  if (!/\{ keepUrl = false \}: \{ keepUrl\?: boolean \}/.test(tracker)) p.push('rastreador sem a opção keepUrl (padrão false = home inalterada)')
  if (!/if \(!keepUrl\) \{[\s\S]*?replaceState/.test(tracker)) p.push('keepUrl não protege o replaceState')
  if (!/trackSignupSource\(\)/.test(tracker) || !/\.\.\.GOOGLE_ADS_SIGNUP_CONVERSION/.test(tracker)) p.push('rastreador perdeu conversão ou origem')
  return p
}
const sp = signupProblems(SRC.studioPage, SRC.tracker)
ok(sp.length === 0, `(5) /studio?signup=1 conta o cadastro (Ads + trackSignupSource) sem reescrever a URL (${sp.join('; ') || 'ok'})`)

// ─── (M) mutantes ────────────────────────────────────────────────────────────
const mut = (k, from, to) => ({ ...SRC, [k]: SRC[k].replace(from, to) })
ok(builderProblems(mut('product', 'const destination = `/studio?', 'const destination = `/studio/create?')).length > 0, '(M1) produto de volta à tela antiga → vermelho')
ok(builderProblems(mut('comment', "    autoanalyze: '1',\n", '')).length > 0, '(M2) comentário perdendo autoanalyze → vermelho')
ok(builderProblems(mut('tool', 'duration === 45 ? 35 : duration', 'duration')).length > 0, '(M3) 45 legado sem tradução → vermelho')
ok(builderProblems(mut('remix', "  params.set('intent_campaign', EXAMPLE_REMIX_CAMPAIGN)\n", '')).length > 0, '(M4) remix sem a campanha que atravessa o Generate → vermelho')
ok(builderProblems(mut('pricing', '`/studio?engine=', '`/studio/create?engine=')).length > 0, '(M5) prova de preço de volta à tela antiga → vermelho')
ok(builderProblems(mut('freeScript', "    handoff_kind: 'free_script',\n", '')).length > 0, '(M6) roteiro grátis sem o marcador → vermelho')
ok(previewProblems(SRC.preview.replace("new Set(['/studio', '/studio/create'])", "new Set(['/studio/create'])")).length > 0, '(M7) prova só aceitando o endereço velho → vermelho')
ok(previewProblems(SRC.preview.replace("new Set(['/studio', '/studio/create'])", "new Set(['/studio', '/studio/create', '/pricing'])")).length > 0, '(M8) prova aceitando caminho estranho → vermelho')
ok(signupProblems(SRC.studioPage.replace('      <SignupConversionTracker keepUrl />\n', ''), SRC.tracker).length > 0, '(M9) Studio sem o rastreador → vermelho')
ok(signupProblems(SRC.studioPage, SRC.tracker.replace('if (!keepUrl) {', 'if (true) {')).length > 0, '(M10) rastreador reescrevendo a URL do Studio → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
