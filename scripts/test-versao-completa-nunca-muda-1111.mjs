// KINEO-VERSAO-COMPLETA-NUNCA-MUDA-1111 — guardião do conserto da versão completa PAGA. O caso real: nikolmishukov pagou em 29/10;
// o roteirista respondeu 200 com o roteiro recusado pela régua e o pedido virou 'failed' na 1ª recusa, mudo. Prova, com o
// código de verdade (harness local, zero rede): (A) o caso do nikol agora escreve de novo 2 vezes com a instrução do tamanho e só
// a 3ª recusa falha — com evento de servidor do motivo e aviso à casa; (B) recusa seguida de roteiro bom entrega, sem alarme;
// (C) 5xx/429 do roteirista não gasta tentativa; (D) 402 de saldo grava 1 evento e avisa; (E) recusa do render avisa; (F) o
// robô de 48 h reprocessa o pedido recusado; (G) os eventos são só de servidor. Cada mutante tem de derrubar a bateria.
// Rodar: node scripts/test-versao-completa-nunca-muda-1111.mjs
import assert from 'node:assert/strict'
import { world, read, USER, VIDEO } from './test-support/upsell-filme15-harness-2610.mjs'

const SERVER = 'lib/filmComplete/server.ts'
const FC = 'lib/growth/filmComplete.ts'
const EVENTS = 'app/api/events/route.ts'
const ALERT = 'lib/founderAlert.ts'
const ORIGIN = 'https://www.usekineo.com'
// O roteiro que a régua recusou (forma do caso do nikol: 200, stillShort, poucas palavras para 35 s).
const RECUSADO = { script: 'HOOK: [Pexels: robot] This robot had one day left to live.\nPAYOFF: [Pexels: gift] Its final gift was a song.', stillShort: true, words: 21, minWords: 100, targetSeconds: 35, outcome: 'authored_still_short' }

async function cenario(overrides, writerPlan, cinematicStatus = 200) {
  const ctx = world(overrides)
  const alerts = []
  const writerBodies = []
  const io = {
    now: () => ctx.now, mint: ctx.io.mint,
    alert: async (input) => { alerts.push(input) },
    fetch: async (url, init) => {
      if (String(url).endsWith('/api/generate-script')) {
        writerBodies.push(JSON.parse(init.body))
        const step = writerPlan[Math.min(writerBodies.length - 1, writerPlan.length - 1)]
        if (step === 'ok') return ctx.io.fetch(url, init)
        if (typeof step === 'number') return Response.json({ error: 'busy' }, { status: step })
        return Response.json(step, { status: 200 })
      }
      if (cinematicStatus !== 200 && String(url).endsWith('/api/generate-video-cinematic')) { ctx.requests.push({ url: String(url) }); return Response.json({ reason: 'fixture_refused' }, { status: cinematicStatus }) }
      return ctx.io.fetch(url, init)
    },
  }
  const created = await ctx.service.createFilmCompleteIntent(ctx.db, USER, VIDEO, 'film_ready')
  ctx.tables.events.find((row) => row.id === created.id).metadata.paid_session_id = 'cs_live_nikol_fixture'
  ctx.tables.events.find((row) => row.id === created.id).metadata.paid_at = new Date(ctx.now - 60_000).toISOString()
  ctx.pay()
  const launch = async () => ctx.service.startFilmComplete(ctx.db, await ctx.service.loadFilmCompleteIntent(ctx.db, USER, created.id), ORIGIN, io)
  const intentRow = () => ctx.tables.events.find((row) => row.id === created.id)
  const named = (name) => ctx.tables.events.filter((row) => row.name === name)
  return { ctx, io, alerts, writerBodies, launch, intentRow, named, id: created.id }
}

