// KINEO-JUIZ-PERGUNTAS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] — guardião.
// Prova OFFLINE (sem OpenAI, sem fal), EXECUTANDO o código REAL transpilado, que os juízes passam a PERGUNTAR o que faltava:
//   (A) crítico do still (lib/cinematic/criticoStill.ts): época ("algo depois de 1950?"), pessoa em cena sem gente e estilo
//       (foto × desenho/pelúcia) entram no pedido SÓ quando o prompt da cena traz a marca; a resposta "era"/"person"/"style" vira
//       FAIL de verdade (a leitura de antes a trocava por PASS); o laço do 'enforce' refaz dentro dos MESMOS tetos; log_only só grava;
//       prompt sem marca = pedido byte a byte o da origin/main.
//   (B) nota de pixel (lib/regua95/pixelScore.ts + lib/regua95/perguntasHonestas.ts): com perguntasHonestas o juiz de visão ganha as
//       perguntas (texto além da legenda, troca de estilo, plano parado, época, sem gente) e a nota os tetos novos (época 70, pessoa
//       75, plano parado 80); sem o opt-in, mensagens e nota byte a byte as de antes; o portão do filme grátis de 15 s e o cron passam
//       o prompt de cada cena; um teto novo no portão é falha honesta ('other_pixel_cap'), nunca "aprovado".
//   (C) as duas leituras (critico × perguntasHonestas) concordam nos mesmos textos.
//   (M) mutantes ficam vermelhos.
// Casos reais: gustavoq.contato (03/11, Kling 4 grátis 15 s, "1950: A pilot vanished…", modelo de jaqueta e JEANS — pixel deu 100);
// youbykh (02/11, Seedance 15 s de reserva, cachorro azul realista vira PELÚCIA 3D — still_critic deu 95 à foto refeita);
// raisajan626 (02/11, planta nas moedas ~8 s parada no fim — pixel 98).
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
// "Antes deste conserto" = o commit-base gravado no recibo (não a origin/main de agora, que já contém este conserto depois de publicado).
const ANTES_DO_CONSERTO = JSON.parse(fs.readFileSync(new URL('./test-support/desfaz-frente-b-0311-fontes.json', import.meta.url), 'utf8')).base
const base = (rel) => { try { return lf(execFileSync('git', ['show', `${ANTES_DO_CONSERTO}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { return null } }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, Date, Math, JSON, Promise }
const F = { critico: 'lib/cinematic/criticoStill.ts', pixel: 'lib/regua95/pixelScore.ts', perg: 'lib/regua95/perguntasHonestas.ts', gate: 'lib/free15Gate.ts', gateSrv: 'lib/free15GateServer.ts', coletar: 'lib/regua95/coletar.ts' }
const carrega = (mutantes = {}) => {
  const load = createOfflineLoader({ globals, source: (rel, text) => (mutantes[rel] ? mutantes[rel](text) : text) })
  return { C: load(F.critico), P: load(F.pixel), H: load(F.perg), G: load(F.gate) }
}
const carregaBase = () => {
  const load = createOfflineLoader({ globals, source: (rel, text) => ((rel === F.critico || rel === F.pixel) && base(rel) !== null ? base(rel) : text) })
  return { C: load(F.critico), P: load(F.pixel) }
}

// ── formas reais ──
const LOOK_FOTO = 'Film visual medium: photorealistic, ultra-detailed. '
const PROMPT_GUSTAVO = `${LOOK_FOTO}A pilot in a leather flight jacket stands beside a silver propeller plane on a misty airfield, subject framed in the upper two-thirds. Period setting: 1950 (1950s). Any person the shot describes wears 1950s dress: fedora hats, wool overcoats, high-waisted pleated trousers (do not add people the shot does not mention); absolutely no present-day smartphones, no present-day cars, no hoodies or modern streetwear, no LED screens.`
const FALA_GUSTAVO = '1950: A pilot vanished over the Bermuda Triangle… magnetic anomalies may have altered his compass'
const PROMPT_YOUBYKH = `${LOOK_FOTO}A small blue dog sits alone on a rainy city sidewalk at dusk, looking up, subject framed in the upper two-thirds, photorealistic, ultra-detailed.`
const PROMPT_TUNGUSKA = `${LOOK_FOTO}A vast Siberian forest flattened in a radial pattern under a pale sky, smoke rising on the horizon. Period setting: 1908 (1900s). Any person the shot describes wears Edwardian dress (do not add people the shot does not mention). No people, no human figures and no faces anywhere in this shot.`
const PROMPT_SEM_MARCA = 'A lighthouse on a cliff at night, waves crashing, cinematic lighting.'
const resp = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage: { prompt_tokens: 3000, completion_tokens: 40 } }) })
const fetchFila = (lista) => { const pedidos = []; let i = 0; const f = async (_url, init) => { pedidos.push(JSON.parse(init.body)); return resp(lista[Math.min(i++, lista.length - 1)]) }; f.pedidos = pedidos; return f }
const entrada = (prompt, extra = {}) => ({ indice: 0, url: 'https://f/still-0.jpg', mostra: prompt, fala: FALA_GUSTAVO, prompt, seed: 42, ...extra })
const textoDoPedido = (m) => m.messages[1].content.filter((p) => p.type === 'text').map((p) => p.text).join('\n')

async function provasCritico(C) {
  const erros = []
  const cg = C.contextoDoCritico0311(PROMPT_GUSTAVO)
  if (cg.epoca !== '1950' || cg.estilo !== 'foto' || cg.semGente) erros.push('A1 contexto gustavoq: ' + JSON.stringify(cg))
  const pg = textoDoPedido(C.montarPedidoAoCritico(entrada(PROMPT_GUSTAVO), 'https://f/still-0.jpg'))
  if (!/\(7\) ERA — the story is set in 1950/.test(pg) || !/jeans or denim/.test(pg) || !/smartwatch or modern wristwatch/.test(pg) || !/"era"/.test(pg)) erros.push('A1 a pergunta de época não está no pedido')
  if (!/\(6\) STYLE — this film is PHOTOREALISTIC/.test(pg) || !/plush toy/.test(pg)) erros.push('A1 a pergunta de estilo não está no pedido')
  if (/\(8\) PERSON/.test(pg)) erros.push('A1 pediu "sem gente" sem a cláusula')
  // A2 gustavoq: o modelo diz FAIL "era" (antes virava PASS: "recusa sem critério objetivo ignorada")
  const v = await C.chamarCritico(entrada(PROMPT_GUSTAVO), 'https://f/still-0.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['era'], reason: 'pilot wears modern jeans and a smartwatch', score: 40 }]), agora: () => 0 })
  if (v.veredito !== 'FAIL' || v.problemas.join() !== 'epoca' || !/jeans/.test(v.motivo)) erros.push('A2 FAIL de época não virou FAIL: ' + JSON.stringify(v))
  // A3 youbykh: pelúcia de desenho num filme fotorreal
  const py = textoDoPedido(C.montarPedidoAoCritico(entrada(PROMPT_YOUBYKH), 'https://f/still-0.jpg'))
  if (!/\(6\) STYLE/.test(py) || /\(7\) ERA/.test(py)) erros.push('A3 pedido youbykh sem estilo ou com época inventada')
  const vy = await C.chamarCritico(entrada(PROMPT_YOUBYKH), 'https://f/still-0.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['style', 'subject'], reason: 'dog is a cartoon plush toy', score: 95 }]), agora: () => 0 })
  if (vy.veredito !== 'FAIL' || !vy.problemas.includes('estilo') || !vy.problemas.includes('sujeito')) erros.push('A3 pelúcia não reprovou: ' + JSON.stringify(vy))
  // A3b com referência: o critério (5) também cobre a troca de estilo
  const pr = textoDoPedido(C.montarPedidoAoCritico(entrada(PROMPT_YOUBYKH, { referencia: { url: 'https://f/folha.jpg', descricao: 'a small blue dog' } }), 'https://f/still-0.jpg'))
  if (!/For \(5\) IDENTITY, a different rendering style/.test(pr)) erros.push('A3b identidade não cobre estilo com folha')
  // A4 enforce: FAIL estilo → foto nova com instrução positiva → PASS; e sempre FAIL → para em 2 fotos novas (teto de sempre)
  const filme = C.novoFilmeDoCritico('enforce')
  const gerados = []
  const gerarStill = async (prompt) => { gerados.push(prompt); return `https://f/novo-${gerados.length}.jpg` }
  const r1 = await C.criticarStill(entrada(PROMPT_YOUBYKH), { filme, gerarStill, apiKey: 'k', agora: () => 0, fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['style'], reason: 'dog is a plush toy', score: 95 }, { verdict: 'PASS', issues: [], reason: '', score: 90 }]) })
  if (r1.url !== 'https://f/novo-1.jpg' || r1.relato.escolhida !== 'regerada' || !/visual medium stated for this film/.test(gerados[0] ?? '')) erros.push('A4 enforce não refez com a instrução de estilo: ' + JSON.stringify({ url: r1.url, g: gerados[0] }))
  const filme2 = C.novoFilmeDoCritico('enforce')
  const r2 = await C.criticarStill(entrada(PROMPT_GUSTAVO), { filme: filme2, gerarStill: async () => 'https://f/x.jpg', apiKey: 'k', agora: () => 0, fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['era'], reason: 'modern jeans', score: 30 }]) })
  if (r2.relato.regeracoes !== 2 || r2.relato.tentativas.length !== 3 || !/period-accurate/.test(r2.relato.instrucao ?? '')) erros.push('A4 laço de época fora do teto de 2: ' + JSON.stringify({ n: r2.relato.regeracoes, t: r2.relato.tentativas.length, i: r2.relato.instrucao }))
  // A5 Tunguska: cena sem gente → pergunta (8); "person" vira 'pessoa'
  const pt = textoDoPedido(C.montarPedidoAoCritico(entrada(PROMPT_TUNGUSKA), 'https://f/still-0.jpg'))
  if (!/\(8\) PERSON — this shot must contain NO people/.test(pt) || !/set in 1908/.test(pt)) erros.push('A5 pedido Tunguska sem a pergunta de pessoa/época')
  const vt = await C.chamarCritico(entrada(PROMPT_TUNGUSKA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['person'], reason: 'a detective in a hat stands in the forest', score: 50 }]), agora: () => 0 })
  if (vt.veredito !== 'FAIL' || vt.problemas.join() !== 'pessoa') erros.push('A5 pessoa inventada não reprovou: ' + JSON.stringify(vt))
  // A7 "era" sem época no prompt = gosto do modelo → segue PASS (a regra de antes)
  const v7 = await C.chamarCritico(entrada(PROMPT_SEM_MARCA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['era', 'person', 'style'], reason: 'looks modern', score: 60 }]), agora: () => 0 })
  if (v7.veredito !== 'PASS') erros.push('A7 critério extra sem marca no prompt reprovou: ' + JSON.stringify(v7))
  // A8 log_only: o FAIL novo fica gravado, nunca refaz
  const filme3 = C.novoFilmeDoCritico('log_only')
  const r3 = await C.criticarStill(entrada(PROMPT_GUSTAVO), { filme: filme3, gerarStill: async () => { throw new Error('não pode gerar') }, apiKey: 'k', agora: () => 0, fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['era'], reason: 'modern jeans', score: 30 }]) })
  if (r3.relato.veredito !== 'FAIL' || !r3.relato.problemas.includes('epoca') || r3.relato.regerou || !r3.relato.regeraria || r3.url !== 'https://f/still-0.jpg') erros.push('A8 log_only mudou de comportamento')
  return erros
}

