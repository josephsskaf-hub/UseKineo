// KINEO-KIT-BF-1910 — guardião do KIT BLACK FRIDAY parte 1 no "Close do produto real" do Studio Ads (fundador 19/10, "3 decisões sim";
// docs/MERCADO-SEMANA-19-E-26-OUT-2026.md). Roda com `node scripts/test-kit-bf-1910.mjs` na raiz do repo, sem rede, sem banco, sem fornecedor:
// a MONTAGEM e o TEXTO do anúncio são executados de verdade (scripts/test-support/offline-ts-loader.mjs, OpenAI falsa), lado a lado com a base
// (esta camada desfeita em memória).
//
// O que prova:
//   O  OFERTA VAZIA = NADA MUDA: a montagem é o MESMO objeto; o pedido ao modelo e o texto saem byte a byte os da base; amostra e outros formatos ignoram a oferta;
//   G  GANCHO E CARTÃO: o selo da oferta no gancho fica num canto, fora do produto (a caixa REAL do recorte com o zoom do gancho) e fora das legendas do gancho,
//      dentro de 14%–65%; no cartão a oferta fica GRANDE entre o nome e o botão (botão até 65%, fora do produto); sem o fundo do kit o cartão fica como estava;
//      só propriedades que a montagem já usa;
//   N  NARRAÇÃO CITA A OFERTA 1×: faltou = entra; repetida = sai; o pedido ao modelo diz "exactly ONCE"; o brief passa a ter a oferta digitada;
//   V  VARIAÇÕES: 3 ou 5 ângulos DISTINTOS (oferta falada só com oferta), pedidos diferentes ao modelo, ordem de fotos diferente; o lote (tela) cria N
//      pedidos Close real normais pelo /batch (plan → start) com o total = N × o preço; falhou um roteiro = a fila não começa (nada cobrado);
//   P  PREÇO INTOCADO: v2Tiers, v2Billing, v2Batch, v2BatchRules, v2StartCore, /start, sample, serverAccess byte a byte; a conta do total é N × adsV2Credits;
//   D  desfaz exato + novos + marca + encadeamento + reâncoras;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { semCompraAvulsa2410 } from './test-support/desfaz-compra-avulsa-2410.mjs' // KINEO-COMPRA-AVULSA-2410 — exact newer leaf before historical assertions.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semKitBf1910, KIT_BF_1910_ARQUIVOS, KIT_BF_1910_NOVOS, KIT_BF_1910_BASE, MARCA_KIT_BF_1910, ACRESCIMOS_KIT_BF_1910, TROCAS_KIT_BF_1910 } from './test-support/desfaz-kit-bf-1910.mjs'
import { semCloseRealLegendaCorte1910 } from './test-support/desfaz-close-real-legenda-corte-1910.mjs'
import { semHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs' // reancorado KINEO-HOME-3-CARDS-1910 — os 3 cards da home (mesclados depois, por cima do kit) saem do disco antes das provas deste guardião
import { semAdsBola2110 } from './test-support/desfaz-ads-bola-2110.mjs' // KINEO-ADS-QUALIDADE-2110 — reancorado: a bola (que tira a qualidade primeiro) veio depois
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'
// KINEO-AFILIADO-50-2610: remove only this later layer before historical source checks; retain raw EOL.
const affiliateRaw = (rel, source) => { const projected = semAfiliado50_2610(rel, source); return source.includes('\r\n') ? projected.replace(/\n/g, '\r\n') : projected }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const MARCA = 'KINEO-KIT-BF-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
const disco = (p) => lf(semHome3Cards1910(semCompraAvulsa2410(affiliateRaw(p, readFileSync(join(ROOT, p), 'utf8')), p), p)) // KINEO-COMPRA-AVULSA-2410 // reancorado KINEO-HOME-3-CARDS-1910 — o disco sem a camada dos 3 cards (mais nova), em memória
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${KIT_BF_1910_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const tenta = async (fn) => { try { return !!(await fn()) } catch { return false } }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  kit: 'lib/ads/v2KitBf.ts', montage: 'lib/ads/v2KitBfMontage.ts', server: 'lib/ads/v2KitBfServer.ts', cr: 'lib/ads/v2CloseReal.ts', brief: 'lib/ads/v2Brief.ts',
  plan: 'lib/ads/v2PlanCore.ts', advance: 'lib/ads/v2Advance.ts', tela: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', painel: 'app/(dashboard)/ads/v2/AdsV2KitBf.tsx', tiers: 'lib/ads/v2Tiers.ts',
}
const JSONS = { '@/lib/ui/refinementCopy.json': JSON.parse(disco('lib/ui/refinementCopy.json')) }
/** Carregador: `over` troca a fonte de um arquivo (mutante); velho = esta camada desfeita (a base). */
const carregar = (over = {}, velho = false, mocks = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...JSONS, ...mocks }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : velho ? semKitBf1910(text, rel) : semAdsBola2110(text, rel)) }) // KINEO-ADS-QUALIDADE-2110 — reancorado: o texto de hoje sem a bola e a qualidade (21/10, entregas de depois, desfaz próprio)

