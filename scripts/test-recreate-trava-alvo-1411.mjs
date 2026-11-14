// KINEO-RECREATE-TRAVA-ALVO-1411 — guardião do pedido 4 da CEO (14/11): a trava do "seu vídeo" no Kling sem FALSO "swapped".
// EXECUTA a trava inteira (lib/recreate/swapCheck runSwapCheck) com fal e OpenAI falsos, e a liquidação real (lib/clips/clipFlow settleClip):
//  · caso f2bd4efe (o que o juiz respondeu de verdade: diferente da base E diferente da foto) → `uncertain`, NÃO entrega, estorno, motivo próprio;
//  · caso ae3edf15 (diferente da base e parecido com a foto) → `swapped`, entrega;
//  · o juiz recebe o ALVO escrito no pedido ("the man in the dark blue shirt and dark trousers"), não o sujeito fixo; 4 pares base/resultado em
//    alta, na ordem, + a foto; os MESMOS instantes por tempo absoluto (20/40/60/80% do original), cada vídeo no seu fps;
//  · o veredito leva instantes, alvo, pares usados e regra, e o evento os grava;
//  · alvo que não aparece → `uncertain`; mantida → `unchanged`; Seedance e catálogo seguem no caminho de antes.
// Mutantes. Rodar: node scripts/test-recreate-trava-alvo-1411.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const SC = 'lib/recreate/swapCheck.ts', FLOW = 'lib/clips/clipFlow.ts', SRV = 'lib/clips/clipServer.ts'
const KLING = 'kling/v4/video-to-video/edit', SEEDANCE = 'bytedance/seedance-2.5/reference-to-video'
const U = '11111111-2222-4333-8444-555555555555', V = '66666666-7777-4888-9999-000000000000'
const VIDEO = `https://x.supabase.co/storage/v1/object/public/renders/recreate-uploads/${U}/${V}.mp4`
const SAIDA = 'https://v3.fal.media/files/saida.mp4'
const FOTO = 'https://x.supabase.co/storage/v1/object/public/renders/avatars/u/face-1.jpg'
// Os pedidos reais de 14/11 (o texto que foi ao motor).
const PEDIDO_F2 = 'Replace the man in the dark blue shirt and dark trousers in @Video1 with the man from @Image1: his face, hair and beard match @Image1. Do not change the football players in black and white striped shirts. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly. Keep the original clothing from @Video1.'
const PEDIDO_AE = 'Replace the man in the dark blue shirt in @Video1 with the man from @Image1: his face, hair and beard match @Image1. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly. Keep the original clothing from @Video1.'

