// KINEO-DUAS-REFERENCIAS-2411 — guardião que EXECUTA a escolha (lib/cinematic/referenciaUnica2411.ts), a admissão REAL da rota e o montador REAL
// (lib/kling4Trial.ts, POST com fetch falso: nada sai da máquina). Caso da casa: cedd1250 (24/11, Elias e Mara, duas pessoas fotorreais; o multi_prompt
// que foi à fal pelo image-to-video, com os prefixos "Scene N: …", e as 2 folhas que a rota gerou e descartou; aqui elas voltam pela etapa 1).
// Os 3 filmes de UMA pessoa (Le Prince, Slocum, Cooper) continuam byte a byte: scripts/test-referencia-unica-2411.mjs e, aqui, o envio com e sem o interruptor.
// O que NÃO roda aqui: o motor. Só um render pago prova que o Kling 4 segura DOIS rostos pelas duas imagens e não troca um pelo outro.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const feature = 'lib/cinematic/referenciaUnica2411.ts'
const transport = 'lib/kling4Trial.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const load = source => createOfflineLoader({ source, globals: { AbortSignal } })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
const BOCA = ' Mouth closed, no speaking.'
const F1 = 'Keep the face and outfit of @Image1.', F2 = 'Keep the face and outfit of @Image2.'

// cedd1250 — o que foi à fal (scene_fal_inputs) e o elenco do claim
const CEDD = {
  planos: [
    ['Scene 1: use the start image. Photoreal film. Identity: Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt. Elias, an old lighthouse keeper, climbs a spiral staircase inside the lighthouse during a fierce nighttime storm. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.', 3],
    ['Scene 2: use middle keyframe 1. Photoreal film. Identity: Mara, caught a faint call on the radio, exactly as the author wrote; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing olive green suit. Mara, a young radio operator, listens intently to a faint call on her radio set, Elias standing behind her. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.', 4],
    ['Scene 3: use middle keyframe 2. Photoreal film. Identity: Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt. Elias turns the huge lamp at the lighthouse top, casting a powerful beam into the stormy night. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.', 3],
    ['Scene 4: text-directed shot, no new keyframe for this scene. Photoreal film. Wide shot. Identity: Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt. Elias and Mara watch a small fishing boat safely reach the harbor at dawn, their expressions of relief and joy. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.', 5],
  ],
  secoes: [[0], [1], [2, 3]],
  elenco: [
    { nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, canonica: 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt, trousers; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing' },
    { nome: 'Mara', nucleo: 'Mara', tipo: 'humano', protagonista: false, canonica: 'Mara, caught a faint call on the radio, exactly as the author wrote; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing olive green suit; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing' },
  ],
}
const PREFIXO = /^Scene \d+: (?:use the start image\. |use middle keyframe \d+\. |text-directed shot, no new keyframe for this scene\. )/
const PROMPTS = CEDD.planos.map(([p]) => p.replace(PREFIXO, ''))
const DURACOES = CEDD.planos.map(([, d]) => d)
const METADES = CEDD.secoes.flatMap(g => g.map(() => g.length > 1))
const FOLHA_E = 'https://example.org/offline/folha-elias.png', FOLHA_M = 'https://example.org/offline/folha-mara.png'
const retrato = (refs = [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }], elenco = CEDD.elenco) => ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: elenco, characterReferences: refs, approvedStills: [] })
// a régua pela voz devolve exatamente as durações do envio (1 palavra por segundo, voz de 15 s)
const TIMING = { voiceovers: DURACOES.map(d => Array.from({ length: d }, () => 'word').join(' ')), wordsPerSecond: 2.5, pelaVoz: { segundosDaVoz: 15 } }

