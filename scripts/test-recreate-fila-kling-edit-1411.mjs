// KINEO-RECREATE-FILA-KLING-EDIT-1411 + KINEO-RECREATE-FILA-REVISAO-1411 — guardião da fila de UM pedido por vez no kling/v4/video-to-video/edit.
// EXECUTA o envio e a liquidação REAIS (lib/clips/clipFlow submitClip/settleClip) e a vaga real (lib/recreate/filaKlingEdit tomarVaga /
// resolverVagaVencida) sobre um banco de mentira. Pedido 3 da CEO: (1) 2 simultâneos nunca viram 2 chamadas à fal; (2) o 2º é cobrado uma vez,
// fica na fila e só sai depois de o 1º fechar; (3) ninguém fura a fila; (4) dois atores do mesmo clipe = 1 envio; (5) teto de espera = falha
// com estorno; (6) recusa do fornecedor solta a vaga, envio ambíguo não; (7) casa entra na fila; (8) outro modelo intacto.
// Achados do revisor independente (14/11), cada um um caso: S1 vaga em nome de clipe que ficou "na fila" depois do envio = fecha com estorno e a
// fila anda; S2 teto de espera e envio do MESMO clipe ao mesmo tempo = um só vence (nunca enviado E estornado); S3 pedido que a fal já entregou
// e ninguém liquidou em 8 min = é ENTREGUE, nunca "preso"; pedido ainda rodando = a vaga é renovada até o teto duro de 20 min; S4 linha lida
// antes (passada longa) nunca manda de novo um clipe que já saiu. Mutantes. Rodar: node scripts/test-recreate-fila-kling-edit-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const FLOW = 'lib/clips/clipFlow.ts', FILA = 'lib/recreate/filaKlingEdit.ts', SRV = 'lib/clips/clipServer.ts'
const KLING = 'kling/v4/video-to-video/edit'
const SUPA = 'https://fixture.supabase.co'
const T0 = Date.parse('2026-11-14T04:00:00Z'), MIN = 60_000
const uid = (n) => `${String(n).padStart(8, '0')}-2222-3333-4444-555555555555`
const foto = (u) => `${SUPA}/storage/v1/object/public/avatars/${u}/face.jpg`
const calado = { error() {}, warn() {}, log() {} }

