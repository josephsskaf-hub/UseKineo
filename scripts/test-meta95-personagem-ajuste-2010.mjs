// KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]
// Provas OFFLINE: módulos TS e bloco REAL da rota; fornecedores, imagem, moderação e relógio falsos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { semMeta95PersonagemAjuste2010 as desfaz, META95_PERSONAGEM_AJUSTE_2010_BASE as BASE, META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS as ARQUIVOS, TROCAS_META95_PERSONAGEM_AJUSTE_2010 as TROCAS, MARCA_META95_PERSONAGEM_AJUSTE_2010 as MARCA } from './test-support/desfaz-meta95-personagem-ajuste-2010.mjs'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const lf = (s) => s.replace(/\r\n/g, '\n')
const rd = (p) => lf(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 27, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => lf(git('show', `${BASE}:${p}`))
const F = { lib: 'lib/cinematic/folhaDePersonagem.ts', srv: 'lib/estrelaServer.ts', helper: 'lib/cinematic/personagemStill.ts', juiz: 'lib/cinematic/criticoStill.ts', policy: 'lib/cinematic/visualPromptPolicy.ts', rota: 'app/api/generate-video-cinematic/route.ts' }
const semRede = () => { throw new Error('rede proibida') }
globalThis.fetch = semRede
let pass = 0, fail = 0
const ok = (v, m) => { console.log(`${v ? 'ok' : 'FALHA'} ${m}`); v ? pass++ : fail++ }
function carregador(over = {}, mocks = {}, scope = {}) {
  const cache = new Map()
  const load = (p) => {
    if (cache.has(p)) return cache.get(p)
    const m = { exports: {} }; cache.set(p, m.exports)
    const req = (n) => {
      if (Object.hasOwn(mocks, n)) return mocks[n]
      if (n.startsWith('@/')) return load(n.slice(2) + '.ts')
      if (n.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(p), n)) + '.ts')
      throw new Error(`import inesperado ${n}`)
    }
    const js = ts.transpileModule(over[p] ?? rd(p), { fileName: p, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const sc = { process: { env: {} }, fetch: semRede, ...scope }
    new Function('module', 'exports', 'require', ...Object.keys(sc), js)(m, m.exports, req, ...Object.values(sc))
    return m.exports
  }
  return load
}
const DINO = { script: 'At night a noise came from the forest. Dino, a small dinosaur, heard it from his bedroom. Dino opened the window and found fireflies.', visuals: ['Rustling leaves in a forest at night.', 'Dino listens in his room.', 'He opens the window and finds glowing fireflies.'], falas: ['A noise came from the forest at night.', 'Dino heard it from his room.', 'He opened the window and found fireflies.'] }
const RAVAN = { script: 'A boy talks to Ravan, the ten-headed demon king. Ravan rolls his eyes.', visuals: ['A boy talks to Ravan.', 'Ravan rolls his eyes.'], falas: ['A boy talks to Ravan, the demon king.', 'Ravan answers him.'] }
const MOTO = { script: 'A boy rode his bike home. His bike stopped. He vanished.', visuals: ['A young man on a motorcycle at night.', 'An empty motorcycle on the road.', 'A dark empty path.'], falas: ['A boy rode his bike home.', 'His bike stopped.', 'He vanished.'] }
const L = carregador()(F.lib), H = carregador()(F.helper), C = carregador()(F.juiz), V = carregador()(F.policy), S = carregador()('lib/cinematic/sceneStyle.ts'), M = carregador()('lib/safety/moderationPolicy.ts')
const elenco = (c) => L.elencoDeterministico(c.script)
const style = S.deriveStyleAnchor('a colorful 3D cartoon')
const direcao = (lib, policy, caso, i) => {
  const e = lib.elencoDeterministico(caso.script)
  const rota=rd(F.rota), inicio=rota.indexOf('    const personagensPorCena ='), fim=rota.indexOf('      try {',inicio)
  const ctx={personagem:{ativo:true},personagemElenco:{elenco:e},scenes:caso.visuals.map((v,j)=>({aiPrompt:v,voiceover:caso.falas[j]})),classicVisualPolicy:{mode:'character_story',style,character:lib.fichaDoProtagonista(e),aspect:'9:16'},eraSuffix:'',cenasComPersonagem:lib.cenasComPersonagem,visualDoPersonagem:lib.visualDoPersonagem,buildClassicVisualPrompt:policy.buildClassicVisualPrompt}
  const src=`export function run(ctx:any){const {${Object.keys(ctx).join(',')}}=ctx;${rota.slice(inicio,fim)} return cinematicBruto;});return classicScenePrompts[${i}]}`
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const m={exports:{}};new Function('module','exports',js)(m,m.exports)
  return m.exports.run(ctx)
}
const nota = (sexual = 0, menores = 0, cats = {}) => ({ categories: cats, category_scores: { sexual, 'sexual/minors': menores } })

// 1. Formato pedido + dimensões devolvidas + 2 folhas na mesma composição.
const prompt = L.promptDoStillComFolha('The lower third clear for captions. The boy talks to Ravan.', elenco(RAVAN))
ok(/Output aspect ratio 9:16/.test(prompt) && /No panels/.test(prompt) && /no collage/.test(prompt) && /no blank strips/.test(prompt) && /SAME scene/.test(prompt) && !/lower third clear/.test(prompt), '1a 9:16 explícito, duas folhas na MESMA cena, sem faixa/painel/colagem')
ok(H.formatoDoStillDoPersonagem(576, 1024, '9:16') && !H.formatoDoStillDoPersonagem(1024, 1024, '9:16') && !H.formatoDoStillDoPersonagem(undefined, undefined, '9:16') && !H.formatoDoStillDoPersonagem(NaN, 1024, '9:16'), '1b dimensões válidas, quadrado, ausentes e inválidas')
async function servidor(over = {}, dims = { width: 576, height: 1024 }, opts = {}) {
  const pedidos = [], checks = []
  const mocks = {
    '@fal-ai/client': { fal: { config() {}, queue: { status: async () => ({ status: 'COMPLETED' }), result: async () => ({ data: { images: [{ url: 'https://fake/still.jpg', ...dims }] } }) } } },
    '@/lib/falQueue': { submitFalQueueOnce: async (_m, input) => { pedidos.push(input); return 'fake-job' } },
    '@/lib/imageStore': { signReferencePhotos: semRede },
    '@/lib/safety/contentModeration': { moderateContent: async (a) => { checks.push(a); const d = M.decideModeration(opts.nota ?? nota(), a.text, { hasImage: true }); return d.block ? { ok: false, reason: 'blocked', decision: d } : { ok: true } } },
  }
  const l = carregador(over, mocks, { process: { env: { FAL_KEY: 'fake-offline' } } })
  const r = await l(F.srv).gerarStillDaEstrela({ prompt, imageUrls: ['https://fake/a.jpg','https://fake/b.jpg'], aspect: '9:16', userId: 'fake-user', engine: 'personagem:seedance', pollWindowMs: 40000, ...(opts.off ? {} : { personagem: { textoModeracao: opts.texto ?? 'A dinosaur watches fireflies.' } }) })
  return { r, pedidos, checks }
}
const bom = await servidor(), quadrado = await servidor({}, { width: 1024, height: 1024 }), ausente = await servidor({}, {})
ok(bom.r.url && bom.pedidos[0].aspect_ratio === '9:16' && bom.pedidos[0].image_urls.length === 2 && quadrado.r.url === null && quadrado.r.motivo === 'format_invalid' && ausente.r.motivo === 'format_invalid' && quadrado.checks.length === 0, '1c servidor REAL recusa formato/ausência antes de aceitar a imagem; conserva 2 referências')
ok((await servidor({}, {}, { off: true })).r.url, '1d Estrela sem opt-in mantém resultado URL-only anterior')

// 2. Nunca muda categoria, limiar ou imagem. Só os metadados benignos são normalizados.
const fichaDino = [{ tipo: 'criatura', canonica: 'Dino, a child-sized green dinosaur, no clothes' }]
const autor = 'Dino hears a noise in his bedroom and sees fireflies.'
const texto = H.textoModeracaoDoPersonagem(autor, fichaDino)
ok(texto.startsWith(autor) && !/child-sized|no clothes/.test(texto) && !M.decideModeration(nota(0.12), texto, { hasImage: true }).block && M.decideModeration(nota(0.12), fichaDino[0].canonica, { hasImage: true }).block, '2a falso positivo reproduzido pelo termo técnico de tamanho; criatura inocente preserva autor e passa')
ok(!M.decideModeration(nota(), 'A child dinosaur plays in a bedroom.', { hasImage: true }).block, '2b idade sozinha, sem sinal sexual, não barra')
const sensivel = 'A boy is described with sexual content.'
ok(H.textoModeracaoDoPersonagem(sensivel, fichaDino).includes(sensivel) && H.textoModeracaoDoPersonagem(sensivel, fichaDino).includes('child-sized') && H.textoModeracaoDoPersonagem(autor, [{ tipo: 'humano', canonica: 'A child, no clothes' }]).includes('A child, no clothes'), '2c texto sensível e humano não são neutralizados')
for (const n of [nota(0, 0.02), nota(0, 0, { 'sexual/minors': true }), nota(0.3), nota(0, 0, { sexual: true })]) ok((await servidor({}, undefined, { nota: n, texto })).r.motivo === 'moderation_blocked', '2d bloqueio real de categoria/score continua fechado')
ok(bom.checks[0].imageUrls[0] === 'https://fake/still.jpg', '2e imagem devolvida continua indo à moderação')

// 3. Nome mítico não pode ser convertido em humano genérico nem pelo casting.
const ravan = elenco(RAVAN).find((f) => f.nome === 'Ravan')
const falsoCasting = JSON.stringify({ characters: [{ name: 'Ravan', description: 'A red haired human man in a yellow hoodie and jeans with a round face and bright green eyes' }] })
ok(ravan?.tipo === 'criatura' && /ten.headed demon king/i.test(ravan.canonica) && !/hoodie|early thirties|reddish/.test(ravan.canonica) && L.lerCasting(falsoCasting, [ravan])[0].canonica === ravan.canonica, '3a Ravan preserva dez cabeças/rei-demônio; casting humano rejeitado')
ok(/deliberate|mythical/i.test(C.STILL_CRITIC_IDENTIDADE), '3b anatomia mítica deliberada da referência é respeitada pelo juiz')
const entradaDupla = { indice:0, url:'still', mostra:'boy with Ravan', fala:'boy talks to Ravan', prompt:'boy with Ravan', seed:1, referencia:{url:'boy-sheet',descricao:'the boy',outras:[{url:'ravan-sheet',descricao:ravan.canonica}]} }
function referenciasNaOrdem(c) {
  const p=c.montarPedidoAoCritico(entradaDupla,'still'), partes=p.messages[1].content
  return p.imagens===3 && JSON.stringify(partes.filter(x=>x.type==='image_url').map(x=>x.image_url.url))==='["boy-sheet","ravan-sheet","still"]' && partes[1].text.includes('the boy') && partes[3].text.includes(ravan.canonica) && partes[5].text.includes('STILL TO CHECK')
}
ok(referenciasNaOrdem(C), '3c juiz recebe ambas as folhas na ordem exata e com cada descrição associada à sua imagem')

// 4. A fala manda: nome/papel/pronome; visual young man não envelhece o menino.
ok(L.cenasComPersonagem(MOTO.visuals, elenco(MOTO), MOTO.falas).every((c) => c.nomes.length === 1) && /boy/.test(direcao(L,V,MOTO,0)) && !/young man/i.test(direcao(L,V,MOTO,0)), '4a moto 3/3 cenas pela fala e pronome; plano final mostra boy')
const girl = { ...MOTO, script: 'A girl rode her bike home. Her bike stopped. She vanished.', falas: ['A girl rode home.', 'Her bike stopped.', 'She vanished.'] }
ok(L.cenasComPersonagem(girl.visuals, elenco(girl), girl.falas).every((c) => c.nomes.length === 1), '4b girl/her/she propaga identidade')
const comAmbiente = L.cenasComPersonagem(['boy','forest','bike'], elenco(MOTO), ['A boy rides home.', 'A forest at night.', 'His bike stopped.'])
ok(comAmbiente[0].nomes.length===1 && comAmbiente[1].nomes.length===0 && comAmbiente[2].nomes.length===1, '4e ambiente intermediário continua vazio e preserva antecedente para his bike')
const dois = [{ ...ravan, nome: 'Adam', nucleo: 'Adam', genero: 'man' }, { ...ravan, nome: 'Boris', nucleo: 'Boris', genero: 'man' }]
ok(L.cenasComPersonagem(['x','x'], dois, ['Adam talks to Boris.', 'He leaves.'])[1].nomes.length === 0, '4c pronome ambíguo não espalha duas identidades')
ok(L.ensaioDoPersonagem({ engine:'seedance', elenco:elenco(MOTO), casting:'offline', visuals:MOTO.visuals, falas:MOTO.falas, look:style }).cenas_com_personagem === 3, '4d ensaio usa a mesma fala do pago')

// 5. Causa reproduzida com relógio falso: edit de 25 s falha na janela FLUX antiga de 9 s.
async function refaz(over = {}, motivo = 'ok', referencia = true) {
  let agora = 0, chamadas = 0, janela = null
  const c = carregador(over)(F.juiz)
  const fetchImpl = async () => { chamadas++; return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(chamadas === 1 ? { verdict:'FAIL', issues:['identity'], reason:'wrong species', score:20 } : { verdict:'PASS', issues:[], reason:'identity matches', score:95 }) } }] }) } }
  const e = { indice:0, url:'https://fake/original.jpg', mostra:'Dino at the window', fala:'Dino sees fireflies.', prompt:'Dino at the window', seed:7, ...(referencia ? { referencia:{ url:'https://fake/sheet.jpg', descricao:'green dinosaur' } } : {}) }
  const result = await c.criticarStill(e, { filme:c.novoFilmeDoCritico('enforce', { prazo:70000 }), agora:()=>agora, apiKey:'fake-offline', fetchImpl, gerarStill:async (_p,_s,ms)=> { janela=ms; agora+=25000; return ms < 25000 ? { url:null, motivo:'provider_timeout' } : { url:motivo === 'ok' ? 'https://fake/retry.jpg' : null, motivo } } })
  return { ...result, janela, chamadas }
}
const retry = await refaz()
ok(retry.janela >= 25000 && retry.relato.regeracao_ok === true && retry.relato.regeracao_motivo === 'ok' && retry.url.endsWith('/retry.jpg') && retry.chamadas === 2, '5a edit de 25 s cabe, refaz UMA vez e julga de novo')
for (const m of ['provider_timeout','moderation_blocked','format_invalid']) ok((await refaz({},m)).relato.regeracao_motivo === m, `5b refação falha conserva motivo ${m}`)

