// KINEO-APRESENTADOR-V2-1710 — guardião do APRESENTADOR V2 do Studio Ads (pessoa de IA falando com o produto na mão; só contas internas).
// Roda com `node scripts/test-apresentador-v2-1710.mjs`, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do repo e
// rodados com stubs (readFileSync, sem alias @/; o arreio de scripts/test-juiz-grade-1610.mjs). Base: docs/COMO-OS-LIDERES-FAZEM-AVATAR-COM-PRODUTO-
// 2026-10-17.md (pipeline A) e docs/RESULTADO-TESTE-AVATAR-FALANTE-2026-10-17.md (o teste de 17/10).
//
// O que prova (1 seção por item):
//   A  2 REFERÊNCIAS: o retrato do apresentador da biblioteca (1ª) + a foto real do produto (2ª), no corpo do Nano Banana Pro edit EXECUTADO;
//   B  4 OPÇÕES: num_images 4 no pedido, as 4 URLs lidas da fal, 4 cópias com sufixo próprio e as 4 gravadas no pedido (plan.presenter.v2.options);
//   C  BOCA NEUTRA no prompt (sem sorriso de dentes), rosto de frente, só o produto, a outra mão inteira (a atuação gesticula), o lugar do cliente;
//   E  ESCOLHA AUTOMÁTICA só por "frasco e caixa juntos" (a mesma regra do both_objects do inventário), descarta e escolhe a melhor;
//   V  VOZ por língua: PT-BR = Portuguese_ConfidentWoman + fal-ai/minimax/speech-2.8-hd + language_boost "Portuguese" + speed 1 (corpo EXECUTADO);
//      a voz clonada do /avatar continua na 02-hd com o corpo de sempre; o /audio e a TTS da casa intocados;
//   K  CORTE no fim real da fala (voz + 0,15 s), dissolve para o close real nesse ponto (montagem EXECUTADA);
//   S  ESTRUTURA de 15 s: apresentador 0–~10,5 s com no máximo 1 corte · close da foto real 2 s · cartão 2,5 s; créditos iguais;
//   T  TRAVAS: ADS_V2_PRESENTER_V2_MODE = 'internal', o /plan só monta para reason 'internal' + Comercial 9:16 sem estilo; 'off' desliga até o já planejado;
//   D  desfaz exato + ida + marca + encadeamento (a grade do juiz e, por ela, a cadeia inteira tiram esta camada primeiro) + diff só nos arquivos da lista;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semApresentadorV2_1710, comApresentadorV2_1710, desfazApresentadorV2_1710, APRESENTADOR_V2_1710_ARQUIVOS, APRESENTADOR_V2_1710_NOVOS, APRESENTADOR_V2_1710_BASE, MARCA_APRESENTADOR_V2_1710 } from './test-support/desfaz-apresentador-v2-1710.mjs'
import { desfazJuizGrade1610, semJuizGrade1610 } from './test-support/desfaz-juiz-grade-1610.mjs'
import { desfazMaoJuiz1610 } from './test-support/desfaz-ads-mao-juiz-1610.mjs'
import { desfazApresentadorV2Ajuste1710 } from './test-support/desfaz-apresentador-v2-ajuste-1710.mjs' // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-APRESENTADOR-V2-1710'
const rd = (p) => desfazApresentadorV2Ajuste1710(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710 — o ajuste do apresentador v2 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-apresentador-v2-ajuste-1710.mjs
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return git('show', `${APRESENTADOR_V2_1710_BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const near = (a, b) => Math.abs(a - b) < 1e-6
process.env.FAL_KEY = process.env.FAL_KEY || 'fal-guardiao-sem-rede' // só para passar da porta "sem chave": a fal aqui é falsa

const F = {
  v2: 'lib/ads/v2PresenterV2.ts', presenter: 'lib/ads/v2Presenter.ts', holds: 'lib/ads/v2PresenterHolds.ts', ih: 'lib/ads/v2ProductInHand.ts',
  montage: 'lib/ads/adV2Montage.ts', images: 'lib/ads/v2Images.ts', shots: 'lib/ads/v2Shots.ts', engines: 'lib/ads/v2Engines.ts', tiers: 'lib/ads/v2Tiers.ts',
  voice: 'lib/avatar/voice.ts', advance: 'lib/ads/v2Advance.ts', plan: 'lib/ads/v2PlanCore.ts', tts: 'lib/ttsFallback.ts', vision: 'lib/ads/v2LockVision.ts',
}

// ── carregador: transpila TS → CJS, resolve '@/' (os arquivos reais) com stubs; `over` = fonte mutante ───────────────────────────
function makeLoader(stubs, over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
// fal falso: o último pedido (modelo + corpo) e um resultado de imagem com 4 opções
const falLog = []
const FAL = {
  fal: {
    config() {},
    subscribe: async (model, { input }) => { falLog.push({ model, input }); return { data: { audio: { url: 'https://fal.media/voz.mp3' } } } },
    queue: {
      status: async (_m, { requestId }) => ({ status: 'COMPLETED', request_id: requestId }),
      result: async () => ({ data: { images: [{ url: 'https://fal.media/o0.png' }, { url: 'https://fal.media/o1.png' }, { url: 'https://fal.media/o2.png' }, { url: 'https://fal.media/o3.png' }] } }),
    },
  },
}
const submitted = []
const uploads = []
const STUBS = {
  '@fal-ai/client': FAL,
  '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async (model, input) => { submitted.push({ model, input }); return { requestId: 'req-1' } } },
  '@/lib/cinematic/sceneDisposition': { classifyProviderFailure: () => 'unknown' },
  '@/lib/renderAssets': { persistRenderAssets: async () => null },
  '@/lib/mp4Duration': { probeMp4DurationSeconds: async () => null },
  '@/lib/falAlert': { alertFalExhausted: async () => null, falErrorText: () => '', looksExhausted: () => false },
  '@/lib/userFootage': { footageAdminClient: () => ({ storage: { from: () => ({ upload: async (path) => { uploads.push(path); return { error: null } }, getPublicUrl: (path) => ({ data: { publicUrl: `https://sb.test/renders/${path}` } }) }) } }) },
}
const L = (over = {}) => makeLoader(STUBS, over)
const V2 = L()(F.v2)
const PR = L()(F.presenter)
const HO = L()(F.holds)
const IH = L()(F.ih)
const MO = L()(F.montage)
const VO = L()(F.voice)
const sofia = PR.adsV2PresenterById('sofia')
const marcus = PR.adsV2PresenterById('marcus')
const PRODUCT = 'https://sb.test/footage/atheeri.jpg'

// ═══ A. 2 referências ═════════════════════════════════════════════════════════════════════════════════════════════════
console.log('A. foto com 2 referências (retrato da biblioteca + foto real do produto)')
const a1 = (v2 = V2) => {
  const plan = v2.planAdsV2PresenterV2({ entry: sofia, sector: 'other', setting: null, performancePrompt: PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT })
  const refs = v2.adsV2PresenterV2Refs(plan, PRODUCT)
  return plan && plan.portraitUrl === 'https://www.usekineo.com/ads/presenters/sofia.webp' && plan.portraitUrl === HO.adsV2PresenterHoldsPortraitUrl(sofia) &&
    refs.length === 2 && refs[0] === plan.portraitUrl && refs[1] === PRODUCT && v2.ADS_V2_PRESENTER_V2_ORIGIN === HO.ADS_V2_PRESENTER_HOLDS_ORIGIN &&
    v2.planAdsV2PresenterV2({ entry: { ...sofia, portrait: null }, sector: 'other', performancePrompt: '' }) === null && v2.isAdsV2PresenterV2Plan(plan) &&
    PR.ADS_V2_PRESENTER_LIBRARY.slice(0, 6).every((e, i) => e.look === PR.ADS_V2_PRESENTER_PEOPLE[i] && v2.adsV2PresenterV2PortraitUrl(e)) // o sorteio também tem retrato
}
await check('A1 o plano v2: retrato https da biblioteca (= a regra do "segurando"), referências [retrato, produto] nessa ordem; sem retrato = null; o sorteio (6 primeiros) tem retrato', () => a1())
const a2 = async (imagesSrc = rd(F.images)) => {
  submitted.length = 0
  const IM = L({ [F.images]: imagesSrc })(F.images)
  const plan = V2.planAdsV2PresenterV2({ entry: sofia, sector: 'other', performancePrompt: PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT })
  await IM.submitSceneImage({ prompt: plan.prompt, referenceUrls: V2.adsV2PresenterV2Refs(plan, PRODUCT), numImages: 4 }, { userId: 'u', orderId: 'o' })
  await IM.submitSceneImage({ prompt: 'cena de sempre com gente', referenceUrls: [PRODUCT] }, { userId: 'u', orderId: 'o' })
  const [v, old] = submitted
  return submitted.length === 2 && v.model === 'fal-ai/nano-banana-pro/edit' && JSON.stringify(v.input.image_urls) === JSON.stringify([plan.portraitUrl, PRODUCT]) && v.input.num_images === 4 && v.input.prompt === plan.prompt &&
    v.input.resolution === '2K' && old.input.num_images === 1 && JSON.stringify(old.input.image_urls) === JSON.stringify([PRODUCT])
}
await check('A2 o corpo EXECUTADO do Nano Banana Pro edit: image_urls = [retrato, produto], num_images 4, o prompt v2; a cena de sempre continua com 1 imagem', () => a2())
const a3 = (src = rd(F.advance)) => /const pv = actor \? await presenterV2Of\(order\) : null/.test(src) && src.includes('const basePrompt = actor ? (pv ? pv.v2.prompt : actor.actorPrompt)') &&
  src.includes('const baseRefs = actor ? (pv ? pv.lib.adsV2PresenterV2Refs(pv.v2, actor.productUrl) : [actor.productUrl])') && src.includes('const lock = pv ? null : adsV2LockOf(order, row)') &&
  src.includes("...(pv ? { numImages: 4 as const } : {}) }, { userId: order.user_id, orderId: order.id })")
await check('A3 o avanço manda as 2 referências, o prompt v2 e 4 imagens SÓ no apresentador v2 (sem a colagem da trava); o ator de antes = 1 referência', () => a3())

// ═══ B. 4 opções ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. 4 opções')
const b1 = async (shotsSrc = rd(F.shots)) => {
  const SH = L({ [F.shots]: shotsSrc })(F.shots)
  const img = await SH.pollFalJob('fal-ai/nano-banana-pro/edit', 'req-9', 'image', { userId: 'u', orderId: 'o' })
  return V2.ADS_V2_PRESENTER_V2_OPTIONS === 4 && L()(F.images).ADS_V2_SCENE_IMAGE_MAX_OPTIONS === 4 && img.state === 'done' && img.url === 'https://fal.media/o0.png' && Array.isArray(img.urls) && img.urls.length === 4 && img.urls[3] === 'https://fal.media/o3.png'
}
await check('B1 4 opções (ADS_V2_PRESENTER_V2_OPTIONS = teto do num_images = 4); a leitura da fal EXECUTADA devolve as 4 URLs (a 1ª continua em url)', () => b1())
const b2 = async (imagesSrc = rd(F.images)) => {
  uploads.length = 0
  const IM = L({ [F.images]: imagesSrc })(F.images)
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0]).buffer })
  try {
    const urls = []
    for (let k = 0; k < 4; k++) urls.push(await IM.persistSceneImage({ userId: 'u', orderId: 'o', idx: 31, attempt: 1, falUrl: `https://fal.media/o${k}.png`, suffix: V2.adsV2PresenterV2OptionSuffix(k) }))
    const plain = await IM.persistSceneImage({ userId: 'u', orderId: 'o', idx: 2, attempt: 1, falUrl: 'https://fal.media/x.png' })
    const evil = await IM.persistSceneImage({ userId: 'u', orderId: 'o', idx: 2, attempt: 1, falUrl: 'https://fal.media/x.png', suffix: '/../../x' })
    return new Set(urls).size === 4 && uploads.slice(0, 4).every((p, k) => p === `u/adsv2-o-p31-a1-scene-o${k}.png`) && plain.endsWith('/u/adsv2-o-p2-a1-scene.png') && evil.endsWith('/u/adsv2-o-p2-a1-scene.png')
  } finally { globalThis.fetch = realFetch }
}
await check('B2 cada opção vai a um arquivo próprio no NOSSO bucket (-scene-o0..o3); sem sufixo = o caminho de sempre; sufixo estranho é ignorado', () => b2())
const b3 = (src = rd(F.advance)) => src.includes('const list = urls.slice(0, pv.lib.ADS_V2_PRESENTER_V2_OPTIONS)') && src.includes('suffix: pv.lib.adsV2PresenterV2OptionSuffix(k)') &&
  src.includes('v2: { ...pv.v2, options, chosen: kept.indexOf(chosen), chosenWhy: pick.why }') && src.includes("if (pv) { await finishPresenterV2Image(admin, order, row, p.urls && p.urls.length > 0 ? p.urls : [p.url], pv); return }") &&
  src.indexOf('if (!(await markShot(admin, row, [\'image_submitted\'], { status: \'image_done\', image_url: chosen }))) return') < src.indexOf("await admin.from('ads_v2_orders').update({ plan: { ...order.plan, presenter: { ...presenter, v2:")
