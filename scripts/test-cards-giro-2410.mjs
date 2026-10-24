// KINEO-CARDS-GIRO-2410 — actual playback controller, SSR, local assets and unchanged click contract; offline.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
const ROOT = process.cwd(), BASE = '1c078ed013302ac47c42f783305df688c4e97cfd'
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const rd = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
const PURE = 'lib/ui/homeThreeCards.ts', PLAYER = 'lib/ui/homeCardPlayback.ts', MEDIA = 'components/home/HomeCardCycleMedia.tsx'
let checks = 0, mutants = 0
const ok = (condition, message) => { assert.ok(condition, message); checks++ }
const compiled = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
function moduleOf(source, globals = {}, imports = {}) {
  const module = { exports: {} }
  vm.runInNewContext(compiled(source), { module, exports:module.exports, require:id=>{ if (Object.hasOwn(imports,id)) return imports[id]; throw Error('Unexpected import: '+id) }, ...globals }, {timeout:5000})
  return module.exports
}
const pure = moduleOf(rd(PURE))

function fakeTarget() {
  const listeners = new Map()
  return { addEventListener(name, fn) { if (!listeners.has(name))listeners.set(name,new Set()); listeners.get(name).add(fn) }, removeEventListener(name,fn) { listeners.get(name)?.delete(fn) }, emit(name, detail={}) { for(const fn of [...(listeners.get(name)??[])])fn({target:this,currentTarget:this,...detail}) }, count() { return [...listeners.values()].reduce((n,s)=>n+s.size,0) } }
}
function mount(source = rd(PLAYER), { reduced=false, noObserver=false, clips } = {}) {
  const requests = [], motion = Object.assign(fakeTarget(),{matches:reduced}), document = Object.assign(fakeTarget(),{hidden:false}), observers=[]
  const videos = [0,1].map(slot=>{
    const attrs = new Map(), vars = new Map()
    const video = Object.assign(fakeTarget(),{slot, attrs, vars, style:{zIndex:'',setProperty:(name,value)=>vars.set(name,value)}, paused:true, playCalls:0, loads:0, currentTime:0, ended:false, preload:'none', poster:'',
      hasAttribute:name=>attrs.has(name), getAttribute:name=>attrs.get(name)??null, setAttribute:(name,value)=>attrs.set(name,value), removeAttribute:name=>attrs.delete(name),
      pause(){this.paused=true}, play(){this.paused=false;this.playCalls++;return Promise.resolve()},load(){this.loads++},
    })
    Object.defineProperty(video,'src',{get(){return attrs.get('src')??''},set(value){attrs.set('src',value);this.ended=false;this.currentTime=0;requests.push({slot,src:value})}})
    return video
  })
  const root = {querySelectorAll:()=>videos}, window = { matchMedia:()=>motion }, timer = ()=>{throw Error('fixed timer is forbidden')}
  class Observer {constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}
  const controller = moduleOf(source,{window,document,IntersectionObserver:noObserver?undefined:Observer,setTimeout:timer,setInterval:timer})
  Object.assign(window,{setTimeout:timer,setInterval:timer})
  const list = clips??[0,1,2].map(i=>({src:`/previews/${i}.mp4`,poster:`/posters/${i}.webp`,objectPosition:`50% ${i*10}%`,mobileObjectPosition:`50% ${i*15}%`,...(i===0?{scale:1.1}:i===2?{scale:1.05}:{})}))
  const cleanup = controller.attachHomeCardPlayback(root,list)
  return {videos,list,requests,cleanup,motion,document,visible(value){for(const observer of observers)if(!observer.disconnected)observer.fn([{isIntersecting:value,intersectionRatio:value?1:0}])},reduce(value){motion.matches=value;motion.emit('change')},hidden(value){document.hidden=value;document.emit('visibilitychange')},on(video,name,detail){video.emit(name,detail)},observers}
}

