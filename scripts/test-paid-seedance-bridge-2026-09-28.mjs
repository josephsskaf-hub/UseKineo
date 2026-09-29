// Real JSX and canonical costs, offline: no credentials, network or renders.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { React, root, source, offlineModules, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
const { check, finish } = checks()
const events = []
const mocks = { 'lib/analytics.ts': { trackEvent: (...args) => events.push(args) } }
const load = offlineModules({ mocks })
const Bridge = load('components/PaidSeedanceBridge.tsx').default
const Legacy = load('components/ScriptToSeedanceBridge.tsx').default
const { ENGINE_PAGE_LEAD } = load('lib/publicExamples.ts')
const { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } = load('lib/checkoutPricing.ts')
const { creditCostForDuration } = load('lib/credits/engineCost.ts')
const { TRIAL_CREDITS_SHOWN, FREE_FILM_LABEL } = load('lib/freeTierOffer.ts')
const sample = ENGINE_PAGE_LEAD.find(v => v.engine === 'cinematic_ai' && v.ownershipEvidence === 'founder_confirmed_owned')
const shortCost = creditCostForDuration('cinematic_ai', true, 35)
const minuteCost = creditCostForDuration('cinematic_ai', true, 60)
const html = renderToStaticMarkup(React.createElement(Bridge, {from:'kineo1'}))
check('only the approved existing Seedance leader', html.includes(sample.previewPath) && html.includes(sample.posterPath) && (html.match(/<video /g)||[]).length===1)
check('approved local assets exist', existsSync(resolve(root,'public'+sample.previewPath)) && existsSync(resolve(root,'public'+sample.posterPath)))
check('no autoplay or background media preload', html.includes('preload="none"') && !html.includes('autoPlay'))
check('canonical costs and grant rendered', html.includes(`${shortCost} credits`) && html.includes(`${minuteCost}`) && html.includes(`${TIER_CREDITS.starter} credits per billing month`))
check('price derives from checkout', html.includes(formatCheckoutMoney('usd',TIER_PRICES.starter.usd)))
check('quantity uses floor and shared balance disclosed', html.includes(`${Math.floor(TIER_CREDITS.starter/shortCost)} films`) && html.includes('Other creations share that balance'))
check('trial coverage truthful and short free option visible', html.includes(`${TRIAL_CREDITS_SHOWN}-credit trial`) && html.includes(FREE_FILM_LABEL) && html.includes(TRIAL_CREDITS_SHOWN>=shortCost?'also covers the 35-second reference':'does not cover the longer 35-second reference above'))
check('buying does not require a first render', html.includes('trying a film first is optional'))
check('no invented ChatGPT attribution', html.includes('/ai-video-generator/seedance?from=kineo1_bridge') && !html.includes('utm_source=chatgpt'))
check('version isolates new proof', html.includes('data-bridge="bridge_paid_proof_v2"'))
check('legacy callers keep v1 without video', (()=>{const x=renderToStaticMarkup(React.createElement(Legacy,{from:'state_of_ai'}));return x.includes('data-bridge="bridge_v1"')&&!x.includes('<video')})())
const withoutApproved = offlineModules({mocks:{...mocks,'lib/publicExamples.ts':{ENGINE_PAGE_LEAD:[{...sample,ownershipEvidence:'unverified'}]}}})
check('unverified media never rendered', !renderToStaticMarkup(React.createElement(withoutApproved('components/PaidSeedanceBridge.tsx').default,{from:'kineo1'})).includes('<video'))
for(const [file,from] of [['app/free-ai-shorts-generator/page.tsx','free_ai_shorts_generator'],['app/text-to-video-shorts/page.tsx','text_to_video_shorts']]) {
  const src=source(file),at=src.indexOf(`<PaidSeedanceBridge from="${from}"`)
  check(`${from}: one proof before existing free hero CTA`,at>0&&(src.match(/<PaidSeedanceBridge /g)||[]).length===1&&at<src.indexOf('<OrganicCtaLink'))
  check(`${from}: pause condition retained`,src.includes("!enginePaused(ENGINES.seedance.param)"))
}
check('curation file unmodified',execFileSync('git',['diff','--','lib/publicExamples.ts'],{cwd:root,encoding:'utf8'}).trim()==='')
check('superseded Kineo1 page has no candidate delta', source('app/ai-video-generator/[engine]/page.tsx').replace(/\r\n/g,'\n').trim()===execFileSync('git',['show','c55bab53:app/ai-video-generator/[engine]/page.tsx'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n').trim())
check('owner permanent Kineo1 redirect retained', source('next.config.js').includes("{ source: '/ai-video-generator/kineo-1', destination: '/ai-video-generator/seedance', statusCode: 301 }"))
check('server-only curation selection', !source('components/ScriptToSeedanceBridge.tsx').includes("@/lib/publicExamples"))
check('no effects during static preview',events.length===0)

// Optional self-contained before/after of the exact changed component JSX.
const outIndex=process.argv.indexOf('--preview')
if(outIndex>=0){
 const out=resolve(process.argv[outIndex+1]);mkdirSync(out,{recursive:true})
 const beforeLoad=offlineModules({mocks,replacements:{'components/ScriptToSeedanceBridge.tsx':execFileSync('git',['show','4c7110e2:components/ScriptToSeedanceBridge.tsx'],{cwd:root,encoding:'utf8'})}})
 const Before=beforeLoad('components/ScriptToSeedanceBridge.tsx').default
 const embed=s=>s.replace(/poster="([^"]+)"/g,(_,p)=>`poster="data:image/webp;base64,${readFileSync(resolve(root,'public'+p)).toString('base64')}"`).replace(/src="\/previews\/[^\"]+"/g,'')
 const pairs=[['Kineo 1','kineo1',false],['Free AI Shorts','free_ai_shorts_generator',true],['Text to Video','text_to_video_shorts',true]].map(([name,from,compact])=>`<section><h2>${name}</h2><p>Depois: ponte movida para depois da introdução, antes dos CTAs gratuitos e do formulário. H1 e formulário preservados. Prévia estática sem rede; poster real incorporado, reprodução disponível no produto.</p><div class="pair"><article><h3>Antes · depois dos CTAs gratuitos</h3>${embed(renderToStaticMarkup(React.createElement(Before,{from,compact})))}</article><article><h3>Depois · antes dos CTAs gratuitos</h3>${embed(renderToStaticMarkup(React.createElement(Bridge,{from,compact})))}</article></div></section>`).join('')
 const doc=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seedance · antes/depois</title><style>body{background:#101012;color:#f5f5f7;font:16px Arial;margin:24px}p{line-height:1.5}button{padding:12px}.pair{display:flex;gap:24px;overflow:auto}article{flex:1;min-width:0;background:#000;padding:18px;box-sizing:border-box}.mobile article{flex:none;width:390px}.mobile{overflow:auto}section{margin-bottom:48px}video{max-width:100%}h3{color:#a1a1a6}*{box-sizing:border-box}</style><h1>Prova paga nas três portas existentes</h1><button onclick="document.body.classList.toggle('mobile')">Alternar desktop / mobile 390px</button>${pairs}</html>`
 writeFileSync(resolve(out,'antes-depois.html'),doc)
 for(const [name,from,compact] of [['kineo1','kineo1',false],['free','free_ai_shorts_generator',true],['text','text_to_video_shorts',true]])for(const [suffix,Component] of [['before',Before],['after',Bridge]])writeFileSync(resolve(out,`${name}-${suffix}.html`),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:18px;background:#000;color:white;font:16px Arial;box-sizing:border-box}*{box-sizing:border-box}</style>${embed(renderToStaticMarkup(React.createElement(Component,{from,compact})))}</html>`)
 console.log('PREVIEW '+resolve(out,'antes-depois.html'))
}
finish()
