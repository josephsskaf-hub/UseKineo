import assert from 'node:assert/strict'
import { world, USER, VIDEO, OTHER, VERSION, CAMPAIGN, read } from './test-support/upsell-filme15-harness-2610.mjs'

const SERVER = 'lib/filmComplete/server.ts'
const CONSTANTS = 'lib/growth/filmComplete.ts'
const completeRequests = ctx => ctx.requests.filter(request => request.url.endsWith('/api/generate-video-cinematic'))
const create = ctx => ctx.service.createFilmCompleteIntent(ctx.db, USER, VIDEO, 'film_ready')
const arm = async ctx => { const intent = await create(ctx); ctx.tables.events.find(row => row.id === intent.id).metadata.paid_session_id = 'cs_live_fixture'; ctx.pay(); return ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id) }
function paidSession(ctx, intent) { return { id: 'cs_live_fixture', payment_status: 'paid', mode: 'subscription', amount_total: 1990, metadata: { ...ctx.service.filmCompleteCheckoutMetadata(intent), supabase_user_id: USER, tier: 'basic', billing: 'monthly', intent_campaign: CAMPAIGN } } }

async function copyChecks(overrides) {
  const ctx = world(overrides), copy = ctx.load('lib/growth/filmCompleteCopy.ts')
  assert.equal(copy.filmCompleteCopy('pt', false).button, 'Fazer a versão completa — 35 s, sem marca')
  assert.ok(copy.filmCompleteCopy('pt', false).billing.includes(ctx.load('lib/growth/buyCreatorOffer.ts').buyCreatorPrice(false).full), 'billing follows the existing canonical price')
  for (const language of ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']) {
    const value = copy.filmCompleteCopy(language, false)
    assert.ok(value.button.includes('35'), 'target duration follows shared policy: ' + language)
    assert.ok(!/\{(?:s|full|first)\}/.test(JSON.stringify(value)))
  }
  const href = copy.filmCompleteCheckoutHref(VIDEO, 'film_ready'), parsed = new URL(href, 'https://www.usekineo.com')
  assert.equal(parsed.pathname, '/api/film-complete/checkout')
  assert.equal(parsed.searchParams.get('v'), VIDEO)
  assert.equal(parsed.searchParams.get('surface'), 'film_ready')
  const email = copy.filmCompleteEmail({ appUrl: 'https://www.usekineo.com', videoId: VIDEO, language: 'pt' })
  assert.ok(email.text.includes('Fazer a versão completa — 35 s, sem marca'))
  assert.ok(email.text.includes(copy.filmCompleteEmailHref('https://www.usekineo.com', VIDEO)))
  assert.ok(email.html.includes('data-kineo="film15-full-email"'))
  assert.ok(email.html.includes('surface=email'))
}

async function identityChecks(overrides) {
  const ctx = world(overrides), intent = await create(ctx)
  assert.ok(intent)
  assert.equal(intent.sourceVideoId, VIDEO)
  assert.equal(intent.language, 'pt')
  assert.equal(intent.script, ctx.tables.videos[0].script, 'source script is retained verbatim in the snapshot')
  assert.ok(intent.prompt.includes(ctx.tables.videos[0].script), 'saved narration survives')
  assert.ok(intent.prompt.includes(ctx.tables.videos[0].topic), 'saved original topic survives')
  assert.equal(await ctx.service.loadFilmCompleteIntent(ctx.db, OTHER, intent.id), null, 'another account cannot load the snapshot')
  assert.equal(await ctx.service.createFilmCompleteIntent(ctx.db, OTHER, VIDEO, 'email'), null, 'another account cannot purchase someone else\'s film')
  assert.equal((await create(ctx)).id, intent.id, 'same film has one durable intent')
  assert.equal(ctx.tables.events.filter(row => row.name === 'film15_full_intent').length, 1)
  ctx.tables.videos[0].script = 'Changed after the buyer clicked'
  assert.equal((await create(ctx)).script, intent.script, 'payment context is a durable snapshot')
  assert.deepEqual(Object.keys(ctx.service.filmCompleteCheckoutMetadata(intent)).sort(), ['film_complete_id', 'film_complete_source_video_id', 'film_complete_version'])
  assert.equal(JSON.stringify(ctx.service.filmCompleteCheckoutMetadata(intent)).includes(intent.script), false, 'private script never enters Stripe metadata')
}

