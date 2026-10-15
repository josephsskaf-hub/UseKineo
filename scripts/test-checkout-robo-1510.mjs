#!/usr/bin/env node
// ═══ KINEO-CHECKOUT-ROBO-1510 — guardião: robô que segue o link de compra não vira "chegou ao pagamento" ═══════════════
// Executa o CÓDIGO REAL (readFileSync + ts.transpileModule; alias @/ resolvido aqui; sem rede, sem banco, sem .env):
//
//   A. lib/admin/checkoutHonesto.ts — o retrato REAL de 14-15/10 (36 aberturas em 30 h, banco cqqukkvjjrguayiyjvhh, só
//      SELECT): 27 compras sem conta sem rastro de navegador viram "robô/varredura"; ficam 7 pessoas (4 logadas, 3
//      convidadas com rastro); 0 pagou; o card diz "27 robôs/varreduras". Sem a leitura da navegação, a rajada por campanha
//      sozinha pega 19 (as 7 rajadas de 2-3 IPs). Bordas: rastro 29 min antes = gente, 31 min = robô, 1 min DEPOIS = gente
//      (o clique chega junto); sem ip_hash = não dá para dizer (gente); logado nunca é varredura; duas pessoas COM rastro na
//      mesma campanha em 10 s continuam duas pessoas; campanha nomeada só. O carregador lê a navegação dos IPs (5ª leitura).
//   B. lib/growth/checkoutRobotGate.ts — o portão: robô (UA de Chrome, sem cookie, sem prova de clique) recebe a página e
//      NÃO chega à rota; clique pelo lançador (kc=1) e clique nativo (Sec-Fetch-User ?1) passam; conta logada passa sem
//      prova; robô conhecido = 403 (e passa se clicar de verdade); UA vazio = página, nunca 403; pré-carregamento segue para
//      o 204 da rota; POST e outros caminhos intocados. A página não tem link para o checkout nem reflete o pedido; o JS
//      dela, executado num DOM falso, grava viewed/continued e navega com kc=1 — e essa URL passa no portão.
//   C. middleware.ts — o portão está ligado ANTES do updateSession (auth) e só no caminho exato.
//   D. lib/checkoutTelemetry.ts — o lançador único põe a marca no clique (não no href).
// Depois, MUTANTES em memória (âncora única + prova de aplicação): cada regra quebrada TEM de deixar a prova vermelha.
//
// Rodar: node scripts/test-checkout-robo-1510.mjs
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const CR = String.fromCharCode(13)
const disk = new Map()
const read = (rel) => {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}

let passed = 0
const failed = []
const check = (cond, label) => { if (cond) passed++; else failed.push(label); return Boolean(cond) }

const LIB = 'lib/admin/checkoutHonesto.ts'
const GATE = 'lib/growth/checkoutRobotGate.ts'
const MW = 'middleware.ts'
const LAUNCH = 'lib/checkoutTelemetry.ts'

// ─── mini sistema de módulos ───────────────────────────────────────────────────────────────────────────────────────────
function fileFor(rel) {
  for (const c of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = join(root, c)
    if (existsSync(abs) && statSync(abs).isFile()) return c
  }
  return null
}
function loadModule(entry, { overrides = {}, stubs = {} } = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = overrides[rel] ?? read(rel)
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: rel,
    }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (spec) => {
      if (spec in stubs) return stubs[spec]
      let target = null
      if (spec.startsWith('@/')) target = fileFor(spec.slice(2))
      else if (spec.startsWith('.')) target = fileFor(posix.normalize(posix.join(posix.dirname(rel), spec)))
      if (target) return load(target)
      return nodeRequire(spec)
    }
    new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
    return mod.exports
  }
  return load(entry)
}

