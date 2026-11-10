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
  // KINEO-RECREATE-ABRE-1011 — desde 10/11 os dois interruptores são 'public'. O helper troca o valor ATUAL (qualquer que seja),
  // então 'internal' e 'off' continuam provados como o caminho de volta.
  const setRelease=(page,swap=page)=>releaseSource.replace(/RECREATE_RELEASE: InternalRelease = '[a-z]+'/,`RECREATE_RELEASE: InternalRelease = '${page}'`).replace(/RECREATE_SWAP_RELEASE: InternalRelease = '[a-z]+'/,`RECREATE_SWAP_RELEASE: InternalRelease = '${swap}'`)
  assert(/RECREATE_RELEASE: InternalRelease = 'public'/.test(releaseSource)&&/RECREATE_SWAP_RELEASE: InternalRelease = 'public'/.test(releaseSource),'since 10/11 both switches are public')
  for(const mode of ['public','internal','off']){
    const override={'lib/recreate/release.ts':setRelease(mode)}
    const server=loader(sessionStub,override)('lib/recreate/server')
    user={id:'external-user-fixture',email:'customer@example.org'}
    assert.equal(!!(await server.recreateSession()).user,mode==='public')
    user={id:'internal-user-fixture',email:'josephsskaf@gmail.com'}
    assert.equal(!!(await server.recreateSession()).user,mode!=='off')
    user=null;assert.equal((await server.recreateSession()).user,null,'public visibility never bypasses authentication')
    const entry=loader({},override)('lib/recreate/entry')
    assert.equal(entry.publicRecreatePath('outfit-morph'),null,'KINEO-RECREATE-TRAVA-1011: an unapproved swap never gets a public link')
    assert.equal(entry.publicRecreatePath('effect-kiss'),mode==='public'?'/recreate/effect-kiss':null)
    assert.equal(entry.publicRecreatePath('unapproved-video'),null)
    for(const id of ['passarela','escolha-o-favorito'])assert.equal(entry.publicRecreatePath(id),mode==='public'?'/recreate/'+id:null,'approved swap link follows the switches: '+id)
    for(const id of ['elevador','duelo-de-danca','dinheiro'])assert.equal(entry.publicRecreatePath(id),null,'unapproved or removed swap never gets a public link: '+id)
    const swapInternal=loader({},{'lib/recreate/release.ts':setRelease(mode,'internal')})('lib/recreate/entry')
    assert.equal(swapInternal.publicRecreatePath('passarela'),null,'swap internal: no public swap link even if the page is public')
  }
  user={id:'external-user-fixture',email:'customer@example.org'}
  // Rollback path (both switches 'internal'): the internal-candidate guarantees below must still hold.
  const internalOverride={'lib/recreate/release.ts':setRelease('internal')}
  const server=loader(sessionStub,internalOverride)('lib/recreate/server')
  const noIO=()=>{throw Error('Unexpected paid or database I/O')}
  const api=loader({'@/lib/recreate/server':{...server,recreateSubmitDeps:noIO},'@/lib/clips/clipServer':{clipsAdmin:noIO,loadClipAccount:noIO},'@/lib/serverEvents':{writeServerEvent:noIO},'@/app/api/admin/_shared/mrr':{isPayingPlan:noIO}},internalOverride)('app/api/recreate/route')
  const request=()=>new NextRequest('https://www.usekineo.com/api/recreate',{method:'POST',body:JSON.stringify({format:'outfit-morph',simulate:true}),headers:{'content-type':'application/json'}})
  assert.equal((await api.POST(request())).status,404,'internal simulation is unavailable to public accounts, before all I/O')
  user={id:'internal-user-fixture',email:'josephsskaf@gmail.com'}
  assert.equal((await api.POST(request())).status,200)
  user=null;assert.equal((await api.POST(request())).status,404)
  for(const route of ['app/api/recreate/social/route','app/api/recreate/status/route','app/api/recreate/assets/[name]/route']){
    const guarded=loader({'@/lib/recreate/server':server},internalOverride)(route)
    assert.equal((await guarded.GET(new NextRequest('https://www.usekineo.com/api/recreate'),{params:{name:'outfit-morph.mp4'}})).status,404)
  }
  const nav={'next/navigation':{redirect:href=>{throw Error('redirect:'+href)},notFound:()=>{throw Error('not-found')},useRouter:()=>({push:()=>{}})}}
  const pageStubs={...nav,'@/lib/recreate/server':server}
  const page=loader(pageStubs,internalOverride)('app/recreate/[id]/page').default
  await assert.rejects(page({params:{id:'effect-kiss'}}),/not-found/)
  await assert.rejects(page({params:{id:'unknown'}}),/not-found/)
  const catalogPage=loader(pageStubs,internalOverride)('app/recreate/page').default
  await assert.rejects(catalogPage(),/not-found/)
  user={id:'external-user-fixture',email:'customer@example.org'}
  await assert.rejects(page({params:{id:'effect-kiss'}}),/not-found/,'external accounts cannot enter the internal candidate')
  user={id:'internal-user-fixture',email:'josephsskaf@gmail.com'}
  assert.equal((await page({params:{id:'effect-kiss'}})).props.internalTools,true)
  assert.equal((await page({params:{id:'effect-kiss'}})).props.initialId,'effect-kiss')
  // Production state since 10/11: both switches public (the real file, no override needed).
  const publicOverride={'lib/recreate/release.ts':releaseSource}
  const publicServer=loader(sessionStub,publicOverride)('lib/recreate/server')
  const publicPage=loader({...pageStubs,'@/lib/recreate/server':publicServer},publicOverride)('app/recreate/[id]/page').default
  user={id:'external-user-fixture',email:'customer@example.org'}
  assert.equal((await publicPage({params:{id:'effect-kiss'}})).props.internalTools,false)
  // (a) logged-in customer: approved swaps open; unapproved swaps 404; catalog lists approved swaps + effects only.
  for(const id of ['passarela','escolha-o-favorito'])assert.equal((await publicPage({params:{id}})).props.initialId,id)
  for(const id of ['outfit-morph','elevador','duelo-de-danca','dinheiro'])await assert.rejects(publicPage({params:{id}}),/not-found/,'customer cannot open '+id)
  const publicCatalog=loader({...pageStubs,'@/lib/recreate/server':publicServer},publicOverride)('app/recreate/page').default
  const ids=(await publicCatalog()).props.formatIds
  assert(ids.includes('passarela')&&ids.includes('escolha-o-favorito')&&ids.includes('effect-kiss'))
  assert(!ids.some(id=>['outfit-morph','elevador','duelo-de-danca','dinheiro'].includes(id)),'unapproved swaps stay out of the public catalog')
  user=null
  for(const id of ['passarela','escolha-o-favorito','effect-kiss'])await assert.rejects(publicPage({params:{id}}),e=>e.message.startsWith('redirect:')&&new URL(e.message.slice(9),'https://fixture').searchParams.get('redirect')==='/recreate/'+id,'visitor goes to signup and returns to '+id)
  for(const id of ['outfit-morph','duelo-de-danca'])await assert.rejects(publicPage({params:{id}}),/not-found/,'visitor is never invited to an unapproved swap: '+id)
  await assert.rejects(publicCatalog(),e=>e.message.startsWith('redirect:')&&new URL(e.message.slice(9),'https://fixture').searchParams.get('redirect')==='/recreate')
  user={id:'external-user-fixture',email:'customer@example.org'}
  // Customer POST of an unapproved swap: 404 before photos, moderation, debit or provider (noIO stubs).
  const realPublicApi=loader({'@/lib/recreate/server':{...publicServer,recreateSubmitDeps:noIO},'@/lib/clips/clipServer':{clipsAdmin:noIO,loadClipAccount:noIO},'@/lib/serverEvents':{writeServerEvent:noIO},'@/app/api/admin/_shared/mrr':{isPayingPlan:noIO}},publicOverride)('app/api/recreate/route')
  for(const format of ['outfit-morph','elevador','duelo-de-danca'])assert.equal((await realPublicApi.POST(new NextRequest('https://www.usekineo.com/api/recreate',{method:'POST',body:JSON.stringify({format,seconds:10,photos:['https://x.supabase.co/a.jpg'],consent:true,mode:'swap'}),headers:{'content-type':'application/json'}}))).status,404,'customer cannot request '+format)
  const publicApi=loader({'@/lib/recreate/server':{...publicServer,recreateSubmitDeps:noIO},'@/lib/clips/clipServer':{clipsAdmin:noIO,loadClipAccount:noIO},'@/lib/serverEvents':{writeServerEvent:noIO},'@/app/api/admin/_shared/mrr':{isPayingPlan:noIO}},publicOverride)('app/api/recreate/route')
  assert.equal((await publicApi.POST(request())).status,404,'public rollout cannot expose the internal simulation tool')
  for(const email of ['test-hacker@example.org','test+fixture@example.org','mailinator@example.org']){
    assert(loader()('lib/internalAccounts').isInternalEmail(email),'fixture really matches metric exclusion, not authorization')
    user={id:'external-user-fixture',email}
    assert.equal((await publicPage({params:{id:'effect-kiss'}})).props.internalTools,false,'metric exclusion patterns do not grant internal tools: '+email)
    assert.equal((await publicApi.POST(request())).status,404,'metric exclusion patterns cannot simulate: '+email)
  }
  user=null
  await assert.rejects(publicPage({params:{id:'effect-kiss'}}),e=>e.message.startsWith('redirect:')&&new URL(e.message.slice(9),'https://fixture').searchParams.get('redirect')==='/recreate/effect-kiss')

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

  const seenTiles=new Set()
  const homeStubs={'next/link':links,'@/components/InterfaceLanguage':{UiLabel:({children})=>children},'@/components/WallMedia':{__esModule:true,default:()=>null}}
  for(const mode of ['public','off']){
    const m=loader(homeStubs,{'lib/recreate/release.ts':setRelease(mode)})('components/home/HomeMosaic')
    assert.equal(m.podeRecriar({kind:'novo',clip:{id:'outfit-morph',prompt:null}}),false,'KINEO-RECREATE-TRAVA-1011: unapproved swap tile keeps its legacy destination')
    assert.equal(m.podeRecriar({kind:'novo',clip:{id:'unapproved-video',prompt:null}}),false)
    for(const signedIn of [true,false]){
      const html=renderToStaticMarkup(React.createElement(m.default,{signedIn}))
      const tag=html.match(/<a[^>]*data-clip-novo="outfit-morph"[^>]*>/)[0],href=tag.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&')
      const actual=signedIn?href:new URL(href,'https://fixture').searchParams.get('redirect')
      assert.equal(actual,'/clips')
      // (b) KINEO-RECREATE-ABRE-1011 — approved home tiles point to /recreate/<id> with the Recreate pill only when public;
      // unapproved/removed ones keep their legacy destination and no pill.
      for(const id of ['passarela','escolha-o-favorito','dinheiro','duelo-de-danca']){
        const a=html.match(new RegExp('<a[^>]*data-clip-novo="'+id+'"[^>]*>[\\s\\S]*?</a>'))?.[0]
        if(!a)continue
        const h=a.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'),dest=signedIn?h:new URL(h,'https://fixture').searchParams.get('redirect')
        const approved=['passarela','escolha-o-favorito'].includes(id)&&mode==='public'
        if(approved){assert.equal(dest,'/recreate/'+id,'approved tile opens Recreate: '+id);assert(a.includes('kmz-re'),'approved tile shows the Recreate pill: '+id)}
        else{assert(!dest.startsWith('/recreate/'),'tile keeps its legacy destination: '+id);assert(!a.includes('kmz-re'),'no Recreate pill: '+id)}
        seenTiles.add(id)
      }
      for(const id of ['anuncio-skincare','anuncio-relogio','anuncio-colar','anuncio-caneca','anuncio-sueter-pet','anuncio-manta']){
        const ad=html.match(new RegExp('<a[^>]*data-clip-novo="'+id+'"[^>]*>[\\s\\S]*?</a>'))?.[0]
        assert(ad,'new main Christmas ad remains in the mosaic: '+id)
        assert(ad.includes('data-home-cta="mosaic_ad"'));assert(ad.includes('Make your ad'));assert(!ad.includes('>Recreate<'))
        const destination=ad.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&')
        // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o destino é o da entrada de anúncio
        // (lib/create/entry.ts: logado → /create/ads com o interruptor public; visitante, ou 'off' → /ads/new). Nunca um link do Recreate.
        const adsEntry=loader({})('lib/create/entry').createEntryHref('ads','/ads/new',signedIn)
        assert.equal(adsEntry,signedIn?'/create/ads':'/ads/new','the shipped entry switch is public; visitors keep today\'s door')
        assert.equal(signedIn?destination:new URL(destination,'https://fixture').searchParams.get('redirect'),adsEntry,'ad examples never become Recreate links')
      }
    }
  }
  assert(seenTiles.has('passarela')&&seenTiles.has('escolha-o-favorito'),'the two approved tiles are really on the home')
  console.log('PASS: external/internal/anonymous/off sessions, anonymous API denial, login return paths, real effect/home links, no engine badge, catalog-only links and legacy rollback.')
}
module.exports=main
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1})
