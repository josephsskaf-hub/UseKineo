'use client'

// components/wall/WallSubmitLink.tsx — KINEO-WALL-2026-08-03
//
// O campo "cola o link" que fecha o loop de retenção do Wall of Proof.
//
// Ele JÁ existia — mas só na tela de sucesso do /generate, ou seja, apenas nos
// segundos seguintes a uma geração. Quem publicou o Short no dia seguinte (o
// caso normal) não tinha onde colar. Este componente é o MESMO fluxo, no lugar
// onde a pessoa naturalmente volta: a própria página do ranking.
//
// Reuso, não reimplementação: POST /api/posted-shorts, exatamente o mesmo
// endpoint, a mesma validação de link, o mesmo upsert deduplicado. Nada de
// tabela nova, nada de rota paralela.
//
// Deslogado: a rota responde 401 e o componente troca para um convite de login
// em vez de mostrar um erro que a pessoa não pode resolver.

import { useState } from 'react'

const BLUE = '#2997ff'
const MUTED = '#86868b'

type State = 'idle' | 'saving' | 'done' | 'error' | 'unauthenticated'

export default function WallSubmitLink() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const value = url.trim()
    if (!value || state === 'saving' || state === 'done') return
    setState('saving')
    setError(null)
    try {
      const res = await fetch('/api/posted-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value }),
      })
      if (res.status === 401) {
        setState('unauthenticated')
        return
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (res.ok && data?.ok) {
        setState('done')
        return
      }
      setState('error')
      setError(typeof data?.error === 'string' ? data.error : 'Could not save your link. Please try again.')
    } catch {
      setState('error')
      setError('Could not save your link. Please try again.')
    }
  }

  return (
    <div
      style={{
        marginTop: 22,
        padding: '16px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {state === 'done' ? (
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
          🎉 Got it — your Short joins the board on the next refresh (a few minutes).
        </p>
      ) : state === 'unauthenticated' ? (
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#d2d2d7', lineHeight: 1.6 }}>
          Log in to add your Short to the wall.{' '}
          <a href="/login?redirect=/wall" style={{ color: BLUE, textDecoration: 'none', fontWeight: 800 }}>
            Log in →
          </a>
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 800, color: '#f5f5f7' }}>
            Published a Short made with Kineo? Get on the wall.
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: MUTED, lineHeight: 1.5 }}>
            Paste the YouTube link. Only the video, its title and your channel name are shown — never your email.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label htmlFor="wall-short-url" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Your published YouTube Short link
            </label>
            <input
              id="wall-short-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (state === 'error') {
                  setState('idle')
                  setError(null)
                }
              }}
              placeholder="https://youtube.com/shorts/…"
              style={{
                flex: '1 1 220px',
                minWidth: 0,
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: '0.85rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f5f5f7',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => { void submit() }}
              disabled={state === 'saving' || !url.trim()}
              style={{
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                background: 'rgba(41,151,255,0.12)',
                border: `1px solid ${BLUE}`,
                color: BLUE,
                cursor: state === 'saving' || !url.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {state === 'saving' ? 'Saving…' : 'Add my Short'}
            </button>
          </div>
          {error && (
            <p role="alert" style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#f87171' }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  )
}
