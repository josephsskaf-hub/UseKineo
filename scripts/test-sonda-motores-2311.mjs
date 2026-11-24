// KINEO-SONDA-MOTORES-2311 — guardião OFFLINE do modo "sonda" de app/api/admin/engine-test/route.ts.
// EXECUTA a rota (transpilada e rodada num vm) com a fal, o login e o banco trocados por dublês: nenhuma rede, chave, envio ou escrita real.
// Prova: pedido válido dos 3 endpoints chega à fal idêntico; quem não é administrador não envia nada; entrada fora da regra é recusada sem
// envio; o teto de US$ 15 nas 24 h recusa sem envio, inclusive quando a soma não pode ser lida; os modos antigos respondem como antes.
// Depois roda a MESMA bateria contra mutantes da rota: cada mutante tem de derrubar pelo menos uma asserção.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE = readFileSync(join(root, 'app/api/admin/engine-test/route.ts'), 'utf8').replace(/\r\n/g, '\n')
const SUPA = 'https://fixture-project.supabase.co'
const OUR_IMG = `${SUPA}/storage/v1/object/public/probe/ref-1.png`
const FAL_IMG = 'https://v3.fal.media/files/x/ref-2.png'
const ADMIN = { id: '00000000-0000-0000-0000-00000000a0a0', email: 'josephsskaf@gmail.com' }
const STRANGER = { id: '00000000-0000-0000-0000-00000000b0b0', email: 'someone@example.com' }
const REQ_ID = '7f1c2d3e-4b5a-6978-8a9b-0c1d2e3f4a5b'
// A rota roda noutro realm (vm): tudo que sai dela é copiado para objetos deste realm antes da comparação estrita.
const plain = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

function load(source, deps, env) {
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(out, {
    exports, Date, URL, URLSearchParams, console: { log() {}, warn() {}, error() {} },
    process: { env },
    require(id) {
      if (Object.hasOwn(deps, id)) return deps[id]
      throw new Error('dependência sem dublê: ' + id)
    },
  }, { timeout: 5000 })
  return exports
}

// Banco falso: só a tabela events, com os filtros que a rota usa. Cada leitura e escrita fica registrada.
function fakeDb({ rows = [], readError = false, readThrows = false, insertError = false } = {}) {
  const reads = [], inserts = []
  return {
    reads, inserts,
    from(table) {
      const preds = []
      let insertion = null, cap = Infinity, wasRead = false
      const q = {
        select() { wasRead = true; return q },
        eq(k, v) { preds.push((r) => r[k] === v); return q },
        gte(k, v) { preds.push((r) => r[k] >= v); return q },
        limit(n) { cap = n; return q },
        insert(row) { insertion = plain(row); return q },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (insertion) { inserts.push({ table, row: insertion }); return insertError ? { data: null, error: { message: 'fixture insert failed' } } : { data: null, error: null } }
            if (wasRead) reads.push({ table })
            if (readThrows) throw new Error('fixture network down')
            if (readError) return { data: null, error: { message: 'fixture read failed' } }
            return { data: rows.filter((r) => table === 'events' && preds.every((p) => p(r))).slice(0, cap).map((r) => ({ metadata: r.metadata })), error: null }
          }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

function fakeFal({ submitThrows = false, status = 'COMPLETED', resultThrows = false } = {}) {
  const submits = [], configs = []
  return {
    submits, configs,
    fal: {
      config(c) { configs.push(c) },
      queue: {
        async submit(model, opts) { submits.push({ model, input: plain(opts.input) }); if (submitThrows) throw Object.assign(new Error('Unprocessable'), { body: { detail: 'bad' } }); return { request_id: REQ_ID } },
        async status() { return { status } },
        async result() { if (resultThrows) throw Object.assign(new Error('content_policy_violation: refused'), { body: { detail: [{ type: 'content_policy_violation' }] } }); return { data: { video: { url: 'https://v3.fal.media/files/out.mp4' } } } },
      },
    },
  }
}

function harness(source, { user = ADMIN, db = fakeDb(), fal = fakeFal(), dbNull = false } = {}) {
  const deps = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body: plain(body) }) }, NextRequest: class {} },
    '@fal-ai/client': { fal: fal.fal },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '../_shared/db': { serviceClient: () => (dbNull ? null : db) },
  }
  const route = load(source, deps, { FAL_KEY: 'fixture-not-a-key', NEXT_PUBLIC_SUPABASE_URL: SUPA })
  const req = (query, body) => ({ nextUrl: { searchParams: new URLSearchParams(query) }, json: async () => (body === undefined ? null : JSON.parse(JSON.stringify(body))) })
  return {
    db, fal,
    post: (query, body) => route.POST(req(query, body)),
    get: (query) => route.GET(req(query)),
  }
}

