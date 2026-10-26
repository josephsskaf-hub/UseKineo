// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — local validation isolation only.
const fs = require('node:fs');
const path = require('node:path');
const {syncBuiltinESMExports} = require('node:module');
const blocked = kind => { throw new Error('KINEO_OFFLINE_BLOCKED: ' + kind); };
const isEnv = p => typeof p !== 'number' && /(^|[\\/])\.env(?:[.\\/]|$)/i.test(String(p instanceof URL ? p.pathname : p));
for (const name of ['readFileSync','readFile','openSync','open','createReadStream']) {
  const original=fs[name]; fs[name]=function(p,...args){ if(isEnv(p)) return blocked('env read'); return original.call(this,p,...args); };
}
const exists=fs.existsSync; fs.existsSync=function(p){ return isEnv(p) ? false : exists.call(this,p); };
const untouchable=p=>/(?:^|[\\/])lib[\\/](?:engineWall|homeVideoCuration)\.ts$/i.test(String(p instanceof URL?p.pathname:p));
for(const name of ['writeFileSync','writeFile','appendFileSync','appendFile','unlinkSync','unlink','rmSync','rm','renameSync','rename','copyFileSync','copyFile']){const original=fs[name];fs[name]=function(p,...args){if(untouchable(p)||(/rename|copyFile/.test(name)&&untouchable(args[0])))return blocked('protected source write');return original.call(this,p,...args);};}
for(const name of ['readFile','open']){ const original=fs.promises[name]; fs.promises[name]=function(p,...args){ if(isEnv(p)) return Promise.reject(new Error('KINEO_OFFLINE_BLOCKED: env read')); return original.call(this,p,...args); }; }
for(const [mod,names] of [['node:http',['request','get']],['node:https',['request','get']],['node:net',['connect','createConnection']],['node:tls',['connect']],['node:dns',['lookup','resolve','resolve4','resolve6']]]) {
  const m=require(mod); for(const name of names) m[name]=()=>blocked('network ' + mod + '.' + name);
}
require('node:net').Socket.prototype.connect=function(){return blocked('network socket');};
globalThis.fetch=async()=>blocked('network fetch');
const cp=require('node:child_process');
function allowed(file,args){
 const base=path.basename(String(file)).toLowerCase();
 if(base==='git'||base==='git.exe'){
   const a=Array.isArray(args)?args:[]; let i=0; if(a[0]==='-C')i=2; while(a[i]==='-c'&&/^(?:core\.safecrlf|core\.autocrlf)=(?:true|false)$/.test(String(a[i+1])))i+=2;
   const scopedCopyGrep=a[i]==='grep'&&a[i+1]==='-n'&&a[i+2]==='-E'&&a[i+3]==='[Ee]very (new )?account (starts free|gets|receives|starts with (the free|a Creator) trial)'&&JSON.stringify(a.slice(i+4))===JSON.stringify(['--','app','lib','components']);
   return scopedCopyGrep||['show','log','diff','status','rev-parse','merge-base','ls-files','ls-tree','cat-file','diff-tree','hash-object'].includes(a[i]);
 }
 return ['node','node.exe','ffprobe','ffprobe.exe'].includes(base);
}
for(const name of ['execFile','execFileSync','spawn','spawnSync']){ const original=cp[name]; cp[name]=function(file,args,...rest){if(!allowed(file,args)) return blocked('child command ' + path.basename(String(file)));return original.call(this,file,args,...rest);};}
for(const name of ['exec','execSync']){ const original=cp[name];cp[name]=function(command,...args){ const text=String(command),quotedNode='"'+process.execPath+'" '; const safeGit=/^git\s+(?:show|log|diff|status|rev-parse|merge-base|ls-files|cat-file|diff-tree|hash-object)\b/.test(text); const safeLocalTsc=text.startsWith(quotedNode)&&/^"[^"]+[\\/]node_modules[\\/]typescript[\\/]bin[\\/]tsc"\s/.test(text.slice(quotedNode.length)); if((!safeGit&&!safeLocalTsc)||/[;&|`$><\r\n]/.test(text))return blocked('shell command'); return original.call(this,command,...args);};}
syncBuiltinESMExports();
