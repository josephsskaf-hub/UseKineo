// Actual JSX + synthetic session/source; never calls network, DB or generation.
import assert from 'node:assert/strict'
import {renderPage} from './preview-ux-complete.mjs'
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
for(const signedIn of [false,true])for(const source of [null,'chatgpt','taaft'])for(const language of ['en','es','hi']){
 const html=renderPage('app/KineoLanding.tsx',false,{interfaceLanguage:language,previewCredits:10},{initialUser:signedIn?{id:'fixture'}:null,initialAcquisitionSource:source})
 const hero=html.match(/<header class="hero">([\s\S]*?)<\/header>/)?.[1]??''
 const target=signedIn?'/studio':source?'#try-kineo':'/signup?utm_source=hero'
 check(hero.includes(`href="${target}"`),`${language}/${signedIn}/${source}: primary action preserves session/source routing`)
 check((hero.match(/<h1 /g)||[]).length===1,'one visible semantic heading')
 check(!hero.includes('hero-title-a11y'),'heading is no longer visually hidden')
 check(!hero.includes('sora-alternative')&&!hero.includes('paying subscriber'),'promotions and proof do not interrupt hero')
 check(html.includes('class="home-start"'),'creation available even when media list is empty')
 const creation=html.match(/<div class="home-create-grid">([\s\S]*?)<\/section>/)?.[1]??''
 for(const href of ['/studio','/images','/audio'])check(creation.includes(`href="${href}"`),'creation tool keeps real destination '+href)
 check(html.indexOf('class="home-create"')<html.indexOf('class="home-proof"'),'creation precedes grouped proof')
 check(html.includes('class="mk" aria-hidden="true">ϟ</span>'),'brand mark uses the approved Explore lightning')
}
console.log(`Home blue: ${checks} rendered session, referral and language checks passed; offline.`)
