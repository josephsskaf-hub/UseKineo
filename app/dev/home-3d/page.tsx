import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import HomePage from '../../page'
import { canViewScreening } from '../_screening/access'
import { cookieName, validPass } from './pass'
import HomeProjection from './HomeProjection'
import './preview.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Kineo · Home preview' }, robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function HomePreview({ searchParams = {} }: { searchParams?: { v?: string } }) {
  if (!validPass(cookies().get(cookieName)?.value) && !(await canViewScreening([]))) notFound()
  const placement = searchParams.v === 'b' ? 'b' : 'a'
  return <div data-home-projection={placement}><HomePage /><HomeProjection placement={placement} /></div>
}