// ── fixtures da montagem (o Close real de verdade, como nos guardiões dele) ──────────────────────────────────────────────
const H = (n) => `https://cdn.test/${n}`
const FOTOS = [H('frasco.jpg'), H('frasco-bege.jpg'), H('cetim.jpg')]
const NARR = {
  pt: 'Conheça Perfume LUME. Um aroma envolvente que te transporta a momentos especiais. Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos. Você merece.',
  en: 'Explore the enchanting scents from Perfume LUME. Each fragrance tells a unique story, inviting you to experience something truly special. Find your new favorite scent today and indulge yourself!',
}
const VOZ = { pt: 12.6, en: 12.13 }
const BUILD = (lang, w, h, extra = {}) => ({ width: w, height: h, heroUrl: H('hero.png'), heroFallbackUrl: FOTOS[0], photos: FOTOS, phrases: [lang === 'en' ? 'Perfume LUME - Unique Fragrances' : 'Perfume LUME - Fragrâncias Únicas', 'x'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), musicTrimStart: 0, voiceUrl: H('v.mp3'), voiceSeconds: VOZ[lang], watermark: null, narration: NARR[lang], closeCard: { url: H('cc.png'), name: 'Perfume LUME', cta: lang === 'en' ? 'Shop now' : 'Compre agora', ink: '#2a1d10' }, ...extra })
const QUADROS = [[1080, 1920], [720, 1280]]
const LINGUAS = ['pt', 'en']
// a caixa do produto no PNG do gancho para recortes de proporções diferentes (a MESMA conta de adsV2CloseRealProductRect, refeita aqui)
const BOX = { x0: 0.14, x1: 0.86, y0: 0.36, y1: 0.84 }
const rect = (cw, ch) => { const bw = (BOX.x1 - BOX.x0) * 1080, bh = (BOX.y1 - BOX.y0) * 1920; const k = Math.min(bw / cw, bh / ch); const w = Math.round(cw * k), h = Math.round(ch * k); return { x: Math.round((1080 - w) / 2), y: Math.round(BOX.y1 * 1920 - h), w, h } }
const RECTS = { frasco: rect(400, 1000), quadrado: rect(800, 800), largo: rect(1000, 500), caixa: rect(778, 922), semRecorte: null }
const OFERTAS = ['−30%', 'Frete grátis', 'Só até 27/11', 'Compre 2 leve 3', 'Leve 3 pague 2 até 27/11']
// o produto no gancho, refeito de forma independente: a caixa (real ou a do gancho inteira) com o zoom 100% → 112% ancorado em (50%, topo da caixa)
const spanIndep = (r) => { const b = r ? { x0: r.x / 1080, x1: (r.x + r.w) / 1080, y0: r.y / 1920, y1: (r.y + r.h) / 1920 } : { ...BOX }; const z = 1.12; return { x0: Math.min(b.x0, 0.5 + (b.x0 - 0.5) * z), x1: Math.max(b.x1, 0.5 + (b.x1 - 0.5) * z), y0: Math.min(b.y0, 0.36 + (b.y0 - 0.36) * z), y1: Math.max(b.y1, 0.36 + (b.y1 - 0.36) * z) } }
const cruza = (a, b, g = 0) => a.x0 < b.x1 + g && a.x1 > b.x0 - g && a.y0 < b.y1 + g && a.y1 > b.y0 - g
// a pílula de um texto (pior caso da largura de caractere: 0,62 da fonte; folgas 50%/30% da fonte, como o Creatomate mede)
const pilula = (text, px, W, Hh) => { const ls = String(text).split('\n'); return { w: (Math.max(...ls.map((l) => l.length)) * px * 0.62 + px) / W, h: (px * (ls.length * 1.1 + 0.6)) / Hh } }
const caixaDoElemento = (e, W, Hh) => { const p = pilula(e.text, e.font_size, W, Hh); const x = parseFloat(e.x) / 100, y = parseFloat(e.y) / 100; const x0 = e.x_anchor === '100%' ? x - p.w : e.x_anchor === '0%' ? x : x - p.w / 2; return { x0, x1: x0 + p.w, y0: y - p.h / 2, y1: y + p.h / 2 } }
const legendaCaixa = (cr, e, W, Hh) => { const n = Math.max(1, cr.adsV2CloseRealCaptionLines2(e.text, e.font_size, W).length); const bottom = parseFloat(e.y) / 100 + 0.012; const h = 0.024 + (n * e.font_size * 1.1) / Hh; return { x0: 0.05, x1: 0.95, y0: bottom - h, y1: bottom } } // largura cheia: conservador
const kitDe = (over = {}) => carregar(over)(F.montage)
const crDe = (over = {}) => carregar(over)(F.cr)

