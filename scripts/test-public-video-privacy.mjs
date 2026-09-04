import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (condition, message) => {
  assert.ok(condition, message)
  checks++
}

function executeTs(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  const sandbox = {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id} while executing ${file}`)
    },
    console,
    process: { env: {} },
    URL,
    URLSearchParams,
    Promise,
  }
  vm.runInNewContext(compiled, sandbox)
  return moduleBox.exports
}

const policy = executeTs('lib/publicSurfacePolicy.ts')
const seriesContinuation = executeTs('lib/seriesContinuation.ts')
check(policy.CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED === false, 'customer video surface must default OFF')
const publicExamplesModule = executeTs('lib/publicExamples.ts')
check(publicExamplesModule.PUBLIC_EXAMPLES.length === 6, 'honest examples copy must match the six static allow-listed assets')
check(publicExamplesModule.PUBLIC_ENGINE_EXAMPLES.length === 26, 'engine showcase must match the founder-confirmed static allowlist')
check(publicExamplesModule.PUBLIC_ENGINE_EXAMPLES.every((item) => item.ownershipEvidence === 'founder_confirmed_owned'), 'engine showcase must record founder ownership confirmation')
check(publicExamplesModule.PUBLIC_ENGINE_EXAMPLES.every((item) => item.ownershipVerifiedAt === '2026-08-27'), 'engine showcase must record when production ownership was verified')

// Execute the real product functions with a mocked Supabase factory. A wrong
// gate/order increments the counter (or throws), so this proves the service-role
// client is not created — it is not a regex-only test.
let publicAdminCreates = 0
const publicModule = executeTs('lib/publicVideos.ts', {
  '@supabase/supabase-js': { createClient: () => { publicAdminCreates++; throw new Error('private DB read') } },
  '@/lib/scriptParser': { stripScriptMarkers: (value) => value },
  '@/lib/publicSurfacePolicy': policy,
  '@/lib/seriesContinuation': seriesContinuation,
})
const deniedSingle = await publicModule.getPublicVideoResult('11111111-1111-4111-8111-111111111111')
const deniedList = await publicModule.listIndexablePublicVideos(10)
check(deniedSingle.status === 'missing', 'real anonymous lookup must look missing')
check(Array.isArray(deniedList) && deniedList.length === 0, 'real anonymous enumeration must be empty')
check(publicAdminCreates === 0, 'real public-video functions must not create the admin client')

const legacySeriesPrompt = 'Create the next episode in the same Short series about "AI Revolution: Are You Ready?". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.'
const legacySeriesRow = {
  id: 'legacy-series',
  title: legacySeriesPrompt,
  topic: legacySeriesPrompt,
  video_url: 'https://cdn.example.com/legacy.mp4',
  final_video_url: null,
  thumbnail_url: null,
  thumb_url: null,
  status: 'completed',
  duration: 30,
  duration_seconds: null,
  quality: null,
  created_at: '2026-09-03T20:10:00Z',
  youtube_description: null,
  hashtags: [],
}
const legacySeriesVideo = publicModule.toPublicVideo(legacySeriesRow)
check(legacySeriesVideo.title === 'AI Revolution: Are You Ready?', 'legacy /v title must expose only the recovered series subject')
check(!publicModule.isPromptScaffolding(legacySeriesVideo.title), 'legacy /v title must not expose generator scaffolding')
check(legacySeriesVideo.isIndexable === false, 'cleaning the visible legacy title must preserve noindex')
check(legacySeriesVideo.gateFailure === 'prompt scaffolding, not a script', 'legacy /v must preserve the explicit noindex reason')

const degenerateSeriesVideo = publicModule.toPublicVideo({
  ...legacySeriesRow,
  id: 'degenerate-series',
  title: 'Create the next episode in the same Short series about "5 shocking facts about". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.',
  topic: 'Create the next episode in the same Short series about "5 shocking facts about". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.',
  video_url: 'https://cdn.example.com/degenerate.mp4',
})
check(degenerateSeriesVideo.title === 'AI YouTube Short', 'degenerate legacy subject must use the safe generic title')
check(degenerateSeriesVideo.gateFailure === 'prompt scaffolding, not a script', 'degenerate fallback must preserve the explicit noindex reason')

const newSeriesPrompt = 'Topic: "The Boiling River of the Amazon". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.'
const newSeriesTitle = publicModule.resolvePublicVideoTitle(
  'Topic: "The Boiling River of the Amazon"',
  newSeriesPrompt,
  'Topic: The Boiling River of the Amazon',
)
check(newSeriesTitle.title === 'The Boiling River of the Amazon', 'topic scaffolding must normalize even when the short title alone does not match the detector')
check(newSeriesTitle.hasPromptScaffolding, 'raw topic contamination must remain classified')

const truncatedLegacyTitle = 'Create the next episode in the same Short series about "The most astonishing undercover mi'
const fullLegacyPrompt = 'Create the next episode in the same Short series about "The most astonishing undercover mission in history". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.'
const fullSeriesTitle = publicModule.resolvePublicVideoTitle(truncatedLegacyTitle, fullLegacyPrompt, truncatedLegacyTitle)
check(fullSeriesTitle.title === 'The most astonishing undercover mission in history', 'public title recovery must prefer the complete topic over its truncated title')

let wallAdminCreates = 0
const sample = {
  slug: 'founder-sample', shortTitle: 'Founder sample', videoPath: '/videos/founder.mp4', posterPath: '/videos/founder.jpg',
}
const internalEngineSample = {
  id: 'internal-fast-sample', title: 'Internal Fast sample', engine: 'fast',
  videoPath: '/previews/internal-fast.webm', posterPath: '/posters/internal-fast.jpg',
  ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-08-27',
}
const wallModule = executeTs('lib/engineWall.ts', {
  '@supabase/supabase-js': { createClient: () => { wallAdminCreates++; throw new Error('private wall read') } },
  '@/lib/publicVideos': { cleanTitleLine: (value) => value },
  '@/lib/publicExamples': { PUBLIC_EXAMPLES: [sample], PUBLIC_ENGINE_EXAMPLES: [internalEngineSample], posterWebpPath: (value) => value.replace(/\.jpg$/, '.webp') },
  '@/lib/publicSurfacePolicy': policy,
})
const staticHero = await wallModule.getEngineHero()
const staticShowcase = await wallModule.getEngineShowcase()
const staticGeneralWall = await wallModule.getEngineWall()
const deniedEngineRenders = await wallModule.getEngineRenders('cinematic_veo')
const staticTrending = await wallModule.getTrending()
const staticWall = await wallModule.getExamplesBest()
for (const [name, result] of [
  ['showcase', staticShowcase],
  ['general wall', staticGeneralWall],
]) {
  check(result.length === 1 && result[0].engine === 'static_example', `real ${name} must use only static examples`)
}
for (const [name, result] of [['hero', staticHero], ['engine showcase', staticTrending]]) {
  check(result.length === 1 && result[0].id === internalEngineSample.id, `real ${name} must use only the founder-confirmed engine allowlist`)
  check(result[0].publicSource === 'founder_owned_engine_example', `real ${name} must explain why the static engine asset is public`)
  check(result[0].href && !result[0].href.startsWith('/v/'), `real ${name} must never manufacture a customer watch URL`)
}
check(deniedEngineRenders.length === 0, 'engine-specific pages must not misattribute a generic static sample')
check(staticWall.length === 1 && staticWall[0].href === '/examples/founder-sample', 'real examples wall must use static assets')
check(staticWall[0].posterUrl === '/videos/founder.webp', 'static wall must use its repository-owned poster')
check(wallAdminCreates === 0, 'real engine-wall functions must not create the admin client')

const publicVideos = read('lib/publicVideos.ts')
const singleBlock = publicVideos.slice(
  publicVideos.indexOf('export async function getPublicVideoResult'),
  publicVideos.indexOf('export async function getPublicVideo(', publicVideos.indexOf('export async function getPublicVideoResult')),
)
check(singleBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)'), 'single lookup must use the central gate')
check(singleBlock.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)') < singleBlock.indexOf('adminClient()'), 'single gate must run before admin client creation')

const listBlock = publicVideos.slice(publicVideos.indexOf('export async function listIndexablePublicVideos'))
check(listBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)'), 'enumeration must use the central gate')
check(listBlock.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)') < listBlock.indexOf('const admin = adminClient()'), 'list gate must run before admin client creation')

const page = read('app/v/[id]/page.tsx')
check(page.includes("export const dynamic = 'force-dynamic'"), '/v must not share ISR output across sessions')
check(page.includes('export const revalidate = 0'), '/v revalidation must be disabled')
check(page.indexOf('getPublicVideoResult(params.id)') < page.indexOf("if (result.status === 'missing') notFound()"), '/v must hard-404 the denied result')

const og = read('app/v/[id]/opengraph-image.tsx')
check(og.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) notFound()'), 'OG route must share the privacy gate')
check(og.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) notFound()') < og.indexOf('const title = await getTitle'), 'OG gate must run before its service-role lookup')
check(og.includes("import { resolvePublicVideoTitle } from '@/lib/publicVideos'"), 'OG bitmap must share the public title resolver')
check(og.includes('resolvePublicVideoTitle(rawTitle, rawTopic, rawTitle || rawTopic).title'), 'OG bitmap must recover the subject before rendering text')

const engineWall = read('lib/engineWall.ts')
const wallBlock = engineWall.slice(engineWall.indexOf('async function buildWall'))
check(wallBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []'), 'engine wall must be empty while customer surfaces are off')
check(wallBlock.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []') < wallBlock.indexOf('createAdminClient('), 'engine wall gate must run before admin client creation')
const bestBlock = engineWall.slice(engineWall.indexOf('export async function getExamplesBest'), engineWall.indexOf('export async function getTrending'))
check(bestBlock.includes('return staticExampleWall()'), '/examples must fall back to repository-owned static assets')
check(engineWall.includes("href: `/examples/${example.slug}`"), 'static examples must link to static example routes')
for (const wrapper of ['getEngineShowcase', 'getEngineWall']) {
  const start = engineWall.indexOf(`${wrapper}(`)
  const end = engineWall.indexOf('\n}', start)
  check(engineWall.slice(start, end).includes('staticExampleWall()'), `${wrapper} must preserve static public proof`)
}
for (const wrapper of ['getEngineHero', 'getTrending']) {
  const start = engineWall.indexOf(`${wrapper}(`)
  const end = engineWall.indexOf('\n}', start)
  check(engineWall.slice(start, end).includes('repositoryOwnedEngineWall('), `${wrapper} must use only the explicit founder-confirmed engine allowlist`)
}
check(engineWall.includes('PUBLIC_ENGINE_EXAMPLES'), 'engine wall must consume the canonical founder-confirmed allowlist')
check(!engineWall.includes("PUBLIC_EXAMPLES.slice(0, 4)"), 'generic examples must never be relabeled as Kineo 1')
const engineRendersStart = engineWall.indexOf('getEngineRenders(')
const engineRendersEnd = engineWall.indexOf('const caps:', engineRendersStart)
check(engineWall.slice(engineRendersStart, engineRendersEnd).includes('return Promise.resolve([])'), 'engine-specific gallery must stay empty while sharing is off')
const examplesPage = read('app/examples/page.tsx')
check(examplesPage.includes('Six Kineo-owned demo previews'), '/examples copy must describe the static inventory honestly')
check(examplesPage.includes('Customer videos stay private'), '/examples must state the customer privacy boundary')

const landing = read('app/KineoLanding.tsx')
check(landing.includes("engineWall.filter((v) => v.engine === 'static_example')"), 'home hero must render static examples without engine attribution')
check(landing.includes("? 'Made with Kineo — every engine'"), 'verified internal engine samples must be labeled as a static Kineo showcase')
check(landing.includes("? 'Kineo-owned examples'"), 'generic static fallback must be labeled as Kineo-owned examples')
const cycleCard = read('components/EngineCycleCard.tsx')
check(cycleCard.includes('href={v.href ?? meta.href}'), 'hero static samples must use their explicit safe destination')
check(cycleCard.includes('v.posterUrl ?? POSTER[v.engine]'), 'hero static samples must keep a local poster')
const trendingRow = read('components/TrendingRow.tsx')
check(trendingRow.includes('href={v.href ?? `/v/${v.id}`}'), 'trending static samples must use their explicit safe destination')

const videoShare = read('lib/videoShare.ts')
check(videoShare.includes('PUBLIC_VIDEO_SHARING_ENABLED = false'), 'public share URL factory must be disabled')
check(videoShare.indexOf('if (!PUBLIC_VIDEO_SHARING_ENABLED) return null') < videoShare.indexOf("const id = (videoId ?? '').trim()"), 'share helper must stop before using a persistent video id')

for (const file of [
  'app/(dashboard)/history/HistoryClient.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
]) {
  const source = read(file)
  check(source.includes('PUBLIC_VIDEO_SHARING_ENABLED'), `${file} must consume the central sharing flag`)
  check(source.includes('Public watch links are temporarily paused'), `${file} must explain the paused public link`)
  check(source.includes('explicit visibility choice'), `${file} must explain the privacy reason`)
}

const generateClient = read('app/(dashboard)/generate/GenerateClient.tsx')
const realShareCard = generateClient.indexOf('ref={sharePromptRef}')
const disabledShareState = generateClient.indexOf('data-public-sharing-state="disabled"')
check(realShareCard > 0 && disabledShareState > realShareCard, 'post-render share card must own the disabled privacy state')
const referralFetch = generateClient.indexOf("fetch('/api/referral'")
const referralPreload = generateClient.slice(Math.max(0, referralFetch - 700), referralFetch + 100)
check(referralFetch > 0 && referralPreload.includes("phase !== 'done'"), 'private referral preload must wait for a finished video')
check(referralPreload.includes('private MP4 file'), 'private referral preload must not imply a public customer-video URL')
const hookBlock = generateClient.slice(generateClient.indexOf('{analysis.hook && ('), generateClient.indexOf('{analysis.hook && (') + 700)
check(hookBlock.includes('Hook') && !hookBlock.includes('PUBLIC_VIDEO_SHARING_ENABLED'), 'video-analysis Hook UI must remain unrelated to sharing policy')

const readyEmail = read('app/api/cron/send-video-ready/route.ts')
check(!readyEmail.includes('${APP_URL}/v/${video.id}'), 'lifecycle email must not manufacture a public customer URL')
check(readyEmail.includes('private by default'), 'lifecycle email must state the current delivery contract')

const sitemap = read('app/video-sitemap.xml/route.ts')
check(sitemap.includes('PUBLIC_EXAMPLES'), 'video sitemap must retain static examples')
check(publicVideos.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []'), 'dynamic sitemap source must resolve empty')

const indexNow = read('app/api/cron/submit-indexnow/route.ts')
check(indexNow.includes("skipped: 'no new indexable videos in window'"), 'IndexNow must no-op when the gated list is empty')

const scriptLibrary = read('lib/scriptLibrary.ts')
check(scriptLibrary.includes('listIndexablePublicVideos(LIBRARY_FETCH_LIMIT)'), 'script library must use the gated canonical list')

const scriptsHub = read('app/scripts/page.tsx')
check(scriptsHub.includes('metadata: Metadata = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED ?'), 'script hub metadata must follow the privacy policy')
check(scriptsHub.includes('data-customer-script-library="private"'), 'script hub must render an honest private state')
check(scriptsHub.includes('Customer videos and scripts are not published'), 'script hub must not promise publication of customer work')
check(scriptsHub.includes('robots: { index: false'), 'private script hub must be noindex')
const scriptVertical = read('app/scripts/[vertical]/page.tsx')
// KINEO-SPACE-INTENT-2026-08-29 added one founder-authored static answer at
// /scripts/space. It contains no customer row and deliberately survives the
// customer-library gate. The old assertion required every vertical to redirect
// and became stale; lock the exact bounded exception instead.
check(scriptVertical.includes("const isStaticSpaceAnswer = v.slug === 'space'"), 'script verticals must name the only static editorial exception')
check(scriptVertical.includes("if (!customerLibraryEnabled && !isStaticSpaceAnswer) redirect('/scripts')"), 'private customer-script verticals must still redirect to the honest hub')
check(scriptVertical.includes('const lib = customerLibraryEnabled ? await getScriptLibrary() : null'), 'static answer must skip the customer-library loader while the gate is off')
const sitemapRoute = read('app/sitemap.ts')
check(sitemapRoute.includes("const publicScriptShelfSlugs = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED ? SCRIPT_VERTICAL_SLUGS : ['space']"), 'private customer shelves must leave the sitemap while the one static answer remains')
check(sitemapRoute.includes('const scriptShelfEntries = publicScriptShelfSlugs.map'), 'sitemap must enumerate only the gated shelf allowlist')
check(
  /\.\.\.\(CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED\s*\?\s*\[\{ path: '\/scripts'[\s\S]*?\}\]\s*:\s*\[\]\)/.test(sitemapRoute),
  'private script hub must leave the sitemap',
)

console.log(`public-video-privacy: ${checks}/${checks} checks passed`)
