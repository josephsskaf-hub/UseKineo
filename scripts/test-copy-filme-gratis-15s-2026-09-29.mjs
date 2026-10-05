// KINEO-FILME-GRATIS-15S-2026-09-29 — guardião da E3: TODO texto público diz a verdade nova do filme grátis.
// Decisão do fundador (29/09): o filme grátis de quem chega é o Seedance 1.5 de 15 s ("free 15-second film (Seedance 1.5)"),
// pago pelos 10 créditos do trial; o Kineo 1 saiu do catálogo público; a cota semanal deixou de ser ANUNCIADA (o mecanismo
// fica até a E4). O que este guardião prova:
//   1. EXECUTA o GET real do /llms.txt e do /api/facts (loader offline, mesmo padrão dos guardiões de AEO; o alias @/ é
//      resolvido por caminho, sem tsconfig) e exige a frase do filme grátis de 15 s, sem Kineo 1 grátis e sem cota recorrente;
//   2. os números são DERIVADOS: custo = creditCostForDuration('cinematic_ai', true, 15), filmes = trial ÷ custo, e os
//      espelhos (freeTierOffer, marketingPrice, gptHandoff, entryPolicy) batem com lib/durationByEngine;
//   3. varre os fontes públicos (só o TEXTO: literais de string/template e JSX, via AST — comentário não conta) proibindo
//      /free\s+Kineo 1/, /Kineo 1…free/, /free…Kineo 1/, /two Kineo 1/, cota semanal grátis e filme grátis de 35 s;
//   4. o GPT aceita 15 s só no Seedance (executado), o openapi publica 15, e /ai-video-generator/kineo-1 é 301 fora do sitemap;
//   5. cada bloco tem mutante em memória que PRECISA ficar vermelho.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }

// ── loader offline com sobrescritas em memória (para os mutantes) ─────────────────────────────────────────────────────
function criaLoader(sobrescritas = {}) {
  const cache = new Map()
  const indisponivel = (n) => { throw new Error('guardião offline proíbe ' + n) }
  const externos = {
    'node:crypto': crypto, crypto,
    openai: { __esModule: true, default: class { constructor() { indisponivel('OpenAI') } } },
    '@supabase/supabase-js': { createClient: () => indisponivel('Supabase') },
  }
  const agora = Date.parse('2026-09-29T12:00:00Z')
  class DataFixa extends Date { constructor(...a) { super(...(a.length ? a : [agora])) } static now() { return agora } }
  const contexto = {
    Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, Response, Date: DataFixa,
    process: { env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' } },
    console: { log() {}, warn() {}, error() {} },
    fetch: () => indisponivel('rede'), setTimeout: () => indisponivel('timer'), clearTimeout() {},
  }
  function carrega(spec, pai = root) {
    if (Object.hasOwn(externos, spec)) return externos[spec]
    let f = spec.startsWith('@/') ? join(root, spec.slice(2)) : spec.startsWith('.') ? resolve(pai, spec) : resolve(root, spec)
    if (!f.startsWith(root + sep)) throw new Error('fora do repo: ' + spec)
    if (!existsSync(f)) f += '.ts'
    if (!existsSync(f) && existsSync(f.replace(/\.ts$/, '.tsx'))) f = f.replace(/\.ts$/, '.tsx')
    if (!existsSync(f)) throw new Error('import inesperado: ' + spec)
    if (cache.has(f)) return cache.get(f)
    const exports = {}
    cache.set(f, exports)
    const rel = f.slice(root.length + 1).split(sep).join('/')
    const src = Object.hasOwn(sobrescritas, rel) ? sobrescritas[rel] : readFileSync(f, 'utf8')
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { ...contexto, exports, require: (n) => carrega(n, dirname(f)) }, { timeout: 10000, filename: f })
    return exports
  }
  return carrega
}

