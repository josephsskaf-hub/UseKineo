#!/usr/bin/env node
// KINEO-CONSENTIMENTO-1610 — guardião do consentimento de cookies/pixels por região (item 1) e do texto honesto de
// armazenamento (item 3). Fundador aprovou os dois em 16/10. Prova:
//   A. EXECUTADO lib/consent.ts: EEE + Reino Unido + Suíça + Brasil = opt-in; país desconhecido = opt-in (falha
//      fechada); em opt-in nada de marketing antes do "Accept"; GPC desliga sempre; "Reject" desliga; cookie de 12 meses;
//      texto do banner na língua do visitante.
//   B. app/layout.tsx: Google Ads, TikTok e Clarity NÃO estão no <head> nem soltos no <body>; só viajam como prop para o
//      <ConsentManager>. Rewardful (atribuição de afiliado) continua no <head>, de propósito.
//   C. components/ConsentManager.tsx: monta os pixels só com `allowed`; região desconhecida/falha de rede = opt_in;
//      lê navigator.globalPrivacyControl; "Reject" e "Accept" são o MESMO botão (mesmo estilo, mesmo tamanho).
//   D. app/api/consent/route.ts grava o cookie de 12 meses e o evento cookie_consent_set pelo writeServerEvent (path
//      /api/consent, sem o carimbo ip_hash/is_bot que o sink genérico põe — linha forjada pelo sink se distingue). O
//      SERVER_ONLY_EVENTS do sink NÃO foi tocado: é lista fechada vigiada byte a byte por guardiões alheios.
//   E. /privacy lista os 4 serviços (essenciais, Google Ads/TikTok/Clarity, Rewardful) e como recusar; rodapé tem o link.
//   F. Nenhuma promessa de "14-day/90-day/forever storage" fora da home (a linha da home é exceção NOMEADA: a home está
//      congelada por ordem do fundador — o guardião imprime a pendência e falha se aparecer outra).
//   G. Mutantes: cada um provadamente aplicado (texto mudou) e vermelho.
// Estilo da casa: readFileSync, sem alias @/; a lib é transpilada com o typescript do repo e executada.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semKitBfVenda2010 } from './test-support/desfaz-kit-bf-venda-2010.mjs' // reancorado KINEO-KIT-BF-VENDA-2010 — o Kit Black Friday à venda (a camada mais nova) sai antes, em memória
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const F = {
  lib: 'lib/consent.ts',
  layout: 'app/layout.tsx',
  manager: 'components/ConsentManager.tsx',
  route: 'app/api/consent/route.ts',
  privacy: 'app/privacy/page.tsx',
  footer: 'components/Footer.tsx',
  storage: 'app/api/storage-usage/route.ts',
  pricing: 'app/pricing/PricingClient.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, rel]) => [k, read(rel)]))

function loadLib(text) {
  const out = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { throw new Error('lib/consent.ts importou ' + id) }, module, module.exports)
  return module.exports
}

const OPT_IN = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH', 'BR']
const OPT_OUT = ['US', 'CA', 'MX', 'IN', 'JP', 'AU', 'AR', 'NG', 'MY']
const STORAGE_PROMISE = /\b(?:14|90)-day storage\b|\bforever storage\b|\bunlimited forever\b|\bstored forever\b/i
// A home está congelada (ordem do fundador): a linha do Starter fica como pendência nomeada, não como silêncio.
const HOME_PENDING = { file: 'app/KineoLanding.tsx', text: 'Watermark-free MP4 · 100 projects · 90-day storage' }
// Dicionários de tradução são dados indexados pela frase inglesa (a da home e chaves órfãs); não são tela.
const SKIP_DIRS = new Set(['node_modules', '.next', '.git'])
const isDictionary = (rel) => rel.startsWith('lib/ui/interface')

function walk(dir, acc = []) {
  for (const name of readdirSync(join(root, dir))) {
    if (SKIP_DIRS.has(name)) continue
    const rel = `${dir}/${name}`
    const st = statSync(join(root, rel))
    if (st.isDirectory()) walk(rel, acc)
    else if (/\.(tsx?|json)$/.test(name)) acc.push(rel)
  }
  return acc
}
const SCAN = ['app', 'lib', 'components'].flatMap((d) => walk(d)).filter((rel) => !isDictionary(rel))
const SCAN_SRC = Object.fromEntries(SCAN.map((rel) => [rel, read(rel)]))

