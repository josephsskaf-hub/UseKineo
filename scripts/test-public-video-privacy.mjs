import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (condition, message) => {
  assert.ok(condition, message)
  checks++
}

function executeTs(file, mocks = {}, source = read(file), env = {}) {
  const compiled = ts.transpileModule(source, {
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
    process: { env },
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
const frozenExamples = executeTs('lib/publicExamples.ts', {}, execFileSync('git', ['show', '68c65670:lib/publicExamples.ts'], { encoding: 'utf8' }))
for (const key of ['PUBLIC_EXAMPLES', 'PUBLIC_ENGINE_EXAMPLES', 'FOUNDER_SHOWCASE', 'ENGINE_PAGE_LEAD']) {
  check(JSON.stringify(publicExamplesModule[key]) === JSON.stringify(frozenExamples[key]), `${key} exactly matches the immutable approved static ownership inventory`)
}
check(publicExamplesModule.PUBLIC_ENGINE_EXAMPLES.every((item) => item.ownershipEvidence === 'founder_confirmed_owned'), 'engine showcase must record founder ownership confirmation')
check(publicExamplesModule.PUBLIC_ENGINE_EXAMPLES.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.ownershipVerifiedAt)), 'each approved engine asset records its own ownership verification date')
check(!policy.publicSurfaceAllowsRow(null) && !policy.publicSurfaceAllowsRow('  ') && policy.publicSurfaceAllowsRow('2026-09-07T12:00:00Z'), 'row consent is explicit and the global flag stays closed')

// Exercise real service-role readers with fake credentials and a faithful in-memory query.
// Completed is never consent: public columns are read only after a separate publication check.
function publicWorld(rows, options = {}, source = read('lib/publicVideos.ts')) {
  const state = { creates: 0, queries: [] }
  const api = executeTs('lib/publicVideos.ts', {
    '@supabase/supabase-js': { createClient: () => {
      state.creates++
      return { from(table) {
        assert.equal(table, 'videos')
        let columns = '', predicates = [], maximum = Infinity
        const query = {
          select(value) { columns = value; return query },
          eq(key, value) { predicates.push(row => row[key] === value); return query },
          not(key, operator, value) { assert.equal(operator, 'is'); assert.equal(value, null); predicates.push(row => row[key] != null); return query },
          order() { return query }, limit(value) { maximum = value; return query },
          async run(single = false) {
            state.queries.push(columns)
            if (options.throwRead) throw Error('offline read failed')
            if (options.readError) return { data: null, error: { code: 'XX000' } }
            const selected = rows.filter(row => predicates.every(test => test(row))).slice(0, maximum)
              .map(row => Object.fromEntries(columns.split(',').map(key => [key.trim(), row[key.trim()]])))
            return single ? { data: selected[0] ?? null, error: selected.length ? null : { code: 'PGRST116' } } : { data: selected, error: null }
          },
          single() { return query.run(true) },
          then(resolve, reject) { return query.run().then(resolve, reject) },
        }
        return query
      } }
    } },
    '@/lib/scriptParser': { stripScriptMarkers: value => value },
    '@/lib/publicSurfacePolicy': policy, '@/lib/seriesContinuation': seriesContinuation,
  }, source, { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE_FIXTURE' })
  return { api, state }
}
const PRIVATE_ID = '11111111-1111-4111-8111-111111111111'
const PUBLIC_ID = '22222222-2222-4222-8222-222222222222'
const publicationRow = {
  id: PRIVATE_ID, title: 'How an ancient bridge survived its first winter',
  topic: Array.from({ length: 70 }, (_, i) => `bridge${i}`).join(' '), status: 'completed',
  video_url: 'https://www.usekineo.com/videos/fixture.mp4', duration: 35, quality: 'cinematic_ai',
  created_at: '2026-09-07T12:00:00Z', hashtags: [], published_at: null,
}
const publishedRow = { ...publicationRow, id: PUBLIC_ID, published_at: '2026-09-07T12:00:00Z' }
const world = publicWorld([publicationRow, publishedRow, { ...publishedRow, id: '33333333-3333-4333-8333-333333333333', topic: 'Too short', title: 'Too short' }])
const publicModule = world.api
check((await publicModule.getPublicVideoResult('bad-id')).status === 'missing' && world.state.creates === 0, 'invalid UUID is rejected before admin creation')
const deniedSingle = await publicModule.getPublicVideoResult(PRIVATE_ID)
check(deniedSingle.status === 'missing', 'completed row without publication consent looks missing')
check(world.state.queries.join(',') === 'published_at', 'denied lookup reads only the consent column')
const allowedSingle = await publicModule.getPublicVideoResult(PUBLIC_ID)
check(allowedSingle.status === 'ok' && allowedSingle.video.id === PUBLIC_ID, 'explicitly published row is readable')
check(world.state.queries.slice(-2).join('|') === `published_at|${publicModule.PUBLIC_VIDEO_COLUMNS}`, 'consent check precedes the exact public column allowlist')
const allowedList = await publicModule.listIndexablePublicVideos(10)
check(allowedList.length === 1 && allowedList[0].id === PUBLIC_ID, 'enumeration excludes private rows and consented rows that fail quality')
publishedRow.published_at = null
check((await publicModule.getPublicVideoResult(PUBLIC_ID)).status === 'missing' && (await publicModule.listIndexablePublicVideos(10)).length === 0, 'revoking row consent closes lookup and enumeration again')
for (const failure of [{ readError: true }, { throwRead: true }]) {
  const failed = publicWorld([publishedRow], failure)
  check((await failed.api.getPublicVideoResult(PUBLIC_ID)).status === 'unavailable', 'unconfirmed consent never exposes a video during read failures')
  check((await failed.api.listIndexablePublicVideos(10)).length === 0, 'failed enumeration returns no customer rows')
}
const privacySource = read('lib/publicVideos.ts')
const noConsent = privacySource.replace('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) {', 'if (false) {')
check(noConsent !== privacySource && (await publicWorld([publicationRow], {}, noConsent).api.getPublicVideoResult(PRIVATE_ID)).status === 'ok', 'control mutation demonstrates the private-row denial catches a removed consent gate')
const noListFilter = privacySource.replace("if (!global) query = query.not('published_at', 'is', null)", '')
check(noListFilter !== privacySource && (await publicWorld([publicationRow], {}, noListFilter).api.listIndexablePublicVideos(10)).some(video => video.id === PRIVATE_ID), 'control mutation demonstrates enumeration catches a removed consent filter')

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
  id: 'internal-engine-sample', title: 'Internal engine sample', engine: 'cinematic_ai',
  videoPath: '/previews/internal-fast.webm', posterPath: '/posters/internal-fast.jpg',
  ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-08-27',
}
const founderSample = { id: 'founder-showcase-sample', title: 'Founder showcase sample', engine: 'cinematic_ai', previewPath: '/previews/founder.mp4', posterPath: '/posters/founder.webp' }
const wallModule = executeTs('lib/engineWall.ts', {
  '@supabase/supabase-js': { createClient: () => { wallAdminCreates++; throw new Error('private wall read') } },
  '@/lib/publicVideos': { cleanTitleLine: (value) => value },
  '@/lib/publicExamples': { PUBLIC_EXAMPLES: [sample], PUBLIC_ENGINE_EXAMPLES: [internalEngineSample], FOUNDER_SHOWCASE: [founderSample], ENGINE_PAGE_LEAD: [founderSample], posterWebpPath: (value) => value.replace(/\.jpg$/, '.webp') },
  '@/lib/homeVideoCuration': { HOME_ENGINE_EXAMPLES: [internalEngineSample] },
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
const genericWallExample = staticWall.find(video => video.engine === 'static_example')
check(staticWall.length === 2 && genericWallExample?.href === '/examples/founder-sample' && staticWall.some(video => video.id === founderSample.id && video.publicSource === 'founder_owned_engine_example'), 'real examples wall contains only approved founder showcase and generic static assets')
check(genericWallExample?.posterUrl === '/videos/founder.webp', 'static wall must use its repository-owned poster')
check(wallAdminCreates === 0, 'real engine-wall functions must not create the admin client')

const publicVideos = read('lib/publicVideos.ts')
const singleBlock = publicVideos.slice(
  publicVideos.indexOf('export async function getPublicVideoResult'),
  publicVideos.indexOf('export async function getPublicVideo(', publicVideos.indexOf('export async function getPublicVideoResult')),
)
check(singleBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)'), 'single lookup must use the central gate')
check(singleBlock.indexOf(".select('published_at')") < singleBlock.indexOf('.select(PUBLIC_VIDEO_COLUMNS)'), 'single-row consent lookup precedes reading any public video columns')

const listBlock = publicVideos.slice(publicVideos.indexOf('export async function listIndexablePublicVideos'))
check(listBlock.includes('const global = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean'), 'enumeration consumes the central gate')
check(listBlock.includes("if (!global) query = query.not('published_at', 'is', null)"), 'closed global gate filters enumeration by explicit row consent in the database')

const page = read('app/v/[id]/page.tsx')
check(page.includes("export const dynamic = 'force-dynamic'"), '/v must not share ISR output across sessions')
check(page.includes('export const revalidate = 0'), '/v revalidation must be disabled')
check(page.indexOf('getPublicVideoResult(params.id)') < page.indexOf("if (result.status === 'missing') notFound()"), '/v must hard-404 the denied result')

const og = read('app/v/[id]/opengraph-image.tsx')
check(og.includes('if (!publicSurfaceAllowsRow(row.publishedAt)) notFound()'), 'OG route must share the explicit row-consent policy')
check(og.indexOf('if (!publicSurfaceAllowsRow(row.publishedAt)) notFound()') < og.indexOf('const title = row.title'), 'OG consent gate runs before preparing any public title bitmap')
check(og.includes("import { resolvePublicVideoTitle } from '@/lib/publicVideos'"), 'OG bitmap must share the public title resolver')
check(og.includes('resolvePublicVideoTitle(rawTitle, rawTopic, rawTitle || rawTopic).title'), 'OG bitmap must recover the subject before rendering text')

const engineWall = read('lib/engineWall.ts')
const wallBlock = engineWall.slice(engineWall.indexOf('async function buildWall'))
check(wallBlock.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []'), 'engine wall must be empty while customer surfaces are off')
check(wallBlock.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []') < wallBlock.indexOf('createAdminClient('), 'engine wall gate must run before admin client creation')
const bestBlock = engineWall.slice(engineWall.indexOf('export async function getExamplesBest'), engineWall.indexOf('export async function getTrending'))
check(bestBlock.includes('return [...founderShowcaseWall(), ...staticExampleWall()]'), '/examples combines only the two explicit founder-owned static inventories')
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
check(examplesPage.includes('EXAMPLES_SELECTION_SEP24.map(examplesSprintVideo)'), '/examples uses the explicit founder-selected static inventory')
const selectionFile = 'lib/ui/examplesSelectionSep24.ts'
check(read(selectionFile).replace(/\r\n/g, '\n') === execFileSync('git', ['show', `68c65670:${selectionFile}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n'), 'the exact founder-selected examples and their ownership-safe destinations remain frozen')
check(!examplesPage.includes('listIndexablePublicVideos(') && !examplesPage.includes(".from('videos')"), '/examples does not enumerate customer videos')

const landing = read('app/KineoLanding.tsx')
check(landing.includes("trending.every((v) => v.publicSource === 'founder_owned_engine_example')") && landing.includes("trending.some((v) => v.engine === 'static_example')"), 'home showcase labels distinguish verified engine assets from generic static examples')
check(landing.includes("? 'Made with Kineo — every engine'"), 'verified internal engine samples must be labeled as a static Kineo showcase')
check(landing.includes("? 'Kineo-owned examples'"), 'generic static fallback must be labeled as Kineo-owned examples')
const cycleCard = read('components/EngineCycleCard.tsx')
check(cycleCard.includes('href={v.href ?? meta.href}'), 'hero static samples must use their explicit safe destination')
const heroFrame = executeTs('lib/ui/heroFrame.ts', { './heroOpening': { heroOpeningPoster: () => null } })
check(cycleCard.includes('const frame = heroFrame(v)') && cycleCard.includes('frame.poster ?? POSTER[v.engine]') && heroFrame.heroFrame({ ...internalEngineSample, posterUrl: internalEngineSample.posterPath }).poster === internalEngineSample.posterPath, 'hero static samples preserve an explicitly supplied local poster through the frame helper')
const trendingRow = read('components/TrendingRow.tsx')
check(trendingRow.includes('video.href && <Link') && trendingRow.includes('href={video.href}') && !trendingRow.includes('`/v/${'), 'trending static samples use only their explicit safe destination')

const videoShare = read('lib/videoShare.ts')
check(videoShare.includes('PUBLIC_VIDEO_SHARING_ENABLED = false'), 'public share URL factory must be disabled')
check(videoShare.indexOf('if (!PUBLIC_VIDEO_SHARING_ENABLED) return null') < videoShare.indexOf('return buildPublishedVideoSharePath(videoId, referralCode)'), 'unconfirmed share helper stops before delegating to the explicit published-row path')
const sharePolicy = executeTs('lib/videoShare.ts')
check(sharePolicy.buildPublicVideoSharePath(PUBLIC_ID) === null && sharePolicy.buildPublishedVideoSharePath(PUBLIC_ID).startsWith(`/v/${PUBLIC_ID}?`), 'legacy callers stay closed while explicit publication has a distinct URL builder')

for (const file of [
  'app/(dashboard)/history/HistoryClient.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
]) {
  const source = read(file)
  check(source.includes('PUBLIC_VIDEO_SHARING_ENABLED'), `${file} must consume the central sharing flag`)
  check(source.includes('Public watch links are temporarily paused'), `${file} must explain the paused public link`)
  check(file.includes('/history/') ? source.includes('explicit visibility choice') : source.includes('(PUBLIC_VIDEO_SHARING_ENABLED || publicPagePublished)'), `${file} requires an explicit publication decision before exposing a public watch link`)
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
check(publicVideos.includes("if (!global) query = query.not('published_at', 'is', null)"), 'dynamic sitemap source includes only rows with explicit publication consent while the global gate is closed')

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
