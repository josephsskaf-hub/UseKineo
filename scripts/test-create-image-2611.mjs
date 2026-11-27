// Offline React mount. The browser receipt independently exercises IndexedDB and restores the photo pixels.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { aba, React } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const requests = []
let draft
const fixture = {
  'lib/create/visitorMediaDraft.ts': 'export const saveMediaDraft = globalThis.imageTest.save; export const readMediaDraft = globalThis.imageTest.read',
  'components/InterfaceLanguage.tsx': 'export const useUiCopy = () => x => x; export const UiLabel = p => p.children',
  'components/create/ContagemSocial.tsx': 'export default () => null',
  'components/premiere/Premiere.tsx': 'export const usePremiereBeacon = () => {}; export const PremiereStage = () => null; export const PremiereResult = () => null',
}
globalThis.imageTest = {
  save: async (surface, fields, photos) => { assert.equal(surface, 'image'); draft = { fields, photos }; return '/signup?redirect=opaque' },
  read: async surface => { assert.equal(surface, 'image'); return draft },
}
async function mount(props) {
  const tab = aba(fixture)
  window.location = { search: '?engine=schnell', assign: href => requests.push(href) }
  document.documentElement = { dataset: {} }
  globalThis.fetch = async (url, init) => {
    if (init?.method === 'POST') requests.push([url, JSON.parse(init.body)])
    return { ok: true, json: async () => url === '/api/images/generate' ? { url: '/synthetic.webp', id: 'synthetic' } : { images: [], credits: 17 } }
  }
  const Editor = tab.m('app/(dashboard)/images/ImagesClient.tsx').default
  tab.mount(React.createElement(Editor, { publicEditor: true, ...props }))
  await tab.settle()
  return tab
}
const gen = p => p['data-testid'] === 'image-generate'
const field = p => p.id === 'cx-ideia'
let tab = await mount({ visitor: true })
const { IMG_ENGINES, imageCreditCost } = tab.m('lib/imageModels')
function choose(chip, label) {
  tab.click(p => p['data-cx-chip'] === chip, chip)
  tab.click((p, t) => t === 'button' && (p.children === label || p.children?.[0] === label), label)
}
tab.type(field, ' A lighthouse & a bird. ', 'idea')
for (const engine of IMG_ENGINES) {
  choose('engine', engine.name)
  assert.equal(tab.one(p => p.className === 'cx-custo', 'cost').props['aria-label'], imageCreditCost(engine.key) + ' credits')
}
choose('format', '□ 1:1 · Square')
assert.deepEqual(requests, [])
tab.click(gen, 'visitor Generate')
await tab.settle()
assert.deepEqual(requests, ['/signup?redirect=opaque'])
tab = await mount({ visitor: false, restoring: true })
assert.equal(tab.one(field, 'restored text').props.value, ' A lighthouse & a bird. ')
assert.equal(tab.one(p => p['data-cx-chip'] === 'engine', 'engine').props['aria-label'], 'Engine: Nano Banana Pro')
assert.deepEqual(requests, ['/signup?redirect=opaque'])
tab.click(gen, 'signed-in Generate')
await tab.settle()
assert.deepEqual(requests[1], ['/api/images/generate', { prompt: 'A lighthouse & a bird.', model: 'nanobanana', size: 'square_hd' }])
console.log('Image: six tariffs, guest signup, restored text/size/model, no generation until second click.')
