// Offline behavior checks only: no network, secrets, customer records or generation.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'
let checks=0
const check=(condition,label)=>{assert.ok(condition,label);checks++}
const states=[], effects=[];let cursor=0
const storage=new Map(),listeners=new Map()
const window={addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k),dispatchEvent:e=>listeners.get(e.type)?.()}
const react={useState:init=>{const i=cursor++;if(!(i in states))states[i]=init;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},useEffect:fn=>effects.push(fn)}
const code=ts.transpileModule(fs.readFileSync('components/LibraryOrganization.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText
const box={exports:{},require:id=>id==='react'?react:{},window,Event,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}}
vm.runInNewContext(code,box)
const {organizeAssets,libraryFormat,useLibraryOrganization}=box.exports
const items=[{id:'new',name:'Z'},{id:'old',name:'A'}]
check(organizeAssets(items,[],false,'oldest',x=>x.name)[0].id==='old','oldest first')
check(items[0].id==='new','source order is never mutated')
check(organizeAssets(items,['old','other-account'],true,'newest',x=>x.name).length===1,'favorites only intersect currently authorized assets')
check(organizeAssets(items,[],false,'name',x=>x.name)[0].name==='A','name sorting')
check(libraryFormat('youtube_shorts')==='9:16'&&libraryFormat('youtube')==='16:9'&&libraryFormat(null)==='','format is derived only from known metadata')
let state=useLibraryOrganization();effects.splice(0).forEach(fn=>fn());state.toggle('new')
cursor=0;state=useLibraryOrganization()
check(state.favorites.includes('new'),'favorite changes immediately')
check(storage.values().next().value==='["new"]','only opaque ID persisted')
state.toggle('new');cursor=0;state=useLibraryOrganization()
check(state.favorites.length===0,'favorite can be removed')
storage.set('kineo:library:favorites:v1','{"corrupt":true}');listeners.get('storage')();cursor=0;state=useLibraryOrganization()
check(state.favorites.length===0,'corrupt storage safely ignored')
const examples='app/examples/ExamplesGallery.tsx',videos=[{id:'nature',title:'Lituya Bay',engine:'h3',badge:'MINIMAX H3',videoUrl:'/offline.mp4'},{id:'story',title:'The night train',engine:'kling',badge:'KLING 2.5',videoUrl:'/offline.mp4'}]
const filtered=renderPage(examples,false,{objective:'Nature'},{videos})
check(filtered.includes('Lituya Bay')&&!filtered.includes('The night train'),'topic filter changes actual displayed collection')
const reset=[];renderPage(examples,false,{objective:'Nature',query:'no match',captureControls:reset},{videos})
check(reset.some(c=>c.props.onClick?.toString().includes("setObjective('all')")),'empty state clears theme together with engine/search')
const imagePage='app/(dashboard)/images/ImagesClient.tsx'
const empty=renderPage(imagePage,false,{galleryLoading:false})
check(empty.includes('No sample yet')&&!empty.includes('Illustrative references'),'missing samples are honest')
const sample=renderPage(imagePage,false,{galleryLoading:false,items:[{id:'own',url:'/own.png',model:'dev'}]})
check(sample.includes('Your latest result')&&sample.includes('/own.png'),'real own result supplies reference')
check(!fs.readFileSync(examples,'utf8').includes('preload="auto"'),'no hidden next-clip full download')
const mobile=fs.readFileSync('components/MobileCreationShortcut.tsx','utf8')
check(mobile.includes('scrollIntoView')&&!mobile.includes('fetch('),'mobile shortcut only opens existing review, no spending handler')
const copy=JSON.parse(fs.readFileSync('lib/ui/refinementCopy.json','utf8'))
for(const [lang,dict] of Object.entries(copy))for(const key of ['Favorites','No sample yet','Framing preview','Review and generate','All themes','Turn into video'])check(Boolean(dict[key]),`${lang}: ${key}`)
console.log(`${checks} refinement behavior checks passed; offline only.`)
