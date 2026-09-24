// KINEO-PONTE-ACIMA-DA-DOBRA-2026-09-23 + KINEO-BENCHMARK-MOTORES-2026-09-23 — guardião das jogadas 3 e da página de dados.
//
// O QUE ESTE GUARDIÃO PROVA (fundador 23/09: "vai" nas 3 jogadas; jogada 3 = bloco acima da dobra nas 4 páginas citadas):
//   1. components/ScriptToSeedanceBridge existe, emite impressão E clique, e leva ?from=<origem>_bridge ao Seedance,
//      com preço e filmes lidos das fontes únicas (nenhum número digitado).
//   2. As 4 páginas citadas renderizam a ponte ANTES do formulário, sob a condição "Seedance não pausado".
//   3. A página do motor só a renderiza no kineo-1, e a ponte antiga abaixo da dobra (?from=kineo1_bridge) sumiu.
//   4. As linhas <h1>, os metadados e os JSON-LD das 3 páginas não-motor são os mesmos da base 2d6d7940 (a citação
//      do ChatGPT depende do título; mexer nele é perder o canal).
//   5. A página de dados existe, lê lib/engineBenchmarkStats, que EXCLUI contas internas (exercitado com um Supabase
//      falso, não só lido como texto), tem FAQPage e está no sitemap.
//   6. Nenhum literal de preço nos arquivos novos.
// Estilo readFileSync + loader offline (memória: import com alias '@/' não roda em node puro).
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const BASE_SHA = '2d6d7940'
let passed = 0
let failed = 0
function check(condition, label) {
  if (!condition) {
    failed += 1
    console.log(`✗ ${label}`)
    return
  }
  passed += 1
  console.log(`✓ ${label}`)
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const atBase = (f) => execFileSync('git', ['show', `${BASE_SHA}:${f}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
const PAUSE_GUARD = '!enginePaused(ENGINES.seedance.param)'

// ── 1) o componente ─────────────────────────────────────────────────────────────────────────────────
console.log('1) componente')
const COMP = 'components/ScriptToSeedanceBridge.tsx'
const comp = fs.existsSync(COMP) ? read(COMP) : ''
check(comp.startsWith("'use client'"), 'componente existe e é client')
check(/trackEvent\('engine_bridge_shown', \{ from, to: 'seedance', version: SCRIPT_BRIDGE_VERSION \}\)/.test(comp), 'impressão engine_bridge_shown com from/to/version')
check(/trackEvent\('engine_bridge_clicked', \{ from, to: 'seedance', version: SCRIPT_BRIDGE_VERSION \}\)/.test(comp), 'clique engine_bridge_clicked com from/to/version')
check(comp.includes("export const SCRIPT_BRIDGE_VERSION = 'bridge_v1'"), 'versão bridge_v1')
check(/if \(shownRef\.current\) return\s+shownRef\.current = true/.test(comp), 'impressão uma vez por montagem (ref)')
check(/<Link\s+href=\{href\}\s+onClick=\{onClick\}/.test(comp), 'o clique do CTA dispara o evento')
check(comp.includes('return `/ai-video-generator/seedance?from=${encodeURIComponent(from)}_bridge`'), 'href com ?from=<origem>_bridge')
check(comp.includes("formatCheckoutMoney('usd', TIER_PRICES.starter.usd)"), 'preço do Starter pela fonte única')
check(comp.includes("creditCostForDuration('cinematic_ai', true, BRIDGE_FILM_SECONDS)") && comp.includes('Math.floor(TIER_CREDITS.starter / cost)'), 'filmes = TIER_CREDITS.starter ÷ custo do Seedance 35 s')
check(comp.includes('Have a script from ChatGPT?') && comp.includes('Paste it into Seedance 1.5 — the engine people publish with.') && comp.includes('Render my script on Seedance →'), 'copy aprovada')
{
  // engineCost é client-safe: não importa nada (senão o bundle do cliente arrasta servidor).
  const engineCost = read('lib/credits/engineCost.ts')
  check(!/^import /m.test(engineCost), 'lib/credits/engineCost não importa nada (seguro no cliente)')
  const load = createOfflineLoader()
  const { creditCostForDuration } = load('lib/credits/engineCost.ts')
  const { TIER_CREDITS } = load('lib/checkoutPricing.ts')
  const films = Math.max(1, Math.floor(TIER_CREDITS.starter / creditCostForDuration('cinematic_ai', true, 35)))
  check(Number.isInteger(films) && films >= 1, `a conta dos filmes dá um inteiro ≥ 1 hoje (${films})`)
}

// ── 2) as 4 páginas ─────────────────────────────────────────────────────────────────────────────────
console.log('2) as 4 páginas citadas')
const ENGINE_PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const PAGES = [
  { file: ENGINE_PAGE, from: 'kineo1', form: '<TopicGeneratorForm' },
  { file: 'app/free-ai-shorts-generator/page.tsx', from: 'free_ai_shorts_generator', form: '<TopicGeneratorForm' },
  { file: 'app/text-to-video-shorts/page.tsx', from: 'text_to_video_shorts', form: '<TextToVideoIntentForm' },
  { file: 'app/state-of-ai-shorts-2026/page.tsx', from: 'state_of_ai', form: '<TopicGeneratorForm' },
]
for (const p of PAGES) {
  const src = read(p.file)
  const tag = `<ScriptToSeedanceBridge from="${p.from}"`
  check(src.includes("import ScriptToSeedanceBridge from '@/components/ScriptToSeedanceBridge'"), `${p.file}: importa a ponte`)
  check((src.match(/<ScriptToSeedanceBridge /g) ?? []).length === 1, `${p.file}: uma ponte só`)
  const at = src.indexOf(tag), form = src.indexOf(p.form)
  check(at > 0 && form > 0 && at < form, `${p.file}: ponte (from=${p.from}) antes do formulário`)
}
{
  const free = read('app/free-ai-shorts-generator/page.tsx')
  const text = read('app/text-to-video-shorts/page.tsx')
  const state = read('app/state-of-ai-shorts-2026/page.tsx')
  check(free.includes(`{${PAUSE_GUARD} && <ScriptToSeedanceBridge from="free_ai_shorts_generator" compact />}`), 'free: some quando o Seedance pausa')
  check(text.includes(`{${PAUSE_GUARD} && <ScriptToSeedanceBridge from="text_to_video_shorts" compact />}`), 'text-to-video: some quando o Seedance pausa')
  check(state.includes(`const seedanceBridge = ${PAUSE_GUARD} ? <ScriptToSeedanceBridge from="state_of_ai" /> : null`), 'state: some quando o Seedance pausa')
  for (const [name, src] of [['free', free], ['text', text], ['state', state]]) {
    check(src.includes("import { ENGINES } from '@/lib/growth/enginePageCatalog'") && src.includes("import { enginePaused } from '@/lib/engineLaunch'"), `${name}: pausa pelo mesmo helper da página do motor`)
  }
  // state: o formulário mora num bloco próprio; a ponte é RENDERIZADA no topo do conteúdo, antes de "Key findings".
  const render = state.indexOf('{seedanceBridge && ')
  check(render > state.indexOf('<h1') && render < state.indexOf('>Key findings</h2>') && render < state.indexOf('{starterSection}'), 'state: ponte renderizada depois do H1/lead e antes de Key findings')
}

// ── 3) página do motor ──────────────────────────────────────────────────────────────────────────────
console.log('3) página do motor')
{
  const src = read(ENGINE_PAGE)
  check(src.includes("const showSeedanceBridge = params.engine === 'kineo-1' && !enginePaused(ENGINES.seedance.param)"), 'engine: condição kineo-1 + Seedance não pausado')
  check(src.includes('{showSeedanceBridge && <ScriptToSeedanceBridge from="kineo1" />}'), 'engine: a ponte renderiza só sob a condição')
  const at = src.indexOf('<ScriptToSeedanceBridge from="kineo1"')
  check(at > src.indexOf('{tierNote}</p>') && at < src.indexOf('<TopicGeneratorForm'), 'engine: ponte entre o hero e o formulário (acima da dobra)')
  check(!src.includes('kineo1_bridge') && !src.includes('seedanceBridge.map'), 'engine: a ponte antiga abaixo da dobra sumiu')
}

// ── 4) título, H1, metadados e JSON-LD intocados ─────────────────────────────────────────────────────
console.log('4) citação intocada (base ' + BASE_SHA + ')')
const h1Of = (src) => { const a = src.indexOf('<h1'); return a < 0 ? null : src.slice(a, src.indexOf('</h1>', a) + 5) }
const ldLines = (src) => src.split('\n').filter((l) => l.includes('application/ld+json')).map((l) => l.trim()).join('\n')
const metaBlock = (src) => {
  const a = src.indexOf('export const metadata')
  if (a >= 0) return src.slice(a, src.indexOf('\n}\n', a))
  const b = src.indexOf('export async function generateMetadata')
  return b >= 0 ? src.slice(b, src.indexOf('\n}\n', b)) : null
}
for (const f of ['app/free-ai-shorts-generator/page.tsx', 'app/text-to-video-shorts/page.tsx', 'app/state-of-ai-shorts-2026/page.tsx']) {
  const cur = read(f), base = atBase(f)
  check(h1Of(cur) !== null && h1Of(cur) === h1Of(base), `${f}: <h1> igual à base`)
  check(metaBlock(cur) !== null && metaBlock(cur) === metaBlock(base), `${f}: title/description iguais à base`)
  check(ldLines(cur).length > 0 && ldLines(cur) === ldLines(base), `${f}: JSON-LD igual à base`)
}

// ── 5) página de dados ──────────────────────────────────────────────────────────────────────────────
console.log('5) página de dados')
const DATA_PAGE = 'app/seedance-vs-veo-vs-kling/page.tsx'
const STATS = 'lib/engineBenchmarkStats.ts'
const page = fs.existsSync(DATA_PAGE) ? read(DATA_PAGE) : ''
const stats = fs.existsSync(STATS) ? read(STATS) : ''
check(page.includes("import { getEngineBenchmarkStats, type EngineBenchmarkRow } from '@/lib/engineBenchmarkStats'"), 'página importa engineBenchmarkStats')
check(page.includes("'@type': 'FAQPage'") && page.includes("'@type': 'Dataset'"), 'página tem FAQPage e Dataset')
check(page.includes('export const revalidate = STUDY_REVALIDATE_SECONDS'), 'mesmo regime de revalidação da /state-of-ai')
check(page.includes('`Seedance vs Veo vs Kling for Shorts (2026): measured on ${total} real renders`'), 'título com N real')
check(page.includes('<ScriptToSeedanceBridge from="benchmark" />') && page.includes('/ai-video-generator/seedance?from=benchmark_bridge'), 'página leva ao Seedance (ponte + CTA)')
check(page.includes('creditCostForDuration(r.qualityMode as Quality, true, REFERENCE_SECONDS)') && page.includes('TIER_PRICES.starter.usd / TIER_CREDITS.starter'), 'créditos e custo por filme pelas fontes únicas')
check(page.includes('paused: !!enginePaused(engine.param)'), 'motor pausado aparece como pausado')
check(stats.includes("import { isInternalEmail } from '@/lib/internalAccounts'") && stats.includes('if (isInternalEmail(p.email)) internalIds.add(p.id)'), 'stats exclui internas pela fonte única')
check(stats.includes(".order('id', { ascending: true })"), 'paginação ordenada')
check(read('app/state-of-ai-shorts-2026/page.tsx').includes('<Link href="/seedance-vs-veo-vs-kling"'), 'página não nasce órfã: o estudo irmão linka para ela')
check(read('app/sitemap.ts').includes("{ path: '/seedance-vs-veo-vs-kling', priority: 0.8, freq: 'weekly' }"), 'página no sitemap (0.8)')
{
  // Exercita o módulo REAL com um Supabase falso: 3 filmes Seedance (1 do fundador), 1 Kineo 1.
  const videos = [
    { id: 'a', user_id: 'u1', quality_mode: 'cinematic_ai', duration: 40 },
    { id: 'b', user_id: 'u2', quality_mode: 'cinematic_ai', duration: 50 },
    { id: 'c', user_id: 'boss', quality_mode: 'cinematic_ai', duration: 999 },
    { id: 'd', user_id: 'u1', quality_mode: 'fast', duration: 45 },
  ]
  // 250 filmes externos de Kineo 1 para passar o piso de sanidade.
  for (let i = 0; i < 250; i++) videos.push({ id: 'f' + String(i).padStart(4, '0'), user_id: 'x' + i, quality_mode: 'fast', duration: 45 })
  const profiles = [{ id: 'u1', email: 'ana@example.com' }, { id: 'u2', email: 'bo@example.com' }, { id: 'boss', email: 'josephsskaf@gmail.com' }]
  const makeClient = (failVideos) => ({
    from: (table) => {
      const q = { _range: [0, 999], _ids: null }
      const b = {
        select: () => b, eq: () => b, gte: () => b, order: () => b,
        in: (col, vals) => { if (col === 'id') q._ids = vals; return b },
        range: (a, z) => { q._range = [a, z]; return b },
        then: (res) => {
          if (table === 'videos') return res(failVideos ? { data: null, error: { message: 'boom' } } : { data: videos.slice(q._range[0], q._range[1] + 1), error: null })
          return res({ data: profiles.filter((p) => q._ids.includes(p.id)), error: null })
        },
      }
      return b
    },
  })
  const run = async (fail) => {
    const load = createOfflineLoader({
      env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' },
      globals: { AbortSignal: { timeout: () => undefined } },
      mocks: { react: { cache: (fn) => fn }, '@supabase/supabase-js': { createClient: () => makeClient(fail) } },
    })
    return load(STATS).getEngineBenchmarkStats()
  }
  const live = await run(false)
  const seed = live.rows.find((r) => r.qualityMode === 'cinematic_ai')
  check(live.measured === true, 'leitura viva marca measured:true')
  check(seed.films === 2 && seed.people === 2, `conta interna fora: Seedance 2 filmes/2 pessoas (veio ${seed.films}/${seed.people})`)
  check(seed.medianSeconds === 45, `mediana sem o filme interno = 45 (veio ${seed.medianSeconds})`)
  check(live.totalFilms === 253, `N do título = soma dos filmes externos (veio ${live.totalFilms})`)
  const dead = await run(true)
  check(dead.measured === false && dead.totalFilms > 0, 'falha de leitura devolve FALLBACK measured:false, nunca zero')
}

// ── 6) nenhum preço digitado ────────────────────────────────────────────────────────────────────────
console.log('6) nenhum literal de preço')
for (const f of [COMP, DATA_PAGE, STATS]) {
  const src = fs.existsSync(f) ? read(f) : ''
  check(!/\$\s?\d+(?:[.,]\d{2})?\b/.test(src.replace(/\$\{/g, '')), `${f}: sem literal de preço ($9.90 etc.)`)
}

console.log(`\n═══ ${passed} passaram, ${failed} falharam ═══`)
if (failed) process.exit(1)
