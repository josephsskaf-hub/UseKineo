import assert from 'node:assert/strict'
import runtime from '../docs/studio-na-moldura-1011/runtime.cjs'

const { aba, React, read } = runtime
const credits = {
  credits: 10, filmsDelivered: 0, hasPaid: false, entitlementsResolved: true,
  trial: { phase: 'active', creditsGranted: 10, creditsUsedForDisplay: 0, msLeft: 60000 },
}
const consent = p => p.name === 'film-photo-consent'
const generate = p => p['data-testid'] === 'studio-simple-generate'
const more = p => p['data-cx-chip'] === 'mais'
const photoKey = 'kineo:studio:estrela:v1'
const launch = 'lib/engineLaunch.ts'

// Exercise the composer handlers with an eligible account and a delayed credit recheck.
// Only photo storage, account data and routing are simulated.
for (const change of ['withdraw', 'withdraw-and-restore', 'remove', 'keep']) {
  const tab = aba({
    [launch]: read(launch).replace('export const ESTRELA_PUBLIC = false', 'export const ESTRELA_PUBLIC = true'),
    'lib/create/uploadFilmStarReference.ts': "export async function uploadFilmStarReference() { return 'fixture/reference.jpg' }",
  }, { credits })
  const entry = tab.m('lib/create/publicEditor').filmEntry({}, false, true)
  const Film = tab.m('components/create/StudioNaMoldura').default
  tab.mount(React.createElement(Film, { entry, motor: 'seedance', caixaNova: true, campanha: 'film_more_test' }))
  await tab.settle()
  tab.type(p => p.id === 'cx-ideia', 'A gardener opens the greenhouse.', 'idea')
  tab.click(more, 'More')
  tab.type(consent, true, 'consent')
  const target = { files: [new File(['fixture'], 'reference.jpg', { type: 'image/jpeg' })], value: '' }
  tab.one(p => p['aria-label'] === 'Add reference photos', 'upload').props.onChange({ target })
  await tab.settle()
  assert.equal(tab.one(generate, 'Generate').props.disabled, false)

  let release
  globalThis.fetch = async path => {
    assert.equal(path, '/api/credits')
    await new Promise(resolve => { release = resolve })
    return { ok: true, json: async () => credits }
  }
  tab.click(generate, 'Generate with photo')
  assert.equal(typeof release, 'function', 'the second credit check is pending')
  if (change.startsWith('withdraw')) tab.type(consent, false, 'withdraw consent')
  if (change === 'withdraw-and-restore') tab.type(consent, true, 'allow again')
  if (change === 'remove') tab.click(p => p['aria-label'] === 'Remove photo', 'remove last photo')
  release()
  await tab.settle()
  if (change === 'keep') {
    assert.equal(tab.log.pushes.length, 1)
    assert.deepEqual(JSON.parse(tab.log.storage.get(photoKey)).paths, ['fixture/reference.jpg'])
    continue
  }
  assert.equal(tab.log.pushes.length, 0, change + ' must cancel the pending order')
  assert.equal(tab.log.storage.has(photoKey), false)
  assert.match(tab.html(), /press Generate again/i)
  if (change === 'withdraw') tab.type(consent, true, 'new consent')
  tab.click(generate, 'new explicit Generate')
  release()
  await tab.settle()
  assert.equal(tab.log.pushes.length, 1)
  assert.equal(tab.log.storage.has(photoKey), change !== 'remove')
}
console.log('Film More: withdrawal, reconsent, removal, fresh click and unchanged selection passed.')
