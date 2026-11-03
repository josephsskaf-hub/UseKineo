// KINEO-GRATIS-REFAZ-CENA-0311 [TRAVA 8.2 — fundador 03/11: "As 2 sim" — refazer a cena reprovada no 1º filme grátis] — guardião.
// Prova OFFLINE (sem OpenAI, sem fal, sem banco), EXECUTANDO o código REAL transpilado (lib/free15Gate.ts, lib/free15RefazCena0311.ts,
// lib/free15GateServer.ts e a nota REAL de lib/regua95/pixelScore.ts normalizePixel/combinePixelReadings), que:
//   (A) teto novo do juiz (época / pessoa inventada / plano parado) no 1º filme grátis de país rico → a MESMA refação de UMA cena do
//       portão, na cena dos quadros com o defeito, com a correção positiva no prompt; refeita e aprovada → passed; ainda reprovada →
//       a falha de sempre ('other_pixel_cap', entregue com estorno); o relato (motivo, cena, quadros, custo, resultado) fica no estado;
//   (B) nunca duas refações (filme já refeito — identidade/texto — não ganha a 2ª); conta que não é 1º filme grátis / país fora /
//       outro teto junto / pessoa numa cena que não pediu "sem gente" → a falha honesta de antes, zero envio;
//   (C) o resto byte a byte: identidade, texto e legenda refazem como antes (prompt intocado); sem a função de elegibilidade = antes;
//   (D) o servidor: o marcador kling4_trial + país da lista + 0 vídeos; o still com folha recebe a mesma correção de época;
//   (M) mutantes ficam vermelhos.
// Casos reais: gustavoq.contato (03/11, Kling 4 grátis 15 s, "1950: A pilot vanished…", piloto de jaqueta e JEANS — pixel deu 100 antes
// das perguntas; com elas, teto 70 de época → refaz a cena do piloto); raisajan626 (02/11, planta nas moedas ~8 s parada no fim → a
// última cena); Tunguska 1908 sem gente (historyhideshere) → pessoa inventada na cena sem gente.
// Uso: node scripts/test-gratis-refaz-cena-0311.mjs   (cwd = raiz do repo)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const clone = (x) => JSON.parse(JSON.stringify(x))
const troca = (t, de, para) => { if (t.split(de).length !== 2) throw Error('mutante: trecho ausente/ambíguo: ' + de.slice(0, 80)); return t.replace(de, () => para) }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, Date, Math, JSON, Promise }
const F = { gate: 'lib/free15Gate.ts', mod: 'lib/free15RefazCena0311.ts', srv: 'lib/free15GateServer.ts', pixel: 'lib/regua95/pixelScore.ts' }
const forbidden = () => { throw Error('External action forbidden') }
const carrega = (mutantes = {}) => {
  const load = createOfflineLoader({ globals, source: (rel, text) => (mutantes[rel] ? mutantes[rel](text) : text), mocks: {
    '@fal-ai/client': { fal: { config: forbidden, queue: { status: forbidden, result: forbidden } } },
    '@/lib/falQueue': { submitFalQueueOnce: forbidden },
    '@/lib/compose': { pollCreatomateRender: forbidden, submitCreatomateRender: forbidden },
    '@/lib/credits/refund': { refundRenderCredits: forbidden },
  } })
  return { G: load(F.gate), M: load(F.mod), P: load(F.pixel) }
}
const carregaSrv = (mutantes = {}) => createOfflineLoader({ globals, source: (rel, text) => (mutantes[rel] ? mutantes[rel](text) : text), mocks: {
  '@fal-ai/client': { fal: { config: forbidden, queue: { status: forbidden, result: forbidden } } },
  '@/lib/falQueue': { submitFalQueueOnce: forbidden },
  '@/lib/compose': { pollCreatomateRender: forbidden, submitCreatomateRender: forbidden },
  '@/lib/regua95/pixelScore': { scorePixel: forbidden },
  '@/lib/credits/refund': { refundRenderCredits: forbidden },
} })(F.srv)