// ═══ O ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const provaVaziaMontagem = (over = {}) => {
  const cr = crDe(over), km = kitDe(over)
  return QUADROS.every(([W, Hh]) => LINGUAS.every((lang) => Object.values(RECTS).every((r) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, W, Hh))
    const antes = JSON.stringify(src)
    return [null, undefined, '', '   ', '###', '🔥'].every((o) => km.adsV2KitBfApplyMontage(src, { offer: o, heroRect: r, kitCardUrl: H('kit.png') }) === src) && JSON.stringify(src) === antes
  })))
}
// o texto do anúncio (lib/ads/v2Brief.ts DE VERDADE) com uma OpenAI falsa: 900 tokens = brief, 700 = texto/correção; guarda os pedidos
function openaiFalsa({ brief, copies = [] }) {
  const fila = copies.slice()
  const pedidos = []
  const create = async (params) => { pedidos.push(params); const r = params.max_tokens === 900 ? brief : fila.shift(); return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] } }
  return { pedidos, openai: { chat: { completions: { create } } } }
}
const FRASE = 'Perfume LUME, fragrâncias exclusivas, frasco dourado'
const BRIEF_LUME = { business: 'Perfume LUME — fragrâncias exclusivas', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
const COPY_SEM = { narration: 'Descubra o Perfume LUME. Uma fragrância delicada no frasco dourado que acompanha o seu dia com notas suaves. Sinta a diferença em cada borrifada e escolha o seu momento.', overlays: ['Perfume LUME - Fragrâncias Exclusivas', 'Notas suaves'], sector: 'store' }
const COPY_DUAS = { narration: 'Perfume LUME com 30% de desconto. Uma fragrância delicada no frasco dourado que acompanha o seu dia com notas suaves. Aproveite os 30% de desconto e escolha o seu momento.', overlays: ['Perfume LUME - Fragrâncias Exclusivas', '−30%'], sector: 'store' }
const texto = async ({ kitBf = null, copy = COPY_SEM, velho = false, over = {}, text = FRASE } = {}) => {
  const oa = openaiFalsa({ brief: BRIEF_LUME, copies: [copy, copy, copy] })
  const B = carregar(over, velho, { '@/lib/openai': { openai: oa.openai } })(F.brief)
  const r = await B.extractAdsV2Brief({ text, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true, overlays: true, facts: [], sentence: FRASE, productPhoto: true, scripts: false, closeReal: true, ...(kitBf ? { kitBf } : {}) })
  const sistema = oa.pedidos.filter((p) => p.max_tokens === 700).map((p) => p.messages[0].content)
  return { r, sistema, pedidos: oa.pedidos }
}
const provaVaziaTexto = async (over = {}) => {
  const a = await texto({ velho: true }), b = await texto({ over }), c = await texto({ kitBf: { offer: null, angle: null }, over })
  return a.r.ok && b.r.ok && c.r.ok && JSON.stringify(a.r) === JSON.stringify(b.r) && JSON.stringify(a.r) === JSON.stringify(c.r) &&
    JSON.stringify(a.pedidos) === JSON.stringify(b.pedidos) && JSON.stringify(a.pedidos) === JSON.stringify(c.pedidos) && !b.sistema.join('\n').includes('ONCE') && !b.sistema.join('\n').includes('Angle "')
}
const provaVaziaCorpo = (over = {}) => {
  const K = carregar(over)(F.kit)
  const none = (v) => v.ok && v.value.offer === null && v.value.angle === null && v.value.variant === 0
  return none(K.adsV2KitBfFromBody({}, { closeReal: true, paid: true })) &&
    none(K.adsV2KitBfFromBody({ offer: '−30%', kit_angle: 'offer', kit_variant: 2 }, { closeReal: true, paid: false })) && // a amostra grátis ignora (não muda)
    none(K.adsV2KitBfFromBody({ offer: '−30%', kit_angle: 'offer' }, { closeReal: false, paid: true })) && // outro formato ignora
    K.adsV2KitBfTextWithOffer('Perfume LUME', null) === 'Perfume LUME' && K.adsV2KitBfStored(K.ADS_V2_KIT_BF_NONE) === null && K.adsV2KitBfOfPlan({ narration: 'x' }) === null && K.adsV2KitBfOfPlan(null) === null &&
    K.adsV2KitBfRuleLines(null).length === 0 && K.adsV2KitBfRuleLines({ offer: null, angle: null }).length === 0
}
const provaVaziaFios = () => {
  const plan = disco(F.plan), adv = disco(F.advance), tela = disco(F.tela)
  return /const kitBfIn = adsV2KitBfFromBody\(body, \{ closeReal: closeRealAsked, paid: gate === 'ok' \}\)/.test(plan) &&
    plan.includes("...(kitBf.offer || kitBf.angle ? { kitBf: { offer: kitBf.offer, angle: kitBf.angle } } : {}),") && plan.includes('const kitBfStored = closeReal ? adsV2KitBfStored(kitBf) : null') &&
    plan.includes('if (kitBf.offer) text = adsV2KitBfTextWithOffer(text, kitBf.offer)') &&
    adv.includes('if (closeRealSource && kitBf?.offer) closeRealSource = adsV2KitBfApplyMontage(closeRealSource, { offer: kitBf.offer, heroRect: hero?.rect ?? null, kitCardUrl })') &&
    adv.includes('const kitCardUrl = hero && kitBf?.offer ? await import(') &&
    tela.includes('const kitOn = closeRealOn && !sample') && tela.includes('...(kitOfferT ? { offer: kitOfferT } : {}) },') && tela.includes('...(kitOfferT ? { kitOffer: kitOfferT } : {}) })') &&
    tela.includes('{kitOn ? <AdsKitBfPanel ')
}

// ═══ G ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const provaSelo = (over = {}) => {
  const cr = crDe(over), km = kitDe(over)
  let casos = 0
  const okAll = QUADROS.every(([W, Hh]) => LINGUAS.every((lang) => Object.entries(RECTS).every(([, r]) => OFERTAS.every((offer) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, W, Hh))
    const out = km.adsV2KitBfApplyMontage(src, { offer, heroRect: r, kitCardUrl: H('kit.png') })
    const selos = out.elements.filter((e) => e.track === km.ADS_V2_KIT_BF_TRACKS.badge)
    if (selos.length !== 1) return false
    const b = selos[0]
    const hookEnd = Math.min(...src.elements.filter((e) => e.type === 'image' && (e.track === 2 || e.track === 3) && e.time > 0).map((e) => e.time))
    const caixa = caixaDoElemento(b, W, Hh)
    const vivas = src.elements.filter((e) => e.type === 'text' && e.track === cr.ADS_V2_CLOSE_REAL_TRACKS.text && e.time < b.time + b.duration - 1e-6 && e.time + e.duration > b.time + 1e-6)
    casos++
    return b.time === 0 && b.duration <= hookEnd + 1e-9 && b.duration >= 1.2 && b.text.replace(/\n/g, ' ') === offer &&
      !cruza(caixa, spanIndep(r), 0.01) && vivas.every((e) => !cruza(caixa, legendaCaixa(cr, e, W, Hh), 0.005) || caixa.x0 >= 0.5 + (Math.max(...cr.adsV2CloseRealCaptionLines2(e.text, e.font_size, W).map((l) => l.length)) * e.font_size * 0.58) / W / 2 + 0.03) &&
      caixa.y0 >= 0.14 - 1e-9 && caixa.y1 <= 0.65 + 1e-9 && caixa.x0 >= 0 && caixa.x1 <= 1 && (b.x_anchor === '100%' || b.x_anchor === '0%')
  }))))
  return okAll && casos === QUADROS.length * LINGUAS.length * Object.keys(RECTS).length * OFERTAS.length
}
const provaCartao = (over = {}) => {
  const cr = crDe(over), km = kitDe(over)
  return QUADROS.every(([W, Hh]) => LINGUAS.every((lang) => OFERTAS.every((offer) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, W, Hh))
    const out = km.adsV2KitBfApplyMontage(src, { offer, heroRect: RECTS.frasco, kitCardUrl: H('kit.png') })
    const T = cr.ADS_V2_CLOSE_REAL_TRACKS, CT = cr.ADS_V2_CLOSE_REAL_CARD_TRACKS
    const card = out.elements.find((e) => e.type === 'image' && e.track === T.card)
    const nome = out.elements.find((e) => e.type === 'text' && e.track === CT.name)
    const botao = out.elements.find((e) => e.type === 'text' && e.track === CT.cta)
    const of = out.elements.filter((e) => e.track === km.ADS_V2_KIT_BF_TRACKS.cardOffer)
    if (of.length !== 1) return false
    const o = of[0]
    const nomeLinhas = Math.max(1, carregar()('lib/ads/adV2Montage.ts').adsV2OverlayLines(nome.text, nome.font_size, W).length)
    const nomeBase = parseFloat(nome.y) / 100 + (nomeLinhas * nome.font_size * 1.1) / Hh / 2
    const co = caixaDoElemento(o, W, Hh)
    const bh = (botao.font_size * (1.1 + 0.64)) / Hh / 2
    const bTop = parseFloat(botao.y) / 100 - bh, bBottom = parseFloat(botao.y) / 100 + bh
    return card.source === H('kit.png') && o.text === offer && o.time === nome.time && o.duration === nome.duration && (offer.length <= 15 ? o.font_size > botao.font_size : o.font_size >= Math.round(0.03 * Hh)) &&
      co.y0 >= nomeBase - 1e-9 && co.y1 <= bTop + 1e-9 && co.y0 >= km.ADS_V2_KIT_BF_CARD_PRODUCT_BOX.y1 && bBottom <= 0.65 + 1e-9 && co.x0 >= 0.04 && co.x1 <= 0.96 &&
      parseFloat(nome.y) / 100 >= km.ADS_V2_KIT_BF_CARD_PRODUCT_BOX.y1 + 0.03
  })))
}
const provaCartaoSemFundo = (over = {}) => {
  const cr = crDe(over), km = kitDe(over)
  return LINGUAS.every((lang) => {
    const src = cr.buildAdV2CloseRealSource(BUILD(lang, 1080, 1920))
    const out = km.adsV2KitBfApplyMontage(src, { offer: '−30%', heroRect: RECTS.quadrado, kitCardUrl: null })
    const semSelo = { ...out, elements: out.elements.filter((e) => e.track !== km.ADS_V2_KIT_BF_TRACKS.badge) }
    return JSON.stringify(semSelo) === JSON.stringify(src) && out.elements.some((e) => e.track === km.ADS_V2_KIT_BF_TRACKS.badge) && !out.elements.some((e) => e.track === km.ADS_V2_KIT_BF_TRACKS.cardOffer)
  })
}
const provaPropriedades = (over = {}) => {
  const cr = crDe(over), km = kitDe(over)
  const src = cr.buildAdV2CloseRealSource(BUILD('pt', 1080, 1920))
  const usadas = new Set(src.elements.filter((e) => e.type === 'text').flatMap((e) => Object.keys(e)))
  const out = km.adsV2KitBfApplyMontage(src, { offer: 'Frete grátis', heroRect: RECTS.frasco, kitCardUrl: H('kit.png') })
  const novos = out.elements.filter((e) => e.track === 11 || e.track === 12)
  const trilhasAntes = new Set(src.elements.map((e) => e.track))
  return novos.length === 2 && novos.every((e) => Object.keys(e).every((k) => usadas.has(k))) && !trilhasAntes.has(11) && !trilhasAntes.has(12) && !JSON.stringify(novos).match(/shadow|color_filter|playback_rate|blur/)
}
const provaServidor = () => {
  const s = disco(F.server)
  return /adsV2CloseRealHeroRgba\(cut, ADS_V2_CLOSE_REAL_HERO_W, ADS_V2_CLOSE_REAL_HERO_H, ADS_V2_KIT_BF_CARD_PRODUCT_BOX\)/.test(s) && /adsV2CutoutFor\(/.test(s) && !/fal-ai|submitToFal|fetch\(|credits|debit|refund/i.test(s.replace(/^\/\/.*$/gm, ''))
}

// ═══ N ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const LANGS16 = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const provaUmaVez = (over = {}) => {
  const K = carregar(over)(F.kit)
  const conta = (t, o) => K.adsV2KitBfSentences(t).filter((s) => K.adsV2KitBfMentions(s, o)).length
  const zero = K.adsV2KitBfOfferOnce('Conheça o Perfume LUME. Uma fragrância delicada. Compre agora.', '−30%', 'pt')
  const duas = K.adsV2KitBfOfferOnce('Perfume LUME com 30% de desconto. Uma fragrância delicada. Aproveite os 30% de desconto.', '−30%', 'pt')
  const uma = K.adsV2KitBfOfferOnce('Perfume LUME com 30% de desconto. Uma fragrância delicada. Compre agora.', '−30%', 'pt')
  const frete = K.adsV2KitBfOfferOnce('Conheça o Perfume LUME. Compre agora.', 'Frete grátis', 'pt')
  const data = K.adsV2KitBfOfferOnce('Conheça o Perfume LUME. Vale só até 27/11. Garanta já, só até 27/11.', 'Só até 27/11', 'pt')
  const nada = K.adsV2KitBfOfferOnce('Conheça o Perfume LUME.', null, 'pt')
  const langs = LANGS16.every((l) => { const r = K.adsV2KitBfOfferOnce('Sentence one. Sentence two.', '−30%', l); return r.fix === 'inserted' && conta(r.text, '−30%') === 1 && /30/.test(r.text) })
  return zero.fix === 'inserted' && zero.text === 'Conheça o Perfume LUME. Uma fragrância delicada. 30% de desconto. Compre agora.' && conta(zero.text, '−30%') === 1 &&
    duas.fix === 'deduped' && conta(duas.text, '−30%') === 1 && duas.text.startsWith('Perfume LUME com 30% de desconto.') &&
    uma.fix === null && uma.text === 'Perfume LUME com 30% de desconto. Uma fragrância delicada. Compre agora.' &&
    frete.fix === 'inserted' && conta(frete.text, 'Frete grátis') === 1 && data.fix === 'deduped' && conta(data.text, 'Só até 27/11') === 1 &&
    nada.fix === null && nada.text === 'Conheça o Perfume LUME.' && langs && K.adsV2KitBfSpokenOffer('−30%', 'pt') === '30% de desconto' && K.adsV2KitBfSpokenOffer('-30%', 'en') === '30% off' && K.adsV2KitBfSpokenOffer('Frete grátis', 'pt') === 'Frete grátis'
}
const provaUmaVezTexto = async (over = {}) => {
  const K = carregar(over)(F.kit)
  const textoComOferta = K.adsV2KitBfTextWithOffer(FRASE, '−30%')
  const a = await texto({ kitBf: { offer: '−30%', angle: null }, copy: COPY_SEM, over, text: textoComOferta })
  const b = await texto({ kitBf: { offer: '−30%', angle: null }, copy: COPY_DUAS, over, text: textoComOferta })
  const conta = (t) => K.adsV2KitBfSentences(t).filter((s) => K.adsV2KitBfMentions(s, '−30%')).length
  const sys = a.sistema[0] ?? ''
  const i1 = sys.indexOf('exactly ONCE'), i2 = sys.lastIndexOf('\nAnswer with JSON only:')
  return a.r.ok && b.r.ok && conta(a.r.copy.narration) === 1 && conta(b.r.copy.narration) === 1 && i1 > 0 && i2 > i1 && sys.includes('"−30%"') &&
    String(a.r.brief.offer).includes('−30%') && textoComOferta === `${FRASE}\nOffer: −30%` && (a.pedidos.find((p) => p.max_tokens === 700)?.messages[1].content ?? '').includes('- Offer: −30%')
}

// ═══ V ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const provaAngulos = (over = {}) => {
  const K = carregar(over)(F.kit)
  const a3 = K.adsV2KitBfAngles(3, true), a5 = K.adsV2KitBfAngles(5, true), s3 = K.adsV2KitBfAngles(3, false), s5 = K.adsV2KitBfAngles(5, false)
  const distintos = (l) => new Set(l).size === l.length
  return JSON.stringify(a3) === '["offer","problem","gift"]' && a5.length === 5 && distintos(a5) && a5[0] === 'offer' && s3.length === 3 && distintos(s3) && !s3.includes('offer') && s5.length === 5 && distintos(s5) && !s5.includes('offer') &&
    K.adsV2KitBfAngles(1, true).length === 0 && K.adsV2KitBfAngles(0, false).length === 0
}
const provaAngulosPedido = (over = {}) => {
  const K = carregar(over)(F.kit)
  const msgs = { system: 'RULES\nAnswer with JSON only: {"narration":""}', user: 'U' }
  const sys = K.ADS_V2_KIT_BF_ANGLES.map((a) => K.adsV2KitBfCopyMessages(msgs, { offer: a === 'offer' ? '−30%' : null, angle: a }).system)
  return new Set(sys).size === sys.length && sys.every((s, i) => s.includes(K.ADS_V2_KIT_BF_ANGLE_RULES[K.ADS_V2_KIT_BF_ANGLES[i]]) && s.endsWith('\nAnswer with JSON only: {"narration":""}')) &&
    K.adsV2KitBfCopyMessages(msgs, null) === msgs && K.adsV2KitBfCopyMessages(msgs, { offer: null, angle: null }) === msgs &&
    Object.values(K.ADS_V2_KIT_BF_ANGLE_RULES).every((r) => !/\d/.test(r)) && /Never invent ratings, reviews, numbers, testimonials/.test(K.ADS_V2_KIT_BF_ANGLE_RULES.social)
}
const provaFotos = (over = {}) => {
  const K = carregar(over)(F.kit)
  const f4 = ['P', 'A', 'B', 'C']
  const ordens = [0, 1, 2, 3, 4].map((v) => K.adsV2KitBfPhotoOrder(f4, v).join(''))
  return new Set(ordens).size === 5 && ordens.every((o) => o.startsWith('P') && [...o].sort().join('') === 'ABCP') && ordens[0] === 'PABC' &&
    K.adsV2KitBfPhotoOrder(['P', 'A'], 3).join('') === 'PA' && K.adsV2KitBfPhotoOrder(['P'], 2).join('') === 'P'
}
const provaCorpo = (over = {}) => {
  const K = carregar(over)(F.kit)
  const c = { closeReal: true, paid: true }
  const v = K.adsV2KitBfFromBody({ offer: '  −30%  ', kit_angle: 'problem', kit_variant: 2 }, c)
  return v.ok && v.value.offer === '−30%' && v.value.angle === 'problem' && v.value.variant === 2 &&
    K.adsV2KitBfFromBody({ kit_angle: 'hype' }, c).error === 'bad_kit_angle' && K.adsV2KitBfFromBody({ kit_angle: 'offer' }, c).error === 'kit_angle_needs_offer' &&
    K.adsV2KitBfFromBody({ kit_variant: 7 }, c).error === 'bad_kit_variant' && K.adsV2KitBfFromBody({ offer: 'x'.repeat(25) }, c).error === 'bad_offer' && K.adsV2KitBfFromBody({ offer: 30 }, c).error === 'bad_offer' &&
    K.ADS_V2_KIT_BF_OFFER_MAX === 24 && Object.values(K.ADS_V2_KIT_BF_COPY).length === 16 && Object.values(K.ADS_V2_KIT_BF_COPY).every((k) => k.chips.length === 4 && k.chips.every((x) => x.length <= 24 && K.adsV2KitBfOffer(x) === x) && /\{n\}/.test(k.go) && /\{c\}/.test(k.go) && /\{c\}/.test(k.countHint))
}
// o lote da tela (AdsV2KitBf.tsx DE VERDADE, transpilado aqui) com uma API falsa
const painel = (over = {}) => {
  const src = Object.hasOwn(over, F.painel) ? over[F.painel] : disco(F.painel)
  const ts = require('typescript')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const K = carregar(over)(F.kit)
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => (id === '@/lib/ads/v2KitBf' ? K : id === 'react' ? require('react') : (() => { throw new Error('import inesperado: ' + id) })()), window: { setTimeout: (f) => f() }, Promise, encodeURIComponent, JSON, Array, Object, Number, String, Math })
  return box.exports
}
const apiFalsa = (falhaLinha = -1) => {
  const chamadas = []
  let n = 0
  const api = async (url, init = {}) => {
    chamadas.push({ url, body: init.body })
    if (url === '/api/ads/v2/orders') return { ok: true, status: 200, data: { order_id: `00000000-0000-4000-8000-00000000000${++n}` } }
    if (url === '/api/ads/v2/research') return { ok: true, status: 200, data: { status: 'ok' } }
    if (url === '/api/ads/v2/batch' && init.body.action === 'plan') return { ok: true, status: 200, data: { rows: init.body.rows.map((r, i) => ({ row: i, order_id: r.order_id, ok: i !== falhaLinha, credits: 41 })), credits_total: init.body.rows.filter((_, i) => i !== falhaLinha).length * 41 } }
    if (url === '/api/ads/v2/batch' && init.body.action === 'start') return { ok: true, status: 202, data: { batch_id: 'b0000000-0000-4000-8000-000000000001', credits_total: init.body.expected_credits } }
    return { ok: false, status: 404, code: 'x', body: {} }
  }
  return { api, chamadas }
}
const RUN = { lang: 'pt', credits: 41, firstOrderId: '00000000-0000-4000-8000-0000000000aa', draftBody: { mode: 'simple', tier: 'commercial', sentence: FRASE }, planBody: { mode: 'simple', sector: 'store', photos: [{ footage_id: 'f1', kind: 'product' }], close_real: true }, onNote: () => {} }
const provaLote = async (over = {}) => {
  const P = painel(over)
  const casos = [[3, '−30%'], [5, '−30%'], [3, null], [5, null]]
  for (const [n, offer] of casos) {
    const f = apiFalsa()
    const r = await P.adsV2KitBfRun({ ...RUN, api: f.api, n, offer })
    const drafts = f.chamadas.filter((c) => c.url === '/api/ads/v2/orders')
    const plan = f.chamadas.find((c) => c.url === '/api/ads/v2/batch' && c.body.action === 'plan')
    const start = f.chamadas.find((c) => c.url === '/api/ads/v2/batch' && c.body.action === 'start')
    if (!r.ok || !plan || !start) return false
    const rows = plan.body.rows
    const angs = rows.map((x) => x.kit_angle)
    if (!(drafts.length === n - 1 && drafts.every((d) => d.body.research_from === RUN.firstOrderId && d.body.sentence === FRASE) && rows.length === n && rows[0].order_id === RUN.firstOrderId &&
      new Set(angs).size === n && (offer ? angs[0] === 'offer' : !angs.includes('offer')) && rows.every((x, i) => x.kit_variant === i && x.scripts === false && x.close_real === true && JSON.stringify(x.photos) === JSON.stringify(RUN.planBody.photos) && (offer ? x.offer === offer : !('offer' in x))) &&
      start.body.expected_credits === n * 41 && start.body.batch_id === null && JSON.stringify(start.body.order_ids) === JSON.stringify(rows.map((x) => x.order_id)) && r.total === n * 41 && r.url === '/ads/v2?mode=batch&batch=b0000000-0000-4000-8000-000000000001')) return false
  }
  // uma linha do roteiro falhou = a fila NÃO começa (nada cobrado)
  const f = apiFalsa(1)
  const r = await P.adsV2KitBfRun({ ...RUN, api: f.api, n: 3, offer: '−30%' })
  return r.ok === false && !f.chamadas.some((c) => c.url === '/api/ads/v2/batch' && c.body.action === 'start')
}
const provaTotal = (over = {}) => {
  const K = carregar(over)(F.kit)
  const T = carregar()(F.tiers)
  return ['photo_motion', 'commercial', 'cinema'].every((t) => { const c = T.adsV2Credits(t, 15); return K.adsV2KitBfTotal(1, c) === c && K.adsV2KitBfTotal(3, c) === 3 * c && K.adsV2KitBfTotal(5, c) === 5 * c && K.adsV2KitBfTotal(2, c) === c }) && K.adsV2KitBfTotal(3, null) === null
}
const provaTela = () => {
  const t = disco(F.tela)
  return t.includes('const shownCost = kitN > 1 ? adsV2KitBfTotal(kitN, cost) : variations && three ? variationsPrice(cost) : cost') &&
    t.includes('if (kitN > 1) { void makeKitBatch(); return }') && t.includes('const r = await adsV2KitBfRun({ api, lang, n: kitN, offer: kitOfferT, credits: cost, firstOrderId: plan.order_id,') &&
    t.includes('window.location.assign(r.url)') && t.includes('const kitN: AdsV2KitBfCount = kitOn ? kitCount : 1') && t.includes('group: kitN > 1 ? adsV2KitBfTotal(kitN, cost) :')
}

