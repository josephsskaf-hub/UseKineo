// KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — guardião do "Redo this scene —
// free" na tela do filme pronto. OFFLINE: executa o código real (lib/cinematic/refazerCena.ts + lib/freeRedo/filmServer.ts)
// com banco, fal, Creatomate e bucket FALSOS (o mundo de scripts/test-meta95-refazer-1910.mjs, reduzido). Nenhuma rede,
// chave ou banco de verdade.
// Provas:
//   A1  espelho: free_redo_{requested,delivered,failed} → scene_redo_* com video_id, scene_index, ms (número), reason; outro nome = null;
//   A2  o painel é puro: fase a partir do estado do servidor; cenas só com índice inteiro e clipe https; o POST leva SÓ
//       {videoId, sceneIndex}; a troca só aceita https do filme pedido;
//   B1  servidor: o fluxo inteiro grava scene_redo_requested e scene_redo_delivered (ms ≥ 0) pelo d.event (servidor);
//       cena que falha grava scene_redo_failed com reason;
//   B2  NUNCA debita: só `events` e `videos` são tocadas, versão nova com credits_used 0, nenhum import de crédito;
//   B3  1× por filme e idempotente: dois cliques juntos = 1 linha-trava e 1 envio à fal; depois de entregue = 409 ja_usada;
//   B4  só o dono: outra conta recebe 404, nada é enviado, nenhum evento;
//   B5  cena validada: -1, 99 e a cena de motor não coberto = 400, sem envio;
//   C1  fiação da tela: o painel só fala com /api/free-redo/film, dispara o evento de troca, monta FORA do grupo das 3 saídas,
//       o gancho do Studio só ouve na fase 'done'; as 5 chaves novas em 16 línguas; nenhum preço no painel;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Roda: node scripts/test-refazer-cena-2710.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
const ok = (cond, name) => {
  if (typeof name !== 'string' || typeof cond === 'string') throw new Error('ok(cond, name) com argumentos trocados: ' + String(cond))
  if (cond === true) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name) }
}

const F = {
  lib: 'lib/cinematic/refazerCena.ts',
  film: 'lib/freeRedo/filmServer.ts',
  core: 'lib/freeRedo/core.ts',
  copy: 'lib/freeRedo/copy.ts',
  painel: 'components/video/SceneRedoPanel.tsx',
  exits: 'components/FilmReadyExits.tsx',
  gancho: 'lib/useTrocaDoLink.ts',
  botao: 'components/video/FreeRedoFilmButton.tsx',
}

