// KINEO-LACOS-INDICACAO-2026-10-02 — guardião (laços C2): o laço de indicação deixa de ser cego e volta a atribuir.
// Prova: (1) a recompensa tem UMA fonte (lib/referralReward.ts) e as rotas a importam; (2) os 4 degraus gravam evento
// (cópia do link no cliente; chegada, atribuição e qualificação no servidor) sem e-mail no metadado; (3) os 3 de
// servidor estão em SERVER_ONLY_EVENTS; (4) o middleware não desvia mais /v/<id>?ref= (o visitante via a home em vez
// do filme); (5) /a/<código de indicação> grava a chegada e entrega o código à home por cookie de primeiro toque, e
// o captureRefOnce o lê — executado com mocks; (6) mutantes. Estilo readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function compile(src, mocks = {}, globals = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, {
    module: mod, exports: mod.exports, URL, URLSearchParams, RegExp, Promise, setTimeout, console: { log() {}, warn() {}, error() {} },
    process: { env: {} },
    require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('import inesperado: ' + id) },
    ...globals,
  })
  return mod.exports
}

console.log('== 1. fonte única da recompensa ==')
const R = compile(read('lib/referralReward.ts'))
ok(R.REFERRAL_REWARD_CREDITS === 30 && R.REFERRAL_MAX_REWARDED_FRIENDS === 20, 'lib/referralReward.ts: 30 créditos por lado, teto de 20 indicações pagas')
ok(!/^import /m.test(read('lib/referralReward.ts')), 'lib/referralReward.ts é puro (sem import)')
ok(R.normalizeReferralCode(' abcdefgh ') === 'ABCDEFGH' && R.normalizeReferralCode('ABCDEFG0') === null && R.normalizeReferralCode('producthunt') === null, 'normalizeReferralCode: maiúsculas, alfabeto sem 0/O/1/I, 8 caracteres')
const rotaRef = read('app/api/referral/route.ts')
const rotaQual = read('app/api/referral/qualify/route.ts')
const digitado = /const\s+REFERRAL_REWARD_CREDITS\s*=\s*\d|const\s+MAX_REFERRALS_PER_USER\s*=\s*\d/
ok(/import \{ REFERRAL_REWARD_CREDITS \} from '@\/lib\/referralReward'/.test(rotaRef) && !digitado.test(rotaRef), 'GET /api/referral importa a recompensa (sem número digitado)')
ok(/from '@\/lib\/referralReward'/.test(rotaQual) && /const MAX_REFERRALS_PER_USER = REFERRAL_MAX_REWARDED_FRIENDS/.test(rotaQual) && !digitado.test(rotaQual), 'qualify importa recompensa e teto (sem número digitado)')
// Pendente da integração: o llms.txt é de outra sessão em 02/10 e ainda declara a própria constante.
// Enquanto não importa, o número dele tem de bater com a fonte.
const llms = read('app/llms.txt/route.ts')
const llmsImporta = /from '@\/lib\/referralReward'/.test(llms)
const llmsNum = (llms.match(/const REFERRAL_REWARD_CREDITS = (\d+)/) || [])[1]
const llmsTeto = (llms.match(/const REFERRAL_MAX_REWARDED_FRIENDS = (\d+)/) || [])[1]
ok(llmsImporta || (Number(llmsNum) === R.REFERRAL_REWARD_CREDITS && Number(llmsTeto) === R.REFERRAL_MAX_REWARDED_FRIENDS), `llms.txt ${llmsImporta ? 'importa a fonte' : 'ainda local (pendente de integração), mas igual à fonte'}`)

