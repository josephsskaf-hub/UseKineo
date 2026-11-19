import { NextRequest, NextResponse } from 'next/server'
import { canViewScreening, hasScreeningKey } from '../../_screening/access'
import { cookieName, makePass, maxAge } from '../pass'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const keys = request.nextUrl.searchParams.getAll('k')
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' }
  if (!(await canViewScreening(keys))) return new Response('Not found', { status: 404, headers })
  const v = request.nextUrl.searchParams.get('v')
  const response = new NextResponse(null, { status: 303, headers: { ...headers, Location: '/dev/home-3d' + (v === 'b' ? '?v=b' : '') } })
  if (hasScreeningKey(keys)) response.cookies.set(cookieName, makePass(Math.floor(Date.now() / 1000) + maxAge), {
    path: '/dev/home-3d', httpOnly: true, sameSite: 'strict', secure: request.nextUrl.protocol === 'https:', maxAge,
  })
  return response
}
