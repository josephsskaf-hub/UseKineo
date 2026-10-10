// KINEO-ATOR-AJUSTES-2026-10-09 — guardião dos 3 ajustes do anúncio v2 com ATOR, achados no canário de produção 7112d56c
// (09/10: modo simples, 3 fotos de um perfume, "LUME eau de parfum, a light floral scent that lasts all day", foto em
// movimento, estilo product_closeup, ator ligado; entregue 14,5 s 1080×1920). Aprovado pelo fundador ("ajusta").
// Prova, EXECUTANDO o código real pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs):
//   (1) FRASES NO TERÇO DE BAIXO com ator: a caixa fica entre 2/3 da altura e os 12% de baixo (interface das redes), mesmo
//       estilo; SEM ator, o source é byte a byte o da base 88f3eac9 (a caixa de sempre, centro 45%);
//   (2) SEM CAUDA PRETA: nas DUAS montagens o cartão termina exatamente no fim da composição e TODO quadro (1/24 s) tem um
//       plano/ator/cartão de tela cheia por cima do fundo preto — inclusive os números do canário (fala 12,25 s → 14,5 s).
//       Medido no MP4 entregue: o "1 s preto" era o 16º quadrado da grade 2×8 (15 quadros a 1/s), não o vídeo;
//   (3) PRODUTO É PRODUTO: frase com nome de produto (perfume/sérum/tênis, en/pt/es) = setor 'store', foto 'product' e
//       anúncio de PRODUTO; os exemplos de LUGAR (o placeholder nas 3 línguas + mais 2) seguem lugar; o pedido de texto ganha
//       a regra de produto (sem "At X, we offer a selection") e, com ator, a fala em 1ª pessoa de criador (UGC); sem
//       produto/ator o pedido é byte a byte o da base; a régua recusa a fala de loja do canário, pede 1 correção e nunca dá
//       502 pelo tom; a rota manda productPhoto/presenter à extração;
//   (4) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + ts.transpileModule (via offline-ts-loader). Nenhum import com alias @/.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); return src.split(de).join(para) }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps

const BASE = '88f3eac9'
const F = {
  montage: 'lib/ads/adV2Montage.ts',
  simple: 'lib/ads/v2Simple.ts',
  brief: 'lib/ads/v2Brief.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  plan: 'app/api/ads/v2/plan/route.ts',
  screen: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
}
/** O arquivo como estava na base (antes destes ajustes): para provar "sem ator/sem produto = byte a byte o de antes". */
const atBase = (rel) => execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replace(/\r\n/g, '\n')

// ── carregador: módulos reais (puros) e uma OpenAI falsa; `over` troca a fonte (mutantes / base) ───────────────────────
const openaiFalsa = (respostas = []) => {
  const log = []
  return {
    log,
    openai: { chat: { completions: { create: async (params) => { log.push(structuredClone(params)); const r = respostas.shift(); return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] } } } } },
  }
}
const world = (over = {}, oa = openaiFalsa()) => createOfflineLoader({
  mocks: { '@/lib/openai': { openai: oa.openai } },
  source: (rel, text) => (Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : text),
})
const base = world()
const M = base(F.montage)
const S = base(F.simple)
const BR = base(F.brief)
const SL = base(F.shots)