console.log('== 2. os quatro degraus gravam evento, sem e-mail ==')
const card = read('components/ReferralCard.tsx')
ok(/await navigator\.clipboard\.writeText\(referral\.url\)[\s\S]{0,200}trackEvent\(REFERRAL_LINK_COPIED_EVENT, \{/.test(card), 'cliente: referral_link_copied DEPOIS da cópia dar certo (no botão de copiar)')
const cardMeta = (card.match(/trackEvent\(REFERRAL_LINK_COPIED_EVENT, \{([\s\S]*?)\}\)/) || [])[1] || ''
ok(cardMeta && !/email|url|code/i.test(cardMeta), 'cliente: metadado sem e-mail, sem URL e sem código')
const attr = read('app/api/referral/attribute/route.ts')
ok(/if \(attributed\?\.id\) \{[\s\S]{0,400}await writeServerEvent\(\{\s*name: REFERRAL_ATTRIBUTED_EVENT,\s*userId: user\.id,\s*metadata: \{ referrer_user_id: referrer\.id \},/.test(attr), 'servidor: referral_attributed só quando ESTA requisição atribuiu (update condicional), com ids')
ok(/await writeServerEvent\(\{\s*name: REFERRAL_QUALIFIED_EVENT,\s*userId: me\.id,/.test(rotaQual) && rotaQual.indexOf('name: REFERRAL_QUALIFIED_EVENT') > rotaQual.indexOf('if (!grantedRows || grantedRows.length === 0)') && rotaQual.indexOf('if (!grantedRows || grantedRows.length === 0)') > 0 && rotaQual.indexOf('name: REFERRAL_QUALIFIED_EVENT') < rotaQual.indexOf('return NextResponse.json({ ok: true, granted: true })'), 'servidor: referral_qualified depois do crédito pago e antes do ok')
ok(/referrer_outcome: referrerOutcome/.test(rotaQual) && /referrerOutcome = 'grant_failed'/.test(rotaQual) && /referrerOutcome = 'paid'/.test(rotaQual), 'servidor: o desfecho do indicador (pago / teto / falhou) entra no evento')
const land = read('lib/referralLanding.ts')
ok(/await writeServerEvent\(\{ name: REFERRAL_LANDING_EVENT, userId: null, metadata \}\)/.test(land) && /if \(isAffiliatePreviewBot\(input\.userAgent\)\) return null/.test(land), 'servidor: referral_landing grava sem usuário e ignora robô de prévia')
for (const [f, src] of [['attribute', attr], ['qualify', rotaQual], ['referralLanding', land]]) {
  const metas = [...src.matchAll(/metadata(?:: \{|\s*=\s*\{|: Record<string, unknown> = \{)([\s\S]*?)\}/g)].map((m) => m[1]).join(' ')
  ok(!/email/i.test(metas), `${f}: nenhum e-mail no metadado do evento`)
}

console.log('== 3. o navegador não cunha os degraus de servidor ==')
const ev = read('app/api/events/route.ts')
const lista = (() => {
  const s = ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const open = ev.indexOf('[', s)
  const close = ev.indexOf('])', open)
  const lit = ev.slice(open, close + 1).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
  return new Set(Function(`"use strict"; return (${lit})`)())
})()
for (const n of [R.REFERRAL_LANDING_EVENT, R.REFERRAL_ATTRIBUTED_EVENT, R.REFERRAL_QUALIFIED_EVENT]) ok(lista.has(n), `SERVER_ONLY_EVENTS tem ${n}`)
ok(!lista.has(R.REFERRAL_LINK_COPIED_EVENT), 'referral_link_copied continua de cliente (não está na lista)')

console.log('== 4. middleware: /v/<id>?ref= mostra o filme ==')
const mw = read('middleware.ts')
function mwCond(src) {
  const m = src.match(/\n\s*if \((ref && \/\^\[A-Z0-9\]\{8\}\$\/\.test\(ref\)[^\n]*?)\) \{\n/)
  if (!m) return null
  return new Function('request', 'ref', `return Boolean(${m[1]})`)
}
const req = (p) => ({ method: 'GET', nextUrl: { pathname: p } })
const cond = mwCond(mw)
ok(cond && cond(req('/v/2f9d1c4e-0000-4000-8000-000000000000'), 'ABCDEFGH') === false, 'middleware não desvia /v/<id>?ref=CODE (o visitante vê o filme)')
ok(cond && cond(req('/'), 'ABCDEFGH') === true && cond(req('/a/ABCDEFGH'), 'ABCDEFGH') === false && cond(req('/'), 'producthunt') === false, 'controle: ?ref=CODE na home ainda vai para /a/; /a/ e ?ref=producthunt intactos')
const vp = read('app/v/[id]/page.tsx')
ok(/recordReferralLanding\(\{\s*code: refCode,\s*surface: 'public_video',/.test(vp) && /const landing = refCode && v/.test(vp), '/v/<id> grava referral_landing só para filme público com código válido')

console.log('== 5. /a/<código de indicação> executado ==')
const routeSrc = read('app/a/[code]/route.ts')
function runA({ referrerId = 'ref-user-1', ua = 'Mozilla/5.0', existing = null, code = 'ABCDEFGH' } = {}) {
  const calls = { landing: [] }
  const sb = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116' } }) }) }) }) }
  const mod = compile(routeSrc, {
    'next/server': { NextResponse: { redirect: (url) => { const r = { location: String(url), writes: [] }; r.cookies = { set: (n, v, o) => r.writes.push({ n, v, o }) }; return r } } },
    crypto: { createHash: () => ({ update: () => ({ digest: () => 'h' }) }) },
    '@supabase/supabase-js': { createClient: () => sb },
    '@/lib/affiliateDestinations': { affiliateClickLandingPath: () => '/', buildAffiliateRouteDestinationUrl: (a) => new URL('/', a), getAffiliateRouteDestination: () => null, isAffiliatePreviewBot: (u) => /whatsapp|bot/i.test(u ?? '') },
    '@/lib/affiliateAttribution': { normalizeAffiliateClickId: () => null, normalizeAffiliateCode: (c) => (typeof c === 'string' && /^[A-Za-z0-9]{8}$/.test(c) ? c.toUpperCase() : null) },
    '@/lib/referralLanding': {
      findReferrerIdByCode: async () => referrerId,
      recordReferralLanding: async (i) => { calls.landing.push(i); return i.referrerId },
      normalizeReferralCode: R.normalizeReferralCode,
      REFERRAL_COOKIE: R.REFERRAL_COOKIE,
      REFERRAL_COOKIE_MAX_AGE: R.REFERRAL_COOKIE_MAX_AGE,
    },
  })
  const request = {
    nextUrl: new URL(`https://www.usekineo.com/a/${code}`),
    headers: { get: (k) => (k === 'user-agent' ? ua : '') },
    cookies: { get: (k) => (k === 'sf_ref' && existing ? { value: existing } : undefined) },
  }
  return mod.GET(request, { params: { code } }).then((res) => ({ res, calls }))
}
{
  const { res, calls } = await runA()
  const ck = res.writes.find((w) => w.n === 'sf_ref')
  ok(new URL(res.location).pathname === '/' && ck && ck.v === 'ABCDEFGH' && ck.o.maxAge === R.REFERRAL_COOKIE_MAX_AGE && ck.o.httpOnly !== true, 'código de indicação: home + cookie sf_ref legível (30 dias)')
  ok(calls.landing.length === 1 && calls.landing[0].surface === 'home' && calls.landing[0].referrerId === 'ref-user-1', 'código de indicação: referral_landing gravado (superfície home)')
  ok(!res.writes.some((w) => w.n === 'sf_aff' || w.n === 'sf_aff_click'), 'código de indicação não vira cookie de afiliado')
}
{
  const { res } = await runA({ existing: 'ZZZZZZZZ' })
  ok(!res.writes.some((w) => w.n === 'sf_ref'), 'primeiro toque: código de indicação já guardado não é sobrescrito')
}
{
  const { res } = await runA({ ua: 'WhatsApp/2.23' })
  ok(new URL(res.location).pathname === '/' && !res.writes.length, 'robô de prévia: home, nenhum cookie')
}
{
  const { res, calls } = await runA({ referrerId: null })
  ok(res.location === 'https://www.usekineo.com' && !res.writes.length && calls.landing.length === 0, 'código desconhecido (nem afiliado nem indicação): home sem cookie, como antes')
}

console.log('== 5b. captureRefOnce lê o cookie ==')
function runCapture({ search = '', cookie = '', stored = null }) {
  const store = new Map(stored ? [['sf_ref', stored]] : [])
  const localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  const m = compile(read('lib/referral.ts'), {}, { window: { location: { search } }, document: { cookie }, localStorage })
  m.captureRefOnce()
  return store.get('sf_ref') ?? null
}
ok(runCapture({ cookie: 'a=1; sf_ref=ABCDEFGH' }) === 'ABCDEFGH', 'home sem ?ref= + cookie sf_ref → código guardado para o cadastro')
ok(runCapture({ search: '?ref=HJKLMNPQ', cookie: 'sf_ref=ABCDEFGH' }) === 'HJKLMNPQ', '?ref= na URL ganha do cookie')
ok(runCapture({ cookie: 'sf_ref=ABCDEFGH', stored: 'HJKLMNPQ' }) === 'HJKLMNPQ', 'primeiro toque no localStorage continua valendo')
ok(runCapture({ cookie: 'sf_ref=lixo' }) === null, 'cookie inválido é ignorado')

console.log('== 6. mutantes ==')
const mwSemV = mw.replace(" && !request.nextUrl.pathname.startsWith('/v/')", '')
const c2 = mwCond(mwSemV)
ok(mwSemV !== mw && c2 && c2(req('/v/x'), 'ABCDEFGH') === true, 'mutante: sem a exceção de /v/, o desvio do filme volta e é pego')
const qualDigitado = rotaQual.replace('const MAX_REFERRALS_PER_USER = REFERRAL_MAX_REWARDED_FRIENDS', 'const MAX_REFERRALS_PER_USER = 20')
ok(digitado.test(qualDigitado), 'mutante: teto digitado de novo no qualify é pego')
const evSem = ev.replace("  'referral_qualified',\n", '')
ok(evSem !== ev && !/'referral_qualified'/.test(evSem.slice(evSem.indexOf('const SERVER_ONLY_EVENTS'), evSem.indexOf('])', evSem.indexOf('const SERVER_ONLY_EVENTS')))), 'mutante: referral_qualified fora da lista é pego')

console.log(`\n  ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