// A admissão REAL da rota (o mesmo trecho de scripts/test-referencia-unica-2411.mjs), com as folhas da etapa 1 vazias (o retrato já as traz).
function admitir(route, f, fr, vp, { email, snapshot }) {
  const ini = route.indexOf("if (!kling4Timing.fixedCharacter && kling4TrialCandidate && REFERENCIA_UNICA_2411 !== 'off') {")
  const fim = route.indexOf('// KINEO-K4-SUJEITO-0111 — revisor 01/11', ini)
  assert.ok(ini > 0 && fim > ini)
  const kling4Timing = { voiceovers: [], wordsPerSecond: 2 }
  Function('kling4Timing', 'kling4TrialCandidate', 'REFERENCIA_UNICA_2411', 'user', 'admitirReferenciaUnica2411', 'qualitySnapshot', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil',
    'retratoDaReferencia2411', 'folhasDaReferencia2411', 'folhaDaReferenciaLigada', 'FOLHA_DA_REFERENCIA_2411', 'retratoSemFolhaReprovada2411', 'folhasReprovadas2411', // + KINEO-JUIZ-DA-FOLHA-2411 (nada reprovado)
    ts.transpile(route.slice(ini, fim)))(kling4Timing, true, f.REFERENCIA_UNICA_2411, { email }, f.admitirReferenciaUnica2411, snapshot, vp.isStylizedLook, { look: 'photoreal' }, { ativo: false },
    fr.retratoDaReferencia2411, [], fr.folhaDaReferenciaLigada, fr.FOLHA_DA_REFERENCIA_2411, fr.retratoSemFolhaReprovada2411, new Set())
  return kling4Timing
}
async function post(api, args) {
  const requests = []
  await api.submitKling4TrialVideo(args, { apiKey: 'offline', fetchImpl: async (url, opts) => { requests.push({ url, body: opts.body }); return { ok: true, json: async () => ({ request_id: 'offline' }) } } })
  assert.equal(requests.length, 1)
  return { url: requests[0].url, body: requests[0].body, input: JSON.parse(requests[0].body) }
}
const indices = bs => bs.flatMap((m, i) => m ? [i + 1] : [])
const comFrases = (p, frases) => p.endsWith(BOCA) ? p.slice(0, -BOCA.length) + ' ' + frases + BOCA : p + ' ' + frases