// ── formas reais ──
const LOOK_FOTO = 'Film visual medium: photorealistic, ultra-detailed. '
const EPOCA_1950 = 'Period setting: 1950 (1950s). Any person the shot describes wears 1950s dress: fedora hats, wool overcoats, high-waisted pleated trousers, cardigans, full skirts, cat-eye glasses (do not add people the shot does not mention); any vehicle in frame is 1950s sedans with rounded chrome bodies, whitewall tires and tail fins; props are rotary dial telephones, tube radios, chrome diners, jukeboxes; absolutely no present-day smartphones, no present-day cars, no hoodies or modern streetwear, no LED screens.'
const PROMPTS_GUSTAVO = [
  `${LOOK_FOTO}A silver propeller plane takes off from a misty airfield at dawn, subject framed in the upper two-thirds. ${EPOCA_1950}`,
  `${LOOK_FOTO}A pilot in a leather flight jacket stands beside a silver propeller plane on a misty airfield, subject framed in the upper two-thirds. ${EPOCA_1950}`,
  `${LOOK_FOTO}Close-up of a brass aircraft compass spinning wildly over dark ocean water, subject framed in the upper two-thirds. ${EPOCA_1950}`,
]
const FALA_GUSTAVO = '1950: A pilot vanished over the Bermuda Triangle… magnetic anomalies may have altered his compass'
const SEM_GENTE = ' No people, no human figures and no faces anywhere in this shot.'
const PROMPTS_TUNGUSKA = [
  `${LOOK_FOTO}A Siberian village elder looks up at a blinding light in the sky, subject framed in the upper two-thirds.`,
  `${LOOK_FOTO}A vast Siberian forest flattened in a radial pattern under a pale sky, smoke rising on the horizon.${SEM_GENTE}`,
  `${LOOK_FOTO}Charred tree trunks stand in a burned clearing at sunset.${SEM_GENTE}`,
]
const PROMPTS_RAISA = [
  `${LOOK_FOTO}A hand drops coins into a glass jar on a wooden table, subject framed in the upper two-thirds.`,
  `${LOOK_FOTO}Coins stacked in rising towers on a kitchen counter, warm light.`,
  `${LOOK_FOTO}A small green plant sprouts from a pile of gold coins, morning light.`,
]
const media = { url: 'https://fixture.invalid/original.mp4', snapshotUrl: null, durationSeconds: 17.5 }
const frames8 = Array.from({ length: 8 }, (_, i) => ({ url: `https://f/q${i + 1}.jpg`, t: i * 2, bytes: 80000 }))
// fonte clássica (Seedance 15 s / reserva do Kling 4): 3 clipes de 5,9 s
const fonteClassica = () => ({ width: 1080, height: 1920, duration: 17.5, elements: [0, 1, 2].map(i => ({ type: 'video', source: `clip-${i}`, time: i * 5.84, duration: 5.9, trim_start: 0.1, track: 2 })) })
const cenasClassicas = (prompts) => (src) => src.elements.filter(e => e.type === 'video').map((e, i) => ({ index: i, clipUrl: e.source, model: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', seconds: 6, text: `fala ${i}`, input: { image_url: `https://f/still-${i}.png`, prompt: prompts[i], duration: '6' } }))
// fonte do Kling 4 grátis (gustavoq): UM clipe de 15 s; as 3 cenas são janelas do plano assinado (lib/freeRedo/kling4Scene)
const fonteKling4 = () => ({ width: 1080, height: 1920, duration: 15, elements: [{ type: 'video', source: 'https://f/k4-original.mp4', time: 0, duration: 15, track: 2 }] })
const cenasKling4 = (prompts) => () => [0, 1, 2].map(i => ({ index: i, clipUrl: 'https://f/k4-original.mp4', model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', seconds: 5, text: `fala ${i}`,
  input: { prompt: prompts[i], duration: '5', resolution: '720p', aspect_ratio: '9:16', generate_audio: false }, interval: { start: i * 5, duration: 5, originalUrl: 'https://f/k4-original.mp4', originalSeconds: 15 }, previewStart: i * 5 }))

// a nota REAL do juiz (normalizePixel + combinePixelReadings, perguntas honestas ligadas): 2 leituras iguais
function nota(P, issuesPorQuadro, extra = {}) {
  const parsed = { frames: frames8.map((f, i) => { const iss = issuesPorQuadro(i); return { i: i + 1, subject: 'cena', score: iss.length ? 80 : 100, issues: iss, note: iss.length ? 'defeito visto' : '' } }), identity_changes: [], identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, product_faithful: null, summary: 'ok', ...extra }
  const um = () => P.normalizePixel(clone(parsed), { product: 'filme', frames: frames8, via: 'nth_frame', model: 'm', usdFrames: 0, usdVision: 0, ms: 1, perguntasHonestas: true })
  return P.combinePixelReadings([um(), um()], { usdFrames: 0, ms: 1 })
}

function harness(G, { source, scenes, judgments, elegivel = true, semElegibilidade = false, comFolha = false, context = { asked: FALA_GUSTAVO, narration: FALA_GUSTAVO, language: 'en' }, attempted = false }) {
  let atual = { version: 'free15-gate-v1', status: 'ready', source: clone(source), captionElements: [], captionEvidence: null, context, attempted, reason: 'awaiting_delivery', updatedAt: 1000 }
  const calls = { judge: 0, scene: [], still: [], stillPolls: [], elegivel: 0, render: 0 }
  const d = {
    now: () => 2000,
    read: async () => clone(atual),
    move: async (antes, depois) => { if (JSON.stringify(antes) !== JSON.stringify(atual)) return false; atual = clone(depois); return true },
    judge: async () => clone(judgments[Math.min(calls.judge++, judgments.length - 1)]),
    scenes,
    submitStill: async (scene, refaz) => { calls.still.push({ index: scene.index, refaz: refaz ? clone(refaz) : null }); return comFolha ? 'req-still' : null },
    pollStill: async (scene, requestId, refaz) => { calls.stillPolls.push({ index: scene.index, refaz: refaz ? clone(refaz) : null }); return { status: 'done', url: 'https://f/still-novo.png' } },
    submitScene: async (scene, imageUrl) => { calls.scene.push({ index: scene.index, prompt: scene.input.prompt, imageUrl: imageUrl ?? null }); return 'req-scene' },
    pollScene: async (scene) => ({ status: 'done', url: scene.interval ? 'https://f/cena-refeita.mp4' : `clip-${scene.index}-refeito` }),
    submitRender: async () => { calls.render++; return 'render-2' },
    pollRender: async () => ({ status: 'succeeded', url: 'https://fixture.invalid/repaired.mp4', snapshotUrl: null, durationSeconds: 17.5 }),
    ...(semElegibilidade ? {} : { primeiroFilmeGratis0311: async () => { calls.elegivel++; return elegivel } }),
  }
  return { d, calls, get: () => clone(atual), rodar: async () => { let fim; for (let i = 0; i < 10 && !['passed', 'failed'].includes(atual.status); i++) fim = await G.advanceFree15Gate(d, media); return fim ?? await G.advanceFree15Gate(d, media) } }
}

const { G, M, P } = carrega()
const limpa = nota(P, () => [])
const epocaG = nota(P, (i) => (i === 3 || i === 4 ? ['anachronism'] : [])) // t=6 s e 8 s → janela 5-10 s = cena do piloto
const parado = nota(P, (i) => (i >= 4 ? ['static'] : [])) // raisajan: quadros 5-8 (8 s → 14 s) parados = 6 s
const pessoaT = nota(P, (i) => (i === 6 || i === 7 ? ['invented_person'] : [])) // t=12/14 → cena 3 (pediu sem gente)
const pessoaNaCena1 = nota(P, (i) => (i === 0 || i === 1 ? ['invented_person'] : [])) // t=0/2 → cena 1 (o ancião: NÃO pediu sem gente)
const epocaEPreto = nota(P, (i) => (i === 3 || i === 4 ? ['anachronism'] : i === 7 ? ['near_black'] : []))
const identidade = nota(P, () => [], { identity_changes: [{ from: 3, to: 4, what: 'o piloto vira outra pessoa' }], identity_consistent: false })
const texto = nota(P, (i) => (i === 3 ? ['invented_text'] : []))

console.log('(0) a nota real do juiz')
checa('0.1 gustavoq: teto 70 de época, evidência completa, decideFree15Gate = other_pixel_cap (o "antes")', epocaG.evidence_status === 'complete' && epocaG.cap_limit === 70 && epocaG.caps.every(c => /^época errada:/.test(c)) && G.decideFree15Gate({ context: {}, source: fonteKling4() }, media, epocaG, cenasKling4(PROMPTS_GUSTAVO)()).reason === 'other_pixel_cap')
checa('0.2 raisajan: teto 80 de plano parado', parado.cap_limit === 80 && parado.caps.some(c => /^plano parado por 8 s/.test(c)))
checa('0.3 motivosDosTetos0311: só os tetos novos; "repetidos" só junto do parado; outro teto = null', JSON.stringify(M.motivosDosTetos0311(['plano parado por 8 s (teto 80)', 'época errada: x (teto 70)'])) === '["epoca","parado"]' && M.motivosDosTetos0311(['3 quadros repetidos (teto 85)']) === null && JSON.stringify(M.motivosDosTetos0311(['3 quadros repetidos (teto 85)', 'plano parado por 6 s (teto 80)'])) === '["parado"]' && M.motivosDosTetos0311(epocaEPreto.caps) === null)

console.log('(A) teto novo no 1º filme grátis → UMA cena refeita')
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG, limpa] })
  const fim = await h.rodar()
  const r = h.get().refazCena0311
  checa('A1 gustavoq (Kling 4): refaz a cena do PILOTO (2ª, janela 5-10 s), uma vez só', h.calls.scene.length === 1 && h.calls.scene[0].index === 1 && h.calls.elegivel === 1 && h.calls.render === 1)
  checa('A2 a correção positiva de época vai à frente do prompt (sufixoDeEpoca curto) e o prompt assinado segue inteiro', h.calls.scene[0].prompt.startsWith('Period setting: 1950 (1950s); period-accurate 1950s clothing, vehicles and props only; no present-day smartphones, cars or fashion. ') && h.calls.scene[0].prompt.endsWith(PROMPTS_GUSTAVO[1]))
  checa('A3 refeita e aprovada → passed; relato no estado: motivo/cena/quadros/época/custo/resultado', fim.status === 'passed' && r?.motivo === 'epoca' && r.cena === 1 && JSON.stringify(r.quadros) === '[4,5]' && r.epoca === '1950' && r.usdEstimado === 0.13 && r.resultado === 'passed' && h.get().attempted === true)
  checa('A4 sem folha no claim: nenhum still refeito (o clipe sai do prompt corrigido)', h.calls.still.length === 1 && h.calls.still[0].refaz?.motivo === 'epoca' && h.calls.stillPolls.length === 0)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG, epocaG] })
  const fim = await h.rodar()
  checa('A5 refeita e AINDA com época errada → a falha de sempre (other_pixel_cap), relato resultado=failed, 1 refação só', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && !fim.identityUnresolved && h.get().refazCena0311?.resultado === 'failed' && h.calls.scene.length === 1)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], comFolha: true })
  await h.rodar()
  checa('A6 época com folha de personagem: o still é refeito com o relato (o servidor põe a correção no prompt dele) e o clipe sai do still novo', h.calls.still.length === 1 && h.calls.still[0].refaz?.motivo === 'epoca' && h.calls.stillPolls.length === 1 && h.calls.stillPolls[0].refaz?.epoca === '1950' && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === 'https://f/still-novo.png' && h.calls.scene[0].prompt.startsWith('Period setting: 1950'))
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_RAISA), judgments: [parado, limpa], context: { asked: 'como o dinheiro cresce', narration: 'Seu dinheiro pode crescer como uma planta.', language: 'pt' } })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('A7 raisajan (parado no fim, empate 2×2 entre a 2ª e a 3ª): refaz a ÚLTIMA cena com a frase de movimento', h.calls.scene.length === 1 && h.calls.scene[0].index === 2 && h.calls.scene[0].prompt.startsWith(M.PREFIXO_MOVIMENTO_0311) && r?.motivo === 'parado' && h.calls.still.length === 0)
}
{
  const semTempo = clone(parado); for (const f of [...semTempo.frames, ...(semTempo.defect_frames ?? [])]) f.t = null
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_RAISA), judgments: [semTempo, limpa] })
  await h.rodar()
  checa('A8 parado sem quadro localizável → a última cena (quadros vazio)', h.calls.scene.length === 1 && h.calls.scene[0].index === 2 && JSON.stringify(h.get().refazCena0311?.quadros) === '[]')
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_TUNGUSKA), judgments: [pessoaT, limpa], context: { asked: 'Tunguska 1908', narration: 'In 1908 a blast flattened a forest', language: 'en' } })
  await h.rodar()
  checa('A9 Tunguska: pessoa inventada na cena SEM GENTE (3ª) → refeita com a frase positiva de lugar vazio', h.calls.scene.length === 1 && h.calls.scene[0].index === 2 && h.calls.scene[0].prompt.startsWith(M.PREFIXO_SEM_GENTE_0311) && h.calls.scene[0].prompt.includes(SEM_GENTE.trim()) && h.get().refazCena0311?.motivo === 'pessoa')
}

