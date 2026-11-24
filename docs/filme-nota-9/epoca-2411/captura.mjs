import assert from 'node:assert/strict'
import vm from 'node:vm'

// Compile the expression actually sent by the route, and retain its source coordinate.
export function frontieres(world) {
  const file='app/api/generate-video-cinematic/route.ts'
  const source=world.read(file), ts=world.ts
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true)
  const calls=[], statements=[]
  const variables=[]
  const compiled=new Map()
  function visit(node) {
    if(ts.isCallExpression(node)) calls.push(node)
    if(ts.isIfStatement(node)) statements.push(node)
    if(ts.isVariableDeclaration(node)&&node.initializer) variables.push(node)
    ts.forEachChild(node,visit)
  }
  visit(ast)
  function compile(node,statement=false) {
    if(compiled.has(node)) return compiled.get(node)
    const expression=node.getText(ast)
    const js=ts.transpileModule(statement?expression:'('+expression+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
    const run=new vm.Script(js)
    const result={source:expression,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,run(scope) { return run.runInNewContext(scope,{timeout:2000}) }}
    compiled.set(node,result)
    return result
  }
  function arg(method, property, matches) {
    const nodes=calls.filter(c=>c.expression.getText(ast)===method&&c.arguments[0]&&matches(c.arguments[0].getText(ast)))
    assert.ok(nodes.length,'Rota sem consumidor '+method+':'+property)
    const node=nodes[0].arguments[0]
    const prop=node.properties.find(p=>p.name?.getText(ast)===property)
    assert.ok(prop,method+':'+property)
    return compile(prop.initializer||prop.name)
  }
  const v=(name,matcher=()=>true)=> {
    const found=variables.filter(n=>n.name.getText(ast)===name&&matcher(n.initializer.getText(ast)))
    assert.equal(found.length,1,'Variável ambígua/ausente: '+name)
    return compile(found[0].initializer)
  }
  return {
    sheet:arg('generateCinematicSceneStill','scenePrompt',s=>s.includes('promptDaFolha(')),
    textStill:arg('generateCinematicSceneStill','scenePrompt',s=>s.includes('STILL_POLL_WINDOW_MS')&&s.includes('aspectRequested')&&s.includes('romanceAdulto.ativo')),
    editedStill:arg('gerarStillComFolha','prompt',s=>s.includes('promptDoStillComFolhaAjuste(')),
    v, epochStills() {
      const found=statements.filter(n=>n.expression.getText(ast)==='epocaVisual'&&n.thenStatement.getText(ast).includes('classicScenePrompts[i] = aplicarEpocaVisual('))
      assert.equal(found.length,1)
      return compile(found[0],true)
    },
  }
}
export async function capture(world,borders,film,apply,mode,account) {
  const {load}=world
  const bits=load('@/lib/scriptParser').parseUserScript(film.script).segments
  assert.equal(bits.length,4)
  const fixtureAppearance=film.appearance
  const baseCast={nome:film.name,canonica:fixtureAppearance,nucleo:film.name,genero:null,tipo:'humano',origem:'modelo',protagonista:true}
  if (film.id==='ember'||film.id==='bolt') baseCast.tipo='criatura'
  if (film.id==='juno') baseCast.tipo='animal'
  const basePrompts=bits.map(s=>s.pexelsQuery)
  const initialShots=basePrompts.map((s,i)=>(i===0?`Identity: ${film.name}, ${fixtureAppearance}. `:'')+(film.leading?.[i]||'')+s)
  const groups=film.groups||[[0],[1],[2],[3]]
  const voices=groups.map(g=>g.map(i=>bits[i].voiceover).join(' '))
  const merge=xs=>groups.map(g=>g.map(i=>xs[i]).join('. '))
  const {cast,scenes,shots,scope={}}=apply({world,borders,film,mode,account,cast:baseCast,scenes:merge(basePrompts),shots:merge(initialShots),bits,voices})
  const folha=load('@/lib/cinematic/folhaDePersonagem')
  const adjusted=load('@/lib/cinematic/personagemAjuste')
  const styleAnchor={look:'photoreal',lookPhrase:'photorealistic cinematic'}
  const sheet=borders.sheet.run({...scope,promptDaFolha:folha.promptDaFolha,f:cast,styleAnchor})
  const textStills=[],editedStills=[]
  for(let i=0;i<groups.length;i++) {
    const common={...scope,idx:i,scenePrompt:scenes[i],classicScenePrompts:scenes,c:{indice:i},aspectRequested:'9:16',fichasDaCena:()=>[cast],promptDoStillComFolhaAjuste:adjusted.promptDoStillComFolhaAjuste}
    textStills.push(borders.textStill.run(common))
    editedStills.push(borders.editedStill.run(common))
  }
  const king=load('@/lib/kling4Trial')
  const sends=[]
  // Fixed fixture: probe the same producer with zero, multiple or one reference, no card/real image.
  for(const shape of ['text','stills','reference']) {
    const timing={voiceovers:voices,wordsPerSecond:2.7}
    if(shape==='reference') timing.referenciaUnica={imageUrl:'https://fixture.invalid/house',nomes:[film.name],frase:'Keep the same character from @Image1.',descricao:fixtureAppearance}
    const approvedStills=shape==='stills'?['fixture:0','fixture:1','fixture:2',null]:[]
    const route=borders.v('kling4PorSecao').run({...scope,kling4PlanoPorSecao:true,verbatim:true,parsedScript:{segments:bits},scenes:voices.map(voiceover=>({voiceover})),
      planosPorSecao:load('@/lib/kling4QuatroPlanos').planosPorSecao,sujeitoAparenciaLigada:()=>false,
      comSuperficieNoPlano:load('@/lib/cinematic/superficieSemTexto').comSuperficieNoPlano,
      kling4PlanoVariado:true,planosComEscalaVariada:load('@/lib/kling4PlanoVariado').planosComEscalaVariada,
      escalaDoPlano:load('@/lib/kling4PlanoVariado').escalaDoPlano,
      kling4PlanoFinal:true,planoFinalEmMovimento:load('@/lib/kling4PlanoFinal').planoFinalEmMovimento,
      garantirSujeitoNoUltimo1911(){}})
    const actual=route({prompts:shots,approvedStills,timing})
    await king.submitKling4TrialVideo(actual,{apiKey:'offline',now:()=>0,fetchImpl:async (url,opts)=>{
      assert.equal(opts.method,'POST')
      sends.push({model:new URL(url).pathname.slice(1),body:opts.body})
      return {ok:true,json:async()=>({request_id:'offline'})}
    }})
  }
  assert.deepEqual(sends.map(s=>s.model),['kling/v4/text-to-video','kling/v4/image-to-video','kling/v4/reference-to-video'])
  return {sheet,textStills,editedStills,sends,narration:Array.from(bits,x=>x.voiceover)}
}
