// KINEO-ATRIBUICAO-POUSO-2026-10-02 — guardião da atribuição de primeiro toque pela PÁGINA DE ENTRADA.
//
// O que ele prova, e como (readFileSync + typescript.transpileModule, módulos executados com mocks):
//   (a) a migration NOVA adiciona public.profiles.signup_landing_path (text, nullable, if not exists, com comentário);
//   (b) lib/analytics.ts: no primeiro toque o navegador guarda SÓ o pathname (sem query), cortado em 200, só se começar
//       com '/'; não sobrescreve; não grava quando o navegador já tinha origem de antes; o trackSignupSource manda o
//       campo; e a cópia da régua dentro de analytics (sem import, ver o comentário lá) bate com lib/landingPath.ts;
//   (c) app/api/track-signup-source: valida o caminho, cai no cookie, grava num UPDATE próprio filtrado por `is null`
//       (primeiro toque vence no banco) e, se a coluna ainda não existir, segue gravando o resto sem quebrar;
//   (d) lib/growth/publicCreationIntent.ts não crava mais utm_source=seo, e o placar orgânico continua reconhecendo
//       os links dessas páginas (medium organic sem source);
//   (M) mutantes: cada regra quebrada numa cópia do fonte tem de reprovar.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

function load(src, stubs = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = (p) => { if (p in stubs) return stubs[p]; throw new Error('import inesperado: ' + p) }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}
const tryLoad = (src, stubs) => { try { return load(src, stubs) } catch { return null } }

const SRC = {
  migration: (() => {
    const dir = path.join(ROOT, 'supabase', 'migrations')
    const f = fs.readdirSync(dir).find((n) => /^\d{14}_signup_landing_path\.sql$/.test(n))
    return f ? fs.readFileSync(path.join(dir, f), 'utf8') : ''
  })(),
  landing: read('lib/landingPath.ts'),
  analytics: read('lib/analytics.ts'),
  route: read('app/api/track-signup-source/route.ts'),
  intent: read('lib/growth/publicCreationIntent.ts'),
  truth: read('lib/growth/organicSignupTruth.ts'),
}

