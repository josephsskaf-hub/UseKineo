#!/usr/bin/env node
// Offline: execute actual TS modules and actual route music try-blocks in a VM.
// No environment file, database, provider, filesystem write or generated audio.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let assertions = 0
const failures = []
function check(label, condition) {
  assertions++
  if (!condition) failures.push(label)
}
function runtime(options = {}) {
  const cache = new Map(), logs = [], posts = [], requests = []
  const context = {
    process: { env: { FAL_KEY: 'offline-test-key', MUSIC_OPENVERSE_ENABLED: '1' } },
    console: { log: (...x) => logs.push(x.join(' ')), warn: (...x) => logs.push(x.join(' ')) },
    AbortController,
    setTimeout: (fn, delay) => { if (delay === 2500) queueMicrotask(fn); return 0 },
    clearTimeout() {},
    fetch: async (url, init = {}) => {
      requests.push(String(url))
      if (String(url).includes('openverse')) throw new Error('UNEXPECTED_OPENVERSE')
      if (init.method === 'POST') {
        posts.push(JSON.parse(init.body))
        if (options.fail) return { ok: false, status: 503 }
        if (options.throw) throw new Error('SECRET_SCRIPT signed-url-token')
        return { ok: true, json: async () => ({ request_id: 'offline-job' }) }
      }
      if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ status: 'COMPLETED' }) }
      return { ok: true, json: async () => ({ audio: { url: 'https://offline.invalid/music.mp3' } }) }
    },
  }
  function load(relative) {
    const file = resolve(root, relative)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    vm.runInNewContext(code, {
      ...context, module, exports: module.exports,
      require(specifier) {
        // Personas is a static voice dependency; never invoke voice functions.
        if (specifier === './personas') return { VOICE_PERSONAS: {} }
        if (specifier.startsWith('@/')) return load(`${specifier.slice(2)}.ts`)
        throw new Error(`Unapproved import ${specifier}`)
      },
    }, { filename: file })
    return module.exports
  }
  return { load, logs, posts, requests, context }
}

const r = runtime()
const { resolveMusicDirection: direction, musicEmotionPrompt } = r.load('lib/musicDirection.ts')
const fixtures = [
  ['The medieval city mourned. A mother buried her son and wept alone.', 'grief'],
  ['She was sad after the funeral.', 'grief'],
  ['The medieval city celebrated. They were reunited and happy.', 'celebration'],
  ['The medieval city hides an unsolved mystery.', 'tension'],
  ['The ancient city was peaceful and serene.', 'calm'],
  ['La ciudad medieval está de luto. La madre llora junto al entierro.', 'grief'],
  ['La ciudad medieval está feliz. Celebraron el reencuentro con alegría.', 'celebration'],
  ['La ciudad medieval guarda un misterio inquietante.', 'tension'],
  ['La ciudad está tranquila. Es un lugar de paz.', 'calm'],
  ['प्राचीन शहर में शोक है। माँ दुखी है।', 'grief'],
  ['प्राचीन शहर में खुशी और जश्न है।', 'celebration'],
  ['प्राचीन शहर का रहस्य और तनाव।', 'tension'],
  ['प्राचीन शहर में शांति है।', 'calm'],
  ['She is not sad. She is happy.', 'celebration'],
  ["She wasn't grieving; they celebrated.", 'celebration'],
  ['She is no longer sad, but joyful.', 'celebration'],
  ['No está triste, está feliz.', 'celebration'],
  ['Nunca estuvo triste. Celebraron la reunión.', 'celebration'],
  ['वह उदास नहीं है। वह खुश है।', 'celebration'],
  ['वह खुश नहीं है। वह दुखी है।', 'grief'],
  ['A happy memory during a funeral.', 'grief'],
  ['Not a mystery. A peaceful landscape.', 'calm'],
]
for (const [script, expected] of fixtures) check(`emotion: ${script}`, direction({ script }).emotion === expected)
for (const directive of ['Music: none', '[No music]', 'Music: no background music', 'Música: sin música', 'संगीत: बिना संगीत', '[संगीत नहीं]']) {
  const d = direction({ script: 'A sad funeral.', rawScript: `${directive}\nTone: happy` })
  check(`explicit mute: ${directive}`, d.enabled === false)
}
check('story dialogue does not mute score', direction({ script: 'He said "no music" and left.' }).enabled)
check('background noise is not music-off', direction({ script: 'A mystery.', rawScript: 'Music: no background noise' }).enabled)
check('author music overrides inferred script emotion', direction({ script: 'A funeral.', rawScript: 'Music: joyful' }).emotion === 'celebration')
check('unknown metadata does not invent mood', direction({ script: 'A mystery.', musicMood: 'SECRET_SCRIPT' }).emotion === 'tension')
check('structured music priority over tone', direction({ script: 'A mystery.', musicMood: 'sad', tone: 'happy' }).emotion === 'grief')
check('no grief substring in happy surnames', direction({ script: 'Joyce and Saddler discover a mystery.' }).emotion === 'tension')
check('legacy theme still available', direction({ script: 'Computers and software.' }).mood === 'tech')
check('new emotional branch reachable', direction({ script: 'She is sad.' }).mood === 'emotional')
check('new nature branch reachable', direction({ script: 'Peaceful landscape.' }).mood === 'nature')
check('no user text in generated direction', !musicEmotionPrompt(direction({ script: 'SECRET_SCRIPT sad' })).includes('SECRET_SCRIPT'))

