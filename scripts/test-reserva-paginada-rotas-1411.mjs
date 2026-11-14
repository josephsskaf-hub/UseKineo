// KINEO-RESERVA-PAGINADA-1411 — guardião das ROTAS que passam pela auditoria das reservas [CEO 14/11 12:02, P0].
// O caso: a conta do fundador chegou a 1000 claims na vida e TODO pedido de filme voltava 503 "Your credit reservation could not be
// verified. Nothing was submitted." (inspectActiveComposeCreditHolds lia UMA página de 1000 e recusava ao vir 1000 linhas).
// O guardião do módulo (scripts/test-reserva-paginada-1411.mjs) prova a leitura paginada; ESTE prova que as rotas reais chegam lá e passam.
// EXECUTA (offline, sem rede, sem chave, sem fal) os POST reais de app/api/generate-video-cinematic/route.ts (ensaio de $0: dry_run + verbatim,
// conta do fundador, Seedance 60 s) e de app/api/compose/route.ts (Fast de conta paga = reserva de crédito), com lib/credits/composeHold.ts REAL
// e o claim atual criado pela PRÓPRIA rota (acquireCinematicClaim / claimGenerationSubmission, assinados de verdade), num banco de mentira que se
// comporta como o PostgREST (ordem created_at desc, id desc; range; no máximo 1000 linhas por resposta). Só a E/S externa é falsa.
// A rota para logo DEPOIS da auditoria: a leitura seguinte (o saldo pelo cliente de serviço) falha de propósito e a resposta vira o 503
// "Your credit balance could not be verified" — outro texto, que só existe depois da auditoria.
//  a. 1000 claims antigos (liquidados ou sem reserva) + o atual: as duas rotas passam da auditoria (nunca o 503 da reserva).
//  b. 1001 e 2500 claims antigos: idem. Em todos, a auditoria leu páginas contíguas de 1000 (2 ou 3 com linhas + a vazia) e TODOS os claims.
//  c. erro do banco na 2ª página da auditoria: as duas rotas devolvem o 503 da reserva, o claim atual é solto e NADA vai a fornecedor.
// KINEO-RESERVA-POR-CHAVE-1411 [revisor da CEO 14/11 12:16] — a auditoria pede a página seguinte pela ÚLTIMA CHAVE LIDA (created_at e id), não pela
// posição: as páginas são conferidas pela chave (cada uma começa logo depois da última linha da anterior, nenhuma linha relida) e:
//  e. um claim APAGADO entre a 1ª e a 2ª página com uma reserva de 500 na posição 1001: as duas rotas a contam (402); pela posição ela sumia.
//  d. uma reserva ATIVA de outro filme na 2ª página (atrás de 1500 claims mais novos): as duas rotas a contam e recusam por saldo (402,
//     "already reserve"); quem lê só a 1ª página deixa passar.
// Mutantes no fim (no fonte de lib/credits/composeHold.ts): "lê só a 1ª página", "recusa ao vir 1000 linhas" (o comportamento de antes),
// "ignora erro da página". Todo mutante tem de morrer; troca que não acha o texto = vermelho.
// Rodar: node scripts/test-reserva-paginada-rotas-1411.mjs
// Rodar contra outro fonte do módulo (ex.: a versão de antes, tirada do git): node scripts/test-reserva-paginada-rotas-1411.mjs --contra <arquivo.ts>
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { loader, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const { NextRequest } = require(require.resolve('next/server', { paths: [ROOT] }))
const lf = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')

const HOLD = 'lib/credits/composeHold.ts'
const ROTA_FILME = 'app/api/generate-video-cinematic/route'
const ROTA_MONTAGEM = 'app/api/compose/route'
const SUPA = 'https://fixture.supabase.co'
const SECRET = 'service-role-de-teste'
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA
process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET
process.env.FAL_KEY = 'fal-de-teste'
process.env.OPENAI_API_KEY = 'sk-de-teste'
process.env.CREATOMATE_API_KEY = 'cm-de-teste'
delete process.env.CRON_SECRET
delete process.env.KLING4_PAID_LIVE
const U = '11111111-2222-4333-8444-555555555555'
const EMAIL = 'josephsskaf@gmail.com' // conta do ensaio de $0 (lib/cinematic/classicDryRun DRY_RUN_EMAILS)
const MAX_ROWS = 1000 // PostgREST max-rows
const MSG_RESERVA = 'Your credit reservation could not be verified'
const MSG_SALDO = 'Your credit balance could not be verified'
const ROTEIRO = [
  'The old lighthouse on the northern cliff had been dark for forty years, until one winter night a fisherman saw it blink three times.',
  'Nobody in the village believed him. The keeper had died long ago and the door was sealed with rusted chains that no hand had touched.',
  'But the next night the light returned, slow and steady, sweeping the black water as if it were searching for a ship that never came home.',
  'The fisherman climbed the cliff alone. Inside he found fresh footprints in the dust, a warm cup of tea, and a logbook open on the table.',
  'The last entry was dated that very morning, written in the same careful hand as the keeper, who had been buried four decades before.',
  'He ran down the stairs and never went back. Today the lighthouse is dark again, but on the coldest nights, the villagers still count the blinks.',
].join(' ')

// ── E/S externa: qualquer chamada a fornecedor fica registrada (e falha) ──
const fornecedor = []
globalThis.fetch = async (u) => { fornecedor.push('fetch ' + String(u)); throw new Error('rede proibida no guardião: ' + u) }
const registra = (nome) => new Proxy(function () {}, {
  get: (_t, k) => (k === 'then' ? undefined : registra(nome + '.' + String(k))),
  apply: () => { fornecedor.push(nome); throw new Error('fornecedor proibido no guardião: ' + nome) },
  construct: () => registra(nome + '()'),
})

// ── Banco de mentira (PostgREST): filtros, ordem, range, max-rows, insert/update/delete, single/maybeSingle, count ──
let banco = null
function criarBanco({ falha = () => null, saldoServico = null } = {}) {
  const tabelas = { events: [], profiles: [], credit_debits: [], videos: [], broll_metrics: [] }
  const log = []
  let seq = 0
  const valorDe = (row, col) => {
    const m = /^(\w+)->>(\w+)$/.exec(col)
    if (m) { const v = row[m[1]]?.[m[2]]; return v === undefined || v === null ? null : String(v) }
    return row[col]
  }
  const igual = (a, b) => a === b || (a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b))
  const contem = (obj, sub) => obj && typeof obj === 'object' && Object.entries(sub).every(([k, v]) => (v && typeof v === 'object') ? contem(obj[k], v) : igual(obj[k], v) && typeof obj[k] === typeof v)
  function consulta(quem, tabela) {
    if (!tabelas[tabela]) tabelas[tabela] = []
    const s = { quem, tabela, op: 'select', filtros: [], desc: [], ordens: [], from: null, to: null, limite: null, um: null, payload: null, depois: false, count: null, head: false, chave: null, chaveRuim: false }
    const api = {
      select(_cols, opts) { if (s.op !== 'select') s.depois = true; if (opts?.count) { s.count = opts.count; s.head = !!opts.head } return api },
      insert(p) { s.op = 'insert'; s.payload = p; return api },
      update(p) { s.op = 'update'; s.payload = p; return api },
      upsert(p) { s.op = 'insert'; s.payload = p; return api },
      delete() { s.op = 'delete'; return api },
      eq(c, v) { s.desc.push(`eq ${c}`); s.filtros.push((r) => igual(valorDe(r, c), v)); return api },
      neq(c, v) { s.desc.push(`neq ${c}`); s.filtros.push((r) => !igual(valorDe(r, c), v)); return api },
      gt(c, v) { s.filtros.push((r) => valorDe(r, c) > v); return api },
      gte(c, v) { s.filtros.push((r) => valorDe(r, c) >= v); return api },
      lt(c, v) { s.filtros.push((r) => valorDe(r, c) < v); return api },
      lte(c, v) { s.filtros.push((r) => valorDe(r, c) <= v); return api },
      in(c, vs) { s.desc.push(`in ${c}`); s.filtros.push((r) => vs.some((v) => igual(valorDe(r, c), v))); return api },
      is(c, v) { s.filtros.push((r) => (v === null ? valorDe(r, c) == null : valorDe(r, c) === v)); return api },
      like(c, pad) { const re = new RegExp('^' + pad.split('%').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); s.filtros.push((r) => re.test(String(valorDe(r, c) ?? ''))); return api },
      contains(c, sub) { s.filtros.push((r) => contem(r[c], sub)); return api },
      order(c, o) { s.ordens.push([c, o?.ascending === false ? -1 : 1]); return api },
      range(a, b) { s.from = a; s.to = b; return api },
      or(e) { const m = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."([^"]+)",id\.lt\."([^"]+)"\)$/.exec(e); if (!m || m[1] !== m[2]) { s.chaveRuim = true; return api } s.chave = [m[1], m[3]]; s.filtros.push((r) => r.created_at < m[1] || (r.created_at === m[1] && r.id < m[3])); return api }, // KINEO-RESERVA-POR-CHAVE-1411 — o filtro de chave do PostgREST
      limit(n) { s.limite = n; return api },
      single() { s.um = 'single'; return api },
      maybeSingle() { s.um = 'maybe'; return api },
      then(ok, ko) { return Promise.resolve().then(executa).then(ok, ko) },
    }
    function executa() {
      const t = tabelas[s.tabela]
      const pedido = { quem: s.quem, tabela: s.tabela, op: s.op, desc: s.desc.join(','), from: s.from, to: s.to, limite: s.limite, chave: s.chave, n: ++seq }
      pedido.varredura = s.tabela === 'events' && s.op === 'select' && s.desc.includes('in name') && (s.from !== null || s.limite !== null)
      if (s.chaveRuim) return { data: null, error: { message: 'failed to parse logic tree' }, count: null }
      log.push(pedido)
      const erro = falha(pedido)
      if (erro) return { data: null, error: erro, count: null }
      if (s.op === 'insert') {
        const linhas = (Array.isArray(s.payload) ? s.payload : [s.payload]).map((r) => ({ id: r.id ?? `ins-${seq}-${Math.random().toString(16).slice(2)}`, created_at: new Date().toISOString(), ...structuredClone(r) }))
        pedido.ids = linhas.map((r) => r.id)
        for (const r of linhas) if (t.some((x) => x.id === r.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        t.push(...linhas)
        return fecha(s.depois ? linhas.map((r) => structuredClone(r)) : null)
      }
      const achadas = t.filter((r) => s.filtros.every((f) => f(r)))
      if (s.op === 'update') { for (const r of achadas) Object.assign(r, structuredClone(s.payload)); return fecha(s.depois ? achadas.map((r) => structuredClone(r)) : null) }
      if (s.op === 'delete') { for (const r of achadas) t.splice(t.indexOf(r), 1); return fecha(s.depois ? achadas.map((r) => structuredClone(r)) : null) }
      if (s.head) return { data: null, error: null, count: achadas.length }
      const ordenadas = achadas.map((r, i) => [r, i]).sort(([a, ia], [b, ib]) => {
        for (const [c, d] of s.ordens) { const x = a[c], y = b[c]; if (x < y) return -d; if (x > y) return d }
        return ia - ib
      }).map(([r]) => r)
      let fatia = s.from !== null ? ordenadas.slice(s.from, s.to + 1) : ordenadas
      if (s.limite !== null) fatia = fatia.slice(0, s.limite)
      fatia = fatia.slice(0, MAX_ROWS) // o PostgREST nunca devolve mais que max-rows
      pedido.linhas = fatia.length
      if (pedido.varredura) { pedido.ids = fatia.map((r) => r.id); pedido.ultima = fatia.length ? [fatia.at(-1).created_at, fatia.at(-1).id] : null }
      // o saldo "fresco" que o cliente de SERVIÇO relê depois da auditoria (pode diferir da leitura de entrada, como numa corrida real)
      if (s.tabela === 'profiles' && s.quem === 'servico' && saldoServico !== null) fatia = fatia.map((r) => ({ ...r, video_credits: saldoServico }))
      return fecha(fatia.map((r) => structuredClone(r)), s.count ? achadas.length : null)
    }
    function fecha(dados, count = null) {
      if (s.um === null) return { data: dados, error: null, count }
      const d = dados ?? []
      if (d.length === 1) return { data: d[0], error: null }
      if (d.length === 0) return s.um === 'single' ? { data: null, error: { code: 'PGRST116', message: 'no rows' } } : { data: null, error: null }
      return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } }
    }
    return api
  }
  const cliente = (quem) => new Proxy({
    from: (t) => consulta(quem, t),
    auth: { getUser: async () => ({ data: { user: { id: U, email: EMAIL } }, error: null }) },
    rpc: async (nome) => { log.push({ quem, rpc: nome }); return { data: null, error: { message: 'rpc fora do guardião: ' + nome } } },
  }, { get: (o, k) => { if (k in o) return o[k]; if (k === 'then') return undefined; throw new Error(`cliente supabase de mentira: ${String(k)} não existe`) } })
  return { tabelas, log, cliente }
}

