// KINEO-GALERIA-HOME-2710 — /made-with-kineo vira a galeria "Made with Kineo" do menu do topo (fundador 27/10: "uma seção no
// início onde a gente mostra todos os nossos clips, imagens, tudo junto" → item do topo com este nome exato). Em cima: o
// cabeçalho do site (par do topo da home, mesmo kit do /trending e /examples) e a galeria da casa — clipes, imagens e filmes
// narrados misturados (curadoria em lib/homeGaleria.ts). Embaixo, INTACTA na regra: a vitrine de filmes que os donos escolheram
// mostrar (KINEO-VITRINE-FILMES-2610 — só com consentimento, lida a cada visita; o estado vazio honesto continua). /pt e /es e
// as páginas de cada filme seguem com components/MadeWithKineo.tsx, sem mudança.
import Link from 'next/link'
import { showcaseMetadata, showcasePageNumber } from '@/components/MadeWithKineo'
import { getShowcaseFilms } from '@/lib/madeWithKineoServer' // KINEO-GALERIA-HOME-2710
import { showcasePath } from '@/lib/madeWithKineo' // KINEO-GALERIA-HOME-2710
import { SHOWCASE_COPY, showcaseCreateHref, showcaseProductionLine } from '@/lib/madeWithKineoCopy' // KINEO-GALERIA-HOME-2710
import { createClient } from '@/lib/supabase/server' // KINEO-GALERIA-HOME-2710
import { KineoBrandIcon } from '@/components/KineoBolt' // KINEO-GALERIA-HOME-2710
import { AppearanceSettingsButton } from '@/components/AppearanceSettings' // KINEO-GALERIA-HOME-2710
import { InterfaceLanguageSelect, UiLabel } from '@/components/InterfaceLanguage' // KINEO-GALERIA-HOME-2710
import NavUgcAdsLink from '@/components/NavUgcAdsLink' // KINEO-GALERIA-HOME-2710
import { MENU_CARTOON_HREF, MENU_CARTOON_LABEL, MENU_CARTOON_NAV_ITEM, MENU_CONNECTOR_HREF, MENU_CONNECTOR_LABEL, MENU_CONNECTOR_NAV_ITEM } from '@/lib/ui/homeRemodela2010' // KINEO-GALERIA-HOME-2710
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy' // KINEO-GALERIA-HOME-2710
import { MADE_WITH_KINEO_HREF, MADE_WITH_KINEO_LABEL, MADE_WITH_KINEO_NAV_ITEM } from '@/lib/homeGaleria' // KINEO-GALERIA-HOME-2710
import styles from '../examples/ExamplesGallery.module.css' // KINEO-GALERIA-HOME-2710
import '../trending/trending.css' // KINEO-GALERIA-HOME-2710
import fs from 'node:fs' // KINEO-JUNTA-TRENDING-3110
import path from 'node:path' // KINEO-JUNTA-TRENDING-3110
import HomeMosaic, { type MosaicStyle } from '@/components/home/HomeMosaic' // KINEO-MWK-MOSAICO-3110
import { trendingBlocks, parseTrendingToday, TRENDING_TODAY_FILE } from '@/lib/trending/trendingNow' // KINEO-JUNTA-TRENDING-3110