// ─── (a) migration ───────────────────────────────────────────────────────────
function migrationProblems(sql) {
  const p = []
  if (!sql) return ['migration supabase/migrations/<14 dígitos>_signup_landing_path.sql não existe']
  if (!/alter table public\.profiles\s+add column if not exists signup_landing_path text;/i.test(sql)) p.push('não adiciona signup_landing_path text com if not exists')
  if (/signup_landing_path text\s+(not null|default)/i.test(sql)) p.push('coluna não é nullable/sem default')
  if (!/comment on column public\.profiles\.signup_landing_path is/i.test(sql)) p.push('sem comentário na coluna')
  if (/\b(drop|delete|update)\b/i.test(sql.replace(/--.*$/gm, '').replace(/'[^']*'/g, ''))) p.push('migration faz mais do que adicionar')
  return p
}
const mp = migrationProblems(SRC.migration)
ok(mp.length === 0, `(a) migration nova: profiles.signup_landing_path text nullable, if not exists, comentada (${mp.join('; ') || 'ok'})`)

// ─── (b) régua do caminho + captura no navegador ─────────────────────────────
const CASES = [
  ['/free-ai-shorts/restaurants', '/free-ai-shorts/restaurants'],
  ['/vs/kineo-vs-x?utm_source=chatgpt&prompt=secret', '/vs/kineo-vs-x'],
  ['/scripts/space#top', '/scripts/space'],
  ['/', '/'],
  ['/go/AbCdEf0123456789_-xyz', '/go'],
  ['/go/AbCdEf0123456789/extra', '/go'],
  ['//evil.example/x', null],
  ['https://evil.example/x', null],
  ['relative/path', null],
  ['/a b', null],
  ['/a<script>', null],
  ['/a\\b', null],
  ['/caf%C3%A9', '/caf%C3%A9'],
  ['/' + 'x'.repeat(400), '/' + 'x'.repeat(199)],
  [42, null],
  [null, null],
]
function rulerProblems(fn, label) {
  if (typeof fn !== 'function') return [`${label}: régua ausente`]
  const p = []
  for (const [input, want] of CASES) {
    const got = fn(input)
    if (got !== want) p.push(`${label}(${JSON.stringify(input).slice(0, 40)}) = ${JSON.stringify(got)} (esperado ${JSON.stringify(want)})`)
  }
  return p
}
const landing = tryLoad(SRC.landing)
const rp = rulerProblems(landing?.sanitizeLandingPath, 'lib')
ok(rp.length === 0 && landing.LANDING_PATH_MAX === 200 && landing.LANDING_PATH_KEY === 'kineo_landing',
  `(b1) lib/landingPath: só pathname, até 200, começa com '/', alfabeto seguro, /go/<token> → /go (${rp.join('; ') || 'ok'})`)

/** A cópia da régua dentro de lib/analytics.ts, executada isolada. */
function analyticsRuler(analyticsSrc) {
  const start = analyticsSrc.indexOf('const LANDING_PATH_KEY')
  const end = analyticsSrc.indexOf('function readLandingCookie')
  if (start < 0 || end < 0) return null
  const m = tryLoad(analyticsSrc.slice(start, end) + '\nexport { sanitizeLandingPath, LANDING_PATH_KEY, LANDING_PATH_MAX }')
  return m
}
const copy = analyticsRuler(SRC.analytics)
const cp = rulerProblems(copy?.sanitizeLandingPath, 'analytics')
ok(cp.length === 0 && copy.LANDING_PATH_KEY === landing.LANDING_PATH_KEY && copy.LANDING_PATH_MAX === landing.LANDING_PATH_MAX,
  `(b2) a cópia em lib/analytics.ts (sem import novo) bate com lib/landingPath.ts (${cp.join('; ') || 'ok'})`)
ok(!/from '@\/lib\/landingPath'/.test(SRC.analytics), '(b3) lib/analytics.ts não ganhou import (15 guardiões o executam com a lista exata de imports)')

function storage(map) {
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}
function browser({ pathname, search = '', presetLocal = {}, presetCookies = {} }) {
  const local = new Map(Object.entries(presetLocal))
  const cookies = new Map(Object.entries(presetCookies))
  const document = { referrer: '' }
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    set: (raw) => { const [pair] = String(raw).split(';'); const i = pair.indexOf('='); cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1)) },
  })
  const bodies = []
  globalThis.document = document
  globalThis.window = { location: { pathname, search, hostname: 'www.usekineo.com', protocol: 'https:', href: `https://www.usekineo.com${pathname}${search}` }, crypto: { randomUUID: () => '550e8400-e29b-41d4-a716-446655440000' } }
  globalThis.localStorage = storage(local)
  globalThis.sessionStorage = storage(new Map())
  globalThis.fetch = async (_url, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: false }) } }
  return { local, cookies, bodies }
}
const ANALYTICS_STUBS = {
  '@/lib/acquisitionSource': {
    internalSurfaceLabel: () => null,
    sanitizeAcquisitionReferrer: () => null,
    sanitizeAcquisitionUtmSource: (v) => (v ? String(v) : null),
  },
  '@/lib/growth/checkoutAuthSessionBridge': {
    CHECKOUT_AUTH_SESSION_COOKIE: 'kineo_checkout_auth_session_id',
    CHECKOUT_AUTH_SESSION_MAX_AGE_SECONDS: 1800,
    EVENT_SESSION_COOKIE: 'kineo_event_session_id',
    normalizeEventSessionId: (v) => v ?? null,
  },
}
async function captureProblems(analyticsSrc) {
  const a = tryLoad(analyticsSrc, ANALYTICS_STUBS)
  if (!a || typeof a.captureSourceOnce !== 'function') return ['lib/analytics.ts não carrega']
  const p = []
  // 1. primeiro toque, com query sensível: só o pathname é guardado (local + cookie de 90 dias).
  let b = browser({ pathname: '/free-ai-shorts/restaurants', search: '?prompt=private+idea&utm_source=chatgpt' })
  a.captureSourceOnce()
  if (b.local.get('kineo_landing') !== '/free-ai-shorts/restaurants') p.push(`primeiro toque guardou ${JSON.stringify(b.local.get('kineo_landing'))}`)
  if (decodeURIComponent(b.cookies.get('kineo_landing') ?? '') !== '/free-ai-shorts/restaurants') p.push('cookie do caminho ausente (não atravessaria o OAuth)')
  if ([...b.local.values(), ...b.cookies.values()].some((v) => String(v).includes('private'))) p.push('a query (prompt) vazou para o armazenamento')
  // 2. navegação seguinte: não sobrescreve.
  globalThis.window.location.pathname = '/pricing'
  a.captureSourceOnce()
  if (b.local.get('kineo_landing') !== '/free-ai-shorts/restaurants') p.push('segunda página sobrescreveu o primeiro toque')
  // 3. trackSignupSource leva o campo.
  a.trackSignupSource()
  await new Promise((r) => setTimeout(r, 0))
  if (b.bodies.at(-1)?.signup_landing_path !== '/free-ai-shorts/restaurants') p.push(`trackSignupSource mandou ${JSON.stringify(b.bodies.at(-1)?.signup_landing_path)}`)
  // 4. navegador que já tinha origem gravada (antes desta mudança): caminho fica nulo, não inventa.
  b = browser({ pathname: '/pricing', presetLocal: { kineo_src: JSON.stringify({ utm_source: 'chatgpt' }) } })
  a.captureSourceOnce()
  if (b.local.has('kineo_landing')) p.push('navegador com origem antiga ganhou um caminho que não é o de entrada')
  // 5. visita direta sem utm/referrer: caminho gravado, origem NÃO congelada (um utm posterior ainda vence).
  b = browser({ pathname: '/text-to-video-shorts' })
  a.captureSourceOnce()
  if (b.local.get('kineo_landing') !== '/text-to-video-shorts') p.push('visita direta sem origem não guardou o caminho')
  if (b.local.has('kineo_src')) p.push('o caminho congelou a origem (kineo_src gravado sem utm/referrer)')
  // 6. /go/<token> nunca vai para o armazenamento.
  b = browser({ pathname: '/go/AbCdEf0123456789_-xyz' })
  a.captureSourceOnce()
  if (b.local.get('kineo_landing') !== '/go') p.push('token do /go foi guardado')
  return p
}
const capp = await captureProblems(SRC.analytics)
ok(capp.length === 0, `(b4) navegador: primeiro toque só com pathname, sem sobrescrever, sem inventar, enviado no trackSignupSource (${capp.join('; ') || 'ok'})`)

