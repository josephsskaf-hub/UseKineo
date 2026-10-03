'use client'

// KINEO-PARTNERS-PACOTE-2026-10-03 — lista de parceiros (afiliados) com o pacote de demonstração: etapa 1/2, post
// público (link para o admin conferir), créditos usados desde a cortesia, indicados e pagantes. Ações de 1 clique:
// dar a etapa 1, aprovar/recusar o post (aprovar = etapa 2). Nada automático.
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { PartnerListRow } from '@/lib/partnerPack'

type Row = PartnerListRow & { is_internal: boolean }
const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid #1F2530', borderRadius: 16 }
const BTN: React.CSSProperties = { borderRadius: 6, padding: '3px 9px', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function PartnersClient({ denied }: { denied?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [live, setLive] = useState(false)
  const [available, setAvailable] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    void fetch('/api/admin/partners', { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) throw new Error('load'); return r.json() as Promise<{ live: boolean; packs_available: boolean; partners: Row[] }> })
      .then((j) => { setRows(j.partners); setLive(j.live); setAvailable(j.packs_available) })
      .catch(() => setMsg('Falhou ao carregar os parceiros.'))
  }, [])
  useEffect(() => { if (!denied) load() }, [denied, load])

  const act = async (key: string, body: Record<string, string>) => {
    if (busy) return
    setBusy(key)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json()) as { error?: string }
      setMsg(r.ok ? '✓ feito' : (j.error ?? 'Falhou.'))
      load()
    } finally {
      setBusy(null)
    }
  }

  if (denied) return <div style={{ padding: 40, color: '#9AA3B2' }}>Admin only.</div>
  const list = (rows ?? []).filter((r) => !r.is_internal)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1500px] mx-auto">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#5FD4A4' }}>Admin · Kineo Partners</div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.5rem', color: '#F2F4F7' }}>Parceiros e pacote de demonstração</h1>
        <p className="text-xs mt-1 mb-4" style={{ color: '#9AA3B2', maxWidth: 900 }}>
          Etapa 1 = 25 créditos em creator_trial por 30 dias (cortesia). Etapa 2 = +25 depois que o parceiro registra 1 post
          público com o link/cupom dele e você aprova. 1 pacote por afiliado; conta que já paga não recebe. Entrega
          automática na inscrição: <b style={{ color: live ? '#5FD4A4' : '#FFBF58' }}>{live ? 'LIGADA' : 'desligada (PARTNER_PACK_LIVE=false)'}</b>.
          {' '}<Link href="/admin/people" style={{ color: '#8DB4FF' }}>People →</Link>
        </p>
        {!available && <p className="text-xs mb-3" style={{ color: '#FF8787' }}>Tabela partner_packs indisponível — aplicar as migrations 20261003120000 e 20261003121000.</p>}
        {msg && <p className="text-xs mb-3" style={{ color: msg.startsWith('✓') ? '#5FD4A4' : '#FF8787' }}>{msg}</p>}
        {!rows && <div style={{ ...CARD, padding: 40, color: '#9AA3B2', textAlign: 'center' }}>Carregando…</div>}
        {rows && (
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--card2)' }}>
                  {['Parceiro', 'Código', 'Entrou', 'Plano', 'Etapa', 'Post', 'Cortesia até', 'Créditos usados', 'Indicados', 'Pagantes', ''].map((h) => (
                    <th key={h} style={{ fontSize: '0.6rem', color: '#9AA3B2', textAlign: 'left', padding: '9px 12px', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.affiliate_id} style={{ borderTop: '1px solid #1F2530' }}>
                    <td style={{ padding: '9px 12px', color: '#F2F4F7', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.email ?? r.name ?? '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{r.code}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{fmt(r.joined_at)}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{r.plan ?? '—'}</td>
                    <td style={{ padding: '9px 12px', color: r.stage === 2 ? '#5FD4A4' : r.stage === 1 ? '#8DB4FF' : '#9AA3B2', fontWeight: 800 }}>{r.stage === 0 ? '—' : `${r.stage}/2`}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>
                      {r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer noopener" style={{ color: '#8DB4FF' }}>{r.post_status}</a> : r.post_status === 'none' ? '—' : r.post_status}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{fmt(r.courtesy_ends_at)}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{r.stage ? r.credits_used : '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#C9CFD8' }}>{r.referrals}</td>
                    <td style={{ padding: '9px 12px', color: r.paying_referrals ? '#5FD4A4' : '#C9CFD8', fontWeight: 800 }}>{r.paying_referrals}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ display: 'inline-flex', gap: 5 }}>
                        {r.can_grant_stage1 && available && (
                          <button type="button" disabled={Boolean(busy)} onClick={() => void act('g' + r.affiliate_id, { action: 'grant_stage1', affiliate_id: r.affiliate_id })} style={{ ...BTN, background: 'rgba(95,212,164,.12)', border: '1px solid rgba(95,212,164,.35)', color: '#5FD4A4' }}>dar etapa 1</button>
                        )}
                        {r.can_review_post && r.pack_id && (
                          <>
                            <button type="button" disabled={Boolean(busy)} onClick={() => void act('a' + r.pack_id, { action: 'approve_post', pack_id: r.pack_id! })} style={{ ...BTN, background: 'rgba(41,151,255,.12)', border: '1px solid rgba(41,151,255,.35)', color: '#8DB4FF' }}>aprovar post (+25)</button>
                            <button type="button" disabled={Boolean(busy)} onClick={() => void act('r' + r.pack_id, { action: 'reject_post', pack_id: r.pack_id! })} style={{ ...BTN, background: 'transparent', border: '1px solid #3a2a2a', color: '#FF8787' }}>recusar</button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div style={{ padding: 30, color: '#9AA3B2', textAlign: 'center' }}>Nenhum parceiro ainda.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
