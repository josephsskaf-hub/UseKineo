#!/usr/bin/env node
// Offline: source files, approved media blobs, fake DOM lifecycle and SSR only.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const cp = require('node:child_process')
const { createRequire } = require('node:module')
const ROOT = process.env.KINEO_TEST_ROOT || path.resolve(__dirname, '..')
const repoRequire = createRequire(path.join(ROOT, 'package.json'))
const fallbackRequire = createRequire('C:/kineo/package.json')
const dependency = name => { try { return repoRequire(name) } catch { return fallbackRequire(name) } }
const ts = dependency('typescript')
const React = dependency('react')
const { renderToStaticMarkup } = dependency('react-dom/server')
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')
const approved = [
  {
    "original": "/previews/home-clean-sep24/castle.mp4",
    "light": "/previews/leve-1111/castle.mp4",
    "bytes": 1504766,
    "blob": "4241e0a0d78ece1c26a5a6356a0b326e84611afa"
  },
  {
    "original": "/previews/home-clean-sep24/lituya-h3.mp4",
    "light": "/previews/leve-1111/lituya-h3.mp4",
    "bytes": 1960760,
    "blob": "8de9f34a6ee09a1d9080eebda9ffd79208a1f520"
  },
  {
    "original": "/previews/home-clean-sep24/volcano-scene.mp4",
    "light": "/previews/leve-1111/volcano-scene.mp4",
    "bytes": 1278424,
    "blob": "2598e734294c6b81ba1b08cbbc885e580b09a623"
  },
  {
    "original": "/previews/home-clean-sep24/robot-action.mp4",
    "light": "/previews/leve-1111/robot-action.mp4",
    "bytes": 1483664,
    "blob": "4cb3b987f584fe904e68228067223566719c498d"
  },
  {
    "original": "/previews/home-clean-sep24/lighthouse-scene.mp4",
    "light": "/previews/leve-1111/lighthouse-scene.mp4",
    "bytes": 883819,
    "blob": "ad371c633a4c9c72217a7001ddea36c337051e23"
  },
  {
    "original": "/previews/home-clean-sep24/tunguska-globe.mp4",
    "light": "/previews/leve-1111/tunguska-globe.mp4",
    "bytes": 870955,
    "blob": "e55dbb59a2753547eb405e0e3546288b2cf4a065"
  },
  {
    "original": "/previews/efeito-pet_xmas_angel.mp4",
    "light": "/previews/leve-1111/efeito-pet_xmas_angel.mp4",
    "bytes": 705097,
    "blob": "1d2c1d1f6dabe75c1d4c14ee921da3ca62f05831"
  },
  {
    "original": "/previews/efeito-pet_bee.mp4",
    "light": "/previews/leve-1111/efeito-pet_bee.mp4",
    "bytes": 536690,
    "blob": "a8bea850848ffb992f581a882adaf36176fcd310"
  },
  {
    "original": "/previews/studio-kling4-werewolf-kid.mp4",
    "light": "/previews/leve-1111/studio-kling4-werewolf-kid.mp4",
    "bytes": 888998,
    "blob": "64ca408761252c0a74688e7f5e81e46697a51346"
  },
  {
    "original": "/previews/motion-surf-0611.mp4",
    "light": "/previews/leve-1111/motion-surf-0611.mp4",
    "bytes": 1425458,
    "blob": "88234b94c1a3b29dfffa96b4971f7df786412707"
  },
  {
    "original": "/previews/efeito-pet_lion.mp4",
    "light": "/previews/leve-1111/efeito-pet_lion.mp4",
    "bytes": 407809,
    "blob": "1372927e8bf9517b5330470bb8ab2f596a5444e8"
  },
  {
    "original": "/previews/efeito-snow_globe.mp4",
    "light": "/previews/leve-1111/efeito-snow_globe.mp4",
    "bytes": 517206,
    "blob": "ddd6ccbb96b18a79bba8504f3cb1cf6b117f0858"
  },
  {
    "original": "/previews/efeito-kiss.mp4",
    "light": "/previews/leve-1111/efeito-kiss.mp4",
    "bytes": 427269,
    "blob": "6eef4c59101025cc3b17b36134818eee9c2cb06c"
  },
  {
    "original": "/previews/motion-rua-0611.mp4",
    "light": "/previews/leve-1111/motion-rua-0611.mp4",
    "bytes": 461752,
    "blob": "9700c7913d8e2a7b37d6279985953d61bbd9d3cd"
  },
  {
    "original": "/previews/motion-manta-0611.mp4",
    "light": "/previews/leve-1111/motion-manta-0611.mp4",
    "bytes": 587483,
    "blob": "7cd433cefb08e5025c7507c79fdeb32ef5d01912"
  },
  {
    "original": "/previews/motion-horse-0611.mp4",
    "light": "/previews/leve-1111/motion-horse-0611.mp4",
    "bytes": 750866,
    "blob": "2576cd16f4fc6c437bcce6f58e290c3b04fb95ff"
  },
  {
    "original": "/previews/motion-neve-0611.mp4",
    "light": "/previews/leve-1111/motion-neve-0611.mp4",
    "bytes": 747864,
    "blob": "4ee2df77bda1adb4b1246090fc9a08418ef7cc39"
  },
  {
    "original": "/previews/efeito-pet_xmas_tree.mp4",
    "light": "/previews/leve-1111/efeito-pet_xmas_tree.mp4",
    "bytes": 395153,
    "blob": "aa482c577a7d94ce9126ee67433bd6e219f29c54"
  },
  {
    "original": "/previews/motion-eagle-0611.mp4",
    "light": "/previews/leve-1111/motion-eagle-0611.mp4",
    "bytes": 513829,
    "blob": "4718f4269069b69c88d61164a280cabc708e0870"
  },
  {
    "original": "/previews/efeito-santa_cartoon.mp4",
    "light": "/previews/leve-1111/efeito-santa_cartoon.mp4",
    "bytes": 383463,
    "blob": "42e946f1f262de80df23bbeb48e3d6acf420b6ac"
  },
  {
    "original": "/previews/efeito-giant_product.mp4",
    "light": "/previews/leve-1111/efeito-giant_product.mp4",
    "bytes": 298279,
    "blob": "0d81e8a2ff79a486729964b63e12559a4707674e"
  },
  {
    "original": "/previews/galeria/pebble-castle.mp4",
    "light": "/previews/leve-1111/pebble-castle.mp4",
    "bytes": 757622,
    "blob": "8fb913f03ca7e71464e621321c5b74ba0bd3fc24"
  },
  {
    "original": "/previews/galeria/wizard-cat.mp4",
    "light": "/previews/leve-1111/wizard-cat.mp4",
    "bytes": 749302,
    "blob": "06429c494753da8f1eb09efb24138d6c70ce22a8"
  },
  {
    "original": "/previews/efeito-hug.mp4",
    "light": "/previews/leve-1111/efeito-hug.mp4",
    "bytes": 300227,
    "blob": "d2e97aa8ff9ee01c44255e9812f7293182b1a214"
  }
]
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
function compile(source, fileName) {
  const output = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const errors = output.diagnostics.filter(x => x.category === ts.DiagnosticCategory.Error)
  assert.equal(errors.length, 0, errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, '\n')).join('\n'))
  return output.outputText
}
const purePosterSource = fs.existsSync(path.join(ROOT, 'lib/clipesNos2Lugares.ts'))
  ? read('lib/clipesNos2Lugares.ts')
  : cp.execFileSync('git', ['show', 'HEAD:lib/clipesNos2Lugares.ts'], { cwd: ROOT, encoding: 'utf8' })
