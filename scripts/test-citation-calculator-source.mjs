import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

// Executes actual browser capture/payload and acquisition policy offline.
// The only fetch is intercepted; no authenticated request or DB write exists.
const file = 'app/cheapest-ai-shorts-maker/page.tsx'
const source = fs.readFileSync(file, 'utf8')
const prior = execFileSync('git', ['show', `fb166d8f:${file}`], { encoding: 'utf8' })
function signupHref(text) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let href
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'signupUrl') {
      assert.ok(node.initializer && ts.isStringLiteral(node.initializer))
      href = node.initializer.text
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(href)
  assert.match(text, /OrganicCtaLink href=\{signupUrl\} source="push22_cheapest" placement="final"/)
  return href
}
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), clear: () => map.clear() } }
function journey(href, landingSearch, referrer, returnThroughOAuth = false) {
  const sessionStorage = storage(), localStorage = storage(), cookies = new Map(), sent = []
  const document = { referrer,
    get cookie() { return [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') },
    set cookie(value) { const pair=value.split(';')[0], at=pair.indexOf('='); cookies.set(pair.slice(0,at),pair.slice(at+1)) },
  }
  const window = { location: { search: landingSearch, hostname: 'www.usekineo.com', protocol: 'https:' } }
  const load = createOfflineLoader({ globals: { window, document, sessionStorage, localStorage,
    fetch: (url, options) => { assert.equal(url, '/api/track-signup-source'); sent.push(JSON.parse(options.body)); return Promise.resolve({ ok: true, json: async () => ({ ok: true }) }) },
  } })
  const analytics=load('lib/analytics.ts'), policy=load('lib/acquisitionSource.ts')
  analytics.captureUtmsOnce(); analytics.captureSourceOnce()
  window.location.search = new URL(href,'https://www.usekineo.com').search
  document.referrer = 'https://www.usekineo.com/cheapest-ai-shorts-maker'
  analytics.captureUtmsOnce(); analytics.captureSourceOnce()
  const campaign = new URLSearchParams(window.location.search).get('intent_campaign')
  if (campaign) analytics.rememberSignupCampaign(campaign)
  if (returnThroughOAuth) { sessionStorage.clear(); localStorage.clear(); document.referrer='https://accounts.google.com/'; window.location.search='' }
  analytics.trackSignupSource()
  assert.equal(sent.length,1)
  const body=sent[0]
  return { body, resolved: policy.acquisitionSource({ utmSource:body.signup_utm_source, legacyUtmSource:body.utm_source, referrer:body.signup_referrer }) }
}

const oldHref=signupHref(prior), currentHref=signupHref(source)
assert.equal(journey(oldHref,'','https://chatgpt.com/').resolved,'seo','Reproduce wrong source on baseline')
for (const [query,ref,expected] of [
  ['', 'https://chatgpt.com/', 'chatgpt'],
  ['?utm_source=chatgpt', '', 'chatgpt'],
  ['', 'https://www.google.com/', 'google'],
  ['', '', 'direct'],
  ['?utm_source=taaft&utm_campaign=external_campaign', 'https://theresanaiforthat.com/', 'taaft'],
]) {
  const {body,resolved}=journey(currentHref,query,ref)
  assert.equal(resolved,expected,`Real capture preserves ${expected}`)
  assert.equal(body.signup_utm_campaign,query.includes('external_campaign')?'external_campaign':'push22_cheapest')
  assert.notEqual(body.signup_utm_source,'seo')
}
const returned=journey(currentHref,'','https://chatgpt.com/',true)
assert.equal(returned.resolved,'chatgpt','First-party cookies preserve source through OAuth/session reset')
assert.equal(returned.body.signup_utm_campaign,'push22_cheapest')
const signup=fs.readFileSync('app/(auth)/signup/page.tsx','utf8')
assert.match(signup,/params\.get\('intent_campaign'\)/)
assert.match(signup,/if \(intentCampaign\) rememberSignupCampaign\(intentCampaign\)/)
assert.equal(new URL(currentHref,'https://www.usekineo.com').pathname,'/signup')
console.log('PASS: calculator CTA, actual capture + signup payload, ChatGPT referrer/UTM, Google, direct, prior campaign, OAuth-cookie return; wrong seo baseline reproduced. No network or DB.')
