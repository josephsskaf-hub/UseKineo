// [TRAVA 8.2 — fundador 03/11: "três sim" — refazer também a imagem da cena no 1º filme grátis] KINEO-GRATIS-REFAZ-IMAGEM-0311 — guardião.
// Prova OFFLINE (sem OpenAI, sem fal, sem banco), EXECUTANDO o código REAL transpilado (lib/free15Gate.ts, lib/free15GateServer.ts,
// lib/free15RefazImagem0311.ts, lib/free15StillFlux0311.ts, lib/hollywood/anchors.ts e a nota REAL de lib/regua95/pixelScore.ts), que:
//   (0) o still refeito sai do MESMO gerador do 1º quadro da rota: o corpo do POST é byte a byte o que generateCinematicSceneStill
//       (lib/hollywood/anchors, chamado pela rota clássica) posta para o prompt corrigido — modelo, image_size, passos, semente, filtro;
//   (A) gustavoq (03/11, 1950, piloto de JEANS no still, cena i2v SEM folha): o still é refeito com a linha de época na frente e o
//       clipe é animado do still NOVO; relato imagem_refeita=true; Tunguska (pessoa inventada) idem com "lugar vazio";
//   (B) o still falha (job FAILED / filtro de segurança / envio lança / 5 min) → o clipe sai do still de antes, como hoje, UM POST só;
//       re-julgado e ainda reprovado → a falha de sempre (other_pixel_cap, entregue com estorno);
//   (C) plano parado → nenhum still novo; filme já refeito → nada; t2v/Kling 4 → clipe de sempre; com folha → o caminho da folha;
//       acima do teto de US$ 0,50 → clipe do still de antes;
//   (D) servidor: posta só cena i2v SEM folha, com chave; lê FAILED/pendente/pronto/filtro;
//   (M) mutantes ficam vermelhos; (R) recibo exato da TRAVA 8.2 e nada em caminho protegido.
// Uso: node scripts/test-gratis-refaz-imagem-0311.mjs   (cwd = raiz do repo)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const clone = (x) => JSON.parse(JSON.stringify(x))
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const troca = (t, de, para) => { if (t.split(de).length !== 2) throw Error('mutante: trecho ausente/ambíguo: ' + de.slice(0, 80)); return t.replace(de, () => para) }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, Date, Math, JSON, Promise }
const F = { gate: 'lib/free15Gate.ts', srv: 'lib/free15GateServer.ts', img: 'lib/free15RefazImagem0311.ts', flux: 'lib/free15StillFlux0311.ts', anchors: 'lib/hollywood/anchors.ts', pixel: 'lib/regua95/pixelScore.ts' }
const forbidden = () => { throw Error('External action forbidden') }
class FalQueueSubmitError extends Error { constructor(m, o) { super(m); this.ambiguous = !!o?.ambiguous } }
const carrega = (mutantes = {}) => {
  const load = createOfflineLoader({ globals, source: (rel, text) => (mutantes[rel] ? mutantes[rel](text) : text), mocks: {
    '@fal-ai/client': { fal: { config: forbidden, queue: { status: forbidden, result: forbidden } } },
    '@/lib/falQueue': { submitFalQueueOnce: forbidden, FalQueueSubmitError },
    '@/lib/compose': { pollCreatomateRender: forbidden, submitCreatomateRender: forbidden },
    '@/lib/credits/refund': { refundRenderCredits: forbidden },
  } })
  return { G: load(F.gate), P: load(F.pixel), I: load(F.img) }
}
// servidor com fal/falQueue falsos que GRAVAM (nada sai da máquina)
const carregaSrv = ({ mutantes = {}, env = { FAL_KEY: 'test-key-offline' }, fal: falFake, recusaPost = false } = {}) => {
  const posts = []
  const load = createOfflineLoader({ globals, env, source: (rel, text) => (mutantes[rel] ? mutantes[rel](text) : text), mocks: {
    '@fal-ai/client': { fal: falFake ?? { config() {}, queue: { status: forbidden, result: forbidden } } },
    // recusaPost: grava o corpo e recusa (não ambíguo) — a rota real (generateAnchorImage) devolve null sem esperar fila nenhuma
    '@/lib/falQueue': { submitFalQueueOnce: async (model, input) => { posts.push({ model, input: clone(input) }); if (recusaPost) throw new FalQueueSubmitError('recusado (teste)', { ambiguous: false }); return 'req-flux-' + posts.length }, FalQueueSubmitError },
    '@/lib/compose': { pollCreatomateRender: forbidden, submitCreatomateRender: forbidden },
    '@/lib/regua95/pixelScore': { scorePixel: forbidden },
    '@/lib/credits/refund': { refundRenderCredits: forbidden },
  } })
  return { S: load(F.srv), X: load(F.flux), A: load(F.anchors), posts }
}