// ─── (c) rota grava só se nulo, tolera a coluna ausente ──────────────────────
function routeProblems(src) {
  const p = []
  const code = src.replace(/^\s*\/\/.*$/gm, '')
  if (!/import \{ LANDING_PATH_KEY, sanitizeLandingPath \} from '@\/lib\/landingPath'/.test(code)) p.push('rota não usa a régua de lib/landingPath')
  if (!/signup_landing_path = sanitizeLandingPath\(body\?\.signup_landing_path\)/.test(code)) p.push('corpo não passa pela régua')
  if (!/req\.cookies\.get\(LANDING_PATH_KEY\)/.test(code)) p.push('sem fallback do cookie')
  const select = code.match(/\.select\(\s*'(gclid[^']*)'/)?.[1] ?? ''
  if (!select || select.includes('signup_landing_path')) p.push('signup_landing_path entrou no SELECT principal (coluna ausente derrubaria toda a atribuição)')
  const mainUpdate = code.indexOf(".update(patch).eq('id', user.id)")
  const landingUpdate = code.indexOf('.update({ signup_landing_path })')
  if (landingUpdate < 0) p.push('sem UPDATE próprio do caminho')
  else if (mainUpdate < 0 || landingUpdate < mainUpdate) p.push('UPDATE do caminho antes do resto')
  if (!/\.update\(\{ signup_landing_path \}\)\s*\.eq\('id', user\.id\)\s*\.is\('signup_landing_path', null\)/.test(code)) p.push('UPDATE do caminho sem o filtro is null (primeiro toque não venceria)')
  if (/patch\.signup_landing_path/.test(code)) p.push('caminho foi para o patch principal')
  if (!/isMissingColumnError\(landingError, 'signup_landing_path'\)/.test(code)) p.push('erro de coluna inexistente não é tratado')
  // a função de "coluna ausente", executada.
  const fnSrc = src.match(/function isMissingColumnError[\s\S]*?\n\}\n/)?.[0]
  const m = fnSrc ? tryLoad(fnSrc + '\nexport { isMissingColumnError }') : null
  if (!m) p.push('isMissingColumnError ausente')
  else {
    if (!m.isMissingColumnError({ code: '42703', message: 'column profiles.signup_landing_path does not exist' }, 'signup_landing_path')) p.push('42703 não reconhecido')
    if (!m.isMissingColumnError({ code: 'PGRST204', message: "Could not find the 'signup_landing_path' column of 'profiles' in the schema cache" }, 'signup_landing_path')) p.push('PGRST204 não reconhecido')
    if (m.isMissingColumnError({ code: '42501', message: 'permission denied for table profiles' }, 'signup_landing_path')) p.push('erro de permissão tratado como coluna ausente')
  }
  // nunca quebra o cadastro: o bloco do caminho mora dentro de try/catch próprio.
  const block = code.slice(landingUpdate - 200, landingUpdate + 900)
  if (!/try \{[\s\S]*\.update\(\{ signup_landing_path \}\)[\s\S]*\} catch \(e\)/.test(block)) p.push('UPDATE do caminho fora de try/catch próprio')
  return p
}
const rtp = routeProblems(SRC.route)
ok(rtp.length === 0, `(c) track-signup-source: valida, cai no cookie, grava só se nulo, tolera coluna ausente (${rtp.join('; ') || 'ok'})`)

