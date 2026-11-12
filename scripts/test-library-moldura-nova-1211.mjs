// KINEO-LIBRARY-MOLDURA-NOVA-1211 [fundador 12/11: "a Library está voltando no fluxo antigo… o menu da esquerda não é um menu novo"; opção B]:
// a /library abre na moldura da tela nova (cabeçalho da CreateShell: marca, abas, créditos, "My videos ↗"), sem a lateral nem a barra de
// baixo antigas; as ofertas da casca seguem; nenhum texto abaixo de 12 px. Offline: renderiza o cabeçalho real e lê a casca.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const TOPO = 'components/create/CreateMolduraTopo.tsx'
const ROTAS = 'lib/create/molduraNova.ts'
const SHELL = 'app/(dashboard)/DashboardShell.tsx'
const LIB = 'app/(dashboard)/library/LibraryClient.tsx'
const CSS = 'app/appearance.css'
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const stubs = {
  'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) },
  '@/components/billing/BuyCreditsEntry': { __esModule: true, default: ({ surface }) => React.createElement('button', { 'data-kineo': 'buy-credits-entry', 'data-surface': surface }, 'Buy credits') },
  '@/components/NavCreditsBadge': { __esModule: true, default: () => React.createElement('span', null, '120 credits') },
  '@/app/recreate/recreate.css': {}, './create.css': {}, './studio-panel.css': {},
}

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  const T = loader(stubs, o)(TOPO.replace(/\.tsx$/, ''))
  const R = loader(stubs, o)(ROTAS.replace(/\.ts$/, ''))
  // 1) Quais rotas moram na moldura nova: a Library (e o que estiver dentro dela), nada mais por enquanto.
  ok(R.usaMolduraNova('/library') && R.usaMolduraNova('/library/abc'), '/library na moldura nova')
  ok(!R.usaMolduraNova('/images') && !R.usaMolduraNova('/libraryx') && !R.usaMolduraNova('/'), 'as outras telas seguem na casca de sempre (decisão do dono para a C)')
  // 2) O cabeçalho é o da tela nova: abas sem nenhuma marcada, créditos, "My videos ↗", e o "Buy credits" do assinante.
  const html = renderToStaticMarkup(React.createElement(T.default, { showRecreate: true, showClip: true }))
  ok(html.includes('class="rc-nav ct-nav"') && html.includes('class="ct-tabs"'), 'cabeçalho e abas da tela nova')
  ok(!html.includes('ct-tab-active') && !html.includes('aria-current'), 'nenhuma aba marcada (a Library não é aba de criar)')
  ok(html.includes('data-create-nav="videos"') && html.includes('href="/library"'), '"My videos ↗" leva à própria Library')
  ok(html.includes('data-kineo="buy-credits-entry"') && html.includes('data-surface="library_top"'), 'o assinante pago segue com "Buy credits"')
  ok(!/\$\d|US\$|Kling|Seedance|MiniMax|Veo/.test(html), 'sem preço e sem nome de motor no cabeçalho')
  // 3) A casca: na Library, volta ANTES da lateral; leva as ofertas; não monta lateral nem barra de baixo.
  const s = src(SHELL)
  const ramo = s.match(/if \(usaMolduraNova\(pathname\)\) return \(([\s\S]*?)\n  \)\n/)
  ok(ramo, 'o ramo da moldura nova existe')
  ok(s.indexOf('if (usaMolduraNova(pathname))') < s.indexOf('<Sidebar'), 'a Library volta antes de montar a lateral')
  ok(!/<Sidebar|<MobileNav|<TopBar/.test(ramo[1]), 'na Library: sem lateral, sem barra de baixo, sem o topo antigo')
  ok(/<CreateMolduraTopo /.test(ramo[1]) && /<AnnualWelcomeBar /.test(ramo[1]) && /<BlackFridayBanner /.test(ramo[1]) && /<Creator30OfferModal \/>/.test(ramo[1]) && /<WelcomeOfferModal /.test(ramo[1]), 'na Library: cabeçalho novo + as ofertas da casca')
  ok(/showRecreate=\{recreateVisible\(userEmail\)\} showClip=\{clipNaMolduraVisivel\(userEmail\)\}/.test(ramo[1]), 'as mesmas abas que a pessoa vê no /create')
  // 4) Nenhum texto da Library abaixo de 12 px.
  const lib = src(LIB)
  const peq = [...lib.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}])|text-\[(\d+(?:\.\d+)?)px\]|font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1] ?? m[2] ?? m[3])).filter(v => v < 12)
  ok(peq.length === 0, `Library: letra abaixo de 12 px → ${peq.join(', ')}`)
  ok(/\.library-organization small\{font-size:12px;/.test(src(CSS)), '"Favorites are saved in this browser" a 12 px')
}

all()
const real = passed
const r = p => read(p)
const mutants = [
  ['Library volta para a casca velha', ROTAS, r(ROTAS).replace("export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library']", 'export const MOLDURA_TOPO_ROTAS: readonly string[] = []')],
  ['C sem decisão do dono (Images também)', ROTAS, r(ROTAS).replace("export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library']", "export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library', '/images']")],
  ['aba Film marcada na Library', TOPO, r(TOPO).replace('<CreateTabs active={null}', "<CreateTabs active={'film'}")],
  ['assinante perde o Buy credits', TOPO, r(TOPO).replace(/\s*<BuyCreditsLink surface=\{surface\}[^\n]*/, '')],
  ['ramo monta a lateral', SHELL, r(SHELL).replace('<CreateMolduraTopo showRecreate', '<Sidebar /><CreateMolduraTopo showRecreate')],
  ['ofertas somem da Library', SHELL, r(SHELL).replace(/(if \(usaMolduraNova\(pathname\)\) return \([\s\S]*?)\s*<AnnualWelcomeBar initial=\{annualWelcomeBar\} placement="app" \/>/, '$1')],
  ['ramo depois da lateral (nunca roda)', SHELL, r(SHELL).replace('  if (usaMolduraNova(pathname)) return (', '  if (false && usaMolduraNova(pathname)) return (').replace('<Sidebar', '<Sidebar').replace('{/* Desktop sidebar spacer', '{/* Desktop sidebar spacer') + ''],
  ['Favorites volta a 11 px', CSS, r(CSS).replace('.library-organization small{font-size:12px;', '.library-organization small{font-size:11px;')],
]
let bitten = 0
for (const [name, f, v] of mutants) {
  if (v === r(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all({ [f]: v }) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-library-moldura-nova-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
