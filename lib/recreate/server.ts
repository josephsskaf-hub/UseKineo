import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { recreateVisible } from './access'
import { submitDepsFor, type ClipAccount } from '@/lib/clips/clipServer'
import { RECREATE_ASSETS, type RecreateFormat } from './formats'
import { RECREATE_MODEL } from './generation'
import { catalogoNoSeedance25, SEEDANCE25_MODEL } from './seuVideo' // KINEO-RECREATE-SEU-VIDEO-1311 Entrega C
import { comEndUserDaFal } from './falEndUser' // KINEO-SEEDANCE-END-USER-1311
import { enginePaused } from '@/lib/engineLaunch'
import type { ClipEngineAccess } from '@/lib/clips/clipCatalog'
import type { SupabaseClient } from '@supabase/supabase-js'

export const RECREATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
export function recreateEngineAccess(): ClipEngineAccess {
  // Recreate has its own approved credit tariff, independent of the old H3 film's Studio-plan gate.
  return enginePaused('h3') === null ? { ok: true } : { ok: false, reason: 'paused', status: 409 }
}
export async function recreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user: user && recreateVisible(user.email) ? user : null }
}

export function recreateSubmitDeps(admin: SupabaseClient, userSupabase: SupabaseClient, account: ClipAccount, format: RecreateFormat) {
  const deps = submitDepsFor({ admin, userSupabase, account })
  const submit = comEndUserDaFal(deps.submit, account.userId) // KINEO-SEEDANCE-END-USER-1311 — era: deps.submit (os 3 do catálogo no Seedance 2.5 saem com end_user_id)
  return { ...deps, engineAccess: (engine: Parameters<typeof deps.engineAccess>[0]) => format.type === 'swap' && engine === 'h3' ? recreateEngineAccess() : deps.engineAccess(engine), submit: async (model: string, input: Record<string, unknown>) => {
    const seedance = model === SEEDANCE25_MODEL && catalogoNoSeedance25(format.id) // KINEO-RECREATE-SEU-VIDEO-1311 Entrega C
    if (model !== RECREATE_MODEL && !seedance) return submit(model, input) // KINEO-RECREATE-SEU-VIDEO-1311 — era: if (model !== RECREATE_MODEL) return submit(model, input)
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
      return submit(model, seedance ? { ...input, video_urls: [data.publicUrl] } : { ...input, video_url: data.publicUrl }) // KINEO-RECREATE-SEU-VIDEO-1311 — era: { ...input, video_url: data.publicUrl }
    } catch {
      return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    }
  } }
}