// ═══ P ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const provaPreco = () => {
  const intocados = ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2Batch.ts', 'lib/ads/v2BatchRules.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/batch/route.ts', 'lib/ads/sample.ts', 'lib/ads/serverAccess.ts', 'lib/ads/v2Contract.ts', 'lib/ads/v2CloseReal.ts', 'lib/ads/v2CloseRealServer.ts', 'lib/plans.ts']
  const meus = new Set([...KIT_BF_1910_ARQUIVOS, ...KIT_BF_1910_NOVOS])
  const tocadosPorMim = intocados.filter((f) => meus.has(f))
  const batch = disco('lib/ads/v2Batch.ts')
  return tocadosPorMim.length === 0 && batch.includes('if (input.expected_credits !== total) return { status: 409, body: { error: \'price_changed\', credits: total } }') &&
    /adsV2BatchGate[\s\S]*const gate = adsGate\(access\.reason\)\n  if \(gate !== 'ok'\) return gate/.test(batch) && !/credits?_?\w*\s*[*]\s*0\.\d/.test(disco(F.kit))
}

// ═══ execução ═════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nO. oferta vazia = nada muda')
await check('O1 EXECUTADO (montagem do Close real de verdade, PT/EN, 1080 e 720, 5 recortes): oferta null/""/espaços/só decoração = o MESMO objeto, intocado', () => provaVaziaMontagem())
await check('O2 EXECUTADO (v2Brief de verdade, OpenAI falsa): sem kit (ou kit sem oferta e sem ângulo) = o texto e TODOS os pedidos ao modelo byte a byte os da base', () => provaVaziaTexto())
await check('O3 o corpo: amostra grátis e outros formatos ignoram oferta/ângulo; sem oferta nada é gravado no plano nem acrescentado ao texto', () => provaVaziaCorpo())
await check('O4 os fios: o /plan só passa o kit com oferta/ângulo e só grava plan.kitBf no Close real; o avanço só aplica com oferta; a tela só manda a oferta quando há (e só fora da amostra)', () => provaVaziaFios())
console.log('\nG. a oferta no gancho e no cartão, sem cobrir o produto')
await check('G1 EXECUTADO (2 quadros × 2 línguas × 5 recortes × 5 ofertas = 100 casos): o selo existe, num canto, do quadro 0 ao fim do gancho (ou ≥ 1,2 s), fora do produto com o zoom e fora das legendas vivas, dentro de 14%–65%', () => provaSelo())
await check('G2 EXECUTADO: no cartão a oferta (maior que o botão; a de 16–24 caracteres, ≥ 3% da altura) fica entre o nome e o botão, o botão termina até 65%, nada no produto do fundo do kit (que é o fundo do cartão)', () => provaCartao())
await check('G3 EXECUTADO: sem o fundo do kit o cartão fica byte a byte como estava (o selo do gancho continua)', () => provaCartaoSemFundo())
await check('G4 só propriedades que a montagem do Close real já usa; trilhas novas 11 e 12 (livres); nada de sombra/filtro', () => provaPropriedades())
await check('G5 o fundo do cartão com oferta: o MESMO quadro do gancho (recorte do cache) numa caixa mais alta; nenhum motor, nenhuma cobrança', () => provaServidor())
console.log('\nN. a narração cita a oferta 1×')
await check('N1 faltou = entra (antes da chamada final); repetida = só a 1ª frase fica; 1× = intocada; nas 16 línguas a oferta inserida conta 1×; "−30%" vira "30% de desconto" na voz', () => provaUmaVez())
await check('N2 EXECUTADO (v2Brief de verdade): sem a oferta na resposta → 1×; com 2× → 1×; o pedido diz "exactly ONCE" antes da linha da resposta; o brief e o texto do negócio levam a oferta digitada', () => provaUmaVezTexto())
console.log('\nV. variações')
await check('V1 3 e 5 ângulos DISTINTOS na ordem da BF; a oferta falada só existe com oferta; 1 = nenhum ângulo (o anúncio de sempre)', () => provaAngulos())
await check('V2 cada ângulo é um pedido diferente ao modelo (sem número, sem depoimento inventado); sem kit = o MESMO pedido', () => provaAngulosPedido())
await check('V3 a ordem das fotos muda por variação (5 ordens distintas com 4 fotos; a do produto, que faz o gancho, fica 1ª)', () => provaFotos())
await check('V4 o corpo do /plan: offer ≤ 24, kit_angle da lista, kit_variant 0–4, "oferta falada" sem oferta = 400; 16 línguas com 4 sugestões ≤ 24 caracteres', () => provaCorpo())
await check('V5 EXECUTADO (o lote da tela, AdsV2KitBf.tsx): N−1 rascunhos com research_from, N roteiros pelo /batch com ângulos distintos e as MESMAS fotos/oferta, fila com expected_credits = N × preço e batch_id; roteiro que falhou = fila não começa', () => provaLote())
await check('V6 o total das N = N × adsV2Credits do nível (nos 3 níveis), sem desconto', () => provaTotal())
await check('V7 a tela: o total aparece ANTES de confirmar (no botão e na prévia), N > 1 vai pelo lote e abre a tela do lote (baixar todos)', () => provaTela())
console.log('\nP. preço intocado')
await check('P1 v2Tiers/v2Billing/v2Batch/v2BatchRules/v2StartCore//start//batch/sample/serverAccess/v2Contract/v2CloseReal fora da entrega; o lote confere o total (price_changed) e a amostra não entra no lote', () => provaPreco())

