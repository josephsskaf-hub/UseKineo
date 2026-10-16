// KINEO-PACOTE-3-FILMES-1610 — /done-for-you: "We make 3 short films for you — US$19, one-time."
// Só para quem está logado (sem sessão → /signup?redirect=/done-for-you, e a pessoa volta para cá). Assinante vê a
// porta do Studio em vez do formulário (o plano dele já faz esses filmes). Números e promessas: lib/dfyFilms3.ts.
// Exemplos: só os filmes da vitrine que já são públicos (lib/ui/examplesSelectionSep24 — previews do repositório).
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EXAMPLES_SELECTION_SEP24 } from '@/lib/ui/examplesSelectionSep24'
import {
  DFY_FILMS3_DELIVERY_HOURS,
  DFY_FILMS3_FILMS,
  DFY_FILMS3_FILM_SECONDS,
  DFY_FILMS3_GUARANTEE,
  DFY_FILMS3_LANGUAGES,
  DFY_FILMS3_STYLE_MAX,
  DFY_FILMS3_TOPIC_MAX,
  dfyFilms3Eligible,
  dfyFilms3PriceLabel,
} from '@/lib/dfyFilms3'
import DoneForYouForm from './DoneForYouForm'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata: Metadata = {
  title: '3 films made for you | Kineo',
  description: `We make ${DFY_FILMS3_FILMS} short films for you — ${dfyFilms3PriceLabel()}, one-time.`,
  robots: { index: false, follow: false },
}

const wrap = { maxWidth: 760, margin: '0 auto', padding: '40px 16px 64px', color: 'var(--text)' } as const
const card = { border: '1px solid var(--border)', borderRadius: 16, padding: '20px 18px', background: 'var(--card)', marginTop: 20 } as const
const muted = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 } as const

function one(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : ''
}

export default async function DoneForYouPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/signup?redirect=${encodeURIComponent('/done-for-you')}`)

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
  const eligible = dfyFilms3Eligible(profile)
  const price = dfyFilms3PriceLabel()
  const paid = one(searchParams.paid) === '1'
  const cancelled = one(searchParams.checkout) === 'cancelled'
  const checkoutError = one(searchParams.checkout_error).slice(0, 160)
  const examples = EXAMPLES_SELECTION_SEP24.filter((v) => v.badge === 'SEEDANCE 1.5').slice(0, 3)

  return (
    <main style={wrap} data-kineo="done-for-you">
      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', margin: 0 }}>DONE FOR YOU</p>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.15, margin: '8px 0 10px', fontWeight: 800 }}>
        We make {DFY_FILMS3_FILMS} short films for you — {price}, one-time.
      </h1>
      <p style={muted} lang="pt">Fazemos {DFY_FILMS3_FILMS} filmes curtos para você — {price}, pagamento único.</p>
      <p style={{ ...muted, marginTop: 0 }} lang="es">Hacemos {DFY_FILMS3_FILMS} películas cortas para ti — {price}, pago único.</p>

      {paid && (
        <div role="status" style={{ ...card, borderColor: 'var(--accent, #2997ff)' }} data-testid="dfy-paid">
          <strong>Payment received. We are on it.</strong>
          <p style={muted}>Your {DFY_FILMS3_FILMS} films will be in your Library within {DFY_FILMS3_DELIVERY_HOURS} hours. We will email you when they are there.</p>
        </div>
      )}
      {cancelled && !paid && <p role="status" style={{ ...muted, marginTop: 16 }}>Checkout cancelled. Nothing was charged.</p>}
      {checkoutError && !paid && <p role="alert" style={{ color: 'var(--danger, #d43b3b)', marginTop: 16 }}>{checkoutError}</p>}

      <section style={card} aria-labelledby="dfy-how">
        <h2 id="dfy-how" style={{ fontSize: 18, margin: '0 0 8px' }}>How it works</h2>
        <ol style={{ ...muted, paddingLeft: 20, margin: 0 }}>
          <li>Write the topic, pick the language of the narration and, if you like, a style.</li>
          <li>Pay {price} once.</li>
          <li>Our team makes {DFY_FILMS3_FILMS} films of about {DFY_FILMS3_FILM_SECONDS} seconds each and puts them in your Library within {DFY_FILMS3_DELIVERY_HOURS} hours.</li>
        </ol>
        <p style={{ ...muted, marginTop: 12 }}><strong>Not included:</strong> a subscription. This is a single payment — nothing renews.</p>
        <p style={{ ...muted, marginTop: 4 }} data-testid="dfy-guarantee">{DFY_FILMS3_GUARANTEE}</p>
      </section>

      {examples.length > 0 && (
        <section style={{ marginTop: 28 }} aria-labelledby="dfy-examples">
          <h2 id="dfy-examples" style={{ fontSize: 18, margin: '0 0 12px' }}>Films made with Kineo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {examples.map((v) => (
              <figure key={v.id} style={{ margin: 0 }}>
                <video src={v.videoUrl} poster={v.posterUrl} preload="none" muted playsInline controls style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 12, background: '#000' }} />
                <figcaption style={{ ...muted, fontSize: 13, marginTop: 6 }}>{v.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section style={card} aria-labelledby="dfy-order">
        <h2 id="dfy-order" style={{ fontSize: 18, margin: '0 0 12px' }}>Your films</h2>
        {eligible ? (
          <DoneForYouForm
            price={price}
            languages={DFY_FILMS3_LANGUAGES.map((l) => ({ ...l }))}
            topicMax={DFY_FILMS3_TOPIC_MAX}
            styleMax={DFY_FILMS3_STYLE_MAX}
          />
        ) : (
          <p style={muted} data-testid="dfy-subscriber">
            You already have a plan: your credits make these films in the Studio. <a href="/studio" style={{ color: 'var(--accent, #2997ff)' }}>Open the Studio</a>
          </p>
        )}
      </section>
    </main>
  )
}
