// KINEO-TELA-NOVA-1011 — evidência estática (NÃO substitui ver logado): React SSR real das abas Film/Cartoon/Ads e do Recreate com abas,
// tema CLARO do app (app/appearance.css :root), pôsteres locais, sem vídeo, sem API, sem débito. Chrome sem cabeça, perfil isolado.
// Uso: node docs/tela-nova-1011/preview.cjs [pasta de saída] (padrão C:\kineo\docs\referencias\tela-nova-1011)
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), crypto = require('node:crypto')
const { execFileSync, execFile } = require('node:child_process'), run = require('node:util').promisify(execFile)
const { loader, read, ROOT } = require('../recreate-0911/test-recreate.cjs')
const React = require(path.join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))
const OUT = process.argv[2] || 'C:/kineo/docs/referencias/tela-nova-1011'
fs.mkdirSync(OUT, { recursive: true })
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const m = loader({ 'next/link': link, '@/lib/analytics': { trackClosedEvent: async () => 'stored' } })
const formats = m('lib/recreate/formats')
const tokens = read('app/appearance.css')
const light = tokens.match(/:root\s*\{[\s\S]*?\n\}/)[0]
const css = read('app/recreate/recreate.css') + read('components/create/create.css')
const cache = path.join(os.tmpdir(), 'kineo-tela-nova-posters'); fs.mkdirSync(cache, { recursive: true })
function embed(html) {
  return html.replace(/\b(src|poster)="([^"]+)"/g, (_, attr, url) => {
    if (url.endsWith('.mp4')) return ''
    const asset = formats.RECREATE_ASSETS[url.split('/').pop()]
    const file = path.join(ROOT, asset ? 'lib/recreate/assets/' + asset.file : 'public' + url)
    if (!fs.existsSync(file)) throw new Error('Nonlocal preview asset: ' + url)
    const out = path.join(cache, crypto.createHash('sha256').update(file).digest('hex').slice(0, 16) + '.webp')
    if (!fs.existsSync(out)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vf', 'scale=480:-1', '-frames:v', '1', '-quality', '75', out])
    return `${attr}="data:image/webp;base64,${fs.readFileSync(out).toString('base64')}"`
  })
}
function recreateWithTabs() {
  let state = 0
  const react = { ...React, useEffect: () => {}, useRef: v => ({ current: v }), useState: init => { state++; return [typeof init === 'function' ? init() : init, () => {}] } }
  return renderToStaticMarkup(React.createElement(loader({ react, 'next/link': link })('app/recreate/RecreateClient').default, { initialId: 'elevador', createTabs: true }))
}
const page = body => `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${light}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);--font-manrope:Arial}${css}</style></head><body>${embed(body)}</body></html>`
const shell = tab => renderToStaticMarkup(React.createElement(m('components/create/CreateShell').default, { tab }))
const pages = { film: page(shell('film')), cartoon: page(shell('cartoon')), ads: page(shell('ads')), 'recreate-com-abas': page(recreateWithTabs()) }
for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, name + '.html'), html)

const qa = `<script>addEventListener('load',()=>setTimeout(()=>{const r=s=>{const n=document.querySelector(s);if(!n)return null;const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom}};fetch('/qa',{method:'POST',body:JSON.stringify({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,panel:r('.rc-panel'),reference:r('.rc-reference'),gallery:r('.rc-gallery'),tabs:r('.ct-tabs')})})},80))</script>`
async function main() {
  const reports = []
  const server = http.createServer((req, res) => {
    if (req.url === '/qa') { let b = ''; req.on('data', c => b += c); req.on('end', () => { reports.push(JSON.parse(b)); res.end('ok') }); return }
    const name = req.url.slice(1).replace(/-(1440|390)$/, '')
    if (!pages[name]) { res.writeHead(404); res.end(); return }
    // Como o preview do Recreate: a página dentro de um iframe do tamanho EXATO (o Chrome sem cabeça não abre janela de 390 px).
    const [w, h] = req.url.endsWith('-390') ? [390, 1900] : [1440, 1000]
    const enc = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><html><head><style>body{margin:0}iframe{display:block;border:0}</style></head><body><iframe style="width:${w}px;height:${h}px" srcdoc="${enc(pages[name].replace('</body>', qa + '</body>'))}"></iframe></body></html>`)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const checks = []
  try {
    for (const name of Object.keys(pages)) for (const [w, h] of [[1440, 1000], [390, 1900]]) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-tela-nova-')), shot = path.join(OUT, `${name}-${w}.png`), start = Date.now()
      try {
        await run('C:/Users/josep/AppData/Local/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--hide-scrollbars', '--user-data-dir=' + profile, `--window-size=${Math.max(w, 600)},${h}`, '--force-device-scale-factor=1', '--virtual-time-budget=2500', '--screenshot=' + shot, `http://127.0.0.1:${server.address().port}/${name}-${w}`], { timeout: 30000, windowsHide: true })
      } catch (e) { if (!fs.existsSync(shot) || fs.statSync(shot).mtimeMs < start) throw e }
      const q = reports.pop(); reports.length = 0
      if (!q) throw new Error('no geometry: ' + name + w)
      if (q.width !== w) throw new Error(`wrong viewport: ${name} ${q.width} != ${w}`)
      if (q.overflow) throw new Error(`horizontal overflow: ${name} @ ${w}`)
      if (w > 640 && !(q.reference.x >= q.panel.right - 1)) throw new Error('example not to the right: ' + name)
      if (w <= 640 && !(q.reference.bottom <= q.panel.y + 1 && q.panel.bottom <= q.gallery.y + 1)) throw new Error('mobile order is not example → steps → gallery: ' + name)
      checks.push({ name, width: w, ...q }); console.log(`${name} @ ${w}: screenshot + geometry ok`)
    }
    fs.writeFileSync(path.join(OUT, 'checks.json'), JSON.stringify({ date: '2026-11-10', kind: 'React SSR local; tema claro; Chrome isolado; sem API, débito ou render', checks }, null, 2))
  } finally { await new Promise(r => server.close(r)) }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
