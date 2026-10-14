// KINEO-ADS-RETESTE-1510 — guardião do reteste do Studio Ads v2 de 15/10 (foto de perfume + "perfume num hotel com chuva",
// estilo Dolly zoom). Seis defeitos, cada um provado EXECUTANDO o código real (carregador offline da casa; a OpenAI é falsa e
// responde pelo max_tokens: 900 = brief, 700 = texto, 1100 = versões) ou lendo a estrutura da tela:
//   (A) dolly_zoom FORA do produto: catálogo, 4 espelhos, categorias, cor do palco, 16 línguas, /trending, servidor recusa,
//       prévias fora do repo, nenhuma menção em lib/app/components (só a sonda admin ad_dolly_zoom fica); o "Ver todos os N" do
//       quadro conta o catálogo (17);
//   (B) 3 roteiros por padrão: o /plan pede as versões por padrão; a versão "story" em pt que passava do teto por uma frase e
//       esquecia o nome na 1ª frase de tela agora fica (eram 2 no reteste); frase de PRODUTO sem nome ("Perfume") não cai em
//       brief_needs_business ("We could not tell which business this is"); "a" não planeja; a pausa do automático vale só
//       para a mesma assinatura;
//   (C) produto genérico nunca vira marca: "Perfume" sem marca (pt e en) — o pedido proíbe ("da Perfume", "at Perfume") e
//       ensina "este perfume"/"this perfume"; a régua recusa; o conserto em código troca; a 1ª frase de tela mantém o título;
//   (D) piso de fala: 15 s = 27 palavras (90% do anúncio na voz MiniMax a ~2,0 pal/s), 20 s = 36, 30 s = 54; teto de sempre;
//       fala curta volta com o número (1 correção) e a versão curta é completada sem fato; preço/débito intocados;
//   (E) a caixa da frase não perde o foco: uma só, sem key, no corpo da sessão (nenhum componente definido dentro dela), só o
//       débito ('start') a trava (o plano grátis não), e o título do plano devolve o foco a quem digitava;
//   (F) a barra do celular: FIXA no rodapé com a área segura (acima da navegação < 768 px), some enquanto o botão do quadro
//       está à vista, e a página ganha folga embaixo quando ela aparece;
//   (M) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  styles: 'lib/ads/v2Styles.ts',
  contract: 'lib/ads/v2Contract.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  engines: 'lib/ads/v2Engines.ts',
  flow: 'lib/ads/v2Flow.ts',
  trending: 'lib/trending/trendingNow.ts',
  probe: 'app/api/admin/effect-probe/route.ts',
  brief: 'lib/ads/v2Brief.ts',
  fit: 'lib/ads/v2CopyFit.ts',
  auto: 'lib/ads/v2AutoPlan.ts',
  scripts: 'lib/ads/v2Scripts.ts',
  core: 'lib/ads/v2PlanCore.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  ux: 'app/(dashboard)/ads/v2/AdsV2SimpleUx.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const words = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length

/** OpenAI falsa: responde pelo max_tokens (900 = brief, 700 = texto/correção em fila, 1100 = versões). */
function openaiFalsa({ brief, copies = [], variants = null }) {
  const log = []
  const fila = copies.slice()
  const create = async (params) => {
    log.push(structuredClone(params))
    const mt = params.max_tokens
    const r = mt === 900 ? brief : mt === 1100 ? variants : fila.shift()
    return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] }
  }
  return { log, openai: { chat: { completions: { create } } } }
}
/** Mundo: o código real, com textos trocados em memória (mutantes) e a OpenAI falsa. */
const JSONS = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(rd(rel))])) // a cadeia do /trending importa este .json
const mundo = (over = {}, oa = openaiFalsa({ brief: {} })) => createOfflineLoader({
  mocks: { '@/lib/openai': { openai: oa.openai }, ...JSONS },
  source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
})

