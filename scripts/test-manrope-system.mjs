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
check(layout.includes("import './manrope.css'") && !layout.includes('manrope.variable'),'root serves one stable Manrope family without a generated HTML class')
const faces = postcss.parse(read('app/manrope.css'))
const subsets = new Set()
faces.walkAtRules('font-face', face => {
 const properties = Object.fromEntries(face.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))
 check(properties['font-family'] === "'Manrope'" && properties['font-weight'] === '200 800' && properties['font-display'] === 'swap','font face is the approved variable family with swap')
 const source = properties.src.match(/^url\(\/fonts\/manrope-v23\/([a-z-]+)\.woff2\) format\('woff2'\)$/)
 check(source && properties['unicode-range']?.startsWith('U+'),'font subset comes from an explicit local script range')
 const bytes = fs.readFileSync('public/fonts/manrope-v23/' + source[1] + '.woff2')
 check(bytes.toString('ascii',0,4) === 'wOF2' && bytes.readUInt32BE(8) === bytes.length,'local WOFF2 is present and complete')
 subsets.add(source[1])
})
assert.deepEqual([...subsets].sort(),['cyrillic','cyrillic-ext','greek','latin','latin-ext','vietnamese'])
check(layout.includes('href="/fonts/manrope-v23/latin.woff2" crossOrigin="anonymous"'),'Latin preload matches the actual face')
check(layout.includes("subsets: ['devanagari']") && layout.includes('preload: false') && layout.includes('devanagari.variable'), 'Hindi glyph fallback is self-hosted and does not preload for Latin-only visits')
check(!layout.includes('Space_Grotesk')&&!layout.includes('Inter('),'no redundant family downloads')
check(layout.includes("display: 'swap'"),'text remains readable while loading')
check(!layout.includes("weight: ["),'variable weights rather than several static downloads')
const css=postcss.parse(read('app/globals.css')), tokens={}
css.walkDecls(d=>{if(d.prop.startsWith('--font-'))tokens[d.prop]=d.value})
check(tokens['--font-inter']==='var(--font-manrope)','legacy body consumers resolve to approved family')
check(tokens['--font-space-grotesk']==='var(--font-manrope)','legacy heading consumers resolve to approved family')
check(tokens['--font-display']==='var(--font-sans)','titles and body share family')
check(tokens['--font-manrope'] === "'Manrope'" && tokens['--font-sans'] === "var(--font-manrope, 'Manrope'), Arial, sans-serif",'canonical token works even on HTML with no font class')
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
