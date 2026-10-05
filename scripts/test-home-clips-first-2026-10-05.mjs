// KINEO-HOME-CLIPS-FIRST-2026-10-05 — guardião do A/B da home "clips-first" (sessão CEO em nome do fundador, 04/10:
// produto 1 = CLIPES na porta de entrada, produto 2 = FILME NARRADO no cartão de baixo).
// Prova, EXECUTANDO lib/growth/homeClipsFirst.ts (módulo puro, transpilado isolado):
//   (1) atribuição determinística (mesmo id → mesma variante, sempre; sal muda o sorteio);
//   (2) ~50/50 em 10.000 ids aleatórios E em 10.000 ids sequenciais (o hash espalha ids parecidos);
//   (3) 'off' = ninguém (nem variante, nem evento, nem cookie); 'all' = toda pessoa; robô = control em qualquer modo;
//   (4) user_id manda sobre o kineo_vid; sem id em 'ab50' = control sem evento; cookie adulterado = sem id;
//   (5) o middleware só cria o kineo_vid na home, GET, gente, interruptor ligado e sem cookie válido;
//   (6) a trava dos clipes (home ligada com /clips ou efeitos fechados = 'off'), e o guardião FALHA se alguém ligar a
//       home sem abrir os dois (interruptor que "não faz nada" em silêncio);
//   (7) contrato dos links: logado → /clips?effect=<key>; deslogado → /signup?redirect=<…> que o normalizador do
//       cadastro (lib/authRedirect.ts, executado) devolve igual; "Upload a photo" e o botão do filme idem;
//   (8) a home atual intacta com 'off': troca num único ponto do app/page.tsx, sinal só com expose, a KineoLanding
//       recebe só o booleano clipsFirst (reancorado 05/10: a variante virou a mesma home com Clipes no topo),
//       lib/engineWall.ts sem nenhuma referência à variante, homepage_view da home atual segue 'kineo_landing_v3';
//   (9) evento de servidor: home_variant_exposed em SERVER_ONLY_EVENTS; a rota recalcula a variante (corpo não escolhe);
//  (10) a variante: preço de cada efeito = clipCreditCost(engine, seconds) EXECUTADO; prévia real só onde o catálogo tem
//       (arquivo existe em public/), placeholder marcado onde preview=null; filmes da casa com mídia em public/;
//  (11) mutantes (cada regra quebrada é pega).
// Estilo readFileSync + transpile (molde scripts/test-espacos-2026-09-30.mjs).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
// Reancorado 05/10 (CLIP-EFEITOS): lib/clips/clipEffects.ts passou a importar ./clipCatalog e ./clipPricing (puros).
// O carregador resolve SÓ imports relativos ('./x' → arquivo .ts vizinho, recursivo); qualquer outro import continua erro.
function load(src, dir = 'lib/growth') {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = (p) => {
    if (!p.startsWith('./')) throw new Error('import inesperado: ' + p)
    const rel = path.posix.join(dir, p.slice(2) + '.ts')
    return load(read(rel), path.posix.dirname(rel))
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

const LIB = 'lib/growth/homeClipsFirst.ts'
const SRC = read(LIB)
const M = load(SRC)

const HUMANS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0 (iPhone14,5; iOS 17_5; pt_BR)',
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29',
  'Mozilla/5.0 (Linux; Android 9; CUBOT X20 PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6 musical_ly_2023',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
]
const BOTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Twitterbot/1.0',
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Chrome-Lighthouse',
  'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
  'WhatsApp/2.23.20.0 A',
  'curl/8.4.0',
  'python-requests/2.31.0',
  '',
]
const HUMAN = HUMANS[0]
const uuids = (n, seed = 'x') => Array.from({ length: n }, () => crypto.randomUUID())
const seq = (n) => Array.from({ length: n }, (_, i) => `visitor-${String(i).padStart(12, '0')}`)
const share = (Mx, ids, mode = 'ab50') => ids.filter((id) => Mx.assignHomeVariant({ mode, visitorId: id, userAgent: HUMAN }).variant === 'clips_first').length / ids.length

