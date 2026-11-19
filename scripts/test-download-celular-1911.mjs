// KINEO-DOWNLOAD-CELULAR-1911 — guardião do download do filme no celular [CEO 19/11: só 4 de 23 downloads saíram do celular].
// Prova, EXECUTANDO lib/videoDownload.ts (o módulo único de download) com navegador, DOM e rede falsos:
//   (1) iPhone: os bytes chegam e a folha de compartilhar abre com o ARQUIVO (nome e tipo video/mp4); video_downloaded só com a folha
//       devolvendo sucesso (method share_sheet); nenhum <a download> no iPhone com folha;
//   (2) iPhone em que o Safari pede um toque novo (NotAllowedError fora do gesto): o painel mostra "Save video" e o toque abre a folha
//       DENTRO do gesto (method share_sheet_tap; eventos manual_link_shown/clicked com trigger share_tap); fechar o painel = share_cancelled;
//   (3) iPhone que fecha a folha: share_cancelled, nunca video_downloaded;
//   (4) iPhone sem folha (navegador antigo ou de app): o caminho de sempre (blob) + o painel que abre o MP4 com "Tap Share, then Save Video."
//       e video_downloaded com share_sheet: 'unsupported';
//   (5) Android e computador: o caminho de sempre, sem folha e sem painel; os eventos levam os: android | other;
//   (6) a estante (Library) baixa pelo módulo único (surface library), não mais por fetch + window.open sem evento.
// Mutantes no fim. Rodar: node scripts/test-download-celular-1911.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const VD = 'lib/videoDownload.ts', LIB = 'app/(dashboard)/library/LibraryClient.tsx'
const URL_VIDEO = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/videos/e92d81bf-0068-46c3-8de7-1f67e2006756/a.mp4'
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
}
const erro = (name) => Object.assign(new Error(name), { name })
const tick = () => new Promise((r) => setImmediate(r))

function mundo({ ua, touch = 5, share = 'ok', canShare = true }) {
  const w = { events: [], shares: [], anchorClicks: [], opened: [], gesto: false }
  const achar = (e, pred) => { for (const c of e.children) { if (pred(c)) return c; const r = achar(c, pred); if (r) return r } return null }
  const el = (tag) => {
    const e = {
      tagName: tag.toUpperCase(), children: [], dataset: {}, style: {}, attrs: {}, listeners: {}, textContent: '', parent: null,
      setAttribute(k, v) { this.attrs[k] = String(v) }, getAttribute(k) { return this.attrs[k] },
      appendChild(c) { c.parent = this; this.children.push(c); return c },
      remove() { if (this.parent) { this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null } },
      addEventListener(t, f) { (this.listeners[t] ??= []).push(f) },
      click() {
        if (this.tagName === 'A') w.anchorClicks.push({ href: this.href ?? this.attrs.href, download: this.download ?? this.attrs.download })
        w.gesto = true
        try { for (const f of this.listeners.click ?? []) f() } finally { w.gesto = false }
      },
      querySelector(sel) { return achar(this, sel === 'a' ? (c) => c.tagName === 'A' : (c) => c.attrs['data-role'] === 'title') },
    }
    return e
  }
  const body = el('body')
  const document = {
    body, visibilityState: 'visible', createElement: el,
    getElementById: (id) => achar(body, (c) => c.id === id),
    addEventListener() {}, removeEventListener() {},
  }
  const navigator = {
    userAgent: ua, maxTouchPoints: touch,
    ...(share === null ? {} : {
      canShare: (d) => canShare && Array.isArray(d?.files) && d.files.length > 0,
      share: (d) => {
        w.shares.push({ data: d, gesto: w.gesto })
        if (share === 'ok') return Promise.resolve()
        if (share === 'abort') return Promise.reject(erro('AbortError'))
        if (share === 'gesto') return w.gesto ? Promise.resolve() : Promise.reject(erro('NotAllowedError'))
        return Promise.reject(erro('TypeError'))
      },
    }),
  }
  class FakeURL extends URL { static createObjectURL() { return 'blob:https://usekineo.com/x' } static revokeObjectURL() {} }
  const window = { location: { pathname: '/generate' }, open: (u) => { w.opened.push(u); return null } }
  const fetch = async () => ({ ok: true, status: 200, blob: async () => new Blob([new Uint8Array(2048)], { type: 'video/mp4' }) })
  const timers = { setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} }
  w.document = document
  w.painel = () => document.getElementById('kineo-manual-download')
  w.globais = { window, document, navigator, fetch, URL: FakeURL, File, Blob, ...timers }
  return w
}