const now = Date.now()
const ev = (est_usd, minutesAgo = 30, name = 'admin_engine_probe') => ({ name, created_at: new Date(now - minutesAgo * 60000).toISOString(), metadata: { est_usd } })
const kling = (extra = {}) => ({ prompt: 'A woman in a red coat walks through rain, handheld.', duration: 15, resolution: '720p', aspect_ratio: '9:16', image_urls: [OUR_IMG, FAL_IMG], ...extra })
const probe = (endpoint, input) => ({ endpoint, input })
const K4 = 'kling/v4/reference-to-video', K4F = 'kling/v4/flash/reference-to-video', GEM = 'google/gemini-omni-flash/v1.2/reference-to-video'

const cases = []
const test = (name, run) => cases.push({ name, run })

async function refusedWithoutSend(h, query, body, status, error) {
  const r = await h.post(query, body)
  assert.equal(r.status, status, `status ${r.status} ${JSON.stringify(r.body)}`)
  if (error) assert.equal(r.body.error, error)
  assert.equal(h.fal.submits.length, 0, 'nada pode chegar à fal')
  assert.equal(h.db.inserts.length, 0, 'nenhum evento pode ser gravado')
  return r
}

// ── Pedidos válidos dos 3 endpoints ──
for (const [endpoint, seconds, est] of [[K4, 15, 2.355], [K4F, 10, 0.94], [GEM, 8, 0.6552]]) {
  test(`válido ${endpoint} chega à fal com a entrada idêntica, grava o evento e responde o custo`, async () => {
    const h = harness(ROUTE, { db: fakeDb({ rows: [ev(1.5), ev(9, 60 * 30), ev(3, 10, 'other_event')] }) })
    const input = kling({ duration: seconds })
    const r = await h.post('probe=1', probe(endpoint, input))
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.deepEqual(h.fal.submits, [{ model: endpoint, input }])
    assert.deepEqual(Object.keys(h.fal.submits[0].input).sort(), Object.keys(input).sort())
    assert.deepEqual(r.body, { model: endpoint, request_id: REQ_ID, est_usd: est, day_total_usd: Math.round((1.5 + est) * 10000) / 10000 })
    assert.equal(h.db.inserts.length, 1)
    assert.deepEqual(h.db.inserts[0], { table: 'events', row: { user_id: ADMIN.id, name: 'admin_engine_probe', path: '/api/admin/engine-test', metadata: { endpoint, seconds, est_usd: est, request_id: REQ_ID } } })
  })
}
test('multi_prompt válido no Kling 4 (soma = duração) chega idêntico', async () => {
  const h = harness(ROUTE)
  const input = { multi_prompt: [{ prompt: 'Wide shot, street.', duration: 4 }, { prompt: 'Close on face.', duration: 3 }, { prompt: 'Walks away.', duration: 3 }], duration: 10, resolution: '720p', aspect_ratio: '9:16', image_urls: [OUR_IMG] }
  const r = await h.post('probe=1', probe(K4, input))
  assert.equal(r.status, 200, JSON.stringify(r.body))
  assert.deepEqual(h.fal.submits, [{ model: K4, input }])
  assert.equal(r.body.est_usd, 1.57)
})

