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
const estilo = load((file, src) => src)('@/lib/cinematic/visualPromptPolicy.ts') // isStylizedLook real (o que a rota já sabe)
const folhaDaRef = load((file, src) => src)('@/lib/cinematic/folhaDaReferencia2411.ts') // KINEO-FOLHA-DA-REFERENCIA-2411
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
// KINEO-REFERENCIA-UNICA-HUMANO-2411: + o look do filme (styleAnchor real, isStylizedLook real) e o desenho infantil.
// KINEO-FOLHA-DA-REFERENCIA-2411: + as folhas que a rota guardou para a admissão (o módulo real; o guardião dele é scripts/test-folha-da-referencia-2411.mjs)
function admitir(route, f, { email, candidato = true, fixo = null, snapshot, look = 'photoreal', infantil = false, folhas = [], fr = folhaDaRef }) {
  const ini = route.indexOf("if (!kling4Timing.fixedCharacter && kling4TrialCandidate && REFERENCIA_UNICA_2411 !== 'off') {")
  const fim = route.indexOf('// KINEO-K4-SUJEITO-0111 — revisor 01/11', ini)
  assert.ok(ini > 0 && fim > ini, 'admissão nova não achada na rota')
  const ini0 = route.indexOf('const kling4Timing:'), ini1 = route.indexOf('if (ensaioPersonagemFixo && kling4TrialCandidate && classicVisualMode', ini0)
  assert.ok(ini0 > 0 && ini0 < ini1 && ini1 < ini, 'a admissão nova tem de vir depois do personagem fixo')
  const kling4Timing = { voiceovers: [], wordsPerSecond: 2, ...(fixo ? { fixedCharacter: fixo } : {}) }
  Function('kling4Timing', 'kling4TrialCandidate', 'REFERENCIA_UNICA_2411', 'user', 'admitirReferenciaUnica2411', 'qualitySnapshot', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil',
    'retratoDaReferencia2411', 'folhasDaReferencia2411', 'folhaDaReferenciaLigada', 'FOLHA_DA_REFERENCIA_2411',
    ts.transpile(route.slice(ini, fim)))(kling4Timing, candidato, f.REFERENCIA_UNICA_2411, { email }, f.admitirReferenciaUnica2411, snapshot, estilo.isStylizedLook, { look }, { ativo: infantil },
    fr.retratoDaReferencia2411, folhas, fr.folhaDaReferenciaLigada, fr.FOLHA_DA_REFERENCIA_2411)
  return kling4Timing
}

