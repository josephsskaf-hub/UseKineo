// Actual JSX + synthetic session/source; never calls network, DB or generation.
import assert from 'node:assert/strict'
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
 check(html.includes('class="home-start"'),'creation available even when media list is empty')
 const creation=html.match(/<div class="home-create-grid">([\s\S]*?)<\/section>/)?.[1]??''
 // 27/09 (sprint MRR): a porta de Empresas é /ads — pública, 200 para todos; /ads/new mandava o visitante ao /login.
 for(const href of ['/studio','/images','/ads'])check(creation.includes(`href="${href}"`),'creation tool keeps real destination '+href)
 check(html.indexOf('class="home-create"')<html.indexOf('class="home-proof"'),'creation precedes grouped proof')
 check(html.includes('class="kineo-bolt mk"') && html.includes('>ϟ</span>'),'brand mark uses the approved shared lightning')
}
console.log(`Home blue: ${checks} rendered session, referral and language checks passed; offline.`)
