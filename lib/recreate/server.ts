import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { recreateVisible } from './access'
import { clipsAdmin, submitDepsFor, type ClipAccount } from '@/lib/clips/clipServer'
import { RECREATE_ASSETS, type RecreateFormat } from './formats'
import { RECREATE_MODEL } from './generation'
import { enginePaused } from '@/lib/engineLaunch'
import type { ClipEngineAccess } from '@/lib/clips/clipCatalog'
import type { SupabaseClient } from '@supabase/supabase-js'

export const RECREATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
export function recreateEngineAccess(): ClipEngineAccess {
  // Recreate has its own approved free entitlement, independent of the old H3 film's Studio-plan gate.
  return enginePaused('h3') === null ? { ok: true } : { ok: false, reason: 'paused', status: 409 }
}
export async function recreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user: user && recreateVisible(user.email) ? user : null }
}

export function recreateSubmitDeps(admin: SupabaseClient, userSupabase: SupabaseClient, account: ClipAccount, format: RecreateFormat) {
  const deps = submitDepsFor({ admin, userSupabase, account })
  const submit = deps.submit
  return { ...deps, engineAccess: (engine: Parameters<typeof deps.engineAccess>[0]) => format.type === 'swap' && engine === 'h3' ? recreateEngineAccess() : deps.engineAccess(engine), submit: async (model: string, input: Record<string, unknown>) => {
    if (model !== RECREATE_MODEL) return submit(model, input)
    // Source is private in the repo. Publish only this approved HOUSE file for the provider, after validation/moderation.
    // Never fetch a reference URL or video supplied by the browser.
    const key = format.preview.split('/').pop() as keyof typeof RECREATE_ASSETS
    const asset = RECREATE_ASSETS[key]
    if (!asset || asset.contentType !== 'video/mp4') return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    try {
      const bytes = await readFile(path.join(process.cwd(), 'lib/recreate/assets', asset.file))
      const storagePath = `recreate-sources/v1/${asset.file}`
      const { error } = await admin.storage.from('renders').upload(storagePath, bytes, { contentType: 'video/mp4', upsert: true })
      if (error) return { ok: false as const, ambiguous: false, error: 'Source storage unavailable' }
      const { data } = admin.storage.from('renders').getPublicUrl(storagePath)
      if (!data.publicUrl) return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
      return submit(model, { ...input, video_url: data.publicUrl })
    } catch {
      return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    }
  } }
}

export async function freeRecreateAvailable(admin: ReturnType<typeof clipsAdmin>, userId: string): Promise<boolean | null> {
  if (!admin) return null
  const { count, error } = await admin.from('clips').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('model', RECREATE_MODEL).eq('credits', 0).or('status.neq.failed,failure_reason.eq.submit_ambiguous')
  return error ? null : count === 0
}
