// KINEO-EMAIL-FILME-NA-PAGINA-1111 — guardião: o botão do e-mail "filme pronto" leva à página do filme (/history?v=<id>,
// via /api/email/filme-pronto, que conta o clique), o MP4 direto fica como linha secundária, e o interruptor desligado
// devolve o e-mail de antes BYTE A BYTE. Rodar: node scripts/test-email-filme-na-pagina-1111.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function carrega(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (dep) => { throw new Error('emailFilmePronto deixou de ser puro: ' + dep) })
  return mod.exports
}
const { normalizeInternalRedirect } = carrega(lf('lib/authRedirect.ts'))

const FONTE = lf('lib/growth/emailFilmePronto.ts')
const APP = 'https://www.usekineo.com'
const ID = 'f2e8cffc-b49e-495e-868d-e2470dce82d5'
const RAW = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/u/r.mp4'

function confereModulo(M) {
  const r = {}
  const on = M.emailFilmeBotao({ appUrl: APP, videoId: ID, rawUrl: RAW, live: true })
  r.hrefPassaPeloClique = on.href === `${APP}/api/email/filme-pronto?v=${ID}`
  r.rotulo = on.label === '▶ Watch your film'
  r.mp4Secundario = on.secondaryHtml.includes(`href="${RAW}"`) && on.secondaryHtml.includes('download the file')
  r.carimbo = on.paginaDoFilme === true
  const off = M.emailFilmeBotao({ appUrl: APP, videoId: ID, rawUrl: RAW, live: false })
  r.desligadoIgual = off.href === RAW && off.label === '⬇ Download Your Short' && off.secondaryHtml === '' && off.paginaDoFilme === false
  const semId = M.emailFilmeBotao({ appUrl: APP, videoId: null, rawUrl: RAW, live: true })
  const idRuim = M.emailFilmeBotao({ appUrl: APP, videoId: '"><script>', rawUrl: RAW, live: true })
  r.semIdIgualAntes = semId.href === RAW && semId.secondaryHtml === '' && idRuim.href === RAW
  const destino = M.emailFilmeDestino(ID)
  const q = new URLSearchParams(destino.split('?')[1] ?? '')
  r.destinoPagina = destino.startsWith('/history?') && q.get('v') === ID && q.get('utm_source') === 'video_ready_email' && q.get('utm_medium') === 'email'
  r.destinoInterno = normalizeInternalRedirect(destino) === destino
  r.interruptorLigado = M.EMAIL_FILME_NA_PAGINA_LIVE === true
  return r
}

const M = carrega(FONTE)
const c = confereModulo(M)
ok(c.hrefPassaPeloClique, 'o botão passa por /api/email/filme-pronto?v=<id> (o clique fica contado)')
ok(c.rotulo, 'o botão diz "▶ Watch your film"')
ok(c.mp4Secundario, 'o MP4 direto continua no e-mail: "or download the file"')
ok(c.carimbo, 'o evento video_ready_email_sent ganha o carimbo film_page_link')
ok(c.desligadoIgual, 'interruptor desligado: botão, texto e linha de antes')
ok(c.semIdIgualAntes, 'sem id do filme (ou id inválido): o botão de antes, nunca um link quebrado')
ok(c.destinoPagina, 'destino: /history?v=<id> com utm_source=video_ready_email')
ok(c.destinoInterno, 'o destino passa pelo guarda do login (normalizeInternalRedirect) sem mudar')
ok(c.interruptorLigado, 'o interruptor nasce ligado')

// ── o e-mail: com o interruptor desligado, o trecho renderizado é o de antes, byte a byte ─────────────────────────
const ST = lf('app/api/compose/status/[renderId]/route.ts')
const NOVO = `<a href="\${filmeBotao.href}" style="display:inline-block;background:\${film15Offer ? 'transparent' : '#2997ff'};color:\${film15Offer ? '#b9dcff' : '#fff'};border:\${film15Offer ? '1px solid #475569' : 'none'};text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                  \${filmeBotao.label}
                </a>\${filmeBotao.secondaryHtml}
                \${film15Offer?.html ?? ''}`
