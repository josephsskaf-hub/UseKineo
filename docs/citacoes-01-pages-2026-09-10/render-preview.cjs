// Local-only preview of the actual server components. No env file, network,
// video generation, account or database access. Run from this worktree root.
const fs = require('fs')
const path = require('path')
const Module = require('module')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
let networkAttempts = 0
const rejectNetwork = () => { networkAttempts += 1; throw new Error('Network is forbidden in this local preview') }
global.fetch = rejectNetwork
for (const protocol of ['http', 'https']) {
  const transport = require(protocol)
  transport.request = rejectNetwork
  transport.get = rejectNetwork
}
const root = process.cwd()
const originalResolve = Module._resolveFilename
const originalLoad = Module._load
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest)
}
Module._load = function (request, parent, isMain) {
  if (request === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children)
  if (request === 'next/image') return (props) => React.createElement('img', props)
  if (request === '@/components/OrganicCtaLink') return ({ children, source, placement, ...props }) => React.createElement('a', { ...props, 'data-source': source, 'data-placement': placement }, children)
  return originalLoad.call(this, request, parent, isMain)
}
for (const ext of ['.ts', '.tsx']) Module._extensions[ext] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText
  module._compile(code, filename)
}
const { CITATION_ANSWERS, CITATION_CTA } = require(path.join(root, 'lib/growth/citationAnswers.ts'))
const Page = require(path.join(root, 'components/CitationAnswerPage.tsx')).default
const Links = require(path.join(root, 'components/CitationAnswerLinks.tsx')).default
const { PUBLIC_EXAMPLES } = require(path.join(root, 'lib/publicExamples.ts'))
const { ENGINE_LANDING_PUBLIC_PATHS } = require(path.join(root, 'lib/growth/engineLandingIntent.ts'))
const sample = PUBLIC_EXAMPLES[0]
const poster = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public', sample.posterPath)).toString('base64')
const document = (body) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#07090d;font-family:Arial,sans-serif}body{overflow-x:hidden}</style></head><body>' + body + '</body></html>'
const previews = Object.values(CITATION_ANSWERS).map((answer) => {
  const markup = renderToStaticMarkup(React.createElement(Page, { answer }))
  if ((markup.match(/<h1>/g) || []).length !== 1) throw new Error('H1 count: ' + answer.id)
  if ((markup.match(/<details>/g) || []).length !== 5) throw new Error('FAQ count: ' + answer.id)
  if ((markup.match(/class="kc-cta"/g) || []).length !== 2) throw new Error('CTA count: ' + answer.id)
  if (!markup.includes(CITATION_CTA)) throw new Error('CTA mismatch: ' + answer.id)
  if (markup.includes('utm_source=chatgpt') || markup.includes('USD worldwide')) throw new Error('Attribution/currency mismatch')
  const jsonLd = markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  const faq = JSON.parse(jsonLd[1])
  if (faq.mainEntity.length !== 5 || faq.mainEntity.some((item, i) => item.name !== answer.faqs[i].question || item.acceptedAnswer.text !== answer.faqs[i].answer)) throw new Error('FAQ schema mismatch')
  for (const link of answer.links) {
    const pathname = link.href.split('#')[0]
    const file = path.join(root, 'app', pathname, 'page.tsx')
    const engineRoute = Object.values(ENGINE_LANDING_PUBLIC_PATHS).includes(pathname)
      && fs.existsSync(path.join(root, 'app/ai-video-generator/[engine]/page.tsx'))
    const competitorRoute = pathname === '/alternatives/invideo'
      && fs.readFileSync(path.join(root, 'app/alternatives/[competitor]/page.tsx'), 'utf8').includes('invideo')
    if (!fs.existsSync(file) && !engineRoute && !competitorRoute) throw new Error('Missing internal page ' + pathname)
  }
  return {
    name: answer.label, path: answer.path,
    before: document('<main style="padding:36px;color:#c0cede"><p>ANTES · base 0f2c05a7</p><h1 style="font-size:24px">Esta página ainda não existia.</h1><p>' + answer.path + '</p><p>Ausência conferida na árvore Git. Este quadro é uma indicação de estado, não uma captura de uma página 404.</p></main>'),
    after: document(markup.replaceAll(sample.posterPath, poster)),
  }
})
const previousNavigation = '<nav style="margin-top:44px;text-align:center;font-size:14px;color:#86868b;line-height:2"><a style="color:inherit" href="/examples">Real examples</a> · <a style="color:inherit" href="/pricing">Pricing</a> · <a style="color:inherit" href="/alternatives">Tool alternatives</a> · <a style="color:inherit" href="/free-ai-shorts-generator">Free AI Shorts generator</a></nav>'
const hubShell = (body) => document('<main style="padding:28px;max-width:980px;margin:auto;color:#f5f5f7"><div style="border:1px dashed #40516a;padding:24px;color:#aabbd0">Contexto: grade de motores existente, não alterada nesta entrega.</div>' + body + '</main>')
previews.push({ name: 'Hub: bloco de descoberta', path: '/ai-video-generator', before: hubShell(previousNavigation), after: hubShell(renderToStaticMarkup(React.createElement(Links)) + previousNavigation) })
const payload = JSON.stringify(previews).replace(/</g, '\\u003c')
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações 01 · comparação visual</title><style>body{margin:0;background:#e9edf2;color:#132033;font:15px Arial,sans-serif}header{padding:24px;background:#fff;border-bottom:1px solid #b8c6d5;position:sticky;top:0;z-index:2}h1{font-size:23px;margin:0 0 10px}p{margin:8px 0;line-height:1.4}label{font-weight:bold}select,button{font:inherit;padding:9px;margin:8px 8px 0 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px}.frame{overflow:auto;background:#d4dce6;padding:14px}.frame h2{font-size:15px;margin:0 0 14px}iframe{background:#07090d;border:0;width:1100px;height:1700px;display:block}body.mobile iframe{width:390px;height:1900px}body.mobile .pair{grid-template-columns:repeat(2, minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:16px}}</style></head><body><header><h1>[Citações] Cinco páginas novas · antes/depois</h1><p>HTML autocontido, gerado dos componentes React reais. A amostra visual é um poster público existente, embutido no arquivo. Links e clique de aquisição não foram exercitados por este preview.</p><label for="page">Página </label><select id="page"></select><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button><p id="path"></p></header><main class="pair"><section class="frame"><h2>ANTES · base 0f2c05a7</h2><iframe title="Antes" id="before"></iframe></section><section class="frame"><h2>DEPOIS · implementação proposta</h2><iframe title="Depois" id="after"></iframe></section></main><script>const pages=${payload};const select=document.getElementById('page');pages.forEach((p,i)=>{let o=document.createElement('option');o.value=i;o.textContent=p.name;select.append(o)});function draw(){const p=pages[Number(select.value)];document.getElementById('before').srcdoc=p.before;document.getElementById('after').srcdoc=p.after;document.getElementById('path').textContent=p.path}select.onchange=draw;document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');draw();</script></body></html>`
const output = path.join(root, 'docs/citacoes-01-pages-2026-09-10/preview-citacoes-01.html')
fs.writeFileSync(output, html)
if (networkAttempts !== 0) throw new Error('Preview attempted network access')
console.log(JSON.stringify({ output, pages: previews.length - 1, hub: true, structuralChecks: 'pass', networkAttempts, generatedVideos: 0 }))