// ─── A. a medição ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Retrato real (15/10, 30 h). ip = 10 primeiros caracteres do ip_hash gravado; sessão = 8 primeiros do session_id.
// [hora UTC, logado(user), sessão do navegador, ip, campanha]
const RETRATO = [
  ['2026-10-14T16:59:01.100Z', 'u-lah', '61475983', '59a084dca1', null],
  ['2026-10-14T17:01:10.257Z', null, null, 'd0a43ad902', 'buy_creator_text_to_video_shorts'],
  ['2026-10-14T17:01:14.486Z', null, null, '87d45d0289', 'buy_creator_text_to_video_shorts'],
  ['2026-10-14T17:01:17.865Z', null, null, '34d4ed9354', 'buy_creator_text_to_video_shorts'],
  ['2026-10-14T17:05:07.467Z', null, null, '0ad4ca260b', 'buy_creator_niche_facts'],
  ['2026-10-14T17:05:12.948Z', null, null, 'a1acc30fce', 'buy_creator_niche_facts'],
  ['2026-10-14T17:05:17.106Z', null, null, '9abb0b037c', 'buy_creator_niche_facts'],
  ['2026-10-14T17:20:40.937Z', 'u-ud0', 'e2c31d2e', '2a99544b83', 'mrr0610_v1_pricing_basic_annual'],
  ['2026-10-14T17:34:46.878Z', null, null, 'e86a9dfba8', 'buy_creator_niche_geography'],
  ['2026-10-14T18:08:46.526Z', null, null, 'cbc41483a6', 'buy_creator_niche_money'],
  ['2026-10-14T18:08:56.054Z', null, null, 'fafd45d1da', 'buy_creator_niche_money'],
  ['2026-10-14T18:08:59.047Z', null, null, '42f40eae05', 'buy_creator_niche_money'],
  ['2026-10-14T18:19:15.631Z', 'u-ud0', 'e2c31d2e', 'f9fa8c4c91', 'mrr0610_v1_pricing_starter_annual'],
  ['2026-10-14T18:30:45.063Z', 'u-bea', 'ac8fd05b', '0e77825409', 'mrr0610_v1_upgrade_starter_annual'],
  ['2026-10-14T18:42:20.836Z', null, null, '6c0efab67b', 'buy_creator_niche_horror'],
  ['2026-10-14T19:16:42.207Z', null, null, 'b8219006d5', 'buy_creator_niche_luxury'],
  ['2026-10-14T19:16:45.321Z', null, null, '9a09188703', 'buy_creator_niche_luxury'],
  ['2026-10-14T19:16:47.473Z', null, null, '0250ab4df1', 'buy_creator_niche_luxury'],
  ['2026-10-14T19:36:10.916Z', null, null, 'ac44092b6c', 'buy_creator_niche_history'],
  ['2026-10-14T19:49:41.898Z', null, null, 'c76ad90e9d', 'buy_creator_state_of_ai'],
  ['2026-10-14T20:15:32.803Z', null, null, '17186573fe', 'buy_creator_niche_stoicism'],
  ['2026-10-14T20:21:23.404Z', null, null, 'cfa67b7f64', 'buy_creator_free_ai_shorts_generator'],
  ['2026-10-14T20:21:25.794Z', null, null, '2d6d0463ca', 'buy_creator_free_ai_shorts_generator'],
  ['2026-10-14T20:21:29.108Z', null, null, '3b0667d96f', 'buy_creator_free_ai_shorts_generator'],
  ['2026-10-14T20:22:04.733Z', null, null, '9aaacf39f9', 'buy_creator_niche_mystery'],
  ['2026-10-14T20:30:06.576Z', null, null, '7dd1e5712a', 'buy_creator_niche_ai'],
  ['2026-10-14T20:30:10.200Z', null, null, '4a49e43ff1', 'buy_creator_niche_ai'],
  ['2026-10-14T20:50:17.164Z', null, null, '84fe3513a0', 'buy_creator_niche_motivation'],
  ['2026-10-14T20:59:59.130Z', null, null, '1894adc0ba', 'buy_creator_niche_psychology'],
  ['2026-10-14T21:57:07.655Z', 'u-ud0', 'e2c31d2e', 'f9fa8c4c91', 'mrr0610_v1_pricing_basic_annual'],
  ['2026-10-14T22:18:00.355Z', 'u-jan', 'b6b2738a', '73b39b6f9d', 'region_paid_first_film'],
  ['2026-10-15T00:37:54.883Z', null, 'd539cd96', 'd49e7ea012', 'buy_creator_niche_horror'],
  ['2026-10-15T01:17:44.699Z', null, '0370fec4', '191fee7fd6', 'buy_creator_seedance'],
  ['2026-10-15T08:10:08.203Z', null, null, '6635e7c7ca', 'buy_creator_niche_truecrime'],
  ['2026-10-15T08:10:17.953Z', null, null, 'ead1e02457', 'buy_creator_niche_truecrime'],
  ['2026-10-15T09:32:53.497Z', null, null, 'e3bb832839', 'buy_creator_niche_horror'],
]
// Navegação real dos IPs das compras sem conta (eventos com sessão do navegador; o ip dos 27 robôs só tem o checkout).
// d49e/191f/e3bb: landing_session_started + organic_cta_clicked minutos antes; o clique do botão logo depois.
const NAVEGACAO = [
  ['2026-10-15T00:31:02.000Z', 'd49e7ea012'], ['2026-10-15T00:37:54.100Z', 'd49e7ea012'],
  ['2026-10-15T01:09:40.000Z', '191fee7fd6'], ['2026-10-15T01:17:44.300Z', '191fee7fd6'],
  ['2026-10-15T09:27:11.000Z', 'e3bb832839'], ['2026-10-15T09:33:40.000Z', 'e3bb832839'],
]
const evento = (i, [at, user, sess, ip, camp], extra = {}) => ({
  id: `ev${i}`, name: 'checkout_started', created_at: at, user_id: user, session_id: sess,
  metadata: { stripe_session_id: `cs_live_${i}`, ip_hash: ip, ua_class: 'browser', prefetch: false, ...(user ? {} : { guest_checkout: true }), ...(camp ? { intent_campaign: camp } : {}), ...extra },
})
const CASA_VAZIA = { contas: new Set(), sessoes: new Set(), ips: new Set() }

