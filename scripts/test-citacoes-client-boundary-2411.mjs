// Client privacy gate: real TS import graph + transpile/minify; never prints protected identifiers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const req=createRequire(process.cwd()+'/package.json'),ts=req('typescript'),terser=req('next/dist/compiled/terser')
const root=process.cwd(),TARGET='lib/internalAccounts.ts',RELEASE='lib/growth/citationIdeaRelease.ts'
const ENTRIES=['app/best-ai-shorts-generators/page.tsx','app/how-much-do-youtube-shorts-pay/page.tsx']
const read=f=>fs.readFileSync(path.join(root,f),'utf8')
const protectedMarkers=[...new Set([...read(TARGET).matchAll(/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/gi)].map(m=>m[0].toLowerCase()))]
assert.ok(protectedMarkers.length>0,'server markers loaded privately')
function inventory(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(x=>x.isDirectory()?inventory(dir+'/'+x.name):/\.(?:tsx?|jsx?)$/.test(x.name)?[dir+'/'+x.name]:[])}
const files=['app','components','lib'].flatMap(inventory)
function graph(replacements={}){
 const parsed=new Map()
 const exists=f=>Object.hasOwn(replacements,f)||fs.existsSync(path.join(root,f))
 const resolve=(from,name)=>{
  if(!name.startsWith('@/')&&!name.startsWith('.'))return null
  const base=path.posix.normalize(name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(from),name))
  return [base,base+'.ts',base+'.tsx',base+'.js',base+'.jsx',base+'/index.ts',base+'/index.tsx'].find(f=>/\.(?:tsx?|jsx?)$/.test(f)&&exists(f))??null
 }
 const node=f=>{
  if(parsed.has(f))return parsed.get(f)
  const code=replacements[f]??read(f),ast=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true)
  const client=ast.statements.some((s,i)=>i<3&&ts.isExpressionStatement(s)&&ts.isStringLiteral(s.expression)&&s.expression.text==='use client')
  const dependencies=[]
  function add(n){if(ts.isStringLiteralLike(n)){const f2=resolve(f,n.text);if(f2)dependencies.push(f2)}}
  function visit(n){
   if(ts.isImportDeclaration(n)){if(n.importClause?.isTypeOnly)return;const bindings=n.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings)&&!n.importClause?.name&&bindings.elements.length&&bindings.elements.every(x=>x.isTypeOnly))return;add(n.moduleSpecifier)}
   else if(ts.isExportDeclaration(n)){if(!n.isTypeOnly&&n.moduleSpecifier)add(n.moduleSpecifier)}
   else if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(n.expression)&&n.expression.text==='require'))&&n.arguments.length)add(n.arguments[0])
   ts.forEachChild(n,visit)
  }
  visit(ast);const value={code,client,dependencies:[...new Set(dependencies)]};parsed.set(f,value);return value
 }
 const walk=(start,visited=new Set())=>{if(visited.has(start))return visited;visited.add(start);for(const d of node(start).dependencies)walk(d,visited);return visited}
 const clientRoots=[...new Set([...files,...Object.keys(replacements)])].filter(f=>node(f).client)
 const routeTo=(start,target,seen=new Set())=>{if(start===target)return[start];if(seen.has(start))return null;seen.add(start);for(const d of node(start).dependencies){const tail=routeTo(d,target,seen);if(tail)return[start,...tail]}return null}
 if(process.env.KINEO_CITATION_PRIVACY_DIAGNOSTIC){const traces=clientRoots.map(r=>routeTo(r,TARGET)).filter(Boolean);console.log(JSON.stringify({unsafeClientRoots:traces.length,providers:[...new Set(traces.map(t=>t.at(-2)))],examples:traces.slice(0,4)},null,2));throw Error('Diagnostic stopped before minification')}
 for(const entry of clientRoots){const trace=routeTo(entry,TARGET);assert.equal(!!trace,false,'CLIENT graph cannot reach server allowlist'+(trace?'\n'+trace.join(' -> '):''))}
 function pageRoots(entry,visited=new Set(),roots=new Set()){
  if(visited.has(entry))return roots;visited.add(entry)
  if(node(entry).client){roots.add(entry);return roots}
  for(const d of node(entry).dependencies)pageRoots(d,visited,roots)
  return roots
 }
 return{node,walk,pageRoots,clientRoots}
}
async function verify(replacements={}){
 const g=graph(replacements),proof=[]
 for(const entry of ENTRIES){
  const layouts=[];let parent=path.posix.dirname(entry);while(parent==='app'||parent.startsWith('app/')){const layout=parent+'/layout.tsx';if(fs.existsSync(path.join(root,layout)))layouts.push(layout);if(parent==='app')break;parent=path.posix.dirname(parent)}
  const pageClientRoots=new Set([entry,...layouts].flatMap(f=>[...g.pageRoots(f)]))
  const closure=new Set();for(const r of pageClientRoots)for(const f of g.walk(r))closure.add(f)
  assert.ok(closure.size>0,'CLIENT page closure exists')
  let input=''
  let index=0
  for(const f of [...closure].sort()){
   const emitted=ts.transpileModule(g.node(f).code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
   input+='function module_'+index+++'(module,exports,require){\n'+emitted+'\n}\n'
  }
  const result=await terser.minify(input,{compress:false,mangle:true,format:{comments:false}})
  assert.equal(typeof result.code,'string','CLIENT minifier completed')
  const forbidden=protectedMarkers.filter(marker=>result.code.toLowerCase().includes(marker)).length
  assert.equal(forbidden,0,'CLIENT minified contains no server markers')
  proof.push({entry,ancestorLayouts:layouts,clientRoots:pageClientRoots.size,modules:closure.size,minifiedBytes:Buffer.byteLength(result.code),sha256:crypto.createHash('sha256').update(result.code).digest('hex'),protectedMarkersFound:forbidden})
 }
 return{allClientRoots:g.clientRoots.length,serverAllowlistReachable:false,method:'TypeScript local import/export/dynamic-import/require graph, page plus ancestor layouts, then actual transpilation and Next Terser minification with compression disabled to preserve every reachable string; no next build claim',pages:proof}
}
const proof=await verify()
const mutations=[
 ['direct import',{[RELEASE]:read(RELEASE)+"\nimport '@/lib/internalAccounts'\n"},'CLIENT graph cannot reach server allowlist'],
 ['barrel export',{[RELEASE]:read(RELEASE)+"\nexport * from '@/lib/internalAccounts'\n"},'CLIENT graph cannot reach server allowlist'],
 ['indirect import',{[RELEASE]:read(RELEASE)+"\nimport './clientBoundaryProbe'\n",'lib/growth/clientBoundaryProbe.ts':"import '@/lib/internalAccounts'\n"},'CLIENT graph cannot reach server allowlist'],
 ['dynamic import',{[RELEASE]:read(RELEASE)+"\nvoid import('@/lib/internalAccounts')\n"},'CLIENT graph cannot reach server allowlist'],
 ['commonjs import',{[RELEASE]:read(RELEASE)+"\nrequire('@/lib/internalAccounts')\n"},'CLIENT graph cannot reach server allowlist'],
 ['copied literal',{[RELEASE]:read(RELEASE)+"\nexport const boundaryProbe = "+JSON.stringify(protectedMarkers[0])+"\n"},'CLIENT minified contains no server markers'],
]
for(const[name,replacements,message]of mutations){
 await assert.rejects(()=>verify(replacements),e=>e?.code==='ERR_ASSERTION'&&(e.message===message||e.message.startsWith(message+'\n')),name+' must fail at privacy assertion')
 console.log('PASS privacy mutant '+name+' -> '+message)
}
if(process.env.KINEO_CITATION_PRIVACY_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_PRIVACY_PROOF,JSON.stringify({...proof,mutants:mutations.length},null,2))
console.log('PASS global client graph + both article client closures minified; zero protected markers; '+mutations.length+' exact-assertion mutants. No addresses logged.')
