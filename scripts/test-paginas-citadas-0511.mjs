// KINEO-PAGINAS-CITADAS-0511 [fundador 05/11, "2 sim"] — guardião sem rede. Renderiza o bloco das 6 páginas citadas e confere a tabela de planos
// contra a tabela que cobra, recalculando por fora. Reprova mutantes: número escrito à mão, data parada, carimbo que anda para trás ou alarga.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = process.cwd()
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(path.join(ROOT, f), 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const LIB = 'lib/seo/paginasCitadas0511.ts', COMP = 'components/seo/TrafficCitation2310.tsx', MAPA = 'app/sitemap.ts'

function carregador(mutar = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (nome === 'react') return React
    if (nome === 'react/jsx-runtime') return require('react/jsx-runtime')
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : null
    if (!f) return require(nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx', path.join(f, 'index.ts')].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console, process: { env: {} }, URL, Date, Math, Number, String, Array, Object, Set, Map, JSON, Error, RegExp, Boolean, Symbol, Intl, Promise }, { filename: f })
    return mod.exports
  }
  return carrega
}

const semTags = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

function prova(mutar = {}) {
  const e = []
  const exige = (c, m) => { if (!c) e.push(m) }
  const carrega = carregador(mutar)
  const P = carrega('@/' + LIB.replace(/\.ts$/, ''))
  const preco = carrega('@/lib/checkoutPricing'), custo = carrega('@/lib/credits/engineCost')
  const { H3_TURBO_PUBLIC } = carrega('@/lib/engineLaunch')
  const { CitationDetails } = carrega('@/' + COMP.replace(/\.tsx$/, ''))
  const cr = (s) => custo.creditCostForDuration('cinematic_ai', true, s)

  // os números saem da tabela que cobra, recalculados aqui por fora
  const esperado = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']].map(([t, nome]) => ({ nome, usd: preco.TIER_PRICES[t].usd / 100, saldo: preco.TIER_CREDITS[t] }))
  const linhas = P.planosPorFilme0511()
  exige(linhas.length === 3, 'três planos')
  for (const [i, p] of esperado.entries()) {
    const l = linhas[i] ?? {}
    exige(l.plano === p.nome && l.precoUsd === p.usd && l.creditos === p.saldo, `plano ${p.nome}: preço e créditos da tabela que cobra`)
    exige(JSON.stringify(l.filmes) === JSON.stringify([15, 35, 60].map((s) => Math.floor(p.saldo / cr(s)))), `plano ${p.nome}: filmes que cabem no saldo`)
    exige(Math.abs(l.filme60Usd - cr(60) * p.usd / p.saldo) < 0.006, `plano ${p.nome}: custo do filme de 60 s`)
    exige((l.filmes ?? []).every((n, j) => n * cr([15, 35, 60][j]) <= p.saldo), `plano ${p.nome}: nenhum filme prometido acima do saldo`)
  }

  // a tela: as 6 páginas, na língua certa, com a data nova e as 5 perguntas de antes
  for (const page of ['home', 'seedance', 'text', 'horror', 'urdu', 'portuguese']) {
    const html = renderToStaticMarkup(React.createElement(CitationDetails, { page }))
    const texto = semTags(html)
    const pt = page === 'portuguese'
    exige(html.includes(`data-citation-plans="${page}"`) && (html.match(/<table/g) ?? []).length === 2, `${page}: a tabela de planos está no bloco`)
    exige((html.match(/<h3>/g) ?? []).length === 5, `${page}: seguem 5 perguntas`)
    exige((html.match(/<time /g) ?? []).length === 1 && html.toLowerCase().includes('datetime="2026-11-05"'), `${page}: data de 05/11`)
    exige(!/October 23|23 de outubro|2026-10-23/.test(html), `${page}: sem a data antiga`)
    exige(texto.includes(pt ? '5 de novembro de 2026' : 'November 5, 2026'), `${page}: data escrita na língua da página`)
    exige(texto.includes(pt ? 'Planos e custo por filme' : 'Plans and cost per film'), `${page}: título na língua da página`)
    for (const p of esperado) {
      exige(texto.includes(pt ? `US$ ${p.usd}` : `US$${p.usd}`) && new RegExp(`\\b${p.saldo}\\b`).test(texto), `${page}: ${p.nome} com preço e créditos`)
      exige(texto.includes(`${Math.floor(p.saldo / cr(60))} × 60 s`), `${page}: ${p.nome} com os filmes de 60 s`)
    }
    exige(texto.includes(pt ? `${cr(15)} créditos em 15 segundos` : `${cr(15)} credits at 15 seconds`) && new RegExp(`\\b${cr(90)}\\b`).test(texto), `${page}: custo por duração`)
    exige(texto.includes(`${preco.ANNUAL_DISCOUNT_PERCENT}%`), `${page}: desconto do anual da tabela`)
    exige(/reais/.test(texto), `${page}: Brasil paga em reais`)
    exige(!/Kling|guarantee|garant|best|melhor|#1/i.test(texto.slice(texto.indexOf(pt ? 'Planos e custo' : 'Plans and cost'))), `${page}: sem promessa nem motor que depende de interruptor`)
  }

  // o carimbo do mapa
  const base = 'https://www.usekineo.com'
  const mapa = [...P.PAGINAS_CITADAS_0511_PATHS, '/pricing', '/free-ai-shorts/mythology'].map((p) => ({ url: base + (p === '/' ? '' : p), lastModified: '2026-10-23T12:00:00.000Z' }))
  const saida = P.carimbaPaginasCitadas0511([...mapa, { url: base + '/text-to-video-shorts', lastModified: '2026-12-01T00:00:00.000Z' }])
  const dia = (x) => new Date(x.lastModified).toISOString().slice(0, 10)
  exige(P.PAGINAS_CITADAS_0511_PATHS.length === 6 && saida.slice(0, 6).every((x) => dia(x) === (H3_TURBO_PUBLIC && new URL(x.url).pathname === '/ai-video-generator/seedance' ? '2026-11-07' : '2026-11-05')), 'mapa: datas aprovadas das 6 páginas, incluindo correção H3 de 07/11')
  exige(dia(saida[6]) === '2026-10-23' && dia(saida[7]) === '2026-10-23', 'mapa: nenhuma outra página muda de data')
  exige(dia(saida[8]) === '2026-12-01', 'mapa: data mais nova fica')
  const fonteMapa = (mutar[MAPA] ?? ((t) => t))(ler(MAPA))
  exige(/return (carimbaPaginasCitaveis1011\()?carimbaPaginasCitadas0511\(filtrarSitemapPorLingua\(trafego2310Sitemap\(/.test(fonteMapa), 'mapa: o carimbo está ligado por fora') // KINEO-PAGINAS-CITAVEIS-1011 — o carimbo de 10/11 embrulha este por fora
  return e
}

console.log('1. planos, tela e mapa')
{
  const r = prova()
  checa(`tudo confere (${r.slice(0, 4).join('; ') || 'ok'})`, r.length === 0)
}
console.log('2. o que não pode mudar')
{
  const lib = ler(LIB)
  checa('nenhum preço ou crédito escrito à mão', !/\b(900|1900|5900|40|85|280)\b/.test(lib.replace(/\/\/[^\n]*/g, '')))
  checa('a camada não toca em cobrança, motor nem checkout', !/stripe|debit|submitToFal|checkout\//i.test(lib.replace(/\/\/[^\n]*/g, '').replace("'@/lib/checkoutPricing'", '')))
  const comp = ler(COMP)
  checa('as respostas de 23/10 seguem vindo da camada antiga', comp.includes('TRAFFIC_CITATIONS[page]') && ler('lib/seo/trafficCitation2310.ts').includes("export const TRAFFIC_CITATION_UPDATED = '2026-10-23'"))
}
console.log('3. mutantes')
const MUTANTES = [
  ['filme a mais do que o saldo paga', LIB, (t) => t.replace('Math.floor(saldo / creditos(s))', 'Math.ceil(saldo / creditos(s))'), /filmes que cabem|acima do saldo/],
  ['preço escrito à mão', LIB, (t) => t.replace('const precoUsd = TIER_PRICES[tier].usd / 100', 'const precoUsd = 7'), /preço e créditos/],
  ['custo do filme de 60 s errado', LIB, (t) => t.replace('creditos(60) * precoUsd / saldo', 'creditos(35) * precoUsd / saldo'), /custo do filme de 60 s/],
  ['data parada em 23/10', COMP, (t) => t.replace('<time dateTime={PAGINAS_CITADAS_0511_ATUALIZADO}>{planos.atualizadoEm}</time>', '<time dateTime="2026-10-23">October 23, 2026</time>'), /data de 05\/11|data antiga/],
  ['tabela fora da tela', COMP, (t) => t.replace('<tbody>{planos.rows.map(', '<tbody>{[].map('), /com preço e créditos|filmes de 60 s/],
  ['página em português com texto em inglês', LIB, (t) => t.replace("const ou = pt ? 'ou' : 'or'", "pt = false\n  const ou = 'or'"), /língua da página/],
  ['carimbo alarga para todo o mapa', LIB, (t) => t.replace('if (!alvo.has(path) && !localizedH3) return entry', ''), /nenhuma outra página/],
  ['carimbo anda para trás', LIB, (t) => t.replace('return atual >= carimbo ? entry : ', 'return '), /data mais nova fica/],
  ['carimbo desligado do mapa', MAPA, (t) => t.replace('carimbaPaginasCitadas0511(filtrarSitemapPorLingua(', '(filtrarSitemapPorLingua('), /ligado por fora/],
  ['anual escrito à mão', LIB, (t) => t.replaceAll('${ANNUAL_DISCOUNT_PERCENT}%', '50%'), /desconto do anual/],
]
for (const [nome, arq, muta, esperado] of MUTANTES) {
  const original = ler(arq)
  let r
  try { r = prova({ [arq]: muta }) } catch (x) { r = ['estourou: ' + x.message] }
  if (process.env.VER_MUTANTES) console.log('    ', nome, '=>', JSON.stringify(r).slice(0, 200))
  checa(`mutante "${nome}" fica vermelho`, muta(original) !== original && r.some((m) => esperado.test(m)))
}
console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
