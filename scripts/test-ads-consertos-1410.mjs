// KINEO-ADS-CONSERTOS-1410 — guardião dos consertos de servidor/lib do QA do Studio Ads v2 (14/10, foto de perfume + a frase
// "perfume num hotel com chuva"; fundador: "pode consertar agora"). Prova, EXECUTANDO o código real pelo carregador offline:
//   #2  a frase crua deixa de virar a MARCA: num pedido de PRODUTO cuja frase pede cena, o texto do negócio que vai à
//       extração (brief, frases de tela e narração) é só "perfume" — sem "num hotel" —, a cena segue intacta pelo brief.scene,
//       e a moderação continua lendo a frase INTEIRA; brandName tira o travessão solto do fim;
//   #7  a pílula global "Your video is ready / Next episode →" não aparece no /ads, e o /api/compose/active ignora o
//       anúncio do Studio Ads (platform = 'Studio Ads') sem perder as linhas de platform nulo;
//   #9  a entrega prometida passa de 10–15 para 5–8 min (medido: p50 4,0 · p90 6,5) nas 16 línguas;
//   #1a a dica da cena para de prometer "o produto fica exatamente como na sua foto" (a IA recria o produto) nas 16 línguas;
//   $   dinheiro intocado: o núcleo do /plan desfeito destas linhas e o v2Brief desfeito do brandName voltam às impressões
//       digitais de antes; nenhuma linha marcada fala de crédito/débito/preço;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semRoteiros } from './test-support/desfaz-roteiros-1310.mjs'
import { MARCA_CONSERTOS_1410, CONSERTOS_1410_LINHAS_CORE, semConsertos1410 } from './test-support/desfaz-consertos-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  scene: 'lib/ads/v2Scene.ts',
  brief: 'lib/ads/v2Brief.ts',
  core: 'lib/ads/v2PlanCore.ts',
  ux: 'lib/ads/v2SimpleUx.ts',
  pill: 'components/ActiveRenderPill.tsx',
  active: 'app/api/compose/active/route.ts',
  auto: 'lib/ads/autoBrief.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const LANGS = ['en', 'es', 'hi', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']
const FRASE = 'perfume num hotel com chuva'
const CENA = 'num hotel com chuva'

// ═══ #2. a frase crua não vira a marca ═════════════════════════════════════════════════════════════════════════════
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const USER = U(9)
const ORDER = U(1)
const PHOTO = U(20)
const pedido = (brief = {}, extra = {}) => ({
  id: ORDER, user_id: USER, status: 'draft', tier: 'commercial', seconds: 15, sector: 'store', language: 'pt', narration: true,
  brief: { sentence: FRASE, link: null, mode: 'simple', overlays: true, price: null, contact: null, kind: 'product', scene: CENA, research: { status: 'ok', at: new Date().toISOString(), facts: [] }, ...brief },
  logo_footage_id: null, card_url: null, card_footage_id: null, photos: null, plan: null, ...extra,
})
const corpo = { mode: 'simple', order_id: ORDER, sector: 'store', photos: [{ footage_id: PHOTO, kind: 'product' }], facts: [] }

/** Roda o núcleo REAL do /plan até a extração: tudo o que fala com banco/fornecedor é falso; a extração é um espião que
 *  grava os argumentos e devolve "brief" (o plano para ali, nada é montado nem cobrado). */