// KINEO-JUNTA-TRENDING-3110 — fundador 30/10 ("juntar sim"): Trending e Made with Kineo viram UMA página. Em cima, o que é NOVO
// (os blocos do antigo /trending: efeitos, estilos de anúncio, temas e motores, lançamentos mais novos primeiro); embaixo, a
// galeria da casa e os filmes compartilhados pelos donos (mais antigos). /trending redireciona para cá.
function readTrendingToday(now: Date) {
  try { return parseTrendingToday(fs.readFileSync(path.join(process.cwd(), TRENDING_TODAY_FILE), 'utf8'), now) } catch { return null }
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata = { // KINEO-GALERIA-HOME-2710 — canonical e hreflang da vitrine de sempre; a descrição fala da galeria nova
  ...showcaseMetadata('en'), // KINEO-GALERIA-HOME-2710
  description: 'AI clips, images and narrated films made with Kineo. Pick one and make your own in the same style.', // KINEO-GALERIA-HOME-2710
} // KINEO-GALERIA-HOME-2710

export default async function Page({ searchParams }: { searchParams: { page?: string | string[] } }) {
  const page = showcasePageNumber(searchParams.page) // KINEO-GALERIA-HOME-2710
  const [{ data: { user } }, { films, hasNext }] = await Promise.all([createClient().auth.getUser(), getShowcaseFilms(page)]) // KINEO-GALERIA-HOME-2710
  const signedIn = Boolean(user) // KINEO-GALERIA-HOME-2710
  const newBlocks = trendingBlocks({ now: new Date(), signedIn, today: readTrendingToday(new Date()) }) // KINEO-JUNTA-TRENDING-3110
  // KINEO-MWK-MOSAICO-3110 — fundador 30/10: "tudo junto, uma mistura igual na Home… vídeos menores, os mais recentes em cima, o
  // tracinho do raio nos novos, sem o bloco Ad styles". Uma grade só (o mosaico da home em modo completo): clipes, filmes, TODOS os
  // efeitos (estação e mais novos primeiro, "⚡ NEW" honesto), estilos de anúncio e imagens. Temas de filme (ilustrações, não vídeo
  // feito na Kineo) saem desta página — seguem no Viral Now e no Studio.
  const adStyles: MosaicStyle[] = (newBlocks.find((b) => b.id === 'ad-styles')?.cards ?? []).filter((c) => !!c.video).map((c) => ({ key: c.key, title: c.title, engine: c.engine, video: c.video as string, poster: c.poster, href: c.href }))
  const copy = SHOWCASE_COPY.en // KINEO-GALERIA-HOME-2710
  return ( // KINEO-GALERIA-HOME-2710
    <main className={`${styles.page} trending-page`} data-galeria-page="KINEO-GALERIA-HOME-2710">
      {/* 8 itens no topo: rótulo numa linha só, e até 1240px o menu desce para a 2ª fileira (o mesmo arranjo que o kit já usa abaixo de 1000px) */}
      <style dangerouslySetInnerHTML={{ __html: '[data-galeria-page] header nav a{white-space:nowrap}@media(max-width:1240px) and (min-width:1001px){[data-galeria-page] header>div{display:flex;flex-wrap:wrap;gap:0 20px;padding-top:17px;padding-bottom:13px}[data-galeria-page] header>div>div{margin-left:auto}[data-galeria-page] header nav{order:3;width:100%;justify-content:center;gap:24px;padding-top:16px;flex-wrap:wrap}}' }} />
      <header className={styles.pageHeader}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}><KineoBrandIcon size={26} />Kineo</Link>
          <nav className={styles.nav} aria-label="Main navigation" data-nav-surface="top" data-nav-area="public">
            {/* par do topo da home (app/KineoLanding.tsx): "Made with Kineo" logo depois dos itens de filme e de anúncio */}
            <Link href="/studio" className={styles.navPrimary} data-nav-item="video"><UiLabel>Make a film</UiLabel></Link>
            <Link href="/ads/new" className={styles.navPrimary} data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>
            <NavUgcAdsLink data-nav-item="more:ugc" />
            <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM} aria-current="page">{MADE_WITH_KINEO_LABEL}</Link>
            <Link href={MENU_CARTOON_HREF} data-nav-item={MENU_CARTOON_NAV_ITEM}><UiLabel>{MENU_CARTOON_LABEL}</UiLabel></Link>
            <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>{MENU_CONNECTOR_LABEL}</Link>
            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
          </nav>
          <div className={styles.headerTools}>
            <InterfaceLanguageSelect />
            <AppearanceSettingsButton compact />
            {signedIn
              ? <Link href="/studio" className={styles.navCta}><UiLabel>Open Studio</UiLabel></Link>
              : <Link href="/signup?utm_source=made_with_kineo" className={styles.navCta}><UiLabel>{CARD_ENTRY_COPY.ctaShort}</UiLabel></Link>}
          </div>
        </div>
      </header>

      <div className="tr-wrap">
        <section className="tr-hero" aria-labelledby="mwk-title">
          <p className="tr-eyebrow"><UiLabel>Real renders from the Kineo team</UiLabel></p>
          <h1 id="mwk-title">{MADE_WITH_KINEO_LABEL}</h1>
          <p className="tr-lead"><UiLabel>Clips, effects, images and narrated films, newest first. Tap one to make yours in the same style.</UiLabel></p>
        </section>
        {/* KINEO-MWK-MOSAICO-3110 — uma grade só, misturada, o mais novo em cima (o mosaico da home em modo completo). */}
        <div className="klp" style={{ paddingTop: 6 }}><HomeMosaic signedIn={signedIn} full styles={adStyles} /></div>

        {/* KINEO-VITRINE-FILMES-2610 — a vitrine de filmes dos donos (consentimento explícito), mesma leitura e mesmas regras. */}
        <section id="shared" className="tr-block" aria-labelledby="mwk-shared-title" lang="en">
          <div className="tr-block-head">
            <h2 id="mwk-shared-title"><UiLabel>Films shared by their creators</UiLabel></h2>
            <p>{copy.intro} · {(['en', 'pt', 'es'] as const).map((lang, i) => <span key={lang}>{i ? ' · ' : ''}<Link href={showcasePath(lang)} hrefLang={lang} lang={lang} aria-current={lang === 'en' ? 'page' : undefined}>{lang.toUpperCase()}</Link></span>)}</p>
          </div>
          {films.length ? (
            <div className="tr-grid">
              {films.map((film) => (
                <article className="tr-card" key={film.slug}>
                  <div className="tr-media"><video className="tr-video" src={film.playbackUrl} poster={film.posterUrl ?? film.thumbnailUrl} controls playsInline preload="none" aria-label={film.title} /></div>
                  <div className="tr-body">
                    <span className="tr-engine">{film.engine ?? copy.unknown}{film.isInternal ? ` · ${copy.internal}` : ''}</span>
                    <h3><Link href={showcasePath('en', film.slug)}>{film.title} ↗</Link></h3>
                    <p className="tr-sub">{copy.topic}: {film.theme}</p>
                    <p className="tr-caption">{showcaseProductionLine(film, 'en')}</p>
                    <Link className="tr-cta" href={showcaseCreateHref('en')}>{copy.cta} ↗</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ border: '1px dashed var(--border,#d5e0ec)', borderRadius: 16, padding: '22px 20px', maxWidth: 700 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{copy.empty}</h3>
              <p className="tr-sub" style={{ WebkitLineClamp: 'unset' }}>{copy.emptyDetail}</p>
            </div>
          )}
          <nav aria-label="Pagination" style={{ display: 'flex', gap: 24, justifyContent: 'center', margin: '24px 0 0', fontSize: 14 }}>
            {page > 1 ? <Link href={`${showcasePath('en')}?page=${page - 1}`}>← {copy.previous}</Link> : null}
            {hasNext ? <Link href={`${showcasePath('en')}?page=${page + 1}`}>{copy.next} →</Link> : null}
          </nav>
        </section>

        <footer className="tr-footer">
          <span>{copy.consent}</span>
          <Link href="/examples">{copy.examples} ↗</Link>
        </footer>
      </div>
    </main>
  ) // KINEO-GALERIA-HOME-2710
}
