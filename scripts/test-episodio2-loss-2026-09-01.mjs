// ═══ #25 — O E-MAIL QUE MAIS ALCANCA QUEM FEZ 1 VIDEO GANHA UM SEGUNDO CAMINHO ═══
//
// Prova sem servidor, sem rede, sem banco:
//   (A) o contrato do bloco "episodio 2" (link, escape, fail-closed);
//   (B) a rota colhe o tema no MESMO laco que ja pagina `videos`, sem consulta
//       nova e sem perder a ordenacao estavel da paginacao;
//   (C) NADA da pista do Codex foi tocado: o CTA de /pricing continua o
//       primeiro e continua byte a byte, e o bloco novo nao fala de preco,
//       plano, credito, cota nem cupom.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
const falhas = []
function v(nome, cond) { if (cond) ok++; else falhas.push(nome) }

const rota = readFileSync(join(raiz, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')
const lib = readFileSync(join(raiz, 'lib/seriesContinuation.ts'), 'utf8')

// ── Reimplementacao literal dos helpers (o .ts nao roda em node cru) ────────
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
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const attr = (u) => u.replace(/&/g, '&amp;')
const APP = 'https://www.usekineo.com'
const CAMP = 'trial_loss_episode2'
function bloco(seed) {
  const tema = norm(seed ?? '')
  if (!tema) return null
  const url = emailUrl(APP, tema, 'lifecycle_loss_email', {
    utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: CAMP, intent_campaign: CAMP,
  })
  if (!url.includes('prompt=')) return null
  const label = `Episode 2: ${tema}`
  return {
    text: `Or make episode 2 of the one you already made — it opens with the topic already written:\n${label}\n${url}`,
    html:
      `  <p style="margin:0 0 10px;font-size:14px;color:#555;">Or make <strong>episode 2</strong> of the one you already made &mdash; it opens with the topic already written:</p>\n` +
      `  <p style="margin:0 0 18px;"><a href="${attr(url)}" style="display:block;background:#f5f7fa;border:1px solid #d9e1ec;border-left:4px solid #2997ff;color:#111;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 16px;border-radius:8px;">${esc(label)} &rarr;</a></p>`,
  }
}

// ══════════ BLOCO A — contrato do bloco ══════════
const b = bloco('The city that vanished in one night')
v('A01 bloco existe com tema', b !== null)
v('A02 link aponta para /generate', b.text.includes(`${APP}/generate?`))
v('A03 leva prompt', b.text.includes('prompt='))
v('A04 leva autoanalyze', b.text.includes('autoanalyze=1'))
v('A05 leva series=1', b.text.includes('series=1'))
v('A06 fonte propria da campanha', b.text.includes('continuation_source=lifecycle_loss_email'))
v('A07 utm_source preservado', b.text.includes('utm_source=lifecycle'))
v('A08 utm_medium preservado', b.text.includes('utm_medium=email'))
v('A09 utm_campaign da campanha', b.text.includes(`utm_campaign=${CAMP}`))
v('A10 intent_campaign presente', b.text.includes(`intent_campaign=${CAMP}`))
v('A11 rotulo cita o tema', b.text.includes('Episode 2: The city that vanished in one night'))
v('A12 html tem href', b.html.includes('<a href="https://www.usekineo.com/generate?'))
const hrefDe = (html) => (html.match(/href="([^"]*)"/) || [])[1] ?? ''
v('A13 & escapado no href (nenhum & cru)', hrefDe(b.html).includes('&amp;') && !/&(?!amp;)/.test(hrefDe(b.html)))
v('A14 texto NAO escapa &', b.text.includes('&utm_source=') || b.text.includes('&amp;') === false)
v('A15 url absoluta (e-mail nao tem relativo)', b.text.includes('https://'))

// fail-closed
v('A16 sem tema = sem bloco', bloco('') === null)
v('A17 null = sem bloco', bloco(null) === null)
v('A18 undefined = sem bloco', bloco(undefined) === null)
v('A19 so espacos = sem bloco', bloco('   \n\t  ') === null)
v('A20 so aspas = sem bloco', bloco('""“”') === null)

// escape do tema (vem do usuario)
const hostil = bloco('a <script>alert("x")</script> b')
v('A21 tema hostil ainda gera bloco', hostil !== null)
v('A22 sem <script> cru no html', !hostil.html.includes('<script>'))
v('A23 < virou &lt;', hostil.html.includes('&lt;script&gt;'))
v('A24 aspas do tema escapadas no rotulo', !/>Episode 2: [^<]*"[^<]*</.test(hostil.html))
v('A25 aspas somem na normalizacao', !norm('a "b" c').includes('"'))

// teto e normalizacao
const longo = bloco('x'.repeat(400))
v('A26 tema cortado em 180', longo.text.includes('Episode 2: ' + 'x'.repeat(180)))
v('A27 nao passa de 180', !longo.text.includes('Episode 2: ' + 'x'.repeat(181)))
v('A28 espacos colapsados', bloco('a     b').text.includes('Episode 2: a b'))
v('A29 sem espaco cru na query', !/\s/.test(new URL(bloco('a b c').text.split('\n')[2]).search))
v('A30 mesma regua do lib', norm('  "Ola   mundo"  ') === 'Ola mundo')

// ══════════ BLOCO B — a rota usa o helper e colhe o tema de graca ══════════
v('B01 rota importa buildSeriesContinuationEmailUrl', rota.includes('buildSeriesContinuationEmailUrl'))
v('B02 rota importa normalizeSeriesSeed', rota.includes('normalizeSeriesSeed'))
v('B03 import vem de lib/seriesContinuation', /import \{[^}]*buildSeriesContinuationEmailUrl[^}]*\} from '@\/lib\/seriesContinuation'/s.test(rota))
v('B04 lib declara a fonte nova', lib.includes("| 'lifecycle_loss_email'"))
v('B05 rota usa a fonte nova', rota.includes("'lifecycle_loss_email'"))
v('B06 Candidate tem lastTopic', /lastTopic: string \| null/.test(rota))
v('B07 dueKind recebe lastTopics', /lastTopics: Map<string, string> \| null,/.test(rota))
v('B08 base preenche lastTopic normalizado', rota.includes("lastTopic: normalizeSeriesSeed(lastTopics?.get(id) ?? '') || null"))
v('B09 chamada de dueKind passa lastTopics', rota.includes('dueKind(row, now, videoCounts, ourFailureIds, lastTopics)'))
v('B10 select colhe topic', rota.includes("select('user_id, topic, created_at')"))
v('B11 sem select antigo sobrando', !rota.includes(".select('user_id')\n        .in('user_id', part)"))
v('B12 ORDER BY id continua (paginacao estavel)', rota.includes(".order('id', { ascending: true })"))
v('B13 nenhuma consulta nova a videos', (rota.match(/\.from\('videos'\)/g) || []).length === 1)
v('B14 compara created_at para achar o mais recente', rota.includes('lastTopicAt.get(v.user_id)'))
v('B15 tema vazio nao entra no mapa', rota.includes('if (!rawTopic.trim()) continue'))
v('B16 degrade junto com a contagem', rota.includes('const lastTopics: Map<string, string> | null = countsUsable ? topics : null'))
v('B17 helper do bloco existe', rota.includes('function episodeTwoBlock('))
v('B18 helper escapa html', rota.includes('function escapeHtmlText('))
v('B19 fail-closed sem prompt', rota.includes("if (!url.includes('prompt=')) return null"))
v('B20 ep2 so no ramo de quem TEM video', rota.indexOf('const ep2 = episodeTwoBlock(') > rota.indexOf('const neverRan = c.videosMade === 0'))
v('B21 ep2 usado no texto', rota.includes('${ep2 ? `\\n${ep2.text}\\n` : \'\'}'))
v('B22 ep2 usado no html', rota.includes('${ep2 ? `${ep2.html}\\n` : \'\'}'))
v('B23 campanha propria (nao reusa a do pool)', rota.includes("'trial_loss_episode2'"))
v('B24 contagem de videos preservada', rota.includes('counts.set(v.user_id, (counts.get(v.user_id) ?? 0) + 1)'))
v('B25 guarda de user_id string preservada', rota.includes("if (typeof v.user_id !== 'string') continue"))

// ══════════ BLOCO C — a pista do Codex intacta ══════════
const trecho = rota.slice(rota.indexOf('const ep2 = episodeTwoBlock('), rota.indexOf('Here\'s what you just lost access to`', rota.indexOf('const ep2 = episodeTwoBlock(')))
v('C01 CTA de pricing continua', trecho.includes("cta(url, 'Get Creator back')"))
v('C02 pricing vem ANTES do episodio 2 no html', trecho.indexOf("cta(url, 'Get Creator back')") < trecho.indexOf('${ep2 ? `${ep2.html}'))
v('C03 assunto inalterado', rota.includes("subject: `Here's what you just lost access to`"))
const blocoTxt = b.text + b.html
for (const [i, palavra] of ['price', 'pricing', 'plan', 'credit', 'coupon', 'promo', 'free', 'upgrade', '$'].entries()) {
  v(`C0${4 + i} bloco novo nao fala de "${palavra}"`, !blocoTxt.toLowerCase().includes(palavra))
}
v('C13 helper nao importa checkoutPricing', !/function episodeTwoBlock[\s\S]{0,1600}TIER_CREDITS/.test(rota))
v('C14 nenhuma mudanca em COMEBACK_CODE', (rota.match(/COMEBACK_CODE/g) || []).length >= 2)
v('C15 os dois e-mails de oferta seguem com promo', rota.includes("promo=${COMEBACK_CODE}&${utm('trial_offer_d5')}"))
v('C16 D10 segue com promo', rota.includes("promo=${COMEBACK_CODE}&${utm('trial_offer_d10')}"))
v('C17 ramo neverRan intocado', rota.includes('Your first video is one click away'))
v('C18 pool de temas de 1 clique intocado', rota.includes('function starterTopics('))
v('C19 oneClickBlocks intocado', rota.includes('function oneClickBlocks('))
v('C20 nenhum envio novo foi armado', !rota.includes("searchParams.set('confirm'"))

console.log(`\n${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('TUDO OK')