// ═══ (A) dolly_zoom fora do produto ═════════════════════════════════════════════════════════════════════════════════
const GONE = 'dolly_zoom'
const GONE_FX = 'Hitchcock Dolly Zoom'
function arvore(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) arvore(rel, out)
    else if (/\.(ts|tsx|json)$/.test(e.name)) out.push(rel)
  }
  return out
}
async function dollyAusente(over = {}) {
  const L = mundo(over)
  const S = L(F.styles)
  const C = L(F.contract)
  const SL = L(F.shots)
  const E = L(F.engines)
  const FL = L(F.flow)
  const T = L(F.trending)
  const has = (o) => Object.prototype.hasOwnProperty.call(o, GONE)
  const keys = S.ADS_V2_STYLES.map((s) => s.key)
  const catalogo = keys.length === 17 && !keys.includes(GONE) && !S.ADS_V2_STYLES.some((s) => s.effect === GONE_FX) && !S.isAdsV2Style(GONE) &&
    [S.ADS_V2_STYLE_KEYS, C.ADS_V2_CONTRACT_STYLES, SL.ADS_V2_PLAN_STYLES, Object.keys(E.ADS_V2_EFFECT_BY_STYLE), Object.keys(FL.ADS_V2_STYLE_TINT)].every((l) => JSON.stringify(l) === JSON.stringify(keys)) &&
    !Object.values(E.ADS_V2_EFFECT_BY_STYLE).includes(GONE_FX) && !has(S.ADS_V2_STYLE_CATEGORIES) && !S.adsV2StylesIn('all').includes(GONE) &&
    LANGS.every((l) => !has(S.ADS_V2_STYLE_COPY[l].styles) && Object.keys(S.ADS_V2_STYLE_COPY[l].styles).length === 17) &&
    !has(T.ADS_STYLE_RELEASED) && !T.adStyleCards(new Date('2026-10-15T12:00:00Z'), true).some((c) => c.key === GONE)
  const photos = [1, 2, 3].map((n) => ({ footage_id: U(n), kind: 'product' }))
  const plan = SL.planShots({ sector: 'store', tier: 'commercial', photos: [1, 2, 3].map((n) => ({ id: U(n), url: `https://x.supabase.co/storage/v1/object/public/x/${n}.jpg`, kind: 'product' })), seconds: 15, style: GONE })
  let lancou = false
  try { E.buildShotInput('pixverse_effect', { imageUrl: 'https://x.supabase.co/storage/v1/object/public/x/p.jpg', prompt: '', effect: GONE }) } catch (e) { lancou = /ads_v2_effect_without_style/.test(String(e && e.message)) }
  const servidor = C.sanitizePlanBody({ order_id: U(9), sector: 'store', logo_footage_id: U(8), photos, style: GONE }).error === 'bad_style' && !SL.isAdsV2PlanStyle(GONE) &&
    plan.style !== GONE && !plan.shots.some((s) => s.effect === GONE) && lancou
  const arquivos = !fs.existsSync(path.join(ROOT, 'public/ads-styles/dolly_zoom.mp4')) && !fs.existsSync(path.join(ROOT, 'public/ads-styles/dolly_zoom.jpg'))
  // nenhuma menção em lib/app/components fora da sonda admin (que FICA, com o enum exato)
  const menc = [...arvore('lib'), ...arvore('app'), ...arvore('components')].filter((f) => f !== F.probe && !/^app\/\(dashboard\)\/ads\/zz-/.test(f))
    .filter((f) => { const t = over[f] !== undefined ? over[f] : rd(f); return t.includes(`'${GONE}'`) || t.includes(`${GONE}:`) || t.includes(GONE_FX) })
  const sonda = rd(F.probe).includes(`  ad_dolly_zoom: { model: PIXVERSE, input: (image) => ({ effect: '${GONE_FX}', image_url: image, resolution: '720p', duration: '5' }) },`)
  // "Ver todos os N" do quadro: N = o catálogo (nunca um número digitado)
  const verTodos = /\{fill\(qc\.seeAll, \{ n: ADS_V2_STYLES\.length \}\)\}/.test(over[F.simple] ?? SRC.simple)
  if (menc.length) console.log('       (menções: ' + menc.join(', ') + ')')
  return catalogo && servidor && arquivos && menc.length === 0 && sonda && verTodos
}
ok(await tenta(() => dollyAusente()), '(A) dolly_zoom fora: catálogo (17), espelhos, categorias, cores, 16 línguas, /trending, servidor recusa, prévias fora, nenhuma menção (a sonda admin fica); "Ver todos os N" = catálogo')

