'use client'
// KINEO-CTA-LOGADO-2026-09-01 — reportado pelo fundador com a conta logada:
// o botão do topo desta página dizia "Sign in" PARA TODO MUNDO, inclusive
// para quem já está dentro. Um assinante que chega aqui pelo link da home
// clicava, caía no /login (que até redireciona de volta — mas o convite em
// si já é errado: a página fingia não conhecer o cliente).
//
// O padrão é o mesmo do NavCreditsBadge: renderiza "Sign in" no servidor
// (SEO e visitante deslogado intactos) e, no cliente, UMA chamada barata ao
// /api/credits com o cookie decide — 200 = logado, o botão vira
// "Open Studio →". Qualquer falha da chamada mantém "Sign in": o pior caso
// é o comportamento antigo.
import Link from 'next/link'
import { useEffect, useState } from 'react'

const PILL: React.CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 850,
  background: '#24262c',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 999,
  padding: '9px 15px',
}

export default function AgencyHeaderCta() {
  const [logged, setLogged] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/credits', { cache: 'no-store' })
      .then((r) => {
        if (!cancelled && r.ok) setLogged(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return logged ? (
    <Link href="/studio" style={{ ...PILL, background: '#2997ff', border: '1px solid rgba(120,190,255,.8)' }}>
      Open Studio →
    </Link>
  ) : (
    <Link href="/login?redirect=%2Fai-shorts-for-agencies" style={PILL}>
      Sign in
    </Link>
  )
}
