import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const base = '889ca2e796bba383a61213531ef3a5f80f0696a7'
const transport = 'lib/kling4Trial.ts'
const feature = 'lib/cinematic/kling4PersonagemFixo.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const original = file => execFileSync('git', ['show', base + ':' + file], {encoding:'utf8', maxBuffer: 4_000_000})
const load = (source, enabled = true) => createOfflineLoader({source, globals:{AbortSignal}, env:enabled ? {KLING4_FIXED_CHARACTER_ENABLED:'true'} : {}})
const old = load((file, src) => file === transport ? original(file) : src)('@/' + transport)
const email = 'josephsskaf@gmail.com'
const url = 'https://www.usekineo.com/ads/presenters/marcus.webp'
const quality = {version:'film_quality_2910_v1',sourceGenerationId:'offline',characters:[{protagonista:true,nome:'Marcus',tipo:'humano',canonica:'Marcus wearing a dark wool coat'}],
  characterReferences:[{nome:'Marcus',url}], approvedStills:[],environmentSheet:'Zurich bank and surrounding streets'}
const story = 'In Zurich in 1934, Marcus works at a bank.'
const cues = ['Opens the ledger','Walks between the vaults','Steps onto the cobblestones','Buttons the coat']
const shots = cues.map(prompt=>({prompt,duration:5}))
const json = x => JSON.parse(JSON.stringify(x))

async function post(api,args) {
  const requests = []
  const job = await api.submitKling4TrialVideo(args,{apiKey:'offline',fetchImpl:async (url, opts)=>{
    requests.push({url,method:opts.method,body:opts.body})
    return {ok:true,json:async()=>({request_id:'offline'})}
  }})
  assert.equal(requests.length,1)
  return {job,request:requests[0]}
}

// Run the actual route's section expansion, including the second half of a merged scene.
function sectionPlan(source, modules, merged, fixedCharacter) {
  const begin = source.indexOf('const kling4PorSecao =')
  const end = source.indexOf('const kling4EnvioDoFilme',begin)
  assert.ok(begin > 0 && end > begin)
  const js = ts.transpile(source.slice(begin,end) + '\nreturn kling4PorSecao(a)', {target:ts.ScriptTarget.ES2022})
  const parsedScript = {segments:cues.map(p=>({pexelsQuery:p,voiceover:p}))}
  const prompts = merged ? ['First scene','Second scene','Last scene'] : [cues[0]]
  const scenes = prompts.map(description=>({description}))
  const voiceovers = merged ? [cues[0],cues.slice(1,3).join(' '),cues[3]] : [cues[0]]
  const a={prompts, approvedStills:prompts.map(()=>null),timing:{wordsPerSecond:2,voiceovers,clipSeconds:20,...(fixedCharacter ? {fixedCharacter}:{})}}
  const scope={epocaVisual:null,a,parsedScript,scenes,verbatim:merged,kling4PlanoPorSecao:true,kling4PlanoVariado:false,kling4PlanoFinal:false,
    planosPorSecao:modules('@/lib/kling4QuatroPlanos').planosPorSecao,sujeitoAparenciaLigada:()=>false,
    comSuperficieNoPlano:p=>p,garantirSujeitoNoUltimo1911:()=>{} /* [ensaio A2 19/11] o sujeito obrigatório no último plano: desligado fora do A2 (no-op) */}
  return Function(...Object.keys(scope),js)(...Object.values(scope))
}

