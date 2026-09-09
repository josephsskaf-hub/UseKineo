'use client'

// KINEO-PH-2026-09-10 — sinal de impressão da página de pouso do Product Hunt.
// Só telemetria: a página é estática; o evento carrega utm para o placar por
// pessoa (visitantes → cadastros → $1) do dia do lançamento.
//
// KINEO-ADS-2026-09-09 — a mesma página recebe tráfego pago (Reddit). A página
// é estática, então o CTA nasce com intent_campaign=ph_sep10; aqui, no cliente,
// quando a URL traz utm_campaign, o CTA passa a carregar ESSA campanha — assim
// checkout_started/payment_success separam Reddit de Product Hunt sem uma
// segunda página. O utm de primeiro toque (sfa_utms) já vai para o cadastro.
//
// KINEO-FRIO-2026-09-09 (sprint do tráfego frio, r1) — ATÉ AGORA A PÁGINA MEDIA
// ÀS CEGAS. Os únicos eventos que a /ph produzia eram `ph_landing_shown` e o
// `landing_session_started` genérico: 167 pessoas do Reddit (utm_campaign=
// reddit_sep09), 7 clicaram no CTA, 1 completou cadastro, 0 pagaram — e não
// havia como saber se as outras 160 leram a página e recusaram a oferta ou se
// fecharam a aba antes da primeira dobra. São dois defeitos opostos com
// remédios opostos (copy/oferta vs. peso/promessa), e sem rolagem não dá para
// escolher. Esta versão fecha a cegueira com três sinais:
//   · `ph_scroll`      — marcos 25/50/75/100 do conteúdo visto, uma vez cada,
//                        com os segundos desde o load.
//   · `ph_cta_clicked` — posição (top/bottom), segundos, profundidade no
//                        momento do clique e a campanha que o href REALMENTE
//                        carrega (prova de que a reescrita acima aplicou —
//                        campo ecoado não é campo honrado).
//   · o perfil do visitante no próprio `ph_landing_shown` (largura da janela,
//     celular ou não, fuso e idioma do navegador). O Reddit é majoritariamente
//     celular e a página nunca disse quantos eram.
//
// KINEO-FRIO-ROLAGEM-2026-09-09 (r2) — A INSTRUMENTAÇÃO DA r1 NASCEU CEGA, e
// cega de um jeito PIOR do que não medir: ela respondia 100% para todo mundo.
// Medido no navegador em produção, na /ph de 4.427px em viewport de 812px:
//
//     window.scrollY ................ 0    (mesmo com o conteúdo rolado a 1500px)
//     documentElement.scrollHeight .. 812  (= clientHeight, não 4427)
//     body.scrollHeight ............. 4427
//     fórmula da r1 ................. 100%  ← errada
//     fórmula correta ...............  52%
//
// A causa é `app/globals.css:121` — `html, body { height: 100% }`. Com altura
// fixa no elemento raiz, QUEM ROLA É O <body>, e daí saem três defeitos que se
// somam: (1) `documentElement.scrollHeight` iguala o viewport, então
// `(scrollY + innerHeight) / scrollHeight` dá 1 no load e os quatro marcos
// disparam de uma vez, sem ninguém rolar nada; (2) `window.scrollY` fica preso
// em 0 para sempre; (3) evento de scroll de ELEMENTO não borbulha até a
// `window`, então o listener da r1 nunca era chamado. O banco já mostrava o
// sintoma: 4 `ph_scroll` (25, 50, 75 e 100) em 0,52 s da mesma pessoa.
//
// O conserto tem duas metades, e as duas são necessárias:
//   · `alvoDeRolagem()` escolhe o elemento que REALMENTE rola em vez de
//     presumir a janela, e o evento passa a dizer qual foi (`scroller`) — sem
//     esse campo não há como distinguir, olhando o dado, rolagem de verdade de
//     fórmula velha.
//   · o listener vai para o `document` na FASE DE CAPTURA, único jeito de ouvir
//     o scroll de um elemento que não borbulha.
// `version` sobe para `ph_sep10_v3` porque a rolagem gravada sob `v2` é lixo
// conhecido e não pode ser somada à boa; o perfil do visitante do `v2`
// (viewport/is_mobile/tz/lang) continua válido — só a rolagem estava quebrada.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

const CAMPAIGN_OK = /^[A-Za-z0-9._~-]{1,60}$/
const MARCOS_ROLAGEM = [25, 50, 75, 100] as const
const VERSAO = 'ph_sep10_v3'

// Largura de corte do celular: a mesma que a página usa para empilhar o herói
// (`minmax(300px, 1fr)` em grade de duas colunas quebra abaixo de ~640px).
const LARGURA_CELULAR = 640

function perfilDoVisitante(): Record<string, unknown> {
  try {
    return {
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      is_mobile: window.innerWidth < LARGURA_CELULAR,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      lang: navigator.language ?? null,
    }
  } catch {
    return {}
  }
}

type AlvoDeRolagem = { topo: number; janela: number; total: number; fonte: 'window' | 'body' | 'nenhum' }

