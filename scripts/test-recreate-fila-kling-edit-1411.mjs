// KINEO-RECREATE-FILA-KLING-EDIT-1411 — guardião do pedido 3 da CEO (14/11): UM pedido nosso por vez no kling/v4/video-to-video/edit.
// EXECUTA o envio e a liquidação REAIS (lib/clips/clipFlow submitClip/settleClip) e a vaga real (lib/recreate/filaKlingEdit tomarVaga) sobre um
// banco de mentira: (1) 2 pedidos simultâneos nunca viram 2 chamadas à fal; (2) o 2º é cobrado uma vez, fica na fila e só sai depois de o 1º
// fechar; (3) ninguém fura a fila (o mais antigo sai primeiro); (4) dois atores do MESMO clipe nunca mandam duas vezes; (5) pedido preso não
// trava a fila para sempre: a vaga vence, o preso é fechado com estorno e o próximo sai; (6) teto de espera = falha com estorno, sem fal;
// (7) recusa do fornecedor solta a vaga, envio ambíguo não; (8) conta da casa também entra na fila; (9) outro modelo: caminho de sempre.
// E o servidor/rotas por texto: a vaga é INSERT de id fixo, a fila vale por modelo (nunca por conta), recusa de fila cheia antes de cobrar,
// status com queued + posição. Mutantes. Rodar: node scripts/test-recreate-fila-kling-edit-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const FLOW = 'lib/clips/clipFlow.ts', FILA = 'lib/recreate/filaKlingEdit.ts', SRV = 'lib/clips/clipServer.ts', ROTA = 'app/api/recreate/seu-video/route.ts', STATUS = 'app/api/recreate/status/route.ts'
const KLING = 'kling/v4/video-to-video/edit'
const SUPA = 'https://fixture.supabase.co'
const T0 = Date.parse('2026-11-14T04:00:00Z'), MIN = 60_000
const uid = (n) => `${String(n).padStart(8, '0')}-2222-3333-4444-555555555555`
const foto = (u) => `${SUPA}/storage/v1/object/public/avatars/${u}/face.jpg`

