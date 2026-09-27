import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
const load = offlineModules()
const { ADS_COMPARISONS } = load('lib/growth/adsComparisons.ts')
const css = source('components/AdsComparisonPage.module.css').replace('100vw - 1080px', '100% - 1080px')
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const body = ADS_COMPARISONS.map(c => {
  const html = renderToStaticMarkup(React.createElement(load(`app/vs/${c.slug}/page.tsx`).default))
  const doc = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${css}</style>${html}</html>`
  const poster = readFileSync(resolve(root,`public/og/vs-${c.id}.png`)).toString('base64')
  return `<section><h2>${escapeHtml(c.name)} alternative</h2><p>ANTES: rota inexistente na base 365e663a. DEPOIS: JSX real, tabela com rolagem horizontal no mobile.</p><div class="pair"><div><h3>Desktop</h3><iframe title="${c.name} desktop" width="1100" height="2600" srcdoc="${attr(doc)}"></iframe></div><div><h3>Mobile</h3><iframe title="${c.name} mobile" width="390" height="3500" srcdoc="${attr(doc)}"></iframe></div></div><h3>OG</h3><img width="600" height="315" alt="OG ${c.name}" src="data:image/png;base64,${poster}" /></section>`
}).join('')
writeFileSync(resolve(root,'docs/previews/GPT24H-G2-2026-09-27.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>G2 · Comparações Studio Ads</title><style>body{font:16px Arial;background:#e4e9eb;color:#23303b;margin:24px}.pair{display:flex;gap:24px;overflow:auto;align-items:start}iframe{border:1px solid #bbc7ce;background:white}section{margin:36px 0}</style><h1>G2 · Revisão local</h1><p>Não publicado. Fontes do documento autorizado; lacunas explícitas; sem consulta externa ou teste do produto.</p>${body}</html>`)
console.log('Generated docs/previews/GPT24H-G2-2026-09-27.html')
