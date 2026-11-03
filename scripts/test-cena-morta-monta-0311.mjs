// KINEO-CENA-MORTA-MONTA-0311 — guardião da TRAVA MÚTUA cron × compose (render 0535d5e5, Seedance 60 s, 03/11).
// Caso real: 9 cenas, 8 com URL autorizada no claim, a 9ª (01a19f62-66c2-7fd0-85c4-90e1cb6a61ab) presa IN_QUEUE na fal;
// terminal_failed_jobs ausente; submission_uncertain=false. Aos 120 min o cron contava a 9ª como morta e chamava o compose,
// que devolvia 409 "still being finalized" (05:10→05:30 UTC) até o estorno de 35 cr (cinematic_abandoned_no_delivery).
// Este guardião EXECUTA, offline, o código REAL:
//   (a) lib/cinematic/claim.ts (HMAC/CAS reais) + lib/cinematic/staleSceneDeath.ts: 8 prontas + 1 morta por idade → o
//       portão do compose (cinematicJobsAreTerminal) passa; SEM morte declarada → continua fechado (409); abaixo do piso
//       de 60% → recusa; cena com URL não pode ser declarada morta; id fora do claim → recusa;
//   (b) a coleta REAL do cron (collectFinishedClips fatiada do arquivo) contra uma fal falsa: com 2 h+ a cena IN_QUEUE
//       sai como morta POR IDADE com id/modelo/índice; com 30 min continua 'pending' (nenhuma morte inventada);
//   (c) a fiação: o cron grava a morte no claim ANTES de chamar o compose, e o portão do compose não foi afrouxado.
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import ts from 'typescript'
import assert from 'node:assert/strict'

let checks = 0
const eq = (a, b, label) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), label); checks++ }
const ok = (value, label) => { assert.ok(value, label); checks++ }
const clone = value => JSON.parse(JSON.stringify(value))
function load(file, imports, extras = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, Buffer, URL, Date, Error, ...extras,
    require: name => { if (!(name in imports)) throw Error(`Unexpected import: ${name}`); return imports[name] },
  }, { timeout: 5000 })
  return exports
}
const composeClaim = load('lib/composeClaim.ts', { 'node:crypto': crypto })
const claimLib = load('lib/cinematic/claim.ts', { 'node:crypto': crypto, '@/lib/composeClaim': composeClaim })
const morte = load('lib/cinematic/staleSceneDeath.ts', { './claim': claimLib })

// ── formato REAL do claim 0535d5e5 (ids, modelos e URLs copiados do banco, leitura de 03/11) ──
const secret = 'offline-test-signing-only'
const userId = 'test-owner-0535d5e5'
const generationId = '0535d5e5-85da-45f8-b35e-433eb9eefa93'
const MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const IDS = ['01a19f62-65fa-78c2-a596-717c6d823623', '01a19f62-65f9-7441-822c-84e0de24afcd', '01a19f62-6635-7f42-a23a-20a957e336d3',
  '01a19f62-6660-78b1-9901-d942b3dfa911', '01a19f62-6660-7283-9373-10e334fcd251', '01a19f62-6698-7392-84f5-0748b7fca39a',
  '01a19f62-66c1-74e3-bb41-a82293541b01', '01a19f62-66c1-73f1-bd31-6371989498dc', '01a19f62-66c2-7fd0-85c4-90e1cb6a61ab']
