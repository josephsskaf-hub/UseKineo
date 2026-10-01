'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { InterfaceLanguageSelect, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { PRODUCT_TINT, ProductStageStyles } from '@/components/ProductStage'
import ShowcaseMedia from '@/components/showcase/ShowcaseMedia'
import ShowcaseTelemetry from '@/components/showcase/ShowcaseTelemetry'
import { SHOWCASE_MEDIA, SHOWCASE_DESTINATIONS, type ShowcaseSection } from '@/lib/showcase'
import { SHOWCASE_COPY, SHOWCASE_CAPTIONS, type ShowcaseCopy } from '@/lib/showcaseCopy'
import './showcase.css'

const sections: ShowcaseSection[] = ['films', 'images', 'spaces', 'ads']
const tints = { films: ['#059669', '#22D3EE'], ...PRODUCT_TINT }

function PublicProductStage({ section, copy, index }: { section: ShowcaseSection; copy: ShowcaseCopy; index: number }) {
  const [selected, setSelected] = useState(0)
  const items = SHOWCASE_MEDIA[section]
  const item = items[selected]
  const title = copy[SHOWCASE_CAPTIONS[section][selected]]
  return <section className={`sc-section sc-${section}`} id={section} aria-labelledby={`${section}-heading`}
    style={{ '--stage-a': tints[section][0], '--stage-b': tints[section][1] } as CSSProperties}>
    <div className="sc-section-inner">
      <div className="kps-grid">
        <div className="kps-panel sc-panel">
          <span className="sc-index" aria-hidden="true">0{index + 1} / KINEO</span>
          <h2 id={`${section}-heading`}>{copy[section]}</h2>
          <p>{copy[`${section}Desc`]}</p>
          <Link className="sc-cta sc-section-cta" data-showcase-action={section} href={SHOWCASE_DESTINATIONS[section]} prefetch={false}>{copy[`${section}Cta`]} <span aria-hidden="true">↗</span></Link>
          <div className="sc-selected" aria-live="polite" aria-atomic="true">
            <span className="sc-eyebrow">{copy.house}</span>
            <h3>{title}</h3>
            <span className="sc-engine">{copy.made} <b dir="ltr">{item.badge}</b></span>
          </div>
        </div>
        <div className="kps-stage sc-stage" id={`${section}-stage`} role="group" aria-label={title}>
          <ShowcaseMedia key={item.id} item={item} title={title} copy={copy} />
          <span className="sc-stage-badge">{copy.made} <b dir="ltr">{item.badge}</b></span>
        </div>
      </div>
      <div className="kps-row sc-row" role="group" aria-label={copy[section]}>
        <div className="kps-row-grid sc-row-grid">
          {items.map((example, i) => <button type="button" className="sc-tile" data-showcase-action="select" key={example.id}
            aria-pressed={selected === i} aria-controls={`${section}-stage`} onClick={() => setSelected(i)}>
            <div className="sc-tile-image"><Image src={example.poster} alt="" fill unoptimized sizes="(max-width: 600px) 44vw, 25vw" /></div>
            <span className="sc-tile-copy"><strong>{copy[SHOWCASE_CAPTIONS[section][i]]}</strong><small dir="ltr">{example.badge}</small></span>
          </button>)}
        </div>
      </div>
    </div>
  </section>
}

export default function ShowcaseClient() {
  const copy = SHOWCASE_COPY[useInterfaceLanguage()]
  return <div className="sc-page">
    <ShowcaseTelemetry />
    <ProductStageStyles />
    <a className="sc-skip" href="#films">{copy.skip}</a>
    <header className="sc-header">
      <Link href="/" className="sc-brand" aria-label="Kineo"><KineoBrandIcon size={26} /> Kineo<span>{copy.showcase}</span></Link>
      <div className="sc-settings"><InterfaceLanguageSelect /><AppearanceSettingsButton /></div>
    </header>
    <main>
      <div className="sc-intro">
        <p className="sc-eyebrow">KINEO / {copy.showcase}</p>
        <h1>{copy.headline}</h1>
        <p className="sc-audience">{copy.intro}</p>
        <div className="sc-actions"><Link className="sc-cta sc-primary" data-showcase-action="signup" href="/signup" prefetch={false}>{copy.start} <span aria-hidden="true">↗</span></Link><Link className="sc-cta sc-secondary" data-showcase-action="pricing" href="/pricing" prefetch={false}>{copy.pricing}</Link></div>
        <nav className="sc-jump" aria-label={copy.showcase}>{sections.map((section, i) => <a key={section} href={`#${section}`}><span aria-hidden="true">0{i + 1}</span>{copy[section]}<span aria-hidden="true">↓</span></a>)}</nav>
      </div>
      {sections.map((section, index) => <PublicProductStage section={section} copy={copy} index={index} key={section} />)}
      <section className="sc-closing"><p className="sc-eyebrow">{copy.house}</p><h2>{copy.closing}</h2><Link className="sc-cta sc-primary" data-showcase-action="signup" href="/signup" prefetch={false}>{copy.start} <span aria-hidden="true">↗</span></Link></section>
    </main>
    <footer className="sc-footer"><Link href="/">Kineo</Link><span>{copy.house}</span><Link href="/pricing" prefetch={false}>{copy.pricing}</Link></footer>
  </div>
}
