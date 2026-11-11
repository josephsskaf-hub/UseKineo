// KINEO-RESERVA-FILME-COMPLETO-1111 — guardião: quem pagou a versão completa recebe o filme mesmo gastando créditos entre o
// pagamento e o filme começar. Código de verdade (lib/filmComplete/server.ts no harness local, zero rede) + um livro-razão que
// imita as duas regras que a rota real já tem (conferidas no fim, no código): o débito é idempotente por chave
// (debit_video_credits_service) e a rota pula o portão de saldo quando a geração já tem débito vivo (geracaoJaDebitada).
// Rodar: node scripts/test-reserva-filme-completo-1111.mjs
import assert from 'node:assert/strict'
import { world, read, USER, VIDEO, CAMPAIGN } from './test-support/upsell-filme15-harness-2610.mjs'

const SERVER = 'lib/filmComplete/server.ts'
const ORIGIN = 'https://www.usekineo.com'
const STARTER = 40
const RECUSADO = { script: 'HOOK: [Pexels: robot] Short.\nPAYOFF: [Pexels: gift] End.', stillShort: true, words: 5, minWords: 100, targetSeconds: 35 }

async function cenario(overrides, opts = {}) {
  const ctx = world(overrides)
  const s = { balance: STARTER, ledger: new Map(), spendTried: null, spendOk: null, routeCalls: 0, routeBodies: [], writerCalls: 0, k4: opts.kling4 ?? false }
  const charge = (key, cost) => {
    if (s.ledger.has(key)) return true // replay: o RPC idempotente não cobra de novo
    if (s.balance < cost) return false
    s.balance -= cost; s.ledger.set(key, { amount: cost, refunded: false }); return true
  }
  const live = (key) => s.ledger.has(key) && !s.ledger.get(key).refunded
  const io = {
    now: () => ctx.now, mint: ctx.io.mint,
    // flipKling4AfterPay: o pagamento (settle) vê a promo FECHADA; o início do filme, logo depois, já a vê aberta
    kling4Free: async () => { s.k4Calls = (s.k4Calls ?? 0) + 1; return opts.flipKling4AfterPay ? s.k4Calls > 1 : s.k4 },
    fetch: async (url, init) => {
      if (String(url).endsWith('/api/generate-script')) {
        s.writerCalls++
        // ── entre pagar e o filme começar: a pessoa gasta créditos em outra coisa ──
        if (opts.spend && s.spendTried === null) { s.spendTried = opts.spend; s.spendOk = charge('outra-coisa-' + opts.spend, opts.spend) }
        if (opts.writer === 'rejected') return Response.json(RECUSADO, { status: 200 })
        return ctx.io.fetch(url, init)
      }
      if (String(url).endsWith('/api/generate-video-cinematic')) {
        s.routeCalls++
        const body = JSON.parse(init.body); s.routeBodies.push(body)
        if (opts.routeRefuses) return Response.json({ reason: 'fixture_refused' }, { status: 422 })
        const key = ctx.service.filmCompleteBillingReference(USER, body.generationId)
        const cost = body.engine === 'hollywood' ? 0 : 21
        if (cost > 0) {
          if (s.balance < cost && !live(key)) return Response.json({ error: 'not enough credits' }, { status: 402 }) // o portão da rota
          if (!charge(key, cost)) return Response.json({ error: 'not enough credits' }, { status: 402 })
        }
        return ctx.io.fetch(url, init)
      }
      return ctx.io.fetch(url, init)
    },
  }
  if (opts.wired !== false) {
    io.reserve = async (_db, { billingReference, cost }) => (charge(billingReference, cost) ? 'reserved' : 'insufficient')
    io.release = async (key) => { const r = s.ledger.get(key); if (!r || r.refunded) return 0; r.refunded = true; s.balance += r.amount; return r.amount }
  }
  const intent = await ctx.service.createFilmCompleteIntent(ctx.db, USER, VIDEO, 'film_ready')
  ctx.pay() // o webhook concede o plano ANTES de chamar settleFilmComplete
  const session = { id: 'cs_live_reserva', payment_status: 'paid', mode: 'subscription', amount_total: 900, metadata: { ...ctx.service.filmCompleteCheckoutMetadata(intent), supabase_user_id: USER, tier: 'starter', billing: 'monthly', intent_campaign: CAMPAIGN } }
  const pay = () => ctx.service.settleFilmComplete(ctx.db, session, ORIGIN, ctx.now, io)
  const row = () => ctx.tables.events.find((r) => r.id === intent.id)
  const relaunch = async () => ctx.service.startFilmComplete(ctx.db, await ctx.service.loadFilmCompleteIntent(ctx.db, USER, intent.id), ORIGIN, io)
  const key = () => ctx.service.filmCompleteBillingReference(USER, row().metadata.generation_id ?? intent.generationId)
  return { ctx, s, io, pay, row, relaunch, intent, key }
}