console.log('(B) nunca duas refações; fora do 1º filme grátis = a falha de antes')
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [identidade, epocaG] })
  const fim = await h.rodar()
  checa('B1 já refeito pela identidade e agora época errada → falha (other_pixel_cap), sem 2ª refação', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 1 && h.calls.elegivel === 0 && !h.get().refazCena0311)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG], attempted: true })
  const fim = await h.rodar()
  checa('B2 estado já attempted (refação gasta) → falha direta, zero envio', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0 && h.calls.render === 0)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG], elegivel: false })
  const fim = await h.rodar()
  checa('B3 não é o 1º filme grátis de país rico → a falha honesta de antes, zero envio', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0 && h.calls.elegivel === 1 && !h.get().refazCena0311)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaEPreto] })
  const fim = await h.rodar()
  checa('B4 época + quadro preto (outro teto que refazer uma cena não conserta) → falha, sem perguntar elegibilidade', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0 && h.calls.elegivel === 0)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_TUNGUSKA), judgments: [pessoaNaCena1], context: { asked: 'Tunguska 1908', narration: 'In 1908 a blast flattened a forest', language: 'en' } })
  const fim = await h.rodar()
  checa('B5 "pessoa inventada" numa cena que DESCREVE gente (o ancião) → não apaga a pessoa: falha de antes', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], elegivel: true })
  h.d.primeiroFilmeGratis0311 = async () => { throw Error('banco fora') }
  const fim = await h.rodar()
  checa('B6 erro ao ler a elegibilidade → falha de antes (nunca refaz no escuro)', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0)
}

