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
check(policy.CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED === false, 'customer video surface must default OFF')
const publicExamplesModule = executeTs('lib/publicExamples.ts')
check(publicExamplesModule.PUBLIC_EXAMPLES.length === 6, 'honest examples copy must match the six static allow-listed assets')

// Execute the real product functions with a mocked Supabase factory. A wrong
// gate/order increments the counter (or throws), so this proves the service-role
// client is not created — it is not a regex-only test.
let publicAdminCreates = 0
const publicModule = executeTs('lib/publicVideos.ts', {
  '@supabase/supabase-js': { createClient: () => { publicAdminCreates++; throw new Error('private DB read') } },
  '@/lib/scriptParser': { stripScriptMarkers: (value) => value },
  '@/lib/publicSurfacePolicy': policy,
})
const deniedSingle = await publicModule.getPublicVideoResult('11111111-1111-4111-8111-111111111111')
const deniedList = await publicModule.listIndexablePublicVideos(10)
check(deniedSingle.status === 'missing', 'real anonymous lookup must look missing')
check(Array.isArray(deniedList) && deniedList.length === 0, 'real anonymous enumeration must be empty')
check(publicAdminCreates === 0, 'real public-video functions must not create the admin client')

let wallAdminCreates = 0
const sample = {
  slug: 'founder-sample', shortTitle: 'Founder sample', videoPath: '/videos/founder.mp4', posterPath: '/videos/founder.jpg',
}
const wallModule = executeTs('lib/engineWall.ts', {
  '@supabase/supabase-js': { createClient: () => { wallAdminCreates++; throw new Error('private wall read') } },
  '@/lib/publicVideos': { cleanTitleLine: (value) => value },
  '@/lib/publicExamples': { PUBLIC_EXAMPLES: [sample], posterWebpPath: (value) => value.replace(/\.jpg$/, '.webp') },
  '@/lib/publicSurfacePolicy': policy,
})
const staticHero = await wallModule.getEngineHero()
const staticShowcase = await wallModule.getEngineShowcase()
const staticGeneralWall = await wallModule.getEngineWall()
const deniedEngineRenders = await wallModule.getEngineRenders('cinematic_veo')
const staticTrending = await wallModule.getTrending()
const staticWall = await wallModule.getExamplesBest()
for (const [name, result] of [
  ['hero', staticHero],
  ['showcase', staticShowcase],
  ['general wall', staticGeneralWall],
  ['trending', staticTrending],
]) {
  check(result.length === 1 && result[0].engine === 'static_example', `real ${name} must use only static examples`)
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

const engineWall = read('lib/engineWall.ts')
const wallBlock = engineWall.slice(engineWall.indexOf('async function buildWall'))
check(wallBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []'), 'engine wall must be empty while customer surfaces are off')
check(wallBlock.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []') < wallBlock.indexOf('createAdminClient('), 'engine wall gate must run before admin client creation')
const bestBlock = engineWall.slice(engineWall.indexOf('export async function getExamplesBest'), engineWall.indexOf('export async function getTrending'))
check(bestBlock.includes('return staticExampleWall()'), '/examples must fall back to repository-owned static assets')
check(engineWall.includes("href: `/examples/${example.slug}`"), 'static examples must link to static example routes')
for (const wrapper of ['getEngineHero', 'getEngineShowcase', 'getEngineWall', 'getTrending']) {
  const start = engineWall.indexOf(`${wrapper}(`)
  const end = engineWall.indexOf('\n}', start)
  check(engineWall.slice(start, end).includes('staticExampleWall()'), `${wrapper} must preserve static public proof`)
}
const engineRendersStart = engineWall.indexOf('getEngineRenders(')
const engineRendersEnd = engineWall.indexOf('const caps:', engineRendersStart)
check(engineWall.slice(engineRendersStart, engineRendersEnd).includes('return Promise.resolve([])'), 'engine-specific gallery must stay empty while sharing is off')
const examplesPage = read('app/examples/page.tsx')
check(examplesPage.includes('Six Kineo-owned demo previews'), '/examples copy must describe the static inventory honestly')
check(examplesPage.includes('Customer videos stay private'), '/examples must state the customer privacy boundary')

const landing = read('app/KineoLanding.tsx')
check(landing.includes("engineWall.filter((v) => v.engine === 'static_example')"), 'home hero must render static examples without engine attribution')
check(landing.includes("'Kineo-owned examples' : 'Trending now'"), 'home must not label the static fallback as live trending')
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
const referralGate = generateClient.lastIndexOf('if (!PUBLIC_VIDEO_SHARING_ENABLED) return', referralFetch)
check(referralGate > 0 && referralGate < referralFetch, 'referral preload must stop while public sharing is disabled')
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
check(scriptVertical.includes("if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) redirect('/scripts')"), 'private script verticals must redirect to the honest hub')
const sitemapRoute = read('app/sitemap.ts')
check(sitemapRoute.includes('CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED ? SCRIPT_VERTICAL_SLUGS.map'), 'private script shelves must leave the sitemap')
check(
  /\.\.\.\(CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED\s*\?\s*\[\{ path: '\/scripts'[\s\S]*?\}\]\s*:\s*\[\]\)/.test(sitemapRoute),
  'private script hub must leave the sitemap',
)

console.log(`public-video-privacy: ${checks}/${checks} checks passed`)