async function provaMedicao(overrides = {}) {
  const p = []
  const lib = loadModule(LIB, { overrides })
  const eventos = RETRATO.map((r, i) => evento(i, r))
  const nav = lib.navegacaoPorIp(NAVEGACAO.map(([created_at, ip_hash]) => ({ created_at, ip_hash })))

  // A1. o retrato real com a navegação lida
  const r = lib.classificarCheckouts({ eventos, casa: CASA_VAZIA, navegacaoDoIp: nav })
  if (r.sessoesAbertas !== 36) p.push(`A1 sessoesAbertas=${r.sessoesAbertas} (esperado 36)`)
  if (r.pessoas !== 7) p.push(`A1 pessoas=${r.pessoas} (esperado 7: 4 logadas + 3 convidadas com rastro)`)
  if (r.varreduras !== 27) p.push(`A1 varreduras=${r.varreduras} (esperado 27)`)
  if (r.roboOuRajada !== 27) p.push(`A1 roboOuRajada=${r.roboOuRajada} (esperado 27)`)
  if (r.motivosVarredura?.sem_rastro !== 27) p.push(`A1 sem_rastro=${r.motivosVarredura?.sem_rastro} (esperado 27)`)
  if (r.pagou !== 0) p.push(`A1 pagou=${r.pagou}`)
  if (JSON.stringify(r.motivos) !== JSON.stringify({ ua_robo: 0, prefetch: 0, rajada: 0, rajada_pelo_horario: 0 })) p.push(`A1 motivos antigos mudaram: ${JSON.stringify(r.motivos)}`)
  const c = lib.cartaoCheckoutHonesto(r)
  if (c.conta !== 'Fora da conta: 27 robôs/varreduras · 0 testes da casa (36 aberturas no total)') p.push(`A1 conta da tela: "${c.conta}"`)
  if (c.linhas.find((l) => l.chave === 'pessoas')?.valor !== 7) p.push('A1 a linha "chegaram ao pagamento" não diz 7')
  if (!c.avisos.some((a) => a.startsWith('Robô/varredura:'))) p.push('A1 a tela não explica a varredura')
  if (!/30 min antes/.test(c.regra)) p.push('A1 a regra (tooltip) não cita a varredura')

  // A2. sem a leitura da navegação: só a rajada por campanha (7 rajadas, 19 aberturas); os avulsos ficam como pessoa
  const r2 = lib.classificarCheckouts({ eventos, casa: CASA_VAZIA })
  if (r2.motivosVarredura?.rajada_campanha !== 19) p.push(`A2 rajada_campanha=${r2.motivosVarredura?.rajada_campanha} (esperado 19)`)
  if (r2.motivosVarredura?.sem_rastro !== 0) p.push(`A2 sem navegação lida alguém virou sem_rastro (${r2.motivosVarredura?.sem_rastro})`)
  if (r2.pessoas !== 15) p.push(`A2 pessoas=${r2.pessoas} (esperado 15 = 7 + 8 avulsos sem como provar)`)

  // A3. bordas da janela de rastro
  const t0 = '2026-10-14T12:00:00.000Z'
  const um = (ip, extra) => [evento(900, [t0, null, null, ip, 'buy_creator_x'], extra)]
  const navEm = (ip, deltaMs) => lib.navegacaoPorIp([{ created_at: new Date(Date.parse(t0) + deltaMs).toISOString(), ip_hash: ip }])
  const caso = (nome, ev, navMap, esperaPessoa) => {
    const x = lib.classificarCheckouts({ eventos: ev, casa: CASA_VAZIA, navegacaoDoIp: navMap })
    if ((x.pessoas === 1) !== esperaPessoa) p.push(`A3 ${nome}: pessoas=${x.pessoas} varreduras=${x.varreduras}`)
  }
  caso('rastro 29 min antes = gente', um('ipA'), navEm('ipA', -29 * 60_000), true)
  caso('rastro 31 min antes = robô', um('ipA'), navEm('ipA', -31 * 60_000), false)
  caso('rastro 1 min depois = gente', um('ipA'), navEm('ipA', 60_000), true)
  caso('rastro 3 min depois = robô', um('ipA'), navEm('ipA', 3 * 60_000), false)
  caso('rastro de OUTRO ip = robô', um('ipA'), navEm('ipB', -60_000), false)
  caso('sem ip_hash = não dá para dizer (gente)', [evento(901, [t0, null, null, null, 'buy_creator_x'])], navEm('ipA', -60_000), true)
  caso('logado sem rastro nunca é varredura', [evento(902, [t0, 'u-1', null, 'ipA', 'buy_creator_x'])], new Map(), true)
  caso('sessão do navegador na própria abertura = gente', [evento(903, [t0, null, 'sessaoX', 'ipA', 'buy_creator_x'])], new Map(), true)

  // A4. duas pessoas COM rastro no mesmo botão em 10 s continuam duas; sem campanha não há "mesmo botão"
  const dois = [evento(910, ['2026-10-14T12:00:00.000Z', null, null, 'ipP', 'buy_creator_y']), evento(911, ['2026-10-14T12:00:10.000Z', null, null, 'ipQ', 'buy_creator_y'])]
  const navPQ = lib.navegacaoPorIp([{ created_at: '2026-10-14T11:55:00.000Z', ip_hash: 'ipP' }, { created_at: '2026-10-14T11:58:00.000Z', ip_hash: 'ipQ' }])
  const x4 = lib.classificarCheckouts({ eventos: dois, casa: CASA_VAZIA, navegacaoDoIp: navPQ })
  if (x4.pessoas !== 2 || x4.varreduras !== 0) p.push(`A4 duas pessoas com rastro no mesmo botão: pessoas=${x4.pessoas} varreduras=${x4.varreduras}`)
  const x4b = lib.classificarCheckouts({ eventos: dois.map((e) => ({ ...e, metadata: { ...e.metadata, intent_campaign: undefined } })), casa: CASA_VAZIA })
  if (x4b.pessoas !== 2) p.push(`A4 sem campanha nomeada virou rajada: pessoas=${x4b.pessoas}`)
  const x4c = lib.classificarCheckouts({ eventos: dois.map((e, i) => ({ ...e, created_at: i ? '2026-10-14T12:00:31.000Z' : e.created_at })), casa: CASA_VAZIA })
  if (x4c.pessoas !== 2) p.push(`A4 31 s de distância virou rajada: pessoas=${x4c.pessoas}`)
  const x4d = lib.classificarCheckouts({ eventos: dois, casa: CASA_VAZIA })
  if (x4d.varreduras !== 2) p.push(`A4 dois IPs, mesmo botão, 10 s, sem rastro conhecido: varreduras=${x4d.varreduras} (esperado 2)`)
  // mesma origem duas vezes no mesmo botão (clique duplo) não é rajada de campanha
  const x4e = lib.classificarCheckouts({ eventos: dois.map((e) => ({ ...e, metadata: { ...e.metadata, ip_hash: 'ipP' } })), casa: CASA_VAZIA })
  if (x4e.varreduras !== 0) p.push(`A4 clique duplo da mesma origem virou varredura (${x4e.varreduras})`)

  // A5. sem varredura, o texto do card é o de sempre (o guardião de 07/10 continua valendo)
  const r5 = lib.classificarCheckouts({ eventos: [evento(920, [t0, 'u-9', 's9', 'ip9', null])], casa: CASA_VAZIA, navegacaoDoIp: new Map() })
  const c5 = lib.cartaoCheckoutHonesto(r5)
  if (c5.conta !== 'Fora da conta: 0 robôs ou cliques repetidos · 0 testes da casa (1 abertura no total)') p.push(`A5 conta sem varredura mudou: "${c5.conta}"`)

  // A6. o carregador faz a 5ª leitura e a usa (banco falso em memória, leitor injetado)
  const tabela = {
    events: [
      ...eventos.map((e) => ({ ...e })),
      ...NAVEGACAO.map(([created_at, ip], i) => ({ id: `nav${i}`, name: 'landing_session_started', created_at, user_id: null, session_id: `sx${i}`, metadata: { ip_hash: ip } })),
      // o próprio checkout_attempted do robô (sem sessão) NÃO é rastro
      { id: 'att1', name: 'checkout_attempted', created_at: '2026-10-14T19:16:42.000Z', user_id: null, session_id: null, metadata: { ip_hash: 'b8219006d5' } },
    ],
    profiles: [],
  }
  const db = fakeDb(tabela)
  const ler = async (fn) => { const r = await fn(); if (r.error) throw new Error(r.error); return { data: r.data } }
  const carregado = await lib.carregarCheckoutHonesto(db, ler, Date.parse('2026-10-15T15:00:00.000Z'))
  if (carregado.varreduras !== 27 || carregado.pessoas !== 7) p.push(`A6 carregador: varreduras=${carregado.varreduras} pessoas=${carregado.pessoas} (esperado 27 / 7)`)
  if (!db.log.some((q) => q.table === 'events' && q.not.includes('session_id') && q.inCol === 'metadata->>ip_hash')) p.push('A6 o carregador não lê a navegação por ip_hash com sessão do navegador')
  return p
}