async function battery(overrides = {}) {
  const p = []
  const check = async (label, fn) => { try { await fn() } catch (e) { p.push(`${label}: ${e.message.split('\n')[0]}`) } }

  await check('(A) caso do nikol', async () => {
    const s = await cenario(overrides, [RECUSADO])
    const r1 = await s.launch(); assert.equal(r1.state, 'starting', '1ª recusa não pode falhar')
    assert.equal(s.intentRow().metadata.writer_rejections, 1)
    assert.equal(s.intentRow().metadata.writer_last_reason, 'still_short')
    assert.ok(!s.writerBodies[0].topic.includes('PREVIOUS DRAFT REJECTED'), 'a 1ª escrita não leva nota de recusa')
    const r2 = await s.launch(); assert.equal(r2.state, 'starting', '2ª recusa não pode falhar')
    assert.ok(s.writerBodies[1].topic.includes('PREVIOUS DRAFT REJECTED (still_short: 21 of at least 100 spoken words)'), 'a 2ª escrita leva o motivo e o tamanho')
    assert.ok(s.writerBodies[1].topic.includes('This is attempt 2 of 3'))
    assert.equal(s.alerts.length, 0, 'sem alarme antes da 3ª recusa')
    const r3 = await s.launch(); assert.equal(r3.state, 'failed', 'a 3ª recusa falha')
    assert.ok(s.writerBodies[2].topic.includes('This is attempt 3 of 3'))
    assert.equal(s.writerBodies.length, 3, 'exatamente 3 escritas')
    assert.equal(s.named('film_complete_writer_rejected').length, 3, '1 evento por recusa')
    const stuck = s.named('film_complete_stuck'); assert.equal(stuck.length, 1, '1 evento de falha')
    assert.equal(stuck[0].metadata.reason, 'writer_still_short'); assert.equal(stuck[0].metadata.state, 'failed'); assert.equal(stuck[0].user_id, USER)
    assert.equal(s.alerts.length, 1, 'a casa é avisada 1 vez')
    assert.ok(s.alerts[0].subject.includes('falhou') && s.alerts[0].text.includes('writer_still_short') && s.alerts[0].key.startsWith('cs_live_nikol_fixture:failed:'))
    assert.equal(s.ctx.requests.filter((r) => r.url.endsWith('/api/generate-video-cinematic')).length, 0, 'nada vai ao render (nada cobrado)')
    const r4 = await s.launch(); assert.equal(r4.state, 'failed'); assert.equal(s.writerBodies.length, 3, "'failed' não reescreve sozinho")
  })

  await check('(B) recusa e depois roteiro bom', async () => {
    const s = await cenario(overrides, [RECUSADO, 'ok'])
    assert.equal((await s.launch()).state, 'starting')
    assert.equal((await s.launch()).state, 'processing', 'a 2ª escrita boa entrega')
    assert.equal(s.named('film_complete_stuck').length, 0); assert.equal(s.alerts.length, 0)
    assert.equal(s.ctx.requests.filter((r) => r.url.endsWith('/api/generate-video-cinematic')).length, 1)
  })

  await check('(C) roteirista fora do ar não gasta tentativa', async () => {
    const s = await cenario(overrides, [503, 429, 'ok'])
    assert.equal((await s.launch()).state, 'starting'); assert.equal((await s.launch()).state, 'starting')
    assert.equal(s.intentRow().metadata.writer_rejections ?? 0, 0, '5xx/429 não conta como recusa')
    assert.equal((await s.launch()).state, 'processing')
  })

  await check('(D) 402 de saldo', async () => {
    const s = await cenario(overrides, ['ok'], 402)
    assert.equal((await s.launch()).state, 'waiting_entitlement')
    const stuck = s.named('film_complete_stuck'); assert.equal(stuck.length, 1); assert.equal(stuck[0].metadata.reason, 'saldo_insuficiente')
    assert.equal(s.alerts.length, 1); assert.ok(s.alerts[0].subject.includes('saldo'))
    await s.launch(); assert.equal(s.named('film_complete_stuck').length, 1, 'o mesmo motivo não duplica o evento')
  })

  await check('(E) recusa do render', async () => {
    const s = await cenario(overrides, ['ok'], 422)
    assert.equal((await s.launch()).state, 'failed')
    const stuck = s.named('film_complete_stuck'); assert.equal(stuck.length, 1); assert.equal(stuck[0].metadata.reason, 'cinematic_http_422')
    assert.equal(s.alerts.length, 1)
  })

  await check('(F) o robô de 48 h reprocessa a recusa', async () => {
    const s = await cenario(overrides, [RECUSADO])
    await s.launch()
    const launched = []
    const out = await s.ctx.service.retryPaidFilmCompleteIntents(s.ctx.db, ORIGIN, s.ctx.now, async (_db, intent) => { launched.push(intent.id) })
    assert.equal(out.scheduled, 1, 'o pedido recusado entra na fila'); assert.deepEqual(launched, [s.id])
  })

  await check('(G) fontes', async () => {
    const ev = overrides[EVENTS] ?? read(EVENTS)
    assert.ok(ev.includes("'film_complete_stuck',") && ev.includes("'film_complete_writer_rejected',"), 'os dois eventos são só de servidor')
    const al = overrides[ALERT] ?? read(ALERT)
    assert.ok(/export type FounderAlertKind = [^\n]*'film_complete_stuck'/.test(al), 'o alarme tem o tipo do filme completo')
    const sv = overrides[SERVER] ?? read(SERVER)
    assert.ok(sv.includes("const { alertFounderOnce } = await import('@/lib/founderAlert'); await alertFounderOnce({ kind: 'film_complete_stuck'"), 'o aviso real usa a via dos pedidos pagos')
    assert.ok(sv.includes("const useKling4 = savedEngine ? savedEngine === FILM_COMPLETE_KLING4_ENGINE : !dispatchPrompt && io.kling4Free ? await io.kling4Free(db, intent.userId) : false"), 'o ramo do Kling 4 fica igual')
  })
  return p
}