console.log('(C) o resto byte a byte')
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [identidade, limpa], comFolha: true })
  await h.rodar()
  checa('C1 identidade: still com folha SEM relato e clipe com o prompt assinado intocado', h.calls.still.length === 1 && h.calls.still[0].refaz === null && h.calls.stillPolls[0].refaz === null && h.calls.scene[0].prompt === PROMPTS_GUSTAVO[h.calls.scene[0].index] && !h.get().refazCena0311 && h.calls.elegivel === 0)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [texto, limpa] })
  await h.rodar()
  checa('C2 texto inventado: pixel_scene_cap de sempre (cena do quadro, prompt intocado, sem relato)', h.calls.scene.length === 1 && h.calls.scene[0].index === 1 && h.calls.scene[0].prompt === PROMPTS_GUSTAVO[1] && !h.get().refazCena0311 && h.calls.elegivel === 0)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG], semElegibilidade: true })
  const fim = await h.rodar()
  checa('C3 sem primeiroFilmeGratis0311 nas deps → exatamente o de antes (other_pixel_cap, zero envio)', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.scene.length === 0 && !('refazCena0311' in h.get()))
}
checa('C4 decideFree15Gate não mudou de assinatura nem de veredito (teto novo = other_pixel_cap)', G.decideFree15Gate({ context: {}, source: fonteClassica() }, media, parado, cenasClassicas(PROMPTS_RAISA)(fonteClassica())).reason === 'other_pixel_cap')

