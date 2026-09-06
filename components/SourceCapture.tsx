'use client'

// KINEO-SOURCE-TRACK-2026-07-06 — Block 3.3 acquisition source tracking.
//
// Tiny render-nothing client component mounted once in the root layout so the
// first-touch source capture runs on EVERY landing, regardless of which page
// component renders. This matters because the live homepage (app/page.tsx →
// KineoLanding) is a server component with no client capture of its own — the
// legacy captureUtmsOnce() call lives in app/HomePageClient.tsx, which is no
// longer the homepage. Mounting here guarantees capture fires for directory /
// UTM / social landings on any route.
//
// captureSourceOnce() is first-touch (never overwrites), SSR-safe, and never
// throws — it can never block or break page render.

import { useEffect } from 'react'
import { captureSourceOnce, trackEvent } from '@/lib/analytics'
import { captureRefOnce } from '@/lib/referral'
import {
  acquisitionSource,
  internalSurfaceLabel,
  sanitizeAcquisitionReferrer,
} from '@/lib/acquisitionSource'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-ACQ-LANDING-SOURCE-2026-09-06 — O EVENTO DE POUSO SABIA A FONTE E NÃO
// A GRAVAVA.
// ═══════════════════════════════════════════════════════════════════════════
// MEDIDO EM 06/09, 14 dias: `landing_session_started` registrou 3.600 sessões e
// **2.948 delas (82%) saíram com `referrer_host` nulo** — enquanto os perfis
// nascidos dessas mesmas sessões sabiam perfeitamente de onde vinham: 188 com
// `signup_utm_source='chatgpt'`, dos quais **108 SEM referrer nenhum**.
//
// A causa é mecânica, não misteriosa: o ChatGPT (app e in-browser) suprime o
// cabeçalho `Referer`, e cita os nossos links **com o nosso próprio
// `?utm_source=chatgpt` colado**. O evento de pouso lia `document.referrer` e
// mais nada; o `utm_source` estava a três linhas de distância, na barra de
// endereços, e era descartado.
//
// O QUE ISSO CUSTA, em uma frase: só dá para medir por página quem **fez conta**
// (o perfil guarda a fonte). O visitante anônimo — o denominador inteiro, que é
// o número que o fundador pediu — é cego em 82% das sessões. Não dá para dizer
// "esta página recebe 100 do ChatGPT e converte 3" porque as 100 não têm rótulo.
//
// A REGRA QUE ESTA CORREÇÃO NÃO PODE QUEBRAR (lib/acquisitionSource.ts, 12/08):
// `utm_source=homepage` e `utm_source=sticky_cta` são **rótulos de superfície
// interna** — a pessoa já estava aqui e clicou num CTA nosso. Gravá-los como
// ORIGEM inventa uma origem e apaga a verdadeira. Por isso o `utm_source` passa
// por `internalSurfaceLabel()` — o mesmo ponto de estrangulamento que a captura
// de first-touch já usa — antes de poder virar fonte. Superfície interna vai
// para o seu próprio campo e a fonte fica honestamente nula.
//
// PRECEDÊNCIA: `referrer_host` vence o `utm_source`. O referrer é o que o
// navegador atesta; o utm é o que alguém escreveu no link e pode ser colado por
// terceiros. Quando os dois existem, o atestado ganha.

/** Normaliza um `utm_source` de URL para rótulo curto e comparável. */
function normalizedUtmSource(raw: string | null): string | null {
  const token = (raw ?? '').trim().toLowerCase().slice(0, 80)
  return token || null
}

export default function SourceCapture() {
  useEffect(() => {
    captureSourceOnce()
    // Referral links can land on a public video page (/v/[id]), not only the
    // homepage. Capture ?ref= globally so the code survives signup/OAuth and
    // ReferralAutoTrigger can attribute the new account after authentication.
    captureRefOnce()

    // One anonymous landing anchor per browser tab. The shared session_id in
    // trackEvent connects this entry route to later signup/generation/checkout
    // events without storing email, prompt or the full query string.
    try {
      const marker = 'kineo_landing_session_recorded'
      if (!sessionStorage.getItem(marker)) {
        sessionStorage.setItem(marker, '1')
        let referrerHost: string | null = null
        try {
          const referrer = sanitizeAcquisitionReferrer(document.referrer, window.location.hostname)
          if (referrer) referrerHost = acquisitionSource({ referrer }).slice(0, 120)
        } catch {
          // Referrer is optional.
        }

        // KINEO-ACQ-LANDING-SOURCE-2026-09-06 — ver bloco acima.
        let utmSource: string | null = null
        let surface: string | null = null
        try {
          const rawUtm = new URLSearchParams(window.location.search).get('utm_source')
          surface = internalSurfaceLabel(rawUtm)
          // Rótulo interno NUNCA vira origem: ou é superfície, ou é utm externo.
          utmSource = surface ? null : normalizedUtmSource(rawUtm)
        } catch {
          // Query string é opcional.
        }

        // Referrer atestado pelo navegador vence o utm escrito no link.
        const source = referrerHost ?? utmSource

        void trackEvent('landing_session_started', {
          referrer_host: referrerHost,
          utm_source: utmSource,
          surface,
          source,
          // O campo que torna o denominador legível: quantas sessões pousaram
          // sem NENHUMA pista de origem, separado das que tinham uma e a
          // perdíamos por não olhar.
          source_known: source !== null,
        })
      }
    } catch {
      // Storage or analytics failures must never affect page rendering.
    }
  }, [])
  return null
}
