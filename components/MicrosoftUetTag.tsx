// KINEO-MS-UET-1111 — a tag UET da Microsoft Ads (regras e porquê em lib/growth/microsoftUet.ts). Mesma forma do gtag
// do layout: next/script com strategy="afterInteractive", dentro do pacote de marketing que o ConsentManager só monta com
// consentimento.
import Script from 'next/script'
import type { ReactNode } from 'react'
import { msUetSnippet } from '@/lib/growth/microsoftUet'

export default function MicrosoftUetTag({ tagId }: { tagId: string }) {
  const snippet = msUetSnippet(tagId)
  if (!snippet) return null
  return (
    <Script id="ms-uet" strategy="afterInteractive">
      {snippet}
    </Script>
  )
}

/** Sem ID = o MESMO elemento de marketing (nada muda no HTML); com ID = o mesmo pacote + a tag UET, uma vez. */
export function withMicrosoftUet(marketing: ReactNode, tagId: string | null): ReactNode {
  if (!tagId) return marketing
  return (
    <>
      {marketing}
      <MicrosoftUetTag tagId={tagId} />
    </>
  )
}