function playbackProof(source=rd(PLAYER)) {
  const h=mount(source), [a,b]=h.videos
  assert.equal(h.requests.length,0,'no video bytes before viewport')
  h.visible(true)
  assert.equal(a.src,h.list[0].src,'first visible clip starts at zero')
  assert.equal(b.src,'','next waits for active playing')
  assert.equal(a.preload,'none','active consumes through play, not eager preload')
  assert.equal(a.vars.get('--home-clip-scale'),'1.1','first clip gets its own scale')
  a.emit('playing')
  assert.equal(a.getAttribute('data-on'),'','first playing reveals first')
  assert.equal(b.src,h.list[1].src,'only the next clip is prepared')
  assert.equal(b.preload,'auto','hidden next may preload')
  assert.equal(b.vars.get('--home-clip-scale'),'1','unscaled next does not inherit the first clip zoom')
  assert.equal(h.requests.length,2,'third clip remains unassigned')
  assert.equal(b.playCalls,0,'hidden next has no preroll')
  a.emit('timeupdate')
  assert.equal(b.playCalls,0,'timeupdate cannot advance')
  a.ended=true;a.emit('ended')
  assert.equal(b.playCalls,1,'ended requests next playback')
  assert.equal(b.hasAttribute('data-on'),false,'incoming stays hidden until playing')
  const requests=h.requests.length;a.emit('ended')
  assert.equal(h.requests.length,requests,'duplicate ended does not skip a clip')
  b.emit('playing')
  assert.equal(b.getAttribute('data-on'),'','incoming revealed only when decoded and playing')
  assert.equal(a.src,h.list[0].src,'outgoing source stays intact throughout fade')
  assert.equal(a.getAttribute('data-on'),'','outgoing final frame remains under incoming')
  assert.equal(h.requests.length,2,'third cannot overwrite outgoing during fade')
  b.emit('transitionend',{propertyName:'transform'})
  assert.equal(a.src,h.list[0].src,'only opacity transition can release outgoing')
  b.emit('transitionend',{propertyName:'opacity'})
  assert.equal(a.src,h.list[2].src,'third is assigned after fade')
  assert.equal(a.hasAttribute('data-on'),false,'recycled buffer stays hidden')
  assert.equal(a.preload,'auto','recycled buffer preloads next only')
  assert.equal(a.vars.get('--home-clip-position'),h.list[2].objectPosition,'recycled clip gets its own desktop framing')
  assert.equal(a.vars.get('--home-clip-mobile-position'),h.list[2].mobileObjectPosition,'recycled clip gets its own mobile framing')
  assert.equal(a.vars.get('--home-clip-scale'),'1.05','recycled buffer receives its clip scale')
  b.ended=true;b.emit('ended');a.emit('playing');a.emit('transitionend',{propertyName:'opacity'})
  assert.equal(b.src,h.list[0].src,'third returns to first without skipping')
  h.visible(false)
  assert.ok(h.videos.every(v=>v.paused),'offscreen pauses both buffers')
  const before=h.requests.length;b.emit('ended')
  assert.equal(h.requests.length,before,'offscreen ended cannot request another source')
  h.visible(true);h.hidden(true)
  assert.ok(h.videos.every(v=>v.paused),'hidden document pauses both buffers')
  h.hidden(false);h.reduce(true)
  assert.ok(h.videos.every(v=>v.src===''&&v.preload==='none'&&v.paused),'reduced motion clears buffers and leaves first SSR poster')
  const reducedRequests=h.requests.length
  a.emit('playing');a.emit('ended')
  assert.equal(h.requests.length,reducedRequests,'late events under reduced motion cannot load or advance')
  h.cleanup()
  assert.ok(h.videos.every(v=>v.count()===0),'cleanup removes every video listener')
  assert.equal(h.motion.count(),0,'cleanup removes motion listener')
  assert.equal(h.document.count(),0,'cleanup removes visibility listener')
  assert.ok(h.observers.every(o=>o.disconnected),'cleanup disconnects viewport observer')
  const reduced=mount(source,{reduced:true});reduced.visible(true)
  assert.equal(reduced.requests.length,0,'initial reduced motion downloads no video')
  reduced.cleanup()
  const fallback=mount(source,{noObserver:true})
  assert.equal(fallback.requests.length,1,'no observer fallback still starts only first')
  fallback.cleanup()
  const one=mount(source,{clips:[h.list[0]]});one.visible(true);one.videos[0].emit('playing');one.videos[0].ended=true;one.videos[0].emit('ended')
  assert.equal(one.videos[1].src,'','one-clip fallback never loads duplicate buffer')
  assert.equal(one.videos[0].currentTime,0,'one-clip fallback restarts on ended')
  one.cleanup()
}