let failed = 0
const base = await battery()
console.log(base.length === 0 ? 'PASS caso do nikol: 3 escritas com o tamanho, só a 3ª falha, evento + aviso; 5xx não conta; 402 e render recusado avisam; o robô reprocessa' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const SRC = { [SERVER]: read(SERVER), [FC]: read(FC), [EVENTS]: read(EVENTS), [ALERT]: read(ALERT) }
const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['falha na 1ª recusa (o defeito de 29/10)', muta(FC, 'state: attempts >= FILM_COMPLETE_WRITER_ATTEMPTS ?', 'state: attempts >= 1 ?')],
  ['tentativas sem fim', muta(FC, 'export const FILM_COMPLETE_WRITER_ATTEMPTS = 3', 'export const FILM_COMPLETE_WRITER_ATTEMPTS = 99')],
  ['5xx gasta tentativa', muta(FC, "return i.status >= 500 || i.status === 429 ? { ok: false, transient: true } :", 'return false ? { ok: false, transient: true } :')],
  ['stillShort ignorado', muta(FC, "if (i.stillShort === true) return { ok: false, transient: false, reason: 'still_short' }", '')],
  ['sem instrução do tamanho', muta(FC, "if (!(i.attempt > 1)) return ''", "return ''")],
  ['contador não gravado', muta(SERVER, 'writer_rejections: after.attempts, writer_last_reason', 'writer_last_reason')],
  ['recusa sem evento', muta(SERVER, 'name: FILM_COMPLETE_WRITER_REJECTED_EVENT, user_id: intent.userId', "name: 'x', user_id: intent.userId")],
  ['falha do roteiro muda', muta(SERVER, "if (after.state === 'failed') await avisarPedidoPreso(db, intent, io, 'failed', `writer_${verdict.reason}`, detail)", '')],
  ['402 mudo', muta(SERVER, "if (state === 'waiting_entitlement') await avisarPedidoPreso(db, intent, io, 'waiting_entitlement', 'saldo_insuficiente', { http_status: response.status })", '')],
  ['render recusado mudo', muta(SERVER, "if (state === 'failed') await avisarPedidoPreso(db, intent, io, 'failed', `cinematic_http_${response.status}`, { reason_from_route: text(result.reason) || null })", '')],
  ['aviso sem a casa', muta(SERVER, '  try { await io.alert({ key, subject, text: body }) } catch { /* nunca lança */ }', '')],
  ['evento de falha duplicado', muta(SERVER, '`${FILM_COMPLETE_STUCK_EVENT}:${intent.id}:${state}:${reason}`', '`${FILM_COMPLETE_STUCK_EVENT}:${intent.id}:${state}:${reason}:${Math.random()}`')],
  ['evento aberto ao navegador', muta(EVENTS, "  'film_complete_stuck', // KINEO-VERSAO-COMPLETA-NUNCA-MUDA-1111\n", '')],
  ['alarme sem tipo', muta(ALERT, " | 'film_complete_stuck'", '')],
]
let killed = 0
for (const [nome, overrides] of MUTANTES) {
  let p
  try { p = await battery(overrides) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
