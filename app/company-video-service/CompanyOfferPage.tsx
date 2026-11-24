import { KineoBrandIcon } from '@/components/KineoBolt'
import { ADS_EXEMPLOS } from '@/lib/ads/adsExemplos'
import { formatCheckoutMoney } from '@/lib/checkoutPricing'
import { COMPANY_OFFER as offer } from '@/lib/growth/companyOffer'
import CompanyOfferForm from './CompanyOfferForm'

const examples = ADS_EXEMPLOS.filter((example) => example.aprovadoPeloDono && offer.exampleKeys.some((key) => key === example.key))

export default function CompanyOfferPage({ monthlyPriceMinor = offer.approvedMonthlyPriceMinor }: {
  monthlyPriceMinor?: number | null
}) {
  return (
    <main className="company-offer">
      <div className="company-offer-wrap">
        <header className="company-offer-header">
          <a className="company-offer-brand" href="/"><KineoBrandIcon />{offer.brand}</a>
          <a href="#examples">See our work</a>
        </header>

        <section className="company-offer-hero" aria-labelledby="company-offer-title">
          <div className="company-offer-intro">
            <p className="company-offer-kicker">Monthly ad production</p>
            <h1 id="company-offer-title">Product ads made for your next campaign</h1>
            <p className="company-offer-lead">For stores and brands that advertise every week and want finished videos without handling the production themselves.</p>
            <p>This is a monthly production service delivered by the {offer.brand} team using {offer.brand}. It is purchased separately from a software subscription.</p>
            <a href="#proposal" className="company-offer-cta">Request a monthly proposal</a>
          </div>

          <div className="company-offer-package">
            <h2>What you receive</h2>
            <strong className="company-offer-quantity">{offer.monthlyDeliverables} finished ads <span>per month</span></strong>
            <dl>
              <div><dt>Format</dt><dd>Up to {offer.maxSeconds}s · {offer.aspectRatio} · MP4</dd></div>
              <div><dt>Scope</dt><dd>One brand, SKU and agreed language</dd></div>
              <div><dt>Production</dt><dd>Scripts, editing and human review</dd></div>
              <div><dt>Revisions</dt><dd>{offer.revisionRounds} consolidated round per batch</dd></div>
            </dl>
            {monthlyPriceMinor !== null && (
              <p className="company-offer-price"><strong>{formatCheckoutMoney(offer.currency, monthlyPriceMinor)}</strong> / month</p>
            )}
            <p>Made from product photos you have permission to use.</p>
          </div>
        </section>

        <section id="examples" className="company-offer-examples" aria-labelledby="company-offer-examples-title">
          <div>
            <h2 id="company-offer-examples-title">See our work</h2>
            <p>House-made demonstrations with fictional products. These examples were produced manually by our team, including work outside the Ads tool. They are not client results or a one-click output guarantee.</p>
          </div>
          <div className="company-offer-reels">
            {examples.map((example) => (
              <figure key={example.key}>
                <video src={example.full} poster={example.poster} aria-label={example.title} controls preload="none" playsInline />
                <figcaption>{example.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="company-offer-details">
          <section aria-labelledby="company-offer-process">
            <h2 id="company-offer-process">How it works</h2>
            <ol>
              <li>Tell us about your product, audience, offer and next campaign.</li>
              <li>Share authorized product photos and approve the {offer.monthlyDeliverables} scripts.</li>
              <li>We confirm the schedule, price and acceptance terms in writing before payment. Production starts after payment and complete materials.</li>
            </ol>
          </section>
          <section aria-labelledby="company-offer-schedule">
            <h2 id="company-offer-schedule">When you receive it</h2>
            <p>For the agreed production slot, previews are due within {offer.previewBusinessDays} business days after payment, complete materials and script approval. The final batch is due within {offer.finalBusinessDays} business days after your consolidated feedback.</p>
            <p>We work on one batch at a time. The files arrive together for use across the month. Waiting for materials or approval pauses the schedule.</p>
          </section>
          <section aria-labelledby="company-offer-review">
            <h2 id="company-offer-review">Review before use</h2>
            <p>Check the product, wording and pronunciation before approving the final file. AI can introduce mistakes. We review the work and address defects against the approved brief. Generated scenes are not evidence of product performance or customer testimonials.</p>
          </section>
          <section aria-labelledby="company-offer-limits">
            <h2 id="company-offer-limits">Not included</h2>
            <p>Media buying, posting, campaign management, sales guarantees, presenter or UGC videos, long films, live filming, real creators or celebrity endorsements, source files, extra products, languages or formats, and unlimited revisions.</p>
            <p>New concepts or changes to an approved offer require a new scope.</p>
          </section>
        </div>

        <section id="proposal" className="company-offer-proposal" aria-labelledby="company-offer-proposal-title">
          <div>
            <h2 id="company-offer-proposal-title">Request a monthly proposal</h2>
            <p>Tell us what you need to advertise next. Sending a request does not charge you or reserve a production slot.</p>
          </div>
          <CompanyOfferForm />
        </section>
      </div>
    </main>
  )
}
