// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — guardião do "REFAZEMOS 1× DE GRAÇA"
// (Filmes: "Refazer uma cena (grátis, 1×)"). OFFLINE: executa o código real de lib/freeRedo/* com banco, fal, Creatomate
// e bucket FALSOS (nenhuma rede, chave ou banco de verdade).
// Provas:
//   F1  RenderScript guardado só nos motores clássicos, ASSINADO; outro dono, outro render, fonte adulterada = recusa;
//   F2  cenas refazíveis: só claim do dono, motor clássico, clipe presente na montagem, payload assinado válido;
//   F3  cena nova = payload assinado + pedido de variação (+ semente nova se o motor tem); troca TODAS as ocorrências do clipe;
//   I1  idempotência: dois cliques juntos = 1 linha-trava, 1 envio à fal, o 2º recebe o estado do 1º;
//   I2  só o dono: outra conta recebe 404 e nada é enviado; fonte forjada (sem assinatura válida) não serve;
//   I3  1× por vídeo: fluxo inteiro (cena → montagem → versão NOVA em videos, a original intacta); 2º pedido = 409 ja_usada;
//   I4  débito zero: só `events` e `videos` são tocadas, a versão nova tem credits_used 0, nenhum import de crédito;
//   I5  trava diária GLOBAL: vagas com id determinístico; teto cheio = 429 sem envio e sem gastar a vez; linha forjada
//       com o nome do evento não ocupa vaga; corrida pela última vaga = só um passa;
//   I6  o servidor decide: o corpo só leva filme + cena; campos extras são ignorados; cena fora da lista = 400;
//   I7  falha honesta: recusa explícita não gasta a vez, envio ambíguo gasta; 2 gastas = acabou; eventos com produto/motor/custo;
//   R1  /api/compose mantém a base aprovada e seus dois hooks de refação, byte a byte; a rota nova não toca crédito;
//   R2  HistoryClient mantém a base aprovada e seus dois hooks de refação, byte a byte; 16 línguas;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { MARCA_META95_REFAZER_1910, ACRESCIMOS_META95_REFAZER_1910 } from './test-support/desfaz-meta95-refazer-1910.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
// KINEO-KLING4-COMPLEMENTO3-2910: estes dois arquivos NÃO mudaram neste complemento.
// A base completa aprovada já contém as entregas posteriores a 19/10 (incluindo o trial Kling4).
// Os projetores históricos falhavam nesta própria base; não alteramos esses adaptadores compartilhados.
// R1/R2 continuam estritos: agora comparam o arquivo ATUAL INTEIRO, byte a byte após normalizar CRLF,
// com a base revisada, sem remover nenhuma camada. Hooks, posição, línguas e limites seguem conferidos.
const BASE_REFACAO_COMPAT_ATUAL = 'e60fc31b1387bcb0f01e7da26cb8b55d21ec6fab'
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0

const F = {
  core: 'lib/freeRedo/core.ts',
  pub: 'lib/freeRedo/public.ts',
  cap: 'lib/freeRedo/cap.ts',
  film: 'lib/freeRedo/filmServer.ts',
  fonte: 'lib/freeRedo/fonteDoFilme.ts',
  copy: 'lib/freeRedo/copy.ts',
  rota: 'app/api/free-redo/film/route.ts',
  botao: 'components/video/FreeRedoFilmButton.tsx',
  compose: 'app/api/compose/route.ts',
  hist: 'app/(dashboard)/history/HistoryClient.tsx',
}

function carregar(source) {
  const load = createOfflineLoader({ source, globals: { Date, Math, JSON, Promise } })
  return { core: load(F.core), cap: load(F.cap), film: load(F.film), copy: load(F.copy) }
}

// ── banco falso: só o que as libs usam (select/eq/in/order/limit/maybeSingle, insert, update condicional) ──
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
      select(_c) { if (st.op !== 'select') st.wantSelect = true; return b },
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

