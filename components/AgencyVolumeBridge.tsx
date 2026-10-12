import { agencyPacksHref, type AgencyDistributionEntry } from '@/lib/agencyDistribution'
import { BULK_PACKS, formatCheckoutMoney } from '@/lib/checkoutPricing'
// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — com os pacotes avulsos fora da vitrine (lib/bulkPacksPublic.ts), a faixa vira a do
// plano Business (US$ 84/mês, ~12 anúncios de produto de 15 s, /business). A versão dos pacotes fica aqui embaixo, intacta,
// e volta sozinha com BULK_PACKS_PUBLIC=true. Mesma medição (impressão + clique por `entry`), destino novo.
import { BULK_PACKS_PUBLIC } from '@/lib/bulkPacksPublic'
import { businessPitch } from '@/lib/growth/businessPitch'
import { BUSINESS_PAGE_PATH } from '@/lib/businessPlan'
import {
  AgencyVolumeBridgeImpression,
  AgencyVolumeBridgeLink,
} from '@/components/AgencyVolumeBridgeTelemetry'

const LOWEST_UNIT_PRICE_MINOR = Math.min(
  ...Object.values(BULK_PACKS).map((pack) => Math.round(pack.usdMinor / pack.videos)),
)

const CONTEXT: Record<AgencyDistributionEntry, string> = {
  home: 'Making Shorts for your company or for paying clients?',
  state_report: 'Turning publishing data into a client delivery calendar?',
  cost_page: 'Pricing a recurring content package for a client or your company?',
  pricing: 'Need a batch for clients instead of another monthly subscription?',
  comment_tool: 'Turning recurring customer questions into a client content queue?',
  product_tool: 'Turning a product catalog into a repeatable Short content queue?',
  content_plan: 'Turning a weekly business content plan into a production batch?',
  real_estate: 'Turning a real estate content calendar into a production batch?',
  client_brief: 'Turning approved client briefs into a production batch?',
  kineo1_engine: 'Need stock-footage Short volume for your company or paying clients?', // KINEO-FILME-GRATIS-15S-2026-09-29
  text_to_video: 'Turning client scripts into a repeatable delivery batch?',
  heygen_alternative: 'Need finished Shorts for clients instead of an enterprise avatar workspace?',
}

/** KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — destino da faixa com os pacotes fechados: a página do Business, com a origem. */
export function businessBridgeHref(entry: AgencyDistributionEntry): string {
  return `${BUSINESS_PAGE_PATH}?entry=${entry}#plan`
}

export default function AgencyVolumeBridge({ entry }: { entry: AgencyDistributionEntry }) {
  const sectionId = `agency-volume-bridge-${entry}`
  if (!BULK_PACKS_PUBLIC) return <BusinessPlanBridge entry={entry} sectionId={sectionId} />
  return (
    <section
      id={sectionId}
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
      <AgencyVolumeBridgeImpression entry={entry} targetId={sectionId} />
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
          {/* KINEO-FILME-GRATIS-15S-2026-09-29 — o nome do motor do pacote fica só na página de agências (compra paga). */}
          Packs start at {formatCheckoutMoney('usd', LOWEST_UNIT_PRICE_MINOR)} per finished 60-second film.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 9, justifyItems: 'stretch' }}>
        <AgencyVolumeBridgeLink
          entry={entry}
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
        </AgencyVolumeBridgeLink>
        <p style={{ color: '#85858c', fontSize: 11.5, lineHeight: 1.45, margin: 0, textAlign: 'center' }}>
          Self-service · one account · no recurring contract
        </p>
      </div>
    </section>
  )
}

// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — a faixa do Business (mesmo desenho e mesma telemetria da faixa dos pacotes).
function BusinessPlanBridge({ entry, sectionId }: { entry: AgencyDistributionEntry; sectionId: string }) {
  const pitch = businessPitch()
  return (
    <section
      id={sectionId}
      aria-labelledby={`agency-volume-${entry}`}
      data-kineo="business-plan-bridge"
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
      <AgencyVolumeBridgeImpression entry={entry} targetId={sectionId} />
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
          For businesses, agencies and freelancers
        </p>
        <h2
          id={`agency-volume-${entry}`}
          style={{ color: '#f5f5f7', fontSize: 'clamp(1.28rem, 3vw, 1.72rem)', lineHeight: 1.15, margin: 0, fontWeight: 900 }}
        >
          Making video ads for a product — yours or a client&apos;s?
        </h2>
        <p style={{ color: '#aaaab1', fontSize: 14, lineHeight: 1.62, margin: '10px 0 0' }}>
          {pitch.sentence}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 9, justifyItems: 'stretch' }}>
        <AgencyVolumeBridgeLink
          entry={entry}
          href={businessBridgeHref(entry)}
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
          See the Business plan →
        </AgencyVolumeBridgeLink>
        <p style={{ color: '#85858c', fontSize: 11.5, lineHeight: 1.45, margin: 0, textAlign: 'center' }}>
          Self-service · monthly billing · cancel anytime
        </p>
      </div>
    </section>
  )
}
