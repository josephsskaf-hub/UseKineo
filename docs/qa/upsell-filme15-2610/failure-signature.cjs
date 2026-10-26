const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const directory=__dirname;
function normalize(text,root){return text.replace(/\x1b\[[0-9;]*m/g,'').replace(/\r\n/g,'\n').split(root).join('<repo>').split(root.replace(/\//g,'\\')).join('<repo>').replace(/[A-Za-z]:[\\/](?:Users[\\/][^\\/]+[\\/]AppData[\\/]Local[\\/]Temp|tmp)[\\/][^\\/\s"']+/g,'<temp>');}
function describe(result,run){
 let raw='';if(result.log){const log=path.join(directory,run.label,result.log);if(fs.existsSync(log)){const buffer=fs.readFileSync(log);raw=result.log.endsWith('.gz')?zlib.gunzipSync(buffer).toString():buffer.toString();}}
 const text=normalize(raw,run.root),lines=text.split('\n');
 const errors=lines.filter(line=>/^\s*(?:[\w.]*Error(?:\s*\[[^\]]+\])?:|[^\n]+\.tsx?\(\d+,\d+\): error TS\d+:|XX\s+|Missing [A-Z_]+ env var\.)/.test(line)).map(line=>line.trim());
 const failures=(result.failures??[]).map(line=>normalize(line,run.root)).filter(line=>!/^const blocked =/.test(line));
 const reasons=[...new Set([...failures,...errors])];
 const kind=result.status===0?'pass':result.spawnError?'spawn-error':result.timedOut?'outer-timeout':/^Missing [A-Z_]+ env var\./m.test(text)?'missing-required-environment':/KINEO_OFFLINE_BLOCKED/.test(text)?'offline-boundary':/heap out of memory|FATAL ERROR|Allocation failed/i.test(text)?'heap-oom':/ENOENT/.test(text)?'missing-file':/ERR_MODULE_NOT_FOUND|Cannot find module/.test(text)?'module-resolution':/Script execution timed out/.test(text)?'vm-timeout':'assertion-or-runtime';
 return{file:result.file,status:result.status,timedOut:result.timedOut??false,kind,ms:result.ms??null,reasons,unclassifiedTail:result.status!==0&&!reasons.length&&!result.timedOut?lines.slice(-35).join('\n'):null,log:result.log??null};
}
module.exports={describe,normalize};
