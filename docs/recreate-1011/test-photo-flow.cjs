// Execute actual client handlers with local photo/API adapters; no DOM, network, credentials or paid renders.
const assert = require('node:assert/strict')
const path = require('node:path')
const { loader, ROOT, formats } = require('../recreate-0911/test-recreate.cjs')
const React = require(path.join(ROOT, 'node_modules/react'))
const { recreateCreditCost } = loader()('lib/checkoutPricing')
const tick = () => new Promise(resolve => setImmediate(resolve))
function harness(id, balance = 40) {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0
  const calls = { pairs: [], crops: [], uploads: [], requests: [] }
  const quotes = formats.RECREATE_FORMATS.map(f => { const credits = f.type === 'swap' ? recreateCreditCost(f.seconds) : formats.recreateEffectCredits(f); return { id: f.id, credits, shortfall: Math.max(0, credits - balance), available: true } })
  const react = { ...React, useEffect: () => {}, useState: initial => {
    const index = stateIndex++
    if (!Object.hasOwn(states, index)) states[index] = index === 4 ? quotes : typeof initial === 'function' ? initial() : initial
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
  }, useRef: initial => { const index = refIndex++; return refs[index] ??= { current: initial } } }
  const component = loader({ react, '@/lib/recreate/photos': {
    compressPhoto: async file => file,
    cropFace: async file => { calls.crops.push(file.name); return file },
    composePairPhoto: async (a, b) => { calls.pairs.push([a.name, b.name]); return new File(['pair'], 'pair.jpg', { type: 'image/jpeg' }) },
  } })('app/recreate/RecreateClient').default
  function render() { stateIndex = refIndex = 0; return component({ initialId: id }) }
  function all(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(all); return [tree, ...all(tree.props?.children)] }
  const find = predicate => { const node = all(render()).find(predicate); assert(node, 'Expected UI control'); return node }
  const button = label => find(n => n.type === 'button' && n.props['aria-label'] === label)
  const generate = () => find(n => n.type === 'button' && Object.hasOwn(n.props, 'data-recreate-generate'))
  async function add(slot, name) {
    const selected = states[0] ?? formats.recreateFormat(id)
    button(selected.photoSlots > 1 ? `Add photo of person ${slot + 1}` : 'Add your photo').props.onClick()
    find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [new File([name], name, { type: 'image/jpeg' })], value: name } })
    await tick(); await tick(); render()
  }
  async function replace(slot, name) {
    button(`Change photo ${slot + 1}`).props.onClick()
    find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [new File([name], name, { type: 'image/jpeg' })], value: name } })
    await tick(); await tick(); render()
  }
  async function fetch(url, options) {
    if (url === '/api/avatar/upload') { const file = options.body.get('file'); calls.uploads.push(file.name); return Response.json({ url: `https://fixture.supabase.co/storage/v1/object/public/avatars/fixture/${file.name}` }) }
    if (url === '/api/recreate' && options?.method === 'POST') { calls.requests.push(JSON.parse(options.body)); return Response.json({ clip: { id: 'fixture-clip', status: 'processing' } }) }
    if (url === '/api/recreate') return Response.json({ catalog: quotes })
    throw new Error('Unexpected API: ' + url)
  }
  render()
  async function drop(slot, type = 'image/jpeg') {
    const node = find(n => n.type === 'button' && n.props['aria-label'] === `${states[1]?.[slot] ? 'Change photo' : 'Add photo of person'} ${slot + 1}`)
    let prevented = false
    node.props.onDrop({ preventDefault() { prevented = true }, dataTransfer: { files: [new File(['fixture'], 'drop.jpg', { type })] } })
    await tick(); await tick()
    assert(prevented, 'drop cannot navigate away to the dropped file')
  }
  return { states, calls, button, generate, add, replace, drop, find, fetch, render, consent: () => { assert(!all(render()).some(n => n.type === 'input' && n.props.type === 'checkbox'), 'KINEO-RECREATE-ELEVADOR-1011: no consent checkbox; the notice line replaces it') } }
}
async function main() {
  const oldFetch = global.fetch, oldWindow = global.window
  global.window = { history: { replaceState: () => {} }, matchMedia: () => ({ matches: false }) }
  try {
    const pair = harness('effect-kiss'); global.fetch = pair.fetch
    await pair.add(1, 'right.jpg'); await pair.add(0, 'left.jpg')
    assert.deepEqual(pair.states[1].map(p => p.file.name), ['left.jpg', 'right.jpg'], 'selection order must not alter person positions')
    pair.button('Remove photo 1').props.onClick(); pair.render()
    assert.equal(pair.states[1][0], null); assert.equal(pair.states[1][1].file.name, 'right.jpg')
    assert(pair.generate().props.disabled)
    await pair.add(0, 'new-left.jpg'); await pair.replace(1, 'new-right.jpg'); pair.consent(); pair.render()
    assert.equal(pair.generate().props.disabled, false)
    await pair.generate().props.onClick(); await tick(); await tick()
    assert.deepEqual(pair.calls.pairs, [['new-left.jpg', 'new-right.jpg']])
    assert.deepEqual(pair.calls.uploads, ['pair.jpg']); assert.equal(pair.calls.requests[0].format, 'effect-kiss')
    assert(!Object.hasOwn(pair.calls.requests[0], 'credits'), 'browser never supplies the debit amount')

    const swap = harness('duelo-de-danca'); global.fetch = swap.fetch
    await swap.add(1, 'right.jpg'); await swap.add(0, 'left.jpg'); swap.consent(); swap.render()
    await swap.generate().props.onClick(); await tick(); await tick()
    assert.deepEqual(swap.calls.crops, ['right.jpg', 'left.jpg'])
    assert.deepEqual(swap.calls.uploads, ['left.jpg', 'right.jpg'])
    assert.deepEqual(swap.calls.requests[0].photos.map(s => s.split('/').pop()), ['left.jpg', 'right.jpg'])

    const changed = harness('duelo-de-danca'); await changed.add(0, 'left.jpg')
    changed.button('Use Outfit Morph').props.onClick(); changed.render()
    assert.equal(changed.states[0].id, 'outfit-morph'); assert.deepEqual(changed.states[1], []); assert.equal(changed.states[3], true) /* KINEO-RECREATE-ELEVADOR-1011: no checkbox to reset */

    const poor = harness('outfit-morph', 0); global.fetch = poor.fetch
    await poor.add(0, 'self.jpg'); poor.consent(); poor.render(); assert(poor.generate().props.disabled)
    await poor.generate().props.onClick(); await tick()
    assert.deepEqual(poor.calls.uploads, []); assert.deepEqual(poor.calls.requests, [])
    assert.match(poor.states[6], /40 more credits/)
    const dropped = harness('duelo-de-danca'); global.fetch = dropped.fetch
    await dropped.drop(0, 'application/pdf')
    assert.equal(dropped.find(n => n.props?.['data-step-state']).props['data-step-state'], 'error')
    assert(dropped.generate().props.disabled); assert.deepEqual(dropped.calls.uploads, [])
    await dropped.drop(1); await dropped.drop(0); dropped.consent()
    assert.equal(dropped.generate().props.disabled, false)
    assert.equal(dropped.find(n => n.props?.role === 'progressbar').props['aria-valuenow'], 2)
    await dropped.drop(0, 'application/pdf')
    assert(dropped.generate().props.disabled, 'a failed replacement must be resolved before generation')
    assert(dropped.states[1][0], 'failed replacement preserves the previous photo for review')
    await dropped.drop(0)
    assert.equal(dropped.generate().props.disabled, false)
    console.log('PASS: actual photo UI handlers preserve person positions, replace/remove independently, clear on template change, retain pair/crop recipes and refuse insufficient-credit uploads.')
  } finally { global.fetch = oldFetch; if (oldWindow === undefined) delete global.window; else global.window = oldWindow }
}
module.exports = main
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1 })
