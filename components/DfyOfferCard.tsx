'use client'

// KINEO-EMPRESAS-DFY-2026-09-23 — o cartão "quer que a gente faça?" dentro do
// Studio, no instante em que alguém escreve um pedido de anúncio de empresa.
//
// POR QUÊ (ver o cabeçalho de lib/growth/dfyOffer.ts): onze pedidos de anúncio
// de empresa foram escritos no Studio em 90 dias, metade vindos do ChatGPT com
// briefing completo. Todos receberam um Short de curiosidades e saíram com 0
// crédito. O fundador mandou VENDER ANTES DE CONSTRUIR: Payment Link da Stripe,
// cartão aqui, os 3 primeiros à mão.
//
// KINEO-EMPRESAS-DOIS-DEGRAUS-2026-09-24 — Express US$35 e Pro US$75 (fundador,
// 24/09), um botão por degrau LIGADO. Sem degrau ligado o cartão não existe.
//
// KINEO-EMPRESAS-COCKPIT-2026-09-24 — o cético do workflow (24/09 ~04h BRT) provou
// que a v2 montava o cartão SÓ no passo 2 do /studio/create, e o caminho principal
// do Studio (cockpit → ?studio=1 → cortina → disparo automático) passava por cima
// dele: para os 4 leads reais (0 crédito, motor padrão Kineo 1 grátis) o cartão
// nunca chegava a existir antes do Generate. Mesma família da memória "aviso que o
// auto-disparo pula". Agora o cartão também mora no COCKPIT (StudioClient), acima
// do botão go, e por isso:
//   · resolve a própria identidade (supabase.auth.getUser) quando a tela não passa
//     userId/email — o cockpit não conhece nenhum dos dois — para que o link leve
//     client_reference_id e prefilled_email;
//   · uma impressão por SUPERFÍCIE por carregamento de página (Set de módulo),
//     além do ref por montagem: cada 402→options remontava o cartão e inflava
//     `dfy_card_shown` para a mesma pessoa e o mesmo texto;
//   · utm_source é o padrão do módulo (studio_dfy_card) — a v2 repassava `source`
//     e a Stripe recebia utm_source=studio_analysis, que documento nenhum previa;
//   · cores com fallback: o kit do cockpit não define --text/--muted.
//
// O QUE ESTE CARTÃO DECIDE: nada. `isDfyOfferLive()` (interruptor por degrau),
// `isDfyCandidate(prompt)` (a regex estrita) e `dfyPaymentLink()` moram no
// módulo puro. Aqui só se pinta, se abre o link em nova aba e se mede:
// `dfy_card_shown` (ver acima) e `dfy_card_clicked` com o degrau. O render
// normal continua ao alcance da pessoa — o cartão fica ANTES do botão e não o
// esconde.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import {
  DFY_OFFER_VERSION,
  dfyCardCopy,
  dfyPaymentLink,
  isDfyCandidate,
  isDfyOfferLive,
} from '@/lib/growth/dfyOffer'
// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — terceira saída do cartão, FORA de dfyCardCopy() (que segue com 2 opções,
// guardião test-tres-jogadas): "faça você mesmo no Studio Ads", só com o passe à venda (adsPassLive()).
import { adsPassLive } from '@/lib/ads/offer'

/** Superfícies (`source`) que já registraram impressão neste carregamento de página. */
const impressionKeys = new Set<string>()

