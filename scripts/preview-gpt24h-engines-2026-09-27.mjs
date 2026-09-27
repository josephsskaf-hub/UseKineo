import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { root, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
const page = 'app/ai-video-generator/[engine]/page.tsx'
const before = engineFixture({ [page]: execFileSync('git',['show',`365e663a:${page}`],{cwd:root,encoding:'utf8'}) })
const after = engineFixture()
const { PAID_ENGINE_PROOF } = after('lib/growth/paidEngineProof.ts')
const attr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
function inlinePosters(html) {
  return html.replace(/poster="([^"]+)"/g, (all,path) => {
    const file = resolve(root,'public'+path)
    if (!existsSync(file)) return all
    return `poster="data:image/${path.endsWith('.webp')?'webp':'jpeg'};base64,${readFileSync(file).toString('base64')}"`
  }).replace(/<video[^>]*poster="([^"]+)"[^>]*><\/video>/g, (_,poster) => `<img src="${poster}" alt="Poster do preview real; reprodução disponível apenas no site" style="width:100%;height:100%;object-fit:cover"/>`)
}
let body = ''
for (const slug of Object.keys(PAID_ENGINE_PROOF)) {
  body += `<section><h2>${escapeHtml(slug)}</h2>`
  for (const [label,load] of [['ANTES',before],['DEPOIS',after]]) {
    const html = renderToStaticMarkup(await load(page).default({params:{engine:slug}}))
    // Only the touched hero, house gallery and technical table. Stop at how-it-works.
    const end = html.lastIndexOf('<section',html.indexOf('How it works'))
    const content = inlinePosters(html.slice(0,end).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''))
    const doc = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}a:focus-visible{outline:3px solid orange}</style>${content}</html>`
    body += `<h3>${label}</h3><div class="pair">${[1100,390].map(width=>`<iframe title="${slug} ${label} ${width}" width="${width}" height="2000" srcdoc="${attr(doc)}"></iframe>`).join('')}</div>`
  }
  body += '</section>'
}
writeFileSync(resolve(root,'docs/previews/GPT24H-G3-2026-09-27.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>G3 · Motores pagos · Antes/depois</title><style>body{font:16px Arial;background:#e4e9eb;color:#23303b;margin:24px}.pair{display:flex;gap:24px;overflow:auto;align-items:start}iframe{border:1px solid #bbc7ce;background:black}section{margin:36px 0}</style><h1>G3 · Revisão local</h1><p>Antes/depois do JSX real, desktop/mobile. Posters incorporados; este arquivo não reproduz vídeos e não testa render. Blocos client e rodapé fora do escopo representados por limites offline. Kineo 1 e ponte preservados. Publicação pelo Claude após revisão.</p>${body}</html>`)
console.log('Generated docs/previews/GPT24H-G3-2026-09-27.html')
