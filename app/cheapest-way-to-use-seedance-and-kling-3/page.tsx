// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — /cheapest-way-to-use-seedance-and-kling-3: as perguntas 3, 4 e 5 da rodada 1
// ("cheapest way to use Seedance 2.5", "Seedance 2.5 price per video — which app is cheapest?", "Kling 3 alternative that
// is cheaper"). PÁGINA HONESTA: entra TODA cotação oficial da régua (lib/clips/clipPriceVsMarket.ts), inclusive quando o
// concorrente é mais barato por clipe cru que a Kineo — em 06/10 o app da Kling e a Higgsfield são, no Kling 3 e no
// Seedance 2.5. A Kineo ganha onde ganha de verdade: o vídeo narrado pronto num render e um saldo para todos os modelos.
// RAMO DE REVISÃO: o fundador decide se publica (relatório da sessão CEO, 06/10).
import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import CitableHubShell, { HUB_MUTED, HUB_PRIMARY, HUB_SECONDARY, HUB_TD, HUB_TH, HubSection, HubSmall, HubTable } from '@/components/CitableHubShell'
import { BRAND_WITH_DOMAIN } from '@/lib/brandIdentity'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'
import { PIKA_CHECKED_ON, PIKA_COMMERCIAL_LINE, PIKA_ENTRY, PIKA_PRICING_URL } from '@/lib/growth/s25EnginePage'
import { money, usd } from '@/lib/seo/engineCitation'
import {
  BASE,
  HUB_PAGES,
  HUB_REVIEWED_DAY,
  HUB_REVIEWED_MONTH,
  INVIDEO_FACTS,
  creditsOnPlan,
  hubEngine,
  hubPlans,
  kineoClipResolution,
  marketRowsFor,
  type HubEngine,
  type MarketRow,
} from '@/lib/seo/citableHubPages'

export const dynamic = 'force-static'

const PAGE = HUB_PAGES.cheapest
const CAMPAIGN = 'seo_hub_cheapest_seedance_kling3'
const TITLE = `Cheapest Way to Use Seedance 2.5 and Kling 3 (${HUB_REVIEWED_MONTH}) — Price per Clip and per Video | ${BRAND_WITH_DOMAIN}`
const DESCRIPTION = 'Official prices per 5-second clip for Seedance 2.5, Kling 3, Seedance 1.5 and Kling 2.5 across Kling, Higgsfield, Runway and Kineo, dated — including where Kineo is not the cheapest.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}${PAGE.path}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${BASE}${PAGE.path}`, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const FOCUS = ['seedance-2-5', 'kling-3', 'seedance', 'kling'] as const

function cheapestRow(rows: MarketRow[]): MarketRow | null {
  return rows[0] ?? null
}
function lowestEntry(rows: MarketRow[]): MarketRow | null {
  return [...rows].sort((a, b) => a.monthlyCents - b.monthlyCents || a.clipCents - b.clipCents)[0] ?? null
}

