'use client'
// KINEO-CLARITY-WELCOME20-2026-10-12 — o Microsoft Clarity, montado UMA vez no layout raiz e só quando existe
// NEXT_PUBLIC_CLARITY_ID (as travas e o porquê estão em lib/clarityTag.ts). Mesma forma do gtag do layout: next/script
// com strategy="afterInteractive". O script só é posto na página na primeira vez que a pessoa está numa página
// permitida; em /admin, login/cadastro/senha, /auth/*, /account/billing e no login do convidado ele não baixa, e se a
// pessoa navegar para uma delas depois de gravada, a gravação para (clarity('stop')) até ela voltar.
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { clarityAllowedPath, clarityPageKind, claritySnippet } from '@/lib/clarityTag'

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] }

/** A fila oficial (a mesma que o snippet cria): chamada antes do script baixar entra na fila e vale quando ele chega. */
function clarityQueue(): ClarityFn {
  const w = window as unknown as { clarity?: ClarityFn }
  if (typeof w.clarity !== 'function') {
    const fila: ClarityFn = function () {
      // eslint-disable-next-line prefer-rest-params -- o formato da fila oficial é o objeto `arguments`
      ;(fila.q = fila.q || []).push(arguments)
    }
    w.clarity = fila
  }
  return w.clarity as ClarityFn
}

export default function ClarityTag({ projectId }: { projectId: string }) {
  const pathname = usePathname() ?? '/'
  const allowed = clarityAllowedPath(pathname)
  // Uma vez carregado, o script fica (o next/script não "descarrega"); o que muda por página é stop/start.
  const [armed, setArmed] = useState(false)
  const stopped = useRef(false)
  const snippet = claritySnippet(projectId)

  useEffect(() => {
    if (allowed && snippet) setArmed(true)
  }, [allowed, snippet])

  useEffect(() => {
    if (!armed) return
    try {
      const clarity = clarityQueue()
      if (!allowed) {
        if (!stopped.current) {
          clarity('stop')
          stopped.current = true
        }
        return
      }
      if (stopped.current) {
        clarity('start')
        stopped.current = false
      }
      // Só a categoria da página — nunca identify, nunca e-mail, nunca id de usuário.
      const kind = clarityPageKind(pathname)
      if (kind) clarity('set', 'page_kind', kind)
    } catch {
      /* telemetria nunca derruba a página */
    }
  }, [armed, allowed, pathname])

  if (!armed || !snippet) return null
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {snippet}
    </Script>
  )
}
