'use client'

// KINEO-ASSINANTE-COMPRA-SEMPRE-1211 [dono 12/11: "não importa se ele fica com 0 ou 1 ou 3 de saldo, quero TODOS que são sub podendo
// comprar"] — a entrada SEMPRE visível da barra de créditos para o assinante pago, com qualquer saldo.
// Quem vê quem decide é o SERVIDOR: GET /api/billing/recarga-assinante?surface=… (assinante pago da escada, sem _trial, com assinatura da
// Stripe; interruptor RECARGA_ASSINANTE_1111_RELEASE). Não assinante, cortesia, teste, leitura que falhou → nada é pintado.
// O clique abre a MESMA barra (CreditsTopupModal com `recarga`: 60 cr = US$ 9 … 3.700 = US$ 500, preços da fonte única), que vende pela
// rota da recarga. Nada começa sozinho; o preço só aparece na barra. Medida: recarga_assinante_shown (servidor, com superfície e saldo) ·
// buy_credits_entry_opened (navegador, superfície) · clicked / checkout_started / paid (servidor).
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import CreditsTopupModal from '@/components/CreditsTopupModal'
import { trackEvent } from '@/lib/analytics'
import { RECARGA_ASSINANTE_1111_RELEASE, RECARGA_ASSINANTE_API, recargaAssinanteBack, type RecargaAssinanteOffer } from '@/lib/billing/recargaAssinante'

export const BUY_CREDITS_LABEL = 'Buy credits'
export const BUY_CREDITS_OPENED_EVENT = 'buy_credits_entry_opened'

/** A oferta do servidor para esta superfície (null = não pinta). `enabled` false = nenhuma leitura. */
export function useRecargaEntrada(surface: string, enabled = true): RecargaAssinanteOffer | null {
  const [offer, setOffer] = useState<RecargaAssinanteOffer | null>(null)
  useEffect(() => {
    if (!enabled || RECARGA_ASSINANTE_1111_RELEASE === 'off') { setOffer(null); return }
    let alive = true
    void fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        const o = d as Partial<RecargaAssinanteOffer> | null
        if (alive && o && o.show === true && typeof o.go === 'string' && typeof o.qa === 'boolean') setOffer(o as RecargaAssinanteOffer)
      })
      .catch(() => { /* sem oferta: nada pintado */ })
    return () => { alive = false }
  }, [surface, enabled])
  return offer
}

/** A barra aberta a partir de uma entrada (a volta depois de pagar = a tela atual, com a ideia quando houver). */
export function BuyCreditsModal({ offer, surface, idea = null, onClose }: { offer: RecargaAssinanteOffer; surface: string; idea?: string | null; onClose: () => void }) {
  const back = typeof window !== 'undefined' ? recargaAssinanteBack(`${window.location.pathname}${window.location.search}`, idea) : '/studio'
  const modal = <CreditsTopupModal surface={`buy_credits_${surface}`} recarga={{ go: offer.go, back, qa: offer.qa }} onClose={onClose} />
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

/** KINEO-RECARGA-TELAS-1211 — o pop-up de "sem crédito" das telas de criação: o servidor diz se é assinante pago → a barra da recarga;
 *  senão (ou leitura que falhou) → o pop-up de sempre ("Pick a bigger plan"). Enquanto lê, nada é pintado (sem piscar de uma tela para
 *  a outra). Troca de UMA linha em cada tela; quem não assina vê exatamente o de antes. */
export function TopupOuRecargaModal({ surface, onClose, idea = null }: { surface: string; onClose: () => void; idea?: string | null }) {
  const [estado, setEstado] = useState<'lendo' | 'nada' | RecargaAssinanteOffer>(RECARGA_ASSINANTE_1111_RELEASE === 'off' ? 'nada' : 'lendo')
  useEffect(() => {
    if (RECARGA_ASSINANTE_1111_RELEASE === 'off') return
    let alive = true
    void fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        const o = d as Partial<RecargaAssinanteOffer> | null
        if (!alive) return
        setEstado(o && o.show === true && typeof o.go === 'string' && typeof o.qa === 'boolean' ? (o as RecargaAssinanteOffer) : 'nada')
      })
      .catch(() => { if (alive) setEstado('nada') })
    return () => { alive = false }
  }, [surface])
  if (estado === 'lendo') return null
  if (estado === 'nada') return <CreditsTopupModal surface={surface} onClose={onClose} />
  return <BuyCreditsModal offer={estado} surface={surface} idea={idea} onClose={onClose} />
}

/** O link discreto "Buy credits" (≥ 12 px) para pôr junto da linha de custo das telas de criação. */
export default function BuyCreditsLink({ surface, idea = null, style, onOpen }: { surface: string; idea?: string | null; style?: CSSProperties; onOpen?: () => void }) {
  const offer = useRecargaEntrada(surface)
  const [open, setOpen] = useState(false)
  if (!offer) return null
  return (
    <>
      <button
        type="button"
        data-kineo="buy-credits-entry"
        onClick={() => { onOpen?.(); void trackEvent(BUY_CREDITS_OPENED_EVENT, { surface }); setOpen(true) }}
        style={{ border: 0, background: 'transparent', padding: '6px 0', color: 'var(--accent, #2997ff)', fontSize: 13, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', ...style }}
      >
        {BUY_CREDITS_LABEL}
      </button>
      {open ? <BuyCreditsModal offer={offer} surface={surface} idea={idea} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
