// Offline only: no env, network, database, render or payment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url), postcss=require('postcss')
// Integration base includes Claude's concurrent GPT handoff, preserved verbatim.
const base='482dd0a7'
// Historical ownership is measured at the actual delivery, rather than treating every later product change as typography.
const fontDelivery='82e4c4c8'
const read=f=>fs.readFileSync(f,'utf8')
const before=f=>execFileSync('git',['show',`${base}:${f}`],{encoding:'utf8'})
const delivered=f=>execFileSync('git',['show',`${fontDelivery}:${f}`],{encoding:'utf8'})
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
const clean=s=>s.replace(/\r\n/g,'\n')
const eraseFamilies=s=>clean(s).replace(/fontFamily:\s*(['"])[^\r\n]*?\1/g,'fontFamily: FONT').replace(/font-family:[^;}\r\n]+/g,'font-family:FONT')
const changed=execFileSync('git',['-c','core.safecrlf=false','diff',base,fontDelivery,'--name-only'],{encoding:'utf8'}).trim().split('\n')
for(const f of changed.filter(f=>f.endsWith('.tsx')&&f!=='app/layout.tsx')){
 check(eraseFamilies(delivered(f))===eraseFamilies(before(f)),f+': original delivery changed only font-family; all behavior/copy unchanged')
}
check(eraseFamilies(delivered('app/tools/editor/editor.css'))===eraseFamilies(before('app/tools/editor/editor.css')),'original editor delivery changed styling only; no export changes')
const layout=read('app/layout.tsx')
check(/import \{[^}]*\bManrope\b[^}]*\} from 'next\/font\/google'/.test(layout),'actual root layout imports Manrope')
check(/className=\{[^\n]*manrope\.variable/.test(layout),'actual root HTML mounts the Manrope variable alongside any approved glyph fallback')
check(layout.includes("subsets: ['devanagari']") && layout.includes('preload: false') && layout.includes('devanagari.variable'), 'Hindi glyph fallback is self-hosted and does not preload for Latin-only visits')
check(!layout.includes('Space_Grotesk')&&!layout.includes('Inter('),'no redundant family downloads')
check(layout.includes("display: 'swap'"),'text remains readable while loading')
check(!layout.includes("weight: ["),'variable weights rather than several static downloads')
const css=postcss.parse(read('app/globals.css')), tokens={}
css.walkDecls(d=>{if(d.prop.startsWith('--font-'))tokens[d.prop]=d.value})
check(tokens['--font-inter']==='var(--font-manrope)','legacy body consumers resolve to approved family')
check(tokens['--font-space-grotesk']==='var(--font-manrope)','legacy heading consumers resolve to approved family')
check(tokens['--font-display']==='var(--font-sans)','titles and body share family')
check(tokens['--font-sans'].includes('var(--font-manrope)'),'canonical body token')
const config=require('../tailwind.config.js')
check(config.theme.extend.fontFamily.sans[0]==='var(--font-sans)','Tailwind sans does not bypass system')
check(config.theme.extend.fontFamily.display[0]==='var(--font-display)','Tailwind heading class configured')
for(const f of ['lib/ui/homePresentation.ts','lib/ui/workspacePresentation.ts']){
 const rules=read(f).match(/`([\s\S]*)`/)[1]
 check(!!postcss.parse(rules),f+': valid CSS')
 check(rules.includes('font-weight:var(--type-title-weight)'),f+': approved lighter title rhythm')
 check(rules.includes('text-transform:none'),f+': labels are not forced uppercase')
}
// Baseline-sensitive ownership safety: do not alter media, money, routes or
// the shared generator just to change typography. Alias propagation suffices.
for(const f of ['app/KineoLanding.tsx','components/studioKit.tsx','components/Sidebar.tsx','components/MobileNav.tsx','app/(dashboard)/generate/GenerateClient.tsx','lib/videoEditor.ts','lib/checkoutPricing.ts']){
 if(fs.existsSync(f))check(clean(delivered(f))===clean(before(f)),f+': unchanged by the original font delivery')
}
console.log(`PASS ${checks} typography/scope contracts; no external access`)
