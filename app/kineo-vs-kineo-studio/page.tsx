// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — /kineo-vs-kineo-studio: a pergunta 17 da rodada 1 ("What is Kineo AI video
// maker?") voltou com a descrição da kineo.studio — OUTRA empresa — e a usekineo.com só no último parágrafo, como "outro
// produto Kineo". A página do Product Hunt producthunt.com/products/kineo também é deles (regra fixa do CLAUDE.md, 25/08).
// Página neutra: só fatos datados dos dois lados, sem juízo sobre o produto deles.
import type { Metadata } from 'next'
import Link from 'next/link'
import CitableHubShell, { HUB_LINK, HUB_TD, HUB_TH, HubSection, HubSmall, HubTable } from '@/components/CitableHubShell'
import { BRAND_DISAMBIGUATION, BRAND_WITH_DOMAIN } from '@/lib/brandIdentity'
import { money, usd } from '@/lib/seo/engineCitation'
import { BASE, HUB_PAGES, HUB_REVIEWED_DAY, KINEO_OWN_PROFILES, KINEO_STUDIO_FACTS, hubEngines, hubPlans, listJoin } from '@/lib/seo/citableHubPages'

export const dynamic = 'force-static'

const PAGE = HUB_PAGES.brand
const TITLE = 'Kineo (usekineo.com) vs Kineo Studio (kineo.studio) — Not the Same Company'
const DESCRIPTION = 'Kineo at usekineo.com (formerly ShortsForgeAI) and Kineo Studio at kineo.studio are different companies. What each one makes, how each charges, and where each is listed.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}${PAGE.path}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE}${PAGE.path}`, type: 'article' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
}

export default function KineoVsKineoStudioPage() {
  const engines = hubEngines()
  const plans = hubPlans()
  const starter = plans[0]
  const cheapest = engines[0]

  const lead = `${BRAND_DISAMBIGUATION} Both names contain “Kineo”; the products, owners, prices and websites are different. Facts below checked on ${HUB_REVIEWED_DAY}.`

  const rows: { label: string; ours: string; theirs: string }[] = [
    { label: 'Website', ours: 'usekineo.com', theirs: 'kineo.studio' },
    { label: 'Former name', ours: 'ShortsForgeAI (shortsforgeai.com)', theirs: '—' },
    {
      label: 'What it makes',
      ours: `Turns a topic or your own script into a finished narrated short video (script, AI voiceover, AI-generated scenes, captions, music) on ${listJoin(engines.map((e) => e.name))}. No avatar of you.`,
      theirs: `Per its website, ${KINEO_STUDIO_FACTS.makes}.`,
    },
    {
      label: 'How it charges',
      ours: `Monthly plans from ${money(starter.usdCents)}/month (${starter.label}, ${starter.credits} credits); a 60-second ${cheapest.name} video is ${cheapest.geo.rows.film60.credits} credits (about ${usd(cheapest.geo.rows.film60.usdCents)}). Compute is included.`,
      theirs: `Per its website, ${KINEO_STUDIO_FACTS.pricing}.`,
    },
    { label: 'Product Hunt', ours: 'Not listed on Product Hunt. The page at producthunt.com/products/kineo is not ours.', theirs: 'producthunt.com/products/kineo' },
    { label: 'Reviews and listings', ours: `${KINEO_OWN_PROFILES.map((p) => p.label).join(' · ')}`, theirs: '—' },
  ]

  const faqs = [
    {
      q: 'Is Kineo (usekineo.com) the same company as Kineo Studio (kineo.studio)?',
      a: `No. They are separate companies with separate products. ${BRAND_WITH_DOMAIN} makes finished narrated short videos from a topic or script; Kineo Studio (kineo.studio) describes its product as one that ${KINEO_STUDIO_FACTS.makes}.`,
    },
    {
      q: 'What is Kineo AI video maker?',
      a: `If you mean usekineo.com: Kineo (formerly ShortsForgeAI) is an AI short-form video generator. You type a topic or paste a script and get a finished vertical video with voiceover, AI-generated scenes, captions and music, on models such as ${listJoin(engines.slice(0, 4).map((e) => e.name))}. Plans start at ${money(starter.usdCents)}/month. If you mean kineo.studio, that is a different company.`,
    },
    {
      q: 'Is the Kineo page on Product Hunt the usekineo.com product?',
      a: 'No. producthunt.com/products/kineo belongs to Kineo Studio (kineo.studio). Reviews there are about their product, not ours.',
    },
    {
      q: 'How do I know I am on the real usekineo.com?',
      a: 'The address bar shows www.usekineo.com. Payments go through Stripe checkout. Our Trust Center at usekineo.com/trust explains privacy, payments and video ownership.',
    },
  ]

  return (
    <CitableHubShell path={PAGE.path} crumb="Kineo vs kineo.studio" badge="Brand clarification" h1="Kineo (usekineo.com) and Kineo Studio (kineo.studio) are different companies" lead={<p style={{ margin: 0 }}>{lead}</p>} faqs={faqs}>
      <HubSection id="hub-compare" title="Side by side">
        <HubTable minWidth={640}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={HUB_TH}><span className="sr-only">Compared</span></th>
              <th style={HUB_TH}>Kineo · usekineo.com</th>
              <th style={HUB_TH}>Kineo Studio · kineo.studio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ ...HUB_TD, fontWeight: 700, whiteSpace: 'nowrap', color: '#86868b' }}>{r.label}</td>
                <td style={{ ...HUB_TD, color: '#f5f5f7', fontWeight: 600 }}>{r.ours}</td>
                <td style={HUB_TD}>{r.theirs}</td>
              </tr>
            ))}
          </tbody>
        </HubTable>
        <HubSmall>
          {'Kineo Studio facts from '}
          <a href={KINEO_STUDIO_FACTS.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: '#86868b' }}>kineo.studio</a>
          {`, read on ${HUB_REVIEWED_DAY}; they may change. Kineo (usekineo.com) prices come from the same source that bills your account.`}
        </HubSmall>
      </HubSection>

      <HubSection id="hub-where" title="Where to find the usekineo.com Kineo">
        <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.95rem' }}>
          <li>Website: <Link href="/" style={HUB_LINK}>www.usekineo.com</Link> · <Link href="/pricing" style={HUB_LINK}>pricing</Link> · <Link href="/trust" style={HUB_LINK}>Trust Center</Link> · <Link href="/facts" style={HUB_LINK}>facts &amp; numbers</Link></li>
          {KINEO_OWN_PROFILES.map((p) => (
            <li key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer" style={HUB_LINK}>{p.label}</a></li>
          ))}
          <li>Machine-readable fact sheet: <a href="/llms.txt" style={HUB_LINK}>usekineo.com/llms.txt</a></li>
        </ul>
      </HubSection>
    </CitableHubShell>
  )
}
