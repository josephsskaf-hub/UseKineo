// [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] KINEO-PAGINAS-IA-CLARAS-2110 — a moldura
// clara das páginas de entrada do ChatGPT: o menu do topo da home (os mesmos 7 itens, na mesma ordem e no mesmo desenho —
// um PAR do topo da home, como os de /examples e /trending: mexeu num item lá, mexe aqui), os MESMOS 4 cards de produto da
// home (components/home/HomeThreeCards, sem cópia) logo abaixo do título, e a vitrine atual (a da /claude-connector).
//
// Componente de SERVIDOR: as páginas são estáticas, então o topo sai na versão de visitante (Log in + Start free), como a
// home para quem não entrou. O CSS da home (KLP_CSS, dentro da KineoLanding) NÃO é importado: o menu usa classes kpn-*
// próprias (lib/seo/paginasIaClaras2110.ts) e a faixa dos cards usa o tema claro exportado (app/kineoLandingTheme.ts).
// Medição dos cards: o clique segue o contrato fechado da home (home_card_clicked, surface 'home'); quem quiser separar estas
// páginas lê events.path (trackEvent grava o pathname de cada clique).
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import NavUgcAdsLink from '@/components/NavUgcAdsLink'
import { InterfaceLanguageSelect, UiLabel } from '@/components/InterfaceLanguage'
import HomeThreeCards from '@/components/home/HomeThreeCards'
import { HOME_4TH_CARD_LIVE } from '@/lib/ui/homeKidsCard'
import { KINEO_LANDING_THEME_CSS } from '@/app/kineoLandingTheme'
import { MENU_CARTOON_HREF, MENU_CARTOON_LABEL, MENU_CARTOON_NAV_ITEM, MENU_CONNECTOR_HREF, MENU_CONNECTOR_LABEL, MENU_CONNECTOR_NAV_ITEM } from '@/lib/ui/homeRemodela2010'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import ShowcaseGrid from '@/app/claude-connector/ShowcaseGrid'
import { PAGINA_CLARA, PAGINA_CLARA_CSS, VITRINE_LINHA, VITRINE_TITULO } from '@/lib/seo/paginasIaClaras2110'

/** O tema claro da home (para a faixa dos cards) + a camada desta entrega, sem os comentários (como a home faz). */
const CSS = KINEO_LANDING_THEME_CSS.replace(/\/\*[\s\S]*?\*\//g, '') + '\n' + PAGINA_CLARA_CSS

/** O menu do topo da home, versão visitante. Vai como PRIMEIRO filho do <main className="kpl"> de cada página. */
export function PaginaClaraTopo() {
  return (
    <header className="kpn" data-pagina-clara="topo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav aria-label="Main" className="kpn-in">
        <Link href="/" className="kpn-logo">
          <KineoBrandIcon className="mk" size={30} />
          Kineo
        </Link>
        <div className="kpn-links" data-nav-surface="top" data-nav-area="public">
          <Link href="/studio" className="kpn-primary" data-nav-item="video"><UiLabel>Make a film</UiLabel></Link>
          <Link href="/ads/new" className="kpn-primary" data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>
          <NavUgcAdsLink data-nav-item="more:ugc" />
          <Link href={MENU_CARTOON_HREF} data-nav-item={MENU_CARTOON_NAV_ITEM}><UiLabel>{MENU_CARTOON_LABEL}</UiLabel></Link>
          <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>{MENU_CONNECTOR_LABEL}</Link>
          <Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>
          <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
        </div>
        <div className="kpn-right">
          <InterfaceLanguageSelect />
          <Link className="kpn-login" href="/login" data-nav-item="login"><UiLabel>Log in</UiLabel></Link>
          <Link className="kpn-cta" href="/signup?utm_source=nav"><UiLabel>{CARD_ENTRY_COPY.ctaShort}</UiLabel></Link>
          <div className="kpn-toggle">
            <input type="checkbox" id="kpn-toggle" aria-label="Menu" aria-controls="kpn-menu" />
            <span className="kpn-bars" aria-hidden="true"><i /><i /><i /></span>
            <label htmlFor="kpn-toggle" id="kpn-menu" className="kpn-menu" data-nav-surface="mobile" data-nav-area="public">
              <Link href="/studio" data-nav-item="video"><UiLabel>Make a film</UiLabel></Link>
              <Link href="/ads/new" data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>
              <NavUgcAdsLink data-nav-item="more:ugc" />
              <Link href={MENU_CARTOON_HREF} data-nav-item={MENU_CARTOON_NAV_ITEM}><UiLabel>{MENU_CARTOON_LABEL}</UiLabel></Link>
              <Link href={MENU_CONNECTOR_HREF} data-nav-item={MENU_CONNECTOR_NAV_ITEM}>{MENU_CONNECTOR_LABEL}</Link>
              <Link href="/trending" data-nav-item="more:trending"><UiLabel>🔥 Trending</UiLabel></Link>
              <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
              <Link href="/login" data-nav-item="login"><UiLabel>Log in</UiLabel></Link>
              <Link className="kpn-cta" href="/signup?utm_source=nav-mobile"><UiLabel>{CARD_ENTRY_COPY.ctaShort}</UiLabel></Link>
            </label>
          </div>
        </div>
      </nav>
    </header>
  )
}

/** Os 4 cards de produto da home (Filme · Product Ads · UGC · AI Cartoon Videos), o mesmo componente, o mesmo destino.
 *  Vai logo abaixo do título da página; ocupa a largura da tela como na home. */
export function PaginaClaraCards() {
  return (
    <div className="klp kpl-cards" data-pagina-clara="cards">
      <HomeThreeCards signedIn={false} kidsCard={HOME_4TH_CARD_LIVE} />
    </div>
  )
}

/** A vitrine ATUAL (os 9 vídeos que a /claude-connector já mostra: 3 UGC, 3 anúncios de produto, 3 filmes — clipes que a home
 *  já serve). Entra no lugar de toda galeria velha destas páginas; nenhum render novo, nenhuma curadoria nova. */
export function PaginaClaraVitrine({ id, eyebrow, titulo = VITRINE_TITULO, linha = VITRINE_LINHA, nota, align = 'center' }: { id?: string; eyebrow?: string; titulo?: string; linha?: string; nota?: string; align?: 'center' | 'left' }) {
  return (
    <section id={id} aria-label={titulo} data-pagina-clara="vitrine" style={{ marginTop: 44, textAlign: align }}>
      {eyebrow ? <p style={{ margin: '0 0 6px', color: PAGINA_CLARA.accent, fontSize: 12, fontWeight: 750, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{eyebrow}</p> : null}
      <h2 style={{ fontSize: 'clamp(1.3rem, 3.4vw, 1.75rem)', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 6px', color: PAGINA_CLARA.text }}>{titulo}</h2>
      <p style={{ color: PAGINA_CLARA.muted, fontSize: '0.95rem', lineHeight: 1.6, margin: align === 'center' ? '0 auto 20px' : '0 0 20px', maxWidth: 640 }}>{linha}</p>
      <div style={{ textAlign: 'left' }}><ShowcaseGrid /></div>
      {nota ? <p style={{ color: PAGINA_CLARA.muted, fontSize: '0.82rem', lineHeight: 1.6, margin: '14px 0 0' }}>{nota}</p> : null}
    </section>
  )
}
