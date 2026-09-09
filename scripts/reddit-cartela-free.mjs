// KINEO-RESTAURACAO-2026-09-09 — o anúncio do Reddit (única propaganda no ar) terminava
// com a cartela "7 days of Creator for $1". O $1 morreu; a cartela passa a dizer a entrada
// grátis, lida da fonte única (lib/entryPolicy via ph-fatos). Os 15 s de filme ficam iguais;
// só os 4 s finais são refeitos. Saída: public/ads/kineo-reddit-sep09-4x5-v2.mp4 e -16x9-v3.mp4.
//   node scripts/reddit-cartela-free.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fatos } from './ph-fatos.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const TRAB = join(RAIZ, '.reddit-build')
mkdirSync(TRAB, { recursive: true })
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const barras = (p) => p.replace(/\\/g, '/')
const F = fatos()
const FONTE = "'Segoe UI',system-ui,sans-serif"
const CORTE = 15 // segundo em que a cartela antiga começava (medido: quadro 14.5 = filme, 15.0 = preto)
const DUR = 19

const capturaEdge = (nomeHtml, html, destino, l, a) => {
  const arqHtml = join(TRAB, nomeHtml)
  writeFileSync(arqHtml, html)
  const args = ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${l},${a}`, '--virtual-time-budget=5000',
    `--user-data-dir=${barras(join(TRAB, 'edge'))}`, `--screenshot=${barras(destino)}`,
    'file:///' + barras(arqHtml)]
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Start-Process -FilePath '${EDGE}' -ArgumentList ${args.map((x) => "'" + x + "'").join(',')} -Wait`])
  if (!existsSync(destino)) throw new Error('Edge nao escreveu ' + destino)
}
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

const cartela = (l, a, escala) => `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${l}px;height:${a}px;color:#eef2f7;font-family:${FONTE};-webkit-font-smoothing:antialiased;background:
    radial-gradient(${Math.round(820 * escala)}px ${Math.round(480 * escala)}px at 72% 16%, rgba(59,157,255,.20), transparent 62%),
    radial-gradient(${Math.round(640 * escala)}px ${Math.round(420 * escala)}px at 10% 90%, rgba(255,184,77,.10), transparent 60%), #06080b}
  .w{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 ${Math.round(80 * escala)}px}
  .e{font-size:${Math.round(18 * escala)}px;letter-spacing:.18em;text-transform:uppercase;color:#3b9dff;font-weight:700}
  .b{font-size:${Math.round(64 * escala)}px;font-weight:800;letter-spacing:-.03em;line-height:1.06;margin:${Math.round(18 * escala)}px 0 ${Math.round(20 * escala)}px}
  .s{font-size:${Math.round(26 * escala)}px;line-height:1.45;color:#c3cddb;max-width:${Math.round(900 * escala)}px}
  .u{margin-top:${Math.round(44 * escala)}px;font-size:${Math.round(44 * escala)}px;font-weight:800;color:#fff}
</style>
<div class="w">
  <div class="e">free to start</div>
  <div class="b">${F.copy.ctaLong.replace(' →', '')}</div>
  <div class="s">${F.copy.chip}</div>
  <div class="u">usekineo.com</div>
</div>`

const SAIDAS = [
  { src: 'public/ads/kineo-reddit-sep09-4x5.mp4', dst: 'public/ads/kineo-reddit-sep09-4x5-v2.mp4', l: 1080, a: 1350, escala: 1.0 },
  { src: 'public/ads/kineo-reddit-sep09-16x9-v2.mp4', dst: 'public/ads/kineo-reddit-sep09-16x9-v3.mp4', l: 1280, a: 720, escala: 0.9 },
]
for (const s of SAIDAS) {
  const png = join(TRAB, `cartela-${s.l}x${s.a}.png`)
  capturaEdge(`cartela-${s.l}.html`, cartela(s.l, s.a, s.escala), png, s.l, s.a)
  const filme = join(TRAB, `filme-${s.l}.mp4`)
  const cart = join(TRAB, `cart-${s.l}.mp4`)
  ff(['-t', String(CORTE), '-i', join(RAIZ, s.src), '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', filme])
  ff(['-loop', '1', '-t', String(DUR - CORTE), '-i', png, '-vf', `scale=${s.l}:${s.a},format=yuv420p`, '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', cart])
  const lista = join(TRAB, `partes-${s.l}.txt`)
  writeFileSync(lista, [filme, cart].map((p) => `file '${barras(p)}'`).join('\n'))
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', join(RAIZ, s.dst)])
  console.log('ok', s.dst)
}
// cópia para a pasta que o fundador abre no upload do Reddit
const DOCS = 'C:/kineo/docs/ads'
mkdirSync(DOCS, { recursive: true })
for (const s of SAIDAS) copyFileSync(join(RAIZ, s.dst), join(DOCS, s.dst.split('/').pop()))
console.log('copiado para', DOCS)
