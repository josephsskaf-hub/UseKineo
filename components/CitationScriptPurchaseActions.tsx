import OrganicCtaLink from '@/components/OrganicCtaLink'
import { CITATION_COST_DECISION_CSS } from '@/lib/ui/citationCostDecisionStyles'

const CAMPAIGN = 'citacoes_01_handoff'

/** The existing approved-script guide can start with a purchase or a review. */
export default function CitationScriptPurchaseActions({ reviewHref }: { reviewHref: string }) {
  return <>
    <style dangerouslySetInnerHTML={{ __html: CITATION_COST_DECISION_CSS }} />
    <div className="kccd-actions" data-script-purchase="approved_script_plans_v1">
      <OrganicCtaLink className="kc-cta" href={`/pricing?intent_campaign=${CAMPAIGN}`} source={CAMPAIGN} placement="hero_plans">Choose a plan for your script →</OrganicCtaLink>
      <OrganicCtaLink className="kccd-compare" href={reviewHref} source={CAMPAIGN} placement="hero_script_review">Review your approved script</OrganicCtaLink>
    </div>
  </>
}