/** Troca um trecho EXATO (1 ocorrência) — mutante em memória. */
function muta(rel, de, para) {
  const src = rd(rel)
  if (src.split(de).length !== 2) throw new Error(`âncora do mutante ausente/ambígua em ${rel}: ${de.slice(0, 60)}`)
  return { [rel]: src.replace(de, para) }
}

// ── padrões proibidos no TEXTO público ────────────────────────────────────────────────────────────────────────────────
const PROIBIDOS = [
  ['free Kineo 1', /free\s+Kineo 1/i],
  ['Kineo 1 … free', /Kineo 1[^.\n]{0,60}\bfree\b/i],
  ['free … Kineo 1', /\bfree\b[^.\n]{0,60}Kineo 1/i],
  ['two Kineo 1', /two Kineo 1/i],
  ['grátis toda semana', /\bfree\b[^.\n]{0,80}\b(every|per|each|a) week\b|\b(every|each) week\b[^.\n]{0,60}\bfree\b/i],
  ['filme grátis de 35 s', /free\s+35-second|35-second[^.\n]{0,30}\bfree\b|free\s+35s\b/i],
  // Revisão da E2b (texto, achado 8, 29/09): as PARÁFRASES que passavam verdes — "then 1 free film every 7 days",
  // "Kineo 1 … costs 0 credits on the trial" — e a negação da cota que segue ligada ("no recurring free films").
  ['grátis a cada N dias', /\bfree\b[^.\n]{0,80}\bevery \d+ days\b|\bevery \d+ days\b[^.\n]{0,60}\bfree\b/i],
  ['Kineo 1 … 0 créditos / de graça', /Kineo 1[^.\n]{0,60}\b(0|zero|no) credits\b|\b(0|zero|no) credits\b[^.\n]{0,60}Kineo 1|Kineo 1[^.\n]{0,60}\b(costs nothing|at no cost|without credits)\b/i],
  ['nega a cota que segue ligada', /\bno recurring free (films|videos)\b/i],
]
function proibidosEm(texto) {
  const achados = []
  for (const [nome, re] of PROIBIDOS) { const m = texto.match(re); if (m) achados.push(`${nome}: "${m[0].slice(0, 90)}"`) }
  return achados
}

/** Só o texto que chega ao público: literais de string/template e JSX (comentários ficam de fora). */
function textoDe(rel, src) {
  if (rel.endsWith('.json')) { const out = []; const anda = (v) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(anda) }; anda(JSON.parse(src)); return out }
  if (!/\.(ts|tsx)$/.test(rel)) return [src]
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  const anda = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) out.push(n.text)
    else if (ts.isTemplateExpression(n)) out.push([n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' X '))
    ts.forEachChild(n, anda)
  }
  anda(sf)
  return out
}

