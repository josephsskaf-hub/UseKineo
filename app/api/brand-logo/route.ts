// KINEO-LOGO-DA-MARCA-2026-10-01 — o logo da empresa do cliente, gravado no canto de todo filme (lib/brandLogo.ts).
// GET devolve o logo atual · POST (multipart: file + rights=true) grava/substitui · DELETE tira dos próximos filmes.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BRAND_LOGO_MAX_BYTES, BRAND_LOGO_TYPES, findBrandLogoUrl, removeBrandLogo, saveBrandLogo } from '@/lib/brandLogo'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'

export const dynamic = 'force-dynamic'

async function signedInUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await signedInUserId()
  if (!userId) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  return NextResponse.json({ url: await findBrandLogoUrl(userId) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const userId = await signedInUserId()
    if (!userId) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
    }
    if ((form.get('rights') ?? '').toString() !== 'true') {
      return NextResponse.json({ error: 'Please confirm you have the right to use this logo.' }, { status: 400 })
    }
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'A PNG or JPG logo is required.' }, { status: 400 })
    const mime = (file.type || '').toLowerCase()
    if (!BRAND_LOGO_TYPES[mime]) return NextResponse.json({ error: 'Only PNG or JPG logos are supported.' }, { status: 400 })
    if (file.size <= 0) return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    if (file.size > BRAND_LOGO_MAX_BYTES) return NextResponse.json({ error: 'Logo is too large — max 5 MB.' }, { status: 400 })

    const url = await saveBrandLogo(userId, new Uint8Array(await file.arrayBuffer()), mime)
    const safety = await moderateContent({ surface: 'avatar', stage: 'upload', userId, imageUrls: [url], meta: { purpose: 'brand_logo', size_bytes: file.size } })
    if (!safety.ok) {
      await removeBrandLogo(userId).catch(() => undefined)
      return NextResponse.json(
        { error: moderationRefusalMessage(safety.reason, 'upload'), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` },
        { status: moderationRefusalStatus(safety.reason) },
      )
    }
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[brand-logo] upload failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Logo upload failed. Please try again.' }, { status: 500 })
  }
}

export async function DELETE() {
  const userId = await signedInUserId()
  if (!userId) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  try {
    await removeBrandLogo(userId)
    return NextResponse.json({ url: null })
  } catch {
    return NextResponse.json({ error: 'Could not remove the logo. Please try again.' }, { status: 500 })
  }
}
