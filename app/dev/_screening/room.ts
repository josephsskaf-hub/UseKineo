import { canViewScreening } from './access'
import { APPEARANCE_BOOT } from '@/lib/ui/appearance'

type Room = 'a' | 'b' | 'c'
const rooms = {
  a: {
    name: 'The screening room',
    help: 'Move across the stage or use the arrows to turn the reels.',
    first: 0,
  },
  b: {
    name: 'Words into frames',
    help: 'Type a few words to assemble a frame from the selected film.',
    first: 1,
  },
  c: {
    name: 'The film corridor',
    help: 'Travel between screens. Select a panel to open its film.',
    first: 2,
  },
} as const
const films = [
  ['volcano-scene', 'The volcano watcher', 'Veo 3.1'],
  ['lituya-h3', 'Lituya Bay: the tallest wave', 'MiniMax H3'],
  ['castle', 'The castle hiding inside a university building', 'Seedance'],
  ['tunguska-globe', 'Tunguska, 1908: the sky split open', 'Omni'],
] as const

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export async function screeningRoom(request: Request, concept: Room) {
  if (!(await canViewScreening(new URL(request.url).searchParams.getAll('k')))) return new Response('Not found', { status: 404, headers })
  const room = rooms[concept]
  const [slug, title, engine] = films[room.first]
  const filmRows = films
    .map(
      ([id, name, motor], i) =>
        `<li><button class="film-row" data-film="${id}" data-title="${name}" data-engine="${motor}" aria-pressed="${i === room.first}"><img alt="" src="/screening-room/${id}.webp" width="42" height="52"><span>${name}</span><span class="film-index" aria-hidden="true">0${i + 1}</span></button></li>`,
    )
    .join('')
  // A standalone document keeps the private query out of global tracking and the renderer out of the public shell.
  const html = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>${room.name} · Kineo</title>
<script>${APPEARANCE_BOOT}</script><link rel="stylesheet" href="/screening-room/room.css"></head>
<body data-room="${concept}" data-selected="${room.first}"><header><span class="wordmark">Kineo</span><span class="header-rule"></span><span class="header-name">Film studio</span><button id="theme" aria-label="Switch color theme" title="Switch color theme">◐</button></header>
<main><div class="intro"><p class="eyebrow">Made with Kineo</p><h1>${room.name}<i>.</i></h1></div>
<div class="exhibit"><section class="stage" aria-label="${room.name} interactive exhibit"><div id="art">
<div id="posters" aria-hidden="true">${[-1, 0, 1].map((delta, i) => `<img class="poster p${i}" alt="" src="/screening-room/${films[(room.first + delta + films.length) % films.length][0]}.webp">`).join('')}</div>
<div id="viewport"></div></div>
<div class="stage-top"><span class="slate" id="slate">Still preview</span><button type="button" id="meter" hidden aria-live="polite" title="Measure render fps for 10 seconds">Measure FPS</button></div>
<div class="stage-bottom"><div><span id="engine">${engine}</span><strong id="title">${title}</strong></div><button id="watch" aria-label="Watch selected film" title="Watch selected film">▶</button></div></section>
<aside><div class="aside-header"><p class="eyebrow">Film selection</p><span class="count">/ 04</span></div><ul>${filmRows}</ul>
<div class="controls"><div class="arrows"><button id="prev" aria-label="Previous film">←</button><button id="next" aria-label="Next film">→</button></div><button id="activate" type="button">Explore in 3D</button></div>
<p id="instructions">${room.help}</p><span id="state" role="status"></span></aside></div>
<form id="create-film" action="/studio" method="get"><label for="idea">What's your film about?</label><div class="compose"><input name="ideia" id="idea" maxlength="2000" autocomplete="off" placeholder="${concept === 'b' ? 'Type a few words…' : 'Describe your film…'}"><button class="create" type="submit">Create film <span aria-hidden="true">↗</span></button></div></form>
</main><dialog aria-labelledby="watch-title"><div class="player-head"><strong id="watch-title"></strong><button id="close" aria-label="Close player">×</button></div><video id="player" controls playsinline preload="none" poster="/screening-room/${slug}.webp"></video><button class="create player-create" type="submit" form="create-film">Create film ↗</button></dialog>
<script type="module" src="/screening-room/room.js"></script></body></html>`
  return new Response(html, { headers })
}
