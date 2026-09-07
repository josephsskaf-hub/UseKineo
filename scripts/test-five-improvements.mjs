// Offline behavior and integration checks for the five approved improvements.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {execFileSync} from 'node:child_process'
import {renderPage} from './preview-ux-complete.mjs'
let checks=0
const ok=(v,m)=>{assert.ok(v,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++}
function pure(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports,URLSearchParams,Date});return exports}
const focus=pure('lib/ui/workspaceFocus.ts')
for(const path of ['/studio','/studio/create','/library','/images','/audio','/avatar'])eq(focus.isFocusedWorkspace(path),true,'creation is focused')
for(const path of ['/pricing','/affiliate','/referral','/studio-not-real','/'])eq(focus.isFocusedWorkspace(path),false,'other paths keep contextual notices')
const retry=pure('lib/navigation/reviewVideoRetry.ts')
for(const text of [null,'','   '])eq(retry.reviewVideoRetryHref(text),'/studio','empty topic opens Studio')
const prompt='My story & <not code> ñ ?'
const href=retry.reviewVideoRetryHref(prompt),query=new URL('https://example.invalid'+href).searchParams
eq(query.get('prompt'),prompt,'input survives encoding');eq(query.get('duration'),'35','old duration preserved');eq(query.get('engine'),'fast','old engine preserved');eq(query.get('script_mode'),'ai','review mode preserved')
ok(href.startsWith('/studio?'),'retry opens Studio review, not old composer')
ok(!query.has('autostart'),'retry never submits automatically')
eq(new URL('https://example.invalid'+retry.reviewVideoRetryHref('a'.repeat(1500))).searchParams.get('prompt').length,1000,'old text bound preserved')
const recent=pure('lib/ui/recentLibraryProject.ts')
const one={id:'one',title:'Old project',created_at:'2026-09-01',status:'completed',video_url:'/fixture.mp4'}
const two={id:'two',title:'Newest project',created_at:'2026-09-07',status:'processing',video_url:null}
eq(recent.selectRecentLibraryProject([one,two]).id,'two','latest includes processing, not just playable')
eq(recent.selectRecentLibraryProject([]),null,'empty list is empty')
eq(recent.selectRecentLibraryProject([{...one,id:'../unsafe'}]),null,'unsafe id not a destination')
eq(recent.recentProjectState(one),'ready','playable completed ready')
eq(recent.recentProjectState(two),'processing','processing is not success')
eq(recent.recentProjectState({...one,status:'failed'}),'failed','failed project needs review')
eq(recent.recentProjectState({...one,video_url:null}),'processing','missing file not a playable success')
for(const language of ['en','es'])for(const video of [one,two,{...one,status:'failed'}]){
 const html=renderPage('components/LibraryRecentProject.tsx',false,{interfaceLanguage:language},{video})
 ok(html.includes(`/history#v-${video.id}`),'status links existing authoritative history')
 ok(html.includes(video.title),'user title untouched')
 eq(html.includes('studio_continuation=topic-v1'),recent.recentProjectState(video)==='ready','only ready video offers next episode')
 ok(!html.includes('/api/'),'no mutate link in recent card')
}
const provider=fs.readFileSync('components/InterfaceLanguage.tsx','utf8')
ok(provider.includes('document.documentElement.lang = language'),'HTML language follows preference')
ok(!provider.includes('MutationObserver'),'never auto-translates user DOM')
const ui=renderPage('app/(dashboard)/studio/StudioClient.tsx',false,{interfaceLanguage:'es',prompt:'Texto privado del autor',balance:25})
ok(ui.includes('Texto privado del autor'),'author script untouched')
ok(ui.includes('palabras'),'Spanish count');ok(!ui.includes('Every film is delivered'),'HD explanation localized')
ok(ui.includes('vídeos'),'Spanish film unit')
const empty=renderPage('app/(dashboard)/studio/StudioClient.tsx',false,{interfaceLanguage:'es'})
ok(empty.includes('Basta con una frase'),'empty hint translated');ok(empty.includes('¿De qué trata tu vídeo?'),'placeholder translated')
for(const tab of ['videos','images','audio']) {
 const failed=renderPage('app/(dashboard)/library/LibraryClient.tsx',false,{loaded:true,loadFailed:true,tab})
 ok(failed.includes('role="alert"'),'failed library read has an error')
 ok(!failed.includes('No '+tab+' yet'),'failed read is never empty collection')
}
const labels=pure('lib/ui/interfaceLabels.ts').INTERFACE_ES
for(const language of ['en','es']) {
 const waiting=renderPage('app/(dashboard)/library/LibraryClient.tsx',false,{loaded:true,loadFailed:false,tab:'videos',vids:[],recentVideo:two,interfaceLanguage:language})
 ok(waiting.includes(two.title),'processing project remains visible in the real library')
 ok(waiting.includes(language==='es'?'Todavía no hay vídeos reproducibles':'No playable videos'),'empty playable list describes availability, not absence of projects')
 ok(!waiting.includes('make your first film')&&!waiting.includes('haz tu primer'),'existing project never gets first-film empty state')
}
for(const [en,es] of Object.entries(labels))eq(es.match(/\d+/g),en.match(/\d+/g),'translation preserves every numeric claim')
const history=fs.readFileSync('app/(dashboard)/history/HistoryClient.tsx','utf8')
ok(history.includes('return reviewVideoRetryHref(video.topic)'),'real retry caller connected')
ok(fs.readFileSync('components/AvatarLaunchBanner.tsx','utf8').includes('href="/avatar"'),'avatar CTA goes to avatar workspace')
const shell=fs.readFileSync('app/(dashboard)/DashboardShell.tsx','utf8'),layout=fs.readFileSync('app/(dashboard)/layout.tsx','utf8')
ok(shell.includes('<WorkspaceSecondaryNotice><AffiliateFirstClickNudge'),'actual promotional caller uses policy')
for(const component of ['PaymentConfirmedToast','ActiveRenderPill','TrialActiveBanner'])ok(layout.includes('<'+component),'critical notices preserved')
ok(shell.includes('<WelcomeOfferModal'),'explicit upgrade offer preserved')
ok(layout.indexOf('<EnablePushBanner />')>layout.indexOf('</WorkspaceSecondaryNotice>'),'push subscription maintenance stays mounted')
const pushSource=fs.readFileSync('components/EnablePushBanner.tsx','utf8')
ok(pushSource.indexOf('isFocusedWorkspace(pathname)')>pushSource.indexOf('useEffect(() =>'),'only UI is suppressed, not subscription effect')
ok(!renderPage('components/EnablePushBanner.tsx',false,{show:true,pathname:'/studio'}),'push prompt absent in Studio')
// Actual existing CTA is Notify me, not an invented Enable label.
ok(renderPage('components/EnablePushBanner.tsx',false,{show:true,pathname:'/account'}).includes('Notify me'),'push prompt still available elsewhere')
const affiliate=fs.readFileSync('lib/affiliateFirstClick.ts','utf8')
ok(affiliate.includes("'/affiliate'")&&affiliate.includes("'/referral'"),'affiliate nudge remains reachable in its own area')
const wf=fs.readFileSync('.github/workflows/guardiao.yml','utf8').split('  legacy:')[0]
ok(!wf.includes('continue-on-error'),'critical CI cannot ignore failure')
ok(wf.includes('npm ci')&&wf.includes('node scripts/test-sharing-safety.mjs')&&wf.includes('node scripts/test-five-improvements.mjs'),'critical tests actually called with dependencies')
ok(fs.readFileSync('next.config.js','utf8').includes('ignoreBuildErrors: false'),'Vercel build fails on types too')
// AST compare all functional Studio handlers to the approved base, not regex names.
const file='app/(dashboard)/studio/StudioClient.tsx'
const old=execFileSync('git',['show','5b155dc5:'+file],{encoding:'utf8'})
function behavior(code){const sf=ts.createSourceFile(file,code,99,true,4),out=[];function visit(n){if(ts.isJsxAttribute(n)&&['onClick','onChange','disabled','value','checked','src'].includes(n.name.getText(sf)))out.push(n.getText(sf).replace(/\r\n/g,'\n'));ts.forEachChild(n,visit)}visit(sf);return out}
eq(behavior(fs.readFileSync(file,'utf8')),behavior(old),'Studio handlers and request-bound fields unchanged')
console.log(`Five improvements: ${checks} checks passed; offline only.`)
