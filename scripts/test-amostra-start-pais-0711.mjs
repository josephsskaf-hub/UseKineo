// KINEO-AMOSTRA-START-PAIS-0711 [aval permanente do fundador 01/11 (laço do revisor)] — guardião: o INÍCIO da amostra grátis de
// anúncio recebe o país do PEDIDO (x-vercel-ip-country), a mesma régua que as etapas plan/stills já usavam.
//
// CASO REAL (05/11/2026 14:04–14:08 UTC, Supabase só leitura): user 6be0bbc0-9cd8-41b6-8824-68fa5236f58a, 1º uso, veio do ChatGPT,
// perfil com signup_country e last_country NULL, e-mail confirmado, país do pedido BR. ads_escolha_plan → ads_escolha_stills_ready
// (2 fotos) → ads_escolha_chosen → NADA: o pedido f9fbd513 ficou 'planned'/'chosen' para sempre e a porta passou a dizer
// free_sample_used. Causa: lib/ads/v2StartCore.ts chamava escolhaSampleAccountOk(admin, user.id) SEM o país do pedido; com o
// perfil sem país, loadAdsSampleCountry devolve null e adsSampleCountryAllowed(null) = false (fail-closed) → 403
// 'ads_sample_account_blocked' depois de a conta ter passado em plan e stills pela MESMA função com o país.
//
// Executa o código REAL: rota pública app/api/ads/v2/cena/route.ts (plan → stills → choose → render), rota /api/ads/v2/start,
// controlador internalCenaEscolhaFor, escolhaSampleServer (verifiedAccount REAL: auth + antifarm + país), eligibility.ts
// (loadAdsSampleCountry REAL), eligibilityPure.ts e adsV2StartFor — sobre o mundo em memória de test-ads-escolha-2310.mjs.
// Só auth.admin.getUserById (e-mail confirmado ou não) e a RPC da reserva são do mundo. Sem rede, sem banco, sem fornecedor.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createEscolhaWorld, escolhaFixture } from './test-ads-escolha-2310.mjs'

const CORE = 'lib/ads/v2StartCore.ts', ROTA_CENA = 'app/api/ads/v2/cena/route.ts', ROTA_START = 'app/api/ads/v2/start/route.ts'
const CTRL = 'lib/ads/cena/internalEscolha.ts', ELIG = 'lib/ads/eligibility.ts', PURE = 'lib/ads/eligibilityPure.ts', PAISES = 'lib/freeFilmPolicy.ts'
const BASE = '819e90ac854041c2dad7303a38033e463ac9069e' // origin/main antes deste conserto
const USER = { id: '6be0bbc0-9cd8-41b6-8824-68fa5236f58a', email: 'cliente.br.0511@gmail.com' } // o id do caso real; e-mail fictício não descartável
const CASA = { id: '00000000-0000-4000-8000-000000000001', email: 'josephsskaf@gmail.com' } // conta interna = caminho PAGO
const CONFIRMADO = '2026-11-05T13:50:00.000Z'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const sha = (t) => createHash('sha256').update(lf(t)).digest('hex')
const semTempo = (x) => JSON.stringify(x).replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<t>').replace(/\b1[6-9]\d{11}\b/g, '<ms>') // o relógio (ISO e epoch ms) é a única coisa que pode diferir entre dois mundos
const ondeDifere = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(Math.max(0, i - 60), i + 80) + ' ≠ ' + b.slice(Math.max(0, i - 60), i + 80) }
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

