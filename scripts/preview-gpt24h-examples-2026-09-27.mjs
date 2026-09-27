import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
const load = offlineModules({ replacements: {'app/examples/ExamplesGallery.tsx':source('app/examples/ExamplesGallery.tsx').replace('function ExamplePreview(', 'export function ExamplePreview(')}, mocks: {
  'components/InterfaceLanguage.tsx': { UiLabel:({children})=>children, useUiCopy:()=>s=>s },
}})
const { EXAMPLES_SELECTION_SEP24 } = load('lib/ui/examplesSelectionSep24.ts')
const { examplesSprintVideo } = load('lib/growth/examplesSprintIntent.ts')
const { ExamplePreview } = load('app/examples/ExamplesGallery.tsx')
const css = source('app/examples/ExamplesGallery.module.css')
const attr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
let body = ''
for (const v of EXAMPLES_SELECTION_SEP24) {
  body += `<section><h2>${escapeHtml(v.title)}</h2>`
  for(const after of [false,true]) {
    const video = after ? examplesSprintVideo(v) : v
    const poster = `data:image/webp;base64,${readFileSync(resolve(root,'public'+v.posterUrl)).toString('base64')}`
    const html = renderToStaticMarkup(React.createElement(ExamplePreview,{video,onClose:()=>{},actionLabel:after?'Make one like this':undefined}))
      .replace(/<video\b[^>]*><\/video>/g,`<img src="${poster}" alt="Poster do exemplo" style="width:100%;height:100%;object-fit:contain"/>`)
    const doc = `<!doctype html><html><meta charset="utf-8"><style>:root{--bg:#fafaf8;--text:#26323d;--card:white;--border:#ddd;--accent:#2563eb;--muted:#64748b}body{margin:0;font-family:Arial}${css}.dialog{position:static;display:block;margin:0;width:100%;max-width:none;max-height:none;border:0}.dialogInner{max-height:none}</style>${html}</html>`
    body += `<h3>${after?'DEPOIS':'ANTES'}</h3><p>Destino: ${escapeHtml(video.href)}</p><div class="pair">${[1000,390].map(width=>`<iframe title="${v.id} ${after?'after':'before'} ${width}" width="${width}" height="950" srcdoc="${attr(doc)}"></iframe>`).join('')}</div>`
  }
  body += '</section>'
}
writeFileSync(resolve(root,'docs/previews/GPT24H-G4-2026-09-27.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>G4 · Examples</title><style>body{font:16px Arial;background:#e4e9eb;color:#23303b;margin:24px}.pair{display:flex;gap:24px;overflow:auto}iframe{border:1px solid #bbc7ce;background:white}section{margin:36px 0}</style><h1>G4 · CTA existente, antes/depois</h1><p>JSX real do modal, aberto apenas para esta comparação estática. Vídeo substituído pelo poster; não testa reprodução. Galeria/home intactas. Business ads permanece oculta porque o catálogo aprovado está vazio: nenhum case inventado.</p>${body}</html>`)
console.log('Generated G4 preview')