// Qual elemento REALMENTE rola nesta página. Não presumir a janela: o layout da
// casa põe `height: 100%` em `html, body` (app/globals.css:121), e com isso o
// `<body>` vira o container de rolagem e a `window` nunca sai do zero. A ordem
// é do caso normal para o caso da casa, e a folga de 1px evita que
// arredondamento de zoom eleja um scroller que não rola de verdade.
function alvoDeRolagem(): AlvoDeRolagem {
  const raiz = document.documentElement
  if (raiz && raiz.scrollHeight > raiz.clientHeight + 1) {
    return { topo: window.scrollY, janela: window.innerHeight, total: raiz.scrollHeight, fonte: 'window' }
  }
  const corpo = document.body
  if (corpo && corpo.scrollHeight > corpo.clientHeight + 1) {
    return { topo: corpo.scrollTop, janela: corpo.clientHeight, total: corpo.scrollHeight, fonte: 'body' }
  }
  return { topo: 0, janela: raiz?.clientHeight ?? 0, total: raiz?.clientHeight ?? 0, fonte: 'nenhum' }
}

// Fração do documento já revelada. Página que cabe inteira na tela nasce em
// 100%: quem não precisou rolar VIU tudo, e contar isso como "não rolou"
// culparia a copy por um defeito que não existe.
function profundidade(): number {
  try {
    const alvo = alvoDeRolagem()
    if (alvo.fonte === 'nenhum' || !alvo.total) return 100
    return Math.max(0, Math.min(100, Math.round(((alvo.topo + alvo.janela) / alvo.total) * 100)))
  } catch {
    return 0
  }
}

export default function PhLandingBeacon() {
  const impressao = useRef(false)
  const marcosEnviados = useRef<Set<number>>(new Set())
  const cliqueEnviado = useRef(false)

  useEffect(() => {
    const t0 = Date.now()
    const segundos = () => Math.round((Date.now() - t0) / 1000)

    let utm: Record<string, string | null> = {}
    const perfil = perfilDoVisitante()
    try {
      const q = new URLSearchParams(window.location.search)
      utm = { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), ref: q.get('ref') }
      const campaign = (q.get('utm_campaign') ?? '').trim()
      if (CAMPAIGN_OK.test(campaign)) {
        document.querySelectorAll<HTMLAnchorElement>('a[data-testid^="ph-cta-trial"]').forEach((a) => {
          try {
            const u = new URL(a.getAttribute('href') ?? '', window.location.origin)
            u.searchParams.set('intent_campaign', campaign)
            a.setAttribute('href', `${u.pathname}${u.search}`)
          } catch { /* href estranho: deixa como está */ }
        })
      }
    } catch { /* ignore */ }

    if (!impressao.current) {
      impressao.current = true
      void trackEvent('ph_landing_shown', { version: VERSAO, scroller: alvoDeRolagem().fonte, ...utm, ...perfil })
    }

    let agendado = false
    const conferirRolagem = () => {
      agendado = false
      const alvo = alvoDeRolagem()
      const p = profundidade()
      for (const marco of MARCOS_ROLAGEM) {
        if (p >= marco && !marcosEnviados.current.has(marco)) {
          marcosEnviados.current.add(marco)
          void trackEvent('ph_scroll', { version: VERSAO, depth: marco, seconds: segundos(), scroller: alvo.fonte, ...utm, ...perfil })
        }
      }
    }
    const aoRolar = () => {
      if (agendado) return
      agendado = true
      window.requestAnimationFrame(conferirRolagem)
    }

    // O clique é capturado no documento, na fase de captura, porque o CTA é uma
    // âncora que NAVEGA PARA FORA (/api/stripe/checkout). O `keepalive` do
    // trackEvent entrega o POST mesmo com a página saindo; um listener na fase
    // de bolha ainda dispararia, mas capturar cedo tira qualquer dúvida.
    const aoClicar = (e: Event) => {
      try {
        const alvo = e.target instanceof Element ? e.target.closest('a[data-testid^="ph-cta-trial"]') : null
        if (!alvo) return
        if (cliqueEnviado.current) return
        cliqueEnviado.current = true
        const testid = alvo.getAttribute('data-testid') ?? ''
        const href = alvo.getAttribute('href') ?? ''
        let hrefCampaign: string | null = null
        try { hrefCampaign = new URL(href, window.location.origin).searchParams.get('intent_campaign') } catch { /* ignore */ }
        void trackEvent('ph_cta_clicked', {
          version: VERSAO,
          position: testid.endsWith('-bottom') ? 'bottom' : 'top',
          seconds: segundos(),
          depth: profundidade(),
          scroller: alvoDeRolagem().fonte,
          href_campaign: hrefCampaign,
          ...utm,
          ...perfil,
        })
      } catch { /* telemetria nunca atrapalha a navegação */ }
    }

    // Scroll de ELEMENTO não borbulha: com o <body> rolando, um listener na
    // `window` nunca é chamado. Na fase de captura no `document` o evento passa
    // por aqui seja quem for o scroller — janela ou body.
    document.addEventListener('scroll', aoRolar, { passive: true, capture: true })
    window.addEventListener('resize', aoRolar, { passive: true })
    document.addEventListener('click', aoClicar, true)
    conferirRolagem() // página que já cabe na tela marca 100 sem rolagem nenhuma

    return () => {
      document.removeEventListener('scroll', aoRolar, true)
      window.removeEventListener('resize', aoRolar)
      document.removeEventListener('click', aoClicar, true)
    }
  }, [])

  return null
}
