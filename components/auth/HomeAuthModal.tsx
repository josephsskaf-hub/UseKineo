'use client'

// KINEO-LOGIN-MODAL-1410 — fundador 14/10 ("vai"): entrar e criar conta num MODAL por cima da home, como Higgsfield e
// Krea, em vez de trocar para as páginas /login e /signup.
//
// REGRA DE OURO: este arquivo NÃO autentica ninguém. Ele abre uma moldura e renderiza DENTRO dela as mesmas telas das
// páginas (app/(auth)/login/page.tsx e app/(auth)/signup/page.tsx), carregadas sob demanda. Mesmas chamadas do
// Supabase (signInWithPassword/signUp), mesmo botão do Google (GoogleSignInButton → /auth/callback?next=…), mesma
// checagem de e-mail descartável, mesmos eventos (signup_page/login_page, conversões do Google Ads e do TikTok,
// activation-completed que concede o trial por senha) e o mesmo ?redirect. Para isso funcionar sem tocar em uma linha
// da lógica, a URL da home recebe a MESMA query que a página receberia (lib/authModal.ts: `/?auth=signup&redirect=…`)
// ANTES de a tela montar — as telas leem window.location.search como sempre leram.
//
// Como abre:
//   · URL: `/?auth=login` ou `/?auth=signup` (+ `redirect=` e o resto da query) — links, e-mails, o middleware.
//   · Clique: na home, os links /login e /signup marcados com data-auth-modal (menu do topo e do celular) abrem o
//     modal; sem JavaScript, ou com Ctrl/Cmd-clique, o link continua indo para a página de sempre.
//   · Dentro do modal, "Sign up free" / "Sign in" trocam de aba no próprio modal, levando a query que a página levaria.
// Fecha: X, Esc ou clique no fundo. Foco preso dentro do modal enquanto aberto; volta para quem abriu ao fechar.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/analytics'
import { resolveAuthRedirect } from '@/lib/authRedirect'
import {
  AUTH_MODAL_LINK_ATTR,
  AUTH_MODAL_OPENED_EVENT,
  AUTH_MODAL_PARAM,
  authModalSearch,
  authModeFromParam,
  authModeFromPath,
  searchWithoutAuthModal,
  type AuthModalMode,
} from '@/lib/authModal'
import { AuthSurfaceProvider } from '@/components/auth/AuthSurfaceContext'

function ScreenLoading() {
  return (
    <div
      aria-busy="true"
      className="flex items-center justify-center"
      style={{ minHeight: 420, background: 'var(--card)', color: 'var(--muted)' }}
    >
      <div
        className="w-6 h-6 rounded-full"
        style={{ border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }}
      />
    </div>
  )
}

// As telas das páginas, sob demanda: a home não carrega um byte de autenticação até alguém pedir para entrar.
const LoginScreen = dynamic(() => import('@/app/(auth)/login/page'), { ssr: false, loading: ScreenLoading })
const SignupScreen = dynamic(() => import('@/app/(auth)/signup/page'), { ssr: false, loading: ScreenLoading })

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Trigger = 'url' | 'click' | 'switch'

