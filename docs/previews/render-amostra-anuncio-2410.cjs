// Offline preview of real components. No server, upload, provider or credential access.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process')
const base = path.resolve(__dirname, '../..'), modules = path.dirname(path.dirname(require.resolve('typescript/package.json', { paths: [base] })))
const ts = require(path.join(modules, 'typescript')), React = require(path.join(modules, 'react'))
const { renderToStaticMarkup } = require(path.join(modules, 'react-dom/server'))
const component = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
let state = [], at = 0
const hooks = { ...React, useState(initial) { const i = at++; return [i in state ? state[i] : typeof initial === 'function' ? initial() : initial, () => {}] }, useEffect() {}, useRef(value) { return { current: value } } }
function load(file, before = false) {
  const filename = path.resolve(base, file), code = before && file === component ? cp.execFileSync('git', ['show', `1c078ed0:${file}`], { cwd: base, encoding: 'utf8' }) : fs.readFileSync(filename, 'utf8')
  const out = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, box = { exports: {} }
  const req = id => {
    if (id === 'react') return hooks
    if (id === 'react-dom') return { createPortal: v => v }
    if (id === 'react/jsx-runtime') return require(path.join(modules, 'react/jsx-runtime'))
    if (id === '@/lib/ads/uploadFootage') return { AdsUploadError: class extends Error {}, uploadFootage() { throw Error('Upload forbidden in offline preview') } }
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts')
    if (id.startsWith('.')) return load(path.relative(base, path.resolve(path.dirname(filename), id)) + '.ts')
    return require(id)
  }
  vm.runInNewContext('(function(require,module,exports){' + out + '\n})', { URL, URLSearchParams, Intl, console, process: { env: { NODE_ENV: 'production' } } })(req, box, box.exports)
  return box.exports
}
const cat = load('lib/ads/cena/escolhaCatalog.ts'), scene = cat.escolhaScenarios('bottle')[0], image = cat.escolhaPreviewDataUrl(scene.id, 'pt')
const form = { foto: 'https://preview.invalid/product.webp', frase: 'Garrafa Aurora. Sua hidratação acompanha seu dia.', oferta: '', beneficios: '', cta: 'Conheça a Aurora', language: 'pt', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'sofia', category: 'bottle', scenario_id: scene.id }
function render(before, stage, plans = false) {
  const sample = !before
  state = [form, stage, stage === 'edit' ? '' : '11111111-1111-4111-8111-111111111111', Array.from({ length: sample ? 2 : 4 }, (_, i) => ({ id: 'still-' + i, url: 'https://preview.invalid/still-' + i + '.png' })), 'still-0', 'Aurora: hidratação que acompanha você. Leve sua garrafa para toda parte e descubra uma rotina mais prática.', [], sample ? 0 : 41, stage === 'delivered' ? 'https://preview.invalid/video.mp4' : '', '', '', true, false, false, false, 1, sample ? 1 : 2, false, stage === 'delivered', sample, plans, false, 0]
  at = 0
  let html = renderToStaticMarkup(load(component, before).default({ lang: 'pt', ownerKey: 'preview', sampleAvailable: true, initialSample: sample }))
  html = html.replace(/src="\/ads\/presenters\/([^"]+)"/g, (_, name) => `src="data:image/webp;base64,${fs.readFileSync(path.join(base, 'public/ads/presenters', name)).toString('base64')}"`).replace(/https:\/\/preview.invalid\/[^" ]+(?:webp|png)/g, image)
  html = html.replace(/<video[^>]*><\/video>/g, `<div class="sample-film"><img alt="Ilustração, não é vídeo gerado" src="${image}"><span>▶ 0:00 / ${sample ? '0:08' : '0:15'}</span>${sample ? '<b>usekineo.com</b>' : ''}</div>`)
  const css = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1], sections = html.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').match(/<section\b[\s\S]*?<\/section>/g) || []
  return { css, hero: sections[0], choice: sections.find(v => v.includes('ace-stills')), result: sections.find(v => v.includes('sample-film')), upsell: sections.find(v => v.includes('ads-sample-result')), plans: sections.find(v => v.includes('ads-sample-plans')), aside: html.match(/<aside[\s\S]*?<\/aside>/)?.[0] }
}
const be = render(true, 'edit'), ae = render(false, 'edit'), bc = render(true, 'choose'), ac = render(false, 'choose'), bd = render(true, 'delivered'), ad = render(false, 'delivered', true)
const escape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
function frame(parts, css, mobile, height) {
  const doc = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#f6f8f5;font:14px Arial,sans-serif;--accent:#4062e8;--card:#fff;--border:#d9dedb;--text:#1f2c28;--muted:#65756f}a{color:#4062e8}${css}.sample-film{height:300px;position:relative;background:#eff3ed;border-radius:14px;overflow:hidden}.sample-film img{width:100%;height:100%;object-fit:contain}.sample-film span{position:absolute;bottom:12px;left:12px;background:#17281edb;color:white;padding:8px;border-radius:6px}.sample-film b{position:absolute;right:16px;top:45%;background:#14221bab;color:white;padding:6px 10px;border-radius:4px;font-size:16px}.ace-stills img{max-height:240px;object-fit:contain}.ace-stage{position:static}.ace-stage-media{max-height:240px}</style><main class="ace">${parts.filter(Boolean).join('')}</main></html>`
  return `<iframe title="${mobile ? 'Mobile' : 'Desktop'}" width="${mobile ? 390 : 720}" height="${height}" srcdoc="${escape(doc)}"></iframe>`
}
let body = ''
for (const mobile of [false, true]) {
  body += `<section class="group" id="${mobile ? 'mobile' : 'desktop'}"><h2>${mobile ? 'Mobile · 390 px' : 'Desktop · 720 px'}</h2>`
  for (const [name, before, after, height] of [['Entrada e modo grátis', [be.hero], [ae.hero], mobile ? 490 : 390], ['Escolha e limites', [bc.hero, bc.choice, bc.aside], [ac.hero, ac.choice, ac.aside], mobile ? 2170 : 1670], ['Resultado e compra', [bd.result], [ad.result, ad.upsell, ad.plans], mobile ? 2620 : 1790]]) body += `<h3>${name}</h3><div class="pair ${mobile ? 'mob' : ''}"><article><h4>ANTES · acesso pago</h4>${frame(before, bc.css, mobile, height)}</article><article><h4>DEPOIS · amostra grátis</h4>${frame(after, ac.css, mobile, height)}</article></div>`
  body += `<h3>Teto diário</h3><div class="pair ${mobile ? 'mob' : ''}"><article><h4>ANTES</h4><p>Sem amostra neste fluxo.</p></article><article><h4>DEPOIS</h4><div class="cap">As amostras de hoje acabaram — volte amanhã ou gere a versão completa</div></article></div></section>`
}
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · amostra · antes/depois 24/10</title><style>*{box-sizing:border-box}body{background:#e9eee8;margin:0;padding:28px;font-family:Arial,sans-serif;color:#1f2c28}h1{margin:0 0 10px}h2{margin:34px 0 12px}h3{font-size:17px}h4{font-size:12px;letter-spacing:.08em;color:#4062e8}p{max-width:1080px;line-height:1.6}.pair{display:grid;grid-template-columns:720px 720px;gap:24px}.pair.mob{grid-template-columns:390px 390px}article{min-width:0}iframe{display:block;border:1px solid #d4ded4;border-radius:14px;background:white}.cap{background:#fff4ee;border:1px solid #b16d61;padding:18px;border-radius:12px;line-height:1.6}</style><h1>Amostra grátis do anúncio com apresentadora</h1><p><b>TESTADO LOCALMENTE · 24/10/2026.</b> Comparação estática dos componentes reais (base 1c078ed0 → proposta), com dados ilustrativos. Ilustrações representam quadros e player. Nenhum vídeo foi gerado nem fornecedor chamado. A pessoa escolhe apresentadora, cenário e seu produto na mesma tela. O resultado mantém o pedido para a compra.</p><nav><a href="#desktop">Desktop</a> · <a href="#mobile">Mobile</a> · <a href="#all">Tudo</a></nav>${body}<script>function show(){document.querySelectorAll(".group").forEach(s=>s.hidden=location.hash!=="#all"&&s.id!==(location.hash==="#mobile"?"mobile":"desktop"))}addEventListener("hashchange",show);show()</script></html>`
fs.writeFileSync(path.join(__dirname, 'amostra-anuncio-2410.html'), html)
console.log('Preview autocontido criado; sem requests externas.')
