'use client'

import Image from 'next/image'
import { UiLabel } from '@/components/InterfaceLanguage'

/** Existing concept art; the caption explicitly distinguishes it from customer results. */
export default function BusinessVisualReferences({ compact = false }: { compact?: boolean }) {
  return <div className={`business-references${compact ? ' compact' : ''}`}>
    <div className="business-reference-grid">
      <figure>
        <Image src="/design/business-ads-20260924/restaurant-concept.png" width={1536} height={1024} alt="" sizes={compact ? '340px' : '(max-width: 700px) 90vw, 45vw'} />
        <figcaption><UiLabel>Restaurant</UiLabel></figcaption>
      </figure>
      {!compact && <figure>
        <Image src="/design/neutral-20260924/product-concept.png" width={1536} height={1024} alt="" sizes="(max-width: 700px) 90vw, 45vw" />
        <figcaption><UiLabel>Product</UiLabel></figcaption>
      </figure>}
    </div>
    <p className="business-reference-note"><UiLabel>AI-generated visual concepts · not client results.</UiLabel></p>
  </div>
}