async function rodaNucleo(order, { coreSrc, sceneSrc } = {}) {
  const log = { extract: [], moderation: [], events: [] }
  const admin = {
    from() {
      const q = { select: () => q, eq: () => q, gte: () => q, in: () => q, then: (a, b) => Promise.resolve({ count: 0, error: null, data: [] }).then(a, b) }
      return q
    },
  }
  const realBrief = carregar()(F.brief)
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
    '@/lib/openai': { openai: new Proxy({}, { get() { throw new Error('Offline: OpenAI proibido') } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { log.events.push(e) } },
    '@/lib/safety/contentModeration': { moderateContent: async (a) => { log.moderation.push(a); return { ok: true } } },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, adsSampleOpen: async () => false, adsSampleLevelOk: () => true },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order: structuredClone(order), error: null }) },
    '@/lib/ads/v2Server': {
      ownedFootage: async (_a, _u, ids) => new Map(ids.map((id) => [id, { url: `https://x.supabase.co/storage/v1/object/public/user-footage/${USER}/${id}.png`, isImage: true, isPng: true, isVideo: false }])),
      measureFootageVideo: async () => null,
      v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
      v2Json: (b, status = 200) => ({ status, body: b }),
    },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Brief': { ...realBrief, extractAdsV2Brief: async (args) => { log.extract.push(structuredClone(args)); return { ok: false, stage: 'brief', why: ['spy'], attempts: 1 } } },
  }
  const over = {}
  if (coreSrc) over[F.core] = coreSrc
  if (sceneSrc) over[F.scene] = sceneSrc
  const core = carregar(over, mocks, { OPENAI_API_KEY: 'offline' })(F.core)
  const res = await core.adsV2PlanFor({ id: USER, email: 'qa@exemplo.com' }, { admin, reason: 'internal', ownerId: USER }, async () => structuredClone(corpo), Date.now())
  return { res, log }
}
const semHotel = (s) => !/hotel|chuva/i.test(String(s ?? ''))
const marcaOk = async (opts) => {
  const r = await rodaNucleo(pedido(), opts)
  const a = r.log.extract[0]
  if (!a) return false
  const S = carregar(opts?.sceneSrc ? { [F.scene]: opts.sceneSrc } : {})(F.scene)
  const AB = carregar()(F.auto)
  const pedidoAoModelo = AB.buildAutoBriefMessages(a.text, 'Portuguese').user
  return r.res.status === 422 && r.res.body.error === 'brief_needs_business' && // parou no espião, nada adiante
    a.text.trim().toLowerCase() === 'perfume' && semHotel(a.text) && semHotel(a.sentence) && semHotel(a.typed) && semHotel(pedidoAoModelo) &&
    a.scene === CENA && // a cena segue intacta (brief.scene → adsV2SceneSetting)
    r.log.moderation.length === 1 && r.log.moderation[0].text.includes(FRASE) && // a moderação lê a frase INTEIRA
    S.adsV2SentenceForCopy(pedido().brief, 'store') === 'perfume'
}
await check('#2a "perfume num hotel com chuva" (produto, Comercial): o NÚCLEO REAL do /plan manda à extração text/sentence/typed = "perfume" (nada de "num hotel"), o pedido ao modelo do brief não tem "hotel", a cena "num hotel com chuva" segue intacta e a moderação lê a frase INTEIRA', () => marcaOk())
const casos = () => {
  const S = carregar()(F.scene)
  const p = (sentence, b = {}) => ({ sentence, kind: 'product', ...b })
  return S.adsV2SentenceForCopy(p('quero que o perfume esteja num hotel com uma chuva'), 'store') === 'perfume' &&
    S.adsV2SentenceForCopy(p('Amber Perfume 50ml, warm floral fragrance in a hotel room on a rainy night'), 'store') === 'Amber Perfume 50ml, warm floral fragrance' && // nada de corte de título: a descrição fica
    S.adsV2SentenceForCopy(p('um perfume num hotel'), 'store') === 'perfume' && // artigo do começo sai (LEAD_DET)
    S.adsV2SentenceForCopy(p('num hotel com chuva'), 'store') === 'num hotel com chuva' && // sem produto nem palavra de produto = a frase de sempre (nada a separar)
    S.adsV2SentenceForCopy(p('perfume num hotel', { kind: 'place' }), 'store') === 'perfume num hotel' && // lugar = intocado
    S.adsV2SentenceForCopy(p('Amber Perfume 50ml'), 'store') === 'Amber Perfume 50ml' && // sem cena = intocado
    S.adsV2SentenceForCopy({ sentence: '  Loja à venda no Edifício Aurora  ', kind: 'place' }, 'real_estate') === 'Loja à venda no Edifício Aurora' &&
    S.adsV2SentenceForCopy({}, 'store') === '' && S.adsV2SentenceForCopy(null, null) === '' &&
    // a prévia da tela (adsV2SplitSceneRequest, usada pelo AdsV2Simple) segue com o MESMO resultado de antes
    JSON.stringify(S.adsV2SplitSceneRequest('quero que o perfume esteja num hotel com uma chuva')) === JSON.stringify({ product: 'Perfume', scene: 'num hotel com uma chuva' }) &&
    JSON.stringify(S.adsV2SplitSceneRequest('Amber Perfume 50ml')) === JSON.stringify({ product: '', scene: null })
}
await check('#2b adsV2SentenceForCopy: só pedido de PRODUTO com cena na frase perde a cena (descrição antes da cena fica inteira); lugar, frase sem cena e frase vazia = a frase de sempre; a prévia (adsV2SplitSceneRequest) não mudou', casos)
const nucleoLigado = (src) =>
  /^ {4}const sentenceFull = typeof brief0\.sentence === 'string' \? brief0\.sentence\.trim\(\) : '' \/\//m.test(src) &&
  /^ {4}const sentenceCopy = adsV2SentenceForCopy\(brief0, input\.sector\) \/\//m.test(src) &&
  /^ {4}let text = sentenceCopy \/\//m.test(src) &&
  /text: \[text, \.\.\.\(sentenceFull !== sentenceCopy \? \[sentenceFull\] : \[\]\), \.\.\.factTexts\]\.join/.test(src) &&
  /facts: factTexts, sentence: sentenceCopy \}/.test(src)