// cada chave cinematic-* no livro-razão é UMA cobrança de filme (o replay da mesma chave não cria outra)
const cobrancasDoFilme = (c) => [...c.s.ledger.keys()].filter((k) => k.startsWith('cinematic-')).length

async function battery(overrides = {}) {
  const p = []
  const check = async (label, fn) => { try { await fn() } catch (e) { p.push(`${label}: ${e.message.split('\n')[0]}`) } }

  await check('(A) gastou 20 créditos entre pagar e o filme começar', async () => {
    const c = await cenario(overrides, { spend: 20 })
    await c.pay()
    assert.equal(c.s.spendOk, false, 'com o filme reservado, sobram 19: os 20 não passam')
    assert.equal(c.s.routeCalls, 1, 'o filme foi à rota')
    assert.equal(c.row().metadata.state, 'processing', 'o filme saiu (antes: waiting_entitlement)')
    assert.equal(cobrancasDoFilme(c), 1, 'o filme foi cobrado 1 vez')
    assert.equal(c.s.balance, STARTER - 21, '21 do filme e nada mais')
    assert.equal(c.row().metadata.credits_reserve, 'reserved')
  })
  await check('(B) gastou TUDO o que sobrou (19)', async () => {
    const c = await cenario(overrides, { spend: 19 })
    await c.pay()
    assert.equal(c.s.spendOk, true); assert.equal(c.row().metadata.state, 'processing'); assert.equal(c.s.balance, 0); assert.equal(cobrancasDoFilme(c), 1)
  })
  await check('(C) o defeito de antes, no mesmo modelo: sem reserva, 20 gastos = 402', async () => {
    const c = await cenario(overrides, { spend: 20, wired: false })
    await c.pay()
    assert.equal(c.s.spendOk, true); assert.equal(c.row().metadata.state, 'waiting_entitlement', 'o modelo reproduz o buraco que a reserva fecha')
  })
  await check('(D) webhook repetido e novo início não cobram de novo', async () => {
    const c = await cenario(overrides)
    await c.pay(); await c.pay()
    await c.relaunch()
    assert.equal(c.s.balance, STARTER - 21, 'uma cobrança só'); assert.equal([...c.s.ledger.keys()].filter((k) => k.startsWith('cinematic-')).length, 1)
  })
  await check('(E) roteirista recusa 3 vezes: o filme não sai e a reserva VOLTA', async () => {
    const c = await cenario(overrides, { writer: 'rejected' })
    await c.pay(); await c.relaunch(); await c.relaunch()
    assert.equal(c.row().metadata.state, 'failed'); assert.equal(c.s.routeCalls, 0)
    assert.equal(c.s.balance, STARTER, 'os 21 voltaram'); assert.equal(c.s.ledger.get(c.key()).refunded, true)
  })
  await check('(F) a rota recusa (4xx): a reserva volta', async () => {
    const c = await cenario(overrides, { routeRefuses: true })
    await c.pay()
    assert.equal(c.row().metadata.state, 'failed'); assert.equal(c.s.balance, STARTER)
  })
  await check('(G) Kling 4.0 da promo (0 cr): nada reservado, nada cobrado', async () => {
    const c = await cenario(overrides, { kling4: true })
    await c.pay()
    // o roteiro do Kling 4.0 (30 s) tem régua própria; aqui só importa o dinheiro: nenhuma reserva, nenhum débito
    assert.equal(c.s.ledger.size, 0, 'nada reservado'); assert.equal(c.s.balance, STARTER, 'nada cobrado')
    assert.equal(c.row().metadata.credits_reserve, undefined); assert.notEqual(c.row().metadata.dispatch_engine, 'seedance')
  })
  await check('(H) reservado em Seedance: a promo do Kling 4.0 abrir depois não troca o motor do filme já pago', async () => {
    const c = await cenario(overrides, { flipKling4AfterPay: true })
    await c.pay()
    assert.equal(c.row().metadata.dispatch_engine, 'seedance'); assert.equal(c.s.routeBodies[0]?.engine, 'seedance')
    assert.equal(c.s.balance, STARTER - 21); assert.equal(c.row().metadata.state, 'processing')
  })
  return p
}

