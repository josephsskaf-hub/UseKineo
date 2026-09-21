// ═══ KINEO-MOTORES-16-LINGUAS-2026-09-21 — a página de motor nas 13 línguas que faltavam (T1 do plano da semana) ═══
//
// Por quê: /ai-video-generator/kineo-1 é a página que mais recebe chegada do ChatGPT (98 → 36 cadastros em 14 d) e
// os pagantes vêm de citações de MOTOR e de NICHO — não da pergunta genérica que o CapCut domina (pesquisa 21/09,
// 48 perguntas em 16 línguas, 0 citações). A página existia só em inglês. Esta é a MESMA página (mesma prova viva de
// renders reais do motor, mesmo formulário com a língua já escolhida, mesmos custos do catálogo), só a língua muda.
// Conteúdo em lib/seo/enginePageLangs.ts; hreflang cruzado com a inglesa; sitemap em app/sitemap.ts.
import type { Metadata } from 'next'
import styles from '@/app/localized-public.module.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import WallMedia from '@/components/WallMedia'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { getEngineRenders, getHouseEngineExamples } from '@/lib/engineWall'
import { TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'
import { STARTER_MONTH } from '@/lib/marketingPrice'
import { ENGINES } from '@/lib/growth/enginePageCatalog'
import { enginePaused } from '@/lib/engineLaunch'
import { FREE_SHORTS_LANG_BY_CODE } from '@/lib/seo/freeShortsGeneratorLangs'
import { ENGINE_LANGS, ENGINE_LANG_CODES, LOCALIZED_ENGINE_SLUGS, engineAlternates, type LocalizedEngineSlug } from '@/lib/seo/enginePageLangs'

const BASE = 'https://www.usekineo.com'
const CARD = { background: '#161618', border: '1px solid #2a2a2d' }

export const dynamicParams = false
export function generateStaticParams() {
  return LOCALIZED_ENGINE_SLUGS.flatMap((engine) => ENGINE_LANG_CODES.map((lang) => ({ engine, lang })))
}

function resolve(params: { engine: string; lang: string }) {
  const slug = LOCALIZED_ENGINE_SLUGS.find((s) => s === params.engine)
  const L = ENGINE_LANGS[params.lang as keyof typeof ENGINE_LANGS]
  const P = FREE_SHORTS_LANG_BY_CODE[params.lang]
  const e = slug ? ENGINES[slug] : undefined
  if (!slug || !L || !P || !e) return null
  const facts = { engine: e.name, credits: e.creditCost, trial: TRIAL_CREDITS_SHOWN }
  const covers = TRIAL_CREDITS_SHOWN >= e.creditCost
  return { slug, L, P, e, facts, covers, starter: STARTER_MONTH }
}

export function generateMetadata({ params }: { params: { engine: string; lang: string } }): Metadata {
  const r = resolve(params)
  if (!r) return {}
  const url = `${BASE}/ai-video-generator/${r.slug}/${params.lang}`
  const title = r.L.title(r.facts)
  const description = r.L.description(r.facts)
  return {
    metadataBase: new URL(BASE),
    title,
    description,
    alternates: { canonical: url, languages: engineAlternates(BASE, r.slug) },
    openGraph: { title, description, url, type: 'website', locale: r.P.locale },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function EngineLangPage({ params }: { params: { engine: string; lang: string } }) {
  const r = resolve(params)
  if (!r) notFound()
  const { slug, L, P, e, facts, covers, starter } = r
  const renders = await getEngineRenders(e.qualityMode, 8)
  const house = renders.length > 0 ? [] : getHouseEngineExamples(e.qualityMode, 6) // KINEO-GALERIA-DA-CASA-2026-09-21
  const campaign = `seo_engine_${slug}_${P.code}` // prefixo seo_ = atribuição orgânica
  const faq = L.faq({ ...facts, covers, starter })
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  }
  const pause = enginePaused(e.param)
  const h2: React.CSSProperties = { fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 12px' }
  const p: React.CSSProperties = { color: '#86868b', fontSize: '1rem', lineHeight: 1.65, margin: '0 auto 12px', maxWidth: 680 }

  return (
    <main lang={P.locale} dir={P.dir} className={styles.page} style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <section style={{ textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
            {e.name} · {e.creditCost} cr / 60 s
          </span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>{L.h1(facts)}</h1>
          <p style={{ ...p, fontSize: '1.08rem', marginTop: 14 }}>{L.lead(facts)}</p>
          {pause && (
            <p style={{ ...p, color: '#ffb454' }}>{e.name} — maintenance · <Link href={`/studio?engine=${pause.alternative.key}&intent_campaign=engine_paused`} style={{ color: '#ffb454', fontWeight: 700 }}>{pause.alternative.label} →</Link></p>
          )}
        </section>

        <TopicGeneratorForm
          campaign={campaign}
          source={campaign}
          formId={`engine-${slug}-${P.code}`}
          language={P.code}
          creationIntent={slug === 'kineo-1' ? 'fast' : 'trial_best'}
          examples={P.examples}
          copy={P.form}
        />

        {house.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <p style={{ margin: '0 0 4px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>{P.proof.eyebrow} · {e.name}</p>
            <p style={{ ...p, textAlign: 'center', fontSize: '0.9rem' }}>{P.proof.line}</p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {house.map((v) => (
                <div key={v.id} style={{ overflow: 'hidden', borderRadius: 14, ...CARD }}>
                  <div style={{ position: 'relative', aspectRatio: '9 / 16', overflow: 'hidden', background: '#000' }}>
                    <video src={v.videoUrl} poster={v.posterUrl} muted playsInline controls preload="none" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', left: 8, top: 8, zIndex: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', pointerEvents: 'none' }}>{v.badge}</span>
                  </div>
                  <p style={{ margin: 0, padding: '9px 10px', fontSize: '11.5px', fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>{v.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: 44 }}>
          <p style={{ ...p, fontSize: '1.02rem' }}>{L.about[slug](facts)}</p>
        </section>

        {renders.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 style={h2}>{L.proofTitle(facts)}</h2>
            <p style={{ ...p, textAlign: 'center', fontSize: '0.9rem' }}>{L.proofLine}</p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {renders.map((v) => (
                <Link key={v.id} href={`/v/${v.id}`} style={{ display: 'block', overflow: 'hidden', borderRadius: 14, ...CARD, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ position: 'relative', aspectRatio: '9 / 16', overflow: 'hidden', background: '#000' }}>
                    <WallMedia src={v.videoUrl} />
                    <span style={{ position: 'absolute', left: 8, top: 8, zIndex: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff' }}>{v.badge}</span>
                  </div>
                  <p style={{ margin: 0, padding: '9px 10px', fontSize: '11.5px', fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>{v.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>{L.howTitle}</h2>
          <ol className={styles.steps} style={{ ...p }}>
            {L.how.map((step) => <li key={step} style={{ marginBottom: 6 }}>{step}</li>)}
          </ol>
        </section>

        <section style={{ marginTop: 36 }}>
          <h2 style={h2}>{L.costTitle}</h2>
          <p style={{ ...p, textAlign: 'center' }}>{L.cost({ ...facts, covers, starter })}</p>
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>{P.faqTitle}</h2>
          {faq.map((item) => (
            <div key={item.q} style={{ background: '#131316', border: '1px solid #2a2a2d', borderRadius: 18, padding: '16px 18px', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px' }}>{item.q}</h3>
              <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{item.a}</p>
            </div>
          ))}
        </section>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.85rem' }}>
          <Link href={`/ai-video-generator/${slug}`} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>English →</Link>
          {' · '}
          <Link href={`/free-shorts-generator/${P.code}`} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{P.badge} →</Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}
