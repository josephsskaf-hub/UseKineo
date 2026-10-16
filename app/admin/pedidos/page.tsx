// KINEO-PACOTE-3-FILMES-1610 — aba "Pedidos 3 filmes" do /admin: os pedidos do pacote US$ 19 (pago → em produção →
// entregue) e o botão de marcar. Portão idêntico a toda tela /admin (sessão + isAdminEmail no servidor ANTES do
// service role). Só leitura aqui; as escritas são de /api/admin/dfy-films.
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import AdminAbas from '@/components/admin/AdminAbas'
import { DFY_FILMS3_DELIVERY_HOURS, DFY_FILMS3_STATUS_LABEL, dfyFilms3LanguageName, type DfyFilms3Status } from '@/lib/dfyFilms3'
import PedidosActions from './PedidosActions'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

interface Row {
  id: string
  user_id: string | null
  email: string | null
  topic: string
  language: string
  style: string | null
  status: DfyFilms3Status
  amount_total: number | null
  currency: string | null
  created_at: string
  paid_at: string | null
  delivered_at: string | null
  delivery_email: string | null
}

const cell = { padding: '10px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', fontSize: 13 } as const

function fmt(ts: string | null): string {
  return ts ? ts.slice(0, 16).replace('T', ' ') + ' UTC' : '—'
}

export default async function AdminPedidosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {
    return <div style={{ padding: 40, color: 'var(--text2)' }}>403</div>
  }
  const admin = serviceClient()
  if (!admin) return <div style={{ padding: 40, color: 'var(--text2)' }}>service unavailable</div>

  const { data, error } = await admin
    .from('done_for_you_orders')
    .select('id, user_id, email, topic, language, style, status, amount_total, currency, created_at, paid_at, delivered_at, delivery_email')
    .neq('status', 'pending_payment')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(200)
  const { count: pendentes } = await admin.from('done_for_you_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_payment')
  const rows = (data ?? []) as Row[]
  const now = Date.now()
  const atrasado = (r: Row) => r.status !== 'delivered' && !!r.paid_at && now - Date.parse(r.paid_at) > DFY_FILMS3_DELIVERY_HOURS * 3600_000

  return (
    <>
      <AdminAbas atual="pedidos" />
      <div style={{ padding: '20px clamp(16px, 3vw, 28px)' }} data-kineo="admin-pedidos-3-filmes">
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Pedidos · 3 filmes por US$ 19</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
          {error ? `Tabela done_for_you_orders indisponível (${error.code ?? 'erro'}) — a migration 20261016120000_done_for_you_orders foi aplicada?` : `${rows.length} pagos · ${rows.filter(atrasado).length} atrasados (> ${DFY_FILMS3_DELIVERY_HOURS} h) · ${pendentes ?? 0} briefings sem pagamento`}
        </p>
        {rows.length === 0 && !error ? <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum pedido pago ainda.</p> : null}
        {rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
              <thead>
                <tr>{['Pago em', 'Cliente', 'Tema', 'Língua / estilo', 'Status', 'Ação'].map((h) => <th key={h} style={{ ...cell, textAlign: 'left', fontWeight: 800 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={cell}>{fmt(r.paid_at)}{atrasado(r) ? <div style={{ color: 'var(--danger, #d43b3b)', fontWeight: 700 }}>atrasado</div> : null}</td>
                    <td style={cell}>{r.email ?? '—'}<div style={{ color: 'var(--muted)' }}>{r.user_id ?? 'sem conta'}</div></td>
                    <td style={{ ...cell, maxWidth: 320, whiteSpace: 'pre-wrap' }}>{r.topic}</td>
                    <td style={cell}>{dfyFilms3LanguageName(r.language)}<div style={{ color: 'var(--muted)' }}>{r.style ?? 'estilo livre'}</div></td>
                    <td style={cell}>
                      <strong>{DFY_FILMS3_STATUS_LABEL[r.status] ?? r.status}</strong>
                      {r.status === 'delivered' ? <div style={{ color: 'var(--muted)' }}>{fmt(r.delivered_at)} · e-mail {r.delivery_email ?? '—'}</div> : null}
                    </td>
                    <td style={cell}><PedidosActions orderId={r.id} status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
