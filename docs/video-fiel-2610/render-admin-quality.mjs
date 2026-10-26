// Real page/component SSR, synthetic anonymous data, inert service boundaries. No production/browser/model requests.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const DIR = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(DIR, '../..')
const BASE = '9d8d3fad413d94798081528dbd61f3ba7848a76a'
const require = createRequire(path.join(ROOT, 'package.json')), ts = require('typescript'), React = require('react'), jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const PAGE = 'app/admin/coerencia/page.tsx', sources = []
const denied = () => { throw Error('Preview does not access network, storage, accounts or evaluation') }
const coverage = frames => ({ expected_frames: frames, judged_frames: frames, unique_frames: frames, expected_readings: 2, valid_readings: 2, readings_identical: false, independent_readings: false, audio_evaluated: false })
const validated = (score, frames = null) => ({ score, evidence_validation: '2026-10-26', evidence_status: 'complete', evidence_reasons: [], coverage: coverage(frames) })
const examples = [
  { suffix: '1', topic: 'Crie um filme curto sobre três ruínas. Inclua uma descoberta em cada lugar.', narration: 'Crie um filme curto sobre três ruínas. Inclua uma descoberta em cada lugar.', fast: 95, text: { score: 98, idea_source: 'roteiro', problems: [] }, pixel: { score: 85, caps: ['Legenda fragmentada em dois quadros.'] } },
  { suffix: '2', topic: 'Uma criança encontra uma chave azul. O avô abre o portão e os dois sorriem.', narration: 'Uma criança encontra uma chave azul. O avô abre o portão e os dois sorriem.', fast: 90, text: { ...validated(96), idea_source: 'roteiro', fidelity_basis: 'supplied_script', problems: [] }, pixel: { ...validated(92, 8), caps: [], summary: 'A inspeção forneceu todos os quadros e leituras previstos.' } },
  { suffix: '3', topic: 'Um pequeno dragão encontra um ovo dourado no jardim.', narration: 'O pequeno dragão encontra um ovo dourado. Um passarinho sai do ovo.', fast: 95, text: { ...validated(99), idea_source: 'pedido_direto', fidelity_basis: 'original_request', problems: [] }, pixel: { ...validated(null, 8), evidence_status: 'incomplete', evidence_reasons: ['frame_response_incomplete'], coverage: { ...coverage(8), judged_frames: 2, valid_readings: 1 } } },
]
const videos = examples.map(x => ({ video_id: `example-${x.suffix}`, user_id: `example-person-${x.suffix}`, email: null, created_at: `2026-10-26T01:0${x.suffix}:00Z`, engine: 'cinematic_ai', topic: x.topic, topic_truncated: false, narration: x.narration, narration_source: 'birth_claim', seconds: 15, claim_seconds: 15, credits: null, generation_id: `example-generation-${x.suffix}`, render_id: null, url: '#example-video', scenes: [{ scene: 1, voiceover: x.narration, query: 'A fictional garden scene.', from: 0, sources: ['aiVideo'], tags: [] }], coherence: { score: x.fast, verdict: 'coherent', prompt_vs_narration: 100, narration_vs_visuals: x.fast * 2 - 100, summary: 'Exemplo sintético de apresentação, não é uma nova avaliação.', problems: [], request_pt: x.topic, worst_scene: null }, coherence_at: null, feedback: null, feedback_asked_at: null, juiz_still: null }))
const events = examples.flatMap(x => ['coherence_v2', 'pixel_score'].map(name => ({ name, created_at: `2026-10-26T02:0${x.suffix}:00Z`, session_id: `example-${x.suffix}`, user_id: `example-person-${x.suffix}`, metadata: { version: name === 'coherence_v2' ? 'regua95_coerencia_v2' : 'regua95_pixel_v1', product: 'filme', engine: 'cinematic_ai', delivered_at: `2026-10-26T01:0${x.suffix}:00Z`, video_id: `example-${x.suffix}`, generation_id: `example-generation-${x.suffix}`, ...(name === 'coherence_v2' ? x.text : x.pixel) } })))