function carregar(source) {
  const load = createOfflineLoader({ source, globals: { Date, Math, JSON, Promise } })
  return { lib: load(F.lib), film: load(F.film), core: load(F.core), copy: load(F.copy) }
}
/** Carrega com UM arquivo mutado em memória (o disco não muda). */
function mutado(rel, de, para) {
  const original = rd(rel)
  if (original.split(de).length !== 2) throw new Error(`mutante sem âncora única em ${rel}: ${de}`)
  return carregar((p, text) => (lf(p).endsWith(rel.replace(/\//g, path.sep)) || lf(p).endsWith(rel) ? lf(text).replace(de, para) : text))
}

// ── banco falso (o mesmo contrato de scripts/test-meta95-refazer-1910.mjs: select/eq/in/order/limit/maybeSingle, insert, update) ──
function fakeDb(seed = {}) {
  const tables = { events: [...(seed.events ?? [])], videos: [...(seed.videos ?? [])] }
  const touched = new Set()
  let seq = 0
  const get = (row, k) => {
    const m = /^(\w+)->>(\w+)$/.exec(k)
    if (m) { const o = row[m[1]]; const v = o && typeof o === 'object' ? o[m[2]] : undefined; return v === undefined || v === null ? null : String(v) }
    return row[k]
  }
  function builder(table) {
    touched.add(table)
    const st = { op: 'select', filters: [], row: null, patch: null, single: false, wantSelect: false, order: null, limit: null }
    const match = (row) => st.filters.every(([k, v, kind]) => kind === 'in' ? v.includes(get(row, k)) : get(row, k) === v || (typeof v !== 'string' && get(row, k) === String(v)))
    const run = () => {
      const t = tables[table] ?? (tables[table] = [])
      if (st.op === 'insert') {
        const row = { ...st.row }
        if (table === 'videos' && !row.id) row.id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
        if (table === 'events' && !row.id) row.id = `evt-${++seq}`
        if (t.some((x) => x.id === row.id) || (table === 'videos' && row.render_id && t.some((x) => x.render_id === row.render_id))) return { data: null, error: { code: '23505', message: 'duplicate' } }
        row.created_at = row.created_at ?? new Date().toISOString()
        t.push(JSON.parse(JSON.stringify(row)))
        return { data: st.wantSelect ? { id: row.id } : null, error: null }
      }
      if (st.op === 'update') {
        const hits = t.filter(match)
        for (const h of hits) Object.assign(h, JSON.parse(JSON.stringify(st.patch)))
        return { data: st.single ? (hits[0] ? { id: hits[0].id } : null) : hits.map((h) => ({ id: h.id })), error: null }
      }
      let rows = t.filter(match).map((x) => JSON.parse(JSON.stringify(x)))
      if (st.order) rows.sort((a, b) => (a[st.order] < b[st.order] ? 1 : -1))
      if (st.limit != null) rows = rows.slice(0, st.limit)
      return { data: st.single ? (rows[0] ?? null) : rows, error: null }
    }
    const b = {
      select() { if (st.op !== 'select') st.wantSelect = true; return b },
      eq(k, v) { st.filters.push([k, v, 'eq']); return b },
      in(k, arr) { st.filters.push([k, arr, 'in']); return b },
      order(k) { st.order = k; return b },
      limit(n) { st.limit = n; return b },
      maybeSingle() { st.single = true; return Promise.resolve(run()) },
      insert(row) { st.op = 'insert'; st.row = row; return b },
      update(patch) { st.op = 'update'; st.patch = patch; return b },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) },
    }
    return b
  }
  return { from: (t) => builder(t), tables, touched }
}

const SECRET = 'segredo-de-teste'
const DONO = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'
const VIDEO = '33333333-3333-4333-8333-333333333333'
const GEN = 'gen-refazer-2710-abcdef'
const RENDER = 'render-original-1'
const SEED_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const CLIP0 = 'https://v3.fal.media/files/clip0.mp4'
const CLIP1 = 'https://v3.fal.media/files/clip1.mp4'
const PROMPT0 = 'Vertical 9:16 composition, a lighthouse keeper climbing a spiral staircase at dusk, cinematic light'
const fonteFilme = () => ({
  output_format: 'mp4', width: 1080, height: 1920, duration: 10,
  elements: [
    { type: 'video', track: 1, time: 0, duration: 5, source: CLIP0 },
    { type: 'video', track: 1, time: 5, duration: 5, source: CLIP1 },
    { type: 'audio', track: 2, time: 0, source: 'https://storage.example/voice.mp3' },
  ],
})
const claimFilme = () => ({
  status: 'settled', userId: DONO,
  falModels: [SEED_MODEL, SEED_MODEL, 'fal-ai/kling-video/v3/pro/text-to-video'],
  authorizedCompletedUrls: [CLIP0, CLIP1, 'https://v3.fal.media/files/clip2.mp4'],
  response: {
    scene_captions: ['The keeper climbs.', 'The lamp ignites.', 'x'],
    scene_fal_inputs: [
      { prompt: PROMPT0, image_url: 'https://cdn.example/still0.jpg', duration: '5', seed: 42 },
      { prompt: 'Vertical 9:16 composition, the great lamp ignites over a stormy sea, sparks, cinematic', image_url: 'https://cdn.example/still1.jpg', duration: '5' },
      { prompt: 'kling 3 scene that is not classic at all, should never be offered', duration: '5' },
    ],
  },
})

function montarMundo(L, opts = {}) {
  const fonteMeta = L.core.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
  const db = fakeDb({
    events: [{ id: 'fonte-1', name: L.core.FILM_SOURCE_EVENT, user_id: DONO, path: '/api/compose', session_id: GEN, metadata: fonteMeta, created_at: '2026-10-27T10:00:00Z' }],
    videos: [{ id: VIDEO, user_id: DONO, status: 'completed', render_id: RENDER, title: 'O farol', topic: 'farol', quality_mode: 'cinematic_ai', duration: 10, platform: 'TikTok', youtube_description: null, video_url: 'https://storage.example/original.mp4' }],
  })
  const log = { submits: [], renders: [], events: [] }
  let t = Date.parse('2026-10-27T12:00:00Z')
  let owner = 0
  const d = {
    db, secret: SECRET,
    now: () => t,
    random: () => 0.5,
    newOwner: () => `owner-${++owner}`,
    loadClaim: async ({ userId, generationId }) => (generationId === GEN && userId === DONO ? { ok: true, claim: claimFilme() } : { ok: true, claim: null }),
    submitScene: async (model, input) => { log.submits.push({ model, input }); await Promise.resolve(); return `req-${log.submits.length}` },
    pollScene: async () => (opts.cenaFalha ? { status: 'failed', url: null, error: 'FAILED' } : { status: 'done', url: 'https://v3.fal.media/files/novo.mp4' }),
    submitRender: async (source) => { log.renders.push(source); return 'render-novo-1' },
    pollRender: async () => ({ status: 'succeeded', url: 'https://creatomate.example/novo.mp4', snapshotUrl: null, error: null, durationSeconds: 10 }),
    persist: async () => ({ videoUrl: 'https://storage.example/novo.mp4', thumbnailUrl: null, measuredSeconds: 10 }),
    deadUrls: async () => [],
    event: async (e) => { log.events.push(e); return true },
    avancar: (ms) => { t += ms },
  }
  return { d, db, log }
}

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_REFAZER) console.log(k, e && e.stack); r[k] = false } }
  const X = L.lib

  await tenta('A1', () => {
    const t0 = Date.parse('2026-10-27T12:00:00Z')
    const req = X.espelhoSceneRedo({ name: 'free_redo_requested', videoId: VIDEO, metadata: { scene_index: 1, engine: SEED_MODEL, estimated_usd: 0.13 }, nowMs: t0 })
    const del = X.espelhoSceneRedo({ name: 'free_redo_delivered', videoId: VIDEO, metadata: { scene_index: 1, requested_at: '2026-10-27T12:00:00Z', new_video_id: 'nv' }, nowMs: t0 + 184_000 })
    const semHora = X.espelhoSceneRedo({ name: 'free_redo_delivered', videoId: VIDEO, metadata: { scene_index: 1 }, nowMs: t0 })
    const fal = X.espelhoSceneRedo({ name: 'free_redo_failed', videoId: VIDEO, metadata: { scene_index: 0, reason: ' scene_failed ', stage: 'scene' }, nowMs: t0 })
    const semReason = X.espelhoSceneRedo({ name: 'free_redo_failed', videoId: VIDEO, metadata: { scene_index: 0 }, nowMs: t0 })
    return req?.name === 'scene_redo_requested' && req.metadata.video_id === VIDEO && req.metadata.scene_index === 1 && req.metadata.product === 'film' &&
      del?.name === 'scene_redo_delivered' && del.metadata.ms === 184_000 && del.metadata.scene_index === 1 && del.metadata.new_video_id === 'nv' &&
      semHora?.metadata.ms === null &&
      fal?.name === 'scene_redo_failed' && fal.metadata.reason === 'scene_failed' && fal.metadata.stage === 'scene' && semReason?.metadata.reason === 'unknown' &&
      X.espelhoSceneRedo({ name: 'video_ready_viewed', videoId: VIDEO, metadata: {}, nowMs: t0 }) === null &&
      X.SCENE_REDO_EVENTS.requested === 'scene_redo_requested' && X.SCENE_REDO_EVENTS.delivered === 'scene_redo_delivered' && X.SCENE_REDO_EVENTS.failed === 'scene_redo_failed'
  })

  await tenta('A2', () => {
    const fases = ['available', 'unavailable', 'working', 'done', 'failed_retry', 'used', 'garbage', undefined].map((estado) => X.faseDoPainel({ estado }))
    const cenas = X.cenasDoPainel({ scenes: [
      { index: 0, number: 1, text: 'a', clip_url: CLIP0, seconds: 5 },
      { index: 'x', clip_url: CLIP1 }, { index: 1, clip_url: 'http://insecure/clip.mp4' }, null, { index: 2, clip_url: CLIP1, text: 7 },
    ] })
    const corpo = X.corpoDoPedidoDeCena(VIDEO, 1)
    return fases.join() === 'pick,hidden,working,done,retry,done,hidden,hidden' && X.faseDoPainel(null) === 'hidden' &&
      cenas.map((c) => c.index).join() === '0,2' && cenas[1].text === '' && cenas[0].number === 1 &&
      corpo === JSON.stringify({ videoId: VIDEO, sceneIndex: 1 }) && Object.keys(JSON.parse(corpo)).join() === 'videoId,sceneIndex' &&
      X.corpoDoPedidoDeCena(VIDEO, -1) === null && X.corpoDoPedidoDeCena(VIDEO, 1.5) === null && X.corpoDoPedidoDeCena('not-a-uuid', 0) === null &&
      X.urlDeConsulta('/api/free-redo/film', VIDEO, true) === `/api/free-redo/film?videoId=${VIDEO}&lite=1` && !X.urlDeConsulta('/api/free-redo/film', VIDEO, false).includes('lite') &&
      X.detalheDaTroca({ videoId: VIDEO, url: 'https://storage.example/novo.mp4' }, VIDEO) === 'https://storage.example/novo.mp4' &&
      X.detalheDaTroca({ videoId: VIDEO, url: 'https://storage.example/novo.mp4' }, null) === 'https://storage.example/novo.mp4' &&
      X.detalheDaTroca({ videoId: 'outro', url: 'https://storage.example/novo.mp4' }, VIDEO) === null &&
      X.detalheDaTroca({ videoId: VIDEO, url: 'javascript:alert(1)' }, VIDEO) === null && X.detalheDaTroca('x', VIDEO) === null
  })

  let fluxo = null
  await tenta('B1', async () => {
    const { d, db, log } = montarMundo(L)
    const p = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 })
    d.avancar(90_000)
    const g1 = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO }) // cena pronta → montagem
    d.avancar(90_000)
    const g2 = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO }) // montagem pronta → versão nova
    const req = log.events.find((e) => e.name === 'scene_redo_requested')
    const del = log.events.find((e) => e.name === 'scene_redo_delivered')
    const livres = log.events.filter((e) => e.name.startsWith('free_redo_')).length
    fluxo = { db, log }
    const falha = montarMundo(L, { cenaFalha: true })
    await L.film.iniciarRefacaoFilme(falha.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    await L.film.acompanharRefacaoFilme(falha.d, { userId: DONO, videoId: VIDEO })
    const evF = falha.log.events.find((e) => e.name === 'scene_redo_failed')
    return p.status === 202 && g1.body.estado === 'working' && g2.body.estado === 'done' &&
      req && req.userId === DONO && req.path === '/api/free-redo/film' && req.metadata.video_id === VIDEO && req.metadata.scene_index === 1 &&
      del && del.metadata.video_id === VIDEO && del.metadata.scene_index === 1 && del.metadata.ms === 180_000 && del.metadata.new_video_id === g2.body.new_video_id &&
      livres === 2 && !log.events.some((e) => e.name === 'scene_redo_failed') &&
      evF && evF.metadata.video_id === VIDEO && evF.metadata.scene_index === 0 && evF.metadata.reason === 'scene_failed'
  })

  await tenta('B2', () => {
    if (!fluxo) return false
    const novo = fluxo.db.tables.videos.find((v) => v.render_id === 'render-novo-1')
    const srcs = [F.lib, F.film, F.painel, F.gancho].map(rd).join('\n').replace(/^\s*\/\/.*$/gm, '')
    return [...fluxo.db.touched].sort().join(',') === 'events,videos' && novo && novo.credits_used === 0 &&
      !/@\/lib\/credits|debitVideoCredits|refundRenderCredits|recordRenderIntent|chargeAdsV2|credit_debits|video_credits|render_jobs'|\/api\/stripe/.test(srcs)
  })

  await tenta('B3', async () => {
    const { d, db, log } = montarMundo(L)
    const [a, b] = await Promise.all([
      L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 }),
      L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 }),
    ])
    const ordens = db.tables.events.filter((e) => e.name === L.core.FILM_ORDER_EVENT)
    await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO })
    await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO })
    const de2 = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 })
    return a.status === 202 && b.status === 202 && log.submits.length === 1 && ordens.length === 1 && ordens[0].id === L.core.filmOrderId(VIDEO) &&
      log.events.filter((e) => e.name === 'scene_redo_requested').length === 1 &&
      de2.status === 409 && de2.body.motivo === 'ja_usada' && log.submits.length === 1 && log.renders.length === 1
  })

  await tenta('B4', async () => {
    const { d, log, db } = montarMundo(L)
    const x = await L.film.iniciarRefacaoFilme(d, { userId: OUTRO, videoId: VIDEO, sceneIndex: 0 })
    const g = await L.film.acompanharRefacaoFilme(d, { userId: OUTRO, videoId: VIDEO })
    return x.status === 404 && g.status === 404 && log.submits.length === 0 && log.events.length === 0 && !db.tables.events.some((e) => e.name === L.core.FILM_ORDER_EVENT)
  })

  await tenta('B5', async () => {
    const { d, log } = montarMundo(L)
    const neg = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: -1 })
    const longe = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 99 })
    const kling3 = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 2 })
    const texto = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: '1' })
    return [neg, longe, kling3, texto].every((x) => x.status === 400) && log.submits.length === 0 && !log.events.some((e) => e.name === 'scene_redo_requested')
  })

  await tenta('C1', () => {
    const painel = rd(F.painel), exits = rd(F.exits), gancho = rd(F.gancho), botao = rd(F.botao)
    const codigo = painel.replace(/^\s*\/\/.*$/gm, '')
    const fetches = [...codigo.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1].trim())
    const iPainel = exits.indexOf('<SceneRedoPanel videoId={videoId} />')
    const iGrupo = exits.indexOf('data-kineo="film-ready-exits"')
    // O gancho do Studio é carregado por scripts/test-filme-rapido-1710.mjs com imports FECHADOS: o nome do evento mora nele
    // por extenso (SCENE_REDO_SWAP_NAME) e aqui se prova que é o MESMO da lib — uma fonte de verdade, duas cópias conferidas.
    const nome = /const SCENE_REDO_SWAP_NAME = '([^']+)'/.exec(gancho)?.[1]
    const iAdd = gancho.indexOf('addEventListener(SCENE_REDO_SWAP_NAME, ouvir)')
    const trecho = iAdd > 0 && gancho.includes('removeEventListener(SCENE_REDO_SWAP_NAME, ouvir)') ? 'ok' : ''
    const efeito = iAdd > 0 ? gancho.slice(gancho.lastIndexOf('useEffect(() => {', iAdd), iAdd) : ''
    const langs = Object.keys(L.copy.FREE_REDO_COPY)
    const chaves = ['used', 'panelTitle', 'panelHint', 'redoThis', 'redoScene']
    return fetches.length === 2 && fetches.every((f) => f.startsWith('urlDeConsulta(FREE_REDO_FILM_PATH') || f === 'FREE_REDO_FILM_PATH') &&
      /body = corpoDoPedidoDeCena\(videoId, escolhida\)/.test(codigo) && /method: 'POST'[^\n]*body \}/.test(codigo) &&
      /window\.dispatchEvent\(new CustomEvent\(SCENE_REDO_SWAP_EVENT, \{ detail: montarDetalheDaTroca\(videoId, novaUrl\) \}\)\)/.test(codigo) &&
      /if \(fase === 'hidden'\) return null/.test(codigo) && !/\$\s?\d|R\$|credits?_|checkout|\/api\/stripe/i.test(codigo) &&
      iPainel > 0 && iGrupo > 0 && iPainel < iGrupo && exits.split('<SceneRedoPanel ').length === 2 && /^import SceneRedoPanel from '@\/components\/video\/SceneRedoPanel'/m.test(exits) &&
      nome === X.SCENE_REDO_SWAP_EVENT && !/from '@\/lib\/cinematic\/refazerCena'/.test(gancho) &&
      trecho === 'ok' && /if \(!ativo \|\| typeof window === 'undefined'\) return/.test(efeito) && /if \(url\) a\.aoTrocar\(url\)/.test(gancho) &&
      /startsWith\('https:\/\/'\)/.test(gancho.slice(iAdd - 600, iAdd)) &&
      langs.length === 16 && langs.every((k) => chaves.every((c) => typeof L.copy.FREE_REDO_COPY[k][c] === 'string' && L.copy.FREE_REDO_COPY[k][c].length > 0)) &&
      L.copy.FREE_REDO_COPY.en.used === 'Free redo used' && L.copy.FREE_REDO_COPY.en.redoThis === 'Redo this scene — free' &&
      /if \(estado === 'used'\)/.test(botao) && /\{t\.done\}<\/b> · \{t\.used\}/.test(botao)
  })
  return r
}