async function paymentChecks(overrides) {
  const ctx = world(overrides), intent = await create(ctx)
  assert.equal((await ctx.service.startFilmComplete(ctx.db, intent, 'https://www.usekineo.com', ctx.io)).state, 'awaiting_payment')
  assert.equal(ctx.requests.length, 0, 'unpaid intent never calls writer or renderer')
  const session = paidSession(ctx, intent)
  for (const rewrite of [
    s => { s.payment_status = 'unpaid' }, s => { s.amount_total = 0 },
    s => { s.metadata.supabase_user_id = OTHER }, s => { s.metadata.card_trial = '1' },
    s => { s.metadata.intro = '1' }, s => { s.metadata.intent_campaign = 'other-campaign' },
    s => { s.metadata.film_complete_source_video_id = OTHER },
  ]) {
    const invalid = structuredClone(session); rewrite(invalid)
    try { await ctx.service.settleFilmComplete(ctx.db, invalid, 'https://www.usekineo.com', ctx.now) } catch (e) { assert.match(e.message, /intent_mismatch/) }
    assert.equal(ctx.requests.length, 0, 'invalid payment never starts a paid request')
    assert.equal(ctx.tables.events.find(row => row.id === intent.id).metadata.paid_session_id, null)
  }
  ctx.pay()
  await ctx.service.settleFilmComplete(ctx.db, session, 'https://www.usekineo.com', ctx.now)
  await ctx.service.settleFilmComplete(ctx.db, session, 'https://www.usekineo.com', ctx.now)
  assert.equal(completeRequests(ctx).length, 1, 'duplicate webhook creates one generation')
  assert.equal(ctx.disposed, 1, 'minted session is disposed')
}

async function launchChecks(overrides) {
  const ctx = world(overrides), intent = await arm(ctx)
  await Promise.all([ctx.service.startFilmComplete(ctx.db, intent, 'https://www.usekineo.com', ctx.io), ctx.service.startFilmComplete(ctx.db, intent, 'https://www.usekineo.com', ctx.io)])
  assert.equal(completeRequests(ctx).length, 1, 'CAS lease prevents browser/webhook double launch')
  const body = completeRequests(ctx)[0].body
  assert.equal(body.duration, 35)
  assert.equal(body.engine, 'seedance')
  assert.equal(body.generationId, intent.generationId)
  assert.equal(body.allow_shorter_duration, false)
  assert.equal(body.script_mode, 'verbatim', 'cinematic does not rewrite the frozen screenplay')
  assert.equal(ctx.persistedAtDispatch[0], true, 'expanded screenplay is persisted before paid dispatch')
  assert.equal(completeRequests(ctx)[0].init.headers.cookie, 'local-fixture-cookie')
  const fresh = await ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id)
  await ctx.service.startFilmComplete(ctx.db, fresh, 'https://www.usekineo.com', ctx.io)
  assert.equal(completeRequests(ctx).length, 1, 'settled cinematic claim prevents a repeated submission')
}

async function retryChecks(overrides) {
  const ctx = world(overrides), intent = await arm(ctx)
  ctx.responseStatus = 503
  await ctx.service.startFilmComplete(ctx.db, intent, 'https://www.usekineo.com', ctx.io)
  assert.equal(completeRequests(ctx).length, 1)
  const first = completeRequests(ctx)[0].body
  ctx.now += 6 * 60_000
  const fresh = await ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id)
  await ctx.service.startFilmComplete(ctx.db, fresh, 'https://www.usekineo.com', ctx.io)
  assert.equal(completeRequests(ctx).length, 2, 'ambiguous HTTP retry reuses the same generation')
  assert.equal(ctx.requests.filter(request => request.url.endsWith('/api/generate-script')).length, 1, 'writer runs once across retries')
  assert.deepEqual(completeRequests(ctx)[1].body, first, 'retry sends exact persisted screenplay and generation ID')
  assert.deepEqual(ctx.persistedAtDispatch, [true, true])
}