export default function DfyOfferCard({
  prompt,
  userId,
  email = null,
  source,
}: {
  prompt: string
  userId: string | null
  email?: string | null
  source: string
}) {
  const live = isDfyOfferLive()
  const candidate = live && isDfyCandidate(prompt)
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId ?? null)
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(email ?? null)

  useEffect(() => {
    if (userId) setResolvedUserId(userId)
    if (email) setResolvedEmail(email)
    if ((userId && email) || !candidate) return
    let alive = true
    try {
      createClient().auth.getUser()
        .then(({ data }) => {
          if (!alive) return
          if (!userId && data?.user?.id) setResolvedUserId(data.user.id)
          if (!email && data?.user?.email) setResolvedEmail(data.user.email)
        })
        .catch(() => { /* sem identidade o link ainda funciona: a Stripe pede o e-mail */ })
    } catch {
      /* idem */
    }
    return () => { alive = false }
  }, [userId, email, candidate])

  const copy = candidate ? dfyCardCopy() : null
  const options = copy
    ? copy.options
        .map((o) => ({ ...o, href: dfyPaymentLink({ tier: o.tier, userId: resolvedUserId, email: resolvedEmail }) }))
        .filter((o): o is typeof o & { href: string } => typeof o.href === 'string')
    : []
  const href = options.length > 0 ? options[0].href : null
  const shownRef = useRef(false)

  useEffect(() => {
    if (!candidate || !href || impressionKeys.has(source) || shownRef.current) return
    shownRef.current = true
    impressionKeys.add(source)
    try {
      void trackEvent('dfy_card_shown', {
        source,
        version: DFY_OFFER_VERSION,
        tiers: options.map((o) => o.tier).join(','),
        prompt_len: prompt.trim().length,
      })
    } catch {
      /* telemetria nunca derruba a tela */
    }
  }, [candidate, href, prompt, source, options])

  if (!candidate || !href || !copy) return null

  return (
    <section
      data-kineo="dfy-offer-card"
      data-version={DFY_OFFER_VERSION}
      data-source={source}
      className="gv-card rounded-2xl p-5 sm:p-6 mb-6"
      style={{ background: '#131316', border: '1px solid rgba(41,151,255,.35)', borderRadius: 16, padding: 20, marginBottom: 18, textAlign: 'left' }}
    >
      <div className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: '#5cb3ff', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
        {copy.eyebrow}
      </div>
      <h3 className="font-black text-base sm:text-lg mb-1.5" style={{ color: 'var(--text, #f5f5f7)', lineHeight: 1.25, fontSize: 18, fontWeight: 900, margin: '0 0 6px' }}>
        {copy.title}
      </h3>
      <p className="text-sm mb-3" style={{ color: 'var(--muted2, #a1a1a6)', lineHeight: 1.55, fontSize: 14, margin: '0 0 12px' }}>
        {copy.body}
      </p>
      <div className="flex flex-col gap-2.5" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((o) => (
          <a
            key={o.tier}
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            data-kineo-dfy-tier={o.tier}
            onClick={() => {
              try {
                void trackEvent('dfy_card_clicked', { source, version: DFY_OFFER_VERSION, tier: o.tier, price_minor: o.priceMinor })
              } catch {
                /* ignore */
              }
            }}
            className="block rounded-xl px-4 py-3 text-left"
            style={{
              display: 'block',
              borderRadius: 12,
              padding: '12px 16px',
              background: o.tier === 'pro' ? '#2997ff' : 'rgba(41,151,255,.12)',
              color: o.tier === 'pro' ? '#fff' : 'var(--text, #f5f5f7)',
              textDecoration: 'none',
              border: '1px solid rgba(41,151,255,.45)',
            }}
          >
            <span className="block text-sm font-black" style={{ display: 'block', fontSize: 14, fontWeight: 900 }}>{o.cta}</span>
            <span className="block text-xs mt-1" style={{ display: 'block', fontSize: 12, marginTop: 4, color: o.tier === 'pro' ? 'rgba(255,255,255,.85)' : 'var(--muted2, #a1a1a6)', lineHeight: 1.45 }}>
              {o.detail}
            </span>
          </a>
        ))}
        {adsPassLive() && (
          <a
            href="/ads?from=dfy_card"
            target="_blank"
            rel="noopener noreferrer"
            data-kineo="dfy-studio-ads-link"
            onClick={() => {
              try {
                void trackEvent('ads_dfy_upsell_clicked', { source, target: 'studio_ads', version: DFY_OFFER_VERSION })
              } catch {
                /* ignore */
              }
            }}
            style={{ display: 'block', padding: '8px 4px 2px', fontSize: 13, fontWeight: 700, color: '#5cb3ff', textDecoration: 'none', lineHeight: 1.45 }}
          >
            Make it yourself in Studio Ads →
          </a>
        )}
      </div>
      <p className="text-xs mt-2.5" style={{ color: 'var(--muted, #86868b)', fontSize: 12, margin: '10px 0 0' }}>
        {copy.fine}
      </p>
    </section>
  )
}
