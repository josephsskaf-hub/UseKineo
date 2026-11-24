'use client'

import Link from 'next/link'
import { useEffect, useId, useState, type ComponentProps } from 'react'
import ClipsClient from '@/app/(dashboard)/clips/ClipsClient'
import RecreateClient, { type PartesDoRecreate } from '@/app/recreate/RecreateClient'
import SeuVideoRecreateClient from '@/app/recreate-preview/SeuVideoRecreateClient'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { CLIP_TEMPLATE_CATEGORIES, clipTemplateCategory, orderClipTemplates, type ClipTemplateCategory, type ClipTemplateOrder, type ClipTemplateSpec } from '@/lib/create/clipWorkspace'
import type { RecreateFormat } from '@/lib/recreate/formats'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { titulosDaGrade, type RecreateProps } from './ClipRecreateJuntos'
import CreateNavConta from './CreateNavConta'
import CreateTabs from './CreateTabs'
import './clip-workspace.css'

type Mode = 'templates' | 'motion' | 'own' | 'idea'
type OwnVideo = ComponentProps<typeof SeuVideoRecreateClient>
type Props = { measurementActor: string | null; recreate: RecreateProps; specs: Record<string, ClipTemplateSpec>; ownVideo?: OwnVideo }

function ClipCover({ formats, media }: { formats: readonly RecreateFormat[]; media: PartesDoRecreate['midia'] }) {
  const [index, setIndex] = useState(0)
  const [playOverride, setPlayOverride] = useState<boolean | null>(null)
  const [environment, setEnvironment] = useState({ visible: false, reducedMotion: true })
  const wantsPlayback = playOverride ?? !environment.reducedMotion
  const playing = environment.visible && wantsPlayback
  const visible = formats.filter(f => publicRecreatePath(f.id) !== null).slice(0, 3)
  const count = visible.length
  const current = visible[index % count]
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnvironment({ visible: !document.hidden, reducedMotion: reducedMotion.matches })
    update()
    reducedMotion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      reducedMotion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  useEffect(() => {
    if (!playing || count < 2) return
    const timer = window.setInterval(() => setIndex(position => (position + 1) % count), 7000)
    return () => window.clearInterval(timer)
  }, [count, playing])
  const asset = current ? media(current) : null
  return <div className="cw-cover">
    {asset && current && (playing ? <video key={current.id} src={asset.video} poster={asset.poster} muted autoPlay loop playsInline aria-hidden="true" /> : <img src={asset.poster} alt="" />)}
    <h1>Kineo Clips</h1>
    {count > 0 && <button aria-label={wantsPlayback ? 'Pause cover previews' : 'Play cover previews'} type="button" onClick={() => setPlayOverride(!wantsPlayback)}>{wantsPlayback ? 'Ⅱ' : '▶'}</button>}
  </div>
}

