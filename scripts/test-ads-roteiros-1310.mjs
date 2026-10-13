// KINEO-ADS-ROTEIROS-2026-10-13 — guardião dos 2 a 3 ROTEIROS para escolher no Studio Ads v2 (benchmark Creatify/Topview, item
// 2; fundador aprovou em 13/10). Prova, EXECUTANDO o código real pelo carregador offline da casa (modelo, banco e eventos
// simulados):
//   A. contrato puro (lib/ads/v2Scripts.ts): no máximo 3 roteiros, o 1º SEMPRE o texto de sempre (id 'a'), tom não repete,
//      texto igual não repete, frases nas janelas do plano com a MESMA conta do núcleo;
//   B. cada versão passa pela MESMA régua do texto de sempre (checkV2Copy real: palavras da duração, marca na 1ª frase,
//      anti-invenção, honestidade e FTC do ator) — versão com depoimento, alegação inventada ou fora da régua de palavras SAI;
//      o pedido das versões leva as mesmas regras (honestidade, produto, ator) e a cena como clima da "story";
//   C. volta a 1 roteiro sem derrubar o plano: timeout, erro, JSON ruim ou prazo curto das versões = 1 roteiro, plano ok;
//      sem scripts:true nenhuma chamada a mais;
//   D. o /plan inteiro (adsV2PlanFor real): devolve scripts[] (1º = narration/overlays da resposta), grava os roteiros NO plano
//      do pedido com script_id 'a'; o crédito é o de sempre; timeout das versões = 1 roteiro e 200; app da Shopify = o 1º;
//   E. escolher (adsV2ChooseFor real): só um roteiro GUARDADO, pelo id; texto do cliente no corpo é ignorado; dono e status
//      conferidos; o UPDATE só troca o plano (narração/frases/script_id), planos de câmera iguais; preço igual;
//   F. o /start de sempre (adsV2StartFor real) usa o roteiro escolhido (moderação, ensaio e planos gravados) e debita o MESMO;
//   G. byte a byte: tirando as linhas marcadas, o /plan e o /start remontam a base (mesma impressão digital da cena);
//   M. mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { desfazExtracao, textoOriginalV2 } from './test-support/shopify-extracao-v2-1310.mjs'
import { MARCA_ROTEIROS, semRoteiros } from './test-support/desfaz-roteiros-1310.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }
const vermelho = async (fn) => { try { return !(await fn()) } catch { return true } }