function carregar(src, metas) {
  const mod = { exports: {} }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const stubs = {
    '@/lib/aiModels': { AI_TEXT_MODELS: { writer: 'gpt-4o' } },
    '@/lib/regua95/coherenceV2': { usdFromUsage: () => 0.02 },
    '@/lib/regua95/pixelScore': { FAL_NTH_FRAME_MODEL: 'fal-ai/workflow-utilities/extract-nth-frame', FAL_USD_PER_COMPUTE_SECOND: 0.001, PIXEL_MODEL_RATES: {} },
    './formats': { RECREATE_CHECK_FRAMES: [84, 168], RECREATE_FORMATS: [] },
    './generation': { RECREATE_MODEL: 'recast', RECREATE_PROVIDER_ORIGIN: 'https://www.usekineo.com' },
    './seuVideo': { catalogoNoSeedance25: () => false, KLING4_EDIT_MODEL: KLING, SEEDANCE25_MODEL: SEEDANCE, SEU_VIDEO_PASTA: 'recreate-uploads', metaPorUrl: async (url) => metas[url] ?? null },
  }
  new Function('require', 'module', 'exports', 'process', js)((id) => { if (id in stubs) return stubs[id]; throw new Error('import inesperado: ' + id) }, mod, mod.exports, { env: {}, cwd: () => '.' })
  return mod.exports
}
const linha = (model, prompt) => ({ model, fingerprint: JSON.stringify(['pedido', model, model === KLING ? { prompt, video_url: VIDEO, image_urls: [FOTO], resolution: '720p' } : { prompt, task: 'reference', video_urls: [VIDEO], image_urls: [FOTO] }]) })
// O que o juiz respondeu de verdade em cada clipe (events recreate_swap_check de 14/11), no formato da resposta.
const RESPOSTA = {
  f2bd4efe: { person: 1, visible_pairs: [3, 4], base_vs_result: { hair_color: 'different', beard: 'different', glasses: 'different' }, same_person: 'no', result_vs_photo: 'no', note: 'All attributes different.' },
  ae3edf15: { person: 1, visible_pairs: [1, 2, 3, 4], base_vs_result: { hair_color: 'different', beard: 'different' }, same_person: 'no', result_vs_photo: 'yes', note: 'Hair color and beard differ.' },
  mantida: { person: 1, visible_pairs: [2, 3, 4], base_vs_result: { hair_color: 'same', glasses: 'same', face_shape: 'same' }, same_person: 'yes', result_vs_photo: 'no', note: 'Glasses in video, none in photo.' },
  // KINEO-RECREATE-TRAVA-SEM-OCULOS-1411 — clip 568db487: o motor trocou rosto, cabelo e barba e deixou os ÓCULOS do original. A resposta errada
  // do juiz ("é a mesma", guiada pelos óculos) e a resposta certa para os mesmos quadros.
  oculosEnganam: { person: 1, visible_pairs: [1, 2], base_vs_result: { glasses: 'same' }, same_person: 'yes', result_vs_photo: 'no', note: 'Different hair color and beard in photo.' },
  oculosFicaram: { person: 1, visible_pairs: [1, 2, 3], base_vs_result: { hair_color: 'different', beard: 'different', face_shape: 'different', glasses: 'same' }, same_person: 'no', result_vs_photo: 'yes', note: 'Hair and beard changed; glasses kept.' },
  soOculosMudaram: { person: 1, visible_pairs: [3, 4], base_vs_result: { glasses: 'different' }, same_person: 'no', result_vs_photo: 'yes', note: 'Only glasses differ.' },
  sumiu: { person: 1, visible_pairs: [], base_vs_result: {}, same_person: 'uncertain', result_vs_photo: 'uncertain', note: 'Target face not visible.' },
}
function rede(resposta) {
  const s = { fal: [], visao: null }
  const f = async (url, init) => {
    if (String(url).startsWith('https://fal.run/')) {
      const b = JSON.parse(init.body); s.fal.push(b)
      const tag = b.video_url === VIDEO ? 'base' : 'saida'
      return { ok: true, json: async () => ({ images: Array.from({ length: b.max_frames }, (_, i) => ({ url: `https://f/${tag}-${i}.jpg` })) }) }
    }
    if (String(url).includes('api.openai.com')) { s.visao = JSON.parse(init.body); return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ persons: [resposta] }) } }], usage: {} }) } }
    throw new Error('rede inesperada: ' + url)
  }
  return { s, f }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const src = over[SC] ?? lf(SC)
  const roda = async (resposta, { prompt = PEDIDO_F2, model = KLING, metas } = {}) => {
    const S = carregar(src, metas ?? { [VIDEO]: { segundos: 4, fps: 30, largura: 720, altura: 1280 }, [SAIDA]: { segundos: 4.04, fps: 24, largura: 720, altura: 1280 } })
    const r = rede(resposta)
    const v = await S.runSwapCheck(linha(model, prompt), SAIDA, { fetchImpl: r.f, falKey: 'k', apiKey: 'k', budgetMs: 5000 })
    return { v, s: r.s, S }
  }
  await check('caso f2bd4efe: diferente da base E da foto = uncertain (não "swapped")', async () => {
    const { v } = await roda(RESPOSTA.f2bd4efe)
    if (v.result !== 'uncertain' || v.reason !== 'changed_not_like_photo') throw new Error(v.result + ' ' + v.reason)
    if (v.persons[0].same_as_base !== false || v.persons[0].matches_photo !== false) throw new Error('persons')
  })
  await check('caso ae3edf15: diferente da base e parecido com a foto = swapped', async () => {
    const { v } = await roda(RESPOSTA.ae3edf15, { prompt: PEDIDO_AE, metas: { [VIDEO]: { segundos: 7.9, fps: 30 }, [SAIDA]: { segundos: 8.04, fps: 30 } } })
    if (v.result !== 'swapped' || v.reason !== 'all_swapped') throw new Error(v.result + ' ' + v.reason)
  })
  await check('mantida = unchanged; alvo que não aparece = uncertain', async () => {
    const a = await roda(RESPOSTA.mantida); if (a.v.result !== 'unchanged') throw new Error('mantida: ' + a.v.result)
    const b = await roda(RESPOSTA.sumiu); if (b.v.result !== 'uncertain' || b.v.reason !== 'target_unclear') throw new Error('sumiu: ' + b.v.result + ' ' + b.v.reason)
  })
  await check('óculos não decidem (clip 568db487): só os óculos iguais não é "mantida"; trocou com os óculos do original = swapped; só os óculos diferentes não é "trocou"', async () => {
    const a = await roda(RESPOSTA.oculosEnganam, { prompt: PEDIDO_AE })
    if (a.v.result === 'unchanged' || a.v.persons[0].same_as_base === true) throw new Error('os óculos ainda fazem "mantida": ' + a.v.result)
    const b = await roda(RESPOSTA.oculosFicaram, { prompt: PEDIDO_AE })
    if (b.v.result !== 'swapped') throw new Error('trocou com os óculos do original: ' + b.v.result + ' ' + b.v.reason)
    const c = await roda(RESPOSTA.soOculosMudaram, { prompt: PEDIDO_AE })
    if (c.v.result === 'swapped') throw new Error('só os óculos diferentes virou "trocou"')
    const sys = a.s.visao.messages[0].content
    if (!/GLASSES and other accessories/.test(sys) || !/glasses are NOT a reason to say the edited target does not resemble the reference photo/.test(sys) || !/Compare only the face, hair and beard of the target/.test(sys)) throw new Error('o juiz não foi avisado dos óculos')
    if (/"glasses": "same"/.test(sys)) throw new Error('óculos ainda entre os atributos que decidem')
  })
  await check('o juiz recebe o ALVO do pedido, 4 pares em ordem e a foto', async () => {
    const { s } = await roda(RESPOSTA.f2bd4efe)
    const user = s.visao.messages[1].content, texto = user[0].text
    if (!texto.includes('Person 1 (the target for reference photo 1) is "the man in the dark blue shirt and dark trousers" in the ORIGINAL frames.')) throw new Error('alvo: ' + texto.slice(0, 200))
    if (/largest and most central/.test(texto)) throw new Error('sujeito fixo no lugar do alvo')
    const imgs = user.filter((c) => c.type === 'image_url')
    const esperado = ['base-1', 'saida-1', 'base-2', 'saida-2', 'base-3', 'saida-3', 'base-4', 'saida-4'].map((x) => `https://f/${x}.jpg`)
    if (JSON.stringify(imgs.slice(0, 8).map((i) => i.image_url.url)) !== JSON.stringify(esperado)) throw new Error('pares: ' + imgs.map((i) => i.image_url.url).join(','))
    if (imgs.slice(0, 8).some((i) => i.image_url.detail !== 'high') || imgs.length !== 9 || imgs[8].image_url.url !== FOTO) throw new Error('detalhe ou foto')
    const sys = s.visao.messages[0].content
    if (!/Do not identify anyone/.test(sys) || !/ignore them completely, even when they are larger or more central/.test(sys) || !/"visible_pairs"/.test(sys)) throw new Error('sistema')
  })
  await check('mesmos instantes por TEMPO ABSOLUTO, cada vídeo no seu fps; veredito com instantes, alvo, pares e regra', async () => {
    const { v, s } = await roda(RESPOSTA.ae3edf15, { prompt: PEDIDO_AE, metas: { [VIDEO]: { segundos: 7.9, fps: 30 }, [SAIDA]: { segundos: 8.04, fps: 24 } } })
    const base = s.fal.find((b) => b.video_url === VIDEO), saida = s.fal.find((b) => b.video_url === SAIDA)
    if (base.frame_interval !== 47 || saida.frame_interval !== 38 || base.max_frames !== 5 || saida.max_frames !== 5) throw new Error(`intervalos ${base.frame_interval}/${saida.frame_interval} max ${base.max_frames}`)
    if (JSON.stringify(v.instants) !== '[1.58,3.16,4.74,6.32]') throw new Error('instantes ' + JSON.stringify(v.instants))
    if (JSON.stringify(v.subjects) !== '["the man in the dark blue shirt"]' || JSON.stringify(v.pairs_used) !== '[1,2,3,4]' || v.rule !== 'alvo_4_instantes_sem_oculos_1411') throw new Error('marca: ' + JSON.stringify([v.subjects, v.pairs_used, v.rule]))
  })
  await check('alvosDoPedido: molde da tela, neutro, genérico, texto editado, sujeira', async () => {
    const S = carregar(src, {})
    const eq = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)) }
    eq(S.alvosDoPedido('Replace the person on the left in white in @Video1 with the man from @Image1: his face and hair match @Image1. Replace the woman in the red dress in @Video1 with the woman from @Image2: her face and hair match @Image2. Keep …', 2), ['the person on the left in white', 'the woman in the red dress'])
    eq(S.alvosDoPedido('Replace the dancer in the dark blue shirt in @Video1 with the person from @Image1, and the second person in @Video1 with the person from @Image2: their face and hair match their photo.', 2), ['the dancer in the dark blue shirt', null])
    eq(S.alvosDoPedido('Replace the main person in @Video1 with the man from @Image1: his face…', 1), [null])
    eq(S.alvosDoPedido('Put @Image1 on the guy in @Video1 please', 1), [null])
    eq(S.alvosDoPedido('Replace the man "in blue" <b>now</b> in @Video1 with the man from @Image1', 1), ['the man in blue b now b'])
    eq(S.alvosDoPedido(null, 1), [null])
  })
  await check('sem alvo legível: o sujeito de antes; Seedance: o caminho de antes (2 instantes)', async () => {
    const a = await roda(RESPOSTA.ae3edf15, { prompt: 'Put @Image1 on the guy in @Video1 please' })
    if (!/the main person \(the largest and most central person\)/.test(a.s.visao.messages[1].content[0].text)) throw new Error('sem o sujeito de antes')
    const b = await roda(RESPOSTA.f2bd4efe, { model: SEEDANCE })
    if (b.s.fal.some((x) => x.max_frames !== 3) || b.v.rule !== undefined) throw new Error('Seedance entrou na regra nova')
  })
  // ── a liquidação real: uncertain não entrega ──────────────────────────────
  await check('liquidação: uncertain = falha com estorno e motivo próprio, saída guardada, nada entregue', async () => {
    const m = loader({}, over[FLOW] ? { [FLOW]: over[FLOW] } : {})
    const flow = m('lib/clips/clipFlow')
    const calls = []
    const row = { id: U, user_id: U, idempotency_key: 'k', fingerprint: 'f', billing_reference: 'clips-' + U, engine: 'h3', mode: 'image', model: KLING, seconds: 4, aspect: '9:16', prompt: PEDIDO_F2, image_url: FOTO, credits: 40, fal_usd: 0.94, status: 'processing', fal_request_id: 'req-1', video_url: null, failure_reason: null, credits_refunded: 0, created_at: new Date(Date.now() - 120_000).toISOString() }
    const deps = {
      poll: async () => ({ state: 'done', url: SAIDA }), persist: async () => { calls.push('persist'); return 'https://ours/x.mp4' },
      refund: async () => { calls.push('refund'); return 40 }, markDone: async () => true, markFailed: async () => true, event: async (n) => { calls.push('event:' + n) }, now: () => Date.now(),
      recreateSwap: { applies: () => true, busy: () => false, claim: async () => 'lock', check: async () => ({ result: 'uncertain', reason: 'changed_not_like_photo' }),
        markFailed: async (_id, reason) => { calls.push('failed:' + reason); return true }, setRefunded: async () => {}, markDone: async () => { calls.push('swapDone'); return true },
        record: async (_r, v, o) => { calls.push('record:' + v.result + ':' + o.delivered) }, keepRejected: async () => { calls.push('keep'); return null } },
    }
    const r = await flow.settleClip(deps, row)
    if (r.status !== 'failed' || r.failure_reason !== 'swap_uncertain' || r.credits_refunded !== 40) throw new Error(JSON.stringify(r))
    if (calls.includes('persist') || calls.includes('swapDone') || !calls.includes('failed:swap_uncertain') || !calls.includes('keep') || !calls.includes('record:uncertain:false')) throw new Error(calls.join(' | '))
    const S = carregar(src, {})
    if (!S.isRecreateNotSwappedReason('swap_uncertain') || !S.SWAP_REFUND_SWEEP_REASONS.includes('swap_uncertain')) throw new Error('a tela e a varredura de estornos não conhecem o motivo')
  })
  await check('o evento grava instantes, alvo, pares e regra', async () => {
    const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
    if (!s.includes('instants: v.instants ?? null, subjects: v.subjects ?? null, pairs_used: v.pairs_used ?? null, rule: v.rule ?? null,')) throw new Error('evento')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const sc = lf(SC), flowSrc = lf(FLOW), srv = lf(SRV)
const mutantes = [
  ['swapped sem parecer a foto (o defeito)', { [SC]: sc.replace('const swapped = persons.filter(p => p.same_as_base === false && p.matches_photo === true).length', 'const swapped = persons.filter(p => p.same_as_base === false).length') }],
  ['Kling volta à regra antiga', { [SC]: sc.replace("    if (row.model === KLING4_EDIT_MODEL && ctx.formatId === 'seu-video' && ctx.baseVideoUrl) return checarComAlvo(ctx, providerVideoUrl, opts, verdict, unverified)", '    void checarComAlvo') }],
  ['juiz sem o alvo do pedido', { [SC]: sc.replace('  const alvos = alvosDoPedido(ctx.prompt, ctx.slots)\n', '  const alvos: Array<string | null> = Array.from({ length: ctx.slots }, () => null)\n') }],
  ['instantes por proporção', { [SC]: sc.replace('extractInstantFrames(providerVideoUrl, opts, intervaloPara(passo, mr?.fps ?? mb.fps), n)', 'extractInstantFrames(providerVideoUrl, opts, intervaloPara((mr?.segundos ?? mb.segundos) * TRAVA_INSTANTES[0], mr?.fps ?? mb.fps), n)') }],
  ['só 2 instantes', { [SC]: sc.replace('export const TRAVA_INSTANTES = [0.2, 0.4, 0.6, 0.8] as const', 'export const TRAVA_INSTANTES = [0.35, 0.7] as const') }],
  ['pares fora de ordem', { [SC]: sc.replace('...pares.flatMap(p => [img(p.base, \'high\'), img(p.result, \'high\')])', "...pares.map(p => img(p.base, 'high')), ...pares.map(p => img(p.result, 'high'))") }],
  ['óculos voltam a decidir', { [SC]: sc.replace("as Record<string, unknown> | undefined, k, TRAVA_ATRIBUTOS_DO_ALVO))", 'as Record<string, unknown> | undefined, k))') }],
  ['juiz sem o aviso dos óculos', { [SC]: sc.replace("'NOT a reason to say the edited target does not resemble the reference photo. Compare only the face, hair and beard of the target: hair colour, ' +", "'Compare the target: hair colour, ' +") }],
  ['uncertain entrega', { [FLOW]: flowSrc.replace(" || swapVerdict.result === 'uncertain') { // KINEO-RECREATE-TRAVA-1011", ') { // KINEO-RECREATE-TRAVA-1011') }],
  ['evento sem os instantes', { [SRV]: srv.replace('instants: v.instants ?? null, ', '') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS trava com alvo: f2bd4efe = uncertain (não entrega, estorno); ae3edf15 = swapped; alvo do pedido no juiz; 4 pares por tempo absoluto; instantes, alvo, pares e regra no veredito e no evento; Seedance e catálogo como antes; ${mortos}/${mutantes.length} mutantes mortos`)
