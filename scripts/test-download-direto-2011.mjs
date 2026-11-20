// KINEO-DOWNLOAD-DIRETO-2011 — guardião do download direto no celular [CEO 20/11; pagante 762c60a2: fetch de 50 MB pendurado 2 h 07 min
// com a tela apagada, "Load failed", popup barrado, nenhum arquivo]. Prova, EXECUTANDO lib/videoDownload.ts com navegador, DOM e rede falsos:
//   (1) iPhone e Android, vídeo do bucket renders, dentro do toque: NENHUM fetch; um <a> com o endereço do Storage + ?download=<nome> é
//       clicado DENTRO da chamada (síncrono: antes de qualquer await); desfecho 'fallback_opened' (as telas contam como entregue);
//       video_downloaded com method direct_link; aviso na tela com o caminho do arquivo (iPhone: Arquivos › Downloads → Salvar vídeo);
//   (2) toque repetido em menos de 4 s: 'coalesced', um download só;
//   (3) fora do toque (userActivation.isActive false, o lote do Ads v2): o caminho de sempre (fetch + blob);
//   (4) computador: o caminho de sempre, sem <a> direto;
//   (5) arquivo de fora do renders (fornecedor) e imagem do renders: o caminho de sempre;
//   (6) o endereço direto nunca é /api/download (a rota responderia login/404 NA MESMA ABA) e o nome sai limpo.
// Mutantes no fim. Rodar: node scripts/test-download-direto-2011.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const VD = 'lib/videoDownload.ts'
const NOSSO = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/762c60a2-26eb-469a-97ba-9b005b7431a7/b65e31c9.mp4'
const FORA = 'https://v3.fal.media/files/zebra/a.mp4'
const IMG = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/762c60a2-26eb-469a-97ba-9b005b7431a7/foto.png'
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
}

function mundo({ ua, touch = 5, ativo = undefined }) {
  const w = { events: [], fetches: [], anchorClicks: [], opened: [], sincrono: true }
  const achar = (e, pred) => { for (const c of e.children) { if (pred(c)) return c; const r = achar(c, pred); if (r) return r } return null }
  const el = (tag) => ({
    tagName: tag.toUpperCase(), children: [], dataset: {}, style: {}, attrs: {}, listeners: {}, textContent: '', parent: null,
    setAttribute(k, v) { this.attrs[k] = String(v) }, getAttribute(k) { return this.attrs[k] },
    appendChild(c) { c.parent = this; this.children.push(c); return c },
    remove() { if (this.parent) { this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null } },
    addEventListener(t, f) { (this.listeners[t] ??= []).push(f) },
    click() {
      if (this.tagName === 'A') w.anchorClicks.push({ href: this.href ?? this.attrs.href, download: this.download ?? this.attrs.download, sincrono: w.sincrono, noDom: !!this.parent })
      for (const f of this.listeners.click ?? []) f()
    },
    querySelector(sel) { return achar(this, sel === 'a' ? (c) => c.tagName === 'A' : (c) => c.attrs['data-role'] === 'title') },
  })
  const body = el('body')
  const document = { body, visibilityState: 'visible', createElement: el, getElementById: (id) => achar(body, (c) => c.id === id), addEventListener() {}, removeEventListener() {} }
  const navigator = { userAgent: ua, maxTouchPoints: touch, ...(ativo === undefined ? {} : { userActivation: { isActive: ativo } }) }
  class FakeURL extends URL { static createObjectURL() { return 'blob:https://usekineo.com/x' } static revokeObjectURL() {} }
  const window = { location: { pathname: '/studio/create' }, open: (u) => { w.opened.push(u); return null } }
  const fetch = async (u) => { w.fetches.push(u); return { ok: true, status: 200, blob: async () => new Blob([new Uint8Array(2048)], { type: 'video/mp4' }) } }
  const timers = { setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} }
  w.painel = () => document.getElementById('kineo-manual-download')
  w.globais = { window, document, navigator, fetch, URL: FakeURL, File, Blob, ...timers }
  return w
}

function carregar(w, fonte) {
  const nosso = { exports: {} }
  new Function('require', 'module', 'exports', 'process', js(lf('lib/downloadNosso.ts')))(() => ({}), nosso, nosso.exports, { env: {} })
  const req = (m) => {
    if (m === '@/lib/analytics') return { trackEvent: async (name, metadata) => { w.events.push({ name, metadata }) } }
    if (m === '@/lib/postVideoSignal') return { anunciarVideoEntregue: (d) => { w.anunciados = [...(w.anunciados ?? []), d] } }
    if (m === '@/lib/downloadNosso') return nosso.exports
    throw new Error('import inesperado ' + m)
  }
  const mod = { exports: {} }
  const g = w.globais
  new Function('require', 'module', 'exports', 'window', 'document', 'navigator', 'fetch', 'URL', 'File', 'Blob', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', js(fonte))(
    req, mod, mod.exports, g.window, g.document, g.navigator, g.fetch, g.URL, g.File, g.Blob, g.setTimeout, g.clearTimeout, g.setInterval, g.clearInterval)
  return mod.exports
}

