import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'
const root=path.resolve(process.argv[2])
process.chdir(root)
const here=path.dirname(fileURLToPath(import.meta.url))
const base=await mundo(root,'c4fd957e65c2c9ec309d3acb562e35febb218c36')
const next=await mundo(root,process.argv[3])
const bo=frontieres(base), no=frontieres(next)
const f=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8')).find(x=>x.id==='cooper')
const filler='Interior view with straight rows of seats and soft overhead lighting. The aisle runs toward the far end of the cabin. Oblique camera angle catches the light across the backs of the seats. The overhead lamps reflect in the windows and across the armrests. Muted shadows separate the foreground and the middle distance. The shot holds steady while the shapes of the doors and seats remain clear. '
const findings=[]
for(const limit of [230,270,300,320,335,345,360,375,390]) {
   let prefix=''
   for(const sentence of [...filler.trim().split(/(?<=\.)\s+/u),'The camera is still.','Soft light falls across the aisle.','The foreground is quiet.','A fixed lens frames the aisle.']) {
     if((prefix+sentence+' ').length<=limit) prefix+=sentence+' '
   }
   const film={...f,leading:['',prefix,'','']}
   const a=await capture(base,bo,film,s=>s,'off',false)
   const b=await capture(next,no,film,aplicar,'internal',true)
   for(let m=0;m<a.sends.length;m++) {
     const old=JSON.parse(a.sends[m].body).multi_prompt[1].prompt
     const fresh=JSON.parse(b.sends[m].body).multi_prompt[1].prompt
     if(/briefcase/i.test(old)&&!/briefcase/i.test(fresh)) findings.push({prefixLength:prefix.length,model:a.sends[m].model,old,new:fresh})
   }
}
const r={base:base.sha,candidate:next.sha,meaning:'Synthetic boundary probes of Cooper scene 2. Only reports when the base retains briefcase and the candidate loses it.',fixtures:9,simulatedPosts:54,findings}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-pressao.json'),JSON.stringify(r,null,2)+'\n')
console.log(JSON.stringify({count:r.findings.length,first:r.findings[0]??null}))
assert.equal(r.findings.length,0,'A candidata perdeu a ação que cabia no despacho da base')