function ssrProof(source=rd(MEDIA), lib=pure) {
  const media=moduleOf(source,{}, {react:React,'react/jsx-runtime':require('react/jsx-runtime'),'@/lib/ui/homeThreeCards':lib,'@/lib/ui/homeCardPlayback':{attachHomeCardPlayback(){throw Error('SSR must not run playback')}}})
  for(const card of ['films','product_ads','ugc_ads','kids_cartoon'])for(const language of ['en','pt']) {
    const html=renderToStaticMarkup(React.createElement(media.default,{card,language})), first=lib.homeCardClips(card,language)[0]
    assert.ok(html.includes(first.poster),'SSR paints first clip poster')
    assert.ok(html.includes('data-home-cycle="'+card+'"'),'same shared component identifies every card')
    const videos=html.match(/<video\b[^>]*>/g)??[]
    assert.equal(videos.length,2,'exactly two persistent video buffers')
    for(const video of videos){assert.ok(!/\ssrc=|\sautoPlay=|\sloop=/.test(video),'SSR starts no media download or endless single loop');assert.ok(video.includes('preload="none"')&&video.includes('muted=""')&&video.includes('playsinline=""'),'SSR buffers are muted inline and preload none')}
    assert.ok(html.includes('--home-clip-position:'+first.objectPosition),'SSR poster has clip desktop framing')
    assert.ok(html.includes('--home-clip-mobile-position:'+(first.mobileObjectPosition??first.objectPosition)),'SSR poster has clip mobile framing')
    assert.ok(html.includes('--home-clip-scale:'+(first.scale??1)),'SSR poster preserves the first clip scale')
  }
  assert.ok(media.HOME_CARD_CYCLE_CSS.includes('transition:opacity'),'fade is visual opacity transition')
  assert.ok(media.HOME_CARD_CYCLE_CSS.includes('--home-clip-mobile-position'),'mobile applies per-clip position')
  assert.ok(media.HOME_CARD_CYCLE_CSS.includes('transform:scale(var(--home-clip-scale,1)) !important'),'video scale comes from the clip, including hover')
  assert.ok(media.HOME_CARD_CYCLE_CSS.includes('transform:scale(var(--home-clip-scale,1));transform-origin:50% 0'),'SSR poster uses the same top-anchored scale')
  // The legacy product :not([data-trio]) framing is !important at class/attribute specificity 4.
  // A plain video selector loses to it; this was reproduced in the actual browser during this delivery.
  const framingRules=[...media.HOME_CARD_CYCLE_CSS.matchAll(/([^{}]+)\{([^{}]*object-position:[^{}]*!important[^{}]*)\}/g)]
  const specificity=selector=>(selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!not\()[\w-]+/g)??[]).length
  assert.ok(framingRules.length>=2,'desktop and mobile cycle framing rules exist')
  for(const rule of framingRules)for(const selector of rule[1].split(',').filter(s=>/\bvideo\b/.test(s)))assert.ok(specificity(selector)>=4,'cycle framing beats legacy important product crop: '+selector)
}

function atoms(bytes,start=0,end=bytes.length) {
  const result=[]
  for(let offset=start;offset<end;) {
    assert.ok(offset+8<=end,'complete MP4 atom header')
    let size=bytes.readUInt32BE(offset),header=8
    const type=bytes.toString('ascii',offset+4,offset+8)
    if(size===1){assert.ok(offset+16<=end,'complete extended atom');size=Number(bytes.readBigUInt64BE(offset+8));header=16}
    if(size===0)size=end-offset
    assert.ok(Number.isSafeInteger(size)&&size>=header&&offset+size<=end,'valid MP4 atom extent')
    result.push({type,offset,end:offset+size,header});offset+=size
  }
  return result
}
function mediaProof(bytes) {
  assert.ok(bytes.length<=1_500_000,'preview is at most 1.5 decimal MB')
  const top=atoms(bytes),moov=top.find(a=>a.type==='moov'),mdat=top.find(a=>a.type==='mdat')
  assert.ok(moov&&mdat&&moov.offset<mdat.offset,'top-level moov precedes mdat: faststart')
  const handlers=[]
  for(const trak of atoms(bytes,moov.offset+moov.header,moov.end).filter(a=>a.type==='trak'))for(const mdia of atoms(bytes,trak.offset+trak.header,trak.end).filter(a=>a.type==='mdia'))for(const hdlr of atoms(bytes,mdia.offset+mdia.header,mdia.end).filter(a=>a.type==='hdlr'))handlers.push(bytes.toString('ascii',hdlr.offset+hdlr.header+8,hdlr.offset+hdlr.header+12))
  assert.ok(handlers.includes('vide')&&!handlers.includes('soun'),'real MP4 track handler is video with no audio')
}

