import { CLIPES_NOVOS, clipeNovoPoster, clipeNovoVideo } from '@/lib/clipesNos2Lugares'
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'

export type StrategyId = 'A' | 'B' | 'C'
export type CardGoal = 'film' | 'cartoon' | 'ads' | 'clip' | 'recreate'
export interface StrategyCard {
  id: string; title: string; goal: CardGoal; video: string; poster: string
  cta: string; href: string; reason: string; note: string; fresh: boolean
}
export interface HomeStrategy {
  id: StrategyId; name: string; promise: string; audience: string
  screens: readonly { title: string; purpose: string; cards: readonly StrategyCard[] }[]
}

const NEW_IDS = new Set(['selfie-confete', 'sueter-aconchegante', 'balao-confete', 'danca-corredor', 'raposa-lanterna', 'ultimo-trem', 'carta-do-front', 'anuncio-tenis-pedestal', 'anuncio-creme-selfie', 'anuncio-burger-camera-lenta'])
const CTAS: Record<CardGoal, string> = { film: 'Make my film →', cartoon: 'Make my cartoon →', ads: 'Make your ad →', clip: 'Explore templates →', recreate: 'Recreate ↗' }
const GOALS: Record<CardGoal, string> = { film: 'Film idea', cartoon: 'Cartoon idea', ads: 'Ad inspiration', clip: 'Template inspiration', recreate: 'Photo template' }

function clip(id: string, goal: Exclude<CardGoal, 'recreate'>, reason: string): StrategyCard {
  const item = CLIPES_NOVOS.find(c => c.id === id)
  if (!item) throw new Error(`Strategy uses an unavailable showcase clip: ${id}`)
  const query = new URLSearchParams({ ideia: item.title })
  const href = goal === 'film' ? `/create/film?${query}` : goal === 'cartoon' ? '/create/cartoon' : goal === 'ads' ? '/create/ads?entry=product' : '/recreate'
  return {
    id, goal, title: item.title, video: clipeNovoVideo(item), poster: clipeNovoPoster(item),
    cta: CTAS[goal], href, reason, fresh: NEW_IDS.has(id),
    note: goal === 'clip' ? 'Inspiration only. Choose an approved template; this exact swap is not available yet.' : goal === 'ads' ? 'Use your own product. This example does not promise a talking presenter.' : goal === 'cartoon' ? 'Start a new cartoon from your story.' : 'Start a new narrated film from your idea.',
  }
}
function template(id: string, reason: string): StrategyCard {
  const item = publicRecreateCatalog().find(c => c.id === id)
  if (!item || (item.kind === 'swap' && item.people !== 1)) throw new Error(`Unapproved strategy template: ${id}`)
  return { id, title: item.title, goal: 'recreate', video: item.video, poster: item.poster, cta: CTAS.recreate,
    href: item.href, reason, note: 'Available photo template. Add your own photo in the next step.', fresh: false }
}

