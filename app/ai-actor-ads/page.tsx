// KINEO-NUVEM-A1-2026-10-02 — porta pública e indexável do "anúncio com atriz de IA / mascote da marca".
// Origem: em 01/10 uma empresa pediu logo + mascote consistente + depoimento com atriz de IA; o fundador fez à mão
// (~160 cr) e o fluxo virou a Produção do Ads (/ads/producao, lib/ads/producao.ts). Esta página explica o que a Produção
// faz e quanto cada etapa custa, com os números da própria Produção (PRODUCAO_IMAGE_CREDITS, PRODUCAO_TALK_ENGINES,
// montagem com PRODUCAO_MONTAGE_CHARGE_LIVE) e a menor tarifa de clipe (clipCreditCost). Os 3 vídeos são os anúncios
// da casa (lib/showcase.ts SHOWCASE_MEDIA.ads: a mesma pessoa fictícia em 3 looks).
//
// O BOTÃO É HONESTO COM O INTERRUPTOR: com PRODUCAO_PUBLIC=true ele abre /ads/producao (cadastro primeiro); fechado, a
// Produção responde 404 para quem não é da casa — então o botão principal vira "peça para a gente fazer"
// (/business-video-ads, Kineo Empresas) e a página diz que o self-service abre em breve. Nunca um link para uma porta
// fechada. Ética do formato: a pessoa é criada por IA e não pode ser apresentada como cliente real.
import type { Metadata } from 'next'
import { ProductDoor, DoorFaq, DoorSteps } from '@/components/ProductDoor'
import { SHOWCASE_MEDIA } from '@/lib/showcase'
import {
  PRODUCAO_IMAGE_CREDITS,
  PRODUCAO_MONTAGE_CHARGE_LIVE,
  PRODUCAO_MONTAGE_CREDITS,
  PRODUCAO_PUBLIC,
  PRODUCAO_TALK_ENGINES,
} from '@/lib/ads/producao'
import { CLIP_MIN_CREDITS } from '@/lib/clips/clipPricing'

export const dynamic = 'force-static'

const ACTOR_DOOR_PATH = '/ai-actor-ads'
const PRODUCAO_HREF = '/signup?redirect=%2Fads%2Fproducao'
const DFY_HREF = '/business-video-ads'
const TITLE = 'Video ads with an AI actor or your brand mascot'
const DESCRIPTION =
  'One consistent AI actor or brand mascot across every shot of your ad: preview the scenes as images, bring them to life as clips or talking-to-camera shots, and finish on your logo.'

export const metadata: Metadata = {
  title: `${TITLE} | Kineo Studio Ads`,
  description: DESCRIPTION,
  alternates: { canonical: ACTOR_DOOR_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: ACTOR_DOOR_PATH, type: 'website', images: [{ url: SHOWCASE_MEDIA.ads[0].poster }] },
}

const TALK_FROM = Math.min(...PRODUCAO_TALK_ENGINES.map((e) => e.credits))
const STEPS = [
  { title: 'Your character', body: `Create an actor or a mascot with AI (${PRODUCAO_IMAGE_CREDITS} credits), or start from a photo you have the right to use. The same face, hair and outfit go into every shot.` },
  { title: 'Plan the shots', body: 'Pick a template — testimonial, mascot or app demo — and Kineo proposes 3 to 5 shots you can edit. Planning is free.' },
  { title: 'Preview as images', body: `Each shot is shown as an image first (${PRODUCAO_IMAGE_CREDITS} credits each), so you approve the look before any video is made.` },
  { title: 'Bring it to life', body: `Each approved shot becomes a clip (from ${CLIP_MIN_CREDITS} credits) or the character talking to the camera (from ${TALK_FROM} credits), then Kineo assembles the ad and ends on your logo.` },
]

