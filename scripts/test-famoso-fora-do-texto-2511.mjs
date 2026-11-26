// KINEO-FAMOSO-FORA-DO-TEXTO-2511 — guardião da parte (b) do famoso (CEO 25/11): o nome de uma figura ATUAL da lista (CONTEMPORARY_FIGURE_RE) sai do texto
// que vai ao motor do filme grátis: os planos do Kling 4 (buildKling4TrialInput com timing) e o nome do cabeçalho do Gemini (nome2511 na rota).
// Prova, executando o código REAL:
//   A. a limpeza: nome composto em qualquer caixa, palavra solta só com maiúscula, título colado sai junto, possessivo fica; texto sem nome = idêntico;
//   B. o envio do grátis: nos 4 montadores (t2v, i2v, referência única, personagem fixo) nenhum nome da lista sobra, todo plano fica em 512, e sem nome da
//      lista o envio é o de ANTES (o arquivo com o bloco novo tirado), byte a byte; o filme pago (sem timing) é o de antes mesmo com o nome;
//   C. o cabeçalho do Gemini: a linha nome2511 da rota, executada, limpa o nome; o texto dos planos do Gemini nasce do envio já limpo;
//   D. mutantes, contados só por AssertionError.
// Rodar: node scripts/test-famoso-fora-do-texto-2511.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LISTA = 'lib/hollywood/realPeople.ts', ENVIO = 'lib/kling4Trial.ts', GEMINI = 'lib/cinematic/geminiNaEsteira2511.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const BLOCO_ENVIO = '  if (timing) for (const plano of envio.input.multi_prompt as Array<{ prompt: string }>) { const limpo = semFamosoNoTextoDoMotor2511(plano.prompt); if (limpo !== plano.prompt) plano.prompt = cabeNoTetoDoPlano(limpo) }\n'
const ANTES = (rel, t) => {
  if (rel !== ENVIO) return t
  assert.equal(t.split(BLOCO_ENVIO).length, 2, 'o bloco novo está no envio (âncora)')
  return t.replace(BLOCO_ENVIO, '')
}
const mundo = (muda = (_r, t) => t) => {
  const load = createOfflineLoader({ source: (rel, t) => muda(rel, t.replaceAll('\r\n', '\n')), globals: { AbortSignal } })
  return { lista: load('@/' + LISTA), envio: load('@/' + ENVIO), gemini: load('@/' + GEMINI) }
}
const linhaDaRota = (src) => {
  const l = src.split('\n').find((x) => x.includes('const nome2511 = (n: string | null | undefined) =>'))
  assert.ok(l, 'a linha nome2511 está na rota (âncora)')
  const js = ts.transpileModule(l, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return (papel2511, limpa) => new Function('papel2511', 'semFamosoNoTextoDoMotor2511', js + '\nreturn nome2511')(papel2511, limpa)
}
const naLista = (lista, texto) => { // o que a limpeza considera nome: composto em qualquer caixa, solto com maiúscula
  const re = new RegExp(lista.CONTEMPORARY_FIGURE_RE.source, 'gi')
  return [...texto.matchAll(re)].map((m) => m[0]).filter((n) => /\s|\d/u.test(n) || /^\p{Lu}/u.test(n))
}
const cp = (s) => Array.from(s).length

function prova(w, srcRota) {
  const { lista, envio, gemini } = w
  const L = lista.semFamosoNoTextoDoMotor2511
  // ── A. a limpeza ──
  for (const [de, para] of [
    ['Elon Musk walks on Mars, Musk\'s helmet glints.', 'a person walks on Mars, a person\'s helmet glints.'],
    ['President Trump waves. Taylor Swift sings.', 'a person waves. A person sings.'],
    ['elon musk smiles', 'a person smiles'],
    ['Mr. Bezos counts coins', 'a person counts coins'],
    ['Scene 1: use the start image. Messi kicks.', 'Scene 1: use the start image. A person kicks.'],
    ['LeBron James dunks; Cristiano Ronaldo cheers.', 'a person dunks; a person cheers.'],
  ]) assert.equal(L(de), para, 'A limpa: ' + de)
  for (const t of ['A musk ox and a drake by the lake; a trump card.', 'the gates of Babylon', 'Arno keeps the lighthouse.', 'Captain Rosa radios the tower.', 'Napoleon at Waterloo', '']) assert.equal(L(t), t, 'A idêntico: ' + t)
  assert.equal(L(undefined), '', 'A sem texto')
  for (const t of ['Taylor Swift and Drake dance with Oprah.', 'President Obama meets Messi.']) { const r = L(t); assert.deepEqual(naLista(lista, r), [], 'A nada sobra: ' + r); assert.equal(L(r), r, 'A idempotente') }

  // ── B. o envio do grátis ──
  const antes = mundo(ANTES).envio
  const FOTO = 'https://example.org/offline/k.png', FOLHA = 'https://example.org/offline/folha.png'
  const vozes = ['one two three four', 'five six seven eight', 'nine ten eleven twelve']
  const CAUDA = ' Mouth closed, no speaking.'
  let longo = 'Musk, Musk and Musk walk the wet harbor at night.' // "Musk" (4) vira "a person" (8): o plano CRESCE e passaria de 512 sem o teto
  while (cp(longo + ' Rain.' + CAUDA) <= 512) longo += ' Rain.'
  assert.ok(cp(longo + CAUDA) > 500, 'o caso longo encosta no teto')
  const COM = ['Elon Musk walks across a red desert at dawn.', 'Close on Musk\'s helmet visor as Arno watches. Mouth closed, no speaking.', longo + CAUDA]
  const SEM = ['Arno walks across a red desert at dawn.', 'A musk ox grazes near the base; a drake on the pond.', 'Arno looks at the harbor. Mouth closed, no speaking.']
  const timing = { voiceovers: vozes, wordsPerSecond: 2.5 }
  const montadores = [
    ['t2v', [], timing],
    ['i2v', [FOTO, FOTO, null], timing],
    ['referência única', [], { ...timing, referenciaUnica: { imageUrl: FOLHA, frase: 'the man from the reference', nomes: ['Arno'] } }],
    ['personagem fixo', [], { ...timing, fixedCharacter: { imageUrl: FOLHA, continuity: 'Same face and outfit as the reference.' } }],
  ]
  for (const [qual, stills, tm] of montadores) {
    const agora = envio.buildKling4TrialInput(COM, stills, tm)
    for (const p of agora.input.multi_prompt) { assert.deepEqual(naLista(lista, p.prompt), [], `B ${qual}: nada da lista no plano: ${p.prompt}`); assert.ok(cp(p.prompt) <= 512, `B ${qual}: plano em 512 (${cp(p.prompt)})`) }
    const de = antes.buildKling4TrialInput(COM, stills, tm)
    assert.equal(JSON.stringify({ ...agora, input: { ...agora.input, multi_prompt: null } }), JSON.stringify({ ...de, input: { ...de.input, multi_prompt: null } }), `B ${qual}: só o texto dos planos muda`)
    assert.ok(agora.input.multi_prompt.some((p, i) => p.prompt !== de.input.multi_prompt[i].prompt), `B ${qual}: o nome existia antes (o caso é real)`)
    assert.equal(JSON.stringify(envio.buildKling4TrialInput(SEM, stills, tm)), JSON.stringify(antes.buildKling4TrialInput(SEM, stills, tm)), `B ${qual}: sem nome da lista = o de antes, byte a byte`)
  }
  const pago = envio.buildKling4TrialInput(COM, [])
  assert.equal(JSON.stringify(pago), JSON.stringify(antes.buildKling4TrialInput(COM, [])), 'B o filme pago (sem timing) é o de antes')
  assert.ok(pago.input.multi_prompt[0].prompt.includes('Elon Musk'), 'B o pago ainda leva o nome (fora desta obra)')
  const comPapel = envio.buildKling4TrialInput(['Mario jumps while Drake watches.', SEM[1], SEM[2]], [], { ...timing, papelVisual2411: (p) => p.replace('Mario', 'the plumber') })
  assert.equal(comPapel.input.multi_prompt[0].prompt, 'the plumber jumps while a person watches.', 'B o papel da obra e o famoso, os dois')
  const cauda = envio.buildKling4TrialInput(COM, [], timing).input.multi_prompt[2].prompt
  assert.ok(cauda.endsWith(' Mouth closed, no speaking.'), 'B a cauda da boca fica inteira depois da troca')

  // ── C. o Gemini ──
  const nome2511 = linhaDaRota(srcRota)
  assert.equal(nome2511(null, L)('Taylor Swift'), 'a person', 'C o cabeçalho sem papel')
  assert.equal(nome2511((n) => n.replace('Mario', 'the plumber'), L)('Mario'), 'the plumber', 'C o papel da obra continua')
  assert.equal(nome2511(null, L)('Arno'), 'Arno', 'C nome comum fica')
  assert.equal(nome2511(null, L)(null), null, 'C sem nome')
  const wire = envio.buildKling4TrialInput(['Elon Musk and Arno walk across a red desert at dawn.', 'Arno looks at Musk. Mouth closed, no speaking.', 'Arno waves at the camera. Mouth closed, no speaking.'], [],
    { voiceovers: ['one two three four five', 'six seven eight nine ten', 'eleven twelve thirteen fourteen fifteen'], wordsPerSecond: 1, referenciaUnica: { imageUrl: FOLHA, frase: 'the man from the reference', nomes: ['Arno'] } })
  assert.equal(wire.model, envio.KLING4_REFERENCE_MODEL, 'C o caso vai pela referência (o único caminho do Gemini)')
  const g = gemini.geminiDoKling4(wire.input, [nome2511(null, L)('Elon Musk')])
  assert.ok(g, 'C o Gemini monta a entrada')
  assert.deepEqual(naLista(lista, g.prompt), [], 'C o texto inteiro do Gemini sem nome da lista')
  assert.ok(g.prompt.includes('<IMAGE_REF_0> is a person,'), 'C o cabeçalho lê "is a person"')
  assert.ok(local(ROTA).includes("import { semFamosoNoTextoDoMotor2511 } from '@/lib/hollywood/realPeople'"), 'C a rota importa a limpeza')
}

prova(mundo(), local(ROTA))
console.log('ok  A/B/C no código de agora')

// ── D. mutantes (só AssertionError conta) ──
const MUTANTES = [
  [ENVIO, BLOCO_ENVIO, BLOCO_ENVIO.replace('if (timing) for', 'if (false) for'), 'o envio não limpa'],
  [ENVIO, BLOCO_ENVIO, BLOCO_ENVIO.replace('if (timing) for', 'if (true) for'), 'o filme pago também muda'],
  [ENVIO, 'plano.prompt = cabeNoTetoDoPlano(limpo) }', 'plano.prompt = limpo }', 'sem o teto de 512'],
  [LISTA, "    if (!/\\s|\\d/u.test(nome) && !/^\\p{Lu}/u.test(nome)) continue // palavra solta em minúscula = palavra comum\n", '', 'palavra solta em minúscula vira nome'],
  [LISTA, '    if (titulo) ini -= titulo[0].length\n', '', 'o título colado fica'],
  [LISTA, "  const re = new RegExp(CONTEMPORARY_FIGURE_RE.source, 'gi')\n  let saida", "  const re = new RegExp(CONTEMPORARY_FIGURE_RE.source, 'g')\n  let saida", 'sem caixa'],
  [LISTA, "    const comeca = /(?:[.!?]\\s+|\\n\\s*)$/u.test(antes)", '    const comeca = true', 'maiúscula sempre'],
  [ROTA, "return p && typeof semFamosoNoTextoDoMotor2511 === 'function' ? semFamosoNoTextoDoMotor2511(p) : p }", 'return p }', 'o cabeçalho não limpa'],
]
let mortos = 0
for (const [arq, de, para, nome] of MUTANTES) {
  const n = local(arq).split(de).length - 1
  assert.equal(n, 1, `mutante "${nome}": âncora achada ${n} vezes`)
  const muda = (rel, t) => (rel === arq ? t.replace(de, () => para) : t)
  try {
    prova(mundo(muda), arq === ROTA ? local(ROTA).replace(de, () => para) : local(ROTA))
    assert.fail(`MUTANTE VIVO: ${nome}`)
  } catch (e) {
    if (String(e?.message ?? '').startsWith('MUTANTE VIVO')) throw e
    if (e?.code !== 'ERR_ASSERTION') throw new Error(`mutante "${nome}" morreu sem AssertionError: ${e?.message}`)
    mortos++
  }
}
console.log(`ok  ${mortos}/${MUTANTES.length} mutantes mortos por AssertionError`)
console.log('PASS KINEO-FAMOSO-FORA-DO-TEXTO-2511')
