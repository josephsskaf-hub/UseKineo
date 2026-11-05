// KINEO-PERGUNTAS-NA-ESPERA-0511 — guardião sem rede. Renderiza o componente de verdade e confere o lugar dele na espera.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const COMP = 'components/premiere/EsperaPerguntas0511.tsx', PREM = 'components/premiere/Premiere.tsx'
function monta(fonte, react = React) {
  const mod = { exports: {} }
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
  const dublos = { react, '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children }, '@/lib/analytics': { trackEvent: async () => true } }
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (n) => dublos[n], React: react, console, window: {} })
  return mod.exports
}
function prova(fonte = ler(COMP), prem = ler(PREM)) {
  const e = []
  const M = monta(fonte)
  if (M.PERGUNTAS_0511.length !== 2) e.push('são duas perguntas')
  const n = (r) => React.createElement(r)
  if (renderToStaticMarkup(n(M.default)) !== '') e.push('no servidor e antes de ler o storage não aparece nada')
  // com o passo aberto: troca useState para começar na 1ª pergunta
  const aberto = monta(fonte, { ...React, useState: (i) => React.useState(i === null ? 0 : i), useEffect: () => {} })
  const h = renderToStaticMarkup(n(aberto.default))
  if (!/data-kineo="espera-perguntas"/.test(h)) e.push('a pergunta aparece')
  if (!/>Skip</.test(h)) e.push('dá para pular')
  if (/\$\s?\d|US\$|credits?|upgrade|plans?\b|pricing/i.test(h)) e.push('sem preço nem oferta na espera')
  const f = lf(fonte)
  if (!/getItem\(PERGUNTAS_KEY\) === null\) setPasso\(0\)/.test(f)) e.push('pergunta só quem ainda não respondeu')
  if (!/fechar\('skipped'\)/.test(f)) e.push('pular fecha de vez')
  if (!/if \(passo \+ 1 >= PERGUNTAS_0511\.length\) fechar\('done'\)/.test(f)) e.push('responder fecha de vez')
  if (!prem.includes("{surface === 'film' ? <EsperaPerguntas0511 /> : null}")) e.push('só na espera do filme')
  return e
}
const r = prova()
checa(`confere (${r.join('; ') || 'ok'})`, r.length === 0)
const c = ler(COMP), p = ler(PREM)
for (const [nome, cm, pm, esp] of [
  ['oferta na espera', c.replace('Just trying it', 'See plans'), p, /sem preço/],
  ['sem pular', c.replace('<UiLabel>Skip</UiLabel>', 'x'), p, /dá para pular/],
  ['pergunta de novo', c.replace('getItem(PERGUNTAS_KEY) === null) setPasso(0)', 'getItem(PERGUNTAS_KEY) !== 1) setPasso(0)'), p, /ainda não respondeu/],
  ['pular não fecha', c.replace("fechar('skipped'); ", ''), p, /pular fecha/],
  ['em toda espera', c, p.replace("{surface === 'film' ? <EsperaPerguntas0511 /> : null}", '<EsperaPerguntas0511 />'), /só na espera do filme/],
]) { let e; try { e = prova(cm, pm) } catch (x) { e = ['estourou ' + x.message] } if (process.env.VER) console.log(nome, e); checa(`mutante "${nome}" fica vermelho`, e.some((m) => esp.test(m))) }
console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