const sliceBetween = (s, a, b) => {
  const i = s.indexOf(a)
  if (i < 0) return ''
  const j = s.indexOf(b, i + a.length)
  return j < 0 ? '' : s.slice(i, j + b.length)
}
const semComentario = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

function problems(rep = {}) {
  const p = []
  const src = (k) => rep[k] ?? SRC[k]

  // ── A. a lib executada ──────────────────────────────────────────────────────────────────────────────────────────
  let L
  try { L = loadLib(src('lib')) } catch (e) { return ['lib não carrega: ' + e.message] }
  for (const c of OPT_IN) {
    if (L.consentRegionFor(c) !== 'opt_in') p.push(`A1 ${c} devia ser opt_in`)
    if (L.consentRegionFor(c.toLowerCase()) !== 'opt_in') p.push(`A1 ${c.toLowerCase()} (minúsculo) devia ser opt_in`)
  }
  for (const c of OPT_OUT) if (L.consentRegionFor(c) !== 'opt_out') p.push(`A2 ${c} devia ser opt_out`)
  for (const unknown of [undefined, null, '', '  ', 'XX', 'T1', 'USA', '1', 'B']) {
    if (L.consentRegionFor(unknown) !== 'opt_in') p.push(`A3 país desconhecido ${JSON.stringify(unknown)} não falha fechado`)
  }
  const allowed = (region, choice, gpc) => L.marketingAllowed({ region, choice, gpc })
  const banner = (region, choice, gpc) => L.consentBannerNeeded({ region, choice, gpc })
  // em região opt-in, nada antes do consentimento
  if (allowed('opt_in', null, false) !== false) p.push('A4 opt-in sem escolha carrega pixel')
  if (banner('opt_in', null, false) !== true) p.push('A4 opt-in sem escolha não mostra banner')
  if (allowed('opt_in', 'denied', false) !== false) p.push('A5 "Reject" não desliga em opt-in')
  if (allowed('opt_in', 'granted', false) !== true) p.push('A6 "Accept" não liga a medição (Google Ads quebraria para quem aceitou)')
  if (banner('opt_in', 'granted', false) || banner('opt_in', 'denied', false)) p.push('A6 banner volta depois da escolha')
  if (allowed(null, null, false) !== false) p.push('A7 região ainda desconhecida carrega pixel')
  // demais regiões: opt-out, mas com GPC e "Reject"
  if (allowed('opt_out', null, false) !== true) p.push('A8 EUA sem escolha deixou de carregar (opt-out)')
  if (banner('opt_out', null, false) !== false) p.push('A8 EUA ganhou banner')
  if (allowed('opt_out', 'denied', false) !== false) p.push('A9 "Reject" não desliga nos EUA')
  for (const region of ['opt_in', 'opt_out', null]) {
    for (const choice of [null, 'granted', 'denied']) {
      if (allowed(region, choice, true) !== false) p.push(`A10 GPC ignorado (${region}/${choice})`)
      if (banner(region, choice, true) !== false) p.push(`A10 banner com GPC (${region}/${choice})`)
    }
  }
  if (L.parseConsentCookie('a=1; kineo_consent=v1.granted; b=2') !== 'granted') p.push('A11 cookie granted não lido')
  if (L.parseConsentCookie('kineo_consent=v1.denied') !== 'denied') p.push('A11 cookie denied não lido')
  for (const bad of ['kineo_consent=granted', 'xkineo_consent=v1.granted', 'kineo_consent=v1.yes', '', null]) {
    if (L.parseConsentCookie(bad) !== null) p.push(`A11 cookie inválido vira escolha: ${JSON.stringify(bad)}`)
  }
  if (L.CONSENT_COOKIE !== 'kineo_consent') p.push('A12 nome do cookie mudou')
  if (L.CONSENT_MAX_AGE_SECONDS !== 365 * 24 * 60 * 60) p.push('A12 cookie da escolha não dura 12 meses')
  if (L.CONSENT_EVENT !== 'cookie_consent_set') p.push('A12 nome do evento mudou')
  if (L.consentCopyFor('en', ['pt-BR', 'en']).accept !== 'Aceitar') p.push('A13 brasileiro não lê o banner em português')
  if (L.consentCopyFor('de', ['en-US']).reject !== 'Ablehnen') p.push('A13 escolha explícita de interface não vence')
  if (L.consentCopyFor('en', ['ja-JP']).accept !== 'Accept') p.push('A13 língua sem texto não cai em inglês')
  for (const [lang, c] of Object.entries(L.CONSENT_COPY)) {
    for (const key of ['title', 'body', 'accept', 'reject', 'privacy', 'choices', 'affiliate', 'gpc']) {
      if (typeof c[key] !== 'string' || !c[key].trim()) p.push(`A14 ${lang}.${key} vazio`)
    }
    for (const svc of ['Google Ads', 'TikTok', 'Microsoft Clarity']) if (!c.body.includes(svc)) p.push(`A14 ${lang}: banner não nomeia ${svc}`)
    if (!c.affiliate.includes('Rewardful')) p.push(`A14 ${lang}: painel não descreve o Rewardful`)
  }

  // ── B. layout ──────────────────────────────────────────────────────────────────────────────────────────────────
  const layout = src('layout')
  // Âncora com a indentação real: a palavra "<head>" também aparece no comentário do bloco marketingTags.
  const head = sliceBetween(layout, '      <head>\n', '      </head>\n')
  if (!head) p.push('B0 <head> não achado')
  for (const marca of ['googletagmanager', 'AW-18156258081', 'tiktok', 'ttq', 'clarity', 'ClarityTag']) {
    if (head.toLowerCase().includes(marca.toLowerCase())) p.push(`B1 <head> ainda carrega ${marca} sem consentimento`)
  }
  const block = sliceBetween(layout, '  const marketingTags = (\n', '\n  )\n')
  if (!block) p.push('B2 bloco marketingTags não achado')
  for (const need of ['src="https://www.googletagmanager.com/gtag/js?id=AW-18156258081"', "gtag('config', 'AW-18156258081');", '<Script id="tiktok-pixel"', "ttq.load('D8EJ1S3C77U8POE02SBG');"]) {
    if (!block.includes(need)) p.push(`B2 pixel fora do portão ou removido: ${need.slice(0, 50)}`)
  }
  const fora = layout.replace(block, '')
  for (const marca of ['googletagmanager.com/gtag', 'tiktok-pixel', 'analytics.tiktok.com', 'clarity.ms']) {
    if (fora.includes(marca)) p.push(`B3 ${marca} aparece fora do bloco controlado`)
  }
  if ((layout.match(/\bmarketingTags\b/g) ?? []).length !== 2) p.push('B4 marketingTags usado fora do ConsentManager')
  if (!layout.includes('<ConsentManager marketing={marketingTags} clarity={CLARITY_ID ? <ClarityTag projectId={CLARITY_ID} /> : null} />')) p.push('B5 ConsentManager não recebe os pixels e o Clarity')
  if ((layout.match(/<ClarityTag /g) ?? []).length !== 1) p.push('B5 Clarity montado mais de uma vez')
  if ((layout.match(/<ConsentManager /g) ?? []).length !== 1) p.push('B5 ConsentManager montado ≠ 1 vez')
  const cmAt = layout.indexOf('<ConsentManager ')
  if (!(cmAt > layout.indexOf('<InterfaceLanguageProvider>') && cmAt < layout.indexOf('</InterfaceLanguageProvider>'))) p.push('B6 ConsentManager fora do provider de língua')
  if (!head.includes('data-rewardful="55bff9"')) p.push('B7 Rewardful (afiliado, funcional) saiu do <head>')

  // ── C. ConsentManager ────────────────────────────────────────────────────────────────────────────────────────
  const cm = src('manager')
  const cmCode = semComentario(cm)
  if (!cm.startsWith("'use client'")) p.push('C0 ConsentManager não é client')
  if (!cmCode.includes('const allowed = state.ready && marketingAllowed(state)')) p.push('C1 portão não usa marketingAllowed com estado pronto')
  if (!cmCode.includes('{allowed ? marketing : null}')) p.push('C2 pixels montados sem o portão')
  if (!cmCode.includes('{allowed ? clarity : null}')) p.push('C2 Clarity montado sem o portão')
  const renders = cmCode.match(/\{[^{}]*\b(marketing|clarity)\b[^{}]*\}/g) ?? []
  for (const r of renders) {
    if (!['{allowed ? marketing : null}', '{allowed ? clarity : null}', '{ marketing, clarity }', '{ marketing: ReactNode; clarity: ReactNode }'].includes(r.trim())) p.push(`C3 uso extra de marketing/clarity: ${r}`)
  }
  if (!cmCode.includes("region: region ?? 'opt_in'") || !/\.catch\(\(\) => \{\n\s+if \(alive\) setState\(\{ region: 'opt_in', choice, gpc, ready: true \}\)/.test(cmCode)) p.push('C4 falha de rede/resposta ruim não cai em opt_in')
  if (!cmCode.includes('globalPrivacyControl === true')) p.push('C5 GPC não é lido do navegador')
  const btn = (kind) => (cmCode.match(new RegExp(`<button type="button" data-consent="${kind}"[^>]*>[^<]*</button>`)) ?? [''])[0]
  const reject = btn('reject')
  const accept = btn('accept')
  const norm = (s) => s.replace(/reject|accept/gi, 'K').replace(/'denied'|'granted'/g, "'C'")
  if (!reject || !accept) p.push('C6 botões Accept/Reject não achados')
  else {
    if (norm(reject) !== norm(accept)) p.push('C6 "Reject" e "Accept" não têm o mesmo peso (atributos diferentes)')
    if (!reject.includes('style={CONSENT_BUTTON_STYLE}') || !accept.includes('style={CONSENT_BUTTON_STYLE}')) p.push('C6 botões não usam o mesmo estilo')
    if (!reject.includes("choose('denied')") || !accept.includes("choose('granted')")) p.push('C6 botões trocados')
  }
  if ((cmCode.match(/CONSENT_BUTTON_STYLE/g) ?? []).length !== 3) p.push('C6 CONSENT_BUTTON_STYLE alterado/condicional fora dos 2 botões')
  if (!cmCode.includes('<Link href="/privacy#cookies"')) p.push('C7 banner sem link para /privacy')
  if (!/position: 'fixed',\n\s+left: 16,\n\s+right: 16,\n\s+bottom: 16,/.test(cmCode) || !cmCode.includes('maxWidth: 420')) p.push('C8 banner deixou de ser discreto no rodapé')
  if (!cmCode.includes('window.addEventListener(OPEN_PRIVACY_CHOICES_EVENT, open)')) p.push('C9 painel não abre pelo rodapé')

  // ── D. rota + sink ────────────────────────────────────────────────────────────────────────────────────────────
  const route = src('route')
  if (!route.includes("req.headers.get('x-vercel-ip-country')") || !route.includes('const region = consentRegionFor(country)')) p.push('D1 região do POST não vem do cabeçalho da Vercel')
  if (!route.includes('maxAge: CONSENT_MAX_AGE_SECONDS') || !route.includes('res.cookies.set(CONSENT_COOKIE, consentCookieValue(choice)')) p.push('D2 servidor não grava o cookie de 12 meses')
  if (!/name: CONSENT_EVENT,\n\s+userId,\n\s+metadata: \{ choice, region, country, source, gpc \}/.test(route)) p.push('D3 evento de consentimento sem escolha/região')
  if (/^export const (?!dynamic\b)/m.test(route)) p.push('D4 rota exporta campo que o Next não aceita')
  if (!route.includes('const recorded = await writeServerEvent({') || !route.includes('path: CONSENT_API_PATH,')) p.push('D5 evento não sai pelo writeServerEvent com o path da rota')

  // ── E. /privacy + rodapé ──────────────────────────────────────────────────────────────────────────────────────
  const pv = src('privacy')
  const cookies = sliceBetween(pv, '<section id="cookies"', '</section>')
  if (!cookies.includes('Cookies and tracking')) p.push('E1 /privacy sem a seção "Cookies and tracking"')
  for (const need of ['Essential', 'Supabase', 'Stripe', 'Marketing and analytics', 'Google Ads', 'TikTok', 'Microsoft Clarity', 'Affiliate', 'Rewardful', 'Global Privacy Control', '12 months', 'Brazil', 'European Economic Area', 'PrivacyChoicesLink']) {
    if (!cookies.includes(need)) p.push(`E2 seção de cookies não cita ${need}`)
  }
  // Cada um dos 4 grupos nomeia o serviço NA SUA linha (não basta o nome aparecer em outra frase).
  for (const [grupo, svc] of [['Essential', 'Supabase'], ['Marketing and analytics', 'Google Ads'], ['Affiliate', 'Rewardful']]) {
    if (!new RegExp(`<strong>${grupo}</strong>[^<.]{0,140}${svc}`).test(cookies)) p.push(`E2 grupo "${grupo}" sem ${svc} na própria linha`)
  }
  if (/<p[^>]*>[^]*?<ul/.test(sliceBetween(cookies, '<p', '</p>'))) p.push('E3 lista dentro de <p>')
  const ft = src('footer')
  if (!/<PrivacyChoicesLink style=\{linkStyle\}><UiLabel>\n\s+Your privacy choices · Do not sell or share\n\s+<\/UiLabel><\/PrivacyChoicesLink>/.test(ft)) p.push('E4 rodapé sem "Your privacy choices / Do not sell or share"')

  // ── F. armazenamento honesto ────────────────────────────────────────────────────────────────────────────────
  const scan = { ...SCAN_SRC, [F.storage]: src('storage'), [F.pricing]: src('pricing') }
  for (const [rel, text] of Object.entries(scan)) {
    const lines = text.split('\n').filter((l) => STORAGE_PROMISE.test(l))
    for (const l of lines) {
      if (rel === HOME_PENDING.file && l.includes(HOME_PENDING.text) && lines.length === 1) continue
      p.push(`F1 promessa de prazo de armazenamento em ${rel}: ${l.trim().slice(0, 90)}`)
    }
  }
  const st = src('storage')
  if (!st.includes("const STORAGE_RETENTION_TRUTH = 'files stay while your account is active'")) p.push('F2 storage-usage sem o texto verdadeiro')
  if (!st.includes('Ask support@usekineo.com to delete anything, anytime.')) p.push('F2 storage-usage sem o caminho de exclusão')
  for (const n of ['free: { projects: 10, retention: STORAGE_RETENTION_TRUTH }', 'starter: { projects: 100, retention: STORAGE_RETENTION_TRUTH }', 'basic: { projects: 500, retention: STORAGE_RETENTION_TRUTH }']) {
    if (!st.includes(n)) p.push(`F3 limite de quantidade mexido: ${n}`)
  }
  const pr = src('pricing')
  if ((pr.match(/storageLine: '[^']* · files stay while your account is active'/g) ?? []).length !== 3) p.push('F4 pricing sem o texto verdadeiro nos 3 planos')
  return p
}

let pass = 0
let fail = 0
const base = problems()
if (base.length === 0) { pass++; console.log('  ok  consentimento por região, GPC, botões iguais, /privacy e armazenamento honesto') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }
console.log(`  pendente (home congelada): ${HOME_PENDING.file} ainda diz "${HOME_PENDING.text}"${SRC.layout && read(HOME_PENDING.file).includes(HOME_PENDING.text) ? '' : ' — JÁ RESOLVIDO, remover a exceção'}`)

const troca = (key, de, para) => {
  const s = SRC[key]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${F[key]}: ${de.slice(0, 70)}`)
  const out = s.replace(de, para)
  if (out === s) throw new Error(`mutante não aplicou em ${F[key]}`)
  return { [key]: out }
}
const MUTANTES = [
  ['Brasil sai do opt-in', troca('lib', "  'BR',\n", '')],
  ['região desconhecida carrega', troca('lib', '  return state.region === \'opt_out\'', '  return state.region !== \'opt_in\'')],
  ['GPC ignorado', troca('lib', '  if (state.gpc) return false\n', '')],
  ['país sem código vira opt_out', troca('lib', "  if (!/^[A-Z]{2}$/.test(code)) return 'opt_in'", "  if (!/^[A-Z]{2}$/.test(code)) return 'opt_out'")],
  ['cookie de 7 dias', troca('lib', 'export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60', 'export const CONSENT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60')],
  ['gtag volta ao <head>', troca('layout', '      <head>\n', '      <head>\n        <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18156258081" strategy="afterInteractive" />\n')],
  ['pixels montados sem portão', troca('manager', '{allowed ? marketing : null}', '{marketing}')],
  ['Clarity montado sem portão', troca('manager', '{allowed ? clarity : null}', '{clarity}')],
  ['falha de rede vira opt_out', troca('manager', "region: region ?? 'opt_in'", "region: region ?? 'opt_out'")],
  ['"Reject" mais fraco', troca('manager', `data-consent="reject" onClick={() => choose('denied')} style={CONSENT_BUTTON_STYLE}`, `data-consent="reject" onClick={() => choose('denied')} style={{ ...CONSENT_BUTTON_STYLE, opacity: 0.6 }}`)],
  ['GPC não lido', troca('manager', 'globalPrivacyControl === true', 'globalPrivacyControl === "never"')],
  ['evento sai sem o path da rota', troca('route', '    path: CONSENT_API_PATH,\n', '')],
  ['/privacy esquece o Clarity', troca('privacy', 'Microsoft Clarity (session', 'a vendor (session')],
  ['/privacy esquece o Rewardful', troca('privacy', '<strong>Affiliate</strong>: Rewardful and', '<strong>Affiliate</strong>: our tools and')],
  ['pricing volta a prometer 90 dias', troca('pricing', "storageLine: '100 projects · files stay while your account is active'", "storageLine: '100 projects · 90-day storage'")],
  ['storage-usage volta a prometer 14 dias', troca('storage', 'free: { projects: 10, retention: STORAGE_RETENTION_TRUTH }', "free: { projects: 10, retention: '14-day storage' }")],
  ['rodapé sem o link', troca('footer', 'Your privacy choices · Do not sell or share', 'Privacy')],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m[0]})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
// ── H. o desfaz dos guardiões byte a byte (scripts/test-support/desfaz-consentimento-1610.mjs) é EXATO e estrito ──────
{
  const { execFileSync } = await import('node:child_process')
  const { semConsentimento1610, CONSENTIMENTO_1610_ARQUIVOS, CONSENTIMENTO_1610_BASE } = await import('./test-support/desfaz-consentimento-1610.mjs')
  const { semPrivacidadePlugin2610 } = await import('./test-support/desfaz-privacidade-plugin-2610.mjs') // KINEO-PRIVACIDADE-PLUGIN-2610 — a política completa (camada mais nova do /privacy) sai antes, em memória
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const ruins = []
  try { git('merge-base', '--is-ancestor', CONSENTIMENTO_1610_BASE, 'HEAD') } catch { ruins.push('base do desfaz não é ancestral de HEAD') }
  for (const f of CONSENTIMENTO_1610_ARQUIVOS) {
    try {
      if (semConsentimento1610(f, semKitBfVenda2010(semPrivacidadePlugin2610(semAfiliado50_2610(f, read(f)), f), f)) !== git('show', `${CONSENTIMENTO_1610_BASE}:${f}`).replace(/\r\n/g, '\n')) ruins.push(`${f} desfeito ≠ base`) // reancorado KINEO-KIT-BF-VENDA-2010 — o cartão do kit no /pricing (camada mais nova) sai antes, em memória
    } catch (e) { ruins.push(`${f}: ${e.message}`) }
  }
  if (CONSENTIMENTO_1610_ARQUIVOS.length !== 5) ruins.push(`desfaz cobre ${CONSENTIMENTO_1610_ARQUIVOS.length} arquivos, devia 5`)
  const sonda = read(F.pricing).replace("storageLine: '100 projects · files stay while your account is active'", "storageLine: '100 projects ·  files stay while your account is active'")
  if (sonda === read(F.pricing)) ruins.push('sonda do desfaz não se aplicou')
  else { let lancou = false; try { semConsentimento1610(F.pricing, sonda) } catch { lancou = true } if (!lancou) ruins.push('desfaz engoliu mudança dentro do trecho') }
  if (ruins.length) { fail++; for (const r of ruins) console.log('  FAIL H ' + r) } else { pass++; console.log(`  ok  H desfaz exato: ${CONSENTIMENTO_1610_ARQUIVOS.length} arquivos desfeitos = ${CONSENTIMENTO_1610_BASE.slice(0, 9)}; mudança dentro do trecho lança`) }
}

console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — pixels só com consentimento onde a lei pede, GPC honrado, botões iguais, armazenamento sem prazo inventado')
