'use client'

import { useState } from 'react'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { OWN_IDEA_REFERENCES, ownIdeaAdsHref, ownIdeaAvailable, ownIdeaCopy, ownIdeaCopyLanguage, type OwnIdeaContext, type OwnIdeaGoal, type OwnIdeaReference } from '@/lib/growth/ownIdeaStart'

type Props = OwnIdeaContext & {
  prompt: string
  onUseStarter: (goal: OwnIdeaGoal, reference: OwnIdeaReference, language: string) => void
  onReview: () => void
}

export const OWN_IDEA_START_CSS = `
.own-idea-start{margin:0 0 10px;color:var(--text);font-size:12px;min-width:0}
.own-idea-start .ois-title{display:block;margin:0 0 7px;font-size:12px;color:var(--text2)}
.own-idea-start .ois-goals{display:flex;flex-wrap:wrap;gap:6px}
.own-idea-start .ois-goal{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border:1px solid var(--border);border-radius:9px;background:var(--card2);color:var(--text2);font:inherit;padding:7px 10px;text-decoration:none;cursor:pointer}
.own-idea-start .ois-goal[aria-pressed=true]{border-color:var(--accent);color:var(--text);background:var(--accent-soft)}
.own-idea-start :is(button,a,summary):focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.own-idea-start details{margin-top:9px}
.own-idea-start summary{cursor:pointer;color:var(--muted2);font-size:11.5px;padding:3px 0}
.own-idea-start .ois-references{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0 7px}
.own-idea-start .ois-reference{min-width:0;padding:0;overflow:hidden;text-align:start;border:1px solid var(--border);border-radius:10px;background:var(--card2);color:var(--text);font:inherit;cursor:pointer}
.own-idea-start .ois-reference img{display:block;width:100%;height:88px;object-fit:cover;background:var(--card2)}
.own-idea-start .ois-reference strong{display:block;font-size:12px;line-height:1.4;margin:8px 9px 3px}
.own-idea-start .ois-reference small{display:block;font-size:11px;line-height:1.4;color:var(--muted2);margin:0 9px 9px}
.own-idea-start .ois-reference:disabled{cursor:default}
.own-idea-start .ois-reference:disabled strong{color:var(--muted2)}
.own-idea-start .ois-note{margin:7px 0;font-size:11px;line-height:1.45;color:var(--muted2)}
.own-idea-start .ois-review{margin-top:3px;min-height:34px;font:inherit;color:var(--accent);background:none;border:0;padding:5px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
@media(max-width:420px){.own-idea-start .ois-goal{font-size:11.5px;padding-inline:8px}.own-idea-start .ois-reference img{height:76px}}
`

/** Optional starting points only. No fetch, navigation effect, render or cost decision. */
export default function OwnIdeaStart(props: Props) {
  const language = useInterfaceLanguage()
  const copy = ownIdeaCopy(language)
  const [goal, setGoal] = useState<OwnIdeaGoal>('channel')
  if (!ownIdeaAvailable(props)) return null
  const hasText = Boolean(props.prompt.trim())
  const label = (text: string) => ownIdeaCopyLanguage(language) === 'en' ? <UiLabel>{text}</UiLabel> : text
  return <div className="own-idea-start" data-kineo="own-idea-start" lang={ownIdeaCopyLanguage(language)}>
    <style dangerouslySetInnerHTML={{ __html: OWN_IDEA_START_CSS }} />
    <strong className="ois-title">{label(copy.title)}</strong>
    <div className="ois-goals" role="group" aria-label={copy.title}>
      {(['channel', 'story'] as const).map(value => <button type="button" key={value} className="ois-goal" aria-pressed={goal === value} onClick={() => setGoal(value)}>{label(copy[value])}</button>)}
      <a className="ois-goal" href={ownIdeaAdsHref()}>{label(copy.product)} →</a>
    </div>
    <details>
      <summary>{label(copy.references)}</summary>
      <div className="ois-references">
        {OWN_IDEA_REFERENCES.map(reference => {
          const sea = reference.key === 'sea'
          const title = goal === 'story' ? sea ? copy.storySea : copy.storySpace : sea ? copy.channelSea : copy.channelSpace
          const hint = goal === 'story' ? sea ? copy.storySeaHint : copy.storySpaceHint : sea ? copy.channelSeaHint : copy.channelSpaceHint
          return <button type="button" key={reference.key} className="ois-reference" disabled={hasText} onClick={() => { if (!hasText) props.onUseStarter(goal, reference.key, language) }}>
            <img src={reference.poster} alt={sea ? copy.seaAlt : copy.spaceAlt} width={240} height={88} loading="lazy" style={{ objectPosition: reference.position }} />
            <strong>{label(title)}</strong><small>{label(hint)}</small>
          </button>
        })}
      </div>
      <p className="ois-note">{label(copy.disclosure)}</p>
      <p className="ois-note">{label(hasText ? copy.preserved : copy.empty)}</p>
      <button type="button" className="ois-review" onClick={props.onReview}>{label(copy.review)} →</button>
    </details>
  </div>
}
