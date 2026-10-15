// KINEO-ADS-LISTA-1510 — o servidor da lista "Seus anúncios": completa as linhas que a rota (?list=brands) já leu DO DONO com
// os campos extras do próprio pedido (ADS_LIST_EXTRA_COLUMNS: fotos, produto, cena, estilo, formato, erro — lidos aqui e REDUZIDOS
// à vista; fotos, brief e erro crus nunca saem), o pôster do vídeo entregue (videos.thumbnail_url), as versões (ads_v2_versions) e o estado da aprovação do cliente
// (ads_v2_approvals). Toda consulta leva .eq('user_id', uid) — o dono do workspace, o MESMO uid da rota — e só os ids das
// linhas já lidas. SÓ LEITURA: nenhum insert/update/delete, nada de crédito, débito, estorno ou preço.
// Tabela que ainda não existe (pós-entrega não aplicada) ou consulta que falha = a linha sai sem aquilo (nunca 500).
import type { SupabaseClient } from '@supabase/supabase-js'
import { ADS_LIST_EXTRA_COLUMNS, adsListRow, type AdsListItem } from '@/lib/ads/adsList'

type Rows = Record<string, unknown>[]

async function readOwned(admin: SupabaseClient, table: string, cols: string, uid: string, key: string, ids: string[]): Promise<Rows> {
  if (!ids.length) return []
  try {
    const r = await admin.from(table).select(cols).eq('user_id', uid).in(key, ids)
    return !r.error && Array.isArray(r.data) ? (r.data as unknown as Rows) : []
  } catch {
    return []
  }
}

/** As linhas da lista, cada uma só com os campos da vista (lib/ads/adsList.ts adsListRow). */
export async function adsListEnrich(admin: SupabaseClient, uid: string, rows: readonly unknown[]): Promise<AdsListItem[]> {
  const list = rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
  const ids = list.map((r) => String(r.id ?? '')).filter(Boolean)
  const videoIds = list.map((r) => (typeof r.video_id === 'string' ? r.video_id : '')).filter(Boolean)
  const [extras, videos, versions, approvals] = await Promise.all([
    readOwned(admin, 'ads_v2_orders', `id, ${ADS_LIST_EXTRA_COLUMNS}`, uid, 'id', ids),
    readOwned(admin, 'videos', 'id, thumbnail_url', uid, 'id', videoIds),
    readOwned(admin, 'ads_v2_versions', 'order_id, status', uid, 'order_id', ids),
    readOwned(admin, 'ads_v2_approvals', 'order_id, status, expires_at, revoked_at, created_at', uid, 'order_id', ids),
  ])
  const poster = new Map(videos.map((v) => [String(v.id), typeof v.thumbnail_url === 'string' ? v.thumbnail_url : null]))
  const extra = new Map(extras.map((x) => [String(x.id), x]))
  const byOrder = (rs: Rows, id: string) => rs.filter((x) => String(x.order_id) === id)
  return list.map((r) => {
    const id = String(r.id ?? '')
    return adsListRow({ ...extra.get(id), ...r }, { poster: typeof r.video_id === 'string' ? poster.get(r.video_id) ?? null : null, versions: byOrder(versions, id), approvals: byOrder(approvals, id) })
  })
}
