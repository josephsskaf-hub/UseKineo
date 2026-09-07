'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRIMEIRA-COMPRA-POR-REGIAO-2026-09-07 — ciclo de pagamentos #3
// ═══════════════════════════════════════════════════════════════════════════
// ORDEM DO FUNDADOR (07/09 12:10 BRT, "urgente"): "Eles chegam muito no
// checkout, às vezes não têm cartão de crédito e acabam não pagando."
//
// O NÚMERO (30 dias, por PESSOA, país = moda do `ip_country` dos eventos dela):
//
//   país        pessoas  com filme  chegou ao checkout  pagou
//   Índia          47       36            21              0
//   Nigéria        22       19            12              0
//   Paquistão      10        9             3              0
//   Bangladesh      3        1             2              0
//   Quênia          4        3             2              0
//   ─────────────────────────────────────────────────────
//   soma           86       68            40              0
//   EUA+BR+GB      44       31            17              3
//
// **40 pessoas destes cinco países abriram a página de pagamento em 30 dias e
// nenhuma pagou.** Não é falta de interesse: elas escolheram um plano e
// chegaram até a Stripe. É a assinatura que não fecha — cartão indiano em
// recorrência internacional esbarra no e-mandate do RBI, e nos outros quatro
// países o cartão internacional de débito/pré-pago recusa mandato com a mesma
// frequência. Confirmado no evento de recusa: a única recusa de compra INICIAL
// da história veio de um Visa PRÉ-PAGO com `card_restricted`.
//
// O QUE ESTA PEÇA FAZ, e é uma coisa só: para IP nesses cinco países, o First
// Pack de US$ 4,90 aparece ACIMA dos planos, como primeira opção. As
// assinaturas continuam logo abaixo, intactas, e nenhum preço muda.
//
// POR QUE O PACK É A COISA CERTA AQUI, e não "uma versão mais barata":
// `?pack=starter` é `mode: 'payment'` — COBRANÇA ÚNICA. As duas coisas que o
// cartão dessas pessoas recusa (assinatura internacional e mandato recorrente)
// são exatamente o que uma compra única NÃO pede. Não é desconto nem consolo:
// é o mesmo produto por um trilho que o banco delas aceita.
//
// ⚠️ ISTO NÃO REABRE A CONCLUSÃO DE PREÇO DO FUNDADOR (19/08, estudo repetido:
// o vazamento do checkout é PREÇO). Nenhum preço novo nasce aqui, nenhum
// desconto, nenhum cupom — o pack de US$ 4,90 / 30 créditos existe desde julho
// e cobra o que sempre cobrou. O que muda é QUEM o vê.
//
// ⚠️ E NÃO CONTRADIZ O `KINEO-SPRINT-OFFER-2026-07-14` (que tirou o pack do
// /pricing). Aquela limpeza matou TRÊS ofertas empilhadas para TODO MUNDO —
// um comprador via 3 "deals" antes dos cards. Aqui é UMA opção a mais, para
// uma coorte que hoje converte a 0%, e invisível para todos os outros.
//
// ⚠️ POR QUE ELE ESTAVA INVISÍVEL ATÉ HOJE (docs/SPEC-PRIMEIRA-COMPRA-PEQUENA-
// 2026-09-07.md): o pack está no ar sem flag desde julho e tem ZERO
// `checkout_attempted` em 54 dias. A causa medida não é rejeição — é que os
// dois lugares onde ele mora exigem marca d'água fora do trial (0 exposições
// na história) ou abrir um `<details>` FECHADO (0 cliques em 231 exposições do
// bloco de fora). Peça sem superfície mede zero e não prova nada. Esta é a
// primeira superfície viva que ele ganha.
//
// ⚠️ COMO MEDIR, e o denominador é a parte que engana: `pack_first_for_region_shown`
// tem de ser comparado com `pricing_currency_resolved`, que o PricingClient
// emite no MESMO instante e para TODO visitante, com o mesmo `country`. É o
// único par que dispara igual — comparar com montagem de página ou com
// `checkout_started` seria laranja com maçã. O campo `surface_version` carimba
// o deploy: o corte antes/depois é ele, nunca o relógio.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { PACK_CREDITS, packPriceLabel } from '@/lib/checkoutPricing'

/** Marcador de versão da superfície. Sem ele, uma medição depois do próximo
 *  deploy misturaria duas telas diferentes no mesmo número. */
export const REGIONAL_FIRST_PACK_VERSION = 'regional_first_pack_v1'

