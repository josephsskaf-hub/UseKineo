// Actual JSX rendered offline; stdout is saved with apply_patch. No browser/network.
import { renderPage } from './preview-ux-complete.mjs'
import { readFileSync } from 'node:fs'
const base='d11758cefcb2cf265fc6b29a38e9bc12b2b826ba'
const label=readFileSync(new URL('../lib/ui/interface/pt.ts',import.meta.url),'utf8').match(/'Videos for businesses': '([^']+)'/)[1]
const fixture={interfaceLanguage:'pt',interfaceDictionary:{'Videos for businesses':label}}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
function fragment(section,before,width){
 const file=section==='Menu'?'app/KineoLanding.tsx':'components/Footer.tsx'
 const html=renderPage(file,before,fixture,{showStats:false},base)
 if(section==='Rodapé')return html.replaceAll('<details class="footer-group">','<details open class="footer-group">')
 const styles=[...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')
 let nav=html.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)[0]
 if(width<=1200)nav=nav.replace('id="nav-toggle"','id="nav-toggle" checked')
 return '<div class="klp">'+styles+nav+'</div>'
}
const sections=['Menu','Rodapé'].map(section=>`<section><h2>${section}</h2>${[1440,1024,390].map(width=>`<h3>${width}px · ${width===390?'Celular':width===1024?'Tablet':'Computador'}</h3><div class="pair">${[true,false].map(before=>{const doc='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>body{margin:0;background:#05070b;color:#eee;font-family:Arial,sans-serif}a{color:inherit}</style><body>'+fragment(section,before,width)+'</body></html>';return `<article><h4>${before?'ANTES · já publicado':'DEPOIS · candidato local'}</h4><iframe title="${section} ${before?'antes':'depois'} ${width}" width="${width}" height="${section==='Menu'?(width<=1200?810:330):1100}" sandbox srcdoc="${escape(doc)}"></iframe></article>`}).join('')}</div>`).join('')}</section>`).join('')
console.log('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · link Empresas · antes/depois</title><style>body{margin:24px;background:#0b1018;color:#eef3ff;font:16px Arial}.pair{display:flex;gap:20px;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #40506a;border-radius:12px}section{margin-bottom:40px}</style><h1>Vídeos para empresas — acesso pela navegação</h1><p>JSX real, sem build, banco ou envio. Menu compacto aberto e grupos do rodapé expandidos para comparação. Só a nova tradução em português é carregada nesta prévia; demais textos usam o fallback inglês. Links inativos por segurança. A página Empresas já está publicada; os novos atalhos ainda são locais.</p>'+sections+'</html>')
