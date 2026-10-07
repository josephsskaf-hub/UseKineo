'use client'

// KINEO-E4-SAIDA-B-2026-09-29 — o aviso honesto para quem nasceu fora do filme grátis (saída B do fundador).
//
// A conta de país fora da lista nasce com trial_status='region_paid_only' e 0 crédito (lib/reverseTrial.ts). Sem
// isto ela só descobria no clique, com uma parede de saldo que parece defeito. Esta faixa diz a verdade no topo de toda
// tela autenticada — "o filme grátis ainda não está disponível no seu país; os planos funcionam normalmente" — com o
// botão dos planos. Texto em pt/en/es (lib/freeFilmPolicy.ts REGION_PAID_ONLY_NOTICE, pela língua escolhida da
// interface; as outras caem no inglês). Some sozinha quando a pessoa paga (regionPaidOnlyNoticeVisible, no servidor).
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { REGION_FREE_CLIP_CREDITS, REGION_FREE_CLIP_HREF, REGION_FREE_CLIP_NOTICE, REGION_PAID_ONLY_NOTICE, REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'
import { REGION_FREE_CLIP_NOTICE_FILM_LIVE, REGION_FREE_FILM_CREDITS, REGION_FREE_FILM_HREF, REGION_FREE_FILM_LIVE, REGION_FREE_FILM_NOTICE, REGION_PLANS_NOTICE_FILM_LIVE } from '@/lib/freeFilmPolicy' // KINEO-SAIDA-REGIAO-2026-10-07
import { PREVIA_CENAS_PUBLIC, PREVIA_COPY } from '@/lib/scenePreview' // KINEO-PREVIA-CENAS-2026-10-03
import FreeClipNotice from '@/components/FreeClipNotice' // KINEO-AVISO-CLIPE-GRATIS-2026-10-06
import { freeClipNoticeSurface, freeClipStillAvailable } from '@/lib/clips/freeClipNotice'

export const REGION_PAID_ONLY_BANNER_VERSION = 'region_paid_only_notice_v1' as const

// KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — no /studio e no /clips, quem TEM o clipe grátis e ainda não usou (freeClip: o layout
// calculou regionFreeClipAvailable no servidor) vê "Você tem 1 clipe grátis" NO LUGAR desta faixa — uma faixa só, com o botão
// dos planos dentro (components/FreeClipNotice.tsx). Nas outras telas, e para quem não tem o presente, a faixa de sempre.
// KINEO-SAIDA-REGIAO-2026-10-07 (a) — com o filme grátis de região ligado: `freeFilm` (o layout calculou
// regionFreeFilmAvailable no servidor) põe "Seu primeiro filme é grátis" NA FRENTE de tudo — o filme primeiro, o clipe
// depois. Usou o filme nesta aba (saldo abaixo de 1 filme), a faixa volta ao de sempre na hora. Com o filme ligado, as
// faixas de sempre trocam o texto por um que não diz "não disponível no seu país" (seria mentira).
export default function RegionPaidOnlyBanner({ freeClip = false, freeFilm = false }: { freeClip?: boolean; freeFilm?: boolean }) {
  const gift = useFreeClipGift(freeClip)
  const film = useRegionFilmGift(REGION_FREE_FILM_LIVE && freeFilm) // KINEO-SAIDA-REGIAO-2026-10-07
  const surface = freeClipNoticeSurface(usePathname(), gift)
  if (REGION_FREE_FILM_LIVE && film) return <RegionFreeFilmStrip /> // KINEO-SAIDA-REGIAO-2026-10-07
  if (surface) return <FreeClipNotice key={surface} surface={surface} />
  if (REGION_FREE_FILM_LIVE) return <RegionPaidOnlyStrip freeClip={gift} filmLive /> // KINEO-SAIDA-REGIAO-2026-10-07
  return <RegionPaidOnlyStrip freeClip={gift} />
}

// KINEO-SAIDA-REGIAO-2026-10-07 (a) — o filme grátis continua de pé depois de uma mudança de saldo NESTA aba? A MESMA regra
// pura do clipe (freeClipStillAvailable), com o custo de 1 filme. Só desliga (ou religa) o que o servidor ligou.
function useRegionFilmGift(serverSaid: boolean): boolean {
  const [gift, setGift] = useState(serverSaid)
  useEffect(() => {
    setGift(serverSaid)
    if (!serverSaid) return
    let alive = true
    const recheck = () => {
      fetch('/api/credits', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) setGift((current) => freeClipStillAvailable(serverSaid, current, d, REGION_FREE_FILM_CREDITS)) })
        .catch(() => {})
    }
    window.addEventListener('creditsChanged', recheck)
    return () => {
      alive = false
      window.removeEventListener('creditsChanged', recheck)
    }
  }, [serverSaid])
  return gift
}

