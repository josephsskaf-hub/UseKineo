#!/usr/bin/env node
// ═══ KINEO-GOOGLE-FAXINA-1011 — guardião da faxina de "cloaking" (auditoria docs/GOOGLE-ADS-CLOAKING-AUDITORIA-2026-11-10.md, lista C) ═══
// Executa o CÓDIGO REAL (ts.transpileModule, @/ resolvido aqui, sem rede, sem banco, sem .env) e prova:
//   1. nenhuma leitura de NEXT_PUBLIC_COMING_SOON no código; app/coming-soon/ apagada; /coming-soon → 308 para a home;
//      /about → 308 para /trust (next.config.js executado), e o /trust lê nome, cidade e e-mail da fonte única;
//   2. home: robô e gente com o mesmo id veem a MESMA variante (só a exposição é medida diferente);
//   3. checkout sem sessão: robô conhecido (Googlebot, AdsBot) e navegador comum recebem o MESMO status (200) e o MESMO
//      HTML, e o robô continua sem chegar à rota que cria a sessão da Stripe;
//   4. caixa de presente do visitante: o texto não depende de país e leva "in supported countries"; a home não lê o IP;
//   5. título do Kling 4.0 com "in supported countries" (avaliado com as constantes reais);
//   6. /refund existe e usa a fonte única MONEY_BACK_GUARANTEE; rodapés com Support e Refunds;
//   7. identidade do anunciante: UMA constante ("Kineo is operated by Joseph Selim Skaf, São Paulo, Brazil." + e-mail de
//      suporte), sem rua/CEP/telefone/CPF/Miami; Terms, Privacy, /pricing, /refund e rodapé leem dela.
// Depois, MUTANTES em memória: cada regra quebrada TEM de deixar a prova vermelha.
//
// Rodar: node scripts/test-google-faxina-1011.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const CR = String.fromCharCode(13)
const disk = new Map()
const read = (rel) => {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}

// ─── carregador: TS real, @/ e relativos resolvidos, overrides por arquivo (mutantes) ─────────────────────────────────
function resolveRel(fromRel, spec) {
  let base
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = join(dirname(fromRel), spec).split(sep).join('/')
  else return null
  for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx']) {
    const cand = base + ext
    if (existsSync(join(root, cand)) && statSync(join(root, cand)).isFile()) return cand
  }
  throw new Error(`não resolvi ${spec} a partir de ${fromRel}`)
}
function loader(overrides = {}, stubs = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = overrides[rel] ?? read(rel)
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: join(root, rel),
    }).outputText
    const module = { exports: {} }
    cache.set(rel, module)
    const req = (spec) => {
      if (spec in stubs) return stubs[spec]
      const r = resolveRel(rel, spec)
      if (r === null) return nodeRequire(spec)
      return load(r)
    }
    new Function('require', 'module', 'exports', 'process', out)(req, module, module.exports, { env: {} })
    return module.exports
  }
  return load
}

let passed = 0
const failed = []
const check = (cond, label) => { if (cond) passed++; else failed.push(label); return Boolean(cond) }
const src = (ov, rel) => ov[rel] ?? read(rel)