// [revisora 24/11, volta 3] Executa o trecho REAL do claim da rota (kling4_referencia_unica / kling4_referencia_unica_cliente), com o montador real.
function claimDaRota(route, f, api, { prompts, timing }) {
  const ini = route.indexOf('(() => { const e = kling4EnvioDoFilme(); const w = buildKling4TrialInput(')
  const fim = route.indexOf('})()', ini)
  assert.ok(ini > 0 && fim > ini, 'claim da referência única não achado na rota')
  const e = { prompts, approvedStills: prompts.map(() => null), timing }
  return JSON.parse(JSON.stringify(Function('kling4EnvioDoFilme', 'buildKling4TrialInput', 'relatoReferenciaUnica', 'relatoClienteSemReferencia2411', 'kling4Timing',
    'return ' + ts.transpile(route.slice(ini, fim + 4)))(() => e, api.buildKling4TrialInput, f.relatoReferenciaUnica, f.relatoClienteSemReferencia2411, timing)))
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
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const modules = load(source), api = modules('@/' + transport), f = modules('@/' + feature), contas = modules('@/lib/internalAccounts')
  const route = source(routeFile, local(routeFile))

  // (d) o interruptor: 'internal' no commit desde 24/11 (CEO, depois da 4ª revisão limpa) = só a lista EXATA da casa; 'off' = ninguém; 'public' = todos.
  assert.equal(f.REFERENCIA_UNICA_2411, 'public_humano') // [CEO 24/11, KINEO-REFERENCIA-UNICA-HUMANO-2411] a casa como em 'internal'; cliente só pessoa fotorreal
  for (const e of contas.INTERNAL_EXACT_EMAILS) {
    assert.equal(f.referenciaUnicaLigada('internal', e), true, e); assert.equal(f.referenciaUnicaLigada('internal', ' ' + e.toUpperCase() + ' '), true, e)
    assert.equal(f.referenciaUnicaLigada('public_humano', e), true, e); assert.equal(f.referenciaUnicaLigada('public_humano', ' ' + e.toUpperCase() + ' '), true, e)
    assert.equal(f.referenciaUnicaLigada('off', e), false, e)
  }
  for (const e of ['joseph+teste02@gmail.com', 'josephsskaf+x@gmail.com', 'test123@example.com', 'smoketest@x.io', 'qa@shortsforgeai.com', 'joseph@usekineo.com', 'hello@usekineo.com', 'qualquer@usekineo.com', 'cliente@example.org', '', null, undefined]) { // [revisor 24/11, R1] o domínio da casa fora da lista exata fica desligado
    assert.equal(f.referenciaUnicaLigada('internal', e), false, String(e)); assert.equal(f.referenciaUnicaLigada('off', e), false)
    assert.equal(f.referenciaUnicaLigada('public_humano', e), false, String(e)) // sem a guarda, só a casa; o cliente passa por admitirReferenciaUnica2411
  }
  assert.equal(f.referenciaUnicaLigada('public', 'cliente@example.org'), true)

  for (const id of ['2fef3706', '4691e265', '49448973']) {
    const fl = filme(id), prompts = fl.planos.map(p => p.prompt), stills = stillsDe(fl), timing = timingDe(fl)
    // (a) desligado ('off', a volta da chave): a admissão real da rota não põe nada (nem para o fundador) e o pedido é byte a byte o da main.
    for (const email of ['josephsskaf@gmail.com', 'cliente@example.org']) assert.equal('referenciaUnica' in admitir(route, { ...f, REFERENCIA_UNICA_2411: 'off' }, { email, snapshot: snapshots[id] }), false)
    const hoje = await post(api, { prompts, approvedStills: stills, timing }), main = await post(old, { prompts, approvedStills: stills, timing })
    assert.equal(hoje.url, main.url); assert.equal(hoje.body, main.body)
    assert.equal(hoje.url, 'https://queue.fal.run/kling/v4/image-to-video')
    assert.deepEqual(hoje.input.multi_prompt.map(s => s.prompt), fl.planos.map(p => p.prefixo + p.prompt), id + ': o montador reproduz o texto que foi ao Kling 4')
    assert.deepEqual(hoje.input.multi_prompt.map(s => s.duration), fl.planos.map(p => p.duration))
  }

  // (e) [CEO 24/11] a chave em 'internal' (a volta da chave), executada pela admissão real da rota e pelo POST do montador (fetch falso):
  // conta de cliente = o pedido de hoje, byte a byte o da main, e nenhum campo novo; conta da lista exata da casa = o caminho novo.
  // A chave COMO ESTÁ NO COMMIT ('public_humano') é a suiteHumano2411, abaixo.
  { const interno = { ...f, REFERENCIA_UNICA_2411: 'internal' }
    const clientes = ['cliente@example.org', 'CLIENTE@EXAMPLE.ORG', '  cliente@example.org  ', 'josephsskaf@gmai.com', 'josephsskaf+teste@gmail.com', 'joseph+teste01@gmail.co',
      'josephskaf@hotmail.com.br', 'victoriaskaf96@gmail.com.evil.io', 'xjosephsskaf@gmail.com', 'joseph@usekineo.com', 'teste01@shortsforgeai.com.br', '', null, undefined]
    for (const id of ['2fef3706', '4691e265']) {
      const fl = filme(id), prompts = fl.planos.map(p => p.prompt), stills = stillsDe(fl)
      const main = await post(old, { prompts, approvedStills: stills, timing: timingDe(fl) })
      for (const email of clientes) {
        const t = admitir(route, interno, { email, snapshot: snapshots[id] })
        assert.equal('referenciaUnica' in t, false, 'cliente ' + String(email)); assert.equal('referenciaUnicaRecusa' in t, false, 'cliente em internal: nenhum campo novo')
        const envio = await post(api, { prompts, approvedStills: stills, timing: { ...timingDe(fl), ...("referenciaUnica" in t ? { referenciaUnica: t.referenciaUnica } : {}) } })
        assert.equal(envio.url, main.url, 'cliente ' + String(email)); assert.equal(envio.body, main.body, 'cliente ' + String(email) + ': byte a byte o de hoje')
      }
      for (const email of [...contas.INTERNAL_EXACT_EMAILS, ' JosephSSkaf@Gmail.com ']) {
        const t = admitir(route, interno, { email, snapshot: snapshots[id] })
        assert.ok(t.referenciaUnica, 'casa ' + email)
        const envio = await post(api, { prompts, approvedStills: stills, timing: { ...timingDe(fl), ...("referenciaUnica" in t ? { referenciaUnica: t.referenciaUnica } : {}) } })
        assert.equal(envio.url, 'https://queue.fal.run/kling/v4/reference-to-video', 'casa ' + email)
        assert.deepEqual(envio.input.multi_prompt.map(m => m.prompt), fl.pedido_A.input.multi_prompt.map(m => m.prompt), 'casa ' + email + ': o pedido A')
      }
    }
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
    const wireB = api.buildKling4TrialInput(fl.planos.map(p => p.prompt), stillsDe(fl), { ...timingDe(fl), referenciaUnica: t.referenciaUnica })
    assert.equal(JSON.stringify(wireB.input), enviado.body, 'a decisão do montador (planosComFrase) fica FORA do que vai à fal')
    const relato = f.relatoReferenciaUnica({ referenciaUnica: t.referenciaUnica }, wireB)
    assert.deepEqual(JSON.parse(JSON.stringify(relato)), { versao: 'KINEO-REFERENCIA-UNICA-2411', origem, tipo: t.referenciaUnica.tipo, planos: A.input.multi_prompt.length, planos_com_frase: planosComFrase.map(i => i + 1),
      planos_sem_ficha: [], planos_metade: [] }) // KINEO-REFERENCIA-UNICA-PUBLIC-2411: plano da cena inteira com a ficha dele = como antes (nenhuma ficha sai)
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

  // [revisor 24/11, R5] com os DOIS campos, o personagem fixo do fundador ganha, byte a byte.
  const fixo = { imageUrl: 'https://www.usekineo.com/ads/presenters/marcus.webp', continuity: 'Keep the face and outfit of @Image1. Match the clothing and setting of the story.' }
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, fixedCharacter: fixo, referenciaUnica: ru } })).body, (await post(old, { prompts: pr, approvedStills: st, timing: { ...tm, fixedCharacter: fixo } })).body)
  // [revisor 24/11, R9] o teto de 6 planos: 7 planos = null (o caminho de hoje); 6 planos passam.
  const planosDe = (n) => Array.from({ length: n }, (_, i) => ({ prompt: 'The young man walks, step ' + (i + 1) + '.', duration: i < 15 % n ? Math.floor(15 / n) + 1 : Math.floor(15 / n) }))
  assert.equal(planosDe(7).reduce((t, p) => t + p.duration, 0), 15); assert.equal(planosDe(6).reduce((t, p) => t + p.duration, 0), 15)
  assert.equal(api.buildKling4ReferenciaUnicaInput(planosDe(7), ru), null)
  assert.equal(api.buildKling4ReferenciaUnicaInput(planosDe(6), ru).input.multi_prompt.length, 6)

  // [revisor 24/11, volta 1, ponto 2] retrato torto, com a obra LIGADA ('internal' para o fundador e 'public'): nada lança, nada liga, o caminho de hoje.
  const ruins = [null, undefined, { ...s0, characters: null }, (({ approvedStills, ...x }) => x)(s0), (({ characterReferences, ...x }) => x)(s0),
    { ...s0, characterReferences: [], approvedStills: [{ url: 'https://x.org/k.png' }] }, { ...s0, characterReferences: [{ nome: lead.nome }], approvedStills: [] },
    { ...s0, characters: [] }, { ...s0, characters: [lead, { ...lead, nome: 'the friend' }] }, { ...s0, characters: [{ ...lead, nome: undefined }] },
    { ...s0, characterReferences: [{ nome: lead.nome, url: 'https://x.org/a b.jpg' }] }]
  assert.equal(ruins.length, 11)
  const publico = { ...f, REFERENCIA_UNICA_2411: 'public' }
  for (const [i, snap] of ruins.entries()) {
    let r
    try { r = f.referenciaUnicaDoFilme(snap) } catch { assert.fail('referenciaUnicaDoFilme lançou no retrato ruim ' + i) }
    assert.equal(r, null, 'retrato ruim ' + i)
    for (const [mod, email] of [[ligado, casa], [publico, 'cliente@example.org'], [publico, casa]]) {
      let t
      try { t = admitir(route, mod, { email, snapshot: snap }) } catch { assert.fail('a admissão lançou no retrato ruim ' + i) }
      assert.equal('referenciaUnica' in t, false)
    }
  }
  // e se a escolha lançar mesmo assim: a rota cai no caminho de hoje, sem derrubar o filme
  for (const mod of [ligado, publico, { ...f, REFERENCIA_UNICA_2411: 'public_humano' }]) {
    let t
    for (const email of [casa, 'cliente@example.org']) {
      try { t = admitir(route, { ...mod, admitirReferenciaUnica2411: () => { throw new TypeError('offline') } }, { email, snapshot: s0 }) } catch { assert.fail('a rota deixou o erro subir') }
      assert.equal('referenciaUnica' in t, false); assert.equal('referenciaUnicaRecusa' in t, false)
    }
  }

  // [revisor 24/11, volta 1, ponto 3] os juízes leem o MESMO texto: o juiz de antes (sem imagens, sem referência) e o juiz do plano / A2 (o envio,
  // sem a frase de referência) → juizLeuOMesmoTexto verdadeiro nos 3 filmes; o pedido à fal continua com a frase.
  const juiz = modules('@/lib/juizDoPlano'), ficha = modules('@/lib/cinematic/fichaAntesDoRender1311')
  for (const [id, snap] of [['2fef3706', '2fef3706'], ['4691e265', '4691e265'], ['49448973', '49448973-com-elenco']]) {
    const fl = filme(id), ps = fl.planos.map(p => p.prompt), falas = fl.planos.map(p => p.prompt.slice(0, 20)), t0 = timingDe(fl)
    const tRef = { ...t0, referenciaUnica: f.referenciaUnicaDoFilme(snapshots[snap]) }
    const antes = juiz.planoDoEnvio({ kling4Candidato: true, kling4Input: () => api.buildKling4TrialInput(ps, [], t0).input, falas, inputs: [] }).cenas
    const wire = api.buildKling4TrialInput(ps, stillsDe(fl), tRef)
    assert.equal(wire.model, 'kling/v4/reference-to-video')
    const doJuiz = juiz.planoDoEnvio({ kling4Candidato: true, kling4Input: () => f.entradaDoJuiz2411(tRef, wire), falas, inputs: [] }).cenas
    assert.equal(ficha.juizLeuOMesmoTexto(antes, doJuiz), true, id + ': o juiz leu o mesmo texto')
    assert.equal(ficha.juizLeuOMesmoTexto(antes, juiz.planoDoEnvio({ kling4Candidato: true, kling4Input: () => wire.input, falas, inputs: [] }).cenas), false, id + ': com a frase, seria outra leitura')
    assert.ok(wire.input.multi_prompt.some(m => m.prompt.includes('@Image1')), 'o pedido à fal continua com a frase')
    const hojeWire = api.buildKling4TrialInput(ps, stillsDe(fl), t0)
    assert.equal(f.entradaDoJuiz2411(t0, hojeWire), hojeWire.input, 'desligado: a mesma entrada, intocada')
  }
  // [revisor 24/11, volta 2] a conferência do reaproveitamento REAL da rota (envioFinal1311 + reaproveitaJuiz1311), executada: ligada, o juiz de antes e o
  // envio leem o mesmo texto → reaproveita; texto lido diferente → 2ª leitura. Pular a conferência ou fazer o juiz ler outro texto reprova aqui.
  const iF = route.indexOf('const envioFinal1311 = '), iR = route.indexOf('const reaproveitaJuiz1311 = ', iF)
  assert.ok(iF > 0 && iR > iF, 'conferência do reaproveitamento não achada')
  const conferencia = Function('kling4Trial', 'vereditoAntes1311', 'lidoPeloJuiz1311', 'planoDoEnvio', 'kling4EnvioDoFilme', 'entradaDoJuiz2411', 'buildKling4TrialInput', 'juizLeuOMesmoTexto', 'scenes', 'classicSceneInputs',
    ts.transpile(route.slice(iF, route.indexOf('\n', iR))) + '\nreturn reaproveitaJuiz1311')
  for (const [id, snap] of [['2fef3706', '2fef3706'], ['4691e265', '4691e265'], ['49448973', '49448973-com-elenco']]) {
    const fl = filme(id), ps = fl.planos.map(p => p.prompt), t0 = timingDe(fl), scenes = fl.planos.map(p => ({ voiceover: p.prompt.slice(0, 20) }))
    const falas = scenes.map(s => s.voiceover)
    const lido = juiz.planoDoEnvio({ kling4Candidato: true, kling4Input: () => api.buildKling4TrialInput(ps, [], t0).input, falas, inputs: [] }).cenas
    for (const timing of [{ ...t0, referenciaUnica: f.referenciaUnicaDoFilme(snapshots[snap]) }, t0]) {
      const roda = (l) => conferencia({ job: {} }, { status: 'JUDGED' }, l, juiz.planoDoEnvio, () => ({ prompts: ps, approvedStills: stillsDe(fl), timing }), f.entradaDoJuiz2411, api.buildKling4TrialInput, ficha.juizLeuOMesmoTexto, scenes, [])
      assert.equal(roda(lido), true, id + ': mesmo texto = reaproveita (' + (timing.referenciaUnica ? 'ligado' : 'desligado') + ')')
      assert.equal(roda(lido.map((c, i) => i === 0 ? { ...c, prompt: c.prompt + ' Extra.' } : c)), false, id + ': texto lido diferente = 2ª leitura')
      // [revisor 24/11, volta 3, RM3] veredito que não é JUDGED nunca é reaproveitado
      for (const status of ['FAILED', 'TIMEOUT', undefined]) assert.equal(conferencia({ job: {} }, { status }, lido, juiz.planoDoEnvio, () => ({ prompts: ps, approvedStills: stillsDe(fl), timing }), f.entradaDoJuiz2411, api.buildKling4TrialInput, ficha.juizLeuOMesmoTexto, scenes, []), false, id + ': veredito ' + status)
    }
  }
  // só a frase que nós pusemos sai para o juiz: a mesma frase escrita pelo cliente no meio do plano fica
  { const cli = 'The young man reads a note: Keep the face and outfit of @Image1. He smiles. Mouth closed, no speaking.'
    const w = api.buildKling4TrialInput([cli], [], { voiceovers: ['one two three'], wordsPerSecond: 1, referenciaUnica: ru })
    assert.equal(w.model, 'kling/v4/reference-to-video')
    assert.equal(w.input.multi_prompt[0].prompt.split('Keep the face and outfit of @Image1.').length - 1, 2, 'vizinho a: a do cliente e a nossa vão ao motor')
    assert.equal(f.entradaDoJuiz2411({ referenciaUnica: ru }, w).multi_prompt[0].prompt, cli, 'vizinho a: o juiz perde só a nossa') }
  // [revisor 24/11, volta 3] uma fonte só: a frase sai para o juiz SÓ nos planos em que o montador a pôs (planosComFrase). Texto exato do juiz.
  { const R = ' Keep the face and outfit of @Image1.', M = ' Mouth closed, no speaking.'
    const planos = [
      { prompt: 'The young man waves at the camera.' + M, duration: 3 },             // 1 com o personagem, com a cauda
      { prompt: 'A red car drives off.' + R, duration: 3 },                          // 2 SEM o personagem, frase do cliente no fim, sem cauda
      { prompt: 'A red car drives off.' + R + M, duration: 3 },                      // 3 SEM o personagem, frase do cliente antes da cauda
      { prompt: 'The young man runs away into the night.', duration: 3 },           // 4 com o personagem, SEM a cauda (FM1)
      { prompt: 'The old woman smiles at the young man and waves.' + M, duration: 3 }, // 5 dois personagens: o principal está → frase
    ]
    const w = api.buildKling4ReferenciaUnicaInput(planos, ru)
    assert.deepEqual([...w.planosComFrase], [true, false, false, true, true])
    assert.deepEqual(w.input.multi_prompt.map(m => m.prompt), [
      'The young man waves at the camera.' + R + M, 'A red car drives off.' + R, 'A red car drives off.' + R + M,
      'The young man runs away into the night.' + R, 'The old woman smiles at the young man and waves.' + R + M])
    assert.deepEqual(f.entradaDoJuiz2411({ referenciaUnica: ru }, w).multi_prompt.map(m => m.prompt), [
      'The young man waves at the camera.' + M, 'A red car drives off.' + R, 'A red car drives off.' + R + M,
      'The young man runs away into the night.', 'The old woman smiles at the young man and waves.' + M], 'o juiz lê o que foi ao motor menos a NOSSA frase')
    assert.deepEqual(JSON.parse(JSON.stringify(f.relatoReferenciaUnica({ referenciaUnica: ru }, w))).planos_com_frase, [1, 4, 5], 'o claim conta a decisão do montador, não a frase do cliente')
    // vizinho c: dois personagens, plano só com o outro = sem frase, e o juiz não perde nada
    const so = api.buildKling4ReferenciaUnicaInput([{ prompt: 'The old woman waits at the door.' + M, duration: 7 }, { prompt: 'The young man arrives.' + M, duration: 8 }], ru)
    assert.deepEqual([...so.planosComFrase], [false, true]); assert.equal(f.entradaDoJuiz2411({ referenciaUnica: ru }, so).multi_prompt[0].prompt, 'The old woman waits at the door.' + M)
    // vizinho b [KINEO-REFERENCIA-UNICA-PUBLIC-2411, ponto 2]: o nome só dentro de fala entre aspas NÃO põe o personagem na imagem: sem frase (sozinho = null, o caminho de hoje)
    assert.equal(api.buildKling4ReferenciaUnicaInput([{ prompt: 'A woman shouts "young man, come back!" across the street.' + M, duration: 15 }], ru), null)
    const aspas = api.buildKling4ReferenciaUnicaInput([{ prompt: 'A woman shouts "young man, come back!" across the street.' + M, duration: 7 }, { prompt: 'The young man turns around.' + M, duration: 8 }], ru)
    assert.deepEqual([...aspas.planosComFrase], [false, true]); assert.equal(aspas.input.multi_prompt[0].prompt, 'A woman shouts "young man, come back!" across the street.' + M)
    // vizinho d: plano que cita o personagem e fica SEM a frase não existe — o montador põe em todo plano que cita, ou devolve null (caminho de hoje, sem referência nenhuma)
    for (const lote of [planos, [{ prompt: 'The young man waits.', duration: 15 }]]) {
      const x = api.buildKling4ReferenciaUnicaInput(lote, ru)
      lote.forEach((p, i) => assert.equal(x.planosComFrase[i], api.planoMostraOPersonagem(p.prompt, ru.nomes, { descricao: ru.descricao })))
      x.input.multi_prompt.forEach((m, i) => assert.equal(x.planosComFrase[i], m.prompt !== lote[i].prompt))
    }
    // sem a decisão do montador (envio montado por outro caminho): o juiz não perde nada
    assert.deepEqual(f.entradaDoJuiz2411({ referenciaUnica: ru }, { model: w.model, input: w.input }).multi_prompt.map(m => m.prompt), w.input.multi_prompt.map(m => m.prompt))
  }

  // na rota, os lugares em que o juiz lê o envio (A2 ×3 + eco, juiz do plano ×2) passam por entradaDoJuiz2411; o envio e o claim, não
  assert.equal(route.split('(buildKling4TrialInput(e.prompts, e.approvedStills, e.timing).input.multi_prompt as Array<{ prompt: string }>)').length - 1, 0)
  assert.equal(route.split('(entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)).multi_prompt as Array<{ prompt: string }>)').length - 1, 4)
  assert.equal(route.split('return entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */').length - 1, 2)
  assert.ok(route.includes('scene_fal_inputs: [(() => { const e = kling4EnvioDoFilme(); return buildKling4TrialInput(e.prompts, e.approvedStills, e.timing).input })()]'))
  assert.ok(route.includes('return submitKling4TrialVideo(kling4PorSecao({'))

  // O teto de 512 do plano: a frase e a proteção da boca ficam inteiras.
  const longo = 'Photoreal film. The young man ' + 'walks through the long corridor of mirrors, '.repeat(20) + 'Mouth closed, no speaking.'
  const pl = api.buildKling4ReferenciaUnicaInput([{ prompt: longo, duration: 15 }], ru).input.multi_prompt[0].prompt
  assert.ok(Array.from(pl).length <= 512 && pl.endsWith(' Keep the face and outfit of @Image1. Mouth closed, no speaking.') && pl.startsWith('Photoreal film. The young man walks'), pl)

  // O plano por seção (kling4PorSecao real da rota) leva a referência; sem ela, nada muda. KINEO-REFERENCIA-UNICA-PUBLIC-2411: com cena fundida, a referência
  // leva também quais planos são METADE ([[0],[1,2],[3]] → [false, true, true, false]); sem fundir, a mesma referência, intocada.
  for (const merged of [false, true]) {
    const r = porSecao(route, modules, merged, ru)
    if (merged) assert.deepEqual(JSON.parse(JSON.stringify(r.timing.referenciaUnica ?? null)), JSON.parse(JSON.stringify({ ...ru, metades: [false, true, true, false] })), 'merged')
    else assert.equal(r.timing.referenciaUnica, ru, 'merged=false')
    assert.equal('referenciaUnica' in porSecao(route, modules, merged, null).timing, false)
  }
  // O claim só ganha o campo quando a referência única foi usada.
  assert.ok(route.includes("const w = buildKling4TrialInput(e.prompts, e.approvedStills, e.timing); const ru = relatoReferenciaUnica(e.timing, w); const sem = ru ? null : relatoClienteSemReferencia2411(kling4Timing, w); return ru ? { kling4_referencia_unica: ru } : sem ? { kling4_referencia_unica_cliente: sem } : {}"))

  await suitePublic2411({ api, f, route })
  await suiteHumano2411({ api, f, route })
}

