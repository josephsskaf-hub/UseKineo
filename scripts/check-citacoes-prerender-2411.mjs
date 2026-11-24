import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { offlineModules, root, source } from './gpt24h-offline-support.mjs'

const ts = createRequire(import.meta.url)('typescript')
const intentFile = 'app/ai-video-generator/for/[slug]/page.tsx'
const prefix = '/ai-video-generator/for/'
const dynamicRoute = prefix + '[slug]'
const privatePrefix = '/internal/citation-formats'
const releaseFile = 'lib/growth/citationPagesRelease.ts'
const release = process.argv[3] ?? 'off'
assert.ok(['off', 'internal', 'public'].includes(release), 'Pass off, internal or public as the build release mode')

const buildDir = resolve(process.argv[2] ?? join(root, '.next'))
const manifestPath = join(buildDir, 'prerender-manifest.json')
assert.ok(existsSync(manifestPath), 'Run next build before checking the prerender-manifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const manifestMarkup = readFileSync(join(buildDir, 'server/app', prefix, 'story-videos.html'), 'utf8')
const releaseSource = source(releaseFile)
const releaseOverride = releaseSource.replace(/(CITATION_PAGES_RELEASE: CitationPagesRelease = )'(?:off|internal|public)'/, '$1' + "'" + release + "'")
const loader = offlineModules({ replacements: { [releaseFile]: releaseOverride } })
const { INTENT_SLUGS } = loader('lib/seo/intentPages.ts')
const { CITATION_DRAFT_SLUGS } = loader(releaseFile)
const { STORY_VIDEO_ENGINE } = loader('lib/growth/storyVideoPage.ts')
const { STARTER_MONTH, STARTER_CREDITS, creditsPerReferenceVideo } = loader('lib/marketingPrice.ts')
const expectedRoutes = Array.from(INTENT_SLUGS, slug => prefix + slug).sort()
assert.equal(expectedRoutes.length, release === 'public' ? 132 : 129, 'Known intent catalog size')
const storyIntro = 'Kineo turns an idea or a narration script into a vertical story with generated scenes, voice, captions and music using ' + STORY_VIDEO_ENGINE + '. A 60-second story costs ' + creditsPerReferenceVideo('cinematic_ai') + ' credits, with paid plans starting at ' + STARTER_MONTH + ' for ' + STARTER_CREDITS + ' monthly credits.'

function verifyConfig(text) {
  const ast = ts.createSourceFile(intentFile, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const values = new Map()
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(node => node.kind === ts.SyntaxKind.ExportKeyword)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) values.set(declaration.name.text, declaration.initializer)
    }
  }
  const dynamic = values.get('dynamic')
  assert.ok(dynamic && ts.isStringLiteral(dynamic) && dynamic.text === 'force-static', 'Published intent route must export force-static')
  assert.equal(values.get('dynamicParams')?.kind, ts.SyntaxKind.FalseKeyword, 'Published intent route must close unbuilt paths')
}

function verifyManifest(data) {
  const actual = Object.entries(data.routes)
    .filter(([url, info]) => url.startsWith(prefix) || info.srcRoute === dynamicRoute)
    .map(([url]) => url)
    .sort()
  assert.deepEqual(actual, expectedRoutes, 'Exact published intent routes must be present in prerender-manifest')
  assert.ok(expectedRoutes.every(url => data.routes[url].initialRevalidateSeconds === false), 'Intent pages must remain static without per-request regeneration')
  assert.equal(data.dynamicRoutes[dynamicRoute]?.fallback, false, 'Unknown intent slugs have no dynamic fallback')
  assert.ok(!Object.keys(data.routes).some(url => url.startsWith(privatePrefix)), 'Private preview is absent from prerendered routes')
  for (const slug of CITATION_DRAFT_SLUGS) {
    assert.equal(Object.hasOwn(data.routes, prefix + slug), release === 'public', 'Only public mode prerenders drafts')
  }
}

function verifyStory(html) {
  const normalized = html.replace(/<!--[\s\S]*?-->/g, '').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&')
  const paragraphs = [...normalized.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(match => match[1])
  assert.equal(paragraphs.filter(text => text === storyIntro).length, 1, 'Exact cited story-videos introduction remains visible once')
}

const routeSource = source(intentFile)
verifyConfig(routeSource)
verifyManifest(manifest)
verifyStory(manifestMarkup)

const mutantRoute = routeSource.replace("export const dynamic = 'force-static'", "export const dynamic = 'force-dynamic'")
assert.notEqual(mutantRoute, routeSource, 'Force-dynamic mutation applied')
assert.throws(() => verifyConfig(mutantRoute), /must export force-static/)
const missing = { ...manifest, routes: { ...manifest.routes } }
delete missing.routes[prefix + 'urdu']
assert.throws(() => verifyManifest(missing), /Exact published intent routes/)
const mutatedStory = manifestMarkup.replace('Kineo turns an idea or a narration script into a vertical story', 'Kineo edits pre-recorded clips')
assert.notEqual(mutatedStory, manifestMarkup, 'Story mutation applied in built HTML')
assert.throws(() => verifyStory(mutatedStory), /Exact cited story-videos introduction/)
console.log('PASS ' + release + ': ' + expectedRoutes.length + ' routes, closed fallback and cited story intro. Mutants rejected: force-dynamic, missing prerender, rewritten story intro.')
