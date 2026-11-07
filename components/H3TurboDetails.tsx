import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { H3_TURBO_PAGE_UPDATED } from '@/lib/growth/h3TurboPage'

export default function H3TurboDetails() {
  return (
    <section aria-labelledby="h3-turbo-cost" style={{ marginTop: 36 }} data-kineo="h3-turbo-cost">
      <h2 id="h3-turbo-cost" style={{ fontSize: '1.3rem', fontWeight: 650 }}>H3 Turbo cost per finished film</h2>
      <div style={{ overflowX: 'auto', border: '1px solid #E4E4E0', borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.55 }}>
          <thead style={{ background: '#EEF3FF', textAlign: 'left' }}>
            <tr><th style={{ padding: 12 }}>Requested length</th><th style={{ padding: 12 }}>Credits</th><th style={{ padding: 12 }}>USD allocation on Starter</th></tr>
          </thead>
          <tbody>
            {[15, 35, 60, 90].map((seconds) => {
              const credits = creditCostForDuration('cinematic_ai', true, seconds)
              const usdCents = Math.round(credits * TIER_PRICES.starter.usd / TIER_CREDITS.starter)
              return <tr key={seconds} style={{ borderTop: '1px solid #E4E4E0' }}><td style={{ padding: 12 }}>{seconds} seconds</td><td style={{ padding: 12 }}>{credits}</td><td style={{ padding: 12 }}>{formatCheckoutMoney('usd', usdCents)}</td></tr>
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: '#5A5F67', lineHeight: 1.6 }}>The USD column allocates the Starter subscription price of {formatCheckoutMoney('usd', TIER_PRICES.starter.usd)} across its {TIER_CREDITS.starter} monthly credits. It is a comparison of credit use, not a per-film checkout offer. Other creations use that balance too. Brazil settles in BRL at checkout.</p>
      <p style={{ fontSize: 13, color: '#5A5F67' }}>Updated <time dateTime={H3_TURBO_PAGE_UPDATED}>November 7, 2026</time>. <a href="/models-pricing">Compare current film engines</a> · <a href="/pricing">Review plan terms</a>.</p>
    </section>
  )
}
