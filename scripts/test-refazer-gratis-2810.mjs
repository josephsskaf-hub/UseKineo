// KINEO-REFAZER-GRATIS-2810 — guardião do "Redo this scene — free" no PRIMEIRO filme (2 refações grátis no total, servidor
// decide, idempotente, sem caminho de dinheiro novo). OFFLINE: executa o código real (lib/cinematic/refazerGratis2810.ts +
// lib/freeRedo/core.ts + lib/freeRedo/filmServer.ts) com banco, fal, Creatomate e bucket FALSOS. Nenhuma rede, chave ou banco.
// Provas:
//   P1  regra pura: saldo 2 no primeiro filme / 1 nos outros; a versão nova só ganha refação no primeiro filme e até o teto;
//       a linha só aparece com first_film + free_left > 0; o painel só segue para a versão nova com saldo; eventos fechados;
//   P2  elo de cadeia ASSINADO: confere com dono/render/fonte; seq/cena/clipe/dono/render adulterados = recusa; sem elo = ok;
//   S1  primeiro filme: refação 1 → versão nova COM fonte assinada (seq 2) → refação 2 na versão nova (a mesma cena pode ser
//       refeita) → versão 3 SEM fonte (não existe 3ª); saldo 2 → 1 → 0; 2º pedido na mesma versão = 409 ja_usada; 2 envios à fal;
//   S2  filme que NÃO é o primeiro: 1 refação (a regra de 19/10), versão nova sem fonte, saldo 0, linha nunca aparece;
//   S3  idempotente: 2 cliques juntos = 1 envio; 2 entregas concorrentes = 1 versão nova e 1 fonte (id determinístico);
//   S4  elo forjado (assinatura errada) = sem refação; elo seq 3 (mesmo assinado) = teto_da_cadeia, sem envio;
//   S5  sem dinheiro: só `events` e `videos`, credits_used 0 nas versões novas, nenhum import de crédito nos arquivos tocados;
//   S6  eventos: scene_redo_free_used (servidor, film_id + scene_index + free_seq) a cada refação entregue;
//       scene_redo_offer_viewed / scene_redo_clicked (navegador, film_id + scene_index) na fiação do painel e da linha;
//   S7  fiação da tela: a linha mora ACIMA do player do Studio (antes do <video> e longe do download), 3 línguas, o painel
//       segue a cadeia só depois de o player trocar;
//   M   mutantes: cada regra quebrada fica vermelha.
// Roda: node scripts/test-refazer-gratis-2810.mjs
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
const ok = (cond, name) => { if (cond === true) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name) } }

const F = {
  regra: 'lib/cinematic/refazerGratis2810.ts',
  core: 'lib/freeRedo/core.ts',
  film: 'lib/freeRedo/filmServer.ts',
  painel: 'components/video/SceneRedoPanel.tsx',
  linha: 'components/video/FirstFilmRedoHint.tsx',
  studio: 'app/(dashboard)/generate/GenerateClient.tsx',
}

