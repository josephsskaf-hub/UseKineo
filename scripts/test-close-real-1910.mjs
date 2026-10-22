// KINEO-CLOSE-REAL-1910 — guardião do formato "CLOSE DO PRODUTO REAL" do Studio Ads (formato nº 2 da Biblioteca de Formatos) e da AMOSTRA GRÁTIS nele.
// Roda com `node scripts/test-close-real-1910.mjs` na raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo
// typescript do repo (scripts/test-support/offline-ts-loader.mjs) com stubs. Base: docs/POR-QUE-OS-CONCORRENTES-SAO-MELHORES-2026-10-19.md (R2, E1).
//
// O que prova (1 seção por item):
//   Z  ZERO IA sobre o produto: todo plano vira foto real parada (routeShot = null em toda tentativa, US$ 0 de vídeo e de imagem), a montagem só tem
//      imagem/forma/texto/áudio (nenhum vídeo gerado), o servidor só chama o recorte (BiRefNet, o mesmo da trava) e cola o produto pixel a pixel;
//   E  ESTRUTURA de 15 s: gancho 0–3 s com a frase no quadro 0, 3 planos das fotos reais (Ken Burns + punch-in), cartão de 2,5 s; voz longa estica;
//   F  FRASES na zona segura do Meta (nada nos 14% de cima nem nos 35% de baixo), sem frase nem palavra repetida;
//   V  VOZ por língua do apresentador v2 (PT-BR Portuguese_ConfidentWoman) e música com ducking;
//   A  AMOSTRA: 1 por conta, só no Close real (o /plan força, o /start recusa sem ele), com marca-d'água; antifarm (descartável, trial barrado);
//   T  TESTE vê a amostra (não o "acesso negado"): a porta segue abrindo para a amostra e a tela fala do Close real;
//   P  PADRÕES DA TELA: Apresentador e Close real; estilos/cenas de IA só no "Avançado";
//   D  desfaz exato + novos + marca + encadeamento (os guardiões byte a byte tiram esta camada PRIMEIRO);
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs' // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: o ajuste pós-canário sai primeiro, em memória
import { semFilmesF1Virgula1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs' // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a camada mais nova sai primeiro
import { semCloseReal1910, CLOSE_REAL_1910_ARQUIVOS, CLOSE_REAL_1910_NOVOS, CLOSE_REAL_1910_BASE, MARCA_CLOSE_REAL_1910, TROCAS_CLOSE_REAL_1910 } from './test-support/desfaz-close-real-1910.mjs'
import { semFilmesF1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs' // reancorado KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]: as linhas marcadas do Faceless 15 s saem antes da comparação com a base
import { semAdsQualidade2110 } from './test-support/desfaz-ads-qualidade-2110.mjs' // KINEO-ADS-QUALIDADE-2110 — reancorado: a qualidade do Studio Ads (21/10) veio depois

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
const rd = (p) => lf(semFilmesF1F4_1910(semCloseRealAjuste1910(semFilmesF1Virgula1910(readFileSync(join(ROOT, p), 'utf8'), p), p), p)) // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a fiação do Faceless 15 s no export limpo (a mais nova) sai PRIMEIRO; depois o ajuste do Close real e o F1–F4
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_1910_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  cr: 'lib/ads/v2CloseReal.ts', srv: 'lib/ads/v2CloseRealServer.ts', tiers: 'lib/ads/v2Tiers.ts', montage: 'lib/ads/adV2Montage.ts', png: 'lib/ads/v2Png.ts',
  plan: 'lib/ads/v2PlanCore.ts', start: 'lib/ads/v2StartCore.ts', advance: 'lib/ads/v2Advance.ts', access: 'lib/ads/serverAccess.ts', sample: 'lib/ads/sample.ts',
  contract: 'lib/ads/v2Contract.ts', simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx', page: 'app/(dashboard)/ads/v2/page.tsx',
  door: 'app/ads/page.tsx', compose: 'lib/compose.ts', pv2: 'lib/ads/v2PresenterV2.ts', events: 'lib/ads/events.ts', evroute: 'app/api/events/route.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))

// ── carregadores (fontes reais; `over` = mutantes por arquivo) ───────────────────────────────────────────────────────
const carregar = (over = {}, mocks = {}, env = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, env, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : semCloseRealAjuste1910(text, rel)) }) // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: executa o formato na régua de antes do ajuste
const CR = (over = {}) => carregar(over)(F.cr)
const H = (n) => `https://cdn.test/${n}`
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const PHOTOS = [{ footage_id: U(11), kind: 'product', url: H('frasco.jpg'), original_footage_id: U(12), original_url: H('frasco-inteiro.jpg') }, { footage_id: U(13), kind: 'product', url: H('caixa.jpg') }]
const SHOTS = [
  { idx: 0, role: 'hook', beat: 'hook', kind: 'people', source: 'generated_scene', sourceFootageId: null, imageUrl: null, referenceFootageIds: [U(11)], referenceUrls: [H('frasco.jpg')], scenePrompt: 'a woman holds the product', prompt: 'slow push', movementVariant: 1, cutStart: 0.3, cutSeconds: 2.5 },
  { idx: 1, role: 'proof', beat: 'proof', kind: 'product_hero', source: 'client_photo', sourceFootageId: U(11), imageUrl: H('frasco.jpg'), referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: 'orbit', movementVariant: 0, cutStart: 0, cutSeconds: 2.5, effect: 'product_closeup' },
  { idx: 2, role: 'place', beat: 'place', kind: 'place', source: 'generated_scene', sourceFootageId: null, imageUrl: null, referenceFootageIds: [U(13)], referenceUrls: [H('caixa.jpg')], scenePrompt: 'a shop', prompt: 'pan', movementVariant: 2, cutStart: 0, cutSeconds: 2.5, presenterHolds: true },
  { idx: 3, role: 'close', beat: 'close', kind: 'product', source: 'client_photo', sourceFootageId: U(13), imageUrl: H('caixa.jpg'), referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: 'tilt', movementVariant: 0, cutStart: 0, cutSeconds: 2.5, packshot: true },
]
const BUILD = { width: 720, height: 1280, heroUrl: H('hero.png'), heroFallbackUrl: H('frasco.jpg'), photos: [H('frasco.jpg'), H('caixa.jpg')], phrases: ['Perfume Perfume Atheeri', 'Notas de baunilha e âmbar', 'Notas de baunilha e âmbar', 'Peça já o seu'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('music.mp3'), musicTrimStart: 0, voiceUrl: H('voz.mp3'), voiceSeconds: 9.2, watermark: null }
const r3 = (n) => Math.round(n * 1000) / 1000

// ── as provas, como funções de (fontes) → boolean, para os mutantes reusarem ───────────────────────────────────────
const provaZeroIa = (over = {}) => {
  const L = carregar(over)
  const cr = L(F.cr), tiers = L(F.tiers)
  const out = cr.adsV2CloseRealShots(SHOTS.map((s) => ({ ...s })), PHOTOS)
  const allText = out.every((s) => s.kind === 'text' && s.source === 'client_photo' && s.prompt === null && s.scenePrompt === null && !('effect' in s) && !('presenterHolds' in s) && !('packshot' in s) && /^https:\/\/cdn\.test\/(frasco|caixa)\.jpg$/.test(s.imageUrl))
  const noEngine = out.every((s) => [1, 2, 3, 4].every((a) => tiers.routeShot(s.kind, 'commercial', a) === null))
  const usd = tiers.estimateAdUsd({ tier: 'commercial', shots: out.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: 15 })
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const types = new Set(src.elements.map((e) => e.type))
  const sources = src.elements.filter((e) => e.source).map((e) => e.source)
  const allowed = new Set([BUILD.heroUrl, ...BUILD.photos, BUILD.cardUrl, BUILD.musicUrl, BUILD.voiceUrl])
  return allText && noEngine && usd.videoUsd === 0 && usd.imageUsd === 0 && usd.aiShots === 0 && usd.sceneImages === 0 &&
    !types.has('video') && [...types].every((t) => ['shape', 'image', 'text', 'audio'].includes(t)) && sources.every((s) => allowed.has(s))
}
const provaEstrutura = (over = {}) => {
  const cr = CR(over)
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const imgs = src.elements.filter((e) => e.type === 'image')
  const hero = imgs[0]
  const card = imgs.find((e) => e.source === BUILD.cardUrl)
  const photoEls = imgs.filter((e) => BUILD.photos.includes(e.source))
  const starts = [...new Set(photoEls.filter((e) => e.enter_transition).map((e) => e.time))]
  const punches = photoEls.filter((e) => !e.enter_transition)
  const hookText = src.elements.find((e) => e.type === 'text' && e.time === 0)
  const t = cr.adsV2CloseRealTimeline({ voiceSeconds: 9.2 })
  const longer = cr.adsV2CloseRealTimeline({ voiceSeconds: 13 })
  let tooLong = false
  try { cr.buildAdV2CloseRealSource({ ...BUILD, voiceSeconds: 20 }) } catch (e) { tooLong = /voice_too_long/.test(e.message) }
  const kbOk = photoEls.filter((e) => e.enter_transition).every((e, k) => e.animations[0].type === 'scale' && e.animations[0].easing === 'ease-out' && e.animations[0].x_anchor === cr.ADS_V2_CLOSE_REAL_KEN_BURNS[k % 4].xAnchor)
  const punchOk = punches.length === 3 && punches.every((e) => e.animations[0].start_scale === cr.ADS_V2_CLOSE_REAL_PUNCH_FROM)
  return src.duration === 15 && t.total === 15 && t.hook === 3 && t.shots.length === 3 && near(t.shots.reduce((a, b) => a + b, 0), 9.5) && t.cardStart === 12.5 &&
    hero.time === 0 && hero.source === BUILD.heroUrl && !hero.enter_transition && near(hero.duration, 3 + 0.25) &&
    starts.length === 3 && near(starts[0], 3) && card.time === 12.5 && near(card.duration, 2.5) && kbOk && punchOk &&
    !!hookText && !hookText.enter_transition && hookText.duration === 3 &&
    longer.total > 15 && longer.shots.every((d) => d <= cr.ADS_V2_CLOSE_REAL_SHOT_MAX + 1e-9) && tooLong && src.snapshot_time === 1
}
const near = (a, b) => Math.abs(a - b) < 1e-6
const provaZonaSegura = (over = {}) => {
  const cr = CR(over)
  const L = carregar(over)(F.montage)
  const textos = ['Oi', 'Notas de baunilha e âmbar para o dia inteiro', 'Um perfume encantador com notas amadeiradas profundas e marcantes', 'Supercalifragilisticexpialidocious fragrance', 'Peça já o seu']
  const formatos = [[720, 1280], [1080, 1920]]
  const caixas = textos.flatMap((t) => formatos.map(([w, h]) => cr.adsV2CloseRealOverlayGeometry(t, w, h).box))
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const txt = src.elements.filter((e) => e.type === 'text')
  const allInZone = caixas.every((b) => cr.adsV2CloseRealInSafeZone(b)) && caixas.every((b) => b.top >= L.ADS_V2_SAFE_TOP && b.bottom <= L.ADS_V2_SAFE_BOTTOM)
  const L2 = L.ADS_V2_SAFE_TOP === 0.14 && L.ADS_V2_SAFE_BOTTOM === 0.65
  const above = caixas.every((b) => b.bottom <= cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0) // a frase do gancho nunca cobre o produto recortado
  const phrases = cr.adsV2CloseRealPhrases(BUILD.phrases)
  const dedupe = phrases.length === 3 && phrases[0] === 'Perfume Atheeri' && phrases[1] === 'Notas de baunilha e âmbar' && phrases[2] === 'Peça já o seu'
  return allInZone && L2 && above && dedupe && txt.length === 3 && txt.every((e) => e.y_anchor === '100%' && e.x_alignment === '50%' && parseFloat(e.y) / 100 <= L.ADS_V2_SAFE_BOTTOM) && txt.map((e) => e.text).join('|') === phrases.join('|')
}
const provaMarcaDagua = (over = {}) => {
  const cr = CR(over)
  const com = cr.buildAdV2CloseRealSource({ ...BUILD, watermark: cr.ADS_V2_CLOSE_REAL_WATERMARK })
  const sem = cr.buildAdV2CloseRealSource({ ...BUILD, watermark: null })
  const wm = com.elements.filter((e) => e.type === 'text' && e.text === cr.ADS_V2_CLOSE_REAL_WATERMARK)
  return wm.length === 1 && wm[0].time === 0 && wm[0].duration === com.duration && /usekineo\.com/.test(cr.ADS_V2_CLOSE_REAL_WATERMARK) &&
    sem.elements.every((e) => e.text !== cr.ADS_V2_CLOSE_REAL_WATERMARK)
}
const provaPadroes = (over = {}) => {
  const cr = CR(over)
  return JSON.stringify(cr.ADS_V2_AD_FORMATS_DEFAULT) === '["presenter","close_real"]' &&
    cr.adsV2DefaultAdFormat({ sample: false, presenterPublic: true }) === 'presenter' && cr.adsV2DefaultAdFormat({ sample: false, presenterPublic: false }) === 'close_real' &&
    cr.adsV2DefaultAdFormat({ sample: true, presenterPublic: true }) === 'close_real' && ['presenter', 'advanced', null].every((c) => cr.adsV2EffectiveAdFormat(c, true) === 'close_real') &&
    cr.adsV2EffectiveAdFormat('advanced', false) === 'advanced' && cr.adsV2EffectiveAdFormat('bogus', false) === 'presenter'
}

// stub do banco (profiles, ads_v2_orders) e do auth, para o adsSampleOpen executado
function fakeDb({ orders = [], trialStatus = null, email = 'dona.padaria@example.com', authError = false, profileError = false } = {}) {
  const tables = { profiles: [{ id: U(1), trial_status: trialStatus, plan: 'free' }], ads_v2_orders: orders }
  const from = (table) => {
    const st = { filters: [], limit: Infinity }
    const rows = () => (tables[table] ?? []).filter((r) => st.filters.every((f) => f(r))).slice(0, st.limit)
    const b = {
      select() { return b },
      eq(c, v) { st.filters.push((r) => r[c] === v); return b },
      like(c, v) { const pre = String(v).replace(/%$/, ''); st.filters.push((r) => typeof r[c] === 'string' && r[c].startsWith(pre)); return b },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return b },
      limit(n) { st.limit = n; return b },
      maybeSingle() { return Promise.resolve(table === 'profiles' && profileError ? { data: null, error: { code: 'x' } } : { data: rows()[0] ?? null, error: null }) },
      then(res, rej) { return Promise.resolve({ data: rows(), error: null }).then(res, rej) },
    }
    return b
  }
  return { from, auth: { admin: { getUserById: async () => (authError ? { data: null, error: { message: 'x' } } : { data: { user: { email } }, error: null }) } } }
}
const acesso = (db, over = {}) => carregar(over, { '@/lib/userFootage': { footageAdminClient: () => db }, '@/lib/partnerAccess': { isActivePartner: async () => false } }, { NEXT_PUBLIC_ADS_PASS_LIVE: '1' })(F.access)
const provaAmostra = async (over = {}) => {
  const open = (o) => { const db = fakeDb(o); return acesso(db, over).adsSampleOpen(db, U(1), 'none') }
  const livre = await open({})
  const usada = await open({ orders: [{ id: U(2), user_id: U(1), billing_ref: `adssample-${U(2)}-${U(3)}`, status: 'delivered' }] })
  const rodando = await open({ orders: [{ id: U(2), user_id: U(1), billing_ref: `adssample-${U(2)}-${U(3)}`, status: 'generating' }] })
  const falhou = await open({ orders: [{ id: U(2), user_id: U(1), billing_ref: `adssample-${U(2)}-${U(3)}`, status: 'failed' }] })
  const descartavel = await open({ email: 'farm123@mailinator.com' })
  const barrada = await open({ trialStatus: 'blocked' })
  const regiao = await open({ trialStatus: 'region_paid_only' })
  const semAuth = await open({ authError: true })
  const semPerfil = await open({ profileError: true })
  const pagante = await (async () => { const db = fakeDb({}); return acesso(db, over).adsSampleOpen(db, U(1), 'subscriber') })()
  return livre === true && usada === false && rodando === false && falhou === true && descartavel === false && barrada === false && regiao === false && semAuth === false && semPerfil === false && pagante === false
}
const provaHero = (over = {}) => {
  const L = carregar(over, { '@/lib/userFootage': { footageAdminClient: () => null }, '@/lib/ads/v2ProductLockServer': { adsV2CutoutFor: async () => { throw new Error('offline') } } })
  const srv = L(F.srv), png = L(F.png)
  // um "frasco" vermelho de 60×140 com borda semitransparente
  const W = 60, Hh = 140, data = new Uint8Array(W * Hh * 4)
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; const edge = x === 0 || y === 0 || x === W - 1 || y === Hh - 1; data[o] = 200; data[o + 1] = 30 + (y % 7); data[o + 2] = 40; data[o + 3] = edge ? 128 : 255 }
  const cut = { width: W, height: Hh, data }
  const hero = srv.adsV2CloseRealHeroRgba(cut, 270, 480)
  const r = hero.rect
  const piece = png.resampleRgba(cut, r.w, r.h)
  let same = 0, total = 0
  for (let y = 1; y < r.h - 1; y++) for (let x = 1; x < r.w - 1; x++) { const p = (y * r.w + x) * 4; if (piece.data[p + 3] !== 255) continue; total++; const o = ((r.y + y) * 270 + (r.x + x)) * 4; if (hero.img.data[o] === piece.data[p] && hero.img.data[o + 1] === piece.data[p + 1] && hero.img.data[o + 2] === piece.data[p + 2]) same++ }
  const top = hero.img.data.slice(0, 4)
  const B = L(F.cr).ADS_V2_CLOSE_REAL_PRODUCT_BOX
  return total > 100 && same === total && r.y + r.h <= Math.round(B.y1 * 480) + 1 && r.y >= Math.floor(B.y0 * 480) - 1 && top[0] > top[1] && top[0] > top[2] && hero.palette.top[0] > hero.palette.top[1]
}