const FONTES_PUBLICAS = [
  'lib/growth/trialAccessFacts.ts', 'lib/marketingPrice.ts', 'lib/kineoFacts.ts', 'lib/entryPolicy.ts', 'lib/freeTierOffer.ts',
  'app/llms.txt/route.ts', 'app/api/facts/route.ts', 'app/facts/page.tsx', 'public/gpt/openapi.json',
  'app/pricing/PricingClient.tsx', 'components/PricingCards.tsx', 'components/UpgradeModal.tsx', 'components/Creator30OfferModal.tsx',
  'components/StructuredData.tsx', 'app/models-pricing/page.tsx', 'app/ph/page.tsx', 'app/omni-flash-vs-sora/page.tsx',
  'app/sora-alternative/page.tsx', 'app/seedance-vs-veo-vs-kling/page.tsx', 'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx',
  'components/ScriptToSeedanceBridge.tsx', 'components/AgencyVolumeBridge.tsx', 'components/ExitIntentOffer.tsx', 'app/KineoLanding.tsx',
  'app/api/cron/send-activation-nudge/route.ts', 'app/api/cron/send-reminders/route.ts', 'app/api/cron/send-momentum-nudge/route.ts',
  'lib/comparisons.ts', 'lib/growth/checkoutSuccessFirstFilm.ts', 'lib/growth/dfyOffer.ts', 'lib/growth/pricingJourneyProof.ts',
  'lib/lifecycle/subscriberIdle.ts', 'lib/credits/creditMinutes.ts', 'lib/growth/businessAnswerEngineRouter.ts', 'lib/seo/intentPages.ts',
  'app/ai-video-generator/for/[slug]/page.tsx', 'lib/lifecycle/videoReadyFooter.ts', 'app/kineo-vs-higgsfield/page.tsx',
  'app/ai-shorts-without-filming/page.tsx', 'app/tiktok-creator-rewards-videos/page.tsx', 'app/ai-shorts-series/page.tsx',
  'lib/growth/citationAnswers.ts', 'components/CitationAnswerPage.tsx', 'components/CitationComparisonDecision.tsx',
  'components/CitationCostDecision.tsx', 'lib/growth/enginePageCatalog.ts', 'lib/seo/freeShortsGeneratorLangs.ts',
  'docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt', 'docs/TAAFT-LISTING-2026-09-03.md',
  // Revisão da E2b (texto, achado 8): o hub público de motores, o modal de trial vencido, o cartão de plano, o banner do
  // trial e o Studio (telas que a conta nova vê) entram na varredura inteira. O /generate e a carta da cota vão na seção 5
  // (texto do Kineo 1 grátis só atrás de portão de visibilidade / anúncio desligado).
  'app/ai-video-generator/page.tsx', 'components/TrialDowngradeModal.tsx', 'components/growth/PlanFitCard.tsx',
  'components/TrialActiveBanner.tsx', 'app/(dashboard)/studio/StudioClient.tsx',
]
function varre(sobrescritas = {}) {
  const achados = []
  for (const rel of FONTES_PUBLICAS) {
    const src = Object.hasOwn(sobrescritas, rel) ? sobrescritas[rel] : rd(rel)
    for (const t of textoDe(rel, src)) for (const a of proibidosEm(t)) achados.push(`${rel} → ${a}`)
  }
  return achados
}

// ── o que o /llms.txt e o /api/facts publicam (executados) ────────────────────────────────────────────────────────────
async function publica(sobrescritas = {}) {
  const L = criaLoader(sobrescritas)
  const llms = await L('app/llms.txt/route.ts').GET().text()
  const facts = await L('app/api/facts/route.ts').GET().json()
  return { L, llms, facts }
}
function problemasPublicos({ L, llms, facts }) {
  const p = []
  const custo = L('lib/credits/engineCost.ts').creditCostForDuration('cinematic_ai', true, L('lib/durationByEngine.ts').SEEDANCE_SHORT_SECONDS)
  const trial = L('lib/freeTierOffer.ts').TRIAL_GRANT_CREDITS_COPY
  const frase = `free ${L('lib/durationByEngine.ts').SEEDANCE_SHORT_SECONDS}-second film (Seedance 1.5)`
  if (!(custo <= trial)) p.push(`custo do 15 s (${custo}) não cabe no trial (${trial})`)
  if (!llms.includes(frase)) p.push('llms.txt sem a frase do filme grátis de 15 s')
  const json = JSON.stringify(facts)
  if (!json.includes(frase)) p.push('/api/facts sem a frase do filme grátis de 15 s')
  const ff = facts.trialAccess?.freeFilm
  if (!ff || ff.engine !== 'Seedance 1.5' || ff.seconds !== 15 || ff.creditsPerFilm !== custo || ff.filmsCovered !== Math.floor(trial / custo)) p.push('trialAccess.freeFilm não é o Seedance de 15 s derivado: ' + JSON.stringify(ff))
  if (facts.recurringFreeAccess !== null) p.push('recurringFreeAccess anunciado: ' + JSON.stringify(facts.recurringFreeAccess))
  if (facts.freeTier?.freeVideosPerWindow !== 0 || facts.freeTier?.engineCanonicalName !== null) p.push('freeTier ainda anuncia cota recorrente')
  if (facts.offerEffectiveSince !== '2026-09-29') p.push('vigência não é 29/09: ' + facts.offerEffectiveSince)
  if ((facts.engines ?? []).some((e) => e.name === 'Kineo 1')) p.push('/api/facts lista o Kineo 1 no catálogo público')
  if (/recurring free access is/i.test(llms)) p.push('llms.txt anuncia acesso grátis recorrente')
  for (const a of [...proibidosEm(llms), ...proibidosEm(json)]) p.push('publicado: ' + a)
  return p
}

