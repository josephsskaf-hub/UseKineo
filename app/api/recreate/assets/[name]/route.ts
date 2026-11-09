import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { RECREATE_ASSETS } from '@/lib/recreate/formats'
import { recreateSession, RECREATE_HEADERS } from '@/lib/recreate/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const { user } = await recreateSession()
  if (!user || !Object.hasOwn(RECREATE_ASSETS, params.name)) return new NextResponse(null, { status: 404, headers: RECREATE_HEADERS })
  const asset = RECREATE_ASSETS[params.name as keyof typeof RECREATE_ASSETS]
  const bytes = await readFile(path.join(process.cwd(), 'lib/recreate/assets', asset.file))
  const headers = { ...RECREATE_HEADERS, 'Content-Type': asset.contentType, 'Accept-Ranges': 'bytes' }
  const range = req.headers.get('range')
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range)
    const start = match ? Number(match[1]) : -1
    const end = match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
    if (start < 0 || start > end) return new NextResponse(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${bytes.length}` } })
    return new NextResponse(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end - start + 1) } })
  }
  return new NextResponse(bytes, { headers: { ...headers, 'Content-Length': String(bytes.length) } })
}
