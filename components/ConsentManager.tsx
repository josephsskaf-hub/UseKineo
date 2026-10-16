'use client'
// KINEO-CONSENTIMENTO-1610 — portão único dos pixels de marketing/análise (Google Ads, TikTok, Microsoft Clarity).
// O layout raiz passa os <Script> como `marketing` e o Clarity como `clarity`; este componente só os monta quando
// marketingAllowed() (lib/consent.ts) diz sim. Enquanto a região não é conhecida, NADA carrega (falha fechada).
// Também desenha o banner (região opt-in, sem escolha) e o painel "Your privacy choices" (rodapé, qualquer região).
// "Accept" e "Reject" usam o MESMO estilo (CONSENT_BUTTON_STYLE): o guardião scripts/test-consentimento-1610.mjs
// prova que nenhum dos dois pesa mais.
import Link from 'next/link'
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  CONSENT_API_PATH,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_REGION_STORAGE_KEY,
  CONSENT_REGION_TTL_MS,
  OPEN_PRIVACY_CHOICES_EVENT,
  consentBannerNeeded,
  consentCookieValue,
  consentCopyFor,
  marketingAllowed,
  parseConsentCookie,
  parseConsentRegion,
  type ConsentChoice,
  type ConsentRegion,
  type ConsentState,
} from '@/lib/consent'

type ManagerState = ConsentState & { ready: boolean }

function readGpc(): boolean {
  try {
    return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  } catch {
    return false
  }
}

