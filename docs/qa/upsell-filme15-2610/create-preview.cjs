// Offline static comparison. Uses the current pure copy/price modules; never loads Next or environment files.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../../..')
const cache = new Map()
function load(relative) {
  let file = path.join(root, `${relative}.ts`)
  if (relative === 'lib/growth/filmComplete' && !fs.existsSync(file)) file = path.resolve(root, '../backend/lib/growth/filmComplete.ts')
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('require', 'module', 'exports', 'process', code)((name) => {
    if (!name.startsWith('@/')) throw new Error(`Nonlocal dependency: ${name}`)
    return load(name.slice(2))
  }, module, module.exports, { env: {} })
  return module.exports
}
const before = load('lib/growth/filmReady60s').film60Copy('pt', true)
const full = load('lib/growth/filmCompleteCopy')
const after = full.filmCompleteCopy('pt', true)
const email = full.filmCompleteEmail({ appUrl: 'https://www.usekineo.com', videoId: '00000000-0000-4000-8000-000000000001', dark: true, language: 'en' }).html
const nudge = full.filmCompleteEmail({ appUrl: 'https://www.usekineo.com', videoId: '00000000-0000-4000-8000-000000000001', language: 'en' }).html
const oldEmail = load('lib/growth/filmReady60s').film60Copy('en', true)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const action = (text, quiet = false) => `<a class="button${quiet ? ' quiet' : ''}" href="#">${esc(text)}</a>`
const scene = '<div class="film"><div class="moon"></div><span>Seu filme grátis · 15 s</span><div class="controls">▶ ━━━━━━━━━━━━━ 0:15</div></div>'
const download = action('⬇ Download my film (15s · MP4)') + '<p class="fine">Free copy — carries a small Kineo watermark. Yours to post anywhere.</p>'
const readyBefore = `${scene}${download}<div class="offer"><h3>${esc(before.title)}</h3><p>${esc(before.subtitle)}</p>${action(before.button)}</div>`
const readyBeforeExport = `${scene}<div class="offer"><h3>Take your video. It's yours to post.</h3><p>Finished and yours to keep — post it on YouTube Shorts, TikTok or Reels, and monetize it.</p>${action('⬇ Download my Short (15s · MP4)')}<p class="fine">WANT IT WITHOUT THE WATERMARK?</p>${action('See clean export options →', true)}</div><div class="offer" style="margin-top:18px"><h3>${esc(before.title)}</h3><p>${esc(before.subtitle)}</p>${action(before.button)}</div>`
const readyAfter = `${scene}${action('⬇ Download my film (15s · MP4)', true)}<p class="fine">Free copy — carries a small Kineo watermark. Yours to post anywhere.</p><div class="offer current"><h3>${esc(after.title)}</h3><p>${esc(after.body)}</p>${action(after.button)}<p class="fine billing">${esc(after.billing)}</p></div>`
const mailStart = '<h2 class="blue">Your Short is ready! ⚡</h2><p>Your AI-generated YouTube Short is ready to download.</p>' + action('⬇ Download Your Short')
const mailStartAfter = '<h2 class="blue">Your Short is ready! ⚡</h2><p>Your AI-generated YouTube Short is ready to download.</p>' + action('⬇ Download Your Short', true)
const mailBefore = `${mailStart}<p class="fine">Your plan and credits · Open the Studio for your next episode.</p>`
const mailAfter = `${mailStartAfter}${email}<p class="fine">Your plan and credits · Open the Studio for your next episode.</p>`
const nudgeBefore = `<h2>Your video is ready 🎬</h2>${action('Watch & download →')}<p>Your video is private by default.</p><div class="offer"><h3>${esc(oldEmail.title)}</h3><p>${esc(oldEmail.subtitle)}</p>${action(oldEmail.button)}</div>`
const nudgeAfter = `<h2>Your video is ready 🎬</h2>${action('Watch & download →', true)}<p>Your video is private by default.</p>${nudge}`
const strandedBefore = '<h2>Your video is ready 🎬</h2><p>You started a film on Kineo and we finished it for you — scenes, voiceover, captions and music, all assembled.</p>'+action('Watch my video →')+'<p class="fine">Your plan and credits · Open the Studio for your next episode.</p>'
const strandedAfter = '<h2>Your video is ready 🎬</h2><p>You started a film on Kineo and we finished it for you — scenes, voiceover, captions and music, all assembled.</p>'+action('Watch my video →', true)+nudge+'<p class="fine">Your plan and credits · Open the Studio for your next episode.</p>'
const successBefore = '<div class="check">✓</div><h2>Welcome to Kineo.</h2><p>Your plan is active.</p><p class="fine">Opening the Studio in 15…</p>'+action('Open the Studio →')
const progressAfter = '<h2>Fazendo a versão completa do seu filme</h2><p>Seu pagamento foi confirmado. A Kineo está fazendo seu filme de 35 s com o mesmo roteiro e tema, sem marca.</p><nav>Meus filmes &nbsp; · &nbsp; Falar com o suporte</nav>'
const completedAfter = '<h2>Seu filme completo está pronto</h2><p>35 segundos, sem marca — feito com seu roteiro e tema guardados.</p><div class="film full"><div class="moon"></div><span>Seu filme completo · 35 s</span><div class="controls">▶ ━━━━━━━━━━━━━ 0:35</div></div>'+action('Baixar meu filme completo — 35 s, sem marca')+'<nav>Meus filmes &nbsp; · &nbsp; Falar com o suporte</nav>'
const cancelledBefore = '<h2>Payment was not completed.</h2><p>Your selected plan is saved below.</p><div class="offer"><h3>Your selected plan</h3>'+action('Continue with Creator →')+'</div><p class="fine">What stopped you? Too expensive · Not sure which plan · I had questions</p>'
const cancelledAfter = '<h2>Seu filme está guardado</h2><p>Seu filme grátis continua aqui. Você pode voltar ao mesmo roteiro quando quiser.</p>'+scene+action('Baixar meu filme grátis')+`<p class="fine billing">${esc(full.filmCompleteCopy('pt', false).billing)}</p><a class="text-link" href="#">Continuar com Creator →</a><nav>Meus filmes &nbsp; · &nbsp; Falar com o suporte</nav>`
function pair(id, title, old, now, options = '') {
  return `<section id="${id}"><h2 class="section-title">${title}</h2><div class="pair desktop"><article><header>ANTES · desktop · main 46fa10e5</header><div class="surface ${options}">${old}</div></article><article><header>DEPOIS · desktop · 35 s</header><div class="surface ${options}">${now}</div></article></div><div class="pair mobile"><article><header>ANTES · mobile · 375 px</header><div class="surface ${options}">${old}</div></article><article><header>DEPOIS · mobile · 375 px</header><div class="surface ${options}">${now}</div></article></div></section>`
}
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kineo · Filme grátis → versão completa · antes e depois</title><style>
*{box-sizing:border-box}body{margin:0;background:#080b10;color:#f5f7fa;font-family:Inter,Arial,sans-serif;padding:36px 26px;--bg:#0b1018;--card:#131923;--text:#f5f7fa;--muted2:#b1bdcd;--accent:#2997ff;--on-accent:#fff}body>h1,body>p,body>nav,section{max-width:1250px;margin-left:auto;margin-right:auto}h1{font-size:32px;letter-spacing:-.7px}body>p{color:#a9b6c7;line-height:1.6}body>nav{display:flex;flex-wrap:wrap;gap:16px;margin-top:20px;margin-bottom:42px}a{color:#71b9ff}.section-title{font-size:23px;letter-spacing:-.3px;margin-top:48px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:32px}.pair article{min-width:0}.pair header{font-size:12px;font-weight:800;letter-spacing:.6px;color:#93a5bc;margin:0 0 12px}.surface{background:#131923;border:1px solid #2a3648;border-radius:22px;padding:28px;max-width:560px;line-height:1.5}.surface h2{font-size:26px;line-height:1.22;margin:0 0 14px}.surface h3{font-size:17px;line-height:1.3;margin:0}.surface p{font-size:14px;line-height:1.55;color:#b1bdcd;margin:10px 0 14px}.surface .fine{font-size:11px;line-height:1.5;color:#9aaac0}.surface .billing{margin:10px 0 0}.surface nav{font-size:13px;color:#75bbff;margin-top:22px}.offer{padding:16px 20px;border:1px solid #34435a;background:#16283d;border-radius:16px}.offer.current{border-color:#2997ff}.button{display:flex;align-items:center;justify-content:center;background:#2997ff;color:#fff;border-radius:12px;padding:13px 16px;text-align:center;text-decoration:none;font-size:14px;line-height:1.45;font-weight:800;width:100%}.button.quiet{background:#17283c;color:#82c2ff;border:1px solid #34435a}.film{height:240px;border-radius:14px;margin:0 0 18px;background:radial-gradient(ellipse at 55% 88%,#365268 0,#1b3144 25%,#142138 48%,#09111e 85%);position:relative;overflow:hidden;display:flex;justify-content:center;align-items:center}.film span{font-size:13px;color:#d3e9fa;background:#0a1528b3;padding:7px 11px;border-radius:8px;z-index:1}.moon{position:absolute;background:#c0d6ee;border-radius:50%;width:57px;height:57px;top:32px;left:58%;box-shadow:0 0 50px #92b6e85c}.controls{position:absolute;bottom:0;width:100%;padding:12px 16px;background:linear-gradient(transparent,#000a);font-size:12px;color:#fff;letter-spacing:2px}.mobile .surface{width:375px;max-width:100%;padding:22px}.mobile .film{height:205px}.mobile .surface h2{font-size:24px}.mobile .offer{padding:16px}.mobile{justify-items:center;max-width:1000px;margin-left:auto;margin-right:auto}.mobile article{width:375px;max-width:100%}.mail{background:#161618;font-family:Arial,sans-serif}.mail .blue{color:#2997ff}.light{background:#fff;color:#111;font-family:Arial,sans-serif}.light p{color:#475569}.light .offer{background:#fff;border:2px solid #2997ff}.light h2,.light h3{color:#111}.check{font-size:42px;color:#2997ff}.progress{margin:28px 0;height:8px;border-radius:9px;background:#243148;overflow:hidden}.progress i{display:block;height:100%;width:48%;background:#2997ff;border-radius:9px}.text-link{display:block;margin-top:10px;font-size:14px;font-weight:750}.note{border:1px solid #303d50;padding:16px;border-radius:12px;background:#101722;margin-top:40px}footer{max-width:1250px;margin:40px auto;color:#8595ac;font-size:12px}@media(max-width:820px){body{padding:24px 14px}.pair{gap:16px}.desktop{overflow:auto;grid-template-columns:560px 560px;padding-bottom:14px}.mobile{overflow:auto;grid-template-columns:375px 375px;justify-items:start;padding-bottom:14px}h1{font-size:27px}}
</style><h1>Filme grátis → versão completa</h1><p><strong>IMPLEMENTADO · comparação estática de interface, 26/10/2026.</strong> Antes = main 46fa10e5; depois = tarefa KINEO-UPSELL-FILME15-2610. Quadros de filme são representações em CSS, sem render pago. Textos e preços das ofertas vêm dos módulos reais de copy e checkout.</p><nav><a href="#pronto">Filme pronto</a><a href="#entrega">E-mail de entrega</a><a href="#lembrete">E-mail de lembrete</a><a href="#pagou">Depois de pagar</a><a href="#completo">Filme completo pronto</a><a href="#cancelou">Pagamento fechado</a></nav>
${pair('pronto','Filme pronto · ramo com caixa de export limpo',readyBeforeExport,readyAfter)}
${pair('pronto-direto','Filme pronto · ramo com download direto',readyBefore,readyAfter)}
${pair('entrega','E-mail imediato: seu filme está pronto',mailBefore,mailAfter,'mail')}
${pair('lembrete','E-mail do cron: lembrete de filme pronto',nudgeBefore,nudgeAfter,'light')}
${pair('resgate','E-mail do cron: filme concluído com a aba fechada',strandedBefore,strandedAfter,'light')}
${pair('pagou','Pagamento confirmado: geração do mesmo filme',successBefore,progressAfter)}
${pair('completo','Versão completa entregue',successBefore,completedAfter)}
${pair('cancelou','Checkout fechado sem pagamento confirmado',cancelledBefore,cancelledAfter)}
<p class="note"><strong>QUESTÃO PENDENTE:</strong> KINEO-COMPRA-AVULSA-2410 não está na main desta base. A tela atual conserva o filme e a retomada; a oferta avulsa depende da integração desse produto e não é simulada neste preview.</p><footer>FATO CONFIRMADO · fontes: GenerateClient.tsx, compose/status/[renderId]/route.ts, cron/send-video-ready/route.ts, filmCompleteCopy.ts, app/film-complete/page.tsx. Preview sem servidor, CSS inline e sem dependências externas.</footer></html>`
fs.writeFileSync(path.join(__dirname, 'preview.html'), html)
process.stdout.write('Preview written: docs/qa/upsell-filme15-2610/preview.html\n')
