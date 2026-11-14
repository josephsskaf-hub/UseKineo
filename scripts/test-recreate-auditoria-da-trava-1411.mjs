// KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — guardião do pedido 1 da CEO (14/11): a saída do motor que a trava "não trocou" reprova fica guardada
// em caminho PRIVADO por 48 h, com o caminho no evento. EXECUTA a liquidação real (lib/clips/clipFlow settleClip) com dublês: em unchanged e em
// partial a cópia roda DEPOIS de TUDO (failed, estorno, eventos e a vaga solta — revisor 14/11, item 10) e, guardada, vira evento próprio; falha da cópia não muda nada; em
// swapped/unverified nada é guardado; perdeu a reserva = nada. EXECUTA as regras puras (lib/recreate/auditoriaDaTrava.ts): caminho só com uuid,
// orçamento da cópia, e a limpeza só de <uuid>.mp4 com mais de 48 h. E o servidor: bucket privado (quarantine), nunca o público, limpeza na
// varredura horária que já existe e só na pasta da auditoria. Mutantes. Rodar: node scripts/test-recreate-auditoria-da-trava-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const FLOW = 'lib/clips/clipFlow.ts', AUD = 'lib/recreate/auditoriaDaTrava.ts', SRV = 'lib/clips/clipServer.ts'
const U = '11111111-2222-3333-4444-555555555555', SUPA = 'https://fixture.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/face.jpg`
const NOW = Date.parse('2026-11-14T03:00:00Z')
const AUDIT = { bucket: 'quarantine', path: `recreate-nao-trocou/${U}.mp4`, bytes: 123, expires_at: '2026-11-16T03:00:00.000Z' }