// ── Guarda de administrador ──
test('sem login: 403 e nada enviado', async () => { const h = harness(ROUTE, { user: null }); await refusedWithoutSend(h, 'probe=1', probe(K4, kling()), 403); assert.equal(h.db.reads.length, 0) })
test('logado sem ser administrador: 403 e nada enviado', async () => { const h = harness(ROUTE, { user: STRANGER }); await refusedWithoutSend(h, 'probe=1', probe(K4, kling()), 403); assert.equal(h.db.reads.length, 0) })
test('GET da sonda sem ser administrador: 403 e a fal não é consultada', async () => {
  const h = harness(ROUTE, { user: STRANGER })
  const r = await h.get(`engine=probe&endpoint=${K4}&request_id=${REQ_ID}`)
  assert.equal(r.status, 403); assert.equal(h.fal.configs.length, 0)
})

// ── Entrada recusada sem envio ──
test('endpoint fora da lista: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe('fal-ai/kling-video/v3/pro/text-to-video', kling()), 400, 'unknown_endpoint') })
test('endpoint parecido (prefixo) fora da lista: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe('kling/v4/reference-to-video/extra', kling()), 400, 'unknown_endpoint') })
test('chave a mais na entrada: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ negative_prompt: 'x' })), 400, 'unknown_input_key') })
test('1080p: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4F, kling({ resolution: '1080p' })), 400, 'bad_resolution') })
test('sem resolução: 400 (o padrão do fornecedor podia custar mais)', async () => { const i = kling(); delete i.resolution; await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4F, i), 400, 'bad_resolution') })
test('16:9: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(GEM, kling({ aspect_ratio: '16:9' })), 400, 'bad_aspect_ratio') })
test('16 s: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ duration: 16 })), 400, 'bad_duration') })
test('2 s e 7,5 s: 400', async () => {
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ duration: 2 })), 400, 'bad_duration')
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ duration: 7.5 })), 400, 'bad_duration')
})
test('imagem de outro domínio: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ image_urls: [OUR_IMG, 'https://evil.example.com/x.png'] })), 400, 'image_not_allowed') })
test('4 imagens e lista vazia: 400', async () => {
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ image_urls: [OUR_IMG, OUR_IMG, OUR_IMG, OUR_IMG] })), 400, 'image_not_allowed')
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ image_urls: [] })), 400, 'image_not_allowed')
})
test('prompt de 4.001 caracteres: 400', async () => { await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ prompt: 'a'.repeat(4001) })), 400, 'bad_prompt') })
test('prompt e multi_prompt juntos, ou nenhum: 400', async () => {
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, kling({ multi_prompt: [{ prompt: 'x', duration: 15 }] })), 400, 'prompt_xor_multi_prompt')
  const i = kling(); delete i.prompt
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, i), 400, 'prompt_xor_multi_prompt')
})
test('multi_prompt com soma errada: 400', async () => {
  const i = kling({ duration: 10, multi_prompt: [{ prompt: 'a', duration: 4 }, { prompt: 'b', duration: 4 }] }); delete i.prompt
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, i), 400, 'multi_prompt_duration_mismatch')
})
test('multi_prompt no Gemini e no Flash: 400', async () => {
  for (const ep of [GEM, K4F]) {
    const i = kling({ duration: 6, multi_prompt: [{ prompt: 'a', duration: 3 }, { prompt: 'b', duration: 3 }] }); delete i.prompt
    await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(ep, i), 400, 'multi_prompt_not_supported')
  }
})
test('plano com chave a mais ou prompt de 513: 400', async () => {
  const a = kling({ duration: 6, multi_prompt: [{ prompt: 'a', duration: 6, camera: 'x' }] }); delete a.prompt
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, a), 400, 'bad_multi_prompt')
  const b = kling({ duration: 6, multi_prompt: [{ prompt: 'a'.repeat(513), duration: 6 }] }); delete b.prompt
  await refusedWithoutSend(harness(ROUTE), 'probe=1', probe(K4, b), 400, 'bad_multi_prompt')
})

