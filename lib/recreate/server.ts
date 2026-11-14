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
import { MOVIMENTO_CENA_MODEL, movimentoGuiaPath } from './movimento' // KINEO-RECREATE-MOVIMENTO-1411
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

/** KINEO-RECREATE-MOVIMENTO-1411 — publica UM arquivo aprovado da CASA (lib/recreate/assets) no caminho fixo das fontes, para o fornecedor. Nunca um
 *  arquivo ou URL do navegador. Devolve a URL pública NOSSA, ou null. (Era o miolo do submit da troca; o movimento sobe o guia pelo mesmo caminho.) */
async function publicarFonteDaCasa(admin: SupabaseClient, key: keyof typeof RECREATE_ASSETS, storagePath?: string): Promise<string | null> {
  const asset = RECREATE_ASSETS[key]
  if (!asset || asset.contentType !== 'video/mp4') return null
  try {
    const bytes = await readFile(path.join(process.cwd(), 'lib/recreate/assets', asset.file))
    const destino = storagePath ?? `recreate-sources/v1/${asset.file}`
    const { error } = await admin.storage.from('renders').upload(destino, bytes, { contentType: 'video/mp4', upsert: true })
    if (error) return null
    const { data } = admin.storage.from('renders').getPublicUrl(destino)
    return data.publicUrl || null
  } catch {
    return null
  }
}

export function recreateSubmitDeps(admin: SupabaseClient, userSupabase: SupabaseClient, account: ClipAccount, format: RecreateFormat) {
  const deps = submitDepsFor({ admin, userSupabase, account })
  const submit = comEndUserDaFal(deps.submit, account.userId) // KINEO-SEEDANCE-END-USER-1311 — era: deps.submit (os 3 do catálogo no Seedance 2.5 saem com end_user_id)
  // KINEO-RECREATE-MOVIMENTO-1411 — o movimento tem tarifa própria do Recreate (mesma tabela da troca), independente da trava de plano do Kling 2.5:
  // a chave 'kling' da linha é só a chave do catálogo de clipes.
  const engineAccess = (engine: Parameters<typeof deps.engineAccess>[0]): ReturnType<typeof deps.engineAccess> => format.type === 'swap' && engine === 'h3' ? recreateEngineAccess() : format.type === 'motion' && engine === 'kling' ? { ok: true } : deps.engineAccess(engine)
  return { ...deps, engineAccess, submit: async (model: string, input: Record<string, unknown>) => {
    // KINEO-RECREATE-MOVIMENTO-1411 — passo 1 do movimento: ANTES de pedir a imagem, o guia NOSSO vai para o caminho fixo do bucket (o passo 2, no
    // status ou no cron, só calcula a URL: nenhuma rota de liquidação precisa do MP4 no pacote). Guia que não sobe = recusa limpa, com estorno.
    if (format.type === 'motion') {
      const destino = movimentoGuiaPath(format)
      if (model !== MOVIMENTO_CENA_MODEL || !format.guia || !destino) return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
      if (!(await publicarFonteDaCasa(admin, format.guia, destino))) return { ok: false as const, ambiguous: false, error: 'Source storage unavailable' }
      return submit(model, input)
    }
    const seedance = model === SEEDANCE25_MODEL && catalogoNoSeedance25(format.id) // KINEO-RECREATE-SEU-VIDEO-1311 Entrega C
    if (model !== RECREATE_MODEL && !seedance) return submit(model, input) // KINEO-RECREATE-SEU-VIDEO-1311 — era: if (model !== RECREATE_MODEL) return submit(model, input)
    // Source is private in the repo. Publish only this approved HOUSE file for the provider, after validation/moderation.
    // Never fetch a reference URL or video supplied by the browser.
    const key = format.preview.split('/').pop() as keyof typeof RECREATE_ASSETS
    const asset = RECREATE_ASSETS[key]
    if (!asset || asset.contentType !== 'video/mp4') return { ok: false as const, ambiguous: false, error: 'Source unavailable' }
    const publicUrl = await publicarFonteDaCasa(admin, key) // KINEO-RECREATE-MOVIMENTO-1411 — o miolo virou publicarFonteDaCasa (mesmo arquivo, mesmo caminho, mesmo bucket)
    if (!publicUrl) return { ok: false as const, ambiguous: false, error: 'Source storage unavailable' }
    return submit(model, seedance ? { ...input, video_urls: [publicUrl] } : { ...input, video_url: publicUrl }) // KINEO-RECREATE-SEU-VIDEO-1311 — era: { ...input, video_url: data.publicUrl }
  } }
}
