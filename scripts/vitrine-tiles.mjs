// KINEO-ENQUADRAMENTO-0911 — a lista de TODA mídia que a vitrine (home + /made-with-kineo) pode mostrar, com o focus que o código usa e as
// formas de janela em que cada uma aparece. Executa o próprio components/home/HomeMosaic.tsx (homeMosaicTiles) dia a dia, como o site.
// Usado por scripts/enquadra.mjs (a ferramenta) e scripts/test-enquadramento-vitrine-0911.mjs (o guardião). Não roda nada sozinho.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'

const require = createRequire(import.meta.url)
const Module = require('node:module')
export const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require('typescript')
const norm = (f) => path.relative(ROOT, f).split(path.sep).join('/')
const lf = (s) => String(s).replace(/\r\n/g, '\n')

let trocas = {}
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) {
    const base = path.join(ROOT, request.slice(2))
    for (const c of ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) if (fs.existsSync(base + c) && fs.statSync(base + c).isFile()) return base + c
  }
  if (request === 'server-only' || request === 'client-only') return path.join(ROOT, 'package.json')
  return resolveOriginal.call(this, request, parent, ...rest)
}
const transpila = (module, filename) => {
  let src = fs.readFileSync(filename, 'utf8')
  const troca = trocas[norm(filename)]
  if (troca) src = troca(lf(src))
  module._compile(ts.transpileModule(src, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
}
Module._extensions['.ts'] = transpila
Module._extensions['.tsx'] = transpila
Module._extensions['.css'] = () => {}

/** Carrega os módulos da vitrine; `novasTrocas` = { 'caminho/relativo.ts': (fonte) => fonteTrocada } (os mutantes do guardião). */
export function carrega(novasTrocas = {}) {
  trocas = novasTrocas
  for (const k of Object.keys(require.cache)) if (k.startsWith(ROOT) && !k.includes('node_modules')) delete require.cache[k]
  return {
    mosaico: require(path.join(ROOT, 'components/home/HomeMosaic.tsx')),
    novos: require(path.join(ROOT, 'lib/clipesNos2Lugares.ts')),
    trending: require(path.join(ROOT, 'lib/trending/trendingNow.ts')),
    galeria: require(path.join(ROOT, 'components/home/HomeImageGallery.tsx')),
    registro: require(path.join(ROOT, 'lib/vitrineEnquadramento.ts')),
  }
}

/** Os estilos de anúncio do /made-with-kineo no dia (a mesma conta de app/made-with-kineo/page.tsx). */
export function estilosDoDia(trending, now) {
  return (trending.trendingBlocks({ now: new Date(now), signedIn: false, today: null }).find((b) => b.id === 'ad-styles')?.cards ?? [])
    .filter((c) => !!c.video).map((c) => ({ key: c.key, title: c.title, engine: c.engine, video: c.video, poster: c.poster, href: c.href }))
}

/** Map chave(caminho da mídia) → { key, kind, label, media, poster, focus, shapes:Set, where:Set }. `dias` a partir de `desde`. */
export function midiasDaVitrine(mods, { desde = Date.UTC(2026, 10, 9), dias = 400 } = {}) {
  const { mosaico: M, novos: C, galeria: G } = mods
  const out = new Map()
  const add = (o, shape, where) => {
    if (!o.media) return
    const cur = out.get(o.media)
    if (cur) {
      if (cur.focus !== o.focus) cur.conflito = `${cur.focus} ≠ ${o.focus}`
      cur.shapes.add(shape); cur.where.add(where); return
    }
    out.set(o.media, { ...o, key: o.media, shapes: new Set([shape]), where: new Set([where]) })
  }
  const asset = (u) => u.split('/').pop().replace(/\.mp4$/, '')
  for (let d = 0; d < dias; d++) {
    const now = desde + d * 86400000
    const st = estilosDoDia(mods.trending, now)
    for (const [where, full] of [['home', false], ['mwk', true]]) {
      for (const t of M.homeMosaicTiles(now, { full, styles: full ? st : [] })) {
        if (t.kind === 'clip') add({ kind: 'clip', label: t.clip.id, media: t.clip.video, poster: t.clip.poster, focus: M.MOSAIC_CLIP_FOCUS[t.clip.id] ?? t.clip.focus ?? '50% 50%' }, 'big', where)
        else if (t.kind === 'film') add({ kind: 'film', label: asset(t.video), media: t.video, poster: t.poster ?? null, focus: t.focus ?? '50% 50%' }, 'big', where)
        else if (t.kind === 'motion') add({ kind: 'motion', label: asset(t.video), media: t.video, poster: t.poster, focus: t.focus }, 'big' /* KINEO-HOME-TOPO-CLIPES-1311 — o topo é cartão grande */, where)
        else if (t.kind === 'effect') add({ kind: 'effect', label: t.effect.key, media: t.effect.preview?.video, poster: t.effect.preview?.poster ?? null, focus: M.MOSAIC_EFFECT_FOCUS[t.effect.key] ?? '50% 45%' }, 'small', where)
        else if (t.kind === 'style') add({ kind: 'style', label: t.style.key, media: t.style.video, poster: t.style.poster ?? null, focus: M.MOSAIC_STYLE_FOCUS?.[t.style.key] ?? '50% 45%' }, 'small', where)
        else if (t.kind === 'novo') add({ kind: 'novo', label: t.clip.id, media: C.clipeNovoVideo(t.clip), poster: C.clipeNovoPoster(t.clip), focus: t.clip.focus }, t.grande ? 'big' : 'small', where)
        else if (t.kind === 'image') add({ kind: 'image', label: t.img.file, media: t.img.dir + t.img.file, poster: null, focus: M.MOSAIC_IMAGE_FOCUS?.[t.img.file] ?? '50% 50%' }, t.img.w > t.img.h ? 'wide' : G.HOME_GALLERY_BIG.has(t.img.file) ? 'big' : 'small', where)
      }
    }
  }
  return out
}

/** Lê um arquivo de public/ (null se não existe). */
export const lerPublico = (rel) => { const f = path.join(ROOT, 'public', String(rel).replace(/^\//, '').replace(/#.*$/, '')); return fs.existsSync(f) ? fs.readFileSync(f) : null }

/** "bytes:sha1(12)" de um arquivo em public/ (null se não existe). `ler` troca a leitura (mutantes do guardião). */
export function impressao(rel, ler = lerPublico) {
  if (!rel) return null
  const buf = ler(rel)
  if (!buf) return null
  return `${buf.length}:${createHash('sha1').update(buf).digest('hex').slice(0, 12)}`
}