// ═══ (B) 3 roteiros por padrão ══════════════════════════════════════════════════════════════════════════════════════
const BRIEF_PERFUME = { business: 'Perfume —', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
const MAIN_PT = { narration: 'Descubra este perfume de essência única, feito para quem ama fragrâncias marcantes. Um aroma que encanta os sentidos e acompanha o seu dia. Venha sentir a diferença.', overlays: ['Perfume — Fragrâncias', 'Uma essência única'], sector: 'store' }
const BOLD_PT = { tone: 'bold', narration: 'Quer uma fragrância que fica na memória? Este perfume tem uma essência única que encanta os sentidos. Sinta a diferença no seu dia e venha descobrir o seu aroma.', overlays: ['Perfume', 'Fragrância marcante'] }
// a versão do reteste que caía: passa do teto por UMA frase e a 1ª frase de tela não tem o nome
const STORY_PT = { tone: 'story', narration: 'Uma tarde de chuva e um momento só seu. É aí que este perfume aparece, com uma essência suave que envolve os sentidos e fica com você. Venha sentir de perto.', overlays: ['Um momento só seu', 'Essência suave'] }
const SENT = 'Perfume'
async function extrair(over, { copies, variants, args = {}, brief = BRIEF_PERFUME }) {
  const oa = openaiFalsa({ brief, copies, variants })
  const B = mundo(over, oa)(F.brief)
  const r = await B.extractAdsV2Brief({ text: SENT, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true, overlays: true, facts: [], sentence: SENT, productPhoto: true, scripts: true, scene: 'num hotel com chuva', ...args })
  return { r, log: oa.log, B }
}
async function tresRoteiros(over = {}) {
  const { r } = await extrair(over, { copies: [MAIN_PT], variants: { variants: [BOLD_PT, STORY_PT] } })
  if (!r.ok) return false
  const S = mundo(over)(F.scripts)
  const slots = [{ role: 'brand', start: 0.3, end: 3.9 }, { role: 'what', start: 4.5, end: 8.1 }]
  const scripts = S.adsV2BuildScripts([{ tone: 'benefit', narration: r.copy.narration, overlays: r.copy.overlays }, ...(r.variants ?? []).map((v) => ({ tone: v.tone, narration: v.copy.narration, overlays: v.copy.overlays }))], slots, true)
  const story = scripts.find((s) => s.tone === 'story')
  // o /plan pede as versões por padrão (só scripts:false — o lote — desliga)
  const padrao = /scripts: \(body as \{ scripts\?: unknown \} \| null\)\?\.scripts !== false,/.test(over[F.core] ?? SRC.core)
  return scripts.length === 3 && scripts.map((s) => s.id).join() === 'a,b,c' && !!story && words(story.narration) <= 30 && words(story.narration) >= 27 &&
    story.overlays[0]?.text === 'Perfume — Fragrâncias' && r.variantsInfo.kept === 2 && r.variantsInfo.dropped === 0 && padrao
}
ok(await tenta(() => tresRoteiros()), '(B1) 3 roteiros por padrão: a versão "story" do reteste (1 frase além do teto, sem o nome na 1ª frase de tela) agora fica — a,b,c; o /plan pede as versões por padrão')
async function semBriefNeedsBusiness(over = {}) {
  // o brief não acha "negócio" (business vazio) numa frase de produto: antes = brief_needs_business ("We could not tell which business this is")
  const vazio = { ...BRIEF_PERFUME, business: '' }
  const a = await extrair(over, { brief: vazio, copies: [MAIN_PT], variants: { variants: [BOLD_PT, STORY_PT] } })
  const b = await extrair(over, { brief: vazio, copies: [MAIN_PT], args: { text: 'a', sentence: 'a', scripts: false } })
  const A = mundo(over)(F.auto)
  return a.r.ok && a.r.brief.business === 'Perfume' && !b.r.ok && b.r.stage === 'brief' && b.r.why[0] === 'business_name_missing' &&
    A.adsV2SentenceReady('Perfume') && !A.adsV2SentenceReady('a') && !A.adsV2SentenceReady('  ab ') && A.adsV2SentenceReady('香水')
}
ok(await tenta(() => semBriefNeedsBusiness()), '(B2) frase de PRODUTO sem nome ("Perfume", foto de produto) não cai em "We could not tell which business this is"; "a" continua recusada e nem conta como frase pronta')
function telaAutomatico(simple = SRC.simple, auto = null) {
  const A = auto ?? mundo()(F.auto)
  return /if \(!adsV2SentenceReady\(sentence\)\) missing\.push\(copy\.plan\.needText\)/.test(simple) && !/if \(!sentence\) missing\.push\(copy\.plan\.needText\)/.test(simple) &&
    /useEffect\(\(\) => \{ if \(autoPaused && adsV2AutoPauseLifts\(autoRef\.current\.sig, planSig\)\) setAutoPaused\(false\) \}, \[autoPaused, planSig\]\)/.test(simple) &&
    A.adsV2AutoPauseLifts('{"a":1}', '{"a":2}') === true && A.adsV2AutoPauseLifts('{"a":1}', '{"a":1}') === false && A.adsV2AutoPauseLifts(null, '{"a":1}') === false
}
ok(await tenta(() => telaAutomatico()), '(B3) tela: "a" não planeja (nem sozinho); a pausa do roteiro automático vale só para a assinatura que falhou — mudou o texto, ele volta')

// ═══ (C) produto genérico nunca vira marca ══════════════════════════════════════════════════════════════════════════
const RUIM_PT = { narration: 'Descubra a essência única da Perfume, a fragrância que encanta os sentidos. Perfume é a sua escolha para todos os momentos do dia. Venha sentir a diferença hoje.', overlays: ['Perfume — Fragrâncias', 'Na Perfume, essência única'], sector: 'store' }
const RUIM_EN = { narration: 'Explore unique fragrances at Perfume, made for people who love a scent that stays with them. Discover Perfume and its warm notes every day. Come and feel it.', overlays: ['Perfume — Fragrances', 'Discover Perfume today'], sector: 'store' }
async function genericoNaoMarca(over = {}) {
  const B = mundo(over)(F.brief)
  const FIT = mundo(over)(F.fit)
  const gpt = FIT.adsV2GenericProduct('Perfume', 'Perfume', 'pt', { pageRead: false })
  const gen = FIT.adsV2GenericProduct('Perfume', 'perfume', 'en', { pageRead: false })
  // pedido: a regra do genérico no lugar de "Say the business name once."
  const brief = { business: 'Perfume —', offer: '', cta: 'visit', contact: '', language: 'pt', tone: 'warm', audience: '', extra: {} }
  const sys = B.buildV2CopyMessages(brief, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true, generic: gpt, speechMin: 27 }).system
  const pedido = sys.includes('never "da Perfume"') && sys.includes('"este perfume"') && !sys.includes('Say the business name once.') &&
    B.buildV2CopyMessages(brief, 'English', { maxWords: 30, narration: true, generic: gen }).system.includes('"this perfume"')
  // régua: recusa com o motivo
  const regua = B.checkV2Copy(JSON.stringify(RUIM_PT), brief, { maxWords: 30, narration: true, generic: gpt })
  const recusa = !regua.ok && regua.why.some((w) => /"Perfume" is not a brand name/.test(w) && /da Perfume/.test(w)) && regua.why.some((w) => /^overlays\[1\]/.test(w))
  // extração ponta a ponta (pt e en): 1ª e 2ª respostas usam o produto como marca → o conserto em código entrega a forma certa
  const pt = await extrair(over, { copies: [RUIM_PT, RUIM_PT], args: { scripts: false } })
  const oaEn = openaiFalsa({ brief: BRIEF_PERFUME, copies: [RUIM_EN, RUIM_EN] })
  const en = { r: await mundo(over, oaEn)(F.brief).extractAdsV2Brief({ text: 'perfume', language: 'en', languageName: 'English', maxWords: 30, narration: true, overlays: true, facts: [], sentence: 'perfume', productPhoto: true }) }
  const limpo = (r, g) => r.ok && FIT.adsV2GenericBrandUses(r.copy.narration, g).length === 0 && r.copy.overlays.slice(1).every((o) => FIT.adsV2GenericBrandUses(o, g).length === 0) && /^Perfume — /.test(r.copy.overlays[0])
  const correcao = pt.log[2]?.messages?.at(-1)?.content ?? ''
  const marcaReal = FIT.adsV2GenericProduct('LUME', 'LUME eau de parfum', 'en', { pageRead: false }) === null && FIT.adsV2GenericProduct('Perfume', 'Perfume', 'pt', { pageRead: true }) === null &&
    FIT.adsV2GenericProduct('Perfume', 'Perfume da Casa Aurora', 'pt', { pageRead: false }) === null
  return pedido && recusa && limpo(pt.r, gpt) && /deste perfume/.test(pt.r.copy.narration) && /Este perfume é/.test(pt.r.copy.narration) && /"Perfume" is not a brand name/.test(correcao) &&
    limpo(en.r, gen) && /with this perfume/.test(en.r.copy.narration) && /Discover this perfume/.test(en.r.copy.narration) && marcaReal
}
ok(await tenta(() => genericoNaoMarca()), '(C) "Perfume" sem marca (pt e en): o pedido proíbe "da Perfume"/"at Perfume" e ensina "este/this perfume"; a régua recusa; o conserto entrega "deste perfume"/"with this perfume"; a 1ª frase de tela mantém o título; marca de verdade (LUME), página lida ou nome próprio = nada muda')

