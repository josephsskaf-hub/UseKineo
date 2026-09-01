// ═══ #24 — O E-MAIL DO MOMENTO CARREGA O TEMA (e diz que esta desarmado) ═══
//
// Prova sem servidor, sem rede, sem banco: (A) o helper novo monta a URL
// absoluta de continuacao e volta ao link antigo quando nao ha tema; (B) a
// rota do e-mail usa esse helper, mantem os utm, e o rotulo do botao so
// promete "episodio 2" quando o tema realmente viaja; (C) o diagnostico de
// desarmado esta na resposta DRY_RUN, e nada armou o disparo por engano.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
const falhas = []
function v(nome, cond) { if (cond) ok++; else falhas.push(nome) }

// ── Reimplementacao literal do helper (o .ts nao roda em node cru) ────────
const MAX = 180
const norm = (x) => (x ?? '').replace(/\s+/g, ' ').replace(/["“”]+/g, '').trim().slice(0, MAX)
const promptDe = (x) => {
  const seed = norm(x)
  return seed
    ? `Create the next episode in the same Short series about "${seed}". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.`
    : ''
}
function emailUrl(appUrl, value, source, utm = {}) {
  const base = appUrl.replace(/\/+$/, '')
  const params = new URLSearchParams()
  const p = promptDe(value)
  if (p) {
    params.set('prompt', p)
    params.set('autoanalyze', '1')
    params.set('series', '1')
    params.set('continuation_source', source)
  }
  for (const [k, val] of Object.entries(utm)) if (val) params.set(k, val)
  const qs = params.toString()
  return qs ? `${base}/generate?${qs}` : `${base}/generate`
}

// ── BLOCO A — o contrato do link ──────────────────────────────────────────
const UTM = { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum' }
const APP = 'https://www.usekineo.com'
const comTema = emailUrl(APP, 'The lake that turns animals to stone', 'momentum_email', UTM)
const u = new URL(comTema)

v('A1 absoluta e no dominio certo', u.origin === 'https://www.usekineo.com')
v('A2 aponta para /generate', u.pathname === '/generate')
v('A3 leva o prompt de continuacao', (u.searchParams.get('prompt') ?? '').startsWith('Create the next episode'))
v('A4 cita o tema da pessoa', (u.searchParams.get('prompt') ?? '').includes('lake that turns animals to stone'))
v('A5 autoanalyze=1', u.searchParams.get('autoanalyze') === '1')
v('A6 series=1 (e o que faz o series_continuation_landed disparar)', u.searchParams.get('series') === '1')
v('A7 fonte nomeada e nova', u.searchParams.get('continuation_source') === 'momentum_email')
v('A8 utm_source preservado', u.searchParams.get('utm_source') === 'lifecycle')
v('A9 utm_medium preservado', u.searchParams.get('utm_medium') === 'email')
v('A10 utm_campaign preservado', u.searchParams.get('utm_campaign') === 'momentum')
v('A11 prompt vem ANTES dos utm (ordem estavel)', comTema.indexOf('prompt=') < comTema.indexOf('utm_source='))

const semTema = emailUrl(APP, null, 'momentum_email', UTM)
v('A12 sem tema = link antigo, byte a byte',
  semTema === 'https://www.usekineo.com/generate?utm_source=lifecycle&utm_medium=email&utm_campaign=momentum')
v('A13 sem tema nao inventa assunto', !semTema.includes('prompt='))
v('A14 tema so com espaco tratado como sem tema', emailUrl(APP, '   ', 'momentum_email', UTM) === semTema)
v('A15 barra sobrando no APP_URL nao vira //generate', !emailUrl('https://www.usekineo.com/', 'x y z longo', 'momentum_email').includes('com//generate'))
v('A16 aspas do topic nao vazam para o prompt', !(new URL(emailUrl(APP, 'The "golden" mountain', 'momentum_email')).searchParams.get('prompt') ?? '').includes('"golden"'))
const gigante = new URL(emailUrl(APP, 'a'.repeat(400), 'momentum_email')).searchParams.get('prompt') ?? ''
v('A17 tema gigante cortado no teto do seed', gigante.includes('a'.repeat(180)) && !gigante.includes('a'.repeat(181)))
v('A18 tudo escapado (nenhum espaco cru na query)', !comTema.split('?')[1].includes(' '))

// ── BLOCO B — a rota usa mesmo o helper ───────────────────────────────────
const rota = readFileSync(join(raiz, 'app/api/cron/send-momentum-nudge/route.ts'), 'utf8')

v('B1 importa o helper', rota.includes("import { buildSeriesContinuationEmailUrl } from '@/lib/seriesContinuation'"))
v('B2 a url do e-mail sai do helper', /const url = buildSeriesContinuationEmailUrl\(APP_URL, topic, 'momentum_email'/.test(rota))
v('B3 o /generate pelado sumiu do corpo do e-mail', !rota.includes('${APP_URL}/generate?utm_source=lifecycle'))
v('B4 os tres utm continuam na chamada', rota.includes("utm_source: 'lifecycle'") && rota.includes("utm_medium: 'email'") && rota.includes("utm_campaign: 'momentum'"))
v('B5 rotulo do botao e condicional ao tema', /const cta = topic \? 'Open episode 2/.test(rota))
v('B6 o HTML usa a variavel do rotulo', rota.includes('>${cta}</a>'))
v('B7 versao texto tambem muda de frase com o tema', rota.includes("${topic ? 'Episode 2 is already written for you"))
v('B8 nada promete episodio 2 sem tema', rota.includes(": 'Make the next one →'"))

v('B9 guarda de credito intacta', rota.includes('creditCostFor(') && rota.includes('< minCredits) continue'))
v('B10 pula pagante', rota.includes('if (p.stripe_subscription_id) continue'))
v('B11 pula opt-out e conta interna', rota.includes('p.email_opted_out || isInternalOrJunk(email)'))
v('B12 carimbo 1x por pessoa', rota.includes("const STAMP = 'momentum_nudge_sent'") && rota.includes('if (already.has(id)) continue'))
v('B13 faixa 1-3 videos intacta', rota.includes('a.count >= 1 && a.count <= 3'))
v('B14 janela de ociosidade intacta', rota.includes('const MIN_IDLE_H = 20') && rota.includes('const MAX_IDLE_H = 96'))
v('B15 teto por rodada intacto', rota.includes('const MAX_PER_RUN = 40'))
v('B16 autorizacao fail-closed intacta', rota.includes('if (!cronSecret) return false'))
v('B17 assunto do e-mail inalterado', (rota.match(/The fourth video is the one that changes things/g) ?? []).length >= 2)
const corpo = rota.split('function buildEmail')[1].split('export async function GET')[0]
v('B18 nenhuma palavra de preco/plano/cupom entrou no corpo', !/discount|coupon|\$\d|upgrade now/i.test(corpo))

// ── BLOCO C — o desarmado fica visivel, e continua desarmado ──────────────
v('C1 a resposta DRY_RUN declara armed: false', rota.includes('armed: false'))
v('C2 explica a causa', rota.includes('sem ?confirm=SEND') && rota.includes('momentum_nudge_sent = 0'))
v('C3 entrega a instrucao exata de armar', rota.includes('to_arm:') && rota.includes('/api/cron/send-momentum-nudge?confirm=SEND'))
v('C4 mostra quantos elegiveis tem tema', rota.includes('com_tema: targets.filter((t) => t.topic).length'))
v('C5 mostra um link de exemplo para conferencia', rota.includes('exemplo_link: buildSeriesContinuationEmailUrl'))
v('C6 o portao de envio NAO foi afrouxado', rota.includes("const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'"))
v('C7 nada envia sem confirm', rota.includes('if (!confirm) {'))

const vercel = readFileSync(join(raiz, 'vercel.json'), 'utf8')
v('C8 vercel.json NAO foi armado por esta rodada (decisao do fundador)',
  vercel.includes('"/api/cron/send-momentum-nudge"') && !vercel.includes('send-momentum-nudge?confirm=SEND'))
v('C9 o cron continua agendado', vercel.includes('"schedule": "30 13 * * *"'))

// ── BLOCO D — helper puro, fora da pista do Codex ─────────────────────────
const lib = readFileSync(join(raiz, 'lib/seriesContinuation.ts'), 'utf8')
v('D1 helper continua puro (zero import)', !/^import /m.test(lib))
v('D2 fonte nova declarada no tipo', lib.includes("| 'momentum_email'"))
v('D3 helper antigo intacto', lib.includes('export function buildSeriesContinuationHref('))
v('D4 nenhum preco/credito/plano no helper', !/price|credit|stripe|tier|plan/i.test(lib))

console.log(`\n${ok} de ${ok + falhas.length} verificacoes ok`)
if (falhas.length) { console.log('\nFALHOU:'); falhas.forEach((f) => console.log(' x ' + f)); process.exit(1) }
console.log('OK #24: o e-mail que existe para levar do video 1 ao 4 leva o tema junto — e diz, na propria resposta, que nunca foi postado.')