export default function ActorAdsDoorPage() {
  const open = PRODUCAO_PUBLIC
  return (
    <ProductDoor product="Studio Ads">
      <header className="pd-hero">
        <p className="pd-eyebrow">STUDIO ADS · PRODUCTION</p>
        <h1>Video ads with an AI actor or your brand mascot — the same face in every shot.</h1>
        <p className="pd-intro">{DESCRIPTION}</p>
        <div className="pd-cta">
          {open ? (
            <a href={PRODUCAO_HREF} className="go ok pd-go" data-kineo="actor-door-cta" data-cta="producao">Make my ad <span aria-hidden="true">→</span></a>
          ) : (
            <a href={DFY_HREF} className="go ok pd-go" data-kineo="actor-door-cta" data-cta="dfy">Have us make it <span aria-hidden="true">→</span></a>
          )}
          <a href="#actor-price" className="pd-ghost">What each step costs</a>
        </div>
        {open ? null : <p className="pd-note">Self-serve Production opens soon. Today, Kineo Empresas makes this ad for you from your brief.</p>}
      </header>

      <section className="pd-sec" aria-labelledby="actor-examples">
        <h2 id="actor-examples">Made on Kineo</h2>
        <p className="pd-lede">House ads: the same fictional person in three looks, made with Nano Banana Pro and Kling 2.5. Not a customer result.</p>
        <ul className="pd-videos">
          {SHOWCASE_MEDIA.ads.map((v, i) => (
            <li key={v.id}>
              <video src={v.video} poster={v.poster} muted loop playsInline controls preload="none" aria-label={`House ad example ${i + 1}`} />
              <p>{v.badge}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pd-sec" aria-labelledby="actor-how">
        <h2 id="actor-how">How it works</h2>
        <DoorSteps steps={STEPS} />
      </section>

      <section className="pd-sec" aria-labelledby="actor-price">
        <h2 id="actor-price">Price, step by step</h2>
        <p className="pd-lede">Every step shows its price before you click, in the same credits as the rest of Kineo.</p>
        <ul className="pd-price">
          <li><span>Character created with AI, or each preview image (Nano Banana Pro)</span><b>{PRODUCAO_IMAGE_CREDITS} credits</b></li>
          <li><span>Clip of a shot</span><b>from {CLIP_MIN_CREDITS} credits</b></li>
          {PRODUCAO_TALK_ENGINES.map((e) => <li key={e.key}><span>{e.label} — {e.model}</span><b>{e.credits} credits</b></li>)}
          <li><span>Assembly with your logo on the end card</span><b>{PRODUCAO_MONTAGE_CHARGE_LIVE ? `${PRODUCAO_MONTAGE_CREDITS} credits` : 'Included'}</b></li>
        </ul>
        <p className="pd-honest">The actor is created by AI. Don&apos;t present an AI actor as a real customer or a real testimonial — label it as a dramatization where the platform or the law asks for it, and only use facts about your product that are true.</p>
      </section>

      <section className="pd-sec" aria-labelledby="actor-faq">
        <h2 id="actor-faq">Questions</h2>
        <DoorFaq
          items={[
            { q: 'Will the character look the same in every shot?', a: 'Every shot is generated from the same character reference, and you approve each shot as an image before it becomes video — so a shot that drifts is caught before you pay for the clip.' },
            { q: 'Can the character talk?', a: `Yes. A talking-to-camera shot speaks the exact line you write, in a female or male voice, and needs at least about 12 seconds of speech. It starts at ${TALK_FROM} credits.` },
            { q: 'Can I use my brand mascot?', a: 'Yes — choose "Mascot" and describe it, or start from an image of your mascot that you own.' },
            { q: 'Does my logo go in?', a: 'Yes: the ad ends on a card with your logo, and your logo can sit in the corner of every Kineo video.' },
            { q: 'I would rather have it made for me.', a: <>That is <a href={DFY_HREF}>Kineo Empresas</a>: send the brief and a person produces the ad.</> },
          ]}
        />
      </section>

      <section className="pd-sec" aria-label="Get started">
        <h2>Your brand, with a face.</h2>
        <div className="pd-cta">
          {open
            ? <a href={PRODUCAO_HREF} className="go ok pd-go">Make my ad <span aria-hidden="true">→</span></a>
            : <a href={DFY_HREF} className="go ok pd-go">Have us make it <span aria-hidden="true">→</span></a>}
          <a href="/ads" className="pd-ghost">Or make an ad from your own photos →</a>
        </div>
      </section>
    </ProductDoor>
  )
}
