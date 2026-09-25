// KINEO-FLUXO-NOVO-2026-09-25 — a página para onde o Payment Link de Express/Pro redireciona depois do pagamento
// (o fundador/Cowork troca o "After payment" na Stripe DEPOIS do deploy; antes disso, o link chega pelo alerta).
// Servidor só entrega a moldura e os campos (lib/growth/dfyBrief.ts, que usa node:crypto e por isso NÃO entra no
// bundle do navegador); quem verifica o pagamento é /api/dfy/brief, pela Stripe. Marcação mínima: o visual é do Codex.
import type { Metadata } from 'next'
import { CHECKOUT_SESSION_PATTERN } from '@/lib/growth/verifiedCheckoutPurchase'
import { DFY_BRIEF_FIELDS, DFY_BRIEF_MAX_LINKS } from '@/lib/growth/dfyBrief'
import BriefForm from './BriefForm'
import styles from '../businessAds.module.css'

export const dynamic = 'force-dynamic'
// O session_id da URL é a senha do pedido: fora de buscador e fora do Referer de qualquer link que saia daqui.
export const metadata: Metadata = {
  title: 'Your video brief | Kineo Empresas',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function DfyBriefPage({ searchParams }: { searchParams: { session_id?: string | string[] } }) {
  const raw = typeof searchParams.session_id === 'string' ? searchParams.session_id : ''
  const sessionId = CHECKOUT_SESSION_PATTERN.test(raw) ? raw : ''
  return (
    <div className={styles.surface}>
      <main className={styles.page}>
        <nav className={styles.nav} aria-label="Kineo Empresas">
          <a href="/business-video-ads" className={styles.brand}>Kineo<span> / empresas</span></a>
        </nav>
        <section className={styles.section} aria-labelledby="brief-heading">
          <p className={styles.eyebrow}>AFTER PAYMENT · YOUR BRIEF</p>
          <h1 id="brief-heading">Tell us what the video needs to say.</h1>
          <BriefForm sessionId={sessionId} fields={DFY_BRIEF_FIELDS.map((f) => ({ ...f }))} maxLinks={DFY_BRIEF_MAX_LINKS} />
        </section>
      </main>
    </div>
  )
}
