// KINEO-HOME-DOIS-EIXOS-0611 — cards de cima mais baixos só no computador; os 2 vídeos de várias câmeras abrem a vitrine, com selo do motor real.
import { readFileSync, existsSync } from 'node:fs'
const ler = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
let falhas = 0
const ok = (n, v) => { console.log((v ? '  ok   ' : '  FALHA ') + n); if (!v) falhas++ }
const css = ler('app/appearance.css'), m = ler('components/home/HomeMosaic.tsx')
const b = css.slice(css.indexOf('KINEO-HOME-DOIS-EIXOS-0611'))
ok('altura menor só no computador', b.includes('@media (min-width:761px)') && /\.k3c-card\{aspect-ratio:auto!important;height:clamp\(300px,42vh,400px\)!important\}/.test(b))
ok('2 vídeos abrem a vitrine da home, em fileira cheia', m.includes('[...HOME_MOTION_TILES, ...ordem]') && (m.match(/kind: 'motion', title/g) || []).length === 3)
ok('página Made with Kineo sem os 2', m.includes('if (opts.full) return ordem'))
ok('selo do motor real', m.includes('Multi-camera · Kling 3'))
for (const f of ['public/previews/motion-surf-0611.mp4', 'public/previews/motion-rua-0611.mp4', 'public/posters/motion-surf-0611.webp', 'public/posters/motion-rua-0611.webp', 'public/previews/motion-corrida-0611.mp4', 'public/posters/motion-corrida-0611.webp']) ok('arquivo ' + f, existsSync(new URL('../' + f, import.meta.url)))
if (falhas) { console.error(falhas + ' FALHA(S)'); process.exit(1) }
console.log('TUDO OK')
