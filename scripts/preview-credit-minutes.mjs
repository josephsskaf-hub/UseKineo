// Self-contained before/after plus the real React slider. Synthetic reads; payments disabled.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { renderPage } from './preview-ux-complete.mjs'
const require = createRequire(import.meta.url)
const ts = require('typescript'), postcss = require('postcss'), tailwind = require('tailwindcss')
const out = process.argv[2]
if (!out) throw Error('Supply an output HTML path')
const rd = file => fs.readFileSync(file, 'utf8')
const compile = code => ts.transpileModule(code, { compilerOptions: { module: 1, jsx: ts.JsxEmit.React, target: 9 } }).outputText
const files = ['lib/credits/engineCost.ts', 'lib/credits/creditMinutes.ts', 'lib/credits/creditSlider.ts', 'lib/checkoutPricing.ts', 'lib/autopilot/config.ts', 'lib/ads/offer.ts', 'components/KineoBolt.tsx', 'components/CreditMinutesSummary.tsx', 'components/CreditsTopupModal.tsx']
const modules = Object.fromEntries(files.map(file => ['@/' + file.replace(/\.tsx?$/, ''), compile(rd(file))]))
const cache = {}
function load(id) {
  if (cache[id]) return cache[id]
  const module = { exports: {} }; cache[id] = module.exports
  vm.runInNewContext(modules[id], { module, exports: module.exports, require: load, process: { env: {} } })
  return module.exports
}
const pricing = load('@/lib/checkoutPricing'), offer = load('@/lib/ads/offer'), minutes = load('@/lib/credits/creditMinutes')
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const note = credits => renderPage('components/CreditMinutesSummary.tsx', false, {}, { credits })
const money = minor => pricing.formatCheckoutMoney('usd', minor)
const plans = after => ['starter', 'basic', 'pro'].map((tier, i) => `<div class="sample"><h3>${['Starter', 'Creator', 'Studio'][i]}</h3><b class="price">${money(pricing.TIER_PRICES[tier].usd)}<small> / month</small></b><p>${pricing.TIER_CREDITS[tier]} credits / month</p>${after ? note(pricing.TIER_CREDITS[tier]) : ''}</div>`).join('')
const pass = after => `<div class="sample"><h3>Studio Ads pass</h3><b class="price">${money(offer.ADS_PASS_USD_MINOR)}</b><p>${offer.ADS_PASS_CREDITS} credits · ${offer.ADS_PASS_ACCESS_DAYS} days of access</p>${after ? note(offer.ADS_PASS_CREDITS) : ''}</div>`
const baseRoute = execFileSync('git', ['show', 'd3c21742:app/api/stripe/checkout/route.ts'], { encoding: 'utf8' })
const checkoutDescription = code => vm.runInNewContext(code.slice(code.indexOf('async function buildAdsPassAndRedirect')).match(/description: (`[^`]+`)/)[1], { ADS_PASS_CREDITS: offer.ADS_PASS_CREDITS, minutesLine: minutes.minutesLine })
const beforeModal = renderPage('components/CreditsTopupModal.tsx', true, { amount: 150, currency: 'usd', credits: 0 }, { onClose() {}, surface: 'offline_preview' }, 'd3c21742')
const afterModal = renderPage('components/CreditsTopupModal.tsx', false, { amount: 150, currency: 'usd', credits: 0 }, { onClose() {}, surface: 'offline_preview' })
const css = await postcss([tailwind({ content: [{ raw: beforeModal + afterModal, extension: 'html' }], corePlugins: { preflight: true } })]).process('@tailwind base;@tailwind utilities;', { from: undefined })
const runtime = `
const modules=${JSON.stringify(modules)};
const cache={};
const dict=${JSON.stringify(JSON.parse(rd('lib/ui/refinementCopy.json')))};
const Language=React.createContext('en');
function req(id){if(id==='react')return React;if(id==='@/components/InterfaceLanguage')return {useInterfaceLanguage:()=>React.useContext(Language),useUiCopy:()=>{const lang=React.useContext(Language);return text=>dict[lang]?.[text]??text}};if(id==='@/lib/checkoutTelemetry')return {useCheckoutLaunch:()=>({pending:null,error:null,launch:()=>alert('Prévia: pagamento desativado.')})};if(cache[id])return cache[id];if(!modules[id])throw Error('Unexpected import '+id);const m={exports:{}};cache[id]=m.exports;new Function('module','exports','require','process',modules[id])(m,m.exports,req,{env:{NODE_ENV:'test'}});return m.exports;}
window.fetch=async url=>{if(url==='/api/geo')return {ok:true,json:async()=>({currency:'usd'})};if(url==='/api/credits')return {ok:true,json:async()=>({credits:0})};throw Error('Network blocked');};
const Modal=req('@/components/CreditsTopupModal').default;
function App(){const [language,setLanguage]=React.useState('en');return React.createElement(Language.Provider,{value:language},React.createElement('label',{className:'fixture-label'},'Idioma da nova linha ',React.createElement('select',{value:language,onChange:e=>setLanguage(e.target.value)},React.createElement('option',{value:'en'},'English'),React.createElement('option',{value:'pt'},'Português'))),React.createElement(Modal,{onClose(){},surface:'offline_preview'}));}
ReactDOM.createRoot(document.getElementById('live-modal')).render(React.createElement(App));
document.getElementById('theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'};
`
const react = rd(require.resolve('react').replace(/index\.js$/, 'umd/react.production.min.js'))
const reactDom = rd(require.resolve('react-dom').replace(/index\.js$/, 'umd/react-dom.production.min.js'))
const document = `<!doctype html><html lang="pt-BR" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · créditos em minutos</title><style>${css.css}${rd('app/appearance.css')}.grad-text{-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:24px}main{max-width:1200px;margin:auto}h1{font-size:28px;font-weight:700;margin:0 0 12px}h2{font-size:21px;font-weight:700;margin:32px 0 18px}h3{font-size:16px;font-weight:700;margin:0 0 10px}.caption{font-size:13px;color:var(--muted);line-height:1.6;max-width:850px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:22px}.sample{border:1px solid var(--border);background:var(--card);border-radius:14px;padding:20px;margin-bottom:12px}.sample p{font-size:14px;margin-top:8px}.price{font-size:26px}.price small{font-size:13px;color:var(--muted);font-weight:400}.beforeafter{font-size:12px;letter-spacing:1px;color:var(--muted);margin:0 0 12px}.demo-popup [role=dialog]{position:relative!important;inset:auto!important;z-index:auto!important;background:transparent!important;backdrop-filter:none!important;padding:0!important;display:block!important}.demo-popup [role=dialog]>div{max-width:none;box-shadow:none!important}.fixture-label{display:block;font-size:12px;margin-bottom:10px}.fixture-label select,#theme{padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text)}#theme{float:right}header{margin-bottom:25px}a{pointer-events:none}.checkout-copy{line-height:1.7;font-size:14px;background:var(--card);border:1px solid var(--border);padding:20px;border-radius:14px}@media(max-width:700px){body{padding:16px}.pair{grid-template-columns:1fr}#theme{float:none;margin-bottom:12px}}</style><main><header><button id="theme">Light / Dark</button><h1>Créditos em minutos</h1><p class="caption">Antes e depois das seções alteradas. Valores reais das fontes atuais, sem antecipar a escada de 09/10. A barra à direita usa o componente React do produto; leituras são simuladas e pagamentos estão desativados.</p></header><h2>Planos · abaixo dos créditos</h2><div class="pair"><article><h3 class="beforeafter">ANTES</h3>${plans(false)}</article><article><h3 class="beforeafter">DEPOIS</h3>${plans(true)}</article></div><h2>Popup · arraste a barra</h2><div class="pair"><article><h3 class="beforeafter">ANTES · 150 CRÉDITOS</h3><div class="demo-popup">${beforeModal}</div></article><article><h3 class="beforeafter">DEPOIS · INTERATIVO</h3><div class="demo-popup" id="live-modal"></div></article></div><h2>Passe · Pricing e revisão da compra</h2><div class="pair"><article><h3 class="beforeafter">ANTES</h3>${pass(false)}</article><article><h3 class="beforeafter">DEPOIS</h3>${pass(true)}</article></div><h2>Passe · descrição enviada ao checkout</h2><div class="pair"><article><h3 class="beforeafter">ANTES</h3><p class="checkout-copy">${esc(checkoutDescription(baseRoute))}</p></article><article><h3 class="beforeafter">DEPOIS</h3><p class="checkout-copy">${esc(checkoutDescription(rd('app/api/stripe/checkout/route.ts')))}</p></article></div></main><script>${react}</script><script>${reactDom}</script><script>${runtime.replace(/<\/script/gi, '<\\/script')}</script></html>`
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, document)
console.log(`Before/after saved: ${out}`)
