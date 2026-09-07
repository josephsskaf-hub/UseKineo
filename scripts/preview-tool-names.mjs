// Offline, self-contained before/after from the actual JSX. No network.
import fs from 'node:fs'
import { renderPage } from './preview-ux-complete.mjs'
const base = '684d1614'
const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')
let panels = ''
for (const width of [1280,390]) for (const language of ['en','es']) {
  for (const [label,file,height] of [['Central','app/tools/page.tsx',width===390?10500:3400],['Editor','app/tools/editor/VideoEditor.tsx',width===390?1900:1300]]) {
    panels += '<h2>'+label+' · '+width+' px · '+language+'</h2><div class="pair">'
    for (const before of [true,false]) {
      const html = renderPage(file,before,{interfaceLanguage:language,supported:true,mime:'video/mp4',error:'invalid_settings'},{initialTool:'trim'},base)
      const style = label==='Editor' ? '<style>'+fs.readFileSync('app/tools/editor/editor.css','utf8')+'</style>' : ''
      panels += '<section><h3>'+(before?'Antes':'Depois')+'</h3><iframe title="'+label+' '+language+' '+(before?'antes':'depois')+'" width="'+width+'" height="'+height+'" sandbox="allow-same-origin" srcdoc="'+esc('<!doctype html><html lang="'+language+'"><meta charset="utf-8"><style>body{margin:0;background:#0b1018;color:white;font-family:Arial}a{color:inherit}</style>'+style+html+'</html>')+'"></iframe></section>'
    }
    panels += '</div>'
  }
}
console.log('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kineo · nomes e controles</title><style>body{background:#0b1018;color:#eef5ff;font:16px Arial;margin:24px}.pair{display:flex;gap:24px;overflow:auto}iframe{border:1px solid #456;border-radius:12px}section{flex-shrink:0}h2{margin-top:40px}</style><h1>Nomes e controles — antes/depois</h1><p>Base '+base+'. JSX real em inglês e espanhol, desktop e mobile. Comparação estática; controles e exportação são testados separadamente no navegador.</p>'+panels+'</html>')
