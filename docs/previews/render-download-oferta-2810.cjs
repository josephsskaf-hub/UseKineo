// KINEO-DOWNLOAD-OFERTA-2810 — prévia estática (SSR) do cartão "Remove watermark + HD" nas duas telas.
// Uso: node docs/previews/render-download-oferta-2810.cjs <pasta-de-saida>
// Renderiza os componentes REAIS (components/growth/DownloadUpsell.tsx + lib/growth/downloadUpsell.ts) com
// react-dom/server, dentro de uma moldura que imita a tela do filme pronto e o card da estante. Sem servidor, sem
// rede, sem login. O resto da tela é moldura — só o cartão é o código de produção.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ROOT = path.resolve(__dirname, '..', '..')
const req = (m) => require(path.join(ROOT, 'node_modules', m))
const React = req('react'), jsx = req('react/jsx-runtime'), ts = req('typescript')
const { renderToStaticMarkup } = req('react-dom/server')
const out = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'previews'))
const cache = new Map()
function load(spec, parent = '') {
  if (spec === 'react') return React
  if (spec === 'react/jsx-runtime') return jsx
  if (spec === '@/lib/analytics') return { trackEvent: () => {} }
  let rel = spec.startsWith('@/') ? spec.slice(2) : path.posix.join(path.posix.dirname(parent), spec)
  const found = ['.ts', '.tsx'].find((e) => fs.existsSync(path.join(ROOT, rel + e)))
  rel += found
  if (cache.has(rel)) return cache.get(rel)
  const exports = {}; cache.set(rel, exports)
  const code = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: (n) => load(n, rel), console }, { filename: rel })
  return exports
}
const lib = load('@/lib/growth/downloadUpsell')
const { DownloadUpsellCard, MakeItHdButton } = load('@/components/growth/DownloadUpsell')
const h = React.createElement
const noop = () => {}
const card = (copy, surface, thisFilm) => renderToStaticMarkup(h(DownloadUpsellCard, { copy, surface, videoId: 'demo', thisFilm, pending: false, error: null, onBuy: noop, onDismiss: noop }))

const tokens = `:root{--bg:#F7F7F5;--card:#FFFFFF;--card2:#F1F1EE;--text:#0E1116;--muted:#5A5F67;--muted2:#6B6F76;--border:#E4E4E0;--accent:#0A5CFF;--accent-soft:#E8EFFF;--on-accent:#fff;--danger:#B42318;--warning:#8A4B00;--sh-card:0 1px 2px #0E111608,0 8px 24px -12px #0E111614}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Manrope,Inter,Arial,sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:28px 16px}.panel{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:28px 20px;display:flex;flex-direction:column;align-items:center}
.btn{display:inline-flex;align-items:center;gap:6px;border-radius:8px;padding:8px 16px;font-weight:700;font-size:14px;background:var(--accent);color:var(--on-accent);text-decoration:none}
.player{width:100%;max-width:300px;aspect-ratio:9/16;border-radius:14px;margin-top:16px;background:linear-gradient(160deg,#1b2a44,#0b0f18);position:relative}
.player span{position:absolute;top:10px;left:10px;font-size:11px;color:#fff;opacity:.8}
.tag{font-size:11px;color:var(--muted);margin-top:16px}
.lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.lcard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:8px}
.thumb{aspect-ratio:9/16;border-radius:10px;background:linear-gradient(160deg,#2b3a24,#0d120b);position:relative}.thumb span{position:absolute;top:8px;left:8px;font-size:10px;color:#fff;opacity:.85}
.dl{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:42px;border-radius:11px;background:#0A5CFF;color:#fff;font-weight:800;font-size:12px;margin-top:8px;border:none}
.chip{margin-top:6px;font-size:11px;color:var(--muted);text-align:center}`
// O headless não desce a janela abaixo de ~500 px; a variante -375 trava a largura do layout em 375 px (celular).
const page = (title, body, phone = false) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${tokens}${phone ? '.wrap{max-width:375px;margin:0}.lib{grid-template-columns:1fr}' : ''}</style></head><body><div class="wrap">${body}</div></body></html>`

const enThis = lib.downloadUpsellCopy({ priceLabel: '$9.90', monthlyCredits: 60, thisFilm: true })
const resultBody = (`
<div class="tag">PREVIEW · /studio/create, film done, free account, right after tapping "Download MP4" (moldura; the card is production code)</div>
<div class="panel">
  <div style="font-size:24px;font-weight:600">Your video is ready</div>
  <div style="font-size:12px;color:var(--muted);margin-top:6px">15s · MP4</div>
  <a class="btn" style="margin-top:12px">⬇ Download MP4</a>
  <div style="width:100%;max-width:460px">${card(enThis, 'done_screen_top', true)}</div>
  <div class="player"><span>usekineo.com/free</span></div>
</div>
<div class="tag">Paid account, clean film — "Make it HD" under the same download button</div>
<div class="panel"><a class="btn">⬇ Download MP4</a>${renderToStaticMarkup(h(MakeItHdButton, { videoId: 'demo', surface: 'done_screen_top' }))}</div>`)

const ptThis = lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true, lang: 'en' })
const next = lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: false, lang: 'en' })
const lcard = (title, inner) => `<div class="lcard"><div class="thumb"><span>Seedance 1.5</span></div><div style="font-size:13px;margin-top:8px">${title}</div><button class="dl">⬇ Download MP4</button>${inner}<div class="chip">HD · 10 cr &nbsp; 4K · 40 cr</div></div>`
const libraryBody = (`
<div class="tag">PREVIEW · /library (and /history), free account, right after tapping Download on a card (moldura; the card is production code)</div>
<div class="lib">
  ${lcard('The lake that turns animals to stone', card(ptThis, 'library_card', true))}
  ${lcard('Older film, made on another device', card(next, 'library_card', false))}
  ${lcard('Not downloaded yet', '')}
</div>`)
fs.mkdirSync(out, { recursive: true })
for (const [name, body] of [['result', resultBody], ['library', libraryBody]]) {
  fs.writeFileSync(path.join(out, `download-oferta-2810-${name}.html`), page(`Download offer — ${name}`, body))
  fs.writeFileSync(path.join(out, `download-oferta-2810-${name}-375.html`), page(`Download offer — ${name}`, body, true))
}
console.log('ok', out)