let mostrado = null
async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const modules = load(source)
  const f = modules('@/' + feature), api = modules('@/' + transport), fr = { ...modules('@/lib/cinematic/folhaDaReferencia2411.ts'), retratoSemFolhaReprovada2411: modules('@/lib/cinematic/juizDaFolha2411.ts').retratoSemFolhaReprovada2411 }, vp = modules('@/lib/cinematic/visualPromptPolicy.ts')
  const route = source(routeFile, local(routeFile))

  // 1. o interruptor: 'internal' = só a lista exata da casa
  assert.equal(f.DUAS_REFERENCIAS_2411, 'internal')
  assert.equal(f.duasReferenciasLigadas('internal', CASA), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null]) assert.equal(f.duasReferenciasLigadas('internal', e), false, String(e))
  assert.equal(f.duasReferenciasLigadas('off', CASA), false)

  // 2. cedd1250, casa, pelo caminho inteiro: admissão real → montador real → o pedido que iria à fal
  const t = admitir(route, f, fr, vp, { email: CASA, snapshot: retrato() })
  assert.ok(t.referenciaUnica, 'casa liga'); assert.equal(t.referenciaUnica.imageUrl, FOLHA_E, '@Image1 = a folha do protagonista')
  igual(t.referenciaUnica.segundo, { imageUrl: FOLHA_M, frase: F2, nomes: ['Mara'] }, 'o 2º: a folha da Mara, @Image2 (a canônica não traz o trecho entre aspas: sem descrição)')
  assert.equal(t.referenciaUnica.frase, F1)
  const ref = { ...t.referenciaUnica, metades: METADES }
  const envio = await post(api, { prompts: PROMPTS, approvedStills: PROMPTS.map(() => null), timing: { ...TIMING, referenciaUnica: ref } })
  assert.equal(envio.url, 'https://queue.fal.run/kling/v4/reference-to-video')
  igual(envio.input.image_urls, [FOLHA_E, FOLHA_M], 'image_urls = [protagonista, 2º], nessa ordem')
  igual(Object.keys(envio.input), ['image_urls', 'multi_prompt', 'duration', 'resolution', 'aspect_ratio'], 'nenhum vídeo, nenhum elemento')
  assert.equal(envio.input.resolution, '720p'); assert.equal(String(envio.input.duration), '15'); igual(envio.input.multi_prompt.map(m => m.duration), DURACOES)
  const tem1 = envio.input.multi_prompt.map(m => m.prompt.includes('@Image1')), tem2 = envio.input.multi_prompt.map(m => m.prompt.includes('@Image2'))
  igual(indices(tem1), [1, 2, 3, 4], 'Elias: planos 1, 2 ("Elias standing behind her"), 3 e 4')
  igual(indices(tem2), [2, 4], 'Mara: planos 2 e 4')
  // o texto exato: plano com os dois leva as duas frases, na ordem @Image1, @Image2; plano só do Elias leva só a dele
  igual(envio.input.multi_prompt.map(m => m.prompt), [comFrases(PROMPTS[0], F1), comFrases(PROMPTS[1], F1 + ' ' + F2), comFrases(PROMPTS[2], F1), comFrases(PROMPTS[3], F1 + ' ' + F2)])
  envio.input.multi_prompt.forEach(m => assert.ok(Array.from(m.prompt).length <= 512))
  const wire = api.buildKling4TrialInput(PROMPTS, [], { ...TIMING, referenciaUnica: ref })
  assert.equal(JSON.stringify(wire.input), envio.body)
  // o relato e o juiz: o claim conta os dois; o juiz lê o texto sem as NOSSAS frases (o mesmo do juiz de antes)
  const relato = JSON.parse(JSON.stringify(f.relatoReferenciaUnica({ referenciaUnica: ref }, wire)))
  igual([relato.planos_com_frase, relato.planos_com_segunda], [[1, 2, 3, 4], [2, 4]])
  igual(f.entradaDoJuiz2411({ referenciaUnica: ref }, wire).multi_prompt.map(m => m.prompt), PROMPTS, 'o juiz lê o texto sem as frases')
  if (!change) mostrado = envio.input

  // 3. plano só do 2º: a ficha do protagonista sai (regra da volta 2) e entra só a frase do 2º; nunca a do protagonista
  { const soDela = ['Photoreal film. Identity: Mara, a radio operator in an olive suit. Mara turns the dial of the radio.' + BOCA, 'Photoreal film. Elias climbs the stairs.' + BOCA]
    const w = api.buildKling4ReferenciaUnicaInput(soDela.map((prompt, i) => ({ prompt, duration: [7, 8][i] })), { ...t.referenciaUnica })
    assert.ok(w.input.multi_prompt[0].prompt.includes('@Image2') && !w.input.multi_prompt[0].prompt.includes('@Image1'), 'plano só da Mara: só @Image2')
    assert.ok(w.input.multi_prompt[1].prompt.includes('@Image1') && !w.input.multi_prompt[1].prompt.includes('@Image2'), 'plano só do Elias: só @Image1')
    igual(f.entradaDoJuiz2411({ referenciaUnica: t.referenciaUnica }, w).multi_prompt.map(m => m.prompt), soDela) }
  // a ordem do protagonista ("The only person in this shot is the same main character (…)") não põe o 2º no plano
  { const ordem = 'Photoreal film. The only person in this shot is the same main character (Elias, an old keeper); any other person described below is replaced by this same character. He looks out to sea.' + BOCA
    const w = api.buildKling4ReferenciaUnicaInput([{ prompt: ordem, duration: 7 }, { prompt: 'Photoreal film. Mara and Elias wave.' + BOCA, duration: 8 }], { ...t.referenciaUnica })
    assert.ok(!w.input.multi_prompt[0].prompt.includes('@Image2'), 'a ordem do protagonista não é ficha do 2º') }

  // 4. o 2º nunca citado: uma imagem só, o pedido de UMA referência byte a byte
  { const soEle = PROMPTS.map(p => p.replace(/Mara, a young radio operator, listens intently to a faint call on her radio set, Elias standing behind her\./, 'Elias listens to the radio.').replace(/Identity: Mara[^.]*\. /, '').replace('Elias and Mara watch', 'Elias watches'))
    const a = await post(api, { prompts: soEle, approvedStills: [], timing: { ...TIMING, referenciaUnica: { ...ref } } })
    const { segundo, ...semSegundo } = ref
    const b = await post(api, { prompts: soEle, approvedStills: [], timing: { ...TIMING, referenciaUnica: semSegundo } })
    assert.equal(a.body, b.body, 'sem plano do 2º = o pedido de uma referência'); igual(a.input.image_urls, [FOLHA_E]) }

  // 5. o retrato decide: 3 folhas, 1 folha, 2º sem https, 2º igual ao 1º, interruptor 'off', cliente = a referência de UMA pessoa (byte a byte)
  const tres = [...CEDD.elenco, { nome: 'Tom', nucleo: 'Tom', tipo: 'humano', protagonista: false, canonica: 'Tom, a fisherman' }]
  for (const [nome, snap] of [['3 folhas', retrato([{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }, { nome: 'Tom', url: 'https://example.org/offline/folha-tom.png' }], tres)],
    ['só a folha dele', retrato([{ nome: 'Elias', url: FOLHA_E }])], ['2º sem https', retrato([{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: 'http://inseguro.example/m.png' }])],
    ['a mesma imagem', retrato([{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_E }])]]) {
    const x = admitir(route, f, fr, vp, { email: CASA, snapshot: snap })
    assert.ok(x.referenciaUnica && !('segundo' in x.referenciaUnica), nome + ': uma referência')
  }
  { const uma = f.referenciaUnicaDoFilme(retrato()) // desligado ('off' ou cliente) = a MESMA referência, o mesmo objeto
    assert.equal(f.comSegundaReferencia2411(uma, retrato(), false), uma, 'desligado = uma referência')
    assert.equal(f.comSegundaReferencia2411(uma, retrato(), f.duasReferenciasLigadas('off', CASA)), uma, 'off = uma referência') }
  for (const modo of ['public_humano', 'internal']) {
    const c = admitir(route, { ...f, REFERENCIA_UNICA_2411: modo }, fr, vp, { email: CLIENTE, snapshot: retrato([{ nome: 'Elias', url: FOLHA_E }], [CEDD.elenco[0]]) })
    assert.ok(!c.referenciaUnica || !('segundo' in c.referenciaUnica), 'cliente: nunca o 2º (' + modo + ')')
  }
  { // KINEO-DUAS-PESSOAS-CLIENTE-2511 [CEO 25/11] cedd1250 (duas pessoas fotorreais com folha) para o CLIENTE: em 'public_humano' o MESMO 2º da casa; com a
    // chave das duas pessoas em 'internal' (só a casa), nunca o 2º (o de ontem)
    // [CEO 25/11 noite] PUBLICADO em 'internal' (a régua das duas pessoas deu volta): pela rota, o cliente com duas folhas = o pedido de hoje; a régua
    // MONTADA em 'public_humano' (5º argumento) continua dando ao cliente o MESMO 2º da casa
    const c = admitir(route, f, fr, vp, { email: CLIENTE, snapshot: retrato() })
    assert.equal(f.DUAS_PESSOAS_DO_CLIENTE_2511, 'internal', "publicado: 'internal'")
    assert.ok(!c.referenciaUnica && c.referenciaUnicaRecusa === 'mais_de_uma_folha', "publicado: cliente com duas folhas = o pedido de hoje (o motivo de ontem)")
    const ch = admitir(route, { ...f, admitirReferenciaUnica2411: (m, e, s, fl) => f.admitirReferenciaUnica2411(m, e, s, fl, 'public_humano') }, fr, vp, { email: CLIENTE, snapshot: retrato() })
    assert.ok(ch.referenciaUnica && ch.referenciaUnicaDoCliente === true, "montada em 'public_humano': cliente com duas folhas fotorreais liga")
    igual(ch.referenciaUnica, t.referenciaUnica, "montada em 'public_humano': cliente = a referência da casa, com o 2º")
    const ci = admitir(route, { ...f, admitirReferenciaUnica2411: (m, e, s, fl) => f.admitirReferenciaUnica2411(m, e, s, fl, 'internal') }, fr, vp, { email: CLIENTE, snapshot: retrato() })
    assert.ok(!ci.referenciaUnica && ci.referenciaUnicaRecusa === 'mais_de_uma_folha', "duas pessoas em 'internal': cliente nunca o 2º, o motivo de ontem")
    // mesmo com a referência única em 'public' (o cliente entra pelo caminho da casa), o 2º é só da casa: o interruptor próprio decide
    const p = admitir(route, { ...f, REFERENCIA_UNICA_2411: 'public' }, fr, vp, { email: CLIENTE, snapshot: retrato() })
    assert.ok(p.referenciaUnica && !('segundo' in p.referenciaUnica), "referência 'public' + cliente: uma referência") }

  // 7. [revisora independente 24/11, VOLTA, docs/revisoes-2311/CEO-DUAS-REFERENCIAS-2411.md §9] os quatro furos e os três mutantes vivos
  { const marcas = w => w.input.multi_prompt.map(m => (m.prompt.includes('@Image1') ? '1' : '') + (m.prompt.includes('@Image2') ? '2' : '') || '-')
    const monta = (planos, metades) => api.buildKling4ReferenciaUnicaInput(planos.map((prompt, i) => ({ prompt, duration: [7, 8][i] })), { ...t.referenciaUnica, ...(metades ? { metades } : {}) })
    // 1. posse não é presença do 2º
    igual(marcas(monta(['Photoreal film. Identity: Elias, an old keeper. Elias holds Mara\'s radio close to his ear.' + BOCA, 'Photoreal film. Mara and Elias wave.' + BOCA])), ['1', '12'], 'posse: só @Image1')
    // 2. o nome do 2º dentro da ficha do protagonista não é a ficha do 2º
    igual(marcas(monta(['Photoreal film. Identity: Elias, Mara\'s grandfather, an old keeper. Elias stands alone on the gallery.' + BOCA, 'Photoreal film. Identity: Mara, a radio operator. She listens to the radio.' + BOCA])), ['1', '2'], 'a ficha dele cita a Mara')
    // M13: metade só do 2º com a ficha do protagonista herdada: a ficha dele sai e entra só @Image2
    { const m = monta(['Photoreal film. Identity: Elias, an old keeper. Elias climbs the stairs.' + BOCA, 'Photoreal film. Identity: Elias, an old keeper. Mara steps onto the pier.' + BOCA], [false, true])
      igual(marcas(m), ['1', '2']); assert.ok(!m.input.multi_prompt[1].prompt.includes('Identity: Elias'), 'a ficha do protagonista sai da metade só dela'); assert.equal(typeof m.fichaRetirada[1], 'string') }
    // M8: plano com os dois perto de 512: as duas frases cabem, o plano não passa de 512
    { const longo = 'Photoreal film. Elias and Mara ' + 'walk slowly through the long corridor of mirrors, '.repeat(12) + 'and stop.' + BOCA
      const m = monta([longo, 'Photoreal film. Elias waits.' + BOCA])
      assert.ok(Array.from(m.input.multi_prompt[0].prompt).length <= 512, 'teto de 512 com as duas frases'); igual(marcas(m)[0], '12')
      assert.ok(m.input.multi_prompt[0].prompt.endsWith(F1 + ' ' + F2 + BOCA)) }
    // 3. nomes que se contêm: uma referência
    for (const [a, b] of [['Ana Maria', 'Ana'], ['Ana', 'Ana Maria'], ['Elias', 'Elias Junior']]) {
      const el = [{ ...CEDD.elenco[0], nome: a, nucleo: a }, { ...CEDD.elenco[1], nome: b, nucleo: b }]
      const x = admitir(route, f, fr, vp, { email: CASA, snapshot: retrato([{ nome: a, url: FOLHA_E }, { nome: b, url: FOLHA_M }], el) })
      assert.ok(x.referenciaUnica && !('segundo' in x.referenciaUnica), a + ' / ' + b + ': uma referência')
    }
    // 4. o protagonista pela imagem-chave + 2 coadjuvantes com folha = 3 pessoas com referência: uma referência
    { const tom = { nome: 'Tom', nucleo: 'Tom', tipo: 'humano', protagonista: false, canonica: 'Tom, a fisherman' }
      const snap = { ...retrato([{ nome: 'Mara', url: FOLHA_M }, { nome: 'Tom', url: 'https://example.org/offline/folha-tom.png' }], [...CEDD.elenco, tom]), approvedStills: [{ url: 'https://example.org/offline/k-elias.png', characterNames: ['Elias'] }] }
      const x = admitir(route, f, fr, vp, { email: CASA, snapshot: snap })
      assert.ok(x.referenciaUnica && x.referenciaUnica.origem === 'imagem_chave' && !('segundo' in x.referenciaUnica), 'protagonista pela imagem-chave: uma referência') }
    // M11: 2º de tipo fora do elenco de gente, bicho e criatura (objeto): uma referência
    { const x = admitir(route, f, fr, vp, { email: CASA, snapshot: retrato(undefined, [CEDD.elenco[0], { ...CEDD.elenco[1], tipo: 'objeto' }]) })
      assert.ok(x.referenciaUnica && !('segundo' in x.referenciaUnica), '2º objeto: uma referência') }
  }

  // 6. o montador sem o 2º = byte a byte o de uma referência (os filmes de uma pessoa); 2º torto = ignorado
  for (const torto of [{ ...t.referenciaUnica.segundo, imageUrl: 'http://x.org/m.png' }, { ...t.referenciaUnica.segundo, frase: F1 }, { ...t.referenciaUnica.segundo, imageUrl: FOLHA_E }]) {
    const { segundo, ...uma } = ref
    assert.equal((await post(api, { prompts: PROMPTS, approvedStills: [], timing: { ...TIMING, referenciaUnica: { ...ref, segundo: torto } } })).body,
      (await post(api, { prompts: PROMPTS, approvedStills: [], timing: { ...TIMING, referenciaUnica: uma } })).body, '2º torto = uma referência')
  }
}