await identityChecks()
await copyChecks()
{
  const component = read('components/FilmReadyFullVersionUpsell.tsx'), generate = read('app/(dashboard)/generate/GenerateClient.tsx')
  assert.ok(component.includes("filmCompleteCheckoutHref(videoId, 'film_ready')"), 'live CTA enters the durable checkout route')
  assert.ok(component.includes('{copy.button}'))
  assert.ok(generate.includes('<FilmReadyFullVersionUpsell videoId={publicVideoId} />'))
  assert.ok(generate.includes('film15_free_film_watched'), 'watched denominator is emitted from actual playback sampler')
  for (const file of ['app/api/compose/status/[renderId]/route.ts', 'app/api/cron/send-video-ready/route.ts', 'app/api/cron/finish-stranded-renders/route.ts']) {
    const source = read(file)
    assert.ok(source.includes('filmCompleteEmail('), 'shared full-version CTA in actual ready-email path: ' + file)
    assert.ok(source.includes('film60UpsellEligible('), 'ready-email offer keeps strict free-film eligibility: ' + file)
  }
  const checkout = read('app/api/stripe/checkout/route.ts'), webhook = read('app/api/stripe/webhook/route.ts')
  assert.ok(checkout.includes('loadFilmCompleteIntent(filmDb, user.id, filmCompleteRequested)'))
  assert.ok(checkout.includes('film-complete?intent=${filmCompleteIntent.id}&session_id={CHECKOUT_SESSION_ID}'))
  assert.ok(checkout.includes('film-complete?intent=${filmCompleteIntent.id}&cancelled=1'))
  assert.equal(webhook.split('await settleFilmComplete(supabase, session, req.nextUrl.origin, event.created * 1000)').length - 1, 2, 'new and already-fulfilled webhook branches both recover the purchased film')
  assert.ok(webhook.includes('filmCompletePaymentMetadata(session.metadata)'), 'server-confirmed revenue retains attributable film identity')
  assert.ok(read('app/api/events/route.ts').includes("'film15_full_intent'"), 'browser event sink protects private saved script and paid ledger')
}
for (const change of [
  ctx => { ctx.tables.videos[0].user_id = OTHER }, ctx => { ctx.tables.videos[0].status = 'processing' },
  ctx => { ctx.tables.videos[0].duration = 35 }, ctx => { ctx.tables.profiles[0].has_paid = true },
  ctx => { ctx.tables.profiles[0].plan = 'basic' }, ctx => { ctx.tables.videos[0].script = ''; ctx.tables.videos[0].topic = '' },
]) { const ctx = world(); change(ctx); assert.equal(await create(ctx), null, 'only a completed owned free short with saved text is eligible') }
await paymentChecks()
await launchChecks()
await retryChecks()
{
  const ctx = world(), intent = await arm(ctx), row = ctx.tables.events.find(row => row.id === intent.id)
  Object.assign(row.metadata, { state: 'starting', paid_at: new Date(ctx.now - 60_000).toISOString() })
  const calls = [], launch = async (_db, saved, origin) => { calls.push({ id: saved.id, origin }); return { state: 'processing' } }
  assert.equal((await ctx.service.retryPaidFilmCompleteIntents(ctx.db, 'https://www.usekineo.com', ctx.now, launch)).scheduled, 1, 'existing cron restarts paid intent without a browser')
  assert.deepEqual(calls, [{ id: intent.id, origin: 'https://www.usekineo.com' }])
  calls.length = 0; row.metadata.launch_at = new Date(ctx.now).toISOString()
  assert.equal((await ctx.service.retryPaidFilmCompleteIntents(ctx.db, 'https://www.usekineo.com', ctx.now, launch)).scheduled, 0, 'active launch lease is respected')
  row.metadata.launch_at = null; row.metadata.paid_at = new Date(ctx.now + 60_000).toISOString()
  assert.equal((await ctx.service.retryPaidFilmCompleteIntents(ctx.db, 'https://www.usekineo.com', ctx.now, launch)).scheduled, 0, 'future payment timestamp does not arm retry')
  row.metadata.paid_at = new Date(ctx.now - 49 * 60 * 60_000).toISOString()
  assert.equal((await ctx.service.retryPaidFilmCompleteIntents(ctx.db, 'https://www.usekineo.com', ctx.now, launch)).scheduled, 0, 'old cohort is outside rescue window')
  assert.equal(calls.length, 0)
}
{
  const ctx = world(), sourceBirth = ctx.load('lib/cinematic/claim.ts')
  ctx.tables.events.push({ id: sourceBirth.cinematicClaimId(USER, 'original-generation'), name: sourceBirth.CINEMATIC_CLAIM_EVENT, user_id: USER, metadata: { response: { language: 'es', prompt: 'An original bird story with watercolor direction', aspect: '1:1' } } })
  const intent = await create(ctx)
  assert.ok(intent.prompt.includes('watercolor direction'), 'original birth request wins over a summarized topic')
  assert.equal(intent.metadata.source_aspect, '1:1')
  ctx.pay(); ctx.tables.events.find(row => row.id === intent.id).metadata.paid_session_id = 'cs_live_fixture'
  await ctx.service.startFilmComplete(ctx.db, await ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id), 'https://www.usekineo.com', ctx.io)
  assert.equal(completeRequests(ctx)[0].body.aspect, '1:1')
}
{
  const ctx = world(), route = ctx.load('app/api/film-complete/checkout/route.ts'), url = `https://www.usekineo.com/api/film-complete/checkout?v=${VIDEO}&surface=email`
  let response = await route.GET(ctx.request(url, null, { purpose: 'prefetch' }))
  assert.equal(response.status, 204)
  assert.equal(ctx.tables.events.filter(row => row.name === 'film15_full_intent').length, 0, 'prefetch does not create an intent')
  ctx.user = null; response = await route.GET(ctx.request(url))
  assert.equal(new URL(response.headers.get('location')).pathname, '/login')
  assert.equal(new URL(response.headers.get('location')).searchParams.get('redirect'), new URL(url).pathname + new URL(url).search)
  ctx.user = { id: USER }; response = await route.GET(ctx.request(url))
  const location = new URL(response.headers.get('location'))
  assert.equal(location.pathname, '/api/stripe/checkout')
  assert.equal(location.searchParams.get('tier'), 'basic')
  assert.equal(location.searchParams.get('billing'), 'monthly')
  assert.equal(location.searchParams.get('intent_campaign'), CAMPAIGN)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  await route.GET(ctx.request(url))
  assert.equal(ctx.tables.events.filter(row => row.name === 'film15_full_offer_clicked').length, 1, 'same-person click is idempotent')
  const statusRoute = ctx.load('app/api/film-complete/status/route.ts'), startRoute = ctx.load('app/api/film-complete/start/route.ts'), intent = await create(ctx)
  ctx.user = { id: OTHER }
  assert.equal((await statusRoute.GET(ctx.request(`https://www.usekineo.com/api/film-complete/status?intent=${intent.id}`))).status, 404)
  assert.equal((await startRoute.POST(ctx.request('https://www.usekineo.com/api/film-complete/start', { intentId: intent.id }))).status, 404)
  ctx.user = { id: USER }
  assert.equal((await startRoute.POST(ctx.request('https://www.usekineo.com/api/film-complete/start', { intentId: intent.id }))).status, 402)
  assert.equal((await startRoute.POST(ctx.request('https://www.usekineo.com/api/film-complete/start', { intentId: intent.id }, { origin: 'https://foreign.example' }))).status, 403)
  assert.equal(ctx.requests.length, 0)
}

