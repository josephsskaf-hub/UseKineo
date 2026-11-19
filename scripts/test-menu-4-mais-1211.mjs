// KINEO-MENU-4-MAIS-1211 + KINEO-NOMES-DE-PRODUTO-1211 [CEO 12/11; tabela de nomes aprovada pelo fundador 11/11 ~21:00; o menu é a opção C
// da imagem div1-t4-decisao-ABC.png, a escolha final é do fundador]. No cabeçalho do computador: os 4 produtos com o nome curto de UMA fonte,
// Decisão de 19/11 às 19:38: Made with Kineo direto e Pricing na lista, imediatamente após Claude & ChatGPT. Menu compacto mantém Pricing. Nada que o ChatGPT
// cita sai ("AI Faceless Videos" e a frase dos cartões seguem). Offline: lê o código e executa a fonte dos nomes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(ROOT, 'node_modules/typescript'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LAND = 'app/KineoLanding.tsx', NOMES = 'lib/ui/nomesDeProduto.ts', UGC = 'components/NavUgcAdsLink.tsx', COPY = 'lib/ui/refinementCopy.json'
const HEADER = 'components/PublicSiteHeader.tsx', APPEARANCE = 'app/appearance.css'
const pricingLink = '<Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>'
const pricingTop = `${pricingLink}{/* KINEO-PRICING-NO-MENU-1911 */}`
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const mod = src => { const m = { exports: {} }; new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports); return m.exports }

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  // 1) A tabela aprovada, de uma fonte; longo = "AI " + curto.
  const N = mod(src(NOMES))
  ok(JSON.stringify(N.NOMES_DE_PRODUTO) === JSON.stringify({ film: { curto: 'Films', longo: 'AI Films' }, product_ads: { curto: 'Product Ads', longo: 'AI Product Ads' }, ugc_ads: { curto: 'UGC Ads', longo: 'AI UGC Ads' }, cartoon: { curto: 'Cartoons', longo: 'AI Cartoons' } }), 'a tabela é a aprovada pelo fundador')
  for (const v of Object.values(N.NOMES_DE_PRODUTO)) ok(v.longo === 'AI ' + v.curto, `longo = "AI " + curto (${v.curto})`)
  // 2) Cabeçalho do computador.
  const l = src(LAND)
  const topo = l.slice(l.indexOf('<div className="nav-links" data-nav-surface="top"'), l.indexOf('<div className="nav-right">'))
  const direita = l.slice(l.indexOf('<div className="nav-right">'), l.indexOf('id="mobile-nav-menu"'))
  const cel = l.slice(l.indexOf('id="mobile-nav-menu"'), l.indexOf('id="mobile-nav-menu"') + 4000)
  ok(topo.length > 500 && direita.length > 100, 'blocos do cabeçalho achados')
  ok(topo.includes("<Link href={createEntryHref('film', '/studio?intent_campaign=nav_door', isSignedIn)} data-nav-item=\"video\" className=\"nav-primary\"><UiLabel>{NOMES_DE_PRODUTO.film.curto}</UiLabel></Link>"), 'topo: Films (fonte única)')
  ok(!topo.includes('<PublicNavDropdown item="video"') && !topo.includes('NavEngineItem') && !topo.includes('nav_mega'), 'topo: Films abre direto, sem submenu e sem motor (KINEO-FILMS-DIRETO-1311)')
  ok(topo.includes('<UiLabel>{NOMES_DE_PRODUTO.product_ads.curto}</UiLabel>') && topo.includes('label={NOMES_DE_PRODUTO.ugc_ads.curto}') && topo.includes('<UiLabel>{NOMES_DE_PRODUTO.cartoon.curto}</UiLabel>'), 'topo: Product Ads, UGC Ads e Cartoons (fonte única)')
  ok(!/<UiLabel>(?:Make a film|Product ads|AI UGC Ads|AI Cartoon Videos)<\/UiLabel>|label="Make a film"/.test(topo + cel), 'nenhum nome antigo escrito à mão no cabeçalho')
  ok(!topo.includes('<PublicNavDropdown'), 'links diretos no topo')
  ok(topo.split('href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}').length === 2, 'Made with Kineo direto uma única vez')
  ok(topo.includes('href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}'), 'conector direto no topo')
  const navIds = [...topo.matchAll(/data-nav-item=("[^"]+"|\{[A-Z_]+\})/g)].map(m => m[1])
  ok(JSON.stringify(navIds) === JSON.stringify(['"video"', '"business"', '"more:ugc"', '{MENU_CARTOON_NAV_ITEM}', '{RECREATE_MENU_NAV_ITEM}', '{MADE_WITH_KINEO_NAV_ITEM}', '{MENU_CONNECTOR_NAV_ITEM}', '"pricing"']), 'ordem exata do menu da home, com Pricing após o conector')
  ok(topo.split(pricingLink).length === 2 && !direita.includes('data-nav-item="pricing"'), 'Pricing usa o estilo dos links da lista e não aparece à direita')
  // 3) Celular: os mesmos lugares, só os nomes; Pricing e Claude & ChatGPT seguem lá.
  ok(cel.includes('data-nav-item="video"><UiLabel>{NOMES_DE_PRODUTO.film.curto}</UiLabel>') && cel.split(pricingLink).length === 2 && cel.indexOf('MENU_CONNECTOR_HREF') < cel.indexOf(pricingLink), 'menu compacto: nomes, Pricing e conector no lugar')
  ok(src(UGC).includes("label = 'AI UGC Ads'") && src(UGC).includes('<UiLabel>{label}</UiLabel>'), 'NavUgcAdsLink: /examples e /trending seguem com "AI UGC Ads" (padrão)')
  // 4) 16 línguas, sem cair no inglês fora do inglês.
  const j = JSON.parse(src(COPY))
  ok(Object.keys(j).length === 16, '16 línguas')
  for (const [lang, d] of Object.entries(j)) for (const k of ['Films', 'Product Ads', 'UGC Ads', 'Cartoons', 'More']) ok(typeof d[k] === 'string' && d[k].length > 1, `${lang}: "${k}" traduzido`)
  ok(j.pt.Films === 'Filmes' && j.pt.More === 'Mais' && j.es.Cartoons === 'Dibujos', 'traduções conferidas (pt/es)')
  // 5) Nada que o ChatGPT cita sai: o título "AI Faceless Videos" e a frase do cartão seguem na home (fora deste commit).
  ok(read('lib/ui/homeThreeCards.ts').includes("films: { title: 'AI Faceless Videos'"), '"faceless" segue no cartão da home')
}

function cabecalhoAtivo(overrides = {}) {
  const stubs = {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/KineoBolt': { KineoBrandIcon: () => null },
    '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children },
    '@/components/NavUgcAdsLink': { __esModule: true, default: () => null },
    '@/components/SiteSettingsMenu': { __esModule: true, default: () => null },
  }
  const Component = loader(stubs, overrides)(HEADER).default
  for (const [currentPath, id] of [['/made-with-kineo', 'more:made-with-kineo'], ['/pricing', 'pricing'], ['/recreate', 'more:recreate'], ['/ai-kids-cartoon-videos', 'more:cartoon'], ['/for-creators', null]]) {
    const html = renderToStaticMarkup(React.createElement(Component, { currentPath }))
    for (const surface of ['top', 'mobile']) {
      const links = html.match(new RegExp(`data-nav-surface="${surface}"[^>]*>([\\s\\S]*?)<\\/(?:div|label)>`))?.[1] ?? ''
      const active = [...links.matchAll(/<a\b[^>]*data-nav-item="([^"]+)"[^>]*aria-current="page"[^>]*>/g)].map(match => match[1])
      ok(links.includes('data-nav-item="video"') && JSON.stringify(active) === JSON.stringify(id === null ? [] : [id]), `${currentPath} (${surface}): só a página atual tem aria-current`)
      ok(!links.includes('kpn-primary'), `${currentPath} (${surface}): nenhum destaque aplicado por categoria`)
    }
  }
  const css = overrides[APPEARANCE] ?? read(APPEARANCE)
  ok(/\[data-public-site-header\] \.kpn-links a\[aria-current=page\]::after\{content:'';[^}]*background:var\(--indigo\)\}/.test(css), 'sublinhado público vinculado à página atual e ao token do tema')
}