function evaluate(code, imports = {}, environment = {}) {
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require(id) { if (!(id in imports)) throw Error('Unexpected import: ' + id); return imports[id] }, ...environment })
  return module.exports
}
const poster = evaluate(compile(purePosterSource, 'clipesNos2Lugares.ts'))
const helperCode = compile(read('lib/home/watchMedia.ts'), 'watchMedia.ts')
const load = env => evaluate(helperCode, { '@/lib/clipesNos2Lugares': poster }, env)
class Target {
  constructor() { this.listeners = new Map() }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn) }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn) }
  emit(name) { for (const fn of this.listeners.get(name) || []) fn() }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.size, 0) }
}
class Video {
  constructor() { this.attrs = new Map(); this.paused = true; this.playCalls = 0; this.pauseCalls = 0; this.loadCalls = 0; this.playImpl = () => Promise.resolve() }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null }
  setAttribute(name, value) { this.attrs.set(name, value) }
  removeAttribute(name) { this.attrs.delete(name) }
  load() { this.loadCalls++ }
  pause() { this.pauseCalls++; this.paused = true }
  play() { this.playCalls++; this.paused = false; return this.playImpl() }
}
function boot(options = {}) {
  const doc = Object.assign(new Target(), { hidden: !!options.hidden })
  const motion = Object.assign(new Target(), { matches: !!options.motion })
  const connection = Object.assign(new Target(), { saveData: !!options.saveData, effectiveType: options.effectiveType || '4g' })
  const observers = []
  class Observer {
    constructor(callback, config) { this.callback = callback; this.config = config; this.disconnected = false; observers.push(this) }
    observe(box) { this.box = box }
    disconnect() { this.disconnected = true }
    emit(ratio, intersecting = ratio > 0) { this.callback([{ target: this.box, isIntersecting: intersecting, intersectionRatio: ratio }]) }
  }
  const helper = load({ document: doc, window: { matchMedia: () => motion }, navigator: { connection }, IntersectionObserver: Observer })
  const box = {}
  const video = options.video || new Video()
  const states = []
  const controller = helper.createWatchMediaController(box, video, options.src || approved[0].original, state => states.push(state))
  return { doc, motion, connection, observers, observer: observers[0], box, video, states, controller, helper }
}
const flush = () => new Promise(resolve => setImmediate(resolve))
let scenarios = 0
async function scenario(name, run) { await run(); scenarios++; process.stdout.write('  ok ' + name + '\n') }
;(async () => {
  await scenario('1 initial/partial intersection never installs a video source, including manual play', async () => {
    const e = boot()
    eq(e.video.getAttribute('src'), null)
    e.observer.emit(0.59)
    e.controller.requestPlay()
    eq(e.video.getAttribute('src'), null)
    eq(e.video.playCalls, 0)
    eq(e.observer.config.rootMargin, '0px')
    e.controller.destroy()
  })
  await scenario('2 sixty percent starts the approved muted preview', async () => {
    const e = boot()
    e.observer.emit(0.6)
    await flush()
    eq(e.video.getAttribute('src'), approved[0].light)
    eq(e.video.preload, 'none')
    ok(e.video.muted && e.video.defaultMuted && e.video.loop && e.video.playsInline)
    eq(e.video.playCalls, 1)
    ok(e.states.at(-1).playing && e.states.at(-1).canPlay)
    e.controller.destroy()
  })
  await scenario('3 exit unloads and re-entry obtains a fresh source', async () => {
    const e = boot()
    e.observer.emit(1); await flush()
    const loads = e.video.loadCalls
    e.observer.emit(0.59)
    eq(e.video.getAttribute('src'), null)
    ok(e.video.paused)
    ok(e.video.loadCalls > loads)
    e.observer.emit(0.9); await flush()
    eq(e.video.getAttribute('src'), approved[0].light)
    eq(e.video.playCalls, 2)
    e.controller.destroy()
  })
  await scenario('4 reduced motion blocks initial and manual load, and responds to policy changes', async () => {
    const e = boot({ motion: true })
    e.observer.emit(1); e.controller.requestPlay()
    eq(e.video.getAttribute('src'), null)
    e.motion.matches = false; e.motion.emit('change'); await flush()
    eq(e.video.getAttribute('src'), approved[0].light)
    e.motion.matches = true; e.motion.emit('change')
    eq(e.video.getAttribute('src'), null)
    e.controller.destroy()
  })
  await scenario('5 Save-Data blocks initial and resumed playback', async () => {
    const e = boot({ saveData: true })
    e.observer.emit(1); e.controller.requestPlay()
    eq(e.video.getAttribute('src'), null)
    e.connection.saveData = false; e.connection.emit('change'); await flush()
    ok(e.states.at(-1).playing)
    e.connection.saveData = true; e.connection.emit('change')
    eq(e.video.getAttribute('src'), null)
    e.controller.destroy()
  })
  await scenario('6 slow-2g blocks downloads and leaving slow mode resumes only when visible', async () => {
    const e = boot({ effectiveType: 'slow-2g' })
    e.observer.emit(1)
    eq(e.video.getAttribute('src'), null)
    e.connection.effectiveType = '4g'; e.connection.emit('change'); await flush()
    eq(e.video.getAttribute('src'), approved[0].light)
    e.observer.emit(0, false)
    e.connection.effectiveType = '2g'; e.connection.emit('change')
    e.connection.effectiveType = '4g'; e.connection.emit('change')
    eq(e.video.getAttribute('src'), null)
    e.controller.destroy()
  })
  await scenario('7 document visibility unloads and restores only eligible media', async () => {
    const e = boot({ hidden: true })
    e.observer.emit(1)
    eq(e.video.getAttribute('src'), null)
    e.doc.hidden = false; e.doc.emit('visibilitychange'); await flush()
    ok(e.states.at(-1).playing)
    e.doc.hidden = true; e.doc.emit('visibilitychange')
    eq(e.video.getAttribute('src'), null)
    e.controller.destroy()
  })
  await scenario('8 autoplay rejection can retry silently without bypassing intersection', async () => {
    const video = new Video()
    video.playImpl = () => Promise.reject(Error('autoplay blocked'))
    const e = boot({ video })
    e.observer.emit(1); await flush()
    ok(!e.states.at(-1).playing && e.states.at(-1).canPlay)
    video.playImpl = () => Promise.resolve()
    e.controller.requestPlay(); await flush()
    ok(e.states.at(-1).playing && video.muted)
    e.observer.emit(0, false)
    e.controller.requestPlay()
    eq(e.video.getAttribute('src'), null)
    e.controller.destroy()
  })
  await scenario('9 cleanup removes listeners and a stale play cannot clear the next owner source', async () => {
    let settle
    const video = new Video()
    video.playImpl = () => new Promise(resolve => { settle = resolve })
    const e = boot({ video })
    e.observer.emit(1)
    const oldSettle = settle
    e.controller.destroy()
    eq(e.doc.listenerCount + e.motion.listenerCount + e.connection.listenerCount, 0)
    ok(e.observer.disconnected)
    eq(video.getAttribute('src'), null)
    video.playImpl = () => Promise.resolve()
    const next = e.helper.createWatchMediaController({}, video, approved[1].original)
    e.observers[1].emit(1); await flush()
    oldSettle(); await flush()
    eq(video.getAttribute('src'), approved[1].light)
    next.destroy()
    eq(video.getAttribute('src'), null)
    const calls = video.playCalls
    e.controller.requestPlay()
    eq(video.playCalls, calls)
  })

  const helper = load({})
  eq(Object.keys(helper.WATCH_PREVIEW_MAP).length, 24)
  for (const item of approved) {
    eq(helper.watchPreviewSrc(item.original), item.light, 'approved source mapping: ' + item.original)
    const file = path.join(ROOT, 'public', item.light)
    const content = fs.readFileSync(file)
    eq(content.length, item.bytes, 'approved bytes: ' + item.light)
    eq(crypto.createHash('sha1').update(Buffer.from('blob ' + content.length + '\0')).update(content).digest('hex'), item.blob, 'approved Git blob: ' + item.light)
  }
  eq(approved.reduce((sum, item) => sum + item.bytes, 0), 18836755)
  eq(helper.watchPreviewSrc(approved[0].original + '?v=1#clip'), approved[0].light + '?v=1#clip')
  for (const id of ['carta-do-front', 'raposa-lanterna', 'selfie-confete', 'anuncio-burger-camera-lenta', 'anuncio-creme-selfie', 'sueter-aconchegante']) {
    eq(helper.watchPreviewSrc('/previews/galeria/' + id + '.mp4'), '/previews/galeria/' + id + '.mp4', 'new top has no approved replacement')
    eq(helper.watchPosterSrc('/previews/galeria/' + id + '.mp4'), poster.clipeNovoPoster({ id }), 'canonical clip poster')
  }
  eq(helper.watchPreviewSrc('/previews/unknown.mp4'), '/previews/unknown.mp4')
  eq(helper.watchPosterSrc('/previews/unknown.mp4'), undefined)
  eq(helper.watchPosterSrc(approved[0].original, '/existing-poster.webp'), '/existing-poster.webp')
  const component = evaluate(compile(read('components/home/WatchMedia.tsx'), 'WatchMedia.tsx'), { react: React, 'react/jsx-runtime': dependency('react/jsx-runtime'), '@/lib/home/watchMedia': helper }).default
  const initial = renderToStaticMarkup(React.createElement(component, { src: '/previews/galeria/selfie-confete.mp4' }))
  ok(initial.includes('/posters/galeria/selfie-confete.webp'))
  const videoMarkup = initial.match(/<video\b[^>]*>/)[0]
  ok(!/\ssrc=/.test(videoMarkup), 'SSR video has no src')
  ok(videoMarkup.includes('preload="none"') && /\bmuted(?:=|[\s>])/i.test(videoMarkup) && /\bplaysinline(?:=|[\s>])/i.test(videoMarkup), 'SSR keeps silent non-preload policy')
  eq((initial.match(/object-fit:contain/g) || []).length, 2, 'both poster and video contain')
  ok(initial.includes('aspect-ratio:5 / 6'))
  ok(!initial.includes('<button'), 'safe default inside product Links')
  const withButton = renderToStaticMarkup(React.createElement(component, { src: '/previews/galeria/selfie-confete.mp4', showPlayButton: true }))
  ok(withButton.includes('<button') && withButton.includes('disabled=""') && withButton.includes('min-height:44px'))
  console.log('Watch media: ' + scenarios + ' lifecycle scenarios, 24 approved assets, ' + checks + ' contracts passed. No browser, API, render or production scripts.')
})().catch(error => { console.error(error); process.exitCode = 1 })
