// KINEO-META95-UGC-1910 — guardião do JUIZ DE UGC / APRESENTADOR da régua 95 (fundador 19/10: "Vai pra meta do 95").
// OFFLINE: executa o código real de lib/regua95/ugcJudge.ts, pixelScore.ts e lib/admin/regua95Painel.ts com fetch FALSO
// (nenhuma rede, chave ou banco). Provas:
//   U1  plano de quadros: 6 do gancho a cada 0,5 s (0–2,5 s) + 6 na fala (3 s até o fim da voz, grade de 0,5 s); pausa só com
//       os tempos; fala sem voice_seconds (avatar) = vídeo inteiro;
//   U2  fal: UMA chamada extract-nth-frame (passo 12 a 24 fps, max_frames até o último quadro do plano), quadros mapeados ao
//       plano pelo tempo; sem chave = null;
//   U3  a nota nasce no código: olhos fechados em 2 quadros SEGUIDOS do gancho = 75 (2 separados não); 3 fechados = 85;
//       sorriso de dentes em 2 = 85; mão extra = 75, deformada 2 = 75, 1 = 90; duplicação = 60; rótulo diferente 2 = 70
//       (sem foto do pedido não conta); legenda ilegível 2 = 85; boca aberta na pausa = 90 só com os tempos; leves ≥ 90;
//   U4  calibração dos casos de 19/10 (rótulos quadro a quadro dos MP4 reais, 288×512 = o que o gpt-4o low vê):
//       af33b3c0 (warm, olho 7, olhos fechados 0,1–1,3 s) cai para 75; R3 84a5d07f (olho 9) ≥ 95 sem os tempos de pausa;
//       Universo B (olho 8) ≥ B refeito (olho 7) ≥ 90; o warm é o MENOR;
//   U5  pixel: no UGC "legenda partida" não tem teto (o falso 88 do R3); filme continua com o teto 88;
//   U6  juiz: 1 leitura, gpt-4o detail low, foto do produto como 1ª imagem, perguntas objetivas; 1 vídeo ≤ US$ 0,01 com uso
//       realista (fal incluída);
//   U7  coletor: UGC (Ads com apresentador + avatar) ganha o juiz, fala = voice_seconds do pedido, evento ugc_score só em
//       events, idempotente pela versão; filme/Ads sem apresentador/clipe NÃO;
//   U8  painel: ugc_score entra na versão vigente, nota UGC = a menor entre pixel e juiz UGC, coluna "juiz UGC" e motivos
//       por quadro no /admin/coerencia;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
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

const F = {
  ugc: 'lib/regua95/ugcJudge.ts',
  pixel: 'lib/regua95/pixelScore.ts',
  coletar: 'lib/regua95/coletar.ts',
  painel: 'lib/admin/regua95Painel.ts',
  pagina: 'app/admin/coerencia/page.tsx',
}

function carregar(source) {
  const load = createOfflineLoader({ source, globals: { setTimeout: () => 0, clearTimeout() {}, AbortController, Date, Math, JSON, Promise } })
  return { ugc: load(F.ugc), pixel: load(F.pixel), painel: load(F.painel, ROOT) }
}
function fetchFalso(respostas) {
  const chamadas = []
  let i = 0
  const f = async (url, init) => {
    chamadas.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null })
    const r = respostas[Math.min(i++, respostas.length - 1)]
    if (r === 'fail') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => r }
  }
  f.chamadas = chamadas
  return f
}
const respOpenAi = (obj, usage) => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage })

