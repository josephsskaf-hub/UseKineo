'use client'

// KINEO-EQUIPE-BUSINESS-2026-10-10 — o aceite do convite da equipe Business. Um clique → POST /api/ads/team { action: 'accept' }.
// Quem decide é o servidor; aqui só a frase de cada recusa.

import { useState } from 'react'

const CSS = `.kjoin{max-width:560px;margin:0 auto;padding:32px 16px 48px;color:inherit}
.kjoin h1{font-size:24px;margin:0 0 10px}
.kjoin p{line-height:1.5}
.kjoin button{padding:12px 18px;border-radius:10px;border:0;background:#7c5cff;color:#fff;font-weight:600;cursor:pointer}
.kjoin button:disabled{opacity:.5;cursor:default}
.kjoin .err{color:#ff8a8a}
.kjoin .ok{color:#7ee2a8}
.kjoin a{text-decoration:underline}`

const ERRORS: Record<string, string> = {
  invite_invalid: 'This invite link is not valid anymore. Ask for a new one.',
  invite_expired: 'This invite expired. Ask for a new one.',
  email_mismatch: 'This invite was sent to another e-mail. Sign in with the invited e-mail and open the link again.',
  owner_not_business: 'The team owner is not on the Business plan right now.',
  you_are_business: 'Your account already has its own Business plan, so you work in your own workspace.',
  already_in_team: 'Your account is already in another team. Leave it first (Studio Ads → Team).',
  own_team: 'This is your own team.',
  not_ready: 'Teams are not switched on yet. Try again later.',
}

export default function JoinClient({ token, email }: { token: string; email: string | null }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/ads/team', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', token }) })
      const data = (await res.json().catch(() => ({}))) as { error?: string; owner_label?: string | null }
      if (res.ok) setDone(data.owner_label ?? 'your team')
      else setError(ERRORS[data.error ?? ''] ?? 'Could not join the team. Try again.')
    } catch {
      setError('Could not join the team. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <div className="kjoin">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1>Join a team on Kineo</h1>
      {done ? (
        <>
          <p className="ok">You joined <b>{done}</b>&apos;s workspace.</p>
          <p>Ads you make in Studio Ads now use the team&apos;s credits and land in the team&apos;s library. Your own films, clips and images stay in your account.</p>
          <p>
            <a href="/ads/v2">Make an ad</a>
          </p>
        </>
      ) : (
        <>
          <p>You were invited to make ads in a company&apos;s Studio Ads workspace{email ? <> as <b>{email}</b></> : null}.</p>
          <button type="button" onClick={join} disabled={busy || !token}>{busy ? 'Joining…' : 'Join the team'}</button>
          {!token ? <p className="err">{ERRORS.invite_invalid}</p> : null}
          {error ? <p className="err">{error}</p> : null}
        </>
      )}
    </div>
  )
}
