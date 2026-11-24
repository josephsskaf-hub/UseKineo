'use client'
import { useState } from 'react'
import type { NarrationLanguage } from '@/lib/textLanguage'
import { CREATION_HANDOFF_PROMPT_MAX_CHARS } from '@/lib/creationHandoff'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'

export default function CitationToolForm({ slug, language, examplePrompt }: { slug: string; language: NarrationLanguage; examplePrompt: string }) {
 const [text,setText]=useState('')
 const [mode,setMode]=useState<'ai'|'verbatim'>('ai')
 const campaign='intent_'+slug
 const length=text.trim().length
 const valid=length>=3 && length<=CREATION_HANDOFF_PROMPT_MAX_CHARS
 return <form className="ct-tool-form" action="/api/citations/tool-entry" method="get" data-citation-tool-form={slug}
  onSubmit={event=>{if(!valid){event.preventDefault();return} rememberSignupCampaign(campaign);void trackEvent('organic_topic_submitted',{source:campaign,placement:'citation_tool_hero',topic_length:length,language,script_mode:mode,variant:'citation_tools_2411'})}}>
  <fieldset><legend>Start with</legend><label><input type="radio" name="script_mode" value="ai" checked={mode==='ai'} onChange={()=>setMode('ai')}/> Write from my idea</label><label><input type="radio" name="script_mode" value="verbatim" checked={mode==='verbatim'} onChange={()=>setMode('verbatim')}/> Use my script as is</label></fieldset>
  <label htmlFor={'tool-'+slug}>{mode==='ai'?"What's your film about?":'Paste your narration script'}</label>
  <textarea id={'tool-'+slug} name="prompt" dir="auto" rows={4} required minLength={3} value={text} onChange={event=>setText(event.target.value)} placeholder={mode==='ai'?'Describe your story or topic':'Paste the words the narrator should say'} aria-describedby={'tool-limit-'+slug}/>
  <p id={'tool-limit-'+slug} role={length>CREATION_HANDOFF_PROMPT_MAX_CHARS?'alert':undefined}>{length} / {CREATION_HANDOFF_PROMPT_MAX_CHARS} characters · narration: {language.toUpperCase()}</p>
  <input type="hidden" name="slug" value={slug}/>
  <button type="submit" disabled={!valid}>Review my film in Studio →</button>
  <button className="ct-example" type="button" onClick={()=>setText(examplePrompt)}>Try this original example</button>
  <p>Your text and mode travel through signup. Review script, language, model, length and credits before generating.</p>
 </form>
}
