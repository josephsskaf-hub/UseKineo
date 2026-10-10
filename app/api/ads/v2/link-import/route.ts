// KINEO-ADS-1FOTO-LINK-2026-10-10 — "Or paste your product link" do MODO SIMPLES do /ads/v2 (fundador, 10/10: "tudo sim").
// A /business e os anúncios pagos prometem "Paste a link, get an ad"; só o modo completo tinha o campo, e só lia TEXTO.
//
// POST { url } → lê a página do produto (lib/ads/v2Link.ts adsV2LinkImport: só host público, antes e depois do DNS, a cada
// salto; tempo e bytes limitados), modera o texto, baixa até 3 fotos do produto (JPG/PNG pelos bytes) e guarda cada uma na
// pasta da PRÓPRIA conta (user-footage/<uid>/…, a mesma porta do upload), com moderação de imagem (barrada vai para a
// quarentena, como no /api/footage) e cota. Devolve a frase sugerida, o host e as fotos {footage_id, url}: a tela baixa
// cada uma do NOSSO bucket, recorta em 9:16 e sobe pelo caminho de sempre (/api/footage), então o /plan confere dono e tipo
// como em qualquer foto.
// KINEO-EQUIPE-BUSINESS-2026-10-10 — membro da equipe Business: a pasta, a cota e o teto do dia são os do DONO do workspace (uid).
//
// O QUE ESTA ROTA NUNCA FAZ: criar ou mexer em pedido (ads_v2_orders), cobrar crédito, chamar a fal. Link sem foto não
// vira pedido: o /plan continua exigindo pelo menos 1 foto (ADS_V2_CONTRACT_MIN_PHOTOS).
//
// Portas (as mesmas das outras rotas /api/ads/v2/…): login; adsGate 'ok' OU a amostra grátis aberta (adsSampleOpen — a conta free
// sobe fotos da amostra pelo /api/footage purpose 'ads'; aqui é a mesma regra, com o teto de bytes da amostra); adsV2Visible.
// Teto diário por conta no evento ads_link_read (o mesmo do v1: as duas portas dividem um teto), MENOR para a amostra;
// toda tentativa (ok ou não) grava o evento, então link que falha também conta.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { quarantineObject } from '@/lib/safety/quarantine'
import { adsGate, adsSampleOpen, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { ADS_V2_LINK_MAX_CHARS, sanitizeLinkImportBody } from '@/lib/ads/v2Contract'
import { adsV2LinkImport } from '@/lib/ads/v2Link'
import { ADS_V2_LINK_EVENT, adsV2LinkDailyCap } from '@/lib/ads/v2LinkImport'
import { ADS_SAMPLE_FOOTAGE_MAX_BYTES } from '@/lib/ads/sample'
import { ensureFootageBucket, FOOTAGE_PUBLIC_PREFIX, FOOTAGE_QUOTA_PAID, totalFootageBytes, USER_FOOTAGE_BUCKET } from '@/lib/userFootage'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const PATH = '/api/ads/v2/link-import'

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
    const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, uid, reason)
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: PATH, metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizeLinkImportBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)

    // Teto diário ANTES da rede (a amostra tem o menor). Leitura que falha = fechado.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const capRead = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('name', ADS_V2_LINK_EVENT).gte('created_at', since)
    if (capRead.error || typeof capRead.count !== 'number' || capRead.count >= adsV2LinkDailyCap(sample)) return v2Fail('daily_limit', 429)
    const logRead = (metadata: Record<string, unknown>) =>
      writeServerEvent({ name: ADS_V2_LINK_EVENT, userId: uid, path: PATH, metadata: { v2: true, mode: 'simple', sample, ms: Date.now() - started, ...metadata } })

    // Cota: a da amostra (fotos só, poucas) ou a de quem paga — o que sobra é o teto de bytes das fotos baixadas.
    const quota = gate === 'ok' ? FOOTAGE_QUOTA_PAID : ADS_SAMPLE_FOOTAGE_MAX_BYTES
    const room = Math.max(0, quota - (await totalFootageBytes(uid)))

    const read = await adsV2LinkImport(parsed.value.url, { roomBytes: room }).catch(() => null)
    if (!read) {
      await logRead({ ok: false, why: 'page_unreachable' })
      return v2Fail('link_unreachable', 422)
    }

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: read.text, meta: { mode: 'link_import', host: read.host } })
    if (!safety.ok) {
      await logRead({ ok: false, why: 'moderation', host: read.host })
      return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) })
    }

    // As fotos → pasta da conta, com moderação; barrada vai para a quarentena e não vira linha (nenhum plano a alcança).
    const images: { footage_id: string; url: string }[] = []
    let skipped = read.skipped
    let blocked = 0
    if (read.images.length) await ensureFootageBucket(admin)
    for (let i = 0; i < read.images.length; i++) {
      const im = read.images[i]
      const path = `${uid}/clip-${Date.now()}-link${i}.${im.ext}`
      const up = await admin.storage.from(USER_FOOTAGE_BUCKET).upload(path, im.bytes, { contentType: im.ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false })
      if (up.error) { skipped++; continue }
      const url = `${FOOTAGE_PUBLIC_PREFIX()}${path}`
      const mod = await moderateContent({ surface: 'footage', stage: 'upload', userId: user.id, imageUrls: [url], meta: { path, source: 'ads_v2_link', host: read.host, size_bytes: im.bytes.byteLength } })
      if (!mod.ok) {
        if (mod.reason === 'blocked') await quarantineObject(admin, { bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' }).catch(() => null)
        else await admin.storage.from(USER_FOOTAGE_BUCKET).remove([path]).catch(() => null)
        blocked++
        skipped++
        continue
      }
      const row = await admin.from('user_footage').insert({ user_id: uid, url, kind: 'image', size_bytes: im.bytes.byteLength, ...(ws.role === 'member' ? { created_by: user.id } : {}) }).select('id, url').maybeSingle()
      if (row.error || !row.data) { skipped++; continue }
      images.push({ footage_id: String((row.data as { id: string }).id), url: String((row.data as { url: string }).url) })
    }

    await logRead({ ok: true, host: read.host, candidates: read.candidates, images_saved: images.length, skipped, blocked, price: Boolean(read.price) })
    return v2Json({
      link: read.link.length <= ADS_V2_LINK_MAX_CHARS ? read.link : parsed.value.url,
      host: read.host,
      title: read.title,
      sentence: read.sentence,
      price: read.price,
      lang: read.lang,
      images,
      candidates: read.candidates,
      skipped,
    })
  } catch (e) {
    console.warn('[ads/v2/link-import] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('link_import_failed', 502)
  }
}
