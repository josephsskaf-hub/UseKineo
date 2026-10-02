// KINEO-PRODUCAO-ADS-2026-10-01 — /api/ads/producao/montage: a montagem da Produção (lib/ads/producao.ts tem o porquê).
// POST { shots: [{ kind:'clip', clip_id } | { kind:'talk', generation_id }], narration_id?, slogan?, support?, card_theme? }
//      → { render_id, seconds, credits }                                    (envia à Creatomate)
// GET  ?id=<render_id> → { status, progress, url, poster, seconds }        (pronto = cópia no NOSSO storage)
//
// O navegador NUNCA manda URL de mídia: cada peça é resolvida aqui, na conta de quem pede —
//   · clipe  → linha da tabela `clips` (user_id = a conta, status 'done', video_url já no nosso bucket, segundos reais);
//   · fala   → o claim ASSINADO do avatar (loadPrepaidAvatarClaimForGeneration: pago, completo, a URL do vídeo e o mp3 da
//              fala ligados no claim) — a fala entra alinhada ao plano, com a duração real do mp3;
//   · narração (opcional) → linha da tabela `audios` da conta, em renders/audio/<uid>/;
//   · logo   → o logo da empresa da conta (lib/brandLogo findBrandLogoUrl), em tela cheia no cartão final de 3 s.
// PREÇO (KINEO-NUVEM-A3-2026-10-02): proposta de PRODUCAO_MONTAGE_CREDITS = 2, cobrada SÓ com
// PRODUCAO_MONTAGE_CHARGE_LIVE=true (nasce false: a casa monta grátis, como em 01/10). Com a cobrança ligada: chave
// 'prodmont-<hash(conta, clique)>' → débito ANTES do envio (padrão v2Billing) → estorno se o envio ou o Creatomate falhar.
// O GET só responde a quem enviou: o envio grava `producao_montage_submitted` (evento só de servidor) com o render_id, a
// chave e os créditos; sem ele, 404. Pronto = cópia no nosso storage + linha em `videos` com render_id = chave: o filme
// entra na Biblioteca e essa linha é a prova de entrega que a varredura genérica de estorno lê (sem ela, estorna em 2 h).
import { NextRequest, NextResponse } from 'next/server'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { writeServerEvent } from '@/lib/serverEvents'
import { findBrandLogoUrl } from '@/lib/brandLogo'
import { loadPrepaidAvatarClaimForGeneration } from '@/lib/avatar/reservation'
import { randomUUID } from 'node:crypto'
import {
  PRODUCAO_NO_STORE,
  chargeProducaoMontage,
  producaoFail,
  producaoGate,
  producaoMontageBillingRef,
  refundProducaoMontage,
} from '@/lib/ads/producaoServer'
import {
  PRODUCAO_MONTAGE_CHARGE_LIVE,
  PRODUCAO_MONTAGE_CREDITS,
  PRODUCAO_MONTAGE_EVENT,
  PRODUCAO_MONTAGE_QUALITY,
  PRODUCAO_PUBLIC,
  PRODUCAO_SLOGAN_MAX,
  PRODUCAO_SUPPORT_MAX,
  PRODUCAO_VERSION,
  buildProducaoMontageSource,
  cleanLine,
  isOwnedProducaoAudioUrl,
  isProducaoIdempotencyKey,
  montageChargeCredits,
  montageUsdEstimate,
  parseMontageRefs,
  type ProducaoMontageShot,
} from '@/lib/ads/producao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const RENDER_ID_RE = /^[0-9a-f-]{16,64}$/i
const AUDIO_ID_RE = /^[A-Za-z0-9-]{1,64}$/

