// Offline, self-contained preview of the actual hydrated notice component.
// No browser, network, analytics, app server, or production request.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '../../..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const page = read('app/chatgpt-to-youtube-shorts/page.tsx')
const lib = read('lib/gptHandoff.ts')
const labels = lib.match(/export const ENGINE_LABELS[^=]*= (\{[\s\S]*?\n\})/)[1]
const ceiling = Number(read('lib/durationFollowsScript.ts').match(/DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS = (\d+)/)[1])
const allMessages = page.match(/const HANDOFF_ERROR_MESSAGES[^=]*= (\{[\s\S]*?\n\})/)[1]
const keys = ['script_too_long_for_kineo1', 'engine_language']
const messageLines = allMessages.split('\n').filter(line => keys.some(key => line.trim().startsWith(key + ':')))
const messages = vm.runInNewContext(`(${labels}); const ENGINE_LABELS = ${labels}; const DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS = ${ceiling}; ({${messageLines.join('\n')}})`)
let selected = null
const exportsObject = {}
const componentJs = ts.transpileModule(read('app/chatgpt-to-youtube-shorts/HandoffErrorNotice.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(componentJs, { exports: exportsObject, require: spec => {
  if (spec === 'react') return { ...React, useState: () => [selected, () => {}], useEffect: () => {} }
  if (spec === 'react/jsx-runtime') return require('react/jsx-runtime')
  if (spec === '@/lib/analytics') return { trackEvent: () => { throw Error('Preview must not emit analytics') } }
  if (spec === '@/components/OrganicCtaLink') return { default: ({ children, href, style }) => React.createElement('a', { href, style }, children) }
  throw Error('Unexpected dependency: ' + spec)
} })
const Notice = exportsObject.default
const cardStyle = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const render = slug => { selected = slug; return renderToStaticMarkup(React.createElement(Notice, { handoffId: 'chatgpt-script-handoff', campaign: 'chatgpt_to_shorts', messages, cardStyle, accent: '#2997ff' })) }
const after = Object.fromEntries(keys.map(key => [key, render(key)]))
if (render(null) !== '') throw Error('Before notice should be absent')
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const rows = keys.map(key => `<section><h2>${key === keys[0] ? 'Roteiro longo para Kineo 1' : 'Idioma incompatível com Kling 3 / H3'}</h2>${[1000,390].map(width => `<h3>${width === 1000 ? 'Desktop · 1000 px' : 'Mobile · 390 px'}</h3><div class="pair"><article><h4>ANTES · base ce50b9c0</h4><p class="explain">O link era aceito e seguia para /go. Não havia aviso destes dois motivos.</p><iframe title="Antes ${key} ${width}" style="width:${width}px" srcdoc="${escape('<!doctype html><html><body style="margin:0;padding:24px;background:#000;color:#8b8b94;font-family:Arial,sans-serif"><p>Aviso ausente neste caminho.</p></body></html>')}"></iframe></article><article><h4>DEPOIS · candidato LOCAL</h4><p class="explain">Recusa antes de gravar o link; aviso no topo da página existente.</p><iframe title="Depois ${key} ${width}" style="width:${width}px" srcdoc="${escape('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#000;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif}</style></head><body>'+after[key]+'</body></html>')}"></iframe></article></div>`).join('')}</section>`).join('')
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GPT Loja · avisos /make · antes/depois</title><style>body{margin:0;padding:28px;background:#0b0b0d;color:#f5f5f7;font:16px/1.5 system-ui,sans-serif}h1{font-size:28px}h2{margin-top:48px}h4{margin:0}.explain{color:#aaa;max-width:70ch}.pair{display:flex;gap:24px;overflow:auto;padding:12px 0}article{flex:none}iframe{height:295px;border:1px solid #333;max-width:none}a{color:#2997ff}</style></head><body><h1>/make · duas recusas com saída clara</h1><p>LOCAL · revisão de texto pendente. Base ce50b9c0 · 24/09/2026. Sem publicação, tráfego ou pagamento de teste.</p><p>Comparação do aviso: o “depois” usa o JSX real de HandoffErrorNotice e as frases do candidato, com o estado hidratado simulado offline. O “antes” documenta ausência da recusa, não simula uma captura de /go. Não há redesenho de /go nem mudança da régua de duração.</p>${rows}<p>Os links dos avisos são âncoras locais; este arquivo não cria handoff nem dispara eventos.</p></body></html>`
fs.writeFileSync(path.join(__dirname, 'preview.html'), html)
console.log('Generated preview.html with both notices at 1000/390px from actual component and source copy.')
