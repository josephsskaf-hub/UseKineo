#!/usr/bin/env node
// KINEO-S25-CLIPES-2026-10-06 — guardião do clipe do Seedance 2.5 no /clips (fundador 06/10: "vai clipe 2.5"; preço =
// opção C, igualar a Runway Pro, chamariz). EXECUTA a fiação real (lib/clips/clipServer.ts engineAccessFor / clipCatalogFor /
// lockedClipEnginesFor, lib/clips/clipFlow.ts submitClip, app/api/clips/route.ts GET) pelo carregador offline, com fal, banco,
// débito, estorno, moderação, eventos e Stripe falsos que FALHAM se forem tocados. Prova:
//   1. desligado (CLIP_S25_PUBLIC=false) = sem 2.5 no catálogo de quem é de fora (nem card livre, nem card trancado);
//   2. ligado = todo mundo vê o 2.5, só quem paga usa (casa exata do validador de $0 ou isPayingPlan — a régua do filme);
//      quem não paga recebe o card trancado com o caminho dos planos; *_trial de cortesia, trial de $1, plano ilegível e
//      visitante NÃO pagam;
//   3. motor pausado (lib/engineLaunch.ts) vence o interruptor: nem card;
//   4. preço = a constante única CLIP_S25_CREDITS (5 s = 8, 10 s = 16 — decisão do fundador; 7/15 s pela mesma conta), que
//      cobre toda duração oferecida; sem ela, a régua de mercado; nenhum outro motor muda;
//   5. não pagante recusado ANTES de qualquer consulta, moderação ou débito (402 engine_paid);
//   6. selo do motor certo: rótulo "Seedance 2.5", endpoint = o do filme (lib/hollywood/router.ts), 480p sem áudio;
//   7. tela: card trancado com selo e link dos planos, sem preço, nunca escolhe o motor; 402 engine_paid → "ver planos";
//   8. mutantes (todos em memória — nenhum arquivo é tocado).
// A pausa do 2.5 é da pista do filme (codex/s25-abre-0610 despausou): os 4 mundos (ligado/desligado × pausado/despausado)
// põem ou tiram o 's25' de PAUSED_ENGINE_KEYS só em memória — valha o que valer no arquivo — e conferem que a troca aplicou.
// Uma régua só para o clipe: lib/clips/clipLaunch.ts CLIP_S25_PUBLIC (a trava s25ClipVisible do s25-abre virou este
// interruptor); quem paga = lib/s25Access.ts s25AccessFor, a MESMA função do filme.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve '@/...' a partir do cwd
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const LAUNCH = 'lib/clips/clipLaunch.ts'
const ENGINE_LAUNCH = 'lib/engineLaunch.ts'
const SERVER = 'lib/clips/clipServer.ts'
const CATALOG = 'lib/clips/clipCatalog.ts'
const PRICING = 'lib/clips/clipPricing.ts'
const FLOW = 'lib/clips/clipFlow.ts'
const MARKET = 'lib/clips/clipPriceVsMarket.ts'
const ROUTE = 'app/api/clips/route.ts'
const CLIENT = 'app/(dashboard)/clips/ClipsClient.tsx'
const COPY = 'lib/clips/clipCopy.ts'
const ROUTER = 'lib/hollywood/router.ts'