// ── Os claims do passado ──
const uuidVelho = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
function semear(db, n, extra = []) {
  const agora = Date.now()
  for (let i = 0; i < n; i++) {
    const metade = i % 2 === 0
    db.tabelas.events.push({
      id: uuidVelho(i), user_id: U, name: 'compose_submission_claim', path: '/api/compose', session_id: `velho-${i}`,
      // liquidado (reserva já assentada) ou sem reserva (Fast grátis): os dois são ignorados pela soma, mas contam nas páginas
      metadata: metade
        ? { generation_id: `velho-${i}`, status: 'done', render_id: `r-${i}`, quality: 'fast', cost: 1, credit_hold: true, credit_hold_settled_at: new Date(agora - 3_600_000).toISOString(), authority: 'f'.repeat(64) }
        : { generation_id: `velho-${i}`, status: 'done', render_id: `r-${i}`, quality: 'fast', cost: 0, credit_hold: false, authority: 'f'.repeat(64) },
      created_at: new Date(agora - 60_000 - i * 1000).toISOString(),
    })
  }
  db.tabelas.events.push(...extra)
  db.tabelas.profiles.push({ id: U, email: EMAIL, video_credits: 10_000, plan: 'studio', has_paid: true, trial_status: null, trial_ends_at: null, trial_credits_used: 0, trial_credits_granted: 0, created_at: '2026-01-01T00:00:00.000Z' })
}