function provasPixel(P, H, G) {
  const erros = []
  const frames = Array.from({ length: 8 }, (_, i) => ({ url: `https://f/q${i + 1}.jpg`, t: i * 2, bytes: 80000 }))
  const ctxG = { product: 'filme', engine: 'kling4', asked: FALA_GUSTAVO, narration: FALA_GUSTAVO, promptByScene: [PROMPT_GUSTAVO, PROMPT_GUSTAVO, PROMPT_GUSTAVO], perguntasHonestas: true }
  const sis = P.buildPixelMessages(ctxG, frames, 'low')[0].content
  if (!/\(iv\) ERA — the story is set in 1950/.test(sis) || !/"anachronism"/.test(sis) || !/jeans or denim/.test(sis)) erros.push('B1 pergunta de época ausente no juiz de visão')
  if (!/\(ii\) STYLE/.test(sis) || !/plush toy/.test(sis) || !/This film is photorealistic live action/.test(sis)) erros.push('B1 pergunta de troca de estilo ausente')
  if (!/\(iii\) STATIC/.test(sis) || !/\(i\) TEXT — our burned-in captions/.test(sis)) erros.push('B1 perguntas de plano parado/texto ausentes')
  // B1b sem promptByScene: a época sai das palavras da história (a régua da rota)
  if (!/set in 1950/.test(P.buildPixelMessages({ product: 'filme', asked: FALA_GUSTAVO, narration: '', perguntasHonestas: true }, frames, 'low')[0].content)) erros.push('B1b época pela história ausente')
  // B3 gustavoq: 100 em tudo, mas "anachronism" em 5 quadros → teto 70
  const quadros = (fn) => ({ frames: frames.map((f, i) => ({ i: i + 1, subject: 'pilot beside plane', score: 100, issues: fn(i), note: fn(i).length ? 'jeans modernos' : '' })), identity_changes: [], identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, product_faithful: null, summary: 'ok' })
  const norm = (parsed, honest) => P.normalizePixel(parsed, { product: 'filme', frames, via: 'nth_frame', model: 'm', usdFrames: 0, usdVision: 0, ms: 1, ...(honest ? { perguntasHonestas: true } : {}) })
  const g = norm(quadros((i) => (i >= 1 && i <= 5 ? ['anachronism'] : [])), true)
  if (g.evidence_status !== 'complete' || g.score > 70 || !g.caps.some((c) => /época errada/.test(c))) erros.push('B3 gustavoq não ganhou o teto de época: ' + JSON.stringify({ s: g.score, c: g.caps, e: g.evidence_status, r: g.evidence_reasons }))
  const g1 = norm(quadros((i) => (i === 3 ? ['anachronism'] : [])), true)
  if (g1.caps.some((c) => /época/.test(c))) erros.push('B3 1 quadro sozinho já capou (deve exigir 2+)')
  // B4 youbykh: troca realista → pelúcia listada → teto 70 de sempre
  const y = norm({ ...quadros(() => []), identity_changes: [{ from: 3, to: 4, what: 'cachorro realista vira pelúcia 3D' }], identity_consistent: false }, true)
  if (y.score > 70 || !y.caps.some((c) => /troca entre quadros/.test(c))) erros.push('B4 troca de estilo não capou')
  // B5 raisajan: quadros 5-8 parados (6 s → 14 s = 8 s) → teto 80; 2 quadros parados (4 s) → nada
  const st = norm(quadros((i) => (i >= 4 ? ['static'] : [])), true)
  if (st.score > 80 || !st.caps.some((c) => /plano parado por 8 s/.test(c))) erros.push('B5 plano parado de 8 s não capou: ' + JSON.stringify(st.caps))
  if (norm(quadros((i) => (i >= 6 ? ['static'] : [])), true).caps.some((c) => /parado/.test(c))) erros.push('B5 4 s parado capou (o mínimo é 6 s)')
  // B6 Tunguska: todas as cenas sem gente → (v) e teto 75 com 2+ quadros
  const ctxT = { product: 'filme', asked: 'Tunguska 1908', narration: 'In 1908 a blast flattened a forest', promptByScene: [PROMPT_TUNGUSKA, PROMPT_TUNGUSKA], perguntasHonestas: true }
  if (!/\(v\) NO PEOPLE — no shot of this film shows people/.test(P.buildPixelMessages(ctxT, frames, 'low')[0].content)) erros.push('B6 pergunta "sem gente" ausente')
  const pt = norm(quadros((i) => (i === 2 || i === 3 ? ['invented_person'] : [])), true)
  if (pt.score > 75 || !pt.caps.some((c) => /pessoa inventada/.test(c))) erros.push('B6 pessoa inventada não capou')
  // B6b por cena: só com a fala por cena na mesma ordem
  const ctxMisto = { product: 'filme', asked: 'x', narration: 'y', promptByScene: [PROMPT_YOUBYKH, PROMPT_TUNGUSKA], spokenByScene: ['a', 'b'], perguntasHonestas: true }
  if (!/shot\(s\) 2 \(same order as the spoken lines\)/.test(P.buildPixelMessages(ctxMisto, frames, 'low')[0].content)) erros.push('B6b sem gente por cena ausente')
  if (/NO PEOPLE/.test(P.buildPixelMessages({ ...ctxMisto, spokenByScene: null }, frames, 'low')[0].content)) erros.push('B6b perguntou por cena sem como casar quadro × cena')
  // B7 sem o opt-in: os códigos novos não capam (nota de antes)
  if (norm(quadros((i) => (i >= 1 && i <= 5 ? ['anachronism'] : [])), false).score !== 100) erros.push('B7 sem perguntasHonestas a nota mudou')
  // B8 portão do filme grátis de 15 s: teto novo = falha honesta (nunca "passed"), sem refazer cena
  const state = { version: 'free15-gate-v1', status: 'checking', source: { elements: [] }, captionElements: [], captionEvidence: null, attempted: false, reason: '', updatedAt: 0 }
  const dec = G.decideFree15Gate(state, { url: 'https://f/v.mp4', snapshotUrl: null, durationSeconds: 15 }, { ...g, defect_frames: g.frames.filter((f) => f.issues.length) }, [])
  if (dec.kind !== 'fail' || dec.reason !== 'other_pixel_cap') erros.push('B8 portão com teto de época não falhou honesto: ' + JSON.stringify(dec))
  return erros
}

