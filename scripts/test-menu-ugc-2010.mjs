// KINEO-MENU-UGC-2010 — guardião do item "AI UGC Ads" no menu do topo do site (fundador 20/10: "o 2 no menu no topo, sim").
//
// O QUE ELE PROVA (lendo os arquivos reais, EXECUTANDO a lib pura num vm e comparando com a base no git):
//   L. destino pela língua: português → /anuncios-ugc-com-ia; as outras 15 línguas (e língua ausente) → /ai-ugc-ads; as 2 páginas existem;
//   C. componente: cliente, lê a língua do provedor, rótulo autoral "AI UGC Ads" pelo UiLabel, repassa o data-nav-item, sem preço;
//   T. o rótulo nas 16 línguas (EN "AI UGC Ads", PT "Anúncios UGC com IA", ES "Anuncios UGC con IA"; nenhuma outra em inglês cru);
//   H. topo da home: o item entra LOGO DEPOIS de "Product ads", com o visual dos itens de texto (sem nav-primary), e o menu antigo segue
//      INTEIRO, na MESMA ordem e com os MESMOS nomes (nova lista − o item = lista da base; contagem = base + 1);
//   P. celular da home, /examples e /trending: a mesma regra em cada menu;
//   N. medição: data-nav-item="more:ugc" cabe no contrato do nav_item_clicked sem mexer no enum; menus do app (Sidebar, MobileNav,
//      workspaceNavigation) intocados — não são o menu público;
//   D. desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado como camada mais nova (semUgcAjustes2010 chama este primeiro),
//      toda linha nova com a marca, o diff só toca a lista e os novos, todo commit com a marca no assunto;
//   M. mutantes: cada regra acima fica vermelha quando a quebramos de propósito (aplicação provada antes de medir).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  semMenuUgc2010, desfazMenuUgc2010, MARCA_MENU_UGC_2010, MENU_UGC_2010_BASE, MENU_UGC_2010_ARQUIVOS, MENU_UGC_2010_NOVOS,
  ACRESCIMOS_MENU_UGC_2010, TROCAS_MENU_UGC_2010,
} from './test-support/desfaz-menu-ugc-2010.mjs'
import { semUgcAjustes2010 } from './test-support/desfaz-ugc-ajustes-2010.mjs'
import { semPaginasUgc2010 } from './test-support/desfaz-paginas-ugc-2010.mjs'
import { semHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs'
import { semHomeRemodela2010 } from './test-support/desfaz-home-remodela-2010.mjs' // KINEO-HOME-REMODELA-2010 — 20/10, fundador: "esses vão ser os quatro principais, e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai cancelar": a regra "o menu só cresce" deste guardião foi revogada pelo próprio fundador; H/P/P5/D6 medem o item UGC no menu SEM a remodelação (camada mais nova, provada em scripts/test-home-remodela-2010.mjs)

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const MARCA = 'KINEO-MENU-UGC-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${MENU_UGC_2010_BASE}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`exceção: ${e.message}`] } }

const F = {
  lib: 'lib/ui/menuUgc2010.ts',
  rotas: 'lib/seo/paginasUgc2010.ts',
  comp: 'components/NavUgcAdsLink.tsx',
  land: 'app/KineoLanding.tsx',
  examples: 'app/examples/page.tsx',
  trending: 'app/trending/page.tsx',
  dict: 'lib/ui/refinementCopy.json',
  nav: 'lib/navTelemetry.ts',
  langs: 'lib/ui/interfaceLanguage.ts',
}
const EN_PATH = '/ai-ugc-ads'
const PT_PATH = '/anuncios-ugc-com-ia'
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

// ─── L. a lib (executada) ─────────────────────────────────────────────────────
function transpila(code) {
  return ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
}
function rodaLib(libSrc, rotasSrc) {
  const rotas = { exports: {} }
  vm.runInNewContext(transpila(rotasSrc), { module: rotas, exports: rotas.exports, require: (id) => { throw Error(`rotas não podem importar: ${id}`) } })
  const box = { exports: {} }
  vm.runInNewContext(transpila(libSrc), {
    module: box, exports: box.exports,
    require: (id) => { if (id === '@/lib/seo/paginasUgc2010') return rotas.exports; throw Error(`lib do menu não pode importar: ${id}`) },
  })
  return box.exports
}
function libProblems(libSrc, rotasSrc = rd(F.rotas)) {
  const probs = []
  const L = rodaLib(libSrc, rotasSrc)
  if (L.MENU_UGC_LABEL !== 'AI UGC Ads') probs.push(`rótulo = ${L.MENU_UGC_LABEL}`)
  if (L.MENU_UGC_NAV_ITEM !== 'more:ugc') probs.push(`nav item = ${L.MENU_UGC_NAV_ITEM}`)
  if (L.MENU_UGC_2010_MARK !== MARCA) probs.push('marca da lib')
  if (L.menuUgcHref('pt') !== PT_PATH) probs.push(`pt → ${L.menuUgcHref('pt')}`)
  for (const l of LANGS.filter((x) => x !== 'pt')) if (L.menuUgcHref(l) !== EN_PATH) probs.push(`${l} → ${L.menuUgcHref(l)}`)
  for (const v of [null, undefined, '', 'pt-BR', 'xx']) if (L.menuUgcHref(v) !== EN_PATH) probs.push(`${String(v)} → ${L.menuUgcHref(v)}`)
  return probs
}
function rotasProblems() {
  const probs = []
  const R = rd(F.rotas)
  if (!R.includes(`export const UGC_PILLAR_PATH = '${EN_PATH}'`)) probs.push('pilar EN mudou de endereço')
  if (!R.includes(`export const UGC_PILLAR_PT_PATH = '${PT_PATH}'`)) probs.push('pilar PT mudou de endereço')
  for (const p of ['app/ai-ugc-ads/page.tsx', 'app/anuncios-ugc-com-ia/page.tsx']) if (!fs.existsSync(path.join(ROOT, p))) probs.push(`página ausente: ${p}`)
  return probs
}

// ─── C. o componente ──────────────────────────────────────────────────────────
function compProblems(src) {
  const probs = []
  if (!src.startsWith("'use client'\n")) probs.push("sem 'use client' (a língua mora no navegador)")
  if (!src.includes("import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'")) probs.push('não lê a língua do provedor')
  if (!src.includes("import { menuUgcHref } from '@/lib/ui/menuUgc2010'")) probs.push('destino fora da lib')
  if (!src.includes('const language = useInterfaceLanguage()')) probs.push('língua não lida')
  if (!src.includes('<Link href={menuUgcHref(language)} className={className} data-nav-item={navItem}><UiLabel>AI UGC Ads</UiLabel></Link>')) probs.push('link do item fora do padrão (destino pela língua, classe de quem chama, data-nav-item, rótulo autoral)')
  if ((src.match(/<Link /g) || []).length !== 1) probs.push('mais de um link')
  const code = src.replace(/\/\/.*$/gm, '')
  if (/\$\s?\d|\bcredits?\b|\bcr\b|free|grátis/i.test(code)) probs.push('preço/oferta no item do menu')
  return probs
}

// ─── T. o rótulo nas 16 línguas ───────────────────────────────────────────────
function dictProblems(dict, langsSrc = rd(F.langs)) {
  const probs = []
  const codes = [...langsSrc.matchAll(/\{ code: '([a-z]{2})'/g)].map((m) => m[1])
  if (codes.join(',') !== LANGS.join(',')) probs.push(`línguas da interface = ${codes.join(',')}`)
  for (const l of LANGS) {
    const v = dict[l]?.['AI UGC Ads']
    if (typeof v !== 'string' || !v.trim()) { probs.push(`${l}: sem tradução`); continue }
    if (l !== 'en' && v === 'AI UGC Ads') probs.push(`${l}: em inglês cru`)
    if (!v.includes('UGC')) probs.push(`${l}: perdeu o "UGC" (${v})`)
  }
  if (dict.en?.['AI UGC Ads'] !== 'AI UGC Ads') probs.push('en ≠ "AI UGC Ads"')
  if (dict.pt?.['AI UGC Ads'] !== 'Anúncios UGC com IA') probs.push(`pt = ${dict.pt?.['AI UGC Ads']}`)
  if (dict.es?.['AI UGC Ads'] !== 'Anuncios UGC con IA') probs.push(`es = ${dict.es?.['AI UGC Ads']}`)
  return probs
}

// ─── H/P. os menus: lista de itens na ordem ───────────────────────────────────
const ITEM = 'AI UGC Ads'
const semJsxComentario = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
/** Itens de 1º nível de um bloco de menu, na ordem: ▾dropdown, links com rótulo, o item novo (pelo componente). */
function itens(bloco) {
  const out = []
  let depth = 0
  const re = /<PublicNavDropdown item="([^"]+)" label="([^"]+)">|<\/PublicNavDropdown>|<NavUgcAdsLink\b[^>]*\/>|<Link\b[^>]*>(?:<span[^>]*>[^<]*<\/span>)?(?:<UiLabel>([^<]+)<\/UiLabel>|\{engine\.name\})<\/Link>|<span className="nav-mobile-kicker"><UiLabel>([^<]+)<\/UiLabel><\/span>|IMG_ENGINES\.map/g
  for (const m of semJsxComentario(bloco).matchAll(re)) {
    if (m[1]) { if (depth === 0) out.push(`▾${m[2]}`); depth++ }
    else if (m[0] === '</PublicNavDropdown>') depth--
    else if (depth > 0) continue
    else if (m[0].startsWith('<NavUgcAdsLink')) out.push(ITEM)
    else if (m[4]) out.push(`§${m[4]}`)
    else if (m[0] === 'IMG_ENGINES.map') out.push('[motores de imagem]')
    else if (m[3]) out.push(m[3])
  }
  return out
}
const navAttrs = (bloco) => (semJsxComentario(bloco).match(/data-nav-item=/g) || []).length
const BLOCOS = {
  'topo da home': (s) => { const a = s.indexOf('<div className="nav-links" data-nav-surface="top" data-nav-area="public">'); const b = s.indexOf('<div className="nav-right">', a); return a >= 0 && b > a ? s.slice(a, b) : '' },
  'celular da home': (s) => (s.match(/<label htmlFor="nav-toggle" id="mobile-nav-menu"[\s\S]*?<\/label>/) || [''])[0],
  'topo do /examples': (s) => (s.match(/<nav className=\{styles\.nav\} aria-label="Main navigation" data-nav-surface="top" data-nav-area="public">[\s\S]*?<\/nav>/) || [''])[0],
  'topo do /trending': (s) => (s.match(/<nav className=\{styles\.nav\} aria-label="Main navigation" data-nav-surface="top" data-nav-area="public">[\s\S]*?<\/nav>/) || [''])[0],
}
// O menu antigo, escrito à mão (o que o fundador vê hoje) — além da comparação com a base do git.
const ANTIGO = {
  'topo da home': ['▾Make a film', 'Product ads', '▾More tools', '🔥 Trending', 'Pricing'],
  'celular da home': ['Make a film', 'Product ads', '🔥 Trending', 'Pricing', 'Dashboard', 'Log in', '§More tools', 'Images', '[motores de imagem]', 'Clips', 'Spaces', 'MCP', 'Examples', '{CARD_ENTRY_COPY.ctaShort}'],
  'topo do /examples': ['Make a film', 'Product ads', 'Images', '🔥 Trending', 'Pricing'],
  'topo do /trending': ['Make a film', 'Product ads', 'Images', '🔥 Trending', 'Pricing'],
}
/** O item entra logo depois de "Product ads" e o resto segue igual (nenhum item sai, muda de ordem ou de nome). */
function menuProblems(nome, src, srcBase) {
  const probs = []
  const bloco = BLOCOS[nome](src)
  const blocoBase = BLOCOS[nome](srcBase)
  if (!bloco) return [`${nome}: menu não encontrado`]
  if (!blocoBase) return [`${nome}: menu da base não encontrado`]
  const novo = itens(bloco)
  const velho = itens(blocoBase)
  if (velho.join(' · ') !== ANTIGO[nome].join(' · ')) probs.push(`${nome}: base lida = ${velho.join(' · ')}`)
  if (novo.filter((x) => x === ITEM).length !== 1) probs.push(`${nome}: "${ITEM}" aparece ${novo.filter((x) => x === ITEM).length}×`)
  const i = novo.indexOf(ITEM)
  if (i < 1 || novo[i - 1] !== 'Product ads') probs.push(`${nome}: "${ITEM}" não vem logo depois de "Product ads" (${novo.join(' · ')})`)
  const semItem = novo.filter((x) => x !== ITEM)
  if (semItem.join(' · ') !== velho.join(' · ')) probs.push(`${nome}: menu antigo mexido — agora ${semItem.join(' · ')}; antes ${velho.join(' · ')}`)
  if (novo.length !== velho.length + 1) probs.push(`${nome}: ${novo.length} itens (base ${velho.length} + 1)`)
  if (navAttrs(bloco) !== navAttrs(blocoBase) + 1) probs.push(`${nome}: data-nav-item ${navAttrs(bloco)} (base ${navAttrs(blocoBase)} + 1)`)
  const uso = (bloco.match(/<NavUgcAdsLink\b[^>]*\/>/) || [''])[0]
  if (uso !== '<NavUgcAdsLink data-nav-item="more:ugc" />') probs.push(`${nome}: item com outro visual/medição (${uso || 'ausente'}) — tem de ser o link de texto dos itens comuns, sem nav-primary`)
  return probs
}
function importProblems(src, rel) {
  return src.includes("import NavUgcAdsLink from '@/components/NavUgcAdsLink'") ? [] : [`${rel}: componente não importado`]
}

// ─── N. medição e menus do app ────────────────────────────────────────────────
function navContractProblems(navSrc) {
  const probs = []
  const box = { exports: {} }
  vm.runInNewContext(transpila(navSrc), { module: box, exports: box.exports, URL })
  const N = box.exports
  if (!N.NAV_ITEM_RE.test('more:ugc') || !'more:ugc'.startsWith(N.NAV_MORE_PREFIX)) probs.push('more:ugc fora do contrato do nav_item_clicked')
  if (N.normalizeNavItem('more:ugc') !== 'more:ugc') probs.push('normalizeNavItem descarta more:ugc')
  return probs
}

// ─── o real ──────────────────────────────────────────────────────────────────
console.log(MARCA)
console.log('\nL. destino pela língua')
const lp = tenta(() => libProblems(rd(F.lib))); ok(lp.length === 0, `L1 lib EXECUTADA: pt → ${PT_PATH}; as outras 15 línguas e língua ausente → ${EN_PATH} (${lp.join('; ') || 'ok'})`)
const rp = rotasProblems(); ok(rp.length === 0, `L2 as rotas vêm de lib/seo/paginasUgc2010.ts e as 2 páginas existem (${rp.join('; ') || 'ok'})`)
ok(!/^import /m.test(rd(F.lib).replace("import { UGC_PILLAR_PATH, UGC_PILLAR_PT_PATH } from '@/lib/seo/paginasUgc2010'", '')), 'L3 a lib só importa as rotas (pura)')

console.log('\nC. componente')
const cp = compProblems(rd(F.comp)); ok(cp.length === 0, `C1 cliente, língua do provedor, rótulo autoral, data-nav-item repassado, sem preço (${cp.join('; ') || 'ok'})`)

console.log('\nT. 16 línguas')
const DICT = JSON.parse(rd(F.dict))
const dp = dictProblems(DICT); ok(dp.length === 0, `T1 "AI UGC Ads" traduzido nas 16 línguas da interface (${dp.join('; ') || 'ok'})`)

console.log('\nH/P. menus: o item logo depois de "Product ads", o menu antigo inteiro e na mesma ordem')
const ARQ_DE = { 'topo da home': F.land, 'celular da home': F.land, 'topo do /examples': F.examples, 'topo do /trending': F.trending }
for (const [i, nome] of Object.keys(BLOCOS).entries()) {
  const rel = ARQ_DE[nome]
  const mp = tenta(() => menuProblems(nome, semHomeRemodela2010(rd(rel), rel), base(rel) ?? '')); ok(mp.length === 0, `${i === 0 ? 'H1' : `P${i}`} ${nome}: ${itens(BLOCOS[nome](semHomeRemodela2010(rd(rel), rel))).join(' · ')} (${mp.join('; ') || 'ok'})`) // KINEO-HOME-REMODELA-2010
}
const ip = [F.land, F.examples, F.trending].flatMap((r) => importProblems(rd(r), r)); ok(ip.length === 0, `P4 os 3 arquivos importam o componente (${ip.join('; ') || 'ok'})`)
{
  const totalBase = (base(F.land).match(/data-nav-item=/g) || []).length
  const total = (semHomeRemodela2010(rd(F.land), F.land).match(/data-nav-item=/g) || []).length // KINEO-HOME-REMODELA-2010
  ok(total === totalBase + 2, `P5 KineoLanding: ${total} data-nav-item = base ${totalBase} + 2 (1 no topo, 1 no celular) — o menu só cresce`)
}

console.log('\nN. medição e menus do app')
const np = tenta(() => navContractProblems(rd(F.nav))); ok(np.length === 0, `N1 more:ugc cabe no contrato do nav_item_clicked (${np.join('; ') || 'ok'})`)
ok(rd(F.nav) === base(F.nav), 'N2 lib/navTelemetry.ts intocado (enum do contrato igual)')
const APP = ['components/Sidebar.tsx', 'components/MobileNav.tsx', 'lib/ui/workspaceNavigation.ts', 'components/home/ClipsFirstHome.tsx']
ok(APP.every((f) => rd(f) === base(f)), 'N3 menus do app (Sidebar, MobileNav, workspaceNavigation) e a home antiga fora do ar (ClipsFirstHome) intocados')

console.log('\nD. desfaz exato, encadeamento, diff, commits')
{
  const difs = []
  for (const f of MENU_UGC_2010_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    let out
    try { out = semMenuUgc2010(fs.readFileSync(path.join(ROOT, f), 'utf8'), f) } catch (e) { difs.push(`${f}: ${e.message}`); continue }
    if (lf(out) !== b) difs.push(f)
  }
  ok(difs.length === 0, `D1 ${MENU_UGC_2010_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${MENU_UGC_2010_BASE.slice(0, 9)} (${difs.join('; ') || 'ok'})`)
  const novosOk = MENU_UGC_2010_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null)
  ok(novosOk, `D2 os ${MENU_UGC_2010_NOVOS.length} arquivos novos existem e não existiam na base`)
  const trocasOk = Object.entries(TROCAS_MENU_UGC_2010).every(([f, ts]) => MENU_UGC_2010_ARQUIVOS.includes(f) && ts.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(trocasOk && Object.values(ACRESCIMOS_MENU_UGC_2010).every((n) => Number.isInteger(n) && n >= 0), 'D3 trocas: linha nova com a marca, linha da base sem; contagens inteiras')
  const DESFAZ_UGC = rd('scripts/test-support/desfaz-ugc-ajustes-2010.mjs')
  const cadeia = /export function semUgcAjustes2010\(texto, p\) \{\n  texto = semMenuUgc2010\(texto, p\)/.test(DESFAZ_UGC)
  const igual = MENU_UGC_2010_ARQUIVOS.every((f) => {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8'), semEste = semMenuUgc2010(raw, f)
    return semUgcAjustes2010(raw, f) === semUgcAjustes2010(semEste, f) && semPaginasUgc2010(raw, f) === semPaginasUgc2010(semEste, f) && semHome3Cards1910(raw, f) === semHome3Cards1910(semEste, f)
  })
  ok(cadeia && igual, 'D4 encadeamento: semUgcAjustes2010 (a cabeça das cadeias) tira esta camada PRIMEIRO; paginas-ugc e home-3-cards herdam')
  let lancou = false
  try { semMenuUgc2010(rd(F.land) + `\n// linha nova ${MARCA}`, F.land) } catch { lancou = true }
  ok(semMenuUgc2010('sem marca', F.land) === 'sem marca' && semMenuUgc2010(rd(F.land), 'outro/arquivo.tsx') === rd(F.land) && desfazMenuUgc2010(F.land, null) === null && lancou,
    'D5 idempotente fora da lista / sem a marca / null; acréscimo a mais lança')
  const TOPO = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD'
  const tocados = new Set([...git('diff', '--name-only', MENU_UGC_2010_BASE, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n')].filter(Boolean))
  const permitidos = new Set([...MENU_UGC_2010_ARQUIVOS, ...MENU_UGC_2010_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = MENU_UGC_2010_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !semHomeRemodela2010(rd(f), f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-HOME-REMODELA-2010
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && ![...tocados].some((f) => /engineCost|pricing|lib\/credits\/|lib\/ads\/|app\/api\//.test(f)),
    `D6 o diff da base só toca a lista e os novos; toda linha nova traz a marca; nada de cobrança, motor ou preço (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
  const assuntos = git('log', '--no-merges', '--format=%s', `${MENU_UGC_2010_BASE}..${TOPO}`).trim().split('\n').filter(Boolean)
  ok(assuntos.length > 0 && assuntos.every((s) => s.includes(MARCA)), `D7 todo commit da entrega traz a marca no assunto (${assuntos.length})`)
}

// ─── M. mutantes ─────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
function mut(nome, src, de, para, fn) {
  if (!src.includes(de)) { ok(false, `${nome} — âncora do mutante não encontrada`); return }
  const mutado = src.split(de).join(para)
  if (mutado === src) { ok(false, `${nome} — mutante não aplicou`); return }
  const r = tenta(() => fn(mutado))
  ok(r.length > 0, `${nome} → vermelho`)
}
const LAND = rd(F.land), LAND_B = base(F.land), EX = rd(F.examples), EX_B = base(F.examples), TR = rd(F.trending), TR_B = base(F.trending)
const TOPO_USO = '            <NavUgcAdsLink data-nav-item="more:ugc" />'
const topo = (s) => menuProblems('topo da home', s, LAND_B)
mut('M1 item some do topo', LAND, TOPO_USO, '            ', topo)
mut('M2 item vai para antes de "Product ads"', LAND, `            <Link href="/ads/new" data-nav-item="business" className="nav-primary"><UiLabel>Product ads</UiLabel></Link>\n${TOPO_USO}`, `${TOPO_USO}\n            <Link href="/ads/new" data-nav-item="business" className="nav-primary"><UiLabel>Product ads</UiLabel></Link>`, topo)
mut('M3 menu encolhe (Pricing sai do topo)', LAND, '            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>\n          </div>', '          </div>', topo)
mut('M4 item antigo muda de nome ("Product ads" → "Ads")', LAND, '<UiLabel>Product ads</UiLabel></Link>\n            <NavUgcAdsLink', '<UiLabel>Ads</UiLabel></Link>\n            <NavUgcAdsLink', topo)
mut('M5 itens antigos trocam de ordem (Trending depois de Pricing)', LAND, '            <Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>\n            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>', '            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>\n            <Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>', topo)
mut('M6 item com peso de porta (nav-primary, visual diferente)', LAND, TOPO_USO, '            <NavUgcAdsLink className="nav-primary" data-nav-item="more:ugc" />', topo)
mut('M7 item repetido no topo', LAND, TOPO_USO, `${TOPO_USO}\n${TOPO_USO}`, topo)
mut('M8 celular perde o item', LAND, '              <NavUgcAdsLink data-nav-item="more:ugc" />', '              ', (s) => menuProblems('celular da home', s, LAND_B))
mut('M9 /examples perde o item', EX, '            <NavUgcAdsLink data-nav-item="more:ugc" />', '            ', (s) => menuProblems('topo do /examples', s, EX_B))
mut('M10 /trending põe o item depois de Pricing', TR, '            <NavUgcAdsLink data-nav-item="more:ugc" />{/* KINEO-MENU-UGC-2010 — par do topo da home: logo depois de "Product ads" */}\n', '', (s) => menuProblems('topo do /trending', s.replace('<UiLabel>Pricing</UiLabel></Link>\n', '<UiLabel>Pricing</UiLabel></Link>\n            <NavUgcAdsLink data-nav-item="more:ugc" />\n'), TR_B))
mut('M11 lib: português vai à pilar em inglês', rd(F.lib), "language === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH", 'UGC_PILLAR_PATH', libProblems)
mut('M12 lib: todo mundo vai à pilar em português', rd(F.lib), "language === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH", 'UGC_PILLAR_PT_PATH', libProblems)
mut('M13 componente com destino fixo (ignora a língua)', rd(F.comp), 'href={menuUgcHref(language)}', 'href="/ai-ugc-ads"', compProblems)
mut('M14 componente com preço no rótulo', rd(F.comp), '<UiLabel>AI UGC Ads</UiLabel></Link>', '<UiLabel>AI UGC Ads</UiLabel> · 41 credits</Link>', compProblems)
mut('M15 componente sem medição (data-nav-item some)', rd(F.comp), ' data-nav-item={navItem}>', '>', compProblems)
{
  const d = JSON.parse(JSON.stringify(DICT)); delete d.ar['AI UGC Ads']
  ok(dictProblems(d).length > 0, 'M16 rótulo sem tradução em ar → vermelho')
  const e = JSON.parse(JSON.stringify(DICT)); e.pt['AI UGC Ads'] = 'AI UGC Ads'
  ok(dictProblems(e).length > 0, 'M17 rótulo em inglês cru no PT → vermelho')
}
{
  const DESFAZ_UGC = rd('scripts/test-support/desfaz-ugc-ajustes-2010.mjs')
  const de = '  texto = semMenuUgc2010(texto, p)'
  const quebrado = DESFAZ_UGC.replace(de, '  // (sem a camada do menu)')
  ok(DESFAZ_UGC.includes(de) && quebrado !== DESFAZ_UGC && !/export function semUgcAjustes2010\(texto, p\) \{\n  texto = semMenuUgc2010\(texto, p\)/.test(quebrado), 'M18 cabeça da cadeia sem chamar esta camada → D4 vermelho')
  let lancou = false
  try { semMenuUgc2010(LAND.replace(`${TOPO_USO}{/*`, `${TOPO_USO.replace('more:ugc', 'more:ugcx')}{/*`).replace(/\n {14}<NavUgcAdsLink data-nav-item="more:ugc" \/>\{\/\* KINEO-MENU-UGC-2010 — par do topo no celular \*\/\}/, ''), F.land) } catch { lancou = true }
  ok(lancou, 'M19 desfaz com um acréscimo a menos (celular apagado à mão) lança → D1 vermelho')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
