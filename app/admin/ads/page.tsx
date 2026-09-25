// KINEO-FLUXO-NOVO-2026-09-25 — /admin/ads: o que está esperando GENTE, com o relógio da promessa.
//
// POR QUÊ. Express/Pro prometem entrega em horas contadas (DFY_TIERS) e o Studio Ads promete revisão humana do
// 1º anúncio em 24 h. Até 25/09 as duas filas só existiam no banco. Esta tela junta:
//   · Empresas: cada dfy_order_paid (90 dias) com o briefing da mesma sessão e o prazo = pago_em + horas do degrau;
//     briefings sem pedido gravado aparecem à parte (o redirect da Stripe pode chegar antes do webhook);
//   · Studio Ads: pedidos 'delivered' sem qa_at, o mais antigo primeiro, contra as 24 h; e os 'rendering' parados
//     (a entrega só é marcada quando a tela do cliente consulta; aba fechada deixa o pedido em 'rendering').
// Portão igual a todo /admin/*: cookie + ADMIN_EMAILS ANTES do service role. Só leitura; a única escrita é o botão
// de revisão (POST /api/admin/ads). Toda leitura tem teto e a tela avisa quando bate nele (nada de truncar calado).
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { DFY_MAX_OPEN_ORDERS } from '@/lib/growth/dfyOffer'
import { ADS_PRODUCT_NAME } from '@/lib/ads/offer'
import {
  ADS_REVIEW_PROMISE_HOURS,
  STALE_RENDERING_MINUTES,
  buildDfyOrderRows,
  buildReviewQueue,
  staleRendering,
  type AdsOrderLite,
  type DfyBriefEvent,
  type DfyPaidEvent,
  type ReviewRow,
} from './adsAdminData'
import AdsAdminActions from './AdsAdminActions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = { title: 'Admin · Ads', robots: { index: false, follow: false } }

const LIMIT = 500
const DAYS = 90
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 16, padding: 16, marginBottom: 12 }
const MUTED: CSSProperties = { color: '#86868b', fontSize: 12 }
const ORDER_COLUMNS = 'id, user_id, status, template, seconds, video_id, qa_at, delivered_at, created_at, updated_at, brief'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#f5f5f7' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px 80px' }}>{children}</div>
    </div>
  )
}

function brt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
}

function clock(hoursLeft: number | null): { text: string; color: string } {
  if (hoursLeft === null) return { text: 'prazo desconhecido', color: '#fbbf24' }
  if (hoursLeft < 0) return { text: `ATRASADO ${Math.abs(hoursLeft)} h`, color: '#f87171' }
  return { text: `faltam ${hoursLeft} h`, color: hoursLeft < 6 ? '#fbbf24' : '#34d399' }
}