export default function ClipTemplateWorkspace({ measurementActor, recreate, specs, ownVideo }: Props) {
  const [mode, setMode] = useState<Mode>('templates')
  const [ownOpened, setOwnOpened] = useState(false)
  const [category, setCategory] = useState<ClipTemplateCategory | 'All'>('All')
  const [order, setOrder] = useState<ClipTemplateOrder>('latest')
  const orderId = useId()
  const semRepetir = titulosDaGrade(recreate.formatos)

  return <ClipsClient measurementActor={measurementActor} semRepetir={semRepetir} separateEffectPlayback moldura={clip => <RecreateClient {...recreate} clipSpecs={specs}
    onClipSelect={() => setMode(current => current === 'motion' ? current : 'templates')} moldura={rc => {
      const available = mode === 'motion' ? rc.catalogo.filter(format => format.type === 'motion') : rc.catalogo
      const categories = CLIP_TEMPLATE_CATEGORIES.filter(item => available.some(format => clipTemplateCategory(format) === item))
      const filtered = category === 'All' ? available : available.filter(format => clipTemplateCategory(format) === category)
      const gallery = orderClipTemplates(filtered, order, rc.curtidas)
      const templateMode = mode === 'templates' || mode === 'motion'
      const modes: [Mode, string, boolean][] = [
        ['templates', 'Templates', true], ['motion', 'Motion transfer', rc.catalogo.some(format => format.type === 'motion')],
        ['own', 'Your video', Boolean(ownVideo)], ['idea', 'From an idea', true],
      ]
      const switchMode = (next: Mode) => {
        if (next === mode) return
        if (rc.selecionado && !rc.soltar('/create/clip')) return
        if (next === 'own') setOwnOpened(true)
        setCategory('All')
        setMode(next)
      }

      return <main className="recreate rc-current-flow create-shell create-clip cw-workspace" data-create-shell="clip" data-clip-workspace="">
        <header className="rc-nav ct-nav"><Link href="/" className="rc-brand" onClick={rc.sair}><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active="clip" showRecreate={false} showClip /><CreateNavConta /></header>
        {clip.estilos}
        <div className="cw-grid">
          <aside className="rc-panel cw-panel" aria-label="Clip controls">
            <ClipCover formats={rc.catalogo} media={rc.midia} />
            <div className="cw-modes" role="group" aria-label="Clip mode">
              {modes.filter(([, , enabled]) => enabled).map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} disabled={rc.ocupado} onClick={() => switchMode(key)}>{label}</button>)}
            </div>
            {templateMode && rc.aviso}
            {templateMode && (rc.selecionado ? rc.painel : <>
              <div className="cw-empty-field"><strong>Reference video</strong><span>Choose a template to load its reference.</span></div>
              <div className="cw-empty-field"><strong>Your photo</strong><span>Add a photo after choosing a template.</span></div>
              <div className="cw-prompt"><label><span>Prompt</span><input type="checkbox" role="switch" disabled /></label></div>
              <div className="cw-action"><button className="rc-generate" type="button" disabled aria-describedby="cw-empty-note">Generate</button><p id="cw-empty-note">Choose a template to get started.</p></div>
            </>)}
            {mode === 'idea' && <div className="stu clips-workspace ct-clip-box">{clip.grade}</div>}
            {ownVideo && ownOpened && <div className="cw-own" hidden={mode !== 'own'}><SeuVideoRecreateClient {...ownVideo} /></div>}
          </aside>
          <div className="cw-browse">
            {templateMode && rc.selecionado && <section className="cw-preview" aria-label="Reference and output">{rc.palco}</section>}
            <section className="cw-library" ref={rc.galeriaRef} aria-label="Video templates">
              <div className="cw-library-head"><h2 tabIndex={-1}>Video templates</h2><label htmlFor={orderId}>Sort by <select id={orderId} value={order} onChange={e => setOrder(e.target.value === 'trending' ? 'trending' : 'latest')}><option value="latest">Latest</option><option value="trending">Trending</option></select></label></div>
              <div className="cw-categories" role="group" aria-label="Template categories">{(['All', ...categories] as const).map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
              <div className="rc-grid cw-cards">{gallery.map((format, index) => rc.cartao?.(format, index))}</div>
              {!gallery.length && <p className="cw-no-template">No templates in this category.</p>}
            </section>
            <details className="cw-extras"><summary>Clip effects and ideas</summary><div className="stu clips-workspace" onClickCapture={event => {
              const choice = event.target instanceof Element && event.target.closest('button[data-clip-action^="select_"]')
              if (!choice || !event.currentTarget.contains(choice)) return
              if (rc.selecionado && !rc.soltar('/create/clip')) { event.preventDefault(); event.stopPropagation(); return }
              setMode('idea')
            }}>{clip.tendencias}{clip.efeitos}</div></details>
            <div className="stu clips-workspace">{clip.meusClipes}</div>
          </div>
        </div>
        {rc.dialogo}
      </main>
    }} />} />
}
