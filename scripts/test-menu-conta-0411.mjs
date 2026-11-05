#!/usr/bin/env node
// KINEO-MENU-CONTA-0411 — guardião do menu da conta (components/AccountPanel.tsx + lib/ui/accountMenu.ts).
//
// Desenha o componente de verdade (react-dom/server, com os módulos reais do projeto; só next/link e o portal são
// trocados, porque não existem fora do navegador), executa as regras puras e lê o que só existe no código. Depois
// devolve cada defeito ao código, em memória, e exige vermelho.
//
// Uso: node scripts/test-menu-conta-0411.mjs
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ler = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const PAINEL = 'components/AccountPanel.tsx'
const REGRAS = 'lib/ui/accountMenu.ts'
const SIDEBAR = 'components/Sidebar.tsx'

// ─── carregador: executa o TS/TSX real; `fontes` troca o texto de um arquivo para os mutantes ──────────────────────
globalThis.document = globalThis.document ?? {} // portal() só desenha quando document existe
const resolver = (id) => {
  const base = join(ROOT, id.slice(2))
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) if (existsSync(base + ext) && (ext || /\.[a-z]+$/.test(base))) return base + ext
  throw new Error('não resolveu ' + id)
}
const cacheFixo = new Map()
function carregar(fontes) {
  const cache = new Map()
  const exec = (arq) => {
    const rel = arq.slice(ROOT.length + 1).replace(/\\/g, '/')
    const trocado = Object.hasOwn(fontes, rel)
    const c = trocado || rel === PAINEL ? cache : cacheFixo
    if (c.has(arq)) return c.get(arq).exports
    const mod = { exports: {} }
    c.set(arq, mod)
    if (arq.endsWith('.json')) { mod.exports = JSON.parse(readFileSync(arq, 'utf8')); return mod.exports }
    const texto = trocado ? fontes[rel] : readFileSync(arq, 'utf8')
    const js = ts.transpileModule(texto, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const req = (id) => {
      if (id === 'react-dom') return { createPortal: (no) => no }
      if (id === 'next/link') return { __esModule: true, default: ({ href, className, children }) => React.createElement('a', { href, className }, children) }
      if (id.startsWith('@/')) return exec(resolver(id))
      return require(id)
    }
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
    return mod.exports
  }
  return { painel: exec(join(ROOT, PAINEL)).default, regras: exec(join(ROOT, REGRAS)) }
}

const base = { email: 'maria@example.com', displayName: 'Maria', plan: 'basic', credits: 34, onClose() {}, onSignOut() {} }
const LINHAS = [
  ['My videos', '/history'], ['Profile', '/account?tab=profile'], ['Usage &amp; activity', '/account?tab=usage'],
  ['Help', '/support'], ['Affiliate program', '/affiliate'],
]

function verificar(fontes = {}) {
  const fonte = (rel) => (Object.hasOwn(fontes, rel) ? fontes[rel] : ler(rel)).replace(/\r\n/g, '\n')
  const falhas = []
  const checa = (c, m) => { if (!c) falhas.push(m) }
  let painel, regras
  try { ({ painel, regras } = carregar(fontes)) } catch (e) { return ['não carrega: ' + e.message] }
  const html = (props) => { try { return renderToStaticMarkup(React.createElement(painel, { ...base, ...props })) } catch (e) { falhas.push('não desenha: ' + e.message); return '' } }
  const corpo = (h) => h.replace(/<style[\s\S]*?<\/style>/, '')
  const pn = fonte(PAINEL), sb = fonte(SIDEBAR)

  // ── 1. largura e tela de celular ──
  const creator = html({ plan: 'basic', credits: 34 })
  const larg = /width:min\((\d+)px,calc\(100vw - (\d+)px\)\)/.exec(creator)
  checa(larg && +larg[1] >= 320 && +larg[1] <= 360, 'largura entre 320 e 360 px: ' + (larg?.[1] ?? 'sem regra'))
  checa(larg && +larg[2] >= 16 && +larg[2] <= 32, 'em tela estreita o menu cabe em 100vw menos a margem')
  checa(/max-height:calc\(100dvh - \d+px\)/.test(creator) && /\.kmc\{[^}]*overflow-y:auto/.test(creator), 'tela baixa: rola por dentro em vez de cortar')
  checa(/@media\(max-width:767px\)\{[\s\S]*?\.kmc\{left:12px/.test(creator), 'celular: regra própria de posição')
  checa(/@media\(max-width:767px\)\{[\s\S]*?\.kmc-row\{min-height:44px\}/.test(creator), 'celular: linha com 44 px de toque')
  checa(/\.kmc a:focus-visible,\.kmc button:focus-visible,\.kmc select:focus-visible\{outline:2px solid var\(--accent\)/.test(creator), 'foco visível em link, botão e seletor')
  const css = /<style[^>]*>([\s\S]*?)<\/style>/.exec(creator)?.[1] ?? ''
  checa(css.length > 0 && !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css), 'CSS só com tokens do tema, nenhuma cor fixa')
  checa(/\.kmc\{[^}]*z-index:(\d+)/.test(css) && +/\.kmc\{[^}]*z-index:(\d+)/.exec(css)[1] > 71, 'acima das faixas de instalar e notificação e da barra do celular')

  // ── 2. linhas e destinos, na ordem ──
  const achados = [...corpo(creator).matchAll(/<a href="([^"]+)" class="kmc-row[^"]*">[\s\S]*?<span>([^<]+)<\/span><\/a>/g)].map((m) => [m[2], m[1]])
  checa(JSON.stringify(achados) === JSON.stringify([['Upgrade', '/pricing'], ...LINHAS]), 'linhas e destinos: ' + JSON.stringify(achados))
  const semCss = corpo(creator)
  const iLingua = semCss.indexOf('kineo-interface-language')
  const iAparencia = semCss.indexOf('appearance-settings-row')
  const iSair = semCss.indexOf('kmc-row-out')
  const iUltimoLink = semCss.indexOf('/affiliate')
  checa(iUltimoLink > 0 && iLingua > iUltimoLink && iAparencia > iLingua && iSair > iAparencia, 'ordem: links, Language, Appearance, Sign out')
  checa(iSair > 0 && !/<a |<button|<select/.test(semCss.slice(iSair)), 'nada depois de Sign out')
  checa(/<select class="kineo-interface-language"[\s\S]*?English/.test(creator), 'Language reaproveita o seletor da casa')
  checa(pn.includes('<InterfaceLanguageSelect />') && pn.includes('<AppearanceSettingsButton compact={false}'), 'usa os componentes existentes de língua e aparência')
  checa(corpo(creator).includes('Maria') && corpo(html({ displayName: '', email: 'a@b.co' })).includes('a@b.co'), 'nome, ou e-mail quando não há nome')
  checa(/data-clarity-mask="true"[^>]*>Maria/.test(creator), 'identidade continua mascarada na gravação de sessão')

  // ── 3. sem top-up, sem comunidade, sem membros, sem preço ──
  const planos = ['free', 'starter', 'basic', 'pro', 'business', 'autopilot', null].map((plan) => corpo(html({ plan })))
  for (const h of planos) {
    checa(!/top.?up|buy more|credit pack|\/checkout|pack=/i.test(h), 'nenhum caminho para top-up')
    checa(!/communit|discord|add members|\/team|members/i.test(h), 'sem comunidade e sem membros')
    checa(!/[$€£]\s*\d|R\$|\/mo\b/.test(h), 'sem preço no menu')
    checa(!/\/library|storage|projects/i.test(h), 'biblioteca e armazenamento viraram só "My videos"')
  }
  checa(!/canPurchaseCreditTopup|onBuyCredits|CreditsTopupModal/.test(pn), 'o painel não conhece top-up')

  // ── 4. crédito, plano, Upgrade ──
  checa(/<b class="kmc-credits-n">34<\/b><span class="kmc-credits-of">\/ 150<\/span>/.test(creator) && /kmc-bar/.test(corpo(creator)), 'Creator: número, grant e barra')
  const free = corpo(html({ plan: 'free', credits: 12 }))
  checa(/kmc-credits-n">12</.test(free) && !/kmc-bar/.test(free) && !/kmc-credits-of">\//.test(free), 'grátis: só o número, sem barra nem denominador')
  checa(/kmc-plan[^>]*>Free</.test(free) && /href="\/pricing"/.test(free), 'grátis: plano e Upgrade')
  checa(/kmc-plan[^>]*>Starter</.test(html({ plan: 'starter' })) && /\/ 40</.test(html({ plan: 'starter', credits: 10 })), 'Starter é Starter, com o grant do Starter')
  for (const plan of ['pro', 'business', 'autopilot', 'autopilot_pilot', 'pro_trial', null, 'plano_que_nao_existe']) checa(!/href="\/pricing"/.test(html({ plan })), `sem Upgrade para ${plan}`)
  for (const plan of ['free', 'starter', 'basic', 'starter_trial', 'basic_trial']) checa(/href="\/pricing"/.test(html({ plan })), `com Upgrade para ${plan}`)
  checa(!/kmc-plan/.test(corpo(html({ plan: null }))) && !/kmc-plan/.test(corpo(html({ plan: 'plano_que_nao_existe' }))), 'plano desconhecido não vira "Free"')
  const cheio = corpo(html({ plan: 'pro', credits: 1489 }))
  checa(/kmc-credits-n">1489</.test(cheio) && !/\/ 470/.test(cheio) && /width:100%/.test(cheio), 'acima do grant: barra cheia, sem "1489 / 470"')
  const lendo = corpo(html({ credits: null }))
  checa(/kmc-credits-n">…</.test(lendo) && !/kmc-bar/.test(lendo), 'saldo ainda não lido: reticências, sem barra')
  const falha = corpo(html({ credits: null, creditsReadFailed: true }))
  checa(/Balance unavailable/.test(falha) && !/kmc-credits-n/.test(falha) && !/kmc-bar/.test(falha), 'leitura falhou: diz que falhou, nunca zero')
  checa(/credit left/.test(corpo(html({ credits: 1 }))) && !/credits left/.test(corpo(html({ credits: 1 }))), 'um crédito no singular')
  const mC = regras.accountCreditMeter
  checa(mC(0, 85).pct === 0 && mC(0, 85).low === true, '0 crédito: barra vazia e em alerta')
  checa(mC(4, 85).low === true && mC(40, 85).low === false, 'alerta de saldo baixo')
  checa(mC(12, null).pct === null && mC(12, null).of === null, 'sem grant não existe barra')

  // ── 5. renovação ──
  const R = regras.accountRenewalLine
  const f = (o) => ({ renewsAt: null, cancelsAtPeriodEnd: false, status: null, ...o })
  const iso = '2026-12-04T12:00:00.000Z'
  checa(R(null, true) === null, 'resposta pendente: calado')
  checa(R(f({ renewsAt: iso, status: 'active' }), true)?.kind === 'renews', 'ativa: data de renovação')
  checa(R(f({ renewsAt: iso, status: 'active' }), true)?.at?.toISOString() === iso, 'a data é a que a Stripe mandou (anual incluído)')
  checa(R(f({ renewsAt: iso, status: 'active', cancelsAtPeriodEnd: true }), true)?.kind === 'cancels', 'cancelada: diz que cancela')
  checa(R(f({ renewsAt: iso, status: 'past_due' }), true)?.kind === 'due' && R(f({ renewsAt: iso, status: 'unpaid' }), true)?.kind === 'due', 'cobrança recusada não diz "Renews"')
  checa(R(f({ renewsAt: iso, status: 'canceled' }), true) === null, 'assinatura encerrada não diz "Renews"')
  checa(R(f({}), true)?.kind === 'active', 'pago sem data (PayPal, Stripe fora): "Active subscription"')
  checa(R(f({}), false) === null, 'conta sem assinatura: nenhuma linha')
  checa(pn.includes("fetch('/api/me/subscription', { cache: 'no-store' })"), 'a data vem de /api/me/subscription')
  checa(/\{renewal && \(/.test(pn) && /href="\/account\?tab=billing"/.test(pn), 'cobrança a um clique, na linha da data')

  // ── 6. o que não pode voltar ──
  checa(pn.includes('createPortal(node, document.body)'), 'KINEO-PAINEL-PORTAL-2026-10-05: portal para o <body>')
  checa(/return portal\(/.test(pn) && pn.includes('KINEO-PAINEL-PORTAL-2026-10-05'), 'o menu passa pelo portal')
  checa(pn.includes('onClick={() => { if (!signingOut) onSignOut() }}') && !/onClose\(\); onSignOut\(\)/.test(pn), 'KINEO-SAIR-DA-CONTA-1510: Sign out não fecha o menu')
  checa(pn.includes('if (!signingOut) onClose()'), 'Esc e clique fora não fecham durante a saída')
  const saindo = corpo(html({ signingOut: true }))
  checa(/<button[^>]*disabled=""[^>]*>[\s\S]*Signing out…/.test(saindo) && !/>Sign out</.test(saindo), 'saída em curso: desligado, "Signing out…"')
  checa(/>Sign out</.test(corpo(creator)) && !/disabled=""/.test(corpo(creator)), 'em repouso: "Sign out" ligado')
  checa(/className="kmc-backdrop" onClick=\{dismiss\}/.test(pn), 'clique fora fecha')
  checa(/event\.key === 'Escape'\) \{ event\.preventDefault\(\); dismiss\(\)/.test(pn), 'Esc fecha')
  checa(pn.includes("document.querySelector('dialog[open]')"), 'Esc do seletor de aparência é dele')
  checa(/role="dialog" aria-modal="true"/.test(pn), 'semântica de diálogo')
  checa(/opener\.focus\(/.test(pn), 'foco volta para quem abriu')

  // ── 7. barra lateral e celular ──
  checa(/plan=\{accountPlan\}/.test(sb) && /setAccountPlan\(typeof data\?\.plan === 'string'/.test(sb), 'plano cru de /api/credits, não o achatado de /api/me/plan')
  checa(/const topupEligible = canPurchaseCreditTopup\(plan\)/.test(sb), 'o chip segue decidindo pelo estado antigo')
  checa(/creditsReadFailed=\{creditsReadFailed\}/.test(sb), 'falha de leitura chega ao menu')
  checa(!/onBuyCredits|storage=|api\/storage-usage/.test(sb), 'a barra lateral não carrega mais o medidor')
  checa(/onSignOut=\{handleSignOut\}\n\s*signingOut=\{signingOut\}/.test(sb) && /onNavigate=\{onClose\}/.test(sb), 'saída e fechamento da gaveta seguem ligados')
  checa(/aria-haspopup="dialog"/.test(sb) && /onClick=\{isLoggedIn \? \(\) => setSettingsOpen\(\(v\) => !v\) : undefined\}/.test(sb), 'a linha do usuário abre o menu e a engrenagem diz que abre diálogo')
  const shell = fonte('app/(dashboard)/DashboardShell.tsx')
  checa(/sidebarOpen && \(\s*<div className="md:hidden">\s*<Sidebar/.test(shell) && /onMenuToggle=\{\(\) => setSidebarOpen/.test(shell) && fonte('components/TopBar.tsx').includes('aria-label="Toggle menu"'), 'celular: o menu do topo abre a lateral com a linha do usuário')
  // A barra de baixo mora dentro da coluna z-10; a lateral (z-50) fica acima dela, então a engrenagem não some embaixo.
  checa(/relative z-10 min-w-0"[\s\S]*<MobileNav isLoggedIn=\{isLoggedIn\} \/>/.test(shell), 'celular: a barra de baixo não cobre a linha do usuário')

  // ── 8. destinos existem, tradução existe ──
  for (const arq of ['app/(dashboard)/history/page.tsx', 'app/(dashboard)/account/page.tsx', 'app/(dashboard)/affiliate/page.tsx', 'app/support/page.tsx', 'app/pricing/page.tsx']) checa(existsSync(join(ROOT, arq)), 'destino existe: ' + arq)
  const conta = fonte('app/(dashboard)/account/AccountClient.tsx')
  for (const aba of ['profile', 'billing', 'usage']) checa(conta.includes(`v === '${aba}'`), 'aba existe: ' + aba)
  checa(fonte('app/support/page.tsx').includes('mailto:support@usekineo.com'), '/support dá um caminho real de ajuda')
  const copia = JSON.parse(fonte('lib/ui/refinementCopy.json'))
  for (const chave of [...regras.ACCOUNT_MENU_LINKS.map((r) => r.label), 'Upgrade', 'Sign out', 'Signing out…', 'Billing', 'Renews', 'Cancels on', 'access until then', 'Payment issue — update your card', 'Active subscription', 'credits left', 'credit left', 'Balance unavailable', 'Account', 'Language', 'Appearance']) {
    for (const [lingua, tabela] of Object.entries(copia)) checa(typeof tabela[chave] === 'string' && tabela[chave].length > 0, `tradução de "${chave}" em ${lingua}`)
  }
  return falhas
}

// ─── execução ────────────────────────────────────────────────────────────────────────────────────────────────────
const verde = verificar()
if (verde.length) {
  console.log('FALHOU no código de verdade:')
  for (const m of verde) console.log('  ✗ ' + m)
}
let vermelhosErrados = 0
const mutante = (nome, rel, de, para) => {
  const texto = ler(rel)
  if (!texto.includes(de)) { vermelhosErrados++; console.log(`  ✗ mutante "${nome}": âncora sumiu (${de.slice(0, 50)})`); return }
  const r = verificar({ [rel]: texto.replace(de, para) })
  if (r.length === 0) { vermelhosErrados++; console.log(`  ✗ mutante "${nome}" passou`) }
  else console.log(`  ✓ mutante "${nome}" → vermelho (${r[0].slice(0, 90)})`)
}
const LINK = (id, href, label) => `{ id: '${id}', href: '${href}', label: '${label}', icon: 'M0 0' },`
mutante('largura de painel de novo', REGRAS, 'ACCOUNT_MENU_WIDTH_PX = 344', 'ACCOUNT_MENU_WIDTH_PX = 1240')
mutante('largura pequena demais', REGRAS, 'ACCOUNT_MENU_WIDTH_PX = 344', 'ACCOUNT_MENU_WIDTH_PX = 280')
mutante('sem caber no celular', PAINEL, 'calc(100vw - 24px));max-height', '1000px);max-height')
mutante('sem posição de celular', PAINEL, '.kmc{left:12px;', '.kmc{')
mutante('cor fixa no CSS', PAINEL, '.kmc-bar>span{display:block;height:100%;border-radius:99px;background:var(--accent)', '.kmc-bar>span{display:block;height:100%;border-radius:99px;background:#2997ff')
mutante('foco invisível', PAINEL, '.kmc a:focus-visible,.kmc button:focus-visible,.kmc select:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}', '')
mutante('botão de top-up de volta', PAINEL, 'href="/pricing" onClick={go}', 'href="/checkout?pack=topup40" onClick={go}')
mutante('rótulo de compra de crédito', PAINEL, "{t('Upgrade')}", "{'Buy more credits'}")
mutante('Help em outro destino', REGRAS, "href: '/support'", "href: '/help'")
mutante('My videos na biblioteca', REGRAS, "href: '/history'", "href: '/library'")
mutante('aba errada em Usage', REGRAS, "href: '/account?tab=usage'", "href: '/account'")
mutante('linha removida', REGRAS, `{ id: 'affiliate', href: '/affiliate', label: 'Affiliate program', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM14.8 9.2c-.5-1-1.5-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.5 5.8 4.5 0 1.3-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.6M12 6v12' },`, '')
mutante('Join Community inventado', REGRAS, "] as const", `${LINK('community', '/community', 'Join Community')}\n] as const`)
mutante('Add members inventado', REGRAS, "] as const", `${LINK('members', '/team', 'Add members')}\n] as const`)
mutante('sem seletor de língua', PAINEL, '<InterfaceLanguageSelect />', '')
mutante('sem aparência', PAINEL, `<AppearanceSettingsButton compact={false} className="kmc-row" />`, '')
mutante('Sign out fecha o menu', PAINEL, 'onClick={() => { if (!signingOut) onSignOut() }}', 'onClick={() => { onClose(); onSignOut() }}')
mutante('Sign out sem disabled', PAINEL, 'disabled={signingOut}', '')
mutante('sem "Signing out…"', PAINEL, "t(signingOut ? 'Signing out…' : 'Sign out')", "t('Sign out')")
mutante('Esc fecha durante a saída', PAINEL, 'if (!signingOut) onClose()', 'onClose()')
mutante('sem portal', PAINEL, 'return createPortal(node, document.body)', 'return node')
mutante('Esc não fecha', PAINEL, "if (event.key === 'Escape') { event.preventDefault(); dismiss(); return }", '')
mutante('clique fora não fecha', PAINEL, 'className="kmc-backdrop" onClick={dismiss}', 'className="kmc-backdrop"')
mutante('Upgrade para o topo', REGRAS, "new Set(['free',", "new Set(['pro', 'free',")
mutante('sem Upgrade para o grátis', REGRAS, "new Set(['free', ", 'new Set([')
mutante('plano desconhecido vira Free', REGRAS, 'PLAN_NAME[key] : null', "PLAN_NAME[key] : 'Free'")
mutante('barra inventada na conta grátis', PAINEL, 'accountCreditMeter(credits, grant)', 'accountCreditMeter(credits, grant ?? 100)')
mutante('denominador abaixo do saldo', REGRAS, 'of: credits <= grant ? grant : null', 'of: grant')
mutante('falha de leitura vira saldo', PAINEL, '{creditsReadFailed ? (', '{false ? (')
mutante('"Renews" com a cobrança recusada', REGRAS, "if (sub.status === 'past_due' || sub.status === 'unpaid') return { kind: 'due' }", '')
mutante('"Renews" para quem cancelou', REGRAS, "kind: sub.cancelsAtPeriodEnd ? 'cancels' : 'renews'", "kind: 'renews'")
mutante('barra lateral volta ao plano achatado', SIDEBAR, 'plan={accountPlan}', 'plan={plan}')
mutante('barra lateral sem saída em curso', SIDEBAR, 'signingOut={signingOut}', '')
mutante('barra lateral volta a buscar o medidor', SIDEBAR, 'const [settingsOpen, setSettingsOpen] = useState(false)', "const [settingsOpen, setSettingsOpen] = useState(false); fetch('/api/storage-usage')")

if (verde.length || vermelhosErrados) {
  console.log(`\nFALHOU: ${verde.length} verificação(ões) no código, ${vermelhosErrados} mutante(s) sem vermelho`)
  process.exit(1)
}
console.log('\nKINEO-MENU-CONTA-0411 verde: código confere e todos os mutantes ficam vermelhos')
