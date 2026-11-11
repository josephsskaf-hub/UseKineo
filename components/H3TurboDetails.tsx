import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { H3_TURBO_PAGE_UPDATED } from '@/lib/growth/h3TurboPage'
import { H3_TURBO_LOCALIZED_UPDATED } from '@/lib/growth/h3TurboLocalized'

const TEXT = {
  en: {
    heading: 'H3 Turbo cost per finished film', columns: ['Requested length', 'Credits', 'USD allocation on Starter'], seconds: 'seconds',
    note: (price: string, credits: number) => `The USD column allocates the Starter subscription price of ${price} across its ${credits} monthly credits. It is a comparison of credit use, not a per-film checkout offer. Other creations use that balance too. Brazil settles in BRL at checkout.`,
    updated: 'Updated', engines: 'Compare current film engines', plans: 'Review plan terms',
  },
  fr: {
    heading: 'Coût H3 Turbo par film terminé', columns: ['Durée demandée', 'Crédits', 'Part du prix Starter en USD'], seconds: 'secondes',
    note: (price: string, credits: number) => `La colonne USD répartit le prix de l’abonnement Starter de ${price} sur ses ${credits} crédits mensuels. Ce calcul compare l’utilisation des crédits ; il ne s’agit pas d’un achat à l’unité. Les autres créations utilisent le même solde. Au Brésil, le paiement se fait en BRL.`,
    updated: 'Mis à jour le', engines: 'Comparer les moteurs actuels', plans: 'Conditions des abonnements',
  },
  de: {
    heading: 'H3-Turbo-Kosten pro fertigem Film', columns: ['Gewünschte Länge', 'Credits', 'Anteil am Starter-Preis in USD'], seconds: 'Sekunden',
    note: (price: string, credits: number) => `Die USD-Spalte verteilt den Starter-Abopreis von ${price} auf seine ${credits} monatlichen Credits. Sie vergleicht den Credit-Verbrauch und ist kein Einzelkaufpreis. Andere Erstellungen nutzen dasselbe Guthaben. In Brasilien erfolgt die Zahlung in BRL.`,
    updated: 'Aktualisiert am', engines: 'Aktuelle Filmmodelle vergleichen', plans: 'Abobedingungen ansehen',
  },
}

export default function H3TurboDetails({ language = 'en', reviewedOn, heading, dark = false }: { language?: 'en' | 'fr' | 'de'; reviewedOn?: string; heading?: string; dark?: boolean }) {
  const text = TEXT[language]
  const muted = dark || language !== 'en' ? '#a1a1a6' : '#5A5F67'
  const updated = reviewedOn ?? (language === 'en' ? H3_TURBO_PAGE_UPDATED : H3_TURBO_LOCALIZED_UPDATED)
  const date = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${updated}T12:00:00Z`))
  return (
    <section aria-labelledby="h3-turbo-cost" style={{ marginTop: 36 }} data-kineo="h3-turbo-cost">
      <h2 id="h3-turbo-cost" style={{ fontSize: '1.3rem', fontWeight: 650 }}>{heading ?? text.heading}</h2>
      <div style={{ overflowX: 'auto', border: '1px solid #E4E4E0', borderRadius: 14, background: '#fff', color: '#0E1116' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.55 }}>
          <thead style={{ background: '#EEF3FF', textAlign: 'left' }}>
            <tr>{text.columns.map(label => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {[15, 35, 60, 90].map((seconds) => {
              const credits = creditCostForDuration('cinematic_ai', true, seconds)
              const usdCents = Math.round(credits * TIER_PRICES.starter.usd / TIER_CREDITS.starter)
              return <tr key={seconds} style={{ borderTop: '1px solid #E4E4E0' }}><td style={{ padding: 12 }}>{seconds} {text.seconds}</td><td style={{ padding: 12 }}>{credits}</td><td style={{ padding: 12 }}>{formatCheckoutMoney('usd', usdCents)}</td></tr>
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>{text.note(formatCheckoutMoney('usd', TIER_PRICES.starter.usd), TIER_CREDITS.starter)}</p>
      <p style={{ fontSize: 13, color: muted }}>{text.updated} <time dateTime={updated}>{date}</time>. <a href="/models-pricing" style={dark ? { color: '#2997ff' } : undefined}>{text.engines}</a> · <a href="/pricing" style={dark ? { color: '#2997ff' } : undefined}>{text.plans}</a>.</p>
    </section>
  )
}