const URLS = ['https://v3b.fal.media/files/b/0ab0ee7c/U_4iNm6eW65piSaETjcTT_video.mp4', 'https://v3b.fal.media/files/b/0ab0ee7c/6Ygglk7EviO-3HP2z5LZ__video.mp4',
  'https://v3b.fal.media/files/b/0ab0ee7b/2uB3ZQdCeZ0wx1ASQLP4n_video.mp4', 'https://v3b.fal.media/files/b/0ab0ee8a/_UbIaqgRUbkg9SANERJWl_video.mp4',
  'https://v3b.fal.media/files/b/0ab0ee7b/JMIzkgABqwEVpwRrxSSQx_video.mp4', 'https://v3b.fal.media/files/b/0ab0ee7e/67UirL0QinmPKXlwvy4OH_video.mp4',
  'https://v3b.fal.media/files/b/0ab0eeb8/JA1O7ePZ1dbmH2_HEcUqx_video.mp4', 'https://v3b.fal.media/files/b/0ab0ee7d/kCtRthtfL-KCOXP6QpxPb_video.mp4', null]
const identity = { secret, userId, generationId }

function signRow(row) {
  const m = row.metadata
  m.response_hash = claimLib.cinematicValueHash(m.response)
  m.authority = claimLib.signCinematicClaim(secret, {
    claimId: row.id, userId, generationId, status: m.status, fingerprint: m.fingerprint,
    creditCost: m.credit_cost, quality: m.quality, engine: m.engine,
    falRequestIds: m.fal_request_ids, falModels: m.fal_models,
    authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash,
    resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference,
  })
  return row
}
function fixture(urls = URLS) {
  return signRow({
    id: claimLib.cinematicClaimId(userId, generationId), name: claimLib.CINEMATIC_CLAIM_EVENT,
    user_id: userId, path: claimLib.CINEMATIC_CLAIM_PATH, session_id: generationId, created_at: '2026-11-03T03:09:18.147Z',
    metadata: {
      generation_id: generationId, status: 'settled', fingerprint: 'a'.repeat(64), credit_cost: 35,
      quality: 'cinematic_ai', engine: 'seedance', fal_request_ids: IDS, fal_models: IDS.map(() => MODEL),
      authorized_completed_urls: urls, resolution_reason: 'upfront_debit',
      resolution_reference: `cinematic-${claimLib.cinematicClaimId(userId, generationId)}`,
      response: { generationId, quality: 'cinematic_ai', fal_request_ids: IDS, fal_models: IDS.map(() => MODEL), submission_uncertain: false, duration: 60 },
    },
  })
}
function database(row) {
  const state = { row: clone(row), writes: 0 }
  state.db = { from(table) {
    assert.equal(table, 'events')
    const filters = []; let update
    const q = {
      select() { return q }, eq(k, v) { filters.push([k, v]); return q }, update(v) { update = v; return q },
      async maybeSingle() {
        const match = state.row && filters.every(([k, v]) => (k.startsWith('metadata->>') ? state.row.metadata[k.slice(11)] : state.row[k]) === v)
        if (!match) return { data: null, error: null }
        if (update) { state.row = { ...state.row, ...clone(update) }; state.writes++ }
        return { data: clone(state.row), error: null }
      },
    }
    return q
  } }
  return state
}
async function verified(state) {
  const r = await claimLib.loadVerifiedCinematicClaim({ ...identity, db: state.db })
  ok(r.ok && r.claim, 'claim real verifica')
  return r.claim
}
const morta9 = { index: 8, requestId: IDS[8], model: MODEL }
const models = IDS.map(() => MODEL)

