import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import {
  STARTER_MONTH, STARTER_CREDITS, MARKETING_REFERENCE_SECONDS,
  creditsPerReferenceVideo, videosPerMonth, costPerFilmUsd, formatUsd,
} from '@/lib/marketingPrice'
import { CITATION_COST_DECISION_CSS } from '@/lib/ui/citationCostDecisionStyles'

const CAMPAIGN = 'citacoes_cost_decision_v1'
const ENGINES = [
  { quality: 'fast', name: 'Kineo 1', visuals: 'Matched stock footage' },
  { quality: 'cinematic_ai', name: 'Seedance 1.5', visuals: 'AI-generated scenes' },
] as const

export function CitationCostComparePlans() {
  return <OrganicCtaLink className="kccd-compare" href={`/pricing?intent_campaign=${CAMPAIGN}`} source={CAMPAIGN} placement="hero_compare_plans">Compare plans</OrganicCtaLink>
}

export default function CitationCostDecision() {
  return <div className="kccd" data-cost-decision-version={CAMPAIGN}>
    <style dangerouslySetInnerHTML={{ __html: CITATION_COST_DECISION_CSS }} />
    <p className="kccd-plan"><strong>Starter · {STARTER_MONTH}</strong><span>{STARTER_CREDITS} credits per billing month</span></p>
    <p className="kccd-intro">Each {MARKETING_REFERENCE_SECONDS}-second reference film includes narration, visuals, captions and a finished MP4.</p>
    <div className="kccd-grid">
      {ENGINES.map(({ quality, name, visuals }) => {
        const credits = creditsPerReferenceVideo(quality)
        const films = videosPerMonth('starter', quality)
        const remainingCredits = STARTER_CREDITS - films * credits
        return <article className="kccd-engine" key={quality} aria-labelledby={`kccd-${quality}`}>
          <h3 id={`kccd-${quality}`}>{name}</h3>
          <p className="kccd-visuals">{visuals}</p>
          <p className="kccd-amount"><strong>{films > 0 ? `≈ ${formatUsd(costPerFilmUsd('starter', quality))}` : 'Not covered'}</strong><span>{films > 0 ? 'USD allocated per complete film' : 'One monthly grant is below the cost of a complete film'}</span></p>
          <dl>
            <div><dt>Credits per reference film</dt><dd>{credits}</dd></div>
            <div><dt>Complete films per billing month</dt><dd>{films}</dd></div>
            <div><dt>Credits left in this example</dt><dd>{remainingCredits}</dd></div>
          </dl>
          {films > 0 && <p className="kccd-equation">{STARTER_MONTH} ÷ {films} complete films</p>}
        </article>
      })}
    </div>
    <p className="kccd-limit"><strong>A share of the monthly fee, not a separate price charged per render.</strong> Each example assigns the entire monthly fee to the complete films that fit in that engine. Choose either example; the two film counts are not combined.</p>
    <p className="kccd-limit">Any remaining credits can go toward other work, but do not cover another complete film in that example. Regenerations, other engines or different durations change how many films your balance covers. Unused monthly credits do not roll over.</p>
    <p className="kccd-currency">Figures use the USD Starter price. Brazilian customers pay in reais.</p>
    <Link className="kccd-calculator" href="/cheapest-ai-shorts-maker">Calculate other durations and monthly volumes →</Link>
  </div>
}