// ─── (d) sem utm_source=seo cravado; placar orgânico continua vendo ──────────
function intentProblems(intentSrc, truthSrc) {
  const p = []
  const intent = tryLoad(intentSrc)
  const truth = tryLoad(truthSrc)
  if (!intent || !truth) return ['publicCreationIntent ou organicSignupTruth não carrega']
  const blank = new URL(intent.buildBlankStudioSignupHref({ campaign: 'vs_comparison_cluster' }), 'https://kineo.local')
  if (blank.searchParams.has('utm_source')) p.push(`link vazio ainda leva utm_source=${blank.searchParams.get('utm_source')}`)
  if (blank.searchParams.get('utm_medium') !== 'organic' || blank.searchParams.get('utm_campaign') !== 'vs_comparison_cluster') p.push('link vazio perdeu medium/campanha')
  const prompted = new URL(intent.buildPromptedSignupHref({ prompt: 'x', campaign: 'push63_niche_x', creationIntent: 'fast' }), 'https://kineo.local')
  if (prompted.searchParams.has('utm_source')) p.push('link com ideia ainda leva utm_source')
  const explicit = new URL(intent.buildBlankStudioSignupHref({ campaign: 'c', utmSource: 'alternatives' }), 'https://kineo.local')
  if (explicit.searchParams.get('utm_source') !== 'alternatives') p.push('origem explícita do chamador se perdeu')
  const junk = new URL(intent.buildBlankStudioSignupHref({ campaign: 'c', utmSource: 'bad source' }), 'https://kineo.local')
  if (junk.searchParams.has('utm_source')) p.push('origem inválida passou ou virou padrão inventado')
  if (/'seo'/.test(intentSrc.replace(/\/\/.*$/gm, ''))) p.push("ainda existe 'seo' literal no código do módulo")
  // placar: o link novo continua orgânico; uma origem real não vira orgânica por isso.
  const ctx = truth.organicSignupHandoffContext(blank.searchParams)
  if (!ctx || ctx.campaign !== 'vs_comparison_cluster' || ctx.source !== 'organic_page') p.push(`evento orgânico do link novo: ${JSON.stringify(ctx)}`)
  if (truth.organicSignupHandoffContext(new URLSearchParams({ utm_source: 'chatgpt', utm_medium: 'organic', utm_campaign: 'vs_comparison_cluster' }))) p.push('origem chatgpt virou orgânica')
  if (truth.isOrganicSignupAttribution({ medium: 'organic' })) p.push('medium organic sem campanha virou orgânico')
  if (!truth.isOrganicSignupAttribution({ source: 'seo', medium: 'organic', campaign: '' })) p.push('perfis antigos (seo/organic) deixaram de ser orgânicos')
  return p
}
const ip = intentProblems(SRC.intent, SRC.truth)
ok(ip.length === 0, `(d) páginas públicas sem utm_source=seo inventado; placar orgânico intacto (${ip.join('; ') || 'ok'})`)