console.log('== (a) claim real + regra da cena morta ==')
{
  // CASO REAL: antes do conserto o portão fica fechado (o 409 de 05:10→05:30).
  const st = database(fixture())
  eq(claimLib.cinematicJobsAreTerminal(await verified(st)), false, 'caso real sem prova: portão do compose fechado (409)')
  // CONSERTO: a 9ª, morta por idade, vira prova assinada → o portão abre com 8/9.
  const decisao = morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [morta9], authorizedUrls: URLS })
  eq(decisao, { ok: true, failed: [{ requestId: IDS[8], model: MODEL }] }, '8 prontas + 1 morta por idade → falha terminal da 9ª')
  const bound = await claimLib.authorizeCinematicTerminalFailures({ ...identity, db: st.db, failed: decisao.failed })
  ok(bound.ok, 'CAS real grava terminal_failed_jobs')
  eq(claimLib.cinematicJobsAreTerminal(await verified(st)), true, 'caso real: 8 terminais + 1 morta → compose aceita montar')
  eq(st.row.metadata.authorized_completed_urls, URLS, 'as 8 URLs boas ficam intactas')
}
{
  // CONTROLE: cena pendente NÃO declarada morta (cron antes das 2 h) → continua 409.
  const st = database(fixture())
  const d = morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [], authorizedUrls: URLS })
  eq(d, { ok: true, failed: [] }, 'sem morte declarada não há falha a gravar')
  eq(claimLib.cinematicJobsAreTerminal(await verified(st)), false, 'pendente não declarada morta → portão segue fechado')
  eq(st.writes, 0, 'nada foi escrito')
}
{
  // CONTROLE: abaixo do piso de 60% (5/9 < ceil(5.4)=6) → não monta.
  const urls5 = [...URLS.slice(0, 5), null, null, null, null]
  const mortas = [5, 6, 7, 8].map(i => ({ index: i, requestId: IDS[i], model: MODEL }))
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 5, mortas, authorizedUrls: urls5 }), { ok: false, motivo: 'abaixo_do_piso' }, '5/9 abaixo do piso → recusa')
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 6, mortas: mortas.slice(1), authorizedUrls: [...URLS.slice(0, 6), null, null, null] }).ok, true, '6/9 no piso → aceita')
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 0, mortas: [morta9], authorizedUrls: URLS, piso: 0 }), { ok: false, motivo: 'abaixo_do_piso' }, 'piso 0 (reserva do trial) ainda exige 1 cena pronta')
}
{
  // CONTROLE: cena VIVA (com URL) não pode ser declarada morta; id/modelo fora do claim → recusa.
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [{ index: 0, requestId: IDS[0], model: MODEL }], authorizedUrls: URLS }), { ok: false, motivo: 'cena_ja_pronta' }, 'cena pronta não vira morta')
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [{ index: 8, requestId: 'forjado', model: MODEL }], authorizedUrls: URLS }), { ok: false, motivo: 'cena_fora_do_claim' }, 'id forjado → recusa')
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [{ index: 8, requestId: IDS[8], model: 'outro/modelo' }], authorizedUrls: URLS }), { ok: false, motivo: 'cena_fora_do_claim' }, 'modelo trocado → recusa')
  eq(morte.cenasMortasParaOClaim({ requestIds: IDS, models, prontas: 8, mortas: [{ index: 7, requestId: IDS[8], model: MODEL }], authorizedUrls: URLS }), { ok: false, motivo: 'cena_fora_do_claim' }, 'índice trocado → recusa')
  // JSON solto (sem HMAC) continua sem poder forjar a prova — a porta do cliente segue fechada.
  const st = database(fixture())
  const forged = clone(st.row); forged.metadata.response.terminal_failed_jobs = [{ requestId: IDS[8], model: MODEL }]
  eq(claimLib.verifyCinematicClaimRow({ ...identity, row: forged }).ok, false, 'prova sem assinatura do servidor é recusada')
}