// ─── O conserto, como texto exato (desfazer devolve a base byte a byte; na base, nada muda) ────────────────────────────────────
const HUNKS = {
  [CORE]: [
    { before: "dependencies: { moderate?: typeof moderateContent; escolhaPersonal?: boolean } = {}): Promise<NextResponse> { // KINEO-ADS-CENA-95-PACING-2110 — server-only DI; request bodies cannot supply it.",
      after: "dependencies: { moderate?: typeof moderateContent; escolhaPersonal?: boolean; sampleCountry?: string | null } = {}): Promise<NextResponse> { // KINEO-ADS-CENA-95-PACING-2110 — server-only DI; request bodies cannot supply it. // KINEO-AMOSTRA-START-PAIS-0711 — sampleCountry = o país do PEDIDO (x-vercel-ip-country), lido pela rota, usado só na conta da amostra." },
    { before: "      if (uid !== user.id || !await escolhaSampleAccountOk(admin, user.id)) return v2Fail('ads_sample_account_blocked', 403)\n",
      after: "      if (uid !== user.id || !await escolhaSampleAccountOk(admin, user.id, dependencies.sampleCountry ?? null)) return v2Fail('ads_sample_account_blocked', 403) // KINEO-AMOSTRA-START-PAIS-0711 — a mesma régua de país de plan/stills (internalEscolha.ts): sem o país do pedido, o perfil sem país passava lá e era recusado aqui. Caso real: 6be0bbc0 (BR, 05/11)\n" },
  ],
  [ROTA_CENA]: [
    { before: "Date.now(), { moderate, escolhaPersonal: personal }),\n",
      after: "Date.now(), { moderate, escolhaPersonal: personal, sampleCountry: paisDoRequest(req.headers) }), // KINEO-AMOSTRA-START-PAIS-0711 — o início da amostra recebe o mesmo país do pedido que plan/stills\n" },
  ],
  [ROTA_START]: [
    { before: "import { isEscolhaPersonalOrder } from '@/lib/ads/cena/escolhaPersonalAccess'\n",
      after: "import { isEscolhaPersonalOrder } from '@/lib/ads/cena/escolhaPersonalAccess'\nimport { paisDoRequest } from '@/lib/freeFilmPolicy' // KINEO-AMOSTRA-START-PAIS-0711 — o país do pedido para a conta da amostra pessoal\n" },
    { before: "    return await adsV2StartFor(user, access, async () => body, started, { escolhaPersonal })\n",
      after: "    return await adsV2StartFor(user, access, async () => body, started, { escolhaPersonal, sampleCountry: paisDoRequest(req.headers) }) // KINEO-AMOSTRA-START-PAIS-0711 — a mesma régua de país da rota da cena\n" },
  ],
}
/** O texto de hoje sem este conserto. Na base (sem os trechos) devolve o mesmo texto. */
function semAmostraStartPais0711(texto, arquivo) {
  let r = lf(texto)
  for (const h of HUNKS[arquivo] ?? []) { const n = r.split(h.after).length - 1; if (n > 1) throw Error('trecho ambíguo ' + arquivo); if (n === 1) r = r.replace(h.after, () => h.before) }
  return r
}
const consertoNoTexto = (arquivo) => (HUNKS[arquivo] ?? []).every((h) => ler(arquivo).includes(h.after))

