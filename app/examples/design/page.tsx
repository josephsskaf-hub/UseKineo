import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEngineHero, getExamplesBest, type WallVideo } from '@/lib/engineWall'
import { expandExamples } from '@/lib/ui/examplesGallery'
import { showcasePoster } from '@/lib/ui/showcaseGallery'
import ExamplesGallery from '../ExamplesGallery'
import styles from '../ExamplesGallery.module.css'

export const metadata: Metadata = { title: 'Kineo — quatro montagens para revisão', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const arrangements = [
  { name: '01 · Cinema e atmosfera', note: 'Faroleiro em destaque, com vulcão e suspense ao lado.', ids: ['b5434412-62b9-48f5-9a10-c36e2e725c9f','6b9b363c-3185-4db7-a877-46b77e334f06','ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb','90bd8367-60c6-4811-8fdd-3a5b0200eec6','d6d73a90-9bd7-46a3-826a-9a4a72549e05','cbd676d0-340a-4728-8a5f-439fd9dd64c5'] },
  { name: '02 · Aventura e contraste', note: 'Vulcão em destaque, contrastando com as montanhas e o mar.', ids: ['6b9b363c-3185-4db7-a877-46b77e334f06','f3de57b0-3486-4400-ba72-c9390774d426','cbd676d0-340a-4728-8a5f-439fd9dd64c5','b5434412-62b9-48f5-9a10-c36e2e725c9f','c4e4fbab-0978-4daa-9fcf-119096370210','b8c50f61-2843-41f3-a803-ac5a4bb509f5'] },
  { name: '03 · Pessoas e realismo', note: 'Kling 3 no destaque principal, seguido de duas atuações diferentes.', ids: ['216cbed2-b95f-47e7-98bc-e4c3fc3010a9','ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb','b5434412-62b9-48f5-9a10-c36e2e725c9f','d6d73a90-9bd7-46a3-826a-9a4a72549e05','4b12925e-16e6-4b56-af5a-7047f9ae7a28','94d551a3-fe7a-4903-8c2b-f252bed39c4c'] },
  { name: '04 · Tecnologia e imaginação', note: 'Robô em destaque, com servidores e exploração espacial.', ids: ['36a04f7b-65f7-42d9-a2ab-198b5a7f115e','98a5ac54-3c28-4a8f-8ba2-4071bc0388c4','ca6c04df-6c08-48cb-b1ce-a43b1b171869','a66e975a-3f6c-4bf4-9510-cd15b895b58b','fe055601-0668-4d33-be49-82c1cb033779','33249fbf-57b6-47cf-8486-88bfb2a02db1'] },
] as const

const posters: Record<string, string> = {
  'b5434412-62b9-48f5-9a10-c36e2e725c9f':'lighthouse',
  '6b9b363c-3185-4db7-a877-46b77e334f06':'volcano',
  '216cbed2-b95f-47e7-98bc-e4c3fc3010a9':'presenter',
  '98a5ac54-3c28-4a8f-8ba2-4071bc0388c4':'servers',
  'c4e4fbab-0978-4daa-9fcf-119096370210':'rome',
}

// Review surface only: never publicly enabled on the production deployment.
export default async function ExamplesDesign({ searchParams }: { searchParams: { option?: string } }) {
  if (process.env.VERCEL_ENV !== 'preview') notFound()
  const index = Math.max(0, Math.min(3, (Number(searchParams.option) || 1) - 1))
  const selection = arrangements[index] ?? arrangements[0]
  const [examples, hero] = await Promise.all([getExamplesBest(), getEngineHero()])
  const stock = new Map<string, WallVideo>([...expandExamples(examples), ...hero].map(v=>[v.id,v]))
  const preferred = selection.ids.map(id=>stock.get(id)).filter((v): v is WallVideo => Boolean(v))
  const used = new Set(preferred.map(v=>v.id))
  const videos = [...preferred, ...stock.values()].filter((v,i)=>i < preferred.length || !used.has(v.id)).map(v=>({
    ...v, posterUrl: posters[v.id] ? `/posters/examples-sep24/${posters[v.id]}.webp` : (v.posterUrl ?? showcasePoster(v)),
  }))
  return <main className={styles.page}>
    <div className={styles.reviewBar}>
      <strong>Prévia para escolha · {selection.name}</strong>
      <nav aria-label="Escolher montagem">{arrangements.map((item,i)=><Link key={item.name} href={`/examples/design?option=${i+1}`} aria-current={index===i?'page':undefined}>{item.name}</Link>)}</nav>
      <span>{selection.note} Vídeos reais do acervo aprovado; produção permanece inalterada.</span>
    </div>
    <header className={styles.pageHeader}><div className={styles.headerInner}>
      <Link href="/" className={styles.brand}><span className={styles.brandIcon} aria-hidden="true">ϟ</span>Kineo</Link>
      <nav className={styles.nav} aria-label="Main navigation"><Link href="/examples" aria-current="page">Explore</Link><Link href="/pricing">Pricing</Link><Link href="/studio" className={styles.navCta}>Open Studio</Link></nav>
    </div></header>
    <section className={styles.content}>
      <div className={styles.intro}><div><h1>Watch what Kineo actually makes.</h1><p>Explore selected previews from films made with Kineo. Find a style, watch it, and start with your own idea.</p></div></div>
      <ExamplesGallery key={selection.name} videos={videos.slice(0, 6)} startPaused />
    </section>
  </main>
}