console.log('== (b) coleta REAL do cron contra fal falsa ==')
const cronSrc = fs.readFileSync('app/api/cron/finish-stranded-renders/route.ts', 'utf8').replace(/\r\n/g, '\n')
const start = cronSrc.indexOf('async function collectFinishedClips(')
const endMark = "  return { state: 'ready', clips: out, dead }\n}"
const end = cronSrc.indexOf(endMark, start)
ok(start > 0 && end > start, 'coleta fatiada do arquivo real')
const pre = cronSrc.slice(cronSrc.indexOf('const STALE_SCENE_MINUTES'), cronSrc.indexOf('\n', cronSrc.indexOf('const STALE_SCENE_MINUTES')))
const coletaJs = ts.transpileModule(`${pre}\n${cronSrc.slice(start, end + endMark.length)}\nexports.collectFinishedClips = collectFinishedClips`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function coleta() {
  const exports = {}
  const fal = { config() {}, queue: {
    async status(_m, { requestId }) { return requestId === IDS[8] ? { status: 'IN_QUEUE', request_id: requestId } : { status: 'COMPLETED', request_id: requestId } },
    async result() { throw Object.assign(new Error('não devia ler: URL já autorizada'), { status: 500 }) },
  } }
  vm.runInNewContext(coletaJs, { exports, fal, process: { env: { FAL_KEY: 'offline' } }, console: { log() {}, warn() {} } })
  return exports.collectFinishedClips
}
{
  const rastro = { falhas: [], prontas: [], mortasPorIdade: [] }
  const r = await coleta()(IDS, models, 121, rastro, false, URLS)
  eq([r.state, r.clips?.length, r.dead], ['ready', 8, 1], 'com 2 h+: 8 prontas, 1 morta, pronto para montar')
  eq(rastro.mortasPorIdade, [morta9], 'a morta por idade sai com índice/id/modelo do claim')
  eq(rastro.falhas, [], 'morte por idade NÃO entra na fila de retentativa (fora do escopo)')
}
{
  const rastro = { falhas: [], prontas: [], mortasPorIdade: [] }
  const r = await coleta()(IDS, models, 30, rastro, false, URLS)
  eq([r.state, r.done, r.total], ['pending', 8, 9], 'com 30 min: continua pendente')
  eq(rastro.mortasPorIdade, [], 'nenhuma morte inventada antes das 2 h')
}

console.log('== (c) fiação ==')
const bindAt = cronSrc.indexOf('cenasMortasParaOClaim({ requestIds, models, prontas: clips.length')
const failBind = cronSrc.indexOf('authorizeCinematicTerminalFailures({ db: admin, secret, userId, generationId: genId, failed: decisao.failed })')
const reloadAt = cronSrc.indexOf('const reloaded = await loadVerifiedCinematicClaim', bindAt)
const composeAt = cronSrc.indexOf('const res = await composePost(composeReq)')
ok(bindAt > 0 && failBind > bindAt && reloadAt > failBind && composeAt > reloadAt, 'cron grava a morte no claim antes de recarregar e chamar o compose')
ok(/if \(!bound\.ok\) \{ results\.push\(\{ generation: gen8, outcome: 'stale_death_binding_pending'/.test(cronSrc), 'falha ao gravar a prova não chama o compose')
ok(/mortasPorIdade\?\.length \?\? 0\) > 0\)/.test(cronSrc), 'fallback pago (Kling 4 pago) segue sem montar com fala faltando')
eq((cronSrc.match(/staleClaim\) \{ dead\+\+; rastro\?\.mortasPorIdade\?\.push/g) ?? []).length, 4, 'os 4 ramos de morte por idade registram a cena')
ok(!/if \(staleClaim\) dead\+\+/.test(cronSrc) && !/if \(staleClaim\) \{ dead\+\+; continue \}/.test(cronSrc), 'nenhum ramo de morte por idade ficou mudo')
ok(/const STALE_SCENE_MINUTES = 120\n/.test(cronSrc), 'STALE_SCENE_MINUTES intocado')
const composeSrc = fs.readFileSync('app/api/compose/route.ts', 'utf8')
ok(composeSrc.includes('if (cinematicBirthClaim && !cinematicJobsAreTerminal(cinematicBirthClaim)) {'), 'portão do compose intacto (não foi afrouxado)')
ok(!fs.readFileSync('lib/cinematic/staleSceneDeath.ts', 'utf8').match(/from\s*\(|credit|refund/i), 'regra nova não toca banco nem crédito')

console.log(`OK — ${checks} verificações (KINEO-CENA-MORTA-MONTA-0311)`)
