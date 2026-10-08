'use client'

// KINEO-ADMIN-LIVE-2026-08-19 — "quem está no site AGORA", no topo da tela CEO.
// Pedido do fundador depois do caso wongzeehern (SG, veio do ChatGPT, foi ao
// checkout em 2 min e hesitou): ele quer ver a pessoa quente ENQUANTO ela está
// online, com e-mail ao lado e o que ela testou, pra mandar o e-mail na hora.
//
// Auto-refresh de 30s (a janela de "online" é de 5 min, então 30s dá granularidade
// de sobra sem martelar o banco). E-mail é clicável: abre o Gmail com assunto já
// escrito conforme o CALOR do visitante — 🚨 no checkout ganha um assunto
// diferente de quem só está navegando.
import { useEffect, useState } from 'react'
import type { LiveData, LiveVisitor } from '@/app/api/admin/live/route'

const REFRESH_MS = 30_000

function flag(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

// Assunto por calor: quem está no checkout recebe a pergunta direta; quem só
// navega recebe o convite de ajuda. Copy no padrão da casa (curta, de gente).
function mailtoFor(v: LiveVisitor): string {
  const subject =
    v.heat === 3
      ? 'Anything I can fix at checkout?'
      : v.heat === 2
        ? 'Saw you making a video — need a hand?'
        : 'Founder here — anything I can help with?'
  return `mailto:${v.email}?subject=${encodeURIComponent(subject)}`
}

function heatColor(heat: number): string {
  return heat === 3 ? '#FF8787' : heat === 2 ? '#FFBF58' : '#9AA3B2'
}

// ═══ KINEO-CHECKOUT-HONESTO-2026-10-07 — "Pagamento · 24h" em três linhas ═══════════════════════════════════════════
// O fundador viu "9 checkouts" aqui e 1–2 na Stripe: o número único contava TODO checkout_started, e desde a compra sem
// login isso inclui robô seguindo link e teste da casa. O card só DESENHA o que o servidor calculou e escreveu
// (lib/admin/checkoutHonesto.ts → /api/admin/live): pessoa · robô ou rajada · pagou, a conta que fecha e os avisos.
const LINHA_COR: Record<string, string> = { pessoas: '#FFBF58', robo: '#9AA3B2', pagou: '#5FD4A4' }

export function CheckoutHonestoCard({ loaded, value, cardStyle }: {
  loaded: boolean
  value: LiveData['checkout_honesto']
  cardStyle: React.CSSProperties
}) {
  return (
    <div className="px-3 py-2.5" style={{ ...cardStyle, gridColumn: 'span 2' }} title={value?.cartao.regra}>
      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>Pagamento · 24h</div>
      {!value && (
        <div className="font-black" style={{ fontSize: '1.25rem', color: '#FFBF58' }}>
          —{loaded && <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--muted2)' }}>não deu para ler agora</span>}
        </div>
      )}
      {value && (
        <>
          {value.cartao.linhas.map((l) => (
            <div key={l.chave} className="flex items-baseline gap-2" style={{ lineHeight: 1.35 }}>
              <span className="font-black" style={{ fontSize: l.chave === 'pessoas' ? '1.25rem' : '1rem', color: LINHA_COR[l.chave] ?? 'var(--text)', minWidth: 28 }}>
                {l.valor.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{l.rotulo}</span>
              {l.detalhe && <span style={{ fontSize: '0.68rem', color: 'var(--muted2)' }}>· {l.detalhe}</span>}
            </div>
          ))}
          <div className="mt-1" style={{ fontSize: '0.66rem', color: 'var(--muted2)' }}>{value.cartao.conta}</div>
          {value.cartao.avisos.map((a) => (
            <div key={a} style={{ fontSize: '0.66rem', color: '#FFBF58' }}>{a}</div>
          ))}
        </>
      )}
    </div>
  )
}

export default function LiveNowPanel() {
  const [data, setData] = useState<LiveData | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetch('/api/admin/live', { cache: 'no-store' })
        .then(async (r) => (r.ok ? (r.json() as Promise<LiveData>) : Promise.reject()))
        .then((d) => { if (!cancelled) { setData(d); setErr(false) } })
        .catch(() => { if (!cancelled) setErr(true) })
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#5FD4A4' }} />
        <h2 className="font-black tracking-tight" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live · who&apos;s on the site
        </h2>
      </div>

      {/* Placar de tráfego: 7 dias · 24h · agora */}
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {[
          ['Visitors 7d', data?.visitors_7d, 'var(--text)'],
          ['Visitors 24h', data?.visitors_24h, 'var(--text)'],
          ['Signups 24h', data?.signups_24h, '#8DB4FF'],
          ['Videos 24h', data?.videos_24h, '#C4B5FD'],
          // KINEO-CHECKOUT-HONESTO-2026-10-07 — o 'Checkouts 24h' (um número só) saiu daqui: virou o card de três
          // linhas logo abaixo (CheckoutHonestoCard).
          ['🟢 Online now', data?.online_now, '#5FD4A4'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="px-3 py-2.5" style={CARD}>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{label}</div>
            <div className="font-black" style={{ fontSize: '1.25rem', color: color as string }}>
              {typeof value === 'number' ? value.toLocaleString('en-US') : '—'}
            </div>
          </div>
        ))}
        <CheckoutHonestoCard loaded={data !== null} value={data?.checkout_honesto ?? null} cardStyle={CARD} />
      </div>

      {/* Lista de quem está online: mais quente primeiro */}
      <div className="overflow-x-auto" style={{ ...CARD, padding: 0 }}>
        {err && <div className="px-4 py-6 text-center text-xs" style={{ color: '#FF8787' }}>Could not load live data.</div>}
        {!err && !data && <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--muted2)' }}>Loading…</div>}
        {data && data.online.length === 0 && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--muted2)' }}>
            Nobody signed-in on the site in the last 5 minutes.
          </div>
        )}
        {data && data.online.length > 0 && (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Who', 'Doing now', 'Saldo e no que gastou', 'Vídeos (total)', 'Age', 'From', 'Seen'].map((h) => (
                  <th key={h} className="font-black uppercase tracking-widest" style={{ fontSize: '0.58rem', color: 'var(--muted2)', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.online.map((v) => (
                <tr key={v.user_id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    <a
                      href={mailtoFor(v)}
                      title="Email this person now"
                      style={{ color: '#8DB4FF', textDecoration: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem' }}
                    >
                      {v.email}
                    </a>
                    {v.name && <span className="ml-2" style={{ color: 'var(--muted2)', fontSize: '0.75rem' }}>{v.name}</span>}
                    {v.is_paid && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ background: 'rgba(52,211,153,.12)', color: '#5FD4A4', border: '1px solid rgba(52,211,153,.35)' }}>sub</span>
                    )}
                    {v.is_trial && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" title="trial de $1 — vira assinante no dia 8" style={{ background: 'rgba(41,151,255,.12)', color: '#7cc0ff', border: '1px solid rgba(41,151,255,.35)' }}>trial $1</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', color: heatColor(v.heat), fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {v.did.join(' · ')}
                    {/* KINEO-LIVE-V2-2026-08-19 — o selo que explica o caso que
                        o fundador nao conseguiu ler: credito gasto e ZERO
                        video. O credito sai quando a geracao COMECA; o video
                        so existe quando ela TERMINA. Entre os dois, isto. */}
                    {v.rendering && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase"
                        style={{ background: 'rgba(251,191,36,.14)', color: '#FFBF58', border: '1px solid rgba(251,191,36,.35)' }}>
                        rendering
                      </span>
                    )}
                    {v.failed > 0 && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase"
                        title="Geracoes que falharam — dor, nao uso"
                        style={{ background: 'rgba(248,113,113,.12)', color: '#FF8787', border: '1px solid rgba(248,113,113,.35)' }}>
                        {v.failed} failed
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', color: (v.credits ?? 0) <= 5 ? '#FB923C' : 'var(--text)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700 }}>{v.credits ?? '—'}{v.credits !== null && v.credits !== undefined ? ' cr' : ''}</span>
                    {/* KINEO-LEDGER-2026-08-25 (fundador: "não entendo como o
                        cara pode ter 46") — a equação inteira do saldo, de
                        fontes reais: trial + bônus + compras + estorno − gastos.
                        Se não bater com o saldo, a diferença ganha ⚠ em vez de
                        fingir que fecha. Substitui o rótulo antigo do trial,
                        que contava só um pedaço da história. */}
                    {v.ledger && (
                      <span style={{ color: 'var(--muted2)', fontSize: '0.7rem', marginLeft: 6 }}>{v.ledger}</span>
                    )}
                    {v.ledgerGap !== 0 && (
                      <span
                        title="saldo real menos o que as fontes explicam — furo de dados a investigar (ex.: créditos de plano mensal ainda não entram no razão)"
                        style={{ color: '#FF8787', fontSize: '0.7rem', marginLeft: 6, fontWeight: 800 }}>
                        ⚠ {v.ledgerGap > 0 ? '+' : ''}{v.ledgerGap} sem origem
                      </span>
                    )}
                    {/* KINEO-RAZAO-ASSINANTE-2026-09-17 — falta de registro não é furo: vem em cinza, com o motivo. */}
                    {v.ledgerNote && (
                      <span title="a compra é anterior ao registro de crédito no evento (17/09); o saldo está certo, só a equação não tem a parcela" style={{ color: 'var(--muted2)', fontSize: '0.68rem', marginLeft: 6 }}>
                        · {v.ledgerNote}
                      </span>
                    )}
                    {!v.ledger && v.creditsUsedLabel && (
                      <span style={{ color: 'var(--muted2)', fontSize: '0.7rem', marginLeft: 6 }}>{v.creditsUsedLabel}</span>
                    )}
                    {/* KINEO-LIVE-V3-2026-08-19 — o extrato: EM QUÊ os créditos
                        foram hoje. Era a pergunta que o fundador não conseguia
                        responder olhando a tela. */}
                    {v.spentOn && (
                      <div style={{ color: '#C4B5FD', fontSize: '0.68rem', marginTop: 2 }}>{v.spentOn}</div>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--text)', fontSize: '0.8rem' }}>{v.videos}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--muted2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {v.hoursOld < 1 ? 'novo' : v.hoursOld < 48 ? `${v.hoursOld}h` : `${Math.round(v.hoursOld / 24)}d`}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--muted2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {flag(v.country)} {v.country ?? '—'}{v.source ? ` · ${v.source}` : ''}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--muted2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {v.minutes_ago === 0 ? 'now' : `${v.minutes_ago}m ago`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] mt-2" style={{ color: 'var(--muted2)' }}>
        Online = visitante logado com atividade nos últimos 5 min · atualiza a cada 30s · clique no e-mail para escrever agora.
        {' '}<b>rendering</b> = geração em voo: o crédito já saiu, o vídeo ainda não existe — é isso que explica &quot;crédito gasto, zero vídeo&quot;.
      </p>
    </section>
  )
}
