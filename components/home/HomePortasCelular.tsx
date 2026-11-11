'use client'
// KINEO-CELULAR-A-0611 [fundador 06/11: "Modelo A, fundo escuro"]: abaixo do carrossel, as 4 portas, o título da galeria e a caixa flutuante.
// Só abaixo de 768 px; imagens com lazy não são baixadas no computador. Os destinos são os mesmos dos cartões da home.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { hrefDaCaixa, ideiaDaPagina } from '@/lib/growth/ideiaDaPagina' // KINEO-CAIXA-COM-IDEIA-0611
import { UiLabel } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { HOME_CARD_EVENT, homeCardClickMetadata, homeCardHref, type HomeCardId } from '@/lib/ui/homeThreeCards'
import { homeKidsCardHref } from '@/lib/ui/homeKidsCard'
import { createEntryForLegacyHref } from '@/lib/create/entry' // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"]
import { MADE_WITH_KINEO_HREF } from '@/lib/homeGaleria'

const CSS = `
.kpc{display:none}
@media(max-width:767px){
.klp section.kpc{display:block;padding:12px 20px 0}
.kpc-portas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.kpc-porta{display:block;text-align:center;font-size:12px;font-weight:600;line-height:1.25;color:var(--txt)}
.kpc-porta span{display:block;aspect-ratio:1;border-radius:14px;overflow:hidden;margin-bottom:6px;background:var(--card);border:1px solid var(--line)}
.kpc-porta img{width:100%;height:100%;object-fit:cover;display:block}
.kpc-tit{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:22px 0 2px}
.kpc-tit small{display:block;font-size:12px;font-weight:700;color:var(--blue)}
.kpc-tit b{display:block;font-size:20px;font-weight:800;letter-spacing:-.01em;color:var(--txt)}
.kpc-tit a{flex:none;font-size:13px;font-weight:600;color:var(--muted);min-height:44px;display:flex;align-items:flex-end}
.kpc-caixa{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;align-items:center;gap:10px;min-height:56px;padding:6px 6px 6px 18px;border-radius:999px;background:var(--card);border:1px solid var(--line2);box-shadow:0 10px 28px rgba(0,0,0,.45);font-size:15px;font-weight:600;color:var(--muted)}
.kpc-caixa em{flex:1;min-width:0;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpc-caixa i{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:20px;font-weight:800;background:var(--indigo);color:var(--on-accent,#04122E)}
}
`

const PORTAS: ReadonlyArray<{ card: HomeCardId; rotulo: string; img: string }> = [
  { card: 'films', rotulo: 'Film', img: '/posters/hero-seedance.webp' },
  { card: 'product_ads', rotulo: 'Product ads', img: '/home-images/perfume-splash.webp' },
  { card: 'ugc_ads', rotulo: 'UGC ads', img: '/posters/ugc-porta.webp' },
]

export default function HomePortasCelular({ signedIn, entradaNova = false }: { signedIn: boolean; entradaNova?: boolean }) {
  const ideia = ideiaDaPagina(usePathname()) // KINEO-CAIXA-COM-IDEIA-0611
  // KINEO-ENTRADAS-TELA-NOVA-1011 — só na home (entradaNova): a porta Film e a caixa abrem a aba Film para quem está LOGADO; o visitante segue no destino de hoje (KINEO-ENTRADAS-SO-LOGADO-1011).
  // KINEO-ENTRADAS-CARTOES-1011 [fundador 10/11: "Make my ad", "Make my UGC ad" e "Make my cartoon" abriram a tela ANTIGA] — as portas de anúncio
  // (?entry=) e o Cartoon também: logado vai à aba (/create/ads?entry=… · /create/cartoon?utm_source=…); visitante segue no de hoje (o desenho sem conta).
  const entrada = (href: string) => (entradaNova ? createEntryForLegacyHref(href, signedIn) : href)
  const caixaHref = entradaNova ? createEntryForLegacyHref(hrefDaCaixa(ideia), signedIn) : hrefDaCaixa(ideia)
  return (
    <section className="kpc" aria-label="What to make" data-kineo="home-portas-celular">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="kpc-portas">
        {PORTAS.map((p, i) => (
          <Link key={p.card} className="kpc-porta" href={entrada(homeCardHref(p.card, signedIn))} onClick={() => { void trackEvent(HOME_CARD_EVENT, { ...homeCardClickMetadata(p.card, signedIn), position: i + 1, surface: 'phone_door' }) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span><img src={p.img} alt="" loading="lazy" /></span><UiLabel>{p.rotulo}</UiLabel>
          </Link>
        ))}
        <Link className="kpc-porta" href={entrada(homeKidsCardHref(signedIn))} onClick={() => { void trackEvent(HOME_CARD_EVENT, { card: 'kids_cartoon', position: 4, surface: 'phone_door' }) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span><img src="/kids-cartoon/leo.webp" alt="" loading="lazy" /></span><UiLabel>Cartoon</UiLabel>
        </Link>
      </div>
      <div className="kpc-tit">
        <span><small>Made with Kineo</small><b><UiLabel>Make one like this</UiLabel></b></span>
        <Link href={MADE_WITH_KINEO_HREF}><UiLabel>View all</UiLabel> ›</Link>
      </div>
      <Link className="kpc-caixa" href={caixaHref} onClick={() => { void trackEvent('home_phone_box_clicked', { signed_in: signedIn, with_idea: ideia !== null }) }}>
        <em>{ideia ?? <UiLabel>What&apos;s your film about?</UiLabel>}</em><i aria-hidden="true">↑</i>
      </Link>
    </section>
  )
}
