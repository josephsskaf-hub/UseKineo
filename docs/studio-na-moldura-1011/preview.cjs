// KINEO-STUDIO-NA-MOLDURA-1011 — evidência estática (NÃO substitui ver logado): a aba Film com o Studio real na moldura, render React
// offline com o estado de verdade do StudioSimples (docs/studio-na-moldura-1011/runtime.cjs), tema CLARO do app, pôsteres locais, sem vídeo,
// sem API, sem débito. Estados: vazio · com ideia (Details aberto, 35 s) · recusa (link do ChatGPT).
// "Gerando" e "pronto" NÃO existem nesta tela ainda: o Generate leva ao /studio/create, como hoje (ver RELATORIO no commit).
// Uso: node docs/studio-na-moldura-1011/preview.cjs [pasta] (padrão C:\kineo\docs\referencias\studio-na-moldura-1011)
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), crypto = require('node:crypto')
const { execFileSync, execFile } = require('node:child_process'), run = require('node:util').promisify(execFile)
const { aba, React, read, ROOT } = require('./runtime.cjs')
const OUT = process.argv[2] || 'C:/kineo/docs/referencias/studio-na-moldura-1011'
fs.mkdirSync(OUT, { recursive: true })
const light = read('app/appearance.css').match(/:root\s*\{[\s\S]*?\n\}/)[0]
const css = read('app/recreate/recreate.css') + read('components/create/create.css')
const cache = path.join(os.tmpdir(), 'kineo-studio-moldura-posters'); fs.mkdirSync(cache, { recursive: true })
function embed(html) {
  return html.replace(/\b(src|poster)="([^"]+)"/g, (_, attr, url) => {
    if (url.endsWith('.mp4')) return ''
    const asset = aba().m('lib/recreate/formats').RECREATE_ASSETS[url.split('/').pop()]
    const file = path.join(ROOT, asset ? 'lib/recreate/assets/' + asset.file : 'public' + url)
    if (!fs.existsSync(file)) throw new Error('Nonlocal preview asset: ' + url)
    const out = path.join(cache, crypto.createHash('sha256').update(file).digest('hex').slice(0, 16) + '.webp')
    if (!fs.existsSync(out)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vf', 'scale=480:-1', '-frames:v', '1', '-quality', '75', out])
    return `${attr}="data:image/webp;base64,${fs.readFileSync(out).toString('base64')}"`
  })
}
// KINEO-TELA-NOVA-CABECALHO-1011 — com sessão e um saldo de exemplo (1.234, conta paga): o cabeçalho mostra o saldo e o botão o número.
const CONTA = { cookie: 'sb-preview-auth-token=1', credits: { credits: 1234, hasPaid: true, isStarter: false, isCreator: false, isStudio: true, entitlementsResolved: true, filmsDelivered: 3, trial: { phase: 'none' } } }
async function render(el, steps = () => {}) {
  const t = aba({}, CONTA)
  t.mount(el(t)); await t.settle()
  steps(t)
  return t.html()
}
const frame = steps => render(t => React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' }), steps)
const page = (body, extraCss = '') => `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${light}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);--font-manrope:Arial}${css}${extraCss}</style></head><body>${embed(body)}</body></html>`
const pages = {}
async function build() {
const vazio = await frame(() => {})
const comIdeia = (await frame(t => { t.type(p => p.id === 'sm-idea', 'The ghost ship Mary Celeste: found adrift in 1872 with dinner still on the table and no one aboard.', 'ideia'); t.click(p => p['data-studio-duration'] === 35, '35 s') })).replace('<details class="rc-adjustments">', '<details class="rc-adjustments" open="">')
const recusa = await frame(t => { t.type(p => p.id === 'sm-idea', 'https://chatgpt.com/share/abc123', 'link'); t.click(p => p['data-testid'] === 'studio-simple-generate', 'Generate') })
Object.assign(pages, { vazio: page(vazio), 'com-ideia': page(comIdeia), recusa: page(recusa) })
for (const tab of ['cartoon', 'ads']) pages['aba-' + tab] = page(await render(t => React.createElement(t.m('components/create/CreateShell').default, { tab })))
pages['recreate-com-abas'] = page(await render(t => React.createElement(t.m('app/recreate/RecreateClient').default, { initialId: 'elevador', createTabs: true })))
for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, name + '.html'), html)
}