// ── rótulos dos casos reais de 19/10 (quadros do plano extraídos por ffmpeg dos MP4 entregues, vistos a 288×512) ──
// letra por quadro: o=aberto c=fechado h=semicerrado; g=sorriso de dentes; ordem = plano (gancho 0..2,5; fala; pausa se houver)
const F_ = (eyes, grin = false, extra = {}) => ({ eyes, grin, mouth: 'na', hand: 'ok', dup: false, label: 'match', caption: 'ok', note: '', ...extra })
const CASOS = {
  // af33b3c0 · voz 8,1 s · plano: 0 0,5 1 1,5 2 2,5 | 3 4 5 6 7 8 (+ pausa 3,5 só na calibração com tempos)
  warm: { olho: 7, speech: 8.1, seconds: 12.75, frames: [F_('open'), F_('closed', true), F_('closed'), F_('open'), F_('open', true), F_('half'), F_('open', true), F_('closed'), F_('open'), F_('half', true), F_('closed', true), F_('open')] },
  // 84a5d07f · voz 8,892 s · plano: 0 0,5 1 1,5 2 2,5 | 3 4 5,5 6,5 7,5 8,5
  r3: { olho: 9, speech: 8.892, seconds: 13.54, frames: [F_('open'), F_('open'), F_('open'), F_('open'), F_('open'), F_('open', true), F_('open'), F_('open'), F_('open'), F_('open'), F_('open'), F_('open')] },
  // 0c32bd6f · voz ~9,18 s · plano: 0 0,5 1 1,5 2 2,5 | 3 4 5,5 6,5 7,5 9
  b: { olho: 8, speech: 9.18, seconds: 13.83, frames: [F_('open'), F_('open'), F_('half'), F_('open'), F_('open'), F_('open'), F_('open'), F_('open'), F_('open'), F_('closed'), F_('open'), F_('open')] },
  // 4a5344aa · voz ~7,43 s · plano: 0 0,5 1 1,5 2 2,5 | 3 4 4,5 5,5 6,5 7
  b2: { olho: 7, speech: 7.43, seconds: 12.08, frames: [F_('open'), F_('open'), F_('half'), F_('open'), F_('half'), F_('open'), F_('closed'), F_('open'), F_('open'), F_('open'), F_('half'), F_('half')] },
}

