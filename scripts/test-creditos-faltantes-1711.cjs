// Offline: real modal and entry components; HTTP/effects disabled.
const assert=require('node:assert/strict'),fs=require('node:fs'),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server');
const {loader}=require('../docs/recreate-0911/test-recreate.cjs');
const stubs={
 react:{...React,useEffect:()=>{}},
 '@/lib/checkoutTelemetry':{useCheckoutLaunch:()=>({pending:null,launch:()=>{throw Error('checkout forbidden')}})},
 '@/lib/analytics':{trackEvent:()=>{throw Error('analytics forbidden')}},
 '@/components/KineoBolt':{__esModule:true,default:()=>null},
 '@/components/CreditMinutesSummary':{__esModule:true,default:()=>null},
};
const L=loader(stubs),{default:Modal,creditShortfallCopy:copy}=L('components/CreditsTopupModal');
for(const bad of [null,undefined,0,-1,NaN,Infinity,1.5,'20'])assert.equal(copy(bad),null);
assert.equal(copy(1),'You need 1 more credit.');assert.equal(copy(20),'You need 20 more credits.');
const render=(shortfall,recarga)=>ssr(React.createElement(Modal,{shortfall,recarga,surface:'fixture',onClose:()=>{}}));
for(const n of [1,20])for(const recarga of [undefined,{go:'/fixture-disabled',back:'/recreate/example',qa:true}]){
 const html=render(n,recarga);assert(html.includes(copy(n)));assert(!html.includes('out of credits'));if(!recarga)assert(html.includes('/pricing?from=out_of_credits'));
}
assert(render().includes('Add credits to keep creating'));
// Resolve entry with both server decisions; verify the real nested modal receives the quote.
for(const decision of ['nada',{show:true,go:'/fixture-disabled',qa:true}]){
 const Entry=loader({...stubs,react:{...React,useEffect:()=>{},useState:()=>[decision,()=>{}]}})('components/billing/BuyCreditsEntry');
 for(const name of ['TopupOuRecargaModal','BuyCreditsModal']){
 const tree=Entry[name]({surface:'fixture',offer:{go:'/fixture-disabled',qa:true},shortfall:20,onClose:()=>{}});assert.equal(tree.props.shortfall,20);
 }
}
const source=fs.readFileSync('app/recreate/RecreateClient.tsx','utf8');assert(source.includes('shortfall={faltam}'));
console.log('PASS invalid/unknown quotes, singular/plural, free/subscriber render, server entry propagation; no HTTP or checkout.');
if(process.argv.includes('--preview')){
 const cp=require('node:child_process'),old=cp.execFileSync('git',['show','8c1d7b4d4:components/CreditsTopupModal.tsx'],{encoding:'utf8'});
 const Before=loader(stubs,{'components/CreditsTopupModal.tsx':old})('components/CreditsTopupModal').default;
 const dir='docs/revisoes/creditos-faltantes-1711';fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(dir+'/comparison.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credits · before / after</title><style>html{scrollbar-width:none}*{box-sizing:border-box}body{margin:0;background:#f4f5f8;color:#18202e;font:15px system-ui;--surface:#fff;--text:#18202e;--muted:#576171;--border:#d9dfe8;--accent:#0655f8}header{padding:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}.pane{min-width:0;position:relative;min-height:650px;border:1px solid #d9dfe8;border-radius:20px;overflow:hidden}.pane h3{position:absolute;top:12px;left:20px;z-index:1001}.pane [role=dialog]{position:absolute!important}h1{font-size:26px}p{line-height:1.5}@media(max-width:600px){main{grid-template-columns:1fr;padding:12px}.pane{min-height:345px}header{padding:16px}}</style><header><h1>Credits · before / after</h1><p>DEV · simulated account with a positive balance; server quote shortfall: 20 credits. No checkout.</p></header><main><section class="pane"><h3>Before</h3>'+ssr(React.createElement(Before,{surface:'fixture',onClose:()=>{}}))+'</section><section class="pane"><h3>After</h3>'+render(20)+'</section></main>');
}
