import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = file => readFileSync(path.join(root, file), 'utf8')
const file = 'lib/pastedDirectives.ts'
const source = read(file)

// Run the real parser and its caller against an isolated copy for each mutation.
function load(sourceUnderTest) {
  const cache = new Map()
  function compile(filename) {
    if (cache.has(filename)) return cache.get(filename)
    const module = { exports: {} }
    const src = filename === file ? sourceUnderTest : read(filename)
    const { outputText } = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const resolve = name => compile(path.posix.normalize(path.posix.join(path.posix.dirname(filename), name + '.ts')))
    vm.runInNewContext(outputText, { module, exports: module.exports, require: resolve }, { filename })
    cache.set(filename, module.exports)
    return module.exports
  }
  return { parser: compile(file), fidelity: compile('lib/requestFidelity.ts') }
}

function check(src) {
  const { parser, fidelity } = load(src)
  const cases = [
    ['The duration is 60 seconds.', 60],
    ['Make it 60 seconds long.', 60],
    ['Make it precisely 60 seconds long.', 60],
    ['Crie um vídeo sobre uma geleira. O vídeo deve durar 60 segundos.', 60],
    ['Create a video of a glacier. The final video must be 60 seconds long.', 60],
    ['Create a video of a glacier. The film should last exactly 1:00.', 60],
    ['60 seconds.', 60],
    ['Duration: exactly 60 seconds.', 60],
    ['A duração é de 60 segundos.', 60],
    ['La duración es de 60 segundos.', 60],
    ['The duration is 1:30.', 90],
    ['Make it 35–45 seconds long.', 45],
    ['The scene clock shows 30 min. Make it 60 seconds long.', 60],
    ['Scene duration: 5 seconds. Film duration: 60 seconds.', 60],
    ['Scene duration: 0:05. Film duration: 1:00.', 60],
    ['Duração da cena: 5 segundos. Duração do filme: 60 segundos.', 60],
    ['Create a 35–45 second vertical YouTube Short', 45],
    ['The scene clock shows 30 min.', null],
    ['The scene clock shows 3:00.', null],
    ['The scene lasts 60 seconds.', null],
    ['The duration of the scene is 30 minutes.', null],
    ["The scene's duration is 30 minutes.", null],
    ['He waits 30 minutes before leaving.', null],
    ['Can he make it 30 minutes before the train leaves?', null],
    ['Shoot in 9:16.', null],
    ['', null],
    [null, null],
  ]
  for (const [prompt, expected] of cases) {
    const d = parser.readPastedDirectives(prompt).directives.find(item => item.kind === 'duration')
    assert.equal(d?.askedSeconds ?? null, expected, String(prompt))
  }
  const prompt = 'Create a video about glaciers. The duration is 60 seconds.'
  const review = duration => fidelity.reviewRequestFidelity({ prompt, scriptMode: 'ai', duration })
  assert.equal(review(15)?.reason, 'request_duration_mismatch')
  assert.equal(review(15)?.charged, false)
  assert.equal(review(60), null)
}

check(source)
for (const [find, replace] of [
  ['requestedLength || outputDurationLabel(before)', 'requestedLength'],
  ['const filmBefore = FILM_DURATION_PREFIX.test(before)', 'const filmBefore = false'],
  ['const film = FILM_DURATION_PREFIX.test(before)', 'const film = false'],
  ['if (!label) return false', 'if (!label) return false; return true'],
  ['requestedLength ||', 'false ||'],
  ['const standalone =', 'const standalone = false &&'],
  ['if (!explicit && !filmBefore', 'if (false && !explicit && !filmBefore'],
]) {
  assert(source.includes(find), 'Missing mutation anchor: ' + find)
  assert.throws(() => check(source.replace(find, replace)), assert.AssertionError, find)
}
console.log('PASS: duration directives, scene clocks, shorter-film preflight; all 7 mutants rejected.')
