// KINEO-RECREATE-FILA-REVISAO-1411 — guardião dos consertos da revisão independente de 14/11 (auditoria, fila e teto do Recreate "com o seu vídeo").
// O revisor achou o que os guardiões não viam porque EXECUTOU o servidor. Este guardião faz o mesmo: carrega o lib/clips/clipServer.ts REAL (e o
// clipFlow, a fila, a porta e o seuVideoServer reais) sobre um Supabase, um SDK da fal e um fetch de MENTIRA (nada sai para a rede) e repete os
// cenários dele, um caso por achado:
//   item 2 (R1, R6, S3)  o cron sempre liquida o Kling em andamento; pedido que a fal já entregou é ENTREGUE, nunca "preso"; vaga vencida de pedido
//                        ainda rodando é renovada; teto duro fecha com estorno; vaga antiga sem `tomada_em` não vira "início zero".
//   item 1 (R2, R4)      failed da fila com estorno que falhou na hora = a varredura horária devolve; a frase só diz "returned" com o estorno gravado.
//   item 4 (S2, S4)      teto de espera e saída da fila são condicionais à marca NO BANCO (linha lida antes não decide nada).
//   item 9 (S5)          vários POST juntos: depois de entrar, quem não é o mais antigo da conta ou ficou além do limite sai com estorno.
//   item 7 (servidor)    quem está na fila recebe posição e espera, com desempate por id.
//   item 12 (R5)         o teto só lê o "seu vídeo" (recreate-uploads/), com a impressão REAL de um clipe do catálogo.
//   item 10 (R3)         a cópia de auditoria tem teto no upload; o evento da trava leva o caminho previsto e a cópia guardada vira evento próprio.
//   itens 5, 6, 8        a porta (decidirPorta): replay passa; um pedido aberto por conta; casa = lista EXATA; leitura que falha vira evento.
//   item 11              todo evento que o servidor grava nesta área está em SERVER_ONLY_EVENTS.
// Mutantes. Rodar: node scripts/test-recreate-fila-revisao-1411.mjs   (≈ 40 s com os mutantes; um caso espera o teto real de 3 s da cópia)
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const SRV = 'lib/clips/clipServer.ts', FILA = 'lib/recreate/filaKlingEdit.ts', PORTA = 'lib/recreate/portaDoSeuVideo.ts', SV = 'lib/recreate/seuVideoServer.ts'
const ROTA = 'app/api/recreate/seu-video/route.ts', STATUS = 'app/api/recreate/status/route.ts', EVENTOS = 'app/api/events/route.ts'
const MIN = 60_000, H = 60 * MIN
const KLING = 'kling/v4/video-to-video/edit', SEEDANCE = 'bytedance/seedance-2.5/reference-to-video', SUPA = 'https://fixture.supabase.co'
const uid = (n) => `${String(n).padStart(8, '0')}-2222-3333-4444-555555555555`

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-mentira-do-guardiao'
process.env.FAL_KEY = 'chave-de-mentira-do-guardiao' // o SDK da fal e o fetch abaixo são de mentira
let redeAgora = null
globalThis.fetch = async (url, init = {}) => {
  const u = String(url)
  redeAgora?.push(`${init.method ?? 'GET'} ${u.split('?')[0]}`)
  if (u.startsWith('https://queue.fal.run/')) return new Response(JSON.stringify({ request_id: 'req-novo-' + (redeAgora?.length ?? 0) }), { status: 200, headers: { 'content-type': 'application/json' } })
  if (u.startsWith('https://v3.fal.media/')) return new Response(new Uint8Array(1024), { status: 200, headers: { 'content-type': 'video/mp4' } })
  return new Response('rede de mentira', { status: 503 })
}

