// KINEO-GEMINI-NA-ESTEIRA-2511 — guardião OFFLINE (sem rede, sem fal, sem banco de verdade, sem chave): executa as libs REAIS
// (lib/cinematic/geminiNaEsteira2511.ts, geminiNaEsteiraAsync2511.ts, lib/kling4TrialAsyncStatus.ts e as trocas do claim assinado em lib/cinematic/claim.ts,
// com um banco falso que faz a CAS pela assinatura) e o trecho real da rota que tenta o Gemini.
//   1. o adaptador: a entrada do Kling 4 do claim real do 499143ac vira, byte a byte, o pedido que levou nota 10 (scripts/test-support/gemini-499143ac.json);
//   2. a chave 'internal' só para a casa exata; cliente, e-mail nulo e 'off' = nenhum pedido ao Gemini (o envio do Kling 4 sai como na main);
//   3. o envio (4xx = recusa, o Kling 4 vai na hora; 5xx/prazo = ambíguo), a consulta (o erro da fal sem texto de cliente) e a decisão por prazo;
//   4. a queda: uma vez só (duas consultas ao mesmo tempo = um POST do Kling 4), com a entrada EXATA guardada; o claim troca para o Kling 4 e segue a lógica
//      de hoje; sem recibo do Kling 4 ou o dono da vez sumido = a reserva de hoje; nenhum débito; o evento conta a queda;
//   5. o id antigo do Gemini ainda acha o filme depois da queda; o selo: 'omni' no Gemini, 'kling4' depois da queda.
// Mutantes no fim: cada um precisa derrubar pelo menos uma asserção.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const proibido = (o) => () => { throw new Error(`proibido no guardião: ${o}`) }
const M = 'lib/cinematic/geminiNaEsteira2511.ts', A = 'lib/cinematic/geminiNaEsteiraAsync2511.ts', S = 'lib/kling4TrialAsyncStatus.ts', C = 'lib/cinematic/claim.ts', B = 'lib/kling4TrialBudget.ts'
const COMPOSE = 'app/api/compose/route.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts', STATUS = 'app/api/cinematic-clip-status/route.ts', SONDA = 'app/api/admin/engine-test/route.ts'
const FIX = JSON.parse(read('scripts/test-support/gemini-499143ac.json'))
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
const GEM = 'google/gemini-omni-flash/v1.2/reference-to-video', K4R = 'kling/v4/reference-to-video'
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)

function loader(over, mocks = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const t = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      if (!t) return nativeRequire(name)
      return load(t)
    }
    const src = (over[path] ?? read(path)) + (path === C ? '\nexport const __teste = { withSignature, metadataForClaim }\n' : '')
    const js = ts.transpileModule(src, { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, proibido('rede'))
    return module.exports
  }
  return load
}

// banco falso: UMA linha de events; o update só passa com a assinatura anterior (a CAS real de updateClaim)
function bancoFalso(row) {
  const db = { row, updates: 0, rpcs: [] }
  db.from = () => {
    const filtros = []; let patch = null
    const valor = (k) => (k === 'metadata->>authority' ? db.row.metadata?.authority : db.row[k])
    const q = {
      select() { return q }, eq(k, v) { filtros.push([k, v]); return q }, update(p) { patch = p; return q },
      async maybeSingle() {
        await Promise.resolve()
        const casa = filtros.every(([k, v]) => valor(k) === v)
        if (patch) { if (!casa) return { data: null, error: null }; db.row = { ...db.row, ...JSON.parse(JSON.stringify(patch)) }; db.updates++; return { data: JSON.parse(JSON.stringify(db.row)), error: null } }
        return { data: casa ? JSON.parse(JSON.stringify(db.row)) : null, error: null }
      },
    }
    return q
  }
  db.rpc = async (nome, args) => { db.rpcs.push([nome, args]); return { data: null, error: { message: 'rpc falsa' } } }
  return db
}

const GEN = '3f1c2d3e-4b5a-4978-8a9b-0c1d2e3f4a5b', USER = '00000000-0000-0000-0000-00000000a0a0', SEGREDO = 'segredo-de-teste'
const T0 = Date.parse('2026-11-25T12:00:00.000Z'), MIN = 60_000
function nascimento(c, { gid = 'gem-1', extra = {} } = {}) {
  const gem = c.m.geminiDoKling4(FIX.kling4_input, FIX.nomes)
  const marker = { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, country: 'BR', original_request_id: gid, submitted_at: new Date(T0).toISOString(),
    fallback_scenes: [0, 1, 2].map((i) => ({ prompt: 'Scene ' + i, duration: 6 })), fallback_response: { scenes: ['a', 'b', 'c'], scene_captions: ['', '', ''], scene_prompts: ['a', 'b', 'c'], clip_seconds: [6, 6, 6], clip_word_starts: [0, 0, 0] },
    motor_do_clipe: 'gemini_omni_flash', kling4_reserva: { model: K4R, input: FIX.kling4_input }, ...extra }
  const response = { generationId: GEN, quality: 'cinematic_ai', duration: 15, aspect: '9:16', fal_request_ids: [gid], fal_model: GEM, fal_models: [GEM], scene_fal_inputs: [gem], terminal_failed_jobs: [], kling4_trial: marker }
  const claim = c.claim.__teste.withSignature(SEGREDO, { id: c.claim.cinematicClaimId(USER, GEN), userId: USER, generationId: GEN, status: 'settled', fingerprint: 'a'.repeat(64), creditCost: 1, quality: 'cinematic_ai', engine: 'seedance',
    falRequestIds: [gid], falModels: [GEM], authorizedCompletedUrls: [null], response, responseHash: c.claim.cinematicValueHash(response), resolutionReason: 'provider_submitted_and_debited', resolutionReference: '', startedAt: new Date(T0).toISOString(), completedAt: new Date(T0).toISOString(), resolvedAt: new Date(T0).toISOString() })
  const row = { id: claim.id, name: c.claim.CINEMATIC_CLAIM_EVENT, user_id: USER, path: c.claim.CINEMATIC_CLAIM_PATH, session_id: GEN, metadata: c.claim.__teste.metadataForClaim(claim), created_at: new Date(T0).toISOString() }
  return { claim, db: bancoFalso(row) }
}

