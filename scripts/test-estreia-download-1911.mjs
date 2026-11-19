// KINEO-ESTREIA-DOWNLOAD-1911 — guardião do Download da estreia [CEO 19/11: a estreia pelo mesmo módulo, só vídeo passa].
// Prova, EXECUTANDO components/premiere/Premiere.tsx (PremiereResult, com React e o módulo de download falsos) e lib/premiereDownload.ts:
//   (1) vídeo com link (clipe do Studio, desenho, podcast): o Download é um BOTÃO que chama downloadVideoFile com a URL, nome .mp4 e a
//       superfície certa (studio_clip | cartoon | podcast), e os eventos da tela (premiere_download_clicked e o onDownload) seguem saindo;
//   (2) imagem e áudio com link: o <a href download> de sempre, sem chamar o módulo de vídeo;
//   (3) sem link (as telas que baixam sozinhas pelo onDownload): o botão de sempre, sem chamar o módulo;
//   (4) as 3 telas que passam link (Studio, desenho, podcast) são vídeo.
// Mutantes no fim. Rodar: node scripts/test-estreia-download-1911.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
const PRE = 'components/premiere/Premiere.tsx', LIBP = 'lib/premiereDownload.ts'
const URLV = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/clips/u/a.mp4'

function carregar(over) {
  const w = { downloads: [], events: [] }
  const run = (src, req) => { const mod = { exports: {} }; new Function('require', 'module', 'exports', js(src))(req, mod, mod.exports); return mod.exports }
  const libp = run(over[LIBP] ?? lf(LIBP), () => ({}))
  const el = (type, props) => ({ type, props: props ?? {} })
  const req = (m) => {
    if (m === 'react') return { useEffect() {}, useRef: () => ({ current: null }), useState: (v) => [v, () => {}] }
    if (m === 'react/jsx-runtime') return { jsx: el, jsxs: el, Fragment: 'Fragment' }
    if (m === '@/lib/analytics') return { trackEvent: async (name, md) => { w.events.push({ name, md }) } }
    if (m === '@/lib/videoDownload') return { downloadVideoFile: async (o) => { w.downloads.push(o); return 'blob' } }
    if (m === '@/lib/premiereDownload') return libp
    if (m === '@/components/video/useReadyBeacon') return { useReadyBeacon() {} }
    if (m === './premiere.module.css') return new Proxy({}, { get: (_, k) => String(k) })
    if (m === './EsperaPerguntas0511') return { default: () => null }
    throw new Error('import inesperado ' + m)
  }
  w.P = run(over[PRE] ?? lf(PRE), req)
  w.libp = libp
  return w
}
const achar = (n, pred) => {
  if (!n || typeof n !== 'object') return null
  if (Array.isArray(n)) { for (const c of n) { const r = achar(c, pred); if (r) return r } return null }
  if (pred(n)) return n
  return achar(n.props?.children, pred)
}
const botaoDeBaixar = (arvore) => achar(arvore, (n) => (n.type === 'button' || n.type === 'a') && JSON.stringify(n.props.children ?? '').includes('⬇'))

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  for (const [surface, esperado] of [['clip', 'studio_clip'], ['cartoon', 'cartoon'], ['podcast', 'podcast']]) {
    await check(`(1) vídeo com link (${surface}) pelo módulo`, async () => {
      const w = carregar(over)
      let telaDisse = 0
      const b = botaoDeBaixar(w.P.PremiereResult({ surface, kind: 'video', url: URLV, title: 'Café com Leão!', downloadHref: URLV, onDownload: () => { telaDisse++ } }))
      if (!b || b.type !== 'button' || 'href' in b.props || 'download' in b.props) throw new Error('o Download ainda é <a href download>')
      b.props.onClick()
      await new Promise((r) => setImmediate(r))
      const d = w.downloads[0]
      if (w.downloads.length !== 1 || d.url !== URLV || d.filename !== 'cafe-com-leao.mp4' || d.surface !== esperado || d.exportType !== 'current_asset') throw new Error('downloadVideoFile ' + JSON.stringify(d))
      if (telaDisse !== 1 || !w.events.some((e) => e.name === 'premiere_download_clicked')) throw new Error('os eventos da tela sumiram')
    })
  }
  for (const kind of ['image', 'audio']) {
    await check(`(2) ${kind} com link: o link de sempre, sem o módulo de vídeo`, async () => {
      const w = carregar(over)
      const b = botaoDeBaixar(w.P.PremiereResult({ surface: kind, kind, url: URLV, downloadHref: 'https://x/a.' + (kind === 'image' ? 'png' : 'mp3') }))
      if (!b || b.type !== 'a' || !('download' in b.props)) throw new Error('mudou o link de ' + kind)
      b.props.onClick?.()
      if (w.downloads.length) throw new Error(kind + ' passou pelo módulo de vídeo')
    })
  }
  await check('(3) sem link: o botão de sempre, a tela baixa sozinha', async () => {
    const w = carregar(over)
    let telaBaixou = 0
    const b = botaoDeBaixar(w.P.PremiereResult({ surface: 'ads', kind: 'video', url: URLV, onDownload: () => { telaBaixou++ } }))
    b.props.onClick()
    if (b.type !== 'button' || telaBaixou !== 1 || w.downloads.length) throw new Error('mudou quem baixa sem link')
  })
  await check('(4) nome e regra pura', async () => {
    const L = carregar(over).libp
    if (L.nomeDoVideoDaEstreia('', 'cartoon') !== 'kineo-cartoon.mp4' || L.nomeDoVideoDaEstreia(null, 'clip') !== 'kineo-clip.mp4') throw new Error('nome sem título')
    if (!L.nomeDoVideoDaEstreia('a'.repeat(90), 'clip').endsWith('.mp4') || L.nomeDoVideoDaEstreia('a'.repeat(90), 'clip').length > 64) throw new Error('nome longo')
    if (L.estreiaBaixaPeloModulo('video', '  ') || L.estreiaBaixaPeloModulo('image', URLV) || !L.estreiaBaixaPeloModulo('video', URLV)) throw new Error('regra')
  })
  await check('(5) as 3 telas que passam link são vídeo', async () => {
    for (const f of ['app/(dashboard)/studio/StudioClient.tsx', 'components/kidsCartoon/KidsCartoonTemplate.tsx', 'components/kidsCartoon/BabyPodcastTemplate.tsx']) {
      const s = lf(f)
      for (const m of s.matchAll(/<PremiereResult([\s\S]*?)>/g)) if (/downloadHref=/.test(m[1]) && !/kind="video"/.test(m[1])) throw new Error(f)
      if (!/<PremiereResult[\s\S]*?downloadHref=/.test(s)) throw new Error('sem link: ' + f)
    }
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['vídeo volta ao <a download>', PRE, '        {peloModulo ? (', '        {false ? ('],
  ['imagem passa pelo módulo', LIBP, "  return kind === 'video' && typeof downloadHref === 'string'", "  return typeof downloadHref === 'string'"],
  ['botão não chama o módulo', PRE, "    void downloadVideoFile({ url: props.downloadHref,", "    void (async (_o: unknown) => {})({ url: props.downloadHref,"],
  ['eventos da tela somem', PRE, '  const baixarVideo = () => {\n    download()\n', '  const baixarVideo = () => {\n'],
  ['superfície errada', LIBP, "  clip: 'studio_clip',", "  clip: 'clips',"],
  ['nome sem .mp4', LIBP, "  return `${base || `kineo-${surface.replace(/[^a-z0-9]+/gi, '') || 'video'}`}.mp4`", "  return `${base || `kineo-${surface.replace(/[^a-z0-9]+/gi, '') || 'video'}`}`"],
]
let mortos = 0
for (const [n, f, de, para] of mutantes) {
  const t = lf(f)
  if (t.split(de).length !== 2) { console.error('MUTANTE SEM ÂNCORA: ' + n); process.exit(1) }
  if ((await bateria({ [f]: t.split(de).join(para) })).length) mortos++
  else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS estreia: vídeo com link (Studio, desenho, podcast) baixa pelo módulo único com nome .mp4 e a superfície certa, eventos da tela intactos; imagem e áudio no link de sempre; sem link, a tela baixa sozinha (${mortos}/${mutantes.length} mutantes mortos)`)
