// KINEO-REFERENCIA-UNICA-2411 — guardião que EXECUTA o montador real (lib/kling4Trial.ts, via submitKling4TrialVideo com fetch falso: nada sai da máquina)
// e os trechos reais da rota (a admissão nova e o kling4PorSecao). Dados: scripts/test-support/referencia-unica-2411-filmes.json (os 3 filmes do teste
// pago de 23/11: o texto que foi ao Kling 4 e o pedido "A" com UMA referência).
// O que NÃO roda aqui: o POST inteiro da rota (auth, banco, voz, imagens). A ligação rota → montador é coberta pelos trechos executados abaixo.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const base = 'f58bcb31aa7a40d785ec0435f15b88adfc0958f7' // origin/main de onde a obra saiu
const transport = 'lib/kling4Trial.ts'
const feature = 'lib/cinematic/referenciaUnica2411.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const original = file => execFileSync('git', ['show', base + ':' + file], { encoding: 'utf8', maxBuffer: 8_000_000 }).replaceAll('\r\n', '\n')
const dados = JSON.parse(readFileSync('scripts/test-support/referencia-unica-2411-filmes.json', 'utf8'))
const load = source => createOfflineLoader({ source, globals: { AbortSignal } })
const old = load((file, src) => file === transport ? original(file) : src)('@/' + transport)
const filme = id => dados.filmes.find(f => f.id === id)
const SINTETICA = n => `https://example.org/offline/still-${n}.png` // imagem-chave do controle cuja URL não está nos dados (só a 1ª ou a ficha estão)

async function post(api, args) {
  const requests = []
  await api.submitKling4TrialVideo(args, { apiKey: 'offline', fetchImpl: async (url, opts) => {
    requests.push({ url, body: opts.body })
    return { ok: true, json: async () => ({ request_id: 'offline' }) }
  } })
  assert.equal(requests.length, 1)
  return { url: requests[0].url, body: requests[0].body, input: JSON.parse(requests[0].body) }
}

// A régua pela voz (KINEO-K4-DURACAO-PELA-VOZ-1311) com 1 palavra por segundo e voz de 15 s devolve exatamente as durações do controle.
const timingDe = f => ({ voiceovers: f.planos.map(p => Array.from({ length: p.duration }, () => 'word').join(' ')), wordsPerSecond: 2.5, pelaVoz: { segundosDaVoz: 15 } })
// As imagens-chave de hoje, lidas do prefixo que o controle levou: start / middle N / sem imagem.
const stillsDe = f => f.planos.map((p, i) => /use the start image/.test(p.prefixo) ? (f.imagem_chave_1 ?? f.referencia_do_teste)
  : /use middle keyframe/.test(p.prefixo) ? SINTETICA(f.id + '-' + i) : null)

// Elenco reconstruído do que o texto do plano mostra ("Identity: the young man…"); a ficha é a URL que o teste registrou como ficha do elenco.
const snapshots = {
  '2fef3706': { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: 'the young man', nucleo: 'young man', tipo: 'humano', protagonista: true, canonica: 'A young man' }],
    characterReferences: [{ nome: 'the young man', url: filme('2fef3706').referencia_do_teste }], approvedStills: [] },
  '4691e265': { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: 'the mysterious warrior', nucleo: 'mysterious warrior', tipo: 'humano', protagonista: true, canonica: 'A warrior' },
    { nome: 'the king', nucleo: 'king', tipo: 'humano', protagonista: false, canonica: 'A king' }],
    characterReferences: [{ nome: 'the mysterious warrior', url: filme('4691e265').ficha_do_elenco }], approvedStills: [{ url: filme('4691e265').referencia_do_teste, characterNames: ['the mysterious warrior'] }] },
  '49448973': { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [], characterReferences: [], approvedStills: [] }, // o elenco gravado ficou VAZIO
  '49448973-com-elenco': { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: 'the fluffy mascot', nucleo: 'fluffy mascot', tipo: 'criatura', protagonista: true, canonica: 'A fluffy yellow mascot' }],
    characterReferences: [], approvedStills: [{ url: filme('49448973').referencia_do_teste, characterNames: ['the fluffy mascot'] }] },
}