function fakeDb(tabela) {
  const log = []
  const campo = (row, col) => {
    if (col.startsWith('metadata->>')) return row.metadata?.[col.slice(11)] ?? null
    return row[col] ?? null
  }
  return {
    log,
    from(table) {
      const q = { table, filtros: [], not: [], inCol: null, cols: '*' }
      log.push(q)
      const b = {
        select(cols) { q.cols = cols; return b },
        in(col, vals) { q.inCol = col; q.filtros.push((r) => vals.includes(campo(r, col))); return b },
        gte(col, v) { q.filtros.push((r) => String(campo(r, col)) >= v); return b },
        eq(col, v) { q.filtros.push((r) => campo(r, col) === v); return b },
        not(col, op, v) { q.not.push(col); q.filtros.push((r) => campo(r, col) !== null); return b },
        then(res, rej) {
          try {
            const linhas = (tabela[table] ?? []).filter((r) => q.filtros.every((f) => f(r))).map((r) => {
              if (q.cols === '*') return r
              const o = {}
              for (const part of q.cols.split(',').map((s) => s.trim())) {
                const [alias, src] = part.includes(':') ? part.split(':') : [part, part]
                o[alias] = campo(r, src)
              }
              return o
            })
            res({ data: linhas, error: null })
          } catch (e) { rej(e) }
        },
      }
      return b
    },
  }
}