// ─── O mundo: a rota real, o controlador real, o servidor da amostra real; só auth e a RPC da reserva em memória ───────────────
function mundo(mutar = {}, { pais = 'BR', perfil = {}, confirmado = true, user = USER, pago = false, moderate } = {}) {
  const over = {}
  for (const [arquivo, f] of Object.entries(mutar)) over[arquivo] = f(ler(arquivo))
  const dia = { reserved: 0 }
  const w = createEscolhaWorld(over, {
    current: true, user, ownerId: user.id, reason: pago ? 'internal' : 'none', plan: pago ? 'pro' : 'free', balance: pago ? 1000 : 10,
    rpc: async (name, a) => {
      if (name !== 'reserve_ads_escolha_sample') return { data: { code: 'ok' }, error: null }
      const pedido = w.tables.ads_v2_orders.find((o) => o.id === a.p_order_id && o.user_id === a.p_owner_id)
      if (!pedido || pedido.status !== 'planned' || pedido.plan?.cena?.plan?.escolha?.sample !== 'KINEO-AMOSTRA-ANUNCIO-2410') return { data: { code: 'ads_sample_unavailable' }, error: null }
      const estimate = pedido.plan.cena.route === 'kling4' ? 186 : 150
      const claim = (w.tables.ads_escolha_samples ??= []).find((c) => c.actor_id === a.p_actor_id)
      if (claim) return { data: { code: claim.order_id === a.p_order_id ? 'ok' : 'ads_sample_used', estimate_cents: estimate }, error: null }
      if (dia.reserved + estimate > 2500) return { data: { code: 'ads_sample_cap' }, error: null }
      w.tables.ads_escolha_samples.push({ actor_id: a.p_actor_id, owner_id: a.p_owner_id, order_id: a.p_order_id, estimate_cents: estimate, delivered_at: null })
      dia.reserved += estimate
      return { data: { code: 'ok', estimate_cents: estimate }, error: null }
    },
  })
  w.tables.ads_escolha_samples = []
  // O perfil REAL do caso: plan free, 10 créditos, signup_country e last_country NULL (sobrescrevível pelos controles).
  Object.assign(w.tables.profiles[0], { trial_status: null, signup_country: null, last_country: null, ...perfil })
  const estado = { confirmado }
  w.admin.auth = { admin: { getUserById: async (id) => id === user.id
    ? { data: { user: { id, email: user.email, email_confirmed_at: estado.confirmado ? CONFIRMADO : null } }, error: null }
    : { data: { user: null }, error: { message: 'not found' } } } }
  const req = (body, p) => ({ json: async () => JSON.parse(JSON.stringify(body)), headers: { get: (n) => String(n).toLowerCase() === 'x-vercel-ip-country' ? p : null }, nextUrl: { searchParams: { get: () => null } } })
  const post = async (rota, body, p = pais) => { const r = await w.load(rota).POST(req(body, p)); return { status: r.status, body: await r.json() } }
  const cena = (body, p) => post(ROTA_CENA, body, p)
  const start = (body, p) => post(ROTA_START, body, p)
  const pedido = () => w.tables.ads_v2_orders[0] ?? {}
  /** plan → stills (até 'choose') → choose, com o país `p` em todos os pedidos. Devolve o still escolhido. */
  const ateEscolha = async (p = pais) => {
    const plan = await cena({ ...escolhaFixture(), ...(pago ? {} : { sample: true }) }, p)
    if (plan.status !== 201) return { plan }
    let stills
    for (let i = 0; i < 6; i++) { stills = await cena({ stage: 'stills', order_id: plan.body.order_id }, p); if (stills.body.stage === 'choose' || stills.status >= 400) break }
    if (!stills.body.stills?.length) return { plan, stills }
    const still = stills.body.stills[0]
    const choose = await cena({ stage: 'choose', order_id: plan.body.order_id, still_id: still.id }, p)
    return { plan, stills, choose, still, id: plan.body.order_id }
  }
  const render = (id, still, p = pais) => cena({ stage: 'render', order_id: id, still_id: still?.id }, p)
  const debitos = () => w.effects.filter((e) => e[0] === 'debit').length
  const eventos = () => w.effects.filter((e) => e[0] === 'event').map((e) => e[1].name)
  return { w, cena, start, ateEscolha, render, pedido, debitos, eventos, estado, dia }
}