/**
 * Os cinco países do ciclo, e a régua é UMA: 30 dias, ≥2 pessoas no checkout,
 * ZERO pagamentos, e a hipótese de trilho (mandato recorrente internacional)
 * explicando o zero. Nenhum país entra aqui por intuição.
 *
 * ⛔ País que PAGA não entra, por mais que o volume seja parecido: EUA (10 no
 * checkout, 1 pagou) e Brasil (5 e 1) provam que o trilho funciona lá, e
 * mostrar uma opção a mais para quem já assina é canibalizar receita
 * recorrente por uma compra de US$ 4,90.
 */
export const REGIOES_SEM_MANDATO = ['IN', 'NG', 'PK', 'BD', 'KE'] as const

/**
 * A DECISÃO, pura e exportada de propósito para que o guardião exercite a
 * CONDIÇÃO em vez de contar texto.
 *
 * Fecha por padrão: país desconhecido, vazio ou ainda não resolvido NÃO vê a
 * peça. Um `?` virando "sim" mostraria a oferta ao mundo inteiro durante o
 * tempo em que a chamada de geo estivesse em voo, que é justamente o que a
 * limpeza de 14/07 proibiu.
 */
export function regiaoSemMandato(pais: string | null | undefined): boolean {
  if (!pais) return false
  return (REGIOES_SEM_MANDATO as readonly string[]).includes(pais.trim().toUpperCase())
}

export default function RegionalFirstPack() {
  const [pais, setPais] = useState<string | null>(null)
  const jaContou = useRef(false)

  // Mesmo padrão do ExitIntentOffer: a peça resolve o próprio país. Só
  // EXIBIÇÃO — o /api/stripe/checkout re-resolve país no servidor e nunca
  // aceita nada vindo do navegador, então mexer nisto pelo devtools muda o que
  // aparece na tela e não muda um centavo do que a Stripe cobra.
  useEffect(() => {
    let cancelado = false
    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ country?: string }>) : Promise.reject()))
      .then((d) => {
        if (cancelado) return
        setPais(typeof d.country === 'string' ? d.country : null)
      })
      .catch(() => {})
    return () => { cancelado = true }
  }, [])

  const mostrar = regiaoSemMandato(pais)

  // A impressão é contada UMA vez por montagem, e só quando a peça REALMENTE
  // aparece. Um `_shown` que dispare junto com a montagem do componente
  // contaria todo visitante do mundo e faria a peça parecer 20x maior do que é.
  useEffect(() => {
    if (!mostrar || jaContou.current) return
    jaContou.current = true
    void trackEvent('pack_first_for_region_shown', {
      country: pais,
      surface: 'pricing',
      surface_version: REGIONAL_FIRST_PACK_VERSION,
      pack_price_minor: 490,
      pack_credits: PACK_CREDITS.starter,
    })
  }, [mostrar, pais])

  if (!mostrar) return null

  const href =
    '/api/stripe/checkout?pack=starter' +
    '&utm_source=pricing&utm_medium=regional_pack&utm_campaign=first_pack_no_mandate'

  return (
    <div
      className="mx-auto mb-7 max-w-2xl rounded-2xl px-5 py-5 text-center"
      style={{ background: 'rgba(41,151,255,0.09)', border: '1px solid rgba(41,151,255,0.45)' }}
    >
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#2997ff]">
        Card keeps getting declined?
      </p>
      <p className="mt-2 text-[15px] font-semibold text-white">
        Start with a one-time payment — {PACK_CREDITS.starter} credits for {packPriceLabel()}
      </p>
      {/* Cada frase aqui tem de ser verdadeira: `?pack=starter` é
          `mode: 'payment'` (cobrança única, sem mandato) e os créditos do pack
          não expiram — as duas coisas foram conferidas no código, e o guardião
          trava as duas. */}
      <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[#a1a1a6]">
        Many banks outside the US block <em>recurring</em> international charges but
        clear a single one. This is a one-time payment — no subscription, no renewal,
        and the credits never expire.
      </p>
      <a
        href={href}
        onClick={() => {
          void trackEvent('pack_first_for_region_clicked', {
            country: pais,
            surface: 'pricing',
            surface_version: REGIONAL_FIRST_PACK_VERSION,
          })
        }}
        className="mt-4 inline-block rounded-xl px-6 py-3 text-[14px] font-bold text-white no-underline"
        style={{ background: '#2997ff' }}
      >
        Get {PACK_CREDITS.starter} credits for {packPriceLabel()} →
      </a>
      <p className="mt-3 text-[11.5px] text-[#86868b]">
        Prefer a monthly plan? They are right below.
      </p>
    </div>
  )
}
