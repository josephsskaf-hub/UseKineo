'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { PUBLIC_ENGINE_EXAMPLES } from '@/lib/publicExamples'
import type { CheckoutCurrency, PriceRegion } from '@/lib/checkoutPricing'
import { MONEY_BACK_GUARANTEE } from '@/lib/checkoutPricing' // KINEO-CHECKOUT-CLAREZA-1610 — a garantia única
import { FILM_PASS_LIVE } from '@/lib/offers/avulsoUnico3110' // KINEO-PRECO-MERCADO-0411
import { dfyFilms3EntryCopy, dfyFilms3EntryHref } from '@/lib/dfyFilms3' // KINEO-PACOTE-3-FILMES-1610
import {
  ANNUAL_DISCOUNT_PERCENT, CONVERSION_NAMES, CONVERSION_TIERS,
  MRR_CONVERSION_ENABLED, MRR_CONVERSION_VERSION, conversionCheckoutHref,
  conversionMetadata, conversionPass, conversionPlan, paidOnlyEntry,
  type ConversionBilling, type ConversionSurface, type ConversionTier,
} from '@/lib/offers/mrrConversion'
// KINEO-SAIDA-REGIAO-2026-10-07 (b) — o passe na moeda local para 'region_paid_only' (o servidor confere a régua; quem não
// é da régua recebe o cartão de sempre como `fallback`). Desligado (REGION_PASS_OFFER_LIVE): esta tela é a de hoje.
import { REGION_PASS_OFFER_LIVE } from '@/lib/freeFilmPolicy'
import RegionPassOffer from '@/components/RegionPassOffer'
// KINEO-PAYWALL-FILME-PRIMEIRO-1510 — quem ainda não viu o próprio filme recebe a caixa com o filme grátis (ou, na região sem
// filme grátis, o passe) no topo. Planos inteiros logo abaixo. A régua é pura: lib/growth/paywallFilmePrimeiro.ts.
import { REGION_FREE_FILM_SECONDS, regionFreeFilmAvailable } from '@/lib/freeFilmPolicy'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { interfaceLanguageIsRtl } from '@/lib/ui/interfaceLanguage'
import { useOwnRegionProfile } from '@/components/offers/useOwnRegionProfile'
import {
  FREE_FILM_CLICKED_EVENT, FREE_FILM_OFFERED_EVENT, PASS_FIRST_OFFERED_EVENT, PAYWALL_FILME_PRIMEIRO_VERSION,
  copyDoFilmePrimeiro, decidirFilmePrimeiro, type FilmeGratisVariante,
} from '@/lib/growth/paywallFilmePrimeiro'
import { FilmsLikeThisNote, FilmsMadeProof } from '@/components/checkout/ValorNoCheckout' // KINEO-VALOR-NO-CHECKOUT-3110 — o filme dela em "≈ N more films like this" + a prova social real
import { paredeBillingInicial, paredeViewMetadata } from '@/lib/offers/paredeMensal1111' // KINEO-PAREDE-MENSAL-1111

/** KINEO-PAREDE-MENSAL-1111 — constante de módulo (referência estável para o efeito da impressão). */
const PAREDE_VIEW_META: Record<string, string> = paredeViewMetadata()