console.log('(D) servidor: elegibilidade e still com folha')
const S = carregaSrv()
const fakeDb = ({ count = 0, error = null } = {}) => { const filtros = []; const q = { filtros, from(t) { filtros.push(['from', t]); return q }, select(_c, o) { filtros.push(['select', o?.count, o?.head]); return q }, eq(k, v) { filtros.push(['eq', k, v]); return q }, neq(k, v) { filtros.push(['neq', k, v]); return q }, then(ok) { return Promise.resolve({ count, error }).then(ok) } }; return q }
const claimK4 = (country, engine = 'kling4') => ({ response: { duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4_trial: { version: 'kling4_trial_2810', engine_used: engine, country } } })
{
  const db = fakeDb()
  const sim = await S.primeiroFilmeGratis0311({ db, userId: 'u1', renderId: 'r1', claim: claimK4('US') })
  checa('D1 marcador kling4_trial + US + 0 vídeos → sim; a contagem é da própria conta, sem os falhos, sem este render', sim === true && JSON.stringify(db.filtros) === JSON.stringify([['from', 'videos'], ['select', 'exact', true], ['eq', 'user_id', 'u1'], ['neq', 'status', 'failed'], ['neq', 'render_id', 'r1']]))
  checa('D2 país fora da lista (IN) → não', await S.primeiroFilmeGratis0311({ db: fakeDb(), userId: 'u1', renderId: 'r1', claim: claimK4('IN') }) === false)
  checa('D3 país desconhecido → vale a admissão que já liberou o filme (sim); BR (lista) → sim', await S.primeiroFilmeGratis0311({ db: fakeDb(), userId: 'u1', renderId: 'r1', claim: claimK4(null) }) === true && await S.primeiroFilmeGratis0311({ db: fakeDb(), userId: 'u1', renderId: 'r1', claim: claimK4('BR', 'seedance15_fallback') }) === true)
  checa('D4 sem o marcador (Seedance 15 s comum, pode ser pago/semanal) → não', await S.primeiroFilmeGratis0311({ db: fakeDb(), userId: 'u1', renderId: 'r1', claim: { response: { duration: 15, quality: 'cinematic_ai', aspect: '9:16' } } }) === false)
  checa('D5 já tem vídeo entregue / erro de leitura → não', await S.primeiroFilmeGratis0311({ db: fakeDb({ count: 1 }), userId: 'u1', renderId: 'r1', claim: claimK4('US') }) === false && await S.primeiroFilmeGratis0311({ db: fakeDb({ count: null, error: { message: 'x' } }), userId: 'u1', renderId: 'r1', claim: claimK4('US') }) === false)
  const ref = { folhas: ['https://f/folha.png'], prompt: 'The pilot from the character sheet stands beside a silver propeller plane on a misty airfield, full body, 9:16.' }
  const comEpoca = S.comCorrecaoNoStill0311(ref, { motivo: 'epoca', cena: 1, quadros: [4, 5], epoca: '1950', usdEstimado: 0.13 })
  checa('D6 still com folha: a correção de época (pelo rótulo gravado) vai ao prompt; folhas iguais; sem relato = a mesma referência', comEpoca.prompt.startsWith('Period setting: 1950 (1950s); period-accurate 1950s clothing') && comEpoca.prompt.endsWith(ref.prompt) && comEpoca.folhas === ref.folhas && S.comCorrecaoNoStill0311(ref, undefined) === ref && S.comCorrecaoNoStill0311(null, { motivo: 'epoca', cena: 1, quadros: [], epoca: '1950', usdEstimado: 0 }) === null)
  const srcTxt = fs.readFileSync(F.srv, 'utf8')
  checa('D7 o adaptador real liga a elegibilidade e o mesmo prompt corrigido no envio E na leitura do still', srcTxt.includes('primeiroFilmeGratis0311: () => primeiroFilmeGratis0311(a)') && (srcTxt.match(/comCorrecaoNoStill0311\(referenciaDaCenaNoClaim\(a\.claim\.response\?\.elenco_trava, scene\.index\), refaz0311\)/g) ?? []).length === 2)
}
checa('D8 teto do prompt: sem espaço, a época só troca modernidades (nunca corta o prompt assinado)', M.aplicarCorrecao0311('x'.repeat(5590) + ' a man in a hoodie', 'epoca', '1950', M.TETO_PROMPT_CLIPE_0311) === 'x'.repeat(5590) + ' a man in a 1950s wool overcoat and hat')

