import { useId } from 'react'
import type { FilmVoiceMode } from '@/lib/cinematic/filmVoice2511'

const OPTIONS = [
  { mode: 'narrator', label: 'Narrator' },
  { mode: 'characters', label: 'Characters talk' },
] as const

const CSS = `
.film-voice-picker{display:grid;gap:6px;margin-block:8px;min-width:0;color:var(--rc-text,var(--txt,var(--text)))}
.film-voice-label{font-size:13px;font-weight:700;line-height:1.3}
.film-voice-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.film-voice-options button{min-height:44px;padding:4px 8px;border:1px solid var(--rc-line,var(--line,var(--border)));border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.film-voice-options button[aria-pressed=true]{border-color:currentColor;background:#2997ff;color:#091321}
.film-voice-options button:hover:not(:disabled){border-color:currentColor}
.film-voice-options button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.film-voice-options button:disabled{cursor:default}
.film-voice-picker p{margin:0;font-size:13px;line-height:1.4;color:var(--rc-body,var(--muted,var(--text2,currentColor)))}
`

export default function FilmVoicePicker({ value, onSelect, disabled }: {
  value: FilmVoiceMode
  onSelect: (mode: FilmVoiceMode) => void
  disabled?: boolean
}) {
  const label = useId()
  const hint = useId()
  return <div className="film-voice-picker" role="group" aria-labelledby={label} aria-describedby={hint}>
    <style>{CSS}</style>
    <span className="film-voice-label" id={label}>Voice</span>
    <div className="film-voice-options">
      {OPTIONS.map(option => <button key={option.mode} type="button" aria-pressed={value === option.mode} disabled={disabled} onClick={() => onSelect(option.mode)}>{option.label}</button>)}
    </div>
    <p id={hint}>For a 15-second photorealistic film in English, write 29–45 spoken words for up to two adults. Use an approved character photo. Other films use narration.</p>
  </div>
}