// ── Trava de dinheiro ──
test('teto do dia: já há US$ 14,00 e chega um pedido de US$ 2,355 → 429 sem envio', async () => {
  const h = harness(ROUTE, { db: fakeDb({ rows: [ev(10), ev(4)] }) })
  const r = await refusedWithoutSend(h, 'probe=1', probe(K4, kling()), 429, 'daily_cap')
  assert.equal(r.body.day_total_usd, 14); assert.equal(r.body.est_usd, 2.355)
})
test('exatamente US$ 15,00 no total ainda passa (o teto é "passar de")', async () => {
  const h = harness(ROUTE, { db: fakeDb({ rows: [ev(12.645)] }) })
  const r = await h.post('probe=1', probe(K4, kling()))
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.day_total_usd, 15); assert.equal(h.fal.submits.length, 1)
})
test('sonda de mais de 24 h não conta para o teto', async () => {
  const h = harness(ROUTE, { db: fakeDb({ rows: [ev(14, 24 * 60 + 5)] }) })
  const r = await h.post('probe=1', probe(K4, kling()))
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.day_total_usd, 2.355)
})
test('leitura da soma com erro: recusa sem envio', async () => { await refusedWithoutSend(harness(ROUTE, { db: fakeDb({ readError: true }) }), 'probe=1', probe(K4F, kling({ duration: 5 })), 503, 'spend_unreadable') })
test('leitura da soma estourando exceção: recusa sem envio', async () => { await refusedWithoutSend(harness(ROUTE, { db: fakeDb({ readThrows: true }) }), 'probe=1', probe(K4F, kling({ duration: 5 })), 503, 'spend_unreadable') })
test('evento antigo com est_usd ilegível: recusa sem envio', async () => { await refusedWithoutSend(harness(ROUTE, { db: fakeDb({ rows: [{ ...ev(1), metadata: { est_usd: '1' } }] }) }), 'probe=1', probe(K4F, kling({ duration: 5 })), 503, 'spend_unreadable') })
test('sem cliente de serviço: recusa sem envio', async () => { await refusedWithoutSend(harness(ROUTE, { dbNull: true }), 'probe=1', probe(K4F, kling({ duration: 5 })), 503, 'spend_unreadable') })
test('fila recusou: 502 e nenhum evento gravado', async () => {
  const h = harness(ROUTE, { fal: fakeFal({ submitThrows: true }) })
  const r = await h.post('probe=1', probe(GEM, kling({ duration: 5 })))
  assert.equal(r.status, 502); assert.equal(h.db.inserts.length, 0)
})
test('evento não gravado depois de a fila aceitar: devolve o request_id com aviso', async () => {
  const h = harness(ROUTE, { db: fakeDb({ insertError: true }) })
  const r = await h.post('probe=1', probe(GEM, kling({ duration: 5 })))
  assert.equal(r.status, 200); assert.equal(r.body.request_id, REQ_ID); assert.equal(r.body.warning, 'event_not_logged')
})

// ── GET da sonda ──
test('GET da sonda pronto: status e URL do vídeo', async () => {
  const h = harness(ROUTE)
  const r = await h.get(`engine=probe&endpoint=${encodeURIComponent(GEM)}&request_id=${REQ_ID}`)
  assert.deepEqual(r, { status: 200, body: { status: 'COMPLETED', model: GEM, video_url: 'https://v3.fal.media/files/out.mp4' } })
})
test('GET da sonda na fila: status sem URL', async () => {
  const h = harness(ROUTE, { fal: fakeFal({ status: 'IN_QUEUE' }) })
  assert.deepEqual(await h.get(`engine=probe&endpoint=${K4}&request_id=${REQ_ID}`), { status: 200, body: { status: 'IN_QUEUE', video_url: null } })
})
test('GET da sonda com recusa de conteúdo: failed com mensagem curta, sem 500', async () => {
  const h = harness(ROUTE, { fal: fakeFal({ resultThrows: true }) })
  const r = await h.get(`engine=probe&endpoint=${K4F}&request_id=${REQ_ID}`)
  assert.equal(r.status, 200); assert.equal(r.body.status, 'failed'); assert.match(r.body.error, /content_policy_violation/); assert.ok(r.body.error.length <= 300)
})
test('GET da sonda com endpoint fora da lista: 400 sem consultar a fal', async () => {
  const h = harness(ROUTE)
  const r = await h.get(`engine=probe&endpoint=fal-ai/wan-3/image-to-video&request_id=${REQ_ID}`)
  assert.equal(r.status, 400); assert.equal(h.fal.configs.length, 0)
})

