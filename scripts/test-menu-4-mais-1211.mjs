// KINEO-MENU-4-MAIS-1211 + KINEO-NOMES-DE-PRODUTO-1211 [CEO 12/11; tabela de nomes aprovada pelo fundador 11/11 ~21:00; o menu é a opção C
// da imagem div1-t4-decisao-ABC.png, a escolha final é do fundador]. No cabeçalho do computador: os 4 produtos com o nome curto de UMA fonte,
// "More" só com Made with Kineo, Claude & ChatGPT visível, Pricing à direita ao lado do Log in. Menu do celular: só os nomes. Nada que o ChatGPT
// cita sai ("AI Faceless Videos" e a frase dos cartões seguem). Offline: lê o código e executa a fonte dos nomes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(ROOT, 'node_modules/typescript'))
const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LAND = 'app/KineoLanding.tsx', NOMES = 'lib/ui/nomesDeProduto.ts', UGC = 'components/NavUgcAdsLink.tsx', COPY = 'lib/ui/refinementCopy.json'
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
  ok(topo.includes('<PublicNavDropdown item="video" label={NOMES_DE_PRODUTO.film.curto}>'), 'topo: Films (fonte única)')
  ok(topo.includes('<UiLabel>{NOMES_DE_PRODUTO.product_ads.curto}</UiLabel>') && topo.includes('label={NOMES_DE_PRODUTO.ugc_ads.curto}') && topo.includes('<UiLabel>{NOMES_DE_PRODUTO.cartoon.curto}</UiLabel>'), 'topo: Product Ads, UGC Ads e Cartoons (fonte única)')
  ok(!/<UiLabel>(?:Make a film|Product ads|AI UGC Ads|AI Cartoon Videos)<\/UiLabel>|label="Make a film"/.test(topo + cel), 'nenhum nome antigo escrito à mão no cabeçalho')
  const more = topo.match(/<PublicNavDropdown item="more:menu" label="More">([\s\S]*?)<\/PublicNavDropdown>/)
  ok(more, 'topo: "More" existe')
  ok(more[1].includes('href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}') && !more[1].includes('MENU_CONNECTOR_HREF'), 'More: só Made with Kineo (opção C)')
  ok(topo.replace(more[0], '').includes('href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}'), 'Claude & ChatGPT segue visível no topo (ordem do fundador de 20/10)')
  ok(!topo.replace(more[0], '').includes('MADE_WITH_KINEO_HREF'), 'Made with Kineo não aparece duas vezes no topo')
  ok(!topo.includes('href="/pricing"'), 'Pricing saiu do meio do topo')
  const pr = direita.indexOf('<Link className="nav-login nav-pricing" href="/pricing" data-nav-item="pricing">')
  ok(pr > 0 && pr < direita.indexOf('data-nav-item="login"'), 'Pricing à direita, logo antes do Log in')
  // 3) Celular: os mesmos lugares, só os nomes; Pricing e Claude & ChatGPT seguem lá.
  ok(cel.includes('data-nav-item="video"><UiLabel>{NOMES_DE_PRODUTO.film.curto}</UiLabel>') && cel.includes('href="/pricing" data-nav-item="pricing"') && cel.includes('MENU_CONNECTOR_HREF'), 'celular: nomes novos, Pricing e conector no lugar')
  ok(src(UGC).includes("label = 'AI UGC Ads'") && src(UGC).includes('<UiLabel>{label}</UiLabel>'), 'NavUgcAdsLink: /examples e /trending seguem com "AI UGC Ads" (padrão)')
  // 4) 16 línguas, sem cair no inglês fora do inglês.
  const j = JSON.parse(src(COPY))
  ok(Object.keys(j).length === 16, '16 línguas')
  for (const [lang, d] of Object.entries(j)) for (const k of ['Films', 'Product Ads', 'UGC Ads', 'Cartoons', 'More']) ok(typeof d[k] === 'string' && d[k].length > 1, `${lang}: "${k}" traduzido`)
  ok(j.pt.Films === 'Filmes' && j.pt.More === 'Mais' && j.es.Cartoons === 'Dibujos', 'traduções conferidas (pt/es)')
  // 5) Nada que o ChatGPT cita sai: o título "AI Faceless Videos" e a frase do cartão seguem na home (fora deste commit).
  ok(read('lib/ui/homeThreeCards.ts').includes("films: { title: 'AI Faceless Videos'"), '"faceless" segue no cartão da home')
}

all()
const real = passed
const r = p => read(p)
const mutants = [
  ['Claude & ChatGPT vai para o More (opção B)', LAND, r(LAND).replace(/(\n\s*<Link href=\{MENU_CONNECTOR_HREF\} data-nav-item=\{MENU_CONNECTOR_NAV_ITEM\} className="nav-connector">[^\n]*)\n/, '\n').replace('                <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}>', '                <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>x</Link>\n                <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM}>')],
  ['nome antigo volta à mão', LAND, r(LAND).replace('label={NOMES_DE_PRODUTO.film.curto}', 'label="Make a film"')],
  ['Pricing some da direita', LAND, r(LAND).replace('<Link className="nav-login nav-pricing" href="/pricing" data-nav-item="pricing">', '<Link className="nav-login nav-pricing" href="/planos" data-nav-item="pricing">')],
  ['tabela muda', NOMES, r(NOMES).replace("cartoon: { curto: 'Cartoons', longo: 'AI Cartoons' }", "cartoon: { curto: 'Cartoon', longo: 'AI Cartoon Videos' }")],
  ['tradução em português some', COPY, r(COPY).replace('"Films": "Filmes",', '')],
  ['UGC muda em todo o site', UGC, r(UGC).replace("label = 'AI UGC Ads'", "label = 'UGC Ads'")],
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
console.log(`test-menu-4-mais-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
