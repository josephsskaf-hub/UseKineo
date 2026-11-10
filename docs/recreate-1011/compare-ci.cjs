// Compare preserved raw runs. Explicit rechecks never erase the original failure records.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto')
const root=path.resolve(__dirname,'../..'),read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'))
const rawMain=read('ci-main-10407b89a.json'),rawCandidate=read('ci-candidato-109.json'),rechecks=read('ci-retestes.json')
const scoped=read('validacao-final.json')
assert(scoped.results.length===6&&scoped.results.every(r=>r.passed),'all scoped gates and typecheck must pass after the full replay')
const main=structuredClone(rawMain.results),candidate=structuredClone(rawCandidate.results)
assert(rechecks.loopback.results.every(r=>r.status===0),'both loopback rechecks must pass')
assert(rechecks.diskMutant.results.length===1&&rechecks.diskMutant.results[0].passed,'isolated disk-mutant recheck must pass')
for(const list of [main,candidate])list.find(r=>r.args[0].includes('test-apresentadores-admin')).passed=true
candidate.find(r=>r.args[0].includes('test-roteiro-curto-sem-falha')).passed=true
const key=r=>(r.args[0]+' '+r.args.filter(x=>x.startsWith('--')).join(' ')).trim(),lookup=new Map(main.map(r=>[key(r),r]))
const regressions=candidate.filter(r=>lookup.get(key(r))?.passed&&!r.passed)
const newGates=candidate.filter(r=>!lookup.has(key(r)))
const inherited=candidate.filter(r=>!r.passed&&lookup.has(key(r))&&!lookup.get(key(r)).passed)
const fixed=candidate.filter(r=>r.passed&&lookup.has(key(r))&&!lookup.get(key(r)).passed)
assert.equal(regressions.length,0,'a green main gate cannot become red')
assert(newGates.every(r=>r.passed),'new Recreate gates must pass')
const signature=text=>(text.split('\n').find(l=>/^(?:AssertionError|ReferenceError|TypeError|Error:|FAIL|FALHA)/.test(l))||text.split('\n').find(l=>l.includes('Error:'))||text.slice(0,160)).slice(0,220)
const lf=s=>s.replace(/\r\n/g,'\n'),sha=s=>createHash('sha256').update(s).digest('hex')
const preserved=['lib/clipesNos2Lugares.ts','lib/vitrineEnquadramento.ts','app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/generate/GenerateClient.tsx']
const preservedHashes={}
for(const file of preserved){
 const current=lf(fs.readFileSync(path.join(root,file),'utf8'))
 const before=lf(execFileSync('git',['show','10407b89a:'+file],{cwd:root,encoding:'utf8',maxBuffer:16<<20}))
 assert.equal(current,before,'source content after normalizing Git checkout line endings: '+file)
 preservedHashes[file]=sha(current)
}
const result={
 date:new Date().toISOString(),base:'10407b89a43bb2a5800ce5c706a88be34cd9484b',
 kind:'Local Node22 replay; not GitHub Linux or a fresh npm ci',
 scopedRecheck:{date:scoped.date,passed:scoped.results.filter(r=>r.passed).length,file:'validacao-final.json'},
 normalization:'Loopback admin rechecked outside localhost sandbox restriction in both trees. Windows file-open failure in disk-mutant suite rechecked alone after restoring the known mutant. Original failures retained; source content compared to Git with LF line endings.',
 main:{commands:main.length,passed:main.filter(r=>r.passed).length,failed:main.filter(r=>!r.passed).length},
 candidate:{commands:candidate.length,passed:candidate.filter(r=>r.passed).length,failed:candidate.filter(r=>!r.passed).length},
 regressions:regressions.map(key),fixed:fixed.map(key),newGates:newGates.map(r=>({command:key(r),passed:r.passed})),preservedHashes,
 inherited:inherited.map(r=>({command:key(r),mainSignature:signature(lookup.get(key(r)).output),candidateSignature:signature(r.output)})),
}
fs.writeFileSync(path.join(__dirname,'CI-COMPARACAO.json'),JSON.stringify(result,null,2)+'\n')
fs.writeFileSync(path.join(__dirname,'CI-JA-VINHA-VERMELHO.md'),`# CI — falhas herdadas da main

TESTADO LOCALMENTE — ${result.date}; Node 22.23.4, main 10407b89a. Replay dos comandos Node críticos do workflow com dependências locais e PostgreSQL isolado; não foi npm ci limpo nem CI GitHub/Linux. Base efetiva: ${result.main.passed}/${result.main.commands} passaram, ${result.main.failed} falharam. Candidato: ${result.candidate.passed}/${result.candidate.commands} passaram, ${result.candidate.failed} falharam. Nenhum verde da main virou vermelho; dois gates Recreate novos passam; Five improvements foi corrigido dentro do workflow. Clips e Studio series também passaram separadamente (validacao-final.json), como o fundador pediu. Não chamo a CI inteira de verde.

FATO CONFIRMADO / ESCOPO — o bloco da manhã mandou deixar os guardiões já vermelhos na main sem correção ampliada. A investigação anterior foi arquivada fora do candidato; nenhuma correção dos antigos Ads/ofertas/render foi incluída para mascarar verde. Alguns primeiros erros de provas históricas mudam ao ver a camada Recreate; o fato de a mesma suíte já falhar não demonstra equivalência de todos os seus checks. Ambas as assinaturas estão em CI-COMPARACAO.json.

TESTADO LOCALMENTE — rechecagens: administração de apresentadores usa só loopback/arquivos e passou nas duas árvores fora da restrição de localhost; a primeira execução está preservada. Um teste de mutação recebeu UNKNOWN ao restaurar um arquivo no Windows e deixou seu mutante de duração; o arquivo foi reposto a partir da main, a suíte passou isolada e a auditoria final confirmou a restauração do conteúdo. Não entrou mudança em GenerateClient. Fontes: ci-retestes.json, ci-main-10407b89a.json e ci-candidato-109.json.

Já vinha vermelho — mantido sem alteração neste lote:

`+inherited.map(r=>'- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** '+key(r)).join('\n')+'\n')
console.log(JSON.stringify({main:result.main,candidate:result.candidate,regressions:regressions.length,inherited:inherited.length}))
