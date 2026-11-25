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
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n')

function fixture(creator) {
  let locale = 'en', welcome = false
  const events = [], modules = new Map()
  const intent = { id: filmId, sourceVideoId: filmId, metadata: {surface: 'film_ready'} }
  const mocks = {
    '@/components/InterfaceLanguage': {useInterfaceLanguage: () => locale},
    '@/lib/growth/useWelcome20Deadline': { useWelcome20OfferLive: () => welcome },
    '@/lib/analytics': { trackEvent() { throw Error('SSR must not track') } },
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
    if (name === shared && creator) {
      assert(source.includes("FILM_READY_CREATOR_PRIMARY_2511 = 'off'"))
      source = source.replace("FILM_READY_CREATOR_PRIMARY_2511 = 'off'", "FILM_READY_CREATOR_PRIMARY_2511 = 'on'")
    }
    const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
    const exports = {}
    modules.set(name,exports)
    function importing(id) {
      if (id in mocks) return mocks[id]
      if (!id.startsWith('@/') && !id.startsWith('.')) return require(id)
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(name),id)
      const resolved = ['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(path.join(root,p)))
      assert(resolved, id)
      return load(resolved)
    }
    vm.runInNewContext(js,{exports,require:importing,URL,URLSearchParams,Response,console,process:{env:{}}},{filename:name})
    return exports
  }
  const Offer = load('components/FilmReadyFullVersionUpsell.tsx').default
  const route = load('app/api/film-complete/checkout/route.ts')
  async function destination(href) {
    const url = new URL(href,'https://example.test')
    const response = await route.GET({url:url.href,nextUrl:url,headers:new Headers()})
    const result = new URL(response.headers.get('location'))
    assert.equal(result.pathname,'/api/stripe/checkout')
    assert.equal(result.searchParams.get('film_complete'),filmId)
    assert.equal(result.searchParams.get('billing'),'monthly')
    return result.searchParams.get('tier')
  }
  return {events,load,destination,render(id,lang,live){
    locale=lang;welcome=live
    return renderToStaticMarkup(React.createElement(Offer,{videoId:id}))
  }}
}

for (const creator of [false,true]) {
  const f = fixture(creator)
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
}
console.log('Passed: OFF/ON × 16 languages × 2 offer states; both checkout links, prices, attribution, email and missing film.')