await check('B3 o avanço lê as 4, copia as 4 e GRAVA as 4 no pedido (plan.presenter.v2.options, com a escolhida e o porquê) — só quem vence a foto grava', () => b3())

// ═══ C. o prompt: boca neutra ════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. o prompt (boca neutra, rosto de frente, só o produto, a outra mão, o lugar)')
const c1 = (v2 = V2) => {
  const p = v2.adsV2PresenterV2Prompt({ look: sofia.look, pronoun: 'She', sector: 'store', setting: 'a rainy window in a hotel room', freeHand: v2.adsV2PresenterV2FreeHand(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT) })
  const q = v2.adsV2PresenterV2Prompt({ look: marcus.look, pronoun: 'He', sector: 'store', setting: null, freeHand: false })
  return p.includes('Neutral mouth: lips relaxed, closed or only slightly parted; no smile showing teeth') && !/\bsmil(e|ing)\b(?! showing)/i.test(p.replace('no smile showing teeth', '')) &&
    p.includes('faces the camera straight on, with the whole face visible') && p.includes('the person from the FIRST reference photo') && p.includes('the product from the SECOND reference photo') &&
    p.includes(v2.ADS_V2_PRESENTER_V2_ONLY_PRODUCT) && p.includes('leave the box out of the frame') && p.includes(v2.ADS_V2_PRESENTER_V2_FREE_HAND) && p.includes('fully inside the frame') &&
    p.includes('Setting: "a rainy window in a hotel room"') && !p.includes('a bright, tidy shop') && q.includes('Background: a bright, tidy shop, softly out of focus.') && !q.includes(v2.ADS_V2_PRESENTER_V2_FREE_HAND) && q.includes('his hand') &&
    v2.adsV2PresenterV2SettingLine('lugar') === IH.adsV2InHandSettingLine('lugar') && v2.adsV2PresenterV2SettingLine('com "aspas"') === null && /hand gestures/.test(PR.ADS_V2_PRESENTER_PERFORMANCE_PROMPT)
}
await check('C1 boca NEUTRA (lábios relaxados, fechados ou entreabertos, sem sorriso de dentes), rosto de frente, 1ª = pessoa / 2ª = produto, só o produto (caixa fora), a outra mão INTEIRA quando a atuação gesticula, o lugar do cliente (senão o fundo do setor)', () => c1())
const c2 = (src = rd(F.plan)) => src.includes('const v2 = presenterV2Lib.planAdsV2PresenterV2({ entry: v2Entry, sector, setting: sceneSetting, performancePrompt: ADS_V2_PRESENTER_PERFORMANCE_PROMPT })') &&
  src.includes('if (v2 && checkV2Prompts([v2.prompt], extracted.brief).length === 0) { presenter.v2 = v2;')