// ── Carrega as duas rotas com o módulo real (ou com o fonte trocado) ──
function carregar(over = {}) {
  const stubs = {
    'server-only': {},
    '@supabase/supabase-js': { createClient: () => banco.cliente('servico') },
    '@/lib/supabase/server': { createClient: () => banco.cliente('cookie') },
    '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@fal-ai/client': { fal: registra('fal'), createFalClient: registra('createFalClient') },
    'openai': { __esModule: true, default: registra('OpenAI'), OpenAI: registra('OpenAI'), toFile: registra('toFile') },
  }
  const m = loader(stubs, over)
  return { filme: m(ROTA_FILME).POST, montagem: m(ROTA_MONTAGEM).POST, cc: m('lib/composeClaim'), cin: m('lib/cinematic/claim') }
}

const pedido = (rota, corpo) => new NextRequest(`https://www.usekineo.com/api/${rota}`, { method: 'POST', body: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } })
const corpoFilme = (gen) => ({ generationId: gen, prompt: ROTEIRO, original_idea: 'A haunted lighthouse that blinks again after forty years', duration: 60, engine: 'seedance', script_mode: 'verbatim', dry_run: true, language: 'en' })
const corpoMontagem = (gen) => ({ generationId: gen, clip_urls: ['https://cdn.pixabay.com/video/fixture-1.mp4', 'https://cdn.pixabay.com/video/fixture-2.mp4'], voiceover_script: ROTEIRO, quality: 'fast', duration: 60, language: 'en', topic: 'A haunted lighthouse' })