console.log('KINEO-REFAZER-CENA-2710 — guardião')
const real = await provas(carregar(null))
const NOMES = {
  A1: 'A1 espelho scene_redo_* (video_id, scene_index, ms, reason); outro nome = null',
  A2: 'A2 painel puro: fase do estado do servidor; cenas só válidas; POST leva SÓ {videoId, sceneIndex}; troca só https do filme',
  B1: 'B1 servidor grava scene_redo_requested / delivered (ms ≥ 0) / failed (reason) pelo d.event',
  B2: 'B2 NUNCA debita: só events+videos, credits_used 0, nenhum import de crédito nos arquivos novos',
  B3: 'B3 1× por filme e idempotente: 2 cliques = 1 trava + 1 envio; entregue = 409 ja_usada',
  B4: 'B4 só o dono: outra conta 404, nada enviado, nenhum evento',
  B5: 'B5 cena validada: -1 / 99 / motor não coberto / texto = 400 sem envio',
  C1: 'C1 fiação: painel só fala com /api/free-redo/film, dispara a troca, monta FORA das 3 saídas; gancho só em done; 16 línguas; sem preço',
}
for (const k of Object.keys(NOMES)) ok(real[k] === true, NOMES[k])

// ── mutantes (em memória) ──
// "Aplicou" = mutado() exige a âncora ÚNICA no arquivo (senão lança); "pegou" = a prova-alvo fica vermelha. Um mutante pode
// avermelhar também uma prova vizinha (M1 derruba A1 e B1): isso é mérito, não defeito.
async function mutante(nome, L, alvo) {
  let r
  try { r = await provas(L) } catch { r = {} }
  ok(r[alvo] === false, `${nome}: aplicou e ${alvo} ficou vermelho`)
}
await mutante('M1 espelho esquece o delivered', mutado(F.lib, "free_redo_delivered: SCENE_REDO_EVENTS.delivered,", ''), 'B1')
await mutante('M2 servidor deixa de gravar o espelho', mutado(F.film, 'if (espelho) await d.event(', 'if (false) await d.event('), 'B1')
await mutante('M3 entrega sem a hora do pedido (ms some)', mutado(F.film, 'requested_at: meta.requested_at ?? meta.created_at ?? null,', 'requested_at: null,'), 'B1')
await mutante('M4 corpo do POST leva campo a mais', mutado(F.lib, 'return JSON.stringify({ videoId, sceneIndex })', "return JSON.stringify({ videoId, sceneIndex, free: true })"), 'A2')
await mutante('M5 troca aceita link de outro filme', mutado(F.lib, 'if (videoId && d.videoId !== videoId) return null', ''), 'A2')
await mutante('M6 painel pinta sem direito', mutado(F.lib, "if (!e || e === 'unavailable') return 'hidden'", "if (!e) return 'hidden'"), 'A2')
{
  // Mutantes estáticos da fiação (texto em memória): o painel dentro do grupo das 3 saídas; o gancho ouvindo fora da fase 'done'.
  const exits = rd(F.exits), gancho = rd(F.gancho)
  const dentro = exits.replace('{videoId ? <SceneRedoPanel videoId={videoId} /> : null}', '').replace('aria-label="What next"\n', 'aria-label="What next"\n    >{videoId ? <SceneRedoPanel videoId={videoId} /> : null}<div\n')
  const semFase = gancho.replace("if (!ativo || typeof window === 'undefined') return // KINEO-REFAZER-CENA-2710", "if (typeof window === 'undefined') return")
  ok(dentro !== exits && semFase !== gancho, 'M7/M8 aplicaram (texto diferente)')
  const trocas = { [F.exits]: dentro, [F.gancho]: semFase }
  const posix = (p) => String(p).split(path.sep).join('/')
  for (const [rel, texto] of Object.entries(trocas)) {
    const original = fs.readFileSync
    fs.readFileSync = (p, enc) => (posix(p).endsWith(rel) ? texto : original(p, enc))
    let r
    try { r = await provas(carregar(null)) } finally { fs.readFileSync = original }
    ok(r.C1 === false, `${rel === F.exits ? 'M7 painel dentro das 3 saídas' : 'M8 gancho ouve fora da fase done'}: aplicou e C1 ficou vermelho`)
  }
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