/** Study only. Position is deliberate; media and approved template availability come from the live source catalogs. */
export const HOME_STRATEGIES: readonly HomeStrategy[] = [
  {
    id: 'A', name: 'A · Your next story', audience: 'Creators and families, with a clear route for a small business.',
    promise: 'Lead with films and cartoons people already seek, then show what they can recreate with a photo.',
    screens: [
      { title: 'Screen 1 · New this week', purpose: 'Six new clips first. A person, a character or a product in every route.', cards: [
        clip('carta-do-front', 'film', '1 · A visible human story introduces Films, the most clicked family: 105 people in the measured 14-day cohort.'),
        clip('raposa-lanterna', 'cartoon', '2 · Cartoon is second in the observed family clicks (73 people); show it next to Films, not at the bottom.'),
        clip('anuncio-burger-camera-lenta', 'ads', '3 · A local shop can recognize its product immediately; introduces the business route in the first row.'),
        clip('ultimo-trem', 'film', '4 · A second film mood broadens the story route; inspiration is explicit because the clip itself has no narration.'),
        clip('anuncio-tenis-pedestal', 'ads', '5 · Product movement makes the ad use case concrete; observed product-family clicks exceed UGC-family clicks.'),
        clip('anuncio-creme-selfie', 'ads', '6 · Tests a human product example without making mouth movement a product promise.'),
      ] },
      { title: 'Screen 2 · Put your photo in it', purpose: 'The reusable route is visible and truthful: only public templates.', cards: [
        template('passarela', '7 · The approved single-person swap demonstrates the literal “this could be me” route.'),
        template('effect-pet-bee', '8 · Pet owners can recognize their own use case; alternates person and animal.'),
        template('effect-giant-product', '9 · Keeps a product route inside the template row, rather than six face cards.'),
        template('effect-pet-lion', '10 · A second pet idea tests range without inventing a usage count.'),
        template('effect-santa-cartoon', '11 · A seasonal personal transformation; replace when the season ends.'),
        template('effect-pet-xmas-angel', '12 · Seasonal pet option; available today, not an untested swap.'),
      ] },
      { title: 'Screen 3 · More ideas for your channel', purpose: 'Depth after the simple first choice: narrative, family and commerce.', cards: [
        clip('filme-mary-celeste', 'film', '13 · Real narrated output supports the primary promise after the short opening inspirations.'),
        clip('dragaozinho', 'cartoon', '14 · Another cartoon acknowledges family demand without repeating the opening fox.'),
        clip('anuncio-relogio', 'ads', '15 · A familiar giftable product adds a second retail category.'),
        clip('filme-anticitera', 'film', '16 · A fact-led channel idea for the audience seeking faceless films.'),
        clip('boneco-de-neve', 'cartoon', '17 · A third family story; availability comes from the same clip source.'),
        clip('filme-porta-do-inferno', 'film', '18 · Topic-led depth is last, behind examples with a person, character or product.'),
      ] },
    ],
  },
  {
    id: 'B', name: 'B · Your product, in motion', audience: 'Shop owners and people comparing an ad workflow.',
    promise: 'Show products first, then a complete set of ways a small business could use the tool.',
    screens: [
      { title: 'Screen 1 · New ways to show what you sell', purpose: 'The six new clips remain first; the three product examples lead.', cards: [
        clip('anuncio-burger-camera-lenta', 'ads', '1 · Food is a recognizable product and a local-business case; low explanation cost.'),
        clip('anuncio-tenis-pedestal', 'ads', '2 · A second product category shows the route is not limited to food.'),
        clip('anuncio-creme-selfie', 'ads', '3 · Adds the person-plus-product image, with no promise of public lip-sync capability.'),
        clip('carta-do-front', 'film', '4 · Keeps the most clicked family reachable for visitors who do not sell a product.'),
        clip('raposa-lanterna', 'cartoon', '5 · Preserves the second-most-clicked family on the first screen.'),
        clip('ultimo-trem', 'film', '6 · A second narrative door prevents the page from reading as an ads-only product.'),
      ] },
      { title: 'Screen 2 · One product, several directions', purpose: 'Product-first breadth, following the observed Marketing Studio template practice.', cards: [
        clip('anuncio-relogio', 'ads', '7 · Jewellery and accessories create a clear next retail category.'),
        clip('anuncio-colar', 'ads', '8 · A second gifting shot gives comparison within the same buyer task.'),
        clip('anuncio-sueter-pet', 'ads', '9 · Pet retail expands the shop-owner use case without a new video.'),
        template('effect-giant-product', '10 · A public product template is the first literal Recreate CTA in this strategy.'),
        clip('filme-mary-celeste', 'film', '11 · Real narrated output remains visible for a creator rather than a shop.'),
        clip('dragaozinho', 'cartoon', '12 · Family story demand stays represented beyond the opening screen.'),
      ] },
      { title: 'Screen 3 · Make it yours', purpose: 'A personal route after commercial relevance has been established.', cards: [
        template('passarela', '13 · Approved one-person swap; never substitute one of the untested new clips.'),
        template('effect-pet-bee', '14 · Broad personal appeal with a low-explanation photo template.'),
        template('effect-pet-lion', '15 · Alternates the personal use case with a second pet example.'),
        clip('boneco-de-neve', 'cartoon', '16 · Another story concept for visitors who chose the family route.'),
        clip('filme-anticitera', 'film', '17 · Fact-led channel example, with the actual Film destination.'),
        clip('filme-porta-do-inferno', 'film', '18 · Long-tail topic variety appears after business examples, not ahead of them.'),
      ] },
    ],
  },
  {
    id: 'C', name: 'C · See yourself in the idea', audience: 'People arriving for a person, pet or shareable clip.',
    promise: 'Lead with recognizable people and moments, while keeping inspiration separate from approved photo templates.',
    screens: [
      { title: 'Screen 1 · New people, new moments', purpose: 'Six new clips first. The first four are inspiration, not face-swap promises.', cards: [
        clip('selfie-confete', 'clip', '1 · A crowd scene is a personal-recognition hypothesis; the CTA opens the approved template catalog; this exact swap is not offered.'),
        clip('sueter-aconchegante', 'clip', '2 · A familiar clothing moment; no Recreate CTA until its paid swap test passes.'),
        clip('balao-confete', 'clip', '3 · Celebration is recognizable to a family or friend group; no multi-person swap promise.'),
        clip('danca-corredor', 'clip', '4 · A single-person office moment, still an inspiration because its swap is not approved.'),
        clip('raposa-lanterna', 'cartoon', '5 · Cartoon demand (73 family-click actors) earns a first-screen route even here.'),
        clip('carta-do-front', 'film', '6 · A human narrative connects the personal hook to the Film product.'),
      ] },
      { title: 'Screen 2 · Photo templates you can use today', purpose: 'The distinction between “I like this idea” and “put my photo here” becomes explicit.', cards: [
        template('passarela', '7 · The approved swap is first; it is the strongest direct proof of the literal personal route.'),
        template('effect-pet-bee', '8 · A pet template broadens identification beyond the visitor’s face.'),
        template('effect-pet-lion', '9 · A second pet idea helps compare outcomes without an engine selector.'),
        template('effect-santa-cartoon', '10 · Seasonal personal transformation, with a real public destination.'),
        template('effect-pet-xmas-angel', '11 · Seasonal pet transformation, rotated when the period ends.'),
        template('effect-giant-product', '12 · Shows that Recreate also serves a product owner.'),
      ] },
      { title: 'Screen 3 · Turn a moment into a channel or ad', purpose: 'Commercial and narrative depth after personal recognition.', cards: [
        clip('dragaozinho', 'cartoon', '13 · A second cartoon follows the family identification established above.'),
        clip('boneco-de-neve', 'cartoon', '14 · A third story expands family content without a second source list.'),
        clip('ultimo-trem', 'film', '15 · A channel idea for the visitor who wants narration rather than a one-scene clip.'),
        clip('anuncio-tenis-pedestal', 'ads', '16 · Concrete product movement opens commerce late in the sequence.'),
        clip('anuncio-burger-camera-lenta', 'ads', '17 · Local-business case accompanies the product route.'),
        clip('anuncio-creme-selfie', 'ads', '18 · Human product inspiration closes the sequence; actual Ads form decides the available format.'),
      ] },
    ],
  },
]

