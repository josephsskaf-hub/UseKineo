// KINEO-HOME-DOIS-EIXOS-0611 — cards de cima no tamanho de sempre (fundador 06/11: "volta pro que tava"); os vídeos de várias câmeras abrem a vitrine, com selo do motor real.
import { readFileSync, existsSync } from 'node:fs'
const ler = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
let falhas = 0
const ok = (n, v) => { console.log((v ? '  ok   ' : '  FALHA ') + n); if (!v) falhas++ }
const css = ler('app/appearance.css'), m = ler('components/home/HomeMosaic.tsx')
ok('cards de cima sem altura fixa', !css.includes('KINEO-HOME-DOIS-EIXOS-0611') && !/k3c-card\{aspect-ratio:auto/.test(css))
ok('2 vídeos abrem a vitrine da home, em fileira cheia', m.includes('[...HOME_MOTION_TILES, ...ordem]') && (m.match(/kind: 'motion', title/g) || []).length === 3)
ok('página Made with Kineo sem os 2', m.includes('if (opts.full) return ordem'))
ok('selo do motor real', m.includes('Multi-camera · Kling 3'))
for (const f of ['public/previews/motion-surf-0611.mp4', 'public/previews/motion-rua-0611.mp4', 'public/posters/motion-surf-0611.webp', 'public/posters/motion-rua-0611.webp', 'public/previews/motion-corrida-0611.mp4', 'public/posters/motion-corrida-0611.webp']) ok('arquivo ' + f, existsSync(new URL('../' + f, import.meta.url)))
if (falhas) { console.error(falhas + ' FALHA(S)'); process.exit(1) }
console.log('TUDO OK')
