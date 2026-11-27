import { publicCreateCtaHref } from '@/lib/create/entry'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CITATION_FILM_RELEASE } from '@/lib/growth/citationFilmRelease'
import { citationIdeaVisible } from '@/lib/growth/citationIdeaAccess'
import { buildAuthenticatedCreationRedirect, CREATION_HANDOFF_PROMPT_MAX_CHARS } from '@/lib/creationHandoff'
import { destinoDaIdeia } from '@/lib/growth/ideiaPousaNoStudio'
export const dynamic = 'force-dynamic'
const CAMPAIGNS = new Set(['push60_free_ai_shorts_generator','starter_shorts_pay','push77_short_cost_calculator','starter_reels_pay','starter_best_generators','starter_state_of_ai_shorts','push22_script_generator'])
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' }
export async function GET(request: Request) {
 const fail = (status: number) => NextResponse.json({ available: false }, { status, headers: HEADERS })
 if (CITATION_FILM_RELEASE === 'off') return fail(404)
 const params = new URL(request.url).searchParams
 const prompt = (params.get('prompt') ?? '').replace(/\r\n/g, '\n').trim()
 const campaign = params.get('intent_campaign') ?? ''
 const createIntent = params.get('create_intent'), scriptMode = params.get('script_mode')
 if (prompt.length < 3 || prompt.length > CREATION_HANDOFF_PROMPT_MAX_CHARS || !CAMPAIGNS.has(campaign) ||
     (createIntent !== 'fast' && createIntent !== 'trial_best') || (scriptMode !== 'ai' && scriptMode !== 'verbatim') ||
     params.has('duration') || params.has('language')) return fail(400)
 try {
  const { data: { user }, error } = await createClient().auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') return fail(503)
  if (CITATION_FILM_RELEASE === 'internal' && !citationIdeaVisible(user, 'internal')) return fail(404)
  const canonical = buildAuthenticatedCreationRedirect({ prompt, campaign, createIntent, scriptMode })
  if (!canonical) return fail(400)
  const target = new URL(user ? destinoDaIdeia(canonical) : '/signup', request.url)
  if (!user) {
   target.search = new URLSearchParams({ prompt, create_intent: createIntent, intent_campaign: campaign, script_mode: scriptMode, redirect: canonical }).toString()
   for (const key of ['utm_source','utm_medium','utm_campaign']) {
    const value = params.get(key)
    if (value && /^[A-Za-z0-9._~-]{1,100}$/.test(value)) target.searchParams.set(key, value)
   }
  }
  const editorParams = new URLSearchParams({ prompt, intent_campaign: campaign, script_mode: scriptMode })
  for (const key of ['utm_source','utm_medium','utm_campaign']) {
    const value = params.get(key)
    if (value && /^[A-Za-z0-9._~-]{1,100}$/.test(value)) editorParams.set(key, value)
  }
  const editor = publicCreateCtaHref('/studio?' + editorParams)
  const response = NextResponse.redirect(editor.startsWith('/create/film?') ? new URL(editor, request.url) : target, 303)
  for (const [key,value] of Object.entries(HEADERS)) response.headers.set(key,value)
  return response
 } catch { return fail(503) }
}
