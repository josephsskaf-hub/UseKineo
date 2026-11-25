import { decidirRomanceAdulto } from '@/lib/cinematic/romanceGuard'
import type { FilmLook } from '@/lib/cinematic/filmLook2511'

const OPTIONS: readonly { look: FilmLook; label: string }[] = [
  { look: 'photoreal', label: 'Realistic' },
  { look: 'animated3d', label: 'Cartoon' },
  { look: 'anime', label: 'Anime' },
]

const CSS = `
.film-style-picker{display:grid;gap:6px;min-width:0;margin-block:4px;color:var(--rc-text,var(--text))}
.film-style-picker-label{font-size:13px;font-weight:700;line-height:1.3}
.film-style-picker-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.film-style-picker button{min-height:44px;padding:4px;border:1px solid var(--rc-line,var(--border));border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.film-style-picker p{margin:0;color:var(--rc-body,var(--text2));font-size:13px;font-weight:600;line-height:1.4}
.film-style-picker button:hover{border-color:currentColor}
.film-style-picker button:focus-visible{outline:2px solid var(--rc-text,var(--text));outline-offset:2px}
.film-style-picker button[aria-pressed=true]{border-color:var(--rc-text,var(--text));background:var(--rc-text,var(--text));color:var(--rc-card,var(--card))}
`

export default function FilmStylePicker({ look, text, onSelect }: { look: FilmLook; text: string; onSelect: (look: FilmLook) => void }) {
  return <div className="film-style-picker" role="group" aria-label="Film style">
    <style>{CSS}</style>
    <span className="film-style-picker-label" aria-hidden="true">Film style</span>
    <div className="film-style-picker-options">
      {OPTIONS.map(option => (
        <button key={option.look} type="button" aria-pressed={look === option.look} onClick={() => onSelect(option.look)}>
          {option.label}
        </button>
      ))}
    </div>
    {look !== 'photoreal' && decidirRomanceAdulto(text).ativo && <p role="status">Romance films use Realistic.</p>}
  </div>
}
