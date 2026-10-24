// Offline artifact authoring only: no env loader, network, build or production access.
const fs = require('fs')
const path = require('path')
const Module = require('module')
const cp = require('child_process')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup: render } = require('react-dom/server')
const root = path.resolve(__dirname, '../..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest)
}
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
}
const { TRAFFIC_CITATIONS, TRAFFIC_CITATION_UPDATED } = require(path.join(root, 'lib/seo/trafficCitation2310.ts'))
const { CitationDirectAnswer, CitationDetails } = require(path.join(root, 'components/seo/TrafficCitation2310.tsx'))
const { CHECKOUT_CURRENCY_DISCLOSURE } = require(path.join(root, 'lib/marketingPrice.ts'))
const { ENGINE_GEO } = require(path.join(root, 'lib/growth/enginePageCatalog.ts'))
const { getIntentPage } = require(path.join(root, 'lib/seo/intentPages.ts'))
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const beforeSource = (file) => cp.execFileSync('git', ['show', `895d6c99638dc0af65e11ad761f4999141587fa7:${file}`], { cwd: root, encoding: 'utf8' })
const introFromSource = (file, firstWords) => beforeSource(file).match(new RegExp(`${firstWords}[^<]+`))[0].trim()
const horrorSource = beforeSource('app/free-ai-shorts/[niche]/page.tsx')
const horrorBefore = JSON.parse(`"${horrorSource.match(/horror: \{[\s\S]*?intro:\s*'([^']+)'/)[1]}"`)
const beforeCurrency = 'Kineo lists and charges plan prices in USD worldwide. Your bank may convert the charge to your local currency and may add conversion or cross-border fees.'
const pages = [
  { key: 'home', route: '/', heading: 'Narrated films', before: '<p class="absent">Before: no concise answer in this film-header position. The founder-curated films follow the header.</p>' },
  { key: 'seedance', route: '/ai-video-generator/seedance', heading: 'Seedance 1.5 AI Video Generator', before: `<p>${escape(ENGINE_GEO.seedance.answerLead)} ${escape(ENGINE_GEO.seedance.planLine)}</p>` },
  { key: 'text', route: '/text-to-video-shorts', heading: 'Turn Text Into a Finished YouTube Short', before: `<p>${escape(introFromSource('app/text-to-video-shorts/page.tsx', 'Paste a topic, prompt, or full script.'))}</p>` },
  { key: 'horror', route: '/free-ai-shorts/horror', heading: 'Free AI Horror Shorts Generator', before: `<p>${escape(horrorBefore)}</p>` },
  { key: 'urdu', route: '/ai-video-generator/for/urdu', heading: getIntentPage('urdu').h1, before: `<p>${escape(getIntentPage('urdu').intro)}</p>` },
  { key: 'portuguese', route: '/gerador-de-shorts-gratis', heading: 'Crie um Short sem aparecer — grátis', before: `<p>${escape(introFromSource('app/gerador-de-shorts-gratis/page.tsx', 'Digite uma ideia e o Kineo gera'))}</p>` },
]
const results = []
for (const page of pages) {
  const citation = TRAFFIC_CITATIONS[page.key]
  const count = citation.answer.trim().split(/\s+/u).length
  assert(count >= 40 && count <= 60, `${page.key}: ${count} words`)
  assert.equal(citation.faq.length, 5)
  assert(citation.rows.every((row) => row.length === 5))
  const html = render(React.createElement(CitationDetails, { page: page.key }))
  assert(html.toLowerCase().includes('datetime="2026-10-23"'))
  assert.equal((html.match(/<h3>/g) || []).length, 5)
  assert(html.includes('scope="col"'))
  results.push({ page: page.route, answerWords: count, faqs: citation.faq.length, tableRows: citation.rows.length })
}
assert.equal(TRAFFIC_CITATION_UPDATED, '2026-10-23')
assert(CHECKOUT_CURRENCY_DISCLOSURE.includes('Brazil pay in reais (BRL) at checkout'))
assert(!CHECKOUT_CURRENCY_DISCLOSURE.includes('worldwide'))