// Executa o trecho REAL da admissão nova na rota.
function admitir(route, f, { email, candidato = true, fixo = null, snapshot }) {
  const ini = route.indexOf('if (!kling4Timing.fixedCharacter && kling4TrialCandidate && referenciaUnicaLigada(')
  const fim = route.indexOf('// KINEO-K4-SUJEITO-0111 — revisor 01/11', ini)
  assert.ok(ini > 0 && fim > ini, 'admissão nova não achada na rota')
  const ini0 = route.indexOf('const kling4Timing:'), ini1 = route.indexOf('if (ensaioPersonagemFixo && kling4TrialCandidate && classicVisualMode', ini0)
  assert.ok(ini0 > 0 && ini0 < ini1 && ini1 < ini, 'a admissão nova tem de vir depois do personagem fixo')
  const kling4Timing = { voiceovers: [], wordsPerSecond: 2, ...(fixo ? { fixedCharacter: fixo } : {}) }
  Function('kling4Timing', 'kling4TrialCandidate', 'referenciaUnicaLigada', 'REFERENCIA_UNICA_2411', 'user', 'referenciaUnicaDoFilme', 'qualitySnapshot',
    ts.transpile(route.slice(ini, fim)))(kling4Timing, candidato, f.referenciaUnicaLigada, f.REFERENCIA_UNICA_2411, { email }, f.referenciaUnicaDoFilme, snapshot)
  return kling4Timing
}

// Executa o kling4PorSecao REAL da rota (como scripts/test-k4-personagem-fixo-1811.mjs), com o plano por seção ligado.
function porSecao(route, modules, merged, referenciaUnica) {
  const begin = route.indexOf('const kling4PorSecao ='), end = route.indexOf('const kling4EnvioDoFilme', begin)
  assert.ok(begin > 0 && end > begin)
  const js = ts.transpile(route.slice(begin, end) + '\nreturn kling4PorSecao(a)', { target: ts.ScriptTarget.ES2022 })
  const cues = ['The young man opens the ledger', 'The young man walks between the vaults', 'The young man steps onto the cobblestones', 'The young man buttons the coat']
  const parsedScript = { segments: cues.map(p => ({ pexelsQuery: p, voiceover: p })) }
  const prompts = merged ? ['First scene', 'Second scene', 'Last scene'] : [cues[0]]
  const a = { prompts, approvedStills: prompts.map(() => null), timing: { wordsPerSecond: 2, voiceovers: merged ? [cues[0], cues.slice(1, 3).join(' '), cues[3]] : [cues[0]], ...(referenciaUnica ? { referenciaUnica } : {}) } }
  const scope = { a, parsedScript, scenes: prompts.map(description => ({ description })), verbatim: merged, kling4PlanoPorSecao: true, kling4PlanoVariado: false, kling4PlanoFinal: false,
    planosPorSecao: modules('@/lib/kling4QuatroPlanos').planosPorSecao, sujeitoAparenciaLigada: () => false, comSuperficieNoPlano: p => p, garantirSujeitoNoUltimo1911: () => {} }
  return Function(...Object.keys(scope), js)(...Object.values(scope))
}

