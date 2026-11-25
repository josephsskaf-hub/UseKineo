import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const file = 'app/api/generate-video-cinematic/route.ts'
const helper = 'lib/cinematic/elencoEFigurino2411.ts'
const source = readFileSync(file, 'utf8').replaceAll('\r\n','\n')
const base = process.argv.find(x=>x.startsWith('--base='))?.slice(7)
const bench = createOfflineLoader()
const lib = bench('@/' + helper)
const house = bench('@/lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
const pedido = 'Sonic, a blue hedgehog in red sneakers, and Amy Rose, a pink hedgehog in a red dress, race Metal Sonic, a chrome robot double.'
// Two excerpts transcribed in the CEO review from the signed ac9bb8f8 claim. They aren't a complete copy of that claim.
const plans = ['Metal Sonic manipulates intricate robotic components.', 'Sonic and Amy Rose sprint side by side.']
const voices = ['Metal Sonic waits.', 'Sonic and Amy Rose sprint.']
const samples = [{pedido,plans,voices}]
const archive = process.argv.find(x=>x.startsWith('--ensaio='))?.slice(9)
if (archive) {
  const record = JSON.parse(readFileSync(archive,'utf8')).filmes.find(x=>x.gen==='ac9bb8f8')
  for(const k of ['hoje','novo','final']) samples.push({pedido:record.a2.pedido,plans:record.a2[k].planos,voices:record.a2.falas})
}
function borders(src) {
  const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true)
  const vars = new Map(), outputs = []
  const begin = src.indexOf('const criticarStillClassico =')
  const stop = src.indexOf("...(rastro1911 ? { plano_da_fala:",begin)
  assert.ok(begin>0 && stop>begin)
  function emit(key,n) {
    const expression = n.getText(tree)
    const code = ts.transpileModule('('+expression+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
    const run = scope => runInNewContext(code,scope,{timeout:1000})
    return {key,expression,run}
  }
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.initializer && ['papelVisual2411','visualParaImagemOuReserva','promptsDaReserva'].includes(n.name.getText(tree))) vars.set(n.name.getText(tree),emit('',n.initializer))
    if(n.getStart(tree)>=begin && n.getStart(tree)<stop) {
      if(ts.isCallExpression(n)) {
        const call=n.expression.getText(tree)
        const prop={generateCinematicSceneStill:'scenePrompt',gerarStillComFolha:'prompt',gerarStillsDaEstrela:'itens'}[call]
        if(prop) {
          const arg=n.arguments[0].properties.find(p=>p.name?.getText(tree)===prop)
          assert.ok(arg,call)
          outputs.push(emit(call,arg.initializer||arg.name))
        } else if(call==='buildFalInput') outputs.push(emit('reserva-imediata',n.arguments[1]))
      }
      if(ts.isPropertyAssignment(n) && n.name.getText(tree)==='prompt_still') outputs.push(emit('retry-still',n.initializer))
      if(ts.isPropertyAssignment(n) && ['fallback_scenes','scene_prompts'].includes(n.name.getText(tree)) && /classicScenePrompts|promptsDaReserva/.test(n.initializer.getText(tree))) outputs.push(emit(n.name.getText(tree),n.initializer))
      if(ts.isBinaryExpression(n) && n.operatorToken.kind===ts.SyntaxKind.EqualsToken && n.left.getText(tree).endsWith('.fallback_scenes')) outputs.push(emit('fallback_scenes-final',n.right))
    }
    ts.forEachChild(n,visit)
  }
  visit(tree)
  assert.equal(outputs.filter(x=>x.key==='generateCinematicSceneStill').length,6)
  assert.equal(outputs.filter(x=>x.key==='gerarStillComFolha').length,3)
  for(const k of ['gerarStillsDaEstrela','reserva-imediata','fallback_scenes','fallback_scenes-final','retry-still']) assert.equal(outputs.filter(x=>x.key===k).length,1,k)
  assert.equal(outputs.filter(x=>x.key==='scene_prompts').length,2)
  return {vars,outputs}
}
function captures(b, mode, email, film) {
  const scope = {...lib,LEITOR_DO_ELENCO_2411:mode,user:{email},kling4TrialCandidate:true,body:{original_idea:film.pedido},
    prompt:film.voices.join(' '),classicScenePrompts:film.plans,scenes:film.plans.map(()=>({clipSeconds:6})),kling4ApprovedStills:film.plans.map((_,i)=>'fixture:'+i)}
  scope.papelVisual2411=b.vars.get('papelVisual2411')?.run(scope)
  scope.visualParaImagemOuReserva=b.vars.get('visualParaImagemOuReserva')?.run(scope)
  scope.promptsDaReserva=b.vars.get('promptsDaReserva')?.run(scope)
  return b.outputs.map(({key,run}) => {
    const values = film.plans.map((text,i) => {
      const q={...scope,folhasC:['https://fixture.invalid/folha'],scenePrompt:text,promptForAttempt:text,c:{indice:i},promptNovo:text,fichasDaCena:()=>[],
        folhaSemNome2511:true,epocaVisual:null,styleAnchor:{},instrucao:'',f:{},aspectRequested:'9:16',
        promptDaFolha:()=>text,aplicarEpocaVisual:p=>p,promptDoStillComFolhaAjuste:p=>'Identity: '+p,
        estrelaPlanoClassico:[{protagonista:true,indice:i,prompt:text}]}
      const value=JSON.parse(JSON.stringify(run(q)))
      if(key!=='retry-still') return value
      const claim={cenas:[{cena:i+1,folhas:q.folhasC,prompt_still:value}]}
      const ref=bench('@/lib/cinematic/elencoTrava').referenciaDaCenaNoClaim(claim,i)
      assert.ok(ref,'the redo gate must read the stored sheet prompt')
      return bench('@/lib/cinematic/personagemAjuste').corpoDoEditAjuste(ref.prompt,ref.folhas,q.aspectRequested)
    })
    return {key,values}
  })
}
const escapes = /\b(?:Sonic|Amy Rose)\b/i
const tested=borders(source)
const original=base && borders(execFileSync('git',['show',base+':'+file],{encoding:'utf8',maxBuffer:32e6}))
for (const film of samples) {
  const off=captures(tested,'off',house,film)
  const outside=captures(tested,'internal','outside@example.invalid',film)
  const on=captures(tested,'internal',house,film)
  assert.deepEqual(outside,off)
  if(original) assert.deepEqual(off,captures(original,'off',house,film))
  for(const [i,row] of on.entries()) {
    assert.match(JSON.stringify(off[i].values),escapes,row.key+' must expose control')
    assert.doesNotMatch(JSON.stringify(row.values),escapes,row.key+' leaked protected name')
  }
}
const role = lib.prepararPapeisVisuais2411(pedido,voices.join(' '))
assert.equal(role('Sonic and Amy Rose sprint past Metal Sonic.'),'the blue hedgehog and the pink hedgehog sprint past the chrome robot double.')
const order2='Metal Sonic, a chrome robot double. Amy Rose, a pink hedgehog in a red dress. Sonic, a blue hedgehog in red sneakers.'
assert.equal(lib.prepararPapeisVisuais2411(order2,voices.join(' '))('Sonic'), 'the blue hedgehog')
const long = 'Warm lamps glow. '.repeat(39)+'Sonic opens the door.'
assert.ok(role(long,Infinity).endsWith('the blue hedgehog opens the door.'))
function loadMutant(from,to) {
  const text=readFileSync(helper,'utf8').replaceAll('\r\n','\n')
  assert.equal(text.split(from).length,2,'unique code anchor')
  return createOfflineLoader({source:(path,s)=>path===helper?s.replace(from,to):s})('@/'+helper)
}
function rejectsBrandInRole(m) {
  const f=m.prepararPapeisVisuais2411('Sonic, a Sonic hedgehog, ran.','Sonic ran.')
  assert.doesNotMatch(f('Sonic opens a door.'),/\bsonic\b/i,'M5 brand copied into own role')
}
function findsCompound(m) {
  const f=m.prepararPapeisVisuais2411('Spider-Man opens a door.','Spider-Man opens a door.')
  assert.ok(f && !f('Spider-Man opens a door.').includes('Spider-Man'),'M9 fixed hyphenated name omitted')
}
rejectsBrandInRole(lib)
findsCompound(lib)
assert.throws(()=>rejectsBrandInRole(loadMutant('descricao && !obras.some(o => temNome(descricao, o))','descricao')),/M5 brand copied/)
assert.throws(()=>findsCompound(loadMutant('if (textos.some(t => temNome(t.texto, nome))) nomes.add(nome)','if (false) nomes.add(nome)')),/M9 fixed hyphenated/)
function leak(key,needle,replacement) {
  assert.ok(source.includes(needle),needle)
  const broken=borders(source.replace(needle,replacement))
  const output=captures(broken,'internal',house,samples[0])
  assert.ok(output.some(row=>row.key===key && escapes.test(JSON.stringify(row.values))), 'mutation must leak at '+key)
}
leak('retry-still','prompt_still: folhasC.length > 0 ? visualParaImagemOuReserva(promptDoStillComFolhaAjuste(classicScenePrompts[c.indice], fichasDaCena(c), aspectRequested)).slice(0, 2600)', 'prompt_still: folhasC.length > 0 ? promptDoStillComFolhaAjuste(classicScenePrompts[c.indice], fichasDaCena(c), aspectRequested).slice(0, 2600)')
leak('fallback_scenes-final',').fallback_scenes = promptsDaReserva.map(',').fallback_scenes = classicScenePrompts.map(')
leak('generateCinematicSceneStill','scenePrompt: visualParaImagemOuReserva(scenePrompt),\n              styleSuffix','scenePrompt,\n              styleSuffix')
leak('gerarStillComFolha','prompt: visualParaImagemOuReserva(promptNovo), imageUrls','prompt: promptNovo, imageUrls')
leak('reserva-imediata','buildFalInput(m, visualParaImagemOuReserva(promptForAttempt),','buildFalInput(m, promptForAttempt,')
console.log('PASS: '+tested.outputs.length+' final image/fallback expressions; '+samples.length+' input sets; OFF/external, role assignment, M5/M9 and five leaking-sink mutants.')