// ═══ KINEO-REFERENCIA-UNICA-PUBLIC-2411 — os 3 filmes da prova paga 2 de 24/11 (Le Prince 92ce1a8e, Slocum ff5c515e, Cooper 582cead7) ═══════════════
// shots = o que chegou ao montador; enviado = o multi_prompt que foi à fal (conferido por SELECT em cinematic_submission_claim.response.scene_fal_inputs);
// metades = kling4_planos.secoes_por_cena do mesmo claim; canonica = quality_snapshot.characters[0].canonica (só o começo, até a origem).
const pub = JSON.parse(readFileSync('scripts/test-support/referencia-unica-public-2411-filmes.json', 'utf8'))
const antesSrc = execFileSync('git', ['show', 'c854849c8:' + transport], { encoding: 'utf8', maxBuffer: 8_000_000 }).replaceAll('\r\n', '\n') // a main de 24/11 (o que rodou na prova)
const antes = load((file, src) => file === transport ? antesSrc : src)('@/' + transport)
const FRASE_P = 'Keep the face and outfit of @Image1.'
const BOCA = ' Mouth closed, no speaking.'
const comFrase = p => p.endsWith(BOCA) ? p.slice(0, -BOCA.length) + ' ' + FRASE_P + BOCA : p + ' ' + FRASE_P
const DEPOIS = { leprince: [1, 2, 4], slocum: [1, 2, 3], cooper: [1, 2, 3] }
const SEM_FICHA = { leprince: [3], slocum: [], cooper: [4] }
const SEM_O_PERSONAGEM = { // o texto exato que vai à fal no plano sem ele
  leprince: { 3: 'Photoreal film. Wide shot. An empty vintage train compartment, with plush seats and wooden paneling, gently sways as the train slows. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.' },
  cooper: { 4: 'Photoreal film. Medium shot. Period setting: 1971 (1970s). Old dollar bills partially buried in wet river sand glisten under dim light. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.' },
}
const FICHA_NO_TEXTO_RE = /Identity:|Visible:|The only person in this shot|The same main character appears in this scene/
const snapDe = fl => ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ ...fl.personagem }],
  characterReferences: [{ nome: fl.personagem.nome, url: fl.ficha }], approvedStills: [] })
const refDe = (f, fl) => ({ ...f.referenciaUnicaDoFilme(snapDe(fl)), metades: fl.metades })
// a fala de cada plano CITA o nome (a decisão não pode vir dela): mesma contagem de palavras = mesmas durações (régua pela voz)
const timingPub = (fl, nome) => ({ voiceovers: fl.shots.map(s => [nome, ...Array.from({ length: s.duration - 1 }, () => 'word')].join(' ')), wordsPerSecond: 2.5, pelaVoz: { segundosDaVoz: 15 } })
const indices = bs => bs.flatMap((m, i) => m ? [i + 1] : [])