// ── formas reais (as mesmas do guardião de KINEO-GRATIS-REFAZ-CENA-0311) ──
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
const SEMENTE = 1_234_567
const SEEDANCE_I2V = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const VEO_I2V = 'fal-ai/veo3.1/fast/image-to-video'
const media = { url: 'https://fixture.invalid/original.mp4', snapshotUrl: null, durationSeconds: 17.5 }
const frames8 = Array.from({ length: 8 }, (_, i) => ({ url: `https://f/q${i + 1}.jpg`, t: i * 2, bytes: 80000 }))
const fonteClassica = () => ({ width: 1080, height: 1920, duration: 17.5, elements: [0, 1, 2].map(i => ({ type: 'video', source: `clip-${i}`, time: i * 5.84, duration: 5.9, trim_start: 0.1, track: 2 })) })
// Seedance 1.5 i2v (a reserva/teto do Kling 4 grátis): o payload assinado traz o still FLUX de antes (image_url) e a semente do filme
const cenasClassicas = (prompts, model = SEEDANCE_I2V, seconds = 6) => (src) => src.elements.filter(e => e.type === 'video').map((e, i) => ({ index: i, clipUrl: e.source, model, seconds, text: `fala ${i}`, input: { image_url: `https://f/still-antigo-${i}.png`, prompt: prompts[i], aspect_ratio: '9:16', resolution: '720p', duration: '6', generate_audio: false, seed: SEMENTE } }))
const fonteKling4 = () => ({ width: 1080, height: 1920, duration: 15, elements: [{ type: 'video', source: 'https://f/k4-original.mp4', time: 0, duration: 15, track: 2 }] })
const cenasKling4 = (prompts) => () => [0, 1, 2].map(i => ({ index: i, clipUrl: 'https://f/k4-original.mp4', model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', seconds: 5, text: `fala ${i}`,
  input: { prompt: prompts[i], duration: '5', resolution: '720p', aspect_ratio: '9:16', generate_audio: false }, interval: { start: i * 5, duration: 5, originalUrl: 'https://f/k4-original.mp4', originalSeconds: 15 }, previewStart: i * 5 }))

function nota(P, issuesPorQuadro, extra = {}) {
  const parsed = { frames: frames8.map((f, i) => { const iss = issuesPorQuadro(i); return { i: i + 1, subject: 'cena', score: iss.length ? 80 : 100, issues: iss, note: iss.length ? 'defeito visto' : '' } }), identity_changes: [], identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, product_faithful: null, summary: 'ok', ...extra }
  const um = () => P.normalizePixel(clone(parsed), { product: 'filme', frames: frames8, via: 'nth_frame', model: 'm', usdFrames: 0, usdVision: 0, ms: 1, perguntasHonestas: true })
  return P.combinePixelReadings([um(), um()], { usdFrames: 0, ms: 1 })
}