// ─── B. o portão ───────────────────────────────────────────────────────────────────────────────────────────────────────
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const hdr = (o) => ({ get: (n) => (o[n.toLowerCase()] ?? null) })
const pedido = (gate, { url = '/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=buy_creator_niche_luxury', method = 'GET', headers = { 'user-agent': CHROME }, cookies = [] } = {}) => {
  const u = new URL(url, 'https://www.usekineo.com')
  return gate.decideCheckoutGate({ method, pathname: u.pathname, searchParams: u.searchParams, headers: hdr(headers), cookieNames: cookies })
}

async function provaPortao(overrides = {}) {
  const p = []
  const gate = loadModule(GATE, { overrides })
  const robo = pedido(gate)
  if (robo.action !== 'gate') p.push(`B1 robô com UA de Chrome sem prova de clique: ${JSON.stringify(robo)} (esperado gate)`)
  if (gate.checkoutGateStatus(robo) !== 200) p.push('B1 a página do portão não é 200')
  if (pedido(gate, { url: '/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=x&kc=1' }).action !== 'pass') p.push('B2 o clique pelo lançador (kc=1) não passa')
  if (pedido(gate, { headers: { 'user-agent': CHROME, 'sec-fetch-user': '?1' } }).action !== 'pass') p.push('B2 o clique nativo (Sec-Fetch-User ?1) não passa')
  if (pedido(gate, { cookies: ['sb-cqqukkvjjrguayiyjvhh-auth-token'] }).action !== 'pass') p.push('B3 conta logada sem prova não passa')
  if (pedido(gate, { cookies: ['sb-cqqukkvjjrguayiyjvhh-auth-token.0', 'sb-cqqukkvjjrguayiyjvhh-auth-token.1'] }).action !== 'pass') p.push('B3 cookie de login em pedaços não passa')
  if (pedido(gate, { cookies: ['sb-cqqukkvjjrguayiyjvhh-auth-token-code-verifier', 'kineo_event_session_id'] }).action !== 'gate') p.push('B3 code-verifier/cookie de evento foi tratado como login')
  const gbot = pedido(gate, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } })
  if (gbot.action !== 'refuse_bot' || gate.checkoutGateStatus(gbot) !== 403) p.push(`B4 Googlebot: ${JSON.stringify(gbot)} (esperado 403)`)
  const gsafe = pedido(gate, { headers: { 'user-agent': `${CHROME} Google-Safety` } })
  if (gsafe.action !== 'refuse_bot') p.push(`B4 Google-Safety disfarçado: ${JSON.stringify(gsafe)}`)
  if (pedido(gate, { url: '/api/stripe/checkout?tier=basic&kc=1', headers: { 'user-agent': 'Googlebot/2.1', 'sec-fetch-user': '?1' } }).action !== 'pass') p.push('B4 quem o detector errou não passa nem clicando (kc=1 + ?1)')
  if (pedido(gate, { url: '/api/stripe/checkout?tier=basic&kc=1', headers: { 'user-agent': 'Googlebot/2.1' } }).action !== 'refuse_bot') p.push('B4 robô conhecido passa só copiando kc=1')
  const vazio = pedido(gate, { headers: {} })
  if (vazio.action !== 'gate') p.push(`B5 UA vazio: ${JSON.stringify(vazio)} (esperado página, nunca 403 — proxy corporativo apaga UA)`)
  if (pedido(gate, { headers: { 'user-agent': CHROME, 'sec-purpose': 'prefetch' } }).action !== 'pass') p.push('B6 pré-carregamento não segue para o 204 da rota')
  if (pedido(gate, { method: 'POST' }).action !== 'pass') p.push('B7 POST foi barrado')
  if (pedido(gate, { url: '/api/stripe/checkout/resume?go=1' }).action !== 'pass') p.push('B7 /resume foi barrado')
  if (pedido(gate, { method: 'HEAD' }).action !== 'gate') p.push('B7 HEAD sem prova passou')

  // B8. a marca de clique
  const m = gate.withCheckoutClickMark
  const casos = [
    ['/api/stripe/checkout?tier=basic&billing=monthly', '/api/stripe/checkout?tier=basic&billing=monthly&kc=1'],
    ['/api/stripe/checkout', '/api/stripe/checkout?kc=1'],
    ['/api/stripe/checkout?tier=pro&kc=1', '/api/stripe/checkout?tier=pro&kc=1'],
    ['/api/stripe/checkout?tier=pro#x', '/api/stripe/checkout?tier=pro&kc=1#x'],
    ['https://www.usekineo.com/api/stripe/checkout?tier=basic', 'https://www.usekineo.com/api/stripe/checkout?tier=basic&kc=1'],
    ['https://checkout.stripe.com/c/pay/cs_live_x', 'https://checkout.stripe.com/c/pay/cs_live_x'],
    ['/api/stripe/checkout/resume?go=1', '/api/stripe/checkout/resume?go=1'],
    ['https://evil.example/api/stripe/checkout?tier=basic', 'https://evil.example/api/stripe/checkout?tier=basic'],
  ]
  for (const [de, para] of casos) if (m(de) !== para) p.push(`B8 marca: ${de} → ${m(de)} (esperado ${para})`)

  // B9. a página: noindex, sem link para o checkout, sem refletir o pedido
  const html = gate.checkoutGateHtml('"><script>alert(1)</script>')
  if (!/<meta name="robots" content="noindex,nofollow">/.test(html)) p.push('B9 a página não diz noindex')
  if (/api\/stripe\/checkout/.test(html)) p.push('B9 a página tem o caminho do checkout escrito (robô seguiria)')
  if (/alert\(1\)|"><script>alert/.test(html)) p.push('B9 a página reflete o motivo sem limpar')
  if (!/id="kineo-checkout-continue"/.test(html)) p.push('B9 a página não tem o botão')
  if (gate.CHECKOUT_GATE_HEADERS['x-robots-tag'] !== 'noindex, nofollow' || !/no-store/.test(gate.CHECKOUT_GATE_HEADERS['cache-control'])) p.push('B9 cabeçalhos do portão sem noindex/no-store')

  // B10. o JS da página num DOM falso: grava viewed, e no clique grava continued e navega com kc=1 — que passa no portão
  const enviados = []
  let handler = null
  const botao = { disabled: false, textContent: '', addEventListener: (ev, fn) => { if (ev === 'click') handler = fn } }
  const loc = { pathname: '/api/stripe/checkout', search: '?tier=basic&billing=monthly&intent_campaign=buy_creator_niche_money', href: '' }
  const sandbox = {
    document: { cookie: 'kineo_event_session_id=abcDEF123456', getElementById: (id) => (id === 'kineo-checkout-continue' ? botao : null) },
    location: loc,
    URLSearchParams,
    JSON,
    fetch: (u, init) => { enviados.push({ u, body: JSON.parse(init.body) }); return Promise.resolve({}) },
  }
  const script = (html.match(/<script>([\s\S]*?)<\/script>/) ?? [])[1]
  if (!script) p.push('B10 a página não tem script')
  else {
    vm.runInNewContext(script, sandbox)
    if (enviados[0]?.body?.name !== gate.CHECKOUT_GATE_VIEWED_EVENT || enviados[0]?.u !== '/api/events') p.push(`B10 a página não grava ${gate.CHECKOUT_GATE_VIEWED_EVENT}`)
    if (enviados[0]?.body?.session_id !== 'abcDEF123456') p.push('B10 o evento não leva a sessão do navegador')
    if (enviados[0]?.body?.metadata?.intent_campaign !== 'buy_creator_niche_money') p.push('B10 o evento não leva a campanha')
    if (typeof handler !== 'function') p.push('B10 o botão não tem clique')
    else {
      handler()
      if (enviados[1]?.body?.name !== gate.CHECKOUT_GATE_CONTINUED_EVENT) p.push(`B10 o clique não grava ${gate.CHECKOUT_GATE_CONTINUED_EVENT}`)
      if (loc.href !== '/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=buy_creator_niche_money&kc=1') p.push(`B10 o clique navega para ${loc.href}`)
      if (!botao.disabled) p.push('B10 o botão não trava no clique')
      if (pedido(gate, { url: loc.href }).action !== 'pass') p.push('B10 a URL do clique do portão não passa no portão')
    }
  }
  return p
}