const qa = `<script>addEventListener('load',()=>setTimeout(()=>{const r=s=>{const n=document.querySelector(s);if(!n)return null;const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom}};fetch('/qa',{method:'POST',body:JSON.stringify({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,panel:r('.rc-panel'),reference:r('.rc-reference'),gallery:r('.rc-gallery'),button:document.querySelector('.rc-generate')?.textContent,nav:r('.rc-nav'),navOverflow:(n=>n.scrollWidth>n.clientWidth)(document.querySelector('.rc-nav'))})})},80))</script>`
async function main() {
  await build()
  const reports = []
  const server = http.createServer((req, res) => {
    if (req.url === '/qa') { let b = ''; req.on('data', c => b += c); req.on('end', () => { reports.push(JSON.parse(b)); res.end('ok') }); return }
    const name = req.url.slice(1).replace(/-(1440|390)$/, '')
    if (!pages[name]) { res.writeHead(404); res.end(); return }
    const [w, h] = req.url.endsWith('-390') ? [390, 2100] : [1440, 1000]
    const enc = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><html><head><style>body{margin:0}iframe{display:block;border:0}</style></head><body><iframe style="width:${w}px;height:${h}px" srcdoc="${enc(pages[name].replace('</body>', qa + '</body>'))}"></iframe></body></html>`)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const checks = []
  try {
    for (const name of Object.keys(pages)) for (const [w, h] of [[1440, 1000], [390, 2100]]) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-studio-moldura-')), shot = path.join(OUT, `${name}-${w}.png`), start = Date.now()
      try {
        await run('C:/Users/josep/AppData/Local/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--hide-scrollbars', '--user-data-dir=' + profile, `--window-size=${Math.max(w, 600)},${h}`, '--force-device-scale-factor=1', '--virtual-time-budget=2500', '--screenshot=' + shot, `http://127.0.0.1:${server.address().port}/${name}-${w}`], { timeout: 30000, windowsHide: true })
      } catch (e) { if (!fs.existsSync(shot) || fs.statSync(shot).mtimeMs < start) throw e }
      const q = reports.pop(); reports.length = 0
      if (!q) throw new Error('no geometry: ' + name + w)
      if (q.width !== w) throw new Error(`wrong viewport: ${name} ${q.width} != ${w}`)
      if (q.overflow) throw new Error(`horizontal overflow: ${name} @ ${w}`)
      if (q.navOverflow || q.nav.bottom - q.nav.y > 70) throw new Error(`header breaks or overflows: ${name} @ ${w}`)
      if (w > 640 && q.panel && !(q.reference.x >= q.panel.right - 1)) throw new Error('example not to the right: ' + name)
      if (w <= 640 && q.panel && q.gallery && !(q.reference.bottom <= q.panel.y + 1 && q.panel.bottom <= q.gallery.y + 1)) throw new Error('mobile order is not example → steps → gallery: ' + name)
      checks.push({ name, width: w, ...q }); console.log(`${name} @ ${w}: screenshot + geometry ok · botão "${q.button}" · cabeçalho (${Math.round(q.nav.bottom - q.nav.y)} px)`)
    }
    fs.writeFileSync(path.join(OUT, 'checks.json'), JSON.stringify({ date: '2026-11-10', kind: 'React offline com o estado real do StudioSimples; tema claro; Chrome isolado; sem API, débito ou render', checks }, null, 2))
  } finally { await new Promise(r => server.close(r)) }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
