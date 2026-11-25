// Exercise the mounted offer and the real film checkout handler without network or billing providers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const filmId = '00000000-0000-4000-8000-000000000001'
const locales = 'en pt es fr de it nl pl tr ru uk ar ur hi id vi'.split(' ')
const shared = 'lib/growth/filmComplete.ts'
const component = 'components/FilmReadyFullVersionUpsell.tsx'
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n')

function fixture(creator = true, forceCreatorMetadata = false) {
  let locale = 'en', welcome = false
  const events = [], modules = new Map()
  let checkout
  let mounted = null
  const measuredHooks = {
    ...React,
    useEffect(effect, deps) {
      if (mounted) mounted.effects.push(effect)
      else React.useEffect(effect, deps)
    },
    useRef(value) { return mounted ? { current: value } : React.useRef(value) },
  }
  class TestIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback
      this.threshold = options.threshold
      mounted.observer = this
    }
    observe(target) { this.target = target }
    disconnect() { this.connected = false }
    emit(ratio) { this.callback([{ isIntersecting: true, intersectionRatio: ratio }]) }
  }
  const intent = { id: filmId, sourceVideoId: filmId, metadata: {surface: 'film_ready'} }
  const mocks = {
    '@/components/InterfaceLanguage': {useInterfaceLanguage: () => locale},
    '@/lib/growth/useWelcome20Deadline': { useWelcome20OfferLive: () => welcome },
    '@/lib/analytics': { trackEvent(name, metadata) {
      assert(mounted, 'SSR must not track')
      mounted.events.push({ name, metadata })
    } },
    '@/lib/supabase/server': { createClient: () => ({auth: {getUser: async () => ({data:{user:{id:'owner'}}})}}) },
    '@/lib/filmComplete/server': {
      filmCompleteAdmin: () => ({from: () => ({insert: async event => events.push(event)})}),
      createFilmCompleteIntent: async (_db, _owner, id, surface) => id === filmId ? {...intent,metadata:{surface}} : null,
      loadFilmCompleteIntent: async () => intent,
    },
    'next/server': {NextResponse: class extends Response { static redirect(url) {return new Response(null,{status:307,headers:{location:url.href}})} }},
  }
  function load(name) {
    if (modules.has(name)) return modules.get(name)
    let source = read(name)
    if (name === shared && !creator) {
      const releaseOn = "FILM_READY_CREATOR_PRIMARY_2511 = 'on'"
      assert.equal(source.split(releaseOn).length, 2, 'rollback edits exactly one shipped switch')
      source = source.replace(releaseOn, "FILM_READY_CREATOR_PRIMARY_2511 = 'off'")
    }
    if (name === shared && forceCreatorMetadata) {
      // F2: attribution always claims Creator, even with the release OFF.
      const guard = "return FILM_READY_CREATOR_PRIMARY_2511 === 'on'"
      assert.equal(source.split(guard).length, 2, 'F2 must edit exactly one gate')
      source = source.replace(guard, 'return true')
    }
    const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
    const exports = {}
    modules.set(name,exports)
    function importing(id) {
      if (name === component && id === 'react') return measuredHooks
      if (id in mocks) return mocks[id]
      if (!id.startsWith('@/') && !id.startsWith('.')) return require(id)
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(name),id)
      const resolved = ['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(path.join(root,p)))
      assert(resolved, id)
      return load(resolved)
    }
    vm.runInNewContext(js,{exports,require:importing,URL,URLSearchParams,Response,console,IntersectionObserver:TestIntersectionObserver,process:{env:{}}},{filename:name})
    return exports
  }
  const Offer = load(component).default
  const route = load('app/api/film-complete/checkout/route.ts')
  async function destination(href) {
    const url = new URL(href,'https://example.test')
    const response = await route.GET({url:url.href,nextUrl:url,headers:new Headers()})
    const result = checkout = new URL(response.headers.get('location'))
    assert.equal(result.pathname,'/api/stripe/checkout')
    assert.equal(result.searchParams.get('film_complete'),filmId)
    assert.equal(result.searchParams.get('billing'),'monthly')
    return result.searchParams.get('tier')
  }
  function retryLink() {
    const stripe = read('app/api/stripe/checkout/route.ts')
    const cancel = stripe.slice(stripe.indexOf('    sessionParams.cancel_url = `${appUrl}/film-complete'),stripe.indexOf('  // #481'))
    assert(cancel.includes("req.nextUrl.searchParams.get('film_offer')"))
    const page = read('app/film-complete/page.tsx')
    const resume = page.slice(page.indexOf('  const resumeExperiment'),page.indexOf('  const offer ='))
    const anchor = page.match(/<a href=\{(`\/api\/film-complete\/checkout\?intent=[^`]+`)\}/)
    assert(anchor && resume)
    const checkoutMetadata = {}
    const params = vm.runInNewContext(cancel.trimEnd().replace(/\}\s*$/, '')+'\nsessionParams.cancel_url',{
      checkoutMetadata,req:{nextUrl:checkout},sessionParams:{},appUrl:'https://example.test',filmCompleteIntent:intent,
      tier:checkout.searchParams.get('tier'),FILM_READY_CREATOR_VERSION:load(shared).FILM_READY_CREATOR_VERSION,
    })
    assert.equal(checkoutMetadata.film_offer_version,checkout.searchParams.get('film_offer') ?? undefined)
    return vm.runInNewContext(resume+';\n'+anchor[1].replace('intentId!', 'intentId'),{
      params:new URL(params).searchParams,cancelled:true,intentId:filmId,FILM_READY_CREATOR_VERSION:load(shared).FILM_READY_CREATOR_VERSION,
    })
  }
  function measurePrimaryOffer() {
    locale = 'en'
    welcome = false
    const capture = { effects: [], events: [] }
    mounted = capture
    try {
      const markup = Offer({ videoId: filmId })
      const target = {}
      markup.ref.current = target
      const dispose = capture.effects.map(effect => effect())
      try {
        const observer = capture.observer
        assert.equal(observer.threshold, 0.5)
        assert.equal(observer.target, target)
        assert.equal(capture.events.length, 0, 'mounting is not an impression')
        observer.emit(0.49)
        assert.equal(capture.events.length, 0, '49% visible is not an impression')
        observer.emit(0.5)
        observer.emit(0.75)
        assert.equal(capture.events.length, 1, 'a visible film emits one impression')
        React.Children.toArray(markup.props.children).find(child => child.type === 'a').props.onClick()
        assert.equal(capture.events.length, 2, 'click emits its own event')
        return capture.events
      } finally {
        for (const cleanup of dispose) cleanup?.()
      }
    } finally {
      mounted = null
    }
  }
  return {events,load,destination,retryLink,measurePrimaryOffer,render(id,lang,live){
    locale=lang;welcome=live
    return renderToStaticMarkup(React.createElement(Offer,{videoId:id}))
  }}
}

function checkMeasurements(f, creator) {
  const fc = f.load(shared)
  const expectedTier = creator ? 'basic' : 'starter'
  const expectedVersion = creator ? fc.FILM_READY_CREATOR_VERSION : fc.FILM_COMPLETE_OFFER_VERSION
  const [viewed, clicked] = f.measurePrimaryOffer()
  assert.equal(viewed.name, 'film15_full_offer_viewed')
  assert.equal(clicked.name, 'film15_full_offer_clicked')
  for (const event of [viewed, clicked]) {
    assert.equal(event.metadata.surface, 'film_ready')
    assert.equal(event.metadata.video_id, filmId)
    assert.equal(event.metadata.offer_tier, expectedTier, (creator ? 'ON' : 'OFF') + ' ' + event.name + ' tier')
    assert.equal(event.metadata.offer_version, expectedVersion, (creator ? 'ON' : 'OFF') + ' ' + event.name + ' version')
  }
}
const shipped = fixture()
checkMeasurements(shipped, true)
assert.throws(() => checkMeasurements(fixture(false), true), {
  code: 'ERR_ASSERTION',
  message: /ON film15_full_offer_viewed tier/,
})
console.log('Mutant killed: switching the shipped Creator offer off fails the ON impression.')

assert.throws(() => checkMeasurements(fixture(false, true), false), {
  code: 'ERR_ASSERTION',
  message: /OFF film15_full_offer_viewed tier/,
})
console.log('F2 killed: with the release OFF, forcing Creator attribution fails the visible Starter impression.')

for (const creator of [true, false]) {
  const f = creator ? shipped : fixture(false)
  checkMeasurements(f, creator)
  const fc=f.load(shared), pricing=f.load('lib/checkoutPricing.ts')
  const {filmCompleteCopy,filmCompleteEmailHref}=f.load('lib/growth/filmCompleteCopy.ts')
  assert.equal(f.render(null,'en',false),'')
  for (const locale of locales) {
    for (const promo of [false,true]) {
      const html = f.render(filmId,locale,promo)
      const links=Array.from(html.matchAll(/<a\s+href="([^"]+)"/g), m=>m[1].replaceAll('&amp;','&'))
      assert.equal(links.length,2)
      const expected=creator?'basic':'starter'
      assert.equal(await f.destination(links[0]),expected)
      assert.equal(f.events.at(-1).metadata.offer_tier,expected)
      assert.equal(f.events.at(-1).metadata.offer_version,creator?fc.FILM_READY_CREATOR_VERSION:fc.FILM_COMPLETE_OFFER_VERSION)
      assert.equal(await f.destination(links[1]),creator?'starter':'basic')
      const copy=filmCompleteCopy(locale,promo,creator?'off':'on')
      assert(html.includes(copy.billing))
      assert(copy.billing.includes(pricing.formatCheckoutMoney('usd',pricing.TIER_PRICES[expected].usd)))
      assert(!html.includes('undefined'))
    }
  }
  assert.equal(await f.destination(filmCompleteEmailHref('https://example.test',filmId)), 'starter')
  assert.equal(f.events.at(-1).metadata.offer_version,fc.FILM_COMPLETE_OFFER_VERSION)
  const visibleLinks=Array.from(f.render(filmId,'en',false).matchAll(/<a\s+href="([^"]+)"/g),m=>m[1].replaceAll('&amp;','&'))
  for (const [index,link] of visibleLinks.entries()) {
    const tier = await f.destination(link)
    const retry = f.retryLink()
    if(creator) {
      assert.equal(await f.destination(retry),tier)
      assert.equal(f.events.at(-1).metadata.offer_version,fc.FILM_READY_CREATOR_VERSION)
    } else if(index===0) {
      assert.equal(await f.destination(retry),'starter')
      assert.equal(f.events.at(-1).metadata.offer_version,fc.FILM_COMPLETE_OFFER_VERSION)
    }
  }
  for (const old of [`?v=${filmId}&surface=film_ready&plan=creator`, `?intent=${filmId}`, `?v=${filmId}&surface=email&plan=creator&offer=${fc.FILM_READY_CREATOR_VERSION}`]) {
    await f.destination('/api/film-complete/checkout'+old)
    assert.equal(f.events.at(-1).metadata.offer_version,fc.FILM_COMPLETE_OFFER_VERSION)
  }
}
console.log('Passed: OFF/ON × 16 languages × 2 offer states; both checkout links, prices, attribution, email and missing film.')