// ─── C. o middleware ───────────────────────────────────────────────────────────────────────────────────────────────────
async function provaMiddleware(overrides = {}) {
  const p = []
  let sessoes = 0
  class NextResponse {
    constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = new Headers(init.headers ?? {}); this.cookies = { set() {} } }
    static redirect(url, status) { const r = new NextResponse(null, { status }); r.headers.set('location', String(url)); return r }
    static next() { return new NextResponse(null, { status: 200 }) }
  }
  const mw = loadModule(MW, {
    overrides,
    stubs: {
      'next/server': { NextResponse },
      '@/lib/supabase/middleware': { updateSession: async () => { sessoes++; const r = new NextResponse(null); r.passou = true; return r } },
      '@/lib/growth/homeClipsFirst': { HOME_VISITOR_COOKIE: 'hv', HOME_VISITOR_COOKIE_MAX_AGE_SECONDS: 1, shouldMintHomeVisitorCookie: () => false },
    },
  })
  const req = (url, { method = 'GET', headers = { 'user-agent': CHROME, host: 'www.usekineo.com' }, cookies = {} } = {}) => {
    const u = new URL(url, 'https://www.usekineo.com')
    const h = new Headers(headers)
    return {
      method,
      headers: h,
      nextUrl: Object.assign(u, { clone: () => new URL(u) }),
      cookies: { getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })), get: (n) => (n in cookies ? { value: cookies[n] } : undefined), set() {} },
    }
  }
  const robo = await mw.middleware(req('/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=buy_creator_niche_facts'))
  if (robo.passou || robo.status !== 200 || !/Continue to secure checkout/.test(String(robo.body))) p.push(`C1 robô chegou à rota (status ${robo.status}, passou=${Boolean(robo.passou)})`)
  if (sessoes !== 0) p.push('C1 o portão roda DEPOIS da leitura de login (robô custa uma chamada de auth)')
  const lanc = await mw.middleware(req('/api/stripe/checkout?tier=basic&billing=monthly&kc=1'))
  if (!lanc.passou) p.push('C2 o clique do lançador não chega à rota')
  const nat = await mw.middleware(req('/api/stripe/checkout?tier=basic', { headers: { 'user-agent': CHROME, 'sec-fetch-user': '?1', host: 'www.usekineo.com' } }))
  if (!nat.passou) p.push('C2 o clique nativo não chega à rota')
  const logado = await mw.middleware(req('/api/stripe/checkout?tier=basic', { cookies: { 'sb-cqqukkvjjrguayiyjvhh-auth-token': 'x' } }))
  if (!logado.passou) p.push('C3 a conta logada não chega à rota')
  const bot = await mw.middleware(req('/api/stripe/checkout?tier=basic', { headers: { 'user-agent': 'Googlebot/2.1', host: 'www.usekineo.com' } }))
  if (bot.status !== 403 || bot.passou) p.push(`C4 robô conhecido: status ${bot.status}`)
  if (bot.headers.get('x-robots-tag') !== 'noindex, nofollow') p.push('C4 resposta do portão sem x-robots-tag')
  const head = await mw.middleware(req('/api/stripe/checkout?tier=basic', { method: 'HEAD' }))
  if (head.passou || head.body !== null) p.push('C5 HEAD sem prova passou ou levou corpo')
  const pagina = await mw.middleware(req('/pricing'))
  if (!pagina.passou) p.push('C6 outra página foi afetada')
  const resume = await mw.middleware(req('/api/stripe/checkout/resume?go=1'))
  if (!resume.passou) p.push('C6 /resume foi afetado')
  return p
}