const F = {
  scripts: 'lib/ads/v2Scripts.ts',
  brief: 'lib/ads/v2Brief.ts',
  core: 'lib/ads/v2PlanCore.ts',
  choose: 'lib/ads/v2ChooseCore.ts',
  startCore: 'lib/ads/v2StartCore.ts',
  planRoute: 'app/api/ads/v2/plan/route.ts',
  chooseRoute: 'app/api/ads/v2/plan/choose/route.ts',
  shopify: 'app/api/shopify/ads/route.ts',
  shots: 'lib/ads/v2ShotLists.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
// OPENAI_API_KEY falsa: o núcleo do /plan só confere que existe (o modelo é simulado; rede proibida pelo carregador).
const carregar = (over = {}, mocks = {}) => createOfflineLoader({ mocks, env: { OPENAI_API_KEY: 'offline-test' }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const SH = carregar()(F.shots)

// ═══ Fixture: "Amber Perfume 50ml", cena "in a hotel room on a rainy night" ══════════════════════════════════════════
const HOTEL = 'in a hotel room on a rainy night'
const SENTENCE = 'Amber Perfume 50ml, a warm amber and vanilla eau de parfum in a heavy glass bottle'
const MAX_WORDS = SH.adsV2NarrationMaxWords(15) // 30
const BRIEF_JSON = JSON.stringify({ business: 'Amber Perfume — eau de parfum', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' })
const MAIN = { narration: 'Meet Amber Perfume, a warm eau de parfum with amber and vanilla. It sits in a heavy glass bottle and feels rich on the skin. Find your signature scent today.', overlays: ['Amber Perfume', 'Warm amber and vanilla'], sector: 'store' }
const BOLD = { tone: 'bold', narration: 'What does warm smell like? Amber Perfume answers with amber and vanilla in a heavy glass bottle. A single spray and the room changes. Make it your signature scent.', overlays: ['Amber Perfume', 'This is what warm smells like'] }
const STORY = { tone: 'story', narration: 'Rain on the window, a quiet hotel room, the evening slowing down. Then Amber Perfume, warm amber and vanilla from a heavy glass bottle. Make the night yours.', overlays: ['Amber Perfume', 'For rainy nights'] }
// Versões que a régua tem de recusar.
const BOLD_INVENTADO = { tone: 'bold', narration: 'Award-winning Amber Perfume is the number one scent in town. Get 50% off, today only, while supplies last. Thousands of fans wear it every night.', overlays: ['Amber Perfume', '50% off today only'] }
const STORY_LONGA = { tone: 'story', narration: Array.from({ length: 8 }, () => 'Rain taps the window of a quiet hotel room while Amber Perfume warms the air.').join(' '), overlays: ['Amber Perfume', 'For rainy nights'] }
const STORY_DEPOIMENTO = { tone: 'story', narration: 'I have worn Amber Perfume every night and I love it. My skin smells warm for hours. Honestly, it changed my life. Trust me, try it.', overlays: ['Amber Perfume', 'For rainy nights'] }
const variantesJson = (...v) => JSON.stringify({ variants: v })

class APIConnectionTimeoutError extends Error { constructor() { super('Request timed out.'); this.name = 'APIConnectionTimeoutError' } }
/** O modelo simulado: responde por max_tokens (900 = brief, 700 = texto, 1100 = versões). `versoes` = string, 'timeout' ou 'boom'. */
const modelo = (versoes) => {
  const log = []
  const openai = { chat: { completions: { create: async (body, opts) => {
    log.push({ tokens: body.max_tokens, timeout: opts.timeout, maxRetries: opts.maxRetries, system: body.messages[0].content })
    if (body.max_tokens === 900) return { choices: [{ message: { content: BRIEF_JSON } }] }
    if (body.max_tokens === 1100) {
      if (versoes === 'timeout') throw new APIConnectionTimeoutError()
      if (versoes === 'boom') throw Object.assign(new Error('boom'), { status: 500 })
      return { choices: [{ message: { content: versoes } }] }
    }
    return { choices: [{ message: { content: JSON.stringify(MAIN) } }] }
  } } } }
  return { log, openai }
}
const extrair = async (versoes, extra = {}, over = {}) => {
  const m = modelo(versoes)
  const B = carregar(over, { '@/lib/openai': { openai: m.openai } })(F.brief)
  const r = await B.extractAdsV2Brief({
    text: SENTENCE, language: 'en', languageName: 'English', maxWords: MAX_WORDS, narration: true, overlays: true, facts: [], sentence: SENTENCE,
    productPhoto: true, typed: SENTENCE, scripts: true, scene: HOTEL, deadlineMs: Date.now() + 40_000, ...extra,
  })
  return { r, log: m.log, B }
}
/** A MESMA régua do texto de sempre, rodada de novo sobre o que saiu (checkV2Copy real, com honestidade e ator). */
const passaNaRegua = (B, r, copy, presenter = false) => {
  const honesty = { source: SENTENCE, typed: SENTENCE, product: true, places: [], ...(presenter ? { presenter: true, brand: 'Amber Perfume' } : {}) }
  const c = B.checkV2Copy(JSON.stringify({ narration: copy.narration, overlays: copy.overlays, sector: '' }), r.brief, { maxWords: MAX_WORDS, narration: true, ad: { product: true, presenter }, honesty })
  const words = String(copy.narration).trim().split(/\s+/).length
  return c.ok && words >= Math.ceil(MAX_WORDS * 0.5) && words <= MAX_WORDS
}

// ═══ A. contrato puro ══════════════════════════════════════════════════════════════════════════════════════════════
const SLOTS = [{ role: 'brand', start: 0, end: 4 }, { role: 'offer', start: 5, end: 9 }, { role: 'contact', start: 10, end: 14 }]
const contratoOk = (S) => {
  const copies = [
    { tone: 'benefit', narration: 'A one', overlays: ['Brand', 'Offer'] },
    { tone: 'bold', narration: 'B one', overlays: ['Brand', 'Bold'] },
    { tone: 'bold', narration: 'B two', overlays: ['Brand', 'Bold 2'] },
    { tone: 'story', narration: 'A one', overlays: ['Brand', 'Offer'] }, // texto igual ao 1º: sai
    { tone: 'story', narration: 'C one', overlays: ['Brand', 'Story'] },
    { tone: 'benefit', narration: 'D', overlays: ['Brand'] },
  ]
  const s = S.adsV2BuildScripts(copies, SLOTS, true)
  const off = S.adsV2BuildScripts(copies, SLOTS, false)
  return s.length === 3 && S.ADS_V2_SCRIPTS_MAX === 3 &&
    s.map((x) => `${x.id}:${x.tone}:${x.narration}`).join('|') === 'a:benefit:A one|b:bold:B one|c:story:C one' &&
    JSON.stringify(s[0].overlays) === JSON.stringify([{ role: 'brand', start: 0, end: 4, text: 'Brand' }, { role: 'offer', start: 5, end: 9, text: 'Offer' }]) &&
    s[0].label === 'Benefit-first' && s[1].label === 'Bold hook' && s[2].label === 'Story' && s[0].words === 2 &&
    off.every((x) => x.overlays.length === 0) &&
    S.adsV2BuildScripts([], SLOTS, true).length === 0
}
await check('A1 no máximo 3 roteiros; o 1º é SEMPRE o texto de sempre (a/benefit); tom e texto repetidos saem; frases nas janelas do plano; frases desligadas = []', () => contratoOk(carregar()(F.scripts)))
await check('A2 a conta das frases é a MESMA do núcleo do /plan (mesma expressão: janela ← frase de mesmo índice, janela vazia sai)', () =>
  /plan\.overlays\n\s+\.map\(\(slot, i\) => \(\{ role: slot\.role, start: slot\.start, end: slot\.end, text: extracted\.copy\.overlays\[i\] \?\? '' \}\)\)\n\s+\.filter\(\(o\) => o\.text\)/.test(SRC.core) &&
  /!overlaysOn \? \[\] : slots\.map\(\(slot, i\) => \(\{ role: slot\.role, start: slot\.start, end: slot\.end, text: texts\[i\] \?\? '' \}\)\)\.filter\(\(o\) => o\.text\)/.test(SRC.scripts))
const corpoOk = (S) => {
  const id = '11111111-2222-4333-8444-555555555555'
  const a = S.sanitizeChooseBody({ order_id: id, script_id: 'b', narration: 'HACK', overlays: ['x'] })
  return a.ok && JSON.stringify(a.value) === JSON.stringify({ order_id: id, script_id: 'b' }) &&
    S.sanitizeChooseBody({ order_id: id, script_id: 'z' }).error === 'bad_script_id' &&
    S.sanitizeChooseBody({ order_id: id, script_id: 'Meet our perfume' }).error === 'bad_script_id' &&
    S.sanitizeChooseBody({ order_id: 'x', script_id: 'a' }).error === 'bad_order_id' && S.sanitizeChooseBody(null).error === 'bad_body'
}
await check('A3 corpo do /choose: só { order_id, script_id ∈ a|b|c } — texto do cliente não passa do contrato', () => corpoOk(carregar()(F.scripts)))

// ═══ B. a MESMA régua para cada versão ═════════════════════════════════════════════════════════════════════════════
const felizOk = async (over = {}) => {
  const { r, log, B } = await extrair(variantesJson(BOLD, STORY), {}, over)
  const v = log.find((c) => c.tokens === 1100)
  return r.ok && r.variants.length === 2 && r.variants[0].tone === 'bold' && r.variants[1].tone === 'story' && r.variantsInfo.kept === 2 &&
    [r.copy, ...r.variants.map((x) => x.copy)].every((c) => passaNaRegua(B, r, c)) &&
    log.length === 3 && log[0].tokens === 900 && log[1].tokens === 700 && v && v.maxRetries === 0 && v.timeout <= 15_000 &&
    v.system.includes(B.ADS_V2_PRODUCT_NARRATION_RULE) && v.system.includes(B.ADS_V2_TONE_RULES.bold) && v.system.includes(B.ADS_V2_TONE_RULES.story) &&
    v.system.includes(`"${HOTEL}"`) && v.system.includes('Use ONLY the facts of the brief') && /Answer with JSON only: \{"variants":/.test(v.system) &&
    !/Answer with JSON only: \{"narration"/.test(v.system) && v.system.split('Answer with JSON only').length === 2
}
await check('B1 Amber Perfume + cena do hotel: 3 roteiros (o de sempre + bold + story), CADA UM aprovado de novo pela régua real (palavras 15–30, marca na 1ª frase, anti-invenção, honestidade); 1 chamada a mais (1100 tokens, ≤ 15 s, sem retry) com as regras de sempre + tons + a cena', () => felizOk())
const atorOk = async (over = {}) => {
  const { r, log, B } = await extrair(variantesJson(BOLD, STORY_DEPOIMENTO), { presenter: true }, over)
  const v = log.find((c) => c.tokens === 1100)
  const M = carregar()('lib/ads/v2Honesty.ts')
  return r.ok && v.system.includes(B.ADS_V2_PRESENTER_NARRATION_RULE) &&
    r.variants.every((x) => M.testimonialMarks(x.copy.narration, 'Amber Perfume').length === 0 && passaNaRegua(B, r, x.copy, true)) &&
    r.variants.some((x) => x.tone === 'bold') && !r.variants.some((x) => /love it|my skin|changed my life/i.test(x.copy.narration))
}
await check('B2 FTC: com o ator de IA, a versão "story" que fala como cliente ("I love it", "my skin", "changed my life") NÃO vira roteiro (o conserto que a encurta abaixo da régua de palavras não salva); a limpa fica', () => atorOk())
const inventadoOk = async (over = {}) => {
  const { r, B } = await extrair(variantesJson(BOLD_INVENTADO, STORY_LONGA), {}, over)
  return r.ok && r.variants.length === 0 && r.variantsInfo.kept === 0 && r.variantsInfo.dropped === 2 && passaNaRegua(B, r, r.copy)
}
await check('B3 anti-invenção e régua de palavras: "award-winning / number one / 50% off / today only / thousands of" e a versão de 100 palavras SAEM; o plano segue com o texto de sempre', () => inventadoOk())

// ═══ C. volta a 1 roteiro, nunca derruba o plano ═══════════════════════════════════════════════════════════════════
const quedaOk = async (over = {}) => {
  const t = await extrair('timeout', {}, over)
  const b = await extrair('boom', {}, over)
  const j = await extrair('not json', {}, over)
  const curto = await extrair(variantesJson(BOLD, STORY), { deadlineMs: Date.now() + 5_500 }, over)
  const sem = await extrair(variantesJson(BOLD, STORY), { scripts: undefined }, over)
  const mudo = await extrair(variantesJson(BOLD, STORY), { narration: false, overlays: false }, over)
  return t.r.ok && t.r.variants.length === 0 && t.r.variantsInfo.why === 'timeout' && t.r.copy.narration === MAIN.narration &&
    b.r.ok && b.r.variantsInfo.why === 'error' && j.r.ok && j.r.variantsInfo.why === 'bad_json' &&
    curto.r.ok && curto.log.filter((c) => c.tokens === 1100).every((c) => c.timeout <= 5_500) &&
    sem.r.ok && sem.log.length === 2 && !sem.r.variantsInfo && mudo.r.ok && mudo.log.length === 2
}
await check('C1 versões em timeout, erro 500, JSON ruim ou prazo curto = 1 roteiro e o plano OK (nunca exceção); sem scripts:true (ou sem voz e sem frases) nenhuma chamada a mais', () => quedaOk())

// ═══ D. o /plan inteiro ════════════════════════════════════════════════════════════════════════════════════════════
const UID = '0a0a0a0a-1111-4222-8333-444444444444'
const ORDER = '0b0b0b0b-1111-4222-8333-444444444444'
const P1 = '0c0c0c0c-1111-4222-8333-444444444444'
const CARD = '0d0d0d0d-1111-4222-8333-444444444444'
/** Cadeia do Supabase simulada: todo método devolve a cadeia; await = o resultado. Registra as chamadas. */
const cadeia = (resultado, log) => { const p = new Proxy({}, { get(_, k) { if (k === 'then') return (res, rej) => Promise.resolve(typeof resultado === 'function' ? resultado(log) : resultado).then(res, rej); return (...a) => { log.push([k, ...a]); return p } } }); return p }
const pedido = (extra = {}) => ({ id: ORDER, user_id: UID, status: 'draft', tier: 'commercial', seconds: 15, narration: true, language: 'en', sector: null, plan: null, card_url: 'https://cdn.test/card.png', logo_footage_id: null, photos: null, brief: { mode: 'simple', sentence: SENTENCE, scene: HOTEL, kind: 'product', overlays: true }, ...extra })
const mundo = ({ versoes = variantesJson(BOLD, STORY), order = pedido(), saldo = 999 } = {}) => {
  const w = { calls: [], events: [], moderation: [], loads: [], order, charges: [], rows: [] }
  const admin = { from(t) { const log = []; w.calls.push({ t, log }); return cadeia(() => {
    if (t === 'events') return { count: 0, error: null }
    if (t === 'profiles') return { data: { video_credits: saldo }, error: null }
    if (t === 'ads_v2_shots') return { error: null }
    if (t === 'ads_v2_orders') return { data: { id: ORDER, card_url: 'https://cdn.test/card.png' }, error: null }
    return { data: null, error: null }
  }, log) } }
  const m = modelo(versoes)
  const v2Server = {
    v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
    v2Json: (body, status = 200) => ({ status, body }),
    ownedFootage: async (_a, _uid, ids) => new Map(ids.map((id) => [id, { url: `https://cdn.test/${id}.${id === CARD ? 'png' : 'jpg'}`, isImage: true, isPng: id === CARD, isVideo: false }])),
    measureFootageVideo: async () => null,
  }
  const mocks = {
    '@/lib/openai': { openai: m.openai },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { w.events.push(e) } },
    '@/lib/safety/contentModeration': { moderateContent: async (a) => { w.moderation.push(a); return { ok: true } } },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, adsSampleOpen: async () => false, adsSampleLevelOk: () => true, adsSampleCapReached: async () => false, loadAdsAccess: async () => { throw new Error('não deveria') } },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Server': v2Server,
    '@/lib/ads/v2Advance': {
      loadAdsV2Order: async (_a, id, uid) => { w.loads.push({ id, uid }); return { order: id === w.order.id && uid === w.order.user_id ? w.order : null, error: null } },
      adsV2View: (o) => ({ order_id: o.id, status: 'generating', narration: o.plan?.narration }),
      buildInitialShotRows: (orderId, tier, plan) => { w.rows.push({ orderId, tier, plan }); return plan.shots.map((s) => ({ order_id: orderId, idx: s.idx, kind: s.kind })) },
      dispatchAdsV2Shots: async () => 0,
      loadAdsV2Shots: async () => [],
    },
    '@/lib/ads/v2Billing': { adsV2BillingRef: (o, g) => `adsv2-${o}-${g}`, chargeAdsV2: async (_a, x) => { w.charges.push(x.cost); return { ok: true, balance: 0 } }, failAdsV2Order: async () => null },
  }
  w.log = m.log
  w.mocks = mocks
  w.user = { id: UID, email: 'dono@test.dev' }
  w.access = { admin, reason: null, role: 'owner' }
  w.patch = () => w.calls.filter((c) => c.t === 'ads_v2_orders').map((c) => c.log.find((x) => x[0] === 'update')).filter(Boolean).map((x) => x[1])
  return w
}
const BODY = { mode: 'simple', order_id: ORDER, sector: 'store', logo_footage_id: null, photos: [{ footage_id: P1, kind: 'product' }], videos: [], card_footage_id: CARD, facts: [] }
const planejar = async (opts = {}, over = {}, body = BODY) => {
  const w = mundo(opts)
  const M = carregar(over, w.mocks)(F.core)
  const res = await M.adsV2PlanFor(w.user, w.access, async () => body, Date.now())
  return { w, res, stored: w.patch()[0]?.plan }
}
const TIERS = carregar()('lib/ads/v2Tiers.ts')
const planoOk = async (over = {}) => {
  const { res, stored, w } = await planejar({}, over)
  const b = res.body
  const served = w.events.find((e) => e.name === 'ads_v2_plan_served' && e.metadata.ok)
  return res.status === 200 && Array.isArray(b.scripts) && b.scripts.length === 3 && b.script_id === 'a' &&
    b.scripts.map((s) => `${s.id}:${s.tone}`).join(',') === 'a:benefit,b:bold,c:story' &&
    b.scripts[0].narration === b.narration && JSON.stringify(b.scripts[0].overlays) === JSON.stringify(b.overlays) &&
    b.scripts.every((s) => typeof s.label === 'string' && s.label && typeof s.words === 'number' && Array.isArray(s.overlays) && s.overlays.every((o) => typeof o.start === 'number' && o.text)) &&
    stored && stored.narration === MAIN.narration && stored.script_id === 'a' && JSON.stringify(stored.scripts) === JSON.stringify(b.scripts) &&
    JSON.stringify(stored.overlays) === JSON.stringify(b.overlays) && b.scene === HOTEL &&
    b.credits === TIERS.adsV2Credits('commercial', 15) && served && served.metadata.scripts === 3
}
await check('D1 o /plan real devolve scripts[3] (a/benefit, b/bold, c/story) com o 1º = narration/overlays da resposta, grava os roteiros NO plano (script_id "a") e o crédito é o de sempre', () => planoOk())
const planoQuedaOk = async (over = {}) => {
  const { res, stored, w } = await planejar({ versoes: 'timeout' }, over)
  const served = w.events.find((e) => e.name === 'ads_v2_plan_served' && e.metadata.ok)
  return res.status === 200 && res.body.scripts.length === 1 && res.body.scripts[0].id === 'a' && res.body.narration === MAIN.narration &&
    stored.scripts.length === 1 && served.metadata.scripts === 1 && served.metadata.scripts_why === 'timeout'
}
await check('D2 versões em timeout no /plan real: 200 com 1 roteiro (o de sempre) e o evento diz por quê (scripts_why "timeout")', () => planoQuedaOk())
await check('D3 app da Shopify = o 1º: chama o MESMO adsV2PlanFor, devolve narration/overlays da resposta (= scripts[0]) e começa só com { order_id } (o /start lê o plano gravado com o roteiro "a")', async () => {
  const { res, stored } = await planejar({}, {}, { ...BODY, style: undefined })
  return /await adsV2PlanFor\(user, access, async \(\) => planBody, started\)/.test(SRC.shopify) && /narration: out\.body\.narration \?\? null,/.test(SRC.shopify) &&
    /await adsV2StartFor\(user, access, async \(\) => \(\{ order_id: order\.id \}\), started\)/.test(SRC.shopify) && !/script_id|plan\/choose/.test(SRC.shopify) &&
    res.body.narration === res.body.scripts[0].narration && stored.narration === stored.scripts[0].narration && stored.script_id === 'a'
})

await check('D4 corpo com scripts:false (ex.: o lote, que vai direto para a fila) = só o texto de sempre: nenhuma chamada a mais e 1 roteiro', async () => {
  const { res, w } = await planejar({}, {}, { ...BODY, scripts: false })
  return res.status === 200 && res.body.scripts.length === 1 && res.body.scripts[0].narration === MAIN.narration && w.log.length === 2 && !w.log.some((c) => c.tokens === 1100)
})

// ═══ E. escolher: só o roteiro GUARDADO ════════════════════════════════════════════════════════════════════════════
const planoGuardado = async () => (await planejar()).stored
const escolher = async (body, { order, over = {} } = {}) => {
  const w = mundo({ order })
  const M = carregar(over, w.mocks)(F.choose)
  const res = await M.adsV2ChooseFor(w.user, w.access, async () => body)
  return { w, res, patch: w.patch()[0] }
}
const escolhaOk = async (over = {}) => {
  const plan = await planoGuardado()
  const order = pedido({ status: 'planned', plan })
  const { res, patch, w } = await escolher({ order_id: ORDER, script_id: 'b', narration: 'HACKED by client', overlays: ['HACK'] }, { order, over })
  const b = plan.scripts.find((s) => s.id === 'b')
  const upd = w.calls.find((c) => c.t === 'ads_v2_orders').log
  return res.status === 200 && res.body.script_id === 'b' && res.body.narration === b.narration && patch && Object.keys(patch).join(',') === 'plan' &&
    patch.plan.narration === b.narration && JSON.stringify(patch.plan.overlays) === JSON.stringify(b.overlays) && patch.plan.script_id === 'b' &&
    JSON.stringify(patch.plan.shots) === JSON.stringify(plan.shots) && patch.plan.totalSeconds === plan.totalSeconds && JSON.stringify(patch.plan.scripts) === JSON.stringify(plan.scripts) &&
    !JSON.stringify(patch).includes('HACK') && res.body.credits === TIERS.adsV2Credits('commercial', 15) &&
    upd.some((x) => x[0] === 'eq' && x[1] === 'user_id' && x[2] === UID) && upd.some((x) => x[0] === 'in' && x[1] === 'status' && JSON.stringify(x[2]) === '["draft","planned"]') &&
    w.loads[0].uid === UID
}
await check('E1 escolher "b": o plano passa a ter a narração e as frases GUARDADAS do "b" (o "HACKED" do corpo é ignorado); o UPDATE só tem `plan`, condicional (dono + draft|planned); planos de câmera e duração iguais; crédito igual', () => escolhaOk())
const recusasOk = async (over = {}) => {
  const plan = await planoGuardado()
  const so1 = { ...plan, scripts: plan.scripts.slice(0, 1) }
  const a = await escolher({ order_id: ORDER, script_id: 'c' }, { order: pedido({ status: 'planned', plan: so1 }), over })
  const g = await escolher({ order_id: ORDER, script_id: 'b' }, { order: pedido({ status: 'generating', plan }), over })
  const outro = await escolher({ order_id: ORDER, script_id: 'b' }, { order: pedido({ status: 'planned', plan, user_id: '0e0e0e0e-1111-4222-8333-444444444444' }), over })
  const z = await escolher({ order_id: ORDER, script_id: 'z' }, { order: pedido({ status: 'planned', plan }), over })
  const velho = await escolher({ order_id: ORDER, script_id: 'a' }, { order: pedido({ status: 'planned', plan: { ...plan, scripts: undefined } }), over })
  return a.res.status === 404 && a.res.body.error === 'script_not_found' && !a.patch && g.res.status === 409 && !g.patch &&
    outro.res.status === 404 && outro.res.body.error === 'order_not_found' && !outro.patch && z.res.status === 400 && !z.patch &&
    velho.res.status === 409 && velho.res.body.error === 'no_scripts' && !velho.patch
}
await check('E2 recusas sem gravar nada: roteiro que o plano não guardou (404), pedido já gerando (409), pedido de OUTRA conta (404), id fora de a|b|c (400), plano antigo sem roteiros (409)', () => recusasOk())
await check('E3 a rota /api/ads/v2/plan/choose só lê o login e o acesso do workspace e chama adsV2ChooseFor; o núcleo não cobra, não chama modelo nem fal', () =>
  /return await adsV2ChooseFor\(user, access, \(\) => req\.json\(\)\.catch\(\(\) => null\)\)/.test(SRC.chooseRoute) && /loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/.test(SRC.chooseRoute) &&
  !/chargeAdsV2|refund|openai|fal\.|debit|video_credits/.test(SRC.choose.replace(/^\/\/.*$/gm, '')))

// ═══ F. o /start de sempre usa o roteiro escolhido; preço igual ═════════════════════════════════════════════════════
const comecar = async (plan, dryRun) => {
  const w = mundo({ order: pedido({ status: 'planned', plan }) })
  const M = carregar({}, w.mocks)(F.startCore)
  const res = await M.adsV2StartFor(w.user, w.access, async () => ({ order_id: ORDER, ...(dryRun ? { dry_run: true } : {}) }), Date.now())
  return { w, res }
}
const startOk = async (over = {}) => {
  const plan = await planoGuardado()
  const order = pedido({ status: 'planned', plan })
  const { patch } = await escolher({ order_id: ORDER, script_id: 'c' }, { order, over })
  const c = plan.scripts.find((s) => s.id === 'c')
  const ensaioA = await comecar(plan, true)
  const ensaioC = await comecar(patch.plan, true)
  const pagoA = await comecar(plan, false)
  const pagoC = await comecar(patch.plan, false)
  return ensaioC.res.body.narration === c.narration && JSON.stringify(ensaioC.res.body.overlays) === JSON.stringify(c.overlays) &&
    ensaioA.res.body.narration === plan.scripts[0].narration && ensaioA.res.body.credits === ensaioC.res.body.credits &&
    JSON.stringify(ensaioA.res.body.usd_estimate) === JSON.stringify(ensaioC.res.body.usd_estimate) &&
    pagoC.res.status === 202 && pagoC.w.moderation[0].text.startsWith(c.narration) && pagoC.w.rows[0].plan.narration === c.narration &&
    pagoA.w.charges.length === 1 && JSON.stringify(pagoA.w.charges) === JSON.stringify(pagoC.w.charges) && pagoC.w.charges[0] === TIERS.adsV2Credits('commercial', 15)
}
await check('F1 /start real depois de escolher "c": o ensaio e a moderação leem o texto do "c", os planos gravados levam o "c"; o débito é o MESMO do "a" (preço do nível × duração, US$ estimado igual)', () => startOk())

// ═══ G. byte a byte ════════════════════════════════════════════════════════════════════════════════════════════════
const PLAN_BASE_SHA = '95c7c1ec1db4a6bd4ca0c7979e0d672fd89aa9ad3cc5fd043a661f9df824bac1' // o mesmo de test-ads-cena-1310 / test-shopify-app-1310
const START_BASE_SHA = 'd80097067c7a40121329c4336c046d177cdd16f678b361c96412b10ab937c49b'
const MARCADAS_CORE = [
  /^import \{ adsV2BuildScripts \} from '@\/lib\/ads\/v2Scripts' \/\//,
  /^\s+scripts: \(body as \{ scripts\?: unknown \} \| null\)\?\.scripts !== false, scene: adsV2SceneSetting\(brief0, order\.tier\), \/\//,
  /^\s+if \(extracted\.ok && extracted\.variantsInfo\) Object\.assign\(modeTag, \{ scripts: 1 \+ extracted\.variantsInfo\.kept, /,
  /^\s+const scripts = adsV2BuildScripts\(\[\{ tone: 'benefit', narration: extracted\.copy\.narration, overlays: extracted\.copy\.overlays \}, /,
  /^\s+Object\.assign\(stored, \{ scripts, script_id: scripts\[0\]\?\.id \?\? 'a' \}\) \/\//,
  /^\s+scripts, \/\//,
  /^\s+script_id: scripts\[0\]\?\.id \?\? 'a', \/\//,
]
const marcadasOk = (core) => {
  const linhas = core.split('\n').filter((l) => l.includes(MARCA_ROTEIROS))
  return linhas.length === MARCADAS_CORE.length && MARCADAS_CORE.every((re) => linhas.filter((l) => re.test(l)).length === 1)
}
await check('G1 núcleo do /plan: as linhas marcadas são EXATAMENTE as 7 esperadas; nenhuma fala de crédito, débito ou preço; sem elas, nenhum rastro dos roteiros', () =>
  marcadasOk(SRC.core) && !/credit|debit|charge|refund|adsV2Credits|estimateAdUsd/i.test(SRC.core.split('\n').filter((l) => l.includes(MARCA_ROTEIROS)).join('\n').replace(/\/\/.*$/gm, '')) &&
  !/scripts|adsV2BuildScripts|variants/.test(semRoteiros(SRC.core).replace(/^\s*\/\/.*$/gm, '')))
await check('G2 tirando as linhas marcadas (cena + atores + roteiros), o /plan e o /start remontam BYTE A BYTE a base; /start, avanço, montagem e cobrança sem a marca', () =>
  sha(textoOriginalV2('plan', ROOT)) === PLAN_BASE_SHA && sha(textoOriginalV2('start', ROOT)) === START_BASE_SHA &&
  ['lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/ads/v2Advance.ts', 'lib/ads/v2Billing.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Tiers.ts', 'lib/shopify/adFlow.ts'].every((f) => !rd(f).includes(MARCA_ROTEIROS)) &&
  !SRC.planRoute.includes(MARCA_ROTEIROS))
await check('G3 o módulo dos roteiros é PURO (sem modelo, banco, fetch, eventos nem preço)', () =>
  !/from '@\/lib\/(openai|supabase|serverEvents|safety)|fetch\(|createClient|chargeAdsV2|adsV2Credits/.test(SRC.scripts))

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, arquivo, de, para, prova) => {
  let m
  try { m = trocar(SRC[arquivo], de, para) } catch (e) { ok(false, `mutante "${nome}": ${e.message}`); return }
  const aplicou = m !== SRC[arquivo] && m.includes(para)
  ok(aplicou && await vermelho(() => prova({ [F[arquivo]]: m }, m)), `mutante "${nome}" aplicou e fica VERMELHO`)
}
await mutante('versão sem a régua de honestidade/FTC', 'brief', 'let c = checkV2Copy(raw, brief, opts)\n', 'let c = checkV2Copy(raw, brief, { ...opts, honesty: undefined })\n', (over) => atorOk(over))
await mutante('conserto que baixa o piso de palavras (salva a versão encurtada)', 'brief', 'const again = checkV2Copy(repaired.raw, brief, relaxedOpts)', 'const again = checkV2Copy(repaired.raw, brief, { ...relaxedOpts, minWords: 1 })', (over) => atorOk(over))
await mutante('versão sem a régua de palavras da duração', 'brief', 'let c = checkV2Copy(raw, brief, opts)\n', 'let c = checkV2Copy(raw, brief, { ...opts, maxWords: 999, minWords: 1 })\n', (over) => inventadoOk(over))
await mutante('versões que derrubam o plano no timeout', 'brief', "return { list: [], why: isAdsV2ModelTimeout(e) ? 'timeout' : 'error' }", 'throw e', (over) => quedaOk(over))
await mutante('versões sem o pedido de regras de sempre (só os tons)', 'brief', '    rules,\n    ADS_V2_VARIANTS_HEADER,', '    ADS_V2_VARIANTS_HEADER,', (over) => felizOk(over))
await mutante('tom repetido vira roteiro', 'scripts', "if (!isAdsV2ScriptTone(c.tone) || seenTone.has(c.tone)) continue", 'if (!isAdsV2ScriptTone(c.tone)) continue', (over) => contratoOk(carregar(over)(F.scripts)))
await mutante('Shopify/1º roteiro deixa de ser o texto de sempre (versões primeiro)', 'scripts', 'for (const c of copies) {', 'for (const c of [...copies].reverse()) {', (over) => planoOk(over))
await mutante('escolha que ignora o id (sempre o 1º)', 'scripts', 'const script = scripts.find((s) => s.id === scriptId)', 'const script = scripts[0]', (over) => escolhaOk(over))
await mutante('corpo do /choose aceita qualquer id (texto livre)', 'scripts', "if (typeof b.script_id !== 'string' || !(ADS_V2_SCRIPT_IDS as readonly string[]).includes(b.script_id)) return { ok: false, error: 'bad_script_id' }", "if (typeof b.script_id !== 'string') return { ok: false, error: 'bad_script_id' }", (over) => corpoOk(carregar(over)(F.scripts)))
await mutante('escolher muda o preço (grava a duração junto)', 'choose', '.update({ plan: chosen.plan })', '.update({ plan: chosen.plan, seconds: 30 })', (over) => escolhaOk(over))
await mutante('escolher sem conferir o dono (UPDATE sem user_id)', 'choose', "      .eq('user_id', uid)\n", '', (over) => escolhaOk(over))
await mutante('escolha que não chega ao /start (grava o plano velho)', 'choose', '.update({ plan: chosen.plan })', '.update({ plan: order.plan })', (over) => startOk(over))
await mutante('linha dos roteiros sem a marca (byte a byte quebra)', 'core', "      script_id: scripts[0]?.id ?? 'a', // KINEO-ADS-ROTEIROS-2026-10-13 — o roteiro que está no plano", "      script_id: scripts[0]?.id ?? 'a', // o roteiro que está no plano", (_o, m) => sha(desfazExtracao('plan', SRC.planRoute, m)) === PLAN_BASE_SHA && marcadasOk(m))

console.log(`\ntest-ads-roteiros-1310: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