// KINEO-SAIDA-REGIAO-2026-10-07 (a) — "Seu primeiro filme é grátis": o botão leva ao Studio no Seedance de 15 s (no próprio
// /studio não há botão — um link para a página em que a pessoa já está é o botão morto medido em 06/10); os planos
// continuam ao lado (o CTA que vende). Texto nas cores do TEMA, como a faixa de sempre.
function RegionFreeFilmStrip() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(REGION_FREE_FILM_NOTICE, language)
  const plansCta = pickInterfaceCopy(REGION_PAID_ONLY_NOTICE, language).cta
  const path = usePathname()
  const onStudio = typeof path === 'string' && path.replace(/\/+$/, '') === '/studio'
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('region_paid_only_notice_shown', { version: REGION_PAID_ONLY_BANNER_VERSION, language, variant: 'free_film' })
  }, [language])

  return (
    <div
      data-region-paid-only={REGION_PAID_ONLY_BANNER_VERSION}
      data-region-free-film="1"
      role="status"
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))',
        border: '1px solid rgba(41,151,255,.4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 220, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.body}</div>
      </div>
      {!onStudio ? (
        <Link
          href={REGION_FREE_FILM_HREF}
          data-testid="region-free-film"
          onClick={() => { void trackEvent('region_free_film_cta_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
          style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {copy.cta}
        </Link>
      ) : null}
      <Link
        href={REGION_PAID_ONLY_PLANS_HREF}
        data-testid="region-paid-only-plans"
        onClick={() => { void trackEvent('region_paid_only_notice_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language, variant: 'free_film' }) }}
        style={{ color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
      >
        {plansCta}
      </Link>
    </div>
  )
}

// KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — o layout decide no servidor e não roda de novo numa navegação dentro do app: o saldo
// que muda NESTA aba (clipe pedido, estorno, pagamento — todos disparam `creditsChanged`) decide aqui, pela regra pura
// freeClipStillAvailable. Usou o presente (ou pagou): na hora, o aviso dá lugar à faixa dos planos — o CTA que vende fica.
function useFreeClipGift(serverSaid: boolean): boolean {
  const [gift, setGift] = useState(serverSaid)
  useEffect(() => {
    setGift(serverSaid)
    if (!serverSaid) return
    let alive = true
    const recheck = () => {
      fetch('/api/credits', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) setGift((current) => freeClipStillAvailable(serverSaid, current, d, REGION_FREE_CLIP_CREDITS)) })
        .catch(() => {})
    }
    window.addEventListener('creditsChanged', recheck)
    return () => {
      alive = false
      window.removeEventListener('creditsChanged', recheck)
    }
  }, [serverSaid])
  return gift
}

// KINEO-CLIPE-GRATIS-REGIAO-2026-10-05 (fundador, item 1A) — com o clipe grátis disponível (5 cr dados no cadastro), a faixa
// vira "seu primeiro clipe é grátis" com o botão para o /clips; os planos descem para o botão secundário. Usou o clipe
// (saldo < 5) = volta a faixa de sempre.
function RegionPaidOnlyStrip({ freeClip, filmLive = false }: { freeClip: boolean; filmLive?: boolean }) {
  const language = useInterfaceLanguage()
  const copyHoje = pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE : REGION_PAID_ONLY_NOTICE, language)
  // KINEO-SAIDA-REGIAO-2026-10-07 — com o filme grátis de região ligado, os mesmos dois estados sem "não disponível no seu país".
  const copy = filmLive ? pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE_FILM_LIVE : REGION_PLANS_NOTICE_FILM_LIVE, language) : copyHoje
  const plansCta = pickInterfaceCopy(REGION_PAID_ONLY_NOTICE, language).cta
  const previa = pickInterfaceCopy(PREVIA_COPY, language) // KINEO-PREVIA-CENAS-2026-10-03
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('region_paid_only_notice_shown', { version: REGION_PAID_ONLY_BANNER_VERSION, language, variant: freeClip ? 'free_clip' : 'plans' })
  }, [language, freeClip])

  return (
    <div
      data-region-paid-only={REGION_PAID_ONLY_BANNER_VERSION}
      role="status"
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))',
        border: '1px solid rgba(41,151,255,.4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {/* KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — texto nas cores do TEMA: o claro é o padrão desde a PORCELANA (30/09) e o branco
          fixo desta faixa (desenhada em 29/09, no app escuro) sumia nele — título, texto e "See plans" quase invisíveis
          (medido em 06/10 com o Edge sem cabeça). O botão azul com texto preto lê nos dois temas e fica como estava. */}
      <div style={{ minWidth: 220, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.body}</div>
      </div>
      {/* KINEO-PREVIA-CENAS-2026-10-03 — antes dos planos, a prévia grátis das cenas (o produto funcionando por centavos). */}
      {freeClip ? (
        <Link
          href={REGION_FREE_CLIP_HREF}
          data-testid="region-free-clip"
          onClick={() => { void trackEvent('region_free_clip_cta_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
          style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {copy.cta}
        </Link>
      ) : null}
      {!freeClip && PREVIA_CENAS_PUBLIC ? (
        <Link
          href="/studio/previa"
          data-testid="region-paid-only-preview"
          onClick={() => { void trackEvent('region_paid_only_preview_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
          style={{ color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {previa.bannerPreview}
        </Link>
      ) : null}
      <Link
        href={REGION_PAID_ONLY_PLANS_HREF}
        data-testid="region-paid-only-plans"
        onClick={() => { void trackEvent('region_paid_only_notice_clicked', { version: REGION_PAID_ONLY_BANNER_VERSION, language }) }}
        style={freeClip
          ? { color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }
          : {
            background: '#2997ff',
            color: '#000',
            borderRadius: 999,
            padding: '11px 18px',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
      >
        {freeClip ? plansCta : copy.cta}
      </Link>
    </div>
  )
}
