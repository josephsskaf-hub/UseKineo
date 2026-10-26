const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {describe}=require('./failure-signature.cjs'),directory=__dirname;
const reportRoot='C:/kineo-wt/upsell-filme15-2610-work/.claude/worktrees/guardian/docs/qa/upsell-filme15-2610';
cp.execFileSync(process.execPath,[path.join(directory,'collect-baseline.cjs'),path.join(reportRoot,'baseline-main.json')],{stdio:'inherit'});
const baseline=JSON.parse(fs.readFileSync(path.join(reportRoot,'baseline-main.json'),'utf8'));
const raw=JSON.parse(fs.readFileSync(path.join(directory,'candidate-final.json'),'utf8'));
if(raw.done!==raw.total)throw new Error('Candidate incomplete: '+raw.done+'/'+raw.total);
const sha=value=>crypto.createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');
const git=(root,...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8e6}).replace(/\r\n/g,'\n');
const inventory=git(raw.root,'ls-tree','-r','--name-only','HEAD','scripts').trim().split('\n').filter(file=>/^scripts\/test-[^/]+\.mjs$/.test(file));
if(raw.total!==inventory.length||new Set(raw.results.map(result=>result.file)).size!==inventory.length)throw new Error('Incomplete candidate inventory');
git(raw.root,'diff','--exit-code','f6019fc7','--','app','components','lib');
const current=new Map(raw.results.map(result=>[result.file,{...describe(result,raw),attempts:[{run:raw.label,status:result.status,ms:result.ms,log:result.log}]}]));
const overlayLabels=['candidate-e4-final','candidate-kids-final','candidate-paginas-final','guardian-final-readers','candidate-demo-final','candidate-long-final'];
for(const label of overlayLabels){const file=path.join(directory,label+'.json');if(!fs.existsSync(file))throw new Error('Missing required candidate overlay '+label);const run=JSON.parse(fs.readFileSync(file,'utf8'));if(run.done!==run.total)throw new Error('Incomplete candidate overlay '+label);for(const result of run.results){const older=current.get(result.file);if(sha(fs.readFileSync(path.join(run.root,result.file),'utf8'))!==sha(fs.readFileSync(path.join(raw.root,result.file),'utf8')))throw new Error('Delivered test differs from rechecked source '+result.file);current.set(result.file,{...describe(result,run),attempts:[...older.attempts,{run:label,status:result.status,ms:result.ms,log:result.log,root:run.root}]});}}
const expected=new Map(baseline.results.map(result=>[result.file,result])),newRed=[],additionalCauses=[],unclassified=[],incompleteBaseline=[];
for(const result of current.values()){
 if(result.status===0)continue;const before=expected.get(result.file);
 if(!before||before.status===0){newRed.push(result);continue;}
 const added=result.reasons.filter(reason=>!before.reasons.includes(reason));
 if(added.length)additionalCauses.push({file:result.file,added,main:before.reasons,candidate:result.reasons});
 if(before.kind==='outer-timeout'&&!before.attempts.some(attempt=>attempt.run==='baseline-long-timeouts'))incompleteBaseline.push(result.file);
 if(result.unclassifiedTail||before.unclassifiedTail)unclassified.push({file:result.file,before:before.unclassifiedTail,after:result.unclassifiedTail});
}
const results=[...current.values()].sort((a,b)=>a.file.localeCompare(b.file));
const manifest=JSON.parse(fs.readFileSync(path.join(raw.root,'scripts/test-support/desfaz-upsell-filme15-2610-hunks.json'),'utf8'));
const runtimeHashes=Object.fromEntries([...Object.keys(manifest.scope),...manifest.newRuntimeFiles].map(file=>[file,sha(fs.readFileSync(path.join(raw.root,file),'utf8'))]));
const testHashes=Object.fromEntries(inventory.map(file=>[file,sha(fs.readFileSync(path.join(raw.root,file),'utf8'))]));
const pairedLimits=results.filter(result=>result.kind==='outer-timeout').map(result=>({file:result.file,main:expected.get(result.file)?.kind,mainAttempts:expected.get(result.file)?.attempts,candidate:result.kind,candidateMs:result.ms,interpretation:'Execution coverage limit; no product defect is inferred.'}));
const report={classification:'TESTADO LOCALMENTE',date:'2026-10-26',assembledAt:new Date().toISOString(),mainBase:baseline.base,frozenRuntime:'f6019fc7',bulkInputCommit:raw.base,collectedHead:git(raw.root,'rev-parse','HEAD').trim(),started:raw.started,finished:raw.finished,total:results.length,pass:results.filter(result=>result.status===0).length,fail:results.filter(result=>result.status!==0).length,newRedScripts:newRed,additionalFailureCauses:additionalCauses,unclassifiedNonzero:unclassified,incompleteBaselineComparisons:incompleteBaseline,pairedExecutionLimits:pairedLimits,regressionGate:newRed.length===0&&additionalCauses.length===0&&unclassified.length===0&&incompleteBaseline.length===0,notes:['All direct scripts/test-*.mjs were executed; nested test-support modules are helpers.','The three upsell guardians must pass. Paid-provider smoke calls remain blocked without credentials; inherited failures and execution limits are not presented as product defects.','Bulk tests used staged worker/time budgets. Main/candidate failing outer-timeout cases have explicit 600-second main counterparts. No assertion, clock or timeout inside a test was weakened.','Exact historical projections remove only frozen upsell bytes before old contracts; current behavior guardians read raw source.','The sem-porteiro scanner was repeated in a clean frozen candidate worktree because the parent workspace contains mandatory parallel worktrees, which are not product source.','Runtime source bytes match f6019fc7. Only tests, validation tools and reports changed during targeted rechecks.'],runtimeHashes,testHashes,results};
for(const file of ['scripts/test-upsell-filme15-2610.mjs','scripts/test-upsell-filme15-funnel-2610.mjs','scripts/test-upsell-filme15-undo-2610.mjs'])if(current.get(file)?.status!==0)throw new Error('Upsell guardian failed '+file);
fs.writeFileSync(path.join(reportRoot,'candidate-main-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,pass:report.pass,fail:report.fail,regressionGate:report.regressionGate,newRed,additionalCauses,unclassified,incompleteBaseline,pairedLimits},null,2));
if(!report.regressionGate)process.exitCode=1;
