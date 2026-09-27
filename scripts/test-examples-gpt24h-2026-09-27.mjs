import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, offlineModules, React, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
const { check, finish } = checks()
const intent = 'lib/growth/examplesSprintIntent.ts'
const src = readFileSync(resolve(root,intent),'utf8')
const load = offlineModules({ replacements: process.argv.includes('--mutant') ? { [intent]: src.replace("'gpt24h'", "'wrong-campaign'") } : {} })
const { EXAMPLES_SELECTION_SEP24 } = load('lib/ui/examplesSelectionSep24.ts')
const { examplesSprintVideo } = load(intent)
for (const video of EXAMPLES_SELECTION_SEP24) {
  const updated = examplesSprintVideo(video)
  const old = new URL(video.href,'https://www.usekineo.com'), next = new URL(updated.href,old)
  check(`${video.id}: same engine and Studio`, next.pathname === '/studio' && next.searchParams.get('engine') === old.searchParams.get('engine'))
  check(`${video.id}: attribution`, next.searchParams.get('utm_source') === 'examples' && next.searchParams.get('utm_campaign') === 'gpt24h')
  check(`${video.id}: existing intent retained`, next.searchParams.get('intent_campaign') === old.searchParams.get('intent_campaign'))
}
const unknown = { href:'/examples/some-example', engine:'static_example' }
check('unknown/static example not silently assigned an engine', examplesSprintVideo(unknown) === unknown)
const { BUSINESS_AD_EXAMPLES, businessAdWatchPath } = load('lib/growth/businessAdExamples.ts')
check('catalog uses public watch pages only', BUSINESS_AD_EXAMPLES.every(v => businessAdWatchPath(v.videoUrl)))
const component = 'app/examples/BusinessAdExamples.tsx'
const empty = offlineModules({mocks:{'lib/growth/businessAdExamples.ts':{ BUSINESS_AD_EXAMPLES:[], businessAdWatchPath }}})
check('empty array renders nothing', renderToStaticMarkup(React.createElement(empty(component).default)) === '')
check('public watch URL accepted', businessAdWatchPath('https://www.usekineo.com/v/approved-id') === '/v/approved-id')
check('external / credential / query / script URLs rejected', ['https://evil.example/v/id','https://www.usekineo.com@evil.example/v/id','/v/id?private=1','javascript:alert(1)'].every(v => businessAdWatchPath(v) === null))
const fixture = offlineModules({mocks:{ 'lib/growth/businessAdExamples.ts': { businessAdWatchPath, BUSINESS_AD_EXAMPLES: [{business:'TEST FIXTURE',segment:'Test',videoUrl:'/v/approved-id'}] }}})
const html = renderToStaticMarkup(React.createElement(fixture(component).default))
check('nonempty approved array renders section', html.includes('Business ads') && html.includes('href="/v/approved-id"'))
check('watch page never used as video src', !html.includes('<video'))
check('business CTA attribution', html.includes('utm_campaign=gpt24h'))
const page = readFileSync(resolve(root,'app/examples/page.tsx'),'utf8')
check('existing gallery CTA reused without second card CTA', page.includes('EXAMPLES_SELECTION_SEP24.map(examplesSprintVideo)') && page.includes('previewActionLabel="Make one like this"') && (page.match(/<ExamplesGallery /g)||[]).length === 1)
check('business section wired', page.includes('<BusinessAdExamples />'))
finish()