const SAMPLE: { videoPath: string; arenaPosterPath?: string } | undefined = PUBLIC_ENGINE_EXAMPLES.find(v => v.engine === 'cinematic_ai' && 'arenaPosterPath' in v)
const panel = { border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--card2)' }
const button = { border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 16px', fontWeight: 750, cursor: 'pointer', color: 'var(--text)', background: 'var(--card)' } as const

export function useOfferObservation(surface: ConversionSurface, offer: string, enabled = true, extra: Record<string, string> | null = null) {
  const root = useRef<HTMLDivElement>(null)
  const viewed = useRef(false)
  const acted = useRef(false)
  useEffect(() => {
    if (!enabled || viewed.current || !root.current) return
    const observer = new IntersectionObserver(entries => {
      if (viewed.current || !entries.some(e => e.isIntersecting)) return
      viewed.current = true
      void trackEvent('conversion_offer_viewed', { ...conversionMetadata(surface, offer), ...(extra ?? {}) }) // KINEO-PAREDE-MENSAL-1111: `extra` só na parede
      observer.disconnect()
    }, { threshold: 0.1 })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [enabled, surface, offer, extra])
  function gesture(choice: string) {
    if (acted.current) return
    acted.current = true
    void trackEvent('conversion_offer_first_gesture', { ...conversionMetadata(surface, offer), choice })
  }
  return { root, gesture }
}

export function ConversionPlanCapacity({ tier, billing, currency, region, surface }: {
  tier: ConversionTier; billing: ConversionBilling; currency: CheckoutCurrency | null; region: PriceRegion; surface: ConversionSurface
}) {
  const observation = useOfferObservation(surface, `${tier}_${billing}`, MRR_CONVERSION_ENABLED && currency !== null)
  if (!MRR_CONVERSION_ENABLED || !currency) return null
  const plan = conversionPlan(tier, billing, currency, region)
  return <div ref={observation.root} data-conversion-plan={`${tier}_${billing}`} style={{ marginTop: 10 }}>
    <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{plan.capacity}</span>
    <span style={{ display: 'block', fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6 }}>{plan.renewal}</span>
    {surface === 'pricing' && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>MiniMax H3 Turbo · formats are alternatives, without extras.</span>}
  </div>
}

// KINEO-VALOR-NO-CHECKOUT-3110 — o filme da pessoa chega com título, miniatura, motor e duração: a parede diz quantos filmes
// IGUAIS a esse cada plano paga por mês (lib/valorNoCheckout.ts, a função que cobra). Sem filme, a amostra da casa de sempre.
type OwnFilm = { video_url: string; title: string | null; thumbnail_url: string | null; quality_mode: string | null; duration: number | null }

export function ConversionProof() {
  const [film, setFilm] = useState<OwnFilm | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    void fetch('/api/videos', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { videos?: { status?: string; video_url?: string; title?: string | null; thumbnail_url?: string | null; quality_mode?: string | null; duration?: number | null }[] } | null) => {
        const own = d?.videos?.find(v => v.status === 'completed' && v.video_url?.startsWith('https://'))
        if (alive && own?.video_url) setFilm({ video_url: own.video_url, title: typeof own.title === 'string' && own.title.trim() ? own.title.trim().slice(0, 80) : null, thumbnail_url: typeof own.thumbnail_url === 'string' && own.thumbnail_url.startsWith('https://') ? own.thumbnail_url : null, quality_mode: own.quality_mode ?? null, duration: typeof own.duration === 'number' ? own.duration : null })
      }).catch(() => {})
    return () => { alive = false }
  }, [])
  return <figure style={{ margin: '12px 0 18px' }}>
    <video controls playsInline preload={film && !failed ? 'metadata' : 'none'} src={failed ? SAMPLE?.videoPath : film?.video_url ?? SAMPLE?.videoPath}
      poster={film && !failed ? film.thumbnail_url ?? undefined : SAMPLE?.arenaPosterPath}
      onError={() => setFailed(true)}
      style={{ width: '100%', maxHeight: 200, borderRadius: 12, background: '#111' }} />
    <figcaption style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
      {film && !failed && film.title ? <strong style={{ display: 'block', fontSize: 13, color: 'var(--text)' }}>{film.title}</strong> : null}
      {film && !failed ? 'Your completed film — keep creating with your own ideas.' : 'A short excerpt from a Kineo founder film · Seedance 1.5. Your purchase creates your own film or clips.'}
      {film && !failed ? <FilmsLikeThisNote qualityMode={film.quality_mode} seconds={film.duration} /> : null}
    </figcaption>
  </figure>
}

/** KINEO-PRECO-MERCADO-0411 — sem avulso à venda o cartão não existe; casca fora do cartão para não chamar hook à toa. */
export function ConversionPassCard(props: { surface: ConversionSurface; onBuy: () => void; disabled?: boolean }) {
  return FILM_PASS_LIVE ? <ConversionPassCardVenda {...props} /> : null
}

