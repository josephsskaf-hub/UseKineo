// KINEO-ESTORNO-INDEVIDO-2026-09-29 — guardião: a varredura de estorno não devolve crédito de produto ENTREGUE.
// Roda com `node scripts/test-estorno-indevido-2026-09-29.mjs`, sem rede e sem banco.
//
// O defeito (medido no banco em 29/09): sweepStuckRenderDebits julgava "entregou" só por linha em `videos` com o
// mesmo render_id. image-/imgedit-/audio-/upscale-/enhance-/enhance4k-/voice-clone-/scene-gen- nunca gravam essa
// linha — então TODO sucesso deles era estornado 2-3 h depois (32 imagens, 22 áudios, 11 enhances, 7 clones, 2
// upscales entregues e devolvidos).
//
// Duas camadas:
//   1. EXECUTADA — lib/credits/sweepScope.ts (lib pura) e lib/credits/refund.ts são transpilados com o typescript do
//      repo e rodados contra um BANCO FALSO (filtros eq/in/is/like/not/lt/gt/gte/lte de verdade). A prova é de
//      comportamento: quais render_id o RPC de estorno recebe.
//   2. LEITURA — o cron chama as redes novas; /api/enhance estorna pela MESMA chave que debitou.
//
// Mutantes (rodados sobre o commit, cada um tem que deixar o guardião VERMELHO):
//   M-a  tirar 'image-%' de GENERIC_SWEEP_EXCLUDED_PATTERNS            → G1, G4, G5
//   M-b  apagar o laço .not() de refund.ts (o filtro JS ainda segura)  → G3, G4
//   M-c  rede de mídia sem prova (hasDeliveryInWindow → false)         → M1, M3
//   M-d  enhance voltando a estornar pela chave HD fixa                → E2
//   M-e  cron sem sweepAbandonedEnhanceDebits()                        → C1
import { readFileSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}

// ── carregador: transpila TS → CJS; '@/lib/credits/sweepScope' é o arquivo REAL, o resto é stub ──────────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const transform = opts.transform ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = transform[rel] ? transform[rel](rd(rel)) : rd(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:')) return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && real.has(target)) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}

// ── banco falso ──────────────────────────────────────────────────────────────────────────────────────────────────────
const likeRe = (p) => new RegExp('^' + p.split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$')
function fakeDb(tables, refunds) {
  const from = (name) => {
    tables[name] ??= []
    const ctx = { name, op: 'select', filters: [], rows: null }
    const api = {
      select() { return api },
      eq(k, v) { ctx.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      like(k, p) { const re = likeRe(p); ctx.filters.push((r) => typeof r[k] === 'string' && re.test(r[k])); return api },
      not(k, _op, p) { const re = likeRe(p); ctx.filters.push((r) => !(typeof r[k] === 'string' && re.test(r[k]))); return api },
      lt(k, v) { ctx.filters.push((r) => r[k] < v); return api },
      gt(k, v) { ctx.filters.push((r) => r[k] > v); return api },
      lte(k, v) { ctx.filters.push((r) => r[k] <= v); return api },
      gte(k, v) { ctx.filters.push((r) => r[k] >= v); return api },
      order() { return api },
      limit() { return api },
      insert(r) { ctx.op = 'insert'; ctx.rows = Array.isArray(r) ? r : [r]; return api },
      then(a, b) { return Promise.resolve(run(ctx)).then(a, b) },
    }
    return api
  }
  function run(ctx) {
    const t = tables[ctx.name]
    if (ctx.op === 'insert') { for (const r of ctx.rows) t.push({ ...r }); return { data: null, error: null } }
    return { data: t.filter((r) => ctx.filters.every((f) => f(r))).map((r) => ({ ...r })), error: null }
  }
  const rpc = (fn, args) => {
    if (fn !== 'refund_render_credits') return Promise.resolve({ data: null, error: null })
    refunds.push(args.p_render)
    const d = tables.credit_debits.find((x) => x.render_id === args.p_render && !x.refunded_at)
    if (!d) return Promise.resolve({ data: 0, error: null })
    d.refunded_at = new Date().toISOString()
    return Promise.resolve({ data: d.amount, error: null })
  }
  return { from, rpc }
}

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://teste.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'teste'
let tables = null
const refunds = []
const stubs = {
  '@supabase/supabase-js': { createClient: () => fakeDb(tables, refunds) },
  '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_submission_claim' },
  '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim', releaseCinematicClaim: async () => null },
  '@/lib/reverseTrial': { recordReverseTrialRefundForRender: async () => null },
  '@/lib/avatar/reservation': { refundAvatarBirthDebitForFailedRequest: async () => ({ ok: true, credits: 0 }) },
}
const R = makeLoader(stubs, { real: ['lib/credits/sweepScope.ts'] })('lib/credits/refund.ts')
const S = makeLoader({}, {})('lib/credits/sweepScope.ts')