await check('#2c o núcleo do /plan: frase inteira para a moderação, frase sem a cena para texto/sentence (linhas marcadas)', () => nucleoLigado(SRC.core))
await check('#2d brandName tira o travessão solto do fim ("perfume num hotel com chuva —" → sem o travessão), e "<nome> — <o que vende>" segue como antes', () => {
  const B = carregar()(F.brief)
  return B.brandName({ business: 'perfume num hotel com chuva —' }) === 'perfume num hotel com chuva' && B.brandName({ business: 'Perfume –' }) === 'Perfume' &&
    B.brandName({ business: 'LUME - ' }) === 'LUME' && B.brandName({ business: 'LUME — eau de parfum' }) === 'LUME' && B.brandName({ business: 'Coca-Cola — refrigerante' }) === 'Coca-Cola' &&
    B.brandName({ business: '' }) === '' && B.brandName({}) === ''
})

// ═══ #7. a pílula global fora do /ads e o /api/compose/active sem o Studio Ads ═════════════════════════════════════════
const suprimeFn = (src) => {
  const m = /const suppressed =\s*([\s\S]*?)\n\n/.exec(src)
  if (!m) throw new Error('sem const suppressed')
  return new Function('pathname', 'return (' + m[1].replace(/\/\/[^\n]*/g, '') + ')')
}
const pilulaOk = (src) => {
  const f = suprimeFn(src)
  return f('/ads') === true && f('/ads/v2') === true && f('/ads/new') === true && f('/generate') === true && f('/studio/create') === true &&
    f('/studio') === false && f('/library') === false && f('/') === false && f(null) === false
}
await check('#7a a pílula (ActiveRenderPill) fica suprimida no /ads (e subrotas), como no /generate e /studio/create; nas outras telas segue', () => pilulaOk(SRC.pill))