const STILL_NOVO = 'https://f/still-flux-novo.png'
function harness(G, { source, scenes, judgments, comFolha = false, flux = 'req-flux', fluxPoll = () => ({ status: 'done', url: STILL_NOVO }), context = { asked: FALA_GUSTAVO, narration: FALA_GUSTAVO, language: 'en' }, semFlux = false }) {
  let atual = { version: 'free15-gate-v1', status: 'ready', source: clone(source), captionElements: [], captionEvidence: null, context, attempted: false, reason: 'awaiting_delivery', updatedAt: 1000 }
  const relogio = { agora: 2000 }
  const calls = { judge: 0, scene: [], still: [], stillPolls: 0, flux: [], fluxPolls: 0, render: 0 }
  const d = {
    now: () => relogio.agora,
    read: async () => clone(atual),
    move: async (antes, depois) => { if (JSON.stringify(antes) !== JSON.stringify(atual)) return false; atual = clone(depois); return true },
    judge: async () => clone(judgments[Math.min(calls.judge++, judgments.length - 1)]),
    scenes,
    submitStill: async (scene, refaz) => { calls.still.push({ index: scene.index, refaz: refaz ? clone(refaz) : null }); return comFolha ? 'req-still-folha' : null },
    pollStill: async () => { calls.stillPolls++; return { status: 'done', url: 'https://f/still-folha-novo.png' } },
    submitScene: async (scene, imageUrl) => { calls.scene.push({ index: scene.index, prompt: scene.input.prompt, imageUrl: imageUrl ?? null }); return 'req-scene' },
    pollScene: async (scene) => ({ status: 'done', url: scene.interval ? 'https://f/cena-refeita.mp4' : `clip-${scene.index}-refeito` }),
    submitRender: async () => { calls.render++; return 'render-2' },
    pollRender: async () => ({ status: 'succeeded', url: 'https://fixture.invalid/repaired.mp4', snapshotUrl: null, durationSeconds: 17.5 }),
    primeiroFilmeGratis0311: async () => true,
    ...(semFlux ? {} : {
      submitStillSemFolha0311: async (scene, refaz) => { calls.flux.push({ index: scene.index, refaz: clone(refaz) }); if (flux instanceof Error) throw flux; return flux },
      pollStillSemFolha0311: async () => { calls.fluxPolls++; return fluxPoll(relogio) },
    }),
  }
  return { d, calls, relogio, get: () => clone(atual), passo: () => G.advanceFree15Gate(d, media), rodar: async () => { let fim; for (let i = 0; i < 12 && !['passed', 'failed'].includes(atual.status); i++) fim = await G.advanceFree15Gate(d, media); return fim ?? await G.advanceFree15Gate(d, media) } }
}

const { G, P, I } = carrega()
const limpa = nota(P, () => [])
const epocaG = nota(P, (i) => (i === 3 || i === 4 ? ['anachronism'] : [])) // t=6 s e 8 s → a cena do piloto (2ª)
const parado = nota(P, (i) => (i >= 4 ? ['static'] : []))
const pessoaT = nota(P, (i) => (i === 6 || i === 7 ? ['invented_person'] : [])) // t=12/14 → cena 3 (pediu sem gente)
const identidade = nota(P, () => [], { identity_changes: [{ from: 3, to: 4, what: 'o piloto vira outra pessoa' }], identity_consistent: false })
const PERIODO = 'Period setting: 1950 (1950s); period-accurate 1950s clothing, vehicles and props only; no present-day smartphones, cars or fashion. '