const USER = '11111111-2222-4333-8444-555555555555'
const OUTRO = '99999999-2222-4333-8444-555555555555'
const at = (msAgo) => new Date(Date.now() - msAgo).toISOString()
const H = 3600_000
const MIN = 60_000
const deb = (id, extra = {}) => ({ render_id: id, user_id: USER, amount: 3, refunded_at: null, kind: 'video', created_at: at(3 * H), ...extra })

// ═══ 1. VARREDURA GENÉRICA — só julga quem entrega em `videos` ══════════════════════════════════════════════════════
const PRODUTOS_FORA = ['image-a', 'imgedit-a', 'audio-a', 'upscale-a', 'voice-clone-u-1', 'scene-gen-u-1', 'enhance-v1', 'enhance4k-v2', 'clips-a', 'adsv2-a', 'animate-a', 'cinematic-a', 'avatar-a', 'gesture-a', 'legacy-a']
await check('G1 varredura genérica NÃO estorna nenhum produto que mora fora de `videos` (imagem, áudio, upscale, edit, clone, cena, enhance HD/4K + as exclusões antigas)', async () => {
  tables = { credit_debits: PRODUTOS_FORA.map((id) => deb(id)), videos: [] }
  refunds.length = 0
  await R.sweepStuckRenderDebits()
  return refunds.length === 0
})
await check('G2 varredura genérica CONTINUA estornando render do pipeline sem linha em videos (creatomate-id e clip- do Studio), e poupa o que tem linha', async () => {
  tables = { credit_debits: [deb('3f1c0000-aaaa-bbbb-cccc-000000000001'), deb('clip-19337289-336d'), deb('3f1c0000-aaaa-bbbb-cccc-000000000002')], videos: [{ render_id: '3f1c0000-aaaa-bbbb-cccc-000000000002' }] }
  refunds.length = 0
  await R.sweepStuckRenderDebits()
  return refunds.slice().sort().join(',') === '3f1c0000-aaaa-bbbb-cccc-000000000001,clip-19337289-336d'
})
await check('G3 as DUAS camadas leem a mesma lista: laço .not() sobre GENERIC_SWEEP_EXCLUDED_PATTERNS e filtro JS isGenericSweepCandidate, dentro de sweepStuckRenderDebits', () => {
  const s = rd('lib/credits/refund.ts')
  const i = s.indexOf('export async function sweepStuckRenderDebits'); const j = s.indexOf('\nexport', i + 10)
  const body = s.slice(i, j)
  return i > 0 && /for \(const pattern of GENERIC_SWEEP_EXCLUDED_PATTERNS\) query = query\.not\('render_id', 'like', pattern\)/.test(body) &&
    /\.filter\(\(d\) => isGenericSweepCandidate\(d\.render_id as string\)\)/.test(body)
})
await check('G4 o laço SQL sozinho já basta: com o filtro JS neutralizado, G1 continua sem estorno', async () => {
  const semFiltroJs = makeLoader(stubs, { real: ['lib/credits/sweepScope.ts'], transform: { 'lib/credits/refund.ts': (src) => src.replace('.filter((d) => isGenericSweepCandidate(d.render_id as string))', '.filter(() => true)') } })('lib/credits/refund.ts')
  tables = { credit_debits: PRODUTOS_FORA.map((id) => deb(id)), videos: [] }
  refunds.length = 0
  await semFiltroJs.sweepStuckRenderDebits()
  return refunds.length === 0
})
await check('G5 lista pura: todo prefixo do achado de 29/09 está fora; clip- (Studio) e id cru do Creatomate continuam dentro', () =>
  ['image-x', 'imgedit-x', 'audio-x', 'upscale-x', 'enhance-x', 'enhance4k-x', 'voice-clone-x', 'scene-gen-x', 'clips-x', 'adsv2redo-x'].every((id) => !S.isGenericSweepCandidate(id)) &&
  ['clip-x', '3f1c0000-aaaa-bbbb-cccc-000000000001'].every((id) => S.isGenericSweepCandidate(id)) && !S.isGenericSweepCandidate(''))