// ── o filme de teste (Seedance i2v, 2 cenas; a cena 1 aparece em DOIS planos cortados) ──
const SECRET = 'segredo-de-teste'
const DONO = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'
const VIDEO = '33333333-3333-4333-8333-333333333333'
const GEN = 'gen-refazer-1910-abcdef'
const RENDER = 'render-original-1'
const SEED_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const CLIP0 = 'https://v3.fal.media/files/clip0.mp4'
const CLIP1 = 'https://v3.fal.media/files/clip1.mp4'
const PROMPT0 = 'Vertical 9:16 composition, a lighthouse keeper climbing a spiral staircase at dusk, cinematic light'
const fonteFilme = () => ({
  output_format: 'mp4', width: 1080, height: 1920, duration: 10,
  elements: [
    { type: 'video', track: 1, time: 0, duration: 2.5, source: CLIP0, trim_start: 0 },
    { type: 'video', track: 1, time: 2.5, duration: 2.5, source: CLIP0, trim_start: 2.5 },
    { type: 'video', track: 1, time: 5, duration: 5, source: CLIP1 },
    { type: 'audio', track: 2, time: 0, source: 'https://storage.example/voice.mp3' },
    { type: 'text', track: 3, time: 0, text: 'legenda' },
  ],
})
const claimFilme = (over = {}) => ({
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
  ...over,
})

