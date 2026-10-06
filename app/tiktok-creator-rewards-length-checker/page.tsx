// ═══ KINEO-DURACAO-REWARDS-2026-10-06 — página nova (aposta C do fundador): "Is your script long enough for TikTok
// Creator Rewards?" — ferramenta grátis para criador de país rico e página feita para ser CITADA por assistente (o
// ChatGPT citando páginas nossas trouxe 8 dos 11 pagantes de 60 dias).
//
// O que ela promete e o que NÃO promete: diz o critério de DURAÇÃO do Creator Rewards Program com a fonte oficial e a
// data da consulta, e estima a narração do roteiro nas duas réguas de voz da casa (lib/growth/duracaoRewards.ts). Não
// diz que vídeo nenhum "se qualifica" — duração é um critério e quem decide é o TikTok.
//
// Nenhuma tela existente muda: só esta rota, a entrada no fim do sitemap e a linha no fim do llms.txt. Estática; a
// conta roda no cliente (RewardsLengthClient) e não manda nada ao servidor enquanto a pessoa confere.
// Tema: só os tokens de app/appearance.css (claro por padrão, escuro pela escolha do visitante). 390 px: uma coluna.
// Guardião: scripts/test-duracao-rewards-2026-10-06.mjs.

import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import RewardsLengthClient, { RewardsStudioCta } from './RewardsLengthClient'
import {
  DURACAO_REWARDS_PATH,
  REWARDS_RATE_BASE,
  REWARDS_SOURCES,
  REWARDS_SOURCES_CHECKED,
  wordsForOneMinute,
} from '@/lib/growth/duracaoRewards'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CANONICAL = `${BASE}${DURACAO_REWARDS_PATH}`
const MINUTE = wordsForOneMinute()
const BRISK = REWARDS_RATE_BASE.classic
const CALM = REWARDS_RATE_BASE.hollywood
const S = REWARDS_SOURCES

const TITLE = 'TikTok Creator Rewards Length Checker: Is Your Script 1 Minute?'
const DESCRIPTION = `Paste a script to see how long it runs as narration and how many words you need for 1 minute, the TikTok Creator Rewards minimum (${MINUTE.calm}–${MINUTE.brisk} words). Free, runs in your browser, with the official sources.`

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: `${TITLE} | Kineo`,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo TikTok Creator Rewards length checker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: `Is your script long enough for a 1-minute TikTok? ${MINUTE.calm}–${MINUTE.brisk} words of narration. Check yours free.`,
  },
}

// Linhas da tabela: o que cada fonte oficial diz, com a data da consulta. Lidas de REWARDS_SOURCES (uma fonte só).
const PLATFORMS: { platform: string; rule: string; sources: { name: string; url: string; updated: string | null }[] }[] = [
  {
    platform: 'TikTok Creator Rewards Program',
    rule: `At least 1 minute. The US terms say ${S.tiktokTermsUs.says}; the EEA terms say ${S.tiktokTermsEea.says}.`,
    sources: [S.tiktokTermsUs, S.tiktokTermsEea],
  },
  {
    platform: 'YouTube Shorts',
    rule: 'Up to 3 minutes. Square or vertical videos "up to three minutes" uploaded on or after October 15, 2024 count as Shorts. Shorts over 1 minute with an active Content ID claim are blocked.',
    sources: [S.youtubeShorts],
  },
  {
    platform: 'Instagram Reels',
    rule: 'Up to 20 minutes to record and edit, but "Reels over 3 minutes won\'t be recommended to new audiences."',
    sources: [S.instagramReels],
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How long does a TikTok video need to be for the Creator Rewards Program?',
    a: `At least 1 minute. TikTok's Creator Rewards Program Terms (US, last updated ${S.tiktokTermsUs.updated}) say ${S.tiktokTermsUs.says}, and the EEA terms say ${S.tiktokTermsEea.says}. TikTok's ${S.tiktokNewsroom.updated} launch announcement described it as content "over a minute long", so leave a few seconds of margin. Length is only one of the program's requirements, and TikTok decides which videos earn.`,
  },
  {
    q: 'How many words is a 1-minute script?',
    a: `About ${MINUTE.calm} words at a calm, cinematic pace of ${CALM} words per second, and ${MINUTE.brisk} words at a brisk ${BRISK} words per second — the two narration rates Kineo plans videos with. Most narration lands between the two. Headings, [bracketed directions] and production notes do not count, because they are not spoken.`,
  },
  {
    q: 'Does a 1-minute video automatically earn money on TikTok?',
    a: 'No. Length is one requirement among several: TikTok also sets account requirements and content rules, such as originality, and it decides which videos earn rewards. This checker only answers the length question.',
  },
  {
    q: 'Can I post the same 1-minute video to YouTube Shorts and Instagram Reels?',
    a: 'Length-wise, yes, as long as it stays at 3 minutes or less. YouTube counts square or vertical videos up to three minutes (uploaded on or after October 15, 2024) as Shorts, and Instagram says reels over 3 minutes will not be recommended to new audiences. One catch: YouTube blocks Shorts longer than 1 minute that have an active Content ID claim, so use music you have the rights to.',
  },
  {
    q: 'Is my script uploaded when I use this checker?',
    a: 'No. The word count and the timing run in your browser, and your script is not sent anywhere while you check. It leaves this page only if you choose to open it in Kineo Studio.',
  },
]

