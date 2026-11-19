'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BuyCreditsModal, BUY_CREDITS_OPENED_EVENT, useRecargaEntrada } from '@/components/billing/BuyCreditsEntry'
import { useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import KineoBolt from '@/components/KineoBolt'
import { trackClosedEvent } from '@/lib/analytics'
import { CREDIT_BALANCE_NOTICE_SHOWN, CREDIT_BALANCE_NOTICE_SURFACE, RECARGA_ASSINANTE_BACK_PREFIXES } from '@/lib/billing/recargaAssinante'
import { creditNoticeBottom } from '@/lib/billing/creditNoticePlacement'

const SURFACE = CREDIT_BALANCE_NOTICE_SURFACE
const DISMISSED = 'kineo:credit-balance-notice:dismissed'
const SHOWN = 'kineo:credit-balance-notice:shown'
const BLOCKING = 'dialog[open],[role="dialog"],[data-kineo="subscriber-upgrade"],.kineo-consent'
const PROTECTED = 'video,iframe,.rc-player,.kineo-render-notice,[data-protect-credit-notice],.cx-gerar,.rc-generate,[data-testid="studio-simple-generate"],[data-testid="sticky-generate-bar"],#studio-generation-review,[data-clip-action="generate"],button'

function sessionFlag(key: string): boolean {
  try { return sessionStorage.getItem(key) === '1' } catch { return false }
}

function setSessionFlag(key: string) {
  try { sessionStorage.setItem(key, '1') } catch { /* state also survives in this mount */ }
}

function visible(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight &&
    getComputedStyle(element).visibility === 'visible'
}

export default function CreditBalanceNotice() {
  const path = usePathname() ?? '/'
  const t = useUiCopy()
  const language = useInterfaceLanguage()
  const card = useRef<HTMLElement>(null)
  const buy = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const shown = useRef(false)
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [bottom, setBottom] = useState<number | null>(null)
  const onCreateScreen = RECARGA_ASSINANTE_BACK_PREFIXES.some((prefix) => (
    prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix || path.startsWith(prefix + '/')
  ))
  const offer = useRecargaEntrada(SURFACE, onCreateScreen && dismissed === false, path)
  const notice = onCreateScreen && dismissed === false ? offer?.notice : null

  useEffect(() => { setDismissed(sessionFlag(DISMISSED)) }, [])

  useEffect(() => {
    const element = card.current
    if (!element) { setBottom(null); return }
    let frame = 0
    function place() {
      frame = 0
      if (!element || document.fullscreenElement ||
          Array.from(document.querySelectorAll(BLOCKING)).some(visible)) { setBottom(null); return }
      const viewport = window.visualViewport
      const height = viewport ? viewport.height + viewport.offsetTop : window.innerHeight
      const nav = document.querySelector('.kineo-mobile-nav')
      const base = nav && visible(nav) ? Math.max(0, height - nav.getBoundingClientRect().top) + 12 : 16
      const protectedAreas = Array.from(document.querySelectorAll(PROTECTED))
        .filter((item) => !element.contains(item) && visible(item))
        .map((item) => item.getBoundingClientRect())
      const next = creditNoticeBottom(element.getBoundingClientRect(), protectedAreas, height, base, viewport?.offsetTop)
      setBottom(next === null ? null : next + (window.innerHeight - height))
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(place) }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    resize.observe(document.body)
    const mutation = new MutationObserver((records) => {
      if (records.some(({ target }) => !element.contains(target))) schedule()
    })
    // Watch new players/dialogs and layout changes. Ignore this card’s own position.
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open', 'style', 'class'] })
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    document.addEventListener('fullscreenchange', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      mutation.disconnect()
      resize.disconnect()
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      document.removeEventListener('fullscreenchange', schedule)
    }
  }, [notice, open, path])

  useEffect(() => {
    if (open || bottom === null || !restoreFocus.current) return
    restoreFocus.current = false
    buy.current?.focus({ preventScroll: true })
  }, [open, bottom])

  useEffect(() => {
    if (!notice || bottom === null || open || shown.current || sessionFlag(SHOWN)) return
    shown.current = true
    setSessionFlag(SHOWN)
    void trackClosedEvent(CREDIT_BALANCE_NOTICE_SHOWN, { surface: SURFACE, reason: notice.reason, qa: offer?.qa === true }, path)
  }, [notice, offer?.qa, bottom, open, path])

  if (!offer || !notice) return null

  const copy = (en: string, es: string, pt: string) => language === 'pt' ? pt : t(en, es)
  const title = notice.reason === 'zero'
    ? copy('You’re out of credits', 'Te quedaste sin créditos', 'Seus créditos acabaram')
    : copy('Running low on credits', 'Te quedan pocos créditos', 'Seus créditos estão acabando')
  const shortfall = notice.shortfall
  let detail = copy('Add credits to make your next video.', 'Añade créditos para crear tu próximo video.', 'Adicione créditos para fazer seu próximo vídeo.')
  if (shortfall !== null) {
    detail = copy(
      `You need ${shortfall} more ${shortfall === 1 ? 'credit' : 'credits'} for another film like your last one.`,
      `${shortfall === 1 ? 'Te falta' : 'Te faltan'} ${shortfall} ${shortfall === 1 ? 'crédito' : 'créditos'} para hacer otra película igual.`,
      `${shortfall === 1 ? 'Falta' : 'Faltam'} ${shortfall} ${shortfall === 1 ? 'crédito' : 'créditos'} para fazer outro filme igual.`,
    )
  } else if (notice.reason === 'rapid_spend') {
    detail = copy('You’ve used half or more of your cycle credits in 24 hours.', 'Usaste al menos la mitad de los créditos de tu ciclo en 24 horas.', 'Você usou metade ou mais dos créditos do ciclo em 24 horas.')
  }

  return (
    <>
      <aside ref={card} data-kineo="credit-balance-notice" className="credit-balance-notice" aria-labelledby="credit-notice-title"
        style={{ bottom: bottom ?? 16, visibility: bottom === null || open ? 'hidden' : 'visible' }}>
        <span className="credit-balance-icon" aria-hidden="true"><KineoBolt style={{ color: 'currentColor' }} /></span>
        <div>
          <strong id="credit-notice-title">{title}</strong>
          <p>{detail}</p>
          <button ref={buy} type="button" className="credit-balance-buy" onClick={() => {
            setOpen(true)
            void trackClosedEvent(BUY_CREDITS_OPENED_EVENT, { surface: SURFACE, reason: notice.reason, qa: offer.qa }, path)
          }}>{copy('Buy credits', 'Comprar créditos', 'Comprar créditos')}</button>
        </div>
        <button type="button" className="credit-balance-close" aria-label={copy('Dismiss credit notice', 'Cerrar aviso de créditos', 'Fechar aviso de créditos')}
          onClick={() => { setSessionFlag(DISMISSED); setDismissed(true) }}><span aria-hidden="true">×</span></button>
      </aside>
      {open && <BuyCreditsModal offer={offer} surface={SURFACE} shortfall={shortfall} onClose={() => { restoreFocus.current = true; setOpen(false) }} />}
    </>
  )
}
