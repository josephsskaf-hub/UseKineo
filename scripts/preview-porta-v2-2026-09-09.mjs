// Preview visual da porta v2 — renderiza o COMPONENTE REAL para HTML estático
// e grava um arquivo que se abre no navegador. Não é teste: é o olho.
// Uso: node scripts/preview-porta-v2-2026-09-09.mjs [saida.html]
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const DOOR = 'components/CardEntryDoor.tsx'

const cache = new Map()
function loadModule(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const box = { exports: {} }
  cache.set(rel, box.exports)
  const js = ts.transpileModule(read(rel), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, console,
    process: { env: { NODE_ENV: 'test' } },
    require: (id) => loadModule(resolveSpec(id, rel)),
  }, { filename: rel })
  cache.set(rel, box.exports)
  return box.exports
}
function resolveSpec(spec, from) {
  let base
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(from.split(path.sep).join('/')), spec)
  else throw new Error('dep: ' + spec)
  for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(path.join(root, base + ext))) return base + ext
  throw new Error('nao resolveu: ' + spec)
}

function door({ prompt, language }) {
  const box = { exports: {} }
  const deps = {
    react: { ...React, useEffect: () => {}, useRef: (c) => ({ current: c }), useState: (i) => [i, () => {}], useMemo: (fn) => fn() },
    'react/jsx-runtime': jsx,
    '@/lib/analytics': { trackEvent: () => {} },
    '@/lib/checkoutTelemetry': { useCheckoutLaunch: () => ({ pending: null, error: null, setError: () => {}, launch: () => true, release: () => {} }) },
    '@/components/InterfaceLanguage': { useInterfaceLanguage: () => language },
  }
  const js = ts.transpileModule(read(DOOR), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, console,
    process: { env: { NODE_ENV: 'test' } },
    require: (id) => (id in deps ? deps[id] : loadModule(resolveSpec(id, DOOR))),
  }, { filename: DOOR })
  return renderToStaticMarkup(box.exports.default({ prompt, onDismiss: () => {} }))
}

const IDEIA = 'Why Roman concrete gets stronger underwater while ours crumbles in 50 years'
const CDN = 'https://www.usekineo.com'
const painel = (titulo, largura, html) =>
  '<figure style="margin:0"><figcaption style="font:700 13px system-ui;color:#9aa4b2;padding:6px 0">' + titulo +
  '</figcaption><div style="width:' + largura + 'px;height:760px;border:1px solid #24303f;border-radius:10px;overflow:hidden;position:relative;background:#0b0f16">' +
  // A folha nasce com opacity:0 e acende no efeito de montagem (fade de 180ms).
  // No render estático o efeito não roda, então o painel sairia VAZIO — acender
  // aqui é ajuste do preview, não do produto.
  html
    .replace(/position:fixed/g, 'position:absolute')
    .replace(/opacity:0/g, 'opacity:1')
    .replace(/src="\//g, 'src="' + CDN + '/')
    .replace(/poster="\//g, 'poster="' + CDN + '/') +
  '</div></figure>'

// Modo celular: a folha SOZINHA, em tamanho natural, para abrir num viewport
// de telefone real — é a única forma de ver se o botão cabe acima da dobra
// (o `40vh` do vídeo é relativo à janela, não ao painel da grade).
if (process.argv.includes('--celular')) {
  const alvo = process.argv[process.argv.indexOf('--celular') + 1] || 'porta-v2-celular.html'
  const lang = process.argv.includes('--es') ? 'es' : process.argv.includes('--hi') ? 'hi' : 'en'
  fs.writeFileSync(alvo,
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Porta v2 no celular</title><body style="margin:0;background:#0b0f16">' +
    door({ prompt: IDEIA, language: lang })
      .replace(/opacity:0/g, 'opacity:1')
      .replace(/src="\//g, 'src="' + CDN + '/')
      .replace(/poster="\//g, 'poster="' + CDN + '/') +
    '</body>')
  console.log('celular (' + lang + ') escrito em ' + alvo)
  process.exit(0)
}

const out = process.argv[2] || 'porta-v2-preview.html'
fs.writeFileSync(out,
  '<!doctype html><meta charset="utf-8"><title>Porta v2 — como a pessoa vê</title>' +
  '<body style="margin:0;padding:20px;background:#05070b;font:14px system-ui;color:#e6edf3">' +
  '<h1 style="font-size:18px;margin:0 0 4px">Porta v2 — a folha no momento do bloqueio</h1>' +
  '<p style="margin:0 0 16px;color:#8b96a5">Componente real (components/CardEntryDoor.tsx), preço da fonte única. Ideia de exemplo: “' + IDEIA + '”</p>' +
  '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">' +
  painel('Celular 375px — inglês', 375, door({ prompt: IDEIA, language: 'en' })) +
  painel('Celular 375px — español', 375, door({ prompt: IDEIA, language: 'es' })) +
  painel('Celular 375px — हिन्दी', 375, door({ prompt: IDEIA, language: 'hi' })) +
  painel('Desktop 720px — sem ideia escrita', 720, door({ prompt: '', language: 'en' })) +
  '</div></body>')
console.log('preview escrito em ' + out)
