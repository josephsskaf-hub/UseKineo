// KINEO-RECREATE-SOM-SO-O-SOM-1311 — guardião do item C (CEO 13/11 22:46): a montagem do som original traz SÓ o som. EXECUTA
// buildFreeClipWatermarkSource (lib/clips/freeClipWatermark.ts) e prova a ordem das camadas que o Creatomate desenha (trilha maior = por cima):
// o MP4 ORIGINAL do cliente entra como vídeo na trilha MAIS BAIXA, com opacidade 0% (som 100%), cortado na duração do clipe; o clipe do MOTOR
// fica acima dele, no quadro inteiro (sem x/y/largura/altura), com volume 0%; a marca, quando há, no topo. Nenhum elemento "audio" com MP4 (o
// defeito: o "audio" por cima entregava a IMAGEM do original, SSIM 0,99). Sem som original, a fonte é byte a byte a de antes. E o interruptor
// SEU_VIDEO_SOM_ORIGINAL foi LIGADO em 14/11 depois da prova em produção (KINEO-RECREATE-SOM-LIGA-1411: clip 42e8894a, entregue × motor 0,991, áudio × entrada 1,000)
// e a apresentação pública diz "original" (a etiqueta "Silent video" sai). Mutantes. Rodar: node scripts/test-recreate-som-so-o-som-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const WM = 'lib/clips/freeClipWatermark.ts', SV = 'lib/recreate/seuVideo.ts'
function carregar(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(over[rel] ?? lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', js)((id) => {
      if (id.startsWith('.')) { const base = path.posix.join(path.posix.dirname(rel), id); return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '/index.ts') }
      if (id.startsWith('@/')) { const base = id.slice(2); return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx') }
      return require(id)
    }, mod, mod.exports)
    return mod.exports
  }
  return load(WM)
}
const ORIGINAL = 'https://x.supabase.co/storage/v1/object/public/renders/recreate-uploads/u/v.mp4'
const CLEAN = 'https://x.supabase.co/storage/v1/object/public/clips/clips/u/c.mp4'
const INFO = { width: 720, height: 1280, fps: 24, durationSeconds: 5.041 }

/** A apresentação pública do servidor (lib/recreate/seuVideoPresentation), executada com o seuVideo.ts do jeito que está (ou do mutante). */
function apresentacao(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(over[rel] ?? lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', js)((id) => {
      if (id === 'server-only') return {}
      if (id === '@/lib/checkoutPricing') return { recreateCreditCost: (s) => (s <= 10 ? 40 : 60) }
      if (id.startsWith('.')) return load(path.posix.join(path.posix.dirname(rel), id) + '.ts')
      throw new Error('import inesperado: ' + id)
    }, mod, mod.exports)
    return mod.exports
  }
  return load('lib/recreate/seuVideoPresentation.ts').seuVideoPresentation()
}

function bateria(over = {}) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const M = carregar(over)
  const camadas = (src) => {
    const els = src.elements
    if (els.some((e) => e.type === 'audio')) throw new Error('elemento audio com MP4 (o defeito)')
    const orig = els.filter((e) => e.source === ORIGINAL), motor = els.filter((e) => e.source === CLEAN), texto = els.filter((e) => e.type === 'text')
    if (orig.length !== 1 || motor.length !== 1) throw new Error('camadas: ' + JSON.stringify(els))
    const o = orig[0], m = motor[0]
    if (o.type !== 'video' || o.opacity !== '0%' || o.volume !== '100%') throw new Error('original visível ou mudo: ' + JSON.stringify(o))
    if (o.duration !== 5.041 || o.time !== 0) throw new Error('som sem o corte na duração')
    if (!(m.track > o.track) || els.some((e) => e !== o && e.track <= o.track)) throw new Error('o original não é a camada de baixo')
    if (m.volume !== '0%' || 'x' in m || 'y' in m || 'width' in m || 'height' in m) throw new Error('motor não cobre o quadro ou tem som')
    for (const t of texto) if (!(t.track > m.track)) throw new Error('a marca ficou abaixo do vídeo')
    return { o, m, texto }
  }
  check('quem paga: só o som (sem marca), original por baixo e invisível', () => {
    const r = camadas(M.buildFreeClipWatermarkSource(CLEAN, INFO, { text: false, audio: { url: ORIGINAL, seconds: 5 } }))
    if (r.texto.length) throw new Error('marca em quem paga')
  })
  check('quem não paga: marca + som, marca no topo', () => {
    const r = camadas(M.buildFreeClipWatermarkSource(CLEAN, INFO, { audio: { url: ORIGINAL, seconds: 5 } }))
    if (r.texto.length !== 1) throw new Error('sem marca')
  })
  check('sem som original: byte a byte a fonte de antes', () => {
    const a = M.buildFreeClipWatermarkSource(CLEAN, INFO)
    if (a.elements.length !== 2 || a.elements[0].type !== 'video' || a.elements[0].track !== 1 || a.elements[1].type !== 'text' || a.elements[1].track !== 2 || 'volume' in a.elements[0]) throw new Error(JSON.stringify(a.elements))
  })
  check('KINEO-RECREATE-SOM-LIGA-1411: o interruptor do som LIGADO e a apresentação pública diz "original" (sem "Silent video")', () => {
    if (!/export const SEU_VIDEO_SOM_ORIGINAL = true\b/.test(over[SV] ?? lf(SV))) throw new Error('SEU_VIDEO_SOM_ORIGINAL desligado')
    const ap = apresentacao(over)
    if (ap.audio !== 'original') throw new Error('apresentação: ' + ap.audio)
  })
  return p
}

const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const w = lf(WM)
const mutantes = [
  ['original por cima (o defeito)', { [WM]: w.replace("const somDoOriginal = { type: 'video', track: 1,", "const somDoOriginal = { type: 'video', track: 9,") }],
  ['original visível', { [WM]: w.replace(", opacity: '0%', volume: '100%' }", ", volume: '100%' }") }],
  ['motor com som', { [WM]: w.replace("{ ...e, track: 2, volume: '0%' }", '{ ...e, track: 2 }') }],
  ['volta o elemento audio', { [WM]: w.replace("const somDoOriginal = { type: 'video',", "const somDoOriginal = { type: 'audio',") }],
  ['interruptor desligado de novo', { [SV]: lf(SV).replace('export const SEU_VIDEO_SOM_ORIGINAL = true', 'export const SEU_VIDEO_SOM_ORIGINAL = false') }], // KINEO-RECREATE-SOM-LIGA-1411
  ['apresentação presa em silent', { 'lib/recreate/seuVideoPresentation.ts': lf('lib/recreate/seuVideoPresentation.ts').replace("audio: SEU_VIDEO_SOM_ORIGINAL ? 'original' : 'silent'", "audio: 'silent'") }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(over).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS som só o som: original por baixo e invisível (opacidade 0%, som 100%, corte na duração), motor por cima no quadro inteiro e mudo, marca no topo, nenhum "audio" com MP4, sem som = fonte de antes, interruptor LIGADO e apresentação "original"; ${mortos}/${mutantes.length} mutantes mortos`)
