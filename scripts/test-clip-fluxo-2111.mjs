import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const load = createOfflineLoader({ mocks: { 'server-only': {} } })
const layout = load('lib/create/clipRecreateJuntos.ts')
const gallery = load('lib/create/clipWorkspace.ts')
const { clipTemplateSpecs } = load('lib/create/clipWorkspaceServer.ts')
const { formatosParaOCliente } = load('lib/recreate/catalogoServidor.ts')
const { INTERNAL_EXACT_EMAILS } = load('lib/internalAccounts.ts')
const owner = INTERNAL_EXACT_EMAILS[0]
const subscriber = 'clip-fixture@example.net'
assert.equal(layout.CLIP_WORKSPACE_RELEASE, 'internal') // dono 22/11: aprovada pela foto; casa primeiro, depois 'public'
assert.equal(layout.clipWorkspaceVisible(owner), true)
assert.equal(layout.clipWorkspaceVisible(subscriber), false) // com 'internal' o assinante segue na tela de antes
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
const catrina = formats.find(format => format.id === 'effect-catrina')
const petCatrina = formats.find(format => format.id === 'effect-catrina-pet')
assert.equal(gallery.clipTemplateCategory(catrina), 'Effects')
assert.equal(gallery.clipTemplateCategory(petCatrina), 'Pets')
assert.equal(gallery.clipTemplateCategory({ id: 'puppy-costume', title: 'Costume', type: 'effect' }), 'Pets')
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

// Run the real cover through visibility and motion changes with controlled browser inputs.
const parsed = ts.createSourceFile('ClipTemplateWorkspace.tsx', ui, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
const coverSource = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ClipCover')
assert.ok(coverSource)
const { outputText } = ts.transpileModule(coverSource.getText(parsed) + '\nClipCover;', {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
})
const document = Object.assign(new EventTarget(), { hidden: false })
const reducedMotion = Object.assign(new EventTarget(), { matches: false })
const pendingEffects = []
const slots = []
let cursor = 0
let mounted = false
const cover = runInNewContext(outputText, {
  document, window: { matchMedia: () => reducedMotion, setInterval: () => 1, clearInterval() {} },
  publicRecreatePath: id => `/recreate/${id}`,
  useState(initial) {
    const index = cursor++
    if (!mounted) slots[index] = initial
    return [slots[index], next => { slots[index] = next }]
  },
  useEffect(effect) { if (!mounted) pendingEffects.push(effect) },
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
})
const renderCover = () => {
  cursor = 0
  const tree = cover({ formats: [{ id: 'clip' }], media: () => ({ video: '/clip.mp4', poster: '/clip.jpg' }) })
  return { media: tree.children[0].type, button: tree.children[2] }
}
const hideCover = hidden => {
  document.hidden = hidden
  document.dispatchEvent(new Event('visibilitychange'))
}
assert.equal(renderCover().media, 'img', 'no video before the browser checks motion preference')
mounted = true
for (const effect of pendingEffects) effect()
assert.equal(renderCover().media, 'video')
renderCover().button.props.onClick()
assert.equal(renderCover().media, 'img')
hideCover(true)
hideCover(false)
assert.equal(renderCover().media, 'img', 'manual pause survives switching tabs')
renderCover().button.props.onClick()
assert.equal(renderCover().media, 'video')
hideCover(true)
assert.equal(renderCover().media, 'img')
hideCover(false)
assert.equal(renderCover().media, 'video')
assert.match(entry, /if \(clipWorkspaceVisible\(user\.email\)\) \{[\s\S]*<ClipTemplateWorkspace[\s\S]*return <ClipRecreateJuntos/)
assert.match(entry, /const presentation = ownVideoVisible \? seuVideoPresentation\(\) : null/)
assert.doesNotMatch(ui, /fetch\(|\/api\/recreate|Objects swap|1080p/)
assert.match(ui, /<button className="rc-generate" type="button" disabled aria-describedby="cw-empty-note">Generate<\/button>/)
assert.match(ui, /gallery\.map\(\(format, index\) => rc\.cartao\?\.\(format, index\)\)/)
assert.match(legacy, /role="switch" checked=\{detailsOpen\}/)
assert.match(legacy, /setSelected\(f\); setPrompt\(f\.prompt\)/)
assert.match(legacy, /data-recreate-generate[^\n]*!photosDone\)\} onClick=\{\(\) => void generate\(false\)\}/)
console.log('Clip workspace: release, fixed engine labels, catalog order, and click-only generation verified.')