// ═══ (D) piso de fala ═══════════════════════════════════════════════════════════════════════════════════════════════
const CURTA = { narration: 'Descubra a essência única deste perfume. Fragrâncias que encantam os sentidos. Venha sentir a diferença!', overlays: ['Perfume — Fragrâncias', 'Uma essência única'], sector: 'store' }
async function pisoDeFala(over = {}) {
  const FIT = mundo(over)(F.fit)
  const SL = mundo(over)(F.shots)
  const B = mundo(over)(F.brief)
  const pisos = [15, 20, 30].map((s) => FIT.adsV2SpeechMinWords(SL.adsV2NarrationMaxWords(s)))
  const regua = JSON.stringify(pisos) === '[27,36,54]' && [15, 20, 30].every((s, i) => pisos[i] / FIT.ADS_V2_VOICE_WPS >= 0.9 * s && pisos[i] <= SL.adsV2NarrationMaxWords(s)) &&
    FIT.ADS_V2_VOICE_WPS === 2.0 && SL.adsV2NarrationMaxWords(15) === 30
  const brief = { business: 'Perfume —', offer: '', cta: 'visit', contact: '', language: 'pt', tone: 'warm', audience: '', extra: {} }
  const pedido = B.buildV2CopyMessages(brief, 'Brazilian Portuguese (pt-BR)', { maxWords: 30, narration: true, speechMin: 27 }).system.includes('27 to 30 words in total (count them)')
  const curta = B.checkV2Copy(JSON.stringify(CURTA), brief, { maxWords: 30, narration: true, speechMin: 27 })
  const recusa = !curta.ok && curta.why.some((w) => /write 27 to 30 words \(you wrote 15\)/.test(w))
  // extração: a 1ª resposta curta (15 palavras, a do reteste) volta com o número; a 2ª (≥ 27) é a gravada
  const x = await extrair(over, { copies: [CURTA, MAIN_PT], args: { scripts: false } })
  const reask = x.r.ok && x.r.attempts === 3 && /write 27 to 30 words \(you wrote 15\)/.test(x.log[2]?.messages?.at(-1)?.content ?? '') && words(x.r.copy.narration) >= 27 && x.r.copy.narration === MAIN_PT.narration
  // a versão curta (sem correção própria) é completada em código, sem fato, até o piso
  const v = await extrair(over, { copies: [MAIN_PT], variants: { variants: [{ tone: 'bold', narration: CURTA.narration, overlays: ['Perfume', 'Essência única'] }, STORY_PT] } })
  const bold = (v.r.variants ?? []).find((y) => y.tone === 'bold')
  const pad = !!bold && words(bold.copy.narration) >= 27 && words(bold.copy.narration) <= 30 && bold.copy.narration.startsWith(CURTA.narration) && !/\d/.test(bold.copy.narration)
  return regua && pedido && recusa && reask && pad
}
ok(await tenta(() => pisoDeFala()), '(D1) piso de fala: 15 s = 27 · 20 s = 36 · 30 s = 54 palavras (≥ 90% do anúncio a 2,0 pal/s, teto de sempre); a curta volta com o número e a versão curta é completada sem fato')
// preço, crédito e débito: os 3 arquivos do dinheiro byte a byte os da base 6d0aee11 (este conserto não os toca)
const DINHEIRO = {
  'lib/ads/v2Billing.ts': 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9',
  'lib/ads/v2Tiers.ts': '18678aa1573651bc61ee6ff55508187393ae56c093dbc09f8737e65d344219a0',
  'lib/ads/v2StartCore.ts': '4393d6ccf8d02426eecded99df5b3be56c0ee9072d5a74221bef566b474dbbde',
}
const dinheiroIntocado = (over = {}) => Object.entries(DINHEIRO).every(([f, h]) => sha(over[f] ?? rd(f)) === h) &&
  ![SRC.fit, SRC.auto].some((s) => /adsV2Credits|chargeAdsV2|refund|debit|v2Billing|v2Tiers/.test(s))
