// KINEO-ROSTO-NO-CLIPE-2810 — guardião do "Put your face in it" [TRAVA 8.2 — vai do fundador 28/10 "A" (botão geral "coloque seu
// rosto neste clipe")]. Prova: (A) o catálogo tem a Golden Ball Dance (1º item de pessoa) e o lobisomem com faceScene, com prévia e
// pôster no disco; (B) só item `person: true` ganha botão (galeria, faixa da home e GET); (C) o SERVIDOR monta o prompt pelo
// catálogo — prompt/motor/duração/formato do navegador são ignorados; (D) foto e consentimento obrigatórios, interruptor antes de
// tudo; (E) o pedido resolvido é um clipe comum (validateClipRequest: image-to-video do Kling 3, foto da própria conta) e segue o
// ÚNICO submitClip da rota (mesmo débito/estorno/moderação), com o evento só no pedido aceito e novo; (F) a tela manda só id + foto
// + consentimento e o preço mora só no botão; (P) interruptor DESLIGADO desde 28/10 (teste pago: identidade perdida e 1º quadro =
// a foto) — nenhum botão público, a casa segue com /clips?remix=<id>; (M) mutantes ficam vermelhos.
// KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q) DUAS ETAPAS, EXECUTADAS (lib/clips/clipFlow.ts submitClip/settleClip com dependências falsas):
// o pedido do remix cobra 10 e manda a etapa 1 ao fal-ai/nano-banana-pro/edit (recorte do rosto primeiro, foto depois; nunca o
// Kling); quadro-chave falhou → estorno dos 10 e o motor de vídeo NUNCA é chamado (evento com as duas etapas); quadro-chave pronto
// → persistido no NOSSO bucket → reserva condicional (um ator) → Kling i2v parte do quadro-chave NOSSO (nunca da URL da fal) →
// evento keyframe:'done'/video:'submitted'; vídeo entregue → face_remix_ready; recorte de outra conta = 403 sem custo; `remix` que
// não bate com o catálogo = 400 sem custo; preço 10 em todo lugar (botão, GET, débito); a fiação real (clipServer) e o /images
// (403 da fal vira alarme de saldo + 503, não "falhou" genérico). Prompts sem gênero fixo.
// Rodar: node scripts/test-rosto-no-clipe-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = 'KINEO-ROSTO-NO-CLIPE-2810'
const MARCA_Q = 'KINEO-ROSTO-QUADRO-CHAVE-2810' // KINEO-ROSTO-QUADRO-CHAVE-2810
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
console.warn = () => {} // KINEO-ROSTO-QUADRO-CHAVE-2810 — o clipFlow avisa a falha do fornecedor no log; aqui ela é simulada

const F = {
  remix: 'lib/clips/faceRemix.ts',
  galeria: 'lib/homeGaleria.ts',
  items: 'lib/homeGaleriaItems.ts',
  route: 'app/api/clips/route.ts',
  gallery: 'components/KineoHouseGallery.tsx',
  strip: 'components/home/HomeClipsStrip.tsx',
  client: 'app/(dashboard)/clips/ClipsClient.tsx',
  flow: 'lib/clips/clipFlow.ts', // KINEO-ROSTO-QUADRO-CHAVE-2810
  server: 'lib/clips/clipServer.ts', // KINEO-ROSTO-QUADRO-CHAVE-2810
  images: 'app/api/images/generate/route.ts', // KINEO-ROSTO-QUADRO-CHAVE-2810
}

/** Carrega um módulo TS puro (imports ./, ../ e @/); `over` troca a fonte de arquivos (mutantes). */
function load(entry, over = {}) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./') || name.startsWith('../')) return loadTs(path.posix.normalize(path.posix.join(path.posix.dirname(rel), name)) + '.ts')
      if (name.startsWith('@/')) return loadTs(name.slice(2) + '.ts')
      throw new Error(`${rel}: import inesperado ${name}`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return loadTs(entry)
}

const U = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://abc.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg`
const FACE = `${SUPA}/storage/v1/object/public/avatars/${U}/face.jpg` // KINEO-ROSTO-QUADRO-CHAVE-2810
const FACE_ALHEIO = `${SUPA}/storage/v1/object/public/avatars/99999999-2222-3333-4444-555555555555/face.jpg` // KINEO-ROSTO-QUADRO-CHAVE-2810
const FAL_KF = 'https://v3.fal.media/files/x/keyframe.png' // KINEO-ROSTO-QUADRO-CHAVE-2810
const OURS_KF = `${SUPA}/storage/v1/object/public/renders/clips/${U}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-keyframe.png` // KINEO-ROSTO-QUADRO-CHAVE-2810
const KEY = 'clip-ui-remix-0001'

// KINEO-ROSTO-QUADRO-CHAVE-2810 — dependências falsas do submitClip (saldo 100, moderação ok, fal aceita).
function fakeSubmitDeps(st) {
  return {
    supabaseUrl: SUPA,
    engineAccess: () => ({ ok: true }),
    findByKey: async () => null,
    countActive: async () => 0,
    verifyImage: async (u) => { st.verified.push(u) },
    moderate: async ({ text, imageUrls }) => { st.moderated.push({ text, imageUrls }); return { ok: true } },
    getBalance: async () => 100,
    newId: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    insertPending: async (row) => { st.rows.push(row); return { ok: true } },
    debit: async (ref, credits) => { st.debits.push([ref, credits]); return { ok: true, balance: 90 } },
    refund: async (ref) => { st.refunds.push(ref); return 10 },
    submit: async (model, input) => { st.submits.push({ model, input }); return st.submitResult ?? { ok: true, requestId: 'req-kf-1' } },
    markSubmitted: async () => true,
    markFailed: async (id, reason, refunded) => { st.failed.push({ id, reason, refunded }); return true },
    event: async (name, md) => { st.events.push({ name, md }) },
    now: () => Date.parse('2026-10-28T12:00:00Z'),
  }
}
// KINEO-ROSTO-QUADRO-CHAVE-2810 — dependências falsas do settleClip (+ os fios da etapa 2).
function fakeSettleDeps(st, cat, o = {}) {
  return {
    poll: async (model, rid) => { st.polls.push({ model, rid }); return st.pollResult },
    persist: async (_row, url) => { st.persisted.push(url); return `${SUPA}/storage/v1/object/public/renders/clips/${U}/x.mp4` },
    refund: async (ref) => { st.refunds.push(ref); return 10 },
    markDone: async (_id, url) => { st.done.push(url); return true },
    markFailed: async (_id, reason, refunded) => { st.failed.push({ reason, refunded }); return true },
    event: async (name, md) => { st.events.push({ name, md }) },
    now: () => Date.parse('2026-10-28T12:01:00Z'),
    ...(o.noKeyframe ? {} : {
      keyframe: {
        persist: async (_row, url) => { st.kfPersisted.push(url); if (st.persistThrows) throw new Error('bucket down'); return OURS_KF },
        claim: async (_row, vm) => { st.claims.push(vm); return st.claimResult ?? true },
        submitVideo: async (_row, vm, kf) => { st.videoSubmits.push({ vm, kf }); return st.videoResult ?? { ok: true, requestId: 'req-video-1' } },
        markVideoSubmitted: async (_id, vm, rid) => { st.marked.push({ vm, rid }); return true },
        videoModel: () => cat.CLIP_ENGINES.hollywood.i2vModel,
      },
    }),
  }
}
const estado = () => ({ verified: [], moderated: [], rows: [], debits: [], refunds: [], submits: [], failed: [], events: [], polls: [], persisted: [], done: [], kfPersisted: [], claims: [], videoSubmits: [], marked: [] })