async function prova(over = {}) {
  const falhas = []
  const no = (ruim, msg) => { if (ruim) falhas.push(msg) }
  const eventos = []
  let c
  try {
    const load = loader(over, { '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } } })
    c = { m: load(M), a: load(A), s: load(S), claim: load(C) }
  } catch (e) { return ['as libs não carregam: ' + e.message] }
  const { m, s, claim: CL } = c
  try {
    // ── 1. o adaptador ──
    const g = m.geminiDoKling4(FIX.kling4_input, FIX.nomes)
    no(JSON.stringify(g) !== JSON.stringify(FIX.gemini_input_nota_10), '1a o 499143ac: o pedido do Gemini = byte a byte o que levou nota 10')
    const um = m.geminiDoKling4({ ...FIX.kling4_input, image_urls: [FIX.kling4_input.image_urls[0]], multi_prompt: [{ prompt: 'Elias walks. Keep the face and outfit of @Image1.', duration: 15 }] }, ['Elias Ward'])
    no(um?.prompt !== '15-second vertical 9:16 film, 1 shot with hard cuts. REFERENCES: <IMAGE_REF_0> is Elias Ward, who keeps the same look in every shot where they appear.\n0-15 s (shot 1, hard cut): Elias walks. Keep the face and outfit of <IMAGE_REF_0>.', '1b uma foto: o cabeçalho de uma pessoa')
    for (const [nome, i, n] of [['duração 10', { ...FIX.kling4_input, duration: 10 }, FIX.nomes], ['1080p', { ...FIX.kling4_input, resolution: '1080p' }, FIX.nomes], ['3 fotos', { ...FIX.kling4_input, image_urls: [...FIX.kling4_input.image_urls, FIX.kling4_input.image_urls[0]] }, [...FIX.nomes, 'X']],
      ['@Image2 sem a 2ª foto', { ...FIX.kling4_input, image_urls: [FIX.kling4_input.image_urls[0]] }, ['Elias Ward']], ['soma ≠ 15', { ...FIX.kling4_input, multi_prompt: FIX.kling4_input.multi_prompt.slice(0, 3) }, FIX.nomes],
      ['sem o nome da 2ª', FIX.kling4_input, ['Elias Ward']], ['nome com <', FIX.kling4_input, ['Elias <Ward>', 'Mara']], ['foto http', { ...FIX.kling4_input, image_urls: ['http://x/a.jpg', 'http://x/b.jpg'] }, FIX.nomes],
      ['texto que já cita <IMAGE_REF_0>', { ...FIX.kling4_input, multi_prompt: [{ prompt: 'x <IMAGE_REF_0>', duration: 15 }], image_urls: [FIX.kling4_input.image_urls[0]] }, ['A']], ['sem multi_prompt', { ...FIX.kling4_input, multi_prompt: undefined }, FIX.nomes]])
      no(m.geminiDoKling4(i, n) !== null, '1c fora do formato = null (o Kling 4 de sempre): ' + nome)
    // ── 2. a chave ──
    no(m.GEMINI_NA_ESTEIRA_2511 !== 'public', "2a a chave é 'public' (dono 25/11 15:27)")
    for (const e of [CLIENTE, CASA, 'joseph@usekineo.com', '', null, undefined]) no(m.geminiNaEsteiraLigado('public', e) !== true, "2e 'public': toda conta: " + e)
    no(m.geminiNaEsteiraLigado('internal', CASA) !== true, '2b a casa exata')
    for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null, undefined]) no(m.geminiNaEsteiraLigado('internal', e) !== false, '2c fora da casa: ' + e)
    no(m.geminiNaEsteiraLigado('off', CASA) !== false, "2d 'off' desliga")
    // ── 3. envio, consulta e decisão ──
    const posts = []
    const resp = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo })
    const job = await m.submitGeminiTrialVideo(g, { apiKey: 'k', now: () => T0, fetchImpl: async (u, o) => { posts.push([u, JSON.parse(o.body)]); return resp(200, { request_id: ' gem-1 ' }) } })
    igual([job, posts], [{ requestId: 'gem-1', model: GEM, submittedAt: new Date(T0).toISOString() }, [['https://queue.fal.run/' + GEM, g]]], '3a o POST vai ao Gemini com a entrada inteira')
    for (const [st, recusa] of [[422, true], [400, true], [403, true], [408, false], [500, false], [503, false]]) {
      let e = null; try { await m.submitGeminiTrialVideo(g, { apiKey: 'k', fetchImpl: async () => resp(st, {}) }) } catch (x) { e = x }
      no(!e || (e instanceof m.GeminiRecusadoNoEnvio) !== recusa, `3b HTTP ${st}: ${recusa ? 'recusa (o Kling 4 vai na hora)' : 'ambíguo (sem reenviar)'}`)
    }
    { let e = null; try { await m.submitGeminiTrialVideo(g, { apiKey: 'k', fetchImpl: async () => resp(200, {}) }) } catch (x) { e = x } no(!e || e instanceof m.GeminiRecusadoNoEnvio, '3c sem recibo = ambíguo') }
    const urls = []
    const consulta = (status, result, rstatus = 200) => async (u) => { urls.push(u); return u.endsWith('/status') ? resp(200, { request_id: 'gem-1', status }) : resp(rstatus, result) }
    let r = await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: consulta('COMPLETED', { video: { url: 'https://v3.fal.media/out.mp4' } }) })
    igual([r, urls], [{ status: 'done', url: 'https://v3.fal.media/out.mp4', erro: null }, ['https://queue.fal.run/google/gemini-omni-flash/requests/gem-1/status', 'https://queue.fal.run/google/gemini-omni-flash/requests/gem-1']], '3d pronto, pela fila do Gemini')
    r = await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: consulta('COMPLETED', { detail: [{ loc: ['body', 'prompt'], type: 'invalid_request', msg: 'Could not generate a video with the given inputs. Please try again with different inputs.', input: 'TEXTO DO CLIENTE' }] }, 422) })
    no(r.status !== 'failed' || r.erro !== 'http_422 · invalid_request · Could not generate a video with the given inputs. Please try again with different inputs.' || /TEXTO DO CLIENTE/.test(r.erro), '3e a recusa de 23/11: falha, com o erro da fal e sem o texto do cliente')
    no((await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: consulta('FAILED') })).status !== 'failed', '3f FAILED = falha')
    no((await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: consulta('IN_QUEUE') })).status !== 'pending', '3g na fila')
    no((await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: async () => { throw new Error('rede') } })).status !== 'processing', '3h erro de rede = espera')
    no((await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: async (u) => resp(200, { request_id: 'outro', status: 'FAILED' }) })).status !== 'processing', '3i resposta de outro pedido = espera')
    no((await m.pollGeminiTrialVideo('gem-1', { apiKey: 'k', fetchImpl: consulta('COMPLETED', {}, 500) })).status !== 'processing', '3j 500 no resultado = espera')
    no(m.erroDaFal({ detail: 'see https://fal.ai/x?y=1 now' }, 400) !== 'http_400 · see <url> now', '3k o erro sem endereço')
    const P = { status: 'processing', url: null, erro: null }, Q = { status: 'pending', url: null, erro: null }
    igual([m.decisaoDoGemini(P, 3 * MIN), m.decisaoDoGemini(P, 5 * MIN), m.decisaoDoGemini(Q, 5 * MIN), m.decisaoDoGemini(P, 6.5 * MIN), m.decisaoDoGemini(Q, 3 * MIN), m.decisaoDoGemini({ status: 'failed', url: null, erro: 'x' }, 1000), m.decisaoDoGemini({ status: 'done', url: 'https://v', erro: null }, 9 * MIN)],
      [{ acao: 'esperar' }, { acao: 'esperar' }, { acao: 'queda', motivo: 'prazo', erro: null }, { acao: 'queda', motivo: 'prazo', erro: null }, { acao: 'esperar' }, { acao: 'queda', motivo: 'recusa', erro: 'x' }, { acao: 'entregar', url: 'https://v' }], '3l o prazo: 4 min, +2 só rodando; a falha na hora; pronto entrega')
    for (const [st, amb] of [[422, false], [403, false], [408, true], [503, true]]) { let e = null; try { await m.submitKling4DaQueda(K4R, FIX.kling4_input, { apiKey: 'k', fetchImpl: async () => resp(st, {}) }) } catch (x) { e = x } no(!(e instanceof m.EnvioDoKling4Incerto) || e.ambiguo !== amb, `3m o POST do Kling 4 da queda, HTTP ${st}`) }

    // ── 4. a queda, com o claim assinado e a CAS de verdade ──
    const fb = []
    const fallback = async (a) => { fb.push(a.reason); return { ok: true, claim: a.claim, pending: false, ambiguous: false, noAccepted: false } }
    const avanca = (n, extra) => s.advanceKling4TrialStatus({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN, claim: n.claim, now: extra.now }, { fallback, gemini: extra.deps })
    const recusa = async () => ({ status: 'failed', url: null, erro: 'http_422 · invalid_request · Could not generate a video with the given inputs.' })
    // 4a pronto = entrega, nenhum POST
    { const n = nascimento(c); const k = []; const x = await avanca(n, { now: T0 + 2 * MIN, deps: { pollGemini: async () => ({ status: 'done', url: 'https://v3.fal.media/g.mp4', erro: null }), submitKling: async () => { k.push(1); return 'k' } } })
      igual([x.kind, x.url, k.length, n.db.updates], ['kling_done', 'https://v3.fal.media/g.mp4', 0, 0], '4a o Gemini pronto: entrega, nada enviado nem trocado') }
    // 4b a recusa: UM POST do Kling 4 com a entrada EXATA; o claim troca; o evento conta
    { eventos.length = 0; const n = nascimento(c); const k = []
      const x = await avanca(n, { now: T0 + 90_000, deps: { pollGemini: recusa, submitKling: async (model, input) => { k.push([model, input]); return 'k4-novo' } } })
      igual(k, [[K4R, FIX.kling4_input]], '4b um POST do Kling 4 reference com a entrada guardada, byte a byte')
      const lido = await CL.loadVerifiedCinematicClaim({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN })
      const mk = lido.claim?.response?.kling4_trial
      no(!lido.ok || !lido.claim, '4c o claim trocado continua assinado e válido')
      igual([x.kind, lido.claim?.falRequestIds, lido.claim?.falModels, lido.claim?.response?.scene_fal_inputs, mk?.engine_used, mk?.motor_do_clipe, mk?.reserva_de, mk?.gemini_request_id, mk?.original_request_id, mk?.submitted_at, mk?.gemini_queda?.estado, mk?.gemini_queda?.motivo, mk?.gemini_queda?.erro],
        ['pending', ['k4-novo'], [K4R], [FIX.kling4_input], 'kling4', 'kling4', 'gemini_omni_flash', 'gem-1', 'k4-novo', new Date(T0 + 90_000).toISOString(), 'feita', 'recusa', 'http_422 · invalid_request · Could not generate a video with the given inputs.'], '4d o claim aponta para o Kling 4, com o motivo e o erro da fal')
      no(eventos.length !== 1 || eventos[0].name !== 'gemini_esteira_queda' || eventos[0].metadata.motivo !== 'recusa' || eventos[0].metadata.kling4_aceito !== true || JSON.stringify(eventos[0]).includes('Photoreal'), '4e o evento da queda: motivo e erro, sem texto de cliente')
      // depois da queda: a lógica de hoje do Kling 4 (a consulta do Kling, não a do Gemini)
      const kp = []; const y = await s.advanceKling4TrialStatus({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN, claim: lido.claim, now: T0 + 3 * MIN }, { poll: async (id) => { kp.push(id); return { status: 'done', url: 'https://v3.fal.media/k.mp4' } }, fallback, gemini: { pollGemini: async () => { throw new Error('não é mais o Gemini') } } })
      igual([y.kind, y.url, kp], ['kling_done', 'https://v3.fal.media/k.mp4', ['k4-novo']], '4f depois da queda vale o Kling 4 de hoje')
      // o id antigo do Gemini ainda acha o filme; outro id não
      no(s.kling4TrialPollIdsMatch(['gem-1'], lido.claim) !== true || s.kling4TrialPollIdsMatch(['k4-novo'], lido.claim) !== true || s.kling4TrialPollIdsMatch(['outro'], lido.claim) !== false, '4g o navegador com o id antigo do Gemini acha o filme') }
    // 4h duas consultas ao mesmo tempo = UM POST do Kling 4
    { const n = nascimento(c); const k = []
      await Promise.all([0, 1, 2].map(() => avanca(n, { now: T0 + 90_000, deps: { pollGemini: recusa, submitKling: async () => { k.push(1); await new Promise((r2) => setTimeout(r2, 5)); return 'k4-x' } } })))
      no(k.length !== 1, '4h três consultas ao mesmo tempo: um POST só (' + k.length + ')') }
    // 4i o prazo
    { const n = nascimento(c); const k = []; const deps = (st) => ({ pollGemini: async () => ({ status: st, url: null, erro: null }), submitKling: async () => { k.push(1); return 'k4-p' } })
      const x1 = await avanca(n, { now: T0 + 3 * MIN, deps: deps('processing') }), x2 = await avanca(n, { now: T0 + 5 * MIN, deps: deps('processing') })
      igual([x1.kind, x2.kind, k.length], ['pending', 'pending', 0], '4i no prazo e rodando no extra: espera, nada enviado')
      await avanca(n, { now: T0 + 5 * MIN, deps: deps('pending') })
      const lido = await CL.loadVerifiedCinematicClaim({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN })
      igual([k.length, lido.claim.response.kling4_trial.gemini_queda.motivo], [1, 'prazo'], '4j na fila depois do prazo: a queda por prazo') }
    // 4k erro de rede na consulta: espera
    { const n = nascimento(c); const x = await avanca(n, { now: T0 + 7 * MIN, deps: { pollGemini: async () => { throw new Error('rede') }, submitKling: proibido('POST') } }); no(x.kind !== 'pending' || n.db.updates !== 0, '4k consulta que falha = espera') }
    // 4l o POST do Kling 4 recusado: a reserva de hoje, sem tentar o Kling de novo
    { fb.length = 0; const n = nascimento(c); let k = 0
      const x = await avanca(n, { now: T0 + 90_000, deps: { pollGemini: recusa, submitKling: async () => { k++; throw new m.EnvioDoKling4Incerto(false, 422) } } })
      const lido = await CL.loadVerifiedCinematicClaim({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN })
      igual([x.kind, k, fb, lido.claim.response.kling4_trial.gemini_queda.estado, lido.claim.response.kling4_trial.gemini_queda.sem_kling4], ['ordinary', 1, ['provider_failed'], 'sem_kling4', 'kling4_recusado'], '4l sem o Kling 4: a reserva de hoje')
      const y = await avanca({ db: n.db, claim: lido.claim }, { now: T0 + 2 * MIN, deps: { pollGemini: proibido('consulta'), submitKling: proibido('POST') } })
      igual([y.kind, k, fb.length], ['ordinary', 1, 2], '4m a próxima consulta só repete a reserva (idempotente), nunca o Kling 4') }
    // 4n o dono da vez sumiu: espera até 90 s; depois, a reserva de hoje
    { fb.length = 0; const n = nascimento(c, { extra: { gemini_queda: { estado: 'iniciada', token: 'outro', desde: new Date(T0).toISOString(), motivo: 'recusa', erro: null } } })
      const x1 = await avanca(n, { now: T0 + 60_000, deps: { pollGemini: proibido('consulta'), submitKling: proibido('POST') } })
      const x2 = await avanca(n, { now: T0 + 100_000, deps: { pollGemini: proibido('consulta'), submitKling: proibido('POST') } })
      igual([x1.kind, x2.kind, fb], ['pending', 'ordinary', ['provider_failed']], '4n o dono sumido: espera, depois a reserva, sem reenviar o Kling 4') }
    // 4q quem chega atrasado (o claim que leu é velho; no banco a queda já começou com outro dono): espera, não envia
    { const velho = nascimento(c); const atual = nascimento(c, { extra: { gemini_queda: { estado: 'iniciada', token: 'outro', desde: new Date(T0 + 80_000).toISOString(), motivo: 'recusa', erro: null } } })
      let k = 0; const x = await avanca({ db: atual.db, claim: velho.claim }, { now: T0 + 90_000, deps: { pollGemini: recusa, submitKling: async () => { k++; return 'k4-dup' } } })
      const lido = await CL.loadVerifiedCinematicClaim({ db: atual.db, secret: SEGREDO, userId: USER, generationId: GEN })
      igual([x.kind, k, lido.claim.response.kling4_trial.gemini_queda.token], ['pending', 0, 'outro'], '4q a vez é de quem começou: nenhum 2º POST, o token fica') }
    // 4r o filme já liberado: entrega, sem consultar
    { const n = nascimento(c); const lib = { ...n.claim, authorizedCompletedUrls: ['https://v3.fal.media/pronto.mp4'] }
      const x = await avanca({ db: n.db, claim: lib }, { now: T0 + 9 * MIN, deps: { pollGemini: proibido('consulta'), submitKling: proibido('POST') } })
      igual([x.kind, x.url], ['kling_done', 'https://v3.fal.media/pronto.mp4'], '4r já liberado = entrega') }
    // 4s a reserva de hoje (a real) aceita a origem Gemini depois de 'sem_kling4'
    { const n = nascimento(c, { extra: { gemini_queda: { estado: 'sem_kling4', token: 't', desde: new Date(T0).toISOString(), motivo: 'recusa', erro: null, sem_kling4: 'kling4_recusado' } } })
      const r2 = await CL.startKling4TrialFallback({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN, originalRequestId: 'gem-1', reason: 'provider_failed' })
      no(!r2.ok || r2.claim?.response?.kling4_trial?.fallback_started !== true, '4s a reserva de hoje começa a partir do Gemini') }
    // 4l2 [revisora 25/11, G8: dinheiro] o POST do Kling 4 da queda AMBÍGUO (503/prazo): um POST só, nunca outro — nem nesta consulta nem nas seguintes
    { fb.length = 0; const n = nascimento(c); let k = 0
      const ambiguo = async () => { k++; throw new m.EnvioDoKling4Incerto(true, 503) }
      await avanca(n, { now: T0 + 90_000, deps: { pollGemini: recusa, submitKling: ambiguo } })
      const lido = await CL.loadVerifiedCinematicClaim({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN })
      for (const dt of [2 * MIN, 4 * MIN, 12 * MIN]) await avanca({ db: n.db, claim: lido.claim }, { now: T0 + dt, deps: { pollGemini: recusa, submitKling: ambiguo } })
      igual(k, 1, '4l2 o Kling 4 ambíguo da queda: UM POST, nunca reenviado (G8)') }
    // 4o a troca exige o dono da vez; o filme de cliente (sem motor_do_clipe) não entra no ramo do Gemini
    { const n = nascimento(c, { extra: { gemini_queda: { estado: 'iniciada', token: 'dono', desde: new Date(T0).toISOString(), motivo: 'recusa', erro: null } } })
      const t = await CL.trocarGeminiPorKling4_2511({ db: n.db, secret: SEGREDO, userId: USER, generationId: GEN, geminiRequestId: 'gem-1', token: 'intruso', kling4RequestId: 'k', agoraIso: 'x' })
      no(t.ok !== false, '4o só o dono da vez troca o claim')
      no(c.a.filmeNoGemini2511({ ...n.claim, response: { ...n.claim.response, kling4_trial: { ...n.claim.response.kling4_trial, motor_do_clipe: undefined } } }) !== false, '4p sem o motor do clipe, o filme não é do Gemini') }
    // ── 5. [revisora 25/11, conserto 1] o selo e o custo de QUEM ENTREGOU no evento free_film_engine_used (o /admin e o relato de custo o leem) ──
    { const b = loader(over, { '@/lib/internalAccounts': { contaDaCasaExata: () => false } })(B)
      const doRpc = { film_id: GEN, generation_id: GEN, engine_used: 'kling4', cost_usd: 2.355, cost_basis: 'reserved_upper_bound', country: 'BR', seconds: 15, trial_version: 'kling4-2810' }
      const noAr = { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, motor_do_clipe: 'gemini_omni_flash', gemini_est_usd: 1.2285 }
      const g = b.seloDoFilmeGratis2511(noAr, doRpc)
      igual([g?.engine_used, g?.cost_usd, g?.cost_basis, g?.teto_reservado_usd, g?.motor_do_clipe, g?.country, g?.seconds], ['omni', 1.2285, 'estimado_gemini_sem_tokens', 2.355, 'gemini_omni_flash', 'BR', 15], '5a o Gemini entregou: Omni Flash, o custo estimado dele e o teto reservado ao lado')
      const queda = { ...noAr, motor_do_clipe: 'kling4', reserva_de: 'gemini_omni_flash', gemini_queda: { estado: 'feita', motivo: 'recusa' } }
      const q = b.seloDoFilmeGratis2511(queda, g)
      igual([q?.engine_used, q?.cost_usd, q?.cost_basis, q?.motores, q?.gemini_est_usd, q?.gemini_cobrado, 'teto_reservado_usd' in (q ?? {}), 'motor_do_clipe' in (q ?? {})], ['kling4', 2.355, 'reserved_upper_bound', ['gemini_omni_flash', 'kling4'], 1.2285, 'possivel', false, false], '5b a queda: Kling 4.0 com o custo dele e os dois motores e o estimado do Gemini (mesmo depois do omni)')
      igual(b.seloDoFilmeGratis2511(queda, doRpc), q, '5b2 a queda sobre o evento da RPC = o mesmo')
      igual(b.seloDoFilmeGratis2511({ ...queda, gemini_queda: { estado: 'no_envio' } }, doRpc)?.gemini_cobrado, 'nao', '5c a recusa no envio: o Gemini não cobrou')
      igual(b.seloDoFilmeGratis2511({ ...queda, engine_used: 'seedance15_fallback' }, { ...doRpc, engine_used: 'seedance15_fallback' })?.engine_used, 'seedance15_fallback', '5d a queda que foi à reserva de hoje: o motor da reserva')
      for (const [nome, mk, at] of [['filme sem Gemini', { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355 }, doRpc], ['sem o estimado', { ...noAr, gemini_est_usd: undefined }, doRpc],
        ['Gemini no ar mas o razão já na reserva', noAr, { ...doRpc, engine_used: 'seedance15_fallback' }], ['marcador nulo', null, doRpc]]) no(b.seloDoFilmeGratis2511(mk, at) !== null, '5e nada muda: ' + nome)
      // a gravação: o id da RPC (md5), lê e regrava SÓ esse evento; sem Gemini, nenhum acesso ao banco
      const { createHash } = nativeRequire('node:crypto'); const h = createHash('md5').update(`free_film_engine_used:${USER}:${GEN}`).digest('hex')
      const idRpc = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
      igual(await b.idDoEventoDoFilmeGratis(USER, GEN), idRpc, '5f o mesmo id que a RPC grava')
      const banco = (meta) => { const db = { meta, updates: [] }; db.from = (tab) => { const fl = []; let patch = null; const q = { select() { return q }, update(p) { patch = p; return q }, eq(k, v) { fl.push([k, v]); return q },
          async maybeSingle() { const ok = tab === 'events' && fl.some(([k, v]) => k === 'id' && v === idRpc) && fl.some(([k, v]) => k === 'name' && v === 'free_film_engine_used') && fl.some(([k, v]) => k === 'user_id' && v === USER); return { data: ok && db.meta ? { metadata: JSON.parse(JSON.stringify(db.meta)) } : null, error: null } },
          then(res) { if (patch) { const ok = tab === 'events' && fl.some(([k, v]) => k === 'id' && v === idRpc) && fl.some(([k, v]) => k === 'user_id' && v === USER); if (ok) { db.meta = patch.metadata; db.updates.push(patch) } } return Promise.resolve({ error: null }).then(res) } }; return q }; return db }
      { const db = banco(doRpc); no(await b.gravarSeloDoFilmeGratis2511(db, { jobId: GEN, userId: USER, marker: noAr }) !== true || db.meta.engine_used !== 'omni' || db.meta.cost_usd !== 1.2285 || db.updates.length !== 1, '5g a gravação regrava o evento do filme')
        no(await b.gravarSeloDoFilmeGratis2511(db, { jobId: GEN, userId: USER, marker: noAr }) !== true || db.updates.length !== 1, '5h de novo: nada muda (idempotente)') }
      { let acessos = 0; const db = { from: () => { acessos++; throw new Error('banco sem Gemini') } }; const r = await b.gravarSeloDoFilmeGratis2511(db, { jobId: GEN, userId: USER, marker: { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355 } }); no(r !== false || acessos !== 0, '5i sem Gemini: nenhum acesso ao banco') }
      // [revisora 25/11, volta 2] os 5 desfechos com a sequência REAL das três escritas no evento: a RPC record_kling4_trial_film (insere uma vez, on conflict
      // do nothing), a RPC transition_kling4_trial_fallback (só troca o motor se o evento estiver em kling4 ou seedance15_fallback) e o selo
      { const me2 = loader(over)('lib/admin/motorEntregue.ts')
        const desfecho = (passos) => { let ev = null
          for (const [tipo, x] of passos) {
            if (tipo === 'rpc') { if (!ev) ev = { ...doRpc, engine_used: x, cost_usd: x === 'kling4' || x === 'seedance15_fallback' ? 2.355 : 0 } }
            else if (tipo === 'transicao') { if (ev && (ev.engine_used === 'kling4' || ev.engine_used === 'seedance15_fallback')) ev = { ...ev, engine_used: 'seedance15_fallback' } }
            else if (tipo === 'selo') { const n = b.seloDoFilmeGratis2511(x, ev); if (n) ev = n } }
          return { ev, rotulo: me2.rotuloMotorGrupo('cinematic_ai', [me2.motorEntregueDe(ev.engine_used, null)], 'x', false) } }
        const quedaK4 = (motivo) => ({ ...noAr, motor_do_clipe: 'kling4', reserva_de: 'gemini_omni_flash', gemini_queda: { estado: 'feita', motivo } })
        const semK4 = { ...noAr, gemini_queda: { estado: 'sem_kling4', motivo: 'recusa', sem_kling4: 'kling4_incerto' } }
        const D = desfecho([['rpc', 'kling4'], ['selo', noAr], ['selo', semK4], ['transicao'], ['selo', { ...semK4, fallback_started: true }], ['rpc', 'seedance15_fallback'], ['transicao'], ['selo', { ...semK4, fallback_started: true, engine_used: 'seedance15_fallback', fallback_finalized: true }]])
        const E = desfecho([['rpc', 'kling4'], ['selo', noAr], ['selo', quedaK4('recusa')], ['transicao'], ['rpc', 'seedance15_fallback'], ['selo', { ...quedaK4('recusa'), fallback_started: true, engine_used: 'seedance15_fallback', fallback_finalized: true }]])
        const tabela = {
          A: desfecho([['rpc', 'kling4'], ['selo', noAr], ['rpc', 'kling4'], ['selo', noAr]]),
          B: desfecho([['rpc', 'kling4'], ['selo', noAr], ['selo', quedaK4('recusa')], ['rpc', 'kling4'], ['selo', quedaK4('recusa')]]),
          C: desfecho([['rpc', 'kling4'], ['selo', noAr], ['selo', quedaK4('prazo')], ['rpc', 'kling4'], ['selo', quedaK4('prazo')]]), D, E }
        const linha = (x) => [x.rotulo, x.ev.engine_used, x.ev.cost_usd, x.ev.motores ?? null, x.ev.gemini_est_usd ?? null]
        igual(Object.fromEntries(Object.entries(tabela).map(([k, x]) => [k, linha(x)])), {
          A: ['Omni Flash, filme grátis', 'omni', 1.2285, null, null],
          B: ['Kling 4.0, filme grátis', 'kling4', 2.355, ['gemini_omni_flash', 'kling4'], 1.2285],
          C: ['Kling 4.0, filme grátis', 'kling4', 2.355, ['gemini_omni_flash', 'kling4'], 1.2285],
          D: ['Seedance 1.5, reserva do filme grátis', 'seedance15_fallback', 2.355, ['gemini_omni_flash', 'seedance15_fallback'], 1.2285],
          E: ['Seedance 1.5, reserva do filme grátis', 'seedance15_fallback', 2.355, ['gemini_omni_flash', 'seedance15_fallback'], 1.2285] },
          '5k os 5 desfechos: o selo e o custo são os do motor que entregou (A Gemini, B/C queda para o Kling 4, D sem Kling 4 → a reserva, E o Kling 4 da queda estoura → a reserva)')
        no('teto_reservado_usd' in D.ev || 'motor_do_clipe' in D.ev, '5k D: sem os campos do Gemini no ar')
        igual(desfecho([['rpc', 'kling4'], ['selo', noAr], ['selo', semK4]]).ev.engine_used, 'seedance15_fallback', '5k D já na hora do sem_kling4 (antes da reserva terminar): a reserva') }
      // o rótulo do /admin a partir do evento regravado
      const me = loader(over)('lib/admin/motorEntregue.ts')
      igual([me.rotuloMotorGrupo('cinematic_ai', [me.motorEntregueDe(g.engine_used, 'omni')], 'x', false), me.rotuloMotorGrupo('cinematic_ai', [me.motorEntregueDe(q.engine_used, 'kling4')], 'x', false)],
        ['Omni Flash, filme grátis', 'Kling 4.0, filme grátis'], '5j o /admin: Omni Flash quando o Gemini entrega; Kling 4.0 na queda') }
  } catch (e) { falhas.push('lançou: ' + (e?.stack ?? e).toString().split('\n').slice(0, 3).join(' | ')) }
  return falhas
}

