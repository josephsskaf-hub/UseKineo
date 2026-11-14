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

// KINEO-CITACOES-FLUXO-D02 — tabela citável "custo por filme, plano a plano" (a mesma leitura da página do Kling 4.0), só na página
// inglesa do motor (/ai-video-generator/seedance, a chamada sem props). Tudo sai do código: TIER_PRICES/TIER_CREDITS (o que cobra) e
// creditCostForDuration (a régua do motor). Nada digitado. A data é a desta tabela; a da página segue em H3_TURBO_PAGE_UPDATED.
const PLAN_TABLE_UPDATED_ISO = '2026-11-14'
const PLAN_TABLE_UPDATED = 'November 14, 2026'
const PLAN_TABLE_SECONDS = [15, 35, 60, 90] as const
const PLAN_TABLE_PLANS = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']] as const
const filmCredits = (seconds: number) => creditCostForDuration('cinematic_ai', true, seconds)
const planRows = PLAN_TABLE_PLANS.map(([tier, name]) => {
  const cents = TIER_PRICES[tier].usd
  const balance = TIER_CREDITS[tier]
  return [
    name,
    formatCheckoutMoney('usd', cents),
    String(balance),
    PLAN_TABLE_SECONDS.filter((s) => balance >= filmCredits(s)).map((s) => `${Math.floor(balance / filmCredits(s))} × ${s} s`).join(' or ') || `Not covered: a film starts at ${filmCredits(15)} credits`,
    balance >= filmCredits(60) ? `About ${formatCheckoutMoney('usd', Math.round(filmCredits(60) * cents / balance))}` : '—',
  ]
})

function H3TurboPlanTable() {
  return (
    <section aria-labelledby="h3-turbo-plans" style={{ marginTop: 28 }} data-kineo="h3-turbo-plan-table">
      <h2 id="h3-turbo-plans" style={{ fontSize: '1.3rem', fontWeight: 650 }}>H3 Turbo films per plan on Kineo</h2>
      <p style={{ fontSize: 14, color: '#5A5F67', lineHeight: 1.6 }}>An H3 Turbo film uses {filmCredits(15)} credits at 15 seconds, {filmCredits(35)} at 35, {filmCredits(60)} at 60 and {filmCredits(90)} at 90. The table shows what one month of each plan covers when the credits go to one length.</p>
      <div style={{ overflowX: 'auto', border: '1px solid #E4E4E0', borderRadius: 14, background: '#fff', color: '#0E1116' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.55 }}>
          <thead style={{ background: '#EEF3FF', textAlign: 'left' }}>
            <tr>{['Plan', 'Price per month', 'Credits per month', 'H3 Turbo films those credits cover', 'Cost of a 60 s film at that plan'].map((label) => <th key={label} scope="col" style={{ padding: 12 }}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {planRows.map((row) => <tr key={row[0]} style={{ borderTop: '1px solid #E4E4E0' }}>{row.map((cell, i) => <td key={i} style={{ padding: 12, fontWeight: i === 0 ? 600 : 400 }}>{cell}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: '#5A5F67', lineHeight: 1.6 }}>The credit cost is shown before you generate. Amounts in US$ are the reference price; other creations use the same balance. See <a href="/pricing">current prices and trial terms</a>. Plan table updated: <time dateTime={PLAN_TABLE_UPDATED_ISO}>{PLAN_TABLE_UPDATED}</time>.</p>
    </section>
  )
}

export default function H3TurboDetails({ language = 'en', reviewedOn, heading, dark = false }: { language?: 'en' | 'fr' | 'de'; reviewedOn?: string; heading?: string; dark?: boolean }) {
  const text = TEXT[language]
  const muted = dark || language !== 'en' ? '#a1a1a6' : '#5A5F67'
  const updated = reviewedOn ?? (language === 'en' ? H3_TURBO_PAGE_UPDATED : H3_TURBO_LOCALIZED_UPDATED)
  const date = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${updated}T12:00:00Z`))
  const paginaDoMotor = language === 'en' && !reviewedOn && !heading && !dark // KINEO-CITACOES-FLUXO-D02
  return (<>
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
    {paginaDoMotor && <H3TurboPlanTable />}
  </>)
}
