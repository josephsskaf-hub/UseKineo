// Layout regression: no network, media fetch, storage, checkout or generation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
const file = 'app/(dashboard)/generate/GenerateClient.tsx'
// KINEO-PAREDE-V1-2026-09-23 — reancorado com motivo: a base 2d6d7940 antecede a parede v1 (fundador 23/09,
// "faz as 3"), que acrescenta handlers, hrefs (intent_campaign=wall_v1), o cartão Empresas e o estado de
// sincronia do pacote no mesmo arquivo. b021fe9d é a ponta que contém a tela larga do Codex (d25748e0) E a
// parede; a trava volta a comparar contra ela. Nada foi afrouxado: a lista de atributos e a lógica antes
// do JSX continuam tendo de ser byte a byte as da base.
const base = 'b021fe9d'
const current = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const previous = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).replace(/\r\n/g, '\n')
let checks = 0
function equal(a, b, label) { assert.deepEqual(a, b, label); checks++ }
function okay(value, label) { assert.ok(value, label); checks++ }
function parse(source) {
  const ast = ts.createSourceFile(file, source, 99, true, 4)
  assert.equal(ast.parseDiagnostics.length, 0)
  return ast
}
function attributes(ast) {
  const found = []
  function walk(n) {
    if (ts.isJsxAttribute(n) && /^(on[A-Z]|ref$|href$|src$|download$|disabled$|data-kineo-frame)/.test(n.name.getText(ast))) found.push(n.getText(ast))
    ts.forEachChild(n, walk)
  }
  walk(ast); return found
}
equal(attributes(parse(current)), attributes(parse(previous)), 'every handler, ref, media source, download target, gate and frame marker preserved')
equal(current.slice(0, current.indexOf('    <main className=')), previous.slice(0, previous.indexOf('    <main className=')), 'all generation, billing and recovery logic before JSX unchanged')
const ast = parse(current)
let result, main, title
function find(n) {
  if (ts.isJsxElement(n)) {
    if (n.openingElement.getText(ast).includes('gv-card done-result')) result = n
    if (n.openingElement.tagName.getText(ast) === 'main') main = n
    if (n.openingElement.tagName.getText(ast) === 'h1' && n.getText(ast).includes('Studio — your finished film')) title = n
  }
  ts.forEachChild(n, find)
}
find(ast)
okay(result && main && title, 'real result workspace and terminal heading found')
const klass = main.openingElement.attributes.properties.find(p => p.name?.getText(ast) === 'className').initializer.expression.getText(ast)
const classFor = new Function('phase', 'finalVideoUrl', 'showRender', `return ${klass}`)
okay(classFor('done', '/film.mp4', true).includes('done-workspace'), 'ready result is full width')
okay(classFor('composing', null, true).includes('render-workspace'), 'generation keeps approved render workspace')
okay(classFor('failed', null, true).includes('max-w-5xl'), 'failure presentation unchanged')
const heading = title.children.find(n => ts.isJsxExpression(n) && n.expression).expression.getText(ast)
const titleFor = new Function('phase', 'searchParams', 'showStep1', 'showScriptPreview', 'showBrollPlanning', 'showVisualDirector', `return ${heading}`)
equal(titleFor('done', new URLSearchParams('studio=1'), false, false, false, false), 'Studio — your finished film', 'terminal screen does not say rendering')
let downloads = 0, preview = null, options = null
function inspect(n, closed = false) {
  if (ts.isJsxElement(n)) {
    const attrs = n.openingElement.attributes.properties
    const text = n.openingElement.getText(ast)
    closed ||= n.openingElement.tagName.getText(ast) === 'details' && !attrs.some(p => p.name?.getText(ast) === 'open')
    if (text.includes('className="done-result-preview"')) preview = n
    if (text.includes('className="done-result-options"')) options = n
    if (attrs.some(p => p.name?.getText(ast) === 'onClick' && p.initializer?.expression?.getText(ast) === 'handleDownload')) {
      okay(!closed, 'existing free/current-file download never hidden in disclosure'); downloads++
    }
  }
  ts.forEachChild(n, child => inspect(child, closed))
}
inspect(result)
okay(downloads >= 2, 'both export-choice and direct-download branches tested')
okay(preview && options, 'player container and optional actions are present')
okay(preview.getText(ast).includes('fitFrameToVideo(e.currentTarget)'), 'real dimensions still drive the frame')
okay(current.includes('.done-result-preview video { object-fit: contain!important; }'), 'player preserves full image')
okay(current.includes('data-kineo-frame-ratio="landscape"') && current.includes('data-kineo-frame-ratio="square"'), 'nonvertical formats have width rules')
okay(current.includes('@media (max-width: 1100px) { .done-workspace .done-result { display: flex; flex-direction: column;'), 'small screens stack without fixed grid columns')
console.log(`${checks} done workspace checks passed; actual handlers and delivery logic preserved.`)
