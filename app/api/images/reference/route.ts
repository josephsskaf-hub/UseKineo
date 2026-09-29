// KINEO-IMAGENS-FOTO-REFERENCIA-2026-09-29 — upload da foto de referência do Nano Banana Pro (/images).
// POST multipart/form-data: `file` (JPG/PNG/WEBP ≤ 10 MB; o navegador já reduz para ≤ 2048 px) + `rights` ("true").
//
// Ordem (falha fechada em cada passo):
//   1. login;
//   2. consentimento: sem rights=true, 400 — a caixa da tela não basta, o servidor confere (e a rota de gerar confere de novo);
//   3. tipo REAL pelos bytes (não pelo que o navegador declara) e tamanho;
//   4. moderação da foto ANTES de ela existir no bucket público (vai como data URL); barrada = 422, a foto vai só para a
//      quarentena privada (prova) e o navegador não recebe caminho nenhum;
//   5. aprovada: renders/images/<uid>/refs/<uuid>.<ext> — a pasta da PRÓPRIA conta. Devolve só o CAMINHO; a rota de
//      gerar aceita apenas caminhos desta pasta desta conta (lib/imageReference.ts isOwnReferencePath).
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { quarantinePath } from '@/lib/safety/quarantine'
import { quarantineReferencePhoto, storeReferencePhoto } from '@/lib/imageStore'
import { REFERENCE_MAX_BYTES, referencePathFor, sniffReferenceMime } from '@/lib/imageReference'
import { writeServerEvent } from '@/lib/serverEvents'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
    }

    if ((form.get('rights') ?? '').toString() !== 'true') {
      return NextResponse.json({ error: 'Please confirm you have permission from the person in the photo.', code: 'reference_consent' }, { status: 400 })
    }

    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'A JPG, PNG or WEBP photo is required.' }, { status: 400 })
    if (file.size > REFERENCE_MAX_BYTES) return NextResponse.json({ error: 'Photo is too large — max 10 MB.' }, { status: 400 })
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.length === 0) return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    const mime = sniffReferenceMime(bytes.slice(0, 16))
    if (!mime) return NextResponse.json({ error: 'Only JPG, PNG or WEBP photos.' }, { status: 400 })

    const path = referencePathFor(user.id, randomUUID(), mime)
    const qPath = quarantinePath('images-reference', 'renders', path)
    const dataUrl = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
    const safety = await moderateContent({ surface: 'images_reference', stage: 'upload', userId: user.id, imageUrls: [dataUrl], meta: { purpose: 'image_reference', size_bytes: bytes.length, quarantine_path: qPath } })
    if (!safety.ok) {
      if (safety.reason === 'blocked') await quarantineReferencePhoto({ quarantinePath: qPath, bytes, contentType: mime }).catch(() => false)
      return NextResponse.json(
        { error: moderationRefusalMessage(safety.reason, 'upload'), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` },
        { status: moderationRefusalStatus(safety.reason) },
      )
    }

    const stored = await storeReferencePhoto({ path, bytes, contentType: mime })
    if (!stored) return NextResponse.json({ error: 'Photo upload failed. Please try again.' }, { status: 502 })
    await writeServerEvent({ name: 'images_reference_uploaded', userId: user.id, path: '/images', metadata: { mime, size_kb: Math.round(bytes.length / 1024) } }).catch(() => false)
    return NextResponse.json({ path: stored })
  } catch (err) {
    console.error('[images/reference] unexpected error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Photo upload failed. Please try again.' }, { status: 500 })
  }
}