function notaDoCaso(U, caso, comPausa = null) {
  const plan = U.planUgcFrames({ seconds: caso.seconds, speechSeconds: caso.speech, pausesSeconds: comPausa ? [comPausa.t] : null })
  const frames = plan.map((p, k) => ({ url: `data:f${k}`, t: p.t, zone: p.zone }))
  const respostas = []
  let j = 0
  for (const p of plan) respostas.push(p.zone === 'pausa' ? F_('open', false, { mouth: comPausa.mouth }) : caso.frames[j++])
  return U.normalizeUgc({ frames: respostas.map((r, k) => ({ i: k + 1, ...r })) }, { frames, hasReference: true, hasPauses: !!comPausa, speechSeconds: caso.speech, via: 'local', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 0 })
}

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_UGC) console.log(k, e && e.stack); r[k] = false } }
  const U = L.ugc

  await tenta('U1', () => {
    const p = U.planUgcFrames({ seconds: 12.75, speechSeconds: 8.1 })
    const gancho = p.filter((x) => x.zone === 'gancho').map((x) => x.t).join(',')
    const fala = p.filter((x) => x.zone === 'fala').map((x) => x.t)
    const okG = gancho === '0,0.5,1,1.5,2,2.5'
    const okF = fala.length === 6 && fala[0] === 3 && fala.every((t) => t >= 3 && t < 8.1 && Math.abs(t * 2 - Math.round(t * 2)) < 1e-9)
    const semPausa = !p.some((x) => x.zone === 'pausa')
    const comPausa = U.planUgcFrames({ seconds: 12.75, speechSeconds: 8.1, pausesSeconds: [3.5, 5.6, 7.2] }).filter((x) => x.zone === 'pausa').length === 2
    const avatar = U.planUgcFrames({ seconds: 16, speechSeconds: null }).filter((x) => x.zone === 'fala').pop().t >= 15
    return okG && okF && semPausa && comPausa && avatar && U.UGC_HOOK_FRAMES === 6 && U.UGC_SPEECH_FRAMES === 6
  })

  await tenta('U2', async () => {
    const plan = U.planUgcFrames({ seconds: 12.75, speechSeconds: 8.1 })
    const imgs = Array.from({ length: 17 }, (_, k) => ({ url: `https://fal/${k}.jpg`, file_size: 80000 }))
    const f = fetchFalso([{ images: imgs }])
    const ex = await U.extractUgcFramesFal('https://x/v.mp4', plan, { fetchImpl: f, falKey: 'k' })
    const b = f.chamadas[0]?.body
    const okCall = f.chamadas.length === 1 && f.chamadas[0].url.endsWith('/fal-ai/workflow-utilities/extract-nth-frame') && b.frame_interval === 12 && b.max_frames === 17
    const okMap = ex && ex.frames.length === 12 && ex.frames[1].url === 'https://fal/1.jpg' && ex.frames[1].t === 0.5 && ex.frames[6].t === 3 && ex.frames[6].url === 'https://fal/6.jpg' && ex.frames[6].zone === 'fala'
    const semChave = (await U.extractUgcFramesFal('https://x/v.mp4', plan, { fetchImpl: fetchFalso([{ images: imgs }]), falKey: '' })) === null
    const falhou = (await U.extractUgcFramesFal('https://x/v.mp4', plan, { fetchImpl: fetchFalso(['fail']), falKey: 'k' })) === null
    return okCall && okMap && semChave && falhou
  })

  await tenta('U3', () => {
    const fr = (zones) => zones.map((z, k) => ({ url: `https://f/${k}.jpg`, t: k * 0.5, zone: z }))
    const G6F6 = [...Array(6).fill('gancho'), ...Array(6).fill('fala')]
    const run = (over, opt = {}) => U.normalizeUgc({ frames: G6F6.map((_, k) => ({ i: k + 1, ...F_('open'), ...(over[k] ?? {}) })) }, { frames: fr(G6F6), hasReference: opt.ref ?? true, hasPauses: false, speechSeconds: 8, via: 'nth_frame', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 0 })
    const limpo = run({})
    const seguidos = run({ 1: { eyes: 'closed' }, 2: { eyes: 'closed' } })
    const separados = run({ 1: { eyes: 'closed' }, 3: { eyes: 'closed' } })
    const tres = run({ 0: { eyes: 'closed' }, 7: { eyes: 'closed' }, 9: { eyes: 'closed' } })
    const sorriso2 = run({ 6: { grin: true }, 8: { grin: true } })
    const sorriso1 = run({ 6: { grin: true } })
    const maoExtra = run({ 7: { hand: 'extra' } })
    const maoDef2 = run({ 7: { hand: 'deformed' }, 8: { hand: 'deformed' } })
    const maoDef1 = run({ 7: { hand: 'deformed' } })
    const dup = run({ 4: { dup: true } })
    const rot2 = run({ 6: { label: 'different' }, 7: { label: 'different' } })
    const rotSemFoto = run({ 6: { label: 'different' }, 7: { label: 'different' } }, { ref: false })
    const ileg = run({ 1: { caption: 'illegible' }, 2: { caption: 'illegible' } })
    const pausaFr = [...G6F6, 'pausa']
    const bocaPausa = U.normalizeUgc({ frames: pausaFr.map((_, k) => ({ i: k + 1, ...F_('open'), mouth: k === 12 ? 'open' : 'na' })) }, { frames: fr(pausaFr), hasReference: true, hasPauses: true, speechSeconds: 8, via: 'local', model: 'x', usdFrames: 0, usdVision: 0, ms: 0 })
    return limpo.score === 100 && limpo.caps.length === 0 &&
      seguidos.score === 75 && /2 quadros seguidos do gancho/.test(seguidos.caps[0]) && seguidos.motivos.some((m) => /^0,5 s gancho: olhos fechados/.test(m)) &&
      separados.score === 97 && separados.caps.length === 0 &&
      tres.score === 85 && sorriso2.score === 85 && sorriso1.score === 97 &&
      maoExtra.score === 75 && maoDef2.score === 75 && maoDef1.score === 90 && dup.score === 60 &&
      rot2.score === 70 && rotSemFoto.score === 100 && rotSemFoto.label_check === 'sem_foto' && ileg.score === 85 &&
      bocaPausa.score === 90 && bocaPausa.pause_check === 'ok' && limpo.pause_check === 'sem_tempos'
  })

  await tenta('U4', () => {
    const n = Object.fromEntries(Object.entries(CASOS).map(([k, c]) => [k, notaDoCaso(U, c)]))
    const warmPausa = notaDoCaso(U, CASOS.warm, { t: 3.5, mouth: 'closed' })
    const r3Pausa = notaDoCaso(U, CASOS.r3, { t: 5.65, mouth: 'open' })
    if (process.env.DEBUG_UGC) console.log(Object.fromEntries(Object.entries(n).map(([k, v]) => [k, [v.score, v.caps]])), warmPausa.score, r3Pausa.score)
    return n.warm.score === 75 && n.warm.caps.some((c) => /seguidos do gancho/.test(c)) && n.warm.caps.some((c) => /sorriso de dentes/.test(c)) &&
      n.r3.score >= 95 && n.b.score >= 95 && n.b.score >= n.b2.score && n.b2.score >= 90 &&
      Math.min(n.r3.score, n.b.score, n.b2.score) > n.warm.score && warmPausa.score === 75 && r3Pausa.score === 90
  })

  await tenta('U5', () => {
    const P = L.pixel
    const fr = (n) => Array.from({ length: n }, (_, i) => ({ url: `https://f/${i}.jpg`, t: i, bytes: 90000 }))
    const base = { via: 'nth_frame', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 0 }
    const quadros = { frames: [{ i: 1, score: 96, issues: ['caption_broken'] }, { i: 2, score: 96, issues: ['caption_broken'] }], caption_present: true, caption_legible: true }
    const ugc = P.normalizePixel(quadros, { ...base, product: 'ugc', frames: fr(2) })
    const filme = P.normalizePixel(quadros, { ...base, product: 'filme', frames: fr(2) })
    const ilegivelUgc = P.normalizePixel({ ...quadros, caption_legible: false }, { ...base, product: 'ugc', frames: fr(2) })
    const prompt = P.buildPixelMessages({ product: 'ugc', asked: 'x' }, fr(1))[0].content
    return ugc.score === 96 && ugc.caps.length === 0 && filme.score === 88 && ilegivelUgc.score === 85 && /never caption_broken|it is never caption_broken/.test(prompt)
  })

  await tenta('U6', async () => {
    const plan = U.planUgcFrames({ seconds: 12.75, speechSeconds: 8.1 })
    const frames = plan.map((p, k) => ({ url: `https://f/${k}.jpg`, t: p.t, bytes: 80000, zone: p.zone }))
    const f = fetchFalso([respOpenAi({ frames: frames.map((_, k) => ({ i: k + 1, ...F_('open') })), summary: 'ok' }, { prompt_tokens: 1750, completion_tokens: 340 })])
    const res = await U.judgeUgcFrames({ asked: 'Perfume LUME', narration: 'Conheça Perfume LUME', productPhotoUrls: ['https://foto/produto.jpg', 'https://foto/2.jpg'], speechSeconds: 8.1 }, frames, { fetchImpl: f, apiKey: 'k', via: 'nth_frame', usdFrames: 0.0015 })
    const corpo = f.chamadas[0]?.body
    const imgs = corpo.messages[1].content.filter((c) => c.type === 'image_url')
    const sys = corpo.messages[0].content
    const okCall = f.chamadas.length === 1 && corpo.model === 'gpt-4o' && corpo.temperature === 0 && imgs.length === 13 && imgs[0].image_url.url === 'https://foto/produto.jpg' && imgs.every((c) => c.image_url.detail === 'low')
    const okPerguntas = ['eyes:', 'grin:', 'mouth:', 'hand:', 'dup:', 'label:', 'caption:'].every((q) => sys.includes(q)) && /never a defect/.test(sys) && /HOOK/.test(corpo.messages[1].content[0].text)
    const semChave = (await U.judgeUgcFrames({ asked: 'x' }, frames, { fetchImpl: fetchFalso(['fail']), apiKey: '' })) === null
    return okCall && okPerguntas && res && res.score === 100 && res.usd <= 0.01 && res.usd > 0.005 && res.label_check === 'com_foto' && res.frame_urls.length === 12 && semChave && U.UGC_MODEL_DEFAULT === 'gpt-4o'
  })

  await tenta('U7', () => {
    const s = rd(F.coletar)
    const importa = /import \{ UGC_SCORE_EVENT, UGC_SCORE_VERSION, scoreUgc, type UgcContext \} from '@\/lib\/regua95\/ugcJudge'/.test(s)
    const voz = /select\('id, video_id, brief, plan, photos, language, voice_seconds'\)/.test(s) && /const ugc: UgcContext \| null = produto === 'ugc' \? \{[^\n]*speechSeconds: Number\.isFinite\(voz\) && voz > 0 \? voz : null, pausesSeconds: null/.test(s)
    const avatar = /ugc: \{ asked: script, narration: script \|\| null, speechSeconds: null, pausesSeconds: null, engine: 'avatar' \}/.test(s)
    const outros = (s.match(/ugc: null/g) ?? []).length === 3 // filme, clipe (videos), clipe (tabela)
    const chama = /if \(e\.ugc && !done\.has\(`\$\{UGC_SCORE_EVENT\}:\$\{e\.key\}`\)\) \{\n\s*const u = await scoreUgc\(e\.video_url, e\.seconds, e\.ugc, \{ fetchImpl: opts\.fetchImpl \}\)/.test(s)
    const grava = /await admin\.from\('events'\)\.insert\(\{ name: UGC_SCORE_EVENT, user_id: e\.user_id, session_id: e\.key, path: route, metadata: \{ \.\.\.u, \.\.\.base/.test(s)
    const idem = /if \(v === UGC_SCORE_VERSION\) done\.add\(`\$\{UGC_SCORE_EVENT\}:\$\{e\.session_id\}`\)/.test(s) && /\.in\('name', \[COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT, UGC_SCORE_EVENT/.test(s) && /\(e\.ugc && !done\.has\(`\$\{UGC_SCORE_EVENT\}:\$\{e\.key\}`\)\)/.test(s)
    const soEvents = (s.match(/\.(insert|update|upsert|delete|rpc)\(/g) ?? []).every((x) => x === '.insert(')
    const ugcSemRede = !/supabase|\.from\(/.test(rd(F.ugc))
    return importa && voz && avatar && outros && chama && grava && idem && soEvents && ugcSemRede
  })

  await tenta('U8', () => {
    const P = L.painel
    const ev = (name, key, md) => ({ name, created_at: '2026-10-19T20:00:00Z', session_id: key, user_id: 'u', metadata: { delivered_at: '2026-10-19T19:00:00Z', ...md } })
    const notas = P.juntarNotasRegua([
      ev('pixel_score', 'u1', { version: 'regua95_pixel_v1', score: 96, product: 'ugc', engine: 'ads_v2', video_url: 'https://x/u1.mp4' }),
      ev('ugc_score', 'u1', { version: 'regua95_ugc_v1', score: 75, product: 'ugc', engine: 'ads_v2', caps: ['olhos fechados em 2 quadros seguidos do gancho (0–3 s) (teto 75)'], motivos: ['0,5 s gancho: olhos fechados'] }),
      ev('ugc_score', 'u2', { version: 'regua95_ugc_v0', score: 10, product: 'ugc', engine: 'ads_v2' }),
      ev('pixel_score', 'u3', { version: 'regua95_pixel_v1', score: 90, product: 'ugc', engine: 'avatar' }),
      ev('ugc_score', 'u3', { version: 'regua95_ugc_v1', score: 100, product: 'ugc', engine: 'avatar' }),
    ], '2026-10-19T00:00:00Z')
    const u1 = notas.find((n) => n.key === 'u1'), u3 = notas.find((n) => n.key === 'u3')
    const okNotas = notas.length === 2 && u1.ugc === 75 && u1.pixel === 96 && u1.nota === 75 && u1.ugc_motivos[0] === '0,5 s gancho: olhos fechados' && u3.nota === 90
    const linha = P.placarRegua(notas, (n) => n.product)[0]
    const okPlacar = linha.ugc.n === 2 && linha.ugc.media === 88 && linha.nota.media === 83
    const pg = rd(F.pagina)
    const okTela = pg.includes('<CelulaPlacar l={l.ugc} />') && pg.includes('>juiz UGC</th>') && pg.includes('data-kineo="regua95-ugc-motivos"') && pg.includes('colSpan={6}')
    const okLeitura = /\.in\('name', \[COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT, UGC_SCORE_EVENT/.test(rd(F.painel))
    return okNotas && okPlacar && okTela && okLeitura
  })
  return r
}

const real = await provas(carregar(null))
const NOMES = {
  U1: 'U1 plano: 6 quadros do gancho a cada 0,5 s + 6 na fala até o fim da voz; pausa só com os tempos; avatar = vídeo inteiro',
  U2: 'U2 fal: 1 chamada extract-nth-frame (passo 12, max até o plano), quadros mapeados por tempo; sem chave/erro = null',
  U3: 'U3 nota no código: olhos fechados 2 seguidos no gancho 75 · 3 fechados 85 · sorriso 2 = 85 · mão 75/90 · duplicação 60 · rótulo 70 (só com foto) · legenda ilegível 85 · pausa 90',
  U4: 'U4 calibração 19/10: warm af33b3c0 (olho 7) = 75 e é o menor; R3 (olho 9) ≥ 95; Universo B (8) ≥ B refeito (7) ≥ 90',
  U5: 'U5 pixel: "legenda partida" sem teto no UGC (o falso 88 do R3); filme mantém 88; ilegível segue 85',
  U6: 'U6 juiz: 1 leitura gpt-4o low, foto do produto 1ª imagem, perguntas objetivas, 1 vídeo ≤ US$ 0,01',
  U7: 'U7 coletor: UGC (apresentador + avatar) ganha o juiz com voice_seconds; evento ugc_score só em events, idempotente; outros produtos não',
  U8: 'U8 painel: ugc_score na versão vigente, nota UGC = menor entre pixel e juiz UGC, coluna e motivos no /admin/coerencia',
}
for (const [k, m] of Object.entries(NOMES)) { if (real[k]) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const MUTANTES = [
  ['M1 gancho a cada 1 s', 'U1', F.ugc, 'export const UGC_STEP_SECONDS = 0.5', 'export const UGC_STEP_SECONDS = 1'],
  ['M2 sem teto dos olhos fechados seguidos no gancho', 'U3', F.ugc, 'if (maxRun >= 2) cap(75,', 'if (maxRun >= 9) cap(75,'],
  ['M3 sorriso de dentes ignorado', 'U3', F.ugc, 'if (sorrisos >= 2) cap(85,', 'if (sorrisos >= 99) cap(85,'],
  ['M4 duplicação ignorada', 'U3', F.ugc, 'if (dup >= 1) cap(60,', 'if (dup >= 99) cap(60,'],
  ['M5 rótulo diferente sem foto conta', 'U3', F.ugc, "label: !ctx.hasReference && label === 'different' ? 'na' : label,", 'label,'],
  ['M6 legenda partida volta a pesar no UGC', 'U5', F.pixel, "if (ctx.product !== 'ugc' && count('caption_broken') >= 2)", "if (count('caption_broken') >= 2)"],
  ['M7 painel ignora o juiz UGC na nota', 'U8', F.painel, 'n.nota = notaRegua(n.coerencia, notaRegua(n.pixel, n.ugc))', 'n.nota = notaRegua(n.coerencia, n.pixel)'],
  ['M8 juiz com detail high', 'U6', F.ugc, "messages: buildUgcMessages(ctx, frames, opts?.detail ?? 'low')", "messages: buildUgcMessages(ctx, frames, opts?.detail ?? 'high')"],
  ['M9 painel aceita versão velha do juiz UGC', 'U8', F.painel, 'const ehUgc = e.name === UGC_SCORE_EVENT && m.version === UGC_SCORE_VERSION', 'const ehUgc = e.name === UGC_SCORE_EVENT'],
]
for (const [nome, prova, arquivo, de, para] of MUTANTES) {
  let aplicou = false
  const fonte = (rel, raw) => {
    if (rel !== arquivo) return raw
    if (raw.split(de).length !== 2) return raw
    aplicou = true
    return raw.split(de).join(para)
  }
  const res = await provas(carregar(fonte))
  const ok = aplicou && res[prova] === false
  if (ok) { pass++; console.log(`  ok  ${nome}: aplicou e ${prova} ficou vermelho`) } else { fail++; console.log(`  FAIL ${nome}: aplicou=${aplicou} ${prova}=${res[prova]}`) }
}
// M10 (texto): o coletor sem chamar o juiz UGC — U7 lê o arquivo, então o mutante é conferido no texto.
{
  const s = rd(F.coletar)
  const de = 'const u = await scoreUgc(e.video_url, e.seconds, e.ugc, { fetchImpl: opts.fetchImpl })'
  const aplicou = s.split(de).length === 2
  const mut = s.split(de).join('const u = null as null | { score: number; usd: number }')
  const vermelho = !/const u = await scoreUgc\(e\.video_url, e\.seconds, e\.ugc, \{ fetchImpl: opts\.fetchImpl \}\)/.test(mut)
  if (aplicou && vermelho) { pass++; console.log('  ok  M10 coletor sem o juiz UGC: aplicou e U7 ficaria vermelho') } else { fail++; console.log(`  FAIL M10 aplicou=${aplicou}`) }
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
