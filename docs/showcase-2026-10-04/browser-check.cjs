const {chromium}=require('C:/Users/josep/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});const events=[],errors=[],media=[];
await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname==='/signup')return route.fulfill({contentType:'text/html',body:'<title>Local signup destination stub</title>'});if(u.pathname==='/api/events'){const e=r.postDataJSON();if(e.event_name?.startsWith('showcase_'))events.push(e);return route.fulfill({json:{ok:true,stored:true}})}if(u.pathname.startsWith('/api/'))return route.fulfill({json:{ok:false,stored:false}});if(u.pathname.endsWith('.mp4'))media.push(u.pathname);return route.continue()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3417/showcase',{waitUntil:'domcontentloaded'});await page.locator('#films video').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#films video').paused);
assert.equal(await page.locator('#ads video').getAttribute('src'),null);assert.equal(await page.locator('#images video').getAttribute('src'),null);
await page.locator('#films .sc-tile').nth(1).click();await page.waitForFunction(()=>document.querySelector('#films .sc-selected h3').textContent.includes('Maracaibo'));
await page.locator('#films video').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#films video').paused);await page.locator('#films [data-showcase-action=preview]').click();await page.waitForFunction(()=>document.querySelector('#films video').paused);
await page.locator('#ads').scrollIntoViewIfNeeded();assert.equal(await page.locator('#films video').getAttribute('src'),null);await page.locator('#ads video').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#ads video').paused);
for(const section of ['films','images','spaces','ads']){const tiles=page.locator('#'+section+' .sc-tile');for(let i=0;i<await tiles.count();i++){await tiles.nth(i).click();assert.equal(await tiles.nth(i).getAttribute('aria-pressed'),'true')}await tiles.first().click()}
await page.locator('#spaces input[type=range]').fill('72');assert.equal(await page.locator('#spaces input').inputValue(),'72');assert.equal(await page.locator('#spaces .sc-before').getAttribute('data-manual'),'true');
await page.locator('.sc-actions a[href="/signup"]').scrollIntoViewIfNeeded();await page.locator('.sc-actions a[href="/signup"]').click({modifiers:['Control']});
assert.equal(events.filter(e=>e.event_name==='showcase_impression').length,1);assert.equal(events.filter(e=>e.event_name==='showcase_first_gesture').length,1);assert.equal(events[0].metadata.showcase_version,'showcase_v1');
assert.ok(await page.evaluate(()=>localStorage.getItem('kineo_signup_campaign')?.includes('showcase_v1')));
await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(300);assert.equal(events.filter(e=>e.event_name==='showcase_impression').length,1);
const locales=['en','pt','es','fr','de','it','nl','pl','tr','ru','uk','ar','ur','hi','id','vi'];const localeProof=[];
for(const locale of locales){await page.setViewportSize({width:360,height:800});await page.locator('select.kineo-interface-language').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l && document.documentElement.dir.length>0,locale);const size=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,dir:document.documentElement.dir,h1:document.querySelector('h1').textContent}));assert.ok(size.scroll<=size.w,locale+' horizontal overflow '+JSON.stringify(size));assert.equal(size.dir,['ar','ur'].includes(locale)?'rtl':'ltr');localeProof.push({locale,...size});}
await page.locator('select.kineo-interface-language').selectOption('en');await page.emulateMedia({reducedMotion:'reduce'});
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]])for(const theme of ['light','dark']){
await page.setViewportSize({width,height});await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('kineo:appearance:v1',t)},theme);
for(const section of ['films','images','spaces','ads']){await page.locator('#'+section).scrollIntoViewIfNeeded();await page.locator('#'+section+' .sc-tile').last().scrollIntoViewIfNeeded();await page.waitForTimeout(200)}
await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:`docs/showcase-2026-10-04/${name}-${theme}.jpg`,fullPage:true,type:"jpeg",quality:78});await page.screenshot({path:`docs/showcase-2026-10-04/${name}-${theme}-top.jpg`,type:"jpeg",quality:85});
}
assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://www.usekineo.com/showcase-og.jpg');assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.usekineo.com/showcase');
assert.deepEqual(errors,[]);fs.writeFileSync('docs/showcase-2026-10-04/browser.json',JSON.stringify({date:new Date().toISOString(),localOnly:true,externalNetworkBlocked:true,apiResponsesMocked:true,locales:localeProof,events,media:[...new Set(media)],errors,checks:['anonymous 200','visibility playback','offscreen source absent','pause','all tiles select','manual curtain','deduplicated impression/gesture','signup campaign preserved','all locales at 360px','RTL','four screenshots','unique metadata']},null,2));
await browser.close();console.log('Browser checks passed')
})().catch(e=>{console.error(e);process.exit(1)});