// O .or() do PostgREST com a semântica real: termos separados por vírgula fora de aspas; is.null casa nulo; neq com nulo
// NÃO casa (NULL <> x é nulo no SQL) — o motivo de o conserto precisar do is.null.
const orTermos = (expr) => String(expr).match(/(?:[^,"]|"[^"]*")+/g).map((t) => {
  const [k, op, ...rest] = t.split('.')
  const v = rest.join('.').replace(/^"|"$/g, '')
  return (row) => {
    const x = row[k] ?? null
    if (op === 'is') return v === 'null' ? x === null : String(x) === v
    if (op === 'eq') return x !== null && String(x) === v
    if (op === 'neq') return x !== null && String(x) !== v
    throw new Error('op ' + op)
  }
})
const fakeDb = (videos, log) => ({
  from(table) {
    const preds = []
    let single = false, lim = 0, ord = null
    const q = {
      select: () => q,
      eq: (k, v) => { preds.push((r) => (r[k] ?? null) === v); return q },
      neq: (k, v) => { preds.push((r) => (r[k] ?? null) !== null && r[k] !== v); return q },
      is: (k, v) => { preds.push((r) => (r[k] ?? null) === v); return q },
      gte: (k, v) => { preds.push((r) => String(r[k]) >= String(v)); return q },
      in: (k, vs) => { preds.push((r) => vs.includes(r[k])); return q },
      or: (expr) => { log.or.push(expr); const t = orTermos(expr); preds.push((r) => t.some((f) => f(r))); return q },
      order: (k, o) => { ord = { k, asc: !!o?.ascending }; return q },
      limit: (n) => { lim = n; return q },
      maybeSingle: () => { single = true; return q },
      then(a, b) {
        let rows = (table === 'videos' ? videos : []).filter((r) => preds.every((p) => p(r)))
        if (ord) rows = [...rows].sort((x, y) => String(x[ord.k]).localeCompare(String(y[ord.k])) * (ord.asc ? 1 : -1))
        if (lim) rows = rows.slice(0, lim)
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(a, b)
      },
    }
    return q
  },
})
async function sonda(videos, activeSrc) {
  const log = { or: [] }
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER } } }) } }) },
    '@supabase/supabase-js': { createClient: () => fakeDb(videos, log) },
    '@/lib/cinematic/qualityRejection': { readVerifiedQualityRejection: async () => null },
    '@/lib/cinematic/sceneRetry': { readVerifiedSceneRetryHold: async () => null },
  }
  const R = carregar(activeSrc ? { [F.active]: activeSrc } : {}, mocks, { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'offline' })(F.active)
  return { body: (await R.GET()).body, log }
}
const agora = Date.now()
const iso = (msAtras) => new Date(agora - msAtras).toISOString()
const video = (id, platform, msAtras) => ({ id, user_id: USER, status: 'completed', platform, video_url: `https://cdn.x/${id}.mp4`, thumbnail_url: null, title: `t-${id}`, topic: null, render_id: `r-${id}`, created_at: iso(msAtras) })
const sondaOk = async (activeSrc) => {
  const a = await sonda([video('ad', 'Studio Ads', 60_000), video('film', null, 120_000)], activeSrc) // anúncio mais novo + filme de platform nulo
  const b = await sonda([video('ad', 'Studio Ads', 60_000)], activeSrc) // só o anúncio
  const c = await sonda([video('ad', 'Studio Ads', 60_000), video('yt', 'YouTube Shorts', 90_000)], activeSrc) // platform de filme
  return a.body.state === 'completed' && a.body.video_id === 'film' &&
    b.body.state === 'none' &&
    c.body.state === 'completed' && c.body.video_id === 'yt' &&
    a.log.or.length === 1
}
await check('#7b /api/compose/active EXECUTADA: o anúncio do Studio Ads (mais novo) nunca vira "Your video is ready"; o filme de platform NULO e o de "YouTube Shorts" seguem aparecendo; só anúncio = state none', () => sondaOk())

// ═══ #9. entrega 5–8 min nas 16 línguas ═══════════════════════════════════════════════════════════════════════════
const entregaOk = (src) => {
  const X = carregar(src ? { [F.ux]: src } : {})(F.ux)
  return X.ADS_V2_DELIVERY_MINUTES.min === 5 && X.ADS_V2_DELIVERY_MINUTES.max === 8 && LANGS.length === 16 &&
    LANGS.every((l) => {
      const d = X.ADS_V2_UX_COPY[l] && X.ADS_V2_UX_COPY[l].preview && X.ADS_V2_UX_COPY[l].preview.delivery
      return typeof d === 'string' && !/10|15/.test(d) && /(?<!\d)5(?!\d)/.test(d) && /(?<!\d)8(?!\d)/.test(d)
    }) && new Set(LANGS.map((l) => X.ADS_V2_UX_COPY[l].preview.delivery)).size === 16
}
await check('#9 entrega estimada = 5–8 min (ADS_V2_DELIVERY_MINUTES) e a frase "delivery" das 16 línguas diz 5 e 8, sem nenhum "10" nem "15"', () => entregaOk())