// ═══ 1. frases no terço de baixo com ator ════════════════════════════════════════════════════════════════════════════
const url = (n) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${n}.jpg`
const clip = (n) => `https://x.supabase.co/storage/v1/object/public/renders/u/${n}.mp4`
const MUSIC_URL = 'https://x.supabase.co/storage/v1/object/public/music/u/trilha.mp3'
const VOICE_URL = 'https://x.supabase.co/storage/v1/object/public/voiceovers/u/voz.mp3'
// 15 s de planos como os do /plan: produto (estilo), produto, lugar, texto, produto — cortes de 3 s, clipes de 5 s.
const SHOTS = [
  { url: clip(0), kind: 'product', cutStart: 0.4, cutSeconds: 3, measuredSeconds: 5 },
  { url: clip(1), kind: 'product', cutStart: 0.2, cutSeconds: 3, measuredSeconds: 5 },
  { url: clip(2), kind: 'place', cutStart: 0, cutSeconds: 3, measuredSeconds: 5 },
  { url: url(3), kind: 'text', cutStart: 0, cutSeconds: 3, measuredSeconds: null },
  { url: clip(4), kind: 'product', cutStart: 0.5, cutSeconds: 3, measuredSeconds: 5 },
]
const OVERLAYS = [{ text: 'LUME - eau de parfum', start: 0.3, end: 4.5 }, { text: 'Captivating fragrance selection', start: 5, end: 10 }, { text: 'Light floral, all day', start: 10.5, end: 14.5 }]
const baseIn = { width: 1080, height: 1920, shots: SHOTS, overlays: OVERLAYS, fontFamily: 'Inter', cardUrl: url(9), cardSeconds: 2.5, musicUrl: MUSIC_URL, voiceUrl: VOICE_URL, voiceSeconds: 11.2 }
const pres = (Mm, measured, extra = {}) => Mm.buildAdV2Source({ ...baseIn, presenter: { url: clip(31), measuredSeconds: measured, insertOrder: [0, 1, 4, 2] }, ...extra })
const texts = (s) => s.elements.filter((e) => e.type === 'text')
const frac = (p) => Number(String(p).replace('%', '')) / 100
const PRES_LENGTHS = [8, 12.25, 15.5, 18.4, 33]
const frasesEmBaixo = (Mm) => PRES_LENGTHS.every((m) => {
  const t = texts(pres(Mm, m))
  return t.length === 3 && t.every((e) => {
    const y = frac(e.y)
    const h = frac(e.height)
    return e.y_anchor === '50%' && y - h / 2 >= 2 / 3 - 1e-9 && y + h / 2 <= 0.88 + 1e-9
  })
})
await check('1a com ator, as 3 frases ficam no TERÇO DE BAIXO: caixa entre 2/3 da altura e os 12% de baixo (interface do TikTok/Reels), em todas as durações de fala', () =>
  frasesEmBaixo(M) && M.ADS_V2_PRESENTER_OVERLAY_Y === 0.77 && M.ADS_V2_PRESENTER_SAFE_BOTTOM === 0.88 && near(M.ADS_V2_PRESENTER_LOWER_THIRD, 2 / 3) &&
  M.ADS_V2_PRESENTER_OVERLAY_Y - M.ADS_V2_OVERLAY_H / 2 >= M.ADS_V2_PRESENTER_LOWER_THIRD && M.ADS_V2_PRESENTER_OVERLAY_Y + M.ADS_V2_OVERLAY_H / 2 <= M.ADS_V2_PRESENTER_SAFE_BOTTOM)
await check('1b com ator, MESMO estilo da frase de sempre (fonte, tamanho, pílula, contorno, largura, altura, fade): só o y muda', () => {
  const a = texts(pres(M, 12.25))[0]
  const b = texts(M.buildAdV2Source(baseIn))[0]
  const sem = (e) => JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !['y', 'time', 'duration'].includes(k))))
  return sem(a) === sem(b) && a.y === '77%' && b.y === '45%'
})
const BASE_MONTAGE = atBase(F.montage)
const MB = world({ [F.montage]: BASE_MONTAGE })(F.montage)
const VARIANTES = [baseIn, { ...baseIn, tint: 'rgba(10,20,30,0.12)' }, { ...baseIn, voiceUrl: null, voiceSeconds: null }, { ...baseIn, cardSeconds: 4.2, voiceSeconds: 14 }, { ...baseIn, overlays: [] }, { ...baseIn, musicUrl: null }]
await check('1c SEM ator o anúncio é byte a byte o da base 88f3eac9 (6 variações: véu, sem voz, cartão esticado, sem frases, sem música) — frases no centro 45%', () =>
  BASE_MONTAGE.includes('export const ADS_V2_OVERLAY_Y = 0.45') && VARIANTES.every((v) => JSON.stringify(M.buildAdV2Source(v)) === JSON.stringify(MB.buildAdV2Source(v))) &&
  texts(M.buildAdV2Source(baseIn)).every((e) => e.y === '45%'))