// ─── A prova (os mutantes rodam a mesma) ──────────────────────────────────────────────────────────────────────────────────────
async function prova(mutar = {}) {
  const erros = []
  const exige = (c, m) => { if (!c) erros.push(m) }
  const iniciou = (m, r) => r.status === 202 && m.pedido().status === 'generating' && m.pedido().credits_charged === 0 && /^adssample-escolha-/.test(m.pedido().billing_ref) && m.debitos() === 0
  const bloqueado = (m, r) => r.status === 403 && r.body.error === 'ads_sample_account_blocked' && m.pedido().status === 'planned' && m.pedido().generation_id == null && m.debitos() === 0

  // 1. O CASO REAL: perfil NULL/NULL, e-mail confirmado, país do pedido BR, plano gravado, 2 fotos, escolha feita → o início SAI.
  const a = mundo(mutar)
  const f = await a.ateEscolha()
  exige(f.plan?.status === 201 && f.plan.body.sample === true && f.plan.body.credits === 0, '1 plan: a conta passa pela régua de país com o país do pedido (como hoje) ' + JSON.stringify(f.plan))
  exige(f.stills?.body.stage === 'choose' && f.stills.body.stills.length === 2, '1 stills: 2 fotos prontas (como hoje) ' + JSON.stringify(f.stills?.body?.stage))
  exige(f.choose?.status === 200 && a.pedido().plan?.escolhaFlow?.stage === 'chosen', '1 choose: escolha feita, pedido planned/chosen (como hoje)')
  const r1 = await a.render(f.id, f.still)
  exige(iniciou(a, r1), `1 render: o início da amostra ACEITA a conta pelo país do pedido (BR) — veio ${r1.status} ${r1.body.error ?? ''} · pedido ${a.pedido().status}/${a.pedido().plan?.escolhaFlow?.stage} generation_id=${a.pedido().generation_id ?? 'null'} (o caso real parou aqui)`)
  exige(a.eventos().includes('ads_escolha_render_started') && a.eventos().includes('ads_cena_started'), '1 render: deixa o rastro ads_escolha_render_started + ads_cena_started')
  exige(a.w.tables.ads_escolha_samples.length === 1 && a.dia.reserved === 150, '1 uma reserva só, como sempre')

  // 2. FAIL-CLOSED INTACTO no início: a escolha foi feita com BR, mas o pedido de início vem sem país ou com país fora da lista.
  for (const [nome, p] of [['ausente', null], ['fora da lista (IN)', 'IN'], ['lixo (Brasil)', 'Brasil'], ['XX', 'XX'], ['T1', 'T1'], ['vazio', '']]) {
    const b = mundo(mutar)
    const g = await b.ateEscolha('BR')
    exige(g.choose?.status === 200, '2 base da escolha com BR ' + nome)
    const r = await b.render(g.id, g.still, p)
    exige(bloqueado(b, r), `2 início com país ${nome} e perfil sem país → recusado, pedido intacto (veio ${r.status} ${r.body.error ?? ''})`)
    const depois = await b.render(g.id, g.still, 'BR')
    exige(iniciou(b, depois), '2 o mesmo pedido, com o país certo, sai em seguida (nada foi queimado) ' + nome)
  }
  // 2b. A porta também segue fechada: header ausente + perfil sem país não passa nem do plan (como hoje).
  const b2 = mundo(mutar, { pais: null })
  const g2 = await b2.ateEscolha()
  exige(g2.plan.status === 403 && g2.plan.body.error === 'ads_sample_account_blocked' && b2.w.tables.ads_v2_orders.length === 0, '2b plan sem país e sem perfil → recusado antes de qualquer semente (como hoje)')

  // 3. PERFIL COM PAÍS, header ausente → aceito do começo ao fim (como hoje).
  const c = mundo(mutar, { pais: null, perfil: { signup_country: 'BR' } })
  const h = await c.ateEscolha()
  const r3 = await c.render(h.id, h.still)
  exige(h.choose?.status === 200 && iniciou(c, r3), '3 signup_country BR e header ausente → plan, stills, choose e início aceitos (como hoje) ' + JSON.stringify(r3.body.error ?? r3.status))
  // 3b. A ordem dos sinais é a de sempre: o país do PEDIDO decide antes do perfil.
  const c2 = mundo(mutar, { pais: 'BR', perfil: { signup_country: 'IN' } })
  const h2 = await c2.ateEscolha()
  exige(h2.choose?.status === 200 && iniciou(c2, await c2.render(h2.id, h2.still)), '3b pedido BR com signup_country IN → o pedido decide (requestCountry → last_country → signup_country)')
  const c3 = mundo(mutar, { pais: 'IN', perfil: { signup_country: 'BR' } })
  const h3 = await c3.ateEscolha()
  exige(h3.plan.status === 403 && h3.plan.body.error === 'ads_sample_account_blocked', '3b pedido IN com signup_country BR → o pedido decide também na recusa (como hoje)')

  // 4. E-MAIL NÃO CONFIRMADO → recusado como hoje, na porta e no início.
  const d = mundo(mutar, { confirmado: false })
  const i = await d.ateEscolha()
  exige(i.plan.status === 403 && i.plan.body.error === 'ads_sample_account_blocked', '4 e-mail não confirmado: plan recusado (como hoje)')
  const d2 = mundo(mutar)
  const i2 = await d2.ateEscolha()
  d2.estado.confirmado = false
  exige(i2.choose?.status === 200 && bloqueado(d2, await d2.render(i2.id, i2.still)), '4 e-mail que deixou de estar confirmado: início recusado (como hoje)')

  // 5. /api/ads/v2/start com escolhaPersonal recebe o MESMO país (universalizar: as duas portas, uma régua).
  const e = mundo(mutar)
  const j = await e.ateEscolha()
  exige(j.choose?.status === 200, '5 base da escolha')
  const sem = await e.start({ order_id: j.id }, null)
  exige(bloqueado(e, sem), `5 /api/ads/v2/start sem país e perfil sem país → recusado (veio ${sem.status} ${sem.body.error ?? ''})`)
  const com = await e.start({ order_id: j.id }, 'BR')
  exige(iniciou(e, com), `5 /api/ads/v2/start com o país do pedido BR → o início sai (veio ${com.status} ${com.body.error ?? ''})`)

  // 6. País em minúsculas e outro país da lista: a régua é a lista PAISES_FILME_GRATIS, não "BR".
  for (const [p, nome] of [['br', 'minúsculas br'], ['DE', 'Alemanha'], ['ES', 'Espanha (caso 2)'], ['US', 'EUA']]) {
    const k = mundo(mutar, { pais: p })
    const l = await k.ateEscolha()
    exige(l.choose?.status === 200 && iniciou(k, await k.render(l.id, l.still)), `6 país do pedido ${nome} → aceito do plan ao início`)
  }

  // 7. O CAMINHO PAGO (conta interna, sem amostra) sai IGUAL com e sem o conserto: mesma resposta, mesmos efeitos, mesma tabela.
  const pagoAgora = mundo(mutar, { pago: true, user: CASA })
  const pagoSem = mundo({ ...mutar, [CORE]: (t) => semAmostraStartPais0711(mutar[CORE] ? mutar[CORE](t) : t, CORE), [ROTA_CENA]: (t) => semAmostraStartPais0711(mutar[ROTA_CENA] ? mutar[ROTA_CENA](t) : t, ROTA_CENA), [ROTA_START]: (t) => semAmostraStartPais0711(mutar[ROTA_START] ? mutar[ROTA_START](t) : t, ROTA_START) }, { pago: true, user: CASA })
  const resultado = async (m) => { const x = await m.ateEscolha(); const r = await m.render(x.id, x.still); return { plan: [x.plan.status, x.plan.body.engine_used, x.plan.body.credits, x.plan.body.sample ?? null], choose: x.choose?.status, render: [r.status, r.body], efeitos: m.w.effects, tabela: m.w.tables.ads_v2_orders, reservas: m.w.tables.ads_escolha_samples } }
  const [ra, rs] = [await resultado(pagoAgora), await resultado(pagoSem)]
  exige(ra.render[0] === 202 && ra.render[1].credits === 41 && ra.plan[3] === null && pagoAgora.debitos() === 1 && pagoAgora.w.tables.ads_escolha_samples.length === 0, '7 pago: 41 créditos debitados, sem reserva de amostra ' + JSON.stringify(ra.render))
  exige(semTempo(ra) === semTempo(rs), '7 pago: resposta, efeitos e tabela IGUAIS com e sem o conserto (byte a byte, fora o relógio)' + (semTempo(ra) === semTempo(rs) ? '' : ' · difere em: ' + ondeDifere(semTempo(ra), semTempo(rs))))
  return erros
}

