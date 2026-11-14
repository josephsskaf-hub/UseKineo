// KINEO-VARREDURAS-ESTORNO-1411 — guardião das varreduras de estorno que liam "as N mais antigas" numa leitura só [CEO 14/11 12:30, item 3].
// EXECUTA (offline, sem rede, sem chave) o código REAL num banco de mentira no jeito do PostgREST (filtros, NOT IN, a chave da página no .or, ordem
// por duas colunas, limit, update condicional, rpc idempotente do estorno):
//  A. Anúncio v2 (lib/credits/refund.ts sweepAbandonedAdsV2Debits): débito ENTREGUE fica com refunded_at nulo para sempre; com 250 entregues mais
//     novos na frente, o pedido abandonado NOVO e o MAIS ANTIGO (dentro da janela de 14 dias) são estornados na 1ª rodada; entregue nunca é estornado;
//     nada estornado duas vezes; empate de created_at na borda da página não pula linha; parado > 2 h vira failed e estorna; teto de 10 páginas.
//  B. Troca e fila do Recreate (lib/clips/clipServer.ts estornarOrfaosDaTrocaEDaFila): 60 linhas sem resposta na frente não escondem a órfã nova;
//     250 linhas MORTAS (estorno já registrado no livro-razão, linha com 0) gravam o valor real e saem da busca, a órfã antiga volta em até 3 horas;
//     livro-razão sem estorno = nada gravado; empate na borda; só os motivos da trava e da fila.
// Mutantes no fim. Rodar: node scripts/test-varreduras-estorno-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const REFUND = 'lib/credits/refund.ts', SRV = 'lib/clips/clipServer.ts'
const NOW = Date.now()
const iso = (msAtras) => new Date(NOW - msAtras).toISOString()
const H = 3600_000, D = 24 * H
const U = '11111111-2222-4333-8444-555555555555'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste'

