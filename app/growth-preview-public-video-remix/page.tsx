import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Growth preview — public video remix',
  robots: { index: false, follow: false },
}

export default function PublicVideoRemixPreviewPage() {
  const html = readFileSync(
    join(process.cwd(), 'docs/previews/PUBLIC-VIDEO-REMIX-2026-08-27.html'),
    'utf8',
  )
  return (
    <iframe
      title="Public video remix before and after"
      srcDoc={html}
      style={{ width: '100%', height: '100vh', border: 0, display: 'block', background: '#08090b' }}
    />
  )
}