function problems(Mx) {
  const p = []
  const U = '0b5f0c7e-9d1a-4c62-8a57-3a1c2e9f4d10'
  const V = '7e1d2c3b-4a59-4f68-9e7d-1c2b3a4d5e6f'
  // (1) determinismo
  try {
    const a = Mx.assignHomeVariant({ mode: 'ab50', visitorId: V, userAgent: HUMAN }).variant
    for (let i = 0; i < 50; i++) if (Mx.assignHomeVariant({ mode: 'ab50', visitorId: V, userAgent: HUMANS[i % HUMANS.length] }).variant !== a) { p.push('mesma pessoa mudou de variante'); break }
    const ids = uuids(500)
    const first = ids.map((id) => Mx.homeBucket(id))
    if (ids.some((id, i) => Mx.homeBucket(id) !== first[i])) p.push('balde não é determinístico')
    if (first.some((b) => !(Number.isInteger(b) && b >= 0 && b < Mx.HOME_BUCKETS))) p.push('balde fora de 0..9999')
    const resalted = ids.filter((id) => Mx.homeBucket(id, 'outro_experimento') !== Mx.homeBucket(id)).length
    if (resalted < 450) p.push('o sal não muda o sorteio (experimentos ficariam correlacionados)')
  } catch (e) { p.push('atribuição lançou: ' + e.message) }
  // (2) ~50/50
  try {
    const r = share(Mx, uuids(10000))
    if (!(r > 0.48 && r < 0.52)) p.push(`UUIDs: ${(r * 100).toFixed(2)}% em clips_first (esperado 48–52%)`)
    const s = share(Mx, seq(10000))
    if (!(s > 0.48 && s < 0.52)) p.push(`ids sequenciais: ${(s * 100).toFixed(2)}% em clips_first (esperado 48–52%)`)
    const users = uuids(10000).filter((id) => Mx.assignHomeVariant({ mode: 'ab50', userId: id, userAgent: HUMAN }).variant === 'clips_first').length / 10000
    if (!(users > 0.48 && users < 0.52)) p.push(`user_ids: ${(users * 100).toFixed(2)}% em clips_first`)
  } catch (e) { p.push('50/50 lançou: ' + e.message) }
  // (3) off / all / robô
  try {
    const ids = uuids(2000)
    const offAny = ids.some((id, i) => {
      const a = Mx.assignHomeVariant({ mode: 'off', userId: i % 2 ? id : null, visitorId: id, userAgent: HUMANS[i % HUMANS.length] })
      return a.variant !== 'control' || a.expose !== false
    })
    if (offAny) p.push("'off' mudou alguém de variante ou gravou evento")
    if (Mx.assignHomeVariant({ mode: 'off', visitorId: V, userAgent: HUMAN }).reason !== 'off') p.push("'off' sem reason 'off'")
    const allMiss = ids.some((id, i) => {
      const a = Mx.assignHomeVariant({ mode: 'all', visitorId: id, userAgent: HUMANS[i % HUMANS.length] })
      return a.variant !== 'clips_first' || a.expose !== true
    })
    if (allMiss) p.push("'all' deixou gente de fora")
    if (Mx.assignHomeVariant({ mode: 'all', userAgent: HUMAN }).variant !== 'clips_first') p.push("'all' sem cookie não mostra a variante")
    for (const mode of ['ab50', 'all', 'off']) {
      for (const ua of BOTS) {
        for (const id of ids.slice(0, 40)) {
          const a = Mx.assignHomeVariant({ mode, userId: id, visitorId: id, userAgent: ua })
          if (a.variant !== 'control' || a.expose) { p.push(`robô viu a variante/gerou evento (${mode}): ${ua.slice(0, 40) || '(UA vazio)'}`); break }
        }
      }
    }
    for (const ua of HUMANS) if (Mx.isBotUserAgent(ua)) p.push('gente classificada como robô: ' + ua.slice(0, 70))
    for (const ua of BOTS) if (!Mx.isBotUserAgent(ua)) p.push('robô classificado como gente: ' + (ua.slice(0, 60) || '(UA vazio)'))
  } catch (e) { p.push('off/all/robô lançou: ' + e.message) }
  // (4) precedência e ids
  try {
    let diff = null
    for (const id of uuids(200)) {
      if (Mx.homeBucket(id) < Mx.HOME_CLIPS_FIRST_SHARE !== Mx.homeBucket(U) < Mx.HOME_CLIPS_FIRST_SHARE) { diff = id; break }
    }
    const a = Mx.assignHomeVariant({ mode: 'ab50', userId: U, visitorId: diff, userAgent: HUMAN })
    const onlyUser = Mx.assignHomeVariant({ mode: 'ab50', userId: U, userAgent: HUMAN })
    if (a.assignment !== 'user' || a.assignmentId !== U || a.variant !== onlyUser.variant) p.push('logado não foi sorteado pelo user_id')
    const v = Mx.assignHomeVariant({ mode: 'ab50', visitorId: V, userAgent: HUMAN })
    if (v.assignment !== 'visitor' || v.assignmentId !== V || v.expose !== true) p.push('visitante não foi sorteado pelo kineo_vid')
    const none = Mx.assignHomeVariant({ mode: 'ab50', userAgent: HUMAN })
    if (none.variant !== 'control' || none.expose || none.reason !== 'no_id') p.push("'ab50' sem id não caiu na home atual sem evento")
    for (const bad of ['x', '<script>', 'a'.repeat(80), ' ', '../../etc', 123, null, undefined, '-starts-with-dash-xxxxxxxx'])
      if (Mx.normalizeHomeVisitorId(bad) !== null) { p.push('id adulterado aceito: ' + String(bad).slice(0, 20)); break }
    if (Mx.normalizeHomeVisitorId(crypto.randomUUID()) === null) p.push('UUID do middleware recusado')
  } catch (e) { p.push('precedência lançou: ' + e.message) }
  // (5) cookie do middleware
  try {
    const base = { pathname: '/', method: 'GET', userAgent: HUMAN, existing: null }
    if (Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'off' })) p.push("'off' cria cookie")
    if (!Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50' })) p.push("'ab50' não cria o kineo_vid na 1ª visita")
    if (!Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'all' })) p.push("'all' não cria o kineo_vid")
    if (Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50', existing: crypto.randomUUID() })) p.push('recria cookie válido (a pessoa trocaria de variante)')
    if (!Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50', existing: 'lixo' })) p.push('cookie adulterado não é substituído')
    if (Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50', pathname: '/pricing' })) p.push('cria cookie fora da home')
    if (Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50', method: 'POST' })) p.push('cria cookie em POST')
    if (Mx.shouldMintHomeVisitorCookie({ ...base, mode: 'ab50', userAgent: BOTS[0] })) p.push('robô ganha cookie')
  } catch (e) { p.push('cookie lançou: ' + e.message) }
  // (6) trava dos clipes
  try {
    const g = (c, e) => ({ clipsPublic: c, effectsPublic: e })
    if (Mx.effectiveHomeClipsFirstMode('ab50', g(true, true)) !== 'ab50') p.push('trava aberta não deixa ab50 passar')
    if (Mx.effectiveHomeClipsFirstMode('all', g(true, true)) !== 'all') p.push('trava aberta não deixa all passar')
    if (Mx.effectiveHomeClipsFirstMode('ab50', g(true, false)) !== 'off') p.push('home liga com efeitos fechados')
    if (Mx.effectiveHomeClipsFirstMode('all', g(false, true)) !== 'off') p.push('home liga com /clips fechado')
    if (Mx.effectiveHomeClipsFirstMode('off', g(true, true)) !== 'off') p.push("'off' virou outra coisa")
  } catch (e) { p.push('trava lançou: ' + e.message) }
  // (7) links (contrato com o /clips e o cadastro)
  try {
    const AR = load(read('lib/authRedirect.ts'))
    const key = 'bring_to_life'
    if (Mx.clipEffectEntryHref(key, true) !== '/clips?effect=bring_to_life') p.push('logado não vai a /clips?effect=<key>')
    const out = Mx.clipEffectEntryHref(key, false)
    const u = new URL(out, 'https://x.local')
    if (u.pathname !== '/signup' || u.searchParams.get('redirect') !== '/clips?effect=bring_to_life' || [...u.searchParams.keys()].length !== 1) p.push('deslogado não vai a /signup?redirect=/clips?effect=<key> (só esse parâmetro)')
    // codificado: um parâmetro a mais no /clips amanhã (&x=) não pode vazar para o /signup
    if (out !== '/signup?redirect=%2Fclips%3Feffect%3Dbring_to_life') p.push('redirect do cadastro sem encodeURIComponent')
    if (AR.normalizeInternalRedirect(u.searchParams.get('redirect')) !== '/clips?effect=bring_to_life') p.push('o cadastro não devolveria para o efeito')
    const up = new URL(Mx.clipUploadEntryHref(false), 'https://x.local')
    if (AR.normalizeInternalRedirect(up.searchParams.get('redirect')) !== '/clips?upload=1' || Mx.clipUploadEntryHref(true) !== '/clips?upload=1') p.push('"Upload a photo" fora do contrato /clips?upload=1')
    const fl = new URL(Mx.clipsFirstFilmHref(false), 'https://x.local')
    if (!/^\/studio\?intent_campaign=home_clips_first_film$/.test(AR.normalizeInternalRedirect(fl.searchParams.get('redirect')) ?? '') || Mx.clipsFirstFilmHref(true) !== '/studio?intent_campaign=home_clips_first_film') p.push('botão do filme não leva ao Studio com a campanha do A/B')
    if (Mx.homePreviewVariant('clips_first', false) !== null || Mx.homePreviewVariant('clips_first', true) !== 'clips_first' || Mx.homePreviewVariant('qualquer', true) !== null) p.push('prévia vale para conta de fora ou aceita valor qualquer')
    if (Mx.homeExposureSurface('post_signup') !== 'post_signup' || Mx.homeExposureSurface('<x>') !== 'home') p.push('superfície da exposição aceita valor livre')
    const k1 = Mx.homeExposureDedupeKey('2026-10-05', { variant: 'control', assignment: 'visitor' })
    if (k1 === Mx.homeExposureDedupeKey('2026-10-05', { variant: 'control', assignment: 'user' }) || k1 === Mx.homeExposureDedupeKey('2026-10-06', { variant: 'control', assignment: 'visitor' })) p.push('dedupe junta dia/atribuição diferentes (perderia a linha que liga o visitante à conta)')
  } catch (e) { p.push('links lançaram: ' + e.message) }
  return p
}

console.log('TESTE home clips-first (A/B) — 05/10')
// ── (0) módulo puro e interruptor
ok(!/^\s*import\s/m.test(SRC) && !/require\(/.test(SRC), '(0a) lib/growth/homeClipsFirst.ts é puro (zero import)')
ok(['off', 'ab50', 'all'].includes(M.HOME_CLIPS_FIRST), `(0b) HOME_CLIPS_FIRST é 'off' | 'ab50' | 'all' (agora: '${M.HOME_CLIPS_FIRST}')`)
ok(/export const HOME_CLIPS_FIRST: HomeClipsFirstMode = '(off|ab50|all)'/.test(SRC), '(0c) interruptor é const em código (não env)')
const effectsSrc = read('lib/clips/clipEffects.ts')
const launchSrc = read('lib/clips/clipLaunch.ts')
const effectsPublic = /export const CLIP_EFFECTS_PUBLIC = true\b/.test(effectsSrc)
const clipsPublic = /export const CLIPS_PUBLIC = true\b/.test(launchSrc)
const server = read('lib/growth/homeClipsFirstServer.ts')
ok(/clipsPublic: clipsVisible\(email\),/.test(server) && /effectsPublic: clipEffectsVisible\(internal\),/.test(server) && /const internal = isInternalEmail\(email\)/.test(server), '(6b) servidor trava POR PESSOA com a regra do /clips (clipsVisible + clipEffectsVisible(isInternalEmail))')
ok((server.match(/homeClipsFirstModeFor\(args\.email\)/g) || []).length === 2 && /resolveHomeVariant\(\{ userId, email \}\)/.test(read('app/api/home-variant/route.ts')) && /email,\n    previewParam/.test(read('app/page.tsx')), '(6c) home e rota de exposição passam o e-mail para a trava')
// executado: a trava com o catálogo REAL (clipEffectsVisible de lib/clips/clipEffects.ts)
{
  const EV = load(effectsSrc, 'lib/clips')
  const outsider = M.effectiveHomeClipsFirstMode('ab50', { clipsPublic: clipsPublic, effectsPublic: EV.clipEffectsVisible(false) })
  const house = M.effectiveHomeClipsFirstMode('ab50', { clipsPublic: true, effectsPublic: EV.clipEffectsVisible(true) })
  ok(house === 'ab50' && outsider === (effectsPublic && clipsPublic ? 'ab50' : 'off'), `(6d) com a home ligada: casa sorteada; visitante de fora ${effectsPublic ? 'sorteado (efeitos públicos)' : 'fica na home atual (CLIP_EFFECTS_PUBLIC=false)'}`)
  ok(EV.clipEffectsVisible(false, false) === false && EV.clipEffectsVisible(false, true) === true, '(6e) clipEffectsVisible: fora só vê com o interruptor público')
}
console.log(`       (dependência: CLIP_EFFECTS_PUBLIC=${effectsPublic} · CLIPS_PUBLIC=${clipsPublic} — com efeitos fechados só a casa vê a variante)`)

// ── (1)–(7) executados
const real = problems(M)
ok(real.length === 0, '(1–7) atribuição, 50/50, off/all/robô, precedência, cookie, trava e links' + (real.length ? ' → ' + real.join(' | ') : ''))
console.log(`       (amostra: ${(share(M, uuids(10000)) * 100).toFixed(2)}% de 10.000 UUIDs em clips_first)`)

// ── (8) home atual intacta com 'off'
// REANCORADO 05/10 (KINEO-HOME-CLIPES-EM-CIMA-2026-10-05) — fundador: a página separada da variante (ClipsFirstHome, com o
// bloco "Turn any photo into a video in one click" e menu reduzido) saiu do ar; o braço clips_first passou a ser a MESMA
// home (KineoLanding, menu completo) com a faixa de Clipes no topo e os filmes narrados logo embaixo. Contrato novo: um
// único sorteio no page.tsx, um booleano derivado SÓ de homeChoice.variant, e a KineoLanding recebe só esse booleano
// (padrão false = home de controle byte a byte no corpo), sem sorteio próprio.
const page = read('app/page.tsx')
ok((page.match(/resolveHomeVariant\(/g) || []).length === 1 && !/<ClipsFirstHome\b/.test(page) && (page.match(/clipsFirst=\{clipsFirst\}/g) || []).length === 1, '(8a) troca da home em UM ponto do app/page.tsx (um sorteio, um booleano para a KineoLanding)')
ok(/const clipsFirst = homeChoice\.variant === 'clips_first'\n/.test(page), '(8b) a variante só aparece com homeChoice.variant === clips_first')
ok(/const homeExposure = homeChoice\.expose \? \(/.test(page), '(8c) o sinal de exposição só monta com expose (nunca com off/robô/prévia)')
ok(/<KineoLanding\n        initialUser=\{user \? \{ id: user\.id \} : null\}\n        engineWall=\{engineWall\}\n        trending=\{trending\}\n        initialEmail=\{email\}\n        initialIsPro=\{isPro\}\n        resume=\{resume\}\n        initialAcquisitionSource=\{initialAcquisitionSource\}\n        showWelcomeGoalRouter=\{showWelcomeGoalRouter\}\n        clipsFirst=\{clipsFirst\}\n      \/>\n      \{homeExposure\}\n/.test(page), '(8d) a chamada da home segue com as mesmas props + o booleano clipsFirst (e o sinal nulo ao lado)')
ok(/\n      <FaqStructuredData \/>\n      <KineoLanding\n/.test(page) && !/if \(homeChoice\.variant === 'clips_first'\) \{/.test(page), '(8e) FAQPage nas duas variantes: a variante é a mesma home, com as 13 perguntas visíveis')
const landing = read('app/KineoLanding.tsx')
const wall = read('lib/engineWall.ts')
ok(!/ClipsFirst|homeClipsFirst|home_variant/.test(wall) && !/resolveHomeVariant|assignHomeVariant|homeClipsFirstServer|HOME_CLIPS_FIRST|home_variant/.test(landing) && /\n  clipsFirst = false,\n/.test(landing), '(8f) lib/engineWall.ts não sabe da variante; a KineoLanding só recebe o booleano (padrão false), sem sorteio próprio')
// O que o fundador pediu, preso aqui para ninguém desfazer sem querer:
// Reancorado 05/10 (2ª rodada, fundador): "a fileira de cards tem que vir em cima, com quatro… depois os clips, metade
// clips, metade narrated films: quatro clips, quatro narrated films… e daí já vai para Videos for business".
ok(/\n      <PromoCards cards=\{promoCardsFor\(\{ clips: clipsVisible\(initialEmail\) \}\)\} \/>\n      \{clipsFirst && <HomeClipsStrip signedIn=\{isSignedIn\} \/>\}\n\n      <header className="hero">/.test(landing), '(8j) a fileira de 4 cards abre a página nos dois braços; no clips_first a faixa de Clipes vem logo abaixo, antes dos filmes')
const strip = read('components/home/HomeClipsStrip.tsx')
const homeKeys = (strip.match(/export const HOME_CLIP_KEYS: readonly ClipEffectKey\[\] = \[([^\]]*)\]/)?.[1] ?? '').match(/'([a-z0-9_]+)'/g)?.map((k) => k.slice(1, -1)) ?? []
const fxAll = load(effectsSrc, 'lib/clips').CLIP_EFFECTS
ok(homeKeys.length === 4 && new Set(homeKeys).size === 4 && homeKeys.every((k) => fxAll.some((e) => e.key === k && e.preview && /^Made with this effect /.test(e.preview.note))) && homeKeys[0] === 'color_burst' && homeKeys.includes('product_360'), '(8k) metade de clipes = 4 efeitos do catálogo com prévia feita pelo próprio efeito (o fundador escolheu a explosão de cor e o tênis girando)')
// A grade dos filmes da home mora em app/kineoLandingTheme.ts (.featuredFour); a dos clipes tem de repetir altura e
// colunas — se alguém mexer numa metade, este check lembra de mexer na outra.
const theme = read('app/kineoLandingTheme.ts')
const filmRule = theme.match(/\.klp #samples \.\$\{gallery\.featuredFour\} \{ (--film-height:clamp\([^)]*\)); (grid-template-columns:repeat\(4,minmax\(0,1fr\)\)); height:var\(--film-height\); gap:(\d+px); \}/)
ok(Boolean(filmRule) && strip.includes(`${filmRule[1]};display:grid;${filmRule[2]};height:var(--film-height);gap:${filmRule[3]}`), '(8o) os 4 clipes usam a MESMA grade dos 4 filmes narrados (altura, 4 colunas e espaço iguais), para as duas metades baterem')
ok(/\n      \{clipsFirst && businessShowcase\}\n\n      \{\/\* Approved home layout/.test(landing) && /\n      \{!clipsFirst && businessShowcase\}\n/.test(landing) && landing.indexOf('{clipsFirst && businessShowcase}') > landing.indexOf('</header>'), '(8p) no clips_first, depois dos filmes vem direto "Videos for your business."; no controle a ordem é a de sempre')
ok(!/Turn any photo into a video/.test(strip) && !/Turn any photo into a video/.test(landing), '(8l) o bloco "Turn any photo into a video in one click" não volta para a home')
ok(landing.includes('href={clipsFirstFilmHref(isSignedIn)}') && landing.indexOf('href={clipsFirstFilmHref(isSignedIn)}') > landing.indexOf('<header className="hero">'), '(8m) o botão dos filmes narrados da variante leva a campanha que a SQL do A/B lê (home_clips_first_film)')
ok(/<PublicNavDropdown item="video" label="Video">/.test(landing) && ['/spaces', '/ads/new', '/claude-connector', '/pricing'].every((h) => landing.includes(`<Link href="${h}"`)) && !/data-nav-item="clips"/.test(landing), '(8n) menu do topo como era (Video · Images · Spaces · Ads · MCP · Pricing), sem item solto de Clipes')
const lvt = read('components/LandingViewTracker.tsx')
ok(/variant = 'kineo_landing_v3'/.test(lvt) && /<LandingViewTracker signedIn=\{Boolean\(initialUser\)\} \/>/.test(landing), "(8g) homepage_view da home atual continua 'kineo_landing_v3'")
const mw = read('middleware.ts')
ok(/shouldMintHomeVisitorCookie\(\{/.test(mw) && /if \(!mintedVisitorId\) return await updateSession\(request\)/.test(mw), '(8h) middleware: sem cookie novo, o caminho é o de sempre (updateSession puro)')
ok(/httpOnly: true/.test(mw) && /maxAge: HOME_VISITOR_COOKIE_MAX_AGE_SECONDS/.test(mw) && M.HOME_VISITOR_COOKIE === 'kineo_vid' && M.HOME_VISITOR_COOKIE_MAX_AGE_SECONDS === 180 * 86400, '(8i) kineo_vid first-party, httpOnly, 180 dias')

// ── (9) evento de servidor
const events = read('app/api/events/route.ts')
const setBody = events.slice(events.indexOf('const SERVER_ONLY_EVENTS = new Set(['), events.indexOf('])', events.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
ok(setBody.includes(`'${M.HOME_VARIANT_EXPOSED_EVENT}'`) && M.HOME_VARIANT_EXPOSED_EVENT === 'home_variant_exposed', '(9a) home_variant_exposed em SERVER_ONLY_EVENTS (navegador não cunha)')
const route = read('app/api/home-variant/route.ts')
ok(/writeServerEvent\(\{\n    name: HOME_VARIANT_EXPOSED_EVENT,/.test(route), '(9b) a rota grava via writeServerEvent')
ok(/const choice = resolveHomeVariant\(\{ userId, email \}\)/.test(route) && /variant: choice\.variant,/.test(route) && /assignment: choice\.assignment,/.test(route) && /mode: choice\.mode,/.test(route), '(9c) variante/atribuição/modo RECALCULADOS no servidor (o corpo não escolhe)')
ok(/if \(!choice\.expose\) return/.test(route) && /HOME_EXPOSURE_COOKIE\)\?\.value === dedupeKey/.test(route) && /httpOnly: true/.test(route), '(9d) robô/off/sem id não grava; dedupe por cookie httpOnly por dia')
ok(/sec-fetch-site/.test(route), '(9e) só a própria página chama a rota')
ok(/export function homeVariantStamp\(userId: string \| null, email\?: string \| null\)/.test(server) && /if \(HOME_CLIPS_FIRST === 'off'\) return \{\}/.test(server), '(9f) carimbo para os eventos do /clips existe e é vazio com off')

// ── (10) a variante
const cf = read('components/home/ClipsFirstHome.tsx')
ok(/credits: clipCreditCost\(effect\.engine, effect\.seconds\)/.test(cf), '(10a) preço do efeito = clipCreditCost(effect.engine, effect.seconds)')
ok(!/\b\d+\s*(credits|cr)\b/.test(cf.replace(/\/\/.*$/gm, '')), '(10b) nenhum preço digitado à mão na variante')
ok(/CLIP_EFFECTS\.map/.test(cf) && /clipEffectEntryHref\(effect\.key, signedIn\)/.test(cf) && /clipUploadEntryHref\(signedIn\)/.test(cf) && /Upload a photo/.test(cf), '(10c) galeria = catálogo inteiro, links do contrato, "Upload a photo" grande')
ok(/if \(!effect\.preview\)/.test(cf) && /Preview coming soon/.test(cf) && /className="tag soon"/.test(cf), '(10d) placeholder MARCADO onde preview=null')
ok(/<SignupConversionTracker \/>/.test(cf) && /<WelcomeOfferModal surface="home" \/>/.test(cf) && /variant=\{CLIPS_FIRST_LANDING_VARIANT\}/.test(cf), '(10e) mesmos rastreadores da home (Ads ?signup=1, welcome20, homepage_view com variante própria)')
ok(/ENGINE_PAGE_LEAD\.slice\(0, 1\)/.test(cf) && /FOUNDER_SHOWCASE\.slice\(0, 2\)/.test(cf) && /clipsFirstFilmHref\(signedIn\)/.test(cf), '(10f) produto 2: filmes da casa + botão para o Studio')
// execução: preço por efeito e mídia
const P = load(read('lib/clips/clipPricing.ts'), 'lib/clips')
const E = load(effectsSrc, 'lib/clips')
const prices = E.CLIP_EFFECTS.map((e) => P.clipCreditCost(e.engine, e.seconds))
ok(E.CLIP_EFFECTS.length >= 4 && prices.every((c) => Number.isInteger(c) && c >= P.CLIP_MIN_CREDITS), `(10g) preço executado de cada efeito: ${E.CLIP_EFFECTS.map((e, i) => `${e.key}=${prices[i]}`).join(' ')}`)
const missing = E.CLIP_EFFECTS.filter((e) => e.preview).flatMap((e) => [e.preview.video, e.preview.poster].filter(Boolean)).filter((u) => !exists('public' + u))
ok(missing.length === 0, '(10h) toda prévia do catálogo existe em public/' + (missing.length ? ' → falta ' + missing.join(', ') : ''))
const pubSrc = read('lib/publicExamples.ts')
const filmIds = [...(pubSrc.match(/ENGINE_PAGE_LEAD[\s\S]*?id: '([0-9a-f-]{36})'/) || []).slice(1, 2), ...[...pubSrc.slice(pubSrc.indexOf('export const FOUNDER_SHOWCASE')).matchAll(/id: '([0-9a-f-]{36})'/g)].slice(0, 2).map((m) => m[1])]
ok(filmIds.length === 3 && filmIds.every((id) => exists(`public/previews/ex-${id}.mp4`) && exists(`public/posters/ex-${id}.webp`)), '(10i) os 3 filmes da casa têm prévia e capa em public/')

// ── (11) mutantes
const mutants = [
  ['off ignorado', (s) => s.replace("if (mode !== 'ab50' && mode !== 'all') {\n    return { variant: 'control'", "if (false) {\n    return { variant: 'control'")],
  ['robô sorteado', (s) => s.replace('if (isBotUserAgent(input.userAgent)) {\n    return', 'if (false) {\n    return')],
  ['fatia 90%', (s) => s.replace('HOME_CLIPS_FIRST_SHARE = 5_000', 'HOME_CLIPS_FIRST_SHARE = 9_000')],
  ['hash aleatório', (s) => s.replace('return h >>> 0', 'return (Math.random() * 4294967296) >>> 0')],
  ['balde pelo bit baixo do FNV, sem finalizador', (s) => s.replace('h ^= h >>> 16\n  h = Math.imul(h, 0x85ebca6b)\n  h ^= h >>> 13\n  h = Math.imul(h, 0xc2b2ae35)\n  h ^= h >>> 16\n', '').replace('% HOME_BUCKETS', '% 2 * 5000')],
  ['visitante manda sobre user_id', (s) => s.replace('const assignmentId = userId ?? visitorId', 'const assignmentId = visitorId ?? userId').replace("const assignment: HomeAssignmentKind | null = userId ? 'user' : visitorId ? 'visitor' : null", "const assignment: HomeAssignmentKind | null = visitorId ? 'visitor' : userId ? 'user' : null")],
  ['sem id vira variante', (s) => s.replace("return { variant: 'control', assignment: null, assignmentId: null, mode, reason: 'no_id', expose: false }", "return { variant: 'clips_first', assignment: null, assignmentId: null, mode, reason: 'no_id', expose: true }")],
  ['cookie com off', (s) => s.replace("  const mode = input.mode ?? HOME_CLIPS_FIRST\n  if (mode !== 'ab50' && mode !== 'all') return false\n", '  const mode = input.mode ?? HOME_CLIPS_FIRST\n')],
  ['cookie recriado', (s) => s.replace('return normalizeHomeVisitorId(input.existing) === null', 'return true')],
  ['trava ignorada', (s) => s.replace('return gates.clipsPublic === true && gates.effectsPublic === true ? mode : \'off\'', 'return mode')],
  ['redirect sem encode', (s) => s.replace('return signedIn ? clips : `/signup?redirect=${encodeURIComponent(clips)}`\n}\n\nexport function clipUploadEntryHref', 'return signedIn ? clips : `/signup?redirect=${clips}`\n}\n\nexport function clipUploadEntryHref')],
  ['prévia para qualquer um', (s) => s.replace('if (!isInternal) return null', '')],
  ['dedupe sem atribuição', (s) => s.replace("return `${day}|${a.variant}|${a.assignment ?? 'none'}`", 'return `${day}|${a.variant}`')],
  ['Googlebot vira gente', (s) => s.replace('(?<!cu)bot\\b|(?<!cu)bot\\/|', '')],
  ['CUBOT vira robô', (s) => s.replace('(?<!cu)bot\\b|(?<!cu)bot\\/|', 'bot\\b|bot\\/|')],
]
for (const [name, mut] of mutants) {
  const src2 = mut(SRC)
  if (src2 === SRC) { ok(false, `mutante "${name}" não aplicou (âncora mudou?)`); continue }
  let caught
  try { caught = problems(load(src2)).length > 0 } catch { caught = true }
  ok(caught, `mutante pego: ${name}`)
}

// (11) carimbo do A/B nos eventos de efeito do /clips (contrato homeVariantStamp): escolha e upsell levam a variante;
// clip_effect_ready nasce no settle (rota de status OU cron, sem cookie) e liga à escolha pelo clip_id.
{
  const post = read('app/api/clips/route.ts')
  const up = read('app/api/clips/effect-upsell/route.ts')
  const stamp = /\.\.\.clipEffectEventMetadata\(effect, (result\.clip|row)\), \.\.\.homeVariantStamp\(user\.id, user\.email\), version: 'clip_effects_20261005' \}/
  ok(stamp.test(post) && /import \{ homeVariantStamp \} from '@\/lib\/growth\/homeClipsFirstServer'/.test(post), '(11a) clip_effect_chosen carimba a variante da home (user_id + e-mail + kineo_vid)')
  ok(stamp.test(up) && /import \{ homeVariantStamp \} from '@\/lib\/growth\/homeClipsFirstServer'/.test(up), '(11b) clip_effect_film_upsell_clicked carimba a variante da home')
  ok(/clip_id: clip\.id/.test(effectsSrc), '(11c) clip_effect_ready liga à escolha pelo clip_id (metadata comum)')
}
console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