// Os 8 roteiros da revisora (docs/revisoes-2311/CEO-REFERENCIA-UNICA-FINAL-2411.md, §3; redação refeita aqui a partir da tabela dela): ficha Identity: em
// TODO plano, como no Cooper. "mostra" = os planos em que o personagem aparece (chamado por nome, pronome, papel, espécie ou parte do corpo); os demais
// são ausência ou outra pessoa. Como plano da cena inteira, todo plano com a ficha dele FICA com a ficha e a frase (24 de 24; a main dava o mesmo).
const ficha = (nome, desc) => `Photoreal film. Identity: ${nome}, exactly as the author wrote: "${desc}"; appearance anchors: 30-40, light skin.`
const plano = (nome, desc, acao) => `${ficha(nome, desc)} ${acao} no readable text, letters, numbers, labels or signage${BOCA}`
const REVISORA = [
  { nome: 'Amelia Earhart', nucleo: 'Earhart', tipo: 'humano', desc: 'aviator in a leather flight jacket', mostra: [0, 1, 2], acoes: ['Amelia Earhart climbs into the cockpit of her silver plane.', 'She waves from the cockpit as the engine roars.', 'Her navigator Fred Noonan studies a chart beside her.', 'An empty stretch of Pacific ocean lies under gray clouds.'] },
  { nome: 'Harry Houdini', nucleo: 'Houdini', tipo: 'humano', desc: 'escape artist in chains', mostra: [0, 1, 2], acoes: ['Harry Houdini is lowered upside down into a water tank.', 'The escape artist twists free of the chains underwater.', 'He bows to the stunned crowd.', 'Men and women in the audience gasp in their seats.'] },
  { nome: 'Rex', nucleo: 'Rex', tipo: 'animal', desc: 'golden retriever puppy', mostra: [0, 1, 2], acoes: ['Rex chases a red ball across the lawn.', 'The puppy runs across the snowy yard.', 'The golden retriever sleeps by the fireplace.', 'A red ball rests on the wet grass.'] },
  { nome: 'Captain Genius', nucleo: 'Genius', tipo: 'criatura', desc: 'cartoon superhero with a blue cape', mostra: [0, 1, 2], acoes: ['Captain Genius lands on the rooftop.', 'The superhero lifts a falling bus.', 'The tiny hero waves at the crowd.', 'A city skyline glows at night.'] },
  { nome: 'Fraise', nucleo: 'Fraise', tipo: 'criatura', desc: 'strawberry with big cartoon eyes', mostra: [0, 1, 2], acoes: ['Fraise tiptoes through the dark forest.', 'The strawberry trembles behind a mushroom.', 'The terrified strawberry gasps in shock.', 'Shadows stretch across the forest floor.'] },
  { nome: 'Dan Cooper', nucleo: 'Cooper', tipo: 'humano', desc: 'man in a dark suit and black tie', mostra: [0, 1, 2], acoes: ['Dan Cooper boards the jet.', 'The hijacker leaps into the dark rain.', 'He drifts down under a parachute.', 'A young boy finds bundles of old dollar bills on a sandy riverbank.'] },
  { nome: 'Marie Curie', nucleo: 'Curie', tipo: 'humano', desc: 'scientist in a long black dress', mostra: [0, 1, 2], acoes: ['Marie Curie peers at a glowing vial.', 'Her hands pour a pale liquid into a beaker.', 'The scientist writes notes by lamplight.', 'A glowing vial sits on the empty lab bench.'] },
  { nome: 'Jack', nucleo: 'Jack', tipo: 'criatura', desc: 'roblox-style blocky character', mostra: [0, 1, 2], acoes: ['Jack jumps across the floating blocks.', 'The roblox-style character runs from the lava.', 'The blocky hero celebrates on the tower.', 'Floating blocks drift over a lava lake.'] },
]
const durs = [4, 4, 4, 3]

