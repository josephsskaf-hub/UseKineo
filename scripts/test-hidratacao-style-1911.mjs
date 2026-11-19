// KINEO-HIDRATACAO-1911 — guardião do erro de hidratação em toda página de produção [CEO 19/11: React #425/#418/#423 na home e em /pricing].
// Causa: CSS como FILHO de <style> (`<style>{CSS}</style>`). O servidor do React escapa o texto (">" vira &gt;, aspas viram &quot;/&#x27;),
// e dentro de <style> o navegador não desfaz o escape; o cliente compara com o CSS cru → texto diferente (#425), a árvore não casa (#418) e a
// raiz inteira é refeita no cliente (#423), o que também apaga o tema escuro salvo até o React recolocar. A seção da home (TrafficCitation2310,
// HOME_STYLE com "details[open]>summary") entrou em 19/11 (07ca9730d) e aparece na home e em /pricing; /viral-score tinha o mesmo defeito desde 08/07.
// Prova:
//   (A) EXECUTANDO components/seo/TrafficCitation2310.tsx com o react-dom/server real: para as 6 páginas, todo <style> que o servidor manda
//       tem exatamente o CSS da fonte, sem nenhuma entidade HTML (= o que o cliente vai comparar na hidratação);
//   (B) varredura do repositório (app/ e components/): nenhum <style>{…}</style> cru (fora do styled-jsx) cujo texto tenha < > & " '
//       — o mesmo defeito em qualquer outra tela quebra a hidratação da página inteira; expressão que não dá para ler = falha.
// A prova no navegador (19/11): o HTML de produção da home e de /pricing, logado fora, pt-BR e tema escuro salvos, a 1280 e a 390 px, dá
// "#425 #418 #418 #423"; com só esse <style> desescapado, nenhum erro.
// Mutantes no fim. Rodar: node scripts/test-hidratacao-style-1911.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const CIT = 'components/seo/TrafficCitation2310.tsx'
const VIRAL = 'app/viral-score/ViralScoreClient.tsx'
const WATCH = 'components/home/WatchVisitorHome.tsx'

