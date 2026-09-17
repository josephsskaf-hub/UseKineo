import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const load = createOfflineLoader()
const intent = load('lib/growth/engineLandingIntent.ts')
const previousSource = execFileSync('git', ['show', '17e1dfd8:lib/growth/engineLandingIntent.ts'], { encoding: 'utf8' })
const previous = {}
vm.runInNewContext(ts.transpileModule(previousSource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, { exports: previous, URLSearchParams })

const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,String(v)), clear: () => map.clear() } }
function journey(href, search, referrer, oauth = false) {
  const sessionStorage=storage(), localStorage=storage(), cookies=new Map(), sent=[]
  const document={referrer,
    get cookie(){return [...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},
    set cookie(v){const pair=v.split(';')[0], at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1))},
  }
  const window={location:{search,hostname:'www.usekineo.com',protocol:'https:'}}
  const capture=createOfflineLoader({globals:{window,document,sessionStorage,localStorage,
    fetch:(url,options)=>{assert.equal(url,'/api/track-signup-source');sent.push(JSON.parse(options.body));return Promise.resolve({ok:true,json:async()=>({ok:true})})},
  }})
  const analytics=capture('lib/analytics.ts'), policy=capture('lib/acquisitionSource.ts')
  analytics.captureUtmsOnce();analytics.captureSourceOnce()
  window.location.search=new URL(href,'https://www.usekineo.com').search
  document.referrer='https://www.usekineo.com/ai-video-generator/seedance'
  analytics.captureUtmsOnce();analytics.captureSourceOnce()
  analytics.rememberSignupCampaign(new URLSearchParams(window.location.search).get('intent_campaign'))
  if(oauth){sessionStorage.clear();localStorage.clear();window.location.search='';document.referrer='https://accounts.google.com/'}
  analytics.trackSignupSource();assert.equal(sent.length,1)
  const body=sent[0]
  return {body,resolved:policy.acquisitionSource({utmSource:body.signup_utm_source,legacyUtmSource:body.utm_source,referrer:body.signup_referrer})}
}

const oldHref=previous.buildEngineLandingSignupHref({engine:'seedance',campaign:'seo_engine_seedance'})
assert.equal(journey(oldHref,'','https://chatgpt.com/').resolved,'seo','Old Seedance link mislabels a ChatGPT referrer')
for(const engine of intent.ENGINE_LANDING_PARAMS){
  const campaign=`seo_engine_${engine}`, href=intent.buildEngineLandingSignupHref({engine,campaign})
  const url=new URL(href,'https://www.usekineo.com')
  const original=new URL(previous.buildEngineLandingSignupHref({engine,campaign}),'https://www.usekineo.com')
  assert.equal(url.searchParams.get('redirect'),original.searchParams.get('redirect'),'Destination and selected engine unchanged')
  assert.equal(url.searchParams.get('intent_campaign'),campaign)
  for(const [search,ref,expected] of [
    ['', 'https://chatgpt.com/', 'chatgpt'],
    ['?utm_source=chatgpt.com', '', 'chatgpt'],
    ['', 'https://www.google.com/', 'google'],
    ['', '', 'direct'],
    ['?utm_source=taaft&utm_campaign=external_campaign','https://theresanaiforthat.com/','taaft'],
  ]){
    const result=journey(href,search,ref)
    assert.equal(result.resolved,expected,`${engine}: real capture preserves ${expected}`)
    assert.equal(result.body.signup_utm_campaign,search.includes('external_campaign')?'external_campaign':campaign)
  }
  const returned=journey(href,'','https://chatgpt.com/',true)
  assert.equal(returned.resolved,'chatgpt')
  assert.equal(returned.body.signup_utm_campaign,campaign)
  for(const key of ['utm_source','utm_medium','utm_campaign'])assert.equal(url.searchParams.has(key),false)
}
const page=fs.readFileSync('app/ai-video-generator/[engine]/page.tsx','utf8')
assert.ok(page.includes('buildEngineLandingSignupHref({ engine: e.param, campaign })'))
console.log('PASS: actual engine links and analytics payload preserve source/campaign/redirect for every declared engine, external UTM and OAuth cookie return; wrong seo baseline reproduced. No network or database.')
