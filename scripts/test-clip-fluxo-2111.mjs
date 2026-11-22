import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const load = createOfflineLoader({ mocks: { 'server-only': {} } })
const layout = load('lib/create/clipRecreateJuntos.ts')
const gallery = load('lib/create/clipWorkspace.ts')
const { clipTemplateSpecs } = load('lib/create/clipWorkspaceServer.ts')
const { formatosParaOCliente } = load('lib/recreate/catalogoServidor.ts')
const { INTERNAL_EXACT_EMAILS } = load('lib/internalAccounts.ts')
const owner = INTERNAL_EXACT_EMAILS[0]
const subscriber = 'clip-fixture@example.net'
assert.equal(layout.CLIP_WORKSPACE_RELEASE, 'off')
assert.equal(layout.clipWorkspaceVisible(owner), false)
assert.equal(layout.clipWorkspaceVisible(owner, 'internal'), true)
assert.equal(layout.clipWorkspaceVisible(subscriber, 'internal'), false)
assert.equal(layout.clipWorkspaceVisible(null, 'public'), false)
assert.equal(layout.clipWorkspaceVisible(subscriber, 'public'), true)

const formats = formatosParaOCliente(owner)
const original = formats.map(item => item.id)
assert.equal(gallery.orderClipTemplates(formats, 'latest'), formats)
const last = formats.at(-1)
assert.equal(gallery.orderClipTemplates(formats, 'trending', { [last.id]: 1 })[0], last)
assert.deepEqual(formats.map(item => item.id), original)
assert.equal(gallery.clipTemplateCategory({ id: 'passarela', title: 'Runway walk', type: 'swap' }), 'Lifestyle')
assert.equal(gallery.clipTemplateCategory({ id: 'basquete', title: 'Slam dunk', type: 'swap' }), 'Sports')
assert.equal(gallery.clipTemplateCategory({ id: 'cachorro-craque', title: 'Dog goal', type: 'swap' }), 'Pets')
const specs = clipTemplateSpecs(formats)
assert.equal(specs.basquete.model, 'Kling 4.0 Edit')
assert.equal(specs.basquete.quality, '720p')
const motion = load('lib/recreate/movimentoMoldes.ts').RECREATE_MOVIMENTO_MOLDES[0]
assert.equal(clipTemplateSpecs([motion])[motion.id].model, 'Kling 2.6 Motion Control')
assert.ok(formats.every(f => f.id !== motion.id), 'the retired motion guide does not come back through the new layout')
assert.ok(formats.every(f => specs[f.id]?.model))

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const entry = read('app/recreate/RecreateFlowPage.tsx')
const ui = read('components/create/ClipTemplateWorkspace.tsx')
const legacy = read('app/recreate/RecreateClient.tsx')
assert.match(entry, /if \(clipWorkspaceVisible\(user\.email\)\) \{[\s\S]*<ClipTemplateWorkspace[\s\S]*return <ClipRecreateJuntos/)
assert.match(entry, /const presentation = ownVideoVisible \? seuVideoPresentation\(\) : null/)
assert.doesNotMatch(ui, /fetch\(|\/api\/recreate|Objects swap|1080p/)
assert.match(ui, /<button className="rc-generate" type="button" disabled aria-describedby="cw-empty-note">Generate<\/button>/)
assert.match(ui, /gallery\.map\(\(format, index\) => rc\.cartao\?\.\(format, index\)\)/)
assert.match(legacy, /role="switch" checked=\{detailsOpen\}/)
assert.match(legacy, /setSelected\(f\); setPrompt\(f\.prompt\)/)
assert.match(legacy, /data-recreate-generate[^\n]*!photosDone\)\} onClick=\{\(\) => void generate\(false\)\}/)
console.log('Clip workspace: release, fixed engine labels, catalog order, and click-only generation verified.')