{
  const corrigido = M.aplicarCorrecao0311(`A pilot in a hoodie beside a plane. ${EPOCA_1950}`, 'epoca', '1950', M.TETO_PROMPT_CLIPE_0311)
  checa('D9 a troca de modernidades só antes de "Period setting:" (a proibição "no hoodies… no LED screens" do sufixo fica intacta)', corrigido.includes('A pilot in a 1950s wool overcoat and hat beside a plane.') && corrigido.endsWith(EPOCA_1950))
}

console.log('(M) mutantes')
{
  const { M: Mm } = carrega({ [F.mod]: (t) => troca(t, 'corpo = marca < 0 ? trocarModernidades(base, epoca).prompt :', 'corpo = true ? trocarModernidades(base, epoca).prompt :') })
  checa('M9 trocando modernidades no prompt inteiro, o sufixo viraria "no a 1950s wool overcoat" (vermelho)', !Mm.aplicarCorrecao0311(`A pilot. ${EPOCA_1950}`, 'epoca', '1950', 5600).endsWith(EPOCA_1950))
}
const roda = async (Gm, opts) => { const h = harness(Gm, opts); const fim = await h.rodar(); return { h, fim } }
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, 'refazAqui0311 = await d.primeiroFilmeGratis0311!() === true', 'refazAqui0311 = true') })
  const { h } = await roda(Gm, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG], elegivel: false })
  checa('M1 sem a elegibilidade, conta fora do 1º filme grátis ganharia cena paga (vermelho)', h.calls.scene.length === 1)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(troca(t, "const refaz0311 = !state.attempted && decision.kind === 'fail'", "const refaz0311 = decision.kind === 'fail'"), 'if (state.attempted || decision.kind === \'fail\' && !refazAqui0311)', 'if (decision.kind === \'fail\' && !refazAqui0311)') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [identidade, epocaG, epocaG] })
  checa('M2 sem a guarda do attempted, o filme já refeito ganharia a 2ª refação (vermelho)', h.calls.scene.length >= 2)
}
{
  const { G: Gm } = carrega({ [F.mod]: (t) => troca(t, '    else return null\n', '\n') })
  const { h } = await roda(Gm, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaEPreto] })
  checa('M3 aceitando qualquer teto, época + quadro preto gastaria uma cena inútil (vermelho)', h.calls.scene.length === 1)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, 'const requestId = await d.submitScene(comCorrecao0311(scene)) //', 'const requestId = await d.submitScene(scene) //') })
  const { h } = await roda(Gm, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG, limpa] })
  checa('M4 sem a correção no prompt, a cena seria refeita igual (vermelho)', h.calls.scene.length === 1 && !h.calls.scene[0].prompt.startsWith('Period setting: 1950 (1950s); period-accurate'))
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, "motivo === 'parado' ? b[0] - a[0] : a[0] - b[0]", 'a[0] - b[0]') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_RAISA), judgments: [parado, limpa] })
  checa('M5 sem o desempate pela cena mais tarde, o parado do fim refaria a cena do meio (vermelho)', h.calls.scene[0]?.index === 1)
}
{
  const { G: Gm } = carrega({ [F.mod]: (t) => troca(t, "if (motivo === 'pessoa') return semGenteNoPrompt0311(prompt)", "if (motivo === 'pessoa') return true") })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_TUNGUSKA), judgments: [pessoaNaCena1], context: { asked: 'Tunguska 1908', narration: 'x', language: 'en' } })
  checa('M6 sem exigir a cena "sem gente", o ancião seria apagado da cena dele (vermelho)', h.calls.scene.length === 1)
}
{
  const Sm = carregaSrv({ [F.srv]: (t) => troca(t, "  if (!filmeGratisPermitido(typeof marcador?.country === 'string' ? marcador.country : null)) return false\n", '') })
  checa('M7 sem a lista de países, conta de fora (IN) ganharia a refação (vermelho)', await Sm.primeiroFilmeGratis0311({ db: fakeDb(), userId: 'u1', renderId: 'r1', claim: claimK4('IN') }) === true)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, "if ((decision.identity || state.refazCena0311?.motivo === 'epoca') && d.submitStill)", 'if (decision.identity && d.submitStill)') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], comFolha: true })
  checa('M8 sem refazer o still com folha na época, o clipe sairia do still de jeans (vermelho)', h.calls.still.length === 0 && h.calls.scene[0]?.imageUrl === null)
}