console.log('(0) o MESMO gerador do 1º quadro da rota')
{
  const anchorsTxt = lf(fs.readFileSync(F.anchors, 'utf8'))
  const { X } = carregaSrv()
  checa('0.1 o modelo do still é o espelho exato do ANCHOR_IMAGE_MODEL de lib/hollywood/anchors.ts', anchorsTxt.includes(`const ANCHOR_IMAGE_MODEL = '${X.FLUX_STILL_MODEL_0311}'`) && X.FLUX_STILL_MODEL_0311 === 'fal-ai/flux/dev')
  // o que a ROTA posta: generateCinematicSceneStill real (lib/hollywood/anchors), com o POST capturado
  const rota = carregaSrv({ recusaPost: true })
  const cena = cenasClassicas(PROMPTS_GUSTAVO)(fonteClassica())[1]
  const refaz = { motivo: 'epoca', cena: 1, quadros: [4, 5], epoca: '1950', usdEstimado: 0.156 }
  const corrigido = PERIODO + PROMPTS_GUSTAVO[1]
  const devolveu = await rota.A.generateCinematicSceneStill({ scenePrompt: corrigido, styleSuffix: '', seed: SEMENTE, pollWindowMs: 1, aspect: '9:16' })
  if (devolveu !== null) throw Error('a rota deveria devolver null com o POST recusado')
  const meu = X.entradaDoStillFlux0311(cena, refaz, '9:16')
  checa('0.2 o corpo do POST é byte a byte o que generateCinematicSceneStill posta (modelo, prompt, image_size, passos, semente, filtro)', rota.posts.length === 1 && rota.posts[0].model === X.FLUX_STILL_MODEL_0311 && JSON.stringify(rota.posts[0].input) === JSON.stringify(meu))
  checa('0.3 o prompt do still novo abre com a linha de época e segue com a cena assinada (piloto) e as cláusulas do still', meu.prompt.startsWith(PERIODO + LOOK_FOTO + 'A pilot in a leather flight jacket') && meu.prompt.includes('9:16 vertical framing') && meu.prompt.includes('no text, no letters') && meu.image_size === 'portrait_16_9' && meu.num_inference_steps === 28 && meu.seed === SEMENTE && meu.enable_safety_checker === true)
  const tung = X.entradaDoStillFlux0311(cenasClassicas(PROMPTS_TUNGUSKA)(fonteClassica())[2], { motivo: 'pessoa', cena: 2, quadros: [7, 8], usdEstimado: 0.156 }, '9:16')
  checa('0.4 pessoa inventada: o still novo abre com "lugar vazio, ninguém presente"', tung.prompt.startsWith('An empty, deserted place with no one present') && tung.prompt.includes(SEM_GENTE.trim()))
  checa('0.5 parado / t2v / sem still https → sem POST de still (null)', X.entradaDoStillFlux0311(cena, { motivo: 'parado', cena: 1, quadros: [], usdEstimado: 0.1 }, '9:16') === null && X.entradaDoStillFlux0311(cenasKling4(PROMPTS_GUSTAVO)()[1], refaz, '9:16') === null && X.entradaDoStillFlux0311({ ...cena, input: { ...cena.input, image_url: 'still-1' } }, refaz, '9:16') === null)
}

console.log('(A) época/pessoa em cena i2v SEM folha → still novo, clipe do still novo')
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa] })
  const fim = await h.rodar()
  const r = h.get().refazCena0311
  checa('A1 gustavoq 1950 (jeans no still, sem folha): UM POST do still FLUX da cena do piloto, com o relato de época', h.calls.flux.length === 1 && h.calls.flux[0].index === 1 && h.calls.flux[0].refaz.motivo === 'epoca' && h.calls.flux[0].refaz.epoca === '1950' && h.calls.fluxPolls === 1 && h.calls.stillPolls === 0)
  checa('A2 o clipe refeito é animado do still NOVO (1º quadro) com a linha de época na frente, uma vez só', h.calls.scene.length === 1 && h.calls.scene[0].index === 1 && h.calls.scene[0].imageUrl === STILL_NOVO && h.calls.scene[0].prompt.startsWith(PERIODO) && h.get().stillUrl === STILL_NOVO)
  checa('A3 relato: imagem_refeita=true, via flux, motivo still_novo, custo do still 0,03 + clipe 0,156 (≤ 0,50), resultado passed', fim.status === 'passed' && r?.imagem_refeita === true && r.imagem_via === 'flux' && r.imagem_motivo === 'still_novo' && r.imagem_usd === 0.03 && r.usdEstimado === 0.156 && r.usdEstimado + r.imagem_usd <= 0.5 && r.resultado === 'passed' && h.get().attempted === true)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_TUNGUSKA), judgments: [pessoaT, limpa], context: { asked: 'Tunguska 1908', narration: 'In 1908 a blast flattened a forest', language: 'en' } })
  await h.rodar()
  checa('A4 Tunguska: pessoa inventada na cena sem gente → still novo (pessoa) e o clipe sai dele com "lugar vazio" na frente', h.calls.flux.length === 1 && h.calls.flux[0].index === 2 && h.calls.flux[0].refaz.motivo === 'pessoa' && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === STILL_NOVO && h.calls.scene[0].prompt.startsWith('An empty, deserted place') && h.calls.still.length === 0)
}

