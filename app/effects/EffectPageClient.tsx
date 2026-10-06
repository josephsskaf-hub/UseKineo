'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { INTERFACE_LANGUAGE_OPTIONS, interfaceLanguageIsRtl, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { effectDestination, effectPagePath, effectSlug, effectText, type EffectPageCard } from '@/lib/clips/clipEffectPages'
import EffectPreview from './EffectPreview'
import './effects.css'
import ClipTelemetry from '@/lib/clips/ClipTelemetry'

export default function EffectPageClient({ effect, language, signedIn, related, measurementActor }: {
  effect: EffectPageCard; language: InterfaceLanguage; signedIn: boolean; related: EffectPageCard[]; measurementActor: string | null
}) {
  const router = useRouter()
  const t = (text: string) => effectText(language, text)
  return <main className="effect-page" lang={language} dir={interfaceLanguageIsRtl(language) ? 'rtl' : 'ltr'}>
    <ClipTelemetry actor={measurementActor} surface="effect_page" effect={effect.key} />
    <header className="ep-nav">
      <Link href="/" className="ep-brand" aria-label="Kineo"><KineoBrandIcon size={24} /> Kineo</Link>
      <div className="ep-tools">
        <select aria-label={t('Language')} value={language} onChange={e => router.push(effectPagePath(effectSlug(effect), e.target.value as InterfaceLanguage))}>
          {INTERFACE_LANGUAGE_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.native}</option>)}
        </select>
        <AppearanceSettingsButton />
      </div>
    </header>
    <div className="ep-wrap">
      <nav className="ep-breadcrumb" aria-label={t('Clip effects')}><Link href="/clips">{t('Clip effects')}</Link><span aria-hidden="true"> / </span>{t(effect.title)}</nav>
      <section className="ep-hero" aria-labelledby="effect-title">
        <div className="ep-intro">
          <span className="ep-eyebrow">{t('Made on Kineo')}</span>
          <h1 id="effect-title">{t(effect.title)}</h1>
          <p className="ep-lead">{t(effect.sub)}</p>
          <span className="ep-engine" dir="ltr">{CLIP_ENGINES[effect.engine].label}</span>
          <ol className="ep-steps"><li>{t('Use this effect')}</li><li>{t('Add your photo')}</li><li>{t('Generate your clip')}</li></ol>
          <Link className="ep-cta" href={effectDestination(effect, signedIn)} prefetch={false} data-effect-use={effect.key} data-clip-action="use_effect" data-clip-effect={effect.key}>{t('Use this effect')} <span aria-hidden="true">↗</span></Link>
          <p className="ep-note">{t('Your result depends on your photo.')}</p>
        </div>
        <figure className="ep-stage" data-clip-action="preview">
          <EffectPreview video={effect.preview!.video} poster={effect.preview!.poster!} label={t(effect.title)} />
          <figcaption>{t('Preview made with this effect from an AI-generated photo.')}</figcaption>
        </figure>
      </section>
      <section className="ep-related" aria-labelledby="more-effects">
        <div className="ep-section-heading"><h2 id="more-effects">{t('More effects')}</h2><Link href="/clips" data-clip-action="view_all">{t('See all effects')} ↗</Link></div>
        <div className="ep-grid">{related.map(item => <Link key={item.key} className="ep-card" href={effectPagePath(effectSlug(item), language)} prefetch={false} data-clip-action="select_related" data-clip-effect={item.key}>
          {/* House posters only; no additional videos or paid renders. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.preview!.poster} alt={t(item.title)} loading="lazy" width={270} height={480} />
          <span className="ep-card-engine" dir="ltr">{CLIP_ENGINES[item.engine].label}</span>
          <h3>{t(item.title)}</h3>
        </Link>)}</div>
      </section>
      <footer className="ep-footer"><Link href="/clips">{t('Clip effects')}</Link><span>Kineo</span></footer>
    </div>
  </main>
}