// ─── D. o lançador ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function provaLancador(overrides = {}) {
  const p = []
  const src = overrides[LAUNCH] ?? read(LAUNCH)
  if (!/import \{ withCheckoutClickMark \} from '@\/lib\/growth\/checkoutRobotGate'/.test(src)) p.push('D1 o lançador não importa a marca')
  const nav = src.match(/window\.location\.href = (.+)/g) ?? []
  if (nav.length !== 1 || nav[0] !== 'window.location.href = url') p.push(`D1 a navegação do lançador: ${JSON.stringify(nav)}`)
  // a marca é posta na MESMA `url` logo antes de navegar (nada entre as duas linhas)
  if (!/\n {8}url = withCheckoutClickMark\(url\)\n {8}window\.location\.href = url\n/.test(src)) p.push('D1 o lançador não marca a url imediatamente antes de navegar')
  const cta = read('components/BuyCreatorCta.tsx')
  if (!/href=\{href\}/.test(cta) || !/rel="nofollow"/.test(cta)) p.push('D2 o botão de compra perdeu o href nativo ou o rel="nofollow"')
  if (/kc=1/.test(read('lib/growth/buyCreatorOffer.ts'))) p.push('D2 a marca de clique foi para o href (o robô leria)')
  return p
}

const PROVAS = [
  ['A. medição (retrato real 14-15/10, bordas, carregador)', provaMedicao],
  ['B. portão (decisão, marca, página, JS da página)', provaPortao],
  ['C. middleware (ligado antes do login, só no caminho exato)', provaMiddleware],
  ['D. lançador (marca no clique)', provaLancador],
]
for (const [label, prova] of PROVAS) {
  let p
  try { p = await prova() } catch (e) { p = [`quebrou: ${e.stack ?? e}`] }
  check(p.length === 0, `${label} — ${p.join(' | ')}`)
}

