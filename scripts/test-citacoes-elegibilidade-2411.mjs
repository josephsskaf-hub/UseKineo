// Regression of existing eligibility; protected identities stay in memory and are never logged.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {offlineModules,source} from './gpt24h-offline-support.mjs'
const req=createRequire(process.cwd()+'/package.json'),ts=req('typescript'),BASE='58fa447d2'
const oldSource=f=>execFileSync('git',['show',BASE+':'+f],{encoding:'utf8'})
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex')
const ast=(f,s)=>ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true)
const functions=(f,s)=>new Map(ast(f,s).statements.filter(ts.isFunctionDeclaration).map(n=>[n.name?.text,n.getText()]))
const variables=(f,s)=>{const tree=ast(f,s),out=new Map();for(const n of tree.statements)if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(d.initializer)out.set(d.name.getText(tree),d.initializer.getText(tree));return out}
const moved=[
 ['lib/engineLaunch.ts','lib/engineLaunchAccess.ts'],
 ['lib/clips/clipLaunch.ts','lib/clips/clipLaunchAccess.ts'],
 ['lib/create/entry.ts','lib/create/clipEntryServer.ts'],
]
const bodyProof=[]
for(const[from,to]of moved){
 const old=functions(from,oldSource(from)),current=functions(to,source(to))
 for(const[name,code]of current){assert.ok(old.has(name),'moved function existed: '+name);assert.equal(hash(code),hash(old.get(name)),'moved function body unchanged: '+name);bodyProof.push({name,from,to,sha256:hash(code)})}
}
for(const file of ['lib/engineLaunch.ts','lib/clips/clipLaunch.ts','lib/ads/access.ts','lib/growth/mrrReactivation.ts','lib/create/clipNaMoldura.ts','lib/create/clipRecreateJuntos.ts']){
 const before=functions(file,oldSource(file)),after=functions(file,source(file))
 for(const[name,code]of after){assert.ok(before.has(name),'existing function remains: '+name);assert.equal(hash(code),hash(before.get(name)),'remaining function body unchanged: '+name);bodyProof.push({name,from:file,to:file,sha256:hash(code)})}
}
const constantMoves=[
 ['lib/ads/access.ts','lib/ads/accessPublic.ts'],
 ['lib/growth/mrrReactivation.ts','lib/growth/mrrReactivationRelease.ts'],
 ['lib/create/clipNaMoldura.ts','lib/create/clipNaMolduraRelease.ts'],
]
const constantProof=[]
for(const[from,to]of constantMoves){
 const before=variables(from,oldSource(from)),after=variables(to,source(to))
 for(const[name,value]of after){assert.ok(before.has(name),'constant existed: '+name);assert.equal(hash(value),hash(before.get(name)),'public constant value unchanged: '+name);constantProof.push({name,from,to,sha256:hash(value)})}
}
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed})
const withoutImports=(f,s)=>{const tree=ast(f,s);return printer.printFile(ts.factory.updateSourceFile(tree,tree.statements.filter(n=>!ts.isImportDeclaration(n))))}
const consumers=JSON.parse(source('docs/citacoes-caixa-servidor-2411/SEPARACAO-LEGADO.json')).touchedImports
for(const file of consumers)assert.equal(hash(withoutImports(file,source(file))),hash(withoutImports(file,oldSource(file))),'consumer differs only in imports: '+file)
const flags=['H3_TURBO_PUBLIC','H3MAX_PUBLIC','S25_PUBLIC','AVATAR_PUBLIC','KINEO1_PUBLIC','SEEDANCE_15S_PUBLIC','DURACOES_CURTAS_PUBLIC','ESTRELA_PUBLIC']
const engineFile='lib/engineLaunch.ts',oldEngine=oldSource(engineFile),currentEngine=source(engineFile)
function bool(source,name,value){
 const re=new RegExp('(export const '+name+'(?:\\s*:\\s*[^=\\n]+)?\\s*=\\s*)(true|false)');assert.ok(re.test(source),'flag declaration exists: '+name);return source.replace(re,(_,a)=>a+String(value))
}
const scenarios=[{},Object.fromEntries(flags.map(f=>[f,true])),Object.fromEntries(flags.map(f=>[f,false])),...flags.map(f=>({[f]:!/=\s*true/.test(oldEngine.match(new RegExp('export const '+f+'[^\\n]+'))[0])}))]
const house=offlineModules()('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
const actors=[null,undefined,'',...house,' '+house[0].toUpperCase()+' ','external'+'@'+'buyer.invalid','test-private-boundary'+'@'+'buyer.invalid']
const legacy=[null,{},...Array.from({length:8},(_,i)=>({hasPaid:!!(i&1),usedFast:!!(i&2),boughtPack:!!(i&4)}))]
let calls=0,resolutions=0
for(const config of scenarios){
 let before=oldEngine,after=currentEngine;for(const[name,value]of Object.entries(config)){before=bool(before,name,value);after=bool(after,name,value)}
 const old=offlineModules({replacements:{[engineFile]:before}})(engineFile),now=offlineModules({replacements:{[engineFile]:after}})('lib/engineLaunchAccess.ts')
 for(const actor of actors){
  for(const name of ['h3TurboNoFilmePadrao','h3maxVisible','s25Visible','avatarVisible','seedance15sVisible','duracoesCurtasVisible','estrelaVisible']){assert.equal(now[name](actor),old[name](actor),'same engine eligibility: '+name);calls++}
  for(const row of legacy){assert.equal(now.kineo1Visible(actor,row),old.kineo1Visible(actor,row),'same legacy Kineo1 eligibility');calls++}
  for(const paid of [true,false,null])for(const row of [null,{usedFast:true,boughtPack:false},{usedFast:false,boughtPack:true},'throws']){
   const run=async mod=>{let paidReads=0,legacyReads=0;let value;try{value=await mod.resolveKineo1Flag(actor,()=>{paidReads++;return paid},async()=>{legacyReads++;if(row==='throws')throw Error('fixture unreadable');return row??{}})}catch{value='error'}return{value,paidReads,legacyReads}}
   assert.deepEqual(await run(now),await run(old),'same legacy result and read counts');resolutions++
  }
 }
}
const clip='lib/clips/clipLaunch.ts',originalClip=oldSource(clip)
for(const open of [true,false])for(const s25 of [true,false]){
 const before=bool(bool(originalClip,'CLIPS_PUBLIC',open),'CLIP_S25_PUBLIC',s25),after=bool(bool(source(clip),'CLIPS_PUBLIC',open),'CLIP_S25_PUBLIC',s25)
 const old=offlineModules({replacements:{[clip]:before}})(clip),now=offlineModules({replacements:{[clip]:after}})('lib/clips/clipLaunchAccess.ts')
 for(const actor of actors)for(const name of ['clipsVisible','clipS25Visible']){assert.equal(now[name](actor),old[name](actor),'same clip eligibility: '+name);calls++}
 assert.equal(old.clipS25Visible(null),s25,'public catalog null check equals same flag')
}
const current=offlineModules(),navigation=current('lib/create/useCreateNavigationVisibility.ts'),clipPolicy=current('lib/create/clipNaMoldura.ts'),recreatePolicy=current('lib/create/clipRecreateJuntos.ts')
for(const actor of actors)assert.deepEqual(JSON.parse(JSON.stringify(navigation.publicCreateNavigation(actor))),{showClip:clipPolicy.clipNaMolduraVisivel(actor),showRecreate:recreatePolicy.abaRecreateVisivel(actor)},'current public navigation unchanged')
const proof={base:BASE,scope:'Pure modules and synthetic states; canonical identities loaded privately, never logged; no network/account/render/payment',functionBodies:bodyProof,publicConstants:constantProof,consumerImportsOnly:consumers,engineFlagScenarios:scenarios.length,eligibilityCalls:calls,resolutionCases:resolutions}
if(process.env.KINEO_CITATION_ELIGIBILITY_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_ELIGIBILITY_PROOF,JSON.stringify(proof,null,2))
console.log('PASS '+bodyProof.length+' unchanged function bodies, '+constantProof.length+' unchanged constant values, '+consumers.length+' import-only consumers; '+calls+' eligibility calls and '+resolutions+' result/read-count cases; current public navigation unchanged. No addresses logged.')