await check('C2 o /plan monta o prompt com o lugar pedido (sceneSetting) e o passa pela régua anti-invenção; reprovado = o ator de antes', () => c2())

// ═══ E. a escolha automática ═════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. escolha automática só por "frasco e caixa juntos"')
const INVS = [
  { products: [{ type: 'bottle', visible: 'yes' }], people: [], hands: 'yes' },
  { products: [{ type: 'bottle', visible: 'yes' }, { type: 'box', visible: 'yes' }], people: [], hands: 'yes' },
  { products: [{ type: 'bottle', visible: 'yes' }, { type: 'box', visible: 'unsure' }], people: [], hands: 'yes' },
  { products: [{ type: 'box', visible: 'yes' }], people: [{}, {}], hands: 'no' },
  { products: [], people: [], hands: 'unsure' },
]
const e1 = (v2 = V2) => INVS.every((inv) => v2.adsV2PresenterV2BothObjects(inv) === IH.adsV2InHandInventoryRule(inv, 'bottle').fails.includes('both_objects')) && v2.adsV2PresenterV2BothObjects(null) === null &&
  v2.adsV2PresenterV2BothObjects(INVS[3]) === false // pessoa extra e mão ruim NÃO decidem (só a checagem que acertou 100%)
await check('E1 a checagem = a MESMA regra do "both_objects" do inventário (frasco "yes" E caixa "yes"); pessoa extra/mãos não entram; ilegível = null', () => e1())
const e2 = (v2 = V2) => {
  const P = (a) => v2.adsV2PresenterV2Pick(a)
  const x = P([true, false, false, true]), y = P([true, true, null, true]), z = P([true, true, true, true]), w = P([false, true, true, true]), n = P([])
  return x.index === 1 && x.why === 'clean' && y.index === 2 && y.why === 'unchecked' && z.index === 0 && z.why === 'all_discarded' && w.index === 0 && w.why === 'clean' && n.index === -1
}
await check('E2 descarta "frasco e caixa": a 1ª limpa; senão a 1ª não lida; todas descartadas = a 1ª (o pedido nunca morre por isso)', () => e2())
const e3 = (src = rd(F.advance)) => src.includes('vis.adsV2InHandInventoryOf(u).then((inv) => pv.lib.adsV2PresenterV2BothObjects(inv))') && src.includes('const pick = pv.lib.adsV2PresenterV2Pick(both)') &&
  src.includes("mode: 'presenter_v2'") && !/adsV2InHandLabelJudge\([^)]*presenter/i.test(src)
