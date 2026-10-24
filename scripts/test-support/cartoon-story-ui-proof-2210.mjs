// KINEO-CARTOON-CONSISTENCIA-2210 — rota real da história, moderação e reset executados com dublês; nenhuma escrita ou rede.
import fs from 'node:fs'
import strictAssert from 'node:assert/strict'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './offline-ts-loader.mjs'

export async function cartoonStoryUiProof({ overrides = {} } = {}) {
  const ROOT = process.cwd()
  const LIB='lib/kidsCartoon/kidsCartoon.ts',TPL='components/kidsCartoon/KidsCartoonTemplate.tsx',ROUTE='app/api/kids-cartoon/story/route.ts';
  const base=p=>execFileSync('git',['show','1b991815:'+p],{cwd:ROOT,encoding:'utf8',maxBuffer:1<<28}).replaceAll('\r\n','\n');
  const read=p=>overrides[p] ?? fs.readFileSync(path.join(ROOT,p),'utf8').replaceAll('\r\n','\n');
  let count=0;const notes=[];function assert(x,msg){strictAssert.ok(x,msg);count++;}
  const fake={script:'',calls:[],events:[],modCalls:[],user:{id:'offline-user',email:'customer@example.test'},modFail:null,throwWriter:false};
  const mock={
   'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},
   '@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:fake.user}})}})},
   '@/lib/internalAccounts':{isInternalEmail:()=>false},
   '@/lib/openai':{OPENAI_SCRIPT_TIMEOUT_MS:1000,openai:{chat:{completions:{create:async(body)=>{fake.calls.push(body);if(fake.throwWriter)throw Error('offline unavailable');return{choices:[{message:{content:fake.script}}]};}}}}},
   '@/lib/serverEvents':{writeServerEvent:async e=>{fake.events.push(e);return true;}},
   '@/lib/safety/topicModeration':{moderateTopic:async x=>{fake.modCalls.push(['topic',x.text]);return{ok:true};}},
   '@/lib/safety/contentModeration':{moderateContent:async x=>{fake.modCalls.push([x.stage,x.text]);return fake.modFail&&fake.modFail===x.stage?{ok:false,reason:'unavailable'}:{ok:true};}},
  };
  const make=old=>createOfflineLoader({mocks:mock,source:(p,s)=>old&&p===LIB?base(p):(overrides[p] ?? s)});
  const oldLoad=make(true),newLoad=make(false),oldL=oldLoad(LIB),L=newLoad(LIB),oldRoute=oldLoad(ROUTE),route=newLoad(ROUTE);
  const bodies={en:'Leo happily shares the little leaf with Pip in the sunny garden. Together they help a tired snail find a cool place to rest. Kindness makes their morning brighter. What gentle thing could you share today?',pt:'Leo encontra uma folha muito bonita no jardim. Com Pip, faz uma pequena sombra para o caracol descansar. Os dois esperam com cuidado e sorriem ao ver o amigo tranquilo. Como você pode ajudar alguém hoje?',es:'Leo encuentra una hoja bonita en el jardín. Con Pip, prepara una pequeña sombra para que descanse el caracol. Los dos esperan con cuidado y sonríen al ver tranquilo a su amigo. ¿Cómo puedes ayudar hoy?'};
  for(const [lang,s]of Object.entries(bodies))assert(L.kidsWordCount(s)>=36&&L.kidsWordCount(s)<=41,'fixture size '+lang+' '+L.kidsWordCount(s));
  const request=(character='leo',language='en',idea='Leo finds a little leaf in the garden')=>({character,language,duration:15,idea,ideaId:null});
  async function invoke(which,req,script){fake.script=script;fake.calls=[];fake.events=[];fake.modCalls=[];const res=await which.POST({json:async()=>req});return{...res,calls:[...fake.calls],events:[...fake.events],mods:[...fake.modCalls]};}
  for(const lang of ['en','pt','es']){
   const req=request('leo',lang,lang==='en'?'Leo finds a little leaf in the garden':lang==='pt'?'Leo encontra uma folha no jardim':'Leo encuentra una hoja en el jardín');
   const normal=await invoke(oldRoute,req,bodies[lang]);assert(normal.status===200,'baseline name-prefixed input works '+lang);
   const lower=bodies[lang].replaceAll('Leo','leo');const before=await invoke(oldRoute,req,lower),after=await invoke(route,req,lower);
   assert(before.status===502&&before.body.reason==='writer_no_character'&&before.calls.length===2,'reproduce case-sensitive output failure '+lang);
   assert(after.status===200&&after.calls.length===1,'case insensitive output succeeds '+lang);
   assert(after.mods.map(x=>x[0]).join()==='topic,input,output','all moderation steps retained '+lang);
   notes.push({case:'full-route-case-'+lang,before:before.status,beforeReason:before.body.reason,after:after.status,beforeWriterCalls:before.calls.length,afterWriterCalls:after.calls.length,canonicalInputBaseline:normal.status});
  }
  for(const c of L.KIDS_CHARACTERS)for(const lang of ['en','pt','es']){
   const name=c.name,idea=`${name} ${name} ${lang==='pt'?'encontra uma folha no jardim':lang==='es'?'encuentra una hoja en el jardín':'finds a little leaf in the garden'}`;
   const req=request(c.id,lang,idea);const v=L.validateKidsCartoonRequest(req);assert(v.ok,'duplicate named idea validates '+c.id+lang);
   const prompt=L.kidsStoryWriterPrompt({request:v.value,minWords:36,maxWords:41});assert(prompt.user==='Story idea: '+idea,'user idea preserved verbatim '+c.id+lang);assert(prompt.system.includes('The main character is '+name),'system keeps canonical identity '+c.id+lang);
   const text=bodies[lang].replaceAll('Leo',name.toUpperCase());const r=await invoke(route,req,text);assert(r.status===200,'full route uppercase '+c.id+lang);
  }
  for(const text of ['Leonardo','xleo','leon','Leox'])assert(L.kidsStoryCheck(text+' '+bodies.en.replaceAll('Leo','Pip'),{character:'leo',minWords:1,maxWords:100}).reason==='no_character','substring not name '+text);
  const badInput=await invoke(route,request('leo','en','Leo finds a gun in the garden'),bodies.en);assert(badInput.status===422&&badInput.body.reason==='kids_rule'&&badInput.calls.length===0,'unsafe input still refused before writer');
  const badOutput=await invoke(route,request(),bodies.en.toLowerCase().replace('little leaf','little gun'));assert(badOutput.status===422&&badOutput.body.reason==='writer_not_innocent'&&badOutput.calls.length===1,'unsafe lowercase output remains refused');
  const wrong=await invoke(route,request(),bodies.en.replaceAll('Leo','Mia'));assert(wrong.status===502&&wrong.body.reason==='writer_no_character'&&wrong.calls.length===2,'different name refused');
  fake.modFail='input';const blocked=await invoke(route,request(),bodies.en);assert(blocked.status!==200&&blocked.calls.length===0,'failed input moderation still fail closed');fake.modFail=null;
  fake.modFail='output';const blockedOut=await invoke(route,request(),bodies.en);assert(blockedOut.status!==200,'failed output moderation still fail closed');fake.modFail=null;
  fake.throwWriter=true;const unavailable=await invoke(route,request(),bodies.en);assert(unavailable.status===503&&unavailable.body.reason==='writer_unavailable','unavailable writer not treated as name failure');fake.throwWriter=false;
  fake.user=null;const auth=await invoke(route,request(),bodies.en);assert(auth.status===401&&auth.calls.length===0,'auth gate preserved');fake.user={id:'offline-user',email:'customer@example.test'};
  function reset(src,initial){const a=src.indexOf('  function restart() {'),b=src.indexOf('\n  const progress =',a);if(a<0||b<0)throw Error('restart missing');const fn=src.slice(a,b);const state={...initial},ctx={save:value=>state.saved=value};for(const key of ['stage','script','caption','videoUrl','error','needPlans','clips','composePct','idea','ideaId','copied'])ctx['set'+key[0].toUpperCase()+key.slice(1)]=v=>state[key]=v;vm.runInNewContext(fn+'\nrestart()',ctx);return state;}
  for(const selected of [false,true]){const initial={idea:selected?'':'Leo finds a leaf',ideaId:selected?'share':null,copied:true,stage:'done',script:'previous story',caption:'previous caption',videoUrl:'https://offline.test/old.mp4',error:'old',needPlans:true,clips:{done:3,total:3},composePct:100};const a=reset(base(TPL),initial),b=reset(read(TPL),initial);assert(a.idea===initial.idea&&a.ideaId===initial.ideaId&&a.copied===true,'before retained previous idea/copy');assert(b.idea===''&&b.ideaId===null&&b.copied===false,'after resets typed/preset/copy');assert(b.script===''&&b.caption===''&&b.videoUrl===null&&b.stage==='idle'&&b.error===null&&!b.needPlans&&b.clips.done===0&&b.clips.total===0&&b.composePct===0&&b.saved===null,'after retains complete existing render reset');notes.push({case:selected?'preset-reset':'typed-reset',before:{idea:a.idea,ideaId:a.ideaId,copied:a.copied},after:{idea:b.idea,ideaId:b.ideaId,copied:b.copied}});}
  const result={mark:'KINEO-CARTOON-CONSISTENCIA-2210',base:'1b991815',date:'2026-10-22',assertions:count,notes,limit:'Offline full route with mocked auth, moderation and writer; no production diagnosis, network, paid call or environment files.'};return result;

}