const SUPA = 'https://abc.supabase.co'
const NOW = '2026-10-06T12:00:00.000Z'
const UID = '11111111-2222-3333-4444-555555555555'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${UID}/foto.jpg`
const DECIDED = { 5: 8, 10: 16 } // fundador 06/10: opção C (igualar Runway Pro, chamariz)
const UPGRADE = '/pricing?intent_campaign=s25_paid_plans_clips#plans'
const S25_LABEL = 'Seedance 2.5'

const forbidden = (what) => () => { throw new Error(`offline: ${what} proibido neste guardião`) }
const MOCKS = {
  '@fal-ai/client': { fal: new Proxy({}, { get: forbidden('fal') }) },
  '@/lib/credits/debit': { debitVideoCredits: forbidden('débito real') },
  '@/lib/credits/refund': { refundRenderCredits: forbidden('estorno real') },
  '@/lib/safety/contentModeration': { moderateContent: forbidden('moderação real') },
  '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
  '@/lib/animate/remoteImage': { downloadPublicAnimateImage: forbidden('download') },
  '@/lib/serverEvents': { writeServerEvent: forbidden('evento real') },
  '@/lib/falAlert': { alertFalExhausted: forbidden('alerta'), looksExhausted: () => false },
  '@/lib/stripe': { stripe: new Proxy({}, { get: forbidden('Stripe') }) },
}

// ─── Transformações em memória (o arquivo nunca é tocado) ────────────────────
function setSwitch(text, on) {
  const re = /^export const CLIP_S25_PUBLIC = (true|false)\b/m
  if (!re.test(text)) throw new Error('âncora CLIP_S25_PUBLIC sumiu de lib/clips/clipLaunch.ts')
  return text.replace(re, `export const CLIP_S25_PUBLIC = ${on}`)
}
/** Pausa (ou despausa) o 2.5 em memória, valha o que valer no arquivo (a main de 06/10 o pausava; o s25-abre o despausa). */
function setPause(text, paused) {
  const re = /(export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey\[\] = \[)([^\]]*)(\])/
  const m = re.exec(text)
  if (!m) throw new Error('âncora PAUSED_ENGINE_KEYS sumiu de lib/engineLaunch.ts')
  const list = m[2].split(',').map((s) => s.trim()).filter((s) => s && !/^'s25'/.test(s))
  if (paused) list.push("'s25' as PausedEngineKey")
  let out = text.replace(re, (_all, a, _b, c) => a + list.join(', ') + c)
  if (paused && !/^\s*s25: \{ since:/m.test(out)) {
    const head = 'export const ENGINE_PAUSE: Record<PausedEngineKey, EnginePause> = {\n'
    if (!out.includes(head)) throw new Error('âncora ENGINE_PAUSE sumiu de lib/engineLaunch.ts')
    out = out.replace(head, head + "  s25: { since: '2026-09-15', label: 'Seedance 2.5', alternative: { key: 'kling', label: 'Kling 2.5' }, message: 'paused (guardião)' },\n")
  }
  return out
}
/** Um mundo = um carregador novo (cache próprio) com o interruptor, a pausa e o mutante pedidos. */
function world({ on, unpaused, over = {} }) {
  const transform = (rel, text) => {
    let t = over[rel] ? over[rel](text) : text
    if (rel === LAUNCH) t = setSwitch(t, on)
    if (rel === ENGINE_LAUNCH) t = setPause(t, !unpaused)
    return t
  }
  const load = createOfflineLoader({ mocks: MOCKS, source: transform, env: { NEXT_PUBLIC_SUPABASE_URL: SUPA } })
  return {
    load,
    server: load(SERVER), cat: load(CATALOG), price: load(PRICING), flow: load(FLOW), market: load(MARKET),
    launch: load(LAUNCH), engineLaunch: load(ENGINE_LAUNCH),
  }
}

const ACCOUNTS = {
  guest: { email: null, plan: null, createdAt: NOW },
  free: { email: 'pessoa@example.com', plan: 'free', createdAt: NOW },
  unreadable: { email: 'pessoa@example.com', plan: null, createdAt: NOW },
  courtesy: { email: 'pessoa@example.com', plan: 'creator_trial', createdAt: NOW },
  trial1usd: { email: 'pessoa@example.com', plan: 'basic_trial', createdAt: NOW },
  starter: { email: 'pessoa@example.com', plan: 'starter', createdAt: NOW },
  creator: { email: 'pessoa@example.com', plan: 'basic', createdAt: NOW },
  studio: { email: 'pessoa@example.com', plan: 'pro', createdAt: NOW },
  founderFree: { email: 'josephsskaf@gmail.com', plan: 'free', createdAt: NOW },
  internalFree: { email: 'test-pessoa@example.com', plan: 'free', createdAt: NOW },
  internalStudio: { email: 'test-pessoa@example.com', plan: 'pro', createdAt: NOW },
}
const PAYING = new Set(['starter', 'creator', 'studio', 'founderFree', 'internalStudio'])

/** O que a conta recebe no GET: 'free' (card que aperta), 'locked' (card trancado), 'none'. */
function s25State(w, account) {
  const access = w.server.engineAccessFor(account)
  const engines = w.server.clipCatalogFor(access)
  const locked = w.server.lockedClipEnginesFor(access)
  const inEngines = engines.some((e) => e.key === 's25')
  const inLocked = locked.some((e) => e.key === 's25')
  if (inEngines && inLocked) return 'both'
  return inEngines ? 'free' : inLocked ? 'locked' : 'none'
}

function fakeSubmitDeps(engineAccess) {
  const calls = []
  const deps = {
    supabaseUrl: SUPA,
    engineAccess,
    findByKey: async () => { calls.push('find'); return null },
    countActive: async () => { calls.push('count'); return 0 },
    verifyImage: async () => { calls.push('verify') },
    moderate: async () => { calls.push('moderate'); return { ok: true } },
    getBalance: async () => { calls.push('balance'); return 500 },
    newId: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    insertPending: async (row) => { calls.push('insert'); deps.row = row; return { ok: true } },
    debit: async (ref, cr) => { calls.push(`debit:${cr}`); return { ok: true, balance: 500 - cr } },
    refund: async () => { calls.push('refund'); return 0 },
    submit: async (model, input) => { calls.push(`submit:${model}`); deps.sent = { model, input }; return { ok: true, requestId: 'req_1' } },
    markSubmitted: async () => { calls.push('markSubmitted'); return true },
    markFailed: async () => { calls.push('markFailed'); return true },
    event: async (name) => { calls.push(`event:${name}`) },
    now: () => Date.parse(NOW),
  }
  return { deps, calls }
}
const s25Body = (over = {}) => ({ engine: 's25', seconds: 5, aspect: '9:16', prompt: 'a lighthouse in a storm at night, waves crashing', imageUrl: null, ...over })

/** Lista de problemas (vazia = tudo certo). `over` = mutantes por arquivo (função texto → texto). */
async function problems(over = {}) {
  const p = []
  const W = {
    onFree: world({ on: true, unpaused: true, over }),
    offFree: world({ on: false, unpaused: true, over }),
    onPaused: world({ on: true, unpaused: false, over }),
    offPaused: world({ on: false, unpaused: false, over }),
  }
  // As trocas em memória aplicaram? (sem isto, um mundo "despausado" que continua pausado aprovaria tudo calado)
  for (const [name, w, paused] of [['ligado', W.onFree, false], ['desligado', W.offFree, false], ['ligado+pausado', W.onPaused, true], ['desligado+pausado', W.offPaused, true]]) {
    if ((w.engineLaunch.enginePaused('s25') !== null) !== paused) p.push(`mundo ${name}: a pausa do 2.5 em memória não aplicou`)
    if (w.engineLaunch.enginePaused('omni') === null) p.push(`mundo ${name}: o Omni saiu da pausa (a transformação mexeu no que não devia)`)
  }
  if (W.onFree.launch.CLIP_S25_PUBLIC !== true || W.offFree.launch.CLIP_S25_PUBLIC !== false) p.push('interruptor em memória não aplicou')
  if (typeof W.onFree.engineLaunch.s25ClipVisible === 'function') p.push('2ª régua do clipe do 2.5 em lib/engineLaunch.ts (o interruptor é o CLIP_S25_PUBLIC)')

  // ─── 1/2/3. Quem vê e quem usa ─────────────────────────────────────────────
  for (const [name, account] of Object.entries(ACCOUNTS)) {
    const internal = name.startsWith('internal') || name === 'founderFree'
    const paying = PAYING.has(name)
    const onWant = paying ? 'free' : 'locked'
    const offWant = internal ? (paying ? 'free' : 'locked') : 'none'
    const on = s25State(W.onFree, account)
    const off = s25State(W.offFree, account)
    if (on !== onWant) p.push(`ligado · ${name}: 2.5 ${on} ≠ ${onWant}`)
    if (off !== offWant) p.push(`desligado · ${name}: 2.5 ${off} ≠ ${offWant}`)
    for (const [label, w] of [['ligado+pausado', W.onPaused], ['desligado+pausado', W.offPaused]]) {
      const st = s25State(w, account)
      if (st !== 'none') p.push(`${label} · ${name}: motor pausado apareceu como ${st}`)
    }
    // Nenhum outro motor muda com o interruptor do 2.5.
    const others = (w) => JSON.stringify(w.server.clipCatalogFor(w.server.engineAccessFor(account)).filter((e) => e.key !== 's25'))
    if (others(W.onFree) !== others(W.offFree)) p.push(`${name}: o interruptor do 2.5 mexeu em outro motor`)
    const lockedOthers = W.onFree.server.lockedClipEnginesFor(W.onFree.server.engineAccessFor(account)).filter((e) => e.key !== 's25')
    if (lockedOthers.length) p.push(`${name}: outro motor virou card trancado (${lockedOthers.map((e) => e.key)})`)
  }
  {
    const lockedCard = W.onFree.server.lockedClipEnginesFor(W.onFree.server.engineAccessFor(ACCOUNTS.free)).find((e) => e.key === 's25')
    if (!lockedCard) p.push('card trancado do 2.5 ausente para quem não paga')
    else {
      if (lockedCard.label !== S25_LABEL) p.push(`selo do card trancado: ${lockedCard.label}`)
      if (lockedCard.upgradeHref !== UPGRADE) p.push(`card trancado leva a ${lockedCard.upgradeHref}`)
      if (JSON.stringify(lockedCard.seconds) !== JSON.stringify(W.onFree.cat.offeredSecondsFor('s25'))) p.push('card trancado com durações diferentes das reais')
      if ('credits' in lockedCard) p.push('card trancado carrega preço (o preço mora no botão de gerar)')
    }
    const paidAccess = W.onFree.server.engineAccessFor(ACCOUNTS.free)('s25')
    if (paidAccess.ok || paidAccess.reason !== 'paid' || paidAccess.status !== 402) p.push(`acesso do não pagante: ${JSON.stringify(paidAccess)}`)
    const hidden = W.offFree.server.engineAccessFor(ACCOUNTS.free)('s25')
    if (hidden.ok || hidden.reason !== 'hidden' || hidden.status !== 404) p.push(`desligado, conta de fora: ${JSON.stringify(hidden)}`)
    const paused = W.onPaused.server.engineAccessFor(ACCOUNTS.studio)('s25')
    if (paused.ok || paused.reason !== 'paused') p.push(`pausado vence o interruptor: ${JSON.stringify(paused)}`)
  }

  // ─── 4. Preço ──────────────────────────────────────────────────────────────
  {
    const { price, cat, market } = W.onFree
    const table = price.CLIP_S25_CREDITS
    const offered = cat.offeredSecondsFor('s25')
    if (!table) p.push('CLIP_S25_CREDITS = null (a decisão do fundador sumiu)')
    else {
      const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
      if (JSON.stringify(keys) !== JSON.stringify(offered)) p.push(`tabela do 2.5 cobre ${keys} ≠ durações oferecidas ${offered}`)
      for (const [s, cr] of Object.entries(DECIDED)) if (table[s] !== cr) p.push(`2.5 ${s} s = ${table[s]} ≠ ${cr} (decisão do fundador)`)
      for (let i = 1; i < keys.length; i++) if (!(table[keys[i]] > table[keys[i - 1]])) p.push('preço do 2.5 não cresce com a duração')
      // 7 e 15 s: a MESMA conta da decisão — ceil(Runway Pro em US$ ÷ US$/crédito do Creator).
      const runway = market.MARKET_QUOTES.find((q) => q.id === 'runway-s25-pro')
      if (!runway || runway.source !== 'oficial' || runway.resolution !== '480p') p.push('cotação oficial runway-s25-pro (480p) sumiu')
      else for (const s of keys) {
        const want = Math.ceil(Math.round(market.quoteUsdPerSecond(runway) * s / price.CREATOR_USD_PER_CREDIT * 1e6) / 1e6)
        if (table[s] !== want) p.push(`2.5 ${s} s = ${table[s]} ≠ ${want} (igualar Runway Pro no crédito do Creator)`)
      }
      for (const s of offered) for (const img of [false, true]) {
        if (price.clipCreditCost('s25', s, img) !== table[s]) p.push(`clipCreditCost(s25, ${s}, foto=${img}) = ${price.clipCreditCost('s25', s, img)} ≠ ${table[s]}`)
      }
      // Margem: custo fal CONSERVADOR (o maior entre o da casa e o conferido na fal). Trava do CEO (06/10): ≥ 25% no crédito
      // do Creator; e nunca prejuízo no crédito mensal mais barato (Studio).
      for (const s of offered) {
        const fal = Math.max(price.CLIP_COSTS.s25.usdPerSecond, market.ENGINE_MARKET.s25.falUsdPerSecond) * s
        const creator = 1 - fal / (table[s] * price.CREATOR_USD_PER_CREDIT)
        const studio = 1 - fal / (table[s] * price.STUDIO_USD_PER_CREDIT)
        if (creator < 0.25 - 1e-9) p.push(`2.5 ${s} s: margem ${(creator * 100).toFixed(1)}% < 25% no crédito do Creator`)
        if (studio <= 0) p.push(`2.5 ${s} s: prejuízo no crédito do Studio (${(studio * 100).toFixed(1)}%)`)
      }
    }
    // Catálogo e débito leem a MESMA função.
    const payerCatalog = W.onFree.server.clipCatalogFor(W.onFree.server.engineAccessFor(ACCOUNTS.studio)).find((e) => e.key === 's25')
    if (!payerCatalog) p.push('pagante sem o 2.5 no catálogo')
    else for (const s of offered) if (payerCatalog.credits[String(s)] !== price.clipCreditCost('s25', s)) p.push(`catálogo ${s} s ≠ clipCreditCost`)
    // Nenhum outro motor muda: segue a régua de mercado (interruptor CLIP_PRECO_MERCADO_PUBLIC).
    for (const engine of cat.CLIP_ENGINE_ORDER) {
      if (engine === 's25') continue
      for (const s of cat.offeredSecondsFor(engine)) {
        const want = price.CLIP_PRECO_MERCADO_PUBLIC ? price.clipMarketDecision(engine, s).credits : price.clipCreditCostRegra2909(engine, s)
        if (price.clipCreditCost(engine, s) !== want) p.push(`${engine} ${s} s mudou de preço (${price.clipCreditCost(engine, s)} ≠ ${want})`)
      }
    }
  }
  {
    // Sem a constante (null), o 2.5 volta para a régua — o override é o ÚNICO lugar do preço decidido.
    const nul = world({ on: true, unpaused: true, over: { ...over, [PRICING]: (t) => (over[PRICING] ? over[PRICING](t) : t).replace(/^export const CLIP_S25_CREDITS: ([^=]+)= \{[^}]*\}/m, 'export const CLIP_S25_CREDITS: $1= null') } })
    if (nul.price.CLIP_S25_CREDITS !== null) p.push('troca da constante para null não aplicou')
    else for (const s of nul.cat.offeredSecondsFor('s25')) {
      const want = nul.price.CLIP_PRECO_MERCADO_PUBLIC ? nul.price.clipMarketDecision('s25', s).credits : nul.price.clipCreditCostRegra2909('s25', s)
      if (nul.price.clipCreditCost('s25', s) !== want) p.push(`sem a constante, 2.5 ${s} s = ${nul.price.clipCreditCost('s25', s)} ≠ régua ${want}`)
    }
  }

  // ─── 5. Recusa antes do débito ─────────────────────────────────────────────
  for (const name of ['free', 'courtesy', 'trial1usd', 'unreadable', 'guest']) {
    const { deps, calls } = fakeSubmitDeps(W.onFree.server.engineAccessFor(ACCOUNTS[name]))
    const r = await W.onFree.flow.submitClip(deps, { userId: UID, idempotencyKey: 'clip-ui-s25-0001', body: s25Body() })
    if (r.ok || r.status !== 402 || r.code !== 'engine_paid') p.push(`${name}: pedido do 2.5 não foi recusado com 402 engine_paid (${r.status} ${r.code})`)
    if (calls.length) p.push(`${name}: recusa tocou em ${calls.join(',')} (devia ser ANTES de tudo)`)
    if (!/paid plans/.test(r.error ?? '') || !/nothing was charged/i.test(r.error ?? '')) p.push(`${name}: frase da recusa sem "paid plans"/"nothing was charged"`)
  }
  {
    const { deps, calls } = fakeSubmitDeps(W.offFree.server.engineAccessFor(ACCOUNTS.studio))
    const r = await W.offFree.flow.submitClip(deps, { userId: UID, idempotencyKey: 'clip-ui-s25-0002', body: s25Body() })
    if (r.ok || r.status !== 404 || calls.length) p.push(`desligado: pagante de fora não foi recusado (404) antes de tudo (${r.status} ${calls.join(',')})`)
  }

  // ─── 6. Selo do motor certo (pedido feliz do pagante) ──────────────────────
  {
    const router = read(ROUTER)
    const t2v = /export const S25_T2V_MODEL = '([^']+)'/.exec(router)?.[1]
    const i2v = /export const S25_I2V_MODEL = '([^']+)'/.exec(router)?.[1]
    const spec = W.onFree.cat.CLIP_ENGINES.s25
    if (!t2v || !i2v) p.push('constantes S25_T2V_MODEL/S25_I2V_MODEL sumiram do router do filme')
    if (spec.label !== S25_LABEL) p.push(`rótulo do motor: ${spec.label}`)
    if (spec.t2vModel !== t2v || spec.i2vModel !== i2v) p.push(`endpoint do clipe (${spec.t2vModel} / ${spec.i2vModel}) ≠ o do filme (${t2v} / ${i2v})`)
    for (const [label, body, model, aspect] of [
      ['texto', s25Body(), t2v, '9:16'],
      ['foto', s25Body({ imageUrl: PHOTO, seconds: 10 }), i2v, 'auto'],
    ]) {
      const { deps, calls } = fakeSubmitDeps(W.onFree.server.engineAccessFor(ACCOUNTS.studio))
      const r = await W.onFree.flow.submitClip(deps, { userId: UID, idempotencyKey: `clip-ui-s25-${label}`, body })
      const want = W.onFree.price.clipCreditCost('s25', body.seconds, !!body.imageUrl)
      if (!r.ok || r.status !== 202) { p.push(`pagante (${label}): pedido não aceito (${r.status} ${r.code})`); continue }
      if (!calls.includes(`debit:${want}`)) p.push(`pagante (${label}): débito ≠ ${want} cr (${calls.find((c) => c.startsWith('debit')) ?? 'sem débito'})`)
      if (calls.indexOf('moderate') < 0 || calls.indexOf('moderate') > calls.findIndex((c) => c.startsWith('debit'))) p.push(`pagante (${label}): moderação não veio antes do débito`)
      if (deps.sent?.model !== model) p.push(`pagante (${label}): enviado a ${deps.sent?.model} ≠ ${model}`)
      const input = deps.sent?.input ?? {}
      if (input.resolution !== '480p' || input.generate_audio !== false || input.duration !== String(body.seconds) || input.aspect_ratio !== aspect) p.push(`pagante (${label}): payload ${JSON.stringify(input)}`)
      if (deps.row?.model !== model || deps.row?.credits !== want || deps.row?.engine !== 's25') p.push(`pagante (${label}): linha gravada com motor/modelo/preço errados`)
      const pub = W.onFree.server.toPublicClip({ ...deps.row, status: 'done', video_url: `${SUPA}/x.mp4`, created_at: NOW })
      if (pub.label !== S25_LABEL) p.push(`pagante (${label}): "Meus clipes" mostra ${pub.label}`)
    }
    if (Math.abs(W.onFree.price.clipFalUsd('s25', 5) - 5 * W.onFree.price.CLIP_COSTS.s25.usdPerSecond) > 1e-9) p.push('custo fal do clipe gravado fora da tabela da casa')
    if (W.onFree.market.ENGINE_MARKET.s25.resolution !== '480p') p.push('régua de mercado compara o 2.5 numa resolução diferente da pedida')
  }

  // ─── 7. Rota (GET executado) e tela ────────────────────────────────────────
  {
    let reads = 0
    const plain = (v) => JSON.parse(JSON.stringify(v))
    const routeFor = (w, signedIn, account) => createOfflineLoader({
      mocks: {
        ...MOCKS,
        'next/server': { NextResponse: { json: (body, init = {}) => ({ body: plain(body), status: init.status ?? 200 }) } },
        '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: signedIn ? { id: UID, email: account.email } : null } }) } }) },
        '@/lib/clips/clipServer': {
          ...w.server,
          clipsAdmin: () => { reads++; return {} },
          loadClipAccount: async () => { reads++; return { userId: UID, balance: 40, ...account } },
          listClips: async () => { reads++; return [] },
          publicClipsForViewer: async () => [],
          submitDepsFor: forbidden('submit'),
        },
        '@/lib/growth/homeClipsFirstServer': { homeVariantStamp: forbidden('home variant') },
      },
      source: (rel, raw) => {
        const text = over[rel] ? over[rel](raw) : raw
        return rel === LAUNCH ? setSwitch(text, w.launch.CLIP_S25_PUBLIC) : rel === ENGINE_LAUNCH ? setPause(text, w.engineLaunch.enginePaused('s25') !== null) : text
      },
      env: { NEXT_PUBLIC_SUPABASE_URL: SUPA },
    })(ROUTE)
    const guest = await routeFor(W.onFree, false, ACCOUNTS.guest).GET()
    if (reads !== 0) p.push('GET do visitante leu conta/saldo/clipes')
    const gl = (guest.body.locked_engines ?? []).map((e) => e.key)
    if (!gl.includes('s25') || guest.body.engines.some((e) => e.key === 's25')) p.push(`visitante (ligado): 2.5 devia vir trancado (locked=${gl})`)
    const payer = await routeFor(W.onFree, true, ACCOUNTS.studio).GET()
    if (!payer.body.engines.some((e) => e.key === 's25') || (payer.body.locked_engines ?? []).length) p.push('pagante (GET): 2.5 devia vir livre e sem card trancado')
    const freeSigned = await routeFor(W.onFree, true, ACCOUNTS.free).GET()
    if (!(freeSigned.body.locked_engines ?? []).some((e) => e.key === 's25') || freeSigned.body.engines.some((e) => e.key === 's25')) p.push('conta grátis (GET): 2.5 devia vir trancado, fora de engines')
    const off = await routeFor(W.offFree, false, ACCOUNTS.guest).GET()
    if ((off.body.locked_engines ?? []).length || off.body.engines.some((e) => e.key === 's25')) p.push('desligado (GET do visitante): 2.5 apareceu')
  }
  {
    const ui = read(CLIENT)
    const block = ui.slice(ui.indexOf('{lockedEngines.map('), ui.indexOf('</div>}', ui.indexOf('{lockedEngines.map(')))
    if (!ui.includes('if (Array.isArray(d?.locked_engines)) setLockedEngines(d.locked_engines)')) p.push('tela não lê locked_engines')
    if (!block.includes('{e.label}') || !block.includes("t('paidBadge')") || !block.includes("t('paidHint')")) p.push('card trancado sem o selo do motor/"paid plans"')
    if (!/href=\{e\.upgradeHref\}/.test(block) || !block.includes('CLIP_PAID_EVENTS.clicked')) p.push('card trancado não leva aos planos com o evento do clique')
    if (/chooseEngine|setEngineKey|\bcredits\b|minCost/.test(block)) p.push('card trancado escolhe o motor ou mostra preço')
    if (!/void trackClosedEvent\(CLIP_PAID_EVENTS\.shown, \{ surface: 'clips', engine: e\.key, balance \}\)/.test(ui)) p.push('sem o evento de impressão do card trancado')
    if (!/const paidOnly = data\?\.code === 'engine_paid'/.test(ui) || !/credits: !paidOnly && /.test(ui) || !ui.includes("{error.upgrade && <a href={error.upgrade}")) p.push('402 engine_paid não leva aos planos (ou oferece recarga)')
    const copy = read(COPY)
    for (const k of ['paidBadge', 'paidHint', 'seePlans']) if ((copy.match(new RegExp(`^\\s+${k}: '`, 'gm')) ?? []).length !== 16) p.push(`clipCopy.${k} não está nas 16 línguas`)
  }
  return p
}