// Supabase de mentira (só o pedaço do supabase-js que clipServer, refund e serverEvents usam). UPDATE … select('id') devolve só o id, como o PostgREST.
function criarBanco() {
  const db = { tables: { clips: [], events: [] }, storage: {}, rpc: {} }
  let seq = 0
  const campo = (row, col) => {
    const m = /^([a-z_]+)->>([a-z_]+)$/i.exec(col)
    if (m) { const v = row[m[1]]?.[m[2]]; return v === undefined || v === null ? null : String(v) }
    return row[col]
  }
  class Q {
    constructor(table) { this.table = table; this.f = []; this.op = 'select'; this.ord = []; this.lim = null; this.um = false; this.ret = null; this.head = false }
    select(cols, opts) { if (this.op === 'select') this.head = !!opts?.head; else this.ret = String(cols ?? '*'); return this }
    insert(row) { this.op = 'insert'; this.payload = row; return this }
    update(patch) { this.op = 'update'; this.payload = patch; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.f.push((r) => campo(r, c) === v); return this }
    neq(c, v) { this.f.push((r) => campo(r, c) !== v); return this }
    is(c, v) { this.f.push((r) => (campo(r, c) ?? null) === v); return this }
    in(c, vs) { this.f.push((r) => vs.includes(campo(r, c))); return this }
    lt(c, v) { this.f.push((r) => campo(r, c) < v); return this }
    lte(c, v) { this.f.push((r) => campo(r, c) <= v); return this }
    gt(c, v) { this.f.push((r) => campo(r, c) > v); return this }
    gte(c, v) { this.f.push((r) => campo(r, c) >= v); return this }
    like(c, p) { const re = new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '[\\s\\S]*') + '$'); this.f.push((r) => re.test(String(campo(r, c) ?? ''))); return this }
    or(expr) {
      const m = /^failure_reason\.is\.null,and\(failure_reason\.like\.(.+)\*,failure_reason\.lt\.(.+)\)$/.exec(expr) // a reserva da trava
      if (!m) throw new Error('or() fora do banco de mentira: ' + expr)
      this.f.push((r) => r.failure_reason == null || (String(r.failure_reason).startsWith(m[1]) && r.failure_reason < m[2]))
      return this
    }
    order(c, o) { this.ord.push([c, o?.ascending !== false]); return this }
    limit(n) { this.lim = n; return this }
    maybeSingle() { this.um = true; return this }
    then(ok, ruim) { return Promise.resolve().then(() => this.run()).then(ok, ruim) }
    run() {
      const t = db.tables[this.table] ?? (db.tables[this.table] = [])
      const bate = (r) => this.f.every((f) => f(r))
      if (this.op === 'insert') {
        const row = { ...this.payload }
        if (this.table === 'events') {
          if (!row.id) row.id = 'ev-' + (++seq)
          if (t.some((r) => r.id === row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "events_pkey"' } }
          row.created_at ??= new Date().toISOString()
        }
        t.push(row)
        return { data: this.ret ? [row] : null, error: null }
      }
      if (this.op === 'update') {
        const hit = t.filter(bate); hit.forEach((r) => Object.assign(r, this.payload))
        return { data: this.ret ? hit.map((r) => (this.ret === 'id' ? { id: r.id } : { ...r })) : null, error: null }
      }
      if (this.op === 'delete') { db.tables[this.table] = t.filter((r) => !bate(r)); return { data: null, error: null } }
      let rows = t.filter(bate)
      for (const [c, asc] of [...this.ord].reverse()) rows = [...rows].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1))
      const count = rows.length
      if (this.lim != null) rows = rows.slice(0, this.lim)
      if (this.head) return { data: null, error: null, count }
      if (this.um) return { data: rows[0] ? { ...rows[0] } : null, error: null }
      return { data: rows.map((r) => ({ ...r })), error: null }
    }
  }
  const client = {
    from: (table) => new Q(table),
    rpc: async (name, args) => (db.rpc[name] ? db.rpc[name](args) : { data: null, error: { message: 'rpc inexistente ' + name } }),
    storage: { from: (bucket) => ({
      upload: async (p, buf) => { (db.storage[bucket] ??= new Map()).set(p, { bytes: buf.byteLength ?? buf.length, created_at: new Date().toISOString() }); return { error: null } },
      list: async (pasta) => ({ data: [...(db.storage[bucket] ?? new Map()).entries()].filter(([k]) => k.startsWith(pasta + '/')).map(([k, v]) => ({ name: k.slice(pasta.length + 1), created_at: v.created_at })), error: null }),
      remove: async (paths) => { for (const p of paths) (db.storage[bucket] ?? new Map()).delete(p); return { data: paths, error: null } },
      getPublicUrl: (p) => ({ data: { publicUrl: `${SUPA}/storage/v1/object/public/${bucket}/${p}` } }),
    }) },
    auth: { getUser: async () => ({ data: { user: null } }) },
  }
  return { db, client }
}

// Os módulos reais são transpilados UMA vez por rodada (carregar); cada caso ganha um banco novo (servidor): o cliente que o código recebe é um
// procurador que aponta para o banco do caso em andamento.
function carregar(over) {
  const ctx = { atual: null }
  const procurador = { from: (t) => ctx.atual.client.from(t), rpc: (n, a) => ctx.atual.client.rpc(n, a), storage: { from: (b) => ctx.atual.client.storage.from(b) }, auth: { getUser: async () => ({ data: { user: null } }) } }
  ctx.load = loader({
    '@supabase/supabase-js': { createClient: () => procurador },
    '@fal-ai/client': { fal: { config: () => {}, queue: {
      status: async (_modelo, { requestId }) => { ctx.atual.consultas.push(requestId); return { status: ctx.atual.fal.get(requestId)?.status ?? 'IN_PROGRESS' } },
      result: async (_modelo, { requestId }) => ({ data: { video: { url: ctx.atual.fal.get(requestId)?.url } } }),
    } } },
    '@/lib/supabase/server': { createClient: () => null }, 'server-only': {},
  }, over)
  return ctx
}
function servidor(ctx) {
  const { db, client } = criarBanco()
  const m = { db, client, fal: new Map(), consultas: [], rede: [], estornos: [], saudavel: true }
  ctx.atual = m
  redeAgora = m.rede
  const pagos = new Set()
  db.rpc.refund_render_credits = async ({ p_render }) => { // idempotente, como o RPC de verdade
    m.estornos.push(p_render)
    if (!m.saudavel) return { data: null, error: { message: 'canceling statement due to statement timeout' } }
    if (pagos.has(p_render)) return { data: 0, error: null }
    pagos.add(p_render); return { data: 40, error: null }
  }
  m.load = ctx.load
  m.srv = m.load('lib/clips/clipServer')
  m.F = m.load('lib/recreate/filaKlingEdit')
  const { idDaVez } = m.load('lib/cronLease')
  m.linha = (id) => db.tables.clips.find((r) => r.id === id)
  m.vagaNoBanco = () => db.tables.events.find((e) => e.name === 'recreate_kling_edit_slot') ?? null
  m.porVaga = (clipId, expiraEmMs, tomadaEmMs) => db.tables.events.push({ id: idDaVez('kling4-edit-vaga'), name: 'recreate_kling_edit_slot', path: '/lib/recreate/filaKlingEdit', metadata: { clip_id: clipId, expira_em: new Date(expiraEmMs).toISOString(), ...(tomadaEmMs ? { tomada_em: new Date(tomadaEmMs).toISOString() } : {}) } })
  m.eventos = (nome) => db.tables.events.filter((e) => e.name === nome)
  m.por = (...rows) => { db.tables.clips.push(...rows); return rows }
  return m
}
function clipe(n, over = {}) {
  const id = uid(n), user = over.user_id ?? uid(900 + n)
  const input = { prompt: 'p', video_url: `${SUPA}/storage/v1/object/public/renders/recreate-uploads/${user}/${uid(700 + n)}.mp4`, image_urls: [`${SUPA}/storage/v1/object/public/avatars/${user}/face.jpg`], resolution: '720p' }
  return { id, user_id: user, idempotency_key: 'chave-' + n + '-abcdefgh', fingerprint: JSON.stringify(['pedido', KLING, input]), billing_reference: 'clips-' + id, engine: 'h3', mode: 'image', model: KLING, seconds: 5, aspect: 'image', prompt: 'p', image_url: input.image_urls[0], credits: 40, fal_usd: 0.94,
    status: 'processing', fal_request_id: 'req-' + n, video_url: null, failure_reason: null, credits_refunded: 0, created_at: new Date(Date.now() - 5 * MIN).toISOString(), ...over }
}
const naFilaHa = (n, minutos, over = {}) => clipe(n, { status: 'pending', fal_request_id: null, failure_reason: 'queue_kling_edit', created_at: new Date(Date.now() - minutos * MIN).toISOString(), ...over })

