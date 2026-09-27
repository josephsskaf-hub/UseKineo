// Generates only local SVG-based PNG posters and a self-contained review artifact.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
const localRequire = createRequire(resolve(root, 'package.json'))
const sharpRoot = process.argv[process.argv.indexOf('--sharp-root') + 1]
const sharp = process.argv.includes('--sharp-root') ? createRequire(resolve(sharpRoot, '_entry.cjs'))('sharp') : localRequire('sharp')
const load = offlineModules()
const { ADS_SEGMENTS, adsSegmentPoster } = load('lib/growth/adsSegments.ts')
const { default: Page } = load('app/ads/for/[segment]/page.tsx')
mkdirSync(resolve(root, 'public/og'), { recursive: true })
mkdirSync(resolve(root, 'docs/previews'), { recursive: true })
for (const segment of ADS_SEGMENTS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#edf1f1"/><rect x="58" y="58" width="1084" height="514" rx="24" fill="#fafaf8" stroke="#d4dddf"/><g font-family="Arial,Helvetica,sans-serif" fill="#23303b"><text x="110" y="142" font-size="48" font-weight="bold" letter-spacing="-2">Kineo</text><text x="110" y="258" font-size="24" letter-spacing="4" fill="#627987">STUDIO ADS</text><text x="110" y="345" font-size="60" font-weight="bold">${escapeHtml(segment.shortName)}</text><text x="110" y="420" font-size="28" fill="#52616e">Your business. Your story.</text><text x="110" y="515" font-size="19" fill="#52616e">VIDEO PLACEHOLDER · NOT A CLIENT RESULT</text></g></svg>`
  await sharp(Buffer.from(svg)).png().toFile(resolve(root, 'public' + adsSegmentPoster(segment.slug)))
}
const css = source('app/ads/for/[segment]/segment.module.css')
const previewCss = css.replace('100vw - 1160px', '100% - 1160px')
const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const panes = ADS_SEGMENTS.map(segment => {
  let html = renderToStaticMarkup(React.createElement(Page, { params: { segment: segment.slug } }))
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  const poster = readFileSync(resolve(root, 'public' + adsSegmentPoster(segment.slug))).toString('base64')
  html = html.replaceAll(adsSegmentPoster(segment.slug), `data:image/png;base64,${poster}`)
  // Review mode: open every FAQ so no touched content is concealed.
  html = html.replaceAll('<details>', '<details open>')
  const doc = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${previewCss}</style>${html}</html>`
  return `<section><h2>${escapeHtml(segment.shortName)}</h2><p>ANTES: rota inexistente na base 365e663a. DEPOIS: nova página, conteúdo real do componente. Todos os FAQs abertos nesta revisão.</p><div class="pair"><div><h3>Desktop · 1100 px</h3><iframe title="${escapeHtml(segment.shortName)} desktop" width="1100" height="2400" srcdoc="${escapeAttr(doc)}"></iframe></div><div><h3>Mobile · 390 px</h3><iframe title="${escapeHtml(segment.shortName)} mobile" width="390" height="3400" srcdoc="${escapeAttr(doc)}"></iframe></div></div></section>`
}).join('')
writeFileSync(resolve(root, 'docs/previews/GPT24H-G1-2026-09-27.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>G1 · Revisão dos segmentos</title><style>body{font:16px Arial;background:#e4e9eb;color:#23303b;margin:24px}section{margin:36px 0}.pair{display:flex;gap:24px;align-items:start;overflow:auto}iframe{border:1px solid #bbc7ce;background:white}h1,h2,h3{letter-spacing:-.025em}</style><h1>G1 · Segmentos Studio Ads</h1><p>LOCAL · ainda não publicado. Não há anúncio real nem cliente representado nos posters. Prévia offline, sem render pago ou chamadas ao produto.</p>${panes}</html>`)
console.log('Generated segment posters and docs/previews/GPT24H-G1-2026-09-27.html')