await check('E3 o avanço roda a checagem em CADA opção (o inventário do juiz) e escolhe pela regra pura; o evento registra (a trava de sempre, modo presenter_v2)', () => e3())

// ═══ V. a voz por língua ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. voz do apresentador por língua')
const v1 = (v2 = V2) => {
  const pt = v2.adsV2PresenterV2VoiceFor('pt', 'woman')
  return pt.engine === 'minimax' && pt.voiceId === 'Portuguese_ConfidentWoman' && pt.model === 'fal-ai/minimax/speech-2.8-hd' && pt.languageBoost === 'Portuguese' && pt.speed === 1 &&
    v2.ADS_V2_PRESENTER_V2_VOICES.pt.woman === v2.ADS_V2_PRESENTER_V2_PT_BR_VOICE && v2.adsV2PresenterV2VoiceFor('pt', 'man').engine === 'current' &&
    v2.adsV2PresenterV2VoiceFor('en', 'woman').engine === 'current' && v2.adsV2PresenterV2VoiceFor('xx', 'woman').engine === 'current' && v2.adsV2PresenterV2VoiceFor('constructor', 'woman').engine === 'current' &&
    ['pt', 'en', 'es'].every((l) => v2.ADS_V2_PRESENTER_V2_VOICES[l] && v2.ADS_V2_PRESENTER_V2_VOICES[l].woman && v2.ADS_V2_PRESENTER_V2_VOICES[l].man)
}
await check('V1 PT-BR (mulher) = Portuguese_ConfidentWoman · fal-ai/minimax/speech-2.8-hd · language_boost "Portuguese" · speed 1; homem e outras línguas = a voz de hoje; uma linha por língua', () => v1())
const v2c = async (voiceSrc = rd(F.voice)) => {
  falLog.length = 0
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
  try {
    const VX = L({ [F.voice]: voiceSrc })(F.voice)
    const pt = V2.ADS_V2_PRESENTER_V2_PT_BR_VOICE
    await VX.synthesizeWithVoice({ voiceId: pt.voiceId, text: 'Gente, achei meu perfume.', model: pt.model, languageBoost: pt.languageBoost, speed: pt.speed })
    await VX.synthesizeWithVoice({ voiceId: 'clone-123', text: 'Hello there', language: 'pt' })
    const [a, b] = falLog
    return falLog.length === 2 && a.model === 'fal-ai/minimax/speech-2.8-hd' && a.input.prompt === 'Gente, achei meu perfume.' && !('text' in a.input) && a.input.voice_setting.voice_id === 'Portuguese_ConfidentWoman' &&
      a.input.voice_setting.speed === 1 && a.input.language_boost === 'Portuguese' && a.input.output_format === 'url' &&
      b.model === 'fal-ai/minimax/speech-02-hd' && JSON.stringify(b.input) === JSON.stringify({ text: 'Hello there', voice_setting: { voice_id: 'clone-123' }, language_boost: 'Portuguese', output_format: 'url' })
  } finally { globalThis.fetch = realFetch }
}
await check('V2 a síntese EXECUTADA: PT-BR vai à speech-2.8-hd com prompt + voice_id Portuguese_ConfidentWoman + speed 1 + language_boost Portuguese; a voz CLONADA continua na 02-hd com o corpo de antes, byte a byte', () => v2c())
const v3 = (src = rd(F.advance)) => VO.TTS_28_MODEL === V2.ADS_V2_PRESENTER_V2_TTS_MODEL && rd(F.tts).includes(`export const TTS_FALLBACK_MODEL = '${V2.ADS_V2_PRESENTER_V2_TTS_MODEL}'`) &&
  src.includes("pv.lib.adsV2PresenterV2VoiceFor(narrationLanguage(order.language) ?? 'en', pv.v2.gender)") &&
  src.includes('vm.synthesizeWithVoice({ voiceId: v2Voice.voiceId, text, model: v2Voice.model, languageBoost: v2Voice.languageBoost, speed: v2Voice.speed })') && src.includes('if (!fallbackToDefault) throw e // KINEO-APRESENTADOR-V2-1710') &&
  !APRESENTADOR_V2_1710_ARQUIVOS.some((f) => /^lib\/ttsFallback|^app\/api\/audio|^lib\/compose|^app\/api\/compose/.test(f))
await check('V3 o avanço usa a voz da língua do pedido (o mesmo modelo da TTS da casa) e, se ela falhar no passo do ator, espera; ttsFallback, /audio e compose intocados', () => v3())

