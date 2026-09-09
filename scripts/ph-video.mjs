// KINEO-PH-2026-09-10 — O VÍDEO DE 60 s DA GALERIA DO PRODUCT HUNT.
//
// Roda:  bash scripts/ph-quadros.sh   (garante os masters em .ph-build)
//        node scripts/ph-video.mjs
// Saída: docs/ph/kineo-ph-60s.mp4 (1280x720, ~60 s, sem áudio)
//        docs/ph/kineo-ph-thumb.png (1270x760)
//
// LINGUAGEM VISUAL: a mesma do anúncio do Reddit publicado em 09/09
// (public/ads/kineo-reddit-sep09-16x9-v2.mp4) — o filme vertical INTEIRO no
// centro, laterais desfocadas do próprio filme, texto no topo. Nada de corte
// no meio do quadro: o produto é o filme 9:16, e mostrá-lo cortado seria
// vender outro produto.
//
// A faixa da marca antiga sai de tudo: crop=1080:1776:0:144.
// As frases e a cartela final saem de scripts/ph-fatos.mjs — o texto do $1 é
// o `CARD_ENTRY_COPY` da fonte única, nunca redigitado.
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { fatos } from './ph-fatos.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAIDA = join(RAIZ, 'docs', 'ph')
const TRAB = join(RAIZ, '.ph-build')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const barras = (s) => s.split('\\').join('/')

const F = fatos()
const motor = (q) => F.motores.find((m) => m.q === q)

// Trecho de cada filme: 12 s onde a cena ANDA (escolhidos vendo os quadros).
const CENAS = [
  { arq: 'robo', ini: 9.0, motor: 'cinematic_omni', titulo: 'Type an idea.',
    linha: 'Kineo writes it, directs it, narrates it and cuts it.' },
  { arq: 'dyatlov', ini: 0.4, motor: 'cinematic_kling', titulo: 'One paragraph of text.',
    linha: 'That is the whole input. Every film here started that way.' },
  { arq: 'celeste', ini: 24.0, motor: 'cinematic_ai', titulo: 'Eight engines, one button.',
    linha: 'You pick the look, not the vendor.' },
  { arq: 'maracaibo', ini: 6.0, motor: 'cinematic_hollywood', titulo: 'A finished 9:16 film.',
    linha: 'Not a clip. About three minutes on the fast engines.' },
]
const SEG = 12

const FONTE = "'Segoe UI',system-ui,sans-serif"
const capturaEdge = (nomeHtml, html, destino, l, a, transparente) => {
  const arqHtml = join(TRAB, nomeHtml)
  writeFileSync(arqHtml, html)
  const args = ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${l},${a}`, '--virtual-time-budget=5000',
    ...(transparente ? ['--default-background-color=00000000'] : []),
    `--user-data-dir=${barras(join(TRAB, 'edge'))}`, `--screenshot=${barras(destino)}`,
    'file:///' + barras(arqHtml)]
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Start-Process -FilePath '${EDGE}' -ArgumentList ${args.map((x) => "'" + x + "'").join(',')} -Wait`])
  if (!existsSync(destino)) throw new Error('Edge nao escreveu ' + destino)
}

// ── 1. as tarjas de texto, uma por cena (PNG com alpha, 1280x720) ─────────
for (const [i, c] of CENAS.entries()) {
  const m = motor(c.motor)
  capturaEdge(`tarja-${i}.html`, `<!doctype html><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1280px;height:720px;background:transparent;font-family:${FONTE};
      -webkit-font-smoothing:antialiased}
    .topo{padding:22px 40px 0;text-align:center;
      text-shadow:0 3px 18px rgba(0,0,0,.9),0 1px 3px rgba(0,0,0,.95)}
    .t{font-size:52px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.05}
    .l{font-size:27px;font-weight:600;color:#e8eef6;margin-top:10px;line-height:1.25}
    .selo{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;
      background:rgba(6,8,11,.80);border:1px solid rgba(255,255,255,.22);border-radius:9px;
      padding:8px 16px;font-size:16px;font-weight:800;letter-spacing:.09em;color:#fff}
  </style>
  <div class="topo"><div class="t">${c.titulo}</div><div class="l">${c.linha}</div></div>
  <div class="selo">${m.nome.toUpperCase()} &middot; ${m.cr60} CREDITS</div>`,
  join(TRAB, `tarja-${i}.png`), 1280, 720, true)
}

