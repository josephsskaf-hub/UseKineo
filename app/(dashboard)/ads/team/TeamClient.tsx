'use client'

// KINEO-EQUIPE-BUSINESS-2026-10-10 — a tela da equipe do Business (/ads/team). Lê e escreve só por /api/ads/team.
// O link do convite aparece UMA vez (o banco guarda só o hash): o dono copia e manda pelo canal dele — o código ainda não
// manda e-mail. Cancelar e convidar de novo gera um link novo.

import { useCallback, useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'

const CSS = `.kteam{max-width:760px;margin:0 auto;padding:24px 16px 48px;color:inherit}
.kteam h1{font-size:26px;margin:0 0 6px}
.kteam .sub{opacity:.75;margin:0 0 20px;line-height:1.5}
.kteam .card{border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;margin:0 0 16px;background:rgba(255,255,255,.03)}
.kteam .row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.kteam .row:first-of-type{border-top:0}
.kteam .tag{font-size:12px;padding:2px 8px;border-radius:999px;background:rgba(124,92,255,.18)}
.kteam .tag.pending{background:rgba(255,196,0,.16)}
.kteam .tag.expired{background:rgba(255,80,80,.16)}
.kteam form{display:flex;gap:8px;flex-wrap:wrap}
.kteam input{flex:1 1 240px;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:inherit}
.kteam button{padding:10px 14px;border-radius:10px;border:0;background:#7c5cff;color:#fff;font-weight:600;cursor:pointer}
.kteam button.ghost{background:transparent;border:1px solid rgba(255,255,255,.22);color:inherit;font-weight:500}
.kteam button:disabled{opacity:.5;cursor:default}
.kteam .link{word-break:break-all;font-family:ui-monospace,monospace;font-size:12px;padding:10px;border-radius:10px;background:rgba(0,0,0,.3);margin:8px 0}
.kteam .err{color:#ff8a8a;margin:8px 0 0}
.kteam .ok{color:#7ee2a8;margin:8px 0 0}
.kteam a{text-decoration:underline}`

interface TeamItem {
  id: string
  email: string
  seat: number
  status: 'pending' | 'active' | 'expired' | string
  expires_at: string
}
interface TeamView {
  role: 'owner' | 'member'
  business?: boolean
  credits: number | null
  seats: number
  team?: TeamItem[]
  owner_label?: string | null
  team_ready: boolean
}

const ERRORS: Record<string, string> = {
  business_only: 'Teams come with the Business plan.',
  bad_email: 'Type a valid e-mail.',
  own_email: 'That is your own e-mail.',
  already_invited: 'This e-mail already has an invite or is in the team.',
  seats_full: 'All team seats are taken. Remove someone or cancel an invite first.',
  not_ready: 'Teams are not switched on yet. Try again later.',
}

async function call<T>(method: 'GET' | 'POST', body?: object): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const res = await fetch('/api/ads/team', { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } as T & { error?: string } }
  }
}

export default function TeamClient({ seats, inviteDays, businessHref }: { seats: number; inviteDays: number; businessHref: string }) {
  const [view, setView] = useState<TeamView | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [link, setLink] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await call<TeamView>('GET')
    if (r.ok) {
      setView(r.data)
      setLoadError(false)
    } else setLoadError(true)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setLink(null)
    const r = await call<{ path?: string; email?: string }>('POST', { action: 'invite', email })
    setBusy(false)
    if (r.ok && r.data.path) {
      setLink(`${window.location.origin}${r.data.path}`)
      setEmail('')
      setMsg({ kind: 'ok', text: `Invite created for ${r.data.email}. Copy the link below and send it — it is shown only once and works for ${inviteDays} days.` })
      void load()
    } else setMsg({ kind: 'err', text: ERRORS[r.data.error ?? ''] ?? 'Could not create the invite. Try again.' })
  }

  async function act(body: object, okText: string) {
    setBusy(true)
    setMsg(null)
    const r = await call('POST', body)
    setBusy(false)
    setMsg(r.ok ? { kind: 'ok', text: okText } : { kind: 'err', text: ERRORS[r.data.error ?? ''] ?? 'Something went wrong. Try again.' })
    void load()
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setMsg({ kind: 'ok', text: 'Link copied.' })
    } catch {
      setMsg({ kind: 'err', text: 'Copy failed — select the link and copy it by hand.' })
    }
  }

  const team = view?.team ?? []
  const live = team.filter((t) => t.status === 'pending' || t.status === 'active').length

  return (
    <div className="kteam">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1><UiLabel>Team</UiLabel></h1>
      {loadError ? <p className="err">Could not load your team. Refresh the page.</p> : null}
      {!view && !loadError ? <p className="sub">Loading…</p> : null}

      {view?.role === 'member' ? (
        <div className="card">
          <p>
            You are working in <b>{view.owner_label ?? 'your team'}</b>&apos;s workspace. Your ads in Studio Ads use their credits ({view.credits ?? '…'} left) and land in their library.
          </p>
          <p className="sub">Your own films, clips and images stay in your account.</p>
          <p>
            <a href="/ads/v2">Make an ad</a>
          </p>
          <button type="button" className="ghost" disabled={busy} onClick={() => act({ action: 'leave' }, 'You left the team.')}>
            Leave the team
          </button>
        </div>
      ) : null}

      {view?.role === 'owner' && !view.business ? (
        <div className="card">
          <p>
            The Business plan includes {seats} teammates who make ads with your company&apos;s credits.
          </p>
          <p>
            <a href={businessHref}>See the Business plan</a>
          </p>
        </div>
      ) : null}

      {view?.role === 'owner' && view.business ? (
        <>
          <p className="sub">
            Invite up to {seats} teammates. They sign in with their own Kineo account and make ads in Studio Ads with your credits ({view.credits ?? '…'} left). Every ad lands in your library and shows who made it.
          </p>
          {!view.team_ready ? <p className="err">{ERRORS.not_ready}</p> : null}
          <div className="card">
            <form onSubmit={invite}>
              <input type="email" required placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Teammate e-mail" disabled={busy || live >= seats} />
              <button type="submit" disabled={busy || live >= seats || !email.trim()}>Invite</button>
            </form>
            <p className="sub" style={{ margin: '8px 0 0' }}>
              {live} of {seats} seats used.
            </p>
            {link ? (
              <>
                <div className="link">{link}</div>
                <button type="button" className="ghost" onClick={copy}>Copy link</button>
              </>
            ) : null}
          </div>
          <div className="card">
            {team.length === 0 ? <p className="sub" style={{ margin: 0 }}>No teammates yet.</p> : null}
            {team.map((t) => (
              <div key={t.id} className="row">
                <span>
                  {t.email} <span className={`tag ${t.status}`}>{t.status === 'active' ? 'active' : t.status === 'expired' ? 'invite expired' : 'invite pending'}</span>
                </span>
                {t.status === 'active' ? (
                  <button type="button" className="ghost" disabled={busy} onClick={() => act({ action: 'remove', row_id: t.id }, `${t.email} was removed.`)}>Remove</button>
                ) : (
                  <button type="button" className="ghost" disabled={busy} onClick={() => act({ action: 'revoke', invite_id: t.id }, 'Invite cancelled.')}>Cancel invite</button>
                )}
              </div>
            ))}
          </div>
          <p>
            <a href="/ads/v2">Back to Studio Ads</a>
          </p>
        </>
      ) : null}

      {msg ? <p className={msg.kind}>{msg.text}</p> : null}
    </div>
  )
}
