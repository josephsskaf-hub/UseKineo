// Local Chromium/CDP visual verification. All API requests are fixture responses; external requests are blocked.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const root = process.cwd(), out = path.join(root, 'docs/watch-precos-1311')
fs.mkdirSync(path.join(out, 'prints'), { recursive: true })
const port = Number(process.env.PRICING_PREVIEW_PORT || 4188), debugPort = Number(process.env.PRICING_CDP_PORT || 4190)
const chromePath = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
const browserPath = process.env.CHROMIUM_PATH || (fs.existsSync(chromePath) ? chromePath : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
const profile = fs.mkdtempSync(path.resolve(root, '..', 'm6-precos-chromium-'))
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket, seq = 0
const pending = new Map(), network = [], errors = [], captures = []
function packageComparison() {
  const image = name => 'data:image/png;base64,' + fs.readFileSync(path.join(out, 'prints', name)).toString('base64')
  const pair = (width, full) => `<div class="pair ${width === 390 ? 'mobile' : ''}">${['antes', 'depois'].map(side => {
    const name = `${side}-${width}-${full ? 'completa' : 'primeira'}.png`
    return `<figure><figcaption>${side === 'antes' ? 'Antes · público preservado' : 'Depois · opção A em prévia'} · ${width}px</figcaption><img loading="lazy" alt="${side} da página de preços em ${width}px, ${full ? 'página inteira' : 'primeira tela'}" src="${image(name)}"></figure>`
  }).join('')}</div>`
  const at = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preços WATCH · antes e depois</title><style>*{box-sizing:border-box}body{margin:0;background:#101113;color:#f7f6f2;font:16px/1.6 Arial,sans-serif}main{max-width:1920px;margin:auto;padding:24px}h1{font-size:32px;line-height:1.2}h2{font-size:24px}p{max-width:90ch}a{color:#e2f77a}nav{display:flex;flex-wrap:wrap;gap:12px}nav a,summary{padding:12px;min-height:44px}nav a{border:1px solid #59626e;border-radius:8px}section,details{margin:32px 0}summary{cursor:pointer;font-weight:bold}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}.pair.mobile{grid-template-columns:repeat(2,minmax(0,390px));justify-content:center}figure{margin:0;min-width:0}figcaption{padding:10px 0;font-size:14px;font-weight:bold}img{display:block;width:100%;height:auto;border:1px solid #41464d}code{overflow-wrap:anywhere;font-size:14px}.note{border-left:3px solid #e2f77a;padding:8px 18px;background:#191c20}button{font:inherit}@media(max-width:700px){main{padding:16px}.pair,.pair.mobile{grid-template-columns:1fr}h1{font-size:26px}}</style><main><h1>Preços WATCH · opção A</h1><p class="note"><strong>TESTADO LOCALMENTE · prévia fechada.</strong> Capturas do componente real no Chromium em ${at}. A página pública continua na apresentação anterior: <code>WATCH_PRICING_PUBLIC = false</code>. Nenhum deploy, compra, conta ou backend foi validado por esta entrega.</p><p>Creator primeiro, seis linhas por cartão, uma alternância de cobrança, botão fora dos detalhes, garantia canônica uma vez e respostas completas preservadas no HTML. Este arquivo contém todas as imagens; abre sem internet, build ou servidor.</p><nav><a href="#mobile">Celular · primeira tela</a><a href="#desktop">Desktop · primeira tela</a><a href="#inteiras">Páginas inteiras</a><a href="#detalhes">Anual e detalhes</a><a href="#revisao">Como revisar</a></nav><section id="mobile"><h2>Celular · 390 × 844</h2>${pair(390, false)}</section><section id="desktop"><h2>Desktop · 1920 × 1080</h2>${pair(1920, false)}</section><section id="inteiras"><h2>Todas as seções tocadas</h2><p>As páginas inteiras incluem detalhes fechados, prova social, comparações, Business, FAQ e rodapé. Abra cada comparação para percorrer toda a página.</p><details><summary>Celular · página inteira antes e depois</summary>${pair(390, true)}</details><details><summary>Desktop · página inteira antes e depois</summary>${pair(1920, true)}</details></section><section id="detalhes"><h2>Anual e detalhes abertos · interação local</h2><p>A alternância foi acionada e o painel nativo foi aberto sem clicar em checkout. As equivalências e a tabela continuam presentes no HTML quando o painel está fechado.</p><figure style="max-width:390px"><figcaption>Depois · anual · detalhes abertos · 390px</figcaption><img loading="lazy" alt="Prévia anual com detalhes do Creator abertos" src="${image('depois-390-anual-detalhes.png')}"></figure></section><section id="revisao"><h2>Como revisar no app local</h2><p>Na worktree <code>m6-precos</code>, use a porta isolada <code>4188</code>. Abra <a href="http://127.0.0.1:4188/pricing-preview?billing=monthly">/pricing-preview?billing=monthly</a> ou <a href="http://127.0.0.1:4188/pricing-preview?billing=annual">/pricing-preview?billing=annual</a>. A rota de revisão é <code>noindex</code> e não está no sitemap. A integração pode passar <code>watchPreview</code> ao mesmo PricingClient; os handlers de compra permanecem os existentes.</p><p>Condições iguais nos dois lados: visitante público, USD exibido e liquidação BRL, ofertas fechadas, sem sessão, consentimento negado. Todas as chamadas de API foram respondidas por fixtures locais e a rede externa foi bloqueada. A captura verifica apresentação e navegação local; não comprova conversão, disponibilidade financeira real ou checkout em produção.</p><p>Fontes: estudo e prints de líderes de 13/11/2026; preços e créditos de <code>lib/checkoutPricing.ts</code>; equivalências dos helpers canônicos. Os valores foram lidos pelo componente, sem tabela manual nesta comparação.</p></section></main></html>`
  fs.writeFileSync(path.join(out, 'COMPARACAO.html'), html)
  console.log('Self-contained comparison: ' + Buffer.byteLength(html) + ' bytes')
}
function call(method, params = {}) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)) }, 120_000)
    pending.set(id, { resolve(value) { clearTimeout(timer); resolve(value) }, reject(error) { clearTimeout(timer); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (value.exceptionDetails) throw Error(value.exceptionDetails.text + ': ' + value.exceptionDetails.exception?.description)
  return value.result.value
}
async function waitFor(expression, limit = 90_000) {
  const end = Date.now() + limit
  while (Date.now() < end) { if (await evaluate(expression)) return; await pause(150) }
  throw Error('UI timeout: ' + expression)
}
function fixture(url) {
  if (url.pathname === '/api/geo') return { country: 'BR', currency: 'usd', region: 'standard', settlement_currency: 'brl', local_method: null }
  if (url.pathname === '/api/affiliate/offer') return { offer: null }
  if (url.pathname === '/api/offers/black-friday') return { nowMs: Date.now(), kit: { state: 'closed', endsAt: '', daysLeft: 0 }, annual: { open: false, endsAt: '', tiers: {} } }
  if (url.pathname === '/api/consent') return { region: 'opt_in' }
  if (url.pathname === '/api/stats/public') return { available: false }
  if (url.pathname.includes('availability')) return { available: false, paidLive: false, live: false }
  if (url.pathname === '/api/videos') return { videos: [] }
  if (url.pathname.includes('plan-switch')) return { subscribed: false }
  return {}
}
try {
  let targets
  const startupDeadline = Date.now() + 30_000
  while (Date.now() < startupDeadline) { try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`, { signal: AbortSignal.timeout(800) })).json(); if (targets.some(x => x.type === 'page')) break } catch {} await pause(100) }
  assert(targets?.some(x => x.type === 'page'), 'Local Chromium must expose a page')
  socket = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data)
    if (message.id) { const entry = pending.get(message.id); pending.delete(message.id); if (entry) message.error ? entry.reject(Error(JSON.stringify(message.error))) : entry.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params, url = new URL(request.url)
      try {
        if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:') { network.push({ action: 'blocked-external', origin: url.origin, method: request.method }); await call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }); return }
        if (url.pathname.startsWith('/api/')) { network.push({ action: 'local-fixture', path: url.pathname, method: request.method }); await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(fixture(url))).toString('base64') }); return }
        await call('Fetch.continueRequest', { requestId })
      } catch (error) { if (!String(error).includes('Invalid InterceptionId')) errors.push(String(error)) }
    }
  })
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable')
  await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await call('Network.setCookie', { name: 'kineo_consent', value: 'v1.denied', url: `http://127.0.0.1:${port}`, path: '/' })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('kineo:consent-region:v1',JSON.stringify({r:'opt_in',t:Date.now()}));document.addEventListener('DOMContentLoaded',()=>{document.documentElement.dataset.theme='dark'});" })
  for (const [side, route] of [['antes', '/pricing'], ['depois', '/pricing-preview']]) for (const width of [390, 1920]) {
    const height = width === 390 ? 844 : 1080
    console.log('Capturing local ' + side + ' ' + width)
    // A narrow desktop viewport exercises the same responsive CSS and lets Chromium
    // paint beyond the viewport for full-page evidence (mobile:true clips layers).
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await call('Page.navigate', { url: `http://127.0.0.1:${port}${route}?billing=monthly` })
    await waitFor("document.querySelectorAll('#plans>.pv-card').length===3 && !document.querySelector('#plans .pv-amount').textContent.includes('—') && [...document.querySelectorAll('#plans .pv-note')].some(x=>x.textContent.includes('Charged in BRL'))")
    await evaluate("document.documentElement.dataset.theme='dark';document.fonts.ready")
    await pause(300)
    const state = await evaluate(`(()=>{const cards=[...document.querySelectorAll('#plans>.pv-card')];const c=cards.find(x=>x.dataset.tier==='basic');const b=c.querySelector('.pv-cta');const rect=b.getBoundingClientRect();return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,tiers:cards.map(x=>x.dataset.tier),creatorButton:{top:rect.top,bottom:rect.bottom,text:b.textContent},details:[...document.querySelectorAll('.pv-compact-details')].map(x=>({open:x.open,tables:x.querySelectorAll('table').length})),faq:[...document.querySelectorAll('[aria-expanded]')].map(x=>x.getAttribute('aria-expanded')),fonts:[...document.querySelectorAll('.pricing-blue *')].filter(x=>x.getClientRects().length&&x.textContent.trim()&&x.childElementCount===0).filter(x=>parseFloat(getComputedStyle(x).fontSize)<12).map(x=>({tag:x.tagName,size:getComputedStyle(x).fontSize,text:x.textContent.slice(0,60)}))}})()`)
    if (side === 'depois') {
      assert.equal(state.tiers[0], 'basic', 'Creator is first')
      assert(state.details.length === 3 && state.details.every(x => !x.open && x.tables === 1), 'All three inclusion disclosures are closed with real tables still in HTML')
      assert(state.faq.every(x => x === 'false'), 'FAQ starts closed')
      assert.equal(state.fonts.length, 0, 'Visible page text is at least 12px')
      assert(state.scrollWidth <= width, 'No horizontal overflow')
      if (width === 390) assert(state.creatorButton.bottom <= height, 'Creator CTA fits the first 390x844 viewport')
    }
    for (const full of [false, true]) {
      const name = `${side}-${width}${full ? '-completa' : '-primeira'}.png`
      const metrics = await call('Page.getLayoutMetrics')
      // Chrome mobile emulation can report only the visual viewport in cssContentSize.
      // Include the real page wrapper, not just body/html (both use height:100%).
      const pageHeight = await evaluate("Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,document.querySelector('.pricing-blue').getBoundingClientRect().bottom+scrollY))")
      const clip = full ? { x: 0, y: 0, width, height: Math.max(Math.ceil(metrics.cssContentSize.height), pageHeight), scale: 1 } : { x: 0, y: 0, width, height, scale: 1 }
      if (full) assert(clip.height > height, 'Full page must include content below the first viewport')
      // Expand only for the full-page photograph so all composited layers paint.
      // The first-viewport assertions and pictures above retain the actual 844/1080 height.
      if (full) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: clip.height, deviceScaleFactor: 1, mobile: false })
        await evaluate('scrollTo(0,0)'); await pause(180)
      }
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip })
      fs.writeFileSync(path.join(out, 'prints', name), Buffer.from(shot.data, 'base64'))
      captures.push({ name, side, width, height: clip.height, state })
      if (full) await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    }
    if (side === 'depois' && width === 390) {
      await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Annual')).click()")
      await waitFor("document.querySelector('#plans .pv-per')?.textContent.includes('billed yearly')")
      await evaluate("document.querySelector('.pv-compact-details').open=true")
      assert(await evaluate("document.querySelector('.pv-compact-details').textContent.includes('Each month, by engine') && document.querySelector('.pv-compact-details table').getBoundingClientRect().height>0"), 'Included details open with visible engine data')
      await evaluate("scrollTo(0,document.querySelector('#plans').getBoundingClientRect().top+scrollY-12)")
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const name = 'depois-390-anual-detalhes.png'
      fs.writeFileSync(path.join(out, 'prints', name), Buffer.from(shot.data, 'base64'))
      captures.push({ name, side, width, height, billing: 'annual', detailsOpen: true })
    }
  }
  assert.equal(errors.length, 0, 'No browser runtime errors')
  fs.writeFileSync(path.join(out, 'CAPTURAS.json'), JSON.stringify({ status: 'TESTADO LOCALMENTE', date: new Date().toISOString(), fixtures: 'Public visitor, BR settlement, no active offers/session; consent denied. All API requests locally fulfilled, all external requests blocked. No checkout clicked.', captures, network, errors }, null, 2))
  packageComparison()
  console.log(JSON.stringify({ captures: captures.length, blockedOrMockedRequests: network.length, runtimeErrors: errors.length }))
} catch (error) {
  console.error('Runtime details:', JSON.stringify(errors))
  throw error
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) { await call('Browser.close'); socket.close() } } catch {}
  browser.kill()
}