// ─── Execução ────────────────────────────────────────────────────────────────
console.log('S25 clipes — fiação real, offline')
const base = await problems()
ok(base.length === 0, 'interruptor, portão de pagante, pausa, preço decidido, recusa antes do débito, selo e tela' + (base.length ? '\n       ' + base.join('\n       ') : ''))
{
  const w = world({ on: false, unpaused: false })
  const committed = /^export const CLIP_S25_PUBLIC = (true|false)\b/m.exec(read(LAUNCH))?.[1]
  const pausedInFile = /PAUSED_ENGINE_KEYS: readonly PausedEngineKey\[\] = \[[^\]]*'s25'/.test(read(ENGINE_LAUNCH))
  console.log(`  ·   no código: CLIP_S25_PUBLIC = ${committed} · 2.5 ${pausedInFile ? 'PAUSADO' : 'ativo (fora da pausa)'} em lib/engineLaunch.ts`)
  const { price, market, cat } = w
  for (const s of cat.offeredSecondsFor('s25')) {
    const cr = price.clipCreditCost('s25', s)
    const fal = Math.max(price.CLIP_COSTS.s25.usdPerSecond, market.ENGINE_MARKET.s25.falUsdPerSecond) * s
    console.log(`  ·   2.5 ${String(s).padStart(2)} s = ${String(cr).padStart(2)} cr · US$ ${(cr * price.CREATOR_USD_PER_CREDIT).toFixed(2)} no Creator · fal ≤ US$ ${fal.toFixed(2)} · margem ${((1 - fal / (cr * price.CREATOR_USD_PER_CREDIT)) * 100).toFixed(1)}% (Creator) / ${((1 - fal / (cr * price.STUDIO_USD_PER_CREDIT)) * 100).toFixed(1)}% (Studio)`)
  }
}