// ─── (M) mutantes ────────────────────────────────────────────────────────────
ok(migrationProblems(SRC.migration.replace('add column if not exists signup_landing_path text;', 'add column signup_landing_path text not null default \'\';')).length > 0, '(M1) migration sem if not exists / com not null → vermelho')
ok(rulerProblems(load(SRC.landing.replace(".split(/[?#]/, 1)[0] ?? ''", " ?? ''")).sanitizeLandingPath, 'm').length > 0, '(M2) régua guardando a query → vermelho')
ok(rulerProblems(load(SRC.landing.replace("? '/go' : pathOnly", '? pathOnly : pathOnly')).sanitizeLandingPath, 'm').length > 0, '(M3) régua guardando o token do /go → vermelho')
ok(rulerProblems(analyticsRuler(SRC.analytics.replace('const LANDING_PATH_MAX = 200', 'const LANDING_PATH_MAX = 2000'))?.sanitizeLandingPath, 'm').length > 0, '(M4) cópia do analytics divergindo da lib → vermelho')
ok((await captureProblems(SRC.analytics.replace('if (already || readLandingCookie() || hasSource || readSourceCookie()) return', 'if (already) return'))).length > 0, '(M5) captura inventando caminho para quem já tinha origem → vermelho')
ok((await captureProblems(SRC.analytics.replace('        signup_landing_path: storedLandingPath(),\n', ''))).length > 0, '(M6) trackSignupSource sem o campo → vermelho')
ok(routeProblems(SRC.route.replace(".is('signup_landing_path', null)", '')).length > 0, '(M7) UPDATE sem is null (sobrescreveria) → vermelho')
ok(routeProblems(SRC.route.replace("signup_referrer, signup_surface'", "signup_referrer, signup_surface, signup_landing_path'")).length > 0, '(M8) coluna no SELECT principal → vermelho')
ok(routeProblems(SRC.route.replace(/return code === '42703'[^\n]*/, 'return false')).length > 0, '(M9) coluna ausente sem tratamento → vermelho')
ok(intentProblems(SRC.intent.replace("const DEFAULT_MEDIUM = 'organic'", "const DEFAULT_MEDIUM = 'organic'\nconst DEFAULT_SOURCE = 'seo'").replace("const source = boundedToken(utmSource ?? '', '')", 'const source = boundedToken(utmSource ?? DEFAULT_SOURCE, DEFAULT_SOURCE)'), SRC.truth).length > 0, '(M10) seo cravado de volta → vermelho')
ok(intentProblems(SRC.intent, SRC.truth.replace("  if (!source && medium === 'organic' && campaign) return true\n", '')).length > 0, '(M11) placar orgânico sem reconhecer o link novo → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
