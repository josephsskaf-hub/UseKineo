// Offline design proposals: render the approved page and offer facts unchanged.
// Uses an existing dependency runtime; never auth, analytics, checkout or generation.
const fs = require('fs'), path = require('path'), vm = require('vm');
const {createRequire} = require('module');
const req = createRequire(process.env.KINEO_PREVIEW_RUNTIME || path.join(process.cwd(),'package.json'));
const React = req('react'), ts = req('typescript'), {renderToStaticMarkup} = req('react-dom/server');
const root = process.cwd(), out = path.join(root,'public/design/business-ads-20260924');
fs.mkdirSync(out,{recursive:true});
const cache = new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,URL,URLSearchParams,process:{env:{}},require:id=>{
    if(id==='next/image')return {__esModule:true,default:({priority,sizes,...props})=>React.createElement('img',props)};if(id==='react')return React;if(id==='react/jsx-runtime')return req(id);
    if(id.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
    if(id==='@/lib/analytics')return {trackEvent:()=>{throw Error('No analytics in preview')}};
    if(id==='@/lib/supabase/client')return {createClient:()=>{throw Error('No auth in preview')}};
    let p=id.startsWith('@/')?id.slice(2):path.posix.join(path.posix.dirname(file),id);
    if(!fs.existsSync(path.join(root,p)))p+=fs.existsSync(path.join(root,p+'.tsx'))?'.tsx':'.ts';
    return load(p);
  }},{filename:file});return exports;
}

const current=renderToStaticMarkup(React.createElement(load('app/business-video-ads/page.tsx').default));
const css=fs.readFileSync(path.join(root,'app/business-video-ads/businessAds.module.css'),'utf8');
const original=fs.readFileSync(path.join(out,'antes.html'),'utf8');
const approved=fs.readFileSync(path.join(out,'studio.html'),'utf8');
const fonts=approved.match(/<style>([\s\S]*?)\*\{box-sizing/)[1];
const asset='data:image/png;base64,'+fs.readFileSync(path.join(out,'restaurant-concept.png')).toString('base64');
const safe=current.replaceAll('/design/business-ads-20260924/restaurant-concept.png',asset).replace(/href="https:\/\/buy\.stripe\.com[^"]*"/g,'href="#packages"');
const after='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fonts+'*{box-sizing:border-box}body{margin:0;--font-manrope:Manrope}'+css+'</style><body>'+safe+'</body></html>';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
const report='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo Empresas — Studio aplicado</title><style>body{margin:0;background:#090e15;color:#eef5ff;font:14px Arial}header{padding:18px 24px}button{background:#2997ff;border:0;padding:10px 18px;border-radius:8px;margin-left:12px}main{display:flex;gap:15px;padding:0 20px;height:calc(100vh - 80px);overflow:auto}section{width:50%;display:flex;flex-direction:column;min-width:300px}p{margin:0 0 8px}iframe{border:1px solid #304357;flex:1;background:#090e15}main.mobile section{width:390px;flex-shrink:0}@media(max-width:700px){main{flex-direction:column}section{width:100%;height:80vh;flex-shrink:0}}</style><header>03 · Studio — antes e depois · comparação visual, compras desativadas <button onclick="document.querySelector(\'main\').classList.toggle(\'mobile\')">Desktop / celular</button></header><main><section><p>Antes</p><iframe title="Antes" srcdoc="'+escape(original)+'"></iframe></section><section><p>Depois · página implementada</p><iframe title="Depois" srcdoc="'+escape(after)+'"></iframe></section></main></html>';
const destination=process.argv[2];if(!destination)throw Error('Pass an output path for the self-contained comparison');
fs.writeFileSync(destination,report);console.log('Actual Studio page rendered offline with offers, image, fonts and before/after comparison.');
