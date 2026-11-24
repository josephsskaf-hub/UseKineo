import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {mundo} from './mundo.mjs'
import {frontieres,capture} from './captura.mjs'
import {aplicar} from './acoplar.mjs'

const here=path.dirname(fileURLToPath(import.meta.url))
const [repoArg,outputArg]=process.argv.slice(2)
if(!repoArg) throw Error('Uso: node apresentar.mjs <repo> [arquivo.md]')
const repo=path.resolve(repoArg), output=outputArg?path.resolve(outputArg):null
process.chdir(repo)
const read=name=>JSON.parse(fs.readFileSync(path.join(here,name),'utf8'))
const proof=read('recibo-candidato.json'), cases=read('roteiros.json'), oldProof=read('recibo-base.json')
const base=await mundo(repo,proof.base), next=await mundo(repo,proof.candidate)
const bo=frontieres(base), no=frontieres(next)
const sha=s=>createHash('sha256').update(s).digest('hex')
const cell=s=>s.replaceAll('|','\\|').replaceAll('\n','<br>')
const code=String.fromCharCode(96), fence=code.repeat(3)
const rows=['# Ficha e planos antes e depois da correção de época','',
  '**TESTADO LOCALMENTE · 24/11/2026.** A coluna Antes usa '+code+base.sha+code+' e a coluna Depois usa '+code+next.sha+code+' com a chave interna ativa. Os textos em inglês são os bytes de texto capturados na chamada simulada ao produtor de vídeo com referência única ('+code+'kling/v4/reference-to-video'+code+'). A ficha é o prompt que a rota passa ao produtor de imagem do personagem. Todos os corpos foram confrontados com os hashes dos recibos anteriores.','',
  'Os roteiros históricos são os da casa. O casting e a referência são entradas de ensaio. A foto é representada por [REFERÊNCIA 1]. Os pedidos foram observados antes de responder localmente ao transporte. Esta prova não avalia imagens renderizadas.','',
  '## Três histórias com época','']
const labels={cooper:'Dan Cooper',leprince:'Louis Le Prince',slocum:'Joshua Slocum',bolt:'Bolt',ember:'Ember',juno:'Juno',quantia:'Quantia em euros',codigo:'Código de modelo'}
for(const [i,film] of cases.entries()){
  const old=await capture(base,bo,film,s=>s,'off',false)
  const now=await capture(next,no,film,aplicar,'internal',true)
  const steps=proof.steps.filter(s=>s.id===film.id), on=steps.find(s=>s.mode==='casa/internal')
  const o=old.sends.find(s=>s.model==='kling/v4/reference-to-video'), n=now.sends.find(s=>s.model===o.model)
  assert.equal(sha(o.body),oldProof.results.find(s=>s.id===film.id).bodySha[2])
  assert.equal(sha(n.body),on.dispatch[2])
  assert.equal(sha(old.sheet),steps.find(s=>s.mode==='casa/off').sheet)
  assert.equal(sha(now.sheet),on.sheet)
  const a=JSON.parse(o.body), b=JSON.parse(n.body)
  assert.equal(a.multi_prompt.length,4)
  assert.equal(b.multi_prompt.length,4)
  function sanitized(body) {
    const clean=structuredClone(body)
    assert.deepEqual(clean.image_urls,['https://fixture.invalid/house'])
    clean.image_urls=['[REFERÊNCIA 1]']
    return clean
  }
  if(i===3) rows.push('## Cinco controles sem época','','Cada texto é exibido uma vez. Para cada um destes controles, a ficha e os três pedidos de vídeo da candidata coincidiram com os respectivos da base em casa/internal, casa/OFF e externo/internal. Cada tipo de vídeo mantém seu próprio envelope. Os planos apresentados são os do pedido de referência única.','')
  rows.push('### '+labels[film.id],'')
  if(film.period.length) {
    rows.push('| Material | Antes | Depois |','| --- | --- | --- |','| Ficha | '+cell(old.sheet)+' | '+cell(now.sheet)+' |')
    a.multi_prompt.forEach((p,j)=>{
      assert.equal(b.multi_prompt[j].duration,p.duration)
      rows.push('| Plano '+(j+1)+' · '+p.duration+' s | '+cell(p.prompt)+' | '+cell(b.multi_prompt[j].prompt)+' |')
    })
    rows.push('','<details><summary>Corpos completos e sanitizados do vídeo</summary>','','**Antes**','',fence+'json',JSON.stringify(sanitized(a),null,2),fence,'','**Depois**','',fence+'json',JSON.stringify(sanitized(b),null,2),fence,'','</details>','')
  } else {
    const hashes=old.sends.map(s=>sha(s.body))
    for(const step of steps) {assert.deepEqual(step.dispatch,hashes);assert.equal(step.sheet,sha(old.sheet))}
    assert.deepEqual(old,now)
    rows.push('**Ficha**','',''+old.sheet,'','| Plano | Texto antes e depois |','| --- | --- |')
    a.multi_prompt.forEach((p,j)=>rows.push('| '+(j+1)+' · '+p.duration+' s | '+cell(p.prompt)+' |'))
    const {multi_prompt,...envelope}=sanitized(a)
    rows.push('','Envelope comum a Antes e Depois para este controle: '+code+JSON.stringify(envelope)+code+'.','')
  }
}
const revisit=read('recibo-hoje.json')
assert.equal(revisit.candidate,next.sha)
rows.push('## Ano da câmera e ano da cena','','**TESTADO LOCALMENTE.** Nesta tabela, a coluna Antes usa a revisão intermediária '+code+revisit.previous+code+', na qual o caso do museu ainda falhava. A coluna Depois usa '+code+next.sha+code+'. Cada linha corresponde ao último plano de uma variante. A coluna de imagem traz o texto exato do still, e os detalhes trazem os prompts recebidos pelo modelo de referência. O recibo guarda ainda o still com referência e os pedidos dos modelos de imagem e texto para vídeo.','','| Cena pedida | Narração preservada em ambas as versões | Still antes | Still depois |','| --- | --- | --- | --- |')
for(const example of revisit.cases){
  assert.equal(example.voice,example.before.narration)
  assert.equal(example.voice,example.after.narration)
  rows.push('| '+cell(example.visual)+' | '+cell(example.voice)+' | '+cell(example.before.still)+' | '+cell(example.after.still)+' |')
}
rows.push('','<details><summary>Planos efetivamente enviados ao transporte simulado com referência</summary>','','| Cena | Antes | Depois |','| --- | --- | --- |')
for(const e of revisit.cases){
  const select=c=>c.dispatch.find(s=>s.model==='kling/v4/reference-to-video').prompt
  rows.push('| '+cell(e.visual)+' | '+cell(select(e.before))+' | '+cell(select(e.after))+' |')
}
rows.push('','</details>','')
rows.push('## Reproduzir','','A partir da pasta deste kit, com os commits e TypeScript disponíveis localmente:','',fence+'powershell','node ./apresentar.mjs C:/kineo ./PLANOS-ANTES-DEPOIS.md',fence,'','Sem o segundo argumento, o script imprime o texto e preserva os arquivos.','')
const result=rows.join('\n')
assert.ok(!result.includes('https://')&&!result.includes('fixture.invalid'))
if(output) fs.writeFileSync(output,result)
else process.stdout.write(result)