console.log('== 1. /llms.txt e /api/facts executados: filme grátis = Seedance 1.5 de 15 s, sem Kineo 1 grátis ==')
{
  const real = await publica()
  const probs = problemasPublicos(real)
  checa(`llms.txt (${real.llms.length} caracteres) e /api/facts dizem "free 15-second film (Seedance 1.5)", derivado, sem cota recorrente${probs.length ? ' — ' + probs.join(' | ') : ''}`, probs.length === 0)
  const m1 = problemasPublicos(await publica(muta('lib/freeTierOffer.ts', 'export const TRIAL_FREE_FILM_SECONDS = 15', 'export const TRIAL_FREE_FILM_SECONDS = 35')))
  checa(`mutante (filme grátis de 35 s) → vermelho (${m1.length} problemas)`, m1.length > 0)
  const m2 = problemasPublicos(await publica(muta('lib/kineoFacts.ts', 'const RECURRING_FREE_ANNOUNCED: boolean = false', 'const RECURRING_FREE_ANNOUNCED: boolean = true')))
  checa(`mutante (cota semanal de Kineo 1 volta a ser anunciada) → vermelho (${m2.length} problemas)`, m2.length > 0)
  const m3 = problemasPublicos(await publica(muta('lib/kineoFacts.ts', "const OFFER_EFFECTIVE_ISO = '2026-09-29'", "const OFFER_EFFECTIVE_ISO = '2026-09-17'")))
  checa('mutante (vigência antiga de 17/09) → vermelho', m3.length > 0)
}