await check('1d com ator, o que NÃO é frase segue byte a byte o da base (ator, inserts, cartão, véu, música, duração)', () =>
  PRES_LENGTHS.every((m) => {
    const semFrase = (s) => JSON.stringify({ ...s, elements: s.elements.filter((e) => e.type !== 'text') })
    const ya = texts(pres(M, m)).map((e) => ({ ...e, y: null }))
    const yb = texts(pres(MB, m)).map((e) => ({ ...e, y: null }))
    return semFrase(pres(M, m, { tint: 'rgba(10,20,30,0.12)' })) === semFrase(pres(MB, m, { tint: 'rgba(10,20,30,0.12)' })) && JSON.stringify(ya) === JSON.stringify(yb)
  }))

// ═══ 2. sem cauda preta ══════════════════════════════════════════════════════════════════════════════════════════════
const FPS = 24
/** Elementos de TELA CHEIA por cima do fundo preto (trilha 1): planos, ator, inserts e cartão. */
const cobre = (e) => (e.type === 'video' || e.type === 'image') && e.track >= 2 && e.track <= 3 && frac(e.width) >= 1 - 1e-9 && frac(e.height) >= 1 - 1e-9
const semPreto = (s) => {
  const cards = s.elements.filter((e) => e.type === 'image' && e.track === 3 && e.source === url(9))
  if (cards.length !== 1) return false
  const card = cards[0]
  if (!near(card.time + card.duration, s.duration, 1e-6)) return false
  const vis = s.elements.filter(cobre)
  const frames = Math.round(s.duration * FPS)
  for (let k = 0; k < frames; k++) {
    const t = k / FPS + 1e-6
    if (!vis.some((e) => e.time <= t && t < e.time + e.duration - 1e-9)) return false
  }
  const last = (frames - 1) / FPS + 1e-6
  return card.time <= last && last < card.time + card.duration
}
const NORMAIS = [baseIn, { ...baseIn, cardSeconds: 4.2, voiceSeconds: 14 }, { ...baseIn, voiceUrl: null, voiceSeconds: null }, { ...baseIn, shots: SHOTS.slice(0, 3), overlays: [], cardSeconds: 3.1, voiceSeconds: 11 }]
await check('2a anúncio de sempre: o cartão fecha EXATAMENTE no fim da composição e todo quadro (1/24 s) tem um plano ou o cartão por cima do preto — inclusive o último', () =>
  NORMAIS.every((v) => semPreto(M.buildAdV2Source(v))))
await check('2b anúncio com ator: idem, para falas de 8 a 33 s — com os números do canário 7112d56c (fala de 12,25 s → 14,5 s, cartão de 12 a 14,5 s)', () => {
  const canario = pres(M, 12.25)
  const card = canario.elements.find((e) => e.type === 'image' && e.track === 3 && e.source === url(9))
  return PRES_LENGTHS.every((m) => semPreto(pres(M, m)) && semPreto(pres(M, m, { tint: 'rgba(10,20,30,0.12)' }))) &&
    near(canario.duration, 14.5) && near(card.time, 12) && near(card.time + card.duration, 14.5)
})
await check('2c a causa do "1 s preto" ficou escrita no montador (grade 2×8 a 1 quadro/s, não o vídeo) — ninguém reinvestiga às cegas', () => {
  const s = read(F.montage)
  return /o "1 s preto no fim" do canário 7112d56c NÃO estava no vídeo/.test(s) && /16º da grade 2×8/.test(s) && /test-ads-ator-ajustes-2026-10-09\.mjs/.test(s)
})

