// Real SSR and real canonical tables; no effects, network or checkout.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server');
const {render}=require('../docs/revisoes/pricing-enxuta-1711/preview.cjs'),{loader}=require('../docs/recreate-0911/test-recreate.cjs');
const canon=ssr(React.createElement(loader()('components/seo/TrafficCitation2310').CitationDetails,{page:'home'}));
assert.equal((canon.match(/<table>/g)||[]).length,2);assert.equal((canon.match(/<h3>/g)||[]).length,5);
const cut=html=>html.slice(html.indexOf('<section class="pv-stage"'),html.indexOf('</section>',html.indexOf('<section class="pv-stage"'))+10);
for(const signed of [false,true]){
 const before=render(true,signed),after=render(false,signed);
 assert.equal(cut(after),cut(before),'plan cards, values and buttons unchanged');
 const details=after.slice(after.indexOf('<details class="pricing-reference"'));assert(details.includes(canon),'canonical two tables + five questions byte-identical in HTML');assert(!details.startsWith('<details open'));
 assert.equal((after.slice(0,after.indexOf('<details class="pricing-reference"')).match(/aria-expanded=/g)||[]).length,3,'only three nonduplicated primary questions');
 assert(/faceless/i.test(after));assert(after.includes('Choose your plan'));assert(after.includes('Cancel anytime from your account'));
}
const src=fs.readFileSync('app/pricing/PricingClient.tsx','utf8').replace(/\r\n/g,'\n'),old=cp.execFileSync('git',['show','8c1d7b4d4:app/pricing/PricingClient.tsx'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
const faq=s=>s.slice(s.indexOf('const buildFaqs'),s.indexOf('// Push #267'));
assert.equal(faq(src),faq(old),'all prior FAQ answers untouched');
for(const name of ['handleBuy','handleBuyAutopilotPilot','handleCheckoutSetupRetry']){
 const block=s=>s.slice(s.indexOf('  function '+name+'('),s.indexOf('\n  }',s.indexOf('  function '+name+'('))+4);assert.equal(block(src),block(old),name+' unchanged');
}
assert(src.indexOf('role="alert"')>src.indexOf('return (\n    <div className={`pricing-blue'),'checkout error stays outside closed reference content');
console.log('PASS plans byte-identical, canonical tables/5questions/faceless, all FAQ copy, handlers and visible payment alerts.');

const active=render(false,true,true);
const notice=active.indexOf('You already have an active subscription!');
assert(notice>=0 && notice<active.indexOf('<details class="pricing-reference"'),'active plan notice outside collapsed reference');
const detailsBeforeNotice=active.slice(0,notice).match(/<\/?details\b[^>]*>/g)||[];
const openDetails=[];
for(const tag of detailsBeforeNotice){
 if(tag.startsWith('</')) openDetails.pop();
 else openDetails.push(tag);
}
assert(openDetails.every(tag=>/\sopen(?:[\s=>])/.test(tag)),'notice must be visible without opening any details');
assert.equal((active.match(/id="pricing-inclui-titulo"/g)||[]).length,1);
assert.equal((active.match(/id="pricing-inclui-curto-titulo"/g)||[]).length,1);