// Uma rodada: banco novo, a rota real, e o que aconteceu no banco e nos fornecedores.
let rodadas = 0
async function rodar(rotas, qual, { velhos, falha, extra = [], saldoServico = null }) {
  rodadas++
  const gen = `gen-reserva-${qual}-${rodadas}-${velhos}`
  banco = criarBanco({
    saldoServico,
    falha: (p) => {
      const f = falha?.(p)
      if (f) return f
      // a leitura do saldo pelo cliente de SERVIÇO só existe depois da auditoria: ali a rota para (503 do saldo) — ou recusa por saldo no caso d
      if (p.tabela === 'profiles' && p.quem === 'servico' && p.op === 'select' && saldoServico === null) return { message: 'parada do guardião: depois da auditoria' }
      return null
    },
  })
  semear(banco, velhos, extra)
  const antes = fornecedor.length
  const corpo = qual === 'filme' ? corpoFilme(gen) : corpoMontagem(gen)
  const cons = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  const falou = []
  for (const k of Object.keys(cons)) console[k] = (...a) => { falou.push(a.map(String).join(' ')) } // a rota fala muito; o guardião mostra só o veredito
  let res
  try { res = await (qual === 'filme' ? rotas.filme : rotas.montagem)(pedido(qual === 'filme' ? 'generate-video-cinematic' : 'compose', corpo)) } finally { Object.assign(console, cons) }
  const json = await res.clone().json().catch(() => ({}))
  const varreduras = banco.log.filter((p) => p.varredura)
  const saldoServicoLido = banco.log.some((p) => p.tabela === 'profiles' && p.quem === 'servico' && p.op === 'select')
  const claimId = qual === 'filme' ? rotas.cin.cinematicClaimId(U, gen) : rotas.cc.composeClaimId(U, gen)
  const claim = banco.tabelas.events.find((r) => r.id === claimId) ?? null // a montagem APAGA o próprio claim ao recusar; o filme o marca 'released'
  const claimGravado = banco.log.some((p) => p.tabela === 'events' && p.op === 'insert' && p.ids?.includes(claimId))
  return { status: res.status, json, varreduras, saldoServicoLido, fornecedor: fornecedor.slice(antes), claim, claimGravado, gen }
}