// ═══ K/S. o corte e a estrutura de 15 s (montagem EXECUTADA) ═══════════════════════════════════════════════════════════
console.log('\nK/S. corte no fim real da fala e estrutura de 15 s')
const montageInput = (extra = {}) => ({
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: 'https://sb.test/card.png', cardSeconds: 2.5, musicUrl: 'https://sb.test/m.mp3', voiceUrl: 'https://sb.test/voz.mp3', voiceSeconds: 10.35,
  overlays: [{ text: 'Cheiro de mel', start: 0, end: 4 }],
  shots: [
    { url: PRODUCT, kind: 'text', packshot: true, cutStart: 0, cutSeconds: 3, measuredSeconds: null },
    { url: 'https://sb.test/v1.mp4', kind: 'user_video', cutStart: 0, cutSeconds: 3, measuredSeconds: 9, focusX: 0.5, focusY: 0.5, videoWidth: 1080, videoHeight: 1920 },
    { url: 'https://sb.test/v2.mp4', kind: 'user_video', cutStart: 0, cutSeconds: 3, measuredSeconds: 9, focusX: 0.5, focusY: 0.5, videoWidth: 1080, videoHeight: 1920 },
    { url: 'https://sb.test/foto.jpg', kind: 'text', cutStart: 0, cutSeconds: 3.5, measuredSeconds: null },
  ],
  presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 15.1, insertOrder: [0, 1, 2], v2: { speechSeconds: 10.35, closeUrl: PRODUCT } },
  ...extra,
})
const k1 = (mo = MO) => {
  const t = mo.adsV2PresenterV2Timeline({ clipSeconds: 10.1, speechSeconds: 7.96, cardSeconds: 2.5 })
  const long = mo.adsV2PresenterV2Timeline({ clipSeconds: 10.1, speechSeconds: 12, cardSeconds: 2.5 })
  const none = mo.adsV2PresenterV2Timeline({ clipSeconds: 10.1, speechSeconds: 0, cardSeconds: 2.5 })
  return mo.ADS_V2_PRESENTER_V2_SPEECH_PAD === 0.15 && near(t.cut, 8.11) && near(t.cardStart, 10.11) && near(t.total, 12.61) && near(long.cut, 9.85) && near(none.cut, 9.85) &&
    mo.adsV2PresenterV2Timeline({ clipSeconds: 2, speechSeconds: 1.5, cardSeconds: 2.5 }) === null
}
await check('K1 o corte = voz + 0,15 s (o caso do teste: 10,1 s de vídeo para 7,96 s de voz corta em 8,11 s, sem os ~2 s de cauda muda); nunca passa do clipe; fala curta demais = null', () => k1())
const k2 = (mo = MO) => {
  const src = mo.buildAdV2Source(montageInput())
  const ator = src.elements.find((e) => e.type === 'video' && e.source === 'https://sb.test/ator.mp4')
  const close = src.elements.filter((e) => e.type === 'image' && e.source === PRODUCT)
  const card = src.elements.find((e) => e.source === 'https://sb.test/card.png')
  const inserts = src.elements.filter((e) => e.type === 'video' && e.track === mo.ADS_V2_PRESENTER_INSERT_TRACK)
  const voz = src.elements.filter((e) => e.type === 'audio' && e.source === 'https://sb.test/voz.mp3')
  const texto = src.elements.find((e) => e.type === 'text')
  const longa = mo.buildAdV2Source(montageInput({ presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 20, insertOrder: [0, 1, 2], v2: { speechSeconds: 14, closeUrl: PRODUCT } } })) // fala longa: caberiam 2 inserts
  const insLonga = longa.elements.filter((e) => e.type === 'video' && e.track === mo.ADS_V2_PRESENTER_INSERT_TRACK)
  return insLonga.length === 1 && near(longa.duration, 14.15 + 2 + 2.5) && near(ator.time, 0) && near(ator.duration, 10.5 + mo.ADS_V2_MONTAGE_FADE) && ator.volume === '100%' && ator.trim_start === 0 &&
    close.length === 2 && close.every((e) => near(e.time, 10.5) && near(e.duration, 2 + mo.ADS_V2_MONTAGE_FADE) && e.track === mo.ADS_V2_PRESENTER_TRACK && e.enter_transition?.type === 'fade') &&
    near(card.time, 12.5) && near(card.duration, 2.5) && near(src.duration, 15) && inserts.length === 1 && inserts[0].source === 'https://sb.test/v1.mp4' && inserts[0].volume === '0%' &&
    voz.length === 0 && texto.time + texto.duration <= 10.5 + 1e-9
}
await check('K2/S1 montagem EXECUTADA (voz de 10,35 s): apresentador 0→10,5 s COM o som dele, dissolve para o CLOSE da foto real em 10,5 s (2 s), cartão 12,5→15 s; total 15 s; NO MÁXIMO 1 corte (1 insert, nunca a foto do produto); nenhuma 2ª voz; frases só sobre o apresentador', () => k2())
const s2 = (mo = MO) => {
  const old = mo.buildAdV2Source(montageInput({ presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 15.1, insertOrder: [0, 1, 2] } }))
  const closeOld = old.elements.filter((e) => e.type === 'image' && e.source === PRODUCT && near(e.time, 10.5))
  let bad = false
  try { mo.buildAdV2Source(montageInput({ presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 15.1, insertOrder: [], v2: { speechSeconds: 10, closeUrl: 'http://inseguro' } } })) } catch (e) { bad = /bad_close/.test(e.message) }
  return near(old.duration, 15.1 - mo.ADS_V2_MONTAGE_FADE + 2.5) && closeOld.length === 0 && bad
}
await check('S2 sem v2 = a montagem do ator de antes (clipe inteiro + cartão); close sem https = recusa (o anúncio de sempre sai)', () => s2())
const s3 = (src = rd(F.advance), plan = rd(F.plan)) => src.includes('...(presenterV2 ? { v2: { speechSeconds: voiceSeconds ?? 0, closeUrl: presenterV2.productUrl } } : {})') &&
  plan.includes('plan.shots = presenterV2Lib.adsV2PresenterV2Shots(plan.shots, photos)') && !APRESENTADOR_V2_1710_ARQUIVOS.some((f) => /v2Tiers|v2Billing|v2StartCore|app\/api\/ads\/v2\/start/.test(f))