function BriefView({ brief }: { brief: Record<string, unknown> | null }) {
  if (!brief) return <p style={{ ...MUTED, color: '#fbbf24' }}>Sem briefing ainda (o cliente pode ter respondido o recibo por e-mail).</p>
  const entries = Object.entries(brief).filter(([, v]) => (Array.isArray(v) ? v.length : typeof v === 'string' && v))
  return (
    <dl style={{ margin: '8px 0 0', fontSize: 13 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 4 }}>
          <dt style={{ ...MUTED, display: 'inline' }}>{k}: </dt>
          <dd style={{ display: 'inline', margin: 0, whiteSpace: 'pre-wrap' }}>
            {Array.isArray(v) ? v.map((l) => <a key={String(l)} href={String(l)} target="_blank" rel="noopener noreferrer" style={{ color: '#7ebfff', marginRight: 8 }}>{String(l)}</a>) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ReviewList({ rows, emails, videos, actions }: { rows: ReviewRow[]; emails: Map<string, string>; videos: Map<string, string>; actions: boolean }) {
  if (!rows.length) return <p style={MUTED}>Nada aqui.</p>
  return (
    <>
      {rows.map((r) => {
        const c = clock(r.hoursLeft)
        const url = r.videoId ? videos.get(r.videoId) : undefined
        return (
          <div key={r.id} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>{r.business ?? '(sem nome de negócio)'}</strong>
              <span style={{ color: c.color, fontWeight: 700 }}>{c.text}</span>
            </div>
            <p style={MUTED}>
              {emails.get(r.userId) ?? r.userId} · {r.template ?? 'modelo?'} · {r.seconds ?? '?'} s · desde {brt(r.since)} ({r.ageHours} h) · pedido {r.id}
            </p>
            {url ? <p><a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#7ebfff' }}>Abrir o vídeo</a></p> : <p style={MUTED}>Sem vídeo ligado ao pedido.</p>}
            {actions && <AdsAdminActions orderId={r.id} />}
          </div>
        )
      })}
    </>
  )
}

export default async function AdminAdsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return <Shell><div style={CARD}><h1 style={{ fontSize: 20, fontWeight: 800 }}>Access denied.</h1><p style={MUTED}>Admin only.</p></div></Shell>
  }
  const admin = serviceClient()
  if (!admin) return <Shell><div style={CARD}>Service unavailable (service role ausente).</div></Shell>

  const now = new Date()
  const since = new Date(now.getTime() - DAYS * 86_400_000).toISOString()
  const staleCut = new Date(now.getTime() - STALE_RENDERING_MINUTES * 60_000).toISOString()
  const [paidRes, briefRes, deliveredRes, renderingRes] = await Promise.all([
    admin.from('events').select('created_at, user_id, metadata').eq('name', 'dfy_order_paid').gte('created_at', since).order('created_at', { ascending: false }).limit(LIMIT),
    admin.from('events').select('created_at, metadata').eq('name', 'dfy_brief_submitted').gte('created_at', since).order('created_at', { ascending: false }).limit(LIMIT),
    admin.from('ads_orders').select(ORDER_COLUMNS).eq('status', 'delivered').is('qa_at', null).order('delivered_at', { ascending: true }).limit(LIMIT),
    admin.from('ads_orders').select(ORDER_COLUMNS).eq('status', 'rendering').lt('updated_at', staleCut).order('updated_at', { ascending: true }).limit(LIMIT),
  ])
  const errors = [paidRes.error, briefRes.error, deliveredRes.error, renderingRes.error].filter(Boolean).map((e) => `${e!.code ?? ''} ${e!.message}`)
  const paid = (paidRes.data ?? []) as DfyPaidEvent[]
  const briefs = (briefRes.data ?? []) as DfyBriefEvent[]
  const delivered = (deliveredRes.data ?? []) as unknown as AdsOrderLite[]
  const rendering = (renderingRes.data ?? []) as unknown as AdsOrderLite[]
  const capped = [paid, briefs, delivered, rendering].some((a) => a.length >= LIMIT)

  const { orders, orphanBriefs } = buildDfyOrderRows(paid, briefs, now)
  const review = buildReviewQueue(delivered, now)
  const stale = staleRendering(rendering, now)

  const userIds = Array.from(new Set([...review, ...stale].map((r) => r.userId)))
  const videoIds = Array.from(new Set([...review, ...stale].map((r) => r.videoId).filter((v): v is string => Boolean(v))))
  const emails = new Map<string, string>()
  const videos = new Map<string, string>()
  if (userIds.length) {
    const { data } = await admin.from('profiles').select('id, email').in('id', userIds)
    for (const p of (data ?? []) as { id: string; email: string | null }[]) if (p.email) emails.set(p.id, p.email)
  }
  if (videoIds.length) {
    const { data } = await admin.from('videos').select('id, video_url').in('id', videoIds)
    for (const v of (data ?? []) as { id: string; video_url: string | null }[]) if (v.video_url) videos.set(v.id, v.video_url)
  }
  const lateDfy = orders.filter((o) => o.late).length

  return (
    <Shell>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Pedidos com gente no meio</h1>
      <p style={MUTED}>Kineo Empresas (Express/Pro) e revisão humana do {ADS_PRODUCT_NAME}. Horário de Brasília. Últimos {DAYS} dias.</p>
      {errors.length > 0 && <div style={{ ...CARD, borderColor: '#f87171' }}>Leitura com erro — os números abaixo podem estar incompletos: {errors.join(' · ')}</div>}
      {capped && <div style={{ ...CARD, borderColor: '#fbbf24' }}>Uma das listas bateu no teto de {LIMIT} linhas: há mais pedidos do que a tela mostra.</div>}

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '24px 0 8px' }}>Empresas · {orders.length} pedidos · {lateDfy} atrasados</h2>
      <p style={MUTED}>Prazo = pago em + horas do degrau. A tela ainda não sabe o que já foi entregue: pedido entregue continua aparecendo (e passa a contar como atrasado). Teto de pedidos abertos ao mesmo tempo: {DFY_MAX_OPEN_ORDERS}.</p>
      {orders.length === 0 && <p style={MUTED}>Nenhum pedido pago.</p>}
      {orders.map((o) => {
        const c = clock(o.hoursLeft)
        return (
          <div key={o.stripeSessionId} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>{o.tierName ?? 'degrau desconhecido'} · {o.name ?? o.email ?? '(sem nome)'}</strong>
              <span style={{ color: c.color, fontWeight: 700 }}>{c.text}</span>
            </div>
            <p style={MUTED}>
              pago {brt(o.paidAt)} · prazo {brt(o.deadlineAt)} · {o.email ?? 'sem e-mail'} · sessão {o.stripeSessionId}
              {o.briefUpdatedAt ? ` · briefing ${brt(o.briefUpdatedAt)}` : ''}
            </p>
            {o.customFields.length > 0 && (
              <ul style={{ margin: '6px 0', paddingLeft: 18, fontSize: 13 }}>
                {o.customFields.map((f, i) => <li key={i}><span style={MUTED}>{f.label ?? 'campo'}:</span> {f.value ?? '—'}</li>)}
              </ul>
            )}
            <BriefView brief={o.brief} />
          </div>
        )
      })}
      {orphanBriefs.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '16px 0 8px', color: '#fbbf24' }}>Briefings sem pedido gravado ({orphanBriefs.length})</h3>
          <p style={MUTED}>O briefing só é aceito com a sessão paga na Stripe; se o pedido não aparece acima, o webhook ainda não gravou (ou falhou).</p>
          {orphanBriefs.map((b) => (
            <div key={b.stripeSessionId} style={CARD}>
              <strong>{b.tier ?? 'degrau?'} · {b.email ?? '(sem e-mail)'}</strong>
              <p style={MUTED}>enviado {brt(b.submittedAt)} · sessão {b.stripeSessionId}</p>
              <BriefView brief={b.brief} />
            </div>
          ))}
        </>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 8px' }}>{ADS_PRODUCT_NAME} · revisão humana ({review.length})</h2>
      <p style={MUTED}>Entregues e ainda sem revisão, o mais antigo primeiro. A página promete revisão em {ADS_REVIEW_PROMISE_HOURS} h. Aprovar ou reprovar grava qa_at/qa_ok e o evento ads_qa_decided.</p>
      <ReviewList rows={review} emails={emails} videos={videos} actions />

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 8px' }}>{ADS_PRODUCT_NAME} · render parado há mais de {STALE_RENDERING_MINUTES} min ({stale.length})</h2>
      <p style={MUTED}>O pedido só vira &quot;entregue&quot; quando a tela do cliente consulta o render. Aba fechada = pedido preso aqui, fora da fila acima.</p>
      <ReviewList rows={stale} emails={emails} videos={videos} actions={false} />
    </Shell>
  )
}