// Real provider function with mocked fetch: inspect the actual POST payload.
for (const [script, required, forbidden] of [
  ['A funeral and grief.', 'Solemn restrained lament', 'Epic cinematic trailer'],
  ['They celebrated with joy.', 'Warm hopeful reunion', 'Dark cinematic underscore'],
  ['An unsolved mystery.', 'Subtle unresolved mystery', 'soaring brass'],
  ['Peaceful landscape.', 'Peaceful spacious ambient', 'thundering taiko'],
]) {
  const rt = runtime()
  const url = await rt.load('lib/musicScore.ts').selectMusicForScript({ script, seed: 'unchanged-film' })
  check('generated score selected', url === 'https://offline.invalid/music.mp3')
  check('exactly one paid POST', rt.posts.length === 1)
  check('real payload emotional direction', rt.posts[0].prompt.includes(required) && !rt.posts[0].prompt.includes(forbidden))
  check('instrumental and subordinate voice', rt.posts[0].prompt.includes('Instrumental only') && rt.posts[0].prompt.includes('beneath narration'))
  check('schema remains prompt only', Object.keys(rt.posts[0]).join(',') === 'prompt')
}
for (const script of ['Music: none\nA mystery.', 'Música: sin música\nUna historia triste.', 'संगीत: बिना संगीत\nशोक']) {
  const rt = runtime()
  check('mute returns null', await rt.load('lib/musicScore.ts').selectMusicForScript({ script }) === null)
  check('mute makes no provider call', rt.requests.length === 0)
}
for (const script of ['A sad funeral.', 'They celebrated with joy.']) {
  const rt = runtime({ fail: true })
  check('strict valence failure chooses silence', await rt.load('lib/musicScore.ts').selectMusicForScript({ script }) === null)
  check('failure never buys second score', rt.posts.length === 1)
  check('no uncurated search', rt.requests.every(x => !x.includes('openverse')))
}
const fallback = runtime({ fail: true })
const select = fallback.load('lib/musicScore.ts').selectMusicForScript
const first = await select({ script: 'An unsolved mystery.', seed: 'same-film' })
const clean = await select({ script: 'An unsolved mystery.', seed: 'same-film', allowGeneration: false })
check('fallback stays suspense', first?.includes('/suspense-'))
check('unlock same catalog score for same film', first === clean)
check('unlock no extra generated track', fallback.posts.length === 1)
check('explicit mood bypasses Openverse even with flag on', fallback.requests.every(x => !x.includes('openverse')))
for (const mood of ['suspense', 'epic', 'hustle', 'tech', 'emotional', 'nature']) {
  const rt = runtime()
  const url = await rt.load('lib/pixabayMusic.ts').getBackgroundMusicUrl('stable-seed', mood)
  check(`catalog stays in ${mood}`, url.includes(`/${mood}-`))
  check(`directed ${mood} makes no search request`, rt.requests.length === 0)
}
const thrown = runtime({ throw: true })
await thrown.load('lib/musicScore.ts').selectMusicForScript({ script: 'SECRET_SCRIPT sad' })
check('error logs never echo provider text', !thrown.logs.join(' ').includes('SECRET_SCRIPT') && !thrown.logs.join(' ').includes('signed-url-token'))

