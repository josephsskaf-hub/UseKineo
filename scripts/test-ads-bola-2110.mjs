// KINEO-ADS-BOLA-2110 — guardião dos consertos do anúncio "— bola de futebol" (fundador 21/10: "o ads que eu tentei está horrível, descobre porquê").
// Diagnóstico: docs/ADS-BOLA-DIAGNOSTICO-2026-10-21.md (pedido 618a6680-5e8d-4445-804d-376c6c993c69, conta do fundador, apresentador v2 "jade", 41 cr).
// Roda com `node scripts/test-ads-bola-2110.mjs` da raiz, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do repo pelo
// carregador offline da casa (o modelo de texto é um dublê com as respostas do caso real).
//
// O que prova, com os DADOS REAIS do pedido 618a6680 (brief, frase colada cortada no caractere 400, recorte 9:16 1080×1920 feito de uma miniatura
// 225×225, voz medida 7,668 s, 4 opções com 3/2/2/5 mãos):
//   B  NOME: "— bola de futebol", "Perfume LUME —", "perfume num hotel com chuva —", "— estátua colecionável" (Pedro/Universo) e "Amazon.com — …" saem limpos
//      no brief (formato antigo OU {name, sells}), no brandName, na regra da 1ª frase de tela e no título da Biblioteca; o plano inteiro do caso real
//      (extractAdsV2Brief com o modelo dublê) aceita "Bola de futebol" na tela — na base ele recusava e exigia o travessão;
//   I  INSTRUÇÃO: o prompt colado vira o PRODUTO ("bola de futebol"), o tipo "produto" (nunca "lugar" com foto de produto sem a escolha), o título do cartão
//      "Bola de futebol" (nunca "Crie uma propaganda de 15 segundos"); a narração cortada NÃO vai verbatim; a narração inteira vai; frase comum intocada;
//   C  FOTO: o apresentador v2 usa a foto INTEIRA (original_url) como referência e como close (o montador encaixa em "contain"); o tamanho real
//      (225×225) é medido dos primeiros bytes e dispara o aviso de foto pequena (< 500 px), com os textos para a tela;
//   P  ESCOLHA: produto inteiro decide antes das mãos; cortado na borda (pela visão ou pelo retângulo) perde; a pergunta das mãos pergunta "product_whole";
//   D  DURAÇÃO: a régua pela voz medida (PT 22–24, EN 19–21 como antes), a folga de 2, a pontuação fora da contagem, e a voz CURTA do caso real (7,668 s)
//      ganha a frase a mais e desacelera até o anúncio fechar ≥ 14,5 s; a voz longa continua acelerando/cortando como antes;
//   E  MEDIÇÃO: o /plan grava as fotos REAIS (photos/product_photos) no ads_v2_plan_served; o ads_v2_order_created continua igual (painéis intactos);
//   R  NA BASE (9415fa5dd) as mesmas provas ficam VERMELHAS;
//   X  desfaz exato + marca em toda linha + encadeamento (a cabeça das cadeias tira esta camada primeiro) + novos;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAdsBola2110, ADS_BOLA_2110_ARQUIVOS, ADS_BOLA_2110_NOVOS, ADS_BOLA_2110_BASE, MARCA_ADS_BOLA_2110 } from './test-support/desfaz-ads-bola-2110.mjs'
import { semDesenhoNota9_2110 } from './test-support/desfaz-desenho-nota9-2110.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const baseCache = new Map()
const base = (p) => { if (!baseCache.has(p)) { let t = null; try { t = lf(git('show', `${ADS_BOLA_2110_BASE}:${p}`)) } catch { t = null } baseCache.set(p, t) } return baseCache.get(p) }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const vermelho = async (fn) => { try { return !(await fn()) } catch (e) { if (/^mutante /.test(String(e && e.message))) throw e; return true } }

