// KINEO-NUVEM-A1-2026-10-02 — porta pública e indexável do Clips (/clips está aberto desde 29/09, CLIPS_PUBLIC=true, mas
// mora em (dashboard): noindex e 404 para quem está deslogado). É a porta de quem chega procurando o que os concorrentes
// vendem — um clipe de 5 a 15 s, texto ou foto → vídeo — com a TABELA DE PREÇO derivada da mesma função que a rota cobra
// (lib/clips/clipPricing.ts clipCreditCost) e das durações REAIS que cada motor faz (lib/clips/clipCatalog.ts
// offeredSecondsFor). Só entram motores que um cliente pode apertar hoje: fora da pausa (lib/engineLaunch.ts
// enginePaused) e, no Seedance 2.5, só depois do lançamento (S25_PUBLIC). Selo honesto: o nome é o motor real.
import type { Metadata } from 'next'
import { ProductDoor, DoorFaq, DoorSteps } from '@/components/ProductDoor'
import { CLIP_ENGINES, CLIP_ENGINE_ORDER, modesFor, offeredSecondsFor, type ClipEngineKey } from '@/lib/clips/clipCatalog'
import { CLIP_MIN_CREDITS, clipCreditCost } from '@/lib/clips/clipPricing'
import { CLIPS_PUBLIC } from '@/lib/clips/clipLaunch'
import { S25_PUBLIC, enginePaused } from '@/lib/engineLaunch'

export const dynamic = 'force-static'

const CLIPS_DOOR_PATH = '/ai-video-clip-generator'
const START_HREF = '/signup?redirect=%2Fclips'

/** Motores que um cliente pode usar hoje no /clips (a rota recusa o resto com a mesma régua). */
function publicClipEngines(): ClipEngineKey[] {
  return CLIP_ENGINE_ORDER.filter((key) => enginePaused(key) === null && (key !== 's25' || S25_PUBLIC))
}

const ROWS = publicClipEngines().map((key) => {
  const modes = modesFor(key)
  const seconds = offeredSecondsFor(key)
  return {
    key,
    label: CLIP_ENGINES[key].label,
    from: modes.includes('t2v') && modes.includes('i2v') ? 'Text or photo' : modes.includes('i2v') ? 'Photo only' : 'Text only',
    prices: seconds.map((s) => ({ s, credits: clipCreditCost(key, s) })),
  }
})
const CHEAPEST = Math.min(...ROWS.flatMap((r) => r.prices.map((p) => p.credits)))
const LONGEST = Math.max(...ROWS.flatMap((r) => r.prices.map((p) => p.s)))
const SHORTEST = Math.min(...ROWS.flatMap((r) => r.prices.map((p) => p.s)))

const TITLE = 'AI video clip generator — one scene, text or photo to video'
const DESCRIPTION = `Make one AI video clip of ${SHORTEST} to ${LONGEST} seconds from a sentence or a photo, on ${ROWS.length} video engines, from ${CHEAPEST} credits. The price per engine and length is on this page.`

export const metadata: Metadata = {
  title: `${TITLE} | Kineo Clips`,
  description: DESCRIPTION,
  alternates: { canonical: CLIPS_DOOR_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CLIPS_DOOR_PATH, type: 'website' },
  ...(CLIPS_PUBLIC ? {} : { robots: { index: false, follow: true } }),
}

const STEPS = [
  { title: 'Pick an engine', body: 'Each engine shows the lengths it really makes before you click — never "5 s" to deliver 6.' },
  { title: 'Type it or add a photo', body: 'Describe one scene, or start from your own photo: it becomes the first frame.' },
  { title: 'Choose length and format', body: 'Vertical, wide or square where the engine allows; with a photo, the format is the photo’s.' },
  { title: 'Download', body: 'The clip is saved to your Library as an MP4, usually in 1 to 5 minutes. A failed clip gives its credits back.' },
]

export default function ClipsDoorPage() {
  return (
    <ProductDoor product="Clips">
      <header className="pd-hero">
        <p className="pd-eyebrow">KINEO CLIPS · TEXT OR PHOTO TO VIDEO</p>
        <h1>One scene. {SHORTEST} to {LONGEST} seconds. {ROWS.length} video engines.</h1>
        <p className="pd-intro">{DESCRIPTION} No narration, no editing — just the shot, saved to your Library.</p>
        <div className="pd-cta">
          <a href={START_HREF} className="go ok pd-go">Make a clip <span aria-hidden="true">→</span></a>
          <a href="#clips-price" className="pd-ghost">See the price table</a>
        </div>
      </header>

      <section className="pd-sec" aria-labelledby="clips-price">
        <h2 id="clips-price">Price per clip, in credits</h2>
        <p className="pd-lede">The same numbers the clip maker charges. Every clip costs at least {CLIP_MIN_CREDITS} credits; a clip that fails gives its credits back.</p>
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead><tr><th scope="col">Engine</th><th scope="col">Starts from</th><th scope="col">Length → credits</th></tr></thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.key} data-engine={r.key}>
                  <td><b>{r.label}</b></td>
                  <td>{r.from}</td>
                  <td><div className="pd-chips">{r.prices.map((p) => <span key={p.s}>{p.s} s · {p.credits} cr</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pd-note">Credits come with every Kineo plan and work across films, ads, images and clips. <a href="/pricing" className="pd-ghost">See the plans →</a></p>
      </section>

      <section className="pd-sec" aria-labelledby="clips-how">
        <h2 id="clips-how">How it works</h2>
        <DoorSteps steps={STEPS} />
      </section>

      <section className="pd-sec" aria-labelledby="clips-faq">
        <h2 id="clips-faq">Questions</h2>
        <DoorFaq
          items={[
            { q: 'Is a clip a full video?', a: 'No — a clip is one scene with no narration. For a narrated short with several scenes, use the Studio; for an ad from your business photos, use Studio Ads.' },
            { q: 'Can I start from my own photo?', a: 'Yes, on the engines marked "Text or photo" or "Photo only". Your photo becomes the first frame, and you must have the right to use it.' },
            { q: 'What if a clip fails?', a: 'The credits for that clip go back to your balance automatically.' },
            { q: 'Which engine should I pick?', a: <>Start with the cheapest for drafts and move up for hero shots. The <a href="/models-pricing">engine price guide</a> compares the engines for full films.</> },
          ]}
        />
      </section>

      <section className="pd-sec" aria-label="Get started">
        <h2>Make the shot you need.</h2>
        <div className="pd-cta"><a href={START_HREF} className="go ok pd-go">Make a clip <span aria-hidden="true">→</span></a></div>
      </section>
    </ProductDoor>
  )
}
