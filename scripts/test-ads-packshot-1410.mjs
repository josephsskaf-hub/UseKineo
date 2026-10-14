// KINEO-ADS-MELHORIAS-1410 — guardião do PACKSHOT do Studio Ads v2 (fundador 14/10, "tudo sim"): todo anúncio de produto troca UM
// plano de IA pela foto REAL do produto, parada, com zoom lento e fundo suave — a IA não redesenha o produto nessa cena.
// Prova EXECUTANDO o código real pelo carregador offline:
//   P1  planShots + adsV2PackshotShots, nos 3 níveis × 15/20/30 s: exatamente 1 packshot, no FECHO (último plano), com a foto do
//       produto, sem prompt; o resto do plano objeto por objeto igual; mesmo nº de planos e mesma duração;
//   P2  créditos IGUAIS em todos os níveis e durações (o núcleo cobra adsV2Credits(nível, duração), nada do plano entra) e o custo
//       de fal CAI exatamente um plano de Kling O3;
//   P3  nunca cede: herói do Premium, cenas criadas, plano do estilo, vídeo do cliente — cai no 2º plano ou fica sem packshot;
//   P4  sem foto de produto nem pedido de produto = o MESMO array; pedido de produto sem foto marcada = a 1ª foto que não é texto;
//   P5  montagem: fundo `cover` ampliado + véu + foto INTEIRA em `contain` com zoom; sem blur_radius (nunca exercitado); o plano
//       `text` comum sai idêntico ao de antes;
//   P6  ator: o packshot vira insert (logo depois do estilo) e sai com os 3 elementos na trilha dos inserts;
//   P7  avanço e vista: a montagem recebe packshot:true pelo plano; a tela recebe packshot:true e "Your real photo";
//   P8  NÚCLEO REAL do /plan rodado até o fim (banco e modelo falsos): o plano GRAVADO tem o packshot e a resposta cobra o mesmo;
//   P9  linhas marcadas do núcleo: exatamente as esperadas, nenhuma de crédito/débito/preço;
//   P10 dica da cena nas 16 línguas diz que a foto real aparece no anúncio e no cartão, sem prometer "exatamente igual";
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { MARCA_MELHORIAS_1410 } from './test-support/desfaz-melhorias-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  lists: 'lib/ads/v2ShotLists.ts',
  montage: 'lib/ads/adV2Montage.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  presenter: 'lib/ads/v2Presenter.ts',
  advance: 'lib/ads/v2Advance.ts',
  screen: 'lib/ads/v2Screen.ts',
  core: 'lib/ads/v2PlanCore.ts',
  scene: 'lib/ads/v2Scene.ts',
  brief: 'lib/ads/v2Brief.ts',
  copy: 'lib/ads/v2Packshot.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const mod = (rel, over = {}) => carregar(over)(rel)

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const url = (id) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${id}.jpg`
const PLACE = { id: U(21), url: url(21), kind: 'place' }
const PROD = { id: U(22), url: url(22), kind: 'product' }
const PEOPLE = { id: U(23), url: url(23), kind: 'people' }
const TEXT = { id: U(24), url: url(24), kind: 'text' }
const TIERS = ['photo_motion', 'commercial', 'cinema']
const SECS = [15, 20, 30]

// ═══ P1/P2. o packshot no fecho, créditos iguais, fal mais barato ═══════════════════════════════════════════════════════
const p1 = (listsSrc) => {
  const L = mod(F.lists, listsSrc ? { [F.lists]: listsSrc } : {})
  return TIERS.every((tier) => SECS.every((seconds) => {
    const plan = L.planShots({ sector: 'store', tier, photos: [PLACE, PROD, PEOPLE], seconds })
    const out = L.adsV2PackshotShots(plan.shots, { photos: [PLACE, PROD, PEOPLE] })
    const packs = out.filter((s) => s.packshot === true)
    const last = out[out.length - 1]
    const p = packs[0]
    return packs.length === 1 && p === last && p.kind === 'text' && p.source === 'client_photo' && p.imageUrl === PROD.url && p.sourceFootageId === PROD.id &&
      p.prompt === null && p.scenePrompt === null && p.cutStart === 0 && p.cutSeconds === plan.shots[plan.shots.length - 1].cutSeconds &&
      out.length === plan.shots.length && out.every((s, i) => s.idx === plan.shots[i].idx) && out.every((s, i) => s === p || s === plan.shots[i]) &&
      L.adsV2IsPackshot({ shots: out }, p.idx) && !L.adsV2IsPackshot({ shots: plan.shots }, p.idx)
  }))
}
await check('P1 3 níveis × 15/20/30 s: exatamente 1 packshot, no ÚLTIMO plano (o fecho antes do cartão), com a foto do PRODUTO, sem prompt nem cena; os outros planos são os MESMOS objetos; mesmo nº de planos e mesmos cortes', () => p1())

const p2 = (listsSrc) => {
  const L = mod(F.lists, listsSrc ? { [F.lists]: listsSrc } : {})
  const T = mod(F.tiers)
  const kling = T.ADS_V2_ENGINES.kling_o3.usdPerSecond * T.ADS_V2_ENGINES.kling_o3.genSeconds
  const r4 = (n) => Math.round(n * 10000) / 10000
  return TIERS.every((tier) => SECS.every((seconds) => {
    const plan = L.planShots({ sector: 'store', tier, photos: [PLACE, PROD, PEOPLE], seconds })
    const out = L.adsV2PackshotShots(plan.shots, { photos: [PLACE, PROD, PEOPLE] })
    const cost = (shots) => T.estimateAdUsd({ tier, shots: shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: plan.totalSeconds })
    const dur = (shots) => Math.round(shots.reduce((a, s) => a + s.cutSeconds, 0) * 1000)
    return dur(out) === dur(plan.shots) && r4(cost(plan.shots).videoUsd - cost(out).videoUsd) === r4(kling) && cost(out).totalUsd < cost(plan.shots).totalUsd
  })) && /const credits = adsV2Credits\(order\.tier, order\.seconds\)/.test(SRC.core) && /const cost = adsV2Credits\(order\.tier, order\.seconds\)/.test(rd('lib/ads/v2StartCore.ts')) &&
    // a tabela de créditos por nível × duração (o que a pessoa paga) é a de sempre
    JSON.stringify(TIERS.map((t) => SECS.map((s) => T.adsV2Credits(t, s)))) === JSON.stringify(TIERS.map((t) => SECS.map((s) => Math.ceil(T.ADS_V2_TIERS[t].credits15 * s / 15))))
}
await check('P2 créditos IGUAIS (o núcleo do /plan e o /start cobram adsV2Credits(nível, duração) — nenhum plano entra no preço) e o custo de fal cai EXATAMENTE um Kling O3 (US$ 0,336) em cada nível × duração', () => p2())

// ═══ P3/P4. quem nunca cede, e quando não há packshot ═══════════════════════════════════════════════════════════════════
const p3 = (listsSrc) => {
  const L = mod(F.lists, listsSrc ? { [F.lists]: listsSrc } : {})
  const photos = [PLACE, PROD, PEOPLE]
  // Premium: o herói (Seedance) nunca cede; as cenas criadas também não.
  const cin = L.adsV2PackshotShots(L.planShots({ sector: 'store', tier: 'cinema', photos }).shots, { photos })
  const heroKept = cin.filter((s) => s.kind === 'product_hero').length === L.planShots({ sector: 'store', tier: 'cinema', photos }).shots.filter((s) => s.kind === 'product_hero').length
  const scenesKept = cin.filter((s) => s.source === 'generated_scene').length === L.planShots({ sector: 'store', tier: 'cinema', photos }).shots.filter((s) => s.source === 'generated_scene').length
  // Estilo no ÚLTIMO plano (o único produto do Foto em movimento vai para o fecho): o estilo fica, o packshot cai no 2º plano.
  const styled = L.planShots({ sector: 'store', tier: 'photo_motion', photos: [PLACE, PROD], style: 'giant_product' })
  const target = styled.shots.find((s) => s.effect)
  const s2 = L.adsV2PackshotShots(styled.shots, { photos: [PLACE, PROD] })
  const styleKept = s2.find((s) => s.idx === target.idx).effect === 'giant_product' && s2.filter((s) => s.packshot).length === 1 && (target.idx !== s2[s2.length - 1].idx || s2[1].packshot === true)
  // Vídeo do cliente no fecho + 2º plano de cena criada = sem vaga (o anúncio de sempre, o MESMO array).
  const fake = [{ idx: 0, kind: 'people', source: 'client_photo' }, { idx: 1, kind: 'people', source: 'generated_scene' }, { idx: 2, kind: 'user_video', source: 'client_photo' }]
  const none = L.adsV2PackshotShots(fake, { photos }) === fake && L.adsV2PackshotTarget(fake) === null
  // Fecho é vídeo do cliente, 2º é foto animada: o packshot vai para o 2º.
  const fake2 = [{ idx: 0, kind: 'people', source: 'client_photo' }, { idx: 1, kind: 'place', source: 'client_photo' }, { idx: 2, kind: 'user_video', source: 'client_photo' }]
  // Estilo no fecho (montado à mão: o estilo vai no 1º plano de produto): o fecho NÃO cede; o 2º cede.
  const fake3 = [{ idx: 0, kind: 'people', source: 'client_photo' }, { idx: 1, kind: 'place', source: 'client_photo' }, { idx: 2, kind: 'product', source: 'client_photo', effect: 'giant_product' }]
  return heroKept && scenesKept && styleKept && none && L.adsV2PackshotTarget(fake2) === 1 && L.adsV2PackshotTarget(fake3) === 1 &&
    L.adsV2PackshotTarget([{ idx: 0, kind: 'people', source: 'client_photo' }, { idx: 1, kind: 'product_hero', source: 'client_photo' }, { idx: 2, kind: 'text', source: 'client_photo' }]) === null
}
await check('P3 nunca cede: o herói do Premium, as cenas criadas, o plano do ESTILO escolhido e o vídeo do cliente; fecho indisponível = o 2º plano; nenhum dos dois = sem packshot (o mesmo array)', () => p3())

const p4 = (listsSrc) => {
  const L = mod(F.lists, listsSrc ? { [F.lists]: listsSrc } : {})
  const base = L.planShots({ sector: 'restaurant', tier: 'commercial', photos: [PLACE, PEOPLE] }).shots
  const same = L.adsV2PackshotShots(base, { photos: [PLACE, PEOPLE] }) === base && L.adsV2PackshotShots(base, { photos: [PLACE, PEOPLE], productOrder: false }) === base
  const prodOrder = L.adsV2PackshotShots(base, { photos: [TEXT, PLACE, PEOPLE], productOrder: true })
  const pk = prodOrder.find((s) => s.packshot)
  const onlyText = L.planShots({ sector: 'app_service', tier: 'photo_motion', photos: [TEXT] }).shots
  return same && pk && pk.imageUrl === PLACE.url && pk.sourceFootageId === PLACE.id && // nunca a foto de TEXTO
    L.adsV2PackshotShots(onlyText, { photos: [TEXT], productOrder: true }) === onlyText &&
    L.adsV2PackshotShots(base, { photos: [{ ...PROD, url: 'http://inseguro/x.jpg' }] }) === base // URL que não é https = sem packshot
}
await check('P4 sem foto de produto e sem pedido de produto = o MESMO array; pedido de produto sem foto marcada = a 1ª foto que NÃO é de texto; só fotos de texto, ou URL não-https = sem packshot', () => p4())

// ═══ P5. montagem ════════════════════════════════════════════════════════════════════════════════════════════════════
const MONT = (shots, extra = {}) => ({ width: 1080, height: 1920, shots, overlays: [], fontFamily: 'Inter', cardUrl: 'https://x/card.png', musicUrl: null, ...extra })
const vid = { url: 'https://x/a.mp4', kind: 'people', cutStart: 0.5, cutSeconds: 2, measuredSeconds: 3.04 }
const p5 = (montSrc) => {
  const M = mod(F.montage, montSrc ? { [F.montage]: montSrc } : {})
  const shot = { url: PROD.url, kind: 'text', cutStart: 0, cutSeconds: 2, measuredSeconds: null }
  const withPack = M.buildAdV2Source(MONT([vid, { ...shot, packshot: true }]))
  const plain = M.buildAdV2Source(MONT([vid, shot]))
  const els = withPack.elements.filter((e) => e.track === 2 && e.time === 2)
  const [bg, veil, fg] = els
  const plainEls = plain.elements.filter((e) => e.track === 2 && e.time === 2)
  return els.length === 3 && bg.type === 'image' && bg.fit === 'cover' && bg.source === PROD.url && bg.width === '118%' && bg.height === '118%' &&
    veil.type === 'shape' && veil.fill_color === 'rgba(0,0,0,0.45)' && typeof veil.path === 'string' &&
    fg.type === 'image' && fg.fit === 'contain' && fg.source === PROD.url && fg.width === '100%' && fg.height === '100%' &&
    fg.animations && fg.animations[0].type === 'scale' && fg.animations[0].start_scale === '100%' && fg.animations[0].end_scale === '106%' &&
    els.every((e) => e.duration === 2.25 && e.enter_transition && e.enter_transition.type === 'fade') &&
    !JSON.stringify(withPack).includes('blur') && withPack.duration === plain.duration &&
    // o plano `text` comum: 1 elemento, cover, zoom 108% — o de sempre
    plainEls.length === 1 && plainEls[0].fit === 'cover' && plainEls[0].animations[0].end_scale === '108%' && JSON.stringify(plain).indexOf('contain') === -1
}
await check('P5 montagem: fundo `cover` 118% + véu rgba + a foto INTEIRA em `contain` com zoom 100→106% (o produto nunca é cortado), com o dissolve de sempre; nada de blur_radius; o plano `text` comum sai como antes', () => p5())

// ═══ P6. ator ════════════════════════════════════════════════════════════════════════════════════════════════════════
const p6 = (montSrc, presSrc) => {
  const M = mod(F.montage, montSrc ? { [F.montage]: montSrc } : {})
  const P = mod(F.presenter, presSrc ? { [F.presenter]: presSrc } : {})
  const order = P.adsV2PresenterInsertOrder([
    { idx: 0, kind: 'people', source: 'client_photo' },
    { idx: 1, kind: 'product', source: 'client_photo', effect: 'giant_product' },
    { idx: 2, kind: 'place', source: 'client_photo' },
    { idx: 3, kind: 'text', source: 'client_photo', packshot: true },
    { idx: 4, kind: 'text', source: 'client_photo' },
  ])
  const shots = [vid, { ...vid, kind: 'product' }, { ...vid, kind: 'place' }, { url: PROD.url, kind: 'text', cutStart: 0, cutSeconds: 2, measuredSeconds: null, packshot: true }, { url: TEXT.url, kind: 'text', cutStart: 0, cutSeconds: 2, measuredSeconds: null }]
  const ins = M.adsV2PresenterInserts(14, shots, [3, 4, 2])
  const src = M.buildAdV2Source(MONT(shots, { presenter: { url: 'https://x/actor.mp4', measuredSeconds: 14.25, insertOrder: [3, 2] } }))
  const t3 = src.elements.filter((e) => e.track === 3 && e.source === PROD.url)
  return JSON.stringify(order) === JSON.stringify([1, 3, 2, 0]) && // estilo → packshot → lugar → gente; texto comum fora
    ins.length >= 1 && ins[0].shot === 3 && ins[0].seconds === 2 && !ins.some((i) => i.shot === 4) &&
    t3.length === 2 && t3.some((e) => e.fit === 'contain') && t3.some((e) => e.fit === 'cover' && e.width === '118%') &&
    src.elements.some((e) => e.track === 3 && e.type === 'shape' && e.fill_color === 'rgba(0,0,0,0.45)')
}
await check('P6 ator: o packshot entra logo depois do estilo na ordem dos inserts (texto comum segue fora), vira insert de 2 s e sai com fundo + véu + foto inteira na trilha dos inserts', () => p6())

// ═══ P7. avanço e tela ════════════════════════════════════════════════════════════════════════════════════════════════
await check('P7 avanço: a montagem recebe packshot:true pelo PLANO gravado (adsV2IsPackshot) e o ator também; a vista marca packshot:true; a tela diz "Your real photo" (inglês) e o rótulo da língua no modo simples', () => {
  const S = mod(F.screen)
  const C = mod(F.copy)
  return /if \(r\.kind === 'text' && adsV2IsPackshot\(plan, r\.idx\)\) return \{ \.\.\.base, packshot: true \}/.test(SRC.advance) &&
    /\.\.\.\(r\.kind === 'text' && adsV2IsPackshot\(order\.plan, r\.idx\) \? \{ packshot: true as const \} : \{\}\)/.test(SRC.advance) &&
    /\.\.\.\(r\.kind === 'text' && adsV2IsPackshot\(plan, r\.idx\) \? \{ packshot: true \} : \{\}\)/.test(SRC.advance) &&
    S.shotStateLabel({ kind: 'text', source: 'client_photo', status: 'skipped_text', state: 'ready', packshot: true }, 'delivered') === 'Your real photo' &&
    S.shotStateLabel({ kind: 'text', source: 'client_photo', status: 'skipped_text', state: 'ready' }, 'delivered') === 'Still with zoom' &&
    S.canRedoShot({ kind: 'text', status: 'skipped_text', state: 'ready', retake_credits: 0, packshot: true }, 'delivered') === false &&
    Object.keys(C.ADS_V2_PACKSHOT_COPY).length === 16 && C.adsV2PackshotCopy('pt').label === 'Sua foto real' && C.adsV2PackshotCopy('xx').label === 'Your real photo' &&
    /packshotLabel=\{adsV2PackshotCopy\(lang\)\.label\}/.test(SRC.simple)
})

// ═══ P8. núcleo REAL do /plan ═════════════════════════════════════════════════════════════════════════════════════════
const ORDER = U(1)
const USER = U(9)
async function rodaPlano({ coreSrc, tier = 'commercial', photos = [{ footage_id: PLACE.id, kind: 'place' }, { footage_id: PROD.id, kind: 'product' }], brief = {} } = {}) {
  const log = { stored: null }
  const order = {
    id: ORDER, user_id: USER, status: 'draft', tier, seconds: 15, sector: 'store', language: 'en', narration: true,
    brief: { sentence: 'Lume eau de parfum, warm amber', link: null, mode: 'simple', overlays: true, price: null, contact: null, kind: 'product', scene: null, research: { status: 'ok', at: new Date().toISOString(), facts: [] }, ...brief },
    logo_footage_id: null, card_url: null, card_footage_id: null, photos: null, plan: null,
  }
  const admin = {
    from() {
      const q = {
        select: () => q, eq: () => q, gte: () => q, in: () => q,
        update: (row) => { log.stored = row; return q },
        maybeSingle: async () => ({ data: { id: ORDER, card_url: 'https://x/card.png' }, error: null }),
        then: (a, b) => Promise.resolve({ count: 0, error: null, data: [] }).then(a, b),
      }
      return q
    },
  }
  const realBrief = carregar()(F.brief)
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
    '@/lib/openai': { openai: new Proxy({}, { get() { throw new Error('Offline: OpenAI proibido') } }) },
    '@/lib/serverEvents': { writeServerEvent: async () => {} },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, adsSampleOpen: async () => false, adsSampleLevelOk: () => true },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order: structuredClone(order), error: null }) },
    '@/lib/ads/v2Server': {
      ownedFootage: async (_a, _u, ids) => new Map(ids.map((id) => [id, { url: url(id.slice(-2)), isImage: true, isPng: true, isVideo: false }])),
      measureFootageVideo: async () => null,
      v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
      v2Json: (b, status = 200) => ({ status, body: b }),
    },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Brief': {
      ...realBrief,
      extractAdsV2Brief: async () => ({ ok: true, brief: { business: 'Lume', offer: '', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }, copy: { narration: 'Lume eau de parfum. Warm amber that stays with you.', overlays: ['Lume', 'Warm amber'], sectorHint: null }, dropped: [], attempts: 1 }),
    },
  }
  const core = carregar(coreSrc ? { [F.core]: coreSrc } : {}, mocks, { OPENAI_API_KEY: 'offline' })(F.core)
  const body = { mode: 'simple', order_id: ORDER, sector: 'store', photos, facts: [] }
  const res = await core.adsV2PlanFor({ id: USER, email: 'qa@exemplo.com' }, { admin, reason: 'internal', ownerId: USER }, async () => structuredClone(body), Date.now())
  return { res, log }
}
const T = mod(F.tiers)
const p8 = async (coreSrc) => {
  const res = []
  for (const tier of TIERS) {
    const r = await rodaPlano({ coreSrc, tier })
    const shots = r.log.stored?.plan?.shots ?? []
    const packs = shots.filter((s) => s.packshot === true)
    res.push(r.res.status === 200 && packs.length === 1 && packs[0] === shots[shots.length - 1] && packs[0].kind === 'text' && packs[0].prompt === null &&
      r.res.body.credits === T.adsV2Credits(tier, 15) && r.res.body.shots.length === shots.length)
  }
  // pedido de LUGAR (sem foto de produto): nenhum packshot
  const place = await rodaPlano({ coreSrc, photos: [{ footage_id: PLACE.id, kind: 'place' }], brief: { kind: 'place', sentence: 'Casa Aurora restaurant' } })
  res.push(place.res.status === 200 && !(place.log.stored?.plan?.shots ?? []).some((s) => s.packshot))
  return res.every(Boolean)
}
await check('P8 NÚCLEO REAL do /plan (modelo e banco falsos, rodado até gravar): nos 3 níveis o plano GRAVADO tem 1 packshot no fecho, sem prompt; a resposta cobra adsV2Credits(nível, 15) — o mesmo de antes; pedido de lugar sem foto de produto = sem packshot', () => p8())

// ═══ P9. linhas marcadas do núcleo ════════════════════════════════════════════════════════════════════════════════════
await check('P9 núcleo do /plan: as linhas do PACKSHOT são inteiras (o import e a troca, depois da cena e ANTES da régua anti-invenção e do custo); nenhuma linha marcada fala de crédito, débito, preço ou custo', () => {
  const marcadas = SRC.core.split('\n').filter((l) => l.includes(MARCA_MELHORIAS_1410))
  const pack = marcadas.filter((l) => /adsV2PackshotShots/.test(l))
  const iTroca = SRC.core.indexOf('    plan.shots = adsV2PackshotShots(')
  return pack.length === 2 && iTroca > SRC.core.indexOf('    plan.shots = adsV2SceneShots(') && iTroca < SRC.core.indexOf('    const promptIssues = checkV2Prompts(') &&
    iTroca < SRC.core.indexOf('    const usd = estimateAdUsd(') &&
    !/credit|debit|charge|refund|adsV2Credits|estimateAdUsd|cost|price/i.test(marcadas.join('\n').replace(/\/\/.*$/gm, ''))
})

// ═══ P10. dica da cena ═══════════════════════════════════════════════════════════════════════════════════════════════
const LANGS = ['en', 'es', 'hi', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']
const PROMESSA = {
  en: /exactly|identical|stays|same as/i, pt: /igual|exatamente|id[eê]ntico|fica igual/i, es: /igual|exactamente|id[eé]ntico|queda igual/i,
  fr: /exactement|identique|reste/i, de: /genau|identisch|bleibt/i, it: /identico|esattamente|resta/i, nl: /precies|identiek|blijft/i,
  pl: /dokładnie|identyczn|zostaje/i, tr: /gibi kalır|aynı|tıpkı/i, ru: /точно|останется|идентич/i, uk: /точно|залишиться|ідентич/i,
  ar: /تمامًا|يبقى|مطابق/, ur: /بالکل|رہتا ہے/, hi: /बिल्कुल|जैसा रहेगा/, id: /persis|tetap|identik/i, vi: /giữ nguyên|y hệt|giống hệt/i,
}
const FOTO_REAL = { en: /real photo/i, pt: /foto real/i, es: /foto real/i, fr: /vraie photo/i, de: /echtes Foto/i, it: /foto reale/i, nl: /echte foto/i, pl: /prawdziwe zdjęcie/i, tr: /Gerçek fotoğraf/i, ru: /настоящее фото/i, uk: /справжнє фото/i, ar: /صورتك الحقيقية/, ur: /اصل تصویر/, hi: /असली फ़ोटो/, id: /Foto asli/i, vi: /Ảnh thật/i }
const dica = (sceneSrc) => {
  const S = mod(F.scene, sceneSrc ? { [F.scene]: sceneSrc } : {})
  return LANGS.every((l) => { const h = S.ADS_V2_SCENE_COPY[l].scene.hint; return FOTO_REAL[l].test(h) && !PROMESSA[l].test(h) })
}
await check('P10 a dica da cena nas 16 línguas diz que a foto REAL aparece no anúncio e no cartão final — sem prometer "exatamente igual" (a régua da casa)', () => dica())

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════════
const vermelho = async (nome, src, de, para, prova) => {
  let mut = null
  try { mut = trocar(src, de, para) } catch (e) { ok(false, `mutante ${nome}: NÃO aplicou (${e.message})`); return }
  let red = false
  try { red = !(await prova(mut)) } catch (e) { console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = true }
  ok(red && mut !== src, `mutante ${nome}: aplicou e fica VERMELHO`)
}
await vermelho('M1 packshot no gancho (1º plano) em vez do fecho', SRC.lists, '  const last = shots[shots.length - 1]\n  if (packshotCanYield(last)) return last.idx', '  const last = shots[0]\n  if (packshotCanYield(last)) return last.idx', (m) => p1(m))
await vermelho('M2 o herói do Premium pode ceder', SRC.lists, "export const ADS_V2_PACKSHOT_YIELD_KINDS: readonly AdsV2PlanShotKind[] = ['people', 'place', 'product']", "export const ADS_V2_PACKSHOT_YIELD_KINDS: readonly AdsV2PlanShotKind[] = ['people', 'place', 'product', 'product_hero']", (m) => p3(m))
await vermelho('M3 o plano do estilo pode ceder', SRC.lists, ' && !s.effect && !s.packshot', ' && !s.packshot', (m) => p3(m))
await vermelho('M4 foto da frente em `cover` (corta o produto)', SRC.montage, "{ type: 'image', track, time, duration, source, fit: 'contain',", "{ type: 'image', track, time, duration, source, fit: 'cover',", (m) => p5(m))
await vermelho('M5 packshot somando um plano em vez de trocar', SRC.lists, '  return shots.map((s) => s.idx !== at ? s : {', '  return [...shots, { ...shots[0], idx: shots.length }].map((s) => s.idx !== at ? s : {', (m) => p1(m))
await vermelho('M6 núcleo do /plan sem a linha do packshot', SRC.core, SRC.core.split('\n').find((l) => l.startsWith('    plan.shots = adsV2PackshotShots(')) + '\n', '', (m) => p8(m))
await vermelho('M7 inserts do ator voltando a pular o packshot', SRC.montage, "    if (!s || (s.kind === 'text' && !still) ||", "    if (!s || s.kind === 'text' ||", (m) => p6(m))
await vermelho('M8 pedido de produto usando a foto de TEXTO', SRC.lists, "usable.find((p) => p.kind !== 'text')", 'usable[0]', (m) => p4(m))

console.log(`\ntest-ads-packshot-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
