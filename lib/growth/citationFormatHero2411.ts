import { HOME_KIDS_CARD_CLIP, HOME_KIDS_CARD_BADGE } from '@/lib/ui/homeKidsCard'
import { HOME_CARD_PLAYLISTS } from '@/lib/ui/homeThreeCards'

// House previews already used by the public home/cartoon page. No new render.
const pumpkin = HOME_CARD_PLAYLISTS.kids_cartoon.default.find(c => c.src.endsWith('home-card-novo-pumpkin.mp4'))!
const pup = HOME_CARD_PLAYLISTS.kids_cartoon.default.find(c => c.src.endsWith('home-card-novo-werewolf_pup.mp4'))!
export const CITATION_FORMAT_HERO = {
  'cartoon-videos': { ...HOME_KIDS_CARD_CLIP!, title: 'Meet Leo', badge: HOME_KIDS_CARD_BADGE, sourcePage: '/ai-kids-cartoon-videos' },
  'animated-story-videos': { src: pumpkin.src, poster: pumpkin.poster, title: 'The little pumpkin', badge: 'Kling 3 · animated example', sourcePage: '/' },
  'animal-story-videos': { src: pup.src, poster: pup.poster, title: 'The little wolf', badge: 'Kling 3 · animal story example', sourcePage: '/' },
} as const
export type CitationFormatSlug = keyof typeof CITATION_FORMAT_HERO

const PAINT: Record<string, string> = {
  '#0E1116': 'var(--kpl-text, #0E1116)',
  '#2A2F37': 'var(--kpl-body, #2A2F37)',
  '#5A5F67': 'var(--kpl-muted, #5A5F67)',
  '#0A5CFF': 'var(--kpl-accent, #0A5CFF)',
  '#E8EFFF': 'var(--kpl-accent-soft, #E8EFFF)',
  '#FFFFFF': 'var(--kpl-card, #FFFFFF)',
  '#E4E4E0': 'var(--kpl-line, #E4E4E0)',
  '#D2D2CD': 'var(--kpl-line-2, #D2D2CD)',
}
export function citationFormatPaint(value: string): string {
  return value.replace(/#[a-fA-F0-9]{6}\b/g, color => PAINT[color] ?? color)
}

// Only the three new formats follow the visitor's dark theme.
export const CITATION_FORMAT_CSS = `

.kpl-citation-format-2411{--cfh-bg:radial-gradient(ellipse 1100px 650px at 0 0,#EEF3FF,transparent 72%),#F7F7F5}
.cfh-2411{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:28px;align-items:start;margin:24px 0 0;text-align:left}
.cfh-2411>figure{margin:0;min-width:0}
.cfh-2411 video{display:block;width:100%;aspect-ratio:9/16;object-fit:contain;background:#080c12;border:1px solid var(--kpl-line,#E4E4E0);border-radius:14px}
.cfh-2411 figcaption{font-size:12px;line-height:1.45;color:var(--kpl-muted,#5A5F67);margin-top:9px}
.cfh-2411 figcaption strong{display:block;color:var(--kpl-text,#0E1116);font-size:14px}
@media(max-width:640px){.cfh-2411{grid-template-columns:minmax(0,1fr);gap:16px}.cfh-2411>figure{grid-row:1;display:grid;grid-template-columns:100px minmax(0,1fr);gap:14px;align-items:center}.cfh-2411 video{width:100px}.cfh-2411 .cfh-form{grid-row:2}.cfh-2411 figcaption{margin:0}}
html[data-theme="dark"] .kpl-citation-format-2411{--cfh-bg:radial-gradient(ellipse 1100px 650px at 0 0,#12233b,transparent 72%),#090e16;--kpl-bg:#090e16;--kpl-card:#111b29;--kpl-text:#edf3fc;--kpl-body:#d3deed;--kpl-muted:#a8b8ce;--kpl-line:#2a3b52;--kpl-line-2:#3b4f6b;--kpl-accent:#78adff;--kpl-accent-soft:#162c4c;--kpl-accent-line:#38629d;--kpl-on-accent:#071a34;--kpl-zebra:#122037;color-scheme:dark}
html[data-theme="dark"] .kpl-citation-format-2411 .kpn{background:rgba(9,14,22,.9);color:var(--kpl-text);border-color:var(--kpl-line)}
html[data-theme="dark"] .kpl-citation-format-2411 .kpn-links a,html[data-theme="dark"] .kpl-citation-format-2411 .kpn-login,html[data-theme="dark"] .kpl-citation-format-2411 .kpn-menu a{color:var(--kpl-text)}
html[data-theme="dark"] .kpl-citation-format-2411 .kpn-menu{background:var(--kpl-card);border-color:var(--kpl-line)}
html[data-theme="dark"] .kpl-citation-format-2411 .kpn-bars i{background:var(--kpl-text)}
html[data-theme="dark"] .kpl-citation-format-2411 .kpn-right .kineo-interface-language{color:var(--kpl-text)!important;background:var(--kpl-card)!important;border-color:var(--kpl-line)!important;color-scheme:dark!important}
html[data-theme="dark"] .kpl-citation-format-2411 .klp.kpl-cards{--txt:#edf3fc;--muted:#a8b8ce;--bg:#090e16;--card:#111b29;--line:#2a3b52;--home-action:#78adff;--home-on-action:#071a34;color:#edf3fc;color-scheme:dark}
html[data-theme="dark"] .kpl-citation-format-2411 [data-pagina-clara="vitrine"] h2,html[data-theme="dark"] .kpl-citation-format-2411 [data-pagina-clara="vitrine"] p,html[data-theme="dark"] .kpl-citation-format-2411 [data-pagina-clara="vitrine"] figcaption{color:var(--kpl-text)!important}
html[data-theme="dark"] .kpl-citation-format-2411 [data-pagina-clara="vitrine"] p span{color:var(--kpl-muted)!important}
html[data-theme="dark"] .kpl-citation-format-2411 [data-pagina-clara="vitrine"] a{color:var(--kpl-accent)!important}

`
