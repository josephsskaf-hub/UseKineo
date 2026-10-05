import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const FILE='lib/clips/clipEffectPages.ts'
const dict=JSON.parse(fs.readFileSync('lib/ui/refinementCopy.json','utf8'))
const read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')
function load(mutation=null,off=false,paused=false){
  return createOfflineLoader({
    mocks:{
      '@/lib/ui/refinementCopy.json':dict,
      ...(paused?{'@/lib/engineLaunch':{enginePaused:()=>({})}}:{}),
    },
    source:(file,text)=>{
      if(file===FILE&&off)text=text.replace('CLIP_EFFECT_PAGES_PUBLIC = true','CLIP_EFFECT_PAGES_PUBLIC = false')
      return mutation&&file===FILE?text.replace(mutation[0],mutation[1]):text
    },
  })(FILE)
}
function check(data) {
  const effects=data.publicEffectPages(),entries=data.effectSitemapEntries()
  assert.equal(effects.length,9)
  assert.equal(entries.length,144)
  assert.equal(new Set(entries.map(e=>e.url)).size,144)
  assert.equal(data.effectPage('product_360'),null)
  assert.equal(data.effectPage('cartoon-3d'),null)
  assert.equal(data.effectLanguage('invalid'),null)
  assert.equal(data.effectPage('melt').key,'melt')
  assert.equal(data.effectPage('product-360').key,'product_360')
  const titles=new Set()
  for(const effect of effects){
    const slug=data.effectSlug(effect)
    assert.ok(fs.existsSync('public'+effect.preview.video))
    assert.ok(fs.existsSync('public'+effect.preview.poster))
    const guest=new URL(data.effectDestination(effect,false),'https://www.usekineo.com')
    assert.equal(guest.pathname,'/signup')
    const destination=new URL(guest.searchParams.get('redirect'),'https://www.usekineo.com')
    assert.equal(destination.pathname,'/clips')
    assert.equal(destination.searchParams.get('effect'),effect.key)
    assert.equal(destination.searchParams.get('clip_origin'),'effect_page')
    assert.equal(data.effectDestination(effect,true),destination.pathname+destination.search)
    assert.deepEqual(Object.keys(data.effectPageCard(effect)).sort(),['engine','key','preview','sub','title'])
    for(const language of data.EFFECT_PAGE_LANGUAGES){
      const expected=data.EFFECT_BASE+data.effectPagePath(slug,language)
      const meta=data.effectMetadata(effect,language)
      assert.ok(meta.title.absolute.includes(dict[language][effect.title]))
      assert.ok(meta.description.includes(dict[language][effect.sub]))
      assert.equal(meta.alternates.canonical,expected)
      assert.equal(meta.openGraph.url,expected)
      assert.equal(meta.openGraph.images[0].url,data.EFFECT_BASE+effect.preview.poster)
      assert.equal(Object.keys(meta.alternates.languages).length,17)
      assert.ok(entries.some(e=>e.url===expected))
      titles.add(meta.title.absolute)
      for(const key of [...data.EFFECT_PAGE_COPY,effect.title,effect.sub]){
        assert.ok(typeof dict[language][key]==='string'&&dict[language][key].trim(),language+': '+key)
      }
    }
  }
  assert.ok(titles.size>=130,'Specific translated titles')
}
check(load())
assert.equal(load(null,true).publicEffectPages().length,0)
assert.equal(load(null,true).effectSitemapEntries().length,0)
assert.equal(load(null,true).effectPage('melt'),null)
assert.equal(load(null,false,true).publicEffectPages().length,0)
const client=read('app/effects/EffectPageClient.tsx')
assert.ok(!/\.credits|clipCreditCost|\bprice\b/.test(client),'No price on effect page/card')
assert.ok(client.includes('effectDestination(effect, signedIn)'))
assert.ok(client.includes('effectText(language, text)'))
assert.ok(client.includes('interfaceLanguageIsRtl(language)'))
assert.ok(read('app/effects/EffectPage.tsx').includes('signedIn={!!user}'))
assert.ok(read('app/effects/[slug]/page.tsx').includes("effectMetadata(effect, 'en')"))
assert.ok(read('app/effects/[slug]/[lang]/page.tsx').includes('effectMetadata(effect, language)'))
assert.ok(read('app/sitemap.ts').includes('...effectSitemapEntries(),'))
const media=read('app/effects/EffectPreview.tsx')
assert.ok(media.includes('src={visible ? video : undefined}'))
assert.ok(media.includes("document.visibilityState === 'visible'"))
assert.ok(media.includes('prefers-reduced-motion: reduce'))
const variants=[
 ['wrong handoff', "'/clips?'", "'/studio?'"],
 ['wrong effect key', 'effect: effect.key,', "effect: 'melt',"],
 ['same metadata for every page', 'effectText(language, effect.title) +', "'All clips' +"],
 ['English-only sitemap', 'EFFECT_PAGE_LANGUAGES.map(language => ({', "['en'].map(language => ({"],
 ['underscore URLs', "effect.key.replaceAll('_', '-')", 'effect.key'],
]
for(const [name,from,to] of variants){
  assert.ok(read(FILE).includes(from),'Anchor: '+name)
  assert.throws(()=>check(load([from,to])),undefined,'Mutant: '+name)
  console.log('Mutant rejected: '+name)
}
assert.ok(read(FILE).includes('CLIP_EFFECT_PAGES_PUBLIC && CLIPS_PUBLIC && CLIP_EFFECTS_PUBLIC'))
assert.notEqual(load(['CLIP_EFFECT_PAGES_PUBLIC && CLIPS_PUBLIC && CLIP_EFFECTS_PUBLIC','true'],true).effectSitemapEntries().length,0,'Off-switch mutant detected')
console.log('PASS: 9 effect pages × 16 languages, real previews, SEO, signup handoff, price-free cards, 6 mutants.')