async function suite(change) {
  const source = (file, src) => change && file === change[0] ? src.split(change[1]).join(change[2]) : src
  const modules = load(source), api = modules('@/' + transport), f = modules('@/' + feature), contas = modules('@/lib/internalAccounts')
  const route = source(routeFile, local(routeFile))

  // (d) o interruptor: 'off' no commit; 'internal' = só a lista EXATA da casa; 'public' = todos.
  assert.equal(f.REFERENCIA_UNICA_2411, 'off')
  for (const e of contas.INTERNAL_EXACT_EMAILS) {
    assert.equal(f.referenciaUnicaLigada('internal', e), true, e); assert.equal(f.referenciaUnicaLigada('internal', ' ' + e.toUpperCase() + ' '), true, e)
    assert.equal(f.referenciaUnicaLigada('off', e), false, e)
  }
  for (const e of ['joseph+teste02@gmail.com', 'josephsskaf+x@gmail.com', 'test123@example.com', 'smoketest@x.io', 'qa@shortsforgeai.com', 'cliente@example.org', '', null, undefined]) {
    assert.equal(f.referenciaUnicaLigada('internal', e), false, String(e)); assert.equal(f.referenciaUnicaLigada('off', e), false)
  }
  assert.equal(f.referenciaUnicaLigada('public', 'cliente@example.org'), true)

  for (const id of ['2fef3706', '4691e265', '49448973']) {
    const fl = filme(id), prompts = fl.planos.map(p => p.prompt), stills = stillsDe(fl), timing = timingDe(fl)
    // (a) desligado: a admissão real da rota não põe nada (nem para o fundador) e o pedido é byte a byte o da main.
    for (const email of ['josephsskaf@gmail.com', 'cliente@example.org']) assert.equal('referenciaUnica' in admitir(route, f, { email, snapshot: snapshots[id] }), false)
    const hoje = await post(api, { prompts, approvedStills: stills, timing }), main = await post(old, { prompts, approvedStills: stills, timing })
    assert.equal(hoje.url, main.url); assert.equal(hoje.body, main.body)
    assert.equal(hoje.url, 'https://queue.fal.run/kling/v4/image-to-video')
    assert.deepEqual(hoje.input.multi_prompt.map(s => s.prompt), fl.planos.map(p => p.prefixo + p.prompt), id + ': o montador reproduz o texto que foi ao Kling 4')
    assert.deepEqual(hoje.input.multi_prompt.map(s => s.duration), fl.planos.map(p => p.duration))
  }

  // (b) ligado: o pedido bate com o pedido A no que importa.
  const casa = 'josephsskaf@gmail.com'
  const ligado = { ...f, REFERENCIA_UNICA_2411: 'internal' }
  for (const [id, snap, planosComFrase, urlEsperada, origem] of [
    ['2fef3706', '2fef3706', [0, 1, 2, 3], filme('2fef3706').referencia_do_teste, 'ficha'],
    ['4691e265', '4691e265', [0, 1, 2], filme('4691e265').ficha_do_elenco, 'ficha'], // o código escolhe a ficha (o teste usou a imagem-chave 1)
    ['49448973', '49448973-com-elenco', [0], filme('49448973').referencia_do_teste, 'imagem_chave'],
  ]) {
    const fl = filme(id), A = fl.pedido_A
    const t = admitir(route, ligado, { email: casa, snapshot: snapshots[snap] })
    assert.ok(t.referenciaUnica, id); assert.equal(t.referenciaUnica.origem, origem)
    assert.equal('referenciaUnica' in admitir(route, ligado, { email: 'cliente@example.org', snapshot: snapshots[snap] }), false)
    assert.equal('referenciaUnica' in admitir(route, ligado, { email: casa, candidato: false, snapshot: snapshots[snap] }), false)
    assert.equal('referenciaUnica' in admitir(route, ligado, { email: casa, fixo: { imageUrl: 'https://x.org/a.png', continuity: 'c' }, snapshot: snapshots[snap] }), false)
    const enviado = await post(api, { prompts: fl.planos.map(p => p.prompt), approvedStills: stillsDe(fl), timing: { ...timingDe(fl), referenciaUnica: t.referenciaUnica } })
    assert.equal(enviado.url, 'https://queue.fal.run/' + A.endpoint)
    assert.deepEqual(enviado.input.image_urls, [urlEsperada]); assert.equal(enviado.input.image_urls.length, A.input.image_urls.length)
    assert.deepEqual(Object.keys(enviado.input), Object.keys(A.input))
    for (const k of ['duration', 'resolution', 'aspect_ratio']) assert.equal(enviado.input[k], A.input[k], k)
    assert.ok(!('start_image_url' in enviado.input) && !('middle_image_urls' in enviado.input))
    assert.deepEqual(enviado.input.multi_prompt.map(s => s.duration), A.input.multi_prompt.map(s => s.duration))
    enviado.input.multi_prompt.forEach((s, i) => {
      assert.ok(!/^Scene \d+:/.test(s.prompt), 'sem o prefixo')
      if (planosComFrase.includes(i)) assert.equal(s.prompt, A.input.multi_prompt[i].prompt, `${id} plano ${i + 1} = pedido A`)
      else { assert.equal(s.prompt, fl.planos[i].prompt, `${id} plano ${i + 1} sem o personagem: o texto de hoje, sem frase`); assert.ok(!s.prompt.includes('@Image1')) }
    })
    const relato = f.relatoReferenciaUnica({ referenciaUnica: t.referenciaUnica }, { model: enviado.url.replace('https://queue.fal.run/', ''), input: enviado.input })
    assert.deepEqual(JSON.parse(JSON.stringify(relato)), { versao: 'KINEO-REFERENCIA-UNICA-2411', origem, tipo: t.referenciaUnica.tipo, planos: A.input.multi_prompt.length, planos_com_frase: planosComFrase.map(i => i + 1) })
    assert.equal(f.relatoReferenciaUnica({ referenciaUnica: t.referenciaUnica, fixedCharacter: {} }, { model: A.endpoint, input: enviado.input }), null)
    assert.equal(f.relatoReferenciaUnica({ referenciaUnica: t.referenciaUnica }, { model: 'kling/v4/image-to-video', input: enviado.input }), null)
    assert.equal(f.relatoReferenciaUnica({}, { model: A.endpoint, input: enviado.input }), null)
  }
  assert.equal(f.referenciaUnicaDoFilme(snapshots['2fef3706']).frase, 'Keep the face and outfit of @Image1.')
  assert.equal(f.referenciaUnicaDoFilme(snapshots['49448973-com-elenco']).frase, 'Keep the exact character design of @Image1.')

  // (c) sem referência utilizável, sem personagem no texto ou fora de 15 s: o caminho de hoje, byte a byte, sem erro.
  const rapaz = filme('2fef3706'), pr = rapaz.planos.map(p => p.prompt), st = stillsDe(rapaz), tm = timingDe(rapaz)
  const hojeRapaz = (await post(old, { prompts: pr, approvedStills: st, timing: tm })).body
  const s0 = snapshots['2fef3706'], lead = s0.characters[0]
  for (const snap of [snapshots['49448973'], null, { ...s0, characters: [{ ...lead, protagonista: false }] },
    { ...s0, characters: [lead, { ...lead, nome: 'the friend', nucleo: 'friend' }] }, // dois protagonistas = dúvida
    { ...s0, characters: [{ ...lead, tipo: 'objeto' }] },
    { ...s0, characterReferences: [{ nome: lead.nome, url: 'http://inseguro.example/a.jpg' }] },
    { ...s0, characterReferences: [], approvedStills: [{ url: 'https://x.org/k.png', characterNames: [lead.nome, 'the friend'] }] }]) {
    assert.equal(f.referenciaUnicaDoFilme(snap), null)
    assert.equal('referenciaUnica' in admitir(route, ligado, { email: casa, snapshot: snap }), false)
  }
  const ru = f.referenciaUnicaDoFilme(s0)
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, referenciaUnica: { ...ru, nomes: ['the old lighthouse'] } } })).body, hojeRapaz, 'nenhum plano com o personagem')
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, referenciaUnica: { ...ru, imageUrl: 'http://x.org/a.jpg' } } })).body, hojeRapaz, 'URL não https')
  // o nome do elenco com artigo ("the young man") acha o plano que diz "A young man"; nome curto demais ou pedaço de palavra não acha
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, referenciaUnica: { ...ru, nomes: ['the young man'] } } })).input.multi_prompt[0].prompt, rapaz.pedido_A.input.multi_prompt[0].prompt)
  assert.equal(api.planoMostraOPersonagem('An old manuscript on the table', ['the man']), false)
  assert.equal(api.planoMostraOPersonagem('The ox walks', ['the ox']), false)
  assert.equal(api.planoMostraOPersonagem('A woman and the Young Man talk', ['young man']), true)
  const vinte = { voiceovers: tm.voiceovers, wordsPerSecond: 2.5, clipSeconds: 20 }
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...vinte, referenciaUnica: ru } })).body, (await post(old, { prompts: pr, approvedStills: st, timing: vinte })).body, '20 s fica como hoje')

  // O teto de 512 do plano: a frase e a proteção da boca ficam inteiras.
  const longo = 'Photoreal film. The young man ' + 'walks through the long corridor of mirrors, '.repeat(20) + 'Mouth closed, no speaking.'
  const pl = api.buildKling4ReferenciaUnicaInput([{ prompt: longo, duration: 15 }], ru).input.multi_prompt[0].prompt
  assert.ok(Array.from(pl).length <= 512 && pl.endsWith(' Keep the face and outfit of @Image1. Mouth closed, no speaking.') && pl.startsWith('Photoreal film. The young man walks'), pl)

  // O plano por seção (kling4PorSecao real da rota) leva a referência; sem ela, nada muda.
  for (const merged of [false, true]) {
    const r = porSecao(route, modules, merged, ru)
    assert.equal(r.timing.referenciaUnica, ru, 'merged=' + merged)
    assert.equal('referenciaUnica' in porSecao(route, modules, merged, null).timing, false)
  }
  // O claim só ganha o campo quando a referência única foi usada.
  assert.ok(route.includes("return ru ? { kling4_referencia_unica: ru } : {}"))
}

