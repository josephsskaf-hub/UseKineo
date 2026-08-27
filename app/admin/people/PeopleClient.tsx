'use client'

// KINEO-ADMIN-PEOPLE-2026-08-18 — pedido do fundador: UMA tela com todas as
// pessoas (entraram / compraram), créditos recebidos, usados, restantes, em
// quê usaram e as datas. Números vêm do /api/admin/people, que deriva
// "recebeu" pela identidade usado+restante (imune ao drift que deixava as
// telas antigas "com informações erradas").
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { PersonRow } from '@/app/api/admin/people/route'

const CARD: React.CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

interface Summary {
  total: number
  active_subs: number
  churned: number
  one_time: number
  credits_in_circulation: number
  credits_used_total: number
  // #295 — o lado entregue do placar.
  made_videos_total: number
  made_animations_total: number
  made_images_total: number
  made_audios_total: number
  burned_nothing_delivered: number
  burned_credits: number
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

// KINEO-PAIDKIND-2026-08-19 — 'sub' = assinatura ativa (o que o Stripe
// mostra) · 'left' = assinou e cancelou (coorte nº1 de win-back: já confiou o
// cartão uma vez) · 'pack' = pagamento avulso, nunca assinou.
function kindBadge(k: PersonRow['paid_kind']): { label: string; color: string } | null {
  if (k === 'active') return { label: 'sub', color: '#34d399' }
  if (k === 'churned') return { label: 'left', color: '#f87171' }
  if (k === 'one_time') return { label: 'pack', color: '#fbbf24' }
  return null
}

function usageLabel(p: PersonRow): string {
  const parts: string[] = []
  if (p.used_video > 0) parts.push(`🎬 ${p.used_video}`)
  if (p.used_image > 0) parts.push(`🖼 ${p.used_image}`)
  if (p.used_audio > 0) parts.push(`🎙 ${p.used_audio}`)
  if (p.used_enhance > 0) parts.push(`✨ ${p.used_enhance}`)
  if (p.used_other > 0) parts.push(`• ${p.used_other}`)
  return parts.length ? parts.join(' · ') : '—'
}

// #295 — O QUE A PESSOA RECEBEU (o contra-peso de `usageLabel`, que mostra só
// o que ela GASTOU). Ler as duas colunas lado a lado responde, numa olhada, a
// pergunta que abriu esta mudança: "gastou 40 e não fez nada?" — se a coluna
// da direita mostra `🎞 6 · 🖼 2`, o produto funcionou e a leitura anterior
// era um ponto cego do painel, não um cliente insatisfeito.
// #297 — o botão que faltava. Fica na linha da pessoa, e não numa tela
// separada, porque a decisão de dar crédito nasce olhando o histórico dela
// ("gastou 40 e não recebeu nada") — obrigar a copiar o e-mail para outro
// lugar é o atrito que faz a cortesia não acontecer.
function GrantButton({ email, onClick }: { email: string; onClick: (email: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(email)}
      title="Dar créditos a esta pessoa"
      style={{
        background: 'rgba(41,151,255,.12)',
        border: '1px solid rgba(41,151,255,.35)',
        color: '#2997ff',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 800,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      + créditos
    </button>
  )
}

// ═══ KINEO-PERSON-MEDIA-2026-08-25 — "abrir um espaço e ver TODOS os vídeos
// que aquele cliente já fez" (fundador, 25/08, preocupado com trials de 25cr
// zerando sem vídeo visível). O botão 🎬 abre a obra inteira da pessoa:
// cada vídeo clicável com motor real, status e data, mais as entregas que
// nunca viram linha em `videos` (imagens/áudios/animações — o ponto cego do
// #295) e os bloqueios do guard de roteiro (o caso Pedro).
interface PersonMedia {
  email: string
  credits: number | null
  plan: string | null
  trial: { granted: number; used: number } | null
  signup_at: string | null
  videos: Array<{ id: string; url: string | null; thumb: string | null; topic: string | null; quality: string | null; status: string | null; created_at: string; credits: number | null; seconds: number | null }>
  images_total: number
  audios_total: number
  animations_delivered: number
  guard_blocks: Array<{ at: string; detail: { speech_seconds?: number; target_seconds?: number } | null }>
}

const MEDIA_ENGINE_LABEL: Record<string, string> = {
  fast: 'Kineo 1', cinematic_ai: 'Seedance', cinematic_kling: 'Kling 2.5', cinematic_veo: 'Veo 3.1',
  cinematic_h3: 'MiniMax H3', cinematic_hollywood: 'Kling 3', cinematic_omni: 'Omni Flash',
  avatar: 'Avatar', presenter: 'Presenter',
}

function MediaButton({ email, onClick }: { email: string; onClick: (email: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(email)}
      title="Ver todos os vídeos desta pessoa"
      style={{
        background: 'rgba(167,139,250,.12)',
        border: '1px solid rgba(167,139,250,.35)',
        color: '#a78bfa',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 800,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      🎬 vídeos
    </button>
  )
}

function deliveredLabel(p: PersonRow): string {
  const parts: string[] = []
  if (p.made_videos > 0) parts.push(`🎞 ${p.made_videos}`)
  if (p.made_animations > 0) parts.push(`🌀 ${p.made_animations}`)
  if (p.made_images > 0) parts.push(`🖼 ${p.made_images}`)
  if (p.made_audios > 0) parts.push(`🔊 ${p.made_audios}`)
  return parts.length ? parts.join(' · ') : '—'
}

export default function PeopleClient({ denied }: { denied?: boolean }) {
  const [people, setPeople] = useState<PersonRow[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  // #297 — estado do concessor de crédito. Ver a nota em
  // app/api/admin/grant-credits/route.ts: este botão existe porque uma
  // promessa de 100 créditos morreu por não haver onde clicar.
  const [grantFor, setGrantFor] = useState<string | null>(null)
  const [grantAmount, setGrantAmount] = useState('100')
  const [grantReason, setGrantReason] = useState('')
  const [granting, setGranting] = useState(false)
  const [grantMsg, setGrantMsg] = useState<string | null>(null)
  // KINEO-PERSON-MEDIA-2026-08-25 — o raio-X de mídia da pessoa clicada.
  const [mediaFor, setMediaFor] = useState<string | null>(null)
  const [media, setMedia] = useState<PersonMedia | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)

  useEffect(() => {
    if (!mediaFor) { setMedia(null); setMediaError(null); return }
    let cancelled = false
    setMedia(null)
    setMediaError(null)
    void fetch(`/api/admin/person-media?email=${encodeURIComponent(mediaFor)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<PersonMedia>
      })
      .then((json) => { if (!cancelled) setMedia(json) })
      .catch(() => { if (!cancelled) setMediaError('Falhou ao carregar a mídia desta pessoa.') })
    return () => { cancelled = true }
  }, [mediaFor])

  const load = () => {
    void fetch('/api/admin/people', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<{ people: PersonRow[]; summary: Summary }>
      })
      .then((json) => {
        setPeople(json.people)
        setSummary(json.summary)
      })
      .catch(() => setError('Failed to load people.'))
  }

  useEffect(() => {
    if (denied) return
    let cancelled = false
    void fetch('/api/admin/people', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json() as Promise<{ people: PersonRow[]; summary: Summary }>
      })
      .then((json) => {
        if (cancelled) return
        setPeople(json.people)
        setSummary(json.summary)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load people.')
      })
    return () => {
      cancelled = true
    }
  }, [denied])

  // #297 — concede e RECARREGA a lista: o admin precisa ver o saldo novo na
  // linha, senão fica sem saber se funcionou e concede duas vezes.
  const submitGrant = async () => {
    if (!grantFor || granting) return
    setGranting(true)
    setGrantMsg(null)
    try {
      const r = await fetch('/api/admin/grant-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantFor,
          amount: Number(grantAmount),
          reason: grantReason,
        }),
      })
      const json = (await r.json()) as { error?: string; before?: number; after?: number }
      if (!r.ok) {
        setGrantMsg(json.error ?? 'Falhou.')
        return
      }
      setGrantMsg(`✓ ${grantFor}: ${json.before} → ${json.after} créditos`)
      setGrantReason('')
      setGrantFor(null)
      load()
    } catch {
      setGrantMsg('Falhou ao conceder.')
    } finally {
      setGranting(false)
    }
  }

  const filtered = useMemo(() => {
    const base = (people ?? []).filter((p) => !p.is_internal) // fundador/teste fora
    const needle = q.trim().toLowerCase()
    if (!needle) return base
    return base.filter(
      (p) => p.email.toLowerCase().includes(needle) || (p.name ?? '').toLowerCase().includes(needle) || (p.country ?? '').toLowerCase() === needle,
    )
  }, [people, q])

  const KIND_ORDER: Record<string, number> = { active: 0, churned: 1, one_time: 2 }
  const buyers = useMemo(
    () => filtered.filter((p) => p.paid_kind).sort((a, b) => (KIND_ORDER[a.paid_kind!] ?? 9) - (KIND_ORDER[b.paid_kind!] ?? 9)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered],
  )
  const everyone = useMemo(() => (showAll ? filtered : filtered.slice(0, 250)), [filtered, showAll])

  if (denied) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center" style={CARD}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: '#f5f5f7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#86868b' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#34d399' }}>
          Admin · People
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          Everyone — credits in, credits out
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          &quot;Granted&quot; = used + left (accounting identity, can&apos;t drift). &quot;Spent on&quot; comes from the
          credit ledger: 🎬 video · 🖼 image · 🎙 voice · ✨ HD enhance (numbers are credits, not counts).
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Paying', href: '/admin/paying' },
            { label: 'Users', href: '/admin/users' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#86868b' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            ['Signups', summary.total, '#f5f5f7'],
            // KINEO-PAIDKIND-2026-08-19 — o placar espelha o Stripe: ativos
            // = assinatura pagando AGORA (era 'Paying' com has_paid cru, que
            // somava cancelados + packs e mostrava 10 quando o Stripe tem 6).
            ['Active subs', summary.active_subs, '#34d399'],
            ['Churned', summary.churned, '#f87171'],
            ['One-time', summary.one_time, '#fbbf24'],
            ['Credits in wallets', summary.credits_in_circulation, '#2997ff'],
            ['Credits spent', summary.credits_used_total, '#a1a1a8'],
            // #295 — o que o dinheiro virou. Um placar de gasto sem um placar
            // de ENTREGA mede o custo e ignora o produto.
            ['Videos made', summary.made_videos_total, '#34d399'],
            ['Animations', summary.made_animations_total, '#34d399'],
            ['Images', summary.made_images_total, '#34d399'],
            ['Voiceovers', summary.made_audios_total, '#34d399'],
            // O alarme fica ao lado do placar de propósito: número ruim
            // escondido numa aba é número que ninguém age em cima.
            ['⚠ Burned (nothing back)', summary.burned_nothing_delivered, summary.burned_nothing_delivered > 0 ? '#f87171' : '#34d399'],
            ['⚠ Credits burned', summary.burned_credits, summary.burned_credits > 0 ? '#f87171' : '#34d399'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-2xl px-4 py-3" style={CARD}>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#86868b' }}>{label}</div>
              <div className="text-xl font-black" style={{ color: color as string }}>{(value as number).toLocaleString('en-US')}</div>
            </div>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search email, name, or country code…"
        className="w-full rounded-xl px-4 py-2.5 mb-6 text-sm"
        style={{ background: '#131316', border: '1px solid #2a2a2d', color: '#f5f5f7', outline: 'none' }}
      />

      {!people && !error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>Loading…</div>
      )}
      {error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#f87171' }}>{error}</div>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>
            💰 Bought ({buyers.length}) — {buyers.filter((b) => b.paid_kind === 'active').length} active · {buyers.filter((b) => b.paid_kind === 'churned').length} left · {buyers.filter((b) => b.paid_kind === 'one_time').length} pack
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            <b style={{ color: '#34d399' }}>sub</b> = paying now (mirrors Stripe) · <b style={{ color: '#f87171' }}>left</b> = subscribed and cancelled (hottest win-back cohort) · <b style={{ color: '#fbbf24' }}>pack</b> = paid once, never subscribed.
          </p>
          <Table
            head={['Email', 'Type', 'Plan', 'First paid', 'Granted', 'Used', 'Left', 'Spent on', 'Got back', 'Last activity', '']}
            border="rgba(52,211,153,.4)"
            empty="No paying customers match."
            rows={buyers.map((p) => [
              <Mono key="e" text={p.email} badge={kindBadge(p.paid_kind)?.label} badgeColor={kindBadge(p.paid_kind)?.color} />,
              kindBadge(p.paid_kind)?.label ?? '—',
              p.plan ?? '—',
              fmtDate(p.first_paid),
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#fb923c' : '#2997ff' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              <span key="g" style={{ color: p.burned_nothing_delivered ? '#f87171' : '#34d399', fontWeight: 700 }}>
                {p.burned_nothing_delivered ? '⚠ nothing' : deliveredLabel(p)}
              </span>,
              fmtDate(p.last_use),
              <span key="gr" style={{ display: 'inline-flex', gap: 4 }}><GrantButton email={p.email} onClick={setGrantFor} /><MediaButton email={p.email} onClick={setMediaFor} /></span>,
            ])}
          />
        </section>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f5f5f7' }}>
            👥 Everyone ({filtered.length}{!showAll && filtered.length > 250 ? ' — showing 250' : ''})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#86868b' }}>
            Every signup, newest first, with the full credit story per person.
          </p>
          <Table
            head={['Email', 'Signed up', 'Country', 'Plan', 'Granted', 'Used', 'Left', 'Spent on', 'Got back', 'Last activity', '']}
            border="rgba(255,255,255,.14)"
            empty="No one matches."
            rows={everyone.map((p) => [
              <Mono key="e" text={p.email} badge={kindBadge(p.paid_kind)?.label} badgeColor={kindBadge(p.paid_kind)?.color} />,
              fmtDate(p.signup),
              p.country ? `${flagEmoji(p.country)} ${p.country}` : '—',
              p.plan ?? '—',
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#fb923c' : '#2997ff' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              <span key="g" style={{ color: p.burned_nothing_delivered ? '#f87171' : '#34d399', fontWeight: 700 }}>
                {p.burned_nothing_delivered ? '⚠ nothing' : deliveredLabel(p)}
              </span>,
              fmtDate(p.last_use),
              <span key="gr" style={{ display: 'inline-flex', gap: 4 }}><GrantButton email={p.email} onClick={setGrantFor} /><MediaButton email={p.email} onClick={setMediaFor} /></span>,
            ])}
          />
          {!showAll && filtered.length > 250 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: '#131316', border: '1px solid #2a2a2d', color: '#86868b', cursor: 'pointer' }}
            >
              Show all {filtered.length} →
            </button>
          )}
        </section>
      )}

      {/* #297 — painel de concessão. Aparece sobre a tela com o e-mail JÁ
          preenchido: quem clicou no botão daquela linha não deve ter que
          digitar de novo o endereço que estava olhando (é assim que se
          credita a pessoa errada). */}
      {grantFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !granting && setGrantFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#131316',
              border: '1px solid #2a2a2d',
              borderRadius: 14,
              padding: 22,
              width: 420,
              maxWidth: '92vw',
            }}
          >
            <h3 style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
              Dar créditos
            </h3>
            <p style={{ color: '#86868b', fontSize: 11, marginBottom: 14, wordBreak: 'break-all' }}>
              {grantFor}
            </p>

            <label style={{ color: '#86868b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
              Quantidade
            </label>
            <input
              type="number"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              style={{
                width: '100%',
                background: '#0a0a0c',
                border: '1px solid #2a2a2d',
                borderRadius: 8,
                color: '#f5f5f7',
                padding: '9px 11px',
                fontSize: 13,
                marginTop: 5,
                marginBottom: 12,
              }}
            />

            <label style={{ color: '#86868b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
              Motivo (fica no histórico)
            </label>
            <input
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="ex: review no Product Hunt, compensação por falha"
              style={{
                width: '100%',
                background: '#0a0a0c',
                border: '1px solid #2a2a2d',
                borderRadius: 8,
                color: '#f5f5f7',
                padding: '9px 11px',
                fontSize: 12,
                marginTop: 5,
                marginBottom: 16,
              }}
            />

            {grantMsg && (
              <p style={{ color: grantMsg.startsWith('✓') ? '#34d399' : '#f87171', fontSize: 11, marginBottom: 10 }}>
                {grantMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => void submitGrant()}
                disabled={granting || grantReason.trim().length < 3}
                style={{
                  flex: 1,
                  background: grantReason.trim().length < 3 ? '#1c1c20' : '#2997ff',
                  border: 'none',
                  borderRadius: 8,
                  color: grantReason.trim().length < 3 ? '#5a5a60' : '#fff',
                  padding: '10px 0',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: granting || grantReason.trim().length < 3 ? 'not-allowed' : 'pointer',
                }}
              >
                {granting ? 'Dando…' : 'Dar créditos'}
              </button>
              <button
                type="button"
                onClick={() => setGrantFor(null)}
                disabled={granting}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a2d',
                  borderRadius: 8,
                  color: '#86868b',
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ KINEO-PERSON-MEDIA-2026-08-25 — o espaço com TODOS os vídeos da
          pessoa (independente do tempo), clicáveis. Clicar fora fecha. */}
      {mediaFor && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setMediaFor(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
        >
          <div style={{ ...CARD, width: '100%', maxWidth: 860, padding: '22px 24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <h3 style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 900 }}>🎬 Tudo que esta pessoa fez</h3>
              <button type="button" onClick={() => setMediaFor(null)} style={{ background: 'transparent', border: 'none', color: '#86868b', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#86868b', fontSize: 11, marginBottom: 12, wordBreak: 'break-all' }}>{mediaFor}</p>

            {!media && !mediaError && <p style={{ color: '#86868b', fontSize: 12 }}>Carregando…</p>}
            {mediaError && <p style={{ color: '#f87171', fontSize: 12 }}>{mediaError}</p>}

            {media && (
              <>
                <p style={{ color: '#c7c7cc', fontSize: 11.5, marginBottom: 12 }}>
                  Saldo <b style={{ color: '#2997ff' }}>{media.credits ?? '—'} cr</b>
                  {media.trial ? <> · trial {media.trial.granted} concedidos, {media.trial.used} no contador</> : null}
                  {media.plan ? <> · plano {media.plan}</> : null}
                  {' '}· 🎞 {media.videos.length} vídeos · 🖼 {media.images_total} imagens · 🔊 {media.audios_total} áudios · 🌀 {media.animations_delivered} animações
                </p>

                {media.guard_blocks.length > 0 && (
                  <p style={{ color: '#fbbf24', fontSize: 11, marginBottom: 12 }}>
                    ✋ {media.guard_blocks.length}× barrado pelo guard de roteiro curto (crédito devolvido automaticamente desde o #325)
                    {media.guard_blocks[0]?.detail?.speech_seconds != null ? ` — último: ${media.guard_blocks[0].detail.speech_seconds}s de fala para pedido de ${media.guard_blocks[0].detail.target_seconds}s` : ''}
                  </p>
                )}

                {media.videos.length === 0 ? (
                  <p style={{ color: '#86868b', fontSize: 12 }}>
                    Nenhum vídeo na conta — os créditos (se gastos) foram em imagens/áudio/animação, ou as gerações falharam/foram barradas e estornadas.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                    {media.videos.map((v) => (
                      <a
                        key={v.id}
                        href={v.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', textDecoration: 'none', background: '#0a0a0c', border: '1px solid #2a2a2d', borderRadius: 10, overflow: 'hidden', opacity: v.url ? 1 : 0.55 }}
                      >
                        <div style={{ aspectRatio: '9/16', maxHeight: 190, background: v.thumb ? `url(${v.thumb}) center/cover` : '#131316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {!v.thumb && <span style={{ fontSize: 22 }}>{v.url ? '▶' : '⏳'}</span>}
                        </div>
                        <div style={{ padding: '7px 9px' }}>
                          <div style={{ color: '#a78bfa', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' }}>
                            {MEDIA_ENGINE_LABEL[v.quality ?? ''] ?? v.quality ?? '—'}{v.status && v.status !== 'completed' ? ` · ${v.status}` : ''}
                          </div>
                          <div style={{ color: '#c7c7cc', fontSize: 10.5, lineHeight: 1.35, maxHeight: 42, overflow: 'hidden' }}>
                            {v.topic ?? 'Untitled'}
                          </div>
                          <div style={{ color: '#5a5a60', fontSize: 9.5, marginTop: 3 }}>
                            {fmtDate(v.created_at)}
                            {/* Custo SEMPRE com a duracao ao lado: o Kineo 1 e
                                5 cr por 60s, mas 4 por 45s e 3 por 30s. Ver o
                                "4" sozinho parece erro de cobranca; ver
                                "4 cr · 45s" e a conta certa. */}
                            {v.credits != null ? ` · ${v.credits} cr` : ''}
                            {v.seconds != null ? ` · ${v.seconds}s` : ''}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmação depois de fechar o painel — sem isto o admin não sabe se
          a concessão pegou e acaba concedendo de novo. */}
      {!grantFor && grantMsg?.startsWith('✓') && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            right: 18,
            background: 'rgba(52,211,153,.14)',
            border: '1px solid rgba(52,211,153,.4)',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            zIndex: 60,
          }}
          onClick={() => setGrantMsg(null)}
        >
          {grantMsg}
        </div>
      )}
    </Shell>
  )
}

function Mono({ text, badge, badgeColor }: { text: string; badge?: string; badgeColor?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.82rem' }}>{text || '—'}</span>
      {badge && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase"
          style={{ background: `${badgeColor}1f`, color: badgeColor, border: `1px solid ${badgeColor}59` }}
        >
          {badge}
        </span>
      )}
    </span>
  )
}

function Table({ head, rows, border, empty }: { head: string[]; rows: React.ReactNode[][]; border: string; empty: string }) {
  return (
    <div className="rounded-2xl overflow-x-auto" style={{ ...CARD, border: `1px solid ${border}` }}>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: '#86868b' }}>{empty}</div>
      ) : (
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1d1d1f' }}>
              {head.map((h) => (
                <th
                  key={h}
                  className="font-black uppercase tracking-widest"
                  style={{ fontSize: '0.62rem', color: '#86868b', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} style={{ borderTop: '1px solid #2a2a2d' }}>
                {cells.map((c, j) => (
                  <td key={j} style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap' }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1500px] mx-auto">{children}</div>
    </div>
  )
}