function loader(base) {
  const cache = new Map()
  let panel
  const getPanel = () => panel ??= load('lib/admin/regua95Painel.ts')
  function load(spec, parent = '') {
    if (spec === 'react') return React
    if (spec === 'react/jsx-runtime') return jsx
    if (spec === 'next/link') return { __esModule: true, default: props => React.createElement('a', props, props.children) }
    if (spec === 'next/navigation') return { useRouter: () => ({ refresh: denied }) }
    if (spec === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'preview@example.invalid' } } }) } }) }
    if (spec === '@/lib/supabase/readAll') return { readAll: denied }
    if (spec === '@/app/api/admin/_shared/db') return { isAdminEmail: () => true, serviceClient: () => ({}) }
    if (spec === '@/lib/admin/fastCoherence') return { ENGINE_LABEL: { cinematic_ai: 'Seedance 1.5' }, listFastCoherence: async () => videos }
    if (parent === PAGE && spec === '@/lib/admin/regua95Painel') return { placarRegua: (...args) => getPanel().placarRegua(...args), lerRegua95: async () => ({ notas: getPanel().juntarNotasRegua(events, '2026-10-19T00:00:00Z'), desde: '2026-10-19T00:00:00Z', casaFora: 0 }) }
    if (spec === '@/lib/hollywood/juizStill') return { ROTULO_CRITERIO: {} }
    let rel = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.join(path.posix.dirname(parent), spec) : spec
    assert.ok(/^(app|components|lib)\//.test(rel) && !rel.includes('..') && !rel.includes('.env'), `Unexpected import ${rel}`)
    if (!/\.(tsx?|json)$/.test(rel)) rel += ['.ts', '.tsx'].find(ext => fs.existsSync(path.join(ROOT, rel + ext))) ?? '.ts'
    if (cache.has(rel)) return cache.get(rel)
    const source = base ? execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 }) : fs.readFileSync(path.join(ROOT, rel), 'utf8')
    sources.push({ file: rel, state: base ? BASE : 'candidate-worktree', sha256: createHash('sha256').update(source).digest('hex') })
    const exports = {}; cache.set(rel, exports)
    const code = ts.transpileModule(source, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { exports, require: name => load(name, rel), Date, URL, URLSearchParams, console, process: { env: {} }, fetch: denied, setTimeout: denied }, { filename: rel, timeout: 5000 })
    return exports
  }
  return load
}
const before = renderToStaticMarkup(await loader(true)(PAGE).default({ searchParams: {} }))
const after = renderToStaticMarkup(await loader(false)(PAGE).default({ searchParams: {} }))
const oldIntake = loader(true)('lib/pastedDirectives.ts'), newIntake = loader(false)('lib/pastedDirectives.ts')
const requestExample = 'Crie um vídeo de 3 minutos sobre o sistema solar.'
function renderActualNotice(base, avisoColado, capacityLocale) {
  const file = 'app/(dashboard)/generate/GenerateClient.tsx'
  const source = base ? execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 }) : fs.readFileSync(path.join(ROOT, file), 'utf8')
  sources.push({ file, state: base ? BASE : 'candidate-worktree', sha256: createHash('sha256').update(source).digest('hex') })
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), paragraphs = []
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'p' && node.children.some(c => ts.isJsxExpression(c) && c.expression?.getText(ast) === 'avisoColado')) paragraphs.push(node.getText(ast))
    ts.forEachChild(node, visit)
  }
  visit(ast); assert.equal(paragraphs.length, 1)
  const box = { exports: {}, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx } }
  const code = `export default function Notice({avisoColado, capacityLocale}) { return ${paragraphs[0]} }`
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: 1, target: 9, jsx: ts.JsxEmit.ReactJSX } }).outputText, box)
  return renderToStaticMarkup(React.createElement(box.exports.default, { avisoColado, capacityLocale }))
}
const intakeBefore = renderActualNotice(true, oldIntake.fraseDoQueNaoDamosConta(oldIntake.readPastedDirectives(requestExample)), 'pt')
const intakeAfter = renderActualNotice(false, newIntake.fraseDoQueNaoDamosConta(newIntake.readPastedDirectives(requestExample), 'pt'), 'pt')
assert.ok(intakeBefore && intakeAfter && intakeBefore !== intakeAfter)
const oldHindi = loader(true)('lib/ui/interfaceHindi.ts').INTERFACE_HI, newHindi = loader(false)('lib/ui/interfaceHindi.ts').INTERFACE_HI
const addedHindi = Object.keys(newHindi).filter(key => !(key in oldHindi))
const escapeText = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const intakeComparison = `<section style="padding:24px;max-width:1400px;margin:auto"><h2>AVISO DA ENTRADA · interface em português</h2><p>Texto de exemplo: ${escapeText(requestExample)}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px"><article><h3>ANTES · texto do aviso</h3><div style="padding:16px;border:1px solid #64748b;border-radius:9px">${intakeBefore}</div></article><article><h3>DEPOIS · texto do aviso</h3><div style="padding:16px;border:1px solid #60a5fa;border-radius:9px">${intakeAfter}</div></article></div><h2>COBERTURA HINDI · traduções que faltavam no dicionário</h2><p>Mesmas mensagens, números e condições já existentes. Sem preço ou oferta novos.</p>${addedHindi.map(key => `<article style="padding:12px 0;border-top:1px solid #334155"><b>${escapeText(key)}</b><p>ANTES · fallback em inglês: ${escapeText(key)}</p><p>DEPOIS · ${escapeText(newHindi[key])}</p></article>`).join('')}</section>`
const escaped = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
const doc = markup => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif}button,a{touch-action:manipulation}p,li,span,summary,pre{overflow-wrap:anywhere}</style><body>${markup}<script>document.addEventListener('click',e=>{if(e.target.closest('a,button'))e.preventDefault()});</script></body></html>`
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · Qualidade antes e depois</title><style>*{box-sizing:border-box}body{margin:0;background:#07101d;color:#e2e8f0;font:15px/1.5 Arial,Helvetica,sans-serif}header{padding:22px 28px;border-bottom:1px solid #334155}h1{margin:0 0 8px;font-size:24px}p{max-width:1000px;margin:6px 0;color:#b8c7da}nav{padding:14px 28px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}button{padding:10px 16px;border:1px solid #64748b;color:#e2e8f0;background:#17263b;border-radius:8px;cursor:pointer}button[aria-pressed=true]{background:#214f86;border-color:#93c5fd}.comparison{display:flex;gap:18px;padding:0 22px 24px;align-items:start;justify-content:center}.panel{min-width:0;width:calc(50% - 9px)}h2{margin:8px 0;color:#cbd5e1;font-size:17px}iframe{display:block;background:#07090d;border:1px solid #334155;border-radius:10px;width:100%;height:2850px}.mobile .panel{width:390px;max-width:100%}@media(max-width:780px){.comparison{flex-direction:column;align-items:center}.panel{width:100%}header,nav{padding-left:16px;padding-right:16px}}</style><header><h1>Kineo · Avaliação com evidência</h1><p>Comparação da página e dos componentes reais, renderizados localmente. Exemplos sintéticos e anônimos: histórico, inspeção completa e avaliação incompleta. Não são novas notas de clientes.</p><p>Prévia sem geração, cobrança, mensagens ou acesso a produção. Os controles do painel são ilustrativos.</p></header><nav><span>Tamanho:</span><button data-size="desktop" aria-pressed="true">Desktop</button><button data-size="mobile" aria-pressed="false">Mobile · 390 px</button></nav><div class="comparison"><section class="panel"><h2>ANTES · nota textual em destaque</h2><iframe title="Antes da correção" srcdoc="${escaped(doc(before))}"></iframe></section><section class="panel"><h2>DEPOIS · cobertura e limites explícitos</h2><iframe title="Depois da correção" srcdoc="${escaped(doc(after))}"></iframe></section></div><script>document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.comparison').classList.toggle('mobile',b.dataset.size==='mobile');document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));</script></html>`
const resizeScript = `<script>function fitPreviews(){document.querySelectorAll('iframe').forEach(f=>{if(!f.contentDocument)return;f.style.height='1px';f.style.height=(f.contentDocument.body.scrollHeight+24)+'px'})}document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',fitPreviews));document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(fitPreviews)));fitPreviews();</script>`
const endHtml = html.lastIndexOf('</html>')
fs.writeFileSync(path.join(DIR, 'admin-antes-depois.html'), html.slice(0, endHtml) + intakeComparison + resizeScript + html.slice(endHtml))
fs.writeFileSync(path.join(DIR, 'admin-preview-provenance.json'), JSON.stringify({ generated_at_utc: new Date().toISOString(), base: BASE, head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), source_worktree_has_uncommitted_changes: true, data: 'Three synthetic anonymous examples, no customer media/identifiers or production access', inert_boundaries: ['auth', 'database', 'network', 'navigation', 'evaluation', 'feedback'], sources }, null, 2))
console.log('Created real before/after SSR for admin page; synthetic data, no external access.')
