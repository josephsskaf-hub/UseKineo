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
// KINEO-REFERENCIA-UNICA-PUBLIC-2411 — a frase entra só onde o personagem APARECE (a ação do plano): o carro e a mansão do 2fef3706 e o rei do 4691e265 ficam sem ela.
const COM_FRASE_2311 = { '2fef3706': [0, 3], '4691e265': [0, 1], '49448973': [0] }
const NOMES_2311 = { '2fef3706': ['the young man', 'young man'], '4691e265': ['the mysterious warrior', 'mysterious warrior'], '49448973': ['the fluffy mascot', 'fluffy mascot'] }
const esperado2311 = (api, id) => filme(id).planos.map((p, i) => COM_FRASE_2311[id].includes(i) ? filme(id).pedido_A.input.multi_prompt[i].prompt : api.semFichaDoPersonagem(p.prompt, NOMES_2311[id]))
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
  '2fef3706': { version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ nome: 'the young man', nucleo: 'young man', tipo: 'humano', genero: 'man', protagonista: true, canonica: 'A young man' }],
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
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const modules = load(source), api = modules('@/' + transport), f = modules('@/' + feature), contas = modules('@/lib/internalAccounts')
  const route = source(routeFile, local(routeFile))

  // (d) o interruptor: 'internal' no commit desde 24/11 (CEO, depois da 4ª revisão limpa) = só a lista EXATA da casa; 'off' = ninguém; 'public' = todos.
  assert.equal(f.REFERENCIA_UNICA_2411, 'internal')
  for (const e of contas.INTERNAL_EXACT_EMAILS) {
    assert.equal(f.referenciaUnicaLigada('internal', e), true, e); assert.equal(f.referenciaUnicaLigada('internal', ' ' + e.toUpperCase() + ' '), true, e)
    assert.equal(f.referenciaUnicaLigada('off', e), false, e)
  }
  for (const e of ['joseph+teste02@gmail.com', 'josephsskaf+x@gmail.com', 'test123@example.com', 'smoketest@x.io', 'qa@shortsforgeai.com', 'joseph@usekineo.com', 'hello@usekineo.com', 'qualquer@usekineo.com', 'cliente@example.org', '', null, undefined]) { // [revisor 24/11, R1] o domínio da casa fora da lista exata fica desligado
    assert.equal(f.referenciaUnicaLigada('internal', e), false, String(e)); assert.equal(f.referenciaUnicaLigada('off', e), false)
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

  // (e) [CEO 24/11] a chave COMO ESTÁ NO COMMIT ('internal'), executada pela admissão real da rota e pelo POST do montador (fetch falso):
  // conta de cliente = o pedido de hoje, byte a byte o da main; conta da lista exata da casa = o caminho novo.
  { const clientes = ['cliente@example.org', 'CLIENTE@EXAMPLE.ORG', '  cliente@example.org  ', 'josephsskaf@gmai.com', 'josephsskaf+teste@gmail.com', 'joseph+teste01@gmail.co',
      'josephskaf@hotmail.com.br', 'victoriaskaf96@gmail.com.evil.io', 'xjosephsskaf@gmail.com', 'joseph@usekineo.com', 'teste01@shortsforgeai.com.br', '', null, undefined]
    for (const id of ['2fef3706', '4691e265']) {
      const fl = filme(id), prompts = fl.planos.map(p => p.prompt), stills = stillsDe(fl)
      const main = await post(old, { prompts, approvedStills: stills, timing: timingDe(fl) })
      for (const email of clientes) {
        const t = admitir(route, f, { email, snapshot: snapshots[id] })
        assert.equal('referenciaUnica' in t, false, 'cliente ' + String(email))
        const envio = await post(api, { prompts, approvedStills: stills, timing: { ...timingDe(fl), ...("referenciaUnica" in t ? { referenciaUnica: t.referenciaUnica } : {}) } })
        assert.equal(envio.url, main.url, 'cliente ' + String(email)); assert.equal(envio.body, main.body, 'cliente ' + String(email) + ': byte a byte o de hoje')
      }
      for (const email of [...contas.INTERNAL_EXACT_EMAILS, ' JosephSSkaf@Gmail.com ']) {
        const t = admitir(route, f, { email, snapshot: snapshots[id] })
        assert.ok(t.referenciaUnica, 'casa ' + email)
        const envio = await post(api, { prompts, approvedStills: stills, timing: { ...timingDe(fl), ...("referenciaUnica" in t ? { referenciaUnica: t.referenciaUnica } : {}) } })
        assert.equal(envio.url, 'https://queue.fal.run/kling/v4/reference-to-video', 'casa ' + email)
        assert.deepEqual(envio.input.multi_prompt.map(m => m.prompt), esperado2311(api, id), 'casa ' + email + ': o pedido A nos planos com o personagem, sem a ficha dele nos outros')
      }
    }
  }

  // (b) ligado: o pedido bate com o pedido A no que importa.
  const casa = 'josephsskaf@gmail.com'
  const ligado = { ...f, REFERENCIA_UNICA_2411: 'internal' }
  for (const [id, snap, planosComFrase, urlEsperada, origem] of [
    ['2fef3706', '2fef3706', COM_FRASE_2311['2fef3706'], filme('2fef3706').referencia_do_teste, 'ficha'],
    ['4691e265', '4691e265', COM_FRASE_2311['4691e265'], filme('4691e265').ficha_do_elenco, 'ficha'], // o código escolhe a ficha (o teste usou a imagem-chave 1)
    ['49448973', '49448973-com-elenco', COM_FRASE_2311['49448973'], filme('49448973').referencia_do_teste, 'imagem_chave'],
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
      else { assert.equal(s.prompt, api.semFichaDoPersonagem(fl.planos[i].prompt, NOMES_2311[id]), `${id} plano ${i + 1} sem o personagem: o texto de hoje sem a ficha dele, sem frase`); assert.ok(!s.prompt.includes('@Image1') && !/Identity:|Visible:/.test(s.prompt)) }
    })
    const wireB = api.buildKling4TrialInput(fl.planos.map(p => p.prompt), stillsDe(fl), { ...timingDe(fl), referenciaUnica: t.referenciaUnica })
    assert.equal(JSON.stringify(wireB.input), enviado.body, 'a decisão do montador (planosComFrase) fica FORA do que vai à fal')
    const relato = f.relatoReferenciaUnica({ referenciaUnica: t.referenciaUnica }, wireB)
    assert.deepEqual(JSON.parse(JSON.stringify(relato)), { versao: 'KINEO-REFERENCIA-UNICA-2411', origem, tipo: t.referenciaUnica.tipo, planos: A.input.multi_prompt.length, planos_com_frase: planosComFrase.map(i => i + 1),
      planos_sem_ficha: fl.planos.flatMap((p, i) => !planosComFrase.includes(i) && /Identity:|Visible:/.test(p.prompt) ? [i + 1] : []) })
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
  assert.equal((await post(api, { prompts: pr, approvedStills: st, timing: { ...tm, referenciaUnica: { ...ru, nomes: ['the old lighthouse'], tipo: 'criatura' } } })).body, hojeRapaz, 'nenhum plano com o personagem')
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
  for (const mod of [ligado, publico]) {
    let t
    try { t = admitir(route, { ...mod, referenciaUnicaDoFilme: () => { throw new TypeError('offline') } }, { email: casa, snapshot: s0 }) } catch { assert.fail('a rota deixou o erro subir') }
    assert.equal('referenciaUnica' in t, false)
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
      lote.forEach((p, i) => assert.equal(x.planosComFrase[i], api.planoMostraOPersonagem(p.prompt, ru.nomes, ru)))
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

  // O plano por seção (kling4PorSecao real da rota) leva a referência; sem ela, nada muda.
  for (const merged of [false, true]) {
    const r = porSecao(route, modules, merged, ru)
    assert.equal(r.timing.referenciaUnica, ru, 'merged=' + merged)
    assert.equal('referenciaUnica' in porSecao(route, modules, merged, null).timing, false)
  }
  // O claim só ganha o campo quando a referência única foi usada.
  assert.ok(route.includes("return ru ? { kling4_referencia_unica: ru } : {}"))

  await suitePublic2411({ api, f, route })
}

// ═══ KINEO-REFERENCIA-UNICA-PUBLIC-2411 — os 3 filmes da prova paga 2 de 24/11 (Le Prince 92ce1a8e, Slocum ff5c515e, Cooper 582cead7) ═══════════════
// shots = o que chegou ao montador; enviado = o multi_prompt que foi à fal (conferido por SELECT em cinematic_submission_claim.response.scene_fal_inputs).
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
const snapDe = fl => ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: [{ ...fl.personagem, canonica: fl.personagem.nome }],
  characterReferences: [{ nome: fl.personagem.nome, url: fl.ficha }], approvedStills: [] })
