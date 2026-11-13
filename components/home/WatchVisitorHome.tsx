'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UiLabel, InterfaceLanguageSelect } from '@/components/InterfaceLanguage'
import { CLIPES_NOVOS, CLIPES_NO_TOPO, clipeNovoPoster, clipeNovoVideo } from '@/lib/clipesNos2Lugares'
import { watchClipHref, watchClipLabel, WATCH_FEATURED_FILMS, watchFilmExampleHref } from '@/lib/home/watchEntry'
import WatchMedia from './WatchMedia'
import { trackEvent } from '@/lib/analytics'
import { watchViewportMetadata } from '@/lib/home/watchTelemetry'

const PRODUCTS = [
  {label:'Films', href:'/studio?intent_campaign=home_card', item:'video', icon:'▻'},
  {label:'Cartoons', href:'/kids-cartoon?utm_source=home_card', item:'more:cartoon', icon:'◇'},
  {label:'Product Ads', href:'/ads/v2?entry=product&utm_source=home_card', item:'business', icon:'◫'},
  {label:'UGC Ads', href:'/ads/v2?entry=ugc&utm_source=home_card', item:'more:ugc', icon:'◉'},
  {label:'Recreate', href:'/recreate', item:'more:recreate', icon:'↻'},
] as const

const CSS = `
html:has(.watch-home),body:has(.watch-home){scrollbar-width:none}.klp .watch-home{background:#101113;color:#f7f6f2;padding:0 0 44px;font:15px/1.5 Arial,Helvetica,sans-serif;--watch-accent:#e2f77a}
.klp .watch-home *{box-sizing:border-box}.klp .watch-home a{color:inherit;text-decoration:none}.klp .watch-home a:focus-visible,.klp .watch-home button:focus-visible{outline:3px solid var(--watch-accent);outline-offset:4px}
.klp .watch-home .watch-top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:28px;min-height:76px;padding:12px 28px;background:#101113;border-bottom:1px solid #34363b;z-index:20;backdrop-filter:none}
.klp .watch-home .watch-brand{font-size:25px;font-weight:750;letter-spacing:-1px;display:flex;align-items:center;gap:10px;min-height:44px}.klp .watch-brand span{color:var(--watch-accent);font-size:19px}.klp .watch-brand small{font-size:12px;color:#b9bdc2;letter-spacing:2px;margin-left:8px;padding-left:16px;border-left:1px solid #444}
.klp .watch-home .watch-products{display:flex;align-items:center;gap:25px;position:static;background:none;border:0;padding:0;min-height:0;box-shadow:none;backdrop-filter:none}.klp .watch-home .watch-products a,.klp .watch-home .watch-account a{min-height:44px;display:inline-flex;align-items:center;font-size:14px;font-weight:600}
.klp .watch-home .watch-account{display:flex;align-items:center;gap:24px;margin-left:auto}.klp .watch-home .watch-menu-toggle{display:none}.klp .watch-home .watch-bottom{display:none}
.klp .watch-home .watch-intro{display:flex;align-items:center;justify-content:space-between;padding:17px 28px 14px;gap:20px}.klp .watch-home .watch-intro h1{font-size:14px;line-height:1.5;letter-spacing:1px;font-weight:600;margin:0;text-transform:uppercase}.klp .watch-home .watch-intro a{font-size:12px;min-height:44px;display:flex;align-items:center}.klp .watch-home .watch-preview-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}.klp .watch-home .watch-preview-actions a{white-space:nowrap}.klp .watch-home .watch-preview-toggle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;min-height:44px;padding:0;border:1px solid #56595f;border-radius:9px;background:transparent;color:#f7f6f2;font-size:16px;cursor:pointer}
.klp .watch-home .watch-wall{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:0 24px}.klp .watch-home .watch-card{position:relative;display:block;aspect-ratio:5/6;background:#060708;overflow:hidden;border-radius:3px;min-width:0}.klp .watch-home .watch-card img,.klp .watch-home .watch-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.klp .watch-home .watch-card-copy{position:absolute;inset:auto 0 0;padding:65px 22px 22px;background:linear-gradient(transparent,#000e);display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.klp .watch-home .watch-card h2{font-size:22px;line-height:1.2;font-weight:600;letter-spacing:-.4px;margin:0;max-width:70%;text-wrap:balance}.klp .watch-home .watch-cta{flex-shrink:0;border-radius:99px;background:#f7f6f2;color:#11150e;font-size:14px;font-weight:700;padding:12px 20px;min-height:44px;display:flex;align-items:center;justify-content:center}.klp .watch-home [data-watch-recreate] .watch-cta{background:var(--watch-accent)}
.klp .watch-home .watch-menu{border-bottom:1px solid #34363b;padding:16px 24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}.klp .watch-home .watch-menu a{font-size:14px;min-height:44px;display:inline-flex;align-items:center}.klp .watch-home .watch-rest{margin-top:14px}.klp .watch-home .watch-collection{font-size:13px;color:#b7bbc2;padding:28px;text-align:center}.klp .watch-home .watch-collection a{text-decoration:underline;text-underline-offset:4px}
@media(max-width:1100px){.klp .watch-home .watch-products{gap:14px}.klp .watch-home .watch-products a{font-size:12px}.klp .watch-brand small{display:none}.klp .watch-home .watch-card h2{font-size:19px}.klp .watch-home .watch-card-copy{padding:60px 14px 16px;gap:10px}.klp .watch-home .watch-cta{font-size:12px;padding:12px}}
@media(max-width:760px){.klp .watch-home{padding-bottom:20px}.klp .watch-home .watch-top{padding:7px 14px;min-height:62px;gap:12px}.klp .watch-home .watch-brand{font-size:24px}.klp .watch-home .watch-products{display:none}.klp .watch-home .watch-account{gap:14px}.klp .watch-home .watch-account a{font-size:12px}.klp .watch-home .watch-menu-toggle{display:inline-flex;width:44px;min-height:44px;align-items:center;justify-content:center;background:transparent;color:#f7f6f2;border:1px solid #444;border-radius:9px;font-size:23px}.klp .watch-home .watch-intro{padding:6px 14px;gap:8px}.klp .watch-home .watch-intro h1{font-size:12px;letter-spacing:.3px;min-width:0;flex:1}.klp .watch-home .watch-preview-actions{gap:8px}.klp .watch-home .watch-intro a{font-size:12px}.klp .watch-home .watch-wall{grid-template-columns:minmax(0,1fr);padding:0 8px;gap:10px}.klp .watch-home .watch-card-copy{padding:72px 17px 18px}.klp .watch-home .watch-card h2{font-size:21px;max-width:64%}.klp .watch-home .watch-cta{font-size:13px;padding:12px 17px}.klp .watch-home .watch-menu{padding:12px 16px;gap:8px 20px}.klp .watch-home .watch-bottom{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;inset:auto 0 0;min-height:65px;padding:7px 5px max(7px,env(safe-area-inset-bottom));background:#191b1ef5;border-top:1px solid #444;z-index:50;box-shadow:none;backdrop-filter:none}.klp .watch-home .watch-bottom a{min-width:0;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;line-height:1.15;text-align:center}.klp .watch-home .watch-bottom b{font-size:19px;line-height:1}.klp:has(.watch-home){padding-bottom:75px}.klp .watch-home .watch-collection{padding:24px 16px}}
@media(prefers-reduced-motion:reduce){.klp .watch-home *{scroll-behavior:auto!important;transition:none!important}}
`

