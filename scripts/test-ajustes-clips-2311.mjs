import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { aba, loader, React, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const savedPath = 'components/clips/SavedClipCard.tsx'
const effectPath = 'components/clips/ClipEffectCard.tsx'
const workspacePath = 'components/create/ClipTemplateWorkspace.tsx'
const galleryPath = 'app/recreate/RecreateClient.tsx'

function checkSaved(overrides) {
  const tab = aba(overrides)
  const Card = tab.m(savedPath).default
  const rect = p => Object.hasOwn(p, 'data-clip-shape')
  const player = (_p, tag) => tag === 'video'
  const show = (aspect, src = '/sample.mp4') => tab.mount(React.createElement(Card, { aspect, src, lazy: true }))
  show('16:9')
  assert.equal(tab.one(rect, 'saved clip').props.style.gridColumn, '1 / -1', 'known horizontal occupies the row')
  assert.equal(tab.one(rect, 'saved clip').props.style.maxWidth, 720, 'horizontal is constrained on desktop')
  assert.equal(tab.one(player, 'player').props.style.objectFit, 'contain', 'show the whole frame')
  assert.equal(tab.one(player, 'player').props.controls, true, 'native playback stays available')
  show('image', '/inherits.mp4')
  const inherited = tab.one(player, 'inherited photo shape')
  assert.equal(inherited.props.style.aspectRatio, 1, 'unknown ratio starts square')
  inherited.props.onLoadedMetadata({ currentTarget: { videoWidth: 1280, videoHeight: 720 } })
  tab.render()
  assert.equal(tab.one(rect, 'saved clip').props['data-clip-shape'], 'wide', 'metadata enlarges inherited horizontal')
  assert.equal(tab.one(player, 'player').props.style.aspectRatio, 1280 / 720, 'real aspect ratio follows metadata')
  show('9:16', '/portrait.mp4')
  assert.equal(tab.one(rect, 'saved clip').props['data-clip-shape'], 'standard', 'a new source never inherits old dimensions')
  show('16:9', null)
  assert.equal(tab.one(rect, 'pending clip').props['data-clip-shape'], 'standard', 'a pending item keeps the existing card')
}

function checkEffect(overrides) {
  const tab = aba(overrides)
  const Card = tab.m(effectPath).default
  let selected = 0
  const props = { separatePlayback: true, preview: { video: '/sample.mp4' }, previewLabel: 'Storm', 'data-clip-action': 'select_effect',
    onClick: () => { selected++ }, children: 'Choose storm' }
  const tree = tab.mount(React.createElement(Card, props))
  const button = (p, tag) => tag === 'button' && p['data-clip-action'] === 'select_effect'
  const player = (_p, tag) => tag === 'video'
  assert.equal(tree.type, 'article', 'playback is outside the selection button')
  assert.equal(tab.one(player, 'player').props.controls, true, 'preview offers its own playback controls')
  const selectButton = tab.one(button, 'selection control')
  assert.equal(selectButton.props.children.includes(tab.one(player, 'player')), false, 'selection never contains the media control')
  assert.equal(tab.one(player, 'player').props.onClick, undefined, 'preview has no selection handler')
  assert.equal(selected, 0, 'opening previews does not choose an effect')
  tab.click(button, 'selection control')
  assert.equal(selected, 1, 'explicit choice still selects once')
  const legacy = tab.mount(React.createElement(Card, { ...props, separatePlayback: false }))
  assert.equal(legacy.type, 'button', 'legacy card preserves its full-surface button')
  tab.mount(React.createElement(Card, { ...props, preview: null, unavailableText: 'Preview coming soon' }))
  assert.equal(tab.all(player).length, 0, 'missing preview never requests a video')
  assert.match(tab.html(), /Preview coming soon/, 'missing preview is disclosed')
}

function find(node, match) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) return node.map(child => find(child, match)).find(Boolean) || null
  return match(node.props) ? node : find(node.props?.children, match)
}