function provasFontes(H, C) {
  const erros = []
  // C concordância das duas leituras
  for (const p of [PROMPT_GUSTAVO, PROMPT_YOUBYKH, PROMPT_TUNGUSKA, PROMPT_SEM_MARCA, 'Style: 3D animated. A fox in a meadow.', 'Chosen photoreal still: a man walks. Period setting: the 1950s; period-accurate 1950s clothing.', 'Film visual medium: stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic. A cat.']) {
    const a = C.contextoDoCritico0311(p)
    const b = { epoca: H.epocaDoPrompt0311(p), semGente: H.semGenteNoPrompt0311(p), estilo: H.estiloDoPrompt0311(p) }
    if (JSON.stringify(a) !== JSON.stringify(b)) erros.push('C leituras divergem em: ' + p.slice(0, 50) + ' ' + JSON.stringify([a, b]))
  }
  if (C.contextoDoCritico0311('Film visual medium: stylized 3D animated film look, not photorealistic. A cat.').estilo !== 'desenho') erros.push('C desenho não reconhecido')
  if (C.contextoDoCritico0311('Chosen photoreal still: x. Period setting: the 1950s; y').epoca !== 'the 1950s') erros.push('C década sem ano não reconhecida')
  // D os chamadores passam o prompt de cada cena e ligam as perguntas
  const col = lf(fs.readFileSync(F.coletar, 'utf8'))
  if (!col.includes('promptByScene: evd?.scenes.map((s) => s.prompt) ?? null, perguntasHonestas: true')) erros.push('D o cron da régua não liga as perguntas')
  const srv = lf(fs.readFileSync(F.gateSrv, 'utf8'))
  if (!srv.includes('...(promptsDoClaim0311(a.claim.response) ? { promptByScene: promptsDoClaim0311(a.claim.response) as string[], perguntasHonestas: true } : {})')) erros.push('D o portão de 15 s não liga as perguntas')
  return erros
}

