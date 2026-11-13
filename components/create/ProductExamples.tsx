'use client'

import { useState } from 'react'
import RecreatePlayer, { ExampleCover } from '@/app/recreate/RecreatePlayer'
import { CREATE_EXAMPLES, type CreateTab } from '@/lib/create/tabs'

export default function ProductExamples({ tab }: { tab: CreateTab }) {
  const examples = CREATE_EXAMPLES[tab]
  const [selected, setSelected] = useState<string | null>(null)
  const example = examples.find(e => e.id === selected)
  return <section className="ct-product-examples rc-gallery" aria-label="Made with Kineo examples" data-product-gallery={tab}>
    <div className="rc-gallery-heading"><h2>{tab === 'ads' ? 'Ad examples' : `Made with Kineo ${tab === 'cartoon' ? 'cartoons' : 'films'}`}</h2><p>Choose an example to watch. Use your own product in the form.</p></div>
    {example && <div style={{ maxWidth: 440, margin: '0 auto 24px' }}><RecreatePlayer key={example.id} src={example.video} poster={example.poster} preview label={example.title} /></div>}
    <div className="rc-grid">{examples.map(e => <article className="rc-card" key={e.id} data-product-example={e.id}>
      <ExampleCover src={e.video} poster={e.poster} label={`Preview ${e.title}`} onSelect={() => setSelected(e.id)} />
      <div className="rc-card-bottom"><h3>{e.title}</h3><div><button type="button" className="rc-template-action" onClick={() => setSelected(e.id)}>{e.id === selected ? 'Selected ✓' : 'Watch example ↗'}</button></div></div>
    </article>)}</div>
  </section>
}
