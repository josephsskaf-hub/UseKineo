// Synthetic, SELECT-only fixtures: no customer identities or database writes.
import {prepareCaixaQuery} from '../prepare-citacoes-caixa-2411.mjs'
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
const P='/how-much-do-youtube-shorts-pay',F='/free-ai-shorts-generator',B='/best-ai-shorts-generators',R='/how-much-do-instagram-reels-pay',S='/state-of-ai-shorts-2026',W='/free-script-generator'
export function caixaFixtureQuery(template,cut) {
 const profiles=[[1,'-10 days 1 minute'],[2,'-8 days 1 minute'],[3,'-7 days 1 minute'],[4,'-6 days 1 minute'],[5,'-5 days 1 minute'],[6,'1 minute'],[7,'2 minutes'],[8,'2 minutes'],[9,'-3 days 1 minute'],[10,'21 minutes'],[11,'31 minutes'],[12,'32 minutes'],[13,'-4 days 1 minute'],[14,'-11 days 1 minute'],[25,'2 days 1 minute']]
 const events=[];let id=0
 const add=(session,delta,path,user,name='landing_session_started',meta={is_bot:false,referrer_host:'bing.com'})=>events.push([++id,session,delta,path,user,name,meta])
 add('b1','-10 days',P,null);add('b1','-10 days -1 second',P,null,'other_event',{});add('b1','-10 days 1 second',P,null,'landing_session_started',{is_bot:false,referrer_host:'chatgpt.com'});add('b1','-10 days 1 minute',P,1,'signup_completed',{})
 add('b2','-9 days',B,1)
 add('clip','-8 days',P,2,'landing_session_started',{is_bot:false,referrer_host:'google.com'})
 add('bot','-7 days',F,3,'landing_session_started',{is_bot:true,referrer_host:'chatgpt.com'})
 add('house','-6 days',F,4)
 add('unknown','-5 days',R,5,'landing_session_started',{is_bot:false})
 add('late-identity','-1 minute',P,null);add('late-identity','1 minute',P,6,'signup_completed',{})
 add('b1','2 minutes',P,7,'signed_in',{})
 add('late-profile','-2 minutes',W,8)
 add('late-film','-3 days',S,9)
 add('after','20 minutes',P,10,'landing_session_started',{is_bot:false,utm_source:'chatgpt'})
 add('ambiguous','30 minutes',F,11);add('ambiguous','32 minutes',F,12,'signed_in',{})
 add('before-film','-4 days',F,13,'landing_session_started',{is_bot:false,referrer_host:'chatgpt.com'})
 add('first-home','-11 days','/',14);add('later-pay','-10 days',P,14)
 add('normalized-youtube','-2 days',F,null,'landing_session_started',{is_bot:false,referrer_host:'youtube',utm_source:'affiliate'})
 for(let n=0;n<25;n++)add('gate-'+n,'2 days '+n+' seconds','/cheapest-ai-shorts-maker',n===0?25:null)
 const videos=[[2,'clip','-8 days 30 minutes'],[9,'cinematic_ai','2 hours'],[10,'cinematic_hollywood','2 hours'],[13,'cinematic_ai','-3 days']]
 const prefix="WITH fixture_clock AS (SELECT '2026-11-10T20:28:00Z'::timestamptz t0), profiles AS (SELECT x.id,x.email,c.t0+x.delta::interval created_at FROM (VALUES "+profiles.map(([id,delta])=>'('+id+','+q(id===4?'house@fixture.invalid':'person'+id+'@fixture.invalid')+','+q(delta)+')').join(',')+") x(id,email,delta) CROSS JOIN fixture_clock c), events AS (SELECT x.id,x.session_id,c.t0+x.delta::interval created_at,x.path,x.user_id,x.name,x.metadata FROM (VALUES "+events.map(([id,s,d,p,u,n,m])=>'('+[id,q(s),q(d),q(p),u??'NULL::integer',q(n),q(JSON.stringify(m))+'::jsonb'].join(',')+')').join(',')+") x(id,session_id,delta,path,user_id,name,metadata) CROSS JOIN fixture_clock c), videos AS (SELECT x.user_id,'completed'::text status,x.quality_mode,c.t0+x.delta::interval created_at FROM (VALUES "+videos.map(([id,mode,d])=>'('+id+','+q(mode)+','+q(d)+')').join(',')+") x(user_id,quality_mode,delta) CROSS JOIN fixture_clock c), "
 let sql=prepareCaixaQuery({template,cut,exact:['house@fixture.invalid'],patterns:[]})
 if(!sql.includes("'2026-11-24T20:28:00Z'::timestamptz live_from"))throw Error('Fixture release anchor changed')
 sql=sql.replace("'2026-11-24T20:28:00Z'::timestamptz live_from","'2026-11-10T20:28:00Z'::timestamptz live_from")
 return prefix+sql.slice('WITH '.length)
}
export function caixaMutants(template) {
 const swaps=[
 ['identity-cut','e.created_at<r.phase_cut','e.created_at<(SELECT cut FROM observed)'],
 ['signup-cut','p.created_at<l.phase_cut','p.created_at<(SELECT cut FROM observed)'],
 ['film-cut','v.created_at<a.phase_cut','v.created_at<(SELECT cut FROM observed)'],
 ['session-duplicates','SELECT DISTINCT ON(w.phase,e.session_id)','SELECT'],
 ['account-duplicates','SELECT DISTINCT ON(l.phase,p.id)','SELECT'],
 ['bot-included',"r.metadata->>'is_bot'='false' AND ",''],
 ['house-session-included',' AND NOT coalesce(u.internal,false)',''],
 ['clip-as-film',"'cinematic_omni')","'cinematic_omni','clip')"],
 ['missing-as-chatgpt',"THEN 'origem_nao_gravada'","THEN 'chatgpt_explicito'"],
 ['youtube-alias-dropped',"attested_source IN ('youtube','youtube.com'","attested_source IN ('youtube.com'"],
 ['utm-overrides-attested-referrer',"coalesce(lower(nullif(metadata->>'referrer_host','')),lower(nullif(metadata->>'utm_source','')))","coalesce(lower(nullif(metadata->>'utm_source','')),lower(nullif(metadata->>'referrer_host','')))"],
 ['page-exact4-is-success',"WHEN accounts*100>sessions*4 THEN","WHEN accounts*100>=sessions*4 THEN"],
 ['origin-exact4-is-success',"WHEN g.accounts*100>g.sessions*4 THEN","WHEN g.accounts*100>=g.sessions*4 THEN"],
 ['target-filter-too-early','AND e.session_id IS NOT NULL',"AND e.session_id IS NOT NULL AND split_part(e.path,'?',1) IN (SELECT path FROM targets)"]
 ]
 return swaps.map(([name,a,b])=>{if(template.split(a).length!==2)throw Error('Mutation anchor '+name);return{name,template:template.replace(a,b)}})
}
