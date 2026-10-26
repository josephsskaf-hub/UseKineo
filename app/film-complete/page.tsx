'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { filmCompleteCopy } from '@/lib/growth/filmCompleteCopy'
import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'
import { useWelcome20OfferLive } from '@/lib/growth/useWelcome20Deadline'
import { interfaceLanguageIsRtl } from '@/lib/ui/interfaceLanguage'

type State = 'awaiting_payment' | 'waiting_entitlement' | 'starting' | 'processing' | 'completed' | 'failed' | 'unavailable'
type Status = { state: State; intentId: string; sourceVideoId?: string; sourceVideoUrl?: string; videoId?: string; videoUrl?: string }
const STATES = new Set<State>(['awaiting_payment', 'waiting_entitlement', 'starting', 'processing', 'completed', 'failed', 'unavailable'])
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

function safeVideoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try { return new URL(value).protocol === 'https:' ? value : null } catch { return null }
}

const COPY = {
  en: { checking: 'Confirming your full film…', pending: 'Confirming your payment', pendingBody: 'Your script is saved. Your full film will start automatically after payment is confirmed. You do not need to pay again.', creating: 'Making the full version of your film', creatingBody: 'Your payment is confirmed. Kineo is making your 35 s film from the same script and topic, without a watermark.', completed: 'Your full film is ready', completedBody: '35 seconds, no watermark — made from your saved script and topic.', saved: 'Your film is saved', savedBody: 'Your free film is still here. You can return to this same script when you are ready.', failed: 'Your film needs attention', failedBody: 'Your saved script is safe. Check your films or contact support before trying again.', unavailable: 'We could not open this film', unavailableBody: 'Sign in with the account that made the free film, or open your films to find it.', login: 'Sign in to see my film', retry: 'Check again', network: 'The connection was interrupted. We will check again automatically.', download: 'Download my full film — 35 s, no watermark', source: 'Download my free film', films: 'My films', resume: 'Continue with Creator', help: 'Contact support' },
  pt: { checking: 'Confirmando a versão completa…', pending: 'Confirmando seu pagamento', pendingBody: 'Seu roteiro está guardado. A versão completa começa automaticamente depois da confirmação do pagamento. Você não precisa pagar de novo.', creating: 'Fazendo a versão completa do seu filme', creatingBody: 'Seu pagamento foi confirmado. A Kineo está fazendo seu filme de 35 s com o mesmo roteiro e tema, sem marca.', completed: 'Seu filme completo está pronto', completedBody: '35 segundos, sem marca — feito com seu roteiro e tema guardados.', saved: 'Seu filme está guardado', savedBody: 'Seu filme grátis continua aqui. Você pode voltar ao mesmo roteiro quando quiser.', failed: 'Seu filme precisa de atenção', failedBody: 'Seu roteiro está guardado. Confira seus filmes ou fale com o suporte antes de tentar de novo.', unavailable: 'Não conseguimos abrir este filme', unavailableBody: 'Entre na conta que fez o filme grátis ou abra seus filmes para encontrá-lo.', login: 'Entrar para ver meu filme', retry: 'Verificar de novo', network: 'A conexão foi interrompida. Vamos verificar de novo automaticamente.', download: 'Baixar meu filme completo — 35 s, sem marca', source: 'Baixar meu filme grátis', films: 'Meus filmes', resume: 'Continuar com Creator', help: 'Falar com o suporte' },
  es: { checking: 'Confirmando la versión completa…', pending: 'Confirmando tu pago', pendingBody: 'Tu guion está guardado. La versión completa empieza automáticamente cuando se confirme el pago. No necesitas pagar otra vez.', creating: 'Creando la versión completa de tu película', creatingBody: 'Tu pago está confirmado. Kineo está creando tu película de 35 s con el mismo guion y tema, sin marca de agua.', completed: 'Tu película completa está lista', completedBody: '35 segundos, sin marca de agua, con tu guion y tema guardados.', saved: 'Tu película está guardada', savedBody: 'Tu película gratis sigue aquí. Puedes volver al mismo guion cuando quieras.', failed: 'Tu película necesita atención', failedBody: 'Tu guion está guardado. Revisa tus películas o contacta con soporte antes de volver a intentarlo.', unavailable: 'No pudimos abrir esta película', unavailableBody: 'Entra con la cuenta que creó la película gratis o abre tus películas para encontrarla.', login: 'Entrar para ver mi película', retry: 'Comprobar de nuevo', network: 'Se interrumpió la conexión. Volveremos a comprobarlo automáticamente.', download: 'Descargar mi película completa — 35 s, sin marca', source: 'Descargar mi película gratis', films: 'Mis películas', resume: 'Continuar con Creator', help: 'Contactar con soporte' },
}

