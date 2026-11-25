import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CITATION_TOOLS_RELEASE } from '@/lib/growth/citationPagesRelease'
import { citationPageVisible } from '@/lib/growth/citationPagesAccess'
import { getCitationTool } from '@/lib/seo/citationTools2411'
import { buildAuthenticatedCreationRedirect, CREATION_HANDOFF_PROMPT_MAX_CHARS } from '@/lib/creationHandoff'
import { destinoDaIdeia } from '@/lib/growth/ideiaPousaNoStudio'
export const dynamic = 'force-dynamic'
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' }
export async function GET(request: Request) {
 const fail=(status:number)=>NextResponse.json({available:false},{status,headers:HEADERS})
 if(CITATION_TOOLS_RELEASE==='off')return fail(404)
 const params=new URL(request.url).searchParams
 const tool=getCitationTool(params.get('slug')??'')
 const prompt=(params.get('prompt')??'').replace(/\r\n/g,'\n').trim()
 const scriptMode=params.get('script_mode')
 if(!tool || prompt.length<3 || prompt.length>CREATION_HANDOFF_PROMPT_MAX_CHARS || (scriptMode!=='ai' && scriptMode!=='verbatim'))return fail(400)
 try{
  const {data:{user},error}=await createClient().auth.getUser()
  if(error && error.name!=='AuthSessionMissingError')return fail(503)
  if(CITATION_TOOLS_RELEASE==='internal' && !citationPageVisible(user,'internal'))return fail(404)
  const campaign='intent_'+tool.slug
  const canonical=buildAuthenticatedCreationRedirect({prompt,campaign,createIntent:'trial_best',scriptMode,language:tool.language})
  if(!canonical)return fail(400)
  const target=new URL(user?destinoDaIdeia(canonical):'/signup',request.url)
  if(!user)target.search=new URLSearchParams({prompt,create_intent:'trial_best',intent_campaign:campaign,script_mode:scriptMode,language:tool.language,redirect:canonical}).toString()
  const response=NextResponse.redirect(target,303)
  for(const [key,value] of Object.entries(HEADERS))response.headers.set(key,value)
  return response
 }catch{return fail(503)}
}