// ─── 1. em breve + /about ────────────────────────────────────────────────────────────────────────────────────────────
const COMING_SOON_READ = /process\.env(?:\.NEXT_PUBLIC_COMING_SOON\b|\[\s*['"`]NEXT_PUBLIC_COMING_SOON['"`]\s*\])|\{[^}]*\bNEXT_PUBLIC_COMING_SOON\b[^}]*\}\s*=\s*process\.env/
function codeFiles() {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const rel = dir ? `${dir}/${name}` : name
      const st = statSync(join(root, rel))
      if (st.isDirectory()) walk(rel)
      else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) out.push(rel)
    }
  }
  for (const d of ['app', 'lib', 'components']) walk(d)
  return [...out, 'middleware.ts', 'next.config.js']
}
const CODE = codeFiles()
async function provaEmBreve(ov = {}) {
  const p = []
  for (const rel of CODE) if (COMING_SOON_READ.test(src(ov, rel))) p.push(`1 ${rel} lê NEXT_PUBLIC_COMING_SOON`)
  if (/^\s*NEXT_PUBLIC_COMING_SOON\s*=/m.test(src(ov, '.env.local.example'))) p.push('1 .env.local.example ainda ensina NEXT_PUBLIC_COMING_SOON')
  if (existsSync(join(root, 'app/coming-soon')) && !ov.__comingSoonApagada) p.push('1 app/coming-soon/ ainda existe')
  // next.config.js executado (CommonJS): redirects() de verdade
  const m = { exports: {} }
  new Function('require', 'module', 'exports', 'process', '__dirname', src(ov, 'next.config.js'))(nodeRequire, m, m.exports, { env: {} }, root)
  const reds = await m.exports.redirects()
  const cs = reds.filter((r) => r.source === '/coming-soon')
  if (cs.length !== 1 || cs[0].destination !== '/' || cs[0].permanent !== true || cs[0].has || cs[0].missing) p.push(`1 /coming-soon não é 308 para a home: ${JSON.stringify(cs)}`)
  const ab = reds.filter((r) => r.source === '/about')
  if (ab.length !== 1 || ab[0].destination !== '/trust' || ab[0].permanent !== true) p.push(`7 /about não é 308 para /trust: ${JSON.stringify(ab)}`)
  if (!existsSync(join(root, 'app/trust/page.tsx'))) p.push('7 o destino /trust não existe')
  if (existsSync(join(root, 'app/about'))) p.push('7 existe app/about E o redirect (o redirect venceria a página)')
  const trust = src(ov, 'app/trust/page.tsx')
  if (!/import \{[^}]*\bADVERTISER_OPERATOR\b[^}]*\} from '@\/lib\/legal\/advertiser'/.test(trust) || !trust.includes('${ADVERTISER_OPERATOR}')) p.push('7 /trust não lê o operador da fonte única')
  if (/Joseph|São Paulo/.test(trust.replace(/^\s*\/\/.*$/gm, ''))) p.push('7 /trust digita o nome/cidade (fora da fonte única)')
  return p
}

// ─── 2. home: robô e gente na mesma regra ────────────────────────────────────────────────────────────────────────────
const HOME = 'lib/growth/homeClipsFirst.ts'
const HUMAN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const BOTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'AdsBot-Google (+http://www.google.com/adsbot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)',
  '',
]
async function provaHome(ov = {}) {
  const p = []
  const H = loader(ov)(HOME)
  const ids = Array.from({ length: 60 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  for (const mode of ['off', 'ab50', 'all']) {
    for (const ua of BOTS) {
      for (const id of ids) {
        const r = H.assignHomeVariant({ mode, visitorId: id, userAgent: ua })
        const g = H.assignHomeVariant({ mode, visitorId: id, userAgent: HUMAN })
        if (r.variant !== g.variant) { p.push(`2 ${mode}: robô "${ua.slice(0, 30) || '(vazio)'}" vê ${r.variant}, gente vê ${g.variant}`); break }
        if (r.expose) { p.push(`2 ${mode}: robô gera evento de exposição`); break }
      }
    }
    const base = { mode, pathname: '/', method: 'GET', existing: null }
    if (H.shouldMintHomeVisitorCookie({ ...base, userAgent: BOTS[0] }) !== H.shouldMintHomeVisitorCookie({ ...base, userAgent: HUMAN })) p.push(`2 ${mode}: cookie do sorteio difere entre robô e gente`)
  }
  return p
}

// ─── 3. checkout sem sessão ──────────────────────────────────────────────────────────────────────────────────────────
const GATE = 'lib/growth/checkoutRobotGate.ts'
const MW = 'middleware.ts'
const hdr = (o) => { const m = new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])); return { get: (n) => m.get(n.toLowerCase()) ?? null } }
async function provaCheckout(ov = {}) {
  const p = []
  const G = loader(ov)(GATE)
  const pedido = (headers, url = '/api/stripe/checkout?tier=basic&billing=monthly') => {
    const u = new URL(url, 'https://www.usekineo.com')
    return G.decideCheckoutGate({ method: 'GET', pathname: u.pathname, searchParams: u.searchParams, headers: hdr(headers), cookieNames: [] })
  }
  const nav = pedido({ 'user-agent': HUMAN })
  const navStatus = nav.action === 'pass' ? 'rota' : G.checkoutGateStatus(nav)
  const navHtml = nav.action === 'pass' ? null : G.checkoutGateHtml(G.checkoutGatePageReason(nav))
  if (navStatus !== 200) p.push(`3 navegador comum sem sessão: ${navStatus}`)
  for (const ua of BOTS.slice(0, 3)) {
    const d = pedido({ 'user-agent': ua })
    if (d.action === 'pass') { p.push(`3 robô "${ua.slice(0, 30)}" chega à rota (criaria sessão da Stripe)`); continue }
    if (G.checkoutGateStatus(d) !== navStatus) p.push(`3 robô "${ua.slice(0, 30)}" recebe ${G.checkoutGateStatus(d)}, navegador ${navStatus}`)
    if (G.checkoutGateHtml(G.checkoutGatePageReason(d)) !== navHtml) p.push(`3 robô "${ua.slice(0, 30)}" recebe HTML diferente do navegador`)
    // a proteção da Stripe: robô conhecido não passa só copiando kc=1
    const copia = pedido({ 'user-agent': ua }, '/api/stripe/checkout?tier=basic&kc=1')
    if (ua.includes('Googlebot') && copia.action === 'pass') p.push('3 Googlebot passa só copiando kc=1')
  }
  const mw = src(ov, MW)
  if (!mw.includes('checkoutGateHtml(checkoutGatePageReason(gate))') || !mw.includes('status: checkoutGateStatus(gate)')) p.push('3 o middleware não usa a mesma página/status do portão')
  return p
}

