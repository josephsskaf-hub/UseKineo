// Offline SELECT preparation. Reuses the canonical filter reviewed in 8c0ec7917; no network or credentials.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {offlineModules,root} from './gpt24h-offline-support.mjs'
const quote=s=>"'"+s.replaceAll("'","''")+"'"
const md5=s=>createHash('md5').update(s.toLowerCase()).digest('hex')
export function internalMeasurementCte(exact,patterns) {
 const email="lower(coalesce(email,''))"
 const conditions=exact.map(e=>"md5("+email+")="+quote(md5(e)))
 for(const p of patterns){
  if(!p.includes('@'))conditions.push(email+' LIKE '+quote(p.toLowerCase()))
  else {const parts=p.toLowerCase().split('@');if(parts.length!==2||/[%_]/.test(parts[1]))throw Error('Unsupported canonical domain pattern; review before measuring')
   conditions.push("(split_part("+email+",'@',1) LIKE "+quote(parts[0])+" AND md5(split_part("+email+",'@',2))="+quote(md5(parts[1]))+")")}
 }
 if(!conditions.length)throw Error('Canonical internal filters required')
 return 'internal_profiles AS (SELECT id FROM profiles WHERE '+conditions.join(' OR ')+')'
}
export function prepareCaixaQuery({template,cut,exact,patterns}) {
 if(typeof cut!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(cut)||!Number.isFinite(Date.parse(cut)))throw Error('Valid ISO cut required')
 let sql=template.replace('internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id)',internalMeasurementCte(exact,patterns)).replaceAll(':observed_cut',quote(cut))
 if(/:internal_profile_ids|:observed_cut/.test(sql)||!sql.startsWith('WITH ')||/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|COPY|GRANT|REVOKE|TRUNCATE|MERGE)\b/i.test(sql))throw Error('Expected bound SELECT-only query')
 return sql
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2),opts={}
 for(let i=0;i<args.length;i+=2){if(!['--cut','--out'].includes(args[i])||!args[i+1])throw Error('Use --cut ISO --out C:/kineo-wt/file.sql');opts[args[i].slice(2)]=args[i+1]}
 if(!opts.out)throw Error('Output required')
 const out=path.resolve(opts.out),parent=fs.realpathSync(path.dirname(out)),allowed=path.resolve('C:/kineo-wt')+path.sep
 if(!parent.toLowerCase().startsWith(allowed.toLowerCase()))throw Error('Output must resolve within C:/kineo-wt')
 const canonical=offlineModules()('lib/internalAccounts.ts')
 const sql=prepareCaixaQuery({template:fs.readFileSync(path.join(root,'docs/queries/CITACOES-CAIXAS-ANTES-DEPOIS-2411.sql'),'utf8').replace(/^\uFEFF/,''),cut:opts.cut,exact:canonical.INTERNAL_EXACT_EMAILS,patterns:canonical.INTERNAL_LIKE_PATTERNS})
 fs.writeFileSync(out,sql,{encoding:'utf8',flag:'wx'})
 console.log('Prepared SELECT-only SQL; no database call or addresses printed.')
}