// ═══ 3. produto é produto ════════════════════════════════════════════════════════════════════════════════════════════
const PRODUTOS = [
  'LUME eau de parfum, a light floral scent that lasts all day',
  'Glow serum by Aura, vitamin C for brighter skin',
  'AirRun sneakers, light running shoes for every day',
  'Sérum facial Lumi com vitamina C, pele luminosa',
  'Perfume Brisa, notas florais que duram o dia todo',
  'Zapatillas Nova para correr, ligeras y cómodas',
  'Orion watch, Swiss automatic movement',
]
const semPrefixo = (t) => t.replace(/^(e\.g\.|Ex\.:|Ej\.:)\s*/, '')
const LUGARES = () => [
  semPrefixo(S.ADS_V2_SIMPLE_COPY.en.text.placeholder), semPrefixo(S.ADS_V2_SIMPLE_COPY.pt.text.placeholder), semPrefixo(S.ADS_V2_SIMPLE_COPY.es.text.placeholder),
  'Loja de tênis à venda no Shopping Iguatemi, São Paulo',
  'Apartment for rent near the park, 2 bedrooms',
]
const produtoCerto = (Sm) => PRODUTOS.every((t) => Sm.inferSector(t) === 'store' && Sm.defaultPhotoKind(Sm.inferSector(t)) === 'product' && Sm.isProductSentence(t) && Sm.simpleProductAd(t, false))
const lugarCerto = (Sm) => LUGARES().every((t) => Sm.inferSector(t) === 'real_estate' && Sm.defaultPhotoKind('real_estate') === 'place' && !Sm.isProductSentence(t) && !Sm.simpleProductAd(t, true))
await check('3a frase com nome de PRODUTO (perfume, sérum, tênis, relógio — en/pt/es) = setor store, foto "product" e anúncio de produto (o canário LUME incluído)', () => produtoCerto(S))
await check('3b LUGAR segue lugar: o exemplo do placeholder (en/pt/es) + "Loja de tênis à venda…" + "Apartment for rent…" = imóvel, foto "place", nunca produto (nem com foto de produto)', () =>
  lugarCerto(S) && LUGARES()[0] === 'Shop for sale in the Aurora Building, Jardim neighborhood, São Paulo' && LUGARES()[1] === 'Loja à venda no Edifício Aurora, bairro Jardim, São Paulo')
await check('3c serviço/loja seguem o que eram: pizzaria = restaurant, "Clínica Derma — sérum" = clinic, "Loja de perfumes" = store SEM ser produto, aulas de tênis/"come watch the game" nunca produto', () =>
  S.inferSector('Pizzaria com forno a lenha') === 'restaurant' && S.inferSector('Clínica Derma — sérum facial') === 'clinic' && !S.isProductSentence('Clínica Derma — sérum facial') &&
  S.inferSector('Loja de perfumes importados no centro') === 'store' && !S.isProductSentence('Loja de perfumes importados no centro') &&
  S.inferSector('Aulas de tênis para crianças') === 'other' && !S.isProductSentence('Aulas de tênis para crianças') && !S.isProductSentence('Come watch the game at Joe’s') &&
  S.inferSector('Aulas de violão') === 'other' && S.simpleProductAd('Aulas de violão', false) === false && S.simpleProductAd('Marca Kairo, edição limitada', true) === true)

