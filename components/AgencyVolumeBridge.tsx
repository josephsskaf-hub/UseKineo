import Link from 'next/link'
import { agencyPacksHref, type AgencyDistributionEntry } from '@/lib/agencyDistribution'
import { BULK_PACKS, formatCheckoutMoney } from '@/lib/checkoutPricing'

const LOWEST_UNIT_PRICE_MINOR = Math.min(
  ...Object.values(BULK_PACKS).map((pack) => Math.round(pack.usdMinor / pack.videos)),
)

const CONTEXT: Record<AgencyDistributionEntry, string> = {
  state_report: 'Turning publishing data into a client delivery calendar?',
  cost_page: 'Pricing a recurring content package for a client or your company?',
  pricing: 'Need a batch for clients instead of another monthly subscription?',
  comment_tool: 'Turning recurring customer questions into a client content queue?',
  product_tool: 'Turning a product catalog into a repeatable Short content queue?',
}

export default function AgencyVolumeBridge({ entry }: { entry: AgencyDistributionEntry }) {
  return (
    <section
      aria-labelledby={`agency-volume-${entry}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        alignItems: 'center',
        gap: 22,
        margin: '32px auto 48px',
        padding: '22px',
        borderRadius: 20,
        border: '1px solid rgba(52,211,153,.34)',
        background:
          'radial-gradient(circle at 100% 0%, rgba(52,211,153,.14), transparent 42%), #111216',
        textAlign: 'left',
      }}
    >
      <div>
        <p
          style={{
            color: '#34d399',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          For agencies, freelancers and businesses
        </p>
        <h2
          id={`agency-volume-${entry}`}
          style={{ color: '#f5f5f7', fontSize: 'clamp(1.28rem, 3vw, 1.72rem)', lineHeight: 1.15, margin: 0, fontWeight: 900 }}
        >
          {CONTEXT[entry]}
        </h2>
        <p style={{ color: '#aaaab1', fontSize: 14, lineHeight: 1.62, margin: '10px 0 0' }}>
          Buy 10–50 Fast Shorts once, download clean commercial-use MP4s and keep the margin.
          Packs start at {formatCheckoutMoney('usd', LOWEST_UNIT_PRICE_MINOR)} per finished Fast Short.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 9, justifyItems: 'stretch' }}>
        <Link
          href={agencyPacksHref(entry)}
          style={{
            display: 'flex',
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 13,
            padding: '0 18px',
            color: '#04110c',
            background: '#34d399',
            fontSize: 14,
            fontWeight: 900,
            textDecoration: 'none',
          }}
        >
          See one-time volume packs →
        </Link>
        <p style={{ color: '#85858c', fontSize: 11.5, lineHeight: 1.45, margin: 0, textAlign: 'center' }}>
          Self-service · one account · no recurring contract
        </p>
      </div>
    </section>
  )
}
