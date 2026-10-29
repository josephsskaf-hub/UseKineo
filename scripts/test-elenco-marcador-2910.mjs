// KINEO-ELENCO-MARCADOR-2910 — regressões executadas na fonte TypeScript real, sem rede, credenciais ou geração paga.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (path) => readFileSync(join(root, path), 'utf8')
const modules = {
  '@/lib/hollywood/router': { sanitizeRealPeople: (text) => text },
  '@/lib/cinematic/sceneStyle': { deriveExplicitCharacter: () => null },
  '@/lib/estrelaDoFilme': { ESTRELA_EDIT_SLUG: 'unused', buildEstrelaEditInput: () => { throw new Error('network forbidden') } },
  '@/lib/aiModels': { AI_TEXT_MODELS: { scenePlannerLight: 'unused' } },
}
function load(path, source = rd(path)) {
  const module = { exports: {} }
  const require = (name) => {
    if (!(name in modules)) {
      assert(name.startsWith('@/'), `unexpected import ${name}`)
      modules[name] = load(`${name.slice(2)}.ts`)
    }
    return modules[name]
  }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, require, process: { env: {} }, console, fetch: () => { throw new Error('network forbidden') } })
  return module.exports
}
const E = load('lib/cinematic/elencoEpoca.ts')
const F = load('lib/cinematic/folhaDePersonagem.ts')
const P = modules['@/lib/cinematic/pessoasDaNarracao']
let passed = 0
function test(name, run) { run(); passed++; console.log(`ok ${name}`) }
const plain = (value) => JSON.parse(JSON.stringify(value))
const FALAS = [
  'This robot had one day left to live… and one final gift to give.',
  'A tiny discarded robot collected broken toys, repairing them for lonely children.',
  "The robot shuts down... but the little girl's teddy bear suddenly lights up with the robot's tiny heart-shaped LED.",
]
const SCRIPT = `HOOK (0-2s): ${FALAS[0]}\nMICRO REWARD 2: ${FALAS[1]}\nEnding: [Pexels: Ending: teddy bear close-up] ${FALAS[2]}`
const PROMPTS = ['A tiny robot waiting beside a broken toy, animated film.', 'A robot repairing a toy at a workbench, animated film.', "Close-up of the little girl's teddy bear, a heart-shaped LED lights up, animated film."]
function apply({ falas = FALAS, prompts = PROMPTS, script = SCRIPT, filtro = script } = {}, lib = E) {
  return lib.aplicarElencoEEpoca({ prompts, falas, contextoOriginal: script, contextoFiltro: filtro, modo: 'character_story', tagFaceless: false })
}

