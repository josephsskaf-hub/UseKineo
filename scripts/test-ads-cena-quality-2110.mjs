// KINEO-ADS-CENA-2110 — offline proofs for current Studio Ads captions and mandatory paid UGC.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const Q = 'lib/ads/v2CenaQuality.ts', A = 'lib/ads/v2Advance.ts'
const source = readFileSync(A, 'utf8')
const ugc = { attempt: 1, status: 'failed', reason: 'presenter_deadline', reason_class: 'local_policy_gate', created_at: '2026-10-21T12:00:00Z' }
function world(over = {}) {
  const events = [], inserted = [], failed = []
  const mocks = Object.fromEntries([...source.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => [m[1], {}]))
  delete mocks['node:crypto']; delete mocks['@/lib/ads/v2CenaQuality']
  mocks['@/lib/textLanguage'] = createOfflineLoader()('@/lib/textLanguage') // KINEO-IDIOMAS-FORMATOS-2410 — blanket dependency stubs must retain actual Unicode caption helpers.
  mocks['@/lib/ads/v2ShotLists'] = { ADS_V2_CARD_SECONDS: 2.5 }
  mocks['@/lib/ads/v2Presenter'] = { isAdsV2PresenterPlan: (p) => Boolean(p?.productUrl), ADS_V2_PRESENTER_KIND: 'presenter' }
  mocks['@/lib/serverEvents'] = { writeServerEvent: async (e) => events.push(e) }
  mocks['@/lib/ads/v2Billing'] = { failAdsV2Order: async (_db, _o, reason) => { failed.push(reason); return { won: failed.length === 1, refund: 'refunded', amount: 41 } } }
  const load = createOfflineLoader({ mocks, source: (p, t) => (over[p] ?? t) + (p === A ? '\nexport { retryPresenter as testRetry, prepareAndSubmit as testAssembly, failRequiredUgc as testFail };\n' : '') })
  const advance = load(A), quality = load(Q)
  const db = { from: (table) => ({ upsert: (row) => { assert.equal(table, 'ads_v2_shots'); inserted.push(row); return { select: async () => ({ error: null, data: [{ id: 'retry' }] }) } } }) }
  return { advance, quality, events, inserted, failed, db }
}
async function proofs(over = {}) {
  const { quality: q, advance, events, inserted, failed, db } = world(over)
  const text = 'O relógio acompanha sua corrida e mantém a bateria por sete dias com frete grátis.'
  const blocks = q.cenaCaptionBlocks(text)
  assert.equal(blocks.join(' '), text)
  assert.ok(blocks.every((b) => b.split(' ').length >= 3 && b.split(' ').length <= 6))
  for (let words = 3; words <= 90; words++) assert.ok(q.cenaCaptionBlocks(Array.from({ length: words }, (_, j) => 'w' + j).join(' ')).every((b) => b.split(' ').length >= 3 && b.split(' ').length <= 6))
  const els = q.cenaCaptionElements({ text, width: 1080, height: 1920, seconds: 12, start: 0.3 })
  assert.equal(els[0].font_size, 63)
  assert.ok(els.every((e) => e.fill_color === '#ffffff' && e.stroke_color === '#000000' && e.stroke_width >= 6 && e.stroke_width <= 8 && !('background_color' in e)))
  assert.ok(els.every((e) => parseFloat(e.y) >= 62 && parseFloat(e.y) <= 72 && parseFloat(e.y) * 19.2 < 1480 && e.y_anchor === '50%'))
  assert.equal(els[0].time, 0.3)
  assert.equal(Math.round((els.at(-1).time + els.at(-1).duration) * 1000), 12300)
  els.slice(1).forEach((e, j) => assert.equal(Math.round((els[j].time + els[j].duration) * 1000), Math.round(e.time * 1000)))
  const card = { type: 'image', track: 20, source: 'real-client-photo' }, bg = { type: 'shape', track: 1 }
  const original = { width: 1080, height: 1920, elements: [bg, card, { type: 'text', track: 5, text: 'old box', time: 0, duration: 3, background_color: 'black' }], duration: 15 }
  const before = JSON.stringify(original)
  const layered = q.cenaApplyCaptions({ source: original, text, seconds: 12, legacyTextTrack: 5, fontFamily: 'Inter' })
  assert.equal(JSON.stringify(original), before)
  assert.ok(layered.elements.includes(card) && layered.elements.includes(bg))
  assert.ok(!layered.elements.some((e) => e.track === 5) && layered.elements.filter((e) => e.type === 'text').every((e) => e.track > 20 && !('background_color' in e)))
  assert.equal(q.cenaUgcFailureAction(ugc), 'retry')
  assert.equal(q.cenaUgcFailureAction({ ...ugc, attempt: 2 }), 'refund')
  assert.equal(q.cenaUgcFailureAction({ ...ugc, reason: 'provider_failed', reason_class: 'unknown' }), 'retry')
  assert.equal(q.cenaUgcFailureAction({ ...ugc, reason: 'no_voice' }), 'refund')
  assert.ok(q.cenaUgcAttemptDeadline({ attempt: 2 }) > q.cenaUgcAttemptDeadline({ attempt: 1 }))
  assert.equal(q.cenaUgcAttemptExpired({ ...ugc, attempt: 2 }, '2026-10-21T10:00:00Z', Date.parse('2026-10-21T12:19:59Z')), false)
  assert.equal(q.cenaUgcAttemptExpired({ ...ugc, attempt: 2 }, '2026-10-21T10:00:00Z', Date.parse('2026-10-21T12:20:01Z')), true)
  const order = { id: 'order', user_id: 'user', plan: { presenter: { productUrl: 'https://offline/product' } }, card_url: 'https://offline/card' }
  assert.equal(await advance.testRetry(db, order, { ...ugc, idx: 31, image_url: 'https://offline/approved-image' }), null)
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].attempt, 2)
  assert.equal(inserted[0].image_url, 'https://offline/approved-image')
  assert.equal(events.filter((e) => e.name === 'ads_v2_ugc_retried').length, 1)
  assert.equal(events.find((e) => e.name === 'ads_v2_ugc_retried').metadata.charged, false)
  assert.match(await advance.testRetry(db, order, { ...ugc, attempt: 2 }), /^ugc_presenter_failed:/)
  assert.equal(inserted.length, 1)
  await advance.testAssembly(db, order, 'lease', [])
  assert.match(failed[0], /^ugc_presenter_failed:/)
  await advance.testFail(db, order, 'ugc_presenter_failed:deadline')
  assert.equal(events.filter((e) => e.name === 'ads_v2_ugc_failed').length, 1)
  assert.equal(events.find((e) => e.name === 'ads_v2_ugc_failed').metadata.refund, 'refunded')
  return true
}
const postPath = 'lib/ads/v2PostDeliveryServer.ts'
const postRaw = readFileSync(postPath, 'utf8')
const postMocks = Object.fromEntries([...postRaw.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => [m[1], {}]))
delete postMocks['node:crypto']; delete postMocks['@/lib/ads/v2CenaQuality']
postMocks['@/lib/renderProfile'] = { renderOutputSpecFor: () => ({ width: 1080, height: 1920 }) }
postMocks['@/lib/textLanguage'] = { ...createOfflineLoader()('@/lib/textLanguage'), captionFontFor: () => 'Inter' } // KINEO-IDIOMAS-FORMATOS-2410 — retain the font fixture and execute the real Unicode token helpers.
postMocks['@/lib/ads/v2PostDelivery'] = { adsV2EditMontageInput: () => ({}), adsV2EditWithoutPresenter: (b) => ({ ...b, presenter: null }) }
postMocks['@/lib/ads/adV2Montage'] = { buildAdV2Source: () => ({ width: 1080, height: 1920, elements: [{ type: 'text', track: 4, text: 'Oferta editada pelo cliente', time: 1, duration: 4, background_color: 'black' }, { type: 'image', track: 3, source: 'real-end-card' }] }) }
const post = createOfflineLoader({ mocks: postMocks })(postPath)
for (const presenter of [null, { url: 'https://offline/actor' }]) {
  const output = post.buildVersionSource({ presenter }, {}, '9:16', 'pt')
  const captions = output.elements.filter((e) => e.type === 'text')
  assert.equal(captions.map((e) => e.text).join(' '), 'Oferta editada pelo cliente')
  assert.ok(captions.every((e) => !('background_color' in e) && e.track === 40 && e.font_size === 63))
  assert.ok(output.elements.some((e) => e.source === 'real-end-card'))
}
console.log('ok export/edits use the same caption style and preserve edited copy, timing and end card')
await proofs()
console.log('ok captions: all words, 3–6/block, 3.3% height, 67% center, black outline, no box; UGC retry and refund through real integration with doubles')
const raw = readFileSync(Q, 'utf8')
const mutations = [
  ['caption size', Q, raw.replace('CENA_CAPTION_HEIGHT_RATIO = 0.033', 'CENA_CAPTION_HEIGHT_RATIO = 0.08')],
  ['caption box', Q, raw.replace("fill_color: '#ffffff'", "background_color: '#000000', fill_color: '#ffffff'")],
  ['caption unsafe position', Q, raw.replace('CENA_CAPTION_CENTER = 0.67', 'CENA_CAPTION_CENTER = 0.9')],
  ['deadline skips retry', Q, raw.replace("if (row.reason === 'presenter_deadline') return 'retry'", "if (row.reason === 'presenter_deadline') return 'refund'")],
  ['retry inherits expired clock', Q, raw.replace('row.attempt >= 2 ? row.created_at : orderStartedAt', 'orderStartedAt')],
  ['silent UGC fallback', A, source.replace("if (!actor || actor.status !== 'done' || !actor.stored_url || !num(actor.measured_seconds))", 'if (false)')],
]
for (const [label, path, mutated] of mutations) {
  assert.notEqual(mutated, path === Q ? raw : source, 'mutant applied: ' + label)
  let red = false
  try { await proofs({ [path]: mutated }) } catch { red = true }
  assert.ok(red, 'mutant must be red: ' + label)
  console.log('ok mutant red: ' + label)
}
