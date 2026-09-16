// Render the actual before/after pricing route offline. No browser/network use.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fixture, BASE } from './test-pricing-monthly-campaign.mjs'

const [cssFile, outputFile] = process.argv.slice(2)
if (!cssFile || !outputFile) throw new Error('Usage: node script CSS_FILE OUTPUT_HTML')
const css = fs.readFileSync(cssFile, 'utf8')
const escape = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cases = [
  ['Campanha FIRST50', 'promo=FIRST50&intent_campaign=checkout141_completed_first50_20260916'],
  ['Campanha COMEBACK50', 'promo=COMEBACK50'],
  ['Entrada comum — anual preservado', ''],
]
const sections = cases.map(([label, query]) => {
  const versions = [true, false].map(before => {
    const app = fixture(before), view = app.render(query, { ssr: true })
    const destination = app.buy(view.tree, 'basic').href
    const document = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'"><style>${css}</style><body>${view.html}</body></html>`
    return { before, document, billing: view.billing, destination }
  })
  return `<section><h2>${label}</h2><p>/pricing${query ? '?' + escape(query) : ''}</p>${[1280, 390].map(width => `<h3>${width === 1280 ? 'Desktop' : 'Celular'} · ${width}px</h3><div class="pair">${versions.map(({ before, document, billing, destination }) => `<article><h4>${before ? 'ANTES · ' + BASE.slice(0, 8) : 'DEPOIS · candidato A1'}</h4><p>Modalidade: <strong>${billing}</strong></p><details><summary>Destino produzido pelo botão Creator</summary><code>${escape(destination)}</code></details><iframe sandbox title="${label} ${before ? 'antes' : 'depois'} ${width}" width="${width}" height="${width === 1280 ? 1250 : 1750}" srcdoc="${escape(document)}"></iframe></article>`).join('')}</div>`).join('')}</section>`
}).join('')
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · campanhas mensais</title><style>body{background:#0b0e14;color:#edf2ff;font:16px Arial,sans-serif;margin:24px}h1{font-size:28px}h2{margin-top:40px}.pair{display:flex;gap:24px;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #445066;border-radius:10px}code{display:block;white-space:pre-wrap;max-width:700px}p{max-width:1100px;line-height:1.5}</style><h1>Campanhas mensais: antes e depois</h1><p>O mesmo componente real de preços, renderizado offline com a mesma referência USD e uma sessão fictícia. Antes fixado em ${BASE}. Depois usa a modalidade resolvida pela rota. Nenhum preço ou regra de desconto foi alterado.</p><p><strong>Limites:</strong> efeitos, pop-ups e componentes externos são isolados; fonte usa fallback local e mídia fica bloqueada. O HTML não cria checkout, envia eventos ou consulta contas. A comparação não substitui inspeção visual, navegação e hidratação em ambiente autorizado. Modal WELCOME20 é uma pendência separada já registrada.</p>${sections}</html>`
fs.mkdirSync(path.dirname(outputFile), { recursive: true })
fs.writeFileSync(outputFile, html)
console.log(`Preview saved: ${path.relative(root, outputFile)} (${Buffer.byteLength(html)} bytes)`)
