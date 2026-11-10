const fs = require('node:fs')
const path = require('node:path')
const { loader, render, formats, read, ROOT } = require('./test-recreate.cjs')
const React = require(path.join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))
const os = require('node:os')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const cache = path.join(os.tmpdir(), 'kineo-recreate-preview-0911')
fs.mkdirSync(cache, { recursive: true })
const css = read('app/recreate/recreate.css')
const escape = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
function embed(html) {
  return html.replace(/\b(src|poster)="([^"]+)"/g, (_, attr, value) => {
    if (value.endsWith('.mp4')) return '' // Static comparison uses the actual house posters, without media/network dependencies.
    let file = value.startsWith('/api/recreate/assets/') ? 'lib/recreate/assets/' + formats.RECREATE_ASSETS[value.split('/').pop()].file : 'public' + value
    if (!fs.existsSync(path.join(ROOT,file))) return `${attr}="${value}"`
    const optimized = path.join(cache, crypto.createHash('sha256').update(file).digest('hex').slice(0,16)+'.webp')
    if (!fs.existsSync(optimized)) execFileSync('ffmpeg', ['-loglevel','error','-y','-i',path.join(ROOT,file),'-vf','scale=420:-1','-frames:v','1','-quality','65',optimized])
    return `${attr}="data:image/webp;base64,${fs.readFileSync(optimized).toString('base64')}"`
  })
}
const stubs = {
  'next/link': { __esModule:true, default: ({href,children,prefetch,...props}) => React.createElement('a',{...props,href},children) },
  'next/navigation': { useRouter: () => ({push:()=>{}}) },
  '@/components/KineoBolt': {KineoBrandIcon:()=>React.createElement('span',{},'✦')},
  '@/components/AppearanceSettings':{AppearanceSettingsButton:()=>null},
  '@/lib/clips/ClipTelemetry':{__esModule:true,default:()=>null},
  'app/effects/EffectPreview':{__esModule:true,default:({video,poster,label})=>React.createElement('video',{src:video,poster,'aria-label':label})},
}
const effectLoad=loader(stubs)
const fx=effectLoad('lib/clips/clipEffects').clipEffectByKey('kiss')
const card=effectLoad('lib/clips/clipEffectPages').effectPageCard(fx)
const Effect=effectLoad('app/effects/EffectPageClient').default
function effectHtml(enabled){return renderToStaticMarkup(React.createElement(Effect,{effect:card,language:'en',signedIn:true,related:[],measurementActor:null,recreateEnabled:enabled}))}
function oldClips() {
  let state=0
  const effects=effectLoad('lib/clips/clipEffects').publicClipEffects(()=>true)
  const spec=effectLoad('lib/clips/clipCatalog').CLIP_ENGINES.kling
  const mockReact={...React,useEffect:()=>{},useState:init=>{
    const index=state++;let value=typeof init==='function'?init():init
    if(index===0)value=[{key:'kling',label:spec.label,photo:true,text:true,seconds:[5,10],credits:{5:4,10:8},textAspects:['9:16'],photoAspects:[]}]
    if(index===2)value=effects
    if(index===3)value='kiss'
    if(index===11)value=false
    if(index===14)value='kling'
    if(index===17)value=fx.prompt
    return [value,()=>{}]
  }}
  const local=loader({...stubs,react:mockReact,
    '@/components/InterfaceLanguage':{UiLabel:({children})=>children,useInterfaceLanguage:()=> 'en',useUiCopy:()=>s=>s},
    '@/components/ProductStage':{useProductStage:()=>{},ProductStageStyles:()=>null},
    '@/components/CreditsTopupModal':{__esModule:true,default:()=>null},
    '@/components/ControlIcon':{__esModule:true,default:()=>React.createElement('span',{},'+')},
    '@/components/premiere/Premiere':{PremiereStage:()=>null,PremiereResult:()=>null,usePremiereBeacon:()=>{}},
    '@/lib/clips/ClipTelemetry':{__esModule:true,default:()=>null,readClipEntryOrigin:()=> 'effect_page'},
  })
  const html=renderToStaticMarkup(React.createElement(local('app/(dashboard)/clips/ClipsClient').default,{}))
  return doc(html, ':root{--text:#f5f5f7;--text2:#bbb;--muted:#999;--bg:#0b0c0e;--card:#18191d;--card2:#202126;--border:#333;--accent:#c3fc50;--on-accent:#131800}body{background:var(--bg);color:var(--text);font-family:Arial}')
}
function doc(body,style=css){return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+style+'</style></head><body>'+embed(body)+'</body></html>'}
const noPage='<div style="height:700px;background:#fff;color:#111;display:grid;place-items:center;font:16px Arial"><div><b style="font-size:24px">404</b>　This page could not be found.<p style="font-size:12px">/recreate did not exist in the original commit.</p></div></div>'
const rows=[
  ['Grade · desktop',doc(noPage),doc(render()),1280,850],
  ['Formato · desktop',doc(noPage),doc(render('outfit-morph')),1280,1000],
  ['Efeito · página de entrada · desktop',doc(effectHtml(false),read('app/effects/effects.css')),doc(effectHtml(true),read('app/effects/effects.css')),1280,850],
  ['Efeito · criação · desktop',oldClips(),doc(render('effect-kiss')),1280,1000],
  ['Grade · mobile',doc(noPage),doc(render()),390,900],
  ['Formato · mobile',doc(noPage),doc(render('outfit-morph')),390,1100],
  ['Efeito · página de entrada · mobile',doc(effectHtml(false),read('app/effects/effects.css')),doc(effectHtml(true),read('app/effects/effects.css')),390,1100],
  ['Efeito · criação · mobile',oldClips(),doc(render('effect-kiss')),390,1100],
]
const sections=rows.map(([title,before,after,width,height],i)=>'<section><h2>'+title+'</h2><div class="pair"><div><h3>ANTES · origin/main</h3>'+(before?frame(before,width,height):'<div class="note">O efeito abria o formulário público /clips, sem prévia ao lado. O código original não foi alterado. Veja a captura original no relatório de referência.</div>')+'</div><div><h3>DEPOIS · interno</h3>'+frame(after,width,height)+'</div></div></section>').join('')
function frame(src,w,h){const scaled=w>600;return `<div class="canvas ${scaled?'desktop':'mobile'}" style="--h:${scaled?h*.48:h}px"><iframe title="Comparação visual" style="width:${w}px;height:${h}px;${scaled?'transform:scale(.48);transform-origin:0 0':''}" srcdoc="${escape(src)}"></iframe></div>`}
const html='<!doctype html><html lang="pt"><head><meta charset="UTF-8"><title>Recreate — antes e depois</title><style>body{background:#e9e9e5;color:#202120;margin:0;padding:30px;font:14px Arial}h1{letter-spacing:-1px;font-size:32px}p{max-width:950px;line-height:1.6}.pair{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}section{margin:42px 0}h2{font-size:19px}h3{font-size:12px;letter-spacing:1px}.canvas{background:#fff;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px #0002;height:var(--h)}.desktop{width:614px}.mobile{width:390px}iframe{border:0;display:block}.note{max-width:570px;padding:25px;border:1px dashed #777;border-radius:12px;line-height:1.7}</style></head><body><h1>Recreate · comparação antes/depois</h1><p>Renderização dos componentes reais em HTML autocontido. Dados de demonstração: curtidas zero e saldo/custo simulados para inspeção visual. Não é produção nem prova de geração. Os vídeos usam os pôsteres próprios nesta comparação estática. As páginas novas não existiam na base; efeitos conservam o comportamento público com o interruptor fechado.</p>'+sections+'</body></html>'
fs.writeFileSync(path.join(__dirname,'ANTES-DEPOIS.html'),html)
fs.writeFileSync(path.join(__dirname,'FORMATO.html'),doc(render('outfit-morph')))
const previous = execFileSync('git',['show','f3af4dfe2:app/recreate/RecreateClient.tsx'],{cwd:ROOT,encoding:'utf8'})
const beforePrice = render('outfit-morph',true,{'app/recreate/RecreateClient.tsx':previous},40,0)
const pricingRows = [
  ['Desktop · saldo 40',1280,1000,render('outfit-morph')],
  ['Desktop · faltam créditos',1280,1000,render('outfit-morph',true,{},20)],
  ['Mobile · saldo 40',390,1100,render('outfit-morph')],
  ['Mobile · faltam créditos',390,1100,render('outfit-morph',true,{},20)],
].map(([title,w,h,after])=>'<section><h2>'+title+'</h2><div class="pair"><div><h3>ANTES · política substituída</h3>'+frame(doc(beforePrice),w,h)+'</div><div><h3>DEPOIS · preço aprovado · sem grátis</h3>'+frame(doc(after),w,h)+'</div></div></section>').join('')
fs.writeFileSync(path.join(__dirname,'PRECO-ANTES-DEPOIS.html'),html.slice(0,html.indexOf('<body>'))+'<body><h1>Recreate · correção de preço</h1><p>09/11/2026 · componentes reais, saldo simulado. Compare a política anterior com a nova tarifa no Generate e o aviso de quanto falta, com acesso aos planos. Não comprova cobrança ou render em produção.</p>'+pricingRows+'</body></html>')
console.log('Generated standalone comparison and format preview from real React components.')
