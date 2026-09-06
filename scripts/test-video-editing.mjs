import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { renderPage } from './preview-ux-complete.mjs'
const require = createRequire(import.meta.url), ts = require('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks++ }
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }
const modules = {}
const records = { contexts: [], streams: [], frames: [], audio: [], urls: new Set(), revoked: 0 }
let clock = 0, failPlay = false, stalled = false, support = true
class Track { constructor(kind) { this.kind = kind; this.stopped = false } stop() { this.stopped = true } }
class Stream { constructor(tracks = []) { this.tracks = tracks; records.streams.push(this) } getTracks() { return this.tracks } getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio') } addTrack(t) { this.tracks.push(t) } }
class Video extends EventTarget {
  constructor() { super(); this.duration = 4; this.videoWidth = 640; this.videoHeight = 360; this.readyState = 3; this.seeking = false; this.paused = true; this.playbackRate = 1; this.time = 0 }
  get currentTime() { return this.time }
  set currentTime(value) { this.time = value }
  play() { if (failPlay) return Promise.reject(new Error('blocked')); records.playbackStarted = true; this.paused = false; this.interval = setInterval(() => { if (stalled) return; this.time += .05 * this.playbackRate; clock += 50; if (this.time >= this.duration) { this.pause(); this.dispatchEvent(new Event('ended')) } }, 1); return Promise.resolve() }
  pause() { this.paused = true; clearInterval(this.interval) }
  removeAttribute() {} load() {}
}
class Canvas {
  constructor() { this.width = 640; this.height = 360; this.ctx = { fillRect: (...args) => records.frames.push(['rect', ...args]), drawImage: (...args) => records.frames.push(['video', args[0].currentTime, ...args.slice(1)]), measureText: text => ({ width: text.length * 12 }), fillText: (...args) => records.frames.push(['text', ...args]) }; records.contexts.push(this.ctx) }
  getContext() { return this.ctx } captureStream() { return new Stream([new Track('video')]) }
}
class Recorder {
  static isTypeSupported() { return support }
  constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.state = 'inactive'; records.lastRecorder = this }
  start() { assert.equal(records.playbackStarted, true, 'do not record the pre-playback delay'); checks++; this.state = 'recording' }
  stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob([JSON.stringify({ audioTracks: this.stream.getAudioTracks().length })], { type: this.mimeType }) }); this.onstop?.() }) }
}
class Audio {
  constructor() { this.state = 'suspended'; records.audio.push(this) }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
  createMediaElementSource() { return { connect() {}, disconnect() {} } }
  createMediaStreamDestination() { return { stream: new Stream([new Track('audio')]) } }
}
const doc = new EventTarget(); doc.hidden = false; doc.createElement = name => name === 'video' ? new Video() : new Canvas()
const globals = { Blob, File, AbortController, Error, Number, Math, Promise, console, setTimeout, clearTimeout, setInterval, clearInterval, MediaRecorder: Recorder, MediaStream: Stream, HTMLCanvasElement: Canvas, AudioContext: Audio, document: doc, URL: { createObjectURL() { const url = 'blob:test-' + records.revoked + '-' + records.urls.size; records.urls.add(url); return url }, revokeObjectURL(url) { records.urls.delete(url); records.revoked++ } }, requestAnimationFrame: cb => setTimeout(cb, 1), cancelAnimationFrame: clearTimeout, performance: { now: () => clock } }
function load(name) {
  if (modules[name]) return modules[name]
  const code = fs.readFileSync(`lib/videoEditing/${name}.ts`, 'utf8'), module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { ...globals, module, exports: module.exports, require: id => load(id.replace('./', '')) })
  return modules[name] = module.exports
}
const policy = load('settings'), browser = load('browserEditor'), info = { duration: 4, width: 640, height: 360 }
const settings = policy.defaults(4, 'trim'), file = new File(['fixture'], 'example.mp4', { type: 'video/mp4' })
eq(policy.EDITING_TOOLS.map(t => t.id).join(','), 'trim,resize,speed,mute,text', 'five distinct operations')
eq(policy.editingTool('unknown'), 'trim', 'unknown query safely defaults')
eq(policy.defaults(4, 'mute').mute, true, 'mute entry enables actual mute')
for (const patch of [{ start: -1 }, { end: 6 }, { start: 3.9 }, { start: NaN }, { end: Infinity }, { speed: 0 }, { speed: 3 }, { text: 'a'.repeat(101) }, { aspect: 'bad' }, { fit: 'bad' }, { position: 'bad' }]) { assert.throws(() => policy.validateSettings({ ...settings, ...patch }, info)); checks++ }
for (const aspect of ['original', '9:16', '1:1', '16:9']) { const size = policy.outputSize(3840, 2160, aspect); ok(size.width <= 1280 && size.height <= 1280 && size.width % 2 === 0 && size.height % 2 === 0, aspect + ' bounded even output dimensions') }
eq(policy.outputSize(640, 360, '1:1').width, 640, 'square target width')
ok(policy.drawRect(640, 360, 360, 640, 'contain').height < 640, 'fit retains full frame')
ok(policy.drawRect(640, 360, 360, 640, 'cover').x < 0, 'cover crops sides')
eq(policy.downloadName('my <video>.mp4', 'video/webm'), 'my--video--kineo-edit.webm', 'never mislabel WebM as MP4; filename safe')
eq((await browser.readClip(file, new AbortController().signal)).duration, 4, 'real metadata function')
await assert.rejects(browser.readClip(new File([], 'empty.mp4'), new AbortController().signal)); checks++
for (const [label, patch] of [['trim', { start: 1, end: 2 }], ['resize', { aspect: '9:16' }], ['speed', { speed: 2 }], ['mute', { mute: true }], ['text', { text: 'TEST TITLE' }]]) {
  records.frames = []; records.playbackStarted = false
  const progress = [], blob = await browser.exportClip(file, info, { ...settings, ...patch }, new AbortController().signal, p => progress.push(p))
  ok(blob.size > 0, label + ' returns actual recorded data')
  eq(JSON.parse(await blob.text()).audioTracks, patch.mute ? 0 : 1, label + ' output audio tracks')
  eq(progress.at(-1), 100, label + ' only completed export reaches 100')
  ok(records.frames.some(frame => frame[0] === 'video'), label + ' actual decoder drawn')
  if (label === 'trim') ok(records.frames.filter(f => f[0] === 'video').every(f => f[1] >= 1 && f[1] < 2.2), 'trim uses selected source range')
  if (label === 'text') ok(records.frames.some(frame => frame[0] === 'text' && frame[1] === 'TEST TITLE'), 'text burned into exported canvas')
  eq(records.urls.size, 0, label + ' source URL revoked')
  ok(records.streams.every(stream => stream.getTracks().every(track => track.stopped)), label + ' all tracks stopped')
  ok(records.audio.every(audio => audio.state === 'closed'), label + ' audio contexts closed')
}
failPlay = true; await assert.rejects(browser.exportClip(file, info, settings, new AbortController().signal, () => {}), /play_failed/); checks++; failPlay = false
const controller = new AbortController(); controller.abort(); await assert.rejects(browser.exportClip(file, info, settings, controller.signal, () => {}), /cancelled/); checks++
const hiddenController = new AbortController(); const hiddenRun = browser.exportClip(file, info, settings, hiddenController.signal, () => {}); setTimeout(() => { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')) }, 4); await assert.rejects(hiddenRun, /keep_visible/); checks++; doc.hidden = false
support = false; eq(browser.recordingMime(), null, 'unsupported formats fail closed'); support = true
eq(records.urls.size, 0, 'failure paths release source URLs')
ok(records.streams.every(stream => stream.getTracks().every(track => track.stopped)), 'failure paths release tracks')
ok(records.audio.every(audio => audio.state === 'closed'), 'failure paths close audio')
const hub = renderPage('app/tools/page.tsx'), spanish = renderPage('app/tools/page.tsx', false, { interfaceLanguage: 'es' })
for (const tool of policy.EDITING_TOOLS) { ok(hub.includes(`/tools/editor?tool=${tool.id}`), tool.id + ' reachable from real hub'); ok(spanish.includes(tool.es), tool.id + ' Spanish card') }
const home = renderPage('app/KineoLanding.tsx')
eq((home.match(/href="\/tools">Editing tools<\/a>/g) || []).length, 2, 'desktop and mobile navigation renamed')
console.log(`PASS ${checks} editing contracts: real policy, real export pipeline with browser primitives mocked, hub SSR. No network, provider or credit use. Browser codec verification still required.`)
