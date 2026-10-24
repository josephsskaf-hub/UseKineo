// Execute the runtime with synthetic state; compare to immutable approved main.
// The original b80 proposal remains executed by test-studio-hierarchy-proposal.
// Later approved Studio work (KINEO-STUDIO-MOTOR-PRIMEIRO-2026-09-30) put the
// engine before the idea and added controls; do not silently erase those deltas.
// No effects, API, credentials, render or purchase. Not a browser test.
import assert from 'node:assert/strict'
import React from 'react'
import { buildStudioHierarchyApproved, buildStudioHierarchyRuntime } from './preview-studio-hierarchy.mjs'
import { readFileSync } from 'node:fs'
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
  // The new language boundary adds a component around the SAME English text.
  // Compare that default copy, not the extra React node. Only UiLabel qualifies;
  // real Spanish rendering + the entire unchanged file are tested separately.
  if (typeof node.type === 'function' && node.type.name === 'UiLabel') return signature(node.props.children)
  return { type: typeof node.type === 'string' ? node.type : node.type.name, props: Object.fromEntries(
    Object.entries({ ...node.props, children: node.props.children ?? [] }).filter(([key]) => key !== 'ref').map(([key, value]) => [key,
      // React.Children.map in the approved prototype wraps singleton children
      // in arrays. Compare the rendered child sequence, not that wrapper.
      key === 'children' ? React.Children.toArray(value).map(signature) : typeof value === 'function' ? value.toString().replace(/\s+/g, '') : value]),
  ) }
}
for (const [name, state] of variants) {
  const expectedRoot = buildStudioHierarchyApproved(state), actualRoot = buildStudioHierarchyRuntime(state)
  const expected = nodes(expectedRoot), actual = nodes(actualRoot)
  assert.deepEqual(signature(actualRoot), signature(expectedRoot), name + ': complete approved layout, copy, values, destinations and handlers')
  for (const tag of ['button', 'input', 'textarea', 'select', 'video']) {
    assert.deepEqual(actual.filter(n => n.type === tag).map(signature), expected.filter(n => n.type === tag).map(signature), name + ': ' + tag)
  }
  const hasClass = (n, name) => typeof n.props.className === 'string' && n.props.className.split(/\s+/).includes(name)
  const cost = actual.find(n => hasClass(n, 'cost'))
  assert.ok(cost, name + ': financial UI exists')
  assert.deepEqual(signature(cost), signature(expected.find(n => hasClass(n, 'cost'))), name + ': financial UI unchanged')
  assert.equal(actual.filter(n => n.props.className === 'myv').length, expected.filter(n => n.props.className === 'myv').length, name + ': continuation retained')
  assert.ok(actual.findIndex(n => n.props.className === 'mdlbtn') < actual.findIndex(n => n.type === 'textarea'), name + ': approved engine selection before idea')
  assert.ok(actual.findIndex(n => n.type === 'textarea') < actual.findIndex(n => hasClass(n, 'composer-proposal-settings')), name + ': idea before settings and generation')
  for (const label of ['Optional settings', 'How it works']) assert.ok(actual.some(n => n.type === 'summary' && signature(n).props.children.includes(label)), name + ': ' + label)
  console.log('OK runtime matches approved controls: ' + name)
}
// Exact approved comparison must reject real regressions, rather than merely
// making two executions of a bad current source agree. Mutants never touch disk.
const source = readFileSync(new URL('../app/(dashboard)/studio/StudioClient.tsx', import.meta.url), 'utf8')
for (const [name, before, after] of [
  ['button handler', 'onClick={() => setPickerOpen((o) => !o)}', 'onClick={() => {}}'],
  ['cost output', "scriptMode === 'clip' ? CLIP_CREDITS : cost", '999'],
  ['idea field', 'value={prompt}', 'value="lost idea"'],
  ['continuation', '{myVids.length > 0 && <section', '{false && <section'],
]) {
  assert.ok(source.includes(before), name + ': mutant applied')
  const mutant = buildStudioHierarchyRuntime({ prompt: 'The signal returned.', myVids: [video(1)], balance: 100 }, source.replace(before, after))
  assert.notDeepEqual(signature(mutant), signature(buildStudioHierarchyApproved({ prompt: 'The signal returned.', myVids: [video(1)], balance: 100 })), name + ': real regression rejected')
}
console.log('11 runtime states passed against immutable approved main; 4 real source mutants rejected; historical proposal retained.')
