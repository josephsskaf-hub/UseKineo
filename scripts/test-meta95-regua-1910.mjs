// KINEO-META95-REGUA-1910 — guardião da RÉGUA 95 (fundador 19/10: "Vai pra meta do 95"; docs/REGUA-95-2026-10-19.md).
// OFFLINE: executa o código real de lib/regua95/* e lib/admin/regua95Painel.ts com fetch FALSO (nenhuma rede, chave ou banco).
// Provas:
//   C1  juiz v2 lê o prompt INTEIRO da cena sem o prefixo fixo "Opening shot…" (nada de corte em 240) e a fala da cena;
//   C2  juiz v2 julga contra a IDEIA ORIGINAL (rótulo + origem) e não tem teto de 90 (100 é permitido; sem GENERATED FOOTAGE RULE);
//   C3  2 leituras, temperatura 0, nota = média; narração cortada continua com teto 40; casos conhecidos = 0 sem modelo;
//   C4  evidência do nascimento: prompt da fal > scene_prompts; fala por scene_narrations > clip_word_starts > scenes;
//   C5  ideia original: verbatim=false → pedido; script_written casado pelo começo do roteiro; janela de 3 h; senão "roteiro";
//   P1  quadros: fal extract-nth-frame (passo = duração×24/8, até 10, 8 espaçados, JPEG); reserva first/middle/last; sem chave = null;
//   P2  nota de pixel nasce no código: quadro quase preto pelo tamanho; troca de personagem listada = teto 70; texto inventado = 85;
//       produto infiel só em Ads/UGC; sem defeito = média dos quadros (sem teto);
//   P3  visão: 2 leituras (média), gpt-4o detail low, custo de 1 vídeo ≤ US$ 0,03 com uso realista;
//   R1  o coletor só ESCREVE em events (coherence_v2 / pixel_score) e não toca em rota de render;
//   R2  cron: Bearer CRON_SECRET, force-no-store, vercel.json agenda /api/cron/regua-95; botão admin com portão antes do serviço;
//   R3  /api/generate-script grava original_idea + script_head no script_written e a resposta da rota não mudou;
//   R4  painel: última nota por entrega na versão vigente, corte por data, "% ≥ 95" e média; nota = menor das duas;
//       /admin/coerencia mostra o placar por produto e por motor; a tela da pessoa mostra a nota nova; fast_coherence intocado;
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
  coer: 'lib/regua95/coherenceV2.ts',
  pixel: 'lib/regua95/pixelScore.ts',
  ctx: 'lib/regua95/contexto.ts',
  coletar: 'lib/regua95/coletar.ts',
  painel: 'lib/admin/regua95Painel.ts',
  cron: 'app/api/cron/regua-95/route.ts',
  botao: 'app/api/admin/coerencia/regua95/route.ts',
  pagina: 'app/admin/coerencia/page.tsx',
  pessoa: 'lib/admin/pessoaTela.ts',
  pessoaTela: 'components/admin/PessoaTela.tsx',
  script: 'app/api/generate-script/route.ts',
  vercel: 'vercel.json',
  v5: 'lib/fastCoherence.ts',
}
const OPEN = 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '
const MIOLO = 'A close-up of old telegraph wires crackling with sparks, illuminated by a flickering light, surrounded by a dark ominous sky'
const CAUDA_LONGA = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, period piece set strictly in the year 1859, ZEBRA-MARCA-FINAL'

function carregar(source) {
  const load = createOfflineLoader({ source, globals: { setTimeout: () => 0, clearTimeout() {}, AbortController, Date, Math, JSON, Promise } })
  return { coer: load(F.coer), pixel: load(F.pixel), ctx: load(F.ctx), painel: load(F.painel, ROOT), coletar: load(F.coletar) } // KINEO-META95-REGUA-AJUSTE-1910 — o coletor também roda
}