const LUME = 'LUME eau de parfum, a light floral scent that lasts all day'
const BRIEF_LUME = { business: 'LUME — eau de parfum', offer: '', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: { description: 'a light floral scent that lasts all day' } }
const CANARIO = 'At LUME, we offer a captivating selection of eau de parfum that elevates your fragrance experience. Discover your signature scent with us today.'
const UGC = 'Okay, I have to tell you about LUME eau de parfum. It is a light floral scent, and it lasts all day. Honestly, just try it.'
const MAXW = SL.adsV2NarrationMaxWords(15)
const OVS = ['LUME eau de parfum', 'Light floral, all day']
const voz = (Bm) => Bm.simpleVoiceFor(BRIEF_LUME, LUME, 'en')
const msgs = (Bm, ad, extra = {}) => Bm.buildV2CopyMessages(BRIEF_LUME, 'English', { maxWords: MAXW, narration: true, simple: voz(Bm), ...extra, ...(ad ? { ad } : {}) }).system
await check('3d pedido de texto: produto ganha a regra de PRODUTO (fala do produto, benefício, detalhe sensorial, chamada; nunca "At <brand>, we offer"/"a selection of"); ator ganha a fala em 1ª PESSOA de criador (UGC)', () => {
  const a = msgs(BR, { product: true, presenter: true })
  return a.includes(BR.ADS_V2_PRODUCT_NARRATION_RULE) && a.includes(BR.ADS_V2_PRESENTER_NARRATION_RULE) &&
    /PRODUCT ad/.test(BR.ADS_V2_PRODUCT_NARRATION_RULE) && /never "At <brand>, we offer", "a selection of"/.test(BR.ADS_V2_PRODUCT_NARRATION_RULE) && /sensory detail/.test(BR.ADS_V2_PRODUCT_NARRATION_RULE) && /call to action/.test(BR.ADS_V2_PRODUCT_NARRATION_RULE) &&
    /FIRST PERSON/.test(BR.ADS_V2_PRESENTER_NARRATION_RULE) && /Okay, I have to tell you about/.test(BR.ADS_V2_PRESENTER_NARRATION_RULE) && /UGC/.test(BR.ADS_V2_PRESENTER_NARRATION_RULE) && /short, casual sentences/.test(BR.ADS_V2_PRESENTER_NARRATION_RULE) && /word count/.test(BR.ADS_V2_PRESENTER_NARRATION_RULE) &&
    ordem(a, 'narration: one to three short spoken sentences', BR.ADS_V2_PRODUCT_NARRATION_RULE, BR.ADS_V2_PRESENTER_NARRATION_RULE, 'sector: one of') &&
    !msgs(BR, { product: true, presenter: false }).includes(BR.ADS_V2_PRESENTER_NARRATION_RULE) && !msgs(BR, { product: false, presenter: true }).includes(BR.ADS_V2_PRODUCT_NARRATION_RULE) &&
    !msgs(BR, { product: true, presenter: true }, { narration: false }).includes('PRODUCT ad')
})
const BASE_BRIEF = atBase(F.brief)
const BRB = world({ [F.brief]: BASE_BRIEF })(F.brief)
await check('3e sem produto e sem ator, o pedido de texto é byte a byte o da base 88f3eac9 (completo, simples, frases desligadas, voz desligada)', () => {
  const casos = [
    [BRIEF_LUME, 'English', { maxWords: 30, narration: true }],
    [BRIEF_LUME, 'English', { maxWords: 30, narration: false }],
    [BRIEF_LUME, 'English', { maxWords: MAXW, narration: true, simple: voz(BR) }],
    [BRIEF_LUME, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true, overlays: false, simple: { names: ['Edifício Aurora'], commonNoun: 'loja' } }],
  ]
  return casos.every(([b, l, o]) => JSON.stringify(BR.buildV2CopyMessages(b, l, o)) === JSON.stringify(BRB.buildV2CopyMessages(b, l, o)))
})
const regua = (Bm, narration, ad) => Bm.checkV2Copy(JSON.stringify({ narration, overlays: OVS, sector: 'store' }), BRIEF_LUME, { maxWords: MAXW, narration: true, simple: voz(Bm), ...(ad ? { ad } : {}) })
await check('3f régua: num anúncio de PRODUTO a fala de loja do canário ("At LUME, we offer a captivating selection…") é RECUSADA com o motivo; a fala UGC passa; sem produto, a régua de sempre', () => {
  const ruim = regua(BR, CANARIO, { product: true, presenter: true })
  const boa = regua(BR, UGC, { product: true, presenter: true })
  return !ruim.ok && ruim.why.includes(BR.ADS_V2_SHOP_TALK_WHY) && boa.ok && boa.copy.narration === UGC && regua(BR, CANARIO, null).ok && regua(BR, CANARIO, { product: false, presenter: true }).ok &&
    ['Nós oferecemos uma seleção de perfumes.', 'Ofrecemos una selección de perfumes.', 'Visit us today for our collection.', 'We carry the full line.'].every((t) => BR.isShopTalk(t)) &&
    !BR.isShopTalk(UGC) && !BR.isShopTalk('At night, we all want to smell good.') && !BR.isShopTalk('Okay, I have to tell you about this one. At first I was not sure, but wow.')
})