await check('S3 o avanço passa a voz medida e a foto REAL do produto (a 2ª referência) à montagem; preço intocado (v2Tiers/v2Billing//start fora da lista)', () => s3())
const s4 = (v2 = V2) => {
  const TI = L()(F.tiers)
  const photos = [{ footage_id: 'f1', kind: 'product', url: PRODUCT }, { footage_id: 'f2', kind: 'place', url: 'https://sb.test/loja.jpg' }, { footage_id: 'f3', kind: 'text', url: 'https://sb.test/menu.jpg' }]
  const shots = [
    { idx: 0, kind: 'people', source: 'generated_scene', sourceFootageId: null, imageUrl: null, referenceFootageIds: ['f1'], referenceUrls: [PRODUCT], scenePrompt: 'x', prompt: 'y', movementVariant: 1, cutStart: 0.4, cutSeconds: 3, effect: 'glow' },
    { idx: 1, kind: 'product_hero', source: 'client_photo', sourceFootageId: 'f1', imageUrl: PRODUCT, referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: 'z', movementVariant: 0, cutStart: 0, cutSeconds: 3, inHand: { frame: 'hold' } },
    { idx: 2, kind: 'user_video', source: 'client_photo', sourceFootageId: 'v', imageUrl: null, referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: null, movementVariant: 0, cutStart: 0, cutSeconds: 3 },
    { idx: 3, kind: 'place', source: 'client_photo', sourceFootageId: 'f2', imageUrl: 'https://sb.test/loja.jpg', referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: 'w', movementVariant: 2, cutStart: 0, cutSeconds: 3.5 },
  ]
  const out = v2.adsV2PresenterV2Shots(shots, photos)
  const before = TI.adsV2Credits('commercial', 15)
  return out.length === 4 && out.every((s, i) => s.idx === shots[i].idx && s.cutSeconds === shots[i].cutSeconds) && out.filter((s) => s.kind !== 'user_video').every((s) => s.kind === 'text' && s.source === 'client_photo' && !s.prompt && !s.effect && !s.inHand && /^https:/.test(s.imageUrl) && TI.routeShot(s.kind, 'commercial', 1, false) === null) &&
    out[2] === shots[2] && out[0].packshot === true && out[0].sourceFootageId === 'f1' && !out[1].packshot && out.every((s) => s.sourceFootageId !== 'f3') && shots[0].effect === 'glow' && before === TI.adsV2Credits('commercial', 15) &&
    v2.adsV2PresenterV2Shots(shots, []) === shots
}
await check('S4 os planos de IA viram as fotos do cliente paradas (zero motor; a de produto = packshot; foto de texto fora; vídeo do cliente igual; mesmos tempos); créditos do Comercial iguais', () => s4())
const s5 = (v2 = V2) => { const u = v2.adsV2PresenterV2Usd({ totalUsd: 1.243 }); return near(u.extraImagesUsd, 0.45) && near(u.checksUsd, 0.04) && near(u.totalUsd, 1.733) && v2.ADS_V2_PRESENTER_V2_IMAGE_USD === L()(F.tiers).ADS_V2_SCENE_IMAGE_USD }
await check('S5 o custo: o estimateAdUsd de sempre + 3 fotos a mais (US$ 0,45) + 4 checagens (US$ 0,04) — Comercial 15 s ≈ US$ 1,73 de teto', () => s5())

// ═══ T. travas ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. travas internas')
const t1 = (v2 = V2) => {
  const plan = { presenter: { productUrl: PRODUCT, v2: v2.planAdsV2PresenterV2({ entry: sofia, sector: 'other', performancePrompt: '' }) } }
  return v2.ADS_V2_PRESENTER_V2_MODE === 'internal' && v2.adsV2PresenterV2On(true) === true && v2.adsV2PresenterV2On(false) === false && v2.adsV2PresenterV2On(true, 'off') === false && v2.adsV2PresenterV2On(false, 'all') === true &&
    v2.adsV2PresenterV2Eligible({ on: true, tier: 'commercial', format: '9:16', style: null }) && !v2.adsV2PresenterV2Eligible({ on: false, tier: 'commercial', format: '9:16', style: null }) &&
    !v2.adsV2PresenterV2Eligible({ on: true, tier: 'cinema', format: '9:16', style: null }) && !v2.adsV2PresenterV2Eligible({ on: true, tier: 'photo_motion', format: '9:16', style: null }) &&
    !v2.adsV2PresenterV2Eligible({ on: true, tier: 'commercial', format: '4:5', style: null }) && !v2.adsV2PresenterV2Eligible({ on: true, tier: 'commercial', format: '9:16', style: 'glow' }) &&
    v2.adsV2PresenterV2Of(plan) === plan.presenter.v2 && v2.adsV2PresenterV2Of(plan, 'off') === null && v2.adsV2PresenterV2Of({ presenter: { productUrl: PRODUCT } }) === null && v2.adsV2PresenterV2Of(null) === null
}
await check("T1 ADS_V2_PRESENTER_V2_MODE = 'internal'; só conta interna, Comercial, 9:16, sem estilo; 'off' desliga até o pedido já planejado; sem v2 gravado = o ator de antes", () => t1())
const t2 = (src = rd(F.plan)) => src.includes("presenterV2Lib.adsV2PresenterV2Eligible({ on: presenterV2Lib.adsV2PresenterV2On(reason === 'internal'), tier: order.tier, format, style: plan.style ?? null })") &&
  rd(F.presenter).includes('ADS_V2_PRESENTER_PUBLIC = true') && !/ADS_V2_PRESENTER_V2_MODE[^\n]*'all'\s*$/m.test(rd(F.v2).split('\n').find((l) => l.startsWith('export const ADS_V2_PRESENTER_V2_MODE')) ?? '')