// a fala de cada plano CITA o nome (a decisão não pode vir dela): mesma contagem de palavras = mesmas durações (régua pela voz)
const timingPub = (fl, nome) => ({ voiceovers: fl.shots.map(s => [nome, ...Array.from({ length: s.duration - 1 }, () => 'word')].join(' ')), wordsPerSecond: 2.5, pelaVoz: { segundosDaVoz: 15 } })
const indices = bs => bs.flatMap((m, i) => m ? [i + 1] : [])

async function suitePublic2411({ api, f, route }) {
  for (const fl of pub.filmes) {
    const shots = fl.shots, prompts = shots.map(s => s.prompt), nucleo = fl.personagem.nucleo
    const ref = f.referenciaUnicaDoFilme(snapDe(fl))
    assert.ok(ref && ref.imageUrl === fl.ficha && ref.origem === 'ficha', fl.id)
    // ANTES (a main que rodou na prova): o montador reproduz byte a byte o que foi à fal, e a frase entrou onde o NOME estava escrito
    const velho = antes.buildKling4ReferenciaUnicaInput(shots, { imageUrl: fl.ficha, frase: FRASE_P, nomes: ref.nomes })
    assert.deepEqual(velho.input.multi_prompt.map(m => m.prompt), fl.enviado, fl.id + ': o fixture é o que foi à fal')
    assert.deepEqual(indices(velho.planosComFrase), fl.planos_com_frase_no_ar, fl.id + ': a causa (antes)')
    // DEPOIS: a frase entra onde ele APARECE na imagem pedida
    const w = api.buildKling4ReferenciaUnicaInput(shots, ref)
    assert.deepEqual(indices(w.planosComFrase), DEPOIS[fl.id], fl.id + ': planos_com_frase depois')
    w.input.multi_prompt.forEach((m, i) => {
      assert.equal(m.duration, shots[i].duration)
      if (w.planosComFrase[i]) {
        assert.equal(m.prompt, fl.planos_com_frase_no_ar.includes(i + 1) ? fl.enviado[i] : comFrase(prompts[i]), `${fl.id} plano ${i + 1} com a frase`)
      } else {
        // o plano sem ele: sem a frase e sem ninguém que o ponha lá por outro caminho (ficha, ordem, cláusula, nome como quem age)
        assert.ok(!m.prompt.includes('@Image1') && !FICHA_NO_TEXTO_RE.test(m.prompt), `${fl.id} plano ${i + 1}: ${m.prompt}`)
        assert.equal(api.planoMostraOPersonagem(m.prompt, ref.nomes, ref), false)
        assert.equal(m.prompt, SEM_O_PERSONAGEM[fl.id]?.[i + 1] ?? prompts[i], `${fl.id} plano ${i + 1} sem o personagem`)
      }
    })
    assert.deepEqual(indices((w.fichaRetirada ?? []).map(t => typeof t === 'string')), SEM_FICHA[fl.id], fl.id + ': planos sem a ficha')
    // o relato do claim e o juiz (que lê o texto que o montador recebeu, sem 2ª leitura paga)
    const relato = JSON.parse(JSON.stringify(f.relatoReferenciaUnica({ referenciaUnica: ref }, w)))
    assert.deepEqual([relato.planos_com_frase, relato.planos_sem_ficha], [DEPOIS[fl.id], SEM_FICHA[fl.id]])
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
    // 'internal' no commit: cliente não alcança, nem nestes filmes; a casa exata sim
    for (const email of ['cliente@example.org', 'joseph@usekineo.com', null]) assert.equal('referenciaUnica' in admitir(route, f, { email, snapshot: snapDe(fl) }), false, String(email))
    assert.ok(admitir(route, f, { email: 'josephsskaf@gmail.com', snapshot: snapDe(fl) }).referenciaUnica)
  }

  // Ponto 2: o nome SÓ dentro de fala entre aspas não põe o personagem na imagem (antes punha: a mesma frase do Slocum)
  const slocum = f.referenciaUnicaDoFilme(snapDe(pub.filmes.find(x => x.id === 'slocum')))
  const aspas = 'Photoreal film. An old ship radio crackles "Slocum, come back!" over an empty harbor.' + BOCA, ele = 'Photoreal film. Joshua Slocum waves from the deck of his sloop.' + BOCA
  assert.deepEqual([...antes.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 7 }, { prompt: ele, duration: 8 }], { imageUrl: slocum.imageUrl, frase: FRASE_P, nomes: slocum.nomes }).planosComFrase], [true, true], 'antes: o nome entre aspas punha a frase')
  const p2 = api.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 7 }, { prompt: ele, duration: 8 }], slocum)
  assert.deepEqual([...p2.planosComFrase], [false, true]); assert.equal(p2.input.multi_prompt[0].prompt, aspas)
  assert.equal(api.buildKling4ReferenciaUnicaInput([{ prompt: aspas, duration: 15 }], slocum), null, 'só as aspas = o caminho de hoje')
  // posse sem corpo não é ele; posse com corpo é
  assert.equal(api.planoMostraOPersonagem("Photoreal film. Slocum's empty sloop drifts on a calm sea." + BOCA, slocum.nomes, slocum), false)
  assert.equal(api.planoMostraOPersonagem("Photoreal film. Slocum's weathered hands grip the wheel." + BOCA, slocum.nomes, slocum), true)
  // outro caminho: a ORDEM do protagonista (protagonistaEmTodaCena) e a cláusula da ficha num plano de ausência saem com ele; o sujeito obrigatório que
  // o nomeia (garantirSujeitoNoUltimo1911) o mostra, então leva a frase: nenhum plano sem a frase fica com ele
  const ordem = 'Photoreal film. The only person in this shot is the same main character (Joshua Slocum, an old bearded sailor (65)); any other person described below is replaced by this same character. An empty gray ocean horizon stretches at dusk.' + BOCA
  const clausula = 'Photoreal film. The same main character appears in this scene, consistent design: Joshua Slocum, an old bearded sailor. An empty harbor at dawn, gulls over the water.' + BOCA
  const sujeito = 'Photoreal film. Main subject clearly visible in frame: Joshua Slocum. A calm gray sea at dusk.' + BOCA
  const outro = api.buildKling4ReferenciaUnicaInput([{ prompt: ordem, duration: 5 }, { prompt: clausula, duration: 5 }, { prompt: sujeito, duration: 5 }], slocum)
  assert.deepEqual([...outro.planosComFrase], [false, false, true])
  assert.deepEqual(outro.input.multi_prompt.slice(0, 2).map(m => m.prompt), ['Photoreal film. An empty gray ocean horizon stretches at dusk.' + BOCA, 'Photoreal film. An empty harbor at dawn, gulls over the water.' + BOCA])
  // a linha de estilo que sobra da ficha com frase própria (texto NOSSO, lib/cinematic/elencoTrava) não é gente pedida, e sai com a ficha dele
  const menino = { imageUrl: slocum.imageUrl, frase: FRASE_P, nomes: ['the boy', 'boy'], tipo: 'humano', genero: 'man', outros: [] }
  const porta = 'Photoreal film. A colorful door swings open wide. Visible: the boy, a nine-year-old boy with short dark hair. He; a real person filmed in photorealistic live action, natural skin texture and real fabric.' + BOCA
  const m2 = api.buildKling4ReferenciaUnicaInput([{ prompt: porta, duration: 7 }, { prompt: 'Photoreal film. The boy runs through the door.' + BOCA, duration: 8 }], menino)
  assert.deepEqual([...m2.planosComFrase], [false, true]); assert.equal(m2.input.multi_prompt[0].prompt, 'Photoreal film. A colorful door swings open wide.' + BOCA)
}