// ── as duas regras da rota real em que a reserva se apoia ──────────────────────────────────────────────────────
function fonteConfere() {
  const p = []
  const R = read('app/api/generate-video-cinematic/route.ts')
  const S = read(SERVER)
  if (!R.includes('const billingReference = `cinematic-${cinematicClaimId(user.id, generationId)}`')) p.push('a rota mudou a chave do débito do filme')
  if (!R.includes(".eq('render_id', `cinematic-${cinematicClaimId(userId, generationId)}`)")) p.push('geracaoJaDebitada mudou a chave que procura')
  if (!R.includes('const reconexaoDoMesmoFilme = balance < cost && await geracaoJaDebitada(user.id, generationId)')) p.push('a rota não pula mais o portão de saldo da geração já debitada')
  if (!R.includes('let cost = creditCostForDuration(costQuality, true, duration) + estrelaSobretaxaDe(duration)')) p.push('a rota mudou a conta do custo do filme')
  if (!S.includes('return `cinematic-${cinematicClaimId(userId, generationId)}`')) p.push('a reserva não usa a chave da rota')
  if (!S.includes("export const FILM_COMPLETE_RESERVE_CREDITS = creditCostForDuration('cinematic_ai', true, FILM_COMPLETE_TARGET_SECONDS)")) p.push('o valor reservado não é a conta da rota')
  if (!read('lib/credits/refund.ts').includes('if (orphanError || !orphan) continue // ambíguo → fail closed de verdade')) p.push('a varredura de abandono passou a estornar débito sem claim (a reserva voltaria antes do filme)')
  if (!S.includes("const { debitVideoCredits } = await import('@/lib/credits/debit')") || !S.includes('service: true })')) p.push('a reserva não passa pelo ponto único de débito (serviço)')
  return p
}

const ctx0 = world()
assert.equal(ctx0.service.FILM_COMPLETE_RESERVE_CREDITS, 21, 'o filme da versão completa custa 21 créditos (35 s, cinematic_ai)')
const real = [...await battery(), ...fonteConfere()]
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }

const base = read(SERVER)
const mutantes = [
  ['sem reserva nenhuma', base.replace("  if (!io.reserve) return 'not_wired'\n", "  return 'not_wired'\n")],
  ['reserva numa chave que a rota não conhece', base.replace('billingReference: filmCompleteBillingReference(intent.userId, intent.generationId), cost: FILM_COMPLETE_RESERVE_CREDITS', 'billingReference: `film-complete-${intent.id}`, cost: FILM_COMPLETE_RESERVE_CREDITS')],
  ['falha sem devolver a reserva', base.replace('  if (!io.release) return\n', '  return\n')],
  ['reserva sem gravar o motor', base.replace('dispatch_engine: FILM_COMPLETE_ENGINE, credits_reserved_at:', 'credits_reserved_at:')],
]
let mortos = 0
for (const [nome, fonte] of mutantes) {
  assert.notEqual(fonte, base, 'mutante sem efeito: ' + nome)
  const falhas = await battery({ [SERVER]: fonte })
  if (falhas.length) mortos++
  else console.error('MUTANTE VIVO: ' + nome)
}
assert.equal(mortos, mutantes.length, 'todo mutante tem de derrubar a bateria')
console.log(`PASS reserva do filme completo: gastar 20 entre pagar e começar não tira o filme; 1 cobrança; falha devolve; Kling 4.0 promo sem reserva · ${mortos}/${mutantes.length} mutantes mortos`)