ok(await tenta(() => dinheiroIntocado()), '(D2) v2Billing, v2Tiers e v2StartCore byte a byte os da base; os módulos novos não falam de crédito/débito')

// ═══ (E) a caixa da frase não perde o foco ══════════════════════════════════════════════════════════════════════════
function semRemontar(s = SRC.simple) {
  const ini = s.indexOf('export function AdsV2SimpleSession(')
  const fim = s.indexOf('\nfunction ItemCard(', ini)
  const corpo = s.slice(ini, fim)
  const caixas = s.match(/<textarea [^\n]*className="adv2q-prompt"[^\n]*\/>/g) || []
  const caixa = caixas[0] ?? ''
  // nenhum componente (Maiúscula) definido DENTRO da sessão: cada render criaria um tipo novo e remontaria a caixa
  const internos = corpo.slice(1).match(/\n\s+(?:function [A-Z]\w*\(|const [A-Z]\w* = (?:\([^)]*\)|\w+) =>)/g) || []
  return caixas.length === 1 && corpo.includes(caixa) && !/\skey=/.test(caixa) && /ref=\{textAreaRef\}/.test(caixa) &&
    /disabled=\{busy === 'start'\}/.test(caixa) && !/disabled=\{locked/.test(caixa) && internos.length === 0 &&
    /<input id="adv2s-scene" [^>]*disabled=\{busy === 'start' \|\| !sceneTierOk\}/.test(s) &&
    /<h2 id="adv2s-s4" ref=\{planHeadingRef\} tabIndex=\{-1\} onFocus=\{\(e\) => \{ const prev = e\.relatedTarget; if \(prev instanceof HTMLTextAreaElement \|\| prev instanceof HTMLInputElement\) prev\.focus\(\) \}\}>/.test(s)
}
ok(await tenta(() => semRemontar()), '(E) a caixa da frase: uma só, sem key, no corpo da sessão (nenhum componente definido dentro dela); só o débito a trava (o plano grátis não); o título do plano devolve o foco a quem digitava')

// ═══ (F) a barra do celular ═════════════════════════════════════════════════════════════════════════════════════════
function barraCerta(ux = SRC.ux, auto = null) {
  const A = auto ?? mundo()(F.auto)
  return /@media\(max-width:900px\)\{\n\s*\.adv2 \.adv2s-bar\{position:fixed;left:12px;right:12px;bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\);z-index:40;display:flex/.test(ux) &&
    !/\.adv2s-bar\{position:sticky/.test(ux) &&
    /@media\(max-width:767px\)\{\.adv2 \.adv2s-bar\{bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)\}\}/.test(ux) &&
    /\n\.adv2 \.adv2s-bar\[data-hidden=true\]\{display:none\}\n/.test(ux) &&
    /html \.stu\.adv2:has\(\.adv2s-bar:not\(\[data-hidden=true\]\)\)\{padding-bottom:calc\(176px \+ env\(safe-area-inset-bottom\)\)\}/.test(ux) &&
    // a CAUSA do "meio da tela": o .kps-panel (ProductStage) tem backdrop-filter, que vira o bloco de contenção do fixed/sticky
    // (medido no Edge a 390 px: barra fixa em top 1102 com a tela de 844). No celular o painel que guarda a barra perde o blur.
    /@media\(max-width:900px\)\{html \.stu\.adv2 \.kps-panel:has\(\.adv2s-bar\)\{-webkit-backdrop-filter:none;backdrop-filter:none\}\}/.test(ux) &&
    /const el = document\.querySelector\(ADS_V2_BOARD_GO_SELECTOR\)/.test(ux) && /new IntersectionObserver\(\(entries\) => setBoardGoInView\(entries\.some\(\(e\) => e\.isIntersecting\)\)\)/.test(ux) &&
    /<div className="adv2s-bar" data-kineo="ads-mobile-bar" data-hidden=\{adsV2MobileBarVisible\(boardGoInView\) \? undefined : 'true'\}>/.test(ux) &&
    A.ADS_V2_BOARD_GO_SELECTOR === '[data-kineo="ads-quadro-go"]' && SRC.simple.includes('<div className="adv2q-go" data-kineo="ads-quadro-go">') &&
    A.adsV2MobileBarVisible(true) === false && A.adsV2MobileBarVisible(false) === true && A.adsV2MobileBarVisible(null) === true
}
ok(await tenta(() => barraCerta()), '(F) barra do celular FIXA no rodapé (área segura; acima da navegação < 768 px), some enquanto o botão do quadro está à vista, folga embaixo quando aparece')

// ═══ (M) mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
async function mutante(nome, rel, de, para, regra) {
  let mudado
  try { mudado = trocar(rd(rel), de, para) } catch (e) { ok(false, `(M) ${nome}: ${e.message}`); return }
  const aplicou = mudado.includes(para)
  const verde = await tenta(() => regra({ [rel]: mudado }))
  ok(aplicou && !verde, `(M) ${nome} → vermelho (aplicou: ${aplicou})`)
}
const MACARON = "  { key: 'macaron_machine', effect: 'Macaron Machine'"
await mutante('dolly_zoom de volta ao catálogo', F.styles, MACARON, "  { key: 'dolly_zoom', effect: 'Hitchcock Dolly Zoom', label: 'Dolly zoom', oneLine: 'x', bestFor: 'y', ...asset('dolly_zoom') },\n" + MACARON, dollyAusente)
await mutante('dolly_zoom de volta ao contrato do /plan', F.contract, ", 'boom_drop', 'macaron_machine']", ", 'dolly_zoom', 'boom_drop', 'macaron_machine']", dollyAusente)
await mutante('"Ver todos os N" com número digitado', F.simple, '{fill(qc.seeAll, { n: ADS_V2_STYLES.length })}', '{fill(qc.seeAll, { n: 18 })}', dollyAusente)
await mutante('versão sem o nome na 1ª frase de tela volta a cair (2 roteiros)', F.brief, 'const raw1 = adsV2VariantFirstOverlay(raw0, brandName(brief), mainFirst)', 'const raw1 = raw0', tresRoteiros)
await mutante('versão uma frase além do teto volta a cair (sem o corte)', F.fit, "fixes.push('speech_trim')", "fixes.push('speech_trim'); s = sentencesOf(t)", tresRoteiros)
await mutante('frase de produto sem nome volta a dar brief_needs_business', F.brief, 'if (fb) { parsed.brief.business = fb;', 'if (fb && false) { parsed.brief.business = fb;', semBriefNeedsBusiness)
await mutante('"a" volta a planejar (missing com !sentence)', F.simple, 'if (!adsV2SentenceReady(sentence)) missing.push(copy.plan.needText)', 'if (!sentence) missing.push(copy.plan.needText)', (o) => telaAutomatico(o[F.simple]))
await mutante('pausa do automático sem voltar quando o texto muda', F.auto, 'return pausedSig !== null && pausedSig !== planSig', 'return false', (o) => telaAutomatico(SRC.simple, mundo(o)(F.auto)))
await mutante('conserto do genérico desligado ("da Perfume" fica)', F.fit, '  const hits = genericHits(t, g)\n  if (!hits.length) return { text: t, fixes: [] }', '  const hits = genericHits(t, g)\n  if (hits.length >= 0) return { text: t, fixes: [] }', genericoNaoMarca)
await mutante('pedido de texto sem a regra do genérico ("Say the business name once.")', F.brief, 'const nameRule = opts.generic ? adsV2GenericRule(opts.generic) : sayName', 'const nameRule = sayName', genericoNaoMarca)
await mutante('piso de fala de volta à metade do teto (15 palavras)', F.fit, 'return Math.min(maxWords, Math.ceil(ADS_V2_SPEECH_SHARE * seconds * ADS_V2_VOICE_WPS))', 'return Math.ceil(maxWords * 0.5)', pisoDeFala)
await mutante('régua sem o piso de fala (a curta passa sem correção)', F.brief, ": typeof opts.speechMin === 'number' ? opts.speechMin : Math.ceil(opts.maxWords * 0.5)", ': Math.ceil(opts.maxWords * 0.5)', pisoDeFala)
await mutante('1 caractere no débito (v2StartCore)', 'lib/ads/v2StartCore.ts', 'chargeAdsV2(admin, { userId: uid, billingRef, cost })', 'chargeAdsV2(admin, { userId: uid, billingRef, cost: cost })', dinheiroIntocado)
await mutante('caixa da frase travada pelo plano grátis de novo (disabled={locked})', F.simple, "value={text} disabled={busy === 'start'} onChange={(e) => setText(e.target.value)}", 'value={text} disabled={locked} onChange={(e) => setText(e.target.value)}', (o) => semRemontar(o[F.simple]))
await mutante('caixa da frase com key (remonta)', F.simple, '<textarea ref={textAreaRef} className="adv2q-prompt"', '<textarea key={inAd.length} ref={textAreaRef} className="adv2q-prompt"', (o) => semRemontar(o[F.simple]))
await mutante('componente definido dentro da sessão', F.simple, '  const planAdRef = useRef(planAd)\n', '  const Caixa = () => null\n  const planAdRef = useRef(planAd)\n', (o) => semRemontar(o[F.simple]))
await mutante('título do plano roubando o foco de quem digita', F.simple, ' onFocus={(e) => { const prev = e.relatedTarget; if (prev instanceof HTMLTextAreaElement || prev instanceof HTMLInputElement) prev.focus() }}', '', (o) => semRemontar(o[F.simple]))
await mutante('barra do celular sticky de novo (no meio da tela)', F.ux, '.adv2 .adv2s-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));', '.adv2 .adv2s-bar{position:sticky;bottom:12px;', (o) => barraCerta(o[F.ux]))
await mutante('painel com blur prendendo a barra fixa (volta ao meio da tela)', F.ux, 'html .stu.adv2 .kps-panel:has(.adv2s-bar){-webkit-backdrop-filter:none;backdrop-filter:none}', 'html .stu.adv2 .kps-panel:has(.adv2s-bar){}', (o) => barraCerta(o[F.ux]))
await mutante('barra sem sumir com o botão do quadro à vista', F.auto, 'return boardGoInView !== true', 'return true', (o) => barraCerta(SRC.ux, mundo(o)(F.auto)))

console.log(`\ntest-ads-reteste-1510: ${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
