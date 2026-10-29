// KINEO-LLMS-K4-2910 — execute real public output offline, including rollback in memory.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = rel => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const policy = 'lib/kling4TrialPolicy.ts'
const deny = name => { throw new Error(`Offline guardian forbids ${name}`) }

// KINEO-LLMS-K4-2910 — no credentials, network, database, rendering or on-disk switch changes.
function loader(overrides = {}) {
  const cache = new Map()
  const externals = {
    crypto, 'node:crypto': crypto,
    openai: { __esModule: true, default: class { constructor() { deny('OpenAI') } } },
    '@supabase/supabase-js': { createClient: () => deny('Supabase') },
  }
  function load(spec, parent = root) {
    if (Object.hasOwn(externals, spec)) return externals[spec]
    let file = spec.startsWith('@/') ? join(root, spec.slice(2)) : resolve(parent, spec)
    assert.ok(file.startsWith(root + sep), `Import outside repository: ${spec}`)
    if (!existsSync(file)) file += '.ts'
    const rel = file.slice(root.length + 1).split(sep).join('/')
    const source = overrides[rel] ?? read(rel)
    if (file.endsWith('.json')) return JSON.parse(source)
    if (cache.has(file)) return cache.get(file)
    const exports = {}
    cache.set(file, exports)
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    vm.runInNewContext(js, {
      exports, require: name => load(name, dirname(file)),
      Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, Response,
      process: { env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' } },
      console: { log() {}, warn() {}, error() {} },
      fetch: () => deny('network'), setTimeout: () => deny('timer'), clearTimeout() {},
    }, { filename: file, timeout: 10000 })
    return exports
  }
  return load
}

// KINEO-LLMS-K4-2910 — expectations are independent of the canonical copy implementation.
async function verify(live, overrides = {}) {
  const load = loader(overrides)
  const expected = live ? 'Kling 4.0' : 'Seedance 1.5'
  const label = `free 15-second film (${expected})`
  assert.equal(load(policy).KLING4_TRIAL_LIVE, live)
  assert.equal(load('lib/freeFilmEngine.ts').FREE_FILM_ENGINE_NAME, expected)
  const offer = load('lib/freeTierOffer.ts')
  assert.equal(offer.FREE_FILM_LABEL, label)
  assert.equal(offer.TRIAL_FREE_FILM_SECONDS, 15)
  const facts = load('lib/kineoFacts.ts')
  assert.equal(facts.TRIAL_ACCESS.freeFilm.engine, expected)
  assert.equal(facts.TRIAL_ACCESS.freeFilm.seconds, 15)
  assert.ok(facts.TRIAL_COVERED_ENGINE_NAMES.startsWith(expected + ' ('))
  assert.ok(facts.START_HERE_FACT.action.includes(label))
  assert.ok(load('lib/entryPolicy.ts').FREE_ENTRY_COPY.sentence.includes(label))
  const payload = await load('app/api/facts/route.ts').GET().json()
  assert.equal(payload.trialAccess.freeFilm.engine, expected)
  const llms = await load('app/llms.txt/route.ts').GET().text()
  assert.ok(llms.includes(label), '/llms.txt must publish the switch-derived free-film label')
  assert.ok(llms.includes(`First film free — made with ${expected}`))
  if (live) {
    assert.doesNotMatch(llms, /free 15-second film \(Seedance 1\.5\)|free (?:first )?film (?:uses|runs on) Seedance 1\.5|trial film uses Seedance 1\.5/i)
    assert.doesNotMatch(offer.FREE_FILM_LABEL, /Seedance 1\.5/)
  }
}

// KINEO-LLMS-K4-2910 — true is the checked-in production intent; false is a stub only.
assert.match(read(policy), /export const KLING4_TRIAL_LIVE = true\b/)
const off = { [policy]: read(policy).replace('export const KLING4_TRIAL_LIVE = true', 'export const KLING4_TRIAL_LIVE = false') }
await verify(true)
console.log('PASS live: /llms.txt, /api/facts, kineoFacts, FREE_FILM_LABEL and entryPolicy say Kling 4.0')
await verify(false, off)
console.log('PASS rollback stub: the same public output returns to Seedance 1.5')

// KINEO-LLMS-K4-2910 — stale engine labels and a broken rollback must still turn this guardian red.
const stale = { 'lib/freeFilmEngine.ts': "export const FREE_FILM_ENGINE_NAME = 'Seedance 1.5'" }
await assert.rejects(() => verify(true, stale), /Kling 4\.0/)
const stuck = { ...off, 'lib/freeFilmEngine.ts': "export const FREE_FILM_ENGINE_NAME = 'Kling 4.0'" }
await assert.rejects(() => verify(false, stuck), /Seedance 1\.5/)
const staleFacts = { 'lib/kineoFacts.ts': read('lib/kineoFacts.ts').replace('freeFilm: { engine: FREE_FILM_ENGINE_NAME,', "freeFilm: { engine: 'Seedance 1.5',") }
assert.notEqual(staleFacts['lib/kineoFacts.ts'], read('lib/kineoFacts.ts'))
await assert.rejects(() => verify(true, staleFacts), /Kling 4\.0/)
console.log('PASS mutants: stale canonical label, stale facts and stuck rollback are rejected')
