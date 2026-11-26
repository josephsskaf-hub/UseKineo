// KINEO-FAMOSO-FORA-DO-TEXTO-2511 — guardião da parte (b) do famoso (CEO 25/11; volta da revisora 392f0a52: D1–D4): o nome de uma figura ATUAL da lista
// (CONTEMPORARY_FIGURE_RE) sai do texto que vai ao motor do filme grátis: os planos do Kling 4 (buildKling4TrialInput com timing) e o nome do cabeçalho do
// Gemini (nome2511 na rota). Prova, executando o código REAL:
//   A. a limpeza: nome composto em qualquer caixa, palavra solta só com maiúscula, título colado sai junto, possessivo fica; texto sem nome = idêntico;
//      D2 inicial e nome do meio ("Donald J. Trump", "E. Musk", "Lionel Andrés Messi") e o hífen ("Obama-era"); D3 o inventado com aposto fica, a não ser
//      que o filme cite o composto; D4 duas pessoas = rótulos distintos, na ordem das referências;
//   B. o envio do grátis: nos 4 montadores nenhum nome da lista sobra, todo plano fica em 512, e sem nome da lista o envio é o de ANTES (o arquivo com o
//      bloco novo tirado), byte a byte; o filme pago (sem timing) é o de antes; D1 o plano no teto com a proteção "no readable text…" a mantém inteira;
//   C. o cabeçalho do Gemini: as linhas do nome2511 da rota, executadas: limpa o nome; dois famosos = "the first person" e "the second person", como nos planos;
//   D. mutantes, contados só por AssertionError.
// Rodar: node scripts/test-famoso-fora-do-texto-2511.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LISTA = 'lib/hollywood/realPeople.ts', ENVIO = 'lib/kling4Trial.ts', GEMINI = 'lib/cinematic/geminiNaEsteira2511.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const BLOCO_ENVIO = '  if (timing) {\n' +
  "    const contexto = [...prompts, ...timing.voiceovers].join('\\n'), ordem = [timing.referenciaUnica?.nomes?.[0], timing.referenciaUnica?.segundo?.nomes?.[0]]\n" +
  '    for (const plano of envio.input.multi_prompt as Array<{ prompt: string }>) { const limpo = semFamosoNoTextoDoMotor2511(plano.prompt, { contexto, ordem }); if (limpo !== plano.prompt) plano.prompt = cabeComProtecao2611(limpo) }\n' +
  '  }\n'