/** fetch falso: devolve as respostas na ordem e anota as chamadas. */
function fetchFalso(respostas) {
  const chamadas = []
  let i = 0
  const f = async (url, init) => {
    chamadas.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null })
    const r = typeof respostas === 'function' ? respostas(String(url), chamadas.length) : respostas[Math.min(i++, respostas.length - 1)]
    if (r === 'fail') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => r }
  }
  f.chamadas = chamadas
  return f
}
const respOpenAi = (obj, usage = { prompt_tokens: 1500, completion_tokens: 300 }) => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage })
// 26/10: complete judge responses; missing evidence has its own negative tests below.
const leituraCompleta = (extra = {}) => ({ idea_fidelity: 100, narration_vs_scenes: 100, problems: [], worst_scene: null, summary: 'Narração e cenas correspondem ao pedido.', ...extra })
const quadrosCompletos = (score = 100) => Array.from({ length: 8 }, (_, i) => ({ i: i + 1, score, subject: 'person holding the requested cup', issues: [], note: score < 100 ? 'Pequena imperfeição de composição neste quadro.' : '' }))

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_REGUA) console.log(k, e && e.stack); r[k] = false } }
  const cenas = [
    { scene: 1, spoken: 'In 1859 the sun fired a storm straight at Earth', prompt: OPEN + MIOLO + CAUDA_LONGA },
    { scene: 2, spoken: 'Auroras lit the sky over Cuba', prompt: 'Vivid aurora over a Caribbean coast at night' + CAUDA_LONGA },
  ]
  const entrada = { idea: 'conte o evento Carrington de 1859', ideaSource: 'script_written', narration: 'In 1859 the sun fired a storm straight at Earth. Auroras lit the sky over Cuba.', scenes: cenas, engine: 'cinematic_ai', filmSeconds: 15 }

  await tenta('C1', () => {
    const msgs = L.coer.buildCoherenceV2Messages(entrada)
    const u = msgs[1].content
    return !u.includes('Opening shot:') && u.includes(MIOLO) && u.includes('ZEBRA-MARCA-FINAL') && u.includes('spoken="Auroras lit the sky over Cuba"') && L.coer.stripFixedPrefix(OPEN + 'X') === 'X' && L.coer.COHERENCE_V2_SCENE_CHARS >= 1300
  })
  await tenta('C2', () => {
    const msgs = L.coer.buildCoherenceV2Messages(entrada)
    const s = msgs[0].content, u = msgs[1].content
    const semTeto = !/at most 90|never 100|GENERATED FOOTAGE RULE/i.test(s) && /NO cap/.test(s) && /give 100/.test(s)
    const ideia = u.startsWith('ORIGINAL IDEA (script_written)') && u.includes('conte o evento Carrington') && /ORIGINAL IDEA the customer typed BEFORE any AI rewrote it/.test(s)
    const lido = L.coer.normalizeReadingV2(leituraCompleta(), true)
    const roteiro = L.coer.buildCoherenceV2Messages({ ...entrada, ideaSource: 'roteiro' })[0].content.includes('original idea was NOT recorded')
    return semTeto && ideia && lido.score === 100 && roteiro
  })
  await tenta('C3', async () => {
    const defeito = 'Cena 2 mostra um objeto incompatível com a fala.'
    const f = fetchFalso([respOpenAi(leituraCompleta({ narration_vs_scenes: 90, problems: [defeito], worst_scene: 2, summary: defeito })), respOpenAi(leituraCompleta())])
    const res = await L.coer.scoreCoherenceV2(entrada, { fetchImpl: f, apiKey: 'k' })
    const corpos = f.chamadas.map((c) => c.body)
    const doisTemp0 = f.chamadas.length === 2 && corpos.every((b) => b.temperature === 0 && b.model === 'gpt-4o-mini')
    const media = res && res.score === 98 && res.readings.join(',') === '95,100' && res.spread === 5 && res.problems[0] === defeito && res.idea_is_script === false && res.version === 'regua95_coerencia_v2'
    const cortado = L.coer.combineReadingsV2([L.coer.normalizeReadingV2(leituraCompleta(), true), L.coer.normalizeReadingV2(leituraCompleta(), true)], { ideaSource: 'roteiro', narration: Array(120).fill('w').join(' '), filmSeconds: 15, model: 'x', usd: 0, ms: 0 })
    const f2 = fetchFalso([respOpenAi({})])
    const recusa = await L.coer.scoreCoherenceV2({ ...entrada, narration: "I'm sorry, but I can't assist with that request." }, { fetchImpl: f2, apiKey: 'k' })
    return doisTemp0 && media && cortado.score === 40 && cortado.narration_cut === true && recusa && recusa.score === 0 && f2.chamadas.length === 0
  })
  await tenta('C4', () => {
    const resp = { prompt: 'P', voiceover_script: 'um dois tres quatro cinco seis', scenes: ['busca a', 'busca b'], scene_fal_inputs: [{ prompt: OPEN + 'FAL1' }, { prompt: 'FAL2' }], scene_prompts: ['SP1', 'SP2'], clip_word_starts: [0, 4], verbatim: true, duration: 15 }
    const e = L.coer.evidenceFromBirth(resp)
    const okCws = e.scenes[0].prompt === OPEN + 'FAL1' && e.scenes[1].prompt === 'FAL2' && e.scenes[0].spoken === 'um dois tres quatro' && e.scenes[1].spoken === 'cinco seis' && e.verbatim === true && e.duration === 15
    const e2 = L.coer.evidenceFromBirth({ ...resp, scene_fal_inputs: undefined, scene_narrations: ['fala A', 'fala B'] })
    const okHolly = e2.scenes[0].prompt === 'SP1' && e2.scenes[1].spoken === 'fala B'
    const e3 = L.coer.evidenceFromBirth({ ...resp, clip_word_starts: undefined })
    return okCws && okHolly && e3.scenes[0].spoken === 'busca a' && L.coer.evidenceFromBirth(null) === null
  })
  await tenta('C5', () => {
    const r1 = L.ctx.resolverIdeia({ birthPrompt: 'ideia solta', verbatim: false, birthAt: '2026-10-19T15:00:00Z', scriptWritten: [] })
    const sw = [
      { created_at: '2026-10-19T14:59:00Z', original_idea: 'IDEIA CERTA', script_head: 'HOOK: It was bedtime, but Dino heard a strange noise in the forest' },
      { created_at: '2026-10-19T14:59:30Z', original_idea: 'OUTRA', script_head: 'Something else entirely different here and long enough' },
      { created_at: '2026-10-19T10:00:00Z', original_idea: 'VELHA', script_head: 'HOOK: It was bedtime, but Dino heard a strange noise in the forest' },
    ]
    const r2 = L.ctx.resolverIdeia({ birthPrompt: 'HOOK: [Pexels: dark] It was bedtime, but Dino heard a strange noise in the forest! more', verbatim: true, birthAt: '2026-10-19T15:00:00Z', scriptWritten: sw })
    const r3 = L.ctx.resolverIdeia({ birthPrompt: 'texto que nao casa com nada do que foi escrito antes', verbatim: true, birthAt: '2026-10-19T15:00:00Z', scriptWritten: sw })
    const r4 = L.ctx.resolverIdeia({ birthPrompt: 'roteiro colado', verbatim: true, birthAt: '2026-10-19T15:00:00Z', scriptWritten: [] })
    return r1.source === 'pedido_direto' && r1.idea === 'ideia solta' && r2.source === 'script_written' && r2.idea === 'IDEIA CERTA' && r3.source === 'script_written_janela' && r3.idea === 'OUTRA' && r4.source === 'roteiro'
  })

  // ── pixel ──
  await tenta('P1', async () => {
    const P = L.pixel
    const passo = P.frameIntervalFor(15) === 45 && P.frameIntervalFor(90) === 270 && P.frameIntervalFor(200) === 300 && P.frameIntervalFor(null) === 45
    const dez = Array.from({ length: 10 }, (_, i) => i)
    const oito = P.pickEvenly(dez, 8)
    const espacado = oito.length === 8 && oito[0] === 0 && oito[7] === 9 && new Set(oito).size === 8
    const imgs = Array.from({ length: 10 }, (_, i) => ({ url: `https://fal.media/q${i}.jpg`, file_size: 90000 }))
    const f = fetchFalso([{ images: imgs }])
    const ex = await P.extractFramesFal('https://x/v.mp4', 15, { fetchImpl: f, falKey: 'k' })
    const c = f.chamadas[0]
    const okNth = ex && ex.via === 'nth_frame' && ex.frames.length === 8 && c.url === 'https://fal.run/fal-ai/workflow-utilities/extract-nth-frame' && c.body.frame_interval === 45 && c.body.max_frames === 10 && c.body.output_format === 'jpg' && c.body.video_url === 'https://x/v.mp4'
    const f2 = fetchFalso((url) => (url.includes('extract-nth-frame') ? 'fail' : { images: [{ url: 'https://fal.media/r.jpg', file_size: 80000 }] }))
    const ex2 = await P.extractFramesFal('https://x/v.mp4', 15, { fetchImpl: f2, falKey: 'k' })
    const okRes = ex2 && ex2.via === 'extract_frame' && ex2.frames.length === 3 && f2.chamadas.filter((x) => x.url.endsWith('/fal-ai/ffmpeg-api/extract-frame')).map((x) => x.body.frame_type).join(',') === 'first,middle,last'
    const semChave = (await P.extractFramesFal('https://x/v.mp4', 15, { fetchImpl: fetchFalso([{ images: imgs }]), falKey: '' })) === null
    return passo && espacado && okNth && okRes && semChave
  })
  await tenta('P2', () => {
    const P = L.pixel
    const fr = (n, bytes = 90000) => Array.from({ length: n }, (_, i) => ({ url: `https://f/${i}.jpg`, t: i, bytes }))
    const base = { via: 'nth_frame', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 0 }
    const limpos = quadrosCompletos().map((q, i) => i < 4 ? q : { ...q, score: 90, note: 'Pequena imperfeição de composição neste quadro.' })
    const limpo = P.normalizePixel({ frames: limpos, identity_consistent: true }, { ...base, product: 'filme', frames: fr(8) })
    const imagensPreto = fr(8); imagensPreto[0].bytes = 3000
    const preto = P.normalizePixel({ frames: quadrosCompletos() }, { ...base, product: 'filme', frames: imagensPreto })
    const sujeitos = quadrosCompletos().map((q, i) => ({ ...q, subject: i === 0 ? 'purple cartoon dinosaur' : 'human child' }))
    const troca = P.normalizePixel({ frames: sujeitos, identity_consistent: true, identity_changes: [{ from: 1, to: 2, what: 'dino vira menino' }] }, { ...base, product: 'filme', frames: fr(8) })
    const comTexto = quadrosCompletos(); comTexto[0].issues = ['invented_text']; comTexto[0].note = 'Texto inventado aparece na embalagem.'
    const texto = P.normalizePixel({ frames: comTexto }, { ...base, product: 'ads', frames: fr(8) })
    const produto = quadrosCompletos(); produto[0].issues = ['product_unfaithful']; produto[0].note = 'A embalagem difere da foto de referência.'
    const produtoFilme = P.normalizePixel({ frames: produto, product_faithful: false }, { ...base, product: 'filme', frames: fr(8) })
    const produtoAds = P.normalizePixel({ frames: produto, product_faithful: false }, { ...base, product: 'ads', frames: fr(8) })
    return limpo.score === 95 && limpo.caps.length === 0 && preto.score === 60 && preto.frames[0].issues.includes('near_black') && troca.score === 70 && troca.identity_consistent === false && troca.frames[1].subject === 'human child' && texto.score === 85 && produtoFilme.score === 100 && produtoFilme.product_faithful === null && produtoAds.score === 70
  })
  await tenta('P3', async () => {
    const P = L.pixel
    const frames = Array.from({ length: 8 }, (_, i) => ({ url: `https://f/${i}.jpg`, t: i, bytes: 90000 }))
    const f = fetchFalso([respOpenAi({ frames: quadrosCompletos(100) }, { prompt_tokens: 1900, completion_tokens: 400 }), respOpenAi({ frames: quadrosCompletos(90) }, { prompt_tokens: 1900, completion_tokens: 400 })])
    const res = await P.judgeFrames({ product: 'filme', asked: 'x' }, frames, { fetchImpl: f, apiKey: 'k', usdFrames: 0.005 })
    const corpos = f.chamadas.map((c) => c.body)
    const imagens = corpos[0].messages[1].content.filter((c) => c.type === 'image_url')
    const okCall = f.chamadas.length === 2 && corpos.every((b) => b.model === 'gpt-4o' && b.temperature === 0) && imagens.length === 8 && imagens.every((c) => c.image_url.detail === 'low')
    return okCall && res && res.score === 95 && [...res.readings].sort().join(',') === '100,90' && res.usd <= 0.03 && res.usd > 0.005 && P.PIXEL_MODEL_DEFAULT === 'gpt-4o'
  })
  await tenta('E1', () => {
    const C = L.coer, P = L.pixel
    const text = C.normalizeReadingV2(leituraCompleta(), true)
    const textCtx = { ideaSource: 'pedido_direto', narration: 'Uma história curta.', model: 'offline', usd: 0, ms: 0 }
    const pixCtx = { product: 'filme', via: 'local', model: 'offline', usdFrames: 0, usdVision: 0, ms: 0, frames: Array.from({ length: 8 }, (_, i) => ({ url: `https://f/${i}.jpg`, t: i, bytes: 90000 })) }
    const pixel = P.normalizePixel({ frames: quadrosCompletos() }, pixCtx)
    const emptyText = C.normalizeReadingV2({}, true), emptyPixel = P.normalizePixel({}, pixCtx)
    const oneText = C.combineReadingsV2([text], textCtx), onePixel = P.combinePixelReadings([pixel], { usdFrames: 0, ms: 0 })
    return emptyText.score === null && emptyPixel.score === null && emptyPixel.evidence_status === 'incomplete' && oneText.score === null && oneText.coverage.valid_readings === 1 && onePixel.score === null && onePixel.coverage.valid_readings === 1
  })

  // ── coletor, cron, rota de roteiro ──
  await tenta('R1', () => {
    const s = rd(F.coletar)
    const escritas = s.match(/\.(insert|update|upsert|delete|rpc)\(/g) ?? []
    // KINEO-META95-REGUA-AJUSTE-1910 — reancorado: UM ponto de escrita (gravar), que confere o erro do insert.
    // KINEO-META95-UGC-1910 — reâncora: o 3º juiz (ugc_score) também grava só pelo ponto único.
    const gravacoes = s.match(/await gravar\(([A-Z0-9_]+),/g) ?? []
    const soEvents = escritas.length === 1 && escritas[0] === '.insert(' && s.includes("const { error } = await admin.from('events').insert({ name, user_id: e.user_id, session_id: e.key, path: route, metadata })") && gravacoes.length >= 6 && gravacoes.every((g) => /gravar\((COHERENCE_V2_EVENT|PIXEL_SCORE_EVENT|UGC_SCORE_EVENT),/.test(g))
    const semRender = !/generate-video|api\/compose|generate-script|falQueue|submitFal/.test(s)
    const rotasRender = ['app/api/compose/route.ts', 'app/api/generate-video-cinematic/route.ts'].every((f) => !/regua95|coherence_v2|pixel_score/.test(rd(f)))
    const evidenciaInteira = /evidence: \{ idea: e\.coherence\.idea\.slice\(0, 4000\)/.test(s) && /prompt: s\.prompt\.slice\(0, 3000\)/.test(s)
    return soEvents && semRender && rotasRender && evidenciaInteira
  })
  await tenta('R2', () => {
    const c = rd(F.cron), b = rd(F.botao), v = JSON.parse(rd(F.vercel))
    const auth = /authorization'\) === `Bearer \$\{cronSecret\}`/.test(c) && /if \(!isAuthorized\(req\)\) \{\n[^\n]*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n\s*\}/.test(c) /* reancorado KINEO-META95-REGUA-AJUSTE-1910: o 401 agora loga uma linha antes de responder */
    const cache = /export const fetchCache = 'force-no-store'/.test(c) && /export const maxDuration = 300/.test(c)
    const agenda = (v.crons ?? []).some((x) => x.path === '/api/cron/regua-95' && /^[0-9,*/ ]+$/.test(x.schedule))
    const portao = b.indexOf('isAdminEmail(') > 0 && b.indexOf('isAdminEmail(') < b.indexOf('serviceClient()') && /export async function POST/.test(b) && !/export async function GET/.test(b)
    return auth && cache && agenda && portao
  })
  await tenta('R3', () => {
    const s = rd(F.script)
    const i = s.indexOf("name: 'script_written'")
    const bloco = s.slice(i, i + 1500)
    const rastro = /metadata: \{ original_idea: topic\.slice\(0, 4000\), script_head: script\.slice\(0, 200\),/.test(bloco) && /\[TRAVA 8\.2 — vai do fundador 19\/10 "Vai pra meta do 95"\]/.test(bloco)
    const resposta = s.includes('return NextResponse.json({ script, alreadyStructured: false, wordsPerSecond: regua.wordsPerSecond, family: regua.family, targetSeconds: alvoSegundos, minWords: alvoPalavras, words: scriptWordCount(script), pastedScript: colado.pasted, pastedReason: colado.reason })')
    return rastro && resposta
  })

  // ── painel ──
  await tenta('R4', () => {
    const P = L.painel
    const ev = (name, key, created, md) => ({ name, created_at: created, session_id: key, user_id: 'u', metadata: md })
    const eventos = [
      ev('coherence_v2', 'v1', '2026-10-19T12:00:00Z', { version: 'regua95_coerencia_v2', score: 80, product: 'filme', engine: 'cinematic_ai', delivered_at: '2026-10-19T11:00:00Z' }),
      ev('coherence_v2', 'v1', '2026-10-19T13:00:00Z', { version: 'regua95_coerencia_v2', score: 97, product: 'filme', engine: 'cinematic_ai', delivered_at: '2026-10-19T11:00:00Z' }),
      ev('pixel_score', 'v1', '2026-10-19T13:00:00Z', { version: 'regua95_pixel_v1', score: 96, product: 'filme', engine: 'cinematic_ai', delivered_at: '2026-10-19T11:00:00Z', video_url: 'https://x/v1.mp4' }),
      ev('pixel_score', 'a1', '2026-10-19T13:00:00Z', { version: 'regua95_pixel_v1', score: 70, product: 'ads', engine: 'ads_v2', delivered_at: '2026-10-19T12:00:00Z', caps: ['produto diferente da foto real (teto 70)'] }),
      ev('pixel_score', 'old', '2026-10-19T13:00:00Z', { version: 'regua95_pixel_v0', score: 10, product: 'ads', delivered_at: '2026-10-19T12:00:00Z' }),
      ev('pixel_score', 'antes', '2026-10-19T13:00:00Z', { version: 'regua95_pixel_v1', score: 10, product: 'clipe', delivered_at: '2026-10-18T12:00:00Z' }),
    ]
    const notas = P.juntarNotasRegua(eventos, '2026-10-19T00:00:00Z')
    const v1 = notas.find((n) => n.key === 'v1')
    const okNotas = notas.length === 2 && v1.coerencia === 97 && v1.pixel === 96 && v1.nota === 96 && v1.video_url === 'https://x/v1.mp4' && notas.find((n) => n.key === 'a1').nota === 70
    const placar = P.placarRegua(notas, (n) => n.product)
    const filme = placar.find((l) => l.rotulo === 'filme'), ads = placar.find((l) => l.rotulo === 'ads')
    const okPlacar = filme.nota.pct95 === 100 && filme.nota.media === 96 && ads.nota.pct95 === 0 && ads.coerencia.n === 0 && ads.coerencia.pct95 === null
    const pg = rd(F.pagina), pe = rd(F.pessoa), pt = rd(F.pessoaTela)
    const okTela = /lerRegua95\(admin, \{ desde: desdeIso, incluirCasa \}, readAll\)/.test(pg) && pg.includes('data-kineo={dataKineo}') && pg.includes('dataKineo="regua95-por-produto"') && pg.includes('dataKineo="regua95-por-motor"') && /maxCompute: 0/.test(pg)
    const okPessoa = /\.in\('name', \[COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT\]\)\.order\('created_at', \{ ascending: false \}\)\.limit\(NOTAS_MAX \* 2\)/.test(pe) && /regua95: reguaPorChave\.get\(v\.id\) \?\? null/.test(pe) && /regua95: reguaPorChave\.get\(c\.id\) \?\? null/.test(pe) && pt.includes('data-kineo="nota-regua95"')
    const v5 = /export const FAST_COHERENCE_VERSION = 'k1_coerencia_v5_honesto'/.test(rd(F.v5)) && /a scene list made ONLY of generated footage can score at most 90/.test(rd(F.v5))
    return okNotas && okPlacar && okTela && okPessoa && v5
  })
  // ── KINEO-META95-REGUA-AJUSTE-1910 — o 1º giro pós-deploy não deixou rastro nenhum ──
  await tenta('A1', async () => {
    const C = L.coletar
    const agora = Date.parse('2026-10-19T23:30:00Z')
    const ev = (name, key, created, md) => ({ name, created_at: created, session_id: key, user_id: 'u', metadata: md })
    const linhas = [
      ev('pixel_score', 'ok', '2026-10-19T20:00:00Z', { version: 'regua95_pixel_v1', score: 90 }),
      ev('pixel_score', 'falhou-agora', '2026-10-19T23:10:00Z', { version: 'regua95_pixel_v1', score: null, falha: 'quadros_indisponiveis' }),
      ev('pixel_score', 'falhou-antes', '2026-10-19T20:00:00Z', { version: 'regua95_pixel_v1', score: null, falha: 'quadros_indisponiveis' }),
      ...[1, 2, 3].map((i) => ev('pixel_score', 'desistiu', `2026-10-19T1${i}:00:00Z`, { version: 'regua95_pixel_v1', score: null, falha: 'visao_sem_resposta' })),
      ev('coherence_v2', 'velha', '2026-10-19T20:00:00Z', { version: 'regua95_coerencia_v0', score: 99 }),
    ]
    const fakeAdmin = { from: () => ({ select() { return this }, in() { return this } }) }
    const fakeReadAll = async () => ({ data: linhas, error: null })
    const done = await C.notasExistentes(fakeAdmin, ['ok', 'falhou-agora', 'falhou-antes', 'desistiu', 'velha'], fakeReadAll, '/x', agora)
    return done.has('pixel_score:ok') && done.has('pixel_score:falhou-agora') && !done.has('pixel_score:falhou-antes') && done.has('pixel_score:desistiu') && !done.has('coherence_v2:velha') && C.REGUA95_MAX_FALHAS === 3 && C.REGUA95_ESPERA_FALHA_MS === 3600000
  })
  await tenta('A2', () => {
    const C = L.coletar
    const c = rd(F.cron), b = rd(F.botao), s = rd(F.coletar)
    const linha = JSON.parse(C.resumoRegua95({ candidatas: 3, pendentes: 1, julgadas: [{ key: 'abcdef123456', product: 'filme', engine: 'cinematic_ai', coerencia: 93, pixel: null, usd: 0.01234, erro: 'quadros_indisponiveis', frame_via: null }], porProduto: { filme: { candidatas: 3, pendentes: 1 } } }, 1200))
    const okLinha = linha.candidatas === 3 && linha.pendentes === 1 && linha.julgadas[0].k === 'abcdef12' && linha.julgadas[0].erro === 'quadros_indisponiveis' && linha.por_produto.filme.pendentes === 1 && JSON.parse(C.resumoRegua95('tempo', 5)).regua95 === 'tempo_esgotado'
    const okRota = c.includes("console.log('[cron/regua-95]', resumoRegua95(r, Date.now() - t0))") && c.includes('hoursRaw : REGUA95_JANELA_HORAS') && c.includes("console.warn('[cron/regua-95] 401") && b.includes("console.log('[admin/coerencia/regua95]', resumoRegua95(")
    const okJanela = C.REGUA95_JANELA_HORAS === 168 && s.includes('opts.hours ?? REGUA95_JANELA_HORAS')
    const okFalha = s.includes("const falha = ex ? 'visao_sem_resposta' : 'quadros_indisponiveis'") && s.includes("falha: 'coerencia_sem_resposta'")
    return okLinha && okRota && okJanela && okFalha
  })
  await tenta('A3', () => {
    const q = rd('app/api/cron/quality-radar/route.ts')
    return q.includes("julgarPendentesRegua(admin, { route: '/api/cron/quality-radar', maxJudge: 2 }, readAll).catch(() => null)") && q.includes("setTimeout(() => resolve('tempo'), 60_000)") && q.includes("console.log('[cron/quality-radar] regua95', resumoRegua95(regua95, Date.now() - t95))") && q.lastIndexOf('julgarPendentesRegua(') > q.indexOf('notifyFounder(subject, text)')
  })
  return r
}

const real = await provas(carregar(null))
const NOMES = {
  C1: 'C1 juiz v2 lê o prompt INTEIRO da cena (sem "Opening shot…", sem corte em 240) e a fala da cena',
  C2: 'C2 juiz v2 julga contra a IDEIA ORIGINAL e não tem teto de 90 (100 permitido)',
  C3: 'C3 2 leituras a temperatura 0, nota = média; narração cortada = 40; recusa = 0 sem modelo',
  C4: 'C4 evidência do nascimento: prompt da fal > scene_prompts; fala por scene_narrations > clip_word_starts > scenes',
  C5: 'C5 ideia original: pedido direto / script_written casado / janela de 3 h / "roteiro"',
  P1: 'P1 quadros pela fal extract-nth-frame (passo duração×24/8, até 10, 8 espaçados) + reserva first/middle/last; sem chave = null',
  P2: 'P2 nota de pixel nasce no código: preto pelo tamanho 60, troca de personagem 70, texto inventado 85, produto só em Ads/UGC',
  P3: 'P3 visão: 2 leituras (média), gpt-4o detail low, 1 vídeo ≤ US$ 0,03',
  E1: 'E1 resposta vazia e leitura única são incompletas, nunca aprovação',
  R1: 'R1 coletor só escreve em events (coherence_v2/pixel_score), grava a evidência inteira e não toca em rota de render',
  R2: 'R2 cron com Bearer CRON_SECRET + force-no-store + agenda no vercel.json; botão admin com portão antes do serviço',
  R3: 'R3 /api/generate-script grava original_idea + script_head ([TRAVA 8.2]) e a resposta não mudou',
  R4: 'R4 painel: última nota/versão vigente/corte por data, % ≥ 95 e média, nota = menor; telas ligadas; fast_coherence intocado',
  A1: 'A1 falha vira evento: espera 1 h e tenta de novo, desiste em 3; nota de versão velha não conta (KINEO-META95-REGUA-AJUSTE-1910)',
  A2: 'A2 cron loga 1 linha por giro (contagens por produto, mesmo sem nada), loga 401, janela padrão de 7 dias; falha diz quadros × visão',
  A3: 'A3 carona no quality-radar: até 2 entregas por tique, depois do radar, com teto de 60 s e linha de log',
}
for (const [k, m] of Object.entries(NOMES)) { if (real[k]) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

// ── mutantes: cada um quebra UMA regra; tem de aplicar (o texto mudou) e de deixar a prova dele vermelha ──
const MUTANTES = [
  ['M1 sem tirar o prefixo da cena', 'C1', F.coer, 'const prompt = stripFixedPrefix(s.prompt).replace', 'const prompt = String(s.prompt).replace'],
  ['M2 corte de 240 de volta', 'C1', F.coer, 'export const COHERENCE_V2_SCENE_CHARS = 1500', 'export const COHERENCE_V2_SCENE_CHARS = 240'],
  ['M3 teto de 90 de volta', 'C2', F.coer, "score: reasons.length || idea == null || nvs == null ? null : Math.round((idea + nvs) / 2),", "score: reasons.length || idea == null || nvs == null ? null : Math.min(95, Math.round((idea + Math.min(90, nvs)) / 2)),"],
  ['M4 uma leitura só', 'C3', F.coer, 'export const COHERENCE_V2_READINGS = 2', 'export const COHERENCE_V2_READINGS = 1'],
  ['M5 fala pela dica de busca antes do clip_word_starts', 'C4', F.coer, "const spoken = (narr[i] ?? '').trim() || (byCws[i] ?? '').trim() || (legacy[i] ?? '').trim()", "const spoken = (narr[i] ?? '').trim() || (legacy[i] ?? '').trim() || (byCws[i] ?? '').trim()"],
  ['M6 ideia = roteiro sempre', 'C5', F.ctx, "if (casado) return { idea: casado.original_idea, source: 'script_written' }", "if (casado) return { idea: prompt, source: 'roteiro' }"],
  ['M7 passo de quadros fixo', 'P1', F.pixel, 'return Math.max(1, Math.min(300, Math.floor((s * fps) / PIXEL_FRAMES)))', 'return 300'],
  ['M8 troca de personagem ignorada', 'P2', F.pixel, "if (identity === false) cap(70, 'personagem ou produto troca entre quadros')", 'void 0'],
  ['M9 quadro preto só pela opinião do modelo', 'P2', F.pixel, "if (nearBlack && !issues.includes('near_black')) issues.push('near_black')", 'void nearBlack'],
  ['M10 visão de uma leitura', 'P3', F.pixel, 'export const PIXEL_READINGS = 2', 'export const PIXEL_READINGS = 1'],
  ['M11 nota combinada = média (não a menor)', 'R4', F.ctx, 'return Math.min(c, p)', 'return Math.round((c + p) / 2)'],
  ['M12 painel aceita versão velha', 'R4', F.painel, "const ehPix = e.name === PIXEL_SCORE_EVENT && m.version === PIXEL_SCORE_VERSION", "const ehPix = e.name === PIXEL_SCORE_EVENT"],
  ['M13 falha volta a cada giro (sem a espera)', 'A1', F.coletar, 'if (f.n >= REGUA95_MAX_FALHAS || agora - f.ultima < REGUA95_ESPERA_FALHA_MS) done.add(marca)', 'if (f.n >= REGUA95_MAX_FALHAS) done.add(marca)'],
  ['M14 janela de 6 h de volta', 'A2', F.coletar, 'export const REGUA95_JANELA_HORAS = 168', 'export const REGUA95_JANELA_HORAS = 6'],
  ['M15 resumo sem as contagens por produto', 'A2', F.coletar, '    por_produto: r.porProduto ?? {},\n', ''],
  ['M16 leitura única vira nota completa', 'E1', F.pixel, 'const expectedReadings = ctx.expectedReadings ?? PIXEL_READINGS', 'const expectedReadings = 1'],
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

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