// ── 2. a cartela final (12 s), com a copy da porta pela fonte única ───────
capturaEdge('cartela.html', `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1280px;height:720px;color:#eef2f7;font-family:${FONTE};
    -webkit-font-smoothing:antialiased;background:
    radial-gradient(820px 480px at 72% 16%, rgba(59,157,255,.20), transparent 62%),
    radial-gradient(640px 420px at 10% 90%, rgba(255,184,77,.10), transparent 60%), #06080b}
  .w{height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 92px}
  .e{font-size:16px;letter-spacing:.18em;text-transform:uppercase;color:#3b9dff;font-weight:700}
  .b{font-size:56px;font-weight:800;letter-spacing:-.03em;line-height:1.06;margin:18px 0 20px}
  .s{font-size:23px;line-height:1.5;color:#c3cddb;max-width:930px}
  .u{margin-top:44px;font-size:40px;font-weight:800;color:#fff;letter-spacing:-.01em}
  .n{margin-top:14px;font-size:18px;color:#8d9aab}
</style>
<div class="w">
  <div class="e">the only way in</div>
  <div class="b">${F.copy.chip}</div>
  <div class="s">${F.copy.headline}</div>
  <div class="u">usekineo.com</div>
  <div class="n">${F.copy.noFreeTier}</div>
</div>`, join(TRAB, 'cartela.png'), 1280, 720, false)

// ── 3. um MP4 por cena: fundo desfocado + filme inteiro + tarja ───────────
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' })
const partes = []
for (const [i, c] of CENAS.entries()) {
  const saida = join(TRAB, `parte-${i}.mp4`)
  ff(['-ss', String(c.ini), '-t', String(SEG), '-i', join(TRAB, `${c.arq}.mp4`),
    '-i', join(TRAB, `tarja-${i}.png`),
    '-filter_complex',
    '[0:v]crop=1080:1776:0:144,setsar=1,split=2[bg][fg];' +
    '[bg]scale=1280:-2,crop=1280:720,boxblur=26:2,eq=brightness=-0.12:saturation=0.85[bgb];' +
    '[fg]scale=-2:720[fgs];' +
    '[bgb][fgs]overlay=(W-w)/2:0[comp];' +
    '[comp][1:v]overlay=0:0,format=yuv420p[v]',
    '-map', '[v]', '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', saida])
  partes.push(saida)
}
// cartela: 12 s da imagem parada, mesmo formato das outras partes
const cart = join(TRAB, 'parte-4.mp4')
ff(['-loop', '1', '-t', String(SEG), '-i', join(TRAB, 'cartela.png'),
  '-vf', 'format=yuv420p', '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', cart])
partes.push(cart)

// ── 4. junta tudo ────────────────────────────────────────────────────────
const lista = join(TRAB, 'partes.txt')
writeFileSync(lista, partes.map((p) => `file '${barras(p)}'`).join('\n'))
const filme = join(SAIDA, 'kineo-ph-60s.mp4')
ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', filme])

// ── 5. a thumbnail, no mesmo tamanho da galeria ──────────────────────────
const thumb = join(SAIDA, 'kineo-ph-thumb.png')
ff(['-i', join(SAIDA, 'gallery-01.png'), '-vf', 'scale=1270:760', thumb])

const mb = (p) => (readFileSync(p).length / 1024 / 1024).toFixed(2) + ' MB'
console.log('kineo-ph-60s.mp4', mb(filme))
console.log('kineo-ph-thumb.png', mb(thumb))
