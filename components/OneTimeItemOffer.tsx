'use client'

// KINEO-COMPRA-AVULSA-2410 — one-off results beside plans, with the same server-authoritative checkout.
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { ONE_TIME_ITEMS_LIVE, getOneTimeItem, oneTimeItemCheckoutHref, oneTimeItemPriceLabel } from '@/lib/oneTimeItem'

type ItemId = 'one_time_ad' | 'one_time_film35'
type Surface = 'pricing' | 'generate_paywall' | 'ads_choice'
type Launcher = Pick<ReturnType<typeof useCheckoutLaunch>, 'launch' | 'pending' | 'error'>
const DEFAULT_ITEMS: readonly ItemId[] = ['one_time_ad', 'one_time_film35']
const AD_ONLY: readonly ItemId[] = ['one_time_ad']
const viewed = new Set<string>()
const pendingViews = new Map<string, Promise<void>>()

export const ONE_TIME_ITEM_OFFER_CSS = `
.oti{--oti-card:var(--card,#fff);--oti-text:var(--text,#21302b);--oti-muted:var(--muted,#65756f);--oti-line:var(--border,#d9dedb);--oti-accent:var(--accent,#4062e8);margin:20px auto;padding:20px;border:1px solid var(--oti-line);border-radius:18px;background:var(--oti-card);color:var(--oti-text);text-align:left;max-width:960px;min-width:0}
.oti *{box-sizing:border-box}
.oti h3,.oti h4,.oti p{margin:0}.oti h3{font-size:18px;font-weight:780;letter-spacing:-.02em;line-height:1.35}.oti .oti-sub{margin-top:5px;color:var(--oti-muted);font-size:12.5px;line-height:1.5}.oti-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}.oti[data-single=true] .oti-grid{grid-template-columns:1fr}.oti-item{border:1px solid var(--oti-line);border-radius:13px;padding:16px;display:grid;gap:9px;min-width:0}.oti-item h4{font-size:14px;font-weight:750;line-height:1.4}.oti-price{font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-.035em}.oti-price small{font-size:11.5px;letter-spacing:0;font-weight:500;color:var(--oti-muted);margin-left:7px}.oti-desc{color:var(--oti-muted);font-size:12px;line-height:1.5;min-height:36px}.oti .oti-buy{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:1px solid var(--oti-accent);border-radius:10px;background:var(--oti-accent);color:#fff;text-decoration:none;font:inherit;font-size:13px;font-weight:750;cursor:pointer;line-height:1.4;text-align:center}.oti .oti-buy:disabled,.oti .oti-buy[aria-disabled=true]{opacity:.6;cursor:wait}.oti .oti-buy:focus-visible{outline:3px solid var(--oti-accent);outline-offset:3px}.oti-note{font-size:12px;line-height:1.5;color:var(--oti-muted);margin-top:12px!important}.oti-feedback{margin-top:12px!important;border:1px solid var(--oti-line);padding:11px 12px;border-radius:10px;font-size:12px;line-height:1.5;color:var(--oti-text)}
@media(max-width:600px){.oti{padding:16px;border-radius:15px}.oti-grid{grid-template-columns:1fr}.oti-item{padding:14px}.oti-desc{min-height:0}.oti h3{font-size:17px}}
`

/** Close the dedupe only once the event sink accepts the view; a pending map also covers Strict Mode remounts. */
function recordView(surface: Surface, sku: ItemId): void {
  const key = `kineo:one-time-item:view:v1:${surface}:${sku}`
  if (viewed.has(key) || pendingViews.has(key)) return
  try { if (sessionStorage.getItem(key) === '1') { viewed.add(key); return } } catch { /* Memory dedupe remains available. */ }
  const request = trackEvent('one_time_item_viewed', { sku, surface }).then(accepted => {
    if (!accepted) return
    viewed.add(key)
    try { sessionStorage.setItem(key, '1') } catch { /* A blocked storage cannot block payment. */ }
  }).catch(() => {}).finally(() => { pendingViews.delete(key) })
  pendingViews.set(key, request)
}

interface Props {
  surface: Surface
  lang?: string
  orderId?: string
  checkout?: Launcher
  busy?: boolean
  /** Studio Ads keeps the existing order, stills and selection open while the buyer pays in another tab. */
  newTab?: boolean
}