const card = (page, after) => `<div class="surface"><div class="address">${escape(page.route)}</div><h2>${escape(page.heading)}</h2>${after ? render(React.createElement(CitationDirectAnswer, { page: page.key })) : page.before}<div class="context">Existing product cards, creation controls and showcase remain in their original positions.</div>${after ? render(React.createElement(CitationDetails, { page: page.key })) : '<div class="absent">Before: no GEO-2 table and five-answer block in this position.</div>'}</div>`
const pair = (title, before, after, mobile) => `<section class="comparison"><h2>${escape(title)} · ${mobile ? 'mobile 390 px' : 'desktop'}</h2><div class="pair ${mobile ? 'mobile' : ''}"><div><h3>Antes / Before</h3>${before}</div><div><h3>Depois / After</h3>${after}</div></div></section>`
const body = pages.map((page) => [false, true].map((mobile) => pair(page.route, card(page, false), card(page, true), mobile)).join('')).join('')
const currencyPair = [false, true].map((mobile) => pair('/pricing + home existing price FAQ · currency disclosure', `<div class="surface"><h2>Payment currency</h2><p>${escape(beforeCurrency)}</p></div>`, `<div class="surface"><h2>Payment currency</h2><p>${escape(CHECKOUT_CURRENCY_DISCLOSURE)}</p></div>`, mobile)).join('')
const css = `*{box-sizing:border-box}body{margin:0;background:#EFF1F4;color:#0E1116;font-family:Arial,sans-serif}header{padding:30px;background:#fff;border-bottom:1px solid #D5D8DE}header h1{margin:0 0 10px;font-size:28px}header p{max-width:1000px;line-height:1.6}.comparison{padding:30px 24px;border-bottom:1px solid #CDD2DA}.comparison>h2{font-size:20px;margin:0 0 20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}.pair>div{min-width:0}.pair>div>h3{font-size:13px;text-transform:uppercase;letter-spacing:.05em}.surface{background:#F8F9FB;border:1px solid #DFE2E7;border-radius:18px;padding:22px;min-width:0;overflow:hidden}.surface>h2{font-size:28px;line-height:1.15;font-weight:650}.surface>p{font-size:17px;color:#4D535C;line-height:1.65}.address{color:#0A5CFF;font-size:13px;overflow-wrap:anywhere}.context,.absent{padding:18px;margin:24px 0;background:#EEF3FF;border:1px dashed #B0BFDE;border-radius:12px;line-height:1.6;font-size:13px;color:#566075}.absent{background:#F0F1F3;border-color:#CFD4DD}.mobile{grid-template-columns:390px 390px}.mobile .surface{padding:18px}.mobile .kc2310 table,.mobile .kc2310 caption,.mobile .kc2310 tbody,.mobile .kc2310 tr,.mobile .kc2310 td{display:block;width:100%}.mobile .kc2310 thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.mobile .kc2310 tr{border:1px solid #E4E4E0;border-radius:14px;overflow:hidden;margin-bottom:12px}.mobile .kc2310 td{border:0;border-bottom:1px solid #E4E4E0;padding:10px 14px}.mobile .kc2310 td:last-child{border-bottom:0}.mobile .kc2310 td:before{content:attr(data-label);display:block;font-size:11px;font-weight:650;color:#5A5F67;margin-bottom:3px}.mobile .kc2310 td:first-child{background:#EEF3FF}.mobile .kc2310{margin:28px 0}a{color:#0A5CFF}@media(max-width:850px){.pair{display:flex;flex-direction:column}.pair>div{width:100%}.mobile>div{width:min(390px,100%)}}`
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KINEO-TRAFEGO-2310 · before / after</title><style>${css}</style><header><h1>KINEO-TRAFEGO-2310 · comparação visual</h1><p>23/10/2026. Recortes das seções alteradas, desktop e mobile. Os novos blocos usam o HTML real dos componentes React; o antes vem do commit 895d6c99638dc0af65e11ad761f4999141587fa7. As caixas tracejadas explicam o contexto preservado; não são parte do site. Este arquivo não carrega vídeos, fontes, scripts nem recursos externos.</p><p>IMPLEMENTADO e TESTADO LOCALMENTE: respostas de 40–60 palavras, tabela, cinco FAQs e data. Publicação, indexação, aumento de tráfego e conversão: DESCONHECIDO nesta verificação.</p></header>${body}${currencyPair}</html>`
module.exports = { results, disclosure: CHECKOUT_CURRENCY_DISCLOSURE, html }
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'PREVIEW-PAGES.html'), html)
  fs.writeFileSync(path.join(__dirname, 'pages-verification.json'), JSON.stringify({ date: TRAFFIC_CITATION_UPDATED, state: 'TESTADO LOCALMENTE', pages: results, currencyDisclosure: CHECKOUT_CURRENCY_DISCLOSURE }, null, 2) + '\n')
  console.log(JSON.stringify(results, null, 2))
}
