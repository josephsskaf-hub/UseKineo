import HomeProjection from '/entry.js'

const mode = new URLSearchParams(location.search).get('case')
const check = (ok,msg) => {if(!ok)throw Error(msg)}
const delay = ms => new Promise(resolve=>window.setTimeout(resolve,ms))
const timers = new Map()
let now=0, next=0
function schedule(fn,ms,repeat=0){const id=++next;timers.set(id,{fn,at:now+ms,repeat});return id}
window.sceneClock = {
  performance:{now:()=>now}, setTimeout:(fn,ms)=>schedule(fn,ms),clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms)=>schedule(fn,ms,ms),clearInterval:id=>timers.delete(id),
}
let frameRemainder=0
function advance(ms,fps=0){
  const end=now+ms
  while(now<end){
    const timerEntry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0]
    const until=Math.min(end,timerEntry?.[1].at??end)
    const stage=document.querySelector('.hp-stage')
    if(stage){
      frameRemainder+=(until-now)*fps/1000
      const frames=Math.floor(frameRemainder+1e-8)
      stage.dataset.frames=String(Number(stage.dataset.frames)+frames)
      frameRemainder-=frames
    }
    now=until
    if(timerEntry && timerEntry[1].at===now){
      const [id,t]=timerEntry
      if(t.repeat)t.at+=t.repeat;else timers.delete(id)
      t.fn()
    }
  }
}
window.IntersectionObserver=class {
  constructor(cb){this.cb=cb}
  observe(target){queueMicrotask(()=>{if(!this.off)this.cb([{isIntersecting:true,target}])})}
  disconnect(){this.off=true}
}
window.requestIdleCallback=fn=>setTimeout(fn,0)
window.attempts=0
window.noGPU=mode==='gpu'
const root=document.querySelector('main'),card=root.querySelector('a'),poster=card.querySelector('picture')
function visible(active){
  check(root.hasAttribute('data-playing')===active,'playing')
  check(root.querySelectorAll('.hp-stage').length===Number(active),'stage count')
  check(root.querySelectorAll('.hp-idea').length===Number(active),'field count')
  check(poster===card.querySelector('picture') && poster.offsetWidth>0,'original poster retained')
  check(getComputedStyle(poster).visibility===(active?'hidden':'visible'),'native poster visibility')
  const r=card.querySelector('.k3c-cta').getBoundingClientRect()
  const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
  check(target?.closest('a')===card,'CTA hit test')
  let accepted=false
  document.addEventListener('click',event=>{
    accepted=!event.defaultPrevented && event.target.closest('a')===card
  },{once:true})
  target.click()
  check(accepted,'CTA activation')
  check(card.getAttribute('href')==='#film','CTA destination')
}
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await delay(10)}throw Error('condition timed out')}
try{
  HomeProjection({placement:'b',publicHome:true})
  if(mode==='mobile'||mode==='reduced'){
    await delay(250);visible(false)
    check(mode==='mobile'?innerWidth===390:matchMedia('(prefers-reduced-motion: reduce)').matches,'test environment')
    check(!performance.getEntriesByType('resource').some(r=>r.name.includes('/screening-room/')),'3D asset requested')
  }else if(mode==='gpu'){
    await until(()=>window.attempts===1);await delay(0);visible(false);advance(30000);check(window.attempts===1,'GPU failure retried')
  }else{
    await until(()=>root.hasAttribute('data-playing'));visible(true)
    advance(3000,45);visible(true)
    advance(2900,44);visible(true);advance(100,44);visible(false);await delay(0)
    advance(4000)
    if(mode==='hidden'){
      Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))
      advance(30000);visible(false);check(window.attempts===1,'retried while hidden')
      Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))
    }
    if(mode==='abort'){
      window.unmount();advance(30000);await delay(0);visible(false);check(window.attempts===1,'retried after unmount')
    }else{
      advance(3999);visible(false);check(window.attempts===1,'early retry')
      advance(1);await until(()=>window.attempts===2);await delay(0);visible(true)
      if(mode==='recover'){advance(18000,60);visible(true)}
      else {advance(3000,20);visible(false);advance(60000);await delay(0);visible(false)}
      check(window.attempts===2,'more than one retry')
    }
  }
  await fetch('/result?case='+mode,{method:'POST',body:'ok'})
}catch(e){await fetch('/result?case='+mode,{method:'POST',body:String(e.stack||e)})}
