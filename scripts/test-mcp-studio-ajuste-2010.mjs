// KINEO-MCP-STUDIO-AJUSTE-2010 — guardião do ajuste do conector "Kineo Studio" (fundador 20/10, depois do 1º filme real no
// Claude, job fa216362, e no ChatGPT, job 6ce0763f). EXECUTA lib/mcp/studioTools.ts e lib/mcp/studioOauth.ts de verdade (TS via
// registerHooks com o alias `@/`), com DUBLÊS: banco em memória, rota do site falsa com um razão de créditos, sessão falsa,
// relógio falso. Zero rede, zero banco real, zero render pago.
//   (T) TÍTULO: o title de kineo_create_video (dispatch.title) chega a videos.title quando o status/lista vê o filme pronto —
//       só se NULL, só no vídeo da conta; título existente nunca é sobrescrito; vídeo de outra conta nunca é tocado.
//   (R) ESTORNO: (a) falha no despacho — sem resposta, 5xx, `pending` — grava o job com o corpo, a mesma idempotency_key
//       NUNCA cobra de novo, e o status reenvia a MESMA geração para a rota fechar (liquidar ou estornar); 4xx = nada cobrado,
//       nenhum job. (b) falha depois (cron too_few / sweep libera o claim, vídeo failed, claim que nunca nasceu) → o status diz
//       refunded/failed e o razão do dublê volta ao saldo de antes. E o caminho REAL da rota, lido no código: o refund-sweep
//       só olha claim 'settled' (por isso o reenvio é obrigatório), o reenvio cai em settleDebitAndRespond / estorno do
//       pending vencido, o cron estorna o too_few.
//   (C) CÓPIA: herói separa Kineo MCP (não renderiza/cobra) de Kineo Studio (faz o filme e gasta créditos); tela de
//       consentimento sem "in Claude" fixo — nomeia o app pelo host do redirect (Claude/ChatGPT) ou fica neutra.
//   (U) TUTORIAL: passos do ChatGPT (Developer mode, OAuth, "I trust this application", Plus) em EN e PT, na seção do
//       Kineo Studio e na aba ChatGPT do painel, com a URL da fonte única.
//   (D) DESENHO: paleta clara nos tokens da home; vídeos velhos fora da página; vitrine de 9 (3 UGC, 3 produto, 3 filmes) com
//       arquivos e pôsteres que existem, mudos/loop/playsInline/autoplay/pôster; ChatGPT no ar no topo; nada de engineWall /
//       homeVideoCuration / /api/mcp tocado.
//   (F) DESFAZ: desfeita a entrega, cada arquivo declarado é a base; o diff só toca arquivos declarados + novos.
//   (M) MUTANTES em disco: tirar o reenvio, tirar o job da falha, tirar o `.is('title', null)` ou o reenvio do status
//       deixa (R)/(T) vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { registerHooks } from 'node:module'
import { randomBytes } from 'node:crypto'
import {
  MARCA_MCP_STUDIO_AJUSTE_2010, MCP_STUDIO_AJUSTE_2010_ARQUIVOS, MCP_STUDIO_AJUSTE_2010_BASE, MCP_STUDIO_AJUSTE_2010_NOVOS, semMcpStudioAjuste2010,
} from './test-support/desfaz-mcp-studio-ajuste-2010.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const read = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const raw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${MCP_STUDIO_AJUSTE_2010_BASE}:${rel}`)) } catch { return null } }
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const pick = (abs) => [abs, abs + '.ts', abs + '.tsx', path.join(abs, 'index.ts')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile())
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const file = pick(path.join(ROOT, specifier.slice(2)))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:') && context.parentURL.includes('/lib/')) {
      const file = pick(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href)

const F = {
  tools: 'lib/mcp/studioTools.ts',
  oauth: 'lib/mcp/studioOauth.ts',
  authorize: 'app/api/mcp/studio/oauth/authorize/route.ts',
  section: 'app/claude-connector/StudioSection.tsx',
  panel: 'app/claude-connector/ConnectPanel.tsx',
  palette: 'app/claude-connector/palette.ts',
  page: 'app/claude-connector/page.tsx',
  grid: 'app/claude-connector/ShowcaseGrid.tsx',
  route: 'app/api/generate-video-cinematic/route.ts',
  refund: 'lib/credits/refund.ts',
  cron: 'app/api/cron/finish-stranded-renders/route.ts',
  doc: 'docs/MCP-STUDIO-AJUSTE-2026-10-20.md',
}
const S = Object.fromEntries(Object.entries(F).map(([k, rel]) => [k, read(rel)]))
const T = await load(F.tools)
const O = await load(F.oauth)
const CL = await load('lib/cinematic/claim.ts')

