'use client'
// KINEO-TRIAL-A-PEDIDO-0411 — a faixa de quem caiu no lado "a pedido" do teste: a promessa do filme grátis continua de pé, a 1 clique.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { filmeGratisDestino, TRIAL_PEDIDO_CLAIM_PATH, TRIAL_PEDIDO_COPY, TRIAL_PEDIDO_TESTE } from '@/lib/trialPedido'
import { voltaParaCaixa } from '@/lib/growth/ideiaDaPagina' // KINEO-PEDIDO-GUARDA-TEXTO-0611

export default function TrialPedidoBanner() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(TRIAL_PEDIDO_COPY, language)
  const [estado, setEstado] = useState<'pronto' | 'indo' | 'falhou'>('pronto')
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('trial_on_request_shown', { test: TRIAL_PEDIDO_TESTE, language })
  }, [language])

  async function pedir() {
    setEstado('indo')
    void trackEvent('trial_on_request_clicked', { test: TRIAL_PEDIDO_TESTE, language })
    try {
      const res = await fetch(TRIAL_PEDIDO_CLAIM_PATH, { method: 'POST' })
      if (!res.ok) throw new Error(String(res.status))
      window.dispatchEvent(new Event('creditsChanged'))
      // KINEO-FLUXO2-G-0411 — a ideia que está na tela (a caixa da prévia ou o ?prompt= da página) volta com a pessoa; antes ela caía no /studio vazio.
      const caixa = document.getElementById('previa-idea') as HTMLTextAreaElement | null
      // KINEO-PEDIDO-GUARDA-TEXTO-0611 — 06/11, glauciaag78: escreveu na caixa do Studio, pediu o filme grátis e voltou com a caixa vazia.
      const naCaixaUnica = document.querySelector<HTMLTextAreaElement>('[data-testid="studio-simples"] textarea')?.value
      const volta = voltaParaCaixa(naCaixaUnica)
      if (volta) { window.location.assign(volta); return }
      window.location.assign(filmeGratisDestino(caixa?.value || new URLSearchParams(window.location.search).get('prompt')))
    } catch {
      setEstado('falhou')
    }
  }

  const link = { color: 'var(--text)', border: '1px solid var(--border2, var(--border))', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' } as const
  return (
    <div data-testid="trial-on-request" role="status" style={{ margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border2, var(--border))', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 220, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{estado === 'falhou' ? copy.failed : copy.body}</div>
      </div>
      <Link href="/studio/previa" data-testid="trial-on-request-preview" style={link}>{copy.preview}</Link>
      <Link href="/pricing" data-testid="trial-on-request-plans" style={link}>{copy.plans}</Link>
      <button type="button" data-testid="trial-on-request-claim" disabled={estado === 'indo'} onClick={() => { void pedir() }} style={{ background: '#2997ff', color: '#000', border: 0, borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', cursor: estado === 'indo' ? 'progress' : 'pointer' }}>
        {estado === 'indo' ? copy.working : copy.claim}
      </button>
    </div>
  )
}
