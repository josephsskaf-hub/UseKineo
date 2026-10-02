// KINEO-NUVEM-A1-2026-10-02 — porta pública e indexável do Espaços (Spaces). O produto está aberto desde 30/09
// (SPACES_PUBLIC=true), mas /spaces mora em (dashboard) — noindex e 404 para quem está deslogado —, então quem chega
// procurando "virtual staging" não achava nada. Esta página é a vitrine: os 3 pares antes → depois da casa
// (lib/showcase.ts SHOWCASE_MEDIA.spaces — fotos reais de um andar vazio, SEM marca de terceiros), o preço honesto em
// créditos (a soma das etapas que já cobram: foto pronta Nano Banana Pro + clipe Kling 2.5 por foto) e o caminho para
// criar. Nenhum número digitado: PRODUCAO_IMAGE_CREDITS (espelho guardado do custo do Nano Banana Pro no
// /api/images/generate), clipCreditCost('kling', 5) e SPACE_MAX_PHOTOS. Selo honesto: ilustração feita com IA.
import type { Metadata } from 'next'
import { ProductDoor, DoorFaq, DoorSteps } from '@/components/ProductDoor'
import { SHOWCASE_MEDIA } from '@/lib/showcase'
import { SPACE_MAX_PHOTOS, SPACES_PUBLIC } from '@/lib/spaces/spaces'
import { PRODUCAO_IMAGE_CREDITS } from '@/lib/ads/producao'
import { clipCreditCost } from '@/lib/clips/clipPricing'

export const dynamic = 'force-static'

const SPACES_DOOR_PATH = '/ai-virtual-staging-video'
const TITLE = 'AI virtual staging video — empty space to finished business'
const DESCRIPTION =
  'Photograph an empty floor, say what goes inside — a café, a store, an office or a home — and get it finished in photos and in a before → after video, with the same camera and structure.'

export const metadata: Metadata = {
  title: `${TITLE} | Kineo Spaces`,
  description: DESCRIPTION,
  alternates: { canonical: SPACES_DOOR_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: SPACES_DOOR_PATH, type: 'website', images: [{ url: SHOWCASE_MEDIA.spaces[0].after ?? SHOWCASE_MEDIA.spaces[0].poster }] },
  // Fechado (SPACES_PUBLIC=false), a porta não vende o que a conta não abre.
  ...(SPACES_PUBLIC ? {} : { robots: { index: false, follow: true } }),
}

const PHOTO_CREDITS = PRODUCAO_IMAGE_CREDITS
const CLIP_CREDITS = clipCreditCost('kling', 5)
const PER_PHOTO = PHOTO_CREDITS + CLIP_CREDITS
const START_HREF = '/signup?redirect=%2Fspaces'
const PAIR_CAPTIONS = ['Empty floor → coffee shop', 'Empty floor → sneaker store', 'Empty floor → coworking']

const STEPS = [
  { title: 'Photograph it', body: `Up to ${SPACE_MAX_PHOTOS} vertical photos of the empty space, or a short video walking through it — Kineo takes the frames.` },
  { title: 'Say what goes inside', body: 'A café, a store, an office or an apartment — or a style. Kineo searches the web for how that kind of space really looks and writes a design brief you can edit.' },
  { title: 'See it finished', body: `Each photo comes back finished from the same camera position: walls, columns and windows stay where they are. ${PHOTO_CREDITS} credits per photo; redo any one.` },
  { title: 'Get the video', body: `Each finished photo becomes a ${5}-second clip, and Kineo edits a before → after video with your name at the end. ${CLIP_CREDITS} credits per clip.` },
]

export default function SpacesDoorPage() {
  const pairs = SHOWCASE_MEDIA.spaces
  return (
    <ProductDoor product="Spaces">
      <header className="pd-hero">
        <p className="pd-eyebrow">KINEO SPACES · AI VIRTUAL STAGING</p>
        <h1>See an empty space as a finished business — in photos and a before → after video.</h1>
        <p className="pd-intro">{DESCRIPTION} Made for builders, landlords and brokers who need a tenant to picture the space before it exists.</p>
        <div className="pd-cta">
          <a href={START_HREF} className="go ok pd-go">Try Spaces <span aria-hidden="true">→</span></a>
          <a href="#spaces-price" className="pd-ghost">{PER_PHOTO} credits per photo, video included</a>
        </div>
      </header>

      <section className="pd-sec" aria-labelledby="spaces-examples">
        <h2 id="spaces-examples">Before → after</h2>
        <p className="pd-lede">Real photos of an empty floor, finished by Kineo Spaces with the same camera position. No brand is shown.</p>
        <ul className="pd-pairs">
          {pairs.map((p, i) => (
            <li className="pd-pair" key={p.id}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.before} alt={`Empty space before staging — example ${i + 1}`} loading="lazy" />
                <figcaption>BEFORE</figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.after} alt={`The same space finished by Kineo Spaces — ${PAIR_CAPTIONS[i] ?? 'example'}`} loading="lazy" />
                <figcaption>AFTER</figcaption>
              </figure>
              <p>{PAIR_CAPTIONS[i] ?? p.badge} · {p.badge}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pd-sec" aria-labelledby="spaces-how">
        <h2 id="spaces-how">How it works</h2>
        <DoorSteps steps={STEPS} />
      </section>

      <section className="pd-sec" aria-labelledby="spaces-price">
        <h2 id="spaces-price">Price, in credits</h2>
        <p className="pd-lede">No separate subscription: Spaces uses the same credits as every Kineo plan, and you see the cost before each click.</p>
        <ul className="pd-price">
          <li><span>Finished photo (Nano Banana Pro)</span><b>{PHOTO_CREDITS} credits</b></li>
          <li><span>5-second clip of each finished photo (Kling 2.5)</span><b>{CLIP_CREDITS} credits</b></li>
          <li><span>Editing the before → after video</span><b>Included</b></li>
          <li><span>A space with 3 photos, video included</span><b>{3 * PER_PHOTO} credits</b></li>
        </ul>
        <p className="pd-note"><a href="/pricing" className="pd-ghost">See the plans and what credits cost →</a></p>
        <p className="pd-honest">The finished space is an illustration made with AI. Showing how a kind of store could look in your space is fine; saying that a specific brand is coming, or crediting the design to someone who did not make it, is not — the video only signs &ldquo;Presented by&rdquo; you.</p>
      </section>

      <section className="pd-sec" aria-labelledby="spaces-faq">
        <h2 id="spaces-faq">Questions</h2>
        <DoorFaq
          items={[
            { q: 'Does the structure of my space change?', a: 'It should not. Every photo is generated from your own photo with a rule to keep the camera position, walls, columns, windows and ceiling in place. If a photo drifts, redo just that one.' },
            { q: 'Can I show a specific brand?', a: 'You can describe a style or a kind of store. The result is an illustration of how the space could look; the video does not claim any brand is there, and you only sign it as the person presenting it.' },
            { q: 'Do I need a separate plan?', a: <>No. Any Kineo plan&apos;s credits work. <a href="/pricing">See the plans</a>.</> },
            { q: 'What do I download?', a: 'The finished photos and a vertical before → after MP4 for Reels, TikTok, Shorts or a listing.' },
          ]}
        />
      </section>

      <section className="pd-sec" aria-label="Get started">
        <h2>Show the space before it exists.</h2>
        <div className="pd-cta"><a href={START_HREF} className="go ok pd-go">Try Spaces <span aria-hidden="true">→</span></a></div>
      </section>
    </ProductDoor>
  )
}