console.log('== 2. números derivados e espelhos batem com lib/durationByEngine ==')
{
  const L = criaLoader()
  const S = L('lib/durationByEngine.ts').SEEDANCE_SHORT_SECONDS
  const ec = L('lib/credits/engineCost.ts')
  const fto = L('lib/freeTierOffer.ts')
  const mp = L('lib/marketingPrice.ts')
  const ep = L('lib/entryPolicy.ts')
  const custo = ec.creditCostForDuration('cinematic_ai', true, S)
  checa(`freeTierOffer: ${fto.TRIAL_FREE_FILM_SECONDS} s = ${S} s; custo ${fto.TRIAL_FREE_FILM_CREDITS} = creditCostForDuration (${custo}); filmes ${fto.TRIAL_SEEDANCE15_FILMS} = ⌊${fto.TRIAL_GRANT_CREDITS_COPY}/${custo}⌋`,
    fto.TRIAL_FREE_FILM_SECONDS === S && fto.TRIAL_FREE_FILM_CREDITS === custo && fto.TRIAL_SEEDANCE15_FILMS === Math.floor(fto.TRIAL_GRANT_CREDITS_COPY / custo) && fto.TRIAL_SEEDANCE15_FILMS >= 1)
  checa(`FREE_FILM_LABEL = "${fto.FREE_FILM_LABEL}"`, fto.FREE_FILM_LABEL === `free ${S}-second film (Seedance 1.5)`)
  checa(`marketingPrice: ${mp.SEEDANCE_SHORT_FILM_SECONDS} s e ${mp.SEEDANCE_SHORT_FILM_CREDITS} cr espelham o 15 s`, mp.SEEDANCE_SHORT_FILM_SECONDS === S && mp.SEEDANCE_SHORT_FILM_CREDITS === custo)
  checa('videoReadyFooter: o piso do próximo filme é o custo do 15 s (import, não número)', /^export const NEXT_VIDEO_MIN_CREDITS = SEEDANCE_SHORT_FILM_CREDITS$/m.test(rd('lib/lifecycle/videoReadyFooter.ts')))
  const momentum = rd('app/api/cron/send-momentum-nudge/route.ts')
  checa('send-momentum-nudge: piso = creditCostForDuration do Seedance de 15 s e sem ramo de motor grátis anunciado',
    /^ {2}const minCredits = creditCostForDuration\('cinematic_ai', true, 15\)$/m.test(momentum) && /^ {4}const freeEngineCost = minCredits$/m.test(momentum))
  const on = fto.buildFreeTierOffer(true).copy
  const onTexto = [on.sentence, on.planCardBody, on.cmpKineoFree, on.residual, on.planLimitLine, on.limitHitError, on.limitHitEmailSubject, on.limitHitEmailIntro, on.limitResetLine].join(' || ')
  checa('ON_COPY: frase do filme grátis de 15 s, sem Kineo 1 e sem promessa semanal', on.sentence.includes(fto.FREE_FILM_LABEL) && !/Kineo 1/.test(onTexto) && !/every week|per week|1 every/i.test(onTexto))
  checa(`entryPolicy (módulo puro, espelho literal) diz "one ${fto.FREE_FILM_LABEL}" e ${fto.TRIAL_SEEDANCE15_FILMS === 1 ? 'o trial paga exatamente 1' : 'CONTAGEM DIVERGE'}`,
    ep.FREE_ENTRY_COPY.sentence.includes(`enough for one ${fto.FREE_FILM_LABEL}`) && fto.TRIAL_SEEDANCE15_FILMS === 1)
  const gh = L('lib/gptHandoff.ts')
  const v = (d, e) => gh.validateHandoffInput({ script: 'HOOK: a\nMICRO REWARD: b\nESCALATION: c\nPAYOFF: d', durationSec: d, engineHint: e })
  checa(`gptHandoff: DURATIONS [${gh.DURATIONS}] tem ${S}; ${S} s no seedance passa; no fast/kling é recusado`,
    gh.DURATIONS.includes(S) && gh.SEEDANCE_ONLY_DURATION === S && v(S, 'seedance').ok === true && v(S, 'fast').ok === false && v(S, 'kling').ok === false && v(35, 'fast').ok === true)
  const semRecusa = criaLoader(muta('lib/gptHandoff.ts', "  if (durationSec === SEEDANCE_ONLY_DURATION && engineHint !== 'seedance') {", "  if (false) {"))('lib/gptHandoff.ts')
  checa('mutante (gptHandoff sem a recusa do 15 s fora do Seedance) → vermelho', semRecusa.validateHandoffInput({ script: 'HOOK: a', durationSec: S, engineHint: 'fast' }).ok === true)
}