// 6. Floresta sem menção não ganha performance genérica nem pessoa.
const dino1 = direcao(L,V,DINO,0), dino2 = direcao(L,V,DINO,1)
ok(!/characters act naturally|same main character|early thirties/i.test(dino1) && /no people, no extra characters/.test(dino1) && /Dino.*dinosaur/i.test(dino2), '6a Dino: cena 1 ambiente; cenas citadas recebem só o dinossauro')

// Bloco real da rota: integração e evento; nunca carrega a rota inteira ou credenciais.
async function bloco(over = {}, ativo = true, caso = DINO, editFalha = false) {
  const edits=[], eventos=[], folhas=[]
  const fetchImpl=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({verdict:'FAIL',issues:['identity'],reason:'wrong species',score:20})}}]})})
  const load=carregador(over,{}, {fetch:fetchImpl,process:{env:{OPENAI_API_KEY:'fake-offline'}}}), lib=load(F.lib), juiz=load(F.juiz)
  const ctx={...lib,...juiz, textoModeracaoDoPersonagem:load(F.helper).textoModeracaoDoPersonagem, personagem:{ativo},anchorActive:true,estrelaAtiva:false,personagemElenco:{elenco:lib.elencoDeterministico(caso.script),casting:'offline'}, scenes:caso.visuals.map((v,i)=>({aiPrompt:v,description:v,voiceover:caso.falas[i]})), classicScenePrompts:caso.visuals, wantsKling:false,wantsVeo:false,styleAnchor:style,generationSeed:42,aspectRequested:'9:16',user:{id:'fake-user'},generationId:'fake-gen',sceneStills:caso.visuals.map((_,i)=>`flux-${i}`),providerSubmissionMayExist:false,
    generateCinematicSceneStill:async(a)=>{folhas.push(a);return `https://fake/sheet-${folhas.length}.jpg`}, gerarStillDaEstrela:async(a)=>{edits.push(a);return editFalha ? {url:null,motivo:'format_invalid'} : {url:`https://fake/edit-${edits.length}.jpg`,motivo:'ok'}},writeServerEvent:async(e)=>{eventos.push(e)},console:{log(){},warn(){}}}
  const src=over[F.rota]??rd(F.rota), ini=src.indexOf('// >>> KINEO-META95-PERSONAGEM-2010 bloco'), fim=src.indexOf('// <<< KINEO-META95-PERSONAGEM-2010 bloco')
  const code=src.slice(src.indexOf('\n',ini)+1,fim)
  const js=ts.transpileModule(`export async function run(ctx:any){let {${Object.keys(ctx).join(',')}}=ctx;let personagemRelatoFinal:any=null;${code}\nreturn {sceneStills,personagemRelatoFinal,providerSubmissionMayExist}}`, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const mod={exports:{}};new Function('module','exports',js)(mod,mod.exports)
  return {result:await mod.exports.run(ctx),edits,eventos,folhas}
}
const off=await bloco({},false), on=await bloco(), fallback=await bloco({},true,DINO,true), moto=await bloco({},true,MOTO)
ok(off.edits.length===0 && off.folhas.length===0 && off.eventos.length===0 && JSON.stringify(off.result.sceneStills)==='["flux-0","flux-1","flux-2"]', 'I1 OFF bloco real: zero chamada, evento ou mudança de still')
ok(on.result.sceneStills[0]==='flux-0' && on.edits.length===4 && on.edits.every((a)=>a.personagem?.textoModeracao.includes('Narration:')) && on.eventos.some((e)=>e.name==='cinematic_still_critic' && e.metadata.regeracao_motivo==='ok') && on.result.personagemRelatoFinal.critico.every((c)=>c.regeracao_motivo==='ok'), 'I2 bloco real: Dino ambiente preservado; moderação recebe fala; motivo da refação chega aos eventos e resposta')
ok(fallback.result.sceneStills.every((s,i)=>s===`flux-${i}`) && moto.edits.length===6, 'I3 formato inválido mantém FLUX; moto recebe edit nas 3 cenas e refação uma vez cada')
const falaSensivel={...DINO,falas:[...DINO.falas]};falaSensivel.falas[1]='Dino hears a sexual description involving a boy.'
ok((await bloco({},true,falaSensivel)).edits.some((a)=>a.personagem?.textoModeracao.includes(falaSensivel.falas[1])), 'I4 fala sensível integral chega à moderação mesmo com visual inocente')