async function suitePublic2411({ api, f, route }) {
  for (const fl of pub.filmes) {
    const shots = fl.shots, prompts = shots.map(s => s.prompt), nucleo = fl.personagem.nucleo
    const ref = refDe(f, fl)
    assert.ok(ref.imageUrl === fl.ficha && ref.origem === 'ficha' && typeof ref.descricao === 'string', fl.id)
    // ANTES (a main que rodou na prova): o montador reproduz byte a byte o que foi à fal, e a frase entrou onde o NOME estava escrito
    const velho = antes.buildKling4ReferenciaUnicaInput(shots, { imageUrl: fl.ficha, frase: FRASE_P, nomes: ref.nomes })
    assert.deepEqual(velho.input.multi_prompt.map(m => m.prompt), fl.enviado, fl.id + ': o fixture é o que foi à fal')
    assert.deepEqual(indices(velho.planosComFrase), fl.planos_com_frase_no_ar, fl.id + ': a causa (antes)')
    // DEPOIS
    const w = api.buildKling4ReferenciaUnicaInput(shots, ref)
    assert.deepEqual(indices(w.planosComFrase), DEPOIS[fl.id], fl.id + ': planos_com_frase depois')
    w.input.multi_prompt.forEach((m, i) => {
      assert.equal(m.duration, shots[i].duration)
      if (w.planosComFrase[i]) {
        assert.equal(m.prompt, fl.planos_com_frase_no_ar.includes(i + 1) ? fl.enviado[i] : comFrase(prompts[i]), `${fl.id} plano ${i + 1} com a frase`)
      } else {
        // o plano sem ele: sem a frase e sem ninguém que o ponha lá por outro caminho (ficha, ordem, cláusula, nome como quem age)
        assert.ok(!m.prompt.includes('@Image1') && !FICHA_NO_TEXTO_RE.test(m.prompt), `${fl.id} plano ${i + 1}: ${m.prompt}`)
        assert.equal(api.planoMostraOPersonagem(m.prompt, ref.nomes, { descricao: ref.descricao, metade: ref.metades[i] }), false)
        assert.equal(m.prompt, SEM_O_PERSONAGEM[fl.id]?.[i + 1] ?? prompts[i], `${fl.id} plano ${i + 1} sem o personagem`)
      }
    })
    assert.deepEqual(indices((w.fichaRetirada ?? []).map(t => typeof t === 'string')), SEM_FICHA[fl.id], fl.id + ': planos sem a ficha')
    // sem a informação das metades (envio montado sem o plano por seção) = todo plano é a cena inteira: a frase fica onde a ficha/nome está (como antes),
    // salvo o nome só na posse sem corpo (Slocum 4) e o homem que repete a descrição dele (Le Prince 1)
    const inteiras = api.buildKling4ReferenciaUnicaInput(shots, { ...ref, metades: undefined })
    assert.deepEqual(indices(inteiras.planosComFrase), { leprince: [1, 2, 3, 4], slocum: [1, 2, 3], cooper: [1, 2, 3, 4] }[fl.id], fl.id + ': sem metades')
    // o relato do claim e o juiz (que lê o texto que o montador recebeu, sem 2ª leitura paga)
    const relato = JSON.parse(JSON.stringify(f.relatoReferenciaUnica({ referenciaUnica: ref }, w)))
    assert.deepEqual([relato.planos_com_frase, relato.planos_sem_ficha, relato.planos_metade], [DEPOIS[fl.id], SEM_FICHA[fl.id], indices(fl.metades)])
    assert.deepEqual(f.entradaDoJuiz2411({ referenciaUnica: ref }, w).multi_prompt.map(m => m.prompt), prompts, fl.id + ': o juiz lê o texto de antes da referência')
    // a fala que cita o nome ("Neither Slocum nor his boat was ever seen again.") não decide: pelo envio inteiro (buildKling4TrialInput), o mesmo pedido
    const timing = timingPub(fl, nucleo)
    const viaEnvio = api.buildKling4TrialInput(prompts, [], { ...timing, referenciaUnica: ref })
    assert.equal(JSON.stringify(viaEnvio.input), JSON.stringify(w.input), fl.id + ': a fala não muda nada'); assert.deepEqual(indices(viaEnvio.planosComFrase), DEPOIS[fl.id])
    // 'off' (sem referência) = byte a byte a main da prova, com e sem imagens-chave
    for (const stills of [[], [fl.ficha, null, 'https://example.org/offline/k2.png', null]]) {
      const hoje = await post(api, { prompts, approvedStills: stills, timing }), main = await post(antes, { prompts, approvedStills: stills, timing })
      assert.equal(hoje.url, main.url); assert.equal(hoje.body, main.body, fl.id + ': off = o de hoje')
    }
    // em 'internal': cliente não alcança, nem nestes filmes; a casa exata sim ('public_humano', a chave do commit, liga o cliente aqui: suiteHumano2411)
    for (const email of ['cliente@example.org', 'joseph@usekineo.com', null]) assert.equal('referenciaUnica' in admitir(route, { ...f, REFERENCIA_UNICA_2411: 'internal' }, { email, snapshot: snapDe(fl) }), false, String(email))
    assert.ok(admitir(route, f, { email: 'josephsskaf@gmail.com', snapshot: snapDe(fl) }).referenciaUnica)
  }

  // Os 8 roteiros da revisora: o personagem chamado por pronome, papel, espécie ou parte do corpo NUNCA perde a ficha nem a frase no plano da cena inteira
  let mostram = 0, comAsDuas = 0
  for (const rt of REVISORA) {
    const snap = { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: rt.nome, nucleo: rt.nucleo, tipo: rt.tipo, protagonista: true, canonica: `${rt.nome}, exactly as the author wrote: "${rt.desc}"; appearance anchors: 30-40` }],
      characterReferences: [{ nome: rt.nome, url: 'https://example.org/offline/ficha.png' }], approvedStills: [] }
    const ref = f.referenciaUnicaDoFilme(snap)
    const shots = rt.acoes.map((a, i) => ({ prompt: plano(rt.nome, rt.desc, a), duration: durs[i] }))
    const w = api.buildKling4ReferenciaUnicaInput(shots, ref)
    const velho = antes.buildKling4ReferenciaUnicaInput(shots, { imageUrl: ref.imageUrl, frase: ref.frase, nomes: ref.nomes })
    assert.equal(JSON.stringify(w.input), JSON.stringify(velho.input), rt.nome + ': plano da cena inteira com a ficha dele = a main, byte a byte')
    for (const i of rt.mostra) { mostram++; if (w.planosComFrase[i] && /Identity:/.test(w.input.multi_prompt[i].prompt)) comAsDuas++ }
    // a mesma pessoa estranha SEM a ficha dele (o menino de 1980, a plateia, o pescador) não ganha a frase; o homem que repete a descrição dele, sim
    const estranho = api.buildKling4ReferenciaUnicaInput([shots[0], { prompt: `Photoreal film. ${rt.acoes[3]} no readable text${BOCA}`, duration: 11 }], ref)
    assert.deepEqual([...estranho.planosComFrase], [true, false], rt.nome + ': o estranho sem a ficha')
  }
  assert.deepEqual([mostram, comAsDuas], [24, 24], 'os 24 planos em que o personagem aparece ficam com a ficha e a frase')
  // os mesmos 24, como METADE de cena fundida (ficha herdada): ficam pelo pronome, corpo, nome ou por repetir UMA palavra da descrição dele ("The strawberry",
  // "The scientist", "The escape artist"); a ausência de cada roteiro sai
  for (const rt of REVISORA) {
    const ref = f.referenciaUnicaDoFilme({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: rt.nome, nucleo: rt.nucleo, tipo: rt.tipo, protagonista: true, canonica: `${rt.nome}, exactly as the author wrote: "${rt.desc}"` }], characterReferences: [{ nome: rt.nome, url: 'https://example.org/offline/ficha.png' }], approvedStills: [] })
    rt.acoes.forEach((a, i) => assert.equal(api.planoMostraOPersonagem(plano(rt.nome, rt.desc, a), ref.nomes, { descricao: ref.descricao, metade: true }), rt.mostra.includes(i) || /audience|boy finds/.test(a), rt.nome + ' metade: ' + a))
  }
  // LIMITE CONHECIDO (texto do plano não fecha; ver o relatório): papel sem nome, sem pronome e sem palavra da descrição, numa METADE, sai com a ficha
  assert.equal(api.planoMostraOPersonagem(plano('Dan Cooper', 'man in a dark suit and black tie', 'The hijacker leaps from the rear stairs.'), ['Dan Cooper', 'Cooper'], { descricao: 'man in a dark suit and black tie', metade: true }), false)
  const cooper = refDe(f, pub.filmes.find(x => x.id === 'cooper'))
  for (const estranho of ['A fisherman on another boat spots floating wreckage.', 'A man in a bowler hat reads about the disappearance.', 'A young boy in a dark raincoat finds old dollar bills.'])
    assert.equal(api.planoMostraOPersonagem(`Photoreal film. ${estranho}${BOCA}`, cooper.nomes, { descricao: cooper.descricao }), false, estranho)
  assert.equal(api.planoMostraOPersonagem(`Photoreal film. A man in a dark suit and black tie lights a cigarette.${BOCA}`, cooper.nomes, { descricao: cooper.descricao }), true)
  // na METADE de cena fundida (a ficha herdada): pronome, parte do corpo, silhueta e gente sem nome ficam com ela; só objeto ou lugar sai
  const fichaCooper = 'Photoreal film. Identity: Dan Cooper, a man, exactly as the author wrote; appearance anchors: 30-40, dark brown; as the request describes: man in a dark suit and black.'
  for (const [acao, fica] of [['He drifts down under a parachute.', true], ['His hands grip the parachute straps.', true], ['Seen from behind, a silhouette in a long coat walks away.', true],
    ['A crowd of passengers waits at the gate.', true], ['Old dollar bills glisten in the wet river sand.', false], ['An empty airport runway lies under heavy rain.', false]])
    assert.equal(api.planoMostraOPersonagem(`${fichaCooper} ${acao}${BOCA}`, cooper.nomes, { descricao: cooper.descricao, metade: true }), fica, acao)
  // a ausência que a rota já marca ("No people, no human figures and no faces anywhere in this shot.") tira a ficha mesmo no plano da cena inteira
  const marcado = `${fichaCooper} No people, no human figures and no faces anywhere in this shot. Rain falls on an empty runway.${BOCA}`
  const mk = api.buildKling4ReferenciaUnicaInput([{ prompt: plano('Dan Cooper', 'man in a dark suit and black tie', 'Dan Cooper boards the jet.'), duration: 8 }, { prompt: marcado, duration: 7 }], cooper)
  assert.deepEqual([...mk.planosComFrase], [true, false]); assert.ok(!/Identity:|@Image1/.test(mk.input.multi_prompt[1].prompt))

  // Ponto 2: o nome SÓ dentro de fala entre aspas não põe o personagem na imagem (antes punha: a mesma frase do Slocum)
  const slocum = refDe(f, pub.filmes.find(x => x.id === 'slocum'))
  const aspas = 'Photoreal film. An old ship radio crackles "Slocum, come back!" over an empty harbor.' + BOCA, ele = 'Photoreal film. Joshua Slocum waves from the deck of his sloop.' + BOCA
  assert.deepEqual([...antes.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 7 }, { prompt: ele, duration: 8 }], { imageUrl: slocum.imageUrl, frase: FRASE_P, nomes: slocum.nomes }).planosComFrase], [true, true], 'antes: o nome entre aspas punha a frase')
  const sem = { ...slocum, metades: undefined }
  // metades de OUTRO tamanho (outro envio) não decidem: todo plano é a cena inteira, e a ficha dele fica
  const vazioComFicha = 'Photoreal film. Identity: Joshua Slocum, an old bearded sailor. An empty harbor at dawn.' + BOCA
  assert.deepEqual([...api.buildKling4ReferenciaUnicaInput([{ prompt: ele, duration: 7 }, { prompt: vazioComFicha, duration: 8 }], { ...slocum, metades: [true, true, true] }).planosComFrase], [true, true])
  assert.deepEqual([...api.buildKling4ReferenciaUnicaInput([{ prompt: ele, duration: 7 }, { prompt: vazioComFicha, duration: 8 }], { ...slocum, metades: [false, true] }).planosComFrase], [true, false])
  const p2 = api.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 7 }, { prompt: ele, duration: 8 }], sem)
  assert.deepEqual([...p2.planosComFrase], [false, true]); assert.equal(p2.input.multi_prompt[0].prompt, aspas)
  assert.equal(api.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 15 }], sem), null, 'só as aspas = o caminho de hoje')
  // posse sem corpo não é ele; posse com corpo é
  assert.equal(api.planoMostraOPersonagem("Photoreal film. Slocum's empty sloop drifts on a calm sea." + BOCA, slocum.nomes, {}), false)
  assert.equal(api.planoMostraOPersonagem("Photoreal film. Slocum's weathered hands grip the wheel." + BOCA, slocum.nomes, {}), true)
  // outro caminho: a ORDEM do protagonista e a cláusula da ficha. Na cena inteira são a decisão da rota (ficam, com a frase); na METADE de ausência
  // saem com ele. O sujeito obrigatório que o nomeia (garantirSujeitoNoUltimo1911) o mostra: leva a frase. Nenhum plano sem a frase fica com ele.
  const ordem = 'Photoreal film. The only person in this shot is the same main character (an old bearded sailor (65)); any other person described below is replaced by this same character. An empty gray ocean horizon stretches at dusk.' + BOCA
  const clausula = 'Photoreal film. The same main character appears in this scene, consistent design: Joshua Slocum, an old bearded sailor. An empty harbor at dawn, gulls over the water.' + BOCA
  const sujeito = 'Photoreal film. Main subject clearly visible in frame: Joshua Slocum. A calm gray sea at dusk.' + BOCA
  const tres = [{ prompt: ordem, duration: 5 }, { prompt: clausula, duration: 5 }, { prompt: sujeito, duration: 5 }]
  assert.deepEqual([...api.buildKling4ReferenciaUnicaInput(tres, { ...slocum, metades: [false, false, false] }).planosComFrase], [true, true, true])
  const outro = api.buildKling4ReferenciaUnicaInput(tres, { ...slocum, metades: [true, true, true] })
  assert.deepEqual([...outro.planosComFrase], [false, false, true])
  assert.deepEqual(outro.input.multi_prompt.slice(0, 2).map(m => m.prompt), ['Photoreal film. An empty gray ocean horizon stretches at dusk.' + BOCA, 'Photoreal film. An empty harbor at dawn, gulls over the water.' + BOCA])
  // a linha de estilo que sobra da ficha com frase própria (texto NOSSO, lib/cinematic/elencoTrava) não é gente pedida, e sai com a ficha dele (metade)
  const menino = { imageUrl: slocum.imageUrl, frase: FRASE_P, nomes: ['the boy', 'boy'], metades: [true, false] }
  const porta = 'Photoreal film. A colorful door swings open wide. Visible: the boy, a nine-year-old boy with short dark hair. He; a real person filmed in photorealistic live action, natural skin texture and real fabric.' + BOCA
  const m2 = api.buildKling4ReferenciaUnicaInput([{ prompt: porta, duration: 7 }, { prompt: 'Photoreal film. The boy runs through the door.' + BOCA, duration: 8 }], menino)
  assert.deepEqual([...m2.planosComFrase], [false, true]); assert.equal(m2.input.multi_prompt[0].prompt, 'Photoreal film. A colorful door swings open wide.' + BOCA)
}