async function bateria(over = {}, lento = false) {
  const p = []
  const check = async (n, fn) => { const t0 = Date.now(); try { await fn() } catch (e) { p.push(n + ': ' + (e?.message ?? e)) } if (process.env.TEMPO) process.stderr.write(`${Date.now() - t0} ms  ${n.slice(0, 60)}
`) }
  const real = { error: console.error, warn: console.warn, log: console.log }
  console.error = console.warn = console.log = () => {}
  const ctx = carregar(over)
  try {
  await check('item 2 · cron: o Kling em andamento sempre entra na passada; a fal entregou = ENTREGUE, e o próximo da fila sai (R1, R6)', async () => {
    const m = servidor(ctx)
    const { RECREATE_MODEL } = m.load('lib/recreate/generation')
    const [, A, B] = m.por(clipe(1, { model: RECREATE_MODEL, fal_request_id: 'req-x', created_at: new Date(Date.now() - 12 * MIN).toISOString() }), clipe(2, { fal_request_id: 'req-a', created_at: new Date(Date.now() - 4 * MIN).toISOString() }), naFilaHa(3, 3))
    m.porVaga(A.id, Date.now() + 5 * MIN, Date.now() - 3 * MIN)
    m.fal.set('req-a', { status: 'COMPLETED', url: 'https://v3.fal.media/files/a.mp4' }) // um Recreate de catálogo mais antigo (req-x) segue rodando
    await m.srv.advanceActiveClipJobs()
    if (m.linha(A.id).status !== 'done' || !m.linha(A.id).video_url || m.estornos.length) throw new Error('1ª passada: A = ' + JSON.stringify([m.linha(A.id).status, m.linha(A.id).failure_reason, m.consultas]))
    await m.srv.advanceActiveClipJobs()
    const b = m.linha(B.id)
    if (b.status !== 'processing' || !b.fal_request_id || b.failure_reason !== null || m.vagaNoBanco()?.metadata.clip_id !== B.id) throw new Error('2ª passada: B = ' + JSON.stringify([b.status, b.failure_reason, b.fal_request_id]))
    if (m.rede.filter((x) => x.startsWith('POST https://queue.fal.run/')).length !== 1) throw new Error('envios à fal: ' + m.rede.join(' ; '))
  })
  await check('item 2 · vaga vencida com a fal já tendo entregue: o dono é liquidado, nunca "preso" (S3)', async () => {
    const m = servidor(ctx)
    const [A, B] = m.por(clipe(2, { fal_request_id: 'req-a', created_at: new Date(Date.now() - 9 * MIN).toISOString() }), naFilaHa(3, 5))
    m.porVaga(A.id, Date.now() - 1000, Date.now() - 8 * MIN - 1000)
    m.fal.set('req-a', { status: 'COMPLETED', url: 'https://v3.fal.media/files/a.mp4' })
    const pegou = await m.srv.clipQueueDepsFor(m.client).take(B, { daFila: true })
    if (m.linha(A.id).status !== 'done' || m.estornos.length || m.eventos('clip_failed').length) throw new Error('A = ' + JSON.stringify([m.linha(A.id).status, m.linha(A.id).failure_reason]))
    if (!pegou || m.vagaNoBanco()?.metadata.clip_id !== B.id) throw new Error('B não recebeu a vaga depois da entrega')
  })
  await check('item 2 · pedido ainda rodando: a vaga é renovada (inclusive vaga antiga, sem tomada_em); no teto duro fecha com estorno', async () => {
    const m = servidor(ctx)
    const [A, B] = m.por(clipe(2, { fal_request_id: 'req-a', created_at: new Date(Date.now() - 9 * MIN).toISOString() }), naFilaHa(3, 5))
    m.porVaga(A.id, Date.now() - 1000, null) // vaga gravada antes do conserto: sem tomada_em
    if (await m.srv.clipQueueDepsFor(m.client).take(B, { daFila: true })) throw new Error('B pegou a vaga de um pedido que ainda roda')
    if (m.linha(A.id).status !== 'processing' || m.estornos.length || !(Date.parse(m.vagaNoBanco()?.metadata.expira_em) > Date.now())) throw new Error('A = ' + JSON.stringify([m.linha(A.id).status, m.linha(A.id).failure_reason, m.vagaNoBanco()?.metadata]))
    const x = servidor(ctx)
    const [C, D] = x.por(clipe(4, { fal_request_id: 'req-c', created_at: new Date(Date.now() - 22 * MIN).toISOString() }), naFilaHa(5, 5))
    x.porVaga(C.id, Date.now() - 1000, Date.now() - 21 * MIN)
    const pegou = await x.srv.clipQueueDepsFor(x.client).take(D, { daFila: true })
    const c = x.linha(C.id)
    if (c.status !== 'failed' || c.failure_reason !== 'queue_stuck' || c.credits_refunded !== 40 || !x.estornos.includes(C.billing_reference)) throw new Error('teto duro: C = ' + JSON.stringify([c.status, c.failure_reason, c.credits_refunded, x.estornos]))
    const ev = x.eventos('clip_failed')[0]?.metadata
    if (!ev || ev.reason !== 'queue_stuck' || ev.stage !== 'queue' || ev.credits_refunded !== 40 || ev.clip_id !== C.id) throw new Error('evento do preso: ' + JSON.stringify(ev))
    if (!pegou || x.vagaNoBanco()?.metadata.clip_id !== D.id) throw new Error('a fila não andou depois do teto duro')
  })
  await check('item 1 · preso com o estorno em erro: fica failed com 0 e a varredura horária devolve (R2)', async () => {
    const m = servidor(ctx)
    const [A, B] = m.por(clipe(2, { status: 'pending', fal_request_id: null, failure_reason: 'queue_sending', created_at: new Date(Date.now() - 30 * MIN).toISOString() }), naFilaHa(3, 5))
    m.porVaga(A.id, Date.now() - 1000, Date.now() - 9 * MIN)
    m.saudavel = false
    await m.srv.clipQueueDepsFor(m.client).take(B, { daFila: true })
    const a = m.linha(A.id)
    if (a.status !== 'failed' || a.failure_reason !== 'queue_stuck' || a.credits_refunded !== 0 || !m.estornos.includes(A.billing_reference)) throw new Error('A = ' + JSON.stringify([a.status, a.failure_reason, a.credits_refunded, m.estornos]))
    m.saudavel = true
    await m.srv.sweepClipJobs()
    if (m.linha(A.id).credits_refunded !== 40) throw new Error('a varredura não devolveu: estornado = ' + m.linha(A.id).credits_refunded)
  })
  await check('item 1 · teto de espera com o estorno em erro: a varredura horária devolve (R4)', async () => {
    const m = servidor(ctx)
    const flow = m.load('lib/clips/clipFlow')
    const [B] = m.por(naFilaHa(3, 16))
    m.saudavel = false
    const r = await flow.settleClip(m.srv.settleDepsFor(m.client, B.user_id), { ...B })
    if (r.status !== 'failed' || r.failure_reason !== 'queue_timeout' || r.credits_refunded !== 0 || m.linha(B.id).credits_refunded !== 0 || m.rede.some((x) => x.includes('queue.fal.run'))) throw new Error(JSON.stringify([r.status, r.failure_reason, r.credits_refunded]))
    m.saudavel = true
    await m.srv.sweepClipJobs()
    if (m.linha(B.id).credits_refunded !== 40) throw new Error('a varredura não devolveu')
    if (m.F.fraseDaFalhaDaFila(0) !== m.F.FRASE_FILA_FALHOU_SEM_ESTORNO || /returned your credits/.test(m.F.fraseDaFalhaDaFila(0)) || !/will be returned/.test(m.F.fraseDaFalhaDaFila(0))) throw new Error('frase sem estorno gravado promete o estorno')
    if (m.F.fraseDaFalhaDaFila(40) !== m.F.FRASE_FILA_FALHOU || !/returned your credits/.test(m.F.FRASE_FILA_FALHOU)) throw new Error('frase com estorno gravado')
    if (JSON.stringify([...m.F.FILA_MOTIVOS_DE_ESTORNO].sort()) !== JSON.stringify(['queue_full', 'queue_one_per_account', 'queue_stuck', 'queue_timeout'])) throw new Error('motivos de estorno: ' + m.F.FILA_MOTIVOS_DE_ESTORNO)
  })
  await check('item 4 · linha lida antes não decide: quem está sendo mandado não vence; quem já saiu não é mandado de novo (S2, S4)', async () => {
    const m = servidor(ctx)
    const flow = m.load('lib/clips/clipFlow')
    const [B] = m.por(naFilaHa(3, 16))
    const lida = { ...B }
    m.linha(B.id).failure_reason = 'queue_sending' // outro ator ganhou a saída da fila neste instante
    await flow.settleClip(m.srv.settleDepsFor(m.client, B.user_id), lida)
    if (m.linha(B.id).status !== 'pending' || m.linha(B.id).failure_reason !== 'queue_sending' || m.estornos.length) throw new Error('enviando E vencido: ' + JSON.stringify([m.linha(B.id).status, m.linha(B.id).failure_reason, m.estornos]))
    const x = servidor(ctx)
    const [C] = x.por(naFilaHa(4, 3))
    const fila = x.srv.clipQueueDepsFor(x.client)
    if (!(await fila.claimSend(C.id)) || x.linha(C.id).failure_reason !== 'queue_sending') throw new Error('o 1º ator não saiu da fila')
    if (await fila.claimSend(C.id)) throw new Error('dois atores saíram da fila com o mesmo clipe')
    if (await fila.expire(C.id)) throw new Error('venceu quem estava sendo mandado')
    if (!(await fila.markSubmitted(C.id, 'req-c')) || x.linha(C.id).status !== 'processing' || x.linha(C.id).failure_reason !== null) throw new Error('gravação do envio')
    const velha = { ...C } // lida quando ainda estava na fila
    Object.assign(x.linha(C.id), { status: 'done', video_url: 'https://ours.org/c.mp4' })
    await flow.settleClip(x.srv.settleDepsFor(x.client, C.user_id), velha)
    if (x.rede.some((r) => r.includes('queue.fal.run')) || x.vagaNoBanco() || x.linha(C.id).status !== 'done') throw new Error('linha velha reenviou ou prendeu a vaga: ' + x.rede.join(' ; '))
  })
  await check('item 9 · vários POST juntos: depois de entrar, só o mais antigo da conta fica; além do limite da fila sai; tudo com estorno (S5)', async () => {
    const m = servidor(ctx)
    const P = m.load('lib/recreate/portaDoSeuVideo')
    const conta = uid(950)
    const [, a, b, c] = m.por(clipe(1), naFilaHa(11, 1, { user_id: conta, created_at: new Date(Date.now() - 3000).toISOString() }), naFilaHa(12, 1, { user_id: conta, created_at: new Date(Date.now() - 2000).toISOString() }), naFilaHa(13, 1, { user_id: conta, created_at: new Date(Date.now() - 1000).toISOString() }))
    m.porVaga(uid(1), Date.now() + 5 * MIN, Date.now())
    const reconferir = async (row, casa = false) => {
      const estado = await m.srv.filaKlingEditEstado(m.client, row.id)
      const d = P.depoisDeEntrar({ casa, clipId: row.id, abertosDaConta: casa ? null : await m.srv.seuVideoAbertosDaConta(m.client, row.user_id), naFrente: estado ? estado.naFrente : null, vagaOcupada: estado?.vagaOcupada ?? false })
      return d.sair ? ((await m.srv.tirarDaFila(m.client, row.id, d.motivo)) ? d.motivo : 'nao_tirou') : 'fica'
    }
    const r = [await reconferir(a), await reconferir(b), await reconferir(c)]
    if (JSON.stringify(r) !== JSON.stringify(['fica', 'queue_one_per_account', 'queue_one_per_account'])) throw new Error('mesma conta: ' + JSON.stringify(r))
    for (const x of [b, c]) { const l = m.linha(x.id); if (l.status !== 'failed' || l.failure_reason !== 'queue_one_per_account' || l.credits_refunded !== 40 || !m.estornos.includes(x.billing_reference)) throw new Error('saiu sem estorno: ' + JSON.stringify([l.status, l.failure_reason, l.credits_refunded])) }
    if (m.linha(a.id).status !== 'pending' || m.estornos.includes(a.billing_reference) || m.eventos('clip_failed').length !== 2) throw new Error('o mais antigo foi tocado, ou faltou evento')
    // contas diferentes, vaga ocupada: 1 + 4 novos na fila → o que ficou com 3 na frente sai (posição 5)
    const novos = m.por(naFilaHa(21, 0, { created_at: new Date(Date.now() - 900).toISOString() }), naFilaHa(22, 0, { created_at: new Date(Date.now() - 800).toISOString() }), naFilaHa(23, 0, { created_at: new Date(Date.now() - 700).toISOString() }), naFilaHa(24, 0, { created_at: new Date(Date.now() - 600).toISOString() }))
    const s = []
    for (const n of novos) s.push(await reconferir(n))
    if (JSON.stringify(s) !== JSON.stringify(['fica', 'fica', 'queue_full', 'queue_full'])) throw new Error('limite da fila: ' + JSON.stringify(s))
    if (m.linha(novos[3].id).credits_refunded !== 40) throw new Error('fila cheia sem estorno')
    // quem já saiu da fila não é tirado (UPDATE condicional), e a casa só sai pelo limite da fila
    Object.assign(m.linha(novos[0].id), { status: 'processing', fal_request_id: 'req-n', failure_reason: null })
    if (await m.srv.tirarDaFila(m.client, novos[0].id, 'queue_full') || m.linha(novos[0].id).status !== 'processing') throw new Error('tirou da fila quem já estava no fornecedor')
    if (P.depoisDeEntrar({ casa: true, clipId: 'x', abertosDaConta: ['a', 'x'], naFrente: 0, vagaOcupada: true }).sair) throw new Error('a casa saiu pelo "um por vez"')
    if (P.depoisDeEntrar({ casa: false, clipId: 'x', abertosDaConta: null, naFrente: null, vagaOcupada: false }).sair) throw new Error('leitura que falhou tirou o pedido')
  })
  await check('item 7 · quem está na fila recebe posição e espera; empate de milissegundo desempata por id', async () => {
    const m = servidor(ctx)
    const quando = new Date(Date.now() - MIN).toISOString()
    const [maior, menor] = m.por(naFilaHa(32, 1, { created_at: quando }), naFilaHa(31, 1, { created_at: quando })) // inseridos fora da ordem do id
    const e1 = await m.srv.filaKlingEditEstado(m.client, menor.id), e2 = await m.srv.filaKlingEditEstado(m.client, maior.id), e0 = await m.srv.filaKlingEditEstado(m.client)
    if (e1.naFrente !== 0 || e2.naFrente !== 1 || e0.naFila !== 2 || e0.naFrente !== 2 || e1.vagaOcupada) throw new Error(JSON.stringify([e1, e2, e0]))
    if (JSON.stringify(await m.srv.seuVideoAbertosDaConta(m.client, menor.user_id)) !== JSON.stringify([menor.id])) throw new Error('abertos da conta')
    const espera = m.F.esperaNaFila(m.F.posicaoNaFila(e2.naFrente, true))
    if (espera.label !== 'In line · position 3 · about 11 minutes' || espera.minutes !== 11 || /About 2 minutes/.test(espera.label)) throw new Error('espera: ' + JSON.stringify(espera))
  })
  await check('item 12 · o teto só lê o "seu vídeo": a impressão REAL de um clipe do catálogo fica fora (R5)', async () => {
    const m = servidor(ctx)
    const sv = m.load('lib/recreate/seuVideoServer'), T = m.load('lib/recreate/tetoNaoTrocou'), flow = m.load('lib/clips/clipFlow'), generation = m.load('lib/recreate/generation')
    const conta = uid(960), foto = `${SUPA}/storage/v1/object/public/avatars/${conta}/face.jpg`
    const plano = generation.planRecreate({ format: 'passarela', seconds: m.load('lib/recreate/formats').recreateFormat('passarela').seconds, photos: [foto], consent: true, mode: 'swap' }, { userId: conta, supabaseUrl: SUPA, paying: false })
    if (!plano.ok) throw new Error('plano do catálogo: ' + JSON.stringify(plano))
    let gravada = null
    await flow.submitClip({ supabaseUrl: SUPA, engineAccess: () => ({ ok: true }), findByKey: async () => null, countActive: async () => 0, verifyImage: async () => {}, moderate: async () => ({ ok: true }), getBalance: async () => 100, newId: () => uid(61),
      insertPending: async (row) => { gravada = row; return { ok: true } }, debit: async () => ({ ok: true, balance: 60 }), refund: async () => 40, submit: async () => ({ ok: true, requestId: 'r' }), markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, now: () => Date.now() },
    { userId: conta, idempotencyKey: 'catalogo-revisao-1411', body: plano.plan.body, recreatePlan: plano.plan })
    if (!gravada || gravada.fingerprint.includes('/recreate-uploads/')) throw new Error('a impressão do catálogo mudou: ' + String(gravada?.fingerprint).slice(0, 120))
    const falhou = (n, horas, motivo, extra = {}) => clipe(n, { user_id: conta, status: 'failed', failure_reason: motivo, credits_refunded: 40, settled_at: new Date(Date.now() - horas * H).toISOString(), created_at: new Date(Date.now() - horas * H - 3 * MIN).toISOString(), ...extra })
    m.por(falhou(71, 2, 'swap_unchanged', { model: SEEDANCE, fingerprint: gravada.fingerprint }), falhou(72, 5, 'swap_unchanged', { model: SEEDANCE, fingerprint: gravada.fingerprint }))
    const soCatalogo = await sv.lerNaoTrocouDaConta(m.client, conta)
    if (!Array.isArray(soCatalogo) || soCatalogo.length !== 0 || !T.decidirTeto({ casa: false, pagante: false, resultados: soCatalogo, agoraMs: Date.now() }).ok) throw new Error('o catálogo contou no teto: ' + JSON.stringify(soCatalogo))
    m.por(falhou(73, 1, 'swap_partial'), falhou(74, 3, 'swap_unchanged'), falhou(75, 1, 'queue_stuck'), falhou(76, 1, 'swap_uncertain'))
    const lidas = await sv.lerNaoTrocouDaConta(m.client, conta)
    const d = T.decidirTeto({ casa: false, pagante: false, resultados: lidas, agoraMs: Date.now() })
    if (lidas.length !== 2 || d.ok || d.usados !== 2) throw new Error('seu vídeo: ' + JSON.stringify([lidas.length, d]))
  })
  await check('item 10 · evento da trava com o caminho previsto; cópia guardada = evento próprio; bucket privado', async () => {
    const m = servidor(ctx)
    const A = clipe(5)
    const trava = m.srv.recreateSwapDepsFor(m.client, A.user_id)
    await trava.record(A, { result: 'unchanged', reason: 'fixture' }, { delivered: false, credits_refunded: 40 })
    await trava.record(A, { result: 'swapped', reason: 'fixture' }, { delivered: true, credits_refunded: 0 })
    const [reprovado, entregue] = m.eventos('recreate_swap_check').map((e) => e.metadata)
    if (reprovado?.audit_bucket !== 'quarantine' || reprovado.audit_path !== `recreate-nao-trocou/${A.id}.mp4` || entregue?.audit_path !== null || entregue.audit_bucket !== null) throw new Error(JSON.stringify([reprovado?.audit_path, entregue?.audit_path]))
    const audit = await trava.keepRejected(A, 'https://v3.fal.media/files/reprovado.mp4', 9000)
    if (audit?.bucket !== 'quarantine' || audit.path !== `recreate-nao-trocou/${A.id}.mp4` || audit.bytes !== 1024) throw new Error('cópia: ' + JSON.stringify(audit))
    if (Object.keys(m.db.storage).join(',') !== 'quarantine') throw new Error('a cópia saiu do bucket privado: ' + Object.keys(m.db.storage))
    await trava.recordAudit(A, audit)
    const ev = m.eventos('recreate_swap_audit')[0]?.metadata
    if (!ev || ev.clip_id !== A.id || ev.path !== audit.path || ev.bytes !== 1024 || !ev.expires_at) throw new Error('evento da cópia: ' + JSON.stringify(ev))
  })
  if (lento) await check('item 10 · upload pendurado não segura ninguém: a cópia inteira tem teto (R3)', async () => {
    const m = servidor(ctx)
    const A = clipe(5)
    const de = m.client.storage.from
    m.client.storage.from = (b) => ({ ...de(b), upload: () => new Promise(() => {}) })
    let relogio
    const fim = await Promise.race([m.srv.recreateSwapDepsFor(m.client, A.user_id).keepRejected(A, 'https://v3.fal.media/files/reprovado.mp4', 49_000).then((r) => ({ r })), new Promise((ok) => { relogio = setTimeout(() => ok('pendurada'), 4500) })])
    clearTimeout(relogio)
    if (fim === 'pendurada' || fim.r !== null) throw new Error('a cópia ficou pendurada no upload (orçamento era 3 s): ' + JSON.stringify(fim))
  })
  await check('itens 5, 6, 8 · a porta: replay passa; um pedido aberto por conta; casa = lista EXATA; leitura que falha vira evento', async () => {
    const m = servidor(ctx)
    const P = m.load('lib/recreate/portaDoSeuVideo'), acesso = m.load('lib/recreate/access'), contas = m.load('lib/internalAccounts')
    const agoraMs = Date.now()
    const naoTrocou = (h) => ({ failure_reason: 'swap_unchanged', settled_at: new Date(agoraMs - h * H).toISOString() })
    const cheio = { casa: false, pagante: false, abertos: 3, resultados: [naoTrocou(1), naoTrocou(2)], fila: { naFila: 9, vagaOcupada: true }, agoraMs }
    if (P.decidirPorta({ ...cheio, replay: true }) !== null) throw new Error('o replay da mesma chave foi recusado')
    const um = P.decidirPorta({ ...cheio, replay: false })
    if (um?.code !== 'already_in_progress' || um.status !== 429 || um.extra.charged !== false || um.error !== m.F.FRASE_UM_POR_VEZ || !/Nothing was charged\.$/.test(um.error)) throw new Error('um por vez: ' + JSON.stringify(um))
    if (P.decidirPorta({ ...cheio, replay: false, abertos: 0 })?.code !== 'swap_cap') throw new Error('sem aberto, o teto recusa')
    const fila = P.decidirPorta({ ...cheio, replay: false, abertos: 0, resultados: [] })
    if (fila?.code !== 'queue_full' || fila.extra.charged !== false) throw new Error('fila cheia: ' + JSON.stringify(fila))
    if (P.decidirPorta({ ...cheio, replay: false, casa: true, fila: { naFila: 0, vagaOcupada: true } }) !== null) throw new Error('a casa foi recusada pelo "um por vez" ou pelo teto')
    if (P.decidirPorta({ ...cheio, replay: false, casa: true })?.code !== 'queue_full') throw new Error('a casa furou a fila cheia')
    if (P.decidirPorta({ replay: false, casa: false, pagante: false, abertos: null, resultados: null, fila: null, agoraMs }) !== null) throw new Error('leitura que falhou trancou o cliente')
    if (JSON.stringify(P.leiturasQueFalharam({ casa: false, abertos: null, resultados: null, filaEsperada: true, fila: null })) !== JSON.stringify(['open_requests', 'swap_cap', 'queue'])) throw new Error('leituras que falharam')
    if (P.leiturasQueFalharam({ casa: true, abertos: null, resultados: null, filaEsperada: false, fila: null }).length || P.leiturasQueFalharam({ casa: false, abertos: 0, resultados: [], filaEsperada: true, fila: { naFila: 0, vagaOcupada: false } }).length) throw new Error('alarme falso de leitura')
    if (P.PORTA_UM_POR_VEZ !== 'already_in_progress' || P.PORTA_LEITURA_FALHOU_EVENTO !== 'recreate_seu_video_gate_unavailable') throw new Error('nomes')
    for (const e of contas.INTERNAL_EXACT_EMAILS) if (!acesso.releaseVisible(e, 'internal')) throw new Error('conta da casa fora da lista exata')
    const largo = contas.INTERNAL_LIKE_PATTERNS[0].replace(/%/g, 'zz').replace(/_/g, 'z')
    if (!contas.isInternalEmail(largo) || contas.INTERNAL_EXACT_EMAILS.includes(largo)) throw new Error('amostra do padrão largo não serve')
    if (acesso.releaseVisible(largo, 'internal')) throw new Error('padrão largo de métrica virou autorização de casa')
  })
  const rota = (over[ROTA] ?? lf(ROTA)).replace(/\/\/[^\n]*/g, ''), status = (over[STATUS] ?? lf(STATUS)).replace(/\/\/[^\n]*/g, '')
  await check('rota do pedido: replay antes da porta; porta antes do vídeo e da cobrança; evento de leitura; reconferência depois de entrar; espera', async () => {
    const i = (x) => rota.indexOf(x)
    const iReplay = i('const replay = key ? !!(await deps.findByKey(user.id, key).catch(() => null)) : false'), iPorta = i('const recusa = decidirPorta({ replay, casa, pagante,'), iVideo = i('const v = await lerVideoDoCliente('), iCobra = i('await submitClip(deps, {')
    if (iReplay < 0 || !(iReplay < iPorta && iPorta < iVideo && iVideo < iCobra)) throw new Error('ordem: ' + [iReplay, iPorta, iVideo, iCobra])
    if (!rota.includes("const casa = releaseVisible(user.email, 'internal')") || !rota.includes('const [abertos, resultados, fila] = replay ? [null, null, null] : await Promise.all([') || !rota.includes('casa ? Promise.resolve([] as string[]) : seuVideoAbertosDaConta(admin, user.id),')) throw new Error('leituras da porta')
    if (!rota.includes('if (falhas.length) await writeServerEvent({ name: PORTA_LEITURA_FALHOU_EVENTO,')) throw new Error('leitura que falha sem evento')
    const iDepois = i('if (esperando && !result.replay) {')
    if (!(iDepois > iCobra) || !rota.includes('depoisDeEntrar({ casa, clipId: result.clip.id, abertosDaConta: casa ? null : await seuVideoAbertosDaConta(admin, user.id), naFrente: estado ? estado.naFrente : null, vagaOcupada: estado?.vagaOcupada ?? false })') || !rota.includes('if (depois.sair && (await tirarDaFila(admin, result.clip.id, depois.motivo))) {') || !rota.includes('refunded: true }, 429)')) throw new Error('reconferência depois de entrar')
    if (!rota.includes('const estado = esperando ? await filaKlingEditEstado(admin, result.clip.id) : null') || !rota.includes('wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes')) throw new Error('posição e espera na resposta')
  })
  await check('rota de status: posição por id e espera para quem está na fila; frase da falha só com o estorno gravado', async () => {
    if (!status.includes('const estadoDaFila = esperando ? await filaKlingEditEstado(admin, fresh.id) : null') || !status.includes('wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes')) throw new Error('espera')
    if (!status.includes("FILA_MOTIVOS_DE_ESTORNO.includes(fresh.failure_reason) ? { reason: 'queue_failed', message: fraseDaFalhaDaFila(credits_refunded) } : {}")) throw new Error('frase da falha')
    if (!status.includes('...reason, ...seuVideo, ...fila, ...filaFalhou } }')) throw new Error('a espera da fila não ganha das outras mensagens')
  })
  await check('item 11 · todo evento que o servidor grava nesta área está em SERVER_ONLY_EVENTS', async () => {
    const ev = over[EVENTOS] ?? lf(EVENTOS)
    const ini = ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')
    const lista = new Set([...ev.slice(ini, ev.indexOf('])', ini)).matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]))
    const nomes = new Set(['clip_queued', 'recreate_kling_edit_slot', 'recreate_seu_video_swap_cap', 'recreate_seu_video_gate_unavailable', 'recreate_swap_audit', 'recreate_swap_check', 'recreate_seu_video_prompt', 'recreate_seu_video_som_prova', 'recreate_seu_video_refused', 'content_moderation_download_retry', 'content_moderation_unavailable', 'content_moderation_blocked', 'clip_engine_fallback'])
    for (const f of [SRV, 'lib/clips/clipFlow.ts', ROTA, STATUS, 'app/api/recreate/seu-video/check/route.ts', 'lib/safety/contentModeration.ts', FILA, PORTA, 'lib/recreate/tetoNaoTrocou.ts', 'lib/recreate/swapCheck.ts']) {
      if (!fs.existsSync(f)) continue
      const t = lf(f)
      for (const x of t.matchAll(/(?:\bname: |\bevent\(|clipEvent\([^)]*\)\()'([a-z0-9_]+)'/g)) nomes.add(x[1])
      for (const x of t.matchAll(/export const [A-Z0-9_]*EVENTO?(?:_[A-Z]+)? = '([a-z0-9_]+)'/g)) nomes.add(x[1])
    }
    const fora = [...nomes].filter((n) => !lista.has(n))
    if (fora.length) throw new Error('fora da lista: ' + fora.join(', '))
    if (nomes.size < 18) throw new Error('a coleta de nomes quebrou: ' + nomes.size)
  })
  } finally { Object.assign(console, real) }
  return p
}