async function suite(change) {
  const source = (file, src) => change && file===change[0] ? src.replace(change[1],change[2]) : src
  const modules=load(source), api=modules('@/'+transport), f=modules('@/'+feature)
  const route=source(routeFile,local(routeFile))
  assert.equal(load(source,false)('@/'+feature).fixedCharacterEnabled(email,true),false)
  for (const [actor,flag,ok] of [[email,true,true],[email,false,false],[email,'true',false],['joseph-test@shortsforgeai.com',true,false],['external@example.org',true,false]]) assert.equal(f.fixedCharacterEnabled(actor,flag),ok)
  assert.ok(route.indexOf('const ensaioPersonagemFixo = fixedCharacterEnabled(user.email, body.k4_personagem_fixo)') > route.indexOf('if (!user)'))
  assert.ok(route.indexOf('if (body.k4_personagem_fixo === true && body.dry_run === true)') < route.indexOf('await recuperarIdeiaDoEscritor'))
  const previewGate = route.slice(route.indexOf('const ensaioPersonagemFixo'),route.indexOf('// KINEO-APARENCIA-DO-PEDIDO-1311 (peça 1)'))
  const enter = Function('body','user','fixedCharacterEnabled','referenceRehearsal','NextResponse',previewGate)
  const previewHttp = (body,actor=email) => enter(body,{email:actor},f.fixedCharacterEnabled,f.referenceRehearsal,
    {json:(body,{status}={status:200})=>({status,body})})
  assert.equal(previewHttp({k4_personagem_fixo:true,dry_run:true,k4_reference_plan:{quality,story,shots}}).body.estimated_video_cost_usd,3.14)
  assert.equal(previewHttp({k4_personagem_fixo:true,dry_run:true},'external@example.org').status,403)
  assert.equal(previewHttp({k4_personagem_fixo:true,dry_run:true}).status,422)
  const admission=route.slice(route.indexOf('if (ensaioPersonagemFixo && KLING4_TRIAL_LIVE'),route.indexOf('// KINEO-QUALIDADE-TODOS-MOTORES-2910 — signed snapshot'))
  const admit=Function('ensaioPersonagemFixo','KLING4_TRIAL_LIVE','seedanceShortFilm','kidsPedidoAdmitido','classicVisualMode','personagemElenco',
    'let kling4TrialCandidate=false,aspectRequested;'+ts.transpile(admission)+';return kling4TrialCandidate')
  for(const [flag,mode,cast,expected] of [[true,'character_story',quality.characters,true],[false,'character_story',quality.characters,false],
    [true,'documentary_faceless',quality.characters,false],[true,'character_story',[],false],[true,'character_story',[{protagonista:true,tipo:'animal'}],false]]){
    assert.equal(admit(flag,true,true,false,mode,{elenco:cast}),expected)
  }
  assert.match(previewGate,/if \(!ensaioPersonagemFixo\) return NextResponse.json/)
  assert.doesNotMatch(previewGate,/fetch\(|await |debitVideoCredits|reserveKling/)
  assert.match(route,/if \(ensaioPersonagemFixo && kling4TrialCandidate && classicVisualMode === 'character_story'\)/)
  assert.equal(route.match(/referenceRehearsal\(body.k4_reference_plan\)/g)?.length,1)
  const ref=f.fixedCharacterReference(quality,story)
  assert.equal(ref.imageUrl,url)
  for(const tipo of ['animal','criatura']) assert.equal(f.fixedCharacterReference({...quality,characters:[{...quality.characters[0],tipo}]},story),null)
  assert.equal(f.fixedCharacterReference({...quality,characters:[]},story),null)
  const still = {characterNames:['Marcus'],url}
  assert.equal(f.fixedCharacterReference({...quality,characterReferences:[],approvedStills:[still]},story).imageUrl,url)
  assert.equal(f.fixedCharacterReference({...quality,characterReferences:[],approvedStills:[{...still,characterNames:['Other']}]},story),null)
  assert.equal(f.fixedCharacterReference({...quality,characterReferences:[],approvedStills:[{...still,characterNames:['Marcus','Other']}]},story),null)
  for(const merged of [false,true]){
    const baseline=sectionPlan(original(routeFile),modules,merged)
    const inactive=sectionPlan(route,modules,merged)
    assert.deepEqual((await post(api,inactive)).request,(await post(old,baseline)).request)
    const live=sectionPlan(route,modules,merged,ref)
    const sent=await post(api,live), input=JSON.parse(sent.request.body)
    assert.equal(sent.request.url,'https://queue.fal.run/kling/v4/reference-to-video')
    assert.deepEqual(input.image_urls,[url]); assert.equal(input.resolution,'720p')
    assert.equal(input.multi_prompt.length,merged?4:1)
    assert.equal(input.multi_prompt.reduce((n,s)=>n+s.duration,0),input.duration)
    for(const [i,s] of input.multi_prompt.entries()){
      assert.ok(s.prompt.includes(cues[i]),s.prompt)
      for(const required of ['@Image1','dark wool coat','1934','Zurich']) assert.ok(s.prompt.includes(required),required)
      assert.ok(Array.from(s.prompt).length<=512)
    }
    const replay = f.referenceRehearsal({quality,story,shots:live.prompts.map((prompt,i)=>({prompt,duration:input.multi_prompt[i].duration}))})
    assert.equal(JSON.stringify(replay.input),sent.request.body)
  }
  for(const stills of [[],[url,null,url]]) {
    const args={prompts:cues.slice(0,3),approvedStills:stills}
    assert.deepEqual((await post(api,args)).request,(await post(old,args)).request)
  }
  const landscape = {...quality,characters:[],characterReferences:[]}
  const legacy = f.referenceRehearsal({quality:landscape,story:'A river at dawn',shots})
  const legacyWire = await post(old,{prompts:cues,timing:{voiceovers:cues.map(()=>''),wordsPerSecond:1,clipSeconds:20}})
  assert.equal(legacy.reference_applied,false)
  assert.equal(JSON.stringify(legacy.input),legacyWire.request.body)
  const claim = {falModels:['kling/v4/reference-to-video'],falRequestIds:['test-id'],authorizedCompletedUrls:[null],
    response:{duration:15,quality:'cinematic_ai',aspect:'9:16',kling4_trial:{version:'kling4_trial_2810',engine_used:'kling4',
      original_request_id:'test-id',submitted_at:new Date(0).toISOString()}}}
  const status=load(source)('@/lib/kling4TrialAsyncStatus')
  const done=await status.advanceKling4TrialStatus({claim,now:1},{poll:async()=>({status:'done',url:'https://example.org/done.mp4'})})
  assert.equal(done.kind,'kling_done')
  const preview=f.referenceRehearsal({quality,story,shots})
  assert.equal(preview.estimated_video_cost_usd,3.14)
  assert.equal(preview.input.duration,20);assert.deepEqual(json(preview.input.multi_prompt.map(s=>s.duration)),[5,5,5,5])
  for(const duration of [2,31,1.5]) assert.equal(f.referenceRehearsal({quality,story,shots:[{prompt:'A',duration}]}),null)
  for(const duration of [3,30]){
    const p=f.referenceRehearsal({quality,story,shots:[{prompt:'Opens the ledger. '+ '灯 '.repeat(700),duration}]}).input.multi_prompt[0].prompt
    assert.ok(p.startsWith('Opens the ledger.') && p.includes('@Image1') && Array.from(p).length<=512)
  }
}
await suite()
const mutants=[
  [feature,"requested === true","true"],[feature,"=== 'josephsskaf@gmail.com'","!== ''"],
  [feature,"process.env.KLING4_FIXED_CHARACTER_ENABLED === 'true'","true"],
  [feature,"lead?.tipo !== 'humano'","!lead"], [feature,"s.characterNames.length === 1","s.characterNames.length > 0"],
  ['lib/kling4TrialAsyncStatus.ts','KLING4_I2V_MODEL, KLING4_REFERENCE_MODEL].includes','KLING4_I2V_MODEL].includes'],
  [transport,'image_urls: [reference.imageUrl]','image_urls: []'],[transport,"resolution: '720p', aspect_ratio: '9:16'","resolution: '1080p', aspect_ratio: '9:16'"],
  [transport,'duration: shot.duration','duration: 1'],[feature,'@Image1','@Image2'],
  [routeFile,"f.protagonista && f.tipo === 'humano'","f.protagonista"],
  [routeFile,'Object.assign(r.timing, { fixedCharacter: a.timing.fixedCharacter })','Object.assign(r.timing, {})'],
]
for(const mutant of mutants){
  assert.ok(local(mutant[0]).includes(mutant[1]))
  await assert.rejects(suite(mutant),{name:'AssertionError'},'survived: '+mutant[1])
}
console.log('PASS: founder, image provenance, both wire formats, real merged/single plans, no-spend rehearsal, 3–30s, 512 code points, '+mutants.length+' mutants.')