// ─── mutantes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function troca(rel, de, para) {
  return () => {
    const src = read(rel)
    const n = src.split(de).length - 1
    if (n !== 1) throw new Error(`âncora ${n}x em ${rel}: ${de.slice(0, 60)}`)
    const novo = src.split(de).join(para)
    if (!novo.includes(para) || novo.includes(de)) throw new Error(`mutante não aplicou em ${rel}`)
    return { [rel]: novo }
  }
}
const MUTANTES = [
  ['M1 sem_rastro desligado', provaMedicao, troca(LIB, "    else if (s.convidado && s.temRastro === false) motivo.set(s.chave, 'sem_rastro')", "    else if (false) motivo.set(s.chave, 'sem_rastro')")],
  ['M2 janela de 30 min vira 60 min', provaMedicao, troca(LIB, 'export const SEM_RASTRO_ANTES_MS = 30 * 60 * 1000', 'export const SEM_RASTRO_ANTES_MS = 60 * 60 * 1000')],
  ['M3 tolerância depois do clique zerada', provaMedicao, troca(LIB, 'export const SEM_RASTRO_DEPOIS_MS = 2 * 60 * 1000', 'export const SEM_RASTRO_DEPOIS_MS = 0')],
  ['M4 rajada de campanha pega quem tem rastro', provaMedicao, troca(LIB, '    if (!s.convidado || s.temRastro === true || s.campanha === null) continue', '    if (!s.convidado || s.campanha === null) continue')],
  ['M5 rajada de campanha sem exigir origens diferentes', provaMedicao, troca(LIB, '      if (new Set(trecho.map(origem)).size < RAJADA_CAMPANHA_MIN) continue', '      if (trecho.length < RAJADA_CAMPANHA_MIN) continue')],
  ['M6 o card não separa a varredura', provaMedicao, troca(LIB, "    (varreduras > 0 ? `${plural(varreduras, 'robô/varredura', 'robôs/varreduras')} · ` : '') +", "    '' +")],
  ['M7 o carregador não passa a navegação', provaMedicao, troca(LIB, '    navegacaoDoIp: navegacaoPorIp(navegacao),', '')],
  ['M8 sem ip_hash vira robô', provaMedicao, troca(LIB, '          : null\n    porChave.set(chave, {', '          : ipProprio === null ? false : null\n    porChave.set(chave, {')],
  ['M9 portão deixa passar sem prova', provaPortao, troca(GATE, "  return { action: 'gate', reason: 'no_click_proof' }", "  return { action: 'pass', reason: 'click_mark' }")],
  ['M10 portão esquece a conta logada', provaPortao, troca(GATE, "  if (hasSupabaseAuthCookie(input.cookieNames)) return { action: 'pass', reason: 'signed_in' }", '')],
  ['M11 UA vazio vira 403', provaPortao, troca(GATE, '  const botReason = ua ? affiliateBotReason(ua) : null', '  const botReason = affiliateBotReason(ua)')],
  ['M12 robô conhecido passa com kc=1 copiado', provaPortao, troca(GATE, '    return clickMark && userActivation ?', '    return clickMark || userActivation ?')],
  ['M13 a marca vai para qualquer URL', provaPortao, troca(GATE, '  if (!relative && !sameSiteAbsolute) return url', '')],
  ['M14 a página escreve o link do checkout', provaPortao, troca(GATE, '<p style="margin-top:18px;font-size:.85rem">or <a href="/pricing">see all plans</a></p>', '<p style="margin-top:18px;font-size:.85rem">or <a href="/api/stripe/checkout?tier=basic&kc=1">continue</a></p>')],
  ['M15 o JS da página navega sem a marca', provaPortao, troca(GATE, "    location.href=location.pathname+q+${JSON.stringify(`${CHECKOUT_CLICK_PARAM}=${CHECKOUT_CLICK_VALUE}`)};", "    location.href=location.pathname+location.search;")],
  ['M16 middleware sem o portão', provaMiddleware, troca(MW, "  if (request.nextUrl.pathname === '/api/stripe/checkout') {\n    const gate", "  if (request.nextUrl.pathname === '/api/stripe/checkout/__off') {\n    const gate")],
  ['M17 lançador navega sem a marca', provaLancador, troca(LAUNCH, '        url = withCheckoutClickMark(url)\n', '')],
]
for (const [label, prova, mutar] of MUTANTES) {
  let ov
  try { ov = mutar() } catch (e) { check(false, `${label}: ${e.message}`); continue }
  let p
  try { p = await prova(ov) } catch (e) { check(false, `${label}: quebrou a execução em vez de reprovar (${e.message})`); continue }
  check(p.length > 0, `${label}: a prova ficou VERDE com a regra quebrada`)
  if (process.argv.includes('--verbose')) console.log(`  ${label} → ${p[0] ?? '(verde)'}`)
}

if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f}`)
  console.log(`\n${passed} ok, ${failed.length} FALHA(S) — test-checkout-robo-1510`)
  process.exit(1)
}
console.log(`${passed} verificações ok — test-checkout-robo-1510 (medição com o retrato real de 14-15/10, portão, middleware, lançador, ${MUTANTES.length} mutantes vermelhos)`)