// extractAdsV2Brief EXECUTADA com a OpenAI falsa: 1 extração + texto + no máximo 1 correção.
const BRIEF_RAW = { business: 'LUME — eau de parfum', offer: '', cta: 'buy', contact: '', audience: '', tone: 'warm', extra: { description: 'a light floral scent that lasts all day' }, model_hint: '' }
const extrai = async (respostas, args = {}, over = {}) => {
  const oa = openaiFalsa([BRIEF_RAW, ...respostas])
  const Bm = world(over, oa)(F.brief)
  const r = await Bm.extractAdsV2Brief({ text: LUME, language: 'en', languageName: 'English', maxWords: MAXW, narration: true, facts: [], sentence: LUME, ...args })
  return { r, log: oa.log }
}
const copia = (narration) => ({ narration, overlays: OVS, sector: 'store' })
const canarioCorrigido = async (over) => {
  const a = await extrai([copia(CANARIO), copia(UGC)], { productPhoto: true, presenter: true }, over)
  const sys = a.log[1]?.messages?.[0]?.content ?? ''
  const correcao = a.log[2]?.messages?.at(-1)?.content ?? ''
  return a.r.ok && a.r.attempts === 3 && a.r.copy.narration === UGC && JSON.stringify(a.r.ad) === '{"product":true,"presenter":true}' &&
    sys.includes(BR.ADS_V2_PRODUCT_NARRATION_RULE) && sys.includes(BR.ADS_V2_PRESENTER_NARRATION_RULE) && correcao.includes(BR.ADS_V2_SHOP_TALK_WHY)
}
await check('3g extração EXECUTADA com o caso do canário: o pedido leva as regras de produto e de ator; a fala de loja volta com o motivo; a corrigida (1ª pessoa) é a gravada', () => canarioCorrigido())
const tomNaoDa502 = async (over) => {
  const a = await extrai([copia(CANARIO), copia(CANARIO)], { productPhoto: true, presenter: true }, over)
  return a.r.ok && a.r.attempts === 3 && a.r.copy.narration === CANARIO
}
await check('3h o tom é acabamento: se a 2ª resposta AINDA fala como loja (e passa em todo o resto), o anúncio sai — nunca um 502 pelo tom', () => tomNaoDa502())
await check('3i a honestidade continua dura no anúncio de produto: 2ª resposta com número inventado = recusa (stage copy)', async () => {
  const a = await extrai([copia(CANARIO), copia(UGC.replace('Honestly, just try it.', 'Rated 5 stars by 300 people.'))], { productPhoto: true, presenter: true })
  return !a.r.ok && a.r.stage === 'copy' && a.r.why.some((w) => /300/.test(w))
})
const lugarSemProduto = async (over) => {
  const frase = semPrefixo(S.ADS_V2_SIMPLE_COPY.pt.text.placeholder)
  const resp = () => [{ business: 'Loja — à venda', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }, { narration: 'Conheça a loja à venda no Edifício Aurora, no bairro Jardim, em São Paulo. Agende a sua visita.', overlays: [], sector: 'real_estate' }]
  const com = openaiFalsa(resp())
  const sem = openaiFalsa(resp())
  const args = { text: frase, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: MAXW, narration: true, overlays: false, facts: [], sentence: frase }
  const r1 = await world(over, com)(F.brief).extractAdsV2Brief({ ...args, productPhoto: true })
  const r2 = await world(over, sem)(F.brief).extractAdsV2Brief(args)
  return r1.ok && r2.ok && !('ad' in r1) && !('ad' in r2) && JSON.stringify(com.log[1].messages) === JSON.stringify(sem.log[1].messages) && !com.log[1].messages[0].content.includes('PRODUCT ad')
}
await check('3j LUGAR na extração: o placeholder pt com foto de produto NÃO vira produto — pedido idêntico ao sem foto de produto, sem regra de produto', () => lugarSemProduto())
await check('3k modo completo (sem frase) com ator: só a regra do ator (1ª pessoa), nunca a de produto; sem ator nem produto, nenhum `ad`', async () => {
  const oa = openaiFalsa([BRIEF_RAW, copia(UGC)])
  const r = await world({}, oa)(F.brief).extractAdsV2Brief({ text: LUME, language: 'en', languageName: 'English', maxWords: MAXW, narration: true, presenter: true })
  const oa2 = openaiFalsa([BRIEF_RAW, copia(UGC)])
  const r2 = await world({}, oa2)(F.brief).extractAdsV2Brief({ text: LUME, language: 'en', languageName: 'English', maxWords: MAXW, narration: true })
  const sys = oa.log[1].messages[0].content
  return r.ok && JSON.stringify(r.ad) === '{"product":false,"presenter":true}' && sys.includes(BR.ADS_V2_PRESENTER_NARRATION_RULE) && !sys.includes(BR.ADS_V2_PRODUCT_NARRATION_RULE) &&
    r2.ok && !('ad' in r2) && !oa2.log[1].messages[0].content.includes('FIRST PERSON')
})
const rotaCerta = (src) => {
  const s = code(src)
  return /\.\.\.\(simple \? \{ productPhoto: photos\.some\(\(ph\) => ph\.kind === 'product'\) \} : \{\}\),/.test(s) && /\.\.\.\(presenterAsked \? \{ presenter: true \} : \{\}\),/.test(s) &&
    ordem(s, 'const presenterAsked', 'const extracted = await extractAdsV2Brief({', 'productPhoto:', 'presenter: true', '})') && /product_ad: extracted\.ad\?\.product === true/.test(s) &&
    !/import \{[^}]*\} from '@\/lib\/ads\/v2Simple'/.test(s)
}
await check('3l rota /plan (lida): manda productPhoto (modo simples) e presenter (ator pedido) à extração e grava product_ad no evento — sem import novo (os guardiões que executam a rota seguem de pé)', () => rotaCerta(read(F.plan)))
await check('3m tela do modo simples (lida): o setor e o tipo de foto continuam saindo de inferSector/defaultPhotoKind da MESMA frase — o perfume já nasce com fotos de produto', () => {
  const s = code(read(F.screen))
  return /const sector = inferSector\(sentence\)/.test(s) && /const photoKind = defaultPhotoKind\(sector\)/.test(s) && S.defaultPhotoKind(S.inferSector(LUME)) === 'product'
})

