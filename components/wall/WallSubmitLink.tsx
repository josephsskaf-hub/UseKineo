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
//
// KINEO-POST-TO-EARN-2026-08-04 — este campo agora PAGA. A regra é dita
// ANTES de colar (POST_TO_EARN_PITCH), não depois: prometer vagamente e só
// revelar os limites na recusa é como se perde a confiança de um usuário de
// uma vez só. O desfecho vem do servidor com uma mensagem específica por
// motivo — "concedido", "esse vídeo já pagou", "limite da semana", "não
// consegui abrir no YouTube" são quatro situações diferentes e o usuário
// precisa saber em qual está.

import { useState } from 'react'
import { POST_TO_EARN_PITCH, type PostToEarnResult } from '@/lib/postToEarn'

const BLUE = '#2997ff'
const MUTED = '#86868b'
const GREEN = '#4ade80'

type State = 'idle' | 'saving' | 'done' | 'error' | 'unauthenticated'

export default function WallSubmitLink() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  // Veredito da recompensa. Pode ser null se uma versão antiga da rota
  // responder sem o campo — a UI então só confirma o wall, sem inventar
  // um crédito que talvez não exista.
  const [reward, setReward] = useState<PostToEarnResult | null>(null)

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
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; reward?: PostToEarnResult }
        | null
      if (res.ok && data?.ok) {
        setReward(data.reward ?? null)
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
        <>
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 800,
              color: reward?.granted ? GREEN : '#f5f5f7',
            }}
          >
            {reward?.granted ? `🎉 +${reward.credits} credits — you're on the wall.` : '🎉 Got it — your Short joins the board on the next refresh (a few minutes).'}
          </p>
          {/* O motivo, quando NÃO houve crédito. Silenciar aqui seria deixar a
              pessoa achar que o crédito veio (ou que foi roubada). */}
          {reward && !reward.granted && (
            <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: MUTED, lineHeight: 1.55 }}>
              {reward.message}
            </p>
          )}
          {reward?.granted && reward.remainingThisWeek > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: MUTED, lineHeight: 1.55 }}>
              {reward.remainingThisWeek} more rewarded {reward.remainingThisWeek === 1 ? 'link' : 'links'} left this week.
            </p>
          )}
        </>
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
            Published a Short made with Kineo? Get paid for it.
          </p>
          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: GREEN, fontWeight: 700, lineHeight: 1.5 }}>
            {POST_TO_EARN_PITCH}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: MUTED, lineHeight: 1.5 }}>
            Each video counts once, and it has to be public. Only the video, its title and your channel name are shown — never your email.
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
