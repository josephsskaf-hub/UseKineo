import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import HomePage from '../../page'
import { CLIPES_NO_TOPO, clipeNovoPoster } from '@/lib/clipesNos2Lugares'
import { canViewScreening } from '../_screening/access'
import { cookieName, validPass } from './pass'
import HomeProjection from '@/components/home/HomeProjection'
import './preview.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Kineo · Home preview' }, robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function HomePreview({ searchParams = {} }: { searchParams?: { v?: string } }) {
  if (!validPass(cookies().get(cookieName)?.value) && !(await canViewScreening([]))) notFound()
  const placement = searchParams.v === 'b' ? 'b' : 'a'
  return (
    <div data-home-projection={placement}>
      {/* In B the existing mosaic enters the first fold. Its lazy posters were the last LCP candidates. */}
      {placement === 'b' && CLIPES_NO_TOPO.slice(0, 3).map(id => (
        <link key={id} rel="preload" as="image" href={clipeNovoPoster({ id })} fetchPriority="high"
          media="(min-width: 1024px) and (min-height: 600px)" />
      ))}
      <HomePage /><HomeProjection placement={placement} />
    </div>
  )
}