function montarMundo(L, opts = {}) {
  const fonteMeta = L.core.filmSourceMetadata({ secret: opts.fonteSecret ?? SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
  const events = [...(opts.extraEvents ?? [])]
  if (fonteMeta && !opts.semFonte) events.push({ id: 'fonte-1', name: L.core.FILM_SOURCE_EVENT, user_id: DONO, path: '/api/compose', session_id: GEN, metadata: opts.fonteMeta ?? fonteMeta, created_at: '2026-10-19T10:00:00Z' })
  const db = fakeDb({
    events,
    videos: [{ id: VIDEO, user_id: DONO, status: 'completed', render_id: RENDER, title: 'O farol', topic: 'farol', quality_mode: 'cinematic_ai', duration: 10, platform: 'TikTok', youtube_description: null, video_url: 'https://storage.example/original.mp4' }],
  })
  const log = { submits: [], renders: [], persists: [], events: [], polls: 0 }
  let t = Date.parse('2026-10-19T12:00:00Z')
  let owner = 0
  const d = {
    db, secret: SECRET,
    now: () => t,
    random: () => 0.5,
    newOwner: () => `owner-${++owner}`,
    loadClaim: async ({ userId, generationId }) => (generationId === GEN && userId === DONO ? { ok: true, claim: opts.claim ?? claimFilme() } : { ok: true, claim: null }),
    submitScene: async (model, input) => {
      log.submits.push({ model, input })
      if (opts.submitErro) throw opts.submitErro
      await Promise.resolve()
      return `req-${log.submits.length}`
    },
    pollScene: async () => { log.polls++; return opts.cenaFalha ? { status: 'failed', url: null } : { status: 'done', url: 'https://v3.fal.media/files/novo.mp4' } },
    submitRender: async (source) => { log.renders.push(source); return 'render-novo-1' },
    pollRender: async () => ({ status: 'succeeded', url: 'https://creatomate.example/novo.mp4', snapshotUrl: null, error: null, durationSeconds: 10 }),
    persist: async (a) => { log.persists.push(a); return { videoUrl: 'https://storage.example/novo.mp4', thumbnailUrl: null, measuredSeconds: 10 } },
    deadUrls: async () => [],
    event: async (e) => { log.events.push(e); return true },
    avancar: (ms) => { t += ms },
  }
  return { d, db, log }
}

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_REFAZER) console.log(k, e && e.stack); r[k] = false } }
  const C = L.core

  await tenta('F1', () => {
    const m = C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() })
    const ok = C.verifyFilmSource(SECRET, DONO, RENDER, m)
    const outroDono = C.verifyFilmSource(SECRET, OUTRO, RENDER, m)
    const outroRender = C.verifyFilmSource(SECRET, DONO, 'render-x', m)
    const adulterada = JSON.parse(JSON.stringify(m)); adulterada.source.elements[2].source = 'https://evil.example/x.mp4'
    const semAut = { ...m, authority: undefined }
    return ok.ok === true && ok.generationId === GEN && outroDono.ok === false && outroRender.ok === false &&
      C.verifyFilmSource(SECRET, DONO, RENDER, adulterada).ok === false && C.verifyFilmSource(SECRET, DONO, RENDER, semAut).ok === false &&
      C.verifyFilmSource('outro-segredo', DONO, RENDER, m).ok === false &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_hollywood', source: fonteFilme() }) === null &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'fast', source: fonteFilme() }) === null &&
      C.filmSourceMetadata({ secret: '', userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: fonteFilme() }) === null &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: null, quality: 'cinematic_veo', source: fonteFilme() }) === null &&
      C.filmSourceMetadata({ secret: SECRET, userId: DONO, renderId: RENDER, generationId: GEN, quality: 'cinematic_kling', source: { elements: [] } }) === null
  })

  await tenta('F2', () => {
    const cenas = C.cenasDoFilme(claimFilme(), DONO, fonteFilme())
    const deOutro = C.cenasDoFilme(claimFilme({ userId: OUTRO }), DONO, fonteFilme())
    const pendente = C.cenasDoFilme(claimFilme({ status: 'pending' }), DONO, fonteFilme())
    const semClipe = C.cenasDoFilme(claimFilme(), DONO, { elements: [{ type: 'video', source: CLIP1 }] })
    const semImagem = claimFilme(); semImagem.response.scene_fal_inputs[0] = { prompt: PROMPT0, duration: '5' }
    const comKling3 = { ...fonteFilme(), elements: [...fonteFilme().elements, { type: 'video', track: 1, time: 10, duration: 5, source: 'https://v3.fal.media/files/clip2.mp4' }] }
    return cenas.length === 2 && C.cenasDoFilme(claimFilme(), DONO, comKling3).map((c) => c.index).join() === '0,1' && cenas[0].index === 0 && cenas[1].index === 1 && cenas[0].text === 'The keeper climbs.' &&
      deOutro.length === 0 && pendente.length === 0 && semClipe.length === 1 && semClipe[0].index === 1 &&
      C.cenasDoFilme(semImagem, DONO, fonteFilme()).map((c) => c.index).join() === '1'
  })

  await tenta('F3', () => {
    const v = C.variarEntrada({ prompt: PROMPT0, image_url: 'https://x/y.jpg', duration: '5', seed: 42 }, 777)
    const semSeed = C.variarEntrada({ prompt: PROMPT0, duration: '5' }, 777)
    const fonte = fonteFilme()
    const t = C.trocarClipe(fonte, CLIP0, 'https://novo/clip.mp4')
    return v.prompt === PROMPT0 + C.FREE_REDO_VARIATION && v.seed === 777 && v.duration === '5' && v.image_url === 'https://x/y.jpg' &&
      !('seed' in semSeed) && t.trocados === 2 && t.source.elements[0].source === 'https://novo/clip.mp4' &&
      t.source.elements[1].trim_start === 2.5 && t.source.elements[2].source === CLIP1 && fonte.elements[0].source === CLIP0
  })

  await tenta('I1', async () => {
    const { d, db, log } = montarMundo(L)
    const [a, b] = await Promise.all([
      L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 }),
      L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 }),
    ])
    const ordens = db.tables.events.filter((e) => e.name === C.FILM_ORDER_EVENT)
    return log.submits.length === 1 && ordens.length === 1 && ordens[0].id === C.filmOrderId(VIDEO) &&
      [a.status, b.status].every((s) => s === 202) && a.body.credits === 0 && b.body.credits === 0
  })

  await tenta('I2', async () => {
    const { d, log, db } = montarMundo(L)
    const x = await L.film.iniciarRefacaoFilme(d, { userId: OUTRO, videoId: VIDEO, sceneIndex: 0 })
    const g = await L.film.acompanharRefacaoFilme(d, { userId: OUTRO, videoId: VIDEO, lite: true })
    const forjada = montarMundo(L, { fonteSecret: 'segredo-do-atacante' })
    const y = await L.film.iniciarRefacaoFilme(forjada.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    return x.status === 404 && g.status === 404 && log.submits.length === 0 && !db.tables.events.some((e) => e.name === C.FILM_ORDER_EVENT) &&
      y.status === 409 && y.body.motivo === 'sem_fonte' && forjada.log.submits.length === 0
  })

  let fluxo = null
  await tenta('I3', async () => {
    const { d, db, log } = montarMundo(L)
    const lite0 = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO, lite: true })
    const lista = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO })
    const p = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    const g1 = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO }) // cena pronta → montagem enviada
    const g2 = await L.film.acompanharRefacaoFilme(d, { userId: DONO, videoId: VIDEO }) // montagem pronta → versão nova
    const de2 = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 })
    const novo = db.tables.videos.find((v) => v.render_id === 'render-novo-1')
    const orig = db.tables.videos.find((v) => v.id === VIDEO)
    const montada = log.renders[0]
    fluxo = { db, log, novo }
    return lite0.body.estado === 'available' && lista.body.scenes?.length === 2 && p.status === 202 && g1.body.estado === 'working' &&
      g2.body.estado === 'done' && g2.body.new_video_id === novo?.id && novo && novo.credits_used === 0 && novo.title === 'O farol · v2' &&
      novo.status === 'completed' && orig.video_url === 'https://storage.example/original.mp4' && orig.render_id === RENDER &&
      g2.body.previous_video_url === 'https://storage.example/original.mp4' &&
      montada.elements.filter((e) => e.source === 'https://v3.fal.media/files/novo.mp4').length === 2 &&
      montada.elements[2].source === CLIP1 && montada.elements[4].text === 'legenda' &&
      de2.status === 409 && de2.body.motivo === 'ja_usada' && log.submits.length === 1 && log.renders.length === 1
  })

  await tenta('I4', async () => {
    if (!fluxo) return false
    const tocadas = [...fluxo.db.touched].sort().join(',')
    const srcs = [F.core, F.cap, F.film, F.fonte, F.rota].map(rd).join('\n')
    const ev = (n) => fluxo.log.events.find((e) => e.name === n)
    const req = ev('free_redo_requested'), del = ev('free_redo_delivered')
    return tocadas === 'events,videos' && fluxo.novo.credits_used === 0 &&
      !/@\/lib\/credits|debitVideoCredits|refundRenderCredits|recordRenderIntent|chargeAdsV2|credit_debits|video_credits|render_jobs'/.test(srcs.replace(/^\s*\/\/.*$/gm, '')) &&
      req && req.metadata.product === 'film' && req.metadata.engine === SEED_MODEL && typeof req.metadata.estimated_usd === 'number' && req.metadata.estimated_usd > 0 &&
      del && del.metadata.product === 'film' && del.metadata.engine === SEED_MODEL && del.metadata.new_video_id === fluxo.novo.id
  })

  await tenta('I5', async () => {
    const dia = C.utcDay(Date.parse('2026-10-19T12:00:00Z'))
    const ids = C.capSlotIds(dia)
    const cheio = ids.map((id, k) => ({ id, name: C.CAP_SLOT_EVENT, user_id: OUTRO, session_id: dia, metadata: { slot: k } }))
    const a = montarMundo(L, { extraEvents: cheio })
    const ra = await L.film.iniciarRefacaoFilme(a.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    const ordemA = a.db.tables.events.find((e) => e.name === C.FILM_ORDER_EVENT)
    // 199 vagas reais + 300 linhas FORJADAS com o mesmo nome (ids aleatórios): a última vaga real ainda existe.
    const forjadas = Array.from({ length: 300 }, (_, i) => ({ id: `forjada-${i}`, name: C.CAP_SLOT_EVENT, user_id: OUTRO, session_id: dia, metadata: {} }))
    const b = montarMundo(L, { extraEvents: [...cheio.slice(0, 199), ...forjadas] })
    const rb = await L.film.iniciarRefacaoFilme(b.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    // corrida pela última vaga (duas contas, dois filmes): só uma passa.
    const db = fakeDb({ events: cheio.slice(0, 199) })
    const [v1, v2] = await Promise.all([
      L.cap.reservarVagaDoDia(db, { userId: DONO, product: 'film', ref: 'a', path: '/x', nowMs: Date.parse('2026-10-19T12:00:00Z') }),
      L.cap.reservarVagaDoDia(db, { userId: OUTRO, product: 'ads', ref: 'b', path: '/x', nowMs: Date.parse('2026-10-19T13:00:00Z') }),
    ])
    const vagas = db.tables.events.filter((e) => ids.includes(e.id)).length
    return ra.status === 429 && ra.body.motivo === 'teto_do_dia' && a.log.submits.length === 0 && ordemA?.metadata?.status === 'failed' &&
      L.core.tentativasGastas(ordemA.metadata) === 0 && L.core.decidirPedido(ordemA.metadata) === 'retomar' &&
      a.log.events.some((e) => e.name === 'free_redo_failed' && e.metadata.reason === 'daily_cap') &&
      rb.status === 202 && b.log.submits.length === 1 &&
      [v1.ok, v2.ok].filter(Boolean).length === 1 && vagas === 200 && C.FREE_REDO_DAILY_CAP === 200 && ids.length === 200 && new Set(ids).size === 200
  })

  await tenta('I6', async () => {
    const { d, log } = montarMundo(L)
    const fora = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 2 }) // a cena do Kling 3: fora da lista
    const neg = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: -1 })
    const ok = await L.film.iniciarRefacaoFilme(d, { userId: DONO, videoId: VIDEO, sceneIndex: 0, free: false, cost: 999, model: 'evil/model', prompt: 'evil' })
    const rota = rd(F.rota)
    const s = log.submits[0]
    return fora.status === 400 && neg.status === 400 && ok.status === 202 && log.submits.length === 1 && s.model === SEED_MODEL &&
      s.input.prompt.startsWith(PROMPT0) && s.input.image_url === 'https://cdn.example/still0.jpg' && s.input.duration === '5' &&
      /iniciarRefacaoFilme\(x\.d, \{ userId: x\.userId, videoId: body\?\.videoId, sceneIndex: body\?\.sceneIndex \}\)/.test(rota) &&
      rota.indexOf('auth.getUser()') > -1 && rota.indexOf('auth.getUser()') < rota.indexOf('createAdminClient(url') &&
      /export const fetchCache = 'force-no-store'/.test(rota)
  })

  await tenta('I7', async () => {
    const recusa = montarMundo(L, { submitErro: Object.assign(new Error('422'), { ambiguous: false }) })
    const r1 = await L.film.iniciarRefacaoFilme(recusa.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    const o1 = recusa.db.tables.events.find((e) => e.name === C.FILM_ORDER_EVENT).metadata
    const amb = montarMundo(L, { submitErro: Object.assign(new Error('503'), { ambiguous: true }) })
    await L.film.iniciarRefacaoFilme(amb.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    const o2 = amb.db.tables.events.find((e) => e.name === C.FILM_ORDER_EVENT).metadata
    await L.film.iniciarRefacaoFilme(amb.d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 })
    const o3 = amb.db.tables.events.find((e) => e.name === C.FILM_ORDER_EVENT).metadata
    const r4 = await L.film.iniciarRefacaoFilme(amb.d, { userId: DONO, videoId: VIDEO, sceneIndex: 1 })
    const falha = montarMundo(L, { cenaFalha: true })
    await L.film.iniciarRefacaoFilme(falha.d, { userId: DONO, videoId: VIDEO, sceneIndex: 0 })
    const g = await L.film.acompanharRefacaoFilme(falha.d, { userId: DONO, videoId: VIDEO })
    const evF = falha.log.events.find((e) => e.name === 'free_redo_failed')
    return r1.status === 502 && o1.status === 'failed' && L.core.tentativasGastas(o1) === 0 && L.core.decidirPedido(o1) === 'retomar' &&
      L.core.tentativasGastas(o2) === 1 && L.core.tentativasGastas(o3) === 2 && r4.status === 409 && r4.body.motivo === 'ja_usada' &&
      amb.log.submits.length === 2 && g.body.estado === 'failed_retry' && evF && evF.metadata.product === 'film' &&
      evF.metadata.engine === SEED_MODEL && evF.metadata.reason === 'scene_failed' && 'estimated_usd' in evF.metadata
  })

  await tenta('R1', () => {
    const rota = rd(F.compose)
    const marcadas = rota.split('\n').filter((l) => l.includes(MARCA_META95_REFAZER_1910))
    const base = lf(execFileSync('git', ['show', `${BASE_REFACAO_COMPAT_ATUAL}:${F.compose}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
    const chamada = marcadas.find((l) => l.includes('await guardarFonteDoFilme('))
    const i = rota.split('\n').findIndex((l) => l === chamada)
    const anterior = rota.split('\n')[i - 1] ?? ''
    return marcadas.length === ACRESCIMOS_META95_REFAZER_1910[F.compose] && rota === base &&
      /^import \{ guardarFonteDoFilme \} from '@\/lib\/freeRedo\/fonteDoFilme'/.test(marcadas[0]) &&
      !!chamada && /renderId, quality, source \}\)/.test(chamada) && anterior.includes('await registrarVersaoDaCasa({ userId: authenticatedUserId, generationId, renderId, quality, decisao: semLegenda, source })')
  })

  await tenta('R2', () => {
    const h = rd(F.hist)
    const marcadas = h.split('\n').filter((l) => l.includes(MARCA_META95_REFAZER_1910))
    const base = lf(execFileSync('git', ['show', `${BASE_REFACAO_COMPAT_ATUAL}:${F.hist}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
    const langs = Object.keys(L.copy.FREE_REDO_COPY)
    const chaves = Object.keys(L.copy.FREE_REDO_COPY.en)
    const botao = rd(F.botao)
    return marcadas.length === ACRESCIMOS_META95_REFAZER_1910[F.hist] && h === base &&
      marcadas.some((l) => /<FreeRedoFilmButton videoId=\{video\.id\} qualityMode=\{video\.quality_mode\} createdAt=\{video\.created_at\} \/>/.test(l)) &&
      langs.length === 16 && langs.every((k) => chaves.every((c) => typeof L.copy.FREE_REDO_COPY[k][c] === 'string' && L.copy.FREE_REDO_COPY[k][c].length > 0)) &&
      L.copy.FREE_REDO_COPY.pt.button === 'Refazer uma cena (grátis, 1×)' && /1 refação grátis por vídeo/.test(L.copy.FREE_REDO_COPY.pt.hint) &&
      L.copy.FREE_REDO_COPY.en.hint.startsWith('1 free redo per video') &&
      !/node:crypto|lib\/freeRedo\/core/.test(botao) && /useInterfaceLanguage\(\)/.test(botao)
  })
  return r
}

const real = await provas(carregar(null))
const NOMES = {
  F1: 'F1 RenderScript guardado só nos clássicos e ASSINADO; outro dono/outro render/adulterado/sem assinatura = recusa',
  F2: 'F2 cenas refazíveis: claim do dono e liquidado, motor clássico, clipe na montagem, payload assinado válido',
  F3: 'F3 cena nova = payload assinado + variação (+ semente nova); troca todas as ocorrências sem mexer no original',
  I1: 'I1 idempotência: dois cliques juntos = 1 linha-trava, 1 envio à fal, 202 para os dois, 0 crédito',
  I2: 'I2 só o dono: outra conta = 404 sem envio; fonte forjada (sem assinatura válida) = sem_fonte',
  I3: 'I3 1× por vídeo: cena → montagem → versão NOVA (0 crédito, " · v2"), original intacta; 2º pedido = 409 ja_usada',
  I4: 'I4 débito zero: só events e videos tocadas; nenhum import/tabela de crédito; eventos com produto/motor/custo',
  I5: 'I5 teto diário global de 200: cheio = 429 sem envio e sem gastar a vez; forjadas não ocupam vaga; corrida = 1 passa',
  I6: 'I6 o servidor decide: só filme + cena do corpo; extras ignorados; cena fora da lista = 400; login antes do serviço',
  I7: 'I7 falha honesta: recusa não gasta, ambíguo gasta, 2 gastas = acabou; cena falhada = failed_retry + evento',
  R1: 'R1 /api/compose: arquivo completo igual à base aprovada, hooks marcados após registrarVersaoDaCasa',
  R2: 'R2 biblioteca: arquivo completo igual à base aprovada, hooks marcados; 16 línguas; botão sem node:crypto',
}
for (const [k, m] of Object.entries(NOMES)) { if (real[k]) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

// ── mutantes: cada um quebra UMA regra; tem de aplicar (o texto mudou) e de deixar a prova dele vermelha ──
const MUTANTES = [
  ['M1 trava por clique (id aleatório)', 'I1', F.core, [['return uuidFrom(`kineo:free-redo:film:v1:${videoId}`)', 'return uuidFrom(`kineo:free-redo:film:v1:${videoId}:${Math.random()}`)']]],
  ['M2 sem conferir o dono do vídeo', 'I2', F.film, [[".eq('id', videoId)\n    .eq('user_id', userId)\n    .maybeSingle()\n  if (error) return 'erro'", ".eq('id', videoId)\n    .maybeSingle()\n  if (error) return 'erro'"], ['return v && v.user_id === userId && v.id === videoId ? v : null', 'return v && v.id === videoId ? v : null']]],
  ['M3 assinatura da fonte ignorada', 'I2', F.core, [['if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, motivo: \'assinatura_invalida\' }', 'void timingSafeEqual']]],
  ['M4 refação já entregue volta a ser grátis', 'I3', F.core, [["if (s === 'done') return 'usada'", "if (s === 'done') return 'retomar'"]]],
  ['M5 débito escondido na entrega', 'I4', F.film, [['  const assets = await d.persist(', "  await d.db.from('credit_debits').insert({ render_id: renderId, user_id: userId, amount: 15 })\n  const assets = await d.persist("]]],
  ['M6 teto diário furado', 'I5', F.cap, [["return { ok: false, motivo: tentativas >= TENTATIVAS ? 'indisponivel' : 'teto', day }", "return { ok: true, slotId: 'furo', k: -1, day }"]]],
  ['M7 teto contado pelo nome (forjada ocupa vaga)', 'I5', F.cap, [["const { data, error } = await db.from('events').select('id').in('id', ids.slice(i, i + LOTE))", "const { data, error } = await db.from('events').select('id').eq('name', CAP_SLOT_EVENT)\n      for (const _x of (data ?? [])) usados.add(ids[usados.size] ?? 'x')"]]],
  ['M8 cena fora da lista vira a 1ª', 'I6', F.film, [['const cena = cenas.find((x) => x.index === sceneIndex)', 'const cena = cenas.find((x) => x.index === sceneIndex) ?? cenas[0]']]],
  ['M9 recusa explícita gasta a vez', 'I7', F.film, [['gastas: tentativasGastas(meu) + (ambiguo ? 1 : 0)', 'gastas: tentativasGastas(meu) + 1']]],
  ['M10 troca só a 1ª ocorrência do clipe', 'F3', F.core, [["if (x.type === 'video' && x.source === oldUrl) { x.source = newUrl; trocados++ }", "if (x.type === 'video' && x.source === oldUrl && trocados === 0) { x.source = newUrl; trocados++ }"]]],
  ['M11 Kling 3 entra na lista', 'F2', F.core, [['if (typeof model !== \'string\' || !CLASSIC.has(model)) continue', 'if (typeof model !== \'string\') continue']]],
]
for (const [nome, prova, arquivo, trocas] of MUTANTES) {
  let aplicou = 0
  const fonte = (rel, raw) => {
    if (rel !== arquivo) return raw
    let out = raw
    for (const [de, para] of trocas) { if (out.split(de).length !== 2) return raw; out = out.split(de).join(para); aplicou++ }
    return out
  }
  const res = await provas(carregar(fonte))
  const ok = aplicou === trocas.length && res[prova] === false
  if (ok) { pass++; console.log(`  ok  ${nome}: aplicou e ${prova} ficou vermelho`) } else { fail++; console.log(`  FAIL ${nome}: aplicou=${aplicou}/${trocas.length} ${prova}=${res[prova]}`) }
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