// ─── dublês ──────────────────────────────────────────────────────────────────
const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
function world(startMs = Date.parse('2026-10-20T23:00:00Z')) {
  const clock = { t: startMs }
  const tables = { mcp_studio_jobs: [], events: [], videos: [] }
  const writes = []
  const ledger = { balance: 100, debits: new Map() } // generationId → { amount, refunded }
  const get = (row, col) => {
    if (col.includes('->>')) { const [c, k] = col.split('->>'); const o = row[c]; const v = o && typeof o === 'object' ? o[k] : undefined; return v === undefined || v === null ? null : String(v) }
    return row[col] === undefined ? null : row[col]
  }
  function from(table) {
    const st = { filters: [], op: 'select', head: false, single: false, orderBy: null, lim: null }
    const match = (r) => st.filters.every(([k, c, v]) => {
      const x = get(r, c)
      if (k === 'eq') return x !== null && String(x) === String(v)
      if (k === 'in') return v.map(String).includes(String(x))
      if (k === 'is') return v === null ? x === null : x === v
      if (k === 'gte') return x !== null && String(x) >= String(v)
      return true
    })
    const run = () => {
      const rows = (tables[table] ??= [])
      if (st.op === 'insert') {
        const row = { id: randomBytes(8).toString('hex'), created_at: new Date(clock.t).toISOString(), ...st.row }
        if (table === 'mcp_studio_jobs' && row.idempotency_key && rows.some((r) => r.user_id === row.user_id && r.idempotency_key === row.idempotency_key)) return { data: null, error: { message: 'duplicate key' } }
        rows.push(row); writes.push({ table, op: 'insert', row }); return { data: null, error: null }
      }
      if (st.op === 'update') {
        const hit = rows.filter(match); for (const r of hit) Object.assign(r, st.patch)
        writes.push({ table, op: 'update', patch: st.patch, filters: st.filters.map((f) => f.slice()), count: hit.length }); return { data: null, error: null }
      }
      let out = rows.filter(match)
      if (st.orderBy) { const [c, asc] = st.orderBy; out = out.slice().sort((a, b) => (String(get(a, c)) < String(get(b, c)) ? -1 : 1) * (asc ? 1 : -1)) }
      if (st.lim) out = out.slice(0, st.lim)
      if (st.head) return { count: out.length, error: null }
      if (st.single) return { data: out[0] ?? null, error: null }
      return { data: out, error: null }
    }
    const api = {
      select(_c, o) { if (o?.head) st.head = true; return api },
      eq(c, v) { st.filters.push(['eq', c, v]); return api },
      in(c, v) { st.filters.push(['in', c, v]); return api },
      is(c, v) { st.filters.push(['is', c, v]); return api },
      gte(c, v) { st.filters.push(['gte', c, v]); return api },
      order(c, o) { st.orderBy = [c, o?.ascending !== false]; return api },
      limit(n) { st.lim = n; return api },
      maybeSingle() { st.single = true; return api },
      insert(row) { st.op = 'insert'; st.row = row; return api },
      update(p) { st.op = 'update'; st.patch = p; return api },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) },
    }
    return api
  }
  // A rota do site (dublê do contrato de /api/generate-video-cinematic): `answers` decide cada POST; o razão debita na
  // 1ª vez que a geração "passa do claim" e estorna quando a rota libera.
  const posts = []
  let answers = []
  const claimOf = (gen) => tables.events.find((e) => e.name === CL.CINEMATIC_CLAIM_EVENT && e.session_id === gen)
  const setClaim = (gen, status) => {
    const c = claimOf(gen)
    if (c) c.metadata.status = status
    else tables.events.push({ id: CL.cinematicClaimId(USER, gen), user_id: USER, name: CL.CINEMATIC_CLAIM_EVENT, session_id: gen, metadata: { status }, created_at: new Date(clock.t).toISOString() })
  }
  const debit = (gen, amount) => { if (!ledger.debits.has(gen)) { ledger.debits.set(gen, { amount, refunded: false }); ledger.balance -= amount } }
  const refund = (gen) => { const d = ledger.debits.get(gen); if (d && !d.refunded) { d.refunded = true; ledger.balance += d.amount } }
  const io = {
    mint: async () => ({ ok: true, session: { cookie: 'sb-x-auth-token=base64-x', accessToken: 'a', dispose: async () => { io.disposed++ } } }),
    disposed: 0,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      posts.push({ url, body, n: posts.length })
      const a = answers.shift()
      if (!a) throw new Error('no answer scripted')
      return a(body)
    },
    sleep: async (ms) => { clock.t += ms },
    now: () => clock.t,
  }
  const json = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data })
  const ctx = { db: { from }, userId: USER, email: 'teste01@shortsforgeai.com', origin: 'http://internal', publicOrigin: 'https://www.usekineo.com' }
  return { clock, tables, writes, ledger, posts, io, ctx, json, setClaim, debit, refund, claimOf, script: (...a) => { answers = a } }
}
const input = (over = {}) => ({ format: 'film', prompt: 'A lighthouse keeper finds a bottle.', scriptMode: 'ai', engine: 'seedance', duration: 15, language: 'en', aspect: '9:16', idempotencyKey: null, title: 'The Lighthouse Keeper\'s Bottle', ...over })
const creditWrites = (w) => w.writes.filter((x) => !['mcp_studio_jobs', 'videos'].includes(x.table))

