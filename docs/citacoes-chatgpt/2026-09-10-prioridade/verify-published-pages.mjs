// Public GET verification only. No cookies, account, generation or write API.
import fs from 'node:fs';
const origin = process.argv[2] || 'http://127.0.0.1:4318';
if (!['http://127.0.0.1:4318', 'https://www.usekineo.com'].includes(origin)) throw new Error('Unexpected origin');
const paths = [
  '/ai-video-generator/free-script-to-faceless-video',
  '/ai-video-generator/free-faceless-tiktok-tools',
  '/ai-video-generator/complete-60-second-shorts-cost',
  '/vs/invideo-alternatives-faceless-shorts',
  '/ai-video-generator/faceless-shorts-under-30',
  '/ai-video-generator/free-youtube-shorts',
  '/ai-video-generator/horror-story-60-seconds',
  '/ai-video-generator/chatgpt-script-to-finished-short',
];
const decode = s => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const rows = [];
for (const path of paths) {
  const res = await fetch(origin + path, {headers:{'User-Agent':'Kineo-citation-release-verification/1.0'},signal:AbortSignal.timeout(60000)});
  const body = await res.text();
  const plain = decode(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
  const schemas = [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(x=>{try{return JSON.parse(x[1])}catch{return null}}).filter(Boolean);
  const faq = schemas.find(x=>x['@type']==='FAQPage');
  const canonical = decode(body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'');
  const checks = {
    status200:res.status===200,
    ownComponent:body.includes('data-citacoes-version="citacoes_01_20260910"'),
    oneH1:(body.match(/<h1\b/g)||[]).length===1,
    canonical:canonical==='https://www.usekineo.com'+path,
    cta:plain.includes('Start free — 30 credits, no card'),
    faq:faq?.mainEntity?.length===5,
    monthlyPlans:['$9.90/month','$19.90/month','$39.90/month'].every(x=>plain.includes(x)),
    brazil:plain.includes('Brazilian customers pay in reais'),
    noOldOffer:!/(?:80 (?:trial |free )?credits|USD worldwide|no free trial|\$1\s+(?:for|to start))/.test(plain),
    fastTimeScoped:plain.includes('Kineo 1 (Fast): usually'),
  };
  rows.push({url:origin+path,timeUtc:new Date().toISOString(),status:res.status,cache:res.headers.get('x-vercel-cache'),title:decode(body.match(/<title>([^<]*)/)?.[1]||''),canonical,checks,pass:Object.values(checks).every(Boolean)});
}
for(const path of ['/ai-video-generator','/sitemap.xml','/llms.txt']){
  const res=await fetch(origin+path,{headers:{'User-Agent':'Kineo-citation-release-verification/1.0'},signal:AbortSignal.timeout(60000)});
  const body=await res.text();
  rows.push({url:origin+path,timeUtc:new Date().toISOString(),status:res.status,linkedPaths:paths.filter(x=>body.includes(x)),pass:res.status===200&&paths.every(x=>body.includes(x))});
}
const output='docs/citacoes-chatgpt/2026-09-10-prioridade/'+(origin.startsWith('https')?'production':'local')+'-verification.json';
fs.writeFileSync(output,JSON.stringify({classification:origin.startsWith('https')?'EVIDÊNCIA DE PRODUÇÃO':'TESTADO LOCALMENTE',method:'Public GETs, no cookies, no JS/client analytics, no acquisition clicks. Checks cover public output, not video generation or signup.',rows},null,2)+'\n');
console.log(JSON.stringify({output,passed:rows.filter(x=>x.pass).length,total:rows.length,rows},null,2));
if(rows.some(x=>!x.pass))process.exitCode=1;
