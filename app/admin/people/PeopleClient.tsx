'use client'

// KINEO-ADMIN-PEOPLE-2026-08-18 — pedido do fundador: UMA tela com todas as
// pessoas (entraram / compraram), créditos recebidos, usados, restantes, em
// quê usaram e as datas. Números vêm do /api/admin/people, que deriva
// "recebeu" pela identidade usado+restante (imune ao drift que deixava as
// telas antigas "com informações erradas").
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { PersonRow } from '@/app/api/admin/people/route'

const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid #1F2530', borderRadius: 20 }

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
  if (k === 'active') return { label: 'sub', color: '#5FD4A4' }
  if (k === 'churned') return { label: 'left', color: '#FF8787' }
  if (k === 'one_time') return { label: 'pack', color: '#FFBF58' }
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
        color: '#8DB4FF',
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

// KINEO-CORTESIA-2026-10-03 — "Cortesia": plano creator_trial/studio_trial com créditos, validade e motivo. Diferente
// do "+ créditos" (só saldo, a conta free continua recusada nos motores). Regra em lib/courtesy.ts.
function CourtesyButton({ email, onClick }: { email: string; onClick: (email: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(email)}
      title="Cortesia: libera os motores por um prazo (creator_trial/studio_trial), com créditos e motivo"
      style={{ background: 'rgba(95,212,164,.12)', border: '1px solid rgba(95,212,164,.35)', color: '#5FD4A4', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      cortesia
    </button>
  )
}

function planLabel(p: PersonRow): string {
  if (!p.courtesy_level) return p.plan ?? '—'
  return `${p.plan ?? '—'} · cortesia até ${fmtDate(p.courtesy_until)}`
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
  videos: Array<{ id: string; url: string | null; thumb: string | null; topic: string | null; topic_full?: string | null; narration?: string | null; prompt_is_ui?: boolean; coherence?: { score: number; verdict: string; problems: string[]; summary: string; request_pt?: string; narration_vs_visuals: number | null; prompt_vs_narration: number } | null; quality: string | null; status: string | null; created_at: string; credits: number | null; seconds: number | null }>
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
        color: '#C4B5FD',
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
  // KINEO-CORTESIA-2026-10-03 — estado do painel de cortesia.
  const [courtesyFor, setCourtesyFor] = useState<string | null>(null)
  const [courtesyLevel, setCourtesyLevel] = useState<'creator_trial' | 'studio_trial'>('creator_trial')
  const [courtesyCredits, setCourtesyCredits] = useState('25')
  const [courtesyDays, setCourtesyDays] = useState('30')
  const [courtesyReason, setCourtesyReason] = useState('')
  const [courtesyBusy, setCourtesyBusy] = useState(false)
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

  const submitCourtesy = async () => {
    if (!courtesyFor || courtesyBusy) return
    setCourtesyBusy(true)
    setGrantMsg(null)
    try {
      const r = await fetch('/api/admin/courtesy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: courtesyFor, level: courtesyLevel, credits: Number(courtesyCredits), days: Number(courtesyDays), reason: courtesyReason }),
      })
      const json = (await r.json()) as { error?: string; before?: number; after?: number; ends_at?: string; level?: string }
      if (!r.ok) { setGrantMsg(json.error ?? 'Falhou.'); return }
      setGrantMsg(`✓ ${courtesyFor}: cortesia ${json.level} até ${fmtDate(json.ends_at ?? null)} · ${json.before} → ${json.after} créditos`)
      setCourtesyReason('')
      setCourtesyFor(null)
      load()
    } catch {
      setGrantMsg('Falhou ao conceder a cortesia.')
    } finally {
      setCourtesyBusy(false)
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
          <h1 className="text-xl font-black mb-2" style={{ color: '#F2F4F7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#9AA3B2' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#5FD4A4' }}>
          Admin · People
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#F2F4F7' }}>
          Everyone — credits in, credits out
        </h1>
        <p className="text-xs mt-1" style={{ color: '#9AA3B2' }}>
          &quot;Granted&quot; = used + left (accounting identity, can&apos;t drift). &quot;Spent on&quot; comes from the
          credit ledger: 🎬 video · 🖼 image · 🎙 voice · ✨ HD enhance (numbers are credits, not counts).
        </p>
        <nav className="adm-legacy-nav flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Paying', href: '/admin/paying' },
            { label: 'Users', href: '/admin/users' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#9AA3B2' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            ['Signups', summary.total, '#F2F4F7'],
            // KINEO-PAIDKIND-2026-08-19 — o placar espelha o Stripe: ativos
            // = assinatura pagando AGORA (era 'Paying' com has_paid cru, que
            // somava cancelados + packs e mostrava 10 quando o Stripe tem 6).
            ['Active subs', summary.active_subs, '#5FD4A4'],
            ['Churned', summary.churned, '#FF8787'],
            ['One-time', summary.one_time, '#FFBF58'],
            ['Credits in wallets', summary.credits_in_circulation, '#8DB4FF'],
            ['Credits spent', summary.credits_used_total, '#a1a1a8'],
            // #295 — o que o dinheiro virou. Um placar de gasto sem um placar
            // de ENTREGA mede o custo e ignora o produto.
            ['Videos made', summary.made_videos_total, '#5FD4A4'],
            ['Animations', summary.made_animations_total, '#5FD4A4'],
            ['Images', summary.made_images_total, '#5FD4A4'],
            ['Voiceovers', summary.made_audios_total, '#5FD4A4'],
            // O alarme fica ao lado do placar de propósito: número ruim
            // escondido numa aba é número que ninguém age em cima.
            ['⚠ Burned (nothing back)', summary.burned_nothing_delivered, summary.burned_nothing_delivered > 0 ? '#FF8787' : '#5FD4A4'],
            ['⚠ Credits burned', summary.burned_credits, summary.burned_credits > 0 ? '#FF8787' : '#5FD4A4'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-2xl px-4 py-3" style={CARD}>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9AA3B2' }}>{label}</div>
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
        style={{ background: 'var(--card)', border: '1px solid #1F2530', color: '#F2F4F7', outline: 'none' }}
      />

      {!people && !error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#9AA3B2' }}>Loading…</div>
      )}
      {error && (
        <div className="rounded-2xl px-5 py-14 text-center text-sm" style={{ ...CARD, color: '#FF8787' }}>{error}</div>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#5FD4A4' }}>
            💰 Bought ({buyers.length}) — {buyers.filter((b) => b.paid_kind === 'active').length} active · {buyers.filter((b) => b.paid_kind === 'churned').length} left · {buyers.filter((b) => b.paid_kind === 'one_time').length} pack
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#9AA3B2' }}>
            <b style={{ color: '#5FD4A4' }}>sub</b> = paying now (mirrors Stripe) · <b style={{ color: '#FF8787' }}>left</b> = subscribed and cancelled (hottest win-back cohort) · <b style={{ color: '#FFBF58' }}>pack</b> = paid once, never subscribed.
          </p>
          <Table
            head={['Email', 'Type', 'Plan', 'First paid', 'Granted', 'Used', 'Left', 'Spent on', 'Got back', 'Last activity', '']}
            border="rgba(52,211,153,.4)"
            empty="No paying customers match."
            rows={buyers.map((p) => [
              <Mono key="e" text={p.email} badge={kindBadge(p.paid_kind)?.label} badgeColor={kindBadge(p.paid_kind)?.color} />,
              kindBadge(p.paid_kind)?.label ?? '—',
              planLabel(p),
              fmtDate(p.first_paid),
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#FB923C' : '#8DB4FF' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              <span key="g" style={{ color: p.burned_nothing_delivered ? '#FF8787' : '#5FD4A4', fontWeight: 700 }}>
                {p.burned_nothing_delivered ? '⚠ nothing' : deliveredLabel(p)}
              </span>,
              fmtDate(p.last_use),
              <span key="gr" style={{ display: 'inline-flex', gap: 4 }}><GrantButton email={p.email} onClick={setGrantFor} /><CourtesyButton email={p.email} onClick={setCourtesyFor} /><MediaButton email={p.email} onClick={setMediaFor} /></span>,
            ])}
          />
        </section>
      )}

      {people && (
        <section className="mb-8">
          <h2 className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#F2F4F7' }}>
            👥 Everyone ({filtered.length}{!showAll && filtered.length > 250 ? ' — showing 250' : ''})
          </h2>
          <p className="text-[11px] mb-3" style={{ color: '#9AA3B2' }}>
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
              planLabel(p),
              p.credits_granted?.toLocaleString('en-US') ?? '—',
              p.credits_used.toLocaleString('en-US'),
              <b key="l" style={{ color: (p.credits_left ?? 0) <= 5 ? '#FB923C' : '#8DB4FF' }}>{p.credits_left?.toLocaleString('en-US') ?? '—'}</b>,
              usageLabel(p),
              <span key="g" style={{ color: p.burned_nothing_delivered ? '#FF8787' : '#5FD4A4', fontWeight: 700 }}>
                {p.burned_nothing_delivered ? '⚠ nothing' : deliveredLabel(p)}
              </span>,
              fmtDate(p.last_use),
              <span key="gr" style={{ display: 'inline-flex', gap: 4 }}><GrantButton email={p.email} onClick={setGrantFor} /><CourtesyButton email={p.email} onClick={setCourtesyFor} /><MediaButton email={p.email} onClick={setMediaFor} /></span>,
            ])}
          />
          {!showAll && filtered.length > 250 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--card)', border: '1px solid #1F2530', color: '#9AA3B2', cursor: 'pointer' }}
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
              background: 'var(--card)',
              border: '1px solid #1F2530',
              borderRadius: 14,
              padding: 22,
              width: 420,
              maxWidth: '92vw',
            }}
          >
            <h3 style={{ color: '#F2F4F7', fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
              Dar créditos
            </h3>
            <p style={{ color: '#9AA3B2', fontSize: 11, marginBottom: 14, wordBreak: 'break-all' }}>
              {grantFor}
            </p>

            <label style={{ color: '#9AA3B2', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
              Quantidade
            </label>
            <input
              type="number"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--card2)',
                border: '1px solid #1F2530',
                borderRadius: 8,
                color: '#F2F4F7',
                padding: '9px 11px',
                fontSize: 13,
                marginTop: 5,
                marginBottom: 12,
              }}
            />

            <label style={{ color: '#9AA3B2', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
              Motivo (fica no histórico)
            </label>
            <input
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="ex: review no Product Hunt, compensação por falha"
              style={{
                width: '100%',
                background: 'var(--card2)',
                border: '1px solid #1F2530',
                borderRadius: 8,
                color: '#F2F4F7',
                padding: '9px 11px',
                fontSize: 12,
                marginTop: 5,
                marginBottom: 16,
              }}
            />

            {grantMsg && (
              <p style={{ color: grantMsg.startsWith('✓') ? '#5FD4A4' : '#FF8787', fontSize: 11, marginBottom: 10 }}>
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
                  background: grantReason.trim().length < 3 ? '#1c1c20' : '#8DB4FF',
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
                  border: '1px solid #1F2530',
                  borderRadius: 8,
                  color: '#9AA3B2',
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

      {/* KINEO-CORTESIA-2026-10-03 — painel de cortesia (mesmo desenho do "Dar créditos"). */}
      {courtesyFor && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => !courtesyBusy && setCourtesyFor(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid #1F2530', borderRadius: 14, padding: 22, width: 420, maxWidth: '92vw' }}>
            <h3 style={{ color: '#F2F4F7', fontSize: 13, fontWeight: 900, marginBottom: 4 }}>Cortesia</h3>
            <p style={{ color: '#9AA3B2', fontSize: 11, marginBottom: 6, wordBreak: 'break-all' }}>{courtesyFor}</p>
            <p style={{ color: '#9AA3B2', fontSize: 10.5, marginBottom: 14, lineHeight: 1.45 }}>
              Libera os motores pelo prazo (plano de trial, nunca plano cheio), soma os créditos e guarda o plano anterior.
              Fica fora de pagantes e do MRR. Só para conta sem plano. No fim do prazo, o cron volta o plano anterior.
            </p>
            {([
              ['Nível', <select key="lv" value={courtesyLevel} onChange={(e) => setCourtesyLevel(e.target.value as 'creator_trial' | 'studio_trial')} style={{ width: '100%', background: 'var(--card2)', border: '1px solid #1F2530', borderRadius: 8, color: '#F2F4F7', padding: '9px 11px', fontSize: 13, marginTop: 5, marginBottom: 12 }}><option value="creator_trial">creator_trial</option><option value="studio_trial">studio_trial</option></select>],
              ['Créditos', <input key="cr" type="number" value={courtesyCredits} onChange={(e) => setCourtesyCredits(e.target.value)} style={{ width: '100%', background: 'var(--card2)', border: '1px solid #1F2530', borderRadius: 8, color: '#F2F4F7', padding: '9px 11px', fontSize: 13, marginTop: 5, marginBottom: 12 }} />],
              ['Validade (dias)', <input key="dy" type="number" value={courtesyDays} onChange={(e) => setCourtesyDays(e.target.value)} style={{ width: '100%', background: 'var(--card2)', border: '1px solid #1F2530', borderRadius: 8, color: '#F2F4F7', padding: '9px 11px', fontSize: 13, marginTop: 5, marginBottom: 12 }} />],
              ['Motivo (fica no histórico)', <input key="rs" value={courtesyReason} onChange={(e) => setCourtesyReason(e.target.value)} placeholder="ex: parceiro de conteúdo, compensação por falha" style={{ width: '100%', background: 'var(--card2)', border: '1px solid #1F2530', borderRadius: 8, color: '#F2F4F7', padding: '9px 11px', fontSize: 12, marginTop: 5, marginBottom: 16 }} />],
            ] as Array<[string, React.ReactNode]>).map(([label, field]) => (
              <div key={label}>
                <label style={{ color: '#9AA3B2', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{label}</label>
                {field}
              </div>
            ))}
            {grantMsg && !grantMsg.startsWith('✓') && <p style={{ color: '#FF8787', fontSize: 11, marginBottom: 10 }}>{grantMsg}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => void submitCourtesy()}
                disabled={courtesyBusy || courtesyReason.trim().length < 3}
                style={{ flex: 1, background: courtesyReason.trim().length < 3 ? '#1c1c20' : '#5FD4A4', border: 'none', borderRadius: 8, color: courtesyReason.trim().length < 3 ? '#5a5a60' : '#0b0b0d', padding: '10px 0', fontSize: 12, fontWeight: 900, cursor: courtesyBusy || courtesyReason.trim().length < 3 ? 'not-allowed' : 'pointer' }}
              >
                {courtesyBusy ? 'Concedendo…' : 'Conceder cortesia'}
              </button>
              <button type="button" onClick={() => setCourtesyFor(null)} disabled={courtesyBusy} style={{ background: 'transparent', border: '1px solid #1F2530', borderRadius: 8, color: '#9AA3B2', padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
              <h3 style={{ color: '#F2F4F7', fontSize: 13, fontWeight: 900 }}>🎬 Tudo que esta pessoa fez</h3>
              <button type="button" onClick={() => setMediaFor(null)} style={{ background: 'transparent', border: 'none', color: '#9AA3B2', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#9AA3B2', fontSize: 11, marginBottom: 12, wordBreak: 'break-all' }}>{mediaFor}</p>

            {!media && !mediaError && <p style={{ color: '#9AA3B2', fontSize: 12 }}>Carregando…</p>}
            {mediaError && <p style={{ color: '#FF8787', fontSize: 12 }}>{mediaError}</p>}

            {media && (
              <>
                <p style={{ color: '#C9CFD8', fontSize: 11.5, marginBottom: 12 }}>
                  Saldo <b style={{ color: '#8DB4FF' }}>{media.credits ?? '—'} cr</b>
                  {media.trial ? <> · trial {media.trial.granted} concedidos, {media.trial.used} no contador</> : null}
                  {media.plan ? <> · plano {media.plan}</> : null}
                  {' '}· 🎞 {media.videos.length} vídeos · 🖼 {media.images_total} imagens · 🔊 {media.audios_total} áudios · 🌀 {media.animations_delivered} animações
                </p>

                {media.guard_blocks.length > 0 && (
                  <p style={{ color: '#FFBF58', fontSize: 11, marginBottom: 12 }}>
                    ✋ {media.guard_blocks.length}× barrado pelo guard de roteiro curto (crédito devolvido automaticamente desde o #325)
                    {media.guard_blocks[0]?.detail?.speech_seconds != null ? ` — último: ${media.guard_blocks[0].detail.speech_seconds}s de fala para pedido de ${media.guard_blocks[0].detail.target_seconds}s` : ''}
                  </p>
                )}

                {media.videos.length === 0 ? (
                  <p style={{ color: '#9AA3B2', fontSize: 12 }}>
                    Nenhum vídeo na conta — os créditos (se gastos) foram em imagens/áudio/animação, ou as gerações falharam/foram barradas e estornadas.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                    {/* KINEO-PROMPT-PROPRIO-2026-09-16 (fundador: "quero ver o que ele escreveu e o vídeo que saiu,
                        para dar nota de coerência"): o card vira a prova inteira — o filme toca aqui mesmo,
                        "O que escreveu" é o prompt inteiro e "O que foi narrado" é a narração que a montagem
                        usou. Prompt que é a nossa própria tela colada ganha alerta vermelho. */}
                    {media.videos.map((v) => (
                      <div
                        key={v.id}
                        style={{ background: 'var(--card2)', border: v.prompt_is_ui ? '1px solid rgba(248,113,113,.6)' : '1px solid #1F2530', borderRadius: 10, overflow: 'hidden', opacity: v.url ? 1 : 0.55 }}
                      >
                        {v.url ? (
                          <video src={v.url} controls preload="metadata" playsInline style={{ display: 'block', width: '100%', aspectRatio: '9/16', maxHeight: 300, background: 'var(--bg)', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ aspectRatio: '9/16', maxHeight: 190, background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 22 }}>⏳</span>
                          </div>
                        )}
                        <div style={{ padding: '7px 9px' }}>
                          <div style={{ color: '#C4B5FD', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' }}>
                            {MEDIA_ENGINE_LABEL[v.quality ?? ''] ?? v.quality ?? '—'}{v.status && v.status !== 'completed' ? ` · ${v.status}` : ''}
                          </div>
                          {v.prompt_is_ui && (
                            <div style={{ color: '#FF8787', fontSize: 10, fontWeight: 800, marginTop: 3 }}>⚠ prompt = texto da nossa própria tela (colado)</div>
                          )}
                          {/* KINEO-1-COERENCIA-2026-09-16 — a nota do juiz (escreveu × narrou × cenas), com os problemas nomeados. */}
                          {v.coherence && (
                            <div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.4 }} data-kineo="coerencia">
                              <span style={{ fontWeight: 900, color: v.coherence.score >= 75 ? '#5FD4A4' : v.coherence.score >= 50 ? '#FFBF58' : '#FF8787' }}>coerência {v.coherence.score}</span>
                              <span style={{ color: '#9AA3B2' }}> · texto {v.coherence.prompt_vs_narration} · visual {v.coherence.narration_vs_visuals ?? '—'}</span>
                              {v.coherence.request_pt && <div style={{ color: '#C9CFD8', marginTop: 2 }}>pediu: {v.coherence.request_pt}</div>}
                              {v.coherence.problems.length > 0 && (
                                <div style={{ color: '#FF8787', marginTop: 2 }}>{v.coherence.problems[0]}</div>
                              )}
                            </div>
                          )}
                          <div style={{ color: '#C9CFD8', fontSize: 10.5, lineHeight: 1.35, maxHeight: 42, overflow: 'hidden' }}>
                            {v.topic ?? 'Untitled'}
                          </div>
                          <details style={{ marginTop: 5 }}>
                            <summary style={{ color: '#8DB4FF', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>O que escreveu ({(v.topic_full ?? v.topic ?? '').length} caracteres)</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', color: '#C9CFD8', fontSize: 10.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 220, overflow: 'auto' }}>{v.topic_full ?? v.topic ?? '—'}</pre>
                          </details>
                          <details style={{ marginTop: 4 }}>
                            <summary style={{ color: '#8DB4FF', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>O que foi narrado{v.narration ? '' : ' (sem registro)'}</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', color: '#C9CFD8', fontSize: 10.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 220, overflow: 'auto' }}>{v.narration ?? 'A montagem não deixou a narração no evento compose_submission_claim para este vídeo.'}</pre>
                          </details>
                          <div style={{ color: '#5a5a60', fontSize: 9.5, marginTop: 3 }}>
                            {fmtDate(v.created_at)}
                            {v.credits != null ? ` · ${v.credits} cr` : ''}
                            {v.seconds != null ? ` · ${v.seconds}s` : ''}
                            {v.url ? <> · <a href={v.url} target="_blank" rel="noreferrer" style={{ color: '#8DB4FF' }}>abrir</a></> : null}
                          </div>
                        </div>
                      </div>
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
      {!grantFor && !courtesyFor && grantMsg?.startsWith('✓') && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            right: 18,
            background: 'rgba(52,211,153,.14)',
            border: '1px solid rgba(52,211,153,.4)',
            color: '#5FD4A4',
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
        <div className="px-5 py-8 text-center text-sm" style={{ color: '#9AA3B2' }}>{empty}</div>
      ) : (
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--card2)' }}>
              {head.map((h) => (
                <th
                  key={h}
                  className="font-black uppercase tracking-widest"
                  style={{ fontSize: '0.62rem', color: '#9AA3B2', textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} style={{ borderTop: '1px solid #1F2530' }}>
                {cells.map((c, j) => (
                  <td key={j} style={{ padding: '10px 14px', color: '#F2F4F7', whiteSpace: 'nowrap' }}>{c}</td>
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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1500px] mx-auto">{children}</div>
    </div>
  )
}
