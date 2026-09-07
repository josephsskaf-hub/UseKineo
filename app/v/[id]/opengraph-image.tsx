import { ImageResponse } from 'next/og'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { publicSurfaceAllowsRow } from '@/lib/publicSurfacePolicy'
import { resolvePublicVideoTitle } from '@/lib/publicVideos'

// #462 — dynamically generated OG preview image for /v/[id]. The static
// og-image.png fallback didn't exist, so WhatsApp/Twitter showed no card at all.
// This route ALWAYS produces a valid 1200x630 PNG (branded card + the video's
// hook as the headline), so every shared video link renders a rich preview.
//
// ═══ KINEO-CONSENTIMENTO-POR-LINHA-2026-09-07 ═══════════════════════════════
// O portão desta rota era GLOBAL: um `notFound()` incondicional sob a trava
// CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED, antes de qualquer leitura. (A string
// exata não é citada aqui: dois guardiões afirmam a ausência dela.) Certo em
// 27/08, quando
// não existia campo de consentimento. Errado desde o #27 (06/09): o dono passou
// a publicar UM filme com `published_at`, a página /v/<id> passou a responder
// 200 — e esta capa continuava 404 de 0 bytes. Todo link que o dono
// compartilhasse no WhatsApp/X/Instagram renderizava cartão em branco, porque o
// `og:image` da própria página aponta para cá.
//
// O portão passa a ser POR LINHA, com o mesmo helper que decide a superfície
// inteira: `publicSurfaceAllowsRow(published_at)`. A trava global continua
// fechada. Uma linha sem carimbo continua 404 exatamente como antes. Com a
// trava em `true`, tudo volta a ser permitido como era.
//
// FALHA FECHADA em todo ramo: id inválido, sem credenciais, erro de leitura,
// linha ausente ou sem carimbo → `notFound()`. Antes, sem credenciais a rota
// devolvia um título genérico; para um PORTÃO isso não serve — sem leitura
// não há permissão. O `published_at` vem na MESMA consulta do título (uma ida
// ao banco só), e não é renderizado em lugar nenhum.
export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'A viral Short made with Kineo'

/** Mesmo regex de `lib/publicVideos.ts`: nada que não seja UUID toca o banco. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type OgRow = { title: string; publishedAt: string | null }

/**
 * Lê título/tópico E o carimbo de consentimento numa única consulta. Devolve
 * `null` em QUALQUER falha (credencial, leitura, linha ausente) — o chamador
 * trata `null` como "sem permissão", nunca como "título genérico".
 */
async function getRow(id: string): Promise<OgRow | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const admin = createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin
      .from('videos')
      .select('title, topic, published_at')
      .eq('id', id)
      .single()
    if (error || !data) return null
    // Use the same subject recovery as the public page. This route has its own
    // narrow query, so relying on `PublicVideo.title` alone would still let a
    // legacy series instruction leak into the social preview bitmap.
    const rawTitle = (data?.title ?? '').toString()
    const rawTopic = (data?.topic ?? '').toString()
    const raw = resolvePublicVideoTitle(rawTitle, rawTopic, rawTitle || rawTopic).title
    const line =
      raw
        .split('\n')
        .map((s) => s.replace(/^#+\s*/, '').trim())
        .filter(Boolean)[0] ?? ''
    const publishedAt = (data as { published_at?: string | null }).published_at ?? null
    return { title: line.slice(0, 110) || 'AI YouTube Short', publishedAt }
  } catch {
    return null
  }
}

export default async function OgImage({ params }: { params: { id: string } }) {
  // Portão por linha (ver cabeçalho). Qualquer ramo sem leitura confirmada
  // termina em 404 — nunca em capa genérica.
  if (!UUID.test(params.id)) notFound()
  const row = await getRow(params.id)
  if (!row) notFound()
  if (!publicSurfaceAllowsRow(row.publishedAt)) notFound()
  const title = row.title
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#000',
          padding: '64px 70px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', color: '#2997ff', fontSize: 40, fontWeight: 800 }}>
          Kineo
        </div>
        <div style={{ display: 'flex', color: '#F1F5F9', fontSize: 60, fontWeight: 800, lineHeight: 1.18 }}>
          {title}
        </div>
        <div style={{ display: 'flex', color: '#86868b', fontSize: 32, fontWeight: 600 }}>
          Made in a few minutes with AI — make your own free
        </div>
      </div>
    ),
    { ...size },
  )
}