function ConversionPassCardVenda({ surface, onBuy, disabled = false }: { surface: ConversionSurface; onBuy: () => void; disabled?: boolean }) {
  const observation = useOfferObservation(surface, 'pass')
  const offer = conversionPass()
  return <div ref={observation.root} data-conversion-pass={MRR_CONVERSION_VERSION} style={{ ...panel, borderColor: 'var(--accent)', marginBottom: 18 }}>
    <p style={{ margin: '0 0 5px', fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>START WITH ONE FILM · NO SUBSCRIPTION</p>
    <strong style={{ fontSize: 23 }}>{offer.price} once</strong>
    <p style={{ margin: '8px 0', lineHeight: 1.5 }}>{offer.capacity}, made from your own idea.</p>
    <p style={{ fontSize: 12, color: 'var(--muted)' }}>MiniMax H3 Turbo. Choose films or clips from the same allowance; other engines, durations and extras use it differently. No renewal.</p>
    <button type="button" disabled={disabled} style={{ ...button, width: '100%', background: 'var(--accent)', color: 'var(--on-accent)', opacity: disabled ? 0.6 : 1 }} onClick={() => { observation.gesture('pass'); onBuy() }}>
      {disabled ? 'Opening checkout…' : `Make my own · ${offer.price} once`}
    </button>
  </div>
}

/** KINEO-PAYWALL-FILME-PRIMEIRO-1510 — o que o pai sabe da conta para a caixa abrir com o filme na frente. */
export interface ConversionFilmFirst {
  /** Filmes ENTREGUES (status completed). null = não sei → a caixa de hoje. */
  filmsDelivered: number | null
  /** A última ideia digitada, já curta (ideiaDoCartao). null = o cartão convida a escrever uma. */
  idea: string | null
  /** O filme grátis que o servidor entrega agora (o saldo do teste paga), ou null. A região é lida aqui. */
  freeFilm: { variant: FilmeGratisVariante; seconds: number } | null
  /** Fecha a caixa e deixa o Studio no motor/duração do filme grátis. Não gera nada. */
  onStart: (variant: FilmeGratisVariante) => void
}

/** KINEO-PAYWALL-FILME-PRIMEIRO-1510 — o cartão grande do filme grátis, no topo da caixa (16 línguas). */
function FreeFilmFirstCard({ variant, seconds, idea, onStart }: { variant: FilmeGratisVariante; seconds: number; idea: string | null; onStart: (variant: FilmeGratisVariante) => void }) {
  const language = useInterfaceLanguage()
  const copy = copyDoFilmePrimeiro(language)
  const shown = useRef(false)
  const meta = { ...conversionMetadata('upgrade', 'free_film'), version: PAYWALL_FILME_PRIMEIRO_VERSION, variant, seconds, has_idea: idea !== null, language, surface: 'generate_upgrade_modal' }
  useEffect(() => {
    if (shown.current) return
    shown.current = true
    void trackEvent(FREE_FILM_OFFERED_EVENT, meta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div data-filme-primeiro="free_film" data-variant={variant} dir={interfaceLanguageIsRtl(language) ? 'rtl' : undefined}
    style={{ ...panel, border: '2px solid var(--accent)', padding: 20, margin: '6px 0 18px', clear: 'both' }}>
    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--accent)', fontWeight: 800, letterSpacing: 0.4 }}>{copy.kicker}</p>
    <strong style={{ display: 'block', fontSize: 24, lineHeight: 1.2 }}>{copy.title(seconds)}</strong>
    {idea
      ? <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginBottom: 3 }}>{copy.ideaLabel}</span>
          “{idea}”
        </p>
      : null}
    <p style={{ margin: '12px 0 14px', lineHeight: 1.5 }}>{idea ? copy.body : copy.bodyNoIdea}</p>
    <button type="button" data-testid="free-film-first" style={{ ...button, width: '100%', fontSize: 17, padding: '15px 16px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none' }}
      onClick={() => { void trackEvent(FREE_FILM_CLICKED_EVENT, meta); onStart(variant) }}>
      {copy.cta}
    </button>
  </div>
}

/** KINEO-PAYWALL-FILME-PRIMEIRO-1510 — o passe da região no topo: marca a impressão do "passe primeiro" e embrulha o cartão. */
function PassFirstLead({ children }: { children: ReactNode }) {
  const shown = useRef(false)
  useEffect(() => {
    if (shown.current) return
    shown.current = true
    void trackEvent(PASS_FIRST_OFFERED_EVENT, { ...conversionMetadata('upgrade', 'pass'), version: PAYWALL_FILME_PRIMEIRO_VERSION, surface: 'generate_upgrade_modal' })
  }, [])
  return <div data-filme-primeiro="region_pass" style={{ clear: 'both', marginTop: 6 }}>{children}</div>
}

export default function ConversionUpgrade({ currency, region, onClose, onUpgrade, onFilmPass: onFilmPassProp, loading, error, freeAction, regionPass: regionPassProp = null, filmFirst = null }: {
  currency: CheckoutCurrency | null; region: PriceRegion; onClose: () => void
  onUpgrade: (tier: ConversionTier, billing?: ConversionBilling) => void
  onFilmPass: (() => void) | null; loading: boolean; error: string | null
  freeAction?: { label: string; onClick: () => void } | null
  /** KINEO-SAIDA-REGIAO-2026-10-07 — a parede pede o passe da região (o pai só passa isto para quem não assina). */
  regionPass?: { beforeBuy?: () => void } | null
  /** KINEO-PAYWALL-FILME-PRIMEIRO-1510 — ausente = a caixa de hoje, byte a byte. */
  filmFirst?: ConversionFilmFirst | null
}) {
  // KINEO-PAYWALL-FILME-PRIMEIRO-1510 — a região só é lida para quem tem 0 filmes e nenhum filme grátis provado pelo pai.
  const readRegion = Boolean(filmFirst && !filmFirst.freeFilm && filmFirst.filmsDelivered === 0)
  const regionProfile = useOwnRegionProfile(readRegion)
  const regionPending = readRegion && regionProfile === undefined
  const lead = filmFirst ? decidirFilmePrimeiro({
    filmsDelivered: filmFirst.filmsDelivered,
    isSubscriber: false, // o pai só monta esta caixa para quem não assina (MRR_CONVERSION_ENABLED && notPaidProven && !isSubscriber)
    notPaidProven: true,
    freeFilm: filmFirst.freeFilm !== null,
    regionFreeFilm: readRegion && regionProfile ? regionFreeFilmAvailable(regionProfile, filmFirst.filmsDelivered) : false,
    regionPaidOnly: !readRegion ? false : regionProfile === undefined ? null : paidOnlyEntry(regionProfile ?? null),
  }) : null
  const leadFree = lead === 'free_film' && filmFirst
    ? (filmFirst.freeFilm ?? { variant: 'region_free_film' as const, seconds: REGION_FREE_FILM_SECONDS })
    : null
  // Com o passe no topo (ou enquanto a região ainda está sendo lida), o lugar de sempre do passe fica vazio: um passe só,
  // montado uma vez (a oferta de região grava evento de servidor a cada montagem).
  const passMovedOrPending = lead === 'region_pass' || regionPending
  const regionPass = passMovedOrPending ? null : regionPassProp
  const onFilmPass = passMovedOrPending ? null : onFilmPassProp
  // KINEO-PAREDE-MENSAL-1111 — a aba que abre selecionada vem do interruptor (lib/offers/paredeMensal1111.ts): 'on' = mensal, 'off' =
  // anual (o de antes). O anual segue a um clique, com o mesmo "save 30%". A impressão da parede grava qual aba abriu.
  const [billing, setBilling] = useState<ConversionBilling>(paredeBillingInicial())
  const observation = useOfferObservation('upgrade', 'menu', true, PAREDE_VIEW_META)
  const close = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    close.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && observation.root.current) {
        const nodes = [...observation.root.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],video')]
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [observation.root])
  return <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', padding: 12 }}>
    <div ref={observation.root} role="dialog" aria-modal="true" aria-labelledby="conversion-upgrade-title" data-conversion-upgrade={MRR_CONVERSION_VERSION}
      onClick={e => e.stopPropagation()} onClickCapture={e => { const control = (e.target as HTMLElement).closest('button,video'); if (control && control !== close.current) observation.gesture(control.tagName === 'VIDEO' ? 'play_proof' : 'choose_offer') }}
      style={{ width: '100%', maxWidth: 570, maxHeight: '92dvh', overflowY: 'auto', borderRadius: 20, padding: 22, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
      <button ref={close} type="button" aria-label="Close upgrade" onClick={onClose} style={{ ...button, float: 'right', padding: '6px 10px' }}>×</button>
      {leadFree && filmFirst && <FreeFilmFirstCard variant={leadFree.variant} seconds={leadFree.seconds} idea={filmFirst.idea} onStart={filmFirst.onStart} /> /* KINEO-PAYWALL-FILME-PRIMEIRO-1510 */}
      {lead === 'region_pass' && <PassFirstLead>{REGION_PASS_OFFER_LIVE && regionPassProp
        ? <RegionPassOffer surface="wall" beforeBuy={regionPassProp.beforeBuy} fallback={onFilmPassProp ? <ConversionPassCard surface="upgrade" onBuy={onFilmPassProp} disabled={loading} /> : null} />
        : onFilmPassProp && <ConversionPassCard surface="upgrade" onBuy={onFilmPassProp} disabled={loading} />}</PassFirstLead> /* KINEO-PAYWALL-FILME-PRIMEIRO-1510 */}
      <h2 id="conversion-upgrade-title" style={{ fontSize: 25, lineHeight: 1.2, margin: '6px 40px 10px 0' }}>Your idea. Your next film.</h2>
      {lead === null && !regionPending && <ConversionProof /> /* KINEO-PAYWALL-FILME-PRIMEIRO-1510: com o filme dela (ou o passe) na frente, a amostra da casa sai */}
      {freeAction && !leadFree && <div style={{ ...panel, marginBottom: 14 }}><p style={{ marginTop: 0 }}>You still have a film available before you buy.</p><button style={button} type="button" onClick={freeAction.onClick}>{freeAction.label}</button></div>}
      {REGION_PASS_OFFER_LIVE && regionPass
        ? <RegionPassOffer surface="wall" beforeBuy={regionPass.beforeBuy} fallback={onFilmPass ? <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} /> : null} />
        : onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />}
      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Making more? Choose a plan.</h3>
      <div role="group" aria-label="Billing period" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['monthly', 'annual'] as const).map(value => <button type="button" key={value} aria-pressed={billing === value}
          onClick={() => setBilling(value)} style={{ ...button, flex: 1, borderColor: billing === value ? 'var(--accent)' : 'var(--border)' }}>
          {value === 'monthly' ? 'Monthly' : `Annual · save ${ANNUAL_DISCOUNT_PERCENT}%`}
        </button>)}
      </div>
      {CONVERSION_TIERS.map(tier => {
        const plan = currency ? conversionPlan(tier, billing, currency, region) : null
        return <button type="button" key={tier} disabled={loading || !plan} onClick={() => onUpgrade(tier, billing)}
          style={{ ...button, display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, opacity: loading ? 0.6 : 1 }}>
          <strong>{CONVERSION_NAMES[tier]} · {plan ? `${plan.price} ${plan.period}` : 'Loading price…'}</strong>
          {plan?.annualSaving ? <span data-kineo="upgrade-annual-saving" style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>Save {plan.annualSaving}/yr</span> : null}{/* KINEO-DECISOES-PRECO-3110 — a economia do anual em dinheiro, como InVideo/Runway/HeyGen */}
          <ConversionPlanCapacity key={`${tier}_${billing}`} tier={tier} billing={billing} currency={currency} region={region} surface="upgrade" />
        </button>
      })}
      <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>Capacity uses MiniMax H3 Turbo, with the entire allowance used for one format, without extras. Films and clips are alternatives, not added together.</p>
      <FilmsMadeProof surface="upgrade" />{/* KINEO-VALOR-NO-CHECKOUT-3110 — a prova social real, colada nos botões de pagar (muda abaixo do piso) */}
      {/* KINEO-CHECKOUT-CLAREZA-1610 — a garantia única (a mesma do /pricing), sob os botões de pagar, nos dois modos. */}
      <p data-testid="upgrade-guarantee" style={{ color: 'var(--muted)', fontSize: 12 }}>{MONEY_BACK_GUARANTEE} Cancel anytime. <a href="/terms">Terms</a></p>
      {/* KINEO-PACOTE-3-FILMES-1610 — saída discreta para quem não quer assinar: a equipe faz 3 filmes por US$ 19, único. */}
      <p data-testid="upgrade-dfy-films3" style={{ color: 'var(--muted)', fontSize: 12, margin: '4px 0 0' }}><a href={dfyFilms3EntryHref('upgrade_modal')} style={{ color: 'inherit' }}>{dfyFilms3EntryCopy()}</a></p>
      {error && <p role="alert" style={{ color: 'var(--danger, #d43b3b)' }}>{error}</p>}
    </div>
  </div>
}