const CSS = `
.eh{--eh-bg:#f7f7f5;--eh-card:#fff;--eh-text:#10141b;--eh-muted:#58616e;--eh-line:#dfe3e7;background:var(--eh-bg);color:var(--eh-text);font:14px/1.5 Arial,Helvetica,sans-serif;min-height:100vh}.eh *{box-sizing:border-box}.eh a{color:inherit;text-decoration:none}.eh-nav{display:flex;align-items:center;gap:28px;flex-wrap:wrap;padding:18px 28px;background:#fff;border-bottom:1px solid var(--eh-line)}.eh-brand{font-size:25px;font-weight:850;letter-spacing:-1px}.eh-products{display:flex;gap:24px;align-items:center;flex-wrap:wrap;font-size:14px;font-weight:700}.eh-tools{margin-left:auto;display:flex;gap:20px;align-items:center;font-size:14px}.eh-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 18px;border-radius:999px;background:#fff;color:#10141b!important;border:1px solid #dce0e5;font-size:15px;font-weight:800;box-shadow:0 3px 0 #cbd0d8;white-space:normal;text-align:center}.eh-cta:hover{transform:translateY(-1px)}.eh a:focus-visible,.eh summary:focus-visible{outline:3px solid #0a5cff;outline-offset:4px}.eh-main{padding:22px 28px 50px;max-width:1920px;margin:auto}.eh-study{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px;font-size:12px}.eh-study a{padding:8px 12px;border:1px solid var(--eh-line);border-radius:999px;background:#fff;font-weight:700}.eh-study a[aria-current=page]{border-color:#0a5cff;background:#e9f0ff}.eh-intro{margin:0 0 22px;max-width:1000px}.eh-intro h1{font-size:30px;letter-spacing:-.6px;line-height:1.15;margin:0 0 10px}.eh-intro p{font-size:16px;color:var(--eh-muted);margin:6px 0}.eh-screen{margin:0 0 38px}.eh-section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:0 0 16px}.eh-section-head h2{font-size:23px;line-height:1.2;margin:0 0 5px}.eh-section-head p{color:var(--eh-muted);font-size:14px;margin:0;max-width:850px}.eh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.eh-card{min-width:0;background:var(--eh-card);border:1px solid var(--eh-line);border-radius:19px;overflow:hidden}.eh-media{aspect-ratio:5/6;position:relative;background:#eef0ed;overflow:hidden}.eh-media video{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#eef0ed}.eh-new{position:absolute;z-index:1;left:14px;top:14px;background:#fff;color:#10141b;border:1px solid #e0e3e6;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800}.eh-copy{padding:15px 16px 17px}.eh-kind{font-size:12px;color:var(--eh-muted);margin:0 0 4px}.eh-copy h3{font-size:18px;line-height:1.3;margin:0 0 12px;letter-spacing:-.2px}.eh-copy .eh-cta{width:100%}.eh-note{font-size:12px;line-height:1.5;color:var(--eh-muted);margin:12px 0 0;min-height:36px}.eh-reason{border-top:1px solid var(--eh-line);margin-top:12px;padding-top:10px;font-size:12px;color:var(--eh-muted)}.eh-reason summary{cursor:pointer;min-height:32px;font-weight:700}.eh-reason p{margin:6px 0 0}.eh-foot{padding:24px 28px;border-top:1px solid var(--eh-line);font-size:12px;color:var(--eh-muted)}
@media(max-width:900px){.eh-nav{padding:16px;gap:16px}.eh-tools{margin-left:0}.eh-products{gap:16px}.eh-main{padding:18px 16px 36px}.eh-grid{gap:12px}.eh-section-head{align-items:start}}
@media(max-width:640px){.eh-nav{padding:14px 16px}.eh-products{order:3;width:100%;gap:9px 16px;font-size:12px}.eh-tools{margin-left:auto;gap:12px;font-size:12px}.eh-brand{font-size:24px}.eh-main{padding:18px 12px 30px}.eh-study{gap:6px}.eh-study a{padding:8px 10px;font-size:12px}.eh-intro h1{font-size:25px}.eh-intro p{font-size:14px}.eh-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.eh-card{border-radius:13px}.eh-copy{padding:12px 10px}.eh-copy h3{font-size:15px;min-height:39px;margin-bottom:10px}.eh-copy .eh-cta{font-size:15px;padding:9px 10px}.eh-kind,.eh-note,.eh-reason{font-size:12px}.eh-new{left:8px;top:8px;padding:4px 8px;font-size:12px}.eh-section-head{display:block}.eh-section-head h2{font-size:21px}.eh-section-head p{font-size:13px}.eh-section-head>a{display:inline-block;padding:10px 0;font-size:14px}.eh-foot{padding:20px 16px}}
`