// ─── 4. caixa de presente ────────────────────────────────────────────────────────────────────────────────────────────
const CAIXA = 'lib/ui/caixaPresente0511.ts'
async function provaCaixa(ov = {}) {
  const p = []
  const L = loader(ov)
  const C = L(CAIXA)
  const pol = L('lib/freeFilmPolicy.ts')
  const a = C.linhasDoVisitante(true), b = C.linhasDoVisitante(false), c = C.linhasDoVisitante()
  const sig = (l) => JSON.stringify(l)
  if (sig(a) !== sig(b) || sig(a) !== sig(c)) p.push('4 as linhas do visitante dependem do argumento (país)')
  const filme = c.find((l) => l.id === 'filme')
  if (!filme) p.push('4 a linha do filme sumiu para o visitante')
  else if (pol.filmeGratisPermitido('IN') === false && !/ in supported countries$/.test(filme.titulo)) p.push(`4 a linha promete "free" sem a cláusula: "${filme.titulo}"`)
  const page = src(ov, 'app/page.tsx')
  if (/headers\(\)\.get\(\s*['"]x-vercel-ip-country['"]\s*\)/.test(page) || /freeFilmInCountry=/.test(page)) p.push('4 a home ainda lê o país do IP para a caixa')
  if (/linhasDoVisitante\(\s*[^)\s]/.test(src(ov, 'components/CaixaDePresente0511.tsx'))) p.push('4 o componente ainda passa o país para a regra')
  return p
}

// ─── 5. título do Kling 4.0 ──────────────────────────────────────────────────────────────────────────────────────────
const K4 = 'app/ai-video-generator/kling-4/page.tsx'
async function provaKling4(ov = {}) {
  const p = []
  const L = loader(ov)
  const { GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_SECONDS } = L('lib/freeTierOffer.ts')
  const { FREE_FILM_FITS_CLAUSE } = L('lib/freeFilmEngine.ts')
  const s = src(ov, K4)
  const tline = s.split('\n').find((l) => l.startsWith('const title = '))
  const dIdx = s.indexOf('const description = ')
  if (!tline || dIdx < 0) return ['5 não achei title/description na página do Kling 4.0']
  const dexpr = s.slice(dIdx + 'const description = '.length, s.indexOf('\n\n', dIdx))
  const ev = (expr, k4) => new Function('freeFilmIsKling4', 'GRANT_COUNTRY_CLAUSE', 'FREE_FILM_FITS_CLAUSE', 'TRIAL_FREE_FILM_SECONDS', 'noCard', `return (${expr.replace(/\/\/.*$/, '')})`)(k4, GRANT_COUNTRY_CLAUSE, FREE_FILM_FITS_CLAUSE, TRIAL_FREE_FILM_SECONDS, '')
  const title = ev(tline.slice('const title = '.length), true)
  const desc = ev(dexpr, true)
  if (GRANT_COUNTRY_CLAUSE !== ' in supported countries') p.push(`5 cláusula inesperada: ${JSON.stringify(GRANT_COUNTRY_CLAUSE)}`)
  for (const [nome, txt] of [['título', title], ['descrição', desc]]) {
    if (/\bfree\b/i.test(txt) && !/in supported countries/.test(txt)) p.push(`5 ${nome} diz free sem a cláusula: "${txt}"`)
  }
  if (!/^Kling 4\.0 free in supported countries when your story fits 15 s \| Kineo$/.test(title)) p.push(`5 título: "${title}"`)
  return p
}

// ─── 6 e 7. /refund, rodapés, identidade legal ───────────────────────────────────────────────────────────────────────
const REFUND = 'app/refund/page.tsx'
const ADV = 'lib/legal/advertiser.ts'
const ADV_C = 'components/AdvertiserIdentity.tsx'
async function provaRefundELegal(ov = {}) {
  const p = []
  const L = loader(ov, { react: {} , 'react/jsx-runtime': { jsx: (t, props) => ({ t, props }), jsxs: (t, props) => ({ t, props }) } })
  if (!existsSync(join(root, REFUND))) return ['6 app/refund/page.tsx não existe']
  const r = src(ov, REFUND)
  if (!/import \{ MONEY_BACK_GUARANTEE \} from '@\/lib\/checkoutPricing'/.test(r) || !/\{MONEY_BACK_GUARANTEE\}/.test(r)) p.push('6 /refund não usa a fonte única MONEY_BACK_GUARANTEE')
  if (/Full refund|money-back|within \d+ days/i.test(r.replace(/^\s*\/\/.*$/gm, ''))) p.push('6 /refund digita texto de política em vez da constante')
  const { MONEY_BACK_GUARANTEE } = L('lib/checkoutPricing.ts')
  if (!/^Full refund if you email us within 7 days of your first monthly payment \(14 days on annual plans\)\.$/.test(MONEY_BACK_GUARANTEE)) p.push(`6 a frase pública mudou: "${MONEY_BACK_GUARANTEE}"`)
  if (!/alternates: \{ canonical: '\/refund' \}/.test(r)) p.push('6 /refund sem canonical próprio')
  for (const rel of ['components/Footer.tsx', 'app/pricing/PricingClient.tsx']) {
    const f = src(ov, rel)
    if (!/<Link href="\/support"/.test(f)) p.push(`6 ${rel} sem link Support`)
    if (!/<Link href="\/refund"/.test(f)) p.push(`6 ${rel} sem link Refunds`)
  }
  // 7. identidade do anunciante: UMA constante, sem rua/CEP/telefone/CPF/Miami
  const A = L(ADV)
  if (A.ADVERTISER_IDENTITY_LINE !== 'Kineo is operated by Joseph Selim Skaf, São Paulo, Brazil.') p.push(`7 a frase do operador mudou: "${A.ADVERTISER_IDENTITY_LINE}"`)
  if (A.ADVERTISER_SUPPORT_EMAIL !== 'support@usekineo.com') p.push(`7 e-mail de suporte: ${A.ADVERTISER_SUPPORT_EMAIL}`)
  const advCode = src(ov, ADV).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*.*?\*\//g, '')
  if (/\b(rua|avenida|street|suite|cep|zip|cpf|cnpj|miami|florida|fl)\b|\d{5}-?\d{3}|\d{3}\.\d{3}\.\d{3}|\+\d{2}/i.test(advCode)) p.push('7 a constante tem rua/CEP/telefone/CPF/Miami')
  const Comp = L(ADV_C).default
  const out = JSON.stringify(Comp({}))
  if (!out.includes(A.ADVERTISER_IDENTITY_LINE) || !out.includes(`mailto:${A.ADVERTISER_SUPPORT_EMAIL}`)) p.push('7 o componente não mostra a frase + o e-mail da constante')
  for (const rel of ['components/Footer.tsx', 'app/terms/page.tsx', 'app/privacy/page.tsx', 'app/pricing/PricingClient.tsx', REFUND, ADV_C]) {
    if (/Joseph Selim|São Paulo, Brazil|operated by/.test(src(ov, rel))) p.push(`7 ${rel} digita a identidade (fora da fonte única)`)
    if (rel !== ADV_C && !/<AdvertiserIdentity\b/.test(src(ov, rel))) p.push(`7 ${rel} não lê a identidade da fonte única`)
  }
  return p
}

const PROVAS = [
  ['1/7 em breve apagado, redirects', provaEmBreve],
  ['2 home igual para robô e gente', provaHome],
  ['3 checkout: mesmo status e HTML, Stripe protegida', provaCheckout],
  ['4 caixa de presente sem país', provaCaixa],
  ['5 título do Kling 4.0', provaKling4],
  ['6/7 /refund, rodapés, identidade legal', provaRefundELegal],
]
for (const [label, prova] of PROVAS) {
  let p
  try { p = await prova() } catch (e) { p = [`quebrou: ${e.stack ?? e}`] }
  check(p.length === 0, `${label} — ${p.join(' | ')}`)
}

// ─── mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────────
function troca(rel, de, para) {
  return () => {
    const s = read(rel)
    const n = s.split(de).length - 1
    if (n !== 1) throw new Error(`âncora ${n}x em ${rel}: ${de.slice(0, 60)}`)
    const novo = s.split(de).join(para)
    if (novo === s) throw new Error(`mutante não aplicou em ${rel}`)
    return { [rel]: novo }
  }
}
const MUTANTES = [
  ['M1 o middleware volta a ler NEXT_PUBLIC_COMING_SOON', provaEmBreve, troca(MW, '  registrarLeituraDeRoboIa(request, (p) => event.waitUntil(p))\n', "  registrarLeituraDeRoboIa(request, (p) => event.waitUntil(p))\n  if (process.env.NEXT_PUBLIC_COMING_SOON === 'true') return NextResponse.redirect(new URL('/coming-soon', request.url))\n")],
  ['M2 leitura por colchetes', provaEmBreve, troca('lib/supabase/middleware.ts', '  const { pathname } = request.nextUrl\n', "  const { pathname } = request.nextUrl\n  const soon = process.env['NEXT_PUBLIC_COMING_SOON']\n")],
  ['M3 /coming-soon sem redirect', provaEmBreve, troca('next.config.js', "      { source: '/coming-soon', destination: '/', permanent: true },\n", '')],
  ['M4 /coming-soon vira 307', provaEmBreve, troca('next.config.js', "      { source: '/coming-soon', destination: '/', permanent: true },", "      { source: '/coming-soon', destination: '/', permanent: false },")],
  ['M5 /about some', provaEmBreve, troca('next.config.js', "      { source: '/about', destination: '/trust', permanent: true },\n", '')],
  ['M6 robô volta a ver só a home atual', provaHome, troca(HOME, "const variant: HomeVariant = homeBucket(assignmentId) < HOME_CLIPS_FIRST_SHARE ? 'clips_first' : 'control'", "const variant: HomeVariant = robo ? 'control' : homeBucket(assignmentId) < HOME_CLIPS_FIRST_SHARE ? 'clips_first' : 'control'")],
  ['M7 robô sem cookie do sorteio', provaHome, troca(HOME, "  if (input.pathname !== '/' || input.method.toUpperCase() !== 'GET') return false\n  return", "  if (input.pathname !== '/' || input.method.toUpperCase() !== 'GET') return false\n  if (isBotUserAgent(input.userAgent)) return false\n  return")],
  ['M8 robô volta a levar 403', provaCheckout, troca(GATE, '  return 200\n}', "  return _decision.action === 'refuse_bot' ? 403 : 200\n}")],
  ['M9 página do robô leva o nome dele', provaCheckout, troca(GATE, "  return decision.action === 'pass' ? decision.reason : 'no_click_proof'", '  return decision.reason')],
  ['M10 robô passa para a rota (abre a Stripe)', provaCheckout, troca(GATE, "    return clickMark && userActivation ? { action: 'pass', reason: 'bot_clicked' } : { action: 'refuse_bot', reason: botReason }", "    return { action: 'pass', reason: 'bot_clicked' }")],
  ['M11 middleware põe o motivo cru na página', provaCheckout, troca(MW, 'checkoutGateHtml(checkoutGatePageReason(gate))', 'checkoutGateHtml(gate.reason)')],
  ['M12 caixa volta a depender do país', provaCaixa, troca(CAIXA, "  const linhas: CaixaLinha[] = [{ id: 'filme',", "  const linhas: CaixaLinha[] = arguments[0] === false ? [] : [{ id: 'filme',")],
  ['M13 caixa perde a cláusula', provaCaixa, troca(CAIXA, 'Your first film is free${FREE_FILM_COUNTRY_CLAUSE}`', 'Your first film is free`')],
  ['M14 home volta a ler o país', provaCaixa, troca('app/page.tsx', '        initialUser={user ? { id: user.id } : null}\n', "        initialUser={user ? { id: user.id } : null}\n        freeFilmInCountry={filmeGratisPermitido(headers().get('x-vercel-ip-country'))}\n")],
  ['M15 título do Kling 4.0 sem cláusula', provaKling4, troca(K4, '`Kling 4.0 free${GRANT_COUNTRY_CLAUSE} when your story fits 15 s | Kineo`', "'Kling 4.0 free when your story fits 15 s | Kineo'")],
  ['M16 /refund digita a política', provaRefundELegal, troca(REFUND, '>{MONEY_BACK_GUARANTEE}</p>', '>Full refund within 30 days, no questions asked.</p>')],
  ['M17 rodapé sem Refunds', provaRefundELegal, troca('components/Footer.tsx', '<Link href="/refund" style={linkStyle}>', '<Link href="/terms#refund" style={linkStyle}>')],
  ['M18 rua entra na constante', provaRefundELegal, troca(ADV, "export const ADVERTISER_LOCATION = 'São Paulo, Brazil'", "export const ADVERTISER_LOCATION = 'Rua Augusta 100, São Paulo, Brazil'")],
  ['M19 Miami vira o local', provaRefundELegal, troca(ADV, "export const ADVERTISER_LOCATION = 'São Paulo, Brazil'", "export const ADVERTISER_LOCATION = 'Miami, FL'")],
  ['M21 CEP na constante', provaRefundELegal, troca(ADV, "export const ADVERTISER_LOCATION = 'São Paulo, Brazil'", "export const ADVERTISER_LOCATION = 'São Paulo, Brazil, 01310-100'")],
  ['M22 componente digita o nome', provaRefundELegal, troca(ADV_C, '      {ADVERTISER_IDENTITY_LINE} Contact:', '      Kineo is operated by Joseph Selim Skaf, São Paulo, Brazil. Contact:')],
  ['M23 componente sem o e-mail', provaRefundELegal, troca(ADV_C, 'href={`mailto:${ADVERTISER_SUPPORT_EMAIL}`}', 'href="/support"')],
  ['M24 rodapé digita a identidade', provaRefundELegal, troca('components/Footer.tsx', "        <AdvertiserIdentity style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }} />", "        <p>Kineo is operated by Joseph Selim Skaf, São Paulo, Brazil.</p>")],
  ['M25 /trust volta a digitar o nome', provaEmBreve, troca('app/trust/page.tsx', 'built and operated by ${ADVERTISER_OPERATOR} (${ADVERTISER_LOCATION}).', 'built and operated by Joseph Skaf.')],
  ['M20 Terms sem a identidade', provaRefundELegal, troca('app/terms/page.tsx', "          <AdvertiserIdentity style={{ margin: 0, fontSize: '0.92rem', color: '#CBD5E1' }} />\n", '')],
]
for (const [label, prova, mutar] of MUTANTES) {
  let ov
  try { ov = mutar() } catch (e) { check(false, `${label}: ${e.message}`); continue }
  let p
  try { p = await prova(ov) } catch (e) { p = [`quebrou: ${e.message}`] }
  check(p.length > 0, `${label}: a prova ficou VERDE com a regra quebrada`)
  if (process.argv.includes('--verbose')) console.log(`  ${label} → ${p[0] ?? '(verde)'}`)
}

if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f}`)
  console.log(`\n${passed} ok, ${failed.length} FALHA(S) — test-google-faxina-1011`)
  process.exit(1)
}
console.log(`${passed} verificações ok — test-google-faxina-1011 (${PROVAS.length} provas, ${MUTANTES.length} mutantes vermelhos)`)
