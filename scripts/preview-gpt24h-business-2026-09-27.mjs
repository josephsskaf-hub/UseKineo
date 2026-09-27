import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { root, source, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { businessFixture } from './gpt24h-business-fixture.mjs'
const file = 'app/business-video-ads/page.tsx'
const before = execFileSync('git',['show',`365e663a:${file}`],{cwd:root,encoding:'utf8'})
const css = source('app/business-video-ads/businessAds.module.css')
const attr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
const panels = [ ['ANTES',businessFixture({[file]:before})], ['DEPOIS',businessFixture()] ].map(([label,load])=> {
  const html = renderToStaticMarkup(React.createElement(load(file).default))
    .replace('src="/design/business-ads-20260924/restaurant-concept.png"',`src="data:image/png;base64,${readFileSync(resolve(root,'public/design/business-ads-20260924/restaurant-concept.png')).toString('base64')}"`)
  const doc = `<!doctype html><html lang="en"><meta charset="utf-8"><style>:root{--text:#26323d;--bg:#fafaf8;--card:#fff;--border:#dde1e4;--accent:#2563eb;--accent-soft:#eef4ff;--indigo:#283641;--on-accent:white;--muted:#637180}body{margin:0}${css}</style>${html}</html>`
  return `<h2>${label}</h2><div class="pair">${[1200,390].map(width=>`<iframe title="Empresas ${label} ${width}" width="${width}" height="3600" srcdoc="${attr(doc)}"></iframe>`).join('')}</div>`
}).join('')
writeFileSync(resolve(root,'docs/previews/GPT24H-G5-2026-09-27.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>G5 · Empresas</title><style>body{font:16px Arial;background:#e4e9eb;color:#23303b;margin:24px}.pair{display:flex;gap:24px;overflow:auto}iframe{border:1px solid #bbc7ce;background:white}</style><h1>G5 · Studio Ads primeiro</h1><p>Antes/depois: JSX real, imagem existente e CSS incorporados, desktop/mobile. Autenticação e eventos não executados; não é teste de checkout. Preços e prazos vêm das fontes locais.</p>${panels}</html>`)
console.log('Generated G5 preview')
