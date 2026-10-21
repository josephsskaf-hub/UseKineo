// KINEO-ADS-QUALIDADE-2110 — guardião do Studio Ads com qualidade de anúncio (fundador 21/10: UGC nota 7 "a pessoa encostando… não tem muita
// movimentação… o cartão final muito feio"; Product Ads nota 4 "só o braço do relógio", "7-day battery" sumiu, frases genéricas).
// Roda com `node scripts/test-ads-qualidade-2110.mjs` da raiz, sem rede, sem banco, sem fornecedor (carregador offline da casa).
//   A  POSE: o prompt da foto pede o produto no PEITO, longe do rosto, mão segurando, escala real por tipo; a mão no peito saiu; a pergunta das mãos lê
//      a pose; a escolha recusa encostando no rosto / flutuando / mãos demais e prefere a limpa; a atuação viva vai ao motor;
//   M  MONTAGEM: UGC com punch-in (mesmo clipe, 2 pedaços, o som contínuo), gancho de 0,7 s com o produto, close e cartão v3; Product Ads com o gancho da
//      foto inteira e o cartão v3; SEM a camada a montagem é IDÊNTICA à base (ausente = o de antes);
//   C  CARTÃO v3: título ("Pulse smartwatch", "Glow face cream"), selo da oferta digitada ("30% off this week", "Free shipping"), botão na língua, tudo
//      acima de 80% da tela, produto em contain (nunca cortado), sem propriedade nova (blur desligado);
//   R  ROTEIRO: o benefício digitado faltando e as frases genéricas do caso real voltam para correção; a fala limpa passa;
//   B  NA BASE (5bb2a69d4) as provas são VERMELHAS;  X  desfaz exato, marca em toda linha, encadeamento;  U  mutantes aplicados e vermelhos.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAdsQualidade2110, ADS_QUALIDADE_2110_ARQUIVOS, ADS_QUALIDADE_2110_NOVOS, ADS_QUALIDADE_2110_BASE, MARCA_ADS_QUALIDADE_2110 } from './test-support/desfaz-ads-qualidade-2110.mjs'
import { semAdsBola2110 } from './test-support/desfaz-ads-bola-2110.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const baseCache = new Map()
const base = (p) => { if (!baseCache.has(p)) { let t = null; try { t = lf(git('show', `${ADS_QUALIDADE_2110_BASE}:${p}`)) } catch { t = null } baseCache.set(p, t) } return baseCache.get(p) }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const vermelho = async (fn) => { try { return !(await fn()) } catch (e) { if (/^mutante /.test(String(e && e.message))) throw e; return true } }
const loader = ({ over = {}, onBase = false } = {}) => {
  const load = createOfflineLoader({ mocks: {}, source: (r, text) => (over[r] !== undefined ? over[r] : onBase ? (base(r) ?? text) : text) })
  load.text = (p) => (over[p] !== undefined ? lf(over[p]) : onBase ? (base(p) ?? rd(p)) : rd(p))
  return load
}
const F = { q: 'lib/ads/v2AdsQualidade.ts', v2: 'lib/ads/v2PresenterV2.ts', montage: 'lib/ads/adV2Montage.ts', close: 'lib/ads/v2CloseReal.ts', brief: 'lib/ads/v2Brief.ts', advance: 'lib/ads/v2Advance.ts', plan: 'lib/ads/v2PlanCore.ts' }
const H = (n) => `https://sb.test/${n}`
// os briefs REAIS de 21/10 (pedidos 44a14cfc UGC e d0816e88 Product Ads)
const JAR = { business: 'Glow face cream — hydrates all day', offer: '30% off this week', cta: 'buy', contact: '', language: 'en', tone: 'direct', audience: '', extra: {} }
const WATCH = { business: 'Pulse — smartwatch', offer: '7-day battery, free shipping', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }
const WATCH_BAD = 'Discover the Pulse smartwatch. It features a stunning design and an impressive long battery life. Elevate your style today. Enjoy free shipping on your order now! Pulse, for you.'
const WATCH_OK = 'Meet the Pulse smartwatch. One charge lasts a full 7-day battery cycle, so it keeps up with your week. Order today and get free shipping.'
const montageInput = (quality) => ({
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), voiceUrl: null, voiceSeconds: null,
  overlays: [{ text: 'Glow face cream', start: 0, end: 4 }, { text: '30% off this week', start: 4, end: 8 }],
  shots: [{ url: H('jar.jpg'), kind: 'text', packshot: true, cutStart: 0, cutSeconds: 4, measuredSeconds: null }, { url: H('foto.jpg'), kind: 'text', cutStart: 0, cutSeconds: 4, measuredSeconds: null }],
  presenter: { url: H('ator.mp4'), measuredSeconds: 10.6, insertOrder: [], v2: { speechSeconds: 9.9, closeUrl: H('jar.jpg'), productRect: { x0: 0.3, y0: 0.45, x1: 0.6, y1: 0.7 }, ...(quality ? { quality } : {}) } },
})
const qualityHooks = (Q, product, card) => ({
  video: (i) => Q.adsV2PresenterVideoElements({ ...i, rect: { x0: 0.3, y0: 0.45, x1: 0.6, y1: 0.7 } }), hookSeconds: Q.ADS_V2_PRESENTER_HOOK_SECONDS,
  hook: (t, d) => Q.adsV2SoftPackshotElements(product, 10, t, d), close: (t, d) => Q.adsV2SoftPackshotElements(product, 3, t, d),
  card: (t, d) => Q.adsV2EndCardV3Elements({ productUrl: product, card, fontFamily: 'Inter', width: 1080, height: 1920, time: t, duration: d, track: 20 }),
})
const CLOSE = { width: 720, height: 1280, heroUrl: H('hero.png'), heroFallbackUrl: H('watch.jpg'), photos: [H('watch.jpg')], phrases: ['Pulse smartwatch', '7-day battery, free shipping'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('music.mp3'), musicTrimStart: 0, voiceUrl: H('voz.mp3'), voiceSeconds: 9.2, watermark: null, narration: WATCH_OK }

const provas = {
  async pose(L) {
    const P = L(F.v2)
    const p = P.adsV2PresenterV2Prompt({ look: 'a friendly woman', pronoun: 'She', sector: 'store', freeHand: true, product: 'Glow face cream jar' })
    const shoe = P.adsV2PresenterV2Prompt({ look: 'a man', pronoun: 'He', sector: 'store', freeHand: false, product: 'running sneaker' })
    return /at chest height/.test(p) && !/near her face/.test(p) && !/close to the face/.test(p) && !/rests open on the chest/.test(p) && /clear space between the product and her face/.test(p) && /small jar that sits in the palm/.test(p) &&
      /one shoe held from below/.test(shoe) && /his face/.test(shoe) && P.adsV2ProductShape('Pulse smartwatch') === 'device' && P.adsV2ProductShape('leather handbag') === 'bag' && P.adsV2ProductShape('chamomile tea box') === 'box' && P.adsV2ProductShape('perfume') === 'bottle'
  },
  async escolha(L) {
    const P = L(F.v2)
    if (!/"touching_face"/.test(P.ADS_V2_PRESENTER_V2_HANDS_QUESTION) || !/"product_height"/.test(P.ADS_V2_PRESENTER_V2_HANDS_QUESTION)) return false
    const inv = P.adsV2PresenterV2ParseHands(JSON.stringify({ product_whole: 'yes', hand_count: 1, hands: [{ holding_product: 'yes', whole: 'yes' }], phone_ui: 'no', touching_face: 'yes', product_height: 'face', held: 'yes', scale: 'realistic' }))
    if (!inv || !inv.pose || inv.pose.touchingFace !== 'yes' || inv.pose.at !== 'face') return false
    const pose = (t, at, held = 'yes', scale = 'realistic') => ({ touchingFace: t, at, held, scale })
    // 0 = encostando no rosto (o caso real), 1 = 2 mãos com a livre no peito, 2 = limpa no peito com 1 mão, 3 = flutuando
    const pick = P.adsV2PresenterV2PickWhole({ both: [false, false, false, false], freeHands: [false, true, false, false], phoneUi: ['no', 'no', 'no', 'no'], productWhole: ['yes', 'yes', 'yes', 'yes'], handCounts: [1, 2, 1, 1], poses: [pose('yes', 'chest'), pose('no', 'chest'), pose('no', 'chest'), pose('no', 'chest', 'no')] })
    const cut = P.adsV2PresenterV2PickWhole({ both: [false, false], freeHands: [false, false], phoneUi: ['no', 'no'], productWhole: ['yes', 'no'], handCounts: [1, 1], poses: [pose('yes', 'face'), pose('no', 'chest')] })
    return pick.index === 2 && cut.index === 1
  },
  async atuacao(L) {
    const P = L(F.v2)
    const a = P.adsV2PresenterV2Performance(true), b = P.adsV2PresenterV2Performance(false), c = P.adsV2PresenterV2PerformanceOf('qualquer')
    return a === b && b === c && /nods and natural head tilts/.test(a) && /away from the face/.test(a) && /^eyes open/.test(a)
  },
  async montagemUgc(L) {
    const MO = L(F.montage), Q = L(F.q)
    const card = Q.adsV2EndCardV3Of({ business: JAR.business, offer: JAR.offer, ctaKind: 'buy', contact: '', language: 'en', buyLabel: 'Shop now' })
    const src = MO.buildAdV2Source(montageInput(qualityHooks(Q, H('jar.jpg'), card)))
    const els = src.elements
    const vids = els.filter((e) => e.type === 'video' && e.source === H('ator.mp4'))
    const hook = els.filter((e) => e.track === 10 && e.time === 0)
    const cardTxt = els.filter((e) => e.type === 'text' && e.track >= 20).map((e) => e.text)
    const contain = els.filter((e) => e.type === 'image' && e.fit === 'contain')
    return vids.length === 2 && vids[1].trim_start === vids[1].time && vids.every((v) => v.volume === '100%') && /11[0-9]%/.test(vids[1].animations[0].start_scale) &&
      hook.length === 3 && hook[0].duration === 0.7 && cardTxt.includes('Glow face cream') && cardTxt.includes('30% off this week') && cardTxt.includes('Shop now') &&
      contain.length >= 3 && !JSON.stringify(src).includes('blur_radius') && !els.some((e) => e.source === H('card.png'))
  },
  async semCamadaIgual(L) {
    const MO = L(F.montage), MB = loader({ onBase: true })(F.montage)
    const CR = L(F.close), CB = loader({ onBase: true })(F.close)
    return JSON.stringify(MO.buildAdV2Source(montageInput(null))) === JSON.stringify(MB.buildAdV2Source(montageInput(null))) && JSON.stringify(CR.buildAdV2CloseRealSource({ ...CLOSE })) === JSON.stringify(CB.buildAdV2CloseRealSource({ ...CLOSE }))
  },
  async montagemProduto(L) {
    const CR = L(F.close), Q = L(F.q)
    const card = Q.adsV2EndCardV3Of({ business: WATCH.business, offer: WATCH.offer, ctaKind: 'buy', language: 'en', buyLabel: 'Shop now' })
    const src = CR.buildAdV2CloseRealSource({ ...CLOSE, quality: { hook: (t, d) => Q.adsV2SoftPackshotElements(H('watch.jpg'), 2, t, d, { zoomEnd: '110%' }), card: (t, d) => Q.adsV2EndCardV3Elements({ productUrl: H('watch.jpg'), card, fontFamily: 'Montserrat', width: 720, height: 1280, time: t, duration: d, track: 20 }) } })
    const els = src.elements
    const txt = els.filter((e) => e.type === 'text' && e.track >= 20).map((e) => e.text)
    return !els.some((e) => e.source === H('hero.png')) && !els.some((e) => e.source === H('card.png')) && els.some((e) => e.time === 0 && e.fit === 'contain' && e.source === H('watch.jpg')) &&
      txt.includes('Pulse smartwatch') && txt.includes('Free shipping') && txt.includes('Shop now') && !els.some((e) => e.track === 9 || e.track === 10)
  },
  async cartao(L) {
    const Q = L(F.q)
    const pt = Q.adsV2EndCardV3Of({ business: 'Perfume LUME — eau de parfum', offer: 'frete grátis, 20% de desconto', ctaKind: 'whatsapp', language: 'pt', buyLabel: 'Compre agora' })
    const none = Q.adsV2EndCardV3Of({ business: 'Pulse — smartwatch', offer: '7-day battery', language: 'en', buyLabel: 'Shop now' })
    const els = Q.adsV2EndCardV3Elements({ productUrl: H('x.jpg'), card: pt, fontFamily: 'Inter', width: 1080, height: 1920, time: 12, duration: 2.5, track: 20 })
    const ys = els.filter((e) => e.type === 'text').map((e) => parseFloat(e.y))
    return pt.title === 'Perfume LUME' && pt.offer === 'Frete grátis · 20% de desconto' && pt.cta === 'Chame no WhatsApp' && none.offer === '7-day battery' && none.title === 'Pulse smartwatch' &&
      ys.length === 3 && ys.every((y) => y <= 80) && els.some((e) => e.fit === 'contain') && Q.adsV2EndCardOffer('30% off this week') === '30% off this week'
  },
  async roteiro(L) {
    const B = L(F.brief)
    const opts = { maxWords: 34, narration: true, minWords: 5, ad: { product: true } }
    const sys = B.buildV2CopyMessages(WATCH, 'English', { maxWords: 34, narration: true, ad: { product: true } }).system
    const bad = B.checkV2Copy(JSON.stringify({ narration: WATCH_BAD, overlays: ['Pulse smartwatch', '7-day battery'], sector: 'store' }), WATCH, opts)
    const good = B.checkV2Copy(JSON.stringify({ narration: WATCH_OK, overlays: ['Pulse smartwatch', '7-day battery'], sector: 'store' }), WATCH, opts)
    const why = bad.ok ? '' : bad.why.join(' | ')
    return /"7-day battery"/.test(sys) && /stunning design/.test(sys) && !bad.ok && /say "7-day battery"/.test(why) && /stunning design/.test(why) && /Elevate your style/.test(why) && /Pulse, for you/.test(why) && good.ok === true
  },
}

console.log('\nA. a pose, a escolha e a atuação')
await check('A1 o prompt: produto no peito, longe do rosto, mão no peito fora, escala real por tipo (pote, tênis, relógio, bolsa, caixa, frasco)', () => provas.pose(loader()))
await check('A2 a escolha: encostando no rosto, flutuando e mão livre no peito perdem; a limpa no peito vence; a pergunta lê a pose', () => provas.escolha(loader()))
await check('A3 a atuação viva (olhos abertos primeiro, acenos, produto longe do rosto) para toda foto', () => provas.atuacao(loader()))
console.log('\nM. a montagem')
await check('M1 UGC: punch-in em 2 pedaços com o som contínuo, gancho de 0,7 s, cartão v3 (nome, oferta, botão), produto em contain, sem blur', () => provas.montagemUgc(loader()))
await check('M2 sem a camada, UGC e Product Ads são IDÊNTICOS à base', () => provas.semCamadaIgual(loader()))
await check('M3 Product Ads: gancho = foto inteira (nada do recorte), cartão v3 com o selo "Free shipping" (nem o nome nem o botão de antes)', () => provas.montagemProduto(loader()))
console.log('\nC. o cartão v3')
await check('C1 título, selo da oferta, chamada na língua; textos acima de 80%; sem oferta = o benefício curto', () => provas.cartao(loader()))
console.log('\nR. o roteiro do produto')
await check('R1 o caso real: "7-day battery" faltando + "stunning design" + "Elevate your style" + "Pulse, for you" voltam; a fala concreta passa', () => provas.roteiro(loader()))

console.log('\nB. na base (5bb2a69d4) as mesmas provas são VERMELHAS')
const LB = loader({ onBase: true })
for (const [nome, fn] of Object.entries(provas)) {
  if (nome === 'semCamadaIgual' || nome === 'cartao') continue // a comparação com a base / o módulo novo (não existe na base)
  await check(`B ${nome} vermelha na base`, () => vermelho(() => fn(LB)))
}

console.log('\nX. desfaz exato, marca em toda linha, encadeamento, novos')
await check('X1 desfeita esta camada, cada arquivo tocado é EXATAMENTE a base', () => ADS_QUALIDADE_2110_ARQUIVOS.every((p) => { const b = base(p); const s = lf(semAdsQualidade2110(rd(p), p)); if (s !== b) console.log('       difere:', p); return b !== null && s === b }))
await check('X2 a cadeia: semAdsBola2110 tira esta camada primeiro', () => lf(semAdsBola2110(rd(F.montage), F.montage)) === lf(semAdsBola2110(base(F.montage), F.montage)) && !semAdsBola2110(rd(F.v2), F.v2).includes(MARCA_ADS_QUALIDADE_2110))
await check('X3 não toca lib/engineWall.ts, lib/homeVideoCuration.ts, desenho infantil nem o pipeline de filme', () => [...ADS_QUALIDADE_2110_ARQUIVOS, ...ADS_QUALIDADE_2110_NOVOS].every((p) => !/engineWall|homeVideoCuration|kidsCartoon|generate-video-cinematic|api\/compose/.test(p)))
await check('X4 os novos existem e não existiam na base', () => ADS_QUALIDADE_2110_NOVOS.every((p) => existsSync(join(ROOT, p)) && base(p) === null))
await check('X5 toda linha diferente da base nos arquivos tocados carrega a marca', () => ADS_QUALIDADE_2110_ARQUIVOS.every((p) => { const b = new Set(base(p).split('\n')); return rd(p).split('\n').every((l) => b.has(l) || l.includes(MARCA_ADS_QUALIDADE_2110)) }))
await check('X6 v2PresenterV2 e adV2Montage continuam SEM import de valor (os guardiões antigos os carregam crus)', () => [F.v2, F.montage].every((p) => !/^import (?!type )/m.test(rd(p))))

console.log('\nU. mutantes (todos aplicados e vermelhos)')
const mut = async (nome, arquivo, a, b, prova) => {
  let over
  try { over = { [arquivo]: trocar(rd(arquivo), a, b) } } catch (e) { ok(false, `U ${nome}: ${e.message}`); return }
  await check(`U ${nome}`, () => vermelho(() => prova(loader({ over }))))
}
await mut('o produto volta para perto do rosto', F.v2, 'in one hand at chest height, label facing the camera', 'in one hand near ${their} face, label facing the camera', provas.pose)
await mut('a escolha ignora a pose', F.v2, '  const poseS = (k: number): number => adsV2PresenterPoseScore(at(i.poses, k), at(i.handCounts, k))', '  const poseS = (k: number): number => 0', provas.escolha)
await mut('encostar no rosto deixa de pesar', F.v2, "  if (pose.touchingFace === 'yes') s += 100", "  if (pose.touchingFace === 'yes') s += 0", provas.escolha)
await mut('o punch-in some', F.q, '  const scale = fits(P.scale) ? P.scale : fits(P.fallbackScale) ? P.fallbackScale : 0', '  const scale = 0', provas.montagemUgc)
await mut('o cartão v3 é ignorado no UGC', F.montage, '  if (q?.card) elements.push(...q.card(t.cardStart, r3(cardSeconds))); else', '  if (false) elements.push(...q.card(t.cardStart, r3(cardSeconds))); else', provas.montagemUgc)
await mut('o gancho volta ao recorte no Product Ads', F.close, '  if (input.quality?.hook) { elements.push(...input.quality.hook(0, hookDur)) } else', '  if (false) { } else', provas.montagemProduto)
await mut('o selo pega a primeira parte (benefício, não oferta)', F.q, '  const parts = all.filter((p) => OFFER_RE.test(p))', '  const parts = all', provas.montagemProduto)
await mut('o benefício faltando passa', F.brief, '    if (opts.ad?.product) why.push(...adsV2BenefitWhy(narration, adsV2TypedBenefits(brief)))', '    if (false) why.push(...adsV2BenefitWhy(narration, adsV2TypedBenefits(brief)))', provas.roteiro)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