export async function POST(req: NextRequest) {
  try {
    const g = await producaoGate()
    if (!g.ok) return g.res
    const { user, admin } = g
    // KINEO-NUVEM-A3-2026-10-02 — aberta ao público, a montagem não pode sair de graça: público exige a cobrança ligada.
    if (PRODUCAO_PUBLIC && !PRODUCAO_MONTAGE_CHARGE_LIVE) return producaoFail('price_not_set', 403)

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const refs = parseMontageRefs(body?.shots)
    if (!refs) return producaoFail('bad_shots', 400)
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    if (!secret || !origin) return producaoFail('not_configured', 500)

    const shots: ProducaoMontageShot[] = []
    for (const [i, ref] of refs.entries()) {
      if (ref.kind === 'clip') {
        const row = await admin.from('clips').select('id,user_id,status,video_url,seconds').eq('id', ref.clipId).eq('user_id', user.id).maybeSingle()
        if (row.error) return producaoFail('montage_unavailable', 503)
        const c = row.data as { status?: unknown; video_url?: unknown; seconds?: unknown } | null
        if (!c || c.status !== 'done' || typeof c.video_url !== 'string' || !c.video_url) return producaoFail('clip_not_ready', 409, { shot: i })
        shots.push({ kind: 'clip', videoUrl: c.video_url, seconds: Number(c.seconds) })
      } else {
        const loaded = await loadPrepaidAvatarClaimForGeneration({ db: admin, secret, userId: user.id, generationId: ref.generationId })
        if (!loaded.ok) return producaoFail('talk_not_ready', 409, { shot: i })
        const claim = loaded.claim
        const voice = typeof claim?.response?.voiceover_url === 'string' ? claim.response.voiceover_url : ''
        const seconds = Number(claim?.response?.real_audio_duration)
        if (!claim || !claim.completedVideoUrl || !voice || !Number.isFinite(seconds)) return producaoFail('talk_not_ready', 409, { shot: i })
        shots.push({ kind: 'talk', videoUrl: claim.completedVideoUrl, voiceUrl: voice, seconds })
      }
    }

    let narration: { url: string; seconds: number } | null = null
    const narrationId = typeof body?.narration_id === 'string' ? body.narration_id : ''
    if (narrationId) {
      if (!AUDIO_ID_RE.test(narrationId)) return producaoFail('bad_narration', 400)
      const row = await admin.from('audios').select('id,user_id,url,duration_ms').eq('id', narrationId).eq('user_id', user.id).maybeSingle()
      if (row.error) return producaoFail('montage_unavailable', 503)
      const a = row.data as { url?: unknown; duration_ms?: unknown } | null
      // A duração vem da linha (o fornecedor a devolve); sem ela, a medida do navegador (só decide quanto tempo o áudio fica
      // na linha do tempo — o arquivo continua sendo o da conta, conferido aqui), limitada a 1–120 s.
      const fromRow = Number(a?.duration_ms) / 1000
      const hint = Number(body?.narration_seconds)
      const seconds = Number.isFinite(fromRow) && fromRow > 0 ? fromRow : Number.isFinite(hint) ? Math.max(1, Math.min(120, hint)) : NaN
      if (!a || !isOwnedProducaoAudioUrl(a.url, user.id, origin) || !Number.isFinite(seconds) || seconds <= 0) return producaoFail('bad_narration', 400)
      narration = { url: String(a.url), seconds }
    }

    const logoUrl = await findBrandLogoUrl(user.id)
    let source: Record<string, unknown>
    try {
      source = buildProducaoMontageSource({
        shots,
        narration,
        endCard: {
          logoUrl,
          slogan: cleanLine(body?.slogan, PRODUCAO_SLOGAN_MAX),
          support: cleanLine(body?.support, PRODUCAO_SUPPORT_MAX),
          theme: body?.card_theme === 'dark' ? 'dark' : 'light',
        },
        fontFamily: 'Montserrat',
      })
    } catch (e) {
      return producaoFail(e instanceof Error ? e.message : 'bad_montage', 400)
    }
    // KINEO-NUVEM-A3-2026-10-02 — um clique = uma chave. O mesmo clique repetido (rede, duplo toque) devolve a MESMA
    // montagem sem novo débito nem novo render; sem chave da tela, cada pedido ganha uma nova (nunca cobra em dobro).
    const idem = isProducaoIdempotencyKey(body?.idempotency_key) ? body!.idempotency_key as string : randomUUID()
    const billingRef = producaoMontageBillingRef(user.id, idem)
    const prior = await admin.from('events').select('metadata').eq('user_id', user.id).eq('name', PRODUCAO_MONTAGE_EVENT).eq('metadata->>billing_ref', billingRef).limit(1)
    if (prior.error) return producaoFail('montage_unavailable', 503)
    const priorMeta = prior.data?.[0]?.metadata as { render_id?: unknown; seconds?: unknown; credits?: unknown } | undefined
    if (priorMeta && typeof priorMeta.render_id === 'string') {
      return NextResponse.json({ render_id: priorMeta.render_id, seconds: Number(priorMeta.seconds), credits: Number(priorMeta.credits) || 0, logo: Boolean(logoUrl), reused: true }, { status: 202, headers: PRODUCAO_NO_STORE })
    }
    const credits = montageChargeCredits()
    if (credits > 0) {
      const charge = await chargeProducaoMontage(admin, { userId: user.id, billingRef, cost: credits })
      if (!charge.ok) {
        if (charge.debitPossible) await refundProducaoMontage(admin, { userId: user.id, billingRef })
        return producaoFail(charge.code, charge.status, { credits })
      }
    }
    let renderId: string
    try {
      renderId = await submitCreatomateRender(source)
    } catch (e) {
      // O envio falhou depois do débito: devolve na hora (idempotente no banco) e diz à tela.
      const refund = credits > 0 ? await refundProducaoMontage(admin, { userId: user.id, billingRef }) : null
      console.warn('[ads/producao/montage POST] envio recusado:', e instanceof Error ? e.message : String(e))
      return producaoFail('montage_failed', 502, { refunded: refund === 'refunded' })
    }
    const seconds = Number(source.duration)
    await writeServerEvent({
      name: PRODUCAO_MONTAGE_EVENT,
      userId: user.id,
      path: '/api/ads/producao/montage',
      metadata: {
        render_id: renderId, version: PRODUCAO_VERSION, shots: shots.length, talk: shots.filter((s) => s.kind === 'talk').length,
        narration: Boolean(narration), logo: Boolean(logoUrl), seconds, credits, price: PRODUCAO_MONTAGE_CREDITS, est_usd: montageUsdEstimate(seconds),
        billing_ref: billingRef,
      },
    })
    return NextResponse.json({ render_id: renderId, seconds, credits, logo: Boolean(logoUrl) }, { status: 202, headers: PRODUCAO_NO_STORE })
  } catch (e) {
    console.warn('[ads/producao/montage POST] falhou:', e instanceof Error ? e.message : String(e))
    return producaoFail('montage_failed', 502)
  }
}