function readCachedRegion(): ConsentRegion | null {
  try {
    const raw = localStorage.getItem(CONSENT_REGION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { r?: unknown; t?: unknown }
    if (typeof parsed.t !== 'number' || Date.now() - parsed.t > CONSENT_REGION_TTL_MS) return null
    return parseConsentRegion(parsed.r)
  } catch {
    return null
  }
}

function cacheRegion(region: ConsentRegion) {
  try { localStorage.setItem(CONSENT_REGION_STORAGE_KEY, JSON.stringify({ r: region, t: Date.now() })) } catch { /* modo privado */ }
}

function writeChoiceCookie(choice: ConsentChoice) {
  try {
    const secure = window.location.protocol === 'https:' ? ';secure' : ''
    document.cookie = `${CONSENT_COOKIE}=${consentCookieValue(choice)};path=/;max-age=${CONSENT_MAX_AGE_SECONDS};samesite=lax${secure}`
  } catch { /* o servidor grava o mesmo cookie na resposta do POST */ }
}

/** Mesmo peso visual para "Accept" e "Reject" — um só objeto de estilo para os dois. */
const CONSENT_BUTTON_STYLE: CSSProperties = {
  flex: '1 1 0',
  minHeight: 36,
  padding: '8px 14px',
  borderRadius: 9,
  border: '1px solid var(--border, rgba(127,127,127,.35))',
  background: 'var(--card, #16161d)',
  color: 'var(--text, #f5f7ff)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

export default function ConsentManager({ marketing, clarity }: { marketing: ReactNode; clarity: ReactNode }) {
  const language = useInterfaceLanguage()
  const [state, setState] = useState<ManagerState>({ region: null, choice: null, gpc: false, ready: false })
  const [panelOpen, setPanelOpen] = useState(false)
  const [browserLanguages, setBrowserLanguages] = useState<readonly string[]>([])

  useEffect(() => {
    let alive = true
    let choice: ConsentChoice | null = null
    try { choice = parseConsentCookie(document.cookie) } catch { /* sem cookie legível = sem escolha */ }
    const gpc = readGpc()
    try { setBrowserLanguages(Array.isArray(navigator.languages) ? navigator.languages : [navigator.language]) } catch { /* inglês */ }
    const cached = readCachedRegion()
    if (cached) {
      setState({ region: cached, choice, gpc, ready: true })
      return
    }
    // Sem região em cache: pergunta ao servidor. Falha = opt_in (falha fechada), sem guardar no cache.
    fetch(CONSENT_API_PATH, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { region?: unknown } | null) => {
        const region = parseConsentRegion(data?.region)
        if (region) cacheRegion(region)
        if (alive) setState({ region: region ?? 'opt_in', choice, gpc, ready: true })
      })
      .catch(() => {
        if (alive) setState({ region: 'opt_in', choice, gpc, ready: true })
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const open = () => setPanelOpen(true)
    window.addEventListener(OPEN_PRIVACY_CHOICES_EVENT, open)
    return () => window.removeEventListener(OPEN_PRIVACY_CHOICES_EVENT, open)
  }, [])

  const allowed = state.ready && marketingAllowed(state)
  const bannerVisible = state.ready && consentBannerNeeded(state)

  const choose = useCallback((choice: ConsentChoice) => {
    const wasAllowed = allowed
    writeChoiceCookie(choice)
    setState((s) => ({ ...s, choice }))
    const source = panelOpen ? 'panel' : 'banner'
    setPanelOpen(false)
    try {
      void fetch(CONSENT_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ choice, source }),
      }).catch(() => {})
    } catch { /* a escolha já vale pelo cookie */ }
    // Script já carregado não "descarrega": recusar depois de aceitar recarrega a página sem os pixels.
    if (wasAllowed && choice === 'denied') window.setTimeout(() => window.location.reload(), 300)
  }, [allowed, panelOpen])

  const copy = consentCopyFor(language, browserLanguages)
  const showUi = bannerVisible || panelOpen

  return (
    <>
      {allowed ? marketing : null}
      {allowed ? clarity : null}
      {showUi ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="kineo-consent-title"
          className="kineo-consent"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 9990,
            maxWidth: 420,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid var(--border, rgba(127,127,127,.35))',
            background: 'var(--bg, #0d0d14)',
            color: 'var(--text, #f5f7ff)',
            boxShadow: '0 8px 30px rgba(0,0,0,.35)',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <strong id="kineo-consent-title" style={{ fontSize: 14 }}>{panelOpen ? copy.choices : copy.title}</strong>
            {panelOpen ? (
              <button type="button" onClick={() => setPanelOpen(false)} aria-label={copy.close}
                style={{ background: 'none', border: 0, color: 'var(--muted, #86868b)', cursor: 'pointer', fontSize: 12 }}>
                {copy.close}
              </button>
            ) : null}
          </div>
          <p style={{ margin: '6px 0 0' }}>{copy.body}</p>
          {panelOpen ? <p style={{ margin: '6px 0 0', color: 'var(--muted, #86868b)', fontSize: 12 }}>{copy.affiliate}</p> : null}
          {panelOpen && state.ready ? (
            <p style={{ margin: '6px 0 0', color: 'var(--muted, #86868b)', fontSize: 12 }}>
              {state.gpc ? copy.gpc : allowed ? copy.statusOn : copy.statusOff}
            </p>
          ) : null}
          {state.gpc ? null : (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" data-consent="reject" onClick={() => choose('denied')} style={CONSENT_BUTTON_STYLE}>{copy.reject}</button>
              <button type="button" data-consent="accept" onClick={() => choose('granted')} style={CONSENT_BUTTON_STYLE}>{copy.accept}</button>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 12 }}>
            <Link href="/privacy#cookies" style={{ color: 'var(--muted, #86868b)', textDecoration: 'underline' }}>{copy.privacy}</Link>
          </div>
        </div>
      ) : null}
    </>
  )
}

/** Link do rodapé: abre o painel. Sem JavaScript, leva à seção de cookies do /privacy. */
export function PrivacyChoicesLink({ style, children }: { style?: CSSProperties; children: ReactNode }) {
  return (
    <a
      href="/privacy#cookies"
      style={style}
      onClick={(event) => {
        event.preventDefault()
        try { window.dispatchEvent(new Event(OPEN_PRIVACY_CHOICES_EVENT)) } catch { window.location.href = '/privacy#cookies' }
      }}
    >
      {children}
    </a>
  )
}
