// KINEO-PH-2026-09-10 — GERADOR DAS 6 IMAGENS DA GALERIA DO PRODUCT HUNT.
//
// Roda:  bash scripts/ph-quadros.sh   (baixa os masters e corta os quadros)
//        node scripts/ph-galeria.mjs  (monta e captura os 6 painéis)
// Saída: docs/ph/gallery-01..06.png, 1270x760 exatos.
//
// COMO: cada painel é um HTML montado AQUI a partir de scripts/ph-fatos.mjs
// (que executa lib/checkoutPricing.ts, lib/entryPolicy.ts, engineCost.ts e
// marketingPrice.ts) e capturado pelo Edge em modo headless. Nenhum preço,
// crédito ou contagem de filme é digitado neste arquivo — se o fundador
// repricar, é só rodar de novo e as imagens acompanham.
//
// Os quadros de filme vêm dos masters 1080x1920 da vitrine do fundador
// (lib/publicExamples.ts FOUNDER_SHOWCASE), sempre com a faixa da marca antiga
// cortada: crop=1080:1776:0:144.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { fatos } from './ph-fatos.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAIDA = join(RAIZ, 'docs', 'ph')
const TRAB = join(RAIZ, '.ph-build')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const L = 1270
const A = 760

const F = fatos()
const cr = (q) => F.motores.find((m) => m.q === q).cr60
const plano = (t) => F.planos.find((p) => p.tier === t)
const barras = (s) => s.split('\\').join('/')
const quadro = (nome) => 'file:///' + barras(join(TRAB, nome))