const ANTES = `<a href="\${safeVideoUrl}" style="display:inline-block;background:\${film15Offer ? 'transparent' : '#2997ff'};color:\${film15Offer ? '#b9dcff' : '#fff'};border:\${film15Offer ? '1px solid #475569' : 'none'};text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                  ⬇ Download Your Short
                </a>
                \${film15Offer?.html ?? ''}`
ok(ST.split(NOVO).length === 2, 'o e-mail usa o botão do módulo (href, texto e linha secundária)')
const off = M.emailFilmeBotao({ appUrl: APP, videoId: ID, rawUrl: '${safeVideoUrl}', live: false })
const renderizadoDesligado = NOVO.replace('${filmeBotao.href}', off.href).replace('${filmeBotao.label}', off.label).replace('${filmeBotao.secondaryHtml}', off.secondaryHtml)
ok(renderizadoDesligado === ANTES, 'desligado, o trecho do e-mail é EXATAMENTE o de antes')
ok(ST.includes("videoId: shareVideoId, rawUrl: safeVideoUrl"), 'o botão usa o id do filme salvo (o mesmo do link de compartilhar)')
ok(ST.includes('film_page_link: filmeBotao.paginaDoFilme,'), 'video_ready_email_sent carrega film_page_link')

// ── a rota do clique ──────────────────────────────────────────────────────────────────────────────────────────
const R = lf('app/api/email/filme-pronto/route.ts')
const rotaCerta = (t) => t.includes('videoIdValido(raw)')
  && t.includes('normalizeInternalRedirect(emailFilmeDestino(videoId))')
  && t.includes('name: EMAIL_FILME_CLICKED_EVENT')
  && t.includes('`${origem}/login?redirect=${encodeURIComponent(destino)}`')
  && t.includes('NextResponse.redirect(url, 302)')
ok(rotaCerta(R), 'a rota valida o id, conta o clique e, deslogado, vai ao login com o destino INTEIRO')
ok(!rotaCerta(R.replace('${encodeURIComponent(destino)}', '${destino}')), 'mutante: destino sem codificar no login fica vermelho')
ok(lf('app/api/events/route.ts').includes("  'video_ready_email_clicked',\n"), 'o clique é evento só do servidor (o navegador não forja)')

// ── a página: ?v= abre o filme tocando e mede o "viu" ─────────────────────────────────────────────────────────
const H = lf('app/(dashboard)/history/HistoryClient.tsx')
const paginaCerta = (t) => t.includes("const id = params.get('v')")
  && t.includes("const opened = Boolean(film && film.status === 'completed' && film.video_url)")
  && /if \(opened\) \{\n\s+setLightbox\(id\)/.test(t)
  && t.includes('void trackEvent(EMAIL_FILME_LANDED_EVENT, { video_id: id, found: Boolean(film), opened,')
ok(paginaCerta(H), '/history?v=<id> abre o filme no player (autoPlay) e conta video_ready_email_landed')
ok(!paginaCerta(H.replace(/if \(opened\) \{\n(\s+)setLightbox\(id\)/, 'if (opened) {\n$1void 0')), 'mutante: não abrir o filme fica vermelho')
ok(lf('components/FilmPreviewDialog.tsx').includes('controls autoPlay playsInline'), 'o player da página toca sozinho')

// ── mutantes do módulo ────────────────────────────────────────────────────────────────────────────────────────
const m1 = confereModulo(carrega(FONTE.replace("label: '▶ Watch your film'", "label: '⬇ Download Your Short'").replace('href: emailFilmeHref(input.appUrl, input.videoId)', 'href: input.rawUrl')))
ok(!m1.hrefPassaPeloClique, 'mutante: botão de volta ao MP4 cru com o interruptor ligado fica vermelho')
const m2 = confereModulo(carrega(FONTE.replace('download the file</a>', '</a>')))
ok(!m2.mp4Secundario, 'mutante: tirar a linha do MP4 fica vermelho')
const m3 = confereModulo(carrega(FONTE.replace('return `/history?${', 'return `//evil.example/history?${')))
ok(!m3.destinoInterno || !m3.destinoPagina, 'mutante: destino para fora do site fica vermelho')
const m4 = confereModulo(carrega(FONTE.replace("if (!live || !videoIdValido(input.videoId)) {", 'if (!live) {')))
ok(!m4.semIdIgualAntes, 'mutante: aceitar id inválido fica vermelho')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
