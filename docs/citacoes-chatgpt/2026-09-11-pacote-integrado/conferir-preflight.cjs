const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');
const expected='https://github.com/josephsskaf-hub/UseKineo.git';
const roots=['C:/kineo/.claude/worktrees/citacoes-01-2026-09-10','C:/kineo-wt/transport-safe-20260911'];
const run=(cwd,args)=>cp.spawnSync('git',args,{cwd,encoding:'utf8'});
const results=roots.map(cwd=>{
const get=(...a)=>{const r=run(cwd,a);return {status:r.status,text:r.stdout.trim()};};
const urls=get('remote','get-url','--all','origin');const push=get('remote','get-url','--push','--all','origin');
const rawUrls=urls.text.split('\n').filter(Boolean),pushUrls=push.text.split('\n').filter(Boolean);
const q=get('rev-parse','--verify','refs/heads/entrega-atual^{commit}');
const sym=get('symbolic-ref','--quiet','refs/heads/entrega-atual');
const hookPath=get('rev-parse','--path-format=absolute','--git-path','hooks').text;
const hookFiles=fs.existsSync(hookPath)?fs.readdirSync(hookPath).filter(n=>!n.endsWith('.sample')&&fs.statSync(path.join(hookPath,n)).isFile()).map(n=>({name:n,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(hookPath,n))).digest('hex')})):[];
const names=['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_CONFIG_COUNT','GIT_CONFIG_PARAMETERS','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_NAMESPACE','GIT_CONFIG','GIT_CONFIG_GLOBAL','GIT_CONFIG_SYSTEM'];
const flags={};for(const key of ['remote.origin.mirror','remote.origin.receivepack','core.sshCommand','push.followTags','core.hooksPath']){const c=get('config','--get',key);flags[key]={configured:c.status===0,valueNotPrinted:true};}
return {root:cwd,recordedAtUtc:new Date().toISOString(),branch:get('branch','--show-current').text,fetchOriginMatchesExpected:urls.status===0&&rawUrls.length===1&&rawUrls[0]===expected,pushOriginMatchesExpected:push.status===0&&pushUrls.length===1&&pushUrls[0]===expected,fetchUrlCount:rawUrls.length,pushUrlCount:pushUrls.length,queueBefore:q.status===0?q.text:null,queueIsSymbolic:sym.status===0,gitEnvironmentOverridesPresent:names.filter(n=>Boolean(process.env[n])),configFlags:flags,activeHookFiles:hookFiles,queueCheckedOut:get('worktree','list','--porcelain').text.split('\n').includes('branch refs/heads/entrega-atual'),trackedStatus:get('status','--porcelain','--untracked-files=no').text,untrackedFileCount:get('ls-files','--others','--exclude-standard').text.split('\n').filter(Boolean).length};
});
const out={classification:'EVIDÊNCIA OPERACIONAL — preflight somente leitura, valores sensíveis não impressos',expectedOrigin:expected,roots:results,scope:'Snapshot only. Repeat against the final clean integration worktree and environment immediately before publication. These scripts do not enforce every precondition.'};
fs.writeFileSync(path.join(__dirname,'PREFLIGHT-TRANSPORTE.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