/** Todas as provas sobre um conjunto de fontes; devolve a lista de erros (vazia = verde). */
async function checa(over = {}) {
  const e = []
  const src = (k) => over[F[k]] ?? read(F[k])
  let fr, gal, cat, flow
  try {
    fr = load(F.remix, over)
    gal = load(F.galeria, over)
    cat = load('lib/clips/clipCatalog.ts', over)
    flow = load(F.flow, over) // KINEO-ROSTO-QUADRO-CHAVE-2810
  } catch (err) { return ['módulo não carrega: ' + err.message] }

  // (A) catálogo
  const gb = gal.GALERIA_NEW_CLIPS?.find((c) => c.id === 'golden-ball')
  if (!gb) e.push('Golden Ball Dance fora do catálogo')
  else {
    if (gb.title !== 'Golden Ball Dance') e.push('título da Golden Ball ≠ "Golden Ball Dance"')
    if (gb.engine !== 'hollywood') e.push('Golden Ball fora do Kling 3')
    if (gb.person !== true) e.push('Golden Ball sem person:true')
    for (const p of [gb.video, gb.poster]) if (!p || !fs.existsSync(path.join(ROOT, 'public', p))) e.push('Golden Ball sem arquivo ' + p)
    if (!/golden ball trophy/.test(gb.prompt) || !/no watermark\.$/.test(gb.prompt)) e.push('prompt da Golden Ball não é o da tabela clips')
    // KINEO-ROSTO-QUADRO-CHAVE-2810 — os figurantes da faceScene são pessoas visivelmente diferentes (zero clones nos 3 testes de 28/10)
    if (!/older bald man in plain pink pajamas and a woman with long curly red hair/.test(gb.face?.extras ?? '')) e.push('extras da Golden Ball sem os figurantes descritos como pessoas diferentes')
    if (!/golden football trophy \(a golden soccer ball on a short base\)/.test(gb.face?.keyframeScene ?? '')) e.push('Golden Ball ainda diz "golden ball trophy" (virou Globo de Ouro num teste)')
    if (gb.face?.framing !== 'medium' || gb.face?.maxPeople !== 4) e.push('modelo da Golden Ball: plano médio para 1 pessoa, até 4 pessoas')
  }
  const ww = gal.GALERIA_NEW_CLIPS?.find((c) => c.id === 'werewolf')
  if (!ww || ww.person !== true || !/person from the photo/i.test(ww.face?.keyframeScene ?? '') || ww.face?.extras !== '' || ww.face?.maxPeople !== 1) e.push('lobisomem sem person:true + modelo (keyframeScene com a pessoa da foto, sem figurantes, 1 pessoa)')
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — todo modelo tem a mesma forma (tendência nova = uma entrada, nenhum código): 2 textos sem gênero, plano, figurantes, pessoas
  for (const c of gal.GALERIA_NEW_CLIPS.filter((x) => x.person === true)) {
    const f = c.face
    if (!f || typeof f.keyframeScene !== 'string' || f.keyframeScene.length < 40 || typeof f.motionPrompt !== 'string' || f.motionPrompt.length < 20 || !['medium', 'knees-up'].includes(f.framing) || typeof f.extras !== 'string' || ![1, 2, 3, 4].includes(f.maxPeople)) { e.push(c.id + ': modelo de rosto fora da forma {keyframeScene, motionPrompt, framing, extras, maxPeople}'); continue }
    if (!/the person from the photo/.test(f.keyframeScene) || !/the person from the photo/i.test(f.motionPrompt)) e.push(c.id + ': modelo não fala em "the person from the photo"')
    for (const txt of [f.keyframeScene, f.motionPrompt]) if (/\b(man|woman|his|her|he|she|guy|girl)\b/i.test(txt)) e.push(c.id + ': modelo com gênero fixo')
    for (const txt of [f.keyframeScene, f.motionPrompt, f.extras]) if (/no text|no logos|exactly two arms|do not beautify|medium shot/i.test(txt)) e.push(c.id + ': modelo repete o que o código cola (sufixo/identidade/mãos/plano)')
  }

  // (B) só item de pessoa tem botão
  const items = fr.faceRemixItems?.() ?? []
  const pessoas = gal.GALERIA_NEW_CLIPS.filter((c) => c.person === true && !gal.GALERIA_EXCLUDED.includes(c.id)).map((c) => c.id)
  if (JSON.stringify(items.map((i) => i.id)) !== JSON.stringify(pessoas)) e.push(`itens do remix ≠ itens de pessoa: ${items.map((i) => i.id)}`)
  for (const c of gal.GALERIA_NEW_CLIPS) if (c.person !== true && fr.hasFaceRemix(c.id, true)) e.push(`${c.id}: sem pessoa e com botão (interruptor ligado)`)
  if (!fr.hasFaceRemix('golden-ball', true)) e.push('Golden Ball sem botão com o interruptor ligado')

  // (P) KINEO-ROSTO-NO-CLIPE-2810 — interruptor DESLIGADO (teste pago 28/10: rosto de outra pessoa na festa + abre na foto do
  // parque com corte seco). Nenhum botão público (galeria e faixa perguntam a hasFaceRemix); a casa segue com /clips?remix=<id>.
  if (fr.FACE_REMIX_PUBLIC !== false) e.push('FACE_REMIX_PUBLIC ligado antes da validação da etapa de quadro-chave em produção')
  for (const c of gal.GALERIA_NEW_CLIPS) if (fr.hasFaceRemix(c.id)) e.push(`${c.id}: botão público com o interruptor desligado`)
  if (fr.faceRemixVisible(false) !== false) e.push('conta comum/visitante vê o remix com o interruptor desligado')
  if (fr.faceRemixVisible(true) !== true) e.push('conta da casa perdeu o remix')
  if (fr.faceRemixVisible(false, true) !== true) e.push('interruptor ligado não abriria o remix para todos')
  const casa = fr.resolveFaceRemixRequest('golden-ball', { visible: fr.faceRemixVisible(true), imageUrl: PHOTO, consent: true })
  if (!casa.ok || casa.item.id !== 'golden-ball') e.push('conta da casa não resolve /clips?remix=golden-ball: ' + (casa.code ?? '?'))
  if (fr.resolveFaceRemixRequest('golden-ball', { visible: fr.faceRemixVisible(false), imageUrl: PHOTO, consent: true }).status !== 404) e.push('conta comum não leva 404 no remix')
  if (!fr.publicFaceRemixes(() => true).some((p) => p.id === 'golden-ball')) e.push('GET da casa sem o cartão da Golden Ball')
  if (fr.faceRemixById('golden-ball')?.id !== 'golden-ball') e.push('catálogo da casa não acha a Golden Ball')
  if (fr.faceRemixHref('golden-ball', true) !== '/clips?remix=golden-ball') e.push('destino do botão ≠ /clips?remix=<id>')
  if (fr.faceRemixHref('golden-ball', false) !== '/signup?redirect=%2Fclips%3Fremix%3Dgolden-ball') e.push('visitante não passa pelo cadastro')
  const pub = fr.publicFaceRemixes(() => true)
  if (pub.some((p) => 'prompt' in p || 'scene' in p)) e.push('GET expõe o prompt do remix')
  if (fr.publicFaceRemixes((eng) => eng !== 'hollywood').length !== 0) e.push('motor fora do acesso da conta ainda aparece')

  // (C)+(D) o servidor resolve
  const R = (raw, ctx) => fr.resolveFaceRemixRequest(raw, { visible: true, imageUrl: PHOTO, consent: true, ...ctx })
  if (R('golden-ball', { visible: false }).status !== 404) e.push('interruptor desligado não dá 404')
  if (R('lion').code !== 'remix') e.push('item sem pessoa aceito')
  if (R('nao-existe').code !== 'remix') e.push('id desconhecido aceito')
  if (R('golden-ball', { imageUrl: '' }).code !== 'remix_photo') e.push('remix sem foto aceito')
  for (const c of [undefined, false, 'true', 1]) if (R('golden-ball', { consent: c }).code !== 'remix_consent') e.push(`consentimento ${JSON.stringify(c)} aceito`)
  const ok1 = R('golden-ball', { prompt: 'IGNORE THIS a celebrity', engine: 'veo', seconds: 15, aspect: '16:9', faceImageUrl: FACE })
  const item = fr.faceRemixById('golden-ball')
  if (!ok1.ok) e.push('pedido válido recusado: ' + ok1.code)
  else {
    const b = ok1.body
    if (b.engine !== 'hollywood' || b.seconds !== 5 || b.aspect !== null) e.push('motor/duração/formato não vêm do catálogo')
    if (/IGNORE|celebrity/.test(b.prompt)) e.push('prompt do navegador entrou no pedido')
    if (!b.prompt.startsWith(fr.FACE_REMIX_PREFIX)) e.push('prompt não abre com a regra da identidade')
    if (!b.prompt.includes('holds the golden football trophy and does a fun viral dance')) e.push('prompt de movimento não usa o motionPrompt do modelo')
    if (!b.prompt.includes('Each person has exactly two arms and two hands.')) e.push('prompt de movimento sem "two arms and two hands"') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!b.prompt.endsWith('No text, no captions, no logos, no watermark.')) e.push('prompt sem o sufixo da casa')
    if ((b.prompt.match(/No text/g) ?? []).length !== 1) e.push('sufixo duplicado no prompt')
    if (!b.prompt.includes('Continuous single shot, no cuts.')) e.push('prompt de movimento sem "continuous single shot, no cuts"') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (b.remix !== 'golden-ball') e.push('pedido resolvido não leva o id do remix para o submitClip') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (b.faceImageUrl !== FACE) e.push('pedido resolvido perdeu o recorte do rosto') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (R('golden-ball').body.faceImageUrl !== null) e.push('sem recorte, faceImageUrl deveria ser null') // KINEO-ROSTO-QUADRO-CHAVE-2810
    // (E) é um clipe comum: image-to-video do Kling 3, foto da própria conta
    const v = cat.validateClipRequest(b, { userId: U, supabaseUrl: SUPA })
    if (!v.ok || v.request.mode !== 'i2v' || v.request.model !== cat.CLIP_ENGINES.hollywood.i2vModel || v.request.prompt !== b.prompt) e.push('o pedido resolvido não passa como clipe comum de foto')
    const alheia = cat.validateClipRequest({ ...b, imageUrl: `${SUPA}/storage/v1/object/public/avatars/99999999-2222-3333-4444-555555555555/f.jpg` }, { userId: U, supabaseUrl: SUPA })
    if (alheia.ok) e.push('foto de outra conta passou')
    // KINEO-ROSTO-QUADRO-CHAVE-2810 — preço: 10 (fundador), igual no cartão do GET, e custo fal das duas etapas
    if (fr.FACE_REMIX_CREDITS !== 10) e.push(`FACE_REMIX_CREDITS ≠ 10 (${fr.FACE_REMIX_CREDITS})`)
    if (fr.faceRemixCredits(item) !== 10) e.push('faceRemixCredits ≠ 10')
    if (pub.find((p) => p.id === 'golden-ball')?.credits !== 10) e.push('cartão do GET não mostra 10 créditos')
    if (fr.faceRemixFalUsd(item) !== 0.71) e.push(`custo fal do remix ≠ 0,71 (${fr.faceRemixFalUsd(item)})`)
    if (10 * 0.1327 * (1 - 0.40) < fr.faceRemixFalUsd(item)) e.push('margem do remix abaixo de 40% no crédito do Creator mensal')
    if (fr.faceRemixForRow({ prompt: b.prompt, engine: 'hollywood', seconds: 5, mode: 'image' })?.id !== 'golden-ball') e.push('a linha do remix não volta ao item')
    if (fr.faceRemixStageForRow({ prompt: b.prompt, engine: 'hollywood', seconds: 5, mode: 'image', model: fr.FACE_REMIX_KEYFRAME_MODEL }) !== 'keyframe') e.push('etapa 1 não reconhecida pelo modelo da linha') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (fr.faceRemixStageForRow({ prompt: b.prompt, engine: 'hollywood', seconds: 5, mode: 'image', model: cat.CLIP_ENGINES.hollywood.i2vModel }) !== 'video') e.push('etapa 2 não reconhecida') // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (fr.faceRemixStageForRow({ prompt: 'livre', engine: 'hollywood', seconds: 5, mode: 'image', model: fr.FACE_REMIX_KEYFRAME_MODEL }) !== null) e.push('clipe livre reconhecido como remix') // KINEO-ROSTO-QUADRO-CHAVE-2810
  }
  for (const i of items) if (fr.faceRemixPrompt(i).length > cat.CLIP_PROMPT_MAX) e.push(`${i.id}: prompt acima do teto do clipe`)

  // KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q0) o quadro-chave: endpoint, corpo e prompt (plano médio, identidade genérica sem gênero, figurantes diferentes)
  if (fr.FACE_REMIX_KEYFRAME_MODEL !== 'fal-ai/nano-banana-pro/edit') e.push('etapa 1 fora do fal-ai/nano-banana-pro/edit')
  if (!item) e.push('Golden Ball fora do catálogo do remix')
  const kf2 = item ? fr.faceRemixKeyframeInput(item, PHOTO, FACE) : { prompt: '', image_urls: [] }
  if (JSON.stringify(kf2.image_urls) !== JSON.stringify([FACE, PHOTO])) e.push('recorte do rosto não vai PRIMEIRO em image_urls')
  if (kf2.aspect_ratio !== '9:16' || kf2.num_images !== 1 || kf2.resolution !== '1K') e.push('corpo do quadro-chave fora do schema (9:16, 1 imagem, 1K)')
  if (item && JSON.stringify(fr.faceRemixKeyframeInput(item, PHOTO).image_urls) !== JSON.stringify([PHOTO])) e.push('sem recorte, image_urls deveria ser só a foto')
  const kp = String(kf2.prompt)
  if (!/MEDIUM SHOT from the waist up/.test(kp)) e.push('quadro-chave sem plano médio')
  if (!kp.includes('Reference image 1 is a close crop')) e.push('quadro-chave com 2 referências não explica qual é o recorte')
  if (!kp.includes('same face shape, eyes, eyebrows, nose, lips, hairline, beard and skin texture; same age; do not beautify')) e.push('quadro-chave sem a frase de identidade validada')
  if (!kp.includes('visibly DIFFERENT person')) e.push('quadro-chave sem a regra anti-clone dos figurantes')
  if (!kp.includes('the person from the photo, in a plain black tuxedo and bow tie')) e.push('quadro-chave sem o keyframeScene do modelo')
  if (!kp.includes('Also in the scene: two friends behind')) e.push('quadro-chave sem os figurantes do modelo')
  if (!kp.includes('Each person has exactly two arms and two hands')) e.push('quadro-chave sem "two arms and two hands"')
  if (item && fr.faceRemixById('werewolf') && fr.faceRemixKeyframePrompt(fr.faceRemixById('werewolf')).includes('Also in the scene')) e.push('modelo sem figurantes ganhou a frase de figurantes')
  if (!fr.faceRemixFraming('knees-up').startsWith('KNEES-UP SHOT')) e.push('plano de grupo (knees-up) não existe')
  if (!kp.endsWith(fr.FACE_REMIX_SUFFIX)) e.push('quadro-chave sem o sufixo da casa')
  if (kp.length > 2000) e.push('quadro-chave acima de 2000 caracteres')
  for (const txt of [fr.FACE_REMIX_PREFIX, fr.FACE_REMIX_IDENTITY, fr.FACE_REMIX_FRAMING, fr.FACE_REMIX_NO_CLONES]) if (/\b(man|woman|his|her|he|she)\b/i.test(txt)) e.push('prompt genérico com gênero fixo: ' + txt.slice(0, 40))
  if (item && fr.faceRemixVideoModel(item) !== cat.CLIP_ENGINES.hollywood.i2vModel) e.push('modelo da etapa 2 ≠ i2v do Kling 3')
  if (fr.faceRemixKeyframePath(U, 'abc') !== `clips/${U}/abc-keyframe.png`) e.push('caminho do quadro-chave não é determinístico em clips/<uid>/<id>-keyframe.png')
  if (fr.FACE_REMIX_FACE_SWAP_MODEL !== null) e.push('etapa 1b (troca de rosto) ligada sem modelo confiável/validado')

  // KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q1) submitClip EXECUTADO: cobra 10, manda a etapa 1 (edit, recorte + foto), NUNCA o Kling
  if (ok1.ok) {
    const st = estado()
    const r = await flow.submitClip(fakeSubmitDeps(st), { userId: U, idempotencyKey: KEY, body: ok1.body })
    if (!r.ok || r.status !== 202) e.push('pedido do remix recusado: ' + (r.code ?? r.status))
    if (JSON.stringify(st.debits.map((d) => d[1])) !== '[10]') e.push(`débito do remix ≠ [10]: ${JSON.stringify(st.debits)}`)
    if (st.submits.length !== 1 || st.submits[0].model !== fr.FACE_REMIX_KEYFRAME_MODEL) e.push('etapa 1 não foi ao nano-banana edit (ou houve mais de um envio)')
    if (st.submits.some((s) => /kling/.test(s.model))) e.push('o Kling foi chamado no pedido (antes do quadro-chave)')
    if (JSON.stringify(st.submits[0]?.input?.image_urls) !== JSON.stringify([FACE, PHOTO])) e.push('etapa 1 sem recorte + foto nesta ordem')
    if (st.rows[0]?.model !== fr.FACE_REMIX_KEYFRAME_MODEL) e.push('linha do remix não nasce na etapa 1 (model)')
    if (st.rows[0]?.credits !== 10 || st.rows[0]?.fal_usd !== 0.71) e.push('linha do remix com créditos/custo errados')
    if (st.rows[0]?.image_url !== PHOTO) e.push('linha do remix perdeu a foto original')
    if (!st.verified.includes(FACE) || !st.moderated[0]?.imageUrls.includes(FACE)) e.push('recorte do rosto não passou por bytes + moderação')
    if (r.ok && (r.clip.credits !== 10)) e.push('resposta do pedido não diz 10 créditos')
    // recorte de OUTRA conta: 403 sem custo
    const st2 = estado()
    const r2 = await flow.submitClip(fakeSubmitDeps(st2), { userId: U, idempotencyKey: KEY, body: { ...ok1.body, faceImageUrl: FACE_ALHEIO } })
    if (r2.ok || r2.status !== 403 || st2.debits.length || st2.submits.length) e.push('recorte de outra conta não dá 403 sem custo')
    // `remix` que não bate com o catálogo (prompt adulterado / id trocado): 400 sem custo
    const st3 = estado()
    const r3 = await flow.submitClip(fakeSubmitDeps(st3), { userId: U, idempotencyKey: KEY, body: { ...ok1.body, prompt: ok1.body.prompt + ' hacked' } })
    if (r3.ok || r3.code !== 'remix' || st3.debits.length) e.push('remix com prompt adulterado passou')
    const st4 = estado()
    const r4 = await flow.submitClip(fakeSubmitDeps(st4), { userId: U, idempotencyKey: KEY, body: { ...ok1.body, remix: 'lion' } })
    if (r4.ok || r4.code !== 'remix' || st4.debits.length) e.push('remix com id de item sem pessoa passou')
    // sem recorte: segue só com a foto
    const st5 = estado()
    const r5 = await flow.submitClip(fakeSubmitDeps(st5), { userId: U, idempotencyKey: KEY, body: { ...ok1.body, faceImageUrl: null } })
    if (!r5.ok || JSON.stringify(st5.submits[0]?.input?.image_urls) !== JSON.stringify([PHOTO])) e.push('sem recorte, a etapa 1 não vai só com a foto')
    // clipe comum com foto não muda: i2v do motor, preço do catálogo
    const st6 = estado()
    const r6 = await flow.submitClip(fakeSubmitDeps(st6), { userId: U, idempotencyKey: KEY, body: { engine: 'hollywood', seconds: 5, aspect: null, prompt: 'subtle motion', imageUrl: PHOTO } })
    if (!r6.ok || st6.submits[0]?.model !== cat.CLIP_ENGINES.hollywood.i2vModel || st6.debits[0]?.[1] === 10) e.push('clipe comum de foto mudou com a entrega do remix')

    // (Q2) settleClip EXECUTADO — a etapa 1 falhou: estorno dos 10, Kling nunca chamado, evento com as duas etapas
    const rowKf = { ...st.rows[0], status: 'processing', fal_request_id: 'req-kf-1' }
    const s1 = estado(); s1.pollResult = { state: 'failed', error: 'fal 422 no face found' }
    const a1 = await flow.settleClip(fakeSettleDeps(s1, cat), rowKf)
    if (a1.status !== 'failed' || a1.failure_reason !== 'keyframe_failed') e.push('quadro-chave falhou e a linha não fechou como keyframe_failed')
    if (s1.refunds.length !== 1 || s1.failed[0]?.refunded !== 10) e.push('quadro-chave falhou sem estorno dos 10')
    if (s1.videoSubmits.length || s1.claims.length) e.push('quadro-chave falhou e o Kling foi chamado')
    const ev1 = s1.events.find((x) => x.name === 'clip_failed')
    if (!ev1 || ev1.md.keyframe !== 'failed' || ev1.md.video !== 'skipped' || ev1.md.remix !== 'golden-ball' || !/no face/.test(ev1.md.provider_error ?? '')) e.push('clip_failed da etapa 1 sem as duas etapas (keyframe:failed, video:skipped) + motivo')
    // quadro-chave pronto: persistido, reservado, Kling parte do NOSSO quadro-chave, request_id gravado, evento
    const s2 = estado(); s2.pollResult = { state: 'done', url: FAL_KF }
    const a2 = await flow.settleClip(fakeSettleDeps(s2, cat), rowKf)
    if (JSON.stringify(s2.kfPersisted) !== JSON.stringify([FAL_KF])) e.push('quadro-chave pronto não foi persistido no nosso bucket')
    if (s2.claims.length !== 1 || s2.claims[0] !== cat.CLIP_ENGINES.hollywood.i2vModel) e.push('etapa 2 sem reserva condicional (claim)')
    if (s2.videoSubmits.length !== 1 || s2.videoSubmits[0].kf !== OURS_KF || s2.videoSubmits[0].vm !== cat.CLIP_ENGINES.hollywood.i2vModel) e.push('Kling não partiu do quadro-chave NOSSO (ou modelo errado)')
    if (s2.marked.length !== 1 || s2.marked[0].rid !== 'req-video-1') e.push('request_id da etapa 2 não gravado')
    if (s2.persisted.length || s2.done.length || s2.refunds.length) e.push('quadro-chave pronto marcou done/persistiu vídeo/estornou')
    if (a2.model !== cat.CLIP_ENGINES.hollywood.i2vModel || a2.fal_request_id !== 'req-video-1' || a2.status !== 'processing') e.push('linha devolvida não está na etapa 2')
    const ev2 = s2.events.find((x) => x.name === 'face_remix_keyframe')
    if (!ev2 || ev2.md.keyframe !== 'done' || ev2.md.video !== 'submitted' || ev2.md.id !== 'golden-ball') e.push('evento face_remix_keyframe sem keyframe:done/video:submitted')
    // reserva perdida (outro ator): nada enviado, linha como estava
    const s3 = estado(); s3.pollResult = { state: 'done', url: FAL_KF }; s3.claimResult = false
    const a3 = await flow.settleClip(fakeSettleDeps(s3, cat), rowKf)
    if (s3.videoSubmits.length || s3.marked.length || a3 !== rowKf) e.push('reserva perdida e mesmo assim o Kling foi chamado (dois atores = dois POSTs pagos)')
    // persistência falhou (nova): espera, sem envio nem estorno
    const s4 = estado(); s4.pollResult = { state: 'done', url: FAL_KF }; s4.persistThrows = true
    const a4 = await flow.settleClip(fakeSettleDeps(s4, cat), rowKf)
    if (s4.videoSubmits.length || s4.refunds.length || a4.status !== 'processing' || a4.model !== fr.FACE_REMIX_KEYFRAME_MODEL) e.push('quadro-chave sem persistir e o Kling foi chamado (ou estornou cedo)')
    // Kling recusou a etapa 2: estorno dos 10, evento keyframe:done/video:rejected
    const s5 = estado(); s5.pollResult = { state: 'done', url: FAL_KF }; s5.videoResult = { ok: false, ambiguous: false, error: 'fal 422 bad image' }
    const a5 = await flow.settleClip(fakeSettleDeps(s5, cat), rowKf)
    if (a5.status !== 'failed' || a5.failure_reason !== 'provider_rejected' || s5.refunds.length !== 1) e.push('Kling recusou e não estornou os 10')
    const ev5 = s5.events.find((x) => x.name === 'clip_failed')
    if (!ev5 || ev5.md.keyframe !== 'done' || ev5.md.video !== 'rejected') e.push('clip_failed da etapa 2 (recusa) sem keyframe:done/video:rejected')
    // sem os fios da etapa 2 (caminho antigo): espera, nunca marca pronto com o quadro-chave
    const s6 = estado(); s6.pollResult = { state: 'done', url: FAL_KF }
    const a6 = await flow.settleClip(fakeSettleDeps(s6, cat, { noKeyframe: true }), rowKf)
    if (s6.done.length || s6.persisted.length || a6.status !== 'processing') e.push('sem os fios da etapa 2 a linha virou done com um PNG')
    // etapa 2 entregue: vídeo persistido, done, clip_delivered + face_remix_ready
    const rowVid = { ...rowKf, model: cat.CLIP_ENGINES.hollywood.i2vModel, fal_request_id: 'req-video-1' }
    const s7 = estado(); s7.pollResult = { state: 'done', url: 'https://v3.fal.media/files/x/out.mp4' }
    const a7 = await flow.settleClip(fakeSettleDeps(s7, cat), rowVid)
    if (a7.status !== 'done' || s7.done.length !== 1 || s7.kfPersisted.length || s7.videoSubmits.length) e.push('etapa 2 entregue não fechou como done (ou repetiu a etapa 1)')
    const ev7 = s7.events.find((x) => x.name === 'face_remix_ready')
    if (!ev7 || ev7.md.keyframe !== 'done' || ev7.md.video !== 'delivered' || !s7.events.some((x) => x.name === 'clip_delivered')) e.push('vídeo entregue sem face_remix_ready (keyframe:done, video:delivered)')
    // etapa 2 falhou no fornecedor: keyframe:done/video:failed
    const s8 = estado(); s8.pollResult = { state: 'failed', error: 'fal 500' }
    await flow.settleClip(fakeSettleDeps(s8, cat), rowVid)
    const ev8 = s8.events.find((x) => x.name === 'clip_failed')
    if (!ev8 || ev8.md.keyframe !== 'done' || ev8.md.video !== 'failed' || s8.refunds.length !== 1) e.push('falha da etapa 2 sem keyframe:done/video:failed + estorno')
    // clipe comum entregue: nenhum evento do remix
    const s9 = estado(); s9.pollResult = { state: 'done', url: 'https://v3.fal.media/files/x/out.mp4' }
    await flow.settleClip(fakeSettleDeps(s9, cat), { ...rowVid, prompt: 'subtle motion' })
    if (s9.events.some((x) => /face_remix/.test(x.name))) e.push('clipe comum gerou evento do remix')
  }

  // (E) a rota: remix resolvido ANTES da conta, mesmo submitClip, evento só no aceito e novo
  const route = src('route')
  const iRemix = route.indexOf('resolveFaceRemixRequest(body.remix, {')
  const iConta = route.indexOf('const account = await loadClipAccount(supabase, user)', route.indexOf('export async function POST'))
  if (iRemix < 0 || iConta < 0 || iRemix > iConta) e.push('rota não resolve o remix antes de ler conta/saldo')
  if (!/resolveFaceRemixRequest\(body\.remix, \{ visible: faceRemixVisible\(isInternalEmail\(user\.email\)\), imageUrl: body\.image_url \?\? body\.imageUrl, consent: body\.consent, faceImageUrl: body\.face_image_url \}\)/.test(route)) e.push('rota não passa interruptor/foto/consentimento/recorte ao resolvedor') // KINEO-ROSTO-QUADRO-CHAVE-2810 — + face_image_url
  if ((route.match(/await submitClip\(/g) ?? []).length !== 1) e.push('mais de um caminho de débito na rota')
  if (!/if \(remix && result\.ok && !result\.replay\) \{/.test(route) || !route.includes('name: FACE_REMIX_EVENTS.submitted')) e.push('evento face_remix_submitted fora do pedido aceito e novo')
  if (!/face_remixes/.test(route)) e.push('GET sem face_remixes')
  if (!route.includes('const guestRemixes = faceRemixVisible(false) ? publicFaceRemixes(')) e.push('GET do visitante não pergunta ao interruptor')
  if (!route.includes('const face_remixes = faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes(')) e.push('GET da conta não separa casa de cliente')
  if (fr.FACE_REMIX_EVENTS.opened !== 'face_remix_opened' || fr.FACE_REMIX_EVENTS.submitted !== 'face_remix_submitted' || fr.FACE_REMIX_EVENTS.keyframe !== 'face_remix_keyframe' || fr.FACE_REMIX_EVENTS.ready !== 'face_remix_ready') e.push('nomes dos eventos mudaram')

  // KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q3) a fiação real (clipServer): fios da etapa 2 ligados, transições condicionais, poll lê a imagem
  const server = src('server')
  if (!server.includes('keyframe: {') || !server.includes('persist: (row, url) => persistClipKeyframe(admin, row, url)')) e.push('settleDepsFor sem os fios da etapa 2')
  if (!/faceRemixKeyframePath\(row\.user_id, row\.id\)/.test(server) || !/upload\(path, buf, \{ contentType, upsert: true \}\)/.test(server)) e.push('quadro-chave não vai para o caminho determinístico com upsert')
  if (!/\.update\(\{ model: videoModel, fal_request_id: null \}\)[\s\S]{0,400}\.eq\('model', row\.model\)[\s\S]{0,200}\.eq\('fal_request_id', row\.fal_request_id\)/.test(server)) e.push('reserva da etapa 2 não é condicional (modelo da etapa 1 + request_id do quadro-chave)')
  if (!/\.update\(\{ fal_request_id: requestId, submitted_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]{0,300}\.is\('fal_request_id', null\)/.test(server)) e.push('request_id da etapa 2 gravado sem condição (linha reservada, sem request_id)')
  if (!server.includes("const imageUrl = Array.isArray(data?.images) ? data.images[0]?.url ?? null : null") || !server.includes('const out = url ?? imageUrl')) e.push('pollFal não lê a imagem do edit (images[0].url)')
  if (!server.includes('buildClipFalInput({ engine: row.engine, mode: \'i2v\', model: videoModel, seconds: row.seconds, aspect: \'image\', prompt: row.prompt, imageUrl: keyframeUrl })')) e.push('etapa 2 não usa a MESMA entrada do i2v do clipe comum com o quadro-chave')
  if (!server.includes('stage: faceRemixStageForRow(row)')) e.push('toPublicClip sem a etapa (a tela não sabe dizer "colocando na cena / filmando")')

  // KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q4) /images: 403/402 da fal = alarme de saldo + 503 honesto; o detail da fal vai ao log e ao evento
  const images = src('images')
  if (!images.includes("import { alertFalExhausted, falErrorText, looksExhausted } from '@/lib/falAlert'")) e.push('/images não lê o erro real da fal nem acorda o alarme de saldo')
  if (!/const exhausted = looksExhausted\(falErr\)/.test(images) || !/if \(exhausted\) await alertFalExhausted\(/.test(images)) e.push('/images não dispara alertFalExhausted em saldo')
  if (!/status: exhausted \? 503 : 502/.test(images)) e.push('/images não distingue saldo (503) de falha (502)')
  if (!/provider_status: status, provider_error: detail \|\| null, exhausted/.test(images)) e.push('evento images_reference_used sem o motivo da fal')
  if (!/console\.error\(`\[images\] provider failed — refunding: fal \$\{status \?\? '\?'\} \$\{detail/.test(images)) e.push('/images ainda loga só e.message')

  // (F) telas
  const gallery = src('gallery')
  if (!/\{it\.faceHref \? <Link (?:tabIndex=\{fill \? -1 : undefined\} )?href=\{it\.faceHref\} className="mwk-face"/.test(gallery)) e.push('galeria não condiciona o botão a faceHref')
  if (!/\.\.\.\(hasFaceRemix\(c\.id\) \? \{ faceHref: faceRemixHref\(c\.id, signedIn\) \} : \{\}\)/.test(src('items'))) e.push('cartões da galeria não perguntam ao catálogo do remix')
  const strip = src('strip')
  if (!/return hasFaceRemix\(c\.id\) \? \(/.test(strip) || !/href=\{faceRemixHref\(c\.id, signedIn\)\}/.test(strip)) e.push('faixa da home não condiciona o botão ao catálogo')
  const ids = /export const HOME_NEW_CLIP_IDS: readonly string\[\] = \[([^\]]*)\]/.exec(strip)
  if (!ids || !ids[1].includes("'golden-ball'")) e.push('Golden Ball fora da faixa da home')
  if (ids && (ids[1].match(/'/g) ?? []).length / 2 !== 8) e.push('faixa da home sem 8 cartões (2 fileiras de 4)')
  if (/credit/i.test(gallery.slice(gallery.indexOf('className="mwk-face"'), gallery.indexOf('className="mwk-face"') + 300))) e.push('preço no botão da galeria')
  const client = src('client')
  if (!client.includes("await send({ remix: remix.id, image_url: photoUrl, consent: true, ...(faceUrl ? { face_image_url: faceUrl } : {}) })")) e.push('tela não manda só id + foto + consentimento (+ recorte)') // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!/if \(!remix \|\| !photoUrl \|\| !remixConsent \|\| busy \|\| uploading\) return/.test(client)) e.push('tela gera sem consentimento')
  if (!client.includes('data-face-remix-consent')) e.push('tela sem a caixa de consentimento')
  if (!client.includes("remix ? <UiLabel>Required — one clear photo where the face is easy to see.")) e.push('no remix a tela ainda diz que a foto é opcional') // KINEO-ROSTO-AJUSTE-2810
  if (client.includes('easy to see. It becomes the first frame.</UiLabel>')) e.push('tela ainda promete que a foto vira o 1º quadro') // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!client.includes("void trackClosedEvent('face_remix_opened', { id: found.id })")) e.push('face_remix_opened ausente')
  if (!/\{remix\.credits\} \{t\('credits'\)\}/.test(client)) e.push('preço fora do botão do remix')
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — a foto do remix SEMPRE normalizada (JPEG ≤ 1600, sem barras pretas) + recorte do rosto como 2ª foto + etapas com nome
  if (!client.includes('const normalized = await compressPhoto(file, !!remix)')) e.push('foto do remix não passa sempre pela normalização')
  if (!/const needs = remix \|\| file\.size >= 2 \* 1024 \* 1024/.test(client)) e.push('compressPhoto não força o canvas no remix')
  if (!/function letterboxCrop\(bitmap: ImageBitmap\)/.test(client) || !/const box = remix \? letterboxCrop\(bitmap\)/.test(client)) e.push('barras pretas da selfie não são cortadas no remix')
  if (!/async function cropFace\(file: File\)/.test(client) || !client.includes('const face = await cropFace(normalized)')) e.push('recorte do rosto não é feito no navegador')
  if (!client.includes("c.stage === 'keyframe' ? <UiLabel>Placing you in the scene…</UiLabel> : c.stage === 'video' ? <UiLabel>Filming your scene…</UiLabel>")) e.push('tela não nomeia as duas etapas')

  // marca: toda linha nova do módulo carrega a entrega
  if (!src('remix').includes(MARCA) || !src('remix').includes('[TRAVA 8.2 — vai do fundador 28/10 "A"')) e.push('módulo sem marca/TRAVA')
  for (const k of ['remix', 'flow', 'server', 'client', 'route', 'images']) if (!src(k).includes(MARCA_Q)) e.push(`${F[k]} sem a marca ${MARCA_Q}`) // KINEO-ROSTO-QUADRO-CHAVE-2810
  return e
}

console.log('KINEO-ROSTO-NO-CLIPE-2810 — Put your face in it (+ KINEO-ROSTO-QUADRO-CHAVE-2810: duas etapas)')
// KINEO-ROSTO-QUADRO-CHAVE-2810 — fonte (ou mutante) que LANÇA conta como vermelho, nunca derruba o guardião.
const roda = async (over) => { try { return await checa(over) } catch (err) { return ['checa lançou: ' + (err instanceof Error ? err.message : String(err))] } }
const erros = await roda()
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `fonte atual: ${erros.length} erro(s)`)

// (M) mutantes
const mut = (rel, from, to) => { const s = read(rel); if (!s.includes(from)) throw new Error('mutante não aplicável: ' + from.slice(0, 60)); return { [rel]: s.replace(from, to) } }
const mutantes = [
  ['consentimento opcional', mut(F.remix, "if (ctx.consent !== true) return", 'if (false) return')],
  ['item sem pessoa ganha botão', mut(F.remix, 'c.person === true && !!c.face && ', '')], // reancorado KINEO-ROSTO-QUADRO-CHAVE-2810 — `person` e `face` andam juntos; o mutante tira os dois
  ['prompt do navegador vence', mut(F.remix, 'prompt: faceRemixPrompt(item), imageUrl, remix: item.id, faceImageUrl }', "prompt: String((ctx as any).prompt ?? faceRemixPrompt(item)), imageUrl, remix: item.id, faceImageUrl }")],
  ['sem a regra da identidade', mut(F.remix, '`${FACE_REMIX_PREFIX}${trimEnd(item.template.motionPrompt)}. ${FACE_REMIX_MOTION_SUFFIX} ${FACE_REMIX_SUFFIX}`', '`${trimEnd(item.template.motionPrompt)}. ${FACE_REMIX_MOTION_SUFFIX} ${FACE_REMIX_SUFFIX}`')],
  ['Golden Ball sai do catálogo', mut(F.galeria, "{ id: 'golden-ball',", "{ id: 'golden-ball-x',")],
  ['rota esquece o consentimento', mut(F.route, 'consent: body.consent, faceImageUrl: body.face_image_url })', 'consent: true, faceImageUrl: body.face_image_url })')],
  ['botão na galeria para todos', mut(F.gallery, '{it.faceHref ? <Link ', '{true ? <Link ')],
  ['tela manda o prompt', mut(F.client, 'await send({ remix: remix.id, image_url: photoUrl, consent: true, ...(faceUrl ? { face_image_url: faceUrl } : {}) })', 'await send({ remix: remix.id, image_url: photoUrl, consent: true, prompt, ...(faceUrl ? { face_image_url: faceUrl } : {}) })')],
  ['evento em todo pedido', mut(F.route, 'if (remix && result.ok && !result.replay) {', 'if (remix) {')],
  // (P) interruptor desligado: forçar ligado / ignorar o interruptor / tirar a casa fica vermelho
  ['interruptor forçado ligado', mut(F.remix, 'export const FACE_REMIX_PUBLIC = false', 'export const FACE_REMIX_PUBLIC = true')],
  ['botão ignora o interruptor', mut(F.remix, 'return publicFlag === true && faceRemixById(id) !== null', 'return faceRemixById(id) !== null')],
  ['casa perde o remix', mut(F.remix, 'return publicFlag === true || isInternal === true', 'return publicFlag === true')],
  ['GET abre o remix para toda conta', mut(F.route, 'faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes(', 'faceRemixVisible(true) ? publicFaceRemixes(')],
  ['galeria dá botão sem perguntar', mut(F.items, '...(hasFaceRemix(c.id) ? {', '...(true ? {')],
  ['faixa da home dá botão sem perguntar', mut(F.strip, 'return hasFaceRemix(c.id) ? (', 'return true ? (')],
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — (Q) as duas etapas
  ['preço volta a 8', mut(F.remix, 'export const FACE_REMIX_CREDITS = 10', 'export const FACE_REMIX_CREDITS = 8')],
  ['pedido manda o Kling direto (sem quadro-chave)', mut(F.flow, '? await deps.submit(FACE_REMIX_KEYFRAME_MODEL, faceRemixKeyframeInput(remix, req.imageUrl, faceImageUrl))', '? await deps.submit(req.model, buildClipFalInput(req))')],
  ['quadro-chave falhou e ninguém estorna', mut(F.flow, 'if (state.state === \'failed\') return fail(FACE_REMIX_KEYFRAME_FAILED, cleanProviderError(state.error))', 'if (false) return fail(FACE_REMIX_KEYFRAME_FAILED, cleanProviderError(state.error))')],
  ['etapa 2 sem reserva (dois atores, dois POSTs)', mut(F.flow, 'if (!(await deps.keyframe.claim(row, videoModel))) return row', 'await deps.keyframe.claim(row, videoModel)')],
  ['Kling parte da URL da fal (expira)', mut(F.flow, 'const sent = await deps.keyframe.submitVideo(row, videoModel, keyframeUrl)', 'const sent = await deps.keyframe.submitVideo(row, videoModel, state.url)')],
  ['recorte de outra conta aceito', mut(F.flow, "if (!faceImageUrl) return { ok: false, status: 403, code: 'image'", "if (false) return { ok: false, status: 403, code: 'image'")],
  ['remix com prompt adulterado aceito', mut(F.remix, ' || req.prompt !== faceRemixPrompt(item)) return { ok: false }', ') return { ok: false }')],
  ['recorte vai depois da foto', mut(F.remix, '? [faceUrl, photoUrl] : [photoUrl]', '? [photoUrl, faceUrl] : [photoUrl]')],
  ['quadro-chave em plano aberto', mut(F.remix, "'MEDIUM SHOT from the waist up, ", "'FULL BODY SHOT, ")],
  ['figurantes podem ser clones', mut(F.remix, 'visibly DIFFERENT person', 'person')],
  ['modelo com gênero fixo', mut(F.galeria, "keyframeScene: 'Backstage of a glamorous awards gala in a theatre with red velvet curtains and warm stage lights: the person from the photo", "keyframeScene: 'Backstage of a glamorous awards gala in a theatre with red velvet curtains and warm stage lights: the man from the photo")],
  ['figurantes sem descrição', mut(F.galeria, "extras: 'two friends behind, copying the pose and laughing — an older bald man in plain pink pajamas and a woman with long curly red hair in a plain blue t-shirt'", "extras: 'two friends behind'")],
  ['código esquece o movimento do modelo', mut(F.remix, '${FACE_REMIX_PREFIX}${trimEnd(item.template.motionPrompt)}.', '${FACE_REMIX_PREFIX}${trimEnd(item.template.keyframeScene)}.')],
  ['evento do quadro-chave sem as duas etapas', mut(F.flow, "keyframe: 'done', video: 'submitted', keyframe_ms", "keyframe_ms")],
  ['reserva sem condição de request_id', mut(F.server, "    .eq('fal_request_id', row.fal_request_id) // KINEO-ROSTO-QUADRO-CHAVE-2810\n", '')],
  ['/images volta ao 502 genérico', mut(F.images, 'status: exhausted ? 503 : 502', 'status: 502')],
  ['foto do remix sem normalizar', mut(F.client, 'const normalized = await compressPhoto(file, !!remix)', 'const normalized = await compressPhoto(file)')],
  ['tela não manda o recorte', mut(F.client, 'consent: true, ...(faceUrl ? { face_image_url: faceUrl } : {}) })', 'consent: true })')],
]
for (const [nome, over] of mutantes) ok((await roda(over)).length > 0, `mutante fica vermelho: ${nome}`)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