// ── o caso real (pedido 618a6680) ────────────────────────────────────────────────────────────────────────────────────────
const REAL = {
  sentence: 'Crie uma propaganda de 15 segundos, em português do Brasil, para a bola de futebol da foto. Mostre os detalhes da bola, um jogador preparando o chute e a bola entrando no gol. Use um visual esportivo, com energia e iluminação de estádio. Preserve as cores e o desenho do produto. Narração: “O jogo começa com uma bola. O próximo golaço pode ser seu. Chame seus amigos, entre em campo e faça o jogo a',
  business: '— bola de futebol',
  narration: 'Conheça — bola de futebol, o lugar ideal para quem ama futebol. Aqui você encontra tudo para o seu jogo!',
  overlays: ['— bola de futebol', 'Tudo para o seu jogo!'],
  photos: [{ url: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/user-footage/e92d81bf-0068-46c3-8de7-1f67e2006756/clip-1792585796293.jpg', kind: 'product', footage_id: '54348065-58b1-4766-baac-bb54ff2982a0', original_url: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/user-footage/e92d81bf-0068-46c3-8de7-1f67e2006756/clip-1792585799335.jpg', original_footage_id: '2de2c236-a0e5-44ae-a4d0-fc8484d93275' }],
  voiceSeconds: 7.668,
  // ads_v2_product_locked do pedido: free_hands [false,true,true,false], hand_counts [3,2,2,5], both_objects todos false, phone_ui todos "no"
  options: { both: [false, false, false, false], freeHands: [false, true, true, false], phoneUi: ['no', 'no', 'no', 'no'], handCounts: [3, 2, 2, 5] },
  // medido nos arquivos reais (scratchpad ads-bola/): product_original.jpg 225×225; product.jpg (o recorte 9:16) 1080×1920
  originalSize: { width: 225, height: 225 },
  cropSize: { width: 1080, height: 1920 },
}
// Cabeçalho JPEG sintético (SOI + APP0 + SOF0) com as medidas reais — a foto do Google não entra no repo.
const jpegHead = (w, h) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xda, 0x00, 0x0c])
const pngHead = (w, h) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, w >>> 24, (w >>> 16) & 255, (w >>> 8) & 255, w & 255, h >>> 24, (h >>> 16) & 255, (h >>> 8) & 255, h & 255, 8, 6, 0, 0, 0])

const F = {
  bola: 'lib/ads/v2BolaFix.ts', auto: 'lib/ads/autoBrief.ts', brief: 'lib/ads/v2Brief.ts', simple: 'lib/ads/v2Simple.ts', scene: 'lib/ads/v2Scene.ts',
  presenter: 'lib/ads/v2Presenter.ts', v2: 'lib/ads/v2PresenterV2.ts', advance: 'lib/ads/v2Advance.ts', plan: 'lib/ads/v2PlanCore.ts', post: 'lib/ads/v2PostDeliveryServer.ts',
  close: 'lib/ads/v2CloseReal.ts', edit: 'app/api/ads/v2/edit/route.ts', script: 'lib/ads/scriptPrompt.ts', montage: 'lib/ads/adV2Montage.ts', orders: 'app/api/ads/v2/orders/route.ts',
}
// O modelo de texto dublê: a extração do brief responde no formato ANTIGO com o travessão do caso real (o pior caso); o texto responde limpo.
const COPY_OK = { narration: 'Conheça a bola de futebol feita para quem vive o jogo. Ela acompanha cada passe e cada chute com firmeza. Peça a sua agora mesmo!', overlays: ['Bola de futebol', 'Para o seu jogo'], sector: 'store' }
function fakeOpenai(briefJson, copyJson) {
  const calls = []
  return { calls, mod: { openai: { chat: { completions: { create: async (body) => { const sys = String(body.messages[0].content); calls.push(sys); const raw = /structured ad brief/.test(sys) ? briefJson : copyJson; return { choices: [{ message: { content: JSON.stringify(raw) } }] } } } } } } }
}
/** O loader: `over` = { arquivo: texto } (mutantes); onBase = as fontes da base 9415fa5dd. */
const loader = ({ over = {}, onBase = false, mocks = {} } = {}) => {
  const load = createOfflineLoader({ mocks, source: (r, text) => (over[r] !== undefined ? over[r] : onBase ? (base(r) ?? text) : text) })
  load.text = (p) => (over[p] !== undefined ? lf(over[p]) : onBase ? (base(p) ?? rd(p)) : rd(p))
  load.withMocks = (m) => loader({ over, onBase, mocks: { ...mocks, ...m } })
  return load
}