console.log('== 3. varredura do texto público (literais e JSX, sem comentários) ==')
{
  const achados = varre()
  checa(`${FONTES_PUBLICAS.length} fontes públicas sem "free Kineo 1", "two Kineo 1", cota semanal grátis nem filme grátis de 35 s${achados.length ? ' — ' + achados.join(' | ') : ''}`, achados.length === 0)
  const muts = [
    ['app/pricing/PricingClient.tsx', "outcome: `Seedance 1.5: ${videosPerMonth('basic', 'cinematic_ai')} AI films", "outcome: `Seedance 1.5, enough for two Kineo 1 films: ${videosPerMonth('basic', 'cinematic_ai')} AI films"],
    // Revisão da E2b: os dois alvos abaixo mudaram de texto (a negação da cota saiu; o padrão das páginas é o Seedance) —
    // o mutante segue a linha nova, com a mesma frase proibida de antes.
    ['lib/freeTierOffer.ts', "  residual: 'your saved library',", "  residual: '1 free Kineo 1 video every week',"],
    ['lib/seo/intentPages.ts', "    engineWhy: f.why ?? 'Seedance 1.5 generates a scene for every line of the script.',", "    engineWhy: f.why ?? 'Kineo 1 matches real footage to every line and fits inside the free trial.',"],
    // KINEO-VERDADE-TRIAL-2026-10-05 — âncora re-ancorada: a linha do /ph perdeu a promessa de motores; mesmo mutante (35 s).
    ['app/ph/page.tsx', 'enough for one {FREE_FILM_LABEL} — no card.', 'enough for a free 35-second film — no card.'],
    // Revisão da E2b (texto, achado 8): as paráfrases que passavam verdes, e um arquivo que antes nem era lido.
    ['lib/freeTierOffer.ts', "  planLimitLine: `one ${FREE_FILM_LABEL} with the trial credits`,", "  planLimitLine: `one ${FREE_FILM_LABEL} with the trial credits, then 1 free film every 7 days`,"],
    ['lib/seo/intentPages.ts', "    engineWhy: f.why ?? 'Seedance 1.5 generates a scene for every line of the script.',", "    engineWhy: f.why ?? 'Kineo 1 matches real footage and costs 0 credits on the trial.',"],
    ['lib/freeTierOffer.ts', "  residual: 'your saved library',", "  residual: 'your saved library (no recurring free films)',"],
    ['components/TrialActiveBanner.tsx', "'use client'", "'use client'\nexport const X = 'Your free Kineo 1 video is waiting'"],
  ]
  for (const [rel, de, para] of muts) {
    const n = varre(muta(rel, de, para)).length
    checa(`mutante em ${rel} ("${para.slice(0, 50)}…") → vermelho (${n} achado)`, n > 0)
  }
  const comComentario = varre({ 'lib/marketingPrice.ts': rd('lib/marketingPrice.ts') + '\n// free Kineo 1 video every week (comentário)\n' }).length
  checa('comentário com a frase proibida NÃO conta (só texto que chega ao público)', comComentario === 0)
  const venda = ['app/pricing/PricingClient.tsx', 'components/PricingCards.tsx', 'components/UpgradeModal.tsx', 'components/Creator30OfferModal.tsx'].filter((f) => rd(f).includes('Kineo 1'))
  checa(`os 4 arquivos de venda (trava (j) da E1) não citam "Kineo 1" em lugar nenhum${venda.length ? ' — ' + venda.join(', ') : ''}`, venda.length === 0)
}