await suite()
// ═══ KINEO-REFERENCIA-UNICA-HUMANO-2411 [CEO 24/11] — a chave COMO ESTÁ NO COMMIT ('public_humano'), pela admissão real da rota e pelo POST do montador ═══
// Cliente recebe a referência única SÓ com pessoa fotorreal e um protagonista (o caminho provado: Le Prince, Slocum e Cooper, notas cegas 10, 8 e 9).
// Bicho, criatura, desenho e mais de um protagonista = o pedido de hoje, byte a byte, e no claim só o código do motivo. A casa recebe tudo como em 'internal'.
async function suiteHumano2411({ api, f, route }) {
  const cliente = 'cliente@example.org', casa = 'josephsskaf@gmail.com'
  assert.equal(f.REFERENCIA_UNICA_2411, 'public_humano')
  // 1. cliente + humano fotorreal LIGA, com a mesma referência da casa; custo: o mesmo pedido (1 imagem em image_urls, nenhum vídeo, 15 s, 720p)
  for (const fl of pub.filmes) {
    const snap = snapDe(fl)
    const tc = admitir(route, f, { email: cliente, snapshot: snap }), th = admitir(route, f, { email: casa, snapshot: snap })
    assert.ok(tc.referenciaUnica, fl.id + ': cliente humano fotorreal liga'); assert.equal('referenciaUnicaRecusa' in tc, false)
    assert.equal(tc.referenciaUnicaDoCliente, true, fl.id + ': cliente admitido marcado'); assert.equal('referenciaUnicaDoCliente' in th, false, fl.id + ': a casa não é medida como cliente')
    assert.equal(JSON.stringify(tc.referenciaUnica), JSON.stringify(th.referenciaUnica), fl.id + ': a mesma referência da casa')
    const prompts = fl.shots.map(x => x.prompt), timing = timingPub(fl, fl.personagem.nucleo)
    const env = await post(api, { prompts, approvedStills: prompts.map(() => null), timing: { ...timing, referenciaUnica: { ...tc.referenciaUnica, metades: fl.metades } } })
    assert.equal(env.url, 'https://queue.fal.run/kling/v4/reference-to-video', fl.id)
    assert.deepEqual(Object.keys(env.input), ['image_urls', 'multi_prompt', 'duration', 'resolution', 'aspect_ratio'], fl.id + ': nenhum campo a mais (nenhum vídeo de referência)')
    assert.deepEqual(env.input.image_urls, [fl.ficha]); assert.equal(String(env.input.duration), '15'); assert.equal(env.input.resolution, '720p')
    assert.equal(env.input.multi_prompt.reduce((t, m) => t + Number(m.duration), 0), 15)
    assert.deepEqual(indices(env.input.multi_prompt.map(m => m.prompt.includes('@Image1'))), DEPOIS[fl.id], fl.id + ': os planos da volta 2')
    assert.equal(f.relatoClienteSemReferencia2411({ ...tc }), null, 'referência usada = nenhum motivo')
    assert.equal(f.relatoClienteSemReferencia2411({ ...tc, referenciaUnicaRecusa: 'estilizado' }), null, 'referência usada = nenhum motivo, nem um que sobrou')
    // [revisora 24/11, volta 3] o furo de medida: o claim REAL da rota (o trecho executado), com o montador real
    const tcRef = { ...timing, referenciaUnicaDoCliente: tc.referenciaUnicaDoCliente, referenciaUnica: { ...tc.referenciaUnica, metades: fl.metades } }
    assert.equal(JSON.stringify(claimDaRota(route, f, api, { prompts, timing: tcRef })), JSON.stringify({ kling4_referencia_unica: f.relatoReferenciaUnica(tcRef, api.buildKling4TrialInput(prompts, [], tcRef)) }), fl.id + ': ligou = o relato de sempre')
    assert.equal(f.relatoClienteSemReferencia2411(tcRef, { model: 'kling/v4/reference-to-video' }), null, fl.id + ': envio pela referência = nenhum motivo (a função sozinha)')
    const vazio = prompts.map(() => 'Photoreal film. An empty road at dawn, wet asphalt. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.')
    assert.deepEqual(claimDaRota(route, f, api, { prompts: vazio, timing: tcRef }), { kling4_referencia_unica_cliente: { versao: 'KINEO-REFERENCIA-UNICA-HUMANO-2411', motivo: 'sem_plano' } }, fl.id + ': nenhum plano o mostra')
    for (const clipSeconds of [16, 20]) {
      const longo = { ...tcRef, clipSeconds }
      assert.notEqual(api.buildKling4TrialInput(prompts, [], longo).model, 'kling/v4/reference-to-video', 'o montador recusa ' + clipSeconds + ' s')
      assert.deepEqual(claimDaRota(route, f, api, { prompts, timing: longo }), { kling4_referencia_unica_cliente: { versao: 'KINEO-REFERENCIA-UNICA-HUMANO-2411', motivo: 'clipe_longo' } }, fl.id + ': clipe de ' + clipSeconds + ' s')
    }
    const thRef = { ...timing, referenciaUnica: { ...th.referenciaUnica, metades: fl.metades } }
    assert.deepEqual(claimDaRota(route, f, api, { prompts: vazio, timing: thRef }), {}, fl.id + ': casa recusada pelo montador = nenhum campo (como antes)')
    assert.deepEqual(claimDaRota(route, f, api, { prompts, timing: { ...timing, clipSeconds: 20 } }), {}, fl.id + ': sem admissão = nenhum campo')
  }
  // 2. cliente fora do caminho provado: o pedido de hoje (byte a byte a main) e só o código do motivo; a casa liga em todos (como em 'internal')
  const rapaz = filme('2fef3706'), pr = rapaz.planos.map(p => p.prompt), st = stillsDe(rapaz), tm = timingDe(rapaz)
  const main = (await post(old, { prompts: pr, approvedStills: st, timing: tm })).body
  const s0 = snapshots['2fef3706'], lead = s0.characters[0]
  const outro = (nome, tipo, protagonista) => ({ nome, nucleo: nome.replace(/^the /, ''), tipo, protagonista, canonica: 'A ' + nome.replace(/^the /, '') })
  const folha = nome => ({ nome, url: 'https://example.org/offline/' + nome.replace(/\W+/g, '-') + '.png' })
  const casos = [
    ['bicho', { ...s0, characters: [{ ...lead, tipo: 'animal' }] }, {}, 'nao_humano'],
    ['criatura', { ...s0, characters: [{ ...lead, tipo: 'criatura' }] }, {}, 'nao_humano'],
    ['cachorra lida pelo modelo, sem folha (prova de 24/11 tarde, sintético)', { ...s0, characters: [outro('the retriever', 'animal', true)], characterReferences: [], approvedStills: [{ url: 'https://example.org/offline/k.png', characterNames: ['the retriever'] }] }, {}, 'nao_humano'],
    ['robô em desenho 3D (sintético)', { ...s0, characters: [outro('the robot', 'criatura', true)], characterReferences: [folha('the robot')] }, { look: 'animated3d' }, 'nao_humano'],
    ['dragão (sintético)', { ...s0, characters: [outro('the dragon', 'criatura', true)], characterReferences: [folha('the dragon')] }, {}, 'nao_humano'],
    ['pessoa + bicho COM folha', { ...s0, characters: [lead, outro('the dog', 'animal', false)], characterReferences: [...s0.characterReferences, folha('the dog')] }, {}, 'nao_humano'],
    ['pessoa + criatura COM folha', { ...s0, characters: [lead, outro('the ghost', 'criatura', false)], characterReferences: [...s0.characterReferences, folha('the ghost')] }, {}, 'nao_humano'],
    ['duas pessoas COM folha (caed3456, c06af33d: nunca renderizado)', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [...s0.characterReferences, folha('the woman')] }, {}, 'mais_de_uma_folha'],
    ['protagonista pela imagem-chave + outra pessoa COM folha', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [folha('the woman')], approvedStills: [{ url: 'https://example.org/offline/k.png', characterNames: [lead.nome] }] }, {}, 'mais_de_uma_folha'],
    ['duas pessoas COM folha num filme 3D', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [...s0.characterReferences, folha('the woman')] }, { look: 'animated3d' }, 'mais_de_uma_folha'],
    // [revisora 24/11 · CEO, c06af33d] a forma provada tinha UMA pessoa no elenco da folha: duas pessoas no elenco, mesmo com uma só folha https, não liga
    ['duas pessoas, só uma com folha (c06af33d, "dynamic duo")', { ...s0, characters: [lead, outro('the woman', 'humano', false)] }, {}, 'mais_de_um_humano'],
    ['duas pessoas, a 2ª com folha NÃO https', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [...s0.characterReferences, { nome: 'the woman', url: 'http://inseguro.example/w.png' }] }, {}, 'mais_de_um_humano'],
    ['duas pessoas, o protagonista pela imagem-chave', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [], approvedStills: [{ url: 'https://example.org/offline/k.png', characterNames: [lead.nome] }] }, {}, 'mais_de_um_humano'],
    // [revisora 24/11, nota de rótulo] só o coadjuvante tem folha e o protagonista não tem referência nenhuma: sem_referencia (era mais_de_uma_folha)
    ['só o coadjuvante tem folha', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [folha('the woman')] }, {}, 'sem_referencia'],
    ['duas pessoas sem referência nenhuma', { ...s0, characters: [lead, outro('the woman', 'humano', false)], characterReferences: [] }, {}, 'sem_referencia'],
    ['anime', s0, { look: 'anime' }, 'estilizado'],
    ['3D animado', s0, { look: 'animated3d' }, 'estilizado'],
    ['ilustração', s0, { look: 'illustration' }, 'estilizado'],
    ['desenho infantil', s0, { infantil: true }, 'estilizado'],
    ['dois protagonistas', { ...s0, characters: [lead, { ...lead, nome: 'the friend', nucleo: 'friend' }] }, {}, 'mais_de_um'],
    ['sem protagonista', { ...s0, characters: [{ ...lead, protagonista: false }] }, {}, 'sem_referencia'],
    ['sem imagem https', { ...s0, characterReferences: [{ nome: lead.nome, url: 'http://inseguro.example/a.jpg' }] }, {}, 'sem_referencia'],
    ['retrato nulo', null, {}, 'sem_referencia'],
  ]
  for (const [nome, snap, opts, motivo] of casos) {
    const t = admitir(route, f, { email: cliente, snapshot: snap, ...opts })
    assert.equal('referenciaUnica' in t, false, 'cliente + ' + nome + ' não liga')
    assert.equal(t.referenciaUnicaRecusa, motivo, 'cliente + ' + nome + ': motivo')
    assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, referenciaUnicaRecusa: t.referenciaUnicaRecusa } })).body, main, 'cliente + ' + nome + ': byte a byte o de hoje')
    assert.deepEqual(JSON.parse(JSON.stringify(f.relatoClienteSemReferencia2411(t))), { versao: 'KINEO-REFERENCIA-UNICA-HUMANO-2411', motivo }, 'claim: só a versão e o código')
    const h = admitir(route, f, { email: casa, snapshot: snap, ...opts })
    assert.equal('referenciaUnicaRecusa' in h, false, 'casa nunca grava motivo')
    assert.equal(!!h.referenciaUnica, !!f.referenciaUnicaDoFilme(snap), 'casa + ' + nome + ': como em internal')
    const hi = admitir(route, { ...f, REFERENCIA_UNICA_2411: 'internal' }, { email: casa, snapshot: snap, ...opts })
    assert.equal(JSON.stringify(h.referenciaUnica ?? null), JSON.stringify(hi.referenciaUnica ?? null), 'casa + ' + nome + ': igual a internal')
  }
  for (const nome of ['bicho', 'criatura', 'anime', 'desenho infantil', 'robô em desenho 3D (sintético)', 'dragão (sintético)']) {
    const [, snap, opts] = casos.find(c => c[0] === nome)
    assert.ok(admitir(route, f, { email: casa, snapshot: snap, ...opts }).referenciaUnica, 'casa + ' + nome + ' liga')
  }
  // 3. o que ainda liga para cliente: pessoa + bicho SEM folha (o bicho não tem referência a trocar), filme noir (fotorreal em preto e branco); o coadjuvante
  // só citado no texto (fora do elenco, como em Le Prince, Slocum e Cooper) = o elenco de UMA pessoa
  for (const [nome, snap, opts] of [['pessoa + bicho sem folha', { ...s0, characters: [lead, outro('the dog', 'animal', false)] }, {}], ['noir', s0, { look: 'noir' }], ['fotorreal, coadjuvante só no texto', s0, {}],
    ['protagonista pela imagem-chave, sem outra folha', { ...s0, characterReferences: [], approvedStills: [{ url: 'https://example.org/offline/k.png', characterNames: [lead.nome] }] }, {}]]) {
    const t = admitir(route, f, { email: cliente, snapshot: snap, ...opts })
    assert.ok(t.referenciaUnica && !('referenciaUnicaRecusa' in t), 'cliente + ' + nome + ' liga')
  }
  // 4. a guarda sozinha: estilo ausente ou torto = estilizado (na dúvida, o de hoje)
  for (const filme of [{}, { estilizado: undefined }, { estilizado: 'false' }, { estilizado: 0 }]) assert.equal(f.motivoClienteSemReferencia2411(s0, filme), 'estilizado', JSON.stringify(filme))
  assert.equal(f.motivoClienteSemReferencia2411(s0, { estilizado: false }), null)
  // 5. 'off' = ninguém, sem campo; 'internal' = cliente sem campo novo (nem o motivo); 'public' = todos sem guarda
  for (const [snap, opts] of [[s0, {}], [casos[0][1], {}], [s0, { look: 'anime' }]]) {
    for (const email of [cliente, casa]) { const t = admitir(route, { ...f, REFERENCIA_UNICA_2411: 'off' }, { email, snapshot: snap, ...opts }); assert.ok(!('referenciaUnica' in t) && !('referenciaUnicaRecusa' in t), 'off') }
    const ti = admitir(route, { ...f, REFERENCIA_UNICA_2411: 'internal' }, { email: cliente, snapshot: snap, ...opts }); assert.ok(!('referenciaUnica' in ti) && !('referenciaUnicaRecusa' in ti), 'internal: cliente sem campo')
    assert.ok(admitir(route, { ...f, REFERENCIA_UNICA_2411: 'public' }, { email: cliente, snapshot: snap, ...opts }).referenciaUnica, 'public: sem guarda')
  }
  // 6. a rota não liga sem o filme grátis nem por cima do personagem fixo, também para cliente
  assert.equal('referenciaUnica' in admitir(route, f, { email: cliente, candidato: false, snapshot: s0 }), false)
  assert.equal('referenciaUnica' in admitir(route, f, { email: cliente, fixo: { imageUrl: 'https://x.org/a.png', continuity: 'c' }, snapshot: s0 }), false)
}