export async function GET(req: NextRequest) {
  try {
    const g = await producaoGate()
    if (!g.ok) return g.res
    const { user, admin } = g
    const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
    if (!RENDER_ID_RE.test(id)) return producaoFail('bad_id', 400)
    const own = await admin
      .from('events')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('name', PRODUCAO_MONTAGE_EVENT)
      .eq('metadata->>render_id', id)
      .limit(1)
    if (own.error) return producaoFail('montage_failed', 502)
    if (!own.data?.length) return producaoFail('not_found', 404)
    // KINEO-NUVEM-A3-2026-10-02 — a chave e os créditos moram no evento do envio (montagens de antes de 02/10 não têm chave).
    const meta = (own.data[0] as { metadata?: { billing_ref?: unknown; credits?: unknown; seconds?: unknown } }).metadata ?? {}
    const billingRef = typeof meta.billing_ref === 'string' && meta.billing_ref ? meta.billing_ref : null
    const charged = Number(meta.credits) || 0

    const st = await pollCreatomateRender(id)
    if ((st.status === 'failed' || st.status === 'cancelled') && billingRef && charged > 0) {
      // Creatomate desistiu: devolve os créditos da montagem (idempotente — a 2ª consulta não devolve de novo).
      const refund = await refundProducaoMontage(admin, { userId: user.id, billingRef })
      return NextResponse.json({ status: st.status, progress: st.progress, url: null, error: st.error, refunded: refund === 'refunded' }, { headers: PRODUCAO_NO_STORE })
    }
    if (st.status !== 'succeeded' || !st.url) {
      return NextResponse.json({ status: st.status, progress: st.progress, url: null, error: st.error }, { headers: PRODUCAO_NO_STORE })
    }
    // Pronto: cópia no nosso storage (idempotente por caminho; falhou = fica a URL do fornecedor, nunca trava a entrega).
    const saved = await persistRenderAssets({ userId: user.id, renderId: `producao-${id}`, videoUrl: st.url, snapshotUrl: st.snapshotUrl })
    // KINEO-NUVEM-A3-2026-10-02 — o MP4 entra na Biblioteca: linha em `videos` com render_id = chave da cobrança
    // (videos_render_id_unique: a 2ª consulta cai no 23505 e só relê). É também a prova de entrega da varredura de estorno.
    let videoId: string | null = null
    if (billingRef) {
      const row = {
        user_id: user.id,
        status: 'completed',
        video_url: saved.videoUrl,
        thumbnail_url: saved.thumbnailUrl ?? null,
        render_id: billingRef,
        topic: 'Production · Studio Ads',
        title: 'Production',
        platform: 'Studio Ads',
        duration: Math.round(Number(saved.measuredSeconds ?? meta.seconds) || 0),
        quality_mode: PRODUCAO_MONTAGE_QUALITY,
        credits_used: charged,
      }
      const ins = await admin.from('videos').insert(row).select('id').maybeSingle()
      if (!ins.error && ins.data) videoId = String((ins.data as { id: string }).id)
      else if ((ins.error as { code?: string } | null)?.code === '23505') {
        const ex = await admin.from('videos').select('id').eq('render_id', billingRef).eq('user_id', user.id).maybeSingle()
        videoId = ex.data ? String((ex.data as { id: string }).id) : null
      } else console.warn('[ads/producao/montage GET] linha em videos falhou:', ins.error?.message)
    }
    return NextResponse.json({ status: 'succeeded', progress: 1, url: saved.videoUrl, poster: saved.thumbnailUrl, seconds: saved.measuredSeconds, video_id: videoId }, { headers: PRODUCAO_NO_STORE })
  } catch (e) {
    console.warn('[ads/producao/montage GET] falhou:', e instanceof Error ? e.message : String(e))
    return producaoFail('montage_failed', 502)
  }
}
