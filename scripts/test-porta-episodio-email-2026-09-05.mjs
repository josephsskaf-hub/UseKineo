// KINEO-PORTA-EPISODIO-EMAIL-2026-09-05 — o botao de episodio 2 dos e-mails
// passa a ter porta de servidor: conta o clique e manda quem ja tem conta para
// ENTRAR (nao para se cadastrar). Roda a funcao REAL (transpileModule) e LE a
// rota real, para nenhuma verificacao aqui poder passar com o produto quebrado.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
// CRLF no checkout do Windows ja pintou guardiao de vermelho com o codigo
// byte a byte correto (05/09). Toda leitura normaliza.
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')
function loadTs(p, mocks = {}) {
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: import inesperado ${id}`) }, m, m.exports)
  return m.exports
}

const series = loadTs('lib/seriesContinuation.ts')
const authRedirect = loadTs('lib/authRedirect.ts')
const APP = 'https://www.usekineo.com'
const SEED = 'Pompeii'
const rota = read('app/api/episode-link/route.ts')

// ── 1. A URL de e-mail passa a apontar para a porta ────────────────────────
const u = series.buildSeriesContinuationEmailUrl(APP, SEED, 'video_ready_email', {
  utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'video_ready_trial_episode2',
})
const U = new URL(u)
ok(U.pathname === '/api/episode-link', '1.1 com tema, o botao vai para a porta de servidor')
ok(U.pathname !== '/generate', '1.2 o apelido legado /generate saiu do caminho do e-mail')
ok(U.searchParams.get('series') === '1', '1.3 series=1 viaja')
ok(U.searchParams.get('continuation_source') === 'video_ready_email', '1.4 a fonte viaja')
ok((U.searchParams.get('prompt') || '').includes(SEED), '1.5 o tema da pessoa viaja')
ok(U.searchParams.get('autoanalyze') === '1', '1.6 autoanalyze viaja')
ok(U.searchParams.get('utm_campaign') === 'video_ready_trial_episode2', '1.7 a atribuicao de campanha nao some')
ok(series.SERIES_EMAIL_DOOR_PATH === '/api/episode-link', '1.8 a constante e a mesma que a rota implementa')

// ── 2. O contrato do #24 preservado: SEM tema, a URL e a de antes ──────────
for (const vazio of [null, undefined, '', '   ', 'Untitled Short']) {
  const v = new URL(series.buildSeriesContinuationEmailUrl(APP, vazio, 'video_ready_email', { utm_medium: 'email' }))
  ok(v.pathname === '/generate', `2.x sem tema utilizavel (${JSON.stringify(vazio)}) a URL nao muda`)
  ok(!v.searchParams.get('prompt'), `2.x sem tema (${JSON.stringify(vazio)}) nenhum assunto e inventado`)
}

// ── 3. As telas de DENTRO do app nao passam pela porta ─────────────────────
const href = series.buildSeriesContinuationHref(SEED, 'done_screen')
ok(href.startsWith('/studio/create?'), '3.1 o link de tela continua indo direto ao /studio/create')
ok(!href.includes('episode-link'), '3.2 a porta e exclusiva do e-mail (tela ja tem sessao viva)')

// ── 4. A rota existe e cumpre o que a URL promete ──────────────────────────
ok(/export async function GET/.test(rota), '4.1 a porta responde GET (clique de e-mail e GET)')
ok(/export const dynamic = 'force-dynamic'/.test(rota), '4.2 force-dynamic')
ok(/export const fetchCache = 'force-no-store'/.test(rota), '4.3 fetchCache no-store (regra #17: rota so-GET nasce cacheada)')
ok(/episode_link_clicked/.test(rota), '4.4 grava o degrau que faltava entre enviado e aterrissou')
ok(/writeServerEvent/.test(rota), '4.5 usa o gravador de evento de servidor da casa')
ok(/\/login\?redirect=/.test(rota), '4.6 sem sessao vai para ENTRAR')
const NL = String.fromCharCode(10)
const rotaCodigo = rota.split(NL).filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) }).join(NL)
ok(!rotaCodigo.includes('/signup'), '4.7 a porta nunca manda quem ja tem conta para CRIAR CONTA (medido no codigo, nao no comentario que explica o defeito)')
ok(/encodeURIComponent\(destino\)/.test(rota), '4.8 o destino inteiro e preservado no redirect')
ok(/normalizeInternalRedirect/.test(rota), '4.9 o destino passa pelo mesmo guarda do login')
ok(/'\/studio\/create'/.test(rota), '4.10 o destino e a casa de maquinas, sem o 307 do apelido')
ok(/signed_in/.test(rota) && /bot:/.test(rota), '4.11 o carimbo separa sessao viva e robo de varredura')
ok(/catch/.test(rota) && (rota.match(/catch/g) || []).length >= 3, '4.12 falha aberta: erro nunca impede o redirecionamento')

// ── 5. O guarda de destino recusa o que tem de recusar ─────────────────────
ok(authRedirect.normalizeInternalRedirect('/studio/create?prompt=x&series=1') === '/studio/create?prompt=x&series=1', '5.1 destino interno com query sobrevive inteiro')
const BARRA = String.fromCharCode(92)
for (const mau of ['//evil.example', 'https://evil.example', `/${BARRA}evil.example`, null, '']) {
  ok(authRedirect.normalizeInternalRedirect(mau) === null, `5.x destino externo recusado (${JSON.stringify(mau)})`)
}

// ── 6. Os DOIS chamadores de e-mail herdam a porta (nao so o rodape) ───────
const rodape = read('lib/lifecycle/videoReadyFooter.ts')
ok(/buildSeriesContinuationEmailUrl/.test(rodape), '6.1 o rodape do video pronto usa o construtor de e-mail')
const cron = read('app/api/cron/send-video-ready/route.ts')
ok(/videoReadyFooterFromRows/.test(cron), '6.2 o cron de video pronto monta o rodape (logo, herda a porta)')

console.log(`\n${n - fail}/${n} verificacoes passaram`)
process.exit(fail ? 1 : 0)