function checkWorkspace(overrides) {
  let mode = 'templates'
  const load = loader({ react: { ...React, useId: () => 'sort', useState: initial => [initial, next => { mode = next }] } }, overrides)
  const Workspace = load(workspacePath).default
  const workspace = Workspace({ measurementActor: null, recreate: { formatos: [] }, specs: {} })
  assert.equal(workspace.props.separateEffectPlayback, true, 'workspace enables separate playback')
  const render = workspace.props.moldura({})
  let requests = 0
  let allow = false
  const page = render.props.moldura({ catalogo: [], curtidas: {}, selecionado: { id: 'current' }, soltar: () => { requests++; return allow } })
  const section = find(page, p => typeof p?.onClickCapture === 'function')
  const previous = globalThis.Element
  try {
    globalThis.Element = class {
      constructor(choice) { this.choice = choice }
      closest(selector) { return selector === 'button[data-clip-action^="select_"]' ? this.choice : null }
    }
    function act(choice, contained = true) {
      const calls = []
      section.props.onClickCapture({
        target: new Element(choice), currentTarget: { contains: () => contained },
        preventDefault() { calls.push('prevent') },
        stopPropagation() { calls.push('stop') },
      })
      return calls
    }
    assert.deepEqual(act(null), [], 'native play continues without a prompt')
    assert.equal(requests, 0, 'preview did not consult the photo discard confirmation')
    assert.equal(mode, 'templates', 'preview leaves the selected template mode intact')
    assert.deepEqual(act({}, false), [], 'a button outside this gallery is ignored')
    assert.equal(requests, 0)
    assert.deepEqual(act({}), ['prevent','stop'], 'canceling the discard stops the explicit choice')
    assert.equal(requests, 1)
    assert.equal(mode, 'templates')
    allow = true
    assert.deepEqual(act({}), [], 'confirmed choice proceeds')
    assert.equal(mode, 'idea')
  } finally { globalThis.Element = previous }
}

function verify(overrides = {}) {
  checkSaved(overrides)
  checkEffect(overrides)
  checkWorkspace(overrides)
  const { CLIP_COVER_FOCUS } = loader({}, overrides)(galleryPath)
  for (const id of ['passarela','effect-storm-behind','effect-dollar-rain','elevador']) {
    assert.ok(parseInt(CLIP_COVER_FOCUS[id]?.split(' ')[1],10) < 42, 'cover focus preserves headroom for ' + id)
  }
}

verify()
for (const [file, from, to, expected] of [
  [savedPath, "gridColumn: '1 / -1'", "gridColumn: 'auto'", /horizontal occupies the row/],
  [savedPath, "objectFit: 'contain'", "objectFit: 'cover'", /show the whole frame/],
  [savedPath, 'videoWidth / videoHeight', 'videoHeight / videoWidth', /metadata enlarges inherited horizontal/],
  [savedPath, 'dimensions && dimensions.src === src ?', 'dimensions ?', /a new source never inherits/],
  [effectPath, 'if (!separatePlayback) return <button', 'if (true) return <button', /outside the selection button/],
  [effectPath, 'controls={separatePlayback}', 'controls={false}', /preview offers its own playback/],
  [effectPath, '{unavailableText}', '{null}', /missing preview is disclosed/],
  [workspacePath, 'if (!choice || !event.currentTarget.contains(choice)) return', 'if (false) return', /native play continues/],
  [workspacePath, "rc.selecionado && !rc.soltar('/create/clip')) { event.preventDefault()", "false) { event.preventDefault()", /canceling the discard stops/],
  [galleryPath, "passarela: '50% 23%'", "passarela: '50% 42%'", /headroom for passarela/],
]) {
  const source = read(file).replaceAll('\r\n','\n')
  assert.equal(source.split(from).length, 2, 'unique mutant anchor')
  assert.throws(() => verify({ [file]: source.replace(from,to) }), { name:'AssertionError', message:expected })
}
console.log('PASS · Clip covers · local playback · saved video shape · 10 mutantes mortos')