await suite(null)
const mutants = [
  [feature, "export const DUAS_REFERENCIAS_2411: ModoDuasReferencias2411 = 'internal'", "export const DUAS_REFERENCIAS_2411: ModoDuasReferencias2411 = 'off'"], // a casa perde
  [feature, "boolean =>\n  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))\nexport const FRASE_SEGUNDA_PESSOA", "boolean =>\n  modo === 'public' || (modo === 'internal')\nexport const FRASE_SEGUNDA_PESSOA"], // todo e-mail vira casa (só aqui)
  [feature, 'comSegundaReferencia2411(r, snapshot, duasReferenciasLigadas(DUAS_REFERENCIAS_2411, email))', 'comSegundaReferencia2411(r, snapshot, true)'], // sem o interruptor
  // (o mutante "cliente recebendo pelo caminho do cliente" ficou equivalente sobre 7855f3a52: o aperto 9317d3141 nunca admite cliente com 2 folhas, e o 2º pede exatamente 2; o cliente pelo caminho da casa, em "public", está no caso 5)
  [feature, 'if (comFolha.length !== 2 || !comFolha', 'if (comFolha.length < 2 || !comFolha'], // 3ª folha vira 2º
  [feature, "outro.tipo === 'humano' ? FRASE_SEGUNDA_PESSOA : FRASE_SEGUNDA_DESENHO", "FRASE_REFERENCIA_PESSOA"], // o 2º com @Image1
  [feature, '  if (!https(url) || url === ref.imageUrl) return ref\n', ''], // 2º sem folha https
  [transport, 'image_urls: usaSegundo && seg ? [ref.imageUrl, seg.imageUrl] : [ref.imageUrl]', 'image_urls: usaSegundo && seg ? [seg.imageUrl, ref.imageUrl] : [ref.imageUrl]'], // imagens trocadas
  [transport, "const frasesDo = (i: number): string => (comPersonagem[i] ? frase : '') + (comSegundo[i] && seg ? ' ' + seg.frase.trim() : '')", "const frasesDo = (i: number): string => (comPersonagem[i] ? frase : '') + (seg ? ' ' + seg.frase.trim() : '')"], // frase do 2º no plano do 1º
  [transport, "const frasesDo = (i: number): string => (comPersonagem[i] ? frase : '') + (comSegundo[i] && seg ? ' ' + seg.frase.trim() : '')", "const frasesDo = (i: number): string => (comPersonagem[i] || comSegundo[i] ? frase : '') + (comSegundo[i] && seg ? ' ' + seg.frase.trim() : '')"], // frase do 1º no plano só do 2º
  [transport, ', protagonista: false }))', ' }))'], // a ordem do protagonista põe o 2º
  [transport, '  const usaSegundo = !!seg && comSegundo.some(Boolean)', '  const usaSegundo = !!seg'], // 2ª imagem sem plano dele
  [transport, "&& ref.segundo.imageUrl !== ref.imageUrl && /@Image2\\b/.test(ref.segundo.frase)", "&& /@Image2\\b/.test(ref.segundo.frase)"], // a mesma imagem duas vezes
  [transport, "&& /@Image2\\b/.test(ref.segundo.frase) && /@Image1\\b/.test(ref.frase)", "&& /@Image1\\b/.test(ref.frase)"], // frase do 2º sem @Image2
  [feature, "(marcados[i] === true || segundos[i] === true) && typeof m?.prompt", "marcados[i] === true && typeof m?.prompt"], // o juiz lê a frase do 2º
  // [revisora independente 24/11, VOLTA] os quatro furos e os três vivos dela
  [transport, "if (cita === 'posse' && quem.protagonista !== false && visualMostraAlguem(acao))", "if (cita === 'posse' && visualMostraAlguem(acao))"], // 1. posse vira presença do 2º
  [transport, 'protagonista ? citacaoDoPersonagem(m, nomes) !== null : fichaComecaPor(m, nomes)', 'citacaoDoPersonagem(m, nomes) !== null'], // 2. o nome dele na ficha de outro
  [feature, '  if (nomes.some((a) => ref.nomes.some((b) => palavra(a, b) || palavra(b, a)))) return ref\n', ''], // 3. nomes que se contêm
  [feature, ' || !comFolha.some((c) => c.protagonista === true)) return ref', ') return ref'], // 4. protagonista pela imagem-chave + 2 folhas
  [transport, 'KLING4_TETO_DO_PLANO - Array.from(frases).length', 'KLING4_TETO_DO_PLANO - Array.from(frase).length'], // M8: reserva só uma frase
  [feature, " || (outro.tipo !== 'humano' && outro.tipo !== 'animal' && outro.tipo !== 'criatura')) return ref", ') return ref'], // M11: 2º objeto
  [transport, 'if (!comPersonagem[i]) { const sem = semFichaDoPersonagem(texto, ref.nomes);', 'if (false) { const sem = semFichaDoPersonagem(texto, ref.nomes);'], // M13: a ficha dele fica na metade só dela
  [feature, "...(Array.isArray(wire.planosComSegunda) ? { planos_com_segunda:", "...(false ? { planos_com_segunda:"], // o claim não conta o 2º
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
if (process.env.MOSTRAR_PEDIDO) console.log(JSON.stringify(mostrado, null, 1))
console.log(`PASS KINEO-DUAS-REFERENCIAS-2411: 'internal' (só a casa exata); cedd1250 = image_urls [Elias, Mara], @Image1 nos planos 1-4, @Image2 nos planos 2 e 4, o juiz lê sem as frases; 3 folhas, 1 folha, 2º torto, 'off' e cliente = uma referência; ${mortos}/${mutants.length} mutantes mortos.`)
