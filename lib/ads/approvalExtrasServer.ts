// KINEO-DEMO-SOB-MEDIDA-1510 — a página de aprovação (/approve#<token>) mostra os 3 FORMATOS da mesma versão, o rótulo da amostra
// ("Sample made by Kineo for <Brand>") e o aviso do apresentador de IA. Mora num arquivo próprio para o núcleo da aprovação
// (lib/ads/v2PostDeliveryServer.ts — dinheiro/pós-entrega, conferido byte a byte por guardiões antigos) ficar intocado: a rota
// pública /api/ads/v2/approval/view chama openApproval (validação + "visto") e depois isto.
//
// Os outros formatos PRONTOS da mesma versão (kind 'format', entregue, mesma base) são COPIADOS para renders/share/<nome>.mp4 — o
// caminho de sempre carrega o id da conta; o nome é derivado (chave de serviço + aprovação + formato: o mesmo a cada visita, ninguém
// adivinha); cópia que já existe = a mesma de antes. Só cópias de share passam (o filtro puro de adsV2ApprovalPublicView). Nunca
// lança: leitura que falha = a página de antes (um vídeo, sem rótulo extra).
import { createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyApprovalToken } from '@/lib/ads/v2ApprovalToken'
import { ADS_V2_EXPORT_FORMATS, adsV2ApprovalPublicView, adsV2RendersPath, type AdsV2ApprovalFormat, type AdsV2ApprovalPublic } from '@/lib/ads/v2PostDelivery'
import { adsV2PlanFormat, type AdsV2Format } from '@/lib/ads/v2ShotLists'
import { loadAdsV2Versions, type AdsV2VersionRow } from '@/lib/ads/v2PostDeliveryServer'
import { isDemoSobMedidaBrief } from '@/lib/ads/demoSobMedida'

/** O nome da cópia de um formato: derivado da chave de serviço + aprovação + formato. */
export function approvalFormatShareName(secret: string, approvalId: string, format: AdsV2Format): string {
  return createHmac('sha256', secret).update(`kineo-approval-format:v1:${approvalId}:${format}`).digest('base64url').slice(0, 24)
}

/** A vista pública (já validada por openApproval) + os formatos, a amostra e o ator. `view` null = null. */
export async function approvalViewWithExtras(admin: SupabaseClient, token: unknown, secret: string, view: AdsV2ApprovalPublic | null): Promise<AdsV2ApprovalPublic | null> {
  if (!view) return null
  const base = { brand_name: view.brand, share_video_url: view.video_url, status: view.status, lang: view.lang }
  try {
    const v = verifyApprovalToken(token, secret)
    if (!v.ok) return view
    const a = await admin.from('ads_v2_approvals').select('id, order_id, user_id, version_id').eq('token_hash', v.hash).maybeSingle()
    const row = a.data as { id: string; order_id: string; user_id: string; version_id: string | null } | null
    if (a.error || !row) return view
    const o = await admin.from('ads_v2_orders').select('id, brief, plan').eq('id', row.order_id).eq('user_id', row.user_id).maybeSingle()
    if (o.error || !o.data) return view
    const order = o.data as { brief: unknown; plan: unknown }
    const sample = isDemoSobMedidaBrief(order.brief)
    const aiPresenter = !!(order.plan && typeof order.plan === 'object' && (order.plan as { presenter?: unknown }).presenter)
    const { rows, error } = await loadAdsV2Versions(admin, row.order_id, row.user_id)
    if (error) return adsV2ApprovalPublicView(base, { sample, aiPresenter })
    const baseVersion = row.version_id ?? null
    const main: AdsV2Format = (baseVersion ? rows.find((r) => r.id === baseVersion)?.format : null) ?? adsV2PlanFormat(order.plan)
    const ready = new Map<AdsV2Format, AdsV2VersionRow>()
    for (const r of rows) if (r.kind === 'format' && r.status === 'delivered' && r.video_url && (r.base_version_id ?? null) === baseVersion && r.format !== main) ready.set(r.format, r)
    const mark = '/storage/v1/object/public/renders/'
    const out: AdsV2ApprovalFormat[] = [{ format: main, video_url: view.video_url }]
    for (const f of ADS_V2_EXPORT_FORMATS) {
      const r = ready.get(f)
      const path = r ? adsV2RendersPath(r.video_url) : null
      if (!r || !path || !r.video_url) continue
      const dest = `share/${approvalFormatShareName(secret, row.id, f)}.mp4`
      const cp = await admin.storage.from('renders').copy(path, dest)
      if (cp.error && !/exist|duplicate/i.test(String(cp.error.message ?? ''))) continue
      out.push({ format: f, video_url: r.video_url.slice(0, r.video_url.indexOf(mark) + mark.length) + dest })
    }
    return adsV2ApprovalPublicView(base, { formats: out.length > 1 ? out : [], sample, aiPresenter })
  } catch {
    return view
  }
}