console.log('(B) o still falhou → o clipe sai do still de antes (como hoje); re-julgado reprovado → a falha de sempre')
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], fluxPoll: () => ({ status: 'failed' }) })
  const fim = await h.rodar()
  const r = h.get().refazCena0311
  checa('B1 job FAILED / filtro de segurança: clipe do still assinado de antes (sem imageUrl), relato imagem_refeita=false still_falhou', h.calls.flux.length === 1 && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && h.calls.scene[0].prompt.startsWith(PERIODO) && r?.imagem_refeita === false && r.imagem_motivo === 'still_falhou' && !h.get().stillUrl && fim.status === 'passed')
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], flux: new Error('fal 503 ambíguo') })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('B2 o POST do still lançou (recusado/ambíguo): nunca posta de novo, clipe do still de antes, relato envio_falhou (conta o still)', h.calls.flux.length === 1 && h.calls.fluxPolls === 0 && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && r?.imagem_refeita === false && r.imagem_motivo === 'envio_falhou' && r.imagem_usd === 0.03)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], fluxPoll: () => ({ status: 'pending' }) })
  for (let i = 0; i < 3 && h.get().status !== 'still'; i++) await h.passo()
  await h.passo() // ainda pendente dentro do prazo
  const pendente = h.get().status === 'still' && h.calls.scene.length === 0
  h.relogio.agora = 2000 + 5 * 60_000 + 1
  await h.passo()
  const r = h.get().refazCena0311
  checa('B3 5 min sem ficar pronto (o prazo de sempre do still): o clipe sai do still de antes, relato still_prazo', pendente && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && r?.imagem_motivo === 'still_prazo' && r.imagem_refeita === false && h.calls.flux.length === 1)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, epocaG] })
  const fim = await h.rodar()
  checa('B4 still novo e AINDA época errada → a falha de sempre (other_pixel_cap, estorno no servidor), 1 still e 1 clipe só', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.get().refazCena0311?.resultado === 'failed' && h.get().refazCena0311?.imagem_refeita === true && h.calls.flux.length === 1 && h.calls.scene.length === 1)
}

