// Follow the approved aeced38a extraction through real parent props and child JSX.
// Pure AST/VM inspection: no component effects, requests, DOM, or paid operations.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

const nodes = (node, predicate) => { const found = []; const visit = item => { if (predicate(item)) found.push(item); ts.forEachChild(item, visit) }; visit(node); return found }
const parse = code => ts.createSourceFile('source.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const evaluate = (expression, values) => vm.runInNewContext(ts.transpileModule('(' + expression + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, values, { timeout: 1000 })
function attr(element, name, ast) {
  const attribute = element.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(ast) === name)
  assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression, 'Missing executable attribute ' + name)
  return attribute.initializer.expression.getText(ast)
}

export function inspectFilmPreviewConnection(historyCode, childCode) {
  const history = parse(historyCode), child = parse(childCode)
  const elements = ast => nodes(ast, n => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))
  const parents = elements(history).filter(n => n.tagName.getText(history) === 'FilmPreviewDialog')
  assert.equal(parents.length, 1, 'one current preview caller')
  const parent = parents[0]
  let scope = parent.parent
  while (scope && !ts.isArrowFunction(scope)) scope = scope.parent
  assert.ok(scope, 'preview remains inside its owner lookup')
  const srcDeclarations = nodes(scope, n => ts.isVariableDeclaration(n) && n.name.getText(history) === 'src')
  assert.equal(srcDeclarations.length, 1)
  const sourceExpression = srcDeclarations[0].initializer.getText(history)
  const video = elements(child).find(n => n.tagName.getText(child) === 'video')
  const button = elements(child).find(n => n.tagName.getText(child) === 'button' && n.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(child) === 'onClick' && a.initializer?.expression?.getText(child) === 'onDownload'))
  const close = elements(child).find(n => n.tagName.getText(child) === 'button' && n.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(child) === 'onClick' && a.initializer?.expression?.getText(child) === 'onClose'))
  const overlay = elements(child).find(n => n.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(child) === 'className' && a.initializer?.expression?.getText(child) === 'styles.overlay'))
  assert.ok(video && button && close && overlay, 'real video, download, close and backdrop controls exist')
  for (const pending of [false, true]) {
    const v = { id: 'offline-film', video_url: 'original.mp4' }, downloads = [], closes = []
    const parentValues = { v, src: 'selected.mp4', downloadingId: pending ? v.id : null, handleDownload: value => downloads.push(value), setLightbox: value => closes.push(value) }
    const values = Object.fromEntries(['src', 'downloading', 'onDownload', 'onClose'].map(name => [name, evaluate(attr(parent, name, history), parentValues)]))
    assert.equal(evaluate(attr(video, 'src', child), values), 'selected.mp4')
    assert.equal(evaluate(attr(button, 'disabled', child), values), pending)
    assert.equal(downloads.length, 0, 'evaluating props cannot download')
    evaluate(attr(button, 'onClick', child), values)()
    assert.deepEqual(downloads, [v], 'click reaches the same owner-selected film')
    evaluate(attr(close, 'onClick', child), values)()
    assert.deepEqual(closes, [null])
    const backdrop = evaluate(attr(overlay, 'onClick', child), values), target = {}
    backdrop({ target: {}, currentTarget: target })
    assert.deepEqual(closes, [null], 'click inside the dialog does not close it')
    backdrop({ target, currentTarget: target })
    assert.deepEqual(closes, [null, null], 'backdrop still closes')
  }
  return { sourceExpression }
}