// ═══ Z. zero IA sobre o produto ═══════════════════════════════════════════════════════════════════════════════════════
console.log('\nZ. zero IA de vídeo/imagem sobre o produto')
await check('Z1 todo plano vira a FOTO REAL parada (kind text, client_photo, sem prompt/estilo/pessoa/cena): routeShot null em toda tentativa, US$ 0 de vídeo e de imagem; a montagem só tem imagem/forma/texto/áudio e só as fotos do cliente, o gancho, o cartão, a voz e a música', () => provaZeroIa())
await check('Z2 o servidor do formato só chama o RECORTE (adsV2CutoutFor da trava = fal-ai/birefnet/v2) e cola o produto INTOCADO (cada pixel opaco = o recorte só redimensionado) sobre o fundo na cor da embalagem', () => provaHero() &&
  /import \{ adsV2CutoutFor \} from '@\/lib\/ads\/v2ProductLockServer'/.test(SRC.srv) && !/nano-banana|kling|seedance|pixverse|minimax\/h3|submitShot|submitScene|fal\.subscribe|from '@fal-ai/i.test(SRC.srv) &&
  !/^import (?!type)(?!\{ ADS_V2_FRAME_RATE)/m.test(SRC.cr.split('\n').filter((l) => l.startsWith('import ')).join('\n')) &&
  !/\bfal\b|fetch\(|subscribe\(/.test(SRC.cr.split('\n').filter((l) => !/^\s*(\*|\/\*)/.test(l)).map((l) => l.replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``').replace(/\/\/.*$/, '')).join('\n')))
await check('Z3 o /plan, no Close real, tira apresentador, estilo e formato do corpo ANTES de qualquer decisão e troca os planos pelas fotos reais; o plano grava a marca closeReal e tira o produto na mão', () =>
  SRC.plan.includes("if (closeRealAsked) { delete input.presenter; delete input.presenter_id; delete input.style; delete input.format } // KINEO-CLOSE-REAL-1910") &&
  SRC.plan.indexOf('if (closeRealAsked) { delete input.presenter') < SRC.plan.indexOf('const presenterAsked = ADS_V2_PRESENTER_PUBLIC && input.presenter === true') &&
  SRC.plan.includes('if (closeReal) plan.shots = adsV2CloseRealShots(plan.shots, photos)') && SRC.plan.includes("if (closeReal) { Object.assign(stored, { closeReal }); delete (stored as { productInHand?: unknown }).productInHand }") &&
  SRC.plan.indexOf('if (closeReal) plan.shots = adsV2CloseRealShots') < SRC.plan.indexOf('const promptIssues = checkV2Prompts('))
await check('Z4 o avanço monta o Close real com a montagem própria (nunca o encaixe/ressíntese de sempre) e o gancho do servidor por import dinâmico (falhou = a foto real)', () =>
  SRC.advance.includes("const crServer = await import('@/lib/ads/v2CloseRealServer').catch(() => null)") && SRC.advance.includes('if (!presenterSource && !closeRealSource) {') && SRC.advance.includes('if (voiceSeconds && !presenterSource && !closeRealSource) {') &&
  SRC.advance.includes('source = closeRealSource ?? presenterSource ?? buildAdV2Source({') && SRC.advance.includes("heroUrl: hero?.url ?? null, heroFallbackUrl: closeRealPlan.product?.url ?? closeRealPlan.photos[0]"))

// ═══ E. estrutura de 15 s ════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. estrutura de 15 s')
await check('E1 15 s cravados: gancho 0–3 s (o produto recortado, sem fade de entrada, frase já no quadro 0), 3 planos das fotos reais a partir de 3 s com Ken Burns (o padrão do Kineo 1) e punch-in no meio, cartão 12,5–15 s; voz longa estica (≤ 4,5 s por plano) e voz que não cabe recusa', () => provaEstrutura())
await check('E2 o Ken Burns é ESPELHO do Kineo 1 em produção (FAST_KEN_BURNS_PATTERN, lib/compose.ts)', () => {
  const m = SRC.compose.match(/const FAST_KEN_BURNS_PATTERN = \[([\s\S]*?)\n\]/)
  const kb = CR().ADS_V2_CLOSE_REAL_KEN_BURNS
  return !!m && kb.length === 4 && kb.every((k) => m[1].includes(`{ from: '${k.from}', to: '${k.to}', xAnchor: '${k.xAnchor}' }`))
})
await check('E3 só 15 s e só 9:16: o /plan recusa outra duração (close_real_15s_only) e a montagem é sempre vertical', () =>
  SRC.plan.includes("if (closeRealAsked && order.seconds !== ADS_V2_CLOSE_REAL_SECONDS) return v2Fail('close_real_15s_only', 400)") && CR().ADS_V2_CLOSE_REAL_SECONDS === 15 && SRC.advance.includes("const crFrame = renderOutputSpecFor('9:16')"))

// ═══ F. frases na zona segura ════════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. frases na zona segura do Meta')
await check('F1 toda frase (curta, longa, palavra enorme; 720 e 1080 de largura) fica entre 14% e 65% da altura e acima do produto do gancho; presa pela base, centrada; frase repetida e "perfume Perfume" saem', () => provaZonaSegura())

// ═══ V. voz e música ═════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. voz por língua e música com ducking')
await check('V1 a voz do Close real é a voz por língua do apresentador v2 (PT-BR = Portuguese_ConfidentWoman, speech-2.8-hd), com a de sempre como reserva', () => {
  const pv = carregar()(F.pv2)
  const pt = pv.adsV2PresenterV2VoiceFor('pt', 'woman')
  return pt.engine === 'minimax' && pt.voiceId === 'Portuguese_ConfidentWoman' && pt.model === 'fal-ai/minimax/speech-2.8-hd' &&
    SRC.advance.includes("const cv = lib ? lib.adsV2PresenterV2VoiceFor(narrationLanguage(order.language) ?? 'en', 'woman') : null") && SRC.advance.includes('return synthesizeTtsFallback(text, ctx) // KINEO-CLOSE-REAL-1910')
})
await check('V2 música com ducking: 25% sob a voz, 70% logo depois dela; voz a partir de 0,3 s', () => {
  const cr = CR()
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const mus = src.elements.filter((e) => e.type === 'audio' && e.source === BUILD.musicUrl)
  const voz = src.elements.find((e) => e.type === 'audio' && e.source === BUILD.voiceUrl)
  return mus.length === 2 && mus[0].volume === '25%' && mus[1].volume === '70%' && near(mus[1].time, r3(0.3 + 9.2 + 0.2)) && voz.time === 0.3 && voz.volume === '100%'
})

// ═══ A. a amostra grátis ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. amostra grátis: 1 por conta, só no Close real, com marca-d\'água, sem farm')
await check('A1 EXECUTADO: 1 por conta (começada ou entregue conta; a que falhou não), assinante nunca entra por ela; e-mail descartável, trial barrado (digital/região), auth ou perfil ilegível = sem amostra (falha fechada)', () => provaAmostra())
await check('A2 só no Close real: o /plan FORÇA o formato na amostra (não confia no corpo) e o /start recusa amostra sem a marca (sample_level_only)', () =>
  SRC.plan.includes("const closeRealAsked = ADS_V2_CLOSE_REAL_LIVE && (input.close_real === true || (gate !== 'ok' && sample))") &&
  SRC.start.includes("if (sampleRun && !adsV2CloseRealOf(plan)) return v2Fail('sample_level_only', 403)") &&
  SRC.start.indexOf("if (sampleRun && !adsV2CloseRealOf(plan))") < SRC.start.indexOf('const lock = await admin') && SRC.sample.includes("export const ADS_SAMPLE_FORMAT = 'close_real'"))
await check('A3 com marca-d\'água: a montagem da amostra (chave adssample-) leva o texto "usekineo.com" no anúncio inteiro; o pago não', () => provaMarcaDagua() &&
  SRC.advance.includes('watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null'))
await check('A4 o evento da amostra registra o formato (ads_sample_started com format close_real e watermark) e a montagem grava ads_v2_close_real_assembled (fato do servidor nas 2 listas)', () =>
  SRC.start.includes("credits_list: cost, format: 'close_real', watermark: true } })") && SRC.advance.includes("name: 'ads_v2_close_real_assembled'") &&
  (SRC.events.match(/'ads_v2_close_real_assembled'/g) || []).length === 2 && SRC.evroute.includes("'ads_v2_close_real_assembled'"))
await check('A5 o caminho pago intocado: o teto do dia, a chave sem débito e o nível da amostra são os de antes; o antifarm mora DENTRO do adsSampleOpen (todas as portas)', () =>
  SRC.access.includes('if (!(await adsSampleAccountOk(admin, userId))) return false') && SRC.access.indexOf('adsSampleAccountOk(admin, userId)') < SRC.access.indexOf(".like('billing_ref', `${ADS_SAMPLE_PREFIX}%`)") &&
  /export const ADS_SAMPLE_DAILY_CAP = 10\n/.test(SRC.sample) && SRC.sample.includes("export const ADS_SAMPLE_TIER: AdsV2Tier = 'commercial'") && SRC.start.includes("credits_charged: sampleRun ? 0 : cost"))

// ═══ T. o teste vê a amostra ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. quem está no teste vê "faça seu 1º anúncio grátis", não o acesso negado')
await check('T1 a porta do /ads/v2 abre para a amostra sem rastro de negação (só quem não tem amostra vai para /ads?from=v2); a porta /ads oferece o Close real grátis; a tela fala do Close real nas 16 línguas', () => {
  const S = carregar()(F.sample)
  const langs = Object.keys(S.ADS_SAMPLE_COPY)
  return SRC.page.includes("const sample = gate === 'no_access' && (await adsSampleOpen(admin, uid, reason))") && /if \(!sample\) \{\n\s+await writeServerEvent\(\{ name: 'ads_access_denied'/.test(SRC.page) &&
    SRC.door.includes('One ad per account in the Real product close-up format') && langs.length === 16 && langs.every((l) => typeof S.ADS_SAMPLE_COPY[l].closeReal === 'string' && S.ADS_SAMPLE_COPY[l].closeReal.length > 40 && S.ADS_SAMPLE_COPY[l].closeReal !== S.ADS_SAMPLE_COPY[l].note) &&
    SRC.simple.includes("note: adsSampleCopy(lang).closeReal } : adsSampleCopy(lang)) : null") && SRC.client.includes("note: adsSampleCopy('en').closeReal } : adsSampleCopy('en')) : null")
})

// ═══ P. padrões da tela ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. os formatos padrão da tela')
await check('P1 padrão = Apresentador e Close real (amostra: só o Close real); o caminho antigo fica como "Avançado"', () => provaPadroes())
await check('P2 a tela: estilo de IA só no Avançado (fileira, "Ver todos", a escolha completa e o interruptor do ator); o formato Apresentador liga o ator; o Close real vai ao /plan como close_real e só em 9:16; sem as 3 variações', () =>
  SRC.simple.includes("const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && advancedOn && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none'") &&
  SRC.simple.includes("const presenterOn = ADS_V2_PRESENTER_PUBLIC && (advancedOn ? presenterChoice : adFormat === 'presenter') && presenterWhy === null") &&
  SRC.simple.includes("...(closeRealOn ? { close_real: true } : {}) }, // KINEO-ADS-MELHORIAS-1410") && SRC.simple.includes("const format: AdsV2Format = closeRealOn || adsV2FormatBlock(") &&
  (SRC.simple.match(/\{ADS_V2_STYLES_PUBLIC && advancedOn \? \(/g) || []).length === 3 && SRC.simple.includes('{ADS_V2_PRESENTER_PUBLIC && advancedOn ? (') &&
  SRC.simple.includes('<AdsAdFormatPicker value={adFormat}') && SRC.simple.includes("three={variations && !closeRealOn ?") &&
  SRC.contract.includes("if (b.close_real !== true) return fail('bad_close_real')"))
await check('P3 sem tela nova: o seletor reusa o cartão de formato que já existe (.adv2s-format), no passo 3 da MESMA tela', () =>
  SRC.simple.includes('<fieldset className="adv2s-format adv2-fmt2" data-kineo="ads-ad-format"') && !existsSync(join(ROOT, 'app/(dashboard)/ads/v2/close')) && CLOSE_REAL_1910_NOVOS.every((f) => !f.startsWith('app/')))

// ═══ D. desfaz, novos, marca, encadeamento ═══════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_1910_ARQUIVOS.length > 10 && CLOSE_REAL_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseReal1910(rd(f), f)) === b }) &&
  CLOSE_REAL_1910_NOVOS.length >= 3 && CLOSE_REAL_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira); nada de cobrança, preço ou motor de vídeo no diff (v2Tiers, v2Billing, v2Engines, v2Shots, v2Images, compose)', () => {
  const trocas = Object.values(TROCAS_CLOSE_REAL_1910).flat()
  const tocados = git('diff', '--name-only', CLOSE_REAL_1910_BASE, 'HEAD').trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  tocados.splice(0, tocados.length, ...tocados.filter((f) => { try { return lf(git('show', `${CLOSE_REAL_1910_BASE}:${f}`)) !== lf(semAdsQualidade2110(readFileSync(join(ROOT, f), 'utf8'), f)) } catch { return true } })) // KINEO-ADS-QUALIDADE-2110 — reancorado: arquivo cuja mudança desde a base é SÓ a camada da qualidade (21/10, desfaz próprio) não conta
  return trocas.length > 0 && trocas.every(([nova]) => nova.includes(MARCA)) && ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2Engines.ts', 'lib/ads/v2Shots.ts', 'lib/ads/v2Images.ts', 'lib/compose.ts', 'lib/ads/adV2Montage.ts', 'lib/credits/engineCost.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: os guardiões byte a byte tiram esta camada PRIMEIRO (semCloseReal1910 colado no readFileSync); texto sem a marca e arquivo fora da lista passam igual', () => {
  const reanc = ['scripts/test-ads-amostra-2026-10-09.mjs', 'scripts/test-ads-fiel-liga-1510.mjs', 'scripts/test-apresentador-v2-ajuste-3-1710.mjs', 'scripts/test-filme-rapido-1710.mjs', 'scripts/test-support/shopify-extracao-v2-1310.mjs']
  return reanc.every((f) => /semCloseReal1910\((?:fs\.)?readFileSync\(/.test(rd(f))) && semCloseReal1910('sem marca\nnada', 'lib/x.ts') === 'sem marca\nnada' && semCloseReal1910(null, 'x') === null
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 gancho de 5 s → a estrutura de 15 s fica vermelha', () => provaEstrutura({ [F.cr]: trocar(SRC.cr, 'export const ADS_V2_CLOSE_REAL_HOOK_SECONDS = 3', 'export const ADS_V2_CLOSE_REAL_HOOK_SECONDS = 5') }))
await mut('M2 frase no topo da tela (acima dos 14%) → a zona segura fica vermelha', () => provaZonaSegura({ [F.cr]: trocar(SRC.cr, 'const top = ADS_V2_SAFE_TOP + ADS_V2_CLOSE_REAL_TEXT_GAP', 'const top = ADS_V2_SAFE_TOP - 0.1') }))
await mut('M3 o plano mantém o tipo original (vai à IA) → zero IA fica vermelho', () => provaZeroIa({ [F.cr]: trocar(SRC.cr, "const out = { ...s, kind: 'text', source: 'client_photo',", "const out = { ...s, source: 'client_photo',") }))
await mut('M4 o gancho vira VÍDEO gerado → zero IA fica vermelho', () => provaZeroIa({ [F.cr]: trocar(SRC.cr, "elements.push({ type: 'image', track: T.shotA, time: 0, duration: hookDur,", "elements.push({ type: 'video', track: T.shotA, time: 0, duration: hookDur,") }))
await mut('M5 a marca-d\'água some → a amostra fica vermelha', () => provaMarcaDagua({ [F.cr]: trocar(SRC.cr, "const wm = typeof input.watermark === 'string' ? input.watermark.trim() : ''", "const wm = ''") }))
await mut('M6 o antifarm deixa o e-mail descartável passar → a amostra fica vermelha', () => provaAmostra({ [F.access]: trocar(SRC.access, '    return !isDisposableEmail(email) // KINEO-CLOSE-REAL-1910', '    return true // KINEO-CLOSE-REAL-1910') }))
await mut('M7 o antifarm ignora o trial barrado → a amostra fica vermelha', () => provaAmostra({ [F.sample]: trocar(SRC.sample, "export const ADS_SAMPLE_BLOCKED_TRIAL_STATUS: readonly string[] = ['blocked', 'region_paid_only']", 'export const ADS_SAMPLE_BLOCKED_TRIAL_STATUS: readonly string[] = []') }))
await mut('M8 a amostra deixa de contar a amostra entregue (2ª por conta) → a amostra fica vermelha', () => provaAmostra({ [F.access]: trocar(SRC.access, "      .in('status', ['generating', 'assembling', 'delivered'])\n      .limit(1)\n    if (error) return false", "      .in('status', ['failed'])\n      .limit(1)\n    if (error) return false") }))
await mut('M9 a amostra abre no Apresentador → os padrões ficam vermelhos', () => provaPadroes({ [F.cr]: trocar(SRC.cr, "  if (i.sample) return 'close_real'\n  return i.presenterPublic", "  if (i.sample) return 'presenter'\n  return i.presenterPublic") }))
await mut('M10 sem tirar a palavra repetida ("perfume Perfume") → a zona segura/frases fica vermelha', () => provaZonaSegura({ [F.cr]: trocar(SRC.cr, 'if (prev && prev.toLocaleLowerCase() === w.toLocaleLowerCase()) { kept[kept.length - 1] = w; continue }', '') }))
await mut('M11 o gancho redesenha o produto (o recorte entra com a cor trocada) → o "pixel a pixel" fica vermelho', () => provaHero({ [F.srv]: trocar(SRC.srv, '  pasteOver(img, resampleRgba(cut, rect.w, rect.h), rect.x, rect.y)', '  const pc = resampleRgba(cut, rect.w, rect.h); for (let i = 0; i < pc.data.length; i += 4) pc.data[i] = 255 - pc.data[i]; pasteOver(img, pc, rect.x, rect.y)') }))
await mut('M12 o cartão final começa antes (sem os 3 planos inteiros) → a estrutura fica vermelha', () => provaEstrutura({ [F.cr]: trocar(SRC.cr, 'export const ADS_V2_CLOSE_REAL_PHOTO_SHOTS = 3', 'export const ADS_V2_CLOSE_REAL_PHOTO_SHOTS = 2') }))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