console.log('== 4. openapi do GPT, página do Kineo 1 (301) e sitemap ==')
{
  const oa = JSON.parse(rd('public/gpt/openapi.json'))
  const req = oa.components.schemas.HandoffRequest.properties.durationSec.enum
  const res = oa.components.schemas.HandoffResponse.properties.durationSec.enum
  const d200 = oa.paths['/api/gpt/handoff'].post.responses['200'].description
  checa(`openapi: durationSec aceita 15 (pedido [${req}] e resposta [${res}]); o 200 cita o filme grátis de 15 s e não diz que o trial cobre o fast`,
    req.includes(15) && res.includes(15) && d200.includes('free 15-second film (Seedance 1.5)') && !/covers films on `fast`/.test(d200))
  const semQuinze = JSON.parse(rd('public/gpt/openapi.json').replace('"enum": [\n              15,', '"enum": ['))
  checa('mutante (openapi sem o 15) → vermelho', !semQuinze.components.schemas.HandoffRequest.properties.durationSec.enum.includes(15))
  const cfg = require(join(root, 'next.config.js'))
  const redirs = await cfg.redirects()
  const tem = (s, d) => redirs.some((r) => r.source === s && r.destination === d && r.statusCode === 301)
  checa('next.config: /ai-video-generator/kineo-1 (e /:lang) → 301 para o Seedance', tem('/ai-video-generator/kineo-1', '/ai-video-generator/seedance') && tem('/ai-video-generator/kineo-1/:lang', '/ai-video-generator/seedance/:lang'))
  const L = criaLoader()
  const cat = L('lib/growth/enginePageCatalog.ts')
  const langs = L('lib/seo/enginePageLangs.ts')
  const k1pub = L('lib/engineLaunch.ts').KINEO1_PUBLIC
  checa(`kineo-1 fora de ENGINE_SLUGS [${cat.ENGINE_SLUGS}] e de LOCALIZED_ENGINE_SLUGS [${langs.LOCALIZED_ENGINE_SLUGS}] (KINEO1_PUBLIC=${k1pub})`,
    k1pub === false && !cat.ENGINE_SLUGS.includes('kineo-1') && !langs.LOCALIZED_ENGINE_SLUGS.includes('kineo-1') && cat.RETIRED_ENGINE_SLUGS.includes('kineo-1'))
  checa('engineLandingIntent: o caminho público de fast aponta direto para o Seedance (sem pular por redirect)', L('lib/growth/engineLandingIntent.ts').engineLandingPublicPath('fast') === '/ai-video-generator/seedance')
  const semAposentar = criaLoader(muta('lib/growth/enginePageCatalog.ts', "export const RETIRED_ENGINE_SLUGS: readonly string[] = ['kineo-1']", 'export const RETIRED_ENGINE_SLUGS: readonly string[] = []'))('lib/growth/enginePageCatalog.ts')
  checa('mutante (kineo-1 de volta ao ENGINE_SLUGS) → vermelho', semAposentar.ENGINE_SLUGS.includes('kineo-1'))
  const sm = rd('app/sitemap.ts')
  checa('sitemap itera as listas derivadas (ENGINE_SLUGS e LOCALIZED_ENGINE_SLUGS), sem slug digitado', /for \(const slug of ENGINE_SLUGS\)/.test(sm) && /for \(const slug of LOCALIZED_ENGINE_SLUGS\)/.test(sm) && !sm.includes("'kineo-1'"))
}

