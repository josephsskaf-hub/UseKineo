// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-ADS-LOTE-1310 — o modo lote do Studio Ads é N vezes o anúncio único, nunca um caminho de dinheiro novo
// ═══════════════════════════════════════════════════════════════════════════
// O que este arquivo impede, em uma frase: que o lote cobre, estorne ou fale com a fal por fora do /plan e do /start de
// sempre, que passe de 10 linhas, que a conta free entre pela amostra, que a fila siga depois de uma recusa, ou que a tela
// digite um preço.
//
//  A. Caminho único: a rota e lib/ads/v2Batch.ts só chamam adsV2PlanFor/adsV2StartFor — nada de débito, estorno, saldo,
//     moderação própria, fal ou fetch; a única escrita é brief.batch num pedido ainda 'planned'.
//  B. Teto de 10 linhas (executado: sanitizeBatchBody e o lote retomado).
//  C. Porta: só adsGate 'ok' (assinante/Business/passe/parceiro/casa); 'none' (free, mesmo com a amostra aberta) = 403 com
//     a oferta do Business; a amostra nunca é consultada; a ordem das travas na rota.
//  D. Fila (executada com banco de mentira e o /start de mentira): 1 por vez; ocupado espera; a 1ª recusa PARA a fila e
//     nenhuma linha de trás é tentada; preço diferente do mostrado = 409 sem tocar em nada; plano para no teto diário.
//  E. Preço nunca digitado: o total é adsV2Credits (a mesma função do /start); a oferta lê lib/businessPlan.ts.
//  F. Cron: drena DEPOIS de avançar, nunca lança; membro que saiu da equipe não drena a fila do dono.
//  M. Mutantes — cada um prova que foi aplicado e deixa o guardião vermelho.
//
// Rodar: node scripts/test-ads-lote-1310.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(raiz)
const { createOfflineLoader } = await import(pathToFileURL(path.join(raiz, 'scripts', 'test-support', 'offline-ts-loader.mjs')).href)