// ─── 1) a prova no código de hoje ─────────────────────────────────────────────────────────────────────────────────────────────
console.log('prova no código de hoje')
for (const e of await prova()) checa(e, false)
if (falhas === 0) checa('prova completa: caso real, fail-closed, perfil com país, e-mail, /start, lista de países, caminho pago', true)

// ─── 2) o texto: o conserto está nos 3 arquivos, é exatamente estes trechos, e desfazê-lo devolve a base byte a byte ──────────
console.log('texto')
checa('núcleo: escolhaSampleAccountOk da amostra recebe dependencies.sampleCountry (uma linha, só na conta da amostra)', consertoNoTexto(CORE) && (ler(CORE).match(/dependencies\.sampleCountry/g) ?? []).length === 1)
checa('rota da cena: start passa sampleCountry: paisDoRequest(req.headers), o mesmo que já dava ao controlador', consertoNoTexto(ROTA_CENA) && (ler(ROTA_CENA).match(/sampleCountry: paisDoRequest\(req\.headers\)/g) ?? []).length === 2)
checa('rota /start: passa sampleCountry: paisDoRequest(req.headers) ao núcleo', consertoNoTexto(ROTA_START))
checa('controlador intocado: as etapas plan/stills seguem com d.sampleCountry (a régua já era essa)', /escolhaSampleAccountOkPais\(admin, actorId, d\.sampleCountry \?\? null\)/.test(ler(CTRL)))
checa('eligibility intocado: requestCountry → last_country → signup_country', /adsSampleCountry\(\[requestCountry, prof\.error \? null : row\?\.last_country, prof\.error \? null : row\?\.signup_country\]\)/.test(ler(ELIG)))
for (const arquivo of [CORE, ROTA_CENA, ROTA_START]) {
  let base = null
  try { base = execFileSync('git', ['show', `${BASE}:${arquivo}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }) } catch { base = null }
  if (base === null) { console.log('  (sem git: pulo a comparação com a base em ' + arquivo + ')'); continue }
  checa(`desfazer o conserto em ${arquivo} devolve a base ${BASE.slice(0, 7)} byte a byte`, sha(semAmostraStartPais0711(ler(arquivo), arquivo)) === sha(base))
  const linhasBase = lf(base).split('\n'), linhasHoje = ler(arquivo).split('\n')
  const novas = linhasHoje.filter((l) => !linhasBase.includes(l)).length, sumidas = linhasBase.filter((l) => !linhasHoje.includes(l)).length
  const esperado = HUNKS[arquivo].reduce((n, h) => n + h.after.split('\n').filter(Boolean).length, 0)
  checa(`${arquivo}: só ${esperado} linha(s) nova(s)/trocada(s), nenhuma outra`, novas <= esperado && sumidas <= esperado)
}

// ─── 3) mutantes: cada um tem de derrubar a prova ────────────────────────────────────────────────────────────────────────────
console.log('mutantes')
const troca = (arquivo, de, para) => (t) => { const n = t.split(de).length - 1; assert.equal(n, 1, `âncora única em ${arquivo}: ${de.slice(0, 60)}`); return t.replace(de, () => para) }
const MUTANTES = [
  ['núcleo sem o país (volta ao texto da base na linha da amostra)', { [CORE]: troca(CORE, 'escolhaSampleAccountOk(admin, user.id, dependencies.sampleCountry ?? null)', 'escolhaSampleAccountOk(admin, user.id)') }],
  ['rota da cena não passa o país ao start', { [ROTA_CENA]: troca(ROTA_CENA, 'escolhaPersonal: personal, sampleCountry: paisDoRequest(req.headers)', 'escolhaPersonal: personal') }],
  ['rota /start não passa o país', { [ROTA_START]: troca(ROTA_START, '{ escolhaPersonal, sampleCountry: paisDoRequest(req.headers) }', '{ escolhaPersonal }') }],
  ['núcleo inventa BR quando o pedido não tem país (fail-open)', { [CORE]: troca(CORE, 'dependencies.sampleCountry ?? null', "dependencies.sampleCountry ?? 'BR'") }],
  ['régua pura aceita país desconhecido (fail-open)', { [PURE]: troca(PURE, 'return c !== null && PAISES_FILME_GRATIS.includes(c)', 'return c === null || PAISES_FILME_GRATIS.includes(c)') }],
  ['ordem dos sinais invertida (perfil antes do pedido)', { [ELIG]: troca(ELIG, 'adsSampleCountry([requestCountry, prof.error ? null : row?.last_country, prof.error ? null : row?.signup_country])', 'adsSampleCountry([prof.error ? null : row?.signup_country, prof.error ? null : row?.last_country, requestCountry])') }],
  ['controlador inventa BR na porta', { [CTRL]: troca(CTRL, 'escolhaSampleAccountOkPais(admin, actorId, d.sampleCountry ?? null)', "escolhaSampleAccountOkPais(admin, actorId, d.sampleCountry ?? 'BR')") }],
  ['país do pedido sem normalizar maiúsculas', { [PAISES]: troca(PAISES, 'const c = country.trim().toUpperCase()', 'const c = country.trim()') }],
  ['lista sem o Brasil', { [PAISES]: troca(PAISES, "  'BR', // KINEO-BRASIL-VOLTA-2026-10-03", "  // 'BR', // KINEO-BRASIL-VOLTA-2026-10-03") }],
]
for (const [nome, mutar] of MUTANTES) {
  let erros
  try { erros = await prova(mutar) } catch (e) { erros = ['exceção: ' + (e?.message ?? e)] }
  checa(`mutante derruba a prova: ${nome} (${erros.length} erro(s); 1º: ${String(erros[0] ?? '').slice(0, 90)})`, erros.length > 0)
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas > 0) process.exit(1)