function reservaAtivaAntiga(rotas) {
  // uma reserva de montagem ATIVA (done, sem liquidação: o filme dela ainda não foi cobrado) de OUTRA geração, assinada de verdade, mais velha que tudo
  const gen = 'gen-reserva-ativa-antiga'
  const id = rotas.cc.composeClaimId(U, gen)
  const authority = rotas.cc.signComposeClaim(SECRET, { claimId: id, userId: U, generationId: gen, status: 'done', renderId: 'render-antigo', quality: 'fast', cost: 500 })
  return { id, user_id: U, name: 'compose_submission_claim', path: '/api/compose', session_id: gen, created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    metadata: { generation_id: gen, status: 'done', render_id: 'render-antigo', quality: 'fast', cost: 500, credit_hold: true, authority } }
}

async function bateria(over = {}) {
  const falhas = []
  let ok = 0
  const check = async (nome, fn) => { try { await fn(); ok++ } catch (e) { falhas.push(`${nome}: ${e.message}`) } }
  const rotas = carregar(over)
  for (const qual of ['filme', 'montagem']) {
    // a e b — a conta com muitos claims passa da auditoria
    for (const [velhos, paginasCheias] of [[1000, 2], [1001, 2], [2500, 3]]) {
      await check(`${qual} ${velhos} claims antigos + o atual: passa da auditoria`, async () => {
        const r = await rodar(rotas, qual, { velhos })
        if (r.status === 503 && String(r.json.error ?? '').includes(MSG_RESERVA)) throw new Error(`503 da reserva (${r.varreduras.length} páginas lidas)`)
        if (!r.saldoServicoLido || r.status !== 503 || !String(r.json.error ?? '').includes(MSG_SALDO)) throw new Error(`a rota não chegou à leitura de saldo depois da auditoria: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`)
        if (!r.claimGravado) throw new Error('o claim atual não foi gravado pela rota')
        const total = velhos + 1
        const esperadas = Math.ceil(total / MAX_ROWS) + 1 // as páginas com linhas + a página vazia que encerra a leitura
        const comLinha = r.varreduras.filter((p) => p.linhas > 0).length
        if (comLinha !== paginasCheias || r.varreduras.at(-1).linhas !== 0 || r.varreduras.length !== esperadas) throw new Error(`páginas: ${JSON.stringify(r.varreduras.map((p) => [p.from, p.to, p.linhas]))}`)
        // reancorado KINEO-RESERVA-POR-CHAVE-1411 — era: páginas contíguas por posição (range). Agora: cada página pede 1000 e começa pela chave da última
        // linha da anterior (a 1ª sem chave); nenhuma linha relida; todas lidas.
        r.varreduras.forEach((p, i) => { const esperada = i === 0 ? null : r.varreduras[i - 1].ultima; if (p.limite !== MAX_ROWS || JSON.stringify(p.chave) !== JSON.stringify(esperada)) throw new Error('chave fora de ordem: ' + JSON.stringify(r.varreduras.map((x) => [x.chave, x.linhas]))) })
        const lidos = r.varreduras.flatMap((p) => p.ids ?? [])
        if (lidos.length !== total || new Set(lidos).size !== total) throw new Error(`a auditoria leu ${lidos.length} (${new Set(lidos).size} distintos) de ${total} claims`)
        if (r.fornecedor.length) throw new Error('fornecedor chamado: ' + r.fornecedor.join(', '))
      })
    }
    // c — erro do banco na 2ª página: recusa, solta o claim, nada vai a fornecedor
    await check(`${qual} erro do banco na 2ª página: 503 da reserva, claim solto, nenhum fornecedor`, async () => {
      const r = await rodar(rotas, qual, { velhos: 1000, falha: (p) => (p.varredura && p.chave ? { message: 'erro de teste na 2ª página' } : null) }) // reancorado KINEO-RESERVA-POR-CHAVE-1411 — a 2ª página é a 1ª com chave
      if (r.status !== 503 || !String(r.json.error ?? '').includes(MSG_RESERVA)) throw new Error(`esperava o 503 da reserva, veio ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`)
      if (r.varreduras.length !== 2) throw new Error('páginas lidas: ' + r.varreduras.length)
      if (r.saldoServicoLido) throw new Error('passou da auditoria (leu o saldo)')
      if (r.fornecedor.length) throw new Error('fornecedor chamado: ' + r.fornecedor.join(', '))
      if (qual === 'filme' && (r.claim?.metadata?.status !== 'released' || r.claim.metadata.resolution_reason !== 'hold_audit_failed')) throw new Error('claim do filme não foi solto: ' + JSON.stringify(r.claim?.metadata ?? null).slice(0, 200))
      if (qual === 'montagem' && r.claim) throw new Error('claim da montagem não foi solto')
    })
    // d — reserva ativa na 2ª página: contada (recusa por saldo); quem lê só a 1ª página deixaria passar
    await check(`${qual} reserva ativa de outro filme na 2ª página: contada (402 "already reserve")`, async () => {
      const r = await rodar(rotas, qual, { velhos: 1500, extra: [reservaAtivaAntiga(rotas)], saldoServico: 500 })
      const pos = r.varreduras.length
      if (r.status !== 402 || !/already reserve part of your balance/.test(String(r.json.error ?? ''))) throw new Error(`esperava 402 com a reserva de 500 contada, veio ${r.status} ${JSON.stringify(r.json).slice(0, 300)} (${pos} páginas)`)
      if (r.fornecedor.length) throw new Error('fornecedor chamado: ' + r.fornecedor.join(', '))
    })
    // e — KINEO-RESERVA-POR-CHAVE-1411 [revisor] — claim APAGADO entre a 1ª e a 2ª página; uma reserva ativa de 500 cai na posição 1001 (1ª da 2ª página)
    await check(`${qual} claim apagado entre as páginas: a reserva de 500 da posição 1001 é contada (402 "already reserve")`, async () => {
      const ativa = { ...reservaAtivaAntiga(rotas), created_at: new Date(Date.now() - 60_000 - 998_500).toISOString() } // entre o velho 998 e o 999: posição 1001
      const r = await rodar(rotas, qual, { velhos: 1500, extra: [ativa], saldoServico: 500, falha: (p) => { if (p.varredura && p.chave) { const t = banco.tabelas.events, i = t.findIndex((x) => x.id === uuidVelho(5)); if (i >= 0) t.splice(i, 1) } return null } })
      if (r.status !== 402 || !/already reserve part of your balance/.test(String(r.json.error ?? ''))) throw new Error(`esperava 402 com a reserva da posição 1001 contada, veio ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`)
      if (!r.varreduras.some((p) => p.ids?.includes(ativa.id))) throw new Error('a reserva da posição 1001 não foi lida')
      if (r.fornecedor.length) throw new Error('fornecedor chamado: ' + r.fornecedor.join(', '))
    })
  }
  // o banco de mentira se comporta como o PostgREST (sem isto a prova acima não vale)
  await check('o banco de mentira nunca devolve mais que 1000 linhas e respeita ordem + range', async () => {
    banco = criarBanco(); semear(banco, 2500)
    const c = banco.cliente('servico')
    const tudo = await c.from('events').select('id').in('name', ['compose_submission_claim']).eq('user_id', U).order('created_at', { ascending: false }).order('id', { ascending: false })
    const p2 = await c.from('events').select('id').in('name', ['compose_submission_claim']).eq('user_id', U).order('created_at', { ascending: false }).order('id', { ascending: false }).range(1000, 1999)
    const p3 = await c.from('events').select('id').in('name', ['compose_submission_claim']).eq('user_id', U).order('created_at', { ascending: false }).order('id', { ascending: false }).range(2000, 2999)
    if (tudo.data.length !== 1000 || p2.data[0].id !== uuidVelho(1000) || p3.data.length !== 500 || p3.data.at(-1).id !== uuidVelho(2499)) throw new Error(JSON.stringify([tudo.data.length, p2.data[0]?.id, p3.data.length]))
  })
  return { ok, falhas }
}