// ═══ as provas (cada uma recebe um loader; a seção R roda as MESMAS na base) ════════════════════════════════════════════
const provas = {
  async nomeLimpo(L) {
    const B = L(F.brief)
    const casos = [['— bola de futebol', 'bola de futebol'], ['Perfume LUME —', 'Perfume LUME'], ['perfume num hotel com chuva —', 'perfume num hotel com chuva'], ['— estátua colecionável', 'estátua colecionável'], ['Amazon.com — mini portable thermal printer', 'mini portable thermal printer'], ['Perfume LUME — Fragrâncias', 'Perfume LUME']]
    return casos.every(([b, want]) => B.brandName({ business: b }) === want)
  },
  async briefLimpo(L) {
    const A = L(F.auto)
    const velho = A.parseAutoBrief(JSON.stringify({ business: REAL.business, offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }), 'bola de futebol', 'pt').brief.business
    const novo = A.parseAutoBrief(JSON.stringify({ name: '', sells: 'bola de futebol', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }), 'bola de futebol', 'pt').brief.business
    const doisLados = A.parseAutoBrief(JSON.stringify({ name: 'Perfume LUME', sells: 'eau de parfum', cta: 'buy' }), 'Perfume LUME eau de parfum', 'pt').brief.business
    const loja = A.parseAutoBrief(JSON.stringify({ name: 'Amazon.com', sells: 'mini portable thermal printer', cta: 'buy' }), 'Amazon.com : mini portable thermal printer', 'en').brief.business
    const so = A.parseAutoBrief(JSON.stringify({ name: 'Perfume LUME', sells: '', cta: 'buy' }), 'Perfume LUME', 'pt').brief.business
    const msgs = A.buildAutoBriefMessages('bola de futebol', 'Brazilian Portuguese').system
    return velho === 'bola de futebol' && novo === 'bola de futebol' && doisLados === 'Perfume LUME — eau de parfum' && loja === 'mini portable thermal printer' && so === 'Perfume LUME' &&
      /"name":"","sells":""/.test(msgs) && !/<business name> — <what it sells>/.test(msgs)
  },
  async regraDaTela(L) {
    const B = L(F.brief)
    const brief = { business: REAL.business, offer: '', cta: 'visit', contact: '', language: 'pt', tone: 'warm', audience: '', extra: {} }
    const sys = B.buildV2CopyMessages(brief, 'Brazilian Portuguese', { maxWords: 26, narration: true }).system
    const r = B.checkV2Copy(JSON.stringify({ narration: COPY_OK.narration, overlays: ['Bola de futebol', 'Para o seu jogo'], sector: 'store' }), brief, { maxWords: 26, narration: true, minWords: 5 })
    return /1st = the business name exactly as "bola de futebol"/.test(sys) && !/"— bola/.test(sys) && r.ok === true
  },
  async tituloBiblioteca(L) {
    const src = L.text(F.advance)
    const post = L.text(F.post)
    const fix = L(F.bola)
    return /function businessName\(order: AdsV2OrderRow\): string \{\n[^\n]*\n  return adsV2BusinessName\(b\)\.slice\(0, 120\) \|\| 'Studio Ads'/.test(src) && /return adsV2BusinessName\(b\)\.slice\(0, 120\) \|\| 'Studio Ads'/.test(post) &&
      /business: adsV2BusinessName\(str\(brief\.business\) \?\? ''\)/.test(L.text(F.edit)) && /return adsV2BusinessName\(typeof business === 'string' \? business : ''\)/.test(L.text(F.close)) &&
      fix.adsV2BusinessName('— estátua colecionável') === 'estátua colecionável' && fix.adsV2BusinessName('Amazon.com') === '' && fix.adsV2BusinessName('Coca-Cola') === 'Coca-Cola'
  },
  async planoReal(L) {
    // o plano do caso real com o modelo dublê: brief no formato antigo com o travessão + texto limpo; régua do apresentador v2 PT
    const S = L(F.simple)
    const ins = S.adsV2ReadInstruction(REAL.sentence)
    const fake = fakeOpenai({ business: REAL.business, offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }, COPY_OK)
    const B = L.withMocks({ '@/lib/openai': fake.mod })(F.brief)
    const text = ins.product
    const r = await B.extractAdsV2Brief({ text, language: 'pt', languageName: 'Brazilian Portuguese', maxWords: 24, narration: true, overlays: true, facts: [], sentence: text, productPhoto: true, presenter: true, typed: text, deadlineMs: Date.now() + 30000, speechMinExact: 22, speechSentences: 'two or three short, calm spoken sentences', presenterTalk: true, acceptMaxWords: 26, scripts: false, scene: null })
    return r.ok === true && r.brief.business === 'bola de futebol' && r.copy.overlays[0] === 'Bola de futebol' && !/—/.test(r.copy.narration) && r.ad && r.ad.product === true && fake.calls.length === 2
  },
  async instrucao(L) {
    const S = L(F.simple)
    const SC = L(F.scene)
    const ins = S.adsV2ReadInstruction(REAL.sentence)
    const en = S.adsV2ReadInstruction('Create a 15-second ad for the soccer ball in the photo. Narration: "Every game starts with a ball. The next goal could be yours."')
    return ins && ins.product === 'bola de futebol' && ins.narrationComplete === false && /^O jogo começa com uma bola\./.test(ins.narration) &&
      S.simpleTitle(REAL.sentence) === 'Bola de futebol' && SC.adsV2ProductTitle(REAL.sentence, 'product') === 'Bola de futebol' && SC.adsV2ProductTitle(REAL.sentence, 'place') === 'Bola de futebol' &&
      SC.adsV2AdKind(REAL.sentence) === 'product' &&
      en && en.product === 'soccer ball' && en.narrationComplete === true && S.adsV2InstructionNarrationFits(en, { min: 5, max: 30 }) === true && S.adsV2InstructionNarrationFits(ins, { min: 5, max: 30 }) === false &&
      S.simpleTitle('Amazon.com : mini portable thermal printer') === 'mini portable thermal printer'
  },
  async fraseComumIntocada(L) {
    const S = L(F.simple), SC = L(F.scene)
    const Sb = loader({ onBase: true })(F.simple), SCb = loader({ onBase: true })(F.scene)
    const frases = ['LUME eau de parfum, a light floral scent that lasts all day', 'Espaço comercial à venda ou para alugar no Edifício Villa Versace, em Moema, São Paulo', 'Make your video with us — video production studio in Miami', 'perfume num hotel com chuva', 'Loja de perfumes no centro', 'Pizzaria do Zé, a melhor pizza da cidade', 'Café Ultra Coffee 250g']
    return frases.every((f) => S.simpleTitle(f) === Sb.simpleTitle(f) && SC.adsV2AdKind(f) === SCb.adsV2AdKind(f) && SC.adsV2ProductTitle(f, 'product') === SCb.adsV2ProductTitle(f, 'product') && S.adsV2ReadInstruction(f) === null)
  },
  async tipoComFoto(L) {
    const SC = L(F.scene)
    const fixed = SC.adsV2KindWithProductPhoto({ kind: 'place', sentence: REAL.sentence, mode: 'simple' }, REAL.photos)
    const escolhido = SC.adsV2KindWithProductPhoto({ kind: 'place', kind_chosen: true, sentence: REAL.sentence }, REAL.photos)
    const semFoto = SC.adsV2KindWithProductPhoto({ kind: 'place', sentence: REAL.sentence }, [{ kind: 'place' }])
    const comum = { kind: 'place', sentence: 'Perfume LUME' }
    return fixed.kind === 'product' && fixed.kind_fixed === 'instruction_product_photo' && escolhido.kind === 'place' && semFoto.kind === 'place' && SC.adsV2KindWithProductPhoto(comum, REAL.photos) === comum &&
      /const brief0 = adsV2KindWithProductPhoto\(order\.brief \?\? \{\}, input\.photos\)/.test(L.text(F.plan)) && L.text('lib/ads/v2SceneServer.ts').includes("if (parsed.kind && (body as Record<string, unknown> | null)?.kind_chosen === true) fields.kind_chosen = true")
  },
  async fotoInteira(L) {
    const P = L(F.presenter), V = L(F.v2)
    const pl = P.planAdsV2Presenter({ sector: 'store', photos: REAL.photos, seedKey: '618a6680-5e8d-4445-804d-376c6c993c69', presenterId: 'jade' })
    const semOrig = P.planAdsV2Presenter({ sector: 'store', photos: [{ ...REAL.photos[0], original_url: undefined }], seedKey: 'x' })
    const adv = L.text(F.advance)
    const montage = L.text(F.montage)
    return pl.productUrl === REAL.photos[0].url && pl.productOriginalUrl === REAL.photos[0].original_url && P.isAdsV2PresenterPlan(pl) &&
      V.adsV2PresenterV2ProductSource(pl) === REAL.photos[0].original_url && V.adsV2PresenterV2ProductSource(semOrig) === REAL.photos[0].url && semOrig.productOriginalUrl === undefined &&
      /pv\.lib\.adsV2PresenterV2Refs\(pv\.v2, pv\.lib\.adsV2PresenterV2ProductSource\(actor\) \?\? actor\.productUrl\)/.test(adv) &&
      /const presenterV2Close = presenterV2 \? \(\(await presenterV2Lib\(\)\)\?\.adsV2PresenterV2ProductSource\(presenterV2\) \?\? presenterV2\.productUrl\) : null/.test(adv) && /closeUrl: presenterV2Close \?\? presenterV2\.productUrl/.test(adv) &&
      /adsV2PackshotElements\(v2\.closeUrl,/.test(montage) && /source, fit: 'contain'/.test(montage) &&
      V.adsV2PresenterV2Prompt({ look: 'a woman', pronoun: 'She', sector: 'store', freeHand: true }).includes(V.ADS_V2_PRESENTER_V2_WHOLE_PRODUCT)
  },
  async fotoPequena(L) {
    const X = L(F.bola)
    const o = X.adsV2ImageSizeFromHead(jpegHead(REAL.originalSize.width, REAL.originalSize.height))
    const c = X.adsV2ImageSizeFromHead(jpegHead(REAL.cropSize.width, REAL.cropSize.height))
    const png = X.adsV2ImageSizeFromHead(pngHead(640, 480))
    let pedido = null
    const medido = await X.adsV2MeasureImage(REAL.photos[0].original_url, async (u, init) => { pedido = { u, range: init?.headers?.Range }; return { ok: true, body: null, arrayBuffer: async () => jpegHead(225, 225).buffer } })
    const txt = X.adsV2ProductPhotoSmallText('pt', o)
    const plan = L.text(F.plan)
    return o.width === 225 && o.height === 225 && c.width === 1080 && c.height === 1920 && png.width === 640 && X.adsV2ProductPhotoSmall(o) === true && X.adsV2ProductPhotoSmall(c) === false && X.adsV2ProductPhotoSmall(null) === false &&
      medido && medido.width === 225 && pedido.u === REAL.photos[0].original_url && /^bytes=0-/.test(pedido.range) && /225×225 px/.test(txt.body) && txt.confirm && X.ADS_V2_PRODUCT_PHOTO_MIN_SIDE === 500 &&
      /adsV2MeasureImage\(productPhoto\.original_url \?\? productPhoto\.url\)/.test(plan) && /v2Fail\('product_photo_small', 422/.test(plan) && X.ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED === false
  },
  async escolha(L) {
    const V = L(F.v2)
    const real = V.adsV2PresenterV2PickWhole({ ...REAL.options, productWhole: ['no', 'no', 'no', 'no'] })
    const inteira = V.adsV2PresenterV2PickWhole({ both: [false, false], freeHands: [false, true], phoneUi: ['no', 'no'], handCounts: [3, 2], productWhole: ['yes', 'no'] })
    const borda = V.adsV2PresenterV2PickWhole({ both: [false, false], freeHands: [true, false], phoneUi: ['no', 'no'], handCounts: [2, 2], productWhole: ['yes', 'yes'], rects: [{ x0: 0.5, y0: 0.4, x1: 1, y1: 0.7 }, { x0: 0.3, y0: 0.4, x1: 0.7, y1: 0.7 }] })
    const maos = V.adsV2PresenterV2PickWhole({ both: [false, false, false], freeHands: [false, false, true], phoneUi: ['no', 'no', 'no'], handCounts: [5, 2, 2], productWhole: ['yes', 'yes', 'yes'] })
    const descartada = V.adsV2PresenterV2PickWhole({ both: [true, false], freeHands: [true, false], phoneUi: ['no', 'no'], handCounts: [2, 3], productWhole: ['yes', 'no'] })
    const parsed = V.adsV2PresenterV2ParseHands('{"product_whole":"no","hand_count":2,"hands":[{"holding_product":"yes","whole":"yes"},{"holding_product":"no","whole":"yes"}],"phone_ui":"no"}')
    return real.index === 1 && real.why === 'all_cut' && inteira.index === 0 && borda.index === 1 && maos.index === 2 && maos.why === 'clean_free_hand' && descartada.index === 1 && descartada.why === 'all_cut' &&
      parsed.productWhole === 'no' && V.adsV2PresenterV2ProductWholeOf(parsed) === 'no' && /"product_whole"/.test(V.ADS_V2_PRESENTER_V2_HANDS_QUESTION) &&
      /pv\.lib\.adsV2PresenterV2PickWhole\(\{ both, freeHands: hands, phoneUi, productWhole: whole/.test(L.text(F.advance))
  },
  async duracao(L) {
    const V = L(F.v2), S = L(F.script)
    const pt = V.adsV2PresenterV2Words(30, { language: 'pt', gender: 'woman' }), en = V.adsV2PresenterV2Words(30, { language: 'en', gender: 'woman' }), legado = V.adsV2PresenterV2Words(30)
    const fit = V.adsV2PresenterV2VoiceFit({ seconds: REAL.voiceSeconds, text: REAL.narration, canSpeed: true, language: 'pt' })
    // a projeção do anúncio: voz estimada (palavras × s/palavra + pausa) ÷ speed + 0,15 + close 2 + cartão 2,5
    const per = REAL.voiceSeconds / 19
    const projected = (REAL.voiceSeconds + 3 * per + V.ADS_V2_PRESENTER_V2_SENTENCE_PAUSE_SECONDS) / (fit.speed || 1) + 0.15 + 2 + 2.5
    const longa = V.adsV2PresenterV2VoiceFit({ seconds: 11.2, text: 'Uma frase. Outra frase do meio. A última frase.', canSpeed: true, language: 'pt' })
    const certa = V.adsV2PresenterV2VoiceFit({ seconds: 10.3, text: 'Uma frase completa e bonita.', canSpeed: true, language: 'pt' })
    const rahul = V.adsV2PresenterV2VoiceFit({ seconds: 6.348, text: 'Here is LUME — captivating perfumes that evoke emotion. Discover your signature fragrance.', canSpeed: false, language: 'en' })
    return pt.min === 22 && pt.max === 24 && en.min === 19 && en.max === 21 && legado.min === 19 && legado.max === 21 && V.adsV2PresenterV2AcceptMax(24) === 26 && V.adsV2PresenterV2AcceptMax(21) === 23 &&
      S.countWords(REAL.narration) === 19 && S.countWords('Conheça — bola … !') === 2 &&
      fit.action === 'extend' && fit.speed === 0.93 && fit.text === `${REAL.narration} Peça agora mesmo.` && projected >= 14.5 &&
      longa.action === 'speed' && longa.speed === 1.07 && certa.action === 'ok' &&
      rahul.action === 'extend' && rahul.speed === 1 && /Order yours today\. Get it now\.$/.test(rahul.text) &&
      /adsV2PresenterV2VoiceFit\(\{ seconds: voiceSeconds, text: narration, canSpeed: voice\.engine === 'minimax', language: narrationLanguage\(order\.language\) \?\? 'en' \}\)/.test(L.text(F.advance)) &&
      /adsV2PresenterV2Words\(adsV2NarrationMaxWords\(order\.seconds\), \{ language, gender:/.test(L.text(F.plan))
  },
  async verbatim(L) {
    const fake = fakeOpenai({ name: '', sells: 'soccer ball', cta: 'buy' }, { narration: 'Meet the soccer ball made for the whole match. It handles every pass and every shot. Get yours today!', overlays: ['Soccer ball', 'Made for every match'], sector: 'store' })
    const B = L.withMocks({ '@/lib/openai': fake.mod })(F.brief)
    const said = 'Every game starts with a ball. The next goal could be yours. Call your friends and own the field today.'
    const r = await B.extractAdsV2Brief({ text: `soccer ball\nNarration written by the customer: ${said}`, language: 'en', languageName: 'English', maxWords: 21, narration: true, overlays: true, facts: [], sentence: 'soccer ball', productPhoto: true, presenter: true, typed: `soccer ball\nNarration written by the customer: ${said}`, deadlineMs: Date.now() + 30000, speechMinExact: 19, speechSentences: 'two or three short, calm spoken sentences', presenterTalk: true, acceptMaxWords: 23, scripts: false, scene: null, narrationVerbatim: said })
    const plan = L.text(F.plan)
    return r.ok === true && r.copy.narration === said && r.honestyFixes.includes('customer_narration_verbatim') && /\.\.\.\(narrationVerbatim \? \{ narrationVerbatim \} : \{\}\)/.test(plan) &&
      /const sentenceCopy = instruction \? instruction\.product \?\?/.test(plan) && /const instruction = simple \? adsV2ReadInstruction\(sentenceFull\) : null/.test(plan)
  },
  async medicao(L) {
    const plan = L.text(F.plan)
    const orders = L.text(F.orders)
    return /Object\.assign\(modeTag, \{ photos: photos\.length, product_photos: photos\.filter\(\(p\) => p\.kind === 'product'\)\.length/.test(plan) &&
      /order_id: orderId, tier: o\.tier, seconds: o\.seconds, sector: o\.sector, has_link: Boolean\(o\.link\), has_sentence: Boolean\(o\.sentence\), narration: o\.narration, photos: photos\.length, credits,/.test(orders) &&
      orders === base(F.orders) && /photos: photos\.length, product_photos/.test(plan)
  },
}

// ═══ seções ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
const L = loader()
console.log('\nB. o nome do negócio sem travessão solto (brief, brandName, 1ª frase de tela, Biblioteca) e o plano do caso real')
await check('B1 brandName: "— bola de futebol"/"Perfume LUME —"/"perfume num hotel com chuva —"/"— estátua colecionável"/"Amazon.com — …" limpos', () => provas.nomeLimpo(L))
await check('B2 o brief: formato antigo com travessão OU {name, sells} = "bola de futebol"; "<nome> — <o que vende>" só com os dois; loja de terceiros nunca é a marca', () => provas.briefLimpo(L))
await check('B3 a regra da 1ª frase de tela pede "bola de futebol" (nunca o travessão) e aceita "Bola de futebol"', () => provas.regraDaTela(L))
await check('B4 o título da Biblioteca, das versões, do editor e do cartão do Close real passam pela MESMA limpeza', () => provas.tituloBiblioteca(L))
await check('B5 o plano do caso real (modelo dublê com "— bola de futebol"): brief limpo, tela "Bola de futebol", anúncio de PRODUTO', () => provas.planoReal(L))
console.log('\nI. o texto-instrução (o prompt colado)')
await check('I1 produto "bola de futebol", tipo produto, título "Bola de futebol" (nunca "Crie uma propaganda…"); narração cortada fica de fora; a inteira (EN) cabe', () => provas.instrucao(L))
await check('I2 frase comum (perfume, imóvel, estúdio de vídeo, cena, loja, pizzaria, café 250g): título e tipo IGUAIS à base', () => provas.fraseComumIntocada(L))
await check('I3 "lugar" num texto-instrução com foto de produto volta a produto; a escolha explícita e a frase comum ficam; o /plan usa', () => provas.tipoComFoto(L))
await check('I4 a narração inteira da pessoa vai VERBATIM no roteiro principal; o /plan passa o produto e a narração', () => provas.verbatim(L))
console.log('\nC. a foto INTEIRA do produto no apresentador v2 + a foto pequena')
await check('C1 o apresentador v2 usa original_url como referência e como close ("contain" no montador); o prompt pede o produto inteiro no quadro', () => provas.fotoInteira(L))
await check('C2 225×225 medido dos primeiros bytes (o recorte 1080×1920 esconde) = foto pequena (< 500 px), com os textos para a tela; trava suave desligada', () => provas.fotoPequena(L))
console.log('\nP. a escolha da foto: produto inteiro primeiro, depois as 2 mãos')
await check('P1 caso real (4 cortadas, 3/2/2/5 mãos) = opção 1 "all_cut"; inteira vence cortada; borda perde; 2 mãos confirmadas desempatam; a pergunta tem product_whole', () => provas.escolha(L))
console.log('\nD. a duração: régua pela voz medida e a voz curta corrigida antes da montagem')
await check('D1 PT 22–24, EN 19–21 (igual), folga de 2; travessão não conta; 7,668 s → +1 frase e speed 0,93 → anúncio ≥ 14,5 s; voz longa como antes', () => provas.duracao(L))
console.log('\nE. a medição')
await check('E1 o /plan grava as fotos reais (photos, product_photos); o ads_v2_order_created fica igual', () => provas.medicao(L))

console.log('\nR. na base (9415fa5dd) as mesmas provas são VERMELHAS')
const LB = loader({ onBase: true })
for (const [nome, fn] of Object.entries(provas)) {
  if (nome === 'fraseComumIntocada' || nome === 'medicao') continue // compara com a própria base / só confere que nada mudou
  await check(`R ${nome} vermelha na base`, () => vermelho(() => fn(LB)))
}

// ═══ X. desfaz exato + encadeamento + novos ═════════════════════════════════════════════════════════════════════════════
console.log('\nX. desfaz exato, marca em toda linha, encadeamento, novos')
await check('X1 desfeita esta camada, cada arquivo tocado é EXATAMENTE a base 9415fa5dd', () => ADS_BOLA_2110_ARQUIVOS.every((p) => { const b = base(p); const s = semAdsBola2110(rd(p), p); if (s !== b) console.log('       difere:', p); return b !== null && s === b }))
await check('X2 a cadeia: semDesenhoNota9_2110 tira esta camada primeiro (lib/ads/v2Brief.ts volta à base pela cabeça)', () => semDesenhoNota9_2110(rd(F.brief), F.brief) === base(F.brief) && semDesenhoNota9_2110(rd(F.v2), F.v2) === base(F.v2))
await check('X3 a camada não toca a tela (components/, app/**/*.tsx), lib/engineWall.ts nem lib/homeVideoCuration.ts (outra sessão refaz a tela do Ads)', () => {
  const all = [...ADS_BOLA_2110_ARQUIVOS, ...ADS_BOLA_2110_NOVOS]
  return all.length > 0 && !all.some((p) => p.startsWith('components/') || (p.startsWith('app/') && p.endsWith('.tsx')) || p === 'lib/engineWall.ts' || p === 'lib/homeVideoCuration.ts')
})
await check('X4 os novos existem e não existiam na base', () => ADS_BOLA_2110_NOVOS.every((p) => existsSync(join(ROOT, p)) && base(p) === null))
await check('X5 toda linha diferente da base nos arquivos tocados carrega a marca (o desfaz só tira linha marcada)', () => ADS_BOLA_2110_ARQUIVOS.every((p) => { const b = new Set(base(p).split('\n')); return rd(p).split('\n').every((l) => b.has(l) || l.includes(MARCA_ADS_BOLA_2110)) }))
await check('X6 v2Simple, v2Presenter e v2PresenterV2 continuam SEM import de valor (os guardiões antigos os carregam crus)', () => [F.simple, F.presenter, F.v2].every((p) => !/^import (?!type )/m.test(rd(p))))

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (todos aplicados e vermelhos)')
const mut = async (nome, arquivo, a, b, prova) => {
  let over
  try { over = { [arquivo]: trocar(rd(arquivo), a, b) } } catch (e) { ok(false, `M ${nome}: ${e.message}`); return }
  await check(`M ${nome}`, () => vermelho(() => prova(loader({ over }))))
}
await mut('travessão da FRENTE volta (limpeza só atrás)', F.bola, "const EDGE_JUNK = /^[\\s—–\\-−‐‒―:;,|·•/\\\\]+|[\\s—–\\-−‐‒―:;,|·•/\\\\]+$/gu", "const EDGE_JUNK = /[\\s—–\\-−‐‒―:;,|·•/\\\\]+$/gu", provas.nomeLimpo)
await mut('o brief volta a gravar p.business cru', F.auto, "const business = keep('business', composed.slice(0, ADS_BRIEF_LIMITS.business))", "const business = keep('business', String(p.business ?? '').slice(0, ADS_BRIEF_LIMITS.business))", provas.briefLimpo)
await mut('loja de terceiros vira marca', F.simple, 'export function adsV2IsMarketplace(name: unknown): boolean {', 'export function adsV2IsMarketplace(name: unknown): boolean { return false', provas.briefLimpo)
await mut('o título da Biblioteca volta ao split antigo', F.advance, "  return adsV2BusinessName(b).slice(0, 120) || 'Studio Ads'", "  return b.split(/\\s+[—–-]\\s+/)[0].trim().slice(0, 120) || 'Studio Ads'", provas.tituloBiblioteca)
await mut('instrução não é reconhecida', F.simple, '  if (!adsV2LooksLikeInstruction(t)) return null', '  if (t) return null', provas.instrucao)
await mut('o tipo ignora a instrução', F.scene, "  if (ins) return ins.product && !adsV2LooksLikeInstruction(ins.product) ? adsV2AdKind(ins.product) : 'product'", "  if (ins && false) return 'product'", provas.instrucao)
await mut('narração cortada passa como inteira', F.simple, '    if (close > 0) { narration = rest.slice(1, close); complete = true } else narration = rest.slice(1)', '    if (close > 0) { narration = rest.slice(1, close); complete = true } else { narration = rest.slice(1); complete = true }', provas.instrucao)
await mut('"lugar" com foto de produto não volta', F.scene, "  return { ...b, kind: 'product', kind_fixed: 'instruction_product_photo' } as T", '  return brief', provas.tipoComFoto)
await mut('a narração verbatim é ignorada', F.brief, "{ finalMain.copy = { ...finalMain.copy, narration: args.narrationVerbatim.replace(/\\s+/g, ' ').trim() }; honestyFixes = [...honestyFixes, 'customer_narration_verbatim'] }", '{ }', provas.verbatim)
await mut('a foto inteira não entra no plano do apresentador', F.presenter, "photo.original_url.trim() !== photo.url.trim() ? { productOriginalUrl: photo.original_url.trim() } : {}", "false ? { productOriginalUrl: photo.original_url.trim() } : {}", provas.fotoInteira)
await mut('a fonte do produto prefere o recorte', F.v2, '  if (HTTPS_RE.test(o)) return o', '  if (HTTPS_RE.test(o) && false) return o', provas.fotoInteira)
await mut('o leitor de JPEG não acha o SOF', F.bola, "      if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return ok(be16(i + 7), be16(i + 5))", "      if (mk === 0xc2) return ok(be16(i + 7), be16(i + 5))", provas.fotoPequena)
await mut('o limite da foto pequena vira 200 px', F.bola, 'export const ADS_V2_PRODUCT_PHOTO_MIN_SIDE = 500', 'export const ADS_V2_PRODUCT_PHOTO_MIN_SIDE = 200', provas.fotoPequena)
await mut('a escolha ignora o produto cortado', F.v2, "return w === 'no' || edge === true ? 2 : w === 'yes' ? 0 : 1 }", 'return 1 }', provas.escolha)
await mut('a escolha ignora a borda do retângulo', F.v2, '  return rect.x0 <= e || rect.y0 <= e || rect.x1 >= 1 - e || rect.y1 >= 1 - e', '  return false', provas.escolha)
await mut('a régua ignora a voz', F.v2, '  const paced = voice ? adsV2PresenterV2PaceWords(voice.language, voice.gender) : null', '  const paced = null as { min: number; max: number } | null', provas.duracao)
await mut('a voz curta passa direto', F.v2, 'export const ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS = 9.85', 'export const ADS_V2_PRESENTER_V2_VOICE_MIN_SECONDS = 0', provas.duracao)
await mut('a voz curta não desacelera', F.v2, 'export const ADS_V2_PRESENTER_V2_MIN_SPEED = 0.92', 'export const ADS_V2_PRESENTER_V2_MIN_SPEED = 1', provas.duracao)
await mut('o travessão volta a contar como palavra', F.script, '  return text.trim().split(/\\s+/).filter((w) => /[\\p{L}\\p{N}]/u.test(w)).length', '  return text.trim().split(/\\s+/).filter(Boolean).length', provas.duracao)
await mut('o /plan deixa de gravar as fotos reais', F.plan, 'Object.assign(modeTag, { photos: photos.length, product_photos:', 'Object.assign(modeTag, { photos_x: photos.length, product_photos:', provas.medicao)
await mut('o /plan volta a mandar a frase inteira do prompt', F.plan, 'const sentenceCopy = instruction ? instruction.product ??', 'const sentenceCopy = false ? instruction.product ??', provas.verbatim)
await mut('o close volta ao recorte', F.advance, 'closeUrl: presenterV2Close ?? presenterV2.productUrl', 'closeUrl: presenterV2.productUrl', provas.fotoInteira)
await mut('a escolha explícita (kind_chosen) não é gravada no rascunho', 'lib/ads/v2SceneServer.ts', 'fields.kind_chosen = true // ', 'fields.kind_chosen_x = true // ', provas.tipoComFoto)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