await check("T2 o /plan só monta o v2 para reason 'internal' (isAdsInternalEmail) e o elegível; clientes seguem no ator de antes (ADS_V2_PRESENTER_PUBLIC intocado)", () => t2())
const t3 = (v2src = rd(F.v2), advSrc = rd(F.advance)) => {
  const pureSrc = (s) => s.split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l))
  const pure = (f) => pureSrc(rd(f))
  return pureSrc(v2src) && pure(F.presenter) && advSrc.includes("import('@/lib/ads/v2PresenterV2')") && !/^import [^\n]*v2PresenterV2/m.test(advSrc) && !/^import [^\n]*v2PresenterV2/m.test(rd(F.plan).replace(/^import type[^\n]*$/gm, ''))
}
await check('T3 a lib nova é PURA (só import type) e o avanço/o /plan a carregam por import DINÂMICO (os guardiões antigos com lista fechada de módulos não quebram)', () => t3())

// ═══ D. desfaz, marca, encadeamento ══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, diff só nos arquivos da lista')
await check('D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-apresentador-v2-1710.mjs), é EXATAMENTE a origin/main f7b955806; a ida devolve o vivo; os novos existem e não existiam', () =>
  APRESENTADOR_V2_1710_ARQUIVOS.length === 11 && APRESENTADOR_V2_1710_ARQUIVOS.every((f) => base(f) !== null && semApresentadorV2_1710(f, rd(f)) === base(f) && comApresentadorV2_1710(f, base(f)) === rd(f) && !semApresentadorV2_1710(f, rd(f)).includes(MARCA)) &&
  MARCA_APRESENTADOR_V2_1710 === MARCA && APRESENTADOR_V2_1710_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; o diff contra a base só toca os arquivos da lista e os novos (cobrança, motor, TTS da casa, /audio, compose fora)', () => {
  const src = rd('scripts/test-support/desfaz-apresentador-v2-1710.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', APRESENTADOR_V2_1710_BASE, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const permitidos = new Set([...APRESENTADOR_V2_1710_ARQUIVOS, ...APRESENTADOR_V2_1710_NOVOS])
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.length > 0 && tocados.every((f) => permitidos.has(f)) &&
    ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ttsFallback.ts', 'lib/compose.ts', 'app/api/audio/generate/route.ts', 'lib/ads/v2Engines.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: o desfaz da grade do juiz (e, por ele, a cadeia toda) tira esta camada PRIMEIRO; texto sem a marca, arquivo fora da lista e null passam igual', () => {
  return APRESENTADOR_V2_1710_ARQUIVOS.filter((f) => f.startsWith('lib/')).every((f) => {
    const vivo = rd(f)
    const semEste = semApresentadorV2_1710(f, vivo)
    return desfazJuizGrade1610(f, vivo) === desfazJuizGrade1610(f, semEste) && semJuizGrade1610(f, vivo) === semJuizGrade1610(f, semEste) && desfazMaoJuiz1610(f, vivo) === desfazMaoJuiz1610(f, semEste) && desfazApresentadorV2_1710(f, base(f)) === base(f)
  }) && desfazApresentadorV2_1710(F.vision, rd(F.vision)) === rd(F.vision) && desfazApresentadorV2_1710(F.advance, null) === null && /reancorado KINEO-APRESENTADOR-V2-1710/.test(rd('scripts/test-juiz-grade-1610.mjs'))
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, rd(f)]))
const comV2 = (a, b) => L({ [F.v2]: trocar(SRC.v2, a, b) })(F.v2)
const comMO = (a, b) => L({ [F.montage]: trocar(SRC.montage, a, b) })(F.montage)
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
await mut('A: as referências trocam de ordem (produto primeiro)', () => a1(comV2('return [v2.portraitUrl, productUrl]', 'return [productUrl, v2.portraitUrl]')))
await mut('A: só a foto do produto vai como referência', () => a3(trocar(SRC.advance, 'pv ? pv.lib.adsV2PresenterV2Refs(pv.v2, actor.productUrl) : [actor.productUrl]', 'pv ? [actor.productUrl] : [actor.productUrl]')))
await mut('A: o v2 passa pela colagem da trava', () => a3(trocar(SRC.advance, 'const lock = pv ? null : adsV2LockOf(order, row)', 'const lock = adsV2LockOf(order, row)')))
await mut('B: o pedido sai com 1 imagem', () => a2(trocar(SRC.images, '{ num_images: ADS_V2_SCENE_IMAGE_MAX_OPTIONS }', '{ num_images: 1 }')))
await mut('B: a leitura da fal devolve só a 1ª', () => b1(trocar(SRC.shots, "...(pick === 'image' ? { urls } : {})", "...(pick === 'image' ? { urls: urls.slice(0, 1) } : {})")))
await mut('B: as 4 opções no MESMO arquivo', () => b2(trocar(SRC.images, "args.suffix : ''}", "'' : ''}")))
await mut('B: as opções não são gravadas no pedido', () => b3(trocar(SRC.advance, 'v2: { ...pv.v2, options, chosen: kept.indexOf(chosen), chosenWhy: pick.why }', 'v2: { ...pv.v2 }')))
await mut('C: volta a "mouth closed" com sorriso', () => c1(comV2("'Neutral mouth: lips relaxed, closed or only slightly parted; no smile showing teeth and no open mouth.'", "'Friendly smile, mouth closed.'")))
await mut('C: a outra mão some do prompt', () => c1(comV2('...(i.freeHand ? [ADS_V2_PRESENTER_V2_FREE_HAND] : [])', '...([])')))
await mut('C: o lugar do cliente é ignorado', () => c1(comV2('const place = adsV2PresenterV2SettingLine(i.setting)', 'const place = null as string | null')))
await mut('C: a caixa entra junto', () => c1(comV2(" leave the box out of the frame.", ' hold the box too.')))
await mut('C: o /plan pula a régua anti-invenção', () => c2(trocar(SRC.plan, 'if (v2 && checkV2Prompts([v2.prompt], extracted.brief).length === 0) {', 'if (v2) {')))
await mut('E: "frasco e caixa" deixa de descartar', () => e2(comV2("const clean = list.findIndex((b) => b === false)", 'const clean = 0')))
await mut('E: a checagem passa a exigir só o frasco', () => e1(comV2("return yes.some((p) => p.type === 'bottle') && yes.some((p) => p.type === 'box')", "return yes.some((p) => p.type === 'box')")))
await mut('E: "não sei" vale como limpa antes da limpa', () => e2(comV2("const clean = list.findIndex((b) => b === false)", 'const clean = list.findIndex((b) => b !== true)')))
await mut('E: o avanço escolhe sempre a 1ª', () => e3(trocar(SRC.advance, 'const pick = pv.lib.adsV2PresenterV2Pick(both)', "const pick = { index: 0, why: 'clean' as const }")))
await mut('V: PT-BR volta à voz de hoje', () => v1(comV2('pt: { woman: ADS_V2_PRESENTER_V2_PT_BR_VOICE,', 'pt: { woman: ADS_V2_PRESENTER_V2_CURRENT_VOICE,')))
await mut('V: outro voice id no PT-BR', () => v1(comV2("voiceId: 'Portuguese_ConfidentWoman'", "voiceId: 'Portuguese_SentimentalLady'")))
await mut('V: o apresentador vai à 02-hd', () => v2c(trocar(SRC.voice, "const model: string = args.model === TTS_28_MODEL ? TTS_28_MODEL : TTS_MODEL", 'const model: string = TTS_MODEL')))
await mut('V: a 2.8 recebe o texto em `text`', () => v2c(trocar(SRC.voice, '...(is28 ? { prompt: args.text } : { text: args.text })', '...({ text: args.text })')))
await mut('V: o language_boost exato é ignorado', () => v2c(trocar(SRC.voice, "typeof args.languageBoost === 'string' && args.languageBoost ? args.languageBoost : langBoost(args.language)", 'langBoost(args.language)')))
await mut('V: a voz clonada muda de corpo (ganha speed)', () => v2c(trocar(SRC.voice, '? { speed: args.speed } : {}', '? { speed: args.speed } : { speed: 1 }')))
await mut('V: o avanço ignora a língua do pedido', () => v3(trocar(SRC.advance, "narrationLanguage(order.language) ?? 'en', pv.v2.gender", "'en', pv.v2.gender")))
await mut('K: o corte ignora o fim da fala (clipe inteiro)', () => k1(comMO('const cut = finitePos(i.speechSeconds) ? r3(Math.min(i.speechSeconds + ADS_V2_PRESENTER_V2_SPEECH_PAD, room)) : room', 'const cut = room')))
await mut('K: sem a folga de 0,15 s', () => k1(comMO('export const ADS_V2_PRESENTER_V2_SPEECH_PAD = 0.15', 'export const ADS_V2_PRESENTER_V2_SPEECH_PAD = 0')))
await mut('S: o close some (cartão logo depois da fala)', () => k2(comMO('export const ADS_V2_PRESENTER_V2_CLOSE_SECONDS = 2', 'export const ADS_V2_PRESENTER_V2_CLOSE_SECONDS = 0')))
await mut('S: mais de 1 corte na fala', () => k2(comMO('export const ADS_V2_PRESENTER_V2_MAX_INSERTS = 1', 'export const ADS_V2_PRESENTER_V2_MAX_INSERTS = 3')))
await mut('S: a foto do produto vira insert no meio da fala', () => k2(comMO("const noPackshot = shots.map((s) => (s && s.kind === 'text' && s.packshot === true ? { ...s, url: '' } : s))", 'const noPackshot = shots')))
await mut('S: o v2 cai na montagem de antes', () => k2(comMO('if (presenter && presenter.v2) return buildAdV2PresenterV2Source(input, presenter, presenter.v2)', 'if (false) return buildAdV2PresenterV2Source(input, presenter, presenter.v2!)')))
await mut('S: os planos de IA continuam indo ao motor', () => s4(comV2("if (s.kind === 'user_video' || s.kind === 'text') return s", 'return s')))
await mut('T: o modo vira "all"', () => t1(comV2("export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'internal'", "export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'all'")))
await mut('T: o Premium entra', () => t1(comV2("export const ADS_V2_PRESENTER_V2_TIERS: readonly string[] = ['commercial']", "export const ADS_V2_PRESENTER_V2_TIERS: readonly string[] = ['commercial', 'cinema']")))
await mut("T: 'off' não desliga o já planejado", () => t1(comV2("if (mode === 'off' || !plan || typeof plan !== 'object') return null", "if (!plan || typeof plan !== 'object') return null")))
await mut('T: o /plan monta o v2 para qualquer conta', () => t2(trocar(SRC.plan, "presenterV2Lib.adsV2PresenterV2On(reason === 'internal')", 'presenterV2Lib.adsV2PresenterV2On(true)')))
await mut('T: a lib nova importa valor', () => t3(trocar(SRC.v2, "import type { AdsV2PlannedShot } from '@/lib/ads/v2ShotLists'", "import { type AdsV2PlannedShot, ADS_V2_CARD_SECONDS } from '@/lib/ads/v2ShotLists'")))
await mut('T: o avanço importa a lib nova estaticamente', () => t3(undefined, trocar(SRC.advance, '// ── KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (2 referências', "import { adsV2PresenterV2Of } from '@/lib/ads/v2PresenterV2'\n// ── KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (2 referências")))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