const MUTANTES = [
  ['lê só a 1ª página', '    cursor = { createdAt, id }\n  }\n', '    cursor = { createdAt, id }\n    break\n  }\n'],
  // KINEO-RESERVA-POR-CHAVE-1411 — a página pela POSIÇÃO (o defeito do revisor: claim apagado no meio pula a linha 1001)
  ['página pela posição', "    if (cursor) consulta = consulta.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)\n    const { data: lote, error } = await consulta\n      .order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .limit(HOLD_SCAN_PAGE)\n", "    const lidas = data.length\n    const { data: lote, error } = await consulta\n      .order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .range(lidas, lidas + HOLD_SCAN_PAGE - 1)\n"],
  ['recusa ao vir 1000 linhas (o comportamento de antes)', '    if (!lote || lote.length === 0) break\n', "    if (lote && lote.length >= 1000) return { ok: false, error: 'credit hold scan truncated; refusing provider submission' }\n    if (!lote || lote.length === 0) break\n"],
  ['ignora erro da página', '    if (error) return { ok: false, error: error.message }\n    if (!lote', '    if (error) break\n    if (!lote'],
]

async function main() {
  const t0 = Date.now()
  const contra = process.argv.indexOf('--contra')
  if (contra > 0) {
    const fonte = fs.readFileSync(process.argv[contra + 1], 'utf8').replace(/\r\n/g, '\n')
    const r = await bateria({ [HOLD]: fonte })
    console.log(`CONTRA ${process.argv[contra + 1]}: ${r.ok} verdes, ${r.falhas.length} vermelhos`)
    for (const f of r.falhas) console.log('  VERMELHO ' + f)
    process.exitCode = r.falhas.length ? 1 : 0
    return
  }
  const base = await bateria()
  if (base.falhas.length) {
    for (const f of base.falhas) console.error('FALHA ' + f)
    process.exitCode = 1
    return
  }
  const fonte = lf(HOLD)
  const vivos = []
  for (const [nome, antes, depois] of MUTANTES) {
    if (!fonte.includes(antes)) { vivos.push(`${nome}: o texto do mutante não existe mais no módulo`); continue }
    const mutado = fonte.replace(antes, depois)
    if (mutado === fonte) { vivos.push(`${nome}: a troca não mudou nada`); continue }
    const r = await bateria({ [HOLD]: mutado })
    if (r.falhas.length === 0) vivos.push(`${nome}: SOBREVIVEU`)
    else console.log(`  mutante morto: ${nome} (${r.falhas.length} vermelhos; 1º: ${r.falhas[0].slice(0, 160)})`)
  }
  if (vivos.length) {
    for (const v of vivos) console.error('MUTANTE ' + v)
    process.exitCode = 1
    return
  }
  console.log(`PASS: ${base.ok} checagens nas rotas reais (generate-video-cinematic dry_run verbatim e compose Fast pago) com o composeHold real — 1000, 1001 e 2500 claims antigos passam da auditoria; erro na 2ª página = 503 da reserva sem fornecedor; reserva ativa na 2ª página contada; ${MUTANTES.length}/${MUTANTES.length} mutantes mortos. ${rodadas} execuções de rota em ${Math.round((Date.now() - t0) / 1000)} s.`)
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
