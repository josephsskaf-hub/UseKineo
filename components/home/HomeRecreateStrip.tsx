import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { publicRecreateCatalog } from '@/lib/recreate/catalogPublic'

// Curated IDs only: media, availability and destinations remain in the public catalog.
const FEATURED = ['passarela', 'effect-pet-bee', 'effect-pet-lion', 'effect-giant-product', 'effect-santa-cartoon', 'effect-pet-xmas-angel']
export default function HomeRecreateStrip({ signedIn }: { signedIn: boolean }) {
  const catalog = publicRecreateCatalog()
  const items = FEATURED.flatMap(id => { const item = catalog.find(x => x.id === id); return item ? [item] : [] })
  if (!items.length) return null
  return <section className="hrr" aria-labelledby="home-recreate-heading">
    <style dangerouslySetInnerHTML={{ __html: `.hrr{max-width:1240px;margin:16px auto 20px;padding:20px;border:1px solid var(--border);border-radius:20px;background:var(--card);color:var(--text)}.hrr-head{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.hrr h2{margin:0;font-size:24px;letter-spacing:-.02em}.hrr-head a{font-size:14px;color:inherit}.hrr-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.hrr-card{position:relative;display:block;aspect-ratio:5/6;overflow:hidden;border-radius:15px;background:var(--card2) center/contain no-repeat}.hrr-card video{object-fit:contain!important}.hrr-card:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.hrr-card:after{content:'';position:absolute;inset:30% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.75));pointer-events:none}.hrr-copy{position:absolute;z-index:1;inset:auto 10px 12px;color:#fff;display:grid;gap:10px}.hrr-copy b{font-size:14px;line-height:1.3}.hrr-pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:999px;padding:10px 14px;background:#fff;color:#101318;font-size:15px;font-weight:800;box-shadow:0 3px 0 #cbd0d8}@media(max-width:900px){.hrr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:640px){.hrr{margin:12px 16px;padding:16px}.hrr-grid{display:flex;overflow-x:auto;gap:12px;padding-bottom:6px;scroll-snap-type:x mandatory}.hrr-card{flex:0 0 44vw;scroll-snap-align:start}.hrr h2{font-size:22px}.hrr-head a{font-size:13px}}` }} />
    <div className="hrr-head"><h2 id="home-recreate-heading">Recreate</h2><Link href="/recreate">See all templates →</Link></div>
    <div className="hrr-grid">{items.map(item => <Link key={item.id} href={signedIn ? `/recreate/${item.id}` : item.href} className="hrr-card" style={{ backgroundImage: `url(${item.poster})` }} aria-label={`Recreate ${item.title}`} data-home-recreate={item.id}>
      <WallMedia src={item.video} /><span className="hrr-copy"><b>{item.title}</b><span className="hrr-pill">Recreate ↗</span></span>
    </Link>)}</div>
  </section>
}
