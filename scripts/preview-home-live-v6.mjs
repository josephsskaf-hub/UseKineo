// Offline comparison of the live home JSX; no network, auth, checkout or generation.
import fs from 'node:fs'
import path from 'node:path'
import { renderPage } from './preview-ux-complete.mjs'

const root = path.resolve(import.meta.dirname, '..')
const target = process.argv[2]
if (!target) throw new Error('Pass an absolute output HTML path.')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const galleryCss = fs.readFileSync(path.join(root, 'app/examples/ExamplesGallery.module.css'), 'utf8')
function page(before, theme) {
  const rendered = renderPage('app/KineoLanding.tsx', before, { interfaceLanguage:'en' }, {}, '048878ea')
  const embedded = rendered.replace(/src="(\/(?:posters|videos)\/[^"?]+\.(?:webp|jpg|png))"/g, (match, url, ext) => {
    const file = path.join(root, 'public', url)
    return fs.existsSync(file) ? `src="data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(file).toString('base64')}"` : match
  })
  return `<!doctype html><html lang="en" data-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--font-manrope:Arial;--font-sans:Arial;--font-inter:Arial;--font-space-grotesk:Arial}body{margin:0}button{font:inherit}.appearance-icon{display:inline-grid;place-items:center;width:35px;height:35px;background:transparent;color:inherit;border:1px solid #8da4bd55;border-radius:8px}${galleryCss}</style><body>${embedded}</body></html>`
}
const panels = [1280,390].map(width => `<section><h2>${width === 390 ? 'Mobile · 390px' : 'Desktop · 1280px'}</h2><div class="compare">${[[true,'dark','Antes'],[false,'light','Depois · Branco padrão'],[false,'dark','Depois · Azul-marinho']].map(([before,theme,title])=>`<article><h3>${title}</h3><iframe title="${title} ${width}" width="${width}" height="1200" sandbox="allow-same-origin" srcdoc="${escape(page(before,theme))}"></iframe></article>`).join('')}</div></section>`).join('')
fs.mkdirSync(path.dirname(target), {recursive:true})
fs.writeFileSync(target, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · Home branca e azul</title><style>body{margin:24px;background:#edf2f8;color:#17273b;font:14px system-ui,sans-serif}.compare{display:flex;gap:22px;overflow:auto}article{flex:none}iframe{border:1px solid #c4d2e1;border-radius:12px;background:white}h1{font-size:28px}h3{font-size:14px}section{margin:30px 0}p{max-width:900px;line-height:1.7}</style><h1>Home real · versão aprovada</h1><p>Comparação do JSX da Home, com as mesmas cenas aprovadas. Antes: 048878ea. Depois: branco por padrão e azul-marinho opcional. Renderização offline com pôsteres; sem sessão, geração, pagamentos ou serviços externos. Os menus mantêm seus destinos reais.</p>${panels}</html>`)
console.log(target)
