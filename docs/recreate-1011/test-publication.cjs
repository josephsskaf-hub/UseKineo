// Publication candidate: actual sessions, pages, API and rendered entry points; no real I/O.
const assert=require('node:assert/strict'),path=require('node:path')
const {loader,read,ROOT}=require('../recreate-0911/test-recreate.cjs')
const React=require(path.join(ROOT,'node_modules/react'))
const {renderToStaticMarkup}=require(path.join(ROOT,'node_modules/react-dom/server'))
const {NextRequest}=require(require.resolve('next/server',{paths:[ROOT]}))
const links={__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)}
async function main(){
  let user={id:'external-user-fixture',email:'customer@example.org'}
  const sessionStub={'@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user}})}})},'server-only':{},'@/lib/clips/clipServer':{},'@/lib/engineLaunch':{enginePaused:()=>null}}
  const releaseSource=read('lib/recreate/release.ts')
  for(const mode of ['public','internal','off']){
    const override={'lib/recreate/release.ts':releaseSource.replace("RECREATE_RELEASE: InternalRelease = 'public'",`RECREATE_RELEASE: InternalRelease = '${mode}'`)}
    const server=loader(sessionStub,override)('lib/recreate/server')
    user={id:'external-user-fixture',email:'customer@example.org'}
    assert.equal(!!(await server.recreateSession()).user,mode==='public')
    user={id:'internal-user-fixture',email:'josephsskaf@gmail.com'}
    assert.equal(!!(await server.recreateSession()).user,mode!=='off')
    user=null;assert.equal((await server.recreateSession()).user,null,'public visibility never bypasses authentication')
    const entry=loader({},override)('lib/recreate/entry')
    assert.equal(entry.publicRecreatePath('outfit-morph'),mode==='public'?'/recreate/outfit-morph':null)
    assert.equal(entry.publicRecreatePath('unapproved-video'),null)
  }
  user={id:'external-user-fixture',email:'customer@example.org'}
  const server=loader(sessionStub)('lib/recreate/server')
  const noIO=()=>{throw Error('Unexpected paid or database I/O')}
  const api=loader({'@/lib/recreate/server':{...server,recreateSubmitDeps:noIO},'@/lib/clips/clipServer':{clipsAdmin:noIO,loadClipAccount:noIO},'@/lib/serverEvents':{writeServerEvent:noIO},'@/app/api/admin/_shared/mrr':{isPayingPlan:noIO}})('app/api/recreate/route')
  const request=()=>new NextRequest('https://www.usekineo.com/api/recreate',{method:'POST',body:JSON.stringify({format:'outfit-morph',simulate:true}),headers:{'content-type':'application/json'}})
  assert.equal((await api.POST(request())).status,200)
  user=null;assert.equal((await api.POST(request())).status,404)
  for(const route of ['app/api/recreate/social/route','app/api/recreate/status/route','app/api/recreate/assets/[name]/route']){
    const guarded=loader({'@/lib/recreate/server':server})(route)
    assert.equal((await guarded.GET(new NextRequest('https://www.usekineo.com/api/recreate'),{params:{name:'outfit-morph.mp4'}})).status,404)
  }
  const nav={'next/navigation':{redirect:href=>{throw Error('redirect:'+href)},notFound:()=>{throw Error('not-found')},useRouter:()=>({push:()=>{}})}}
  const pageStubs={...nav,'@/lib/recreate/server':server}
  const page=loader(pageStubs)('app/recreate/[id]/page').default
  await assert.rejects(page({params:{id:'effect-kiss'}}),e=>e.message.startsWith('redirect:')&&new URL(e.message.slice(9),'https://fixture').searchParams.get('redirect')==='/recreate/effect-kiss')
  await assert.rejects(page({params:{id:'unknown'}}),/not-found/)
  const catalogPage=loader(pageStubs)('app/recreate/page').default
  await assert.rejects(catalogPage(),e=>e.message.startsWith('redirect:')&&new URL(e.message.slice(9),'https://fixture').searchParams.get('redirect')==='/recreate')
  user={id:'external-user-fixture',email:'customer@example.org'}
  assert.equal((await page({params:{id:'effect-kiss'}})).props.initialId,'effect-kiss')

  const ui={...nav,'next/link':links,'@/components/AppearanceSettings':{AppearanceSettingsButton:()=>null},'@/lib/clips/ClipTelemetry':{__esModule:true,default:()=>null},'app/effects/EffectPreview':{__esModule:true,default:()=>null},'@/lib/engineLaunch':{enginePaused:()=>null}}
  const modules=loader(ui),effect=modules('lib/clips/clipEffects').clipEffectByKey('kiss'),card=modules('lib/clips/clipEffectPages').effectPageCard(effect),Effect=modules('app/effects/EffectPageClient').default
  for(const signedIn of [true,false]){
    const html=renderToStaticMarkup(React.createElement(Effect,{effect:card,language:'en',signedIn,related:[],measurementActor:null,recreateEnabled:true}))
    assert(!/PixVerse|Kling|MiniMax/.test(html))
    const href=html.match(/<a[^>]*href="([^"]+)"[^>]*data-effect-use="kiss"/)[1].replaceAll('&amp;','&')
    if(signedIn)assert.equal(href,'/recreate/effect-kiss');else assert.equal(new URL(href,'https://fixture').searchParams.get('redirect'),'/recreate/effect-kiss')
  }
  const legacy=renderToStaticMarkup(React.createElement(Effect,{effect:card,language:'en',signedIn:true,related:[],measurementActor:null,recreateEnabled:false}))
  assert(legacy.includes('PixVerse'));assert(legacy.includes('/clips?effect=kiss'))

  const homeStubs={'next/link':links,'@/components/InterfaceLanguage':{UiLabel:({children})=>children},'@/components/WallMedia':{__esModule:true,default:()=>null}}
  for(const mode of ['public','off']){
    const m=loader(homeStubs,{'lib/recreate/release.ts':releaseSource.replace("RECREATE_RELEASE: InternalRelease = 'public'",`RECREATE_RELEASE: InternalRelease = '${mode}'`)})('components/home/HomeMosaic')
    assert.equal(m.podeRecriar({kind:'novo',clip:{id:'outfit-morph',prompt:null}}),mode==='public')
    assert.equal(m.podeRecriar({kind:'novo',clip:{id:'unapproved-video',prompt:null}}),false)
    for(const signedIn of [true,false]){
      const html=renderToStaticMarkup(React.createElement(m.default,{signedIn}))
      const tag=html.match(/<a[^>]*data-clip-novo="outfit-morph"[^>]*>/)[0],href=tag.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&')
      const actual=signedIn?href:new URL(href,'https://fixture').searchParams.get('redirect')
      assert.equal(actual,mode==='public'?'/recreate/outfit-morph':'/clips')
    }
  }
  console.log('PASS: external/internal/anonymous/off sessions, anonymous API denial, login return paths, real effect/home links, no engine badge, catalog-only links and legacy rollback.')
}
module.exports=main
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1})