// ═══ 4. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, file, de, para, aindaPassa) => {
  const src = read(file)
  const m = trocar(src, de, para)
  const aplicou = m !== src && m.includes(para)
  let passa = true
  try { passa = !!(await aindaPassa({ [file]: m })) } catch { passa = false }
  ok(aplicou && !passa, `4 mutante: ${nome} fica vermelho`)
}
const Mw = (over) => world(over)(F.montage)
await mutante('frase do ator de volta ao meio (em cima dos olhos)', F.montage, "      x: '50%', y: pct(ADS_V2_PRESENTER_OVERLAY_Y), x_anchor", "      x: '50%', y: pct(ADS_V2_OVERLAY_Y), x_anchor",
  (over) => frasesEmBaixo(Mw(over)))
await mutante('frase do ator baixa demais (sob a interface das redes)', F.montage, 'export const ADS_V2_PRESENTER_OVERLAY_Y = 0.77', 'export const ADS_V2_PRESENTER_OVERLAY_Y = 0.85',
  (over) => frasesEmBaixo(Mw(over)))
await mutante('frase SEM ator mudando de lugar', F.montage, 'export const ADS_V2_OVERLAY_Y = 0.45', 'export const ADS_V2_OVERLAY_Y = 0.77',
  (over) => { const Mm = Mw(over); return VARIANTES.every((v) => JSON.stringify(Mm.buildAdV2Source(v)) === JSON.stringify(MB.buildAdV2Source(v))) })
await mutante('cartão do ator 1 s mais curto (cauda preta)', F.montage, "    type: 'image', track: 3, time: main, duration: r3(cardSeconds),", "    type: 'image', track: 3, time: main, duration: r3(cardSeconds - 1),",
  (over) => PRES_LENGTHS.every((m) => semPreto(pres(Mw(over), m))))
await mutante('composição do ator 1 s mais longa que o cartão (cauda preta)', F.montage, '  const total = r3(main + cardSeconds)', '  const total = r3(main + cardSeconds + 1)',
  (over) => PRES_LENGTHS.every((m) => semPreto(pres(Mw(over), m))))
await mutante('cartão do anúncio de sempre 1 s mais curto (cauda preta)', F.montage, "    type: 'image', track: 3, time: shotsSeconds, duration: r3(cardSeconds),", "    type: 'image', track: 3, time: shotsSeconds, duration: r3(cardSeconds - 1),",
  (over) => NORMAIS.every((v) => semPreto(Mw(over).buildAdV2Source(v))))
await mutante('composição de sempre 1 s mais longa que o cartão (cauda preta)', F.montage, '  const total = r3(shotsSeconds + cardSeconds)', '  const total = r3(shotsSeconds + cardSeconds + 1)',
  (over) => NORMAIS.every((v) => semPreto(Mw(over).buildAdV2Source(v))))
