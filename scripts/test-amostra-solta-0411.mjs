// KINEO-FLUXO2-D-0411 [fundador 04/11: "recomendações"] — guardião: a recusa do plano nunca vira "você já usou sua amostra".
// Executa o controlador real (internalCenaEscolhaFor) e o servidor real da amostra (escolhaSampleServer) sobre um banco em memória que reproduz a RPC da migration
// 20261029204633: 1 reserva por conta, teto do dia, lease conferido. Só verifiedAccount (auth + país) é trocada. Sem rede, sem banco, sem fornecedor.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createEscolhaWorld, escolhaFixture } from './test-ads-escolha-2310.mjs'

const ROOT = 'lib/ads/cena/', SERVER = ROOT + 'escolhaSampleServer.ts', CORE = ROOT + 'internalEscolha.ts', UI = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const USER = { id: '10000000-0000-4000-8000-000000000001', email: 'external@example.org' }
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const ERRADO = { scenario_id: 'footwear_beach', category: 'footwear' } // o classificador do mundo diz skincare
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const servidorReal = (texto) => {
  const trocado = texto.replace(/async function verifiedAccount[\s\S]*?\n}\n/, "async function verifiedAccount() { return { email: 'external@example.org' } }\n")
  assert.notEqual(trocado, texto, 'verifiedAccount precisa existir')
  return trocado
}

function mundo(mutar = {}, { moderate = async () => ({ ok: true }) } = {}) {
  const over = { [SERVER]: servidorReal(mutar[SERVER] ? mutar[SERVER](ler(SERVER)) : ler(SERVER)) }
  if (mutar[CORE]) over[CORE] = mutar[CORE](ler(CORE))
  const dia = { reserved: 0, samples: 0 }
  let reservas = 0
  const w = createEscolhaWorld(over, { current: true, user: USER, ownerId: USER.id, reason: 'none', plan: 'free', balance: 0,
    rpc: async (name, a) => {
      if (name !== 'reserve_ads_escolha_sample') return { data: { code: 'ok' }, error: null }
      reservas++
      const pedido = w.tables.ads_v2_orders.find((o) => o.id === a.p_order_id && o.user_id === a.p_owner_id)
      if (!pedido || pedido.status !== 'planned' || pedido.assembly_lease_at !== a.p_lease_at || pedido.plan?.cena?.plan?.escolha?.sample !== 'KINEO-AMOSTRA-ANUNCIO-2410') return { data: { code: 'ads_sample_unavailable' }, error: null }
      const estimate = pedido.plan.cena.route === 'kling4' ? 186 : 150
      const claim = (w.tables.ads_escolha_samples ??= []).find((c) => c.actor_id === a.p_actor_id)
      if (claim) return { data: { code: claim.order_id === a.p_order_id ? 'ok' : 'ads_sample_used', estimate_cents: estimate }, error: null }
      if (dia.reserved + estimate > 2500) return { data: { code: 'ads_sample_cap' }, error: null }
      w.tables.ads_escolha_samples.push({ actor_id: a.p_actor_id, owner_id: a.p_owner_id, order_id: a.p_order_id, delivered_at: null })
      dia.reserved += estimate; dia.samples += 1
      return { data: { code: 'ok', estimate_cents: estimate }, error: null }
    } })
  w.tables.ads_escolha_samples = []
  let agora = Date.parse('2026-11-04T22:00:00.000Z')
  let proximoId = 1
  const inserirOriginal = w.admin.from.bind(w.admin)
  w.admin.from = (tabela) => {
    const q = inserirOriginal(tabela)
    if (tabela !== 'ads_v2_orders') return q
    const insert = q.insert
    q.insert = (v) => insert({ ...v, id: `20000000-0000-4000-8000-${String(proximoId++).padStart(12, '0')}` })
    return q
  }
  const plano = async (extra = {}) => {
    const { internalCenaEscolhaFor } = w.load(CORE)
    const r = await internalCenaEscolhaFor(USER, { ...escolhaFixture(), sample: true, ...extra }, { json: w.json, admin: w.admin, sampleMode: true, access: { reason: 'none', ownerId: USER.id, admin: w.admin }, moderate, start: async () => { throw new Error('nao inicia') }, now: () => agora })
    return { status: r.status, body: await r.json() }
  }
  return { w, plano, dia, reservas: () => reservas, passa: (ms) => { agora += ms; return agora } }
}