console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-kit-bf-1910.mjs), é EXATAMENTE a base ${KIT_BF_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  KIT_BF_1910_ARQUIVOS.length >= 6 && KIT_BF_1910_ARQUIVOS.every((f) => base(f) !== null && lf(semKitBf1910(semHome3Cards1910(affiliateRaw(f, readFileSync(join(ROOT, f), 'utf8')), f), f)) === base(f)) && // reancorado KINEO-HOME-3-CARDS-1910 — a camada dos 3 cards (mais nova) sai primeiro
  KIT_BF_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 toda linha nova/trocada dos arquivos tocados carrega a marca; a contagem de acréscimos e as trocas batem; a marca não contém a de outra camada', () =>
  MARCA_KIT_BF_1910 === MARCA && KIT_BF_1910_ARQUIVOS.every((f) => { const n = disco(f).split('\n').filter((l) => l.includes(MARCA)).length; return n === (ACRESCIMOS_KIT_BF_1910[f] ?? 0) + (TROCAS_KIT_BF_1910[f] ?? []).length && n > 0 }) && !/CLOSE-REAL|META95|FIEL/.test(MARCA))
await check('D3 idempotente e restrito: texto sem a marca ou arquivo fora da lista passa igual; contagem errada lança', () =>
  semKitBf1910('a\nb', F.plan) === 'a\nb' && semKitBf1910('a // ' + MARCA + '\nb', 'outro.ts') === 'a // ' + MARCA + '\nb' && (() => { try { semKitBf1910('a // ' + MARCA + '\n' + disco(F.plan), F.plan); return false } catch { return true } })())
