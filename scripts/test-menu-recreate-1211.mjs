// KINEO-MENU-RECREATE-1211 [fundador 12/11: "Falha muito grave, não tem o Recreate no menu inicial. Se você quiser entrar no Recreate e olhar
// tudo que você pode recriar, não tem."]. Trava: (1) "Recreate" é item de 1º nível no topo da home, logo depois de Cartoons, levando a /recreate;
// (2) os pares — menu do celular da home, lateral e "More" do celular do app, rodapé — também têm /recreate; (3) o /recreate do visitante
// mostra a grade com TODOS os modelos liberados (efeitos + trocas com swapApproved) e nenhum em teste; (4) a grade não tem nome de motor,
// preço, texto < 12 px nem vídeo que toca sozinho. Offline: lê o código e executa os módulos reais (TypeScript transpilado na hora).
// Uso: node scripts/test-menu-recreate-1211.mjs
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(ROOT, 'node_modules/typescript'))
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))
const read = p => readFileSync(join(ROOT, p), 'utf8')

function loader(stubs = {}, overrides = {}) {
  const cache = new Map()
  function load(p) {
    if (Object.hasOwn(stubs, p)) return stubs[p]
    if (p.endsWith('.css') || p === 'server-only') return {}
    if (!p.match(/\.(tsx?|json)$/)) p += existsSync(join(ROOT, p + '.ts')) ? '.ts' : '.tsx'
    if (cache.has(p)) return cache.get(p).exports
    if (p.endsWith('.json')) return JSON.parse(read(p))
    const mod = { exports: {} }; cache.set(p, mod)
    const req = name => {
      if (Object.hasOwn(stubs, name)) return stubs[name]
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(posix.normalize(posix.join(posix.dirname(p), name)))
      return require(require.resolve(name, { paths: [ROOT] }))
    }
    const src = overrides[p] ?? read(p)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: p }).outputText
    new Function('require', 'module', 'exports', 'process', js)(req, mod, mod.exports, process)
    return mod.exports
  }
  return load
}

// "Runway walk" é título de modelo (passarela), não o fornecedor: o fornecedor é pego como "Runway ML"/"Runway Gen".
const ENGINE_RX = /\b(seedance|kling|veo|minimax|hailuo|runway ?(ml|gen)|fal\.ai|fal-ai|pixverse|wan ?2|sora|nano banana|topaz|flux|h3 (turbo|max)|omni flash|bytedance|google)\b/i
const PRICE_RX = /(\$\s?\d|US\$|\bcredits?\b|✦|\/mo\b|per month)/i