export default function WatchVisitorHome({preview=false}:{preview?:boolean}){
  const [menu,setMenu]=useState(false)
  const [previewsPaused,setPreviewsPaused]=useState(false)
  const top=CLIPES_NO_TOPO.flatMap(id=>CLIPES_NOVOS.find(c=>c.id===id)??[])
  const rest=CLIPES_NOVOS.filter(c=>!CLIPES_NO_TOPO.includes(c.id))
  const card=(c:(typeof CLIPES_NOVOS)[number],position:number)=>{
    const label=watchClipLabel(c),href=watchClipHref(c,false)
    const family=c.produto==='film'?'films':c.produto==='cartoon'?'kids_cartoon':c.produto==='ads'?(c.adsEntry==='ugc'?'ugc_ads':'product_ads'):'recreate'
    return <Link key={c.id} href={href} prefetch={false} className="watch-card" data-watch-card={c.id} data-watch-recreate={label==='Recreate'?true:undefined} onClick={()=>{void trackEvent('home_card_clicked',{...watchViewportMetadata(typeof window==='undefined'?undefined:window.innerWidth),card:family,clip_id:c.id,position,href,signed_in:false,surface:'home',card_v:1,home_variant:preview?'watch-preview':'watch',preview})}}>
      <WatchMedia paused={previewsPaused} src={clipeNovoVideo(c)} poster={clipeNovoPoster(c)} focus={c.focus}/>
      <div className="watch-card-copy"><h2>{c.title}</h2><span className="watch-cta"><UiLabel>{label}</UiLabel></span></div>
    </Link>
  }
  return <section className="watch-home" data-watch-home="visitor">
    <style>{CSS}</style>
    <header className="watch-top"><Link className="watch-brand" href="/"><span aria-hidden="true">▸▸</span>kineo<small>WATCH</small></Link>
      <nav className="watch-products" aria-label="Products" data-nav-surface="top" data-nav-area="public">{PRODUCTS.map(p=><Link key={p.item} href={p.href} prefetch={false} data-nav-item={p.item}><UiLabel>{p.label}</UiLabel></Link>)}</nav>
      <div className="watch-account"><Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link><Link href="/login"><UiLabel>Log in</UiLabel></Link><button className="watch-menu-toggle" type="button" aria-label="More destinations" aria-expanded={menu} aria-controls="watch-more" onClick={()=>setMenu(!menu)}>☰</button></div>
    </header>
    {menu&&<div className="watch-menu" id="watch-more"><Link href="/made-with-kineo">Made with Kineo</Link><Link href="/kineo-in-claude">Claude &amp; ChatGPT</Link><Link href="/clips?free_clip=1"><UiLabel>Redeem an existing offer</UiLabel></Link><InterfaceLanguageSelect emMenu/><button type="button" onClick={()=>setMenu(false)} aria-label="Close destinations">×</button></div>}
    <div className="watch-intro"><h1><UiLabel>Watch what you could make</UiLabel></h1><div className="watch-preview-actions"><Link href="/made-with-kineo"><UiLabel>View collection</UiLabel> ↗</Link><button className="watch-preview-toggle" type="button" aria-label={previewsPaused?'Play previews':'Pause previews'} title={previewsPaused?'Play previews':'Pause previews'} aria-pressed={previewsPaused} onClick={()=>setPreviewsPaused(paused=>!paused)}><span aria-hidden="true">{previewsPaused?'▶':'Ⅱ'}</span></button></div></div>
    <div className="watch-wall" data-watch-top="1">{top.map((c,i)=>card(c,i+1))}</div>
    <div className="watch-wall watch-rest">{rest.map((c,i)=>card(c,top.length+i+1))}</div>
    <div className="watch-wall watch-rest" aria-label="Narrated films">{WATCH_FEATURED_FILMS.map((film,i)=><Link key={film.id} href={watchFilmExampleHref(film.id)} prefetch={false} className="watch-card" data-watch-film={film.id} onClick={()=>{void trackEvent('home_card_clicked',{...watchViewportMetadata(typeof window==='undefined'?undefined:window.innerWidth),card:'films',clip_id:'home-'+film.id,position:CLIPES_NOVOS.length+i+1,href:watchFilmExampleHref(film.id),signed_in:false,surface:'home',card_v:1,home_variant:preview?'watch-preview':'watch',preview})}}><WatchMedia paused={previewsPaused} src={film.previewUrl||film.videoUrl} poster={film.posterUrl} focus={film.focalPoint}/><div className="watch-card-copy"><h2>{film.title}</h2><span className="watch-cta"><UiLabel>Make a film</UiLabel></span></div></Link>)}</div>
    <p className="watch-collection"><Link href="/recreate"><UiLabel>Recreate</UiLabel></Link> · <Link href="/made-with-kineo">Made with Kineo</Link> · <Link href="/pricing"><UiLabel>Pricing</UiLabel></Link></p>
    <nav className="watch-bottom" aria-label="Products on mobile" data-nav-surface="mobile" data-nav-area="public">{PRODUCTS.map(p=><Link key={p.item} href={p.href} prefetch={false} data-nav-item={p.item}><b aria-hidden="true">{p.icon}</b><UiLabel>{p.label}</UiLabel></Link>)}</nav>
  </section>
}