// Execute the music try-blocks from both ACTUAL Next route files. They must all
// derive direction from original narration, carry author directives, and call
// the shared selector. This does not execute auth, money, TTS or DB code.
function musicBlocks(relative) {
  const source = readFileSync(resolve(root, relative), 'utf8')
  const file = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const blocks = []
  function visit(node) {
    if (ts.isTryStatement(node)) {
      const statements = node.tryBlock.statements
      if (statements.some(s => ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression)
        && ['musicUrl', 'hollywoodMusicUrl'].includes(s.expression.left.getText(file)))) blocks.push(node.getText(file))
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return blocks
}
const callers = [
  ...musicBlocks('app/api/compose/route.ts').map(block => ({ block, unlock: false })),
  ...musicBlocks('app/api/compose/unlock/route.ts').map(block => ({ block, unlock: true })),
]
check('all three actual route callers covered', callers.length === 3)
for (const { block, unlock } of callers) {
  const rt = runtime({ fail: true })
  let selectedInput
  const shared = rt.load('lib/musicScore.ts').selectMusicForScript
  const run = vm.runInNewContext(`(async () => { let musicUrl = null; let hollywoodMusicUrl = null; ${ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText}; return musicUrl || hollywoodMusicUrl; })`, {
    voiceoverScript: 'An unsolved mystery.', scaledScript: 'An epic historical war.',
    rawVoiceover: 'An unsolved mystery.', body: { topic: 'Music: none' }, vertical: 'history',
    console: rt.context.console,
    selectMusicForScript: async input => { selectedInput = input; return shared(input) },
  })
  check('actual caller forwards explicit silence', await run() === null)
  check('actual caller uses original, not scaled narration', selectedInput?.script === 'An unsolved mystery.')
  check('actual caller retains author instruction', selectedInput?.rawScript.includes('Music: none'))
  check('actual caller silence makes no provider call', rt.requests.length === 0)
  check('unlock generation switch correct', unlock ? selectedInput.allowGeneration === false : selectedInput.allowGeneration === undefined)
  for (const [script, expected] of [['She is grieving.', 'grief'], ['They celebrated.', 'celebration'], ['A mystery.', 'tension']]) {
    const moods = []
    const runEmotion = vm.runInNewContext(`(async () => { let musicUrl = null; let hollywoodMusicUrl = null; ${ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText}; })`, {
      voiceoverScript: script, scaledScript: 'An unrelated epic historical war.', rawVoiceover: script,
      body: { topic: script }, vertical: 'history', console: rt.context.console,
      selectMusicForScript: async input => { moods.push(direction(input)); return null },
    })
    await runEmotion()
    check(`actual ${unlock ? 'unlock' : 'compose'} direction ${expected}`, moods.length === 1 && moods[0].emotion === expected)
  }
}

// ── MUSICA-R1 (2026-09-14) — PT/EN: tristeza, mistério, ação, instrução
// contrária e silêncio explícito, pelo MESMO seletor real. Ação não é
// categoria emocional do produto: a direção suportada é o clima 'epic'
// (Lyria "Epic cinematic trailer score"); nada novo é inventado aqui.
// 'facts' → suspense é o fallback documentado do produto (não é defeito):
// ação sem palavra de tema em EN/PT cai nele e isso é registrado, não travado.
const ptEmotion = [
  ['A cidade medieval está de luto. A mãe chorou sozinha no funeral do filho.', 'grief'],
  ['Ela ficou triste depois do enterro. Uma tristeza profunda.', 'grief'],
  ['Ele morreu. A família chorou no velório.', 'grief'],
  ['Ela não está triste. Ela está feliz.', 'celebration'],
  ['Nunca esteve triste. Celebraram o reencontro com alegria.', 'celebration'],
  ['A cidade guarda um mistério inquietante. Ninguém sabe o que aconteceu.', 'tension'],
  ['O navio desapareceu sem explicação.', 'tension'],
  ['Não é um mistério. Uma paisagem tranquila.', 'calm'],
  ['The soldiers stormed the fortress. A chase through the streets and the final rescue.', null],
  ['Os soldados invadiram a fortaleza. Uma perseguição pelas ruas e o resgate final.', null],
]
for (const [script, expected] of ptEmotion) {
  const d = direction({ script })
  check(`pt/en emotion: ${script}`, expected ? d.emotion === expected : (d.emotion === 'neutral' && d.source === 'theme'))
}
// Ação: tema de história em EN leva ao clima épico; a diretiva explícita 'epic'
// (e a grafia PT do MESMO clima) é a direção suportada para ação em qualquer língua.
check('en action with history theme is epic', direction({ script: 'The Roman legion stormed the fortress of the ancient empire. A chase, then the rescue.' }).mood === 'epic')
for (const raw of ['Music: epic', 'Música: épica', 'Música: épico']) {
  const d = direction({ script: 'Os soldados invadiram a fortaleza.', rawScript: `${raw}\nOs soldados invadiram a fortaleza.` })
  check(`action directive ${raw} is epic`, d.mood === 'epic' && d.source === 'directive' && d.emotion === 'neutral')
}
// Instrução explícita CONTRARIA a inferência, nas duas línguas.
check('pt author sad overrides action inference', direction({ script: 'Os soldados invadiram a fortaleza.', rawScript: 'Música: triste\nOs soldados invadiram a fortaleza.' }).emotion === 'grief')
check('en author epic overrides pt grief inference', direction({ script: 'A mãe chorou no funeral.', rawScript: 'Music: epic\nA mãe chorou no funeral.' }).mood === 'epic')
check('pt author joyful overrides mystery inference', direction({ script: 'Um mistério inquietante.', rawScript: 'Música: alegre\nUm mistério inquietante.' }).emotion === 'celebration')
check('en author sad overrides action inference', direction({ script: 'The soldiers stormed the fortress.', rawScript: 'Music: sad\nThe soldiers stormed the fortress.' }).emotion === 'grief')
// Silêncio explícito em PT: mesma regra de ES/HI.
for (const directive of ['Música: sem música', '[sem música]', 'Música: nenhuma', 'Trilha: nenhuma', 'Música: sem música de fundo']) {
  const d = direction({ script: 'A mãe chorou no funeral.', rawScript: `${directive}\nTone: feliz` })
  check(`pt explicit mute: ${directive}`, d.enabled === false)
}
// Controle da decisão 'mas' NÃO é fronteira: ES 'más' normaliza igual e a negação precisa sobreviver.
check('es "no está más triste" stays negated', direction({ script: 'No está más triste. Celebraron la reunión.' }).emotion === 'celebration')
check('pt "não está mais triste" is negated too', direction({ script: 'Não está mais triste. Celebraram o reencontro.' }).emotion === 'celebration')
check('pt story dialogue does not mute score', direction({ script: 'Ele disse "sem música" e saiu.' }).enabled)
check('pt background noise is not music-off', direction({ script: 'Um mistério.', rawScript: 'Música: sem ruído de fundo' }).enabled)
// Payload REAL (fetch mockado) para os casos PT/ação: direção certa, instrumental, sob a narração, sem texto do usuário.
for (const [input, required, forbidden] of [
  [{ script: 'Os soldados invadiram a fortaleza. SEGREDO_PT', rawScript: 'Música: épica\nOs soldados invadiram a fortaleza. SEGREDO_PT' }, 'Epic cinematic trailer score', 'Solemn restrained lament'],
  [{ script: 'A mãe chorou no velório. SEGREDO_PT' }, 'Solemn restrained lament', 'Epic cinematic trailer'],
  [{ script: 'Um mistério inquietante. SEGREDO_PT' }, 'Subtle unresolved mystery', 'soaring brass'],
]) {
  const rt = runtime()
  const url = await rt.load('lib/musicScore.ts').selectMusicForScript({ ...input, seed: 'pt-film' })
  check('pt generated score selected', url === 'https://offline.invalid/music.mp3')
  check('pt exactly one paid POST', rt.posts.length === 1)
  check(`pt real payload ${required}`, rt.posts[0].prompt.includes(required) && !rt.posts[0].prompt.includes(forbidden))
  check('pt instrumental and subordinate voice', rt.posts[0].prompt.includes('Instrumental only') && rt.posts[0].prompt.includes('beneath narration'))
  check('pt no user text in payload', !rt.posts[0].prompt.includes('SEGREDO_PT'))
}
for (const script of ['Música: sem música\nUm mistério.', 'Trilha: nenhuma\nA mãe chorou no funeral.']) {
  const rt = runtime()
  check('pt mute returns null', await rt.load('lib/musicScore.ts').selectMusicForScript({ script }) === null)
  check('pt mute makes no provider call', rt.requests.length === 0)
}
// Os três callers reais (compose clássico, compose hollywood, unlock) com entrada PT.
for (const { block, unlock } of callers) {
  const rt = runtime({ fail: true })
  let selectedInput
  const shared = rt.load('lib/musicScore.ts').selectMusicForScript
  const run = vm.runInNewContext(`(async () => { let musicUrl = null; let hollywoodMusicUrl = null; ${ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText}; return musicUrl || hollywoodMusicUrl; })`, {
    voiceoverScript: 'Um mistério inquietante.', scaledScript: 'Uma guerra épica.',
    rawVoiceover: 'Um mistério inquietante.', body: { topic: 'Música: sem música' }, vertical: 'history',
    console: rt.context.console,
    selectMusicForScript: async input => { selectedInput = input; return shared(input) },
  })
  check(`pt actual ${unlock ? 'unlock' : 'compose'} caller forwards explicit silence`, await run() === null)
  check('pt actual caller silence makes no provider call', rt.requests.length === 0)
  check('pt actual caller retains author instruction', selectedInput?.rawScript.includes('Música: sem música'))
  for (const [script, expected] of [['A mãe chorou no velório.', 'grief'], ['Celebraram o reencontro.', 'celebration'], ['Um mistério.', 'tension']]) {
    const moods = []
    const runEmotion = vm.runInNewContext(`(async () => { let musicUrl = null; let hollywoodMusicUrl = null; ${ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText}; })`, {
      voiceoverScript: script, scaledScript: 'Uma guerra épica sem relação.', rawVoiceover: script,
      body: { topic: script }, vertical: 'history', console: rt.context.console,
      selectMusicForScript: async input => { moods.push(direction(input)); return null },
    })
    await runEmotion()
    check(`pt actual ${unlock ? 'unlock' : 'compose'} direction ${expected}`, moods.length === 1 && moods[0].emotion === expected)
  }
}
for (const f of failures) console.log(`✗ ${f}`)
console.log(`music-direction: ${assertions - failures.length}/${assertions} passed; external calls=0; no files written`)
if (failures.length) process.exit(1)