const mutants = [
  [transport, "duration !== 15 || ", ''],
  [transport, '  if (!comPersonagem.some(Boolean)) return null\n', ''],
  [transport, ': [ref.imageUrl], multi_prompt', ': [], multi_prompt'], // KINEO-DUAS-REFERENCIAS-2411: o texto do envio de uma referência
  [transport, 'cabe.slice(0, -CAUDA_DA_BOCA.length) + frases + CAUDA_DA_BOCA : cabe + frases', 'cabe + frases : cabe + frases'],
  [transport, 'if (!comPersonagem[i]) { const sem = semFichaDoPersonagem(texto, ref.nomes);', 'if (false) { const sem = semFichaDoPersonagem(texto, ref.nomes);'], // a ficha dele fica no plano sem ele
  [transport, ".replace(/^(?:the|a|an)\\s+/, '')", ''],
  [transport, 'KLING4_TETO_DO_PLANO - Array.from(frases).length', 'KLING4_TETO_DO_PLANO'],
  [feature, "(modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(email)", "(modo === 'internal' || modo === 'public_humano')"],
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public_humano'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public'"], // [CEO 24/11] a chave escapa para todo cliente
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public_humano'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'off'"], // a casa perde o caminho novo
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public_humano'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'internal'"], // o cliente humano fotorreal não recebe
  [feature, "(modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(email))", "(modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(String(email ?? '').replace(/^x/, '')))"], // parecido com a casa passa
  [feature, 'leads.length !== 1', 'leads.length < 1'],
  [feature, "lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO", "lead.tipo === 'humano' ? FRASE_REFERENCIA_DESENHO : FRASE_REFERENCIA_PESSOA"],
  [feature, 's.characterNames.length === 1 && ', ''],
  [feature, 'const imageUrl = https(ficha) ? ficha : https(still) ? still : null', 'const imageUrl = https(still) ? still : https(ficha) ? ficha : null'],
  [feature, 'timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL', 'timing?.fixedCharacter'],
  [routeFile, "if (!kling4Timing.fixedCharacter && kling4TrialCandidate && REFERENCIA_UNICA_2411 !== 'off') {", "if (kling4TrialCandidate && REFERENCIA_UNICA_2411 !== 'off') {"],
  [routeFile, '      if (q && a.timing.referenciaUnica) Object.assign(r.timing, { referenciaUnica: {', '      if (false) Object.assign(r.timing, { referenciaUnica: {'],
  // [revisor 24/11, volta 1] os três que sobreviviam (R1, R5, R9) e os da robustez e do juiz
  [feature, "(modo === 'internal' || modo === 'public_humano') && contaDaCasaExata(email)", "(modo === 'internal' || modo === 'public_humano') && (contaDaCasaExata(email) || /@usekineo\\.com$/i.test(String(email ?? '')))"],
  [transport, '  if (timing?.fixedCharacter) return buildKling4ReferenceInput(', '  if (timing?.fixedCharacter && !timing?.referenciaUnica) return buildKling4ReferenceInput('],
  [transport, 'shots.length > 6 ||', ''],
  [feature, [['  try { return escolherReferencia(snapshot) } catch { return null }', '  return escolherReferencia(snapshot)'], ['Array.isArray(s!.approvedStills) &&', '']]],
  [feature, [['  try { return escolherReferencia(snapshot) } catch { return null }', '  return escolherReferencia(snapshot)'], [' && Array.isArray(x.characterNames))', ')']]],
  [routeFile, '} catch (erro) { delete kling4Timing.referenciaUnica;', '} catch (erro) { throw erro; delete kling4Timing.referenciaUnica;'],
  // KINEO-REFERENCIA-UNICA-HUMANO-2411 — a guarda do cliente, por comportamento
  [feature, "  if (comFolha.some((c) => c.tipo !== 'humano')) return 'nao_humano'\n", ''], // bicho e criatura passam
  [feature, "comFolha.some((c) => c.tipo !== 'humano')", "comFolha.some((c) => c.tipo === 'criatura')"], // bicho passa
  [feature, "comFolha.some((c) => c.tipo !== 'humano')", "comFolha.some((c) => c.tipo === 'animal')"], // criatura passa
  [feature, "(c) => c.protagonista === true || snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url))", '(c) => c.protagonista === true'], // o bicho com folha ao lado da pessoa passa
  [feature, "(c) => c.protagonista === true || snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url))", '(c) => true'], // o bicho SEM folha ao lado da pessoa barra
  [feature, "  if (filme.estilizado !== false) return 'estilizado' // na dúvida (campo ausente ou torto), estilizado\n", ''], // estilizado passa
  [feature, 'if (filme.estilizado !== false)', 'if (filme.estilizado === true)'], // na dúvida, liga
  // [CEO 24/11, volta 3 da revisora] uma folha só, e o furo de medida
  [feature, "  if (comFolha.length > 1) return referenciaUnicaDoFilme(snapshot) ? 'mais_de_uma_folha' : 'sem_referencia'\n", ''], // dois humanos com folha passam (viram mais_de_um_humano)
  [feature, "referenciaUnicaDoFilme(snapshot) ? 'mais_de_uma_folha' : 'sem_referencia'", "referenciaUnicaDoFilme(snapshot) ? 'mais_de_um' : 'sem_referencia'"], // motivo errado
  [feature, "if (comFolha.length > 1) return referenciaUnicaDoFilme", "if (snapshot.characters.length > 1) return referenciaUnicaDoFilme"], // o bicho sem folha passa a barrar
  [feature, "if (comFolha.length > 1) return referenciaUnicaDoFilme", "if (snapshot.characterReferences.length > 1) return referenciaUnicaDoFilme"], // folha não https conta
  // [revisora 24/11 · CEO] dois humanos no elenco da folha, e o rótulo da folha só do coadjuvante
  [feature, "  if (snapshot.characters.filter((c) => c.tipo === 'humano').length > 1) return referenciaUnicaDoFilme(snapshot) ? 'mais_de_um_humano' : 'sem_referencia'\n", ''], // c06af33d liga
  [feature, "snapshot.characters.filter((c) => c.tipo === 'humano').length > 1", 'snapshot.characters.length > 1'], // o bicho sem folha conta como 2º humano
  [feature, "? 'mais_de_um_humano' : 'sem_referencia'", "? 'mais_de_uma_folha' : 'sem_referencia'"], // motivo errado
  [feature, "? 'mais_de_um_humano' : 'sem_referencia'", "? 'mais_de_um_humano' : 'mais_de_um_humano'"], // sem referência vira mais_de_um_humano
  [feature, "? 'mais_de_uma_folha' : 'sem_referencia'", "? 'mais_de_uma_folha' : 'mais_de_uma_folha'"], // o rótulo errado da revisora volta
  [feature, "return r ? { referencia: r, cliente: true } : { motivo: 'sem_referencia' }", "return r ? { referencia: r } : { motivo: 'sem_referencia' }"], // admitido sem a marca: furo mudo
  [feature, "kling4TrialClipTotal(timing.clipSeconds) !== 15 ? 'clipe_longo' : 'sem_plano'", "'sem_plano'"], // clipe longo vira sem_plano
  [feature, "kling4TrialClipTotal(timing.clipSeconds) !== 15 ? 'clipe_longo' : 'sem_plano'", "'clipe_longo'"], // sem_plano vira clipe_longo
  [feature, '  if (timing.referenciaUnicaDoCliente !== true || timing.fixedCharacter || !wire || wire.model === KLING4_REFERENCE_MODEL) return null\n', '  return null\n'], // furo mudo
  [feature, 'if (timing.referenciaUnicaDoCliente !== true || timing.fixedCharacter', 'if (timing.fixedCharacter'], // a casa vira medida de cliente
  [feature, ' || !wire || wire.model === KLING4_REFERENCE_MODEL) return null', ' || !wire) return null'], // ligou e o claim diz sem_plano
  [routeFile, '; if (ru2411.cliente) kling4Timing.referenciaUnicaDoCliente = true }', ' }'], // a rota não marca o cliente admitido
  [routeFile, 'const sem = ru ? null : relatoClienteSemReferencia2411(kling4Timing, w);', 'const sem = ru ? null : relatoClienteSemReferencia2411(kling4Timing);'], // o claim sem o envio = mudo
  [feature, "  if (leads > 1) return 'mais_de_um'\n", ''], // o motivo some (vira sem_referencia)
  [feature, "  if (modo !== 'public_humano') return null\n", ''], // em 'internal' o cliente passa a receber
  [feature, "  const motivo = motivoClienteSemReferencia2411(snapshot, filme)\n  if (motivo) return { motivo }\n", ''], // cliente sem a guarda
  [feature, '  if (referenciaUnicaLigada(modo, email)) { const r', "  if (modo === 'public' && referenciaUnicaLigada(modo, email)) { const r"], // a casa passa pela guarda
  [feature, "typeof timing.referenciaUnicaRecusa === 'string' ?", 'false ?'], // o claim nunca diz o motivo
  [feature, '  if (!timing.referenciaUnica) return typeof', "  if (typeof timing.referenciaUnicaRecusa === 'string') return typeof"], // motivo ao lado da referência usada
  [routeFile, '{ estilizado: isStylizedLook(styleAnchor) || desenhoInfantil.ativo }', '{ estilizado: isStylizedLook(styleAnchor) }'], // o desenho infantil passa
  [routeFile, '{ estilizado: isStylizedLook(styleAnchor) || desenhoInfantil.ativo }', '{ estilizado: false }'], // o estilo do filme ignorado
  [routeFile, '        else if (ru2411) kling4Timing.referenciaUnicaRecusa = ru2411.motivo\n', ''], // a rota não grava o motivo
  [routeFile, 'admitirReferenciaUnica2411(REFERENCIA_UNICA_2411, user.email, retratoDaReferencia2411(', "admitirReferenciaUnica2411(REFERENCIA_UNICA_2411, 'josephsskaf@gmail.com', retratoDaReferencia2411("], // todo mundo vira casa
  [feature, 'p.slice(0, -(f + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411', 'p'], // KINEO-DUAS-REFERENCIAS-2411: o semANossa recebe a frase em `f`
  [feature, [['p.endsWith(f + CAUDA_DA_BOCA_2411) ? p.slice(0, -(f + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411', 'p.includes(f) ? p.replace(f, \'\')']]],
  [routeFile, 'const reaproveitaJuiz1311 = !!envioFinal1311 && juizLeuOMesmoTexto(lidoPeloJuiz1311, envioFinal1311.cenas)', 'const reaproveitaJuiz1311 = !!envioFinal1311'],
  // [revisor 24/11, volta 3] FM1, FM2, RM3 e a fonte única
  [feature, ': p.endsWith(f) ? p.slice(0, -f.length) : p', ': p'], // FM1: a frase no fim de plano sem "Mouth closed" deixa de sair
  [feature, [['const semANossa = (p: string, f: string = frase): string => p.endsWith(f + CAUDA_DA_BOCA_2411) ? p.slice(0, -(f + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411\n    : p.endsWith(f) ? p.slice(0, -f.length) : p', 'const semANossa = (p: string, f: string = frase): string => { const k = p.lastIndexOf(frase); return k < 0 ? p : p.slice(0, k) + p.slice(k + frase.length) }'], ['(marcados[i] === true || segundos[i] === true) && ', '']]], // FM2: a última ocorrência em qualquer plano
  [feature, '(marcados[i] === true || segundos[i] === true) && ', ''], // a decisão do montador ignorada (pela posição em todo plano: o furo da volta 3)
  [feature, "(Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []).flatMap((m, i) => m === true ? [i + 1] : [])", "planos.flatMap((p, i) => typeof p?.prompt === 'string' && p.prompt.includes(ref.frase) ? [i + 1] : [])"],
  [transport, 'planosComFrase: comPersonagem as readonly boolean[]', 'planosComFrase: comPersonagem.map(() => true) as readonly boolean[]'],
  [routeFile, "const envioFinal1311 = kling4Trial?.job && vereditoAntes1311?.status === 'JUDGED' && lidoPeloJuiz1311 ?", 'const envioFinal1311 = kling4Trial?.job && lidoPeloJuiz1311 ?'], // RM3
  [routeFile, 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas: scenes.map((s) => s.voiceover ?? \'\'), inputs: classicSceneInputs }) : null', 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411({}, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas: scenes.map((s) => s.voiceover ?? \'\'), inputs: classicSceneInputs }) : null'],
  [routeFile, 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas', 'kling4Input: () => { const e = kling4EnvioDoFilme(); return buildKling4TrialInput(e.prompts, e.approvedStills, e.timing).input }, falas'],
]
// KINEO-REFERENCIA-UNICA-PUBLIC-2411 — mutantes por COMPORTAMENTO (cada um cai nos 3 filmes da prova, nos 8 roteiros da revisora ou nos casos do ponto 2)
mutants.push(
  [transport, 'if (cita === \'posse\' && visualMostraAlguem(acao)) return true', 'if (cita === \'posse\') return true'], // frase em plano de ausência (Slocum 4)
  [transport, '  if (repeteADescricao(acao, quem.descricao)) return true\n', ''], // a frase sai do plano que o mostra sem nome nem ficha (Le Prince 1)
  [transport, 'if (dele.has(w) && ++n >= minimo) return true', 'if (dele.has(w) && ++n >= 1) return true'], // estranho com 1 palavra em comum ganha a frase
  [transport, '  if (!temFichaDele(prompt, nomes, quem.protagonista !== false)) return false\n', '  if (!temFichaDele(prompt, nomes, quem.protagonista !== false)) return visualMostraAlguem(acao)\n'], // pessoa sem nome que não é ele ganha a frase
  [transport, 'return quem.metade === true ? visualMostraAlguem(acao) || repeteADescricao(acao, quem.descricao, 1) : !planoNegaGente(acao)', 'return visualMostraAlguem(acao)'], // a regra da metade na cena inteira: "The hijacker leaps" perde ficha e frase
  [transport, 'return quem.metade === true ? visualMostraAlguem(acao) || repeteADescricao(acao, quem.descricao, 1) : !planoNegaGente(acao)', 'return quem.metade === true ? true : !planoNegaGente(acao)'],
  [transport, ' || repeteADescricao(acao, quem.descricao, 1) : ', ' : '], // na metade, "The strawberry"/"The scientist" perdem ficha e frase // metade nunca perde: o vagão vazio e as notas na areia levam a frase
  [transport, ': !planoNegaGente(acao)', ': true'], // a ausência marcada pela rota não tira a ficha
  [transport, '  const acao = acaoDoPlano(prompt)\n', '  const acao = String(prompt ?? \'\')\n'], // decisão pelo nome em qualquer lugar do texto (a regra velha)
  [transport, 'return limpa(t.replace(FALA_ENTRE_ASPAS_RE, \' \'))', 'return limpa(t)'], // o nome entre aspas volta a pôr a frase
  [transport, 'if (re !== ORDEM_DO_PROTAGONISTA_RE && citacaoDoPersonagem(m, nomes) === null) return m; saiu = true; return \' \'', 'return m'], // plano sem frase fica com a ficha dele (Cooper 4)
  [transport, 'if (re !== ORDEM_DO_PROTAGONISTA_RE && citacaoDoPersonagem(m, nomes) === null) return m', 'if (citacaoDoPersonagem(m, nomes) === null) return m'], // a ordem sem o nome fica no plano vazio
  [transport, '  if (saiu) t = t.replace(ESTILO_DA_FICHA_RE, \' \')\n', ''], // a sobra da ficha dele fica no plano sem frase
  [transport, '[...FICHAS_RE, ESTILO_DA_FICHA_RE, LINHA_DA_ORIGEM_RE]', '[...FICHAS_RE, LINHA_DA_ORIGEM_RE]'], // a linha de estilo vira gente na cena
  [transport, 'ref.metades.length === shots.length ? ref.metades', 'ref.metades.length > 0 ? ref.metades'], // metades de outro envio decidem
  [transport, 'buildKling4ReferenciaUnicaInput(shots.map((prompt, i) => ({ prompt, duration: seconds[i] })), timing.referenciaUnica)',
    'buildKling4ReferenciaUnicaInput(shots.map((prompt, i) => ({ prompt: prompt + \' \' + (timing.voiceovers[i] ?? \'\'), duration: seconds[i] })), timing.referenciaUnica)'], // a fala decide
  [transport, 'const bounded = cabeNoTetoDoPlano(reference + prompt)', 'const bounded = cabeNoTetoDoPlano(reference + semFichaDoPersonagem(prompt, [\'Cooper\', \'Prince\']))'], // 'off' muda
  [feature, 'const descricao = descricaoDoAutor(lead.canonica)', 'const descricao = undefined'], // a descrição do autor esquecida (Le Prince 1 perde a frase)
  [routeFile, 'metades: q.grupos.flatMap((g) => g.map(() => g.length > 1))', 'metades: q.grupos.flatMap((g) => g.map(() => false))'], // a rota não diz quais são metade
)
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-REFERENCIA-UNICA-2411: chave no commit = 'public_humano' (cliente só pessoa fotorreal com 1 protagonista e 1 só folha; bicho, criatura, desenho, 2 protagonistas e 2 folhas = main byte a byte + motivo; casa exata = caminho novo em tudo); off = main byte a byte nos 3 filmes; ligado = pedido A (endpoint, 1 imagem, planos, durações, sem start/middle, frase só no plano do personagem); fallback sem referência/sem personagem/20 s; 'internal' = lista exata; ${mortos}/${mutants.length} mutantes mortos.`)
