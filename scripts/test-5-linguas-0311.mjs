// KINEO-5-LINGUAS-0311 [TRAVA 8.2 — "vai" do fundador 03/11: "vamos ficar só com 5 línguas"] — guardião. Prova:
//   (A) caminhoForaDasLinguas: efeito/motor/gerador grátis em língua de fora → fora; nas 5 (en/de/es/pt/fr) e na versão sem
//       sufixo → dentro; /ai-video-generator/for/<língua> idem; página que NÃO é de língua com 2 letras no fim → dentro;
//   (B) filtrarSitemapPorLingua contra o SITEMAP REAL de 03/11 (fixture com as 893 URLs): as 368 de fora saem, nenhuma das 5
//       sai, nenhuma página sem língua sai; alternates de língua de fora são podadas (x-default fica);
//   (C) o sitemap, o middleware (X-Robots-Tag noindex, follow num ramo próprio) e o llms.txt usam a regra;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-5-linguas-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { lib: 'lib/seo/linguasPublicas0311.ts', sitemap: 'app/sitemap.ts', mw: 'middleware.ts', llms: 'app/llms.txt/route.ts' }
const URLS = JSON.parse(read('scripts/test-support/sitemap-urls-0311.json'))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', js)(() => { throw new Error('import inesperado') }, mod, mod.exports)
  return mod.exports
}

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  let L
  try { L = load(over[F.lib] ?? read(F.lib)) } catch (e) { return ['lib não compila: ' + e.message] }
  const fora = (p) => L.caminhoForaDasLinguas(p)
  // (A)
  req(JSON.stringify(L.LINGUAS_INDEXADAS) === '["en","de","es","pt","fr"]', 'A as 5 línguas são en/de/es/pt/fr')
  for (const p of ['/effects/hug/vi', '/effects/hug/ur', '/effects/melt/hi', '/ai-video-generator/seedance/it', '/ai-video-generator/veo/nl', '/free-shorts-generator/tr', '/ai-video-generator/for/urdu', '/ai-video-generator/for/hindi', '/ai-video-generator/for/hebrew/'])
    req(fora(p) === true, `A fora: ${p}`)
  for (const p of ['/effects/hug', '/effects/hug/pt', '/effects/hug/de', '/effects/hug/fr', '/effects/hug/es', '/ai-video-generator/seedance', '/ai-video-generator/seedance/de', '/free-shorts-generator/fr', '/ai-video-generator/for/spanish', '/ai-video-generator/for/portuguese', '/ai-video-generator/for/german', '/ai-video-generator/for/french', '/ai-video-generator/for/restaurants-and-cafes', '/', '/pt', '/es', '/pricing', '/v/id', '/vs/creatify-alternative', ''])
    req(fora(p) === false, `A dentro: ${p || '(vazio)'}`)
  // (B) sitemap real
  const entradas = URLS.map((u) => ({ url: 'https://www.usekineo.com' + u, alternates: { languages: { 'en-US': 'https://www.usekineo.com/effects/hug', 'vi-VN': 'https://www.usekineo.com/effects/hug/vi', 'pt-BR': 'https://www.usekineo.com/effects/hug/pt', 'x-default': 'https://www.usekineo.com/effects/hug' } } }))
  const filtrado = L.filtrarSitemapPorLingua(entradas)
  req(URLS.length === 893, `B fixture com as 893 URLs de 03/11 (${URLS.length})`)
  req(filtrado.length === 525, `B saem 368, ficam 525 (${filtrado.length})`)
  const restam = new Set(filtrado.map((e) => e.url.replace('https://www.usekineo.com', '')))
  req(URLS.filter((u) => /\/(it|nl|pl|tr|ru|uk|ar|ur|hi|id|vi)$/.test(u) && /^\/(effects|ai-video-generator|free-shorts-generator)\//.test(u)).every((u) => !restam.has(u)), 'B nenhuma versão it/nl/pl/tr/ru/uk/ar/ur/hi/id/vi sobra')
  req(URLS.filter((u) => /\/(de|es|pt|fr)$/.test(u)).every((u) => restam.has(u)), 'B toda versão de/es/pt/fr fica')
  req(URLS.filter((u) => !/^\/(effects|ai-video-generator|free-shorts-generator)\//.test(u)).every((u) => restam.has(u)), 'B página fora das famílias de língua nunca sai')
  const alt = filtrado[0]?.alternates?.languages ?? {}
  req(alt['en-US'] && alt['pt-BR'] && alt['x-default'] && !alt['vi-VN'], 'B alternates: vi sai; en, pt e x-default ficam')
  req(Array.isArray(L.filtrarSitemapPorLingua([])) && L.filtrarSitemapPorLingua([{ url: 'nao-e-url' }]).length === 1, 'B nunca lança com entrada estranha')
  // (C)
  const sm = over[F.sitemap] ?? read(F.sitemap)
  req(/return (?:carimbaPaginasCitadas0511\()?filtrarSitemapPorLingua\(trafego2310Sitemap\(carimbaBingSeo1510\(\[/.test(sm), 'C o sitemap inteiro passa pelo filtro') // KINEO-PAGINAS-CITADAS-0511 (reancorado 05/11): o carimbo de data das 6 páginas citadas entra por fora do filtro e não tira nem põe URL
  const mw = over[F.mw] ?? read(F.mw)
  const ramo = mw.indexOf('if (caminhoForaDasLinguas(request.nextUrl.pathname)) {')
  req(ramo > 0 && /if \(caminhoForaDasLinguas\(request\.nextUrl\.pathname\)\) \{\n\s*const linguaResponse = await updateSession\(request\)\n\s*linguaResponse\.headers\.set\('X-Robots-Tag', 'noindex, follow'\)\n\s*return linguaResponse/.test(mw), 'C middleware: ramo próprio com noindex, follow (a sessão é renovada como sempre)')
  req(ramo > mw.indexOf("searchParams.get('ref')") && ramo < mw.indexOf('const mintedVisitorId'), 'C o ramo vem depois do redirect de afiliado e antes do cookie da home')
  const ll = over[F.llms] ?? read(F.llms)
  req((ll.match(/linguaIndexada\(/g) ?? []).length >= 2, 'C llms.txt lista só as 5 línguas (gerador grátis e motores)')
  return erros
}

const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)
const lib = read(F.lib)
const mw = read(F.mw)
const MUTANTES = [
  ['italiano volta para o índice', { [F.lib]: lib.replace("['en', 'de', 'es', 'pt', 'fr'] as const", "['en', 'de', 'es', 'pt', 'fr', 'it'] as const") }],
  ['francês sai do índice', { [F.lib]: lib.replace("['en', 'de', 'es', 'pt', 'fr'] as const", "['en', 'de', 'es', 'pt'] as const") }],
  ['qualquer 2 letras no fim vira língua', { [F.lib]: lib.replace('FAMILIAS_LOCALIZADAS.some((f) => p.startsWith(f)) && ', '') }],
  ['/for/urdu fica', { [F.lib]: lib.replace("return !NOMES_INDEXADOS.has(ultimo)", 'return false') }],
  ['alternate de fora sobrevive', { [F.lib]: lib.replace("if (loc === 'x-default' || (linguaIndexada(loc) && !caminhoForaDasLinguas(alvo))) podadas[loc] = href", 'podadas[loc] = href') }],
  ['middleware sem noindex', { [F.mw]: mw.replace("    linguaResponse.headers.set('X-Robots-Tag', 'noindex, follow')\n", '') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