console.log('mutantes (em memória)')
const swap = (from, to) => (text) => {
  if (!text.includes(from)) throw new Error('mutante não aplicou: ' + from)
  return text.replace(from, to)
}
const MUTANTS = [
  ['desligado mas o card aparece para todo mundo', { [LAUNCH]: swap('return CLIP_S25_PUBLIC || isInternalEmail(email)', 'return true') }],
  ['engineAccessFor sem o portão de pagante do 2.5', { [SERVER]: swap("...(engine === 's25' ? { paidAllowed: clipS25Paying(account) } : {}),", '') }],
  ['launchVisible do 2.5 sem o interruptor único', { [SERVER]: swap("launchVisible: engine !== 's25' || clipS25Visible(account.email),", 'launchVisible: true,') }],
  ['pagante do clipe ≠ portão do filme (plano ≠ free)', { [SERVER]: swap('return s25AccessFor({ email: account.email, plan: account.plan }).allowed', "return account.plan !== 'free'") }],
  ['portão do filme largo (*_trial passa)', { 'lib/s25Access.ts': swap("  if (isPayingPlan(conta.plan)) return { allowed: true, reason: 'paying_plan' }", "  if (isPayingPlan(conta.plan) || isTrialPlan(conta.plan)) return { allowed: true, reason: 'paying_plan' }") }],
  ['casa larga (test% no lugar da lista exata)', { 'lib/s25Access.ts': swap("  if (isDryRunAccount(conta.email)) return { allowed: true, reason: 'house' }", "  if (isDryRunAccount(conta.email) || /^test/.test(String(conta.email))) return { allowed: true, reason: 'house' }") }],
  ['2ª régua do clipe volta ao engineLaunch', { [ENGINE_LAUNCH]: swap('export function s25Visible(email?: string | null): boolean {', 'export function s25ClipVisible(email?: string | null): boolean { return isInternalEmail(email) }\nexport function s25Visible(email?: string | null): boolean {') }],
  ['portão ignora paidAllowed', { [CATALOG]: swap("if (facts.paidAllowed === false) return { ok: false, reason: 'paid', status: 402 }", '') }],
  ['trancado vira escondido', { [CATALOG]: swap("if (facts.paidAllowed === false) return { ok: false, reason: 'paid', status: 402 }", "if (facts.paidAllowed === false) return { ok: false, reason: 'hidden', status: 404 }") }],
  ['card trancado também para motor escondido', { [SERVER]: swap("if (verdict.ok || verdict.reason !== 'paid') return []", "if (verdict.ok || verdict.reason === 'paused') return []") }],
  ['catálogo livre inclui o trancado', { [SERVER]: swap('return CLIP_ENGINE_ORDER.filter((key) => access(key).ok).map((key) => {', "return CLIP_ENGINE_ORDER.filter((key) => { const a = access(key); return a.ok || a.reason === 'paid' }).map((key) => {") }],
  ['fluxo deixa o não pagante passar', { [FLOW]: swap('if (!access.ok) {', "if (!access.ok && access.reason !== 'paid') {") }],
  ['preço ignora a constante', { [PRICING]: swap("const decided = engine === 's25' ? clipS25DecidedCredits(seconds) : null", 'const decided = null') }],
  ['5 s a 7 cr', { [PRICING]: swap('{ 5: 8, 7: 11, 10: 16, 15: 24 }', '{ 5: 7, 7: 11, 10: 16, 15: 24 }') }],
  ['tabela sem 15 s', { [PRICING]: swap('{ 5: 8, 7: 11, 10: 16, 15: 24 }', '{ 5: 8, 7: 11, 10: 16 }') }],
  ['constante vaza para outro motor', { [PRICING]: swap("const decided = engine === 's25' ? clipS25DecidedCredits(seconds) : null", "const decided = engine === 's25' || engine === 'kling' ? clipS25DecidedCredits(seconds) : null") }],
  ['selo trocado', { [CATALOG]: swap("label: 'Seedance 2.5',", "label: 'Seedance 2.0',") }],
  ['endpoint de outro modelo', { [CATALOG]: swap("t2vModel: 'fal-ai/seedance-2.5/text-to-video',", "t2vModel: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video',") }],
  ['2.5 a 720p (custo 2× sem mudar o preço)', { [CATALOG]: swap("duration: String(s), resolution: '480p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }\n  }", "duration: String(s), resolution: '720p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }\n  }") }],
  ['2.5 com áudio', { [CATALOG]: swap("duration: String(s), resolution: '480p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }\n  }", "duration: String(s), resolution: '480p', generate_audio: true, aspect_ratio: aspect ?? 'auto' }\n  }") }],
  ['GET sem locked_engines para o visitante', { [ROUTE]: swap('locked_engines: lockedClipEnginesFor(guest), ', '') }],
  ['GET sem locked_engines para quem entrou', { [ROUTE]: swap('{ engines: clipCatalogFor(access), locked_engines: lockedClipEnginesFor(access), effects, clips: await', '{ engines: clipCatalogFor(access), effects, clips: await') }],
  ['régua do admin passa a contar *_trial como pagante', { 'app/api/admin/_shared/mrr.ts': swap('return isPaidPlan(plan) && !isTrialPlan(plan)', 'return isPaidPlan(plan)') }],
  ['pausa ignorada no portão', { [CATALOG]: swap("if (facts.paused) return { ok: false, reason: 'paused', status: 409 }", '') }],
]
for (const [name, over] of MUTANTS) {
  let caught
  try { caught = (await problems(over)).length > 0 } catch (err) { caught = !/mutante não aplicou/.test(String(err?.message)) ; if (!caught) console.log('     ' + err.message) }
  ok(caught, `mutante pego: ${name}`)
}
// Mutantes de tela (texto): o card trancado não pode escolher o motor nem mostrar preço.
{
  const ui = read(CLIENT)
  const from = "onClick={() => { void trackClosedEvent(CLIP_PAID_EVENTS.clicked, { surface: 'clips', engine: e.key, balance }) }}>"
  if (!ui.includes(from)) throw new Error('âncora do clique do card trancado sumiu')
  const block = (src) => src.slice(src.indexOf('{lockedEngines.map('), src.indexOf('</div>}', src.indexOf('{lockedEngines.map(')))
  const mutated = ui.replace(from, "onClick={() => { chooseEngine(e as never) }}>")
  ok(/chooseEngine/.test(block(mutated)) && !/chooseEngine/.test(block(ui)), 'mutante pego: card trancado escolhe o motor (a checagem 7 acusa)')
}

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