await mutante('plano encurtado abrindo buraco preto no meio', F.montage, '    const duration = r3(shot.cutSeconds + ADS_V2_MONTAGE_FADE)\n', '    const duration = r3(shot.cutSeconds - 0.5)\n',
  (over) => NORMAIS.every((v) => semPreto(Mw(over).buildAdV2Source(v))))
const Sw = (over) => world(over)(F.simple)
await mutante('sem a regra de produto (o perfume volta a "other")', F.simple, '  [\'store\', ADS_V2_PRODUCT_WORDS],\n', '',
  (over) => produtoCerto(Sw(over)))
await mutante('regra de produto ANTES do imóvel ("Loja de tênis à venda" vira produto)', F.simple, '  [\'store\', ADS_V2_PRODUCT_WORDS],\n', '',
  (over) => { const src = over[F.simple]; const m = trocar(src, 'const SECTOR_RULES: readonly [AdsV2SimpleSector, RegExp][] = [\n', "const SECTOR_RULES: readonly [AdsV2SimpleSector, RegExp][] = [\n  ['store', ADS_V2_PRODUCT_WORDS],\n"); return lugarCerto(Sw({ [F.simple]: m })) })
await mutante('loja de perfumes contada como produto (sem a trava da palavra de loja)', F.simple, ' && !SHOP_WORDS.test(t)\n', '\n',
  (over) => !Sw(over).isProductSentence('Loja de perfumes importados no centro'))
const Bw = (over) => world(over)(F.brief)
await mutante('pedido de texto sem a regra do ator (1ª pessoa)', F.brief, '    ...(opts.ad?.presenter && opts.narration ? [ADS_V2_PRESENTER_NARRATION_RULE] : []),\n', '',
  (over) => msgs(Bw(over), { product: true, presenter: true }).includes(BR.ADS_V2_PRESENTER_NARRATION_RULE))
await mutante('pedido de texto sem a regra de produto', F.brief, '    ...(opts.ad?.product && opts.narration ? [ADS_V2_PRODUCT_NARRATION_RULE] : []),\n', '',
  (over) => msgs(Bw(over), { product: true, presenter: false }).includes(BR.ADS_V2_PRODUCT_NARRATION_RULE))
await mutante('régua sem recusar a fala de loja', F.brief, '    if (opts.ad?.product && isShopTalk(narration)) why.push(ADS_V2_SHOP_TALK_WHY)\n', '',
  (over) => !regua(Bw(over), CANARIO, { product: true, presenter: true }).ok)
await mutante('régua de loja valendo para TODO anúncio (quebra o byte a byte de quem não é produto)', F.brief, '    if (opts.ad?.product && isShopTalk(narration)) why.push(ADS_V2_SHOP_TALK_WHY)\n', '    if (isShopTalk(narration)) why.push(ADS_V2_SHOP_TALK_WHY)\n',
  (over) => regua(Bw(over), CANARIO, null).ok)
await mutante('tom de loja virando 502 (sem o relaxamento)', F.brief, '  const relaxShop = opts.ad?.product === true\n', '  const relaxShop = false\n',
  (over) => tomNaoDa502(over))
await mutante('extração tratando TODA frase como produto (o lugar vira produto)', F.brief, "typeof args.sentence === 'string' && simpleProductAd(args.sentence, args.productPhoto === true)", 'true',
  (over) => lugarSemProduto(over))
await mutante('extração ignorando o ator', F.brief, 'productAd || args.presenter === true ? { product: productAd, presenter: args.presenter === true } : null', 'productAd ? { product: productAd, presenter: false } : null',
  (over) => canarioCorrigido(over))
await mutante('rota sem mandar o ator à extração', F.plan, '      ...(presenterAsked ? { presenter: true } : {}),\n', '',
  (over) => rotaCerta(over[F.plan]))
await mutante('rota sem mandar a foto de produto à extração', F.plan, "      ...(simple ? { productPhoto: photos.some((ph) => ph.kind === 'product') } : {}),\n", '',
  (over) => rotaCerta(over[F.plan]))

console.log(`\ntest-ads-ator-ajustes-2026-10-09: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