async function linha(flow, over) {
  const m = loader({}, over)
  const generation = m('lib/recreate/generation')
  const seconds = m('lib/recreate/formats').recreateFormat('passarela').seconds
  const plan = generation.planRecreate({ format: 'passarela', seconds, photos: [PHOTO], consent: true, mode: 'swap' }, { userId: U, supabaseUrl: SUPA, paying: false })
  if (!plan.ok) throw new Error('plano: ' + JSON.stringify(plan))
  let stored = null
  const deps = { supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async () => stored, countActive: async () => 0, verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => U,
    insertPending: async (row) => { stored = row; return { ok: true } }, debit: async () => ({ ok: true, balance: 60 }), refund: async () => 40, submit: async () => ({ ok: true, requestId: 'req-1' }), markSubmitted: async () => true,
    markFailed: async () => true, event: async () => {}, now: () => NOW }
  const r = await flow.submitClip(deps, { userId: U, idempotencyKey: 'auditoria-1411', body: plan.plan.body, recreatePlan: plan.plan })
  if (!r.ok) throw new Error('submit: ' + JSON.stringify(r))
  return { row: { ...stored, status: 'processing', fal_request_id: 'req-1' }, model: generation.RECREATE_MODEL }
}
function harness(verdict, model, o = {}) {
  const calls = []
  let agora = NOW
  const deps = {
    poll: async () => ({ state: 'done', url: 'https://v3.fal.media/files/saida.mp4' }),
    persist: async () => { calls.push('persist'); return 'https://ours.org/renders/clips/r.mp4' },
    refund: async () => { calls.push('refund'); return 40 },
    markDone: async () => true, markFailed: async () => true,
    event: async (name) => { calls.push('event:' + name) },
    now: () => agora,
    queue: { applies: () => true, queued: () => false, release: async () => { calls.push('release') }, waitLimitMs: 900_000 },
    recreateSwap: {
      applies: (row) => row.model === model, busy: () => false,
      claim: async () => { calls.push('claim'); return 'lock_a' },
      check: async () => { agora += o.gastoDaChecagem ?? 9_000; return { result: verdict, reason: 'fixture' } },
      markFailed: async (_id, reason) => { calls.push('swapMarkFailed:' + reason); return o.perdeu !== true },
      setRefunded: async () => { calls.push('setRefunded') },
      markDone: async () => true,
      record: async (_row, v, outcome) => { calls.push('record:' + v.result + ':' + outcome.delivered) },
      recordAudit: async (_row, audit) => { calls.push('recordAudit:' + JSON.stringify(audit)) },
      ...(o.semCopia ? {} : { keepRejected: async (_row, url, gasto) => { calls.push(`keep:${url}:${gasto}`); if (o.copiaFalha) throw new Error('bucket fora'); return o.copiaNula ? null : AUDIT } }),
    },
  }
  return { deps, calls }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const flow = loader({}, over)('lib/clips/clipFlow')
  const A = loader({}, over)('lib/recreate/auditoriaDaTrava')
  const { row, model } = await linha(flow, over)
  for (const [verdict, reason] of [['unchanged', 'swap_unchanged'], ['partial', 'swap_partial']]) {
    await check(`${verdict}: guarda depois do failed, do estorno, dos eventos e da vaga solta; cópia guardada = evento próprio`, async () => {
      const h = harness(verdict, model)
      const r = await flow.settleClip(h.deps, row)
      if (r.status !== 'failed' || r.failure_reason !== reason || r.credits_refunded !== 40) throw new Error(JSON.stringify(r))
      const i = (x) => h.calls.findIndex((c) => c.startsWith(x))
      if (!(i('swapMarkFailed') >= 0 && i('swapMarkFailed') < i('refund') && i('refund') < i('event:clip_failed') && i('event:clip_failed') < i('record:') && i('record:') < i('release') && i('release') < i('keep:') && i('keep:') < i('recordAudit:'))) throw new Error('ordem: ' + h.calls.join(' | '))
      if (!h.calls.includes('keep:https://v3.fal.media/files/saida.mp4:9000')) throw new Error('cópia sem a URL do motor ou sem o tempo gasto: ' + h.calls.join(' | '))
      if (!h.calls.includes(`record:${verdict}:false`) || !h.calls.includes('recordAudit:' + JSON.stringify(AUDIT))) throw new Error('sem o evento da cópia guardada: ' + h.calls.join(' | '))
      if (h.calls.includes('persist')) throw new Error('entregou ao cliente')
    })
  }
  await check('cópia falha, devolve nada ou não existe: falha, estorno, eventos e vaga iguais; sem evento de cópia', async () => {
    for (const o of [{ copiaFalha: true }, { copiaNula: true }, { semCopia: true }]) {
      const h = harness('unchanged', model, o)
      const r = await flow.settleClip(h.deps, row)
      if (r.status !== 'failed' || r.credits_refunded !== 40 || !h.calls.includes('record:unchanged:false') || !h.calls.includes('event:clip_failed') || !h.calls.includes('release') || h.calls.some((c) => c.startsWith('recordAudit:'))) throw new Error(JSON.stringify(o) + ' ' + h.calls.join(' | '))
    }
  })
  await check('trocou ou sem veredito: nada é guardado', async () => {
    for (const v of ['swapped', 'unverified']) {
      const h = harness(v, model)
      const r = await flow.settleClip(h.deps, row)
      if (r.status !== 'done' || h.calls.some((c) => c.startsWith('keep:'))) throw new Error(v + ' ' + h.calls.join(' | '))
    }
  })
  await check('perdeu a reserva: não estorna nem guarda', async () => {
    const h = harness('unchanged', model, { perdeu: true })
    await flow.settleClip(h.deps, row)
    if (h.calls.includes('refund') || h.calls.some((c) => c.startsWith('keep:'))) throw new Error(h.calls.join(' | '))
  })
  await check('regras puras: caminho, orçamento, vencidos', async () => {
    if (A.caminhoDaAuditoria(U) !== `recreate-nao-trocou/${U}.mp4`) throw new Error('caminho')
    for (const ruim of ['../x', `${U}/../y`, '', null, 'abc']) if (A.caminhoDaAuditoria(ruim) !== null) throw new Error('aceitou ' + ruim)
    if (A.orcamentoDaCopia(9_000) !== 15_000 || A.orcamentoDaCopia(45_000) !== 7_000 || A.orcamentoDaCopia(50_000) !== 0) throw new Error('orçamento')
    const h = 60 * 60 * 1000
    const lista = [
      { name: `${U}.mp4`, created_at: new Date(NOW - 49 * h).toISOString() },
      { name: '22222222-2222-3333-4444-555555555555.mp4', created_at: new Date(NOW - 47 * h).toISOString() },
      { name: 'prova-de-incidente.mp4', created_at: new Date(NOW - 900 * h).toISOString() },
      { name: '33333333-2222-3333-4444-555555555555.mp4', created_at: 'data ruim' },
      { name: '.emptyFolderPlaceholder', created_at: new Date(NOW - 900 * h).toISOString() },
    ]
    const v = A.vencidos(lista, NOW)
    if (JSON.stringify(v) !== JSON.stringify([`recreate-nao-trocou/${U}.mp4`])) throw new Error('vencidos: ' + JSON.stringify(v))
    if (A.AUDITORIA_HORAS !== 48) throw new Error('prazo')
  })
  const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  await check('servidor: bucket privado, nunca o público; limpeza só na pasta, na varredura que já existe', async () => {
    const ini = s.indexOf('keepRejected: async (row, providerUrl, gastoMs) => {'), fim = s.indexOf('record: async (row, verdict, outcome) => {')
    const bloco = ini >= 0 ? s.slice(ini, fim) : ''
    if (!bloco.includes('admin.storage.from(QUARANTINE_BUCKET).upload(path, buf') || /CLIPS_BUCKET|getPublicUrl/.test(bloco)) throw new Error('a cópia não vai ao bucket privado')
    if (!bloco.includes('const path = caminhoDaAuditoria(row.id)') || !bloco.includes('const teto = orcamentoDaCopia(gastoMs)') || !bloco.includes('AbortSignal.timeout(teto)')) throw new Error('caminho ou teto de tempo')
    if (!s.includes('audit_bucket: outcome.delivered ? null : QUARANTINE_BUCKET, audit_path: outcome.delivered ? null : caminhoDaAuditoria(row.id),')) throw new Error('o evento da trava não leva o caminho previsto')
    if (!bloco.includes('try { return await Promise.race([copia, estourou]) } finally { clearTimeout(relogio) }') || !bloco.includes('relogio = setTimeout(() => resolve(null), teto)')) throw new Error('a cópia inteira (download + upload) não tem teto')
    if (!bloco.includes('recordAudit: async (row, audit) => {') || !bloco.includes('name: RECREATE_SWAP_AUDIT_EVENT')) throw new Error('cópia guardada sem evento próprio')
    const sweep = s.slice(s.indexOf('export async function sweepClipJobs'))
    if (!sweep.includes('admin.storage.from(QUARANTINE_BUCKET).list(AUDITORIA_PASTA,') || !sweep.includes('vencidos(pasta.data ?? [], Date.now())') || !sweep.includes('admin.storage.from(QUARANTINE_BUCKET).remove(fora)')) throw new Error('limpeza fora da varredura ou fora da pasta')
    if (!lf('lib/safety/quarantine.ts').includes("export const QUARANTINE_BUCKET = 'quarantine'")) throw new Error('bucket privado mudou de nome')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const flowSrc = lf(FLOW), aud = lf(AUD), srv = lf(SRV)
const mutantes = [
  ['cópia antes do estorno', { [FLOW]: flowSrc.replace('        let refunded = await deps.refund(row.billing_reference) // KINEO-RECREATE-TRAVA-1011 — só o vencedor estorna', '        if (swap.keepRejected) await swap.keepRejected(row, state.url, 0).catch(() => null)\n        let refunded = await deps.refund(row.billing_reference) // KINEO-RECREATE-TRAVA-1011 — só o vencedor estorna') }],
  ['cópia guardada sem evento', { [FLOW]: flowSrc.replace('if (audit) await swap.recordAudit?.(row, audit)', 'void audit') }],
  ['cópia antes de soltar a vaga', { [FLOW]: flowSrc.replace('  const after = await settleOpenClip(deps, row, depois)\n', '  const after = await settleOpenClip(deps, row, depois)\n  for (const tarefa of depois.splice(0)) await tarefa().catch(() => {})\n') }],
  ['cópia antes dos eventos', { [FLOW]: flowSrc.replace("        await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'settle', swap_check: swapVerdict.result })", "        if (swap.keepRejected) await swap.keepRejected(row, state.url, 0).catch(() => null)\n        await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'settle', swap_check: swapVerdict.result })") }],
  ['upload sem teto', { [SRV]: srv.replace('try { return await Promise.race([copia, estourou]) } finally { clearTimeout(relogio) }', 'try { return await copia } finally { clearTimeout(relogio) }') }],
  ['guarda também o que trocou', { [FLOW]: flowSrc.replace("      if (swap && swapVerdict) await swap.record(row, swapVerdict, { delivered: true, credits_refunded: 0 })", "      if (swap?.keepRejected) await swap.keepRejected(row, state.url, 0)\n      if (swap && swapVerdict) await swap.record(row, swapVerdict, { delivered: true, credits_refunded: 0 })") }],
  ['limpeza apaga qualquer arquivo da pasta', { [AUD]: aud.replace("    if (!nome.endsWith('.mp4') || !UUID.test(nome.slice(0, -4))) continue\n", '') }],
  ['prazo de 1 hora', { [AUD]: aud.replace('export const AUDITORIA_HORAS = 48', 'export const AUDITORIA_HORAS = 1') }],
  ['cópia no bucket público', { [SRV]: srv.replace('admin.storage.from(QUARANTINE_BUCKET).upload(path, buf', 'admin.storage.from(CLIPS_BUCKET).upload(path, buf') }],
  ['caminho aceita texto de fora', { [AUD]: aud.replace("typeof clipId === 'string' && UUID.test(clipId) ?", "typeof clipId === 'string' ?") }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS auditoria da trava: saída reprovada guardada em caminho privado depois do failed, do estorno, dos eventos e da vaga solta, com teto na cópia inteira e evento próprio; falha da cópia não muda nada, trocou não guarda, limpeza só de <uuid>.mp4 com mais de 48 h na pasta da auditoria; ${mortos}/${mutantes.length} mutantes mortos`)