function listProof(lib=pure) {
  for(const card of ['films','product_ads','ugc_ads','kids_cartoon'])for(const language of ['en','pt','xx']) {
    const clips=lib.homeCardClips(card,language)
    assert.ok(Array.isArray(clips)&&clips.length>=1&&clips.length<=4,card+' has 1–4 available approved clips; counts are reported separately')
    assert.equal(new Set(clips.map(c=>c.src)).size,clips.length,'list has no duplicate clip')
    assert.equal(lib.homeCardClip(card,language).src,clips[0].src,'legacy first selector remains compatible')
    for(const clip of clips) {
      assert.match(clip.src,/^\/previews\/[^?]+\.mp4$/,'only local existing previews')
      assert.match(clip.poster,/^\/(?:posters|previews)\//,'local poster')
      assert.match(clip.objectPosition,/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/,'explicit desktop framing per clip')
      assert.match(clip.mobileObjectPosition??clip.objectPosition,/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/,'explicit mobile framing per clip')
      assert.ok(Number.isFinite(clip.scale??1)&&(clip.scale??1)>=1,'optional per-clip scale is finite and at least one')
      for(const src of [clip.src,clip.poster])assert.ok(fs.existsSync(path.join(ROOT,'public',src)),'asset exists: '+src)
      const bytes=fs.readFileSync(path.join(ROOT,'public',clip.src))
      mediaProof(bytes)
    }
  }
}

playbackProof();ok(true,'actual event-driven controller lifecycle')
ssrProof();ok(true,'actual component SSR for four cards and EN/PT')
listProof();ok(true,'clip lists, per-clip framing and existing silent faststart media')
const before=moduleOf(execFileSync('git',['show',BASE+':'+PURE],{encoding:'utf8',maxBuffer:32<<20})),plain=value=>JSON.parse(JSON.stringify(value))
assert.equal(pure.HOME_CARD_EVENT,before.HOME_CARD_EVENT)
assert.deepEqual(plain(pure.HOME_CARD_ORDER),plain(before.HOME_CARD_ORDER))
for(const card of before.HOME_CARD_ORDER)for(const signedIn of [false,true])assert.deepEqual(plain(pure.homeCardClickMetadata(card,signedIn)),plain(before.homeCardClickMetadata(card,signedIn)),'click payload remains byte-for-byte semantic contract')
for(const file of ['lib/engineWall.ts','lib/homeVideoCuration.ts','lib/ui/homeKidsCard.ts'])assert.equal(rd(file),execFileSync('git',['show',BASE+':'+file],{encoding:'utf8',maxBuffer:32<<20}).replace(/\r\n/g,'\n'),'protected source unchanged: '+file)
const {renderCardArrival}=await import(pathToFileURL(path.join(ROOT,'scripts/test-support/paginas-ia-claras-cards-harness.mjs')))
const kids=moduleOf(rd('lib/ui/homeKidsCard.ts'))
const arrivals=[
  {name:'ChatGPT UTM',search:'?utm_source=ChatGPT',first:true},
  {name:'OpenAI UTM',search:'?utm_source=OPENAI',first:true},
  {name:'ChatGPT referrer',referrer:'https://chatgpt.com/c/fixture',first:true},
  {name:'OpenAI referrer',referrer:'https://www.OpenAI.com/',first:true},
  {name:'Google UTM with ChatGPT referrer',search:'?utm_source=google',referrer:'https://chatgpt.com/',first:true},
  {name:'No source',first:false},
  {name:'Google',search:'?utm_source=google',referrer:'https://google.com/',first:false},
  {name:'Claude',search:'?utm_source=claude',referrer:'https://claude.ai/',first:false},
]
for(const arrival of arrivals)for(const signedIn of [false,true])for(const kidsCard of [false,true])for(const language of ['en','pt']) {
  const options={root:ROOT,...arrival,signedIn,language,kidsCard},actual=renderCardArrival(options)
  const initial=[...before.HOME_CARD_ORDER,...(kidsCard?['kids_cartoon']:[])]
  const expected=kidsCard&&arrival.first?['kids_cartoon',...before.HOME_CARD_ORDER]:initial
  const server=renderCardArrival({...options,server:true})
  assert.deepEqual(plain(actual.initialOrder),initial,'SSR starts in canonical order before browser origin effect: '+arrival.name)
  assert.equal(actual.initialHtml,server.html,'actual current SSR is deterministic for session, language, 3/4 cards and arrival')
  assert.deepEqual(plain(actual.order),expected,'actual origin effect preserves 3/4 card order: '+arrival.name)
  const domOrder=[...actual.html.replace(/<style[\s\S]*?<\/style>/g,'').matchAll(/data-home-card="([^"]+)"/g)].map(match=>match[1])
  assert.deepEqual(domOrder,expected,'actual DOM has exactly the intended cards, without duplicates')
  assert.equal(actual.events.length,expected.length,'one event per actual clicked card')
  for(const [index,card] of actual.order.entries()) {
    assert.equal(actual.events[index].event,before.HOME_CARD_EVENT,'same event name on actual card')
    const legacy=card==='kids_cartoon'?kids.homeKidsCardClickMetadata(signedIn):before.homeCardClickMetadata(card,signedIn)
    assert.deepEqual(plain(actual.events[index].metadata),plain({...legacy,position:index+1}),'actual click preserves card, current position and href: '+card)
    assert.equal(actual.hrefs[index],actual.events[index].metadata.href,'click destination equals rendered href: '+card)
  }
}
ok(true,'64 actual EN/PT arrival variants: canonical SSR, 3/4 cards, UTM/referrer origin effects, deduplicated DOM and real current click positions/hrefs; protected sources unchanged')

if(process.argv.includes('--mutants')) {
  let appliedMutations=0
  const mutate=(source,from,to)=>{assert.ok(source.includes(from),'mutant anchor exists: '+from);const result=source.replace(from,to);assert.notEqual(result,source,'mutant applied');appliedMutations++;return result}
  const killed=(label,proof)=>{const before=appliedMutations;assert.throws(proof,undefined,'mutant must be caught: '+label);assert.equal(appliedMutations,before+1,'exactly one effective source mutation was applied: '+label);mutants++;console.log('killed '+label)}
  const p=rd(PLAYER),s=rd(MEDIA)
  killed('timeupdate advances before end',()=>playbackProof(mutate(p,"video.addEventListener('ended', onEnded)","video.addEventListener('timeupdate', onEnded)")))
  killed('fixed timer',()=>playbackProof(mutate(p,'  const sync = () => {','  const sync = () => { window.setTimeout(() => {}, 1000)')))
  killed('reduced motion ignored',()=>playbackProof(mutate(p,'!motion?.matches','true')))
  killed('viewport ignored',()=>playbackProof(mutate(p,'visible && !motion?.matches','true && !motion?.matches')))
  killed('incoming revealed before playing',()=>playbackProof(mutate(p,'    pending = next\n    play(next)','    pending = next\n    videos[next].setAttribute(\'data-on\', \'\')\n    play(next)')))
  killed('outgoing overwritten during fade',()=>playbackProof(mutate(p,"        video.setAttribute('data-on', '')","        video.setAttribute('data-on', '')\n        assign(1 - active, nextIndex(), true)")))
  killed('next no preload',()=>playbackProof(mutate(p,"video.preload = next ? 'auto' : 'none'","video.preload = 'none'")))
  killed('mobile framing lost',()=>playbackProof(mutate(p,'clip.mobileObjectPosition ?? clip.objectPosition','clip.objectPosition')))
  killed('per-clip scale ignored',()=>playbackProof(mutate(p,'String(clip.scale ?? 1)',"'1'")))
  killed('SSR video eagerly downloads',()=>ssrProof(mutate(s,'preload="none"','preload="auto"')))
  killed('SSR source assigned to every buffer',()=>ssrProof(mutate(s,'data-home-cycle-slot={slot}','data-home-cycle-slot={slot} src={first.src}')))
  killed('CSS loses to legacy important product crop',()=>ssrProof(mutate(s,'video[data-home-cycle-slot]','video')))
  killed('missing approved poster',()=>listProof(moduleOf(mutate(rd(PURE),'poster: `/posters/${name}.webp`','poster: `/posters/missing-giro-${name}.webp`'))))
  killed('click position changed',()=>{const bad=moduleOf(mutate(rd(PURE),'position: HOME_CARD_ORDER.indexOf(card) + 1','position: HOME_CARD_ORDER.indexOf(card) + 2'));assert.deepEqual(plain(bad.homeCardClickMetadata('films',false)),plain(before.homeCardClickMetadata('films',false)))})
}
console.log(`ok KINEO-CARDS-GIRO-2410: ${checks} contract groups; ${mutants} applied mutants rejected; no network, env, database, paid generation or source mutation`)