await check('D4 encadeamento: a cabeça da cadeia do Ads (semCloseRealLegendaCorte1910) tira o kit PRIMEIRO; v2Brief/v2PlanCore/v2Advance/tela pela cadeia = a base', () => {
  const corte = disco('scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs')
  return corte.includes("import { semKitBf1910 } from './desfaz-kit-bf-1910.mjs'") && corte.includes('  texto = semKitBf1910(texto, p)') &&
    [F.plan, F.brief, F.advance, F.tela].every((f) => lf(semCloseRealLegendaCorte1910(affiliateRaw(f, readFileSync(join(ROOT, f), 'utf8')), f)) === base(f))
})
await check('D5 reâncoras: o guardião da rodada 3 do Close real só não conta como tocado o arquivo cujo ÚNICO toque é o do kit', () => {
  const v3 = disco('scripts/test-close-real-v3-1910.mjs')
  return v3.includes("import { semKitBf1910, KIT_BF_1910_ARQUIVOS } from './test-support/desfaz-kit-bf-1910.mjs'") && /tocados\.splice\(0, tocados\.length, \.\.\.tocados\.filter\(\(f\) => !\(KIT_BF_1910_ARQUIVOS\.includes\(f\) && lf\(semKitBf1910/.test(v3)
})
await check('D6 o 4:5 ficou anotado (a montagem do Close real é 9:16 de ponta a ponta) — nada de formato prometido sem montagem', () => {
  const k = disco(F.kit)
  return /4:5 — NÃO entra nesta parte/.test(k) && /ADS_V2_KIT_BF_FORMAT_NOTE/.test(k) && !/['"]4:5['"]/.test(disco(F.painel))
})

console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, file, a, b, provas) => {
  let src
  try { src = trocar(file === F.painel ? disco(F.painel) : disco(file), a, b) } catch (e) { ok(false, `mutante "${nome}" APLICADO (${e.message})`); return }
  const over = { [file]: src }
  const res = []
  for (const p of provas) res.push(await tenta(() => p(over)))
  ok(res.some((r) => !r), `mutante "${nome}" → vermelho`)
}
await mut('selo ignora o produto', F.montage, '          if (hit(box, span, ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP)) continue\n', '', [provaSelo])
await mut('selo ignora as legendas', F.montage, '          if (captions.some((c) => hit(box, c, ADS_V2_KIT_BF_BADGE_TEXT_GAP))) continue\n', '', [provaSelo])
await mut('oferta vazia mexe na montagem', F.montage, "  if (!offer || !source || !Array.isArray(source.elements)) return source", "  if (!source || !Array.isArray(source.elements)) return source", [provaVaziaMontagem])
await mut('oferta por cima do nome no cartão', F.montage, '    const top = nameBottom + ADS_V2_KIT_BF_CARD_GAP', '    const top = nameBottom - 0.03', [provaCartao])
await mut('botão do cartão passa de 65%', F.montage, 'export const ADS_V2_KIT_BF_CARD_BUTTON_GAP = 0.022', 'export const ADS_V2_KIT_BF_CARD_BUTTON_GAP = 0.2', [provaCartao])
await mut('cartão troca sem o fundo do kit', F.montage, '  if (cardImg && nameEl && btnEl && kitUrl && ', '  if (cardImg && nameEl && btnEl && ', [provaCartaoSemFundo, provaCartao])
await mut('oferta repetida fica', F.kit, '  if (n === 1) return { text, fix: null }', '  if (n >= 1) return { text, fix: null }', [provaUmaVez, provaUmaVezTexto])
await mut('oferta esquecida não entra', F.kit, "  return { text: out.join(' ').replace(/\\s+/g, ' ').trim(), fix: 'inserted' }", "  return { text, fix: null }", [provaUmaVez, provaUmaVezTexto])
await mut('o pedido não diz ONCE', F.kit, 'exactly ONCE', 'at least once', [provaUmaVezTexto])
await mut('ângulos repetidos', F.kit, '  return (hasOffer ? POOL_WITH_OFFER : POOL_NO_OFFER).slice(0, Math.min(n, POOL_WITH_OFFER.length))', "  return Array.from({ length: Math.min(n, 5) }, () => 'classic' as AdsV2KitBfAngle)", [provaAngulos, provaLote])
await mut('oferta falada sem oferta', F.kit, "const POOL_NO_OFFER: readonly AdsV2KitBfAngle[] = ['problem', 'gift', 'social', 'new', 'classic']", "const POOL_NO_OFFER: readonly AdsV2KitBfAngle[] = ['offer', 'problem', 'gift', 'social', 'new']", [provaAngulos, provaLote])
await mut('desconto escondido no total', F.kit, '  return k * credits', '  return Math.round(k * credits * 0.9)', [provaTotal, provaLote])
await mut('amostra recebe a oferta', F.kit, '  if (!ctx.closeReal || !ctx.paid) return { ok: true, value: ADS_V2_KIT_BF_NONE }', '  if (!ctx.closeReal) return { ok: true, value: ADS_V2_KIT_BF_NONE }', [provaVaziaCorpo])
await mut('sem kit o pedido muda', F.kit, '  if (!lines.length) return msgs', '  if (!lines.length) return { ...msgs, system: msgs.system + "\\n" }', [provaVaziaTexto, provaAngulosPedido])
await mut('fotos na mesma ordem', F.kit, '  const r = variant % L', '  const r = 0', [provaFotos])
await mut('lote cobra o preço de UM', F.painel, 'expected_credits: total } })', 'expected_credits: i.credits } })', [provaLote])
await mut('lote começa com roteiro falho', F.painel, "  if (out.length !== i.n || out.some((r) => r.ok !== true)) return { ok: false, error: k.failed }\n  if (planned.data.credits_total !== total) return { ok: false, error: k.failed }\n", '', [provaLote])
await mut('lote sem ângulo', F.painel, ' kit_angle: angles[v],', '', [provaLote])

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