// ── banco de mentira (PostgREST) ──
const OR_CHAVE = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."([^"]+)",(id|render_id)\.lt\."([^"]+)"\)$/
function criarBanco(tabelas) {
  const st = { lidas: { credit_debits: 0, clips: 0 }, rpcs: [] }
  const from = (nome) => {
    const t = (tabelas[nome] ??= [])
    const f = [], ords = []; let op = 'select', valores = null, lim = Infinity, um = false, ret = false
    const api = {
      select() { if (op !== 'select') ret = true; return api }, insert(v) { op = 'insert'; valores = v; return api }, update(v) { op = 'update'; valores = v; return api },
      limit(n) { lim = n; return api }, maybeSingle() { um = true; return api },
      order(c, o) { ords.push([c, o?.ascending === false ? -1 : 1]); return api },
      eq(c, v) { f.push((r) => r[c] === v); return api }, is(c, v) { f.push((r) => (r[c] ?? null) === v); return api },
      lt(c, v) { f.push((r) => r[c] < v); return api }, gte(c, v) { f.push((r) => r[c] >= v); return api },
      in(c, vs) { f.push((r) => vs.includes(r[c])); return api },
      not(c, o, v) { if (o !== 'in') throw new Error('not.' + o); const vs = String(v).replace(/^\(|\)$/g, '').split(','); f.push((r) => r[c] != null && !vs.includes(r[c])); return api },
      like(c, p) { const re = new RegExp('^' + p.split('%').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); f.push((r) => re.test(String(r[c] ?? ''))); return api },
      or(e) { const m = OR_CHAVE.exec(e); if (!m || m[1] !== m[2]) throw new Error('filtro de chave ilegível: ' + e); f.push((r) => r.created_at < m[1] || (r.created_at === m[1] && r[m[3]] < m[4])); return api },
      then(ok, ko) {
        return Promise.resolve().then(() => {
          if (op === 'insert') { t.push(...(Array.isArray(valores) ? valores : [valores]).map((r) => ({ ...r }))); return { data: null, error: null } }
          const todos = t.filter((r) => f.every((x) => x(r)))
          if (ords.length) todos.sort((a, b) => { for (const [c, s] of ords) { if (a[c] < b[c]) return -s; if (a[c] > b[c]) return s } return 0 })
          const hit = todos.slice(0, lim)
          if (op === 'update') { for (const r of hit) Object.assign(r, valores); const d = hit.map((r) => ({ ...r })); return { data: um ? d[0] ?? null : ret ? d : null, error: null } }
          if (nome in st.lidas) st.lidas[nome] += hit.length
          return { data: um ? (hit[0] ? { ...hit[0] } : null) : hit.map((r) => ({ ...r })), error: null }
        }).then(ok, ko)
      },
    }
    return api
  }
  // o RPC do estorno: devolve o valor UMA vez (refunded_at), 0 depois ou sem débito
  const rpc = async (nome, args) => {
    if (nome !== 'refund_render_credits') return { data: null, error: { message: 'rpc fora do guardião: ' + nome } }
    st.rpcs.push(args.p_render)
    const d = (tabelas.credit_debits ?? []).find((x) => x.render_id === args.p_render)
    if (!d || d.refunded_at) return { data: 0, error: null }
    d.refunded_at = new Date().toISOString()
    return { data: d.amount, error: null }
  }
  return { st, tabelas, db: { from, rpc } }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  let banco = null
  const stubs = {
    '@supabase/supabase-js': { createClient: () => banco.db },
    '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_submission_claim' },
    '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim', releaseCinematicClaim: async () => null },
    '@/lib/reverseTrial': { recordReverseTrialRefundForRender: async () => null },
    '@/lib/avatar/reservation': { loadVerifiedAvatarClaimForBillingReference: async () => null, refundAvatarBirthDebitForFailedRequest: async () => ({ ok: true, credits: 0 }) },
    '@fal-ai/client': { fal: { config: () => {}, queue: {} } }, '@/lib/supabase/server': { createClient: () => null }, 'server-only': {},
  }
  const m = loader(stubs, over)
  const R = m('lib/credits/refund')
  const consoleErro = console.error, consoleLog = console.log, consoleWarn = console.warn
  console.error = () => {}; console.log = () => {}; console.warn = () => {}
  try {
    // ── A. Anúncio v2 ──
    const deb = (ref, ms, o = {}) => ({ render_id: ref, user_id: U, amount: 34, refunded_at: null, kind: 'video', created_at: iso(ms), ...o })
    const ped = (id, ref, status, o = {}) => ({ id, user_id: U, status, billing_ref: ref, started_at: iso(5 * H), video_id: null, ...o })
    const entregues = (n, desdeMs = 3 * H) => Array.from({ length: n }, (_, i) => deb(`adsv2-entregue-${String(i).padStart(4, '0')}`, desdeMs + i * 60_000))
    const pedidosEntregues = (lista) => lista.map((d, i) => ped('e' + i, d.render_id, 'delivered', { video_id: 'v' + i }))
    await check('A1 250 débitos ENTREGUES mais novos na frente: o abandonado NOVO e o MAIS ANTIGO (13 dias) estornam na 1ª rodada; entregue nunca; nada duas vezes', async () => {
      const e = entregues(250)
      banco = criarBanco({
        credit_debits: [...e, deb('adsv2-novo-falhou', 2.5 * H), deb('adsv2-antigo-cancelado', 13 * D)],
        ads_v2_orders: [...pedidosEntregues(e), ped('n', 'adsv2-novo-falhou', 'failed'), ped('a', 'adsv2-antigo-cancelado', 'cancelled')],
        videos: [], events: [],
      })
      const r = await R.sweepAbandonedAdsV2Debits()
      const devolvidos = banco.tabelas.credit_debits.filter((d) => d.refunded_at).map((d) => d.render_id).sort()
      if (devolvidos.join() !== 'adsv2-antigo-cancelado,adsv2-novo-falhou' || r.refunded !== 2 || r.creditsReturned !== 68) throw new Error(JSON.stringify([devolvidos, r]))
      const r2 = await R.sweepAbandonedAdsV2Debits()
      if (r2.refunded !== 0 || banco.st.rpcs.filter((x) => x.startsWith('adsv2-entregue')).length) throw new Error('2ª rodada ou entregue no RPC: ' + JSON.stringify(r2))
    })
    await check('A2 empate de created_at na borda da página (400 linhas com a MESMA hora, abandonado no meio): estorna, nenhuma linha pulada nem relida', async () => {
      const hora = iso(5 * H)
      const e = Array.from({ length: 400 }, (_, i) => deb(`adsv2-empate-${String(i).padStart(4, '0')}`, 0, { created_at: hora }))
      banco = criarBanco({ credit_debits: [...e, deb('adsv2-empate-0199x', 0, { created_at: hora })], ads_v2_orders: [...pedidosEntregues(e), ped('x', 'adsv2-empate-0199x', 'failed')], videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.refunded !== 1 || r.scanned !== 401 || banco.st.lidas.credit_debits !== 401) throw new Error(JSON.stringify([r, banco.st.lidas]))
    })
    await check('A3 as regras de antes seguem: parado > 2 h vira failed e estorna; em andamento < 2 h não; sem pedido = ambíguo; pedido de outra conta = ambíguo', async () => {
      banco = criarBanco({
        credit_debits: [deb('adsv2-parado', 4 * H), deb('adsv2-andando', 3 * H), deb('adsv2-sem-pedido', 3 * H), deb('adsv2-alheio', 3 * H)],
        ads_v2_orders: [ped('p', 'adsv2-parado', 'generating', { started_at: iso(3 * H) }), ped('q', 'adsv2-andando', 'assembling', { started_at: iso(30 * 60_000) }), ped('z', 'adsv2-alheio', 'failed', { user_id: '99999999-2222-4333-8444-555555555555' })],
        videos: [], events: [],
      })
      const r = await R.sweepAbandonedAdsV2Debits()
      const devolvidos = banco.tabelas.credit_debits.filter((d) => d.refunded_at).map((d) => d.render_id)
      if (devolvidos.join() !== 'adsv2-parado' || r.stalledFailed !== 1 || r.ambiguous !== 2 || banco.tabelas.ads_v2_orders.find((o) => o.id === 'p').status !== 'failed') throw new Error(JSON.stringify([devolvidos, r]))
    })
    await check('A4 teto de 10 páginas por rodada: 2500 entregues = no máximo 2000 linhas lidas', async () => {
      const e = entregues(2500)
      banco = criarBanco({ credit_debits: e, ads_v2_orders: pedidosEntregues(e), videos: [], events: [] })
      await R.sweepAbandonedAdsV2Debits()
      if (banco.st.lidas.credit_debits !== 2000) throw new Error('lidas: ' + banco.st.lidas.credit_debits)
    })
    await check('A5 a busca: das mais novas, pela chave (created_at e render_id), janela de 14 dias; o cron chama a varredura', async () => {
      const s = (over[REFUND] ?? lf(REFUND))
      for (const x of [".order('created_at', { ascending: false })\n    .order('render_id', { ascending: false })\n    .limit(ADS_V2_SWEEP_PAGE)", "q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",render_id.lt.\"${cursor.ref}\")`)", ".gte('created_at', desde)"]) if (!s.includes(x)) throw new Error('falta: ' + x.slice(0, 60))
      if (!lf('app/api/cron/refund-sweep/route.ts').includes('await sweepAbandonedAdsV2Debits()')) throw new Error('o cron não chama')
    })

    // ── B. troca e fila do Recreate ──
    banco = criarBanco({})
    const srv = m('lib/clips/clipServer')
    const since = iso(7 * D)
    const L = (id, ms, o = {}) => ({ id, user_id: U, idempotency_key: 'k-' + id, fingerprint: 'f', billing_reference: 'clips-' + id, engine: 'kling', mode: 'image', model: 'fal-ai/kling-video/o3/standard/video-to-video/edit', seconds: 8, aspect: '9:16', prompt: 'p', image_url: null, credits: 45, fal_usd: 1, status: 'failed', fal_request_id: null, video_url: null, failure_reason: 'swap_unchanged', credits_refunded: 0, created_at: iso(ms), ...o })
    const roda = (tabelas, refund, livro) => { banco = criarBanco(tabelas); return srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, refund, livro) }
    await check('B1 60 linhas sem resposta na frente (RPC 0, livro sem estorno): a órfã NOVA e as dos motivos da fila voltam; outros motivos nunca', async () => {
      const mortas = Array.from({ length: 60 }, (_, i) => L('m' + String(i).padStart(3, '0'), 10 * 60_000 + i * 60_000))
      const linhas = [...mortas, L('orfa-nova', 5 * 60_000), L('fila-stuck', 3 * H, { failure_reason: 'queue_stuck' }), L('troca-parcial', 4 * H, { failure_reason: 'swap_partial' }), L('outro', 2 * H, { failure_reason: 'provider_failed' }), L('ja-devolvida', H, { credits_refunded: 45 })]
      const pagas = []
      const r = await roda({ clips: linhas }, async (ref) => (['clips-orfa-nova', 'clips-fila-stuck', 'clips-troca-parcial', 'clips-outro', 'clips-ja-devolvida'].includes(ref) ? (pagas.push(ref), 45) : 0), async () => ({ amount: 45, refunded: false }))
      const t = banco.tabelas.clips, v = (id) => t.find((x) => x.id === id).credits_refunded
      if (pagas.sort().join() !== 'clips-fila-stuck,clips-orfa-nova,clips-troca-parcial' || v('orfa-nova') !== 45 || v('outro') !== 0 || r.refunded !== 3 || mortas.some((x) => v(x.id) !== 0)) throw new Error(JSON.stringify([pagas, r]))
    })
    await check('B2 250 linhas MORTAS mais novas (estorno já registrado no livro-razão, linha com 0): gravam o valor REAL e saem da busca; a órfã antiga volta em até 3 horas', async () => {
      const mortas = Array.from({ length: 250 }, (_, i) => L('morta' + String(i).padStart(3, '0'), 10 * 60_000 + i * 60_000))
      banco = criarBanco({ clips: [...mortas, L('orfa-antiga', 5 * D)] })
      let horas = 0, pagas = 0
      while (banco.tabelas.clips.find((x) => x.id === 'orfa-antiga').credits_refunded === 0 && horas < 20) {
        horas++
        await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async (ref) => (ref === 'clips-orfa-antiga' && !pagas++ ? 45 : 0), async (ref) => (ref.startsWith('clips-morta') ? { amount: 45, refunded: true } : null))
      }
      const t = banco.tabelas.clips
      if (t.find((x) => x.id === 'orfa-antiga').credits_refunded !== 45 || horas > 3 || pagas !== 1 || mortas.some((x) => t.find((y) => y.id === x.id).credits_refunded !== 45)) throw new Error(`órfã em ${horas} horas, pagas ${pagas}`)
    })
    await check('B3 livro-razão SEM estorno (erro de verdade no RPC): nada gravado; volta na hora seguinte', async () => {
      banco = criarBanco({ clips: [L('erro', H)] })
      await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 0, async () => ({ amount: 45, refunded: false }))
      if (banco.tabelas.clips[0].credits_refunded !== 0) throw new Error('gravou estorno que não aconteceu')
      await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 45, async () => null)
      if (banco.tabelas.clips[0].credits_refunded !== 45) throw new Error('não voltou')
    })
    await check('B4 empate de created_at na borda (80 linhas com a mesma hora em volta da 50ª): a órfã no meio volta; cada linha olhada uma vez', async () => {
      const hora = iso(2 * H)
      const linhas = [...Array.from({ length: 30 }, (_, i) => L('a' + String(i).padStart(3, '0'), H + i * 60_000)), ...Array.from({ length: 80 }, (_, i) => L('e' + String(i).padStart(3, '0'), 0, { created_at: hora })), L('e-orfa', 0, { created_at: hora })]
      const vistos = []
      await roda({ clips: linhas }, async (ref) => { vistos.push(ref); return ref === 'clips-e-orfa' ? 45 : 0 }, async () => null)
      if (banco.tabelas.clips.find((x) => x.id === 'e-orfa').credits_refunded !== 45 || vistos.length !== linhas.length || new Set(vistos).size !== linhas.length) throw new Error(`olhou ${vistos.length} (${new Set(vistos).size}) de ${linhas.length}`)
    })
    await check('B5 sweepClipJobs chama a varredura nova', async () => {
      const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
      const corpo = s.slice(s.indexOf('export async function sweepClipJobs'), s.indexOf('export async function advanceActiveClipJobs'))
      if (!corpo.includes('const orfas = await estornarOrfaosDaTrocaEDaFila(admin, since)') || !corpo.includes('result.refunded += orfas.refunded')) throw new Error('sweepClipJobs não chama')
    })
  } finally { console.error = consoleErro; console.log = consoleLog; console.warn = consoleWarn }
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const src = { [REFUND]: lf(REFUND), [SRV]: lf(SRV) }
const troca = (arq, a, b) => { if (src[arq].split(a).length !== 2) { console.error('âncora do mutante: ' + a.slice(0, 80)); process.exit(1) } return { [arq]: src[arq].replace(a, () => b) } }
const linhaQueComeca = (arq, prefixo) => { const l = src[arq].split('\n').find((x) => x.startsWith(prefixo)); if (!l) { console.error('mutante: ' + prefixo); process.exit(1) } return l }
const mutantes = [
  ['A: das mais antigas (o defeito)', troca(REFUND, ".order('created_at', { ascending: false })\n    .order('render_id', { ascending: false })\n    .limit(ADS_V2_SWEEP_PAGE)", ".order('created_at', { ascending: true })\n    .order('render_id', { ascending: true })\n    .limit(ADS_V2_SWEEP_PAGE)")],
  ['A: uma página só', troca(REFUND, 'export const ADS_V2_SWEEP_MAX_PAGES = 10', 'export const ADS_V2_SWEEP_MAX_PAGES = 1')],
  ['A: sem teto de páginas', troca(REFUND, 'export const ADS_V2_SWEEP_MAX_PAGES = 10', 'export const ADS_V2_SWEEP_MAX_PAGES = 1000')],
  ['A: chave só por created_at (pula o empate)', troca(REFUND, "  if (cursor) q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",render_id.lt.\"${cursor.ref}\")`)", "  if (cursor) q = q.lt('created_at', cursor.createdAt)")],
  ['A: estorna o entregue', troca(REFUND, "    if (order.status === 'delivered' || order.video_id || delivered.has(d.render_id)) continue\n", '')],
  ['B: das mais antigas', troca(SRV, "    const { data, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TROCA_FILA_ESTORNO_PAGINA)", "    const { data, error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).limit(TROCA_FILA_ESTORNO_PAGINA)")],
  ['B: uma página só', troca(SRV, 'export const TROCA_FILA_ESTORNO_PAGINAS = 4', 'export const TROCA_FILA_ESTORNO_PAGINAS = 1')],
  ['B: chave só por created_at', { [SRV]: src[SRV].replace(src[SRV].split('\n').filter((l) => l.startsWith('    if (cursor) q = q.or(`created_at.lt.'))[1], "    if (cursor) q = q.lt('created_at', cursor.createdAt)") }],
  ['B: sem o livro-razão', troca(SRV, "    for (const row of pagina.filter((r) => r.status === 'failed' && r.credits_refunded === 0 && cobreTrocaOuFila(r.failure_reason))) {\n      total.scanned += 1\n      const amount = await refund(row.billing_reference)\n      if (amount > 0) { await setRefunded(row.id, amount); total.refunded += 1; total.creditsReturned += amount; continue }\n      const debito = await livro(row.billing_reference).catch(() => null)\n", "    for (const row of pagina.filter((r) => r.status === 'failed' && r.credits_refunded === 0 && cobreTrocaOuFila(r.failure_reason))) {\n      total.scanned += 1\n      const amount = await refund(row.billing_reference)\n      if (amount > 0) { await setRefunded(row.id, amount); total.refunded += 1; total.creditsReturned += amount; continue }\n      const debito = null as { amount: number; refunded: boolean } | null; void livro\n")],
  ['B: sem os motivos da fila', troca(SRV, "const cobreTrocaOuFila = (motivo: string | null) => isRecreateNotSwappedReason(motivo) || (typeof motivo === 'string' && FILA_MOTIVOS_DE_ESTORNO.includes(motivo))", 'const cobreTrocaOuFila = (motivo: string | null) => isRecreateNotSwappedReason(motivo)')],
  // a consulta E a regra filtram o motivo (defesa em dobro): o mutante abre os dois
  ['B: qualquer motivo (consulta e regra)', { [SRV]: src[SRV].replace("cobreTrocaOuFila(r.failure_reason))) {\n      total.scanned += 1", "true)) {\n      total.scanned += 1").replace(".eq('status', 'failed').eq('credits_refunded', 0).in('failure_reason', [...SWAP_REFUND_SWEEP_REASONS, ...FILA_MOTIVOS_DE_ESTORNO]).gte('created_at', since)\n    if (cursor) q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)\n    const { data, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TROCA_FILA_ESTORNO_PAGINA)", ".eq('status', 'failed').eq('credits_refunded', 0).gte('created_at', since)\n    if (cursor) q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)\n    const { data, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TROCA_FILA_ESTORNO_PAGINA)") }],
]
void linhaQueComeca
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === src[k]) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS varreduras de estorno: Anúncio v2 (250 entregues na frente não escondem o novo nem o mais antigo; entregue nunca; nada duas vezes; empate; regras de antes; teto) e troca/fila do Recreate (60 sem resposta e 250 mortas na frente; livro-razão; empate; motivos); ${mortos}/${mutantes.length} mutantes mortos`)
