'use client'

// KINEO-PAGINAS-UGC-2010 — o botão do 1º anúncio UGC grátis nas páginas estáticas do AI UGC Ads.
// A página é estática (não sabe quem olha): o HTML nasce com o caminho do VISITANTE (/signup?redirect=<montador na entrada UGC>)
// e, depois da hidratação, quem já tem sessão passa a ir direto ao montador (/ads/v2?entry=ugc…). A sessão é lida do armazenamento
// local (getSession, sem rede): serve só para escolher o link — o /ads/v2 confere a conta no servidor de qualquer jeito.
// O clique grava o mesmo evento de todas as páginas orgânicas (organic_cta_clicked) com a campanha da página.
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { ugcCtaHref } from '@/lib/seo/paginasUgc2010'

export default function UgcCtaLink({ campaign, placement, className, children }: { campaign: string; placement: string; className?: string; children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let alive = true
    try {
      createClient().auth.getSession()
        .then(({ data }) => { if (alive && data?.session?.user) setSignedIn(true) })
        .catch(() => { /* sem sessão legível: fica o caminho do visitante */ })
    } catch { /* idem */ }
    return () => { alive = false }
  }, [])
  const href = ugcCtaHref(campaign, signedIn)
  return (
    <Link
      href={href}
      className={className}
      data-ugc-cta={campaign}
      onClick={() => { void trackEvent('organic_cta_clicked', { source: campaign, placement, destination: href.split('?')[0] }) }}
    >
      {children}
    </Link>
  )
}