function carregar(w, fonte) {
  const nosso = { exports: {} }
  new Function('require', 'module', 'exports', 'process', js(lf('lib/downloadNosso.ts')))(() => ({}), nosso, nosso.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://cqqukkvjjrguayiyjvhh.supabase.co' } })
  const req = (m) => {
    if (m === '@/lib/analytics') return { trackEvent: async (name, metadata) => { w.events.push({ name, metadata }) } }
    if (m === '@/lib/postVideoSignal') return { anunciarVideoEntregue: () => {} }
    if (m === '@/lib/downloadNosso') return nosso.exports
    throw new Error('import inesperado ' + m)
  }
  const mod = { exports: {} }
  const g = w.globais
  new Function('require', 'module', 'exports', 'window', 'document', 'navigator', 'fetch', 'URL', 'File', 'Blob', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', js(fonte))(
    req, mod, mod.exports, g.window, g.document, g.navigator, g.fetch, g.URL, g.File, g.Blob, g.setTimeout, g.clearTimeout, g.setInterval, g.clearInterval)
  return mod.exports
}

const baixar = (M) => M.downloadVideoFile({ url: URL_VIDEO, filename: 'my-film.mp4', exportType: 'clean', surface: 'done_screen', videoId: 'v1' })
const ev = (w, n) => w.events.filter((e) => e.name === n)

async function bateria(over = {}) {
  const p = []
  const fonte = over[VD] ?? lf(VD)
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }

  await check('(0) sistema do aparelho', async () => {
    const M = carregar(mundo({ ua: UA.mac }), fonte)
    const tab = [[UA.iphone, 5, 'ios'], [UA.mac, 5, 'ios'], [UA.mac, 0, 'other'], [UA.android, 5, 'android']]
    for (const [ua, t, esp] of tab) if (M.sistemaDoAparelho(ua, t) !== esp) throw new Error(`${ua.slice(13, 30)}/${t} → ${M.sistemaDoAparelho(ua, t)}`)
    if (M.resultadoDaFolha(erro('AbortError')) !== 'cancelled' || M.resultadoDaFolha(erro('NotAllowedError')) !== 'needs_tap' || M.resultadoDaFolha(erro('TypeError')) !== 'failed') throw new Error('leitura do erro da folha')
  })
  await check('(1) iPhone: folha com o arquivo', async () => {
    const w = mundo({ ua: UA.iphone, share: 'ok' })
    const r = await baixar(carregar(w, fonte))
    const f = w.shares[0]?.data?.files?.[0]
    if (r !== 'blob') throw new Error('desfecho ' + r)
    if (!f || f.name !== 'my-film.mp4' || f.type !== 'video/mp4' || f.size !== 2048) throw new Error('a folha não levou o arquivo')
    const d = ev(w, 'video_downloaded')
    if (d.length !== 1 || d[0].metadata.method !== 'share_sheet' || d[0].metadata.os !== 'ios' || d[0].metadata.device !== 'mobile') throw new Error('video_downloaded ' + JSON.stringify(d.map((x) => x.metadata.method)))
    if (w.anchorClicks.length) throw new Error('iPhone com folha ainda clicou no <a download>')
    if (ev(w, 'video_download_clicked')[0]?.metadata.os !== 'ios') throw new Error('o clique não diz o sistema')
  })
  await check('(2) iPhone que pede toque: painel "Save video" e folha dentro do gesto', async () => {
    const w = mundo({ ua: UA.iphone, share: 'gesto' })
    const pr = baixar(carregar(w, fonte))
    for (let i = 0; i < 50 && !w.painel(); i++) await tick()
    const box = w.painel()
    const botao = box?.children.find((c) => c.tagName === 'BUTTON' && c.textContent === 'Save video')
    if (!botao) throw new Error('sem o painel com "Save video"')
    if (!box.children.some((c) => /Save Video/.test(c.textContent))) throw new Error('sem a linha "Save Video"')
    if (ev(w, 'video_downloaded').length) throw new Error('video_downloaded antes de salvar')
    botao.click()
    const r = await pr
    if (r !== 'blob' || !w.shares.at(-1)?.gesto) throw new Error('desfecho ' + r + ' / folha fora do gesto')
    if (ev(w, 'video_downloaded')[0]?.metadata.method !== 'share_sheet_tap') throw new Error('method do toque')
    if (ev(w, 'video_download_manual_link_shown')[0]?.metadata.trigger !== 'share_tap' || ev(w, 'video_download_manual_link_clicked')[0]?.metadata.trigger !== 'share_tap') throw new Error('eventos do painel')
    if (w.painel()) throw new Error('o painel ficou na tela depois de salvar')
  })
  await check('(2b) fechar o painel = share_cancelled', async () => {
    const w = mundo({ ua: UA.iphone, share: 'gesto' })
    const pr = baixar(carregar(w, fonte))
    for (let i = 0; i < 50 && !w.painel(); i++) await tick()
    const fechar = w.painel()?.children.find((c) => c.attrs['aria-label'] === 'Dismiss')
    if (!fechar) throw new Error('sem o ×')
    fechar.click()
    const r = await pr
    if (r !== 'share_cancelled' || ev(w, 'video_download_share_cancelled')[0]?.metadata.how !== 'dismissed' || ev(w, 'video_downloaded').length) throw new Error('desfecho ' + r)
  })
  await check('(3) iPhone que fecha a folha: nunca video_downloaded', async () => {
    const w = mundo({ ua: UA.iphone, share: 'abort' })
    const r = await baixar(carregar(w, fonte))
    if (r !== 'share_cancelled' || ev(w, 'video_downloaded').length || ev(w, 'video_download_share_cancelled')[0]?.metadata.how !== 'cancelled') throw new Error('desfecho ' + r)
  })
  await check('(4) iPhone sem folha: blob + painel que abre o MP4 com "Tap Share, then Save Video."', async () => {
    const w = mundo({ ua: UA.iphone, share: null })
    const r = await baixar(carregar(w, fonte))
    if (r !== 'blob' || w.anchorClicks.length !== 1) throw new Error('desfecho ' + r)
    if (ev(w, 'video_downloaded')[0]?.metadata.share_sheet !== 'unsupported') throw new Error('sem share_sheet: unsupported')
    const box = w.painel()
    const a = box && box.querySelector('a')
    if (!a || !/\/api\/download\?|download=/.test(a.attrs.href)) throw new Error('sem o link que abre o MP4')
    if (!box.children.some((c) => c.textContent === 'Opens the video in a new tab. Tap Share, then Save Video.')) throw new Error('sem a linha do iPhone')
  })
  await check('(4b) folha que falha: cai no caminho de sempre com o painel', async () => {
    const w = mundo({ ua: UA.iphone, share: 'falha' })
    const r = await baixar(carregar(w, fonte))
    if (r !== 'blob' || !ev(w, 'video_download_share_failed').length || ev(w, 'video_downloaded')[0]?.metadata.share_sheet !== 'failed' || !w.painel()) throw new Error('desfecho ' + r)
  })
  for (const [nome, ua, os] of [['Android', UA.android, 'android'], ['computador', UA.mac, 'other']]) {
    await check(`(5) ${nome}: o caminho de sempre`, async () => {
      const w = mundo({ ua, touch: nome === 'Android' ? 5 : 0, share: 'ok' })
      const r = await baixar(carregar(w, fonte))
      if (r !== 'blob' || w.shares.length || w.anchorClicks.length !== 1 || w.painel()) throw new Error(`desfecho ${r}, folhas ${w.shares.length}, painel ${!!w.painel()}`)
      const d = ev(w, 'video_downloaded')[0]?.metadata
      if (d?.method !== 'blob' || d.os !== os || 'share_sheet' in d) throw new Error('evento ' + JSON.stringify(d))
    })
  }
  await check('(6) a estante baixa pelo módulo único', async () => {
    const s = over[LIB] ?? lf(LIB)
    const corpo = s.slice(s.indexOf('  async function dl('), s.indexOf('  async function dl(') + 400)
    if (!corpo.includes("await downloadVideoFile({ url, filename, exportType: 'current_asset', surface: 'library' })") || /window\.open|res\.blob\(\)/.test(corpo)) throw new Error('a estante baixa por fora')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['iPhone não reconhecido', VD, "  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'\n", ''],
  ['folha sem o arquivo', VD, '    await navigator.share({ files: [file] })\n    return \'shared\'', "    await navigator.share({ url: 'https://usekineo.com' })\n    return 'shared'"],
  ['toque novo vira falha', VD, "  if (name === 'NotAllowedError') return 'needs_tap'\n", ''],
  ['fechar a folha conta como baixado', VD, "          fire('video_download_share_cancelled', { ...comum, how: r })\n          return 'share_cancelled'", "          fire('video_downloaded', comum)\n          return 'blob'"],
  ['iPhone sem folha sem o painel', VD, "    if (folhaNoIphone) showManual('ios_check')\n", ''],
  ['botão não abre a folha', VD, "navigator.share({ files: [file] }).then(() => terminar('shared')", "Promise.reject(new Error('x')).then(() => terminar('shared')"],
  ['linha do iPhone sumiu', VD, "        ? 'Opens the video in a new tab. Tap Share, then Save Video.'", "        ? 'Opens in a new tab.'"],
  ['Android ganha a folha', VD, "    if (base.os === 'ios') {\n      const file", "    if (base.os !== 'other') {\n      const file"],
  ['iPhone com folha ainda clica no <a download>', VD, "          anunciarVideoEntregue({ method: metodo, ms: comum.ms })\n          return 'blob'", "          anunciarVideoEntregue({ method: metodo, ms: comum.ms })\n          const a0 = document.createElement('a'); a0.href = 'blob:x'; a0.download = filename; a0.click()\n          return 'blob'"],
  ['estante volta a baixar por fora', LIB, "await downloadVideoFile({ url, filename, exportType: 'current_asset', surface: 'library' })", "window.open(url, '_blank')"],
]
let mortos = 0
for (const [n, f, de, para] of mutantes) {
  const t = lf(f)
  if (t.split(de).length !== 2) { console.error('MUTANTE SEM ÂNCORA: ' + n); process.exit(1) }
  if ((await bateria({ [f]: t.split(de).join(para) })).length) mortos++
  else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS download no celular: iPhone abre a folha com o arquivo (direto ou com um toque), fechar não conta como baixado, sem folha abre o MP4 com "Share ▸ Save Video"; Android e computador iguais; estante pelo módulo único (${mortos}/${mutantes.length} mutantes mortos)`)