const BASE = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${L}px;height:${A}px;overflow:hidden;background:#06080b;color:#eef2f7;
    font-family:'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .bg{position:absolute;inset:0;background:
    radial-gradient(900px 520px at 78% 12%, rgba(59,157,255,.16), transparent 62%),
    radial-gradient(700px 460px at 8% 92%, rgba(255,184,77,.09), transparent 60%),
    #06080b}
  .p{position:relative;height:100%;padding:56px 64px;display:flex;flex-direction:column}
  .eyebrow{font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#3b9dff;font-weight:700}
  h1{font-size:58px;line-height:1.04;font-weight:800;letter-spacing:-.02em}
  h2{font-size:44px;line-height:1.08;font-weight:800;letter-spacing:-.02em}
  .sub{font-size:20px;line-height:1.5;color:#a8b4c4;font-weight:400}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;
    font-size:15px;color:#7d8a9c}
  .foot b{color:#eef2f7}
  .card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);border-radius:16px}
`

const paginas = []
const pag = (arquivo, corpo, extraCss) => paginas.push({
  arquivo,
  html: '<!doctype html><meta charset="utf-8"><style>' + BASE + (extraCss || '') +
    '</style><div class="bg"></div>' + corpo,
})

// ═══ 1 · A TESE ═══════════════════════════════════════════════════════════
pag('gallery-01.png', `
<div class="p" style="flex-direction:row;gap:56px;align-items:center">
  <div style="flex:1">
    <div class="eyebrow">usekineo.com</div>
    <h1 style="margin:18px 0 20px">Type an idea.<br>Get a cinematic short<br>in about 3&nbsp;minutes.</h1>
    <p class="sub" style="max-width:560px">One paragraph goes in. Kineo writes the script,
      directs every shot, narrates it, scores it and cuts it — and hands back a finished
      9:16 film. Not a clip. A film.</p>
    <div style="display:flex;gap:10px;margin-top:30px;flex-wrap:wrap">
      <span class="step">1 &middot; you type</span>
      <span class="step">2 &middot; it directs, narrates, scores</span>
      <span class="step">3 &middot; finished film</span>
    </div>
  </div>
  <div style="width:346px;flex:none">
    <div class="shot" style="background-image:url('${quadro('robo.png')}')">
      <span class="badge">OMNI FLASH</span>
    </div>
    <div style="text-align:center;margin-top:14px;font-size:14px;color:#7d8a9c">
      &ldquo;The robot rising from the harbor&rdquo; &mdash; made from one paragraph of text
    </div>
  </div>
</div>`, `
  .step{border:1px solid rgba(59,157,255,.42);color:#cfe4ff;background:rgba(59,157,255,.10);
    border-radius:999px;padding:9px 16px;font-size:15px;font-weight:600}
  .shot{width:346px;height:568px;border-radius:18px;background-size:cover;background-position:center;
    position:relative;border:1px solid rgba(255,255,255,.14);box-shadow:0 26px 70px rgba(0,0,0,.6)}
  .badge{position:absolute;top:14px;left:14px;background:rgba(6,8,11,.82);border:1px solid rgba(255,255,255,.18);
    border-radius:8px;padding:6px 11px;font-size:12px;font-weight:800;letter-spacing:.09em}
`)

// ═══ 2 · OS MOTORES ═══════════════════════════════════════════════════════
const cardsMotor = F.motores.map((m) => `
  <div class="card e">
    <div class="en">${m.nome}</div>
    <div class="ed">${m.desc}</div>
    <div class="ec"><b>${m.cr60}</b> credits <span>one 60s film</span></div>
  </div>`).join('')
pag('gallery-02.png', `
<div class="p">
  <div class="eyebrow">one button, ${F.motores.length} engines</div>
  <h2 style="margin:12px 0 6px">You pick the look, not the vendor.</h2>
  <p class="sub">What one 60-second film costs on each engine, in credits.</p>
  <div class="grid">${cardsMotor}</div>
  <div class="foot">
    <span>${plano('starter').nome} and ${plano('basic').nome} run Kineo 1 and Seedance.
      ${plano('pro').nome} unlocks every engine on this page.</span>
    <b>usekineo.com</b>
  </div>
</div>`, `
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px}
  .e{padding:22px 22px 20px;display:flex;flex-direction:column;min-height:196px}
  .en{font-size:21px;font-weight:800;letter-spacing:-.01em}
  .ed{font-size:14px;line-height:1.42;color:#93a1b3;margin-top:8px}
  .ec{font-size:14px;color:#a8b4c4;margin-top:auto;padding-top:14px;
    border-top:1px solid rgba(255,255,255,.08)}
  .ec b{font-size:32px;color:#3b9dff;font-weight:800;letter-spacing:-.02em;
    display:inline-block;vertical-align:-3px;margin-right:5px}
  .ec span{display:block;font-size:12px;color:#6e7b8c;margin-top:2px}
`)

// ═══ 3 · A TELA REAL ══════════════════════════════════════════════════════
pag('gallery-03.png', `
<div class="p" style="padding:44px 64px 0">
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <div>
      <div class="eyebrow">the real screen</div>
      <h2 style="margin-top:10px;font-size:34px">Every engine, with its price in the open.</h2>
    </div>
    <div style="font-size:15px;color:#7d8a9c">free to start &middot; ${F.copy.ctaShort}</div>
  </div>
  <div class="frame">
    <div class="bar"><i></i><i></i><i></i><span class="url">usekineo.com</span></div>
    <div class="view" style="background-image:url('${quadro('home.png')}')"></div>
  </div>
</div>`, `
  .frame{margin-top:22px;position:relative;border-radius:14px 14px 0 0;overflow:hidden;
    border:1px solid rgba(255,255,255,.13);border-bottom:none;box-shadow:0 -6px 60px rgba(0,0,0,.5)}
  .bar{height:38px;background:#12161c;display:flex;align-items:center;gap:7px;padding:0 14px;
    border-bottom:1px solid rgba(255,255,255,.08)}
  .bar i{width:11px;height:11px;border-radius:50%;background:#39424f;display:block}
  .url{margin-left:16px;background:#0a0d12;border-radius:7px;padding:5px 16px;font-size:13px;color:#93a1b3}
  .view{height:582px;background-size:1142px auto;background-position:top center;background-repeat:no-repeat;position:relative}
  .frame:after{content:'';position:absolute;left:0;right:0;bottom:0;height:90px;
    background:linear-gradient(to bottom, transparent, #06080b)}
`)

// ═══ 4 · OS PLANOS, EM FILMES ═════════════════════════════════════════════
const linhaFilmes = (p) => {
  const l = [`${p.fast} Kineo 1 films`, `${p.ai} Seedance films`]
  if (p.tier === 'pro') l.push(`${p.kling} Kling 2.5 films`, `${p.holly} Kling 3 films`)
  return l
}
const cardsPlano = F.planos.map((p) => `
  <div class="card pl ${p.tier === 'basic' ? 'on' : ''}">
    ${p.tier === 'basic' ? '<span class="tag">the $1 trial lands here</span>' : ''}
    <div class="pn">${p.nome}</div>
    <div class="pp">$${p.usd}<span>/mo</span></div>
    <div class="pc">${p.creditos} credits a month</div>
    <ul>${linhaFilmes(p).map((t) => '<li>' + t + '</li>').join('')}</ul>
    <div class="pg">${p.tier === 'pro' ? 'Every engine unlocked' : 'Kineo 1 + Seedance'}</div>
  </div>`).join('')
pag('gallery-04.png', `
<div class="p">
  <div class="eyebrow">pricing</div>
  <h2 style="margin:14px 0 8px">Priced in films, not in credits.</h2>
  <p class="sub">Every count below is 60-second films, worked out from what each engine charges.</p>
  <div class="pgrid">${cardsPlano}</div>
  <div class="foot"><span>Cancel anytime. The films you make are yours, watermark-free.</span><b>usekineo.com</b></div>
</div>`, `
  .pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:26px}
  .pl{padding:26px 26px 24px;position:relative;display:flex;flex-direction:column}
  .pl.on{border-color:rgba(59,157,255,.55);background:rgba(59,157,255,.075)}
  .tag{position:absolute;top:-11px;left:26px;background:#3b9dff;color:#04070b;font-size:12px;
    font-weight:800;letter-spacing:.04em;border-radius:999px;padding:4px 12px}
  .pn{font-size:21px;font-weight:800}
  .pp{font-size:46px;font-weight:800;letter-spacing:-.03em;margin-top:6px}
  .pp span{font-size:19px;font-weight:600;color:#8d9aab;letter-spacing:0}
  .pc{font-size:15px;color:#8d9aab;margin-top:2px}
  ul{list-style:none;margin:18px 0 0}
  li{font-size:17px;padding:7px 0 7px 26px;position:relative;color:#dfe7f1}
  li:before{content:'';position:absolute;left:0;top:14px;width:12px;height:12px;border-radius:3px;
    background:rgba(59,157,255,.30);border:1px solid rgba(59,157,255,.6)}
  .pg{margin-top:auto;padding-top:14px;font-size:14px;color:#7d8a9c;border-top:1px solid rgba(255,255,255,.09);padding-top:14px}
`)

// ═══ 5 · A PORTA DE $1 ════════════════════════════════════════════════════
pag('gallery-05.png', `
<div class="p" style="flex-direction:row;gap:48px;align-items:center">
  <div style="flex:1;display:flex;flex-direction:column">
    <div class="eyebrow">the only way in</div>
    <div class="big">${F.copy.chip}</div>
    <p class="hl">${F.copy.headline}</p>
    <div class="cta">${F.copy.ctaLong}</div>
    <p class="nf">${F.copy.noFreeTier}<br>Cancel anytime, in one click, from the account panel.</p>
  </div>
  <div class="leque">
    <div class="mini" style="background-image:url('${quadro('celeste.png')}');transform:rotate(-5deg) translateY(10px)"></div>
    <div class="mini" style="background-image:url('${quadro('dyatlov.png')}');z-index:2"></div>
    <div class="mini" style="background-image:url('${quadro('maracaibo.png')}');transform:rotate(5deg) translateY(10px)"></div>
  </div>
</div>`, `
  .big{font-size:46px;font-weight:800;letter-spacing:-.03em;margin:16px 0 20px;line-height:1.08;max-width:680px}
  .hl{font-size:20px;line-height:1.55;color:#c3cddb;max-width:660px}
  .cta{display:inline-block;align-self:flex-start;margin-top:30px;background:#3b9dff;color:#04070b;
    font-size:22px;font-weight:800;border-radius:999px;padding:17px 34px;
    box-shadow:0 16px 44px rgba(59,157,255,.30)}
  .nf{margin-top:22px;font-size:15px;line-height:1.6;color:#8d9aab}
  .leque{flex:none;display:flex;align-items:center}
  .mini{width:158px;height:281px;border-radius:12px;background-size:cover;background-position:center;
    border:1px solid rgba(255,255,255,.16);box-shadow:0 20px 50px rgba(0,0,0,.6);margin:0 7px}
`)

// ═══ 6 · FILMES DE VERDADE ════════════════════════════════════════════════
const QUADROS = [
  { f: 'robo2.png', motor: 'cinematic_omni', t: 'The robot rising from the harbor' },
  { f: 'dyatlov.png', motor: 'cinematic_kling', t: 'The Dyatlov Pass incident' },
  { f: 'celeste.png', motor: 'cinematic_ai', t: 'The ghost ship Mary Celeste' },
  { f: 'maracaibo.png', motor: 'cinematic_hollywood', t: 'Storm over Lake Maracaibo' },
]
const nomeMotor = (q) => F.motores.find((m) => m.q === q).nome
pag("gallery-06.png", `
<div class="p" style="padding:46px 64px">
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <div><div class="eyebrow">made with kineo</div>
      <h2 style="margin-top:10px;font-size:34px">Four films. Four engines. One text box each.</h2></div>
    <div style="font-size:15px;color:#7d8a9c">the badge is the engine that actually rendered it</div>
  </div>
  <div class="fgrid">${QUADROS.map((q) => `
    <figure><div class="fs" style="background-image:url('${quadro(q.f)}')">
      <span class="badge">${nomeMotor(q.motor).toUpperCase()}</span></div>
      <figcaption>${q.t}<b>${cr(q.motor)} credits</b></figcaption></figure>`).join('')}
  </div>
</div>`, `
  .fgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:26px}
  figure{display:flex;flex-direction:column}
  .fs{height:502px;border-radius:14px;background-size:cover;background-position:center;position:relative;
    border:1px solid rgba(255,255,255,.13)}
  .badge{position:absolute;top:12px;left:12px;background:rgba(6,8,11,.82);border:1px solid rgba(255,255,255,.18);
    border-radius:7px;padding:5px 10px;font-size:11px;font-weight:800;letter-spacing:.08em}
  figcaption{margin-top:12px;font-size:15px;color:#c3cddb;line-height:1.35;display:flex;
    flex-direction:column;gap:3px}
  figcaption b{font-size:13px;color:#3b9dff;font-weight:700}
`)

// ── captura ───────────────────────────────────────────────────────────────
mkdirSync(SAIDA, { recursive: true })
for (const nome of ['robo.png', 'robo2.png', 'dyatlov.png', 'celeste.png', 'maracaibo.png', 'home.png']) {
  if (!existsSync(join(TRAB, nome))) {
    console.error('falta ' + nome + ' em .ph-build — rode antes: bash scripts/ph-quadros.sh')
    process.exit(1)
  }
}
for (const p of paginas) {
  const html = join(TRAB, p.arquivo.replace('.png', '.html'))
  writeFileSync(html, p.html)
  const destino = join(SAIDA, p.arquivo)
  const args = ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${L},${A}`, '--virtual-time-budget=6000',
    `--user-data-dir=${barras(join(TRAB, 'edge'))}`, `--screenshot=${barras(destino)}`,
    'file:///' + barras(html)]
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Start-Process -FilePath '${EDGE}' -ArgumentList ${args.map((a) => "'" + a + "'").join(',')} -Wait`])
  console.log(p.arquivo, (readFileSync(destino).length / 1024).toFixed(0) + ' KB')
}
