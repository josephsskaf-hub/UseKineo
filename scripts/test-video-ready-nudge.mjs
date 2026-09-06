// sprint-assinaturas #26 — o `send-video-ready` (3º e-mail de "vídeo pronto",
// 98 envios/14d) dizia "if you closed the tab, no harm done" para 80 pessoas
// que JÁ TINHAM VISTO o filme no app, ignorava clique em download (link
// manual), mandava 30 min depois de outro "vídeo pronto" e não pedia nada.
// Roda a função REAL do e-mail (extraída da rota) com o rodapé REAL do #24 e
// lê a rota para provar as regras (download = clique, gap de 6h, carimbo).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
// sprint-assinaturas #1 (05/09) — normaliza CRLF: a assercao do assunto casa
// contra `\n` e no checkout Windows o arquivo vem com `\r\n`, entao ela vivia
// vermelha aqui e verde na CI. Guardiao vermelho por sistema de arquivos e
// guardiao que ninguem le. Ver o mesmo conserto em test-video-ready-footer.mjs.
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')
function loadTs(p, mocks = {}) {
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}
const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const filmPlans = loadTs('lib/lifecycle/trialFilmPlans.ts', { '@/lib/checkoutPricing': checkout })
const series = loadTs('lib/seriesContinuation.ts')
const marketing = loadTs('lib/marketingPrice.ts', { '@/lib/checkoutPricing': checkout, '@/lib/credits/engineCost': engine })
const footerMod = loadTs('lib/lifecycle/videoReadyFooter.ts', {
  '@/lib/checkoutPricing': checkout, '@/lib/lifecycle/trialFilmPlans': filmPlans, '@/lib/seriesContinuation': series, '@/lib/marketingPrice': marketing,
})

// ── A) helper novo da lib, rodado com os 3 perfis reais ─────────────────────
const { videoReadyFooterFromRows, isSubscriberProfile } = footerMod
const APP = 'https://www.usekineo.com'
ok(isSubscriberProfile({ has_paid: true, plan: 'pro', video_credits: 130 }) === true, 'lib: has_paid → assinante')
ok(isSubscriberProfile({ has_paid: false, plan: 'creator_trial', video_credits: 25 }) === false, 'lib: trial ativo NÃO é assinante')
ok(isSubscriberProfile(null) === false, 'lib: perfil nulo não é assinante (não lança)')
const fSub = videoReadyFooterFromRows({ has_paid: true, plan: 'pro', video_credits: 130 }, { title: 'The lake that turns animals to stone', topic: null, credits_used: 25, duration: 62 }, APP)
ok(fSub.kind === 'subscriber_next' && !/\$\d|\/month|pricing/.test(fSub.html), 'lib: assinante → episódio 2, sem preço')
const fTrial = videoReadyFooterFromRows({ has_paid: false, plan: 'free', video_credits: 20 }, { title: 'Run with a lion', topic: null, credits_used: 5, duration: 62 }, APP)
ok(fTrial.kind === 'trial_episode2' && fTrial.html.indexOf('Episode 2:') < fTrial.html.indexOf('Plans from'), 'lib: trial com 20cr → episódio 2 antes do plano')
const fZero = videoReadyFooterFromRows({ has_paid: false, plan: 'free', video_credits: 0 }, { title: 'Run with a lion', topic: null, credits_used: 25, duration: 62 }, APP)
ok(fZero.kind === 'plan_films' && fZero.html.includes('This 62-second film cost'), 'lib: 0cr → plano medido em filmes como este')
ok(videoReadyFooterFromRows(null, null, APP).kind === 'plan_generic', 'lib: perfil e vídeo nulos → copy genérica, nunca lança')

// ── B) a função REAL do e-mail, extraída da rota ─────────────────────────────
const ROUTE = 'app/api/cron/send-video-ready/route.ts'
const route = read(ROUTE)
const s = route.indexOf('interface ReadyVideo {')
const e = route.indexOf('export async function GET(')
ok(s > 0 && e > s, 'rota: trecho puro (ReadyVideo … buildEmail) existe')
const pure = `const APP_URL = '${APP}'\nimport { emailFooterHtml, emailFooterText } from '@/lib/emailSuppression'\nimport type { VideoReadyFooter } from '@/lib/lifecycle/videoReadyFooter'\n` + route.slice(s, e) + `\nexport { buildEmail }\n`
const out = ts.transpileModule(pure, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'pure.ts' }).outputText
const m = { exports: {} }
new Function('require', 'module', 'exports', out)((id) => {
  if (id === '@/lib/emailSuppression') return { emailFooterHtml: () => '<!--foot-->', emailFooterText: () => '\n[foot]' }
  throw new Error('unexpected import ' + id)
}, m, m.exports)
const { buildEmail } = m.exports
const vid = { id: 'v1', title: 'The lake that turns animals to stone', thumb: null, creditsUsed: 25, duration: 62 }

// quem JÁ VIU o filme (80 dos 98)
const seen = buildEmail('u1', vid, { sawIt: true, footer: fZero })
ok(!/closed the tab/.test(seen.text) && !/closed the tab/.test(seen.html), 'viu o filme: NUNCA "if you closed the tab"')
ok(/is saved in your library/.test(seen.html) && /Download the MP4/.test(seen.html), 'viu o filme: "saved in your library" + botão "Download the MP4"')
ok(seen.subject.startsWith('Your film "') && seen.subject.endsWith('is saved — MP4 inside'), 'viu o filme: assunto novo (não repete "Your video is ready")')
ok(seen.html.includes('utm_campaign=video_ready_seen'), 'viu o filme: UTM própria (video_ready_seen) para medir separado')
ok(seen.html.includes(fZero.html) && seen.html.includes('background:#161618'), 'viu o filme: rodapé do #24 dentro do cartão escuro')
ok(/usekineo\.com\/studio/.test(seen.html) && /Ready for the next one/.test(seen.text), 'viu o filme: fecha com "Ready for the next one? /studio"')