const PAGE_CSS = `
.drw{position:relative;z-index:1;min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-sans),Arial,sans-serif}
.drw-shell{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:22px 0 72px}
.drw-nav{display:flex;align-items:center;justify-content:space-between;gap:16px}
.drw-logo{color:var(--text);font-size:1.06rem;font-weight:800;text-decoration:none;letter-spacing:-.02em}
.drw-all{color:var(--muted);font-size:.86rem;font-weight:700;text-decoration:none}
.drw-all:hover,.drw-logo:hover{color:var(--accent)}
.drw-hero{max-width:820px;margin:52px auto 28px;text-align:center}
.drw-eyebrow{margin:0;color:var(--accent);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.drw-hero h1{margin:14px 0 0;font-size:clamp(2rem,5.6vw,3.5rem);line-height:1.05;letter-spacing:-.045em;font-weight:800;overflow-wrap:break-word}
.drw-answer{max-width:740px;margin:22px auto 0;padding:16px 18px;border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:14px;background:var(--card);color:var(--text2);font-size:1.02rem;line-height:1.62;text-align:left;box-shadow:var(--sh-card)}
.drw-answer strong{color:var(--text)}
.drw-answer small{display:block;margin-top:8px;color:var(--muted);font-size:.78rem;line-height:1.5}
.drw-answer a,.drw-sources a,.drw-table a,.drw-more a{color:var(--accent);text-underline-offset:3px}
.drw-tool{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.drw-card{border:1px solid var(--border);border-radius:20px;background:var(--card);padding:22px;box-shadow:var(--sh-card);min-width:0}
.drw-editor-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.drw-editor-head label{font-size:.9rem;font-weight:800}
.drw-editor-head span{color:var(--muted);font-size:.74rem;font-variant-numeric:tabular-nums}
.drw-editor textarea{display:block;width:100%;margin-top:10px;min-height:270px;resize:vertical;border:1px solid var(--border2);border-radius:12px;background:var(--bg);color:var(--text);padding:14px;font:inherit;font-size:16px;line-height:1.55}
.drw-editor textarea::placeholder{color:var(--muted2);opacity:1}
.drw-editor textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.drw-examples{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
.drw-examples span{color:var(--muted);font-size:.76rem;font-weight:700}
.drw-examples button{min-height:36px;border:1px solid var(--border);border-radius:999px;background:var(--card2);color:var(--text2);padding:7px 12px;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}
.drw-examples button:hover{border-color:var(--accent);color:var(--accent)}
.drw-examples .drw-clear{background:transparent;color:var(--muted)}
.drw-privacy,.drw-caveat{margin:12px 0 0;color:var(--muted);font-size:.74rem;line-height:1.5}
.drw-empty{display:grid;place-items:center;min-height:300px;text-align:center;color:var(--muted)}
.drw-empty p:not(.drw-clock){max-width:340px;margin:10px auto 0;font-size:.88rem;line-height:1.55}
.drw-clock{margin:0;font-variant-numeric:tabular-nums;font-size:clamp(2.2rem,5vw,3.2rem);line-height:1;font-weight:800;letter-spacing:-.05em;color:var(--text)}
.drw-verdict{padding:16px 18px;border:1px solid var(--border);border-radius:14px;background:var(--card2)}
.drw-verdict h2{margin:0;font-size:1.18rem;line-height:1.3}
.drw-verdict p{margin:6px 0 0;color:var(--text2);font-size:.88rem;line-height:1.55}
.drw-verdict.is-ok{border-color:var(--success)}.drw-verdict.is-ok h2{color:var(--success)}
.drw-verdict.is-info{border-color:var(--accent)}.drw-verdict.is-info h2{color:var(--accent)}
.drw-verdict.is-warn{border-color:var(--warning)}.drw-verdict.is-warn h2{color:var(--warning)}
.drw-voices{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.drw-voice{padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--bg);min-width:0}
.drw-voice p{margin:0}
.drw-voice-name{font-size:.78rem;font-weight:800;color:var(--text2)}
.drw-voice .drw-clock{margin-top:8px;font-size:clamp(1.8rem,4vw,2.4rem)}
.drw-voice-rate{margin-top:6px!important;color:var(--muted);font-size:.72rem;line-height:1.4}
.drw-voice-verdict{margin-top:8px!important;font-size:.82rem;font-weight:800}
.drw-voice.is-ok .drw-voice-verdict{color:var(--success)}
.drw-voice.is-short .drw-voice-verdict{color:var(--warning)}
.drw-bar{height:6px;margin-top:10px;border-radius:99px;background:var(--card2);overflow:hidden}
.drw-bar span{display:block;height:100%;border-radius:inherit;background:var(--accent);transition:width var(--dur-base,.25s) ease}
.drw-voice.is-ok .drw-bar span{background:var(--success)}
.drw-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.drw-metrics p{margin:0;padding:12px 8px;border:1px solid var(--border);border-radius:12px;background:var(--bg);text-align:center}
.drw-metrics strong{display:block;font-size:1.02rem;font-variant-numeric:tabular-nums}
.drw-metrics span{display:block;margin-top:4px;color:var(--muted);font-size:.66rem;line-height:1.3}
.drw-note{margin:10px 0 0;padding:10px 12px;border:1px solid var(--warning);border-radius:12px;color:var(--text2);font-size:.8rem;line-height:1.5}
.drw-spoken{margin-top:10px;border:1px solid var(--border);border-radius:12px;background:var(--bg);padding:10px 12px}
.drw-spoken summary{cursor:pointer;color:var(--accent);font-size:.78rem;font-weight:800}
.drw-spoken p{margin:10px 0 0;color:var(--text2);font-size:.8rem;line-height:1.55;max-height:160px;overflow:auto;overflow-wrap:anywhere}
.drw-next{margin-top:14px;padding:16px;border:1px solid var(--border2);border-radius:14px;background:var(--accent-soft)}
.drw-next h3{margin:6px 0 0;font-size:1.02rem;line-height:1.4}
.drw-next p:not(.drw-eyebrow){margin:6px 0 0;color:var(--text2);font-size:.8rem;line-height:1.5}
.drw-cta,.drw-cta-alt{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:12px;border-radius:12px;padding:12px 18px;font-size:.9rem;font-weight:800;text-decoration:none;text-align:center}
.drw-cta{background:var(--indigo);color:var(--on-accent);box-shadow:var(--sh-cta)}
.drw-cta-alt{border:1px solid var(--border2);background:var(--card);color:var(--text)}
.drw-section{margin-top:44px}
.drw-section>h2{margin:8px 0 0;font-size:clamp(1.4rem,3vw,2rem);letter-spacing:-.03em;line-height:1.2}
.drw-section>p:not(.drw-eyebrow){margin:12px 0 0;color:var(--text2);line-height:1.65;max-width:820px}
.drw-method{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}
.drw-method article{padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
.drw-method h3{margin:0;font-size:1rem}
.drw-method p{margin:8px 0 0;color:var(--text2);font-size:.88rem;line-height:1.6}
.drw-table{width:100%;margin-top:16px;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--card)}
.drw-table th,.drw-table td{padding:14px 16px;text-align:left;vertical-align:top;font-size:.88rem;line-height:1.55;border-bottom:1px solid var(--border)}
.drw-table thead th{background:var(--card2);color:var(--muted);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
.drw-table tbody tr:last-child th,.drw-table tbody tr:last-child td{border-bottom:0}
.drw-table tbody th{font-weight:800;width:22%}
.drw-table td{color:var(--text2)}
.drw-table td small{display:block;color:var(--muted);font-size:.74rem;margin-top:4px}
.drw-faq article{border-top:1px solid var(--border);padding:16px 0}
.drw-faq article:first-of-type{margin-top:12px}
.drw-faq h3{margin:0;font-size:1rem}
.drw-faq article p{margin:7px 0 0;color:var(--text2);font-size:.9rem;line-height:1.6}
.drw-final{margin-top:44px;padding:26px;border:1px solid var(--border2);border-radius:20px;background:var(--accent-soft);text-align:center}
.drw-final h2{margin:8px auto 0;max-width:720px;font-size:clamp(1.3rem,3vw,1.9rem);line-height:1.25;letter-spacing:-.03em}
.drw-final p:not(.drw-eyebrow){margin:10px auto 0;max-width:620px;color:var(--text2);font-size:.9rem;line-height:1.6}
.drw-final .drw-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:6px}
.drw-sources{margin-top:28px;color:var(--muted);font-size:.8rem;line-height:1.6}
.drw-sources ul{margin:8px 0 0;padding-left:18px}
.drw-more{margin-top:22px;color:var(--muted);font-size:.86rem;line-height:1.8}
.drw-more ul{margin:6px 0 0;padding-left:18px}
.drw :is(a,button,summary,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:860px){.drw-tool,.drw-method{grid-template-columns:1fr}}
@media(max-width:640px){
.drw-shell{width:calc(100% - 32px);padding-bottom:48px}
.drw-hero{margin:36px auto 22px;text-align:left}
.drw-answer{font-size:.96rem}
.drw-card{padding:16px;border-radius:16px}
.drw-editor textarea{min-height:220px}
.drw-cta,.drw-cta-alt{display:flex;width:100%}
.drw-metrics{grid-template-columns:1fr}
.drw-metrics p{display:flex;align-items:baseline;justify-content:space-between;gap:10px;text-align:left}
.drw-metrics span{margin-top:0;font-size:.74rem}
.drw-table,.drw-table thead,.drw-table tbody,.drw-table tr,.drw-table th,.drw-table td{display:block;width:100%}
.drw-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.drw-table tbody th{width:100%;padding-bottom:4px;border-bottom:0}
.drw-table tbody tr{border-bottom:1px solid var(--border)}
.drw-table tbody tr:last-child{border-bottom:0}
.drw-table td{padding-top:4px}
.drw-final{padding:20px 16px}
}
@media(max-width:380px){.drw-voices{grid-template-columns:1fr}}
`