// ── Modos antigos continuam iguais ──
test('modo antigo (engine kling4_flash) envia a mesma entrada de antes e não toca no banco', async () => {
  const h = harness(ROUTE)
  const r = await h.post('', { engine: 'kling4_flash', prompt: 'walk', image_url: OUR_IMG, seconds: 5 })
  assert.deepEqual(r, { status: 200, body: { model: 'kling/v4/flash/image-to-video', request_id: REQ_ID } })
  assert.deepEqual(h.fal.submits, [{ model: 'kling/v4/flash/image-to-video', input: { prompt: 'walk', start_image_url: OUR_IMG, duration: 5, resolution: '720p' } }])
  assert.equal(h.db.reads.length + h.db.inserts.length, 0)
})
test('modo antigo recusa motor desconhecido e não-administrador como antes', async () => {
  const h = harness(ROUTE)
  const r = await h.post('', { engine: 'kling/v4/reference-to-video', prompt: 'walk', image_url: OUR_IMG, seconds: 5 })
  assert.equal(r.status, 400); assert.equal(r.body.error, 'unknown_engine'); assert.deepEqual(r.body.engines, ['h3_max_turbo', 'kling4_flash', 'wan3'])
  const s = harness(ROUTE, { user: STRANGER })
  assert.deepEqual(await s.post('', { engine: 'wan3', prompt: 'walk', image_url: OUR_IMG, seconds: 5 }), { status: 403, body: { error: 'Forbidden' } })
})
test('modo motion=1 continua no Kling 3 com os mesmos campos', async () => {
  const h = harness(ROUTE)
  const r = await h.post('motion=1', { shots: [{ prompt: 'a', seconds: 3 }, { prompt: 'b', seconds: 2 }] })
  assert.deepEqual(r, { status: 200, body: { model: 'fal-ai/kling-video/v3/pro/text-to-video', request_id: REQ_ID } })
  assert.deepEqual(h.fal.submits[0].input.multi_prompt, [{ prompt: 'a', duration: '3' }, { prompt: 'b', duration: '2' }])
})
test('GET antigo (engine=wan3) e (engine=motion) respondem como antes; erro vira ERROR', async () => {
  const h = harness(ROUTE)
  assert.deepEqual(await h.get(`engine=wan3&request_id=${REQ_ID}`), { status: 200, body: { status: 'COMPLETED', model: 'fal-ai/wan-3/image-to-video', video_url: 'https://v3.fal.media/files/out.mp4' } })
  assert.deepEqual(await h.get(`engine=motion&request_id=${REQ_ID}`), { status: 200, body: { status: 'COMPLETED', model: 'fal-ai/kling-video/v3/pro/text-to-video', video_url: 'https://v3.fal.media/files/out.mp4' } })
  const e = harness(ROUTE, { fal: fakeFal({ resultThrows: true }) })
  const r = await e.get(`engine=wan3&request_id=${REQ_ID}`)
  assert.equal(r.body.status, 'ERROR'); assert.equal(r.body.video_url, null)
})

async function runSuite(source) {
  const failed = []
  for (const c of cases) {
    try { await c.run.call(null) } catch (e) { failed.push(c.name + ': ' + (e?.message ?? e).toString().slice(0, 160)) }
  }
  return failed
}

// A bateria usa ROUTE por fechamento; para os mutantes, troca a fonte e roda de novo.
let CURRENT = ROUTE
const origHarness = harness
// eslint-disable-next-line no-func-assign
harness = (_src, opts) => origHarness(CURRENT, opts)