// ═══ 2. REDE DE MÍDIA SÍNCRONA — prova = linha em images/audios do mesmo dono até 3 min depois ═════════════════════
await check('M1 imagem/edit/áudio ENTREGUES (linha ≤3 min) não são estornados; os sem linha (requisição morreu) são; o de outra pessoa não prova nada', async () => {
  const t0 = 3 * H
  tables = {
    credit_debits: [
      deb('image-ok', { created_at: at(t0) }),
      deb('imgedit-ok', { created_at: at(t0 + 10 * MIN) }),
      deb('audio-ok', { created_at: at(t0 + 20 * MIN) }),
      deb('image-morreu', { created_at: at(t0 + 40 * MIN) }),
      deb('audio-morreu', { created_at: at(t0 + 50 * MIN) }),
      deb('image-alheia', { created_at: at(t0 + 60 * MIN) }),
    ],
    images: [
      { user_id: USER, created_at: at(t0 - 40_000) },
      { user_id: USER, created_at: at(t0 + 10 * MIN - 50_000) },
      { user_id: OUTRO, created_at: at(t0 + 60 * MIN - 30_000) },
    ],
    audios: [{ user_id: USER, created_at: at(t0 + 20 * MIN - 20_000) }],
    events: [],
  }
  refunds.length = 0
  const r = await R.sweepAbandonedMediaDebits()
  const got = refunds.slice().sort().join(',')
  return got === 'audio-morreu,image-alheia,image-morreu' && r.delivered === 3 && r.refunded === 3 &&
    tables.events.filter((e) => e.name === 'credits_refunded' && e.metadata?.reason === 'abandoned_sync_media').length === 3
})
await check('M2 janela da rede: débito com menos de 2 h ou mais de 24 h não é julgado', async () => {
  tables = { credit_debits: [deb('image-novo', { created_at: at(30 * MIN) }), deb('image-velho', { created_at: at(30 * H) })], images: [], audios: [], events: [] }
  refunds.length = 0
  await R.sweepAbandonedMediaDebits()
  return refunds.length === 0
})
await check('M3 hasDeliveryInWindow: linha 4 min depois NÃO prova; 2 min depois prova; linha de outro dono não prova', () => {
  const d = { user_id: USER, created_at: '2026-09-29T10:00:00.000Z' }
  return !S.hasDeliveryInWindow(d, [{ user_id: USER, created_at: '2026-09-29T10:04:00.000Z' }]) &&
    S.hasDeliveryInWindow(d, [{ user_id: USER, created_at: '2026-09-29T10:02:00.000Z' }]) &&
    !S.hasDeliveryInWindow(d, [{ user_id: OUTRO, created_at: '2026-09-29T10:00:30.000Z' }])
})

// ═══ 3. REDE DO ENHANCE — prova = videos.enhanced_url do vídeo da chave ═════════════════════════════════════════════
await check('E1 enhance HD/4K ENTREGUE (enhanced_url) não é estornado; sem entrega é; vídeo sumido ou de outro dono = sem prova, não estorna', async () => {
  tables = {
    credit_debits: [deb('enhance-v1', { amount: 10 }), deb('enhance4k-v2', { amount: 40 }), deb('enhance4k-v3', { amount: 40 }), deb('enhance-v4', { amount: 10 }), deb('enhance-v5', { amount: 10 })],
    videos: [
      { id: 'v1', user_id: USER, enhanced_url: 'https://x/e1.mp4' },
      { id: 'v2', user_id: USER, enhanced_url: 'https://x/e2.mp4' },
      { id: 'v3', user_id: USER, enhanced_url: null },
      { id: 'v5', user_id: OUTRO, enhanced_url: null },
    ],
    events: [],
  }
  refunds.length = 0
  const r = await R.sweepAbandonedEnhanceDebits()
  return refunds.join(',') === 'enhance4k-v3' && r.delivered === 2 && r.noVideoRow === 2 && r.creditsReturned === 40
})
await check('E2 /api/enhance debita e estorna pela MESMA chave (4K era estornado como enhance-<id> e nunca devolvia)', () => {
  const s = rd('app/api/enhance/route.ts')
  return /renderId: enhanceBillingKey\(videoId, is4k\)/.test(s) &&
    /await refundRenderCredits\(enhanceBillingKey\(videoId, is4k\)\)/.test(s) &&
    /for \(const key of enhanceBillingKeys\(videoId\)\) await refundRenderCredits\(key\)/.test(s) &&
    !/refundRenderCredits\(`enhance-\$\{videoId\}`\)/.test(s) &&
    S.enhanceBillingKeys('v9').join(',') === 'enhance-v9,enhance4k-v9' && S.enhanceBillingKey('v9', true) === 'enhance4k-v9'
})

// ═══ 4. LIGAÇÃO — o cron roda as redes novas ════════════════════════════════════════════════════════════════════════
await check('C1 cron refund-sweep chama sweepAbandonedMediaDebits() e sweepAbandonedEnhanceDebits() e devolve os dois no JSON', () => {
  const s = rd('app/api/cron/refund-sweep/route.ts')
  return /await sweepAbandonedMediaDebits\(\)/.test(s) && /await sweepAbandonedEnhanceDebits\(\)/.test(s) && /clips, media, enhance, errors \}\)/.test(s)
})

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