const source = read(SERVER)
const mutants = [
  ['owner binding', 'if (!FILM_COMPLETE_UUID.test(id)) return null', `userId = '${USER}'; if (!FILM_COMPLETE_UUID.test(id)) return null`, identityChecks],
  ['unpaid generation', "if (!text(intent.metadata.paid_session_id)) return filmCompleteStatus(db, intent)", 'if (false) return filmCompleteStatus(db, intent)', paymentChecks],
  ['positive money required', "!(typeof session.amount_total === 'number' && session.amount_total > 0)", "!(typeof session.amount_total === 'number' && session.amount_total >= 0)", paymentChecks],
  ['rewrite frozen screenplay', 'let dispatchPrompt = text(intent.metadata.dispatch_prompt)', "let dispatchPrompt = ''", retryChecks],
  ['wrong script mode', "script_mode: 'verbatim', allow_shorter_duration", "script_mode: 'ai', allow_shorter_duration", launchChecks],
  ['lease bypass', ": lease.is('metadata->>launch_at', null)", ': lease', launchChecks],
  ['saved narration dropped', 'source_script: script, source_topic: topic,', "source_script: '', source_topic: topic,", identityChecks],
]
for (const [label, before, after, checks] of mutants) {
  assert.equal(source.split(before).length, 2, 'unique mutation: ' + label)
  await assert.rejects(checks({ [SERVER]: source.replace(before, after) }), undefined, 'guardian kills: ' + label)
}
const constants = read(CONSTANTS)
assert.equal(constants.split('export const FILM_COMPLETE_TARGET_SECONDS = 35').length, 2)
await assert.rejects(copyChecks({ [CONSTANTS]: constants.replace('export const FILM_COMPLETE_TARGET_SECONDS = 35', 'export const FILM_COMPLETE_TARGET_SECONDS = 60') }), undefined, 'guardian kills target duration drift')
console.log(`upsell-filme15 runtime: owner snapshot, paid webhook, frozen launch+retry, no-browser rescue, auth routes, UI/email wiring; ${mutants.length + 1} source mutants killed; zero network`)