// ═══ #1a. a dica da cena não promete o produto "exatamente como na foto" ═══════════════════════════════════════════
// Por língua, as palavras da promessa antiga (exato/igual/idêntico/precisamente/como está).
const PROMESSA = {
  en: /exactly|identical|stays|same as/i, pt: /igual|exatamente|id[eê]ntico|fica igual/i, es: /igual|exactamente|id[eé]ntico|queda igual/i,
  fr: /exactement|identique|reste/i, de: /genau|identisch|bleibt/i, it: /identico|esattamente|resta/i, nl: /precies|identiek|blijft/i,
  pl: /dokładnie|identyczn|zostaje/i, tr: /gibi kalır|aynı|tıpkı/i, ru: /точно|останется|идентич/i, uk: /точно|залишиться|ідентич/i,
  ar: /تمامًا|يبقى|مطابق/, ur: /بالکل|رہتا ہے/, hi: /बिल्कुल|जैसा रहेगा/, id: /persis|tetap|identik/i, vi: /giữ nguyên|y hệt|giống hệt/i,
}
const MUDA = { en: /change/i, pt: /mudar/i, es: /cambiar/i, fr: /changer/i, de: /ändern/i, it: /cambiare/i, nl: /veranderen/i, pl: /zmienić/i, tr: /değişebilir/i, ru: /отличаться/i, uk: /відрізнятися/i, ar: /تتغير/, ur: /بدل/, hi: /बदल/, id: /berubah/i, vi: /thay đổi/i }
const dicaOk = (src) => {
  const S = carregar(src ? { [F.scene]: src } : {})(F.scene)
  return LANGS.every((l) => {
    const h = S.ADS_V2_SCENE_COPY[l] && S.ADS_V2_SCENE_COPY[l].scene.hint
    return typeof h === 'string' && !PROMESSA[l].test(h) && MUDA[l].test(h) && /(?<!\p{L})(AI|IA|KI|ИИ|ШІ)(?!\p{L})|yapay zekâ|الذكاء الاصطناعي/u.test(h)
  })
}
await check('#1a a dica "Where does your product appear?" nas 16 línguas: nenhuma promete o produto exatamente/igual/idêntico ao da foto; todas dizem que a IA recria e que pequenos detalhes podem mudar', () => dicaOk())
await check('#1a-lib nenhum texto de tela em lib/ads promete "exactly as in your photo" (os prompts ao modelo ficam de fora: lá "the place stays exactly as in the photos" é ORDEM, não promessa)', () => {
  const dir = path.join(ROOT, 'lib/ads')
  return fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).every((f) => !/(your|seu|tu) (product|produto|producto)[^'\n]{0,40}(exactly|exatamente|igual)/i.test(fs.readFileSync(path.join(dir, f), 'utf8')))
})

// ═══ $. dinheiro intocado ═════════════════════════════════════════════════════════════════════════════════════════
const CORE_BASE = '3fd1819ef2109e36673ea80a890e20914f2b74114c6bff52ad54e9393e7e8eb2' // semRoteiros(v2PlanCore) da base (test-ads-fluxo-1310 I1)
const BRIEF_BASE = '99678c0ef6e681544a984c307ff1524318ac6bb71016133ad8e5a7e38ce5d193' // v2Brief da base (8e3bcfd4)
const BRAND_NOVA = "  return (brief.business ?? '').split(/\\s+[—–-]\\s+/)[0].trim().replace(/\\s*[—–-]\\s*$/, '') // KINEO-ADS-CONSERTOS-1410 — \"perfume —\" (travessão sem nada depois) não vira \"perfume —\" na tela"
const BRAND_VELHA = "  return (brief.business ?? '').split(/\\s+[—–-]\\s+/)[0].trim()"
await check('$1 o núcleo do /plan, desfeitas as linhas marcadas deste conserto, volta à impressão digital de antes (3fd1819e…); linhas marcadas = as 9 esperadas, nenhuma de crédito/débito/preço', () => {
  const marcadas = SRC.core.split('\n').filter((l) => l.includes(MARCA_CONSERTOS_1410))
  return sha(semConsertos1410(semRoteiros(SRC.core))) === CORE_BASE && marcadas.length === CONSERTOS_1410_LINHAS_CORE &&
    !/credit|debit|charge|refund|adsV2Credits|estimateAdUsd|cost/i.test(marcadas.join('\n').replace(/\/\/.*$/gm, ''))
})
await check('$2 o v2Brief só mudou a linha do brandName: desfeita ela, volta à impressão de antes (99678c0e…); nenhuma outra linha marcada', () =>
  SRC.brief.split('\n').filter((l) => l.includes(MARCA_CONSERTOS_1410)).length === 1 && sha(trocar(SRC.brief, BRAND_NOVA, BRAND_VELHA)) === BRIEF_BASE)
await check('$3 a lib da cena e a da tela seguem PURAS (sem fornecedor, banco ou fetch) e sem preço/débito nas linhas marcadas', () =>
  !/from '@\/lib\/(openai|supabase|serverEvents|safety)|fetch\(|createClient|chargeAdsV2|adsV2Credits/.test(SRC.scene) &&
  !/chargeAdsV2|refund|debit/i.test([SRC.scene, SRC.ux].join('\n').split('\n').filter((l) => l.includes(MARCA_CONSERTOS_1410)).join('\n').replace(/\/\/.*$/gm, '')))

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════
// Cada mutante: a troca é aplicada FORA do try (âncora ausente/repetida = FAIL, nunca "vermelho" de graça) e o texto trocado
// tem de ser diferente do original; só então a prova roda sobre ele (lançar durante a prova também conta como vermelho).
const vermelho = async (nome, src, de, para, prova) => {
  let mut = null
  try { mut = trocar(src, de, para) } catch (e) { ok(false, `mutante ${nome}: NÃO aplicou (${e.message})`); return }
  let red = false
  try { red = !(await prova(mut)) } catch (e) { console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = true }
  ok(red && mut !== src, `mutante ${nome}: aplicou e fica VERMELHO`)
}
await vermelho('M1 compose/active com .neq simples (joga fora o platform nulo)', SRC.active, `.or('platform.is.null,platform.neq."Studio Ads"') // KINEO-ADS-CONSERTOS-1410`, `.neq('platform', 'Studio Ads') // KINEO-ADS-CONSERTOS-1410`, (m) => sondaOk(m))
await vermelho('M2 compose/active sem o filtro (anúncio vira "Your video is ready")', SRC.active, `        .or('platform.is.null,platform.neq."Studio Ads"') // KINEO-ADS-CONSERTOS-1410\n`, '', (m) => sondaOk(m))
await vermelho('M3 pílula sem o /ads', SRC.pill, " ||\n    (pathname ?? '').startsWith('/ads') // KINEO-ADS-CONSERTOS-1410", '', (m) => pilulaOk(m))
await vermelho('M4 núcleo do /plan voltando à frase crua (let text = sentenceFull)', SRC.core, '    let text = sentenceCopy // KINEO-ADS-CONSERTOS-1410', '    let text = sentenceFull // KINEO-ADS-CONSERTOS-1410', (m) => marcaOk({ coreSrc: m }))
await vermelho('M5 moderação só com o texto limpo (sem a frase inteira)', SRC.core, 'text: [text, ...(sentenceFull !== sentenceCopy ? [sentenceFull] : []), ...factTexts]', 'text: [text, ...factTexts]', (m) => marcaOk({ coreSrc: m }))
await vermelho('M6 adsV2SentenceForCopy devolvendo a frase inteira', SRC.scene, '  if (raw.product) return raw.product\n', '  if (raw.product) return sentence\n', (m) => marcaOk({ sceneSrc: m }))
await vermelho('M7 brandName sem tirar o travessão do fim', SRC.brief, ".trim().replace(/\\s*[—–-]\\s*$/, '') // KINEO-ADS-CONSERTOS-1410", '.trim() // KINEO-ADS-CONSERTOS-1410', (m) =>
  carregar({ [F.brief]: m })(F.brief).brandName({ business: 'perfume num hotel com chuva —' }) === 'perfume num hotel com chuva')
await vermelho('M8 entrega em alemão de volta a 10–15', SRC.ux, "delivery: 'Fertig in etwa 5–8 Minuten'", "delivery: 'Fertig in etwa 10–15 Minuten'", (m) => entregaOk(m))
await vermelho('M9 constante de entrega de volta a 10/15', SRC.ux, 'export const ADS_V2_DELIVERY_MINUTES = { min: 5, max: 8 } as const', 'export const ADS_V2_DELIVERY_MINUTES = { min: 10, max: 15 } as const', (m) => entregaOk(m))
await vermelho('M10 dica em inglês prometendo "exactly as in your photo" de novo', SRC.scene, 'the AI recreates your product from your photo, so small details can change.', 'your product stays exactly as in your photo.', (m) => dicaOk(m))
await vermelho('M11 dica em vietnamita prometendo "giữ nguyên"', SRC.scene, 'AI tái tạo sản phẩm từ ảnh của bạn, nên một vài chi tiết nhỏ có thể thay đổi.', 'sản phẩm vẫn giữ nguyên như trong ảnh.', (m) => dicaOk(m))

console.log(`\ntest-ads-consertos-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