const falhas = []
let total = 0
const ok = (nome, cond, detalhe = '') => {
  total += 1
  if (cond) console.log(`  ✓ ${nome}`)
  else { console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); falhas.push(nome) }
}
const ler = (rel) => readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const semComentario = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*') && !l.trim().startsWith('{/*')).join('\n')
const ordem = (src, ...marcos) => {
  let pos = -1
  for (const m of marcos) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}

const F = {
  route: 'app/api/ads/v2/batch/route.ts',
  lib: 'lib/ads/v2Batch.ts',
  rules: 'lib/ads/v2BatchRules.ts',
  ui: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  cron: 'app/api/cron/ads-v2-advance/route.ts',
  events: 'lib/ads/events.ts',
  sink: 'app/api/events/route.ts',
}
const REAL = Object.fromEntries(Object.entries(F).map(([k, rel]) => [k, ler(rel)]))

// ── A. caminho único (estático) ─────────────────────────────────────────────────────────────────────────────────────
const PROIBIDOS = [
  ['chargeAdsV2', /chargeAdsV2\b/], ['refundAdsV2', /refundAdsV2/], ['failAdsV2Order', /failAdsV2Order/], ['chargeVariationGroup', /chargeVariationGroup/],
  ['dispatchAdsV2Shots', /dispatchAdsV2Shots/], ['advanceAdsV2Order', /advanceAdsV2Order/], ['v2Billing', /v2Billing/], ['fal', /@fal-ai|fal\.run|fal\.ai|queue\.fal|submitToFal|falFetch/i],
  ['rpc', /\.rpc\(/], ['saldo (video_credits)', /video_credits/], ['profiles', /from\('profiles'\)/], ['ledger', /ledger|deduct_credits|add_credits|grantCredits|debitCredits/i],
  ['moderação própria', /moderateContent/], ['fetch', /\bfetch\(/], ['insert/upsert/delete', /\.(insert|upsert|delete)\(/], ['amostra', /adsSampleOpen|adsSampleRef|sampleRun/],
]
function caminhoUnico(route, lib) {
  const p = []
  for (const [nome, src] of [['rota', semComentario(route)], ['lib', semComentario(lib)]]) for (const [n, re] of PROIBIDOS) if (re.test(src)) p.push(`${nome}: ${n}`)
  const l = semComentario(lib)
  if (!/import \{ adsV2PlanFor, type AdsV2Caller \} from '@\/lib\/ads\/v2PlanCore'/.test(l) || !/await adsV2PlanFor\(user, access, async \(\) => row\.body, Date\.now\(\)\)/.test(l)) p.push('lib: o roteiro não sai de adsV2PlanFor')
  if (!/import \{ adsV2StartFor \} from '@\/lib\/ads\/v2StartCore'/.test(l) || !/await adsV2StartFor\(user, access, async \(\) => \(\{ order_id: next\.id \}\), Date\.now\(\)\)/.test(l)) p.push('lib: o início não sai de adsV2StartFor')
  // As únicas escritas: brief.batch, só em pedido ainda 'planned'.
  const updates = l.match(/\.update\(([^\n]*)/g) || []
  if (updates.length !== 1 || !/\.update\(\{ brief: \{ \.\.\.\(row\.brief \?\? \{\}\), batch: tag \} \}\)/.test(updates[0] ?? '')) p.push(`lib: escrita fora de brief.batch (${updates.length})`)
  if (!/\.update\(\{ brief: [^\n]*\n\s*\.eq\('id', row\.id\)\n\s*\.eq\('user_id', uid\)\n\s*\.eq\('status', 'planned'\)/.test(l)) p.push('lib: a marca do lote não está presa a pedido do dono e planned')
  // A rota não fala com o banco: só a lib.
  if (/\.from\('/.test(semComentario(route))) p.push('rota: consulta o banco direto')
  return p
}
console.log('\nA. caminho único: N × adsV2PlanFor / adsV2StartFor')
const PA = caminhoUnico(REAL.route, REAL.lib)
ok('rota e lib sem débito, estorno, saldo, moderação própria, fal, fetch, amostra; plano e início só pelos núcleos; única escrita = brief.batch', PA.length === 0, PA.join(' | '))
ok('marca KINEO-ADS-LOTE-1310 em todos os arquivos do lote', Object.values(REAL).every((s) => s.includes('KINEO-ADS-LOTE-1310')))
ok('regras puras sem import nenhum (a tela, o servidor e este guardião leem o mesmo arquivo)', !/^import /m.test(REAL.rules))

// ── carregador com o mundo de mentira ───────────────────────────────────────────────────────────────────────────────
const clone = (x) => JSON.parse(JSON.stringify(x))
function fakeDb(orders) {
  const db = { orders, writes: [], reads: 0 }
  const get = (r, col) => {
    const m = col.match(/^(\w+)->(\w+)->>(\w+)$/)
    if (m) { const v = r[m[1]]?.[m[2]]?.[m[3]]; return v === undefined ? null : v }
    return r[col] === undefined ? null : r[col]
  }
  function from(table) {
    const filters = []
    let patch = null
    let single = false
    let limit = Infinity
    const b = {
      select() { return b },
      eq(c, v) { filters.push((r) => get(r, c) === v); return b },
      in(c, vs) { const list = [...vs]; filters.push((r) => list.includes(get(r, c))); return b },
      not(c, op, v) { filters.push((r) => get(r, c) !== null); return b },
      order() { return b },
      limit(n) { limit = n; return b },
      update(p) { patch = clone(p); return b },
      maybeSingle() { single = true; return b },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej) },
    }
    function run() {
      if (table !== 'ads_v2_orders') return { data: null, error: { code: 'XX', message: `tabela ${table}` } }
      let hit = db.orders.filter((r) => filters.every((f) => f(r)))
      if (patch) { for (const r of hit) Object.assign(r, clone(patch)); db.writes.push({ patch, ids: hit.map((r) => r.id) }) } else db.reads += 1
      hit = hit.slice(0, limit)
      return { data: single ? (hit[0] ? clone(hit[0]) : null) : hit.map(clone), error: null }
    }
    return b
  }
  return { db, admin: { from, auth: { admin: { getUserById: async (id) => ({ data: { user: { id, email: `${id}@exemplo.com` } }, error: null }) } } } }
}
const resp = (status, body) => ({ status, json: async () => body })

function mundo({ source = null, startScript = () => resp(202, { order_id: 'x', status: 'generating' }), planScript = () => resp(200, { credits: 41, narration: 'n', overlays: [] }), accessFor = null } = {}) {
  const calls = { plan: [], start: [], events: [] }
  let dbRef = null
  const load = createOfflineLoader({
    source,
    mocks: {
      '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.events.push(clone(e)); return true } },
      '@/lib/ads/serverAccess': {
        adsGate: (reason) => (reason === 'none' ? 'no_access' : 'ok'),
        loadAdsAccess: async (id, email) => (accessFor ? accessFor(id, email) : { admin: dbRef.admin, reason: 'subscriber', ownerId: id, actorId: id, role: 'owner', ownerPlan: 'business' }),
        adsSampleOpen: async () => true, // se o lote consultasse a amostra, a conta free passaria — o mutante C prova
      },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/ads/v2PlanCore': { adsV2PlanFor: async (user, access, readBody) => { const b = await readBody(); calls.plan.push(b.order_id); return planScript(b.order_id, b) } },
      '@/lib/ads/v2StartCore': {
        adsV2StartFor: async (user, access, readBody) => {
          const b = await readBody()
          calls.start.push(b.order_id)
          const r = startScript(b.order_id)
          if (r.status === 202 && dbRef) { const row = dbRef.db.orders.find((o) => o.id === b.order_id); if (row) row.status = 'generating' }
          return r
        },
      },
    },
  })
  return { calls, load, setDb: (d) => { dbRef = d } }
}

const OWNER = '0a000000-0000-4000-8000-000000000001'
const OTHER = '0b000000-0000-4000-8000-000000000002'
const oid = (n) => `0e000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const planned = (n, tier = 'commercial') => ({ id: oid(n), user_id: OWNER, status: 'planned', tier, seconds: 15, brief: { sentence: `Produto ${n}` }, plan: { narration: 'oi' }, video_id: null, error: null, credits_charged: 0, updated_at: `2026-10-13T0${n}:00:00Z` })
const subscriber = (admin) => ({ admin, reason: 'subscriber', ownerId: OWNER, actorId: OWNER, role: 'owner', ownerPlan: 'business' })
const free = (admin) => ({ admin, reason: 'none', ownerId: OWNER, actorId: OWNER, role: 'owner', ownerPlan: 'free' })
const USER = { id: OWNER, email: 'dono@exemplo.com' }

// Bateria executada (devolve a lista de problemas; o mutante liga uma fonte trocada).
async function bateria(source = null) {
  const p = []
  const rulesW = mundo({ source })
  const R = rulesW.load('lib/ads/v2BatchRules.ts')
  // ── B. teto de 10 ──
  const linhas = (n) => Array.from({ length: n }, (_, i) => ({ order_id: oid(i + 1), sector: 'store', photos: [] }))
  if (R.ADS_V2_BATCH_MAX_ROWS !== 10) p.push(`B teto = ${R.ADS_V2_BATCH_MAX_ROWS}`)
  if (!R.sanitizeBatchBody({ action: 'plan', rows: linhas(10) }).ok) p.push('B 10 roteiros recusados')
  if (R.sanitizeBatchBody({ action: 'plan', rows: linhas(11) }).error !== 'too_many_rows') p.push('B 11 roteiros aceitos')
  if (R.sanitizeBatchBody({ action: 'start', order_ids: linhas(11).map((x) => x.order_id), expected_credits: 451 }).error !== 'too_many_rows') p.push('B 11 inícios aceitos')
  if (R.sanitizeBatchBody({ action: 'start', order_ids: [oid(1), oid(1)], expected_credits: 82 }).error !== 'duplicate_order') p.push('B pedido repetido aceito')
  if (R.sanitizeBatchBody({ action: 'start', order_ids: [oid(1)], expected_credits: 0 }).error !== 'bad_expected_credits') p.push('B início sem o preço mostrado aceito')
  if (R.sanitizeBatchBody({ action: 'debit', batch_id: oid(1) }).error !== 'bad_action') p.push('B ação desconhecida aceita')
  if (R.batchRowsAllowed([41, 41, 41], 100) !== 2 || R.batchRowsAllowed(Array(12).fill(1), null) !== 10) p.push('B batchRowsAllowed fora do saldo/teto')

  // ── C. porta ──
  {
    const w = mundo({ source })
    const d = fakeDb([planned(1)])
    w.setDb(d)
    const L = w.load('lib/ads/v2Batch.ts')
    if (L.adsV2BatchGate(USER, free(d.admin)) !== 'no_access') p.push('C conta free (amostra aberta) entra no lote')
    if (L.adsV2BatchGate(USER, subscriber(d.admin)) !== 'ok') p.push('C assinante barrado')
    const t = await L.adsV2BatchTick(USER, free(d.admin), oid(99), 'cron')
    if (t.state !== 'blocked' || w.calls.start.length) p.push('C fila da conta free andou')
  }

  // ── D. fila ──
  {
    const script = { [oid(1)]: resp(202, {}), [oid(2)]: resp(402, { error: 'out_of_credits', needed: 41, balance: 10 }), [oid(3)]: resp(202, {}) }
    const w = mundo({ source, startScript: (id) => script[id] })
    const d = fakeDb([planned(1), planned(2), planned(3)])
    w.setDb(d)
    const L = w.load('lib/ads/v2Batch.ts')
    const acc = subscriber(d.admin)
    // preço diferente do mostrado: 409 e NADA tocado
    const bad = await L.adsV2BatchStart(USER, acc, { batch_id: null, order_ids: [oid(1), oid(2), oid(3)], expected_credits: 120 })
    if (bad.status !== 409 || bad.body.error !== 'price_changed' || bad.body.credits !== 123 || d.db.writes.length || w.calls.start.length) p.push(`D preço trocado não parou antes de tudo (${bad.status} ${bad.body.error} ${bad.body.credits})`)
    // o total certo: grava a fila (3 linhas) e começa SÓ a 1ª
    const okStart = await L.adsV2BatchStart(USER, acc, { batch_id: null, order_ids: [oid(1), oid(2), oid(3)], expected_credits: 123 })
    const batchId = okStart.body.batch_id
    if (okStart.status !== 202 || okStart.body.tick?.state !== 'started' || w.calls.start.join() !== oid(1)) p.push(`D 1ª linha não começou sozinha (${okStart.status} ${okStart.body.tick?.state} ${w.calls.start})`)
    if (d.db.orders.filter((o) => o.brief?.batch?.id === batchId && o.brief.batch.queued_at).length !== 3) p.push('D fila não gravada nas 3 linhas')
    // ocupado: espera, sem chamar o /start
    const busy = await L.adsV2BatchTick(USER, acc, batchId, 'tick')
    if (busy.state !== 'waiting' || w.calls.start.length !== 1) p.push(`D com anúncio em andamento a fila não esperou (${busy.state}, ${w.calls.start.length})`)
    // 'another_active' do /start = esperar (nunca parar)
    d.db.orders[0].status = 'delivered'
    script[oid(2)] = resp(409, { error: 'another_active' })
    const race = await L.adsV2BatchTick(USER, acc, batchId, 'tick')
    if (race.state !== 'waiting' || d.db.orders.some((o) => o.brief?.batch?.stopped)) p.push(`D 'another_active' parou a fila (${race.state})`)
    // a recusa: PARA na linha 2, a 3 nunca é tentada, nem num tick seguinte
    script[oid(2)] = resp(402, { error: 'out_of_credits', needed: 41, balance: 10 })
    const n0 = w.calls.start.length
    const stop = await L.adsV2BatchTick(USER, acc, batchId, 'tick')
    const after = await L.adsV2BatchTick(USER, acc, batchId, 'cron')
    const tentou = w.calls.start.slice(n0)
    if (stop.state !== 'stopped' || stop.code !== 'out_of_credits' || stop.row !== 1 || stop.needed !== 41) p.push(`D recusa não parou a fila (${stop.state} ${stop.code} ${stop.row})`)
    if (tentou.join() !== oid(2)) p.push(`D depois da recusa a fila tentou mais linhas (${tentou})`)
    if (after.state !== 'stopped') p.push(`D tick seguinte não respeitou a parada (${after.state})`)
    if (!d.db.orders.slice(1).every((o) => o.status === 'planned' && o.brief.batch.stopped?.code === 'out_of_credits')) p.push('D linhas de trás sem o motivo da parada')
    if (!d.db.orders.slice(1).every((o) => o.brief.batch.queued_at === null)) p.push('D lote parado continua na fila (entupiria a varredura do cron)')
    const ev = w.calls.events.filter((e) => e.name === 'ads_batch_row')
    if (!ev.some((e) => e.metadata.outcome === 'started' && e.metadata.order_id === oid(1)) || !ev.some((e) => e.metadata.outcome === 'refused' && e.metadata.code === 'out_of_credits')) p.push('D desfecho de cada linha sem evento')
    if (!w.calls.events.some((e) => e.name === 'ads_batch_started' && e.metadata.rows === 3 && e.metadata.credits_total === 123 && e.metadata.started_now === 1 && e.metadata.queued === 2)) p.push('D ads_batch_started sem as contagens')
    // retomar o mesmo lote com 9 linhas novas = passa de 10 → recusa
    for (let i = 4; i <= 12; i++) d.db.orders.push(planned(i))
    const muitos = await L.adsV2BatchStart(USER, acc, { batch_id: batchId, order_ids: Array.from({ length: 9 }, (_, i) => oid(i + 4)), expected_credits: 369 })
    if (muitos.status !== 400 || muitos.body.error !== 'too_many_rows') p.push(`B lote retomado passou de 10 (${muitos.status} ${muitos.body.error})`)
    // retomar só as 2 que faltam: limpa a parada e começa a próxima
    script[oid(2)] = resp(202, {})
    const res = await L.adsV2BatchStart(USER, acc, { batch_id: batchId, order_ids: [oid(2), oid(3)], expected_credits: 82 })
    if (res.status !== 202 || res.body.tick?.state !== 'started' || res.body.batch_id !== batchId) p.push(`D retomada não seguiu a fila (${res.status} ${res.body.tick?.state})`)
    // pedido de OUTRA conta nunca entra
    d.db.orders.push({ ...planned(40), user_id: OTHER })
    const alheio = await L.adsV2BatchStart(USER, acc, { batch_id: null, order_ids: [oid(40)], expected_credits: 41 })
    if (alheio.status !== 404) p.push(`D pedido de outra conta entrou no lote (${alheio.status})`)
  }
  // ── D. roteiros: N × adsV2PlanFor; a moderação de uma linha não para as outras; o teto diário para ──
  {
    const script = { [oid(1)]: resp(200, { credits: 41, narration: 'a' }), [oid(2)]: resp(422, { error: 'moderation' }), [oid(3)]: resp(200, { credits: 51, narration: 'c' }), [oid(4)]: resp(429, { error: 'daily_limit' }), [oid(5)]: resp(200, { credits: 34 }) }
    const w = mundo({ source, planScript: (id) => script[id] })
    const d = fakeDb([])
    w.setDb(d)
    const L = w.load('lib/ads/v2Batch.ts')
    const r = await L.adsV2BatchPlan(USER, subscriber(d.admin), [1, 2, 3, 4, 5].map((n) => ({ order_id: oid(n), body: { order_id: oid(n) } })))
    const rows = r.body.rows
    if (w.calls.plan.join() !== [1, 2, 3, 4].map(oid).join()) p.push(`D roteiros chamados fora da ordem/depois do teto (${w.calls.plan.length})`)
    if (!(rows[0].ok && !rows[1].ok && rows[1].code === 'moderation' && rows[2].ok && rows[3].code === 'daily_limit' && rows[4].code === 'skipped')) p.push(`D desfecho dos roteiros errado (${rows.map((x) => x.code ?? 'ok')})`)
    if (r.body.credits_total !== 92 || r.body.planned !== 2) p.push(`D total dos roteiros (${r.body.credits_total})`)
    if (!w.calls.events.some((e) => e.name === 'ads_batch_planned' && e.metadata.planned === 2 && e.metadata.stopped_by === 'daily_limit' && e.metadata.outcomes.length === 5)) p.push('D ads_batch_planned sem as contagens')
  }
  // ── F. cron: membro que saiu da equipe não drena a fila do dono ──
  {
    const MEMBER = '0c000000-0000-4000-8000-000000000003'
    const w = mundo({ source, accessFor: (id) => ({ admin: dRef.admin, reason: 'subscriber', ownerId: id, actorId: id, role: 'owner', ownerPlan: 'starter' }) })
    const dRef = fakeDb([{ ...planned(1), brief: { batch: { id: oid(77), row: 0, by: MEMBER, queued_at: '2026-10-13T10:00:00Z', stopped: null } } }])
    w.setDb(dRef)
    const L = w.load('lib/ads/v2Batch.ts')
    const r = await L.drainAdsV2Batches(dRef.admin, { deadlineMs: Date.now() + 200_000 })
    if (r.results[0]?.code !== 'owner_changed' || w.calls.start.length) p.push(`F membro que saiu drenou a fila do dono (${JSON.stringify(r.results)})`)
    const w2 = mundo({ source })
    const d2 = fakeDb([{ ...planned(1), brief: { batch: { id: oid(78), row: 0, by: OWNER, queued_at: '2026-10-13T10:00:00Z', stopped: null } } }])
    w2.setDb(d2)
    const L2 = w2.load('lib/ads/v2Batch.ts')
    const r2 = await L2.drainAdsV2Batches(d2.admin, { deadlineMs: Date.now() + 200_000 })
    if (r2.results[0]?.state !== 'started' || w2.calls.start.join() !== oid(1)) p.push(`F cron não drenou a fila do dono (${JSON.stringify(r2.results)})`)
    const r3 = await L2.drainAdsV2Batches({ from() { throw new Error('banco caiu') } }, { deadlineMs: Date.now() + 200_000 })
    if (r3.batches !== 0) p.push('F cron lançou com o banco caído')
  }
  return p
}

console.log('\nB–D, F. executado (banco de mentira, /plan e /start de mentira)')
const PB = await bateria()
ok('teto de 10, porta só para quem tem o Studio Ads, fila 1 por vez que PARA na 1ª recusa, preço exato, cron seguro', PB.length === 0, PB.join(' | '))

// ── C. rota: a ordem das travas e a oferta do Business ──────────────────────────────────────────────────────────────
function rotaOk(route) {
  const s = semComentario(route)
  const p = []
  if (!ordem(s, 'supabase.auth.getUser()', "loadAdsAccess(user.id, user.email, { workspace: true })", 'sanitizeBatchBody(', "body.action === 'cancel'", 'adsV2BatchGate(user, access)', 'adsV2BatchPlan(', 'adsV2BatchStart(', 'adsV2BatchTick(')) p.push('ordem das travas')
  if (!/if \(gate !== 'ok'\) \{[\s\S]{0,400}?return v2Fail\([^\n]*403, gate === 'no_access' \? \{ business: businessAdsOffer\(\) \} : \{\}\)/.test(s)) p.push('403 sem a oferta do Business')
  if (!/import \{ businessAdsOffer \} from '@\/lib\/businessPlan'/.test(s)) p.push('oferta fora de lib/businessPlan')
  if (!/export const maxDuration = 300/.test(s)) p.push('maxDuration')
  return p
}
const PC = rotaOk(REAL.route)
ok('rota: login → acesso do workspace → corpo → (parar é sempre livre) → porta do lote → núcleos; 403 com a oferta do Business', PC.length === 0, PC.join(' | '))
ok('porta do lote = adsGate + adsV2Visible, sem a amostra', /const gate = adsGate\(access\.reason\)\n\s*if \(gate !== 'ok'\) return gate\n\s*if \(!adsV2Visible\(user\.email\)\) return 'v2_closed'/.test(semComentario(REAL.lib)))

// ── E. preço nunca digitado ─────────────────────────────────────────────────────────────────────────────────────────
function precoOk(ui, lib) {
  const s = semComentario(ui)
  const p = []
  if (/\$\s?\d/.test(s)) p.push('UI com "$" + número')
  if (/\b(84|500|34|41|51)\b/.test(s.replace(/\d+(\.\d+)?px/g, ''))) p.push('UI com número de preço/crédito digitado')
  if (!/business\.price/.test(s) || !/business\.credits/.test(s) || !/business\.ads/.test(s)) p.push('UI não lê a oferta do servidor')
  if (!/adsV2Credits\(r\.tier, ADS_V2_SCREEN_SECONDS\)/.test(s) || !/expected_credits: plannedTotal/.test(s)) p.push('UI: total fora de adsV2Credits / não manda o total mostrado')
  if (!/const total = \(costs as number\[\]\)\.reduce/.test(semComentario(lib)) || !/adsV2Credits\(tier, seconds\)/.test(semComentario(lib))) p.push('lib: total fora de adsV2Credits')
  if (/unlimited/i.test(s)) p.push('UI promete "unlimited"')
  return p
}
console.log('\nE. preço')
const PE = precoOk(REAL.ui, REAL.lib)
ok('tela: total = adsV2Credits, oferta do Business lida do servidor, nada de "$84"/"41 credits"/"unlimited" digitado; servidor confere o total mostrado', PE.length === 0, PE.join(' | '))
ok('a página passa a oferta do Business (lib/businessPlan.ts) para a tela do lote', /mode === 'batch' \? \(\n\s*<AdsV2BatchSession key=\{session\} balance=\{balance\} onBalance=\{refreshBalance\} sample=\{sample\} business=\{business\} \/>/.test(REAL.client) && /business=\{sample \? businessAdsOffer\(\) : null\}/.test(ler('app/(dashboard)/ads/v2/page.tsx')))
ok('aviso de rótulo de IA (KINEO-ATOR-FTC-2026-10-13) na entrega do lote', /adsV2AiLabelNotice\('en'\)/.test(REAL.ui))

// ── F. cron e eventos ───────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nF. cron e eventos')
ok('cron drena a fila DEPOIS de avançar os pedidos, com o prazo dele', ordem(semComentario(REAL.cron), 'advanceAdsV2Order(admin, o.id', 'drainAdsV2Batches(admin, { deadlineMs: started + TOTAL_BUDGET_MS })', 'return NextResponse.json({ ok: true, scanned: results.length, results, batches })'))
const EVS = ['ads_batch_planned', 'ads_batch_started', 'ads_batch_row']
ok('3 eventos do lote na lista do Ads, só-servidor, e no sink', EVS.every((n) => REAL.events.includes(`'${n}',`) && REAL.events.includes(`'${n}', // KINEO-ADS-LOTE-1310`) && REAL.sink.includes(`'${n}',`)))
ok('a tela não grava evento (só o servidor)', !/trackEvent|\/api\/events/.test(REAL.ui))
const uiImports = [...REAL.ui.matchAll(/^import [^\n]*? from '([^']+)'/gm)].map((m) => m[1])
ok("a tela é 'use client' e não importa módulo de servidor (núcleos, cobrança, acesso, banco)", /^'use client'/.test(REAL.ui) && uiImports.length >= 10 && uiImports.every((m) => !/v2Batch'$|v2PlanCore|v2StartCore|v2Billing|v2Advance|serverAccess|serverEvents|supabase|v2Server/.test(m)), uiImports.join(','))

// ── M. mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um aplicado e vermelho)')
const muta = (txt, de, para) => {
  const out = txt.split(de).join(para)
  return { out, aplicado: out !== txt && txt.includes(de) }
}
// M1 débito direto na lib
{
  const m = muta(REAL.lib, "import { adsV2StartFor } from '@/lib/ads/v2StartCore'", "import { adsV2StartFor } from '@/lib/ads/v2StartCore'\nimport { chargeAdsV2 } from '@/lib/ads/v2Billing'")
  ok('M1 lib importando chargeAdsV2 (débito direto) fica vermelho', m.aplicado && caminhoUnico(REAL.route, m.out).length > 0)
}
// M2 a rota lendo o saldo direto
{
  const m = muta(REAL.route, "    if (body.action === 'plan') {", "    const saldo = await access.admin.from('profiles').select('video_credits')\n    void saldo\n    if (body.action === 'plan') {")
  ok('M2 rota lendo o saldo direto fica vermelho', m.aplicado && caminhoUnico(m.out, REAL.lib).length > 0)
}
// M3 teto 11
{
  const de = 'export const ADS_V2_BATCH_MAX_ROWS = 10'
  const aplicado = REAL.rules.includes(de)
  const p = await bateria((rel, txt) => (rel === F.rules ? txt.split(de).join('export const ADS_V2_BATCH_MAX_ROWS = 11') : txt))
  ok('M3 teto de 11 linhas fica vermelho', aplicado && p.some((x) => x.startsWith('B ')), p.slice(0, 2).join(' | '))
}
// M4 porta aberta para a conta free (a amostra entra no lote)
{
  const de = "  if (gate !== 'ok') return gate\n"
  const aplicado = REAL.lib.includes(de)
  const p = await bateria((rel, txt) => (rel === F.lib ? txt.split(de).join("  if (gate === 'closed') return gate\n") : txt))
  ok('M4 lote aberto para a conta free fica vermelho', aplicado && p.some((x) => x.startsWith('C ')), p.slice(0, 2).join(' | '))
}
// M5 recusa tratada como "ocupado" (a fila não para)
{
  const de = "export const ADS_V2_BATCH_BUSY_CODES: readonly string[] = ['another_active', 'not_startable']"
  const aplicado = REAL.rules.includes(de)
  const p = await bateria((rel, txt) => (rel === F.rules ? txt.split(de).join("export const ADS_V2_BATCH_BUSY_CODES: readonly string[] = ['another_active', 'not_startable', 'out_of_credits']") : txt))
  ok('M5 recusa de saldo que não para a fila fica vermelho', aplicado && p.some((x) => x.startsWith('D recusa')), p.slice(0, 2).join(' | '))
}
// M6 fila sem parada gravada (a recusa não marca as linhas de trás)
{
  const de = '    await stopQueue(admin, uid, rows, code, next.tag.row)\n'
  const aplicado = REAL.lib.includes(de)
  const p = await bateria((rel, txt) => (rel === F.lib ? txt.split(de).join('') : txt))
  ok('M6 recusa sem parar a fila fica vermelho', aplicado && p.some((x) => x.startsWith('D ')), p.slice(0, 2).join(' | '))
}
// M7 preço do grupo não conferido
{
  const de = "  if (input.expected_credits !== total) return { status: 409, body: { error: 'price_changed', credits: total } }\n"
  const aplicado = REAL.lib.includes(de)
  const p = await bateria((rel, txt) => (rel === F.lib ? txt.split(de).join('') : txt))
  ok('M7 total mostrado não conferido fica vermelho', aplicado && p.some((x) => x.startsWith('D preço')), p.slice(0, 2).join(' | '))
}
// M8 preço digitado na tela
{
  const m = muta(REAL.ui, 'Business is {business.price}/month', 'Business is $84/month')
  ok('M8 "$84" digitado na tela fica vermelho', m.aplicado && precoOk(m.out, REAL.lib).length > 0)
}
// M9 rota sem a porta do lote (só o núcleo decidiria — e o núcleo abre a amostra)
{
  const m = muta(REAL.route, '    const gate = adsV2BatchGate(user, access)\n', "    const gate = 'ok' as string\n")
  ok('M9 rota sem a porta do lote fica vermelho', m.aplicado && rotaOk(m.out).length > 0)
}
// M10 teto diário que não para o lote
{
  const de = "export const ADS_V2_BATCH_PLAN_STOP_CODES: readonly string[] = ['daily_limit', "
  const aplicado = REAL.rules.includes(de)
  const p = await bateria((rel, txt) => (rel === F.rules ? txt.split(de).join("export const ADS_V2_BATCH_PLAN_STOP_CODES: readonly string[] = [") : txt))
  ok('M10 teto diário que não para os roteiros fica vermelho', aplicado && p.some((x) => x.startsWith('D roteiros') || x.startsWith('D desfecho')), p.slice(0, 2).join(' | '))
}
// M11 cron drenando com membro que saiu
{
  const de = "      if ((access.ownerId ?? tag.by) !== r.user_id) {"
  const aplicado = REAL.lib.includes(de)
  const p = await bateria((rel, txt) => (rel === F.lib ? txt.split(de).join('      if (false) {') : txt))
  ok('M11 cron sem conferir o dono fica vermelho', aplicado && p.some((x) => x.startsWith('F membro')), p.slice(0, 2).join(' | '))
}

console.log(`\n${total - falhas.length}/${total} verdes`)
if (falhas.length) {
  console.log('VERMELHO:')
  for (const f of falhas) console.log(`  - ${f}`)
  process.exit(1)
}
