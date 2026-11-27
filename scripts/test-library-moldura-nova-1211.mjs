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
  'react': React,
  '@/lib/auth/readServerVisibility': { readServerVisibility: async () => null },
  '@/components/billing/BuyCreditsEntry': { __esModule: true, default: ({ surface }) => React.createElement('button', { 'data-kineo': 'buy-credits-entry', 'data-surface': surface }, 'Buy credits') },
  '@/components/NavCreditsBadge': { __esModule: true, default: () => React.createElement('span', null, '120 credits') },
  '@/app/recreate/recreate.css': {}, './create.css': {}, './studio-panel.css': {},
}

async function all(o = {}) {
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
  // KINEO-CLIP-RECREATE-JUNTOS-1511 — reancorado: a régua da aba Recreate é a MESMA do /create (lib/create/access.ts createShellDecision → abaRecreateVisivel).
  const navLoader = loader(stubs, o)
  const nav = navLoader('lib/create/useCreateNavigationVisibility')
  const clipAccess = navLoader('lib/create/clipNaMoldura')
  const recreateAccess = navLoader('lib/create/clipRecreateJuntos')
  const visibilityRoute = src('app/api/account/create-visibility/route.ts')
  const sameRule = s.includes('useCreateNavigationVisibility(userEmail)') &&
    /<CreateMolduraTopo showRecreate=\{navigation\.showRecreate\} showClip=\{navigation\.showClip\} \/>/.test(ramo[1]) &&
    src('lib/create/useCreateNavigationVisibility.ts').includes("readServerVisibility('/api/account/create-visibility')") &&
    visibilityRoute.includes('abaRecreateVisivel(user?.email)') &&
    src('app/(dashboard)/ads/v2/AdsV2Workspace.tsx').includes('showRecreate: abaRecreateVisivel(user?.email)') &&
    src('app/(dashboard)/ads/v2/AdsV2Workspace.tsx').includes('{...navigation}') &&
    src('app/create/[tab]/page.tsx').includes('showRecreate={abaRecreateVisivel(quem.email)')
  const accounts = [
    { email: 'josephsskaf@gmail.com', showClip: true, showRecreate: false }, // conta interna; os interruptores vigentes estão públicos
    { email: 'creator@example.test', showClip: true, showRecreate: false }, // conta externa; planos free e pagos seguem a mesma regra de navegação
    { email: null, showClip: false, showRecreate: true }, // visitante não ganha a aba Clip
  ]
  const tabsMatch = accounts.every(({ email, showClip, showRecreate }) => {
    const flags = nav.publicCreateNavigation(email)
    const serverFlags = { showClip: clipAccess.clipNaMolduraVisivel(email), showRecreate: recreateAccess.abaRecreateVisivel(email) }
    const actualHtml = renderToStaticMarkup(React.createElement(T.default, flags))
    const actualTabs = [...actualHtml.matchAll(/data-create-tab="([^"]+)"/g)].map(m => m[1])
    const expectedTabs = ['film', ...(showClip ? ['clip'] : []), 'cartoon', 'ads', 'image', ...(showRecreate ? ['recreate'] : [])]
    return flags.showClip === showClip && flags.showRecreate === showRecreate &&
      serverFlags.showClip === showClip && serverFlags.showRecreate === showRecreate &&
      JSON.stringify(actualTabs) === JSON.stringify(expectedTabs)
  })
  const hookState = []
  let hookCursor = 0
  const hookReact = {
    useState(initial) {
      const i = hookCursor++
      if (!(i in hookState)) hookState[i] = typeof initial === 'function' ? initial() : initial
      return [hookState[i], next => { hookState[i] = typeof next === 'function' ? next(hookState[i]) : next }]
    },
    useEffect(effect) { effect() },
  }
  const privateLoader = loader({
    ...stubs,
    react: hookReact,
    './release': { CREATE_SHELL_RELEASE: 'public', CLIP_RECREATE_JUNTOS_RELEASE: 'internal' },
    '@/lib/auth/readServerVisibility': { readServerVisibility: async () => ({ showClip: false, showRecreate: true }) },
  }, o)
  const hook = privateLoader('lib/create/useCreateNavigationVisibility')
  const privateFlags = () => {
    hookCursor = 0
    return hook.useCreateNavigationVisibility('creator@example.test')
  }
  privateFlags()
  await Promise.resolve()
  await Promise.resolve()
  const verifiedPrivateFlags = privateFlags()
  ok(sameRule && tabsMatch && verifiedPrivateFlags.showClip === false && verifiedPrivateFlags.showRecreate === true, 'Library, Ads e /create usam a mesma régua; abas reais e leitura privada independente conferidas')
  // 4) Nenhum texto da Library abaixo de 12 px.
  const lib = src(LIB)
  const peq = [...lib.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}])|text-\[(\d+(?:\.\d+)?)px\]|font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1] ?? m[2] ?? m[3])).filter(v => v < 12)
  ok(peq.length === 0, `Library: letra abaixo de 12 px → ${peq.join(', ')}`)
  ok(/\.library-organization small\{font-size:12px;/.test(src(CSS)), '"Favorites are saved in this browser" a 12 px')
}

await all()
const real = passed
const r = p => read(p)
const mutants = [
  ['Library volta para a casca velha', ROTAS, r(ROTAS).replace("export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library']", 'export const MOLDURA_TOPO_ROTAS: readonly string[] = []')],
  ['C sem decisão do dono (Images também)', ROTAS, r(ROTAS).replace("export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library']", "export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library', '/images']")],
  ['aba Film marcada na Library', TOPO, r(TOPO).replace('<CreateTabs active={active}', "<CreateTabs active={'film'}")],
  ['assinante perde o Buy credits', TOPO, r(TOPO).replace(/<BuyCreditsLink surface=\{surface\}[^>]*\/>/, '')],
  ['ramo monta a lateral', SHELL, r(SHELL).replace('<CreateMolduraTopo showRecreate', '<Sidebar /><CreateMolduraTopo showRecreate')],
  ['ofertas somem da Library', SHELL, r(SHELL).replace(/(if \(usaMolduraNova\(pathname\)\) return \([\s\S]*?)\s*<AnnualWelcomeBar initial=\{annualWelcomeBar\} placement="app" \/>/, '$1')],
  ['ramo depois da lateral (nunca roda)', SHELL, r(SHELL).replace('  if (usaMolduraNova(pathname)) return (', '  if (false && usaMolduraNova(pathname)) return (').replace('<Sidebar', '<Sidebar').replace('{/* Desktop sidebar spacer', '{/* Desktop sidebar spacer') + ''],
  ['Library usa showClip no lugar de showRecreate', 'lib/create/useCreateNavigationVisibility.ts', r('lib/create/useCreateNavigationVisibility.ts').replace('showRecreate: result?.showRecreate === true', 'showRecreate: result?.showClip === true')],
  ['Favorites volta a 11 px', CSS, r(CSS).replace('.library-organization small{font-size:12px;', '.library-organization small{font-size:11px;')],
]
let bitten = 0
for (const [name, f, v] of mutants) {
  if (v === r(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { await all({ [f]: v }) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-library-moldura-nova-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
