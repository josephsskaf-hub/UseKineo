// Offline query preparation only: no credentials, network or database writes.
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
function iso(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Use a valid ISO timestamp');return value}
export function prepareCitationQuery({kind,template,cut,liveFrom,exact,patterns}) {
 if(!['thirty','weekly','experiment'].includes(kind))throw Error('Unknown measurement kind')
 const at=iso(cut)
 let sql=template.replace('internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id)',internalMeasurementCte(exact,patterns))
 if(kind==='experiment')sql=sql.replaceAll(':observed_cut',quote(at)).replaceAll(':live_from',liveFrom?quote(iso(liveFrom)):'NULL')
 else if(kind==='thirty')sql=sql.replace(/SELECT '[^']+'::timestamptz cut/,'SELECT '+quote(at)+'::timestamptz cut')
 else sql=sql.replaceAll('statement_timestamp()',quote(at)+'::timestamptz')
 if(/:internal_profile_ids|:observed_cut|:live_from/.test(sql))throw Error('Unbound query parameter')
 if(!sql.startsWith('WITH ')||/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|COPY|GRANT|REVOKE|TRUNCATE|MERGE)\b/i.test(sql))throw Error('Expected a SELECT-only query')
 return sql
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={}
 if(args.includes('--help')){console.log('Offline only. --kind thirty|weekly|experiment --cut ISO --live-from ISO(optional) --out C:/kineo-wt/<private-file.sql>');process.exit(0)}
 for(let i=0;i<args.length;i+=2){if(!['--kind','--cut','--live-from','--out'].includes(args[i])||!args[i+1])throw Error('Invalid arguments; use --help');options[args[i].slice(2)]=args[i+1]}
 const file={thirty:'ORIGEM-PAGINA-30D.sql',weekly:'SEMANAL.sql',experiment:'ANTES-DEPOIS.sql'}[options.kind]
 if(!file||!options.out)throw Error('Kind and private output file are required')
 const output=path.resolve(options.out),allowed=path.resolve('C:/kineo-wt')+path.sep
 if(!output.toLowerCase().startsWith(allowed.toLowerCase()))throw Error('Output must stay in C:/kineo-wt')
 const canonical=offlineModules()('lib/internalAccounts.ts')
 const sql=prepareCitationQuery({kind:options.kind,template:fs.readFileSync(path.join(root,'docs/citacoes-tarde-2411',file),'utf8'),cut:options.cut||new Date().toISOString(),liveFrom:options['live-from'],exact:canonical.INTERNAL_EXACT_EMAILS,patterns:canonical.INTERNAL_LIKE_PATTERNS})
 if(fs.existsSync(output))throw Error('Output already exists; preserve the receipt and choose a new filename')
 fs.writeFileSync(output,sql,{encoding:'utf8',flag:'wx'})
 console.log('Prepared SELECT-only SQL at '+output+'; no database call and no addresses printed.')
}
