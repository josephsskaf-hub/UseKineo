import { KineoBrandIcon } from '@/components/KineoBolt'
import { UiLabel } from '@/components/InterfaceLanguage'
import NavUgcAdsLink from '@/components/NavUgcAdsLink'
import SiteSettingsMenu from '@/components/SiteSettingsMenu'
import { createEntryForContentHref, createEntryHref } from '@/lib/create/entry'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import { MADE_WITH_KINEO_HREF, MADE_WITH_KINEO_LABEL, MADE_WITH_KINEO_NAV_ITEM } from '@/lib/homeGaleria'
import { PAGINA_CLARA_CSS } from '@/lib/seo/paginasIaClaras2110'
import { MENU_CARTOON_HREF, MENU_CARTOON_NAV_ITEM, MENU_CONNECTOR_HREF, MENU_CONNECTOR_LABEL, MENU_CONNECTOR_NAV_ITEM, RECREATE_MENU_HREF, RECREATE_MENU_LABEL, RECREATE_MENU_NAV_ITEM } from '@/lib/ui/homeRemodela2010'
import { NOMES_DE_PRODUTO } from '@/lib/ui/nomesDeProduto'
import Link from 'next/link'

export default function PublicSiteHeader({ signedIn, currentPath, signupHref, signupLabel }: {
  signedIn?: boolean
  currentPath?: string
  signupHref?: string
  signupLabel?: string
}) {
  const filmHref = createEntryHref('film', '/studio', !!signedIn)
  const links = (primaryClass?: string) => (<>
    <Link href={filmHref} className={primaryClass} data-nav-item="video"><UiLabel>{NOMES_DE_PRODUTO.film.curto}</UiLabel></Link>
    <Link href={createEntryHref('ads', '/ads/new', !!signedIn)} className={primaryClass} data-nav-item="business"><UiLabel>{NOMES_DE_PRODUTO.product_ads.curto}</UiLabel></Link>
    <NavUgcAdsLink data-nav-item="more:ugc" signedIn={signedIn} label={NOMES_DE_PRODUTO.ugc_ads.curto} />
    <Link href={createEntryForContentHref('cartoon', MENU_CARTOON_HREF, '/kids-cartoon', !!signedIn)} data-nav-item={MENU_CARTOON_NAV_ITEM} aria-current={currentPath === MENU_CARTOON_HREF ? 'page' : undefined}><UiLabel>{NOMES_DE_PRODUTO.cartoon.curto}</UiLabel></Link>
    <Link href={RECREATE_MENU_HREF} data-nav-item={RECREATE_MENU_NAV_ITEM} aria-current={currentPath === RECREATE_MENU_HREF ? 'page' : undefined}>{RECREATE_MENU_LABEL}</Link>
    <Link href={MADE_WITH_KINEO_HREF} data-nav-item={MADE_WITH_KINEO_NAV_ITEM} aria-current={currentPath === MADE_WITH_KINEO_HREF ? 'page' : undefined}>{MADE_WITH_KINEO_LABEL}</Link>
    <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>{MENU_CONNECTOR_LABEL}</Link>
    <Link href="/pricing" data-nav-item="pricing" aria-current={currentPath === '/pricing' ? 'page' : undefined}><UiLabel>Pricing</UiLabel></Link>
  </>)
  const login = signedIn ? null : <Link className="kpn-login" href="/login" data-nav-item="login"><UiLabel>Log in</UiLabel></Link>
  const action = (mobile: boolean) => <Link className="kpn-cta" href={signedIn ? filmHref : signupHref ?? (mobile ? '/signup?utm_source=nav-mobile' : '/signup?utm_source=nav')}>
    <UiLabel>{signedIn ? 'Dashboard' : signupLabel ?? CARD_ENTRY_COPY.ctaShort}</UiLabel>
  </Link>
  return (
    <header className="kpn" data-public-site-header>
      <style dangerouslySetInnerHTML={{ __html: PAGINA_CLARA_CSS }} />
      <nav aria-label="Main" className="kpn-in">
        <Link href="/" className="kpn-logo"><KineoBrandIcon className="mk" size={30} />Kineo</Link>
        <div className="kpn-links" data-nav-surface="top" data-nav-area="public">{links('kpn-primary')}</div>
        <div className="kpn-right">
          <SiteSettingsMenu signedIn={signedIn} />
          {login}{action(false)}
          <div className="kpn-toggle">
            <input type="checkbox" id="kpn-toggle" aria-label="Menu" aria-controls="kpn-menu" />
            <span className="kpn-bars" aria-hidden="true"><i /><i /><i /></span>
            <label htmlFor="kpn-toggle" id="kpn-menu" className="kpn-menu" data-nav-surface="mobile" data-nav-area="public">
              {links()}{login}{action(true)}
            </label>
          </div>
        </div>
      </nav>
    </header>
  )
}