export default function HomeAuthModal({ signedIn = false }: { signedIn?: boolean }) {
  const [mode, setMode] = useState<AuthModalMode | null>(null)
  // Remonta a tela a cada abertura/troca: ela lê a query no primeiro efeito, como a página faz no carregamento.
  const [instance, setInstance] = useState(0)
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // A URL da home a restaurar quando o modal fechar (null = modal aberto pela própria URL: só tira os parâmetros).
  const restoreUrlRef = useRef<string | null>(null)
  const modeRef = useRef<AuthModalMode | null>(null)
  modeRef.current = mode

  const open = useCallback((next: AuthModalMode, linkSearch: string, trigger: Trigger, opener?: HTMLElement | null) => {
    const { pathname, search, hash } = window.location
    if (modeRef.current === null) {
      restoreUrlRef.current = trigger === 'url' ? null : `${pathname}${search}${hash}`
      openerRef.current = opener ?? (document.activeElement as HTMLElement | null)
    }
    // A query entra na barra ANTES de a tela montar: é dela que a tela tira o ?redirect, o utm e o resto.
    window.history.replaceState(window.history.state, '', `${pathname}${authModalSearch(next, linkSearch)}${hash}`)
    // O menu do celular é um checkbox; fecha para não ficar aberto atrás do modal.
    const navToggle = document.getElementById('nav-toggle') as HTMLInputElement | null
    if (navToggle) navToggle.checked = false
    setMode(next)
    setInstance((n) => n + 1)
    void trackEvent(AUTH_MODAL_OPENED_EVENT, { mode: next, trigger })
  }, [])

  const close = useCallback(() => {
    if (modeRef.current === null) return
    const { pathname, search, hash } = window.location
    const back = restoreUrlRef.current ?? `${pathname}${searchWithoutAuthModal(search)}${hash}`
    window.history.replaceState(window.history.state, '', back)
    restoreUrlRef.current = null
    setMode(null)
    const opener = openerRef.current
    openerRef.current = null
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
  }, [])

  // Abertura pela URL (/?auth=login|signup), inclusive quando o middleware manda a rota protegida para cá.
  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const fromUrl = authModeFromParam(params.get(AUTH_MODAL_PARAM))
    if (!fromUrl) return
    if (signedIn) {
      // Quem já está logado não vê formulário: com destino, segue para ele (mesma régua do middleware em /login);
      // sem destino, só some o parâmetro.
      const redirect = params.get('redirect')
      if (redirect) {
        window.location.replace(resolveAuthRedirect(redirect, '/'))
        return
      }
      const { pathname, search, hash } = window.location
      window.history.replaceState(window.history.state, '', `${pathname}${searchWithoutAuthModal(search)}${hash}`)
      return
    }
    open(fromUrl, window.location.search, 'url')
  }, [open, signedIn])

  // Cliques: links marcados na home abrem o modal; dentro do modal, os links /login e /signup trocam de aba.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target as Element | null
      const anchor = target && typeof target.closest === 'function' ? (target.closest('a[href]') as HTMLAnchorElement | null) : null
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      const insideModal = Boolean(dialogRef.current && dialogRef.current.contains(anchor))
      if (!insideModal && !anchor.hasAttribute(AUTH_MODAL_LINK_ATTR)) return
      if (signedIn && !insideModal) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const next = authModeFromPath(url.pathname)
      if (!next) return
      // Sem stopPropagation: a telemetria do menu (nav_item_clicked) continua contando o clique.
      e.preventDefault()
      open(next, url.search, insideModal ? 'switch' : 'click', anchor)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [open, signedIn])

  // Esc fecha; Tab fica preso dentro do modal; o fundo não rola.
  useEffect(() => {
    if (!mode) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !dialog.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mode, close])

  // Popstate (voltar/avançar): o estado do modal segue a URL.
  useEffect(() => {
    function onPop() {
      const fromUrl = authModeFromParam(new URLSearchParams(window.location.search).get(AUTH_MODAL_PARAM))
      if (!fromUrl && modeRef.current) {
        restoreUrlRef.current = null
        setMode(null)
      } else if (fromUrl && fromUrl !== modeRef.current && !signedIn) {
        open(fromUrl, window.location.search, 'url')
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [open, signedIn])

  if (!mounted || !mode) return null

  return createPortal(
    <div
      className="kineo-auth-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10100,
        overflowY: 'auto',
        display: 'flex',
        padding: 16,
        background: 'rgba(5, 6, 12, 0.74)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signup' ? 'Create your Kineo account' : 'Sign in to Kineo'}
        tabIndex={-1}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          margin: 'auto',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.55)',
          outline: 'none',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 20,
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card2)',
            border: '1px solid var(--border2)',
            color: 'var(--muted2)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>
        <AuthSurfaceProvider value={{ inModal: true }}>
          {mode === 'login' ? <LoginScreen key={`login-${instance}`} /> : <SignupScreen key={`signup-${instance}`} />}
        </AuthSurfaceProvider>
      </div>
    </div>,
    document.body,
  )
}