export default function CheapestSeedanceKling3Page() {
  const plans = hubPlans()
  const starter = plans[0]
  const focus = FOCUS.map((slug) => hubEngine(slug)).filter((h): h is HubEngine => h !== null && h.geo.rows.clip !== null)
  const s25 = focus.find((h) => h.slug === 'seedance-2-5') ?? null
  const k3 = focus.find((h) => h.slug === 'kling-3') ?? null

  const sentence = (h: HubEngine | null) => {
    if (!h || !h.geo.rows.clip) return ''
    const rows = marketRowsFor(h.geo)
    const best = cheapestRow(rows)
    const clip = h.geo.rows.clip
    const kineo = `${usd(clip.usdCents)} on Kineo`
    if (!best) return `${h.name}: about ${kineo} per ${clip.seconds}-second clip; we found no official consumer price elsewhere to compare.`
    const lower = best.clipCents < clip.usdCents
    const entry = lowestEntry(rows)!
    const entryPart = entry.who === best.who && entry.plan !== best.plan
      ? `${best.who === 'Kling' ? 'Kling’s own app' : best.who}: about ${usd(entry.clipCents)} per ${best.seconds}-second ${best.resolution} clip on its ${money(entry.monthlyCents)}/month ${entry.plan} plan, down to ${usd(best.clipCents)} on ${best.plan} (${money(best.monthlyCents)}/month)`
      : `${best.who} ${best.plan} (${money(best.monthlyCents)}/month), about ${usd(best.clipCents)} per ${best.seconds}-second ${best.resolution} clip`
    return `${h.name}: the lowest official price we found is ${entryPart} — ${lower ? 'less than' : 'more than'} ${kineo}.`
  }

  const lead =
    `${sentence(k3)} ${sentence(s25)} ` +
    `Kineo (usekineo.com) is not the cheapest place for raw clips of these two models. Its price covers a finished video instead: a 60-second ${k3?.name ?? 'Kling 3'} or ${s25?.name ?? 'Seedance 2.5'} video with narration, captions and music is ${k3?.geo.rows.film60.credits ?? 150} credits (about ${usd(k3?.geo.rows.film60.usdCents ?? 0)}). Prices as of ${HUB_REVIEWED_DAY}.`

  const signupHref = buildEngineLandingSignupHref({ engine: (k3 ?? focus[0]).param, campaign: CAMPAIGN })

  const faqs = [
    {
      q: 'What is the cheapest way to use Seedance 2.5?',
      a: s25
        ? `Per raw clip at 480p, on the official prices we checked (${HUB_REVIEWED_DAY}): ${marketRowsFor(s25.geo).map((r) => `${r.who} ${r.plan} about ${usd(r.clipCents)} per ${r.seconds} s (${money(r.monthlyCents)}/month)`).join('; ')}; Kineo about ${usd(s25.geo.rows.clip!.usdCents)} per ${s25.geo.rows.clip!.seconds} s on any paid plan (from ${money(starter.usdCents)}/month). Pika sells Seedance 2.5 at 720p from its ${PIKA_ENTRY.monthly}/month ${PIKA_ENTRY.plan} plan (commercial use: ${PIKA_COMMERCIAL_LINE.toLowerCase()}; checked ${PIKA_CHECKED_ON}). InVideo includes Seedance 2.5 from its ${INVIDEO_FACTS.plus.plan} plan (${INVIDEO_FACTS.plus.perSeatMonthBilledYearly}/seat/month billed yearly).`
        : 'Seedance 2.5 is not available on Kineo right now.',
    },
    {
      q: 'Seedance 2.5 price per video — which app is cheapest?',
      a: `For a raw 5-second clip, Higgsfield’s Plus plan was the lowest official price we found. For a finished narrated video, Kineo charges ${s25?.geo.rows.film35.credits ?? '—'} credits for 35 seconds (about ${usd(s25?.geo.rows.film35.usdCents ?? 0)}) and ${s25?.geo.rows.film60.credits ?? '—'} credits for 60 seconds (about ${usd(s25?.geo.rows.film60.usdCents ?? 0)}), with script, narration, captions and music included. We did not include Dreamina, Magnific, OpenArt, Pollo or Krea: their recurring per-second price was not published or was a temporary promotion when we checked.`,
    },
    {
      q: 'What is the cheapest way to use Kling 3?',
      a: k3
        ? `Kling’s own app: on the official renewal prices we checked, a 5-second Kling 3.0 clip at 1080p costs about ${usd(marketRowsFor(k3.geo).filter((r) => r.who === 'Kling').at(-1)?.clipCents ?? 0)} on its Standard plan and less on bigger plans. Higgsfield and Runway’s Pro plan are also below Kineo per clip; Runway’s Standard plan is above. Kineo charges ${k3.geo.rows.clip!.credits} credits (about ${usd(k3.geo.rows.clip!.usdCents)}) per 5-second clip, or ${k3.geo.rows.film60.credits} credits for a finished 60-second video with characters speaking their lines, narration, captions and music.`
        : 'Kling 3 is not available on Kineo right now.',
    },
    {
      q: 'Can I use Seedance 2.5 or Kling 3 on a free trial?',
      a: `On Kineo: ${s25 ? s25.geo.accessNote : ''} ${k3 ? k3.geo.accessNote : ''}`.trim(),
    },
    {
      q: 'Why would I pay more per clip on Kineo?',
      a: 'Only if you want the finished video rather than raw clips: Kineo writes the script, voices it, generates every scene, adds captions and music and edits the cut in one render, with one balance across Seedance, Kling, Veo and MiniMax. If you will edit raw clips yourself, the cheaper per-clip options above are the better deal.',
    },
  ]

  return (
    <CitableHubShell path={PAGE.path} crumb="Cheapest way to use Seedance and Kling 3" badge={`Official prices · ${HUB_REVIEWED_MONTH}`} h1="The cheapest way to use Seedance 2.5 and Kling 3" lead={<p style={{ margin: 0 }}>{lead}</p>} faqs={faqs}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
        <OrganicCtaLink href={signupHref} source={CAMPAIGN} placement="hero" style={HUB_PRIMARY}>Make a finished video →</OrganicCtaLink>
        <Link href={HUB_PAGES.oneplace.path} style={HUB_SECONDARY}>Every model in one place →</Link>
      </div>

      {focus.map((h) => {
        const rows = marketRowsFor(h.geo)
        const clip = h.geo.rows.clip!
        const entry = lowestEntry(rows)
        return (
          <HubSection key={h.slug} id={`hub-${h.slug}`} title={`${h.name}: price per ${clip.seconds}-second clip`}>
            <HubTable minWidth={640}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={HUB_TH}>Where</th>
                  <th style={HUB_TH}>Plan</th>
                  <th style={HUB_TH}>Resolution</th>
                  <th style={HUB_TH}>{`≈ US$ per ${clip.seconds} s`}</th>
                  <th style={HUB_TH}>Source</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...rows.map((r) => ({ key: `${r.who}-${r.plan}`, who: r.who, plan: `${r.plan} · ${money(r.monthlyCents)}/mo`, res: r.resolution, cents: r.clipCents, src: r.url, date: r.checkedOn, kineo: false })),
                  ...plans.map((p) => ({ key: `kineo-${p.tier}`, who: 'Kineo', plan: `${p.label} · ${money(p.usdCents)}/mo${h.geo.paidPlansOnly ? '' : ''}`, res: kineoClipResolution(h.geo), cents: Math.round((clip.credits * p.usdCents) / p.credits), src: '/pricing', date: '', kineo: true })),
                ]
                  .sort((a, b) => a.cents - b.cents)
                  .map((r) => (
                    <tr key={r.key} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: r.kineo ? 'rgba(41,151,255,0.06)' : undefined }}>
                      <td style={{ ...HUB_TD, fontWeight: 800, color: '#f5f5f7' }}>{r.who}</td>
                      <td style={HUB_TD}>{r.plan}</td>
                      <td style={HUB_TD}>{r.res}</td>
                      <td style={{ ...HUB_TD, fontWeight: 800, color: '#f5f5f7' }}>{usd(r.cents)}</td>
                      <td style={HUB_TD}>
                        {r.kineo ? `${clip.credits} credits` : <a href={r.src} target="_blank" rel="nofollow noopener noreferrer" style={{ color: '#2997ff', textDecoration: 'none' }}>{`official page (${r.date})`}</a>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </HubTable>
            <HubSmall>
              {rows.length === 0
                ? `We found no official consumer price for ${h.name} elsewhere. Kineo: ${clip.credits} credits per ${clip.seconds}-second clip (${creditsOnPlan(clip.credits, starter)} on ${starter.label}).`
                : `Lowest monthly entry with ${h.name} in this table: ${entry!.who} ${entry!.plan} at ${money(entry!.monthlyCents)}/month${h.geo.paidPlansOnly ? `; on Kineo, any paid plan from ${money(starter.usdCents)}/month` : `; on Kineo, ${starter.label} at ${money(starter.usdCents)}/month`}. Per-clip prices use each plan’s monthly price divided by its credits. A finished 60-second ${h.name} video on Kineo is ${h.geo.rows.film60.credits} credits (about ${usd(h.geo.rows.film60.usdCents)}), with script, narration, captions and music.`}
            </HubSmall>
          </HubSection>
        )
      })}

      <section style={{ marginTop: 40, padding: '16px 18px', borderRadius: 14, border: '1px solid #2a2a2d', color: HUB_MUTED, fontSize: '0.88rem', lineHeight: 1.6 }}>
        {`How we compared: only prices from each provider’s own pricing or model page, monthly billing, the same model at the same resolution as Kineo’s clip. Kling plans are shown at their renewal price (the first month is promotional). Pika (${PIKA_ENTRY.plan} ${PIKA_ENTRY.monthly}/month) sells Seedance 2.5 only at 720p, so it is not in the 480p table. `}
        <a href={PIKA_PRICING_URL} target="_blank" rel="nofollow noopener noreferrer" style={{ color: '#86868b' }}>Pika pricing</a>
        {`. Prices change; each row shows the day it was read.`}
      </section>
    </CitableHubShell>
  )
}