function checks(o = {}) {
  let n = 0
  const ok = (c, m) => { assert.ok(c, m); n++ }
  const src = p => o[p] ?? read(p)

  // (1) Topo da home no computador: Recreate logo depois de Cartoons e antes do More.
  const landing = src('app/KineoLanding.tsx')
  const deskStart = landing.indexOf("<Link href={createEntryHref('film',")
  const deskEnd = landing.indexOf('<div className="nav-right">', deskStart)
  ok(deskStart > 0 && deskEnd > deskStart, 'achou o topo do computador')
  const desk = landing.slice(deskStart, deskEnd)
  const iCartoon = desk.indexOf('NOMES_DE_PRODUTO.cartoon.curto')
  const iRecreate = desk.search(/href=\{RECREATE_MENU_HREF\}[^>]*data-nav-item=\{RECREATE_MENU_NAV_ITEM\}/)
  const iMore = desk.indexOf('<PublicNavDropdown item="more:menu"')
  ok(iRecreate > 0, 'topo do computador: link Recreate com RECREATE_MENU_HREF')
  ok(iCartoon > 0 && iCartoon < iRecreate && iRecreate < iMore, 'topo do computador: Recreate logo depois de Cartoons e antes do More')
  const moreBlock = desk.slice(iMore, desk.indexOf('</PublicNavDropdown>', iMore))
  ok(!/RECREATE_MENU/.test(moreBlock), 'Recreate não está escondido dentro do More')
  ok(/\{RECREATE_MENU_LABEL\}/.test(desk.slice(iRecreate, iRecreate + 260)), 'topo do computador: rótulo do Recreate da fonte única')

  // (2a) Menu do celular da home: Recreate depois de Cartoons.
  const mobStart = landing.indexOf('className="nav-mobile-menu"')
  const mob = landing.slice(mobStart, landing.indexOf('</label>', mobStart))
  const mCartoon = mob.indexOf('NOMES_DE_PRODUTO.cartoon.curto')
  const mRecreate = mob.search(/href=\{RECREATE_MENU_HREF\}/)
  ok(mRecreate > 0 && mCartoon > 0 && mCartoon < mRecreate, 'menu do celular da home: Recreate depois de Cartoons')

  // Fonte única do item.
  const menu = loader({}, o)('lib/ui/homeRemodela2010')
  ok(menu.RECREATE_MENU_HREF === '/recreate' && menu.RECREATE_MENU_LABEL === 'Recreate', 'fonte única: Recreate → /recreate')
  ok(/^more:[a-z0-9_-]+$/.test(menu.RECREATE_MENU_NAV_ITEM), 'id de medição no contrato more:<id>')

  // (2b) App: lateral e "More" do celular.
  const nav = loader({}, o)('lib/ui/workspaceNavigation')
  ok(nav.RECREATE_NAV?.href === '/recreate' && nav.RECREATE_NAV.label === 'Recreate', 'app: RECREATE_NAV → /recreate')
  for (const clipsOn of [true, false]) {
    const items = nav.sidebarNavItems(clipsOn).map(i => i.href)
    ok(items.includes('/recreate') && items.indexOf('/recreate') === items.indexOf('/kids-cartoon') + 1, `lateral (clips ${clipsOn}): Recreate logo depois do Cartoon`)
  }
  ok(/RECREATE_NAV\.href/.test(src('components/MobileNav.tsx')) && src('components/MobileNav.tsx').indexOf('RECREATE_NAV.href') > src('components/MobileNav.tsx').indexOf('CARTOON_NAV.href'), 'More do celular do app: Recreate depois do Cartoon')
  ok(/sidebarNavItems\(/.test(src('components/Sidebar.tsx')), 'lateral do app desenha sidebarNavItems (onde o Recreate entrou)')
  ok(/recreate:\s*\(/.test(src('components/Sidebar.tsx')), 'lateral: ícone do Recreate existe (não cai em ícone vazio)')

  // (2c) Rodapé.
  ok(/href:\s*'\/recreate'/.test(src('components/Footer.tsx')), 'rodapé: lista de produto tem /recreate')

  // (3) Catálogo do visitante = todos os liberados, nenhum em teste.
  const load = loader({}, o)
  const { RECREATE_FORMATS } = load('lib/recreate/formats')
  const { publicRecreateCatalog } = load('lib/recreate/catalogPublic')
  const { RECREATE_RELEASE, RECREATE_SWAP_RELEASE } = load('lib/recreate/release')
  const items = publicRecreateCatalog()
  const ids = items.map(i => i.id)
  const approvedSwaps = RECREATE_FORMATS.filter(f => f.type === 'swap' && f.swapApproved === true).map(f => f.id)
  const unapproved = RECREATE_FORMATS.filter(f => f.type === 'swap' && f.swapApproved !== true).map(f => f.id)
  const effects = RECREATE_FORMATS.filter(f => f.type === 'effect').map(f => f.id)
  if (RECREATE_RELEASE === 'public') {
    ok(effects.every(id => ids.includes(id)), `catálogo: todos os ${effects.length} efeitos`)
    if (RECREATE_SWAP_RELEASE === 'public') ok(approvedSwaps.length > 0 && approvedSwaps.every(id => ids.includes(id)), `catálogo: as trocas aprovadas (${approvedSwaps.join(', ')})`)
  }
  ok(!ids.some(id => unapproved.includes(id)), 'catálogo: nenhuma troca em teste / não aprovada')
  ok(new Set(ids).size === ids.length, 'catálogo: sem repetido')
  // KINEO-M12-LIGA-1411 [CEO 14/11] — fluxo novo LIGADO: o cartão leva o visitante DIRETO ao próprio molde; a conta vem só no Generate.
  // Mutante "fluxo desligado" abaixo: a volta ao cadastro antes do molde fica vermelha aqui.
  ok(load('lib/recreate/flowRelease').RECREATE_FLOW_ENABLED === true && items.every(i => i.href === '/recreate/' + i.id), 'catálogo: cada cartão leva direto ao fluxo do próprio modelo (/recreate/<id>; conta no Generate)')
  ok(items.every(i => !i.video.startsWith('/api/') && !i.poster.startsWith('/api/')), 'catálogo: mídia pública (o /api/recreate/assets exige login)')
  ok(items.every(i => existsSync(join(ROOT, 'public', i.video.split('#')[0])) && existsSync(join(ROOT, 'public', i.poster))), 'catálogo: todo vídeo e pôster existe em public/')

  // (3b) A página: visitante vê a grade (não o cadastro direto); logado segue no RecreateClient.
  const page = src('app/recreate/page.tsx')
  ok(/RecreateCatalogPublic items=\{publicRecreateCatalog\(\)\}/.test(page), 'página: visitante recebe a grade pública')
  ok(!/redirect\('\/signup\?'/.test(page), 'página: o visitante não é mais jogado direto no cadastro')
  ok(/description:/.test(page) && /title:/.test(page), 'página: título e descrição')
  const html = renderToStaticMarkup(React.createElement(load('app/recreate/RecreateCatalogPublic').default, { items }))
  ok(items.every(i => html.includes(`data-recreate-card="${i.id}"`)), `grade renderizada: os ${items.length} cartões`)
  ok(!unapproved.some(id => html.includes(`data-recreate-card="${id}"`)), 'grade renderizada: nenhum modelo em teste')
  ok(html.includes('Recreate — put yourself in the clip'), 'grade renderizada: título')

  // (4) Regras de tela.
  const grid = src('app/recreate/RecreateCatalogPublic.tsx')
  const visible = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
  ok(!ENGINE_RX.test(visible), 'grade: nenhum nome de motor no texto')
  ok(!ENGINE_RX.test(grid.replace(/^\s*\/\/.*$/gm, '')), 'grade (fonte): nenhum nome de motor')
  ok(!PRICE_RX.test(visible) && !PRICE_RX.test(grid.replace(/^\s*\/\/.*$/gm, '')), 'grade: nenhum preço/crédito')
  ok(!/upload your own video/i.test(grid + page), 'grade: não promete subir vídeo próprio')
  const sizes = [...grid.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
  ok(sizes.length > 0 && sizes.every(s => s >= 12), `grade: nenhum texto abaixo de 12 px (${sizes.join(',')})`)
  ok(!/autoPlay|autoplay/.test(grid) && !/useEffect/.test(grid), 'grade: nenhum vídeo começa sozinho')
  ok(!/\bautoPlay\b/.test(html) && /preload="none"/.test(html), 'grade renderizada: sem autoplay, preload none')
  return n
}

const total = checks()
console.log(`ok — ${total} verificações`)

// Mutantes: cada um tem de ficar vermelho.
const L = read('app/KineoLanding.tsx')
const mutants = {
  'Recreate some do topo do computador': { 'app/KineoLanding.tsx': L.replace(/\n\s*<Link href=\{RECREATE_MENU_HREF\}[^\n]*KINEO-MENU-RECREATE-1211 — topo[^\n]*/, '') },
  'Recreate vai para dentro do More': { 'app/KineoLanding.tsx': L.replace('<span className="nd-menu nd-more">', '<span className="nd-menu nd-more"><Link href={RECREATE_MENU_HREF} data-nav-item={RECREATE_MENU_NAV_ITEM}>{RECREATE_MENU_LABEL}</Link>') },
  'troca em teste aparece na grade': { 'lib/recreate/catalogPublic.ts': read('lib/recreate/catalogPublic.ts').replace('.filter(f => publicRecreatePath(f.id) !== null)', '') },
  'preço no cartão': { 'app/recreate/RecreateCatalogPublic.tsx': read('app/recreate/RecreateCatalogPublic.tsx').replace('Recreate ↗</span>', 'Recreate ↗ 40 credits</span>') },
  'texto de 10 px': { 'app/recreate/RecreateCatalogPublic.tsx': read('app/recreate/RecreateCatalogPublic.tsx').replace('font-size:15px', 'font-size:10px') },
  'vídeo toca sozinho': { 'app/recreate/RecreateCatalogPublic.tsx': read('app/recreate/RecreateCatalogPublic.tsx').replace('muted loop playsInline', 'muted loop autoPlay playsInline') },
  'lateral sem Recreate': { 'lib/ui/workspaceNavigation.ts': read('lib/ui/workspaceNavigation.ts').replace('CARTOON_NAV, RECREATE_NAV, ...last', 'CARTOON_NAV, ...last') },
  'fluxo novo desligado (cartão volta ao cadastro antes do molde)': { 'lib/recreate/flowRelease.ts': read('lib/recreate/flowRelease.ts').replace('RECREATE_FLOW_ENABLED = true', 'RECREATE_FLOW_ENABLED = false') }, // KINEO-M12-LIGA-1411
  'visitante volta a ir direto ao cadastro': { 'app/recreate/page.tsx': read('app/recreate/page.tsx').replace('<RecreateCatalogPublic items={publicRecreateCatalog()} />', "redirect('/signup?')") },
}
let red = 0
for (const [name, o] of Object.entries(mutants)) {
  const changed = Object.entries(o).some(([p, s]) => s !== read(p))
  assert.ok(changed, `mutante sem efeito (âncora velha): ${name}`)
  try { checks(o); console.log(`  ✗ mutante sobreviveu: ${name}`) } catch { red++ }
}
assert.equal(red, Object.keys(mutants).length, `${red}/${Object.keys(mutants).length} mutantes vermelhos`)
console.log(`ok — ${red}/${Object.keys(mutants).length} mutantes vermelhos`)