console.log('(C) o que não muda')
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_RAISA), judgments: [parado, limpa], context: { asked: 'como o dinheiro cresce', narration: 'Seu dinheiro pode crescer como uma planta.', language: 'pt' } })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('C1 plano parado: nenhum still novo (só a frase de movimento; o mesmo still serve), relato sem campos de imagem', h.calls.flux.length === 0 && h.calls.still.length === 0 && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && r?.motivo === 'parado' && !('imagem_refeita' in r) && !('imagem_via' in r))
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [identidade, epocaG] })
  const fim = await h.rodar()
  checa('C2 filme já refeito (identidade) e agora época errada → falha, sem still FLUX e sem 2ª cena', fim.status === 'failed' && fim.reason === 'other_pixel_cap' && h.calls.flux.length === 0 && h.calls.scene.length === 1 && !h.get().refazCena0311)
}
{
  const h = harness(G, { source: fonteKling4(), scenes: cenasKling4(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], flux: null })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('C3 Kling 4 grátis (t2v, sem still): o servidor diz "não se aplica" → o clipe de sempre, relato sem_still_i2v', h.calls.flux.length === 1 && h.calls.fluxPolls === 0 && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && r?.imagem_refeita === false && r.imagem_motivo === 'sem_still_i2v' && !('imagem_usd' in r))
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], comFolha: true })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('C4 época COM folha: o still é refeito pela folha (KINEO-GRATIS-REFAZ-CENA-0311), FLUX não é chamado; relato via folha', h.calls.flux.length === 0 && h.calls.still.length === 1 && h.calls.stillPolls === 1 && h.calls.scene[0].imageUrl === 'https://f/still-folha-novo.png' && r?.imagem_via === 'folha' && r.imagem_refeita === true && r.imagem_usd === 0.15)
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO, VEO_I2V, 8), judgments: [epocaG, limpa] })
  await h.rodar()
  const r = h.get().refazCena0311
  checa('C5 clipe caro (Veo 8 s = US$ 1,20 + still > teto 0,50) → sem still novo, clipe do still de antes, relato teto_usd', I.TETO_USD_REFAZ_IMAGEM_0311 === 0.5 && h.calls.flux.length === 0 && h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && r?.imagem_motivo === 'teto_usd')
}
{
  const h = harness(G, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], semFlux: true })
  await h.rodar()
  checa('C6 sem as deps novas → exatamente o de KINEO-GRATIS-REFAZ-CENA-0311 (clipe do still de antes, relato sem campos de imagem)', h.calls.scene.length === 1 && h.calls.scene[0].imageUrl === null && !('imagem_motivo' in (h.get().refazCena0311 ?? {})))
}

console.log('(D) servidor: posta só cena i2v SEM folha; lê FAILED/pendente/pronto/filtro')
{
  const cena = cenasClassicas(PROMPTS_GUSTAVO)(fonteClassica())[1]
  const refaz = { motivo: 'epoca', cena: 1, quadros: [4, 5], epoca: '1950', usdEstimado: 0.156 }
  const s1 = carregaSrv()
  const id = await s1.S.postarStillSemFolha0311({ claim: { response: { aspect: '9:16' } } }, cena, refaz)
  checa('D1 cena i2v sem folha → UM POST ao fal-ai/flux/dev com o corpo de entradaDoStillFlux0311', id === 'req-flux-1' && s1.posts.length === 1 && s1.posts[0].model === 'fal-ai/flux/dev' && JSON.stringify(s1.posts[0].input) === JSON.stringify(s1.X.entradaDoStillFlux0311(cena, refaz, '9:16')))
  const folha = { elenco_trava: { cenas: [{ cena: 2, folhas: ['https://f.invalid/folha.png'], prompt_still: 'x'.repeat(30) }] } }
  const s2 = carregaSrv()
  const comFolha = await s2.S.postarStillSemFolha0311({ claim: { response: { aspect: '9:16', ...folha } } }, cena, refaz)
  const t2v = await s2.S.postarStillSemFolha0311({ claim: { response: { aspect: '9:16' } } }, cenasKling4(PROMPTS_GUSTAVO)()[1], refaz)
  const s3 = carregaSrv({ env: {} })
  const semChave = await s3.S.postarStillSemFolha0311({ claim: { response: { aspect: '9:16' } } }, cena, refaz)
  checa('D2 cena COM folha / t2v / sem FAL_KEY → null e zero POST', comFolha === null && t2v === null && semChave === null && s2.posts.length === 0 && s3.posts.length === 0)
  const falDe = (st, res) => ({ config() {}, queue: { status: async () => st, result: async () => res } })
  const le = async (st, res) => carregaSrv({ fal: falDe(st, res) }).S.lerStillSemFolha0311('req-flux-1')
  const pronto = await le({ status: 'COMPLETED' }, { data: { images: [{ url: 'https://v3.fal.media/still.png' }], has_nsfw_concepts: [false] } })
  const nsfw = await le({ status: 'COMPLETED' }, { data: { images: [{ url: 'https://v3.fal.media/preto.png' }], has_nsfw_concepts: [true] } })
  const semUrl = await le({ status: 'COMPLETED' }, { data: { images: [] } })
  const falhou = await le({ status: 'FAILED' }, null)
  const andando = await le({ status: 'IN_PROGRESS' }, null)
  checa('D3 leitura: pronto → done+url; filtro de segurança / sem URL / FAILED → failed; em andamento → pending', pronto.status === 'done' && pronto.url === 'https://v3.fal.media/still.png' && nsfw.status === 'failed' && semUrl.status === 'failed' && falhou.status === 'failed' && andando.status === 'pending')
  const srcTxt = lf(fs.readFileSync(F.srv, 'utf8'))
  checa('D4 o adaptador real liga o POST e a leitura do still sem folha', srcTxt.includes('submitStillSemFolha0311: (scene, refaz0311) => postarStillSemFolha0311(a, scene, refaz0311)') && srcTxt.includes('pollStillSemFolha0311: (_scene, requestId) => lerStillSemFolha0311(requestId)'))
  checa('D5 o portão continua sem fornecedor (lib/free15Gate.ts não importa o FLUX nem o anchors)', !/free15StillFlux0311|hollywood\/anchors|@fal-ai/.test(lf(fs.readFileSync(F.gate, 'utf8'))))
}

