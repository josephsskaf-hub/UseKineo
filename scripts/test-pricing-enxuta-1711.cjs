// Real SSR and real canonical tables; no effects, network or checkout.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server');
const {render}=require('../docs/revisoes/pricing-enxuta-1711/preview.cjs'),{loader}=require('../docs/recreate-0911/test-recreate.cjs');
const {findPricingMarkers,normalizeStudioCopy}=require('./test-support/pricing-markup.cjs');
const canon=ssr(React.createElement(loader()('components/seo/TrafficCitation2310').CitationDetails,{page:'home'}));
assert.equal((canon.match(/<table>/g)||[]).length,2);assert.equal((canon.match(/<h3>/g)||[]).length,5);
const cut=html=>html.slice(html.indexOf('<section class="pv-stage"'),html.indexOf('</section>',html.indexOf('<section class="pv-stage"'))+10);
for(const signed of [false,true]){
 const before=render(true,signed),after=render(false,signed);
 assert.equal(normalizeStudioCopy(cut(after)),normalizeStudioCopy(cut(before)),'plan structure, values and buttons unchanged');
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

const visibleTestId = (html, id) => {
  const markers = findPricingMarkers(html, 'data-testid', id);
  assert(markers.length === 1 && markers[0].visible, id + ' is unique and visible with details closed');
};
for (const billing of ['monthly', 'annual']) {
  const html = render(false, true, false, {
    billing,
    latestFilm: { url: '/demonstration.mp4', title: 'Local example', quality: null, seconds: null },
  });
  visibleTestId(html, 'pricing-refund-notice');
  visibleTestId(html, 'pricing-first-film-guarantee');
  assert(findPricingMarkers(html, 'data-kineo', 'latest-film')[0]?.visible, 'the account’s film stays visible');
  assert.equal(html.split('Full refund if you email us').length - 1, 2, 'refund policy is shown once and also retained in FAQ');
  if (billing === 'monthly') visibleTestId(html, 'pricing-renewal-notice');
}
const promo = render(false, false, false, { promo: true });
visibleTestId(promo, 'pricing-promo-notice');
assert.equal(findPricingMarkers(promo, 'data-testid', 'pricing-renewal-notice').length, 0);
assert(promo.includes('Not ready to choose?') && promo.indexOf('Not ready to choose?') < promo.indexOf('<details class="pricing-reference"'));

function referenceDetails(element) {
  if (!React.isValidElement(element)) return undefined;
  if (element.type === 'details' && Object.hasOwn(element.props, 'data-pricing-reference')) return element;
  return React.Children.toArray(element.props.children).map(referenceDetails).find(Boolean);
}
const events = [];
render(false, false, false, {
  billing: 'annual',
  trackEvent: (...args) => events.push(args),
  inspect: tree => {
    const { onToggle } = referenceDetails(tree).props;
    const closed = { open: false };
    const opened = { open: true };
    onToggle({ target: closed, currentTarget: closed });
    onToggle({ target: { open: true }, currentTarget: opened });
    assert.deepEqual(events, [], 'closing and nested FAQ toggles do not count');
    onToggle({ target: opened, currentTarget: opened });
  },
});
assert.deepEqual(events, [['pricing_reference_opened', { surface: 'pricing_page', billing: 'annual', variant: 'standard' }]]);
console.log('PASS: notices, one first-film guarantee, account proof, and reference open event.');