function mundo(flow, F, o = {}) {
  const s = { rows: new Map(), vaga: null, fal: [], agora: T0, debitos: [], estornos: [], eventos: [], n: 0, poll: new Map() }
  const tick = () => new Promise((r) => setImmediate(r))
  const aberto = (r) => r && (r.status === 'pending' || r.status === 'processing')
  let settleDeps
  const io = {
    now: () => s.agora,
    maisAntigoNaFila: async () => { await tick(); const q = [...s.rows.values()].filter((r) => F.naFila(r)).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)); return q[0]?.id ?? null },
    criarVaga: async (clipId, expiraEm) => { await tick(); if (s.vaga) return false; s.vaga = { clipId, expiraEm, tomadaEm: s.agora }; return true }, // INSERT de id único: atômico
    lerVaga: async () => { await tick(); return s.vaga ? { ...s.vaga } : null },
    apagarVaga: async (clipId) => { if (s.vaga?.clipId === clipId) s.vaga = null },
    renovarVaga: async (clipId, expiraEm) => { if (s.vaga?.clipId === clipId) s.vaga.expiraEm = expiraEm },
    estadoDoDono: async (clipId) => { const r = s.rows.get(clipId); if (!aberto(r)) return 'fechado'; return r.status === 'processing' && r.fal_request_id ? 'no_fornecedor' : 'fora_do_fornecedor' },
    liquidar: async (clipId) => { const d = await flow.settleClip(settleDeps(), { ...s.rows.get(clipId) }); return d.status === 'done' || d.status === 'failed' ? 'fechado' : 'aberto' },
    fecharComEstorno: async (clipId) => { const r = s.rows.get(clipId); if (!aberto(r)) return; Object.assign(r, { status: 'failed', failure_reason: 'queue_stuck', credits_refunded: r.credits }); s.estornos.push(r.billing_reference) },
  }
  const queue = {
    applies: (row) => row.model === KLING,
    queued: (row) => F.naFila(row),
    take: (row, opts) => F.tomarVaga(io, row.id, opts),
    enqueue: async (id) => { const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.fal_request_id) return false; r.failure_reason = F.FILA_MARCA; return true },
    claimSend: async (id) => { const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.fal_request_id || r.failure_reason !== F.FILA_MARCA) return false; r.failure_reason = F.FILA_ENVIANDO; return true },
    expire: async (id) => { const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.failure_reason !== F.FILA_MARCA) return false; Object.assign(r, { status: 'failed', failure_reason: 'queue_timeout', credits_refunded: 0 }); return true },
    setRefunded: async (id, n) => { const r = s.rows.get(id); if (r && r.status === 'failed' && r.credits_refunded === 0) r.credits_refunded = n },
    submit: async (row) => { await tick(); s.fal.push(row.id); if (o.aoEnviarDaFila) await o.aoEnviarDaFila(row, s); return o.envioDaFila?.(row.id) ?? { ok: true, requestId: 'req-' + row.id + '-' + s.fal.length } },
    markSubmitted: async (id, requestId) => { if (o.markSubmittedFalha?.(id)) return false; const r = s.rows.get(id); if (!r || r.status !== 'pending' || r.failure_reason !== F.FILA_ENVIANDO) return false; Object.assign(r, { status: 'processing', fal_request_id: requestId, failure_reason: null }); return true },
    release: (id) => io.apagarVaga(id),
    waitLimitMs: F.FILA_TETO_ESPERA_MS,
  }
  const refund = async (ref) => { if (s.estornos.includes(ref)) return 0; s.estornos.push(ref); return 40 }
  const markFailed = async (id, reason, refunded) => { const r = s.rows.get(id); if (!aberto(r)) return false; Object.assign(r, { status: 'failed', failure_reason: reason, credits_refunded: refunded }); return true }
  const event = async (name, meta) => { s.eventos.push(name + ':' + (meta.clip_id ?? '')) }
  const submitDeps = (comFila = true) => ({
    supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async (u, k) => [...s.rows.values()].find((r) => r.user_id === u && r.idempotency_key === k) ?? null, countActive: async () => 0,
    verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => uid(++s.n),
    insertPending: async (row) => { s.rows.set(row.id, { ...row, created_at: new Date(s.agora + s.n).toISOString() }); return { ok: true } },
    debit: async (ref) => { s.debitos.push(ref); return { ok: true, balance: 60 } }, refund,
    submit: async () => { await tick(); const id = uid(s.n); s.fal.push(id); return o.envioDireto?.(id) ?? { ok: true, requestId: 'req-' + id } },
    markSubmitted: async (id, requestId) => { const r = s.rows.get(id); if (!r || r.status !== 'pending') return false; Object.assign(r, { status: 'processing', fal_request_id: requestId }); return true },
    markFailed, event, now: () => s.agora, ...(comFila ? { queue } : {}),
  })
  settleDeps = () => ({
    poll: async (_m, req) => s.poll.get(req) ?? { state: 'running' },
    persist: async (row) => `https://ours.org/renders/clips/${row.id}.mp4`, refund,
    markDone: async (id, url) => { const r = s.rows.get(id); if (!r || r.status !== 'processing') return false; Object.assign(r, { status: 'done', video_url: url }); return true },
    markFailed, event, now: () => s.agora, queue,
  })
  const pedir = async (userN, model = KLING, comFila = true) => {
    const u = uid(900 + userN)
    const plan = { body: { engine: 'h3', seconds: 5, aspect: null, prompt: 'Replace the dancer in @Video1 with the man from @Image1.', imageUrl: foto(u) }, model, credits: 40, falUsd: 0.94, photos: [foto(u)], input: { prompt: 'p', video_url: `${SUPA}/v.mp4`, image_urls: [foto(u)], resolution: '720p' } }
    const r = await flow.submitClip(submitDeps(comFila), { userId: u, idempotencyKey: 'fila-' + userN + '-' + s.n + '-' + Math.random().toString(36).slice(2, 10), body: plan.body, recreatePlan: plan })
    if (!r.ok) throw new Error('submit: ' + JSON.stringify(r))
    return r.clip.id
  }
  const snap = (id) => ({ ...s.rows.get(id) })
  const liquidar = (id, lida) => flow.settleClip(settleDeps(), lida ?? snap(id))
  const entregue = (id) => s.poll.set(s.rows.get(id).fal_request_id, { state: 'done', url: 'https://v3.fal.media/files/o.mp4' })
  const fechar = (id) => { entregue(id); return liquidar(id) }
  return { s, pedir, liquidar, fechar, entregue, snap, io }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const m = loader({}, over)
  const flow = m('lib/clips/clipFlow'), F = m('lib/recreate/filaKlingEdit')
  const st = (w, id) => w.s.rows.get(id)
  const envios = (w, id) => w.s.fal.filter((x) => x === id).length
  const real = console.error, aviso = console.warn; console.error = calado.error; console.warn = calado.warn
  try {
  await check('2 simultâneos: 1 chamada à fal; o 2º fica na fila, cobrado uma vez', async () => {
    const w = mundo(flow, F)
    const [a, b] = await Promise.all([w.pedir(1), w.pedir(2)])
    if (w.s.fal.length !== 1) throw new Error('chamadas à fal: ' + w.s.fal.length)
    const proc = [a, b].filter((id) => st(w, id).status === 'processing'), fila = [a, b].filter((id) => F.naFila(st(w, id)))
    if (proc.length !== 1 || fila.length !== 1 || w.s.debitos.length !== 2 || w.s.estornos.length) throw new Error(`processing ${proc.length} fila ${fila.length}`)
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
    if (w.s.fal.length !== 2 || envios(w, b) !== 1 || st(w, b).status !== 'processing' || st(w, b).failure_reason !== null || w.s.vaga?.clipId !== b || w.s.debitos.length !== 2) throw new Error('o 2º não saiu: ' + JSON.stringify(st(w, b)))
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
  await check('dois atores do MESMO clipe: um envio só; outro pedido não fecha quem está enviando', async () => {
    let w
    w = mundo(flow, F, { aoEnviarDaFila: async (row) => { if (row.id === w.b) { await w.liquidar(w.c); await w.liquidar(w.b) } } })
    const a = await w.pedir(1); w.b = await w.pedir(2); w.c = await w.pedir(3)
    await w.fechar(a)
    await Promise.all([w.liquidar(w.b), w.liquidar(w.b), w.liquidar(w.b)])
    if (envios(w, w.b) !== 1) throw new Error('envios de b: ' + envios(w, w.b))
    if (st(w, w.b).status !== 'processing' || w.s.estornos.length || w.s.fal.includes(w.c)) throw new Error('quem estava enviando foi fechado, ou o seguinte saiu junto: ' + JSON.stringify(st(w, w.b)))
  })
  await check('S3 (revisor): a fal já entregou e ninguém liquidou em 8 min = ENTREGUE, nunca "preso"', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    w.entregue(a)
    w.s.agora = T0 + 8 * MIN + 1000
    await w.liquidar(b) // quem liquida é o PRÓXIMO da fila
    if (st(w, a).status !== 'done' || st(w, a).failure_reason === 'queue_stuck' || w.s.estornos.length) throw new Error('pedido entregue virou preso: ' + JSON.stringify(st(w, a)))
    await w.liquidar(b)
    if (st(w, b).status !== 'processing' || envios(w, b) !== 1) throw new Error('a fila não andou depois da entrega')
  })
  await check('pedido ainda rodando: a vaga é renovada; no teto duro (20 min) fecha com estorno e a fila anda', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    w.s.agora = T0 + 9 * MIN
    await w.liquidar(b)
    if (st(w, a).status !== 'processing' || w.s.fal.length !== 1 || !(w.s.vaga?.clipId === a && w.s.vaga.expiraEm === w.s.agora + F.VAGA_RENOVA_MS)) throw new Error('aos 9 min: ' + JSON.stringify([st(w, a).status, w.s.vaga]))
    w.s.agora = T0 + 14 * MIN
    await w.liquidar(b)
    if (st(w, a).status !== 'processing' || w.s.fal.length !== 1) throw new Error('fechou antes do teto duro')
    const c = await w.pedir(3)
    w.s.agora = T0 + 21 * MIN // b passou do teto de espera; c ainda não
    await w.liquidar(b) // b esperou 21 min: sai pelo teto de espera, com estorno
    if (st(w, b).failure_reason !== 'queue_timeout' || st(w, b).credits_refunded !== 40 || w.s.fal.includes(b)) throw new Error('b não saiu pelo teto de espera: ' + JSON.stringify([st(w, b).status, st(w, b).failure_reason]))
    await w.liquidar(c)
    if (st(w, a).status !== 'failed' || st(w, a).failure_reason !== 'queue_stuck' || st(w, a).credits_refunded !== 40) throw new Error('teto duro não fechou com estorno: ' + JSON.stringify([st(w, a).status, st(w, a).failure_reason, st(w, a).credits_refunded]))
    if (st(w, c).status !== 'processing' || envios(w, c) !== 1) throw new Error('a fila não andou depois do teto duro: ' + JSON.stringify([st(w, c).status, st(w, c).failure_reason]))
  })
  await check('S1 (revisor): enviou e a gravação do pedido falhou = a vaga vence, o clipe fecha com estorno e a fila anda', async () => {
    let falhar = true
    const w = mundo(flow, F, { markSubmittedFalha: () => falhar })
    const a = await w.pedir(1), b = await w.pedir(2), c = await w.pedir(3)
    await w.fechar(a)
    await w.liquidar(b)
    falhar = false
    if (w.s.vaga?.clipId !== b || st(w, b).status !== 'pending' || envios(w, b) !== 1) throw new Error('cenário: ' + JSON.stringify(st(w, b)))
    w.s.agora = T0 + 6 * MIN
    await w.liquidar(b); await w.liquidar(c)
    if (envios(w, b) !== 1 || w.s.fal.includes(c)) throw new Error('reenviou b ou c passou com a vaga válida')
    w.s.agora = T0 + 9 * MIN
    await w.liquidar(b); await w.liquidar(c)
    if (st(w, b).status !== 'failed' || st(w, b).failure_reason !== 'queue_stuck' || st(w, b).credits_refunded !== 40 || envios(w, b) !== 1) throw new Error('b não fechou com estorno: ' + JSON.stringify(st(w, b)))
    if (st(w, c).status !== 'processing' || envios(w, c) !== 1) throw new Error('a fila não andou: ' + JSON.stringify(st(w, c)))
  })
  await check('S2 (revisor): teto de espera e envio do mesmo clipe ao mesmo tempo = um só vence', async () => {
    let w
    w = mundo(flow, F, { aoEnviarDaFila: async (row, s) => { if (row.id !== w.alvo) return; s.agora = T0 + 15 * MIN + 2000; await w.liquidar(row.id, { ...row }) } }) // o cron, com a linha lida ainda "na fila"
    const a = await w.pedir(1), b = await w.pedir(2); w.alvo = b
    w.s.agora = T0 + 10 * MIN
    const c = await w.pedir(3)
    w.s.agora = T0 + 15 * MIN - 3000
    await w.fechar(a)
    await w.liquidar(b, w.snap(b))
    if (st(w, b).status !== 'processing' || envios(w, b) !== 1 || w.s.estornos.includes('clips-' + b)) throw new Error('enviado E estornado: ' + JSON.stringify(st(w, b)) + ' estornos ' + w.s.estornos.join(','))
    await w.liquidar(c)
    if (w.s.fal.includes(c)) throw new Error('o seguinte foi à fal com o anterior ainda lá')
  })
  await check('S4 (revisor): linha lida antes (passada longa) não manda de novo quem já saiu', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    const velha = w.snap(b)
    await w.fechar(a); await w.liquidar(b); await w.fechar(b)
    w.s.agora += 3 * MIN
    await w.liquidar(b, velha)
    if (envios(w, b) !== 1 || w.s.vaga) throw new Error(`envios de b ${envios(w, b)}, vaga ${JSON.stringify(w.s.vaga)}`)
  })
  await check('regra pura: daFila exige ser o mais antigo NO BANCO; vaga vencida do próprio clipe não manda', async () => {
    const w = mundo(flow, F)
    if (await F.tomarVaga(w.io, uid(77), { daFila: true })) throw new Error('clipe que não está na fila pegou a vaga')
    if (w.s.vaga) throw new Error('criou vaga para quem não está na fila')
    const a = await w.pedir(1)
    w.s.rows.get(a).status = 'pending'; w.s.rows.get(a).fal_request_id = null; w.s.rows.get(a).failure_reason = F.FILA_MARCA
    w.s.agora = T0 + 9 * MIN
    if (await F.tomarVaga(w.io, a, { daFila: true })) throw new Error('vaga vencida do próprio clipe: mandou de novo')
    if (st(w, a).status !== 'failed' || w.s.vaga) throw new Error('não fechou o dono nem soltou a vaga')
  })
  await check('teto de espera: falha com estorno, nada à fal', async () => {
    const w = mundo(flow, F)
    await w.pedir(1); const b = await w.pedir(2)
    w.s.agora = T0 + 15 * MIN + 1000
    const r = await w.liquidar(b)
    if (r.status !== 'failed' || r.failure_reason !== 'queue_timeout' || r.credits_refunded !== 40 || w.s.fal.includes(b) || st(w, b).credits_refunded !== 40) throw new Error(JSON.stringify(r))
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
  await check('KINEO-RECREATE-FILA-REVISAO-3-1411: podeLiquidar false (POST e status) = dono no fornecedor fica ocupado e não é liquidado', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1), b = await w.pedir(2)
    w.entregue(a)
    w.s.agora = T0 + 9 * MIN
    if (await F.tomarVaga(w.io, b, { daFila: true, podeLiquidar: false })) throw new Error('pegou a vaga')
    if (st(w, a).status !== 'processing') throw new Error('liquidou o dono sem poder')
    if (!(await F.tomarVaga(w.io, b, { daFila: true })) || st(w, a).status !== 'done') throw new Error('o cron não resolveu')
  })
  await check('KINEO-RECREATE-FILA-REVISAO-3-1411 (X4): a vigia sem outro pedido — renova até o teto duro e fecha com estorno; vaga perdida fecha depois da espera + teto', async () => {
    const w = mundo(flow, F)
    const a = await w.pedir(1)
    w.s.agora = T0 + 9 * MIN
    if ((await F.vigiarDonoDaVaga(w.io, a, T0)) !== 'resolvido' || st(w, a).status !== 'processing' || w.s.vaga?.expiraEm !== w.s.agora + F.VAGA_RENOVA_MS) throw new Error('9 min: ' + JSON.stringify(w.s.vaga))
    w.s.agora = T0 + 10 * MIN
    if ((await F.vigiarDonoDaVaga(w.io, a, T0)) !== 'nada') throw new Error('vaga válida mexida')
    w.s.agora = T0 + 21 * MIN
    await F.vigiarDonoDaVaga(w.io, a, T0)
    if (st(w, a).status !== 'failed' || st(w, a).failure_reason !== 'queue_stuck' || st(w, a).credits_refunded !== 40 || w.s.vaga) throw new Error('21 min: ' + JSON.stringify([st(w, a).status, st(w, a).failure_reason]))
    const x = mundo(flow, F)
    const c = await x.pedir(1)
    x.s.vaga = null
    x.s.agora = T0 + 20 * MIN
    if ((await F.vigiarDonoDaVaga(x.io, c, T0)) !== 'nada' || st(x, c).status !== 'processing') throw new Error('vaga perdida fechou cedo')
    x.s.agora = T0 + 36 * MIN
    await F.vigiarDonoDaVaga(x.io, c, T0)
    if (st(x, c).failure_reason !== 'queue_stuck' || st(x, c).credits_refunded !== 40) throw new Error('vaga perdida: ' + JSON.stringify(st(x, c)))
  })
  await check('números, marcas e frases', async () => {
    if (F.VAGA_TTL_MS !== 8 * MIN || F.VAGA_RENOVA_MS !== 2 * MIN || F.VAGA_TETO_DURO_MS !== 20 * MIN || F.FILA_TETO_ESPERA_MS !== 15 * MIN || F.FILA_MAX_NA_FRENTE !== 3) throw new Error('números')
    if (F.posicaoNaFila(0, true) !== 2 || F.posicaoNaFila(2, true) !== 4 || F.posicaoNaFila(0, false) !== 1) throw new Error('posição')
    if (F.filaCheia(1, true) || !F.filaCheia(2, true) || !F.filaCheia(3, false) || F.alemDoLimite(2, true) || !F.alemDoLimite(3, true)) throw new Error('fila cheia')
    for (const f of [F.FRASE_FILA_CHEIA, F.FRASE_FILA_FALHOU, F.FRASE_FILA_FALHOU_SEM_ESTORNO, F.FRASE_UM_POR_VEZ, F.esperaNaFila(3).label]) if (/kling|fal\b|seedance/i.test(f)) throw new Error('motor na frase')
    if (flow.QUEUE_MARK !== F.FILA_MARCA || flow.QUEUE_SENDING !== F.FILA_ENVIANDO) throw new Error('as marcas do fluxo diferem das da fila')
    if (/About 2 minutes/.test(F.esperaNaFila(2).label) || F.esperaNaFila(2).minutes !== 7 || !/^In line · position 2 · about 7 minutes$/.test(F.esperaNaFila(2).label)) throw new Error('espera: ' + F.esperaNaFila(2).label)
  })
  } finally { console.error = real; console.warn = aviso }
  const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  await check('servidor: vaga = INSERT de id fixo; fila por MODELO (casa entra); sair da fila, teto e gravação condicionais à marca', async () => {
    if (!s.includes("applies: (row) => row.model === KLING4_EDIT_MODEL,\n    queued: (row) => naFila(row),\n    take: (row, opts) => tomarVaga(io, row.id, { ...opts, podeLiquidar: ctx.liquidarDono === true }),")) throw new Error('applies/take') // reancorado KINEO-RECREATE-FILA-REVISAO-3-1411
    if (!s.includes("admin.from('events').insert({ id: FILA_VAGA_ID, name: FILA_VAGA_EVENTO") || !s.includes("if ((error as { code?: string }).code === '23505') return false")) throw new Error('vaga')
    if (!s.includes(".delete().eq('id', FILA_VAGA_ID).eq('metadata->>clip_id', clipId)")) throw new Error('soltar a vaga de outro clipe')
    // reancorado KINEO-RECREATE-FILA-REVISAO-3-1411: a liquidação leva o ctx (só os crons liquidam o dono da vaga)
    if (!s.includes('queue: clipQueueDepsFor(admin, ctx),') || !s.includes('queue: clipQueueDepsFor(admin),')) throw new Error('fila não ligada nos dois lados')
    if (!s.includes(".update({ failure_reason: FILA_ENVIANDO }).eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).is('fal_request_id', null).select('id')")) throw new Error('claimSend')
    if (!s.includes(".eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_ENVIANDO).select('id')") || !s.includes('comEndUserDaFal(submitToFalOnce, row.user_id)(e.model, semMarcasDaCasa(e.input))')) throw new Error('envio da fila')
    const fecha = s.slice(s.indexOf('async function fecharClipeDaFila('), s.indexOf('function filaIoFor('))
    if (!(fecha.indexOf("status: 'failed', failure_reason: motivo, credits_refunded: 0") > 0 && fecha.indexOf("status: 'failed', failure_reason: motivo, credits_refunded: 0") < fecha.indexOf('refundRenderCredits(fechado.billing_reference)'))) throw new Error('fechar: failed antes do estorno')
    if (!s.includes("const klingEmAndamento = rows.filter((r) => r.model === KLING4_EDIT_MODEL && r.status === 'processing' && !ordered.includes(r))") || !s.includes('  ordered.push(...klingEmAndamento)')) throw new Error('o cron não inclui o Kling em andamento')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const flowSrc = lf(FLOW), fila = lf(FILA), srv = lf(SRV)
const mutantes = [
  ['envio ignora a fila', { [FLOW]: flowSrc.replace('  const fila = deps.queue?.applies(row) ? deps.queue : null\n  if (fila && !(await fila.take(row)', '  const fila = null as ClipQueueDeps | null\n  if (fila && !(await fila.take(row)') }],
  ['vaga válida é tratada como vencida', { [FILA]: fila.replace('    if (vaga.expiraEm > io.now()) return false\n', '') }],
  ['novo fura a fila', { [FILA]: fila.replace('  if (opts.daFila ? primeiro !== clipId : primeiro !== null && primeiro !== clipId) return false\n', '') }],
  ['daFila não confere o banco', { [FILA]: fila.replace('opts.daFila ? primeiro !== clipId : primeiro !== null && primeiro !== clipId', 'primeiro !== null && primeiro !== clipId') }],
  ['vaga vencida do próprio clipe manda de novo', { [FILA]: fila.replace("    if (vaga.clipId === clipId || resolvida === 'ocupada') return false", "    if (resolvida === 'ocupada') return false") }],
  ['vaga vencida nunca é retomada', { [FILA]: fila.replace('    if (vaga.expiraEm > io.now()) return false\n', '    if (vaga.expiraEm > 0) return false\n') }],
  ['pedido entregue vira preso (não liquida antes)', { [FILA]: fila.replace("    if ((await io.liquidar(vaga.clipId)) === 'aberto') {\n      if (io.now() - vaga.tomadaEm < VAGA_TETO_DURO_MS) { await io.renovarVaga(vaga.clipId, io.now() + VAGA_RENOVA_MS); return 'ocupada' }\n      await io.fecharComEstorno(vaga.clipId)\n    }", '    await io.fecharComEstorno(vaga.clipId)') }],
  ['sem teto duro', { [FILA]: fila.replace('if (io.now() - vaga.tomadaEm < VAGA_TETO_DURO_MS) {', 'if (io.now() > 0) {') }],
  ['clipe que ficou fora do fornecedor não é fechado', { [FILA]: fila.replace("  } else if (estado === 'fora_do_fornecedor') {\n    await io.fecharComEstorno(vaga.clipId)\n  }", '  }') }],
  ['quem fecha não solta a vaga', { [FLOW]: flowSrc.replace("await deps.queue.release(row.id).catch(() => {})\n  for (const tarefa of depois)", 'void 0\n  for (const tarefa of depois)') }],
  ['sem teto de espera', { [FLOW]: flowSrc.replace('      if (Number.isFinite(age) && age >= fila.waitLimitMs) {\n', '      if (false) {\n') }],
  ['teto de espera sem conferir a marca', { [FLOW]: flowSrc.replace('        if (!(await fila.expire(row.id))) return row', '        await fila.expire(row.id)') }],
  ['envio sem tirar da fila (claimSend)', { [FLOW]: flowSrc.replace("      if (!(await fila.claimSend(row.id))) { await fila.release(row.id).catch(() => {}); return row }", '      void 0') }],
  ['ambíguo solta a vaga', { [FLOW]: flowSrc.replace(" && after.failure_reason !== 'submit_ambiguous') await deps.queue.release", ') await deps.queue.release') }],
  ['fila só para cliente (casa fora)', { [SRV]: srv.replace('    applies: (row) => row.model === KLING4_EDIT_MODEL,\n    queued:', "    applies: (row) => row.model === KLING4_EDIT_MODEL && !isInternalEmail(row.user_id),\n    queued:") }],
  ['cron sem o Kling em andamento', { [SRV]: srv.replace('  ordered.push(...klingEmAndamento)\n', '') }],
  ['podeLiquidar ignorado', { [FILA]: fila.replace("    if (opts.podeLiquidar === false) return 'ocupada'\n", '') }],
  ['vigia sem resolver a vaga vencida', { [FILA]: fila.replace('    await resolverVagaVencida(io, vaga)\n    return \'resolvido\'', "    return 'resolvido'") }],
  ['vigia fecha vaga perdida cedo', { [FILA]: fila.replace('io.now() - criadoEm < FILA_TETO_ESPERA_MS + VAGA_TETO_DURO_MS', 'io.now() - criadoEm < VAGA_TETO_DURO_MS - 2 * 60_000') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS fila do Kling edit: 2 simultâneos = 1 chamada à fal; o 2º sai depois do 1º; ninguém fura; mesmo clipe = 1 envio; entregue nunca vira preso; vaga renovada até o teto duro; enviado sem gravação fecha com estorno; teto de espera e envio não coincidem; linha velha não reenvia; casa entra na fila; ${mortos}/${mutantes.length} mutantes mortos`)