/** Pure local mockup. Query/tab selection is supplied by the preview route; there are no generation calls or application state. */
export default function EstrategiasHome({ strategy = 'A' }: { strategy?: string }) {
  const current = HOME_STRATEGIES.find(item => item.id === strategy.toUpperCase()) ?? HOME_STRATEGIES[0]
  return <div className="eh" data-home-strategy={current.id}>
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <style dangerouslySetInnerHTML={{ __html: `.eh-card-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}.eh-card-actions h3{margin:0;font-size:18px;line-height:1.3;min-width:0}.eh-card-actions .eh-cta{flex-shrink:0}.eh-copy{padding-top:10px}@media(max-width:640px){.eh-card-actions{display:grid;gap:10px;padding:12px 10px}.eh-card-actions h3{font-size:15px;min-height:39px}.eh-card-actions .eh-cta{width:100%;font-size:15px;padding-inline:8px}}` }} />
    <header className="eh-nav"><a className="eh-brand" href="/">Kineo</a><nav className="eh-products" aria-label="Products"><a href="/create/film">Films</a><a href="/create/ads">Product Ads</a><a href="/create/ads?entry=ugc">UGC Ads</a><a href="/create/cartoon">Cartoons</a><a href="/recreate">Recreate</a><a href="/made-with-kineo">Made with Kineo</a></nav><div className="eh-tools"><a href="/pricing">Pricing</a><a href="/login">Log in</a></div></header>
    <main className="eh-main">
      <nav className="eh-study" aria-label="Local strategy study"><b>LOCAL PROPOSAL · 13 NOV 2026</b>{HOME_STRATEGIES.map(item => <a key={item.id} href={`?estrategia=${item.id}`} aria-current={item.id === current.id ? 'page' : undefined}>{item.name}</a>)}</nav>
      <div className="eh-intro"><h1>{current.name}</h1><p>{current.promise}</p><p>{current.audience}</p></div>
      {current.screens.map((screen, index) => <section className="eh-screen" key={screen.title} aria-labelledby={`eh-screen-${index}`}>
        <div className="eh-section-head"><div><h2 id={`eh-screen-${index}`}>{screen.title}</h2><p>{screen.purpose}</p></div><a href="/recreate">See all photo templates →</a></div>
        <div className="eh-grid">{screen.cards.map((card, slot) => <article className="eh-card" key={card.id} data-strategy-card={card.id} data-position={index * 6 + slot + 1}>
          <div className="eh-card-actions"><h3>{card.title}</h3><a className="eh-cta" href={card.href}>{card.cta}</a></div>
          <div className="eh-media"><video src={card.video} poster={card.poster} autoPlay muted loop playsInline preload="metadata" aria-label={`${card.title} — silent preview`} />{card.fresh && <span className="eh-new">NEW</span>}</div>
          <div className="eh-copy"><p className="eh-kind">{GOALS[card.goal]}</p><p className="eh-note">{card.note}</p><details className="eh-reason"><summary>Why this position</summary><p>{card.reason}</p></details></div>
        </article>)}</div>
      </section>)}
    </main>
    <footer className="eh-foot">Study only. Existing media, real destinations, no render or purchase. The 5:6 media window contains the whole source frame; titles and buttons sit outside the picture.</footer>
  </div>
}
