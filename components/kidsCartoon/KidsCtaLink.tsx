'use client'

// KINEO-BEBE-QUE-FALA-2010 — o botão das páginas estáticas do AI Kids Cartoon Stories (padrão do components/ugc/UgcCtaLink.tsx):
// o HTML nasce com o caminho do VISITANTE (/signup?redirect=/kids-cartoon…) e, depois da hidratação, quem já tem sessão vai direto
// ao template. A sessão é lida do armazenamento local (sem rede) só para escolher o link — o /kids-cartoon confere no servidor.
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { kidsCartoonTemplateHref } from '@/lib/kidsCartoon/kidsCartoon'

export default function KidsCtaLink({ campaign, placement, className, children }: { campaign: string; placement: string; className?: string; children: ReactNode }) {
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
  const href = kidsCartoonTemplateHref(signedIn, campaign)
  return (
    <Link href={href} className={className} data-kids-cta={campaign} onClick={() => { void trackEvent('organic_cta_clicked', { source: campaign, placement, destination: href.split('?')[0] }) }}>
      {children}
    </Link>
  )
}