function carregar(source) {
  const load = createOfflineLoader({ source, globals: { Date, Math, JSON, Promise } })
  return { regra: load(F.regra), core: load(F.core), film: load(F.film) }
}
function mutado(rel, de, para) {
  const original = rd(rel)
  if (original.split(de).length !== 2) throw new Error(`mutante sem âncora única em ${rel}: ${de}`)
  return carregar((p, text) => (lf(p).endsWith(rel.replace(/\//g, path.sep)) || lf(p).endsWith(rel) ? lf(text).replace(de, para) : text))
}

// ── banco falso: select/eq/in/order(asc|desc)/limit/maybeSingle, insert (PK), update condicional ──
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
    const st = { op: 'select', filters: [], row: null, patch: null, single: false, wantSelect: false, order: null, asc: false, limit: null }
    const match = (row) => st.filters.every(([k, v, kind]) => kind === 'in' ? v.includes(get(row, k)) : get(row, k) === v || (typeof v !== 'string' && get(row, k) === String(v)))
    const run = () => {
      const t = tables[table] ?? (tables[table] = [])
      if (st.op === 'insert') {
        const row = { ...st.row }
        if (table === 'videos' && !row.id) row.id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
        if (table === 'events' && !row.id) row.id = `evt-${++seq}`
        if (t.some((x) => x.id === row.id) || (table === 'videos' && row.render_id && t.some((x) => x.render_id === row.render_id))) return { data: null, error: { code: '23505', message: 'duplicate' } }
        row.created_at = row.created_at ?? new Date(Date.parse('2026-10-28T12:00:00Z') + (++seq) * 1000).toISOString()
        t.push(JSON.parse(JSON.stringify(row)))
        return { data: st.wantSelect ? { id: row.id } : null, error: null }
      }
      if (st.op === 'update') {
        const hits = t.filter(match)
        for (const h of hits) Object.assign(h, JSON.parse(JSON.stringify(st.patch)))
        return { data: st.single ? (hits[0] ? { id: hits[0].id } : null) : hits.map((h) => ({ id: h.id })), error: null }
      }
      let rows = t.filter(match).map((x) => JSON.parse(JSON.stringify(x)))
      if (st.order) rows.sort((a, b) => (a[st.order] < b[st.order] ? (st.asc ? -1 : 1) : (st.asc ? 1 : -1)))
      if (st.limit != null) rows = rows.slice(0, st.limit)
      return { data: st.single ? (rows[0] ?? null) : rows, error: null }
    }
    const b = {
      select() { if (st.op !== 'select') st.wantSelect = true; return b },
      eq(k, v) { st.filters.push([k, v, 'eq']); return b },
      in(k, arr) { st.filters.push([k, arr, 'in']); return b },
      order(k, o) { st.order = k; st.asc = !!(o && o.ascending); return b },
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

// ── o filme de teste (Seedance i2v, 2 cenas) ──
const SECRET = 'segredo-de-teste-2810'
const DONO = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'
const VIDEO = '33333333-3333-4333-8333-333333333333'
const ANTIGO = '44444444-4444-4444-8444-444444444444'
const GEN = 'gen-refazer-2810'
const RENDER = 'render-original-2810'
const SEED = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const CLIP0 = 'https://v3.fal.media/files/c0.mp4'
const CLIP1 = 'https://v3.fal.media/files/c1.mp4'
const fonteFilme = () => ({
  output_format: 'mp4', width: 1080, height: 1920, duration: 10,
  elements: [
    { type: 'video', track: 1, time: 0, duration: 5, source: CLIP0 },
    { type: 'video', track: 1, time: 5, duration: 5, source: CLIP1 },
    { type: 'audio', track: 2, time: 0, source: 'https://storage.example/voice.mp3' },
  ],
})
const claimFilme = () => ({
  status: 'settled', userId: DONO, falModels: [SEED, SEED], authorizedCompletedUrls: [CLIP0, CLIP1],
  response: {
    scene_captions: ['A figura entra.', 'A figura sorri.'],
    scene_fal_inputs: [
      { prompt: 'Vertical 9:16, the historical figure walks into the candle-lit hall, cinematic', image_url: 'https://cdn.example/s0.jpg', duration: '5', seed: 7 },
      { prompt: 'Vertical 9:16, close-up of the historical figure smiling at the window, cinematic', image_url: 'https://cdn.example/s1.jpg', duration: '5' },
    ],
  },
})

function montarMundo(L, opts = {}) {
  const fonteMeta = L.core.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
  const events = [{ id: 'fonte-1', name: L.core.FILM_SOURCE_EVENT, user_id: DONO, path: '/api/compose', session_id: GEN, metadata: fonteMeta, created_at: '2026-10-27T10:00:00Z' }, ...(opts.extraEvents ?? [])]
  const videos = [{ id: VIDEO, user_id: DONO, status: 'completed', render_id: RENDER, title: 'A figura', topic: 'figura', quality_mode: 'cinematic_ai', duration: 10, platform: 'TikTok', youtube_description: null, video_url: 'https://storage.example/original.mp4', credits_used: 15, created_at: '2026-10-27T09:00:00Z' }]
  if (opts.filmeAntigo) videos.push({ id: ANTIGO, user_id: DONO, status: 'completed', render_id: 'render-antigo', title: 'Antigo', quality_mode: 'fast', created_at: '2026-10-01T09:00:00Z' })
  const db = fakeDb({ events, videos })
  const log = { submits: [], renders: [], events: [] }
  let t = Date.parse('2026-10-28T12:00:00Z')
  let owner = 0
  const d = {
    db, secret: SECRET,
    now: () => t,
    random: () => 0.25,
    newOwner: () => `owner-${++owner}`,
    loadClaim: async ({ userId, generationId }) => (generationId === GEN && userId === DONO ? { ok: true, claim: claimFilme() } : { ok: true, claim: null }),
    submitScene: async (model, input) => { log.submits.push({ model, input }); await Promise.resolve(); return `req-${log.submits.length}` },
    pollScene: async (_m, requestId) => ({ status: 'done', url: `https://v3.fal.media/files/novo-${requestId}.mp4` }),
    submitRender: async (source) => { log.renders.push(source); return `render-novo-${log.renders.length}` },
    pollRender: async (rid) => ({ status: 'succeeded', url: `https://creatomate.example/${rid}.mp4`, snapshotUrl: null, error: null, durationSeconds: 10 }),
    persist: async (a) => ({ videoUrl: `https://storage.example/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 10 }),
    deadUrls: async () => [],
    event: async (e) => { log.events.push(e); return true },
  }
  return { d, db, log }
}

/** POST na cena + as consultas que fazem a refação andar até a versão nova. Devolve o id da versão nova. */
async function refazer(L, w, videoId, sceneIndex) {
  const p = await L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId, sceneIndex })
  if (p.status !== 202) return { p, novo: null }
  await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId }) // cena pronta → montagem
  const g = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId }) // montagem pronta → versão nova
  return { p, g, novo: g.body.new_video_id ?? null }
}

const fontesDe = (w, L, renderId) => w.db.tables.events.filter((e) => e.name === L.core.FILM_SOURCE_EVENT && e.metadata && e.metadata.render_id === renderId)
const usados = (w) => w.log.events.filter((e) => e.name === 'scene_redo_free_used')

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_REFAZER) console.log(k, e && e.stack); r[k] = false } }
  const R = L.regra, C = L.core

  await tenta('P1', () => {
    const a = R.saldoGratis({ primeiroFilme: true, seq: 1, usadaAqui: false })
    const b = R.saldoGratis({ primeiroFilme: true, seq: 1, usadaAqui: true })
    const c = R.saldoGratis({ primeiroFilme: false, seq: 2, usadaAqui: false })
    const d = R.saldoGratis({ primeiroFilme: true, seq: 1, usadaAqui: true, usadaNaSeguinte: true })
    const e = R.saldoGratis({ primeiroFilme: false, seq: 1, usadaAqui: false })
    const f = R.saldoGratis({ primeiroFilme: false, seq: 1, usadaAqui: true })
    const meta = R.metaDoFunil({ filmId: VIDEO, videoId: VIDEO, sceneIndex: 1, sceneCount: 2, firstFilm: true, freeLeft: 2, surface: 'scene_panel', extra: 'x' })
    return R.FREE_REDO_FIRST_FILM_TOTAL === 2 && R.FREE_REDO_OTHER_FILM_TOTAL === 1 &&
      a.free_left === 2 && a.first_film === true && b.free_left === 1 && c.free_left === 1 && c.first_film === true && d.free_left === 0 &&
      e.free_left === 1 && e.first_film === false && f.free_left === 0 &&
      R.versaoNovaGanhaRefacao({ primeiroFilme: true, seq: 1 }) === true && R.versaoNovaGanhaRefacao({ primeiroFilme: true, seq: 2 }) === false &&
      R.versaoNovaGanhaRefacao({ primeiroFilme: false, seq: 1 }) === false &&
      R.mostrarLinhaDoPrimeiroFilme({ estado: 'available', first_film: true, free_left: 2 }) === true &&
      R.mostrarLinhaDoPrimeiroFilme({ estado: 'available', first_film: false, free_left: 1 }) === false &&
      R.mostrarLinhaDoPrimeiroFilme({ estado: 'done', first_film: true, free_left: 0 }) === false &&
      R.mostrarLinhaDoPrimeiroFilme({ estado: 'unavailable', first_film: true, free_left: 2 }) === false &&
      R.proximaVersao({ estado: 'done', first_film: true, free_left: 1, new_video_id: ANTIGO }) === ANTIGO &&
      R.proximaVersao({ estado: 'done', first_film: true, free_left: 0, new_video_id: ANTIGO }) === null &&
      R.proximaVersao({ estado: 'done', first_film: false, free_left: 1, new_video_id: ANTIGO }) === null &&
      Object.keys(meta).sort().join(',') === 'film_id,first_film,free_left,marca,product,scene_count,scene_index,surface,video_id' &&
      meta.scene_index === 1 && meta.film_id === VIDEO &&
      R.SCENE_REDO_FUNNEL_EVENTS.offerViewed === 'scene_redo_offer_viewed' && R.SCENE_REDO_FUNNEL_EVENTS.clicked === 'scene_redo_clicked' &&
      R.SCENE_REDO_FUNNEL_EVENTS.freeUsed === 'scene_redo_free_used'
  })

  await tenta('P2', () => {
    const chain = { seq: 2, parentVideoId: VIDEO, rootVideoId: VIDEO, sceneIndex: 0, clipUrl: 'https://v3.fal.media/files/n.mp4' }
    const m = C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: 'rn', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme(), chain })
    const okv = C.verifyFilmChain(SECRET, DONO, 'rn', m)
    const adultera = (fn) => { const x = JSON.parse(JSON.stringify(m)); fn(x); return C.verifyFilmChain(SECRET, DONO, 'rn', x).ok }
    const semElo = C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
    return okv.ok === true && okv.chain.seq === 2 && okv.chain.sceneIndex === 0 && C.verifyFilmSource(SECRET, DONO, 'rn', m).ok === true &&
      adultera((x) => { x.chain.seq = 3 }) === false && adultera((x) => { x.chain.scene_index = 1 }) === false &&
      adultera((x) => { x.chain.clip_url = 'https://evil.example/x.mp4' }) === false && adultera((x) => { x.source.elements[0].source = 'https://evil.example/y.mp4' }) === false &&
      adultera((x) => { delete x.chain_authority }) === false &&
      C.verifyFilmChain(SECRET, OUTRO, 'rn', m).ok === false && C.verifyFilmChain(SECRET, DONO, 'outro-render', m).ok === false &&
      C.verifyFilmChain(SECRET, DONO, RENDER, semElo).ok === true && C.verifyFilmChain(SECRET, DONO, RENDER, semElo).chain === null &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: 'rn', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme(), chain: { ...chain, seq: 1 } }) === null &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: 'rn', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme(), chain: { ...chain, clipUrl: 'http://x' } }) === null
  })

  let fluxo1 = null
  await tenta('S1', async () => {
    const w = montarMundo(L)
    const g0 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, lite: true })
    const a = await refazer(L, w, VIDEO, 0)
    const v2 = a.novo
    const fonteV2 = v2 ? fontesDe(w, L, 'render-novo-1') : []
    const gR = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, lite: true })
    const gV2lite = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: v2, lite: true })
    const gV2 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: v2 })
    const cenasV2 = Array.isArray(gV2.body.scenes) ? gV2.body.scenes : []
    const cena0 = cenasV2.find((c) => c.index === 0)
    const b = await refazer(L, w, v2, 0) // a MESMA cena, de novo, na versão nova
    const v3 = b.novo
    const gR2 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, lite: true })
    const gV3 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: v3 })
    const gV3lite = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: v3, lite: true })
    const de2 = await L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: v2, sceneIndex: 1 })
    const de3 = await L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: v3, sceneIndex: 1 })
    fluxo1 = w
    return g0.body.estado === 'available' && g0.body.first_film === true && g0.body.free_left === 2 &&
      typeof v2 === 'string' && fonteV2.length === 1 && fonteV2[0].id === C.uuidFrom('kineo:free-redo:film-chain:v1:render-novo-1') &&
      fonteV2[0].metadata.chain.seq === 2 && fonteV2[0].metadata.chain.root_video_id === VIDEO && fonteV2[0].metadata.chain.parent_video_id === VIDEO &&
      gR.body.estado === 'done' && gR.body.free_left === 1 && gR.body.new_video_id === v2 && L.regra.proximaVersao(gR.body) === v2 &&
      gV2lite.body.estado === 'available' && gV2lite.body.first_film === true && gV2lite.body.free_left === 1 &&
      cenasV2.length === 2 && cena0 && cena0.clip_url === 'https://v3.fal.media/files/novo-req-1.mp4' &&
      typeof v3 === 'string' && w.log.submits.length === 2 && w.log.submits[1].input.prompt.startsWith('Vertical 9:16, the historical figure walks') &&
      w.log.renders[1].elements[0].source === 'https://v3.fal.media/files/novo-req-2.mp4' && w.log.renders[1].elements[1].source === CLIP1 &&
      fontesDe(w, L, 'render-novo-2').length === 0 &&
      gR2.body.free_left === 0 && gR2.body.free_used === 2 && L.regra.mostrarLinhaDoPrimeiroFilme(gR2.body) === false &&
      gV3.status === 409 && gV3.body.estado === 'unavailable' && gV3lite.body.estado === 'unavailable' &&
      de2.status === 409 && de2.body.motivo === 'ja_usada' && de3.status === 409 && w.log.submits.length === 2
  })

  await tenta('S2', async () => {
    const w = montarMundo(L, { filmeAntigo: true })
    const g0 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, lite: true })
    const a = await refazer(L, w, VIDEO, 1)
    const gR = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, lite: true })
    const gV2 = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: a.novo, lite: true })
    const u = usados(w)
    return g0.body.estado === 'available' && g0.body.first_film === false && g0.body.free_left === 1 && L.regra.mostrarLinhaDoPrimeiroFilme(g0.body) === false &&
      typeof a.novo === 'string' && fontesDe(w, L, 'render-novo-1').length === 0 &&
      gR.body.free_left === 0 && L.regra.proximaVersao(gR.body) === null && gV2.body.estado === 'unavailable' &&
      u.length === 1 && u[0].metadata.first_film === false && u[0].metadata.next_free_redo === false && w.log.submits.length === 1
  })

  await tenta('S3', async () => {
    const w = montarMundo(L)
    const [x, y] = await Promise.all([
      L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 }),
      L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 }),
    ])
    await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO }) // → rendering
    const [g1, g2] = await Promise.all([
      L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO }),
      L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: VIDEO }),
    ])
    const novas = w.db.tables.videos.filter((v) => v.render_id === 'render-novo-1')
    const ordens = w.db.tables.events.filter((e) => e.name === L.core.FILM_ORDER_EVENT)
    return x.status === 202 && y.status === 202 && w.log.submits.length === 1 && ordens.length === 1 &&
      novas.length === 1 && fontesDe(w, L, 'render-novo-1').length === 1 && usados(w).length === 1 &&
      (g1.body.new_video_id === novas[0].id || g2.body.new_video_id === novas[0].id)
  })

  await tenta('S4', async () => {
    // (a) elo com assinatura errada: a versão nova não tem refação.
    const chain = { seq: 2, parentVideoId: VIDEO, rootVideoId: VIDEO, sceneIndex: 0, clipUrl: 'https://v3.fal.media/files/f.mp4' }
    const forjada = L.core.filmSourceMetadata({ secret: 'outro-segredo', userId: DONO, renderId: 'render-f', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme(), chain })
    const meio = L.core.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: 'render-f', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
    const misto = { ...meio, chain: forjada.chain, chain_authority: forjada.chain_authority } // fonte boa + elo forjado
    const F5 = '55555555-5555-4555-8555-555555555555', F6 = '66666666-6666-4666-8666-666666666666'
    const w = montarMundo(L, {
      extraEvents: [
        { id: 'forjada', name: L.core.FILM_SOURCE_EVENT, user_id: DONO, metadata: misto, created_at: '2026-10-28T10:00:00Z' },
        { id: 'seq3', name: L.core.FILM_SOURCE_EVENT, user_id: DONO, metadata: L.core.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: 'render-s3', generationId: GEN, quality: 'cinematic_ai', source: fonteFilme(), chain: { ...chain, seq: 3, parentVideoId: VIDEO } }), created_at: '2026-10-28T10:00:00Z' },
      ],
    })
    w.db.tables.videos.push({ id: F5, user_id: DONO, status: 'completed', render_id: 'render-f', created_at: '2026-10-28T10:00:00Z' })
    w.db.tables.videos.push({ id: F6, user_id: DONO, status: 'completed', render_id: 'render-s3', created_at: '2026-10-28T10:00:01Z' })
    const a = await L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: F5, sceneIndex: 0 })
    const b = await L.film.iniciarRefacaoFilme(w.d, { userId: DONO, videoId: F6, sceneIndex: 0 })
    const la = await L.film.acompanharRefacaoFilme(w.d, { userId: DONO, videoId: F5, lite: true })
    return a.status === 409 && a.body.detalhe === 'elo_invalido' && b.status === 409 && b.body.motivo === 'teto_da_cadeia' &&
      la.body.estado === 'unavailable' && w.log.submits.length === 0
  })

  await tenta('S5', () => {
    if (!fluxo1) return false
    const novas = fluxo1.db.tables.videos.filter((v) => /^render-novo-/.test(String(v.render_id)))
    const srcs = [F.regra, F.film, F.core, F.painel, F.linha].map(rd).join('\n').replace(/^\s*\/\/.*$/gm, '')
    return [...fluxo1.db.touched].sort().join(',') === 'events,videos' && novas.length === 2 && novas.every((v) => v.credits_used === 0) &&
      !/@\/lib\/credits|debitVideoCredits|refundRenderCredits|recordRenderIntent|credit_debits|video_credits|render_jobs'|\/api\/stripe|checkout/.test(srcs)
  })

  await tenta('S6', () => {
    if (!fluxo1) return false
    const u = usados(fluxo1)
    const painel = rd(F.painel), linha = rd(F.linha)
    return u.length === 2 && u[0].metadata.film_id === VIDEO && u[0].metadata.scene_index === 0 && u[0].metadata.free_seq === 1 && u[0].metadata.first_film === true &&
      u[0].metadata.next_free_redo === true && u[1].metadata.film_id === VIDEO && u[1].metadata.free_seq === 2 && u[1].metadata.next_free_redo === false &&
      u.every((e) => e.path === '/api/free-redo/film') &&
      /trackEvent\(SCENE_REDO_FUNNEL_EVENTS\.offerViewed, metaDoFunil\(\{ filmId, videoId, sceneIndex: null/.test(painel) &&
      /trackEvent\(SCENE_REDO_FUNNEL_EVENTS\.clicked, metaDoFunil\(\{ filmId, videoId, sceneIndex: escolhida/.test(painel) &&
      painel.indexOf('SCENE_REDO_FUNNEL_EVENTS.clicked') < painel.indexOf("method: 'POST'") &&
      /trackEvent\(SCENE_REDO_FUNNEL_EVENTS\.offerViewed, metaDoFunil\(\{ filmId: videoId, videoId, sceneIndex: null[^\n]*surface: 'player_line'/.test(linha)
  })

  await tenta('S7', () => {
    const studio = rd(F.studio), painel = rd(F.painel), linha = rd(F.linha), regra = rd(F.regra)
    const iLinha = studio.indexOf('<FirstFilmRedoHint videoId={publicVideoId} />')
    const iPreview = studio.indexOf('<div className="done-result-preview">')
    const iVideo = studio.indexOf('ref={videoRef}', iPreview)
    const iDownload = studio.indexOf('Download my film (', iPreview)
    const codigoPainel = painel.replace(/^\s*\/\/.*$/gm, '')
    return iLinha > 0 && iPreview > iLinha && iPreview - iLinha < 400 && iVideo > iPreview && iDownload > iVideo && studio.split('<FirstFilmRedoHint ').length === 2 &&
      /^import FirstFilmRedoHint from '@\/components\/video\/FirstFilmRedoHint'/m.test(studio) &&
      L.regra.COPY_PRIMEIRO_FILME.en.line === 'Something off? Redo any scene for free on your first film.' &&
      ['pt', 'es'].every((k) => L.regra.COPY_PRIMEIRO_FILME[k].line && L.regra.COPY_PRIMEIRO_FILME[k].line !== L.regra.COPY_PRIMEIRO_FILME.en.line) &&
      L.regra.copyPrimeiroFilme('fr').line === L.regra.COPY_PRIMEIRO_FILME.en.line &&
      /if \(!mostrar \|\| !videoId\) return null/.test(linha) && /mostrarLinhaDoPrimeiroFilme\(r\)/.test(linha) &&
      /ganchosRef\.current\.aoTrocar\(\)/.test(codigoPainel) && codigoPainel.indexOf('ganchosRef.current.aoTrocar()') > codigoPainel.indexOf('window.dispatchEvent(new CustomEvent(SCENE_REDO_SWAP_EVENT') &&
      !/from 'node:crypto'/.test(regra) && !/\$\s?\d|R\$|credits?_/i.test(codigoPainel + linha.replace(/^\s*\/\/.*$/gm, ''))
  })
  return r
}

console.log('KINEO-REFAZER-GRATIS-2810 — guardião')
const real = await provas(carregar(null))
const NOMES = {
  P1: 'P1 regra pura: 2 no primeiro filme / 1 nos outros; versão nova só ganha refação no primeiro filme; linha e cadeia só com saldo; eventos fechados',
  P2: 'P2 elo de cadeia assinado: dono/render/fonte/seq/cena/clipe adulterados = recusa; sem elo = ok',
  S1: 'S1 primeiro filme: refação 1 → versão nova com fonte (seq 2) → refação 2 (mesma cena) → versão 3 sem fonte; saldo 2→1→0; 2 envios',
  S2: 'S2 outro filme: 1 refação (regra de 19/10), versão nova sem fonte, saldo 0, sem linha',
  S3: 'S3 idempotente: 2 cliques = 1 envio; 2 entregas concorrentes = 1 versão nova + 1 fonte (id determinístico) + 1 free_used',
  S4: 'S4 elo forjado = sem refação (elo_invalido); elo seq 3 = teto_da_cadeia; nada enviado',
  S5: 'S5 sem dinheiro: só events+videos, credits_used 0, nenhum import de crédito/checkout',
  S6: 'S6 eventos: scene_redo_free_used (servidor, film_id/scene_index/free_seq); offer_viewed + clicked na fiação (film_id, scene_index)',
  S7: 'S7 fiação: linha acima do player (antes do <video>, longe do download); en/pt/es; painel segue a cadeia só depois da troca',
}
for (const k of Object.keys(NOMES)) ok(real[k] === true, NOMES[k])

async function mutante(nome, L, alvo) {
  let r
  try { r = await provas(L) } catch { r = {} }
  ok(r[alvo] === false, `${nome}: aplicou e ${alvo} ficou vermelho`)
}
await mutante('M1 versão nova ganha refação em qualquer filme', mutado(F.regra, 'return a.primeiroFilme === true && seq + 1 <= FREE_REDO_FIRST_FILM_TOTAL', 'return seq + 1 <= FREE_REDO_FIRST_FILM_TOTAL'), 'S2')
await mutante('M2 teto do primeiro filme vira 3', mutado(F.regra, 'export const FREE_REDO_FIRST_FILM_TOTAL = 2', 'export const FREE_REDO_FIRST_FILM_TOTAL = 3'), 'S1')
await mutante('M3 servidor não confere o teto da cadeia', mutado(F.film, 'if (chain && (chain.seq > FREE_REDO_FIRST_FILM_TOTAL || chain.parentVideoId === videoId))', 'if (false)'), 'S4')
await mutante('M4 fonte da versão nova com id aleatório', mutado(F.film, 'id: uuidFrom(`kineo:free-redo:film-chain:v1:${renderId}`), ', ''), 'S1')
await mutante('M5 servidor esquece o scene_redo_free_used', mutado(F.film, 'await evento(d, userId, videoId, SCENE_REDO_FUNNEL_EVENTS.freeUsed, {', 'if (false) await evento(d, userId, videoId, SCENE_REDO_FUNNEL_EVENTS.freeUsed, {'), 'S6')
await mutante('M6 elo sem conferência de assinatura', mutado(F.film, "  if (!elo.ok) return { ok: false as const, motivo: 'elo_invalido' }", ''), 'S4')
await mutante('M7 a cena refeita não pode ser refeita de novo', mutado(F.film, 'chain ? { [chain.sceneIndex]: chain.clipUrl } : null', 'null'), 'S1')
await mutante('M8 primeiro filme decidido sem olhar o histórico', mutado(F.film, "return !error && !!data && (data as { id?: unknown }).id === videoId", 'return true'), 'S2')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
