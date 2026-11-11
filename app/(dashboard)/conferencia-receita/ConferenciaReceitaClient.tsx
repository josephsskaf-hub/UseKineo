'use client'

// KINEO-CONFERENCIA-RECEITA-1111 — ver app/(dashboard)/conferencia-receita/page.tsx. Os componentes de verdade, montados sem
// depender do saldo. Nada aqui decide quem vê: as rotas do servidor decidem (para a casa, sempre em modo conferência).
import { useState } from 'react'
import SubscriberUpgradeNudge from '@/components/billing/SubscriberUpgradeNudge'
import CancelSaveFlow from '@/components/billing/CancelSaveFlow'

export default function ConferenciaReceitaClient() {
  const [cancelOpen, setCancelOpen] = useState(false)
  return (
    <main style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px', color: 'var(--text)' }} data-kineo="conferencia-receita">
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>Conferência da casa — receita</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
        Só a conta da casa vê esta página. Os botões abaixo são os de verdade, em modo conferência: nada é cobrado e nada muda
        na Stripe. NÃO clique em &quot;Switch to …&quot; (troca de plano de verdade, fora da conferência) nem em &quot;Continue
        to cancel&quot; dentro do &quot;Before you go&quot; (leva ao portal de verdade da Stripe).
      </p>

      <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>1. O aviso de sem crédito (recarga + barra)</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>
        Esperado: faixa vermelha &quot;House check&quot;, o botão &quot;Add 60 credits — $9&quot; e o link &quot;Need more? Choose your amount&quot;
        (abre a barra de 60 a 3.700). Clicar no botão volta para o /studio com ?recarga=qa, sem abrir pagamento.
      </p>
      <SubscriberUpgradeNudge surface="conferencia_receita" topup idea="Conferência da casa" />

      <h2 style={{ fontSize: 15, fontWeight: 800, margin: '24px 0 4px' }}>2. O &quot;Before you go&quot; (pausa de 1 mês)</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
        Esperado: o cartão &quot;Pause for 1 month&quot; só aparece depois de escolher &quot;I didn&apos;t use my credits&quot;, &quot;I was just
        testing&quot; ou &quot;Something else&quot; (nunca em &quot;too expensive&quot; ou &quot;quality&quot;). &quot;Pause my subscription&quot; responde
        em conferência, sem tocar na Stripe.
      </p>
      <button
        type="button"
        onClick={() => setCancelOpen(true)}
        data-kineo="conferencia-abrir-cancelar"
        style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontWeight: 800, cursor: 'pointer' }}
      >
        Abrir o &quot;Before you go&quot;
      </button>
      {cancelOpen && <CancelSaveFlow onClose={() => setCancelOpen(false)} />}
    </main>
  )
}