// ─── (T) título ──────────────────────────────────────────────────────────────
{
  const w = world()
  const gen = 'gen-title-0001'
  w.tables.mcp_studio_jobs.push({ id: 'j1', user_id: USER, generation_id: gen, engine: 'seedance', duration: 15, credits: 9, status: 'processing', created_at: new Date(w.clock.t).toISOString(), format: 'film', dispatch: { http_status: 200, title: 'The Last Train Home' } })
  w.setClaim(gen, 'settled')
  w.tables.events.push({ id: 'c1', user_id: USER, name: 'compose_submission_claim', session_id: gen, metadata: { render_id: 'r-1' }, created_at: new Date(w.clock.t).toISOString() })
  w.tables.videos.push({ id: 'v1', user_id: USER, render_id: 'r-1', title: null, status: 'completed', video_url: 'https://x/v1.mp4', created_at: 'a' })
  w.tables.videos.push({ id: 'v9', user_id: OTHER, render_id: 'r-1', title: null, status: 'completed', video_url: 'https://x/v9.mp4', created_at: 'a' })
  w.clock.t += 6 * 60 * 1000
  const r = await T.studioVideoStatus(w.ctx, gen, w.io)
  const up = w.writes.find((x) => x.table === 'videos' && x.op === 'update')
  ok(r.ok && r.data.status === 'completed' && r.data.title === 'The Last Train Home' && w.tables.videos[0].title === 'The Last Train Home', '(T1) status completed: videos.title ganha o título pedido e o status devolve o título')
  ok(up && up.filters.some(([k, c, v]) => k === 'eq' && c === 'user_id' && v === USER) && up.filters.some(([k, c, v]) => k === 'is' && c === 'title' && v === null) && up.filters.some(([k, c, v]) => k === 'eq' && c === 'id' && v === 'v1'), '(T2) a escrita é .eq(id).eq(user_id).is(title, null) — só o vídeo desta conta, só se vazio')
  ok(w.tables.videos[1].title === null, '(T3) vídeo de OUTRA conta com o mesmo render_id fica intocado')
  w.tables.videos[0].title = 'Nome que a pessoa deu na biblioteca'
  const r2 = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(r2.data.title === 'Nome que a pessoa deu na biblioteca' && w.tables.videos[0].title === 'Nome que a pessoa deu na biblioteca', '(T4) título já existente NUNCA é sobrescrito')
  w.tables.videos[0].title = null
  w.tables.videos.push({ id: 'v2', user_id: USER, render_id: 'r-site', title: null, status: 'completed', video_url: 'https://x/v2.mp4', created_at: 'b' })
  const l = await T.studioListVideos(w.ctx, 5)
  const byId = Object.fromEntries(l.data.videos.map((v) => [v.id, v.title]))
  ok(l.ok && byId.v1 === 'The Last Train Home' && byId.v2 === null && w.tables.videos.find((v) => v.id === 'v2').title === null, '(T5) kineo_list_videos: o vídeo do job do conector ganha o título; vídeo do site sem job fica como está')
  ok(T.studioJobTitle({ title: '  x  ' }) === 'x' && T.studioJobTitle({ title: '' }) === null && T.studioJobTitle(null) === null && T.studioJobTitle({ title: 'a'.repeat(300) }).length === 120, '(T6) título saneado (apara, vazio = nada, teto 120)')
}