// ── a rota e o resto: o texto que os outros arquivos levam ──
function provaDoTexto(over = {}) {
  const f = []
  const no = (ruim, msg) => { if (ruim) f.push(msg) }
  const rota = over[ROUTE] ?? read(ROUTE), status = over[STATUS] ?? read(STATUS), sonda = over[SONDA] ?? read(SONDA)
  const ini = rota.indexOf('    const gemini2511: {'), fim = rota.indexOf('    if (kling4TrialCandidate && scenes.length === 3', ini)
  no(ini < 0 || fim < 0, 'R0 o trecho da tentativa do Gemini')
  const trecho = rota.slice(ini, fim)
  // R1 executa a tentativa com dublês: fora da casa e 'off' = nenhum pedido; na casa com referência = o pedido do adaptador, e a entrada do Kling 4 guardada
  const load = loader(over); const m = load(M)
  const rodar = async ({ email, modo = m.GEMINI_NA_ESTEIRA_2511, model = K4R, envio = null }) => {
    const envios = []; let montagens = 0
    const escopo = { geminiNaEsteiraLigado: m.geminiNaEsteiraLigado, GEMINI_NA_ESTEIRA_2511: modo, user: { email, id: USER }, kling4PorSecao: (x) => { montagens++; return x }, kling4Prompts: [], kling4ApprovedStills: [], kling4Timing: { referenciaUnica: { nomes: ['Elias Ward', 'Elias'], segundo: { nomes: ['Mara Quinn'] } } },
      buildKling4TrialInput: () => ({ model, input: FIX.kling4_input }), KLING4_REFERENCE_MODEL: K4R, geminiDoKling4: m.geminiDoKling4, submitGeminiTrialVideo: async (e) => { envios.push(e); if (envio) return envio(); return { requestId: 'gem-1', model: GEM, submittedAt: 'x' } },
      GeminiRecusadoNoEnvio: m.GeminiRecusadoNoEnvio, writeServerEvent: async () => true, GEMINI_ENVIO_EVENTO: 'x', generationId: GEN, ctxDespacho: () => ({ totalPosts: 0 }), kling4Posts: 0, process: { env: {} } }
    const corpo = ts.transpile('let kling4Posts = 0\n' + trecho + '\nreturn (async () => ({ job: await tentarGemini2511(), gemini2511 }))()', { target: ts.ScriptTarget.ES2022 })
    const r = await Function(...Object.keys(escopo).filter((k) => k !== 'kling4Posts'), corpo)(...Object.entries(escopo).filter(([k]) => k !== 'kling4Posts').map(([, v]) => v))
    return { ...r, envios, montagens }
  }
  return { f, no, rota, status, sonda, rodar, m }
}