console.log('(M) mutantes')
const roda = async (Gm, opts) => { const h = harness(Gm, opts); const fim = await h.rodar(); return { h, fim } }
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, 'if (state.refazCena0311 && motivoRefazImagem0311(state.refazCena0311.motivo) && d.submitStillSemFolha0311)', 'if (state.refazCena0311 && d.submitStillSemFolha0311)') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_RAISA), judgments: [parado, limpa], context: { asked: 'x', narration: 'x', language: 'pt' } })
  checa('M1 sem restringir a época/pessoa, o plano parado pagaria um still à toa (vermelho)', h.calls.flux.length === 1)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, "if (fluxId) { await move({ status: 'still', stillRequestId: fluxId,", "if (false) { await move({ status: 'still', stillRequestId: fluxId,") })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa] })
  checa('M2 sem esperar o still novo, o clipe sairia do still de jeans (vermelho)', h.calls.scene[0]?.imageUrl === null)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, "const flux0311 = state.refazCena0311?.imagem_via === 'flux'", 'const flux0311 = false') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa] })
  checa('M3 lendo o still FLUX pelo leitor da folha, o clipe sairia de outra imagem (vermelho)', h.calls.fluxPolls === 0 && h.calls.scene[0]?.imageUrl !== STILL_NOVO)
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, 'if (!cabeNoTeto0311(state.refazCena0311))', 'if (false)') })
  const { h } = await roda(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO, VEO_I2V, 8), judgments: [epocaG, limpa] })
  checa('M4 sem o teto de US$ 0,50, o clipe caro ganharia o still a mais (vermelho)', h.calls.flux.length === 1)
}
{
  const s = carregaSrv({ mutantes: { [F.flux]: (t) => troca(t, 'scenePrompt: corrigirPrompt0311(scene.input.prompt, refaz, TETO_PROMPT_CLIPE_0311)', 'scenePrompt: String(scene.input.prompt)') } })
  const e = s.X.entradaDoStillFlux0311(cenasClassicas(PROMPTS_GUSTAVO)(fonteClassica())[1], { motivo: 'epoca', cena: 1, quadros: [], epoca: '1950', usdEstimado: 0.1 }, '9:16')
  checa('M5 sem a correção no prompt do still, o FLUX desenharia o mesmo piloto de jeans (vermelho)', !e.prompt.startsWith(PERIODO))
}
{
  const s = carregaSrv({ mutantes: { [F.srv]: (t) => troca(t, '  if (referenciaDaCenaNoClaim(a.claim.response?.elenco_trava, scene.index)) return null\n', '') } })
  await s.S.postarStillSemFolha0311({ claim: { response: { aspect: '9:16', elenco_trava: { cenas: [{ cena: 2, folhas: ['https://f.invalid/folha.png'], prompt_still: 'x'.repeat(30) }] } } } }, cenasClassicas(PROMPTS_GUSTAVO)(fonteClassica())[1], { motivo: 'epoca', cena: 1, quadros: [], epoca: '1950', usdEstimado: 0.1 })
  checa('M6 sem pular a cena com folha, o FLUX trocaria o rosto da folha por um desconhecido (vermelho)', s.posts.length === 1)
}
{
  const s = carregaSrv({ mutantes: { [F.flux]: (t) => troca(t, "  if (Array.isArray(data.has_nsfw_concepts) && data.has_nsfw_concepts.some((x) => x === true)) return { status: 'failed' }\n", '') } })
  checa('M7 sem o filtro de segurança, a imagem preta do FLUX viraria o 1º quadro (vermelho)', s.X.stillFluxPronto0311({ data: { images: [{ url: 'https://v3.fal.media/preto.png' }], has_nsfw_concepts: [true] } }).status === 'done')
}
{
  const { G: Gm } = carrega({ [F.gate]: (t) => troca(t, "    else { try { fluxId = await d.submitStillSemFolha0311(scene, state.refazCena0311); if (!fluxId) semImagem0311 = 'sem_still_i2v' } catch { semImagem0311 = 'envio_falhou' } }", "    else { try { fluxId = await d.submitStillSemFolha0311(scene, state.refazCena0311) } catch { fluxId = await d.submitStillSemFolha0311(scene, state.refazCena0311) } }") })
  const h = harness(Gm, { source: fonteClassica(), scenes: cenasClassicas(PROMPTS_GUSTAVO), judgments: [epocaG, limpa], flux: new Error('ambíguo') })
  try { await h.rodar() } catch { /* o 2º POST também lança: o que importa é quantos saíram */ }
  checa('M8 repostar o still depois de um envio ambíguo pagaria 2 stills (vermelho)', h.calls.flux.length === 2)
}