export default function TikTokCreatorRewardsLengthCheckerPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  }
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kineo TikTok Creator Rewards Length Checker',
    url: CANONICAL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: `Estimates how long a script runs as narration and how many words it needs to reach 1 minute, the TikTok Creator Rewards minimum (sources checked ${REWARDS_SOURCES_CHECKED}).`,
  }

  return (
    <main className="drw">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, '\\u003c') }} />
      <div className="drw-shell">
        <nav className="drw-nav" aria-label="Primary">
          <Link href="/" className="drw-logo">Kineo</Link>
          <Link href="/tools" className="drw-all">All free tools →</Link>
        </nav>

        <header className="drw-hero">
          <p className="drw-eyebrow">Free length checker · runs in your browser</p>
          <h1>Is your script long enough for TikTok Creator Rewards?</h1>
          <p className="drw-answer" id="short-answer">
            <strong>Short answer:</strong> TikTok&apos;s Creator Rewards Program only rewards videos that are at least 1 minute
            long. As narration, that is about <strong>{MINUTE.calm} words</strong> at a calm {CALM} words per second, or{' '}
            <strong>{MINUTE.brisk} words</strong> at a brisk {BRISK} words per second.
            <small>
              Source:{' '}
              <a href={S.tiktokTermsUs.url} rel="noopener noreferrer" target="_blank">{S.tiktokTermsUs.name}</a>, last updated{' '}
              {S.tiktokTermsUs.updated} · checked {REWARDS_SOURCES_CHECKED}. Length is one requirement among several; TikTok
              decides which videos earn.
            </small>
          </p>
        </header>

        <RewardsLengthClient />

        <section className="drw-section" aria-labelledby="drw-method-title">
          <p className="drw-eyebrow">How the estimate works</p>
          <h2 id="drw-method-title">It times what will be spoken, at two real narration paces.</h2>
          <div className="drw-method">
            <article>
              <h3>Only the narration counts</h3>
              <p>Headings such as HOOK or PAYOFF, [bracketed directions], bullet notes and ALL-CAPS labels are treated as production notes, not speech — the same parser Kineo Studio uses for scripts it narrates word for word.</p>
            </article>
            <article>
              <h3>Two paces, not one guess</h3>
              <p>Kineo plans narration at {BRISK} words per second (brisk) and {CALM} (calm, cinematic). The brisk pace is the stricter check: if your script reaches 1:00 there, it reaches 1:00 at any slower pace.</p>
            </article>
            <article>
              <h3>An estimate, with margin</h3>
              <p>Voices, punctuation and pauses change the final length, and TikTok&apos;s launch announcement spoke of videos &quot;over a minute long&quot;. Aim a few seconds past 1:00 and check the length TikTok shows when you upload.</p>
            </article>
          </div>
        </section>

        <section className="drw-section" aria-labelledby="drw-platforms-title">
          <p className="drw-eyebrow">Official length rules · checked {REWARDS_SOURCES_CHECKED}</p>
          <h2 id="drw-platforms-title">How long should the video be on each platform?</h2>
          <p>
            A vertical video between 1:00 and 3:00 meets TikTok&apos;s Creator Rewards minimum, still counts as a YouTube Short,
            and stays inside the 3 minutes Instagram uses as its cut-off for recommending reels to new audiences.
          </p>
          <table className="drw-table">
            <thead>
              <tr>
                <th scope="col">Platform</th>
                <th scope="col">What the official source says</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((row) => (
                <tr key={row.platform}>
                  <th scope="row">{row.platform}</th>
                  <td>{row.rule}</td>
                  <td>
                    {row.sources.map((src) => (
                      <span key={src.url} style={{ display: 'block' }}>
                        <a href={src.url} rel="noopener noreferrer" target="_blank">{src.name}</a>
                        <small>
                          {src.updated ? `Last updated ${src.updated} · ` : ''}checked {REWARDS_SOURCES_CHECKED}
                        </small>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="drw-section drw-faq" aria-labelledby="drw-faq-title">
          <p className="drw-eyebrow">Questions</p>
          <h2 id="drw-faq-title">TikTok video length, answered plainly</h2>
          {FAQ.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </section>

        <section className="drw-final" aria-labelledby="drw-final-title">
          <p className="drw-eyebrow">No script yet?</p>
          <h2 id="drw-final-title">Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.</h2>
          <p>Kineo Studio opens with the 60-second length selected. Nothing is generated until you press Generate, and you see the cost first.</p>
          <div className="drw-actions">
            <RewardsStudioCta script="" placement="final" className="drw-cta">
              Start from one sentence →
            </RewardsStudioCta>
            <a href="#checker" className="drw-cta-alt">Check a script first ↑</a>
          </div>
        </section>

        <section className="drw-sources" aria-labelledby="drw-sources-title">
          <h2 id="drw-sources-title" style={{ fontSize: '.86rem', margin: 0, color: 'var(--text2)' }}>Sources (checked {REWARDS_SOURCES_CHECKED})</h2>
          <ul>
            {Object.values(S).map((src) => (
              <li key={src.url}>
                <a href={src.url} rel="noopener noreferrer" target="_blank">{src.name}</a>
                {src.updated ? ` (${src.updated})` : ''}: {src.says}.
              </li>
            ))}
          </ul>
          <p style={{ margin: '10px 0 0' }}>
            Kineo is an independent tool and is not affiliated with TikTok, YouTube or Instagram. Platform rules change; check the
            official pages before you rely on them.
          </p>
        </section>

        <nav className="drw-more" aria-label="Related guides">
          <strong style={{ color: 'var(--text2)' }}>Keep reading</strong>
          <ul>
            <li><Link href="/tiktok-creator-rewards-videos">Making 1-minute videos for TikTok Creator Rewards</Link></li>
            <li><Link href="/tiktok-vs-youtube-shorts-monetization">TikTok vs YouTube Shorts: which pays more</Link></li>
            <li><Link href="/youtube-shorts-script-timer">YouTube Shorts script timer</Link></li>
          </ul>
        </nav>
      </div>
      <Footer showStats={false} />
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