async function suite(over = {}) {
  const falhas = await prova(over)
  const t = provaDoTexto(over)
  try {
    for (const [email, modo] of [[CLIENTE, 'internal'], [null, 'internal'], ['joseph@usekineo.com', 'internal'], [CASA, 'off']]) {
      const x = await t.rodar({ email, modo })
      t.no(x.job !== null || x.envios.length !== 0 || x.gemini2511.entrada !== null || x.montagens !== 0, `R1 ${email} '${modo}': nenhum pedido ao Gemini e nada montado (a reversão: 'internal' = só a casa, 'off' = o de antes)`)
    }
    // [dono 25/11 15:27] com a chave REAL ('public'): o cliente recebe o MESMO pedido do Gemini que a casa (o adaptador da nota 10), e a entrada do Kling 4 fica guardada
    for (const email of [CLIENTE, 'joseph@usekineo.com', CASA]) {
      const x = await t.rodar({ email })
      t.no(x.job?.requestId !== 'gem-1' || JSON.stringify(x.envios) !== JSON.stringify([FIX.gemini_input_nota_10]) || JSON.stringify(x.gemini2511.kling4) !== JSON.stringify({ model: K4R, input: FIX.kling4_input }), `R1p ${email} com a chave real: o pedido do Gemini e a entrada do Kling 4 guardada`)
    }
    const casa = await t.rodar({ email: CASA, modo: 'internal' })
    t.no(casa.job?.requestId !== 'gem-1' || JSON.stringify(casa.envios) !== JSON.stringify([FIX.gemini_input_nota_10]) || JSON.stringify(casa.gemini2511.kling4) !== JSON.stringify({ model: K4R, input: FIX.kling4_input }), 'R2 a casa: o pedido do adaptador, e a entrada do Kling 4 guardada')
    // G9 [revisora 25/11: dinheiro] a recusa 4xx no envio: nada aceito, o Kling 4 vai NA HORA (a tentativa devolve null e o envio segue); o envio ambíguo
    // lança (a regra de hoje do envio incerto: nenhum Kling 4 por cima de um Gemini talvez aceito)
    { const rec = await t.rodar({ email: CASA, envio: () => { throw new t.m.GeminiRecusadoNoEnvio(422) } })
      t.no(rec.job !== null || rec.gemini2511.recusaNoEnvio !== 422 || rec.envios.length !== 1, 'G9 a recusa no envio: o Kling 4 na hora, sem a reserva') }
    { let lancou = false; try { await t.rodar({ email: CASA, envio: () => { throw new Error('503 ambíguo') } }) } catch { lancou = true }
      t.no(!lancou, 'G9b o envio ambíguo do Gemini lança (nenhum Kling 4 por cima)') }
    const semRef = await t.rodar({ email: CASA, model: 'kling/v4/image-to-video' })
    t.no(semRef.job !== null || semRef.envios.length !== 0, 'R3 sem referência: o Kling 4 de sempre')
  } catch (e) { t.f.push('R lançou: ' + String(e?.message ?? e)) }
  const { no, rota, status, sonda } = t
  no(!rota.includes('submit: async () => { await aplicarSujeitoNoKling4(); { const viaGemini2511 = await tentarGemini2511(); if (viaGemini2511) return viaGemini2511 } /* KINEO-GEMINI-NA-ESTEIRA-2511 */ return submitKling4TrialVideo(kling4PorSecao({'), 'R4 o envio tenta o Gemini antes do Kling 4 e cai nele sem o Gemini')
  no(!rota.includes("if (kling4Trial.job && kling4Trial.job.model === GEMINI_OMNI_REF_MODEL && gemini2511.entrada && gemini2511.kling4) Object.assign(response.kling4_trial as Record<string, unknown>, { motor_do_clipe: 'gemini_omni_flash'"), 'R5 o marcador só com o Gemini aceito')
  no(!rota.includes('kling4_reserva: gemini2511.kling4,'), 'R6 a entrada do Kling 4 guardada no claim')
  no(!rota.includes("if (kling4Trial.job.model === GEMINI_OMNI_REF_MODEL && gemini2511.entrada) response.scene_fal_inputs = [gemini2511.entrada]"), 'R7 o claim registra o que foi à fal')
  no(!status.includes("'google/gemini-omni-flash/v1.2/reference-to-video', // KINEO-GEMINI-NA-ESTEIRA-2511"), 'R8 a consulta do filme aceita o modelo do Gemini')
  no(!sonda.includes('resultado: res.data ?? null'), 'R9 a sonda devolve o resultado inteiro')
  no(/debitVideoCredits|debit\(/.test(read(A)) || /debitVideoCredits/.test(read(M)), 'R10 a queda não debita')
  no(/contaDaCasaExata|geminiNaEsteiraLigado|isDryRunAccount|isInternalEmail|\.email\b/.test(over[A] ?? read(A)), 'R15 [25/11, para todos] o acompanhamento, a queda e o selo não olham quem é a conta: as travas de dinheiro valem igual para o cliente')
  { const compose = over[COMPOSE] ?? read(COMPOSE), asy = over[A] ?? read(A)
    const depois = (txt, antes, linha) => { const i = txt.indexOf(antes); return i >= 0 && txt.indexOf(linha, i) > i && txt.indexOf(linha, i) - i < antes.length + 40 }
    no(!depois(rota, '          country: marker.country, engineUsed: trialEngine, costUsd: marker.cost_usd })\n', "        if (typeof gravarSeloDoFilmeGratis2511 === 'function') await gravarSeloDoFilmeGratis2511(cinematicAdmin, { jobId: generationId, userId: user.id, marker })"), 'R12 o nascimento regrava o selo logo depois do razão')
    no(!depois(compose, '        country: marker.country, engineUsed: trialEngine, costUsd: marker.cost_usd })\n', "      if (typeof gravarSeloDoFilmeGratis2511 === 'function') await gravarSeloDoFilmeGratis2511(composeAdmin, { jobId: generationId, userId: authenticatedUserId, marker })"), 'R13 o compose regrava o selo logo depois do razão')
    no(!asy.includes('    if (t?.ok) { await gravarSeloDoFilmeGratis2511(args.db, { jobId: args.generationId, userId: args.userId, marker: t.claim.response?.kling4_trial }); return { kind: \'pending\', claim: t.claim } }'), 'R14 a queda regrava o selo (Kling 4.0 com os dois custos)') }
  // o selo: o modelo que entregou
  try {
    const fe = loader({})('lib/filmEngineUsed.ts')
    const sel = (models) => fe.filmEngineUsed({ response: { kling4_trial: { engine_used: 'kling4' } }, falModels: models, falRequestIds: models.map(() => 'r'), authorizedCompletedUrls: models.map(() => 'https://v') })
    no(sel([GEM]) !== 'omni' || sel([K4R]) !== 'kling4', 'R11 o selo: Gemini = omni (Omni Flash), a queda = kling4 (Kling 4.0)')
  } catch (e) { t.f.push('R11 lançou: ' + e.message) }
  return [...falhas, ...t.f]
}

const real = await suite()
for (const x of real) console.error('FALHOU ' + x)
const MUTANTES = [
  [M, "export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'public'", "export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'internal'"], // [25/11] o cliente sem o Gemini
  [M, "export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'public'", "export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'off'"],
  [M, "modo === 'public' || (modo === 'internal'", "(modo === 'internal'"], // 'public' deixa de ligar
  [M, "modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))", "modo !== 'off'"],
  [M, "`${t}-${t + d} s (shot ${k + 1}, hard cut): ", "`${t}-${t + d}s (shot ${k + 1}): "],
  [M, "(_m, n) => `<IMAGE_REF_${Number(n) - 1}>`", "(_m, n) => `<IMAGE_REF_${Number(n)}>`"],
  [M, "  if (t !== 15) return null\n", ''],
  [M, '    if (refs.some((r) => r > fotos.length) || /<IMAGE_REF_\\d+>/.test(p)) return null\n', ''],
  [M, "if (r.status >= 400 && r.status < 500 && r.status !== 408) throw new GeminiRecusadoNoEnvio(r.status)", 'if (false) throw new GeminiRecusadoNoEnvio(r.status)'],
  [M, "if (r.status >= 400 && r.status < 500 && r.status !== 408)", 'if (r.status >= 400)'],
  [M, "const GEMINI_FILA = 'https://queue.fal.run/google/gemini-omni-flash'", "const GEMINI_FILA = 'https://queue.fal.run/kling/v4'"],
  [M, "    if (!res.ok) return res.status === 422 || res.status === 400 ? { status: 'failed'", "    if (!res.ok) return false ? { status: 'failed'"],
  [M, "  if (c.status === 'failed') return { acao: 'queda', motivo: 'recusa', erro: c.erro }\n", ''],
  [M, "  if (c.status === 'processing' && idadeMs < GEMINI_PRAZO_MS + GEMINI_ESPERA_EXTRA_MS) return { acao: 'esperar' }\n", ''],
  [M, 'export const GEMINI_PRAZO_MS = 4 * 60_000', 'export const GEMINI_PRAZO_MS = 60_000'],
  [M, "  const msg = typeof d?.msg === 'string' ? d.msg", "  const msg = typeof d?.input === 'string' ? d.input : typeof d?.msg === 'string' ? d.msg"],
  [A, '    if (Number.isFinite(desde) && now - desde < GEMINI_QUEDA_ORFA_MS) return { kind: \'pending\', claim }', '    if (false) return { kind: \'pending\', claim }'],
  [A, "  if (minha?.token !== token) return { kind: 'pending', claim: ini.claim }\n", ''],
  [A, '  if (queda?.estado === \'sem_kling4\') return reserva(claim)\n', ''],
  [A, '(guardada.model, guardada.input)', "(guardada.model, { ...guardada.input, duration: 10 })"],
  [A, "    const r = await semKling4NaQuedaDoGemini2511({ db: args.db, secret: args.secret, userId: args.userId, generationId: args.generationId, geminiRequestId: gid, porque }).catch(() => null)\n    return r?.ok ? reserva(r.claim) : { kind: 'pending', claim: ini.claim }", "    return { kind: 'pending', claim: ini.claim }"],
  [A, "  const pronto = claim.authorizedCompletedUrls[0]\n  if (pronto) return { kind: 'kling_done', claim, url: pronto }\n", ''],
  [S, "  if (filmeNoGemini2511(args.claim)) return avancarGemini2511(args, { fallback: deps.fallback, ...(deps.gemini ?? {}) })", '  if (false) return avancarGemini2511(args, { fallback: deps.fallback, ...(deps.gemini ?? {}) })'],
  [S, "ids.length === 1 && ids[0] === m.gemini_request_id &&", 'ids.length === 1 && ids[0] === m.gemini_request_id && false &&'],
  [C, "  if (marker.gemini_queda) return { ok: true, claim: current } // outro servidor já começou: quem chama lê o token\n", ''],
  [C, "if (!marker || !queda || queda.estado !== 'iniciada' || queda.token !== args.token) return { ok: false, error: 'not the fallback owner', conflict: true }", "if (!marker || !queda) return { ok: false, error: 'not the fallback owner', conflict: true }"],
  [C, 'scene_fal_inputs: [reserva.input],', 'scene_fal_inputs: current.response?.scene_fal_inputs,'],
  [C, "original_request_id: args.kling4RequestId, submitted_at: args.agoraIso,", 'original_request_id: args.kling4RequestId,'],
  [C, "erro: args.erro ? String(args.erro).slice(0, 300) : null }", 'erro: null }'],
  [C, ", GEMINI_OMNI_REF_MODEL /* KINEO-GEMINI-NA-ESTEIRA-2511 */].includes(current.falModels[0])", '].includes(current.falModels[0])'],
  [ROUTE, '      if (!geminiNaEsteiraLigado(GEMINI_NA_ESTEIRA_2511, user.email)) return null\n', ''],
  [ROUTE, '      if (wire.model !== KLING4_REFERENCE_MODEL) return null\n', ''],
  [ROUTE, '        gemini2511.entrada = entrada; gemini2511.kling4 = { model: wire.model, input: wire.input }', '        gemini2511.entrada = entrada'],
  [ROUTE, "const entrada = geminiDoKling4(wire.input, [ru?.nomes?.[0], ru?.segundo?.nomes?.[0]])", "const entrada = geminiDoKling4(wire.input, [ru?.nomes?.[1], ru?.segundo?.nomes?.[0]])"],
  [STATUS, "  'google/gemini-omni-flash/v1.2/reference-to-video', // KINEO-GEMINI-NA-ESTEIRA-2511 (o filme grátis com foto, só a casa)\n", ''],
  // [revisora 25/11] G8 e G9 (dinheiro) e o conserto 1 (o selo)
  [A, '  catch (e) {\n    const porque', '  catch (e) {\n    if (e instanceof EnvioDoKling4Incerto && e.ambiguo) { try { await (deps.submitKling as (a: string, b: Record<string, unknown>) => Promise<string>)(guardada.model, guardada.input) } catch { /* G8 */ } }\n    const porque'],
  [A, '    const r = await semKling4NaQuedaDoGemini2511({', '    const r = null && await semKling4NaQuedaDoGemini2511({'],
  [ROUTE, "aceito: false, http: err.http } }).catch(() => false)\n        return null", "aceito: false, http: err.http } }).catch(() => false)\n        throw err"],
  [A, "    if (t?.ok) { await gravarSeloDoFilmeGratis2511(args.db, { jobId: args.generationId, userId: args.userId, marker: t.claim.response?.kling4_trial }); return { kind: 'pending', claim: t.claim } }", "    if (t?.ok) return { kind: 'pending', claim: t.claim }"],
  [ROUTE, "        if (typeof gravarSeloDoFilmeGratis2511 === 'function') await gravarSeloDoFilmeGratis2511(cinematicAdmin, { jobId: generationId, userId: user.id, marker })", ''],
  [COMPOSE, "      if (typeof gravarSeloDoFilmeGratis2511 === 'function') await gravarSeloDoFilmeGratis2511(composeAdmin, { jobId: generationId, userId: authenticatedUserId, marker })", ''],
  [B, "engine_used: 'omni', motor_do_clipe: 'gemini_omni_flash'", "engine_used: 'kling4', motor_do_clipe: 'gemini_omni_flash'"],
  [B, "cost_usd: est, cost_basis: 'estimado_gemini_sem_tokens'", "cost_usd: m.cost_usd, cost_basis: 'estimado_gemini_sem_tokens'"],
  [B, "gemini_cobrado: recusaNoEnvio ? 'nao' : 'possivel'", "gemini_cobrado: 'possivel'"],
  [B, "    if (atual.engine_used !== 'kling4' && atual.engine_used !== 'omni') return null", ''],
  [B, '    if (!novo || JSON.stringify(novo) === JSON.stringify(atual)) return !!novo\n', '    if (!novo) return false\n'],
  [B, "(m.motor_do_clipe !== 'gemini_omni_flash' && m.reserva_de !== 'gemini_omni_flash') || ", ''],
  [B, 'engine_used: motor, cost_usd: custoDoMotor,', 'engine_used: motor, cost_usd: atual.cost_usd ?? null,'],
  [B, "motores: ['gemini_omni_flash', motor],", 'motores: [motor],'],
  [B, 'const { teto_reservado_usd: _t, motor_do_clipe: _mc, ...resto } = atual', 'const resto = atual'],
  [B, "  if (reservaDoGemini) {\n", '  if (false) {\n'], // [volta 2] o desfecho D volta a dizer Omni Flash
  [B, " || (m.gemini_queda as { estado?: unknown } | undefined)?.estado === 'sem_kling4')", ')'], // [volta 2] o sem_kling4 antes da reserva começar
  [B, "motores: ['gemini_omni_flash', 'seedance15_fallback'],", "motores: ['seedance15_fallback'],"], // [volta 2]
]
let mortos = 0; const vivos = []
for (const [file, de, para] of MUTANTES) {
  const src = read(file)
  if (!src.includes(de)) { vivos.push(file + ' (trecho não encontrado): ' + de.slice(0, 80)); continue }
  const f = await suite({ [file]: src.split(de).join(para) })
  if (f.length) mortos++; else vivos.push(file + ': ' + de.slice(0, 90))
}
for (const v of vivos) console.error('MUTANTE VIVO · ' + v)
console.log(`${real.length ? 'FALHOU' : 'PASS'} KINEO-GEMINI-NA-ESTEIRA-2511: o 499143ac vira byte a byte o pedido da nota 10; só a casa exata (cliente, nulo e 'off' = nenhum pedido ao Gemini); recusa no envio = o Kling 4 na hora; a recusa depois do envio, o prazo e a fila = UMA queda para o Kling 4 reference com a entrada guardada (três consultas juntas = um POST), o claim assinado troca e segue o Kling 4 de hoje; sem recibo ou dono sumido = a reserva de hoje; nenhum débito; o id antigo acha o filme; selo omni → kling4; ${mortos}/${MUTANTES.length} mutantes mortos.`)
if (real.length || vivos.length) process.exit(1)