/** Pure, exported presentation so the visual before/after renders the actual UI without creating checkout sessions. */
export function OneTimeItemOfferView({ surface, lang = 'en', orderId, pending = null, busy = false, newTab = false, error, opened = false, onBuy }: Omit<Props, 'checkout'> & { pending?: string | null; error?: string | null; opened?: boolean; onBuy?: (sku: ItemId, event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void }) {
  if (!ONE_TIME_ITEMS_LIVE) return null
  const pt = lang === 'pt', items = surface === 'ads_choice' ? AD_ONLY : DEFAULT_ITEMS
  return <section className="oti" data-kineo="one-time-item-offer" data-surface={surface} data-single={items.length === 1} aria-label={pt ? 'Compra avulsa' : 'One-time purchase'}>
    <style dangerouslySetInnerHTML={{ __html: ONE_TIME_ITEM_OFFER_CSS }} />
    <h3>{pt ? 'Só quero 1 agora' : 'I only want 1 now'}</h3>
    <p className="oti-sub">{pt ? 'Pagamento único. Sem assinatura ou renovação automática.' : 'One payment. No subscription or automatic renewal.'}</p>
    <div className="oti-grid">{items.map(sku => {
      const item = getOneTimeItem(sku), label = oneTimeItemPriceLabel(sku), waiting = pending === sku
      const title = pt ? (sku === 'one_time_ad' ? '1 anúncio sem marca' : '1 filme de 35 s sem marca') : item.label
      const description = pt ? (sku === 'one_time_ad' ? 'Um anúncio de 15 s no Studio Ads, nível Commercial. Créditos para um anúncio e acesso ao Studio Ads.' : 'Um filme de 35 s com Seedance 1.5. Créditos para um filme.') : item.description
      const cta = waiting ? (pt ? 'Abrindo pagamento…' : 'Opening checkout…') : (pt ? 'Comprar só 1' : 'Buy just 1')
      return <article className="oti-item" key={sku} data-sku={sku}>
        <h4>{title}</h4><div className="oti-price">{label}<small>{pt ? 'uma vez' : 'once'}</small></div>
        <p className="oti-desc">{description}</p>
        {newTab ? <a className="oti-buy" href={oneTimeItemCheckoutHref(sku, surface, orderId)} target="_blank" rel="noopener noreferrer" aria-disabled={busy || pending !== null} onClick={event => onBuy?.(sku, event)}>{cta}<span className="sr-only">{pt ? ' (abre em outra aba)' : ' (opens in a new tab)'}</span></a> : <button className="oti-buy" type="button" disabled={busy || pending !== null} onClick={event => onBuy?.(sku, event)}>{cta}</button>}
      </article>
    })}</div>
    <p className="oti-note">{newTab ? orderId ? (pt ? 'O pagamento abre em outra aba. Volte aqui: seu pedido e suas fotos ficam guardados.' : 'Checkout opens in another tab. Return here: your order and stills stay saved.') : (pt ? 'O pagamento abre em outra aba. Mantenha esta página aberta e volte para continuar com suas escolhas.' : 'Checkout opens in another tab. Keep this page open and return to continue with your choices.') : (pt ? 'Brasil: pagamento em reais no checkout. Confira o total antes de pagar.' : 'Brazil: checkout charges in reais. Review the total before paying.')}</p>
    {opened ? <p className="oti-feedback" role="status">{pt ? 'Após o pagamento, volte a esta aba. O saldo será atualizado para você continuar.' : 'After payment, return to this tab. Your balance refreshes so you can continue.'}</p> : null}
    {error ? <p className="oti-feedback" role="alert">{error}</p> : null}
  </section>
}

const NATIVE_CHECKOUT: Launcher = { pending: null, error: null, launch: () => false }
function OfferWithOwnCheckout(props: Props) {
  const checkout = useCheckoutLaunch(props.surface)
  return <BoundOffer {...props} checkout={checkout} />
}
export default function OneTimeItemOffer(props: Props) {
  if (!ONE_TIME_ITEMS_LIVE) return null
  if (props.checkout) return <BoundOffer {...props} checkout={props.checkout} />
  if (props.newTab) return <BoundOffer {...props} checkout={NATIVE_CHECKOUT} />
  return <OfferWithOwnCheckout {...props} />
}
function BoundOffer(props: Props & { checkout: Launcher }) {
  const checkout = props.checkout
  const host = useRef<HTMLDivElement>(null), lastNewTabClick = useRef(0)
  const [opened, setOpened] = useState(false)
  useEffect(() => {
    if (!ONE_TIME_ITEMS_LIVE || !host.current) return
    const expose = () => { for (const sku of props.surface === 'ads_choice' ? AD_ONLY : DEFAULT_ITEMS) recordView(props.surface, sku) }
    if (typeof IntersectionObserver === 'undefined') { expose(); return }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { expose(); observer.disconnect() } }, { threshold: 0.25 })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [props.surface])
  if (!ONE_TIME_ITEMS_LIVE) return null
  function buy(sku: ItemId, event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    if (props.busy || checkout.pending !== null) { event.preventDefault(); return }
    if (props.newTab) {
      // Native navigation preserves the gesture chain and the in-memory Ads session. No redirect watchdog runs on the tab that stays open.
      if (Date.now() - lastNewTabClick.current < 1500) { event.preventDefault(); return }
      lastNewTabClick.current = Date.now()
      setOpened(true)
      void trackEvent('checkout_cta_clicked', { sku, surface: props.surface, selection: sku, order_id: props.orderId ?? null })
      return
    }
    checkout.launch(sku, oneTimeItemCheckoutHref(sku, props.surface, props.orderId), { sku, pricing_surface: props.surface })
  }
  return <div ref={host}><OneTimeItemOfferView {...props} pending={checkout.pending} error={checkout.error} opened={opened} onBuy={buy} /></div>
}