// Desligado: sem referência/opção, pedido e resultado permanecem idênticos à origin/main.
const baseLoad=carregador(Object.fromEntries([F.lib,F.srv,F.juiz,F.policy].map((p)=>[p,base(p)])))
const oldPolicy=baseLoad(F.policy)
for(const c of [DINO,RAVAN,MOTO]) for(const visual of c.visuals) ok(V.buildClassicVisualPrompt(visual,{mode:'character_story',style,aspect:'9:16'})===oldPolicy.buildClassicVisualPrompt(visual,{mode:'character_story',style,aspect:'9:16'}),'OFF política visual byte a byte')
const e={indice:0,url:'x',mostra:'forest',fala:'forest',prompt:'forest',seed:1}
ok(JSON.stringify(C.montarPedidoAoCritico(e,'x'))===JSON.stringify(baseLoad(F.juiz).montarPedidoAoCritico(e,'x')), 'OFF pedido do crítico byte a byte sem referência')
ok(JSON.stringify(await refaz({},'ok',false))===JSON.stringify(await refaz({[F.juiz]:base(F.juiz)},'ok',false)), 'OFF crítico sem referência: JSON e chamadas byte a byte')

// Desfaz estrito e composição com a cadeia antiga, CRLF e idempotência.
ok(ARQUIVOS.length >= 11, 'D0 tabela de desfaz não pode ficar vazia nem omitir os arquivos originais')
for(const p of ARQUIVOS) { const raw=fs.readFileSync(path.join(ROOT,p),'utf8'); ok(lf(desfaz(raw,p))===base(p),`D1 desfaz exato ${p}`); ok(desfaz(desfaz(raw,p),p)===desfaz(raw,p),`D2 idempotente ${p}`); ok(desfaz(lf(raw).replace(/\n/g,'\r\n'),p)===base(p).replace(/\n/g,'\r\n'),`D2 CRLF ${p}`) }
ok(desfaz('sem marca',F.rota)==='sem marca' && desfaz(null,F.rota)===null && desfaz(`x // ${MARCA}`,'outro.ts')===`x // ${MARCA}`, 'D3 fora do escopo não mexe')
const antigo=await import('./test-support/desfaz-meta95-personagem-2010.mjs')
ok(antigo.semMeta95Personagem2010(rd(F.rota),F.rota)===antigo.semMeta95Personagem2010(desfaz(rd(F.rota),F.rota),F.rota), 'D4 camada nova encadeada antes da antiga')
const assuntos=git('log','--format=%s',`${BASE}..HEAD`).trim().split('\n').filter(Boolean)
ok(assuntos.every((s)=>s.startsWith(`${MARCA} [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]`)), 'D5 commits só com marca/selo exigidos')

