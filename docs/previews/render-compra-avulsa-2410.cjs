// KINEO-COMPRA-AVULSA-2410 — actual TSX SSR, offline fixtures, effects disabled. No app build, server, env or payment.
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process'), { createRequire } = require('module')
const root = process.cwd(), req = createRequire(path.join(root, 'package.json'))
const React = req('react'), ts = req('typescript'), { renderToStaticMarkup } = req('react-dom/server')
const base = '7950e411', adsFile = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const failNetwork = () => { throw new Error('Network is forbidden in this offline preview') }
global.fetch = failNetwork
const read = (p, before = false) => before ? execFileSync('git', ['show', `${base}:${p}`], { encoding: 'utf8' }) : fs.readFileSync(path.join(root, p), 'utf8')
function renderer(before, fixture = {}) {
  let stateIndex = 0
  const cache = new Map(), hooks = { ...React, useState(initial) { const index = stateIndex++; return [index in fixture ? fixture[index] : typeof initial === 'function' ? initial() : initial, () => {}] }, useRef: value => ({ current: value }), useEffect() {} }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }; cache.set(file, box.exports)
    const code = ts.transpileModule(read(file, before), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { module: box, exports: box.exports, URL, URLSearchParams, AbortController, console, process: { env: { NODE_ENV: 'production' } }, fetch: failNetwork, require: id => {
      if (id === 'react') return hooks
      if (id === 'react/jsx-runtime') return req(id)
      if (id === 'react-dom') return { createPortal: node => node }
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
      if (id.includes('checkoutTelemetry')) return { useCheckoutLaunch: () => ({ pending: null, error: null, launch: failNetwork, setError() {} }) }
      if (id === '@/lib/analytics') return { trackEvent: failNetwork }
      if (id.includes('uploadFootage')) return { AdsUploadError: class extends Error {}, uploadFootage: failNetwork }
      let next = id.startsWith('@/') ? id.slice(2) : path.posix.join(path.posix.dirname(file), id)
      if (!fs.existsSync(path.join(root, next))) next += fs.existsSync(path.join(root, `${next}.tsx`)) ? '.tsx' : '.ts'
      return load(next)
    } }, { filename: file })
    return box.exports
  }
  return { load, render: (file, props) => renderToStaticMarkup(React.createElement(load(file).default, props)) }
}
function pricing(before) {
  const r = renderer(before), business = r.render('components/pricing/PricingBusinessBlock.tsx', { onBuy() {}, pending: false })
  // The added section sits immediately before the unchanged Business card in PricingClient.tsx.
  const oneTime = before ? '' : r.render('components/OneTimeItemOffer.tsx', { surface: 'pricing' })
  return `<div class="context">Contexto: os planos Starter, Creator e Studio continuam acima, com os mesmos preços.</div>${oneTime}${business}`
}
function paywall(before) { return renderer(before).render('components/PostVideoPaywall.tsx', { credits: 0 }) }
function ads(before, stage = 'choose', member = false) {
  const form = { foto: '', frase: 'Stride: tênis leve para sua rotina.', oferta: '', beneficios: 'Leve', cta: 'Conheça o Stride.', language: 'pt', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'amara', category: 'footwear', scenario_id: 'footwear_beach' }
  const values = { 0: form, 1: stage, 2: '00000000-0000-4000-8000-000000000001', 3: [], 4: 'still-2', 5: 'Stride. Leve para sua rotina. Conheça o Stride.', 7: 41, 11: true, 15: 1, 16: 2 }
  const r = renderer(before, values), cat = r.load('lib/ads/cena/escolhaCatalog.ts')
  const svg = decodeURIComponent(cat.escolhaPreviewDataUrl('footwear_beach', 'pt').split(',')[1]).replace('PRÉVIA ILUSTRATIVA', 'FIXTURE ILUSTRATIVA')
  const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  if (stage === 'choose') values[3] = [1, 2, 3, 4].map(n => ({ id: `still-${n}`, url: image }))
  const html = r.render(adsFile, { lang: 'pt', ownerKey: 'offline:owner', resume: false, balance: 0, oneTimeMember: member })
  const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m => m[0]).join('')
  const lastSection = [...html.matchAll(/<section class="ace-card">[\s\S]*?<\/section>/g)].at(-1)?.[0] ?? ''
  const tail = html.slice(html.indexOf(lastSection) + lastSection.length).replace(/<aside[\s\S]*$/, '').replace(/<\/div>\s*$/, '')
  return `<div class="ace">${styles}${lastSection}${tail}</div>`
}
const pairs = [
  { id: 'pricing', title: 'Tela de pagamento · planos e opção avulsa', before: pricing(true), after: pricing(false), dark: false },
  { id: 'paywall', title: 'Paywall após vídeo · opção ao lado dos planos', before: paywall(true), after: paywall(false), dark: true },
  { id: 'ads', title: 'Studio Ads · seleção final, saldo insuficiente', before: ads(true), after: ads(false), dark: false },
  { id: 'stills', title: 'Studio Ads · antes da preparação das fotos', before: ads(true, 'planned'), after: ads(false, 'planned'), dark: false },
  { id: 'member', title: 'Studio Ads · membro usa o saldo do dono', before: ads(true, 'choose', true), after: ads(false, 'choose', true), dark: false },
]
for (const [state, title] of [['confirming', 'Confirmando a compra'], ['pending', 'Confirmação ainda pendente'], ['auth', 'Sessão precisa de login']]) {
  const r = renderer(false)
  pairs.push({ id: `confirmation-${state}`, title: `Retorno do pagamento · ${title}`, before: '<div class="context">Esta tela de confirmação ainda não existia na base 7950e411.</div>', after: renderToStaticMarkup(React.createElement(r.load('components/OneTimeItemConfirmation.tsx').OneTimeItemConfirmationView, { state, loginHref: '/login?redirect=%2Fcheckout%2Fitem%3Fsession_id%3Dcs_test_offline' })), dark: false })
}
async function main() {
  const postcss = req('postcss'), tailwind = req('tailwindcss')
  const utilities = (await postcss([tailwind({ content: [{ raw: pairs.map(p => p.before + p.after).join(''), extension: 'html' }], corePlugins: { preflight: false }, theme: { extend: {} } })]).process('@tailwind utilities;', { from: undefined })).css
  const wrap = (content, dark) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:${dark ? '#111113' : '#f9faf7'};font:14px Arial,sans-serif;--accent:#4062e8;--on-accent:#fff;--card:${dark ? '#1d1d1f' : '#fff'};--card2:${dark ? '#222225' : '#f0f3f0'};--text:${dark ? '#f5f5f7' : '#1f2c28'};--text2:${dark ? '#e5e5ea' : '#31463a'};--muted:${dark ? '#b2b2b8' : '#65756f'};--border:${dark ? '#3a3a3c' : '#d9dedb'};--border2:var(--border)}button,a,input{font:inherit}.context{padding:14px 16px;border:1px dashed #aab8b0;color:#5a7064;border-radius:12px;line-height:1.5}.kb-biz{margin-top:24px!important}${utilities}</style></head><body>${content}</body></html>`
  const esc = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · compra avulsa · 24/10</title><style>*{box-sizing:border-box}body{margin:0;font:14px/1.5 Arial,sans-serif;color:#20372b;background:#e8ede9}header{padding:22px 28px;background:#fff}h1{font-size:25px;letter-spacing:-.035em;margin:0}header p{margin:7px 0;color:#587064;font-size:12px}nav{display:flex;flex-wrap:wrap;gap:8px;padding:14px 28px;background:#f7faf7}nav button{font:inherit;padding:8px 13px;border:1px solid #b9c8bf;border-radius:8px;background:#fff;cursor:pointer}main{padding:0 22px 24px}.group{padding-top:18px}.group[hidden]{display:none}.group h2{font-size:18px;margin:0 0 12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel{min-width:0}.label{font-size:12px;font-weight:750;letter-spacing:.04em;margin:0 0 9px}.device{width:100%;overflow:hidden;border:1px solid #bccbc1;border-radius:13px;background:white}.device iframe{border:0;display:block;transform-origin:top left}.mobile .pair{grid-template-columns:390px 390px;justify-content:center}.mobile .device{width:390px}@media(max-width:830px){.pair,.mobile .pair{grid-template-columns:1fr}.mobile .device{width:100%}}</style></head><body><header><h1>Compra avulsa · só quero 1 agora</h1><p>TESTADO LOCALMENTE · antes: ${base} · depois: UI desta entrega. SSR dos TSX reais, estados offline explícitos; HTML e CSS autocontidos.</p><p>Fotos ilustrativas marcadas como fixtures. Sem build do aplicativo, servidor, acesso a env, checkout real ou geração paga. Esta prévia não comprova pagamento ou entrega em produção.</p></header><nav><button id="desktop">Desktop</button><button id="mobile">Celular</button><button data-section="all">Todas</button>${pairs.map(p => `<button data-section="${p.id}">${p.title}</button>`).join('')}</nav><main>${pairs.map(p => `<section class="group" id="${p.id}"><h2>${p.title}</h2><div class="pair"><div class="panel"><p class="label">ANTES · ${base}</p><div class="device"><iframe title="Antes ${p.title}" srcdoc="${esc(wrap(p.before, p.dark))}"></iframe></div></div><div class="panel"><p class="label">DEPOIS · compra única, sem assinatura</p><div class="device"><iframe title="Depois ${p.title}" srcdoc="${esc(wrap(p.after, p.dark))}"></iframe></div></div></div></section>`).join('')}</main><script>let mobile=new URLSearchParams(location.search).get('view')==='mobile';function resize(){document.body.classList.toggle('mobile',mobile);document.querySelectorAll('.device').forEach(d=>{const f=d.querySelector('iframe'),w=mobile?390:960,scale=d.clientWidth/w;f.style.width=w+'px';f.style.transform='scale('+scale+')';const h=Math.max(120,f.contentDocument?.documentElement.scrollHeight||500);f.style.height=h+'px';d.style.height=h*scale+'px'})}function select(id){document.querySelectorAll('.group').forEach(s=>s.hidden=id!=='all'&&s.id!==id);resize()}document.querySelectorAll('iframe').forEach(f=>f.onload=resize);document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>select(b.dataset.section));document.getElementById('desktop').onclick=()=>{mobile=false;resize()};document.getElementById('mobile').onclick=()=>{mobile=true;resize()};window.onresize=resize;select(new URLSearchParams(location.search).get('section')||'all');setTimeout(resize,250);setTimeout(resize,1000)</script></body></html>`
  const output = path.join(root, 'docs/previews/COMPRA-AVULSA-2410.html')
  fs.writeFileSync(output, html)
  console.log(JSON.stringify({ output, sections: pairs.length, source: 'Actual TSX SSR; explicit offline state fixtures', network: 0 }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