// quem NÃO viu (18 dos 98): copy de hoje + rodapé
const unseen = buildEmail('u1', vid, { sawIt: false, footer: fTrial })
ok(unseen.subject === 'Your video is ready 🎬', 'não viu: assunto de hoje')
ok(/done rendering and waiting for you/.test(unseen.html) && /closed the tab, no harm done/.test(unseen.text), 'não viu: copy de hoje ("closed the tab" só aqui)')
ok(unseen.html.includes('Watch &amp; download'), 'não viu: botão de hoje')
ok(unseen.html.includes(fTrial.html), 'não viu: também leva o rodapé por situação')
ok(unseen.html.includes('utm_campaign=video_ready&') || unseen.html.includes('utm_campaign=video_ready"'), 'não viu: UTM de hoje preservada (série histórica)')

// assinante: nunca vê preço
const subMail = buildEmail('u1', vid, { sawIt: true, footer: fSub })
ok(!/\$\d|\/month|Starter is|\/pricing/.test(subMail.html), 'assinante: nenhum preço/pricing no e-mail inteiro')
ok(subMail.html.includes('Episode 2:'), 'assinante: pede o episódio 2')

// XSS + título longo + sem título
const xss = buildEmail('u1', { ...vid, title: '<img src=x onerror=alert(1)> "quotes"' }, { sawIt: true, footer: fZero })
ok(!xss.html.includes('<img src=x') && xss.html.includes('&lt;img src=x'), 'título é escapado no HTML')
const long = buildEmail('u1', { ...vid, title: 'A'.repeat(80) }, { sawIt: true, footer: fZero })
ok(long.subject.length < 90 && long.subject.includes('…'), 'assunto corta título longo com reticências')
const noTitle = buildEmail('u1', { ...vid, title: null }, { sawIt: true, footer: fZero })
ok(noTitle.subject === 'Your film is saved — MP4 inside' && /Your video is saved in your library/.test(noTitle.html), 'sem título: frases genéricas, nunca "\"\""')
ok(seen.text.endsWith('[foot]') && seen.html.endsWith('<!--foot-->'), 'rodapé de descadastro nas duas versões')

// ── C) leituras da rota: as regras existem no caller ─────────────────────────
ok(/const DOWNLOAD_EVENTS = \['video_downloaded', 'video_download_clicked', 'video_download_manual_link_clicked'\]/.test(route), 'rota: clique em download (incl. link manual) conta como baixado')
ok(/\.in\('name', \[\.\.\.DOWNLOAD_EVENTS, SEEN_EVENT, \.\.\.READY_EMAIL_EVENTS\]\)/.test(route), 'rota: uma consulta só para download/visto/outro e-mail')
ok(/READY_EMAIL_GAP_MS = 6 \* 60 \* 60 \* 1000/.test(route) && /now - lastReady < READY_EMAIL_GAP_MS\) \{\s*deferredRecentReady\+\+\s*continue/.test(route), 'rota: outro "vídeo pronto" há <6h → espera (não carimba)')
ok(/READY_EMAIL_EVENTS = \['video_ready_email_sent', 'stranded_ready_sent', 'stranded_fast_ready_sent'\]/.test(route), 'rota: enxerga o e-mail da rota de status (#24) e os do resgate (#25)')
ok(/if \(dlErr\) \{[\s\S]*?status: 500/.test(route), 'rota: erro na consulta de sinais = não manda (fail-closed)')
ok(/\.select\('id, email, video_ready_sent_at, has_paid, plan, video_credits'\)/.test(route), 'rota: lê has_paid/plan/video_credits do perfil (entradas do rodapé)')
ok(/created_at, credits_used, duration'\)/.test(route), 'rota: lê credits_used/duration da linha de videos')
ok(/videoReadyFooterFromRows\(prof, \{ title: video\.title/.test(route), 'rota: rodapé pela função da lib (mesma do #24/#25)')
ok(/name: NUDGE_EVENT/.test(route) && /saw_ready_screen: ctx\.sawIt/.test(route) && /footer: footer\.kind/.test(route) && /second_touch: typeof lastReady === 'number'/.test(route), 'rota: carimbo video_ready_nudge_sent com saw/footer/subscriber/second_touch')
ok(/\.update\(\{ video_ready_sent_at: new Date\(\)\.toISOString\(\) \}\)/.test(route), 'rota: 1× por pessoa PARA SEMPRE mantido (coluna do perfil)')
ok(!/subject: 'Your video is ready 🎬',\n\s*text,/.test(route) && /subject,\n\s*text,\n\s*html,/.test(route), 'rota: assunto vem do buildEmail (varia por situação)')
ok((route.match(/deferred_recent_ready_email: deferredRecentReady/g) || []).length === 1, 'rota: resposta do cron expõe os adiados')
ok(!/sf_aff|coupon|COMEBACK|first month/i.test(route), 'rota: sem cupom, sem "first month", sem crédito novo')

console.log(`\n${n - fail}/${n} ok${fail ? ` — ${fail} FAIL` : ''}`)
process.exit(fail ? 1 : 0)