console.log('(R) recibo exato da TRAVA 8.2')
{
  const { GRATIS_REFAZ_0311, semGratisRefaz0311 } = await import('./test-support/desfaz-gratis-refaz-0311.mjs')
  const { execFileSync } = await import('node:child_process')
  const lf = (t) => String(t).replace(/\r\n/g, '\n')
  // "antes desta entrega" = o commit-base gravado no recibo (não a origin/main de agora, que já contém esta entrega depois de publicada)
  const antes = (rel) => lf(execFileSync('git', ['show', `${GRATIS_REFAZ_0311.base}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  const arquivos = Object.keys(GRATIS_REFAZ_0311.scope)
  const { semGratisRefazImagem0311 } = await import('./test-support/desfaz-gratis-refaz-imagem-0311.mjs') // KINEO-GRATIS-REFAZ-IMAGEM-0311 — a camada de cima (o still refeito) sai antes, pelo recibo exato dela
  checa('R1 desfazer o recibo devolve EXATAMENTE o commit-base em cada arquivo alterado (portão, servidor, guardião histórico)', arquivos.length === 3 && arquivos.every((f) => lf(semGratisRefaz0311(lf(semGratisRefazImagem0311(lf(fs.readFileSync(f, 'utf8')), f)), f)) === antes(f))) // KINEO-GRATIS-REFAZ-IMAGEM-0311 — era: semGratisRefaz0311(lf(fs.readFileSync(f, 'utf8')), f)
  checa('R2 os arquivos novos estão no recibo por hash', ['lib/free15RefazCena0311.ts', 'scripts/test-gratis-refaz-cena-0311.mjs'].every((f) => typeof GRATIS_REFAZ_0311.addedSources[f] === 'string'))
}

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} gratis-refaz-cena-0311: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