function mundo(flow, F, o = {}) {
  const s = { rows: new Map(), vaga: null, fal: [], agora: T0, debitos: [], estornos: [], eventos: [], n: 0, poll: new Map() }
  const tick = () => new Promise((r) => setImmediate(r))
  const io = {
    now: () => s.agora,
    maisAntigoNaFila: async () => { await tick(); const q = [...s.rows.values()].filter((r) => F.naFila(r)).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)); return q[0]?.id ?? null },
    criarVaga: async (clipId, expiraEm) => { await tick(); if (s.vaga) return false; s.vaga = { clipId, expiraEm }; return true }, // INSERT de id único: atômico
    lerVaga: async () => { await tick(); return s.vaga ? { ...s.vaga } : null },
    apagarVaga: async (clipId) => { if (s.vaga?.clipId === clipId) s.vaga = null },
    fecharPreso: async (clipId) => { const r = s.rows.get(clipId); if (r && (r.status === 'pending' || r.status === 'processing')) { r.status = 'failed'; r.failure_reason = 'queue_stuck'; r.credits_refunded = r.credits; s.estornos.push(clipId) } },
  }
  const queue = {
    applies: (row) => row.model === KLING,
    queued: (row) => F.naFila(row),
    take: (row) => F.tomarVaga(io, row.id),
    enqueue: async (id) => { const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.fal_request_id) return false; r.failure_reason = F.FILA_MARCA; return true },
    submit: async (row) => { await tick(); s.fal.push(row.id); const m = o.envioDaFila?.(row.id); return m ?? { ok: true, requestId: 'req-' + row.id } },
    markSubmitted: async (id, requestId) => { const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.failure_reason !== F.FILA_MARCA) return false; Object.assign(r, { status: 'processing', fal_request_id: requestId, failure_reason: null }); return true },
    release: (id) => io.apagarVaga(id),
    waitLimitMs: F.FILA_TETO_ESPERA_MS,
  }
  const submitDeps = (userId, comFila = true) => ({
    supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async (u, k) => [...s.rows.values()].find((r) => r.user_id === u && r.idempotency_key === k) ?? null, countActive: async () => 0,
    verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => uid(++s.n),
    insertPending: async (row) => { s.rows.set(row.id, { ...row, created_at: new Date(s.agora + s.n).toISOString() }); return { ok: true } },
    debit: async (ref) => { s.debitos.push(ref); return { ok: true, balance: 60 } },
    refund: async (ref) => { s.estornos.push(ref); return 40 },
    submit: async () => { await tick(); const id = uid(s.n); s.fal.push(id); return o.envioDireto?.(id) ?? { ok: true, requestId: 'req-' + id } },
    markSubmitted: async (id, requestId) => { const r = s.rows.get(id); if (!r || r.status !== 'pending') return false; Object.assign(r, { status: 'processing', fal_request_id: requestId }); return true },
    markFailed: async (id, reason, refunded) => { const r = s.rows.get(id); if (!r || (r.status !== 'pending' && r.status !== 'processing')) return false; Object.assign(r, { status: 'failed', failure_reason: reason, credits_refunded: refunded }); return true },
    event: async (name, meta) => { s.eventos.push(name + ':' + (meta.clip_id ?? '')) }, now: () => s.agora,
    ...(comFila ? { queue } : {}),
  })
  const settleDeps = () => ({
    poll: async (_m, req) => s.poll.get(req) ?? { state: 'running' },
    persist: async (row) => `https://ours.org/renders/clips/${row.id}.mp4`,
    refund: async (ref) => { s.estornos.push(ref); return 40 },
    markDone: async (id, url) => { const r = s.rows.get(id); if (!r || r.status !== 'processing') return false; Object.assign(r, { status: 'done', video_url: url }); return true },
    markFailed: async (id, reason, refunded) => { const r = s.rows.get(id); if (!r || (r.status !== 'pending' && r.status !== 'processing')) return false; Object.assign(r, { status: 'failed', failure_reason: reason, credits_refunded: refunded }); return true },
    event: async (name, meta) => { s.eventos.push(name + ':' + (meta.clip_id ?? '')) }, now: () => s.agora, queue,
  })
  const pedir = async (userN, model = KLING, comFila = true) => {
    const u = uid(900 + userN)
    const plan = { body: { engine: 'h3', seconds: 5, aspect: null, prompt: 'Replace the dancer in @Video1 with the man from @Image1.', imageUrl: foto(u) }, model, credits: 40, falUsd: 0.94, photos: [foto(u)], input: { prompt: 'p', video_url: `${SUPA}/v.mp4`, image_urls: [foto(u)], resolution: '720p' } }
    const r = await flow.submitClip(submitDeps(u, comFila), { userId: u, idempotencyKey: 'fila-' + userN + '-' + s.n + '-' + Math.random().toString(36).slice(2, 10), body: plan.body, recreatePlan: plan })
    if (!r.ok) throw new Error('submit: ' + JSON.stringify(r))
    return r.clip.id
  }
  const liquidar = (id) => flow.settleClip(settleDeps(), { ...s.rows.get(id) })
  const fechar = (id) => { s.poll.set(s.rows.get(id).fal_request_id, { state: 'done', url: 'https://v3.fal.media/files/o.mp4' }); return liquidar(id) }
  return { s, pedir, liquidar, fechar, io }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const m = loader({}, over)
  const flow = m('lib/clips/clipFlow'), F = m('lib/recreate/filaKlingEdit')
  const st = (w, id) => w.s.rows.get(id)
  await check('2 simultâneos: 1 chamada à fal; o 2º fica na fila, cobrado uma vez', async () => {
    const w = mundo(flow, F)
    const [a, b] = await Promise.all([w.pedir(1), w.pedir(2)])
    if (w.s.fal.length !== 1) throw new Error('chamadas à fal: ' + w.s.fal.length)
    const proc = [a, b].filter((id) => st(w, id).status === 'processing'), fila = [a, b].filter((id) => F.naFila(st(w, id)))
    if (proc.length !== 1 || fila.length !== 1) throw new Error(`processing ${proc.length} fila ${fila.length}`)
    if (w.s.debitos.length !== 2 || w.s.estornos.length) throw new Error('cobrança')
    if (!w.s.eventos.includes('clip_queued:' + fila[0])) throw new Error('sem evento de fila')
  })
  await check('o 2º só sai depois de o 1º fechar', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    await w.liquidar(b); await w.liquidar(b)
    if (w.s.fal.length !== 1 || !F.naFila(st(w, b))) throw new Error('o 2º saiu com o 1º em andamento')
    await w.fechar(a)
    if (st(w, a).status !== 'done' || w.s.vaga) throw new Error('o 1º não fechou ou não soltou a vaga')
    await w.liquidar(b)
    if (w.s.fal.length !== 2 || w.s.fal[1] !== b || st(w, b).status !== 'processing' || st(w, b).failure_reason !== null || w.s.vaga?.clipId !== b) throw new Error('o 2º não saiu: ' + JSON.stringify(st(w, b)))
    if (w.s.debitos.length !== 2) throw new Error('cobrou de novo')
  })
  await check('ninguém fura a fila: o mais antigo sai primeiro; pedido novo não passa na frente', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2), c = await w.pedir(3)
    await w.fechar(a)
    const d = await w.pedir(4) // vaga livre, mas b e c esperam: d entra na fila
    if (!F.naFila(st(w, d)) || w.s.fal.length !== 1) throw new Error('o novo furou a fila')
    await w.liquidar(c); await w.liquidar(d)
    if (w.s.fal.length !== 1) throw new Error('c ou d saiu antes de b')
    await w.liquidar(b)
    if (w.s.fal[1] !== b) throw new Error('b não saiu primeiro')
  })
  await check('dois atores do MESMO clipe: um envio só', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    await w.fechar(a)
    await Promise.all([w.liquidar(b), w.liquidar(b), w.liquidar(b)])
    if (w.s.fal.filter((x) => x === b).length !== 1) throw new Error('envios de b: ' + w.s.fal.filter((x) => x === b).length)
  })
  await check('pedido preso: a vaga vence, o preso fecha com estorno e o próximo sai', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    w.s.agora += 7 * MIN
    await w.liquidar(b)
    if (w.s.fal.length !== 1 || st(w, a).status !== 'processing') throw new Error('fechou antes do prazo')
    w.s.agora += 2 * MIN // 9 min: a vaga (8 min) venceu
    await w.liquidar(b)
    if (st(w, a).status !== 'failed' || st(w, a).failure_reason !== 'queue_stuck' || st(w, a).credits_refunded !== 40) throw new Error('o preso não fechou com estorno: ' + JSON.stringify(st(w, a)))
    if (w.s.fal.length !== 2 || st(w, b).status !== 'processing') throw new Error('a fila não andou')
  })
  await check('teto de espera: falha com estorno, nada à fal', async () => {
    const w = mundo(flow, F)
    await w.pedir(1); const b = await w.pedir(2)
    w.s.agora += 7 * MIN
    await w.pedir(3) // mantém a vaga ocupada? não: só o relógio importa para b
    w.s.agora += 8 * MIN + 1000
    const r = await w.liquidar(b)
    if (r.status !== 'failed' || r.failure_reason !== 'queue_timeout' || r.credits_refunded !== 40 || w.s.fal.includes(b)) throw new Error(JSON.stringify(r))
  })
  await check('recusa do fornecedor solta a vaga; envio ambíguo não', async () => {
    const w = mundo(flow, F, { envioDaFila: () => ({ ok: false, ambiguous: false, error: 'no' }) })
    const a = await w.pedir(1), b = await w.pedir(2)
    await w.fechar(a)
    const r = await w.liquidar(b)
    if (r.status !== 'failed' || r.failure_reason !== 'provider_rejected' || w.s.vaga) throw new Error('recusa: ' + JSON.stringify(r) + ' vaga ' + JSON.stringify(w.s.vaga))
    const x = mundo(flow, F, { envioDaFila: () => ({ ok: false, ambiguous: true, error: 'timeout' }) })
    const a2 = await x.pedir(1), b2 = await x.pedir(2)
    await x.fechar(a2)
    const r2 = await x.liquidar(b2)
    if (r2.failure_reason !== 'submit_ambiguous' || x.s.vaga?.clipId !== b2) throw new Error('ambíguo soltou a vaga')
    const y = mundo(flow, F, { envioDireto: () => ({ ok: false, ambiguous: false, error: 'no' }) })
    await y.pedir(1).catch(() => null)
    if (y.s.vaga) throw new Error('recusa no envio direto prendeu a vaga')
  })
  await check('outro modelo e deps sem fila: caminho de sempre (envio direto)', async () => {
    const w = mundo(flow, F)
    await Promise.all([w.pedir(1, 'bytedance/seedance-2.5/reference-to-video'), w.pedir(2, 'bytedance/seedance-2.5/reference-to-video')])
    if (w.s.fal.length !== 2 || w.s.vaga) throw new Error('fila em modelo sem fila')
    const z = mundo(flow, F)
    await Promise.all([z.pedir(1, KLING, false), z.pedir(2, KLING, false)])
    if (z.s.fal.length !== 2) throw new Error('sem os fios da fila o envio mudou')
  })
  await check('números e frases', async () => {
    if (F.VAGA_TTL_MS !== 8 * MIN || F.FILA_TETO_ESPERA_MS !== 15 * MIN || F.FILA_MAX_NA_FRENTE !== 3) throw new Error('números')
    if (F.posicaoNaFila(0, true) !== 2 || F.posicaoNaFila(2, true) !== 4 || F.posicaoNaFila(0, false) !== 1) throw new Error('posição')
    if (F.filaCheia(1, true) || !F.filaCheia(2, true) || !F.filaCheia(3, false)) throw new Error('fila cheia')
    for (const f of [F.FRASE_FILA_CHEIA, F.FRASE_FILA_FALHOU]) if (/kling|fal\b|seedance/i.test(f)) throw new Error('motor na frase')
    if (flow.QUEUE_MARK !== F.FILA_MARCA) throw new Error('a marca do fluxo difere da marca da fila')
  })
  const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  const r = (over[ROTA] ?? lf(ROTA)).replace(/\/\/[^\n]*/g, '')
  const stt = (over[STATUS] ?? lf(STATUS)).replace(/\/\/[^\n]*/g, '')
  await check('servidor: vaga = INSERT de id fixo; fila por MODELO (casa entra); ligada no envio e na liquidação; preso = failed antes do estorno', async () => {
    if (!s.includes("applies: (row) => row.model === KLING4_EDIT_MODEL,\n    queued: (row) => naFila(row),\n    take: (row) => tomarVaga(io, row.id),")) throw new Error('applies/take')
    if (!s.includes("admin.from('events').insert({ id: FILA_VAGA_ID, name: FILA_VAGA_EVENTO") || !s.includes("if ((error as { code?: string }).code === '23505') return false")) throw new Error('vaga')
    if (!s.includes(".delete().eq('id', FILA_VAGA_ID).eq('metadata->>clip_id', clipId)")) throw new Error('soltar a vaga de outro clipe')
    if ((s.match(/queue: clipQueueDepsFor\(admin\),/g) ?? []).length !== 2) throw new Error('fila não ligada nos dois lados')
    const preso = s.slice(s.indexOf('fecharPreso: async (clipId) => {'), s.indexOf('export function clipQueueDepsFor'))
    if (!(preso.indexOf('markFailed(admin, preso.id, FILA_MOTIVOS.preso, 0)') > 0 && preso.indexOf('markFailed(admin, preso.id, FILA_MOTIVOS.preso, 0)') < preso.indexOf('refundRenderCredits(preso.billing_reference)'))) throw new Error('ordem do preso')
    if (!s.includes(".eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).select('id')") || !s.includes('comEndUserDaFal(submitToFalOnce, row.user_id)(e.model, semMarcasDaCasa(e.input))')) throw new Error('envio da fila')
  })
  await check('rotas: fila cheia recusa antes de cobrar; POST e status dizem queued + posição', async () => {
    const iCheia = r.indexOf('if (fila && filaCheia(fila.naFila, fila.vagaOcupada)) {'), iCobra = r.indexOf('await submitClip(')
    if (iCheia < 0 || iCheia > iCobra || !/return json\(\{ error: FRASE_FILA_CHEIA, code: FILA_MOTIVOS\.cheia, charged: false[^\n]*\}, 429\)/.test(r)) throw new Error('fila cheia')
    if (!r.includes('queued: true, queue_position: estado ? posicaoNaFila(estado.naFila, estado.vagaOcupada) : null')) throw new Error('POST sem queued')
    if (!stt.includes('const esperando = naFila(fresh)') || !stt.includes('queued: true, queue_position: estadoDaFila ? posicaoNaFila(estadoDaFila.naFila, estadoDaFila.vagaOcupada) : null') || !stt.includes("{ reason: 'queue_failed', message: FRASE_FILA_FALHOU }")) throw new Error('status')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const flowSrc = lf(FLOW), fila = lf(FILA), srv = lf(SRV)
const mutantes = [
  ['envio ignora a fila', { [FLOW]: flowSrc.replace('  const fila = deps.queue?.applies(row) ? deps.queue : null\n  if (fila && !(await fila.take(row)', '  const fila = null as ClipQueueDeps | null\n  if (fila && !(await fila.take(row)') }],
  ['vaga ocupada não impede', { [FILA]: fila.replace('    if (vaga.expiraEm > io.now()) return false\n', '') }],
  ['novo fura a fila', { [FILA]: fila.replace('  if (primeiro && primeiro !== clipId) return false\n', '') }],
  ['mesmo clipe manda duas vezes', { [FILA]: fila.replace('    if (vaga.clipId === clipId) return false\n', '    if (vaga.clipId === clipId) return true\n') }],
  ['vaga vencida nunca é retomada', { [FILA]: fila.replace('    if (vaga.expiraEm > io.now()) return false\n', '    if (vaga.expiraEm > 0) return false\n') }],
  ['preso não é fechado', { [FILA]: fila.replace('    await io.fecharPreso(vaga.clipId)\n', '') }],
  ['quem fecha não solta a vaga', { [FLOW]: flowSrc.replace("await deps.queue.release(row.id).catch(() => {})\n  return after", 'void 0\n  return after') }],
  ['sem teto de espera', { [FLOW]: flowSrc.replace("      if (Number.isFinite(age) && age >= fila.waitLimitMs) return fail('queue_timeout')\n", '') }],
  ['ambíguo solta a vaga', { [FLOW]: flowSrc.replace(" && after.failure_reason !== 'submit_ambiguous') await deps.queue.release", ') await deps.queue.release') }],
  ['fila só para cliente (casa fora)', { [SRV]: srv.replace('    applies: (row) => row.model === KLING4_EDIT_MODEL,\n    queued:', "    applies: (row) => row.model === KLING4_EDIT_MODEL && !isInternalEmail(row.user_id),\n    queued:") }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS fila do Kling edit: 2 simultâneos = 1 chamada à fal; o 2º sai depois do 1º; ninguém fura a fila; mesmo clipe = 1 envio; preso fecha com estorno e a fila anda; teto de espera; recusa solta a vaga e ambíguo não; casa entra na fila; outro modelo intacto; ${mortos}/${mutantes.length} mutantes mortos`)
