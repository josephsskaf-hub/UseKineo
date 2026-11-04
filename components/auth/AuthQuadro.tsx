'use client'

// KINEO-LOGIN-QUADRO-0411 — fundador 04/11: "eu quero que o meu login volte a ser assim, esse quadro no meio".
// O mesmo quadro em /login, /signup e no modal da home: vitrine à esquerda, formulário à direita. No celular, só o formulário.
import type { ReactNode } from 'react'
import Link from 'next/link'
import AuthVitrine from '@/components/auth/AuthVitrine'
import AuthFundo from '@/components/auth/AuthFundo'

export default function AuthQuadro({ inModal, children }: { inModal: boolean; children: ReactNode }) {
  const quadro = (
    <div
      className="w-full grid grid-cols-1 md:grid-cols-2"
      style={inModal
        ? { background: 'var(--card)' }
        : { position: 'relative', zIndex: 1, maxWidth: 960, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 90px rgba(0, 0, 0, 0.45)' }}
    >
      {/* KINEO-LOGIN-X-0411 — fundador 04/11: "precisa ter um jeito pra sair do login e voltar ao site, sem a seta do navegador". No modal, o X já existe. */}
      {!inModal && (
        <Link
          href="/"
          aria-label="Close and go back to the site"
          title="Back to the site"
          data-auth-fechar="true"
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card2)', border: '1px solid var(--border2)', color: 'var(--muted2)', fontSize: 15, lineHeight: 1, textDecoration: 'none' }}
        >
          <span aria-hidden="true">✕</span>
        </Link>
      )}
      <div className="hidden md:block" style={{ padding: 10, minWidth: 0 }}>
        <AuthVitrine />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8 relative z-10 animate-fade-in-up" style={{ minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
  if (inModal) return quadro
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: '#05060c' }}>
      <AuthFundo />
      {quadro}
    </div>
  )
}