async function provasGateSrv() {
  const erros = []
  const proibido = () => { throw new Error('offline') }
  const lib = createOfflineLoader({ globals, mocks: {
    '@fal-ai/client': { fal: { config: proibido, queue: { status: proibido, result: proibido } } },
    '@/lib/falQueue': { submitFalQueueOnce: proibido },
    '@/lib/compose': { pollCreatomateRender: proibido, submitCreatomateRender: proibido },
    '@/lib/credits/refund': { refundRenderCredits: proibido },
  } })(F.gateSrv)
  const k4 = lib.promptsDoClaim0311({ kling4_trial: { scene_plan: [{ prompt: PROMPT_GUSTAVO }, { prompt: 'b' }, { prompt: 'c' }] }, scene_fal_inputs: [{ multi_prompt: [] }] })
  if (!k4 || k4.length !== 3 || k4[0] !== PROMPT_GUSTAVO) erros.push('E Kling 4 grátis: prompts do plano não lidos')
  const cl = lib.promptsDoClaim0311({ scene_fal_inputs: [{ prompt: PROMPT_TUNGUSKA }, { prompt: PROMPT_YOUBYKH }] })
  if (!cl || cl[1] !== PROMPT_YOUBYKH) erros.push('E clássico: prompts do payload não lidos')
  if (lib.promptsDoClaim0311(undefined) !== null || lib.promptsDoClaim0311({}) !== null) erros.push('E claim sem cenas devia dar null')
  return erros
}

