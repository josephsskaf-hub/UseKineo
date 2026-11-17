'use client'

import { useState } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import { buildAuthenticatedCreationRedirect, CREATION_HANDOFF_PROMPT_MAX_CHARS } from '@/lib/creationHandoff'

const campaign = 'for_creators_1611'
const films = [
  { category: 'MYSTERY', title: 'The ghost ship Mary Celeste', id: 'filme-mary-celeste', detail: 'An empty ship. An unanswered question.', gallery: true },
  { category: 'MYSTERY', title: 'The Dyatlov Pass incident', id: 'f3de57b0-3486-4400-ba72-c9390774d426', detail: 'A mystery in the mountains.' },
  { category: 'MYSTERY', title: 'The mystery of Flight 19', id: '41924eb2-d81d-4f2c-a5bb-5477c042af04', detail: 'A disappearance over the ocean.' },
  { category: 'HISTORY', title: 'The 2,000-year-old computer', id: 'filme-anticitera', detail: 'An ancient discovery with a story to tell.', gallery: true },
  { category: 'HISTORY', title: 'Pompeii: the wrong day', id: 'b8c50f61-2843-41f3-a803-ac5a4bb509f5', detail: 'A moment in history, brought to life.' },
  { category: 'HISTORY', title: 'The Halifax explosion, 1917', id: '7579e8d7-97ff-4be7-91c9-fe11f6698a00', detail: 'A story from the past.' },
  { category: 'CURIOSITY', title: 'The Door to Hell is fading', id: 'filme-porta-do-inferno', detail: 'A place that looks like another world.', gallery: true },
  { category: 'CURIOSITY', title: 'The lake that turns animals to stone', id: '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', detail: 'A remarkable natural phenomenon.' },
  { category: 'CURIOSITY', title: 'The river that boils', id: 'c1f80b50-1de6-4140-9ce4-b4cfbeb185c3', detail: 'A question from the natural world.' },
]

export default function CreatorsPage({ freeFilm }: { freeFilm: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [idea, setIdea] = useState('')
  const valid = idea.trim().length >= 3 && idea.trim().length <= CREATION_HANDOFF_PROMPT_MAX_CHARS
  const redirect = buildAuthenticatedCreationRedirect({ prompt: idea, campaign, createIntent: 'trial_best' })
  const action = freeFilm ? 'Start my first film free' : 'Start with my idea'
  return <main className="creators" data-theme={theme}>
    <header className="creators-nav wrap">
      <a className="brand" href="/" aria-label="Kineo home"><span className="brand-mark">k</span>kineo<span className="brand-dot">.</span></a>
      <span className="nav-label">MADE FOR CHANNEL CREATORS</span>
      <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span> {theme === 'dark' ? 'Light' : 'Dark'}</button>
    </header>
    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span /> FOR FACELESS CHANNELS</div>
        <h1>Your channel has stories.<br /><em>Make them films.</em></h1>
        <p className="intro">Turn an idea into a narrated film with captions. For faceless creators posting three or more times a week.</p>
        <form className="idea-form" action="/signup" method="get" onSubmit={e => {
          if (!valid) { e.preventDefault(); return }
          rememberSignupCampaign(campaign)
          const details = { source: campaign, placement: 'hero_form', topic_length: idea.trim().length, creation_intent: 'trial_best' }
          void trackEvent('organic_topic_submitted', details)
          void trackEvent('organic_cta_clicked', { ...details, destination: '/signup', mirrors: 'organic_topic_submitted' })
        }}>
          <label htmlFor="channel-idea">WHAT'S YOUR NEXT FILM ABOUT?</label>
          <textarea id="channel-idea" name="prompt" value={idea} onChange={e => setIdea(e.target.value)} placeholder="A mystery, a moment in history, a question..." rows={2} minLength={3} maxLength={CREATION_HANDOFF_PROMPT_MAX_CHARS} required />
          <input type="hidden" name="create_intent" value="trial_best" />
          <input type="hidden" name="intent_campaign" value={campaign} />
          {redirect && <input type="hidden" name="redirect" value={redirect} />}
          <button type="submit" disabled={!valid}>{action}<span aria-hidden="true">↗</span></button>
          <p>{freeFilm ? 'For eligible new accounts · Your idea follows you through signup' : 'Your idea follows you through signup'}</p>
        </form>
      </div>
      <div className="hero-visual">
        <div className="visual-top"><span>THE CREATOR'S CUT</span><span>01 / 03</span></div>
        <div className="hero-film"><video src="https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/e97ea42d-f63b-4197-9cd7-e12e9a57744d.mp4" poster="/posters/showcase-sep07/0ab3e871-2c99-4f6e-9f3c-59773208b12e.webp" autoPlay muted loop playsInline controls preload="metadata" aria-label="A Kineo film about a town in Norway" /><div className="film-overlay"><span>MADE WITH KINEO</span><strong>The town where<br />the sun disappears</strong><small>Film · sound available in player</small></div></div>
        <div className="visual-bottom"><span>IDEA → NARRATED FILM</span><span>✳</span></div>
      </div>
    </section>
    <section className="examples wrap" id="films">
      <div className="section-head"><div><div className="eyebrow"><span /> FROM THE KINEO STUDIO</div><h2>Stories worth<br /><em>showing up for.</em></h2></div><p>Different subjects. Your point of view.<br />Explore previews of films made with Kineo.</p></div>
      <div className="film-grid">{films.map((film, i) => <article className="film-card" key={film.id}>
        <div className="card-media"><video src={film.gallery ? `/previews/galeria/${film.id}.mp4` : `/previews/ex-${film.id}.mp4`} poster={film.gallery ? `/posters/galeria/${film.id}.webp` : `/posters/ex-${film.id}.webp`} muted loop playsInline controls preload="none" aria-label={`Preview of ${film.title}`} /><span className="card-number">0{i + 1}</span><span className="preview-tag">PREVIEW · MUTED</span></div>
        <div className="card-info"><div className="card-category">{film.category} <span>↗</span></div><h3>{film.title}</h3><p>{film.detail}</p></div>
      </article>)}</div>
    </section>
    <section className="closing wrap"><div className="closing-line" /><div className="closing-content"><span>YOUR NEXT STORY STARTS HERE</span><p>Make something your<br /><em>channel can call its own.</em></p><a href="#channel-idea">Back to your idea ↑</a></div></section>
    <footer className="creators-footer wrap"><span>kineo<span className="brand-dot">.</span></span><span>MADE FOR THE STORIES YOU WANT TO TELL</span></footer>
  </main>
}

