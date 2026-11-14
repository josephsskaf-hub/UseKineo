// KINEO-PRICING-INCLUI-0511 [fundador 05/11: melhorar o /pricing com o que o mercado lista, organizado; "só entra o que a Kineo cumpre"]
// Cada linha tem prova no código ou nos termos (docs/PROPOSTA-PRICING-MERCADO-2026-11-05.md). Suporte diz o canal real, sem prazo: o prazo só entra
// depois de medido. Fora de propósito: fila prioritária, armazenamento eterno e 1080p por motor, que o produto não prova.
// Guardião: scripts/test-pricing-inclui-0511.mjs.
import { UiLabel } from '@/components/InterfaceLanguage'
import { ANNUAL_REFUND_DAYS, MONTHLY_REFUND_DAYS } from '@/lib/checkoutPricing'

export const PRICING_INCLUI_0511: readonly string[] = [
  'No watermark on your videos',
  'Commercial use: you own the videos you make',
  'Voice, captions and music included on every film',
  'Cancel anytime from your account',
  `Full refund within ${MONTHLY_REFUND_DAYS} days on monthly, ${ANNUAL_REFUND_DAYS} days on annual`,
  'Failed renders give your credits back automatically',
]

export default function PricingIncludes0511({ condensed = false }: { condensed?: boolean } = {}) {
  return (
    <section data-kineo="pricing-inclui" aria-labelledby="pricing-inclui-titulo" className="mx-auto mt-8 max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left sm:p-6">
      <h2 id="pricing-inclui-titulo" className="text-[16px] font-bold text-[var(--text)]"><UiLabel>Every paid plan includes</UiLabel></h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {PRICING_INCLUI_0511.filter(linha => !condensed || !linha.startsWith('Full refund within')).map((linha) => (
          <li key={linha} className="flex items-start gap-2 text-[14px] leading-snug text-[var(--muted)]">
            <span aria-hidden="true" className="font-bold text-[var(--accent)]">✓</span>
            <span><UiLabel>{linha}</UiLabel></span>
          </li>
        ))}
      </ul>
      {!condensed && <p className="mt-3 text-[13px] text-[var(--muted)]"><UiLabel>Questions? Email us at</UiLabel> <a className="font-semibold text-[var(--accent)] underline" href="mailto:support@usekineo.com">support@usekineo.com</a></p>}
    </section>
  )
}