// Carregador mínimo: transpila .ts/.tsx, resolve '@/…' e relativos; os overrides trocam o texto de um arquivo (mutantes).
function carregador(over) {
  const cache = new Map()
  const resolver = (de, m) => {
    const base = m.startsWith('@/') ? path.resolve(m.slice(2)) : path.resolve(path.dirname(de), m)
    for (const c of [base, base + '.ts', base + '.tsx', base + '.json', path.join(base, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    throw new Error('não achei ' + m + ' (de ' + de + ')')
  }
  const carregar = (f) => {
    f = path.resolve(f)
    if (cache.has(f)) return cache.get(f).exports
    const mod = { exports: {} }
    cache.set(f, mod)
    if (f.endsWith('.json')) { mod.exports = JSON.parse(fs.readFileSync(f, 'utf8')); return mod.exports }
    const rel = path.relative(process.cwd(), f).split(path.sep).join('/')
    const src = over[rel] ?? lf(f)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const req = (m) => (m === 'react' || m.startsWith('react/') || m.startsWith('react-dom')) ? require(m) : (m.startsWith('@/') || m.startsWith('.')) ? carregar(resolver(f, m)) : require(m)
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return carregar
}

const estilos = (html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
const ENTIDADE = /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i
const ARRISCADO = /[<>&"']/

// Texto de um literal de template ou string (sem as interpolações ${…}).
const textoDoLiteral = (s) => {
  const t = s.trim()
  if (/^`[\s\S]*`$/.test(t)) return t.slice(1, -1).replace(/\$\{[^}]*\}/g, '')
  if (/^'[^'\n]*'$/.test(t) || /^"[^"\n]*"$/.test(t)) return t.slice(1, -1)
  return null
}
// Os pedaços de texto de uma expressão: literais, constantes do mesmo arquivo (const NOME = `…`) e ternários/somas entre elas.
function pedacos(expr, src) {
  const direto = textoDoLiteral(expr)
  if (direto !== null) return [direto]
  const ternario = expr.match(/^[^?`'"]+\?([^:]+):([\s\S]+)$/) // cond ? A : B — a condição não é texto; valem os dois ramos
  const ramos = ternario ? [ternario[1], ternario[2]] : [expr]
  const out = []
  for (const p of ramos.flatMap((r) => r.split('+')).map((x) => x.trim()).filter(Boolean)) {
    const lit = textoDoLiteral(p)
    if (lit !== null) { out.push(lit); continue }
    if (!/^[A-Za-z_$][\w$]*$/.test(p)) return null
    const m = src.match(new RegExp('(?:^|\\n)\\s*(?:export\\s+)?const\\s+' + p + '\\s*(?::[^=]+)?=\\s*(`[\\s\\S]*?`|\'[^\'\\n]*\'|"[^"\\n]*")'))
    if (!m) return null
    out.push(textoDoLiteral(m[1]))
  }
  return out
}
function varrer(over) {
  const falhas = []
  const andar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.next') andar(p); continue }
      if (!e.name.endsWith('.tsx')) continue
      const rel = p.split(path.sep).join('/')
      const src = (over[rel] ?? lf(p))
      for (const m of src.matchAll(/<style(\s[^>]*)?>\{([\s\S]*?)\}<\/style>/g)) {
        if (/\bjsx\b|dangerouslySetInnerHTML/.test(m[1] || '')) continue
        const linha = src.slice(0, m.index).split('\n').length
        const ps = pedacos(m[2], src)
        if (ps === null) { falhas.push(`${rel}:${linha} <style>{${m[2].trim().slice(0, 50)}} não dá para ler — use dangerouslySetInnerHTML`); continue }
        const ruim = ps.find((t) => ARRISCADO.test(t))
        if (ruim !== undefined) falhas.push(`${rel}:${linha} <style>{…} com ${[...new Set(ruim.match(/[<>&"']/g))].join(' ')} (o servidor escapa, o cliente não: hidratação quebra)`)
      }
    }
  }
  andar('app'); andar('components')
  return falhas
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  await check('(A) o <style> que o servidor manda é o CSS da fonte, sem entidade', async () => {
    const C = carregador(over)(CIT)
    const src = over[CIT] ?? lf(CIT)
    const css = (n) => src.split('const ' + n + ' = `')[1].split('`')[0]
    for (const page of ['home', 'seedance', 'text', 'horror', 'urdu', 'portuguese']) {
      const html = renderToString(React.createElement(React.Fragment, null, React.createElement(C.CitationDirectAnswer, { page }), React.createElement(C.CitationDetails, { page })))
      const st = estilos(html)
      if (st.length !== 1) throw new Error(`${page}: ${st.length} <style>`)
      if (ENTIDADE.test(st[0])) throw new Error(`${page}: o servidor manda ${st[0].match(ENTIDADE)[0]} dentro do <style>`)
      const esperado = page === 'home' ? css('STYLE') + css('HOME_STYLE') : css('STYLE')
      if (st[0] !== esperado) throw new Error(`${page}: o CSS do servidor não é o da fonte`)
    }
    if (!ARRISCADO.test(css('HOME_STYLE'))) throw new Error('o HOME_STYLE perdeu o ">" — o teste (A) deixou de provar o escape')
  })
  await check('(B) nenhum <style>{…} cru com < > & " \' no repositório', async () => {
    const f = varrer(over)
    if (f.length) throw new Error('\n  ' + f.join('\n  '))
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['a seção da home volta a <style>{…}', CIT, '      <style dangerouslySetInnerHTML={{ __html: home ? STYLE + HOME_STYLE : STYLE }} />', '      <style>{home ? STYLE + HOME_STYLE : STYLE}</style>'],
  ['o /viral-score volta a <style>{CSS}', VIRAL, '      <style dangerouslySetInnerHTML={{ __html: CSS }} />', '      <style>{CSS}</style>'],
  ['outra tela ganha ">" no CSS cru', WATCH, '<style>{CSS}</style>', '<style>{CSS_RUIM}</style>', (t) => t.replace(/\nconst CSS\s*=/, '\nconst CSS_RUIM = `.a>.b{color:red}`\nconst CSS =')],
  ['outra tela ganha CSS literal com aspas', WATCH, '<style>{CSS}</style>', "<style>{`.a::after{content:'x'}`}</style>"],
]
let mortos = 0
for (const [n, f, de, para, extra] of mutantes) {
  const t = lf(f)
  if (t.split(de).length !== 2) { console.error('MUTANTE SEM ÂNCORA: ' + n); process.exit(1) }
  let novo = t.split(de).join(para)
  if (extra) novo = extra(novo)
  if ((await bateria({ [f]: novo })).length) mortos++
  else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS hidratação: o <style> da seção da home sai do servidor igual ao do cliente nas 6 páginas, sem entidade; nenhum <style>{…} cru com < > & " ' no repositório (${mortos}/${mutantes.length} mutantes mortos)`)
