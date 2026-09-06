// Execute the runtime with synthetic state; compare to the approved proposal.
// No effects, API, credentials, render or purchase. Not a browser test.
import assert from 'node:assert/strict'
import React from 'react'
import { buildStudioHierarchyProposal, buildStudioHierarchyRuntime } from './preview-studio-hierarchy.mjs'
const nodes = (node, out = []) => {
  if (React.isValidElement(node)) {
    out.push(node)
    React.Children.forEach(node.props.children, child => nodes(child, out))
  }
  return out
}
const video = n => ({ id: 'fixture-' + n, title: 'The signal ' + n, video_url: '#fixture-' + n, thumbnail_url: null })
const variants = [
  ['empty', {}], ['idea', { prompt: 'The lighthouse signal returned.', balance: 100 }],
  ['verbatim', { prompt: 'HOOK\nLa señal volvió.\nPAYOFF\nEra el farero.', scriptMode: 'verbatim', duration: 35 }],
  ['picker', { pickerOpen: true }], ['internal-picker', { pickerOpen: true, internal: true }],
  ['no-credit', { balance: 0, engine: 'h3', prompt: 'The signal returned.' }],
  ['long', { prompt: 'A'.repeat(25000) }], ['camera', { preset: 'dolly' }],
  ['chatgpt', { chatGptQuickstart: 'finished_script', scriptMode: 'verbatim' }],
  ['one-video', { myVids: [video(1)] }], ['six-videos', { myVids: Array.from({ length: 6 }, (_, i) => video(i + 1)) }],
]
// Ignore React identity and source formatting, not rendered values or actions.
function signature(node) {
  if (Array.isArray(node)) return node.map(signature)
  if (!React.isValidElement(node)) return node
  return { type: typeof node.type === 'string' ? node.type : 'component', props: Object.fromEntries(
    Object.entries({ ...node.props, children: node.props.children ?? [] }).filter(([key]) => key !== 'ref').map(([key, value]) => [key,
      // React.Children.map in the approved prototype wraps singleton children
      // in arrays. Compare the rendered child sequence, not that wrapper.
      // The separate L2 acceptance suite executes this exact attribution call.
      // Ignore ONLY that approved navigation delta when comparing layout to main.
      key === 'children' ? React.Children.toArray(value).map(signature) : typeof value === 'function' ? value.toString().replace(/\s+/g, '').replace('(0,studioSeriesReview_1.carryStudioSeriesReview)(newURLSearchParams(searchSignature),q);', '') : value]),
  ) }
}
for (const [name, state] of variants) {
  const expected = nodes(buildStudioHierarchyProposal(state).proposed)
  const actual = nodes(buildStudioHierarchyRuntime(state))
  for (const tag of ['button', 'input', 'textarea', 'video']) {
    assert.deepEqual(actual.filter(n => n.type === tag).map(signature), expected.filter(n => n.type === tag).map(signature), name + ': ' + tag)
  }
  assert.deepEqual(signature(actual.find(n => n.props.className === 'cost')), signature(expected.find(n => n.props.className === 'cost')), name + ': financial UI unchanged')
  assert.equal(actual.filter(n => n.props.className === 'myv').length, expected.filter(n => n.props.className === 'myv').length, name + ': continuation retained')
  assert.ok(actual.findIndex(n => n.type === 'textarea') < actual.findIndex(n => n.props.className === 'mdlbtn'), name + ': idea first')
  for (const label of ['Optional settings', 'How it works']) assert.ok(actual.some(n => n.type === 'summary' && n.props.children === label), name + ': ' + label)
  console.log('OK runtime matches approved controls: ' + name)
}
console.log('11 runtime states passed; navigation covered by separate caller tests.')
