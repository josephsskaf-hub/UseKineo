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
function criarBanco(tabelas, opcoes = {}) {
  const st = { lidas: { credit_debits: 0, clips: 0, ads_v2_orders: 0 }, contagem: { credit_debits: 0, ads_v2_orders: 0 }, rpcs: [] } // KINEO-ADSV2-SEM-PEDIDO-1411 — + as leituras da contagem semPedido, à parte
  const from = (nome) => {
    const t = (tabelas[nome] ??= [])
    const f = [], ords = []; let op = 'select', valores = null, lim = Infinity, um = false, ret = false, cols = '', comLike = false
    const api = {
      select(c) { if (op !== 'select') ret = true; else cols = String(c ?? ''); return api }, insert(v) { op = 'insert'; valores = v; return api }, update(v) { op = 'update'; valores = v; return api },
      limit(n) { lim = n; return api }, maybeSingle() { um = true; return api },
      order(c, o) { ords.push([c, o?.ascending === false ? -1 : 1]); return api },
      eq(c, v) { f.push((r) => r[c] === v); return api }, is(c, v) { f.push((r) => (r[c] ?? null) === v); return api },
      lt(c, v) { f.push((r) => r[c] < v); return api }, gte(c, v) { f.push((r) => r[c] >= v); return api },
      in(c, vs) { f.push((r) => vs.includes(r[c])); return api },
      neq(c, v) { f.push((r) => r[c] !== v); return api },
      not(c, o, v) { if (o === 'is' && v === null) { f.push((r) => r[c] != null); return api } if (o !== 'in') throw new Error('not.' + o); const vs = String(v).replace(/^\(|\)$/g, '').split(','); f.push((r) => r[c] != null && !vs.includes(r[c])); return api },
      like(c, p) { comLike = true; const re = new RegExp('^' + p.split('%').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); f.push((r) => re.test(String(r[c] ?? ''))); return api },
      or(e) { const m = OR_CHAVE.exec(e); if (!m || m[1] !== m[2]) throw new Error('filtro de chave ilegível: ' + e); f.push((r) => r.created_at < m[1] || (r.created_at === m[1] && r[m[3]] < m[4])); return api },
      then(ok, ko) {
        return Promise.resolve().then(() => {
          if (opcoes.erroEm?.includes(nome) && op === 'select') return { data: null, error: { message: 'erro de teste em ' + nome } } // KINEO-NUNCA-COBRADO-TELA-1411
          if (op === 'insert') { t.push(...(Array.isArray(valores) ? valores : [valores]).map((r) => ({ ...r }))); return { data: null, error: null } }
          const todos = t.filter((r) => f.every((x) => x(r)))
          if (ords.length) todos.sort((a, b) => { for (const [c, s] of ords) { if (a[c] < b[c]) return -s; if (a[c] > b[c]) return s } return 0 })
          const hit = todos.slice(0, lim)
          if (op === 'update') { for (const r of hit) Object.assign(r, valores); const d = hit.map((r) => ({ ...r })); return { data: um ? d[0] ?? null : ret ? d : null, error: null } }
          const daContagem = (nome === 'credit_debits' && comLike) || (nome === 'ads_v2_orders' && cols === 'billing_ref') // KINEO-ADSV2-SEM-PEDIDO-1411
          if (daContagem) st.contagem[nome] += hit.length
          else if (nome in st.lidas) st.lidas[nome] += hit.length
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
    // ── A. Anúncio v2 — KINEO-VARREDURAS-SEGUIMENTO-1411: a busca parte do PEDIDO não entregue (o entregue nunca é lido; sem corte de 14 dias) ──
    const deb = (ref, ms, o = {}) => ({ render_id: ref, user_id: U, amount: 34, refunded_at: null, kind: 'video', created_at: iso(ms), ...o })
    const ped = (id, ref, status, o = {}) => ({ id, user_id: U, status, billing_ref: ref, started_at: iso(5 * H), video_id: null, created_at: iso(5 * H), ...o })
    const pid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    const jaDevolvidos = (n, desdeMs, prefixo = 'velho') => Array.from({ length: n }, (_, i) => ({ d: deb(`adsv2-${prefixo}-${i}`, desdeMs + i * 60_000, { refunded_at: iso(H) }), o: ped(pid(100000 + i), `adsv2-${prefixo}-${i}`, 'failed', { created_at: iso(desdeMs + i * 60_000) }) }))
    await check('A1 250 pedidos ENTREGUES (débito nunca devolvido) nunca são lidos; o abandonado NOVO e o de 30 DIAS (sem corte de janela) estornam na 1ª rodada; nada duas vezes', async () => {
      const ent = Array.from({ length: 250 }, (_, i) => ({ d: deb(`adsv2-entregue-${i}`, 3 * H + i * 60_000), o: ped(pid(i), `adsv2-entregue-${i}`, 'delivered', { video_id: 'v' + i, created_at: iso(3 * H + i * 60_000) }) }))
      banco = criarBanco({
        credit_debits: [...ent.map((x) => x.d), deb('adsv2-novo-falhou', 2.5 * H), deb('adsv2-antigo-cancelado', 30 * D)],
        ads_v2_orders: [...ent.map((x) => x.o), ped(pid(900), 'adsv2-novo-falhou', 'failed', { created_at: iso(2.5 * H) }), ped(pid(901), 'adsv2-antigo-cancelado', 'cancelled', { created_at: iso(30 * D) })],
        videos: [], events: [],
      })
      const r = await R.sweepAbandonedAdsV2Debits()
      const devolvidos = banco.tabelas.credit_debits.filter((d) => d.refunded_at).map((d) => d.render_id).sort()
      if (devolvidos.join() !== 'adsv2-antigo-cancelado,adsv2-novo-falhou' || r.refunded !== 2 || r.creditsReturned !== 68) throw new Error(JSON.stringify([devolvidos, r]))
      if (banco.st.lidas.ads_v2_orders !== 2 || banco.st.lidas.credit_debits !== 2) throw new Error('leu o entregue: ' + JSON.stringify(banco.st.lidas))
      const r2 = await R.sweepAbandonedAdsV2Debits()
      if (r2.refunded !== 0 || banco.st.rpcs.filter((x) => x.startsWith('adsv2-entregue')).length) throw new Error('2ª rodada ou entregue no RPC: ' + JSON.stringify(r2))
    })
    await check('A1b (revisor, b) o abandonado ANTIGO atrás de 2500 pedidos falhos já devolvidos (mais novos) é alcançado na 1ª rodada', async () => {
      const dev = jaDevolvidos(2500, 3 * H)
      banco = criarBanco({ credit_debits: [...dev.map((x) => x.d), deb('adsv2-velho-abandonado', 20 * D)], ads_v2_orders: [...dev.map((x) => x.o), ped(pid(950), 'adsv2-velho-abandonado', 'failed', { created_at: iso(20 * D) })], videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.refunded !== 1 || !banco.tabelas.credit_debits.find((d) => d.render_id === 'adsv2-velho-abandonado').refunded_at) throw new Error(JSON.stringify(r))
    })
    await check('A2 empate de created_at na borda da página (400 pedidos com a MESMA hora, abandonado no meio): estorna, cada pedido lido uma vez', async () => {
      const hora = iso(5 * H)
      const e = Array.from({ length: 400 }, (_, i) => ({ d: deb(`adsv2-empate-${i}`, 0, { created_at: hora, refunded_at: iso(H) }), o: ped(pid(i), `adsv2-empate-${i}`, 'failed', { created_at: hora }) }))
      banco = criarBanco({ credit_debits: [...e.map((x) => x.d), deb('adsv2-empate-x', 0, { created_at: hora })], ads_v2_orders: [...e.map((x) => x.o), ped(pid(199).replace(/9$/, 'a'), 'adsv2-empate-x', 'failed', { created_at: hora })], videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.refunded !== 1 || banco.st.lidas.ads_v2_orders !== 401) throw new Error(JSON.stringify([r, banco.st.lidas]))
    })
    await check('A3 as regras de antes seguem: parado > 2 h vira failed e estorna; em andamento < 2 h não; pedido de outra conta = ambíguo, sem estorno', async () => {
      banco = criarBanco({
        credit_debits: [deb('adsv2-parado', 4 * H), deb('adsv2-andando', 3 * H), deb('adsv2-sem-pedido', 3 * H), deb('adsv2-alheio', 3 * H)],
        ads_v2_orders: [ped(pid(1), 'adsv2-parado', 'generating', { started_at: iso(3 * H) }), ped(pid(2), 'adsv2-andando', 'assembling', { started_at: iso(30 * 60_000) }), ped(pid(3), 'adsv2-alheio', 'failed', { user_id: '99999999-2222-4333-8444-555555555555' })],
        videos: [], events: [],
      })
      const r = await R.sweepAbandonedAdsV2Debits()
      const devolvidos = banco.tabelas.credit_debits.filter((d) => d.refunded_at).map((d) => d.render_id)
      if (devolvidos.join() !== 'adsv2-parado' || r.stalledFailed !== 1 || r.ambiguous !== 1 || banco.tabelas.ads_v2_orders.find((o) => o.id === pid(1)).status !== 'failed') throw new Error(JSON.stringify([devolvidos, r]))
    })
    await check('A4 teto de 20 páginas por rodada: 5000 pedidos falhos já devolvidos = no máximo 4000 lidos; o abandonado MAIS NOVO vem primeiro e estorna', async () => {
      const dev = jaDevolvidos(5000, 3 * H)
      banco = criarBanco({ credit_debits: [...dev.map((x) => x.d), deb('adsv2-mais-novo', 2.5 * H)], ads_v2_orders: [...dev.map((x) => x.o), ped(pid(960), 'adsv2-mais-novo', 'failed', { created_at: iso(2.5 * H) })], videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (banco.st.lidas.ads_v2_orders !== 4000 || r.refunded !== 1) throw new Error('lidas: ' + JSON.stringify([banco.st.lidas, r]))
    })
    // KINEO-ADSV2-SEM-PEDIDO-1411 [CEO 14/11: semPedido SIM, só a contagem; truncado quando as 20 páginas vêm cheias]
    await check('A4b truncado: 20 páginas cheias = truncado true; rodada que acaba antes = false', async () => {
      const dev = jaDevolvidos(5000, 3 * H)
      banco = criarBanco({ credit_debits: dev.map((x) => x.d), ads_v2_orders: dev.map((x) => x.o), videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.truncado !== true) throw new Error('não avisou: ' + JSON.stringify(r))
      banco = criarBanco({ credit_debits: dev.slice(0, 3999).map((x) => x.d), ads_v2_orders: dev.slice(0, 3999).map((x) => x.o), videos: [], events: [] })
      const r2 = await R.sweepAbandonedAdsV2Debits()
      if (r2.truncado !== false) throw new Error('avisou sem as 20 cheias: ' + JSON.stringify(r2))
    })
    await check('A4c semPedido: conta o débito adsv2 (adsv2- e adsv2redo-) não devolvido, de 2 h a 48 h, SEM pedido; não conta o devolvido, o de menos de 2 h, o de mais de 48 h nem o com pedido; nunca estorna o que contou', async () => {
      banco = criarBanco({
        credit_debits: [deb('adsv2-orfao', 3 * H), deb('adsv2redo-orfao', 30 * H), deb('adsv2-orfao-devolvido', 3 * H, { refunded_at: iso(H) }), deb('adsv2-orfao-novo', 30 * 60_000), deb('adsv2-orfao-velho', 3 * D), deb('adsv2-com-pedido', 3 * H), deb('render-de-filme', 3 * H)],
        ads_v2_orders: [ped(pid(1), 'adsv2-com-pedido', 'failed', { created_at: iso(3 * H) })], videos: [], events: [],
      })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.semPedido !== 2) throw new Error('contou: ' + JSON.stringify(r))
      if (banco.st.rpcs.some((x) => x.includes('orfao'))) throw new Error('estornou o que só devia contar: ' + banco.st.rpcs.join())
      if (r.refunded !== 1) throw new Error('a varredura mudou: ' + JSON.stringify(r))
    })
    await check('A4d semPedido não cresce com os entregues de sempre: 250 entregues de 3 dias = 0 lidos pela contagem; 250 de hoje = lidos, contagem 0; erro de leitura = null (não 0)', async () => {
      const velhos = Array.from({ length: 250 }, (_, i) => ({ d: deb(`adsv2-ent-${i}`, 3 * D + i * 60_000), o: ped(pid(i), `adsv2-ent-${i}`, 'delivered', { video_id: 'v' + i, created_at: iso(3 * D) }) }))
      banco = criarBanco({ credit_debits: velhos.map((x) => x.d), ads_v2_orders: velhos.map((x) => x.o), videos: [], events: [] })
      const r = await R.sweepAbandonedAdsV2Debits()
      if (r.semPedido !== 0 || banco.st.contagem.credit_debits !== 0) throw new Error('leu fora da janela: ' + JSON.stringify([r.semPedido, banco.st.contagem]))
      const hoje = Array.from({ length: 250 }, (_, i) => ({ d: deb(`adsv2-hoje-${i}`, 3 * H + i * 60_000), o: ped(pid(i), `adsv2-hoje-${i}`, 'delivered', { video_id: 'v' + i, created_at: iso(3 * H) }) }))
      banco = criarBanco({ credit_debits: hoje.map((x) => x.d), ads_v2_orders: hoje.map((x) => x.o), videos: [], events: [] })
      const r2 = await R.sweepAbandonedAdsV2Debits()
      if (r2.semPedido !== 0 || banco.st.contagem.credit_debits !== 250 || banco.st.contagem.ads_v2_orders !== 250 || banco.st.lidas.credit_debits !== 0) throw new Error('hoje: ' + JSON.stringify([r2.semPedido, banco.st.contagem, banco.st.lidas]))
      banco = criarBanco({ credit_debits: [deb('adsv2-orfao', 3 * H)], ads_v2_orders: [], videos: [], events: [] }, { erroEm: ['credit_debits'] })
      const r3 = await R.sweepAbandonedAdsV2Debits()
      if (r3.semPedido !== null) throw new Error('erro virou número: ' + JSON.stringify(r3))
    })
    await check('A4e o cron devolve semPedido e truncado no JSON (adsV2), com null e false de partida', async () => {
      const s = (over['app/api/cron/refund-sweep/route.ts'] ?? lf('app/api/cron/refund-sweep/route.ts'))
      if (!s.includes("ambiguous: 0, truncado: false, semPedido: null }")) throw new Error('o cron sem os avisos')
    })
    await check('A5 a busca: pedidos NÃO entregues com referência, das mais novas, pela chave (created_at e id); sem corte de 14 dias; o cron chama a varredura', async () => {
      const s = (over[REFUND] ?? lf(REFUND))
      for (const x of [".neq('status', 'delivered')\n      .is('video_id', null)\n      .not('billing_ref', 'is', null)", "q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)", ".order('created_at', { ascending: false }).order('id', { ascending: false }).limit(ADS_V2_SWEEP_PAGE)"]) if (!s.includes(x)) throw new Error('falta: ' + x.slice(0, 60))
      if (/ADS_V2_SWEEP_WINDOW_MS/.test(s)) throw new Error('voltou o corte de 14 dias')
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
    await check('B6 (KINEO-MOVIMENTO-ANTES-DE-ABRIR-2-1411) troca e fila: linha SEM débito do dono há mais de 1 h vira never_charged e sai da busca; com menos de 1 h espera', async () => {
      const linhas = [L('sem-velha', 2 * H), L('sem-nova', 10 * 60_000)]
      await roda({ clips: linhas }, async () => 0, async () => 'sem-debito')
      const t = banco.tabelas.clips
      if (t.find((x) => x.id === 'sem-velha').failure_reason !== 'never_charged' || t.find((x) => x.id === 'sem-nova').failure_reason !== 'swap_unchanged') throw new Error(JSON.stringify(t.map((x) => [x.id, x.failure_reason])))
      const r2 = await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 0, async () => 'sem-debito')
      if (r2.scanned !== 1) throw new Error('a never_charged voltou para a busca: ' + r2.scanned)
    })
    // KINEO-NUNCA-COBRADO-TELA-1411 [revisor da CEO 14/11, item a] — a marca roda na troca e na fila (abertas a clientes): o livro PADRÃO (livroRazaoDoClipe) executado
    const UL = (id, o = {}) => L(id, 2 * H, o)
    await check('B7 o livro padrão confere o DONO: débito estornado de OUTRA conta na mesma referência não grava nada nesta linha', async () => {
      banco = criarBanco({ clips: [UL('dono')], credit_debits: [{ render_id: 'clips-dono', user_id: '99999999-2222-4333-8444-555555555555', amount: 45, kind: 'video', created_at: iso(3 * H), refunded_at: iso(H) }] })
      await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 0)
      if (banco.tabelas.clips[0].credits_refunded !== 0) throw new Error('gravou o estorno de outra conta')
    })
    await check('B8 o livro FORA DO AR (erro de leitura) não é "sem débito": nada marcado, nada gravado', async () => {
      banco = criarBanco({ clips: [UL('livro-fora')] }, { erroEm: ['credit_debits'] })
      await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 0)
      const l = banco.tabelas.clips[0]
      if (l.failure_reason !== 'swap_unchanged' || l.credits_refunded !== 0) throw new Error(JSON.stringify([l.failure_reason, l.credits_refunded]))
    })
    await check('B9 a marca exige credits_refunded 0 NA HORA de gravar: estorno feito por outro caminho entre a leitura e a marca = nada marcado', async () => {
      banco = criarBanco({ clips: [UL('corrida')] })
      await srv.estornarOrfaosDaTrocaEDaFila(banco.db, since, async () => 0, async () => { banco.tabelas.clips[0].credits_refunded = 45; return 'sem-debito' })
      if (banco.tabelas.clips[0].failure_reason !== 'swap_unchanged') throw new Error('marcou never_charged uma linha já estornada')
    })
    await check('B10 a tela da troca e da fila: never_charged sem nada devolvido diz "You were not charged" (o movimento tem a frase própria); a tela mostra a frase', async () => {
      const st = lf('app/api/recreate/status/route.ts').replace(/\/\/[^\n]*/g, ''), cl = lf('app/recreate/RecreateClient.tsx')
      if (!st.includes("const naoCobrado = !ehMovimento && status === 'failed' && fresh.failure_reason === MOTIVO_NUNCA_COBRADO && credits_refunded === 0 ? { reason: 'not_charged', message: FRASE_NAO_COBRADO } : {}") || !st.includes('...filaFalhou, ...naoCobrado,') || !/FRASE_NAO_COBRADO = 'This video could not be made\. You were not charged\.'/.test(st)) throw new Error('status')
      if (!cl.includes("clip?.reason === 'not_charged') && clip.message ? clip.message")) throw new Error('a tela não mostra a frase')
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
const src = { [REFUND]: lf(REFUND), [SRV]: lf(SRV), ['app/api/cron/refund-sweep/route.ts']: lf('app/api/cron/refund-sweep/route.ts') } // + o cron (KINEO-ADSV2-SEM-PEDIDO-1411)
const troca = (arq, a, b) => { if (src[arq].split(a).length !== 2) { console.error('âncora do mutante: ' + a.slice(0, 80)); process.exit(1) } return { [arq]: src[arq].replace(a, () => b) } }
const linhaQueComeca = (arq, prefixo) => { const l = src[arq].split('\n').find((x) => x.startsWith(prefixo)); if (!l) { console.error('mutante: ' + prefixo); process.exit(1) } return l }
const mutantes = [
  // KINEO-VARREDURAS-SEGUIMENTO-1411 — a busca parte do pedido não entregue
  ['A: das mais antigas (o defeito)', troca(REFUND, ".order('created_at', { ascending: false }).order('id', { ascending: false }).limit(ADS_V2_SWEEP_PAGE)", ".order('created_at', { ascending: true }).order('id', { ascending: true }).limit(ADS_V2_SWEEP_PAGE)")],
  // KINEO-ADSV2-SEM-PEDIDO-1411
  ['semPedido sem a janela de 48 h', troca(REFUND, "      .gte('created_at', desde)\n      .lt('created_at', cutoff)\n      .order('created_at', { ascending: false })\n      .limit(ADS_V2_SEM_PEDIDO_MAX)", "      .lt('created_at', cutoff)\n      .order('created_at', { ascending: false })\n      .limit(ADS_V2_SEM_PEDIDO_MAX)")],
  ['semPedido conta o devolvido', troca(REFUND, "      .select('render_id')\n      .eq('kind', 'video')\n      .is('refunded_at', null)\n", "      .select('render_id')\n      .eq('kind', 'video')\n")],
  ['semPedido conta o de menos de 2 h', troca(REFUND, "      .gte('created_at', desde)\n      .lt('created_at', cutoff)\n", "      .gte('created_at', desde)\n")],
  ['semPedido com erro vira 0', troca(REFUND, '    if (error) return null\n    const linhas = ', '    if (error) return 0\n    const linhas = ')],
  ['truncado nunca avisa', troca(REFUND, '  result.truncado = true\n', '')],
  ['cron sem os avisos', troca('app/api/cron/refund-sweep/route.ts', 'ambiguous: 0, truncado: false, semPedido: null }', 'ambiguous: 0, truncado: false, semPedido: 0 }')],
  ['A: uma página só', troca(REFUND, 'export const ADS_V2_SWEEP_MAX_PAGES = 20', 'export const ADS_V2_SWEEP_MAX_PAGES = 1')],
  ['A: sem teto de páginas', troca(REFUND, 'export const ADS_V2_SWEEP_MAX_PAGES = 20', 'export const ADS_V2_SWEEP_MAX_PAGES = 1000')],
  ['A: chave só por created_at (pula o empate)', troca(REFUND, "    if (cursor) q = q.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)", "    if (cursor) q = q.lt('created_at', cursor.createdAt)")],
  ['A: busca e regra sem o entregue', { [REFUND]: src[REFUND].replace("      .neq('status', 'delivered')\n      .is('video_id', null)\n", '').replace("      if (order.status === 'delivered' || order.video_id || delivered.has(d.render_id)) continue\n", '') }],
  ['A: de volta o corte de 14 dias', troca(REFUND, "        .lt('created_at', cutoff)\n        .in('render_id', refs.slice(i, i + ADS_V2_DEBIT_REF_CHUNK))", "        .lt('created_at', cutoff)\n        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())\n        .in('render_id', refs.slice(i, i + ADS_V2_DEBIT_REF_CHUNK))")],
  ['B: das mais antigas', troca(SRV, "    const { data, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TROCA_FILA_ESTORNO_PAGINA)", "    const { data, error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).limit(TROCA_FILA_ESTORNO_PAGINA)")],
  ['B: uma página só', troca(SRV, 'export const TROCA_FILA_ESTORNO_PAGINAS = 4', 'export const TROCA_FILA_ESTORNO_PAGINAS = 1')],
  ['B: chave só por created_at', { [SRV]: src[SRV].replace(src[SRV].split('\n').filter((l) => l.startsWith('    if (cursor) q = q.or(`created_at.lt.'))[1], "    if (cursor) q = q.lt('created_at', cursor.createdAt)") }],
  ['B: sem o livro-razão', troca(SRV, "    for (const row of pagina.filter((r) => r.status === 'failed' && r.credits_refunded === 0 && cobreTrocaOuFila(r.failure_reason))) {\n      total.scanned += 1\n      const amount = await refund(row.billing_reference)\n      if (amount > 0) { await setRefunded(row.id, amount); total.refunded += 1; total.creditsReturned += amount; continue }\n      const debito = await livro(row.billing_reference, row.user_id).catch(() => null)\n", "    for (const row of pagina.filter((r) => r.status === 'failed' && r.credits_refunded === 0 && cobreTrocaOuFila(r.failure_reason))) {\n      total.scanned += 1\n      const amount = await refund(row.billing_reference)\n      if (amount > 0) { await setRefunded(row.id, amount); total.refunded += 1; total.creditsReturned += amount; continue }\n      const debito = null as { amount: number; refunded: boolean } | null; void livro\n")],
  ['B: nunca cobrado fica na busca', { [SRV]: (() => { const s = src[SRV], ini = s.indexOf('export async function estornarOrfaosDaTrocaEDaFila'), fim = s.indexOf('\n}\n', ini); return s.slice(0, ini) + s.slice(ini, fim).replace("      if (debito === 'sem-debito') { if (await marcarNuncaCobrado(admin, row)) total.nuncaCobrados += 1; continue }", '') + s.slice(fim) })() }],
  // KINEO-NUNCA-COBRADO-TELA-1411
  ['livro sem conferir o dono', troca(SRV, ".eq('render_id', ref).eq('user_id', userId).maybeSingle()", ".eq('render_id', ref).maybeSingle()")],
  ['erro do livro tratado como sem débito', troca(SRV, "    if (error) return null\n    if (!data) return 'sem-debito'", "    if (error || !data) return 'sem-debito'")],
  ['marca sem exigir credits_refunded 0', troca(SRV, "update({ failure_reason: MOTIVO_NUNCA_COBRADO }).eq('id', row.id).eq('status', 'failed').eq('credits_refunded', 0)", "update({ failure_reason: MOTIVO_NUNCA_COBRADO }).eq('id', row.id).eq('status', 'failed')")],
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
