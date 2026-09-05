// Proposal-only tests: execute real Studio with named, synthetic hook states.
// Inspect React trees, not a browser. No network, effects, generation or media.
import assert from 'node:assert/strict'
import React from 'react'
import { buildStudioHierarchyProposal } from './preview-studio-hierarchy.mjs'
function nodes(node, out = []) {
  if (React.isValidElement(node)) { out.push(node); React.Children.forEach(node.props.children, (child) => nodes(child, out)) }
  return out
}
const video = (n) => ({ id: 'fixture-' + n, title: 'The signal ' + n, video_url: '#fixture-video-' + n, thumbnail_url: null })
const variants = [
  ['empty', {}],
  ['idea', { prompt: 'A lighthouse sends a signal from beneath the sea.', balance: 100 }],
  ['verbatim', { prompt: 'HOOK\nLa señal volvió.\nPAYOFF\nEra el farero.', scriptMode: 'verbatim', duration: 35 }],
  ['engine-picker', { pickerOpen: true }],
  ['internal-picker', { pickerOpen: true, internal: true }],
  ['insufficient-balance', { balance: 0, engine: 'h3', prompt: 'The signal returned.' }],
  ['over-limit', { prompt: 'A'.repeat(25_000) }],
  ['camera-selected', { preset: 'dolly' }],
  ['chatgpt-script', { chatGptQuickstart: 'finished_script', scriptMode: 'verbatim' }],
  ['one-completed-video', { myVids: [video(1)] }],
  ['six-completed-videos', { myVids: Array.from({ length: 6 }, (_, i) => video(i + 1)) }],
]
let checks = 0
for (const [name, state] of variants) {
  const { original, proposed } = buildStudioHierarchyProposal(state)
  const before = nodes(original), after = nodes(proposed)
  // A transformation may reposition nodes, but must retain every existing
  // handler/reference and value. It cannot drop a conditional customer block.
  for (const beforeNode of before) {
    for (const [prop, value] of Object.entries(beforeNode.props)) {
      if (/^on[A-Z]/.test(prop) && typeof value === 'function') assert.ok(after.some((n) => n.props[prop] === value), name + ' lost handler ' + prop)
    }
  }
  for (const tag of ['button', 'input', 'textarea', 'video']) assert.equal(after.filter((n) => n.type === tag).length, before.filter((n) => n.type === tag).length, name + ' lost ' + tag)
  const hrefs = (list) => list.filter((n) => typeof n.props.href === 'string').map((n) => n.props.href).sort()
  assert.deepEqual(hrefs(after), hrefs(before), name + ' destinations changed')
  // Reordering is the proposal itself; compare field identities/values, not
  // their previous order. The initial assertion incorrectly forbade the move.
  const fields = (list) => list.filter((n) => ['input', 'textarea'].includes(n.type)).map((n) => ({ type: n.type, value: n.props.value, disabled: n.props.disabled })).sort((a, b) => a.type.localeCompare(b.type))
  assert.deepEqual(fields(after), fields(before), name + ' input changed')
  const cost = before.find((n) => n.props.className === 'cost')
  // Children.toArray assigns keys; preserve props/subtree rather than that
  // wrapper's object identity.
  assert.deepEqual(after.find((n) => n.props.className === 'cost')?.props, cost.props, name + ' cost subtree changed')
  const retentionBefore = before.filter((n) => n.props.className === 'myv')
  assert.equal(after.filter((n) => n.props.className === 'myv').length, retentionBefore.length, name + ' lost retention surface')
  const textareaIndex = after.findIndex((n) => n.type === 'textarea')
  assert.ok(textareaIndex < after.findIndex((n) => n.props.className === 'mdlbtn'), name + ' idea not first')
  checks++
  console.log('OK ' + name)
}
console.log(checks + ' proposal states preserve controls/handlers/destinations; not browser or production validation.')