const ANTES = (rel, t) => {
  if (rel !== ENVIO) return t
  assert.equal(t.split(BLOCO_ENVIO).length, 2, 'o bloco novo está no envio (âncora)')
  return t.replace(BLOCO_ENVIO, '')
}
const mundo = (muda = (_r, t) => t) => {
  const load = createOfflineLoader({ source: (rel, t) => muda(rel, t.replaceAll('\r\n', '\n')), globals: { AbortSignal } })
  return { lista: load('@/' + LISTA), envio: load('@/' + ENVIO), gemini: load('@/' + GEMINI) }
}
const linhasDaRota = (src) => {
  const ls = src.split('\n'), i = ls.findIndex((x) => x.startsWith('      const papelDoNome2511 = '))
  assert.ok(i > 0 && ls[i + 1].startsWith('      const refs2511 = ') && ls[i + 2].startsWith('      const nome2511 = '), 'as linhas do nome2511 estão na rota (âncora)')
  const js = ts.transpileModule(ls.slice(i, i + 3).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return (papel2511, ru, limpa) => new Function('papel2511', 'ru', 'semFamosoNoTextoDoMotor2511', js + '\nreturn nome2511')(papel2511, ru, limpa)
}
const naLista = (lista, texto) => { // o que a limpeza considera nome: composto em qualquer caixa, solto com maiúscula
  const re = new RegExp(lista.CONTEMPORARY_FIGURE_RE.source, 'gi')
  return [...texto.matchAll(re)].map((m) => m[0]).filter((n) => /\s|\d/u.test(n) || /^\p{Lu}/u.test(n))
}
const cp = (s) => Array.from(s).length
const PROTECAO = ', photorealistic, ultra-detailed, no readable text, letters, numbers, labels or signage', CAUDA = ' Mouth closed, no speaking.'

function prova(w, srcRota) {
  const { lista, envio, gemini } = w
  const L = lista.semFamosoNoTextoDoMotor2511
  // ── A. a limpeza ──
  for (const [de, para, opcoes] of [
    ["Elon Musk walks on Mars, Musk's helmet glints.", "a person walks on Mars, a person's helmet glints."],
    ['President Trump waves. Taylor Swift sings.', 'the first person waves. The second person sings.'],
    ['elon musk smiles', 'a person smiles'],
    ['Mr. Bezos counts coins', 'a person counts coins'],
    ['Scene 1: use the start image. Messi kicks.', 'Scene 1: use the start image. A person kicks.'],
    // D2
    ['Donald J. Trump waves.', 'a person waves.'], ['E. Musk smiles.', 'a person smiles.'], ['Lionel Andrés Messi kicks.', 'a person kicks.'],
    ['an Obama-era law and a Musk-style rocket', 'an era law and a style rocket'], ['Yesterday Musk said no.', 'Yesterday a person said no.'],
    // D3
    ['Musk, the founder, waves.', 'a person, the founder, waves.', { contexto: 'Elon Musk walks.\nMusk, the founder, waves.' }],
    // D4
    ['Elon Musk and Taylor Swift argue.', 'the second person and the first person argue.', { ordem: ['Taylor Swift', 'Elon Musk'] }],
  ]) assert.equal(L(de, opcoes), para, 'A limpa: ' + de)
  for (const t of ['A musk ox and a drake by the lake; a trump card.', 'the gates of Babylon', 'Arno keeps the lighthouse.', 'Captain Rosa radios the tower.', 'Napoleon at Waterloo', '',
    'Adele, a young baker, smiles.', 'Lula, the old cat, sleeps.', 'Drake the duck swims.', 'Elon the robot beeps.', 'Ronaldo the fisherman waves.']) assert.equal(L(t), t, 'A idêntico: ' + t)
  assert.equal(L(undefined), '', 'A sem texto')
  for (const t of ['Taylor Swift and Drake dance with Oprah.', 'President Obama meets Messi.']) { const r = L(t); igual(naLista(lista, r), [], 'A nada sobra: ' + r); assert.equal(L(r), r, 'A idempotente') }

  // ── B. o envio do grátis ──
  const antes = mundo(ANTES).envio
  const FOTO = 'https://example.org/offline/k.png', FOLHA = 'https://example.org/offline/folha.png'
  const vozes = ['one two three four', 'five six seven eight', 'nine ten eleven twelve']
  let longo = 'Musk, Musk and Musk walk the wet harbor at night.' // "Musk" (4) vira "a person" (8): o plano CRESCE e passaria de 512 sem o teto
  while (cp(longo + ' Rain.' + CAUDA) <= 512) longo += ' Rain.'
  assert.ok(cp(longo + CAUDA) > 500, 'o caso longo encosta no teto')
  const COM = ['Elon Musk walks across a red desert at dawn.', "Close on Musk's helmet visor as Arno watches. Mouth closed, no speaking.", longo + CAUDA]
  const SEM = ['Arno walks across a red desert at dawn.', 'A musk ox grazes near the base; a drake on the pond.', 'Arno looks at the harbor. Mouth closed, no speaking.']
  const timing = { voiceovers: vozes, wordsPerSecond: 2.5 }
  const REF = { imageUrl: FOLHA, frase: 'Keep the face and outfit of @Image1.', nomes: ['Arno'] }
  const montadores = [
    ['t2v', [], timing],
    ['i2v', [FOTO, FOTO, null], timing],
    ['referência única', [], { ...timing, referenciaUnica: REF }],
    ['personagem fixo', [], { ...timing, fixedCharacter: { imageUrl: FOLHA, continuity: 'Same face and outfit as the reference.' } }],
  ]
  for (const [qual, stills, tm] of montadores) {
    const agora = envio.buildKling4TrialInput(COM, stills, tm)
    for (const p of agora.input.multi_prompt) { igual(naLista(lista, p.prompt), [], `B ${qual}: nada da lista no plano: ${p.prompt}`); assert.ok(cp(p.prompt) <= 512, `B ${qual}: plano em 512 (${cp(p.prompt)})`) }
    const de = antes.buildKling4TrialInput(COM, stills, tm)
    assert.equal(JSON.stringify({ ...agora, input: { ...agora.input, multi_prompt: null } }), JSON.stringify({ ...de, input: { ...de.input, multi_prompt: null } }), `B ${qual}: só o texto dos planos muda`)
    assert.ok(agora.input.multi_prompt.some((p, i) => p.prompt !== de.input.multi_prompt[i].prompt), `B ${qual}: o nome existia antes (o caso é real)`)
    assert.equal(JSON.stringify(envio.buildKling4TrialInput(SEM, stills, tm)), JSON.stringify(antes.buildKling4TrialInput(SEM, stills, tm)), `B ${qual}: sem nome da lista = o de antes, byte a byte`)
    // D1: o plano no teto COM a proteção, de 1 a 5 "Musk": a proteção, a frase do @Image e a cauda ficam inteiras
    for (const k of [1, 2, 3, 5]) {
      let corpo = Array(k).fill('Musk').join(' and ') + ' and Arno walk the wet harbor at night.'
      const planos = (c) => [SEM[0], SEM[1], c + PROTECAO + '.' + CAUDA]
      while (cp(antes.buildKling4TrialInput(planos(corpo + ' Rain falls.'), stills, tm).input.multi_prompt[2].prompt) <= 512 && antes.buildKling4TrialInput(planos(corpo + ' Rain falls.'), stills, tm).input.multi_prompt[2].prompt.includes('no readable text, letters, numbers, labels or signage')) corpo += ' Rain falls.' // a proteção INTEIRA (o montador do personagem fixo já a decapita sozinho perto do teto: defeito de antes, fora desta obra)
      const velho = antes.buildKling4TrialInput(planos(corpo), stills, tm).input.multi_prompt[2].prompt, novo = envio.buildKling4TrialInput(planos(corpo), stills, tm).input.multi_prompt[2].prompt
      assert.ok(cp(velho) >= 490 && velho.includes('no readable text, letters, numbers, labels or signage'), `D1 ${qual} k=${k}: o caso encosta no teto com a proteção (${cp(velho)})`)
      assert.ok(cp(novo) <= 512, `D1 ${qual} k=${k}: em 512 (${cp(novo)})`)
      assert.ok(novo.includes('no readable text, letters, numbers, labels or signage'), `D1 ${qual} k=${k}: a proteção fica: …${novo.slice(-160)}`)
      assert.equal(novo.endsWith(CAUDA), velho.endsWith(CAUDA), `D1 ${qual} k=${k}: a cauda da boca como antes`)
      assert.equal(novo.includes('@Image1'), velho.includes('@Image1'), `D1 ${qual} k=${k}: o @Image1 como antes`)
      igual(naLista(lista, novo), [], `D1 ${qual} k=${k}: nada da lista`)
    }
  }
  const pago = envio.buildKling4TrialInput(COM, [])
  assert.equal(JSON.stringify(pago), JSON.stringify(antes.buildKling4TrialInput(COM, [])), 'B o filme pago (sem timing) é o de antes')
  assert.ok(pago.input.multi_prompt[0].prompt.includes('Elon Musk'), 'B o pago ainda leva o nome (fora desta obra)')
  const comPapel = envio.buildKling4TrialInput(['Mario jumps while Drake watches.', SEM[1], SEM[2]], [], { ...timing, papelVisual2411: (p) => p.replace('Mario', 'the plumber') })
  assert.equal(comPapel.input.multi_prompt[0].prompt, 'the plumber jumps while a person watches.', 'B o papel da obra e o famoso, os dois')
  const cauda = envio.buildKling4TrialInput(COM, [], timing).input.multi_prompt[2].prompt
  assert.ok(cauda.endsWith(CAUDA), 'B a cauda da boca fica inteira depois da troca')
  // D1b [392f0a52]: a frase de ação longa e SEM vírgula num plano de 511/512 (o corte por frase/oração esvaziava o corpo: 113 cp, sem @Image1 nem "Setting:")
  for (const cab of ['Keep the face and outfit of @Image1. Setting: a launch pad at dusk with floodlights. ', 'Setting: a launch pad at dusk. ']) {
    let plano = cab + 'Musk walks slowly across the crowded launch pad toward the giant silver rocket while the engineers in white suits watch him'
    while (cp(plano + ' and the crowd near the fence' + PROTECAO + '.' + CAUDA) <= 512) plano += ' and the crowd'
    plano += ' near the fence' + PROTECAO + '.' + CAUDA
    while (cp(plano) < 511) plano = plano.replace(' near the fence', ' a near the fence')
    assert.ok(cp(plano) >= 511 && cp(plano) <= 512, 'D1b o caso no teto (' + cp(plano) + ')')
    const r = envio.cabeComProtecao2611(L(plano))
    assert.ok(cp(r) <= 512 && cp(r) >= 400, `D1b o plano não cai (${cp(r)} cp)`)
    for (const parte of [...(cab.includes('@Image1') ? ['@Image1'] : []), 'Setting:', 'walks slowly across', 'no readable text, letters, numbers, labels or signage']) assert.ok(r.includes(parte), 'D1b fica: ' + parte)
    assert.ok(r.endsWith(CAUDA), 'D1b a cauda inteira')
  }
  assert.ok(envio.cabeComProtecao2611('Setting: a dock. ' + 'A man walks the dock '.repeat(30).trim() + ' no readable text, letters, numbers, labels or signage.' + CAUDA).match(/\. no readable text/u), 'D1b sem vírgula antes da proteção, a ação fecha com "."')
  // D3 no envio: o composto num plano faz o sobrenome com aposto de outro plano trocar; sem o composto no filme, o inventado fica
  const d3 = envio.buildKling4TrialInput(['Elon Musk walks across the desert.', 'Musk, the founder, waves at Arno.', SEM[2]], [], timing).input.multi_prompt
  assert.equal(d3[1].prompt, 'a person, the founder, waves at Arno.', 'D3 o contexto do filme inteiro: o composto do plano 1 vale no plano 2')
  assert.equal(envio.buildKling4TrialInput(['Drake the duck swims in the pond.', SEM[1], SEM[2]], [], timing).input.multi_prompt[0].prompt, 'Drake the duck swims in the pond.', 'D3 o inventado fica no envio')
  // D4 no envio: duas pessoas da lista = rótulos distintos, na ordem das referências
  const d4 = envio.buildKling4TrialInput(['Elon Musk and Taylor Swift argue on a stage.', SEM[1], SEM[2]], [], { ...timing, referenciaUnica: { ...REF, nomes: ['Taylor Swift'], segundo: { imageUrl: FOTO, frase: 'Keep the face of @Image2.', nomes: ['Elon Musk'] } } }).input.multi_prompt
  assert.ok(d4[0].prompt.startsWith('the second person and the first person argue'), 'D4 a ordem das referências: ' + d4[0].prompt)

  // ── C. o Gemini ──
  const nome2511 = (papel, ru) => linhasDaRota(srcRota)(papel, ru, L)
  const RU1 = { nomes: ['Elon Musk'] }
  assert.equal(nome2511(null, RU1)('Elon Musk'), 'a person', 'C o cabeçalho sem papel')
  assert.equal(nome2511((n) => n.replace('Mario', 'the plumber'), { nomes: ['Mario'] })('Mario'), 'the plumber', 'C o papel da obra continua')
  assert.equal(nome2511(null, { nomes: ['Arno'] })('Arno'), 'Arno', 'C nome comum fica')
  assert.equal(nome2511(null, RU1)(null), null, 'C sem nome')
  const RU2 = { nomes: ['Taylor Swift'], segundo: { nomes: ['Elon Musk'] } }
  assert.equal(nome2511(null, RU2)('Taylor Swift'), 'the first person', 'C D4 o 1º famoso do cabeçalho')
  assert.equal(nome2511(null, RU2)('Elon Musk'), 'the second person', 'C D4 o 2º famoso do cabeçalho (a mesma ordem dos planos)')
  const wire = envio.buildKling4TrialInput(['Elon Musk and Arno walk across a red desert at dawn.', 'Arno looks at Musk. Mouth closed, no speaking.', 'Arno waves at the camera. Mouth closed, no speaking.'], [],
    { voiceovers: ['one two three four five', 'six seven eight nine ten', 'eleven twelve thirteen fourteen fifteen'], wordsPerSecond: 1, referenciaUnica: { imageUrl: FOLHA, frase: 'the man from the reference', nomes: ['Arno'] } })
  assert.equal(wire.model, envio.KLING4_REFERENCE_MODEL, 'C o caso vai pela referência (o único caminho do Gemini)')
  const g = gemini.geminiDoKling4(wire.input, [nome2511(null, RU1)('Elon Musk')])
  assert.ok(g, 'C o Gemini monta a entrada')
  igual(naLista(lista, g.prompt), [], 'C o texto inteiro do Gemini sem nome da lista')
  assert.ok(g.prompt.includes('<IMAGE_REF_0> is a person,'), 'C o cabeçalho lê "is a person"')
  assert.ok(local(ROTA).includes("import { semFamosoNoTextoDoMotor2511 } from '@/lib/hollywood/realPeople'"), 'C a rota importa a limpeza')
}

prova(mundo(), local(ROTA))
console.log('ok  A/B/C/D1–D4 no código de agora')

// ── D. mutantes (só AssertionError conta) ──
const MUTANTES = [
  [ENVIO, '  if (timing) {\n    const contexto', '  if (false) {\n    const contexto', 'o envio não limpa'],
  [ENVIO, "    const contexto = [...prompts, ...timing.voiceovers].join('\\n'), ordem", "    const contexto = '', ordem", 'D3 sem o contexto do filme'],
  [ENVIO, 'ordem = [timing.referenciaUnica?.nomes?.[0], timing.referenciaUnica?.segundo?.nomes?.[0]]', 'ordem = []', 'D4 sem a ordem das referências'],
  [ENVIO, 'plano.prompt = cabeComProtecao2611(limpo) }', 'plano.prompt = cabeNoTetoDoPlano(limpo) }', 'D1 o corte de antes (a proteção sai)'],
  [ENVIO, 'plano.prompt = cabeComProtecao2611(limpo) }', 'plano.prompt = limpo }', 'sem o teto de 512'],
  [ENVIO, "  if (Array.from(corpo).length < orcamento / 2 || refs.some((r) => !corpo.includes(r))) corpo =", "  if (false) corpo =", 'D1b o corpo vazio (113 cp)'],
  [ENVIO, "  if (Array.from(corpo).length < orcamento / 2 || refs.some((r) => !corpo.includes(r))) corpo =", "  if (refs.some((r) => !corpo.includes(r))) corpo =", 'D1b só a referência (sem @Image o corpo esvazia)'],
  [ENVIO, "ponto = /^\\s*,/u.test(fim) ? '' : '.'", "ponto = ''", 'D1b sem o ponto antes da proteção sem vírgula'],
  [LISTA, '    if (!aceitaNome2511(nome)) return false\n', '', 'palavra solta em minúscula vira nome'],
  [LISTA, '    if (titulo) ini -= titulo[0].length\n    else {', '    if (false) ini -= 0\n    else {', 'o título colado fica'],
  [LISTA, "const reDaLista2511 = (): RegExp => new RegExp(CONTEMPORARY_FIGURE_RE.source, 'gi')", "const reDaLista2511 = (): RegExp => new RegExp(CONTEMPORARY_FIGURE_RE.source, 'g')", 'sem caixa'],
  [LISTA, '    const comeca = /(?:[.!?]\\s+|\\n\\s*)$/u.test(t.slice(0, ini))', '    const comeca = true', 'maiúscula sempre'],
  [LISTA, ' && APOSTO_DEPOIS_2511.test(fonte.slice((m.index ?? 0) + nome.length)) && !compostos.has(chaveDoNome2511(nome))) return false // D3', ') return false // D3', 'D3 o inventado com aposto troca'],
  [LISTA, ' && APOSTO_DEPOIS_2511.test(fonte.slice((m.index ?? 0) + nome.length)) && !compostos.has(chaveDoNome2511(nome))) return false // D3', ' && APOSTO_DEPOIS_2511.test(fonte.slice((m.index ?? 0) + nome.length))) return false // D3', 'D3 o composto do filme não vale'],
  [LISTA, '      if (nomes && ehCompostoDaLista2511(primeiro + \' \' + nome)) ini -= nomes[0].length\n', '      if (false) ini -= 0\n', 'D2 o nome do meio fica'],
  [LISTA, '      else { const iniciais = INICIAIS_ANTES_2511.exec(t.slice(desde, ini)); if (iniciais) ini -= iniciais[0].length } // D2: "E. Musk"', '      else { } // D2', 'D2 a inicial fica'],
  [LISTA, '      if (nomes && ehCompostoDaLista2511(primeiro + \' \' + nome)) ini -= nomes[0].length\n', '      if (nomes) ini -= nomes[0].length\n', 'D2 qualquer palavra antes sai ("Yesterday")'],
  [LISTA, '    const hifen = /^-(?=\\p{L})/u.exec(t.slice(fim)) // D2: "Obama-era" → "era"', '    const hifen = null // D2', 'D2 o hífen vira "a person-era"'],
  [LISTA, "const rotulo = (k: string): string => (chaves.length <= 1 ? FAMOSO_NO_MOTOR_2511 : ORDINAIS_2511[chaves.indexOf(k)] ?? 'another person')", 'const rotulo = (_k: string): string => FAMOSO_NO_MOTOR_2511', 'D4 todos viram "a person"'],
  [LISTA, '  for (const fonte of [...(opcoes.ordem ?? []).map((n) => String(n ?? \'\')), contexto])', '  for (const fonte of [contexto])', 'D4 a ordem ignorada'],
  [ROTA, "return p && typeof semFamosoNoTextoDoMotor2511 === 'function' ? semFamosoNoTextoDoMotor2511(p, { contexto: refs2511.filter(Boolean).join('\\n'), ordem: refs2511 }) : p }", 'return p }', 'o cabeçalho não limpa'],
  [ROTA, "semFamosoNoTextoDoMotor2511(p, { contexto: refs2511.filter(Boolean).join('\\n'), ordem: refs2511 })", 'semFamosoNoTextoDoMotor2511(p)', 'D4 o cabeçalho sem o outro nome'],
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
