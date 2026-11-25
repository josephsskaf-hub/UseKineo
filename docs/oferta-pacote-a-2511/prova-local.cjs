const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),dir=path.join(__dirname,'prova');
const postcss=require('postcss'),tailwind=require('tailwindcss'),autoprefixer=require('autoprefixer');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const {offlineCompanyOffer,React,renderToStaticMarkup}=await import('../../scripts/test-support/company-offer-2411.mjs');
 const view='app/company-video-service/CompanyOfferPage.tsx';
 const oldFile=file=>cp.execFileSync('git',['show','c60fb174c:'+file],{cwd:root,encoding:'utf8'});
 const before=offlineCompanyOffer({replacements:{[view]:oldFile(view),'lib/growth/companyOffer.ts':oldFile('lib/growth/companyOffer.ts')}});
 const old=renderToStaticMarkup(React.createElement(before(view).default,{monthlyPriceMinor:29900}));
 fs.mkdirSync(dir,{recursive:true});
 const cssInput=fs.readFileSync(path.join(root,'app/globals.css'),'utf8');
 const config=require(path.join(root,'tailwind.config.js'));
 const markup=fs.readFileSync(path.join(dir,'proposta.html.fragment'),'utf8');
 const output=await postcss([tailwind({...config,content:[{raw:markup+old+fs.readFileSync(path.join(dir,'desligada.html.fragment'),'utf8'),extension:'html'}]}),autoprefixer]).process(cssInput,{from:path.join(root,'app/globals.css')});
 const scoped=fs.readFileSync(path.join(root,'app/company-video-service/company-offer.css'),'utf8');
 const fonts=fs.readFileSync(path.join(root,'app/manrope.css'),'utf8');
 const appearance=fs.readFileSync(path.join(root,'app/appearance.css'),'utf8');
 fs.writeFileSync(path.join(dir,'atual.css'),output.css+'\n'+fonts+'\n'+appearance+'\n'+scoped);
 for(const [name,content] of [['antes',old],['depois',markup],['off',fs.readFileSync(path.join(dir,'desligada.html.fragment'),'utf8')]]) for(const theme of ['light','dark']){
 const csp="default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; media-src 'self'; form-action 'none'; base-uri 'none'";
 fs.writeFileSync(path.join(dir,name+'-'+theme+'.html'),'<!doctype html><html lang="en" data-theme="'+theme+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><title>Oferta '+name+' '+theme+'</title><link rel="stylesheet" href="/atual.css"></head><body>'+content+'</body></html>');
 }
 fs.writeFileSync(path.join(dir,'CSS-RECIBO.json'),JSON.stringify({base:'6804eb7937e92fc10967ecc57b03b6537ac0ff25',globals:sha(cssInput),scoped:sha(scoped),compiled:sha(output.css),fonts:sha(fonts),appearance:sha(appearance),method:'PostCSS/Tailwind instalados; CSS global e componente atuais, sem build Next',before:'c60fb174c com hipótese offline 29900',after:'componente atual, preço por constante, sem override',fontRequests:'somente locais'},null,2));
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.mp4':'video/mp4'};
 http.createServer((req,res)=>{
  if(req.method!=='GET')return res.writeHead(405).end();
  const u=new URL(req.url,'http://127.0.0.1:43851'),name=u.pathname;
  let file;
  if(/^\/(antes|depois|off)-(light|dark)\.html$/.test(name)||name==='/atual.css')file=path.join(dir,name);
  if(/^\/fonts\/manrope-v23\/[a-z-]+\.woff2$/.test(name)||/^\/ads-exemplos\/(relogio|caneca)(\.webp|-completo\.mp4)$/.test(name))file=path.join(root,'public',name);
  if(!file||!fs.existsSync(file))return res.writeHead(404).end();
  res.writeHead(200,{'content-type':types[path.extname(file)],'cache-control':'no-store'});fs.createReadStream(file).pipe(res);
 }).listen(43851,'127.0.0.1',()=>console.log('PROVA LOCAL GET-only 43851; sem API ou formulário enviado'));
})().catch(e=>{console.error(e);process.exitCode=1});
