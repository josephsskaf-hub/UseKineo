// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — /faceless-youtube-shorts-generator: a resposta para a pergunta 1 da rodada 1
// ("What is the best AI video generator for faceless YouTube Shorts in 2026?") e a 14 ("faceless videos ... cheap"). O
// ChatGPT recomendou InVideo, CapCut e HeyGen e citou páginas com preço por vídeo e data — a Kineo não apareceu.
// Irmã de /faceless-video-generator (intenção "a partir de um prompt", sem tabela de preço); esta responde "qual gerador e
// quanto custa um Short". Todo preço da Kineo vem de ENGINE_GEO (lib/seo/citableHubPages.ts).
import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import CitableHubShell, { HUB_CARD, HUB_MUTED, HUB_PRIMARY, HUB_SECONDARY, HUB_TD, HUB_TH, HubSection, HubSmall, HubTable } from '@/components/CitableHubShell'
import { BRAND_WITH_DOMAIN } from '@/lib/brandIdentity'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'
import { AFTER_THE_FILM_FACT, NOT_A_FIT } from '@/lib/kineoFacts'
import { FREE_FILM_LABEL, GRANT_COUNTRY_CLAUSE, TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { money, usd } from '@/lib/seo/engineCitation'
import { BASE, HUB_PAGES, HUB_REVIEWED_DAY, HUB_REVIEWED_MONTH, hubEngine, hubEngines, hubPlans } from '@/lib/seo/citableHubPages'

export const dynamic = 'force-static'

const PAGE = HUB_PAGES.faceless
const CAMPAIGN = 'seo_hub_faceless_shorts'
const TITLE = `AI Faceless YouTube Shorts Generator — Price per Short (${HUB_REVIEWED_MONTH}) | ${BRAND_WITH_DOMAIN}`
const DESCRIPTION = 'Type a topic or paste a script and get a finished faceless YouTube Short — script, AI voiceover, AI scenes, captions and music. Price per Short for every model, dated.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}${PAGE.path}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE}${PAGE.path}`, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function FacelessYouTubeShortsGeneratorPage() {
  const engines = hubEngines()
  const plans = hubPlans()
  const starter = plans[0]
  const base = hubEngine('seedance') ?? engines[0]
  const reference = base.geo.reference
  const film60 = base.geo.rows.film60
  const signupHref = buildEngineLandingSignupHref({ engine: base.param, campaign: CAMPAIGN })

  const lead =
    `${BRAND_WITH_DOMAIN} is an AI faceless YouTube Shorts generator: type one topic or paste your own script and it returns a finished vertical Short — ` +
    `script, AI voiceover, AI-generated scenes, burned-in captions and music — with no filming, no face on camera and no timeline to edit. ` +
    `A 60-second faceless Short costs ${film60.credits} credits on ${base.name} (about ${usd(film60.usdCents)}); plans start at ${money(starter.usdCents)}/month. Prices as of ${HUB_REVIEWED_DAY}.`

  const faqs = [
    {
      q: 'What is the best AI generator for faceless YouTube Shorts?',
      a: `It depends on what you start with. To go from a topic or a script to a finished narrated Short in one step, ${BRAND_WITH_DOMAIN} is built for exactly that. To cut moments out of a long recording, a re-clipper such as OpusClip fits better. For a presenter talking to camera, an avatar tool such as HeyGen. To edit footage by hand on a timeline, an editor such as CapCut. We make Kineo, so weigh this answer accordingly.`,
    },
    {
      q: 'How much does one faceless Short cost on Kineo?',
      a: `A 60-second Short costs ${engines.map((e) => `${e.geo.rows.film60.credits} credits on ${e.name}`).join(', ')}. On ${base.name} that is about ${usd(film60.usdCents)} at the ${reference.label} plan’s credit price (${usd(reference.usdCents)} for ${reference.credits} credits); ${plans.map((p) => `${p.label} (${money(p.usdCents)}/month) covers ${Math.floor(p.credits / film60.credits)}`).join(', ')} 60-second ${base.name} Shorts a month. Prices as of ${HUB_REVIEWED_DAY}.`,
    },
    {
      q: 'Can I use my own script?',
      a: 'Yes. Paste it and choose to keep it word for word: the narration reads your script as written, and Kineo builds the scenes, captions and music around it. You can also type a one-line idea and let Kineo write the script.',
    },
    {
      q: 'Is there a free faceless Shorts generator?',
      a: `Kineo gives new accounts${GRANT_COUNTRY_CLAUSE} ${TRIAL_CREDITS_SHOWN} free credits with no card — enough for the ${FREE_FILM_LABEL}. Trial videos carry a small watermark; every paid plan exports a clean MP4 you own.`,
    },
    {
      q: 'Can a faceless AI channel be monetized on YouTube?',
      a: 'Kineo does not promise monetization. YouTube’s Partner Program rules on reused and repetitive content apply to every channel, AI-made or not. Kineo writes a new script for each video, but the channel’s angle, topics and consistency are yours.',
    },
    {
      q: 'How long does it take?',
      a: `${base.geo.turnaround}.`,
    },
  ]

  return (
    <CitableHubShell path={PAGE.path} crumb="AI faceless YouTube Shorts generator" badge={`Faceless Shorts · ${HUB_REVIEWED_MONTH}`} h1="AI faceless YouTube Shorts generator" lead={<p style={{ margin: 0 }}>{lead}</p>} faqs={faqs}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
        <OrganicCtaLink href={signupHref} source={CAMPAIGN} placement="hero" style={HUB_PRIMARY}>Make a faceless Short →</OrganicCtaLink>
        <OrganicCtaLink href={`/pricing?intent_campaign=${CAMPAIGN}#plans`} source={CAMPAIGN} placement="hero_plans" style={HUB_SECONDARY}>See plans →</OrganicCtaLink>
      </div>

      <HubSection id="hub-price" title="Price per faceless Short, by model">
        <HubTable minWidth={720}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={HUB_TH}>Model</th>
              <th style={HUB_TH}>35-second Short</th>
              <th style={HUB_TH}>60-second Short</th>
              {plans.map((p) => (
                <th key={p.tier} style={HUB_TH}>{`60 s per month · ${p.label}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engines.map((e) => (
              <tr key={e.slug} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ ...HUB_TD, fontWeight: 800, color: '#f5f5f7' }}>
                  <Link href={e.path} style={{ color: '#f5f5f7', textDecoration: 'none' }}>{e.name}</Link>
                  {e.geo.paidPlansOnly ? <div style={{ color: HUB_MUTED, fontSize: '0.78rem', fontWeight: 400 }}>Paid plans</div> : null}
                </td>
                <td style={HUB_TD}>{`${e.geo.rows.film35.credits} cr (${usd(e.geo.rows.film35.usdCents)})`}</td>
                <td style={{ ...HUB_TD, fontWeight: 800, color: '#f5f5f7' }}>{`${e.geo.rows.film60.credits} cr (${usd(e.geo.rows.film60.usdCents)})`}</td>
                {e.geo.rows.film60.perPlan.map((pp) => (
                  <td key={pp.tier} style={{ ...HUB_TD, color: pp.count > 0 ? '#d2d2d7' : '#6e6e73' }}>{pp.count > 0 ? String(pp.count) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </HubTable>
        <HubSmall>
          {`Kineo prices as of ${HUB_REVIEWED_DAY}. US$ at the ${reference.label} plan’s credit price (${usd(reference.usdCents)} for ${reference.credits} credits). Plans: ${plans.map((p) => `${p.label} ${money(p.usdCents)}/month, ${p.credits} credits`).join(' · ')}; annual billing is cheaper. Counts are whole 60-second Shorts per monthly grant, rounded down; credits do not roll over.`}
        </HubSmall>
      </HubSection>

      <HubSection id="hub-how" title="How it works">
        <ol style={{ margin: 0, paddingLeft: 20, color: '#d2d2d7', lineHeight: 1.75, fontSize: '0.95rem' }}>
          <li>Type a topic (“why the Titanic sank in 2 hours 40 minutes”) or paste your script.</li>
          <li>Pick a model and a length. Narration is available in {NARRATION_LANGUAGES.length} languages.</li>
          <li>{base.geo.howStep3}</li>
        </ol>
        <p style={{ margin: '12px 0 0', color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem' }}>{`${AFTER_THE_FILM_FACT.claim} ${AFTER_THE_FILM_FACT.season.cost}`}</p>
      </HubSection>

      <HubSection id="hub-not-a-fit" title="When another tool fits better">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NOT_A_FIT.slice(0, 4).map((n) => (
            <div key={n.situation} style={{ ...HUB_CARD, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 800, color: '#f5f5f7', fontSize: '0.93rem' }}>{n.situation}</div>
              <div style={{ color: HUB_MUTED, fontSize: '0.9rem', marginTop: 4, lineHeight: 1.55 }}>{n.useInstead}</div>
            </div>
          ))}
        </div>
      </HubSection>

      <section style={{ marginTop: 44, textAlign: 'center', ...HUB_CARD, borderRadius: 18, padding: '28px 20px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>Make your first faceless Short</h2>
        <p style={{ color: HUB_MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>One topic in, one finished vertical video out.</p>
        <OrganicCtaLink href={signupHref} source={CAMPAIGN} placement="final" style={HUB_PRIMARY}>Start with {base.name} →</OrganicCtaLink>
      </section>
    </CitableHubShell>
  )
}