const real = await bateria({}, true)
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const srv = lf(SRV), fila = lf(FILA), porta = lf(PORTA), sv = lf(SV), rota = lf(ROTA), status = lf(STATUS), eventos = lf(EVENTOS)
const mutantes = [
  ['cron sem o Kling em andamento', { [SRV]: srv.replace('  ordered.push(...klingEmAndamento)\n', '') }],
  ['vaga vencida: não liquida o dono antes', { [SRV]: srv.replace('const depois = await settleClip(settleDepsFor(admin, dono.user_id), dono).catch(() => dono)', 'const depois = dono') }],
  ['vaga sem tomada_em = início zero', { [SRV]: srv.replace('tomadaEm: Number.isFinite(tomada) ? tomada : expiraEm - VAGA_TTL_MS', 'tomadaEm: Number.isFinite(tomada) ? tomada : 0') }],
  ['preso fecha sem estornar', { [SRV]: srv.replace('const refunded = await refundRenderCredits(fechado.billing_reference)', 'const refunded = 0') }],
  ['varredura sem os motivos da fila (consulta)', { [SRV]: srv.replace(".in('failure_reason', [...SWAP_REFUND_SWEEP_REASONS, ...FILA_MOTIVOS_DE_ESTORNO])", ".in('failure_reason', [...SWAP_REFUND_SWEEP_REASONS])") }],
  ['varredura sem os motivos da fila (regra)', { [SRV]: srv.replace("(motivo) => isRecreateNotSwappedReason(motivo) || (typeof motivo === 'string' && FILA_MOTIVOS_DE_ESTORNO.includes(motivo))", '(motivo) => isRecreateNotSwappedReason(motivo)') }],
  ['teto de espera sem conferir a marca', { [SRV]: srv.replace("        .eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).select('id')", "        .eq('id', id).eq('status', 'pending').select('id')") }],
  ['saída da fila sem conferir a marca', { [SRV]: srv.replace(".update({ failure_reason: FILA_ENVIANDO }).eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).is('fal_request_id', null).select('id')", ".update({ failure_reason: FILA_ENVIANDO }).eq('id', id).eq('status', 'pending').is('fal_request_id', null).select('id')") }],
  ['tirar da fila quem já saiu', { [SRV]: srv.replace("q = condicao === 'na_fila' ? q.eq('status', 'pending').eq('failure_reason', FILA_MARCA) : q.in('status', ['pending', 'processing'])", "q = q.in('status', ['pending', 'processing'])") }],
  ['posição sem desempate por id', { [SRV]: srv.replace(".order('created_at', { ascending: true }).order('id', { ascending: true }).limit(50)", ".order('created_at', { ascending: true }).limit(50)") }],
  ['evento da trava sem o caminho previsto', { [SRV]: srv.replace('audit_path: outcome.delivered ? null : caminhoDaAuditoria(row.id),', 'audit_path: null,') }],
  ['upload sem teto', { [SRV]: srv.replace('try { return await Promise.race([copia, estourou]) } finally { clearTimeout(relogio) }', 'try { return await copia } finally { clearTimeout(relogio) }') }, true],
  ['o catálogo conta no teto', { [SV]: sv.replace(".like('fingerprint', `%/${SEU_VIDEO_PASTA}/%`)", '') }],
  ['replay recusado pela porta', { [PORTA]: porta.replace('  if (e.replay) return null\n', '') }],
  ['sem "um pedido por vez"', { [PORTA]: porta.replace('(e.abertos ?? 0) >= 1', '(e.abertos ?? 0) >= 99') }],
  ['casa recusada pelo "um por vez"', { [PORTA]: porta.replace('  if (!e.casa && (e.abertos ?? 0) >= 1)', '  if ((e.abertos ?? 0) >= 1)') }],
  ['depois de entrar: a conta fica com vários', { [PORTA]: porta.replace('a.abertosDaConta.length > 1 && a.abertosDaConta[0] !== a.clipId', 'a.abertosDaConta.length > 99') }],
  ['depois de entrar: sem limite da fila', { [PORTA]: porta.replace('  if (a.naFrente !== null && alemDoLimite(a.naFrente, a.vagaOcupada)) return { sair: true, motivo: FILA_MOTIVOS.cheia }\n', '') }],
  ['leitura que falha em silêncio', { [PORTA]: porta.replace("  if (!e.casa && e.abertos === null) out.push('open_requests')\n", '') }],
  ['frase promete estorno que não aconteceu', { [FILA]: fila.replace('(creditsRefunded > 0 ? FRASE_FILA_FALHOU : FRASE_FILA_FALHOU_SEM_ESTORNO)', '(FRASE_FILA_FALHOU)') }],
  ['rota: replay não é conferido', { [ROTA]: rota.replace('const replay = key ? !!(await deps.findByKey(user.id, key).catch(() => null)) : false', 'const replay = false') }],
  ['rota: sem reconferência depois de entrar', { [ROTA]: rota.replace('    if (esperando && !result.replay) {', '    if (false) {') }],
  ['status: frase fixa de estorno', { [STATUS]: status.replace('message: fraseDaFalhaDaFila(credits_refunded)', 'message: FRASE_FILA_FALHOU') }],
  ['status: fila sem a espera', { [STATUS]: status.replace('...(posicao ? { wait_label: esperaNaFila(posicao).label, wait_minutes: esperaNaFila(posicao).minutes } : {})', '') }],
  ['evento da fila que o navegador pode forjar', { [EVENTOS]: eventos.replace("'recreate_kling_edit_slot'", "'recreate_kling_edit_slot_x'") }],
]
let mortos = 0
for (const [n, over, lento] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over, !!lento)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS revisão da fila, do teto e da auditoria (servidor real, banco de mentira): Kling em andamento sempre liquidado; entregue nunca vira preso; estorno que falhou volta na varredura; marca conferida no banco; vários POST juntos saem com estorno; posição e espera para a fila; teto só no "seu vídeo"; cópia com teto e evento próprio; porta com replay, um por vez e casa exata; eventos só do servidor; ${mortos}/${mutantes.length} mutantes mortos`)
process.exit(0)