console.log('== 5. revisão da E2b: telas logadas com portão, carta da cota e as 100 páginas /for executadas ==')
{
  // 5a. /generate: texto de Kineo 1 grátis só atrás do portão de visibilidade (kineo1Shown). Varre o arquivo com os
  //     padrões que valem para QUALQUER tela; os de "Kineo 1 grátis" são provados pelos predicados abaixo.
  const GEN_REL = 'app/(dashboard)/generate/GenerateClient.tsx'
  const SEMPRE = new Set(['two Kineo 1', 'filme grátis de 35 s', 'grátis toda semana', 'grátis a cada N dias', 'nega a cota que segue ligada'])
  const varreGen = (src) => textoDe(GEN_REL, src).flatMap((t) => PROIBIDOS.filter(([n, re]) => SEMPRE.has(n) && re.test(t)).map(([n]) => n))
  const gen = rd(GEN_REL)
  checa(`/generate sem "two Kineo 1", filme grátis de 35 s, cota semanal nem negação da cota${varreGen(gen).length ? ' — ' + varreGen(gen).join(', ') : ''}`, varreGen(gen).length === 0)
  const PORTOES = [
    ['caixa "your first one is free" (Kineo 1 grátis)', '    trialActive !== true &&\n    kineo1Shown\n'],
    ['desvio do episódio 2 para "Kineo 1, free on your account"', 'selectedUnaffordable && episode2FreeCost === 0 && episode2QuotaKnown && !freeFastQuotaSpent && kineo1Shown'],
    ['saída do trial "seu saldo paga um Kineo 1"', "credits >= creditCostForDuration('fast', isPaidAccount, duration) && kineo1Shown"],
  ]
  for (const [nome, linha] of PORTOES) checa(`/generate: ${nome} só com kineo1Shown`, gen.includes(linha))
  checa('/generate: a caixa grátis não promete "up to 3 films a day" (a cota real é outra)', !gen.includes('up to 3 films a day'))
  const semPortao = gen.replace('    trialActive !== true &&\n    kineo1Shown\n', '    trialActive !== true\n')
  checa('mutante (caixa grátis sem o portão kineo1Shown) → vermelho', semPortao !== gen && !semPortao.includes(PORTOES[0][1]))
  // 5b. A carta "now it comes back every week" é o anúncio da cota: com o anúncio desligado, 409 antes de tudo.
  const WQ = rd('app/api/admin/send-weekly-quota/route.ts')
  const GATE = '    if (!RECURRING_FREE_ANNOUNCED) {'
  const gateOk = (src) => src.includes(GATE) && src.indexOf(GATE) < src.indexOf("    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'") && src.includes("import { RECURRING_FREE_ANNOUNCED } from '@/lib/kineoFacts'")
  const anunciado = criaLoader()('lib/kineoFacts.ts').RECURRING_FREE_ANNOUNCED
  checa(`send-weekly-quota: 409 enquanto a cota não é anunciada (RECURRING_FREE_ANNOUNCED=${anunciado}), antes do dry-run e do envio`, anunciado === false && gateOk(WQ))
  checa('mutante (carta sem a trava do anúncio) → vermelho', !gateOk(WQ.replace(GATE, '    if (false) {')))
  // 5c. As 100 páginas /ai-video-generator/for/* EXECUTADAS: nenhuma no Kineo 1, nenhum texto de página cita o Kineo 1,
  //     o selo do motor não é "Kineo 1" e o CTA "Make this film free" não crava 60 s (que o trial não paga).
  const paginas = (src) => criaLoader(src ? { 'lib/seo/intentPages.ts': src } : {})('lib/seo/intentPages.ts').INTENT_PAGES
  const problemasPaginas = (lista) => lista.filter((p) => p.engine !== 'cinematic_ai' || /Kineo 1/.test([p.title, p.h1, p.intro, p.engineWhy, ...p.faq.flatMap((f) => [f.q, f.a]), ...(p.competitor?.differences ?? [])].join(' '))).map((p) => p.slug)
  const reais = paginas()
  checa(`${reais.length} páginas /for executadas: todas no Seedance 1.5, nenhuma cita o Kineo 1${problemasPaginas(reais).length ? ' — ' + problemasPaginas(reais).slice(0, 5).join(', ') : ''}`, reais.length >= 100 && problemasPaginas(reais).length === 0)
  const pg = rd('app/ai-video-generator/for/[slug]/page.tsx')
  const mapa = pg.match(/const ENGINE_NAME: Record<IntentEngine, string> = \{ fast: '([^']+)', cinematic_ai: '([^']+)' \}/)
  checa('selo e título da página vêm de ENGINE_NAME[p.engine] e o motor das páginas é "Seedance 1.5"', !!mapa && mapa[2] === 'Seedance 1.5' && pg.includes('{ENGINE_NAME[p.engine]} · {engineCost} credits per 60-second film'))
  checa('CTA "Make this film free" sem duração cravada (o Studio escolhe a que o saldo paga) e com o motor no vocabulário do Studio', !/duration:\s*'\d+'/.test(pg) && pg.includes("engine: engine === 'cinematic_ai' ? 'seedance' : engine"))
  const mutPadrao = rd('lib/seo/intentPages.ts').replace("  const engine = n.engine ?? 'cinematic_ai'", "  const engine = n.engine ?? 'fast'")
  checa('mutante (padrão das páginas de volta ao Kineo 1) → vermelho', problemasPaginas(paginas(mutPadrao)).length > 0)
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — o texto público diz: o filme grátis é o Seedance 1.5 de 15 s; nada de Kineo 1 grátis nem cota semanal.')