/** A prova. Devolve o que está errado; os mutantes rodam a mesma prova. */
async function prova(mutar = {}) {
  const erros = []
  const exige = (c, m) => { if (!c) erros.push(m) }
  const semFotoNemCredito = (w) => !w.effects.some((e) => e[0] === 'queue' || e[0] === 'debit')

  // 1. a recusa não prende: tenta de novo na hora, na mesma semente, com a mesma reserva
  const a = mundo(mutar)
  const r1 = await a.plano(ERRADO)
  exige(r1.status === 400 && r1.body.error === 'escolha_scenario_category_mismatch', '1 a recusa de categoria segue existindo')
  exige(a.dia.reserved > 0 && a.w.tables.ads_escolha_samples.length === 1, '1 a reserva foi feita antes do plano, como sempre')
  const r2 = await a.plano(ERRADO)
  exige(r2.body.error === 'escolha_scenario_category_mismatch', '1 segunda tentativa na hora: a mesma recusa, nunca "já usou"')
  const gasto = a.dia.reserved
  const r3 = await a.plano()
  exige(r3.status === 201 && !!r3.body.order_id, '1 categoria certa: o plano sai na hora')
  exige(a.w.tables.ads_v2_orders.length === 1 && r3.body.order_id === a.w.tables.ads_v2_orders[0].id, '1 a mesma semente: nenhum pedido novo a cada tentativa')
  exige(a.reservas() === 1, '1 a reserva não é refeita')
  exige(a.dia.reserved === gasto && a.dia.samples === 1, '1 o teto do dia não anda com as tentativas')
  exige(semFotoNemCredito(a.w), '1 nenhuma foto e nenhum crédito até aqui')
  exige(a.w.effects.some((e) => e[0] === 'event' && e[1].name === 'ads_sample_seed_released'), '1 a soltura deixa rastro')

  // 2. 1 amostra por conta: depois do plano gravado, acabou de verdade
  const r4 = await a.plano()
  exige(r4.body.error === 'ads_sample_used' && r4.status === 409, '2 com o plano gravado, "já usou" é verdade')
  exige(a.w.tables.ads_escolha_samples.length === 1 && a.dia.samples === 1, '2 segue 1 reserva por conta')
  const gravado = () => a.w.tables.ads_v2_orders.find((o) => o.id === r3.body.order_id)
  const antes = gravado()?.assembly_lease_at
  await a.plano(ERRADO)
  exige(gravado()?.assembly_lease_at === antes, '2 uma recusa depois não mexe no pedido gravado')

  // 3. moderação também solta, e o roteiro que falha também
  const m = mundo(mutar, { moderate: async () => ({ ok: false, reason: 'blocked', categories: [] }) })
  const r5 = await m.plano()
  exige(r5.status >= 400 && r5.body.error !== 'ads_sample_used', '3 moderação recusa')
  const r6 = await m.plano()
  exige(r6.body.error !== 'ads_sample_used' && r6.body.error !== 'ads_sample_plan_wait', '3 moderação: tentar de novo não diz "já usou" nem manda esperar')

  // 4. o teto das solturas: não dá para gastar texto sem fim, e mesmo assim a frase é a verdadeira
  const t = mundo(mutar)
  for (let i = 0; i < 6; i++) await t.plano(ERRADO)
  const r7 = await t.plano(ERRADO)
  exige(r7.status === 429 && r7.body.error === 'ads_sample_plan_wait' && r7.body.retry_after_seconds > 0 && r7.body.retry_after_seconds <= 300, '4 passou do teto: espera com o tempo certo, nunca "já usou"')
  const pedidos = t.w.tables.ads_v2_orders.length
  await t.plano(ERRADO)
  exige(t.w.tables.ads_v2_orders.length === pedidos && pedidos === 1, '4 esperando não cria pedido solto')
  t.passa(5 * 60_000)
  const r8 = await t.plano()
  exige(r8.status === 201, '4 passados os 5 min, a régua de sempre devolve a amostra')
  exige(t.dia.samples === 1 && t.reservas() === 1, '4 segue 1 reserva')

  // 5. semente em curso de verdade (duas abas, função que morreu)
  const c = mundo(mutar)
  const r9 = await c.plano(ERRADO)
  exige(r9.status === 400, '5 base da semente')
  const semente = c.w.tables.ads_v2_orders[0]
  semente.assembly_lease_at = new Date(Date.parse('2026-11-04T22:00:00.000Z') - 60_000).toISOString() // ninguém soltou: lease de 1 min
  const r10 = await c.plano()
  exige(r10.status === 429 && r10.body.error === 'ads_sample_plan_wait' && r10.body.retry_after_seconds === 240, '5 semente em curso diz quanto falta')
  exige(c.w.tables.ads_v2_orders.length === 1 && c.reservas() === 1, '5 sem pedido novo nem reserva nova')

  // 5b. a soltura só vale para quem ainda segura o lease, e só para semente sem plano
  const s = mundo(mutar)
  const { soltarSementeDaAmostra } = s.w.load(SERVER)
  await s.plano(ERRADO)
  const sem = s.w.tables.ads_v2_orders[0]
  const LEASE = '2026-11-04T23:00:00.000Z'
  sem.assembly_lease_at = LEASE // outra aba retomou
  const velha = await soltarSementeDaAmostra(s.w.admin, { orderId: sem.id, ownerId: USER.id, lease: '2026-11-04T23:30:00.000Z' })
  exige(velha === false && sem.assembly_lease_at === LEASE, '5b lease velho não solta a semente de quem retomou')
  const dona = await soltarSementeDaAmostra(s.w.admin, { orderId: sem.id, ownerId: USER.id, lease: LEASE })
  exige(dona === true && Date.parse(sem.assembly_lease_at) === Date.parse(LEASE) - 5 * 60_000, '5b quem segura o lease solta, envelhecendo 5 min')
  sem.assembly_lease_at = LEASE; sem.plan = { cena: { plan: { escolha: { sample: 'x' }, script: { narration: 'pronto' } } }, escolhaFlow: {}, narration: 'pronto' }
  const comPlano = await soltarSementeDaAmostra(s.w.admin, { orderId: sem.id, ownerId: USER.id, lease: LEASE })
  exige(comPlano === false && sem.assembly_lease_at === LEASE, '5b pedido com plano gravado nunca é solto')
  sem.plan = { cena: { plan: { escolha: { sample: 'x' } } } }; sem.status = 'generating'
  exige(await soltarSementeDaAmostra(s.w.admin, { orderId: sem.id, ownerId: USER.id, lease: LEASE }) === false, '5b pedido em andamento nunca é solto')
  sem.status = 'planned'; sem.credits_charged = 5
  exige(await soltarSementeDaAmostra(s.w.admin, { orderId: sem.id, ownerId: USER.id, lease: LEASE }) === false, '5b pedido com crédito debitado nunca é solto')

  // 6. conta paga (sem amostra) não passa por nada disso
  const p = mundo(mutar)
  const { internalCenaEscolhaFor } = p.w.load(CORE)
  const rp = await internalCenaEscolhaFor(USER, { ...escolhaFixture(), ...ERRADO }, { json: p.w.json, admin: p.w.admin, sampleMode: false, access: { reason: 'subscriber', ownerId: USER.id, admin: p.w.admin }, moderate: async () => ({ ok: true }), start: async () => { throw new Error('nao inicia') }, now: () => 0 })
  const corpo = await rp.json()
  exige(corpo.error === 'escolha_scenario_category_mismatch' && p.w.tables.ads_v2_orders.length === 0 && p.reservas() === 0, '6 plano pago recusado: sem semente, sem reserva')
  return erros
}