// Marca o fim da parte síncrona da chamada: o que for clicado depois disto não estava dentro do toque.
const baixar = (w, M, url = NOSSO, filename = 'my film.mp4') => { const p = M.downloadVideoFile({ url, filename, exportType: 'clean', surface: 'done_screen', videoId: '6544ea3b' }); w.sincrono = false; return p }
const ev = (w, n) => w.events.filter((e) => e.name === n)

async function bateria(over = {}) {
  const p = []
  const fonte = over[VD] ?? lf(VD)
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }

  for (const [nome, ua, ativo] of [['iPhone', UA.iphone, undefined], ['iPhone com userActivation', UA.iphone, true], ['Android', UA.android, true]]) {
    await check(`(1) ${nome}: download direto dentro do toque, sem fetch`, async () => {
      const w = mundo({ ua, ativo })
      const r = await baixar(w, carregar(w, fonte))
      if (r !== 'fallback_opened') throw new Error('desfecho ' + r)
      if (w.fetches.length) throw new Error('o filme ainda passou pela página (fetch)')
      const a = w.anchorClicks[0]
      if (w.anchorClicks.length !== 1 || !a.sincrono) throw new Error('o <a> não foi clicado dentro do toque')
      const u = new URL(a.href)
      if (u.origin + u.pathname !== NOSSO || u.searchParams.get('download') !== 'my-film.mp4' || a.download !== 'my film.mp4') throw new Error('endereço ' + a.href)
      const d = ev(w, 'video_downloaded')
      if (d.length !== 1 || d[0].metadata.method !== 'direct_link' || d[0].metadata.device !== 'mobile' || d[0].metadata.video_id !== '6544ea3b') throw new Error('video_downloaded ' + JSON.stringify(d.map((x) => x.metadata)))
      if (ev(w, 'video_download_clicked').length !== 1) throw new Error('o clique não foi contado')
      if (w.anunciados?.[0]?.method !== 'direct_link') throw new Error('sem o sinal de entregue')
      const box = w.painel()
      if (!box || box.dataset.trigger !== 'direct' || !/downloading/i.test(box.children[0]?.textContent ?? '')) throw new Error('sem o aviso na tela')
      const linha = box.children.find((c) => c.tagName === 'DIV' && /Downloads/.test(c.textContent))?.textContent ?? ''
      if (ua === UA.iphone ? !/Files › Downloads.*Save Video/.test(linha) : !/notifications or the Downloads folder/.test(linha)) throw new Error('linha do aviso: ' + linha)
      if (!box.querySelector('a')) throw new Error('o aviso não tem o botão da 2ª tentativa')
    })
  }
  await check('(2) toque repetido em 4 s: um download só', async () => {
    const w = mundo({ ua: UA.iphone })
    const M = carregar(w, fonte)
    await baixar(w, M); w.sincrono = true
    const r2 = await baixar(w, M)
    if (r2 !== 'coalesced' || w.anchorClicks.length !== 1 || ev(w, 'video_downloaded').length !== 1) throw new Error(`2º toque ${r2}, <a> ${w.anchorClicks.length}`)
  })
  await check('(3) fora do toque (lote): o caminho de sempre', async () => {
    const w = mundo({ ua: UA.iphone, ativo: false })
    const r = await baixar(w, carregar(w, fonte))
    if (!w.fetches.length || ev(w, 'video_downloaded').some((e) => e.metadata.method === 'direct_link')) throw new Error('desfecho ' + r)
  })
  await check('(4) computador: o caminho de sempre', async () => {
    const w = mundo({ ua: UA.windows, touch: 0, ativo: true })
    const r = await baixar(w, carregar(w, fonte))
    if (r !== 'blob' || w.fetches.length !== 1 || !w.anchorClicks[0]?.href.startsWith('blob:') || ev(w, 'video_downloaded')[0]?.metadata.method !== 'blob') throw new Error('desfecho ' + r)
  })
  for (const [nome, url, arq] of [['fornecedor de fora', FORA, 'a.mp4'], ['imagem do renders', IMG, 'foto.png']]) {
    await check(`(5) ${nome}: o caminho de sempre`, async () => {
      const w = mundo({ ua: UA.android, ativo: true })
      await baixar(w, carregar(w, fonte), url, arq)
      if (!w.fetches.length || ev(w, 'video_downloaded').some((e) => e.metadata.method === 'direct_link')) throw new Error('foi pelo direto')
    })
  }
  await check('(6) funções puras: decisão e endereço', async () => {
    const M = carregar(mundo({ ua: UA.windows }), fonte)
    if (!M.deveBaixarDireto('mobile', NOSSO, 'x.mp4', null) || M.deveBaixarDireto('desktop', NOSSO, 'x.mp4', true) || M.deveBaixarDireto('mobile', NOSSO, 'x.mp4', false) || M.deveBaixarDireto('mobile', FORA, 'x.mp4', true) || M.deveBaixarDireto('mobile', NOSSO, 'x.png', true)) throw new Error('deveBaixarDireto')
    const h = M.hrefDoDownloadDireto(NOSSO + '?download=velho', 'Meu filme <b>.mp4')
    if (!h || h.includes('/api/download') || new URL(h).searchParams.getAll('download').join('|') !== 'Meu-filme-b.mp4') throw new Error('endereço ' + h)
    if (M.hrefDoDownloadDireto(FORA, 'a.mp4') !== null) throw new Error('fornecedor de fora ganhou endereço direto')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['direto desligado', VD, '  const direto = baixarDireto(opts, base, device)\n  if (direto) return direto\n', ''],
  ['direto também no computador', VD, "  if (device !== 'mobile' || toque === false) return false", "  if (toque === false) return false"],
  ['direto fora do toque', VD, "  if (device !== 'mobile' || toque === false) return false", "  if (device !== 'mobile') return false"],
  ['direto para imagem', VD, '  return !!caminho && EXT_VIDEO.test(caminho) && EXT_VIDEO.test(filename)', '  return !!caminho'],
  ['direto pela rota /api/download', VD, "    const href = hrefDoDownloadDireto(url, filename)\n    if (!href) return null\n", "    const href = downloadHref(url, filename)\n    if (!href) return null\n"],
  ['sem o nome de baixar', VD, "    u.searchParams.set('download', nomeDoArquivo(filename, caminho))\n", ''],
  ['direto depois de um await', VD, "    if (typeof document === 'undefined' || !document.body) return null\n    if (!deveBaixarDireto", "    if (typeof document === 'undefined' || !document.body) return null\n    if (deveBaixarDireto(device, url, filename, toqueAtivo())) { void Promise.resolve().then(() => { const b = document.createElement('a'); b.setAttribute('href', hrefDoDownloadDireto(url, filename) ?? ''); b.click() }); fire('video_downloaded', { ...base, method: 'direct_link', ms: 0 }); anunciarVideoEntregue({ method: 'direct_link', ms: 0 }); showManualDownloadLink(url, filename, 'direct', base, ++manualLinkToken); return 'fallback_opened' }\n    if (!deveBaixarDireto"],
  ['sem video_downloaded', VD, "    fire('video_downloaded', { ...base, method: 'direct_link', ms: 0 })\n", ''],
  ['sem o aviso', VD, "    showManualDownloadLink(url, filename, 'direct', base, ++manualLinkToken)\n", ''],
  ['aviso do iPhone sem o caminho', VD, "        ? 'It goes to Files › Downloads. For Photos: open it, tap Share, then Save Video. Nothing happened? Tap the button.'", "        ? 'Downloading.'"],
  ['toque repetido baixa de novo', VD, '    if (antes !== undefined && agora - antes < DIRETO_JANELA_MS) {', '    if (false) {'],
  ['desfecho não conta como entregue', VD, "    return 'fallback_opened'\n  } catch {\n    return null\n  }\n}", "    return 'share_cancelled'\n  } catch {\n    return null\n  }\n}"],
]
let mortos = 0
for (const [n, f, de, para] of mutantes) {
  const t = lf(f)
  if (t.split(de).length !== 2) { console.error('MUTANTE SEM ÂNCORA: ' + n); process.exit(1) }
  if ((await bateria({ [f]: t.split(de).join(para) })).length) mortos++
  else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS download direto no celular: vídeo do renders sai pelo gerenciador do navegador dentro do toque (sem fetch, sem blob), com nome e aviso; toque repetido coalesce; fora do toque, computador, fornecedor de fora e imagem no caminho de sempre (${mortos}/${mutantes.length} mutantes mortos)`)