await suite()
const mutants = [
  [transport, "duration !== 15 || ", ''],
  [transport, '  if (!comPersonagem.some(Boolean)) return null\n', ''],
  [transport, 'image_urls: [ref.imageUrl]', 'image_urls: []'],
  [transport, 'cabe.slice(0, -CAUDA_DA_BOCA.length) + frase + CAUDA_DA_BOCA : cabe + frase', 'cabe + frase : cabe + frase'],
  [transport, 'if (!comPersonagem[i]) return', 'if (false) return'],
  [transport, ".replace(/^(?:the|a|an)\\s+/, '')", ''],
  [transport, 'KLING4_TETO_DO_PLANO - Array.from(frase).length', 'KLING4_TETO_DO_PLANO'],
  [feature, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal'"],
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'off'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'internal'"],
  [feature, 'leads.length !== 1', 'leads.length < 1'],
  [feature, "lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO", "lead.tipo === 'humano' ? FRASE_REFERENCIA_DESENHO : FRASE_REFERENCIA_PESSOA"],
  [feature, 's.characterNames.length === 1 && ', ''],
  [feature, 'const imageUrl = https(ficha) ? ficha : https(still) ? still : null', 'const imageUrl = https(still) ? still : https(ficha) ? ficha : null'],
  [feature, 'timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL', 'timing?.fixedCharacter'],
  [routeFile, 'if (!kling4Timing.fixedCharacter && kling4TrialCandidate && referenciaUnicaLigada(', 'if (kling4TrialCandidate && referenciaUnicaLigada('],
  [routeFile, '      if (q && a.timing.referenciaUnica) Object.assign(r.timing, { referenciaUnica: a.timing.referenciaUnica })', '      if (false) Object.assign(r.timing, {})'],
]
let mortos = 0
for (const mutant of mutants) {
  assert.ok(local(mutant[0]).includes(mutant[1]), 'mutante não aplica: ' + mutant[1])
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-REFERENCIA-UNICA-2411: off = main byte a byte nos 3 filmes; ligado = pedido A (endpoint, 1 imagem, planos, durações, sem start/middle, frase só no plano do personagem); fallback sem referência/sem personagem/20 s; 'internal' = lista exata; ${mortos}/${mutants.length} mutantes mortos.`)
