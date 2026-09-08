// Executes the actual home selectors offline. Any database access fails.
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {execFileSync} from 'node:child_process'
let checks=0
const ok=(value,label)=>{assert.ok(value,label);checks++}
const cache=new Map()
function load(file){
 if(cache.has(file))return cache.get(file)
 const exports={};cache.set(file,exports)
 const require=id=>{
  if(id==='@supabase/supabase-js')return {createClient:()=>{throw Error('Database access forbidden')}}
  if(id==='@/lib/publicVideos')return {cleanTitleLine:s=>s}
  if(id.startsWith('@/lib/'))return load(id.slice(2)+'.ts')
  throw Error('Unexpected dependency '+id)
 }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports,require,process:{env:{}},console,URL},{filename:file})
 return exports
}
const home=load('lib/homeVideoCuration.ts'), wall=load('lib/engineWall.ts'), old=load('lib/publicExamples.ts')
const approved=JSON.parse(fs.readFileSync('docs/curation-approved-2026-09-07.json','utf8'))
const hero=await wall.getEngineHero(), trending=await wall.getTrending()
ok(approved.length===12,'twelve founder-approved originals')
for(const e of approved){
 const v=hero.find(v=>v.id===e.id)
 ok(v,'approved video present in real hero data '+e.id)
 ok(v.engine===e.engine,'real engine retained')
 ok(trending.some(v=>v.id===e.id),'reachable in third row, not silently truncated')
 ok(v.href.startsWith('/studio?engine='),'safe explicit Studio destination')
 ok(v.previewUrl!==v.videoUrl,'independent wide and portrait assets')
 for(const asset of [v.videoUrl,v.previewUrl,v.posterUrl]){
  ok(asset.startsWith('/previews/curation-sep07/'),'local versioned asset')
  const f=path.join('public',asset)
  ok(fs.existsSync(f),'asset exists '+asset)
  ok(fs.statSync(f).size>1000 && fs.statSync(f).size<1500000,'bounded asset size')
 }
 if(process.argv.includes('--media'))for(const [asset,w,h] of [[v.videoUrl,540,960],[v.previewUrl,1400,782]]){
  const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join('public',asset)],{encoding:'utf8'}))
  ok(data.streams.length===1 && data.streams[0].codec_type==='video','no audio')
  ok(data.streams[0].width===w && data.streams[0].height===h,'dimensions')
  ok(Math.abs(Number(data.format.duration)-6)<0.1,'six-second preview')
 }
}
ok(hero.filter(v=>v.engine==='cinematic_omni')[0].id===home.ROBOT_VIDEO_ID,'robot opens Omni')
ok(hero.filter(v=>v.engine==='cinematic_omni').length===5,'robot and four approved presenters reach the wall (card shows four)')
for(const engine of ['cinematic_veo','cinematic_hollywood','cinematic_h3']){
 const expected=old.PUBLIC_ENGINE_EXAMPLES.filter(v=>v.engine===engine)
 const actual=home.HOME_ENGINE_EXAMPLES.filter(v=>v.engine===engine)
 ok(JSON.stringify(expected)===JSON.stringify(actual),'unreplaced engine preserved verbatim '+engine)
}
for(const list of [hero,trending])ok(new Set(list.map(v=>v.id)).size===list.length,'no duplicates')
ok(load('lib/publicSurfacePolicy.ts').CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED===false,'customer gallery remains closed')
const jsx=fs.readFileSync('app/KineoLanding.tsx','utf8')
ok(jsx.includes(".slice(0, 4)") && !jsx.includes("cinematic_omni' ? 5"),'caller shows four per card, Omni included (founder 08/09)')
if(process.argv.includes('--data'))console.log(JSON.stringify({hero,trending,old:old.PUBLIC_ENGINE_EXAMPLES}))
else console.log('Home curation: '+checks+' checks passed; no database or provider calls.')