export function ConversionPricingEntry() {
  const [eligible, setEligible] = useState(false)
  const checkout = useCheckoutLaunch('mrr_conversion_pricing_pass')
  useEffect(() => {
    if (!MRR_CONVERSION_ENABLED) return
    let alive = true
    const client = createClient()
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile, error } = await client.from('profiles').select('trial_status,has_paid,plan').eq('id', data.user.id).single()
      if (alive && !error) setEligible(paidOnlyEntry(profile))
    }).catch(() => {})
    return () => { alive = false }
  }, [])
  if (!MRR_CONVERSION_ENABLED || !eligible) return null
  return <div style={{ maxWidth: 700, margin: '0 auto 24px' }}>
    {REGION_PASS_OFFER_LIVE /* KINEO-SAIDA-REGIAO-2026-10-07: o passe na moeda local; fora da régua, o cartão de sempre */
      ? <RegionPassOffer surface="pricing" fallback={<ConversionPassCard surface="pricing" disabled={checkout.pending !== null} onBuy={() => {
      checkout.launch('pass', conversionCheckoutHref('/api/stripe/checkout?pack=starter', 'pricing', 'pass'), conversionMetadata('pricing', 'pass'))
    }} />} />
      : <ConversionPassCard surface="pricing" disabled={checkout.pending !== null} onBuy={() => {
      checkout.launch('pass', conversionCheckoutHref('/api/stripe/checkout?pack=starter', 'pricing', 'pass'), conversionMetadata('pricing', 'pass'))
    }} />}
    {checkout.error && <p role="alert">{checkout.error}</p>}
  </div>
}
