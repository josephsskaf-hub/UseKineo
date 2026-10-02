// KINEO-ESPACOS-2026-09-30 — montagem do vídeo "Antes → Depois" do "Espaços" (lib/spaces/spaces.ts tem o porquê).
// POST { pairs: [{ before_url, clip_url }], signature, contact } → { render_id }   (envia à Creatomate)
// GET  ?id=<render_id>                                         → { status, progress, url }  (quando pronto, copia o
//                                                                   MP4 para o NOSSO storage — URL do fornecedor expira)
// Só aceita mídia da própria conta no nosso storage (isOwnedSpaceAssetUrl). O GET só responde a quem enviou: o envio
// grava `spaces_montage_submitted` com o render_id e a conta; sem esse evento, 404. Sem crédito nesta etapa (v1 da
// casa; fotos e clipes já cobram nos endpoints de sempre).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { writeServerEvent } from '@/lib/serverEvents'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { findBrandLogoUrl, withBrandLogo } from '@/lib/brandLogo' // KINEO-NUVEM-A2-2026-10-02
import { spacesVideoLabels } from '@/lib/spaces/spacesCopy'
import {
  SPACES_BRAND_LOGO_Y,
  SPACES_DESTINATION_LABEL_MAX,
  SPACES_MULTI_MAX,
  SPACES_MULTI_MIN,
  SPACES_MULTI_PUBLIC,
  SPACES_PUBLIC,
  SPACE_CONTACT_MAX,
  SPACE_MAX_PHOTOS,
  SPACE_SIGNATURE_MAX,
  buildSpacesMontageSource,
  cleanLine,
  isOwnedSpaceAssetUrl,
  spacesVisibleFor,
  type SpacePair,
} from '@/lib/spaces/spaces'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const RENDER_ID_RE = /^[0-9a-f-]{16,64}$/i

async function gate() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: fail('unauthenticated', 401) }
  if (!spacesVisibleFor(SPACES_PUBLIC, isAdsInternalEmail(user.email))) return { error: fail('not_found', 404) }
  return { user }
}

export async function POST(req: NextRequest) {
  try {
    const g = await gate()
    if ('error' in g) return g.error
    const user = g.user
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const body = (await req.json().catch(() => null)) as { pairs?: unknown; signature?: unknown; contact?: unknown; language?: unknown; seal?: unknown } | null
    const raw = Array.isArray(body?.pairs) ? (body!.pairs as { before_url?: unknown; clip_url?: unknown; label?: unknown }[]) : []
    if (raw.length === 0 || raw.length > SPACE_MAX_PHOTOS) return fail('bad_pairs', 400)
    // KINEO-NUVEM-A5-2026-10-02 — vários destinos (rótulo por par): só com o interruptor ou conta da casa, 2 a 4 pares,
    // todos rotulados. Sem rótulo nenhum = o vídeo de sempre.
    const labels = raw.map((p) => cleanLine(p?.label, SPACES_DESTINATION_LABEL_MAX))
    const multi = labels.some(Boolean)
    if (multi) {
      if (!spacesVisibleFor(SPACES_MULTI_PUBLIC, isAdsInternalEmail(user.email))) return fail('not_found', 404)
      if (labels.some((l) => !l) || raw.length < SPACES_MULTI_MIN || raw.length > SPACES_MULTI_MAX) return fail('bad_destinations', 400)
    }
    const pairs: SpacePair[] = []
    for (const [i, p] of raw.entries()) {
      if (!isOwnedSpaceAssetUrl(p?.before_url, user.id, origin) || !isOwnedSpaceAssetUrl(p?.clip_url, user.id, origin)) return fail('not_your_media', 403)
      pairs.push({ beforeUrl: String(p.before_url), clipUrl: String(p.clip_url), ...(multi ? { label: labels[i] } : {}) })
    }
    const signature = cleanLine(body?.signature, SPACE_SIGNATURE_MAX)
    const contact = cleanLine(body?.contact, SPACE_CONTACT_MAX)
    let source: Record<string, unknown>
    try {
      // Rótulos na língua de quem gera (língua desconhecida = inglês); nota "Imagem ilustrativa" só se a pessoa marcou.
      const language = typeof body?.language === 'string' ? body.language.slice(0, 5) : 'en'
      source = buildSpacesMontageSource({ pairs, signature, contact, fontFamily: 'Montserrat', labels: spacesVideoLabels(language), showSeal: body?.seal === true })
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'bad_montage', 400)
    }
    // KINEO-NUVEM-A2-2026-10-02 — o logo da conta (se houver) entra DEPOIS de montado, como no compose; nunca lança.
    const brandLogo = await findBrandLogoUrl(user.id)
    withBrandLogo(source, brandLogo, { y: SPACES_BRAND_LOGO_Y })
    const renderId = await submitCreatomateRender(source)
    await writeServerEvent({
      name: 'spaces_montage_submitted',
      userId: user.id,
      path: '/api/spaces/montage',
      metadata: { render_id: renderId, pairs: pairs.length, multi, brand_logo: Boolean(brandLogo), signature: Boolean(signature), contact: Boolean(contact), seal: body?.seal === true, language: typeof body?.language === 'string' ? body.language.slice(0, 5) : null, seconds: source.duration },
    })
    return NextResponse.json({ render_id: renderId }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[spaces/montage POST] falhou:', e instanceof Error ? e.message : String(e))
    return fail('montage_failed', 502)
  }
}

export async function GET(req: NextRequest) {
  try {
    const g = await gate()
    if ('error' in g) return g.error
    const user = g.user
    const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
    if (!RENDER_ID_RE.test(id)) return fail('bad_id', 400)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return fail('not_configured', 500)
    const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const own = await admin
      .from('events')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'spaces_montage_submitted')
      .eq('metadata->>render_id', id)
      .limit(1)
    if (own.error) return fail('montage_failed', 502)
    if (!own.data?.length) return fail('not_found', 404)

    const st = await pollCreatomateRender(id)
    if (st.status !== 'succeeded' || !st.url) {
      return NextResponse.json({ status: st.status, progress: st.progress, url: null, error: st.error }, { headers: { 'Cache-Control': 'no-store' } })
    }
    // Pronto: cópia no nosso storage (idempotente por caminho; falhou = fica a URL do fornecedor, nunca trava a entrega).
    const saved = await persistRenderAssets({ userId: user.id, renderId: `spaces-${id}`, videoUrl: st.url, snapshotUrl: st.snapshotUrl })
    return NextResponse.json({ status: 'succeeded', progress: 1, url: saved.videoUrl, poster: saved.thumbnailUrl, seconds: saved.measuredSeconds }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[spaces/montage GET] falhou:', e instanceof Error ? e.message : String(e))
    return fail('montage_failed', 502)
  }
}