const erros = await prova()
for (const e of erros) checa(e, false)
checa('a prova inteira passa', erros.length === 0)

// A tela: a frase certa em cada caso
const fonte = ler(UI)
checa('a tela tem a frase de esperar, nas 3 línguas', fonte.includes("code === 'ads_sample_plan_wait'") && fonte.includes('Try again in ${minutos}') && fonte.includes('Tente de novo em ${minutos}') && fonte.includes('Inténtalo de nuevo en ${minutos}'))
checa('a tabela de recusas conhece o código nas 3 línguas', (ler('lib/ads/eligibilityPure.ts').match(/ads_sample_plan_wait: \{/g) ?? []).length === 3)
checa('a migration não mudou: o papel do servidor segue sem DELETE no livro-razão', ler('supabase/migrations/20261024175246_ads_escolha_sample.sql').includes('DELETE and TRUNCATE are not granted'))
checa('o servidor não apaga nem devolve reserva', !/from\(TABLE\)\.(delete|update)|reserved_cents/.test(ler(SERVER).replace(/^.*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))

const MUTANTES = [
  ['recusa de categoria não solta', { [CORE]: (t) => t.replace("} catch (e) { await soltar(e instanceof Error ? e.message : 'cena_plan_failed'); throw e }", '} catch (e) { throw e }') }, /"já usou"|plano sai/],
  ['moderação não solta', { [CORE]: (t) => t.replace('if (first) { await soltar(first.error); return', 'if (first) { return') }, /moderação: tentar/],
  ['sem esperar: volta a frase falsa', { [CORE]: (t) => t.replace("if (espera !== null) return v2Fail('ads_sample_plan_wait', 429, { retry_after_seconds: Math.ceil(espera / 1000) })", '') }, /nunca "já usou"|quanto falta/],
  ['sem teto de solturas', { [SERVER]: (t) => t.replace('solturas >= AMOSTRA_SOLTURAS_MAX', 'false') }, /passou do teto/],
  ['soltar sem conferir o lease', { [SERVER]: (t) => t.replace(".eq('status', 'planned').eq('assembly_lease_at', i.lease).select('id')", ".eq('status', 'planned').select('id')").replace(".eq('user_id', i.ownerId).eq('assembly_lease_at', i.lease).maybeSingle()", ".eq('user_id', i.ownerId).maybeSingle()") }, /lease velho/],
  ['soltar pedido com plano gravado', { [SERVER]: (t) => t.replace("order.status !== 'planned' || !pedidoDeAmostraSemPlano(order, lease + AMOSTRA_SEMENTE_PARADA_MS)", "order.status !== 'planned'") }, /plano gravado nunca/],
  ['soltar pedido em andamento', { [SERVER]: (t) => t.replace("order.status !== 'planned' || !pedidoDeAmostraSemPlano(order, lease + AMOSTRA_SEMENTE_PARADA_MS)", '!pedidoDeAmostraSemPlano({ ...order, status: \'planned\' }, lease + AMOSTRA_SEMENTE_PARADA_MS)').replace(".eq('user_id', i.ownerId).eq('status', 'planned').eq('assembly_lease_at', i.lease).select('id')", ".eq('user_id', i.ownerId).eq('assembly_lease_at', i.lease).select('id')") }, /em andamento nunca/],
  ['cada recusa reserva de novo', { [CORE]: (t) => t.replace('const parada = await amostraSemPlano(d.admin, user.id, now())', 'const parada = null as null | { orderId: string; lease: string | null }') }, /nunca "já usou"|mesma semente|plano sai/],
]
for (const [nome, mutar, esperado] of MUTANTES) {
  const mudou = Object.entries(mutar).every(([f, fn]) => fn(ler(f)) !== ler(f))
  let r = []
  try { r = await prova(mutar) } catch (e) { r = ['estourou: ' + e.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 400))
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => esperado.test(m)))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