const MUTANTS = [
  ['guarda aceita qualquer login (sem a lista de administradores)', 'ADMIN_EMAILS.has((user.email ?? \'\').toLowerCase()) ? user : null', 'user'],
  ['sonda antes da guarda do POST e sem a guarda própria', "if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n  if (req.nextUrl.searchParams.get('probe') === '1') return probePost(req)", "if (req.nextUrl.searchParams.get('probe') === '1') return probePost(req)\n  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })", ["const admin = await adminUser()\n  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n  const userId = admin.id", "const userId = 'intruso'"]],
  ['tirar a guarda de administrador do GET da sonda', "if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n  if (req.nextUrl.searchParams.get('engine') === 'probe') return probeGet(req)", "if (req.nextUrl.searchParams.get('engine') === 'probe') return probeGet(req)\n  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"],
  ['tirar a lista de endpoints', 'const endpoint = probeEndpointFrom(body?.endpoint)', 'const endpoint = probeEndpointFrom(body?.endpoint) ?? { usdPerSecond: 0.157, multiPrompt: true }'],
  ['repassar chave desconhecida', "if (Object.keys(input).some((k) => !PROBE_INPUT_KEYS.has(k))) return 'unknown_input_key'", ''],
  ['tirar o teto do dia', 'if (spent + estUnits > toUnits(PROBE_DAILY_CAP_USD)) {', 'if (false) {'],
  ['trocar "passar de" por "chegar a" (> por >=)', 'if (spent + estUnits > toUnits(PROBE_DAILY_CAP_USD)) {', 'if (spent + estUnits >= toUnits(PROBE_DAILY_CAP_USD)) {'],
  ['abrir por padrão quando a soma falha', "if (spent === null) return NextResponse.json({ error: 'spend_unreadable' }, { status: 503 })", ''],
  ['aceitar resolução qualquer', "if (input.resolution !== '720p') return 'bad_resolution'", ''],
  ['duração até 16', 'd < 3 || d > 15', 'd < 3 || d > 16'],
  ['aceitar imagem de qualquer domínio', '!imgs.every((u) => imageAllowed(u, storageBase))', 'false'],
  ['não conferir a soma dos planos', "return sum === d ? null : 'multi_prompt_duration_mismatch'", 'return null'],
  ['multi_prompt em qualquer endpoint', "if (!endpoint.multiPrompt) return 'multi_prompt_not_supported'", ''],
  ['preço do Kling 4 errado', 'KLING4_REF_USD_PER_S_720P_2311 = 0.157', 'KLING4_REF_USD_PER_S_720P_2311 = 0.1'],
  ['somar eventos de qualquer nome', ".eq('name', PROBE_EVENT)", ''],
  ['janela sem limite de tempo', ".gte('created_at', since)", ''],
  ['gravar o evento com outro nome', 'name: PROBE_EVENT, path', "name: 'admin_engine_test', path"],
  ['erro do fornecedor no GET vira 500', "return NextResponse.json({ status: 'failed', error: falDetail(e).slice(0, 300) })", "return NextResponse.json({ error: 'x' }, { status: 500 })"],
  ['sonda engole o modo antigo', "if (req.nextUrl.searchParams.get('probe') === '1') return probePost(req)", 'return probePost(req)'],
]

const realFailures = await runSuite(ROUTE)
for (const c of cases) if (!realFailures.some((f) => f.startsWith(c.name + ':'))) console.log('OK ' + c.name)
for (const f of realFailures) console.error('FALHOU ' + f)
let dead = 0
const alive = []
for (const [name, from, to, extra] of MUTANTS) {
  const edits = [[from, to], ...(extra ? [extra] : [])]
  if (edits.some(([a]) => !ROUTE.includes(a))) { alive.push(name + ' (trecho não encontrado na rota)'); continue }
  CURRENT = edits.reduce((src, [a, b]) => src.split(a).join(b), ROUTE)
  const f = await runSuite(CURRENT)
  if (f.length) { dead++; console.log(`MUTANTE MORTO · ${name} · ${f.length} asserção(ões), ex.: ${f[0].slice(0, 110)}`) } else alive.push(name)
}
CURRENT = ROUTE
for (const a of alive) console.error('MUTANTE VIVO · ' + a)
console.log(`\n${cases.length - realFailures.length}/${cases.length} casos verdes · ${dead}/${MUTANTS.length} mutantes mortos`)
if (realFailures.length || alive.length || dead < 8) process.exit(1)
