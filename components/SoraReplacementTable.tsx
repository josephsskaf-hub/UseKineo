import { PLANS } from '@/lib/pricing'
import { DURATION_REFERENCE_SECONDS } from '@/lib/credits/engineCost'
import { SORA_REPLACEMENTS } from '@/lib/growth/soraMigrationFacts'

export default function SoraReplacementTable() {
  return <section aria-labelledby="replacement-engines" style={{ margin: '30px 0' }}>
    <h2 id="replacement-engines" style={{ fontSize: 22 }}>What Kineo offers instead</h2>
    <p style={{ color: '#c7c7cc' }}>Reference: a {DURATION_REFERENCE_SECONDS}-second film. Available engines assemble scenes with narration, captions and music. A paid plan and enough credits are required; output depends on the script and settings.</p>
    <div role="region" aria-label="Engine cost comparison, scroll horizontally on small screens" tabIndex={0} style={{ overflowX: 'auto', border: '1px solid #38383f', borderRadius: 12 }}>
      <table style={{ width: '100%', minWidth: 510, borderCollapse: 'collapse', fontSize: 14 }}>
        <thead><tr>{['Engine', 'Current status', 'Credits / film', 'USD credit-equivalent*'].map(label => <th key={label} scope="col" style={{ padding: 14, textAlign: 'left', background: '#222228' }}>{label}</th>)}</tr></thead>
        <tbody>{SORA_REPLACEMENTS.map(engine => <tr key={engine.key}>
          <th scope="row" style={{ textAlign: 'left', padding: 14, borderTop: '1px solid #38383f' }}>{engine.name}</th>
          <td style={{ padding: 14, borderTop: '1px solid #38383f', color: engine.paused ? '#ffc789' : '#9ddcb6' }}>{engine.paused ? 'Paused — unavailable' : 'Available in Studio'}</td>
          <td style={{ padding: 14, borderTop: '1px solid #38383f' }}>{engine.paused ? '—' : engine.credits}</td>
          <td style={{ padding: 14, borderTop: '1px solid #38383f' }}>{engine.paused ? 'Not for sale while paused' : `US$${engine.allocatedUsd.toFixed(2)}`}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p style={{ fontSize: 12, color: '#aaaab4' }}>*Allocation of the {PLANS.pro.name} monthly plan ({PLANS.pro.priceLabel}, {PLANS.pro.credits} credits): plan USD price ÷ plan credits × film credits. Not a standalone film purchase, provider API rate, or promise of unused-credit refunds. Duration and engine change credit usage. Check Studio before generating.</p>
    <a href="/studio?utm_source=seo&utm_medium=sora_migration&utm_campaign=gpt_5h_20260924" style={{ display: 'inline-block', background: '#2997ff', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Choose an available engine in Studio →</a>
    <p style={{ fontSize: 14, color: '#c7c7cc' }}>Want a human to make a business ad for you? <a href="/business-video-ads" style={{ color: '#71b8ff' }}>See Kineo Empresas</a>, a separate one-time service.</p>
  </section>
}
