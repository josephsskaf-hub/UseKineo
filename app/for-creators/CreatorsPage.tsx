'use client'

import SiteSettingsMenu from '@/components/SiteSettingsMenu'
import { useState } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import { buildAuthenticatedCreationRedirect, CREATION_HANDOFF_PROMPT_MAX_CHARS, FOR_CREATORS_CAMPAIGN as campaign } from '@/lib/creationHandoff'

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

// KINEO-FOR-CREATORS-ACABAMENTO-1611 [dono 16/11 22:53, print do iPhone]: "↗" e "✳" viravam emoji colorido no iOS (caixa azul e
// asterisco verde). Ícone desenhado em SVG, que herda a cor do texto e não depende da fonte do aparelho.
const Seta = () => <svg className="ico-seta" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7" /><path d="M8.5 7H17v8.5" /></svg>
const Faisca = () => <svg className="ico-faisca" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10Z" /></svg>

export default function CreatorsPage({ freeFilm, initialIdea }: { freeFilm: boolean; initialIdea: string }) {
  const [idea, setIdea] = useState(initialIdea)
  const tooShort = idea.length > 0 && idea.trim().length < 3
  const redirect = buildAuthenticatedCreationRedirect({ prompt: idea, campaign, createIntent: 'trial_best' })
  return <main className="creators">
    <header className="creators-nav wrap">
      <a className="brand" href="/" aria-label="Kineo home"><span className="brand-mark">k</span>kineo<span className="brand-dot">.</span></a>
      <span className="nav-label">MADE FOR CHANNEL CREATORS</span>
      <SiteSettingsMenu />
    </header>
    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span /> FOR FACELESS CHANNELS</div>
        <h1>Your channel has stories.<br /><em>Make them films.</em></h1>
        <p className="intro">Turn an idea into a narrated film with captions. For faceless creators posting three or more times a week.</p>
        <form className="idea-form" action="/signup" method="get" onSubmit={e => {
          if (idea.trim().length < 3) {
            e.preventDefault()
            const field = e.currentTarget.elements.namedItem('prompt') as HTMLTextAreaElement
            field.setCustomValidity('Enter a topic with at least 3 characters.')
            field.reportValidity()
            return
          }
          rememberSignupCampaign(campaign)
          const details = { source: campaign, placement: 'hero_form', topic_length: idea.trim().length, creation_intent: 'trial_best' }
          void trackEvent('organic_topic_submitted', details)
          void trackEvent('organic_cta_clicked', { ...details, destination: '/signup', mirrors: 'organic_topic_submitted' })
        }}>
          <label htmlFor="channel-idea">WHAT'S YOUR NEXT FILM ABOUT?</label>
          <textarea id="channel-idea" name="prompt" value={idea} onChange={e => {
            e.currentTarget.setCustomValidity('')
            setIdea(e.target.value)
          }} aria-describedby="idea-length" placeholder="A mystery, a moment in history, a question..." rows={2} minLength={3} maxLength={CREATION_HANDOFF_PROMPT_MAX_CHARS} required />
          <p id="idea-length" aria-live="polite">{tooShort
            ? 'Add a little more detail — at least 3 characters.'
            : `3–${CREATION_HANDOFF_PROMPT_MAX_CHARS.toLocaleString('en-US')} characters`}</p>
          <input type="hidden" name="create_intent" value="trial_best" />
          <input type="hidden" name="intent_campaign" value={campaign} />
          {redirect && <input type="hidden" name="redirect" value={redirect} />}
          <button type="submit" aria-describedby="idea-next-step">{freeFilm ? 'Start my first film free' : 'Start with my idea'}<span className="btn-ico" aria-hidden="true"><Seta /></span></button>
          <p id="idea-next-step" className="idea-next-step">Create an account or sign in to open your idea in Studio.{freeFilm && ' Eligible new accounts can make their first film free.'}</p>
        </form>
      </div>
      <div className="hero-visual">
        <div className="visual-top"><span>THE CREATOR'S CUT</span><span>01 / 03</span></div>
        <div className="hero-film"><video src="https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/e97ea42d-f63b-4197-9cd7-e12e9a57744d.mp4" poster="/posters/showcase-sep07/0ab3e871-2c99-4f6e-9f3c-59773208b12e.webp" autoPlay muted loop playsInline controls preload="metadata" aria-label="A Kineo film about a town in Norway" /><div className="film-overlay"><span>MADE WITH KINEO</span><strong>The town where<br />the sun disappears</strong><small>Film · sound available in player</small></div></div>
        <div className="visual-bottom"><span>IDEA → NARRATED FILM</span><span><Faisca /></span></div>
      </div>
    </section>
    <section className="examples wrap" id="films">
      <div className="section-head"><div><div className="eyebrow"><span /> FROM THE KINEO STUDIO</div><h2>Stories worth<br /><em>showing up for.</em></h2></div><p>Different subjects. Your point of view.<br />Explore previews of films made with Kineo.</p></div>
      <div className="film-grid">{films.map((film, i) => <article className="film-card" key={film.id}>
        <div className="card-media"><video src={film.gallery ? `/previews/galeria/${film.id}.mp4` : `/previews/ex-${film.id}.mp4`} poster={film.gallery ? `/posters/galeria/${film.id}.webp` : `/posters/ex-${film.id}.webp`} muted loop playsInline controls preload="none" aria-label={`Preview of ${film.title}`} /><span className="card-number">0{i + 1}</span><span className="preview-tag">PREVIEW · MUTED</span></div>
        <div className="card-info"><div className="card-category">{film.category} <span><Seta /></span></div><h3>{film.title}</h3><p>{film.detail}</p></div>
      </article>)}</div>
    </section>
    <section className="closing wrap"><div className="closing-line" /><div className="closing-content"><span>YOUR NEXT STORY STARTS HERE</span><p>Make something your<br /><em>channel can call its own.</em></p><a href="#channel-idea">Back to your idea ↑</a></div></section>
    <footer className="creators-footer wrap"><span>kineo<span className="brand-dot">.</span></span><span>MADE FOR THE STORIES YOU WANT TO TELL</span></footer>
  </main>
}