test('caso nikolmishukov: menina só na fala final, junto do ursinho; rótulo nunca vira nome', () => {
  const r = apply()
  assert(!r.prompts.some((p) => /Named characters? in this shot: (?:Ending|Hook|Twist|Payoff)/i.test(p)))
  assert.match(r.prompts[2], /a little girl holding the glowing teddy bear/)
  assert.equal(r.prompts[1], PROMPTS[1])
  assert.equal(r.prompts[0], PROMPTS[0])
  assert.deepEqual(plain(r.relato.elenco.find((p) => p.nome === 'the little girl')?.cenas_inseridas), [3])
  assert(!r.relato.elenco.some((p) => p.nome === 'Ending'))
})
test('ficha contém o robô e a menina, sem rótulo e sem nova folha além do teto', () => {
  const fichas = F.elencoDeterministico(SCRIPT)
  assert(fichas.some((f) => f.nucleo === 'robot'))
  assert(fichas.some((f) => f.nucleo === 'girl' && f.tipo === 'humano' && f.genero === 'woman'))
  assert(!fichas.some((f) => /ending|hook|reward|payoff/i.test(f.nome)))
  assert(fichas.length <= F.PERSONAGEM_MAX_PERSONAGENS)
})
test('todos os rótulos, caixa, tempo e numeração; TWIST conserva nome real', () => {
  const labels = ['HOOK', 'MICRO REWARD', 'ESCALATION', 'RHYTHM', 'PAYOFF', 'ENDING', 'TWIST', 'SUPER FINAL', 'CTA', 'OUTRO', 'INTRO', 'SCENE 3', 'BEAT 2']
  for (const label of labels) for (const changed of [label, label.toLowerCase(), label.toLowerCase().replace(/^./, (x) => x.toUpperCase())]) {
    for (const marker of [`${changed}:`, `2. ${changed} (0-2s):`, `${changed} (0-2s)`, `${changed}\n`]) {
      const script = `${marker} Amna found a toy. Amna repaired it. [Pexels: ${marker} girl holding toy]`
      const names = E.personagensNomeados(script).map((p) => p.nome)
      assert(names.includes('Amna'), `${marker}: perdeu Amna (${names})`)
      assert.deepEqual(plain(names), ['Amna'])
      assert.deepEqual(plain(F.elencoDeterministico(script).map((p) => p.nome)), ['Amna'])
    }
  }
})
test('his daughter’s bike: cena do meio recebe a filha, demais byte a byte', () => {
  const falas = ['The mechanic opens the shop.', "His daughter’s bike rolls into the yard.", 'The shop closes at sunset.']
  const prompts = ['A closed shop.', 'A bicycle beside a fence.', 'Sunset over a quiet road.']
  const r = apply({ falas, prompts, script: falas.join(' ') })
  assert.match(r.prompts[1], /a daughter beside the bicycle/)
  assert.equal(r.prompts[0], prompts[0]); assert.equal(r.prompts[2], prompts[2])
})
test('the old man’s hat: descrição curta sem nome inventado', () => {
  const r = apply({ falas: ['Wind rises.', "The old man's hat blows away.", 'Silence returns.'], script: "Wind rises. The old man's hat blows away. Silence returns.", prompts: ['Trees sway.', 'A hat blows in the wind.', 'An empty road.'] })
  assert.match(r.prompts[1], /an elderly man with the hat/)
  assert(!r.prompts[1].includes('Named character'))
})
test('possessivos PT, ES, FR, IT, RO, DE, urdu e hindi: só a fala que cita a pessoa', () => {
  const cases = [
    ['O ursinho da menina acende.', 'girl'], ['La bicicleta de su hija brilla.', 'daughter'],
    ["L’ours en peluche de la petite fille brille.", 'girl'], ["L'orsacchiotto della bambina si illumina.", 'girl'],
    ['Ursulețul fetiței se aprinde.', 'girl'], ['Der Hut des alten Mannes leuchtet.', 'man'],
    ['چھوٹی لڑکی کے کھلونے روشن ہو گئے۔', 'girl'], ['छोटी लड़की की गुड़िया चमकती है।', 'girl'],
  ]
  for (const [fala, nucleo] of cases) {
    assert(P.pessoasPossessivas(fala).some((p) => p.nucleo === nucleo), fala)
    const prompts = ['A forest.', 'A bridge.', 'A toy.']
    const r = apply({ falas: ['Começa.', 'Continua.', fala], prompts, script: fala })
    assert.equal(r.prompts[0], prompts[0]); assert.equal(r.prompts[1], prompts[1])
    assert(r.relato.elenco.some((p) => p.nomeado === false && p.cenas_inseridas.join(',') === '3'), fala)
  }
})
test('tradução para inglês + fala árabe: personagem vai à última fala, nunca pela proporção do texto', () => {
  const falas = ['بدأ الروبوت العمل.', 'أصلح الألعاب.', 'دمية الفتاة تضيء.']
  const original = falas.join(' ')
  const filtro = `${original} The little girl's teddy bear lights up. ${'The robot waits. '.repeat(30)}`
  const r = apply({ falas, script: original, filtro, prompts: ['A robot.', 'A workbench.', 'A glowing teddy bear.'] })
  assert(!/girl/.test(r.prompts[0])); assert(!/girl/.test(r.prompts[1])); assert.match(r.prompts[2], /little girl/)
})
// KINEO-ELENCO-MARCADOR-2910 — mesmo papel já extraído da tradução, colocado somente pela fala original flexionada.
test('RU/UK/TR/NL/PL/ID/VI: tradução existente + aliases da fala colocam menina/filha na cena correta', () => {
  const cases = [
    ['Медвежонок маленькой девочки засиял.', 'girl'], ['Ведмедик маленької дівчинки засвітився.', 'girl'], ['Küçük kızın oyuncak ayısı parlıyor.', 'girl'], ['De teddybeer van het kleine meisje licht op.', 'girl'], ['Miś małej dziewczynki zaświecił.', 'girl'], ['Boneka beruang gadis kecil itu menyala.', 'girl'], ['Gấu bông của cô bé sáng lên.', 'girl'],
    ['Le vélo de sa fille brille.', 'daughter'], ['Велосипед его дочери блестит.', 'daughter'], ['Велосипед його доньки блищить.', 'daughter'], ['Kızının bisikleti parlıyor.', 'daughter'], ['De fiets van zijn dochter glanst.', 'daughter'], ['Rower jego córki lśni.', 'daughter'], ['Sepeda putrinya bersinar.', 'daughter'], ['Xe đạp của con gái anh ấy tỏa sáng.', 'daughter'],
  ]
  for (const [fala, nucleo] of cases) {
    const prompts = ['A robot.', 'An object.', 'An empty room.']
    const filtro = nucleo === 'girl' ? "The little girl's teddy bear lights up." : "His daughter's bike shines."
    const r = apply({ falas: ['The robot waits.', fala, 'The room is quiet.'], prompts, script: fala, filtro })
    assert.equal(r.prompts[0], prompts[0]); assert.equal(r.prompts[2], prompts[2]); assert(P.falaCitaPessoa(fala, nucleo), fala)
    assert(r.relato.elenco.some(p => p.nomeado === false && p.cenas_inseridas.join(',') === '2'), fala)
  }
})
test('estrada clássica com cinco cenas: última fala permanece última cena', () => {
  const falas = [FALAS[0], FALAS[1], 'The toys are repaired.', 'The robot grows tired.', FALAS[2]]
  const prompts = ['A robot.', 'A robot at work.', 'A repaired toy.', 'A quiet room.', 'A glowing teddy bear.']
  const r = apply({ falas, prompts })
  for (let i = 0; i < 4; i++) assert.equal(r.prompts[i], prompts[i])
  assert.match(r.prompts[4], /a little girl holding the glowing teddy bear/)
})
test('nunca insere possessivo sem uma fala que mencione a pessoa', () => {
  const r = apply({ falas: ['The robot waits.', 'The robot works.', 'The toy glows.'] })
  assert.deepEqual(plain(r.prompts), PROMPTS)
})
test('idempotência, entradas imutáveis e ausência de pessoa = byte a byte', () => {
  const first = apply()
  assert.deepEqual(plain(apply({ prompts: first.prompts }).prompts), plain(first.prompts))
  assert.equal(PROMPTS[1], 'A robot repairing a toy at a workbench, animated film.')
  const falas = ['The storm gathers.', 'Waves strike the rocks.', 'The sun returns.']
  const prompts = ['Rain  over a bay.\n', 'A wave strikes rocks.', 'Sunrise.  ']
  assert.deepEqual(plain(apply({ falas, prompts, script: falas.join(' ') }).prompts), prompts)
  assert.deepEqual(plain(F.elencoDeterministico(falas.join(' '))), [])
})
test('mutante: desligar pessoa possessiva reproduz a menina ausente', () => {
  const src = rd('lib/cinematic/elencoEpoca.ts').replace('for (const pessoa of pessoasPossessivas(texto))', 'for (const pessoa of [])')
  const mutant = load('lib/cinematic/elencoEpoca.ts', src)
  const r = apply({}, mutant)
  assert(!r.prompts[2].includes('a little girl holding the glowing teddy bear'))
})
console.log(`${passed} testes de elenco/marcador passaram; rede bloqueada.`)