// ─── (R) estorno ─────────────────────────────────────────────────────────────
// (a1) 5xx com débito: job gravado com o corpo; o status reenvia a MESMA geração; a rota estorna e libera → refunded, saldo de volta.
{
  const w = world()
  w.script((b) => { w.setClaim(b.generationId, 'pending'); w.debit(b.generationId, 9); return w.json(503, { error: 'Scene planning failed and your automatic refund is still being confirmed. Please retry this same generation.' }) })
  const r = await T.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-5xx-01' }), 9, w.io)
  const job = w.tables.mcp_studio_jobs[0]
  const gen = w.posts[0].body.generationId
  ok(!r.ok && r.details.job_id === gen && job && job.generation_id === gen && job.dispatch.replay?.generationId === gen && job.dispatch.title === input().title && /returned automatically/.test(r.error) && !/Nothing was charged/.test(r.error), '(Ra1) 5xx depois do débito: job gravado com o corpo e o título; a mensagem NÃO diz "nada cobrado", aponta o kineo_video_status')
  ok(creditWrites(w).length === 0 && w.io.disposed === 1, '(Ra2) o conector não escreve crédito nenhum (quem debita/estorna é a rota) e encerra a sessão cunhada')
  w.clock.t += 3 * 60 * 1000
  w.script((b) => { ok(JSON.stringify(b) === JSON.stringify(w.posts[0].body), '(Ra3) o reenvio do status manda o MESMO corpo (mesma geração, mesma impressão digital do claim)'); w.refund(b.generationId); w.setClaim(b.generationId, 'released'); return w.json(409, { error: 'expired and refunded', creditsRefunded: 9, start_new_generation: true }) })
  const s1 = await T.studioVideoStatus(w.ctx, gen, w.io)
  const s2 = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(w.posts.length === 2 && s1.ok && s2.data.status === 'refunded' && w.ledger.balance === 100, `(Ra4) status reenvia uma vez, a rota estorna: o próximo status diz refunded e o saldo volta a 100 (${w.ledger.balance})`)
  const again = await T.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-5xx-01' }), 9, w.io)
  ok(again.ok && again.data.reused === true && again.data.status === 'refunded' && w.posts.length === 2 && w.ledger.debits.size === 1, '(Ra5) mesma idempotency_key depois da falha: devolve o MESMO job, nenhum POST novo, nenhum débito novo')
}
// (a2) sem resposta (rede caiu / estourou o prazo): job gravado; retry com a mesma chave não cobra de novo.
{
  const w = world()
  w.script(() => { throw new Error('socket hang up') })
  const r = await T.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-timeout-1' }), 9, w.io)
  ok(!r.ok && r.details.reason === 'dispatch_timeout' && w.tables.mcp_studio_jobs.length === 1 && r.details.job_id === w.posts[0].body.generationId, '(Ra6) sem resposta: job gravado (o status vai saber se o filme começou)')
  const again = await T.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-timeout-1' }), 9, w.io)
  ok(again.ok && again.data.reused === true && w.posts.length === 1, '(Ra7) retry com a mesma chave = o mesmo job, NENHUM POST novo (antes: geração nova = cobrança dupla)')
  w.clock.t += 6 * 60 * 1000
  const s = await T.studioVideoStatus(w.ctx, w.posts[0].body.generationId, w.io)
  ok(s.data.status === 'failed' && /nothing stays charged/.test(s.data.message) && w.posts.length === 1, '(Ra8) a rota nunca criou o claim (logo nunca debitou): depois de 5 min o status diz failed, nada cobrado, sem reenvio')
}
// (a3) `pending` → o create reenvia a MESMA geração até fechar; 1 job, 1 débito.
{
  const w = world()
  const pend = (b) => { w.setClaim(b.generationId, 'done'); w.debit(b.generationId, 9); return w.json(503, { error: 'Your AI scenes are safe while we finalize the submission.', pending: true, retry_after_ms: 2500 }) }
  w.script(pend, pend, (b) => { w.setClaim(b.generationId, 'settled'); return w.json(200, { credits_charged: 9, falRequestIds: ['a', 'b', 'c'] }) })
  const r = await T.studioCreateVideo(w.ctx, input(), 9, w.io)
  const same = w.posts.every((p) => JSON.stringify(p.body) === JSON.stringify(w.posts[0].body))
  ok(r.ok && r.data.status === 'processing' && w.posts.length === 3 && same && w.tables.mcp_studio_jobs.length === 1 && w.ledger.debits.size === 1 && w.ledger.balance === 91, '(Ra9) pending, pending, 200: 3 POSTs com o MESMO corpo, 1 job, 1 débito (o filme segue)')
}
// (a4) `pending` até o fim do prazo → job com corpo; o status reenvia depois; a rota estorna o pending vencido → refunded.
{
  const w = world()
  const pend = (b) => { w.setClaim(b.generationId, 'pending'); w.debit(b.generationId, 9); return w.json(409, { error: 'This AI generation is already being submitted.', pending: true, retry_after_ms: 2500 }) }
  w.script(...Array.from({ length: T.STUDIO_PENDING_REPLAYS + 1 }, () => pend))
  const r = await T.studioCreateVideo(w.ctx, input(), 9, w.io)
  const gen = w.posts[0].body.generationId
  ok(!r.ok && r.details.reason === 'pending' && r.details.job_id === gen && w.posts.length === T.STUDIO_PENDING_REPLAYS + 1, `(Ra10) pending o tempo todo: ${w.posts.length} POSTs da mesma geração e o job fica gravado com o corpo`)
  w.clock.t += 30 * 1000
  const early = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(early.data.status === 'processing' && w.posts.length === T.STUDIO_PENDING_REPLAYS + 1, '(Ra11) antes de 2 min o status NÃO reenvia (o despacho original ainda pode fechar sozinho)')
  w.clock.t += 3 * 60 * 1000
  w.script((b) => { w.refund(b.generationId); w.setClaim(b.generationId, 'released'); return w.json(409, { error: 'Your previous AI submission expired and 9 credits were refunded automatically.', creditsRefunded: 9, start_new_generation: true }) })
  await T.studioVideoStatus(w.ctx, gen, w.io)
  const s = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(s.data.status === 'refunded' && w.ledger.balance === 100, '(Ra12) depois de 2 min o status reenvia; a rota estorna o pending vencido → refunded, saldo de volta a 100')
}
// (a5) 4xx = recusa antes de cobrar: nada de job, "Nothing was charged".
{
  const w = world()
  w.script(() => w.json(402, { error: 'This engine needs a plan.', reason: 'plan_ai_engine', balance: 0 }))
  const r = await T.studioCreateVideo(w.ctx, input(), 9, w.io)
  ok(!r.ok && /Nothing was charged/.test(r.error) && /\/pricing/.test(r.error) && w.tables.mcp_studio_jobs.length === 0 && w.posts.length === 1, '(Ra13) 402: link de planos, nada cobrado, nenhum job, nenhum reenvio')
  w.script(() => w.json(422, { error: 'Your script is too long. Nothing was charged.', charged: false }))
  const r2 = await T.studioCreateVideo(w.ctx, input(), 9, w.io)
  ok(!r2.ok && r2.details.reason === 'http_422' && w.tables.mcp_studio_jobs.length === 0, '(Ra14) 422: recusa sem job')
}
// (b) falha depois do despacho: o claim é liberado pelo cron (too_few) / sweep, ou o vídeo falha.
{
  const w = world()
  w.script((b) => { w.setClaim(b.generationId, 'settled'); w.debit(b.generationId, 9); return w.json(200, { credits_charged: 9 }) })
  const r = await T.studioCreateVideo(w.ctx, input(), 9, w.io)
  const gen = r.data.job_id
  w.clock.t += 8 * 60 * 1000
  const mid = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(mid.data.status === 'processing' && mid.data.stage === 'generating_scenes' && w.posts.length === 1, '(Rb1) claim settled sem montagem ainda: processing, e NUNCA reenvia um claim já liquidado')
  w.refund(gen); w.setClaim(gen, 'released') // o que o cron finish-stranded-renders faz no too_few (refundRenderCredits + releaseCinematicClaim)
  const s = await T.studioVideoStatus(w.ctx, gen, w.io)
  ok(s.data.status === 'refunded' && w.tables.mcp_studio_jobs[0].status === 'refunded' && w.ledger.balance === 100, '(Rb2) render falhou depois (cron estornou e liberou o claim): status refunded, job refunded, saldo de volta')
  const w2 = world()
  const gen2 = 'gen-failed-vid-01'
  w2.tables.mcp_studio_jobs.push({ id: 'j2', user_id: USER, generation_id: gen2, engine: 'seedance', duration: 15, credits: 9, status: 'processing', created_at: new Date(w2.clock.t).toISOString(), format: 'film', dispatch: { title: 'x' } })
  w2.setClaim(gen2, 'settled')
  w2.tables.events.push({ id: 'c2', user_id: USER, name: 'compose_submission_claim', session_id: gen2, metadata: { render_id: 'r-f' } })
  w2.tables.videos.push({ id: 'vf', user_id: USER, render_id: 'r-f', title: null, status: 'failed', created_at: 'a' })
  const s2 = await T.studioVideoStatus(w2.ctx, gen2, w2.io)
  ok(s2.data.status === 'failed' && /returns the credits/.test(s2.data.message) && w2.tables.videos[0].title === null, '(Rb3) vídeo failed na montagem: status failed com "créditos devolvidos" (e falha não ganha título)')
}
// O caminho REAL do estorno, lido no código (o que os dublês acima imitam).
ok(/if \(textField\(birthMeta\.status\) !== 'settled'\) continue/.test(S.refund) && /`pending`\/`done` are handled by the birth route/.test(S.refund), "(Rc1) refund-sweep só estorna claim 'settled'; 'pending'/'done' são da rota de nascimento — por isso o conector PRECISA reenviar a geração")
ok(/if \(acquired\.kind === 'replay'\) \{\n\s+return settleDebitAndRespond\(acquired\.claim, acquired\.response\)/.test(S.route) && /reason: staleDebit \? 'stale_pending_refunded' : 'stale_pending_no_debit'/.test(S.route) && /if \(staleDebit && !alreadyRefunded && !\(await confirmCinematicRefund\(\)\)\)/.test(S.route), '(Rc2) rota: reenvio da mesma geração = settleDebitAndRespond (liquida) ou, pending vencido, estorno confirmado + claim liberado')
ok(/if \(current\.debitConfirmed\) \{\n\s+const refundConfirmed = await confirmCinematicRefund\(\)/.test(S.route), '(Rc3) rota: falha depois do débito só libera o claim com o estorno confirmado (releaseBirthClaim)')
ok(/const refunded = billingReference \? await refundRenderCredits\(billingReference\) : 0/.test(S.cron) && /reason: 'provider_failed_refunded'/.test(S.cron), '(Rc4) cron finish-stranded-renders: too_few = refundRenderCredits + claim liberado (o status lê released = refunded)')
ok(/claimStatus === 'released'[\s\S]{0,120}finish\('refunded'\)/.test(S.tools) && /claimStatus === 'pending' \|\| claimStatus === 'done'/.test(S.tools), '(Rc5) studioVideoStatus: released → refunded; reenvio só para pending/done')

// ─── (C) cópia ───────────────────────────────────────────────────────────────
const heroVis = code(S.page)
ok(/Kineo MCP never renders a video, never creates an account and never charges anything/.test(heroVis.replace(/\s+/g, ' ')) && /<strong>Kineo Studio<\/strong>[\s\S]{0,260}spending your account&apos;s credits/.test(S.page) && !/The connector never renders a video/.test(S.page), '(C1) herói: "nunca renderiza/cobra" é do Kineo MCP; o Kineo Studio faz o filme e gasta os créditos da conta')
ok(O.studioClientApp('https://chatgpt.com/connector/oauth/MFqQ3YG_LGPO', 'ChatGPT') === 'ChatGPT' && O.studioClientApp('https://claude.ai/api/mcp/auth_callback', 'Claude') === 'Claude', '(C2) app pelo host do redirect: chatgpt.com → ChatGPT, claude.ai → Claude')
ok(O.studioClientApp('https://evil.example/cb', 'Claude') === 'Claude' && O.studioClientApp('https://evil.example/cb', '<script>Free credits</script>') === null && O.studioClientApp('http://localhost:3118/callback', 'Claude Code') === 'Claude Code', '(C3) client_name só vale se for um nome conhecido (texto livre da DCR nunca vira frase)')
ok(O.studioRevokeWhere('ChatGPT') === 'in ChatGPT' && O.studioRevokeWhere(null) === 'in the app you connected (Claude, ChatGPT…)' && O.studioBackTo(null).startsWith('Go back to the app you were connecting'), '(C4) revogação: "in ChatGPT" / neutra quando não sabe')
ok(!/removing the connector in Claude|Go back to Claude|inside Claude is not open/.test(S.authorize) && /removing the connector \$\{esc\(studioRevokeWhere\(app\)\)\}/.test(S.authorize) && /studioClientApp\(params\.redirect_uri, clientName\)/.test(S.authorize) && /spend your credits/.test(S.authorize), '(C5) tela de consentimento sem "Claude" fixo: revoga/volta pelo app que pediu; segue dizendo que gasta créditos')

// ─── (U) tutorial do ChatGPT ─────────────────────────────────────────────────
const sec = S.section
ok(/Settings → Apps & Connectors \(called Plugins in some versions\) → Advanced settings → turn on Developer mode/.test(sec) && /Plus or higher/.test(sec) && /Authentication: OAuth and tick “I trust this application”/.test(sec) && /Click Allow on the Kineo screen/.test(sec) && /enable Kineo Studio from the “\+” \/ Developer mode menu/.test(sec), '(U1) seção Kineo Studio: passos do ChatGPT em inglês (Developer mode → Create → OAuth → trust → Allow → "+")')
ok(/Configurações → Apps e Conectores \(em algumas versões, Plugins\) → Configurações avançadas → ligue o Modo desenvolvedor/.test(sec) && /Plus ou superior/.test(sec) && /Autenticação: OAuth/.test(sec) && /menu “\+” \/ Modo desenvolvedor/.test(sec), '(U2) …e em português, mesmos passos')
ok(/\{steps\(STEPS_CHATGPT_EN\)\}/.test(sec) && /\{steps\(STEPS_CHATGPT_PT\)\}/.test(sec) && /\{steps\(STEPS_EN\)\}/.test(sec) && /\{steps\(STEPS_PT\)\}/.test(sec) && /remove the connector in the app you\n?\s*connected \(Claude or ChatGPT\)/.test(sec) && /remova o conector no app em que você conectou \(Claude ou ChatGPT\)/.test(sec), '(U3) EN e PT renderizam Claude E ChatGPT; revogar = no app em que conectou')
const gptTab = (S.panel.match(/\{tab === 'chatgpt' && \([\s\S]*?\n      \)\}/) || [''])[0]
ok(/Developer mode/.test(gptTab) && /OAuth/.test(gptTab) && /I trust this application/.test(gptTab) && /Plus or higher/.test(gptTab) && /<CopyField value=\{CLAUDE_STUDIO_MCP_SERVER_URL\}/.test(gptTab) && !/usekineo\.com\/api\/mcp/.test(gptTab) && !/Coming soon/.test(gptTab), '(U4) aba ChatGPT do painel: no ar, passos do Developer mode, URL do Kineo Studio da fonte única')
ok(/\{ key: 'chatgpt', label: 'ChatGPT' \}/.test(S.panel) && /in review/.test(gptTab) && !/\b(Pro|Max|Team|Enterprise|Free) plan\b/.test(code(gptTab)) && !/phone/i.test(code(gptTab)), '(U5) aba sem "soon"; a loja do ChatGPT segue "in review" (nota pequena); sem afirmar plano do Claude, sem "phone"')

// ─── (D) desenho ─────────────────────────────────────────────────────────────
const lum = (hex) => { const h = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const pal = Object.fromEntries([...S.palette.matchAll(/^\s+([a-zA-Z]+): '(#[0-9a-fA-F]{6})',/gm)].map((m) => [m[1], m[2]]))
ok(pal.bg && lum(pal.bg) > 0.9 && lum(pal.card) > 0.95 && lum(pal.text) < 0.1 && pal.accent.toUpperCase() === '#0A5CFF' && pal.bg.toUpperCase() === '#F7F7F5', `(D1) paleta CLARA nos tokens da home (bg ${pal.bg}, texto ${pal.text}, ação ${pal.accent})`)
ok(!/<video/.test(S.page) && !/\/previews\//.test(code(S.page)) && !/\n\s+clip: /.test(S.page), '(D2) os vídeos velhos dos cartões de pedido saíram da página (nenhum <video> nem /previews/ no page.tsx)')
const groups = [...S.grid.matchAll(/key: '(ugc|product|films)',[\s\S]*?clips: \[([\s\S]*?)\n    \],/g)].map((m) => ({ key: m[1], clips: [...m[2].matchAll(/\{ src: '([^']+)', poster: '([^']+)', title: '([^']+)', badge: '([^']+)' \}/g)].map((c) => ({ src: c[1], poster: c[2], title: c[3], badge: c[4] })) }))
const all = groups.flatMap((g) => g.clips)
ok(groups.map((g) => `${g.key}:${g.clips.length}`).join() === 'ugc:3,product:3,films:3', `(D3) vitrine de 9: 3 UGC, 3 produto, 3 filmes (${groups.map((g) => `${g.key}:${g.clips.length}`).join(' ')})`)
const missing = all.flatMap((c) => [c.src, c.poster]).filter((p) => !fs.existsSync(path.join(ROOT, 'public', p)))
ok(all.length === 9 && missing.length === 0 && new Set(all.map((c) => c.src)).size === 9, `(D4) os 9 vídeos e os 9 pôsteres já existem em public/ (nenhum render novo) e não se repetem (${missing.join(', ') || 'ok'})`)
const used = [read('lib/ui/homeThreeCards.ts'), read('lib/ads/v2Flow.ts'), read('lib/ui/homeTwoDoors.ts')].join('\n')
const unused = all.filter((c) => { const name = path.basename(c.src, '.mp4'); return !used.includes(name.replace(/^door-/, '')) && !used.includes(c.src) })
ok(unused.length === 0, `(D5) todo clipe já é usado no site (cards da home, amostras do Studio Ads, porta da home) — ${unused.map((c) => c.src).join(', ') || 'ok'}`)
ok(/autoPlay\n\s+muted\n\s+loop\n\s+playsInline\n\s+preload="none"/.test(S.grid) && /poster=\{c\.poster\}/.test(S.grid) && /src=\{near \? c\.src : undefined\}/.test(S.grid) && /IntersectionObserver/.test(S.grid), '(D6) vídeos mudos, autoplay, loop, playsInline, pôster, e só carregam perto da tela (leve)')
ok(/<ShowcaseGrid \/>/.test(S.page) && /^import ShowcaseGrid from '\.\/ShowcaseGrid'/m.test(S.page) && /gridTemplateColumns: 'repeat\(3, minmax\(0, 1fr\)\)'/.test(S.grid), '(D7) a página mostra a vitrine; grade de 3 colunas encolhíveis (sem rolagem lateral no celular)')
ok(/Live in Claude/.test(S.page) && /Live in ChatGPT/.test(S.page) && /\{ key: 'chatgpt', label: 'ChatGPT' \},\n\]/.test(S.page) && !/· soon/.test(S.page), '(D8) topo: "Live in Claude" e "Live in ChatGPT"; azulejo do ChatGPT sem "soon"')
ok(!/['"`]#[0-9a-fA-F]{3,8}\b/.test(code(S.grid)) && !/['"`]#[0-9a-fA-F]{3,8}\b/.test(code(S.section)), '(D9) cores só da paleta (vitrine e seção)')
for (const rel of ['lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'app/api/mcp/route.ts', 'lib/mcp/kineoMcp.ts', 'lib/mcp/connectorHandoff.ts', 'app/api/generate-video-cinematic/route.ts', 'app/api/compose/route.ts']) {
  ok(base(rel) !== null && read(rel) === base(rel), `(D10) ${rel} intocado byte a byte`)
}
ok(/MCP_STUDIO_LIVE|Kineo Studio/.test(S.doc) && /ChatGPT/.test(S.doc) && /reenvi/.test(S.doc), '(D11) doc da entrega registra o que mudou (título, reenvio, ChatGPT, página)')

// ─── (F) desfaz ──────────────────────────────────────────────────────────────
for (const rel of MCP_STUDIO_AJUSTE_2010_ARQUIVOS) {
  const b = base(rel)
  const cur = raw(rel)
  ok(b !== null && cur.includes(MARCA_MCP_STUDIO_AJUSTE_2010) && lf(semMcpStudioAjuste2010(cur, rel)) === b && (!cur.includes('\r\n') || semMcpStudioAjuste2010(cur, rel).includes('\r\n')), `(F1) ${rel}: leva a marca e, desfeita a entrega, é EXATAMENTE a base ${MCP_STUDIO_AJUSTE_2010_BASE.slice(0, 9)}`)
}
for (const rel of MCP_STUDIO_AJUSTE_2010_NOVOS) {
  ok(fs.existsSync(path.join(ROOT, rel)) && base(rel) === null && read(rel).includes(MARCA_MCP_STUDIO_AJUSTE_2010), `(F2) ${rel}: novo e leva a marca`) // a tabela .json leva a marca nas linhas novas
}
const changed = [...new Set([...git('diff', '--name-only', MCP_STUDIO_AJUSTE_2010_BASE).split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].filter(Boolean))]
const declared = [...MCP_STUDIO_AJUSTE_2010_ARQUIVOS, ...MCP_STUDIO_AJUSTE_2010_NOVOS]
ok(changed.every((f) => declared.includes(f)), `(F3) o diff contra a base só toca arquivos declarados (${changed.filter((f) => !declared.includes(f)).join(', ') || 'ok'})`)
const commits = git('log', '--format=%s', `${MCP_STUDIO_AJUSTE_2010_BASE}..HEAD`).split('\n').filter(Boolean)
ok(commits.every((s) => s.includes(MARCA_MCP_STUDIO_AJUSTE_2010)), `(F4) todo commit da entrega leva a marca (${commits.length})`)
ok(semMcpStudioAjuste2010('sem marca', F.page) === 'sem marca' && semMcpStudioAjuste2010(raw(F.page), 'outro/arquivo.ts') === raw(F.page), '(F5) desfaz idempotente fora do alvo')
{
  const V = read('scripts/test-support/desfaz-verbatim-intocavel-2010.mjs')
  ok(/import \{ semMcpStudioAjuste2010 \} from '\.\/desfaz-mcp-studio-ajuste-2010\.mjs'/.test(V) && /export function semVerbatimIntocavel2010NaCadeia\(texto, p\) \{\n\s+texto = semMcpStudioAjuste2010\(texto, p\)/.test(V) && /export function semVerbatimIntocavel2010\(caminho, src\) \{\n\s+if \(typeof src !== 'string'\) return src\n\s+src = semMcpStudioAjuste2010\(src, rel\(caminho\)\)/.test(V) && /texto = semVerbatimIntocavel2010NaCadeia\(texto, p\)/.test(read('scripts/test-support/desfaz-avatar-preso-2010.mjs')), '(F6) encadeado: a camada de antes (verbatim, chamada primeiro por semAvatarPreso2010) tira esta camada primeiro')
  let lancou = false
  try { semMcpStudioAjuste2010(raw('scripts/test-mcp-studio-2010.mjs') + '\n// linha a mais ' + MARCA_MCP_STUDIO_AJUSTE_2010, 'scripts/test-mcp-studio-2010.mjs') } catch { lancou = true }
  ok(lancou, '(F7) acréscimo marcado a mais num arquivo linha-a-linha → o desfaz explode (nunca devolve base falsa)')
}

// ─── (M) mutantes em disco ───────────────────────────────────────────────────
async function withMutant(label, from, to, fn) {
  const src = raw(F.tools)
  const mut = src.split(from).join(to)
  ok(mut !== src, `(${label}a) mutante aplicou`)
  const rel = `lib/mcp/.mutante-${randomBytes(4).toString('hex')}.ts`
  try {
    fs.writeFileSync(path.join(ROOT, rel), mut)
    const MT = await load(rel)
    await fn(MT)
  } finally {
    fs.rmSync(path.join(ROOT, rel), { force: true })
  }
}
await withMutant('M1', '      if (!isPendingAnswer(res.status, data)) break', '      break', async (MT) => {
  const w = world()
  const pend = (b) => { w.setClaim(b.generationId, 'done'); w.debit(b.generationId, 9); return w.json(503, { pending: true, retry_after_ms: 2500 }) }
  w.script(pend, (b) => { w.setClaim(b.generationId, 'settled'); return w.json(200, { credits_charged: 9 }) })
  const r = await MT.studioCreateVideo(w.ctx, input(), 9, w.io)
  ok(!r.ok && w.posts.length === 1, '(M1b) sem o reenvio do pending, o create desiste no 1º POST → (Ra9) vermelho')
})
await withMutant('M2', "  if (!res || isPendingAnswer(res.status, data) || res.status >= 500) {", '  if (false) {', async (MT) => {
  const w = world()
  w.script(() => { throw new Error('x') }, () => w.json(200, { credits_charged: 9 }))
  await MT.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-mut-002' }), 9, w.io).catch(() => null)
  await MT.studioCreateVideo(w.ctx, input({ idempotencyKey: 'claude-req-mut-002' }), 9, w.io).catch(() => null)
  ok(w.posts.length === 2 && w.posts[0].body.generationId !== w.posts[1].body.generationId, '(M2b) sem o job da falha, a mesma chave dispara uma geração NOVA (cobrança dupla) → (Ra7) vermelho')
})
await withMutant('M3', ".eq('user_id', ctx.userId).is('title', null)", ".eq('user_id', ctx.userId)", async (MT) => {
  const w = world()
  const gen = 'gen-mut-title-1'
  w.tables.mcp_studio_jobs.push({ id: 'j', user_id: USER, generation_id: gen, engine: 'seedance', duration: 15, credits: 9, status: 'processing', created_at: new Date(w.clock.t).toISOString(), format: 'film', dispatch: { title: 'Pedido' } })
  w.tables.events.push({ id: 'c', user_id: USER, name: 'compose_submission_claim', session_id: gen, metadata: { render_id: 'r' } })
  w.tables.videos.push({ id: 'v', user_id: USER, render_id: 'r', title: 'Da pessoa', status: 'completed', video_url: 'u', created_at: 'a' })
  w.tables.videos.push({ id: 'v0', user_id: USER, render_id: 'r0', title: null, status: 'completed', video_url: 'u', created_at: 'b' })
  await MT.fillStudioVideoTitle(w.ctx, 'v', 'Pedido')
  ok(w.tables.videos[0].title === 'Pedido', '(M3b) sem o .is(title, null), o título da pessoa é sobrescrito → (T2/T4) vermelho')
})
await withMutant('M4', "  if ((claimStatus === 'pending' || claimStatus === 'done') && replay", "  if (false && replay", async (MT) => {
  const w = world()
  const gen = 'gen-mut-replay-1'
  w.tables.mcp_studio_jobs.push({ id: 'j', user_id: USER, generation_id: gen, engine: 'seedance', duration: 15, credits: 9, status: 'processing', created_at: new Date(w.clock.t).toISOString(), format: 'film', dispatch: { replay: { generationId: gen, prompt: 'x' } } })
  w.setClaim(gen, 'done'); w.debit(gen, 9)
  w.clock.t += 5 * 60 * 1000
  w.script((b) => { w.refund(b.generationId); w.setClaim(b.generationId, 'released'); return w.json(409, {}) })
  await MT.studioVideoStatus(w.ctx, gen, w.io)
  ok(w.posts.length === 0 && w.ledger.balance === 91, '(M4b) sem o reenvio do status, o claim preso nunca fecha e os 9 créditos ficam presos → (Ra12) vermelho')
})
ok(O.studioClientApp('https://chatgpt.com.evil.example/cb', null) === null, '(M5) host que só COMEÇA com chatgpt.com não vira ChatGPT')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
