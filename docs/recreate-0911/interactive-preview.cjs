// Browser QA of the actual component, with explicit in-memory fixtures. All generation/upload calls are refused.
const fs = require('node:fs')
const path = require('node:path')
const { ROOT, formats, read } = require('./test-recreate.cjs')
const ts = require(path.join(ROOT,'node_modules/typescript'))
const modules = new Map()
function add(file) {
  if (modules.has(file)) return
  modules.set(file,'')
  if (file.endsWith('.css')) { modules.set(file,'module.exports={}');return }
  if (file.endsWith('.json')) { modules.set(file,'module.exports='+read(file));return }
  let code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText
  code=code.replace(/require\("([^\"]+)"\)/g,(match,name)=>{
    if(name==='react'||name==='react/jsx-runtime'||name==='next/link')return match
    if(!name.startsWith('.')&&!name.startsWith('@/'))throw new Error('Unexpected browser import '+name)
    let next=name.startsWith('@/')?name.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(file),name))
    if(!/\.(json|css)$/.test(next))next+=fs.existsSync(path.join(ROOT,next+'.ts'))?'.ts':'.tsx'
    add(next);return 'require('+JSON.stringify(next)+')'
  })
  modules.set(file,code)
}
add('app/recreate/RecreateClient.tsx')
const jsx = fs.readFileSync(path.join(ROOT,'node_modules/react/cjs/react-jsx-runtime.production.min.js'),'utf8')
const table = [...modules].map(([file,code])=>JSON.stringify(file)+':function(require,module,exports){'+code+'}').join(',')
const posterData=Object.fromEntries(formats.RECREATE_FORMATS.map(f=>{
  const file=f.poster.startsWith('/api/')?'lib/recreate/assets/'+formats.RECREATE_ASSETS[f.poster.split('/').pop()].file:'public'+f.poster
  const ext=path.extname(file).slice(1)
  return [f.poster,`data:image/${ext==='jpg'?'jpeg':ext};base64,${fs.readFileSync(path.join(ROOT,file)).toString('base64')}`]
}))
const quotes=formats.RECREATE_FORMATS.map(f=>({id:f.id,credits:f.type==='swap'?0:formats.recreateEffectCredits(f),available:true}))
const fixture=`
const quotes=${JSON.stringify(quotes)}, likes=Object.fromEntries(quotes.map(q=>[q.id,{id:q.id,count:0,liked:false}]));
const posters=${JSON.stringify(posterData)};
window.fetch=async(url,options={})=>{const u=String(url);if(u==='/api/recreate/social'){if(options.method==='POST'){const p=JSON.parse(options.body);if(p.action==='like')likes[p.format]={id:p.format,count:p.liked?1:0,liked:p.liked};return new Response(JSON.stringify({saved:true}))}return new Response(JSON.stringify({items:Object.values(likes)}))}if(u==='/api/recreate'){if(options.method==='POST'){const p=JSON.parse(options.body);if(p.simulate){const f=${JSON.stringify(formats.RECREATE_FORMATS)}.find(f=>f.id===p.format);return new Response(JSON.stringify({simulation:true,format:f.title,seconds:f.seconds,photos:f.photoSlots,mode:f.type==='swap'?'Face swap':'Photo effect',charged:false}))}return new Response(JSON.stringify({error:'QA fixture: generation is disabled.'}),{status:503})}return new Response(JSON.stringify({freeAvailable:true,catalog:quotes}))}return new Response(JSON.stringify({error:'QA fixture: uploads and live requests are disabled.'}),{status:503})};
new MutationObserver(()=>{for(const video of document.querySelectorAll('video')){const poster=video.getAttribute('poster');if(posters[poster])video.poster=posters[poster];if(video.getAttribute('src'))video.removeAttribute('src')}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','poster']});
`
const html='<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recreate — QA local</title><style>body{margin:0}'+read('app/recreate/recreate.css')+'</style></head><body><div style="padding:9px 20px;background:#503f14;color:white;font:12px Arial">QA LOCAL · dados simulados · nenhum upload, geração ou gasto é permitido nesta prévia.</div><div id="root"></div><script>'+fs.readFileSync(path.join(ROOT,'node_modules/react/umd/react.production.min.js'),'utf8')+'</script><script>'+fs.readFileSync(path.join(ROOT,'node_modules/react-dom/umd/react-dom.production.min.js'),'utf8')+'</script><script>'+fixture+'const modules={'+table+',"react":function(r,m){m.exports=React},"react/jsx-runtime":function(require,module,exports){'+jsx+'},"next/link":function(r,m){m.exports={__esModule:true,default:function(p){return React.createElement("a",{href:p.href,className:p.className,onClick:e=>e.preventDefault()},p.children)}}}};const cache={};function require(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;modules[id](require,m,m.exports);return m.exports}ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(require("app/recreate/RecreateClient.tsx").default,{initialId:"outfit-morph"}));</script></body></html>'
fs.writeFileSync(path.join(__dirname,'INTERATIVO.html'),html)
console.log('Interactive fixture generated from the actual Recreate component; live network and generation disabled.')