// Mutantes APLICADOS; a MESMA regra executada precisa ficar vermelha.
let vermelhos=0
async function mutante(nome,p,de,para,prova) {
  const src=rd(p); const mut=src.replace(de,para)
  if(mut===src){ok(false,`mutante ${nome}: âncora ausente`);return}
  let verde;try{verde=await prova({[p]:mut})}catch{verde=false}
  if(verde===false)vermelhos++
  ok(verde===false,`mutante ${nome}: aplicado e vermelho`)
}
await mutante('ratio pedido',F.lib,'Output aspect ratio ${normalizeAspect(aspect)}','Output format',o=>/Output aspect ratio 9:16/.test(carregador(o)(F.lib).promptDoStillComFolha('x',elenco(RAVAN))))
await mutante('painéis',F.lib,'No panels,','Panels allowed,',o=>/No panels/.test(carregador(o)(F.lib).promptDoStillComFolha('x',elenco(RAVAN))))
await mutante('segunda referência após still',F.juiz,'parts.splice(3, 0, ...outrasPartes)','parts.splice(parts.length, 0, ...outrasPartes)',o=>referenciasNaOrdem(carregador(o)(F.juiz)))
await mutante('dimensões',F.srv,'validarFormato && url && !formatoDoStillDoPersonagem','false && url && !formatoDoStillDoPersonagem',async o=>(await servidor(o,{width:1024,height:1024})).r.motivo==='format_invalid')
await mutante('metadata tamanho',F.helper,"'small')","'child-sized')",o=>!M.decideModeration(nota(0.12),carregador(o)(F.helper).textoModeracaoDoPersonagem(autor,fichaDino),{hasImage:true}).block)
const castingMitoErrado = JSON.stringify({characters:[{name:'Ravan',description:'A red demon with one head in a yellow hoodie and jeans with green eyes and a short tail'}]})
await mutante('mito casting',F.lib,"if (identidadeMitica(e.nome) || /\\bmythological identity\\b/i.test(e.canonica))", 'if (false)',o=>carregador(o)(F.lib).lerCasting(castingMitoErrado,[ravan])[0].canonica===ravan.canonica)
await mutante('fala',F.lib,'if (falas !== undefined) return cenasFaladasComPersonagem(visuals, elenco, falas)','if (false) return cenasFaladasComPersonagem(visuals, elenco, falas)',o=>carregador(o)(F.lib).cenasComPersonagem(MOTO.visuals,elenco(MOTO),MOTO.falas).every(c=>c.nomes.length===1))
await mutante('antecedente após ambiente',F.lib,'if (nomes.length > 0 || ele || ela) anterior = nomes','anterior = nomes',o=>carregador(o)(F.lib).cenasComPersonagem(['boy','forest','bike'],elenco(MOTO),['A boy rides home.','A forest at night.','His bike stopped.'])[2].nomes.length===1)
await mutante('prazo FLUX',F.juiz,'STILL_CRITIC_REFERENCIA_JANELA_REGERACAO_MS = 45_000','STILL_CRITIC_REFERENCIA_JANELA_REGERACAO_MS = 9_000',async o=>(await refaz(o)).relato.regeracao_ok===true)
await mutante('motivo perdido',F.juiz,'if (e.referencia) r.regeracao_motivo = resultado','if (false) r.regeracao_motivo = resultado',async o=>(await refaz(o,'provider_timeout')).relato.regeracao_motivo==='provider_timeout')
await mutante('pessoa em ambiente',F.policy,'policy.personagemCena !== undefined','false',o=>/no people, no extra characters/.test(direcao(L,carregador(o)(F.policy),DINO,0)))
await mutante('rota ignora fala',F.rota,"cenasComPersonagem(visuaisP, elencoP, scenes.map((s) => s.voiceover ?? ''))",'cenasComPersonagem(visuaisP, elencoP)',async o=>(await bloco(o,true,MOTO)).edits.length===6)
const primeira=ARQUIVOS.find((p)=>TROCAS[p]?.length)
let estrito=false;try{desfaz(rd(primeira)+'\n// '+MARCA,primeira)}catch{estrito=true}ok(estrito,'mutante desfaz: acréscimo inesperado lança')
console.log(`\n${pass} ok; ${fail} falhas; ${vermelhos}/12 mutantes executados vermelhos; base ${BASE}`)
process.exit(fail ? 1 : 0)