export default function FilmCompletePage() {
  return <Suspense fallback={<main style={{ minHeight: '60vh', background: 'var(--bg)' }} />}><FilmCompleteContent /></Suspense>
}

function FilmCompleteContent() {
  const params = useSearchParams()
  const rawIntent = params.get('intent') ?? ''
  const intentId = UUID.test(rawIntent) ? rawIntent : null
  const cancelled = params.get('cancelled') === '1'
  const language = useInterfaceLanguage()
  const copy = COPY[language === 'pt' || language === 'es' ? language : 'en']
  const welcomeLive = useWelcome20OfferLive(WELCOME20_SITE_OFFER_LIVE)
  const offer = filmCompleteCopy(language, welcomeLive)
  const [status, setStatus] = useState<Status | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!intentId) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastStartAt = 0
    const accept = (value: unknown): Status | null => {
      if (!value || typeof value !== 'object') return null
      const candidate = value as Partial<Status>
      return candidate.intentId === intentId && candidate.state && STATES.has(candidate.state) ? candidate as Status : null
    }
    const check = async () => {
      let next: Status | null = null
      try {
        const response = await fetch(`/api/film-complete/status?intent=${encodeURIComponent(intentId)}`, { cache: 'no-store', signal: AbortSignal.timeout(8_000) })
        if (!alive) return
        if (response.status === 401) { setNeedsLogin(true); return }
        if (response.status === 403 || response.status === 404) {
          setStatus({ state: 'unavailable', intentId })
          setNetworkError(false)
          return
        }
        if (!response.ok) throw new Error('status_unavailable')
        next = accept(await response.json())
        if (!next) throw new Error('invalid_status')
        if (!alive) return
        setStatus(next)
        setNeedsLogin(false)
        setNetworkError(false)
        // Only this explicit purchased-film flow requests autostart. The server verifies the paid intent;
        // a query parameter, success-page visit or local storage can never authorize generation.
        const shouldStart = (!cancelled && next.state === 'awaiting_payment')
          || next.state === 'waiting_entitlement' || next.state === 'starting'
        if (shouldStart && Date.now() - lastStartAt >= 10_000) {
          lastStartAt = Date.now()
          const started = await fetch('/api/film-complete/start', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intentId }),
            cache: 'no-store', signal: AbortSignal.timeout(12_000),
          })
          if (!alive) return
          if (started.status === 401) { setNeedsLogin(true); return }
          if (started.ok || started.status === 402) {
            const updated = accept(await started.json())
            if (updated && alive) { next = updated; setStatus(updated) }
          }
        }
      } catch { if (alive) setNetworkError(true) }
      if (alive && !next?.state.match(/^(completed|failed|unavailable)$/)) timer = setTimeout(() => { void check() }, 3_000)
    }
    void check()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [intentId, cancelled, retry])

  const state = status?.state
  const saved = cancelled && state === 'awaiting_payment'
  const creating = state === 'starting' || state === 'processing'
  const unavailable = !intentId || state === 'unavailable'
  const videoUrl = safeVideoUrl(status?.videoUrl)
  const sourceUrl = safeVideoUrl(status?.sourceVideoUrl)
  const title = needsLogin || unavailable ? copy.unavailable : saved ? copy.saved
    : state === 'completed' ? copy.completed : state === 'failed' ? copy.failed
      : creating ? copy.creating : status ? copy.pending : copy.checking
  const body = needsLogin || unavailable ? copy.unavailableBody : saved ? copy.savedBody
    : state === 'completed' ? copy.completedBody : state === 'failed' ? copy.failedBody
      : creating ? copy.creatingBody : status ? copy.pendingBody : ''
  const buttonStyle = { display: 'block', width: '100%', padding: '13px 16px', borderRadius: 12, lineHeight: 1.45, textAlign: 'center' as const, fontSize: 15, fontWeight: 800, textDecoration: 'none', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', cursor: 'pointer', boxSizing: 'border-box' as const }
  const loginReturn = `/film-complete?${new URLSearchParams({ ...(intentId ? { intent: intentId } : {}), ...(cancelled ? { cancelled: '1' } : {}) }).toString()}`

  return <main style={{ minHeight: '80vh', background: 'var(--bg)', color: 'var(--text)', padding: '36px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <section dir={interfaceLanguageIsRtl(language) ? 'rtl' : undefined} data-kineo="film15-full-result"
      style={{ width: '100%', maxWidth: 520, padding: 'clamp(22px, 5vw, 32px)', border: '1px solid var(--border)', borderRadius: 22, background: 'var(--card)', boxSizing: 'border-box' }}>
      <h1 style={{ margin: 0, fontSize: 'clamp(1.45rem, 5vw, 1.9rem)', lineHeight: 1.2 }} aria-live="polite">{title}</h1>
      {body ? <p style={{ margin: '14px 0 20px', color: 'var(--muted2)', fontSize: 15, lineHeight: 1.6 }}>{body}</p> : null}
      {state === 'completed' && videoUrl ? <>
        <video controls playsInline preload="metadata" src={videoUrl} style={{ display: 'block', width: '100%', maxHeight: 480, borderRadius: 12, background: '#000', marginBottom: 16 }} />
        <a href={videoUrl} download="kineo-full-film-35s.mp4" style={buttonStyle}>{copy.download}</a>
      </> : null}
      {saved ? <>
        {sourceUrl ? <video controls playsInline preload="none" src={sourceUrl} style={{ display: 'block', width: '100%', maxHeight: 340, borderRadius: 12, background: '#000', marginBottom: 16 }} /> : null}
        <a href={sourceUrl ?? '/history'} download={sourceUrl ? 'kineo-free-film.mp4' : undefined} style={buttonStyle}>{sourceUrl ? copy.source : copy.films}</a>
        <p style={{ margin: '18px 0 8px', color: 'var(--muted2)', fontSize: 13, lineHeight: 1.5 }}>{offer.billing}</p>
        <a href={`/api/film-complete/checkout?intent=${encodeURIComponent(intentId!)}`} style={{ display: 'block', padding: '10px 0', color: 'var(--accent)', fontWeight: 750, fontSize: 14 }}>{copy.resume} →</a>
      </> : null}
      {needsLogin ? <Link href={`/login?redirect=${encodeURIComponent(loginReturn)}`} style={buttonStyle}>{copy.login}</Link> : null}
      {networkError ? <p role="status" style={{ color: 'var(--muted2)', fontSize: 13, lineHeight: 1.5 }}>{copy.network}</p> : null}
      {(networkError || state === 'failed' || state === 'unavailable') && !needsLogin ? <button type="button" onClick={() => { setNetworkError(false); setRetry((value) => value + 1) }} style={{ ...buttonStyle, marginTop: 14 }}>{copy.retry}</button> : null}
      <nav aria-label={copy.films} style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 22, fontSize: 14 }}>
        <Link href="/history" style={{ color: 'var(--accent)' }}>{copy.films}</Link>
        <a href="mailto:support@usekineo.com" style={{ color: 'var(--muted2)' }}>{copy.help}</a>
      </nav>
    </section>
  </main>
}