await suite()
const mutants = [
  [transport, "duration !== 15 || ", ''],
  [transport, '  if (!comPersonagem.some(Boolean)) return null\n', ''],
  [transport, 'image_urls: [ref.imageUrl]', 'image_urls: []'],
  [transport, 'cabe.slice(0, -CAUDA_DA_BOCA.length) + frase + CAUDA_DA_BOCA : cabe + frase', 'cabe + frase : cabe + frase'],
  [transport, 'if (!comPersonagem[i]) {', 'if (false) {'],
  [transport, ".replace(/^(?:the|a|an)\\s+/, '')", ''],
  [transport, 'KLING4_TETO_DO_PLANO - Array.from(frase).length', 'KLING4_TETO_DO_PLANO'],
  [feature, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal'"],
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'internal'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'public'"], // [CEO 24/11] a chave escapa para clientes
  [feature, "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'internal'", "REFERENCIA_UNICA_2411: ModoReferenciaUnica2411 = 'off'"], // a casa perde o caminho novo
  [feature, "(modo === 'internal' && contaDaCasaExata(email))", "(modo === 'internal' && contaDaCasaExata(String(email ?? '').replace(/^x/, '')))"], // parecido com a casa passa
  [feature, 'leads.length !== 1', 'leads.length < 1'],
  [feature, "lead.tipo === 'humano' ? FRASE_REFERENCIA_PESSOA : FRASE_REFERENCIA_DESENHO", "lead.tipo === 'humano' ? FRASE_REFERENCIA_DESENHO : FRASE_REFERENCIA_PESSOA"],
  [feature, 's.characterNames.length === 1 && ', ''],
  [feature, 'const imageUrl = https(ficha) ? ficha : https(still) ? still : null', 'const imageUrl = https(still) ? still : https(ficha) ? ficha : null'],
  [feature, 'timing?.fixedCharacter || wire.model !== KLING4_REFERENCE_MODEL', 'timing?.fixedCharacter'],
  [routeFile, 'if (!kling4Timing.fixedCharacter && kling4TrialCandidate && referenciaUnicaLigada(', 'if (kling4TrialCandidate && referenciaUnicaLigada('],
  [routeFile, '      if (q && a.timing.referenciaUnica) Object.assign(r.timing, { referenciaUnica: a.timing.referenciaUnica })', '      if (false) Object.assign(r.timing, {})'],
  // [revisor 24/11, volta 1] os três que sobreviviam (R1, R5, R9) e os da robustez e do juiz
  [feature, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal' && (contaDaCasaExata(email) || /@usekineo\\.com$/i.test(String(email ?? '')))"],
  [transport, '  if (timing?.fixedCharacter) return buildKling4ReferenceInput(', '  if (timing?.fixedCharacter && !timing?.referenciaUnica) return buildKling4ReferenceInput('],
  [transport, 'shots.length > 6 ||', ''],
  [feature, [['  try { return escolherReferencia(snapshot) } catch { return null }', '  return escolherReferencia(snapshot)'], ['Array.isArray(s!.approvedStills) &&', '']]],
  [feature, [['  try { return escolherReferencia(snapshot) } catch { return null }', '  return escolherReferencia(snapshot)'], [' && Array.isArray(x.characterNames))', ')']]],
  [routeFile, '} catch (erro) { delete kling4Timing.referenciaUnica;', '} catch (erro) { throw erro; delete kling4Timing.referenciaUnica;'],
  [feature, 'p.slice(0, -(frase + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411', 'p'],
  [feature, [['p.endsWith(frase + CAUDA_DA_BOCA_2411) ? p.slice(0, -(frase + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411', 'p.includes(frase) ? p.replace(frase, \'\')']]],
  [routeFile, 'const reaproveitaJuiz1311 = !!envioFinal1311 && juizLeuOMesmoTexto(lidoPeloJuiz1311, envioFinal1311.cenas)', 'const reaproveitaJuiz1311 = !!envioFinal1311'],
  // [revisor 24/11, volta 3] FM1, FM2, RM3 e a fonte única
  [feature, ': p.endsWith(frase) ? p.slice(0, -frase.length) : p', ': p'], // FM1: a frase no fim de plano sem "Mouth closed" deixa de sair
  [feature, [['const semANossa = (p: string): string => p.endsWith(frase + CAUDA_DA_BOCA_2411) ? p.slice(0, -(frase + CAUDA_DA_BOCA_2411).length) + CAUDA_DA_BOCA_2411\n    : p.endsWith(frase) ? p.slice(0, -frase.length) : p', 'const semANossa = (p: string): string => { const k = p.lastIndexOf(frase); return k < 0 ? p : p.slice(0, k) + p.slice(k + frase.length) }'], ['marcados[i] === true && ', '']]], // FM2: a última ocorrência em qualquer plano
  [feature, 'marcados[i] === true && ', ''], // a decisão do montador ignorada (pela posição em todo plano: o furo da volta 3)
  [feature, "(Array.isArray(wire.planosComFrase) ? wire.planosComFrase : []).flatMap((m, i) => m === true ? [i + 1] : [])", "planos.flatMap((p, i) => typeof p?.prompt === 'string' && p.prompt.includes(ref.frase) ? [i + 1] : [])"],
  [transport, 'planosComFrase: comPersonagem as readonly boolean[]', 'planosComFrase: comPersonagem.map(() => true) as readonly boolean[]'],
  [routeFile, "const envioFinal1311 = kling4Trial?.job && vereditoAntes1311?.status === 'JUDGED' && lidoPeloJuiz1311 ?", 'const envioFinal1311 = kling4Trial?.job && lidoPeloJuiz1311 ?'], // RM3
  [routeFile, 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas: scenes.map((s) => s.voiceover ?? \'\'), inputs: classicSceneInputs }) : null', 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411({}, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas: scenes.map((s) => s.voiceover ?? \'\'), inputs: classicSceneInputs }) : null'],
  [routeFile, 'kling4Input: () => { const e = kling4EnvioDoFilme(); return entradaDoJuiz2411(e.timing, buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)) /* KINEO-REFERENCIA-UNICA-2411: o juiz lê sem a frase */ }, falas', 'kling4Input: () => { const e = kling4EnvioDoFilme(); return buildKling4TrialInput(e.prompts, e.approvedStills, e.timing).input }, falas'],
]
// KINEO-REFERENCIA-UNICA-PUBLIC-2411 — mutantes por COMPORTAMENTO (cada um tem de cair nos 3 filmes da prova ou nos casos do ponto 2)
mutants.push(
  [transport, 'if (cita === \'posse\' && visualMostraAlguem(acao)) return true', 'if (cita === \'posse\') return true'], // frase em plano de ausência (Slocum 4)
  [transport, 'return quem.tipo === \'humano\' && citacaoDoPersonagem(', 'return false && citacaoDoPersonagem('], // a frase sai do plano que o mostra (Le Prince 1)
  [transport, '  const acao = acaoDoPlano(prompt)\n', '  const acao = String(prompt ?? \'\')\n'], // decisão pelo nome em qualquer lugar do texto (a regra velha)
  [transport, 'return limpa(t.replace(FALA_ENTRE_ASPAS_RE, \' \'))', 'return limpa(t)'], // o nome entre aspas volta a pôr a frase
  [transport, 'if (citacaoDoPersonagem(m, nomes) === null) return m; saiu = true; return \' \'', 'return m'], // plano sem frase fica com a ficha dele (Cooper 4)
  [transport, '  if (saiu) t = t.replace(ESTILO_DA_FICHA_RE, \' \')\n', ''], // a sobra da ficha dele fica no plano sem frase
  [transport, '[...FICHAS_RE, ESTILO_DA_FICHA_RE, LINHA_DA_ORIGEM_RE]', '[...FICHAS_RE, LINHA_DA_ORIGEM_RE]'], // a linha de estilo vira gente na cena
  [transport, 'buildKling4ReferenciaUnicaInput(shots.map((prompt, i) => ({ prompt, duration: seconds[i] })), timing.referenciaUnica)',
    'buildKling4ReferenciaUnicaInput(shots.map((prompt, i) => ({ prompt: prompt + \' \' + (timing.voiceovers[i] ?? \'\'), duration: seconds[i] })), timing.referenciaUnica)'], // a fala decide
  [transport, 'const bounded = cabeNoTetoDoPlano(reference + prompt)', 'const bounded = cabeNoTetoDoPlano(reference + semFichaDoPersonagem(prompt, [\'Cooper\', \'Prince\']))'], // 'off' muda
  [feature, 'nomes, outros,', 'nomes, outros: [],'], // o resto do elenco esquecido (o rei do 4691e265 vira o protagonista)
)
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-REFERENCIA-UNICA-2411: chave no commit = 'internal' (cliente = main byte a byte; casa exata = caminho novo); off = main byte a byte nos 3 filmes; ligado = pedido A (endpoint, 1 imagem, planos, durações, sem start/middle, frase só no plano do personagem); fallback sem referência/sem personagem/20 s; 'internal' = lista exata; ${mortos}/${mutants.length} mutantes mortos.`)