async function tudo(mutantes = {}) {
  const { C, P, H, G } = carrega(mutantes)
  return [...(await provasCritico(C)), ...provasPixel(P, H, G), ...provasFontes(H, C)]
}

console.log('== A/B/C/D: juízes com as perguntas novas ==')
const erros = await tudo()
for (const e of erros) checa(e, false)
checa('A+B+C+D todas as provas', erros.length === 0)
for (const e of await provasGateSrv()) checa(e, false)
checa('E portão de 15 s lê o prompt de cada cena do claim', (await provasGateSrv()).length === 0)

console.log('== byte a byte sem as marcas / sem o opt-in ==')
const B = carregaBase()
const { C, P } = carrega()
if (base(F.critico) !== null) {
  const e0 = entrada(PROMPT_SEM_MARCA)
  checa('F1 crítico: prompt sem marca = pedido byte a byte o da origin/main', JSON.stringify(C.montarPedidoAoCritico(e0, e0.url)) === JSON.stringify(B.C.montarPedidoAoCritico(e0, e0.url)))
  const eg = entrada(PROMPT_GUSTAVO)
  const antes = await B.C.chamarCritico(eg, eg.url, { timeoutMs: 6000, apiKey: 'k', fetchImpl: fetchFila([{ verdict: 'FAIL', issues: ['era'], reason: 'modern jeans', score: 95 }]), agora: () => 0 })
  checa('F2 a lib da origin/main aprovava o piloto de jeans (FAIL "era" virava PASS) — o defeito que este conserto mata', antes.veredito === 'PASS')
}
if (base(F.pixel) !== null) {
  const frames = [{ url: 'https://f/a.jpg', t: 0, bytes: 90000 }, { url: 'https://f/b.jpg', t: 7, bytes: 90000 }]
  const ctx = { product: 'filme', asked: FALA_GUSTAVO, narration: FALA_GUSTAVO, expectedKineoWatermark: true, promptByScene: [PROMPT_GUSTAVO] }
  checa('F3 pixel: sem perguntasHonestas as mensagens são byte a byte as da origin/main', JSON.stringify(P.buildPixelMessages(ctx, frames, 'low')) === JSON.stringify(B.P.buildPixelMessages(ctx, frames, 'low')))
}

console.log('== mutantes ==')
const MUT = [
  ['M1 a resposta não é relida (FAIL "era" volta a ser PASS)', { [F.critico]: (t) => t.replace(/\n    if \(r\) Object\.assign\(r, aplicarPerguntas0311[^\n]*/, '') }],
  ['M2 o pedido ao crítico perde as perguntas novas', { [F.critico]: (t) => t.replace('if (extra0311) parts[0] =', 'if (false) parts[0] =') }],
  ['M3 o teto de época do pixel some', { [F.pixel]: (t) => t.replace("count('anachronism') >= 2", "count('anachronism') >= 99") }],
  ['M4 o plano parado nunca é medido', { [F.perg]: (t) => t.replace('melhor = Math.max(melhor, f.t - inicio)', 'melhor = 0') }],
  ['M5 a época do pixel some do sistema', { [F.perg]: (t) => t.replace('if (c.epoca) partes.push(` (iv) ERA', 'if (false) partes.push(` (iv) ERA') }],
]
for (const [nome, m] of MUT) {
  let vermelho = false
  try { vermelho = (await tudo(m)).length > 0 } catch { vermelho = true }
  checa(`${nome}: fica vermelho`, vermelho)
}

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} juiz-perguntas-0311: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
