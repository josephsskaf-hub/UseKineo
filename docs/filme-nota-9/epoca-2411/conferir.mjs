import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'

const [rootArg,ref,adapterArg] = process.argv.slice(2)
if(!rootArg||!ref) throw Error('Uso: node conferir.mjs <repo com typescript> <SHA candidato> [adaptador.mjs]')
const root=path.resolve(rootArg), here=path.dirname(fileURLToPath(import.meta.url))
process.chdir(root)
const base=await mundo(root,'c4fd957e65c2c9ec309d3acb562e35febb218c36')
const next=await mundo(root,ref)
const unchanged=s=>s
const hook=adapterArg?(await import(pathToFileURL(path.resolve(adapterArg)).href)).aplicar:unchanged
const cases=JSON.parse(fs.readFileSync(path.join(here,'roteiros.json'),'utf8'))
const baseBorders=frontieres(base), nextBorders=frontieres(next)
const hash=str=>createHash('sha256').update(str).digest('hex')
const steps=[]
const visible={
  cooper:[/board(?:ing)?.{0,48}jet/i,/briefcase/i,/parachute.{0,60}(?:door|jet)/i,/bills.{0,45}sand/i],
  leprince:[/camera/i,/boarding a steam train/i,/empty.{0,35}compartment/i,/walking into steam/i],
  slocum:[/helm/i,/sailboat.{0,35}storm/i,/raising the sail/i,/empty.{0,35}horizon/i],
}
const someYear = (film,txt,n) => {
  if(film.id==='cooper') return /\b(?:1971|1970s)\b/i.test(txt)
  if(film.id==='leprince') return (n===0?/\b(?:1888|1880s)\b/i:/\b(?:1890|1890s)\b/i).test(txt)
  if(film.id==='slocum') return /\b(?:1909|1900s)\b/i.test(txt)
  throw Error(film.id)
}
for(const film of cases) {
  const baseline=await capture(base,baseBorders,film,unchanged,'off',false)
  for(const [mode,account,tag] of [['off',true,'casa/off'],['internal',false,'externo/internal'],['internal',true,'casa/internal']]) {
    const candidate=await capture(next,nextBorders,film,hook,mode,account)
    const bytesBase=JSON.stringify(baseline), bytesCandidate=JSON.stringify(candidate)
    const unchangedExpected=tag!=='casa/internal'||film.period.length===0
    if(unchangedExpected) assert.equal(hash(bytesBase),hash(bytesCandidate),film.id+' '+tag+' corpo ou imagens alterados')
    else {
      assert.deepEqual(baseline.narration,candidate.narration,film.id+' alterou narração')
      assert.notEqual(candidate.sheet,baseline.sheet,film.id+' ficha sem mudança')
      assert.ok(film.period.flat().some(marker=>candidate.sheet.toLowerCase().includes(marker)),film.id+' ficha sem época')
      for(const kind of ['textStills','editedStills']) {
        assert.equal(candidate[kind].length,4)
        candidate[kind].forEach((txt,n)=>{
          assert.ok(someYear(film,txt,n),film.id+' '+kind+' '+(n+1)+' sem data ou período')
          assert.notEqual(txt,baseline[kind][n],film.id+' '+kind+' '+(n+1)+' sem nova instrução')
        })
      }
      for(let m=0;m<candidate.sends.length;m++){
        const cb=JSON.parse(candidate.sends[m].body), bb=JSON.parse(baseline.sends[m].body)
        assert.equal(candidate.sends[m].model,baseline.sends[m].model)
        const {multi_prompt:cp,...restC}=cb, {multi_prompt:bp,...restB}=bb
        assert.deepEqual(restC,restB,film.id+' envelope de vídeo alterado')
        assert.equal(cp.length,4)
        cp.forEach((p,n)=>{
          assert.equal(p.duration,bp[n].duration)
          assert.ok(someYear(film,p.prompt,n),film.id+' '+candidate.sends[m].model+' plano '+(n+1)+' sem época')
          assert.notEqual(p.prompt,bp[n].prompt,film.id+' '+candidate.sends[m].model+' plano '+(n+1)+' sem nova instrução')
          assert.match(bp[n].prompt,visible[film.id][n],film.id+' ação ausente já no controle')
          assert.match(p.prompt,visible[film.id][n],film.id+' perdeu ação/objeto do plano '+(n+1))
          assert.ok([...p.prompt].length<=512,'plano > 512')
          if(film.id==='slocum'&&n<2) assert.ok(/(?:before|prior to|preceding|pre[- ]|earlier than|years leading up to|before the year)\s*(?:the year\s*)?1909/i.test(p.prompt),'Slocum expedição anterior recebeu data exata; plano '+(n+1))
        })
      }
    }
    steps.push({id:film.id,mode:tag,unchangedExpected,sheet:hash(candidate.sheet),photo:candidate.textStills.map(hash),dispatch:candidate.sends.map(x=>hash(x.body))})
  }
}
const result={base:base.sha,candidate:next.sha,harness:'7af247b9d006517b91791bf5261f69a7d5219404',cases:cases.length,controls:steps.length,simulatedPosts:steps.length*3,steps}
if(process.env.REPLAY_SAVE==='1') fs.writeFileSync(path.join(here,'recibo-candidato.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({base:base.sha,candidate:next.sha,controls:steps.length,simulatedPosts:steps.length*3}))
