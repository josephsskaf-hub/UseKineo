// Static evidence only. Real TSX SSR, public local images embedded, no server.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { harness } from './test-own-idea-start.mjs'
const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, '../..')
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript'), jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const file = 'app/(dashboard)/studio/StudioClient.tsx'
const base = execFileSync('git', ['show', `563d7f30064cb0e7ee392490d0e9e48e95c4e1bc:${file}`], { cwd: ROOT, encoding: 'utf8' })
const start = base.indexOf('            <div className="row" style={{ marginBottom: 8 }}>')
const end = base.indexOf('            {/* KINEO-ROTEIRO-CURTO-SEM-FALHA-', start)
const exports = {}
const code = ts.transpileModule(`exports.before = () => (${base.slice(start, end)});`, { fileName: 'before.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(code, { exports, require: name => { if (name !== 'react/jsx-runtime') throw Error(name); return jsx }, UiLabel: ({ children }) => children, setScriptMode() {}, setPrompt() {} })
const before = renderToStaticMarkup(exports.before())
const { component } = harness()
const tree = component({ prompt: '', mode: 'ai', arrivalProtected: false, onUseStarter() {}, onReview() {} })
const after = renderToStaticMarkup(tree).replace('<details>', '<details open>')
const field = '<label class="field-label">Your idea</label><textarea readonly aria-label="Existing idea field"> </textarea>'
const panel = (title, content, width, note) => `<section class="panel" style="max-width:${width}px"><h2>${title}</h2><p class="annotation">${note}</p><div class="surface">${content}${field}</div></section>`
let html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>Algo que é seu — antes/depois local</title><style>
*{box-sizing:border-box}body{margin:0;background:#f0f3f7;color:#17253b;font:14px Arial,Helvetica,sans-serif;padding:28px}h1{font-size:24px}h2{font-size:17px;margin:0 0 8px}.intro{max-width:850px;line-height:1.5}.compare{display:flex;align-items:start;gap:20px;margin:28px 0;flex-wrap:wrap}.panel{width:100%;min-width:0}.annotation{color:#586b80;font-size:12px;line-height:1.45;min-height:35px}.surface{--text:#162b3f;--text2:#344a60;--muted2:#607184;--border:#d8e1ea;--card2:#f6f8fc;--accent:#235ddd;--accent-soft:#eaf0ff;background:#fff;padding:20px;border:1px solid #d8e1ea;border-radius:14px;min-height:440px}.row{display:flex;gap:6px;flex-wrap:wrap}.pill{background:#f6f8fc;color:#344a60;border:1px solid #d8e1ea;padding:7px 10px;border-radius:9px;min-height:32px}.field-label{display:block;font-size:12px;font-weight:bold;margin:16px 0 7px}textarea{width:100%;min-height:100px;border:1px solid #d8e1ea;border-radius:10px;background:#fbfcff;resize:none}.foot{font-size:12px;line-height:1.6;max-width:900px}a{pointer-events:none}
</style><h1>Algo que é seu — componente real</h1><p class="intro">LOCAL · 26/10/2026. Apenas a faixa de iniciadores junto ao campo muda. Motor, geração, elegibilidade, custo, demonstração do barco e os demais blocos mantêm o código anterior. Nenhuma geração, login ou compra é executada nesta evidência.</p>
<div class="compare">${panel('ANTES · computador', before, 560, 'Faixa original da base 563d7f30; campo ilustrativo para situar a mudança.')}${panel('DEPOIS · computador', after, 560, 'Componente TSX atual; referências expandidas para inspeção. Na abertura real ficam recolhidas.')}</div>
<div class="compare">${panel('ANTES · celular', before, 350, 'Mesma faixa original, na largura menor.')}${panel('DEPOIS · celular', after, 350, 'Mesma implementação responsiva. Imagens da biblioteca pública da Kineo.')}</div>
<p class="foot">Limites: SSR estático, fonte Arial, tema claro representativo; sem teste de navegador autenticado. A imagem indica uma referência visual, não o resultado do texto sugerido. O teste comportamental separado executa o clique do componente e o callback real do Studio; a revisão usa foco, sem gerar.</p></html>`
html = html.replace(/src="(\/posters\/[^"<>]+)"/g, (_, asset) => `src="data:image/webp;base64,${readFileSync(path.join(ROOT, 'public', asset)).toString('base64')}"`)
const out = path.join(DIR, 'own-idea-start-preview.html')
writeFileSync(out, html, 'utf8')
console.log(`Static before/after saved: ${out}`)
