// Pure preflight only. Real imports are transpiled in memory for mutation checks.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const entry = path.resolve(__dirname, '../lib/requestFidelity.ts')
const original = fs.readFileSync(entry, 'utf8')
function load(file, entrySource) {
  const source = file === entry ? entrySource : fs.readFileSync(file, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  const localRequire = name => load(path.resolve(path.dirname(file), name + '.ts'), entrySource)
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: localRequire })
  return mod.exports
}

function verify(source) {
  const { reviewRequestFidelity } = load(entry, source)
  const check = (prompt, scriptMode = 'verbatim') => reviewRequestFidelity({ prompt, scriptMode, duration: 35 })
  for (const speech of [
    'About half the ice melted overnight. By sunrise, the lake had swallowed the path.',
    'About 200 years ago, the village stood here.',
    'About a third of the crew made it home',
    'About the size of a coin, the egg fits in my hand.',
    'About a quarter past three the light went out.',
    'About a year ago I first saw the northern lights.',
    'Video on demand changed the way we watched movies. Then something unexpected happened.',
    'Um vídeo sobre a enchente mostrou o resgate. Quando a água subiu, os vizinhos se uniram.',
    'Story about town was that nobody made it out alive.',
    'A topic for another day became the biggest story of our lives. Months passed before anyone believed us.',
    'Видео на тему экологии стало главным доказательством. Его увидели все.',
    'A trending topic for yesterday changed an entire town overnight',
    'Видео на тему экологии стало главным доказательством',
    'A trending topic for teens went global',
    'Видео на тему экологии стало популярным',
    'Ролик на тему планет. Жизнь галактики',
    'About that promise? I kept it.',
    'About a sailor standing on the pier at 3 am',
    // reancorado KINEO-RECUSA-IA-2011 [CEO 20/11, filme d700489f]: "I'm sorry, I can't assist with that." é a recusa REAL do nosso escritor que
    // virou filme grátis (e não fala do cliente) — saiu desta lista para a de baixo; a fala de diálogo com "sorry" continua protegida por esta:
    "I'm sorry, Mom. I broke your favorite vase and hid the pieces under my bed.",
    'NARRATION: About a sailor standing on the pier at 3 am',
    '',
  ]) assert.equal(check(speech), null, 'Spoken text: ' + speech)

  for (const brief of [
    'Write a script about a forgotten pier.',
    'Trending topic for coastal wildlife films',
    'Ролик на тему: планеты',
    'https://example.test/idea',
  ]) {
    const result = check(brief)
    assert.equal(result?.reason, 'brief_requires_review', brief)
    assert.equal(result.charged, false)
    assert.equal(check(brief, 'ai'), null)
  }
  // KINEO-RECUSA-IA-2011 — a recusa do modelo colada como "fala" vai à revisão, nada cobrado (a guarda da rota do cinematic também a barra antes)
  const recusa = check("I'm sorry, I can't assist with that.")
  assert.equal(recusa?.reason, 'brief_requires_review', 'model refusal as verbatim speech')
  assert.equal(recusa.charged, false)
}

verify(original)
const mutants = [
  ["rejects timed speech", "if (isTopicField(opening))", "if (/^about a sailor/i.test(opening) || isTopicField(opening))"],
  ["rejects dialogue", "if (isTopicField(opening))", "if (/^I.*sorry/i.test(opening) || isTopicField(opening))"],
  ["accepts a standalone link", "if (/^https?", "if (false && /^https?"],
  ['classifies every topic prefix', 'if (isTopicField(opening))', 'if (/^(?:a topic for|видео на тему)/iu.test(opening) || isTopicField(opening))'],
  ['classifies labelled speech', 'if (isInstructionBrief(text))', 'if (/^NARRATION:/i.test(text) || isInstructionBrief(text))'],
]
for (const [label, before, after] of mutants) {
  assert.equal(original.split(before).length, 2, 'Mutation anchor: ' + label)
  assert.throws(() => verify(original.replace(before, after)), { name: 'AssertionError' }, label)
}
console.log('PASS verbatim speech, explicit briefs, AI mode, five mutants')