console.log('(R) recibo exato da TRAVA 8.2 e caminhos protegidos')
{
  const { GRATIS_REFAZ_IMAGEM_0311, semGratisRefazImagem0311, deltaGratisRefazImagem0311Exato } = await import('./test-support/desfaz-gratis-refaz-imagem-0311.mjs')
  const base = GRATIS_REFAZ_IMAGEM_0311.base
  const antes = (rel) => { try { return lf(execFileSync('git', ['show', `${base}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })) } catch { return null } } // arquivo novo: ausente no commit-base
  const alterados = Object.keys(GRATIS_REFAZ_IMAGEM_0311.scope), novos = Object.keys(GRATIS_REFAZ_IMAGEM_0311.addedSources)
  checa('R1 desfazer o recibo devolve EXATAMENTE o commit-base em cada arquivo alterado (portão, servidor, 2 guardiões históricos)', alterados.length === 4 && alterados.every((f) => lf(semGratisRefazImagem0311(lf(fs.readFileSync(f, 'utf8')), f)) === antes(f)))
  checa('R2 cada arquivo é exatamente "commit-base + esta entrega" (novos: hash exato e ausentes no commit-base)', [...alterados, ...novos].every((f) => deltaGratisRefazImagem0311Exato(fs.readFileSync(f, 'utf8'), antes(f), f)) && novos.includes('lib/free15RefazImagem0311.ts') && novos.includes('lib/free15StillFlux0311.ts'))
  const PROIBIDOS = ['lib/compose', 'lib/hollywood/', 'lib/cinematic/', 'lib/broll/', 'lib/lyriaMusic', 'lib/narrationFit', 'app/api/analyze-idea/', 'app/api/generate-script/', 'app/api/generate-video-']
  checa('R3 nenhum arquivo do recibo em caminho protegido (lib/hollywood/anchors só é importado) e anchors.ts igual ao commit-base', [...alterados, ...novos].every((f) => !PROIBIDOS.some((p) => f.startsWith(p))) && lf(fs.readFileSync(F.anchors, 'utf8')) === antes(F.anchors))
}

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} gratis-refaz-imagem-0311: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