all()
cabecalhoAtivo()
const real = passed
const r = p => read(p)
const mutants = [
  ['Claude & ChatGPT vai para o More (opção B)', LAND, r(LAND).replace(/(\n\s*<Link href=\{MENU_CONNECTOR_HREF\} data-nav-item=\{MENU_CONNECTOR_NAV_ITEM\} className="nav-connector">[^\n]*)\n/, '\n').replace('                <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}>', '                <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>x</Link>\n                <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}>')],
  ['Made with Kineo volta ao submenu', LAND, r(LAND).replace('<Link href={MADE_WITH_KINEO_HREF}', '<PublicNavDropdown item="more:menu" label="More"><Link href={MADE_WITH_KINEO_HREF}')],
  ['nome antigo volta à mão', LAND, r(LAND).replace('data-nav-item="video" className="nav-primary"><UiLabel>{NOMES_DE_PRODUTO.film.curto}</UiLabel>', 'data-nav-item="video" className="nav-primary"><UiLabel>Make a film</UiLabel>')], // KINEO-FILMS-DIRETO-1311 — alvo novo: Films é um link direto
  ['Pricing volta para a direita', LAND, r(LAND).replace(pricingTop, '').replace('<div className="nav-right">', `<div className="nav-right">${pricingLink}`)],
  ['Pricing some no menu compacto', LAND, r(LAND).replace(`${pricingLink}\n`, '')],
  ['tabela muda', NOMES, r(NOMES).replace("cartoon: { curto: 'Cartoons', longo: 'AI Cartoons' }", "cartoon: { curto: 'Cartoon', longo: 'AI Cartoon Videos' }")],
  ['tradução em português some', COPY, r(COPY).replace('"Films": "Filmes",', '')],
  ['UGC muda em todo o site', UGC, r(UGC).replace("label = 'AI UGC Ads'", "label = 'UGC Ads'")],
  ['Films sempre fica ativo', HEADER, r(HEADER).replace('data-nav-item="video"', 'data-nav-item="video" aria-current="page"')],
  ['Films volta a ter o sublinhado de categoria', HEADER, r(HEADER).replace('data-nav-item="video"', 'data-nav-item="video" className="kpn-primary"')],
  ['o sublinhado ignora a página atual', APPEARANCE, r(APPEARANCE).replace('a[aria-current=page]::after', 'a::after')],
]
let bitten = 0
for (const [name, f, v] of mutants) {
  if (v === r(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { (f === HEADER || f === APPEARANCE ? cabecalhoAtivo : all)({ [f]: v }) } catch (error) {
    assert.equal(error.code, 'ERR_ASSERTION', `mutante deve falhar por uma asserção: ${name}`)
    died = true
  }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-menu-4-mais-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
