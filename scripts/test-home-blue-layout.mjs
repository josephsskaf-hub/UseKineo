// Actual JSX + synthetic session/source; never calls network, DB or generation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs' // KINEO-HOME-MOSAICO-2910
import {renderPage} from './preview-ux-complete.mjs'
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
for(const signedIn of [false,true])for(const source of [null,'chatgpt','taaft'])for(const language of ['en','es','hi']){
 const html=renderPage('app/KineoLanding.tsx',false,{interfaceLanguage:language,previewCredits:10},{initialUser:signedIn?{id:'fixture'}:null,initialAcquisitionSource:source})
 const hero=html.match(/<header class="hero">([\s\S]*?)<\/header>/)?.[1]??''
 // REANCORADO 30/09 — fundador: "já quero tirar make room for your next big idea, create video… aproximar os dois vídeos".
 // O bloco do título + botão saiu do hero; a ação principal mora no menu ("Start free"/Studio) com a MESMA regra de sessão/origem,
 // e o h1 continua existindo (só para leitor de tela e busca), com o mesmo texto traduzido.
 const nav=html.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0]??''
 const target=signedIn?'/studio':source?'#try-kineo':'/signup?utm_source=nav'
 check(nav.includes(`href="${target}"`),`${language}/${signedIn}/${source}: primary action (menu) preserves session/source routing`)
 check((hero.match(/<h1 /g)||[]).length===1,'one semantic heading')
 check(!hero.includes('class="home-intro"'),'title block removed (founder 30/09)')
 check(!hero.includes('sora-alternative')&&!hero.includes('paying subscriber'),'promotions and proof do not interrupt hero')
 // reancorado KINEO-HOME-LIMPA-1410 — o fundador tirou "Start with the full toolkit" + os 3 cards (14/10): AUSENTES no render.
 // As portas reais seguem: o menu (acima) e a galeria de More tools, que leva a /images.
 check(!html.includes('class="home-start"')&&!html.includes('class="home-create')&&!html.includes('Start with the full toolkit'),'full toolkit block removed (KINEO-HOME-LIMPA-1410)')
 // KINEO-HOME-REMODELA-2010 — reancorado 20/10 (fundador: "more tools a gente vai cancelar"): o menu não leva mais a /images; a porta real é a galeria "Images made by Kineo" (cada foto → /images, provado em scripts/test-home-limpa-1410.mjs e scripts/test-home-remodela-2010.mjs) e o rodapé.
 check(html.includes('<section class="home-more-tools" aria-label="Images made by Kineo">')||(html.includes('<div id="samples">')&&readFileSync(new URL('../components/home/HomeMosaic.tsx', import.meta.url),'utf8').includes('href="/images"')),'home keeps real destination /images (gallery section)') // reancorado KINEO-HOME-MOSAICO-2910 — fundador 29/10 "sem separações": as imagens (cada uma → /images) vivem na vitrine contínua // KINEO-HOME-REMODELA-2010
const moreAt = html.indexOf('class="home-more-tools"') > 0 ? html.indexOf('class="home-more-tools"') : html.indexOf('<div id="samples">') // reancorado KINEO-HOME-MOSAICO-2910 — a vitrine contínua ocupa o lugar da galeria
check(moreAt>0&&moreAt<html.indexOf('class="home-proof"'),'More tools precedes grouped proof')
 check(html.includes('class="kineo-bolt mk"') && html.includes('>ϟ</span>'),'brand mark uses the approved shared lightning')
}
console.log(`Home blue: ${checks} rendered session, referral and language checks passed; offline.`)
