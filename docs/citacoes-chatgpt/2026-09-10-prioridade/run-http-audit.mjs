import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const base='https://www.usekineo.com';
const start=new Date();
const stamp=()=>({utc:new Date().toISOString(),brt:new Date(Date.now()-3*3600000).toISOString().replace('Z','-03:00')});
const decode=s=>s.replace(/&#(x[\da-f]+|\d+);/gi,(_,x)=>String.fromCodePoint(x[0].toLowerCase()==='x'?parseInt(x.slice(1),16):+x)).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const text=s=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
async function get(url){
 const attempts=[];
 for(let n=0;n<2;n++){
  const at=stamp();
  try{
   const r=await fetch(url,{redirect:'manual',headers:{'User-Agent':'Kineo-public-content-audit/1.0','Accept':'text/html,text/plain,application/xml'},signal:AbortSignal.timeout(20000)});
   const raw=await r.text(); const headers={};
   for(const k of ['date','content-type','cache-control','age','x-vercel-cache','x-nextjs-cache','x-robots-tag','location','etag','last-modified'])if(r.headers.has(k))headers[k]=r.headers.get(k);
   attempts.push({...at,status:r.status,headers});
   const jsonld=[...raw.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(x=>{try{return JSON.parse(x[1])}catch{return x[1]}});
   const plain=r.headers.get('content-type')?.includes('text/plain')?raw:text(raw);
   const meta=[...raw.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).filter(x=>/description|robots|og:title|og:description|twitter:title|twitter:description/.test(x));
   const findings=[];
   for(const [kind,re] of [['legacy_entry',/\$1(?![\d.,])|no free trial|card required|payment method required|Version B|Versão B|40\s*%|25 (?:free )?credits|80 credits|60 free credits|checkout currency/gi],['terms',/(?:\$|R\$)\s*\d+(?:[.,]\d+)?|\b\d+\s*(?:free )?credits\b|.{0,25}(?:trial|watermark|affiliate|commission|no card|sem cart[aã]o|reais|BRL).{0,80}/gi]]){
    for(const m of plain.matchAll(re))findings.push({kind,match:m[0],excerpt:plain.slice(Math.max(0,m.index-125),m.index+m[0].length+180)});
   }
   return {url,attempts,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:Buffer.byteLength(raw),title:decode(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),canonical:raw.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||null,meta,jsonld,text:plain,findings};
  }catch(e){attempts.push({...at,error:e.name+': '+e.message});}
 }
 return {url,attempts};
}
const sitemap=await get(base+'/sitemap.xml');
const sitemapRaw=await (async()=>{ const r=sitemap.text||''; return r })();
// XML tags are stripped in text. Retrieve locs from body before stripping via text URL pattern.
const sitemapUrls=[...sitemapRaw.matchAll(/https:\/\/www\.usekineo\.com\/[^\s<]+/g)].map(x=>x[0]);
const comp=fs.readFileSync('lib/comparisons.ts','utf8');
const pairs=[...comp.matchAll(/^    slug: '([^']+-vs-[^']+)'/gm)].map(x=>x[1]);
const aliases=pairs.map(s=>s.split('-vs-').reverse().join('-vs-'));
const engine=fs.readFileSync('app/ai-video-generator/[engine]/page.tsx','utf8');
const engineKeys=[...engine.matchAll(/^\s+param: '([^']+)'/gm)].map(x=>x[1]);
const codePaths=['/','/pricing','/llms.txt','/chatgpt-to-youtube-shorts','/chatgpt','/ai-video-generator','/vs',...engineKeys.map(x=>'/ai-video-generator/'+x),...pairs.map(x=>'/vs/'+x),...aliases.map(x=>'/vs/'+x)];
const urls=[...new Set([...codePaths.map(x=>base+x),...sitemapUrls.filter(x=>/\/(?:ai-video-generator|vs)(?:\/|$)/.test(x))])];
const data={label:'EVIDÊNCIA DE PRODUÇÃO',method:'Public HTTPS GET, no credentials, no browser JS; text is HTML extraction excluding scripts/styles, not computed visual visibility. Aliases use manual redirects; max two attempts per URL.',sourceCommit:'0f2c05a7ea916b1615827cdfa9af5af33debaea1',startedUtc:start.toISOString(),sitemap:{...sitemap,text:undefined,findings:undefined},inventory:{sitemapUrls:sitemapUrls.filter(x=>/\/(?:ai-video-generator|vs)(?:\/|$)/.test(x)),engineKeys,pairs,aliases,urls},pages:[]};
let next=0;
async function worker(){while(next<urls.length){const i=next++;const r=await get(urls[i]);data.pages[i]=r;console.log(i+1+'/'+urls.length,urls[i],r.attempts.at(-1).status||r.attempts.at(-1).error);}}
await Promise.all(Array.from({length:6},worker));
data.finishedUtc=new Date().toISOString();
fs.writeFileSync(path.join(decodeURIComponent(out),'http-audit.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({total:urls.length,pairs:pairs.length,aliases:aliases.length,engines:engineKeys.length,status:data.pages.reduce((o,p)=>{let s=p.attempts.at(-1).status||'error';o[s]=(o[s]||0)+1;return o},{})}));
