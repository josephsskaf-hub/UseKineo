// Actual paid audio call sites with mocked providers. No network or paid generation.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const forbidden = () => { throw new Error('Offline audio guard forbids unmocked provider calls') }

test('actual Hollywood speech helper uses pinned OpenAI voice with no fal TTS route', async () => {
  const source = read('lib/hollywood/hostVoice.ts')
  const start = source.indexOf('export async function synthesizeHostSpeech(')
  const end = source.indexOf('\n}\n', start) + 3
  assert.ok(start >= 0 && end > start)
  const calls = []
  const box = { exports: {}, Buffer, stripScriptMarkers: value => value, require: path => {
    assert.equal(path, '@/lib/openai')
    return { OPENAI_TTS_TIMEOUT_MS: 55000, openai: { audio: { speech: { create: async (input, options) => {
      calls.push({ input, options }); return { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
    } } } } }
  } }
  vm.runInNewContext(compile(source.slice(start, end)), box, { timeout: 5000 })
  const audio = await box.exports.synthesizeHostSpeech({ text: 'Texto fiel do narrador.', voice: 'onyx', speed: 1.05 })
  assert.equal(audio.length, 3)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].input.model, 'tts-1-hd')
  assert.equal(calls[0].input.voice, 'onyx')
  assert.equal(calls[0].input.input, 'Texto fiel do narrador.')
  assert.equal(calls[0].options.maxRetries, 0)
})

test('actual paid compose music selects the matching catalog without a Lyria POST or warm lookup', async () => {
  let catalog = 0
  const music = { exports: {}, console: { log() {} }, require: path => {
    if (path.endsWith('musicDirection')) return { resolveMusicDirection: () => ({ enabled: true, curatedFallback: true, mood: 'epic' }) }
    if (path.endsWith('lyriaMusic')) return { getLyriaMusicUrl: forbidden, lyriaPromptFor: forbidden }
    if (path.endsWith('pixabayMusic')) return { getBackgroundMusicUrl: async () => { catalog++; return 'https://test.invalid/catalog.mp3' } }
    return forbidden()
  } }
  vm.runInNewContext(compile(read('lib/musicScore.ts')), music, { timeout: 5000 })
  const source = read('app/api/compose/route.ts')
  const start = source.indexOf('        hollywoodMusicUrl = await selectMusicForScript({')
  const end = source.indexOf('\n        })', start) + '\n        })'.length
  assert.ok(start > 0 && end > start)
  const box = { exports: {}, paidKling4EngineUsed: 'kling4', voiceoverScript: 'Faithful narration.', rawVoiceover: 'Faithful narration.',
    body: { topic: 'A ship.' }, vertical: 'documentary', audioDoClique: { musica: forbidden },
    selectMusicForScript: music.exports.selectMusicForScript }
  vm.runInNewContext(compile(`async function run(){let hollywoodMusicUrl=null;${source.slice(start, end)};return hollywoodMusicUrl;} exports.run=run;`), box, { timeout: 5000 })
  assert.equal(await box.exports.run(), 'https://test.invalid/catalog.mp3')
  assert.equal(catalog, 1)
})

test('actual paid birth skips fal audio prewarm while the free trial retains its existing path', async () => {
  const source = read('app/api/generate-video-cinematic/route.ts')
  const start = source.indexOf('    const audioNoClique = ')
  const end = source.indexOf('    const settleDebitAndRespond = ', start)
  assert.ok(start > 0 && end > start)
  let warmed = 0
  const box = { exports: {}, body: {}, generationId: 'paid-audio-test', user: { id: 'owner' }, claimQuality: 'cinematic_hollywood',
    agendarAudioNoClique: async () => { warmed++; return true } }
  vm.runInNewContext(compile(`function setup(){${source.slice(start, end)};return audioNoClique;} exports.setup=setup;`), box, { timeout: 5000 })
  const warm = box.exports.setup()
  assert.equal(await warm({ kling4_paid: { version: 'kling4_paid_2810' } }), false)
  assert.equal(warmed, 0)
  assert.equal(await warm({ kling4_trial: { version: 'kling4_trial_2810' } }), true)
  assert.equal(warmed, 1)
})
