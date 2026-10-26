import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildShowcaseSchema, showcasePath, type ShowcaseFilm, type ShowcaseLocale } from '@/lib/madeWithKineo'
import { getShowcaseFilm, getShowcaseFilms } from '@/lib/madeWithKineoServer'
import { SHOWCASE_COPY, showcaseCreateHref, showcaseProductionLine } from '@/lib/madeWithKineoCopy'
import styles from '@/app/made-with-kineo/showcase.module.css'

const BASE = 'https://www.usekineo.com'
function alternates(locale: ShowcaseLocale, slug?: string) {
  return { canonical: `${BASE}${showcasePath(locale, slug)}`, languages: {
    en: `${BASE}${showcasePath('en', slug)}`, pt: `${BASE}${showcasePath('pt', slug)}`,
    es: `${BASE}${showcasePath('es', slug)}`, 'x-default': `${BASE}${showcasePath('en', slug)}`,
  } }
}
export function showcaseMetadata(locale: ShowcaseLocale): Metadata {
  const copy = SHOWCASE_COPY[locale]
  return { title: `${copy.title} | Kineo`, description: copy.intro, alternates: alternates(locale), robots: { index: true, follow: true } }
}
export async function showcaseFilmMetadata(slug: string, locale: ShowcaseLocale): Promise<Metadata> {
  const film = await getShowcaseFilm(slug)
  if (!film) return { title: 'Kineo', robots: { index: false, follow: false } }
  return { title: `${film.title} | ${SHOWCASE_COPY[locale].title}`, description: film.theme,
    alternates: alternates(locale, film.slug), robots: { index: true, follow: true },
    openGraph: { type: 'video.other', title: film.title, description: film.theme,
      url: `${BASE}${showcasePath(locale, film.slug)}`, images: [{ url: film.thumbnailUrl }],
      videos: [{ url: film.playbackUrl, type: 'video/mp4' }] },
  }
}
function Header({ locale, slug }: { locale: ShowcaseLocale; slug?: string }) {
  return <header className={styles.header}>
    <Link href="/" className={styles.brand}>Kineo<span>↗</span></Link>
    <nav aria-label="Languages" className={styles.languages}>{(['en', 'pt', 'es'] as const).map(lang =>
      <Link key={lang} href={showcasePath(lang, slug)} hrefLang={lang} lang={lang} aria-current={locale === lang ? 'page' : undefined}>{lang.toUpperCase()}</Link>)}</nav>
    <Link className={styles.headerCta} href={showcaseCreateHref(locale)}>{SHOWCASE_COPY[locale].cta} ↗</Link>
  </header>
}
function Facts({ film, locale }: { film: ShowcaseFilm; locale: ShowcaseLocale }) {
  const copy = SHOWCASE_COPY[locale]
  return <>
    {film.isInternal ? <p className={styles.internal}>{copy.internal}</p> : null}
    <dl className={styles.facts}>
      <div><dt>{copy.language}</dt><dd>{film.language ?? copy.unknown}</dd></div>
      <div><dt>{copy.engine}</dt><dd>{film.engine ?? copy.unknown}</dd></div>
    </dl>
    <p className={styles.production}>{showcaseProductionLine(film, locale)}</p>
  </>
}
export async function MadeWithKineoGallery({ locale, page = 1 }: { locale: ShowcaseLocale; page?: number }) {
  const { films, hasNext } = await getShowcaseFilms(page)
  const copy = SHOWCASE_COPY[locale]
  return <main className={styles.page} lang={locale}>
    <Header locale={locale} />
    <section className={styles.hero}><p className={styles.eyebrow}>{copy.eyebrow}</p><h1>{copy.title}<span>.</span></h1><p className={styles.intro}>{copy.intro}</p><Link className={styles.cta} href={showcaseCreateHref(locale)}>{copy.cta} ↗</Link></section>
    {films.length ? <section aria-label={copy.title} className={styles.grid}>{films.map(film => <article className={styles.card} key={film.slug}>
      <div className={styles.media}><video src={film.playbackUrl} poster={film.posterUrl ?? film.thumbnailUrl} controls playsInline preload="none" aria-label={film.title} /></div>
      <div className={styles.cardBody}><h2><Link href={showcasePath(locale, film.slug)}>{film.title} ↗</Link></h2><p className={styles.theme}><span>{copy.topic}: </span>{film.theme}</p><Facts film={film} locale={locale} /><Link className={styles.cardCta} href={showcaseCreateHref(locale)}>{copy.cta} ↗</Link></div>
    </article>)}</section> : <section className={styles.empty}><span aria-hidden="true">↗</span><h2>{copy.empty}</h2><p>{copy.emptyDetail}</p><Link href="/examples">{copy.examples} ↗</Link></section>}
    <nav className={styles.pagination} aria-label="Pagination">
      {page > 1 ? <Link href={`${showcasePath(locale)}?page=${page - 1}`}>← {copy.previous}</Link> : null}
      {hasNext ? <Link href={`${showcasePath(locale)}?page=${page + 1}`}>{copy.next} →</Link> : null}
    </nav>
    <footer className={styles.footer}><p>{copy.consent}</p><Link href="/examples">{copy.examples} ↗</Link></footer>
  </main>
}
export async function MadeWithKineoFilm({ locale, slug }: { locale: ShowcaseLocale; slug: string }) {
  const film = await getShowcaseFilm(slug)
  if (!film) notFound()
  const copy = SHOWCASE_COPY[locale]
  return <main className={styles.page} lang={locale}>
    <Header locale={locale} slug={slug} />
    <Link href={showcasePath(locale)} className={styles.back}>← {copy.back}</Link>
    <article className={styles.film}>
      <div className={styles.filmMedia}><video src={film.playbackUrl} poster={film.posterUrl ?? film.thumbnailUrl} controls playsInline preload="metadata" aria-label={film.title} /></div>
      <div className={styles.filmBody}><p className={styles.eyebrow}>{copy.title}</p><h1>{film.title}</h1><p className={styles.theme}><span>{copy.topic}: </span>{film.theme}</p><Facts film={film} locale={locale} /><Link href={showcaseCreateHref(locale)} className={styles.cta}>{copy.cta} ↗</Link><p className={styles.permission}>{copy.consent}</p></div>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildShowcaseSchema(film, locale)).replace(/</g, '\\u003c') }} />
  </main>
}

export function showcasePageNumber(raw: string | string[] | undefined): number {
  return typeof raw === 'string' && /^[1-9]\d{0,3}$/.test(raw) ? Math.min(Number(raw), 200) : 1
}
